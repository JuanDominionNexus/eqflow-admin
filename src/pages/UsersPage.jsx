import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers } from '../api/admin';
import { format, parseISO } from 'date-fns';

export default function UsersPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState('created_at_desc');

  const load = useCallback(() => {
    setLoading(true);
    getUsers({ page, limit: 50, search: search || undefined, sort })
      .then(setData)
      .finally(() => setLoading(false));
  }, [page, search, sort]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleSort = (newSort) => {
    setSort(newSort);
    setPage(1);
  };

  const formatDate = (d) => {
    try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return '—'; }
  };
  const formatDateTime = (d) => {
    try { return format(parseISO(d), 'MMM d, yyyy h:mm a'); } catch { return '—'; }
  };

  return (
    <div>
      <h1 style={styles.title}>Users</h1>

      <div style={styles.toolbar}>
        <form onSubmit={handleSearch} style={styles.searchForm}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={styles.searchInput}
          />
          <button type="submit" style={styles.searchBtn}>Search</button>
        </form>
        <select
          value={sort}
          onChange={(e) => handleSort(e.target.value)}
          style={styles.select}
        >
          <option value="created_at_desc">Newest first</option>
          <option value="created_at_asc">Oldest first</option>
          <option value="name_asc">Name A-Z</option>
          <option value="name_desc">Name Z-A</option>
          <option value="check_ins_desc">Most check-ins</option>
          <option value="last_active_desc">Recently active</option>
        </select>
      </div>

      <div style={styles.tableCard}>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Method</th>
                <th style={styles.th}>Verified</th>
                <th style={styles.th}>Activated</th>
                <th style={styles.th}>Vision</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Check-ins</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Reflected</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Journals</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Meditations</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Reports</th>
                <th style={styles.th}>Joined</th>
                <th style={styles.th}>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {data?.users?.map((user) => (
                <tr
                  key={user.id}
                  style={styles.tr}
                  onClick={() => navigate(`/users/${user.id}`)}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <td style={styles.td}>
                    <div style={styles.userName}>{user.name}</div>
                    <div style={styles.userEmail}>{user.email}</div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.methodBadge}>{user.oauth_provider || 'email'}</span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                      backgroundColor: user.verified_at ? '#14b8a6' : '#6b7280',
                    }} />
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                      backgroundColor: parseInt(user.check_in_count) > 0 ? '#14b8a6' : '#6b7280',
                    }} />
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                      backgroundColor: parseInt(user.vision_count) > 0 ? '#14b8a6' : '#6b7280',
                    }} />
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{user.check_in_count}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{user.reflection_count}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{user.journal_count}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{user.meditation_count}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{user.report_count}</td>
                  <td style={styles.td}>{formatDate(user.created_at)}</td>
                  <td style={styles.td}>{user.last_active ? formatDateTime(user.last_active) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div style={styles.empty}>Loading...</div>}
          {!loading && (!data?.users || data.users.length === 0) && (
            <div style={styles.empty}>No users found</div>
          )}
        </div>

        {data?.pagination && data.pagination.totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              style={styles.pageBtn}
            >
              Previous
            </button>
            <span style={styles.pageInfo}>
              Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} users)
            </span>
            <button
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage(page + 1)}
              style={styles.pageBtn}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  title: { fontSize: 24, fontWeight: 700, marginBottom: 24 },
  toolbar: {
    display: 'flex',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  searchForm: {
    display: 'flex',
    gap: 8,
    flex: 1,
    minWidth: 200,
  },
  searchInput: {
    flex: 1,
    padding: '10px 14px',
    fontSize: 14,
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    outline: 'none',
  },
  searchBtn: {
    padding: '10px 18px',
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: 'var(--accent-teal)',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    cursor: 'pointer',
  },
  select: {
    padding: '10px 14px',
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
  tr: {
    cursor: 'pointer',
    transition: 'background-color 0.1s',
  },
  td: {
    padding: '12px 16px',
    fontSize: 13,
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
  userName: { fontWeight: 600, color: 'var(--text-primary)' },
  userEmail: { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 },
  methodBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    color: 'var(--accent-teal)',
    textTransform: 'capitalize',
  },
  empty: { textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: '16px 24px',
    borderTop: '1px solid var(--border)',
  },
  pageBtn: {
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 500,
    border: '1px solid var(--border)',
    borderRadius: 6,
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: 13,
    color: 'var(--text-muted)',
  },
};
