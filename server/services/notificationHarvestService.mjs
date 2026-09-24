import ItemDutyNotificationModel from "../model/notifications/itemDutyNotificationModel.mjs";
import OtherDutiesNotificationModel from "../model/notifications/otherDutiesNotificationModel.mjs";
import OtherDutiesANotificationModel from "../model/notifications/otherDutiesANotificationModel.mjs";
import JobModel from "../model/jobModel.mjs";
import logger from "../logger.js";

/**
 * Standardize Notification Number (e.g. "50/2017" -> "050/2017", trim, uppercase)
 */
export const normalizeNotnNo = (raw) => {
  if (!raw) return "";
  let val = String(raw).trim().toUpperCase();
  const match = val.match(/^(\d+)\/(\d{4})(.*)$/);
  if (match) {
    const num = match[1].padStart(3, "0");
    const year = match[2];
    const rest = match[3] || "";
    return `${num}/${year}${rest}`;
  }
  return val;
};

/**
 * Standardize Serial Number
 */
export const normalizeSrNo = (raw) => {
  if (raw === undefined || raw === null) return "N/A";
  const val = String(raw).trim();
  if (val === "" || val === "0" || val === "-" || val.toUpperCase() === "N/A" || val.toUpperCase() === "NONE") {
    return "N/A";
  }
  return val;
};

/**
 * Parse numeric rate from string or number
 */
