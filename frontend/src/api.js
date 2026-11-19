// API Client Wrapper with JWT Support

const getApiBase = () => {
  let base = (import.meta.env.VITE_API_BASE || '/api').trim().replace(/\/+$/, '');
  if (base.startsWith('http') && !base.endsWith('/api')) {
    base = `${base}/api`;
  }
  return base;
};

const API_BASE = getApiBase();

export const tokenStorage = {
  getAccess: () => localStorage.getItem('nexus_access_token'),
  getRefresh: () => localStorage.getItem('nexus_refresh_token'),
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem('nexus_user') || 'null');
    } catch {
      return null;
    }
  },
  setTokens: (access, refresh, user) => {
    if (access) localStorage.setItem('nexus_access_token', access);
    if (refresh) localStorage.setItem('nexus_refresh_token', refresh);
    if (user) localStorage.setItem('nexus_user', JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem('nexus_access_token');
    localStorage.removeItem('nexus_refresh_token');
    localStorage.removeItem('nexus_user');
  }
};

export async function apiRequest(endpoint, options = {}, isRetry = false) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  };

  const token = tokenStorage.getAccess();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, { ...options, headers });

    // Handle token expiration with refresh
    if (res.status === 401 && !isRetry) {
      const refresh = tokenStorage.getRefresh();
      if (refresh) {
        const refreshRes = await fetch(`${API_BASE}/auth/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh })
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          tokenStorage.setTokens(data.access, null, null);
          return apiRequest(endpoint, options, true);
        } else {
          tokenStorage.clear();
          window.location.reload();
        }
      }
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || errData.message || `Request failed with status ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const API = {
  login: async (email, password) => {
    const data = await apiRequest('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    tokenStorage.setTokens(data.access, data.refresh, data.user);
    return data;
  },
  logout: () => {
    tokenStorage.clear();
  },
  getCurrentUser: () => apiRequest('/auth/me/'),
  getEmployees: () => apiRequest('/employees/'),
  createEmployee: (emp) => apiRequest('/employees/', {
    method: 'POST',
    body: JSON.stringify(emp)
  }),
  updateEmployee: (id, emp) => apiRequest(`/employees/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(emp)
  }),
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiRequest('/employees/upload_avatar/', {
      method: 'POST',
      body: formData
    });
  },
  updateEmployeeAvatar: async (id, file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiRequest(`/employees/${id}/update_avatar/`, {
      method: 'POST',
      body: formData
    });
  },
  getAttendance: () => apiRequest('/attendance/'),
  createAttendance: (att) => apiRequest('/attendance/', {
    method: 'POST',
    body: JSON.stringify(att)
  }),
  updateAttendance: (id, att) => apiRequest(`/attendance/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(att)
  }),
  getLeaves: () => apiRequest('/leaves/'),
  createLeave: (leave) => apiRequest('/leaves/', {
    method: 'POST',
    body: JSON.stringify(leave)
  }),
  updateLeave: (id, leave) => apiRequest(`/leaves/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(leave)
  }),
  getPayroll: () => apiRequest('/payroll/'),
  getAnnouncements: () => apiRequest('/announcements/'),
  createAnnouncement: (ann) => apiRequest('/announcements/', {
    method: 'POST',
    body: JSON.stringify(ann)
  }),
};
