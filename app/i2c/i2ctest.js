const i2c = require('./my-i2c-bus');

i2c.openP(1).then((bus) => {
  return bus.scanP();
}).then(({bus, devices}) => {
    console.log(devices);
    childAddresses = devices;
});