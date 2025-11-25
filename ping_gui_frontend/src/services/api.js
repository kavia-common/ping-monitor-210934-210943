/**
 * Build API base preferring relative '/api' for preview/same-origin.
 * If explicit envs are provided, fall back to them.
 */
function getApiBase() {
  // Always prefer relative path for same-origin access (works with proxy or reverse proxy)
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

/**
 * Retry helper for fetch requests
 */
async function fetchWithRetry(url, options = {}, retries = 3, backoff = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }
      console.warn(`[api] Attempt ${attempt}/${retries} failed for ${url}, retrying in ${backoff}ms...`, err.message);
      await new Promise((resolve) => setTimeout(resolve, backoff));
      backoff *= 2; // Exponential backoff
    }
  }
}

// PUBLIC_INTERFACE
export const api = {
  /** Health check GET to /api/health (same-origin with detailed error reporting) */
  async health() {
    const healthPath = '/health';
    const fullUrl = urlJoin(API_BASE, healthPath);
    
    try {
      console.log('[api.health] Checking health at:', fullUrl);
      const res = await fetchWithRetry(fullUrl, { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }, 3, 500);
      
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        console.log('[api.health] ✓ Backend is healthy', data);
        return true;
      } else {
        console.error('[api.health] ✗ Backend returned non-OK status:', res.status, res.statusText);
        return false;
      }
    } catch (e) {
      // Log detailed error information
      console.error('[api.health] ✗ Health check failed:', {
        message: e.message,
        url: fullUrl,
        apiBase: API_BASE,
        error: e,
      });
      return false;
    }
  },

  /** Start ping session: POST /api/ping/start body: { host, count? } returns { sessionId } */
  async start({ host, count }) {
    const startPath = '/ping/start';
    const fullUrl = urlJoin(API_BASE, startPath);
    
    try {
      console.log('[api.start] Starting ping session:', { host, count, url: fullUrl });
      const res = await fetchWithRetry(fullUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ host, count }),
      }, 2, 1000);
      
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        const errorMsg = text || `Failed to start ping (HTTP ${res.status})`;
        console.error('[api.start] ✗ Start failed:', errorMsg);
        throw new Error(errorMsg);
      }
      
      const data = await res.json();
      if (!data || !data.sessionId) {
        throw new Error('Backend did not return a sessionId');
      }
      
      console.log('[api.start] ✓ Session started:', data.sessionId);
      return data;
    } catch (e) {
      console.error('[api.start] ✗ Exception:', {
        message: e.message,
        url: fullUrl,
        host,
        error: e,
      });
      throw e;
    }
  },

  /** Stop ping session: POST /api/ping/stop body: { sessionId } */
  async stop({ sessionId }) {
    const stopPath = '/ping/stop';
    const fullUrl = urlJoin(API_BASE, stopPath);
    
    try {
      console.log('[api.stop] Stopping session:', { sessionId, url: fullUrl });
      const res = await fetchWithRetry(fullUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      }, 2, 1000);
      
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        const errorMsg = text || `Failed to stop ping (HTTP ${res.status})`;
        console.error('[api.stop] ✗ Stop failed:', errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log('[api.stop] ✓ Session stopped');
      return true;
    } catch (e) {
      console.error('[api.stop] ✗ Exception:', {
        message: e.message,
        url: fullUrl,
        sessionId,
        error: e,
      });
      throw e;
    }
  },
};
