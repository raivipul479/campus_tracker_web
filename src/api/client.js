const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://campus-tracker-backend.onrender.com/api';
const AUTH_TOKEN_KEY = 'campus_route_super_admin_token';
const AUTH_ADMIN_KEY = 'campus_route_super_admin';

export function getStoredSession() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const adminText = localStorage.getItem(AUTH_ADMIN_KEY);
  if (!token) return null;
  try {
    return { token, admin: adminText ? JSON.parse(adminText) : null };
  } catch {
    return { token, admin: null };
  }
}

export function setStoredSession(session) {
  localStorage.setItem(AUTH_TOKEN_KEY, session.token);
  localStorage.setItem(AUTH_ADMIN_KEY, JSON.stringify(session.admin));
}

export function clearStoredSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_ADMIN_KEY);
}

export const SESSION_EXPIRED_EVENT = 'campus-route:session-expired';

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') {
      search.set(key, value);
    }
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

async function request(path, options = {}) {
  const session = getStoredSession();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = await response.json();
      message = payload?.error?.message || message;
    } catch {
      // Keep the generic HTTP error when the response body is not JSON.
    }
    if (response.status === 401 && session?.token) {
      clearStoredSession();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  health: () => request('/health'),
  loginSuperAdmin: credentials => request('/auth/super-admin/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),
  getCurrentSuperAdmin: () => request('/auth/super-admin/me'),
  getStudents: filters => request(`/students${queryString(filters)}`),
  createStudent: student => request('/students', {
    method: 'POST',
    body: JSON.stringify(student)
  }),
  updateStudent: (studentId, student) => request(`/students/${studentId}`, {
    method: 'PATCH',
    body: JSON.stringify(student)
  }),
  deleteStudent: studentId => request(`/students/${studentId}`, {
    method: 'DELETE'
  }),
  getPayments: filters => request(`/payments${queryString(filters)}`),
  createPayment: payment => request('/payments', {
    method: 'POST',
    body: JSON.stringify(payment)
  }),
  // Correcting a wrongly entered receipt. Both recompute the linked fee due
  // server-side, so a deleted payment reopens its due.
  updatePayment: (receiptId, changes) => request(`/payments/${encodeURIComponent(receiptId)}`, {
    method: 'PATCH',
    body: JSON.stringify(changes)
  }),
  deletePayment: receiptId => request(`/payments/${encodeURIComponent(receiptId)}`, {
    method: 'DELETE'
  }),
  getFeeDues: filters => request(`/fee-dues${queryString(filters)}`),
  generateFeeDues: payload => request('/fee-dues/generate', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  // Sets discount / fine on a due. The server recomputes balance and status,
  // so the amount owed reflects them immediately.
  adjustFeeDue: (dueId, { discount, fine }) => request(`/fee-dues/${dueId}`, {
    method: 'PATCH',
    body: JSON.stringify({ discount, fine })
  }),
  // The office's own fee summary sheet, read and written verbatim.
  getFeeSheet: filters => request(`/fee-dues/sheet/export${queryString(filters)}`),
  importFeeSheet: (rows, { dryRun = false } = {}) => request('/fee-dues/sheet/import', {
    method: 'POST',
    body: JSON.stringify({ rows, dryRun })
  }),
  getFeeSummary: filters => request(`/fee-dues/summary${queryString(filters)}`),
  getFeeReport: filters => request(`/fee-dues/report${queryString(filters)}`),
  getStudentAttendance: filters => request(`/attendance/students${queryString(filters)}`),
  getDriverAttendance: filters => request(`/attendance/drivers${queryString(filters)}`),
  // Raw pickup/drop logs. The attendance drill-down uses these to put times
  // against each day, since the monthly report only carries the dates.
  getTransportLogs: filters => request(`/transport-logs${queryString(filters)}`),
  sendFeeReminder: payload => request('/notifications/fee-reminder', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getNotifications: filters => request(`/notifications${queryString(filters)}`),
  getDrivers: filters => request(`/drivers${queryString(filters)}`),
  createDriver: driver => request('/drivers', {
    method: 'POST',
    body: JSON.stringify(driver)
  }),
  updateDriver: (driverId, driver) => request(`/drivers/${driverId}`, {
    method: 'PATCH',
    body: JSON.stringify(driver)
  }),
  getVehicles: filters => request(`/vehicles${queryString(filters)}`),
  createVehicle: vehicle => request('/vehicles', {
    method: 'POST',
    body: JSON.stringify(vehicle)
  }),
  updateVehicle: (vehicleId, vehicle) => request(`/vehicles/${vehicleId}`, {
    method: 'PATCH',
    body: JSON.stringify(vehicle)
  }),
  getRoutes: filters => request(`/routes${queryString(filters)}`),
  createRoute: route => request('/routes', {
    method: 'POST',
    body: JSON.stringify(route)
  }),
  updateRoute: (routeId, route) => request(`/routes/${routeId}`, {
    method: 'PATCH',
    body: JSON.stringify(route)
  }),
  deleteRoute: routeId => request(`/routes/${routeId}`, {
    method: 'DELETE'
  }),
  assignDriver: assignment => request('/assignments/driver', {
    method: 'POST',
    body: JSON.stringify(assignment)
  }),
  unassignDriverByDriverId: driverId => request(`/assignments/driver/by-driver/${driverId}`, {
    method: 'DELETE'
  }),
  assignStudent: assignment => request('/assignments/student', {
    method: 'POST',
    body: JSON.stringify(assignment)
  }),
  // Bulk student import. `rows` is the raw sheet as a 2D array of strings —
  // every interpretation rule lives on the server. Defaults to a dry run.
  // rowOffset is the index of the first row within the original sheet, so
  // rejects reported from a later chunk still cite findable row numbers.
  importStudents: (rows, commit = false, rowOffset = 0) => request('/students/import', {
    method: 'POST',
    body: JSON.stringify({ rows, commit, rowOffset })
  }),
  assignStudentsBulk: assignments => request('/assignments/students/bulk', {
    method: 'POST',
    body: JSON.stringify({ assignments })
  }),
  unassignStudentByStudentId: studentId => request(`/assignments/student/by-student/${studentId}`, {
    method: 'DELETE'
  }),
  getDriverAssignmentHistory: driverId => request(`/assignments/driver-history/${driverId}`),
  getVehicleAssignmentHistory: vehicleId => request(`/assignments/vehicle-history/${vehicleId}`),
  getStudentAssignmentHistory: studentId => request(`/assignments/student-history/${studentId}`),
  // Proxied through our own backend: the provider sends no CORS headers, it
  // rate-limits to one call a minute, and its credential must not ship in the
  // browser bundle. The backend caches, so polling here is cheap.
  getGpsVehicles: () => request('/gps/vehicles')
};
