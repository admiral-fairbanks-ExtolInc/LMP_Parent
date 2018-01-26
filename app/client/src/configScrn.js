import React, { Component } from 'react';
import './App.css';
import { Row, Col } from 'reactstrap';
import TempInput from './tempSetpointInput';
import SetpointInput from './timeSetpointInput';
import CalibrateRTDButton from './calibrateRtdButton';
import {
  Route,
} from 'react-router-dom';
class ConfigScreen extends Component {

  render () {
    return (
      <div>
        <CalibrateRTDButton type={this.props.types[4]} />
        <br />
        <TempInput types={this.props.types} />
      </div>
    )
  }
}

export default ConfigScreen;
