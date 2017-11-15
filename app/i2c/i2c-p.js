const util = require('util');
const i2c = require('i2c-bus');

function promisfyBus(bus) {
  
  for (p in bus) {

    if (typeof bus[p] === 'function') {
      exports[p] = util.promisify(bus[p]);
    } else {
      exports[p] = bus[p];
    }
    
  }
  
}

for (p in i2c) {
  
  if (typeof i2c[p] === 'function') {
    exports[p] = util.promisify(i2c[p]);
  } else {
    exports[p] = i2c[p];
  }
  
}

exports.promisfyBus = promisfyBus;

