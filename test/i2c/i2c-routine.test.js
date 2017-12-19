const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const Gpio = require('onoff').Gpio;
const _ = require('lodash');

const gatherData = require('../../app/i2c//gather-data');

const expect = chai.expect;

const i2cRoutine = rewire('../../app/i2c/i2c-routine');

const extendPressPin = new Gpio(16, 'out');
const coolingAirPin = new Gpio(19, 'out');
const cycleCompletePin = new Gpio(20, 'out');
const lmpFltedPin = new Gpio(26, 'out');

const writeExtendPressPin = sinon.stub(extendPressPin, 'write');
const writeCoolingAirPin = sinon.stub(coolingAirPin, 'write');
const writeCycleCompletePin = sinon.stub(cycleCompletePin, 'write');
const writeLmpFltedPin = sinon.stub(lmpFltedPin, 'write');

const broadcastData = sinon.stub(gatherData, 'broadcastData');
const readData = sinon.stub(gatherData, 'readData');
const processData = sinon.stub(gatherData, 'processData');


/* eslint-disable no-underscore-dangle */
i2cRoutine.__set__('extendPressPin', extendPressPin);
i2cRoutine.__set__('coolingAirPin', coolingAirPin);
i2cRoutine.__set__('cycleCompletePin', cycleCompletePin);
i2cRoutine.__set__('lmpFltedPin', lmpFltedPin);
i2cRoutine.__set__('gatherData', gatherData);
i2cRoutine.__set__('dataloggingInfo', false);
/* eslint-enable no-underscore-dangle */

describe('i2c-routine', function () {

  it('should execute normal i2cHandling successfully', function (done) {

    const slaveCount = 3;
    const lmpCount = 4;
    const expectedSlaveData = [];
    const expectedSlaveStatus = [];

    for (let i = 0; i < slaveCount; i += 1) {
      expectedSlaveData.push(Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]));
      expectedSlaveStatus.push(gatherData.getInitialHeaterStatus());

      for (let j = 0; j < lmpCount; j += 1) {
        expectedSlaveStatus[i].lmpTemps[j] = _.random(0, 100);
      }

    }

    broadcastData.yields(null);
    readData.yields(null, expectedSlaveData);
    processData.yields(null, expectedSlaveStatus);

    writeExtendPressPin.yields(null);
    writeCoolingAirPin.yields(null);
    writeCycleCompletePin.yields(null);
    writeLmpFltedPin.yields(null);

    i2cRoutine.i2cHandling((err) => {

      expect(broadcastData.called).to.be.true;
      expect(broadcastData.calledWith(sinon.match.instanceOf(Buffer), sinon.match.func)).to.be.true;
      expect(readData.called).to.be.true;
      expect(readData.calledWith(sinon.match({ dataloggingInfo: false }), sinon.match.func)).to.be.true;
      expect(processData.called).to.be.true;
      expect(processData.calledWith(expectedSlaveData), sinon.match.func).to.be.true;

      expect(writeExtendPressPin.called).to.be.true;
      expect(writeCoolingAirPin.called).to.be.true;
      expect(writeCycleCompletePin.called).to.be.true;
      expect(writeLmpFltedPin.called).to.be.true;

      expect(writeExtendPressPin.calledWith(false), sinon.match.func).to.be.true;
      expect(writeCoolingAirPin.calledWith(false), sinon.match.func).to.be.true;
      expect(writeCycleCompletePin.calledWith(false), sinon.match.func).to.be.true;
      expect(writeLmpFltedPin.calledWith(false), sinon.match.func).to.be.true;

      done();

    });

  });

});
