require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const morgan = require('morgan');
const Joi = require('joi');

const app = express();
const PORT = process.env.PORT || 4002;

// ─── DB Connection ────────────────────────────────────────────
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'loginapp',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// ─── DB Init ──────────────────────────────────────────────────
const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         SERIAL PRIMARY KEY,
        name       VARCHAR(100) NOT NULL,
        email      VARCHAR(150) UNIQUE NOT NULL,
        password   VARCHAR(255) NOT NULL,
        avatar     VARCHAR(255),
        role       VARCHAR(20) DEFAULT 'user',
        is_active  BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('[User] Database tables initialized ✅');
  } catch (err) {
    console.error('[User] DB init error:', err.message);
  } finally {
    client.release();
  }
};

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// ─── Validation Schemas ───────────────────────────────────────
const createUserSchema = Joi.object({
  name:     Joi.string().min(2).max(100).required(),
  email:    Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const updateUserSchema = Joi.object({
  name:   Joi.string().min(2).max(100),
  avatar: Joi.string().uri().allow('', null)
});

// ─── Routes ───────────────────────────────────────────────────

// Health
app.get('/users/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'user-service', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', service: 'user-service', db: 'disconnected' });
  }
});

// POST /users  — create user
app.post('/users', async (req, res) => {
  try {
    const { error, value } = createUserSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { name, email, password } = value;

    // Check existing
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0)
      return res.status(409).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, role, created_at`,
      [name, email, hashed]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error('[User] Create error:', err.message);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// GET /users/email/:email  — lookup by email (used by auth-service)
app.get('/users/email/:email', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, password, role, is_active FROM users WHERE email = $1',
      [decodeURIComponent(req.params.email)]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    if (!result.rows[0].is_active) return res.status(403).json({ error: 'Account is deactivated' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('[User] Lookup error:', err.message);
    res.status(500).json({ error: 'Lookup failed' });
  }
});

// GET /users/:id  — get profile
app.get('/users/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, avatar, role, last_login, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// PATCH /users/:id  — update profile
app.patch('/users/:id', async (req, res) => {
  try {
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const fields = [];
    const vals = [];
    let idx = 1;
    if (value.name   !== undefined) { fields.push(`name = $${idx++}`);   vals.push(value.name); }
    if (value.avatar !== undefined) { fields.push(`avatar = $${idx++}`); vals.push(value.avatar); }

    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    fields.push(`updated_at = NOW()`);
    vals.push(req.params.id);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, email, avatar, role`,
      vals
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// PATCH /users/:id/last-login  — update last login timestamp
app.patch('/users/:id/last-login', async (req, res) => {
  try {
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [req.params.id]);
    res.json({ message: 'Last login updated' });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// GET /users  — list all (admin)
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, is_active, last_login, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users: result.rows, total: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// ─── Start ────────────────────────────────────────────────────
const start = async () => {
  await initDB();
  app.listen(PORT, () => {
    console.log(`\n👤 User Service running on http://localhost:${PORT}`);
  });
};
start();
