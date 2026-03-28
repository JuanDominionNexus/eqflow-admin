import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSignups } from '../api/admin';
import MetricCard from '../components/MetricCard';
import TrendChart from '../components/TrendChart';
import DateRangePicker from '../components/DateRangePicker';
import { format, parseISO } from 'date-fns';

function formatDate(d) {
  try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return '\u2014'; }
}

function formatDateTime(d) {
  try { return format(parseISO(d), 'MMM d h:mm a'); } catch { return '\u2014'; }
}

export default function SignupsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    getSignups(days).then(setData).finally(() => setLoading(false));
  }, [days]);

  if (loading && !data) return <div style={styles.loading}>Loading...</div>;

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Signups</h1>
        <DateRangePicker value={days} onChange={setDays} />
      </div>

      <div style={styles.cards}>
        <MetricCard label="Today" value={data?.today} color="var(--accent-teal)" />
        <MetricCard label="This Week" value={data?.week} color="var(--accent-blue)" change={data?.weekGrowth} />
        <MetricCard label="This Month" value={data?.month} color="var(--accent-amber)" change={data?.monthGrowth} />
        <MetricCard label="All Time" value={data?.total?.toLocaleString()} color="var(--text-primary)" />
      </div>

      <div style={styles.row}>
        <div style={{ ...styles.section, flex: 2 }}>
          <h2 style={styles.sectionTitle}>Signup Trend</h2>
          <TrendChart
            data={data?.trend}
            lines={[{ key: 'count', name: 'Signups', color: 'teal' }]}
            type="area"
          />
        </div>

        <div style={{ ...styles.section, flex: 1, minWidth: 200 }}>
          <h2 style={styles.sectionTitle}>By Method</h2>
          {data?.byMethod?.map((m) => (
            <div key={m.method} style={styles.methodRow}>
              <span style={styles.methodLabel}>
                {m.method === 'email' ? 'Email' : m.method === 'google' ? 'Google' : m.method === 'apple' ? 'Apple' : m.method}
              </span>
              <span style={styles.methodCount}>{parseInt(m.count)}</span>
            </div>
          ))}
          {(!data?.byMethod || data.byMethod.length === 0) && (
            <div style={styles.empty}>No data</div>
          )}
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Recent Signups</h2>
        <div style={styles.tableCard}>
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
              {data?.recent?.map((u) => (
                <tr
                  key={u.id}
                  style={styles.tr}
                  onClick={() => navigate(`/users/${u.id}`)}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(20, 184, 166, 0.04)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <td style={styles.td}>
                    <div style={styles.userName}>{u.name}</div>
                    <div style={styles.userEmail}>{u.email}</div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.methodBadge}>
                      {u.oauth_provider || 'email'}
                    </span>
                  </td>
                  <td style={styles.td}>{formatDateTime(u.created_at)}</td>
                  <td style={styles.td}>
                    {u.verified_at ? (
                      <span style={styles.verifiedBadge}>Yes</span>
                    ) : (
                      <span style={styles.unverifiedBadge}>No</span>
                    )}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{parseInt(u.check_in_count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
    marginBottom: 32,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 16,
    color: 'var(--text-primary)',
  },
  methodRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid var(--border)',
  },
  methodLabel: { fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'capitalize' },
  methodCount: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' },
  tableCard: { overflow: 'hidden' },
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
  verifiedBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    color: 'var(--accent-teal)',
  },
  unverifiedBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    color: '#f59e0b',
  },
  empty: { textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 },
};
