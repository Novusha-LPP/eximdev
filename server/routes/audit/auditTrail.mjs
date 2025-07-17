import express from "express";
import AuditTrailModel from "../../model/auditTrailModel.mjs";
import { getAllUserMappings, getUsernameById } from "../../utils/userIdManager.mjs";
const router = express.Router();

// Admin-only: Get audit trail for a specific user by userId with filters and pagination
router.get("/api/audit-trail/user-logs/:userId", async (req, res) => {
  try {
   

    const { userId } = req.params;
    const { actionType, fromDate, toDate, page = 1, limit = 20 } = req.query;

    // Get username for userId
    const username = await getUsernameById(userId);
    if (!username) {
      return res.status(404).json({ message: "User not found" });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = { username: { $regex: `^${username}$`, $options: 'i' } };
    if (actionType) filter.action = actionType;
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

    // Format response: timestamp, action, performedBy, metadata/details
    const logs = auditTrail.map(entry => ({
      timestamp: entry.timestamp,
      action: entry.action,
      performedBy: entry.username,
      details: entry.changes || [],
      job_no: entry.job_no,
      year: entry.year,
      ipAddress: entry.ipAddress || null
    }));

    res.json({
      logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error("Error fetching user logs:", error);
    res.status(500).json({ message: "Error fetching user logs", error: error.message });
  }
});




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
        totalItems: total,
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
        totalItems: total,
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
        totalItems: total,
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
    
    // Date range filter: default to current date if not provided
    const dateFilter = {};
    let adjustedToDate = toDate;
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      // If fromDate is after toDate, return error
      if (from > to) {
        return res.status(400).json({ message: "Invalid time range: fromDate must be before or equal to toDate" });
      }
      // If fromDate and toDate are the same day, increment toDate by 1 day
      if (
        from.getFullYear() === to.getFullYear() &&
        from.getMonth() === to.getMonth() &&
        from.getDate() === to.getDate()
      ) {
        to.setDate(to.getDate() + 1);
        adjustedToDate = to.toISOString().slice(0, 10);
      }
    }
    if (fromDate || toDate) {
      dateFilter.timestamp = {};
      if (fromDate) dateFilter.timestamp.$gte = new Date(fromDate);
      if (adjustedToDate) dateFilter.timestamp.$lte = new Date(adjustedToDate);
      
    } else {
      // Default: current date 00:00 to 23:59
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      filter.timestamp = { $gte: start, $lte: end };
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
        totalItems: total,
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
    const { fromDate, toDate, groupBy, username } = req.query;
    // Build date filter: default to current date if not provided
    const dateFilter = {};
    let adjustedToDate = toDate;
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      // If fromDate is after toDate, return error
      if (from > to) {
        return res.status(400).json({ message: "Invalid time range: fromDate must be before or equal to toDate" });
      }
      // If fromDate and toDate are the same day, increment toDate by 1 day
      if (
        from.getFullYear() === to.getFullYear() &&
        from.getMonth() === to.getMonth() &&
        from.getDate() === to.getDate()
      ) {
        to.setDate(to.getDate() + 1);
        adjustedToDate = to.toISOString().slice(0, 10);
      }
    }
    if (fromDate || toDate) {
      dateFilter.timestamp = {};
      if (fromDate) dateFilter.timestamp.$gte = new Date(fromDate);
      if (adjustedToDate) dateFilter.timestamp.$lte = new Date(adjustedToDate);
    } else {
      // Default: current date 00:00 to 23:59
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      dateFilter.timestamp = { $gte: start, $lte: end };
    }
    // Add username filter if provided
    if (username) {
      dateFilter.username = { $regex: `^${username}$`, $options: 'i' };
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
    
    // Get activity grouped by hour, day, week, or month
    let dateFormat = "%Y-%m-%d %H:00"; // default: hourly
    if (groupBy === "day") dateFormat = "%Y-%m-%d";
    else if (groupBy === "week") dateFormat = "%G-W%V"; // ISO week
    else if (groupBy === "month") dateFormat = "%Y-%m";

    const dailyActivity = await AuditTrailModel.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$timestamp" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      summary: stats[0] || {
        totalActions: 0,
        totalUsers: 0,
        totalDocuments: 0
      },
      actionBreakdown: actionStats,
      actionTypes: actionStats, // for frontend PieChart
      topUsers,
      dailyActivity: dailyActivity.map(item => ({ date: item._id, count: item.count }))
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
        totalItems: total,
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error("Error fetching field history:", error);
    res.status(500).json({ message: "Error fetching field history", error: error.message });
  }
});

// Get all user mappings (for admin purposes)
router.get("/api/audit/user-mappings", async (req, res) => {
  try {
    const userMappings = await getAllUserMappings();
    
    res.json({
      success: true,
      data: userMappings.map(mapping => ({
        userId: mapping.userId,
        username: mapping.username,
        createdAt: mapping.createdAt,
        lastUsed: mapping.lastUsed
      })),
      totalUsers: userMappings.length
    });
  } catch (error) {
    console.error("Error fetching user mappings:", error);
    res.status(500).json({ message: "Error fetching user mappings", error: error.message });
  }
});

// Get username by user ID
router.get("/api/audit/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const username = await getUsernameById(userId);
    
    if (username) {
      res.json({
        success: true,
        data: { userId, username }
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching username:", error);
    res.status(500).json({ message: "Error fetching username", error: error.message });
  }
});

export default router;
