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
import AdminScreen from './adminScrn';
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
          settingTitle: 'settings.meltTemp',
          settingToChange: '0',
          boilerplate: '550',
          individuallyTracked: 1
        },
        {
          title: 'Heater Release Temp Setpoint',
          settingTitle: 'settings.releaseTemp',
          settingToChange: '1',
          boilerplate: '120',
          individuallyTracked: 1
        },
        {
          title: 'Heater Maximum On Time',
          settingTitle: 'settings.maxHeaterOnTime',
          settingToChange: '2',
          boilerplate: '30',
          individuallyTracked: 0
        },
        {
          title: 'Heater Dwell Time',
          settingTitle: 'settings.dwellTime',
          settingToChange: '3',
          boilerplate: '0',
          individuallyTracked: 0
        },
        {
          title: 'Calibrate RTD'
        }
      ],
      componentWidth: 300
    };
  }

  render() {
    const theme = {
      upperRow: {
        border: '3px solid #4775d1',
        borderRadius: '15px'
      }
    }
    return (
      <div className="App" fluid='true'>
        <LmpNavbar />
        <Container>
          <Switch>
            <Route exact path='/config' render={(props) => (
              <ConfigScreen
                types={this.state.types}
                temp={{a:1}}
                theme={theme}
              />
            )} temp={{a:1}}/>
            <Route exact path="/" component={RealtimeGraph}
              temp={{a:1}}/>
            <Route exact path="/datalog" component={HistoricalGraph}
              temp={{a:1}}/>
            <Route exact path='/admin' render={(props) => (
                <AdminScreen types={this.state.types} temp={{a:1}}/>
            )} temp={{a:1}}/>
          </Switch>
        </Container>
      </div>
    );
  }
}

export default App;
