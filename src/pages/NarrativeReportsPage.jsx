import { useState, useEffect } from 'react';
import { getNarrativeReports } from '../api/admin';
import MetricCard from '../components/MetricCard';
import TrendChart from '../components/TrendChart';
import DateRangePicker from '../components/DateRangePicker';
import { format, parseISO } from 'date-fns';

function fmt(d) {
  try { return format(parseISO(d), 'MMM d, yyyy h:mm a'); } catch { return '—'; }
}

export default function NarrativeReportsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getNarrativeReports(days)
      .then(setData)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading && !data) return <div style={styles.loading}>Loading...</div>;

  const k = data?.kpis || {};

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Narrative Reports</h1>
        <DateRangePicker value={days} onChange={setDays} />
      </div>

      {/* KPI cards */}
      <div style={styles.cards}>
        <MetricCard label="Total Reports" value={k.total_reports} color="var(--accent-teal)" />
        <MetricCard label="Users with Reports" value={k.users_with_reports} color="var(--accent-blue)" />
        <MetricCard label="Reports (period)" value={k.reports_in_period} color="var(--accent-amber)" />
        <MetricCard
          label="Encrypted"
          value={k.total_reports > 0 ? Math.round((k.encrypted_reports / k.total_reports) * 100) + '%' : '—'}
          subValue={`${k.encrypted_reports || 0} / ${k.total_reports || 0}`}
          color="var(--accent-teal)"
        />
      </div>

      {/* Generation trend */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Daily Report Generation</h2>
        <TrendChart
          data={data?.daily}
          lines={[{ key: 'reports', name: 'Reports Generated', color: 'teal' }]}
          type="area"
          height={200}
        />
      </div>

      {/* Type breakdown + user table row */}
      <div style={styles.row}>
        <div style={{ ...styles.section, flex: '0 0 320px' }}>
          <h2 style={styles.sectionTitle}>By Report Type</h2>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Type</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Count</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Avg Check-ins</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Avg Journals</th>
                </tr>
              </thead>
              <tbody>
                {(data?.byType || []).map((r) => (
                  <tr key={r.report_type}>
                    <td style={styles.td}>
                      <span style={r.report_type === 'full' ? styles.fullBadge : styles.incBadge}>
                        {r.report_type}
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{r.count}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{r.avg_check_ins}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{r.avg_journals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.byType?.length && <div style={styles.empty}>No data</div>}
          </div>
        </div>

        <div style={{ ...styles.section, flex: 1 }}>
          <h2 style={styles.sectionTitle}>Reports by User</h2>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>User</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Reports</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Check-ins Analyzed</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Journals Analyzed</th>
                  <th style={styles.th}>Last Generated</th>
                </tr>
              </thead>
              <tbody>
                {(data?.byUser || []).map((r) => (
                  <tr key={r.email}>
                    <td style={styles.td}>
                      <div style={styles.userName}>{r.name || '—'}</div>
                      <div style={styles.userEmail}>{r.email}</div>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{r.report_count}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{r.total_check_ins_analyzed}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{r.total_journals_analyzed}</td>
                    <td style={styles.td}>{fmt(r.last_generated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.byUser?.length && <div style={styles.empty}>No reports generated yet</div>}
          </div>
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
    marginBottom: 16,
  },
  row: {
    display: 'flex',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
    alignItems: 'flex-start',
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
    color: 'var(--text-primary)',
    marginBottom: 16,
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
  td: {
    padding: '12px 16px',
    fontSize: 13,
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
  fullBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    color: 'var(--accent-teal)',
  },
  incBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    color: 'var(--accent-blue)',
  },
  userName: { fontWeight: 500, color: 'var(--text-primary)' },
  userEmail: { fontSize: 11, color: 'var(--text-muted)', marginTop: 1 },
  empty: { textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 },
};
