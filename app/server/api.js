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
const toBeUpdated = {
  targetHeater: -1,
  heaterAddress: 0,
  heaterPosn: 0,
  settingToUpdate: 0,
  settingValue: 0,
}
const url = "mongodb://127.0.0.1:27017/mydb";
const heaterHiLim = 1000;
let count = 0;
let childStatuses;

co(function*() {
  let heaterAddresses = getHeaterAddresses();
  let totalNumHeaters = heaterAddresses.numHeaters.reduce((a, b) => a + b, 0);
  let acc = 0;
  let htrCntr = heaterAddresses.numHeaters[acc];
  let addr = 0;
  let posn = 0;
  const db = yield MongoClient.connect(url);
  for (i = 0; i <= totalNumHeaters; i++) {
    if (i > htrCntr) { // this determines the address to associate with the target heater
      acc += 1;
      htrCntr = heaterAddresses.numHeaters.slice(0, acc + 1)
        .reduce((a, b) => a + b, 0);
      let addr = heaterAddresses.childAddresses[acc];
    }
    else if (i > 0) {
      addr = heaterAddresses.childAddresses[acc];
    }
    if (acc > 0) posn = heaterAddresses.numHeaters[acc] - (htrCntr - i);
    else posn = i;
    const doc = yield db.collection('heaterRecords')
      .find({ // This is looking to see if the settings document already exists
        $and: [{ "docID.heaterNumber": i },
          { "docID.docType": "settings" }]
      }).limit(1).toArray();
    if (!doc[0]) { // if settings document doesn't exist, create it
      const doc = {
        docID: {
          timestampID: new Date(),
          heaterNumber: i,
          i2cAddress: addr,
          heaterPosition: posn,
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
    }
  }
  db.close();
}).catch((err) => {
  console.log(err);
});

const i2cTmr = setInterval(function() {
  i2c.i2cIntervalTask(toBeUpdated);
  toBeUpdated.targetHeater = -1;
  toBeUpdated.heaterAddress = 0;
  toBeUpdated.heaterPosn = 0;
  toBeUpdated.settingToUpdate = 0;
  toBeUpdated.settingValue = 0;
}, 200);

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

app.get('/server/getSystemData', (req, res) => {
  co(function*() {
    const db = yield MongoClient.connect(url);
    const doc = yield db.collection('heaterRecords')
      .find({ // This is looking to see if the settings document already exists
        $and: [{ "docID.heaterNumber": 1 },
          { "docID.docType": "settings" }]
      }).limit(1).toArray();
    const packet = {
      settings: [
        doc[0].settings.meltTemp,
        doc[0].settings.releaseTemp,
        doc[0].settings.dwellTime,
        doc[0].settings.maxHeaterOnTime,
      ],
      totalNumHeaters: heaterAddresses.numHeaters.reduce((a, b) => a + b, 0)
    }
    res.json(packet);
  })
});

app.post('/server/updateSetpoint', (req, res) => {
  if (!req.body) return res.sendStatus(400);
  let heaterAddresses = getHeaterAddresses();
  let totalNumHeaters = heaterAddresses.numHeaters.reduce((a, b) => a + b, 0);
  let change = req.body;
  let cycleRunning =  i2c.getRunningStatus();
  let proposedValue = parseInt(change.value);
  let targetHeater = parseInt(change.targetHeater);
  let settingToUpdate = parseInt(change.settingToUpdate);
  let settingTitle = change.settingTitle;
  let possibilities = ['settings.meltTemp', 'settings.releaseTemp',
    'settings.maxHeaterOnTime', 'settings.dwellTime'];
  if (cycleRunning) return res.json({results: 'Unsuccessful'});
  if (targetHeater < 0 || targetHeater > 35) return res.json({results: 'Unsuccessful'});
  else {
    co(function*() {
      const db = yield MongoClient.connect(url);
      else {
        if ((proposedValue <= heaterHiLim && proposedValue >= 250 &&
          settingTitle === possibilities[0]) ||
          (proposedValue < 250 && proposedValue >= 100 &&
          && settingTitle === possibilities[1]) ||
          (proposedValue <= 30 && proposedValue >= 15 &&
          settingTitle === possibilities[2]) ||
          (proposedValue/10 < 15 && proposedValue/10 >= 0 &&
          settingTitle === possibilities[3]) ||) {
          if (targetHeater = 0) {
            const doc = yield db.collection('heaterRecords')
              .updateMany({ "docID.docType": "settings" },
              { $set: {settingTitle: proposedValue} });
            assert.equal(totalNumHeaters, doc.modifiedCount);
            toBeUpdated.targetHeater = targetHeater;
            toBeUpdated.settingToUpdate = settingToUpdate;
            toBeUpdated.settingValue = proposedValue;
          }
          else {
            const doc = yield db.collection('heaterRecords')
              .find({
                $and: [{ "docID.heaterNumber": targetHeater },
                  { "docID.docType": "settings" }]
              }).limit(1).toArray()[0];
            if (proposedValue === doc[settingTitle]) res.json({results: 'Success'});
            else {
              toBeUpdated.targetHeater = targetHeater;
              toBeUpdated.heaterAddress = doc.docID.i2cAddress;
              toBeUpdated.heaterPosn = doc.docID.heaterPosition;
              toBeUpdated.settingToUpdate = settingToUpdate;
              toBeUpdated.settingValue = proposedValue;
              var doc = yield db.collection('heaterRecords')
                .update({
                  $and: [{ "docID.heaterNumber": targetHeater },
                    { "docID.docType": "settings" }]
                }, { $set: {settingTitle: proposedValue} })
              console.log(doc);
              res.json({results: 'Success'});
            }
          }
        }
        else res.json({results: 'New Setpoint Outside of Allowable Range'});
      }
      db.close();
    }.catch((err) => {
      console.log(err);
    });
  }
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
  }).catch((err) => {
    console.log(err);
  });
});

(err, results) => {
  if (err) res.json({results: 'Failure to find requested data'});
  else res.json(results);
}
