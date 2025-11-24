import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// ---- Helper Functions ----
function cleanLedger(df) {
    /** Normalize to 7 required columns */
    const data = df.slice(2);
    const cleanedData = data.map(row => {
        // Ensure we have exactly 7 columns, pad with empty values if needed
        const rowCopy = [...row];
        while (rowCopy.length < 7) rowCopy.push('');
        return rowCopy.slice(0, 7);
    });
    
    const columns = [
        'Location', 'Invoice Date', 'Particulars', 'Txn Type',
        'Transaction No.', 'Invoice Amount (INR)', 'Received Payment(INR)'
    ];
    
    const result = cleanedData.map((row, index) => {
        const obj = {};
        columns.forEach((col, colIndex) => {
            obj[col] = row[colIndex];
        });
        
        // Parse dates and amounts
        obj['Invoice Date'] = parseDate(obj['Invoice Date']);
        obj['Invoice Amount (INR)'] = parseNumber(obj['Invoice Amount (INR)']) || 0;
        obj['Received Payment(INR)'] = parseNumber(obj['Received Payment(INR)']) || 0;
        obj['RowOrder'] = index;
        
        return obj;
    }).filter(row => 
        (row['Invoice Date'] !== null && row['Invoice Date'] !== undefined) && 
        row['Particulars'] && 
        row['Particulars'].toString().trim() !== ''
    );
    
    return result;
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    try {
        // Handle Excel serial date numbers
        if (typeof dateStr === 'number') {
            const excelEpoch = new Date(1899, 11, 30);
            const date = new Date(excelEpoch.getTime() + dateStr * 24 * 60 * 60 * 1000);
            return isNaN(date.getTime()) ? null : date;
        }
        
        // Handle string dates
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
    } catch {
        return null;
    }
}

