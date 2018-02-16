import React, { Component } from 'react';
import './App.css';
import { Row, Col } from 'reactstrap';
import themeable from 'react-themeable';
import CalibrateRTDButton from './calibrateRtdButton';
import HeaterSelectWheel from './heaterSelectWheel';
import mobiscroll from '/home/pi/LMP_Parent/app/client/node_modules/@mobiscroll/react/dist/js/mobiscroll.react.min.js';
const Axios = require('axios');


class ConfigScreen extends Component {
  constructor(props) {
    super(props);

    this.state = {
      values: [0, 0, 0, 0],
      max: 0
    }
    this.handleValueChange = this.handleValueChange.bind(this);
  }

  componentDidMount() {
    fetch('/server/getSystemData', {
      accept: 'application/json'
    }).then((response) => {
      if (response.status >= 200 && response.status < 300) {
        return response;
      }
      const error = new Error(`HTTP Error ${response.statusText}`);
      error.status = response.statusText;
      error.response = response;
      throw error;
    }).then((response) => {
      return response.json();
    }).then((res) => {
      let newValues = this.state.values.slice();
      let newMax = this.state.max;
      Array.prototype.push.apply(newValues, res.settings);
      newValues.splice(0, 4);
      newMax = res.totalNumHeaters;
      this.setState({values: newValues});
      this.setState({max: newMax});
    });
  }

  handleValueChange(val, ind) {
    let targ;
    let v = this.state.values.slice();
    v[ind] = val;
    this.setState({values: v});
    if (this.props.types[ind].individuallyTracked) {
      targ = this.selectWheel1.state.value;
    }
    else targ = 0;
    Axios({
      method: 'post',
      url: '/server/updateSetpoint',
      data: {
        value: val,
        settingTitle: this.props.types[ind].settingTitle,
        settingToUpdate: this.props.types[ind].settingToUpdate,
        targetHeater: targ
      }
    })
      .then((res) => {
        if(res.data.results !== 'Success') {
          alert('Setpoint Change Unsuccessful. Please try again.');
        }
      })
  }

  render () {
    const theme = themeable(this.props.theme);

    return (
      <div>
        <br />
        <div {...theme(1, 'upperRow')}>
          <HeaterSelectWheel
            ref={(selectWheel1) => {this.selectWheel1 = selectWheel1;}}
            max={this.state.max}
          />
          <Row>
            <Col >
              <h5>Melt Temp</h5>
              <mobiscroll.Numpad
                value={this.state.values[0]}
                onSet={(event, inst) => { this.handleValueChange(event.valueText, 0); }}
                preset='decimal' scale={0} min={250} max={1000} suffix=' ℉'
                theme='material-dark' animate='fade'
                headerText='Enter New Setpoint, Min: 250, Max: 1000'/>
              <h6>Min: 250, Max: 1000</h6>
            </Col>
            <Col>
              <h5>Release Temp</h5>
              <mobiscroll.Numpad
                value={this.state.values[1]}
                onSet={(event, inst) => { this.handleValueChange(event.valueText, 1); }}
                preset='decimal' scale={0} min={100} max={1000} suffix=' ℉'
                theme='material-dark' animate='fade'
                headerText='Enter New Setpoint, Min: 100, Max: 250'/>
              <h6>Min: 100, Max: 1000</h6>
            </Col>
          </Row>
        </div>
        <br />
        <Row {...theme(1, 'upperRow')}>
          <Col>
            <h5>Dwell Time</h5>
            <mobiscroll.Numpad
              value={this.state.values[2]}
              onSet={(event, inst) => { this.handleValueChange(event.valueText, 3); }}
              preset='decimal' scale={1} min={0} max={15} suffix=' sec'
              theme='material-dark' animate='fade'
              headerText='Enter New Setpoint, Min: 0, Max: 15'/>
            <h6>Min: 0, Max: 15</h6>
          </Col>
          <Col>
            <h5>Max Cycle Time</h5>
            <mobiscroll.Numpad
              value={this.state.values[3]}
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
