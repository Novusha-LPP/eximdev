import { STATUS_RANK_MAP } from "../server/utils/jobRanking.mjs";

const parseDateString = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return null;
    const clean = dateStr.trim();
    if (!clean) return null;
    let d = new Date(clean);
    if (!isNaN(d.getTime())) return d;
    const ddmmyyyyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyyMatch) {
        const [, day, month, year] = ddmmyyyyMatch;
        d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        if (!isNaN(d.getTime())) return d;
    }
    return null;
};

const getJobSortDate = (job) => {
    if (!job) return new Date("9999-12-31T23:59:59.999Z");
    const etaStr = job.vessel_berthing || job.eta || job.eta_date;
    if (etaStr) {
        const parsedEta = parseDateString(etaStr);
        if (parsedEta) return parsedEta;
    }
    if (job.job_date) {
        const parsedJobDate = parseDateString(job.job_date);
        if (parsedJobDate) return parsedJobDate;
    }
    if (job.createdAt) {
        const parsedCreatedAt = parseDateString(job.createdAt);
        if (parsedCreatedAt) return parsedCreatedAt;
    }
    return new Date("9999-12-31T23:59:59.999Z");
};

const sampleJobs = [
  { job_no: "FCL_CCC_ETA_AUG03", consignment_type: "FCL", detailed_status: "Custom Clearance Completed", vessel_berthing: "2026-08-03" },
  { job_no: "FCL_BILLING_ETA_AUG21", consignment_type: "FCL", detailed_status: "Billing Pending", vessel_berthing: "2026-08-21" },
  { job_no: "FCL_BILLING_ETA_AUG10", consignment_type: "FCL", detailed_status: "Billing Pending", vessel_berthing: "2026-08-10" },
  { job_no: "LCL_ETA_AUG15", consignment_type: "LCL", detailed_status: "Custom Clearance Completed", vessel_berthing: "2026-08-15" },
  { job_no: "LCL_BILLING_ETA_AUG25", consignment_type: "LCL", detailed_status: "Billing Pending", vessel_berthing: "2026-08-25" },
  { job_no: "LCL_BILLING_ETA_AUG05", consignment_type: "LCL", detailed_status: "Billing Pending", vessel_berthing: "2026-08-05" },
];

// Nested sorting logic:
// Level 1: LCL first (isLcl = 0)
// Level 2: status_rank (Billing Pending = 1, DO Completed = 2, Custom Clearance Completed = 3 ...)
// Level 3: oldest ETA / sort date first
sampleJobs.sort((a, b) => {
    const isLclA = String(a.consignment_type).toUpperCase() === "LCL" ? 0 : 1;
    const isLclB = String(b.consignment_type).toUpperCase() === "LCL" ? 0 : 1;
    if (isLclA !== isLclB) return isLclA - isLclB;

    const rankA = STATUS_RANK_MAP[a.detailed_status]?.rank || 999;
    const rankB = STATUS_RANK_MAP[b.detailed_status]?.rank || 999;
    if (rankA !== rankB) return rankA - rankB;

    const dateA = getJobSortDate(a).getTime();
    const dateB = getJobSortDate(b).getTime();
    return dateA - dateB;
});

console.log("Nested Sorted Jobs Order:");
sampleJobs.forEach((j, i) => {
    const rank = STATUS_RANK_MAP[j.detailed_status]?.rank;
    console.log(`#${i+1}: ${j.job_no} | Type: ${j.consignment_type} | Status: ${j.detailed_status} (Rank ${rank}) | ETA: ${j.vessel_berthing}`);
});
