const chai = require('chai');
const expect = chai.expect;

const i2c = require('../../app/i2c/my-i2c-bus');

const BUS_NUMBER = 1;
const SEEDUINO_1_ADDRESS = 0x04;
const SEEDUINO_1_REPLY = 'Slave0x04';
const READ_BUFFER_SIZE = SEEDUINO_1_REPLY.length;
const ACTIVE_DEVICES = 2;

const DO_BLINK_CMD = 1;
const DO_HEALTHCHECK_CMD = 2;

function pause(delay) {
  return new Promise(function(resolve) {
    //resolve(true);
    setTimeout(resolve, delay);
  });
}

describe('i2c', function () {
  
  this.timeout(0);
  
  it('open and close i2c bus', function (done) {
    
    i2c.openP(BUS_NUMBER).then((bus) => {
      return bus.closeP();
    }).then(() => {
      expect(true).to.be.true;
      return pause(100);
    }).then(() => {
      done();
    }).catch((err) => {
      done(err);
    });
    
  });
  
  it('scan i2c for active devices', function (done) {

    i2c.openP(BUS_NUMBER).then((bus) => {
      return bus.scanP();
    }).then(({bus, devices}) => {
      expect(devices).to.have.lengthOf(ACTIVE_DEVICES);
      return bus.closeP();
    }).then(() => {
      return pause(100);
    }).then(() => {
      done();
    }).catch((err) => {
      done(err);
    });

  });
  
  it('send simple request command without data to i2c slave', function (done) {
    
    i2c.openP(BUS_NUMBER).then((bus) => {
      const buffer = new Buffer(1);
      buffer[0] = DO_BLINK_CMD;
      return bus.i2cWriteP(SEEDUINO_1_ADDRESS, buffer.length, buffer);
    }).then(({bus, bytesWritten, buffer}) => { // using ES6 object destructuring
      expect(bytesWritten).to.equal(buffer.length);
      return bus.closeP();
    }).then(() => {
      return pause(100);
    }).then(() => {
      done();
    }).catch((err) => {
      done(err);
    });
    
  });
  
  it('send simple request command with data to i2c slave', function (done) {
    
    i2c.openP(BUS_NUMBER).then((bus) => {
      const buffer = new Buffer(5);
      buffer[0] = DO_BLINK_CMD;
      for (let i = 1; i < 5; i++) {
        buffer[i] = i + 10;
      }
      return bus.i2cWriteP(SEEDUINO_1_ADDRESS, buffer.length, buffer);
    }).then(({bus, bytesWritten, buffer}) => { // using ES6 object destructuring
      expect(bytesWritten).to.equal(buffer.length);
      return bus.closeP();
    }).then(() => {
      return pause(100);
    }).then(() => {
      done();
    }).catch((err) => {
      done(err);
    });
    
  });
  
  it('send request-response command with data to i2c slave', function (done) {
    
    let b;
    
    i2c.openP(BUS_NUMBER).then((bus) => {
      b = bus;
      const writeBuffer = new Buffer(1);
      writeBuffer[0] = DO_HEALTHCHECK_CMD;
      return bus.i2cWriteP(SEEDUINO_1_ADDRESS, writeBuffer.length, writeBuffer);
    }).then(({bus, bytesWritten, buffer}) => { // using ES6 object destructuring
      expect(bytesWritten).to.equal(buffer.length);
      return pause(500);
    }).then(() => {
      const readBuffer = Buffer.alloc(READ_BUFFER_SIZE);
      return b.i2cReadP(SEEDUINO_1_ADDRESS, READ_BUFFER_SIZE, readBuffer);
    }).then((bus, bytesRead, buffer) => {
      return b.closeP();
    }).then(() => {
      done();
    }).catch((err) => {
      done(err);
    });
    
  });
  
  /*it('send request-response command with data to i2c slave', function (done) {
    
    let b;
    
    i2c.openP(BUS_NUMBER).then((bus) => {
      b = bus;
      const writeBuffer = new Buffer(1);
      writeBuffer[0] = DO_HEALTHCHECK_CMD;
      return bus.i2cWriteP(SEEDUINO_1_ADDRESS, writeBuffer.length, writeBuffer);
    }).then(({bus, bytesWritten, buffer}) => { // using ES6 object destructuring
      expect(bytesWritten).to.equal(buffer.length);
      return pause(100);
      //return bus.closeP();
    }).then(() => {
      const readBuffer = Buffer.alloc(READ_BUFFER_SIZE);
      //return bus.i2cReadP(SEEDUINO_1_ADDRESS, READ_BUFFER_SIZE, readBuffer);
      return b.i2cReadP(SEEDUINO_1_ADDRESS, READ_BUFFER_SIZE, readBuffer);
    }).then(() => {
      return b.closeP();
      //  return pause(100);
    }).then(() => {
      done();
    }).catch((err) => {
      done(err);
    });
    
  });
  */
  
});
