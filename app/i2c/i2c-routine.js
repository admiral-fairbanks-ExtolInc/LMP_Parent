const gatherData = require('./gather-data');
const Gpio = require('onoff').Gpio;
const async = require('async');

const digIn = [5, 6, 13];
const digOut = [16, 19, 20, 26];
const signalTypes = ['startSigIn', 'stopSigIn', 'fullStrokeSigIn', 'extendPressOut', 'coolingAirOut',
  'cycleCompleteOut', 'lmpFltedOut'];

function PinData(value, pin, type) {
  this.value = value;
  this.pin = pin;
  this.type = type;
}


const startSigIn = {
  value: 0,
  pin: digIn[0],
  type: 'digIn',
};
const stopSigIn = {
  value: 0,
  pin: digIn[1],
  type: 'digIn',
};
const fullStrokeSigIn = {
  value: 0,
  pin: digIn[2],
  type: 'digIn',
};
const extendPressOut = {
  value: 0,
  pin: digOut[0],
  type: 'digOut',
};
const coolingAirOut = {
  value: 0,
  pin: digOut[1],
  type: 'digOut',
};
const cycleCompleteOut = {
  value: 0,
  pin: digOut[2],
  type: 'digOut',
};
const lmpFltedOut = {
  value: 0,
  pin: digOut[3],
  type: 'digOut',
};

// IO Configuration
const extendPressPin = new Gpio(16, 'out');
const coolingAirPin = new Gpio(19, 'out');
const cycleCompletePin = new Gpio(20, 'out');
const lmpFltedPin = new Gpio(26, 'out');

// End IO Config

let dataloggingInfo = false;
let readingAndLoggingActive;
let childStatuses = [];
let logRequestSent;
let heatersMapped;
let systemInitialized;

// Sets up Timed interrupt for Reading/Writing I2C and Storing Data
function i2cHandling(done) {

  async.waterfall([
    (cb) => {
      // Broadcast out Status
      const status = [startSigIn.value, stopSigIn.value,
        fullStrokeSigIn.value, dataloggingInfo];
      gatherData.broadcastData(Buffer.from(status), cb);
    },
    (cb) => {
      // Then, read data from each child controller
      gatherData.readData(cb);
    },
    (data, cb) => {
      // Then, process the data obtained from the children
      // storing any datalogging info
      gatherData.processData(data, cb);
    },
    (statusValues, cb) => {

      // Set this flag false once complete so it can begin again on next interrupt
      readingAndLoggingActive = false;

      childStatuses = statusValues;
      // Checks if all modules are at setpoint. If so, Parent needs
      // to send out Extend Press signal
      extendPressOut.value = childStatuses.every(elem => elem.heaterAtSetpoint);
      // Checks if all modules are at release. If so, Parent needs
      // to send out Cooling Air signal
      coolingAirOut.value = childStatuses.every(elem => elem.heaterAtRelease);
      // Checks if all Modules are at Cycle Complete. If so,
      // Parent needs to send out Cycle Complete Signal
      cycleCompleteOut.value = childStatuses.every(elem => elem.heaterCycleComplete);
      if (cycleCompleteOut.value && !logRequestSent) {
        dataloggingInfo = true;
      } else if (!cycleCompleteOut.value && logRequestSent) {
        logRequestSent = false;
      }
      // Checks to see if any modules are faulted. If so, Parent
      // needs to send out LMP Faulted signal
      lmpFltedOut.value = childStatuses.some(elem => elem.heaterFaulted);

      async.series([
        (cb2) => {
          //console.log(`extendPressOut.value=${extendPressOut.value}`);
          extendPressPin.write(extendPressOut.value, (err) => {
            cb2(err);
          });
        },
        (cb2) => {
          coolingAirPin.write(coolingAirOut.value, (err) => {
            cb2(err);
          });
        },
        (cb2) => {
          cycleCompletePin.write(cycleCompleteOut.value, (err) => {
            cb2(err);
          });
        },
        (cb2) => {
          lmpFltedPin.write(lmpFltedOut.value, (err) => {
            cb2(err);
          });
        },

      ], (err) => {
        cb(err);
      });

    }], (err) => {

    if (done) {
      done(err);
    }
  });
}

function getChildInfo() {
  return childStatuses;
}

// Watch Input Pins, Update value accordingly
function startSigPinWatch(err, value) {
  if (err) {
    throw err;
  }
  if (value) {
    startSigIn.value = 0;
  } else {
    startSigIn.value = 1;
  }
  console.log(`start sig: ${startSigIn.value}`);
}

function stopSigPinWatch(err, value) {
  if (err) {
    throw err;
  }
  if (value) {
    stopSigIn.value = 0;
  } else {
    stopSigIn.value = 1;
  }
  console.log(`stop sig: ${stopSigIn.value}`);
}

function fsSigPinWatch(err, value) {
  if (err) {
    throw err;
  }
  if (value) {
    fullStrokeSigIn.value = 0;
  } else {
    fullStrokeSigIn.value = 1;
  }
  console.log(`full stroke sig: ${fullStrokeSigIn.value}`);
}

// End Watch Input Pins

function i2cIntervalTask() {
  systemInitialized = gatherData.isSystemInitialized();

  if (!readingAndLoggingActive && systemInitialized) {
    readingAndLoggingActive = true;
    i2cHandling();
  } else if (!systemInitialized) {
    gatherData.setupLoop();
  }
}

module.exports = {
  heatersMapped,
  logRequestSent,
  getChildInfo,
  i2cIntervalTask,
  startSigPinWatch,
  stopSigPinWatch,
  fsSigPinWatch,
  i2cHandling
};
