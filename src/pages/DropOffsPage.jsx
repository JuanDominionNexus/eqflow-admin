import { useState, useEffect } from 'react';
import { getDropOffs } from '../api/admin';
import DataTable from '../components/DataTable';
import DateRangePicker from '../components/DateRangePicker';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const columns = [
  { key: 'screen_name', label: 'Feature' },
  { key: 'unique_users', label: 'Users Reached', align: 'right', render: (v) => Number(v).toLocaleString() },
  { key: 'drop_offs', label: 'Never Reached', align: 'right', render: (v) => Number(v).toLocaleString() },
];

export default function DropOffsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getDropOffs(days).then(setData).finally(() => setLoading(false));
  }, [days]);

  if (loading && !data) return <div style={styles.loading}>Loading...</div>;

  const funnel = data?.funnel;
  const funnelData = funnel
    ? [
        { stage: 'Signups', count: parseInt(funnel.signups) || 0 },
        { stage: '1st Check-in', count: parseInt(funnel.first_check_in) || 0 },
        { stage: 'Retained 7d', count: parseInt(funnel.retained_7d) || 0 },
      ]
    : [];
  const funnelMax = Math.ceil(Math.max(0, ...funnelData.map(d => d.count)) * 1.15) || 1;

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Drop-offs</h1>
        <DateRangePicker value={days} onChange={setDays} />
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Conversion Funnel</h2>
        {funnelData.length > 0 ? (
          <>
            <div style={styles.funnelCards}>
              {funnelData.map((item, i) => {
                const pct = i > 0 && funnelData[0].count > 0
                  ? ((item.count / funnelData[0].count) * 100).toFixed(1)
                  : '100';
                return (
                  <div key={item.stage} style={styles.funnelCard}>
                    <div style={styles.funnelStage}>{item.stage}</div>
                    <div style={styles.funnelCount}>{item.count.toLocaleString()}</div>
                    <div style={styles.funnelPct}>{pct}%</div>
                  </div>
                );
              })}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={funnelData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="stage" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={[0, funnelMax]} allowDecimals={false} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <div style={styles.empty}>No funnel data</div>
        )}
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Feature Adoption</h2>
        <DataTable columns={columns} data={data?.dropOffs} />
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
  },
  funnelCards: {
    display: 'flex',
    gap: 16,
    marginBottom: 24,
  },
  funnelCard: {
    flex: 1,
    textAlign: 'center',
    padding: '12px 16px',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: 8,
    border: '1px solid var(--border)',
  },
  funnelStage: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 4,
  },
  funnelCount: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  funnelPct: {
    fontSize: 13,
    color: 'var(--accent-teal)',
    fontWeight: 600,
  },
  empty: { textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 },
};
