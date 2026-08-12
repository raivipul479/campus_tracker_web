const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://campus-tracker-backend.onrender.com/api';
const GPS_API_BASE_URL = import.meta.env.VITE_GPS_API_BASE_URL || '';
const GPS_API_USERNAME = import.meta.env.VITE_GPS_API_USERNAME || '';
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
  hasGpsConfig: Boolean(GPS_API_BASE_URL && GPS_API_USERNAME),
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
  getFeeDues: filters => request(`/fee-dues${queryString(filters)}`),
  generateFeeDues: payload => request('/fee-dues/generate', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getFeeSummary: filters => request(`/fee-dues/summary${queryString(filters)}`),
  getFeeReport: filters => request(`/fee-dues/report${queryString(filters)}`),
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
  getGpsVehicles: async () => {
    if (!GPS_API_BASE_URL || !GPS_API_USERNAME) {
      throw new Error('GPS API is not configured. Set VITE_GPS_API_BASE_URL and VITE_GPS_API_USERNAME.');
    }

    const response = await fetch(`${GPS_API_BASE_URL.replace(/\/$/, '')}/gps/public/api/v1/company`, {
      headers: {
        username: GPS_API_USERNAME
      }
    });

    if (!response.ok) {
      throw new Error(`GPS API failed with status ${response.status}`);
    }

    const payload = await response.json();
    if (payload?.code !== 0 || !Array.isArray(payload?.data)) {
      throw new Error(payload?.status || 'GPS API returned an invalid response.');
    }

    return payload.data.map(item => ({
      id: item.vehicleNo || item.alias || item.Imei,
      vehicleNo: item.vehicleNo || 'Unknown vehicle',
      alias: item.alias || '',
      imei: item.Imei || item.imei || '',
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      speed: Number(item.speed || 0),
      ignition: Boolean(item.ignition),
      odometer: Number(item.totalGpsOdometer || 0),
      gpsDuration: Number(item.totalGpsDuration || 0),
      timestamp: item.timestamp ? new Date(Number(item.timestamp)) : null
    })).filter(item => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
  }
};
