import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { api } from './api.js';
import { students as initialStudents } from './studentData.js';

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

const initialVehicles = [
  { id: 'BUS-04', plate: 'DL 1PC 4182', driver: 'Ramesh Kumar', route: 'North Loop', speed: 38, status: 'On route', students: 22, tone: 'green', x: 62, y: 35 },
  { id: 'BUS-07', plate: 'DL 1PC 5721', driver: 'Sunil Yadav', route: 'East Park', speed: 24, status: 'On route', students: 18, tone: 'green', x: 30, y: 63 },
  { id: 'VAN-02', plate: 'DL 1VC 9044', driver: 'Amit Singh', route: 'South City', speed: 0, status: 'At school', students: 12, tone: 'blue', x: 50, y: 74 },
  { id: 'BUS-11', plate: 'DL 1PC 6510', driver: 'Deepak Rana', route: 'West End', speed: 0, status: 'Offline', students: 0, tone: 'gray', x: 79, y: 66 }
];

const initialDrivers = [
  { name: 'Ramesh Kumar', phone: '+91 98107 24561', vehicle: 'BUS-04', route: 'North Loop', status: 'On duty', docs: 'Verified', initials: 'RK' },
  { name: 'Sunil Yadav', phone: '+91 99584 10882', vehicle: 'BUS-07', route: 'East Park', status: 'On duty', docs: 'Verified', initials: 'SY' },
  { name: 'Amit Singh', phone: '+91 98713 54119', vehicle: 'VAN-02', route: 'South City', status: 'At school', docs: '1 expiring', initials: 'AS' },
  { name: 'Deepak Rana', phone: '+91 98188 40912', vehicle: 'BUS-11', route: 'West End', status: 'Off duty', docs: 'Verified', initials: 'DR' },
  { name: 'Manoj Verma', phone: '+91 99710 36481', vehicle: 'Unassigned', route: '—', status: 'Available', docs: '2 pending', initials: 'MV' }
];

const initialPayments = [
  { id: 'RF-82410', student: 'Aarav Sharma', plan: 'Quarterly', amount: '₹8,400', date: '22 Jun 2026', method: 'UPI', status: 'Paid' },
  { id: 'RF-82409', student: 'Kabir Khanna', plan: 'Half-yearly', amount: '₹16,200', date: '21 Jun 2026', method: 'Card', status: 'Paid' },
  { id: 'RF-82408', student: 'Anaya Gupta', plan: 'Quarterly', amount: '₹7,800', date: '20 Jun 2026', method: 'Cash', status: 'Collected' },
  { id: 'RF-82407', student: 'Diya Mehta', plan: 'Quarterly', amount: '₹8,400', date: 'Due 28 Jun', method: '—', status: 'Pending' },
  { id: 'RF-82406', student: 'Vivaan Joshi', plan: 'Half-yearly', amount: '₹15,600', date: 'Due 12 Jun', method: '—', status: 'Overdue' }
];

const initialDocs = [
  { owner: 'Ramesh Kumar', type: 'Driving licence', number: 'DL-0420110123456', expiry: '18 Mar 2028', status: 'Verified', kind: 'Driver' },
  { owner: 'Amit Singh', type: 'Police verification', number: 'PV-2023-80941', expiry: '02 Jul 2026', status: 'Expiring', kind: 'Driver' },
  { owner: 'BUS-04 · DL 1PC 4182', type: 'Registration certificate', number: 'RC-DL-904182', expiry: '11 Aug 2029', status: 'Verified', kind: 'Vehicle' },
  { owner: 'BUS-07 · DL 1PC 5721', type: 'Pollution certificate', number: 'PUC-8827310', expiry: '26 Jun 2026', status: 'Expiring', kind: 'Vehicle' },
  { owner: 'Manoj Verma', type: 'Aadhaar card', number: 'XXXX XXXX 3102', expiry: '—', status: 'Pending', kind: 'Driver' }
];

function Sidebar({ active, setActive, open, setOpen }) {
  return <aside className={`sidebar ${open ? 'open' : ''}`}>
    <div className="brand"><span className="brand-mark"><Icon name="route" size={22}/></span><div>campus<span>_route</span><small>School transport</small></div></div>
    <button className="close-menu" onClick={() => setOpen(false)}><Icon name="close"/></button>
    <div className="nav-label">Workspace</div>
    <nav>{nav.map(([label, icon]) => <button key={label} className={active === label ? 'active' : ''} onClick={() => { setActive(label); setOpen(false); }}><Icon name={icon}/><span>{label}</span>{label === 'Documents' && <b>3</b>}</button>)}</nav>
    <div className="sidebar-bottom">
      <button onClick={() => setActive('Settings')}><Icon name="settings"/><span>Settings</span></button>
      <div className="support"><span><Icon name="alert" size={17}/></span><div><strong>Need assistance?</strong><small>Contact support</small></div><Icon name="arrow" size={15}/></div>
      <div className="profile"><div className="avatar dark">AM</div><div><strong>Arjun Malhotra</strong><small>Administrator</small></div><Icon name="down" size={15}/></div>
    </div>
  </aside>;
}

