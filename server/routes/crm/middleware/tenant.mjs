export const requireTenant = (req, res, next) => {
  // Try to extract tenantId from standard User context or custom header
  let tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  // Provide a fallback for development if missing
  if (!tenantId) {
    tenantId = '65f4a1a1a1a1a1a1a1a1a1a1'; // Mock ObjectId for testing
  }

  req.tenantId = tenantId;
  next();
};
