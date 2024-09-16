import express from "express";
import JobModel from "../../model/jobModel.mjs";
const router = express.Router();

router.post("/api/update-do-planning", async (req, res) => {
  try {
    const currentDate = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    // Fetch the existing job document
    const existingJob = await JobModel.findOne({ _id: req.body._id });
    if (!existingJob) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const updateFields = {
      ...req.body,
      kyc_date: currentDate,
      payment_made_date: currentDate,
      do_processed_date: currentDate,
      shipping_line_invoice_date: currentDate,
      other_invoices_date: currentDate,
      do_validity: req.body.do_validity,
      do_processed: req.body.do_processed,
    };

    // Update fields
    Object.assign(existingJob, updateFields);

    // Save the updated job document
    await existingJob.save();

    return res.json({ message: "Details submitted" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