const Pill = ({ children, tone }) => <span className={`pill ${tone || children.toLowerCase().replaceAll(' ', '-')}`}>{children}</span>;
const emptyForm = fields => Object.fromEntries(fields.map(field => [field.name, field.defaultValue || '']));

function RecordModal({ title, fields, values, setValues, onClose, onSubmit, saving = false, error = '' }) {
  const updateField = (field, rawValue) => {
    const value = field.digitsOnly ? rawValue.replace(/\D/g, '') : rawValue;
    setValues({...values, [field.name]: value});
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
          <span>{field.label}</span>
          {field.type === 'select'
            ? <select value={values[field.name] || ''} onChange={event => updateField(field, event.target.value)} required={field.required}>
                <option value="">Select</option>
                {field.options.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            : field.type === 'textarea'
              ? <textarea value={values[field.name] || ''} onChange={event => updateField(field, event.target.value)} required={field.required}/>
              : <input type={field.type || 'text'} value={values[field.name] || ''} onChange={event => updateField(field, event.target.value)} placeholder={field.placeholder || ''} required={field.required} min={field.min} max={field.max} pattern={field.pattern} maxLength={field.maxLength} inputMode={field.inputMode}/>}
        </label>)}
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions">
        <button type="button" className="filter-btn" onClick={onClose} disabled={saving}>Cancel</button>
        <button type="submit" className="primary-btn" disabled={saving}><Icon name="check" size={16}/>{saving ? 'Saving...' : 'Save record'}</button>
      </div>
    </form>
  </div>;
}

function Header({ title, setMenu, noticeCount, setActive }) {
  return <header><div className="header-title"><button className="menu-btn" onClick={() => setMenu(true)}><Icon name="menu"/></button><div><h1>{title}</h1><p>{title === 'Overview' ? 'Here’s what’s happening with your fleet today.' : `Manage and review ${title.toLowerCase()}.`}</p></div></div><div className="header-actions"><label className="global-search"><Icon name="search" size={17}/><input placeholder="Search anything..."/><kbd>⌘ K</kbd></label><button className="icon-btn"><Icon name="bell"/><i>{noticeCount}</i></button><button className="primary-btn" onClick={() => setActive('Students')}><Icon name="plus" size={17}/> Quick add</button></div></header>;
}

