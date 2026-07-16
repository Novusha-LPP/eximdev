import express from "express";
import axios from "axios";
import JobModel from "../../model/jobModel.mjs";
import CountryModel from "../../model/countryModel.mjs";
import CustomHouseModel from "../../model/customHouseModel.mjs";
import PortModel from "../../model/portModel.mjs";
import BranchModel from "../../model/branchModel.mjs";
import dotenv from "dotenv";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import { recalculateLicenseUtilizationForJob } from "../../services/licenseUtilizationService.mjs";

dotenv.config();

const router = express.Router();

// IMEXCUBE TEST credentials from env
const IMEXCUBE_BASE_URL =
  process.env.IMEXCUBE_BASE_URL || "https://impexapi.impexcube.in";
const IMPEX_USERNAME = (process.env.IMPEX_USERNAME || "").trim();
const IMPEX_PASSWORD = (process.env.IMPEX_PASSWORD || "").trim();
const COMPANY_BR_CODE = (process.env.COMPANY_BR_CODE || "").trim();
const COMPANY_BR_CODE_AMD = (process.env.COMPANY_BR_CODE_AMD || "").trim() || "5456AD39-7CE7-4B73-9601-AC1C44138992";
const COMPANY_BR_CODE_GIM = (process.env.COMPANY_BR_CODE_GIM || "").trim() || "6EE3B451-A349-44AD-B49B-A3CD54AEE756";
const COMPANY_BR_CODE_COK = (process.env.COMPANY_BR_CODE_COK || "").trim() || "128DCE89-0B25-4033-9C27-8B6D8C7CE3BF";
const FYEAR = (process.env.FYEAR || "").trim();

const getCompanyBrCode = (branchCode) => {
  const code = (branchCode || "").toUpperCase().trim();
  if (["AMD", "SND", "KHD", "SCH", "BRD", "AIR"].includes(code)) return COMPANY_BR_CODE_AMD;
  if (["GIM", "MND", "HZR"].includes(code)) return COMPANY_BR_CODE_GIM;
  if (code === "COK") return COMPANY_BR_CODE_COK;
  return COMPANY_BR_CODE_AMD;
};

const getChaBranchCode = (branchCode) => {
  const code = (branchCode || "").toUpperCase().trim();
  if (["AMD", "SND", "KHD", "SCH", "BRD", "AIR"].includes(code)) return "NOVUAMD";
  if (["GIM", "MND", "HZR"].includes(code)) return "NOVUGDM";
  if (code === "COK") return "NOVUCOK";
  return "NOVUAMD";
};

const ACTION_CREATE = "created";
const ACTION_UPDATE = "updated";
const ACTION_DUPLICATE = "duplicate";

const REQUIRED_FIELDS = {
  "Custom House Code": "BE_Details.Custom House Code",
  "User Job No.": "BE_Details.User Job No.",
  "IEC Code": "BE_Details.IEC Code",
  "Name of the importer": "BE_Details.Name of the importer",
  "Mode of Transport": "BE_Details.Mode of Transport",
  "MAWB.BL No": "IGMS[0].MAWB.BL No",
  "Total No. Of Packages": "IGMS[0].Total No. Of Packages",
  "Container Number": "CONTAINER[0].Container Number",
};

const normalizeVendorStatusCode = (payload, fallbackStatus = null) => {
  const fromPayload = Number(payload?.statusCode);
  if (Number.isFinite(fromPayload) && fromPayload > 0) return fromPayload;
  const fromNested = Number(payload?.data?.[0]?.Code || payload?.data?.[0]?.code);
  if (Number.isFinite(fromNested) && fromNested > 0) return fromNested;
  return fallbackStatus;
};

const classifyImexcubeAction = (payload, fallbackStatus = null) => {
  const statusCode = normalizeVendorStatusCode(payload, fallbackStatus);
  const text = [
    payload?.message,
    payload?.data?.[0]?.Message,
    payload?.data?.[0]?.ErrorMsg,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("updated")) return ACTION_UPDATE;
  if (statusCode === 409 || text.includes("already exists") || text.includes("duplicate")) {
    return ACTION_DUPLICATE;
  }
  return ACTION_CREATE;
};

const getVendorMessage = (payload, fallback = "") => {
  return (
    payload?.data?.[0]?.Message ||
    payload?.data?.[0]?.ErrorMsg ||
    payload?.message ||
    fallback
  );
};

const getRequiredFieldValue = (payload, path) => {
  if (path === "BE_Details.Custom House Code") return payload?.BE_Details?.["Custom House Code"];
  if (path === "BE_Details.User Job No.") return payload?.BE_Details?.["User Job No."];
  if (path === "BE_Details.IEC Code") return payload?.BE_Details?.["IEC Code"];
  if (path === "BE_Details.Name of the importer") return payload?.BE_Details?.["Name of the importer"];
  if (path === "BE_Details.Mode of Transport") return payload?.BE_Details?.["Mode of Transport"];
  if (path === "IGMS[0].MAWB.BL No") return payload?.IGMS?.[0]?.["MAWB.BL No"];
  if (path === "IGMS[0].Total No. Of Packages") return payload?.IGMS?.[0]?.["Total No. Of Packages"];
  if (path === "CONTAINER[0].Container Number") return payload?.CONTAINER?.[0]?.["Container Number"];
  return "";
};

const collectMissingRequiredFields = (payload) => {
  const missing = [];
  Object.entries(REQUIRED_FIELDS).forEach(([fieldName, path]) => {
    const value = getRequiredFieldValue(payload, path);
    if (value === undefined || value === null || String(value).trim() === "") {
      missing.push(`'${fieldName}' is missing`);
    }
  });
  return missing;
};

/**
 * Helper: Build the scmCube-format job payload (reuses the same mapping logic
 * from scmCubeRoutes.mjs so we can call it internally without an HTTP round-trip).
 */
