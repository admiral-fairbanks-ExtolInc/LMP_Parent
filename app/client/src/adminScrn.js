import React, { Component } from 'react';
import './App.css';
import { Row, Col } from 'reactstrap';
import CalibrateRTDButton from './calibrateRtdButton';
import mobiscroll from '/home/pi/LMP_Parent/app/client/node_modules/@mobiscroll/react/dist/js/mobiscroll.react.min.js';
const Axios = require('axios');


class AdminScreen extends Component {
  constructor(props) {
    super(props);
  }

  render () {
    return (
      <div>
        <br />
        <CalibrateRTDButton type={this.props.types[4]} />
      </div>
    )
  }
}

export default AdminScreen;
