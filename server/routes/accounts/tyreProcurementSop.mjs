import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";
import { isDeepStrictEqual } from "node:util";
import XLSX from "xlsx";
import TyreProcurementSop, { statusEnum, statusEnumMap } from "../../model/accounts/tyreProcurementSop.mjs";
import UserModel from "../../model/userModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import logger from "../../logger.js";

import TyreSupplierModel from "../../model/accounts/tyreSupplierModel.mjs";
import ProcurementProductModel from "../../model/accounts/procurementProductModel.mjs";
import ProcurementCompanyModel from "../../model/accounts/procurementCompanyModel.mjs";
import ProcurementApproverModel from "../../model/accounts/procurementApproverModel.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const procurementUploadDir = path.join(__dirname, "../../uploads/procurement");
if (!fs.existsSync(procurementUploadDir)) {
  fs.mkdirSync(procurementUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, procurementUploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const uploadProcurementFiles = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit as approved
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const allowed = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".jpg", ".jpeg", ".png", ".webp"];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type. Allowed: PDF, Word, Excel, Images (JPEG/PNG/WebP)"), false);
    }
  },
});

const COMPANY_SHORT_NAME_MAP = {
  SURAVIO: "SRCC",
  SRCC: "SRCC",
  SURAJ: "SFPL",
  SFPL: "SFPL",
  NOVUSHA: "NCS",
  NCS: "NCS",
  ALLUVIUM: "AISPL",
  AISPL: "AISPL",
  PARAMOUNT: "PPPL",
  PPPL: "PPPL",
  RABS: "RABS",
};

export const resolveCompanyShortName = (input) => {
  if (!input) return "SFPL";
  const clean = String(input).trim().toUpperCase();
  if (COMPANY_SHORT_NAME_MAP[clean]) return COMPANY_SHORT_NAME_MAP[clean];
  if (clean.includes("SURAJ") || clean.includes("FORWARDER")) return "SFPL";
  if (clean.includes("SURAVIO") || clean.includes("CONTAINER")) return "SRCC";
  if (clean.includes("NOVUSHA")) return "NCS";
  if (clean.includes("ALLUVIUM")) return "AISPL";
  if (clean.includes("PARAMOUNT")) return "PPPL";
  if (clean.includes("RABS")) return "RABS";
  return clean.slice(0, 5);
};

export const DEFAULT_COMPANY_DIRECTORY = [
  {
    companyName: "SURAVIO CARGO CARRIERS PRIVATE LIMITED",
    shortName: "SRCC",
    companyKey: "SURAVIO",
    addressBillTo: "205/A, WALL STREET 2, OPP. ORIENT CLUB, ELLIS BRIDGE, AHMEDABAD - 380006, GUJARAT",
    addressShipTo: "SRCC MAINTENANCE CENTER C/o. SR CONTAINER CARRIERS NEW SANJHA CHULLA GARDEN RESTAURANT-2 NEXT TO ADANI SAHNTIGRAM, NR. KHODIYAR PETROL PUMP, KHORAJ.ICD Khodiyar, GANDHINAGAR-382501, GUJARAT",
    pan: "ABTCS5804P",
    gstin: "24ABTCS5804P1ZK",
    email: "purchase@surajgroupofcompanies.com",
    contactNumbers: "99980 27301 / 99243 01166",
    departments: ["HO-AHMEDABAD", "MAINTENANCE CENTER", "OPERATION"],
    branches: ["HO-AHMEDABAD", "MAINTENANCE CENTER", "OPERATION"],
    settings: {
      showDeliveryLocation: true,
      showDeliveryContact: true,
      showSectionC: true,
      showSectionD: true,
      responsibleTeam: "Maintenance & Workshop / Transport Team",
      hodApproverName: "MOHIT SINGH",
      hodApproverDesignation: "CEO",
      defaultPoFormatStyle: "standard",
      themeColor: "#163b65",
    },
  },
  {
    companyName: "SURAJ FORWARDERS PRIVATE LIMITED",
    shortName: "SFPL",
    companyKey: "SURAJ",
    addressBillTo: "205/A, WALL STREET 2, OPP. ORIENT CLUB, ELLIS BRIDGE, AHMEDABAD - 380006, GUJARAT",
    addressShipTo: "205/A, WALL STREET 2, OPP. ORIENT CLUB, ELLIS BRIDGE, AHMEDABAD - 380006, GUJARAT",
    pan: "ABTCS5804P",
    gstin: "24ABTCS5804P1ZK",
    email: "purchase@surajgroupofcompanies.com",
    contactNumbers: "99980 27301 / 99243 01166",
    departments: ["HO-AHMEDABAD", "GANDHIDHAM", "MUNDRA", "RAJKOT", "SANAND", "KHODIYAR", "AIRPORT"],
    branches: ["HO-AHMEDABAD", "GANDHIDHAM", "MUNDRA", "RAJKOT", "SANAND", "KHODIYAR", "AIRPORT"],
    settings: {
      showDeliveryLocation: true,
      showDeliveryContact: true,
      showSectionC: true,
      showSectionD: true,
      responsibleTeam: "Forwarding & Logistics Team",
      hodApproverName: "RAJAN SHAH",
      hodApproverDesignation: "DIRECTOR",
      defaultPoFormatStyle: "letterhead",
      themeColor: "#ea580c",
    },
  },
  {
    companyName: "NOVUSHA CONSULTING SERVICES INDIA LLP",
    shortName: "NCS",
    companyKey: "NOVUSHA",
    addressBillTo: "306/A, WALL STREET 2, OPP. ORIENT CLUB, ELLIS BRIDGE, AHMEDABAD - 380006, GUJARAT",
    addressShipTo: "306/A, WALL STREET 2, OPP. ORIENT CLUB, ELLIS BRIDGE, AHMEDABAD - 380006, GUJARAT",
    pan: "AAWFN5984A",
    gstin: "24AAWFN5984A1ZW",
    email: "purchase@surajgroupofcompanies.com",
    contactNumbers: "99980 27301 / 99243 01166",
    departments: ["AHMEDABAD"],
    branches: ["AHMEDABAD"],
    settings: {
      showDeliveryLocation: true,
      showDeliveryContact: true,
      showSectionC: false,
      showSectionD: false,
      responsibleTeam: "Consulting Operations",
      hodApproverName: "HOD CONSULTING",
      defaultPoFormatStyle: "letterhead",
      themeColor: "#7c3aed",
    },
  },
  {
    companyName: "ALLUVIUM IOT SOLUTIONS PRIVATE LIMITED",
    shortName: "AISPL",
    companyKey: "ALLUVIUM",
    addressBillTo: "306/A, WALL STREET 2, OPP. ORIENT CLUB, ELLIS BRIDGE, AHMEDABAD - 380006, GUJARAT",
    addressShipTo: "306/A, WALL STREET 2, OPP. ORIENT CLUB, ELLIS BRIDGE, AHMEDABAD - 380006, GUJARAT",
    pan: "AAQCA6155P",
    gstin: "24AAQCA6155P1Z1",
    email: "purchase@surajgroupofcompanies.com",
    contactNumbers: "99980 27301 / 99243 01166",
    departments: ["AHMEDABAD"],
    branches: ["AHMEDABAD"],
    settings: {
      showDeliveryLocation: true,
      showDeliveryContact: true,
      showSectionC: false,
      showSectionD: false,
      responsibleTeam: "IoT Tech & Hardware Team",
      hodApproverName: "TECH LEAD",
      defaultPoFormatStyle: "standard",
      themeColor: "#059669",
    },
  },
  {
    companyName: "PARAMOUNT PROPACK PRIVATE LIMITED",
    shortName: "PPPL",
    companyKey: "PARAMOUNT",
    addressBillTo: "306/A, WALL STREET 2, OPP. ORIENT CLUB, ELLIS BRIDGE, AHMEDABAD - 380006, GUJARAT",
    addressShipTo: "C-125-126-27, DHARTI APPOLO INDUSTRAIL PARK, KADI CHHATRAL ROAD, CHHATRAL, GARDHINAGAR-382729, GUJARAT",
    pan: "AAHCP4599D",
    gstin: "24AAHCP4599D1Z8",
    email: "purchase@surajgroupofcompanies.com",
    contactNumbers: "99980 27301 / 99243 01166",
    departments: ["AHMEDABAD", "CHHATRAL"],
    branches: ["AHMEDABAD", "CHHATRAL"],
    settings: {
      showDeliveryLocation: true,
      showDeliveryContact: true,
      showSectionC: true,
      showSectionD: true,
      responsibleTeam: "Plant & Production Team",
      hodApproverName: "PLANT HEAD",
      defaultPoFormatStyle: "letterhead",
      themeColor: "#dc2626",
    },
  },
  {
    companyName: "RABS INDUSTRIES INDIA PRIVATE LIMITED",
    shortName: "RABS",
    companyKey: "RABS",
    addressBillTo: "306/A, WALL STREET 2, OPP. ORIENT CLUB, ELLIS BRIDGE, AHMEDABAD - 380006, GUJARAT",
    addressShipTo: "NEW BLOCK 1212, DHARTI APOLLO INDUSTRIAL PARK, KADI CHHATRAL ROAD, KALOL, CHHATRAL, GANDHINAGAR-382729, GUJARAT",
    pan: "AANCR5691J",
    gstin: "24AANCR5691J1ZS",
    email: "purchase@surajgroupofcompanies.com",
    contactNumbers: "99980 27301 / 99243 01166",
    departments: ["AHMEDABAD", "CHHATRAL"],
    branches: ["AHMEDABAD", "CHHATRAL"],
    settings: {
      showDeliveryLocation: true,
      showDeliveryContact: true,
      showSectionC: true,
      showSectionD: true,
      responsibleTeam: "Factory Operations Team",
      hodApproverName: "WORKS MANAGER",
      defaultPoFormatStyle: "letterhead",
      themeColor: "#15803d",
    },
  },
];

const router = express.Router();

// A completed workflow step is a sign-off, not a draft state. Keep this
// enforcement on the API as well as in the form so it cannot be bypassed.
const isDone = (item) =>
  Boolean(item && (item.checked || item.status === "Done" || item.status === "DONE" || item.date));

const completedTyreStages = (doc) => {
  const approvals = doc?.stage6?.approvals || [];
  return {
    stage1Done: isDone(doc?.stage1?.routingChecklist?.[0]),
    stage2Done: isDone(doc?.stage2?.routingChecklist?.[0]),
    stage3Done: doc?.stage3?.decision?.decision === "APPROVED" || Boolean(doc?.stage3?.signOff?.dateOfApproval),
    stage5Done: Boolean(doc?.stage5?.dispatchDone || doc?.stage5?.isDispatchDone) ||
      (doc?.stage5?.supplierDispatches || []).some((item) => item?.dispatchDone || item?.isDispatchDone),
    stage6Done: approvals.length >= 3 && approvals.every(isDone),
  };
};

const canOverrideSignOffLock = (user) => {
  if (!user) return false;
  if (user.tyre_procurement_admin) return true;
  const role = String(user?.role || "").toLowerCase().replace(/\s+/g, "");
  if (role === "admin" || role === "superadmin") return true;
  const identity = [user?.username, user?.first_name, user?.middle_name, user?.last_name]
    .filter(Boolean).join(" ").replace(/[^a-z]/gi, "").toLowerCase();
  return identity.includes("ajay") || String(user?.username || "").toLowerCase().includes("ajay");
};

const canManageTyreProcurementPermissions = (user) => {
  const role = String(user?.role || "").toLowerCase();
  const identity = [user?.username, user?.first_name, user?.middle_name, user?.last_name]
    .filter(Boolean).join(" ").replace(/[^a-z]/gi, "").toLowerCase();
  return role === "admin" || role === "superadmin" || identity.includes("ajay") ||
    String(user?.username || "").toLowerCase().includes("ajay");
};

function normalizeForComparison(val) {
  if (val === null || val === undefined || val === "") return "";
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? "" : val.toISOString();
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
    return trimmed.toUpperCase();
  }
  if (typeof val === "number") return val;
  if (typeof val === "boolean") return val;
  if (Array.isArray(val)) {
    return val.map(normalizeForComparison);
  }
  if (typeof val === "object") {
    const res = {};
    const keys = Object.keys(val).sort();
    for (const key of keys) {
      if (
        key === "_id" ||
        key === "__v" ||
        key === "createdAt" ||
        key === "updatedAt"
      ) {
        continue;
      }
      const norm = normalizeForComparison(val[key]);
      if (norm !== "") {
        res[key] = norm;
      }
    }
    return res;
  }
  return val;
}

function areStagesEqual(existingStage, payloadStage) {
  const normExisting = normalizeForComparison(existingStage?.toObject ? existingStage.toObject() : existingStage);
  const normPayload = normalizeForComparison(payloadStage);
  return isDeepStrictEqual(normExisting, normPayload);
}

