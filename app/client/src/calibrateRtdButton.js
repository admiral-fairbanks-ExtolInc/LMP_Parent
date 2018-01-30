import React from 'react';
import { Row, Col, Button } from 'reactstrap';
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
      <Row>
        <Col>
          <Button onClick={this.handleClick} size='250'>Calibrate RTD</Button>
        </Col>
      </Row>
    );
  }
}
