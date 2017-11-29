'use strict';

const util = require('util');
const Promise = require('bluebird');
const async = require('async');
const moment = require('moment');
const main = require('./main');
const i2c = require('./my-i2c-bus');
const chai = require('chai');
const expect = chai.expect;

let childAddresses = [5];
let targetHeater;
let statusBroadcasted;
let statusProcessed;
let readingFinished;
let systemInitialized;

const replyDatalog = 33;
const replyNoDatalog = 3;
const heaterTypes = new Array(childAddresses.length);
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

// Setup Promise Function
function setupLoop() {
  console.log('entering setup')
  // Setup Loop
  Promise.resolve()
    .then(MongoClient.connect(url)
      .then((err, database) => {
	console.log('database started')
        if (err) throw (err);
        db = database;
        dbCreated = true;
      }))
    .then(() => {
      populateDatabase()
    })
    .then(() => {
      if (heatersMapped) {
        systemInitialized = true;
        console.log('System Initialized');
      }
      else console.log('System did not setup correctly');
    });
}

// Broadcasts data to all children
function broadcastData() {
  statusMessageBuffer = [main.startSigIn.Value, main.stopSigIn.Value,
    main.fullStrokeSigIn.Value, main.dataloggingInfo];
  i2c.openP(1).then((bus) => {
    return bus.i2cWriteP(0, statusMessageBuffer.byteLength, statusMessageBuffer)
    .then(({bus, bytesWritten, buffer}) => {
      expect(bytesWritten).toequal(buffer.length);
      if (main.dataloggingInfo) main.logRequestSent = true;
      return bus.closeP();
    });
  });
};

// Reads data obtained from all children
function readData() {
  let data = main.infoBuffers;
  let readLength;
  let targetChild;
  if (!main.tempInfo && !main.dataloggingInfo) readLength = 1;
  else if (main.tempInfo && !main.dataloggingInfo) {
    readLength = 3; //update to be based on board heater number
  }
  else if (main.dataloggingInfo) readLength = 33; // same
  i2c.openP(1).then((bus) => {
    return bus.i2cReadP(targetChild, readLength)
  }).then(({bus, bytesRead, buffer}) => {
    expect(buffer.toString()).to.equal(replyDatalog || replyNoDatalog);
    return bus.closeP();
    data[targetChild] = recievedMessage;
    targetChild += 1;
    if (targetChild >= data.length) {
      main.infoBuffers = data;
      return;
    }
  }).then(readData());
};

