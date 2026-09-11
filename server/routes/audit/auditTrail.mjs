
import express from "express";
import ExcelJS from "exceljs";
import AuditTrailModel from "../../model/auditTrailModel.mjs";
import UserModel from "../../model/userModel.mjs";
import { getAllUserMappings, getUsernameById } from "../../utils/userIdManager.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
const router = express.Router();

// Lightweight in-memory cache for expensive audit aggregations
const auditMemoryCache = new Map();
function getAuditCache(key) {
  const item = auditMemoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    auditMemoryCache.delete(key);
    return null;
  }
  return item.data;
}
function setAuditCache(key, data, ttlMs = 3 * 60 * 1000) {
  if (auditMemoryCache.size > 500) {
    const now = Date.now();
    for (const [k, v] of auditMemoryCache.entries()) {
      if (now > v.expiry) auditMemoryCache.delete(k);
    }
    if (auditMemoryCache.size > 400) auditMemoryCache.clear();
  }
  auditMemoryCache.set(key, { data, expiry: Date.now() + ttlMs });
}

function buildUsernameFilter(rawUsername) {
  if (!rawUsername || !rawUsername.trim()) return null;
  const u = rawUsername.trim();
  const variations = [u, u.toLowerCase(), u.toUpperCase()];
  if (u.length > 0) {
    variations.push(u.charAt(0).toUpperCase() + u.slice(1).toLowerCase());
  }
  const unique = [...new Set(variations)];
  return /^[a-zA-Z0-9_.\s-]+$/.test(u) ? { $in: unique } : { $regex: u, $options: "i" };
}


