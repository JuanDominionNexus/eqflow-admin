// Determines portal mode based on hostname:
//   therapist.* → 'therapist'
//   everything else (admin.*, localhost, etc.) → 'admin'
export function getPortalMode() {
  const host = window.location.hostname;
  if (host.startsWith('therapist')) return 'therapist';
  return 'admin';
}
