const chai = require('chai');
const expect = chai.expect;

const util = require('util');
const i2c = require('i2c-bus');

//const i2c = require('../../app/i2c/i2c-p');
//openBus = util.promisify(i2c.open);

const BUS_NUMBER = 1;
const SEEDUINO_ADDRESS = 0x8;
const READ_BUFFER_SIZE = 16;

describe('i2c', function () {
  
  let bus = null;
  
  after(function () {
    if (bus) {
      console.log('closing bus');
      bus.closeSync();
    }
  });
  
  this.timeout(0);
  
  it('send data request to seeeduino', function (done) {
  
    bus = i2c.open(BUS_NUMBER, (err) => {
      
      if (!err) {
        if (bus) {
          //console.log(util.inspect(bus, { showHidden: true, depth: null }));
          const buffer = Buffer.alloc(READ_BUFFER_SIZE);
          bus.i2cRead(SEEDUINO_ADDRESS, READ_BUFFER_SIZE, buffer, function (err, bytesRead, buff) {
            
            if (!err) {
              console.log(`bytesRead=${bytesRead}`);
              console.log(`buff=${buff}`);
            } else {
              console.log(err);
            }
            
            done();
            
          })
          
          
        } else {
          console.log('bus value is null!');
          done();
        }
      } else {
        console.log(err);
        done();
      }
      
    })
  
  });
  
});