export const parseRate = (val) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/,/g, "").replace(/%/g, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

/**
 * Process a single notification entry into the corresponding model
 */
async function processNotificationEntry(Model, entryData, meta) {
  const { notn_no, notn_sno, duty_head, cth_code, rate, duty_flag, description, coo, compliance_tags } = entryData;
  const { jobNo, boeNo } = meta;

  const filter = {
    notn_no,
    notn_sno,
    duty_head,
    cth_code: cth_code || "ALL"
  };

  const existing = await Model.findOne(filter);

  if (!existing) {
    await Model.create({
      ...filter,
      current_rate: rate,
      rate_type: "PERCENTAGE",
      unit: "%",
      current_duty_flag: duty_flag || "",
      description: description || "",
      coo: coo || "ALL",
      compliance_tags: compliance_tags || [],
      rate_history: [
        {
          rate,
          duty_flag: duty_flag || "",
          observed_from: new Date(),
          source_boe_no: boeNo || "",
          source_job_no: jobNo || "",
          remarks: "Initial rate observed during ingestion"
        }
      ],
      has_rate_variance: false,
      variance_status: "STABLE",
      is_auto_harvested: true,
      usage_count: 1,
      last_used_in_job: jobNo || "",
      last_used_date: new Date(),
      source_job_refs: jobNo ? [jobNo] : []
    });
  } else {
    const updateOps = {
      $inc: { usage_count: 1 },
      $set: {
        last_used_date: new Date(),
        ...(jobNo && { last_used_in_job: jobNo })
      }
    };

    if (jobNo && !existing.source_job_refs.includes(jobNo)) {
      updateOps.$addToSet = { source_job_refs: jobNo };
    }

    if (description && !existing.description) {
      updateOps.$set.description = description;
    }

    const rateDiff = Math.abs(existing.current_rate - rate) > 0.001;
    const flagDiff = (duty_flag || "") !== (existing.current_duty_flag || "");

    if (rateDiff || flagDiff) {
      updateOps.$set.current_rate = rate;
      updateOps.$set.current_duty_flag = duty_flag || "";
      updateOps.$set.has_rate_variance = true;
      updateOps.$set.variance_status = existing.variance_status === "AMENDED_VERIFIED" ? "AMENDED_VERIFIED" : "CONFLICT_FLAGGED";

      const historyEntry = {
        rate,
        duty_flag: duty_flag || "",
        observed_from: new Date(),
        source_boe_no: boeNo || "",
        source_job_no: jobNo || "",
        remarks: `Observed rate update: ${existing.current_rate} -> ${rate}`
      };

      if (!updateOps.$push) updateOps.$push = {};
      updateOps.$push.rate_history = historyEntry;
    }

    await Model.updateOne(filter, updateOps);
  }
}

/**
 * Main Harvester function: Extracts all Part-III duties into Sections B, C, and D directories
 */
export async function harvestPartIIIDuties({ partIIIDuties = [], jobNo = "", boeNo = "" }) {
  if (!Array.isArray(partIIIDuties) || partIIIDuties.length === 0) {
    return { success: true, count: 0 };
  }

  let totalHarvested = 0;

  try {
    for (const item of partIIIDuties) {
      const itemDetails = item.ItemDetails || {};
      const cthCode = itemDetails.CTH ? String(itemDetails.CTH).trim() : "ALL";
      const description = itemDetails["ITEM DESCRIPTION"] ? String(itemDetails["ITEM DESCRIPTION"]).trim() : "";
      const coo = itemDetails.COO ? String(itemDetails.COO).trim() : "ALL";

      const complianceTags = [];
      if (itemDetails.FS && itemDetails.FS !== "N") complianceTags.push(`FS: ${itemDetails.FS}`);
      if (itemDetails.PQ && itemDetails.PQ !== "N") complianceTags.push(`PQ: ${itemDetails.PQ}`);
      if (itemDetails.AQ && itemDetails.AQ !== "N") complianceTags.push(`AQ: ${itemDetails.AQ}`);
      if (itemDetails.DC && itemDetails.DC !== "N") complianceTags.push(`DC: ${itemDetails.DC}`);
      if (itemDetails.WC && itemDetails.WC !== "N") complianceTags.push(`WC: ${itemDetails.WC}`);
      if (itemDetails["END USE"]) complianceTags.push(`EndUse: ${itemDetails["END USE"]}`);

      const meta = { jobNo, boeNo };

      // 1. Process Section B: Item Duty
      const itemDuty = item.ItemDuty || {};
      for (const [dutyHeadKey, dutyObj] of Object.entries(itemDuty)) {
        if (!dutyObj || typeof dutyObj !== "object") continue;
        const rawNotn = dutyObj.NOTN_NO;
        if (!rawNotn || String(rawNotn).trim() === "" || String(rawNotn).trim() === "-") continue;

        const notn_no = normalizeNotnNo(rawNotn);
        const notn_sno = normalizeSrNo(dutyObj.NOTN_SNO);
        const rate = parseRate(dutyObj.RATE);
        const duty_flag = dutyObj.DUTY_FG ? String(dutyObj.DUTY_FG).trim() : "";

        await processNotificationEntry(
          ItemDutyNotificationModel,
          {
            notn_no,
            notn_sno,
            duty_head: dutyHeadKey.toUpperCase().trim(),
            cth_code: cthCode,
            rate,
            duty_flag,
            description,
            coo,
            compliance_tags: complianceTags
          },
          meta
        );
        totalHarvested++;
      }

      // 2. Process Section C: Other Duties
      const otherDuties = item.OtherDuties || {};
      for (const [dutyHeadKey, dutyObj] of Object.entries(otherDuties)) {
        if (!dutyObj || typeof dutyObj !== "object") continue;
        const rawNotn = dutyObj.NOTN_NO;
        if (!rawNotn || String(rawNotn).trim() === "" || String(rawNotn).trim() === "-") continue;

        const notn_no = normalizeNotnNo(rawNotn);
        const notn_sno = normalizeSrNo(dutyObj.NOTN_SNO);
        const rate = parseRate(dutyObj.RATE);
        const duty_flag = dutyObj.DUTY_FG ? String(dutyObj.DUTY_FG).trim() : "";

        await processNotificationEntry(
          OtherDutiesNotificationModel,
          {
            notn_no,
            notn_sno,
            duty_head: dutyHeadKey.toUpperCase().trim(),
            cth_code: cthCode,
            rate,
            duty_flag,
            description,
            coo,
            compliance_tags: complianceTags
          },
          meta
        );
        totalHarvested++;
      }

      // 3. Process Section D: Other Duties - A
      const otherDutiesA = item.OtherDutiesA || {};
      for (const [dutyHeadKey, dutyObj] of Object.entries(otherDutiesA)) {
        if (!dutyObj || typeof dutyObj !== "object") continue;
        const rawNotn = dutyObj.NOTN_NO;
        if (!rawNotn || String(rawNotn).trim() === "" || String(rawNotn).trim() === "-") continue;

        const notn_no = normalizeNotnNo(rawNotn);
        const notn_sno = normalizeSrNo(dutyObj.NOTN_SNO);
        const rate = parseRate(dutyObj.RATE);
        const duty_flag = dutyObj.DUTY_FG ? String(dutyObj.DUTY_FG).trim() : "";

        await processNotificationEntry(
          OtherDutiesANotificationModel,
          {
            notn_no,
            notn_sno,
            duty_head: dutyHeadKey.toUpperCase().trim(),
            cth_code: cthCode,
            rate,
            duty_flag,
            description,
            coo,
            compliance_tags: complianceTags
          },
          meta
        );
        totalHarvested++;
      }
    }

    return { success: true, count: totalHarvested };
  } catch (err) {
    logger.error("Error during harvestPartIIIDuties:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Extract candidate BOE PDF URLs from a Job document
 */
export function extractCandidateBoeUrlsFromJob(job) {
  if (!job) return [];
  const list = [];
  const addUrl = (item) => {
    if (!item) return;
    const url = typeof item === "object" && item !== null ? item.url : item;
    if (typeof url === "string" && url.trim() !== "") {
      const clean = url.trim();
      if (!list.includes(clean)) {
        list.push(clean);
      }
    }
  };

  (job.processed_be_attachment || []).forEach(addUrl);
  (job.be_copy || []).forEach(addUrl);
  (job.ex_be_copy_documents || []).forEach(addUrl);
  (job.in_bond_be_copy || []).forEach(addUrl);
  (job.checklist || []).forEach(addUrl);
  (job.all_documents || []).forEach(addUrl);

  return list;
}

/**
 * Send a remote BOE file URL to the OCR microservice with timeout safety
 */
export async function runOcrOnBoeFileUrl(fileUrl) {
  const OCR_URL = process.env.BOE_OCR_URL || "http://3.108.244.38:8002/api/v1/upload";
  if (!fileUrl) return { success: false, message: "Empty fileUrl" };

  try {
    let fileName = fileUrl.split("/").pop().split("?")[0] || "bill_of_entry.pdf";
    try {
      fileName = decodeURIComponent(fileName);
    } catch (e) {
      // ignore
    }

    // 30s timeout for fetching S3 file
    const fetchRes = await fetch(fileUrl, { signal: AbortSignal.timeout(30000) });
    if (!fetchRes.ok) {
      return { success: false, message: `Failed to fetch file from S3: ${fetchRes.statusText}` };
    }

    const arrayBuffer = await fetchRes.arrayBuffer();
    const fileBlob = new Blob([arrayBuffer], { type: "application/pdf" });

    const formData = new FormData();
    formData.append("file", fileBlob, fileName);

    // 45s timeout for OCR microservice processing
    const ocrRes = await fetch(OCR_URL, {
      method: "POST",
      body: formData,
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(45000)
    });

    const ocrData = await ocrRes.json().catch(() => null);
    if (!ocrRes.ok || !ocrData || ocrData.status !== "success") {
      return { success: false, message: ocrData?.message || ocrData?.detail || `OCR failed with status ${ocrRes.status}` };
    }

    return { success: true, data: ocrData.data };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// ─── BACKGROUND SYNC RUNNER & LIVE PROGRESS STATE ──────────────────────────

let activeSyncState = {
  isRunning: false,
  shouldCancel: false,
  mode: "FAST_DUTIES_SYNC",
  year: "ALL",
  totalJobs: 0,
  processedJobs: 0,
  ocrProcessedCount: 0,
  harvestedEntries: 0,
  currentJobNo: "",
  startedAt: null,
  completedAt: null,
  status: "IDLE",
  message: "",
  error: null
};

export function getActiveSyncProgress() {
  const percent = activeSyncState.totalJobs > 0
    ? Math.min(100, Math.round((activeSyncState.processedJobs / activeSyncState.totalJobs) * 1000) / 10)
    : 0;

  return {
    ...activeSyncState,
    percent
  };
}

export function cancelActiveSync() {
  if (activeSyncState.isRunning) {
    activeSyncState.shouldCancel = true;
    activeSyncState.message = "Cancelling sync...";
    return { success: true, message: "Sync cancellation requested." };
  }
  return { success: false, message: "No active sync is running." };
}

export async function startBackgroundSync({ mode = "FAST_DUTIES_SYNC", year = "ALL", batchLimit = "ALL" }) {
  if (activeSyncState.isRunning) {
    return { success: false, message: "A sync operation is already running in the background." };
  }

  activeSyncState = {
    isRunning: true,
    shouldCancel: false,
    mode,
    year,
    totalJobs: 0,
    processedJobs: 0,
    ocrProcessedCount: 0,
    harvestedEntries: 0,
    currentJobNo: "",
    startedAt: new Date(),
    completedAt: null,
    status: "RUNNING",
    message: "Initializing background sync...",
    error: null
  };

  // Run asynchronously in the background
  (async () => {
    try {
      const baseFilter = {};
      if (year && year !== "ALL") {
        baseFilter.year = year;
      }

      let query = {};
      if (mode === "FAST_DUTIES_SYNC") {
        query = {
          ...baseFilter,
          $or: [
            { "PartIIIDuties.0": { $exists: true } },
            { "part_iii_duties.0": { $exists: true } }
          ]
        };
      } else {
        query = {
          ...baseFilter,
          $or: [
            { "processed_be_attachment.0": { $exists: true } },
            { "be_copy.0": { $exists: true } },
            { "ex_be_copy_documents.0": { $exists: true } },
            { "in_bond_be_copy.0": { $exists: true } }
          ]
        };
      }

      const totalMatching = await JobModel.countDocuments(query);
      activeSyncState.totalJobs = (batchLimit && batchLimit !== "ALL")
        ? Math.min(parseInt(batchLimit, 10) || totalMatching, totalMatching)
        : totalMatching;

      activeSyncState.message = `Processing ${activeSyncState.totalJobs} jobs for ${year === "ALL" ? "All Years" : `Year ${year}`}...`;

      let dbQuery = JobModel.find(query, {
        job_no: 1,
        be_no: 1,
        year: 1,
        processed_be_attachment: 1,
        be_copy: 1,
        ex_be_copy_documents: 1,
        in_bond_be_copy: 1,
        checklist: 1,
        all_documents: 1,
        PartIIIDuties: 1,
        part_iii_duties: 1
      }).lean();

      if (batchLimit && batchLimit !== "ALL") {
        const num = parseInt(batchLimit, 10);
        if (!isNaN(num) && num > 0) {
          dbQuery = dbQuery.limit(num);
        }
      }

      const cursor = dbQuery.cursor({ batchSize: 50 });

      for await (const job of cursor) {
        if (activeSyncState.shouldCancel) {
          activeSyncState.status = "CANCELLED";
          activeSyncState.message = `Sync cancelled by user after processing ${activeSyncState.processedJobs} jobs.`;
          break;
        }

        activeSyncState.currentJobNo = job.job_no || "";

        try {
          const existingDuties = (job.PartIIIDuties && Array.isArray(job.PartIIIDuties) && job.PartIIIDuties.length > 0)
            ? job.PartIIIDuties
            : (job.part_iii_duties && Array.isArray(job.part_iii_duties) && job.part_iii_duties.length > 0)
              ? job.part_iii_duties
              : null;

          if (existingDuties) {
            const result = await harvestPartIIIDuties({
              partIIIDuties: existingDuties,
              jobNo: job.job_no || "",
              boeNo: job.be_no || ""
            });
            if (result.success) {
              activeSyncState.harvestedEntries += result.count;
            }
          } else if (mode === "DEEP_BOE_FILE_SYNC") {
            const urls = extractCandidateBoeUrlsFromJob(job);
            if (urls.length > 0) {
              const primaryUrl = urls[0];
              const ocrRes = await runOcrOnBoeFileUrl(primaryUrl);
              if (ocrRes.success && ocrRes.data?.PartIIIDuties) {
                const extractedDuties = ocrRes.data.PartIIIDuties;

                await JobModel.updateOne(
                  { _id: job._id },
                  {
                    $set: {
                      PartIIIDuties: extractedDuties,
                      part_iii_duties: extractedDuties
                    }
                  }
                );

                const result = await harvestPartIIIDuties({
                  partIIIDuties: extractedDuties,
                  jobNo: job.job_no || "",
                  boeNo: job.be_no || ocrRes.data?.be_no || ""
                });

                if (result.success) {
                  activeSyncState.harvestedEntries += result.count;
                  activeSyncState.ocrProcessedCount++;
                }
              }
            }
          }
        } catch (jobErr) {
          logger.error(`Error syncing job ${job.job_no}:`, jobErr);
        } finally {
          activeSyncState.processedJobs++;
        }
      }

      if (activeSyncState.status !== "CANCELLED") {
        activeSyncState.status = "COMPLETED";
        activeSyncState.message = `Sync Completed: Processed ${activeSyncState.processedJobs} jobs, parsed ${activeSyncState.ocrProcessedCount} BOE files, and harvested ${activeSyncState.harvestedEntries} notification rules.`;
      }
    } catch (err) {
      logger.error("Background sync fatal error:", err);
      activeSyncState.status = "ERROR";
      activeSyncState.error = err.message;
      activeSyncState.message = `Sync encountered an error: ${err.message}`;
    } finally {
      activeSyncState.isRunning = false;
      activeSyncState.completedAt = new Date();
    }
  })();

  return { success: true, message: "Background sync started successfully." };
}
