import { useState, useEffect } from 'react';
import { getSessions, getRecentSessions, getSessionScreens } from '../api/admin';
import TrendChart from '../components/TrendChart';
import DataTable from '../components/DataTable';
import DateRangePicker from '../components/DateRangePicker';
import { format, parseISO } from 'date-fns';

function fmtDate(d) {
  try { return format(parseISO(d), 'MMM d h:mm a'); } catch { return '—'; }
}

function fmtDuration(sec) {
  if (sec == null) return 'Active';
  return sec >= 60 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : `${sec}s`;
}

// Stable color for anon user hash
const USER_COLORS = ['#14b8a6', '#0ea5e9', '#a855f7', '#f59e0b', '#ef4444', '#22c55e', '#ec4899', '#6366f1'];
function hashColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return USER_COLORS[Math.abs(h) % USER_COLORS.length];
}

const screenColumns = [
  { key: 'screen_name', label: 'Screen' },
  { key: 'unique_users', label: 'Users', align: 'right', render: (v) => Number(v).toLocaleString() },
  { key: 'adoption_pct', label: 'Adoption', align: 'right', render: (v) => `${v}%` },
  { key: 'views_per_user', label: 'Views / User', align: 'right', render: (v) => Number(v).toFixed(1) },
  { key: 'views', label: 'Total Views', align: 'right', render: (v) => Number(v).toLocaleString() },
  {
    key: 'avg_duration',
    label: 'Avg Duration',
    align: 'right',
    render: (v) => fmtDuration(Number(v)),
  },
];

