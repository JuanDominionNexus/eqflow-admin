import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getPendingRequests, confirmClient, declineClient, getClients, removeClient,
  getClientCheckIns, getClientPatterns, getClientEmotionalMap,
  getClientMeditations, getClientJournals, getClientVisions, getClientSummary,
  registerAsTherapist, uploadTherapistDocuments,
  getTherapistProfile, getTherapistDocuments, deleteTherapistDocument,
  updateTherapistProfile,
  inviteClient, getSentInvites,
} from '../api/therapistPortal';
import client from '../api/client';
import { format, parseISO } from 'date-fns';

function formatDate(d) {
  try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return '\u2014'; }
}

function formatDateTime(d) {
  try { return format(parseISO(d), 'MMM d, yyyy h:mm a'); } catch { return '\u2014'; }
}

// ── Registration View ──

const LICENSE_TYPES = [
  'Licensed Clinical Social Worker (LCSW)',
  'Licensed Professional Counselor (LPC)',
  'Licensed Marriage and Family Therapist (LMFT)',
  'Licensed Psychologist (PhD/PsyD)',
  'Licensed Psychiatrist (MD)',
  'Licensed Clinical Professional Counselor (LCPC)',
  'Other',
];

function RegistrationView() {
  const [form, setForm] = useState({
    license_type: '',
    license_number: '',
    license_state: '',
    practice_name: '',
  });
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('form'); // 'form' | 'docs'
  const { role } = useAuth();

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files).slice(0, 3);
    setFiles(newFiles);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const newFiles = Array.from(e.dataTransfer.files).slice(0, 3);
    setFiles(newFiles);
  };

  const handleSubmitProfile = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await registerAsTherapist(form);
      setStep('docs');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitDocs = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (files.length > 0) {
        const fd = new FormData();
        files.forEach(f => fd.append('documents', f));
        await uploadTherapistDocuments(fd);
      }
      // Refetch role to transition to PendingView
      await client.get('/auth/me').then(res => {
        // Force page reload to pick up new role
        window.location.reload();
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
      setSubmitting(false);
    }
  };

  if (step === 'docs') {
    return (
      <div>
        <h1 style={styles.title}>Upload Credential Documents</h1>
        <p style={styles.subtitle}>Upload your license or certification documents for verification (up to 3 files).</p>

        {error && <div style={styles.error}>{error}</div>}

        <div
          style={styles.dropZone}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div style={styles.dropZoneText}>
            {files.length > 0
              ? files.map(f => f.name).join(', ')
              : 'Drag files here or click to browse'}
          </div>
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            style={styles.fileInput}
          />
        </div>

        <div style={styles.formActions}>
          <button
            onClick={handleSubmitDocs}
            disabled={submitting}
            style={styles.primaryBtn}
          >
            {submitting ? 'Submitting...' : files.length > 0 ? 'Upload & Submit' : 'Skip & Submit'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={styles.title}>Become a Therapist</h1>
      <p style={styles.subtitle}>Register your professional credentials to access the therapist portal.</p>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleSubmitProfile} style={styles.form}>
        <label style={styles.label}>
          License Type
          <select
            name="license_type"
            value={form.license_type}
            onChange={handleChange}
            required
            style={styles.input}
          >
            <option value="">Select...</option>
            {LICENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label style={styles.label}>
          License Number
          <input
            name="license_number"
            value={form.license_number}
            onChange={handleChange}
            required
            placeholder="e.g. 12345"
            style={styles.input}
          />
        </label>

        <label style={styles.label}>
          License State
          <input
            name="license_state"
            value={form.license_state}
            onChange={handleChange}
            required
            placeholder="e.g. CA"
            maxLength={10}
            style={styles.input}
          />
        </label>

        <label style={styles.label}>
          Practice Name (optional)
          <input
            name="practice_name"
            value={form.practice_name}
            onChange={handleChange}
            placeholder="e.g. Mindful Therapy Center"
            style={styles.input}
          />
        </label>

        <div style={styles.formActions}>
          <button type="submit" disabled={submitting} style={styles.primaryBtn}>
            {submitting ? 'Registering...' : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Pending Verification View ──

function PendingView() {
  const [profile, setProfile] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [practiceName, setPracticeName] = useState('');

  useEffect(() => {
    Promise.all([getTherapistProfile(), getTherapistDocuments()])
      .then(([p, d]) => {
        setProfile(p);
        setDocs(d);
        setPracticeName(p.practice_name || '');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDeleteDoc = async (docId) => {
    await deleteTherapistDocument(docId);
    setDocs(prev => prev.filter(d => d.id !== docId));
  };

  const handleUploadMore = async (e) => {
    const files = Array.from(e.target.files).slice(0, 3);
    if (files.length === 0) return;
    const fd = new FormData();
    files.forEach(f => fd.append('documents', f));
    const created = await uploadTherapistDocuments(fd);
    setDocs(prev => [...created, ...prev]);
  };

  const handleSaveName = async () => {
    await updateTherapistProfile({ practice_name: practiceName });
    setProfile(prev => ({ ...prev, practice_name: practiceName }));
    setEditingName(false);
  };

  if (loading) return <div style={styles.empty}>Loading...</div>;

  return (
    <div>
      <h1 style={styles.title}>
        Registration Pending
        <span style={styles.pendingBadge}>Awaiting Verification</span>
      </h1>
      <p style={styles.subtitle}>Your credentials have been submitted and are being reviewed by an administrator.</p>

      {profile && (
        <div style={styles.infoCard}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>License Type</span>
            <span>{profile.license_type}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>License Number</span>
            <span>{profile.license_number}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>State</span>
            <span>{profile.license_state}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Practice Name</span>
            {editingName ? (
              <span style={{ display: 'flex', gap: 8 }}>
                <input
                  value={practiceName}
                  onChange={(e) => setPracticeName(e.target.value)}
                  style={{ ...styles.input, margin: 0, flex: 1 }}
                />
                <button onClick={handleSaveName} style={styles.smallBtn}>Save</button>
                <button onClick={() => setEditingName(false)} style={styles.smallBtnGhost}>Cancel</button>
              </span>
            ) : (
              <span>
                {profile.practice_name || '\u2014'}
                <button onClick={() => setEditingName(true)} style={styles.editLink}>Edit</button>
              </span>
            )}
          </div>
        </div>
      )}

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          Uploaded Documents
          <label style={styles.uploadLabel}>
            + Upload
            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleUploadMore} style={{ display: 'none' }} />
          </label>
        </h2>
        {docs.length === 0 ? (
          <div style={styles.empty}>No documents uploaded yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {docs.map(d => (
              <div key={d.id} style={styles.docRow}>
                <span>{d.original_filename}</span>
                <span style={styles.docMeta}>{d.document_type} &middot; {(d.file_size / 1024).toFixed(0)} KB</span>
                <button onClick={() => handleDeleteDoc(d.id)} style={styles.deleteBtn}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Invite Modal ──

function InviteModal({ open, onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await inviteClient(email.trim());
      setEmail('');
      onSuccess?.();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div style={styles.modalOverlay} onClick={handleClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Invite Client</h2>
        <p style={styles.modalSubtext}>Send an email invitation to connect with a client. They can accept even if they don't have an account yet.</p>

        {success ? (
          <div>
            <div style={styles.successMsg}>Invitation sent successfully!</div>
            <div style={styles.formActions}>
              <button onClick={() => { setSuccess(false); }} style={styles.primaryBtn}>Send Another</button>
              <button onClick={handleClose} style={styles.ghostBtn}>Close</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div style={styles.error}>{error}</div>}
            <label style={styles.label}>
              Client Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="client@example.com"
                style={styles.input}
              />
            </label>
            <div style={styles.formActions}>
              <button type="submit" disabled={submitting} style={styles.primaryBtn}>
                {submitting ? 'Sending...' : 'Send Invitation'}
              </button>
              <button type="button" onClick={handleClose} style={styles.ghostBtn}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Client List View ──

function ClientListView() {
  const navigate = useNavigate();
  const [pending, setPending] = useState([]);
  const [clients, setClients] = useState([]);
  const [sentInvites, setSentInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, s] = await Promise.all([getPendingRequests(), getClients(), getSentInvites()]);
      setPending(p);
      setClients(c);
      setSentInvites(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleConfirm = async (id) => {
    await confirmClient(id);
    load();
  };

  const handleDecline = async (id) => {
    await declineClient(id);
    load();
  };

  if (loading) return <div style={styles.empty}>Loading...</div>;

  const pendingInvites = sentInvites.filter(i => i.status === 'pending');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ ...styles.title, marginBottom: 0 }}>
          {localStorage.getItem('therapist_name')
            ? `Welcome back, ${localStorage.getItem('therapist_name')}`
            : 'My Clients'}
        </h1>
        <button onClick={() => setInviteOpen(true)} style={styles.primaryBtn}>
          + Invite Client
        </button>
      </div>

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={load}
      />

      {pending.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Pending Requests</h2>
          <div style={styles.cardGrid}>
            {pending.map((r) => (
              <div key={r.id} style={styles.card}>
                <div style={styles.cardName}>{r.client_name}</div>
                <div style={styles.cardEmail}>{r.client_email}</div>
                {r.client_note && <div style={styles.cardNote}>"{r.client_note}"</div>}
                <div style={styles.cardMeta}>Requested {formatDate(r.requested_at)}</div>
                <div style={styles.cardActions}>
                  <button onClick={() => handleConfirm(r.id)} style={styles.acceptBtn}>Accept</button>
                  <button onClick={() => handleDecline(r.id)} style={styles.declineBtn}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingInvites.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Sent Invitations</h2>
          <div style={styles.cardGrid}>
            {pendingInvites.map((inv) => (
              <div key={inv.id} style={styles.card}>
                <div style={styles.cardName}>{inv.client_name || inv.client_email}</div>
                {inv.client_name && <div style={styles.cardEmail}>{inv.client_email}</div>}
                <div style={styles.cardMeta}>
                  Invited {formatDate(inv.requested_at)}
                  {inv.invite_token_expires && (
                    <span> &middot; Expires {formatDate(inv.invite_token_expires)}</span>
                  )}
                </div>
                <span style={styles.inviteBadge}>Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Active Clients</h2>
        {clients.length === 0 ? (
          <div style={styles.empty}>No active clients yet</div>
        ) : (
          <div style={styles.cardGrid}>
            {clients.map((c) => (
              <div
                key={c.relationship_id}
                style={{ ...styles.card, cursor: 'pointer' }}
                onClick={() => navigate(`/portal/client/${c.client_id}`)}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-teal)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <div style={styles.cardName}>{c.client_name}</div>
                <div style={styles.cardStats}>
                  <span>{c.total_check_ins} check-ins</span>
                  <span>{c.pattern_count} patterns</span>
                </div>
                <div style={styles.cardMeta}>
                  Last check-in: {c.last_check_in ? formatDate(c.last_check_in) : 'Never'}
                </div>
                <div style={styles.cardMeta}>
                  Connected {formatDate(c.confirmed_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Client Detail View ──

const TABS = ['Check-ins', 'Meditations', 'Journals', 'Patterns', 'Emotional Map'];

function ClientDetailView() {
  const { id: clientId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('Check-ins');
  const [checkIns, setCheckIns] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [emotionalMap, setEmotionalMap] = useState(null);
  const [meditations, setMeditations] = useState(null);
  const [journals, setJournals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [clientInfo, setClientInfo] = useState(null);

  // Load client info (for name + relationship_id)
  useEffect(() => {
    getClients().then((list) => {
      const c = list.find(c => c.client_id === clientId);
      if (c) setClientInfo(c);
    }).catch(() => {});
  }, [clientId]);

  useEffect(() => {
    setLoading(true);
    if (tab === 'Check-ins') {
      getClientCheckIns(clientId, { days, limit: 50 })
        .then(setCheckIns)
        .finally(() => setLoading(false));
    } else if (tab === 'Meditations') {
      getClientMeditations(clientId, { limit: 50 })
        .then(setMeditations)
        .finally(() => setLoading(false));
    } else if (tab === 'Journals') {
      getClientJournals(clientId, { limit: 50 })
        .then(setJournals)
        .finally(() => setLoading(false));
    } else if (tab === 'Patterns') {
      getClientPatterns(clientId)
        .then(setPatterns)
        .finally(() => setLoading(false));
    } else {
      getClientEmotionalMap(clientId, { days })
        .then(setEmotionalMap)
        .finally(() => setLoading(false));
    }
  }, [clientId, tab, days]);

  const handleRemoveClient = async () => {
    if (!clientInfo) return;
    try {
      await removeClient(clientInfo.relationship_id);
      navigate('/portal');
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={() => navigate('/portal')} style={styles.backBtn}>
          &larr; Back to clients
        </button>
        {clientInfo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>{clientInfo.client_name}</span>
            {!confirmRemove ? (
              <button onClick={() => setConfirmRemove(true)} style={styles.removeBtn}>
                Disconnect
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--accent-red)' }}>Remove this client?</span>
                <button onClick={handleRemoveClient} style={styles.removeConfirmBtn}>Yes, remove</button>
                <button onClick={() => setConfirmRemove(false)} style={styles.ghostBtn}>Cancel</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={styles.tabRow}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              ...styles.tabBtn,
              ...(tab === t ? styles.tabBtnActive : {}),
            }}
          >
            {t}
          </button>
        ))}
        {(tab === 'Check-ins' || tab === 'Emotional Map') && (
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            style={styles.select}
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={365}>1 year</option>
          </select>
        )}
      </div>

      {loading && <div style={styles.empty}>Loading...</div>}

      {!loading && tab === 'Check-ins' && checkIns && (
        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Emotion</th>
                <th style={styles.th}>Family</th>
                <th style={styles.th}>Type</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Intensity</th>
                <th style={styles.th}>Context</th>
                <th style={styles.th}>AI Tone</th>
              </tr>
            </thead>
            <tbody>
              {checkIns.check_ins.map((ci) => (
                <tr key={ci.id} style={styles.tr}>
                  <td style={styles.td}>{formatDateTime(ci.timestamp)}</td>
                  <td style={styles.td}>
                    <span style={{ fontWeight: 600 }}>{ci.emotion_name || '\u2014'}</span>
                  </td>
                  <td style={styles.td}>{ci.emotion_family || '\u2014'}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      ...(ci.base_type === 'love_based' ? styles.badgeLove : styles.badgeFear),
                    }}>
                      {ci.base_type === 'love_based' ? 'Love' : 'Fear'}
                    </span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{ci.user_felt_intensity}/10</td>
                  <td style={styles.td}>{ci.context || '\u2014'}</td>
                  <td style={styles.td}>{ci.emotional_tone || '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {checkIns.check_ins.length === 0 && (
            <div style={styles.empty}>No check-ins in this period</div>
          )}
        </div>
      )}

      {!loading && tab === 'Meditations' && meditations && (
        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Type</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Duration</th>
                <th style={styles.th}>Completed</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Mood Before</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Mood After</th>
                <th style={styles.th}>Key Themes</th>
              </tr>
            </thead>
            <tbody>
              {meditations.meditations.map((m) => (
                <tr key={m.id} style={styles.tr}>
                  <td style={styles.td}>{formatDateTime(m.started_at)}</td>
                  <td style={styles.td}>{m.meditation_type || '\u2014'}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    {m.duration_seconds ? `${Math.round(m.duration_seconds / 60)}m` : '\u2014'}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      ...(m.completed ? styles.badgeLove : styles.badgeFear),
                    }}>
                      {m.completed ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{m.mood_before ?? '\u2014'}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{m.mood_after ?? '\u2014'}</td>
                  <td style={styles.td}>
                    {Array.isArray(m.key_themes) ? m.key_themes.join(', ') : '\u2014'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {meditations.meditations.length === 0 && (
            <div style={styles.empty}>No meditation sessions yet</div>
          )}
        </div>
      )}

      {!loading && tab === 'Journals' && journals && (
        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Word Count</th>
                <th style={styles.th}>Detected Emotion</th>
                <th style={styles.th}>Family</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>AI Tone</th>
                <th style={styles.th}>Key Themes</th>
              </tr>
            </thead>
            <tbody>
              {journals.journals.map((j) => (
                <tr key={j.id} style={styles.tr}>
                  <td style={styles.td}>{formatDateTime(j.created_at)}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{j.word_count || '\u2014'}</td>
                  <td style={styles.td}>
                    <span style={{ fontWeight: 600 }}>{j.detected_emotion_name || '\u2014'}</span>
                  </td>
                  <td style={styles.td}>{j.detected_emotion_family || '\u2014'}</td>
                  <td style={styles.td}>
                    {j.base_type ? (
                      <span style={{
                        ...styles.badge,
                        ...(j.base_type === 'love_based' ? styles.badgeLove : styles.badgeFear),
                      }}>
                        {j.base_type === 'love_based' ? 'Love' : 'Fear'}
                      </span>
                    ) : '\u2014'}
                  </td>
                  <td style={styles.td}>{j.emotional_tone || '\u2014'}</td>
                  <td style={styles.td}>
                    {Array.isArray(j.key_themes) ? j.key_themes.join(', ') : '\u2014'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {journals.journals.length === 0 && (
            <div style={styles.empty}>No journal entries yet</div>
          )}
        </div>
      )}

      {!loading && tab === 'Patterns' && patterns && (
        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Emotion</th>
                <th style={styles.th}>Family</th>
                <th style={styles.th}>Base Type</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Occurrences</th>
                <th style={styles.th}>Trend</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Confidence</th>
                <th style={styles.th}>First Detected</th>
                <th style={styles.th}>Last Detected</th>
              </tr>
            </thead>
            <tbody>
              {patterns.map((p) => (
                <tr key={p.id} style={styles.tr}>
                  <td style={styles.td}>{p.pattern_type}</td>
                  <td style={styles.td}>
                    <span style={{ fontWeight: 600 }}>{p.emotion_name || '\u2014'}</span>
                  </td>
                  <td style={styles.td}>{p.emotion_family || '\u2014'}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      ...(p.base_type === 'love_based' ? styles.badgeLove : styles.badgeFear),
                    }}>
                      {p.base_type === 'love_based' ? 'Love' : 'Fear'}
                    </span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{p.occurrences}</td>
                  <td style={styles.td}>
                    <span style={{
                      color: p.trend === 'declining' ? 'var(--accent-teal)' :
                             p.trend === 'increasing' ? '#ef4444' : 'var(--text-muted)',
                    }}>
                      {p.trend || '\u2014'}
                    </span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    {p.confidence ? `${Math.round(p.confidence * 100)}%` : '\u2014'}
                  </td>
                  <td style={styles.td}>{formatDate(p.first_detected)}</td>
                  <td style={styles.td}>{formatDate(p.last_detected)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {patterns.length === 0 && (
            <div style={styles.empty}>No patterns detected yet</div>
          )}
        </div>
      )}

      {!loading && tab === 'Emotional Map' && emotionalMap && (
        <div>
          <div style={styles.mapSummary}>
            <div style={styles.mapStat}>
              <div style={styles.mapStatValue}>{emotionalMap.total_check_ins}</div>
              <div style={styles.mapStatLabel}>Check-ins ({days} days)</div>
            </div>
            {emotionalMap.distribution.map((d) => (
              <div key={d.base_type} style={styles.mapStat}>
                <div style={{
                  ...styles.mapStatValue,
                  color: d.base_type === 'love_based' ? 'var(--accent-teal)' : '#f59e0b',
                }}>
                  {d.percentage}%
                </div>
                <div style={styles.mapStatLabel}>
                  {d.base_type === 'love_based' ? 'Love-based' : 'Fear-based'}
                  <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                    avg {d.avg_intensity}/10
                  </span>
                </div>
              </div>
            ))}
          </div>
          {emotionalMap.total_check_ins === 0 && (
            <div style={styles.empty}>No check-ins in this period</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Exported Page (decides which view to show) ──

export function TherapistPortalPage() {
  const { role } = useAuth();

  if (role.therapistProfileStatus === 'none') return <RegistrationView />;
  if (role.therapistProfileStatus === 'pending') return <PendingView />;
  return <ClientListView />;
}

export function ClientDetailPage() {
  return <ClientDetailView />;
}

const styles = {
  title: { fontSize: 24, fontWeight: 700, marginBottom: 24 },
  subtitle: { fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 },
  section: { marginBottom: 32 },
  sectionTitle: {
    fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)',
    display: 'flex', alignItems: 'center', gap: 12,
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 12,
  },
  card: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 16,
    transition: 'border-color 0.15s',
  },
  cardName: { fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' },
  cardEmail: { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 },
  cardNote: { fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 8 },
  cardStats: {
    display: 'flex',
    gap: 16,
    marginTop: 8,
    fontSize: 13,
    color: 'var(--text-secondary)',
  },
  cardMeta: { fontSize: 12, color: 'var(--text-muted)', marginTop: 6 },
  cardActions: { display: 'flex', gap: 8, marginTop: 12 },
  acceptBtn: {
    padding: '6px 16px',
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: 'var(--accent-teal)',
    border: 'none',
    borderRadius: 6,
    color: 'white',
    cursor: 'pointer',
  },
  declineBtn: {
    padding: '6px 16px',
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: 'transparent',
    border: '1px solid #ef4444',
    borderRadius: 6,
    color: '#ef4444',
    cursor: 'pointer',
  },
  backBtn: {
    padding: '8px 0',
    fontSize: 13,
    fontWeight: 500,
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--accent-teal)',
    cursor: 'pointer',
    marginBottom: 0,
  },
  removeBtn: {
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: 'transparent',
    border: '1px solid var(--accent-red)',
    borderRadius: 6,
    color: 'var(--accent-red)',
    cursor: 'pointer',
  },
  removeConfirmBtn: {
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: 'var(--accent-red)',
    border: 'none',
    borderRadius: 6,
    color: 'white',
    cursor: 'pointer',
  },
  tabRow: {
    display: 'flex',
    gap: 4,
    marginBottom: 16,
    alignItems: 'center',
  },
  tabBtn: {
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 600,
    border: '1px solid var(--border)',
    borderRadius: 6,
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  tabBtnActive: {
    backgroundColor: 'var(--accent-teal)',
    borderColor: 'var(--accent-teal)',
    color: 'white',
  },
  select: {
    marginLeft: 'auto',
    padding: '8px 14px',
    fontSize: 13,
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    outline: 'none',
  },
  tableCard: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    overflow: 'hidden',
  },
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
  tr: { transition: 'background-color 0.1s' },
  td: {
    padding: '12px 16px',
    fontSize: 13,
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
  },
  badgeLove: {
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    color: 'var(--accent-teal)',
  },
  badgeFear: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    color: '#f59e0b',
  },
  mapSummary: {
    display: 'flex',
    gap: 24,
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  mapStat: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '16px 24px',
    minWidth: 160,
  },
  mapStatValue: { fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' },
  mapStatLabel: { fontSize: 12, color: 'var(--text-muted)', marginTop: 4 },
  empty: { textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 },

  // Registration form
  form: { maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' },
  input: {
    padding: '10px 14px',
    fontSize: 14,
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    outline: 'none',
  },
  formActions: { display: 'flex', gap: 12, marginTop: 8 },
  primaryBtn: {
    padding: '10px 24px',
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: 'var(--accent-teal)',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    cursor: 'pointer',
  },
  ghostBtn: {
    padding: '10px 24px',
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  error: {
    padding: '10px 16px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 12,
  },
  successMsg: {
    padding: '10px 16px',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    border: '1px solid rgba(20, 184, 166, 0.3)',
    borderRadius: 8,
    color: 'var(--accent-teal)',
    fontSize: 13,
    marginBottom: 16,
  },

  // Pending view
  pendingBadge: {
    display: 'inline-block',
    marginLeft: 12,
    padding: '4px 12px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    color: '#f59e0b',
    verticalAlign: 'middle',
  },
  infoCard: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 20,
    marginBottom: 24,
    maxWidth: 480,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid var(--border)',
    fontSize: 13,
    color: 'var(--text-primary)',
  },
  infoLabel: { fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12 },
  editLink: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--accent-teal)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  smallBtn: {
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: 'var(--accent-teal)',
    border: 'none',
    borderRadius: 6,
    color: 'white',
    cursor: 'pointer',
  },
  smallBtnGhost: {
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 500,
    backgroundColor: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  docRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 16px',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 13,
    color: 'var(--text-primary)',
  },
  docMeta: { fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' },
  deleteBtn: {
    padding: '4px 12px',
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: 'transparent',
    border: '1px solid #ef4444',
    borderRadius: 6,
    color: '#ef4444',
    cursor: 'pointer',
  },
  uploadLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--accent-teal)',
    cursor: 'pointer',
    textDecoration: 'underline',
  },

  // Drop zone
  dropZone: {
    position: 'relative',
    border: '2px dashed var(--border)',
    borderRadius: 10,
    padding: 32,
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 480,
    cursor: 'pointer',
  },
  dropZoneText: { fontSize: 13, color: 'var(--text-muted)' },
  fileInput: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
  },

  // Invite badge
  inviteBadge: {
    display: 'inline-block',
    marginTop: 8,
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    color: '#f59e0b',
  },

  // Modal
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalCard: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 28,
    width: 420,
    maxWidth: '90vw',
  },
  modalTitle: { fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' },
  modalSubtext: { fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 },
};
