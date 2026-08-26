import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../assets/global.css';
import { Pill } from '../components/Pill.jsx';
import { AdimoveLogo } from '../components/AdimoveLogo.jsx';
import { useDebouncedEffect } from '../hooks/useDebouncedEffect.js';
import { campusService as api } from '../services/campusService.js';
import { clearStoredSession, getStoredSession, SESSION_EXPIRED_EVENT, setStoredSession } from '../api/client.js';
import { amountsEqual, currentMonthKey, currentMonthLabel, dash, dateInputValue, formatCurrency, initialsFor, parseAmount, quarterKeyForDate, roundToPaise, safeText } from '../utils/formatters.js';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
let googleMapsPromise;

function loadGoogleMaps() {
  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error('Google Maps API key is not configured.'));
  }
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error('Google Maps could not be loaded.'));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

const busMarkerIcon = L.divIcon({
  className: 'leaflet-bus-marker',
  html: '<span>Bus</span>',
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  popupAnchor: [0, -18]
});

const Icon = ({ name, size = 19 }) => {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    bus: <><path d="M5 17V5c0-2 2-3 7-3s7 1 7 3v12"/><path d="M5 10h14M7 17h10M7 21v-2m10 2v-2"/><circle cx="8" cy="14" r="1"/><circle cx="16" cy="14" r="1"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    student: <><path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11.5V16c3 3 9 3 12 0v-4.5M22 9v6"/></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    money: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 12h.01M6 9h4M6 15h6"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9v-.09A1.7 1.7 0 0 0 7.9 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 3.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2V9h.09A1.7 1.7 0 0 0 3.6 7.9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8 3.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2H14v.09A1.7 1.7 0 0 0 15.1 3.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 20.4 8c.14.36.35.69.6 1 .3.3.68.47 1.1.5h.1V14h-.09A1.7 1.7 0 0 0 20.6 15Z"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    arrow: <><path d="m9 18 6-6-6-6"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    route: <><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h3a3 3 0 0 0 3-3v-1a3 3 0 0 0-3-3h-1a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h6"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    close: <><path d="M18 6 6 18M6 6l12 12"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    down: <><path d="m6 9 6 6 6-6"/></>,
    check: <><path d="m5 12 4 4L19 6"/></>,
    alert: <><path d="M10.3 3.6 2.2 18a2 2 0 0 0 1.8 3h16a2 2 0 0 0 1.8-3L13.7 3.6a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></>,
    refresh: <><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></>,
    upload: <><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></>
  };
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
};

const nav = [
  ['Overview', 'grid'], ['Live tracking', 'pin'], ['Routes', 'route'], ['Vehicles', 'bus'], ['Drivers', 'users'],
  ['Students', 'student'], ['Fees & payments', 'money'], ['Attendance', 'check'], ['Documents', 'file'], ['Notifications', 'bell']
];

const SCHOOL_LOCATION = { lat: 26.9124, lng: 75.7873 };

const demoVehiclePoints = vehicles => vehicles.map(vehicle => ({
  id: vehicle.id,
  vehicleNo: vehicle.id,
  alias: vehicle.route,
  latitude: SCHOOL_LOCATION.lat + ((50 - Number(vehicle.y || 50)) * 0.002),
  longitude: SCHOOL_LOCATION.lng + ((Number(vehicle.x || 50) - 50) * 0.002),
  speed: Number(vehicle.speed || 0),
  ignition: vehicle.status === 'On route',
  timestamp: null
}));


function Sidebar({ active, setActive, open, setOpen, admin, onLogout }) {
  return <aside className={`sidebar ${open ? 'open' : ''}`}>
    <div className="brand"><span className="brand-mark"><AdimoveLogo size={22} title="Adimove"/></span><div>Adi<span>move</span><small>School transport</small></div></div>
    <button className="close-menu" onClick={() => setOpen(false)}><Icon name="close"/></button>
    <div className="nav-label">Workspace</div>
    <nav>{nav.map(([label, icon]) => <button key={label} className={active === label ? 'active' : ''} onClick={() => { setActive(label); setOpen(false); }}><Icon name={icon}/><span>{label}</span></button>)}</nav>
    <div className="sidebar-bottom">
      <button onClick={() => setActive('Settings')}><Icon name="settings"/><span>Settings</span></button>
      <div className="profile"><div className="avatar dark">{initialsFor(admin?.name || admin?.email || 'SA')}</div><div><strong>{admin?.name || 'Super Admin'}</strong><small>{admin?.email || 'Administrator'}</small></div><button className="logout-mini" onClick={onLogout} title="Logout"><Icon name="close" size={15}/></button></div>
    </div>
  </aside>;
}

const emptyForm = fields => Object.fromEntries(fields.map(field => [field.name, field.defaultValue || '']));

// Stored phones are E.164 (e.g. "+919928515725"); phone fields only accept a bare
// 10-digit local number, so strip any country code before prefilling an edit form.
const stripToLast10Digits = value => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const compareSortValues = (a, b) => {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  const numA = Number(a);
  const numB = Number(b);
  if (a !== '' && b !== '' && !Number.isNaN(numA) && !Number.isNaN(numB)) {
    return numA - numB;
  }
  return safeText(a).localeCompare(safeText(b), undefined, { sensitivity: 'base', numeric: true });
};

const formatHistoryDate = value => value
  ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '-';

function useAssignmentHistory(fetcher, mapRow) {
  const [history, setHistory] = useState(null);
  const open = async (row, title, subtitle) => {
    setHistory({ title, subtitle, rows: [], loading: true, error: '' });
    try {
      const rawRows = await fetcher(row);
      setHistory({ title, subtitle, rows: rawRows.map(mapRow), loading: false, error: '' });
    } catch (error) {
      setHistory({ title, subtitle, rows: [], loading: false, error: error.message || 'Unable to load history.' });
    }
  };
  return { history, openHistory: open, closeHistory: () => setHistory(null) };
}

function SearchableSelect({ field, value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const options = field.options || [];
  const filteredOptions = options
    .filter(option => safeText(option).toLowerCase().includes(safeText(query).toLowerCase()))
    .slice(0, 8);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  return <div className="searchable-select">
    <div className="searchable-input">
      <Icon name="search" size={16}/>
      <input
        value={query}
        onChange={event => {
          setQuery(event.target.value);
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={field.placeholder || 'Search student...'}
        required={field.required}
      />
    </div>
    {open && <div className="searchable-menu">
      {filteredOptions.length
        ? filteredOptions.map(option => <button
            type="button"
            key={safeText(option)}
            onMouseDown={event => {
              event.preventDefault();
              const optionText = safeText(option);
              setQuery(optionText);
              onChange(optionText);
              setOpen(false);
            }}
          >{safeText(option)}</button>)
        : <span>No student found</span>}
    </div>}
  </div>;
}

// The ladder the transport sheet uses. Offered as one click because every route
// has the same shape and only the prices differ.
const STANDARD_SLABS = [[1, 10], [11, 20], [21, 30]];

const slabLabel = slab => `${slab.minKm}-${slab.maxKm} km · ${formatCurrency(slab.fee)}`;

// The slab select is valued by slab id. Undefined lets the server pick when a
// route has a single slab, and reject the ambiguity when it has several.
const slabIdFrom = value => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

// Slab options for whichever route is currently picked in a form.
const slabOptionsForRoute = (routes, routeCode) => {
  const route = routes.find(item => item.id === routeCode);
  return (route?.slabs ?? []).map(slab => ({ value: String(slab.slabId), label: slabLabel(slab) }));
};

/**
 * Distance slabs of one route.
 *
 * The route stays a single row — B-10 is B-10, one bus and one roster. These are
 * the bands it is priced in; a student is assigned to the route AND to one of
 * these, and the slab is what decides their fee.
 */
function FeeSlabEditor({ value, onChange }) {
  const slabs = Array.isArray(value) ? value : [];

  const update = (index, key, next) => onChange(slabs.map((slab, position) => (
    position === index ? { ...slab, [key]: next } : slab
  )));
  const remove = index => onChange(slabs.filter((slab, position) => position !== index));
  const add = () => {
    const last = slabs[slabs.length - 1];
    const minKm = last ? Number(last.maxKm || 0) + 1 : 1;
    onChange([...slabs, { minKm, maxKm: minKm + 9, fee: '' }]);
  };
  // Keeps any price already typed against a slab with the same starting km, so
  // filling the standard ladder is not destructive.
  const fillStandard = () => onChange(STANDARD_SLABS.map(([minKm, maxKm]) => {
    const existing = slabs.find(slab => Number(slab.minKm) === minKm);
    return existing ? { ...existing, maxKm } : { minKm, maxKm, fee: '' };
  }));

  return <div className="slab-editor">
    {slabs.length > 0 && <div className="slab-rows">
      <div className="slab-row slab-head"><span>From km</span><span>To km</span><span>Fee</span><span/></div>
      {slabs.map((slab, index) => <div className="slab-row" key={index}>
        <input type="number" min="0" max="1000" step="0.01" inputMode="decimal" value={slab.minKm ?? ''}
          onChange={event => update(index, 'minKm', event.target.value)} aria-label={`Slab ${index + 1} from km`}/>
        <input type="number" min="0" max="1000" step="0.01" inputMode="decimal" value={slab.maxKm ?? ''}
          onChange={event => update(index, 'maxKm', event.target.value)} aria-label={`Slab ${index + 1} to km`}/>
        <input type="number" min="0" max="99999999.99" step="0.01" inputMode="decimal" value={slab.fee ?? ''}
          onChange={event => update(index, 'fee', event.target.value)} aria-label={`Slab ${index + 1} fee`}/>
        <button type="button" className="icon-btn slab-remove" onClick={() => remove(index)} title="Remove this slab">
          <Icon name="close" size={14}/>
        </button>
      </div>)}
    </div>}

    {!slabs.length && <p className="slab-empty">
      No distance slabs — every student on this route is billed the flat fee above.
    </p>}

    <div className="slab-actions">
      <button type="button" className="filter-btn" onClick={add}><Icon name="plus" size={14}/>Add slab</button>
      <button type="button" className="filter-btn" onClick={fillStandard}>Use 1-30 km slabs</button>
      {slabs.length > 0 && <button type="button" className="filter-btn" onClick={() => onChange([])}>Clear</button>}
    </div>
  </div>;
}

function RecordModal({ title, fields, values, setValues, onClose, onSubmit, saving = false, error = '', deriveValues }) {
  const setFieldValue = (field, value) => {
    const nextValues = { ...values, [field.name]: value };
    setValues(deriveValues ? deriveValues(field.name, nextValues) : nextValues);
  };
  const updateField = (field, rawValue) => {
    setFieldValue(field, field.digitsOnly ? rawValue.replace(/\D/g, '') : rawValue);
  };
  return <div className="modal-backdrop" onClick={onClose}>
    <form className="record-modal" onSubmit={onSubmit} onClick={event => event.stopPropagation()}>
      <div className="modal-head">
        <div>
          <h2>{title}</h2>
          <p>Enter the details and save the record.</p>
        </div>
        <button type="button" className="icon-btn" onClick={onClose}><Icon name="close" size={17}/></button>
      </div>
      <div className="form-grid">
        {fields.map(field => field.type === 'slabs'
          ? <div key={field.name} className="full slab-field">
              <span className="slab-field-label">{field.label}</span>
              <FeeSlabEditor value={values[field.name]} onChange={next => setFieldValue(field, next)}/>
              {field.hint && <small className="field-hint">{field.hint}</small>}
            </div>
          : <label key={field.name} className={field.full ? 'full' : ''}>
          <span>{field.label}{field.required && <em className="required-star"> *</em>}</span>
          {field.type === 'select'
            ? field.searchable
              ? <SearchableSelect field={field} value={values[field.name] || ''} onChange={value => updateField(field, value)}/>
              : <select value={values[field.name] || ''} onChange={event => updateField(field, event.target.value)} required={field.required} disabled={field.readOnly}>
                  <option value="">Select</option>
                  {/* Grouped options render the route hierarchy: parent runs as
                      headings, their distance bands as the selectable rows. */}
                  {field.optionGroups
                    ? field.optionGroups.map(group => <optgroup key={group.label} label={group.label}>
                        {group.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </optgroup>)
                    : field.options.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
            : field.type === 'textarea'
              ? <textarea value={values[field.name] || ''} onChange={event => updateField(field, event.target.value)} required={field.required} minLength={field.minLength} maxLength={field.maxLength} title={field.title}/>
              : <input type={field.type || 'text'} value={values[field.name] || ''} onChange={event => updateField(field, event.target.value)} placeholder={field.placeholder || ''} required={field.required} min={field.min} max={field.max} step={field.step} pattern={field.pattern} minLength={field.minLength} maxLength={field.maxLength} inputMode={field.inputMode} readOnly={field.readOnly} title={field.title}/>}
          {field.hint && <small className="field-hint">{field.hint}</small>}
        </label>)}
      </div>
      {error && <div className="form-error">{error}</div>}

      <div className="modal-actions">
        <button type="button" className="filter-btn" onClick={onClose} disabled={saving}>Cancel</button>
        <button type="submit" className="primary-btn" disabled={saving}>{saving ? <span className="spinner"/> : <Icon name="check" size={16}/>}{saving ? 'Saving...' : 'Save record'}</button>
      </div>
    </form>
  </div>;
}

function HistoryModal({ title, subtitle, rows, loading, error, onClose }) {
  return <div className="modal-backdrop" onClick={onClose}>
    <div className="record-modal history-modal" onClick={event => event.stopPropagation()}>
      <div className="modal-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <button type="button" className="icon-btn" onClick={onClose}><Icon name="close" size={17}/></button>
      </div>
      <div className="history-body">
        {loading && <div className="empty small-empty loading-inline"><span className="spinner"/>Loading history...</div>}
        {!loading && error && <div className="form-error">{error}</div>}
        {!loading && !error && !rows.length && <div className="empty small-empty">No assignment history yet.</div>}
        {!loading && !error && rows.length > 0 && <table className="history-table">
          <thead><tr><th>Assigned to</th><th>From</th><th>To</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.id}>
            <td><strong>{row.label}</strong>{row.sublabel && <small className="block-small">{row.sublabel}</small>}</td>
            <td>{formatHistoryDate(row.from)}</td>
            <td>{row.to ? formatHistoryDate(row.to) : <Pill tone="green">Present</Pill>}</td>
          </tr>)}</tbody>
        </table>}
      </div>
      <div className="modal-actions">
        <button type="button" className="filter-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  </div>;
}

// RFC4180 parser. The transport sheet's addresses contain commas, embedded
// quotes ("D 803, Bhavyaa Green Luxuria...") and occasional newlines, so
// splitting on ',' silently corrupts rows.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === ',') { row.push(field); field = ''; continue; }
    if (char === '\r') continue;
    if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += char;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Columns are positional, matching the transport sheet. Header names cannot be
// used: the sheet has two "S NO." columns and two phone columns differing only
// by case, so any name-based lookup collides and loses data.
const IMPORT_COLUMNS = [
  'A  S NO.', 'B  S NO. (registration)', "C  STUDENT'S NAME", 'D  CLASS', 'E  SEC.',
  "F  FATHER'S/MOTHER'S NAME", 'G  ADDRESS', 'H  Phone Number', 'I  PHONE NUMBER',
  'J  ROUTE NO', 'K  Slab KMS', 'L  1 PM DROP', 'M  FEES'
];

// Reads the first worksheet of an .xlsx/.xls file into a 2D array of strings.
//
// raw:false formats every cell as text, which matters for phone numbers stored
// as numbers — the raw value would come through as a JS number and long ones
// can render in scientific notation.
//
// defval:'' keeps empty cells as empty strings. Without it SheetJS omits them,
// rows become ragged, and every column after a blank cell shifts left — which
// would silently attach one family's phone number to another family's child.
// SheetJS is ~350kB, and only this modal needs it, so it is imported lazily —
// the dashboard bundle stays small and the library is fetched the first time
// someone actually picks an .xlsx file.
async function readWorkbook(buffer) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('That workbook has no sheets.');
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false
  });
  return { sheetName, sheetCount: workbook.SheetNames.length, rows };
}

// Rows per request. Each student is its own transaction server-side, so a big
// sheet against a distant database can take minutes and time the request out.
// Chunking keeps every request short; partial progress is safe because the
// import is idempotent on registration number.
const IMPORT_CHUNK_SIZE = 200;

// Mirrors isHeaderRow() on the server — the sheet repeats its header at the
// start of every route block, and those rows must not be mistaken for students.
const isSheetHeaderRow = row => {
  const name = String(row?.[2] ?? '').toUpperCase();
  const serial = String(row?.[0] ?? '').toUpperCase();
  return (name.includes('STUDENT') && name.includes('NAME')) ||
    (serial === 'S NO.' && String(row?.[3] ?? '').toUpperCase() === 'CLASS');
};

