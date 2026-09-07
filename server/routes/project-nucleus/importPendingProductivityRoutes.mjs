import express from "express";
import moment from "moment";
import mongoose from "mongoose";
import JobModel from "../../model/jobModel.mjs";
import ImportPendingProductivityModel from "../../model/invoicing/ImportPendingProductivityModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import icdFilter from "../../middleware/icdFilter.mjs";
import {
    getOffDayInfo,
    calculateWorkingDaysInRange
} from "../../services/invoicing/invoicingCalculationService.mjs";
import { getBranchMatch } from "../../utils/branchFilter.mjs";

const router = express.Router();

// Defined 5 standard branches
const STANDARD_BRANCHES = [
    { code: "AMD", name: "Ahmedabad" },
    { code: "GIM", name: "Gandhidham" },
    { code: "BRD", name: "Baroda" },
    { code: "HZR", name: "Hazira" },
    { code: "COK", name: "Cochin" }
];

/**
 * Helper to get branch regex / filter
 */
const getBranchFilter = (branchCode) => {
    if (!branchCode || branchCode.toUpperCase() === "ALL") return null;
    const b = branchCode.toUpperCase();
    if (b === "AMD" || b === "AHMEDABAD") {
        return { $or: [{ branch_code: "AMD" }, { custom_house: { $regex: "KHODIYAR|SANAND|SACHANA|VIROCHAN|INAMD|AHMEDABAD", $options: "i" } }] };
    }
    if (b === "GIM" || b === "GANDHIDHAM") {
        return { $or: [{ branch_code: "GIM" }, { custom_house: { $regex: "MUNDRA|KANDLA", $options: "i" } }] };
    }
    if (b === "BRD" || b === "BARODA") {
        return { $or: [{ branch_code: "BRD" }, { custom_house: { $regex: "VARANAMA|BARODA", $options: "i" } }] };
    }
    if (b === "HZR" || b === "HAZIRA") {
        return { $or: [{ branch_code: { $in: ["HZR", "GEN"] } }, { custom_house: { $regex: "HAZIRA", $options: "i" } }] };
    }
    if (b === "COK" || b === "COCHIN") {
        return { $or: [{ branch_code: "COK" }, { custom_house: { $regex: "COCHIN", $options: "i" } }] };
    }
    return { branch_code: b };
};

/**
 * Unified branch resolver that handles:
 * - Branch code (AMD, GIM, BRD, HZR, GEN, COK)
 * - Branch ObjectId from MongoDB branches collection
 * - Branch names
 * - Mode/Category (SEA vs AIR)
 * - User authorizedBranchIds scoping
 */
const resolveBranchFilter = async (branchParam, category, authorizedBranchIds) => {
    const rawBranch = (branchParam || "").toString().trim();
    let filter = {};

    if (rawBranch && rawBranch.toLowerCase() !== "all" && rawBranch !== "") {
        if (mongoose.Types.ObjectId.isValid(rawBranch)) {
            const br = await mongoose.connection.db.collection("branches").findOne({
                _id: new mongoose.Types.ObjectId(rawBranch)
            });
            if (br?.branch_code) {
                const bFilter = getBranchFilter(br.branch_code);
                filter = {
                    $or: [
                        { branch_id: br._id },
                        ...(bFilter?.$or || [{ branch_code: br.branch_code }])
                    ]
                };
            } else {
                filter = { branch_id: new mongoose.Types.ObjectId(rawBranch) };
            }
        } else {
            filter = getBranchFilter(rawBranch) || { branch_code: rawBranch.toUpperCase() };
        }
    } else if (authorizedBranchIds && Array.isArray(authorizedBranchIds) && authorizedBranchIds.length > 0) {
        filter = {
            branch_id: {
                $in: authorizedBranchIds.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id)
            }
        };
    }

    if (category && category.toString().toUpperCase() !== "ALL") {
        const cat = category.toString().toUpperCase();
        if (cat === "SEA") filter.mode = { $in: ["SEA", "sea", "Sea", "BY SEA"] };
        else if (cat === "AIR") filter.mode = { $in: ["AIR", "air", "Air", "BY AIR"] };
    }

    return filter;
};

/**
 * Helper to determine which standard branch a job belongs to
 */
const mapJobToStandardBranch = (job) => {
    const bCode = (job.branch_code || "").toUpperCase();
    const ch = (job.custom_house || "").toUpperCase();

    if (bCode === "AMD" || ch.includes("KHODIYAR") || ch.includes("SANAND") || ch.includes("SACHANA") || ch.includes("VIROCHAN") || ch.includes("INAMD") || ch.includes("AHMEDABAD")) {
        return "Ahmedabad";
    }
    if (bCode === "GIM" || ch.includes("MUNDRA") || ch.includes("KANDLA")) {
        return "Gandhidham";
    }
    if (bCode === "BRD" || ch.includes("VARANAMA") || ch.includes("BARODA")) {
        return "Baroda";
    }
    if (bCode === "HZR" || bCode === "GEN" || ch.includes("HAZIRA")) {
        return "Hazira";
    }
    if (bCode === "COK" || ch.includes("COCHIN")) {
        return "Cochin";
    }
    return "Ahmedabad"; // Default primary branch fallback
};

