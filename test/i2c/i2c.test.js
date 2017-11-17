const chai = require('chai');
const expect = chai.expect;

//const i2c = require('i2c-bus');
const i2c = require('../../app/i2c/my-i2c-bus');

const BUS_NUMBER = 1;
const SEEDUINO_2_ADDRESS = 0x04;
const SEEDUINO_2_REPLY = 'Slave2';
const READ_BUFFER_SIZE = 6;
const WRITE_BUFFER_SIZE = 1;
const ACTIVE_DEVICES = 2;

describe('i2c', function () {
  
  this.timeout(0);
  
  it('open and close i2c bus', function (done) {
    
    i2c.openP(BUS_NUMBER).then((bus) => {
      return bus.closeP();
    }).then(() => {
      expect(true).to.be.true;
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
      done();
    }).catch((err) => {
      done(err);
    });

  });
  
  // it('request data from i2c slave', function (done) {
  //
  //   i2c.openP(BUS_NUMBER).then((bus) => {
  //     const buffer = Buffer.alloc(READ_BUFFER_SIZE);
  //     return bus.i2cReadP(SEEDUINO_2_ADDRESS, READ_BUFFER_SIZE, buffer);
  //   }).then(({bus, bytesRead, buffer}) => { // using ES6 object destructuring
  //     expect(buffer.toString()).to.equal(SEEDUINO_2_REPLY);
  //     return bus.closeP();
  //   }).then(() => {
  //     done();
  //   }).catch((err) => {
  //     done(err);
  //   });
  //
  // });
  
  it('send data to i2c slave', function (done) {
    
    i2c.openP(BUS_NUMBER).then((bus) => {
      const buffer = Buffer.from([0x01]);
      return bus.i2cWriteP(SEEDUINO_2_ADDRESS, buffer.length, buffer);
    }).then(({bus, bytesWritten, buffer}) => { // using ES6 object destructuring
      expect(bytesWritten).to.equal(buffer.length);
      return bus.closeP();
    }).then(() => {
      done();
    }).catch((err) => {
      done(err);
    });
    
  });
  
});