// The server de-duplicates within a single request, so once the sheet is split
// into chunks the same registration number appearing in two different chunks
// would slip through and the second would silently overwrite the first. This
// catches those across the whole sheet before anything is sent.
function findDuplicateRegistrations(rows) {
  const seen = new Map();
  const duplicates = [];
  rows.forEach((row, index) => {
    if (isSheetHeaderRow(row)) return;
    const reg = String(row?.[1] ?? '').trim();
    if (!reg) return;
    const key = reg.toLowerCase();
    const first = seen.get(key);
    if (first) {
      duplicates.push({
        rowNumber: index + 1,
        reason: `duplicate registration number "${reg}", also on row ${first}`,
        preview: [reg, String(row?.[2] ?? '')].filter(Boolean).join(' | ')
      });
    } else {
      seen.set(key, index + 1);
    }
  });
  return duplicates;
}

function ImportStudentsModal({ onClose, onImported }) {
  const [fileName, setFileName] = useState('');
  const [sheetInfo, setSheetInfo] = useState(null);
  const [rows, setRows] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');

  const pickFile = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(''); setResult(null); setRows(null); setSheetInfo(null); setFileName(file.name);

    try {
      let parsed;
      if (/\.xlsx?$/i.test(file.name)) {
        const workbook = await readWorkbook(await file.arrayBuffer());
        parsed = workbook.rows;
        setSheetInfo(workbook);
      } else {
        parsed = parseCsv(await file.text());
      }
      parsed = parsed
        .map(row => (Array.isArray(row) ? row.map(cell => String(cell ?? '')) : []))
        .filter(row => row.some(cell => cell.trim() !== ''));
      if (!parsed.length) { setError('That file has no rows.'); return; }
      setRows(parsed);
    } catch (err) {
      setError(err.message || 'Could not read that file.');
    }
  };

  const run = async commit => {
    if (!rows) return;
    setBusy(true); setError(''); setResult(null);

    // Caught up front rather than per chunk — see findDuplicateRegistrations.
    const duplicates = findDuplicateRegistrations(rows);
    const duplicateRowNumbers = new Set(duplicates.map(d => d.rowNumber));
    const sendable = rows.filter((_row, index) => !duplicateRowNumbers.has(index + 1));

    const chunks = [];
    for (let i = 0; i < sendable.length; i += IMPORT_CHUNK_SIZE) {
      chunks.push({ rows: sendable.slice(i, i + IMPORT_CHUNK_SIZE), offset: i });
    }

    const totals = {
      dryRun: !commit, total: 0, valid: 0, created: 0, updated: 0,
      routesAssigned: 0, rejected: [...duplicates], sample: []
    };

    try {
      for (let i = 0; i < chunks.length; i++) {
        setProgress({ done: i, total: chunks.length });
        const response = await api.importStudents(chunks[i].rows, commit, chunks[i].offset);
        totals.total += response.total ?? 0;
        totals.valid += response.valid ?? 0;
        totals.created += response.created ?? 0;
        totals.updated += response.updated ?? 0;
        totals.routesAssigned += response.routesAssigned ?? 0;
        if (response.rejected?.length) totals.rejected.push(...response.rejected);
        if (totals.sample.length < 10 && response.sample?.length) {
          totals.sample.push(...response.sample.slice(0, 10 - totals.sample.length));
        }
        setProgress({ done: i + 1, total: chunks.length });
        setResult({ ...totals });
      }
      totals.rejected.sort((a, b) => a.rowNumber - b.rowNumber);
      setResult({ ...totals });
      if (commit) await onImported();
    } catch (err) {
      // Earlier chunks are already committed. Say so plainly — re-running is
      // safe because students are matched on registration number.
      setResult({ ...totals });
      setError(`${err.message || 'Import failed.'}${commit && totals.created + totals.updated > 0
        ? ` — ${totals.created + totals.updated} student(s) were already saved before this failed. Re-running is safe; existing rows are updated, not duplicated.`
        : ''}`);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const rejected = result?.rejected ?? [];

  return <div className="record-modal-backdrop" onClick={onClose}>
    <div className="record-modal bulk-assign-modal" onClick={event => event.stopPropagation()}>
      <div className="modal-head">
        <div>
          <h2>Import students from sheet</h2>
          <p>Upload the transport list as Excel (.xlsx) or CSV. Columns are read by position, so keep the original column order.</p>
        </div>
        <button type="button" className="icon-btn" onClick={onClose}><Icon name="close" size={16}/></button>
      </div>

      <div className="bulk-assign-body">
        <label className="import-drop">
          <input type="file" accept=".xlsx,.xls,.csv,text/csv" onChange={pickFile}/>
          <Icon name="upload" size={20}/>
          <span>{fileName || 'Choose an .xlsx or .csv file'}</span>
        </label>

        {sheetInfo && <p className="import-note">
          Reading sheet <b>{sheetInfo.sheetName}</b>
          {sheetInfo.sheetCount > 1 && ` — this workbook has ${sheetInfo.sheetCount} sheets and only the first is imported.`}
        </p>}
        {rows && !result && !progress && <p className="import-note">
          {rows.length} row(s) read, including header rows.
          {rows.length > IMPORT_CHUNK_SIZE && ` Will be sent in ${Math.ceil(rows.length / IMPORT_CHUNK_SIZE)} batches of ${IMPORT_CHUNK_SIZE}.`}
          {' '}Run a dry run to see what would be imported.
        </p>}

        {progress && <div className="import-progress">
          <div className="import-progress-bar">
            <span style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}/>
          </div>
          <p className="import-note">Batch {Math.min(progress.done + 1, progress.total)} of {progress.total} — {Math.round((progress.done / progress.total) * 100)}% complete. Leave this open.</p>
        </div>}

        {error && <p className="form-error">{error}</p>}

        {result && <div className="import-result">
          <div className="import-stats">
            <span><strong>{result.valid}</strong> valid</span>
            <span><strong>{result.created}</strong> created</span>
            <span><strong>{result.updated}</strong> updated</span>
            <span><strong>{result.routesAssigned}</strong> routes</span>
            <span className={rejected.length ? 'import-bad' : ''}><strong>{rejected.length}</strong> rejected</span>
          </div>
          {result.dryRun && <p className="import-note">Dry run — nothing was written yet.</p>}

          {result.sample?.length > 0 && <table className="import-table">
            <thead><tr><th>Reg. No.</th><th>Name</th><th>Class</th><th>Guardian</th><th>Phone</th><th>Route</th></tr></thead>
            <tbody>{result.sample.map(row => <tr key={row.registrationNumber}>
              <td>{row.registrationNumber}</td><td>{row.fullName}</td><td>{row.className}</td>
              <td>{dash(row.guardianName)}</td><td>{row.phone}</td><td>{dash(row.routeCode)}</td>
            </tr>)}</tbody>
          </table>}

          {rejected.length > 0 && <div className="import-rejects">
            <strong>Rejected rows (not imported)</strong>
            <ul>{rejected.slice(0, 50).map(reject => <li key={reject.rowNumber}>
              <b>Row {reject.rowNumber}</b> — {reject.reason}<small>{reject.preview}</small>
            </li>)}</ul>
            {rejected.length > 50 && <p className="import-note">…and {rejected.length - 50} more.</p>}
          </div>}
        </div>}

        <details className="import-columns">
          <summary>Expected column order</summary>
          <ol>{IMPORT_COLUMNS.map(column => <li key={column}>{column}</li>)}</ol>
          <p className="import-note">Repeated header rows inside the sheet are skipped automatically. Existing students are matched on registration number (column B) and updated, so re-importing is safe.</p>
        </details>
      </div>

      <div className="modal-actions">
        <button type="button" className="filter-btn" onClick={onClose}>Close</button>
        <button type="button" className="filter-btn" disabled={!rows || busy} onClick={() => run(false)}>
          {busy ? 'Checking…' : 'Dry run'}
        </button>
        <button type="button" className="primary-btn" disabled={!rows || busy || !result || result.valid === 0} onClick={() => run(true)}>
          {busy ? 'Importing…' : `Import ${result?.valid ?? ''} student(s)`}
        </button>
      </div>
    </div>
  </div>;
}