function StatCard({ label, value, change, icon, tone, detail }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon name={icon}/></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small className={change?.startsWith('+') ? 'up' : ''}>{change} <em>{detail}</em></small></div></div>;
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

function VehicleLeafletMap({ points, fallbackVehicles }) {
  if (!points.length) {
    return <div className="google-map-fallback"><MiniMap vehicles={fallbackVehicles} expanded/><div className="map-warning"><Icon name="clock" size={17}/><span>Waiting for GPS vehicle data...</span></div></div>;
  }

  const center = [points[0].latitude, points[0].longitude];

  return <div className="google-map-shell">
    <MapContainer center={center} zoom={13} className="google-map-canvas" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <VehicleMapBounds points={points}/>
      {points.map(point => <Marker key={point.id} position={[point.latitude, point.longitude]} icon={busMarkerIcon}>
        <Popup>
          <div className="map-popup">
            <strong>{point.vehicleNo}</strong>
            {point.alias && <span>{point.alias}</span>}
            <span>Speed: {point.speed} km/h</span>
            <span>Ignition: {point.ignition ? 'On' : 'Off'}</span>
            <span>Updated: {point.timestamp ? point.timestamp.toLocaleString() : '-'}</span>
          </div>
        </Popup>
      </Marker>)}
    </MapContainer>
  </div>;
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

function Overview({ setActive, vehicles }) {
  return <>
    <section className="stats-grid">
      <StatCard label="Active vehicles" value="3 / 4" change="+1" detail="from yesterday" icon="bus" tone="amber"/>
      <StatCard label="Students onboard" value="52" change="+8" detail="this morning" icon="student" tone="blue"/>
      <StatCard label="Fees collected" value="₹4.82L" change="+12.4%" detail="this month" icon="money" tone="green"/>
      <StatCard label="Pending documents" value="3" change="Action" detail="required" icon="file" tone="red"/>
    </section>
    <section className="dashboard-grid">
      <div className="panel live-panel"><div className="panel-head"><div><h2>Live fleet tracking</h2><p>Real-time location of all assigned vehicles</p></div><button className="text-btn" onClick={() => setActive('Live tracking')}>View full map <Icon name="arrow" size={15}/></button></div><MiniMap vehicles={vehicles}/></div>
      <div className="panel fleet-panel"><div className="panel-head"><div><h2>Fleet status</h2><p>Updated just now</p></div><button className="more">•••</button></div><div className="fleet-list">{vehicles.map(v => <div className="fleet-row" key={v.id}><span className={`vehicle-tile ${v.tone}`}><Icon name="bus"/></span><div><strong>{v.id}</strong><small>{v.driver}</small></div><div className="fleet-route"><span>{v.route}</span><small>{v.students} students</small></div><Pill tone={v.tone}>{v.status}</Pill><b>{v.speed ? `${v.speed} km/h` : '—'}</b></div>)}</div><button className="panel-footer" onClick={() => setActive('Vehicles')}>View all vehicles <Icon name="arrow" size={15}/></button></div>
      <div className="panel activity-panel"><div className="panel-head"><div><h2>Today’s pickup activity</h2><p>Live student check-in updates</p></div><button className="filter-btn">All routes <Icon name="down" size={14}/></button></div><div className="activity-list"><ActivityRow initials="AS" name="Aarav Sharma" action="Bus 04 · North Loop" state="Picked up" time="7:42 AM"/><ActivityRow initials="DM" name="Diya Mehta" action="Bus 04 · North Loop" state="Picked up" time="7:48 AM"/><ActivityRow initials="KK" name="Kabir Khanna" action="Bus 07 · East Park" state="Dropped" time="8:09 AM"/><ActivityRow initials="AG" name="Anaya Gupta" action="Van 02 · South City" state="Dropped" time="8:16 AM"/></div></div>
      <div className="panel revenue-panel"><div className="panel-head"><div><h2>Fee collection</h2><p>June 2026</p></div><button className="more">•••</button></div><div className="revenue-summary"><div><strong>₹4,82,400</strong><span><b>68%</b> of ₹7,10,000 target</span></div><div className="donut"><span>68<small>%</small></span></div></div><div className="progress"><i style={{width:'68%'}}></i></div><div className="revenue-legend"><span><i className="paid-dot"></i><b>₹4.82L</b><small>Collected</small></span><span><i className="pending-dot"></i><b>₹1.46L</b><small>Pending</small></span><span><i className="overdue-dot"></i><b>₹0.82L</b><small>Overdue</small></span></div><button className="panel-footer" onClick={() => setActive('Fees & payments')}>View payment history <Icon name="arrow" size={15}/></button></div>
    </section>
  </>;
}

function BaseDataPage({ type, data, columns, subtitle, action, children }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => data.filter(row => Object.values(row).join(' ').toLowerCase().includes(query.toLowerCase())), [data, query]);
  return <section className="data-page">
    {children}
    <div className="panel table-panel"><div className="table-toolbar"><div><h2>{type}</h2><p>{subtitle}</p></div><div className="toolbar-actions"><label className="table-search"><Icon name="search" size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${type.toLowerCase()}...`}/></label><button className="filter-btn">All statuses <Icon name="down" size={13}/></button><button className="primary-btn"><Icon name="plus" size={16}/>{action}</button></div></div><div className="table-wrap"><table><thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}<th></th></tr></thead><tbody>{filtered.map((row, index) => <tr key={row.id || row.name || row.owner}><>{columns.map(c => <td key={c.key}>{c.render ? c.render(row, index) : row[c.key]}</td>)}</><td><button className="more">•••</button></td></tr>)}</tbody></table>{!filtered.length && <div className="empty">No matching records found.</div>}</div><div className="table-footer"><span>Showing {filtered.length} of {data.length} records</span><div><button disabled>‹</button><button className="current">1</button><button>2</button><button>›</button></div></div></div>
  </section>;
}

function DataPage({ type, data, columns, subtitle, action, children, fields = [], onAdd, onEdit, onDelete, createRecord, serverFilters = false, filters = {}, filterFields = [], onFiltersChange }) {
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formValues, setFormValues] = useState(() => emptyForm(fields));
  const [editingRow, setEditingRow] = useState(null);
  const [rowActionError, setRowActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const filtered = useMemo(
    () => serverFilters ? data : data.filter(row => Object.values(row).join(' ').toLowerCase().includes(query.toLowerCase())),
    [data, query, serverFilters]
  );
  useEffect(() => {
    if (!serverFilters || !onFiltersChange) return;
    const timer = window.setTimeout(() => {
      onFiltersChange({ ...filters, q: query });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);
  const setFilter = (name, value) => {
    onFiltersChange?.({ ...filters, [name]: value });
  };
  const openModal = () => {
    setFormValues(emptyForm(fields));
    setEditingRow(null);
    setFormError('');
    setModalOpen(true);
  };
  const openEditModal = row => {
    setEditingRow(row);
    setFormValues(Object.fromEntries(fields.map(field => {
      const value = row[field.name] ?? field.defaultValue ?? '';
      return [field.name, field.name === 'vehicle' && value === 'Unassigned' ? 'Not assigned' : value];
    })));
    setFormError('');
    setModalOpen(true);
  };
  const submitForm = async event => {
    event.preventDefault();
    const record = createRecord ? createRecord(formValues, data) : formValues;
    setSaving(true);
    setFormError('');
    try {
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
    setRowActionError('');
    try {
      await onDelete(row);
    } catch (error) {
      setRowActionError(error.message || 'Unable to delete record.');
    }
  };

  return <section className="data-page">
    {children}
    {rowActionError && <div className="form-error table-error">{rowActionError}</div>}
    <div className="panel table-panel">
      <div className="table-toolbar">
        <div><h2>{type}</h2><p>{subtitle}</p></div>
        <div className="toolbar-actions">
          <label className="table-search"><Icon name="search" size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${type.toLowerCase()}...`}/></label>
          {filterFields.map(field => <select key={field.name} className="filter-select" value={filters[field.name] || 'all'} onChange={event => setFilter(field.name, event.target.value)}>
            <option value="all">{field.label}</option>
            {field.options.map(option => <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? option}</option>)}
          </select>)}
          <button className="primary-btn" onClick={openModal}><Icon name="plus" size={16}/>{action}</button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}<th></th></tr></thead>
          <tbody>{filtered.map((row, index) => <tr key={row.id || row.regNo || row.name || row.owner}>
            {columns.map(column => <td key={column.key}>{column.render ? column.render(row, index) : row[column.key]}</td>)}
            <td>{onEdit || onDelete ? <div className="row-actions">{onEdit && <button type="button" className="text-action" onClick={() => openEditModal(row)}>Edit</button>}{onDelete && <button type="button" className="text-action danger" onClick={() => deleteRow(row)}>Delete</button>}</div> : <button className="more">...</button>}</td>
          </tr>)}</tbody>
        </table>
        {!filtered.length && <div className="empty">No matching records found.</div>}
      </div>
      <div className="table-footer"><span>Showing {filtered.length} of {data.length} records</span><div><button disabled>‹</button><button className="current">1</button><button>2</button><button>›</button></div></div>
    </div>
    {modalOpen && <RecordModal title={editingRow ? `Edit ${type}` : action} fields={fields} values={formValues} setValues={setFormValues} onClose={() => !saving && setModalOpen(false)} onSubmit={submitForm} saving={saving} error={formError}/>}
  </section>;
}

