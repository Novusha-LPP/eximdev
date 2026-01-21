import express from 'express';
// JobModel is now attached to req by branchJobMiddleware
import KycDocumentsModel from '../../model/kycDocumentsModel.mjs';

const router = express.Router();

// GET /api/charges-section/job-details?year=YYYY&job_no=XXX
router.get('/api/charges-section/job-details', async (req, res) => {
  try {
    // Use req.JobModel (attached by branchJobMiddleware) for branch-specific collection
    const JobModel = req.JobModel;

    const { year, job_no } = req.query;
    if (!year || !job_no) {
      return res.status(400).json({ success: false, message: 'year and job_no are required.' });
    }

    // Find the job by year and job_no
    const job = await JobModel.findOne({ year, job_no })
      .select({
        DsrCharges: 1,
        esanchitCharges: 1,
        do_shipping_line_invoice: 1,
        insurance_copy: 1,
        other_do_documents: 1,
        security_deposit: 1,
        job_no: 1,
        year: 1,
        importer: 1, // Add importer field
        shipping_line_airline: 1, // Add shipping line field
        _id: 0
      })
      .lean();

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    // Find KYC document by matching importer and shipping line
    const kycDocuments = await KycDocumentsModel.findOne({
      importer: job.importer,
      shipping_line_airline: job.shipping_line_airline
    })
      .select({
        shipping_line_bond_charges: 1,
        shipping_line_bond_valid_upto: 1,
        shipping_line_bond_docs: 1,
        importer: 1,
        shipping_line_airline: 1,
        _id: 0
      })
      .lean();

    const responseData = {
      ...job,
      shipping_line_bond_charges: kycDocuments?.shipping_line_bond_charges || '',
      shipping_line_bond_valid_upto: kycDocuments?.shipping_line_bond_valid_upto || '',
      shipping_line_bond_docs: kycDocuments?.shipping_line_bond_docs || []
    }

    return res.json({ success: true, data: responseData });
  } catch (err) {
    console.error('Error fetching job charges details:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

export default router;