function assertTyreSignOffLocks(existing, payload, user) {
  if (canOverrideSignOffLock(user)) return null;
  const locked = completedTyreStages(existing);
  const existingCredit = getPrCreditInfo(existing?.toObject ? existing.toObject() : existing);
  const payloadCredit = getPrCreditInfo(payload);
  const isCredit = Boolean(existingCredit?.isCredit || payloadCredit?.isCredit);

  // Credit PRs complete Site GRN before UTR is entered.
  // Never hard-block credit PRs with the Site GRN completed lock so users can enter UTR and edit the PR.
  if (!isCredit) {
    if (locked.stage6Done || ["GRN Done", "GRN Completed", "Closed"].includes(existing.status)) {
      return "This Site GRN is completed and can only be edited by an admin or Ajay Kumavat.";
    }
  }

  for (const stage of [1, 2, 3, 5]) {
    const existingStage = existing[`stage${stage}`];
    const payloadStage = payload[`stage${stage}`];
    if (locked[`stage${stage}Done`] && !areStagesEqual(existingStage, payloadStage)) {
      payload[`stage${stage}`] = existingStage?.toObject
        ? existingStage.toObject()
        : existingStage;
    }
  }
  return null;
}

// ─── Helpers ───
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "");

function uppercaseDeep(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return obj.toUpperCase();
  if (Array.isArray(obj)) return obj.map(uppercaseDeep);
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const res = {};
    for (const key of Object.keys(obj)) {
      if (
        key === "_id" ||
        key === "createdAt" ||
        key === "updatedAt" ||
        key === "__v" ||
        key.endsWith("Date") ||
        key.endsWith("Time") ||
        key.endsWith("Dt") ||
        key === "date" ||
        key.toLowerCase().includes("attachment") ||
        key.toLowerCase().includes("email") ||
        key === "poFormatStyle" ||
        key === "status"
      ) {
        res[key] = obj[key];
      } else {
        res[key] = uppercaseDeep(obj[key]);
      }
    }
    return res;
  }
  return obj;
}

function normalizeTyreEnums(payload) {
  if (!payload || typeof payload !== "object") return payload;

  if (payload.status) {
    const upper = String(payload.status).trim().toUpperCase();
    payload.status = statusEnumMap[upper] || payload.status;
  }

  const approvalModeMap = {
    WHATSAPP: "WhatsApp",
    "PHONE CALL": "Phone Call",
    EMAIL: "Email",
    "IN-PERSON": "In-Person",
  };

  const yesNoMap = {
    YES: "Yes",
    NO: "No",
  };

  const acceptedRejectedMap = {
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
  };

  const typeMap = {
    NEW: "New",
    REMOULD: "Remould",
  };

  const statusMap = {
    DONE: "Done",
    PENDING: "Pending",
    "IN PROGRESS": "In Progress",
  };

  ["stage1", "stage2", "stage3", "stage4", "stage5", "stage6"].forEach((stg) => {
    if (payload[stg]?.routingChecklist && Array.isArray(payload[stg].routingChecklist)) {
      payload[stg].routingChecklist.forEach((item) => {
        if (item && item.status && statusMap[item.status]) {
          item.status = statusMap[item.status];
        }
      });
    }
  });

  if (payload.stage1?.hodValidation?.approvalMode) {
    const val = payload.stage1.hodValidation.approvalMode;
    if (approvalModeMap[val]) {
      payload.stage1.hodValidation.approvalMode = approvalModeMap[val];
    }
  }

  if (payload.stage3?.reviewChecklist) {
    const cl = payload.stage3.reviewChecklist;
    ["budgetAvailable", "priceReasonable", "gstVerified", "paymentTermsAccepted", "docsAttached"].forEach((key) => {
      if (cl[key] && yesNoMap[cl[key]]) {
        cl[key] = yesNoMap[cl[key]];
      }
    });
  }

  if (payload.stage6?.itemsReceived && Array.isArray(payload.stage6.itemsReceived)) {
    payload.stage6.itemsReceived.forEach((item) => {
      if (item.type && typeMap[item.type]) item.type = typeMap[item.type];
      if (item.hotStampDone && yesNoMap[item.hotStampDone]) item.hotStampDone = yesNoMap[item.hotStampDone];
      if (item.photoTaken && yesNoMap[item.photoTaken]) item.photoTaken = yesNoMap[item.photoTaken];
      if (item.acceptedRejected && acceptedRejectedMap[item.acceptedRejected]) item.acceptedRejected = acceptedRejectedMap[item.acceptedRejected];
    });
  }

  if (payload.stage6?.qualityConformanceCheck) {
    const qcc = payload.stage6.qualityConformanceCheck;
    ["tyresVerified", "tyreNumbersMatched", "hotStampingCompleted", "photosTaken", "invoiceVerified", "returnClauseReviewed"].forEach((key) => {
      if (qcc[key] && yesNoMap[qcc[key]]) {
        qcc[key] = yesNoMap[qcc[key]];
      }
    });
  }

  return payload;
}

async function saveSuppliersFromDoc(doc) {
  try {
    const suppliers = doc?.stage2?.suppliers || [];
    for (const s of suppliers) {
      if (s && s.supplierName && s.supplierName.trim()) {
        const name = s.supplierName.trim().toUpperCase();
        const updateData = {
          supplierName: name,
          contactPerson: s.contactPerson ? String(s.contactPerson).toUpperCase() : "",
          phoneNumber: s.phoneNumber ? String(s.phoneNumber).toUpperCase() : "",
          emailWhatsApp: s.emailWhatsApp ? String(s.emailWhatsApp).toUpperCase() : "",
          gstNumber: s.gstNumber ? String(s.gstNumber).toUpperCase() : "",
          bankAccountNo: s.bankAccountNo ? String(s.bankAccountNo).toUpperCase() : "",
          bankName: s.bankName ? String(s.bankName).toUpperCase() : "",
          bankIfscCode: s.bankIfscCode ? String(s.bankIfscCode).toUpperCase() : "",
          bankBranchCode: s.bankBranchCode ? String(s.bankBranchCode).toUpperCase() : "",
          supplierNameInBank: s.supplierNameInBank ? String(s.supplierNameInBank).toUpperCase() : "",
          paymentTerms: s.paymentTerms ? String(s.paymentTerms).toUpperCase() : "",
          address: (s.address || s.supplierAddress) ? String(s.address || s.supplierAddress).toUpperCase() : "",
          supplierAddress: (s.supplierAddress || s.address) ? String(s.supplierAddress || s.address).toUpperCase() : "",
        };
        await TyreSupplierModel.findOneAndUpdate(
          { supplierName: name },
          { $set: updateData },
          { upsert: true, new: true }
        );
      }
    }
  } catch (err) {
    logger.error("Error auto-saving suppliers from Tyre Procurement doc:", err);
  }
}

async function saveProductsFromDoc(doc) {
  try {
    const items = doc?.stage1?.itemsRequired || [];
    for (const it of items) {
      const name = (it.productName || it.tyreType || "").trim().toUpperCase();
      if (name) {
        const updateFields = { productName: name };
        const brand = (it.brandPreference || "").trim().toUpperCase();
        const spec = (it.specification || it.sizeSpec || "").trim().toUpperCase();
        const cost = Number(it.estUnitCost) || 0;
        if (brand) updateFields.brandPreference = brand;
        if (spec) updateFields.specification = spec;
        if (cost) updateFields.estUnitCost = cost;

        await ProcurementProductModel.findOneAndUpdate(
          { productName: name },
          { $set: updateFields },
          { upsert: true, new: true }
        );
      }
    }

    const stage2Suppliers = doc?.stage2?.suppliers || [];
    for (const sup of stage2Suppliers) {
      const name = (sup.selectedProduct || sup.selectedTyreType || "").trim().toUpperCase();
      if (name) {
        const updateFields = { productName: name };
        const brand = (sup.brand || sup.tyreBrand || "").trim().toUpperCase();
        const spec = (sup.sizeSpecification || "").trim().toUpperCase();
        const cost = Number(sup.unitPriceNew) || 0;
        if (brand) updateFields.brandPreference = brand;
        if (spec) updateFields.specification = spec;
        if (cost) updateFields.estUnitCost = cost;

        await ProcurementProductModel.findOneAndUpdate(
          { productName: name },
          { $set: updateFields },
          { upsert: true, new: true }
        );
      }
    }
  } catch (err) {
    logger.error("Error auto-saving products from Procurement doc:", err);
  }
}