const personCell = key => ({ key, label: key === 'student' ? 'Student' : 'Name', render: r => <div className="person-cell"><div className="avatar">{r.initials || r[key].split(' ').map(x => x[0]).join('').slice(0,2)}</div><div><strong>{r[key]}</strong><small>{r.phone || r.parent || r.regNo}</small></div></div> });
const statusCell = key => ({ key, label: key[0].toUpperCase()+key.slice(1), render: r => <Pill>{r[key]}</Pill> });
const dash = value => value || '-';
const initialsFor = name => name.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();
const nextReceiptId = rows => `RF-${String(82411 + rows.length).padStart(5, '0')}`;

const vehicleFields = [
  { name: 'id', label: 'Vehicle ID', required: true, placeholder: 'BUS-12', pattern: '[A-Za-z0-9][A-Za-z0-9-]*', maxLength: 32 },
  { name: 'plate', label: 'Registration number', required: true, maxLength: 64 },
  { name: 'driver', label: 'Existing driver name', defaultValue: 'Unassigned' }
];
const routeFields = [
  { name: 'id', label: 'Route code', required: true, placeholder: 'RT-01', pattern: '[A-Za-z0-9][A-Za-z0-9-]*', maxLength: 32 },
  { name: 'name', label: 'Route name', required: true, maxLength: 120 },
  { name: 'vehicle', label: 'Assigned bus', type: 'select', options: ['Not assigned'], defaultValue: 'Not assigned' },
  { name: 'description', label: 'Description', type: 'textarea', full: true, maxLength: 255 }
];
const driverFields = [
  { name: 'name', label: 'Driver name', required: true, maxLength: 160 },
  { name: 'phone', label: 'Phone number', required: true, pattern: '[0-9+() -]{10,20}' },
  { name: 'licenseNumber', label: 'License number', maxLength: 80 },
  { name: 'vehicle', label: 'Vehicle', type: 'select', options: ['Not assigned'], defaultValue: 'Not assigned' },
  { name: 'route', label: 'Assigned route', required: true, maxLength: 120 }
];
const studentFields = [
  { name: 'f', label: 'Sr. No.', required: true, maxLength: 32 },
  { name: 'regNo', label: 'Reg. No.', required: true, maxLength: 64 },
  { name: 'name', label: 'Student name', required: true, maxLength: 160 },
  { name: 'class', label: 'Class', required: true, maxLength: 80 },
  { name: 'kms', label: 'Kms', type: 'number', min: '0', max: '500', inputMode: 'numeric' },
  { name: 'tagNo', label: 'Tag No.', required: true, placeholder: 'T-A', maxLength: 32 },
  { name: 'area', label: 'Area', required: true, maxLength: 180 },
  { name: 'phone', label: 'Phone number', required: true, pattern: '[0-9]{10}', maxLength: 10, inputMode: 'numeric', digitsOnly: true },
  { name: 'secondaryPhone', label: 'Secondary contact number', pattern: '[0-9]{10}', maxLength: 10, inputMode: 'numeric', digitsOnly: true },
  { name: 'route', label: 'Route', type: 'select', options: [] }
];
const paymentFields = [
  { name: 'student', label: 'Student', required: true },
  { name: 'plan', label: 'Fee plan', type: 'select', options: ['Monthly', 'Quarterly', 'Half-yearly', 'Annual'], required: true },
  { name: 'amount', label: 'Amount', required: true, placeholder: 'Rs. 8,400' },
  { name: 'date', label: 'Payment / due date', required: true },
  { name: 'method', label: 'Method', type: 'select', options: ['UPI', 'Card', 'Cash', 'Bank transfer', '-'], required: true },
  { name: 'status', label: 'Status', type: 'select', options: ['Paid', 'Collected', 'Pending', 'Overdue'], required: true }
];
const documentFields = [
  { name: 'owner', label: 'Owner', required: true },
  { name: 'kind', label: 'Owner type', type: 'select', options: ['Driver', 'Vehicle', 'Student'], required: true },
  { name: 'type', label: 'Document type', required: true },
  { name: 'number', label: 'Document number', required: true },
  { name: 'expiry', label: 'Expiry date', required: true },
  { name: 'status', label: 'Status', type: 'select', options: ['Verified', 'Expiring', 'Pending'], required: true }
];

