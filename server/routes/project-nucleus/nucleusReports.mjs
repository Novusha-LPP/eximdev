import express from "express";
import JobModel from "../../model/jobModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import { applyUserBranchFilter } from "../../middleware/branchMiddleware.mjs";
import UserModel from "../../model/userModel.mjs";
import { getBranchMatch } from "../../utils/branchFilter.mjs";
import CustomerKycModel from "../../model/CustomerKyc/customerKycModel.mjs";
import EximClientUserModel from "../../model/eximClientUserModel.mjs";
import OpenPointModel from "../../model/openPoints/openPointModel.mjs";

const router = express.Router();

router.get("/reports", async (req, res) => {
    try {
        const { branchId, category } = req.query;
        const branchMatch = getBranchMatch(branchId, category);

        // 1. Fetch potential jobs (optimized for performance)
        // We fetch ALL jobs to allow frontend to calculate "Total vs Fined" stats
        const jobs = await JobModel.find(branchMatch)
            .select("job_number job_no be_no be_date fine_amount penalty_amount importer penalty_by_us penalty_by_importer consignment_type container_nos.size")
            .lean();

        // 2. Fetch all users for handler mapping
        // Map Importer Name -> List of User Names
        const users = await UserModel.find({}).select(
            "first_name last_name username assigned_importer_name role"
        ).lean();

        const importerHandlers = {};

        users.forEach((user) => {
            // Filter: Only include users with role 'User' (case-insensitive check to be safe)
            if (!user.role || (user.role !== 'User' && user.role !== 'user')) {
                return;
            }

            const displayName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username;

            if (user.assigned_importer_name && Array.isArray(user.assigned_importer_name)) {
                user.assigned_importer_name.forEach((impName) => {
                    // impName is the importer name string
                    if (impName) {
                        if (!importerHandlers[impName]) {
                            importerHandlers[impName] = [];
                        }
                        importerHandlers[impName].push(displayName);
                    }
                });
            }
        });

        // 3. Process and Filter Jobs
        // We return ALL jobs to client so it can calculate totals vs fines
        const reportData = jobs.map((job) => {
            const fineVal = parseAmount(job.fine_amount);
            const penaltyVal = parseAmount(job.penalty_amount);

            // Calculate Container Counts
            const isLCL = job.consignment_type === 'LCL';
            let fcl20 = 0;
            let fcl40 = 0;

            if (Array.isArray(job.container_nos)) {
                job.container_nos.forEach(c => {
                    if (c && c.size) {
                        if (c.size === '20') fcl20++;
                        else if (c.size === '40') fcl40++;
                    }
                });
            }

            return {
                _id: job._id,
                job_no: job.job_no,
                be_no: job.be_no,
                be_date: job.be_date,
                fine_amount: job.fine_amount || "0",
                penalty_amount: job.penalty_amount || "0",
                fine_val: fineVal,
                penalty_val: penaltyVal,
                importer: job.importer,
                handlers: importerHandlers[job.importer] || [],
                penalty_by_us: job.penalty_by_us || false,
                penalty_by_importer: job.penalty_by_importer || false,
                fcl20,
                fcl40,
                isLCL
            };
        });

        res.json(reportData);
    } catch (error) {
        console.error("Error fetching project nucleus reports:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post("/update-penalty-status", authMiddleware, auditMiddleware("Job"), async (req, res) => {
    try {
        const { jobId, updates } = req.body;

        if (!jobId || !updates) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const updatedJob = await JobModel.findByIdAndUpdate(
            jobId,
            { $set: updates },
            { new: true }
        ).select("job_number job_no penalty_by_us penalty_by_importer");

        if (!updatedJob) {
            return res.status(404).json({ error: "Job not found" });
        }

        res.json({ success: true, data: updatedJob });
    } catch (error) {
        console.error("Error updating penalty status:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

function parseAmount(amountStr) {
    if (!amountStr) return 0;
    if (typeof amountStr === 'number') return amountStr;

    // Remove non-numeric chars except dot
    // e.g. "₹5,000" -> "5000", "5000.00" -> "5000.00"
    const cleaned = amountStr.toString().replace(/[^0-9.]/g, "");
    return parseFloat(cleaned) || 0;
}


// Top 10 Importers Report
router.get("/top-importers", async (req, res) => {
    try {
        const { filterType, month, year, quarter, startDate, endDate, branchId, category } = req.query;
        const branchMatch = getBranchMatch(branchId, category);

        // Base Match Condition: Must have out_of_charge date and NOT be Ex-Bond
        const matchStage = {
            out_of_charge: { $ne: null, $ne: "" },
            importer: { $ne: null, $ne: "" },
            be_filing_type: { $ne: "Ex-Bond" },
            type_of_b_e: { $ne: "Ex-Bond" },
            ...branchMatch
        };

        const pipeline = [
            { $match: matchStage },
            // Robust Date Parsing
            {
                $addFields: {
                    oocDate: {
                        $cond: {
                            if: {
                                $and: [
                                    { $ne: ["$out_of_charge", null] },
                                    { $ne: ["$out_of_charge", ""] },
                                    { $regexMatch: { input: "$out_of_charge", regex: /^\d{4}-\d{2}-\d{2}/ } },
                                ],
                            },
                            then: { $toDate: "$out_of_charge" },
                            else: null,
                        },
                    },
                }
            },
            { $match: { oocDate: { $ne: null } } }
        ];

        let dateMatch = {};

        if (filterType === 'month' && month !== undefined && year) {
            const m = parseInt(month) + 1;
            const y = parseInt(year);
            dateMatch = {
                $expr: {
                    $and: [
                        { $eq: [{ $month: "$oocDate" }, m] },
                        { $eq: [{ $year: "$oocDate" }, y] }
                    ]
                }
            };
        } else if (filterType === 'quarter' && quarter && year) {
            const q = parseInt(quarter);
            const y = parseInt(year);
            const startMonth = (q - 1) * 3 + 1;
            const endMonth = startMonth + 2;
            dateMatch = {
                $expr: {
                    $and: [
                        { $gte: [{ $month: "$oocDate" }, startMonth] },
                        { $lte: [{ $month: "$oocDate" }, endMonth] },
                        { $eq: [{ $year: "$oocDate" }, y] }
                    ]
                }
            };
        } else if (filterType === 'year' && year) {
            const y = parseInt(year);
            dateMatch = {
                $expr: { $eq: [{ $year: "$oocDate" }, y] }
            };
        } else if (filterType === 'date-range' && startDate && endDate) {
            dateMatch = {
                oocDate: {
                    $gte: new Date(startDate),
                    $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
                }
            };
        }

        if (Object.keys(dateMatch).length > 0) {
            pipeline.push({ $match: dateMatch });
        }

        // Grouping & Aggregation
        pipeline.push(
            {
                $addFields: {
                    isLCL: { $eq: ["$consignment_type", "LCL"] },
                    // Calculate container counts for this job
                    fcl20: {
                        $size: {
                            $filter: {
                                input: { $ifNull: ["$container_nos", []] },
                                as: "c",
                                cond: { $eq: ["$$c.size", "20"] }
                            }
                        }
                    },
                    fcl40: {
                        $size: {
                            $filter: {
                                input: { $ifNull: ["$container_nos", []] },
                                as: "c",
                                cond: { $eq: ["$$c.size", "40"] }
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    // Calculate TEUs for this job
                    jobFclTeus: {
                        $add: [
                            "$fcl20",
                            { $multiply: ["$fcl40", 2] }
                        ]
                    },
                    jobLclTeus: {
                        $cond: [
                            { $eq: ["$isLCL", true] },
                            1, // 1 TEU for LCL job
                            0
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: "$importer",
                    fclTeus: {
                        $sum: { $cond: [{ $eq: ["$isLCL", false] }, "$jobFclTeus", 0] }
                    },
                    lclTeus: { $sum: "$jobLclTeus" },
                    total20: {
                        $sum: { $cond: [{ $eq: ["$isLCL", false] }, "$fcl20", 0] }
                    },
                    total40: {
                        $sum: { $cond: [{ $eq: ["$isLCL", false] }, "$fcl40", 0] }
                    },
                    jobCount: { $sum: 1 }
                }
            },
            {
                $addFields: {
                    totalTeus: { $add: ["$fclTeus", "$lclTeus"] }
                }
            },
            { $sort: { totalTeus: -1 } },
            { $limit: 10 }
        );

        const topImporters = await JobModel.aggregate(pipeline);

        const relevantImporterNames = topImporters.map(i => i._id);
        const users = await UserModel.find({
            assigned_importer_name: { $in: relevantImporterNames }
        }).select("first_name last_name username assigned_importer_name role");

        const result = topImporters.map(imp => {
            const handlers = users.filter(u =>
                u.assigned_importer_name &&
                u.assigned_importer_name.includes(imp._id) &&
                (u.role && u.role.toLowerCase() === 'user')
            ).map(u => `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username);

            return {
                importer: imp._id,
                handlers: handlers,
                totalTeus: imp.totalTeus,
                fclTeus: imp.fclTeus,
                lclTeus: imp.lclTeus,
                total20: imp.total20,
                total40: imp.total40
            };
        });

        res.json(result);

    } catch (error) {
        console.error("Error fetching top importers:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Customer UDYAM Registration Details
router.get("/customer-udyam", async (req, res) => {
    try {
        const customers = await CustomerKycModel.find({ draft: { $ne: "true" } })
            .select("name_of_individual category approval iec_no udyam_no trainings")
            .sort({ name_of_individual: 1 })
            .lean();

        const result = customers.map(c => {
            let udyam = c.udyam_no;
            if (!udyam || udyam.trim() === "") {
                const completedTraining = (c.trainings || []).find(t => t.training_status === "Completed");
                if (completedTraining) {
                    udyam = completedTraining.training_code;
                }
            }
            return {
                _id: c._id,
                name_of_individual: c.name_of_individual,
                category: c.category,
                approval: c.approval,
                iec_no: c.iec_no,
                udyam_no: udyam
            };
        });

        res.json(result);
    } catch (error) {
        console.error("Error fetching customer UDYAM details for Project Nucleus:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Client User Login Analytics Report
router.get("/client-login-analytics", async (req, res) => {
    try {
        // 1. Fetch all client users with their login details
        const clientUsers = await EximClientUserModel.find({})
            .select("name email role status isActive lastLogin createdAt")
            .sort({ lastLogin: -1 })
            .lean();

        // 2. Aggregate Daily logins in backend using Mongo aggregate
        const dailyStats = await EximClientUserModel.aggregate([
            { $match: { lastLogin: { $ne: null } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$lastLogin" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 3. Aggregate Monthly logins in backend
        const monthlyStats = await EximClientUserModel.aggregate([
            { $match: { lastLogin: { $ne: null } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$lastLogin" } },
                    count: { $sum: 1 },
                    names: { $addToSet: "$name" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            users: clientUsers,
            daily: dailyStats.map(d => ({ date: d._id, count: d.count })),
            monthly: monthlyStats.map(m => ({ month: m._id, count: m.count, names: m.names }))
        });
    } catch (error) {
        console.error("Error fetching client login analytics for Project Nucleus:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// New Customers Report
router.get("/new-customers-report", async (req, res) => {
    try {
        const customers = await CustomerKycModel.find({
            approval: { $in: ["Approved", "Approved by HOD"] },
            draft: { $ne: "true" }
        })
        .select("name_of_individual category approval iec_no udyam_no approved_by approvedAt updatedAt createdAt principle_business_address_city principle_business_address_state")
        .sort({ updatedAt: -1 })
        .lean();

        const result = customers.map(c => {
            // Determine the approval date: fallback to updatedAt, then createdAt
            const approvalDate = c.approvedAt || c.updatedAt || c.createdAt;
            return {
                _id: c._id,
                name_of_individual: c.name_of_individual,
                category: c.category,
                approval: c.approval,
                iec_no: c.iec_no,
                udyam_no: c.udyam_no,
                approved_by: c.approved_by,
                approvalDate: approvalDate,
                city: c.principle_business_address_city,
                state: c.principle_business_address_state
            };
        });

        res.json(result);
    } catch (error) {
        console.error("Error fetching new customers report for Project Nucleus:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Karma Leaderboard Report
router.get("/karma-leaderboard", async (req, res) => {
    try {
        const { filterType, month, year, quarter, startDate, endDate } = req.query;

        // Fetch all points where status is Green (Completed) and responsible_person is set
        const matchStage = {
            status: "Green",
            responsible_person: { $ne: null }
        };

        // We fetch all completed points to calculate both total accumulated Karma points and periodic ones
        const completedPoints = await OpenPointModel.find(matchStage)
            .populate('responsible_person', 'username first_name last_name employee_photo department role')
            .lean();

        // Fetch all active users to ensure they are on the leaderboard
        const users = await UserModel.find({ isActive: { $ne: false } })
            .select("username first_name last_name employee_photo department role")
            .lean();

        // Priority to Points Mapping
        const getKarmaPoints = (priority) => {
            if (!priority) return 5; // Default fallback to Low
            const prio = priority.toLowerCase();
            if (prio === 'emergency' || prio === 'p1' || prio === 'critical') return 20;
            if (prio === 'high' || prio === 'p2') return 15;
            if (prio === 'medium' || prio === 'p3') return 10;
            if (prio === 'low' || prio === 'p4') return 5;
            return 5; // Default fallback
        };

        // Determine target monthly month & year
        const currentMonthNum = month !== undefined ? parseInt(month) : new Date().getMonth(); // 0-11
        const currentYearNum = year ? parseInt(year) : new Date().getFullYear();

        // Process monthly/accumulated points per user
        const userKarmaMap = {};

        // Pre-populate with all active users to ensure everyone is ranked, even with 0 points
        users.forEach(u => {
            const displayName = `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username;
            userKarmaMap[u._id.toString()] = {
                userId: u._id,
                username: u.username,
                displayName: displayName,
                employee_photo: u.employee_photo || "",
                department: u.department || "General",
                role: u.role || "",
                totalKarma: 0,
                monthlyKarma: 0,
                totalCompleted: 0,
                monthlyCompleted: 0,
                breakdown: { critical: 0, high: 0, medium: 0, low: 0 }
            };
        });

        // Calculate points
        completedPoints.forEach(pt => {
            const responsiblePerson = pt.responsible_person;
            if (!responsiblePerson) return;

            const rIdStr = responsiblePerson._id.toString();
            // If user is not active but has completed tasks, they might not be in our pre-populated map
            if (!userKarmaMap[rIdStr]) {
                const displayName = `${responsiblePerson.first_name || ""} ${responsiblePerson.last_name || ""}`.trim() || responsiblePerson.username;
                userKarmaMap[rIdStr] = {
                    userId: responsiblePerson._id,
                    username: responsiblePerson.username,
                    displayName: displayName,
                    employee_photo: responsiblePerson.employee_photo || "",
                    department: responsiblePerson.department || "General",
                    role: responsiblePerson.role || "",
                    totalKarma: 0,
                    monthlyKarma: 0,
                    totalCompleted: 0,
                    monthlyCompleted: 0,
                    breakdown: { critical: 0, high: 0, medium: 0, low: 0 }
                };
            }

            const points = getKarmaPoints(pt.priority);

            // Increment totals
            userKarmaMap[rIdStr].totalKarma += points;
            userKarmaMap[rIdStr].totalCompleted += 1;

            // Increment breakdown
            const prio = pt.priority ? pt.priority.toLowerCase() : 'low';
            if (prio === 'emergency' || prio === 'p1' || prio === 'critical') {
                userKarmaMap[rIdStr].breakdown.critical += 1;
            } else if (prio === 'high' || prio === 'p2') {
                userKarmaMap[rIdStr].breakdown.high += 1;
            } else if (prio === 'medium' || prio === 'p3') {
                userKarmaMap[rIdStr].breakdown.medium += 1;
            } else {
                userKarmaMap[rIdStr].breakdown.low += 1;
            }

            // Check if periodic/monthly condition is met
            const compDate = pt.completion_date ? new Date(pt.completion_date) : null;
            let matchesFilter = false;

            if (filterType === 'all') {
                matchesFilter = true;
            } else if (compDate) {
                if (filterType === 'date-range' && startDate && endDate) {
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    matchesFilter = (compDate >= start && compDate <= end);
                } else if (filterType === 'quarter' && quarter && year) {
                    const q = parseInt(quarter);
                    const y = parseInt(year);
                    const compMonth = compDate.getMonth(); // 0-11
                    const compYear = compDate.getFullYear();
                    const startMonth = (q - 1) * 3; // 0, 3, 6, 9
                    const endMonth = startMonth + 2; // 2, 5, 8, 11
                    matchesFilter = (compYear === y && compMonth >= startMonth && compMonth <= endMonth);
                } else if (filterType === 'year' && year) {
                    const y = parseInt(year);
                    matchesFilter = (compDate.getFullYear() === y);
                } else {
                    // Default to 'month' filter
                    const compMonth = compDate.getMonth();
                    const compYear = compDate.getFullYear();
                    matchesFilter = (compMonth === currentMonthNum && compYear === currentYearNum);
                }
            }

            if (matchesFilter) {
                userKarmaMap[rIdStr].monthlyKarma += points;
                userKarmaMap[rIdStr].monthlyCompleted += 1;
            }
        });

        // Convert map to array, sort by totalKarma descending
        const leaderboard = Object.values(userKarmaMap);
        leaderboard.sort((a, b) => b.totalKarma - a.totalKarma);

        res.json(leaderboard);
    } catch (error) {
        console.error("Error fetching karma leaderboard:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ─── Import Pending Job Summaries (Combination Filters) ───────────────────────
router.get("/pending-job-summaries", authMiddleware, applyUserBranchFilter, async (req, res) => {
    try {
        const { filterType, month, year, quarter, startDate, endDate, day, branchId, category } = req.query;
        const branchMatch = getBranchMatch(branchId, category, req.authorizedBranchIds);

        // Base: all non-cancelled jobs
        const baseMatchStage = {
            be_no: { $not: { $regex: "^cancelled$", $options: "i" } },
            ...branchMatch,
        };

        const pipeline = [
            { $match: baseMatchStage },
            // Parse job_date for date filtering
            {
                $addFields: {
                    parsedJobDate: {
                        $cond: {
                            if: {
                                $and: [
                                    { $ne: ["$job_date", null] },
                                    { $ne: ["$job_date", ""] },
                                    { $regexMatch: { input: "$job_date", regex: /^\d{4}-\d{2}-\d{2}/ } },
                                ],
                            },
                            then: { $toDate: "$job_date" },
                            else: null,
                        },
                    },
                },
            },
        ];

        // Apply date filters
        let dateMatch = {};

        if (filterType === "day" && day) {
            // Day-wise: exact match on the date string prefix
            dateMatch = {
                job_date: { $regex: `^${day}` },
            };
        } else if (filterType === "week" && day) {
            // Week-wise: compute start/end of ISO week from the given day
            const refDate = new Date(day);
            const dayOfWeek = refDate.getDay(); // 0=Sun..6=Sat
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const weekStart = new Date(refDate);
            weekStart.setDate(refDate.getDate() + mondayOffset);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            dateMatch = {
                parsedJobDate: { $gte: weekStart, $lte: weekEnd },
            };
        } else if (filterType === "month" && month !== undefined && year) {
            const m = parseInt(month) + 1;
            const y = parseInt(year);
            dateMatch = {
                $expr: {
                    $and: [
                        { $eq: [{ $month: "$parsedJobDate" }, m] },
                        { $eq: [{ $year: "$parsedJobDate" }, y] },
                    ],
                },
            };
        } else if (filterType === "quarter" && quarter && year) {
            const q = parseInt(quarter);
            const y = parseInt(year);
            const sm = (q - 1) * 3 + 1;
            const em = sm + 2;
            dateMatch = {
                $expr: {
                    $and: [
                        { $gte: [{ $month: "$parsedJobDate" }, sm] },
                        { $lte: [{ $month: "$parsedJobDate" }, em] },
                        { $eq: [{ $year: "$parsedJobDate" }, y] },
                    ],
                },
            };
        } else if (filterType === "year" && year) {
            const y = parseInt(year);
            dateMatch = {
                $expr: { $eq: [{ $year: "$parsedJobDate" }, y] },
            };
        } else if (filterType === "date-range" && startDate && endDate) {
            dateMatch = {
                parsedJobDate: {
                    $gte: new Date(startDate),
                    $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
                },
            };
        }

        if (Object.keys(dateMatch).length > 0) {
            pipeline.push({ $match: dateMatch });
        }

        // Use $facet to calculate total jobs created vs pending jobs breakdown
        pipeline.push({
            $facet: {
                totalJobsCreated: [
                    { $count: "count" }
                ],
                pendingJobsData: [
                    { $match: { status: { $regex: "^pending$", $options: "i" } } },
                    {
                        $group: {
                            _id: {
                                branch: { $ifNull: ["$branch_code", "Unassigned"] },
                                port: { $ifNull: ["$port_of_reporting", "Unassigned"] },
                                employee: { $ifNull: ["$job_owner", "Unassigned"] },
                            },
                            count: { $sum: 1 },
                        }
                    },
                    { $sort: { "_id.branch": 1, "_id.port": 1, count: -1 } },
                    {
                        $project: {
                            _id: 0,
                            branch: "$_id.branch",
                            port: "$_id.port",
                            employee: "$_id.employee",
                            count: 1,
                        }
                    }
                ],
                categoryData: [
                    { $match: { status: { $regex: "^pending$", $options: "i" } } },
                    {
                        $group: {
                            _id: { $ifNull: ["$detailed_status", "Uncategorized"] },
                            count: { $sum: 1 },
                        }
                    },
                    { $sort: { count: -1 } },
                    {
                        $project: {
                            _id: 0,
                            category: "$_id",
                            count: 1,
                        }
                    }
                ]
            }
        });

        const result = await JobModel.aggregate(pipeline);
        
        const totalCreated = result[0]?.totalJobsCreated[0]?.count || 0;
        const pendingData = result[0]?.pendingJobsData || [];
        const categoryData = result[0]?.categoryData || [];

        // Fetch independent SEA and AIR counts matching the exact Import Billing logic
        const baseBillingQuery = {
            ...branchMatch,
            $and: [
                { status: { $regex: "^pending$", $options: "i" } },
                { bill_document_sent_to_accounts: { $exists: true, $nin: [null, ""] } },
                {
                    $or: [
                        { billing_completed_date: { $exists: false } },
                        { billing_completed_date: "" },
                        { billing_completed_date: null },
                        {
                            $and: [
                                { billing_completed_date: { $exists: true, $ne: "" } },
                                { dsr_queries: { $elemMatch: { select_module: "Accounts", resolved: { $ne: true } } } }
                            ]
                        }
                    ]
                }
            ]
        };

        const readyForBillingSeaCount = await JobModel.countDocuments({
            ...baseBillingQuery,
            mode: { $in: ["SEA", "sea", "Sea"] }
        });

        const readyForBillingAirCount = await JobModel.countDocuments({
            ...baseBillingQuery,
            mode: { $in: ["AIR", "air", "Air"] }
        });

        res.json({ totalCreated, data: pendingData, categoryData, readyForBillingSeaCount, readyForBillingAirCount });
    } catch (error) {
        console.error("Error fetching pending job summaries:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
