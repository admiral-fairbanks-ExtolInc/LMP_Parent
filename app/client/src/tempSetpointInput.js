import React from 'react';
import { InputGroup, InputGroupAddon, InputGroupButton, Input, Button } from 'reactstrap';
const Axios = require('axios');

export default class TempInput extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      value: 0
    }
    this.updateValue = this.updateValue.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  updateValue(event) {
    this.setState({value: event.target.value});
  }

  handleSubmit(event) {
    Axios({
      method: 'post',
      url: '/server/updateSetpoint',
      data: {
        title: this.props.type.title,
        value: this.state.value
      }
    })
      .then((res) => {
        if(res.data.results === 'Success') {
          alert(this.props.type.title +
            ' was changed. New value: ' + this.state.value);
        }
        else {
          alert('Setpoint Change Unsuccessful. Please try again.');
        }
      })
  }

  render() {
    let { title, boilerplate } = this.props.type;
    return (
      <div>
        <h4>{title}</h4>
        <InputGroup size='100'>
          <InputGroupButton onClick={this.handleSubmit}><Button>Submit</Button></InputGroupButton>
          <Input placeholder={boilerplate} onChange={this.updateValue} type='number' step='10' />
          <InputGroupAddon>℉</InputGroupAddon>
        </InputGroup>
      </div>
    );
  }
}
