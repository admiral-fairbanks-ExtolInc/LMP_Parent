const express = require('express');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const NanoTimer = require('nanotimer');
const app = express();
const async = require('async')
const i2c = require('i2c-bus')
const moment = require('moment')
var url = 'mongodb://localhost:27017/mydb';
var db, db_created;
var count = 10, x_var = 0;
var MongoPromise = MongoClient.connect(url);
var Data_Collection_Timer = new NanoTimer;
var i2c1;
var Child_Addresses = [1, 2, 3, 4, 5],
Start_Signal = false, Stop_Signal = false, Flt_Reset_Signal = false, Full_Stroke_Signal = false,
Cooling_Air_On_Signal = false, Temp_Info = true, Datalogging_Info = false, Address_Req = 0,
Num_Heaters = 1;
var Heater_Map = {
  Heater_Number = 1,
  LMP_Type = 0,
  Controller_Number = 1
};
var Heater_Status = {
  Heater_Cycle_Running: false,
  Heater_At_Setpoint: false,
  Heater_At_Release: false,
  Heater_Cycle_Complete: false,
  Heater_Faulted: false
},
var data_to_be_logged = {
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

MongoPromise.then( function(database) {
  db = database;
  db_created = true;
  app.listen(3000, () => {
    console.log('listening on 3000');
  });
  Data_Collection_Timer.setInterval(send_to_database, '', '1s');
}).catch(function (err) {return console.log(err);});

function populate_database(){
  var index = 0;
  MongoClient.connect(url, function(err, db) {
    if (err) console.log(err);
    db.collection('Heater_Database').insertOne({
      Heater_Id: Heater_Map,
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

    });
  };
}

function send_to_database(){
    x_var++;
    count--;
    if (count <= 0) count = 10;
    MongoClient.connect(url, function(err, db) {
      if (err) console.log(err);
      var myquery = { _id: "Temp_Info" };
      var newvalues = { time: x_var, heater_1: count };
      db.collection('temp_values').update(
        {_id: "Temp_Info"},
        { $push: {time: x_var,heater_1: count}},
        function(err, res) {
        if (err) console.log(err);
        db.close();
      });
    });
}

function print_results () {
  req.db;
}

function cb(err, res) {
  if (err) {console.log(err);}
}

function exchange_data () {
  async.series([
    (cb(err, res)) => {
      i2c1 = i2c.open(1, (err) => { // Opens I2C Channel
        if (err) {console.log(err);}
      });
    },
    (cb(err, res)) => {
      var status_message_buffer = new Buffer([0, 0, 0, Start_Signal, Stop_Signal, Flt_Reset_Signal, Full_Stroke_Signal,
      Full_Stroke_Signal, Cooling_Air_On_Signal]); // Used to communicate necessary signals to child boards

      i2c1.i2cWrite(0, status_message_buffer.byteLength, status_message_buffer,
      (err, bytesWritten, buffer) => {
        if (err) {console.log(err);}
        else if (bytesWritten !== status_message_buffer.byteLength){
          console.log("Bytes written does not match expected amount.")}
      });
    },
    (cb(err, res)) => {
      var i = 0;
      var request_message_buffer = new Buffer([Temp_Info, Datalogging_Info]);
      // Enter one shot mode (this is a non volatile setting)
      i2c1.i2cWrite(Child_Addresses[i], request_message_buffer.byteLength, request_message_buffer,
        (err, bytesWritten, buffer) => {
          if (err) {console.log(err);}
          else if (bytesWritten !== status_message_buffer.byteLength){
            console.log("Bytes written does not match expected amount.")}
      });
    },
    (cb(err, res)) => {
      // Wait while non volatile memory busy
      var read_length;
      if (Temp_Info === false && Datalogging_Info === false) {read_length = 1;}
      else if (Temp_Info === true && Datalogging_Info === false) {read_length = 3;}
      else if (Datalogging_Info === true) {read_length = 10;}
      i2c1.read(Child_Addresses[i], read_length, recieved_message,
        (err, bytesRead, recieved_message) => {
          if (err) {console.log(err);}
          else if (bytesRead !== read_length){
            console.log("Bytes written does not match expected amount.")
          }
          Status_Byte = recieved_message.readInt8(0);
          if ((Status_Byte & 1) === 1) {Heater_Status.Heater_Cycle_Running;}
          if ((Status_Byte & 2) === 2) {Heater_Status.Heater_At_Setpoint;}
          if ((Status_Byte & 4) === 4) {Heater_Status.Heater_At_Release;}
          if ((Status_Byte & 8) === 8) {Heater_Status.Heater_Cycle_Complete;}
          if ((Status_Byte & 16) === 16) {Heater_Status.Heater_Faulted;}
          if (Temp_Info === true) {Heater_Temp = recieved_message.readInt16BE(1)/10;}
          if (Datalogging_Info === true){
            data_to_be_logged.Timestamp_Id = moment().format('MMMM Do YYYY, h:mm:ss a');

            data_to_be_logged.Start_Data.Start_Time = recieved_message.readInt16BE(3)/10;
            data_to_be_logged.Start_Data.Start_Temp = recieved_message.readInt16BE(5)/10;
            data_to_be_logged.Start_Data.Start_Pos = recieved_message.readInt16BE(7)/10;

            data_to_be_logged.At_Setpoint_Data.At_Setpoint_Time = recieved_message.readInt16BE(9)/10;
            data_to_be_logged.At_Setpoint_Data.At_Setpoint_Temp = recieved_message.readInt16BE(11)/10;
            data_to_be_logged.At_Setpoint_Data.At_Setpoint_Pos = recieved_message.readInt16BE(13)/10;

            data_to_be_logged.Contact_Dip_Data.Contact_Dip_Time = recieved_message.readInt16BE(15)/10;
            data_to_be_logged.Contact_Dip_Data.Contact_Dip_Temp = recieved_message.readInt16BE(17)/10;
            data_to_be_logged.Contact_Dip_Data.Contact_Dip_Pos = recieved_message.readInt16BE(19)/10;

            data_to_be_logged.Shutoff_Data.Shutoff_Time = recieved_message.readInt16BE(21)/10;
            data_to_be_logged.Shutoff_Data.Shutoff_Temp = recieved_message.readInt16BE(23)/10;
            data_to_be_logged.Shutoff_Data.Shutoff_Pos = recieved_message.readInt16BE(25)/10;

            data_to_be_logged.Cycle_Complete_Data.Cycle_Complete_Time = recieved_message.readInt16BE(27)/10;
            data_to_be_logged.Cycle_Complete_Data.Cycle_Complete_Temp = recieved_message.readInt16BE(29)/10;
            data_to_be_logged.Cycle_Complete_Data.Cycle_Complete_Pos = recieved_message.readInt16BE(31)/10;
          }
      });
    },
    (cb(err, res)) => {
      MongoClient.connect(url, (err, db) => {
        if (err) console.log(err);
        db.collection('Heater_Database').update(
          {Heater_Id: Heater_Map},
          { $push: {Data_Log: data_to_be_logged}},
          (err, res) => {
          if (err) console.log(err);
          db.close();
        });
      });
    }],
    (err) => {
    if (err) console.log(err);
    });
}();
