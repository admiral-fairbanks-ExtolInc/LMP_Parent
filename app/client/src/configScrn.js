import React, { Component } from 'react';
import './App.css';
import { Row, Col } from 'reactstrap';
import CalibrateRTDButton from './calibrateRtdButton';
import mobiscroll from '/home/pi/LMP_Parent/app/client/node_modules/@mobiscroll/react/dist/js/mobiscroll.react.min.js';
const Axios = require('axios');


class ConfigScreen extends Component {
  constructor(props) {
    super(props);

    this.state = {
      values: [0, 0, 0, 0]
    }
    this.handleValueChange = this.handleValueChange.bind(this);
  }

  handleValueChange(val, ind) {
    let v = this.state.values.slice();
    v[ind] = val;
    this.setState({values: v});
    Axios({
      method: 'post',
      url: '/server/updateSetpoint',
      data: {
        title: this.props.types[ind].title,
        value: val
      }
    })
      .then((res) => {
        if(res.data.results !== 'Success') {
          alert('Setpoint Change Unsuccessful. Please try again.');
        }
      })
  }

  render () {
    return (
      <div>
        <br />
        <Row>
          <Col>
            <h5>Melt Temp</h5>
            <mobiscroll.Numpad 
              onSet={(event, inst) => { this.handleValueChange(event.valueText, 0); }}
              preset='decimal' scale={0} min={250} max={1000} suffix=' ℉'
              theme='material-dark' animate='fade'
              headerText='Enter New Setpoint, Min: 250, Max: 1000'/>
            <h6>Min: 250, Max: 1000</h6>
          </Col>
          <Col>
            <h5>Release Temp</h5>
            <mobiscroll.Numpad 
              onSet={(event, inst) => { this.handleValueChange(event.valueText, 1); }}
              preset='decimal' scale={0} min={100} max={1000} suffix=' ℉'
              theme='material-dark' animate='fade'
              headerText='Enter New Setpoint, Min: 100, Max: 1000'/>
            <h6>Min: 100, Max: 1000</h6>
          </Col>
        </Row>
        <br />
        <Row>
          <Col>
            <h5>Dwell Time</h5>
            <mobiscroll.Numpad 
              onSet={(event, inst) => { this.handleValueChange(event.valueText, 3); }}
              preset='decimal' scale={1} min={0} max={15} suffix=' sec'
              theme='material-dark' animate='fade'
              headerText='Enter New Setpoint, Min: 0, Max: 15'/>
            <h6>Min: 0, Max: 15</h6>
          </Col>
          <Col>
            <h5>Max Cycle Time</h5>
            <mobiscroll.Numpad 
              onSet={(event, inst) => { this.handleValueChange(event.valueText, 2); }}
              preset='decimal' scale={0} min={15} max={30} suffix=' sec'
              theme='material-dark' animate='fade'
              headerText='Enter New Setpoint, Min: 15, Max: 30'/>
            <h6>Min: 15, Max: 30</h6>
          </Col>
        </Row>
      </div>
    )
  }
}

export default ConfigScreen;
