import React, { Component } from 'react';
import zingchart from 'zingchart';

class ZingChart extends React.Component {
  constructor(props) {
    super(props);

    this.componentDidMount = this.componentDidMount.bind(this);
    this.shouldComponentUpdate = this.shouldComponentUpdate.bind(this);
  }

  componentDidMount() {
    zingchart.render({
      id : this.props.id,
      width: (this.props.width || 600),
      height: (this.props.height || 400),
      data : this.props.data
    });
  }
  //Used to check the values being passed in to avoid unnecessary changes.
  shouldComponentUpdate(nextProps, nextState) {
      //Lazy object comparison
      return !(JSON.stringify(nextProps.data) === JSON.stringify(this.props.data)) ;
  }
  componentWillUpdate(nextProps) {
      zingchart.exec(this.props.id, 'setdata', {
          data : nextProps.data
      })
  }

  render() {
    return (
        <div id={this.props.id}></div>
    );
  }
}

export default class DataStore extends React.Component {
  constructor(props) {
    super(props);

    this.componentDidMount = this.componentDidMount.bind(this);
    this.changeData = this.changeData.bind(this);

    this.state = {
      chart1val: {
        "graphset": [{
          "type": "line",
          "series": []
        }]
      }
    }
  }

  componentDidMount() {
    setInterval(this.changeData, 500);
  }
  //Simulates a change of data.
  changeData() {
    let tempData = this.state.chart1val;
    fetch('/server/tempInfo', {
      accept: 'application/json'
    }).then((response) => {
      if (response.status >= 200 && response.status < 300) {
        return response;
      }
      const error = new Error(`HTTP Error ${response.statusText}`);
      error.status = response.statusText;
      error.response = response;
      console.log(error); // eslint-disable-line no-console
      throw error;
    }).then((response) => {
      return response.json();
    }).then((res) => {
      tempData.series.shift();
      let y = res.temp;
      tempData.series.push({ y });
    }).then((tempData) => {
      this.setState({
        chart1val: tempData
      })
    });
    }

  render() {
      return (
          <div>
              <ZingChart id="chart1" height="300" width="600" data={this.state.chart1val} />
          </div>
      );
  }
};

function simulateLiveData(){
  let tempData = [];
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
      if (tempData) tempData.shift();
      let y = res.temp;
      tempData.push({ y });
    });

    return {
        "graphset" : [{
            "type" : "line",
            "series" : tempData
        }]
    };
}
