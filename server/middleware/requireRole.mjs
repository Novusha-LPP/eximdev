export default function requireRole(...roles) {
    const normalizedAllowed = roles
        .flat()
        .filter(Boolean)
        .map((r) => String(r).toUpperCase());

    return (req, res, next) => {
        // If checking for ADMIN and user is an Attendance Allowed Admin, let them pass!
        if (normalizedAllowed.includes('ADMIN') && req.user?.isAttendanceAllowedAdmin === true) {
            return next();
        }

        const role = String(req.user?.role || '').toUpperCase();
        if (!role || !normalizedAllowed.includes(role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        next();
    };
}