function parseNumber(numStr) {
    if (numStr === null || numStr === undefined) return 0;
    if (typeof numStr === 'number') return numStr;
    
    const num = parseFloat(numStr.toString().replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
}

function fifoAllocation(invoices, payments, carryForward = null) {
    /** FIFO Allocation with optional carried forward invoices */
    let invoiceQueue = invoices.map(invoice => ({
        ...invoice,
        'Outstanding Amount': invoice['Invoice Amount (INR)'],
        'Status': 'Pending'
    }));

    if (carryForward && carryForward.length > 0) {
        invoiceQueue = [...carryForward, ...invoiceQueue];
    }

    const results = [];

    payments.forEach(payment => {
        const paymentDate = payment['Invoice Date'];
        const paymentRef = payment['Transaction No.'];
        const paymentAmount = payment['Received Payment(INR)'];
        let remainingPayment = paymentAmount;

        for (let idx = 0; idx < invoiceQueue.length; idx++) {
            const invoice = invoiceQueue[idx];
            
            if (invoice['Outstanding Amount'] <= 0 || remainingPayment <= 0) {
                continue;
            }

            const appliedAmount = Math.min(remainingPayment, invoice['Outstanding Amount']);
            const prevOutstanding = invoice['Outstanding Amount'];
            const newOutstanding = prevOutstanding - appliedAmount;

            // FIXED: Interest calculation - only calculate if invoice has a valid date
            let delayDays = 0;
            let interest = 0;
            
            if (paymentDate && invoice['Invoice Date'] && 
                !isNaN(paymentDate.getTime()) && !isNaN(invoice['Invoice Date'].getTime())) {
                
                delayDays = Math.floor((paymentDate - invoice['Invoice Date']) / (1000 * 60 * 60 * 24));
                
                if (delayDays > 30) {
                    const overdueDays = delayDays - 30;
                    // FIXED: More precise interest calculation
                    interest = Math.round((prevOutstanding * 0.12 / 365) * overdueDays * 100) / 100;
                }
            }

            invoiceQueue[idx]['Outstanding Amount'] = newOutstanding;
            invoiceQueue[idx]['Status'] = newOutstanding === 0 ? '✅ Cleared' : 'Pending';

            const invoiceNo = (!invoice['Transaction No.'] || invoice['Transaction No.'] === '') 
                ? 'Opening Balance' 
                : invoice['Transaction No.'].toString();

            results.push({
                'Invoice No': invoiceNo,
                'Invoice Date': invoice['Invoice Date'] ? formatDate(invoice['Invoice Date']) : "",
                'Invoice Amount': invoice['Invoice Amount (INR)'],
                'Payment Ref': paymentRef || "",
                'Payment Date': paymentDate ? formatDate(paymentDate) : "",
                'Payment Amount': paymentAmount,
                'Applied Amount': appliedAmount,
                'Outstanding Before': Math.round(prevOutstanding * 100) / 100,
                'Outstanding After': Math.round(newOutstanding * 100) / 100,
                'Delay Days': delayDays,
                'Interest (₹)': interest,
                'Status': invoiceQueue[idx]['Status']
            });

            remainingPayment -= appliedAmount;
            
            // Stop processing if payment is fully allocated
            if (remainingPayment <= 0) break;
        }
    });

    return { mapping: results, invoiceQueue };
}

function formatDate(date) {
    if (!date || isNaN(date.getTime())) return "";
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// ---- API Endpoint ----
router.post("/process-multi-year-ledgers", upload.array('files'), async (req, res) => {
    /**
     * Upload multiple year ledgers (same company).
     * Pass 'years' as comma-separated e.g. "2024-25,2025-26".
     */
    try {
        const files = req.files;
        const years = req.body.years;

        if (!files || !years) {
            return res.status(400).json({ error: "Files and years are required" });
        }

        const yearsList = years.split(",").map(y => y.trim());
        
        if (files.length !== yearsList.length) {
            return res.status(400).json({ error: "Number of files must match number of years provided." });
        }

        const tempDir = join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const outPath = join(tempDir, `Multiyear_Ledger_Processed_${Date.now()}.xlsx`);
        
        const workbook = xlsx.utils.book_new();
        let carryForward = null;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const year = yearsList[i];

            // Read Excel file
            const fileBuffer = fs.readFileSync(file.path);
            const workbookData = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true, cellText: false }); // FIXED: Added cellDates option
            const firstSheetName = workbookData.SheetNames[0];
            const worksheet = workbookData.Sheets[firstSheetName];
            const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            const data = cleanLedger(jsonData);

            const invoices = data
                .filter(row => row['Invoice Amount (INR)'] > 0)
                .sort((a, b) => {
                    const dateA = a['Invoice Date'] || new Date(0);
                    const dateB = b['Invoice Date'] || new Date(0);
                    const dateCompare = dateA.getTime() - dateB.getTime();
                    return dateCompare !== 0 ? dateCompare : a.RowOrder - b.RowOrder;
                });

            const payments = data
                .filter(row => row['Received Payment(INR)'] > 0)
                .sort((a, b) => {
                    const dateA = a['Invoice Date'] || new Date(0);
                    const dateB = b['Invoice Date'] || new Date(0);
                    return dateA.getTime() - dateB.getTime();
                });

            const { mapping, invoiceQueue } = fifoAllocation(invoices, payments, carryForward);

            // ---- Summary Block ----
            const totalInvoices = invoices.reduce((sum, row) => sum + row['Invoice Amount (INR)'], 0);
            const totalPayments = payments.reduce((sum, row) => sum + row['Received Payment(INR)'], 0);
            const totalInterest = mapping.reduce((sum, row) => sum + row['Interest (₹)'], 0);
            const clearedCount = mapping.filter(row => row.Status === '✅ Cleared').length;
            const pendingCount = invoiceQueue.filter(row => row['Outstanding Amount'] > 0).length;
            const outstandingTotal = invoiceQueue.reduce((sum, row) => sum + row['Outstanding Amount'], 0);

            const summaryHeaders = [
                "Total Invoice Amount", "Total Payments", "Total Interest Charged",
                "Total Invoices", "Cleared Invoices", "Pending Invoices", "Total Outstanding"
            ];
            
            const summaryValues = [
                Math.round(totalInvoices * 100) / 100,
                Math.round(totalPayments * 100) / 100,
                Math.round(totalInterest * 100) / 100,
                invoices.length, 
                clearedCount, 
                pendingCount, 
                Math.round(outstandingTotal * 100) / 100
            ];

            // Create worksheet for this year
            const yearWorksheet = xlsx.utils.aoa_to_sheet([]);
            
            // Add summary
            xlsx.utils.sheet_add_aoa(yearWorksheet, [summaryHeaders], { origin: 'A1' });
            xlsx.utils.sheet_add_aoa(yearWorksheet, [summaryValues], { origin: 'A2' });
            
            // Add mapping table with gap
            if (mapping.length > 0) {
                const mappingHeaders = Object.keys(mapping[0]);
                xlsx.utils.sheet_add_aoa(yearWorksheet, [mappingHeaders], { origin: 'A5' });
                
                const mappingData = mapping.map(row => [
                    row['Invoice No'],
                    row['Invoice Date'],
                    row['Invoice Amount'],
                    row['Payment Ref'],
                    row['Payment Date'],
                    row['Payment Amount'],
                    row['Applied Amount'],
                    row['Outstanding Before'],
                    row['Outstanding After'],
                    row['Delay Days'],
                    row['Interest (₹)'],
                    row['Status']
                ]);
                
                xlsx.utils.sheet_add_aoa(yearWorksheet, mappingData, { origin: 'A6' });
            }

            // Add pending block
            const pendingBlock = invoiceQueue
                .filter(row => row['Outstanding Amount'] > 0)
                .map(row => ({
                    'Invoice No': row['Transaction No.'] || 'Opening Balance',
                    'Invoice Date': row['Invoice Date'] ? formatDate(row['Invoice Date']) : "",
                    'Invoice Amount': Math.round(row['Invoice Amount (INR)'] * 100) / 100,
                    'Outstanding': Math.round(row['Outstanding Amount'] * 100) / 100
                }));

            if (pendingBlock.length > 0) {
                const startRow = 6 + mapping.length + 2;
                xlsx.utils.sheet_add_aoa(yearWorksheet, [['--- Pending Invoices ---']], { origin: `A${startRow}` });
                
                const pendingHeaders = Object.keys(pendingBlock[0]);
                xlsx.utils.sheet_add_aoa(yearWorksheet, [pendingHeaders], { origin: `A${startRow + 1}` });
                
                const pendingData = pendingBlock.map(row => [
                    row['Invoice No'],
                    row['Invoice Date'],
                    row['Invoice Amount'],
                    row['Outstanding']
                ]);
                
                xlsx.utils.sheet_add_aoa(yearWorksheet, pendingData, { origin: `A${startRow + 2}` });
            }

            // Add worksheet to workbook
            xlsx.utils.book_append_sheet(workbook, yearWorksheet, year);

            // ---- Carry Forward for next year ----
            carryForward = invoiceQueue
                .filter(row => row['Outstanding Amount'] > 0)
                .map(row => ({
                    ...row,
                    'Transaction No.': `CF-${row['Transaction No.'] || 'OB'}`,
                    'Particulars': `Carried Forward from ${year}`
                }));

            // Clean up uploaded file
            fs.unlinkSync(file.path);
        }

        // Write final workbook
        xlsx.writeFile(workbook, outPath);

        // Send file and clean up
        res.download(outPath, "MultiYear_Ledger_Processed.xlsx", (err) => {
            if (!err) {
                // Clean up temp file after download
                setTimeout(() => {
                    if (fs.existsSync(outPath)) {
                        fs.unlinkSync(outPath);
                    }
                }, 5000);
            }
        });

    } catch (error) {
        console.error('Error processing ledgers:', error);
        res.status(500).json({ error: "Internal server error: " + error.message });
    }
});

// ---- Health Check ----
router.get("/", (req, res) => {
    res.json({ message: "Ledger Processing API is running" });
});

export default router;