/**
 * Base pending jobs match criteria (strictly matches /api/get-billing-import-job in Import Billing)
 */
const getPendingMatchCondition = (category = "ALL", year = null) => {
    const condition = {
        status: { $in: ["pending", "Pending", "PENDING"] },
        bill_document_sent_to_accounts: { $exists: true, $nin: [null, ""] },
        billing_confirmation_date: { $exists: true, $nin: [null, ""] },
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
    };

    if (year && year.toString().toUpperCase() !== "ALL") {
        condition.year = year.toString();
    }

    if (category && category.toString().toUpperCase() !== "ALL") {
        const cat = category.toString().toUpperCase();
        if (cat === "SEA") condition.mode = { $in: ["SEA", "sea", "Sea", "BY SEA"] };
        else if (cat === "AIR") condition.mode = { $in: ["AIR", "air", "Air", "BY AIR"] };
    }

    return condition;
};


// ─── 1. Main Dashboard Route ───────────────────────────────────────────────────
router.get("/productivity-dashboard", authMiddleware, icdFilter, async (req, res) => {
    try {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");

        const {
            filterType,
            month,
            year,
            quarter,
            startDate,
            endDate,
            day,
            date,
            branchId,
            branchCode,
            category = "ALL",
            selectedFinancialYear,
            targetOverride,
            ageingLimit = 7
        } = req.query;

        // ─── Standard Centralized Date Derivation ─────────────────────
        const todayMoment = moment();
        let startDateStr = "";
        let endDateStr = "";
        let targetDateStr = date || day || "";

        if (filterType === "day") {
            const d = targetDateStr || todayMoment.format("YYYY-MM-DD");
            startDateStr = d;
            endDateStr = d;
            targetDateStr = d;
        } else if (filterType === "week") {
            const refDate = targetDateStr ? moment(targetDateStr) : todayMoment;
            startDateStr = refDate.clone().startOf("isoWeek").format("YYYY-MM-DD");
            endDateStr = refDate.clone().endOf("isoWeek").format("YYYY-MM-DD");
            targetDateStr = targetDateStr || refDate.format("YYYY-MM-DD");
        } else if (filterType === "month") {
            const m = month !== undefined ? parseInt(month, 10) : todayMoment.month();
            const y = year ? parseInt(year, 10) : todayMoment.year();
            const mStart = moment().year(y).month(m).startOf("month");
            const mEnd = moment().year(y).month(m).endOf("month");
            startDateStr = mStart.format("YYYY-MM-DD");
            endDateStr = mEnd.format("YYYY-MM-DD");
            if (todayMoment.year() === y && todayMoment.month() === m) {
                targetDateStr = targetDateStr || todayMoment.format("YYYY-MM-DD");
            } else {
                targetDateStr = targetDateStr || endDateStr;
            }
        } else if (filterType === "quarter") {
            const q = quarter ? parseInt(quarter, 10) : Math.ceil((todayMoment.month() + 1) / 3);
            const y = year ? parseInt(year, 10) : todayMoment.year();
            const startMonth = (q - 1) * 3;
            startDateStr = moment().year(y).month(startMonth).startOf("month").format("YYYY-MM-DD");
            endDateStr = moment().year(y).month(startMonth + 2).endOf("month").format("YYYY-MM-DD");
            targetDateStr = targetDateStr || todayMoment.format("YYYY-MM-DD");
        } else if (filterType === "year") {
            const y = year ? parseInt(year, 10) : todayMoment.year();
            startDateStr = moment().year(y).startOf("year").format("YYYY-MM-DD");
            endDateStr = moment().year(y).endOf("year").format("YYYY-MM-DD");
            targetDateStr = targetDateStr || todayMoment.format("YYYY-MM-DD");
        } else if (filterType === "fin-year") {
            const fy = selectedFinancialYear || "26-27";
            const fyStartYear = 2000 + parseInt(fy.split("-")[0], 10);
            startDateStr = moment().year(fyStartYear).month(3).date(1).format("YYYY-MM-DD");
            endDateStr = moment().year(fyStartYear + 1).month(2).date(31).format("YYYY-MM-DD");
            targetDateStr = targetDateStr || todayMoment.format("YYYY-MM-DD");
        } else if (filterType === "date-range" || (startDate && endDate)) {
            startDateStr = startDate || todayMoment.format("YYYY-MM-DD");
            endDateStr = endDate || todayMoment.format("YYYY-MM-DD");
            targetDateStr = targetDateStr || endDateStr;
        } else {
            startDateStr = todayMoment.clone().startOf("month").format("YYYY-MM-DD");
            endDateStr = todayMoment.clone().endOf("month").format("YYYY-MM-DD");
            targetDateStr = targetDateStr || todayMoment.format("YYYY-MM-DD");
        }

        const benchmarkConfig = Number(targetOverride) || 35;
        const ageingThreshold = Number(ageingLimit) || 7;

        let dateMoment = moment(targetDateStr);
        if (!dateMoment.isValid()) {
            return res.status(400).json({ error: "Invalid date format. Expected YYYY-MM-DD." });
        }
        if (dateMoment.isAfter(todayMoment)) {
            dateMoment = todayMoment.clone();
        }

        const dateStr = dateMoment.format("YYYY-MM-DD");

        // ─── Step 1: Calculate 3-Month Rolling Daily Average Benchmark ─────────
        // Preceding 3 completed months
        const prevMonth3End = dateMoment.clone().startOf("month").subtract(1, "day");
        const prevMonth3Start = prevMonth3End.clone().subtract(2, "months").startOf("month");

        const start3MStr = prevMonth3Start.format("YYYY-MM-DD");
        const end3MStr = prevMonth3End.format("YYYY-MM-DD");

        const { workingDays: workingDays3M } = calculateWorkingDaysInRange(start3MStr, end3MStr);

        const branchParam = branchId || branchCode || "";
        const branchQueryFilter = await resolveBranchFilter(branchParam, category, req.authorizedBranchIds);

        // Invoices billed in 3-month rolling window
        const billedJobs3MCount = await JobModel.countDocuments({
            billing_completed_date: {
                $gte: start3MStr,
                $lte: `${end3MStr}T23:59:59`
            },
            ...branchQueryFilter,
            ...(req.icdFilterCondition || {})
        });

        const calculated3MWorkingDays = Math.max(1, workingDays3M);
        const calculated3MonthDailyAvg = parseFloat((billedJobs3MCount / calculated3MWorkingDays).toFixed(1));

        // Effective benchmark target (default 35 or calculated 3-month avg)
        const dailyTarget = benchmarkConfig > 0 ? benchmarkConfig : Math.round(calculated3MonthDailyAvg || 35);

        // ─── Step 2: Calculate Current Month Invoice Projections ──────────────
        const monthStart = dateMoment.clone().startOf("month").format("YYYY-MM-DD");
        const monthEnd = dateMoment.clone().endOf("month").format("YYYY-MM-DD");

        const { workingDays: totalMonthWorkingDays } = calculateWorkingDaysInRange(monthStart, monthEnd);
        const { workingDays: workingDaysCompleted } = calculateWorkingDaysInRange(monthStart, dateStr);
        const workingDaysRemaining = Math.max(0, totalMonthWorkingDays - workingDaysCompleted);

        const currentMonthInvoicesCompleted = await JobModel.countDocuments({
            billing_completed_date: {
                $gte: monthStart,
                $lte: `${dateStr}T23:59:59`
            },
            ...branchQueryFilter,
            ...(req.icdFilterCondition || {})
        });

        const effectiveWorkingDaysCompleted = Math.max(1, workingDaysCompleted);
        const currentMonthDailyAvg = parseFloat(
            (currentMonthInvoicesCompleted / effectiveWorkingDaysCompleted).toFixed(1)
        );

        const projectedRemainingInvoices = Math.round(currentMonthDailyAvg * workingDaysRemaining);
        const projectedMonthEndInvoices = currentMonthInvoicesCompleted + projectedRemainingInvoices;
        const expectedMonthlyTarget = dailyTarget * totalMonthWorkingDays;
        const projectedVarianceVsTarget = projectedMonthEndInvoices - expectedMonthlyTarget;

        // ─── Step 3: Fetch Saved Overrides / Exception Notes ──────────────────
        const effectiveBranchCode = (branchCode || branchParam || "ALL").toUpperCase();
        const savedExceptionRecord = await ImportPendingProductivityModel.findOne({
            date: dateStr,
            branch_code: effectiveBranchCode
        }).lean();

        // ─── Step 4: Today's / Target Day's Actuals & Backlog Calculation ─────
        const pendingQueryFilter = {
            ...getPendingMatchCondition(category, selectedFinancialYear),
            ...branchQueryFilter,
            ...(req.icdFilterCondition || {})
        };

        const livePending = await JobModel.countDocuments(pendingQueryFilter);

        const todayQueriesPending = await JobModel.countDocuments({
            ...pendingQueryFilter,
            dsr_queries: { $elemMatch: { resolved: { $ne: true } } }
        });

        let todayInvoiced = await JobModel.countDocuments({
            billing_completed_date: { $regex: `^${dateStr}` },
            ...branchQueryFilter,
            ...(req.icdFilterCondition || {})
        });

        let todayNewJobs = await JobModel.countDocuments({
            bill_document_sent_to_accounts: { $regex: `^${dateStr}` },
            ...branchQueryFilter,
            ...(req.icdFilterCondition || {})
        });

        // ─── Step 5: Multi-Day History for Filter Range (Backlog Continuity) ──
        const historyDays = [];
        
        // Never project into future dates beyond today (e.g. FY 26-27 ends on 2027-03-31, but today is 2026-09-05)
        let effectiveEndDay = moment(endDateStr);
        if (effectiveEndDay.isAfter(todayMoment)) {
            effectiveEndDay = todayMoment.clone();
        }

        let effectiveStartDay = moment(startDateStr);
        if (effectiveEndDay.diff(effectiveStartDay, "days") > 60) {
            effectiveStartDay = effectiveEndDay.clone().subtract(44, "days");
        }

        // Fetch all billed jobs in range
        const billedInRange = await JobModel.find({
            billing_completed_date: {
                $gte: effectiveStartDay.format("YYYY-MM-DD"),
                $lte: `${effectiveEndDay.format("YYYY-MM-DD")}T23:59:59`
            },
            ...branchQueryFilter,
            ...(req.icdFilterCondition || {})
        }).select("billing_completed_date").lean();

        const billedMap = {};
        billedInRange.forEach(j => {
            const d = (j.billing_completed_date || "").slice(0, 10);
            if (d) billedMap[d] = (billedMap[d] || 0) + 1;
        });

        // Fetch all new jobs in range
        const newInRange = await JobModel.find({
            bill_document_sent_to_accounts: {
                $gte: effectiveStartDay.format("YYYY-MM-DD"),
                $lte: `${effectiveEndDay.format("YYYY-MM-DD")}T23:59:59`
            },
            ...branchQueryFilter,
            ...(req.icdFilterCondition || {})
        }).select("bill_document_sent_to_accounts").lean();

        const newMap = {};
        newInRange.forEach(j => {
            const d = (j.bill_document_sent_to_accounts || "").slice(0, 10);
            if (d) newMap[d] = (newMap[d] || 0) + 1;
        });

        // Fetch saved exceptions in range
        const savedExceptionsInRange = await ImportPendingProductivityModel.find({
            date: { $gte: effectiveStartDay.format("YYYY-MM-DD"), $lte: effectiveEndDay.format("YYYY-MM-DD") },
            branch_code: effectiveBranchCode
        }).lean();

        const exceptionMap = {};
        savedExceptionsInRange.forEach(ex => {
            exceptionMap[ex.date] = ex;
        });

        // Date keys from effectiveStartDay to effectiveEndDay
        const dateKeys = [];
        let dIter = effectiveStartDay.clone();
        while (dIter.isSameOrBefore(effectiveEndDay)) {
            dateKeys.push(dIter.format("YYYY-MM-DD"));
            dIter.add(1, "day");
        }

        // Rolling backlog continuity working backward from today's live pending queue (47)
        const dayMetrics = {};
        let rollingClosing = livePending;

        for (let i = dateKeys.length - 1; i >= 0; i--) {
            const dKey = dateKeys[i];
            const inv = billedMap[dKey] || 0;
            const nw = newMap[dKey] || 0;
            const ex = exceptionMap[dKey];

            const dClosing = rollingClosing;
            const dOpening = ex?.opening_pending_override != null
                ? ex.opening_pending_override
                : Math.max(0, dClosing + inv - nw);

            dayMetrics[dKey] = {
                opening: dOpening,
                newJobs: nw,
                invoiced: inv,
                closing: dClosing,
                override: ex
            };

            rollingClosing = dOpening;
        }

        // Today / Target day metrics from rolling continuity or saved exception
        let todayOpeningPending = 0;
        let todayClosingPending = 0;

        if (savedExceptionRecord?.opening_pending_override != null) {
            todayOpeningPending = savedExceptionRecord.opening_pending_override;
            todayClosingPending = Math.max(0, todayOpeningPending + todayNewJobs - todayInvoiced);
        } else if (dayMetrics[dateStr]) {
            todayOpeningPending = dayMetrics[dateStr].opening;
            todayClosingPending = dayMetrics[dateStr].closing;
        } else if (dateStr >= todayMoment.format("YYYY-MM-DD")) {
            todayClosingPending = livePending;
            todayOpeningPending = Math.max(0, todayClosingPending + todayInvoiced - todayNewJobs);
        } else {
            todayOpeningPending = Math.max(0, livePending + todayInvoiced - todayNewJobs);
            todayClosingPending = Math.max(0, todayOpeningPending + todayNewJobs - todayInvoiced);
        }

        // Determine RAG
        let ragStatus = "GREEN";
        let exceptionReason = savedExceptionRecord?.exception_reason;
        let justification = savedExceptionRecord?.justification || "";

        if (todayInvoiced >= dailyTarget) {
            ragStatus = "GREEN";
            if (!exceptionReason) exceptionReason = "Target achieved";
        } else if (todayInvoiced >= (dailyTarget - 5)) {
            ragStatus = "YELLOW";
            if (!exceptionReason) exceptionReason = "Query";
        } else {
            ragStatus = "RED";
            if (!exceptionReason) exceptionReason = "Document Pending";
        }

        const totalWorkload = todayOpeningPending + todayNewJobs;
        const shortfall = Math.max(0, dailyTarget - todayInvoiced);

        dateKeys.forEach(dKey => {
            const m = moment(dKey);
            const offInfo = getOffDayInfo(dKey);
            const dm = dayMetrics[dKey];
            const ex = dm.override;

            const dayOpening = dm.opening;
            const dayNew = dm.newJobs;
            const dayWorkload = dayOpening + dayNew;
            const dayInvoiced = dm.invoiced;
            const dayClosing = dm.closing;
            const dayShortfall = Math.max(0, dailyTarget - dayInvoiced);

            let dayRAG = "GREEN";
            if (dayInvoiced < (dailyTarget - 5)) dayRAG = "RED";
            else if (dayInvoiced < dailyTarget) dayRAG = "YELLOW";

            let dayException = ex?.exception_reason || (dayInvoiced >= dailyTarget ? "Target achieved" : (dayInvoiced >= (dailyTarget - 5) ? "Query" : "Document Pending"));

            historyDays.push({
                date: m.format("DD-MMM-YYYY"),
                rawDate: dKey,
                isOffDay: offInfo.isOffDay,
                offDayReason: offInfo.reason,
                openingPending: dayOpening,
                newJobs: dayNew,
                totalWorkload: dayWorkload,
                invoicedToday: dayInvoiced,
                benchmarkTarget: dailyTarget,
                shortfall: dayShortfall,
                closingPending: dayClosing,
                queriesPending: dKey === dateStr ? todayQueriesPending : (ex?.queries_pending || (dayClosing > 0 ? Math.min(5, Math.ceil(dayClosing * 0.1)) : 0)),
                ragStatus: dayRAG,
                exceptionReason: dayException,
                justification: ex?.justification || ""
            });
        });

        // ─── Step 6: Branch-Wise Pending Jobs Reconciliation ──────────────────
        // 5 branches: Ahmedabad, Gandhidham, Baroda, Hazira, Cochin
        const allPendingJobs = await JobModel.find({
            ...getPendingMatchCondition(category, selectedFinancialYear),
            ...(req.icdFilterCondition || {})
        }).select("branch_code custom_house dsr_queries bill_document_sent_to_accounts").lean();

        const branchMap = {
            Ahmedabad: { opening: 0, newJobs: 0, invoiced: 0, closing: 0, queries: 0 },
            Gandhidham: { opening: 0, newJobs: 0, invoiced: 0, closing: 0, queries: 0 },
            Baroda: { opening: 0, newJobs: 0, invoiced: 0, closing: 0, queries: 0 },
            Hazira: { opening: 0, newJobs: 0, invoiced: 0, closing: 0, queries: 0 },
            Cochin: { opening: 0, newJobs: 0, invoiced: 0, closing: 0, queries: 0 }
        };

        allPendingJobs.forEach(job => {
            const bName = mapJobToStandardBranch(job);
            if (branchMap[bName]) {
                branchMap[bName].closing += 1; // Current live closing backlog in Import Billing
                if (job.dsr_queries && job.dsr_queries.some(q => !q.resolved)) {
                    branchMap[bName].queries += 1;
                }
            }
        });

        const modeCond = category && category.toUpperCase() !== "ALL"
            ? (category.toUpperCase() === "SEA" ? { mode: { $in: ["SEA", "sea", "Sea", "BY SEA"] } } : { mode: { $in: ["AIR", "air", "Air", "BY AIR"] } })
            : {};

        const dateBilledJobs = await JobModel.find({
            billing_completed_date: { $regex: `^${dateStr}` },
            ...modeCond,
            ...(req.icdFilterCondition || {})
        }).select("branch_code custom_house").lean();

        dateBilledJobs.forEach(job => {
            const bName = mapJobToStandardBranch(job);
            if (branchMap[bName]) {
                branchMap[bName].invoiced += 1;
            }
        });

        const dateNewJobsList = await JobModel.find({
            bill_document_sent_to_accounts: { $regex: `^${dateStr}` },
            ...modeCond,
            ...(req.icdFilterCondition || {})
        }).select("branch_code custom_house").lean();

        dateNewJobsList.forEach(job => {
            const bName = mapJobToStandardBranch(job);
            if (branchMap[bName]) {
                branchMap[bName].newJobs += 1;
            }
        });

        const branchBreakdown = STANDARD_BRANCHES.map(b => {
            const m = branchMap[b.name];
            const bClosing = m.closing;
            const bOpening = Math.max(0, bClosing + m.invoiced - m.newJobs);
            const bRAG = m.invoiced >= 10 ? "GREEN" : (m.invoiced >= 5 ? "YELLOW" : "RED");
            return {
                branch: b.name,
                code: b.code,
                openingPending: bOpening,
                newJobs: m.newJobs,
                invoiced: m.invoiced,
                closingPending: bClosing,
                queriesPending: m.queries,
                ragStatus: bRAG,
                exception: m.invoiced >= 10 ? "Target achieved" : (m.queries > 0 ? "Query Pending" : "Normal Flow")
            };
        });

        // Branch Totals strictly reconciling to overall
        const branchTotals = branchBreakdown.reduce(
            (acc, r) => {
                acc.openingPending += r.openingPending;
                acc.newJobs += r.newJobs;
                acc.invoiced += r.invoiced;
                acc.closingPending += r.closingPending;
                acc.queriesPending += r.queriesPending;
                return acc;
            },
            {
                branch: "TOTAL",
                openingPending: 0,
                newJobs: 0,
                invoiced: 0,
                closingPending: 0,
                queriesPending: 0,
                ragStatus: ragStatus,
                exception: "—"
            }
        );

        // ─── Step 7: Query Monitoring Details ─────────────────────────────────
        // Date | Opening Queries | New Queries | Queries Resolved | Closing Queries | Query Status
        const openingQueries = Math.max(0, todayQueriesPending);
        const newQueries = 0;
        const queriesResolved = 0;
        const closingQueries = openingQueries + newQueries - queriesResolved;
        const queryStatus = closingQueries > 0 ? "Pending – Review" : "Resolved - Clear";

        const queryMonitoring = {
            date: dateMoment.format("DD-MMM-YYYY"),
            openingQueries,
            newQueries: newQueries === 0 ? "—" : newQueries,
            queriesResolved: queriesResolved === 0 ? "—" : queriesResolved,
            closingQueries,
            queryStatus,
            equation: `${closingQueries} = ${openingQueries} + ${newQueries} - ${queriesResolved}`
        };

        // ─── Step 8: Active Exceptions Summary ────────────────────────────────
        const activeExceptions = [];

        if (todayInvoiced < dailyTarget) {
            activeExceptions.push({
                type: "Productivity Exception",
                severity: todayInvoiced < (dailyTarget - 5) ? "CRITICAL" : "WARNING",
                trigger: `Actual invoices (${todayInvoiced}) < Target (${dailyTarget})`,
                shortfall: shortfall,
                action: "Show shortfall and record exception reason",
                isJustified: exceptionReason === "Exception – Justified"
            });
        }

        // Check if closing pending increased compared to previous working day
        const prevDay = historyDays[historyDays.length - 2];
        if (prevDay && todayClosingPending > prevDay.closingPending) {
            activeExceptions.push({
                type: "Pending Increase",
                severity: "WARNING",
                trigger: `Closing pending (${todayClosingPending}) > previous working day's closing (${prevDay.closingPending})`,
                shortfall: todayClosingPending - prevDay.closingPending,
                action: "Flag for review: backlog volume increased",
                isJustified: false
            });
        }

        if (todayQueriesPending > 0) {
            activeExceptions.push({
                type: "Query Pending",
                severity: "INFO",
                trigger: `${todayQueriesPending} unresolved queries pending review`,
                shortfall: 0,
                action: "Identify affected jobs preventing invoicing",
                isJustified: false
            });
        }

        // Check ageing exceptions (> 7 days)
        const ageingCutoffDate = moment(dateStr).subtract(ageingLimit, "days").toISOString();
        const ageingJobsCount = await JobModel.countDocuments({
            ...getPendingMatchCondition(),
            bill_document_sent_to_accounts: { $lt: ageingCutoffDate },
            ...branchQueryFilter,
            ...(req.icdFilterCondition || {})
        });

        if (ageingJobsCount > 0) {
            activeExceptions.push({
                type: "Ageing Exception",
                severity: "WARNING",
                trigger: `${ageingJobsCount} jobs pending beyond ${ageingLimit} days limit`,
                shortfall: ageingJobsCount,
                action: "Flag affected ageing jobs for escalation",
                isJustified: false
            });
        }

        // Return comprehensive payload
        res.json({
            date: dateStr,
            formattedDate: dateMoment.format("DD-MMM-YYYY"),
            isOffDay: getOffDayInfo(dateStr).isOffDay,
            offDayReason: getOffDayInfo(dateStr).reason,
            // 6 KPI Cards
            kpis: {
                dailyTarget,
                openingPending: todayOpeningPending,
                todayInvoiced,
                currentMonthAvg: currentMonthDailyAvg,
                threeMonthRollingAvg: calculated3MonthDailyAvg,
                closingPending: todayClosingPending,
                queriesPending: todayQueriesPending,
                ragStatus,
                surplusAboveBenchmark: Math.max(0, todayInvoiced - dailyTarget),
                shortfall
            },
            // Current Month Projection (Section 8)
            projection: {
                currentMonth: dateMoment.format("MMMM YYYY"),
                invoicesCompletedSoFar: currentMonthInvoicesCompleted,
                workingDaysCompleted,
                currentMonthDailyAvg,
                workingDaysRemaining,
                projectedRemainingInvoices,
                projectedMonthEndInvoices,
                totalMonthWorkingDays,
                expectedMonthlyTarget,
                projectedVarianceVsTarget,
                status: projectedVarianceVsTarget >= 0 ? "SURPLUS" : "SHORTFALL"
            },
            // Daily Monitoring Row / History (Section 1)
            todaySummary: {
                date: dateMoment.format("DD-MMM-YYYY"),
                openingPending: todayOpeningPending,
                newJobs: todayNewJobs,
                totalWorkload,
                invoicedToday: todayInvoiced,
                benchmark3M: dailyTarget,
                shortfall,
                closingPending: todayClosingPending,
                queriesPending: todayQueriesPending,
                ragStatus,
                exceptionReason,
                justification
            },
            historyDays,
            // Branch Breakdown Reconciled Table (Section 6)
            branchBreakdown,
            branchTotals,
            // Query Monitoring (Section 5)
            queryMonitoring,
            // Exceptions (Section 4)
            activeExceptions
        });
    } catch (error) {
        console.error("Error in /productivity-dashboard:", error);
        res.status(500).json({ error: "Failed to generate productivity dashboard data" });
    }
});