async function saveApproversFromDoc(doc) {
  try {
    const checkedByName = (
      doc?.checkedBy ||
      doc?.stage2?.checkedBy ||
      doc?.stage1?.checkedBy ||
      doc?.stage1?.hodValidation?.validatedBy ||
      ""
    ).trim().toUpperCase();

    const checkedByDesig = (
      doc?.checkedByDesignation ||
      doc?.stage2?.checkedByDesignation ||
      doc?.stage1?.checkedByDesignation ||
      doc?.stage1?.hodValidation?.designation ||
      ""
    ).trim().toUpperCase();

    if (checkedByName && checkedByDesig) {
      await ProcurementApproverModel.findOneAndUpdate(
        { name: checkedByName, designation: checkedByDesig },
        { $set: { name: checkedByName, designation: checkedByDesig, role: "CHECKED_BY" } },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    logger.error("Error auto-saving approver from Procurement doc:", err);
  }
}

function parseCreditDays(terms) {
  if (!terms) return 0;
  const str = String(terms).toUpperCase();
  if (str.includes("ADVANCE") || str.includes("ADV")) return 0;
  const match = str.match(/(\d+)\s*(DAY|DAYS)?/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return 0;
}

function getPrCreditInfo(doc) {
  if (!doc) return { isCredit: false, maxCreditDays: 0, diffDays: 999, isDueSoon: false, isOverdue: false, isPaid: false };
  const s2 = doc.stage2 || {};
  const s3 = doc.stage3 || {};
  const s4 = doc.stage4 || {};
  const s5 = doc.stage5 || {};
  const s6 = doc.stage6 || {};

  const selectedSuppliers = s2.selectedSuppliers || [];
  const suppliers = s2.suppliers || [];
  const supplierPayments = s4.supplierPayments || [];

  let creditDaysList = [];
  if (selectedSuppliers.length > 0) {
    selectedSuppliers.forEach((sel) => {
      const selName = (sel.selectedSupplier || "").toUpperCase().trim();
      const matchSup = suppliers.find((s) => (s.supplierName || "").toUpperCase().trim() === selName || String(s._id) === String(sel.selectedSupplier));
      const terms = matchSup?.paymentTerms || sel.paymentTerms;
      creditDaysList.push(parseCreditDays(terms));
    });
  } else if (suppliers.length > 0) {
    suppliers.forEach((s) => {
      if (s.supplierName) {
        creditDaysList.push(parseCreditDays(s.paymentTerms));
      }
    });
  } else if (supplierPayments.length > 0) {
    supplierPayments.forEach((sp) => {
      creditDaysList.push(parseCreditDays(sp.paymentTerms));
    });
  }

  const maxCreditDays = creditDaysList.length > 0 ? Math.max(...creditDaysList) : 0;
  const isCredit = maxCreditDays > 0;

  const isPaid =
    supplierPayments.length > 0
      ? supplierPayments.every((sp) => Boolean(sp.isPaid && sp.utrNumber?.trim()))
      : Boolean(
          (s4.paymentDetails?.paymentReferenceUtr?.trim() || s4.paymentDetails?.paymentDate) &&
          doc.status !== "Finance Approved"
        );

  const invDateStr =
    s6.referenceInfos?.[0]?.invoiceDate ||
    s6.itemsReceived?.[0]?.invoiceDate ||
    s5.supplierDispatches?.[0]?.dispatchDetails?.invoiceDate ||
    s5.dispatchDetails?.invoiceDate;

  const baseDate = invDateStr
    ? new Date(invDateStr)
    : s3.signOff?.dateOfApproval
    ? new Date(s3.signOff.dateOfApproval)
    : doc.createdAt
    ? new Date(doc.createdAt)
    : new Date();

  const dueDate = new Date(baseDate.getTime() + maxCreditDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDateStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const diffDays = Math.round((dueDateStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));

  const isDueSoon = isCredit && !isPaid && diffDays <= 7 && diffDays > 0;
  const isOverdue = isCredit && !isPaid && diffDays <= 0;

  return {
    isCredit,
    maxCreditDays,
    dueDate,
    dueDateStr: dueDate.toLocaleDateString("en-GB"),
    baseDateStr: baseDate.toLocaleDateString("en-GB"),
    diffDays,
    isDueSoon,
    isOverdue,
    isPaid,
  };
}

function deriveStatus(doc) {
  if (!doc) return "Draft";
  const s6 = doc.stage6 || {};
  const s5 = doc.stage5 || {};
  const s4 = doc.stage4 || {};
  const s3 = doc.stage3 || {};
  const s2 = doc.stage2 || {};
  const s1 = doc.stage1 || {};

  const currentStatusUpper = String(doc.status || "").trim().toUpperCase();

  // Check Stage 6 Approvals
  const s6Approvals = s6.approvals || [];
  const validApprovals = s6Approvals.filter((a) => a && (a.checked || a.status === "Done" || a.status === "DONE" || a.signature || a.date || a.name));
  const allGrnApprovalsDone = s6Approvals.length >= 3 && s6Approvals.every((a) => a && (a.checked || a.status === "Done" || a.status === "DONE" || a.signature || a.date));

  if (currentStatusUpper === "CLOSED" || currentStatusUpper === "GRN COMPLETED" || currentStatusUpper === "GRN DONE" || allGrnApprovalsDone) {
    return "GRN Done";
  }

  if (currentStatusUpper === "GRN RECEIVED" || currentStatusUpper === "GRN READY" || validApprovals.length > 0 || s6.grnSeriesNo) {
    return "GRN Ready";
  }

  // Check Stage 5 Dispatch
  const isDispatchDone = Boolean(s5.dispatchDone) || Boolean(s5.isDispatchDone) || (s5.supplierDispatches || []).some((sd) => sd.dispatchDone || sd.isDispatchDone);
  if (isDispatchDone || currentStatusUpper === "ORDER PLACED" || currentStatusUpper === "DISPATCHED") {
    return "Order Placed";
  }

  // Check Stage 4 Payment UTR
  const supplierPayments = s4.supplierPayments || [];
  const hasUtr =
    supplierPayments.length > 0
      ? supplierPayments.some((sp) => Boolean(sp.utrNumber?.trim()))
      : Boolean(
          s4.paymentDetails?.paymentReferenceUtr?.trim() ||
          s4.paymentDetails?.paymentDate
        );

  if (hasUtr || currentStatusUpper === "PAYMENT DONE") {
    return "Payment Done";
  }

  // Check Stage 3 Finance Approval
  const isFinanceApproved = s3.decision?.decision === "APPROVED" || Boolean(s3.signOff?.dateOfApproval);
  if (isFinanceApproved || currentStatusUpper === "FINANCE APPROVED") {
    const creditInfo = getPrCreditInfo(doc);
    if (creditInfo.isCredit) {
      return "Dispatched / Site GRN Ready";
    }
    return "Finance Approved";
  }

  if (s2.routingChecklist?.[0]?.status === "Done" || s2.routingChecklist?.[0]?.status === "DONE" || s2.routingChecklist?.[0]?.date || (s2.suppliers || []).some((s) => s.supplierName)) {
    return "Quotation Received";
  }

  if (s1.routingChecklist?.[1]?.status === "Done" || s1.routingChecklist?.[1]?.status === "DONE" || s1.routingChecklist?.[1]?.date || s1.hodValidation?.dateTimeOfApproval) {
    return "Preparing for Quotation";
  }

  if (s1.routingChecklist?.[0]?.status === "Done" || s1.routingChecklist?.[0]?.status === "DONE" || s1.routingChecklist?.[0]?.date || s1.prNumber) {
    return "PR Raised";
  }

  return statusEnumMap[currentStatusUpper] || "Draft";
}

function computeDoc(doc) {
  if (!doc) return doc;
  const clone = JSON.parse(JSON.stringify(doc));

  // Compute estTotal for Stage 1 items
  let estTotalCost = 0;
  clone.stage1?.itemsRequired?.forEach((item) => {
    item.estTotal = (Number(item.qty) || 0) * (Number(item.estUnitCost) || 0);
    estTotalCost += item.estTotal;
  });
  if (clone.stage1) {
    clone.stage1.estimatedTotalCost = estTotalCost;
    if (!clone.stage1.hodValidation) clone.stage1.hodValidation = {};
    if (!clone.stage1.hodValidation.validatedBy) {
      clone.stage1.hodValidation.validatedBy = "MOHIT SINGH";
    }
  }

  // Attach computed credit information
  clone.creditInfo = getPrCreditInfo(clone);

  if (clone.stage3) {
    if (!clone.stage3.signOff) clone.stage3.signOff = {};
    if (!clone.stage3.signOff.financeManagerName) {
      clone.stage3.signOff.financeManagerName = "CHIRAG SHAH";
    }
  }

  clone.status = deriveStatus(clone);

  // Compute TAT in days: strictly counted from PR raised / created date to GRN update date
  const prDate = clone.stage1?.prDate || clone.createdAt;
  const grnDate =
    clone.stage6?.grnDate ||
    clone.stage6?.updatedAt ||
    (clone.status === "GRN Done" || clone.status === "GRN Completed" || clone.status === "Closed"
      ? clone.updatedAt
      : null);

  if (prDate && grnDate) {
    const diffMs = new Date(grnDate).getTime() - new Date(prDate).getTime();
    clone.tatDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  } else {
    clone.tatDays = null;
  }

  return clone;
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function emptyRow(cols) {
  return Array(cols).fill("");
}

// Helper to generate next PR Number and PO Number
// Formats:
// PR: PR/{CompanyShortName}/{Month}-{Seq}/{FY}  e.g. PR/SFPL/OCT-01/26-27 (supports legacy PR/...)
// PO: PO/{CompanyShortName}/{Month}-{Seq}/{FY}  e.g. PO/SFPL/OCT-01/26-27 (supports legacy PO/...)
async function generateNextTyreNumbers(dateInput, companyCode = "SFPL") {
  const d = dateInput ? new Date(dateInput) : new Date();
  const monthShort = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const m = d.getMonth();

  let startYear, endYear;
  if (m >= 3) {
    startYear = d.getFullYear();
    endYear = d.getFullYear() + 1;
  } else {
    startYear = d.getFullYear() - 1;
    endYear = d.getFullYear();
  }
  const fyCode = `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
  const cleanShortName = resolveCompanyShortName(companyCode);
  const escapedShort = cleanShortName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // If month is OCT, preserve backwards compatibility with October series
  // From November onward (NOV, DEC, JAN, etc.), strictly scope to company-specific month series so each company series restarts at 01 every month
  const isOctober = monthShort === "OCT";
  const prPattern = isOctober
    ? new RegExp(`^(?:PR/${escapedShort}/${monthShort}-|PR/${escapedShort}/${monthShort}/|PR/${monthShort}/|TT/TYRE/${monthShort}/)(\\d+)(?:/${fyCode})?$`, "i")
    : new RegExp(`^(?:PR/${escapedShort}/${monthShort}-|PR/${escapedShort}/${monthShort}/)(\\d+)(?:/${fyCode})?$`, "i");

  const records = await TyreProcurementSop.find({ prNumber: { $regex: prPattern } }).select("prNumber").lean();

  let maxPrSeq = 0;
  records.forEach((rec) => {
    if (rec.prNumber) {
      const match = rec.prNumber.match(prPattern);
      if (match && match[1]) {
        const seq = parseInt(match[1], 10);
        if (seq > maxPrSeq) maxPrSeq = seq;
      }
    }
  });

  const poPattern = isOctober
    ? new RegExp(`^(?:PO/${escapedShort}/${monthShort}-|PO/${escapedShort}/${monthShort}/|PO/${monthShort}-|TYRE/${monthShort}-)(\\d+)(?:/${fyCode})?$`, "i")
    : new RegExp(`^(?:PO/${escapedShort}/${monthShort}-|PO/${escapedShort}/${monthShort}/)(\\d+)(?:/${fyCode})?$`, "i");

  const poDocs = await TyreProcurementSop.find({
    $or: [
      { poNumber: { $regex: poPattern } },
      { "stage2.selectedSuppliers.poNumber": { $regex: poPattern } },
    ],
  }).select("poNumber stage2.selectedSuppliers.poNumber").lean();

  let maxPoSeq = 0;
  poDocs.forEach((doc) => {
    if (doc.poNumber) {
      const mMatch = doc.poNumber.match(poPattern);
      if (mMatch && mMatch[1]) {
        const seq = parseInt(mMatch[1], 10);
        if (seq > maxPoSeq) maxPoSeq = seq;
      }
    }
    const supList = doc.stage2?.selectedSuppliers || [];
    supList.forEach((s) => {
      if (s && s.poNumber) {
        const mMatch = s.poNumber.match(poPattern);
        if (mMatch && mMatch[1]) {
          const seq = parseInt(mMatch[1], 10);
          if (seq > maxPoSeq) maxPoSeq = seq;
        }
      }
    });
  });

  const nextPrSeq = String(maxPrSeq + 1).padStart(2, "0");
  const nextPoSeq = String(maxPoSeq + 1).padStart(2, "0");

  const prNumber = `PR/${cleanShortName}/${monthShort}-${nextPrSeq}/${fyCode}`;
  const poNumber = `PO/${cleanShortName}/${monthShort}-${nextPoSeq}/${fyCode}`;

  return {
    prNumber,
    poNumber,
    seq: nextPrSeq,
    nextPoSeq: maxPoSeq + 1,
    monthShort,
    fyCode,
    companyShortName: cleanShortName,
  };
}

// Helper to generate next sequential PO numbers for a list of suppliers
async function generateSupplierPoNumbers(suppliers = [], dateInput, excludeDocId = null, companyCode = "SFPL") {
  const d = dateInput ? new Date(dateInput) : new Date();
  const monthShort = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const m = d.getMonth();

  let startYear, endYear;
  if (m >= 3) {
    startYear = d.getFullYear();
    endYear = d.getFullYear() + 1;
  } else {
    startYear = d.getFullYear() - 1;
    endYear = d.getFullYear();
  }
  const fyCode = `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
  const cleanShortName = resolveCompanyShortName(companyCode);
  const escapedShort = cleanShortName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const isOctober = monthShort === "OCT";
  const poPattern = isOctober
    ? new RegExp(`^(?:PO/${escapedShort}/${monthShort}-|PO/${escapedShort}/${monthShort}/|PO/${monthShort}-|TYRE/${monthShort}-)(\\d+)(?:/${fyCode})?$`, "i")
    : new RegExp(`^(?:PO/${escapedShort}/${monthShort}-|PO/${escapedShort}/${monthShort}/)(\\d+)(?:/${fyCode})?$`, "i");

  const query = {
    $or: [
      { poNumber: { $regex: poPattern } },
      { "stage2.selectedSuppliers.poNumber": { $regex: poPattern } },
    ],
  };
  if (excludeDocId) {
    query._id = { $ne: excludeDocId };
  }
  const allDocs = await TyreProcurementSop.find(query).select("poNumber stage2.selectedSuppliers.poNumber").lean();

  let maxPoSeq = 0;
  allDocs.forEach((doc) => {
    if (doc.poNumber) {
      const mMatch = doc.poNumber.match(poPattern);
      if (mMatch && mMatch[1]) {
        const seq = parseInt(mMatch[1], 10);
        if (seq > maxPoSeq) maxPoSeq = seq;
      }
    }
    const supList = doc.stage2?.selectedSuppliers || [];
    supList.forEach((s) => {
      if (s && s.poNumber) {
        const mMatch = s.poNumber.match(poPattern);
        if (mMatch && mMatch[1]) {
          const seq = parseInt(mMatch[1], 10);
          if (seq > maxPoSeq) maxPoSeq = seq;
        }
      }
    });
  });

  let currentSeq = maxPoSeq;
  const supplierToPo = {};

  suppliers.forEach((s) => {
    const sName = (typeof s === "string" ? s : (s?.selectedSupplier || s?.supplierName || "")).trim().toUpperCase();
    if (!sName) return;
    if (!supplierToPo[sName]) {
      currentSeq += 1;
      const seqStr = String(currentSeq).padStart(2, "0");
      supplierToPo[sName] = `PO/${cleanShortName}/${monthShort}-${seqStr}/${fyCode}`;
    }
  });

  return { supplierToPo, nextPoSeq: currentSeq + 1, monthShort, fyCode, companyShortName: cleanShortName };
}

// Helper to generate next GRN Number
// Format: GRN/TYRE/{SEQ}/{MONTH}/{FINANCIAL_YEAR} e.g. GRN/TYRE/01/AUG/26-27
async function generateNextGrnNumber(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  const monthShort = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const m = d.getMonth();

  let startYear, endYear;
  if (m >= 3) {
    startYear = d.getFullYear();
    endYear = d.getFullYear() + 1;
  } else {
    startYear = d.getFullYear() - 1;
    endYear = d.getFullYear();
  }
  const fyCode = `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;

  const regex = new RegExp(`^GRN/TYRE/(\\d+)/${monthShort}/${fyCode}$`, "i");
  const records = await TyreProcurementSop.find({ "stage6.grnSeriesNo": { $regex: regex } }).select("stage6.grnSeriesNo").lean();

  let maxSeq = 0;
  records.forEach((rec) => {
    const grnNo = rec.stage6?.grnSeriesNo;
    if (grnNo) {
      const match = grnNo.match(new RegExp(`^GRN/TYRE/(\\d+)/${monthShort}/${fyCode}$`, "i"));
      if (match && match[1]) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(2, "0");
  return `GRN/TYRE/${nextSeq}/${monthShort}/${fyCode}`;
}

// ─── CRUD Routes ───

// Endpoint to fetch next PR and PO numbers
router.get("/tyre-procurement/next-numbers", authMiddleware, async (req, res) => {
  try {
    const { date, companyShortName } = req.query;
    const result = await generateNextTyreNumbers(date, companyShortName);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    logger.error("Error generating Tyre PR/PO numbers:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint to generate PO numbers for multiple selected suppliers
router.post("/tyre-procurement/next-po-numbers", authMiddleware, async (req, res) => {
  try {
    const { suppliers = [], date, currentId, companyShortName } = req.body;
    const result = await generateSupplierPoNumbers(suppliers, date, currentId, companyShortName);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    logger.error("Error generating supplier PO numbers:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Upload Attachments Endpoint (Doc, Excel, PDF, JPEG/PNG up to 10MB) ───
router.post(
  "/tyre-procurement/upload-attachment",
  authMiddleware,
  uploadProcurementFiles.array("files", 10),
  async (req, res) => {
    try {
      const files = req.files || [];
      const uploadedAttachments = files.map((f) => ({
        fileName: f.originalname,
        fileUrl: `/uploads/procurement/${f.filename}`,
        fileType: f.mimetype || path.extname(f.originalname),
        fileSize: f.size,
        uploadedAt: new Date(),
      }));
      res.status(200).json({ success: true, attachments: uploadedAttachments });
    } catch (err) {
      logger.error("Error uploading procurement attachment:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ─── Company Directory Master Endpoints ───

// Fetch all companies from Company Directory (auto-seeds default 6 if empty)
router.get("/tyre-procurement/company-directory", authMiddleware, async (req, res) => {
  try {
    let companies = await ProcurementCompanyModel.find({ isActive: true }).sort({ companyName: 1 }).lean();
    if (!companies || companies.length === 0) {
      // Auto-seed default companies
      await ProcurementCompanyModel.insertMany(DEFAULT_COMPANY_DIRECTORY);
      companies = await ProcurementCompanyModel.find({ isActive: true }).sort({ companyName: 1 }).lean();
    }
    res.status(200).json({ success: true, companies });
  } catch (err) {
    logger.error("Error fetching procurement company directory:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Save / Upsert single company
router.post("/tyre-procurement/company-directory", authMiddleware, async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.companyName || !payload.companyName.trim()) {
      return res.status(400).json({ success: false, message: "Company Name is required" });
    }
    const cleanName = payload.companyName.trim();
    const shortName = (payload.shortName || resolveCompanyShortName(cleanName)).trim().toUpperCase();
    const companyKey = (payload.companyKey || resolveCompanyShortName(cleanName)).trim().toUpperCase();

    const updated = await ProcurementCompanyModel.findOneAndUpdate(
      { companyName: cleanName },
      {
        $set: {
          ...payload,
          companyName: cleanName,
          shortName,
          companyKey,
          email: payload.email?.trim() || "purchase@surajgroupofcompanies.com",
          contactNumbers: payload.contactNumbers?.trim() || "99980 27301 / 99243 01166",
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ success: true, company: updated });
  } catch (err) {
    logger.error("Error saving procurement company:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Bulk import companies from JSON or parsed Excel
router.post("/tyre-procurement/company-directory/bulk-import", authMiddleware, async (req, res) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : req.body.companies || [];
    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, message: "No company records provided for bulk import" });
    }

    const upsertPromises = rows.map((r) => {
      const companyName = (r["Company Name"] || r.companyName || "").trim();
      if (!companyName) return null;
      const shortName = (r["Short Name"] || r.shortName || resolveCompanyShortName(companyName)).trim().toUpperCase();
      const addressBillTo = (r["Bill To Address"] || r["Address - Bill To"] || r.addressBillTo || "").trim();
      const addressShipTo = (r["Ship To Address"] || r["Address - Ship To"] || r.addressShipTo || "").trim();
      const gstin = (r["GSTIN"] || r.gstin || "").trim().toUpperCase();
      const pan = (r["PAN"] || r.pan || "").trim().toUpperCase();
      const email = (r["Email ID"] || r.email || "purchase@surajgroupofcompanies.com").trim();
      const contactNumbers = (r["Contact Numbers"] || r["Contact No"] || r.contactNumbers || "99980 27301 / 99243 01166").trim();

      return ProcurementCompanyModel.findOneAndUpdate(
        { companyName },
        {
          $set: {
            companyName,
            shortName,
            companyKey: resolveCompanyShortName(companyName),
            addressBillTo,
            addressShipTo,
            gstin,
            pan,
            email,
            contactNumbers,
            isActive: true,
          },
        },
        { new: true, upsert: true }
      );
    }).filter(Boolean);

    await Promise.all(upsertPromises);
    const all = await ProcurementCompanyModel.find({ isActive: true }).sort({ companyName: 1 }).lean();
    res.status(200).json({ success: true, count: upsertPromises.length, companies: all });
  } catch (err) {
    logger.error("Error bulk importing companies:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Bulk import departments / branches per company
router.post("/tyre-procurement/company-directory/import-departments", authMiddleware, async (req, res) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : req.body.departments || [];
    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, message: "No department records provided" });
    }

    const companyDeptMap = {};
    rows.forEach((r) => {
      const company = (r["Company Name"] || r.companyName || "").trim();
      const dept = (r["Department / Branch"] || r["Department"] || r["Branch"] || r.department || "").trim();
      if (company && dept) {
        if (!companyDeptMap[company]) companyDeptMap[company] = new Set();
        companyDeptMap[company].add(dept);
      }
    });

    for (const [companyName, deptSet] of Object.entries(companyDeptMap)) {
      const depts = Array.from(deptSet);
      await ProcurementCompanyModel.updateOne(
        { companyName: new RegExp(`^${companyName}$`, "i") },
        { $addToSet: { departments: { $each: depts }, branches: { $each: depts } } }
      );
    }

    const all = await ProcurementCompanyModel.find({ isActive: true }).sort({ companyName: 1 }).lean();
    res.status(200).json({ success: true, message: "Departments successfully updated", companies: all });
  } catch (err) {
    logger.error("Error importing departments:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Pulse Daily & Date Range Activity Endpoint ───
router.get("/tyre-procurement/pulse", authMiddleware, async (req, res) => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const startDateStr = req.query.startDate || req.query.fromDate || req.query.date || todayStr;
    const endDateStr = req.query.endDate || req.query.toDate || req.query.date || startDateStr;

    const startOfDay = new Date(`${startDateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${endDateStr}T23:59:59.999Z`);

    // 1. PRs created or raised in date range
    const prs = await TyreProcurementSop.find({
      $or: [
        { createdAt: { $gte: startOfDay, $lte: endOfDay } },
        { "stage1.prDate": { $gte: startOfDay, $lte: endOfDay } },
      ],
    })
      .select("prNumber poNumber companyName companyShortName stage1.preparedBy stage1.departmentLocation stage1.estimatedTotalCost status createdAt stage1.prDate")
      .lean();

    // 2. POs generated or approved in date range
    const pos = await TyreProcurementSop.find({
      $or: [
        { "stage3.signOff.dateOfApproval": { $gte: startOfDay, $lte: endOfDay } },
        { "stage2.poDate": { $gte: startOfDay, $lte: endOfDay } },
        { "stage3.poDate": { $gte: startOfDay, $lte: endOfDay } },
      ],
    })
      .select("prNumber poNumber companyName companyShortName stage2.selectedSupplierL1 stage2.selectedSuppliers status createdAt")
      .lean();

    // 3. GRNs recorded or updated in date range
    const grns = await TyreProcurementSop.find({
      $or: [
        { "stage6.grnDate": { $gte: startOfDay, $lte: endOfDay } },
        { "stage6.updatedAt": { $gte: startOfDay, $lte: endOfDay } },
        { status: { $in: ["GRN Done", "GRN Completed", "Closed"] }, updatedAt: { $gte: startOfDay, $lte: endOfDay } },
      ],
    })
      .select("prNumber poNumber companyName companyShortName stage6.supplierName stage6.invoiceNo stage6.acceptedQty status updatedAt stage6.grnDate")
      .lean();

    res.status(200).json({
      success: true,
      startDate: startDateStr,
      endDate: endDateStr,
      isRange: startDateStr !== endDateStr,
      counts: {
        prCount: prs.length,
        poCount: pos.length,
        grnCount: grns.length,
      },
      prs,
      pos,
      grns,
    });
  } catch (err) {
    logger.error("Error fetching procurement pulse data:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Comprehensive Excel Report Endpoint ───
router.get("/tyre-procurement/excel-report", authMiddleware, async (req, res) => {
  try {
    const { month, year, companyKey, groupBy = "vendor" } = req.query;
    const query = {};

    if (companyKey && companyKey !== "ALL") {
      const cleanKey = companyKey.toUpperCase();
      query.$or = [{ companyKey: cleanKey }, { companyShortName: cleanKey }];
    }

    const allDocs = await TyreProcurementSop.find(query).sort({ createdAt: -1 }).lean();

    // Filter by month/year if specified
    const filteredDocs = allDocs.filter((doc) => {
      const dt = new Date(doc.stage1?.prDate || doc.createdAt);
      if (isNaN(dt.getTime())) return true;
      if (year && year !== "ALL" && dt.getFullYear().toString() !== year.toString()) return false;
      if (month && month !== "ALL") {
        const mIdx = dt.getMonth() + 1;
        if (mIdx.toString() !== month.toString()) return false;
      }
      return true;
    });

    // Compute groups
    const vendorMap = {};
    const productMap = {};
    let totalBusinessVolume = 0;
    let totalItemsQty = 0;

    filteredDocs.forEach((doc) => {
      const comp = computeDoc(doc);
      const isCompleted = ["GRN Done", "GRN Completed", "Closed"].includes(comp.status);
      const poVal = Number(comp.stage2?.selectedSupplierL1Amount || comp.stage3?.financeApprovedCost || comp.stage1?.estimatedTotalCost || 0);
      if (isCompleted) {
        totalBusinessVolume += poVal;
      }

      // Group by Vendor
      const vendorName = (
        comp.stage2?.selectedSupplierL1 ||
        comp.stage2?.selectedSuppliers?.[0]?.selectedSupplier ||
        comp.stage2?.selectedSuppliers?.[0]?.supplierName ||
        "Pending Selection"
      ).trim();

      if (!vendorMap[vendorName]) {
        vendorMap[vendorName] = { vendorName, poCount: 0, totalQty: 0, totalAmount: 0, records: [] };
      }
      vendorMap[vendorName].poCount += 1;
      vendorMap[vendorName].totalAmount += poVal;
      vendorMap[vendorName].records.push({
        prNumber: comp.prNumber,
        poNumber: comp.poNumber || "-",
        company: comp.companyName,
        status: comp.status,
        amount: poVal,
      });

      // Group by Product
      const items = comp.stage1?.itemsRequired || [];
      items.forEach((item) => {
        const prod = (item.productName || item.tyreType || "General Procurement").trim();
        const qty = Number(item.qty) || 0;
        const est = Number(item.estTotal) || 0;
        totalItemsQty += qty;

        if (!productMap[prod]) {
          productMap[prod] = { productName: prod, totalQty: 0, totalEstimatedCost: 0, poCount: 0 };
        }
        productMap[prod].totalQty += qty;
        productMap[prod].totalEstimatedCost += est;
        productMap[prod].poCount += 1;
      });
    });

    res.status(200).json({
      success: true,
      summary: {
        totalPRs: filteredDocs.length,
        totalBusinessVolume,
        totalItemsQty,
        vendorCount: Object.keys(vendorMap).length,
        productCount: Object.keys(productMap).length,
      },
      byVendor: Object.values(vendorMap),
      byProduct: Object.values(productMap),
      records: filteredDocs.map((d) => computeDoc(d)),
    });
  } catch (err) {
    logger.error("Error generating procurement excel report:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Procurement Product Master Endpoints ───

// Fetch all saved procurement products
router.get("/procurement-products", authMiddleware, async (req, res) => {
  try {
    const products = await ProcurementProductModel.find().sort({ productName: 1 }).lean();
    res.status(200).json({ success: true, products });
  } catch (err) {
    logger.error("Error fetching procurement products:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Save a new procurement product
router.post("/procurement-products", authMiddleware, async (req, res) => {
  try {
    const { productName, brandPreference, specification, estUnitCost } = req.body;
    if (!productName || !productName.trim()) {
      return res.status(400).json({ success: false, message: "Product name is required" });
    }
    const name = productName.trim().toUpperCase();
    const updateFields = { productName: name };
    if (brandPreference) updateFields.brandPreference = brandPreference.trim().toUpperCase();
    if (specification) updateFields.specification = specification.trim().toUpperCase();
    if (estUnitCost !== undefined && estUnitCost !== "") updateFields.estUnitCost = Number(estUnitCost) || 0;

    const product = await ProcurementProductModel.findOneAndUpdate(
      { productName: name },
      { $set: updateFields },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, product });
  } catch (err) {
    logger.error("Error saving procurement product:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
// Default seeded approvers including Transport & Management authorities
const DEFAULT_APPROVERS = [
  { name: "MOHIT SINGH", designation: "CEO", role: "CHECKED_BY" },
  { name: "RAUF KHAN", designation: "HOD - MAINTENANCE & WORKSHOP", role: "CHECKED_BY" },
  { name: "MAINTENANCE MANAGER", designation: "MAINTENANCE & WORKSHOP", role: "CHECKED_BY" },
  { name: "FLEET MANAGER", designation: "FLEET & TRANSPORT OPERATIONS", role: "CHECKED_BY" },
  { name: "RAJAN SHAH", designation: "DIRECTOR", role: "CHECKED_BY" },
  { name: "CHIRAG SHAH", designation: "SR. MANAGER - ACCOUNTS", role: "APPROVED_BY" },
  { name: "AFTAB BELIM", designation: "PURCHASE OFFICER", role: "PREPARED_BY" },
  { name: "PUNIT SURAJ", designation: "MANAGING DIRECTOR", role: "CHECKED_BY" },
  { name: "AJAY SHARMA", designation: "FINANCE CONTROLLER", role: "CHECKED_BY" },
];

// Fetch all saved procurement approvers (Name + Designation pairs)
router.get("/procurement-approvers", authMiddleware, async (req, res) => {
  try {
    // Ensure all default approvers (including Transport & Workshop) are seeded into the database
    for (const app of DEFAULT_APPROVERS) {
      await ProcurementApproverModel.findOneAndUpdate(
        { name: app.name.toUpperCase(), designation: app.designation.toUpperCase() },
        { $setOnInsert: { name: app.name.toUpperCase(), designation: app.designation.toUpperCase(), role: app.role } },
        { upsert: true }
      );
    }
    const approvers = await ProcurementApproverModel.find().sort({ name: 1 }).lean();
    res.status(200).json({ success: true, approvers });
  } catch (err) {
    logger.error("Error fetching procurement approvers:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Save or update a procurement approver (Name + Designation pair)
router.post("/procurement-approvers", authMiddleware, async (req, res) => {
  try {
    const { name, designation, role = "CHECKED_BY" } = req.body;
    if (!name || !name.trim() || !designation || !designation.trim()) {
      return res.status(400).json({ success: false, message: "Name and designation are required" });
    }
    const cleanName = name.trim().toUpperCase();
    const cleanDesignation = designation.trim().toUpperCase();

    const approver = await ProcurementApproverModel.findOneAndUpdate(
      { name: cleanName, designation: cleanDesignation },
      { $set: { name: cleanName, designation: cleanDesignation, role } },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, approver });
  } catch (err) {
    logger.error("Error saving procurement approver:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete a procurement approver
router.delete("/procurement-approvers/:id", authMiddleware, async (req, res) => {
  try {
    await ProcurementApproverModel.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Approver removed" });
  } catch (err) {
    logger.error("Error deleting procurement approver:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Pending Count for Dashboard Notification Badge ───
router.get("/tyre-procurement/pending-count", authMiddleware, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id).lean();
    if (!user) {
      return res.status(200).json({ success: true, count: 0 });
    }

    const isAdmin =
      user.role === "Admin" ||
      user.role === "admin" ||
      user.role === "SuperAdmin" ||
      user.role === "superadmin" ||
      Boolean(user.tyre_procurement_admin);

    const userTabs = user.tyre_procurement_tabs || [];

    // Map each tab to the PR statuses requiring action in that stage
    const tabStatusMap = {
      "1. Purchase Request": ["Draft"],
      "2. Supplier Quotation": ["PR Raised", "Preparing for Quotation", "HoD Validated"],
      "3. Finance Approval": ["Quotation Received", "Quotation Updated"],
      "4. Payment & UTR": ["Finance Approved", "Finance Review"],
      "5. Order & Dispatch": ["Payment Done", "Advance Paid", "Order Placed", "Dispatched"],
      "6. Site GRN": ["Dispatched / Site GRN Ready", "GRN Ready", "In Transit", "GRN Received"],
      "7. Completed": ["GRN Done", "GRN Completed", "Closed"],
    };

    let targetStatuses = [];

    if (!isAdmin && userTabs.length > 0) {
      // User has specific assigned tabs (e.g. Finance Approval)
      for (const tab of userTabs) {
        if (tabStatusMap[tab]) {
          targetStatuses.push(...tabStatusMap[tab]);
        }
      }
      targetStatuses = [...new Set(targetStatuses)];
    } else {
      // Admin or user without specific tab restrictions: count all non-closed PRs or active PRs
      targetStatuses = [
        "Draft",
        "PR Raised",
        "Preparing for Quotation",
        "HoD Validated",
        "Quotation Received",
        "Quotation Updated",
        "Finance Approved",
        "Finance Review",
        "Payment Done",
        "Advance Paid",
        "Order Placed",
        "Dispatched",
        "Dispatched / Site GRN Ready",
        "GRN Ready",
        "GRN Received",
        "GRN Done",
        "GRN Completed",
      ];
    }

    if (targetStatuses.length === 0) {
      return res.status(200).json({ success: true, count: 0 });
    }

    const count = await TyreProcurementSop.countDocuments({
      status: { $in: targetStatuses },
    });

    res.status(200).json({ success: true, count });
  } catch (error) {
    logger.error("Error fetching procurement pending count:", error);
    res.status(500).json({ success: false, message: error.message, count: 0 });
  }
});

// Endpoint to fetch next GRN number
router.get("/tyre-procurement/next-grn-number", authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const grnSeriesNo = await generateNextGrnNumber(date);
    res.status(200).json({ success: true, grnSeriesNo });
  } catch (error) {
    logger.error("Error generating Tyre GRN number:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Filter options endpoint for Tyre Procurement SOP
router.get("/tyre-procurement/filter-options", authMiddleware, async (req, res) => {
  try {
    const docs = await TyreProcurementSop.find({}).select("stage1.preparedBy stage2.selectedSupplierL1 stage2.selectedSuppliers.selectedSupplier status createdAt").lean();
    const preparers = [...new Set(docs.map(d => d.stage1?.preparedBy).filter(Boolean))].sort();
    const suppliers = [...new Set(docs.flatMap(d => [
      d.stage2?.selectedSupplierL1,
      ...(d.stage2?.selectedSuppliers || []).map(s => s?.selectedSupplier)
    ]).filter(Boolean))].sort();
    const years = [...new Set(docs.map(d => d.createdAt ? new Date(d.createdAt).getFullYear() : null).filter(Boolean))].sort((a, b) => b - a);
    res.json({ success: true, preparers, suppliers, years, statuses: statusEnum });
  } catch (err) {
    logger.error("Error fetching tyre filter options:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// List Tyre PRs
router.get("/tyre-procurement", authMiddleware, async (req, res) => {
  try {
    // Sync status field in DB for records to reflect payment completeness
    const docsToSync = await TyreProcurementSop.find({}).lean();
    for (const d of docsToSync) {
      const computed = deriveStatus(d);
      if (d.status !== computed) {
        await TyreProcurementSop.updateOne({ _id: d._id }, { $set: { status: computed } });
      }
    }

    const {
      search,
      stageTab,
      page = 1,
      limit = 50,
      prNumber,
      poNumber,
      preparedBy,
      supplier,
      totalValue,
      status,
      date,
      month,
      year,
      startDate: qStartDate,
      endDate: qEndDate,
      fromDate: qFromDate,
      toDate: qToDate,
    } = req.query;

    const startDate = qStartDate || qFromDate;
    const endDate = qEndDate || qToDate;

    const andConditions = [];

    // Filter by assigned companies for non-admin users
    const isProcAdmin = req.user?.role === "Admin" || req.user?.tyre_procurement_admin;
    const assignedComps = req.user?.assigned_procurement_companies || [];
    if (!isProcAdmin && assignedComps.length > 0) {
      const compRegexes = assignedComps.map((c) => new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
      andConditions.push({
        $or: [
          { companyKey: { $in: assignedComps } },
          { "stage1.companyKey": { $in: assignedComps } },
          ...compRegexes.map((r) => ({ companyName: r })),
          ...compRegexes.map((r) => ({ "stage1.companyName": r })),
          ...compRegexes.map((r) => ({ prNumber: r })),
          ...compRegexes.map((r) => ({ poNumber: r })),
        ],
      });
    }

    // Stage Tab & Status filter
    if (status && status !== "ALL" && status !== "") {
      andConditions.push({ status: status });
    } else if (stageTab !== undefined && stageTab !== null) {
      switch (stageTab) {
        case "0":
          if (status !== "ALL") {
            andConditions.push({ status: { $nin: ["GRN Done", "Closed", "GRN Completed"] } });
          }
          break;
        case "1":
          andConditions.push({ status: "Draft" });
          break;
        case "2":
          andConditions.push({ status: { $in: ["PR Raised", "Preparing for Quotation", "HoD Validated"] } });
          break;
        case "3":
          andConditions.push({ status: { $in: ["Quotation Received", "Quotation Updated"] } });
          break;
        case "4":
          andConditions.push({
            status: {
              $in: [
                "Finance Approved",
                "Dispatched / Site GRN Ready",
                "GRN Ready",
                "GRN Received",
                "Order Placed",
                "Dispatched",
                "GRN Done",
                "GRN Completed",
              ],
            },
          });
          break;
        case "5":
          andConditions.push({ status: { $in: ["Payment Done", "Order Placed", "Dispatched"] } });
          break;
        case "6":
          andConditions.push({ status: { $in: ["Dispatched / Site GRN Ready", "GRN Ready", "GRN Received"] } });
          break;
        case "7":
          andConditions.push({ status: { $in: ["GRN Done", "Closed", "GRN Completed"] } });
          break;
        default:
          break;
      }
    }

    // 1. PR Number
    if (prNumber && prNumber.trim()) {
      const escaped = prNumber.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      andConditions.push({ prNumber: new RegExp(escaped, "i") });
    }

    // 2. PO Number
    if (poNumber && poNumber.trim()) {
      const escaped = poNumber.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const poRegex = new RegExp(escaped, "i");
      andConditions.push({
        $or: [
          { poNumber: poRegex },
          { "stage2.selectedSuppliers.poNumber": poRegex }
        ]
      });
    }

    // 3. Prepared By
    if (preparedBy && preparedBy.trim() && preparedBy !== "ALL") {
      const escaped = preparedBy.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      andConditions.push({ "stage1.preparedBy": new RegExp(`^${escaped}$`, "i") });
    }

    // 4. L1 Supplier
    if (supplier && supplier.trim() && supplier !== "ALL") {
      const escaped = supplier.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const supRegex = new RegExp(escaped, "i");
      andConditions.push({
        $or: [
          { "stage2.selectedSupplierL1": supRegex },
          { "stage2.selectedSuppliers.selectedSupplier": supRegex },
          { "stage2.suppliers.supplierName": supRegex }
        ]
      });
    }

    // 5. Total Value
    if (totalValue && String(totalValue).trim()) {
      const valStr = String(totalValue).trim();
      if (valStr.includes("-")) {
        const parts = valStr.split("-");
        const min = parseFloat(parts[0].replace(/[^0-9.]/g, ""));
        const max = parseFloat(parts[1].replace(/[^0-9.]/g, ""));
        const cond = {};
        if (!isNaN(min)) cond.$gte = min;
        if (!isNaN(max)) cond.$lte = max;
        if (Object.keys(cond).length > 0) {
          andConditions.push({
            $or: [
              { "stage2.totalOrderValue": cond },
              { "stage2.selectedSuppliers.totalOrderValue": cond }
            ]
          });
        }
      } else if (valStr.startsWith(">")) {
        const min = parseFloat(valStr.slice(1).replace(/[^0-9.]/g, ""));
        if (!isNaN(min)) {
          andConditions.push({
            $or: [
              { "stage2.totalOrderValue": { $gte: min } },
              { "stage2.selectedSuppliers.totalOrderValue": { $gte: min } }
            ]
          });
        }
      } else if (valStr.startsWith("<")) {
        const max = parseFloat(valStr.slice(1).replace(/[^0-9.]/g, ""));
        if (!isNaN(max)) {
          andConditions.push({
            $or: [
              { "stage2.totalOrderValue": { $lte: max } },
              { "stage2.selectedSuppliers.totalOrderValue": { $lte: max } }
            ]
          });
        }
      } else {
        const num = parseFloat(valStr.replace(/[^0-9.]/g, ""));
        if (!isNaN(num)) {
          andConditions.push({
            $or: [
              { "stage2.totalOrderValue": { $gte: num * 0.9, $lte: num * 1.1 } },
              { "stage2.selectedSuppliers.totalOrderValue": { $gte: num * 0.9, $lte: num * 1.1 } }
            ]
          });
        }
      }
    }

    // 6. Date / Month / Year wise search on createdAt or stage1.prDate
    if (date && date.trim()) {
      const dateParts = date.trim().split("-").map(Number);
      if (dateParts.length === 3 && dateParts.every(n => !isNaN(n))) {
        const [y, m, d] = dateParts;
        const startOfDay = new Date(y, m - 1, d, 0, 0, 0, 0);
        const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999);
        andConditions.push({
          $or: [
            { createdAt: { $gte: startOfDay, $lte: endOfDay } },
            { "stage1.prDate": { $gte: startOfDay, $lte: endOfDay } },
          ],
        });
      }
    } else if (startDate || endDate) {
      const dateCond = {};
      if (startDate) {
        const parts = startDate.trim().split("-").map(Number);
        if (parts.length === 3 && parts.every(n => !isNaN(n))) {
          dateCond.$gte = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
        }
      }
      if (endDate) {
        const parts = endDate.trim().split("-").map(Number);
        if (parts.length === 3 && parts.every(n => !isNaN(n))) {
          dateCond.$lte = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
        }
      }
      if (Object.keys(dateCond).length > 0) {
        andConditions.push({
          $or: [
            { createdAt: dateCond },
            { "stage1.prDate": dateCond },
          ],
        });
      }
    } else if (year || month) {
      if (year && month) {
        const y = parseInt(year, 10);
        const m = parseInt(month, 10);
        const startOfMonth = new Date(y, m - 1, 1, 0, 0, 0, 0);
        const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);
        andConditions.push({ createdAt: { $gte: startOfMonth, $lte: endOfMonth } });
      } else if (year) {
        const y = parseInt(year, 10);
        const startOfYear = new Date(y, 0, 1, 0, 0, 0, 0);
        const endOfYear = new Date(y, 11, 31, 23, 59, 59, 999);
        andConditions.push({ createdAt: { $gte: startOfYear, $lte: endOfYear } });
      } else if (month) {
        const m = parseInt(month, 10);
        andConditions.push({
          $expr: { $eq: [{ $month: "$createdAt" }, m] }
        });
      }
    }

    // 7. General search with date / month / year smart detection
    if (search && search.trim()) {
      const s = search.trim();
      const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");

      const orClauses = [
        { prNumber: regex },
        { poNumber: regex },
        { "stage2.selectedSuppliers.poNumber": regex },
        { companyKey: regex },
        { companyName: regex },
        { "stage1.companyName": regex },
        { "stage1.preparedBy": regex },
        { "stage2.selectedSupplierL1": regex },
        { "stage2.selectedSuppliers.selectedSupplier": regex },
        { "stage4.supplierName": regex },
        { "stage6.supplierName": regex },
        { status: regex }
      ];

      const monthMap = {
        jan: 1, january: 1,
        feb: 2, february: 2,
        mar: 3, march: 3,
        apr: 4, april: 4,
        may: 5,
        jun: 6, june: 6,
        jul: 7, july: 7,
        aug: 8, august: 8,
        sep: 9, september: 9,
        oct: 10, october: 10,
        nov: 11, november: 11,
        dec: 12, december: 12
      };
      const cleanLower = s.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (monthMap[cleanLower]) {
        orClauses.push({ $expr: { $eq: [{ $month: "$createdAt" }, monthMap[cleanLower]] } });
      }

      if (/^(20\d\d)$/.test(s)) {
        const y = parseInt(s, 10);
        orClauses.push({
          createdAt: {
            $gte: new Date(y, 0, 1, 0, 0, 0, 0),
            $lte: new Date(y, 11, 31, 23, 59, 59, 999)
          }
        });
      }

      const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
      if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10);
        const mo = parseInt(dmyMatch[2], 10);
        const yr = parseInt(dmyMatch[3], 10);
        if (day >= 1 && day <= 31 && mo >= 1 && mo <= 12) {
          orClauses.push({
            createdAt: {
              $gte: new Date(yr, mo - 1, day, 0, 0, 0, 0),
              $lte: new Date(yr, mo - 1, day, 23, 59, 59, 999)
            }
          });
        }
      }

      andConditions.push({ $or: orClauses });
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    const skip = (Number(page) - 1) * Number(limit);

    if (stageTab === "4") {
      const allCandidates = await TyreProcurementSop.find(query).sort({ createdAt: -1 }).lean();
      const filtered = allCandidates.filter((d) => {
        if (d.status === "Finance Approved") return true;
        const ci = getPrCreditInfo(d);
        return ci.isCredit && !ci.isPaid && ci.diffDays <= 7;
      });
      const total = filtered.length;
      const paginated = filtered.slice(skip, skip + Number(limit));
      const data = paginated.map(computeDoc);
      return res.json({ success: true, data, total, page: Number(page), limit: Number(limit) });
    }

    const [items, total] = await Promise.all([
      TyreProcurementSop.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      TyreProcurementSop.countDocuments(query),
    ]);

    const data = items.map(computeDoc);
    res.json({ success: true, data, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    logger.error("Error listing Tyre Procurement SOP:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single Tyre PR
router.get("/tyre-procurement/:id", authMiddleware, async (req, res) => {
  try {
    const doc = await TyreProcurementSop.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: "Tyre PR not found" });
    }
    res.json({ success: true, data: computeDoc(doc) });
  } catch (error) {
    logger.error("Error fetching Tyre Procurement SOP:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Tyre Supplier Master Endpoints ───

// Fetch all saved tyre suppliers
router.get("/tyre-suppliers", authMiddleware, async (req, res) => {
  try {
    const suppliers = await TyreSupplierModel.find().sort({ supplierName: 1 }).lean();
    res.status(200).json({ success: true, suppliers });
  } catch (err) {
    logger.error("Error fetching tyre suppliers:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Save or update a tyre supplier
router.post("/tyre-suppliers", authMiddleware, async (req, res) => {
  try {
    const data = uppercaseDeep(req.body);
    if (!data.supplierName || !data.supplierName.trim()) {
      return res.status(400).json({ success: false, message: "Supplier Name is required" });
    }
    const name = data.supplierName.trim().toUpperCase();
    const supplier = await TyreSupplierModel.findOneAndUpdate(
      { supplierName: name },
      { $set: { ...data, supplierName: name } },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, supplier });
  } catch (err) {
    logger.error("Error saving tyre supplier:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create Tyre PR
router.post("/tyre-procurement", authMiddleware, async (req, res) => {
  try {
    let payload = normalizeTyreEnums(uppercaseDeep(req.body));
    const compCode =
      payload.companyShortName ||
      payload.companyKey ||
      payload.stage1?.companyKey ||
      payload.stage1?.companyName ||
      payload.companyName ||
      "SFPL";

    let prNumber = payload.prNumber?.trim();
    if (!prNumber) {
      const autoNum = await generateNextTyreNumbers(payload.stage1?.prDate, compCode);
      prNumber = autoNum.prNumber;
      payload.prNumber = prNumber;
      if (!payload.poNumber?.trim()) {
        payload.poNumber = autoNum.poNumber;
      }
    }

    let attempts = 0;
    while (attempts < 10) {
      const existing = await TyreProcurementSop.findOne({ prNumber: payload.prNumber }).select("_id").lean();
      if (!existing) break;
      const autoNum = await generateNextTyreNumbers(payload.stage1?.prDate, compCode);
      payload.prNumber = autoNum.prNumber;
      if (!payload.poNumber?.trim() || attempts > 0) {
        payload.poNumber = autoNum.poNumber;
      }
      attempts++;
    }
    payload.status = deriveStatus(payload);
    const doc = new TyreProcurementSop(payload);
    await doc.save();
    await saveSuppliersFromDoc(doc);
    await saveProductsFromDoc(doc);
    await saveApproversFromDoc(doc);
    res.status(201).json({ success: true, data: computeDoc(doc.toObject()) });
  } catch (error) {
    logger.error("Error creating Tyre Procurement SOP:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Tyre PR
router.put("/tyre-procurement/:id", authMiddleware, async (req, res) => {
  try {
    let payload = normalizeTyreEnums(uppercaseDeep(req.body));
    const { prNumber } = payload;
    const existing = await TyreProcurementSop.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Tyre PR not found" });
    }
    const permissionUser = await UserModel.findById(req.user?._id).select("tyre_procurement_admin").lean();
    const lockMessage = assertTyreSignOffLocks(
      existing,
      payload,
      { ...req.user, tyre_procurement_admin: Boolean(permissionUser?.tyre_procurement_admin) }
    );
    if (lockMessage) {
      return res.status(403).json({ success: false, message: lockMessage });
    }
    if (prNumber && prNumber.trim() !== existing.prNumber) {
      const duplicate = await TyreProcurementSop.findOne({ prNumber: prNumber.trim() });
      if (duplicate) {
        return res.status(400).json({ success: false, message: "PR Number already exists" });
      }
    }
    payload.status = deriveStatus(payload);
    const doc = await TyreProcurementSop.findByIdAndUpdate(
      req.params.id,
      { $set: payload },
      { new: true, runValidators: true }
    ).lean();
    await saveSuppliersFromDoc(doc);
    await saveProductsFromDoc(doc);
    await saveApproversFromDoc(doc);
    res.json({ success: true, data: computeDoc(doc) });
  } catch (error) {
    logger.error("Error updating Tyre Procurement SOP:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete Tyre PR
router.delete("/tyre-procurement/:id", authMiddleware, async (req, res) => {
  try {
    const role = (req.user?.role || "").toLowerCase();
    const permissionUser = await UserModel.findById(req.user?._id).select("tyre_procurement_admin tyre_procurement_tabs").lean();
    const identity = [req.user?.username, req.user?.first_name, req.user?.middle_name, req.user?.last_name]
      .filter(Boolean).join(" ").replace(/[^a-z]/gi, "").toLowerCase();
    const isAjay = identity.includes("ajay") || String(req.user?.username || "").toLowerCase().includes("ajay");
    const allowedTabs = permissionUser?.tyre_procurement_tabs || [];
    const isUnrestricted = allowedTabs.length === 0;

    if (role !== "admin" && role !== "superadmin" && !isAjay && !permissionUser?.tyre_procurement_admin && !isUnrestricted) {
      return res.status(403).json({ success: false, message: "Only admin users can delete PRs" });
    }
    const doc = await TyreProcurementSop.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Tyre PR not found" });
    }
    res.json({ success: true, message: "Tyre PR deleted successfully" });
  } catch (error) {
    logger.error("Error deleting Tyre Procurement SOP:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Excel Export Generators ───

function buildStage1Sheet(d) {
  const s1 = d.stage1 || {};
  const rows = [
    ["PURCHASE REQUEST ORDER – TYRES (SRCC)", "", "", "", "", "", "", ""],
    ["New & Remould Tyres for Trailer Trucks  |  Tyre SOP", "", "", "", "", "", "", ""],
    emptyRow(8),
    ["● STAGE 1 of 6  –  Operations/Fleet Team  →  HoD Validation  →  Purchase Officer", "", "", "", "", "", "", ""],
    emptyRow(8),
    ["A. Purchase Request Identity", "", "", "", "", "", "", ""],
    ["PR Number", s1.prNumber || d.prNumber || "", "", "TT-TYRE-2025-___", "PR Date", fmtDate(s1.prDate), "", ""],
    ["Prepared By (Name)", s1.preparedBy || "", "", "", "Contact Number", s1.contactNumber || "", "", ""],
    ["Department / Location", s1.departmentLocation || "", "", "", "Needed By Date", fmtDate(s1.neededByDate), "", ""],
    emptyRow(8),
    ["B. HoD Validation", "", "", "", "", "", "", ""],
    ["Validated By (HoD Name)", s1.hodValidation?.validatedBy || "", "", "", "Designation", s1.hodValidation?.designation || "", "", ""],
    ["Approval Mode", s1.hodValidation?.approvalMode || "", "", "WhatsApp / Phone Call / Email / In-Person", "", "", "", ""],
    ["Date & Time of Approval", fmtDate(s1.hodValidation?.dateTimeOfApproval), "", "", "HoD Signature / Initials", s1.hodValidation?.hodSignature || "", "", ""],
    emptyRow(8),
    ["C. Items Required", "", "", "", "", "", "", ""],
    ["Tyre Type", "Brand Preference", "Size / Spec", "Load Rating", "Rim Size", "Qty", "Est. Unit Cost (₹)", "Est. Total (₹)"],
  ];

  const items = s1.itemsRequired || [];
  const defaultItems = [
    ["New Tyre"],
    ["New Tyre"],
    ["Remould Tyre"],
    ["Remould Tyre"],
    ["Remould Tyre"],
  ];

  defaultItems.forEach((def, i) => {
    const item = items[i] || {};
    const type = item.tyreType || def[0];
    const qty = safeNumber(item.qty);
    const cost = safeNumber(item.estUnitCost);
    rows.push([
      type,
      item.brandPreference || "",
      item.sizeSpec || "",
      item.loadRating || "",
      item.rimSize || "",
      qty,
      cost,
      { f: `F${rows.length + 1}*G${rows.length + 1}` },
    ]);
  });

  const totalRowIndex = rows.length + 1;
  rows.push(["ESTIMATED TOTAL COST (₹)", "", "", "", "", "", "", { f: `SUM(H${totalRowIndex - 5}:H${totalRowIndex - 1})` }]);

  rows.push(emptyRow(8));
  rows.push(["D. Specification & Supplier Preference", "", "", "", "", "", "", ""]);
  rows.push(["Specification Details", s1.specificationDetails || "", "", "Brand, Load Rating, Rim Size, Remould Spec, etc.", "", "", "", ""]);
  rows.push(["Preferred Supplier (if any)", s1.preferredSupplier || "", "", "", "Supplier Contact", s1.supplierContact || "", "", ""]);

  rows.push(emptyRow(8));
  rows.push(["E. Current Stock Status", "", "", "", "", "", "", ""]);
  rows.push(["Current Stock – New Tyres", s1.currentStockNew || 0, "", "", "Current Stock – Used/Remould", s1.currentStockUsedRemould || 0, "", ""]);

  rows.push(emptyRow(8));
  rows.push(["F. Comments / Additional Information", "", "", "", "", "", "", ""]);
  rows.push([s1.comments || "", "", "", "", "", "", "", ""]);

  rows.push(emptyRow(8));
  rows.push(["G. Routing Checklist", "", "", "", "", "", "", ""]);
  rows.push(["Step", "Action", "", "", "Responsible", "", "Date", "Status"]);
  const checklist = s1.routingChecklist || [];
  const defaultChecklist = [
    ["Step 1", "PR Raised by Requester", "Operations Team"],
    ["Step 2", "Validated by HoD", "Head of Department"],
    ["Step 3", "Forwarded to Purchase Officer", "Purchase Officer"],
  ];
  defaultChecklist.forEach((chk, i) => {
    const val = checklist[i] || {};
    rows.push([chk[0], val.action || chk[1], "", "", val.responsible || chk[2], "", fmtDate(val.date), val.status || ""]);
  });

  return XLSX.utils.aoa_to_sheet(rows);
}

function buildStage2Sheet(d) {
  const s2 = d.stage2 || {};
  const rows = [
    ["SUPPLIER QUOTATION COMPARISON SHEET", "", "", "", "", "", "", ""],
    ["Tyre Purchase – Comparative Statement  |  Purchase Officer Use Only", "", "", "", "", "", "", ""],
    emptyRow(8),
    ["● STAGE 2 of 6  –  Purchase Officer collects 3 quotes → Selects L1 → Sends to Finance Manager", "", "", "", "", "", "", ""],
    emptyRow(8),
    ["A. Reference Details", "", "", "", "", "", "", ""],
    ["PR Number", s2.prNumber || d.prNumber || "", "", "", "PO Number", s2.poNumber || d.poNumber || "", "", ""],
    ["Purchase Officer Name", s2.purchaseOfficerName || "", "", "", "PO Date", fmtDate(s2.poDate), "", ""],
    emptyRow(8),
    ["B. Supplier Details & Quotation", "", "", "", "", "", "", ""],
    ["Field", "Supplier 1", "Supplier 2", "Supplier 3", "", "", "", ""],
  ];

  const suppliers = s2.suppliers || [];
  const sup = (i) => suppliers[i] || {};

  rows.push(["Supplier Name", sup(0).supplierName || "", sup(1).supplierName || "", sup(2).supplierName || "", "", "", "", ""]);
  rows.push(["Contact Person", sup(0).contactPerson || "", sup(1).contactPerson || "", sup(2).contactPerson || "", "", "", "", ""]);
  rows.push(["Phone Number", sup(0).phoneNumber || "", sup(1).phoneNumber || "", sup(2).phoneNumber || "", "", "", "", ""]);
  rows.push(["Email / WhatsApp", sup(0).emailWhatsApp || "", sup(1).emailWhatsApp || "", sup(2).emailWhatsApp || "", "", "", "", ""]);
  rows.push(["GST Number", sup(0).gstNumber || "", sup(1).gstNumber || "", sup(2).gstNumber || "", "", "", "", ""]);
  rows.push(["Bank Account No", sup(0).bankAccountNo || "", sup(1).bankAccountNo || "", sup(2).bankAccountNo || "", "", "", "", ""]);
  rows.push(["Bank Name", sup(0).bankName || "", sup(1).bankName || "", sup(2).bankName || "", "", "", "", ""]);
  rows.push(["Bank IFSC Code", sup(0).bankIfscCode || "", sup(1).bankIfscCode || "", sup(2).bankIfscCode || "", "", "", "", ""]);
  rows.push(["Bank Branch Code", sup(0).bankBranchCode || "", sup(1).bankBranchCode || "", sup(2).bankBranchCode || "", "", "", "", ""]);
  rows.push(["Supplier Name in Bank", sup(0).supplierNameInBank || "", sup(1).supplierNameInBank || "", sup(2).supplierNameInBank || "", "", "", "", ""]);
  rows.push(["Tyre Brand", sup(0).tyreBrand || "", sup(1).tyreBrand || "", sup(2).tyreBrand || "", "", "", "", ""]);
  rows.push(["Size & Specification", sup(0).sizeSpecification || "", sup(1).sizeSpecification || "", sup(2).sizeSpecification || "", "", "", "", ""]);
  rows.push(["Unit Price – New Tyre (₹)", safeNumber(sup(0).unitPriceNew), safeNumber(sup(1).unitPriceNew), safeNumber(sup(2).unitPriceNew), "", "", "", ""]);
  rows.push(["Unit Price – Remould Tyre (₹)", safeNumber(sup(0).unitPriceRemould), safeNumber(sup(1).unitPriceRemould), safeNumber(sup(2).unitPriceRemould), "", "", "", ""]);
  rows.push(["Qty Available", safeNumber(sup(0).qtyAvailable), safeNumber(sup(1).qtyAvailable), safeNumber(sup(2).qtyAvailable), "", "", "", ""]);
  rows.push(["Freight Charges", safeNumber(sup(0).freightCharges), safeNumber(sup(1).freightCharges), safeNumber(sup(2).freightCharges), "", "", "", ""]);
  rows.push(["Delivery Timeline", sup(0).deliveryTimeline || "", sup(1).deliveryTimeline || "", sup(2).deliveryTimeline || "", "", "", "", ""]);
  rows.push(["Delivery Location", sup(0).deliveryLocation || "", sup(1).deliveryLocation || "", sup(2).deliveryLocation || "", "", "", "", ""]);
  rows.push(["Warranty / Guarantee", sup(0).warrantyGuarantee || "", sup(1).warrantyGuarantee || "", sup(2).warrantyGuarantee || "", "", "", "", ""]);
  rows.push(["Payment Terms : Adv / Days", sup(0).paymentTerms || "", sup(1).paymentTerms || "", sup(2).paymentTerms || "", "", "", "", ""]);
  rows.push(["Discount Offered", safeNumber(sup(0).discountOffered), safeNumber(sup(1).discountOffered), safeNumber(sup(2).discountOffered), "", "", "", ""]);
  rows.push(["Remarks", sup(0).remarks || "", sup(1).remarks || "", sup(2).remarks || "", "", "", "", ""]);

  rows.push(emptyRow(8));
  rows.push(["C. L1 Supplier Selection (Lowest Qualified Bidder)", "", "", "", "", "", "", ""]);
  rows.push(["Selected Supplier (L1)", s2.selectedSupplierL1 || "", "", "", "L1 Price Quoted (₹)", safeNumber(s2.l1PriceQuoted), "", ""]);
  rows.push(["Reason for Selection", s2.reasonForSelection || "", "", "", "Total Order Value (₹)", safeNumber(s2.totalOrderValue), "", ""]);
  rows.push(["Purchase Officer Declaration", s2.declaration || "I confirm the above comparison is accurate and L1 selected on best value.", "", "", "", "", "", ""]);

  rows.push(emptyRow(8));
  rows.push(["Step", "Action", "", "", "Responsible", "", "Date", "Status"]);
  const checklist = s2.routingChecklist || [];
  const defaultChecklist = [
    ["Step 1", "Quotations collected (min. 3)", "Purchase Officer"],
    ["Step 2", "L1 Supplier selected", "Purchase Officer"],
    ["Step 3", "Sent to Finance Manager for approval", "Purchase Officer"],
  ];
  defaultChecklist.forEach((chk, i) => {
    const val = checklist[i] || {};
    rows.push([chk[0], val.action || chk[1], "", "", val.responsible || chk[2], "", fmtDate(val.date), val.status || ""]);
  });

  return XLSX.utils.aoa_to_sheet(rows);
}

function buildStage3Sheet(d) {
  const s3 = d.stage3 || {};
  const rows = [
    ["FINANCE MANAGER APPROVAL NOTE", "", "", "", "", "", "", ""],
    ["Tyre Purchase Order Authorization  |  Finance Department", "", "", "", "", "", "", ""],
    emptyRow(8),
    ["● STAGE 3 of 6  –  Finance Manager reviews L1 quotation → Approves / Rejects → Forwards to Accounting", "", "", "", "", "", "", ""],
    emptyRow(8),
    ["A. Reference Information", "", "", "", "", "", "", ""],
    ["PO Number", s3.poNumber || d.poNumber || "", "", "", "PO Date", fmtDate(s3.poDate), "", ""],
    ["Selected Supplier (L1)", s3.selectedSupplierL1 || "", "", "", "Total Order Value (₹)", safeNumber(s3.totalOrderValue), "", ""],
    ["Purchase Officer Name", s3.purchaseOfficerName || "", "", "", "Date Received by Finance", fmtDate(s3.dateReceivedByFinance), "", ""],
    emptyRow(8),
    ["B. Finance Review Checklist", "", "", "", "", "", "", ""],
    ["1. Budget availability confirmed for this purchase", "", "", "", "", "", "", s3.reviewChecklist?.budgetAvailable || ""],
    ["2. L1 supplier price is reasonable and within market range", "", "", "", "", "", "", s3.reviewChecklist?.priceReasonable || ""],
    ["3. GST number of supplier verified", "", "", "", "", "", "", s3.reviewChecklist?.gstVerified || ""],
    ["4. Payment terms reviewed and accepted", "", "", "", "", "", "", s3.reviewChecklist?.paymentTermsAccepted || ""],
    ["5. Supporting documents (PR, Quotation Sheet) are attached", "", "", "", "", "", "", s3.reviewChecklist?.docsAttached || ""],
    emptyRow(8),
    ["C. Finance Manager Decision", "", "", "", "", "", "", ""],
    ["Decision", s3.decision?.decision || "", "", "APPROVED – Proceed with Payment / REJECTED – Reason below / On Hold", "", "", "", ""],
    ["Remarks / Rejection Reason", s3.decision?.remarksRejectionReason || "", "", "", "", "", "", ""],
    emptyRow(8),
    ["D. Finance Manager Sign-Off", "", "", "", "", "", "", ""],
    ["Finance Manager Name", s3.signOff?.financeManagerName || "", "", "", "Date of Approval", fmtDate(s3.signOff?.dateOfApproval), "", ""],
    ["Signature / Digital Approval Ref", s3.signOff?.signatureDigitalApprovalRef || "", "", "", "Time of Approval", s3.signOff?.timeOfApproval || "", "", ""],
    emptyRow(8),
    ["E. Next Step: Accounting Team for Payment", "", "", "", "", "", "", ""],
    ["Once approved, this form is forwarded to the Accounting Team with supplier bank details for payment processing.", "", "", "", "", "", "", ""],
  ];

  return XLSX.utils.aoa_to_sheet(rows);
}

function buildStage4Sheet(d) {
  const s4 = d.stage4 || {};
  const rows = [
    ["PAYMENT PROCESSING & UTR CONFIRMATION", "", "", "", "", "", "", ""],
    ["Accounting Team  |  Tyre Purchase Workflow", "", "", "", "", "", "", ""],
    emptyRow(8),
    ["● STAGE 4 of 6  –  Accounting processes payment → Records UTR → Shares UTR with Purchase Officer", "", "", "", "", "", "", ""],
    emptyRow(8),
    ["A. Reference Details", "", "", "", "", "", "", ""],
    ["PO Number & Date", s4.poNumberDate || "", "", "", "Finance Approval Date", fmtDate(s4.financeApprovalDate), "", ""],
    ["Supplier Name", s4.supplierName || "", "", "", "Total Payment Amount (₹)", safeNumber(s4.totalPaymentAmount), "", ""],
    emptyRow(8),
    ["B. Supplier Bank Details", "", "", "", "", "", "", ""],
    ["Account Name", s4.supplierBankDetails?.accountName || "", "", "", "Bank Name", s4.supplierBankDetails?.bankName || "", "", ""],
    ["Account Number", s4.supplierBankDetails?.accountNumber || "", "", "", "IFSC Code", s4.supplierBankDetails?.ifscCode || "", "", ""],
    ["Account Type", s4.supplierBankDetails?.accountType || "", "", "", "Branch", s4.supplierBankDetails?.branch || "", "", ""],
    ["UPI / VPA (if any)", s4.supplierBankDetails?.upiVpa || "", "", "", "", "", "", ""],
    emptyRow(8),
    ["C. Payment Details", "", "", "", "", "", "", ""],
    ["Payment Method", s4.paymentDetails?.paymentMethod || "", "", "NEFT / RTGS / IMPS / Cheque / UPI", "Payment Date", fmtDate(s4.paymentDetails?.paymentDate), "", ""],
    ["Amount Paid (₹)", safeNumber(s4.paymentDetails?.amountPaid), "", "", "Payment Reference / UTR No.", s4.paymentDetails?.paymentReferenceUtr || "", "", ""],
    ["Bank / App Used for Transfer", s4.paymentDetails?.bankAppUsed || "", "", "", "Time of Transfer", s4.paymentDetails?.timeOfTransfer || "", "", ""],
    emptyRow(8),
    ["D. Accounting Team Sign-Off", "", "", "", "", "", "", ""],
    ["Processed By (Name)", s4.accountingSignOff?.processedByName || "", "", "", "Designation", s4.accountingSignOff?.designation || "", "", ""],
    ["Signature / Approval Ref", s4.accountingSignOff?.signatureApprovalRef || "", "", "", "Date Confirmed", fmtDate(s4.accountingSignOff?.dateConfirmed), "", ""],
    emptyRow(8),
    ["E. UTR Sharing – Next Step: Purchase Officer Places Order", "", "", "", "", "", "", ""],
    ["UTR Shared with Purchase Officer on", fmtDate(s4.utrSharing?.utrSharedWithPoOn), "", "", "Mode of Sharing", s4.utrSharing?.modeOfSharing || "WhatsApp / Email / Call", "", ""],
  ];

  return XLSX.utils.aoa_to_sheet(rows);
}

function buildStage5Sheet(d) {
  const s5 = d.stage5 || {};
  const rows = [
    ["ORDER PLACEMENT & DISPATCH TRACKING", "", "", "", "", "", "", ""],
    ["Purchase Officer  |  Supplier Coordination", "", "", "", "", "", "", ""],
    emptyRow(8),
    ["● STAGE 5 of 6  –  Purchase Officer places order → Supplier dispatches → PO updates dispatch details", "", "", "", "", "", "", ""],
    emptyRow(8),
    ["A. Order Reference", "", "", "", "", "", "", ""],
    ["PR Number", s5.prNumber || d.prNumber || "", "", "", "PO Number (if applicable)", s5.poNumber || d.poNumber || "", "", ""],
    ["Supplier Name", s5.supplierName || "", "", "", "UTR Number (Payment Ref)", s5.utrNumber || "", "", ""],
    ["Order Placed By (PO Name)", s5.orderPlacedBy || "", "", "", "Order Placed Date", fmtDate(s5.orderPlacedDate), "", ""],
    ["Order Confirmation from Supplier", s5.orderConfirmation || "", "", "", "Mode of Confirmation", s5.modeOfConfirmation || "WhatsApp / Email / Call", "", ""],
    emptyRow(8),
    ["B. Dispatch Details (Updated by Purchase Officer once supplier dispatches)", "", "", "", "", "", "", ""],
    ["Dispatch Date", fmtDate(s5.dispatchDetails?.dispatchDate), "", "", "Expected Delivery Date", fmtDate(s5.dispatchDetails?.expectedDeliveryDate), "", ""],
    ["Vehicle Number", s5.dispatchDetails?.vehicleNumber || "", "", "", "Transporter Name", s5.dispatchDetails?.transporterName || "", "", ""],
    ["Driver Name", s5.dispatchDetails?.driverName || "", "", "", "Driver Contact Number", s5.dispatchDetails?.driverContactNumber || "", "", ""],
    ["DC Number (Delivery Challan)", s5.dispatchDetails?.dcNumber || "", "", "", "LR Number (Lorry Receipt)", s5.dispatchDetails?.lrNumber || "", "", ""],
    ["Invoice Number", s5.dispatchDetails?.invoiceNumber || "", "", "", "Invoice Amount (₹)", safeNumber(s5.dispatchDetails?.invoiceAmount), "", ""],
    ["Delivery Location / Site", s5.dispatchDetails?.deliveryLocationSite || "", "", "", "No. of Tyres Dispatched", safeNumber(s5.dispatchDetails?.noOfTyresDispatched), "", ""],
    emptyRow(8),
    ["C. Remarks / Tracking Notes", "", "", "", "", "", "", ""],
    [s5.remarks || "", "", "", "", "", "", "", ""],
  ];

  return XLSX.utils.aoa_to_sheet(rows);
}

function buildStage6Sheet(d) {
  const s6 = d.stage6 || {};
  const rows = [
    ["GOODS RECEIVED NOTE (GRN) – TYRES", "", "", "", "", "", "", "", ""],
    ["New & Remould Tyres for Trailer Trucks  |  Raised by Site / Maintenance Team", "", "", "", "", "", "", "", ""],
    emptyRow(9),
    ["● STAGE 6 of 6  –  GRN raised by concerned person on goods receipt → Submitted to Purchase Officer", "", "", "", "", "", "", "", ""],
    emptyRow(9),
    ["1. Reference & Delivery Information", "", "", "", "", "", "", "", ""],
    ["GRN Series No.", s6.grnSeriesNo || "", "", "GRN-TT-2025-___", "Date of Receipt", fmtDate(s6.dateOfReceipt), "", "", ""],
    ["PR Number", s6.prNumber || d.prNumber || "", "", "", "PO Number", s6.poNumber || d.poNumber || "", "", "", ""],
    ["Supplier Name", s6.supplierName || "", "", "", "Supplier Contact No.", s6.supplierContactNo || "", "", "", ""],
    ["Delivery Note / DC No.", s6.deliveryNoteDcNo || "", "", "", "LR Number", s6.lrNumber || "", "", "", ""],
    ["Vehicle Number", s6.vehicleNumber || "", "", "", "Delivery Location", s6.deliveryLocation || "", "", "", ""],
    emptyRow(9),
    ["2. Items Received – Tyre-wise Entry", "", "", "", "", "", "", "", ""],
    ["S.No", "Tyre Number (Unique ID)", "Tyre Brand", "Size & Spec", "Type (New/Remould)", "Hot Stamp Done?", "Photo Taken?", "Accepted / Rejected", "Remarks / Discrepancy"],
  ];

  const items = s6.itemsReceived || [];
  for (let i = 0; i < 12; i++) {
    const item = items[i] || {};
    rows.push([
      i + 1,
      item.tyreNumber || "",
      item.tyreBrand || "",
      item.sizeSpec || "",
      item.type || "New",
      item.hotStampDone || "No",
      item.photoTaken || "No",
      item.acceptedRejected || "Accepted",
      item.remarks || "",
    ]);
  }

  rows.push(emptyRow(9));
  rows.push(["3. Quality & Conformance Check", "", "", "", "", "", "", "", ""]);
  rows.push(["1. Tyres verified against PR / PO specifications (size, brand, quantity)", "", "", "", "", "", "", s6.qualityConformanceCheck?.tyresVerified || "", ""]);
  rows.push(["2. Unique tyre numbers matched and recorded in register", "", "", "", "", "", "", s6.qualityConformanceCheck?.tyreNumbersMatched || "", ""]);
  rows.push(["3. Hot tyre stamping completed for all received tyres", "", "", "", "", "", "", s6.qualityConformanceCheck?.hotStampingCompleted || "", ""]);
  rows.push(["4. Photos taken and attached for each tyre", "", "", "", "", "", "", s6.qualityConformanceCheck?.photosTaken || "", ""]);
  rows.push(["5. Invoice verified – quantity and value match with PO", "", "", "", "", "", "", s6.qualityConformanceCheck?.invoiceVerified || "", ""]);
  rows.push(["6. Return clause reviewed – discrepancy noted for supplier action", "", "", "", "", "", "", s6.qualityConformanceCheck?.returnClauseReviewed || "", ""]);

  rows.push(emptyRow(9));
  rows.push(["4. Inspection Notes", "", "", "", "", "", "", "", ""]);
  rows.push([s6.inspectionNotes || "", "", "", "", "", "", "", "", ""]);

  rows.push(emptyRow(9));
  rows.push(["5. Approvals & Sign-Off", "", "", "", "", "", "", "", ""]);
  rows.push(["Role", "", "Name", "", "Date", "", "Signature / Initials", "", ""]);
  const approvals = s6.approvals || [];
  const defaultApprovals = [
    "Received By (Site Person)",
    "Validated by – Maintenance Manager",
    "Reviewed by – Purchase Officer",
  ];
  defaultApprovals.forEach((role, i) => {
    const app = approvals[i] || {};
    rows.push([role, "", app.name || "", "", fmtDate(app.date), "", app.signature || "", "", ""]);
  });

  return XLSX.utils.aoa_to_sheet(rows);
}

function buildWorkbook(d) {
  const data = computeDoc(d);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildStage1Sheet(data), "1. Purchase Request");
  XLSX.utils.book_append_sheet(wb, buildStage2Sheet(data), "2. Supplier Quotation");
  XLSX.utils.book_append_sheet(wb, buildStage3Sheet(data), "3. Finance Approval");
  XLSX.utils.book_append_sheet(wb, buildStage4Sheet(data), "4. Payment & UTR");
  XLSX.utils.book_append_sheet(wb, buildStage5Sheet(data), "5. Order & Dispatch");
  XLSX.utils.book_append_sheet(wb, buildStage6Sheet(data), "6. Goods Received Note");
  return wb;
}

// Export single Tyre PR to Excel
router.get("/tyre-procurement/:id/export", authMiddleware, async (req, res) => {
  try {
    const doc = await TyreProcurementSop.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: "Tyre PR not found" });
    }
    const wb = buildWorkbook(doc);
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const fileName = `Tyre_Procurement_${doc.prNumber || doc._id}.xlsx`;
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) {
    logger.error("Error exporting Tyre Procurement SOP:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Download blank template
router.get("/tyre-procurement/template/download", authMiddleware, async (req, res) => {
  try {
    const wb = buildWorkbook({
      prNumber: "",
      stage1: {},
      stage2: {},
      stage3: {},
      stage4: {},
      stage5: {},
      stage6: {},
    });
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", `attachment; filename="Tyre_Procurement_SOP_Template.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) {
    logger.error("Error downloading Tyre Procurement template:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET & ASSIGN TYRE PROCUREMENT TAB PERMISSIONS ───
router.get("/tyre-procurement/user-tabs/:username", authMiddleware, async (req, res) => {
  try {
    const { username } = req.params;
    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.status(200).json({
      success: true,
      allowed_tabs: user.tyre_procurement_tabs || [],
      tyre_procurement_admin: Boolean(user.tyre_procurement_admin),
      assigned_companies: user.assigned_procurement_companies || [],
    });
  } catch (error) {
    logger.error("Error fetching user procurement tabs:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.post("/tyre-procurement/assign-user-tabs", authMiddleware, async (req, res) => {
  try {
    if (!canManageTyreProcurementPermissions(req.user)) {
      return res.status(403).json({ success: false, error: "Only an admin can assign Tyre Procurement permissions" });
    }
    const { username, allowed_tabs, tyre_procurement_admin, assigned_companies } = req.body;
    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    user.tyre_procurement_tabs = allowed_tabs || [];
    if (typeof tyre_procurement_admin === "boolean") {
      user.tyre_procurement_admin = tyre_procurement_admin;
    }
    if (Array.isArray(assigned_companies)) {
      user.assigned_procurement_companies = assigned_companies;
    }
    await user.save();
    res.status(200).json({
      success: true,
      message: "Procurement tab permissions updated successfully",
      allowed_tabs: user.tyre_procurement_tabs,
      tyre_procurement_admin: Boolean(user.tyre_procurement_admin),
      assigned_companies: user.assigned_procurement_companies || [],
    });
  } catch (error) {
    logger.error("Error assigning procurement tabs:", error);
    res.status(500).json({ success: false, error: "Failed to assign tab permissions" });
  }
});

export default router;
