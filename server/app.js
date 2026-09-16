const express = require('express');
const cors = require('cors');
const path = require('path');
const log = require('./utils/logger');
const db = require('./db');
const authMiddleware = require('./middleware/auth');
const environmentContext = require('./middleware/environment-context');
const { createCorsOriginValidator, parseAllowedOrigins } = require('./utils/allowed-origins');
const { apiLimiter, authenticatedApiLimiter, fileReadLimiter } = require('./utils/rate-limiters');
const { serverError } = require('./utils/http-error');

const { router: authRouter } = require('./routes/auth');
const usersRouter = require('./routes/users');
const rolesRouter = require('./routes/roles');
const resetRouter = require('./routes/reset');
const dashboardRouter = require('./routes/dashboard');
const createAnsibleRouter = require('./routes/ansible');
const serversRouter = require('./routes/servers');
const environmentsRouter = require('./routes/environments');
const createServerActionsRouter = require('./routes/server-actions');
const customUpdatesRouter = require('./routes/custom-updates');
const systemRouter = require('./routes/system');
const playbooksRouter = require('./routes/playbooks');
const schedulesRouter = require('./routes/schedules');
const scheduleHistoryRouter = require('./routes/schedule-history');
const ansibleVarsRouter = require('./routes/ansible-vars');
const adhocRouter = require('./routes/adhoc');
const gitPlaybooksRouter = require('./routes/git-playbooks');
const ipamRouter = require('./routes/ipam');
const maintenanceWindowsRouter = require('./routes/maintenance-windows');
const operationsRouter = require('./routes/operations');
const alertsRouter = require('./routes/alerts');
const fileTransfersRouter = require('./routes/file-transfers');
const { createOpenTofuRouter } = require('./routes/opentofu');

function createApp({ isHttps = false } = {}) {
  const app = express();
  let broadcast = () => {};
  const emit = (payload) => broadcast(payload);

  // TRUST_PROXY: accepts '1' (single hop), numeric hop count ('2', '3', …),
  // 'true'/'false', or an Express-compatible value like a CIDR/IP list
  // (e.g. '10.0.0.0/8,192.168.0.0/16'). Backward-compatible with prior '1'-only behaviour.
  const tp = process.env.TRUST_PROXY;
  if (tp !== undefined && tp !== '' && tp !== '0' && tp.toLowerCase() !== 'false') {
    const asNum = Number.parseInt(tp, 10);
    if (Number.isFinite(asNum) && String(asNum) === tp.trim()) {
      app.set('trust proxy', asNum);
    } else if (tp.toLowerCase() === 'true') {
      app.set('trust proxy', true);
    } else {
      // IP/CIDR list – Express accepts comma-separated string or array.
      app.set('trust proxy', tp.split(',').map(s => s.trim()).filter(Boolean));
    }
  }

  const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

  app.use(cors({ origin: createCorsOriginValidator(allowedOrigins) }));
  app.use(express.json({ limit: '2mb' }));
  app.use((req, res, next) => {
    // All API payloads use named fields. Reject JSON scalar/array roots early
    // so route handlers cannot accidentally process an unexpected shape.
    if (req.is('application/json') && (req.body === null || Array.isArray(req.body))) {
      return res.status(400).json({ error: 'JSON body must be an object' });
    }
    return next();
  });

  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      if (req.path.startsWith('/api/')) {
        log.child({ module: 'http' })[level]({
          method: req.method, url: req.path, status: res.statusCode, duration,
        }, 'request');
      }
    });
    next();
  });

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (isHttps) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    const isProduction = process.env.NODE_ENV === 'production';
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        isProduction ? "script-src 'self'" : "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
        "font-src 'self' data: https://cdnjs.cloudflare.com",
        "connect-src 'self' ws: wss:",
        "img-src 'self' data:",
        "frame-ancestors 'none'",
      ].join('; ')
    );
    next();
  });

  const nextDist = path.join(__dirname, '..', 'frontend-next', 'dist');
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(nextDist));
  }

  app.use('/api', apiLimiter);

  // API responses routinely carry infrastructure metadata and authentication
  // material.  Keep browsers and intermediary caches from storing them.
  // Static frontend assets retain their existing cache behaviour.
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.get('/api/health', (req, res) => {
    try {
      db.db.prepare('SELECT 1').get();
      res.json({ status: 'ok', uptime: Math.floor(process.uptime()) });
    } catch (e) {
      log.error({ err: e }, 'Health check failed');
      res.status(500).json({ status: 'error', error: 'Database unavailable' });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/v1/agent', (_req, res) => res.status(410).json({ error: 'Agent support has been removed. Use SSH.' }));

  app.use('/api/users', authMiddleware, authenticatedApiLimiter, usersRouter);
  app.use('/api/roles', authMiddleware, authenticatedApiLimiter, rolesRouter);

  app.use('/api', authMiddleware);
  app.use('/api', authenticatedApiLimiter);
  app.use('/api', environmentContext);

  app.get('/api/ping', (req, res) => res.json({ ok: true, ts: Date.now() }));

  app.use('/api/reset', resetRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/environments', environmentsRouter);
  app.use('/api/ipam', ipamRouter);
  app.use('/api/maintenance-windows', maintenanceWindowsRouter);
  app.use('/api/operations', operationsRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/opentofu', createOpenTofuRouter({ broadcast: emit }));
  app.use('/api/ansible', createAnsibleRouter({ broadcast: emit }));
  app.use('/api/servers/:id/custom-updates', customUpdatesRouter);
  app.use('/api/servers', fileTransfersRouter);
  app.use('/api/servers', createServerActionsRouter({ broadcast: emit }));
  app.use('/api/servers', serversRouter);
  app.use('/api/system', systemRouter);
  app.use('/api/playbooks', playbooksRouter);
  app.use('/api/schedules', schedulesRouter);
  app.use('/api/schedule-history', scheduleHistoryRouter);
  app.use('/api/ansible-vars', ansibleVarsRouter);
  app.use('/api/adhoc', adhocRouter);
  app.use('/api/playbooks-git', gitPlaybooksRouter);
  app.use('/api/v1', (_req, res) => res.status(410).json({ error: 'Agent support has been removed. Use SSH.' }));

  // Retired extension endpoints must not fall through to the SPA.
  app.use(['/api/plugins', '/api/plugin', '/plugins'], (_req, res) => res.status(404).json({ error: 'Not found' }));

  if (process.env.NODE_ENV === 'production') {
    app.use(fileReadLimiter, (req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      res.sendFile(path.join(nextDist, 'index.html'));
    });
  }

  app.use((err, req, res, next) => {
    if (!err) return next();
    // Body-parser errors are client input errors. Keep their responses
    // intentionally generic, while preserving accurate HTTP semantics.
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body too large' });
    }
    if (err.type === 'encoding.unsupported') {
      return res.status(415).json({ error: 'Unsupported request encoding' });
    }
    return serverError(res, err, `${req.method} ${req.path}`);
  });

  return {
    app,
    allowedOrigins,
    setBroadcast: (nextBroadcast) => {
      broadcast = typeof nextBroadcast === 'function' ? nextBroadcast : broadcast;
    },
  };
}

module.exports = { createApp };
