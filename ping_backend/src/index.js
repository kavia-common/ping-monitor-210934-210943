import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { initPingService, startPing, stopPing, getSession } from './pingService.js';
import { attachWsServer } from './ws.js';

dotenv.config();

const app = express();

// Configuration from env with defaults
const PORT = Number(process.env.PORT || 8080);
const TRUST_PROXY = String(process.env.TRUST_PROXY || 'true').toLowerCase() === 'true';
const HEALTHCHECK_PATH = process.env.HEALTHCHECK_PATH || '/health';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 30);

// Trust proxy if behind reverse proxy
if (TRUST_PROXY) app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS: allow localhost:3000 and env configured origins
const allowedOrigins = new Set();
allowedOrigins.add('http://localhost:3000');
if (process.env.CORS_ORIGINS) {
  // comma separated origins
  for (const origin of process.env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)) {
    allowedOrigins.add(origin);
  }
}
if (process.env.REACT_APP_FRONTEND_URL) allowedOrigins.add(process.env.REACT_APP_FRONTEND_URL);
if (process.env.ALLOWED_ORIGIN) allowedOrigins.add(process.env.ALLOWED_ORIGIN);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    return callback(null, true); // be permissive in local dev; tighten in prod as needed
  },
  credentials: true,
}));

// Logging
if (LOG_LEVEL !== 'silent') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '256kb' }));

// Rate limiting basic
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

/**
 * Health routes
 * - Preferred: GET /api/health
 * - Legacy:    GET ${HEALTHCHECK_PATH} (default /health)
 */
// PUBLIC_INTERFACE
app.get('/api/health', (req, res) => {
  /** Health check endpoint (new path)
   * Returns 200 OK when service is up
   * Response: { status: 'ok' }
   */
  res.status(200).json({ status: 'ok' });
});
app.get(HEALTHCHECK_PATH, (req, res) => {
  /** Health check endpoint (legacy path for backward compatibility) */
  res.status(200).json({ status: 'ok' });
});

// Initialize ping service singletons
initPingService();

/**
 * REST routes (preferred under /api) with legacy fallbacks
 */
// PUBLIC_INTERFACE
app.post(['/api/ping/start', '/ping/start'], async (req, res) => {
  /** Start a ping session
   * Request body: { host: string, count?: number }
   * Response: { sessionId: string }
   */
  try {
    const { host, count } = req.body || {};
    const { sessionId } = await startPing({ host, count });
    return res.status(200).json({ sessionId });
  } catch (err) {
    const code = err?.statusCode || 400;
    return res.status(code).send(err?.message || 'Failed to start ping');
  }
});

// PUBLIC_INTERFACE
app.post(['/api/ping/stop', '/ping/stop'], async (req, res) => {
  /** Stop a ping session
   * Request body: { sessionId: string }
   * Response: { stopped: true }
   */
  try {
    const { sessionId } = req.body || {};
    if (!sessionId) {
      return res.status(400).send('sessionId is required');
    }
    const existed = await stopPing({ sessionId });
    return res.status(existed ? 200 : 404).json({ stopped: !!existed });
  } catch (err) {
    const code = err?.statusCode || 500;
    return res.status(code).send(err?.message || 'Failed to stop ping');
  }
});

// Create HTTP server and attach WebSocket
const server = http.createServer(app);
attachWsServer({ server, getSession });

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[ping-backend] listening on port ${PORT}`);
});