export default function SessionsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentData, setRecentData] = useState(null);
  const [recentLoading, setRecentLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState(null);
  const [expandedSession, setExpandedSession] = useState(null);
  const [screenCache, setScreenCache] = useState({});
  const [screensLoading, setScreensLoading] = useState(null);

  useEffect(() => {
    setLoading(true);
    getSessions(days).then(setData).finally(() => setLoading(false));
    setRecentLoading(true);
    getRecentSessions(days).then(setRecentData).finally(() => setRecentLoading(false));
  }, [days]);

  const toggleUser = (anonId) => {
    setExpandedUser(prev => prev === anonId ? null : anonId);
    setExpandedSession(null);
  };

  const toggleSession = async (sessionId) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      return;
    }
    setExpandedSession(sessionId);
    if (!screenCache[sessionId]) {
      setScreensLoading(sessionId);
      try {
        const screens = await getSessionScreens(sessionId);
        setScreenCache(prev => ({ ...prev, [sessionId]: screens }));
      } catch {
        setScreenCache(prev => ({ ...prev, [sessionId]: [] }));
      } finally {
        setScreensLoading(null);
      }
    }
  };

  if (loading && !data) return <div style={styles.loading}>Loading...</div>;

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Sessions</h1>
        <DateRangePicker value={days} onChange={setDays} />
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Avg Session Duration</h2>
        <TrendChart
          data={data?.durationTrend}
          lines={[{ key: 'avg_duration', name: 'Avg Duration (s)', color: 'blue' }]}
          type="area"
        />
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Feature Usage{data?.activeUsers ? ` (${data.activeUsers} active users)` : ''}</h2>
        <DataTable columns={screenColumns} data={data?.screenUsage} />
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Recent Sessions by User</h2>
        {recentLoading && !recentData ? (
          <div style={styles.empty}>Loading...</div>
        ) : recentData?.length > 0 ? (
          <div style={styles.userList}>
            {recentData.map(({ anon_id, sessions }) => {
              const color = hashColor(anon_id);
              const isUserExpanded = expandedUser === anon_id;
              const totalDur = sessions.reduce((s, x) => s + (x.duration_seconds || 0), 0);
              return (
                <div key={anon_id} style={styles.userGroup}>
                  <div
                    style={{ ...styles.userHeader, backgroundColor: isUserExpanded ? 'var(--bg-primary)' : 'transparent' }}
                    onClick={() => toggleUser(anon_id)}
                  >
                    <div style={styles.userLeft}>
                      <span style={{ ...styles.expandIcon, transform: isUserExpanded ? 'rotate(90deg)' : 'none' }}>&#9654;</span>
                      <span style={{ ...styles.anonBadge, backgroundColor: `${color}20`, color }}>{anon_id.slice(0, 8)}</span>
                      <span style={styles.userSummary}>
                        {sessions.length} session{sessions.length !== 1 ? 's' : ''} &middot; {fmtDuration(totalDur)} total
                      </span>
                    </div>
                    <span style={styles.userDate}>{fmtDate(sessions[0].started_at)}</span>
                  </div>
                  {isUserExpanded && (
                    <div style={styles.sessionList}>
                      {sessions.map((s) => {
                        const isSessionExpanded = expandedSession === s.session_id;
                        const screens = screenCache[s.session_id];
                        const isLoading = screensLoading === s.session_id;
                        return (
                          <div key={s.session_id}>
                            <div
                              style={{ ...styles.sessionRow, backgroundColor: isSessionExpanded ? 'var(--bg-primary)' : 'transparent' }}
                              onClick={() => toggleSession(s.session_id)}
                            >
                              <div style={styles.sessionLeft}>
                                <span style={{ ...styles.expandIcon, transform: isSessionExpanded ? 'rotate(90deg)' : 'none' }}>&#9654;</span>
                                <span style={styles.sessionMeta}>
                                  {fmtDuration(s.duration_seconds)} &middot; {s.screens_visited} screens &middot; {s.platform === 'ios' ? 'iOS App' : s.platform === 'android' ? 'Android App' : s.browser && s.browser !== 'Unknown' ? `${s.browser} · ${s.device}` : 'Web'}
                                </span>
                              </div>
                              <span style={styles.sessionDate}>{fmtDate(s.started_at)}</span>
                            </div>
                            {isSessionExpanded && (
                              <div style={styles.screenTimeline}>
                                {isLoading ? (
                                  <div style={styles.screenLoading}>Loading screens...</div>
                                ) : screens?.length > 0 ? (
                                  <ScreenTimeline screens={screens} />
                                ) : (
                                  <div style={styles.screenLoading}>No screen data</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={styles.empty}>No session data for this period</div>
        )}
      </div>
    </div>
  );
}

function ScreenTimeline({ screens }) {
  const maxDur = Math.max(...screens.map(x => x.duration_seconds || 0));
  return screens.map((sc, i) => {
    const isLongest = maxDur > 0 && sc.duration_seconds === maxDur;
    return (
      <div key={i} style={styles.screenStep}>
        <div style={styles.screenLineCol}>
          <div style={{
            width: isLongest ? 10 : 8,
            height: isLongest ? 10 : 8,
            borderRadius: '50%',
            backgroundColor: isLongest ? 'var(--accent-teal)' : 'var(--text-muted)',
            flexShrink: 0,
            marginTop: 4,
          }} />
          {i < screens.length - 1 && <div style={styles.screenLine} />}
        </div>
        <div style={styles.screenInfo}>
          <span style={{
            fontSize: 13,
            fontWeight: isLongest ? 600 : 500,
            color: isLongest ? 'var(--accent-teal)' : 'var(--text-primary)',
            backgroundColor: isLongest ? 'rgba(20, 184, 166, 0.1)' : 'var(--bg-primary)',
            padding: '2px 8px',
            borderRadius: 4,
          }}>{sc.screen_name}</span>
          <span style={styles.screenDur}>{fmtDuration(sc.duration_seconds)}</span>
          {sc.entered_at && <span style={styles.screenTime}>{fmtDate(sc.entered_at)}</span>}
        </div>
      </div>
    );
  });
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
  empty: { textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 },

  // User groups
  userList: { display: 'flex', flexDirection: 'column', gap: 0 },
  userGroup: { borderBottom: '1px solid var(--border)' },
  userHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    cursor: 'pointer',
  },
  userLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  anonBadge: {
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'monospace',
    padding: '2px 8px',
    borderRadius: 4,
  },
  userSummary: { fontSize: 13, color: 'var(--text-secondary)' },
  userDate: { fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' },

  // Session rows
  sessionList: { paddingLeft: 24 },
  sessionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    cursor: 'pointer',
    borderTop: '1px solid var(--border)',
  },
  sessionLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  sessionMeta: { fontSize: 12, color: 'var(--text-muted)' },
  sessionDate: { fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' },

  // Shared
  expandIcon: {
    fontSize: 9,
    color: 'var(--text-muted)',
    transition: 'transform 0.15s ease',
    display: 'inline-block',
    width: 14,
    flexShrink: 0,
  },

  // Screen timeline
  screenTimeline: {
    padding: '8px 0 8px 48px',
  },
  screenLoading: {
    fontSize: 12,
    color: 'var(--text-muted)',
    padding: '8px 0',
  },
  screenStep: {
    display: 'flex',
    gap: 10,
    minHeight: 36,
  },
  screenLineCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: 12,
    flexShrink: 0,
  },
  screenLine: {
    width: 2,
    flex: 1,
    backgroundColor: 'var(--border)',
    marginTop: 2,
    marginBottom: 2,
  },
  screenInfo: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    paddingBottom: 8,
    flexWrap: 'wrap',
  },
  screenDur: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  screenTime: {
    fontSize: 11,
    color: 'var(--text-muted)',
  },
};
