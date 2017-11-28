/**
 * Provides promise wrappers for subset of 12c-bus functions. Additional wrappers can be added as needed.
 *
 * Note that most of the functions return the bus object in the resolve object to make promise chaining
 * a little easier.
 */

const i2c = require('i2c-bus');

module.exports.openP = openP;

function openP(busNumber, options) {
  
  return new Promise(function (resolve, reject) {
    
    let bus = i2c.open(busNumber, options, function (err) {
      
      if (!err) {
        resolve(promisfyBus(bus));
      } else {
        reject(err);
      }
      
    });
    
  });
  
};

function promisfyBus(bus) {
  
  bus.closeP = closeP;
  bus.scanP = scanP;
  bus.i2cReadP = i2cReadP;
  bus.i2cWriteP = i2cWriteP;
  
  return bus;
}

function closeP() {
  
  const self = this;
  
  return new Promise(function (resolve, reject) {
    self.close(function (err) {
      if (!err) {
        resolve();
      } else {
        reject(err);
      }
    });
  });
}

function scanP() {
  
  const self = this;
  
  return new Promise(function (resolve, reject) {
    self.scan(function (err, devices) {
      if (!err) {
        resolve({bus: self, devices});
      } else {
        reject(err);
      }
    });
  });
}

function i2cReadP(addr, length, buffer) {
  
  const self = this;
  
  return new Promise(function (resolve, reject) {
    self.i2cRead(addr, length, buffer, function (err, bytesRead, buffer) {
      if (!err) {
        resolve({bus: self, bytesRead, buffer});
      } else {
        reject(err);
      }
    });
  });
}

function i2cWriteP(addr, length, buffer) {
  
  const self = this;
  
  return new Promise(function (resolve, reject) {
    self.i2cWrite(addr, length, buffer, function (err, bytesWritten, buffer) {
      if (!err) {
        resolve({bus: self, bytesWritten, buffer});
      } else {
        reject(err);
      }
    });
  });
}
