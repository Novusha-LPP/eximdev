import express from "express";
import mongoose from "mongoose";
import JobModel from "../../model/jobModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import { applyUserBranchFilter } from "../../middleware/branchMiddleware.mjs";
import { icdFilter, applyUserImporterFilter } from "../../middleware/icdFilter.mjs";
import UserModel from "../../model/userModel.mjs";
import { getBranchMatch, getExportBranchMatch } from "../../utils/branchFilter.mjs";
import CustomerKycModel from "../../model/CustomerKyc/customerKycModel.mjs";
import EximClientUserModel from "../../model/eximClientUserModel.mjs";
import OpenPointModel from "../../model/openPoints/openPointModel.mjs";

const router = express.Router();

router.get("/reports", authMiddleware, async (req, res) => {
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
router.get("/top-importers", authMiddleware, async (req, res) => {
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
router.get("/customer-udyam", authMiddleware, async (req, res) => {
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
router.get("/client-login-analytics", authMiddleware, async (req, res) => {
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
router.get("/new-customers-report", authMiddleware, async (req, res) => {
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
router.get("/karma-leaderboard", authMiddleware, async (req, res) => {
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
router.get("/pending-job-summaries", authMiddleware, icdFilter, async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        const { filterType, month, year, quarter, startDate, endDate, day, branchId, category } = req.query;
        
        // Build branch/category match manually to match Import Billing behavior
        // (Import Billing doesn't restrict by user's assigned branches)
        const branchMatch = {};
        const isAll = !branchId || branchId.toString().toLowerCase() === "all" || branchId === "";
        if (!isAll) {
            const mongoose = (await import('mongoose')).default;
            if (mongoose.Types.ObjectId.isValid(branchId)) {
                branchMatch.branch_id = new mongoose.Types.ObjectId(branchId);
            } else {
                branchMatch.branch_id = branchId;
            }
        }
        if (category && category.toString().toLowerCase() !== "all") {
            const catStr = category.toString().trim().toLowerCase();
            if (catStr === 'sea' || catStr === 'ocean') {
                branchMatch.mode = { $in: ["SEA", "sea", "Sea", "OCEAN", "ocean", "Ocean", "BY SEA", "by sea", "By Sea"] };
            } else if (catStr === 'air') {
                branchMatch.mode = { $in: ["AIR", "air", "Air", "BY AIR", "by air", "By Air"] };
            } else {
                branchMatch.mode = new RegExp(`^${category.toString().trim()}$`, 'i');
            }
        }

        const baseMatchStage = {
            be_no: { $not: { $regex: "^cancelled$", $options: "i" } },
            ...branchMatch,
        };

        if (req.icdFilterCondition) {
            Object.assign(baseMatchStage, req.icdFilterCondition);
        }

        if (year && (!filterType || filterType === "all" || filterType === "fin-year" || filterType === "null" || filterType === "undefined")) {
            baseMatchStage.year = year;
        }

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

        const pendingMatchStage = {
            $match: {
                status: { $regex: "^pending$", $options: "i" },
                bill_document_sent_to_accounts: { $exists: true, $nin: [null, ""] },
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
        };

        // Use $facet to calculate total jobs created vs pending jobs breakdown
        pipeline.push({
            $facet: {
                totalJobsCreated: [
                    { $count: "count" }
                ],
                pendingJobsData: [
                    pendingMatchStage,
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
                    pendingMatchStage,
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
                ],
                seaCountData: [
                    pendingMatchStage,
                    { $match: { mode: { $in: ["SEA", "sea", "Sea"] } } },
                    { $count: "count" }
                ],
                airCountData: [
                    pendingMatchStage,
                    { $match: { mode: { $in: ["AIR", "air", "Air"] } } },
                    { $count: "count" }
                ]
            }
        });

        const result = await JobModel.aggregate(pipeline);
        
        const totalCreated = result[0]?.totalJobsCreated[0]?.count || 0;
        const pendingData = result[0]?.pendingJobsData || [];
        const categoryData = result[0]?.categoryData || [];
        const readyForBillingSeaCount = result[0]?.seaCountData[0]?.count || 0;
        const readyForBillingAirCount = result[0]?.airCountData[0]?.count || 0;

        // DEBUG: temporary logging
        console.log('[DEBUG /pending-job-summaries] RESULT: totalCreated:', totalCreated, 'pendingData.length:', pendingData.length, 'sea:', readyForBillingSeaCount, 'air:', readyForBillingAirCount);

        res.json({ totalCreated, data: pendingData, categoryData, readyForBillingSeaCount, readyForBillingAirCount });
    } catch (error) {
        console.error("Error fetching pending job summaries:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Out of Charge Summary Report
router.get("/out-of-charge-summaries", authMiddleware, applyUserBranchFilter, async (req, res) => {
    try {
        const {
            filterType,
            month,
            year,
            quarter,
            startDate,
            endDate,
            day,
            branchId,
            category,
            selectedFinancialYear,
            fyStartYear
        } = req.query;

        const branchMatch = getBranchMatch(branchId, category, req.authorizedBranchIds);

        // Date calculation helper
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        let start, end, prevStart, prevEnd;

        if (filterType === 'day') {
            const dStr = day || today.toISOString().slice(0, 10);
            start = new Date(`${dStr}T00:00:00.000Z`);
            end = new Date(`${dStr}T23:59:59.999Z`);

            const pd = new Date(start);
            pd.setDate(pd.getDate() - 1);
            const pdStr = pd.toISOString().slice(0, 10);
            prevStart = new Date(`${pdStr}T00:00:00.000Z`);
            prevEnd = new Date(`${pdStr}T23:59:59.999Z`);
        } else if (filterType === 'week') {
            const refDate = day ? new Date(day) : today;
            const dayOfWeek = refDate.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const ws = new Date(refDate);
            ws.setDate(refDate.getDate() + mondayOffset);
            ws.setHours(0, 0, 0, 0);
            const we = new Date(ws);
            we.setDate(ws.getDate() + 6);
            we.setHours(23, 59, 59, 999);

            start = ws;
            end = we;

            const pws = new Date(ws);
            pws.setDate(pws.getDate() - 7);
            const pwe = new Date(we);
            pwe.setDate(pwe.getDate() - 7);
            prevStart = pws;
            prevEnd = pwe;
        } else if (filterType === 'month') {
            const m = month !== undefined ? parseInt(month) : currentMonth;
            const y = year ? parseInt(year) : currentYear;
            start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
            const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
            end = new Date(Date.UTC(y, m, lastDay, 23, 59, 59, 999));

            const pm = m === 0 ? 11 : m - 1;
            const py = m === 0 ? y - 1 : y;
            prevStart = new Date(Date.UTC(py, pm, 1, 0, 0, 0, 0));
            const prevLastDay = new Date(Date.UTC(py, pm + 1, 0)).getUTCDate();
            prevEnd = new Date(Date.UTC(py, pm, prevLastDay, 23, 59, 59, 999));
        } else if (filterType === 'quarter') {
            const q = quarter ? parseInt(quarter) : Math.ceil((currentMonth + 1) / 3);
            const y = year ? parseInt(year) : currentYear;
            const sm = (q - 1) * 3;
            const em = sm + 2;
            start = new Date(Date.UTC(y, sm, 1, 0, 0, 0, 0));
            const lastDay = new Date(Date.UTC(y, em + 1, 0)).getUTCDate();
            end = new Date(Date.UTC(y, em, lastDay, 23, 59, 59, 999));

            const pq = q === 1 ? 4 : q - 1;
            const py = q === 1 ? y - 1 : y;
            const psm = (pq - 1) * 3;
            const pem = psm + 2;
            prevStart = new Date(Date.UTC(py, psm, 1, 0, 0, 0, 0));
            const prevLastDay = new Date(Date.UTC(py, pem + 1, 0)).getUTCDate();
            prevEnd = new Date(Date.UTC(py, pem, prevLastDay, 23, 59, 59, 999));
        } else if (filterType === 'year') {
            const y = year ? parseInt(year) : currentYear;
            start = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
            end = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));

            prevStart = new Date(Date.UTC(y - 1, 0, 1, 0, 0, 0, 0));
            prevEnd = new Date(Date.UTC(y - 1, 11, 31, 23, 59, 59, 999));
        } else if (filterType === 'fin-year' || filterType === 'financial-year') {
            const fy = selectedFinancialYear || '26-27';
            const startY = 2000 + parseInt(fy.split('-')[0]);
            start = new Date(Date.UTC(startY, 3, 1, 0, 0, 0, 0));
            end = new Date(Date.UTC(startY + 1, 2, 31, 23, 59, 59, 999));

            prevStart = new Date(Date.UTC(startY - 1, 3, 1, 0, 0, 0, 0));
            prevEnd = new Date(Date.UTC(startY, 2, 31, 23, 59, 59, 999));
        } else if (filterType === 'date-range' || filterType === 'custom') {
            if (startDate && endDate) {
                start = new Date(startDate);
                end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
                const durationMs = end.getTime() - start.getTime();
                prevEnd = new Date(start.getTime() - 1);
                prevStart = new Date(prevEnd.getTime() - durationMs);
            } else {
                const m = currentMonth;
                const y = currentYear;
                start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
                const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
                end = new Date(Date.UTC(y, m, lastDay, 23, 59, 59, 999));
                prevStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
                const pLastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
                prevEnd = new Date(Date.UTC(y, m - 1, pLastDay, 23, 59, 59, 999));
            }
        } else {
            // Unfiltered / All time or default
            const m = month !== undefined ? parseInt(month) : currentMonth;
            const y = year ? parseInt(year) : currentYear;
            start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
            const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
            end = new Date(Date.UTC(y, m, lastDay, 23, 59, 59, 999));
            const pm = m === 0 ? 11 : m - 1;
            const py = m === 0 ? y - 1 : y;
            prevStart = new Date(Date.UTC(py, pm, 1, 0, 0, 0, 0));
            const prevLastDay = new Date(Date.UTC(py, pm + 1, 0)).getUTCDate();
            prevEnd = new Date(Date.UTC(py, pm, prevLastDay, 23, 59, 59, 999));
        }

        const todayDateStr = today.toISOString().split('T')[0];

        // 1. Pipeline for Current Period Data
        const currentPipeline = [
            {
                $match: {
                    out_of_charge: { $ne: null, $ne: "" },
                    be_no: { $not: { $regex: "^cancelled", $options: "i" } },
                    status: { $not: { $regex: "^cancelled", $options: "i" } },
                    ...branchMatch
                }
            },
            {
                $addFields: {
                    parsedOocDate: {
                        $dateFromString: {
                            dateString: "$out_of_charge",
                            onError: null,
                            onNull: null
                        }
                    }
                }
            },
            {
                $match: {
                    parsedOocDate: { $gte: start, $lte: end }
                }
            },
            {
                $facet: {
                    summaryStats: [
                        {
                            $group: {
                                _id: null,
                                totalJobs: { $sum: 1 },
                                seaJobs: { $sum: { $cond: [{ $in: ["$mode", ["SEA", "sea", "Sea"]] }, 1, 0] } },
                                airJobs: { $sum: { $cond: [{ $in: ["$mode", ["AIR", "air", "Air"]] }, 1, 0] } },
                                lclJobs: { $sum: { $cond: [{ $eq: ["$consignment_type", "LCL"] }, 1, 0] } },
                                fcl20: {
                                    $sum: {
                                        $size: {
                                            $filter: {
                                                input: { $ifNull: ["$container_nos", []] },
                                                as: "c",
                                                cond: { $regexMatch: { input: { $ifNull: [{ $toString: "$$c.size" }, ""] }, regex: "^20" } }
                                            }
                                        }
                                    }
                                },
                                fcl40: {
                                    $sum: {
                                        $size: {
                                            $filter: {
                                                input: { $ifNull: ["$container_nos", []] },
                                                as: "c",
                                                cond: { $regexMatch: { input: { $ifNull: [{ $toString: "$$c.size" }, ""] }, regex: "^40" } }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ],
                    branchWise: [
                        {
                            $group: {
                                _id: { $ifNull: ["$branch_code", "Unassigned"] },
                                total: { $sum: 1 },
                                c20: {
                                    $sum: {
                                        $size: {
                                            $filter: {
                                                input: { $ifNull: ["$container_nos", []] },
                                                as: "c",
                                                cond: { $regexMatch: { input: { $ifNull: [{ $toString: "$$c.size" }, ""] }, regex: "^20" } }
                                            }
                                        }
                                    }
                                },
                                c40: {
                                    $sum: {
                                        $size: {
                                            $filter: {
                                                input: { $ifNull: ["$container_nos", []] },
                                                as: "c",
                                                cond: { $regexMatch: { input: { $ifNull: [{ $toString: "$$c.size" }, ""] }, regex: "^40" } }
                                            }
                                        }
                                    }
                                },
                                lcl: { $sum: { $cond: [{ $eq: ["$consignment_type", "LCL"] }, 1, 0] } },
                                air: { $sum: { $cond: [{ $in: ["$mode", ["AIR", "air", "Air"]] }, 1, 0] } }
                            }
                        },
                        { $sort: { total: -1 } }
                    ],
                    dailyBreakdown: [
                        {
                            $group: {
                                _id: {
                                    date: { $dateToString: { format: "%Y-%m-%d", date: "$parsedOocDate" } },
                                    branch: { $ifNull: ["$branch_code", "Unassigned"] },
                                    importer: { $ifNull: ["$importer", "Unknown"] }
                                },
                                count: { $sum: 1 },
                                c20: {
                                    $sum: {
                                        $size: {
                                            $filter: {
                                                input: { $ifNull: ["$container_nos", []] },
                                                as: "c",
                                                cond: { $regexMatch: { input: { $ifNull: [{ $toString: "$$c.size" }, ""] }, regex: "^20" } }
                                            }
                                        }
                                    }
                                },
                                c40: {
                                    $sum: {
                                        $size: {
                                            $filter: {
                                                input: { $ifNull: ["$container_nos", []] },
                                                as: "c",
                                                cond: { $regexMatch: { input: { $ifNull: [{ $toString: "$$c.size" }, ""] }, regex: "^40" } }
                                            }
                                        }
                                    }
                                },
                                lcl: { $sum: { $cond: [{ $eq: ["$consignment_type", "LCL"] }, 1, 0] } },
                                air: { $sum: { $cond: [{ $in: ["$mode", ["AIR", "air", "Air"]] }, 1, 0] } }
                            }
                        },
                        { $sort: { "_id.date": 1 } }
                    ],
                    customerWise: [
                        {
                            $group: {
                                _id: {
                                    importer: { $ifNull: ["$importer", "Unknown"] },
                                    branch: { $ifNull: ["$branch_code", "Unassigned"] },
                                    location: { $ifNull: ["$custom_house", "Unassigned"] },
                                    port: { $ifNull: ["$port_of_reporting", "$custom_house", "Unassigned"] }
                                },
                                total: { $sum: 1 },
                                c20: {
                                    $sum: {
                                        $size: {
                                            $filter: {
                                                input: { $ifNull: ["$container_nos", []] },
                                                as: "c",
                                                cond: { $regexMatch: { input: { $ifNull: [{ $toString: "$$c.size" }, ""] }, regex: "^20" } }
                                            }
                                        }
                                    }
                                },
                                c40: {
                                    $sum: {
                                        $size: {
                                            $filter: {
                                                input: { $ifNull: ["$container_nos", []] },
                                                as: "c",
                                                cond: { $regexMatch: { input: { $ifNull: [{ $toString: "$$c.size" }, ""] }, regex: "^40" } }
                                            }
                                        }
                                    }
                                },
                                lcl: { $sum: { $cond: [{ $eq: ["$consignment_type", "LCL"] }, 1, 0] } },
                                air: { $sum: { $cond: [{ $in: ["$mode", ["AIR", "air", "Air"]] }, 1, 0] } }
                            }
                        },
                        { $sort: { total: -1 } }
                    ],
                    exceptionsData: [
                        {
                            $project: {
                                _id: 1,
                                job_no: 1,
                                job_number: 1,
                                be_no: 1,
                                be_date: 1,
                                out_of_charge: 1,
                                importer: 1,
                                branch_code: 1,
                                custom_house: 1,
                                mode: 1,
                                consignment_type: 1,
                                fine_amount: 1,
                                penalty_amount: 1,
                                bill_document_sent_to_accounts: 1,
                                billing_completed_date: 1,
                                do_validity_upto_job_level: 1,
                                isDoExpired: {
                                    $and: [
                                        { $ne: ["$do_validity_upto_job_level", null] },
                                        { $ne: ["$do_validity_upto_job_level", ""] },
                                        { $lte: ["$do_validity_upto_job_level", todayDateStr] }
                                    ]
                                },
                                // Only flag as billing pending when billing document has NOT been sent to accounts yet
                                isBillingPending: {
                                    $or: [
                                        { $eq: ["$bill_document_sent_to_accounts", null] },
                                        { $eq: ["$bill_document_sent_to_accounts", ""] }
                                    ]
                                },
                                hasFineOrPenalty: {
                                    $or: [
                                        {
                                            $gt: [
                                                { $convert: { input: "$fine_amount", to: "double", onError: 0, onNull: 0 } },
                                                0
                                            ]
                                        },
                                        {
                                            $gt: [
                                                { $convert: { input: "$penalty_amount", to: "double", onError: 0, onNull: 0 } },
                                                0
                                            ]
                                        }
                                    ]
                                },
                                isDeliveryPending: {
                                    $cond: [
                                        { $eq: ["$consignment_type", "LCL"] },
                                        false,
                                        {
                                            $gt: [
                                                {
                                                    $size: {
                                                        $filter: {
                                                            input: { $ifNull: ["$container_nos", []] },
                                                            as: "c",
                                                            cond: {
                                                                $or: [
                                                                    { $eq: ["$$c.delivery_date", null] },
                                                                    { $eq: ["$$c.delivery_date", ""] },
                                                                    { $eq: ["$$c.emptyContainerOffLoadDate", null] },
                                                                    { $eq: ["$$c.emptyContainerOffLoadDate", ""] }
                                                                ]
                                                            }
                                                        }
                                                    }
                                                },
                                                0
                                            ]
                                        }
                                    ]
                                },
                                isDetentionRisk: {
                                    $gt: [
                                        {
                                            $size: {
                                                $filter: {
                                                    input: { $ifNull: ["$container_nos", []] },
                                                    as: "c",
                                                    cond: {
                                                        $and: [
                                                            { $ne: ["$$c.detention_from", null] },
                                                            { $ne: ["$$c.detention_from", ""] },
                                                            { $lte: ["$$c.detention_from", todayDateStr] },
                                                            {
                                                                $or: [
                                                                    { $eq: ["$$c.emptyContainerOffLoadDate", null] },
                                                                    { $eq: ["$$c.emptyContainerOffLoadDate", ""] }
                                                                ]
                                                            }
                                                        ]
                                                    }
                                                }
                                            }
                                        },
                                        0
                                    ]
                                }
                            }
                        },
                        {
                            $match: {
                                $or: [
                                    { isDoExpired: true },
                                    { isBillingPending: true },
                                    { hasFineOrPenalty: true },
                                    { isDeliveryPending: true },
                                    { isDetentionRisk: true }
                                ]
                            }
                        }
                    ],
                    detailedJobs: [
                        {
                            $addFields: {
                                containerNumbers: {
                                    $map: {
                                        input: { $ifNull: ["$container_nos", []] },
                                        as: "c",
                                        in: "$$c.container_number"
                                    }
                                },
                                sizeCounts: {
                                    $reduce: {
                                        input: { $ifNull: ["$container_nos", []] },
                                        initialValue: { ft20: 0, ft40: 0 },
                                        in: {
                                            ft20: {
                                                $add: [
                                                    "$$value.ft20",
                                                    { $cond: [{ $regexMatch: { input: { $ifNull: [{ $toString: "$$this.size" }, ""] }, regex: "^20" } }, 1, 0] }
                                                ]
                                            },
                                            ft40: {
                                                $add: [
                                                    "$$value.ft40",
                                                    { $cond: [{ $regexMatch: { input: { $ifNull: [{ $toString: "$$this.size" }, ""] }, regex: "^40" } }, 1, 0] }
                                                ]
                                            }
                                        }
                                    }
                                },
                                teus: {
                                    $sum: {
                                        $map: {
                                            input: { $ifNull: ["$container_nos", []] },
                                            as: "c",
                                            in: {
                                                $cond: [
                                                    { $regexMatch: { input: { $ifNull: [{ $toString: "$$c.size" }, ""] }, regex: "^20" } },
                                                    1,
                                                    { $cond: [{ $regexMatch: { input: { $ifNull: [{ $toString: "$$c.size" }, ""] }, regex: "^40" } }, 2, 0] }
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                job_number: 1,
                                job_no: 1,
                                branch: { $ifNull: ["$branch_code", "Unassigned"] },
                                branch_code: 1,
                                location: { $ifNull: ["$custom_house", "$port_of_reporting", "Unassigned"] },
                                port_of_reporting: 1,
                                custom_house: 1,
                                importer: 1,
                                commodity: { $ifNull: ["$description", "$description_of_goods", ""] },
                                inv_currency: 1,
                                cif_amount: 1,
                                cif_amount_inr: 1,
                                be_no: 1,
                                be_date: 1,
                                containerNumbers: 1,
                                totalContainers: {
                                    $cond: [
                                        { $eq: ["$consignment_type", "LCL"] },
                                        "LCL",
                                        { $size: { $ifNull: ["$container_nos", []] } }
                                    ]
                                },
                                sizeCounts: 1,
                                teus: 1,
                                out_of_charge: 1,
                                detailed_status: 1,
                                job_owner: 1,
                                status: 1,
                                consignment_type: 1,
                                type_of_b_e: 1,
                                RMS: 1,
                                cth_no: 1,
                                mode: 1,
                                trade_type: 1,
                                fine_amount: 1,
                                penalty_amount: 1,
                                bill_document_sent_to_accounts: 1,
                                billing_completed_date: 1,
                                do_validity_upto_job_level: 1
                            }
                        },
                        { $sort: { out_of_charge: -1, be_date: -1, job_no: -1 } }
                    ]
                }
            }
        ];

        // 2. Pipeline for Previous Period Comparison Data
        const prevPipeline = [
            {
                $match: {
                    out_of_charge: { $ne: null, $ne: "" },
                    be_no: { $not: { $regex: "^cancelled", $options: "i" } },
                    status: { $not: { $regex: "^cancelled", $options: "i" } },
                    ...branchMatch
                }
            },
            {
                $addFields: {
                    parsedOocDate: {
                        $dateFromString: {
                            dateString: "$out_of_charge",
                            onError: null,
                            onNull: null
                        }
                    }
                }
            },
            {
                $match: {
                    parsedOocDate: { $gte: prevStart, $lte: prevEnd }
                }
            },
            {
                $facet: {
                    prevTotal: [{ $count: "count" }],
                    prevBranches: [
                        {
                            $group: {
                                _id: { $ifNull: ["$branch_code", "Unassigned"] },
                                total: { $sum: 1 }
                            }
                        }
                    ],
                    prevCustomers: [
                        {
                            $group: {
                                _id: {
                                    importer: { $ifNull: ["$importer", "Unknown"] },
                                    branch: { $ifNull: ["$branch_code", "Unassigned"] },
                                    location: { $ifNull: ["$custom_house", "Unassigned"] },
                                    port: { $ifNull: ["$port_of_reporting", "$custom_house", "Unassigned"] }
                                },
                                total: { $sum: 1 }
                            }
                        }
                    ]
                }
            }
        ];

        // 3. Pipeline for Customer Monthly Matrix (Apr to Mar)
        let refYear = currentYear;
        if (filterType === 'fin-year' || filterType === 'financial-year') {
            const fy = selectedFinancialYear || '26-27';
            refYear = 2000 + parseInt(fy.split('-')[0]);
        } else if (year) {
            refYear = parseInt(year);
        } else if (fyStartYear) {
            refYear = parseInt(fyStartYear);
        }
        const fyStart = new Date(Date.UTC(refYear, 3, 1, 0, 0, 0, 0));
        const fyEnd = new Date(Date.UTC(refYear + 1, 2, 31, 23, 59, 59, 999));

        const customerMonthlyPipeline = [
            {
                $match: {
                    out_of_charge: { $ne: null, $ne: "" },
                    be_no: { $not: { $regex: "^cancelled", $options: "i" } },
                    status: { $not: { $regex: "^cancelled", $options: "i" } },
                    ...branchMatch
                }
            },
            {
                $addFields: {
                    parsedOocDate: {
                        $dateFromString: {
                            dateString: "$out_of_charge",
                            onError: null,
                            onNull: null
                        }
                    }
                }
            },
            {
                $match: {
                    parsedOocDate: { $gte: fyStart, $lte: fyEnd }
                }
            },
            {
                $group: {
                    _id: {
                        importer: { $ifNull: ["$importer", "Unknown"] },
                        month: { $month: "$parsedOocDate" }
                    },
                    count: { $sum: 1 }
                }
            }
        ];

        const oocMissingPipeline = [
            {
                $match: {
                    out_of_charge: { $in: [null, "", false] },
                    be_no: { $not: { $regex: "^cancelled", $options: "i" } },
                    status: { $not: { $regex: "^cancelled", $options: "i" } },
                    ...branchMatch
                }
            },
            {
                $addFields: {
                    parsedRefDate: {
                        $ifNull: [
                            { $dateFromString: { dateString: "$be_date", onError: null, onNull: null } },
                            {
                                $ifNull: [
                                    { $dateFromString: { dateString: "$job_date", onError: null, onNull: null } },
                                    "$createdAt"
                                ]
                            }
                        ]
                    }
                }
            },
            ...(start && end ? [
                {
                    $match: {
                        parsedRefDate: { $gte: start, $lte: end }
                    }
                }
            ] : []),
            {
                $project: {
                    _id: 1,
                    job_no: 1,
                    job_number: 1,
                    be_no: 1,
                    be_date: 1,
                    out_of_charge: 1,
                    importer: 1,
                    branch_code: 1,
                    custom_house: 1,
                    mode: 1,
                    consignment_type: 1,
                    fine_amount: 1,
                    penalty_amount: 1,
                    bill_document_sent_to_accounts: 1,
                    billing_completed_date: 1,
                    do_validity_upto_job_level: 1,
                    isDoExpired: {
                        $and: [
                            { $ne: ["$do_validity_upto_job_level", null] },
                            { $ne: ["$do_validity_upto_job_level", ""] },
                            { $lte: ["$do_validity_upto_job_level", todayDateStr] }
                        ]
                    },
                    // Only flag as billing pending when billing document has NOT been sent to accounts yet
                    isBillingPending: {
                        $or: [
                            { $eq: ["$bill_document_sent_to_accounts", null] },
                            { $eq: ["$bill_document_sent_to_accounts", ""] }
                        ]
                    },

                    hasFineOrPenalty: {
                        $or: [
                            {
                                $gt: [
                                    { $convert: { input: "$fine_amount", to: "double", onError: 0, onNull: 0 } },
                                    0
                                ]
                            },
                            {
                                $gt: [
                                    { $convert: { input: "$penalty_amount", to: "double", onError: 0, onNull: 0 } },
                                    0
                                ]
                            }
                        ]
                    },
                    isDeliveryPending: {
                        $cond: [
                            { $eq: ["$consignment_type", "LCL"] },
                            false,
                            {
                                $gt: [
                                    {
                                        $size: {
                                            $filter: {
                                                input: { $ifNull: ["$container_nos", []] },
                                                as: "c",
                                                cond: {
                                                    $or: [
                                                        { $eq: ["$$c.delivery_date", null] },
                                                        { $eq: ["$$c.delivery_date", ""] },
                                                        { $eq: ["$$c.emptyContainerOffLoadDate", null] },
                                                        { $eq: ["$$c.emptyContainerOffLoadDate", ""] }
                                                    ]
                                                }
                                            }
                                        }
                                    },
                                    0
                                ]
                            }
                        ]
                    },
                    isDetentionRisk: {
                        $gt: [
                            {
                                $size: {
                                    $filter: {
                                        input: { $ifNull: ["$container_nos", []] },
                                        as: "c",
                                        cond: {
                                            $and: [
                                                { $ne: ["$$c.detention_from", null] },
                                                { $ne: ["$$c.detention_from", ""] },
                                                { $lte: ["$$c.detention_from", todayDateStr] },
                                                {
                                                    $or: [
                                                        { $eq: ["$$c.emptyContainerOffLoadDate", null] },
                                                        { $eq: ["$$c.emptyContainerOffLoadDate", ""] }
                                                    ]
                                                }
                                            ]
                                        }
                                    }
                                }
                            },
                            0
                        ]
                    },
                    isOocMissing: { $literal: true }
                }
            }
        ];

        const [currentRes, prevRes, monthlyRes, oocMissingRes] = await Promise.all([
            JobModel.aggregate(currentPipeline),
            JobModel.aggregate(prevPipeline),
            JobModel.aggregate(customerMonthlyPipeline),
            JobModel.aggregate(oocMissingPipeline)
        ]);

        const currentData = currentRes[0] || {};
        const prevData = prevRes[0] || {};
        const oocMissingList = oocMissingRes || [];

        const totalStats = currentData.summaryStats?.[0] || {
            totalJobs: 0,
            seaJobs: 0,
            airJobs: 0,
            lclJobs: 0,
            fcl20: 0,
            fcl40: 0
        };

        const totalOocCount = totalStats.totalJobs || 0;
        const totalTeus = (totalStats.fcl20 || 0) + ((totalStats.fcl40 || 0) * 2);

        // Previous stats
        const prevTotalJobs = prevData.prevTotal?.[0]?.count || 0;
        const prevBranchMap = {};
        (prevData.prevBranches || []).forEach(b => { prevBranchMap[b._id] = b.total; });

        const prevCustomerMap = {};
        (prevData.prevCustomers || []).forEach(c => {
            if (typeof c._id === 'object' && c._id !== null) {
                const keyFull = `${c._id.importer}___${c._id.branch}___${c._id.location}___${c._id.port}`;
                const keyBranch = `${c._id.importer}___${c._id.branch}`;
                prevCustomerMap[keyFull] = c.total;
                prevCustomerMap[keyBranch] = (prevCustomerMap[keyBranch] || 0) + c.total;
                prevCustomerMap[c._id.importer] = (prevCustomerMap[c._id.importer] || 0) + c.total;
            } else {
                prevCustomerMap[c._id] = c.total;
            }
        });

        // Calculate elapsed days
        const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
        const prevDiffDays = Math.max(1, Math.round((prevEnd - prevStart) / (1000 * 60 * 60 * 24)));
        const avgDaily = (totalOocCount / diffDays);
        const prevAvgDaily = (prevTotalJobs / prevDiffDays);

        // Format Branch Wise Data
        const branchWise = (currentData.branchWise || []).map(b => {
            const branchPrev = prevBranchMap[b._id] || 0;
            const branchTeus = (b.c20 || 0) + ((b.c40 || 0) * 2);
            const branchAvg = (b.total / diffDays);
            return {
                name: b._id,
                total: b.total,
                c20: b.c20,
                c40: b.c40,
                lcl: b.lcl,
                air: b.air,
                teus: branchTeus,
                prevTotal: branchPrev,
                avgDaily: Math.round(branchAvg * 10) / 10
            };
        });

        // Format Customer Wise Comparisons & Ups/Downs
        const customerList = (currentData.customerWise || []).map(c => {
            const importerName = typeof c._id === 'object' && c._id !== null ? c._id.importer : c._id;
            const branchName = typeof c._id === 'object' && c._id !== null ? c._id.branch : 'All';
            const locationName = typeof c._id === 'object' && c._id !== null ? c._id.location : 'Unassigned';
            const portName = typeof c._id === 'object' && c._id !== null ? c._id.port : 'Unassigned';
            const keyFull = `${importerName}___${branchName}___${locationName}___${portName}`;
            const keyBranch = `${importerName}___${branchName}`;
            const prev = prevCustomerMap[keyFull] !== undefined ? prevCustomerMap[keyFull] : (prevCustomerMap[keyBranch] !== undefined ? prevCustomerMap[keyBranch] : (prevCustomerMap[importerName] || 0));
            const diff = c.total - prev;
            const pct = prev > 0 ? ((diff / prev) * 100).toFixed(1) : (c.total > 0 ? '100.0' : '0.0');
            const teus = (c.c20 || 0) + ((c.c40 || 0) * 2);
            return {
                customer: importerName,
                branch: branchName,
                location: locationName,
                port: portName,
                current: c.total,
                prev,
                diff,
                pct: parseFloat(pct),
                c20: c.c20 || 0,
                c40: c.c40 || 0,
                lcl: c.lcl || 0,
                air: c.air || 0,
                teus
            };
        });

        const customerGainers = customerList
            .filter(c => c.diff > 0)
            .sort((a, b) => b.diff - a.diff)
            .slice(0, 10);

        const customerFallers = customerList
            .filter(c => c.diff < 0)
            .sort((a, b) => a.diff - b.diff)
            .slice(0, 10);

        // Format Daily Breakdown Matrix
        const dailyMap = {};
        (currentData.dailyBreakdown || []).forEach(row => {
            const d = row._id.date;
            if (!dailyMap[d]) {
                dailyMap[d] = {
                    date: d,
                    totalOoc: 0,
                    c20: 0,
                    c40: 0,
                    lcl: 0,
                    air: 0,
                    teus: 0,
                    branches: {},
                    customers: {}
                };
            }
            dailyMap[d].totalOoc += row.count;
            dailyMap[d].c20 += row.c20;
            dailyMap[d].c40 += row.c40;
            dailyMap[d].lcl += row.lcl;
            dailyMap[d].air += row.air;
            dailyMap[d].teus += (row.c20 + row.c40 * 2);

            const br = row._id.branch;
            dailyMap[d].branches[br] = (dailyMap[d].branches[br] || 0) + row.count;

            const imp = row._id.importer;
            dailyMap[d].customers[imp] = (dailyMap[d].customers[imp] || 0) + row.count;
        });

        const dailyDataArray = Object.values(dailyMap).map(d => {
            let topImp = '—';
            let topImpCount = 0;
            Object.entries(d.customers).forEach(([cust, cnt]) => {
                if (cnt > topImpCount) {
                    topImp = cust;
                    topImpCount = cnt;
                }
            });
            return {
                ...d,
                topCustomer: topImp,
                topCustomerCount: topImpCount
            };
        }).sort((a, b) => a.date.localeCompare(b.date));

        // Format Customer Monthly Apr-Mar Matrix
        const monthlyCustomerMap = {};
        (monthlyRes || []).forEach(row => {
            const imp = row._id.importer;
            const m = String(row._id.month);
            if (!monthlyCustomerMap[imp]) {
                monthlyCustomerMap[imp] = { customer: imp, months: {}, total: 0 };
            }
            monthlyCustomerMap[imp].months[m] = row.count;
            monthlyCustomerMap[imp].total += row.count;
        });

        const customerMonthlySummary = Object.values(monthlyCustomerMap).sort((a, b) => b.total - a.total);

        // Exceptions Breakdown
        const currentExceptions = (currentData.exceptionsData || []).map(x => ({ ...x, isOocMissing: false }));
        const exceptionsList = [...currentExceptions, ...oocMissingList];
        const exceptionsSummary = {
            total: exceptionsList.length,
            detentionRisk: exceptionsList.filter(x => x.isDetentionRisk).length,
            doExpired: exceptionsList.filter(x => x.isDoExpired).length,
            billingPending: exceptionsList.filter(x => x.isBillingPending).length,
            deliveryPending: exceptionsList.filter(x => x.isDeliveryPending).length,
            finesOrPenalties: exceptionsList.filter(x => x.hasFineOrPenalty).length,
            oocMissing: oocMissingList.length
        };

        res.json({
            success: true,
            totalCreated: totalOocCount,
            totalOoc: totalOocCount,
            totalTeus,
            stats: totalStats,
            prevStats: {
                totalOoc: prevTotalJobs,
                avgDaily: Math.round(prevAvgDaily * 10) / 10,
                branchMap: prevBranchMap,
                diffDays: prevDiffDays
            },
            branchWise,
            dailyData: dailyDataArray,
            customerWise: customerList,
            customerGainers,
            customerFallers,
            customerMonthlySummary,
            exceptionsSummary,
            exceptionsList,
            detailedJobs: currentData.detailedJobs || [],
            dateRange: {
                start: start.toISOString(),
                end: end.toISOString(),
                prevStart: prevStart.toISOString(),
                prevEnd: prevEnd.toISOString(),
                diffDays
            }
        });
    } catch (error) {
        console.error("Error in /out-of-charge-summaries:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// Export Let Export Order (LEO) Summary Report
router.get("/export-leo-summaries", authMiddleware, applyUserBranchFilter, async (req, res) => {
    try {
        const {
            filterType,
            month,
            year,
            quarter,
            startDate,
            endDate,
            day,
            branchId,
            category,
            selectedFinancialYear,
            fyStartYear
        } = req.query;

        // Date calculation helper
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        let start, end, prevStart, prevEnd;

        if (filterType === 'day') {
            const dStr = day || today.toISOString().slice(0, 10);
            start = new Date(`${dStr}T00:00:00.000Z`);
            end = new Date(`${dStr}T23:59:59.999Z`);

            const pd = new Date(start);
            pd.setDate(pd.getDate() - 1);
            const pdStr = pd.toISOString().slice(0, 10);
            prevStart = new Date(`${pdStr}T00:00:00.000Z`);
            prevEnd = new Date(`${pdStr}T23:59:59.999Z`);
        } else if (filterType === 'week') {
            const refDate = day ? new Date(day) : today;
            const dayOfWeek = refDate.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const ws = new Date(refDate);
            ws.setDate(refDate.getDate() + mondayOffset);
            ws.setHours(0, 0, 0, 0);
            const we = new Date(ws);
            we.setDate(ws.getDate() + 6);
            we.setHours(23, 59, 59, 999);

            start = ws;
            end = we;

            const pws = new Date(ws);
            pws.setDate(pws.getDate() - 7);
            const pwe = new Date(we);
            pwe.setDate(pwe.getDate() - 7);
            prevStart = pws;
            prevEnd = pwe;
        } else if (filterType === 'month') {
            const m = month !== undefined ? parseInt(month) : currentMonth;
            const y = year ? parseInt(year) : currentYear;
            start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
            const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
            end = new Date(Date.UTC(y, m, lastDay, 23, 59, 59, 999));

            const pm = m === 0 ? 11 : m - 1;
            const py = m === 0 ? y - 1 : y;
            prevStart = new Date(Date.UTC(py, pm, 1, 0, 0, 0, 0));
            const prevLastDay = new Date(Date.UTC(py, pm + 1, 0)).getUTCDate();
            prevEnd = new Date(Date.UTC(py, pm, prevLastDay, 23, 59, 59, 999));
        } else if (filterType === 'quarter') {
            const q = quarter ? parseInt(quarter) : Math.ceil((currentMonth + 1) / 3);
            const y = year ? parseInt(year) : currentYear;
            const sm = (q - 1) * 3;
            const em = sm + 2;
            start = new Date(Date.UTC(y, sm, 1, 0, 0, 0, 0));
            const lastDay = new Date(Date.UTC(y, em + 1, 0)).getUTCDate();
            end = new Date(Date.UTC(y, em, lastDay, 23, 59, 59, 999));

            const pq = q === 1 ? 4 : q - 1;
            const py = q === 1 ? y - 1 : y;
            const psm = (pq - 1) * 3;
            const pem = psm + 2;
            prevStart = new Date(Date.UTC(py, psm, 1, 0, 0, 0, 0));
            const prevLastDay = new Date(Date.UTC(py, pem + 1, 0)).getUTCDate();
            prevEnd = new Date(Date.UTC(py, pem, prevLastDay, 23, 59, 59, 999));
        } else if (filterType === 'year') {
            const y = year ? parseInt(year) : currentYear;
            start = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
            end = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));

            prevStart = new Date(Date.UTC(y - 1, 0, 1, 0, 0, 0, 0));
            prevEnd = new Date(Date.UTC(y - 1, 11, 31, 23, 59, 59, 999));
        } else if (filterType === 'fin-year' || filterType === 'financial-year') {
            const fy = selectedFinancialYear || '26-27';
            const startY = 2000 + parseInt(fy.split('-')[0]);
            start = new Date(Date.UTC(startY, 3, 1, 0, 0, 0, 0));
            end = new Date(Date.UTC(startY + 1, 2, 31, 23, 59, 59, 999));

            prevStart = new Date(Date.UTC(startY - 1, 3, 1, 0, 0, 0, 0));
            prevEnd = new Date(Date.UTC(startY, 2, 31, 23, 59, 59, 999));
        } else if (filterType === 'date-range' || filterType === 'custom') {
            if (startDate && endDate) {
                start = new Date(startDate);
                end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
                const durationMs = end.getTime() - start.getTime();
                prevEnd = new Date(start.getTime() - 1);
                prevStart = new Date(prevEnd.getTime() - durationMs);
            } else {
                const m = currentMonth;
                const y = currentYear;
                start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
                const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
                end = new Date(Date.UTC(y, m, lastDay, 23, 59, 59, 999));
                prevStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
                const pLastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
                prevEnd = new Date(Date.UTC(y, m - 1, pLastDay, 23, 59, 59, 999));
            }
        } else {
            // Unfiltered / All time or default
            const m = month !== undefined ? parseInt(month) : currentMonth;
            const y = year ? parseInt(year) : currentYear;
            start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
            const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
            end = new Date(Date.UTC(y, m, lastDay, 23, 59, 59, 999));
            const pm = m === 0 ? 11 : m - 1;
            const py = m === 0 ? y - 1 : y;
            prevStart = new Date(Date.UTC(py, pm, 1, 0, 0, 0, 0));
            const prevLastDay = new Date(Date.UTC(py, pm + 1, 0)).getUTCDate();
            prevEnd = new Date(Date.UTC(py, pm, prevLastDay, 23, 59, 59, 999));
        }

        // Access export database collection
        const exportDb = mongoose.connection.useDb('export');
        const exportjobs = exportDb.collection('exportjobs');

        // Build accurate branch & mode match specifically for export schema
        const exportBranchMatch = await getExportBranchMatch(branchId, category, req.authorizedBranchIds);

        // Robust LEO Date Extraction: checks direct fields, statusDetails, and milestones (handling null & empty strings)
        const robustLeoExpr = {
            $let: {
                vars: {
                    d1: { $cond: [{ $and: [{ $ne: ["$leo_date", null] }, { $ne: ["$leo_date", ""] }] }, "$leo_date", null] },
                    d2: { $cond: [{ $and: [{ $ne: ["$leoDate", null] }, { $ne: ["$leoDate", ""] }] }, "$leoDate", null] },
                    d3: {
                        $let: {
                            vars: {
                                sdLeo: { $arrayElemAt: [{ $arrayElemAt: ["$operations.statusDetails.leoDate", 0] }, 0] }
                            },
                            in: { $cond: [{ $and: [{ $ne: ["$$sdLeo", null] }, { $ne: ["$$sdLeo", ""] }] }, "$$sdLeo", null] }
                        }
                    },
                    d4: {
                        $let: {
                            vars: {
                                leoM: {
                                    $filter: {
                                        input: { $ifNull: ["$milestones", []] },
                                        as: "m",
                                        cond: {
                                            $and: [
                                                { $regexMatch: { input: { $ifNull: ["$$m.milestoneName", ""] }, regex: "l.?e.?o", options: "i" } },
                                                { $ne: ["$$m.actualDate", null] },
                                                { $ne: ["$$m.actualDate", ""] }
                                            ]
                                        }
                                    }
                                }
                            },
                            in: { $arrayElemAt: ["$$leoM.actualDate", 0] }
                        }
                    }
                },
                in: { $ifNull: ["$$d1", { $ifNull: ["$$d2", { $ifNull: ["$$d3", "$$d4"] }] }] }
            }
        };

        // 1. Pipeline for Current Period Data
        const currentPipeline = [
            {
                $addFields: {
                    rawLeoDate: robustLeoExpr,
                    exporterName: { $ifNull: ["$exporter", "$shipper", "Unknown"] },
                    modeStr: { $ifNull: ["$transportMode", "$mode", "SEA"] }
                }
            },
            {
                $match: {
                    rawLeoDate: { $exists: true, $nin: [null, ""] },
                    sb_no: { $not: { $regex: "^cancelled", $options: "i" } },
                    status: { $not: { $regex: "^cancelled", $options: "i" } },
                    isJobCanceled: { $ne: true },
                    ...exportBranchMatch
                }
            },
            {
                $addFields: {
                    parsedLeoDate: {
                        $dateFromString: {
                            dateString: "$rawLeoDate",
                            onError: null,
                            onNull: null
                        }
                    }
                }
            },
            {
                $match: {
                    parsedLeoDate: { $gte: start, $lte: end }
                }
            },
            {
                $facet: {
                    summaryStats: [
                        {
                            $group: {
                                _id: null,
                                totalJobs: { $sum: 1 },
                                seaJobs: {
                                    $sum: {
                                        $cond: [{ $regexMatch: { input: { $ifNull: ["$modeStr", "SEA"] }, regex: "sea", options: "i" } }, 1, 0]
                                    }
                                },
                                airJobs: {
                                    $sum: {
                                        $cond: [{ $regexMatch: { input: { $ifNull: ["$modeStr", ""] }, regex: "air", options: "i" } }, 1, 0]
                                    }
                                },
                                lclJobs: {
                                    $sum: {
                                        $cond: [{ $eq: ["$consignmentType", "LCL"] }, 1, 0]
                                    }
                                },
                                fcl20: {
                                    $sum: {
                                        $sum: {
                                            $map: {
                                                input: { $ifNull: ["$containers", []] },
                                                as: "c",
                                                in: {
                                                    $cond: [{ $regexMatch: { input: { $ifNull: [{ $toString: "$$c.type" }, ""] }, regex: "^20" } }, 1, 0]
                                                }
                                            }
                                        }
                                    }
                                },
                                fcl40: {
                                    $sum: {
                                        $sum: {
                                            $map: {
                                                input: { $ifNull: ["$containers", []] },
                                                as: "c",
                                                in: {
                                                    $cond: [{ $regexMatch: { input: { $ifNull: [{ $toString: "$$c.type" }, ""] }, regex: "^40" } }, 1, 0]
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ],
                    branchWise: [
                        {
                            $group: {
                                _id: { $ifNull: ["$branch_code", "Unassigned"] },
                                total: { $sum: 1 },
                                c20: {
                                    $sum: {
                                        $sum: {
                                            $map: {
                                                input: { $ifNull: ["$containers", []] },
                                                as: "c",
                                                in: {
                                                    $cond: [{ $regexMatch: { input: { $ifNull: [{ $toString: "$$c.type" }, ""] }, regex: "^20" } }, 1, 0]
                                                }
                                            }
                                        }
                                    }
                                },
                                c40: {
                                    $sum: {
                                        $sum: {
                                            $map: {
                                                input: { $ifNull: ["$containers", []] },
                                                as: "c",
                                                in: {
                                                    $cond: [{ $regexMatch: { input: { $ifNull: [{ $toString: "$$c.type" }, ""] }, regex: "^40" } }, 1, 0]
                                                }
                                            }
                                        }
                                    }
                                },
                                lcl: {
                                    $sum: {
                                        $cond: [{ $eq: ["$consignmentType", "LCL"] }, 1, 0]
                                    }
                                },
                                air: {
                                    $sum: {
                                        $cond: [{ $regexMatch: { input: { $ifNull: ["$modeStr", ""] }, regex: "air", options: "i" } }, 1, 0]
                                    }
                                }
                            }
                        },
                        { $sort: { total: -1 } }
                    ],
                    dailyBreakdown: [
                        {
                            $group: {
                                _id: {
                                    date: { $dateToString: { format: "%Y-%m-%d", date: "$parsedLeoDate" } },
                                    branch: "$branch_code",
                                    exporter: "$exporterName"
                                },
                                count: { $sum: 1 },
                                c20: {
                                    $sum: {
                                        $sum: {
                                            $map: {
                                                input: { $ifNull: ["$containers", []] },
                                                as: "c",
                                                in: {
                                                    $cond: [{ $regexMatch: { input: { $ifNull: [{ $toString: "$$c.type" }, ""] }, regex: "^20" } }, 1, 0]
                                                }
                                            }
                                        }
                                    }
                                },
                                c40: {
                                    $sum: {
                                        $sum: {
                                            $map: {
                                                input: { $ifNull: ["$containers", []] },
                                                as: "c",
                                                in: {
                                                    $cond: [{ $regexMatch: { input: { $ifNull: [{ $toString: "$$c.type" }, ""] }, regex: "^40" } }, 1, 0]
                                                }
                                            }
                                        }
                                    }
                                },
                                lcl: {
                                    $sum: {
                                        $cond: [{ $eq: ["$consignmentType", "LCL"] }, 1, 0]
                                    }
                                },
                                air: {
                                    $sum: {
                                        $cond: [{ $regexMatch: { input: { $ifNull: ["$modeStr", ""] }, regex: "air", options: "i" } }, 1, 0]
                                    }
                                }
                            }
                        },
                        { $sort: { "_id.date": 1 } }
                    ],
                    customerWise: [
                        {
                            $group: {
                                _id: {
                                    exporter: "$exporterName",
                                    branch: { $ifNull: ["$branch_code", "Unassigned"] },
                                    location: { $ifNull: ["$custom_house", "Unassigned"] },
                                    port: { $ifNull: ["$port_of_loading", "$custom_house", "Unassigned"] }
                                },
                                total: { $sum: 1 },
                                c20: {
                                    $sum: {
                                        $sum: {
                                            $map: {
                                                input: { $ifNull: ["$containers", []] },
                                                as: "c",
                                                in: {
                                                    $cond: [{ $regexMatch: { input: { $ifNull: [{ $toString: "$$c.type" }, ""] }, regex: "^20" } }, 1, 0]
                                                }
                                            }
                                        }
                                    }
                                },
                                c40: {
                                    $sum: {
                                        $sum: {
                                            $map: {
                                                input: { $ifNull: ["$containers", []] },
                                                as: "c",
                                                in: {
                                                    $cond: [{ $regexMatch: { input: { $ifNull: [{ $toString: "$$c.type" }, ""] }, regex: "^40" } }, 1, 0]
                                                }
                                            }
                                        }
                                    }
                                },
                                lcl: {
                                    $sum: {
                                        $cond: [{ $eq: ["$consignmentType", "LCL"] }, 1, 0]
                                    }
                                },
                                air: {
                                    $sum: {
                                        $cond: [{ $regexMatch: { input: { $ifNull: ["$modeStr", ""] }, regex: "air", options: "i" } }, 1, 0]
                                    }
                                }
                            }
                        },
                        { $sort: { total: -1 } }
                    ],
                    detailedJobs: [
                        {
                            $addFields: {
                                // Fix: use $map to extract sub-fields from containers array, then $reduce to join
                                containerNumbers: {
                                    $reduce: {
                                        input: {
                                            $ifNull: [
                                                {
                                                    $map: {
                                                        input: { $ifNull: ["$containers", []] },
                                                        as: "c",
                                                        in: { $ifNull: ["$$c.container_number", ""] }
                                                    }
                                                },
                                                []
                                            ]
                                        },
                                        initialValue: "",
                                        in: {
                                            $cond: [
                                                { $eq: ["$$value", ""] },
                                                "$$this",
                                                {
                                                    $cond: [
                                                        { $eq: ["$$this", ""] },
                                                        "$$value",
                                                        { $concat: ["$$value", ", ", "$$this"] }
                                                    ]
                                                }
                                            ]
                                        }
                                    }
                                },
                                // Fix: split sizeCounts into two explicit top-level fields so MongoDB evaluates each $reduce independently
                                sizeCounts_ft20: {
                                    $reduce: {
                                        input: { $ifNull: ["$containers", []] },
                                        initialValue: 0,
                                        in: {
                                            $add: [
                                                "$$value",
                                                { $cond: [{ $regexMatch: { input: { $ifNull: [{ $toString: "$$this.type" }, ""] }, regex: "^20" } }, 1, 0] }
                                            ]
                                        }
                                    }
                                },
                                sizeCounts_ft40: {
                                    $reduce: {
                                        input: { $ifNull: ["$containers", []] },
                                        initialValue: 0,
                                        in: {
                                            $add: [
                                                "$$value",
                                                { $cond: [{ $regexMatch: { input: { $ifNull: [{ $toString: "$$this.type" }, ""] }, regex: "^40" } }, 1, 0] }
                                            ]
                                        }
                                    }
                                },
                                teus: {
                                    $sum: {
                                        $map: {
                                            input: { $ifNull: ["$containers", []] },
                                            as: "c",
                                            in: {
                                                $cond: [
                                                    { $regexMatch: { input: { $ifNull: [{ $toString: "$$c.type" }, ""] }, regex: "^20" } },
                                                    1,
                                                    { $cond: [{ $regexMatch: { input: { $ifNull: [{ $toString: "$$c.type" }, ""] }, regex: "^40" } }, 2, 0] }
                                                ]
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                job_number: { $ifNull: ["$job_no", "$jobNumber"] },
                                job_no: 1,
                                branch: { $ifNull: ["$branch_code", "Unassigned"] },
                                branch_code: 1,
                                location: { $ifNull: ["$custom_house", "$port_of_loading", "Unassigned"] },
                                port_of_loading: 1,
                                custom_house: 1,
                                importer: "$exporterName",
                                exporter: "$exporterName",
                                commodity: { $ifNull: ["$description", ""] },
                                inv_currency: { $ifNull: ["$currency", "INR"] },
                                cif_amount: { $ifNull: ["$fob_value", 0] },
                                be_no: "$sb_no",
                                be_date: "$sb_date",
                                sb_no: 1,
                                sb_date: 1,
                                containerNumbers: 1,
                                totalContainers: {
                                    $cond: [
                                        { $eq: ["$consignmentType", "LCL"] },
                                        "LCL",
                                        { $size: { $ifNull: ["$containers", []] } }
                                    ]
                                },
                                sizeCounts: { ft20: "$sizeCounts_ft20", ft40: "$sizeCounts_ft40" },
                                teus: 1,
                                out_of_charge: "$rawLeoDate",
                                leo_date: "$rawLeoDate",
                                detailed_status: { $ifNull: ["$detailedStatus", "$status"] },
                                job_owner: 1,
                                status: 1,
                                consignment_type: "$consignmentType",
                                mode: "$modeStr",
                                fine_amount: 1
                            }
                        },
                        { $sort: { leo_date: -1, sb_date: -1, job_no: -1 } }
                    ]
                }
            }
        ];

        // 2. Previous Period Pipeline
        const prevPipeline = [
            {
                $addFields: {
                    rawLeoDate: robustLeoExpr,
                    exporterName: { $ifNull: ["$exporter", "$shipper", "Unknown"] }
                }
            },
            {
                $match: {
                    rawLeoDate: { $exists: true, $nin: [null, ""] },
                    sb_no: { $not: { $regex: "^cancelled", $options: "i" } },
                    status: { $not: { $regex: "^cancelled", $options: "i" } },
                    isJobCanceled: { $ne: true },
                    ...exportBranchMatch
                }
            },
            {
                $addFields: {
                    parsedLeoDate: {
                        $dateFromString: {
                            dateString: "$rawLeoDate",
                            onError: null,
                            onNull: null
                        }
                    }
                }
            },
            {
                $match: {
                    parsedLeoDate: { $gte: prevStart, $lte: prevEnd }
                }
            },
            {
                $facet: {
                    prevTotal: [{ $count: "count" }],
                    prevBranches: [
                        {
                            $group: {
                                _id: { $ifNull: ["$branch_code", "Unassigned"] },
                                total: { $sum: 1 }
                            }
                        }
                    ],
                    prevCustomers: [
                        {
                            $group: {
                                _id: {
                                    exporter: "$exporterName",
                                    branch: { $ifNull: ["$branch_code", "Unassigned"] },
                                    location: { $ifNull: ["$custom_house", "Unassigned"] },
                                    port: { $ifNull: ["$port_of_loading", "$custom_house", "Unassigned"] }
                                },
                                total: { $sum: 1 }
                            }
                        }
                    ]
                }
            }
        ];

        // 3. Exporter Monthly Matrix (Apr - Mar)
        let refYear = currentYear;
        if (filterType === 'fin-year' || filterType === 'financial-year') {
            const fy = selectedFinancialYear || '26-27';
            refYear = 2000 + parseInt(fy.split('-')[0]);
        } else if (year) {
            refYear = parseInt(year);
        } else if (fyStartYear) {
            refYear = parseInt(fyStartYear);
        }
        const fyStart = new Date(Date.UTC(refYear, 3, 1, 0, 0, 0, 0));
        const fyEnd = new Date(Date.UTC(refYear + 1, 2, 31, 23, 59, 59, 999));

        const customerMonthlyPipeline = [
            {
                $addFields: {
                    rawLeoDate: robustLeoExpr,
                    exporterName: { $ifNull: ["$exporter", "$shipper", "Unknown"] }
                }
            },
            {
                $match: {
                    rawLeoDate: { $exists: true, $nin: [null, ""] },
                    sb_no: { $not: { $regex: "^cancelled", $options: "i" } },
                    status: { $not: { $regex: "^cancelled", $options: "i" } },
                    isJobCanceled: { $ne: true },
                    ...exportBranchMatch
                }
            },
            {
                $addFields: {
                    parsedLeoDate: {
                        $dateFromString: {
                            dateString: "$rawLeoDate",
                            onError: null,
                            onNull: null
                        }
                    }
                }
            },
            {
                $match: {
                    parsedLeoDate: { $gte: fyStart, $lte: fyEnd }
                }
            },
            {
                $group: {
                    _id: {
                        exporter: "$exporterName",
                        month: { $month: "$parsedLeoDate" }
                    },
                    count: { $sum: 1 }
                }
            }
        ];

        const leoMissingPipeline = [
            {
                $addFields: {
                    rawLeoDate: robustLeoExpr,
                    modeStr: { $ifNull: ["$transportMode", "$transport_mode", "$mode", "SEA"] },
                    exporterName: { $ifNull: ["$exporter", "$shipper", "$exporter_name", "Unknown"] }
                }
            },
            {
                $match: {
                    rawLeoDate: { $in: [null, "", false] },
                    sb_no: { $not: { $regex: "^cancelled", $options: "i" } },
                    status: { $not: { $regex: "^cancelled", $options: "i" } },
                    isJobCanceled: { $ne: true },
                    ...exportBranchMatch
                }
            },
            {
                $addFields: {
                    parsedRefDate: {
                        $ifNull: [
                            { $dateFromString: { dateString: "$sb_date", onError: null, onNull: null } },
                            {
                                $ifNull: [
                                    { $dateFromString: { dateString: "$job_date", onError: null, onNull: null } },
                                    "$createdAt"
                                ]
                            }
                        ]
                    }
                }
            },
            ...(start && end ? [
                {
                    $match: {
                        parsedRefDate: { $gte: start, $lte: end }
                    }
                }
            ] : []),
            {
                $project: {
                    _id: 1,
                    job_no: 1,
                    jobNumber: 1,
                    sb_no: 1,
                    sb_date: 1,
                    leoDate: "$rawLeoDate",
                    exporter: "$exporterName",
                    branch_code: 1,
                    custom_house: 1,
                    mode: "$modeStr",
                    consignmentType: 1,
                    fine_amount: 1,
                    detailedStatus: 1,
                    status: 1,
                    isHandoverPending: {
                        $cond: [
                            { $eq: ["$consignmentType", "LCL"] },
                            false,
                            {
                                $and: [
                                    { $ne: ["$detailedStatus", "Container HO"] },
                                    { $ne: ["$detailedStatus", "Rail Out"] },
                                    { $ne: ["$detailedStatus", "Billing Done"] }
                                ]
                            }
                        ]
                    },
                    isRailOutPending: {
                        $and: [
                            { $ne: ["$detailedStatus", "Rail Out"] },
                            { $ne: ["$detailedStatus", "Billing Done"] }
                        ]
                    },
                    isBillingPending: {
                        $ne: ["$detailedStatus", "Billing Done"]
                    },
                    isDrawbackPending: {
                        $or: [
                            { $eq: ["$drawback_scroll_no", null] },
                            { $eq: ["$drawback_scroll_no", ""] }
                        ]
                    },
                    hasFineOrPenalty: {
                        $gt: [
                            { $convert: { input: "$fine_amount", to: "double", onError: 0, onNull: 0 } },
                            0
                        ]
                    },
                    isLeoMissing: { $literal: true }
                }
            }
        ];

        const [currentRes, prevRes, monthlyRes, leoMissingRes] = await Promise.all([
            exportjobs.aggregate(currentPipeline).toArray(),
            exportjobs.aggregate(prevPipeline).toArray(),
            exportjobs.aggregate(customerMonthlyPipeline).toArray(),
            exportjobs.aggregate(leoMissingPipeline).toArray()
        ]);

        const currentData = currentRes[0] || {};
        const prevData = prevRes[0] || {};

        const totalStats = currentData.summaryStats?.[0] || {
            totalJobs: 0,
            seaJobs: 0,
            airJobs: 0,
            lclJobs: 0,
            fcl20: 0,
            fcl40: 0
        };

        const totalLeoCount = totalStats.totalJobs || 0;
        const totalTeus = (totalStats.fcl20 || 0) + ((totalStats.fcl40 || 0) * 2);

        // Previous stats
        const prevTotalJobs = prevData.prevTotal?.[0]?.count || 0;
        const prevBranchMap = {};
        (prevData.prevBranches || []).forEach(b => { prevBranchMap[b._id] = b.total; });

        const prevCustomerMap = {};
        (prevData.prevCustomers || []).forEach(c => {
            if (typeof c._id === 'object' && c._id !== null) {
                const keyFull = `${c._id.exporter}___${c._id.branch}___${c._id.location}___${c._id.port}`;
                const keyBranch = `${c._id.exporter}___${c._id.branch}`;
                prevCustomerMap[keyFull] = c.total;
                prevCustomerMap[keyBranch] = (prevCustomerMap[keyBranch] || 0) + c.total;
                prevCustomerMap[c._id.exporter] = (prevCustomerMap[c._id.exporter] || 0) + c.total;
            } else {
                prevCustomerMap[c._id] = c.total;
            }
        });

        // Calculate elapsed days
        const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
        const prevDiffDays = Math.max(1, Math.round((prevEnd - prevStart) / (1000 * 60 * 60 * 24)));
        const avgDaily = (totalLeoCount / diffDays);
        const prevAvgDaily = (prevTotalJobs / prevDiffDays);

        // Format Branch Wise Data
        const branchWise = (currentData.branchWise || []).map(b => {
            const branchPrev = prevBranchMap[b._id] || 0;
            const branchTeus = (b.c20 || 0) + ((b.c40 || 0) * 2);
            const branchAvg = (b.total / diffDays);
            return {
                name: b._id,
                total: b.total,
                c20: b.c20,
                c40: b.c40,
                lcl: b.lcl,
                air: b.air,
                teus: branchTeus,
                prevTotal: branchPrev,
                avgDaily: Math.round(branchAvg * 10) / 10
            };
        });

        // Format Exporter Wise Comparisons & Ups/Downs
        const customerList = (currentData.customerWise || []).map(c => {
            const exporterName = typeof c._id === 'object' && c._id !== null ? c._id.exporter : c._id;
            const branchName = typeof c._id === 'object' && c._id !== null ? c._id.branch : 'All';
            const locationName = typeof c._id === 'object' && c._id !== null ? c._id.location : 'Unassigned';
            const portName = typeof c._id === 'object' && c._id !== null ? c._id.port : 'Unassigned';
            const keyFull = `${exporterName}___${branchName}___${locationName}___${portName}`;
            const keyBranch = `${exporterName}___${branchName}`;
            const prev = prevCustomerMap[keyFull] !== undefined ? prevCustomerMap[keyFull] : (prevCustomerMap[keyBranch] !== undefined ? prevCustomerMap[keyBranch] : (prevCustomerMap[exporterName] || 0));
            const diff = c.total - prev;
            const pct = prev > 0 ? ((diff / prev) * 100).toFixed(1) : (c.total > 0 ? '100.0' : '0.0');
            const teus = (c.c20 || 0) + ((c.c40 || 0) * 2);
            return {
                customer: exporterName,
                branch: branchName,
                location: locationName,
                port: portName,
                current: c.total,
                prev,
                diff,
                pct: parseFloat(pct),
                c20: c.c20 || 0,
                c40: c.c40 || 0,
                lcl: c.lcl || 0,
                air: c.air || 0,
                teus
            };
        });

        const customerGainers = customerList
            .filter(c => c.diff > 0)
            .sort((a, b) => b.diff - a.diff)
            .slice(0, 10);

        const customerFallers = customerList
            .filter(c => c.diff < 0)
            .sort((a, b) => a.diff - b.diff)
            .slice(0, 10);

        // Format Daily Breakdown Matrix
        const dailyMap = {};
        (currentData.dailyBreakdown || []).forEach(row => {
            const d = row._id.date;
            if (!dailyMap[d]) {
                dailyMap[d] = {
                    date: d,
                    totalOoc: 0,
                    c20: 0,
                    c40: 0,
                    lcl: 0,
                    air: 0,
                    teus: 0,
                    branches: {},
                    customers: {}
                };
            }
            dailyMap[d].totalOoc += row.count;
            dailyMap[d].c20 += row.c20;
            dailyMap[d].c40 += row.c40;
            dailyMap[d].lcl += row.lcl;
            dailyMap[d].air += row.air;
            dailyMap[d].teus += (row.c20 + row.c40 * 2);

            if (row._id.branch) {
                dailyMap[d].branches[row._id.branch] = (dailyMap[d].branches[row._id.branch] || 0) + row.count;
            }
            if (row._id.exporter) {
                dailyMap[d].customers[row._id.exporter] = (dailyMap[d].customers[row._id.exporter] || 0) + row.count;
            }
        });

        const dailyDataArray = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

        // Format Monthly Summary for Heatmap / Trend Matrix
        const monthlyCustomerMap = {};
        (monthlyRes || []).forEach(row => {
            const exp = row._id.exporter || 'Unknown';
            const m = row._id.month;
            if (!monthlyCustomerMap[exp]) {
                monthlyCustomerMap[exp] = { customer: exp, months: {}, total: 0 };
            }
            monthlyCustomerMap[exp].months[m] = row.count;
            monthlyCustomerMap[exp].total += row.count;
        });

        const customerMonthlySummary = Object.values(monthlyCustomerMap).sort((a, b) => b.total - a.total);

        // Exceptions Breakdown for Export: ONLY LEO Missing as requested
        const exceptionsList = (leoMissingRes || []).map(x => ({
            ...x,
            isLeoMissing: true
        }));
        const exceptionsSummary = {
            total: exceptionsList.length,
            leoMissing: exceptionsList.length
        };

        res.json({
            success: true,
            totalCreated: totalLeoCount,
            totalOoc: totalLeoCount,
            totalLeo: totalLeoCount,
            totalTeus,
            stats: totalStats,
            prevStats: {
                totalOoc: prevTotalJobs,
                totalLeo: prevTotalJobs,
                avgDaily: Math.round(prevAvgDaily * 10) / 10,
                branchMap: prevBranchMap,
                diffDays: prevDiffDays
            },
            branchWise,
            dailyData: dailyDataArray,
            customerWise: customerList,
            customerGainers,
            customerFallers,
            customerMonthlySummary,
            exceptionsSummary,
            exceptionsList,
            detailedJobs: currentData.detailedJobs || [],
            dateRange: {
                start: start.toISOString(),
                end: end.toISOString(),
                prevStart: prevStart.toISOString(),
                prevEnd: prevEnd.toISOString(),
                diffDays
            }
        });
    } catch (error) {
        console.error("Error in /export-leo-summaries:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

export default router;
