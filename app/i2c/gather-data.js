const async = require('async');
const i2c = require('i2c-bus');
const MongoClient = require('mongodb').MongoClient;
const _ = require('lodash');

let childAddresses = [5];
let statusBroadcasted;
let readingFinished;
let systemInitialized;
let db;
let i2c1;

const url = 'mongodb://localhost:27017/mydb';
const replyDatalog = 33;
const replyNoDatalog = 3;

// Broadcasts data to all children
function broadcastData2(statusMessageBuffer, cb) {

  if (!_.isArrayLike(statusMessageBuffer) || !_.isFunction(cb)) {
    throw new Error('broadcastData called with invalid args');
  }

  i2c1.i2cWrite(0, statusMessageBuffer.byteLength, statusMessageBuffer, (err, bytesWritten, buffer) => {

    if (err) {
      return cb(err);
    }

    if (bytesWritten !== buffer.length) {
      return cb(new Error('i2cWrite failed - bytesWritten !== buffer.length'));
    }

    if (statusMessageBuffer[3]) {
      //TODO: won't work. needs to be refactored.
      //main.logRequestSent = true;
      console.log('3 status broadcasted');
    }

    return cb();

  });

}

// Broadcasts data to all children
function broadcastData(statusMessageBuffer, done) {

  async.eachOfSeries(childAddresses, (item, key, cb) => {

    async.retryable(
      { times: 5, interval: 5 },
      i2c1.i2cWrite(item, statusMessageBuffer.byteLength, statusMessageBuffer, (err) => {

        if (err) {
          console.log(childAddresses);
          console.log('i2c_error_write');
        }

        return cb(err);

      })
    );

  }, (err) => {

    if (err) {
      console.log(err);
    }

    return done(err);

  });

}

// Reads data obtained from all children
function readData(options, cb) {

  if (!_.isFunction(cb)) {
    throw new Error('readData called with invalid args');
  }

  const slaveData = [];

  let readLength;

  if (!options.dataloggingInfo) {
    readLength = replyNoDatalog;
  } else { //update to be based on board heater number
    readLength = replyDatalog;
  } // same

  async.eachOfSeries(childAddresses, (item, key, cb) => {

    const readBuff = Buffer.alloc(readLength);

    i2c1.i2cRead(item, readLength, readBuff, (err, bytesRead, buffer) => {

      if (err) {
        return cb(err);
      }

      if (bytesRead !== readLength) {
        return cb(new Error('i2cRead failed - bytesRead !== readLength'));
      }

      slaveData[key] = buffer;

      return cb();

    });

  }, (err) => {

    if (err) {
      console.log('4 finished failed reading');
    } else {
      console.log('4 finished reading successfully');
    }

    return cb(err, slaveData);

  });
}

function getInitialHeaterStatus() {
  return {
    lmpTemps: [],
    heaterCycleRunning: false,
    heaterAtSetpoint: false,
    heaterAtRelease: false,
    heaterCycleComplete: false,
    heaterFaulted: false,
    cycleDatalogged: false,
  };
}

// Processes data from all children. Includes datalogging to Mongodb
function processData(slaveData, cb) {

  if (!_.isArray(slaveData) || !_.isFunction(cb)) {
    throw new Error('processData called with invalid args');
  }

  const statusValues = [];

  for (let i = 0, l = slaveData.length; i < l; i += 1) {

    const heaterStatus = getInitialHeaterStatus();
    const statusByte = slaveData[i].readInt8(0);

    /* eslint-disable no-bitwise */
    if ((statusByte & 1) === 1) {
      heaterStatus.heaterCycleRunning = true;
    }
    if ((statusByte & 2) === 2) {
      heaterStatus.heaterAtSetpoint = true;
    }
    if ((statusByte & 4) === 4) {
      heaterStatus.heaterAtRelease = true;
    }
    if ((statusByte & 8) === 8) {
      heaterStatus.heaterCycleComplete = true;
    }
    if ((statusByte & 16) === 16) {
      heaterStatus.heaterFaulted = true;
    }
    if ((statusByte & 32) === 32) {
      heaterStatus.cycleDatalogged = true;
    }
    /* eslint-enable no-bitwise */

    for (let j = 0; j < 4; j += 4) {
      heaterStatus.lmpTemps[j] = slaveData[i].readInt16BE(1) / 10;
    }

    statusValues[i] = heaterStatus;
    console.log(`statuses[${i}]=${heaterStatus}`);

  }

  console.log('5 data processing done');

  return cb(null, statusValues);

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

module.exports = {
  setupLoop,
  broadcastData,
  readData,
  processData,
  isSystemInitialized,
  childAddresses,
  statusBroadcasted,
  readingFinished,
  getTemplate,
  getInitialHeaterStatus,
};
