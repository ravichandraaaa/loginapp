import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* Left panel — branding */}
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
          <h2 className="brand-tagline">Microservices<br />architecture done right.</h2>
          <ul className="brand-features">
            <li><span className="feat-dot" />JWT + Refresh tokens</li>
            <li><span className="feat-dot" />Redis session store</li>
            <li><span className="feat-dot" />PostgreSQL persistence</li>
            <li><span className="feat-dot" />API Gateway routing</li>
          </ul>
          <div className="brand-badges">
            <span className="badge">Node.js</span>
            <span className="badge">React</span>
            <span className="badge">PostgreSQL</span>
            <span className="badge">Redis</span>
          </div>
        </div>
        <div className="brand-bg-glow" />
      </div>

      {/* Right panel — form */}
      <div className="auth-form-panel">
        <div className="auth-card card fade-up">
          <div className="auth-header">
            <h1>Welcome back</h1>
            <p>Sign in to your account to continue</p>
          </div>

          {error && <div className="alert alert-error">⚠ {error}</div>}

          <form onSubmit={handleSubmit} noValidate>
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
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !form.email || !form.password}
            >
              {loading ? <><div className="spinner" /> Signing in…</> : 'Sign In →'}
            </button>
          </form>

          <p className="auth-footer">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
