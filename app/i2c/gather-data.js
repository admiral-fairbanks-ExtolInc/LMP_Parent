'use strict';

const Promise = require("bluebird");
const MongoClient = Promise.promisifyAll(require('mongodb').MongoClient);
const NanoTimer = require('nanotimer');
const async = require('async');
//const i2c = Promise.promisifyAllrequire('i2c-bus');
const i2c = require('i2c-bus');
const moment = require('moment');
const co = require('co');
const main = require('../main/main');

const url = 'mongodb://localhost:27017/mydb';
const db, db_created;
const count = 10, x_var = 0;
const MongoPromise = MongoClient.connect(url);
const dataCollectionTimer = new NanoTimer;

//let childAddresses;
let  startSignal = false, stopSignal = false, fltResetSignal = false, fullStrokeSignal = false,
  coolingAirOnSignal = false, datalogIndex = 0, targetHeater = 0,
  addressReq = 0, numHeaters = 1, statusBroadcasted = false, statusProcessed = true,
  Reading_In_Progress = false, readingFinished = false;

const heaterMap = {
  heaterNumber: 1,
  lmpType: 0,
  controllerNumber: 1
};

const inividualData = {
  timestampId: moment().format('MMMM Do YYYY, h:mm:ss a'),
  startData: {
    time: 0,
    temp: 0,
    pos: 0
  },
  atSetPointData: {
    time: 0,
    temp: 0,
    pos: 0
  },
  contactDipData: {
    time: 0,
    temp: 0,
    pos: 0,
  },
  shutoffData: {
    time: 0,
    temp: 0,
    pos: 0
  },
  cycleCompleteData: {
    time: 0,
    temp: 0,
    pos: 0
  }
};


//Function Declarations
//Creates datalog Template
function getTemplate(index, htr_num, htr_type, address) {
  
  return {
    heaterId: {
      heaterNumber : (htr_num + index),
      lmpType : htr_type,
      controllerNumber : index,
      heaterI2CAddress : address
    },
    dataLog: {
        timestampId: moment().format('MMMM Do YYYY, h:mm:ss a'),
        startData: {
          time: 0,
          temp: 0,
          pos: 0
        },
        atSetPointData: {
          time: 0,
          temp: 0,
          pos: 0
        },
        contactDipData: {
          time: 0,
          temp: 0,
          pos: 0,
        },
        shutoffData: {
          time: 0,
          temp: 0,
          pos: 0
        },
        cycleCompleteData: {
          time: 0,
          temp: 0,
          pos: 0
        }
      }
    }
}

//Populates Database with blank datalog
function populateDatabase(){
  
  let heatersMapped = false;
  
  i2c.scan((err, devices) => {
    
    if (!err) {
  
      const heaterTypes = [devices.length];
      async.series([
          i2c.sendByte(0, 1, function(err) {
            if (err) {console.log(err);}
          }),
          async.eachOfSeries(devices, function(item, key, cb) {
            i2c.read(item, 4, (err, bytesRead, message) => {
              heaterTypes[key] = message;
            })
          })
      ],
        (err, res) => {
          if (!err) {
            for(var ind = 0; ind < devices.length; ind++){
              db.collection('heaterDatabase').insertMany([
                getTemplate(ind, 1, heaterTypes[ind][0], devices[ind]),
                getTemplate(ind, 2, heaterTypes[ind][1], devices[ind]),
                getTemplate(ind, 3, heaterTypes[ind][2], devices[ind]),
                getTemplate(ind, 4, heaterTypes[ind][3], devices[ind])
              ]);
            }
  
            heatersMapped = true;
            
          } else {
            console.log(err);
          }
        }
      );
      
    } else {
      console.log(err);
    }
    
  });
  
  return heatersMapped;
}

//Boilerplate callback
function cb(err, res) {
  if (err) {console.log(err);}
}

