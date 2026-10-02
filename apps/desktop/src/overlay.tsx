import React from 'react';
import ReactDOM from 'react-dom/client';
import NotificationOverlay from './pages/NotificationOverlay';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <NotificationOverlay />
  </React.StrictMode>
);