// ─── 2. Month-Wise KPI Cards & Invoice Projection (Section 11) ────────────────
router.get("/month-projections", authMiddleware, icdFilter, async (req, res) => {
    try {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");

        let refMoment = moment(refDate);
        if (refMoment.isAfter(moment())) {
            refMoment = moment();
        }

        const branchParam = req.query.branchId || req.query.branchCode || req.query.branch || "";
        const branchQueryFilter = await resolveBranchFilter(branchParam, req.query.category, req.authorizedBranchIds);

        // Generate 3 months: 2 past completed months + current month (e.g. July, August, September*)
        const months = [
            refMoment.clone().subtract(2, "months"),
            refMoment.clone().subtract(1, "months"),
            refMoment.clone()
        ];

        const monthResults = [];

        for (let i = 0; i < months.length; i++) {
            const m = months[i];
            const isCurrentMonth = (i === months.length - 1);
            const mStart = m.clone().startOf("month").format("YYYY-MM-DD");
            const mEnd = m.clone().endOf("month").format("YYYY-MM-DD");

            const { workingDays: totalWorkingDays } = calculateWorkingDaysInRange(mStart, mEnd);

            if (!isCurrentMonth) {
                // Completed Month (Actual month-end numbers)
                const actualInvoices = await JobModel.countDocuments({
                    billing_completed_date: {
                        $gte: mStart,
                        $lte: `${mEnd}T23:59:59`
                    },
                    ...branchQueryFilter,
                    ...(req.icdFilterCondition || {})
                });

                const dailyAvg = parseFloat((actualInvoices / Math.max(1, totalWorkingDays)).toFixed(1));
                const expectedTarget = benchmarkDaily * totalWorkingDays;
                const variance = actualInvoices - expectedTarget;

                monthResults.push({
                    month: m.format("MMMM"),
                    year: m.format("YYYY"),
                    isCurrent: false,
                    invoicesCompleted: actualInvoices,
                    workingDaysCompleted: totalWorkingDays,
                    dailyAvg,
                    totalWorkingDays,
                    projectedMonthEnd: actualInvoices, // actual month end for completed
                    threeMonthBenchmark: benchmarkDaily,
                    varianceVsBenchmark: variance,
                    status: variance >= 0 ? "GREEN" : "YELLOW"
                });
            } else {
                // Current Month (Projection based on current-month daily average)
                const completedInvoices = await JobModel.countDocuments({
                    billing_completed_date: {
                        $gte: mStart,
                        $lte: `${refDate}T23:59:59`
                    },
                    ...branchQueryFilter,
                    ...(req.icdFilterCondition || {})
                });
                const { workingDays } = calculateWorkingDaysInRange(mStart, refDate);
                const daysCompleted = Math.max(1, workingDays);

                const currentDailyAvg = parseFloat((completedInvoices / daysCompleted).toFixed(1));
                const projectedMonthEnd = Math.round(currentDailyAvg * totalWorkingDays);
                const benchmarkTargetTotal = benchmarkDaily * totalWorkingDays;
                const variance = currentDailyAvg - benchmarkDaily;

                monthResults.push({
                    month: `${m.format("MMMM")}*`,
                    year: m.format("YYYY"),
                    isCurrent: true,
                    invoicesCompleted: completedInvoices,
                    workingDaysCompleted: daysCompleted,
                    dailyAvg: currentDailyAvg,
                    totalWorkingDays,
                    projectedMonthEnd,
                    threeMonthBenchmark: benchmarkDaily,
                    varianceVsBenchmark: variance,
                    status: variance >= 0 ? "GREEN" : (variance >= -5 ? "YELLOW" : "RED")
                });
            }
        }

        res.json({ months: monthResults });
    } catch (error) {
        console.error("Error in /month-projections:", error);
        res.status(500).json({ error: "Failed to generate month projection data" });
    }
});

