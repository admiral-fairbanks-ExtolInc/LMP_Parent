
const async = require('async');
const moment = require('moment');
const main = require('./i2c-routine');
const i2c = require('i2c-bus');
const MongoClient = require('mongodb').MongoClient;
const Server = require('mongodb').Server;

let childAddresses = [5];
let targetHeater;
let statusBroadcasted;
let statusProcessed = false;
let readingFinished;
let systemInitialized;
let heatersMapped;
let db;
let i2c1;
let statuses = [];
const infoBuffers = new Array([childAddresses.length]);

const url = 'mongodb://localhost:27017/mydb';
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
  i2c1.i2cWrite(0, statusMessageBuffer.byteLength, statusMessageBuffer, (err, bytesWritten, buffer) => {

    if (err) {
      return cb(err);
    }

    if (bytesWritten !== buffer.length) {
      return cb(new Error('i2cWrite failed - bytesWritten !== buffer.length'));
    }

    if (statusMessageBuffer[3]) {
      main.logRequestSent = true;
      //TODO: won't work. needs to be refactored.
      console.log('3 status broadcasted');
    }

    return cb();

  });
}

// Reads data obtained from all children
function readData(cb) {

  let readLength;

  if (!main.dataloggingInfo) {
    readLength = 3;
  } else { //update to be based on board heater number
    readLength = 33;
  } // same

  async.eachOfSeries(childAddresses, (item, key, cb) => {

    const tempBuff = Buffer.alloc(readLength);

    i2c1.i2cRead(item, readLength, tempBuff, (err, bytesRead, buffer) => {

      if (err) {
        return cb(err);
      }

      if (bytesRead !== readLength) {
        return cb(new Error('i2cRead failed - bytesRead !== readLength'));
      }

      infoBuffers[key] = buffer;

      return cb();

    });

  }, (err) => {

    if (err) {
      console.log('4 finished failed reading');
    } else {
      console.log('4 finished reading successfully');
    }

    return cb(err);

  });
}

// Processes data from all children. Includes datalogging to Mongodb
function processData(IOstatus, cb) {
  const data = infoBuffers;
  let datalogIndex;
  const statusMessageBuffer = IOstatus;
  const overallStatus = new Array(data.length);
  const heaterStatus = {
    lmpTemps: [],
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
      /* eslint-disable no-bitwise */
      if ((statusByte & 1) === 1) { heaterStatus.heaterCycleRunning = true; }
      if ((statusByte & 2) === 2) { heaterStatus.heaterAtSetpoint = true; }
      if ((statusByte & 4) === 4) { heaterStatus.heaterAtRelease = true; }
      if ((statusByte & 8) === 8) { heaterStatus.heaterCycleComplete = true; }
      if ((statusByte & 16) === 16) { heaterStatus.heaterFaulted = true; }
      if ((statusByte & 32) === 32) { heaterStatus.cycleDatalogged = true; }
      /* eslint-enable no-bitwise */
      for (let j = 0; j < 4; j += 4) {
        heaterStatus.lmpTemps[j] = data[i].readInt16BE(1) / 10;
      }

      overallStatus[i] = heaterStatus;
    }
    statusProcessed = true;
    statuses = overallStatus;
    statusProcessed = false;
    console.log('5 data processing done');
  }

  return cb();

  /*
  if (statusMessageBuffer[3]) {
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
    db.collection('Heater_Database').update(
      {
        heaterId: {
          heaterNumber: 1 + datalogIndex + targetHeater,
        },
      },
      {
        $push: { dataLog: individualData },
      }
    ).then((err) => {
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
        console.log('8 data processing done');
        cb();
        return;
      }
    }).then(processData())
      .catch((err) => {throw (err);});
  }
  */
}

/**
 * Constructor function for HeaterReading
 * @param time
 * @param temp
 * @param pos
 * @constructor
 */
function HeaterReading(time, temp, pos) {
  this.time = time;
  this.temp = temp;
  this.pos = pos;
}

// Creates datalog Template
function getTemplate(index, htrNum, htrType, address) {

  const heaterDataTypes = ['start', 'atSetpoint', 'contactDip', 'shutoff', 'cycleComplete'];

  const heaterData = {
    heaterId: {
      heaterNumber: (htrNum + index),
      lmpType: htrType,
      controllerNumber: index,
      heaterI2cAddress: address,
    },
    dataLog: {},
  };

  heaterDataTypes.forEach((item) => {
    heaterData.dataLog[item] = new HeaterReading(0, 0, 0);
  });

  return heaterData;

}

// Populates Database with blank datalog
function populateDatabase(database) {
  async.series(
    [
      (cb) => {
        i2c1.scan((err, dev) => {
          if (!err) {
            childAddresses = dev;
          }
          cb(err);
        });
      },
      (cb) => {
        const broadcastBuff = Buffer.alloc(1, 1);
        i2c1.i2cWrite(0, broadcastBuff.byteLength, broadcastBuff, (err, bytesWritten, buffer) => {

          if (err) {
            return cb(err);
          } else if (bytesWritten !== broadcastBuff.byteLength) {
            return cb(new Error('i2cWrite failed - bytesWritten !== broadcastBuff.byteLength'));
          }

          return cb();

        });
      },
      (cb) => {
        async.eachOfSeries(childAddresses, (item, key, callback) => {
          const receivedBuff = Buffer.alloc(4);
          let heaterTypes;
          i2c1.i2cRead(item, receivedBuff.byteLength, receivedBuff, (err, bytesRead, buffer) => {

            if (err) {
              return callback(err);
            } else if (bytesRead !== receivedBuff.byteLength) {
              return callback(new Error('i2cRead failed  - bytesWritten !== broadcastBuff.byteLength'));
            }

            heaterTypes = receivedBuff.toString();
            console.log(`5 msg received: ${heaterTypes}`);
            return callback();
            /*
        db.collection('Heater_Database').insertMany([
          templateGet(key, 1, heaterTypes[0], childAddresses[key]),
          templateGet(key, 2, heaterTypes[1], childAddresses[key]),
          templateGet(key, 3, heaterTypes[2], childAddresses[key]),
          templateGet(key, 4, heaterTypes[3], childAddresses[key]),
        ]);
        */
          });
        }, (err) => {
          return cb(err);
        });
      },
    ],
    (err) => {
      if (err) {
        throw err;
      }
      console.log('2 setup done');
      systemInitialized = true;
    },
  );
}

// Setup Promise Function
function setupLoop() {
  i2c1 = i2c.open(1, (err) => {
    console.log('1 entering setup');
    // Setup Loop
    MongoClient.connect(url, (err, database) => {
      //console.log('2 successfully connected to database');
      db = database;
      populateDatabase(db);
    });
  });
}

function isSystemInitialized() {
  return systemInitialized;
}
function updateValue() {
  const k = statuses;
  return k;
}

module.exports = {
  setupLoop,
  broadcastData,
  readData,
  processData,
  updateValue,
  isSystemInitialized,
  childAddresses,
  statusBroadcasted,
  readingFinished,
  statusProcessed,
  statuses,
  getTemplate,
};
