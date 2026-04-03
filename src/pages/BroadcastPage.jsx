import { useState, useEffect, useCallback } from 'react';
import { getBroadcasts, sendBroadcast, sendLegalBroadcast, getBroadcastRecipients } from '../api/admin';
import { format, parseISO } from 'date-fns';

const EMAIL_TEMPLATE_BEFORE = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Helvetica','Arial',sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#111120;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.4);">
<tr><td style="background:linear-gradient(135deg,#1a1825 0%,#0A0A14 50%,#1a1825 100%);padding:48px 40px;text-align:center;border-bottom:1px solid rgba(201,168,76,0.2);">
<div style="width:64px;height:64px;border-radius:50%;border:1px solid rgba(201,168,76,0.25);margin:0 auto;line-height:64px;text-align:center;">
<span style="font-size:28px;line-height:64px;color:#C9A84C;">&#x2726;</span>
</div>
<h1 style="margin:24px 0 0;font-size:32px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">EQ Flow</h1>
</td></tr>
<tr><td style="padding:48px 40px;color:#ffffff;">`;

const EMAIL_TEMPLATE_AFTER = `</td></tr>
<tr><td style="padding:32px 40px;background-color:rgba(0,0,0,0.2);text-align:center;">
<p style="margin:0 0 16px;font-size:13px;line-height:20px;color:rgba(255,255,255,0.4);">You're receiving this because you have an EQ Flow account.</p>
<p style="margin:0 0 16px;font-size:13px;color:rgba(255,255,255,0.4);"><a href="#" style="color:rgba(255,255,255,0.5);text-decoration:underline;">Unsubscribe</a></p>
<div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1);">
<p style="margin:0;font-size:13px;color:rgba(255,255,255,0.4);">\u2726 EQ Flow by Astrolabe Labs</p>
<p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,0.3);">\u00A9 ${new Date().getFullYear()} Astrolabe Labs LLC. All rights reserved.</p>
</div></td></tr>
</table></td></tr></table></body></html>`;

const LEGAL_TEMPLATE_AFTER = `</td></tr>
<tr><td style="padding:32px 40px;background-color:rgba(0,0,0,0.2);text-align:center;">
<p style="margin:0 0 16px;font-size:13px;line-height:20px;color:rgba(255,255,255,0.4);">You're receiving this because you have an EQ Flow account. This is a required legal notice.</p>
<div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1);">
<p style="margin:0;font-size:13px;color:rgba(255,255,255,0.4);">\u2726 EQ Flow by Astrolabe Labs</p>
<p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,0.3);">\u00A9 ${new Date().getFullYear()} Astrolabe Labs LLC. All rights reserved.</p>
</div></td></tr>
</table></td></tr></table></body></html>`;

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function textToEmailHtml(text) {
  return text
    .split('\n\n')
    .filter(Boolean)
    .map(p => `<p style="margin:0 0 24px;font-size:17px;line-height:28px;color:rgba(255,255,255,0.8);">${escapeHtml(p.trim())}</p>`)
    .join('\n');
}

function buildPreviewHtml(subject, bodyHtml, isLegal = false) {
  const heading = `<h2 style="margin:0 0 24px;font-size:26px;font-weight:700;color:#ffffff;">${escapeHtml(subject || 'Subject')}</h2>`;
  const body = bodyHtml || '<p style="margin:0 0 24px;font-size:17px;line-height:28px;color:rgba(255,255,255,0.5);">Start typing your message...</p>';
  return EMAIL_TEMPLATE_BEFORE + heading + body + (isLegal ? LEGAL_TEMPLATE_AFTER : EMAIL_TEMPLATE_AFTER);
}

function formatDateTime(d) {
  try { return format(parseISO(d), 'MMM d, yyyy h:mm a'); } catch { return '\u2014'; }
}

export default function BroadcastPage() {
  const [tab, setTab] = useState('broadcast'); // 'broadcast' | 'legal'
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [recipients, setRecipients] = useState({});
  const [recipientsLoading, setRecipientsLoading] = useState({});

  const isLegal = tab === 'legal';

  const loadHistory = useCallback(() => {
    setHistoryLoading(true);
    getBroadcasts()
      .then(setHistory)
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const switchTab = (t) => {
    setTab(t);
    setSubject('');
    setBody('');
    setError(null);
    setResult(null);
  };

  const canSend = subject.trim() && body.trim() && !sending;

  const handleSend = async () => {
    if (!canSend) return;

    const confirmMsg = isLegal
      ? `LEGAL NOTICE: This will be sent to ALL verified users regardless of their email preferences. This cannot be undone.\n\nSubject: ${subject}\n\nProceed?`
      : `Send this broadcast to all users with email notifications enabled?\n\nSubject: ${subject}`;

    if (!window.confirm(confirmMsg)) return;

    // Double-confirm for legal
    if (isLegal && !window.confirm('Final confirmation: Send legal notice to ALL users?')) return;

    setSending(true);
    setError(null);
    setResult(null);
    try {
      const emailBody = textToEmailHtml(body);
      const res = isLegal
        ? await sendLegalBroadcast(subject.trim(), emailBody)
        : await sendBroadcast(subject.trim(), emailBody);
      setResult(res);
      setSubject('');
      setBody('');
      loadHistory();
    } catch (err) {
      setError(err.response?.data?.error || `Failed to send ${isLegal ? 'legal notice' : 'broadcast'}`);
    } finally {
      setSending(false);
    }
  };

  const toggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!recipients[id]) {
      setRecipientsLoading(prev => ({ ...prev, [id]: true }));
      try {
        const data = await getBroadcastRecipients(id);
        setRecipients(prev => ({ ...prev, [id]: data }));
      } catch {
        setRecipients(prev => ({ ...prev, [id]: [] }));
      } finally {
        setRecipientsLoading(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  const livePreviewHtml = buildPreviewHtml(subject, body.trim() ? textToEmailHtml(body) : '', isLegal);

  return (
    <div>
      <h1 style={styles.title}>Broadcast Email</h1>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(tab === 'broadcast' ? styles.tabActive : {}) }}
          onClick={() => switchTab('broadcast')}
        >
          Broadcast
        </button>
        <button
          style={{ ...styles.tab, ...(tab === 'legal' ? styles.tabActiveLegal : {}) }}
          onClick={() => switchTab('legal')}
        >
          Legal Notice
        </button>
      </div>

      <p style={styles.subtitle}>
        {isLegal
          ? 'Send a required legal notice to ALL verified users. Bypasses email preferences — no unsubscribe option. No rate limit.'
          : 'Send an email to all users with broadcast notifications enabled. Limited to once per 7 days.'}
      </p>

      {isLegal && (
        <div style={styles.legalWarning}>
          This email will be sent to every verified user regardless of their notification preferences.
          Use only for legally required communications (privacy policy updates, terms of service changes, data breach notices).
        </div>
      )}

      <div style={styles.composerGrid}>
        {/* Left: Composer */}
        <div style={{ ...styles.composerCard, ...(isLegal ? styles.composerCardLegal : {}) }}>
          <div style={styles.field}>
            <label style={styles.label}>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder={isLegal ? 'e.g. Updated Privacy Policy — Action Required' : 'e.g. New: Guided Morning Meditations'}
              maxLength={255}
              style={styles.input}
            />
            <span style={styles.charCount}>{subject.length}/255</span>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Body</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={isLegal
                ? 'Write the legal notice here. Include what changed, when it takes effect, and any action required.'
                : 'Write your message here. Separate paragraphs with a blank line. The text will be automatically styled to match the email template.'}
              rows={10}
              style={styles.textarea}
            />
            <span style={styles.hint}>Plain text — paragraphs separated by blank lines. HTML is auto-generated.</span>
          </div>

          {error && <div style={styles.error}>{error}</div>}
          {result && (
            <div style={styles.success}>
              {isLegal ? 'Legal notice' : 'Broadcast'} sent to {result.recipientCount} user{result.recipientCount !== 1 ? 's' : ''}
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{
              ...(isLegal ? styles.sendBtnLegal : styles.sendBtn),
              ...(!canSend ? styles.sendBtnDisabled : {}),
            }}
          >
            {sending ? 'Sending...' : isLegal ? 'Send Legal Notice to ALL Users' : 'Send Broadcast'}
          </button>
        </div>

        {/* Right: Live preview */}
        <div style={styles.previewCard}>
          <div style={styles.previewHeader}>
            <span style={styles.previewLabel}>Email Preview</span>
            {isLegal && <span style={styles.previewBadge}>No unsubscribe</span>}
          </div>
          <div style={styles.previewFrame}>
            <iframe
              srcDoc={livePreviewHtml}
              title="Email preview"
              style={styles.iframe}
              sandbox=""
            />
          </div>
        </div>
      </div>

      {/* History */}
      <h2 style={styles.historyTitle}>Broadcast History</h2>
      {historyLoading && <div style={styles.empty}>Loading...</div>}
      {!historyLoading && history.length === 0 && (
        <div style={styles.empty}>No broadcasts sent yet</div>
      )}
      {history.map(b => {
        const isExpanded = expandedId === b.id;
        const recs = recipients[b.id] || [];
        const isLoadingRecs = recipientsLoading[b.id];

        return (
          <div key={b.id} style={styles.historyCard}>
            <div
              style={styles.historyRow}
              onClick={() => toggleExpand(b.id)}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <div style={styles.historyMain}>
                <span style={styles.historySubject}>{b.subject}</span>
                <span style={styles.historyMeta}>
                  {b.sent_by_name || '\u2014'} &middot; {b.recipient_count} recipient{b.recipient_count !== 1 ? 's' : ''} &middot; {formatDateTime(b.sent_at)}
                </span>
              </div>
              <span style={{ ...styles.chevron, transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                &rsaquo;
              </span>
            </div>

            {isExpanded && (
              <div style={styles.expandedSection}>
                {/* Content preview */}
                <div style={styles.expandedGrid}>
                  <div>
                    <div style={styles.expandedLabel}>Recipients</div>
                    {isLoadingRecs && <div style={styles.recipientEmpty}>Loading...</div>}
                    {!isLoadingRecs && recs.length === 0 && (
                      <div style={styles.recipientEmpty}>No recipient data available</div>
                    )}
                    {!isLoadingRecs && recs.length > 0 && (
                      <div style={styles.recipientList}>
                        {recs.map((r, i) => (
                          <div key={i} style={styles.recipientRow}>
                            <div>
                              <span style={styles.recipientName}>{r.name}</span>
                              <span style={styles.recipientEmail}>{r.email}</span>
                            </div>
                            <span style={styles.recipientTime}>{formatDateTime(r.sent_at)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={styles.expandedLabel}>Email Preview</div>
                    <div style={styles.miniPreviewFrame}>
                      <iframe
                        srcDoc={buildPreviewHtml(b.subject, b.body)}
                        title={`Preview: ${b.subject}`}
                        style={styles.miniIframe}
                        sandbox=""
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  title: { fontSize: 24, fontWeight: 700, marginBottom: 12 },
  subtitle: { fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 },

  tabs: {
    display: 'flex',
    gap: 4,
    marginBottom: 16,
    borderBottom: '1px solid var(--border)',
    paddingBottom: 0,
  },
  tab: {
    padding: '10px 20px',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-muted)',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
    marginBottom: -1,
  },
  tabActive: {
    color: 'var(--accent-teal)',
    borderBottomColor: 'var(--accent-teal)',
  },
  tabActiveLegal: {
    color: '#f59e0b',
    borderBottomColor: '#f59e0b',
  },
  legalWarning: {
    padding: '12px 16px',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    borderRadius: 8,
    color: '#f59e0b',
    fontSize: 13,
    lineHeight: 1.5,
    marginBottom: 20,
  },
  composerCardLegal: {
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  sendBtnLegal: {
    width: '100%',
    padding: '12px 24px',
    fontSize: 14,
    fontWeight: 600,
    backgroundColor: '#f59e0b',
    border: 'none',
    borderRadius: 8,
    color: '#000',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  previewBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    padding: '2px 8px',
    borderRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },

  composerGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 24,
    marginBottom: 40,
    alignItems: 'start',
  },

  composerCard: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 24,
  },
  field: { marginBottom: 20, position: 'relative' },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'inherit',
  },
  charCount: {
    position: 'absolute',
    right: 0,
    top: 0,
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  textarea: {
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: 1.6,
  },
  hint: {
    display: 'block',
    fontSize: 12,
    color: 'var(--text-muted)',
    marginTop: 6,
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
  success: {
    padding: '10px 14px',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    border: '1px solid rgba(20, 184, 166, 0.3)',
    borderRadius: 8,
    color: 'var(--accent-teal)',
    fontSize: 13,
    marginBottom: 16,
  },
  sendBtn: {
    width: '100%',
    padding: '12px 24px',
    fontSize: 14,
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

  // Preview
  previewCard: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  previewHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  previewFrame: {
    padding: 0,
    backgroundColor: '#0f1117',
  },
  iframe: {
    width: '100%',
    height: 520,
    border: 'none',
    display: 'block',
  },

  // History
  historyTitle: { fontSize: 18, fontWeight: 700, marginBottom: 12 },
  historyCard: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  historyRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 20px',
    cursor: 'pointer',
    transition: 'background-color 0.1s',
  },
  historyMain: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  historySubject: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  historyMeta: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  chevron: {
    fontSize: 20,
    color: 'var(--text-muted)',
    transition: 'transform 0.15s',
    flexShrink: 0,
    marginLeft: 12,
  },

  // Expanded section
  expandedSection: {
    borderTop: '1px solid var(--border)',
    padding: '16px 20px',
  },
  expandedGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
    alignItems: 'start',
  },
  expandedLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 10,
  },
  recipientList: {
    maxHeight: 320,
    overflowY: 'auto',
    border: '1px solid var(--border)',
    borderRadius: 8,
  },
  recipientRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderBottom: '1px solid var(--border)',
    fontSize: 13,
  },
  recipientName: {
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginRight: 8,
  },
  recipientEmail: {
    color: 'var(--text-muted)',
    fontSize: 12,
  },
  recipientTime: {
    fontSize: 11,
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  recipientEmpty: {
    padding: 16,
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: 13,
  },

  // Mini preview for history items
  miniPreviewFrame: {
    backgroundColor: '#0f1117',
    borderRadius: 8,
    overflow: 'hidden',
  },
  miniIframe: {
    width: '100%',
    height: 360,
    border: 'none',
    display: 'block',
  },

  empty: { textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 },
};
