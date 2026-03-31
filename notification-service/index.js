require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 4003;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// ─── Mailer Setup ─────────────────────────────────────────────
let transporter = null;

const initMailer = async () => {
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    console.log('[Notify] Using configured SMTP ✅');
  } else {
    // Try Ethereal with a 5s timeout — skip if slow network
    try {
      const testAccount = await Promise.race([
        nodemailer.createTestAccount(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
      ]);
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: testAccount.user, pass: testAccount.pass }
      });
      console.log('[Notify] Using Ethereal test email ✅');
    } catch {
      // Fallback: log-only mode (no real email sending)
      console.log('[Notify] Ethereal unavailable — running in log-only mode 📋');
      transporter = null;
    }
  }
};

// ─── Email Templates ──────────────────────────────────────────
const welcomeTemplate = (name) => ({
  subject: '👋 Welcome to LoginApp!',
  html: `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px;">
      <h1 style="color:#6366f1;">Welcome, ${name}! 🎉</h1>
      <p>Your account has been created successfully.</p>
      <p>You can now log in and explore the app.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:30px 0"/>
      <p style="color:#888;font-size:12px;">LoginApp • Microservices Demo</p>
    </div>
  `
});

const loginAlertTemplate = (name, time) => ({
  subject: '🔐 New Login Detected',
  html: `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px;">
      <h2 style="color:#6366f1;">New Login Alert</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p>A new login was detected on your account at <strong>${time}</strong>.</p>
      <p>If this wasn't you, please change your password immediately.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:30px 0"/>
      <p style="color:#888;font-size:12px;">LoginApp • Microservices Demo</p>
    </div>
  `
});

// ─── Routes ───────────────────────────────────────────────────

app.get('/notifications/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

// POST /notifications/welcome
app.post('/notifications/welcome', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !name) return res.status(400).json({ error: 'email and name required' });

    if (!transporter) {
      console.log(`[Notify] 📋 Welcome email (log-only) → ${email}`);
      return res.json({ message: 'Welcome email logged (no SMTP configured)' });
    }

    const { subject, html } = welcomeTemplate(name);
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL || '"LoginApp" <noreply@loginapp.local>',
      to: email, subject, html
    });
    console.log(`[Notify] Welcome email sent to ${email} | Preview: ${nodemailer.getTestMessageUrl(info)}`);
    res.json({ message: 'Welcome email sent', preview: nodemailer.getTestMessageUrl(info) });
  } catch (err) {
    console.error('[Notify] Email error:', err.message);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// POST /notifications/login-alert
app.post('/notifications/login-alert', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !name) return res.status(400).json({ error: 'email and name required' });

    if (!transporter) {
      console.log(`[Notify] 📋 Login alert (log-only) → ${email}`);
      return res.json({ message: 'Login alert logged (no SMTP configured)' });
    }

    const { subject, html } = loginAlertTemplate(name, new Date().toLocaleString());
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL || '"LoginApp" <noreply@loginapp.local>',
      to: email, subject, html
    });
    console.log(`[Notify] Login alert sent to ${email} | Preview: ${nodemailer.getTestMessageUrl(info)}`);
    res.json({ message: 'Login alert sent', preview: nodemailer.getTestMessageUrl(info) });
  } catch (err) {
    console.error('[Notify] Email error:', err.message);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// ─── Start ────────────────────────────────────────────────────
const start = async () => {
  await initMailer();
  app.listen(PORT, () => {
    console.log(`\n📧 Notification Service running on http://localhost:${PORT}`);
  });
};
start();
