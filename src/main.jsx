import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppErrorBoundary } from './components/AppErrorBoundary.jsx';
import AdminApp from './pages/AdminApp.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AdminApp />
    </AppErrorBoundary>
  </React.StrictMode>
);
