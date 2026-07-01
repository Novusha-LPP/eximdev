import express from 'express';
import JobModel from '../../model/jobModel.mjs';
import BranchModel from '../../model/branchModel.mjs';
import xlsx from 'xlsx';
import mongoose from 'mongoose';
import authMiddleware from "../../middleware/authMiddleware.mjs";
import { applyUserBranchFilter } from "../../middleware/branchMiddleware.mjs";
import { getBranchMatch } from "../../utils/branchFilter.mjs";

const router = express.Router();

function formatDateToDDMMMYYYY(dateInput) {
    if (!dateInput) return "N/A";
    
    let date;
    if (dateInput instanceof Date) {
        date = dateInput;
    } else {
        const dateStr = String(dateInput).trim();
        if (!dateStr || dateStr.toLowerCase() === 'n/a' || dateStr.toLowerCase() === 'null' || dateStr.toLowerCase() === 'undefined') {
            return "N/A";
        }
        
        // Match YYYY-MM-DD or YYYY/MM/DD
        const yyyymmddMatch = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        // Match DD-MM-YYYY or DD/MM/YYYY
        const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        
        if (yyyymmddMatch) {
            const year = parseInt(yyyymmddMatch[1], 10);
            const month = parseInt(yyyymmddMatch[2], 10) - 1;
            const day = parseInt(yyyymmddMatch[3], 10);
            date = new Date(year, month, day);
        } else if (ddmmyyyyMatch) {
            const day = parseInt(ddmmyyyyMatch[1], 10);
            const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
            const year = parseInt(ddmmyyyyMatch[3], 10);
            date = new Date(year, month, day);
        } else {
            date = new Date(dateStr);
        }
    }

    if (isNaN(date.getTime())) {
        return dateInput;
    }

    const day = String(date.getDate()).padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

router.get("/api/report/billing-charges-excel", authMiddleware, applyUserBranchFilter, async (req, res) => {
    try {
        const { type, year, branchId, mode, detailedStatus, dateFilterType, startDate, endDate, format } = req.query;

        if (type === 'gpj') {
            const matchQuery = {
                $and: [
                    { status: { $not: { $regex: "^completed", $options: "i" } } },
                    { isCompleted: { $ne: true } },
                    { status: { $not: { $regex: "^cancelled", $options: "i" } } },
                    { isJobCanceled: { $ne: true } }
                ]
            };

            // Apply the year filter
            if ((!dateFilterType || dateFilterType === 'job_year') && year) {
                matchQuery.$and.push({ year: year });
            }

            // Apply branch/mode filters
            const branchMatch = getBranchMatch(branchId, mode, req.authorizedBranchIds);
            if (Object.keys(branchMatch).length > 0) {
                if (branchId && branchId !== 'all' && mongoose.Types.ObjectId.isValid(branchId)) {
                    const branch = await BranchModel.findById(branchId).lean();
                    if (branch) {
                        const { branch_id, ...rest } = branchMatch;
                        matchQuery.$and.push({
                            $or: [
                                { branch_id: branch._id },
                                { branch_code: branch.branch_code }
                            ],
                            ...rest
                        });
                    } else {
                        matchQuery.$and.push(branchMatch);
                    }
                } else {
                    matchQuery.$and.push(branchMatch);
                }
            }

            // Date Range Filter logic
            if (dateFilterType === 'request_date' && startDate && endDate) {
                matchQuery.$and.push({
                    createdAt: {
                        $gte: new Date(startDate),
                        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
                    }
                });
            } else if (dateFilterType === 'completion_date' && startDate && endDate) {
                matchQuery.$and.push({
                    billing_completed_date: {
                        $gte: `${startDate}T00:00`,
                        $lte: `${endDate}T23:59`
                    }
                });
            }

            const jobs = await JobModel.find(matchQuery).sort({ createdAt: -1 }).lean();
            const excelData = jobs.map((job) => {
                const containerCount = job.container_count || (job.container_nos || []).length || 0;
                const containerNos = (job.container_nos || []).map(c => c.container_number).filter(Boolean).join(" , ") || "";
                const noOfContainer = job.no_of_container || "";
                const beHeading = job.description || (job.description_details && job.description_details[0]?.description) || "";

                return {
                    "Job No": job.job_no || job.job_number || "",
                    "Job Date": formatDateToDDMMMYYYY(job.job_date),
                    "BE No": job.be_no || "",
                    "BE Date": formatDateToDDMMMYYYY(job.be_date),
                    "Importer": job.importer || "",
                    "Custom House": job.custom_house || "",
                    "Container Count": containerCount,
                    "Container Nos.": containerNos,
                    "B/E Heading": beHeading,
                    "No Of Container": noOfContainer,
                };
            });

            if (format === 'json') {
                return res.status(200).json(excelData);
            }

            if (excelData.length === 0) {
                return res.status(404).json({ error: "No general pending jobs found for the selected filters." });
            }

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

            xlsx.utils.book_append_sheet(workbook, worksheet, "General Pending Jobs");
            const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

            res.setHeader("Content-Disposition", `attachment; filename="General_Pending_Jobs.xlsx"`);
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            return res.send(buffer);
        }

        // Base match stage
        const jobMatchStage = {};

        // Only filter by job financial year if dateFilterType is 'job_year' or not provided
        if ((!dateFilterType || dateFilterType === 'job_year') && year) {
            jobMatchStage.year = year;
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

        // Charge match stage based on report type and optional date filters
        const conditions = [];

        if (type === 'all') {
            conditions.push({
                $or: [
                    { "charges.payment_request_no": { $exists: true, $ne: null, $ne: "" } },
                    { "charges.purchase_book_no": { $exists: true, $ne: null, $ne: "" } }
                ]
            });
        } else if (type === 'pr_no_pb') {
            conditions.push(
                { "charges.payment_request_no": { $exists: true, $ne: null, $ne: "" } },
                {
                    $or: [
                        { "charges.purchase_book_no": { $exists: false } },
                        { "charges.purchase_book_no": null },
                        { "charges.purchase_book_no": "" }
                    ]
                }
            );
        } else if (type === 'tds') {
            conditions.push(
                { "charges.cost.tdsAmount": { $gt: 0 } },
                { "charges.purchase_book_no": { $exists: true, $ne: null, $ne: "" } }
            );
        } else {
            const chargeMatchField = type === 'pr' ? "charges.payment_request_no" : "charges.purchase_book_no";
            conditions.push({ [chargeMatchField]: { $exists: true, $ne: null, $ne: "" } });
        }

        // Add Date Range Filter logic
        if (dateFilterType === 'request_date' && startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            
            conditions.push({ "charges.createdAt": { $gte: start, $lte: end } });
        } else if (dateFilterType === 'completion_date' && startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            if (type === 'pr') {
                conditions.push({ "charges.payment_request_approved_at": { $gte: start, $lte: end } });
            } else if (type === 'pb') {
                conditions.push({ "charges.purchase_book_approved_at": { $gte: start, $lte: end } });
            } else if (type === 'pr_no_pb') {
                conditions.push({ "charges.payment_request_approved_at": { $gte: start, $lte: end } });
            } else if (type === 'tds') {
                conditions.push({ "charges.purchase_book_approved_at": { $gte: start, $lte: end } });
            } else { // type === 'all'
                conditions.push({
                    $or: [
                        { "charges.payment_request_approved_at": { $gte: start, $lte: end } },
                        { "charges.purchase_book_approved_at": { $gte: start, $lte: end } }
                    ]
                });
            }
        }

        const chargeMatchStage = { $and: conditions };

        const pipeline = [
            { $match: jobMatchStage },
            { $unwind: "$charges" },
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
                    invoice_value: "$charges.invoice_value",
                    rate: "$charges.cost.rate",
                    sacHsn: "$charges.sacHsn",
                    remark: "$charges.remark",
                    invoice_number: "$charges.invoice_number",
                    invoice_date: "$charges.invoice_date",
                    charge_created_at: "$charges.createdAt",
                    payment_request_approved_at: "$charges.payment_request_approved_at",
                    purchase_book_approved_at: "$charges.purchase_book_approved_at"
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
            const reqDate = formatDateToDDMMMYYYY(row.charge_created_at);
            
            // Completion date logic
            let compDate = "N/A";
            if (row.payment_request_approved_at && row.purchase_book_approved_at) {
                compDate = `${formatDateToDDMMMYYYY(row.payment_request_approved_at)} / ${formatDateToDDMMMYYYY(row.purchase_book_approved_at)}`;
            } else if (row.payment_request_approved_at) {
                compDate = formatDateToDDMMMYYYY(row.payment_request_approved_at);
            } else if (row.purchase_book_approved_at) {
                compDate = formatDateToDDMMMYYYY(row.purchase_book_approved_at);
            }

            const isReimbursement = row.category && row.category.toLowerCase() === 'reimbursement';
            let basicAmount = row.basicAmount !== undefined && row.basicAmount !== null ? row.basicAmount : 0;
            let gstAmount = row.gstAmount !== undefined && row.gstAmount !== null ? row.gstAmount : 0;
            const tdsAmount = row.tdsAmount !== undefined && row.tdsAmount !== null ? row.tdsAmount : 0;
            const netPayable = row.netPayable !== undefined && row.netPayable !== null ? row.netPayable : 0;
            
            let totalVal = basicAmount + gstAmount;

            if (isReimbursement) {
                const totalAmt = netPayable + tdsAmount;
                gstAmount = parseFloat((totalAmt * 18 / 118).toFixed(2));
                basicAmount = parseFloat((totalAmt - gstAmount).toFixed(2));
                totalVal = totalAmt;
            } else {
                totalVal = basicAmount + gstAmount;
            }

            // ── Purchase Book Report — column names matching Export project ──
            if (type === 'pb') {
                const record = {
                    "S.No": index + 1,
                    "Job No": row.job_number || row.job_no,
                    "Importer": row.importer,
                    "Mode": row.mode,
                    "Branch": row.branch_code,
                    "Custom House": row.custom_house,
                    "B/E No": row.be_no,
                    "B/E Date": formatDateToDDMMMYYYY(row.be_date),
                    "Charge Head": row.chargeHead,
                    "Charge Category": row.category,
                    "Supplier": row.partyName,
                    "Trans No.": row.purchase_book_no,
                    "Status": row.purchase_book_status,
                    "SAC/HSN": row.sacHsn,
                    "Date": reqDate,
                    "Completion Date": compDate,
                    "Inv No": row.invoice_number,
                    "Inv Date": formatDateToDDMMMYYYY(row.invoice_date),
                    "Invoice Value": isReimbursement
                        ? (row.rate !== undefined && row.rate !== null ? row.rate : 0)
                        : (row.invoice_value !== undefined && row.invoice_value !== null ? row.invoice_value : ""),
                    "Taxable": basicAmount,
                    "GST": gstAmount,
                    "TDS": tdsAmount,
                    "Total": totalVal,
                    "Net Amount": netPayable,
                    "Remark": row.remark
                };
                return record;
            }

            // ── TDS Payable Register — column names matching Export project ──
            if (type === 'tds') {
                const record = {
                    "S.No": index + 1,
                    "Job No": row.job_number || row.job_no,
                    "Importer": row.importer,
                    "Mode": row.mode,
                    "Branch": row.branch_code,
                    "Custom House": row.custom_house,
                    "B/E No": row.be_no,
                    "B/E Date": formatDateToDDMMMYYYY(row.be_date),
                    "Charge Head": row.chargeHead,
                    "Charge Category": row.category,
                    "Party Name": row.partyName,
                    "Trans No.": row.purchase_book_no,
                    "PB Status": row.purchase_book_status,
                    "SAC/HSN": row.sacHsn,
                    "Purchase Book Date": reqDate,
                    "Completion Date": compDate,
                    "Vendor Ref No.": row.invoice_number,
                    "Inv Date": formatDateToDDMMMYYYY(row.invoice_date),
                    "Taxable Amount (INR)": basicAmount,
                    "GST Amount (INR)": gstAmount,
                    "TDS Amount (INR)": tdsAmount,
                    "Total Amount (INR)": totalVal,
                    "Net Amount (INR)": netPayable,
                    "Remark": row.remark
                };
                return record;
            }

            // ── Default columns for pr / pr_no_pb / all ──
            const record = {
                "S.No": index + 1,
                "Job Number": row.job_number || row.job_no,
                "Importer": row.importer,
                "Mode": row.mode,
                "Branch": row.branch_code,
                "Custom House": row.custom_house,
                "B/E No": row.be_no,
                "B/E Date": formatDateToDDMMMYYYY(row.be_date),
                "Charge Head": row.chargeHead,
                "Category": row.category,
                "Party Name": row.partyName
            };

            // Conditionally include Purchase Book or Payment Request columns
            if (type === 'all') {
                record["PB Number"] = row.purchase_book_no;
                record["PB Status"] = row.purchase_book_status;
            }
            if (type === 'pr' || type === 'pr_no_pb' || type === 'all') {
                record["PR Number"] = row.payment_request_no;
                record["PR Status"] = row.payment_request_status;
            }

            // Append remaining columns
            Object.assign(record, {
                "SAC/HSN": row.sacHsn,
                "Request Date": reqDate,
                "Completion Date": compDate,
                "Invoice No": row.invoice_number,
                "Invoice Date": formatDateToDDMMMYYYY(row.invoice_date),
                "Invoice Value": isReimbursement 
                    ? (row.rate !== undefined && row.rate !== null ? row.rate : 0)
                    : (row.invoice_value !== undefined && row.invoice_value !== null ? row.invoice_value : ""),
                "Basic Amount": basicAmount,
                "GST Amount": gstAmount,
                "TDS Amount": tdsAmount,
                "Total Amount": totalVal,
                "Net Payable": netPayable,
                "Remark": row.remark
            });

            return record;
        });

        // If JSON format is requested (for previewing), return the data directly
        if (format === 'json') {
            return res.status(200).json(excelData);
        }

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

        let sheetName = "Billing Charges Report";
        if (type === 'pr') sheetName = "Payment Request Report";
        else if (type === 'pb') sheetName = "Purchase Book Report";
        else if (type === 'tds') sheetName = "TDS Payable Register";
        else if (type === 'pr_no_pb') sheetName = "PR Pending Purchase Book";

        xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);

        const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

        let filename = "Billing_Charges_Report.xlsx";
        if (type === 'pr') filename = "Payment_Request_Report.xlsx";
        else if (type === 'pb') filename = "Purchase_Book_Report.xlsx";
        else if (type === 'tds') filename = "TDS_Payable_Register.xlsx";
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.send(buffer);

    } catch (error) {
        console.error("Error generating billing report:", error);
        res.status(500).json({ error: "Internal server error: " + error.message });
    }
});

