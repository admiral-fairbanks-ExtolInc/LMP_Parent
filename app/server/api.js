'use strict';

const express = require('express');
const moment = require('moment');
const bodyParser = require('body-parser')
const app = express();
let count = 0;
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
  let packet = {
    temp: count
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

setInterval(() => {
  count += 1;
  if (count >= 550) count = 0;
}, 20);
