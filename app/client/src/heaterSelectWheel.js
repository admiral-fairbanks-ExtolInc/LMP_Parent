import React, { Component } from 'react';
import './App.css';
import { Row, Col } from 'reactstrap';
import CalibrateRTDButton from './calibrateRtdButton';
import mobiscroll from '/home/pi/LMP_Parent/app/client/node_modules/@mobiscroll/react/dist/js/mobiscroll.react.min.js';
const Axios = require('axios');


class HeaterSelectWheel extends Component {
  constructor(props) {
    super(props);

    this.state = {
      value: 0,
    }
    this.handleValueChange = this.handleValueChange.bind(this);
  }

  handleValueChange(val) {
    let v = this.state.value;
    v = val;
    this.setState({value: v});
  }

  render () {
    return (
      <div>
        <br />
        <Row>
          <Col>
            <h5>Select Heater to Update</h5>
            <mobiscroll.Number
              min = {0}
              max = {this.props.max}
              scale={0}
              step={1}
              animate='pop'
              value = {this.state.value}
              headerText='0 Applies Setting to All Heaters'
              onSet={(event, inst) => { this.handleValueChange(event.valueText, 0); }}
            />
          </Col>
        </Row>
      </div>
    )
  }
}

export default HeaterSelectWheel;
