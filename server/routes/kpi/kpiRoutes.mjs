import express from "express";
import verifyToken from "../../middleware/authMiddleware.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import KPITemplate from "../../model/kpi/kpiTemplateModel.mjs";
import KPISheet from "../../model/kpi/kpiSheetModel.mjs";
import KPISettings from "../../model/kpi/kpiSettingsModel.mjs";
import UserModel from "../../model/userModel.mjs";
import TeamModel from "../../model/teamModel.mjs";
import translate from "google-translate-api-x";

const router = express.Router();

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const calculateKPIMetrics = (sheet) => {
    let totalValueScore = 0;
    let totalQuantity = 0;

    const currentYear = Number(sheet.year);
    const currentMonth = Number(sheet.month) - 1;

    // Holidays, Festivals, Working Sundays
    // Ensure we handle Mongoose arrays/maps correctly
    const holidays = Array.isArray(sheet.holidays) ? sheet.holidays.map(Number) : [];
    const festivals = Array.isArray(sheet.festivals) ? sheet.festivals.map(Number) : [];
    const workingSundays = Array.isArray(sheet.working_sundays) ? sheet.working_sundays.map(Number) : [];

    if (!sheet.rows || !Array.isArray(sheet.rows)) return {
        total_value_score: 0,
        average_complexity: 0,
        total_quantity: 0,
        performance_quadrant: "Drainer"
    };

    sheet.rows.forEach(row => {
        let rowSum = 0;
        
        // Handle Map or Object
        let dailyValues = row.daily_values;
        if (dailyValues) {
            const keys = dailyValues instanceof Map ? Array.from(dailyValues.keys()) : Object.keys(dailyValues);
            
            for (const d of keys) {
                const dNum = Number(d);
                if (isNaN(dNum)) continue;

                const val = dailyValues instanceof Map ? dailyValues.get(d) : dailyValues[d];
                const valNum = Number(val) || 0;

                const dDate = new Date(currentYear, currentMonth, dNum);
                const dayOfWeek = dDate.getDay(); // 0 is Sunday

                // SKIP LOGIC
                if (dayOfWeek === 0 && !workingSundays.includes(dNum)) continue;
                if (holidays.includes(dNum)) continue;
                if (festivals.includes(dNum)) continue;

                rowSum += valNum;
            }
        }
        
        row.total = rowSum;
        const rowWeight = Number(row.weight) || 3;
        totalValueScore += (rowSum * rowWeight);
        totalQuantity += rowSum;
    });

    const averageComplexity = totalQuantity > 0 ? (totalValueScore / totalQuantity) : 0;

    // Thresholds
    const WEIGHT_THRESHOLD = 3.0;
    const VOLUME_THRESHOLD = 100;

    let quadrant = "Drainer";
    if (averageComplexity >= WEIGHT_THRESHOLD && totalQuantity >= VOLUME_THRESHOLD) quadrant = "Star";
    else if (averageComplexity >= WEIGHT_THRESHOLD && totalQuantity < VOLUME_THRESHOLD) quadrant = "Specialist";
    else if (averageComplexity < WEIGHT_THRESHOLD && totalQuantity >= VOLUME_THRESHOLD) quadrant = "Engine";

    return {
        total_value_score: totalValueScore,
        average_complexity: Number(averageComplexity.toFixed(2)),
        total_quantity: totalQuantity,
        performance_quadrant: quadrant
    };
};

// ==========================================
// TEMPLATE ROUTES
// ==========================================