// Admin-only: Get audit trail for a specific user by userId with filters and pagination
router.get("/api/audit-trail/user-logs/:userId", authMiddleware, async (req, res) => {
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

    // Branch Isolation
    if (req.user.role !== "Admin") {
      if (req.user.branchId) filter.branchId = req.user.branchId;
      else if (req.user.branch_code) filter.branch_code = req.user.branch_code;
    }
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
      heading: entry.heading, // include new heading
      performedBy: entry.username,
      details: entry.changes || [],
      job_no: entry.job_no,
      year: entry.year,
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


// Get all users with details, assigned modules, and last activity date
router.get("/api/audit-trail/all-users-with-activity", authMiddleware, async (req, res) => {
  try {
    // Filter by branch if not Admin, and bound by recent timestamp to leverage index
    const activityFilter = {
      timestamp: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) }
    };
    if (req.user.role !== "Admin") {
      if (req.user.branchId) activityFilter.branchId = req.user.branchId;
      else if (req.user.branch_code) activityFilter.branch_code = req.user.branch_code;
    }

    // Get all unique users from the audit trail with last activity
    const usersActivity = await AuditTrailModel.aggregate([
      { $match: activityFilter },
      {
        $group: {
          _id: "$username",
          lastActivity: { $max: "$timestamp" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fetch all users from the user model
    const allUsers = await UserModel.find({}).lean();
    // Map username to user details
    const userMap = {};
    allUsers.forEach(u => {
      userMap[u.username] = u;
    });

    // Merge activity and user details
    const users = usersActivity.map((u) => {
      const userDetails = userMap[u._id] || {};
      return {
        username: u._id,
        lastActivity: u.lastActivity,
        first_name: userDetails.first_name || "",
        last_name: userDetails.last_name || "",
        email: userDetails.email || "",
        company: userDetails.company || "",
        role: userDetails.role || "",
        modules: userDetails.modules || [],
        assigned_importer_name: userDetails.assigned_importer_name || [],
        selected_icd_code: userDetails.selected_icd_code || "",
        // Add any other fields you want to expose
      };
    });

    res.json({ users });
  } catch (error) {
    console.error("Error fetching all users with activity:", error);
    res.status(500).json({ message: "Error fetching all users with activity", error: error.message });
  }
});

// Get audit trail for a specific job
router.get("/api/audit-trail/job/:job_no/:year", authMiddleware, async (req, res) => {
  try {
    const { job_no, year } = req.params;
    const { page = 1, limit = 50, action, username, field } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter query
    const filter = { job_no, year };

    // Branch Isolation
    if (req.user.role !== "Admin") {
      if (req.user.branchId) filter.branchId = req.user.branchId;
      else if (req.user.branch_code) filter.branch_code = req.user.branch_code;
    }
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
router.get("/api/audit-trail/user/:username", authMiddleware, async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 50, action, documentType, fromDate, toDate } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter query
    const filter = { username: { $regex: username, $options: 'i' } };

    // Branch Isolation
    if (req.user.role !== "Admin") {
      if (req.user.branchId) filter.branchId = req.user.branchId;
      else if (req.user.branch_code) filter.branch_code = req.user.branch_code;
    }
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
router.get("/api/audit-trail/document/:documentId", authMiddleware, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { documentId };
    if (req.user.role !== "Admin") {
      if (req.user.branchId) filter.branchId = req.user.branchId;
      else if (req.user.branch_code) filter.branch_code = req.user.branch_code;
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
    console.error("Error fetching document audit trail:", error);
    res.status(500).json({ message: "Error fetching document audit trail", error: error.message });
  }
});

// Save custom audit log from frontend
router.post("/api/audit-trail/custom", authMiddleware, async (req, res) => {
  try {
    const { action, module, details, severity, user } = req.body;

    // Do not log VIEW/read operations
    const normalizedAction = action ? action.toUpperCase().replace(/\s+/g, '_') : "CUSTOM";
    if (normalizedAction === 'VIEW') {
      return res.status(200).json({ success: true, skipped: true, reason: 'VIEW actions are not logged' });
    }

    const newLog = new AuditTrailModel({
      documentType: module || "Custom",
      action: normalizedAction,
      username: user || req.user.username || req.user.email || "System",
      userId: req.user.id || req.user._id || "system",
      heading: details || `Custom action performed in ${module}`,
      changes: [],
      userAgent: req.headers['user-agent'] || 'Frontend',
      timestamp: new Date()
    });

    if (req.user.role !== "Admin") {
      if (req.user.branchId) newLog.branchId = req.user.branchId;
      else if (req.user.branch_code) newLog.branch_code = req.user.branch_code;
    }

    await newLog.save();
    res.status(201).json({ success: true, log: newLog });
  } catch (error) {
    console.error("Error saving custom audit log:", error);
    res.status(500).json({ message: "Error saving custom audit log", error: error.message });
  }
});

// Get comprehensive audit trail with advanced filters and server-side pagination
router.get("/api/audit-trail", authMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      action,
      username,
      documentType,
      module: moduleParam,
      job_no,
      year,
      field,
      fromDate,
      toDate,
      startDate,
      endDate,
      search,
      allDates,
      noDateFilter,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, Math.min(200, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter = {};

    // Branch Isolation
    if (req.user.role !== "Admin") {
      if (req.user.branchId) filter.branchId = req.user.branchId;
      else if (req.user.branch_code) filter.branch_code = req.user.branch_code;
    } else {
      // Admin can explicitly filter by branch
      if (req.query.branchId) filter.branchId = req.query.branchId;
      if (req.query.branch_code) filter.branch_code = req.query.branch_code;
    }

    if (action && action.trim()) {
      const act = action.trim();
      const validActions = ["CREATE", "UPDATE", "DELETE", "BULK_CREATE_UPDATE", "VIEW", "FILTER", "MODULE_ACCESS", "CUSTOM", "EXPORT", "IMPORT"];
      const upper = act.toUpperCase();
      filter.action = validActions.includes(upper) ? upper : { $regex: act, $options: "i" };
    }

    if (username && username.trim()) {
      const uFilter = buildUsernameFilter(username);
      if (uFilter) filter.username = uFilter;
    }

    const docType = documentType || moduleParam;
    if (docType && docType.trim()) {
      const trimmed = docType.trim();
      const reverseMap = {
        Job: "Job",
        Feedback: "Feedback",
        FeedbackReply: "FeedbackReply",
        AmcRenewal: "AmcRenewal",
        EquipmentChecklist: "EquipmentChecklist",
        Scorecard: "Scorecard",
        Visitor: "Visitor",
        ItVendor: "Vendor",
        HelpdeskTicket: "Helpdesk",
        ITInventory: "Inventory",
        ITContract: "Contract",
        ITLicense: "License",
        User: "User",
      };
      const mapped = reverseMap[trimmed] || trimmed;
      const uniqueTypes = [...new Set([trimmed, mapped])];
      filter.documentType = uniqueTypes.length === 1 ? uniqueTypes[0] : { $in: uniqueTypes };
    }

    if (job_no && job_no.trim()) filter.job_no = { $regex: job_no.trim(), $options: "i" };
    if (year && year.trim()) filter.year = year.trim();
    if (field && field.trim()) filter["changes.field"] = { $regex: field.trim(), $options: "i" };

    // Multi-field search
    if (search && search.trim()) {
      const s = search.trim();
      const searchRegex = { $regex: s, $options: "i" };
      filter.$or = [
        { username: searchRegex },
        { action: searchRegex },
        { documentType: searchRegex },
        { heading: searchRegex },
        { job_no: searchRegex },
        { ip_address: searchRegex },
        { userAgent: searchRegex },
        { reason: searchRegex },
      ];
    }

    // Date range filter
    const from = fromDate || startDate;
    const to = toDate || endDate;
    if (from || to) {
      filter.timestamp = {};
      if (from) {
        const fromD = new Date(from);
        fromD.setHours(0, 0, 0, 0);
        filter.timestamp.$gte = fromD;
      }
      if (to) {
        const toD = new Date(to);
        toD.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = toD;
      }
    } else if (search && search.trim() && allDates !== "true" && noDateFilter !== "true") {
      // Unbounded regex text search over 1.5M records triggers heavy Atlas scan: default to last 7 days if no dates specified
      filter.timestamp = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    }

    const isFilterEmpty = Object.keys(filter).length === 0;

    // Fast total count (uses estimated count if completely unfiltered)
    const totalCountPromise = isFilterEmpty
      ? AuditTrailModel.estimatedDocumentCount()
      : AuditTrailModel.countDocuments(filter);

    // Primary data fetch using timestamp index
    const dataPromise = AuditTrailModel.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Single-pass aggregation for stats (only when date-bounded or scoped to avoid full historical scans)
    let statsPromise;
    if (filter.timestamp) {
      statsPromise = AuditTrailModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              $cond: [
                { $in: ["$action", ["CREATE", "INSERT", "BULK_CREATE_UPDATE"]] },
                "create",
                {
                  $cond: [
                    { $in: ["$action", ["UPDATE", "EDIT"]] },
                    "update",
                    "other",
                  ],
                },
              ],
            },
            count: { $sum: 1 },
          },
        },
      ]);
    } else {
      statsPromise = Promise.resolve([]);
    }

    const [auditTrail, total, statsAgg] = await Promise.all([
      dataPromise,
      totalCountPromise,
      statsPromise,
    ]);

    let createCount = 0;
    let updateCount = 0;
    if (Array.isArray(statsAgg)) {
      statsAgg.forEach((s) => {
        if (s._id === "create") createCount = s.count;
        if (s._id === "update") updateCount = s.count;
      });
    }

    const totalPages = Math.max(1, Math.ceil(total / limitNum));

    res.json({
      success: true,
      auditTrail,
      data: auditTrail,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        currentPage: pageNum,
        totalItems: total,
        hasNext: skip + limitNum < total,
        hasPrev: pageNum > 1,
      },
      stats: {
        total,
        createCount,
        updateCount,
      },
    });
  } catch (error) {
    console.error("Error fetching audit trail:", error);
    res.status(500).json({ message: "Error fetching audit trail", error: error.message });
  }
});


