import React from 'react';
import { Row, Col, InputGroup, InputGroupAddon, InputGroupButton, Input, Button } from 'reactstrap';
import KeyboardedInput from 'react-touch-screen-keyboard';
import './Keyboard.css';
import NumPad from 'react-numpad';
const Axios = require('axios');

export default class TempInput extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      values: [0, 0, 0, 0]
    }
    this.handleValueChange = this.handleValueChange.bind(this);
  }

  handleValueChange(val, ind) {
    let v = this.state.values.slice();
    v[ind] = val;
    this.setState({values: v});
  }

  handleSetpointChange(ind) {
    Axios({
      method: 'post',
      url: '/server/updateSetpoint',
      data: {
        title: this.props.types[ind].title,
        value: this.state.values[ind]
      }
    })
      .then((res) => {
        if(res.data.results === 'Success') {
          alert(this.props.types[ind].title +
            ' was changed. New value: ' + this.state.values[ind]);
        }
        else {
          alert('Setpoint Change Unsuccessful. Please try again.');
        }
      })
  }

  render() {
    return (
      <div>
        <Row>
          <Col>
            <NumPad.PositiveIntegerNumber
              onChange={(value) => { this.handleValueChange(value, 0); }}
              placeholder={this.props.types[0].boilerplate}
              theme={'orange'}
              label={this.props.types[0].title}
            />
            <InputGroupButton onClick={this.handleSetpointChange.bind(this, 0)}><Button>Submit</Button></InputGroupButton>
            <NumPad.PositiveIntegerNumber
              onChange={(value) => { this.handleValueChange(value, 1); }}
              placeholder={this.props.types[1].boilerplate}
              theme={'orange'}
              label={this.props.types[1].title}
            />
            <InputGroupButton onClick={this.handleSetpointChange.bind(this, 1)}><Button>Submit</Button></InputGroupButton>
            <NumPad.PositiveIntegerNumber
              onChange={(value) => { this.handleValueChange(value, 2); }}
              placeholder={this.props.types[2].boilerplate}
              theme={'orange'}
              label={this.props.types[2].title}
            />
            <InputGroupButton onClick={this.handleSetpointChange.bind(this, 2)}><Button>Submit</Button></InputGroupButton>
            <NumPad.PositiveIntegerNumber
              onChange={(value) => { this.handleValueChange(value, 3); }}
              placeholder={this.props.types[3].boilerplate}
              theme={'orange'}
              label={this.props.types[3].title}
            />
            <InputGroupButton onClick={this.handleSetpointChange.bind(this, 3)}><Button>Submit</Button></InputGroupButton>
          </Col>
        </Row>
      </div>
    );
  }
}
