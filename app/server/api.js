'use strict';

const i2c = require('../i2c/i2cRoutine.js');
const express = require('express');
const moment = require('moment');
const bodyParser = require('body-parser');
const NanoTimer = require('nanotimer');
const exec = require('child_process').exec;
const app = express();
const i2cTmr = new NanoTimer();
let count = 0;
let childStatuses;

i2cTmr.setInterval(i2c.i2cIntervalTask, '', '750m');

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
  console.log(childStatuses[0].lmpTemps[0]);
  let packet = {
    temp: childStatuses[0].lmpTemps[0]
  };
  res.json(packet);
});

app.post('/server/updateSetpoint', (req, res) => {
  if (!req.body) return res.sendStatus(400);
  let change = req.body;
  let success;
  console.log(change);
  if (change.title === 'Heater Melt Temp Setpoint' ||
  change.title === 'Heater Release Temp Setpoint') {
    res.json({results: 'Success'});
  }
  else res.json({results: 'Invalid Setpoint Change'})

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
