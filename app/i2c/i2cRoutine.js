'use strict';
const Data = require('./gather-data');
const util = require('util');
const Promise = require('bluebird');
const express = require('express');
const Gpio = require('onoff').Gpio;
const NanoTimer = require('nanotimer');
const async = require('async');
const MongoClient = Promise.promisifyAll(require('mongodb').MongoClient);

const digIn = [5, 6, 13];
const digOut = [16, 19, 20, 26];
const startSigIn = {
  Value: 0,
  Pin: digIn[0],
  Type: 'digIn',
};
const stopSigIn = {
  Value: 0,
  Pin: digIn[1],
  Type: 'digIn',
};
const fullStrokeSigIn = {
  Value: 0,
  Pin: digIn[2],
  Type: 'digIn',
};
const extendPressOut = {
  Value: 0,
  Pin: digOut[0],
  Type: 'digOut',
};
const coolingAirOut = {
  Value: 0,
  Pin: digOut[1],
  Type: 'digOut',
};
const cycleCompleteOut = {
  Value: 0,
  Pin: digOut[2],
  Type: 'digOut',
};
const lmpFltedOut = {
  Value: 0,
  Pin: digOut[3],
  Type: 'digOut',
};
const url = 'mongodb://localhost:27017/mydb';
const i2cTmr = new NanoTimer();
const app = express();
// IO Configuration
const startSigPin = new Gpio(5, 'in');
const stopSigPin = new Gpio(6, 'in');
const fullStrokePin = new Gpio(13, 'in');
const extendPressPin = new Gpio(16, 'out');
const coolingAirPin = new Gpio(19, 'out');
const cycleCompletePin = new Gpio(20, 'out');
const lmpFltedPin = new Gpio(26, 'out');

// End IO Config

let dataloggingInfo = false;
let dbCreated;
let readingAndLoggingActive;
let childStatuses = [];
let logRequestSent;
let heatersMapped;
let systemInitialized;

// Sets up Timed interrupt for Reading/Writing I2C and Storing Data
function i2cPromise() {
  async.series([
  (cb) => {
    // Broadcast out Status
    console.log('3 entering data broadcast');
    let status = [startSigIn.Value, stopSigIn.Value, 
      fullStrokeSigIn.Value, dataloggingInfo];
    Data.broadcastData(Buffer.from(status), cb);
  },
  (cb) => {
    // Then, read data from each child controller
    console.log('5 entering data read');
    Data.readData(cb);
  },
  (cb) => {
    // Then, process the data obtained from the children
    // storing any datalogging info
    console.log('7 entering data processing');
    Data.processData([startSigIn.Value, stopSigIn.Value, 
      fullStrokeSigIn.Value, dataloggingInfo], cb);
  },
  (cb) => {
    // Set this flag false once complete so it can begin again on next interrupt
    readingAndLoggingActive = false;
    childStatuses = Data.updateStatuses();
    cb();
  },
  (cb) => {
    // Checks if all modules are at setpoint. If so, Parent needs
    // to send out Extend Press signal
    extendPressOut.Value = childStatuses.every(elem => elem.heaterAtSetpoint);
    // Checks if all modules are at release. If so, Parent needs
    // to send out Cooling Air signal
    coolingAirOut.Value = childStatuses.every(elem => elem.heaterAtRelease);
    // Checks if all Modules are at Cycle Complete. If so,
    // Parent needs to send out Cycle Complete Signal
    cycleCompleteOut.Value = childStatuses.every(elem => elem.heaterCycleComplete);
    if (cycleCompleteOut.Value && !logRequestSent) dataloggingInfo = true;
    else if (!cycleCompleteOut.Value && logRequestSent) {
      logRequestSent = false;
    }
    // Checks to see if any modules are faulted. If so, Parent
    // needs to send out LMP Faulted signal
    lmpFltedOut.Value = childStatuses.some(elem => elem.heaterFaulted);
    extendPressPin.write(extendPressOut.Value);
    coolingAirPin.write(coolingAirOut.Value);
    cycleCompletePin.write(cycleCompleteOut.Value);
    lmpFltedPin.write(lmpFltedOut.Value);
    cb();
  }]);
}
// Watch Input Pins, Update value accordingly
startSigPin.watch((err, value) => {
  if (err) throw err;
  startSigIn.value = value;
});
stopSigPin.watch((err, value) => {
  if (err) throw err;
  stopSigIn.value = value;
});
fullStrokePin.watch((err, value) => {
  if (err) throw err;
  fullStrokeSigIn.value = value;
});
// End Watch Input Pins

i2cTmr.setInterval(() => {
  systemInitialized = Data.isSystemInitialized()

  if (!readingAndLoggingActive && systemInitialized) {
    readingAndLoggingActive = true;
    i2cPromise();
  }
  else if (!systemInitialized) {
    Data.setupLoop();
  }
}, '', '750m');
// Ends Temp Info Interrupt setup

// Boilerplate callback
function cb(err) {
  if (err) throw (err);
};

module.exports = {
  heatersMapped: heatersMapped,
  logRequestSent: logRequestSent,
};
