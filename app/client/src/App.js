import React, { Component } from 'react';
import './App.css';
import {
  Container
} from 'reactstrap';
import LmpNavbar from './nav';
import TempGraph from './tempGraph';
import ConfigScreen from './configScrn';
import {
  Route,
  Switch
} from 'react-router-dom';
class App extends Component {
  constructor(props) {
    super(props);
      // Generate multiple lines of data

    this.state = {
      types: [
        {
          title: 'Heater Melt Temp Setpoint',
          boilerplate: '550'
        },
        {
          title: 'Heater Release Temp Setpoint',
          boilerplate: '120'
        },
        {
          title: 'Heater Maximum On Time',
          boilerplate: '30'
        },
        {
          title: 'Heater Dwell Time',
          boilerplate: '0'
        },
        {
          title: 'Calibrate RTD'
        }
      ],
      showToolTip: false,
      componentWidth: 300
    };
  }

  render() {
    return (
      <div className="App" fluid='true'>
        <LmpNavbar />
        <Container>
          <Switch>
            <Route path='/config' render={(props) => (
                <ConfigScreen types={this.state.types} />
            )}/>
          <Route exact path="/" component={TempGraph}/>
          </Switch>
        </Container>
      </div>
    );
  }
}

export default App;
