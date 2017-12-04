'use strict';
const Data = require('./gather-data');
const util = require('util');
const Promise = require('bluebird');
const express = require('express');
const Gpio = require('onoff').Gpio;
const NanoTimer = require('nanotimer');
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
const infoBuffers = new Array([Data.childAddresses.length]);

let tempInfo;
let dataloggingInfo;
let db;
let dbCreated;
let systemInitialized;
let readingAndLoggingActive;
let childStatuses = [];
let logRequestSent;
let heatersMapped;

// Sets up Timed interrupt for Reading/Writing I2C and Storing Data
const i2cPromise = Promise.resolve()
  // Broadcast out Status
  .then(() => {
    Data.broadcastData;
  })
  // Then, read data from each child controller
  .then(() => {
    Data.readData;
  })
  // Then, process the data obtained from the children
  // storing any datalogging info
  .then(() => {
    Data.processData;
  })
  // Set this flag false once complete so it can begin again on next interrupt
  .then(() => { readingAndLoggingActive = false; })
  // Then update system variables and write outputs
  .then(() => {
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
  });

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
  if (!readingAndLoggingActive && Data.systemInitialized) {
    readingAndLoggingActive = true;
    i2cPromise();
  }
  else if (!Data.systemInitialized) {
    // console.log('entering setup')
    Data.setupLoop();
  }
}, '', '750m');
// Ends Temp Info Interrupt setup

module.exports = {
  dataloggingInfo,
  db,
  heatersMapped,
  logRequestSent,
  infoBuffers,
  childStatuses,
  startSigIn,
  stopSigIn,
  fullStrokeSigIn,
};
