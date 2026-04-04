export default function requireRole(...roles) {
    const normalizedAllowed = roles
        .flat()
        .filter(Boolean)
        .map((r) => String(r).toUpperCase());

    return (req, res, next) => {
        const role = String(req.user?.role || '').toUpperCase();
        if (!role || !normalizedAllowed.includes(role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        next();
    };
}
