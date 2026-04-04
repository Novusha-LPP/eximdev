// Restricts attendance admin access to an allowlist of usernames.
export const ALLOWED_USERNAMES = new Set([
  'shalini_arun',
  'manu_pillai',
  'suraj_rajan',
  'rajan_aranamkatte',
  'uday_zope'
]);

function isAdminRole(role) {
  const normalized = String(role || '').toUpperCase();
  return normalized === 'ADMIN';
}

export default function requireAllowedAdmin(req, res, next) {
  if (!isAdminRole(req.user?.role)) {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const username = (req.user?.username || '').toLowerCase();
  if (!ALLOWED_USERNAMES.has(username)) {
    return res.status(403).json({ message: 'Admin access restricted to authorized users' });
  }

  next();
}
