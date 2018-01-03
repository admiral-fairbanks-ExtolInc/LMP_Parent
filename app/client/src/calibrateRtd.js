import React from 'react';
import { InputGroup, InputGroupAddon, InputGroupButton, Input, Button } from 'reactstrap';
const Axios = require('axios');

export default class CalibrateRTDButton extends React.Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick(event) {
    const packet = {
      title: this.props.type.title,
    }
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
    let { submitFcn } = this.props;
    return (
      <div>
        <h4>{title}</h4>
        <Button onClick={this.handleClick} size='100'></Button>
      </div>
    );
  }
}
