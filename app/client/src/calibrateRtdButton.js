import React from 'react';
import { Button } from 'reactstrap';
const Axios = require('axios');

export default class CalibrateRTDButton extends React.Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick(event) {
    Axios({
      method: 'post',
      url: '/server/calibrateRtd',
      data: {
        title: this.props.type.title,
      }
    })
      .then((res) => {
        if(res.data.results === 'Success') {
          alert(this.props.type.title +
            ' successful.');
        }
        else {
          alert('Calibration Unsuccessful. Please try again.');
        }
      })
  }

  render() {
    let { title } = this.props.type;
    return (
      <div>
        <h4>{title}</h4>
        <Button onClick={this.handleClick} size='250'>Press To Calibrate</Button>
      </div>
    );
  }
}