// Processes data from all children. Includes datalogging to Mongodb
function processData() {
  let data = main.infoBuffers;
  let datalogIndex;
  const overallStatus = new Array(data.length);
  const heaterStatus = {
    lmpTemps: [0.0, 0.0, 0.0, 0.0],
    heaterCycleRunning: false,
    heaterAtSetpoint: false,
    heaterAtRelease: false,
    heaterCycleComplete: false,
    heaterFaulted: false,
    cycleDatalogged: false,
  };
  if (!statusProcessed) {
    for (let i = 0, l = data.length; i < l; i += 1) {
      const statusByte = data[i].readInt8(0);
      if ((statusByte & 1) === 1) { heaterStatus.heaterCycleRunning = true; }
      if ((statusByte & 2) === 2) { heaterStatus.heaterAtSetpoint = true; }
      if ((statusByte & 4) === 4) { heaterStatus.heaterAtRelease = true; }
      if ((statusByte & 8) === 8) { heaterStatus.heaterCycleComplete = true; }
      if ((statusByte & 16) === 16) { heaterStatus.heaterFaulted = true; }
      if ((statusByte & 32) === 32) { heaterStatus.cycleDatalogged = true; }
      for (let j = 0; j < 4; j += 4) {
        heaterStatus.lmpTemps[j] = data[i].readInt16BE(1) / 10;
      }
      overallStatus[i] = heaterStatus;
    }
    statusProcessed = true;
    main.childStatuses = overallStatus;
  }
  if (main.dataloggingInfo) {
  const k = 30 * targetHeater;
    individualData.timestampId = moment().format('MMMM Do YYYY, h:mm:ss a');
    individualData.startData.startTime = data[datalogIndex]
      .readInt16BE(9 + k) / 100;
    individualData.startData.startTemp = data[datalogIndex]
      .readInt16BE(11 + k) / 10;
    individualData.startData.startPos = data[datalogIndex]
      .readInt16BE(13 + k) / 100;
    individualData.atSetpointData.atSetpointTime = data[datalogIndex]
      .readInt16BE(15 + k) / 100;
    individualData.atSetpointData.atSetpointTemp = data[datalogIndex]
      .readInt16BE(17 + k) / 10;
    individualData.atSetpointData.atSetpointPos = data[datalogIndex]
      .readInt16BE(19 + k) / 100;
    individualData.contactDipData.contactDipTime = data[datalogIndex]
      .readInt16BE(21 + k) / 100;
    individualData.contactDipData.contactDipTemp = data[datalogIndex]
      .readInt16BE(23 + k) / 10;
    individualData.contactDipData.contactDipPos = data[datalogIndex]
      .readInt16BE(25 + k) / 100;
    individualData.shutoffData.shutoffTime = data[datalogIndex]
      .readInt16BE(27 + k) / 100;
    individualData.shutoffData.shutoffTemp = data[datalogIndex]
      .readInt16BE(29 + k) / 10;
    individualData.shutoffData.shutoffPos = data[datalogIndex]
      .readInt16BE(31 + k) / 100;
    individualData.cycleCompleteData.cycleCompleteTime = data[datalogIndex]
      .readInt16BE(33 + k) / 100;
    individualData.cycleCompleteData.cycleCompleteTemp = data[datalogIndex]
      .readInt16BE(35 + k) / 10;
    individualData.cycleCompleteData.cycleCompletePos = data[datalogIndex]
      .readInt16BE(37 + k) / 100;
    main.db.collection('Heater_Database').update(
      {
        heaterId: {
          heaterNumber: 1 + datalogIndex + targetHeater,
        },
      },
      {
        $push: { dataLog: individualData },
      }
    )
      .then((err) => {
        if (err) throw (err);
        if (err) throw (err);
        targetHeater += 1;
        if (targetHeater >= 4) {
          targetHeater = 0;
          datalogIndex += 1;
        }
        if (datalogIndex >= data.length) {
          datalogIndex = 0;
          statusProcessed = false;
          return;
        }
      })
      .then(processData(data, main.childStatuses));
  }
};

// Creates datalog Template
function templateGet(index, htrNum, htrType, address) {
  const heaterTemplate = {
    heaterId: {
      heaterNumber: (htrNum + index),
      lmpType: htrType,
      controllerNumber: index,
      heaterI2cAddress: address,
    },
    dataLog: {
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
    },
  };
  return heaterTemplate;
};

// Populates Database with blank datalog
function populateDatabase() {
  i2c.openP(1).then((bus) => {
    return bus.scanP();
  }).then(({bus, devices}) => {
    childAddresses = devices;
  }).then((bus) => {
    buffer = 1;
    bus.i2cWriteP(0, buffer.byteLength, buffer)
      .then(({bus, bytesWritten, buffer}) => {
        expect(bytesWritten).to.equal(buffer.length);
      })
  }).then((bus) => {
    async.eachOfSeries(childAddresses, (item, key) => {
      bus.i2cReadP(item, 4, recievedMesage)
      .then((err, bytesRead, recievedMessage) => {
        heaterTypes[key] = recievedMessage;
      });
    });
  }).then((bus) => {
    return bus.closeP();
  }).then(() => {
    for (let ind = 0, l = childAddresses.length; ind < l; ind += 1) {
      main.db.collection('Heater_Database').insertMany([
        templateGet(ind, 1, heaterTypes[ind][0], childAddresses[ind]),
        templateGet(ind, 2, heaterTypes[ind][1], childAddresses[ind]),
        templateGet(ind, 3, heaterTypes[ind][2], childAddresses[ind]),
        templateGet(ind, 4, heaterTypes[ind][3], childAddresses[ind]),
      ]);
    }
  }).then(() => { main.heatersMapped = true; });
};

// Boilerplate callback
function cb(err) {
  if (err) throw (err);
};

module.exports = {
  setupLoop: setupLoop,
  broadcastData: broadcastData,
  readData: readData,
  processData: processData,
}

module.exports = {
  childAddresses: childAddresses,
  statusBroadcasted: statusBroadcasted,
  readingFinished: readingFinished,
  statusProcessed: statusProcessed,
  systemInitialized: systemInitialized
}
