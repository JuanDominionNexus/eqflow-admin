import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUserDetail, verifyTherapist, rejectTherapist } from '../api/admin';
import { format, parseISO } from 'date-fns';

function fmtDate(d) {
  try { return format(parseISO(d), 'MMM d, yyyy h:mm a'); } catch { return '—'; }
}

function fmtShortDate(d) {
  try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return '—'; }
}

export default function UserDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getUserDetail(id).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div style={styles.loading}>Loading...</div>;
  if (!data) return <div style={styles.loading}>User not found</div>;

  const { user, counts, recentSessions, engagement, therapistProfile } = data;

  const handleVerify = async () => {
    if (!therapistProfile) return;
    await verifyTherapist(therapistProfile.id);
    load();
  };

  const handleReject = async () => {
    if (!therapistProfile) return;
    if (!window.confirm('Reject this therapist? Active client relationships will be revoked.')) return;
    await rejectTherapist(therapistProfile.id);
    load();
  };

  return (
    <div>
      <Link to="/users" style={styles.back}>Back to users</Link>

      <div style={styles.profileCard}>
        <div>
          <h1 style={styles.name}>{user.name}</h1>
          <div style={styles.email}>{user.email}</div>
          <div style={styles.meta}>
            Joined {fmtShortDate(user.created_at)}
            {user.timezone && <> &middot; {user.timezone}</>}
            {user.oauth_provider && <> &middot; {user.oauth_provider}</>}
            {user.is_admin && <span style={styles.adminBadge}>Admin</span>}
            {therapistProfile && (
              <span style={therapistProfile.license_verified ? styles.therapistVerified : styles.therapistPending}>
                {therapistProfile.license_verified ? 'Verified Therapist' : 'Therapist (Pending)'}
              </span>
            )}
          </div>
        </div>
      </div>

      {therapistProfile && (
        <div style={styles.therapistCard}>
          <h2 style={styles.sectionTitle}>Therapist Profile</h2>
          <div style={styles.therapistGrid}>
            <div style={styles.therapistField}>
              <span style={styles.fieldLabel}>License Type</span>
              <span style={styles.fieldValue}>{therapistProfile.license_type}</span>
            </div>
            <div style={styles.therapistField}>
              <span style={styles.fieldLabel}>License #</span>
              <span style={styles.fieldValue}>{therapistProfile.license_number}</span>
            </div>
            <div style={styles.therapistField}>
              <span style={styles.fieldLabel}>State</span>
              <span style={styles.fieldValue}>{therapistProfile.license_state}</span>
            </div>
            {therapistProfile.practice_name && (
              <div style={styles.therapistField}>
                <span style={styles.fieldLabel}>Practice</span>
                <span style={styles.fieldValue}>{therapistProfile.practice_name}</span>
              </div>
            )}
            <div style={styles.therapistField}>
              <span style={styles.fieldLabel}>Registered</span>
              <span style={styles.fieldValue}>{fmtShortDate(therapistProfile.created_at)}</span>
            </div>
            {therapistProfile.verified_at && (
              <div style={styles.therapistField}>
                <span style={styles.fieldLabel}>Verified</span>
                <span style={styles.fieldValue}>{fmtShortDate(therapistProfile.verified_at)}</span>
              </div>
            )}
          </div>
          <div style={styles.therapistActions}>
            {!therapistProfile.license_verified && (
              <button onClick={handleVerify} style={styles.verifyBtn}>
                Verify Therapist
              </button>
            )}
            <button onClick={handleReject} style={styles.rejectBtn}>
              {therapistProfile.license_verified ? 'Revoke Verification' : 'Reject'}
            </button>
          </div>
        </div>
      )}

      <div style={styles.statsRow}>
        <StatCard label="Check-ins" value={counts?.check_ins} sub={`${engagement?.check_ins_7d || 0} last 7d`} />
        <StatCard label="Journals" value={counts?.journals} />
        <StatCard label="Meditations" value={counts?.meditations} />
        <StatCard label="Visions" value={counts?.visions} />
      </div>

      <div style={styles.grid}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Recent Sessions</h2>
          {recentSessions?.length > 0 ? (
            <div style={styles.list}>
              {recentSessions.map((s) => {
                const dur = s.duration_seconds;
                const durStr = dur
                  ? dur >= 60 ? `${Math.floor(dur / 60)}m ${dur % 60}s` : `${dur}s`
                  : 'Active';
                return (
                  <div key={s.session_id} style={styles.listItem}>
                    <div style={styles.listMain}>
                      <span style={styles.listMeta}>
                        {durStr} &middot; {s.screens_visited} screens &middot; {s.platform}
                      </span>
                    </div>
                    <div style={styles.listDate}>{fmtDate(s.started_at)}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={styles.empty}>No sessions</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value ?? 0}</div>
      {sub && <div style={styles.statSub}>{sub}</div>}
    </div>
  );
}

const styles = {
  loading: { padding: 40, textAlign: 'center', color: 'var(--text-muted)' },
  back: {
    display: 'inline-block',
    marginBottom: 16,
    fontSize: 13,
    color: 'var(--text-secondary)',
  },
  profileCard: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 24,
    marginBottom: 24,
  },
  name: { fontSize: 24, fontWeight: 700 },
  email: { fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 },
  meta: { fontSize: 13, color: 'var(--text-muted)', marginTop: 8 },
  adminBadge: {
    marginLeft: 8,
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--bg-primary)',
    backgroundColor: 'var(--accent-teal)',
    padding: '2px 8px',
    borderRadius: 4,
  },
  therapistVerified: {
    marginLeft: 8,
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--bg-primary)',
    backgroundColor: 'var(--accent-teal)',
    padding: '2px 8px',
    borderRadius: 4,
  },
  therapistPending: {
    marginLeft: 8,
    fontSize: 11,
    fontWeight: 600,
    color: '#92400e',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    padding: '2px 8px',
    borderRadius: 4,
  },
  therapistCard: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 24,
    marginBottom: 24,
  },
  therapistGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 16,
    marginBottom: 16,
  },
  therapistField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  therapistActions: {
    display: 'flex',
    gap: 8,
    paddingTop: 16,
    borderTop: '1px solid var(--border)',
  },
  verifyBtn: {
    padding: '8px 20px',
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: 'var(--accent-teal)',
    border: 'none',
    borderRadius: 6,
    color: 'white',
    cursor: 'pointer',
  },
  rejectBtn: {
    padding: '8px 20px',
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: 'transparent',
    border: '1px solid #ef4444',
    borderRadius: 6,
    color: '#ef4444',
    cursor: 'pointer',
  },
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
    padding: '16px 20px',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--accent-teal)',
  },
  statSub: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    marginTop: 2,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 24,
  },
  section: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 16,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid var(--border)',
  },
  listMain: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  listMeta: {
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  listDate: {
    fontSize: 12,
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    marginLeft: 12,
  },
  empty: { textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 14 },
};
