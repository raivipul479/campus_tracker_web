import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppErrorBoundary } from './components/AppErrorBoundary.jsx';
import AdminApp from './pages/AdminApp.jsx';
import ContactUs from './pages/ContactUs.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';

// The admin UI is a single gated page tree rather than a router, so routing
// here is a plain pathname check — no react-router dependency for a couple of
// static pages. nginx serves index.html for unknown paths (see nginx.conf), so
// /privacy and /contact deep-link correctly instead of 404ing.
//
// The public pages render *outside* AdminApp on purpose: they must be readable
// without logging in, which is the point of a published privacy policy and
// support page.
const path = window.location.pathname.replace(/\/+$/, '').toLowerCase();
const PUBLIC_PAGES = {
  '/privacy': PrivacyPolicy,
  '/privacy-policy': PrivacyPolicy,
  '/contact': ContactUs,
  '/contact-us': ContactUs
};
const Page = PUBLIC_PAGES[path] ?? AdminApp;

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <Page />
    </AppErrorBoundary>
  </React.StrictMode>
);