router.get("/api/report/billing-completed-excel", authMiddleware, applyUserBranchFilter, async (req, res) => {
    try {
        const { branchId, mode, startDate, endDate, format } = req.query;

        const query = {
            $and: [
                {
                    $or: [
                        { status: "Completed" },
                        { billing_completed_date: { $exists: true, $ne: "" } }
                    ]
                }
            ]
        };

        // Use standard branch/mode matching logic
        const branchMatch = getBranchMatch(branchId, mode, req.authorizedBranchIds);
        if (Object.keys(branchMatch).length > 0) {
            query.$and.push(branchMatch);
        }

        // Apply date range on billing_completed_date
        if (startDate && endDate) {
            const startStr = `${startDate}T00:00`;
            const endStr = `${endDate}T23:59`;
            query.$and.push({
                billing_completed_date: { $gte: startStr, $lte: endStr }
            });
        }

        const results = await JobModel.find(query)
            .select("job_no job_number importer be_no bill_no bill_date billing_completed_date custom_house mode branch_code")
            .lean();

        const reportData = results.map((row, index) => {
            const billNos = (row.bill_no || "").split(",");
            const agencyBillNo = (billNos[0] || "").trim() || "N/A";
            const reimbBillNo = (billNos[1] || "").trim() || "N/A";

            const billDates = (row.bill_date || "").split(",");
            const agencyBillDate = billDates[0] ? formatDateToDDMMMYYYY(billDates[0]) : "N/A";
            const reimbBillDate = billDates[1] ? formatDateToDDMMMYYYY(billDates[1]) : "N/A";
            
            const completionDate = row.billing_completed_date 
                ? formatDateToDDMMMYYYY(row.billing_completed_date) 
                : "N/A";

            return {
                "S.No": index + 1,
                "Job Number": row.job_number || row.job_no,
                "Importer Name": row.importer,
                "Mode": row.mode,
                "Branch": row.branch_code,
                "B/E Number": row.be_no || "N/A",
                "Agency Bill No": agencyBillNo,
                "Agency Bill Date": agencyBillDate,
                "Reimbursement Bill No": reimbBillNo,
                "Reimbursement Bill Date": reimbBillDate,
                "Billing Completed Date": completionDate
            };
        });

        if (format === 'json') {
            return res.status(200).json(reportData);
        }

        if (reportData.length === 0) {
            return res.status(404).json({ error: "No completed billing records found for the selected filters." });
        }

        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(reportData);

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

        xlsx.utils.book_append_sheet(workbook, worksheet, "Billing Completed Jobs");
        const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

        res.setHeader("Content-Disposition", `attachment; filename="Billing_Completed_Report.xlsx"`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.send(buffer);

    } catch (error) {
        console.error("Error generating completed billing report:", error);
        res.status(500).json({ error: "Internal server error: " + error.message });
    }
});

export default router;
