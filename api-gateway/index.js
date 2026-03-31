require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: '*', credentials: true }));
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

const AUTH_SERVICE   = process.env.AUTH_SERVICE_URL   || 'http://localhost:4001';
const USER_SERVICE   = process.env.USER_SERVICE_URL   || 'http://localhost:4002';
const NOTIFY_SERVICE = process.env.NOTIFY_SERVICE_URL || 'http://localhost:4003';

// Health — available at both /health and /api/health
const healthHandler = (req, res) => res.json({
  status: 'ok', service: 'api-gateway',
  timestamp: new Date().toISOString(),
  routes: { auth: AUTH_SERVICE, user: USER_SERVICE, notification: NOTIFY_SERVICE }
});
app.get('/health',     healthHandler);
app.get('/api/health', healthHandler);

// Proxy routes (no express.json() — it breaks body forwarding)
app.use('/api/auth', createProxyMiddleware({
  target: AUTH_SERVICE, changeOrigin: true,
  pathRewrite: { '^/api/auth': '/auth' },
  on: { error: (err, req, res) => res.status(502).json({ error: 'Auth service unavailable' }) }
}));

app.use('/api/users', createProxyMiddleware({
  target: USER_SERVICE, changeOrigin: true,
  pathRewrite: { '^/api/users': '/users' },
  on: { error: (err, req, res) => res.status(502).json({ error: 'User service unavailable' }) }
}));

app.use('/api/notifications', createProxyMiddleware({
  target: NOTIFY_SERVICE, changeOrigin: true,
  pathRewrite: { '^/api/notifications': '/notifications' },
  on: { error: (err, req, res) => res.status(502).json({ error: 'Notification service unavailable' }) }
}));

app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));

app.listen(PORT, () => {
  console.log(`\n🚀 API Gateway running on http://localhost:${PORT}`);
  console.log(`   → Auth Service    : ${AUTH_SERVICE}`);
  console.log(`   → User Service    : ${USER_SERVICE}`);
  console.log(`   → Notify Service  : ${NOTIFY_SERVICE}\n`);
});
