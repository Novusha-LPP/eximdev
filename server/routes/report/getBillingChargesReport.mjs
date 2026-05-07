import express from 'express';
import JobModel from '../../model/jobModel.mjs';
import BranchModel from '../../model/branchModel.mjs';
import xlsx from 'xlsx';
import mongoose from 'mongoose';
import authMiddleware from "../../middleware/authMiddleware.mjs";
import { applyUserBranchFilter } from "../../middleware/branchMiddleware.mjs";
import { getBranchMatch } from "../../utils/branchFilter.mjs";

const router = express.Router();

router.get("/api/report/billing-charges-excel", authMiddleware, applyUserBranchFilter, async (req, res) => {
    try {
        const { type, year, branchId, mode, detailedStatus, month, startDate, endDate } = req.query;

        // Base match stage
        const jobMatchStage = {};
        if (year) jobMatchStage.year = year;
        
        // Calculate common date filter logic
        let dateFilter = null;
        let stringDateFilter = null;
        if (startDate || endDate) {
            dateFilter = {};
            stringDateFilter = {};
            if (startDate) {
                dateFilter.$gte = new Date(startDate);
                stringDateFilter.$gte = startDate;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.$lte = end;
                stringDateFilter.$lte = endDate;
            }
        } else if (month && month !== 'all') {
            let startOfMonth, endOfMonth, startStr, endStr;
            if (year && year.includes('-')) {
                const [startYearShort, endYearShort] = year.split('-');
                const startYear = 2000 + parseInt(startYearShort);
                const endYear = 2000 + parseInt(endYearShort);
                const monthInt = parseInt(month);
                const targetYear = monthInt >= 4 ? startYear : endYear;
                startOfMonth = new Date(targetYear, monthInt - 1, 1);
                endOfMonth = new Date(targetYear, monthInt, 0, 23, 59, 59, 999);
                
                startStr = `${targetYear}-${month.padStart(2, '0')}-01`;
                endStr = `${targetYear}-${month.padStart(2, '0')}-${new Date(targetYear, monthInt, 0).getDate()}`;
            } else {
                const currentYear = new Date().getFullYear();
                const monthInt = parseInt(month);
                startOfMonth = new Date(currentYear, monthInt - 1, 1);
                endOfMonth = new Date(currentYear, monthInt, 0, 23, 59, 59, 999);

                startStr = `${currentYear}-${month.padStart(2, '0')}-01`;
                endStr = `${currentYear}-${month.padStart(2, '0')}-${new Date(currentYear, monthInt, 0).getDate()}`;
            }
            dateFilter = { $gte: startOfMonth, $lte: endOfMonth };
            stringDateFilter = { $gte: startStr, $lte: endStr };
        }

        // Use standard branch/mode matching logic
        const branchMatch = getBranchMatch(branchId, mode, req.authorizedBranchIds);
        Object.assign(jobMatchStage, branchMatch);

        // Enhance branch matching: some jobs might have branch_code but not branch_id (or vice-versa)
        if (branchId && branchId !== 'all' && mongoose.Types.ObjectId.isValid(branchId)) {
            const branch = await BranchModel.findById(branchId).lean();
            if (branch) {
                // Use $or to match either the ID or the Code to be more inclusive
                delete jobMatchStage.branch_id;
                jobMatchStage.$or = [
                    { branch_id: branch._id },
                    { branch_code: branch.branch_code }
                ];
            }
        }

        if (detailedStatus && detailedStatus !== 'all') {
            const statusMapping = {
                billing_pending: "Billing Pending",
                eta_date_pending: "ETA Date Pending",
                estimated_time_of_arrival: "Estimated Time of Arrival",
                gateway_igm_filed: "Gateway IGM Filed",
                discharged: "Discharged",
                rail_out: "Rail Out",
                be_noted_arrival_pending: "BE Noted, Arrival Pending",
                be_noted_clearance_pending: "BE Noted, Clearance Pending",
                pcv_done_duty_payment_pending: "PCV Done, Duty Payment Pending",
                custom_clearance_completed: "Custom Clearance Completed",
            };
            const mappedStatus = statusMapping[detailedStatus] || detailedStatus;
            // More resilient regex for status
            jobMatchStage.detailed_status = { $regex: new RegExp(`^\\s*${mappedStatus}\\s*$`, 'i') };
        }

        console.log("Job Match Stage:", JSON.stringify(jobMatchStage));

        // Charge match stage based on report type
        const chargeMatchConditions = [];
        
        // 1. Filter by report type
        if (type === 'all') {
            chargeMatchConditions.push({
                $or: [
                    { "charges.payment_request_no": { $exists: true, $ne: null, $ne: "" } },
                    { "charges.purchase_book_no": { $exists: true, $ne: null, $ne: "" } }
                ]
            });
        } else if (type === 'pr_no_pb') {
            chargeMatchConditions.push({ "charges.payment_request_no": { $exists: true, $ne: null, $ne: "" } });
            chargeMatchConditions.push({
                $or: [
                    { "charges.purchase_book_no": { $exists: false } },
                    { "charges.purchase_book_no": null },
                    { "charges.purchase_book_no": "" }
                ]
            });
        } else {
            const chargeMatchField = type === 'pr' ? "charges.payment_request_no" : "charges.purchase_book_no";
            chargeMatchConditions.push({ [chargeMatchField]: { $exists: true, $ne: null, $ne: "" } });
        }

        // 2. Filter by date (if dateFilter exists)
        if (dateFilter) {
            if (type === 'pb') {
                // For PB, we'll use stringDateFilter on the joined entryDate field
                chargeMatchConditions.push({ 
                    $or: [
                        { "entryDate": stringDateFilter },
                        { "charges.purchase_book_approved_at": dateFilter }
                    ]
                });
            } else if (type === 'pr' || type === 'pr_no_pb') {
                // For PR, we'll use stringDateFilter on the joined requestDate field
                chargeMatchConditions.push({ 
                    $or: [
                        { "requestDate": stringDateFilter },
                        { "charges.payment_request_approved_at": dateFilter }
                    ]
                });
            } else {
                // For 'all' or fallback, use either PB (entryDate or approved_at) or PR (requestDate or approved_at) date
                chargeMatchConditions.push({
                    $or: [
                        { "entryDate": stringDateFilter },
                        { "charges.purchase_book_approved_at": dateFilter },
                        { "requestDate": stringDateFilter },
                        { "charges.payment_request_approved_at": dateFilter }
                    ]
                });
            }
        }

        const chargeMatchStage = { $and: chargeMatchConditions };

        const pipeline = [
            { $match: jobMatchStage },
            { $unwind: "$charges" },
            {
                $lookup: {
                    from: "purchasebookentries",
                    localField: "charges.purchase_book_no",
                    foreignField: "entryNo",
                    as: "pb_details"
                }
            },
            {
                $lookup: {
                    from: "paymentrequests",
                    localField: "charges.payment_request_no",
                    foreignField: "requestNo",
                    as: "pr_details"
                }
            },
            {
                $addFields: {
                    entryDate: { $arrayElemAt: ["$pb_details.entryDate", 0] },
                    requestDate: { $arrayElemAt: ["$pr_details.requestDate", 0] }
                }
            },
            { $match: chargeMatchStage },
            {
                $project: {
                    job_no: 1,
                    job_number: 1,
                    importer: 1,
                    custom_house: 1,
                    be_no: 1,
                    be_date: 1,
                    mode: 1,
                    branch_code: 1,
                    chargeHead: "$charges.chargeHead",
                    category: "$charges.category",
                    isPurchaseBookMandatory: "$charges.isPurchaseBookMandatory",
                    partyName: "$charges.cost.partyName",
                    purchase_book_no: "$charges.purchase_book_no",
                    purchase_book_status: "$charges.purchase_book_status",
                    payment_request_no: "$charges.payment_request_no",
                    payment_request_status: "$charges.payment_request_status",
                    netPayable: "$charges.cost.netPayable",
                    basicAmount: "$charges.cost.basicAmount",
                    gstAmount: "$charges.cost.gstAmount",
                    tdsAmount: "$charges.cost.tdsAmount",
                    sacHsn: "$charges.sacHsn",
                    remark: "$charges.remark",
                    invoice_number: "$charges.invoice_number",
                    invoice_date: "$charges.invoice_date",
                    purchase_book_approved_at: "$charges.purchase_book_approved_at",
                    entryDate: 1,
                    requestDate: 1,
                    payment_request_approved_at: "$charges.payment_request_approved_at"
                }
            },
            { $sort: { job_number: 1, importer: 1 } }
        ];

        const results = await JobModel.aggregate(pipeline);

        if (!results || results.length === 0) {
            // Check if there are any jobs at all with this status to give better feedback
            const totalJobsWithStatus = await JobModel.countDocuments(jobMatchStage);
            
            // Clean up regex characters for user-friendly display
            const statusLabel = jobMatchStage.detailed_status 
                ? `'${jobMatchStage.detailed_status.$regex.source.replace(/^\^|\\s\*|\$/g, '').replace(/\\/g, '')}'`
                : 'any status';
            
            let errorMessage = `No records found.`;
            if (type === 'pr_no_pb') {
                errorMessage = `No Payment Requests found that are pending a Purchase Book for status ${statusLabel}.`;
            } else if (type === 'all') {
                errorMessage = `No PB or PR records found for status ${statusLabel}.`;
            } else {
                errorMessage = `No ${type === 'pr' ? 'payment request' : 'purchase book'} records found.`;
                if (totalJobsWithStatus === 0) {
                    errorMessage += ` Found 0 jobs with status ${statusLabel} for the selected branch/mode.`;
                } else {
                    errorMessage += ` Found ${totalJobsWithStatus} jobs with status ${statusLabel}, but none have ${type === 'pr' ? 'Payment Request' : 'Purchase Book'} numbers assigned.`;
                }
            }
            
            return res.status(404).json({ error: errorMessage });
        }

        // Prepare Excel Data
        const excelData = results.map((row, index) => {
            return {
                "S.No": index + 1,
                "Job Number": row.job_number || row.job_no,
                "Importer": row.importer,
                "Mode": row.mode,
                "Branch": row.branch_code,
                "Custom House": row.custom_house,
                "B/E No": row.be_no,
                "B/E Date": row.be_date,
                "Charge Head": row.chargeHead,
                "Category": row.category,
                "Party Name": row.partyName,
                "Invoice No": row.invoice_number,
                "Invoice Date": row.invoice_date,
                "PB Entry Date": row.entryDate || (row.purchase_book_approved_at ? new Date(row.purchase_book_approved_at).toLocaleDateString('en-IN') : ""),
                "PB Number": row.purchase_book_no,
                "PB Status": row.purchase_book_status,
                "PR Request Date": row.requestDate || (row.payment_request_approved_at ? new Date(row.payment_request_approved_at).toLocaleDateString('en-IN') : ""),
                "PR Number": row.payment_request_no,
                "PR Status": row.payment_request_status,
                "PB Mandatory?": row.isPurchaseBookMandatory ? "YES" : "NO",
                "SAC/HSN": row.sacHsn,
                "Basic Amount": row.basicAmount,
                "GST Amount": row.gstAmount,
                "TDS Amount": row.tdsAmount,
                "Net Payable": row.netPayable,
                "Remark": row.remark
            };
        });

        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(excelData);

        // Auto-fit columns
        const range = xlsx.utils.decode_range(worksheet['!ref']);
        const colWidths = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
            let maxWidth = 10;
            for (let row = range.s.r; row <= range.e.r; row++) {
                const cell = worksheet[xlsx.utils.encode_cell({ r: row, c: col })];
                if (cell && cell.v) {
                    maxWidth = Math.max(maxWidth, String(cell.v).length + 2);
                }
            }
            colWidths.push({ wch: Math.min(maxWidth, 50) });
        }
        worksheet['!cols'] = colWidths;

        const sheetName = type === 'pr' ? "Payment Request Report" : "Purchase Book Report";
        xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);

        const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

        const filename = type === 'pr' ? "Payment_Request_Report.xlsx" : "Purchase_Book_Report.xlsx";
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.send(buffer);

    } catch (error) {
        console.error("Error generating billing report:", error);
        res.status(500).json({ error: "Internal server error: " + error.message });
    }
});

export default router;
