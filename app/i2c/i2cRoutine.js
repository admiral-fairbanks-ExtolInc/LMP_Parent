'use strict';
const Data = require('./gather-data');
const util = require('util');
const Promise = require('bluebird');
const express = require('express');
const Gpio = require('onoff').Gpio;
const NanoTimer = require('nanotimer');
const async = require('async');
const MongoClient = Promise.promisifyAll(require('mongodb').MongoClient);

const digIn = [4, 5, 6, 12];
const digOut = [17, 19, 20, 21, 22];
const enableSigIn = {
  Value: 0,
  Pin: digIn[0],
  Type: 'digIn',
};
const startSigIn = {
  Value: 0,
  Pin: digIn[1],
  Type: 'digIn',
};
const stopSigIn = {
  Value: 0,
  Pin: digIn[2],
  Type: 'digIn',
};
const fullStrokeSigIn = {
  Value: 0,
  Pin: digIn[3],
  Type: 'digIn',
};
const cycleRunningOut = {
  Value: 0,
  Pin: digOut[0],
  Type: 'digOut',
};
const extendPressOut = {
  Value: 0,
  Pin: digOut[1],
  Type: 'digOut',
};
const cycleCompleteOut = {
  Value: 0,
  Pin: digOut[2],
  Type: 'digOut',
};
const coolingAirOut = {
  Value: 0,
  Pin: digOut[3],
  Type: 'digOut',
};
const lmpFltedOut = {
  Value: 0,
  Pin: digOut[4],
  Type: 'digOut',
};
const url = 'mongodb://localhost:27017/mydb';
const i2cTmr = new NanoTimer();
const app = express();
// IO Configuration
const enableSigPin = new Gpio(4, 'in', 'both');
const coolingAirPin = new Gpio(18, 'out');
const runningPin = new Gpio(19, 'out');
const extendPressPin = new Gpio(20, 'out');
const cycleCompletePin = new Gpio(21, 'out');
const lmpFltedPin = new Gpio(22, 'out');

// End IO Config

let dataloggingInfo = false;
let calibrateRtd = false;
let dbCreated;
let readingAndLoggingActive;
let childStatuses = [];
let logRequestSent;
let systemInitialized = false;
let systemInitInProgress = false;
let cycleStartSent = false;
let cycleStart = false;
let cycleStop = false;

function readyForLogging() {
  return dataloggingInfo
}