function BulkAssignModal({ students, routes, onClose, onSave }) {
  const [query, setQuery] = useState('');
  // Only user-changed selections are stored here. The displayed value is derived
  // fresh on every render (defaulting to the student's current routeId) so it can
  // never get stuck showing stale data if students/routes finish loading after
  // this modal first mounts.
  const [overrides, setOverrides] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const studentKey = student => student.studentId ?? student.id;
  const valueFor = student => {
    const id = studentKey(student);
    if (Object.prototype.hasOwnProperty.call(overrides, id)) return overrides[id];
    return student.routeId ? `${student.routeId}:${student.slabId ?? ''}` : '';
  };
  const setSelection = (studentId, routeId) => setOverrides(current => ({ ...current, [studentId]: routeId }));
  // "<routeId>:<slabId>" in one control — picking the route and the slab as two
  // dropdowns per row would double the width of an already dense table.
  const routeChoices = useMemo(() => routes.map(route => ({
    route,
    options: route.slabs?.length
      ? route.slabs.map(slab => ({ value: `${route.routeId}:${slab.slabId}`, label: `${route.id} · ${slabLabel(slab)}` }))
      : [{ value: `${route.routeId}:`, label: `${route.id} · ${route.name}` }]
  })), [routes]);

  const visibleStudents = students.filter(student =>
    [student.name, student.area, student.address, student.guardianName, student.phone, student.class, student.section].map(safeText).join(' ').toLowerCase().includes(safeText(query).toLowerCase())
  );

  const submit = async () => {
    const assignments = students
      .map(student => {
        const id = studentKey(student);
        const selected = valueFor(student);
        if (!selected) return null;
        // Unchanged rows are skipped, including a slab-only change, which is how
        // a student's fee is corrected without moving them off their bus.
        const current = student.routeId ? `${student.routeId}:${student.slabId ?? ''}` : '';
        if (selected === current) return null;
        const [routeId, slabId] = selected.split(':');
        return { studentId: Number(id), routeId: Number(routeId), ...(slabId ? { slabId: Number(slabId) } : {}) };
      })
      .filter(Boolean);

    if (!assignments.length) {
      setError('Choose at least one changed route before saving.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave(assignments);
      onClose();
    } catch (err) {
      setError(err.message || 'Unable to bulk assign routes.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="modal-backdrop" onClick={onClose}>
    <div className="record-modal bulk-assign-modal" onClick={event => event.stopPropagation()}>
      <div className="modal-head">
        <div>
          <h2>Bulk assign routes</h2>
          <p>Pick a route for each student, then save to apply every change at once.</p>
        </div>
        <button type="button" className="icon-btn" onClick={onClose}><Icon name="close" size={17}/></button>
      </div>
      <label className="table-search bulk-assign-search"><Icon name="search" size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search students..."/></label>
      <div className="bulk-assign-body">
        <div className="bulk-assign-table" role="table">
          <div className="bulk-assign-row bulk-assign-head" role="row">
            <span>Student</span><span>Class</span><span>Area</span><span>Phone</span><span>Route</span>
          </div>
          {visibleStudents.map(student => {
            const id = studentKey(student);
            return <div className="bulk-assign-row" role="row" key={id}>
              <span title={student.name}><strong>{student.name}</strong></span>
              <span title={student.class}>{student.class}</span>
              <span title={student.area}>{student.area}</span>
              <span title={student.phone}>{student.phone}</span>
              <span><select value={valueFor(student)} onChange={event => setSelection(id, event.target.value)}>
                <option value="">Not assigned</option>
                {/* One row per route, or per slab where the route has them, so
                    the fee is chosen at the same time as the bus. */}
                {routeChoices.map(({ route, options }) => options.map(option =>
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select></span>
            </div>;
          })}
        </div>
        {!visibleStudents.length && <div className="empty small-empty">No matching students.</div>}
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions">
        <button type="button" className="filter-btn" onClick={onClose} disabled={saving}>Cancel</button>
        <button type="button" className="primary-btn" onClick={submit} disabled={saving}>{saving ? <span className="spinner"/> : <Icon name="check" size={16}/>}{saving ? 'Saving...' : 'Save assignments'}</button>
      </div>
    </div>
  </div>;
}

function Header({ title, setMenu }) {
  return <header><div className="header-title"><button className="menu-btn" onClick={() => setMenu(true)}><Icon name="menu"/></button><div><h1>{title}</h1><p>{title === 'Overview' ? 'Here’s what’s happening with your fleet today.' : `Manage and review ${title.toLowerCase()}.`}</p></div></div></header>;
}

function StatCard({ label, value, change, icon, tone, detail }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon name={icon}/></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small className={safeText(change).startsWith('+') ? 'up' : ''}>{change} <em>{detail}</em></small></div></div>;
}

function MiniMap({ vehicles, expanded = false }) {
  return <div className={`map ${expanded ? 'expanded-map' : ''}`}>
    <div className="map-grid"></div>
    <svg className="route-line" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M4 85 C18 79,18 61,31 61 S43 44,53 46 S67 29,82 33 S88 17,98 12"/><path className="route-secondary" d="M8 10 C16 31,27 34,38 38 S50 64,65 65 S78 76,94 84"/></svg>
    {vehicles.map(v => <button className={`map-marker ${v.tone}`} style={{ left: `${v.x}%`, top: `${v.y}%` }} key={v.id} title={`${v.id} · ${v.driver}`}><Icon name="bus" size={15}/>{v.id === 'BUS-04' && <span><strong>BUS-04</strong><small>38 km/h · On time</small></span>}</button>)}
    <div className="school-pin"><span>🏫</span><b>Greenwood School</b></div>
    <div className="map-controls"><button>+</button><button>−</button></div>
    <div className="map-legend"><span><i className="green-dot"></i>Moving 2</span><span><i className="blue-dot"></i>At school 1</span><span><i></i>Offline 1</span></div>
  </div>;
}

function VehicleMapBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points.map(point => [point.latitude, point.longitude]));
    if (points.length === 1) {
      map.setView(bounds.getCenter(), 15);
    } else {
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [map, points]);

  return null;
}

function VehicleLeafletMap({ points, fallbackVehicles, selectedVehicleId }) {
  if (!points.length) {
    return <div className="google-map-fallback"><MiniMap vehicles={fallbackVehicles} expanded/><div className="map-warning"><Icon name="clock" size={17}/><span>Waiting for GPS vehicle data...</span></div></div>;
  }

  const selectedPoint = points.find(point => point.id === selectedVehicleId || point.vehicleNo === selectedVehicleId) || points[0];
  const center = [selectedPoint.latitude, selectedPoint.longitude];

  return <div className="google-map-shell">
    <MapContainer center={center} zoom={13} className="google-map-canvas" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <VehicleMapBounds points={[selectedPoint]}/>
      <Marker key={selectedPoint.id} position={[selectedPoint.latitude, selectedPoint.longitude]} icon={busMarkerIcon}>
        <Popup>
          <div className="map-popup">
            <strong>{selectedPoint.vehicleNo}</strong>
            {selectedPoint.alias && <span>{selectedPoint.alias}</span>}
            <span>Speed: {selectedPoint.speed} km/h</span>
            <span>Ignition: {selectedPoint.ignition ? 'On' : 'Off'}</span>
            <span>Updated: {selectedPoint.timestamp ? selectedPoint.timestamp.toLocaleString() : '-'}</span>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  </div>;
}

function googleBusIcon(maps, moving) {
  const fill = moving ? '#15966d' : '#718096';
  const glow = moving ? '#34d399' : '#f59e0b';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="70" height="70" viewBox="0 0 70 70"><defs><filter id="busGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><circle cx="35" cy="35" r="27" fill="${glow}" opacity=".22"><animate attributeName="r" values="22;31;22" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values=".34;.1;.34" dur="1.8s" repeatCount="indefinite"/></circle><circle cx="35" cy="35" r="24" fill="${fill}" stroke="#fff" stroke-width="4" filter="url(#busGlow)"/><path d="M24 39V26c0-4 4-6 11-6s11 2 11 6v13" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M25 30h20M27 39h16" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="29" cy="44" r="3" fill="#fff"/><circle cx="41" cy="44" r="3" fill="#fff"/><path d="M29 50v-3M41 50v-3" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new maps.Size(70, 70),
    anchor: new maps.Point(35, 35)
  };
}

function VehicleGoogleMap({ points, fallbackVehicles, selectedVehicleId }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const [mapError, setMapError] = useState('');
  const mapPoints = useMemo(
    () => points.length ? points : demoVehiclePoints(fallbackVehicles),
    [points, fallbackVehicles]
  );
  const selectedPoint = mapPoints.find(point => point.id === selectedVehicleId || point.vehicleNo === selectedVehicleId) || mapPoints[0];

  useEffect(() => {
    if (!selectedPoint) return;
    let cancelled = false;

    loadGoogleMaps()
      .then(maps => {
        if (cancelled || !mapRef.current) return;

        const center = { lat: selectedPoint.latitude, lng: selectedPoint.longitude };
        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new maps.Map(mapRef.current, {
            center,
            zoom: 13,
            mapTypeControl: false,
            fullscreenControl: true,
            streetViewControl: false,
            styles: [
              { featureType: 'poi', stylers: [{ visibility: 'off' }] },
              { featureType: 'transit', stylers: [{ visibility: 'off' }] },
              { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },
              { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
              { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
              { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
              { featureType: 'landscape', elementType: 'labels', stylers: [{ visibility: 'off' }] }
            ]
          });
          infoWindowRef.current = new maps.InfoWindow();
        }

        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        const marker = new maps.Marker({
          map: mapInstanceRef.current,
          position: center,
          title: selectedPoint.vehicleNo,
          icon: googleBusIcon(maps, selectedPoint.ignition)
        });

        marker.addListener('click', () => {
          // Build the popup as real DOM nodes (textContent, never innerHTML) since
          // vehicleNo/alias come from a third-party GPS API we don't fully trust.
          const container = document.createElement('div');
          container.className = 'map-popup';
          const title = document.createElement('strong');
          title.textContent = selectedPoint.vehicleNo;
          const aliasEl = document.createElement('span');
          aliasEl.textContent = selectedPoint.alias || '-';
          const speedEl = document.createElement('span');
          speedEl.textContent = `Speed: ${selectedPoint.speed} km/h`;
          const ignitionEl = document.createElement('span');
          ignitionEl.textContent = `Ignition: ${selectedPoint.ignition ? 'On' : 'Off'}`;
          container.append(title, aliasEl, speedEl, ignitionEl);
          infoWindowRef.current.setContent(container);
          infoWindowRef.current.open({ anchor: marker, map: mapInstanceRef.current });
        });
        markersRef.current.push(marker);

        mapInstanceRef.current.setCenter(center);
        mapInstanceRef.current.setZoom(15);
        setMapError('');
      })
      .catch(error => setMapError(error.message || 'Google Maps could not be loaded.'));

    return () => {
      cancelled = true;
    };
  }, [selectedPoint]);

  return <div className="google-map-shell">
    {mapError && <div className="map-warning map-warning-top"><Icon name="alert" size={17}/><span>{mapError}</span></div>}
    <div ref={mapRef} className="google-map-canvas"/>
  </div>;
}

function VehicleLiveMap({ points, fallbackVehicles, selectedVehicleId }) {
  if (GOOGLE_MAPS_API_KEY) {
    return <VehicleGoogleMap points={points} fallbackVehicles={fallbackVehicles} selectedVehicleId={selectedVehicleId}/>;
  }
  return <VehicleLeafletMap points={points} fallbackVehicles={fallbackVehicles} selectedVehicleId={selectedVehicleId}/>;
}

const timeAgo = date => {
  if (!date) return 'No timestamp';
  const seconds = Math.max(1, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
};

function ActivityRow({ initials, name, action, time, state }) {
  return <div className="activity-row"><div className="avatar">{initials}</div><div><strong>{name}</strong><span>{action}</span></div><Pill tone={state === 'Picked up' ? 'green' : state === 'Dropped' ? 'blue' : 'gray'}>{state}</Pill><time>{time}</time></div>;
}

const vehicleToneForStatus = status => {
  if (status === 'On route') return 'green';
  if (status === 'At school') return 'blue';
  return 'gray';
};

function FleetOverviewPanel({ vehicles, students, setActive }) {
  const statusRows = [
    { label: 'On route', icon: 'bus', tone: 'green' },
    { label: 'At school', icon: 'student', tone: 'blue' },
    { label: 'Offline', icon: 'clock', tone: 'gray' }
  ].map(item => ({
    ...item,
    count: vehicles.filter(vehicle => vehicle.status === item.label).length
  }));
  const totalStudentsOnBuses = vehicles.reduce((sum, vehicle) => sum + Number(vehicle.students || 0), 0);
  const assignedStudents = students.filter(student => student.route || student.vehicle).length;
  const averageLoad = vehicles.length ? Math.round(totalStudentsOnBuses / vehicles.length) : 0;
  const busiestVehicle = [...vehicles].sort((a, b) => Number(b.students || 0) - Number(a.students || 0))[0];

  return <div className="panel fleet-overview-panel">
    <div className="panel-head"><div><h2>Transport operations</h2><p>Bus status and student coverage</p></div><button className="text-btn" onClick={() => setActive('Live tracking')}>Open live tracking <Icon name="arrow" size={15}/></button></div>
    <div className="fleet-overview-body">
      <div className="status-breakdown">
        {statusRows.map(row => <div className={`status-tile ${row.tone}`} key={row.label}>
          <span className={`stat-icon ${row.tone === 'gray' ? 'amber' : row.tone}`}><Icon name={row.icon}/></span>
          <div><strong>{row.count}</strong><small>{row.label}</small></div>
        </div>)}
      </div>
      <div className="ops-metrics">
        <div><span>Assigned students</span><strong>{assignedStudents} / {students.length}</strong><small>{students.length ? `${Math.round((assignedStudents / students.length) * 100)}% route coverage` : 'No students yet'}</small></div>
        <div><span>Average bus load</span><strong>{averageLoad}</strong><small>students per vehicle</small></div>
        <div><span>Busiest bus</span><strong>{busiestVehicle?.id || '-'}</strong><small>{busiestVehicle ? `${busiestVehicle.students || 0} students - ${busiestVehicle.route || 'No route'}` : 'No vehicles yet'}</small></div>
      </div>
    </div>
  </div>;
}

function AttentionPanel({ vehicles, students, feeDues, setActive }) {
  const offlineVehicles = vehicles.filter(vehicle => vehicle.status === 'Offline');
  const unassignedStudents = students.filter(student => !student.route && !student.vehicle);
  const pendingDues = monthlyDueRows(feeDues);
  const items = [
    { label: 'Offline buses', value: offlineVehicles.length, detail: offlineVehicles.slice(0, 3).map(vehicle => vehicle.id).join(', ') || 'All buses available', tone: offlineVehicles.length ? 'amber' : 'green', action: 'Vehicles' },
    { label: 'Unassigned students', value: unassignedStudents.length, detail: unassignedStudents.slice(0, 3).map(student => student.name).join(', ') || 'All assigned', tone: unassignedStudents.length ? 'amber' : 'green', action: 'Students' },
    { label: 'Pending fee dues', value: pendingDues.length, detail: pendingDues.length ? `${formatCurrency(pendingDues.reduce((sum, row) => sum + parseAmount(row.amount), 0))} pending` : 'No pending dues', tone: pendingDues.length ? 'red' : 'green', action: 'Fees & payments' }
  ];

  return <div className="panel attention-panel">
    <div className="panel-head"><div><h2>Needs attention</h2><p>Quick operational checks</p></div></div>
    <div className="attention-list">
      {items.map(item => <button key={item.label} className="attention-item" onClick={() => setActive(item.action)}>
        <span className={`attention-dot ${item.tone}`}></span>
        <div><strong>{item.label}</strong><small>{item.detail}</small></div>
        <b>{item.value}</b>
        <Icon name="arrow" size={15}/>
      </button>)}
    </div>
  </div>;
}

function Overview({ setActive, vehicles, students, payments, feeDues }) {
  const activeVehicles = vehicles.filter(vehicle => vehicle.status !== 'Offline').length;
  const collected = payments.filter(payment => ['Paid', 'Collected'].includes(payment.status)).reduce((sum, payment) => sum + parseAmount(payment.amount), 0);
  const pendingDue = monthlyDueRows(feeDues).reduce((sum, row) => sum + parseAmount(row.amount), 0);
  return <>
    <section className="stats-grid">
      <StatCard label="Active vehicles" value={`${activeVehicles} / ${vehicles.length}`} change="DB" detail="vehicles" icon="bus" tone="amber"/>
      <StatCard label="Students" value={students.length} change="DB" detail="records" icon="student" tone="blue"/>
      <StatCard label="Fees collected" value={formatCurrency(collected)} change="DB" detail="payments" icon="money" tone="green"/>
      <StatCard label="Pending dues" value={formatCurrency(pendingDue)} change="DB" detail="route fees" icon="clock" tone="red"/>
    </section>
    <section className="dashboard-grid">
      <div className="panel fleet-panel"><div className="panel-head"><div><h2>Bus status</h2><p>Loaded from backend</p></div></div><div className="fleet-list">{vehicles.map(v => <div className="fleet-row" key={v.id}><span className={`vehicle-tile ${v.tone || vehicleToneForStatus(v.status)}`}><Icon name="bus"/></span><div><strong>{v.id}</strong><small>{v.driver || 'Unassigned driver'}</small></div><div className="fleet-route"><span>{v.route || 'No route'}</span><small>{v.students || 0} students</small></div><Pill tone={v.tone || vehicleToneForStatus(v.status)}>{v.status}</Pill><b>{v.speed ? `${v.speed} km/h` : '-'}</b></div>)}</div>{!vehicles.length && <div className="empty small-empty">No buses found in database.</div>}<button className="panel-footer" onClick={() => setActive('Vehicles')}>View all buses <Icon name="arrow" size={15}/></button></div>
      <AttentionPanel vehicles={vehicles} students={students} feeDues={feeDues} setActive={setActive}/>
      <div className="panel revenue-panel"><div className="panel-head"><div><h2>Fee collection</h2><p>Current month</p></div></div><div className="revenue-summary"><div><strong>{formatCurrency(collected)}</strong><span><b>{payments.length}</b> payment records</span></div><div className="donut"><span>{payments.length}</span></div></div><div className="progress"><i style={{width: pendingDue ? '50%' : '100%'}}></i></div><div className="revenue-legend"><span><i className="paid-dot"></i><b>{formatCurrency(collected)}</b><small>Collected</small></span><span><i className="pending-dot"></i><b>{formatCurrency(pendingDue)}</b><small>Pending</small></span><span><i className="overdue-dot"></i><b>0</b><small>Overdue</small></span></div><button className="panel-footer" onClick={() => setActive('Fees & payments')}>View payment history <Icon name="arrow" size={15}/></button></div>
    </section>
  </>;
}

function BaseDataPage({ type, data, columns, subtitle, action, children }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => data.filter(row => Object.values(row || {}).map(safeText).join(' ').toLowerCase().includes(safeText(query).toLowerCase())), [data, query]);
  return <section className="data-page">
    {children}
    <div className="panel table-panel"><div className="table-toolbar"><div><h2>{type}</h2><p>{subtitle}</p></div><div className="toolbar-actions"><label className="table-search"><Icon name="search" size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${type.toLowerCase()}...`}/></label><button className="filter-btn">All statuses <Icon name="down" size={13}/></button><button className="primary-btn"><Icon name="plus" size={16}/>{action}</button></div></div><div className="table-wrap"><table><thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}<th></th></tr></thead><tbody>{filtered.map((row, index) => <tr key={row.id || row.name || row.owner}><>{columns.map(c => <td key={c.key}>{c.render ? c.render(row, index) : row[c.key]}</td>)}</><td><button className="more">•••</button></td></tr>)}</tbody></table>{!filtered.length && <div className="empty">No matching records found.</div>}</div><div className="table-footer"><span>Showing {filtered.length} of {data.length} records</span><div><button disabled>‹</button><button className="current">1</button><button>2</button><button>›</button></div></div></div>
  </section>;
}

function DataPage({ type, data, columns, subtitle, action, children, fields = [], onAdd, onEdit, onDelete, onHistory, onRemind, createRecord, serverFilters = false, filters = {}, filterFields = [], onFiltersChange, secondaryAction, extraActions = [], deriveValues, loading = false }) {
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const resolveFields = values => typeof fields === 'function' ? fields(values) : fields;
  const [formValues, setFormValues] = useState(() => emptyForm(resolveFields({})));
  const [editingRow, setEditingRow] = useState(null);
  const [rowActionError, setRowActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [runningAction, setRunningAction] = useState('');
  const filtered = useMemo(
    () => serverFilters ? data : data.filter(row => Object.values(row || {}).map(safeText).join(' ').toLowerCase().includes(safeText(query).toLowerCase())),
    [data, query, serverFilters]
  );
  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const result = compareSortValues(a[sort.key], b[sort.key]);
      return sort.dir === 'asc' ? result : -result;
    });
    return copy;
  }, [filtered, sort]);
  const toggleSort = key => setSort(current => current.key === key
    ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
    : { key, dir: 'asc' });
  useDebouncedEffect(() => {
    if (!serverFilters || !onFiltersChange) return;
    onFiltersChange({ ...filters, q: query });
  }, [query], 300);
  const setFilter = (name, value) => {
    onFiltersChange?.({ ...filters, [name]: value });
  };
  const openModal = () => {
    setFormValues(emptyForm(resolveFields({})));
    setEditingRow(null);
    setFormError('');
    setModalOpen(true);
  };
  const openEditModal = row => {
    setEditingRow(row);
    setFormValues(Object.fromEntries(resolveFields(row).map(field => {
      const value = row[field.name] ?? field.defaultValue ?? '';
      if (field.digitsOnly && field.maxLength === 10) {
        return [field.name, stripToLast10Digits(value)];
      }
      // Yes/No selects are backed by real booleans on the API, which would
      // match neither option and render the field blank.
      if (field.type === 'select' && field.options?.includes('Yes') && typeof value === 'boolean') {
        return [field.name, value ? 'Yes' : 'No'];
      }
      return [field.name, field.name === 'vehicle' && value === 'Unassigned' ? 'Not assigned' : value];
    })));
    setFormError('');
    setModalOpen(true);
  };
  const submitForm = async event => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const record = createRecord ? await createRecord(formValues, data) : formValues;
      if (editingRow) {
        await onEdit?.(editingRow, record);
      } else {
        await onAdd?.(record);
      }
      setModalOpen(false);
      setEditingRow(null);
    } catch (error) {
      setFormError(error.message || 'Unable to save record.');
    } finally {
      setSaving(false);
    }
  };
  const deleteRow = async row => {
    if (!onDelete || !window.confirm(`Delete ${row.name || row.id || 'this record'}?`)) return;
    const rowId = row.id || row.regNo || row.name || row.owner;
    setRowActionError('');
    setDeletingId(rowId);
    try {
      await onDelete(row);
    } catch (error) {
      setRowActionError(error.message || 'Unable to delete record.');
    } finally {
      setDeletingId(null);
    }
  };
  const runExtraAction = async item => {
    setRunningAction(item.label);
    setRowActionError('');
    try {
      await item.onClick();
    } catch (error) {
      setRowActionError(error.message || `Unable to complete "${item.label}".`);
    } finally {
      setRunningAction('');
    }
  };

  return <section className="data-page">
    {children}
    {rowActionError && <div className="form-error table-error">{rowActionError}</div>}
    <div className="panel table-panel">
      <div className="table-toolbar">
        <div className="toolbar-title"><h2>{type}</h2><p>{subtitle}</p></div>
        <div className="toolbar-actions">
          <label className="table-search"><Icon name="search" size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${type.toLowerCase()}...`}/>{loading && <span className="spinner spinner-sm table-search-spinner"/>}</label>
          {filterFields.map(field => <select key={field.name} className="filter-select" value={filters[field.name] || 'all'} onChange={event => setFilter(field.name, event.target.value)}>
            <option value="all">{field.label}</option>
            {field.options.map(option => <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? option}</option>)}
          </select>)}
          {extraActions.map(item => <button key={item.label} type="button" className="filter-btn report-open-btn" onClick={() => runExtraAction(item)} disabled={runningAction === item.label}>{runningAction === item.label ? <span className="spinner spinner-sm"/> : <Icon name={item.icon || 'file'} size={16}/>}{item.label}</button>)}
          <button className="primary-btn" onClick={openModal}><Icon name="plus" size={16}/>{action}</button>
          {secondaryAction && <button type="button" className="filter-btn report-open-btn" onClick={() => runExtraAction(secondaryAction)} disabled={runningAction === secondaryAction.label}>{runningAction === secondaryAction.label ? <span className="spinner spinner-sm"/> : <Icon name={secondaryAction.icon || 'file'} size={16}/>}{secondaryAction.label}</button>}
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{columns.map(column => <th key={column.key} className="sortable-th" onClick={() => toggleSort(column.key)}>
            {column.label}<span className={`sort-arrow ${sort.key === column.key ? 'active' : ''}`}>{sort.key === column.key && sort.dir === 'desc' ? '▼' : '▲'}</span>
          </th>)}<th></th></tr></thead>
          <tbody>{sorted.map((row, index) => {
            const rowId = row.id || row.regNo || row.name || row.owner;
            const isDeleting = deletingId === rowId;
            return <tr key={rowId}>
              {columns.map(column => <td key={column.key}>{column.render ? column.render(row, index) : row[column.key]}</td>)}
              <td>{onEdit || onDelete || onHistory || onRemind ? <div className="row-actions">{onHistory && <button type="button" className="text-action" onClick={() => onHistory(row)} disabled={isDeleting}>History</button>}{onRemind && <button type="button" className="text-action" onClick={() => runExtraAction({ label: `Remind ${row.name || row.id}`, onClick: () => onRemind(row) })} disabled={isDeleting || runningAction.startsWith('Remind ')}>Remind</button>}{onEdit && <button type="button" className="text-action" onClick={() => openEditModal(row)} disabled={isDeleting}>Edit</button>}{onDelete && <button type="button" className="text-action danger" onClick={() => deleteRow(row)} disabled={isDeleting}>{isDeleting ? <span className="spinner spinner-sm"/> : 'Delete'}</button>}</div> : <button className="more">...</button>}</td>
            </tr>;
          })}</tbody>
        </table>
        {!filtered.length && <div className="empty">No matching records found.</div>}
      </div>
      <div className="table-footer"><span>Showing {sorted.length} of {data.length} records</span></div>
    </div>
    {modalOpen && <RecordModal title={editingRow ? `Edit ${type}` : action} fields={resolveFields(formValues)} values={formValues} setValues={setFormValues} onClose={() => !saving && setModalOpen(false)} onSubmit={submitForm} saving={saving} error={formError} deriveValues={deriveValues}/>}
  </section>;
}

const personCell = key => ({
  key,
  label: key === 'student' ? 'Student' : 'Name',
  render: r => {
    const name = safeText(r[key]);
    return <div className="person-cell"><div className="avatar">{r.initials || initialsFor(name)}</div><div><strong>{name || '-'}</strong><small>{dash(r.phone || r.parent || r.regNo)}</small></div></div>;
  }
});
const statusCell = key => ({ key, label: key[0].toUpperCase()+key.slice(1), render: r => <Pill>{r[key]}</Pill> });
// Returns the billing period a payment falls in. Now a quarter key, so it
// still compares against currentMonthKey() — returning YYYY-MM here would
// never match and the "Collected" figure would silently read zero.
const monthKeyForPayment = payment => {
  const rawDate = String(payment.date || '').trim();
  const parsed = rawDate ? new Date(rawDate) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) return quarterKeyForDate(parsed);
  const label = rawDate.match(/\b([A-Z][a-z]{2,8})\s+(\d{4})\b/);
  if (!label) return '';
  return quarterKeyForDate(new Date(`${label[1]} 1, ${label[2]}`));
};
const settledPaymentRows = payments => payments.filter(payment =>
  ['Paid', 'Collected'].includes(payment.status) && monthKeyForPayment(payment) === currentMonthKey()
);
const monthlyDueRows = feeDues => feeDues
  .filter(due => Number(due.balance || 0) > 0)
  .map(due => ({
    id: `DUE-${due.dueId || due.id}`,
    dueId: due.dueId || due.id,
    studentId: due.studentId,
    student: due.student,
    plan: `${due.month} ${due.route || 'route'} fee`,
    amount: formatCurrency(due.balance),
    date: due.month,
    method: '-',
    status: due.status
  }));
// How many quarterly dues each plan covers. Must stay in step with
// PLAN_QUARTERS in the backend's payment.service.ts.
const PLAN_QUARTERS = { quarterly: 1, 'half-yearly': 2, annual: 4 };
const quartersFor = values => PLAN_QUARTERS[String(values.plan || 'Quarterly').toLowerCase()] ?? 1;

const currentMonthDueForStudent = (feeDues, studentId) => studentId
  ? feeDues.find(item => Number(item.studentId) === studentId && item.month === currentMonthKey()) || null
  : null;
const totalDueForStudent = (feeDues, student) => {
  if (!student) return 0;
  const studentId = Number(student.studentId ?? student.id);
  const due = currentMonthDueForStudent(feeDues, studentId);
  if (due) return Math.max(0, roundToPaise(due.balance));
  return Math.max(0, roundToPaise(student.monthlyDue));
};

const VEHICLE_COMPLIANCE_DATES = ['insuranceExpiry', 'fitnessExpiry', 'pucExpiry', 'permitExpiry'];
const complianceStatusForVehicle = vehicle => {
  const dates = VEHICLE_COMPLIANCE_DATES.map(key => vehicle[key]);
  if (dates.some(date => !date)) return 'Incomplete';
  // Compare against the start of today, not the current instant — a document
  // expiring "today" is still valid for the rest of today, not already expired.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const soonThreshold = new Date(todayStart.getTime() + 30 * 24 * 60 * 60 * 1000);
  const parsed = dates.map(date => new Date(date));
  if (parsed.some(date => date < todayStart)) return 'Expired';
  if (parsed.some(date => date <= soonThreshold)) return 'Expiring soon';
  return 'Valid';
};
const complianceTone = status => ({ Expired: 'overdue', 'Expiring soon': 'amber', Valid: 'green', Incomplete: 'gray' })[status] || 'gray';
const reportDateFromRow = row => {
  const rawDate = String(row.date || '').trim();
  const parsed = rawDate ? new Date(rawDate) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) return parsed;

  const monthYear = rawDate.match(/\b([A-Z][a-z]{2,8})\s+(\d{4})\b/);
  if (monthYear) {
    const date = new Date(`${monthYear[1]} 1, ${monthYear[2]}`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const dueDate = rawDate.match(/\bDue\s+(\d{1,2})\s+([A-Z][a-z]{2,8})\b/);
  if (dueDate) {
    const date = new Date(`${dueDate[2]} ${dueDate[1]}, ${new Date().getFullYear()}`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};
const reportTypeForRow = row => safeText(row.id).startsWith('DUE-') ? 'Generated due' : row.plan || 'Payment';

const vehicleFields = [
  { name: 'id', label: 'Vehicle ID', required: true, placeholder: 'BUS-12', pattern: '[A-Za-z0-9][A-Za-z0-9-]*', minLength: 3, maxLength: 32, title: 'Start with a letter or number; letters, numbers, and hyphens only' },
  { name: 'plate', label: 'Registration number', required: true, minLength: 3, maxLength: 64 },
  { name: 'vehicleType', label: 'Vehicle type', type: 'select', options: ['Bus', 'Van', 'Mini Bus'], required: true, defaultValue: 'Bus' },
  { name: 'fuelType', label: 'Fuel type', type: 'select', options: ['Diesel', 'Petrol', 'CNG', 'Electric'], required: true, defaultValue: 'Diesel' },
  { name: 'seatingCapacity', label: 'Seating capacity', type: 'number', required: true, min: '1', max: '100', inputMode: 'numeric' },
  { name: 'chassisNumber', label: 'Chassis number', required: true, maxLength: 64 },
  { name: 'insuranceExpiry', label: 'Insurance expiry', type: 'date' },
  { name: 'fitnessExpiry', label: 'Fitness certificate expiry', type: 'date' },
  { name: 'pucExpiry', label: 'PUC (pollution) expiry', type: 'date' },
  { name: 'permitExpiry', label: 'Permit expiry', type: 'date' },
  { name: 'driver', label: 'Existing driver name', defaultValue: 'Unassigned', readOnly: true }
];
const routeFields = [
  // Spaces are allowed: the transport sheet codes the pre-primary run on a route
  // as "B-19 PRE", and student import creates routes straight from those values.
  { name: 'id', label: 'Route code', required: true, placeholder: 'RT-01', pattern: '[A-Za-z0-9][A-Za-z0-9 -]*', minLength: 2, maxLength: 32, title: 'Start with a letter or number; letters, numbers, spaces, and hyphens only' },
  { name: 'name', label: 'Route name', required: true, minLength: 2, maxLength: 120 },
  { name: 'fee', label: 'Flat fee', type: 'number', required: true, min: '0', max: '99999999.99', step: '0.01', inputMode: 'decimal', hint: 'Charged per quarter. Used only when this route has no distance slabs.' },
  { name: 'vehicle', label: 'Assigned bus', type: 'select', options: ['Not assigned'], defaultValue: 'Not assigned' },
  { name: 'slabs', label: 'Distance slabs', type: 'slabs', defaultValue: [], hint: 'The route code stays the same. A student is assigned to this route and to one slab, and the slab sets their fee.' },
  { name: 'description', label: 'Description', type: 'textarea', full: true, maxLength: 255 }
];
const driverFields = [
  { name: 'name', label: 'Driver name', required: true, minLength: 2, maxLength: 160 },
  { name: 'phone', label: 'Phone number', required: true, pattern: '[0-9]{10}', maxLength: 10, inputMode: 'numeric', digitsOnly: true, title: 'Enter a 10-digit phone number' },
  { name: 'licenseNumber', label: 'License number', maxLength: 80 },
  { name: 'vehicle', label: 'Vehicle', type: 'select', options: ['Not assigned'], defaultValue: 'Not assigned' },
  { name: 'route', label: 'Assigned route', type: 'select', options: [], defaultValue: 'Not assigned' }
];
const studentFields = [
  { name: 'f', label: 'Sr. No.', required: true, maxLength: 32 },
  { name: 'regNo', label: 'Reg. No.', required: true, minLength: 3, maxLength: 64 },
  { name: 'name', label: 'Student name', required: true, minLength: 2, maxLength: 160 },
  { name: 'class', label: 'Class', required: true, maxLength: 80 },
  { name: 'section', label: 'Section', placeholder: 'A', maxLength: 16 },
  { name: 'guardianName', label: "Father's / Mother's name", maxLength: 160 },
  // The fee sheet's E-Mail Address. Siblings legitimately share one.
  { name: 'email', label: 'E-mail address', type: 'email', maxLength: 190 },
  // No '' entry here — the select always renders its own "Select" placeholder
  // with an empty value, which doubles as the way to clear the branch.
  { name: 'branch', label: 'Branch', type: 'select', options: ['JPC', 'JPIC'], required: true },
  // On hold hides the student from the driver's roster and blocks pickup/drop
  // logging for them. Admin and parent views are unaffected.
  { name: 'onHold', label: 'On hold', type: 'select', options: ['No', 'Yes'], defaultValue: 'No' },
  { name: 'kms', label: 'Kms', type: 'number', min: '0', max: '500', step: '0.01', inputMode: 'decimal' },
  { name: 'tagNo', label: 'Tag No.', required: true, placeholder: 'T-A', maxLength: 32 },
  { name: 'area', label: 'Area', required: true, minLength: 2, maxLength: 180 },
  { name: 'address', label: 'Address', type: 'textarea', full: true, maxLength: 255 },
  { name: 'phone', label: 'Phone number', required: true, pattern: '[0-9]{10}', maxLength: 10, inputMode: 'numeric', digitsOnly: true, title: 'Enter a 10-digit phone number' },
  { name: 'secondaryPhone', label: 'Secondary contact number', pattern: '[0-9]{10}', maxLength: 10, inputMode: 'numeric', digitsOnly: true, title: 'Enter a 10-digit phone number' },
  { name: 'route', label: 'Route', type: 'select', options: [] },
  // Options depend on the route picked above — StudentsPage supplies them per
  // render. Left empty when the route has no slabs.
  { name: 'slab', label: 'Distance slab', type: 'select', options: [], hint: 'Sets the fee for this student' }
];
const paymentFields = [
  { name: 'student', label: 'Student', type: 'select', options: [], required: true },
  { name: 'plan', label: 'Fee plan', type: 'select', options: ['Quarterly', 'Half-yearly', 'Annual'], required: true, defaultValue: 'Quarterly' },
  { name: 'paymentType', label: 'Payment type', type: 'select', options: ['Full payment', 'Partial payment'], required: true, defaultValue: 'Full payment' },
  // Both are written onto the fee due, which recomputes its own balance:
  // total = base + fine - discount. Discount reduces what is owed, penalty
  // increases it.
  // digitsOnly strips anything non-numeric as it is typed, so these accept
  // whole rupees only — no decimals, no minus sign.
  { name: 'discount', label: 'Discount', placeholder: '0', pattern: '[0-9]*', inputMode: 'numeric', digitsOnly: true, maxLength: 8 },
  { name: 'penalty', label: 'Penalty / late fine', placeholder: '0', pattern: '[0-9]*', inputMode: 'numeric', digitsOnly: true, maxLength: 8 },
  { name: 'amount', label: 'Amount', required: true, placeholder: '8400', pattern: '[0-9]+(\\.[0-9]{1,2})?', inputMode: 'decimal', title: 'Enter a positive amount with up to 2 decimal places' },
  { name: 'date', label: 'Payment / due date', type: 'date', required: true },
  { name: 'method', label: 'Method', type: 'select', options: ['UPI', 'Card', 'Cash', 'Bank transfer', '-'], required: true },
  { name: 'status', label: 'Status', type: 'select', options: ['Paid', 'Collected', 'Pending', 'Overdue'], required: true }
];
const documentFields = [
  { name: 'owner', label: 'Owner', required: true, minLength: 2, maxLength: 160 },
  { name: 'kind', label: 'Owner type', type: 'select', options: ['Driver', 'Vehicle', 'Student'], required: true },
  { name: 'type', label: 'Document type', required: true, minLength: 2, maxLength: 80 },
  { name: 'number', label: 'Document number', required: true, minLength: 2, maxLength: 64 },
  { name: 'expiry', label: 'Expiry date', type: 'date', required: true },
  { name: 'status', label: 'Status', type: 'select', options: ['Verified', 'Expiring', 'Pending'], required: true }
];

function VehiclesPage({ vehicles, routes, filters, onFiltersChange, onAdd, onEdit, loading }) {
  const vehicleRows = vehicles.map(vehicle => ({ ...vehicle, compliance: complianceStatusForVehicle(vehicle) }));
  const columns = [{key:'id',label:'Vehicle',render:r=><div className="vehicle-cell"><span className={`vehicle-tile ${r.tone}`}><Icon name="bus"/></span><div><strong>{r.id}</strong><small>{r.plate}</small></div></div>},{key:'vehicleType',label:'Type',render:r=>dash(r.vehicleType)},{key:'driver',label:'Driver'},{key:'students',label:'Students'},{key:'seatingCapacity',label:'Seating capacity',render:r=>dash(r.seatingCapacity)},{key:'speed',label:'Current speed',render:r=>r.speed?`${r.speed} km/h`:'—'},statusCell('status'),{key:'compliance',label:'Compliance',render:r=><Pill tone={complianceTone(r.compliance)}>{r.compliance}</Pill>}];
  const { history, openHistory, closeHistory } = useAssignmentHistory(
    row => api.getVehicleAssignmentHistory(row.vehicleId),
    item => ({ id: item.id, label: item.driverName, sublabel: item.route ? `Route: ${item.route}` : undefined, from: item.assignedAt, to: item.unassignedAt })
  );
  return <DataPage type="Vehicles" data={vehicleRows} columns={columns} subtitle={`${vehicles.length} vehicles registered`} action="Add vehicle" fields={vehicleFields} onAdd={onAdd} onEdit={onEdit} onHistory={row => openHistory(row, `${row.id} · Driver history`, 'Drivers assigned to this vehicle over time')} loading={loading} serverFilters filters={filters} onFiltersChange={onFiltersChange} filterFields={[
    {name:'status', label:'All statuses', options:['On route','At school','Offline']},
    {name:'assigned', label:'Route assignment', options:[{value:'assigned',label:'Assigned to route'},{value:'unassigned',label:'No route'}]},
    {name:'routeId', label:'All routes', options:routes.map(route => ({value: route.id, label: route.id}))}
  ]}>{history && <HistoryModal {...history} onClose={closeHistory}/>}</DataPage>;
}

function RoutesPage({ routes, vehicles, filters, onFiltersChange, onAdd, onEdit, onDelete, loading }) {
  const columns = [
    {key:'id',label:'Route',render:r=><strong>{r.id}</strong>},
    {key:'name',label:'Route name'},
    // One code, its slabs listed underneath — the route is not split into rows.
    {key:'fee',label:'Fee',render:r=>(r.slabs?.length
      ? <div className="slab-cell">{r.slabs.map(slab => <span key={slab.slabId}>
          <b>{slab.minKm}-{slab.maxKm} km</b>{formatCurrency(slab.fee)}
        </span>)}</div>
      : <strong>{formatCurrency(r.fee)}</strong>)},
    {key:'vehicle',label:'Assigned bus',render:r=><Pill tone={r.vehicle === 'Not assigned' ? 'gray' : 'blue'}>{r.vehicle}</Pill>},
    {key:'students',label:'Students'},
    {key:'description',label:'Description',render:r=>dash(r.description)}
  ];
  const fields = routeFields.map(field => field.name === 'vehicle'
    ? {...field, options: ['Not assigned', ...vehicles.map(vehicle => vehicle.id)]}
    : field
  );
  return <DataPage type="Routes" data={routes} columns={columns} subtitle={`${routes.length} routes configured`} action="Add route" fields={fields} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} createRecord={values => ({...values, vehicle: values.vehicle === 'Not assigned' ? '' : values.vehicle})} loading={loading} serverFilters filters={filters} onFiltersChange={onFiltersChange} filterFields={[
    {name:'assigned', label:'Bus assignment', options:[{value:'assigned',label:'Assigned to bus'},{value:'unassigned',label:'No bus'}]},
    {name:'vehicleId', label:'All buses', options:vehicles.map(vehicle => ({value: vehicle.id, label: vehicle.id}))}
  ]}/>;
}

function DriversPage({ drivers, vehicles, routes, filters, onFiltersChange, onAdd, onEdit, loading }) {
  const columns = [personCell('name'),{key:'vehicle',label:'Vehicle'},{key:'route',label:'Assigned route'},statusCell('status'),{key:'licenseNumber',label:'License',render:r=>dash(r.licenseNumber)}];
  const fields = driverFields.map(field => {
    if (field.name === 'vehicle') {
      return {...field, options: ['Not assigned', ...vehicles.map(vehicle => vehicle.id)]};
    }
    if (field.name === 'route') {
      return {...field, options: ['Not assigned', ...routes.map(route => route.id)]};
    }
    return field;
  });
  const { history, openHistory, closeHistory } = useAssignmentHistory(
    row => api.getDriverAssignmentHistory(row.driverId),
    item => ({ id: item.id, label: item.vehicleCode, sublabel: item.route ? `Route: ${item.route}` : undefined, from: item.assignedAt, to: item.unassignedAt })
  );
  return <DataPage type="Drivers" data={drivers} columns={columns} subtitle={`${drivers.length} drivers registered`} action="Add driver" fields={fields} onAdd={onAdd} onEdit={onEdit} onHistory={row => openHistory(row, `${row.name} · Vehicle history`, 'Vehicles this driver has been assigned to over time')} createRecord={values => ({...values, vehicle: values.vehicle === 'Not assigned' ? 'Unassigned' : values.vehicle, route: values.route === 'Not assigned' ? '' : values.route, initials: initialsFor(values.name)})} loading={loading} serverFilters filters={filters} onFiltersChange={onFiltersChange} filterFields={[
    {name:'status', label:'All statuses', options:['On duty','Available','Off duty','At school']},
    {name:'docs', label:'All docs', options:['Verified','ExpiringSoon','Pending','Expired']},
    {name:'vehicleId', label:'All buses', options:vehicles.map(vehicle => ({value: vehicle.id, label: vehicle.id}))}
  ]}>{history && <HistoryModal {...history} onClose={closeHistory}/>}</DataPage>;
}

function StudentsPage({ students, routes, feeDues, filters, onFiltersChange, onAdd, onEdit, onDelete, onRemind, onBulkAssign, onImported, loading }) {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const studentRows = students.map(student => ({ ...student, totalDue: totalDueForStudent(feeDues, student) }));
  const columns = [
    {key:'f',label:'Sr. No.',render:r=><strong>{r.f}</strong>},
    {key:'regNo',label:'Reg. No.'},
    {...personCell('name'), label:'Student name'},
    {key:'class',label:'Class'},
    {key:'section',label:'Section',render:r=>dash(r.section)},
    {key:'branch',label:'Branch',render:r=>r.branch?<Pill tone="blue">{r.branch}</Pill>:dash('')},
    {key:'onHold',label:'Status',render:r=>r.onHold?<Pill tone="amber">On hold</Pill>:<Pill tone="green">Active</Pill>},
    {key:'guardianName',label:"Father's / Mother's name",render:r=>dash(r.guardianName)},
    {key:'kms',label:'Kms',render:r=>dash(r.kms)},
    {key:'tagNo',label:'Tag No.',render:r=><Pill tone="blue">{r.tagNo}</Pill>},
    {key:'route',label:'Route',render:r=>dash(r.route)},
    {key:'monthlyDue',label:'Monthly due',render:r=><strong>{formatCurrency(r.monthlyDue)}</strong>},
    {key:'totalDue',label:'Total due',render:r=><strong>{formatCurrency(r.totalDue)}</strong>},
    {key:'area',label:'Area'},
    {key:'address',label:'Address',render:r=>dash(r.address)},
    {key:'phone',label:'Phone Number'},
    {key:'secondaryPhone',label:'Secondary contact',render:r=>dash(r.secondaryPhone)}
  ];
  // The slab list depends on the route currently selected in the form, so fields
  // are built per render from the working values rather than once up front.
  const fields = values => studentFields.map(field => {
    if (field.name === 'route') {
      return {...field, options: ['Not assigned', ...routes.map(route => route.id)], defaultValue: 'Not assigned'};
    }
    if (field.name === 'slab') {
      const options = slabOptionsForRoute(routes, values?.route);
      return {...field, options: [], optionGroups: options.length ? [{ label: 'Distance slabs', options }] : null,
        readOnly: options.length === 0,
        hint: options.length ? field.hint : 'This route has no distance slabs — the flat route fee applies'};
    }
    return field;
  });
  // Clearing the slab when the route changes stops a student keeping a slab that
  // belongs to a route they are no longer on, which the API would reject anyway.
  const deriveStudentValues = (changed, next) => (changed === 'route' ? {...next, slab: ''} : next);
  const { history, openHistory, closeHistory } = useAssignmentHistory(
    row => api.getStudentAssignmentHistory(row.studentId),
    item => ({
      id: item.id,
      label: item.kind === 'route' ? `${item.routeCode} · ${item.routeName}` : (item.vehicleCode || 'Vehicle'),
      sublabel: item.kind === 'route' ? (item.vehicleCode ? `Vehicle: ${item.vehicleCode}` : undefined) : 'Legacy direct vehicle assignment',
      from: item.assignedAt,
      to: item.unassignedAt
    })
  );
  return <DataPage type="Students" data={studentRows} columns={columns} subtitle={`${students.length} students imported from JPIS transport list`} action="Add student" fields={fields} deriveValues={deriveStudentValues} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} onRemind={onRemind} onHistory={row => openHistory(row, `${row.name} · Route history`, 'Routes this student has been assigned to over time')} extraActions={[{ label: 'Import sheet', icon: 'upload', onClick: () => setImportOpen(true) }, { label: 'Bulk assign', icon: 'route', onClick: () => setBulkOpen(true) }]} loading={loading} serverFilters filters={filters} onFiltersChange={onFiltersChange} filterFields={[
    {name:'assigned', label:'Route assignment', options:[{value:'assigned',label:'Assigned to route'},{value:'unassigned',label:'No route'}]},
    {name:'routeId', label:'All routes', options:routes.map(route => ({value: route.id, label: route.id}))}
  ]}>{history && <HistoryModal {...history} onClose={closeHistory}/>}{bulkOpen && <BulkAssignModal students={studentRows} routes={routes} onClose={() => setBulkOpen(false)} onSave={onBulkAssign}/>}{importOpen && <ImportStudentsModal onClose={() => setImportOpen(false)} onImported={onImported}/>}</DataPage>;
}

function FeeReport({ rows, students, onBack }) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [filters, setFilters] = useState({
    from: dateInputValue(monthStart),
    to: dateInputValue(today),
    status: 'all',
    type: 'all',
    student: 'all'
  });
  const reportRows = useMemo(() => rows
    .map(row => ({ ...row, reportDate: reportDateFromRow(row), reportType: reportTypeForRow(row) }))
    .filter(row => {
      if (filters.status !== 'all' && row.status !== filters.status) return false;
      if (filters.type !== 'all' && row.reportType !== filters.type) return false;
      if (filters.student !== 'all' && row.student !== filters.student) return false;
      if (!row.reportDate) return !filters.from && !filters.to;
      if (filters.from && row.reportDate < new Date(`${filters.from}T00:00:00`)) return false;
      if (filters.to && row.reportDate > new Date(`${filters.to}T23:59:59`)) return false;
      return true;
    }), [rows, filters]);
  const total = reportRows.reduce((sum, row) => sum + parseAmount(row.amount), 0);
  const paid = reportRows.filter(row => ['Paid', 'Collected'].includes(row.status)).reduce((sum, row) => sum + parseAmount(row.amount), 0);
  const pending = reportRows.filter(row => ['Pending', 'Overdue'].includes(row.status)).reduce((sum, row) => sum + parseAmount(row.amount), 0);
  const types = [...new Set(rows.map(reportTypeForRow))];
  const statuses = ['Paid', 'Collected', 'Pending', 'Partial', 'Overdue', 'Waived'];

  const setFilter = (name, value) => setFilters(current => ({ ...current, [name]: value }));

  return <section className="fee-report-screen">
  {onBack && <button type="button" className="filter-btn report-back-btn" onClick={onBack}><Icon name="arrow" size={15}/>Back to payments</button>}
  <div className="panel fee-report">
    <div className="panel-head">
      <div><h2>Fee report</h2><p>Filter fee data by date, student, status, and type</p></div>
    </div>
    <div className="report-filters">
      <label><span>From</span><input type="date" value={filters.from} onChange={event => setFilter('from', event.target.value)}/></label>
      <label><span>To</span><input type="date" value={filters.to} onChange={event => setFilter('to', event.target.value)}/></label>
      <label><span>Status</span><select value={filters.status} onChange={event => setFilter('status', event.target.value)}><option value="all">All statuses</option>{statuses.map(status => <option key={status} value={status}>{status}</option>)}</select></label>
      <label><span>Type</span><select value={filters.type} onChange={event => setFilter('type', event.target.value)}><option value="all">All types</option>{types.map(type => <option key={type} value={type}>{type}</option>)}</select></label>
      <label><span>Student</span><select value={filters.student} onChange={event => setFilter('student', event.target.value)}><option value="all">All students</option>{students.map(student => <option key={student.studentId || student.id || student.name} value={student.name}>{student.name}</option>)}</select></label>
    </div>
    <div className="report-summary">
      <div><span>Total</span><strong>{formatCurrency(total)}</strong></div>
      <div><span>Received</span><strong>{formatCurrency(paid)}</strong></div>
      <div><span>Pending</span><strong>{formatCurrency(pending)}</strong></div>
      <div><span>Records</span><strong>{reportRows.length}</strong></div>
    </div>
    <div className="report-table">
      <table>
        <thead><tr><th>Date</th><th>Student</th><th>Type</th><th>Status</th><th>Amount</th></tr></thead>
        <tbody>{reportRows.map(row => <tr key={`${row.id}-${row.student}-${row.status}`}>
          <td>{row.date}</td>
          <td>{row.student}</td>
          <td>{row.reportType}</td>
          <td><Pill>{row.status}</Pill></td>
          <td><strong>{row.amount}</strong></td>
        </tr>)}</tbody>
      </table>
      {!reportRows.length && <div className="empty small-empty">No fee records match these filters.</div>}
    </div>
  </div>
  </section>;
}

const monthInputValue = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const monthLabel = key => {
  const match = String(key || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return key || '-';
  return new Date(Number(match[1]), Number(match[2]) - 1, 1)
    .toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

// Quoted so names containing commas survive the round trip into Excel.
const csvCell = value => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const downloadCsv = (filename, headers, rows) => {
  const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\n');
  // BOM so Excel reads it as UTF-8 rather than the local codepage.
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

// Real .xlsx rather than a CSV Excel has to guess at \u2014 dates stay dates and the
// sheet opens without an import wizard. SheetJS is already a dependency for
// student import and is ~350kB, so it stays lazily imported here too.
const downloadXlsx = async (filename, sheetName, headers, rows) => {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  // Excel refuses sheet names over 31 chars or containing []:*?/\
  const safeName = String(sheetName).replace(/[[\]:*?/\\]/g, ' ').slice(0, 31) || 'Sheet1';
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, safeName);
  XLSX.writeFile(book, filename);
};

// Every day of the month tagged with what happened to one person.
//
// Absence is only charged on days transport actually ran school-wide, which is
// the same denominator the server uses \u2014 so a Sunday, or any day the buses
// never moved, reads as "No transport" rather than inventing an absence. Dates
// are built as plain strings from the month key to match the server, which
// buckets logs on the UTC calendar date.
const buildMonthDays = (monthKey, presentDates, operatingDates, onHold = false) => {
  const match = String(monthKey || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return [];
  const year = Number(match[1]);
  const month = Number(match[2]);
  const present = new Set(presentDates || []);
  const operating = new Set(operatingDates || []);
  const dayCount = new Date(year, month, 0).getDate();

  return Array.from({ length: dayCount }, (unused, index) => {
    const day = index + 1;
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const status = present.has(date) ? 'Present'
      : !operating.has(date) ? 'No transport'
      : onHold ? 'On hold'
      : 'Absent';
    return {
      date,
      day,
      weekday: new Date(year, month - 1, day).toLocaleDateString(undefined, { weekday: 'short' }),
      status
    };
  });
};

const statusTone = status => (
  status === 'Present' ? 'green' : status === 'Absent' ? 'red' : status === 'On hold' ? 'amber' : 'grey'
);

// Single-letter marks for the spreadsheet grid, where one column per day leaves
// no room for words.
const statusMark = status => (
  status === 'Present' ? 'P' : status === 'Absent' ? 'A' : status === 'On hold' ? 'H' : '-'
);

const formatLogTime = value => new Date(value)
  .toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

const attendanceTone = pct => (pct >= 85 ? 'green' : pct >= 60 ? 'amber' : 'red');

/**
 * Day-by-day attendance for one student or driver.
 *
 * The monthly report already says which dates the person was present, so the
 * calendar renders immediately; the pickup and drop times are filled in from
 * the raw logs once they arrive, and the day stays readable if that fetch fails.
 */
function AttendanceDetailModal({ mode, row, month, operatingDates, onClose }) {
  const [logs, setLogs] = useState([]);
  const [state, setState] = useState({ loading: true, error: '' });

  const isStudent = mode === 'students';
  const personId = isStudent ? row.studentId : row.driverId;
  const name = isStudent ? row.student : row.driver;

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, error: '' });
    const [year, monthNo] = month.split('-').map(Number);
    // The log filter is inclusive at both ends, so `to` is the last instant of
    // the month rather than midnight on the 1st of the next one.
    const from = new Date(Date.UTC(year, monthNo - 1, 1)).toISOString();
    const to = new Date(Date.UTC(year, monthNo, 1) - 1).toISOString();
    api.getTransportLogs({ ...(isStudent ? { studentId: personId } : { driverId: personId }), from, to })
      .then(data => { if (!cancelled) { setLogs(data || []); setState({ loading: false, error: '' }); } })
      .catch(error => { if (!cancelled) { setLogs([]); setState({ loading: false, error: error.message }); } });
    return () => { cancelled = true; };
  }, [mode, personId, month, isStudent]);

  // Bucketed on the UTC date, matching how the server groups logs into days.
  const byDate = useMemo(() => {
    const map = new Map();
    for (const log of logs) {
      const key = String(log.recordedAt).slice(0, 10);
      const entry = map.get(key) || { pickups: [], drops: [], students: new Set() };
      (log.action === 'Pickup' ? entry.pickups : entry.drops).push(log.recordedAt);
      entry.students.add(log.studentId);
      map.set(key, entry);
    }
    return map;
  }, [logs]);

  const days = useMemo(
    () => buildMonthDays(month, row.dates, operatingDates, isStudent && row.onHold),
    [month, row.dates, operatingDates, isStudent, row.onHold]
  );

  // ISO strings sort chronologically, so first/last need no date parsing.
  const detailFor = date => {
    const entry = byDate.get(date);
    if (!entry) return { first: '', last: '', trips: 0, students: 0 };
    const times = [...entry.pickups, ...entry.drops].sort();
    return {
      first: isStudent
        ? (entry.pickups.length ? formatLogTime(entry.pickups.slice().sort()[0]) : '')
        : (times.length ? formatLogTime(times[0]) : ''),
      last: isStudent
        ? (entry.drops.length ? formatLogTime(entry.drops.slice().sort().pop()) : '')
        : (times.length ? formatLogTime(times[times.length - 1]) : ''),
      trips: times.length,
      students: entry.students.size
    };
  };

  const headers = isStudent
    ? ['Date', 'Day', 'Status', 'Pickup', 'Drop', 'Logs']
    : ['Date', 'Day', 'Status', 'First trip', 'Last trip', 'Trips', 'Students'];

  const exportRows = () => days.map(entry => {
    const detail = detailFor(entry.date);
    return isStudent
      ? [entry.date, entry.weekday, entry.status, detail.first, detail.last, detail.trips]
      : [entry.date, entry.weekday, entry.status, detail.first, detail.last, detail.trips, detail.students];
  });

  const slug = String(name || personId).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const baseName = `${isStudent ? 'student' : 'driver'}-attendance-${slug}-${month}`;

  const exportCsv = () => downloadCsv(`${baseName}.csv`, headers, exportRows());
  const exportExcel = () => downloadXlsx(`${baseName}.xlsx`, monthLabel(month), headers, exportRows());

  const presentDays = days.filter(entry => entry.status === 'Present').length;
  const absentDays = days.filter(entry => entry.status === 'Absent').length;

  return <div className="modal-backdrop" onClick={onClose}>
    <div className="record-modal attendance-modal" onClick={event => event.stopPropagation()}>
      <div className="modal-head">
        <div>
          <h2>{name}</h2>
          <p>
            {monthLabel(month)} — {presentDays} present, {absentDays} absent of {operatingDates.length} operating days
            {isStudent
              ? `${row.regNo ? ` · ${row.regNo}` : ''}${row.class ? ` · ${row.class}` : ''}${row.route ? ` · ${row.route}` : ''}`
              : `${row.phone ? ` · ${row.phone}` : ''}${row.vehicle ? ` · ${row.vehicle}` : ''}`}
          </p>
        </div>
        <button type="button" className="icon-btn" onClick={onClose}><Icon name="close" size={17}/></button>
      </div>

      <div className="attendance-modal-actions">
        <button type="button" className="filter-btn" onClick={exportCsv}><Icon name="upload" size={15}/>Export CSV</button>
        <button type="button" className="filter-btn" onClick={exportExcel}><Icon name="upload" size={15}/>Export Excel</button>
      </div>

      {isStudent && row.onHold && <div className="api-banner muted">
        <Icon name="alert" size={17}/>
        <span>This student is on hold, so days without a log are not counted as absences.</span>
      </div>}

      {state.error && <div className="form-error">Times could not be loaded ({state.error}). Present and absent days are still accurate.</div>}

      <div className="day-grid">
        {days.map(entry => <div key={entry.date} className={`day-chip ${statusTone(entry.status)}`} title={`${entry.date} — ${entry.status}`}>
          <strong>{entry.day}</strong>
          <small>{entry.weekday}</small>
        </div>)}
      </div>

      <div className="history-body">
        <table className="history-table">
          <thead><tr>{headers.map(header => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>{days.map(entry => {
            const detail = detailFor(entry.date);
            return <tr key={entry.date}>
              <td>{entry.date}</td>
              <td>{entry.weekday}</td>
              <td><Pill tone={statusTone(entry.status)}>{entry.status}</Pill></td>
              <td>{detail.first || '-'}</td>
              <td>{detail.last || '-'}</td>
              <td>{detail.trips || '-'}</td>
              {!isStudent && <td>{detail.students || '-'}</td>}
            </tr>;
          })}</tbody>
        </table>
        {state.loading && <div className="empty small-empty loading-inline"><span className="spinner"/>Loading times...</div>}
      </div>

      <div className="modal-actions">
        <button type="button" className="filter-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  </div>;
}

function AttendancePage({ routes }) {
  const [mode, setMode] = useState('students');
  const [month, setMonth] = useState(monthInputValue(new Date()));
  const [route, setRoute] = useState('all');
  const [query, setQuery] = useState('');
  const [report, setReport] = useState(null);
  const [state, setState] = useState({ loading: true, error: '' });
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, error: '' });
    // The open row belongs to the report being replaced, so close it.
    setSelected(null);
    const filters = mode === 'students'
      ? { month, ...(route !== 'all' ? { routeId: route } : {}) }
      : { month };
    const load = mode === 'students' ? api.getStudentAttendance(filters) : api.getDriverAttendance(filters);
    load
      .then(data => { if (!cancelled) { setReport(data); setState({ loading: false, error: '' }); } })
      .catch(error => { if (!cancelled) { setReport(null); setState({ loading: false, error: error.message }); } });
    return () => { cancelled = true; };
  }, [mode, month, route]);

  const rows = useMemo(() => {
    const all = report?.rows || [];
    const text = query.trim().toLowerCase();
    if (!text) return all;
    return all.filter(row => [row.student, row.driver, row.regNo, row.phone, row.route, row.vehicle, row.class]
      .some(field => String(field || '').toLowerCase().includes(text)));
  }, [report, query]);

  const operatingDays = report?.operatingDays || 0;
  // Averaged over the listed people, so filtering the list re-averages it.
  const averagePct = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + (row.attendancePct || 0), 0) / rows.length)
    : 0;
  const fullAttendance = operatingDays ? rows.filter(row => row.presentDays === operatingDays).length : 0;
  const neverPresent = rows.filter(row => !row.presentDays).length;

  // One column per operating day (P present / A absent / H on hold) followed by
  // the totals, so a single sheet serves as both the register and the summary.
  const buildSheet = () => {
    const dates = report?.dates || [];
    if (mode === 'students') {
      return {
        name: `student-attendance-${month}`,
        headers: ['Reg no', 'Student', 'Class', 'Branch', 'Route', ...dates, 'Present days', 'Absent days', 'Operating days', 'Attendance %', 'Pickups', 'Drops', 'On hold'],
        rows: rows.map(row => {
          const present = new Set(row.dates || []);
          const marks = dates.map(date => statusMark(present.has(date) ? 'Present' : row.onHold ? 'On hold' : 'Absent'));
          return [row.regNo, row.student, row.class, row.branch, row.route, ...marks,
            row.presentDays, row.onHold ? 0 : row.absentDays, operatingDays, row.attendancePct, row.pickups, row.drops, row.onHold ? 'Yes' : 'No'];
        })
      };
    }
    return {
      name: `driver-attendance-${month}`,
      headers: ['Driver', 'Phone', 'Vehicle', 'Status', ...dates, 'Days active', 'Days absent', 'Operating days', 'Attendance %', 'Trips logged', 'Students handled'],
      rows: rows.map(row => {
        const present = new Set(row.dates || []);
        const marks = dates.map(date => statusMark(present.has(date) ? 'Present' : 'Absent'));
        return [row.driver, row.phone, row.vehicle, row.status, ...marks,
          row.presentDays, row.absentDays, operatingDays, row.attendancePct, row.trips, row.studentsHandled];
      })
    };
  };

  const exportCsv = () => {
    const sheet = buildSheet();
    downloadCsv(`${sheet.name}.csv`, sheet.headers, sheet.rows);
  };

  const exportExcel = () => {
    const sheet = buildSheet();
    downloadXlsx(`${sheet.name}.xlsx`, monthLabel(month), sheet.headers, sheet.rows);
  };

  return <section className="attendance-screen">
    <section className="stats-grid compact">
      <StatCard label="Operating days" value={operatingDays} change={monthLabel(report?.month || month)} detail="days transport ran" icon="clock" tone="blue"/>
      <StatCard label={mode === 'students' ? 'Students' : 'Drivers'} value={rows.length} change="Listed" detail="in this view" icon={mode === 'students' ? 'student' : 'users'} tone="blue"/>
      <StatCard label="Average attendance" value={`${averagePct}%`} change={`${fullAttendance} full`} detail="of operating days" icon="check" tone={attendanceTone(averagePct)}/>
      <StatCard label="No activity" value={neverPresent} change="Zero days" detail={mode === 'students' ? 'students' : 'drivers'} icon="alert" tone={neverPresent ? 'amber' : 'green'}/>
    </section>

    <div className="panel fee-report">
      <div className="panel-head">
        <div>
          <h2>{mode === 'students' ? 'Student' : 'Driver'} monthly attendance</h2>
          <p>Built from pickup and drop logs — a day counts as present when transport was logged that day. Click a row for the day-by-day breakdown.</p>
        </div>
        <div className="panel-actions">
          <button type="button" className={`filter-btn ${mode === 'students' ? 'active' : ''}`} onClick={() => setMode('students')}><Icon name="student" size={15}/>Students</button>
          <button type="button" className={`filter-btn ${mode === 'drivers' ? 'active' : ''}`} onClick={() => setMode('drivers')}><Icon name="users" size={15}/>Drivers</button>
          <button type="button" className="filter-btn" onClick={exportCsv} disabled={!rows.length}><Icon name="upload" size={15}/>Export CSV</button>
          <button type="button" className="filter-btn" onClick={exportExcel} disabled={!rows.length}><Icon name="upload" size={15}/>Export Excel</button>
        </div>
      </div>

      <div className="report-filters">
        <label><span>Month</span><input type="month" value={month} onChange={event => setMonth(event.target.value)}/></label>
        {mode === 'students' && <label><span>Route</span><select value={route} onChange={event => setRoute(event.target.value)}>
          <option value="all">All routes</option>
          {routes.map(item => <option key={item.id} value={item.id}>{item.id}{item.name ? ` \u2014 ${item.name}` : ''}</option>)}
        </select></label>}
        <label><span>Search</span><input type="search" placeholder={mode === 'students' ? 'Name, reg no, class' : 'Name, phone, vehicle'} value={query} onChange={event => setQuery(event.target.value)}/></label>
      </div>

      {state.error && <div className="api-banner"><Icon name="alert" size={17}/><span>{state.error}</span></div>}

      {!state.loading && !state.error && !operatingDays && <div className="empty small-empty">
        No transport was logged in {monthLabel(month)}, so there is nothing to report for this month.
      </div>}

      {mode === 'drivers' && report?.unattributedLogs > 0 && <div className="api-banner muted">
        <Icon name="alert" size={17}/>
        <span>{report.unattributedLogs} log(s) this month have no driver recorded and are not counted against anyone. Logs only carry a driver from the point that change was deployed.</span>
      </div>}

      <div className="report-table">
        <table>
          <thead>{mode === 'students'
            ? <tr><th>Reg no</th><th>Student</th><th>Class</th><th>Route</th><th>Present</th><th>Absent</th><th>Attendance</th><th>Pickups</th><th>Drops</th><th>Last seen</th></tr>
            : <tr><th>Driver</th><th>Phone</th><th>Vehicle</th><th>Days active</th><th>Days absent</th><th>Attendance</th><th>Trips</th><th>Students</th><th>Last seen</th></tr>}
          </thead>
          <tbody>{mode === 'students'
            ? rows.map(row => <tr key={row.studentId} className="clickable-row" onClick={() => setSelected(row)} title={`Day-by-day attendance for ${row.student}`}>
                <td>{dash(row.regNo)}</td>
                <td><strong>{row.student}</strong>{row.onHold ? <> <Pill tone="amber">On hold</Pill></> : null}</td>
                <td>{dash(row.class)}</td>
                <td>{dash(row.route)}</td>
                <td><strong>{row.presentDays}</strong> / {operatingDays}</td>
                <td>{row.onHold ? '-' : row.absentDays}</td>
                <td><Pill tone={attendanceTone(row.attendancePct)}>{row.attendancePct}%</Pill></td>
                <td>{row.pickups}</td>
                <td>{row.drops}</td>
                <td>{row.lastSeen ? formatHistoryDate(row.lastSeen) : '-'}</td>
              </tr>)
            : rows.map(row => <tr key={row.driverId} className="clickable-row" onClick={() => setSelected(row)} title={`Day-by-day attendance for ${row.driver}`}>
                <td><strong>{row.driver}</strong></td>
                <td>{dash(row.phone)}</td>
                <td>{dash(row.vehicle)}</td>
                <td><strong>{row.presentDays}</strong> / {operatingDays}</td>
                <td>{row.absentDays}</td>
                <td><Pill tone={attendanceTone(row.attendancePct)}>{row.attendancePct}%</Pill></td>
                <td>{row.trips}</td>
                <td>{row.studentsHandled}</td>
                <td>{row.lastSeen ? formatHistoryDate(row.lastSeen) : '-'}</td>
              </tr>)}
          </tbody>
        </table>
        {state.loading && <div className="empty small-empty loading-inline"><span className="spinner"/>Loading attendance...</div>}
        {!state.loading && !state.error && operatingDays > 0 && !rows.length && <div className="empty small-empty">No one matches this filter.</div>}
      </div>
    </div>

    {selected && <AttendanceDetailModal
      mode={mode}
      row={selected}
      month={report?.month || month}
      operatingDates={report?.dates || []}
      onClose={() => setSelected(null)}
    />}
  </section>;
}

