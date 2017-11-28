const chai = require('chai');
const expect = chai.expect;
const async = require('async');
const i2c = require('i2c-bus');
const util = require('util');

const BUS_NUMBER = 1;
const SEEDUINO_1_ADDRESS = 0x04;
const SEEDUINO_1_REPLY = 'Slave0x04';
const READ_BUFFER_SIZE = SEEDUINO_1_REPLY.length;
const ACTIVE_DEVICES = 2;

describe('12c', function () {
  
  this.timeout(0);
  
  it('open and close 12c bus', function (done) {
  
    let bus;
    
    async.series([
      function (cb) {
        bus = i2c.open(BUS_NUMBER, cb);
      },
      function (cb) {
        bus.close(cb);
      },
      function (cb) {
        expect(true).to.be.true;
        done();
      }
    ], function (err) {
      if (err) {
        console.log(err);
      }
      done(err);
    });
  
  });
  
  it('scan i2c bus for active devices', function (done) {
    
    let bus;
    
    async.series([
      function (cb) {
        bus = i2c.open(BUS_NUMBER, cb);
      },
      function (cb) {
        bus.scan(function (err, devices) {
          expect(devices).to.have.lengthOf(ACTIVE_DEVICES);
          expect(devices[0]).to.equal(4);
          expect(devices[1]).to.equal(8);
          cb(null, devices);
        });
      },
      function (cb) {
        bus.close(cb);
      }
    ], function (err, results) {
      if (err) {
        console.log(err);
      }
      // Logging this to show how results is an is an array of values, with each element
      // set by the value of the second argument of the async task callback named 'cb' above.
      //console.log(util.inspect(results));
      
      // If the series of functions all completed successfully, then err will be null/undefined.
      // Mocha considers calling done(), done(undefined), done(null) to be equivalent.
      done(err);
    });
    
  });
  
  it('request default response from i2c slave', function (done) {
    
    let bus;
    
    async.series([
      function (cb) {
        bus = i2c.open(BUS_NUMBER, cb);
      },
      function (cb) {
        const buffer = Buffer.alloc(READ_BUFFER_SIZE);
        bus.i2cRead(SEEDUINO_1_ADDRESS, READ_BUFFER_SIZE, buffer, function (err, bytesRead, buffer) {
          expect(bytesRead).to.equal(SEEDUINO_1_REPLY.length);
          expect(buffer.toString()).to.equal(SEEDUINO_1_REPLY);
          cb(null);
        });
      },
      function (cb) {
        bus.close(cb);
      }
    ], function (err, results) {
      if (err) {
        console.log(err);
      }
      done(err);
    });
    
  });
  
  it.skip('send data to i2c slave', function (done) {
    
    let bus;
    
    async.series([
      function (cb) {
        bus = i2c.open(BUS_NUMBER, cb);
      },
      function (cb) {
        const buffer = Buffer.from([0x01]);
        bus.i2cWrite(SEEDUINO_1_ADDRESS, buffer.length, buffer, function (err, bytesWritten, buffer) {
          expect(bytesWritten).to.equal(buffer.length);
          cb(null);
        });
      },
      function (cb) {
        bus.close(cb);
      }
    ], function (err, results) {
      if (err) {
        console.log(err);
      }
      done(err);
    });
    
  });
  
});
