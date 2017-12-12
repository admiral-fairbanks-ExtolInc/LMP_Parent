const MongoClient = require('mongodb').MongoClient;
const co = require('co');
const _ = require('lodash');
const moment = require('moment');
const util = require('util');

const gatherData = require('../app/i2c/gather-data');

const testDbUri = 'mongodb://127.0.0.1:27017/test';

let testDB;

function connect(done) {

  co(function* () {
    testDB = yield MongoClient.connect(testDbUri);
    console.log('mongodb connect success');
    done();
  }).catch((err) => {
    console.error(err.stack);
    done(err);
  });

}

function drop(done) {

  if (!testDB) {
    //nothing to do
    done();
  }

  co(function* () {
    const collections = yield testDB.collections();
    console.log(`Found ${collections.length} collections`);

    done();
  }).catch((err) => {
    console.error(err.stack);
    done(err);
  });

}

const htrTypes = ['HeaterTypeA', 'HeaterTypeB', 'HeaterTypeC', 'HeaterTypeD', 'HeaterTypeE'];

function getRandomHeaterData() {

  const h = gatherData.getTemplate(
    _.random(0, 31), // index
    _.random(0, 15), // htrNum
    htrTypes[_.random(0, htrTypes.length - 1)], //htrType
    _.random(0, 7), // address
  );

  _.keysIn(h.dataLog).forEach((key) => {
    const d = h.dataLog[key];
    d.time = moment().add(_.random(1, 60), 'seconds');
    d.temp = _.random(0, 100);
    d.pos = _.random(1, 25);
  });

  return h;
}

function fixtures(done) {

  co(function* () {

    const coll = yield testDB.createCollection('heater_activity');

    for (let i = 0; i < 10; i += 1) {
      const heaterData = getRandomHeaterData();
      console.log(util.inspect(heaterData));
    }


  }).catch((err) => {
    console.error(err.stack);
    done(err);
  });

}

// tests

connect((err) => {
  fixtures((err) => {
    drop((err) => {
      testDB.close();
    });
  });
});

exports.connect = connect;
exports.drop = drop;
