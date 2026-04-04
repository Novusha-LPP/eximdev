// Validate ObjectId format
const isValidMongoId = (id) => {
  return /^[0-9a-f]{24}$/i.test(id);
};

export const requireTenant = (req, res, next) => {
  // Extract tenantId from authenticated user context (priority 1) or header (priority 2)
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
  
  // 1. REQUIRE tenant - don't fallback to mock
  if (!tenantId) {
    return res.status(401).json({ 
      success: false,
      message: 'Unauthorized. Authentication required.',
      code: 'MISSING_TENANT',
      requiresAuth: true
    });
  }

  // 2. Validate format (must be valid MongoDB ObjectId)
  if (!isValidMongoId(tenantId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid tenant ID format',
      code: 'INVALID_TENANT_FORMAT'
    });
  }

  // 3. Attach to request for use in queries
  req.tenantId = tenantId;
  next();
};

// Export validation for use in other middleware
export const isValidTenantId = isValidMongoId;
