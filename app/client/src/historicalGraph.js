import React, { Component } from 'react';
import './App.css';
import {LineChart} from 'react-easy-chart';
import ToolTip from './ToolTip';
import moment from 'moment';
import { timeParse as parse } from 'd3-time-format';
import { Button, Row, Col } from 'reactstrap';

export default class HistoricalGraph extends Component {
  constructor(props) {
    super(props);
      // Generate multiple lines of data

    this.mouseOverHandler = this.mouseOverHandler.bind(this);
    this.mouseOutHandler = this.mouseOutHandler.bind(this);
    this.mouseMoveHandler = this.mouseMoveHandler.bind(this);

    this.updateData = this.updateData.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.toggleState = this.toggleState.bind(this);

    this.data = [
      [{x:0, y: 70},
      {x:1000, y:550},
      {x:4000, y:525},
      {x:20000, y:550},
      {x:28000, y: 120}]
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
    var intervalId = setInterval(this.updateData, 4000);
    this.setState({intervalId: intervalId});
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
    clearInterval(this.state.intervalId);
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

  updateData() {
    this.data.forEach((data) => {
      fetch('/server/getLastCycle').then(function(response) {
        if (response.status >= 200 && response.status < 300) {
          return response;
        }
        const error = new Error(`HTTP Error ${response.statusText}`);
        error.status = response.statusText;
        error.response = response;
        throw error;
      }).then(function(response) {
        return response.json();
      }).then(function(res) {
        data.push(
          {
            x:res.dataLog.startData.startTime,
            y:res.dataLog.startData.startTemp
          },
          {
            x:res.dataLog.atSetpointData.atSetpointTime,
            y:res.dataLog.atSetpointData.atSetpointTemp
          },
          {
            x:res.dataLog.contactDipData.contactDipTime,
            y:res.dataLog.contactDipData.contactDipTemp
          },
          {
            x:res.dataLog.shutoffData.shutoffTime,
            y:res.dataLog.shutoffData.shutoffTemp
          },
          {
            x:res.dataLog.cycleCompleteData.cycleCompleteTime,
            y:res.dataLog.cycleCompleteData.cycleCompleteTemp
          },
        )
        data.splice(0, 5);
      });
    })
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
        <br />
        <Row>
          <Col xs='12'>
            <Button color="success" onClick={this.updateData}>Gather Previous Cycle Data</Button>
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
              xDomainRange={[0, 35000]}
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
