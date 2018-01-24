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
        <Route exact path='/config' render={(props) => (
            <h2>Input desired setpoint and press Submit</h2>
          )}/>
        <Row>
          <Col xs="6">
            <Route path='/config' render={(props) => (
                <TempInput type={this.props.types[0]} />
              )}/>
          </Col>
          <Col xs="6">
            <Route path='/config' render={(props) => (
                <TempInput type={this.props.types[1]} />
              )}/>
          </Col>
        </Row>
        <Row>
          <Col xs="6">
            <Route path='/config' render={(props) => (
                <SetpointInput type={this.props.types[2]} />
              )}/>
          </Col>
          <Col xs="6">
            <Route path='/config' render={(props) => (
                <SetpointInput type={this.props.types[3]} />
              )}/>
          </Col>
        </Row>
        <br />
        <Row>
          <Col>
            <Route path='/config' render={(props) => (
                <CalibrateRTDButton type={this.props.types[4]} />
              )}/>
          </Col>
        </Row>
      </div>
    )
  }
}

export default ConfigScreen;
