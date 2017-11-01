const Data = require('../data/gather_data.js');
const Gpio = require('onoff').Gpio;
const NanoTimer = require('nanotimer');
const co = require('co');
const MongoClient = Promise.promisifyAll(require('mongodb').MongoClient);
const i2c = Promise.promisifyAllrequire('i2c-bus');
const Dig_In = [5, 6, 13], Dig_Out = [16, 19, 20, 26];

var Start_Sig_In = {
  Value: 0,
  Pin: Dig_In[0],
  Type: "Dig_In"
},
Stop_Sig_In = {
  Value: 0,
  Pin: Dig_In[1],
  Type: "Dig_In"
}
Full_Stroke_Sig_In = {
  Value: 0,
  Pin: Dig_In[2],
  Type: "Dig_In"
},
Extend_Press_Out =
  Value: 0,
  Pin: Dig_Out[0],
  Type: "Dig_Out"
},
Cooling_Air_Out =
  Value: 0,
  Pin: Dig_Out[1],
  Type: "Dig_Out"
},
Cycle_Complete_Out =
  Value: 0,
  Pin: Dig_Out[2],
  Type: "Dig_Out"
},
LMP_Flted_Out =
  Value: 0,
  Pin: Dig_Out[3],
  Type: "Dig_Out"
},
Digital_Ins = [Start_Sig_In, Stop_Sig_In, Full_Stroke_Sig_In],
Digital_Outs = [Extend_Press_Out, Cooling_Air_Out, Cycle_Complete_Out, LMP_Flted_Out],
Temp_Info, Datalogging_Info, I2C_Ready = false, db_created, System_Initialized,
Reading_And_Logging_Active = false,
Info_Buffers[Data.Child_Addresses.length];
var url = 'mongodb://localhost:27017/mydb';

//Timer Definitions
var I2C_Tmr = new NanoTimer();
//End Timer Definitions

//IO Configuration
Start_Sig_Pin = new Gpio(5, 'in');
Stop_Sig_Pin = new Gpio(6, 'in');
Full_Stroke_Pin = new Gpio(13, 'in');
Extend_Press_Pin = new Gpio(16, 'out');
Cooling_Air_Pin = new Gpio(19, 'out');
Cycle_Complete_Pin = new Gpio(20, 'out');
LMP_Flted_Pin = new Gpio(26, 'out');
// End IO Config

//Setup Loop
Promise.resolve()
  .then(
    i2c1 = i2c.open(1)
    .then((err) => { // Opens I2C Channel
      if (err) {console.log(err);}
      else {I2C_Ready = true;}
    });
  )
  .then(
    MongoClient.connect(url)
    .then((err, database) => {
      if (err) console.log(err);
      db = database;
      db_created = true;
    });
  )
  .then(Data.populate_database();)
  .then(() => {
    if (Heaters_Mapped && I2C_Ready) System_Initialized = true;
    else console.log("System did not setup correctly");
  });



//Watch Input Pins, Update value accordingly
Start_Sig_Pin.watch((err, value) {
  if (err) throw err;
  Start_Sig_In.value = value;
});
Stop_Sig_Pin.watch((err, value) {
  if (err) throw err;
  Stop_Sig_In.value = value;
});
Full_Stroke_Pin.watch((err, value) {
  if (err) throw err;
  Full_Stroke_Sig_In.value = value;
});
//End Watch Input Pins







//Sets up Timed interrupt for Reading/Writing I2C and Storing Data
var I2C_Promise = Promise.resolve()
//Broadcast out Status
.then(Data.exchange.Broadcast_Data([Start_Sig_In.Value, Stop_Sig_In.Value,
  Full_Stroke_Sig_In.Value, Datalogging_Info]);)
//Then, read data from each child controller
.then(Data.exchange.Read_Data(Info_Buffers);)
//Then, process the data obtained from the children
//storing any datalogging info
.then(Data.exchange.Process_Data(Info_Buffers, Child_Statuses);)
//Set this flag false once complete so it can begin again on next interrupt
.then(() => {Reading_And_Logging_Active = false;})
//Then update system variables and write outputs
.then(() => {

  //Checks if all modules are at setpoint. If so, Parent needs
  //to send out Extend Press signal
  Extend_Press = Child_Statuses.every((elem, ind, arr){
    return elem.Heater_At_Setpoint;
  });

  //Checks if all modules are at release. If so, Parent needs
  //to send out Cooling Air signal
  Cooling_Air_On = Child_Statuses.every((elem, ind, arr){
    return elem.Heater_At_Release;
  });

  //Checks if all Modules are at Cycle Complete. If so,
  //Parent needs to send out Cycle Complete Signal
  Cycle_Complete = Child_Statuses.every((elem, ind, arr){
    return elem.Heater_Cycle_Complete;
  });
  if (Cycle_Complete && !Log_Request_Sent) Datalogging_Info = true;
  else if (!Cycle_Complete && Log_Request_Sent) Log_Request_Sent = false;

  //Checks to see if any modules are faulted. If so, Parent
  //needs to send out LMP Faulted signal
  LMP_Flted = Child_Statuses.some((elem, ind, arr){
    return elem.Heater_Faulted;
  });

  Extend_Press_Pin.write(Extend_Press);
  Cooling_Air_Pin.write(Cooling_Air_On);
  Cycle_Complete_Pin.write(Cycle_Complete);
  LMP_Flted_Pin.write(LMP_Flted);
});

I2C_Tmr.setInterval(() => {
  if (!Reading_And_Logging_Active && System_Initialized) {
    Reading_And_Logging_Active = true;
    I2C_Promise;
  }
}, '', '50m');
//Ends Temp Info Interrupt setup

module.exports = {
  Temp_Info,
  Datalogging_Info

};
