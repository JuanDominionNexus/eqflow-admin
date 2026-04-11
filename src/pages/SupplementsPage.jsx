import { useState, useEffect, useCallback } from 'react';
import {
  getSupplements,
  updateSupplement,
  addProductOption,
  updateProductOption,
  deleteProductOption,
} from '../api/admin';

const CATEGORIES = [
  'methylation', 'inflammation', 'nutrient', 'sleep', 'cognitive',
  'serotonin', 'gut', 'hormonal', 'recovery', 'multivitamin',
  'hydration', 'specialty', 'dna', 'other',
];

const CATEGORY_LABELS = {
  methylation: 'Methylation',
  inflammation: 'Inflammation / Antioxidant',
  nutrient: 'Vitamins / Nutrients',
  sleep: 'Sleep / Neuro',
  cognitive: 'Dopamine / Cognitive',
  serotonin: 'Serotonin',
  gut: 'Gut / Digestive',
  hormonal: 'Hormonal / Performance',
  recovery: 'Recovery / Cycling',
  multivitamin: 'All-in-One',
  hydration: 'Hydration',
  specialty: 'Specialty',
  dna: 'DNA Kit',
  other: 'Other',
};

const AFFILIATE_STATUSES = ['none', 'live', 'pending', 'rejected'];

function emptyOption(supplementKey) {
  return {
    supplement_key: supplementKey,
    product_key: '',
    brand: '',
    name: '',
    dose: '',
    form: '',
    size: '',
    price_usd: '',
    asin: '',
    amazon_url: '',
    affiliate_network: '',
    affiliate_link: '',
    affiliate_status: 'none',
    commission: '',
    direct_url: '',
    shopify_variant_id: '',
    priority: 0,
    is_preferred: false,
    is_amazon_fallback: false,
    notes: '',
  };
}

