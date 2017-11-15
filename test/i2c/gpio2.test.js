const chai = require('chai');
const expect = chai.expect;

const gpio = require('../../app/i2c/gpio-p');
const PIN = 7;
const DELAY = 1000;

function ptimeout(delay) {
  return new Promise(function(resolve, reject) {
    setTimeout(resolve, delay);
  });
}

describe('gpio-promise', function () {
  
  this.timeout(0);
  
  let toggleCount = 0;
  
  it('should toggle LED on and off', function (done) {
  
    gpio.setup(PIN, gpio.DIR_OUT).then(() => {
      return gpio.write(PIN, 1);
    }).then(() => {
      toggleCount += 1;
      return ptimeout(DELAY);
    }).then(() => {
      return gpio.write(PIN, 0);
    }).then(() => {
      return ptimeout(DELAY);
    }).then(() => {
      return gpio.write(PIN, 1);
    }).then(() => {
      toggleCount += 1;
      return ptimeout(DELAY);
    }).then(() => {
      return gpio.write(PIN, 0);
    }).then(() => {
      return ptimeout(DELAY);
    }).then(() => {
      return gpio.write(PIN, 1);
    }).then(() => {
      toggleCount += 1;
      return ptimeout(DELAY);
    }).then(() => {
      return gpio.destroy();
    }).then(() => {
      expect(toggleCount).to.equal(3);
      done();
    }).catch((err) => {
      done(err);
    });
    
  });
  
});
