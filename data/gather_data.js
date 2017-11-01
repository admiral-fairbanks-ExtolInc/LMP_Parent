const Promise = require("bluebird");
const express = require('express');
const MongoClient = Promise.promisifyAll(require('mongodb').MongoClient);
const NanoTimer = require('nanotimer');
const app = express();
const async = require('async');
const i2c = Promise.promisifyAllrequire('i2c-bus');
const moment = require('moment');
const co = require('co');
const main = require('../main/main');
var url = 'mongodb://localhost:27017/mydb';
var db, db_created;
var count = 10, x_var = 0;
var MongoPromise = MongoClient.connect(url);
var Data_Collection_Timer = new NanoTimer;
var i2c1;
var Child_Addresses,
Start_Signal = false, Stop_Signal = false, Flt_Reset_Signal = false, Full_Stroke_Signal = false,
Cooling_Air_On_Signal = false, Heaters_Mapped = false, datalog_index = 0, target_heater = 0,
Address_Req = 0, Num_Heaters = 1, Status_Broadcasted = false, Status_Processed = true,
Reading_In_Progress = false, Reading_Finished;
var Heater_Map = {
  Heater_Number = 1,
  LMP_Type = 0,
  Controller_Number = 1
};
'[]'
var inividual_data = {
  Timestamp_Id: moment().format('MMMM Do YYYY, h:mm:ss a'),
  Start_Data: {
    Start_Time: 0,
    Start_Temp: 0,
    Start_Pos: 0
  },
  At_Setpoint_Data: {
    At_Setpoint_Time: 0,
    At_Setpoint_Temp: 0,
    At_Setpoint_Pos: 0
  },
  Contact_Dip_Data: {
    Contact_Dip_Time: 0,
    Contact_Dip_Temp: 0,
    Contact_Dip_Pos: 0,
  },
  Shutoff_Data: {
    Shutoff_Time: 0,
    Shutoff_Temp: 0,
    Shutoff_Pos: 0
  },
  Cycle_Complete_Data: {
    Cycle_Complete_Time: 0,
    Cycle_Complete_Temp: 0,
    Cycle_Complete_Pos: 0
  }
};


//Function Declarations
//Creates datalog Template
function Template_Get(index, htr_num, htr_type, address) {
  var Heater_Template = {
    Heater_Id: {
      Heater_Number : (htr_num + index),
      LMP_Type : htr_type,
      Controller_Number : index,
      Heater_I2C_Address : address
    },
    Data_Log: {
      {
        Timestamp_Id: moment().format('MMMM Do YYYY, h:mm:ss a'),
        Start_Data: {
          Start_Time: 0,
          Start_Temp: 0,
          Start_Pos: 0
        },
        At_Setpoint_Data: {
          At_Setpoint_Time: 0,
          At_Setpoint_Temp: 0,
          At_Setpoint_Pos: 0
        },
        Contact_Dip_Data: {
          Contact_Dip_Time: 0,
          Contact_Dip_Temp: 0,
          Contact_Dip_Pos: 0,
        },
        Shutoff_Data: {
          Shutoff_Time: 0,
          Shutoff_Temp: 0,
          Shutoff_Pos: 0
        },
        Cycle_Complete_Data: {
          Cycle_Complete_Time: 0,
          Cycle_Complete_Temp: 0,
          Cycle_Complete_Pos: 0
        }
      }
    }
  };
  return Heater_Template;
}

//Populates Database with blank datalog
function populate_database(){

  i2c1.scan((err, devices) => {
    if (err) console.log(err);
    Child_Addresses = devices;
    var heater_types[Child_Addresses.length];
    async.series([
      i2c1.sendByte(0, 1, (err) => {
        if (err) {console.log(err);}
      }),
      async.eachOfSeries(Child_Addresses, (item, key, cb) {
        i2c1.read(item, 4, (err, bytesRead, recieved_message) => {
          heater_types[key] = recieved_message;
        });
      }),
      (err, cb) {
        if (err) console.log(err);
        for(var ind = 0; ind < Child_Addresses.length; ind++){
          db.collection('Heater_Database').insertMany([
            Template_Get(ind, 1, heater_types[ind][0], Child_Addresses[ind]),
            Template_Get(ind, 2, heater_types[ind][1], Child_Addresses[ind]),
            Template_Get(ind, 3, heater_types[ind][2], Child_Addresses[ind]),
            Template_Get(ind, 4, heater_types[ind][3], Child_Addresses[ind])
          ]);
        }
      }
    ],
    (err, res) => {
      if (err) console.log(err);
      Heaters_Mapped = true;
    });
  });
}

