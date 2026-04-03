import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ADMIN_NAV = [
  { path: '/', label: 'Overview', icon: '◎' },
  { path: '/signups', label: 'Signups', icon: '↑' },
  { path: '/users', label: 'Users', icon: '▤' },
  { path: '/engagement', label: 'Engagement', icon: '↗' },
  { path: '/retention', label: 'Retention', icon: '⟳' },
  { path: '/sessions', label: 'Sessions', icon: '◉' },
  { path: '/drop-offs', label: 'Drop-offs', icon: '↘' },
  { path: '/ai', label: 'AI Analytics', icon: '⚡' },
  { path: '/narrative-reports', label: 'Reports', icon: '◆' },
  { path: '/therapists', label: 'Therapists', icon: '✚' },
  { path: '/broadcast', label: 'Broadcast', icon: '✉' },
  { path: '/testing', label: 'Testing', icon: '▶' },
  { path: '/dna', label: 'DNA Scans', icon: '◈' },
  { path: '/products', label: 'Products', icon: '▣' },
];

function getTherapistNav(status) {
  if (status === 'verified') return [{ path: '/portal', label: 'My Clients', icon: '♡' }];
  if (status === 'pending') return [{ path: '/portal', label: 'Registration', icon: '⏳' }];
  return [{ path: '/portal', label: 'Become a Therapist', icon: '✚' }];
}

function getBadgeLabel(role) {
  if (role.isAdmin && role.isTherapist) return 'Admin + Therapist';
  if (role.isAdmin) return 'Admin';
  if (role.therapistProfileStatus === 'verified') return 'Therapist';
  if (role.therapistProfileStatus === 'pending') return 'Pending';
  return 'User';
}

export default function Layout({ children }) {
  const { logout, role, portalMode } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const navItems = portalMode === 'admin'
    ? [...ADMIN_NAV, ...(role.isTherapist ? [{ path: '/portal', label: 'My Clients', icon: '♡' }] : [])]
    : getTherapistNav(role.therapistProfileStatus);

  const badgeLabel = portalMode === 'admin' ? getBadgeLabel(role) : getBadgeLabel({ ...role, isAdmin: false });

  // Find current page label for mobile header
  const currentPage = navItems.find(({ path }) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  );

  return (
    <div style={styles.container} className="layout-container">
      {/* Mobile header */}
      <div className="mobile-header" style={styles.mobileHeader}>
        <button onClick={() => setSidebarOpen(true)} style={styles.hamburger}>
          ☰
        </button>
        <span style={styles.mobileTitle}>{currentPage?.label || 'EQ Flow'}</span>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          style={styles.overlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        style={styles.sidebar}
        className={`layout-sidebar${sidebarOpen ? ' open' : ''}`}
      >
        <div style={styles.logo}>
          <span style={styles.logoText}>EQ Flow</span>
          <span style={styles.logoBadge}>{badgeLabel}</span>
        </div>
        <nav style={styles.nav}>
          {navItems.map(({ path, label, icon }) => {
            const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
            return (
              <NavLink
                key={path}
                to={path}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                }}
              >
                <span style={styles.navIcon}>{icon}</span>
                {label}
              </NavLink>
            );
          })}
        </nav>
        <button onClick={logout} style={styles.logoutBtn}>
          Sign out
        </button>
      </aside>
      <main style={styles.main} className="layout-main">{children}</main>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
  },
  sidebar: {
    width: 240,
    backgroundColor: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 0',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflowY: 'auto',
  },
  logo: {
    padding: '0 24px',
    marginBottom: 32,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--accent-teal)',
  },
  logoBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--bg-primary)',
    backgroundColor: 'var(--accent-teal)',
    padding: '2px 8px',
    borderRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flex: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 24px',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.15s',
    borderLeft: '3px solid transparent',
  },
  navItemActive: {
    color: 'var(--accent-teal)',
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderLeftColor: 'var(--accent-teal)',
  },
  navIcon: {
    fontSize: 16,
    width: 20,
    textAlign: 'center',
  },
  logoutBtn: {
    margin: '0 24px',
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  },
  main: {
    flex: 1,
    padding: 32,
    overflowY: 'auto',
    maxWidth: 1200,
  },
  // Mobile-only (hidden on desktop via CSS)
  mobileHeader: {
    display: 'none',
  },
  hamburger: {
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: 22,
    cursor: 'pointer',
    padding: '4px 8px',
    marginRight: 12,
  },
  mobileTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  overlay: {
    display: 'none',
  },
};
