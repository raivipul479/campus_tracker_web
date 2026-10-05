import React, { useState } from 'react';
import '../assets/global.css';
import { CONTACT, PublicIcon, PublicPage } from '../components/PublicPage.jsx';

// Public page — rendered outside AdminApp's session gate (see main.jsx), like
// the privacy policy. App-store listings ask for a support URL that works
// without credentials.
//
// The form does not post anywhere: the backend has no endpoint for messages.
// It builds a mailto: link with everything filled in and hands it to the
// visitor's mail app, so nothing is stored by us until they press send there.

const TOPICS = [
  {
    icon: 'phone',
    title: 'Parents',
    text: 'Trouble signing in to the app, a child missing from your account, wrong pickup details, or bus tracking not showing.'
  },
  {
    icon: 'driver',
    title: 'Drivers',
    text: 'The student roster for your vehicle looks wrong, or you cannot log a pickup or drop.'
  },
  {
    icon: 'money',
    title: 'Fees',
    text: 'Questions about an amount due, a payment that is not showing, or the distance slab your fee is based on.'
  },
  {
    icon: 'school',
    title: 'Schools',
    text: 'Setting up Adimove for your school, dashboard access for staff, or importing student lists.'
  }
];

const ROLES = ['Parent', 'Driver', 'School staff', 'Other'];
const SUBJECTS = ['App sign-in', 'Bus tracking', 'Student details', 'Fees and payments', 'Privacy request', 'Something else'];

function ContactForm() {
  const [form, setForm] = useState({ name: '', role: ROLES[0], phone: '', subject: SUBJECTS[0], message: '' });
  const [opened, setOpened] = useState(false);
  const set = field => event => setForm(current => ({ ...current, [field]: event.target.value }));

  const submit = event => {
    event.preventDefault();
    const details = [
      `Name: ${form.name.trim()}`,
      `I am a: ${form.role}`,
      form.phone.trim() && `Phone registered with the school: ${form.phone.trim()}`
    ].filter(Boolean);
    const body = `${form.message.trim()}\n\n—\n${details.join('\n')}`;
    const subject = `[Adimove] ${form.subject}`;
    window.location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setOpened(true);
  };

  return (
    <form className="contact-form" onSubmit={submit}>
      <div className="contact-form-row">
        <label>
          <span>Your name</span>
          <input value={form.name} onChange={set('name')} maxLength={120} autoComplete="name" required/>
        </label>
        <label>
          <span>I am a</span>
          <select value={form.role} onChange={set('role')}>
            {ROLES.map(role => <option key={role}>{role}</option>)}
          </select>
        </label>
      </div>
      <div className="contact-form-row">
        <label>
          <span>Phone registered with the school <small>(optional)</small></span>
          <input value={form.phone} onChange={set('phone')} inputMode="tel" maxLength={20} autoComplete="tel"
            placeholder="Helps us find your account"/>
        </label>
        <label>
          <span>Subject</span>
          <select value={form.subject} onChange={set('subject')}>
            {SUBJECTS.map(subject => <option key={subject}>{subject}</option>)}
          </select>
        </label>
      </div>
      <label>
        <span>Message</span>
        <textarea value={form.message} onChange={set('message')} rows={6} maxLength={2000} required
          placeholder="Tell us what happened. For a child's record, include their name and class."/>
      </label>
      <div className="contact-form-actions">
        <button type="submit" className="contact-submit"><PublicIcon name="send" size={16}/>Open in email app</button>
        <p>Opens your email app with this message filled in. Nothing is sent until you press send there.</p>
      </div>
      {opened && <p className="contact-form-note" role="status">
        If no email app opened, write to <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> directly.
      </p>}
    </form>
  );
}

export default function ContactUs() {
  return (
    <PublicPage>
      <div className="policy-hero">
        <span className="policy-badge">Support</span>
        <h1>Contact us</h1>
        <p className="policy-lede">
          Questions about the Adimove app, bus tracking, transport fees, or the information we hold
          about you. Parents, drivers and school staff can all reach us here.
        </p>
      </div>

      <div className="contact-cards">
        <a className="contact-card" href={`mailto:${CONTACT.email}`}>
          <span className="policy-tile-ic"><PublicIcon name="mail" size={20}/></span>
          <div>
            <strong>Email</strong>
            <p>{CONTACT.email}</p>
          </div>
        </a>
        {CONTACT.phone && (
          <a className="contact-card" href={`tel:${CONTACT.phone.replace(/[^\d+]/g, '')}`}>
            <span className="policy-tile-ic"><PublicIcon name="call" size={20}/></span>
            <div>
              <strong>Phone</strong>
              <p>{CONTACT.phone}</p>
            </div>
          </a>
        )}
        {CONTACT.address && (
          <div className="contact-card">
            <span className="policy-tile-ic"><PublicIcon name="pin" size={20}/></span>
            <div>
              <strong>Address</strong>
              <p>{CONTACT.address}</p>
            </div>
          </div>
        )}
        <div className="contact-card">
          <span className="policy-tile-ic"><PublicIcon name="clock" size={20}/></span>
          <div>
            <strong>Response time</strong>
            <p>We aim to reply within 2 working days.</p>
          </div>
        </div>
      </div>

      <div className="contact-layout">
        <section className="policy-section">
          <h2><span className="policy-num">01</span>What we can help with</h2>
          <div className="policy-grid">
            {TOPICS.map(topic => (
              <div className="policy-tile" key={topic.title}>
                <span className="policy-tile-ic"><PublicIcon name={topic.icon}/></span>
                <div>
                  <strong>{topic.title}</strong>
                  <p>{topic.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="policy-callout">
            <PublicIcon name="shield" size={20}/>
            <p>
              <strong>Bus running late or an emergency on the road?</strong> Call your school's transport
              office directly — email is not watched around the clock.
            </p>
          </div>
        </section>

        <section className="policy-section" id="write">
          <h2><span className="policy-num">02</span>Send us a message</h2>
          <ContactForm/>
        </section>

        <section className="policy-section">
          <h2><span className="policy-num">03</span>Your data</h2>
          <p>
            To see, correct or delete the information we hold about you or your child, choose
            "Privacy request" as the subject above. Our <a href="/privacy">privacy policy</a> explains
            what we collect and why.
          </p>
        </section>
      </div>
    </PublicPage>
  );
}
