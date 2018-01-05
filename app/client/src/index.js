import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import MainRouter from './Router';
import registerServiceWorker from './registerServiceWorker';
import '../node_modules/bootstrap/dist/css/bootstrap.css';

ReactDOM.render(<MainRouter />, document.getElementById('root'));
registerServiceWorker();
