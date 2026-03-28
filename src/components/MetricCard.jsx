export default function MetricCard({ label, value, subValue, color = 'var(--accent-teal)', change }) {
  return (
    <div style={styles.card}>
      <div style={styles.label}>{label}</div>
      <div style={styles.valueRow}>
        <div style={{ ...styles.value, color }}>{value ?? '—'}</div>
        {change !== undefined && change !== null && change !== 0 && (
          <span style={{
            ...styles.changeBadge,
            backgroundColor: change > 0 ? 'rgba(20, 184, 166, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: change > 0 ? '#14b8a6' : '#ef4444',
          }}>
            {change > 0 ? '+' : ''}{change}%{change > 0 ? ' ↑' : ' ↓'}
          </span>
        )}
      </div>
      {subValue && <div style={styles.sub}>{subValue}</div>}
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '20px 24px',
    flex: '1 1 200px',
    minWidth: 180,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 8,
  },
  valueRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  value: {
    fontSize: 32,
    fontWeight: 700,
    lineHeight: 1.1,
  },
  changeBadge: {
    fontSize: 12,
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: 12,
    whiteSpace: 'nowrap',
  },
  sub: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    marginTop: 4,
  },
};