const studentIdFromSelection = selection => {
  const match = String(selection || '').match(/#(\d+)$/);
  return match ? Number(match[1]) : null;
};

/**
 * Loads the office's own fee summary sheet.
 *
 * The sheet is what the fee gateway produces, so it is read verbatim rather than
 * asked to be reshaped: the header row is located by name, and every column is
 * matched by its heading rather than its position, because the export the office
 * downloads hides columns D, E and I-K and a positional read would silently
 * shift every value after the first gap.
 */
function ImportFeeSheetModal({ onClose, onImported }) {
  const [state, setState] = useState({ stage: 'pick', error: '', preview: null, result: null, fileName: '' });
  const [busy, setBusy] = useState(false);

  const readRows = async file => {
    const workbook = await readWorkbook(await file.arrayBuffer());
    const grid = workbook.rows;
    const headerIndex = grid.findIndex(row => row.some(cell => String(cell).trim() === 'Student Name'));
    if (headerIndex === -1) {
      throw new Error('No "Student Name" column found — is this the fee summary sheet?');
    }
    const headers = grid[headerIndex].map(cell => String(cell).trim());
    return grid.slice(headerIndex + 1)
      .map(row => Object.fromEntries(headers.map((header, column) => [header, row[column] ?? '']).filter(([header]) => header)))
      .filter(row => String(row['Student Name'] ?? '').trim());
  };

  const pick = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setState(current => ({ ...current, error: '', fileName: file.name }));
    try {
      const rows = await readRows(file);
      if (!rows.length) throw new Error('That sheet has no student rows.');
      // Dry run first: the admin sees what a sheet will do before it touches a
      // single fee record.
      const preview = await api.importFeeSheet(rows, { dryRun: true });
      setState({ stage: 'preview', error: '', preview, result: null, fileName: file.name, rows });
    } catch (error) {
      setState(current => ({ ...current, error: error.message }));
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    setBusy(true);
    try {
      const result = await api.importFeeSheet(state.rows, { dryRun: false });
      setState(current => ({ ...current, stage: 'done', result, error: '' }));
      await onImported();
    } catch (error) {
      setState(current => ({ ...current, error: error.message }));
    } finally {
      setBusy(false);
    }
  };

  const summary = state.result || state.preview;

  return <div className="modal-backdrop" onClick={onClose}>
    <div className="record-modal" onClick={event => event.stopPropagation()}>
      <div className="modal-head">
        <div>
          <h2>Import fee sheet</h2>
          <p>Raises the dues the sheet describes, then records the payments against them</p>
        </div>
        <button type="button" className="icon-btn" onClick={onClose}><Icon name="close" size={17}/></button>
      </div>

      <div className="import-body">
        {state.stage === 'pick' && <label className="import-drop">
          <Icon name="upload" size={22}/>
          <strong>Choose the fee summary sheet</strong>
          <small>.xlsx or .csv, in the format the fee gateway exports</small>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={pick} disabled={busy}/>
        </label>}

        {busy && <div className="empty small-empty loading-inline"><span className="spinner"/>Reading {state.fileName}...</div>}

        {summary && !busy && <div className="import-summary">
          <div><span>Dues created</span><strong>{summary.duesCreated}</strong></div>
          <div><span>Dues updated</span><strong>{summary.duesUpdated}</strong></div>
          <div><span>Payments recorded</span><strong>{summary.paymentsRecorded}</strong></div>
          <div><span>Already imported</span><strong>{summary.paymentsSkipped}</strong></div>
        </div>}

        {summary?.rejected?.length > 0 && <div className="import-rejects">
          <strong>{summary.rejected.length} row(s) will be skipped</strong>
          <ul>{summary.rejected.slice(0, 12).map(reject => <li key={reject.row}>
            Row {reject.row} — {reject.student || '(no name)'}: {reject.reason}
          </li>)}</ul>
          {summary.rejected.length > 12 && <small>...and {summary.rejected.length - 12} more</small>}
        </div>}

        {state.stage === 'preview' && !busy && <p className="import-note">
          Nothing has been written yet. Payments are matched on their Qfix reference, so re-importing the same sheet updates rather than double-pays.
        </p>}

        {state.stage === 'done' && <div className="form-success">Import complete.</div>}
        {state.error && <div className="form-error">{state.error}</div>}
      </div>

      <div className="modal-actions">
        <button type="button" className="filter-btn" onClick={onClose} disabled={busy}>{state.stage === 'done' ? 'Close' : 'Cancel'}</button>
        {state.stage === 'preview' && <button type="button" className="primary-btn" onClick={commit} disabled={busy}>
          <Icon name="check" size={16}/>Import {summary ? summary.duesCreated + summary.duesUpdated : 0} row(s)
        </button>}
      </div>
    </div>
  </div>;
}

function PaymentsPage({ payments, students, feeDues, onAdd, onEdit, onDelete, onGenerateDues, onRemindAll, onImported }) {
  const [showReport, setShowReport] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Exported straight from the server so the column order and the derived Fee
  // Head / Fees Category come from the one place that owns the sheet format.
  const exportSheet = async () => {
    const sheet = await api.getFeeSheet({});
    await downloadXlsx(`fee-summary-${dateInputValue(new Date())}.xlsx`, 'Fee summary', sheet.columns, sheet.rows);
  };
  const dues = monthlyDueRows(feeDues);
  const rows = [...dues, ...payments];
  const settledPayments = settledPaymentRows(payments);
  const totalBilled = feeDues.reduce((sum, due) => sum + Number(due.billed || due.baseAmount || 0), 0);
  const totalPending = dues.reduce((sum, row) => sum + parseAmount(row.amount), 0);
  const totalCollected = feeDues.reduce((sum, due) => sum + Number(due.paidAmount || 0), 0);
  const findStudent = studentId => studentId
    ? students.find(item => Number(item.studentId || item.id) === studentId) || null
    : null;
  // A route's fee is one quarter's charge, so the plan is a straight multiple
  // of it. This previously returned 0 for anything but Monthly, which is why
  // Quarterly, Half-yearly and Annual never calculated an amount.
  const isMonthlyPlan = values => quartersFor(values) === 1;
  // Mirrors the server's balance formula: base + fine - discount, with the
  // base scaled by however many quarters the plan covers. Never goes negative,
  // so an over-large discount settles the due rather than owing money back.
  const dueAmountFor = values => {
    const base = totalDueForStudent(feeDues, findStudent(studentIdFromSelection(values.student)));
    const gross = base * quartersFor(values);
    const total = gross + parseAmount(values.penalty) - parseAmount(values.discount);
    return Math.max(0, roundToPaise(total));
  };
  const fields = values => paymentFields.map(field => {
    if (field.name === 'student') {
      return {...field, searchable: true, options: students.map(student => `${student.name} #${student.studentId || student.id}`)};
    }
    if (field.name === 'amount') {
      const totalDue = dueAmountFor(values);
      const isFullPayment = (values.paymentType || 'Full payment') === 'Full payment';
      return {
        ...field,
        readOnly: totalDue > 0 && isFullPayment,
        hint: totalDue > 0
          ? `Total due: ${formatCurrency(totalDue)}${isFullPayment ? '' : ' — enter an amount less than the due'}`
          : undefined
      };
    }
    return field;
  });
  const deriveValues = (changedField, values) => {
    if (!['student', 'paymentType', 'plan', 'discount', 'penalty'].includes(changedField)) return values;
    const totalDue = dueAmountFor(values);
    if (!totalDue) return values;
    const isFullPayment = (values.paymentType || 'Full payment') === 'Full payment';
    const currentAmount = Number(values.amount || 0);
    if (isFullPayment || changedField === 'student' || !currentAmount || currentAmount > totalDue) {
      return { ...values, amount: String(totalDue) };
    }
    return values;
  };
  if (showReport) {
    return <FeeReport rows={rows} students={students} onBack={() => setShowReport(false)}/>;
  }

  const dueSummary = <section className="stats-grid compact"><StatCard label="Monthly billed" value={formatCurrency(totalBilled)} change={currentMonthLabel()} detail="route fees" icon="money" tone="blue"/><StatCard label="Pending dues" value={formatCurrency(totalPending)} change={`${dues.length}`} detail="students" icon="clock" tone="amber"/><StatCard label="Collected" value={formatCurrency(totalCollected)} change={`${settledPayments.length}`} detail="receipts" icon="check" tone="green"/><StatCard label="Settled" value={feeDues.filter(due => due.status === 'Paid' || due.status === 'Waived').length} change="Ledger" detail="students" icon="check" tone="green"/></section>;
  const columns = [{key:'id',label:'Receipt ID',render:r=><strong>{r.id}</strong>},{key:'student',label:'Student'},{key:'plan',label:'Fee plan'},{key:'amount',label:'Amount',render:r=><strong>{r.amount}</strong>},{key:'date',label:'Payment / due date'},{key:'method',label:'Method'},statusCell('status'),{key:'createdAt',label:'Created',render:r=>formatHistoryDate(r.createdAt)}];
  return <DataPage type="Payment history" data={rows} columns={columns} subtitle={`${dues.length} quarterly route fee dues pending after received payments`} action="Record payment" fields={fields} deriveValues={deriveValues} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} createRecord={async values => {
    const studentId = studentIdFromSelection(values.student);
    const student = findStudent(studentId);
    const amount = Number(values.amount || 0);
    if (!amount || amount <= 0) throw new Error('Enter a valid payment amount.');

    let due = isMonthlyPlan(values) ? currentMonthDueForStudent(feeDues, studentId) : null;
    if (isMonthlyPlan(values) && !due && Number(student?.monthlyDue || 0) > 0) {
      // No fee due has been generated for this student/month yet — generate just this
      // student's due (not the whole school) so the payment can be linked to a real due
      // and its balance reconciled correctly.
      await api.generateFeeDues({ month: currentMonthKey(), studentId });
      const refreshed = await api.getFeeDues({ month: currentMonthKey(), studentId });
      due = refreshed.find(item => Number(item.studentId) === studentId) || null;
    }

    // Write any discount / penalty onto the due first. The server recomputes
    // base + fine - discount, so every check below runs against the adjusted
    // balance rather than the original one.
    const discountValue = parseAmount(values.discount);
    const penaltyValue = parseAmount(values.penalty);
    if (due && (discountValue > 0 || penaltyValue > 0)) {
      const dueId = due.dueId || due.id;
      due = await api.adjustFeeDue(dueId, { discount: discountValue, fine: penaltyValue });
    } else if (!due && (discountValue > 0 || penaltyValue > 0)) {
      throw new Error('A discount or penalty can only be applied against a generated fee due. Generate dues for this student first.');
    }

    if (due) {
      const balance = roundToPaise(due.balance);
      if (balance <= 0) {
        throw new Error(`${student?.name || 'This student'}'s due for this month is already fully paid. Pick a different plan or month if this is a separate payment.`);
      }
      const isFullPayment = (values.paymentType || 'Full payment') === 'Full payment';
      if (isFullPayment && !amountsEqual(amount, balance)) {
        throw new Error(`Full payment amount must equal the total due (${formatCurrency(balance)}).`);
      }
      if (!isFullPayment && roundToPaise(amount) >= balance) {
        throw new Error(`Partial payment must be less than the total due (${formatCurrency(balance)}).`);
      }
    }
    // discount / penalty live on the fee due, not on the payment row.
    const { paymentType, discount, penalty, ...rest } = values;
    return {
      ...rest,
      student: student?.name || values.student,
      studentId,
      dueId: due?.dueId || due?.id || null
    };
  }} secondaryAction={{ label: 'Fee report', icon: 'file', onClick: () => setShowReport(true) }} extraActions={[
    { label: 'Generate dues', icon: 'money', onClick: onGenerateDues },
    { label: 'Import sheet', icon: 'upload', onClick: () => setImportOpen(true) },
    // One export, in the .xlsx the office actually works in. A second CSV button
    // bought little and pushed the primary action off the toolbar.
    { label: 'Export sheet', icon: 'file', onClick: exportSheet },
    { label: 'Remind pending', icon: 'bell', onClick: onRemindAll }
  ]}>{dueSummary}{importOpen && <ImportFeeSheetModal onClose={() => setImportOpen(false)} onImported={onImported}/>}</DataPage>;
}