export default function SupplementsPage() {
  const [supplements, setSupplements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expanded, setExpanded] = useState({}); // { [supplement_key]: true }
  const [editingOption, setEditingOption] = useState(null); // { mode: 'create'|'edit', option: {...}, supplementKey: string }
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSupplements();
      setSupplements(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load supplements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filtering ──
  const filtered = supplements.filter(s => {
    if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const haystack = `${s.name} ${s.supplement_key} ${(s.options || []).map(o => `${o.brand} ${o.name}`).join(' ')}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  // Group by category
  const grouped = {};
  for (const s of filtered) {
    const cat = CATEGORIES.includes(s.category) ? s.category : 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  }

  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Option CRUD ──
  const handleAddOption = (supplementKey) => {
    setEditingOption({ mode: 'create', option: emptyOption(supplementKey), supplementKey });
    setError(null);
  };

  const handleEditOption = (option, supplementKey) => {
    setEditingOption({ mode: 'edit', option: { ...option }, supplementKey });
    setError(null);
  };

  const handleOptionChange = (field, value) => {
    setEditingOption(prev => ({
      ...prev,
      option: { ...prev.option, [field]: value },
    }));
  };

  const handleSaveOption = async () => {
    if (!editingOption) return;
    setSaving(true);
    setError(null);
    try {
      if (editingOption.mode === 'create') {
        await addProductOption(editingOption.supplementKey, editingOption.option);
      } else {
        await updateProductOption(editingOption.option.id, editingOption.option);
      }
      setEditingOption(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save option');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOption = async () => {
    if (!editingOption || editingOption.mode !== 'edit') return;
    if (!window.confirm(`Delete "${editingOption.option.name}"?`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteProductOption(editingOption.option.id);
      setEditingOption(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete option');
    } finally {
      setSaving(false);
    }
  };

  // ── Stats ──
  const totalSupps = supplements.length;
  const totalOptions = supplements.reduce((n, s) => n + (s.options?.length || 0), 0);
  const withPreferred = supplements.filter(s => s.options?.some(o => o.is_preferred)).length;
  const withAmazon = supplements.filter(s => s.options?.some(o => o.is_amazon_fallback)).length;

  if (loading && supplements.length === 0) {
    return <div style={styles.loading}>Loading supplements...</div>;
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Supplement Catalog</h1>
        <span style={styles.subtitle}>Single source of truth for all product links</span>
      </div>

      {/* Stats */}
      <div style={styles.statsBar}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{totalSupps}</div>
          <div style={styles.statLabel}>Supplements</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{totalOptions}</div>
          <div style={styles.statLabel}>Product Options</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: 'var(--accent-green)' }}>{withPreferred}</div>
          <div style={styles.statLabel}>With Preferred Brand</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: 'var(--accent-blue)' }}>{withAmazon}</div>
          <div style={styles.statLabel}>With Amazon Fallback</div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <input
          type="text"
          placeholder="Search supplements, brands..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
          ))}
        </select>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* Supplement list grouped by category */}
      {CATEGORIES.filter(c => grouped[c]).map(cat => (
        <div key={cat} style={styles.categorySection}>
          <h2 style={styles.categoryTitle}>
            {CATEGORY_LABELS[cat] || cat}
            <span style={styles.categoryCount}>{grouped[cat].length}</span>
          </h2>

          {grouped[cat].map(supp => {
            const isExpanded = expanded[supp.supplement_key];
            const options = supp.options || [];
            const preferred = options.filter(o => o.is_preferred);
            const amazon = options.find(o => o.is_amazon_fallback);

            return (
              <div key={supp.supplement_key} style={styles.suppCard}>
                {/* Supplement header row */}
                <div
                  style={styles.suppHeader}
                  onClick={() => toggle(supp.supplement_key)}
                >
                  <div style={styles.suppHeaderLeft}>
                    <span style={styles.suppName}>{supp.name}</span>
                    <span style={styles.suppKey}>{supp.supplement_key}</span>
                    {supp.default_dose && (
                      <span style={styles.suppDose}>{supp.default_dose}</span>
                    )}
                  </div>
                  <div style={styles.suppHeaderRight}>
                    {preferred.length > 0 && (
                      <span style={styles.brandPill}>
                        {preferred.map(o => o.brand).filter(Boolean).join(', ') || 'Preferred'}
                      </span>
                    )}
                    {amazon && (
                      <span style={styles.amazonPill}>Amazon</span>
                    )}
                    <span style={styles.optionCount}>{options.length} option{options.length !== 1 ? 's' : ''}</span>
                    <span style={styles.expandArrow}>{isExpanded ? '▾' : '▸'}</span>
                  </div>
                </div>

                {/* Expanded: product options */}
                {isExpanded && (
                  <div style={styles.optionsContainer}>
                    {options.length === 0 && (
                      <div style={styles.emptyOptions}>No product options yet</div>
                    )}

                    {options.map(opt => (
                      <div
                        key={opt.id}
                        style={{
                          ...styles.optionRow,
                          borderLeftColor: opt.is_preferred ? 'var(--accent-green)' : opt.is_amazon_fallback ? 'var(--accent-amber)' : 'var(--border)',
                        }}
                        onClick={() => handleEditOption(opt, supp.supplement_key)}
                      >
                        <div style={styles.optionMain}>
                          <div style={styles.optionTop}>
                            <span style={styles.optionBrand}>{opt.brand || '—'}</span>
                            {opt.is_preferred && <span style={styles.tagPreferred}>PREFERRED</span>}
                            {opt.is_amazon_fallback && <span style={styles.tagAmazon}>AMAZON</span>}
                            {opt.affiliate_status === 'live' && <span style={styles.tagLive}>LIVE</span>}
                          </div>
                          <div style={styles.optionName}>{opt.name}</div>
                          <div style={styles.optionLinks}>
                            {opt.affiliate_link && (
                              <a href={opt.affiliate_link} target="_blank" rel="noopener noreferrer" style={styles.linkPill} onClick={e => e.stopPropagation()}>
                                Affiliate
                              </a>
                            )}
                            {opt.direct_url && (
                              <a href={opt.direct_url} target="_blank" rel="noopener noreferrer" style={styles.linkPill} onClick={e => e.stopPropagation()}>
                                Direct
                              </a>
                            )}
                            {opt.amazon_url && (
                              <a href={opt.amazon_url} target="_blank" rel="noopener noreferrer" style={styles.linkPill} onClick={e => e.stopPropagation()}>
                                Amazon
                              </a>
                            )}
                            {!opt.affiliate_link && !opt.direct_url && !opt.amazon_url && (
                              <span style={styles.noLinks}>No links</span>
                            )}
                          </div>
                        </div>
                        <div style={styles.optionMeta}>
                          {opt.affiliate_network && <span style={styles.metaText}>{opt.affiliate_network}</span>}
                          {opt.commission && <span style={styles.metaText}>{opt.commission}</span>}
                          {opt.asin && <span style={styles.metaText}>ASIN: {opt.asin}</span>}
                        </div>
                      </div>
                    ))}

                    <button
                      style={styles.addOptionBtn}
                      onClick={() => handleAddOption(supp.supplement_key)}
                    >
                      + Add Product Option
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Edit/Create Option Modal */}
      {editingOption && (
        <div style={styles.modalOverlay} onClick={() => setEditingOption(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {editingOption.mode === 'create' ? 'Add Product Option' : 'Edit Product Option'}
              <span style={styles.modalSubtitle}>{editingOption.supplementKey}</span>
            </h3>

            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Product Key *</label>
                <input
                  style={styles.input}
                  value={editingOption.option.product_key}
                  onChange={e => handleOptionChange('product_key', e.target.value)}
                  placeholder="zinc_thorne"
                  disabled={editingOption.mode === 'edit'}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Brand</label>
                <input
                  style={styles.input}
                  value={editingOption.option.brand}
                  onChange={e => handleOptionChange('brand', e.target.value)}
                  placeholder="Thorne"
                />
              </div>
              <div style={styles.formGroupFull}>
                <label style={styles.label}>Product Name *</label>
                <input
                  style={styles.input}
                  value={editingOption.option.name}
                  onChange={e => handleOptionChange('name', e.target.value)}
                  placeholder="Zinc Bisglycinate 30mg (60 caps)"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>ASIN</label>
                <input
                  style={styles.input}
                  value={editingOption.option.asin}
                  onChange={e => handleOptionChange('asin', e.target.value)}
                  placeholder="B000B8RCQE"
                />
              </div>
              <div style={styles.formGroupFull}>
                <label style={styles.label}>Amazon URL</label>
                <input
                  style={styles.input}
                  value={editingOption.option.amazon_url}
                  onChange={e => handleOptionChange('amazon_url', e.target.value)}
                  placeholder="https://www.amazon.com/dp/..."
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Affiliate Network</label>
                <input
                  style={styles.input}
                  value={editingOption.option.affiliate_network}
                  onChange={e => handleOptionChange('affiliate_network', e.target.value)}
                  placeholder="Seeking Health"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Affiliate Status</label>
                <select
                  style={styles.input}
                  value={editingOption.option.affiliate_status}
                  onChange={e => handleOptionChange('affiliate_status', e.target.value)}
                >
                  {AFFILIATE_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroupFull}>
                <label style={styles.label}>Affiliate Link</label>
                <input
                  style={styles.input}
                  value={editingOption.option.affiliate_link}
                  onChange={e => handleOptionChange('affiliate_link', e.target.value)}
                  placeholder="https://www.seekinghealth.com/products/...?rfsn=..."
                />
              </div>
              <div style={styles.formGroupFull}>
                <label style={styles.label}>Direct URL (brand site, no affiliate tag)</label>
                <input
                  style={styles.input}
                  value={editingOption.option.direct_url}
                  onChange={e => handleOptionChange('direct_url', e.target.value)}
                  placeholder="https://www.thorne.com/products/..."
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Commission</label>
                <input
                  style={styles.input}
                  value={editingOption.option.commission}
                  onChange={e => handleOptionChange('commission', e.target.value)}
                  placeholder="20%"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Shopify Variant ID</label>
                <input
                  style={styles.input}
                  value={editingOption.option.shopify_variant_id}
                  onChange={e => handleOptionChange('shopify_variant_id', e.target.value)}
                  placeholder="19211584110710"
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Priority (0 = highest)</label>
                <input
                  style={styles.input}
                  type="number"
                  value={editingOption.option.priority}
                  onChange={e => handleOptionChange('priority', parseInt(e.target.value) || 0)}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Size</label>
                <input
                  style={styles.input}
                  value={editingOption.option.size}
                  onChange={e => handleOptionChange('size', e.target.value)}
                  placeholder="60 caps"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={editingOption.option.is_preferred}
                    onChange={e => handleOptionChange('is_preferred', e.target.checked)}
                  />
                  Preferred Brand
                </label>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={editingOption.option.is_amazon_fallback}
                    onChange={e => handleOptionChange('is_amazon_fallback', e.target.checked)}
                  />
                  Amazon Fallback
                </label>
              </div>
              <div style={styles.formGroupFull}>
                <label style={styles.label}>Notes</label>
                <input
                  style={styles.input}
                  value={editingOption.option.notes}
                  onChange={e => handleOptionChange('notes', e.target.value)}
                />
              </div>
            </div>

            {error && <div style={styles.modalError}>{error}</div>}

            <div style={styles.modalActions}>
              {editingOption.mode === 'edit' && (
                <button style={styles.deleteBtn} onClick={handleDeleteOption} disabled={saving}>
                  Delete
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button style={styles.cancelBtn} onClick={() => setEditingOption(null)}>Cancel</button>
              <button style={styles.saveBtn} onClick={handleSaveOption} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ──

const styles = {
  loading: { padding: 40, color: 'var(--text-secondary)', textAlign: 'center' },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' },
  subtitle: { fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, display: 'block' },

  statsBar: { display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' },
  statCard: {
    background: 'var(--bg-card)', borderRadius: 12, padding: '16px 24px',
    flex: '1 1 140px', minWidth: 140,
  },
  statValue: { fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' },
  statLabel: { fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

  toolbar: { display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' },
  searchInput: {
    flex: '1 1 300px', padding: '10px 16px', borderRadius: 10,
    border: '1px solid var(--border)', background: 'var(--bg-secondary)',
    color: 'var(--text-primary)', fontSize: 14, outline: 'none',
  },
  filterSelect: {
    padding: '10px 16px', borderRadius: 10,
    border: '1px solid var(--border)', background: 'var(--bg-secondary)',
    color: 'var(--text-primary)', fontSize: 14, outline: 'none',
  },

  errorBanner: {
    background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '12px 16px',
    borderRadius: 10, marginBottom: 16, fontSize: 14,
  },

  categorySection: { marginBottom: 32 },
  categoryTitle: {
    fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  categoryCount: {
    background: 'var(--bg-card)', borderRadius: 10, padding: '2px 8px',
    fontSize: 12, fontWeight: 600,
  },

  suppCard: {
    background: 'var(--bg-card)', borderRadius: 12, marginBottom: 8,
    border: '1px solid var(--border)', overflow: 'hidden',
  },
  suppHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 20px', cursor: 'pointer', gap: 12,
  },
  suppHeaderLeft: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1 },
  suppHeaderRight: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  suppName: { fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' },
  suppKey: { fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' },
  suppDose: {
    fontSize: 11, color: 'var(--accent-teal)', background: 'rgba(20,184,166,0.1)',
    padding: '2px 8px', borderRadius: 6, fontWeight: 600,
  },
  brandPill: {
    fontSize: 11, color: 'var(--accent-green)', background: 'rgba(34,197,94,0.1)',
    padding: '2px 8px', borderRadius: 6, fontWeight: 600,
  },
  amazonPill: {
    fontSize: 11, color: 'var(--accent-amber)', background: 'rgba(245,158,11,0.1)',
    padding: '2px 8px', borderRadius: 6, fontWeight: 600,
  },
  optionCount: { fontSize: 12, color: 'var(--text-muted)' },
  expandArrow: { fontSize: 14, color: 'var(--text-muted)', width: 16, textAlign: 'center' },

  optionsContainer: {
    borderTop: '1px solid var(--border)', padding: '12px 20px 16px',
    background: 'var(--bg-secondary)',
  },
  emptyOptions: { color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' },

  optionRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '12px 16px', borderRadius: 10, marginBottom: 8,
    background: 'var(--bg-card)', cursor: 'pointer',
    borderLeft: '3px solid var(--border)', gap: 16,
    transition: 'background 0.15s',
  },
  optionMain: { flex: 1, minWidth: 0 },
  optionTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  optionBrand: { fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' },
  optionName: { fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 },
  optionLinks: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  optionMeta: { display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end', flexShrink: 0 },
  metaText: { fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' },

  tagPreferred: {
    fontSize: 10, fontWeight: 700, color: 'var(--accent-green)',
    background: 'rgba(34,197,94,0.15)', padding: '1px 6px', borderRadius: 4,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  tagAmazon: {
    fontSize: 10, fontWeight: 700, color: 'var(--accent-amber)',
    background: 'rgba(245,158,11,0.15)', padding: '1px 6px', borderRadius: 4,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  tagLive: {
    fontSize: 10, fontWeight: 700, color: '#22c55e',
    background: 'rgba(34,197,94,0.15)', padding: '1px 6px', borderRadius: 4,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  linkPill: {
    fontSize: 11, color: 'var(--accent-teal)', background: 'rgba(20,184,166,0.1)',
    padding: '2px 8px', borderRadius: 4, textDecoration: 'none', fontWeight: 500,
  },
  noLinks: { fontSize: 11, color: 'var(--accent-red)', fontStyle: 'italic' },

  addOptionBtn: {
    width: '100%', padding: '10px 0', marginTop: 4,
    background: 'transparent', border: '1px dashed var(--border)',
    borderRadius: 10, color: 'var(--text-secondary)', fontSize: 13,
    cursor: 'pointer', fontWeight: 600,
  },

  // Modal
  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 24,
  },
  modal: {
    background: 'var(--bg-card)', borderRadius: 16, padding: 32,
    width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto',
    border: '1px solid var(--border)',
  },
  modalTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 },
  modalSubtitle: {
    fontSize: 13, color: 'var(--text-muted)', fontFamily: 'monospace',
    marginLeft: 12, fontWeight: 400,
  },
  modalError: {
    background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '10px 14px',
    borderRadius: 8, marginTop: 16, fontSize: 13,
  },
  modalActions: {
    display: 'flex', gap: 12, marginTop: 24, alignItems: 'center',
  },

  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 16px' },
  formGroup: {},
  formGroupFull: { gridColumn: '1 / -1' },
  label: {
    display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  checkboxLabel: {
    display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
    color: 'var(--text-primary)', cursor: 'pointer', paddingTop: 20,
  },
  input: {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-secondary)',
    color: 'var(--text-primary)', fontSize: 14, outline: 'none',
    fontFamily: 'inherit',
  },

  saveBtn: {
    padding: '10px 24px', borderRadius: 10, border: 'none',
    background: 'var(--accent-teal)', color: '#fff', fontSize: 14,
    fontWeight: 600, cursor: 'pointer',
  },
  cancelBtn: {
    padding: '10px 24px', borderRadius: 10, border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text-secondary)', fontSize: 14,
    fontWeight: 600, cursor: 'pointer',
  },
  deleteBtn: {
    padding: '10px 24px', borderRadius: 10, border: '1px solid var(--accent-red)',
    background: 'transparent', color: 'var(--accent-red)', fontSize: 14,
    fontWeight: 600, cursor: 'pointer',
  },
};
