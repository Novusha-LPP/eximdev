import express from "express";
import JobModel from "../../model/jobModel.mjs"; // Import your JobModel

const router = express.Router();

// PATCH route for updating billing details
router.patch("/api/update-do-billing/:id", async (req, res) => {
  const { id } = req.params; // Extract job ID from URL params
  const {
    icd_cfs_invoice,
    icd_cfs_invoice_img,
    other_invoices_img,
    shipping_line_invoice_imgs,
    bill_document_sent_to_accounts,
  } = req.body; // Extract fields from request body

  try {
    // Find the existing job document by ID
    const job = await JobModel.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    // Update fields only if they are provided
    if (typeof icd_cfs_invoice !== "undefined") {
      job.icd_cfs_invoice = icd_cfs_invoice;
    }
    if (Array.isArray(icd_cfs_invoice_img)) {
      job.icd_cfs_invoice_img = icd_cfs_invoice_img;
    }
    if (Array.isArray(other_invoices_img)) {
      job.other_invoices_img = other_invoices_img;
    }
    if (Array.isArray(shipping_line_invoice_imgs)) {
      job.shipping_line_invoice_imgs = shipping_line_invoice_imgs;
    }
    if (bill_document_sent_to_accounts) {
      job.bill_document_sent_to_accounts = bill_document_sent_to_accounts;
    }

    // Save the updated job document to the database
    const updatedJob = await job.save();

    return res.status(200).json({
      success: true,
      message: "Billing details updated successfully",
      updatedJob,
    });
  } catch (error) {
    console.error("Error updating billing details:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

export default router;
