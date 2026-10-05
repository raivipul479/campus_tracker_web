import React from 'react';
import '../assets/global.css';
import { CONTACT, PublicIcon as PolicyIcon, PublicPage } from '../components/PublicPage.jsx';

// Public page — deliberately rendered outside AdminApp's session gate (see
// main.jsx). An app-store listing has to be able to reach this URL without
// credentials, which is the main reason it exists.
//
// The sections describe what this system actually collects. They are not a
// substitute for legal advice — have someone qualified review the wording.
//
// Contact details live in components/PublicPage.jsx, shared with /contact.

const LAST_UPDATED = '30 August 2026';

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
    <PublicPage>
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
                  <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
                  {CONTACT.phone && <><br/>{CONTACT.phone}</>}
                  {CONTACT.address && <><br/>{CONTACT.address}</>}
                </p>
              </div>
            </div>
            <p>For anything else, see our <a href="/contact">contact page</a>.</p>
          </section>
        </article>
      </div>
    </PublicPage>
  );
}