function VehiclesPage({ vehicles, routes, filters, onFiltersChange, onAdd, onEdit }) {
  const columns = [{key:'id',label:'Vehicle',render:r=><div className="vehicle-cell"><span className={`vehicle-tile ${r.tone}`}><Icon name="bus"/></span><div><strong>{r.id}</strong><small>{r.plate}</small></div></div>},{key:'driver',label:'Driver'},{key:'students',label:'Students'},{key:'speed',label:'Current speed',render:r=>r.speed?`${r.speed} km/h`:'—'},statusCell('status')];
  return <DataPage type="Vehicles" data={vehicles} columns={columns} subtitle={`${vehicles.length} vehicles registered`} action="Add vehicle" fields={vehicleFields} onAdd={onAdd} onEdit={onEdit} serverFilters filters={filters} onFiltersChange={onFiltersChange} filterFields={[
    {name:'status', label:'All statuses', options:['On route','At school','Offline']},
    {name:'assigned', label:'Route assignment', options:[{value:'assigned',label:'Assigned to route'},{value:'unassigned',label:'No route'}]},
    {name:'routeId', label:'All routes', options:routes.map(route => ({value: route.id, label: route.id}))}
  ]}/>;
}

function RoutesPage({ routes, vehicles, filters, onFiltersChange, onAdd, onEdit, onDelete }) {
  const columns = [
    {key:'id',label:'Route',render:r=><strong>{r.id}</strong>},
    {key:'name',label:'Route name'},
    {key:'vehicle',label:'Assigned bus',render:r=><Pill tone={r.vehicle === 'Not assigned' ? 'gray' : 'blue'}>{r.vehicle}</Pill>},
    {key:'students',label:'Students'},
    {key:'description',label:'Description',render:r=>dash(r.description)}
  ];
  const fields = routeFields.map(field => field.name === 'vehicle'
    ? {...field, options: ['Not assigned', ...vehicles.map(vehicle => vehicle.id)]}
    : field
  );
  return <DataPage type="Routes" data={routes} columns={columns} subtitle={`${routes.length} routes configured`} action="Add route" fields={fields} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} createRecord={values => ({...values, vehicle: values.vehicle === 'Not assigned' ? '' : values.vehicle})} serverFilters filters={filters} onFiltersChange={onFiltersChange} filterFields={[
    {name:'assigned', label:'Bus assignment', options:[{value:'assigned',label:'Assigned to bus'},{value:'unassigned',label:'No bus'}]},
    {name:'vehicleId', label:'All buses', options:vehicles.map(vehicle => ({value: vehicle.id, label: vehicle.id}))}
  ]}/>;
}

function DriversPage({ drivers, vehicles, filters, onFiltersChange, onAdd, onEdit }) {
  const columns = [personCell('name'),{key:'vehicle',label:'Vehicle'},{key:'route',label:'Assigned route'},statusCell('status'),{key:'licenseNumber',label:'License',render:r=>dash(r.licenseNumber)}];
  const fields = driverFields.map(field => field.name === 'vehicle'
    ? {...field, options: ['Not assigned', ...vehicles.map(vehicle => vehicle.id)]}
    : field
  );
  return <DataPage type="Drivers" data={drivers} columns={columns} subtitle={`${drivers.length} drivers registered`} action="Add driver" fields={fields} onAdd={onAdd} onEdit={onEdit} createRecord={values => ({...values, vehicle: values.vehicle === 'Not assigned' ? 'Unassigned' : values.vehicle, initials: initialsFor(values.name)})} serverFilters filters={filters} onFiltersChange={onFiltersChange} filterFields={[
    {name:'status', label:'All statuses', options:['On duty','Available','Off duty','At school']},
    {name:'docs', label:'All docs', options:['Verified','1 expiring','2 pending','Pending','Expired']},
    {name:'vehicleId', label:'All buses', options:vehicles.map(vehicle => ({value: vehicle.id, label: vehicle.id}))}
  ]}/>;
}

