import React from 'react';
import '../assets/global.css';
import { AdimoveLogo } from '../components/AdimoveLogo.jsx';

// Public page — deliberately rendered outside AdminApp's session gate (see
// main.jsx). An app-store listing has to be able to reach this URL without
// credentials, which is the main reason it exists.
//
// TODO before publishing: replace every [BRACKETED] placeholder below with the
// school's real legal name, address and contact details, and have someone
// qualified review the wording. The sections describe what this system
// actually collects — they are not a substitute for legal advice.

const LAST_UPDATED = '11 August 2026';

const CONTACT = {
  organisation: '[SCHOOL LEGAL NAME]',
  email: '[privacy@yourschool.example]',
  phone: '[+91 XXXXXXXXXX]',
  address: '[SCHOOL POSTAL ADDRESS]'
};

const PolicyIcon = ({ name, size = 18 }) => {
  const paths = {
    student: <><path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11.5V16c3 3 9 3 12 0v-4.5M22 9v6"/></>,
    phone: <><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></>,
    driver: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    money: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 12h.01M6 9h4M6 15h6"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
    mail: <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>
  };
  return <svg className="policy-ic" width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">{paths[name]}</svg>;
};

const COLLECTED = [
  { icon: 'student', title: 'Student details', text: 'Name, registration number, class and section, home address, and the distance band used to calculate fees.' },
  { icon: 'phone', title: 'Parent contact details', text: 'The phone numbers used to sign in to the mobile app and to receive notifications.' },
  { icon: 'driver', title: 'Driver details', text: 'Name, phone number, licence number, and the status of required documents.' },
  { icon: 'pin', title: 'Vehicle location', text: 'GPS positions of school vehicles while in service, so parents can see the bus approaching.' },
  { icon: 'clock', title: 'Transport records', text: 'Pickup and drop events logged by the driver, with the time and the vehicle involved.' },
  { icon: 'money', title: 'Fee records', text: 'Amounts due, payments received, and payment status.' },
  { icon: 'bell', title: 'Notification tokens', text: 'An identifier issued by the device so we can deliver push notifications. It does not identify the owner directly.' }
];

// Single source of truth: the table of contents and the body are both rendered
// from this list, so they can never drift out of sync.
const SECTIONS = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    body: (
      <p>
        Adimove is operated by {CONTACT.organisation} to manage school transport.
        {' '}{CONTACT.organisation} is the data controller for the information described here.
      </p>
    )
  },
  {
    id: 'what-we-collect',
    title: 'What we collect',
    body: (
      <>
        <p>Only what the transport service needs to operate:</p>
        <div className="policy-grid">
          {COLLECTED.map(item => (
            <div className="policy-tile" key={item.title}>
              <span className="policy-tile-ic"><PolicyIcon name={item.icon}/></span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="policy-callout">
          <PolicyIcon name="shield" size={20}/>
          <p><strong>We do not track children.</strong> Location data relates to the vehicle, never to an individual student.</p>
        </div>
      </>
    )
  },
  {
    id: 'how-we-use-it',
    title: 'How we use it',
    body: (
      <>
        <ul className="policy-list">
          <li>Showing parents where their child's vehicle is, and when pickup or drop happened.</li>
          <li>Letting drivers see the roster of students assigned to their vehicle.</li>
          <li>Calculating, recording and reminding about transport fees.</li>
          <li>Sending pickup, drop and fee-reminder notifications.</li>
          <li>Letting school administrators manage students, drivers, vehicles and routes.</li>
        </ul>
        <p>We do not use this information for advertising, and we do not sell it.</p>
      </>
    )
  },
  {
    id: 'who-can-see-it',
    title: 'Who can see it',
    body: (
      <>
        <div className="policy-roles">
          <div><strong>Parents</strong><p>Only their own children's records. Access is scoped to the phone number used to sign in.</p></div>
          <div><strong>Drivers</strong><p>Only the roster for the vehicle they are assigned to.</p></div>
          <div><strong>Administrators</strong><p>All records, as needed to run the service.</p></div>
        </div>
        <p>
          We share data with service providers only where required to deliver the service: Google
          Firebase Cloud Messaging for push notification delivery, and our GPS tracking provider for
          vehicle positions. We do not share personal information with anyone else except where the
          law requires it.
        </p>
      </>
    )
  },
  {
    id: 'how-long',
    title: 'How long we keep it',
    body: (
      <p>
        Student, parent and fee records are retained while the student is enrolled in the transport
        service, and afterwards for as long as school record-keeping and any applicable statutory
        requirements demand. Vehicle location history and transport logs are retained for a limited
        operational period. Notification tokens are deleted when a device unregisters or the token
        stops working.
      </p>
    )
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <p>
        Access to the administrator dashboard requires an authenticated account. Parent and driver
        access is limited to their own records by phone-number-scoped sessions. Passwords are stored
        hashed, never in plain text.
      </p>
    )
  },
  {
    id: 'childrens-privacy',
    title: "Children's privacy",
    body: (
      <p>
        This service is used by parents and school staff, not by children. Information about students
        is provided by the school and their parents or guardians. The mobile app is not intended for
        use by children.
      </p>
    )
  },
  {
    id: 'your-rights',
    title: 'Your rights',
    body: (
      <p>
        You may ask to see the information we hold about you or your child, to correct anything
        inaccurate, or to have information deleted where we are not required to keep it. Contact the
        school using the details below and we will respond within a reasonable period.
      </p>
    )
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        If this policy changes we will update the date at the top of this page. Significant changes
        will be communicated to parents through the school's usual channels.
      </p>
    )
  }
];

