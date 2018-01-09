import React from 'react';
import { InputGroup,
  InputGroupAddon,
  InputGroupButton,
  Input,
  Button
} from 'reactstrap';
import InputWithKeyboard from './keyboardInput.js';
import '../node_modules/react-touch-screen-keyboard/lib/Keyboard.css';
const Axios = require('axios');

export default class SetpointInput extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      value: 0
    }
    this.updateValue = this.updateValue.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleValueChange = this.handleValueChange.bind(this);
  }

  updateValue(event) {
    this.setState({value: event.target.value});
  }

  handleValueChange(val) {
    this.setState({ value: val });
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
        <InputGroup size='lg'>
          <InputGroupButton onClick={this.handleSubmit}><Button>Submit</Button></InputGroupButton>
          <InputWithKeyboard
            value={this.state.value}
            placeholder={boilerplate}
            onChange={(value) => { this.handleValueChange(value); }}
            type='number'
          />
          <InputGroupAddon>Sec</InputGroupAddon>
        </InputGroup>
      </div>
    );
  }
}
