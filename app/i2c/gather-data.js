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

let childAddresses = [];
let targetHeater;
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
const numHeaters = 1;
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
function broadcastData(statusMessageBuffer, cb) {
  readingAndLoggingActive = true;
  async.eachOfSeries(childAddresses, (item, key, cb) => {
    i2c1.i2cWrite(item, statusMessageBuffer.byteLength, statusMessageBuffer,
    (err, bytesWritten, buffer) => {
      if (err) {
        console.log(err);
        console.log(bytesWritten);
      }
      cb();
    });
  },
  (err) => {
    if (err) throw err;
    cb();
  })
};

// Reads data obtained from all children
function readData(status, cb) {
  let dataloggingInfo = status[3];
  let data = infoBuffers;
  let readLength;
  let targetChild;
  if (!dataloggingInfo) readLength = 3; //update to be based on board heater number
  else readLength = 23; // same
  let tempBuff = Buffer.alloc(readLength);
  async.eachOfSeries(childAddresses, (item, key, cb) => {
    async.retryable({times: 5, interval: 5},
      i2c1.i2cRead(item, readLength, tempBuff,
        (err, bytesRead, buffer) => {
        if (err) {
          console.log(err);
          console.log(buffer);
        }
        tempBuff = buffer;
        data[key] = tempBuff;
        cb(err);
      })
    )
  },
  (err) => {
    if (err) throw err;
    infoBuffers = data;
    cb();
  })
};

// Processes data from all children. Includes datalogging to Mongodb
function processData(IOstatus, cb) {
  let data = infoBuffers;
  let datalogIndex;
  let statusMessageBuffer = IOstatus;
  const overallStatus = new Array(data.length);
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
    for (let i = 0, l = data.length; i < l; i += 1) {
      const statusByte = data[i].readInt8(0);
      if ((statusByte & 1) === 1) heaterStatus.heaterCycleRunning = true;
      if ((statusByte & 2) === 2) heaterStatus.heaterAtSetpoint = true;
      if ((statusByte & 4) === 4) heaterStatus.coolingAirOn = true;
      if ((statusByte & 8) === 8) heaterStatus.heaterAtRelease = true;
      if ((statusByte & 16) === 16) heaterStatus.heaterCycleComplete = true;
      if ((statusByte & 32) === 32) heaterStatus.heaterFaulted = true;
      if ((statusByte & 64) === 64) heaterStatus.cycleDatalogged = true;
      for (let j = 0; j < 4; j += 4) heaterStatus.lmpTemps[j] = data[i]
        .readInt16BE(1) / 10;
      overallStatus[i] = heaterStatus;
    }
    statusProcessed = true;
    statuses = overallStatus;
    statusProcessed = false;
    cb();
  }
  if (statusMessageBuffer[3]) {
  const k = 20 * targetHeater;
  const document = {
    heaterID: {
      timestampID: moment().format('MMMM Do YYYY, h:mm:ss a'),
      heaterNumber: 1 + datalogIndex + targetHeater,
    },
    dataLog: [
      startData: {
        startTime: data[datalogIndex].readInt16BE(3 + k) / 100,
        startTemp: data[datalogIndex].readInt16BE(5 + k) / 10,
      },
      atSetpointData: {
        atSetpointTime: data[datalogIndex].readInt16BE(7 + k) / 100,
        atSetpointTemp: data[datalogIndex].readInt16BE(9 + k) / 10,
      },
      contactDipData: {
        contactDipTime: data[datalogIndex].readInt16BE(11 + k) / 100,
        contactDipTemp: data[datalogIndex].readInt16BE(13 + k) / 10,
      },
      shutoffData: {
        shutoffTime: data[datalogIndex].readInt16BE(15 + k) / 100,
        shutoffTemp: data[datalogIndex].readInt16BE(17 + k) / 10,
      },
      cycleCompleteData: {
        cycleCompleteTime: data[datalogIndex].readInt16BE(19 + k) / 100,
        cycleCompleteTemp: data[datalogIndex].readInt16BE(21 + k) / 10,
      },
    ]
  };
  MongoClient.connect(url, (err, client) => {
    if (err) console.log(err.stack);
    else console.log("Connected correctly to server");
    const db = client.db(dbName);
    db.collection('heaterRecords').insertOne(document).then((err) => {
      if (err) throw (err);
      if (err) throw (err);
      targetHeater += 1;
      if (targetHeater >= 4) {
        targetHeater = 0;
        datalogIndex += 1;
      }
      client.close();
      if (datalogIndex >= data.length) {
        datalogIndex = 0;
        statusProcessed = false;
        readingAndLoggingActive = false;
        cb();
        return;
      }
    }).then(processData())
      .catch((err) => {throw (err);});
    }
  });
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

// Boilerplate callback
function cb(err) {
  if (err) throw (err);
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
