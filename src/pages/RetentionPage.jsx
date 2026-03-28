import { useState, useEffect } from 'react';
import { getRetention } from '../api/admin';
import { format, parseISO } from 'date-fns';

function pctColor(pct) {
  if (pct >= 40) return 'rgba(20, 184, 166, 0.25)';
  if (pct >= 20) return 'rgba(14, 165, 233, 0.2)';
  if (pct >= 10) return 'rgba(245, 158, 11, 0.15)';
  return 'transparent';
}

export default function RetentionPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRetention().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={styles.loading}>Loading...</div>;

  return (
    <div>
      <h1 style={styles.title}>Retention</h1>

      {data?.averages && (
        <div style={styles.averages}>
          <div style={styles.avgCard}>
            <span style={styles.avgLabel}>Avg D1</span>
            <span style={styles.avgValue}>{data.averages.d1_pct}%</span>
          </div>
          <div style={styles.avgCard}>
            <span style={styles.avgLabel}>Avg D7</span>
            <span style={styles.avgValue}>{data.averages.d7_pct}%</span>
          </div>
          <div style={styles.avgCard}>
            <span style={styles.avgLabel}>Avg D30</span>
            <span style={styles.avgValue}>{data.averages.d30_pct}%</span>
          </div>
        </div>
      )}

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Cohort Retention</h2>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Cohort Week</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Size</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>D1</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>D7</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>D30</th>
              </tr>
            </thead>
            <tbody>
              {data?.cohorts?.map((row) => (
                <tr key={row.cohort_week}>
                  <td style={styles.td}>
                    {format(parseISO(row.cohort_week), 'MMM d, yyyy')}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{row.cohort_size}</td>
                  <td style={{ ...styles.td, textAlign: 'right', backgroundColor: pctColor(row.d1_pct) }}>
                    {row.d1_pct}%
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', backgroundColor: pctColor(row.d7_pct) }}>
                    {row.d7_pct}%
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', backgroundColor: pctColor(row.d30_pct) }}>
                    {row.d30_pct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!data?.cohorts || data.cohorts.length === 0) && (
            <div style={styles.empty}>No cohort data yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  loading: { padding: 40, textAlign: 'center', color: 'var(--text-muted)' },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 24 },
  averages: {
    display: 'flex',
    gap: 16,
    marginBottom: 24,
  },
  avgCard: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  avgLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  avgValue: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--accent-teal)',
  },
  section: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 16,
  },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '10px 16px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border)',
    textAlign: 'left',
  },
  td: {
    padding: '12px 16px',
    fontSize: 13,
    borderBottom: '1px solid var(--border)',
  },
  empty: { textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 },
};
