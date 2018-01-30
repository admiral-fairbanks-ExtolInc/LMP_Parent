import React from 'react';
import { Collapse, Navbar, NavbarToggler, NavbarBrand, Nav, NavItem, NavLink as NavLinkRS } from 'reactstrap';
import {
  BrowserRouter as Router,
  Link
} from 'react-router-dom';

export default class LmpNav extends React.Component {
  constructor(props) {
    super(props);

    this.toggle = this.toggle.bind(this);
    this.state = {
      isOpen: false
    };
  }
  toggle() {
    this.setState({
      isOpen: !this.state.isOpen
    });
  }
  render() {
    return (
      <div>
        <Navbar color="info" light expand="md">
          <NavbarBrand href="/">LMP WEBSERVER</NavbarBrand>
          <NavbarToggler onClick={this.toggle} />
          <Collapse isOpen={this.state.isOpen} navbar>
            <Nav className="ml-auto" navbar>
              <Router>
                <div>
                  <NavItem>
                    <NavLinkRS href='/'>Home</NavLinkRS>
                  </NavItem>
                  <NavItem>
                    <NavLinkRS href='/config'>Settings</NavLinkRS>
                  </NavItem>
                  <NavItem>
                    <NavLinkRS href='/datalog'>Process Monitoring</NavLinkRS>
                  </NavItem>
                </div>
              </Router>
            </Nav>
          </Collapse>
        </Navbar>
      </div>
    );
  }
}
