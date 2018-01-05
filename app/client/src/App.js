import React, { Component } from 'react';
import './App.css';
import { Container, Row, Col } from 'reactstrap';
import LmpNavbar from './nav';
import TempInput from './tempSetpointInput';
import SetpointInput from './timeSetpointInput';
import CalibrateRTDButton from './calibrateRtdButton';
import TempGraph from './tempGraph';
import {
  Route,
} from 'react-router-dom';
class App extends Component {
  constructor(props) {
    super(props);
      // Generate multiple lines of data

    this.state = {
      types: [
        {
          title: 'Heater Melt Temp Setpoint',
          boilerplate: '550'
        },
        {
          title: 'Heater Release Temp Setpoint',
          boilerplate: '120'
        },
        {
          title: 'Heater Maximum On Time',
          boilerplate: '30'
        },
        {
          title: 'Heater Dwell Time',
          boilerplate: '0'
        },
        {
          title: 'Calibrate RTD'
        }
      ],
      showToolTip: false,
      componentWidth: 300
    };
  }

  render() {
    return (
      <div className="App" fluid='true'>
        <LmpNavbar />
        <Route exact path='/config' render={(props) => (
            <h2>Input desired setpoint and press Submit</h2>
          )}/>
        <Container>
          <Row>
            <Col>
              <Route path='/config' render={(props) => (
                  <TempInput type={this.state.types[0]} />
                )}/>
            </Col>
            <Col>
              <Route path='/config' render={(props) => (
                  <TempInput type={this.state.types[1]} />
                )}/>
            </Col>
          </Row>
          <Row>
            <Col>
              <Route path='/config' render={(props) => (
                  <SetpointInput type={this.state.types[2]} />
                )}/>
            </Col>
            <Col>
              <Route path='/config' render={(props) => (
                  <SetpointInput type={this.state.types[3]} />
                )}/>
            </Col>
          </Row>
          <br />
          <Row>
            <Col>
              <Route path='/config' render={(props) => (
                  <CalibrateRTDButton type={this.state.types[4]} />
                )}/>
            </Col>
          </Row>
          <br />
          <Row>
            <Col sm='12'>
              <Route exact path="/" component={TempGraph}/>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }
}

export default App;
