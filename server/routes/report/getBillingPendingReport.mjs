import express from "express";
import JobModel from "../../model/jobModel.mjs";
import logger from "../../logger.js";

const router = express.Router();

router.get("/api/report/billing-pending", async (req, res) => {
  try {    // Find jobs where billing is pending
    // Only return jobs with year: '25-26', status: 'Pending', and detailed_status: 'Billing Pending'
    const jobs = await JobModel.find({
      year: "25-26",
      status: "Pending",
      detailed_status: "Billing Pending"
    })
    .select("job_no importer awb_bl_no awb_bl_date custom_house container_nos detailed_status be_no be_date out_of_charge billing_completed_date year")
    .sort({ job_no: 1 });

    // Calculate additional fields for each job
    const processedJobs = jobs.map(job => {
      // Calculate pending amount (this is a placeholder - adjust based on your business logic)
      const pendingAmount = calculatePendingAmount(job);
      
      // Calculate days pending
      const daysPending = calculateDaysPending(job);
      
      // Determine status
      const status = determineBillingStatus(job, daysPending);
      
      // Set due date (adjust based on your business logic)
      const dueDate = calculateDueDate(job);

      return {
        job_no: job.job_no,
        importer: job.importer,
        awb_bl_no: job.awb_bl_no,
        awb_bl_date: job.awb_bl_date,
        custom_house: job.custom_house,
        be_no: job.be_no,
        be_date: job.be_date,};
    });

    // Filter out jobs that don't actually need billing
    const filteredJobs = processedJobs.filter(job => job.pending_amount > 0 || job.status === 'pending');

    logger.info(`Billing pending report fetched successfully. Found ${filteredJobs.length} jobs with pending billing.`);
    
    res.status(200).json({
      success: true,
      data: filteredJobs,
      count: filteredJobs.length
    });
  } catch (error) {
    logger.error("Error fetching billing pending report:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching billing pending report",
      error: error.message
    });
  }
});

// Helper functions
function calculatePendingAmount(job) {
  // This is a placeholder calculation
  // You should implement this based on your actual billing logic
  // For example, you might calculate based on container charges, duties, etc.
  
  if (job.container_nos && job.container_nos.length > 0) {
    // Sample calculation: ₹5000 per container
    return job.container_nos.length * 5000;
  }
  
  // Default pending amount if no specific calculation is available
  return Math.floor(Math.random() * 50000) + 10000; // Random amount between 10k-60k for demo
}

function calculateDaysPending(job) {
  // Calculate days since job completion or BE date
  let referenceDate = null;
  
  if (job.out_of_charge) {
    referenceDate = new Date(job.out_of_charge);
  } else if (job.be_date) {
    referenceDate = new Date(job.be_date);
  } else if (job.awb_bl_date) {
    referenceDate = new Date(job.awb_bl_date);
  } else {
    return 0;
  }
  
  const currentDate = new Date();
  const diffTime = Math.abs(currentDate - referenceDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

function determineBillingStatus(job, daysPending) {
  if (daysPending > 30) {
    return 'overdue';
  } else if (daysPending > 15) {
    return 'urgent';
  } else if (!job.billing_completed_date) {
    return 'pending';
  } else {
    return job.detailed_status || 'pending';
  }
}

function calculateDueDate(job) {
  // Calculate due date (e.g., 15 days from out of charge or BE date)
  let referenceDate = null;
  
  if (job.out_of_charge) {
    referenceDate = new Date(job.out_of_charge);
  } else if (job.be_date) {
    referenceDate = new Date(job.be_date);
  } else if (job.awb_bl_date) {
    referenceDate = new Date(job.awb_bl_date);
  } else {
    return null;
  }
  
  const dueDate = new Date(referenceDate);
  dueDate.setDate(dueDate.getDate() + 15); // 15 days from reference date
  
  return dueDate;
}

export default router;
