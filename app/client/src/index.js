import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import MainRouter from './Router';
import registerServiceWorker from './registerServiceWorker';
import '../node_modules/bootstrap/dist/css/bootstrap.css';
import '../node_modules/react-touch-screen-keyboard/lib/Keyboard.css';
import '../node_modules/react-touch-screen-keyboard/lib/Keyboard.scss';

ReactDOM.render(<MainRouter />, document.getElementById('root'));
registerServiceWorker();