function DocumentsPage({ docs, onAdd }) {
  const columns = [{key:'owner',label:'Owner',render:r=><div><strong>{r.owner}</strong><small className="block-small">{r.kind}</small></div>},{key:'type',label:'Document type'},{key:'number',label:'Document number'},{key:'expiry',label:'Expiry date'},statusCell('status')];
  return <DataPage type="Document centre" data={docs} columns={columns} subtitle="No document records are stored until a database-backed document endpoint is added." action="Upload document" fields={documentFields} onAdd={onAdd}/>;
}

function TrackingPage({ vehicles }) {
  const [gpsPoints, setGpsPoints] = useState([]);
  const [gpsStatus, setGpsStatus] = useState({ loading: true, error: '', local: false, ageMs: 0, stale: false });
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    let active = true;
    const loadGps = async () => {
      try {
        const payload = await api.getGpsVehicles();
        if (!active) return;
        const rows = payload?.vehicles || [];
        setGpsPoints(rows);
        setSelectedId(current => current || rows[0]?.id || '');
        setGpsStatus({
          loading: false,
          error: '',
          local: false,
          ageMs: payload?.ageMs || 0,
          stale: Boolean(payload?.stale)
        });
      } catch (error) {
        if (!active) return;
        // Say so rather than quietly drawing demo positions: a map of invented
        // buses that looks real is worse than an empty one that admits it.
        setGpsPoints([]);
        setGpsStatus({ loading: false, error: error.message, local: true, ageMs: 0, stale: false });
      }
    };

    loadGps();
    // The backend caches for a minute (the provider's own rate limit), so
    // polling faster than this only re-reads the same cached positions.
    const timer = window.setInterval(loadGps, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!selectedId && vehicles.length) {
      setSelectedId(vehicles[0].id);
    }
  }, [selectedId, vehicles]);

  const liveVehicles = gpsPoints.length
    ? gpsPoints.map(point => {
        // The server matched the plate already; this only adds the student
        // count, which it has no reason to carry.
        const matched = vehicles.find(vehicle => vehicle.id === point.vehicleCode);
        return {
          ...point,
          route: point.route || point.alias || '-',
          students: matched?.students || 0,
          tone: point.ignition ? 'green' : 'gray'
        };
      })
    : demoVehiclePoints(vehicles).map(point => {
      const vehicle = vehicles.find(item => item.id === point.vehicleNo) || {};
      return {
        ...point,
        driver: vehicle.driver || 'Unassigned',
        route: vehicle.route || point.alias || '-',
        students: vehicle.students || 0,
        tone: vehicle.tone,
        status: vehicle.status || (point.ignition ? 'On route' : 'Stopped')
      };
    });

  const selected = liveVehicles.find(vehicle => vehicle.id === selectedId) || liveVehicles[0];

  return <section className="tracking-page">
    <div className="panel tracking-map">
      <div className="panel-head">
        <div>
          <h2>Live fleet map</h2>
          <p><span className="live-dot"></span>{gpsStatus.local ? 'Database vehicle locations' : gpsStatus.loading ? 'Connecting to GPS API...' : 'Updating every 10 seconds'}</p>
        </div>
        <div className="tracking-meta"><span>{gpsStatus.local ? 'DB fallback' : `${gpsPoints.length} live vehicles`}</span></div>
      </div>
      {gpsStatus.error && <div className="gps-error"><Icon name="alert" size={17}/><span>{gpsStatus.error}</span></div>}
      <VehicleLiveMap points={gpsPoints} fallbackVehicles={vehicles} selectedVehicleId={selected?.id || selected?.vehicleNo}/>
    </div>
    <div className="panel tracking-list">
      <div className="panel-head"><div><h2>Active vehicles</h2><p>{liveVehicles.filter(v => v.status !== 'Offline').length} of {liveVehicles.length} online</p></div></div>
      <label className="table-search full"><Icon name="search" size={16}/><input placeholder="Search vehicle or driver..."/></label>
      {selected && <div className="selected-gps-card"><strong>{selected.vehicleNo}</strong><span>{selected.route} - {selected.driver}</span><div><b>{selected.speed || 0} km/h</b><small>{timeAgo(selected.timestamp)}</small></div></div>}
      <div className="tracking-list-scroll">{liveVehicles.map(v=><button key={v.id} onClick={()=>setSelectedId(v.id)} className={`tracking-vehicle ${selected?.id===v.id?'selected':''}`}><span className={`vehicle-tile ${v.tone}`}><Icon name="bus"/></span><div><strong>{v.vehicleNo} <Pill tone={v.tone}>{v.status}</Pill></strong><small>{v.driver} - {v.route}</small><span>{v.students} students <b>-</b> {v.speed?`${v.speed} km/h`:timeAgo(v.timestamp)}</span></div><Icon name="arrow" size={16}/></button>)}</div>
    </div>
  </section>;
}

