import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOverview, getSignups, getFunnelEvents } from '../api/admin';
import MetricCard from '../components/MetricCard';
import TrendChart from '../components/TrendChart';
import DateRangePicker from '../components/DateRangePicker';
import { format, parseISO } from 'date-fns';

function formatDateTime(d) {
  try { return format(parseISO(d), 'MMM d h:mm a'); } catch { return '—'; }
}

export default function OverviewPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [signups, setSignups] = useState(null);
  const [funnelEvents, setFunnelEvents] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getOverview(days),
      getSignups(days),
      getFunnelEvents(days).catch(() => null),
    ])
      .then(([o, s, f]) => { setData(o); setSignups(s); setFunnelEvents(f); })
      .finally(() => setLoading(false));
  }, [days]);

  if (loading && !data) return <div style={styles.loading}>Loading...</div>;

  const funnel = data?.funnel;
  const funnelSignups = parseInt(funnel?.signups || 0);
  const funnelCheckIn = parseInt(funnel?.first_check_in || 0);
  const funnelRetained = parseInt(funnel?.retained_7d || 0);
  const checkInPct = funnelSignups > 0 ? ((funnelCheckIn / funnelSignups) * 100).toFixed(1) : 0;
  const retainedPct = funnelSignups > 0 ? ((funnelRetained / funnelSignups) * 100).toFixed(1) : 0;

  const recentSignups = signups?.recent?.slice(0, 5) || [];
  const dnaUploads = parseInt(funnelEvents?.dna_upload || 0);
  const dnaConfirmed = parseInt(funnelEvents?.dna_confirmed || 0);

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Overview</h1>
        <DateRangePicker value={days} onChange={setDays} />
      </div>

      {/* Key metrics */}
      <div style={styles.cards}>
        <MetricCard label="Total Users" value={data?.totalUsers?.toLocaleString()} color="var(--text-primary)" />
        <MetricCard label="Signups This Week" value={data?.signupsThisWeek} color="var(--accent-teal)" change={data?.signupWoW} />
        <MetricCard label="DAU" value={data?.dau?.toLocaleString()} subValue={`Yesterday: ${data?.dauYesterday ?? '—'}`} color="var(--accent-blue)" />
        <MetricCard label="DNA Scans" value={dnaUploads} subValue={`${dnaConfirmed} confirmed`} color="var(--accent-purple)" />
      </div>

      {/* Charts */}
      <div style={styles.row}>
        <div style={{ ...styles.section, flex: 1 }}>
          <h2 style={styles.sectionTitle}>Signups</h2>
          <TrendChart
            data={data?.signupTrend}
            lines={[{ key: 'count', name: 'Signups', color: 'teal' }]}
            type="area"
          />
        </div>
        <div style={{ ...styles.section, flex: 1 }}>
          <h2 style={styles.sectionTitle}>Daily Active Users</h2>
          <TrendChart
            data={data?.dauTrend}
            lines={[{ key: 'dau', name: 'DAU', color: 'blue' }]}
            type="area"
          />
        </div>
      </div>

      {/* Conversion funnel */}
      {funnel && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Conversion Funnel</h2>
          <div style={styles.funnel}>
            <div style={styles.funnelStep}>
              <div style={styles.funnelCount}>{funnelSignups}</div>
              <div style={styles.funnelLabel}>Signups</div>
              <div style={styles.funnelPct}>100%</div>
            </div>
            <div style={styles.funnelArrow}>→</div>
            <div style={styles.funnelStep}>
              <div style={styles.funnelCount}>{funnelCheckIn}</div>
              <div style={styles.funnelLabel}>First Check-in</div>
              <div style={styles.funnelPct}>{checkInPct}%</div>
            </div>
            <div style={styles.funnelArrow}>→</div>
            <div style={styles.funnelStep}>
              <div style={styles.funnelCount}>{funnelRetained}</div>
              <div style={styles.funnelLabel}>Retained 7d</div>
              <div style={styles.funnelPct}>{retainedPct}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent signups */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Recent Signups</h2>
          <button style={styles.viewAllBtn} onClick={() => navigate('/signups')}>
            View all →
          </button>
        </div>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Method</th>
                <th style={styles.th}>Signed Up</th>
                <th style={styles.th}>Verified</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Check-ins</th>
              </tr>
            </thead>
            <tbody>
              {recentSignups.map((u) => (
                <tr
                  key={u.id}
                  style={styles.tr}
                  onClick={() => navigate(`/users/${u.id}`)}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <td style={styles.td}>
                    <div style={styles.userName}>{u.name}</div>
                    <div style={styles.userEmail}>{u.email}</div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.methodBadge}>{u.oauth_provider || 'email'}</span>
                  </td>
                  <td style={styles.td}>{formatDateTime(u.created_at)}</td>
                  <td style={styles.td}>
                    <span style={{
                      display: 'inline-block',
                      width: 8, height: 8, borderRadius: '50%',
                      backgroundColor: u.verified_at ? '#14b8a6' : '#6b7280',
                    }} />
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{parseInt(u.check_in_count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentSignups.length === 0 && (
            <div style={styles.empty}>No signups yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  loading: { padding: 40, textAlign: 'center', color: 'var(--text-muted)' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: 700 },
  cards: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  row: {
    display: 'flex',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  section: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  viewAllBtn: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--accent-teal)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  funnel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    padding: '16px 0',
  },
  funnelStep: {
    textAlign: 'center',
    flex: '1 1 0',
    maxWidth: 200,
  },
  funnelCount: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  funnelLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginTop: 4,
  },
  funnelPct: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--accent-teal)',
    marginTop: 2,
  },
  funnelArrow: {
    fontSize: 24,
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '12px 16px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border)',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  },
  tr: { cursor: 'pointer', transition: 'background-color 0.1s' },
  td: {
    padding: '12px 16px',
    fontSize: 13,
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
  userName: { fontWeight: 600, color: 'var(--text-primary)' },
  userEmail: { fontSize: 11, color: 'var(--text-muted)', marginTop: 2 },
  methodBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    color: 'var(--accent-teal)',
    textTransform: 'capitalize',
  },
  empty: { textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 },
};
