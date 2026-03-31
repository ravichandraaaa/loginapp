import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './DashboardPage.css';

const ServiceCard = ({ name, port, status }) => (
  <div className={`svc-card ${status}`}>
    <div className="svc-indicator" />
    <div>
      <div className="svc-name">{name}</div>
      <div className="svc-port">localhost:{port}</div>
    </div>
    <span className="svc-badge">{status === 'ok' ? 'Online' : status === 'checking' ? '…' : 'Offline'}</span>
  </div>
);

const StatCard = ({ icon, label, value }) => (
  <div className="stat-card">
    <div className="stat-icon">{icon}</div>
    <div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
);

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate          = useNavigate();

  const [profile,   setProfile]   = useState(null);
  const [services,  setServices]  = useState({
    gateway:  'checking',
    auth:     'checking',
    users:    'checking',
    notify:   'checking',
  });
  const [loggingOut, setLoggingOut] = useState(false);

  // Load profile
  useEffect(() => {
    if (!user?.id) return;
    api.get(`/api/users/${user.id}`)
       .then(r => setProfile(r.data.user))
       .catch(() => {});
  }, [user]);

  // Health checks
  useEffect(() => {
    const check = async (key, url) => {
      try {
        await api.get(url);
        setServices(s => ({ ...s, [key]: 'ok' }));
      } catch {
        setServices(s => ({ ...s, [key]: 'error' }));
      }
    };
    check('gateway', '/api/health');
    check('auth',    '/api/auth/health');
    check('users',   '/api/users/health');
    check('notify',  '/api/notifications/health');
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/login');
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString() : 'Never';

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32">
            <rect width="40" height="40" rx="12" fill="#7c6af7"/>
            <path d="M12 20C12 15.6 15.6 12 20 12s8 3.6 8 8-3.6 8-8 8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="20" cy="20" r="3" fill="#fff"/>
          </svg>
          <span>LoginApp</span>
        </div>

        <nav className="sidebar-nav">
          <a href="#" className="nav-item active">
            <span>⊞</span> Dashboard
          </a>
          <a href="#" className="nav-item">
            <span>◎</span> Profile
          </a>
          <a href="#" className="nav-item">
            <span>⚙</span> Settings
          </a>
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-email">{user?.email}</div>
          </div>
          <button
            className="logout-btn"
            onClick={handleLogout}
            disabled={loggingOut}
            title="Logout"
          >
            {loggingOut ? '…' : '→'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <div className="page-header fade-up">
          <div>
            <h1>Dashboard</h1>
            <p className="page-subtitle">Welcome back, <strong>{user?.name}</strong> 👋</p>
          </div>
          <div className="header-badge">
            <span className="online-dot" />
            Session active
          </div>
        </div>

        {/* Stats row */}
        <div className="stats-grid fade-up">
          <StatCard icon="🔐" label="Role"        value={profile?.role ?? '—'} />
          <StatCard icon="📅" label="Joined"       value={profile ? new Date(profile.created_at).toLocaleDateString() : '—'} />
          <StatCard icon="🕐" label="Last Login"   value={profile ? formatDate(profile.last_login) : '—'} />
          <StatCard icon="✅" label="Status"       value="Active" />
        </div>

        {/* Two-column layout */}
        <div className="two-col fade-up">
          {/* Profile card */}
          <div className="card">
            <h3 className="section-title">Your Profile</h3>
            <div className="profile-block">
              <div className="profile-avatar">
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="profile-info">
                <div className="profile-name">{user?.name}</div>
                <div className="profile-email">{user?.email}</div>
                <span className="profile-role">{profile?.role ?? 'user'}</span>
              </div>
            </div>
            <div className="profile-meta">
              <div className="meta-row">
                <span>User ID</span>
                <code>#{user?.id}</code>
              </div>
              <div className="meta-row">
                <span>Account</span>
                <span style={{ color: 'var(--success)' }}>Active</span>
              </div>
              <div className="meta-row">
                <span>Last Login</span>
                <span>{formatDate(profile?.last_login)}</span>
              </div>
            </div>
          </div>

          {/* Services health */}
          <div className="card">
            <h3 className="section-title">Microservices Health</h3>
            <div className="services-list">
              <ServiceCard name="API Gateway"           port="4000" status={services.gateway} />
              <ServiceCard name="Auth Service"          port="4001" status={services.auth} />
              <ServiceCard name="User Service"          port="4002" status={services.users} />
              <ServiceCard name="Notification Service"  port="4003" status={services.notify} />
            </div>
            <div className="arch-note">
              <div className="arch-flow">
                React <span>→</span> Gateway <span>→</span> Services <span>→</span> DB / Redis
              </div>
            </div>
          </div>
        </div>

        {/* Architecture diagram note */}
        <div className="arch-card card fade-up">
          <h3 className="section-title">Architecture Flow</h3>
          <div className="arch-steps">
            {[
              { icon: '🌐', label: 'Frontend', sub: 'React + Vite :3000' },
              { icon: '🔀', label: 'API Gateway', sub: 'Express :4000' },
              { icon: '🔐', label: 'Auth Service', sub: 'JWT + Redis :4001' },
              { icon: '👤', label: 'User Service', sub: 'PostgreSQL :4002' },
              { icon: '📧', label: 'Notify Service', sub: 'Nodemailer :4003' },
            ].map((step, i, arr) => (
              <div key={step.label} className="arch-step-wrap">
                <div className="arch-step">
                  <div className="arch-step-icon">{step.icon}</div>
                  <div className="arch-step-label">{step.label}</div>
                  <div className="arch-step-sub">{step.sub}</div>
                </div>
                {i < arr.length - 1 && <div className="arch-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
