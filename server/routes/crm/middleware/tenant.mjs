// Validate ObjectId format
const isValidMongoId = (id) => {
  return /^[0-9a-f]{24}$/i.test(id);
};

export const requireTenant = (req, res, next) => {
  // Extract tenantId from authenticated user context (priority 1) or header (priority 2)
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  if (tenantId && isValidMongoId(tenantId)) {
    req.tenantId = tenantId;
  }
  next();
};

// Export validation for use in other middleware
export const isValidTenantId = isValidMongoId;
