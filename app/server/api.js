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
  releaseTemp: 125,
  maxHeaterOnTime: 30,
  dwellTime: 0,
};
const url = "mongodb://localhost:27017/mydb";
const heaterHiLim = 1000;
let count = 0;
let childStatuses;

co(function*() {
  var db = yield MongoClient.connect(url);
  var doc = yield db.collection('heaterRecords')
    .find({ // This is looking to see if the settings document already exists
      $and: [{ "docID.heaterNumber": 1 },
        { "docID.docType": "settings" }] 
    }).limit(1).toArray();
  if (!doc[0]) { // if settings document doesn't exist, create it 
    const doc = {
      docID: {
        timestampID: new Date(),
        heaterNumber: 1,
        docType: 'settings'
      },
      settings: {
        meltTemp: 550,
        releaseTemp: 125,
        dwellTime: 0,
        maxHeaterOnTime: 30,
        rtdCalibrated: 0
      }
    };
    const r = yield db.collection('heaterRecords').insertOne(doc);
    assert.equal(1, r.insertedCount);
    db.close();
  }
  else {
    childSettings.meltTemp = doc[0].settings.meltTemp;
    childSettings.releaseTemp = doc[0].settings.releaseTemp;
    childSettings.maxHeaterOnTime = doc[0].settings.maxHeaterOnTime;
    childSettings.dwellTime = doc[0].settings.dwellTime;
    console.log(childSettings);
    db.close();
  }
}).catch((err) => {
  console.log(err);
});

const i2cTmr = setInterval(function() {
  i2c.i2cIntervalTask(childSettings); }, 200);

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
  let cycleRunning =  i2c.getRunningStatus();
  if (cycleRunning) return res.json({results: 'Unsuccessful'});
  if (change.title === 'Heater Melt Temp Setpoint') {
    let proposedSetting = parseInt(change.value);
    if (proposedSetting <= heaterHiLim && proposedSetting >= 250) {
      childSettings.meltTemp = proposedSetting;
      co(function*() { // This function deals with updating the settings document
        var db = yield MongoClient.connect(url);
        var doc = yield db.collection('heaterRecords')
          .update({
            $and: [{ "docID.heaterNumber": 1 },
              { "docID.docType": "settings" }] 
          }, { $set: {"settings.meltTemp": proposedSetting} })
        console.log(doc);
        res.json({results: 'Success'});
      }).catch((err) => {
        console.log(err);
      });
    }
    else res.json({results: 'New Setpoint Outside of Allowable Range'});
  }
  else if (change.title === 'Heater Release Temp Setpoint') {
    let proposedSetting = parseInt(change.value);
    if (proposedSetting <= heaterHiLim && proposedSetting >= 100 && 
      proposedSetting <= childSettings.meltTemp) {
      childSettings.releaseTemp = proposedSetting;
      co(function*() { // This function deals with updating the settings document
        var db = yield MongoClient.connect(url);
        var doc = yield db.collection('heaterRecords')
          .update({
            $and: [{ "docID.heaterNumber": 1 },
              { "docID.docType": "settings" }] 
          }, { $set: {"settings.releaseTemp": proposedSetting} })
        console.log(doc);
        res.json({results: 'Success'});
      }).catch((err) => {
        console.log(err);
      });
    }
    else res.json({results: 'New Setpoint Outside of Allowable Range'});
  }
  else if (change.title === 'Heater Maximum On Time') {
    let proposedSetting = parseInt(change.value);
    if (proposedSetting <= 30 && proposedSetting >= 15) {
      childSettings.maxHeaterOnTime = proposedSetting;
      co(function*() { // This function deals with updating the settings document
        var db = yield MongoClient.connect(url);
        var doc = yield db.collection('heaterRecords')
          .update({
            $and: [{ "docID.heaterNumber": 1 },
              { "docID.docType": "settings" }] 
          }, { $set: {"settings.maxHeaterOnTime": proposedSetting} })
        console.log(doc);
        res.json({results: 'Success'});
      }).catch((err) => {
        console.log(err);
      });
    }
    else res.json({results: 'New Setpoint Outside of Allowable Range'});
  }
  else if (change.title === 'Heater Dwell Time') {
    let proposedSetting = parseInt(parseFloat(change.value)*10);
    if (proposedSetting <= 15 && proposedSetting >= 0 && 
      proposedSetting < childSettings.maxHeaterOnTime) {
      childSettings.dwellTime = proposedSetting;
      co(function*() { // This function deals with updating the settings document
        var db = yield MongoClient.connect(url);
        var doc = yield db.collection('heaterRecords')
          .update({
            $and: [{ "docID.heaterNumber": 1 },
              { "docID.docType": "settings" }] 
          }, { $set: {"settings.dwellTime": proposedSetting} })
        console.log(doc);
        res.json({results: 'Success'});
      }).catch((err) => {
        console.log(err);
      });
    }
    else res.json({results: 'New Setpoint Outside of Allowable Range'});
  }
  else res.json({results: 'Invalid Settings Change'})
});

app.post('/server/calibrateRtd', (req, res) => {
  if (!req.body) return res.sendStatus(400);
  let cycleRunning =  i2c.getRunningStatus();
  if (cycleRunning) return res.json({results: 'Unsuccessful'});
  let change = req.body;
  if (change.title === 'Calibrate RTD') {
    childSettings.calibrateRtd = true;
    co(function*() { // This function deals with updating the settings document
      var db = yield MongoClient.connect(url);
      var doc = yield db.collection('heaterRecords')
        .update({
          $and: [{ "docID.heaterNumber": 1 },
            { "docID.docType": "settings" }] 
        }, { $set: {"settings.rtdCalibrated": 1} })
      console.log(doc);
      i2c.engageRtdCalibration();
      res.json({results: 'Success'});
    }).catch((err) => {
      console.log(err);
    });
  }
  else res.json({results: 'Calibration Failed'});
});

app.get('/server/getLastCycle', (req, res) => {
  if (!req.body) return res.sendStatus(400);
  co(function*() {
    var db = yield MongoClient.connect(url);
    var doc = yield db.collection('heaterRecords')
      .find({
        $and: [{ "docID.heaterNumber": 1 },
          { "docID.docType": "datalog" }]
      }) 
      .sort({"docID.timestampID":-1}).limit(1)
      .toArray();
    db.close();
    res.json(doc[0]);
  });
});

(err, results) => {
  if (err) res.json({results: 'Failure to find requested data'});
  else res.json(results);
}