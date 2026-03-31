require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createClient } = require('redis');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 4001;

// ─── Redis Client ─────────────────────────────────────────────
let redisClient;
(async () => {
  try {
    redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    redisClient.on('error', (err) => console.warn('[Auth] Redis error (continuing without cache):', err.message));
    await redisClient.connect();
    console.log('[Auth] Redis connected ✅');
  } catch (err) {
    console.warn('[Auth] Redis not available, running without session store:', err.message);
    redisClient = null;
  }
})();

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

const JWT_SECRET        = process.env.JWT_SECRET        || 'super-secret-jwt-key-change-in-prod';
const JWT_REFRESH_SECRET= process.env.JWT_REFRESH_SECRET|| 'super-secret-refresh-key-change-in-prod';
const USER_SERVICE_URL  = process.env.USER_SERVICE_URL  || 'http://localhost:4002';
const NOTIFY_SERVICE_URL= process.env.NOTIFY_SERVICE_URL|| 'http://localhost:4003';

// ─── Helpers ──────────────────────────────────────────────────
const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

const storeRefreshToken = async (userId, token) => {
  if (!redisClient) return;
  await redisClient.setEx(`refresh:${userId}`, 7 * 24 * 3600, token);
};

const isTokenBlacklisted = async (token) => {
  if (!redisClient) return false;
  const result = await redisClient.get(`blacklist:${token}`);
  return !!result;
};

// ─── Routes ───────────────────────────────────────────────────

// Health
app.get('/auth/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service', redis: !!redisClient });
});

// POST /auth/register
app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: 'name, email and password are required' });

    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    // Create user via User Service
    const userRes = await axios.post(`${USER_SERVICE_URL}/users`, { name, email, password });
    const user = userRes.data.user;

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({ id: user.id, email: user.email, name: user.name });
    await storeRefreshToken(user.id, refreshToken);

    // Notify (fire and forget)
    axios.post(`${NOTIFY_SERVICE_URL}/notifications/welcome`, { email, name }).catch(() => {});

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user.id, name: user.name, email: user.email },
      accessToken,
      refreshToken
    });
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    console.error('[Auth] Register error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'email and password are required' });

    // Get user from User Service
    const userRes = await axios.get(`${USER_SERVICE_URL}/users/email/${encodeURIComponent(email)}`);
    const user = userRes.data.user;

    // Verify password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({ id: user.id, email: user.email, name: user.name });
    await storeRefreshToken(user.id, refreshToken);

    // Update last login (fire and forget)
    axios.patch(`${USER_SERVICE_URL}/users/${user.id}/last-login`).catch(() => {});

    res.json({
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email },
      accessToken,
      refreshToken
    });
  } catch (err) {
    if (err.response?.status === 404) return res.status(401).json({ error: 'Invalid credentials' });
    if (err.response) return res.status(err.response.status).json(err.response.data);
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /auth/refresh
app.post('/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    // Check if stored token matches
    if (redisClient) {
      const stored = await redisClient.get(`refresh:${decoded.id}`);
      if (stored !== refreshToken) return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens({
      id: decoded.id, email: decoded.email, name: decoded.name
    });
    await storeRefreshToken(decoded.id, newRefreshToken);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// POST /auth/logout
app.post('/auth/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(400).json({ error: 'Authorization header required' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.decode(token);

    if (redisClient && decoded) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) await redisClient.setEx(`blacklist:${token}`, ttl, '1');
      await redisClient.del(`refresh:${decoded.id}`);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('[Auth] Logout error:', err.message);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /auth/verify  (middleware for other services)
app.get('/auth/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];

    if (await isTokenBlacklisted(token))
      return res.status(401).json({ error: 'Token has been invalidated' });

    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: { id: decoded.id, email: decoded.email, name: decoded.name } });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// ─── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🔐 Auth Service running on http://localhost:${PORT}`);
});
