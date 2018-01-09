import React from 'react';
import KeyboardedInput from 'react-touch-screen-keyboard';
import '../node_modules/react-touch-screen-keyboard/lib/Keyboard.css';

class InputWithKeyboard extends React.Component {
  render() {
    return (
      <KeyboardedInput
        enabled
        type={this.props.type}
        onChange={this.props.onChange}
        value={this.props.value}
        placeholder={this.props.placeholder}
        defaultKeyboard="us"
        opacity={0.75} // optional
      />
    );
  }
}
export default InputWithKeyboard;
