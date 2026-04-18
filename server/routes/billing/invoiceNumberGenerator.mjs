import express from 'express';
import JobModel from '../../model/jobModel.mjs';
import BillingCounterModel from '../../model/billingCounterModel.mjs';
import BillModel from '../../model/billModel.mjs';
import PaymentRequestModel from '../../model/paymentRequestModel.mjs';

const router = express.Router();

/**
 * Atomic helper to get and increment the next sequence number
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
 * Save / Update bill
 */
router.post('/save', async (req, res) => {
    try {
        const { jobId, type, billNo, rows, editableFields, totals } = req.body;
        
        if (!jobId || !type || !billNo) {
            return res.status(400).json({ success: false, message: "Missing jobId, type or billNo" });
        }

        const updateData = { 
            billNo, 
            rows, 
            editableFields,
            ...totals,
            lastSaved: new Date()
        };

        // If generation audit info is missing, capture it now
        if (req.body.firstName || req.body.lastName) {
            const existingBill = await BillModel.findOne({ jobId, type });
            if (!existingBill || !existingBill.generatedAt) {
                updateData.generatedByFirstName = req.body.firstName;
                updateData.generatedByLastName = req.body.lastName;
                updateData.generatedAt = new Date();
            }
        }

        const bill = await BillModel.findOneAndUpdate(
            { jobId, type },
            updateData,
            { upsert: true, new: true }
        );

        // Sync back to Job summary table (only if both are present)
        await syncJobBillingInfo(jobId);

        res.json({ success: true, message: "Bill saved successfully", data: bill });
    } catch (err) {
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

        const fieldName = type === 'GIA' ? 'agency_invoice_no' : 'reimbursement_invoice_no';
        let invoiceNo = job[fieldName];

        if (!invoiceNo) {
            const fy = job.year || job.financial_year || "24-25";
            const sequence = await getNextSequence(type, fy);
            const paddedSequence = sequence.toString().padStart(4, '0');
            invoiceNo = `${type}/${paddedSequence}/${fy}`;

            job[fieldName] = invoiceNo;
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

        // Sync back to Job summary table (only if both are present)
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

        // ONLY update the summary table when BOTH bills are generated
        if (job.agency_invoice_no && job.reimbursement_invoice_no) {
            const [giaBill, girBill] = await Promise.all([
                BillModel.findOne({ jobId, type: 'GIA' }),
                BillModel.findOne({ jobId, type: 'GIR' })
            ]);

            // Helper to format date for datetime-local input (YYYY-MM-DDTHH:MM)
            const formatDate = (date) => {
                if (!date) return "";
                const d = new Date(date);
                // Adjust to local time string for the input field
                return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16);
            };

            // Calculate totals from both bills
            const giaAmt = giaBill?.finalTotal || 0;
            const girAmt = girBill?.finalTotal || 0;

            job.bill_no = `${job.agency_invoice_no},${job.reimbursement_invoice_no}`;
            job.bill_date = `${formatDate(giaBill?.generatedAt)},${formatDate(girBill?.generatedAt)}`;
            job.bill_amount = `${giaAmt},${girAmt}`;

            await job.save();
        }
    } catch (err) {
        console.error("Error syncing job billing info:", err);
    }
}

export default router;