const NOTIFICATION_TYPES = [
  { value: 'all', label: 'All types' },
  { value: 'FeeReminder', label: 'Fee reminder' },
  { value: 'Pickup', label: 'Pickup' },
  { value: 'Drop', label: 'Drop' }
];

const notificationTypeLabel = type =>
  NOTIFICATION_TYPES.find(item => item.value === type)?.label || dash(type);

function formatSentAt(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function NotificationsPage({ students, feeDues, onRemindStudent, onRemindAll }) {
  const [selection, setSelection] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [message, setMessage] = useState(null);

  // Sent history, loaded from the backend rather than derived from local state
  // so it also shows Pickup/Drop notifications raised by drivers.
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [query, setQuery] = useState('');

  const loadHistory = async (type = typeFilter) => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const result = await api.getNotifications({ type, limit: 200 });
      setHistory(result?.notifications || []);
      setHistoryTotal(result?.total || 0);
    } catch (error) {
      setHistoryError(error.message || 'Unable to load sent notifications.');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => { loadHistory(typeFilter); }, [typeFilter]);

  const filteredHistory = useMemo(() => {
    const text = safeText(query).toLowerCase();
    if (!text) return history;
    return history.filter(row =>
      [row.studentName, row.phone, row.title, row.body, row.type]
        .map(safeText).join(' ').toLowerCase().includes(text)
    );
  }, [history, query]);

  const studentField = {
    name: 'student',
    label: 'Student',
    placeholder: 'Search student by name...',
    options: students.map(student => `${student.name} #${student.studentId || student.id}`)
  };

  const pendingCount = feeDues.filter(due => Number(due.balance) > 0).length;

  const sendSingle = async () => {
    const studentId = studentIdFromSelection(selection);
    if (!studentId) {
      setMessage({ tone: 'error', text: 'Search and select a student first.' });
      return;
    }
    const student = students.find(item => Number(item.studentId || item.id) === studentId);
    setSending(true);
    setMessage(null);
    try {
      const result = await onRemindStudent({ studentId, name: student?.name });
      setMessage({
        tone: 'success',
        text: result?.sent > 0
          ? `Fee reminder sent to ${student?.name || 'the parent'}.`
          : `Reminder saved for ${student?.name || 'this student'}, but no parent device is registered yet.`
      });
      setSelection('');
      loadHistory();
    } catch (error) {
      setMessage({ tone: 'error', text: error.message || 'Unable to send reminder.' });
    } finally {
      setSending(false);
    }
  };

  const sendAll = async () => {
    if (!window.confirm('Send a fee reminder to every parent with outstanding dues?')) return;
    setSendingAll(true);
    setMessage(null);
    try {
      const result = await onRemindAll();
      setMessage({
        tone: 'success',
        text: result?.students > 0
          ? `Fee reminders sent for ${result.students} student(s) with pending dues.`
          : 'No students currently have outstanding dues.'
      });
      loadHistory();
    } catch (error) {
      setMessage({ tone: 'error', text: error.message || 'Unable to send reminders.' });
    } finally {
      setSendingAll(false);
    }
  };

  return <section className="data-page">
    <div className="panel" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span className="stat-icon blue"><Icon name="bell"/></span>
        <div>
          <h2 style={{ margin: 0 }}>Send fee reminder</h2>
          <p style={{ margin: 0, color: 'var(--muted, #6b7280)' }}>Push a fee-due reminder to a parent's phone via the mobile app.</p>
        </div>
      </div>

      {message && <div className={message.tone === 'error' ? 'form-error' : 'form-success'} style={{ margin: '12px 0 0' }}>{message.text}</div>}

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginTop: 20, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 280 }}>
          <label><span>Student</span><SearchableSelect field={studentField} value={selection} onChange={setSelection}/></label>
        </div>
        <button type="button" className="filter-btn report-open-btn" onClick={sendSingle} disabled={sending}>
          {sending ? <span className="spinner spinner-sm"/> : <Icon name="bell" size={16}/>}
          Send reminder
        </button>
      </div>

      <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid var(--border, #e5e7eb)' }}/>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <strong>Remind everyone with pending dues</strong>
          <p style={{ margin: '4px 0 0', color: 'var(--muted, #6b7280)' }}>{pendingCount} due record(s) currently pending across all students.</p>
        </div>
        <button type="button" className="filter-btn report-open-btn" onClick={sendAll} disabled={sendingAll}>
          {sendingAll ? <span className="spinner spinner-sm"/> : <Icon name="bell" size={16}/>}
          Remind all pending
        </button>
      </div>
    </div>

    <div className="panel table-panel">
      <div className="table-toolbar">
        <div>
          <h2>Sent notifications</h2>
          <p>Every notification delivered to parents, including pickup and drop alerts raised by drivers.</p>
        </div>
        <div className="toolbar-actions">
          <label className="table-search">
            <Icon name="search" size={16}/>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search student, phone or message..."/>
          </label>
          <select className="filter-btn" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            {NOTIFICATION_TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <button type="button" className="filter-btn" onClick={() => loadHistory()} disabled={historyLoading}>
            {historyLoading ? <span className="spinner spinner-sm"/> : <Icon name="refresh" size={16}/>}
            Refresh
          </button>
        </div>
      </div>

      {historyError && <div className="form-error" style={{ margin: '0 16px 12px' }}>{historyError}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sent</th>
              <th>Type</th>
              <th>Student</th>
              <th>Parent phone</th>
              <th>Message</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.map(row => <tr key={row.id}>
              <td>{formatSentAt(row.createdAt)}</td>
              <td><Pill tone="blue">{notificationTypeLabel(row.type)}</Pill></td>
              <td>{dash(row.studentName)}</td>
              <td>{dash(row.phone)}</td>
              <td>
                <strong>{dash(row.title)}</strong>
                <div style={{ color: 'var(--muted, #6b7280)', fontSize: 13 }}>{dash(row.body)}</div>
              </td>
              <td><Pill tone={row.read ? 'green' : 'amber'}>{row.read ? 'Read' : 'Unread'}</Pill></td>
            </tr>)}
          </tbody>
        </table>
        {historyLoading && !filteredHistory.length && <div className="empty">Loading sent notifications...</div>}
        {!historyLoading && !filteredHistory.length && <div className="empty">No notifications have been sent yet.</div>}
      </div>

      <div className="table-footer">
        <span>Showing {filteredHistory.length} of {historyTotal} notification(s)</span>
      </div>
    </div>
  </section>;
}

function SettingsPage() {
  return <section className="data-page">
    <div className="panel placeholder">
      <span className="stat-icon blue"><Icon name="settings"/></span>
      <h2>Workspace settings</h2>
      <p>School profile, fee plans, routes, user access, and integrations can be configured here.</p>
      <button className="primary-btn">Open configuration</button>
    </div>

    <div className="panel" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span className="stat-icon blue"><Icon name="file"/></span>
        <div>
          <h2 style={{ margin: 0 }}>Legal</h2>
          <p style={{ margin: 0, color: 'var(--muted, #6b7280)' }}>Policies published to parents and app stores.</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
        <div>
          <strong>Privacy policy</strong>
          <p style={{ margin: '4px 0 0', color: 'var(--muted, #6b7280)' }}>
            Explains what the app collects and who can see it. This page is public — it needs to be
            reachable without logging in for the Play Store listing.
          </p>
        </div>
        {/* Plain anchor with target: /privacy is served outside the admin session gate. */}
        <a className="filter-btn report-open-btn" href="/privacy" target="_blank" rel="noopener noreferrer">
          <Icon name="file" size={16}/>
          View privacy policy
        </a>
      </div>
    </div>
  </section>;
}

function SuperAdminLogin({ onLogin }) {
  const [email, setEmail] = useState('admin@campus.local');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ loading: false, error: '' });

  const submit = async event => {
    event.preventDefault();
    setStatus({ loading: true, error: '' });
    try {
      const session = await api.loginSuperAdmin({ email: email.trim(), password: password.trim() });
      setStoredSession(session);
      onLogin(session);
    } catch (error) {
      setStatus({ loading: false, error: error.message || 'Login failed.' });
    }
  };

  return <main className="login-screen">
    <section className="login-card">
      <div className="login-brand"><span className="brand-mark"><AdimoveLogo size={24} title="Adimove"/></span><div><strong>Adimove</strong><small>Super admin access</small></div></div>
      <h1>Login to admin dashboard</h1>
      <p>Use your super-admin credentials to manage students, vehicles, routes, fees, and transport operations.</p>
      <form onSubmit={submit}>
        <label><span>Email</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="admin@school.com" autoComplete="username" required/></label>
        <label><span>Password</span><input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter password" autoComplete="current-password" required/></label>
        {status.error && <div className="form-error login-error">{status.error}</div>}
        <button className="primary-btn login-submit" disabled={status.loading} type="submit">{status.loading && <span className="spinner"/>}{status.loading ? 'Checking...' : 'Login as super admin'}</button>
      </form>
      {import.meta.env.DEV && <small className="login-hint">Local dev default: admin@campus.local / Admin@12345 (unless overridden by SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD). Never shown in production builds.</small>}
      {/* Plain anchor, not a state change: /privacy renders outside this gate. */}
      <small className="login-hint"><a href="/privacy">Privacy policy</a></small>
    </section>
  </main>;
}