// Data Exchange Generator Function
var exchange = {
  //Broadcasts data to all children
  broadcastData: (status_message_buffer) => {

    i2c.i2cWrite(0, status_message_buffer.byteLength, status_message_buffer)
    .then((err, bytesWritten, buffer) => {
      if (err) {console.log(err);}
      else if (bytesWritten !== status_message_buffer.byteLength){
        console.log("Bytes written does not match expected amount.")
      }
      if (main.Datalogging_Info) Log_Request_Sent = true;
    });
  },
  //Reads data obtained from all children
  readData: (storage_dest) => {
    var read_length, target_child = 0;

    if (main.Temp_Info === false && main.Datalogging_Info === false) read_length = 1;
    else if (main.Temp_Info === true && main.Datalogging_Info === false) read_length = 9;
    else if (main.Datalogging_Info === true) read_length = 129;

    i2c.i2cRead(target_child, read_length, storage_dest)
    .then((err, bytesRead, recieved_message) => {
      if (err) {console.log(err);}
      else if (bytesRead !== read_length){
        console.log("Bytes written does not match expected amount.")
      }
      storage_dest[target_child] = recieved_message;
      target_child++;
      if (target_child >= storage_dest.length) return;

    };)
    .then(Read_Data (storage_dest));
  },
  //Processes data from all children. Includes datalogging to Mongodb
  processData: (data, status_storage) => {
    var datalog_index = 0, Overall_Status[data.length],
    Heater_Status = {
      LMP_Temps: [0.0, 0.0, 0.0, 0.0],
      Heater_Cycle_Running: false,
      Heater_At_Setpoint: false,
      Heater_At_Release: false,
      Heater_Cycle_Complete: false,
      Heater_Faulted: false,
      Cycle_Data_Logged: false
    };

    if(!statusProcessed) {
      for (var i = 0; i < data.length; i++) {
        Status_Byte = data[i].readInt8(0);
        if ((Status_Byte & 1) === 1) {Heater_Status.Heater_Cycle_Running;}
        if ((Status_Byte & 2) === 2) {Heater_Status.Heater_At_Setpoint;}
        if ((Status_Byte & 4) === 4) {Heater_Status.Heater_At_Release;}
        if ((Status_Byte & 8) === 8) {Heater_Status.Heater_Cycle_Complete;}
        if ((Status_Byte & 16) === 16) {Heater_Status.Heater_Faulted;}
        if ((Status_Byte & 32) === 32) {Heater_Status.Cycle_Data_Logged;}
        for(var j = 0; j < 4; j++) {
          Heater_Status.LMP_Temps[j] = data[i].readInt16BE(1)/10;
        }
        Overall_Status[i] = Heater_Status;
      }
      statusProcessed = true;
      status_storage = Overall_Status;
    }

    if (main.Datalogging_Info === true){
      var data_to_be_logged;

      inividualData.timestampId = moment().format('MMMM Do YYYY, h:mm:ss a');

      inividualData.startData.time = data[datalog_index].readInt16BE(9 + 30*targetHeater)/100;
      inividualData.startData.temp = data[datalog_index].readInt16BE(11 + 30*targetHeater)/10;
      inividualData.startData.pos = data[datalog_index].readInt16BE(13 + 30*targetHeater)/100;

      inividualData.atSetPointData.time = data[datalog_index].readInt16BE(15 + 30*targetHeater)/100;
      inividualData.atSetPointData.temp = data[datalog_index].readInt16BE(17 + 30*targetHeater)/10;
      inividualData.atSetPointData.pos = data[datalog_index].readInt16BE(19 + 30*targetHeater)/100;

      inividualData.contactDipData.time = data[datalog_index].readInt16BE(21 + 30*targetHeater)/100;
      inividualData.contactDipData.temp = data[datalog_index].readInt16BE(23 + 30*targetHeater)/10;
      inividualData.contactDipData.pos = data[datalog_index].readInt16BE(25 + 30*targetHeater)/100;

      inividualData.shutoffData.time = data[datalog_index].readInt16BE(27 + 30*targetHeater)/100;
      inividualData.shutoffData.temp = data[datalog_index].readInt16BE(29 + 30*targetHeater)/10;
      inividualData.shutoffData.pos = data[datalog_index].readInt16BE(31 + 30*targetHeater)/100;

      inividualData.cycleCompleteData.time = data[datalog_index].readInt16BE(33 + 30*targetHeater)/100;
      inividualData.cycleCompleteData.temp = data[datalog_index].readInt16BE(35 + 30*targetHeater)/10;
      inividualData.cycleCompleteData.pos = data[datalog_index].readInt16BE(37 + 30*targetHeater)/100;

      db.collection('Heater_Database').update(
      {heaterId: {
        heaterNumber: 1 + datalog_index + targetHeater
      }},
      { $push: {dataLog: individual_data}})
      .then((err, res) => {
        if (err) console.log(err);
        if (err) console.log(err);

        targetHeater++;
        if (targetHeater >= 4) {
          targetHeater = 0;
          datalog_index++;
        }
        if (datalog_index >= data.length) {
          datalog_index = 0;
          statusProcessed = false;
          return;
        }
      })
      .then(Process_Data(data))
    }
  }
}


//End Function Declarations

exports.getTemplate = getTemplate;
exports.populateDatabase = populateDatabase;
exports.sendToDatabase = sendToDatabase;
exports.printResults = printResults;
exports.cb = cb;
exports.exchangeData = exchangeData;

module.exports = {
  childAddresses: childAddresses,
  statusBroadcasted: statusBroadcasted,
  readingFinished: readingFinished,
  statusProcessed: statusProcessed,
  dataloggingInProcess: dataloggingInProcess
}
