import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDnaUploads, uploadDnaFile, getUsers } from '../api/admin';
import { format, parseISO } from 'date-fns';

function fmtDate(d) {
  try { return format(parseISO(d), 'MMM d, yyyy h:mm a'); } catch { return '—'; }
}

export default function DnaUploadsPage() {
  const [uploads, setUploads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    getDnaUploads()
      .then((data) => {
        setUploads(data.uploads || []);
        setStats(data.stats || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Debounced user search
  useEffect(() => {
    if (userSearch.length < 2 || selectedUser) { setUserResults([]); return; }
    const timer = setTimeout(() => {
      setSearchLoading(true);
      getUsers({ search: userSearch, limit: 5 })
        .then((data) => setUserResults(data.users || []))
        .catch(() => setUserResults([]))
        .finally(() => setSearchLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, selectedUser]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setError(''); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) { setFile(f); setError(''); }
  };

  const handleUpload = async () => {
    if (!file || !selectedUser) return;
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('user_id', selectedUser.id);
      await uploadDnaFile(fd);
      setSuccess(`DNA scan uploaded for ${selectedUser.name}`);
      setFile(null);
      setSelectedUser(null);
      setUserSearch('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const selectUser = (user) => {
    setSelectedUser(user);
    setUserSearch(user.name);
    setUserResults([]);
  };

  return (
    <div>
      <h1 style={styles.title}>DNA Scans</h1>

      {/* Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Scans</div>
          <div style={{ ...styles.statValue, color: 'var(--accent-purple)' }}>{stats?.total ?? 0}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Confirmed</div>
          <div style={{ ...styles.statValue, color: 'var(--accent-green)' }}>{stats?.confirmed ?? 0}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Pending</div>
          <div style={{ ...styles.statValue, color: 'var(--accent-amber)' }}>{stats?.pending ?? 0}</div>
        </div>
      </div>

      {/* Upload section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Upload DNA Scan</h2>

        <div style={styles.fieldGroup}>
          <label style={styles.fieldLabel}>User</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={userSearch}
              onChange={(e) => { setUserSearch(e.target.value); setSelectedUser(null); }}
              placeholder="Search by name or email..."
              style={{
                ...styles.input,
                ...(selectedUser ? { borderColor: 'var(--accent-green)' } : {}),
              }}
            />
            {selectedUser && (
              <span style={styles.selectedCheck}>&#10003;</span>
            )}
            {userResults.length > 0 && !selectedUser && (
              <div style={styles.dropdown}>
                {userResults.map((u) => (
                  <div
                    key={u.id}
                    style={styles.dropdownItem}
                    onClick={() => selectUser(u)}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                  </div>
                ))}
              </div>
            )}
            {searchLoading && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Searching...</div>
            )}
          </div>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.fieldLabel}>DNA File</label>
          <div
            style={{
              ...styles.dropZone,
              ...(dragOver ? { borderColor: 'var(--accent-purple)', backgroundColor: 'rgba(168, 85, 247, 0.05)' } : {}),
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('dna-file-input').click()}
          >
            <input
              id="dna-file-input"
              type="file"
              accept=".txt,.csv,.zip,.gz"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {file ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{file.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB &middot; Click to change
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 8, color: 'var(--text-muted)' }}>&#8593;</div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  Drop DNA scan here or click to browse
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  .txt, .csv, .zip accepted
                </div>
              </div>
            )}
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <button
          onClick={handleUpload}
          disabled={!file || !selectedUser || uploading}
          style={{
            ...styles.uploadBtn,
            opacity: (!file || !selectedUser || uploading) ? 0.5 : 1,
            cursor: (!file || !selectedUser || uploading) ? 'not-allowed' : 'pointer',
          }}
        >
          {uploading ? 'Uploading...' : 'Upload Scan'}
        </button>
      </div>

      {/* Uploads table */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>All Scans</h2>
        {loading ? (
          <div style={styles.empty}>Loading...</div>
        ) : uploads.length === 0 ? (
          <div style={styles.empty}>No DNA scans yet</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>File</th>
                  <th style={styles.th}>Uploaded</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((u) => (
                  <tr
                    key={u.id}
                    style={styles.tr}
                    onClick={() => navigate(`/users/${u.user_id}`)}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.user_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.user_email}</div>
                    </td>
                    <td style={styles.td}>{u.file_name}</td>
                    <td style={styles.td}>{fmtDate(u.created_at)}</td>
                    <td style={styles.td}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        backgroundColor:
                          u.status === 'confirmed' ? 'rgba(34, 197, 94, 0.1)' :
                          u.status === 'processing' ? 'rgba(14, 165, 233, 0.1)' :
                          'rgba(245, 158, 11, 0.1)',
                        color:
                          u.status === 'confirmed' ? '#22c55e' :
                          u.status === 'processing' ? '#0ea5e9' :
                          '#f59e0b',
                      }}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  title: { fontSize: 24, fontWeight: 700, marginBottom: 24 },
  statsRow: {
    display: 'flex',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: '1 1 140px',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '20px 24px',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 700,
    lineHeight: 1.1,
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
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    display: 'block',
    fontSize: 12,
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
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    outline: 'none',
  },
  selectedCheck: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--accent-green)',
    fontWeight: 700,
    fontSize: 16,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    marginTop: 4,
    zIndex: 10,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: '10px 14px',
    cursor: 'pointer',
    transition: 'background-color 0.1s',
  },
  dropZone: {
    border: '2px dashed var(--border)',
    borderRadius: 10,
    padding: '32px 24px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  error: {
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    marginBottom: 16,
  },
  success: {
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    color: '#22c55e',
    marginBottom: 16,
  },
  uploadBtn: {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    backgroundColor: 'var(--accent-purple)',
    border: 'none',
    borderRadius: 8,
    color: 'white',
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
  tr: { cursor: 'pointer', transition: 'background-color 0.1s' },
  td: {
    padding: '12px 16px',
    fontSize: 13,
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
  empty: { textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 14 },
};
