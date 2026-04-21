import express from 'express';
import mongoose from 'mongoose';
import JobModel from '../../model/jobModel.mjs';
import BillingCounterModel from '../../model/billingCounterModel.mjs';
import BillModel from '../../model/billModel.mjs';
import PaymentRequestModel from '../../model/paymentRequestModel.mjs';

const router = express.Router();

/**
 * Atomic helper to get and increment the next sequence number.
 * We now prefer a shared 'BILLING' prefix to keep sequences synced.
 */
async function getNextSequence(prefix, financialYear) {
    const counter = await BillingCounterModel.findOneAndUpdate(
        { prefix, financial_year: financialYear },
        { $inc: { last_sequence: 1 } },
        { upsert: true, new: true }
    );
    return counter.last_sequence;
}

/**
 * Helper to peek at the next sequence number without incrementing it.
 */
async function peekNextSequence(prefix, financialYear) {
    const counter = await BillingCounterModel.findOne({ prefix, financial_year: financialYear });
    return (counter?.last_sequence || 0) + 1;
}

/**
 * Endpoint to suggest the next available invoice number without creating it.
 */
router.get('/next-suggested/:type/:jobId', async (req, res) => {
    try {
        const { type, jobId } = req.params;
        const job = await JobModel.findById(jobId);
        if (!job) return res.status(404).json({ success: false, message: "Job not found" });

        const fy = job.year || job.financial_year || "24-25";
        
        // 1. Check if the other bill type already has a number on this job
        const billNos = (job.bill_no || "").split(",");
        const giaNo = (billNos[0] || "").trim();
        const girNo = (billNos[1] || "").trim();
        const existingCompanion = type === 'GIA' ? girNo : giaNo;

        if (existingCompanion) {
            // Extract sequence from companion (e.g. GIR/0005/26-27 -> 0005)
            const parts = existingCompanion.split("/");
            if (parts.length >= 2) {
                const companionSequence = parts[1];
                return res.json({ success: true, suggestedNo: `${type}/${companionSequence}/${fy}`, sequence: companionSequence });
            }
        }

        // 2. Otherwise suggest based on global shared counter
        const nextSeq = await peekNextSequence("BILLING", fy);
        const padded = nextSeq.toString().padStart(4, '0');
        res.json({ success: true, suggestedNo: `${type}/${padded}/${fy}`, sequence: padded });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * Get all payment requests for a job
 */
router.get('/payment-requests/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await JobModel.findById(jobId).lean();
        if (!job) {
            return res.json({ success: true, data: [] });
        }

        const requests = await PaymentRequestModel.find({ 
            $or: [
                { jobRef: jobId },
                { jobNo: job.job_no },
                { jobNo: job.job_number }
            ]
        });
        res.json({ success: true, data: requests });
    } catch (err) {
        console.error("Error fetching payment requests:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * Get saved bill for a job
 */
router.get('/:jobId/:type', async (req, res) => {
    try {
        const { jobId, type } = req.params;
        const bill = await BillModel.findOne({ jobId, type });
        if (!bill) {
            return res.json({ success: false, message: "No saved bill found" });
        }
        res.json({ success: true, data: bill });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * Save / Update bill and sync charges back to Job
 */
router.post('/save', async (req, res) => {
    try {
        const { jobId, type, billNo, rows, editableFields, totals } = req.body;
        
        if (!jobId || !type) {
            return res.status(400).json({ success: false, message: "Missing jobId or type" });
        }

        const job = await JobModel.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found" });
        }

        // --- Post-Generation Edit Logic ---
        // Relaxing the Admin lock to allow corrections, but we keep an audit trail
        // We'll update the job's bill_no if it has changed in the UI

        const updateData = { 
            billNo, 
            rows, 
            editableFields,
            ...totals,
            lastSaved: new Date()
        };

        // Capture generation audit info if provided
        if (req.body.firstName || req.body.lastName) {
            const existingBill = await BillModel.findOne({ jobId, type });
            if (!existingBill || !existingBill.generatedAt) {
                updateData.generatedByFirstName = req.body.firstName;
                updateData.generatedByLastName = req.body.lastName;
                updateData.generatedAt = new Date();
            }
        }

        const billData = { ...updateData };
        
        // --- Sync back to Job Charges ---
        if (job) {
            let jobChanged = false;
            const category = type === 'GIA' ? 'Margin' : 'Reimbursement';

            // 1. Sync the Bill Number back to the Job summary table if it's new or edited
            const billNos = (job.bill_no || "").split(",");
            let giaNo = (billNos[0] || "").trim();
            let girNo = (billNos[1] || "").trim();

            const parseSequence = (no) => {
                const p = (no || "").split("/");
                return p.length >= 2 ? p[1] : null;
            };

            const fy = (billNo || "").split("/")[2] || job.year || job.financial_year || "24-25";
            const sequence = parseSequence(billNo);

            if (type === 'GIA') {
                if (giaNo !== billNo) {
                    giaNo = billNo;
                    jobChanged = true;
                }
                // Sync companion if it exists and sequence differs
                if (sequence && girNo && parseSequence(girNo) !== sequence) {
                    girNo = `GIR/${sequence}/${fy}`;
                    jobChanged = true;
                    // Also update the actual Bill document for the companion
                    await BillModel.findOneAndUpdate({ jobId, type: 'GIR' }, { billNo: girNo });
                }
            } else if (type === 'GIR') {
                if (girNo !== billNo) {
                    girNo = billNo;
                    jobChanged = true;
                }
                // Sync companion if it exists and sequence differs
                if (sequence && giaNo && parseSequence(giaNo) !== sequence) {
                    giaNo = `GIA/${sequence}/${fy}`;
                    jobChanged = true;
                    // Also update the actual Bill document for the companion
                    await BillModel.findOneAndUpdate({ jobId, type: 'GIA' }, { billNo: giaNo });
                }
            }

            // --- Advance Global Counter ---
            // If the user manually entered a high number, we ensure the shared counter jumps forward 
            // so the next suggestion is always sequence + 1.
            if (sequence && !isNaN(parseInt(sequence))) {
                const seqInt = parseInt(sequence);
                await BillingCounterModel.findOneAndUpdate(
                    { prefix: "BILLING", financial_year: fy },
                    { $max: { last_sequence: seqInt } },
                    { upsert: true }
                );
            }
            
            if (jobChanged) {
                job.bill_no = (giaNo || girNo) ? `${giaNo},${girNo}` : "";
                const billDates = (job.bill_date || "").split(",");
                if (type === 'GIA' && !billDates[0]) billDates[0] = new Date().toISOString();
                if (type === 'GIR' && !billDates[1]) billDates[1] = new Date().toISOString();
                job.bill_date = `${billDates[0] || ""},${billDates[1] || ""}`;
            }

            // 2. Sync Rows/Charges
            for (let i = 0; i < (billData.rows || []).length; i++) {
                const row = billData.rows[i];
                if (!row.description && !row.taxable && !row.nonGst) continue;

                const amount = parseFloat(row.taxable || row.nonGst || 0);
                const isExisting = mongoose.isValidObjectId(row.id);
                const sourceIds = Array.isArray(row.sourceIds) ? row.sourceIds : [row.id].filter(id => mongoose.isValidObjectId(id));
                
                if (sourceIds.length > 0) {
                    // This handles both single rows and combined (clubbed) rows
                    sourceIds.forEach((sid, idx) => {
                        const chargeIdx = job.charges.findIndex(c => c._id && c._id.toString() === sid);
                        if (chargeIdx !== -1) {
                            const ch = job.charges[chargeIdx];
                            // Only put the full amount into the FIRST charge in a group, others go to 0
                            const targetAmount = (idx === 0) ? amount : 0;

                            if (!ch.revenue) ch.revenue = { qty: 1, rate: targetAmount, amount: targetAmount, amountINR: targetAmount };
                            else {
                                ch.revenue.basicAmount = targetAmount;
                                ch.revenue.amountINR = targetAmount;
                                ch.revenue.rate = targetAmount;
                                ch.revenue.amount = targetAmount;
                            }
                            const totalTax = (parseFloat(row.cgstPercent) || 0) + (parseFloat(row.sgstPercent) || 0);
                            ch.revenue.gstRate = totalTax;
                            ch.revenue.isGst = totalTax > 0;
                            ch.sacHsn = row.sac;
                            ch.invoice_number = row.receipt_no;
                            ch.invoice_date = row.receipt_date;
                            jobChanged = true;
                        }
                    });
                } else if (row.description && amount !== 0) {
                    const newCharge = {
                        chargeHead: row.description,
                        category: category,
                        sacHsn: row.sac,
                        invoice_number: row.receipt_no,
                        invoice_date: row.receipt_date,
                        revenue: {
                            chargeDescription: row.description,
                            qty: 1,
                            rate: amount,
                            amount: amount,
                            amountINR: amount,
                            basicAmount: amount,
                            gstRate: (parseFloat(row.cgstPercent) || 0) + (parseFloat(row.sgstPercent) || 0),
                            isGst: ((parseFloat(row.cgstPercent) || 0) + (parseFloat(row.sgstPercent) || 0)) > 0,
                            currency: "INR",
                            exchangeRate: 1
                        },
                        copyToCost: false
                    };
                    const savedCharge = job.charges.create(newCharge);
                    job.charges.push(savedCharge);
                    billData.rows[i].id = savedCharge._id.toString();
                    jobChanged = true;
                }
            }

            if (jobChanged) {
                await job.save();
            }
        }

        const bill = await BillModel.findOneAndUpdate(
            { jobId, type },
            billData,
            { upsert: true, new: true }
        );

        await syncJobBillingInfo(jobId);

        res.json({ success: true, message: "Bill saved and charges synced successfully", data: bill });
    } catch (err) {
        console.error("Save/Sync error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * Invalidate bills for a job, reset status to Pending, and log remark.
 */
router.post('/invalidate', async (req, res) => {
    try {
        const { jobId, remark, type } = req.body;
        if (!jobId) {
            return res.status(400).json({ success: false, message: "Missing jobId" });
        }

        const job = await JobModel.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found" });
        }

        // Targeted clearing of billing info in Job Summary
        const billNos = (job.bill_no || "").split(",");
        const billDates = (job.bill_date || "").split(",");

        // Ensure at least 2 entries for stability (0: GIA, 1: GIR)
        while (billNos.length < 2) billNos.push("");
        while (billDates.length < 2) billDates.push("");

        if (type === 'GIA') {
            billNos[0] = "";
            billDates[0] = "";
        } else if (type === 'GIR') {
            billNos[1] = "";
            billDates[1] = "";
        }

        job.bill_no = billNos.join(",");
        job.bill_date = billDates.join(",");
        
        // Rolling back status to 'Pending' whenever any bill is invalidated
        job.status = "Pending";
        
        // Append Invalidation Remark
        const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        const newRemark = `[${timestamp}] BILL INVALIDATED (${type}): ${remark || 'No reason provided'}`;
        job.remarks = job.remarks ? `${job.remarks}\n${newRemark}` : newRemark;

        await job.save();

        // Delete ONLY the specific bill record for this type
        await BillModel.deleteOne({ jobId, type });

        res.json({ success: true, message: "Invoices invalidated. Job status reset to Pending." });
    } catch (err) {
        console.error("Invalidation error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * Endpoint to generate a unique invoice number for a job
 */
router.post('/generate-invoice-number', async (req, res) => {
    const { jobId, type, firstName, lastName } = req.body;

    if (!jobId || !type) {
        return res.status(400).json({ success: false, message: "Missing jobId or type" });
    }

    try {
        const job = await JobModel.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found" });
        }

        const billNos = (job.bill_no || "").split(",");
        const billDates = (job.bill_date || "").split(",");
        
        let giaNo = (billNos[0] || "").trim();
        let girNo = (billNos[1] || "").trim();
        let giaDate = (billDates[0] || "").trim();
        let girDate = (billDates[1] || "").trim();

        let invoiceNo = type === 'GIA' ? giaNo : girNo;

        if (!invoiceNo) {
            const fy = job.year || job.financial_year || "24-25";
            
            // 1. Unified sequence digit logic: Try to reuse companion sequence if exists
            const existingCompanion = type === 'GIA' ? girNo : giaNo;
            let sequence;

            if (existingCompanion) {
                const parts = existingCompanion.split("/");
                if (parts.length >= 2) {
                    sequence = parts[1];
                }
            }

            // 2. If no companion or extraction failed, get from shared counter
            if (!sequence) {
                const seqVal = await getNextSequence("BILLING", fy);
                sequence = seqVal.toString().padStart(4, '0');
            }

            invoiceNo = `${type}/${sequence}/${fy}`;

            // Save back to comma-separated fields
            if (type === 'GIA') {
                giaNo = invoiceNo;
                giaDate = new Date().toISOString();
            } else {
                girNo = invoiceNo;
                girDate = new Date().toISOString();
            }

            job.bill_no = (giaNo || girNo) ? `${giaNo},${girNo}` : "";
            job.bill_date = (giaDate || girDate) ? `${giaDate || ""},${girDate || ""}` : "";
            await job.save();
        }

        // Capture generation audit log
        if (firstName || lastName) {
            await BillModel.findOneAndUpdate(
                { jobId, type },
                { 
                    billNo: invoiceNo,
                    generatedByFirstName: firstName,
                    generatedByLastName: lastName,
                    generatedAt: new Date()
                },
                { upsert: true }
            );
        }

        await syncJobBillingInfo(jobId);

        res.json({ success: true, invoiceNo });
    } catch (err) {
        console.error("Error generating invoice number:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * Helper to sync billing summary back to Job only when BOTH are present
 */
async function syncJobBillingInfo(jobId) {
    try {
        const job = await JobModel.findById(jobId);
        if (!job) return;

        const billNos = (job.bill_no || "").split(",");
        const giaNo = (billNos[0] || "").trim();
        const girNo = (billNos[1] || "").trim();

        if (giaNo && girNo) {
            const [giaBill, girBill] = await Promise.all([
                BillModel.findOne({ jobId, type: 'GIA' }),
                BillModel.findOne({ jobId, type: 'GIR' })
            ]);

            const formatDate = (date) => {
                if (!date) return "";
                const d = new Date(date);
                return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16);
            };

            const giaAmt = giaBill?.totalTaxable || 0; // Using taxable total as indicator
            const girAmt = girBill?.totalNonGst || 0;

            job.bill_no = `${giaNo},${girNo}`;
            job.bill_date = `${formatDate(giaBill?.generatedAt)},${formatDate(girBill?.generatedAt)}`;
            
            // Set status to Completed when both bills are present
            job.status = "Completed";

            await job.save();
        }
    } catch (err) {
        console.error("Error syncing job billing info:", err);
    }
}

export default router;
