import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import Config from './config';
import registerServiceWorker from './registerServiceWorker';
import '../node_modules/bootstrap/dist/css/bootstrap.css';

ReactDOM.render(<Config />, document.getElementById('config'));
registerServiceWorker();
