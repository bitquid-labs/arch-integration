import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import Pools from './pages/pools.jsx';
import Psteps from './pages/psteps.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        {/* <Route path="pools" element={<Pools />} /> */}
        <Route path="pools" element={<Psteps />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
