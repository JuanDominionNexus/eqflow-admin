import client from './client';

export const getOverview = (days = 30) =>
  client.get('/admin/overview', { params: { days } }).then(r => r.data);

export const getRetention = () =>
  client.get('/admin/retention').then(r => r.data);

export const getEngagement = (days = 30) =>
  client.get('/admin/engagement', { params: { days } }).then(r => r.data);

export const getSessions = (days = 30) =>
  client.get('/admin/sessions', { params: { days } }).then(r => r.data);

export const getDropOffs = (days = 30) =>
  client.get('/admin/drop-offs', { params: { days } }).then(r => r.data);

export const getSignups = (days = 30) =>
  client.get('/admin/signups', { params: { days } }).then(r => r.data);

export const getUsers = (params) =>
  client.get('/admin/users', { params }).then(r => r.data);

export const getUserDetail = (id) =>
  client.get(`/admin/users/${id}`).then(r => r.data);

export const getRecentSessions = (days = 30) =>
  client.get('/admin/sessions/recent', { params: { days } }).then(r => r.data);

export const getSessionScreens = (sessionId) =>
  client.get(`/admin/sessions/${sessionId}/screens`).then(r => r.data);

export const login = (email, password) =>
  client.post('/auth/login', { email, password }).then(r => r.data);

export const getAIAnalytics = (days = 30) =>
  client.get('/admin/ai-analytics', { params: { days } }).then(r => r.data);

export const getTherapists = (params) =>
  client.get('/admin/therapists', { params }).then(r => r.data);

export const verifyTherapist = (id) =>
  client.put(`/admin/therapists/${id}/verify`).then(r => r.data);

export const rejectTherapist = (id) =>
  client.put(`/admin/therapists/${id}/reject`).then(r => r.data);

export const getTherapistDocuments = (profileId) =>
  client.get(`/admin/therapists/${profileId}/documents`).then(r => r.data);

export const sendBroadcast = (subject, body) =>
  client.post('/admin/broadcast', { subject, body }).then(r => r.data);

export const sendLegalBroadcast = (subject, body) =>
  client.post('/admin/broadcast/legal', { subject, body }).then(r => r.data);

export const getBroadcasts = () =>
  client.get('/admin/broadcasts').then(r => r.data);

export const getBroadcastRecipients = (id) =>
  client.get(`/admin/broadcasts/${id}/recipients`).then(r => r.data);

export const getNarrativeReports = (days = 30) =>
  client.get('/admin/narrative-reports', { params: { days } }).then(r => r.data);

export const sendTestPush = (payload = {}) =>
  client.post('/admin/test-push', payload).then(r => r.data);

export const triggerWeeklyReports = () =>
  client.post('/admin/narrative-reports/generate').then(r => r.data);

export const seedProducts = () =>
  client.post('/admin/seed-products').then(r => r.data);

// ── Revenue Pipeline & Funnel ──
export const getRevenuePipeline = (days = 30) =>
  client.get('/admin/revenue-pipeline', { params: { days } }).then(r => r.data);
export const getFunnelEvents = (days = 30) =>
  client.get('/admin/funnel-events', { params: { days } }).then(r => r.data);

// ── DNA Uploads ──
export const getDnaUploads = () =>
  client.get('/admin/dna-uploads').then(r => r.data);
export const uploadDnaFile = (formData) =>
  client.post('/admin/dna-uploads', formData).then(r => r.data);

// ── Products & Affiliate Networks ──
export const getProducts = (params) =>
  client.get('/admin/products', { params }).then(r => r.data);
export const getProductStats = () =>
  client.get('/admin/products/stats').then(r => r.data);
export const createProduct = (data) =>
  client.post('/admin/products', data).then(r => r.data);
export const updateProduct = (id, data) =>
  client.put(`/admin/products/${id}`, data).then(r => r.data);
export const deleteProduct = (id) =>
  client.delete(`/admin/products/${id}`).then(r => r.data);
export const importProducts = (data) =>
  client.post('/admin/products/import', data).then(r => r.data);
export const fetchAmazonData = () =>
  client.post('/admin/products/fetch-amazon').then(r => r.data);
export const enrichProducts = () =>
  client.post('/admin/products/enrich').then(r => r.data);

export const getAffiliateNetworks = () =>
  client.get('/admin/affiliate-networks').then(r => r.data);
export const createAffiliateNetwork = (data) =>
  client.post('/admin/affiliate-networks', data).then(r => r.data);
export const updateAffiliateNetwork = (id, data) =>
  client.put(`/admin/affiliate-networks/${id}`, data).then(r => r.data);

// ── Supplement Catalog ──
export const getSupplements = () =>
  client.get('/admin/supplements').then(r => r.data);
export const getSupplement = (key) =>
  client.get(`/admin/supplements/${key}`).then(r => r.data);
export const updateSupplement = (key, data) =>
  client.put(`/admin/supplements/${key}`, data).then(r => r.data);
export const addProductOption = (supplementKey, data) =>
  client.post(`/admin/supplements/${supplementKey}/options`, data).then(r => r.data);
export const updateProductOption = (id, data) =>
  client.put(`/admin/product-options/${id}`, data).then(r => r.data);
export const deleteProductOption = (id) =>
  client.delete(`/admin/product-options/${id}`).then(r => r.data);
export const seedSupplements = () =>
  client.post('/admin/seed-supplements').then(r => r.data);