// Create or Update Template
router.post("/api/kpi/template", verifyToken, auditMiddleware("KPI_Template"), async (req, res) => {
    try {
        const { id, name, department, rows } = req.body;
        console.log("POST /api/kpi/template called", req.body);
        let targetDept = department;
        if (Array.isArray(targetDept)) targetDept = targetDept[0];
        if (!targetDept && !id) {
            return res.status(400).json({ message: "Department is required" });
        }

        if (id) {
            // Update existing logic (creates new version concept ideally, but for now simple update)
            // Prompt says: "Every template edit creates a new version. Older versions remain immutable"

            const existing = await KPITemplate.findById(id);
            if (!existing) return res.status(404).json({ message: "Template not found" });

            // Authorization: Owner, Admin, or HOD of the owner
            const isOwner = existing.owner.toString() === req.user._id.toString();
            const isAdmin = req.user.role === 'Admin';
            let isTeamHOD = false;
            
            if (!isOwner && !isAdmin && req.user.role === 'Head_of_Department') {
                const team = await TeamModel.findOne({ 
                    hodId: req.user._id, 
                    'members.userId': existing.owner 
                });
                if (team) isTeamHOD = true;
            }

            if (!isOwner && !isAdmin && !isTeamHOD) {
                return res.status(403).json({ message: "You are not authorized to edit this template" });
            }

            // Deactivate old one
            existing.is_active = false;
            // Use findByIdAndUpdate for deactivation to bypass potential validation issues with legacy data
            await KPITemplate.findByIdAndUpdate(existing._id, { is_active: false });

            // Create new version
            const newTemplate = new KPITemplate({
                owner: existing.owner, // Keep original owner
                name: name || existing.name,
                department: targetDept || (Array.isArray(existing.department) ? existing.department[0] : existing.department) || "General",
                rows: rows,
                version: (existing.version || 1) + 1,
                parent_template: existing._id
            });
            await newTemplate.save();
            return res.json(newTemplate);

        } else {
            // Create new
            const newTemplate = new KPITemplate({
                owner: req.user._id,
                name,
                department: targetDept || "General",
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

// Get User's Templates (Admin/HOD see relevant shared templates)
router.get("/api/kpi/templates", verifyToken, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'Admin';
        const isHOD = req.user.role === 'Head_of_Department';

        let query = { is_active: true };

        if (isAdmin) {
            // Admin sees all active templates
        } else if (isHOD) {
            // HOD sees their own templates OR templates from their team members
            const teams = await TeamModel.find({ hodId: req.user._id });
            const memberIds = new Set([req.user._id.toString()]);
            teams.forEach(t => {
                t.members.forEach(m => memberIds.add(m.userId.toString()));
            });
            query.owner = { $in: Array.from(memberIds) };
        } else {
            // Regular user only sees their own
            query.owner = req.user._id;
        }

        const templates = await KPITemplate.find(query).populate('owner', 'first_name last_name username').lean();
        
        // Enrich with team info
        const teams = await TeamModel.find({ isActive: true }).lean();
        const enrichedTemplates = templates.map(tmpl => {
            const ownerId = tmpl.owner?._id?.toString();
            const userTeam = teams.find(t => 
                t.hodId?.toString() === ownerId || 
                t.members.some(m => m.userId?.toString() === ownerId)
            );
            return {
                ...tmpl,
                teamName: userTeam ? userTeam.name : 'General'
            };
        });

        res.json(enrichedTemplates);
    } catch (err) {
        console.error("GET /api/kpi/templates ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Get User's Department from Team Membership
router.get("/api/kpi/my-department", verifyToken, async (req, res) => {
    try {
        // First check user's own department field
        const user = await UserModel.findById(req.user._id);
        if (user && user.department) {
            return res.json({ department: user.department });
        }

        // Fall back to team's department if user doesn't have one
        // Find team where user is a member
        const team = await TeamModel.findOne({
            "members.userId": req.user._id,
            isActive: true
        });

        if (team && team.department) {
            return res.json({ department: team.department });
        }

        // If not found as member, check if user is HOD
        const hodTeam = await TeamModel.findOne({
            hodId: req.user._id,
            isActive: true
        });

        if (hodTeam && hodTeam.department) {
            return res.json({ department: hodTeam.department });
        }

        res.json({ department: null });
    } catch (err) {
        console.error("GET /api/kpi/my-department ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Get HODs for current user (based on team membership)
router.get("/api/kpi/my-hods", verifyToken, async (req, res) => {
    try {
        // Find all teams where the current user is a member
        const teams = await TeamModel.find({ "members.userId": req.user._id });

        if (!teams || teams.length === 0) {
            // User is not part of any team - return empty array
            return res.json([]);
        }

        // Get unique HOD IDs from all teams
        const hodIds = [...new Set(teams.map(t => t.hodId.toString()))];

        // Fetch HOD user details
        const hods = await UserModel.find({ _id: { $in: hodIds } })
            .select('_id first_name last_name username');

        res.json(hods);
    } catch (err) {
        console.error("GET /api/kpi/my-hods ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Get Team Members' Templates
router.get("/api/kpi/team-templates", verifyToken, async (req, res) => {
    try {
        // Find all teams where the current user is a member or HOD
        const teams = await TeamModel.find({
            $or: [
                { "members.userId": req.user._id },
                { hodId: req.user._id }
            ]
        });

        if (!teams || teams.length === 0) {
            return res.json([]);
        }

        // Get all team member IDs (excluding current user)
        const memberIds = new Set();
        teams.forEach(team => {
            // Add HOD
            if (team.hodId.toString() !== req.user._id.toString()) {
                memberIds.add(team.hodId.toString());
            }
            // Add members
            team.members.forEach(m => {
                if (m.userId.toString() !== req.user._id.toString()) {
                    memberIds.add(m.userId.toString());
                }
            });
        });

        if (memberIds.size === 0) {
            return res.json([]);
        }

        // Fetch templates from these team members
        const templates = await KPITemplate.find({
            owner: { $in: [...memberIds] },
            is_active: true
        }).populate('owner', 'first_name last_name username');

        res.json(templates);
    } catch (err) {
        console.error("GET /api/kpi/team-templates ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Import a team member's template as own template
router.post("/api/kpi/import-template", verifyToken, auditMiddleware("KPI_Template"), async (req, res) => {
    try {
        const { templateId, customName } = req.body;

        // Fetch the source template
        const sourceTemplate = await KPITemplate.findById(templateId).populate('owner', 'first_name last_name');
        if (!sourceTemplate) {
            return res.status(404).json({ message: "Template not found" });
        }

        // Use custom name if provided, otherwise use source template name
        const templateName = customName?.trim() || sourceTemplate.name;

        // Validate template name is not empty
        if (!templateName) {
            return res.status(400).json({ message: "Template name is required" });
        }

        // Check if user already has a template with the same name (case-insensitive)
        const existingTemplate = await KPITemplate.findOne({
            owner: req.user._id,
            is_active: true
        });

        const existingWithSameName = await KPITemplate.findOne({
            owner: req.user._id,
            name: { $regex: new RegExp(`^${templateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            is_active: true
        });

        if (existingWithSameName) {
            return res.status(409).json({
                message: `You already have a template named "${templateName}". Please use a different name.`
            });
        }

        // Create a copy of the template for the current user
        const newTemplate = new KPITemplate({
            name: templateName,
            department: sourceTemplate.department,
            rows: sourceTemplate.rows.map(row => ({
                id: row.id,
                label: row.label,
                type: row.type || 'numeric',
                category: row.category,
                is_high_volume: row.is_high_volume,
                weight: row.weight || 3
            })),
            owner: req.user._id,
            is_active: true,
            parent_template: sourceTemplate._id
        });

        await newTemplate.save();

        res.status(201).json({
            message: `Template "${templateName}" imported successfully`,
            template: newTemplate
        });
    } catch (err) {
        console.error("POST /api/kpi/import-template ERROR:", err);
        res.status(500).json({ message: "Server Error: " + err.message });
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

// Admin: Get Stats (Submission Rates per Team)
router.get("/api/kpi/admin/stats", verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ message: "Admin access required" });
        }

        const { year, month } = req.query;
        if (!year || !month) return res.status(400).json({ message: "Year and Month are required" });

        const iYear = parseInt(year);
        const iMonth = parseInt(month);

        // Fetch all active teams
        const teams = await TeamModel.find({ isActive: true });
        
        const stats = [];

        for (const team of teams) {
            // Get all member IDs including HOD
            const memberIds = team.members.map(m => m.userId.toString());
            if (team.hodId) memberIds.push(team.hodId.toString());
            
            const uniqueMemberIds = [...new Set(memberIds)];

            // Find sheets for these users
            const sheets = await KPISheet.find({
                year: iYear,
                month: iMonth,
                user: { $in: uniqueMemberIds }
            });

            stats.push({
                _id: team.name,
                total: uniqueMemberIds.length,
                submitted: sheets.filter(s => ["SUBMITTED", "CHECKED", "VERIFIED", "APPROVED"].includes(s.status)).length,
                approved: sheets.filter(s => s.status === "APPROVED").length,
                rejected: sheets.filter(s => s.status === "REJECTED").length,
                draft: sheets.filter(s => s.status === "DRAFT").length
            });
        }

        res.json(stats);
    } catch (err) {
        console.error("GET /api/kpi/admin/stats ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Admin: Get Detailed Submission Status for a month/year
router.get("/api/kpi/admin/submission-status", verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ message: "Admin access required" });
        }

        const { year, month, department, team: teamName } = req.query;
        if (!year || !month) return res.status(400).json({ message: "Year and Month are required" });

        const iYear = parseInt(year);
        const iMonth = parseInt(month);

        let targetUserIds = null;

        // If team is specified, get members of that team
        if (teamName) {
            const team = await TeamModel.findOne({ name: teamName, isActive: true });
            if (team) {
                targetUserIds = team.members.map(m => m.userId.toString());
                if (team.hodId) targetUserIds.push(team.hodId.toString());
                targetUserIds = [...new Set(targetUserIds)];
            }
        }

        // 1. Get users based on team, department, or all
        let userQuery = { isActive: { $ne: false } };
        if (targetUserIds) {
            userQuery._id = { $in: targetUserIds };
        } else if (department) {
            userQuery.department = department;
        }

        const allUsers = await UserModel.find(userQuery, 'first_name last_name email department');
        const allUserIdsFound = allUsers.map(u => u._id);

        // 2. Get all KPI sheets for these users in this month/year
        const sheets = await KPISheet.find({
            year: iYear,
            month: iMonth,
            user: { $in: allUserIdsFound }
        }).populate('user', 'first_name last_name email');

        // 3. Get deadline for this month
        const getSubmissionDeadline = async (y, m) => {
            let deadlineYear = y;
            let deadlineMonth = m + 1; // Deadline is next month
            if (deadlineMonth > 12) {
                deadlineMonth = 1;
                deadlineYear = y + 1;
            }
            let deadline = new Date(deadlineYear, deadlineMonth - 1, 4);
            while (deadline.getDay() === 0) {
                deadline.setDate(deadline.getDate() - 1);
            }

            // Check override
            const override = await KPISettings.findOne({ key: 'submission_deadline_override' });
            if (override && override.value) {
                const ov = override.value;
                if (ov.year === y && ov.month === m && ov.deadline_date) {
                    return new Date(ov.deadline_date);
                }
            }
            return deadline;
        };

        const deadline = await getSubmissionDeadline(iYear, iMonth);
        const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate(), 23, 59, 59);

        // 4. Map everything
        const userStatus = allUsers.map(user => {
            const sheet = sheets.find(s => s.user._id.toString() === user._id.toString());
            const submitted = sheet ? (['SUBMITTED', 'CHECKED', 'VERIFIED', 'APPROVED'].includes(sheet.status)) : false;

            let isLate = false;
            let submissionDate = null;

            if (sheet && sheet.summary?.submission_date) {
                submissionDate = new Date(sheet.summary.submission_date);
                if (submissionDate > deadlineDate) {
                    isLate = true;
                }
            }

            return {
                userId: user._id,
                name: `${user.first_name} ${user.last_name || ''}`,
                email: user.email,
                department: user.department,
                hasSheet: !!sheet,
                status: sheet ? sheet.status : 'NOT_CREATED',
                submitted,
                submissionDate,
                isLate,
                sheetId: sheet ? sheet._id : null
            };
        });

        res.json({
            users: userStatus,
            deadline: deadlineDate,
            stats: {
                total: allUsers.length,
                submitted: userStatus.filter(u => u.submitted).length,
                late: userStatus.filter(u => u.isLate).length,
                pending: userStatus.filter(u => !u.submitted).length
            }
        });

    } catch (err) {
        console.error("GET /api/kpi/admin/submission-status ERROR:", err);
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

        if (sheet.status !== 'DRAFT' && (!sheet.summary?.total_value_score || sheet.summary?.total_value_score === 0)) {
            console.log(`GET /api/kpi/sheet/${req.params.id} - Fixing missing metrics for ${sheet.status} sheet`);
            const metrics = calculateKPIMetrics(sheet);
            sheet.summary = Object.assign({}, sheet.summary?.toObject() || {}, metrics);
            sheet.markModified('summary');
            sheet.markModified('rows');
            await sheet.save();
        }
        console.log(`GET /api/kpi/sheet/${req.params.id} - Success`);
        return res.json(sheet);
    } catch (err) {
        console.error(`GET /api/kpi/sheet/${req.params.id} ERROR:`, err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Delete a KPI Sheet (Owner or Admin only)
router.delete("/api/kpi/sheet/:id", verifyToken, auditMiddleware("KPI_Sheet"), async (req, res) => {
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

router.post("/api/kpi/sheet/generate", verifyToken, auditMiddleware("KPI_Sheet"), async (req, res) => {
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

        const sheetRows = template.rows.map(r => ({
            row_id: r.id,
            label: r.label,
            label_gu: r.label_gu || '',
            label_hi: r.label_hi || '',
            type: r.type || 'numeric',
            weight: r.weight || 3,
            daily_values: {},
            total: 0
        }));

        const user = await UserModel.findById(req.user._id);

        // FETCH MANDATORY USERS
        const verifier = await UserModel.findOne({ username: 'shalini_arun' });
        const approver = await UserModel.findOne({ username: 'suraj_rajan' });

        if (!verifier) console.warn("Standard Verifier 'shalini_arun' not found!");
        if (!approver) console.warn("Standard Approver 'suraj_rajan' not found!");

        // Find HOD for the user
        // We look for a team where this user is a member
        let hodUser = null;
        try {
            const userTeam = await TeamModel.findOne({ "members.userId": req.user._id });
            if (userTeam) {
                hodUser = await UserModel.findById(userTeam.hodId);
                console.log(`Found HOD for user ${req.user.username}: ${hodUser?.username}`);
            }
        } catch (e) {
            console.error("Error finding HOD:", e);
        }

        // Determine checked_by: HOD priority > Manual input > Self if HOD > undefined
        let checkedById = undefined;
        if (hodUser) {
            checkedById = hodUser._id;
        } else if (signatories?.checked_by && signatories.checked_by !== '') {
            checkedById = signatories.checked_by;
        } else if (user.role === 'Head_of_Department') {
            checkedById = user._id;
        }

        const newSheet = new KPISheet({
            user: req.user._id,
            department: template.department || user.department || 'General', // Fallback to user department or General
            year,
            month,
            template_version: template._id,
            rows: sheetRows,
            status: "DRAFT",
            signatures: {
                prepared_by: `${user.first_name} ${user.last_name || ''}`
            },
            assigned_signatories: {
                checked_by: checkedById,
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
router.put("/api/kpi/sheet/entry", verifyToken, auditMiddleware("KPI_Sheet"), async (req, res) => {
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
        if (entryDate.getDay() === 0 && (!sheet.working_sundays || !sheet.working_sundays.includes(Number(day)))) {
            return res.status(400).json({ message: "Cannot edit Sunday values" });
        }

        // 2. Check if Holiday
        if (sheet.holidays.includes(Number(day))) {
            return res.status(400).json({ message: "Cannot edit Holiday values" });
        }

        // Deadline Check - Users can edit until the 4th of the following month (or previous working day if 4th is a holiday)
        const today = new Date();
        const getSubmissionDeadline = (year, month) => {
            // Deadline is the 4th of the following month
            // If sheet is for December 2025 (month=12), deadline is 4th January 2026
            let deadlineYear = year;
            let deadlineMonth = month; // month is 1-indexed in sheet
            if (deadlineMonth > 12) {
                deadlineMonth = 1;
                deadlineYear = year + 1;
            }
            // Start with the 4th of the next month (month is 0-indexed in Date constructor)
            let deadline = new Date(deadlineYear, deadlineMonth - 1, 4);
            // If the 4th is a Sunday, go back to the previous working day
            while (deadline.getDay() === 0) {
                deadline.setDate(deadline.getDate() - 1);
            }
            return deadline;
        };
        let deadline = getSubmissionDeadline(sheet.year, sheet.month + 1);

        // Check for admin deadline override extension
        const deadlineOverride = await KPISettings.findOne({ key: 'submission_deadline_override' });
        if (deadlineOverride && deadlineOverride.value) {
            const ov = deadlineOverride.value;
            if (ov.year === sheet.year && ov.month === sheet.month && ov.deadline_date) {
                deadline = new Date(ov.deadline_date);
            }
        }

        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());

        if (todayDate > deadlineDate && sheet.status !== 'REJECTED') {
            return res.status(403).json({ message: `KPI locked. Submission deadline (${deadlineDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}) has passed. Contact Admin for extension.` });
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
            // Skip Sundays (unless marked as working)
            if (dDate.getDay() === 0 && (!sheet.working_sundays || !sheet.working_sundays.includes(dNum))) continue;
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

// Toggle Holiday/Leave/Festival/HalfDay
router.post("/api/kpi/sheet/holiday", verifyToken, auditMiddleware("KPI_Sheet"), async (req, res) => {
    try {
        console.log("POST /api/kpi/sheet/holiday called", req.body);
        const { sheetId, day, type = 'leave' } = req.body; // type: 'leave', 'festival', 'half_day'
        const sheet = await KPISheet.findById(sheetId);
        if (!sheet) return res.status(404).json({ message: "Sheet not found" });

        if (sheet.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Unauthorized" });

        // Deadline Check - 4th of the following month (or previous working day if 4th is a holiday)
        const today = new Date();
        const getSubmissionDeadline = (year, month) => {
            // Deadline is the 4th of the following month
            let deadlineYear = year;
            let deadlineMonth = month; // month is 1-indexed in sheet
            if (deadlineMonth > 12) {
                deadlineMonth = 1;
                deadlineYear = year + 1;
            }
            let deadline = new Date(deadlineYear, deadlineMonth - 1, 4);
            // If the 4th is a Sunday, go back to the previous working day
            while (deadline.getDay() === 0) {
                deadline.setDate(deadline.getDate() - 1);
            }
            return deadline;
        };
        let deadline = getSubmissionDeadline(sheet.year, sheet.month + 1);

        // Check for admin deadline override extension
        const deadlineOverride = await KPISettings.findOne({ key: 'submission_deadline_override' });
        if (deadlineOverride && deadlineOverride.value) {
            const ov = deadlineOverride.value;
            if (ov.year === sheet.year && ov.month === sheet.month && ov.deadline_date) {
                deadline = new Date(ov.deadline_date);
            }
        }

        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());

        if (todayDate > deadlineDate && sheet.status !== 'REJECTED') {
            return res.status(403).json({ message: `KPI locked. Submission deadline (${deadlineDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}) has passed. Contact Admin for extension.` });
        }

        const dayNum = Number(day);
        let action = "";

        // Initialize arrays if missing
        if (!sheet.holidays) sheet.holidays = [];
        if (!sheet.festivals) sheet.festivals = [];
        if (!sheet.half_days) sheet.half_days = [];
        if (!sheet.working_sundays) sheet.working_sundays = [];

        // Helper to remove from array
        const remove = (arr, val) => {
            const idx = arr.indexOf(val);
            if (idx > -1) arr.splice(idx, 1);
        };

        if (type === 'working_sunday') {
            const idx = sheet.working_sundays.indexOf(dayNum);
            if (idx > -1) {
                sheet.working_sundays.splice(idx, 1);
                action = "REMOVED";
            } else {
                sheet.working_sundays.push(dayNum);
                remove(sheet.holidays, dayNum);
                remove(sheet.festivals, dayNum);
                remove(sheet.half_days, dayNum);
                action = "ADDED";
            }
            // Audit
            sheet.audit_log.push({
                field: `working_sunday:${day}`,
                old_value: action === "ADDED" ? false : true,
                new_value: action === "ADDED" ? true : false,
                changed_by: req.user._id,
                action: "UPDATE"
            });
        } else if (type === 'festival') {
            // Toggle Festival
            const idx = sheet.festivals.indexOf(dayNum);
            if (idx > -1) {
                sheet.festivals.splice(idx, 1);
                action = "REMOVED";
            } else {
                sheet.festivals.push(dayNum);
                // Mutual Exclusivity: Remove from others
                remove(sheet.holidays, dayNum);
                remove(sheet.half_days, dayNum);
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
        } else if (type === 'half_day') {
            // Toggle Half Day
            const idx = sheet.half_days.indexOf(dayNum);
            if (idx > -1) {
                sheet.half_days.splice(idx, 1);
                action = "REMOVED";
            } else {
                sheet.half_days.push(dayNum);
                // Mutual Exclusivity: Remove from others
                remove(sheet.holidays, dayNum);
                remove(sheet.festivals, dayNum);
                action = "ADDED";
            }
            // Audit
            sheet.audit_log.push({
                field: `half_day:${day}`,
                old_value: action === "ADDED" ? false : true,
                new_value: action === "ADDED" ? true : false,
                changed_by: req.user._id,
                action: "UPDATE"
            });
        } else {
            // Default: Leave (Holiday)
            const idx = sheet.holidays.indexOf(dayNum);
            if (idx > -1) {
                sheet.holidays.splice(idx, 1);
                action = "REMOVED";
            } else {
                sheet.holidays.push(dayNum);
                // Mutual Exclusivity: Remove from others
                remove(sheet.festivals, dayNum);
                remove(sheet.half_days, dayNum);
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

        // Recalculate ALL totals because holiday/festival/half-day status changed
        const currentYear = sheet.year;
        const currentMonth = sheet.month - 1;

        // Use centralized helper to recalculate everything
        const metrics = calculateKPIMetrics(sheet);
        // Only update row totals in this route, metrics will be updated on submit
        // However, calculateKPIMetrics ALREADY updated row.total in-memory

        await sheet.save();
        console.log("POST /api/kpi/sheet/holiday - Success, Type:", type);
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

        // Deadline Check - default is 4th of the following month
        const today = new Date();
        const getSubmissionDeadline = (year, month) => {
            let deadlineYear = year;
            let deadlineMonth = month;
            if (deadlineMonth > 12) {
                deadlineMonth = 1;
                deadlineYear = year + 1;
            }
            let deadline = new Date(deadlineYear, deadlineMonth - 1, 4);
            while (deadline.getDay() === 0) {
                deadline.setDate(deadline.getDate() - 1);
            }
            return deadline;
        };
        let deadline = getSubmissionDeadline(sheet.year, sheet.month + 1);

        // Check for admin deadline override
        const deadlineOverride = await KPISettings.findOne({ key: 'submission_deadline_override' });
        if (deadlineOverride && deadlineOverride.value) {
            const ov = deadlineOverride.value;
            // Only apply if the override matches this sheet's period
            if (ov.year === sheet.year && ov.month === sheet.month && ov.deadline_date) {
                deadline = new Date(ov.deadline_date);
            }
        }

        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());

        if (todayDate > deadlineDate && sheet.status !== 'REJECTED') {
            return res.status(403).json({ message: `KPI locked. Submission deadline (${deadlineDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}) has passed. Contact Admin for extension.` });
        }

        // Update Summary if provided
        if (summary) {
            sheet.summary = { ...sheet.summary, ...summary, submission_date: new Date() };
        }

        // Always recalculate metrics to ensure they are present and correct
        const metrics = calculateKPIMetrics(sheet);
        sheet.summary = Object.assign({}, sheet.summary?.toObject() || {}, metrics, {
            submission_date: sheet.summary?.submission_date || new Date()
        });
        sheet.markModified('summary');
        sheet.markModified('rows'); // Ensure row total changes are detected

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

// Update Summary (Partial save without submission)
router.put("/api/kpi/sheet/summary", verifyToken, auditMiddleware("KPI_Sheet"), async (req, res) => {
    try {
        const { sheetId, summary } = req.body;
        const sheet = await KPISheet.findById(sheetId);
        if (!sheet) return res.status(404).json({ message: "Sheet not found" });

        if (sheet.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Unauthorized" });

        if (sheet.status !== "DRAFT" && sheet.status !== "REJECTED") {
            return res.status(400).json({ message: "Sheet is locked due to status" });
        }

        // Update Summary if provided
        if (summary) {
            sheet.summary = { ...sheet.summary?.toObject(), ...summary };
            sheet.markModified('summary');
        }

        await sheet.save();
        res.json(sheet);
    } catch (err) {
        console.error("PUT /api/kpi/sheet/summary ERROR:", err);
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

// Get Team KPI History (HOD only)
router.get("/api/kpi/hod/team-sheets", verifyToken, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'Admin';
        const isHOD = req.user.role === 'Head_of_Department';

        if (!isAdmin && !isHOD) {
            return res.status(403).json({ message: "HOD or Admin access required" });
        }

        const { year, month, userId } = req.query;
        let query = {};

        if (isHOD && !isAdmin) {
            const teams = await TeamModel.find({ hodId: req.user._id, isActive: true });
            let memberIds = [];
            teams.forEach(t => {
                t.members.forEach(m => memberIds.push(m.userId.toString()));
                memberIds.push(t.hodId.toString());
            });
            memberIds = [...new Set(memberIds)];
            
            if (userId) {
                if (!memberIds.includes(userId)) {
                    return res.status(403).json({ message: "User not in your team" });
                }
                query.user = userId;
            } else {
                query.user = { $in: memberIds };
            }
        } else if (isAdmin && userId) {
            query.user = userId;
        }

        if (year) query.year = parseInt(year);
        if (month) query.month = parseInt(month);

        const sheets = await KPISheet.find(query)
            .populate('user', 'first_name last_name email department')
            .populate('template_version', 'name')
            .sort({ year: -1, month: -1, updatedAt: -1 });

        res.json(sheets);
    } catch (err) {
        console.error("GET /api/kpi/hod/team-sheets ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Approve/Reject KPI (HoD)
// Approve/Review KPI Flow
router.post("/api/kpi/sheet/review", verifyToken, async (req, res) => {
    try {
        console.log("POST /api/kpi/sheet/review called", req.body);
        const { sheetId, action, comments, rowWeights } = req.body; // action: CHECK, VERIFY, APPROVE, REJECT
        const sheet = await KPISheet.findById(sheetId);
        if (!sheet) return res.status(404).json({ message: "Sheet not found" });

        console.log(`Reviewing Sheet: ID=${sheetId}, Current Status=${sheet.status}, Requested Action=${action}, User=${req.user.username}(${req.user.role})`);

        // Prevent Self-Approval (Generic rule, though distinct roles usually prevent this naturally)
        // Exception: HODs can self-check their own sheets
        const isSelfReview = sheet.user.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'Admin';
        const isHodSelfCheck = req.user.role === 'Head_of_Department' && action === 'CHECK';

        if (isSelfReview && !isAdmin && !isHodSelfCheck) {
            console.log("Self-review blocked");
            return res.status(403).json({ message: "Cannot review your own KPI sheet" });
        }

        const oldStatus = sheet.status;
        const currentUserId = req.user._id.toString();
        const username = req.user.username;
        // isAdmin already declared above
        const isShalini = username === 'shalini_arun';
        const isSuraj = username === 'suraj_rajan';

        if (action === "REJECT") {
            sheet.status = "REJECTED";
            sheet.is_fully_locked = false; // Unlock
        }
        else if (action === "CHECK") {
            if (sheet.status !== "SUBMITTED") return res.status(400).json({ message: "Sheet is not in Submitted state" });

            // Validate User - Admin, Shalini, Suraj, or assigned checker can check
            // Also allow HOD to check any of their team members' sheets
            let isTeamHOD = false;
            if (req.user.role === 'Head_of_Department') {
                const team = await TeamModel.findOne({ hodId: req.user._id, 'members.userId': sheet.user });
                if (team) isTeamHOD = true;
            }

            const isAssignedChecker = sheet.assigned_signatories?.checked_by?.toString() === currentUserId;
            if (!isAdmin && !isShalini && !isSuraj && !isAssignedChecker && !isTeamHOD) {
                return res.status(403).json({ message: "You are not authorized to Check this sheet" });
            }

            // Update weights if provided by HOD
            if (rowWeights && typeof rowWeights === 'object') {
                sheet.rows.forEach(row => {
                    if (rowWeights[row.row_id] !== undefined) {
                        row.weight = Number(rowWeights[row.row_id]);
                    }
                });
            }

            // Calculate Performance Metrics using helper
            const metrics = calculateKPIMetrics(sheet);
            sheet.summary = Object.assign({}, sheet.summary?.toObject() || {}, metrics);
            sheet.markModified('summary');
            sheet.markModified('rows');

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

            // Ensure metrics are calculated
            const metrics = calculateKPIMetrics(sheet);
            sheet.summary = Object.assign({}, sheet.summary?.toObject() || {}, metrics);
            sheet.markModified('summary');
            sheet.markModified('rows');

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

            // Ensure metrics are calculated
            const metrics = calculateKPIMetrics(sheet);
            sheet.summary = Object.assign({}, sheet.summary?.toObject() || {}, metrics);
            sheet.markModified('summary');
            sheet.markModified('rows');

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
            is_custom: true,
            weight: 3
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
// DELETE Template (Admin or Owner)
router.delete("/api/kpi/template/:id", verifyToken, async (req, res) => {
    try {
        const template = await KPITemplate.findById(req.params.id);
        if (!template) {
            return res.status(404).json({ message: "Template not found" });
        }

        // Allow Admin, Owner, or HOD of the Owner
        const isOwner = template.owner.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'Admin';
        let isTeamHOD = false;

        if (!isOwner && !isAdmin && req.user.role === 'Head_of_Department') {
            const team = await TeamModel.findOne({ 
                hodId: req.user._id, 
                'members.userId': template.owner 
            });
            if (team) isTeamHOD = true;
        }

        if (!isAdmin && !isOwner && !isTeamHOD) {
            return res.status(403).json({ message: "Not authorized to delete this template" });
        }

        await KPITemplate.findByIdAndUpdate(req.params.id, { is_active: false });
        res.json({ message: "Template deleted" });
    } catch (err) {
        console.error("DELETE /api/kpi/template ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ==========================================
// ANALYTICS / CEO PULSE ROUTES
// ==========================================

// Get Pulse Analytics (Delta Variation & 2x2 Matrix)
router.get("/api/kpi/analytics/pulse", verifyToken, async (req, res) => {
    try {
        const { year, month, department, team: teamName } = req.query; // Current month

        if (!year || !month) return res.status(400).json({ message: "Year and Month are required" });

        const currentYear = parseInt(year);
        const currentMonth = parseInt(month);

        let previousMonth = currentMonth - 1;
        let previousYear = currentYear;
        if (previousMonth === 0) {
            previousMonth = 12;
            previousYear -= 1;
        }

        let queryCurrent = { year: currentYear, month: currentMonth, status: { $in: ["SUBMITTED", "CHECKED", "VERIFIED", "APPROVED"] } };
        let queryPrev = { year: previousYear, month: previousMonth, status: { $in: ["SUBMITTED", "CHECKED", "VERIFIED", "APPROVED"] } };

        let targetUserIds = null;

        // Determine users to filter by
        if (teamName) {
            const team = await TeamModel.findOne({ name: teamName, isActive: true });
            if (team) {
                targetUserIds = team.members.map(m => m.userId.toString());
                if (team.hodId) targetUserIds.push(team.hodId.toString());
                targetUserIds = [...new Set(targetUserIds)];
            }
        } else if (req.user.role === 'Head_of_Department') {
            // Default HOD to their team
            const hodTeam = await TeamModel.findOne({ hodId: req.user._id, isActive: true });
            if (hodTeam) {
                targetUserIds = hodTeam.members.map(m => m.userId.toString());
                targetUserIds.push(req.user._id.toString());
                targetUserIds = [...new Set(targetUserIds)];
            }
        }

        if (targetUserIds) {
            queryCurrent.user = { $in: targetUserIds };
            queryPrev.user = { $in: targetUserIds };
        } else if (department) {
            queryCurrent.department = department;
            queryPrev.department = department;
        }

        const currentSheets = await KPISheet.find(queryCurrent).populate('user', 'first_name last_name username role');
        const prevSheets = await KPISheet.find(queryPrev).populate('user', 'first_name last_name username role');

        // Fetch all teams to map users to teams
        const allTeams = await TeamModel.find({ isActive: true });

        const pulseData = [];

        currentSheets.forEach(currSheet => {
            if (!currSheet.user) return; // skip if user is missing somehow
            const userId = currSheet.user._id.toString();
            const prevSheet = prevSheets.find(s => s.user && s.user._id.toString() === userId);

            const currScore = currSheet.summary?.total_value_score || 0;
            const currAvg = currSheet.summary?.average_complexity || 0;
            const currQty = currSheet.summary?.total_quantity || 0;
            const currQuadrant = currSheet.summary?.performance_quadrant || "Drainer";

            const prevScore = prevSheet ? (prevSheet.summary?.total_value_score || 0) : 0;
            const prevAvg = prevSheet ? (prevSheet.summary?.average_complexity || 0) : 0;
            const prevQty = prevSheet ? (prevSheet.summary?.total_quantity || 0) : 0;

            // Calculate delta
            let qtyChange = 0;
            if (prevQty > 0) {
                qtyChange = ((currQty - prevQty) / prevQty) * 100;
            } else if (currQty > 0) {
                qtyChange = 100; // From 0 to something
            }

            let weightChange = currAvg - prevAvg;

            let deltaInsight = "Stable / Insufficient Data";
            if (currAvg >= 3.0 && qtyChange >= 20) {
                deltaInsight = "Promotion Delta (Rising Star)";
            } else if (qtyChange >= 30 && currAvg < 2.5 && prevAvg > currAvg) {
                deltaInsight = "Stagnation Delta (The Plateau)";
            } else if (qtyChange <= -25 && prevAvg >= 3.0) {
                deltaInsight = "Burnout / Disengagement Delta (The Warning)";
            } else if (currAvg >= 3.0) {
                deltaInsight = "Consistent High Performer";
            }

            // Find team for this user, prioritizing the filtered team if provided
            let userTeam = null;
            if (teamName) {
                userTeam = allTeams.find(t => 
                    t.name === teamName && 
                    (t.hodId?.toString() === userId || t.members.some(m => m.userId.toString() === userId))
                );
            }
            
            // If not found in filtered team or no filter, find first team
            if (!userTeam) {
                userTeam = allTeams.find(t => 
                    t.hodId?.toString() === userId || 
                    t.members.some(m => m.userId.toString() === userId)
                );
            }

            pulseData.push({
                user: {
                    _id: currSheet.user._id,
                    first_name: currSheet.user.first_name,
                    last_name: currSheet.user.last_name,
                    username: currSheet.user.username
                },
                department: currSheet.department,
                team: userTeam ? userTeam.name : 'No Team',
                current: {
                    sheetId: currSheet._id,
                    total_quantity: currQty,
                    total_value_score: currScore,
                    average_complexity: currAvg,
                    quadrant: currQuadrant
                },
                previous: {
                    total_quantity: prevQty,
                    total_value_score: prevScore,
                    average_complexity: prevAvg
                },
                delta: {
                    qty_change_percent: Math.round(qtyChange),
                    weight_change: Number(weightChange.toFixed(2)),
                    insight: deltaInsight
                }
            });
        });

        res.json(pulseData);
    } catch (err) {
        console.error("GET /api/kpi/analytics/pulse ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Get Monthly Blocker and Business Loss Report
router.get("/api/kpi/analytics/blockers-losses", verifyToken, async (req, res) => {
    try {
        const { year, month, department, team: teamName } = req.query;

        if (!year || !month) return res.status(400).json({ message: "Year and Month are required" });

        const currentYear = parseInt(year);
        const currentMonth = parseInt(month);

        let query = { 
            year: currentYear, 
            month: currentMonth, 
            status: { $in: ["SUBMITTED", "CHECKED", "VERIFIED", "APPROVED"] },
            $or: [
                { "summary.blockers": { $ne: "" } },
                { "summary.business_loss": { $gt: 0 } }
            ]
        };

        let targetUserIds = null;

        if (teamName) {
            const team = await TeamModel.findOne({ name: teamName, isActive: true });
            if (team) {
                targetUserIds = team.members.map(m => m.userId.toString());
                if (team.hodId) targetUserIds.push(team.hodId.toString());
                targetUserIds = [...new Set(targetUserIds)];
            }
        } else if (req.user.role === 'Head_of_Department') {
            const hodTeam = await TeamModel.findOne({ hodId: req.user._id, isActive: true });
            if (hodTeam) {
                targetUserIds = hodTeam.members.map(m => m.userId.toString());
                targetUserIds.push(req.user._id.toString());
                targetUserIds = [...new Set(targetUserIds)];
            }
        }

        if (targetUserIds) {
            query.user = { $in: targetUserIds };
        } else if (department) {
            query.department = department;
        }

        const sheets = await KPISheet.find(query)
            .populate('user', 'first_name last_name username role')
            .sort({ "summary.business_loss": -1 });

        const allTeams = await TeamModel.find({ isActive: true });

        const reportData = [];
        const blockerStats = {}; // Category -> count

        sheets.forEach(sheet => {
            const userId = sheet.user?._id.toString();
            let userTeam = allTeams.find(t => 
                t.hodId?.toString() === userId || 
                t.members.some(m => m.userId.toString() === userId)
            );

            // Process Blocker Categories
            if (sheet.summary?.blockers) {
                const individualBlockers = sheet.summary.blockers.split(' | ').filter(b => b);
                individualBlockers.forEach(b => {
                    let category = "Others";
                    if (b.includes(":")) {
                        category = b.split(":")[0].trim();
                    }
                    blockerStats[category] = (blockerStats[category] || 0) + 1;
                });
            }

            // Get first category for primary display in table
            let primaryBlockerCategory = "Others";
            if (sheet.summary?.blockers && sheet.summary.blockers.includes(":")) {
                primaryBlockerCategory = sheet.summary.blockers.split(":")[0].trim();
            }

            reportData.push({
                user: {
                    name: `${sheet.user?.first_name} ${sheet.user?.last_name}`,
                    username: sheet.user?.username
                },
                team: userTeam ? userTeam.name : (sheet.department || 'N/A'),
                blocker: sheet.summary?.blockers || "",
                blockerCategory: sheet.summary?.blockers ? primaryBlockerCategory : "",
                businessLoss: sheet.summary?.business_loss || 0,
                lossCategory: sheet.summary?.root_cause || (sheet.summary?.business_loss > 0 ? "Others" : ""),
                lossDescription: sheet.summary?.loss_description || sheet.summary?.root_cause_other || ""
            });
        });

        // Convert blocker stats to array and sort
        const aggregatedBlockers = Object.entries(blockerStats)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count);

        // Sort records by category for better grouping in the table
        reportData.sort((a, b) => a.blockerCategory.localeCompare(b.blockerCategory));

        res.json({
            records: reportData,
            stats: {
                totalValueAtLoss: reportData.reduce((sum, r) => sum + r.businessLoss, 0),
                highestBlocker: aggregatedBlockers[0] || null,
                blockerDistribution: aggregatedBlockers
            }
        });

    } catch (err) {
        console.error("GET /api/kpi/analytics/blockers-losses ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});
// ==========================================
// SETTINGS / DEADLINE CONFIGURATION (Admin Only)
// ==========================================

// Get current submission deadline settings
router.get("/api/kpi/settings/deadline", verifyToken, async (req, res) => {
    try {

        const setting = await KPISettings.findOne({ key: 'submission_deadline_override' });

        // Also return the default deadline info
        const today = new Date();
        const defaultDay = 4; // 4th of next month

        res.json({
            default_deadline_day: defaultDay,
            override: setting ? setting.value : null,
            updated_at: setting ? setting.updatedAt : null
        });
    } catch (err) {
        console.error("GET /api/kpi/settings/deadline ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Set/Update submission deadline override (Admin Only)
router.post("/api/kpi/settings/deadline", verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ message: "Admin access required" });
        }

        const { year, month, deadline_date, clear } = req.body;

        // If clear is true, remove the override
        if (clear) {
            await KPISettings.findOneAndDelete({ key: 'submission_deadline_override' });
            return res.json({ message: "Deadline override cleared. Default deadline restored." });
        }

        if (!year || !month || !deadline_date) {
            return res.status(400).json({ message: "Year, month, and deadline_date are required" });
        }

        // Validate the deadline date
        const parsedDate = new Date(deadline_date);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ message: "Invalid deadline date" });
        }

        const setting = await KPISettings.findOneAndUpdate(
            { key: 'submission_deadline_override' },
            {
                key: 'submission_deadline_override',
                value: {
                    year: parseInt(year),
                    month: parseInt(month),
                    deadline_date: parsedDate.toISOString()
                },
                updated_by: req.user._id
            },
            { upsert: true, new: true }
        );

        console.log(`Admin ${req.user.username} set deadline override: Year=${year}, Month=${month}, Deadline=${parsedDate.toLocaleDateString()}`);

        res.json({
            message: `Submission deadline for ${new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })} extended to ${parsedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
            override: setting.value
        });
    } catch (err) {
        console.error("POST /api/kpi/settings/deadline ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ==========================================
// ANNOUNCEMENT ROUTES
// ==========================================

// Get active announcements
router.get("/api/kpi/announcements", verifyToken, async (req, res) => {
    try {
        const announcement = await KPISettings.findOne({ key: 'active_announcement' });
        
        if (!announcement || !announcement.value) {
            return res.json({ hasAnnouncement: false });
        }

        const { message, expiry_date, type } = announcement.value;
        const now = new Date();
        const expiry = new Date(expiry_date);

        if (now > expiry) {
            // Automatically clear expired announcement from DB if we encounter it
            await KPISettings.findOneAndDelete({ key: 'active_announcement' });
            return res.json({ hasAnnouncement: false });
        }

        res.json({
            hasAnnouncement: true,
            message,
            expiry_date,
            type: type || 'info',
            updatedAt: announcement.updatedAt
        });
    } catch (err) {
        console.error("GET /api/kpi/announcements ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Create/Update announcement (Admin Only)
router.post("/api/kpi/announcements", verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'Admin') {
            return res.status(403).json({ message: "Admin access required" });
        }

        const { message, expiry_days, type, clear } = req.body;

        if (clear) {
            await KPISettings.findOneAndDelete({ key: 'active_announcement' });
            return res.json({ message: "Announcement cleared" });
        }

        if (!message || !expiry_days) {
            return res.status(400).json({ message: "Message and expiry_days are required" });
        }

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + parseInt(expiry_days));

        const announcement = await KPISettings.findOneAndUpdate(
            { key: 'active_announcement' },
            {
                key: 'active_announcement',
                value: {
                    message,
                    expiry_date: expiryDate.toISOString(),
                    type: type || 'info'
                },
                updated_by: req.user._id
            },
            { upsert: true, new: true }
        );

        res.json({
            message: "Announcement posted successfully",
            announcement: announcement.value
        });
    } catch (err) {
        console.error("POST /api/kpi/announcements ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ==========================================
// TRANSLATION ROUTES
// ==========================================

// Translate an array of texts to a target language (gu = Gujarati, hi = Hindi)
router.post("/api/kpi/translate", verifyToken, async (req, res) => {
    try {
        const { texts, targetLang } = req.body;
        // Validate
        if (!texts || !Array.isArray(texts) || texts.length === 0) {
            return res.status(400).json({ message: "texts array is required" });
        }
        if (!targetLang || !['gu', 'hi'].includes(targetLang)) {
            return res.status(400).json({ message: "targetLang must be 'gu' (Gujarati) or 'hi' (Hindi)" });
        }

        // Filter out empty strings, translate non-empty ones
        const results = [];
        for (let i = 0; i < texts.length; i++) {
            const text = (texts[i] || '').trim();
            if (!text) {
                results.push('');
                continue;
            }
            try {
                const result = await translate(text, { to: targetLang });
                results.push(result.text);
            } catch (tErr) {
                console.error(`Translation error for "${text}":`, tErr.message);
                results.push(text); // fallback to original
            }
        }

        res.json({ translations: results, targetLang });
    } catch (err) {
        console.error("POST /api/kpi/translate ERROR:", err);
        res.status(500).json({ message: "Translation failed. Please try again." });
    }
});

// Bulk translate all rows of a template and save translations
router.post("/api/kpi/template/translate", verifyToken, async (req, res) => {
    try {
        const { templateId, targetLang } = req.body;
        if (!templateId) return res.status(400).json({ message: "templateId is required" });
        if (!targetLang || !['gu', 'hi'].includes(targetLang)) {
            return res.status(400).json({ message: "targetLang must be 'gu' or 'hi'" });
        }

        const template = await KPITemplate.findById(templateId);
        if (!template) return res.status(404).json({ message: "Template not found" });

        const fieldKey = targetLang === 'gu' ? 'label_gu' : 'label_hi';

        for (let i = 0; i < template.rows.length; i++) {
            const label = (template.rows[i].label || '').trim();
            if (!label) continue;
            try {
                const result = await translate(label, { to: targetLang });
                template.rows[i][fieldKey] = result.text;
            } catch (tErr) {
                console.error(`Translation error for row "${label}":`, tErr.message);
                template.rows[i][fieldKey] = label; // fallback
            }
        }

        await template.save();
        res.json({ message: `Template translated to ${targetLang === 'gu' ? 'Gujarati' : 'Hindi'} successfully`, template });
    } catch (err) {
        console.error("POST /api/kpi/template/translate ERROR:", err);
        res.status(500).json({ message: "Translation failed. Please try again." });
    }
});

export default router;