export default function PrivacyPolicy() {
  return (
    <div className="policy-page">
      <header className="policy-topbar">
        <a className="policy-brand" href="/">
          <span className="brand-mark"><AdimoveLogo size={22} title="Adimove"/></span>
          <span>Adi<b>move</b></span>
        </a>
        <a className="policy-back" href="/">Back to dashboard <PolicyIcon name="arrow" size={15}/></a>
      </header>

      <main className="policy-shell">
        <div className="policy-hero">
          <span className="policy-badge">Legal</span>
          <h1>Privacy Policy</h1>
          <p className="policy-meta">Last updated {LAST_UPDATED}</p>
          <p className="policy-lede">
            What personal information the Adimove school-transport system collects, why it is
            collected, and who it is shared with. Covers both the administrator dashboard and the
            parent and driver mobile app.
          </p>
        </div>

        <div className="policy-body">
          <nav className="policy-toc" aria-label="On this page">
            <p className="policy-toc-title">On this page</p>
            <ol>
              {SECTIONS.map(section => (
                <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>
              ))}
              <li><a href="#contact">Contact us</a></li>
            </ol>
          </nav>

          <article className="policy-content">
            {SECTIONS.map((section, index) => (
              <section className="policy-section" id={section.id} key={section.id}>
                <h2><span className="policy-num">{String(index + 1).padStart(2, '0')}</span>{section.title}</h2>
                {section.body}
              </section>
            ))}

            <section className="policy-section" id="contact">
              <h2><span className="policy-num">{String(SECTIONS.length + 1).padStart(2, '0')}</span>Contact us</h2>
              <p>Questions about this policy, or about the information we hold:</p>
              <div className="policy-contact-card">
                <span className="policy-tile-ic"><PolicyIcon name="mail" size={20}/></span>
                <div>
                  <strong>{CONTACT.organisation}</strong>
                  <p>
                    <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a><br/>
                    {CONTACT.phone}<br/>
                    {CONTACT.address}
                  </p>
                </div>
              </div>
            </section>
          </article>
        </div>
      </main>

      <footer className="policy-foot">
        <span>&copy; {new Date().getFullYear()} {CONTACT.organisation}</span>
        <a href="/">Adimove dashboard</a>
      </footer>
    </div>
  );
}
