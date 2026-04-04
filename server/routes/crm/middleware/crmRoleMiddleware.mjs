/**
 * Enforces role-based permissions for CRM actions and stage transitions.
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // Prefer crmRole from req.user
    const role = req.user?.crmRole || req.user?.role || req.headers['x-crm-role'];

    if (!role) {
      return res.status(403).json({ message: 'Unauthorized. CRM Role is required.' });
    }

    if (!allowedRoles.includes(role) && role !== 'Admin') { 
      return res.status(403).json({ message: `Access denied for role: ${role}. Required: ${allowedRoles.join(', ')}` });
    }

    next();
  };
};

export const checkStagePermission = async (req, res, next) => {
  const { stage } = req.body;
  if (!stage) return next(); 

  const role = req.user?.crmRole || 'Sales Rep';

  if (role === 'Admin' || role === 'Manager') return next(); 

  switch (stage.toLowerCase()) {
    case 'lead':
    case 'qualified':
    case 'opportunity':
      // Sales Reps can manage up to opportunity
      break;
    
    case 'proposal':
    case 'negotiation':
    case 'won':
    case 'lost':
      // Might want restriction here depending on org size, but usually reps manage their own deals
      break;
  }

  next();
};