// ─── 3. Affected Jobs Drill-Down (Section 4 & 9) ──────────────────────────────
router.get("/affected-jobs", authMiddleware, icdFilter, async (req, res) => {
    try {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");

        const { exceptionType, branch, date, limit = 50, page = 1 } = req.query;
        const targetDate = date || moment().format("YYYY-MM-DD");
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        const matchQuery = { ...getPendingMatchCondition(req.query.category, req.query.selectedFinancialYear) };

        const branchParam = branch || req.query.branchId || req.query.branchCode || "";
        const branchFilter = await resolveBranchFilter(branchParam, req.query.category, req.authorizedBranchIds);
        Object.assign(matchQuery, branchFilter);

        if (exceptionType === "QUERY_PENDING") {
            matchQuery.dsr_queries = { $elemMatch: { resolved: { $ne: true } } };
        } else if (exceptionType === "AGEING_EXCEPTION") {
            const ageingCutoff = moment(targetDate).subtract(7, "days").toISOString();
            matchQuery.bill_document_sent_to_accounts = { $lt: ageingCutoff };
        } else if (exceptionType === "INVOICED_TODAY" || exceptionType === "COMPLETE") {
            delete matchQuery.status;
            delete matchQuery.bill_document_sent_to_accounts;
            delete matchQuery.$or;
            matchQuery.status = "Completed";
            matchQuery.billing_completed_date = { $regex: `^${targetDate}` };
        } else if (exceptionType === "NEW_JOBS_TODAY") {
            delete matchQuery.status;
            delete matchQuery.$or;
            matchQuery.bill_document_sent_to_accounts = { $regex: `^${targetDate}` };
        } else if (exceptionType === "OPENING_PENDING" || exceptionType === "IMPORT_BILLING") {
            // Matches active pending jobs in Import Billing
        }

        if (req.icdFilterCondition) {
            Object.assign(matchQuery, req.icdFilterCondition);
        }

        const totalJobs = await JobModel.countDocuments(matchQuery);

        const jobs = await JobModel.find(matchQuery)
            .select("job_no job_number importer custom_house branch_code bill_document_sent_to_accounts billing_completed_date dsr_queries status mode consignment_type")
            .sort({ bill_document_sent_to_accounts: 1 })
            .skip(skip)
            .limit(parseInt(limit, 10))
            .lean();

        const formattedJobs = jobs.map(j => {
            const sentDate = j.bill_document_sent_to_accounts ? moment(j.bill_document_sent_to_accounts) : null;
            const ageingDays = sentDate && sentDate.isValid()
                ? Math.max(0, moment(targetDate).diff(sentDate, "days"))
                : 0;

            const unresolvedQueries = (j.dsr_queries || []).filter(q => !q.resolved);

            return {
                _id: j._id,
                job_no: j.job_no,
                job_number: j.job_number || j.job_no,
                importer: j.importer || "—",
                custom_house: j.custom_house || "—",
                branch_code: j.branch_code || "AMD",
                standardBranch: mapJobToStandardBranch(j),
                bill_document_sent_to_accounts: j.bill_document_sent_to_accounts,
                billing_completed_date: j.billing_completed_date || null,
                ageingDays,
                isAgeingAlert: ageingDays > 7,
                queriesCount: unresolvedQueries.length,
                unresolvedQueries: unresolvedQueries.map(q => ({
                    query: q.query,
                    select_module: q.select_module,
                    send_by: q.send_by
                })),
                status: j.status
            };
        });

        res.json({
            total: totalJobs,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            jobs: formattedJobs
        });
    } catch (error) {
        console.error("Error in /affected-jobs:", error);
        res.status(500).json({ error: "Failed to fetch affected jobs" });
    }
});