export default function AdminApp() {
  const [session, setSession] = useState(() => getStoredSession());
  useEffect(() => {
    const handleSessionExpired = () => setSession(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);
  const [active, setActive] = useState('Overview');
  const [menu, setMenu] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [students, setStudents] = useState([]);
  const [vehicleFilters, setVehicleFilters] = useState({});
  const [routeFilters, setRouteFilters] = useState({});
  const [driverFilters, setDriverFilters] = useState({});
  const [studentFilters, setStudentFilters] = useState({});
  const [payments, setPayments] = useState([]);
  const [feeDues, setFeeDues] = useState([]);
  const [docs, setDocs] = useState([]);
  const [apiStatus, setApiStatus] = useState({ loading: Boolean(session?.token), error: '' });
  const [tableLoading, setTableLoading] = useState({});
  const setResourceLoading = (key, value) => setTableLoading(current => ({ ...current, [key]: value }));
  const refreshCoreData = async () => {
    const [vehiclesData, routesData, driversData, studentsData, paymentsData, feeDuesData] = await Promise.all([
      api.getVehicles(),
      api.getRoutes(),
      api.getDrivers(),
      api.getStudents(),
      api.getPayments(),
      api.getFeeDues({ month: currentMonthKey() })
    ]);
    setVehicles(vehiclesData);
    setRoutes(routesData);
    setDrivers(driversData);
    setStudents(studentsData);
    setPayments(paymentsData);
    setFeeDues(feeDuesData);
    setApiStatus({ loading: false, error: '' });
  };

  useEffect(() => {
    if (!session?.token) return;
    let activeRequest = true;
    Promise.all([api.getVehicles(), api.getRoutes(), api.getDrivers(), api.getStudents(), api.getPayments(), api.getFeeDues({ month: currentMonthKey() })])
      .then(([vehiclesData, routesData, driversData, studentsData, paymentsData, feeDuesData]) => {
        if (!activeRequest) return;
        setVehicles(vehiclesData);
        setRoutes(routesData);
        setDrivers(driversData);
        setStudents(studentsData);
        setPayments(paymentsData);
        setFeeDues(feeDuesData);
        setApiStatus({ loading: false, error: '' });
      })
      .catch(error => {
        if (!activeRequest) return;
        setApiStatus({ loading: false, error: error.message || 'Backend is not reachable.' });
      });
    return () => {
      activeRequest = false;
    };
  }, [session?.token]);

  // The bootstrap effect above already loads the unfiltered vehicles/routes/drivers/
  // students. Skip each filter effect's very first run so login doesn't fire the
  // same four requests twice; still refetch on every real filter change after that.
  const vehiclesFirstRun = useRef(true);
  const routesFirstRun = useRef(true);
  const driversFirstRun = useRef(true);
  const studentsFirstRun = useRef(true);

  useEffect(() => {
    if (!session?.token) return;
    if (vehiclesFirstRun.current) { vehiclesFirstRun.current = false; return; }
    let activeRequest = true;
    setResourceLoading('vehicles', true);
    api.getVehicles(vehicleFilters)
      .then(rows => activeRequest && setVehicles(rows))
      .catch(error => activeRequest && setApiStatus({ loading: false, error: error.message || 'Unable to filter vehicles.' }))
      .finally(() => activeRequest && setResourceLoading('vehicles', false));
    return () => { activeRequest = false; };
  }, [vehicleFilters, session?.token]);

  useEffect(() => {
    if (!session?.token) return;
    if (routesFirstRun.current) { routesFirstRun.current = false; return; }
    let activeRequest = true;
    setResourceLoading('routes', true);
    api.getRoutes(routeFilters)
      .then(rows => activeRequest && setRoutes(rows))
      .catch(error => activeRequest && setApiStatus({ loading: false, error: error.message || 'Unable to filter routes.' }))
      .finally(() => activeRequest && setResourceLoading('routes', false));
    return () => { activeRequest = false; };
  }, [routeFilters, session?.token]);

  useEffect(() => {
    if (!session?.token) return;
    if (driversFirstRun.current) { driversFirstRun.current = false; return; }
    let activeRequest = true;
    setResourceLoading('drivers', true);
    api.getDrivers(driverFilters)
      .then(rows => activeRequest && setDrivers(rows))
      .catch(error => activeRequest && setApiStatus({ loading: false, error: error.message || 'Unable to filter drivers.' }))
      .finally(() => activeRequest && setResourceLoading('drivers', false));
    return () => { activeRequest = false; };
  }, [driverFilters, session?.token]);

  useEffect(() => {
    if (!session?.token) return;
    if (studentsFirstRun.current) { studentsFirstRun.current = false; return; }
    let activeRequest = true;
    setResourceLoading('students', true);
    api.getStudents(studentFilters)
      .then(rows => activeRequest && setStudents(rows))
      .catch(error => activeRequest && setApiStatus({ loading: false, error: error.message || 'Unable to filter students.' }))
      .finally(() => activeRequest && setResourceLoading('students', false));
    return () => { activeRequest = false; };
  }, [studentFilters, session?.token]);

  const handleAddVehicle = async record => {
    // The vehicle form's driver field is read-only (assignment happens from the
    // Drivers page), so there is nothing else to do here after creation.
    await api.createVehicle(record);
    await refreshCoreData();
  };
  const handleEditVehicle = async (row, record) => {
    await api.updateVehicle(row.vehicleId || row.id, record);
    await refreshCoreData();
  };

  const handleAddRoute = async record => {
    await api.createRoute(record);
    await refreshCoreData();
  };
  const handleEditRoute = async (row, record) => {
    await api.updateRoute(row.routeId || row.id, record);
    await refreshCoreData();
  };
  const handleDeleteRoute = async row => {
    await api.deleteRoute(row.routeId || row.id);
    await refreshCoreData();
  };

  const handleAddDriver = async record => {
    const created = await api.createDriver(record);
    if (record.vehicle && record.vehicle !== 'Unassigned' && record.route) {
      await api.assignDriver({ driverId: created.driverId, vehicleId: record.vehicle, route: record.route });
    }
    await refreshCoreData();
  };
  const handleEditDriver = async (row, record) => {
    const driverId = row.driverId || row.id;
    const updated = await api.updateDriver(driverId, record);
    if (!record.vehicle || record.vehicle === 'Unassigned') {
      await api.unassignDriverByDriverId(driverId);
    } else if (record.vehicle !== row.vehicle || record.route !== row.route) {
      await api.assignDriver({ driverId: updated.driverId, vehicleId: record.vehicle, route: record.route });
    }
    await refreshCoreData();
  };

  const handleAddStudent = async record => {
    const created = await api.createStudent(record);
    if (record.route && record.route !== 'Not assigned') {
      await api.assignStudent({ studentId: created.studentId, routeId: record.route, slabId: slabIdFrom(record.slab) });
    }
    await refreshCoreData();
  };
  const handleEditStudent = async (row, record) => {
    const studentId = row.studentId || row.id;
    const updated = await api.updateStudent(studentId, record);
    if (!record.route || record.route === 'Not assigned') {
      if (row.route) {
        await api.unassignStudentByStudentId(updated.studentId);
      }
    // Re-assign when the slab changes too, not only the route — moving a student
    // between slabs on the same route is exactly how their fee gets corrected.
    } else if (record.route !== row.route || slabIdFrom(record.slab) !== (row.slabId ?? undefined)) {
      await api.assignStudent({ studentId: updated.studentId, routeId: record.route, slabId: slabIdFrom(record.slab) });
    }
    await refreshCoreData();
  };
  const handleDeleteStudent = async row => {
    await api.deleteStudent(row.studentId || row.id);
    await refreshCoreData();
  };
  const handleBulkAssignStudents = async assignments => {
    const result = await api.assignStudentsBulk(assignments);
    await refreshCoreData();
    if (result?.failed?.length) {
      throw new Error(`${result.failed.length} of ${assignments.length} assignments failed. First error: ${result.failed[0].error}`);
    }
    return result;
  };

  const handleGenerateDues = async () => {
    await api.generateFeeDues({ month: currentMonthKey() });
    await refreshCoreData();
  };

  const handleRemindStudent = async row => {
    const studentId = Number(row.studentId ?? row.id);
    if (!studentId) throw new Error('This student has no id to send a reminder to.');
    const result = await api.sendFeeReminder({ studentId });
    window.alert(
      result.sent > 0
        ? `Fee reminder sent to ${row.name || 'the parent'}.`
        : `Reminder saved for ${row.name || 'this student'}, but no parent device is registered yet.`
    );
  };

  const handleRemindAllDues = async () => {
    if (!window.confirm('Send a fee reminder to every parent with outstanding dues?')) return;
    const result = await api.sendFeeReminder({ all: true });
    window.alert(
      result.students > 0
        ? `Fee reminders sent for ${result.students} student(s) with pending dues.`
        : 'No students currently have outstanding dues.'
    );
  };

  const handleLogin = nextSession => {
    setSession(nextSession);
    setApiStatus({ loading: true, error: '' });
  };

  const handleLogout = () => {
    clearStoredSession();
    setSession(null);
    setVehicles([]);
    setRoutes([]);
    setDrivers([]);
    setStudents([]);
    setPayments([]);
    setFeeDues([]);
    setApiStatus({ loading: false, error: '' });
  };

  if (!session?.token) {
    return <SuperAdminLogin onLogin={handleLogin}/>;
  }

  let content = <Overview setActive={setActive} vehicles={vehicles} students={students} payments={payments} feeDues={feeDues}/>;
  if(active==='Live tracking') content=<TrackingPage vehicles={vehicles}/>;
  if(active==='Routes') content=<RoutesPage routes={routes} vehicles={vehicles} filters={routeFilters} onFiltersChange={setRouteFilters} onAdd={handleAddRoute} onEdit={handleEditRoute} onDelete={handleDeleteRoute} loading={tableLoading.routes}/>;
  if(active==='Vehicles') content=<VehiclesPage vehicles={vehicles} routes={routes} filters={vehicleFilters} onFiltersChange={setVehicleFilters} onAdd={handleAddVehicle} onEdit={handleEditVehicle} loading={tableLoading.vehicles}/>;
  if(active==='Drivers') content=<DriversPage drivers={drivers} vehicles={vehicles} routes={routes} filters={driverFilters} onFiltersChange={setDriverFilters} onAdd={handleAddDriver} onEdit={handleEditDriver} loading={tableLoading.drivers}/>;
  if(active==='Students') content=<StudentsPage students={students} routes={routes} feeDues={feeDues} filters={studentFilters} onFiltersChange={setStudentFilters} onAdd={handleAddStudent} onEdit={handleEditStudent} onDelete={handleDeleteStudent} onRemind={handleRemindStudent} onBulkAssign={handleBulkAssignStudents} onImported={refreshCoreData} loading={tableLoading.students}/>;
  if(active==='Fees & payments') content=<PaymentsPage payments={payments} students={students} feeDues={feeDues} onGenerateDues={handleGenerateDues} onRemindAll={handleRemindAllDues} onImported={refreshCoreData} onAdd={async record => { await api.createPayment(record); await refreshCoreData(); }} onEdit={async record => {
    // Only these four are correctable; the student and the due a receipt is
    // linked to are not, so a misassigned payment must be deleted and re-posted.
    await api.updatePayment(record.id, { amount: parseAmount(record.amount), status: record.status, method: record.method, date: record.date });
    await refreshCoreData();
  }} onDelete={async record => { await api.deletePayment(record.id); await refreshCoreData(); }}/>;
  if(active==='Attendance') content=<AttendancePage routes={routes}/>;
  if(active==='Documents') content=<DocumentsPage docs={docs} onAdd={() => { throw new Error('Document storage endpoint is not configured.'); }}/>;
  if(active==='Notifications') content=<NotificationsPage students={students} feeDues={feeDues} onRemindStudent={async ({ studentId }) => api.sendFeeReminder({ studentId })} onRemindAll={async () => api.sendFeeReminder({ all: true })}/>;
  if(active==='Settings') content=<SettingsPage/>;
  content = <>{apiStatus.error && <div className="api-banner"><Icon name="alert" size={17}/><span>{apiStatus.error}</span></div>}{apiStatus.loading && <div className="api-banner muted"><span className="spinner"/><span>Connecting to backend...</span></div>}{content}</>;
  return <div className="app-shell"><Sidebar active={active} setActive={setActive} open={menu} setOpen={setMenu} admin={session.admin} onLogout={handleLogout}/>{menu&&<div className="backdrop" onClick={()=>setMenu(false)}/>}<main><Header title={active} setMenu={setMenu}/><div className="content">{content}</div><footer>Adimove Admin</footer></main></div>;
}
