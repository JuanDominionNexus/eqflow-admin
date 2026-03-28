import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import {
  getProducts,
  getProductStats,
  createProduct,
  updateProduct,
  deleteProduct,
  importProducts,
  getAffiliateNetworks,
  createAffiliateNetwork,
  updateAffiliateNetwork,
  fetchAmazonData,
  enrichProducts,
} from '../api/admin';

const CATEGORIES = ['methylation', 'inflammation', 'nutrient', 'drug_safety', 'phenotype', 'exercise', 'other'];

const CATEGORY_LABELS = {
  methylation: 'Methylation',
  inflammation: 'Inflammation',
  nutrient: 'Nutrient',
  drug_safety: 'Drug Safety',
  phenotype: 'Phenotype',
  exercise: 'Exercise',
  other: 'Other',
};

const NETWORK_STATUS_COLORS = {
  live: '#22c55e',
  pending: '#f59e0b',
  applied: '#0ea5e9',
  to_apply: '#6b7280',
  rejected: '#ef4444',
};

const AFFILIATE_STATUSES = ['none', 'live', 'pending', 'rejected'];
const NETWORK_STATUSES = ['live', 'pending', 'applied', 'to_apply', 'rejected'];

function formatDate(d) {
  if (!d) return '';
  try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return ''; }
}

function emptyProduct() {
  return {
    product_key: '',
    name: '',
    brand: '',
    category: 'methylation',
    dose: '',
    form: '',
    price_usd: '',
    asin: '',
    direct_url: '',
    affiliate_network: '',
    affiliate_link: '',
    commission: '',
    affiliate_status: 'none',
    available_us: true,
    available_uk: false,
    available_eu: false,
    available_intl: false,
    notes: '',
    sku: '',
    size: '',
    image_url: '',
    description: '',
    ingredients: '',
  };
}

