import React from 'react';
import { AdimoveLogo } from './AdimoveLogo.jsx';

// Shared frame for the public pages (/privacy, /contact). They render outside
// AdminApp's session gate (see main.jsx), so nothing here may depend on a
// logged-in session.

// Single source for the published contact details, so the privacy policy and
// the contact page can never disagree. Phone and address are optional; leave
// them empty and every page simply omits the line rather than printing a
// placeholder.
export const CONTACT = {
  organisation: 'Adimove',
  email: 'raivipul479@gmail.com',
  phone: '',
  address: ''
};

export const PublicIcon = ({ name, size = 18 }) => {
  const paths = {
    student: <><path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11.5V16c3 3 9 3 12 0v-4.5M22 9v6"/></>,
    phone: <><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></>,
    call: <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/></>,
    driver: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    money: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 12h.01M6 9h4M6 15h6"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
    mail: <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></>,
    school: <><path d="M3 21h18M5 21V10l7-5 7 5v11"/><path d="M10 21v-5h4v5"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>
  };
  return <svg className="policy-ic" width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">{paths[name]}</svg>;
};

export function PublicPage({ children }) {
  return (
    <div className="policy-page">
      <header className="policy-topbar">
        <a className="policy-brand" href="/">
          <span className="brand-mark"><AdimoveLogo size={22} title="Adimove"/></span>
          <span>Adi<b>move</b></span>
        </a>
        <a className="policy-back" href="/">Back to dashboard <PublicIcon name="arrow" size={15}/></a>
      </header>

      <main className="policy-shell">{children}</main>

      <footer className="policy-foot">
        <span>&copy; {new Date().getFullYear()} {CONTACT.organisation}</span>
        <nav className="policy-foot-links">
          <a href="/privacy">Privacy policy</a>
          <a href="/contact">Contact us</a>
          <a href="/">Adimove dashboard</a>
        </nav>
      </footer>
    </div>
  );
}
