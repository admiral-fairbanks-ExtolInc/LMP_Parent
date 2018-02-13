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
import '../node_modules/react-touch-screen-keyboard/lib/Keyboard.css';
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
          individuallyTracked: 0
        },
        {
          title: 'Heater Release Temp Setpoint',
          settingTitle: 'settings.releaseTemp',
          settingToChange: '1',
          boilerplate: '120',
          individuallyTracked: 0
        },
        {
          title: 'Heater Maximum On Time',
          settingTitle: 'settings.maxHeaterOnTime',
          settingToChange: '2',
          boilerplate: '30',
          individuallyTracked: 1
        },
        {
          title: 'Heater Dwell Time',
          settingTitle: 'settings.dwellTime',
          settingToChange: '3',
          boilerplate: '0',
          individuallyTracked: 1
        },
        {
          title: 'Calibrate RTD'
        }
      ],
      systemData: {
        max: 0
      }
      componentWidth: 300
    };
  }

  componentDidMount() {
    fetch('/server/getSystemData', {
      accept: 'application/json'
    }).then((response) => {
      if (response.status >= 200 && response.status < 300) {
        return response;
      }
      const error = new Error(`HTTP Error ${response.statusText}`);
      error.status = response.statusText;
      error.response = response;
      throw error;
    }).then((response) => {
      return response.json();
    }).then((res) => {
      let newSystemData = this.state.systemData;
      newSystemData = res;
      this.setState({systemData.max: newSystemData})
    });
  }

  render() {
    return (
      <div className="App" fluid='true'>
        <LmpNavbar />
        <Container>
          <Switch>
            <Route exact path='/config' render={(props) => (
              <ConfigScreen
                types={this.state.types}
                max = {this.state.systemData.max}
                temp={{a:1}}
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