function StudentsPage({ students, routes, filters, onFiltersChange, onAdd, onEdit, onDelete }) {
  const columns = [
    {key:'f',label:'Sr. No.',render:r=><strong>{r.f}</strong>},
    {key:'regNo',label:'Reg. No.'},
    {...personCell('name'), label:'Student name'},
    {key:'class',label:'Class'},
    {key:'kms',label:'Kms',render:r=>dash(r.kms)},
    {key:'tagNo',label:'Tag No.',render:r=><Pill tone="blue">{r.tagNo}</Pill>},
    {key:'route',label:'Route',render:r=>dash(r.route)},
    {key:'area',label:'Area'},
    {key:'phone',label:'Phone Number'},
    {key:'secondaryPhone',label:'Secondary contact',render:r=>dash(r.secondaryPhone)}
  ];
  const fields = studentFields.map(field => field.name === 'route'
    ? {...field, options: routes.map(route => route.id)}
    : field
  );
  return <DataPage type="Students" data={students} columns={columns} subtitle={`${students.length} students imported from JPIS transport list`} action="Add student" fields={fields} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} serverFilters filters={filters} onFiltersChange={onFiltersChange} filterFields={[
    {name:'assigned', label:'Route assignment', options:[{value:'assigned',label:'Assigned to route'},{value:'unassigned',label:'No route'}]},
    {name:'routeId', label:'All routes', options:routes.map(route => ({value: route.id, label: route.id}))}
  ]}/>;
}

function PaymentsPage({ payments, onAdd }) {
  const columns = [{key:'id',label:'Receipt ID',render:r=><strong>{r.id}</strong>},{key:'student',label:'Student'},{key:'plan',label:'Fee plan'},{key:'amount',label:'Amount',render:r=><strong>{r.amount}</strong>},{key:'date',label:'Payment / due date'},{key:'method',label:'Method'},statusCell('status')];
  return <DataPage type="Payment history" data={payments} columns={columns} subtitle="Track online and cash fee collections" action="Record payment" fields={paymentFields} onAdd={onAdd} createRecord={(values, rows) => ({id: nextReceiptId(rows), ...values})}><section className="stats-grid compact"><StatCard label="Total billed" value="₹7.10L" change="June" detail="2026" icon="money" tone="blue"/><StatCard label="Collected" value="₹4.82L" change="+12.4%" detail="this month" icon="check" tone="green"/><StatCard label="Pending" value="₹1.46L" change="21" detail="students" icon="clock" tone="amber"/><StatCard label="Overdue" value="₹82K" change="8" detail="students" icon="alert" tone="red"/></section></DataPage>;
}

function DocumentsPage({ docs, onAdd }) {
  const columns = [{key:'owner',label:'Owner',render:r=><div><strong>{r.owner}</strong><small className="block-small">{r.kind}</small></div>},{key:'type',label:'Document type'},{key:'number',label:'Document number'},{key:'expiry',label:'Expiry date'},statusCell('status')];
  return <DataPage type="Document centre" data={docs} columns={columns} subtitle="Driver and vehicle compliance documents" action="Upload document" fields={documentFields} onAdd={onAdd}><div className="alert-banner"><span><Icon name="alert"/></span><div><strong>3 documents need your attention</strong><p>Two documents expire within 14 days and one is awaiting verification.</p></div><button>Review now</button></div></DataPage>;
}

