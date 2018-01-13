'use strict';

const i2c = require('../i2c/i2cRoutine.js');
const express = require('express');
const moment = require('moment');
const bodyParser = require('body-parser');
const NanoTimer = require('nanotimer');
const exec = require('child_process').exec;
const app = express();
const Gpio = require('onoff').Gpio;
const MongoClient = require('mongodb').MongoClient;
const co = require('co');
const assert = require('assert');
const enableSigPin = new Gpio(4, 'in', 'both');
const startSigPin = new Gpio(5, 'in', 'both');
const stopSigPin = new Gpio(6, 'in', 'both');
const fullStrokePin = new Gpio(12, 'in', 'both');
const childSettings = {
  meltTemp: 550,
  releaseTemp: 120,
  maxHeaterOnTime: 30,
  dwellTime: 0,
};
const url = "mongodb://localhost:27017/mydb";

let count = 0;
let childStatuses;

const i2cTmr = setInterval(function() {
  i2c.i2cIntervalTask(childSettings); }, 750);

enableSigPin.watch(i2c.enableSigPinWatch);
startSigPin.watch(i2c.startSigPinWatch);
stopSigPin.watch(i2c.stopSigPinWatch);
fullStrokePin.watch(i2c.FSSigPinWatch);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.listen(3001, () => {
  console.log("Listening on 3001!");
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));
}

app.get('/server/tempInfo', (req, res) => {
  childStatuses = i2c.getChildInfo();
  let packet = {
    temp: childStatuses[0].lmpTemps[0]
  };
  res.json(packet);
});

app.post('/server/updateSetpoint', (req, res) => {
  if (!req.body) return res.sendStatus(400);
  let change = req.body;
  let success;
  if (change.title === 'Heater Melt Temp Setpoint') {
    childSettings.meltTemp = parseInt(change.value);
    res.json({results: 'Success'});
  }
  else if (change.title === 'Heater Release Temp Setpoint') {
    childSettings.releaseTemp = parseInt(change.value);
    res.json({results: 'Success'});
  }
  else if (change.title === 'Heater Maximum On Time') {
    childSettings.maxHeaterOnTime = parseInt(change.value);
    res.json({results: 'Success'});
  }
  else if (change.title === 'Heater Dwell Time') {
    childSettings.dwellTime = parseInt(change.value);
    res.json({results: 'Success'});
  }
  else res.json({results: 'Invalid Settings Change'})

});

app.post('/server/calibrateRtd', (req, res) => {
  if (!req.body) return res.sendStatus(400);
  let change = req.body;
  let success;
  if (change.title === 'Calibrate RTD') {
    childSettings.calibrateRtd = true;
    res.json({results: 'Success'});
    i2c.engageRtdCalibration();
  }
  else res.json({results: 'Calibration Failed'});
});

app.post('/server/getLastCycle', (req, res) => {
  console.log("history request recieved");
  if (!req.body) return res.sendStatus(400);
  co(function*() {
    var db = yield MongoClient.connect(url);
    console.log("querying database");
    var coll = db.collection('heaterRecords');
    var doc = coll.find({ "heaterID.heaterNumber": 1 })
      .sort({"heaterID.timestampID":-1}).limit(1);
    console.log(doc);
    res.json(info);
  })
});

(err, results) => {
  if (err) res.json({results: 'Failure to find requested data'});
  else res.json(results);
}