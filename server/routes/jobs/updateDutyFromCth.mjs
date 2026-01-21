import { Router } from 'express';
// JobModel is now attached to req by branchJobMiddleware
import CthModel from '../../model/cthDocumentsModel.mjs';

const router = Router();

// PATCH API to update job with duty details from CTH collection
router.patch('/jobs/:jobId/update-duty-from-cth', async (req, res) => {
  try {
    // Use req.JobModel (attached by branchJobMiddleware) for branch-specific collection
    const JobModel = req.JobModel;

    const { jobId } = req.params;
    const { cth_no } = req.body;

    if (!jobId || !cth_no) {
      return res.status(400).json({ message: 'Job ID and CTH Number are required' });
    }

    // Find the job by job_no
    const job = await JobModel.findOne({ job_no: jobId });
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Find the CTH document
    const cthDocument = await CthModel.findOne({ hs_code: cth_no });
    if (!cthDocument) {
      return res.status(404).json({ message: 'CTH document not found' });
    }

    // Extract values from the CTH document
    const { basic_duty_sch, basic_duty_ntfn, igst, sws_10_percent } = cthDocument;    // Calculate bcd_ammount (ALWAYS prioritize basic_duty_ntfn, fallback to basic_duty_sch only if basic_duty_ntfn is invalid)
    let cth_bcd_ammount = '';

    // Check if basic_duty_ntfn exists and is a valid number (including "0")
    const isBasicDutyNtfnPresent = basic_duty_ntfn !== null &&
      basic_duty_ntfn !== undefined &&
      basic_duty_ntfn !== '' &&
      basic_duty_ntfn !== 'nan' &&
      basic_duty_ntfn !== 'NaN' &&
      !isNaN(parseFloat(basic_duty_ntfn));

    if (isBasicDutyNtfnPresent) {
      // ALWAYS use basic_duty_ntfn when it's present and valid (including "0")
      cth_bcd_ammount = basic_duty_ntfn;
    } else if (basic_duty_sch &&
      basic_duty_sch !== '' &&
      basic_duty_sch !== 'nan' &&
      basic_duty_sch !== 'NaN' &&
      !isNaN(parseFloat(basic_duty_sch))) {
      // Use basic_duty_sch only when basic_duty_ntfn is truly invalid/missing
      cth_bcd_ammount = basic_duty_sch;
    }

    // Add new fields to job (without overwriting existing ones)
    job.cth_basic_duty_sch = basic_duty_sch || '';
    job.cth_basic_duty_ntfn = basic_duty_ntfn || '';
    job.cth_igst_ammount = igst || '';
    job.cth_sws_ammount = sws_10_percent || '';
    job.cth_bcd_ammount = cth_bcd_ammount;

    // Save the updated job
    await job.save();

    return res.status(200).json({
      message: 'Job updated with new CTH-based duty fields successfully',
      addedFields: {
        cth_basic_duty_sch: basic_duty_sch,
        cth_basic_duty_ntfn: basic_duty_ntfn,
        cth_igst_ammount: igst,
        cth_sws_ammount: sws_10_percent,
        cth_bcd_ammount: cth_bcd_ammount
      }
    });
  } catch (error) {
    console.error('Error updating job with new CTH fields:', error);
    return res.status(500).json({
      message: 'Server error while adding CTH fields to job',
      error: error.message
    });
  }
});

export default router;
