import React, { Component } from 'react';
import dickbutt from './dickbutt.svg'
import './App.css';
import {LineChart} from 'react-easy-chart';
import { escapeHTML } from './util';
import ToolTip from './ToolTip';
import moment from 'moment';
import { timeParse as parse } from 'd3-time-format';
import { Scrollspy } from 'react-scrollspy';
import { InputGroup, InputGroupButton, Input, Button,
  Container, Row, Col } from 'reactstrap';
import NumericInput from 'react-numeric-input';
const Axios = require('axios');

export default class tempGraph extends Component {
  constructor(props) {
    super(props);
      // Generate multiple lines of data

    this.mouseOverHandler = this.mouseOverHandler.bind(this);
    this.mouseOutHandler = this.mouseOutHandler.bind(this);
    this.mouseMoveHandler = this.mouseMoveHandler.bind(this);

    this.turnOnRandomData = this.turnOnRandomData.bind(this);
    this.turnOffRandomData = this.turnOffRandomData.bind(this);

    this.updateData = this.updateData.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.toggleState = this.toggleState.bind(this);

    this.data = [
      this.generateData(),
    ];

    const initialWidth = window.innerWidth > 0 ? window.innerWidth : 500;
    this.state = {
      showToolTip: false,
      windowWidth: initialWidth - 100,
      componentWidth: 300
    };
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }

  handleResize() {
    this.setState({
      windowWidth: window.innerWidth - 100,
      componentWidth: window.innerWidth - 200
    });
  }

  mouseOverHandler(d, e) {
    this.setState({
      showToolTip: true,
      top: `${e.screenY - 10}px`,
      left: `${e.screenX + 10}px`,
      y: d.y,
      x: d.x });
  }

  mouseMoveHandler(e) {
    if (this.state.showToolTip) {
      this.setState({ top: `${e.y - 10}px`, left: `${e.x + 10}px` });
    }
  }

  mouseOutHandler() {
    this.setState({ showToolTip: false });
  }

  clickHandler(d) {
    this.setState({ dataDisplay: `The amount selected is ${d.y}` });
  }

  generateData() {
    const data = [];
    const xs = [];

    let date = moment('2015-1-1 00:00', 'YYYY-MM-DD HH:mm');
    for (let i = 1; i <= 12; i++) {
      xs.push(date.format('D-MMM-YY HH:mm'));
      date = date.add(1, 'hour');
    }
    xs.forEach((x) => {
      data.push({ x, y: 51 });
    });
    return data;
  }

  turnOnRandomData() {
    this.setState({ randomDataIntervalId: setInterval(this.updateData, 200) });
  }

  turnOffRandomData() {
    clearInterval(this.state.randomDataIntervalId);
    this.setState({ randomDataIntervalId: null });
  }

  updateData() {
    const parseDate = parse('%d-%b-%y %H:%M');
    this.data.forEach((data) => {
      fetch('/server/tempInfo', {
        accept: 'application/json'
      })
        .then((response) => {
          if (response.status >= 200 && response.status < 300) {
            return response;
          }
          const error = new Error(`HTTP Error ${response.statusText}`);
          error.status = response.statusText;
          error.response = response;
          console.log(error); // eslint-disable-line no-console
          throw error;
        })
        .then((response) => {
          return response.json();
        })
        .then((res) => {
          data.shift();
          let y = res.temp;
          console.log(y);
          const date = moment(parseDate(data[data.length - 1].x));
          date.add(1, 'hour');
          data.push({ x: date.format('D-MMM-YY HH:mm'), y });
        });

    });

    this.forceUpdate();
  }

  toggleState() {
    this.setState({
      active: !this.state.active
    });
  }

  createTooltip() {
    if (this.state.showToolTip) {
      return (
        <ToolTip
          top={this.state.top}
          left={this.state.left}
        >
            The x value is {this.state.x} and the y value is {this.state.y}
        </ToolTip>
      );
    }
    return false;
  }

  logMeltTempValue() {

  }

  logReleaseTempValue() {

  }
  render() {
    return(
      <div>
        <Row>
          <Col xs='4'>
            <h3>Heater Melt Temp Setpoint</h3>
            <InputGroup>
              <InputGroupButton><Button onClick={this.logMeltTempValue}>Submit</Button></InputGroupButton>
              <Input placeholder='500' type='number' step='10'/>
            </InputGroup>
          </Col>
          <Col xs='4'>
            <h4>Heater Release Temp Setpoint</h4>
            <InputGroup>
              <InputGroupButton><Button onClick={this.logReleaseTempValue}>Submit</Button></InputGroupButton>
              <Input placeholder='120' type='number' step='10'/>
            </InputGroup>
          </Col>
          <Col xs='4'>
            <h3>Begin Data Gathering</h3>
            {(this.state.randomDataIntervalId)
              ? <Button color="success" onClick={this.turnOffRandomData}>Turn Off Data Gathering</Button>
              : <Button color="success" onClick={this.turnOnRandomData}>Turn On Gathering</Button>}
          </Col>
        </Row>
        <br />
        <Row>
          <Col xs='12'>
            <LineChart
              data={this.data}
              datePattern={'%d-%b-%y %H:%M'}
              xType={'time'}
              width={this.state.componentWidth}
              height={this.state.componentWidth / 2}
              interpolate={'cardinal'}
              yDomainRange={[0, 1000]}
              axisLabels={{ x: 'Hour', y: 'Percentage' }}
              axes
              grid
              style={{
                '.line0': {
                  stroke: 'green'
                }
              }}
            />
          </Col>
        </Row>
      </div>
    )
  }
}