function TrackingPage({ vehicles }) {
  const [gpsPoints, setGpsPoints] = useState([]);
  const [gpsStatus, setGpsStatus] = useState({ loading: true, error: '' });
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    let active = true;
    const loadGps = async () => {
      try {
        const rows = await api.getGpsVehicles();
        if (!active) return;
        setGpsPoints(rows);
        setSelectedId(current => current || rows[0]?.id || '');
        setGpsStatus({ loading: false, error: '' });
      } catch (error) {
        if (!active) return;
        setGpsStatus({ loading: false, error: error.message || 'GPS API is not reachable.' });
      }
    };

    loadGps();
    const timer = window.setInterval(loadGps, 10000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

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
    : vehicles.map(vehicle => ({
        id: vehicle.id,
        vehicleNo: vehicle.id,
        alias: vehicle.route,
        latitude: null,
        longitude: null,
        speed: vehicle.speed || 0,
        ignition: vehicle.status === 'On route',
        timestamp: null,
        driver: vehicle.driver,
        route: vehicle.route,
        students: vehicle.students,
        tone: vehicle.tone,
        status: vehicle.status
      }));

  const selected = liveVehicles.find(vehicle => vehicle.id === selectedId) || liveVehicles[0];

  return <section className="tracking-page">
    <div className="panel tracking-map">
      <div className="panel-head">
        <div>
          <h2>Live fleet map</h2>
          <p><span className="live-dot"></span>{gpsStatus.loading ? 'Connecting to GPS API...' : 'Updating every 10 seconds'}</p>
        </div>
        <div className="tracking-meta"><span>{gpsPoints.length ? `${gpsPoints.length} live vehicles` : 'Demo fallback'}</span></div>
      </div>
      {gpsStatus.error && <div className="gps-error"><Icon name="alert" size={17}/><span>{gpsStatus.error}</span></div>}
      <VehicleLeafletMap points={gpsPoints} fallbackVehicles={vehicles}/>
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
  const [sent, setSent] = useState(false);
  return <section className="notification-layout"><div className="panel composer"><div className="panel-head"><div><h2>Send notification</h2><p>Notify parents or drivers instantly</p></div></div><label><span>Recipients</span><select><option>All parents</option><option>All drivers</option><option>North Loop parents</option><option>Students with pending fees</option></select></label><label><span>Notification type</span><div className="choice-row"><button className="active"><Icon name="bell"/>General</button><button><Icon name="money"/>Fee reminder</button><button><Icon name="bus"/>Route update</button></div></label><label><span>Message</span><textarea defaultValue="Bus routes will operate on their regular schedule tomorrow. Please ensure students are ready 5 minutes before pickup."/><small>117 / 160 characters</small></label><div className="composer-actions"><button className="filter-btn">Save draft</button><button className="primary-btn" onClick={()=>setSent(true)}><Icon name="bell" size={16}/>{sent?'Notification sent':'Send notification'}</button></div></div><div className="panel recent-notices"><div className="panel-head"><div><h2>Recent notifications</h2><p>Last 30 days</p></div></div>{[['Fee reminder','Sent to 21 parents','Today, 10:30 AM','money'],['BUS-07 delayed by 10 minutes','Sent to 18 parents','Yesterday, 7:26 AM','bus'],['Document expiry reminder','Sent to Amit Singh','20 Jun, 4:15 PM','file'],['Summer route timings updated','Sent to all parents','18 Jun, 6:00 PM','route']].map(n=><div className="notice-row" key={n[0]}><span><Icon name={n[3]}/></span><div><strong>{n[0]}</strong><small>{n[1]}</small></div><time>{n[2]}</time></div>)}</div></section>;
}

function SettingsPage(){return <div className="panel placeholder"><span className="stat-icon blue"><Icon name="settings"/></span><h2>Workspace settings</h2><p>School profile, fee plans, routes, user access, and integrations can be configured here.</p><button className="primary-btn">Open configuration</button></div>}

function App() {
  const [active, setActive] = useState('Overview');
  const [menu, setMenu] = useState(false);
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState(initialDrivers);
  const [students, setStudents] = useState(initialStudents);
  const [vehicleFilters, setVehicleFilters] = useState({});
  const [routeFilters, setRouteFilters] = useState({});
  const [driverFilters, setDriverFilters] = useState({});
  const [studentFilters, setStudentFilters] = useState({});
  const [payments, setPayments] = useState(initialPayments);
  const [docs, setDocs] = useState(initialDocs);
  const [apiStatus, setApiStatus] = useState({ loading: true, error: '' });
  const refreshCoreData = async () => {
    const [vehiclesData, routesData, driversData, studentsData] = await Promise.all([
      api.getVehicles(),
      api.getRoutes(),
      api.getDrivers(),
      api.getStudents()
    ]);
    setVehicles(vehiclesData);
    setRoutes(routesData);
    setDrivers(driversData);
    setStudents(studentsData);
    setApiStatus({ loading: false, error: '' });
  };

  useEffect(() => {
    let activeRequest = true;
    Promise.all([api.getVehicles(), api.getRoutes(), api.getDrivers(), api.getStudents()])
      .then(([vehiclesData, routesData, driversData, studentsData]) => {
        if (!activeRequest) return;
        setVehicles(vehiclesData);
        setRoutes(routesData);
        setDrivers(driversData);
        setStudents(studentsData);
        setApiStatus({ loading: false, error: '' });
      })
      .catch(error => {
        if (!activeRequest) return;
        setApiStatus({ loading: false, error: error.message || 'Backend is not reachable.' });
      });
    return () => {
      activeRequest = false;
    };
  }, []);

  useEffect(() => {
    let activeRequest = true;
    api.getVehicles(vehicleFilters)
      .then(rows => activeRequest && setVehicles(rows))
      .catch(error => activeRequest && setApiStatus({ loading: false, error: error.message || 'Unable to filter vehicles.' }));
    return () => { activeRequest = false; };
  }, [vehicleFilters]);

  useEffect(() => {
    let activeRequest = true;
    api.getRoutes(routeFilters)
      .then(rows => activeRequest && setRoutes(rows))
      .catch(error => activeRequest && setApiStatus({ loading: false, error: error.message || 'Unable to filter routes.' }));
    return () => { activeRequest = false; };
  }, [routeFilters]);

  useEffect(() => {
    let activeRequest = true;
    api.getDrivers(driverFilters)
      .then(rows => activeRequest && setDrivers(rows))
      .catch(error => activeRequest && setApiStatus({ loading: false, error: error.message || 'Unable to filter drivers.' }));
    return () => { activeRequest = false; };
  }, [driverFilters]);

  useEffect(() => {
    let activeRequest = true;
    api.getStudents(studentFilters)
      .then(rows => activeRequest && setStudents(rows))
      .catch(error => activeRequest && setApiStatus({ loading: false, error: error.message || 'Unable to filter students.' }));
    return () => { activeRequest = false; };
  }, [studentFilters]);

  const handleAddVehicle = async record => {
    const created = await api.createVehicle(record);
    const driverName = record.driver?.trim();
    if (driverName && driverName !== 'Unassigned') {
      const driver = drivers.find(item => item.name.toLowerCase() === driverName.toLowerCase());
      if (!driver?.driverId) {
        throw new Error('Vehicle saved, but the driver name was not found for assignment.');
      }
      await api.assignDriver({ driverId: driver.driverId, vehicleId: created.id, route: created.route });
    }
    await refreshCoreData();
  };
  const handleEditVehicle = async (row, record) => {
    const updated = await api.updateVehicle(row.vehicleId || row.id, record);
    const driverName = record.driver?.trim();
    if (driverName && driverName !== 'Unassigned' && driverName !== row.driver) {
      const driver = drivers.find(item => item.name.toLowerCase() === driverName.toLowerCase());
      if (!driver?.driverId) {
        throw new Error('Vehicle saved, but the driver name was not found for assignment.');
      }
      await api.assignDriver({ driverId: driver.driverId, vehicleId: updated.id, route: updated.route });
    }
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
    if (record.vehicle && record.vehicle !== 'Unassigned') {
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
    if (record.route) {
      await api.assignStudent({ studentId: created.studentId, routeId: record.route });
    }
    await refreshCoreData();
  };
  const handleEditStudent = async (row, record) => {
    const studentId = row.studentId || row.id;
    const updated = await api.updateStudent(studentId, record);
    if (record.route && record.route !== row.route) {
      await api.assignStudent({ studentId: updated.studentId, routeId: record.route });
    }
    await refreshCoreData();
  };
  const handleDeleteStudent = async row => {
    await api.deleteStudent(row.studentId || row.id);
    await refreshCoreData();
  };

  let content = <Overview setActive={setActive} vehicles={vehicles}/>;
  if(active==='Live tracking') content=<TrackingPage vehicles={vehicles}/>;
  if(active==='Routes') content=<RoutesPage routes={routes} vehicles={vehicles} filters={routeFilters} onFiltersChange={setRouteFilters} onAdd={handleAddRoute} onEdit={handleEditRoute} onDelete={handleDeleteRoute}/>;
  if(active==='Vehicles') content=<VehiclesPage vehicles={vehicles} routes={routes} filters={vehicleFilters} onFiltersChange={setVehicleFilters} onAdd={handleAddVehicle} onEdit={handleEditVehicle}/>;
  if(active==='Drivers') content=<DriversPage drivers={drivers} vehicles={vehicles} filters={driverFilters} onFiltersChange={setDriverFilters} onAdd={handleAddDriver} onEdit={handleEditDriver}/>;
  if(active==='Students') content=<StudentsPage students={students} routes={routes} filters={studentFilters} onFiltersChange={setStudentFilters} onAdd={handleAddStudent} onEdit={handleEditStudent} onDelete={handleDeleteStudent}/>;
  if(active==='Fees & payments') content=<PaymentsPage payments={payments} onAdd={record => setPayments([...payments, record])}/>;
  if(active==='Documents') content=<DocumentsPage docs={docs} onAdd={record => setDocs([...docs, record])}/>;
  if(active==='Notifications') content=<NotificationsPage/>;
  if(active==='Settings') content=<SettingsPage/>;
  content = <>{apiStatus.error && <div className="api-banner"><Icon name="alert" size={17}/><span>{apiStatus.error} Showing local demo data until the backend is available.</span></div>}{apiStatus.loading && <div className="api-banner muted"><Icon name="clock" size={17}/><span>Connecting to backend...</span></div>}{content}</>;
  return <div className="app-shell"><Sidebar active={active} setActive={setActive} open={menu} setOpen={setMenu}/>{menu&&<div className="backdrop" onClick={()=>setMenu(false)}/>}<main><Header title={active} setMenu={setMenu} noticeCount="3" setActive={setActive}/><div className="content">{content}</div><footer>campus_route Admin · Demo workspace with sample data</footer></main></div>;
}

createRoot(document.getElementById('root')).render(<App />);