// Get audit trail statistics
router.get("/api/audit-trail/stats", async (req, res) => {
  try {
    const { fromDate, toDate, groupBy, username, allDates, noDateFilter } = req.query;

    const hasExplicitDates = Boolean(fromDate || toDate);
    let start = null;
    let end = null;

    if (hasExplicitDates) {
      if (fromDate) {
        start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
      }
      if (toDate) {
        end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
      }
      if (start && end && start > end) {
        return res.status(400).json({ message: "Invalid time range: fromDate must be before or equal to toDate" });
      }
    } else if (allDates === "true" || noDateFilter === "true") {
      // Explicitly allow all historical stats
    } else {
      // Default to today to bound query to indexed range and prevent 1.5M full scan
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }

    const dateFilter = {};
    if (start || end) {
      dateFilter.timestamp = {};
      if (start) dateFilter.timestamp.$gte = start;
      if (end) dateFilter.timestamp.$lte = end;
    }
    if (username && username.trim()) {
      const uFilter = buildUsernameFilter(username);
      if (uFilter) dateFilter.username = uFilter;
    }

    // Branch Isolation
    if (req.user && req.user.role !== "Admin") {
      if (req.user.branchId) dateFilter.branchId = req.user.branchId;
      else if (req.user.branch_code) dateFilter.branch_code = req.user.branch_code;
    }

    // Check in-memory cache
    const cacheKey = `stats_${JSON.stringify(dateFilter)}_${groupBy || 'day'}`;
    const cached = getAuditCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // If completely unfiltered (all-time), optimize to avoid scanning 1.5M rows for sets
    const isAllTime = !dateFilter.timestamp && !dateFilter.username;

    let statsPromise;
    let actionStatsPromise;
    let topUsersPromise;
    let dailyActivityPromise;

    let dateFormat = "%Y-%m-%d %H:00";
    if (groupBy === "day") dateFormat = "%Y-%m-%d";
    else if (groupBy === "week") dateFormat = "%G-W%V";
    else if (groupBy === "month") dateFormat = "%Y-%m";

    if (isAllTime) {
      // Fast path for all-time stats: metadata counts in O(1)
      statsPromise = Promise.all([
        AuditTrailModel.estimatedDocumentCount(),
        UserModel.countDocuments(),
      ]).then(([totalActions, totalUsers]) => [{
        totalActions,
        totalUsers,
        totalDocuments: Math.round(totalActions * 0.2),
      }]);

      actionStatsPromise = AuditTrailModel.aggregate([
        { $match: dateFilter },
        { $group: { _id: "$action", count: { $sum: 1 } } }
      ]);

      topUsersPromise = AuditTrailModel.aggregate([
        { $match: { timestamp: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } } },
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

      dailyActivityPromise = AuditTrailModel.aggregate([
        { $match: { timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: "$timestamp" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
    } else {
      statsPromise = AuditTrailModel.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            totalActions: { $sum: 1 },
            totalUsers: { $addToSet: "$username" },
            totalDocuments: { $addToSet: "$documentId" }
          }
        },
        {
          $project: {
            totalActions: 1,
            totalUsers: { $size: "$totalUsers" },
            totalDocuments: { $size: "$totalDocuments" }
          }
        }
      ]);

      actionStatsPromise = AuditTrailModel.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: "$action",
            count: { $sum: 1 }
          }
        }
      ]);

      topUsersPromise = AuditTrailModel.aggregate([
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

      dailyActivityPromise = AuditTrailModel.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: "$timestamp" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
    }

    const [stats, actionStats, topUsers, dailyActivity] = await Promise.all([
      statsPromise,
      actionStatsPromise,
      topUsersPromise,
      dailyActivityPromise
    ]);

    const result = {
      summary: stats[0] || {
        totalActions: 0,
        totalUsers: 0,
        totalDocuments: 0
      },
      actionBreakdown: actionStats,
      actionTypes: actionStats, // for frontend PieChart
      topUsers,
      dailyActivity: dailyActivity.map(item => ({ date: item._id, count: item.count }))
    };

    // Cache result: 2 minutes for today/active filter, 10 minutes for historical/all-time
    const ttl = isAllTime ? 10 * 60 * 1000 : 2 * 60 * 1000;
    setAuditCache(cacheKey, result, ttl);

    res.json(result);
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

// Get all users with activity statistics (for All Users page)
router.get("/api/audit-trail/all-active-users", async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      limit = 20,
      page = 1,
      username,
      action,
      sortBy = 'count',
      sortOrder = 'desc',
      allDates
    } = req.query;

    const filter = {};

    // Date range filter: default to last 90 days if unbounded to prevent 1.5M scan
    if (fromDate || toDate) {
      filter.timestamp = {};
      if (fromDate) filter.timestamp.$gte = new Date(fromDate);
      if (toDate) filter.timestamp.$lte = new Date(toDate);
    } else if (allDates === "true") {
      // allow full historical
    } else {
      filter.timestamp = { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) };
    }

    if (username && username.trim()) {
      filter.username = { $regex: username.trim(), $options: 'i' };
    }

    if (action && action.trim()) {
      filter.action = action.trim().toUpperCase();
    }

    const cacheKey = `activeUsers_${JSON.stringify(filter)}_${sortBy}_${sortOrder}`;
    let allUsersStats = getAuditCache(cacheKey);

    if (!allUsersStats) {
      allUsersStats = await AuditTrailModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$username",
            count: { $sum: 1 },
            lastActivity: { $max: "$timestamp" },
            firstActivity: { $min: "$timestamp" },
            actions: { $addToSet: "$action" }
          }
        },
        {
          $sort: {
            [sortBy]: sortOrder === 'desc' ? -1 : 1
          }
        }
      ]);
      setAuditCache(cacheKey, allUsersStats, 5 * 60 * 1000);
    }

    // Apply pagination
    const limitNum = Math.max(1, parseInt(limit) || 20);
    const pageNum = Math.max(1, parseInt(page) || 1);
    const skip = (pageNum - 1) * limitNum;
    const totalUsers = allUsersStats.length;
    const paginatedUsers = allUsersStats.slice(skip, skip + limitNum);

    res.json({
      users: paginatedUsers,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalUsers / limitNum),
        totalItems: totalUsers,
        hasNext: skip + limitNum < totalUsers,
        hasPrev: pageNum > 1
      },
      debug: {
        totalAuditTrailUsers: totalUsers,
        message: `Showing users with audit trail activity. ${totalUsers} users have performed trackable actions.`
      }
    });
  } catch (error) {
    console.error("Error fetching all active users:", error);
    res.status(500).json({ message: "Error fetching all active users", error: error.message });
  }
});

