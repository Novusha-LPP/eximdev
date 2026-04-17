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

        const bill = await BillModel.findOneAndUpdate(
            { jobId, type },
            { 
                billNo, 
                rows, 
                editableFields,
                ...totals,
                lastSaved: new Date()
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: "Bill saved successfully", data: bill });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * Endpoint to generate a unique invoice number for a job
 */
router.post('/generate-invoice-number', async (req, res) => {
    const { jobId, type } = req.body;

    if (!jobId || !type) {
        return res.status(400).json({ success: false, message: "Missing jobId or type" });
    }

    try {
        const job = await JobModel.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found" });
        }

        const fieldName = type === 'GIA' ? 'agency_invoice_no' : 'reimbursement_invoice_no';
        if (job[fieldName]) {
            return res.json({ success: true, invoiceNo: job[fieldName], alreadyExists: true });
        }

        const fy = job.year || job.financial_year || "24-25";
        const sequence = await getNextSequence(type, fy);
        const paddedSequence = sequence.toString().padStart(4, '0');
        const invoiceNo = `${type}/${paddedSequence}/${fy}`;

        job[fieldName] = invoiceNo;
        await job.save();

        res.json({ success: true, invoiceNo });
    } catch (err) {
        console.error("Error generating invoice number:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;
