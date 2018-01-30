import React, { Component } from 'react';
import './App.css';
import {LineChart} from 'react-easy-chart';
import ToolTip from './ToolTip';
import moment from 'moment';
import { timeParse as parse } from 'd3-time-format';
import { Button, Row, Col } from 'reactstrap';

export default class RealtimeGraph extends Component {
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
      componentWidth: 200
    };
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
    this.turnOnRandomData();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }

  handleResize() {
    this.setState({
      windowWidth: window.innerWidth - 200,
      componentWidth: window.innerWidth - 250
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
    for (let i = 0; i <= 150; i++) {
      xs.push((-15000 + 100*i));
    }
    xs.forEach((x) => {
      data.push({ x, y: 75 });
    });
    return data;
  }

  turnOnRandomData() {
    this.setState({ randomDataIntervalId: setInterval(this.updateData, 100) });
  }

  turnOffRandomData() {
    clearInterval(this.state.randomDataIntervalId);
    this.setState({ randomDataIntervalId: null });
  }

  updateData() {
    this.data.forEach((data) => {
      fetch('/server/tempInfo', {
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
        for (let i = 0; i < data.length-1; i ++) {
          data[i].y = data[i+1].y
        }
        data[data.length-1].y = res.temp;
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
          <Col xs='12'>
            <h4>Realtime Temperature Data</h4>
          </Col>
        </Row>
        <br />
        <Row>
          <Col xs='12'>
            <LineChart
              data={this.data}
              width={this.state.componentWidth}
              height={this.state.componentWidth / 1.75}
              yDomainRange={[0, 1000]}
              axisLabels={{ x: 'Time (msec)', y: 'Temp (℉)' }}
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
