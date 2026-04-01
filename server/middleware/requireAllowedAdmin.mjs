// Restricts attendance admin access to an allowlist of usernames.
export const ALLOWED_USERNAMES = new Set([
  'shalini_arun',
  'manu_pilai',
  'suraj_rajan',
  'rajan_aranamkatte',
  'uday_zope'
]);

export default function requireAllowedAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') return next();
  const username = (req.user?.username || '').toLowerCase();
  if (!ALLOWED_USERNAMES.has(username)) {
    return res.status(403).json({ message: 'Admin access restricted to authorized users' });
  }
  next();
}
