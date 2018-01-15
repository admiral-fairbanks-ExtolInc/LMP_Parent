'use strict';

const util = require('util');
const Promise = require('bluebird');
const async = require('async');
const moment = require('moment');
const main = require('./i2cRoutine');
const i2c = require('i2c-bus');
const i2cP = require('./my-i2c-bus')
const chai = require('chai');
const expect = chai.expect;
const MongoClient = require('mongodb').MongoClient;
const Server = require('mongodb').Server;
const _ = require('lodash');

let childAddresses = [];
let numHeaters = [1];
let targetHeater=0;
let statusBroadcasted;
let statusProcessed = false;
let readingFinished;
let systemInitialized = false;
let populatingDatabase = false;
let readingAndLoggingActive = false;
let i2cScanned = false;
let heatersMapped;
let db;
let i2c1;
let statuses = [];
let infoBuffers = new Array([childAddresses.length]);

const url = 'mongodb://localhost:27017/mydb';
const dbName = 'heaterDatabase';
const replyDatalog = 33;
const replyNoDatalog = 3;
const individualData = {
  timestampId: moment().format('MMMM Do YYYY, h:mm:ss a'),
  startData: {
    startTime: 0,
    startTemp: 0,
    startPos: 0,
  },
  atSetpointData: {
    atSetpointTime: 0,
    atSetpointTemp: 0,
    atSetpointPos: 0,
  },
  contactDipData: {
    contactDipTime: 0,
    contactDipTemp: 0,
    contactDipPos: 0,
  },
  shutoffData: {
    shutoffTime: 0,
    shutoffTemp: 0,
    shutoffPos: 0,
  },
  cycleCompleteData: {
    cycleCompleteTime: 0,
    cycleCompleteTemp: 0,
    cycleCompletePos: 0,
  },
};

// Broadcasts data to all children
function broadcastData(status, statusMessageBuffer, cb) {
  if (!_.isArrayLike(statusMessageBuffer) || !_.isFunction(cb)) {
    throw new Error('broadcastData called with invalid args');
  }
  readingAndLoggingActive = true;
  i2c1.i2cWrite(0, statusMessageBuffer.byteLength, statusMessageBuffer,
  (err, bytesWritten, buffer) => {
    if (err) {
      console.log(err);
      console.log("error at line 75, gather-data");
      return cb(null, status);
    }
    cb(null, status);
  });
};

// Reads data obtained from all children
function readData(status, cb) {
  if (!_.isFunction(cb)) {
    throw new Error('readData called with invalid args');
  }
  let dataloggingInfo = status[3];
  const childInfo = [];
  let readLength;
  let targetChild;
  if (!dataloggingInfo) readLength = 3; //update to be based on board heater number
  else readLength = 23; // same
  let tempBuff = Buffer.alloc(readLength);
  async.eachOfSeries(childAddresses, (item, key, cb2) => {
    i2c1.i2cRead(item, readLength, tempBuff,
      (err, bytesRead, buffer) => {
      if (err) {
        console.log(err);
        console.log(buffer);
        return cb2(null, childInfo);
      }
      tempBuff = buffer;
      childInfo[key] = tempBuff;
      //console.log(childInfo);
      return cb2();
    })
  },
  (err) => {
    if (err) console.log("Error while reading");
    //console.log(childInfo);
    return cb(null, status, childInfo);
  })
};

