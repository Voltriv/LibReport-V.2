import axios from 'axios';

// Base API instance. In dev, CRA proxy forwards to http://localhost:4000.
// In prod, src/server.js proxies /api to BACKEND_URL.
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// Fallback helper: if proxy breaks, retry once against direct backend URL
export function directBackendBase() {
  try {
    if (typeof window === 'undefined') throw new Error('no-window');
    const w = window;
    if (w.__BACKEND_ORIGIN__) return w.__BACKEND_ORIGIN__;

    const { protocol = 'http:', hostname = 'localhost', port: locationPort = '' } = w.location || {};
    const overridePort = w.__BACKEND_PORT__;

    let port = overridePort ?? locationPort;
    if (!port || port === '3000' || port === '5173' || port === '4173') {
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        port = '4000';
      }
    }

    const normalizedPort = String(port || '').replace(/^:+/, '');
    const shouldIncludePort = normalizedPort && normalizedPort !== '80' && normalizedPort !== '443';
    return `${protocol}//${hostname}${shouldIncludePort ? `:${normalizedPort}` : ''}`;
  } catch {
    return 'http://localhost:4000';
  }
}

export function resolveMediaUrl(path) {
  if (!path) return '';
  const value = String(path).trim();
  if (!value) return '';
  if (/^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith('data:')) return value;
  const base = directBackendBase();
  if (value.startsWith('/')) return `${base}${value}`;
  return `${base}/${value}`;
}

// Optional auth header helper
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    try { localStorage.setItem('lr_token', token); } catch {}
  } else {
    delete api.defaults.headers.common['Authorization'];
    try { localStorage.removeItem('lr_token'); } catch {}
  }
}

<<<<<<< ours
function getStoredRole() {
  try {
    const raw = localStorage.getItem('lr_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.role || null;
=======
export function getStoredUser() {
  try {
    const raw = localStorage.getItem('lr_user');
    if (!raw) return null;
    return JSON.parse(raw);
>>>>>>> theirs
  } catch {
    return null;
  }
}

<<<<<<< ours
=======
export function setStoredUser(user) {
  try {
    if (!user) {
      localStorage.removeItem('lr_user');
    } else {
      localStorage.setItem('lr_user', JSON.stringify(user));
    }
  } catch {}
}

export function hasStoredToken() {
  try {
    return Boolean(localStorage.getItem('lr_token'));
  } catch {
    return false;
  }
}

export function broadcastAuthChange() {
  try {
    window.dispatchEvent(new Event('lr-auth-change'));
  } catch {}
}

export function clearAuthSession() {
  setAuthToken(null);
  setStoredUser(null);
}

export function persistAuthSession({ token, user }) {
  if (typeof token !== 'undefined') {
    setAuthToken(token);
  }
  if (typeof user !== 'undefined') {
    setStoredUser(user);
  }
  broadcastAuthChange();
}

function getStoredRole() {
  const user = getStoredUser();
  return user?.role || null;
}

>>>>>>> theirs
// Load token on boot if present
try {
  const t = localStorage.getItem('lr_token');
  if (t) setAuthToken(t);
} catch {}

// Redirect to sign-in on 401s
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (!status || status === 404) {
      // Network or proxy error — retry once directly to backend with CORS
      const cfg = err?.config || {};
      if (!cfg.__retriedDirect) {
        cfg.__retriedDirect = true;
        // Keep original URL (likely starts with '/api/...').
        // Point baseURL to backend root to avoid '/api/api/...' duplication.
        const baseURL = `${directBackendBase()}/api`; 
        return axios.request({ ...cfg, baseURL });
      }
    }
    if (typeof window !== 'undefined') {
      const at = (path) => {
        try { return window.location.pathname === path; } catch { return false; }
      };
      if (status === 401 || status === 403) {
        const role = getStoredRole();
        const target = role === 'student' ? '/student/signin' : '/signin';
<<<<<<< ours
        try {
          setAuthToken(null);
          localStorage.removeItem('lr_user');
          window.dispatchEvent(new Event('lr-auth-change'));
        } catch {}
=======
        clearAuthSession();
        broadcastAuthChange();
>>>>>>> theirs
        if (!at(target)) window.location.replace(target);
      }
    }
    return Promise.reject(err);
  }
);

export default api;
