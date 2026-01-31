import express from "express";
import verifyToken from "../../middleware/authMiddleware.mjs";
import KPITemplate from "../../model/kpi/kpiTemplateModel.mjs";
import KPISheet from "../../model/kpi/kpiSheetModel.mjs";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

// ==========================================
// TEMPLATE ROUTES
// ==========================================

// Create or Update Template
router.post("/api/kpi/template", verifyToken, async (req, res) => {
    try {
        console.log("POST /api/kpi/template called", req.body);
        const { name, department, rows, id } = req.body;

        if (id) {
            // Update existing logic (creates new version concept ideally, but for now simple update)
            // Prompt says: "Every template edit creates a new version. Older versions remain immutable"

            const existing = await KPITemplate.findById(id);
            if (!existing) return res.status(404).json({ message: "Template not found" });

            // Deactivate old one
            existing.is_active = false;
            await existing.save();

            // Create new version
            const newTemplate = new KPITemplate({
                owner: req.user._id,
                name: name || existing.name,
                department: department || existing.department,
                rows: rows,
                version: existing.version + 1,
                parent_template: existing._id
            });
            await newTemplate.save();
            return res.json(newTemplate);

        } else {
            // Create new
            const newTemplate = new KPITemplate({
                owner: req.user._id,
                name,
                department,
                rows
            });
            await newTemplate.save();
            return res.json(newTemplate);
        }
    } catch (err) {
        console.error("POST /api/kpi/template ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Get User's Templates
router.get("/api/kpi/templates", verifyToken, async (req, res) => {
    try {
        // console.log("GET /api/kpi/templates called for user:", req.user._id);
        // Get active templates for this user
        const templates = await KPITemplate.find({ owner: req.user._id, is_active: true });
        // console.log(`GET /api/kpi/templates found ${templates.length} templates`);
        res.json(templates);
    } catch (err) {
        console.error("GET /api/kpi/templates ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});



// ==========================================
// SHEET ROUTES
// ==========================================

// List User's Sheets
router.get("/api/kpi/sheets", verifyToken, async (req, res) => {
    try {
        // console.log("GET /api/kpi/sheets called", req.query);
        const { year } = req.query;
        let query = { user: req.user._id };
        if (year) {
            query.year = year;
        }

        const sheets = await KPISheet.find(query)
            .sort({ year: -1, month: -1 })
            .populate('template_version', 'name');

        console.log(`GET /api/kpi/sheets found ${sheets.length} sheets`);
        res.json(sheets);
    } catch (err) {
        console.error("GET /api/kpi/sheets ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Admin: Get All Sheets with filters
router.get("/api/kpi/admin/all-sheets", verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ message: "Admin access required" });
        }

        // console.log("GET /api/kpi/admin/all-sheets called", req.query);
        const { year, month, department } = req.query;
        let query = {};
        if (year) query.year = parseInt(year);
        if (month) query.month = parseInt(month);
        if (department) query.department = department; // Exact match for database array or string

        const sheets = await KPISheet.find(query)
            .populate('user', 'first_name last_name email')
            .populate('template_version', 'name')
            .sort({ year: -1, month: -1 });

        res.json(sheets);
    } catch (err) {
        console.error("GET /api/kpi/admin/all-sheets ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Admin: Get Stats (Submission Rates per Dept)
router.get("/api/kpi/admin/stats", verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ message: "Admin access required" });
        }

        const { year, month } = req.query;
        if (!year || !month) return res.status(400).json({ message: "Year and Month are required" });

        const stats = await KPISheet.aggregate([
            {
                $match: {
                    year: parseInt(year),
                    month: parseInt(month)
                }
            },
            {
                $unwind: "$department" // Deconstruct array fields
            },
            {
                $group: {
                    _id: "$department",
                    total: { $sum: 1 },
                    submitted: { $sum: { $cond: [{ $eq: ["$status", "SUBMITTED"] }, 1, 0] } },
                    approved: { $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, 1, 0] } },
                    rejected: { $sum: { $cond: [{ $eq: ["$status", "REJECTED"] }, 1, 0] } },
                    draft: { $sum: { $cond: [{ $eq: ["$status", "DRAFT"] }, 1, 0] } }
                }
            }
        ]);

        res.json(stats);
    } catch (err) {
        // console.error("GET /api/kpi/admin/stats ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Get or Init Sheet for Month
router.get("/api/kpi/sheet/:id", verifyToken, async (req, res) => {
    try {
        console.log(`GET /api/kpi/sheet/${req.params.id} called`);
        const sheet = await KPISheet.findById(req.params.id)
            .populate('template_version')
            .populate('approval_history.by', 'first_name last_name')
            .populate('assigned_signatories.checked_by', 'first_name last_name')
            .populate('assigned_signatories.verified_by', 'first_name last_name')
            .populate('assigned_signatories.approved_by', 'first_name last_name');

        if (!sheet) {
            console.log(`GET /api/kpi/sheet/${req.params.id} - Not Found`);
            return res.status(404).json({ message: "Sheet not found" });
        }
        console.log(`GET /api/kpi/sheet/${req.params.id} - Success`);
        return res.json(sheet);
    } catch (err) {
        console.error(`GET /api/kpi/sheet/${req.params.id} ERROR:`, err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Delete a KPI Sheet (Owner or Admin only)
router.delete("/api/kpi/sheet/:id", verifyToken, async (req, res) => {
    try {
        console.log(`DELETE /api/kpi/sheet/${req.params.id} called by ${req.user.username}`);
        const sheet = await KPISheet.findById(req.params.id);

        if (!sheet) {
            return res.status(404).json({ message: "Sheet not found" });
        }

        // Check ownership or admin
        const isOwner = sheet.user.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'Admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Not authorized to delete this sheet" });
        }

        // Prevent deleting approved sheets unless admin
        if (sheet.status === 'APPROVED' && !isAdmin) {
            return res.status(400).json({ message: "Cannot delete an approved sheet" });
        }

        await KPISheet.findByIdAndDelete(req.params.id);
        console.log(`DELETE /api/kpi/sheet/${req.params.id} - Success`);
        res.json({ message: "Sheet deleted successfully" });
    } catch (err) {
        console.error(`DELETE /api/kpi/sheet ERROR:`, err);
        res.status(500).json({ message: "Server Error" });
    }
});

router.get("/api/kpi/sheet", verifyToken, async (req, res) => {
    try {
        // console.log("GET /api/kpi/sheet called", req.query);
        const { year, month } = req.query;
        // Find existing
        const sheet = await KPISheet.findOne({
            user: req.user._id,
            year: parseInt(year),
            month: parseInt(month)
        }).populate('template_version').populate('approval_history.by', 'first_name last_name');

        if (sheet) {
            console.log("GET /api/kpi/sheet - Found existing sheet");
            return res.json(sheet);
        } else {
            console.log("GET /api/kpi/sheet - Not Found");
            return res.status(404).json({ message: "Sheet not created yet" });
        }
    } catch (err) {
        console.error("GET /api/kpi/sheet ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

router.post("/api/kpi/sheet/generate", verifyToken, async (req, res) => {
    try {
        console.log("POST /api/kpi/sheet/generate called", req.body);
        const { year, month, templateId, signatories, overwrite } = req.body;

        const existing = await KPISheet.findOne({
            user: req.user._id,
            year,
            month
        });
        if (existing) {
            if (overwrite) {
                // Delete the old sheet to replace it
                await KPISheet.findByIdAndDelete(existing._id);
                console.log("POST /api/kpi/sheet/generate - Overwriting existing sheet");
            } else {
                console.log("POST /api/kpi/sheet/generate - Sheet already exists (No overwrite flag)");
                // Return 409 Conflict to signal frontend to prompt user
                return res.status(409).json({ message: "Sheet already exists" });
            }
        }

        const template = await KPITemplate.findById(templateId);
        if (!template) {
            console.log("POST /api/kpi/sheet/generate - Template not found");
            return res.status(404).json({ message: "Template not found" });
        }

        // Create Sheet Rows from Template
        const sheetRows = template.rows.map(r => ({
            row_id: r.id,
            label: r.label,
            type: r.type || 'numeric',
            daily_values: {},
            total: 0
        }));

        const user = await UserModel.findById(req.user._id);

        // FETCH MANDATORY USERS
        const verifier = await UserModel.findOne({ username: 'shalini_arun' });
        const approver = await UserModel.findOne({ username: 'suraj_rajan' });

        if (!verifier) console.warn("Standard Verifier 'shalini_arun' not found!");
        if (!approver) console.warn("Standard Approver 'suraj_rajan' not found!");

        const newSheet = new KPISheet({
            user: req.user._id,
            department: template.department, // Strictly bind to template dept
            year,
            month,
            template_version: template._id,
            rows: sheetRows,
            status: "DRAFT",
            signatures: {
                prepared_by: `${user.first_name} ${user.last_name || ''}`
            },
            assigned_signatories: {
                checked_by: (signatories?.checked_by && signatories.checked_by !== '') ? signatories.checked_by : undefined,
                verified_by: verifier ? verifier._id : undefined,
                approved_by: approver ? approver._id : undefined
            }
        });

        await newSheet.save();
        console.log("POST /api/kpi/sheet/generate - Success, Created ID:", newSheet._id);
        res.json(newSheet);

    } catch (err) {
        console.error("POST /api/kpi/sheet/generate ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Update Cell Value
router.put("/api/kpi/sheet/entry", verifyToken, async (req, res) => {
    try {
        console.log("PUT /api/kpi/sheet/entry called", req.body);
        const { sheetId, rowId, day, value } = req.body;

        const sheet = await KPISheet.findById(sheetId);
        if (!sheet) {
            console.log("PUT /api/kpi/sheet/entry - Sheet not found");
            return res.status(404).json({ message: "Sheet not found" });
        }

        // Security: Check User
        if (sheet.user.toString() !== req.user._id.toString()) {
            console.log("PUT /api/kpi/sheet/entry - Unauthorized User");
            return res.status(403).json({ message: "Not authorized to edit this sheet" });
        }

        // Locking Checks
        if (sheet.status !== "DRAFT" && sheet.status !== "REJECTED") {
            console.log("PUT /api/kpi/sheet/entry - Sheet Locked Status:", sheet.status);
            return res.status(400).json({ message: "Sheet is locked due to status" });
        }

        const currentYear = sheet.year;
        const currentMonth = sheet.month - 1; // 0-indexed

        // 1. Check if Sunday
        const entryDate = new Date(currentYear, currentMonth, day);
        if (entryDate.getDay() === 0) {
            return res.status(400).json({ message: "Cannot edit Sunday values" });
        }

        // 2. Check if Holiday
        if (sheet.holidays.includes(Number(day))) {
            return res.status(400).json({ message: "Cannot edit Holiday values" });
        }

        // Deadline Check - Users can edit until last working day of the month
        const today = new Date();
        const getLastWorkingDayOfMonth = (year, month) => {
            let d = new Date(year, month, 0);
            while (d.getDay() === 0) {
                d.setDate(d.getDate() - 1);
            }
            return d;
        };
        const deadline = getLastWorkingDayOfMonth(sheet.year, sheet.month);
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());

        if (todayDate > deadlineDate) {
            return res.status(403).json({ message: "KPI locked. Submission deadline passed." });
        }

        // Note: Weekly locking is disabled - users can edit any day within the month until deadline
        // If you want to re-enable weekly locking in the future, uncomment the code below:
        /*
        const now = new Date();
        const startOfCurrentWeek = new Date(now);
        startOfCurrentWeek.setHours(0, 0, 0, 0);
        startOfCurrentWeek.setDate(now.getDate() - now.getDay());
        if (entryDate < startOfCurrentWeek) {
            return res.status(400).json({ message: "Past weeks are locked" });
        }
        */

        if (Number(value) < 0) {
            return res.status(400).json({ message: "Negative values are not allowed" });
        }


        const row = sheet.rows.find(r => r.row_id === rowId);
        if (!row) {
            console.log("PUT /api/kpi/sheet/entry - Row not found:", rowId);
            return res.status(404).json({ message: "Row not found" });
        }

        // Update value
        const oldValue = row.daily_values.get(day.toString());
        row.daily_values.set(day.toString(), Number(value));

        // Audit Log
        sheet.audit_log.push({
            field: `row:${row.label}:${day}`,
            old_value: oldValue,
            new_value: value,
            changed_by: req.user._id,
            action: "UPDATE"
        });

        // Recalculate Total (Excluding Sundays and Holidays)
        let sum = 0;
        for (let [d, val] of row.daily_values.entries()) {
            const dNum = Number(d);
            const dDate = new Date(currentYear, currentMonth, dNum);
            // Skip Sundays
            if (dDate.getDay() === 0) continue;
            // Skip Holidays
            if (sheet.holidays.includes(dNum)) continue;

            sum += val;
        }
        row.total = sum;

        await sheet.save();
        console.log("PUT /api/kpi/sheet/entry - Success");
        res.json(sheet);

    } catch (err) {
        console.error("PUT /api/kpi/sheet/entry ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Toggle Holiday/Leave/Festival
router.post("/api/kpi/sheet/holiday", verifyToken, async (req, res) => {
    try {
        console.log("POST /api/kpi/sheet/holiday called", req.body);
        const { sheetId, day, type = 'leave' } = req.body; // type: 'leave' or 'festival'
        const sheet = await KPISheet.findById(sheetId);
        if (!sheet) return res.status(404).json({ message: "Sheet not found" });

        if (sheet.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Unauthorized" });

        // Deadline Check
        const today = new Date();
        const getLastWorkingDayOfMonth = (year, month) => {
            let d = new Date(year, month, 0);
            while (d.getDay() === 0) {
                d.setDate(d.getDate() - 1);
            }
            return d;
        };
        const deadline = getLastWorkingDayOfMonth(sheet.year, sheet.month);
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());

        if (todayDate > deadlineDate) {
            return res.status(403).json({ message: "KPI locked. Submission deadline passed." });
        }

        const dayNum = Number(day);
        let action = "";

        if (type === 'festival') {
            // Handle festival holidays
            if (!sheet.festivals) sheet.festivals = [];
            const idx = sheet.festivals.indexOf(dayNum);
            if (idx > -1) {
                sheet.festivals.splice(idx, 1);
                action = "REMOVED";
            } else {
                sheet.festivals.push(dayNum);
                action = "ADDED";
            }

            // Audit
            sheet.audit_log.push({
                field: `festival:${day}`,
                old_value: action === "ADDED" ? false : true,
                new_value: action === "ADDED" ? true : false,
                changed_by: req.user._id,
                action: "UPDATE"
            });
        } else {
            // Handle leaves/holidays (default)
            const idx = sheet.holidays.indexOf(dayNum);
            if (idx > -1) {
                sheet.holidays.splice(idx, 1);
                action = "REMOVED";
            } else {
                sheet.holidays.push(dayNum);
                action = "ADDED";
            }

            // Audit
            sheet.audit_log.push({
                field: `leave:${day}`,
                old_value: action === "ADDED" ? false : true,
                new_value: action === "ADDED" ? true : false,
                changed_by: req.user._id,
                action: "UPDATE"
            });
        }

        // Recalculate ALL totals because holiday/festival status changed
        const currentYear = sheet.year;
        const currentMonth = sheet.month - 1;

        sheet.rows.forEach(row => {
            let sum = 0;
            for (let [d, val] of row.daily_values.entries()) {
                const dNum = Number(d);
                const dDate = new Date(currentYear, currentMonth, dNum);
                // Skip Sundays
                if (dDate.getDay() === 0) continue;
                // Skip Leaves
                if (sheet.holidays.includes(dNum)) continue;
                // Skip Festivals
                if (sheet.festivals && sheet.festivals.includes(dNum)) continue;

                sum += val;
            }
            row.total = sum;
        });

        await sheet.save();
        console.log("POST /api/kpi/sheet/holiday - Success, Type:", type, "Holidays:", sheet.holidays, "Festivals:", sheet.festivals);
        res.json(sheet);
    } catch (err) {
        console.error("POST /api/kpi/sheet/holiday ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Submit KPI
router.post("/api/kpi/sheet/submit", verifyToken, async (req, res) => {
    try {
        const { sheetId, summary } = req.body;
        const sheet = await KPISheet.findById(sheetId);
        if (!sheet) return res.status(404).json({ message: "Sheet not found" });

        if (sheet.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Unauthorized" });

        if (sheet.status !== "DRAFT" && sheet.status !== "REJECTED") {
            return res.status(400).json({ message: "Sheet cannot be submitted in current status" });
        }

        // Deadline Check
        const today = new Date();
        const getLastWorkingDayOfMonth = (year, month) => {
            let d = new Date(year, month, 0);
            while (d.getDay() === 0) {
                d.setDate(d.getDate() - 1);
            }
            return d;
        };
        const deadline = getLastWorkingDayOfMonth(sheet.year, sheet.month);
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());

        if (todayDate > deadlineDate) {
            return res.status(403).json({ message: "KPI locked. Submission deadline passed." });
        }

        // Update Summary if provided
        if (summary) {
            sheet.summary = { ...sheet.summary, ...summary, submission_date: new Date() };
        }

        sheet.status = "SUBMITTED";
        sheet.approval_history.push({
            action: "SUBMIT",
            by: req.user._id,
            comments: "Submitted for approval"
        });

        // Audit
        sheet.audit_log.push({
            field: "status",
            old_value: "DRAFT/REJECTED",
            new_value: "SUBMITTED",
            changed_by: req.user._id,
            action: "UPDATE"
        });

        // Lock the sheet effectively by status change
        await sheet.save();
        res.json(sheet);
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
});

// ==========================================
// REVIEWER DASHBOARD - Get sheets pending review for current user
// ==========================================
router.get("/api/kpi/reviewer/pending", verifyToken, async (req, res) => {
    try {
        const userId = req.user._id;
        const username = req.user.username;

        // Special users have elevated permissions
        const isShalini = username === 'shalini_arun';
        const isSuraj = username === 'suraj_rajan';
        const isAdmin = req.user.role === 'Admin';

        let pendingCheck = [];
        let pendingVerify = [];
        let pendingApprove = [];

        // Pending CHECK - SUBMITTED sheets
        // Normal users: only if assigned as checked_by
        // Shalini: can check any sheet
        // Suraj: can check any sheet
        // Admin: can check any sheet
        if (isShalini || isSuraj || isAdmin) {
            pendingCheck = await KPISheet.find({ status: 'SUBMITTED' })
                .populate('user', 'first_name last_name email')
                .populate('template_version', 'name')
                .sort({ updatedAt: -1 });
        } else {
            pendingCheck = await KPISheet.find({
                'assigned_signatories.checked_by': userId,
                status: 'SUBMITTED'
            })
                .populate('user', 'first_name last_name email')
                .populate('template_version', 'name')
                .sort({ updatedAt: -1 });
        }

        // Pending VERIFY - CHECKED sheets
        // Shalini: can verify any sheet
        // Suraj: can verify any sheet
        // Admin: can verify any sheet
        if (isShalini || isSuraj || isAdmin) {
            pendingVerify = await KPISheet.find({ status: 'CHECKED' })
                .populate('user', 'first_name last_name email')
                .populate('template_version', 'name')
                .sort({ updatedAt: -1 });
        } else {
            pendingVerify = await KPISheet.find({
                'assigned_signatories.verified_by': userId,
                status: 'CHECKED'
            })
                .populate('user', 'first_name last_name email')
                .populate('template_version', 'name')
                .sort({ updatedAt: -1 });
        }

        // Pending APPROVE - VERIFIED sheets
        // Suraj: can approve any sheet
        // Admin: can approve any sheet
        if (isSuraj || isAdmin) {
            pendingApprove = await KPISheet.find({ status: 'VERIFIED' })
                .populate('user', 'first_name last_name email')
                .populate('template_version', 'name')
                .sort({ updatedAt: -1 });
        } else {
            pendingApprove = await KPISheet.find({
                'assigned_signatories.approved_by': userId,
                status: 'VERIFIED'
            })
                .populate('user', 'first_name last_name email')
                .populate('template_version', 'name')
                .sort({ updatedAt: -1 });
        }

        // Also get recently processed by this user (for history)
        const recentlyProcessed = await KPISheet.find({
            'approval_history.by': userId
        })
            .populate('user', 'first_name last_name email')
            .populate('template_version', 'name')
            .sort({ updatedAt: -1 })
            .limit(20);

        res.json({
            pending_check: pendingCheck,
            pending_verify: pendingVerify,
            pending_approve: pendingApprove,
            recently_processed: recentlyProcessed,
            counts: {
                check: pendingCheck.length,
                verify: pendingVerify.length,
                approve: pendingApprove.length
            }
        });
    } catch (err) {
        console.error("GET /api/kpi/reviewer/pending ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Approve/Reject KPI (HoD)
// Approve/Review KPI Flow
router.post("/api/kpi/sheet/review", verifyToken, async (req, res) => {
    try {
        console.log("POST /api/kpi/sheet/review called", req.body);
        const { sheetId, action, comments } = req.body; // action: CHECK, VERIFY, APPROVE, REJECT
        const sheet = await KPISheet.findById(sheetId);
        if (!sheet) return res.status(404).json({ message: "Sheet not found" });

        console.log(`Reviewing Sheet: ID=${sheetId}, Current Status=${sheet.status}, Requested Action=${action}, User=${req.user.username}(${req.user.role})`);

        // Prevent Self-Approval (Generic rule, though distinct roles usually prevent this naturally)
        if (sheet.user.toString() === req.user._id.toString() && req.user.role !== 'Admin') {
            console.log("Self-review blocked");
            return res.status(403).json({ message: "Cannot review your own KPI sheet" });
        }

        const oldStatus = sheet.status;
        const currentUserId = req.user._id.toString();
        const username = req.user.username;
        const isAdmin = req.user.role === 'Admin';
        const isShalini = username === 'shalini_arun';
        const isSuraj = username === 'suraj_rajan';

        if (action === "REJECT") {
            sheet.status = "REJECTED";
            sheet.is_fully_locked = false; // Unlock
        }
        else if (action === "CHECK") {
            if (sheet.status !== "SUBMITTED") return res.status(400).json({ message: "Sheet is not in Submitted state" });

            // Validate User - Admin, Shalini, Suraj, or assigned checker can check
            const isAssignedChecker = sheet.assigned_signatories?.checked_by?.toString() === currentUserId;
            if (!isAdmin && !isShalini && !isSuraj && !isAssignedChecker) {
                return res.status(403).json({ message: "You are not authorized to Check this sheet" });
            }

            sheet.status = "CHECKED";
            sheet.signatures.checked_by = `${req.user.first_name} ${req.user.last_name || ''}`;
        }
        else if (action === "VERIFY") {
            if (sheet.status !== "CHECKED") return res.status(400).json({ message: "Sheet is not in Checked state" });

            // Validate User - Admin, Shalini, Suraj, or assigned verifier can verify
            const isAssignedVerifier = sheet.assigned_signatories?.verified_by?.toString() === currentUserId;
            if (!isAdmin && !isShalini && !isSuraj && !isAssignedVerifier) {
                return res.status(403).json({ message: "You are not authorized to Verify this sheet" });
            }

            sheet.status = "VERIFIED";
            sheet.signatures.verified_by = `${req.user.first_name} ${req.user.last_name || ''}`;
        }
        else if (action === "APPROVE") {
            if (sheet.status !== "VERIFIED") return res.status(400).json({ message: "Sheet is not in Verified state" });

            // Validate User - Admin, Suraj, or assigned approver can approve (NOT Shalini)
            const isAssignedApprover = sheet.assigned_signatories?.approved_by?.toString() === currentUserId;
            if (!isAdmin && !isSuraj && !isAssignedApprover) {
                return res.status(403).json({ message: "You are not authorized to Approve this sheet" });
            }

            sheet.status = "APPROVED";
            sheet.is_fully_locked = true;
            sheet.signatures.approved_by = `${req.user.first_name} ${req.user.last_name || ''}`;
        }
        else {
            return res.status(400).json({ message: "Invalid action" });
        }

        sheet.approval_history.push({
            action: action,
            by: req.user._id,
            comments: comments
        });

        // Audit
        sheet.audit_log.push({
            field: "status",
            old_value: oldStatus,
            new_value: sheet.status,
            changed_by: req.user._id,
            action: "UPDATE"
        });

        await sheet.save();
        res.json(sheet);
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
});

// DELETE Sheet (Admin Only)
router.delete("/api/kpi/sheet/:id", verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ message: "Admin access required" });
        }
        await KPISheet.findByIdAndDelete(req.params.id);
        res.json({ message: "Sheet deleted" });
    } catch (err) {
        console.error("DELETE /api/kpi/sheet ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Add Custom Row to Sheet
router.post("/api/kpi/sheet/row", verifyToken, async (req, res) => {
    try {
        console.log("POST /api/kpi/sheet/row called", req.body);
        const { sheetId, row } = req.body;

        const sheet = await KPISheet.findById(sheetId);
        if (!sheet) return res.status(404).json({ message: "Sheet not found" });

        // Check ownership
        if (sheet.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        // Check status
        if (sheet.status !== "DRAFT" && sheet.status !== "REJECTED") {
            return res.status(400).json({ message: "Cannot add rows to locked sheet" });
        }

        // Add new row
        sheet.rows.push({
            row_id: row.row_id,
            label: row.label,
            daily_values: new Map(),
            total: 0,
            is_custom: true
        });

        // Audit log
        sheet.audit_log.push({
            field: `row:${row.label}`,
            old_value: null,
            new_value: row.label,
            changed_by: req.user._id,
            action: "ADD_ROW"
        });

        await sheet.save();
        console.log("POST /api/kpi/sheet/row - Success");
        res.json(sheet);
    } catch (err) {
        console.error("POST /api/kpi/sheet/row ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Remove Custom Row from Sheet
router.delete("/api/kpi/sheet/row/:sheetId/:rowId", verifyToken, async (req, res) => {
    try {
        console.log("DELETE /api/kpi/sheet/row called", req.params);
        const { sheetId, rowId } = req.params;

        const sheet = await KPISheet.findById(sheetId);
        if (!sheet) return res.status(404).json({ message: "Sheet not found" });

        // Check ownership
        if (sheet.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        // Check status
        if (sheet.status !== "DRAFT" && sheet.status !== "REJECTED") {
            return res.status(400).json({ message: "Cannot remove rows from locked sheet" });
        }

        // Find row
        const rowIndex = sheet.rows.findIndex(r => r.row_id === rowId);
        if (rowIndex === -1) {
            return res.status(404).json({ message: "Row not found" });
        }

        const removedRow = sheet.rows[rowIndex];

        // Only allow removing custom rows
        if (!removedRow.is_custom) {
            return res.status(400).json({ message: "Cannot remove template rows" });
        }

        // Remove row
        sheet.rows.splice(rowIndex, 1);

        // Audit log
        sheet.audit_log.push({
            field: `row:${removedRow.label}`,
            old_value: removedRow.label,
            new_value: null,
            changed_by: req.user._id,
            action: "REMOVE_ROW"
        });

        await sheet.save();
        console.log("DELETE /api/kpi/sheet/row - Success");
        res.json({ message: "Row removed" });
    } catch (err) {
        console.error("DELETE /api/kpi/sheet/row ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// DELETE Template (Admin Only)
router.delete("/api/kpi/template/:id", verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ message: "Admin access required" });
        }
        // Soft delete or hard delete? User said "delete". Safe to soft delete usually but for "Delete option", hard delete might be expected or `is_active=false`.
        // I will do soft delete for safety if it's referenced, but template manager usually hides inactive.
        // Existing "Create/Update" sets `is_active=false` for OLD versions.
        // If I delete a template, I should probably set `is_active=false`.

        await KPITemplate.findByIdAndUpdate(req.params.id, { is_active: false });
        res.json({ message: "Template deleted" });
    } catch (err) {
        console.error("DELETE /api/kpi/template ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

export default router;