// Processes data from all children. Includes datalogging to Mongodb
function processData(status, childInfo, cb) {
  let datalogIndex=0;
  const overallStatus = new Array(childAddresses.length);
  const heaterStatus = {
    lmpTemps: [],
    heaterCycleRunning: false,
    heaterAtSetpoint: false,
    coolingAirOn: false,
    heaterAtRelease: false,
    heaterCycleComplete: false,
    heaterFaulted: false,
    cycleDatalogged: false,
  };
  if (!statusProcessed) {
    for (let i = 0, l = childInfo.length; i < l; i += 1) {
      const statusByte = childInfo[i].readInt8(0);
      if ((statusByte & 1) === 1) heaterStatus.heaterCycleRunning = true;
      if ((statusByte & 2) === 2) heaterStatus.heaterAtSetpoint = true;
      if ((statusByte & 4) === 4) heaterStatus.coolingAirOn = true;
      if ((statusByte & 8) === 8) heaterStatus.heaterAtRelease = true;
      if ((statusByte & 16) === 16) heaterStatus.heaterCycleComplete = true;
      if ((statusByte & 32) === 32) heaterStatus.heaterFaulted = true;
      if ((statusByte & 64) === 64) heaterStatus.cycleDatalogged = true;
      for (let j = 0; j < 4; j += 4) heaterStatus.lmpTemps[j] = childInfo[i]
        .readInt16BE(1) / 10;
      overallStatus[i] = heaterStatus;
    }
    statusProcessed = true;
    statuses = overallStatus;
    statusProcessed = false;
  }
  if (status[3]) {
    const k = 20 * targetHeater;
    MongoClient.connect(url, (err, client) => {
      const doc = {
        heaterID: {
          timestampID: moment().format('MMMM Do YYYY, h:mm:ss a'),
          heaterNumber: 1 + datalogIndex + targetHeater,
        },
        dataLog: {
          startData: {
            startTime: childInfo[datalogIndex].readInt16BE(3 + k) / 100,
            startTemp: childInfo[datalogIndex].readInt16BE(5 + k) / 10,
          },
          atSetpointData: {
            atSetpointTime: childInfo[datalogIndex].readInt16BE(7 + k) / 100,
            atSetpointTemp: childInfo[datalogIndex].readInt16BE(9 + k) / 10,
          },
          contactDipData: {
            contactDipTime: childInfo[datalogIndex].readInt16BE(11 + k) / 100,
            contactDipTemp: childInfo[datalogIndex].readInt16BE(13 + k) / 10,
          },
          shutoffData: {
            shutoffTime: childInfo[datalogIndex].readInt16BE(15 + k) / 100,
            shutoffTemp: childInfo[datalogIndex].readInt16BE(17 + k) / 10,
          },
          cycleCompleteData: {
            cycleCompleteTime: childInfo[datalogIndex].readInt16BE(19 + k) / 100,
            cycleCompleteTemp: childInfo[datalogIndex].readInt16BE(21 + k) / 10,
          },
        }
      };
      if (err) console.log(err.stack);
      else console.log("Connected correctly to server");
      const db = client.db(dbName);
      Promise.resolve()
      .then(() => {
         db.collection('heaterRecords').insertOne(doc)
      }).then((err) => {
        if (err) throw (err);
        targetHeater += 1;
        console.log("target heater is: " + targetHeater);
        if (targetHeater >= numHeaters[datalogIndex]) {
          targetHeater = 0;
          datalogIndex += 1;
          console.log("datalog index is: " + datalogIndex);
        }
        client.close();
        if (datalogIndex >= childInfo.length) {
          datalogIndex = 0;
          statusProcessed = false;
          readingAndLoggingActive = false;
          console.log("db process done");
          return cb(null, statuses);
        }
        else {
          console.log("I happened again")
          processData();
        }
      }).catch((err) => {
        console.log(err);
      })
    });
  }
  else {
    readingAndLoggingActive = false;
    return cb(null, statuses);
  }
};

// Setup Promise Function
function setupLoop() {
  populatingDatabase = true;
  i2c1 = i2c.open(1, (err) => {
    if (err) console.log(err.stack);
    getAddresses();
  });
}

// Populates Database with blank datalog
function getAddresses() {
  const broadcastBuff = Buffer.alloc(1, 1);
  async.series([
    (cb) => {
      i2c1.scan((err, dev) => {
        if (err) throw err;
        dev.forEach((elem, ind, arr) => {
          if (elem < 35) {
            childAddresses.push(elem);
          }
          if (ind === arr.length - 1) {
            console.log('3 devices scanned: ' + childAddresses);
            i2cScanned = true;
            cb(err);
          }
        })
      });
    },
    (cb) => {
      async.retryable({times: 5, interval: 5}, i2c1.i2cWrite(0, broadcastBuff.byteLength, broadcastBuff,
        (err, bytesWritten, buffer) => {
        if (err) throw err;
        cb(err);
      }));
    }
  ],
  (err) => {
    if (err) throw err;
    systemInitialized = true;
    populatingDatabase = false;
    console.log("setup done")
  });
}

function isSystemInitialized() {
  return systemInitialized;
}

function isSystemInitInProgress() {
  return populatingDatabase;
}

function updateValue() {
  let k = statuses;
  return k;
}

function RALA() {
  return readingAndLoggingActive;
}

module.exports = {
  setupLoop: setupLoop,
  broadcastData: broadcastData,
  readData: readData,
  processData: processData,
  updateValue: updateValue,
  isSystemInitialized: isSystemInitialized,
  isSystemInitInProgress: isSystemInitInProgress,
  RALA: RALA,
  childAddresses: childAddresses,
  statusBroadcasted: statusBroadcasted,
  readingFinished: readingFinished,
  statusProcessed: statusProcessed,
  statuses: statuses,
};