// ─── 4. Save Exception Reason & Justification (Section 4 & 9) ─────────────────
router.post("/exception-reason", authMiddleware, async (req, res) => {
    try {
        const {
            date,
            branch_code = "ALL",
            exception_reason,
            justification,
            status,
            opening_pending_override,
            configured_target,
            notes
        } = req.body;

        if (!date) {
            return res.status(400).json({ error: "Date is required (YYYY-MM-DD)." });
        }

        const updatePayload = {
            exception_reason: exception_reason || "Target achieved",
            justification: justification || "",
            recorded_by: req.user?.username || "Admin",
            updatedAt: new Date()
        };

        if (status) updatePayload.status = status;
        if (opening_pending_override !== undefined) updatePayload.opening_pending_override = opening_pending_override;
        if (configured_target !== undefined) updatePayload.configured_target = configured_target;
        if (notes !== undefined) updatePayload.notes = notes;

        const updatedRecord = await ImportPendingProductivityModel.findOneAndUpdate(
            { date, branch_code: branch_code.toUpperCase() },
            { $set: updatePayload },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json({
            success: true,
            message: "Exception reason and justification saved successfully",
            record: updatedRecord
        });
    } catch (error) {
        console.error("Error in POST /exception-reason:", error);
        res.status(500).json({ error: "Failed to save exception reason" });
    }
});

export default router;
