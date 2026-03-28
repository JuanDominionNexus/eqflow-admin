import client from './client';

// ── Existing client-therapist endpoints ──

export const getPendingRequests = () =>
  client.get('/client-therapist/pending-requests').then(r => r.data);

export const confirmClient = (id) =>
  client.post('/client-therapist/confirm', { relationship_id: id }).then(r => r.data);

export const declineClient = (id) =>
  client.post('/client-therapist/decline', { relationship_id: id }).then(r => r.data);

export const getClients = () =>
  client.get('/client-therapist/clients').then(r => r.data);

export const removeClient = (relationshipId) =>
  client.post('/client-therapist/remove-client', { relationship_id: relationshipId }).then(r => r.data);

export const getClientCheckIns = (clientId, params) =>
  client.get(`/therapist-dashboard/client/${clientId}/check-ins`, { params }).then(r => r.data);

export const getClientPatterns = (clientId) =>
  client.get(`/therapist-dashboard/client/${clientId}/patterns`).then(r => r.data);

export const getClientEmotionalMap = (clientId, params) =>
  client.get(`/therapist-dashboard/client/${clientId}/emotional-map`, { params }).then(r => r.data);

export const getClientMeditations = (clientId, params) =>
  client.get(`/therapist-dashboard/client/${clientId}/meditations`, { params }).then(r => r.data);

export const getClientJournals = (clientId, params) =>
  client.get(`/therapist-dashboard/client/${clientId}/journals`, { params }).then(r => r.data);

export const getClientVisions = (clientId) =>
  client.get(`/therapist-dashboard/client/${clientId}/visions`).then(r => r.data);

export const getClientSummary = (clientId, params) =>
  client.get(`/therapist-dashboard/client/${clientId}/summary`, { params }).then(r => r.data);

// ── Registration ──

export const registerAsTherapist = (data) =>
  client.post('/therapist/register', data).then(r => r.data);

export const getTherapistProfile = () =>
  client.get('/therapist/profile').then(r => r.data);

export const updateTherapistProfile = (data) =>
  client.put('/therapist/profile', data).then(r => r.data);

export const uploadTherapistDocuments = (formData) =>
  client.post('/therapist/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);

export const getTherapistDocuments = () =>
  client.get('/therapist/documents').then(r => r.data);

export const deleteTherapistDocument = (docId) =>
  client.delete(`/therapist/documents/${docId}`).then(r => r.data);

// ── Invitations ──

export const inviteClient = (email) =>
  client.post('/client-therapist/invite', { client_email: email }).then(r => r.data);

export const getSentInvites = () =>
  client.get('/client-therapist/sent-invites').then(r => r.data);
