import React, { Component } from 'react';
import './App.css';
import '/home/pi/LMP_Parent/app/client/node_modules/@mobiscroll/react/dist/css/mobiscroll.min.css';
import {
  Container
} from 'reactstrap';
import LmpNavbar from './nav';
import RealtimeGraph from './realtimeGraph';
import HistoricalGraph from './historicalGraph';
import ConfigScreen from './configScrn';
import {
  BrowserRouter as Router,
  Route,
  Switch
} from 'react-router-dom';
import '../node_modules/react-touch-screen-keyboard/lib/Keyboard.css';
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
            <Route exact path='/config' render={(props) => (
                <ConfigScreen types={this.state.types} temp={{a:1}}/>
            )} temp={{a:1}}/>
            <Route exact path="/" component={RealtimeGraph} 
              temp={{a:1}}/>
            <Route exact path="/datalog" component={HistoricalGraph}
              temp={{a:1}}/>
          </Switch>
        </Container>
      </div>
    );
  }
}

export default App;
