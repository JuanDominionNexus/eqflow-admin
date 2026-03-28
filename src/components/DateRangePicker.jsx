const OPTIONS = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
];

export default function DateRangePicker({ value, onChange }) {
  return (
    <div style={styles.container}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            ...styles.btn,
            ...(value === opt.value ? styles.btnActive : {}),
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    gap: 4,
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 8,
    padding: 3,
    border: '1px solid var(--border)',
  },
  btn: {
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 500,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    backgroundColor: 'transparent',
    transition: 'all 0.15s',
  },
  btnActive: {
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-card)',
  },
};
