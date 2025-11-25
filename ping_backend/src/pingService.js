import { spawn } from 'child_process';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

let store = null;

function now() {
  return Date.now();
}

function isWindows() {
  return process.platform === 'win32';
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function safeKill(proc) {
  try {
    if (proc && !proc.killed) {
      if (isWindows()) {
        // On Windows, process.kill works with pid; SIGINT may not be supported
        process.kill(proc.pid);
      } else {
        proc.kill('SIGINT');
        setTimeout(() => {
          try {
            if (!proc.killed) proc.kill('SIGKILL');
          } catch {}
        }, 500);
      }
    }
  } catch {}
}

/**
 * Validate host (IPv4/IPv6/domain/localhost) and deny private networks if configured.
 */
function validateHost(host) {
  if (!host || typeof host !== 'string') return false;
  const value = host.trim();
  if (value.length === 0 || value.length > 253) return false;

  const localhost = value === 'localhost' || value.endsWith('.localhost');
  const ipv4 = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)$/.test(value);
  const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::1|::)$/.test(value);
  const domain = /^(?=.{1,253}$)(?!-)([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}$/.test(value);

  const denyPriv = String(process.env.DENY_PRIVATE_NETWORKS || 'false').toLowerCase() === 'true';
  if (denyPriv && ipv4) {
    // simple private IPv4 ranges
    const parts = value.split('.').map(Number);
    const [a, b] = parts;
    const isPrivate =
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254);
    if (isPrivate) return false;
  }

  return localhost || ipv4 || ipv6 || domain;
}

function buildPingArgs({ host, count }) {
  const args = [];
  if (isWindows()) {
    if (typeof count === 'number' && count > 0) {
      args.push('-n', String(Math.min(count, 1000)));
    }
    // Default Windows uses continuous unless -n specified
    args.push(host);
    return { cmd: 'ping', args };
  } else {
    // Linux/macOS
    if (typeof count === 'number' && count > 0) {
      args.push('-c', String(Math.min(count, 1000)));
    }
    args.push(host);
    return { cmd: 'ping', args };
  }
}

/**
 * Broadcast a line to all connected clients for the session.
 */
function broadcastLine(session, line) {
  if (!session || !session.clients) return;
  const data = typeof line === 'string' ? line : String(line);
  for (const ws of session.clients) {
    try {
      if (ws.readyState === 1 /* OPEN */) {
        ws.send(data);
      }
    } catch {
      // ignore individual client send failures
    }
  }
}

/**
 * Initialize the in-memory session store.
 * PUBLIC_INTERFACE
 */
export function initPingService() {
  /** Initializes the ping service store and configuration. */
  if (store) return store;
  store = {
    sessions: new Map(),
    config: {
      maxLinesPerSession: Number(process.env.MAX_LINES_PER_SESSION || 500),
      maxConcurrentSessions: Number(process.env.MAX_CONCURRENT_SESSIONS || 5),
      maxDurationMs: Number(process.env.MAX_DURATION_MS || 5 * 60 * 1000), // default 5 minutes
    },
  };
  return store;
}

/**
 * Get a session by ID (used by WS layer).
 * PUBLIC_INTERFACE
 */
export function getSession(sessionId) {
  /** Returns a session object or undefined for given sessionId. */
  if (!store) initPingService();
  return store.sessions.get(sessionId);
}

/**
 * Start a new ping session.
 * PUBLIC_INTERFACE
 */
export async function startPing({ host, count }) {
  /** Starts a ping process for the given host and returns a sessionId. */
  if (!store) initPingService();
  const { sessions, config } = store;

  // Capacity check
  const activeCount = Array.from(sessions.values()).filter(s => s.proc && !s.exited).length;
  if (activeCount >= config.maxConcurrentSessions) {
    const err = new Error('Max concurrent sessions reached');
    err.statusCode = 429;
    throw err;
  }

  // Input validation
  if (!validateHost(host)) {
    const err = new Error('Invalid host');
    err.statusCode = 400;
    throw err;
  }
  let parsedCount = undefined;
  if (typeof count !== 'undefined') {
    const n = Number(count);
    if (!Number.isFinite(n) || n <= 0) {
      const err = new Error('count must be a positive integer');
      err.statusCode = 400;
      throw err;
    }
    parsedCount = Math.floor(n);
  }

  // Build command
  const { cmd, args } = buildPingArgs({ host: host.trim(), count: parsedCount });

  // Spawn child
  const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  const sessionId = uuidv4();
  const session = {
    sessionId,
    host: host.trim(),
    cmd,
    args,
    createdAt: now(),
    proc: child,
    clients: new Set(),
    lines: 0,
    exited: false,
    timer: null,
  };
  sessions.set(sessionId, session);

  // Max duration guard
  session.timer = setTimeout(() => {
    broadcastLine(session, '[max duration reached, stopping]');
    stopPing({ sessionId }).catch(() => {});
  }, config.maxDurationMs);

  // Handle stdout line-by-line
  let buffer = '';
  child.stdout.on('data', (chunk) => {
    const text = chunk.toString('utf8');
    buffer += text;
    // split by lines
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).replace(/\r$/, '');
      buffer = buffer.slice(idx + 1);
      if (line.length > 0) {
        session.lines += 1;
        broadcastLine(session, line);
        if (session.lines >= config.maxLinesPerSession) {
          broadcastLine(session, '[max lines reached, stopping]');
          stopPing({ sessionId }).catch(() => {});
          break;
        }
      }
    }
  });

  child.stderr.on('data', (chunk) => {
    const line = chunk.toString('utf8').trim();
    if (line) broadcastLine(session, `[stderr] ${line}`);
  });

  child.on('error', (err) => {
    broadcastLine(session, `[error] ${err.message || 'failed to spawn ping'}`);
  });

  child.on('close', (code, signal) => {
    session.exited = true;
    if (session.timer) {
      clearTimeout(session.timer);
      session.timer = null;
    }
    broadcastLine(session, `[process exited] code=${code} signal=${signal || 'none'}`);
    // Cleanup after short delay to allow clients to receive final lines
    setTimeout(() => {
      const s = sessions.get(sessionId);
      if (!s) return;
      // Close remaining clients
      for (const ws of s.clients) {
        try {
          if (ws.readyState === 1) ws.close(1000, 'session ended');
        } catch {}
      }
      sessions.delete(sessionId);
    }, 1000);
  });

  return { sessionId };
}

/**
 * Stop a running ping session.
 * PUBLIC_INTERFACE
 */
export async function stopPing({ sessionId }) {
  /** Stops the ping process and cleans up the session. */
  if (!store) initPingService();
  const { sessions } = store;
  const session = sessions.get(sessionId);
  if (!session) return false;

  try {
    if (session.timer) {
      clearTimeout(session.timer);
      session.timer = null;
    }
    if (session.proc && !session.exited) {
      safeKill(session.proc);
    }
  } catch {}
  // allow child close handler to clean further and remove from map
  await sleep(50);
  return true;
}
