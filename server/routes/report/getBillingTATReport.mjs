import express from "express";
import JobModel from "../../model/jobModel.mjs";
import logger from "../../logger.js";
import { getBranchMatch } from "../../utils/branchFilter.mjs";

const router = express.Router();

router.get("/api/report/billing-tat", async (req, res) => {
  try {
    const { branchId, category, year, month, startDate, endDate } = req.query;
    const branchMatch = getBranchMatch(branchId, category);

    // Fetch jobs that have either bill_date or billing_completed_date set
    const baseFilter = {
      ...branchMatch,
      $or: [
        { bill_date: { $exists: true, $ne: "", $ne: null } },
        { billing_completed_date: { $exists: true, $ne: "", $ne: null } }
      ]
    };

    if (year) {
      baseFilter.year = year;
    }

    const jobs = await JobModel.find(baseFilter)
      .select("job_number job_no year importer custom_house mode branch_code consignment_type container_nos delivery_completed_date bill_document_sent_to_accounts billing_confirmation_date billing_completed_date bill_date")
      .lean();

    const calculateDaysDiff = (start, end) => {
      if (!start || !end) return null;
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
      const diffTime = endDate - startDate;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays < 0 ? 0 : parseFloat(diffDays.toFixed(2));
    };

    const toYMD = (dateStr) => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const processedJobs = jobs.map(job => {
      // 1. Get Delivery Completed Date
      let deliveryDate = job.delivery_completed_date || null;
      if (!deliveryDate && job.container_nos && job.container_nos.length > 0) {
        const isLCL = job.consignment_type === "LCL";
        const key = isLCL ? "delivery_date" : "emptyContainerOffLoadDate";
        const allHaveDate = job.container_nos.every(c => c[key]);
        if (allHaveDate) {
          deliveryDate = job.container_nos[job.container_nos.length - 1][key];
        }
      }

      // 2. Get DO Sent to Billing Date
      const sentToBillingDate = job.bill_document_sent_to_accounts || null;

      // 3. Get Billing Confirmation Date
      const billingConfirmationDate = job.billing_confirmation_date || null;

      // 4. Get Bill Date
      let finalBillDate = job.billing_completed_date || null;
      if (!finalBillDate && job.bill_date) {
        const dates = job.bill_date.split(",").map(d => d.trim()).filter(Boolean);
        if (dates.length > 0) {
          finalBillDate = dates[0];
        }
      }

      // 5. Calculate TATs in days
      const tatDeliveryToSent = calculateDaysDiff(deliveryDate, sentToBillingDate);
      const tatSentToConfirm = calculateDaysDiff(sentToBillingDate, billingConfirmationDate);
      const tatConfirmToBill = calculateDaysDiff(billingConfirmationDate, finalBillDate);
      const totalTat = calculateDaysDiff(deliveryDate, finalBillDate);

      return {
        job_no: job.job_no,
        job_number: job.job_number,
        importer: job.importer,
        custom_house: job.custom_house,
        mode: job.mode,
        branch_code: job.branch_code,
        year: job.year,
        deliveryDate: deliveryDate ? toYMD(deliveryDate) : null,
        sentToBillingDate: sentToBillingDate ? toYMD(sentToBillingDate) : null,
        billingConfirmationDate: billingConfirmationDate ? toYMD(billingConfirmationDate) : null,
        billDate: finalBillDate ? toYMD(finalBillDate) : null,
        tatDeliveryToSent,
        tatSentToConfirm,
        tatConfirmToBill,
        totalTat
      };
    });

    // Filter jobs based on month or daily/date range query
    const filteredJobs = processedJobs.filter(job => {
      if (!job.billDate) return false;

      // Monthly filter: YYYY-MM
      if (month) {
        return job.billDate.startsWith(month);
      }

      // Daily filter: specific date or range
      if (startDate && endDate) {
        return job.billDate >= startDate && job.billDate <= endDate;
      } else if (startDate) {
        return job.billDate === startDate;
      }

      // If no date filters, return all billed jobs
      return true;
    });

    res.status(200).json({
      success: true,
      data: filteredJobs,
      count: filteredJobs.length
    });

  } catch (error) {
    logger.error("Error fetching billing TAT report:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching billing TAT report",
      error: error.message
    });
  }
});

export default router;