// Sets up Timed interrupt for Reading/Writing I2C and Storing Data
function i2cHandling(updateSettings, done) {
  if (readingAndLoggingActive) {
    console.log("read and log active, quitting");
    return;
  }
  if (startSigIn.Value && !cycleStartSent) {
    cycleStartSent = true;
    cycleStart = true;
  }
  else cycleStart = false;
  if (stopSigIn.Value || !enableSigIn.Value) cycleStop = true;
  else cycleStop = false;
  async.waterfall([
  (cb) => {
    readingAndLoggingActive = true;
    if (cycleCompleteOut.Value && !logRequestSent) {
      dataloggingInfo = true;
      logRequestSent = true;
    }
    else if (!cycleCompleteOut.Value && logRequestSent) {
      logRequestSent = false;
    }
    let status = [cycleStart, cycleStop,
      fullStrokeSigIn.Value, dataloggingInfo, calibrateRtd];
    // Broadcast out Status
    if (updateSettings.targetHeater !== -1) {

      console.log("settings updated");
      let broadcastBuffer = Buffer.alloc(10);
      broadcastBuffer.writeUInt8(startSigIn.Value, 0);
      broadcastBuffer.writeUInt8(stopSigIn.Value, 1);
      broadcastBuffer.writeUInt8(fullStrokeSigIn.Value, 2);
      broadcastBuffer.writeUInt8(dataloggingInfo, 3);
      broadcastBuffer.writeUInt8(calibrateRtd, 4);
      broadcastBuffer.writeUInt8(updateSettings.heaterAddress, 5);
      broadcastBuffer.writeUInt8(updateSettings.heaterPosn, 6);
      broadcastBuffer.writeUInt8(updateSettings.settingToUpdate, 7);
      broadcastBuffer.writeUInt16BE(updateSettings.settingValue, 8);
      Data.broadcastData(status, broadcastBuffer, cb);
    }
    else {
      let broadcastBuffer = Buffer.from(status);
      Data.broadcastData(status, broadcastBuffer, cb);
    }
    if (logRequestSent && dataloggingInfo) {
      dataloggingInfo = false;
    }
  },
  (status, cb) => {
    // Then, read data from each child controller
    Data.readData(status, cb);
  },
  (status, data, cb) => {
    // Then, process the data obtained from the children
    // storing any datalogging info
    Data.processData(status, data, cb);
  },
  (statuses, cb) => {
    // Set this flag false once complete so it can begin again on next interrupt
    readingAndLoggingActive = false;
    childStatuses = statuses;
    //  Checks to see if start signal was recieved. If so, Parent
    // sends out Running signal
    if (startSigIn.Value && !cycleCompleteOut.Value && !lmpFltedOut.Value) {
      cycleRunningOut.Value = 1;
    }
    else cycleRunningOut.Value = 0;
    // Checks if all modules are at setpoint. If so, Parent needs
    // to send out Extend Press signal
    if (childStatuses.every(elem => elem.extendPress)) {
      extendPressOut.Value = 1;
    }
    else {
      extendPressOut.Value = 0;
    }
    //console.log(childStatuses);
    // Checks if all modules are at release. If so, Parent needs
    // to send out Cooling Air signal
    if (childStatuses.every(elem => elem.coolingAirOn)) {
      coolingAirOut.Value = 1;
    }
    else {
      coolingAirOut.Value = 0;
    }
    // Checks if all Modules are at Cycle Complete. If so,
    // Parent needs to send out Cycle Complete Signal
    if (childStatuses.every(elem => elem.cycleDatalogged)) {
      cycleCompleteOut.Value = 1;
      //console.log("cyclecomplete true");
    }
    else {
      cycleCompleteOut.Value = 0;
      //console.log("cyclecomplete false");
    }
    if (calibrateRtd) calibrateRtd = false;
    // Checks to see if any modules are faulted. If so, Parent
    // needs to send out LMP Faulted signal
    if (childStatuses.some(elem => elem.heaterFaulted)) {
      lmpFltedOut.Value = 1;
    }
    else {
      lmpFltedOut.Value = 0;
    }
    async.series([
      (cb2) => {
        coolingAirPin.write(coolingAirOut.Value, (err) => {
          cb2(err);
        });
      },
      (cb2) => {
        runningPin.write(cycleRunningOut.Value, (err) => {
          cb2(err);
        });
      },
      (cb2) => {
        extendPressPin.write(extendPressOut.Value, (err) => {
          cb2(err);
        });
      },
      (cb2) => {
        cycleCompletePin.write(cycleCompleteOut.Value, (err) => {
          cb2(err);
        });
      },
      (cb2) => {
        lmpFltedPin.write(lmpFltedOut.Value, (err) => {
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

function getHeaterAddresses() {
  let infoPacket = Data.getHeaterAddresses();
  return infoPacket;
}

// Watch Input Pins, Update value accordingly
function enableSigPinWatch(err, value) {
  if (err) throw err;
  if (value) enableSigIn.Value = 1;
  else {
    enableSigIn.Value = 0;
  }
}

function startSigPinWatch(err, value) {
  if (err) throw err;
  if (value && enableSigIn.Value) startSigIn.Value = 1; //add enable sig back in later
  else {
    cycleStartSent = false;
    startSigIn.Value = 0;
  }
  console.log("start signal value is: " + startSigIn.Value);
}

function stopSigPinWatch(err, value) {
  if (err) throw err;
  if (value) stopSigIn.Value = 1;
  else stopSigIn.Value = 0;
  console.log("stop signal value is: " + stopSigIn.Value);
}

function FSSigPinWatch(err, value) {
  if (err) throw err;
  if (value) fullStrokeSigIn.Value = 1;
  else fullStrokeSigIn.Value = 0;
  console.log("full stroke signal value is: " + fullStrokeSigIn.Value);
}
// End Watch Input Pins

function i2cIntervalTask(updateSettings) {
  systemInitialized = Data.isSystemInitialized();
  systemInitInProgress = Data.isSystemInitInProgress();
  if (systemInitialized && !systemInitInProgress) {
    enableSigPin.read((err, val) => {
      if (err) throw(err);
      enableSigIn.Value = val;
    })
    i2cHandling(updateSettings);
  }
  else if (!systemInitialized && !systemInitInProgress) {
    Data.setupLoop();
  }
}

function getRunningStatus() {
  return cycleRunningOut.Value;
}

function engageRtdCalibration() {
  calibrateRtd = true;
  console.log(calibrateRtd);
}

module.exports = {
  logRequestSent: logRequestSent,
  getChildInfo: getChildInfo,
  engageRtdCalibration: engageRtdCalibration,
  i2cIntervalTask: i2cIntervalTask,
  readyForLogging: readyForLogging,
  enableSigPinWatch: enableSigPinWatch,
  startSigPinWatch: startSigPinWatch,
  stopSigPinWatch: stopSigPinWatch,
  FSSigPinWatch: FSSigPinWatch,
  getRunningStatus: getRunningStatus,
  getHeaterAddresses: getHeaterAddresses,
};
