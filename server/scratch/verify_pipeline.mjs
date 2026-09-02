import mongoose from 'mongoose';
import JobModel from '../model/jobModel.mjs';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/eximNew";

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

async function verify(type) {
    console.log(`\n--- VERIFYING TYPE: ${type} ---`);
    const conditions = [];
    if (type === 'all') {
        conditions.push({
            $or: [
                { "charges.payment_request_no": { $exists: true, $ne: null, $ne: "" } },
                { "charges.purchase_book_no": { $exists: true, $ne: null, $ne: "" } }
            ]
        });
    } else {
        const chargeMatchField = type === 'pr' ? "charges.payment_request_no" : "charges.purchase_book_no";
        conditions.push({ [chargeMatchField]: { $exists: true, $ne: null, $ne: "" } });
    }

    const pipeline = [
        { $unwind: "$charges" },
        { $match: { $and: conditions } },
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
        { $limit: 1 }
    ];

    const results = await JobModel.aggregate(pipeline);
    if (results.length === 0) {
        console.log(`No results found for type ${type}`);
        return;
    }

    const row = results[0];
    const reqDate = formatDateToDDMMMYYYY(row.charge_created_at);
    let compDate = "N/A";
    if (row.payment_request_approved_at && row.purchase_book_approved_at) {
        compDate = `${formatDateToDDMMMYYYY(row.payment_request_approved_at)} / ${formatDateToDDMMMYYYY(row.purchase_book_approved_at)}`;
    } else if (row.payment_request_approved_at) {
        compDate = formatDateToDDMMMYYYY(row.payment_request_approved_at);
    } else if (row.purchase_book_approved_at) {
        compDate = formatDateToDDMMMYYYY(row.purchase_book_approved_at);
    }

    const record = {
        "S.No": 1,
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

    if (type === 'pb' || type === 'all') {
        record["PB Number"] = row.purchase_book_no;
        record["PB Status"] = row.purchase_book_status;
    }
    if (type === 'pr' || type === 'pr_no_pb' || type === 'all') {
        record["PR Number"] = row.payment_request_no;
        record["PR Status"] = row.payment_request_status;
    }

    Object.assign(record, {
        "SAC/HSN": row.sacHsn,
        "Request Date": reqDate,
        "Completion Date": compDate,
        "Invoice No": row.invoice_number,
        "Invoice Date": formatDateToDDMMMYYYY(row.invoice_date),
        "Invoice Value": row.category && row.category.toLowerCase() === 'reimbursement' 
            ? (row.rate !== undefined && row.rate !== null ? row.rate : 0)
            : (row.invoice_value !== undefined && row.invoice_value !== null ? row.invoice_value : ""),
        "Basic Amount": row.basicAmount !== undefined && row.basicAmount !== null ? row.basicAmount : 0,
        "GST Amount": row.gstAmount !== undefined && row.gstAmount !== null ? row.gstAmount : 0,
        "TDS Amount": row.tdsAmount !== undefined && row.tdsAmount !== null ? row.tdsAmount : 0,
        "Net Payable": row.netPayable !== undefined && row.netPayable !== null ? row.netPayable : 0,
        "Remark": row.remark
    });

    console.log("Full record:", record);
}

async function run() {
    try {
        await mongoose.connect(uri);
        await verify('pb');
        await verify('pr');
        await verify('all');
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
