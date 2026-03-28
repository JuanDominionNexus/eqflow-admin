import { useState, useEffect } from 'react';
import { getAIAnalytics } from '../api/admin';
import MetricCard from '../components/MetricCard';
import TrendChart from '../components/TrendChart';
import DateRangePicker from '../components/DateRangePicker';
import { format, parseISO } from 'date-fns';

function fmt(d) {
  try { return format(parseISO(d), 'MMM d h:mm a'); } catch { return '—'; }
}

function fmtTokens(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return n?.toLocaleString() ?? '—';
}

export default function AIAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAIAnalytics(days)
      .then(setData)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading && !data) return <div style={styles.loading}>Loading...</div>;

  const k = data?.kpis || {};

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>AI Analytics</h1>
        <DateRangePicker value={days} onChange={setDays} />
      </div>

      {/* KPI cards */}
      <div style={styles.cards}>
        <MetricCard label="Total Calls" value={k.totalCalls?.toLocaleString()} color="var(--accent-teal)" />
        <MetricCard label="Total Tokens" value={fmtTokens(k.totalTokens)} color="var(--accent-blue)" />
        <MetricCard label="Cache Hit Rate" value={k.cacheHitRate != null ? k.cacheHitRate + '%' : '—'} color="var(--accent-amber)" />
        <MetricCard label="Avg Latency" value={k.avgLatency != null ? k.avgLatency + 'ms' : '—'} color="var(--text-primary)" />
        <MetricCard label="Est. Cost" value={k.estimatedCost != null ? '$' + k.estimatedCost.toFixed(2) : '—'} color="var(--accent-teal)" />
      </div>

      {/* Charts row */}
      <div style={styles.row}>
        <div style={{ ...styles.section, flex: 1 }}>
          <h2 style={styles.sectionTitle}>Daily Calls</h2>
          <TrendChart
            data={data?.daily}
            lines={[{ key: 'calls', name: 'Calls', color: 'teal' }]}
            type="area"
          />
        </div>
        <div style={{ ...styles.section, flex: 1 }}>
          <h2 style={styles.sectionTitle}>Daily Token Usage</h2>
          <TrendChart
            data={data?.daily}
            lines={[
              { key: 'tokens', name: 'Tokens (input+output)', color: 'blue' },
              { key: 'cache_write', name: 'Cache Write', color: 'amber' },
              { key: 'cache_read', name: 'Cache Read', color: 'green' },
            ]}
            type="area"
          />
        </div>
      </div>

      {/* Cache hit rate over time */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Cache Hit Rate Over Time</h2>
        <TrendChart
          data={data?.daily}
          lines={[{ key: 'cache_hit_rate', name: 'Cache Hit Rate %', color: 'green' }]}
          type="line"
          height={200}
        />
      </div>

      {/* Breakdown tables */}
      <div style={styles.row}>
        <div style={{ ...styles.section, flex: 1 }}>
          <h2 style={styles.sectionTitle}>By Interaction Type</h2>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Type</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Calls</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Avg Latency</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Avg Tokens</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Cache Hit</th>
                </tr>
              </thead>
              <tbody>
                {(data?.byType || []).map((r) => (
                  <tr key={r.interaction_type}>
                    <td style={styles.td}><span style={styles.typeBadge}>{r.interaction_type}</span></td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{parseInt(r.calls).toLocaleString()}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{r.avg_latency}ms</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{parseInt(r.avg_tokens).toLocaleString()}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{r.cache_hit_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.byType?.length && <div style={styles.empty}>No data</div>}
          </div>
        </div>

        <div style={{ ...styles.section, flex: 1 }}>
          <h2 style={styles.sectionTitle}>By Model</h2>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Model</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Calls</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Avg Latency</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Total Tokens</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Cache Write</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Cache Read</th>
                </tr>
              </thead>
              <tbody>
                {(data?.byModel || []).map((r) => (
                  <tr key={r.model_used}>
                    <td style={styles.td}><span style={styles.modelBadge}>{r.model_used || 'unknown'}</span></td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{parseInt(r.calls).toLocaleString()}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{r.avg_latency}ms</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{fmtTokens(parseInt(r.total_tokens))}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{fmtTokens(parseInt(r.cache_write))}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{fmtTokens(parseInt(r.cache_read))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.byModel?.length && <div style={styles.empty}>No data</div>}
          </div>
        </div>
      </div>

      {/* Recent calls */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Recent Calls</h2>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Model</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Tokens</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Cache Write</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Cache Read</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Latency</th>
                <th style={styles.th}>Mismatch</th>
                <th style={styles.th}>Time</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent || []).map((r, i) => (
                <tr key={i}>
                  <td style={styles.td}><span style={styles.typeBadge}>{r.interaction_type}</span></td>
                  <td style={styles.td}><span style={styles.modelBadge}>{r.model_used || '—'}</span></td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{r.tokens_used?.toLocaleString() ?? '—'}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{r.cache_creation_input_tokens?.toLocaleString() ?? '0'}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{r.cache_read_input_tokens?.toLocaleString() ?? '0'}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{r.latency_ms != null ? r.latency_ms + 'ms' : '—'}</td>
                  <td style={styles.td}>
                    <span style={{
                      display: 'inline-block',
                      width: 8, height: 8, borderRadius: '50%',
                      backgroundColor: r.somatic_mismatch_flagged ? '#f59e0b' : '#6b7280',
                    }} />
                  </td>
                  <td style={styles.td}>{fmt(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.recent?.length && <div style={styles.empty}>No AI calls logged yet</div>}
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
  typeBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    color: 'var(--accent-teal)',
  },
  modelBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    color: 'var(--accent-blue)',
  },
  empty: { textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 },
};
