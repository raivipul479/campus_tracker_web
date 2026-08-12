import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppErrorBoundary } from './components/AppErrorBoundary.jsx';
import AdminApp from './pages/AdminApp.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';

// The admin UI is a single gated page tree rather than a router, so routing
// here is a plain pathname check — no react-router dependency for one static
// page. nginx serves index.html for unknown paths (see nginx.conf), so
// /privacy deep-links correctly instead of 404ing.
//
// PrivacyPolicy renders *outside* AdminApp on purpose: it must be readable
// without logging in, which is the point of a published privacy policy.
const path = window.location.pathname.replace(/\/+$/, '').toLowerCase();
const isPrivacy = path === '/privacy' || path === '/privacy-policy';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      {isPrivacy ? <PrivacyPolicy /> : <AdminApp />}
    </AppErrorBoundary>
  </React.StrictMode>
);
