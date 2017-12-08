import React, { Component } from 'react';
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
import Nav from './nav';
import tempGraph from './tempGraph';
import SetpointInput from './setpointInput';
const Axios = require('axios');

class App extends Component {
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
    const divStyle = {
      color: 'blue'
    };
    this.state = {
      types: [
        {
          title: 'Heater Melt Temp Setpoint',
          boilerplate: '550'
        },
        {
          title: 'Heater Release Temp Setpoint',
          boilerplate: '120'
        }
      ],
      showToolTip: false,
      windowWidth: initialWidth - 100,
      componentWidth: 300
    };
  }

  logMeltTempValue() {
  }

  logReleaseTempValue() {

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
    for (let i = 1; i <= 301; i++) {
      xs.push(date.format('D-MMM-YY HH:mm'));
      date = date.add(1, 'hour');
    }
    xs.forEach((x) => {
      data.push({ x, y: 301 });
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

  render() {
    return (
      <div className="App" fluid='true'>
        <Nav />
        <br />
          <h2>Input desired setpoint and press Submit</h2>
          <Container>
            <Row>
              <Col>
              </Col>
              <Col>
                <SetpointInput type={this.state.types[0]} />
              </Col>
              <Col>
              </Col>
              <Col>
                <SetpointInput type={this.state.types[1]} />
              </Col>
              <Col>
              </Col>
            </Row>
            <br />
            <Row>
              <Col>
                <h3>Begin Data Gathering</h3>
                <br />
                {(this.state.randomDataIntervalId)
                  ? <Button color="success" onClick={this.turnOffRandomData}>Turn Off Data Gathering</Button>
                  : <Button color="success" onClick={this.turnOnRandomData}>Turn On Gathering</Button>}
              </Col>
            </Row>
            <br />
            <Row>
              <Col sm='12'>
                <LineChart
                  data={this.data}
                  datePattern={'%d-%b-%y %H:%M'}
                  xType={'time'}
                  xTicks={50}
                  width={this.state.componentWidth}
                  height={this.state.componentWidth / 2}
                  yDomainRange={[-40, -30]}
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
          </Container>

        </div>
    );
  }
}

export default App;
