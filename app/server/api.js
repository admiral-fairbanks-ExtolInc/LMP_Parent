'use strict';

const i2c = require('../i2c/i2cRoutine.js');
const express = require('express');
const moment = require('moment');
const bodyParser = require('body-parser');
const NanoTimer = require('nanotimer');
const exec = require('child_process').exec;
const app = express();
const Gpio = require('onoff').Gpio;
const startSigPin = new Gpio(5, 'in', 'both');
const stopSigPin = new Gpio(6, 'in', 'both');
const fullStrokePin = new Gpio(12, 'in', 'both');
const childSettings = {
  meltTemp: 550,
  releaseTemp: 120,
  maxHeaterOnTime: 30,
  dwellTime: 0,
};

let count = 0;
let childStatuses;

const i2cTmr = setInterval(function() {
  i2c.i2cIntervalTask(childSettings); }, 750);

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
    childSettings.meltTemp = change.value;
    res.json({results: 'Success'});
  }
  else if (change.title === 'Heater Release Temp Setpoint') {
    childSettings.releaseTemp = change.value;
    res.json({results: 'Success'});
  }
  else if (change.title === 'Heater Maximum On Time') {
    childSettings.maxHeaterOnTime = change.value;
    res.json({results: 'Success'});
  }
  else if (change.title === 'Heater Dwell Time') {
    childSettings.dwellTime = change.value;
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

app.post('/payload', (req, res) => {
  //verify that the payload is a push from the correct repo
  //verify repository.name == 'wackcoon-device' or repository.full_name = 'DanielEgan/wackcoon-device'
  console.log(req.body.pusher.name + ' just pushed to ' + req.body.repository.name);

  console.log('pulling code from GitHub...');

  // reset any changes that have been made locally
  exec('git -C /home/pi/LMP_Parent reset --hard', execCallback);

  // and ditch any files that have been added locally too
  exec('git -C /home/pi/LMP_Parent -df', execCallback);

  // now pull down the latest
  exec('git -C /home/pi/LMP_Parent pull -f', execCallback);

  // and npm install with --production
  exec('npm -C /home/pi/LMP_Parent install --production', execCallback);

  // and run tsc
  exec('tsc', execCallback);

  res.sendStatus(200);
  res.end();
});



function execCallback(err, stdout, stderr) {
	if(stdout) console.log(stdout);
	if(stderr) console.log(stderr);
}
