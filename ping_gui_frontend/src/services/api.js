/**
 * Build API base preferring relative '/api' for preview/same-origin.
 * If explicit envs are provided, fall back to them.
 */
function getApiBase() {
  // Always prefer relative path for preview/same-origin
  const relative = '/api';
  const explicit = process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL;
  // If an explicit absolute URL is provided, use it; else use relative
  return explicit && /^https?:\/\//i.test(explicit) ? explicit : relative;
}

const API_BASE = getApiBase();

function urlJoin(base, path) {
  // Support relative base like '/api'
  if (base.startsWith('/')) {
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
  }
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}

// PUBLIC_INTERFACE
export const api = {
  /** Health check GET to /api/health (same-origin) */
  async health() {
    const healthPath = '/health';
    try {
      const res = await fetch(urlJoin(API_BASE, healthPath), { method: 'GET' });
      return res.ok;
    } catch (e) {
      // Log clearer error
      // eslint-disable-next-line no-console
      console.error('[api.health] failed:', e);
      return false;
    }
  },

  /** Start ping session: POST /api/ping/start body: { host, count? } returns { sessionId } */
  async start({ host, count }) {
    try {
      const res = await fetch(urlJoin(API_BASE, '/ping/start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, count }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Failed to start ping (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (!data || !data.sessionId) {
        throw new Error('Backend did not return a sessionId');
      }
      return data;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[api.start] failed:', e);
      throw e;
    }
  },

  /** Stop ping session: POST /api/ping/stop body: { sessionId } */
  async stop({ sessionId }) {
    try {
      const res = await fetch(urlJoin(API_BASE, '/ping/stop'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Failed to stop ping (HTTP ${res.status})`);
      }
      return true;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[api.stop] failed:', e);
      throw e;
    }
  },
};
