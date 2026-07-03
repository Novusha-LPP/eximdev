/**
 * licenseUtilizationService.mjs
 * 
 * Manages validation, historical transaction creation, duplicate checking,
 * and balance recalculation for DGFT Authorization Licenses.
 */

import JobModel from "../model/jobModel.mjs";
import AuthorizationRegistrationModel from "../model/authorizationRegistrationModel.mjs";
import LicenseUtilizationModel from "../model/licenseUtilizationModel.mjs";
import CurrencyRate from "../model/CurrencyRate.mjs";
import AuditTrailModel from "../model/auditTrailModel.mjs";
import { getContext } from "../utils/context.mjs";

/**
 * Normalizes HS code by stripping all non-alphanumeric characters.
 */
export function normalizeHsCode(code) {
  if (!code) return "";
  return String(code).replace(/[^a-zA-Z0-9]/g, "");
}

/**
 * Converts a quantity between different units (e.g. KGS and MTS).
 */
export function convertQuantity(qty, fromUnit, toUnit) {
  const f = String(fromUnit || "").toLowerCase().trim().replace(/[^a-z]/g, "");
  const t = String(toUnit || "").toLowerCase().trim().replace(/[^a-z]/g, "");

  if (f === t) return qty;

  // KGS -> MTS
  if (
    (f === "kgs" || f === "kg" || f === "kilogram" || f === "kilograms") &&
    (t === "mts" || t === "mt" || t === "metricton" || t === "metrictons")
  ) {
    return qty / 1000;
  }

  // MTS -> KGS
  if (
    (f === "mts" || f === "mt" || f === "metricton" || f === "metrictons") &&
    (t === "kgs" || t === "kg" || t === "kilogram" || t === "kilograms")
  ) {
    return qty * 1000;
  }

  return qty;
}

/**
 * Get the latest USD import rate from CurrencyRate collection.
 * Falls back to 84 (approximate INR/USD) if not found.
 */
export async function getUsdImportRate() {
  try {
    const latest = await CurrencyRate.findOne({ is_active: true })
      .sort({ scraped_at: -1 })
      .lean();
    if (latest && latest.exchange_rates) {
      const usdRate = latest.exchange_rates.find(
        (r) => r.currency_code === "USD" || r.currency_code === "US DOLLAR"
      );
      if (usdRate && usdRate.import_rate) {
        return usdRate.import_rate;
      }
    }
  } catch (err) {
    console.error("[LicenseUtilization] Failed to get USD rate:", err.message);
  }
  return 84; // fallback
}

/**
 * Validates license utilization details before saving or updating a DSR job.
 * Throws an error with a descriptive message if validation fails.
 */