// Get ALL system users (including those without audit activity)
router.get("/api/audit-trail/all-system-users", async (req, res) => {
  try {
    const {
      limit = 20,
      page = 1,
      username,
      sortBy = 'username',
      sortOrder = 'asc'
    } = req.query;

    const limitNum = Math.max(1, parseInt(limit) || 20);
    const pageNum = Math.max(1, parseInt(page) || 1);
    const skip = (pageNum - 1) * limitNum;

    // Get all users from UserModel
    const userFilter = {};
    if (username && username.trim()) {
      userFilter.username = { $regex: username.trim(), $options: 'i' };
    }

    const allSystemUsers = await UserModel.find(userFilter).lean();
    const totalUsers = allSystemUsers.length;

    // If sorting by username (default), paginate users first to only query audit activity for this page (eliminating 303 N+1 queries)
    if (sortBy === 'username') {
      allSystemUsers.sort((a, b) => {
        const aVal = (a.username || '').toLowerCase();
        const bVal = (b.username || '').toLowerCase();
        return sortOrder === 'desc' ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
      });

      const paginatedUsers = allSystemUsers.slice(skip, skip + limitNum);
      const usernames = paginatedUsers.map(u => u.username).filter(Boolean);

      const activityMap = new Map();
      if (usernames.length > 0) {
        const activityStats = await AuditTrailModel.aggregate([
          { $match: { username: { $in: usernames } } },
          {
            $group: {
              _id: "$username",
              count: { $sum: 1 },
              lastActivity: { $max: "$timestamp" },
              firstActivity: { $min: "$timestamp" },
              actions: { $addToSet: "$action" }
            }
          }
        ]);
        for (const a of activityStats) {
          activityMap.set(a._id, a);
          if (a._id) activityMap.set(a._id.toLowerCase(), a);
        }
      }

      const formattedUsers = paginatedUsers.map(user => {
        const u = user.username || '';
        const act = activityMap.get(u) || activityMap.get(u.toLowerCase()) || {
          count: 0,
          lastActivity: null,
          firstActivity: null,
          actions: []
        };
        return {
          _id: user.username,
          userDetails: {
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            role: user.role,
            company: user.company
          },
          count: act.count,
          lastActivity: act.lastActivity,
          firstActivity: act.firstActivity,
          actions: act.actions,
          hasActivity: act.count > 0
        };
      });

      return res.json({
        users: formattedUsers,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalUsers / limitNum),
          totalItems: totalUsers,
          hasNext: skip + limitNum < totalUsers,
          hasPrev: pageNum > 1
        },
        debug: {
          totalSystemUsers: totalUsers,
          message: "Showing paginated system users with fast activity lookup."
        }
      });
    }

    // For count/lastActivity sorting, check cached user activity map or compute in 1 batch query
    const cacheKey = `userActivitySummary`;
    let activityMap = getAuditCache(cacheKey);

    if (!activityMap) {
      const activityStats = await AuditTrailModel.aggregate([
        {
          $group: {
            _id: "$username",
            count: { $sum: 1 },
            lastActivity: { $max: "$timestamp" },
            firstActivity: { $min: "$timestamp" },
            actions: { $addToSet: "$action" }
          }
        }
      ]);
      activityMap = {};
      for (const a of activityStats) {
        activityMap[a._id] = a;
        if (a._id) activityMap[a._id.toLowerCase()] = a;
      }
      setAuditCache(cacheKey, activityMap, 10 * 60 * 1000);
    }

    const usersWithActivity = allSystemUsers.map(user => {
      const u = user.username || '';
      const act = activityMap[u] || activityMap[u.toLowerCase()] || {
        count: 0,
        lastActivity: null,
        firstActivity: null,
        actions: []
      };
      return {
        _id: user.username,
        userDetails: {
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role,
          company: user.company
        },
        count: act.count,
        lastActivity: act.lastActivity,
        firstActivity: act.firstActivity,
        actions: act.actions,
        hasActivity: act.count > 0
      };
    });

    const sortField = ['count', 'lastActivity', 'firstActivity'].includes(sortBy) ? sortBy : '_id';
    usersWithActivity.sort((a, b) => {
      const aVal = a[sortField] || (sortField === '_id' ? (a._id || '') : 0);
      const bVal = b[sortField] || (sortField === '_id' ? (b._id || '') : 0);
      if (sortField === '_id') {
        return sortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      }
      return sortOrder === 'desc' ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
    });

    const paginatedUsers = usersWithActivity.slice(skip, skip + limitNum);

    res.json({
      users: paginatedUsers,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalUsers / limitNum),
        totalItems: totalUsers,
        hasNext: skip + limitNum < totalUsers,
        hasPrev: pageNum > 1
      },
      debug: {
        totalSystemUsers: totalUsers,
        activeUsers: usersWithActivity.filter(u => u.hasActivity).length,
        inactiveUsers: usersWithActivity.filter(u => !u.hasActivity).length,
        message: "Showing all system users including those without audit activity."
      }
    });
  } catch (error) {
    console.error("Error fetching all system users:", error);
    res.status(500).json({ message: "Error fetching all system users", error: error.message });
  }
});

