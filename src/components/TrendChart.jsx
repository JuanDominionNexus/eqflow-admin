import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
} from 'recharts';
import { format, parseISO } from 'date-fns';

const CHART_COLORS = {
  teal: '#14b8a6',
  blue: '#0ea5e9',
  amber: '#f59e0b',
  red: '#ef4444',
  green: '#22c55e',
  purple: '#a855f7',
};

function formatDate(val) {
  try {
    const d = typeof val === 'string' ? parseISO(val) : new Date(val);
    return format(d, 'MMM d');
  } catch {
    return val;
  }
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyles.container}>
      <div style={tooltipStyles.label}>{formatDate(label)}</div>
      {payload.map((p, i) => (
        <div key={i} style={tooltipStyles.row}>
          <span style={{ ...tooltipStyles.dot, backgroundColor: p.color }} />
          <span style={tooltipStyles.name}>{p.name}:</span>
          <span style={tooltipStyles.value}>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function TrendChart({
  data,
  lines,
  xKey = 'date',
  height = 300,
  type = 'line',
}) {
  if (!data?.length) {
    return <div style={styles.empty}>No data for this period</div>;
  }

  const Chart = type === 'area' ? AreaChart : LineChart;
  const LineCmp = type === 'area' ? Area : Line;

  // Compute Y domain explicitly — Recharts domain callbacks can be unreliable
  const dataKeys = lines.map(l => l.key);
  const maxVal = Math.max(0, ...data.flatMap(d => dataKeys.map(k => Number(d[k]) || 0)));
  const yMax = Math.ceil(maxVal * 1.15) || 1;

  return (
    <div style={styles.wrapper}>
      <ResponsiveContainer width="100%" height={height}>
        <Chart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey={xKey}
            tickFormatter={formatDate}
            stroke="var(--text-muted)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, yMax]}
            allowDecimals={false}
            stroke="var(--text-muted)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          {lines.map(({ key, name, color = 'teal' }) => (
            <LineCmp
              key={key}
              type="monotone"
              dataKey={key}
              name={name || key}
              stroke={CHART_COLORS[color] || color}
              fill={type === 'area' ? `${CHART_COLORS[color] || color}20` : undefined}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: CHART_COLORS[color] || color }}
            />
          ))}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

const styles = {
  wrapper: {
    width: '100%',
  },
  empty: {
    textAlign: 'center',
    padding: 40,
    color: 'var(--text-muted)',
    fontSize: 14,
  },
};

const tooltipStyles = {
  container: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
  },
  label: {
    color: 'var(--text-muted)',
    marginBottom: 6,
    fontSize: 11,
    fontWeight: 600,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  name: {
    color: 'var(--text-secondary)',
  },
  value: {
    color: 'var(--text-primary)',
    fontWeight: 600,
    marginLeft: 'auto',
  },
};
