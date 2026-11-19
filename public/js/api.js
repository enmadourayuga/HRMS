// API Client Wrapper
const API = {
  baseUrl: '/api',

  async request(endpoint, options = {}, isRetry = false) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = localStorage.getItem('nexus_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      // Auto-refresh access token on 401 Unauthorized if refreshToken is present
      if (response.status === 401 && !isRetry && !endpoint.startsWith('/auth/')) {
        const refreshToken = localStorage.getItem('nexus_refreshToken');
        if (refreshToken) {
          try {
            const refreshRes = await fetch(`${this.baseUrl}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken })
            });
            const refreshData = await refreshRes.json();
            if (refreshRes.ok && refreshData.token) {
              localStorage.setItem('nexus_token', refreshData.token);
              if (refreshData.refreshToken) {
                localStorage.setItem('nexus_refreshToken', refreshData.refreshToken);
              }
              return this.request(endpoint, options, true);
            }
          } catch (refreshErr) {
            console.warn('Token auto-refresh failed:', refreshErr);
          }
        }
        if (window.Auth && typeof window.Auth.logout === 'function') {
          window.Auth.logout();
        }
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! Status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, error);
      throw error;
    }
  },

  get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request(url, { method: 'GET' });
  },

  post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  put(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  patch(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }
};

if (typeof window !== 'undefined') {
  window.API = API;
}
