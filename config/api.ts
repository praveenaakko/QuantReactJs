const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const UNAUTHORIZED_EVENT = 'auth:unauthorized';

const api = {
  async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    const headers = new Headers(options.headers || {});
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (options.body instanceof FormData || options.body instanceof URLSearchParams) {
      // Let the browser set the Content-Type header for these types
    } else if (options.body != null && typeof options.body !== 'string') {
      headers.set('Content-Type', 'application/json');
      options.body = JSON.stringify(options.body);
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    const fullUrl = `${BACKEND_URL}${endpoint}`;
    const response = await fetch(fullUrl, config);

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
      }
      const errorData = await response.json().catch(() => ({ detail: 'An unknown error occurred.' }));
      if (errorData.detail && Array.isArray(errorData.detail)) {
          const formattedError = errorData.detail.map((err: any) => {
            // Extract field name from 'loc' array, e.g., ["body", "email"] -> "email"
            const field = err.loc && err.loc.length > 1 ? String(err.loc[err.loc.length - 1]) : 'Field';
            // Capitalize the first letter for better display
            const capitalizedField = field.charAt(0).toUpperCase() + field.slice(1);
            return `${capitalizedField}: ${err.msg}`;
          }).join('. ');
          throw new Error(formattedError);
      }
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    if (response.status === 204) {
      return null;
    }
    
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
    }
    return response.text();
  },

  get(endpoint: string, options: RequestInit = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint: string, body: any, options: RequestInit = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  },

  put(endpoint: string, body: any, options: RequestInit = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  },

  delete(endpoint: string, options: RequestInit = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  },
};

export default api;
