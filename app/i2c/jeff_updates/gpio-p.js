const util = require('util');
const gpio = require('rpi-gpio');

for (p in gpio) {
  
  if (typeof gpio[p] === 'function') {
    exports[p] = util.promisify(gpio[p]);
  } else {
    exports[p] = gpio[p];
  }
  
}

// const setup = util.promisify(gpio.setup);
// const destroy = util.promisify(gpio.destroy);
// const write = util.promisify(gpio.write);
// const read = util.promisify(gpio.read);
