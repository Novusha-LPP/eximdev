import express from "express";
import AuditTrailModel from "../../model/auditTrailModel.mjs";

const router = express.Router();

// Get audit trail for a specific job
router.get("/api/audit-trail/job/:job_no/:year", async (req, res) => {
  try {
    const { job_no, year } = req.params;
    const { page = 1, limit = 50, action, username, field } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter query
    const filter = { job_no, year };
    if (action) filter.action = action;
    if (username) filter.username = { $regex: username, $options: 'i' };
    if (field) filter['changes.field'] = { $regex: field, $options: 'i' };
    
    const auditTrail = await AuditTrailModel.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await AuditTrailModel.countDocuments(filter);
    
    res.json({
      auditTrail,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error("Error fetching audit trail:", error);
    res.status(500).json({ message: "Error fetching audit trail", error: error.message });
  }
});

// Get audit trail for a specific user
router.get("/api/audit-trail/user/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 50, action, documentType, fromDate, toDate } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter query
    const filter = { username: { $regex: username, $options: 'i' } };
    if (action) filter.action = action;
    if (documentType) filter.documentType = documentType;
    
    // Date range filter
    if (fromDate || toDate) {
      filter.timestamp = {};
      if (fromDate) filter.timestamp.$gte = new Date(fromDate);
      if (toDate) filter.timestamp.$lte = new Date(toDate);
    }
    
    const auditTrail = await AuditTrailModel.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await AuditTrailModel.countDocuments(filter);
    
    res.json({
      auditTrail,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error("Error fetching user audit trail:", error);
    res.status(500).json({ message: "Error fetching user audit trail", error: error.message });
  }
});

// Get audit trail for a specific document
router.get("/api/audit-trail/document/:documentId", async (req, res) => {
  try {
    const { documentId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const auditTrail = await AuditTrailModel.find({ documentId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await AuditTrailModel.countDocuments({ documentId });
    
    res.json({
      auditTrail,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error("Error fetching document audit trail:", error);
    res.status(500).json({ message: "Error fetching document audit trail", error: error.message });
  }
});

// Get comprehensive audit trail with advanced filters
router.get("/api/audit-trail", async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      action, 
      username, 
      documentType,
      job_no,
      year,
      field,
      fromDate,
      toDate,
      ipAddress
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter query
    const filter = {};
    if (action) filter.action = action;
    if (username) filter.username = { $regex: username, $options: 'i' };
    if (documentType) filter.documentType = documentType;
    if (job_no) filter.job_no = job_no;
    if (year) filter.year = year;
    if (field) filter['changes.field'] = { $regex: field, $options: 'i' };
    if (ipAddress) filter.ipAddress = { $regex: ipAddress, $options: 'i' };
    
    // Date range filter
    if (fromDate || toDate) {
      filter.timestamp = {};
      if (fromDate) filter.timestamp.$gte = new Date(fromDate);
      if (toDate) filter.timestamp.$lte = new Date(toDate);
    }
    
    const auditTrail = await AuditTrailModel.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await AuditTrailModel.countDocuments(filter);
    
    res.json({
      auditTrail,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error("Error fetching audit trail:", error);
    res.status(500).json({ message: "Error fetching audit trail", error: error.message });
  }
});

// Get audit trail statistics
router.get("/api/audit-trail/stats", async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (fromDate || toDate) {
      dateFilter.timestamp = {};
      if (fromDate) dateFilter.timestamp.$gte = new Date(fromDate);
      if (toDate) dateFilter.timestamp.$lte = new Date(toDate);
    }
    
    // Aggregate statistics
    const stats = await AuditTrailModel.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalActions: { $sum: 1 },
          totalUsers: { $addToSet: "$username" },
          totalDocuments: { $addToSet: "$documentId" },
          actionBreakdown: {
            $push: {
              action: "$action",
              count: 1
            }
          },
          userActivity: {
            $push: {
              username: "$username",
              count: 1
            }
          }
        }
      },
      {
        $project: {
          totalActions: 1,
          totalUsers: { $size: "$totalUsers" },
          totalDocuments: { $size: "$totalDocuments" },
          actionBreakdown: 1,
          userActivity: 1
        }
      }
    ]);
    
    // Get action breakdown
    const actionStats = await AuditTrailModel.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get top users
    const topUsers = await AuditTrailModel.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$username",
          count: { $sum: 1 },
          lastActivity: { $max: "$timestamp" }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      summary: stats[0] || {
        totalActions: 0,
        totalUsers: 0,
        totalDocuments: 0
      },
      actionBreakdown: actionStats,
      topUsers
    });
  } catch (error) {
    console.error("Error fetching audit trail stats:", error);
    res.status(500).json({ message: "Error fetching audit trail stats", error: error.message });
  }
});

// Get field-level change history for a specific field in a job
router.get("/api/audit-trail/field-history/:job_no/:year/:fieldPath", async (req, res) => {
  try {
    const { job_no, year, fieldPath } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const auditTrail = await AuditTrailModel.find({
      job_no,
      year,
      'changes.fieldPath': fieldPath
    })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();
    
    // Extract only the relevant field changes
    const fieldHistory = auditTrail.map(entry => ({
      ...entry,
      changes: entry.changes.filter(change => change.fieldPath === fieldPath)
    }));
    
    const total = await AuditTrailModel.countDocuments({
      job_no,
      year,
      'changes.fieldPath': fieldPath
    });
    
    res.json({
      fieldHistory,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error("Error fetching field history:", error);
    res.status(500).json({ message: "Error fetching field history", error: error.message });
  }
});

export default router;
