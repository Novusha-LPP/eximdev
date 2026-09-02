/**
 * rodtepService.mjs
 * 
 * Manages validation of RODTEP scrip utilization on job creation/updating.
 */

import JobModel from "../model/jobModel.mjs";
import RodtepModel from "../model/rodtepModel.mjs";

/**
 * Validates RODTEP scrip utilization before saving/updating a job.
 * Throws an error if validation fails.
 */
export async function validateRodtepUtilization(descriptionDetails, currentJobId = null, jobExrate = 84, session = null) {
  if (!descriptionDetails || !Array.isArray(descriptionDetails)) return;

  const exrate = parseFloat(jobExrate) || 84;
  
  // Group the current job's requested amounts by rodtep scrip number
  const currentJobDemands = {};
  for (let i = 0; i < descriptionDetails.length; i++) {
    const row = descriptionDetails[i];
    if (!row.rodtep || !row.rodtep.trim()) continue;

    const rodtepNo = row.rodtep.trim();
    const rawAmount = parseFloat(row.amount) || 0;
    const amtCurrency = row.amount_currency || "USD";
    const amtInr = amtCurrency === "INR" ? rawAmount : rawAmount * exrate;

    currentJobDemands[rodtepNo] = (currentJobDemands[rodtepNo] || 0) + amtInr;
  }

  // Validate each scrip requested
  for (const [rodtepNo, requestedAmtInr] of Object.entries(currentJobDemands)) {
    // Find the RODTEP record
    const scrip = await RodtepModel.findOne({ rodtep: rodtepNo }).session(session);
    if (!scrip) {
      throw new Error(`RODTEP Scrip "${rodtepNo}" does not exist in DGFT RODTEP Details.`);
    }

    // Check expiry
    if (scrip.expiry_date) {
      const parts = scrip.expiry_date.split("/");
      let expiry;
      if (parts.length === 3) {
        const [dd, mm, yyyy] = parts;
        expiry = new Date(`${yyyy}-${mm}-${dd}T23:59:59`);
      } else {
        expiry = new Date(scrip.expiry_date);
      }

      if (!isNaN(expiry.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (today > expiry) {
          throw new Error(`RODTEP Scrip "${rodtepNo}" has expired on ${scrip.expiry_date}.`);
        }
      }
    }

    // Find other jobs utilizing this RODTEP
    const query = {
      _id: { $ne: currentJobId },
      "description_details.rodtep": rodtepNo
    };

    const otherJobs = await JobModel.find(query)
      .select("exrate description_details")
      .session(session)
      .lean();

    let otherUtilizedInr = 0;
    for (const job of otherJobs) {
      const jobEx = parseFloat(job.exrate) || 84;
      for (const row of job.description_details) {
        if (row.rodtep === rodtepNo) {
          const amt = parseFloat(row.amount) || 0;
          const amtInr = row.amount_currency === "INR" ? amt : amt * jobEx;
          otherUtilizedInr += amtInr;
        }
      }
    }

    const totalDemanded = otherUtilizedInr + requestedAmtInr;
    if (totalDemanded > scrip.value_inr) {
      throw new Error(`Utilized RODTEP amount exceeds scrip value (Scrip Value: ₹${scrip.value_inr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, Utilized: ₹${Math.round(totalDemanded * 100) / 100}).`);
    }
  }
}