function emptyNetwork() {
  return {
    name: '',
    short_name: '',
    status: 'to_apply',
    commission: '',
    dashboard_url: '',
    contact_name: '',
    contact_email: '',
    affiliate_tag: '',
    affiliate_link: '',
    notes: '',
    applied_at: '',
    approved_at: '',
  };
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [editModal, setEditModal] = useState(null); // null | { mode: 'create'|'edit', product: {...} }
  const [networkModal, setNetworkModal] = useState(null); // null | { mode: 'create'|'edit', network: {...} }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [fetchingAmazon, setFetchingAmazon] = useState(false);
  const [amazonResult, setAmazonResult] = useState(null);
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, n, s] = await Promise.all([
        getProducts(),
        getAffiliateNetworks(),
        getProductStats(),
      ]);
      setProducts(p);
      setNetworks(n);
      setStats(s);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filtering ──

  const filtered = products.filter(p => {
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const haystack = `${p.name} ${p.brand} ${p.product_key}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  // ── Group by category ──

  const grouped = {};
  for (const cat of CATEGORIES) {
    const items = filtered.filter(p => p.category === cat);
    if (items.length > 0) grouped[cat] = items;
  }
  // catch any uncategorized
  const uncategorized = filtered.filter(p => !CATEGORIES.includes(p.category));
  if (uncategorized.length > 0) grouped['other'] = [...(grouped['other'] || []), ...uncategorized];

  const toggleCategory = (cat) => {
    setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // ── Product CRUD ──

  const handleOpenCreate = () => {
    setEditModal({ mode: 'create', product: emptyProduct() });
    setError(null);
  };

  const handleOpenEdit = (product) => {
    setEditModal({ mode: 'edit', product: { ...product } });
    setError(null);
  };

  const handleProductChange = (field, value) => {
    setEditModal(prev => ({
      ...prev,
      product: { ...prev.product, [field]: value },
    }));
  };

  const handleSaveProduct = async () => {
    if (!editModal) return;
    setSaving(true);
    setError(null);
    try {
      if (editModal.mode === 'create') {
        await createProduct(editModal.product);
      } else {
        await updateProduct(editModal.product.id, editModal.product);
      }
      setEditModal(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!editModal || editModal.mode !== 'edit') return;
    if (!window.confirm(`Delete "${editModal.product.name}"? This cannot be undone.`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteProduct(editModal.product.id);
      setEditModal(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete product');
    } finally {
      setSaving(false);
    }
  };

  // ── Network CRUD ──

  const handleOpenNetworkCreate = () => {
    setNetworkModal({ mode: 'create', network: emptyNetwork() });
    setError(null);
  };

  const handleOpenNetworkEdit = (network) => {
    setNetworkModal({ mode: 'edit', network: { ...network } });
    setError(null);
  };

  const handleNetworkChange = (field, value) => {
    setNetworkModal(prev => ({
      ...prev,
      network: { ...prev.network, [field]: value },
    }));
  };

  const handleSaveNetwork = async () => {
    if (!networkModal) return;
    setSaving(true);
    setError(null);
    try {
      if (networkModal.mode === 'create') {
        await createAffiliateNetwork(networkModal.network);
      } else {
        await updateAffiliateNetwork(networkModal.network.id, networkModal.network);
      }
      setNetworkModal(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save network');
    } finally {
      setSaving(false);
    }
  };

  // ── Import ──

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setImporting(true);
      setError(null);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await importProducts(data);
        await load();
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Import failed');
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  // ── Fetch Amazon data ──

  const handleFetchAmazon = async () => {
    if (!window.confirm('Fetch latest prices and images from Amazon PA-API for all products?')) return;
    setFetchingAmazon(true);
    setAmazonResult(null);
    setError(null);
    try {
      const result = await fetchAmazonData(true);
      setAmazonResult(result);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Amazon fetch failed');
    } finally {
      setFetchingAmazon(false);
    }
  };

  const handleEnrich = async () => {
    setEnriching(true);
    setEnrichResult(null);
    setError(null);
    try {
      const result = await enrichProducts();
      setEnrichResult(result);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Enrichment failed');
    } finally {
      setEnriching(false);
    }
  };

  // ── Computed stats ──

  const totalActive = stats?.total_active ?? products.length;
  const liveNetworks = networks.filter(n => n.status === 'live').length;
  const pendingNetworks = networks.filter(n => n.status === 'pending' || n.status === 'applied').length;
  const missingLinks = stats?.missing_affiliate ?? products.filter(p => !p.affiliate_link && !p.direct_url).length;

  if (loading && products.length === 0) {
    return <div style={styles.loading}>Loading products...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Products & Affiliates</h1>
      </div>

      {/* Stats bar */}
      <div style={styles.statsBar}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{totalActive}</div>
          <div style={styles.statLabel}>Active Products</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>
            <span style={{ color: 'var(--accent-green)' }}>{liveNetworks}</span>
            {' / '}
            <span style={{ color: 'var(--accent-amber)' }}>{pendingNetworks}</span>
          </div>
          <div style={styles.statLabel}>Live / Pending Networks</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: missingLinks > 0 ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
            {missingLinks}
          </div>
          <div style={styles.statLabel}>
            {missingLinks > 0 ? 'Missing Affiliate Links' : 'All Links Set'}
          </div>
        </div>
      </div>

      {/* Network Status */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Affiliate Networks</h2>
          <button style={styles.addNetworkBtn} onClick={handleOpenNetworkCreate}>+ Add Network</button>
        </div>
        <div style={styles.networkPills}>
          {networks.map(n => (
            <button
              key={n.id}
              style={styles.networkPill}
              onClick={() => handleOpenNetworkEdit(n)}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
            >
              <span
                style={{
                  ...styles.statusDot,
                  backgroundColor: NETWORK_STATUS_COLORS[n.status] || '#6b7280',
                }}
              />
              <span style={styles.networkPillName}>{n.name}</span>
              {n.commission && <span style={styles.networkPillComm}>{n.commission}</span>}
            </button>
          ))}
          {networks.length === 0 && (
            <span style={styles.emptyInline}>No networks yet</span>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <input
          type="text"
          placeholder="Search by name, brand, or key..."
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
        <button style={styles.importBtn} onClick={handleImport} disabled={importing}>
          {importing ? 'Importing...' : 'Import from JSON'}
        </button>
        <button style={styles.importBtn} onClick={handleEnrich} disabled={enriching}>
          {enriching ? 'Enriching...' : '📦 Enrich Data'}
        </button>
        <button style={{ ...styles.importBtn, opacity: 0.5, cursor: 'not-allowed' }} disabled title="Amazon PA-API credentials not configured">
          🔄 Amazon Data
        </button>
        <button style={styles.addProductBtn} onClick={handleOpenCreate}>+ Add Product</button>
      </div>

      {enrichResult && (
        <div style={{ ...styles.successBanner, marginBottom: 12 }}>
          Enrichment complete — {enrichResult.updated} updated, {enrichResult.skipped} already enriched, {enrichResult.missing} no data
          <button onClick={() => setEnrichResult(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 8 }}>✕</button>
        </div>
      )}

      {/* Product Table (grouped) */}
      {Object.keys(grouped).length === 0 && (
        <div style={styles.empty}>No products match your filters</div>
      )}

      {Object.entries(grouped).map(([cat, items]) => {
        const isCollapsed = collapsedCategories[cat];
        return (
          <div key={cat} style={styles.categorySection}>
            <div
              style={styles.categoryHeader}
              onClick={() => toggleCategory(cat)}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={{ ...styles.chevron, transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}>
                &rsaquo;
              </span>
              <span style={styles.categoryName}>{CATEGORY_LABELS[cat] || cat}</span>
              <span style={styles.categoryCount}>{items.length}</span>
            </div>
            {!isCollapsed && (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Product</th>
                      <th style={styles.th}>Price</th>
                      <th style={styles.th}>Commission</th>
                      <th style={styles.th}>ASIN</th>
                      <th style={styles.th}>Affiliate</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(p => (
                      <tr
                        key={p.id}
                        style={styles.tr}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <td style={styles.td}>
                          <div style={styles.productName}>{p.name}</div>
                          <div style={styles.productBrand}>{p.brand}</div>
                        </td>
                        <td style={styles.td}>
                          {p.price_usd ? `$${p.price_usd}` : '—'}
                        </td>
                        <td style={styles.td}>
                          {p.commission || '—'}
                        </td>
                        <td style={styles.td}>
                          <span style={styles.asinText}>{p.asin || '—'}</span>
                        </td>
                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.statusDot,
                              backgroundColor:
                                p.affiliate_status === 'live' ? '#22c55e' :
                                p.affiliate_status === 'pending' ? '#f59e0b' :
                                p.affiliate_status === 'rejected' ? '#ef4444' :
                                '#6b7280',
                            }}
                          />
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', display: 'flex', gap: 6 }}>
                          {(p.affiliate_link || p.direct_url || p.asin) && (
                            <button
                              style={styles.copyBtn}
                              onClick={() => {
                                const link = p.affiliate_link || p.direct_url || (p.asin ? `https://www.amazon.com/dp/${p.asin}?tag=astrolabela09-20` : '');
                                navigator.clipboard.writeText(link);
                              }}
                              title={p.affiliate_link || p.direct_url || ''}
                            >
                              Copy Link
                            </button>
                          )}
                          <button
                            style={styles.editBtn}
                            onClick={() => handleOpenEdit(p)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* ── Product Edit Modal ── */}
      {editModal && (
        <div style={styles.overlay} onClick={() => setEditModal(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editModal.mode === 'create' ? 'Add Product' : 'Edit Product'}
              </h2>
              <button style={styles.closeBtn} onClick={() => setEditModal(null)}>&times;</button>
            </div>
            <div style={styles.modalBody}>
              {error && <div style={styles.errorBanner}>{error}</div>}

              <div style={styles.fieldRow}>
                <div style={styles.fieldHalf}>
                  <label style={styles.label}>Product Key</label>
                  <input
                    type="text"
                    value={editModal.product.product_key}
                    onChange={e => handleProductChange('product_key', e.target.value)}
                    readOnly={editModal.mode === 'edit'}
                    style={{ ...styles.input, ...(editModal.mode === 'edit' ? styles.inputReadonly : {}) }}
                    placeholder="e.g. folinic_acid"
                  />
                </div>
                <div style={styles.fieldHalf}>
                  <label style={styles.label}>Category</label>
                  <select
                    value={editModal.product.category}
                    onChange={e => handleProductChange('category', e.target.value)}
                    style={styles.select}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.fieldRow}>
                <div style={styles.fieldHalf}>
                  <label style={styles.label}>Name</label>
                  <input
                    type="text"
                    value={editModal.product.name}
                    onChange={e => handleProductChange('name', e.target.value)}
                    style={styles.input}
                    placeholder="Product name"
                  />
                </div>
                <div style={styles.fieldHalf}>
                  <label style={styles.label}>Brand</label>
                  <input
                    type="text"
                    value={editModal.product.brand}
                    onChange={e => handleProductChange('brand', e.target.value)}
                    style={styles.input}
                    placeholder="Brand name"
                  />
                </div>
              </div>

              <div style={styles.fieldRow}>
                <div style={styles.fieldThird}>
                  <label style={styles.label}>Dose</label>
                  <input
                    type="text"
                    value={editModal.product.dose || ''}
                    onChange={e => handleProductChange('dose', e.target.value)}
                    style={styles.input}
                    placeholder="e.g. 500mg"
                  />
                </div>
                <div style={styles.fieldThird}>
                  <label style={styles.label}>Form</label>
                  <input
                    type="text"
                    value={editModal.product.form || ''}
                    onChange={e => handleProductChange('form', e.target.value)}
                    style={styles.input}
                    placeholder="e.g. capsule"
                  />
                </div>
                <div style={styles.fieldThird}>
                  <label style={styles.label}>Price (USD)</label>
                  <input
                    type="text"
                    value={editModal.product.price_usd || ''}
                    onChange={e => handleProductChange('price_usd', e.target.value)}
                    style={styles.input}
                    placeholder="e.g. 27.00"
                  />
                </div>
              </div>

              <div style={styles.fieldRow}>
                <div style={styles.fieldHalf}>
                  <label style={styles.label}>ASIN</label>
                  <input
                    type="text"
                    value={editModal.product.asin || ''}
                    onChange={e => handleProductChange('asin', e.target.value)}
                    style={styles.input}
                    placeholder="Amazon ASIN"
                  />
                </div>
                <div style={styles.fieldHalf}>
                  <label style={styles.label}>Direct URL</label>
                  <input
                    type="text"
                    value={editModal.product.direct_url || ''}
                    onChange={e => handleProductChange('direct_url', e.target.value)}
                    style={styles.input}
                    placeholder="Brand direct link"
                  />
                </div>
              </div>

              <div style={styles.fieldRow}>
                <div style={styles.fieldThird}>
                  <label style={styles.label}>Affiliate Network</label>
                  <select
                    value={editModal.product.affiliate_network || ''}
                    onChange={e => handleProductChange('affiliate_network', e.target.value)}
                    style={styles.select}
                  >
                    <option value="">None</option>
                    {networks.map(n => (
                      <option key={n.id} value={n.short_name || n.name}>{n.name}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.fieldThird}>
                  <label style={styles.label}>Affiliate Link</label>
                  <input
                    type="text"
                    value={editModal.product.affiliate_link || ''}
                    onChange={e => handleProductChange('affiliate_link', e.target.value)}
                    style={styles.input}
                    placeholder="Affiliate URL"
                  />
                </div>
                <div style={styles.fieldThird}>
                  <label style={styles.label}>Commission</label>
                  <input
                    type="text"
                    value={editModal.product.commission || ''}
                    onChange={e => handleProductChange('commission', e.target.value)}
                    style={styles.input}
                    placeholder="e.g. 20%"
                  />
                </div>
              </div>

              <div style={styles.fieldRow}>
                <div style={styles.fieldHalf}>
                  <label style={styles.label}>Affiliate Status</label>
                  <select
                    value={editModal.product.affiliate_status || 'none'}
                    onChange={e => handleProductChange('affiliate_status', e.target.value)}
                    style={styles.select}
                  >
                    {AFFILIATE_STATUSES.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.fieldRow}>
                <label style={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    checked={editModal.product.available_us ?? false}
                    onChange={e => handleProductChange('available_us', e.target.checked)}
                  />
                  <span style={styles.checkboxLabel}>US</span>
                </label>
                <label style={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    checked={editModal.product.available_uk ?? false}
                    onChange={e => handleProductChange('available_uk', e.target.checked)}
                  />
                  <span style={styles.checkboxLabel}>UK</span>
                </label>
                <label style={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    checked={editModal.product.available_eu ?? false}
                    onChange={e => handleProductChange('available_eu', e.target.checked)}
                  />
                  <span style={styles.checkboxLabel}>EU</span>
                </label>
                <label style={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    checked={editModal.product.available_intl ?? false}
                    onChange={e => handleProductChange('available_intl', e.target.checked)}
                  />
                  <span style={styles.checkboxLabel}>International</span>
                </label>
              </div>

              <div style={styles.sectionDivider}>Product Details</div>

              <div style={styles.fieldRow}>
                <div style={styles.field}>
                  <label style={styles.label}>SKU</label>
                  <input value={editModal.product.sku || ''} onChange={e => handleProductChange('sku', e.target.value)} style={styles.input} placeholder="e.g. SH-HB12-60" />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Size</label>
                  <input value={editModal.product.size || ''} onChange={e => handleProductChange('size', e.target.value)} style={styles.input} placeholder="e.g. 120 caps" />
                </div>
              </div>

              <div style={styles.fieldFull}>
                <label style={styles.label}>Image URL</label>
                <input value={editModal.product.image_url || ''} onChange={e => handleProductChange('image_url', e.target.value)} style={styles.input} placeholder="https://..." />
              </div>

              <div style={styles.fieldFull}>
                <label style={styles.label}>Description</label>
                <textarea
                  value={editModal.product.description || ''}
                  onChange={e => handleProductChange('description', e.target.value)}
                  style={styles.textarea}
                  rows={2}
                  placeholder="Product description..."
                />
              </div>

              <div style={styles.fieldFull}>
                <label style={styles.label}>Ingredients</label>
                <textarea
                  value={editModal.product.ingredients || ''}
                  onChange={e => handleProductChange('ingredients', e.target.value)}
                  style={styles.textarea}
                  rows={3}
                  placeholder="Active ingredients list..."
                />
              </div>

              <div style={styles.fieldFull}>
                <label style={styles.label}>Notes</label>
                <textarea
                  value={editModal.product.notes || ''}
                  onChange={e => handleProductChange('notes', e.target.value)}
                  style={styles.textarea}
                  rows={3}
                  placeholder="Internal notes..."
                />
              </div>
            </div>
            <div style={styles.modalFooter}>
              {editModal.mode === 'edit' && (
                <button
                  style={styles.deleteBtn}
                  onClick={handleDeleteProduct}
                  disabled={saving}
                >
                  Delete
                </button>
              )}
              <div style={styles.modalFooterRight}>
                <button style={styles.cancelBtn} onClick={() => setEditModal(null)}>Cancel</button>
                <button
                  style={{ ...styles.saveBtn, ...(saving ? styles.saveBtnDisabled : {}) }}
                  onClick={handleSaveProduct}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Network Edit Modal ── */}
      {networkModal && (
        <div style={styles.overlay} onClick={() => setNetworkModal(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {networkModal.mode === 'create' ? 'Add Network' : 'Edit Network'}
              </h2>
              <button style={styles.closeBtn} onClick={() => setNetworkModal(null)}>&times;</button>
            </div>
            <div style={styles.modalBody}>
              {error && <div style={styles.errorBanner}>{error}</div>}

              <div style={styles.fieldRow}>
                <div style={styles.fieldHalf}>
                  <label style={styles.label}>Name</label>
                  <input
                    type="text"
                    value={networkModal.network.name}
                    onChange={e => handleNetworkChange('name', e.target.value)}
                    style={styles.input}
                    placeholder="e.g. Amazon Associates"
                  />
                </div>
                <div style={styles.fieldHalf}>
                  <label style={styles.label}>Short Name</label>
                  <input
                    type="text"
                    value={networkModal.network.short_name || ''}
                    onChange={e => handleNetworkChange('short_name', e.target.value)}
                    style={styles.input}
                    placeholder="e.g. Amazon"
                  />
                </div>
              </div>

              <div style={styles.fieldRow}>
                <div style={styles.fieldHalf}>
                  <label style={styles.label}>Status</label>
                  <select
                    value={networkModal.network.status}
                    onChange={e => handleNetworkChange('status', e.target.value)}
                    style={styles.select}
                  >
                    {NETWORK_STATUSES.map(s => (
                      <option key={s} value={s}>
                        {s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.fieldHalf}>
                  <label style={styles.label}>Commission</label>
                  <input
                    type="text"
                    value={networkModal.network.commission || ''}
                    onChange={e => handleNetworkChange('commission', e.target.value)}
                    style={styles.input}
                    placeholder="e.g. 15-20%"
                  />
                </div>
              </div>

              <div style={styles.fieldRow}>
                <div style={styles.fieldFull}>
                  <label style={styles.label}>Dashboard URL</label>
                  <input
                    type="text"
                    value={networkModal.network.dashboard_url || ''}
                    onChange={e => handleNetworkChange('dashboard_url', e.target.value)}
                    style={styles.input}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div style={styles.fieldRow}>
                <div style={styles.fieldHalf}>
                  <label style={styles.label}>Contact Name</label>
                  <input
                    type="text"
                    value={networkModal.network.contact_name || ''}
                    onChange={e => handleNetworkChange('contact_name', e.target.value)}
                    style={styles.input}
                    placeholder="Contact person"
                  />
                </div>
                <div style={styles.fieldHalf}>
                  <label style={styles.label}>Contact Email</label>
                  <input
                    type="text"
                    value={networkModal.network.contact_email || ''}
                    onChange={e => handleNetworkChange('contact_email', e.target.value)}
                    style={styles.input}
                    placeholder="email@network.com"
                  />
                </div>
              </div>

              <div style={styles.fieldRow}>
                <div style={styles.fieldHalf}>
                  <label style={styles.label}>Affiliate Tag</label>
                  <input
                    type="text"
                    value={networkModal.network.affiliate_tag || ''}
                    onChange={e => handleNetworkChange('affiliate_tag', e.target.value)}
                    style={styles.input}
                    placeholder="e.g. astrolabela09-20"
                  />
                </div>
                <div style={styles.fieldHalf}>
                  <label style={styles.label}>Affiliate Link</label>
                  <input
                    type="text"
                    value={networkModal.network.affiliate_link || ''}
                    onChange={e => handleNetworkChange('affiliate_link', e.target.value)}
                    style={styles.input}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div style={styles.fieldRow}>
                <div style={styles.fieldHalf}>
                  <label style={styles.label}>Applied At</label>
                  <input
                    type="date"
                    value={networkModal.network.applied_at ? networkModal.network.applied_at.slice(0, 10) : ''}
                    onChange={e => handleNetworkChange('applied_at', e.target.value || null)}
                    style={styles.input}
                  />
                </div>
                <div style={styles.fieldHalf}>
                  <label style={styles.label}>Approved At</label>
                  <input
                    type="date"
                    value={networkModal.network.approved_at ? networkModal.network.approved_at.slice(0, 10) : ''}
                    onChange={e => handleNetworkChange('approved_at', e.target.value || null)}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.fieldFull}>
                <label style={styles.label}>Notes</label>
                <textarea
                  value={networkModal.network.notes || ''}
                  onChange={e => handleNetworkChange('notes', e.target.value)}
                  style={styles.textarea}
                  rows={3}
                  placeholder="Internal notes..."
                />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <div style={styles.modalFooterRight}>
                <button style={styles.cancelBtn} onClick={() => setNetworkModal(null)}>Cancel</button>
                <button
                  style={{ ...styles.saveBtn, ...(saving ? styles.saveBtnDisabled : {}) }}
                  onClick={handleSaveNetwork}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  loading: { padding: 40, textAlign: 'center', color: 'var(--text-muted)' },

  // Header
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: 700 },

  // Stats bar
  statsBar: {
    display: 'flex',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 20,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-muted)',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },

  // Section
  section: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: 0,
  },

  // Network pills
  networkPills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  networkPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    fontSize: 13,
  },
  networkPillName: {
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  networkPillComm: {
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  addNetworkBtn: {
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },

  // Status dot
  statusDot: {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },

  // Toolbar
  toolbar: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1,
    minWidth: 200,
    padding: '8px 14px',
    fontSize: 13,
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'inherit',
  },
  filterSelect: {
    padding: '8px 14px',
    fontSize: 13,
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  importBtn: {
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  addProductBtn: {
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: 'var(--accent-teal)',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    cursor: 'pointer',
  },

  // Category sections
  categorySection: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
  },
  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 20px',
    cursor: 'pointer',
    transition: 'background-color 0.1s',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    flex: 1,
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
    backgroundColor: 'var(--bg-secondary)',
    padding: '2px 10px',
    borderRadius: 10,
  },
  chevron: {
    fontSize: 18,
    color: 'var(--text-muted)',
    transition: 'transform 0.15s',
    flexShrink: 0,
    width: 14,
    textAlign: 'center',
  },

  // Table
  tableWrapper: {
    overflowX: 'auto',
    borderTop: '1px solid var(--border)',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '10px 16px',
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
    transition: 'background-color 0.1s',
  },
  td: {
    padding: '10px 16px',
    fontSize: 13,
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
    color: 'var(--text-secondary)',
  },
  productName: {
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontSize: 13,
  },
  productBrand: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  asinText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: 'var(--text-muted)',
  },
  copyBtn: {
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: 'transparent',
    border: '1px solid #4ecdc4',
    borderRadius: 6,
    color: '#4ecdc4',
    cursor: 'pointer',
  },
  editBtn: {
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },

  // Empty
  empty: {
    textAlign: 'center',
    padding: 40,
    color: 'var(--text-muted)',
    fontSize: 13,
  },
  emptyInline: {
    fontSize: 13,
    color: 'var(--text-muted)',
    padding: '8px 0',
  },

  // Modal overlay
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    width: '90%',
    maxWidth: 680,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 24px',
    borderBottom: '1px solid var(--border)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 24,
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
  modalBody: {
    padding: 24,
    overflowY: 'auto',
    flex: 1,
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderTop: '1px solid var(--border)',
  },
  modalFooterRight: {
    display: 'flex',
    gap: 10,
    marginLeft: 'auto',
  },

  // Form fields
  fieldRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  fieldHalf: { flex: 1 },
  fieldThird: { flex: 1 },
  fieldFull: { width: '100%', marginBottom: 16 },
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
    boxSizing: 'border-box',
  },
  inputReadonly: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    fontSize: 13,
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  successBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    backgroundColor: 'rgba(34,197,94,0.1)',
    border: '1px solid rgba(34,197,94,0.2)',
    borderRadius: 8,
    fontSize: 13,
    color: 'var(--accent-green)',
  },
  sectionDivider: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: 'var(--text-muted)',
    borderTop: '1px solid var(--border)',
    paddingTop: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    fontSize: 13,
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
    lineHeight: 1.5,
    boxSizing: 'border-box',
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    padding: '4px 0',
  },
  checkboxLabel: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },

  // Buttons
  cancelBtn: {
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: 'var(--accent-teal)',
    border: 'none',
    borderRadius: 6,
    color: 'white',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  saveBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  deleteBtn: {
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 6,
    color: '#ef4444',
    cursor: 'pointer',
  },
  errorBanner: {
    padding: '10px 14px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 16,
  },
};
