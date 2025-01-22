import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import Pools from './pages/pools.jsx';
import Psteps from './pages/psteps.jsx';

// Polyfills
import { Buffer } from 'buffer';
import process from 'process';
import util from 'util';

// Set up global polyfills
window.global = window;
window.Buffer = Buffer;
window.process = process;
window.util = util;

// Additional necessary globals
if (typeof global === 'undefined') {
  window.global = window;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="pools" element={<Psteps />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);