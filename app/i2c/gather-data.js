'use strict';

const util = require('util');
const Promise = require('bluebird');
const async = require('async');
const moment = require('moment');
const main = require('./i2cRoutine');
const i2c = require('i2c-bus');
const i2cP = require('./my-i2c-bus')
const chai = require('chai');
const MongoClient = require('mongodb').MongoClient;
const Server = require('mongodb').Server;
const _ = require('lodash');
const co = require('co');

const assert = require('assert');

let childAddresses = [];
let numHeaters = [];
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

const url = 'mongodb://127.0.0.1:27017/mydb';
const dbName = 'heaterDatabase';

// Broadcasts data to all children
function broadcastData(status, statusMessageBuffer, cb) {
  if (!_.isArrayLike(statusMessageBuffer) || !_.isFunction(cb)) {
    throw new Error('broadcastData called with invalid args line 66 gather-data');
  }
  readingAndLoggingActive = true;
  async.retry({times:5, interval:5}, (callback, res) => {
    i2c1.i2cWrite(0, statusMessageBuffer.byteLength, statusMessageBuffer,
    (err, bytesWritten, buffer) => {
      if (err) {
        console.log(err);
        console.log("error at line 75, gather-data, trying again");
        return callback("Error broadcasting data", null);
      }
      callback(null, status);
    });
  }, cb)
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
  async.eachOfSeries(childAddresses, (item, key, cb2) => {
    if (!dataloggingInfo) readLength = 1 + 2*numHeaters[key]; //update to be based on board heater number
    else readLength = 1 + 22*numHeaters[key]; // same
    //console.log(readLength);
    let tempBuff = Buffer.alloc(readLength);
    async.retry({times:5, interval:5}, (callback, res) => {
      i2c1.i2cRead(item, readLength, tempBuff,
        (err, bytesRead, buffer) => {
        if (err) {
          console.log(err);
          console.log(buffer);
          return callback(null, childInfo);
        }
        tempBuff = buffer;
        childInfo[key] = tempBuff;
        //console.log(childInfo);
        return callback(null);
      })
    }, cb2);
  },
  (err) => {
    if (err) console.log("Error while reading");
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
    extendPress: false,
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
      if ((statusByte & 2) === 2) heaterStatus.extendPress = true;
      if ((statusByte & 4) === 4) heaterStatus.coolingAirOn = true;
      if ((statusByte & 8) === 8) heaterStatus.heaterAtRelease = true;
      if ((statusByte & 16) === 16) heaterStatus.heaterCycleComplete = true;
      if ((statusByte & 32) === 32) heaterStatus.heaterFaulted = true;
      if ((statusByte & 64) === 64) heaterStatus.cycleDatalogged = true;
      for (let j = 0; j < numHeaters[i]; j += 1) heaterStatus.lmpTemps[j] = childInfo[i]
        .readInt16BE(1 + 2*j) / 10;
      overallStatus[i] = heaterStatus;
    }
    statusProcessed = true;
    statuses = overallStatus;
  }
  if (status[3]) {
    co(function*() {
      const db = yield MongoClient.connect(url);
      let priorCount = numHeaters.slice(0, datalogIndex)
        .reduce((a, b) => a + b, 0);
      for (let j = 0; j < numHeaters[datalogIndex]; j++) {
        const doc = {
          docID: {
            timestampID: new Date(),
            heaterNumber: 1 + j + priorCount,
            docType: 'datalog'
          },
          dataLog: {
            startData: {
              startTime: childInfo[datalogIndex]
                .readInt16BE(1 + 2*numHeaters[datalogIndex] + j*20)/1000,
              startTemp: childInfo[datalogIndex]
                .readInt16BE(3 + 2*numHeaters[datalogIndex] + j*20) / 10,
            },
            atSetpointData: {
              atSetpointTime: childInfo[datalogIndex]
                .readInt16BE(5 + 2*numHeaters[datalogIndex] + j*20)/1000,
              atSetpointTemp: childInfo[datalogIndex]
                .readInt16BE(7 + 2*numHeaters[datalogIndex] + j*20) / 10,
            },
            contactDipData: {
              contactDipTime: childInfo[datalogIndex]
                .readInt16BE(9 + 2*numHeaters[datalogIndex] + j*20)/1000,
              contactDipTemp: childInfo[datalogIndex]
                .readInt16BE(11 + 2*numHeaters[datalogIndex] + j*20) / 10,
            },
            shutoffData: {
              shutoffTime: childInfo[datalogIndex]
                .readInt16BE(13 + 2*numHeaters[datalogIndex] + j*20)/1000,
              shutoffTemp: childInfo[datalogIndex]
                .readInt16BE(15 + 2*numHeaters[datalogIndex] + j*20) / 10,
            },
            cycleCompleteData: {
              cycleCompleteTime: childInfo[datalogIndex]
                .readInt16BE(17 + 2*numHeaters[datalogIndex] + j*20)/1000,
              cycleCompleteTemp: childInfo[datalogIndex]
                .readInt16BE(19 + 2*numHeaters[datalogIndex] + j*20) / 10,
            },
          }
        };
        const r = yield db.collection('heaterRecords').insertOne(doc);
        assert.equal(1, r.insertedCount);
      }
      const r = yield db.close();
      datalogIndex += 1;
      if (datalogIndex >= childInfo.length) {
        datalogIndex = 0;
        statusProcessed = false;
        readingAndLoggingActive = false;
        console.log("db process done");
        return cb(null, statuses);
      }
      else {
        console.log("I happened again")
        processData(status, childInfo, cb);
      }
    }).catch((err) => {
      console.log(err);
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
            console.log('Devices scanned: ' + childAddresses);
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
    },
    (cb) => {
      let readLength = 2;
      let tempBuff = Buffer.alloc(readLength);
      async.eachOfSeries(childAddresses, (item, key, cb2) => {
        async.retry({times:5, interval:5}, (callback, res) => {
          i2c1.i2cRead(item, readLength, tempBuff,
            (err, bytesRead, tempBuff) => {
            if (err) {
              console.log(err);
              console.log(buffer);
              callback(null);
            }
            numHeaters[key] = tempBuff.readInt8(1);
            console.log("number of heaters: " + numHeaters[key]);
            return callback(null);
          })
        }, cb2);
      },
      (err) => {
        if (err) console.log("Error while reading");
        //console.log(childInfo);
        return cb(err);
      })
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

function getHeaterAddresses() {
  let infoPacket = {
    childAddresses: childAddresses,
    numHeaters: numHeaters,
  }
  return infoPacket;
}

module.exports = {
  setupLoop: setupLoop,
  broadcastData: broadcastData,
  readData: readData,
  processData: processData,
  updateValue: updateValue,
  getHeaterAddresses: getHeaterAddresses,
  isSystemInitialized: isSystemInitialized,
  isSystemInitInProgress: isSystemInitInProgress,
  RALA: RALA,
  childAddresses: childAddresses,
  statusBroadcasted: statusBroadcasted,
  readingFinished: readingFinished,
  statusProcessed: statusProcessed,
  statuses: statuses,
};
