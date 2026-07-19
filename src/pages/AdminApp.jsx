import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../assets/global.css';
import { Pill } from '../components/Pill.jsx';
import { useDebouncedEffect } from '../hooks/useDebouncedEffect.js';
import { campusService as api } from '../services/campusService.js';
import { clearStoredSession, getStoredSession, SESSION_EXPIRED_EVENT, setStoredSession } from '../api/client.js';
import { amountsEqual, currentMonthKey, currentMonthLabel, dash, dateInputValue, formatCurrency, initialsFor, parseAmount, roundToPaise, safeText } from '../utils/formatters.js';

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
    alert: <><path d="M10.3 3.6 2.2 18a2 2 0 0 0 1.8 3h16a2 2 0 0 0 1.8-3L13.7 3.6a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></>
  };
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
};

const nav = [
  ['Overview', 'grid'], ['Live tracking', 'pin'], ['Routes', 'route'], ['Vehicles', 'bus'], ['Drivers', 'users'],
  ['Students', 'student'], ['Fees & payments', 'money'], ['Documents', 'file'], ['Notifications', 'bell']
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
    <div className="brand"><span className="brand-mark"><Icon name="route" size={22}/></span><div>campus<span>_route</span><small>School transport</small></div></div>
    <button className="close-menu" onClick={() => setOpen(false)}><Icon name="close"/></button>
    <div className="nav-label">Workspace</div>
    <nav>{nav.map(([label, icon]) => <button key={label} className={active === label ? 'active' : ''} onClick={() => { setActive(label); setOpen(false); }}><Icon name={icon}/><span>{label}</span></button>)}</nav>
    <div className="sidebar-bottom">
      <button onClick={() => setActive('Settings')}><Icon name="settings"/><span>Settings</span></button>
      <div className="support"><span><Icon name="alert" size={17}/></span><div><strong>Need assistance?</strong><small>Contact support</small></div><Icon name="arrow" size={15}/></div>
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

function RecordModal({ title, fields, values, setValues, onClose, onSubmit, saving = false, error = '', deriveValues }) {
  const updateField = (field, rawValue) => {
    const value = field.digitsOnly ? rawValue.replace(/\D/g, '') : rawValue;
    const nextValues = { ...values, [field.name]: value };
    setValues(deriveValues ? deriveValues(field.name, nextValues) : nextValues);
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
        {fields.map(field => <label key={field.name} className={field.full ? 'full' : ''}>
          <span>{field.label}{field.required && <em className="required-star"> *</em>}</span>
          {field.type === 'select'
            ? field.searchable
              ? <SearchableSelect field={field} value={values[field.name] || ''} onChange={value => updateField(field, value)}/>
              : <select value={values[field.name] || ''} onChange={event => updateField(field, event.target.value)} required={field.required} disabled={field.readOnly}>
                  <option value="">Select</option>
                  {field.options.map(option => <option key={option} value={option}>{option}</option>)}
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
    return student.routeId ? String(student.routeId) : '';
  };
  const setSelection = (studentId, routeId) => setOverrides(current => ({ ...current, [studentId]: routeId }));

  const visibleStudents = students.filter(student =>
    [student.name, student.area, student.phone, student.class].map(safeText).join(' ').toLowerCase().includes(safeText(query).toLowerCase())
  );

  const submit = async () => {
    const assignments = students
      .map(student => {
        const id = studentKey(student);
        const selected = valueFor(student);
        return selected && Number(selected) !== Number(student.routeId || 0)
          ? { studentId: Number(id), routeId: Number(selected) }
          : null;
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
                {routes.map(route => <option key={route.routeId} value={route.routeId}>{route.id} · {route.name}</option>)}
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

function Header({ title, setMenu, noticeCount, setActive }) {
  return <header><div className="header-title"><button className="menu-btn" onClick={() => setMenu(true)}><Icon name="menu"/></button><div><h1>{title}</h1><p>{title === 'Overview' ? 'Here’s what’s happening with your fleet today.' : `Manage and review ${title.toLowerCase()}.`}</p></div></div><div className="header-actions"><label className="global-search"><Icon name="search" size={17}/><input placeholder="Search anything..."/><kbd>⌘ K</kbd></label><button className="icon-btn"><Icon name="bell"/><i>{noticeCount}</i></button><button className="primary-btn" onClick={() => setActive('Students')}><Icon name="plus" size={17}/> Quick add</button></div></header>;
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

function DataPage({ type, data, columns, subtitle, action, children, fields = [], onAdd, onEdit, onDelete, onHistory, createRecord, serverFilters = false, filters = {}, filterFields = [], onFiltersChange, secondaryAction, extraActions = [], deriveValues, loading = false }) {
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
        <div><h2>{type}</h2><p>{subtitle}</p></div>
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
              <td>{onEdit || onDelete || onHistory ? <div className="row-actions">{onHistory && <button type="button" className="text-action" onClick={() => onHistory(row)} disabled={isDeleting}>History</button>}{onEdit && <button type="button" className="text-action" onClick={() => openEditModal(row)} disabled={isDeleting}>Edit</button>}{onDelete && <button type="button" className="text-action danger" onClick={() => deleteRow(row)} disabled={isDeleting}>{isDeleting ? <span className="spinner spinner-sm"/> : 'Delete'}</button>}</div> : <button className="more">...</button>}</td>
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
const monthKeyForPayment = payment => {
  const rawDate = String(payment.date || '').trim();
  const parsed = rawDate ? new Date(rawDate) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
  }
  const label = rawDate.match(/\b([A-Z][a-z]{2,8})\s+(\d{4})\b/);
  if (!label) return '';
  const month = new Date(`${label[1]} 1, ${label[2]}`);
  return Number.isNaN(month.getTime()) ? '' : `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
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
  { name: 'id', label: 'Route code', required: true, placeholder: 'RT-01', pattern: '[A-Za-z0-9][A-Za-z0-9-]*', minLength: 2, maxLength: 32, title: 'Start with a letter or number; letters, numbers, and hyphens only' },
  { name: 'name', label: 'Route name', required: true, minLength: 2, maxLength: 120 },
  { name: 'fee', label: 'Monthly fee', type: 'number', required: true, min: '0', max: '99999999.99', step: '0.01', inputMode: 'decimal' },
  { name: 'vehicle', label: 'Assigned bus', type: 'select', options: ['Not assigned'], defaultValue: 'Not assigned' },
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
  { name: 'kms', label: 'Kms', type: 'number', min: '0', max: '500', step: '0.01', inputMode: 'decimal' },
  { name: 'tagNo', label: 'Tag No.', required: true, placeholder: 'T-A', maxLength: 32 },
  { name: 'area', label: 'Area', required: true, minLength: 2, maxLength: 180 },
  { name: 'phone', label: 'Phone number', required: true, pattern: '[0-9]{10}', maxLength: 10, inputMode: 'numeric', digitsOnly: true, title: 'Enter a 10-digit phone number' },
  { name: 'secondaryPhone', label: 'Secondary contact number', pattern: '[0-9]{10}', maxLength: 10, inputMode: 'numeric', digitsOnly: true, title: 'Enter a 10-digit phone number' },
  { name: 'route', label: 'Route', type: 'select', options: [] }
];
const paymentFields = [
  { name: 'student', label: 'Student', type: 'select', options: [], required: true },
  { name: 'plan', label: 'Fee plan', type: 'select', options: ['Monthly', 'Quarterly', 'Half-yearly', 'Annual'], required: true, defaultValue: 'Monthly' },
  { name: 'paymentType', label: 'Payment type', type: 'select', options: ['Full payment', 'Partial payment'], required: true, defaultValue: 'Full payment' },
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
  const columns = [{key:'id',label:'Vehicle',render:r=><div className="vehicle-cell"><span className={`vehicle-tile ${r.tone}`}><Icon name="bus"/></span><div><strong>{r.id}</strong><small>{r.plate}</small></div></div>},{key:'vehicleType',label:'Type',render:r=>dash(r.vehicleType)},{key:'driver',label:'Driver'},{key:'students',label:'Students'},{key:'speed',label:'Current speed',render:r=>r.speed?`${r.speed} km/h`:'—'},statusCell('status'),{key:'compliance',label:'Compliance',render:r=><Pill tone={complianceTone(r.compliance)}>{r.compliance}</Pill>}];
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
    {key:'fee',label:'Fee',render:r=><strong>{formatCurrency(r.fee)}</strong>},
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

function StudentsPage({ students, routes, feeDues, filters, onFiltersChange, onAdd, onEdit, onDelete, onBulkAssign, loading }) {
  const [bulkOpen, setBulkOpen] = useState(false);
  const studentRows = students.map(student => ({ ...student, totalDue: totalDueForStudent(feeDues, student) }));
  const columns = [
    {key:'f',label:'Sr. No.',render:r=><strong>{r.f}</strong>},
    {key:'regNo',label:'Reg. No.'},
    {...personCell('name'), label:'Student name'},
    {key:'class',label:'Class'},
    {key:'kms',label:'Kms',render:r=>dash(r.kms)},
    {key:'tagNo',label:'Tag No.',render:r=><Pill tone="blue">{r.tagNo}</Pill>},
    {key:'route',label:'Route',render:r=>dash(r.route)},
    {key:'monthlyDue',label:'Monthly due',render:r=><strong>{formatCurrency(r.monthlyDue)}</strong>},
    {key:'totalDue',label:'Total due',render:r=><strong>{formatCurrency(r.totalDue)}</strong>},
    {key:'area',label:'Area'},
    {key:'phone',label:'Phone Number'},
    {key:'secondaryPhone',label:'Secondary contact',render:r=>dash(r.secondaryPhone)}
  ];
  const fields = studentFields.map(field => field.name === 'route'
    ? {...field, options: ['Not assigned', ...routes.map(route => route.id)], defaultValue: 'Not assigned'}
    : field
  );
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
  return <DataPage type="Students" data={studentRows} columns={columns} subtitle={`${students.length} students imported from JPIS transport list`} action="Add student" fields={fields} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} onHistory={row => openHistory(row, `${row.name} · Route history`, 'Routes this student has been assigned to over time')} extraActions={[{ label: 'Bulk assign', icon: 'route', onClick: () => setBulkOpen(true) }]} loading={loading} serverFilters filters={filters} onFiltersChange={onFiltersChange} filterFields={[
    {name:'assigned', label:'Route assignment', options:[{value:'assigned',label:'Assigned to route'},{value:'unassigned',label:'No route'}]},
    {name:'routeId', label:'All routes', options:routes.map(route => ({value: route.id, label: route.id}))}
  ]}>{history && <HistoryModal {...history} onClose={closeHistory}/>}{bulkOpen && <BulkAssignModal students={studentRows} routes={routes} onClose={() => setBulkOpen(false)} onSave={onBulkAssign}/>}</DataPage>;
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

const studentIdFromSelection = selection => {
  const match = String(selection || '').match(/#(\d+)$/);
  return match ? Number(match[1]) : null;
};

function PaymentsPage({ payments, students, feeDues, onAdd, onGenerateDues }) {
  const [showReport, setShowReport] = useState(false);
  const dues = monthlyDueRows(feeDues);
  const rows = [...dues, ...payments];
  const settledPayments = settledPaymentRows(payments);
  const totalBilled = feeDues.reduce((sum, due) => sum + Number(due.billed || due.baseAmount || 0), 0);
  const totalPending = dues.reduce((sum, row) => sum + parseAmount(row.amount), 0);
  const totalCollected = feeDues.reduce((sum, due) => sum + Number(due.paidAmount || 0), 0);
  const findStudent = studentId => studentId
    ? students.find(item => Number(item.studentId || item.id) === studentId) || null
    : null;
  const isMonthlyPlan = values => String(values.plan || 'Monthly').toLowerCase() === 'monthly';
  const dueAmountFor = values => {
    if (!isMonthlyPlan(values)) return 0;
    return totalDueForStudent(feeDues, findStudent(studentIdFromSelection(values.student)));
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
    if (!['student', 'paymentType', 'plan'].includes(changedField)) return values;
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
  const columns = [{key:'id',label:'Receipt ID',render:r=><strong>{r.id}</strong>},{key:'student',label:'Student'},{key:'plan',label:'Fee plan'},{key:'amount',label:'Amount',render:r=><strong>{r.amount}</strong>},{key:'date',label:'Payment / due date'},{key:'method',label:'Method'},statusCell('status')];
  return <DataPage type="Payment history" data={rows} columns={columns} subtitle={`${dues.length} monthly route fee dues pending after received payments`} action="Record payment" fields={fields} deriveValues={deriveValues} onAdd={onAdd} createRecord={async values => {
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
    const { paymentType, ...rest } = values;
    return {
      ...rest,
      student: student?.name || values.student,
      studentId,
      dueId: due?.dueId || due?.id || null
    };
  }} secondaryAction={{ label: 'Fee report', icon: 'file', onClick: () => setShowReport(true) }} extraActions={[{ label: 'Generate monthly dues', icon: 'money', onClick: onGenerateDues }]}>{dueSummary}</DataPage>;
}

function DocumentsPage({ docs, onAdd }) {
  const columns = [{key:'owner',label:'Owner',render:r=><div><strong>{r.owner}</strong><small className="block-small">{r.kind}</small></div>},{key:'type',label:'Document type'},{key:'number',label:'Document number'},{key:'expiry',label:'Expiry date'},statusCell('status')];
  return <DataPage type="Document centre" data={docs} columns={columns} subtitle="No document records are stored until a database-backed document endpoint is added." action="Upload document" fields={documentFields} onAdd={onAdd}/>;
}

function TrackingPage({ vehicles }) {
  const [gpsPoints, setGpsPoints] = useState([]);
  const [gpsStatus, setGpsStatus] = useState({ loading: api.hasGpsConfig, error: '', local: !api.hasGpsConfig });
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (!api.hasGpsConfig) {
      setGpsPoints([]);
      setGpsStatus({ loading: false, error: '', local: true });
      return;
    }

    let active = true;
    const loadGps = async () => {
      try {
        const rows = await api.getGpsVehicles();
        if (!active) return;
        setGpsPoints(rows);
        setSelectedId(current => current || rows[0]?.id || '');
        setGpsStatus({ loading: false, error: '', local: false });
      } catch (error) {
        if (!active) return;
        setGpsPoints([]);
        setGpsStatus({ loading: false, error: '', local: true });
      }
    };

    loadGps();
    const timer = window.setInterval(loadGps, 10000);
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
        const matched = vehicles.find(vehicle => vehicle.id === point.vehicleNo || vehicle.plate === point.vehicleNo);
        return {
          ...point,
          driver: matched?.driver || 'Unassigned',
          route: matched?.route || point.alias || '-',
          students: matched?.students || 0,
          tone: point.ignition ? 'green' : 'gray',
          status: point.ignition ? 'On route' : 'Stopped'
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

function NotificationsPage() {
  return <div className="panel placeholder"><span className="stat-icon blue"><Icon name="bell"/></span><h2>Notifications</h2><p>No notification records are stored until a database-backed notification endpoint is added.</p></div>;
}

function SettingsPage(){return <div className="panel placeholder"><span className="stat-icon blue"><Icon name="settings"/></span><h2>Workspace settings</h2><p>School profile, fee plans, routes, user access, and integrations can be configured here.</p><button className="primary-btn">Open configuration</button></div>}

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
      <div className="login-brand"><span className="brand-mark"><Icon name="route" size={24}/></span><div><strong>campus_route</strong><small>Super admin access</small></div></div>
      <h1>Login to admin dashboard</h1>
      <p>Use your super-admin credentials to manage students, vehicles, routes, fees, and transport operations.</p>
      <form onSubmit={submit}>
        <label><span>Email</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="admin@school.com" autoComplete="username" required/></label>
        <label><span>Password</span><input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter password" autoComplete="current-password" required/></label>
        {status.error && <div className="form-error login-error">{status.error}</div>}
        <button className="primary-btn login-submit" disabled={status.loading} type="submit">{status.loading && <span className="spinner"/>}{status.loading ? 'Checking...' : 'Login as super admin'}</button>
      </form>
      {import.meta.env.DEV && <small className="login-hint">Local dev default: admin@campus.local / Admin@12345 (unless overridden by SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD). Never shown in production builds.</small>}
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
      await api.assignStudent({ studentId: created.studentId, routeId: record.route });
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
    } else if (record.route !== row.route) {
      await api.assignStudent({ studentId: updated.studentId, routeId: record.route });
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
  if(active==='Students') content=<StudentsPage students={students} routes={routes} feeDues={feeDues} filters={studentFilters} onFiltersChange={setStudentFilters} onAdd={handleAddStudent} onEdit={handleEditStudent} onDelete={handleDeleteStudent} onBulkAssign={handleBulkAssignStudents} loading={tableLoading.students}/>;
  if(active==='Fees & payments') content=<PaymentsPage payments={payments} students={students} feeDues={feeDues} onGenerateDues={handleGenerateDues} onAdd={async record => { await api.createPayment(record); await refreshCoreData(); }}/>;
  if(active==='Documents') content=<DocumentsPage docs={docs} onAdd={() => { throw new Error('Document storage endpoint is not configured.'); }}/>;
  if(active==='Notifications') content=<NotificationsPage/>;
  if(active==='Settings') content=<SettingsPage/>;
  content = <>{apiStatus.error && <div className="api-banner"><Icon name="alert" size={17}/><span>{apiStatus.error}</span></div>}{apiStatus.loading && <div className="api-banner muted"><span className="spinner"/><span>Connecting to backend...</span></div>}{content}</>;
  return <div className="app-shell"><Sidebar active={active} setActive={setActive} open={menu} setOpen={setMenu} admin={session.admin} onLogout={handleLogout}/>{menu&&<div className="backdrop" onClick={()=>setMenu(false)}/>}<main><Header title={active} setMenu={setMenu} noticeCount="0" setActive={setActive}/><div className="content">{content}</div><footer>campus_route Admin</footer></main></div>;
}