// Get top active users with flexible filtering and pagination
router.get("/api/audit-trail/top-users", async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      limit = 5,
      page = 1,
      username,
      action,
      sortBy = 'count',
      sortOrder = 'desc',
      allDates
    } = req.query;

    const filter = {};

    // Date range filter: default to last 30 days if not specified to prevent full 1.5M scan
    if (fromDate || toDate) {
      filter.timestamp = {};
      if (fromDate) filter.timestamp.$gte = new Date(fromDate);
      if (toDate) filter.timestamp.$lte = new Date(toDate);
    } else if (allDates === "true") {
      // unbounded
    } else {
      filter.timestamp = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    }

    if (username && username.trim()) {
      const uFilter = buildUsernameFilter(username);
      if (uFilter) filter.username = uFilter;
    }

    if (action && action.trim()) {
      filter.action = action.trim().toUpperCase();
    }

    const cacheKey = `topUsers_${JSON.stringify(filter)}_${limit}_${page}_${sortBy}_${sortOrder}`;
    const cached = getAuditCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const limitNum = Math.max(1, parseInt(limit) || 5);
    const pageNum = Math.max(1, parseInt(page) || 1);
    const skip = (pageNum - 1) * limitNum;
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    const sortObj = { [sortBy]: sortDirection };

    // Single-pass aggregation using $facet to fetch paginated data and count simultaneously
    const [result] = await AuditTrailModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$username",
          count: { $sum: 1 },
          lastActivity: { $max: "$timestamp" },
          firstActivity: { $min: "$timestamp" },
          actions: { $addToSet: "$action" }
        }
      },
      {
        $facet: {
          data: [
            { $sort: sortObj },
            { $skip: skip },
            { $limit: limitNum }
          ],
          totalCount: [{ $count: "total" }]
        }
      }
    ]);

    const topUsers = result?.data || [];
    const total = result?.totalCount?.[0]?.total || topUsers.length;

    const responsePayload = {
      topUsers,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        hasNext: skip + limitNum < total,
        hasPrev: pageNum > 1
      }
    };

    setAuditCache(cacheKey, responsePayload, 5 * 60 * 1000);
    res.json(responsePayload);
  } catch (error) {
    console.error("Error fetching top users:", error);
    res.status(500).json({ message: "Error fetching top users", error: error.message });
  }
});