async function buildJobPayload(job_number, isPreview = false, senderID = "SURAJAHD") {
  const job = await JobModel.findOne({ job_number }).lean();
  if (!job) throw new Error("Job not found for the provided job_number");

  const countryDoc = await CountryModel.findOne({
    name: job.origin_country || "",
  }).lean();
  const countryCode = countryDoc ? countryDoc.code : "";

  const errors = [];
  const getVal = (val) =>
    val === undefined || val === null ? "" : String(val).trim();

  const validateChar = (val, length, mandatory = false, fieldName = "") => {
    let s = getVal(val);
    if (mandatory && !s) errors.push(`'${fieldName}' is missing`);
    return s.substring(0, length);
  };

  const validateNum = (val, length, decimals = 0, mandatory = false, fieldName = "") => {
    const s = getVal(val).replace(/[^0-9.]/g, "");
    if (!s) {
      if (mandatory) errors.push(`'${fieldName}' is missing`);
      return "";
    }
    let num = parseFloat(s);
    if (isNaN(num)) {
      if (mandatory) errors.push(`'${fieldName}' is missing`);
      return "";
    }

    if (decimals > 0) {
      return String(Number(num.toFixed(decimals)));
    }
    return String(Math.floor(num));
  };

  const validateDate = (val, mandatory = false, fieldName = "") => {
    const s = getVal(val);
    if (!s) {
      if (mandatory) errors.push(`'${fieldName}' is missing`);
      return "";
    }
    const date = new Date(s);
    if (isNaN(date.getTime())) {
      if (mandatory) errors.push(`'${fieldName}' is missing`);
      return "";
    }
    // Return YYYYMMDD format as per new documentation
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}${m}${d}`;
  };

  // Custom House Code lookup
  let resolvedCustomHouseCode = getVal(job.custom_house);
  if (resolvedCustomHouseCode) {
    const chDoc = await CustomHouseModel.findOne({
      $or: [
        { name: new RegExp(`^${resolvedCustomHouseCode}$`, "i") },
        { code: new RegExp(`^${resolvedCustomHouseCode}$`, "i") },
      ],
    }).lean();
    if (chDoc) resolvedCustomHouseCode = chDoc.code;
  }

  // Port of Origin lookup
  let resolvedPortOfOriginCode = getVal(job.loading_port || job.port_of_loading);
  if (resolvedPortOfOriginCode) {
    const match = resolvedPortOfOriginCode.match(/\((.*?)\)\s*(.*)/);
    const searchVal = match ? match[1].trim() : resolvedPortOfOriginCode;
    const portDoc = await PortModel.findOne({
      $or: [
        { port_name: new RegExp(`^${searchVal}$`, "i") },
        { port_code: new RegExp(`^${searchVal}$`, "i") },
      ],
    }).lean();
    if (portDoc) resolvedPortOfOriginCode = portDoc.port_code;
    else if (match) resolvedPortOfOriginCode = match[1].trim();
  }

  // Fetch all active branch ICD ports from the database dynamically
  const activeBranches = await BranchModel.find({ is_active: true }).lean();
  const dbIcdPorts = [];
  for (const b of activeBranches) {
    if (b.ports) {
      for (const p of b.ports) {
        if (p.is_icd) {
          dbIcdPorts.push(p);
        }
      }
    }
  }

  const targetICDs = dbIcdPorts.length > 0
    ? dbIcdPorts.map(p => p.port_code.toUpperCase())
    : ["INSAU6", "INJKA6", "INSBI6", "INBRC6", "INVCN6"];

  const targetNames = dbIcdPorts.length > 0
    ? dbIcdPorts.map(p => p.port_name.toUpperCase())
    : [
        "ICD SANAND",
        "ICD SACHANA",
        "ICD KHODIYAR",
        "ICD VARANAMA",
        "ICD VIROCHANNAGR"
      ];

  const responseData = {
    CHADetails: {
      "CHA Code": validateChar("NOVU", 5, true, "CHA Code"),
      "CHA Branch Code": (() => {
        const brCode = getChaBranchCode(job.branch_code);
        return validateChar(brCode, 10, true, "CHA Branch Code");
      })(),
      "Financial Year": (() => {
        const fy = job.financial_year || job.year;
        if (typeof fy === "string" && /^\d{2}-\d{2}$/.test(fy)) {
          const [start, end] = fy.split("-");
          const eNum = parseInt(end, 10);
          const sNum = parseInt(start, 10);
          const startFull = `20${start}`;
          const endFull = eNum < sNum ? `21${end}` : `20${end}`;
          return validateChar(`${startFull}-${endFull}`, 9, true, "Financial Year");
        }
        return validateChar(fy, 9, true, "Financial Year");
      })(),
      SenderID: validateChar(senderID, 15, true, "SenderID"),
    },
    BE_Details: {
      "Custom House Code": validateChar(resolvedCustomHouseCode, 6, true, "Custom House Code"),
      "User Job RNo": validateChar(job.job_no, 30, false, "User Job RNo"),
      "User Job No.": validateChar(job.job_number, 30, true, "User Job No."),
      "User Job Date": validateDate(job.job_date, false, "User Job Date"),
      "BE Number": validateChar(job.be_no || "", 15, false, "BE Number"),
      "BE Date": validateDate(job.be_date || "", false, "BE Date"),
      "BE Type": (() => {
        let beType = "";
        if (job.type_of_b_e === "Home") beType = "H";
        else if (job.type_of_b_e === "In-Bond") beType = "W";
        else if (job.type_of_b_e === "Ex-Bond") beType = "X";
        return validateChar(beType, 4, false, "BE Type");
      })(),
      "IEC Code": validateChar(job.ie_code_no, 10, true, "IEC Code"),
      "Branch Sr. No": validateNum(job.branchSrNo, 3, 0, false, "Branch Sr. No"),
      "Name of the importer": validateChar(job.importer, 50, true, "Name of the importer"),
      "Address 1": validateChar(job.importer_address?.details || job.importer_address, 35, false, "Address 1"),
      "Address 2": validateChar("", 35, false, "Address 2"),
      City: validateChar(job.importer_address?.city || "", 35, false, "City"),
      State: validateChar(job.importer_address?.state || "", 25, false, "State"),
      Pin: validateChar(job.importer_address?.postal_code || "", 6, false, "Pin"),
      Class: validateChar("N", 1, false, "Class"),
      "Mode of Transport": (() => {
        const rawCH = getVal(job.custom_house).toUpperCase();
        const resolvedCH = getVal(resolvedCustomHouseCode).toUpperCase();
        const isTargetICD = targetICDs.some(code => rawCH.includes(code) || resolvedCH.includes(code)) ||
                            targetNames.some(name => rawCH.includes(name) || resolvedCH.includes(name));

        let mode = "";
        if (isTargetICD) {
          mode = "L";
        } else if (job.mode === "SEA") {
          mode = "S";
        } else if (job.mode === "AIR") {
          mode = "A";
        }
        return validateChar(mode, 1, true, "Mode of Transport");
      })(),
      ImporterType: validateChar(job.importer_type || "P", 1, false, "ImporterType"),
      "Kachcha BE": validateChar("N", 1, false, "Kachcha BE"),
      "High sea sale flag": (() => {
        const hssVal = getVal(job.hss).toUpperCase();
        return validateChar(hssVal === "YES" ? "Y" : "N", 1, false, "High sea sale flag");
      })(),
      "Port of Origin": validateChar(resolvedPortOfOriginCode, 6, false, "Port of Origin"),
      "CHA Code": validateChar("ABOFS1766LCH005", 15, false, "CHA Code"),
      "Country of Origin": validateChar(countryCode, 2, false, "Country of Origin"),
      "Country of Consignment": validateChar(countryCode, 2, false, "Country of Consignment"),
      "Port Of Shipment": validateChar(resolvedPortOfOriginCode, 6, false, "Port Of Shipment"),
      "Green Channel Requested": validateChar("N", 1, false, "Green Channel Requested"),
      "Section 48 Requested": validateChar("N", 1, false, "Section 48 Requested"),
      "Whether Prior BE": validateChar(job.be_filing_type === "Prior" ? "A" : "N", 1, false, "Whether Prior BE"),
      "Authorized Dealer Code": validateChar(job.adCode, 10, false, "Authorized Dealer Code"),
      "First Check Requested": validateChar(
        getVal(job.firstCheck).toUpperCase() === "YES" ? "Y" : "N", 1, false, "First Check Requested"
      ),
      "Warehouse Code": validateChar("", 8, false, "Warehouse Code"),
      "Warehouse Customs Site ID": validateNum("", 6, 0, false, "Warehouse Customs Site ID"),
      "Ware house BE No": validateChar(job.in_bond_be_no, 7, false, "Ware house BE No"),
      "Ware house BE Date": validateDate(job.in_bond_be_date, false, "Ware house BE Date"),
      "No of packages released": validateNum(job.no_of_pkgs, 8, 0, false, "No of packages released"),
      "Package Code": validateChar(job.unit, 3, false, "Package Code"),
      "Gross Weight": validateNum(job.gross_weight, 12, 3, false, "Gross Weight"),
      "Unit of Measurement": validateChar(job.unit, 3, false, "Unit of Measurement"),
      "Additional Charges": validateNum("", 12, 2, false, "Additional Charges"),
      "Miscellaneous load": validateNum("", 12, 2, false, "Miscellaneous load"),
      "Unique Consignment": validateChar("", 35, false, "Unique Consignment"),
      "UCR Type": validateChar("", 2, false, "UCR Type"),
      "Payment method code": (() => {
        let pm = "";
        if (job.payment_method === "Transaction") pm = "T";
        else if (job.payment_method === "Deferred") pm = "D";
        return validateChar(pm, 1, false, "Payment method code");
      })(),
    },
    IGMS: [
      {
        "IGM No.": validateNum(job.igm_no, 7, 0, false, "IGM No."),
        "IGM Date": validateDate(job.igm_date, false, "IGM Date"),
        "Inward Date": validateDate(job.vessel_berthing || job.discharge_date, false, "Inward Date"),
        "Gateway IGM Number": validateNum(job.gateway_igm, 7, 0, false, "Gateway IGM Number"),
        "Gateway IGM date": validateDate(job.gateway_igm_date, false, "Gateway IGM date"),
        "Gateway Port Code": validateChar(job.branch_code === "GIM" ? "INMUN1" : "", 6, false, "Gateway Port Code"),
        "MAWB.BL No": validateChar(job.awb_bl_no, 20, true, "MAWB.BL No"),
        "MAWB.BL Date": validateDate(job.awb_bl_date, false, "MAWB.BL Date"),
        "HAWB.HBL No": validateChar(job.hawb_hbl_no, 20, false, "HAWB.HBL No"),
        "HAWB.HBL Date": validateDate(job.hawb_hbl_date, false, "HAWB.HBL Date"),
        "Total No. Of Packages": validateNum(job.no_of_pkgs, 8, 0, true, "Total No. Of Packages"),
        "Gross Weight": validateNum(job.gross_weight, 9, 3, false, "Gross Weight"),
        "Unit Quantity Code": validateChar(job.unit, 3, false, "Unit Quantity Code"),
        "Package Code": validateChar(job.unit, 3, false, "Package Code"),
        "Marks And Numbers 1": validateChar("AS PER BL", 4000, false, "Marks And Numbers 1"),
        "Marks And Numbers 2": validateChar("", 40, false, "Marks And Numbers 2"),
        "Marks And Numbers 3": validateChar("", 40, false, "Marks And Numbers 3"),
      },
    ],
    CONTAINER: (job.container_nos || []).map((container) => ({
      "IGM Number": validateNum(job.igm_no, 7, 0, false, "IGM Number"),
      "IGM Date": validateDate(job.igm_date, false, "IGM Date"),
      "LCL.FCL": (() => {
        const type = getVal(job.consignment_type).toUpperCase();
        let code = "";
        if (type === "LCL") code = "L";
        else if (type === "FCL") code = "F";
        return validateChar(code, 1, false, "LCL.FCL");
      })(),
      "Container Number": validateChar(container.container_number, 11, true, "Container Number"),
      "Seal Number": validateChar(
        (Array.isArray(container.seal_number) && container.seal_number.length > 0)
          ? container.seal_number.filter(Boolean).join(", ")
          : (container.seal_no || ""),
        50, false, "Seal Number"
      ),
      "Truck Number": validateChar(container.vehicle_no, 15, false, "Truck Number"),
    })),
    SupportingDocumentList: [
      ...(job.documents || []).map((doc) => ({
        DocumentCode: validateChar(doc.document_code, 8, false, "DocumentCode"),
        DocumentName: validateChar(doc.document_name, 50, true, "DocumentName"),
        DocumentFilePath: validateChar(
          Array.isArray(doc.url) ? doc.url[0] : doc.url, 200, true, "DocumentFilePath"
        ),
        DocumentFileFormat: validateChar("PDF", 10, true, "DocumentFileFormat"),
      })),
      ...(job.cth_documents || []).map((doc) => ({
        DocumentCode: validateChar(doc.document_code, 8, false, "DocumentCode"),
        DocumentName: validateChar(doc.document_name, 50, true, "DocumentName"),
        DocumentFilePath: validateChar(
          Array.isArray(doc.url) ? doc.url[0] : doc.url, 200, true, "DocumentFilePath"
        ),
        DocumentFileFormat: validateChar("PDF", 10, true, "DocumentFileFormat"),
      })),
    ],
  };

  // Fallback templates for empty arrays
  if (responseData.CONTAINER.length === 0) {
    responseData.CONTAINER.push({
      "IGM Number": "", "IGM Date": "", "LCL.FCL": "",
      "Container Number": "", "Seal Number": "", "Truck Number": "",
    });
  }
  if (responseData.SupportingDocumentList.length === 0) {
    responseData.SupportingDocumentList.push({
      "DocumentCode": "", "DocumentName": "",
      "DocumentFilePath": "", "DocumentFileFormat": "",
    });
  }

  // Keep required-field gate aligned with new API document table.
  errors.push(...collectMissingRequiredFields(responseData));

  if (!isPreview && errors.length > 0) {
    const err = new Error("Validation Failed");
    err.details = { errors };
    throw err;
  }

  return isPreview ? { payload: responseData, errors } : responseData;
}

/**
 * POST /api/scmCube/upload-to-imexcube
 * 1. Builds the scmCube job payload from the local DB
 * 2. Authenticates with IMEXCUBE TEST API
 * 3. Pushes the payload to IMEXCUBE CreateJob
 */
router.post("/api/scmCube/upload-to-imexcube", async (req, res) => {
  const { job_number, customPayload, senderID } = req.body || {};
  try {
    if (!job_number) {
      return res.status(400).json({ error: "job_number is required" });
    }

    const job = await JobModel.findOne({ job_number }).lean();
    if (!job) {
      return res.status(404).json({ error: `Job not found for the provided job_number: ${job_number}` });
    }

    const companyBrCode = getCompanyBrCode(job.branch_code);
    console.log(`[IMEXCUBE] Resolved CompanyBrCode for branch ${job.branch_code || "N/A"}: ${companyBrCode}`);

    // Step 1: Build or parse the job payload
    let jobPayload;
    if (customPayload) {
      console.log(`[IMEXCUBE] Using custom/edited payload for job: ${job_number}`);
      jobPayload = typeof customPayload === "string" ? JSON.parse(customPayload) : customPayload;
      const customPayloadErrors = collectMissingRequiredFields(jobPayload);
      if (customPayloadErrors.length > 0) {
        return res.status(400).json({
          error: "Validation Failed",
          details: { errors: customPayloadErrors },
        });
      }
    } else {
      console.log(`[IMEXCUBE] Building payload for job: ${job_number} with SenderID: ${senderID || "SURAJAHD"}`);
      jobPayload = await buildJobPayload(job_number, false, senderID || "SURAJAHD");
    }

    // Step 2: Authenticate with IMEXCUBE
    console.log("[IMEXCUBE] Authenticating with IMEXCUBE TEST API...");
    const loginUrl = `${IMEXCUBE_BASE_URL}/api/Authentication/login?username=${encodeURIComponent(
      IMPEX_USERNAME
    )}&password=${encodeURIComponent(
      IMPEX_PASSWORD
    )}&CompanyBrCode=${encodeURIComponent(
      companyBrCode
    )}&Fyear=${encodeURIComponent(FYEAR)}`;

    const loginRes = await axios.post(loginUrl, null, {
      headers: { accept: "*/*" },
      timeout: 30000,
    });

    const loginData = loginRes.data;
    if (!loginData?.success || !loginData?.data?.accessToken) {
      console.error("[IMEXCUBE] Login failed:", loginData);
      return res.status(502).json({
        error: "IMEXCUBE authentication failed",
        details: loginData,
      });
    }

    const accessToken = loginData.data.accessToken;
    console.log("[IMEXCUBE] Authentication successful, pushing job...");

    // Step 3: Push to IMEXCUBE CreateJob
    const createJobUrl = `${IMEXCUBE_BASE_URL}/api/v1/ImpJobCreation/CreateJob`;
    const createJobRes = await axios.post(createJobUrl, jobPayload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    console.log("[IMEXCUBE] Job pushed successfully:", createJobRes.data);

    const vendorPayload = createJobRes.data || {};
    const action = classifyImexcubeAction(vendorPayload, createJobRes.status);
    const vendorStatusCode = normalizeVendorStatusCode(vendorPayload, createJobRes.status);
    const vendorMessage = getVendorMessage(vendorPayload, "Job created successfully");

    if (action === ACTION_DUPLICATE) {
      await JobModel.updateOne(
        { job_number },
        {
          $set: {
            imexcube_last_action: ACTION_DUPLICATE,
            imexcube_last_status_code: vendorStatusCode,
            imexcube_last_message: vendorMessage,
            imexcube_response: vendorPayload,
          },
        }
      );

      return res.status(409).json({
        success: false,
        action: ACTION_DUPLICATE,
        message: vendorMessage,
        vendorStatusCode,
        vendorMessage,
        imexcubeResponse: vendorPayload,
      });
    }

    // Mark the job as uploaded in our DB
    await JobModel.updateOne(
      { job_number },
      {
        $set: {
          imexcube_uploaded: true,
          imexcube_uploaded_at: new Date(),
          imexcube_response: vendorPayload,
          imexcube_last_action: action,
          imexcube_last_status_code: vendorStatusCode,
          imexcube_last_message: vendorMessage,
        },
      }
    );

    return res.status(200).json({
      success: true,
      action,
      message: action === ACTION_UPDATE ? "Job updated in IMEXCUBE (TEST) successfully" : "Job created in IMEXCUBE (TEST) successfully",
      vendorStatusCode,
      vendorMessage,
      imexcubeResponse: vendorPayload,
    });
  } catch (error) {
    if (error.message?.startsWith("Mandatory field")) {
      return res.status(400).json({ error: error.message });
    }
    console.error("[IMEXCUBE] Upload error:", error?.response?.data || error.message);

    // Handle conflicts by classifying vendor semantics.
    const errorData = error?.response?.data;
    const errorStatus = error?.response?.status || null;
    const action = classifyImexcubeAction(errorData, errorStatus);
    const vendorStatusCode = normalizeVendorStatusCode(errorData, errorStatus);
    const vendorMessage = getVendorMessage(errorData, "Failed to upload job to IMEXCUBE");

    if (action === ACTION_UPDATE) {
      await JobModel.updateOne(
        { job_number },
        {
          $set: {
            imexcube_uploaded: true,
            imexcube_uploaded_at: new Date(),
            imexcube_response: errorData,
            imexcube_last_action: ACTION_UPDATE,
            imexcube_last_status_code: vendorStatusCode,
            imexcube_last_message: vendorMessage,
          },
        }
      );

      return res.status(200).json({
        success: true,
        action: ACTION_UPDATE,
        message: "Job updated in IMEXCUBE (TEST) successfully",
        vendorStatusCode,
        vendorMessage,
        imexcubeResponse: errorData,
      });
    }

    if (action === ACTION_DUPLICATE) {
      await JobModel.updateOne(
        { job_number },
        {
          $set: {
            imexcube_last_action: ACTION_DUPLICATE,
            imexcube_last_status_code: vendorStatusCode,
            imexcube_last_message: vendorMessage,
            imexcube_response: errorData,
          },
        }
      );

      return res.status(409).json({
        success: false,
        action: ACTION_DUPLICATE,
        error: "Duplicate Job in IMEXCUBE",
        message: vendorMessage,
        vendorStatusCode,
        vendorMessage,
        imexcubeResponse: errorData,
      });
    }

    return res.status(errorStatus || 500).json({
      error: "Failed to upload job to IMEXCUBE",
      action: "error",
      vendorStatusCode,
      vendorMessage,
      details: errorData || error.message,
    });
  }
});

/**
 * GET /api/scmCube/job-data-preview
 * Returns job data with field-level validation metadata
 * Each field has: { value, mandatory, valid }
 */
router.get("/api/scmCube/job-data-preview", async (req, res) => {
  try {
    const { job_number, senderID } = req.query;
    if (!job_number) {
      return res.status(400).json({ error: "job_number is required" });
    }

    const job = await JobModel.findOne({ job_number }).lean();
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const countryDoc = await CountryModel.findOne({ name: job.origin_country || "" }).lean();
    const countryCode = countryDoc ? countryDoc.code : "";

    const getVal = (val) => (val === undefined || val === null ? "" : String(val).trim());

    // Non-throwing field builder — collects value + metadata
    const field = (val, mandatory = false) => {
      const v = (val === undefined || val === null) ? "" : val;
      const strVal = String(v).trim();
      const valid = mandatory ? strVal.length > 0 : true;
      return { value: strVal, mandatory, valid };
    };

    // Custom House Code lookup
    let resolvedCustomHouseCode = getVal(job.custom_house);
    if (resolvedCustomHouseCode) {
      const chDoc = await CustomHouseModel.findOne({
        $or: [
          { name: new RegExp(`^${resolvedCustomHouseCode}$`, "i") },
          { code: new RegExp(`^${resolvedCustomHouseCode}$`, "i") },
        ],
      }).lean();
      if (chDoc) resolvedCustomHouseCode = chDoc.code;
    }

    // Port of Origin lookup
    let resolvedPortOfOriginCode = getVal(job.loading_port || job.port_of_loading);
    if (resolvedPortOfOriginCode) {
      const match = resolvedPortOfOriginCode.match(/\((.*?)\)\s*(.*)/);
      const searchVal = match ? match[1].trim() : resolvedPortOfOriginCode;
      const portDoc = await PortModel.findOne({
        $or: [
          { port_name: new RegExp(`^${searchVal}$`, "i") },
          { port_code: new RegExp(`^${searchVal}$`, "i") },
        ],
      }).lean();
      if (portDoc) resolvedPortOfOriginCode = portDoc.port_code;
      else if (match) resolvedPortOfOriginCode = match[1].trim();
    }

    const brCode = getChaBranchCode(job.branch_code);

    const fy = (() => {
      const raw = job.financial_year || job.year;
      if (typeof raw === "string" && /^\d{2}-\d{2}$/.test(raw)) {
        const [start, end] = raw.split("-");
        const sNum = parseInt(start, 10);
        const eNum = parseInt(end, 10);
        const startFull = `20${start}`;
        const endFull = eNum < sNum ? `21${end}` : `20${end}`;
        return `${startFull}-${endFull}`;
      }
      return raw || "";
    })();

    // Date formatter helper for preview values
    const fmtDate = (val) => {
      const s = getVal(val);
      if (!s) return "";
      const date = new Date(s);
      if (isNaN(date.getTime())) return "";
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}${m}${d}`;
    };

    const beType = (() => {
      if (job.type_of_b_e === "Home") return "H";
      if (job.type_of_b_e === "In-Bond") return "W";
      if (job.type_of_b_e === "Ex-Bond") return "X";
      return "";
    })();

    // Fetch all active branch ICD ports from the database dynamically
    const activeBranches = await BranchModel.find({ is_active: true }).lean();
    const dbIcdPorts = [];
    for (const b of activeBranches) {
      if (b.ports) {
        for (const p of b.ports) {
          if (p.is_icd) {
            dbIcdPorts.push(p);
          }
        }
      }
    }

    const targetICDs = dbIcdPorts.length > 0
      ? dbIcdPorts.map(p => p.port_code.toUpperCase())
      : ["INSAU6", "INJKA6", "INSBI6", "INBRC6", "INVCN6"];

    const targetNames = dbIcdPorts.length > 0
      ? dbIcdPorts.map(p => p.port_name.toUpperCase())
      : [
          "ICD SANAND",
          "ICD SACHANA",
          "ICD KHODIYAR",
          "ICD VARANAMA",
          "ICD VIROCHANNAGR"
        ];

    const modeOfTransport = (() => {
      const rawCH = getVal(job.custom_house).toUpperCase();
      const resolvedCH = getVal(resolvedCustomHouseCode).toUpperCase();
      const isTargetICD = targetICDs.some(code => rawCH.includes(code) || resolvedCH.includes(code)) ||
                          targetNames.some(name => rawCH.includes(name) || resolvedCH.includes(name));

      if (isTargetICD) return "L";
      if (job.mode === "SEA") return "S";
      if (job.mode === "AIR") return "A";
      return "";
    })();

    const hssVal = getVal(job.hss).toUpperCase() === "YES" ? "Y" : "N";
    const paymentCode = (() => {
      if (job.payment_method === "Transaction") return "T";
      if (job.payment_method === "Deferred") return "D";
      return "";
    })();

    const sealValue = (container) => {
      if (Array.isArray(container.seal_number) && container.seal_number.length > 0) {
        return container.seal_number.filter(Boolean).join(", ");
      }
      return container.seal_no || "";
    };

    const lclFcl = (() => {
      const type = getVal(job.consignment_type).toUpperCase();
      if (type === "LCL") return "L";
      if (type === "FCL") return "F";
      return "";
    })();

    const preview = {
      CHADetails: {
        "CHA Code": field("NOVU", true),
        "CHA Branch Code": field(brCode, true),
        "Financial Year": field(fy, true),
        "SenderID": field(senderID || "SURAJAHD", true),
      },
      BE_Details: {
        "Custom House Code": field(resolvedCustomHouseCode, true),
        "User Job RNo": field(job.job_no, false),
        "User Job No.": field(job.job_number, true),
        "User Job Date": field(fmtDate(job.job_date), false),
        "BE Number": field(job.be_no || "", false),
        "BE Date": field(fmtDate(job.be_date), false),
        "BE Type": field(beType, false),
        "IEC Code": field(job.ie_code_no, true),
        "Branch Sr. No": field(job.branchSrNo, false),
        "Name of the importer": field(job.importer, true),
        "Address 1": field(job.importer_address?.details || job.importer_address, false),
        "Address 2": field("", false),
        "City": field(job.importer_address?.city || "", false),
        "State": field(job.importer_address?.state || "", false),
        "Pin": field(job.importer_address?.postal_code || "", false),
        "Class": field("N", false),
        "Mode of Transport": field(modeOfTransport, true),
        "ImporterType": field(job.importer_type || "P", false),
        "Kachcha BE": field("N", false),
        "High sea sale flag": field(hssVal, false),
        "Port of Origin": field(resolvedPortOfOriginCode, false),
        "CHA Code": field("ABOFS1766LCH005", false),
        "Country of Origin": field(countryCode, false),
        "Country of Consignment": field(countryCode, false),
        "Port Of Shipment": field(resolvedPortOfOriginCode, false),
        "Green Channel Requested": field("N", false),
        "Section 48 Requested": field("N", false),
        "Whether Prior BE": field(job.be_filing_type === "Prior" ? "A" : "N", false),
        "Authorized Dealer Code": field(job.adCode, false),
        "First Check Requested": field(getVal(job.firstCheck).toUpperCase() === "YES" ? "Y" : "N", false),
        "Warehouse Code": field("", false),
        "Warehouse Customs Site ID": field("", false),
        "Ware house BE No": field(job.in_bond_be_no, false),
        "Ware house BE Date": field(fmtDate(job.in_bond_be_date), false),
        "No of packages released": field(job.no_of_pkgs, false),
        "Package Code": field(job.unit, false),
        "Gross Weight": field(job.gross_weight, false),
        "Unit of Measurement": field(job.unit, false),
        "Additional Charges": field("", false),
        "Miscellaneous load": field("", false),
        "Unique Consignment": field("", false),
        "UCR Type": field("", false),
        "Payment method code": field(paymentCode, false),
      },
      IGMS: [{
        "IGM No.": field(job.igm_no, false),
        "IGM Date": field(fmtDate(job.igm_date), false),
        "Inward Date": field(fmtDate(job.vessel_berthing || job.discharge_date), false),
        "Gateway IGM Number": field(job.gateway_igm, false),
        "Gateway IGM date": field(fmtDate(job.gateway_igm_date), false),
        "Gateway Port Code": field(job.branch_code === "GIM" ? "INMUN1" : "", false),
        "MAWB.BL No": field(job.awb_bl_no, true),
        "MAWB.BL Date": field(fmtDate(job.awb_bl_date), false),
        "HAWB.HBL No": field(job.hawb_hbl_no, false),
        "HAWB.HBL Date": field(fmtDate(job.hawb_hbl_date), false),
        "Total No. Of Packages": field(job.no_of_pkgs, true),
        "Gross Weight": field(job.gross_weight, false),
        "Unit Quantity Code": field(job.unit, false),
        "Package Code": field(job.unit, false),
        "Marks And Numbers 1": field("AS PER BL", false),
        "Marks And Numbers 2": field("", false),
        "Marks And Numbers 3": field("", false),
      }],
      CONTAINER: (job.container_nos || []).map((container) => ({
        "IGM Number": field(job.igm_no, false),
        "IGM Date": field(fmtDate(job.igm_date), false),
        "LCL.FCL": field(lclFcl, false),
        "Container Number": field(container.container_number, true),
        "Seal Number": field(sealValue(container), false),
        "Truck Number": field(container.vehicle_no, false),
      })),
      SupportingDocumentList: [
        ...(job.documents || []).map((doc) => ({
          DocumentCode: field(doc.document_code, false),
          DocumentName: field(doc.document_name, true),
          DocumentFilePath: field(Array.isArray(doc.url) ? doc.url[0] : doc.url, true),
          DocumentFileFormat: field("PDF", true),
        })),
        ...(job.cth_documents || []).map((doc) => ({
          DocumentCode: field(doc.document_code, false),
          DocumentName: field(doc.document_name, true),
          DocumentFilePath: field(Array.isArray(doc.url) ? doc.url[0] : doc.url, true),
          DocumentFileFormat: field("PDF", true),
        })),
      ],
    };

    const { payload: cleanJobPayload } = await buildJobPayload(job_number, true, senderID || "SURAJAHD");

    return res.status(200).json({
      annotated: preview,
      rawPayload: cleanJobPayload,
      requiredFields: REQUIRED_FIELDS,
    });
  } catch (error) {
    console.error("[IMEXCUBE Preview] Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

/**
 * GET /api/scmCube/get-imexcube-job-details
 * Gets job details from IMEXCUBE for testing/verification.
 */
router.get("/api/scmCube/get-imexcube-job-details", async (req, res) => {
  const { job_number } = req.query;
  try {
    if (!job_number) {
      return res.status(400).json({ error: "job_number is required" });
    }

    const job = await JobModel.findOne({ job_number }).lean();
    if (!job) {
      return res.status(404).json({ error: `Job not found for the provided job_number: ${job_number}` });
    }

    const companyBrCode = getCompanyBrCode(job.branch_code);
    console.log(`[IMEXCUBE] Resolved CompanyBrCode for branch ${job.branch_code || "N/A"}: ${companyBrCode}`);

    // Step 1: Authenticate with IMEXCUBE
    console.log("[IMEXCUBE] Authenticating with IMEXCUBE TEST API for fetching details...");
    const loginUrl = `${IMEXCUBE_BASE_URL}/api/Authentication/login?username=${encodeURIComponent(
      IMPEX_USERNAME
    )}&password=${encodeURIComponent(
      IMPEX_PASSWORD
    )}&CompanyBrCode=${encodeURIComponent(
      companyBrCode
    )}&Fyear=${encodeURIComponent(FYEAR)}`;

    const loginRes = await axios.post(loginUrl, null, {
      headers: { accept: "*/*" },
      timeout: 30000,
    });

    const loginData = loginRes.data;
    if (!loginData?.success || !loginData?.data?.accessToken) {
      console.error("[IMEXCUBE] Login failed:", loginData);
      return res.status(502).json({
        error: "IMEXCUBE authentication failed",
        details: loginData,
      });
    }

    const accessToken = loginData.data.accessToken;
    console.log("[IMEXCUBE] Authentication successful, fetching details for job:", job_number);

    // Step 2: Fetch job details from IMEXCUBE
    let detailsRes;
    const getJobUrl = `${IMEXCUBE_BASE_URL}/api/v1/GetJobDetails/get-impdetails`;
    try {
      detailsRes = await axios({
        method: "GET",
        url: getJobUrl,
        data: {
          Method: "GetJobInfo",
          User_Job_No: job_number
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          accept: "*/*"
        },
        timeout: 30000
      });
    } catch (err) {
      // Fallback 1: Try old getimpdetails endpoint with query params if first attempt returned 404
      if (err.response?.status === 404) {
        const fallbackUrl = `${IMEXCUBE_BASE_URL}/api/v1/GetJobDetails/getimpdetails`;
        try {
          detailsRes = await axios.get(fallbackUrl, {
            params: {
              Method: "GET",
              "User Job No.": job_number
            },
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            timeout: 30000
          });
        } catch (fallbackErr) {
          // If fallback also fails, throw original error
          throw err;
        }
      } else {
        throw err;
      }
    }

    console.log("[IMEXCUBE] Details fetched successfully:", detailsRes.data);
    return res.status(200).json(detailsRes.data);
  } catch (error) {
    console.error("[IMEXCUBE Fetch Details Error]:", error?.response?.data || error.message);
    if (error?.response?.status === 404) {
      return res.status(404).json({
        error: "Job not found in IMEXCUBE",
        details: "This job has likely not been uploaded to IMEXCUBE (TEST) yet. Please upload the job first by clicking the 'Upload to IMEXCUBE (TEST)' button."
      });
    }
    return res.status(error?.response?.status || 500).json({
      error: "Failed to fetch job details from IMEXCUBE",
      details: error?.response?.data || error.message
    });
  }
});

/**
 * POST /api/scmCube/sync-imexcube-job
 * Fetches the job details from IMEXCUBE and synchronizes them to our local JobModel defensively.
 */
router.post("/api/scmCube/sync-imexcube-job", authMiddleware, auditMiddleware('Job'), async (req, res) => {
  const { job_number } = req.body || {};
  try {
    if (!job_number) {
      return res.status(400).json({ error: "job_number is required" });
    }

    const job = await JobModel.findOne({ job_number });
    if (!job) {
      return res.status(404).json({ error: `Job not found for the provided job_number: ${job_number}` });
    }

    const companyBrCode = getCompanyBrCode(job.branch_code);
    console.log(`[IMEXCUBE Sync] Resolved CompanyBrCode for branch ${job.branch_code || "N/A"}: ${companyBrCode}`);

    // Step 1: Authenticate with IMEXCUBE
    console.log("[IMEXCUBE Sync] Authenticating with IMEXCUBE TEST API...");
    const loginUrl = `${IMEXCUBE_BASE_URL}/api/Authentication/login?username=${encodeURIComponent(
      IMPEX_USERNAME
    )}&password=${encodeURIComponent(
      IMPEX_PASSWORD
    )}&CompanyBrCode=${encodeURIComponent(
      companyBrCode
    )}&Fyear=${encodeURIComponent(FYEAR)}`;

    const loginRes = await axios.post(loginUrl, null, {
      headers: { accept: "*/*" },
      timeout: 30000,
    });

    const loginData = loginRes.data;
    if (!loginData?.success || !loginData?.data?.accessToken) {
      console.error("[IMEXCUBE Sync] Login failed:", loginData);
      return res.status(502).json({
        error: "IMEXCUBE authentication failed",
        details: loginData,
      });
    }

    const accessToken = loginData.data.accessToken;
    console.log("[IMEXCUBE Sync] Authentication successful, fetching details...");

    // Step 2: Fetch job details from IMEXCUBE
    let detailsRes;
    const getJobUrl = `${IMEXCUBE_BASE_URL}/api/v1/GetJobDetails/get-impdetails`;
    try {
      detailsRes = await axios({
        method: "GET",
        url: getJobUrl,
        data: {
          Method: "GetJobInfo",
          User_Job_No: job_number
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          accept: "*/*"
        },
        timeout: 30000
      });
    } catch (err) {
      if (err.response?.status === 404) {
        const fallbackUrl = `${IMEXCUBE_BASE_URL}/api/v1/GetJobDetails/getimpdetails`;
        try {
          detailsRes = await axios.get(fallbackUrl, {
            params: {
              Method: "GET",
              "User Job No.": job_number
            },
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            timeout: 30000
          });
        } catch (fallbackErr) {
          throw err;
        }
      } else {
        throw err;
      }
    }

    const responseData = detailsRes.data;
    if (!responseData?.success || !responseData?.data) {
      return res.status(502).json({
        error: "Failed to fetch valid job details from IMEXCUBE",
        details: responseData,
      });
    }

    const imexData = responseData.data;
    const updates = {};
    const changesSummary = [];

    // Helper: parse date to YYYY-MM-DD
    const parseAndFormatDate = (dateStr) => {
      if (!dateStr || String(dateStr).trim() === "" || dateStr === "0") return null;
      const s = String(dateStr).trim();
      
      // Format: DD/MM/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
        const [d, m, y] = s.split("/");
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      
      // Format: YYYY-MM-DD...
      const parsed = new Date(s);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      return null;
    };

    // Helper: check if a value is present and not a placeholder
    const isValuePresent = (val) => {
      if (val === undefined || val === null) return false;
      const s = String(val).trim();
      return s !== "" && s !== "0" && s.toLowerCase() !== "n/a" && s.toLowerCase() !== "nil";
    };

    // --- 1. BE_Details Mapping ---
    if (Array.isArray(imexData.BE_Details) && imexData.BE_Details.length > 0) {
      const be = imexData.BE_Details[0];

      // BE Number
      if (isValuePresent(be.BENo)) {
        if (job.be_no !== be.BENo) {
          updates.be_no = be.BENo;
          changesSummary.push(`be_no: ${job.be_no || 'none'} -> ${be.BENo}`);
        }
      }

      // BE Date
      const parsedBEDate = parseAndFormatDate(be.BEDate);
      if (parsedBEDate) {
        if (job.be_date !== parsedBEDate) {
          updates.be_date = parsedBEDate;
          changesSummary.push(`be_date: ${job.be_date || 'none'} -> ${parsedBEDate}`);
        }
      }

      // BE Type
      if (isValuePresent(be.BEType)) {
        let mappedType = "";
        if (be.BEType === "H") mappedType = "Home";
        else if (be.BEType === "W") mappedType = "In-Bond";
        else if (be.BEType === "X") mappedType = "Ex-Bond";

        if (mappedType && job.type_of_b_e !== mappedType) {
          updates.type_of_b_e = mappedType;
          changesSummary.push(`type_of_b_e: ${job.type_of_b_e || 'none'} -> ${mappedType}`);
        }
      }

      // Custom Port
      if (isValuePresent(be.CustomPort)) {
        const portCode = String(be.CustomPort).toUpperCase();
        const chDoc = await CustomHouseModel.findOne({ code: portCode }).lean();
        const resolvedName = chDoc ? chDoc.name : portCode;
        if (job.custom_house !== resolvedName) {
          updates.custom_house = resolvedName;
          changesSummary.push(`custom_house: ${job.custom_house || 'none'} -> ${resolvedName}`);
        }
      }

      // Mode
      if (isValuePresent(be.Mode)) {
        let mappedMode = "";
        if (be.Mode === "A") mappedMode = "AIR";
        else if (be.Mode === "S" || be.Mode === "L") mappedMode = "SEA";

        if (mappedMode && job.mode !== mappedMode) {
          updates.mode = mappedMode;
          changesSummary.push(`mode: ${job.mode || 'none'} -> ${mappedMode}`);
        }
      }

      // Job Date
      const parsedJobDate = parseAndFormatDate(be.JobDate);
      if (parsedJobDate) {
        if (job.job_date !== parsedJobDate) {
          updates.job_date = parsedJobDate;
          changesSummary.push(`job_date: ${job.job_date || 'none'} -> ${parsedJobDate}`);
        }
      }
    }

    // --- 2. Invoice_Details Mapping ---
    if (Array.isArray(imexData.Invoice_Details) && imexData.Invoice_Details.length > 0) {
      let existingInvoices = [...(job.invoice_details || [])];
      let invoiceChanged = false;

      // Sync top-level summary if not populated yet
      const firstInv = imexData.Invoice_Details[0];
      if (firstInv) {
        if (isValuePresent(firstInv.InvoiceNo) && !job.invoice_number) {
          updates.invoice_number = firstInv.InvoiceNo;
          changesSummary.push(`invoice_number: none -> ${firstInv.InvoiceNo}`);
        }
        const parsedInvDate = parseAndFormatDate(firstInv.InvoiceDate);
        if (parsedInvDate && !job.invoice_date) {
          updates.invoice_date = parsedInvDate;
          changesSummary.push(`invoice_date: none -> ${parsedInvDate}`);
        }
        if (isValuePresent(firstInv.SupplierName) && !job.supplier_exporter) {
          updates.supplier_exporter = firstInv.SupplierName;
          changesSummary.push(`supplier_exporter: none -> ${firstInv.SupplierName}`);
        }
      }

      imexData.Invoice_Details.forEach((inv) => {
        if (!isValuePresent(inv.InvoiceNo)) return;

        let idx = existingInvoices.findIndex(item => item.invoice_number === inv.InvoiceNo);
        let currentInv = idx !== -1 ? (existingInvoices[idx].toObject ? existingInvoices[idx].toObject() : existingInvoices[idx]) : null;

        const mappedInvDate = parseAndFormatDate(inv.InvoiceDate) || "";
        const mappedTerms = isValuePresent(inv.InvoiceTerms) ? String(inv.InvoiceTerms) : "";
        const mappedCurrency = isValuePresent(inv.InvoiceCurrency) ? String(inv.InvoiceCurrency) : "";
        const mappedVal = isValuePresent(inv.InvoiceProductValues) ? String(inv.InvoiceProductValues) : "";
        const mappedFreight = isValuePresent(inv.FreightAmount) ? String(inv.FreightAmount) : "";
        const mappedFreightCurr = isValuePresent(inv.FreightCurrency) ? String(inv.FreightCurrency) : "";
        const mappedInsurance = isValuePresent(inv.InsuranceAmount) ? String(inv.InsuranceAmount) : "";
        const mappedInsuranceCurr = isValuePresent(inv.InsuranceCurrency) ? String(inv.InsuranceCurrency) : "";

        if (currentInv) {
          let subChanges = false;
          if (mappedInvDate && currentInv.invoice_date !== mappedInvDate) { currentInv.invoice_date = mappedInvDate; subChanges = true; }
          if (mappedTerms && currentInv.toi !== mappedTerms) { currentInv.toi = mappedTerms; subChanges = true; }
          if (mappedCurrency && currentInv.inv_currency !== mappedCurrency) { currentInv.inv_currency = mappedCurrency; subChanges = true; }
          if (mappedVal && currentInv.product_value !== mappedVal) { currentInv.product_value = mappedVal; subChanges = true; }
          if (mappedFreight && currentInv.freight !== mappedFreight) { currentInv.freight = mappedFreight; subChanges = true; }
          if (mappedFreightCurr && currentInv.freight_currency !== mappedFreightCurr) { currentInv.freight_currency = mappedFreightCurr; subChanges = true; }
          if (mappedInsurance && currentInv.insurance !== mappedInsurance) { currentInv.insurance = mappedInsurance; subChanges = true; }
          if (mappedInsuranceCurr && currentInv.insurance_currency !== mappedInsuranceCurr) { currentInv.insurance_currency = mappedInsuranceCurr; subChanges = true; }

          if (subChanges) {
            existingInvoices[idx] = currentInv;
            invoiceChanged = true;
            changesSummary.push(`Updated invoice ${inv.InvoiceNo} details`);
          }
        } else {
          const newInv = {
            invoice_number: inv.InvoiceNo,
            invoice_date: mappedInvDate,
            toi: mappedTerms,
            inv_currency: mappedCurrency,
            product_value: mappedVal,
            freight: mappedFreight,
            freight_currency: mappedFreightCurr,
            insurance: mappedInsurance,
            insurance_currency: mappedInsuranceCurr,
          };
          existingInvoices.push(newInv);
          invoiceChanged = true;
          changesSummary.push(`Added invoice ${inv.InvoiceNo}`);
        }
      });

      if (invoiceChanged) {
        updates.invoice_details = existingInvoices;
      }
    }

    // --- 3. Product_Details Mapping ---
    if (Array.isArray(imexData.Product_Details) && imexData.Product_Details.length > 0) {
      let existingProducts = [...(job.description_details || [])];
      let productsChanged = false;

      imexData.Product_Details.forEach((prod) => {
        if (!isValuePresent(prod.ProductDesc) && !isValuePresent(prod.RITCNo)) return;

        let idx = -1;
        if (prod.ProductSNo && prod.ProductSNo <= existingProducts.length) {
          idx = prod.ProductSNo - 1;
        } else {
          idx = existingProducts.findIndex(item => item.cth_no === prod.RITCNo && item.description === prod.ProductDesc);
        }

        let currentProd = idx !== -1 ? (existingProducts[idx].toObject ? existingProducts[idx].toObject() : existingProducts[idx]) : null;

        const mappedDesc = isValuePresent(prod.ProductDesc) ? String(prod.ProductDesc) : "";
        const mappedCth = isValuePresent(prod.RITCNo) ? String(prod.RITCNo) : "";
        const mappedQty = isValuePresent(prod.Qty) ? String(prod.Qty) : "";
        const mappedUnit = isValuePresent(prod.Unit) ? String(prod.Unit) : "";
        const mappedPrice = isValuePresent(prod.UnitPrice) ? String(prod.UnitPrice) : "";
        const mappedAmt = isValuePresent(prod.Amount) ? String(prod.Amount) : "";
        const mappedInvSrNo = isValuePresent(prod.InvSrNo) ? String(prod.InvSrNo) : "1";

        if (currentProd) {
          let subChanges = false;
          if (mappedDesc && currentProd.description !== mappedDesc) { currentProd.description = mappedDesc; subChanges = true; }
          if (mappedCth && currentProd.cth_no !== mappedCth) { currentProd.cth_no = mappedCth; subChanges = true; }
          if (mappedQty && currentProd.quantity !== mappedQty) { currentProd.quantity = mappedQty; subChanges = true; }
          if (mappedUnit && currentProd.unit !== mappedUnit) { currentProd.unit = mappedUnit; subChanges = true; }
          if (mappedPrice && currentProd.unit_price !== mappedPrice) { currentProd.unit_price = mappedPrice; subChanges = true; }
          if (mappedAmt && currentProd.amount !== mappedAmt) { currentProd.amount = mappedAmt; subChanges = true; }
          if (mappedInvSrNo && currentProd.sr_no_invoice !== mappedInvSrNo) { currentProd.sr_no_invoice = mappedInvSrNo; subChanges = true; }

          if (subChanges) {
            existingProducts[idx] = currentProd;
            productsChanged = true;
            changesSummary.push(`Updated product SNo ${prod.ProductSNo || idx + 1}`);
          }
        } else {
          const newProd = {
            description: mappedDesc,
            cth_no: mappedCth,
            quantity: mappedQty,
            unit: mappedUnit,
            unit_price: mappedPrice,
            amount: mappedAmt,
            sr_no_invoice: mappedInvSrNo
          };
          existingProducts.push(newProd);
          productsChanged = true;
          changesSummary.push(`Added product ${mappedCth}`);
        }
      });

      if (productsChanged) {
        updates.description_details = existingProducts;
      }
    }

    if (Object.keys(updates).length === 0) {
      console.log(`[IMEXCUBE Sync] Job ${job_number} is already up to date.`);
      return res.status(200).json({
        success: true,
        message: "No new or modified fields found to update.",
        changes: []
      });
    }

    // Apply updates to the database
    console.log(`[IMEXCUBE Sync] Applying updates to job ${job_number}:`, updates);
    const updatedJob = await JobModel.findOneAndUpdate(
      { job_number },
      { $set: updates },
      { new: true }
    );

    // Recalculate license utilization if required
    if (updates.description_details || updates.be_no) {
      await recalculateLicenseUtilizationForJob(updatedJob).catch(err => {
        console.error("[IMEXCUBE Sync] Recalculating license utilization failed:", err);
      });
    }

    return res.status(200).json({
      success: true,
      message: "Job details successfully synchronized from IMEXCUBE.",
      changes: changesSummary,
      updatedJob
    });

  } catch (error) {
    console.error("[IMEXCUBE Sync Error]:", error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      error: "Failed to synchronize job details from IMEXCUBE",
      details: error?.response?.data || error.message
    });
  }
});

export default router;

