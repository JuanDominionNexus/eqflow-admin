import { useState } from 'react';
import { sendTestPush, triggerWeeklyReports } from '../api/admin';

export default function TestingPage() {
  const [pushTitle, setPushTitle] = useState('Your weekly report is ready');
  const [pushBody, setPushBody] = useState('A new look at your emotional patterns is waiting.');
  const [pushType, setPushType] = useState('narrative_report');
  const [pushSection, setPushSection] = useState('insights');
  const [pushIndex, setPushIndex] = useState(2);
  const [pushStatus, setPushStatus] = useState(null);
  const [pushSending, setPushSending] = useState(false);

  const [cronStatus, setCronStatus] = useState(null);
  const [cronRunning, setCronRunning] = useState(false);

  const handleSendPush = async () => {
    setPushSending(true);
    setPushStatus(null);
    try {
      await sendTestPush({
        title: pushTitle,
        body: pushBody,
        data: { type: pushType, targetSection: pushSection, targetIndex: pushIndex },
      });
      setPushStatus({ type: 'success', message: 'Push notification sent to your devices' });
    } catch (err) {
      setPushStatus({ type: 'error', message: err.response?.data?.error || 'Failed to send' });
    } finally {
      setPushSending(false);
    }
  };

  const handleTriggerCron = async () => {
    if (!window.confirm('Trigger weekly report generation for all eligible users?')) return;
    setCronRunning(true);
    setCronStatus(null);
    try {
      const res = await triggerWeeklyReports();
      setCronStatus({ type: 'success', message: res.status === 'started' ? 'Report generation started in background' : JSON.stringify(res) });
    } catch (err) {
      setCronStatus({ type: 'error', message: err.response?.data?.error || 'Failed to trigger' });
    } finally {
      setCronRunning(false);
    }
  };

  const presets = [
    { label: 'Weekly Report', title: 'Your weekly report is ready', body: 'A new look at your emotional patterns is waiting.', type: 'narrative_report', section: 'insights', index: 2 },
    { label: 'Streak at Risk', title: 'Keep your streak alive', body: "You haven't checked in today yet.", type: 'streak', section: 'main', index: 0 },
    { label: 'Pattern Found', title: 'New pattern detected', body: "Something interesting emerged in your check-ins.", type: 'pattern', section: 'insights', index: 2 },
    { label: 'Map Ready', title: 'Your emotional map is ready', body: 'See how your week looked from above.', type: 'map', section: 'insights', index: 0 },
    { label: 'Circle Energy', title: 'Energy incoming', body: 'Someone is sending you energy.', type: 'circle_energy', section: 'circles', index: 0 },
    { label: 'Meditation Invite', title: 'Meditation invite', body: 'Someone is inviting you to meditate.', type: 'circle_invite_meditate', section: 'circles', index: 0 },
  ];

  return (
    <div>
      <h1 style={styles.title}>Testing</h1>
      <p style={styles.subtitle}>Test push notifications and trigger background jobs.</p>

      {/* Push Notifications */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Push Notifications</h2>
        <p style={styles.sectionDesc}>Send a test push notification to yourself (all your active devices).</p>

        <div style={styles.presets}>
          {presets.map(p => (
            <button
              key={p.label}
              style={{
                ...styles.presetBtn,
                ...(pushType === p.type && pushTitle === p.title ? styles.presetBtnActive : {}),
              }}
              onClick={() => {
                setPushTitle(p.title);
                setPushBody(p.body);
                setPushType(p.type);
                setPushSection(p.section);
                setPushIndex(p.index);
                setPushStatus(null);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div style={styles.card}>
          <div style={styles.fieldRow}>
            <div style={styles.fieldFull}>
              <label style={styles.label}>Title</label>
              <input
                type="text"
                value={pushTitle}
                onChange={e => setPushTitle(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.fieldRow}>
            <div style={styles.fieldFull}>
              <label style={styles.label}>Body</label>
              <input
                type="text"
                value={pushBody}
                onChange={e => setPushBody(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.fieldRow}>
            <div style={styles.fieldThird}>
              <label style={styles.label}>Type</label>
              <input
                type="text"
                value={pushType}
                onChange={e => setPushType(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.fieldThird}>
              <label style={styles.label}>Target Section</label>
              <input
                type="text"
                value={pushSection}
                onChange={e => setPushSection(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.fieldThird}>
              <label style={styles.label}>Target Index</label>
              <input
                type="number"
                value={pushIndex}
                onChange={e => setPushIndex(parseInt(e.target.value) || 0)}
                style={styles.input}
              />
            </div>
          </div>

          {pushStatus && (
            <div style={pushStatus.type === 'success' ? styles.success : styles.error}>
              {pushStatus.message}
            </div>
          )}

          <button
            onClick={handleSendPush}
            disabled={pushSending || !pushTitle.trim()}
            style={{
              ...styles.sendBtn,
              ...(pushSending || !pushTitle.trim() ? styles.sendBtnDisabled : {}),
            }}
          >
            {pushSending ? 'Sending...' : 'Send to My Devices'}
          </button>
        </div>
      </div>

      {/* Background Jobs */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Background Jobs</h2>

        <div style={styles.card}>
          <div style={styles.jobRow}>
            <div>
              <div style={styles.jobTitle}>Weekly Narrative Reports</div>
              <div style={styles.jobDesc}>
                Trigger report generation for all eligible users. Runs automatically every Sunday at 12:00 UTC.
              </div>
            </div>
            <button
              onClick={handleTriggerCron}
              disabled={cronRunning}
              style={{
                ...styles.triggerBtn,
                ...(cronRunning ? styles.sendBtnDisabled : {}),
              }}
            >
              {cronRunning ? 'Triggering...' : 'Run Now'}
            </button>
          </div>
          {cronStatus && (
            <div style={{ ...(cronStatus.type === 'success' ? styles.success : styles.error), marginTop: 12 }}>
              {cronStatus.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  title: { fontSize: 24, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32 },

  section: { marginBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  sectionDesc: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 },

  presets: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetBtn: {
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  presetBtnActive: {
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderColor: 'var(--accent-teal)',
    color: 'var(--accent-teal)',
  },

  card: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 24,
  },

  fieldRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 16,
  },
  fieldFull: { flex: 1 },
  fieldThird: { flex: 1 },

  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    fontSize: 13,
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'inherit',
  },

  success: {
    padding: '10px 14px',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    border: '1px solid rgba(20, 184, 166, 0.3)',
    borderRadius: 8,
    color: 'var(--accent-teal)',
    fontSize: 13,
    marginBottom: 16,
  },
  error: {
    padding: '10px 14px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 16,
  },

  sendBtn: {
    padding: '10px 24px',
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: 'var(--accent-teal)',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  sendBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },

  jobRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 4,
  },
  jobDesc: {
    fontSize: 13,
    color: 'var(--text-muted)',
    lineHeight: 1.5,
  },
  triggerBtn: {
    padding: '10px 20px',
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: 'var(--accent-amber)',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
};
