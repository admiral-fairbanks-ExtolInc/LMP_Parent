const chai = require('chai');
const expect = chai.expect;

const gpio = require('rpi-gpio');

const PIN = 7;
const DELAY = 1000;

function ptimeout(delay) {
  return new Promise(function(resolve, reject) {
    setTimeout(resolve, delay);
  });
}

function gpioSetup(p, d) {
  return new Promise(function (resolve, reject) {
    gpio.setup(p, d, function (err) {
      if (!err) {
        resolve();
      } else {
        reject(err);
      }
    });
  });
}

function gpioDestroy() {
  return new Promise(function (resolve, reject) {
    gpio.destroy(function () {
      resolve();
    });
  });
}

function togglePin(p, v) {
  return new Promise(function(resolve, reject) {
    gpio.write(p, v, function (err) {
      if (!err) {
        resolve();
      } else {
        reject(err);
      }
    });
  });
}

describe('gpio-promise', function () {
  
  this.timeout(0);
  
  let toggleCount = 0;
  
  it('should toggle LED on and off', function (done) {
  
    gpioSetup(PIN, gpio.DIR_OUT).then(() => {
      return togglePin(PIN, 1);
    }).then(() => {
      toggleCount += 1;
      return ptimeout(DELAY);
    }).then(() => {
      return togglePin(PIN, 0);
    }).then(() => {
      return ptimeout(DELAY);
    }).then(() => {
      return togglePin(PIN, 1);
    }).then(() => {
      toggleCount += 1;
      return ptimeout(DELAY);
    }).then(() => {
      return togglePin(PIN, 0);
    }).then(() => {
      return ptimeout(DELAY);
    }).then(() => {
      return togglePin(PIN, 1);
    }).then(() => {
      toggleCount += 1;
      return ptimeout(DELAY);
    }).then(() => {
      return gpioDestroy();
    }).then(() => {
      expect(toggleCount).to.equal(3);
      done();
    }).catch((err) => {
      done(err);
    });
    
  });
  
});