export async function validateLicenseUtilization(descriptionDetails, currentJobId = null, jobExrate = 84, fallbackUsdRate = 84, beNo = "", jobNo = "", session = null) {
  if (!descriptionDetails || !Array.isArray(descriptionDetails)) return;

  const effectiveExrate = parseFloat(jobExrate) || fallbackUsdRate || 84;

  for (let i = 0; i < descriptionDetails.length; i++) {
    const row = descriptionDetails[i];
    if (!row.license_no || !row.license_no.trim()) continue; // Skip rows without license

    const licenseNo = row.license_no.trim();
    const licenseSr = Number(row.license_sr) || 1;

    // A. Authorization exists
    const cleanedLicenseNo = String(licenseNo).replace(/^LIC\//i, "").trim();
    const auth = await AuthorizationRegistrationModel.findOne({
      $or: [
        { registration_no: licenseNo },
        { licence_no: licenseNo },
        { job_no: licenseNo },
        { job_no: cleanedLicenseNo }
      ]
    }).session(session);
    if (!auth) {
      throw new Error(`Row ${i + 1}: Authorization / License No "${licenseNo}" does not exist in DGFT Register.`);
    }

    // B. Authorization not expired (today <= import_validity)
    if (auth.import_validity) {
      const parts = auth.import_validity.split("/");
      if (parts.length === 3) {
        const [dd, mm, yyyy] = parts;
        const expiryDate = new Date(`${yyyy}-${mm}-${dd}T23:59:59`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (today > expiryDate) {
          throw new Error(`Row ${i + 1}: Authorization "${licenseNo}" has expired on ${auth.import_validity}.`);
        }
      }
    }

    // C. License SR exists
    const licenseItem = (auth.import_details_array || []).find((item, index) => {
      const itemSrNo = item.sr_no || (index + 1);
      return itemSrNo === licenseSr;
    });
    if (!licenseItem) {
      throw new Error(`Row ${i + 1}: Item Serial No. "${licenseSr}" does not exist under Authorization "${licenseNo}".`);
    }

    // D. HS Code matches (Disabled to allow saving when HS codes differ; the product HS code will still populate in utilization logs)
    // const dsrHs = normalizeHsCode(row.cth_no || row.hs_code);
    // const licHs = normalizeHsCode(licenseItem.hs_code);
    // if (dsrHs && licHs && dsrHs !== licHs) {
    //   throw new Error(`Row ${i + 1}: Selected License Item HS Code does not match Product HS Code. Please verify DGFT Authorization mapping.`);
    // }

    // Resolve both aliases for authorization record
    const searchNos = [licenseNo, cleanedLicenseNo];
    if (auth.registration_no) searchNos.push(auth.registration_no);
    if (auth.licence_no) searchNos.push(auth.licence_no);
    if (auth.job_no) {
      searchNos.push(auth.job_no);
      searchNos.push(`LIC/${auth.job_no}`);
      searchNos.push(`lic/${auth.job_no}`);
    }
    const uniqueSearchNos = [...new Set(searchNos.filter(n => n && n.trim() !== ""))];

    // E. Quantity available (check balance excluding this job)
    const requestedQty = parseFloat(row.quantity) || 0;
    const licensedQty = parseFloat(licenseItem.qty) || 0;

    const otherRecords = await LicenseUtilizationModel.find({
      authorization_no: { $in: uniqueSearchNos },
      license_sr: licenseSr,
      job_id: { $ne: currentJobId }
    }).session(session).lean();

    const licenseUnit = licenseItem.unit || "MTS";
    const requestedQtyInLicUnit = convertQuantity(requestedQty, row.unit, licenseUnit);

    const totalOtherQtyInLicUnit = otherRecords.reduce((sum, r) => {
      return sum + convertQuantity(r.qty || 0, r.unit, licenseUnit);
    }, 0);

    const totalUtilizedQty = totalOtherQtyInLicUnit + requestedQtyInLicUnit;

    if (totalUtilizedQty > licensedQty) {
      throw new Error(`Row ${i + 1}: Utilized quantity exceeds authorized quantity (Licensed: ${licensedQty}, Utilized: ${Math.round(totalUtilizedQty * 1000) / 1000}).`);
    }

    // F. Value available (check balance excluding this job)
    const rawAmount = parseFloat(row.amount) || 0;
    const amtCurrency = row.amount_currency || "USD";
    let requestedCifUsd = 0;
    let requestedCifInr = 0;
    if (amtCurrency === "INR") {
      requestedCifInr = rawAmount;
      requestedCifUsd = effectiveExrate > 0 ? rawAmount / effectiveExrate : 0;
    } else {
      requestedCifUsd = rawAmount;
      requestedCifInr = rawAmount * effectiveExrate;
    }

    const totalOtherUsd = otherRecords.reduce((sum, r) => sum + (r.cif_usd || 0), 0);
    const licensedCifUsd = parseFloat(licenseItem.value_usd) || 0;
    const totalUtilizedUsd = totalOtherUsd + requestedCifUsd;

    if (totalUtilizedUsd > licensedCifUsd) {
      throw new Error(`Row ${i + 1}: Utilized CIF USD value exceeds authorized value (Licensed: $${licensedCifUsd}, Utilized: $${Math.round(totalUtilizedUsd * 100) / 100}).`);
    }

    const totalOtherInr = otherRecords.reduce((sum, r) => sum + (r.cif_inr || 0), 0);
    const licensedCifInr = parseFloat(licenseItem.value_rs) || 0;
    const totalUtilizedInr = totalOtherInr + requestedCifInr;

    if (licensedCifInr > 0 && totalUtilizedInr > licensedCifInr) {
      throw new Error(`Row ${i + 1}: Utilized CIF INR value exceeds authorized value (Licensed: ₹${licensedCifInr}, Utilized: ₹${Math.round(totalUtilizedInr * 100) / 100}).`);
    }

    // G. Prevent duplicate utilization
    const orConditions = [];
    if (beNo && beNo.trim()) orConditions.push({ be_no: beNo.trim() });
    if (jobNo && jobNo.trim()) orConditions.push({ job_no: jobNo.trim() });

    if (orConditions.length > 0) {
      const duplicate = await LicenseUtilizationModel.findOne({
        authorization_no: { $in: uniqueSearchNos },
        license_sr: licenseSr,
        job_id: { $ne: currentJobId },
        $or: orConditions
      }).session(session);

      if (duplicate) {
        throw new Error("This BE has already been utilized against the selected Authorization Item.");
      }
    }
  }
}

/**
 * Recalculates utilization summaries for a given Authorization Number
 * by reading transaction records directly from LicenseUtilizationModel.
 */
export async function recalculateLicenseUtilization(authorizationNo, session = null) {
  if (!authorizationNo) return;

  try {
    const cleanedNo = String(authorizationNo).replace(/^LIC\//i, "").trim();
    // 1. Find the authorization document
    const authorization = await AuthorizationRegistrationModel.findOne({
      $or: [
        { registration_no: authorizationNo },
        { licence_no: authorizationNo },
        { job_no: authorizationNo },
        { job_no: cleanedNo }
      ]
    }).session(session);

    if (!authorization) {
      console.warn(`[LicenseUtilization] Authorization not found: ${authorizationNo}`);
      return;
    }

    const searchNos = [authorizationNo, cleanedNo];
    if (authorization.registration_no) searchNos.push(authorization.registration_no);
    if (authorization.licence_no) searchNos.push(authorization.licence_no);
    if (authorization.job_no) {
      searchNos.push(authorization.job_no);
      searchNos.push(`LIC/${authorization.job_no}`);
      searchNos.push(`lic/${authorization.job_no}`);
    }
    const uniqueSearchNos = [...new Set(searchNos.filter(n => n && n.trim() !== ""))];

    // 2. Load all records from licenseUtilizationModel where authorization_no matches
    const records = await LicenseUtilizationModel.find({
      authorization_no: { $in: uniqueSearchNos }
    }).session(session).lean();

    // Group transactions by license_sr
    const recordsBySr = {};
    for (const r of records) {
      const sr = r.license_sr || 1;
      if (!recordsBySr[sr]) recordsBySr[sr] = [];
      recordsBySr[sr].push(r);
    }

    // Check if the authorization has expired
    let isExpired = false;
    if (authorization.import_validity) {
      const parts = authorization.import_validity.split("/");
      if (parts.length === 3) {
        const [dd, mm, yyyy] = parts;
        const expiryDate = new Date(`${yyyy}-${mm}-${dd}T23:59:59`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (today > expiryDate) {
          isExpired = true;
        }
      }
    }

    // 3. Rebuild import_details_array with updated summaries
    const updatedImportDetails = (authorization.import_details_array || []).map((item, index) => {
      const itemSrNo = item.sr_no || (index + 1);
      const matchingRecords = recordsBySr[itemSrNo] || [];

      // Sum utilization records
      const licenseUnit = item.unit || "MTS";
      const totalUtilizedQty = matchingRecords.reduce((sum, r) => {
        return sum + convertQuantity(r.qty || 0, r.unit, licenseUnit);
      }, 0);
      const totalUtilizedUsd = matchingRecords.reduce((sum, r) => sum + (r.cif_usd || 0), 0);
      const totalUtilizedInr = matchingRecords.reduce((sum, r) => sum + (r.cif_inr || 0), 0);

      // Licensed totals
      const licensedQty = parseFloat(item.qty) || 0;
      const licensedCifUsd = parseFloat(item.value_usd) || 0;
      const licensedCifInr = parseFloat(item.value_rs) || 0;

      // Balances
      const balanceQty = Math.max(0, licensedQty - totalUtilizedQty);
      const balanceCifUsd = Math.max(0, licensedCifUsd - totalUtilizedUsd);
      const balanceCifInr = Math.max(0, licensedCifInr - totalUtilizedInr);

      // Utilization percent
      const utilizationPercent = licensedQty > 0
        ? (totalUtilizedQty / licensedQty) * 100
        : 0;

      // Status
      let itemStatus = "Available";
      if (isExpired) {
        itemStatus = "Expired";
      } else if (totalUtilizedQty >= licensedQty && licensedQty > 0) {
        itemStatus = "Fully Utilized";
      } else if (totalUtilizedQty > 0) {
        itemStatus = "Partially Utilized";
      } else {
        itemStatus = "Available";
      }

      return {
        ...item,
        sr_no: itemSrNo,
        licensed_qty: licensedQty,
        licensed_cif_usd: licensedCifUsd,
        licensed_cif_inr: licensedCifInr,

        total_utilized_qty: Math.round(totalUtilizedQty * 1000) / 1000,
        total_utilized_usd: Math.round(totalUtilizedUsd * 100) / 100,
        total_utilized_inr: Math.round(totalUtilizedInr * 100) / 100,

        balance_qty: Math.round(balanceQty * 1000) / 1000,
        balance_cif_usd: Math.round(balanceCifUsd * 100) / 100,
        balance_cif_inr: Math.round(balanceCifInr * 100) / 100,

        utilization_percent: Math.round(utilizationPercent * 100) / 100,
        status: itemStatus,

        // Legacy fields for backward compatibility
        auto_balance_qty: Math.round(balanceQty * 1000) / 1000,
        auto_balance_cif_usd: Math.round(balanceCifUsd * 100) / 100,
        auto_balance_cif_inr: Math.round(balanceCifInr * 100) / 100
      };
    });

    // 4. Save summaries and empty the legacy nested utilization records
    authorization.import_details_array = updatedImportDetails;
    authorization.utilization_records = [];
    await authorization.save({ session });

    console.log(
      `[LicenseUtilization] Recalculated for "${authorizationNo}": ` +
      `${records.length} records, summaries updated.`
    );

    // 5. Broadcast WebSocket event if setup
    try {
      const { broadcastLicenseUpdate } = await import("./setupDgftWebSocket.mjs");
      broadcastLicenseUpdate(authorizationNo);
    } catch (wsErr) {
      // ws setup might not be fully loaded, ignore gracefully
    }
  } catch (err) {
    console.error(`[LicenseUtilization] Error recalculating for "${authorizationNo}":`, err);
  }
}

/**
 * Syncs DSR job description details to LicenseUtilization collection,
 * then triggers recalculation for affected licenses.
 */
export async function recalculateLicenseUtilizationForJob(jobDoc, session = null) {
  if (!jobDoc || !jobDoc._id) return;

  try {
    const usdRate = await getUsdImportRate();

    // 1. Find all license numbers previously referenced by this job
    const previousRecords = await LicenseUtilizationModel.find({ job_id: jobDoc._id })
      .session(session)
      .lean();
    const previousLicenses = previousRecords.map((r) => r.authorization_no);

    // 2. Clear existing records for this job
    await LicenseUtilizationModel.deleteMany({ job_id: jobDoc._id }).session(session);

    // 3. Scan description details for new references and create records
    const newLicenses = [];
    const descDetails = jobDoc.description_details || [];

    for (const row of descDetails) {
      if (!row.license_no || !row.license_no.trim()) continue;

      const licenseNo = row.license_no.trim();
      const licenseSr = Number(row.license_sr) || 1;
      const qtyVal = parseFloat(row.quantity) || 0;
      const rawAmount = parseFloat(row.amount) || 0;

      if (qtyVal === 0 && rawAmount === 0) continue; // Skip empty rows

      const amtCurrency = row.amount_currency || "USD";
      const exrate = parseFloat(row.exchange_rate_used) || parseFloat(jobDoc.exrate) || usdRate || 84;

      // Calculate CIF values historically based on the job's exchange rate
      let cifUsd = 0;
      let cifInr = 0;

      if (amtCurrency === "INR") {
        cifInr = rawAmount;
        cifUsd = exrate > 0 ? rawAmount / exrate : 0;
      } else {
        cifUsd = rawAmount;
        cifInr = rawAmount * exrate;
      }

      // Convert quantity to the License Authorization item's unit if specified
      const cleanedLicenseNo = String(licenseNo).replace(/^LIC\//i, "").trim();
      const auth = await AuthorizationRegistrationModel.findOne({
        $or: [
          { registration_no: licenseNo },
          { licence_no: licenseNo },
          { job_no: licenseNo },
          { job_no: cleanedLicenseNo }
        ]
      }).session(session).lean();

      let targetUnit = row.unit || "";
      let convertedQty = qtyVal;

      if (auth) {
        const licenseItem = (auth.import_details_array || []).find((item, index) => {
          const itemSrNo = item.sr_no || (index + 1);
          return itemSrNo === licenseSr;
        });
        if (licenseItem && licenseItem.unit) {
          targetUnit = licenseItem.unit;
          convertedQty = convertQuantity(qtyVal, row.unit, targetUnit);
        }
      }

      await LicenseUtilizationModel.create([{
        authorization_no: licenseNo,
        license_sr: licenseSr,
        job_no: jobDoc.job_no || jobDoc.job_number || "",
        job_id: jobDoc._id,
        be_no: jobDoc.be_no || "",
        be_date: jobDoc.be_date || "",
        hs_code: row.cth_no || row.hs_code || "",
        item_description: row.description || "",
        qty: convertedQty,
        unit: targetUnit,
        cif_usd: Math.round(cifUsd * 100) / 100,
        cif_inr: Math.round(cifInr * 100) / 100,
        exchange_rate_used: exrate,
        port: jobDoc.custom_house || "",
        created_at: new Date()
      }], { session });

      newLicenses.push(licenseNo);
    }

    // 4. Gather union of affected licenses and run recalculations
    const uniqueLicenses = [...new Set([...previousLicenses, ...newLicenses])];
    for (const lic of uniqueLicenses) {
      await recalculateLicenseUtilization(lic, session);
    }

    // 5. Compare old vs new records to record audit trail
    const prevMap = {};
    for (const prev of previousRecords) {
      const key = `${prev.authorization_no}_${prev.license_sr}`;
      prevMap[key] = (prevMap[key] || 0) + (prev.qty || 0);
    }

    const newMap = {};
    const newRecords = await LicenseUtilizationModel.find({ job_id: jobDoc._id }).session(session).lean();
    for (const nr of newRecords) {
      const key = `${nr.authorization_no}_${nr.license_sr}`;
      newMap[key] = (newMap[key] || 0) + (nr.qty || 0);
    }

    const ctx = getContext();
    const user = ctx?.user;
    if (user) {
      const allKeys = new Set([...Object.keys(prevMap), ...Object.keys(newMap)]);
      for (const key of allKeys) {
        const oldQty = prevMap[key] || 0;
        const newQty = newMap[key] || 0;
        if (oldQty !== newQty) {
          const [authNo, licSrStr] = key.split("_");
          const licSr = parseInt(licSrStr) || 1;
          const beNo = jobDoc.be_no || "";
          const jobNo = jobDoc.job_no || jobDoc.job_number || "";

          const heading = `LicenseUtilization (${authNo}, SR ${licSr}) Updated`;
          await AuditTrailModel.create([{
            documentType: "LicenseUtilization",
            job_no: jobNo,
            year: jobDoc.year,
            branch_code: jobDoc.branch_code,
            userId: user.username,
            username: user.username,
            userRole: user.role,
            action: "UPDATE",
            heading,
            changes: [
              { field: "authorization_no", oldValue: authNo, newValue: authNo, changeType: "MODIFIED" },
              { field: "license_sr", oldValue: licSr, newValue: licSr, changeType: "MODIFIED" },
              { field: "be_no", oldValue: beNo, newValue: beNo, changeType: "MODIFIED" },
              { field: "job_no", oldValue: jobNo, newValue: jobNo, changeType: "MODIFIED" },
              { field: "qty", oldValue: oldQty, newValue: newQty, changeType: "MODIFIED" }
            ],
            endpoint: ctx.req?.originalUrl || "License Service",
            method: ctx.req?.method || "SAVE",
            userAgent: ctx.req?.get("User-Agent"),
            timestamp: new Date(),
            reason: `Authorization Number: ${authNo}, License SR: ${licSr}, BE Number: ${beNo}, Job Number: ${jobNo}, Old Qty: ${oldQty}, New Qty: ${newQty}`
          }], { session });
        }
      }
    }
  } catch (err) {
    console.error(`[LicenseUtilization] Sync error for job ${jobDoc.job_no || jobDoc._id}:`, err);
  }
}
