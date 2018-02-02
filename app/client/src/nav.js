import React from 'react';
import { Collapse,
  Navbar,
  NavbarBrand,
  Nav,
  NavItem,
  NavLink as NavLinkRS,
  Button,
} from 'reactstrap';
import {
  BrowserRouter as Router,
} from 'react-router-dom';
import extolLogo from './extolLogo.jpg';
import mobiscroll from '/home/pi/LMP_Parent/app/client/node_modules/@mobiscroll/react/dist/js/mobiscroll.react.min.js';

export default class LmpNav extends React.Component {
  constructor(props) {
    super(props);

    this.toggle = this.toggle.bind(this);
    this.state = {
      isOpen: false,
      isActive: [false, false, false]
    };
  }
  toggle() {
    this.setState({
      isOpen: !this.state.isOpen
    });
  }
  render() {
    return (
      <Router>
        <div>
          <Navbar color="info" light toggleable>
            <NavbarBrand href="/">
              <img src={extolLogo} style={{ width:150 }} />
            </NavbarBrand>
              <Nav pills={true}>
                <NavItem>
                  <NavLinkRS href='/' active={this.state.isActive[0]}>
                    Home
                  </NavLinkRS>
                </NavItem>
                <NavItem>
                  <NavLinkRS href='/config' active={this.state.isActive[1]}>
                    Settings
                  </NavLinkRS>
                </NavItem>
                <NavItem>
                  <NavLinkRS href='/datalog' active={this.state.isActive[2]}>
                    Process Monitoring
                  </NavLinkRS>
                </NavItem>
                <NavItem>
                  <NavLinkRS href='/admin' active={this.state.isActive[2]}>
                    Administration
                  </NavLinkRS>
                </NavItem>
              </Nav>
          </Navbar>
        </div>
      </Router>
    );
  }
}
