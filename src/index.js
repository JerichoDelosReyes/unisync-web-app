import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Clear stored session on fresh app start (remove this line after testing if you want persistent login)
// To enable auto-login on refresh, comment out the next line:
// localStorage.removeItem('unisync_user');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
