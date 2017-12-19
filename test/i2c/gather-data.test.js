const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const Gpio = require('onoff').Gpio;
const _ = require('lodash');

const gatherData = require('../../app/i2c//gather-data');

const expect = chai.expect;

const i2cRoutine = rewire('../../app/i2c/i2c-routine');
