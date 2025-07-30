import express from 'express';
import JobModel from '../../model/jobModel.mjs';

const router = express.Router();

// GET /api/charges-section/job-details?year=YYYY&job_no=XXX
router.get('/api/charges-section/job-details', async (req, res) => {
  try {
    const { year, job_no } = req.query;
    if (!year || !job_no) {
      return res.status(400).json({ success: false, message: 'year and job_no are required.' });
    }

    // Find the job by year and job_no
    const job = await JobModel.findOne({ year, job_no })
      .select({
        chargesDetails: 1,
        esanchitCharges: 1,
        do_shipping_line_invoice: 1,
        insurance_copy: 1,
        other_do_documents: 1,
        security_deposit: 1,
        job_no: 1,
        year: 1,
        _id: 0
      })
      .lean();

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    return res.json({ success: true, data: job });
  } catch (err) {
    console.error('Error fetching job charges details:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

export default router;
