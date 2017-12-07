const MongoClient = require('mongodb').MongoClient;
const co = require('co');

const test_db_uri = 'mongodb://127.0.0.1:27017/test';

let testDB;

exports.connect = connect;
exports.drop = drop;


function connect(done) {
  
  co(function *() {
    testDB = yield MongoClient.connect(test_db_uri);
    console.log('mongodb connect success');
    done();
  }).catch(function (err) {
    console.error(err.stack);
    done(err);
  });
  
}

function drop(done) {
  
  if (!testDB) {
    //nothing to do
    done();
  }
  
  co(function *() {
    const collections = yield testDB.collections();
    console.log(`Found ${collections.length} collections`);
    
    
    done();
  }).catch(function (err) {
    console.error(err.stack);
    done(err);
  });
  
}

function fixtures(data, done) {

}


// tests

connect(function (err) {
  drop(function (err) {
    testDB.close();
  });
});

