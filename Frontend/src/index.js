import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import "@fontsource/lora";
import "@fontsource/lora/700.css";
import "@fontsource/merriweather";
import "@fontsource/merriweather/700.css"

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Web vitals disabled to keep bundle lean during development.