//Boilerplate callback
function cb(err, res) {
  if (err) {console.log(err);}
}








// Data Exchange Generator Function
var exchange = {
  //Broadcasts data to all children
  Broadcast_Data: (status_message_buffer) => {

    i2c1.i2cWrite(0, status_message_buffer.byteLength, status_message_buffer)
    .then((err, bytesWritten, buffer) => {
      if (err) {console.log(err);}
      else if (bytesWritten !== status_message_buffer.byteLength){
        console.log("Bytes written does not match expected amount.")
      }
      if (main.Datalogging_Info) Log_Request_Sent = true;
    });
  },
  //Reads data obtained from all children
  Read_Data: (storage_dest) => {
    var read_length, target_child = 0;

    if (main.Temp_Info === false && main.Datalogging_Info === false) read_length = 1;
    else if (main.Temp_Info === true && main.Datalogging_Info === false) read_length = 9;
    else if (main.Datalogging_Info === true) read_length = 129;

    i2c1.i2cRead(target_child, read_length, storage_dest)
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
  Process_Data: (data, status_storage) => {
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

    if(!Status_Processed) {
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
      Status_Processed = true;
      status_storage = Overall_Status;
    }

    if (main.Datalogging_Info === true){
      var data_to_be_logged;

      inividual_data.Timestamp_Id = moment().format('MMMM Do YYYY, h:mm:ss a');

      inividual_data.Start_Data.Start_Time = data[datalog_index].readInt16BE(9 + 30*target_heater)/100;
      inividual_data.Start_Data.Start_Temp = data[datalog_index].readInt16BE(11 + 30*target_heater)/10;
      inividual_data.Start_Data.Start_Pos = data[datalog_index].readInt16BE(13 + 30*target_heater)/100;

      inividual_data.At_Setpoint_Data.At_Setpoint_Time = data[datalog_index].readInt16BE(15 + 30*target_heater)/100;
      inividual_data.At_Setpoint_Data.At_Setpoint_Temp = data[datalog_index].readInt16BE(17 + 30*target_heater)/10;
      inividual_data.At_Setpoint_Data.At_Setpoint_Pos = data[datalog_index].readInt16BE(19 + 30*target_heater)/100;

      inividual_data.Contact_Dip_Data.Contact_Dip_Time = data[datalog_index].readInt16BE(21 + 30*target_heater)/100;
      inividual_data.Contact_Dip_Data.Contact_Dip_Temp = data[datalog_index].readInt16BE(23 + 30*target_heater)/10;
      inividual_data.Contact_Dip_Data.Contact_Dip_Pos = data[datalog_index].readInt16BE(25 + 30*target_heater)/100;

      inividual_data.Shutoff_Data.Shutoff_Time = data[datalog_index].readInt16BE(27 + 30*target_heater)/100;
      inividual_data.Shutoff_Data.Shutoff_Temp = data[datalog_index].readInt16BE(29 + 30*target_heater)/10;
      inividual_data.Shutoff_Data.Shutoff_Pos = data[datalog_index].readInt16BE(31 + 30*target_heater)/100;

      inividual_data.Cycle_Complete_Data.Cycle_Complete_Time = data[datalog_index].readInt16BE(33 + 30*target_heater)/100;
      inividual_data.Cycle_Complete_Data.Cycle_Complete_Temp = data[datalog_index].readInt16BE(35 + 30*target_heater)/10;
      inividual_data.Cycle_Complete_Data.Cycle_Complete_Pos = data[datalog_index].readInt16BE(37 + 30*target_heater)/100;

      db.collection('Heater_Database').update(
      {Heater_Id: {
        Heater_Number: 1 + datalog_index + target_heater
      }},
      { $push: {Data_Log: individual_data}})
      .then((err, res) => {
        if (err) console.log(err);
        if (err) console.log(err);

        target_heater++;
        if (target_heater >= 4) {
          target_heater = 0;
          datalog_index++;
        }
        if (datalog_index >= data.length) {
          datalog_index = 0;
          Status_Processed = false;
          return;
        }
      })
      .then(Process_Data(data))
    }
  }
}




//End Function Declarations

exports.Template_Get = Template_Get;
exports.populate_database = populate_database;
exports.send_to_database = send_to_database;
exports.print_results = print_results;
exports.cb = cb;
exports.exchange_data = exchange_data;
module.exports = {
  Child_Addresses,
  Status_Broadcasted,
  Reading_Finished,
  Status_Processed,
  Datalogging_In_Process
}
