import { useState, useEffect, useCallback } from 'react';
import { getTherapists, verifyTherapist, rejectTherapist, getTherapistDocuments } from '../api/admin';
import { format, parseISO } from 'date-fns';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'verified', label: 'Verified' },
  { key: 'all', label: 'All' },
];

function DocumentsModal({ profileId, therapistName, onClose }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTherapistDocuments(profileId)
      .then(setDocs)
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [profileId]);

  const isImage = (mime) => mime.startsWith('image/');
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.card} onClick={e => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>Documents — {therapistName}</h2>
          <button onClick={onClose} style={modalStyles.closeBtn}>&times;</button>
        </div>

        {loading && <div style={modalStyles.empty}>Loading...</div>}

        {!loading && docs.length === 0 && (
          <div style={modalStyles.empty}>No documents uploaded</div>
        )}

        {!loading && docs.length > 0 && (
          <div style={modalStyles.list}>
            {docs.map(doc => (
              <div key={doc.id} style={modalStyles.docRow}>
                <div style={modalStyles.docIcon}>
                  {isImage(doc.mime_type) ? (
                    <img
                      src={doc.signed_url}
                      alt={doc.original_filename}
                      style={modalStyles.thumbnail}
                    />
                  ) : (
                    <span style={modalStyles.pdfIcon}>PDF</span>
                  )}
                </div>
                <div style={modalStyles.docInfo}>
                  <span style={modalStyles.docName}>{doc.original_filename}</span>
                  <span style={modalStyles.docMeta}>
                    {doc.document_type} &middot; {formatSize(doc.file_size)}
                  </span>
                </div>
                <a
                  href={doc.signed_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={modalStyles.openBtn}
                >
                  Open
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TherapistVerificationPage() {
  const [tab, setTab] = useState('pending');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [docsModal, setDocsModal] = useState(null); // { profileId, name }

  const load = useCallback(() => {
    setLoading(true);
    getTherapists({ status: tab })
      .then(setData)
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const handleVerify = async (id) => {
    await verifyTherapist(id);
    load();
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this therapist? Active client relationships will be revoked.')) return;
    await rejectTherapist(id);
    load();
  };

  const formatDate = (d) => {
    try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return '—'; }
  };

  return (
    <div>
      <h1 style={styles.title}>Therapist Verification</h1>

      <div style={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              ...styles.tab,
              ...(tab === t.key ? styles.tabActive : {}),
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={styles.tableCard}>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>License #</th>
                <th style={styles.th}>State</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Practice</th>
                <th style={styles.th}>Docs</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((tp) => (
                <tr key={tp.id} style={styles.tr}>
                  <td style={styles.td}>
                    <span style={styles.name}>{tp.name}</span>
                  </td>
                  <td style={styles.td}>{tp.email}</td>
                  <td style={styles.td}>{tp.license_number}</td>
                  <td style={styles.td}>{tp.license_state}</td>
                  <td style={styles.td}>{tp.license_type}</td>
                  <td style={styles.td}>{tp.practice_name || '—'}</td>
                  <td style={styles.td}>
                    {tp.document_count > 0 ? (
                      <button
                        onClick={() => setDocsModal({ profileId: tp.id, name: tp.name })}
                        style={styles.docsBtn}
                      >
                        <span style={styles.docsBadge}>{tp.document_count}</span>
                        View
                      </button>
                    ) : (
                      <span style={styles.noDocs}>—</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      ...(tp.license_verified ? styles.badgeVerified : styles.badgePending),
                    }}>
                      {tp.license_verified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      {!tp.license_verified && (
                        <button
                          onClick={() => handleVerify(tp.id)}
                          style={styles.verifyBtn}
                        >
                          Verify
                        </button>
                      )}
                      <button
                        onClick={() => handleReject(tp.id)}
                        style={styles.rejectBtn}
                      >
                        {tp.license_verified ? 'Revoke' : 'Reject'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div style={styles.empty}>Loading...</div>}
          {!loading && data.length === 0 && (
            <div style={styles.empty}>No therapists found</div>
          )}
        </div>
      </div>

      {docsModal && (
        <DocumentsModal
          profileId={docsModal.profileId}
          therapistName={docsModal.name}
          onClose={() => setDocsModal(null)}
        />
      )}
    </div>
  );
}

const styles = {
  title: { fontSize: 24, fontWeight: 700, marginBottom: 24 },
  tabs: {
    display: 'flex',
    gap: 4,
    marginBottom: 16,
  },
  tab: {
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 600,
    border: '1px solid var(--border)',
    borderRadius: 6,
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  tabActive: {
    backgroundColor: 'var(--accent-teal)',
    borderColor: 'var(--accent-teal)',
    color: 'white',
  },
  tableCard: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    overflow: 'hidden',
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
  tr: { transition: 'background-color 0.1s' },
  td: {
    padding: '12px 16px',
    fontSize: 13,
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
  name: { fontWeight: 600, color: 'var(--text-primary)' },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
  },
  badgeVerified: {
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    color: 'var(--accent-teal)',
  },
  badgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    color: '#f59e0b',
  },
  docsBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    border: '1px solid rgba(14, 165, 233, 0.3)',
    borderRadius: 6,
    color: '#0ea5e9',
    cursor: 'pointer',
  },
  docsBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    borderRadius: '50%',
    backgroundColor: '#0ea5e9',
    color: 'white',
    fontSize: 10,
    fontWeight: 700,
  },
  noDocs: { color: 'var(--text-muted)' },
  actions: {
    display: 'flex',
    gap: 6,
  },
  verifyBtn: {
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: 'var(--accent-teal)',
    border: 'none',
    borderRadius: 6,
    color: 'white',
    cursor: 'pointer',
  },
  rejectBtn: {
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: 'transparent',
    border: '1px solid #ef4444',
    borderRadius: 6,
    color: '#ef4444',
    cursor: 'pointer',
  },
  empty: { textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 },
};

const modalStyles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  card: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    width: '90%',
    maxWidth: 560,
    maxHeight: '80vh',
    overflow: 'auto',
    padding: 24,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: 700, margin: 0 },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 24,
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '0 4px',
  },
  empty: { textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 14 },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  docRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'var(--bg-secondary, rgba(0,0,0,0.03))',
    borderRadius: 8,
  },
  docIcon: {
    width: 48,
    height: 48,
    borderRadius: 6,
    overflow: 'hidden',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
  },
  thumbnail: {
    width: 48,
    height: 48,
    objectFit: 'cover',
  },
  pdfIcon: {
    fontSize: 12,
    fontWeight: 700,
    color: '#ef4444',
  },
  docInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  docName: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  docMeta: {
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  openBtn: {
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: 'var(--accent-teal)',
    border: 'none',
    borderRadius: 6,
    color: 'white',
    textDecoration: 'none',
    cursor: 'pointer',
    flexShrink: 0,
  },
};
