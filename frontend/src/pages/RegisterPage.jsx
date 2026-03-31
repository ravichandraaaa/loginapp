import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate      = useNavigate();

  const [form,    setForm]    = useState({ name: '', email: '', password: '', confirm: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      return setError('Passwords do not match');
    }
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters');
    }
    setLoading(true);
    setError('');
    try {
      await register(form.name, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const strength = form.password.length === 0 ? 0
    : form.password.length < 6 ? 1
    : form.password.length < 10 ? 2
    : 3;

  const strengthLabel = ['', 'Weak', 'Good', 'Strong'];
  const strengthColor = ['', '#f87171', '#fbbf24', '#34d399'];

  return (
    <div className="auth-layout">
      {/* Left panel */}
      <div className="auth-brand">
        <div className="brand-inner">
          <div className="brand-logo">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
              <rect width="40" height="40" rx="12" fill="#7c6af7"/>
              <path d="M12 20C12 15.6 15.6 12 20 12s8 3.6 8 8-3.6 8-8 8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="20" cy="20" r="3" fill="#fff"/>
            </svg>
            <span className="brand-name">LoginApp</span>
          </div>
          <h2 className="brand-tagline">Three tiers.<br />One seamless flow.</h2>
          <ul className="brand-features">
            <li><span className="feat-dot" />Auto email on register</li>
            <li><span className="feat-dot" />Bcrypt password hashing</li>
            <li><span className="feat-dot" />Input validation with Joi</li>
            <li><span className="feat-dot" />Instant JWT issuance</li>
          </ul>
          <div className="brand-badges">
            <span className="badge">Auth Service</span>
            <span className="badge">User Service</span>
            <span className="badge">Notify Service</span>
          </div>
        </div>
        <div className="brand-bg-glow" />
      </div>

      {/* Right panel */}
      <div className="auth-form-panel">
        <div className="auth-card card fade-up">
          <div className="auth-header">
            <h1>Create account</h1>
            <p>Join us — it only takes a moment</p>
          </div>

          {error && <div className="alert alert-error">⚠ {error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                name="name"
                placeholder="Jane Doe"
                value={form.name}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={handleChange}
                required
              />
              {form.password && (
                <div className="strength-bar">
                  {[1,2,3].map(n => (
                    <div
                      key={n}
                      className="strength-seg"
                      style={{ background: n <= strength ? strengthColor[strength] : 'var(--border)' }}
                    />
                  ))}
                  <span style={{ color: strengthColor[strength], fontSize: 12 }}>
                    {strengthLabel[strength]}
                  </span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirm">Confirm Password</label>
              <input
                id="confirm"
                type="password"
                name="confirm"
                placeholder="••••••••"
                value={form.confirm}
                onChange={handleChange}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !form.name || !form.email || !form.password || !form.confirm}
            >
              {loading ? <><div className="spinner" /> Creating account…</> : 'Create Account →'}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