// Get activity timeline for audit chart (day-wise for frontend line graph)
router.get("/api/audit-trail/activity-timeline", async (req, res) => {
  try {
    const { fromDate, toDate, username } = req.query;
    let dateFormat = "%Y-%m-%d";
    const dateFilter = {};

    const start = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = toDate ? new Date(toDate) : new Date();
    dateFilter.timestamp = { $gte: start, $lte: end };

    if (username && username.trim()) {
      const uFilter = buildUsernameFilter(username);
      if (uFilter) dateFilter.username = uFilter;
    }

    const cacheKey = `timeline_${JSON.stringify(dateFilter)}`;
    const cached = getAuditCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Aggregate day-wise activity
    const dailyActivity = await AuditTrailModel.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$timestamp" } },
          actions: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill missing days with 0 actions for a continuous line graph
    let results = [];
    let current = new Date(start);
    const activityMap = Object.fromEntries(dailyActivity.map(item => [item._id, item.actions]));
    while (current <= end) {
      const dateStr = current.toISOString().slice(0, 10);
      results.push({ date: dateStr, actions: activityMap[dateStr] || 0 });
      current.setDate(current.getDate() + 1);
    }

    const responsePayload = { dailyActivity: results };
    setAuditCache(cacheKey, responsePayload, 3 * 60 * 1000);
    res.json(responsePayload);
  } catch (error) {
    console.error("Error fetching activity timeline:", error);
    res.status(500).json({ message: "Error fetching activity timeline", error: error.message });
  }
});

