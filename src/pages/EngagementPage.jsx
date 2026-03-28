import { useState, useEffect } from 'react';
import { getEngagement } from '../api/admin';
import TrendChart from '../components/TrendChart';
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

export default function EngagementPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getEngagement(days).then(setData).finally(() => setLoading(false));
  }, [days]);

  if (loading && !data) return <div style={styles.loading}>Loading...</div>;

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Engagement</h1>
        <DateRangePicker value={days} onChange={setDays} />
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Daily Activity</h2>
        <TrendChart
          data={data?.daily}
          lines={[
            { key: 'check_ins', name: 'Check-ins', color: 'teal' },
            { key: 'journals', name: 'Journals', color: 'blue' },
            { key: 'meditations', name: 'Meditations', color: 'purple' },
          ]}
        />
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Feature Adoption</h2>
        {data?.featureAdoption?.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.featureAdoption} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="feature" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} allowDecimals={false} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 13,
                }}
                formatter={(val) => [`${val}%`, 'Adoption']}
              />
              <Bar dataKey="pct" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={styles.empty}>No adoption data</div>
        )}
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
    color: 'var(--text-primary)',
  },
  empty: { textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 },
};