// Delete audit logs — optionally scoped to a module (any authenticated user)
router.delete("/api/audit-trail", authMiddleware, async (req, res) => {
  try {
    const { documentType } = req.query;
    const filter = {};
    if (documentType) filter.documentType = documentType;

    const result = await AuditTrailModel.deleteMany(filter);
    res.json({
      success: true,
      deletedCount: result.deletedCount,
      message: documentType
        ? `Deleted ${result.deletedCount} logs for module "${documentType}".`
        : `Deleted all ${result.deletedCount} audit logs.`
    });
  } catch (error) {
    console.error("Error deleting audit logs:", error);
    res.status(500).json({ message: "Error deleting audit logs", error: error.message });
  }
});

// Export all audit logs to Excel
router.get("/api/audit-trail/export", authMiddleware, async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Audit Logs");
    const filename = `Audit_Logs_${new Date().toISOString().slice(0, 10)}.xlsx`;

    const documentTypeMap = {
      ITAsset: "Asset",
      ItVendor: "Vendor",
      HelpdeskTicket: "Helpdesk",
      ITInventory: "Inventory",
      ITContract: "Contract",
      ITLicense: "License",
      User: "User",
    };

    const filter = {};
    const from = req.query.fromDate || req.query.startDate;
    const to = req.query.toDate || req.query.endDate;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }
    if (req.user && req.user.role !== "Admin") {
      if (req.user.branchId) filter.branchId = req.user.branchId;
      else if (req.user.branch_code) filter.branch_code = req.user.branch_code;
    }

    const exportLimit = parseInt(req.query.limit) || 50000;

    const auditLogs = await AuditTrailModel.find(filter)
      .sort({ timestamp: -1 })
      .limit(exportLimit)
      .lean();

    worksheet.columns = [
      { header: "S.No", key: "srNo", width: 8 },
      { header: "Timestamp", key: "timestamp", width: 22 },
      { header: "User", key: "user", width: 22 },
      { header: "Action", key: "action", width: 16 },
      { header: "Module", key: "module", width: 18 },
      { header: "Details / Activity", key: "details", width: 45 },
      { header: "IP Address", key: "ip_address", width: 18 },
      { header: "User Agent", key: "user_agent", width: 35 },
    ];

    auditLogs.forEach((item, idx) => {
      const rawUser = item.username || item.user || item.userId || "—";
      const moduleName = documentTypeMap[item.documentType] || item.documentType || "General";
      const detailsText =
        item.heading ||
        item.details ||
        item.reason ||
        (item.changes && item.changes.length > 0 ? `${item.changes.length} field change(s)` : "—");

      worksheet.addRow({
        srNo: idx + 1,
        timestamp: item.timestamp
          ? new Date(item.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
          : "—",
        user: rawUser,
        action: item.action || "UNKNOWN",
        module: moduleName,
        details: detailsText,
        ip_address: item.ip_address || "—",
        user_agent: item.userAgent || item.user_agent || "—",
      });
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFF" }, size: 11 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "0F172A" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 26;

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err) {
    console.error("Error exporting audit trail to Excel:", err);
    return res.status(500).json({ success: false, message: `Failed to generate audit report: ${err.message}` });
  }
});

export default router;
