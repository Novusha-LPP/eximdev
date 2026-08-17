import express from "express";
import multer from "multer";
import XLSX from "xlsx";
import DgftRegisterModel from "../../model/dgftRegisterModel.mjs";
import AuthorizationRegistrationModel from "../../model/authorizationRegistrationModel.mjs";
import RodtepModel from "../../model/rodtepModel.mjs";
import JobModel from "../../model/jobModel.mjs";
import LicenseUtilizationModel from "../../model/licenseUtilizationModel.mjs";
import { recalculateLicenseUtilization } from "../../services/licenseUtilizationService.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ===================== DGFT Register CRUD =====================

// GET all DGFT registers
router.get("/api/get-dgft-registers", async (req, res) => {
  try {
    const data = await DgftRegisterModel.find().sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// POST add DGFT register
router.post("/api/add-dgft-register", async (req, res) => {
  try {
    const createData = { ...req.body };
    // Quantity & Value Tracking can only be entered once payment is approved
    if (createData.payment_status !== "Payment Approved") {
      delete createData.export_details_array;
      delete createData.import_details_array;
      delete createData.qty_export;
      delete createData.unit_export;
      delete createData.export_value_fob_usd;
      delete createData.export_value_rs;
      delete createData.hs_code_export;
      delete createData.item_description_export;
      delete createData.qty_import;
      delete createData.unit_import;
      delete createData.import_value_fob_usd;
      delete createData.import_value_rs;
      delete createData.hs_code_import;
      delete createData.item_description_import;
    }
    const record = await DgftRegisterModel.create(createData);
    res.status(201).json({ message: "Record added successfully", data: record });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// PUT update DGFT register
router.put("/api/update-dgft-register/:id", async (req, res) => {
  try {
    const existing = await DgftRegisterModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Record not found" });

    const updateData = { ...req.body };
    const isApproved = (updateData.payment_status || existing.payment_status) === "Payment Approved" || (updateData.job_status || existing.job_status) === "APPROVED";

    // If payment is not approved, protect and do not allow saving export/import items
    if (!isApproved) {
      delete updateData.export_details_array;
      delete updateData.import_details_array;
      delete updateData.qty_export;
      delete updateData.unit_export;
      delete updateData.export_value_fob_usd;
      delete updateData.export_value_rs;
      delete updateData.hs_code_export;
      delete updateData.item_description_export;
      delete updateData.qty_import;
      delete updateData.unit_import;
      delete updateData.import_value_fob_usd;
      delete updateData.import_value_rs;
      delete updateData.hs_code_import;
      delete updateData.item_description_import;
    }

    const updated = await DgftRegisterModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    res.status(200).json({ message: "Record updated successfully", data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// DELETE DGFT register
router.delete("/api/delete-dgft-register/:id", async (req, res) => {
  try {
    const deleted = await DgftRegisterModel.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Record not found" });
    res.status(200).json({ message: "Record deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// POST upload Excel for DGFT register
const DGFT_HEADER_MAP = {
  "Sr No": "sr_no",
  "Job Status": "job_status",
  "Job Number": "job_no",
  "JOB.No.": "job_no",
  "Date": "date",
  "Firm Name": "party_name",
  "Party's Name": "party_name",
  "IEC No": "iec_no",
  "IEC No.": "iec_no",
  "Scheme": "scheme",
  "Authorization No.": "licence_no",
  "Auth Date": "licence_date",
  "File Number": "file_no",
  "Category": "category",
  "Port of Registration": "port_of_registration",
  "Licence Value / CIF Value": "licence_cif_value",
  "Docs. Recvd. Date": "docs_received_date",
  "Online Submission Date": "online_submission_date",
  "Documents Send To Accounts Date": "documents_send_to_accounts_date",
  "Payment Details": "payment_details",
  "Transaction ID": "transaction_id",
  "Transaction Amount": "transaction_amount",
  "Transaction Date": "transaction_date",
  "Import Validity": "import_validity",
  "Export Validity": "export_validity",
  "Qty (Export)": "qty_export",
  "Units (Export)": "unit_export",
  "Export Value (FOB USD)": "export_value_fob_usd",
  "Export Value (Rs)": "export_value_rs",
  "HS Code (Export)": "hs_code_export",
  "Item Description (Export)": "item_description_export",
  "Qty (Import)": "qty_import",
  "Units (Import)": "unit_import",
  "Import Value (FOB USD)": "import_value_fob_usd",
  "Import Value (Rs)": "import_value_rs",
  "HS Code (Import)": "hs_code_import",
  "Item Description (Import)": "item_description_import",
  "Application Prepared on": "application_prepared_on",
  "Submited at DGFT on": "submitted_at_dgft_on",
  "EFT Amount": "eft_amount",
  "BID NO": "bid_no",
  "File No Key No.": "file_no_key_no",
  "D/H": "dh",
  "F/T Do": "ft_do",
  "ADG": "adg",
  "D.DG": "d_dg",
  "Licence No.& date.": "_licence_no_date_combined",
  "Matter Complete / Closed date.": "matter_closed_date",
  "INV. NO.": "matter_closed_inv_no",
  "Docs. handed over to A/c Dept.": "docs_handed_over_to_ac",
  "Remarks": "remarks",
  "Accounts INV. NO.": "accounts_inv_no",
};

// Helper: Parse combined licence number & date string
// Handles patterns like:
//   "0811003091 DT 08.11.2021"          (DT + space)
//   "0810141739 DT.09.01.2018"          (DT.)
//   "0811004963 Dt.25.06.2025"          (Dt.)
//   "811000351 Dt:11/01/2021"           (Dt:)
//   "0810147540 dt.24.03.2020"          (dt.)
//   "0810143080 Dated:23/07/2018"       (Dated:)
//   "0810126888 Dated:04/12/2013"       (Dated:)
function parseLicenceNoDate(combined) {
  if (!combined || typeof combined !== "string" || combined.trim() === "") {
    return { licence_no: "", licence_date: "" };
  }
  const str = combined.trim();
  // Match: <licence_number> <ws> (DT|Dt|dt|Dated|dated) <separator ./:/ > <date>
  const dtMatch = str.match(/^(.+?)\s+(?:dt|dated)[.:/\s]\s*(.+)$/i);
  if (dtMatch) {
    return {
      licence_no: dtMatch[1].trim(),
      licence_date: dtMatch[2].trim(),
    };
  }
  // If no separator found, store everything as licence_no
  return { licence_no: str, licence_date: "" };
}

// Helper: Check if a string looks like a date (DD/MM/YYYY, DD.MM.YYYY, etc.)
function looksLikeDate(str) {
  if (!str) return false;
  const s = str.trim();
  // Excel date numbers (e.g. 45762)
  if (/^\d{4,5}(\.\d+)?$/.test(s)) return true;
  // DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY (1-2 digit day/month, 2-4 digit year)
  if (/^\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4}$/.test(s)) return true;
  // YYYY-MM-DD
  if (/^\d{4}[.\/\-]\d{1,2}[.\/\-]\d{1,2}$/.test(s)) return true;
  return false;
}

// Helper: Normalize date strings to consistent DD/MM/YYYY format
function normalizeDate(val) {
  if (!val || typeof val !== "string") return val;
  let trimmed = val.trim();
  if (!trimmed) return "";

  // Handle Excel serial date values (e.g. "45762" means 15/04/2025)
  if (/^\d{4,5}(\.\d+)?$/.test(trimmed)) {
    const excelNum = parseFloat(trimmed);
    if (excelNum > 59) {
      // Offset 25569 is days between Jan 1 1900 and Jan 1 1970
      const jsDate = new Date(Math.round((excelNum - 25569) * 86400 * 1000));
      const dd = String(jsDate.getUTCDate()).padStart(2, "0");
      const mm = String(jsDate.getUTCMonth() + 1).padStart(2, "0");
      const yyyy = jsDate.getUTCFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
  }

  // Replace DD.MM.YYYY, DD-MM-YYYY, or DD/MM/YYYY with DD/MM/YYYY
  // and handle multiple dates in the same string like "25.04.2025 & 17.02.2025"
  trimmed = trimmed.replace(/\b(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{2,4})\b/g, (match, d, m, y) => {
    const dd = d.padStart(2, "0");
    const mm = m.padStart(2, "0");
    const yyyy = y.length === 2 ? "20" + y : y;
    return `${dd}/${mm}/${yyyy}`;
  });

  // Replace YYYY-MM-DD or YYYY.MM.DD with DD/MM/YYYY
  trimmed = trimmed.replace(/\b(\d{4})[.\/\-](\d{1,2})[.\/\-](\d{1,2})\b/g, (match, y, m, d) => {
    const dd = d.padStart(2, "0");
    const mm = m.padStart(2, "0");
    return `${dd}/${mm}/${y}`;
  });

  return trimmed;
}

// All date field keys for normalization
const DATE_FIELD_KEYS = [
  "date", "docs_received_date", "application_prepared_on",
  "submitted_at_dgft_on", "bid_date", "file_date", "licence_date",
  "matter_closed_date", "matter_closed_inv_date", "accounts_inv_date",
  "online_submission_date", "documents_send_to_accounts_date", "transaction_date",
  "import_validity", "export_validity",
];

// Helper: Detect if a cell value looks like combined/merged or irrelevant data
function isCombinedOrMergedValue(value) {
  if (!value || typeof value !== "string") return false;
  const str = value.trim();
  if (str === "") return false;
  // Check for newline characters (merged cells often produce these)
  if (str.includes("\n") || str.includes("\r")) return true;
  // Check for typical merged-cell / irrelevant text patterns
  const lower = str.toLowerCase();
  if (
    lower.includes("not charge") ||
    lower.includes("na bill") ||
    lower.includes("not make bill") ||
    lower.includes("amendment charge") ||
    lower.includes("for closure")
  ) return true;
  // Check if the value is unreasonably long (likely merged)
  if (str.length > 80) return true;
  return false;
}

router.post(
  "/api/upload-dgft-register-excel",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      // Map Excel column headers to model field names
      const records = rawData.map((row) => {
        const mapped = {};
        for (const [excelHeader, modelField] of Object.entries(DGFT_HEADER_MAP)) {
          // Try exact match first, then case-insensitive
          if (row[excelHeader] !== undefined) {
            mapped[modelField] = String(row[excelHeader]);
          } else {
            const key = Object.keys(row).find(
              (k) => k.trim().toLowerCase() === excelHeader.trim().toLowerCase()
            );
            if (key) mapped[modelField] = String(row[key]);
          }
        }

        // --- Handle matter_closed_inv_date automatically if it is the column after "INV. NO." ---
        const keysList = Object.keys(row);
        const invNoIdx = keysList.findIndex((k) => k.trim().toUpperCase() === "INV. NO.");
        if (invNoIdx !== -1 && invNoIdx + 1 < keysList.length) {
          const nextKey = keysList[invNoIdx + 1];
          if (/date/i.test(nextKey) && row[nextKey] !== undefined && !mapped.matter_closed_inv_date) {
            mapped.matter_closed_inv_date = String(row[nextKey]);
          }
        }

        // --- Handle accounts_inv_date automatically if it is the column after "Accounts INV. NO." ---
        const accInvIdx = keysList.findIndex((k) => k.trim().toUpperCase() === "ACCOUNTS INV. NO.");
        if (accInvIdx !== -1 && accInvIdx + 1 < keysList.length) {
          const nextKey = keysList[accInvIdx + 1];
          if (/date/i.test(nextKey) && row[nextKey] !== undefined && !mapped.accounts_inv_date) {
            mapped.accounts_inv_date = String(row[nextKey]);
          }
        }

        // Fallback for matter_closed_inv_date if still missing: "DATE" (exact match)
        if (!mapped.matter_closed_inv_date) {
          if (row["DATE"] !== undefined) {
            mapped.matter_closed_inv_date = String(row["DATE"]);
          } else {
            const fallbackDate = keysList.find(k => /^DATE$/i.test(k.trim()) && k.trim() !== "Date");
            if (fallbackDate && row[fallbackDate] !== undefined) {
              mapped.matter_closed_inv_date = String(row[fallbackDate]);
            }
          }
        }

        // --- Handle bid_date automatically if it is the column after "BID NO" ---
        const bidNoIdx = keysList.findIndex((k) => k.trim().toUpperCase() === "BID NO" || k.trim().toLowerCase() === "bid no");
        if (bidNoIdx !== -1 && bidNoIdx + 1 < keysList.length) {
          const nextKey = keysList[bidNoIdx + 1];
          if (/date/i.test(nextKey) && row[nextKey] !== undefined && !mapped.bid_date) {
            mapped.bid_date = String(row[nextKey]);
          }
        }

        // --- Handle file_date automatically if it is the column after "File No Key No." ---
        const fileNoIdx = keysList.findIndex((k) => /file no/i.test(k.trim()) && /key no/i.test(k.trim()));
        if (fileNoIdx !== -1 && fileNoIdx + 1 < keysList.length) {
          const nextKey = keysList[fileNoIdx + 1];
          if (/date/i.test(nextKey) && row[nextKey] !== undefined && !mapped.file_date) {
            mapped.file_date = String(row[nextKey]);
          }
        }

        // --- Split "Licence No.& date." into separate licence_no and licence_date ---
        if (mapped._licence_no_date_combined) {
          const parsed = parseLicenceNoDate(mapped._licence_no_date_combined);
          mapped.licence_no = parsed.licence_no;
          mapped.licence_date = parsed.licence_date;
          delete mapped._licence_no_date_combined;
        }

        // --- If licence_no itself looks like a date, move it to licence_date ---
        if (mapped.licence_no && looksLikeDate(mapped.licence_no) && !mapped.licence_date) {
          mapped.licence_date = mapped.licence_no;
          mapped.licence_no = "";
        }

        // --- Handle combined/merged cells for Matter Closed Date, INV No., INV Date ---
        // If any of these three fields appear to contain combined/merged data,
        // set all three to "0" and do not process data from those cells.
        const matterClosed = mapped.matter_closed_date || "";
        const matterInvNo = mapped.matter_closed_inv_no || "";
        const matterInvDate = mapped.matter_closed_inv_date || "";
        if (
          isCombinedOrMergedValue(matterClosed) ||
          isCombinedOrMergedValue(matterInvNo) ||
          isCombinedOrMergedValue(matterInvDate)
        ) {
          mapped.matter_closed_date = "0";
          mapped.matter_closed_inv_no = "0";
          mapped.matter_closed_inv_date = "0";
        }

        // --- Normalize all date fields to DD/MM/YYYY ---
        DATE_FIELD_KEYS.forEach((key) => {
          if (mapped[key] && mapped[key] !== "0") {
            mapped[key] = normalizeDate(mapped[key]);
          }
        });

        return mapped;
      });

      // Filter out empty rows (all values blank)
      const validRecords = records.filter((r) =>
        Object.values(r).some((v) => v && v.trim() !== "")
      );

      if (validRecords.length === 0) {
        return res
          .status(400)
          .json({ message: "No valid data found in the Excel file" });
      }

      // Filter records that have a Job No, as it's required for upsert
      const recordsWithJobNo = validRecords.filter(
        (r) => r.job_no && r.job_no.trim() !== ""
      );

      if (recordsWithJobNo.length === 0) {
        return res
          .status(400)
          .json({ message: "No records with 'Job No' found." });
      }

      // Auto-assign sequential sr_no (1, 2, 3, ...)
      recordsWithJobNo.forEach((record, idx) => {
        record.sr_no = String(idx + 1);
      });

      // Bulk Upsert Logic based on 'job_no'
      const operations = recordsWithJobNo.map((record) => ({
        updateOne: {
          filter: { job_no: record.job_no },
          update: { $set: record },
          upsert: true,
        },
      }));

      const result = await DgftRegisterModel.bulkWrite(operations);

      res.status(201).json({
        message: `Upload complete: ${result.upsertedCount} inserted, ${result.modifiedCount} updated.`,
        count: recordsWithJobNo.length,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error processing Excel file" });
    }
  }
);

// POST upload Excel for Authorization Registration
const AUTH_HEADER_MAP = {
  "JOB No": "job_no",
  "Date": "date",
  "party's name": "party_name",
  "PARTICULAR": "party_name",
  "Job Type": "job_type",
  "Port Name": "port_name",
  "Category": "category",
  "Licence No": "_licence_no_combined",
  "Licence Date": "licence_date",
  "Licence Amount": "licence_amount",
  "LIC. RECD FROM PARTY": "lic_recd_from_party",
  "Date (send to ICD's/Ports)": "date_send_to_icd_ports",
  "BOND NO / CHALLAN NO.": "bond_challan_amount",
  "BOND / CHALLAN AMOUNT": "bond_challan_amount",
  "IEC No.": "iec_no",
  "Completed": "completed",
  "Registration Date": "registration_date",
  "MONTH": "month",
  "Billing Done or Not": "billing_done_or_not",
  "Bill Number": "bill_number",
  "Port Code": "port_code",

  // New fields mapping
  "Import validity": "import_validity",
  "Export validity": "export_validity",
  "Hs code": "hs_code_import",
  "HS CODE": "hs_code_import",
  "HS code import": "hs_code_import",
  "Hs code export": "export_hs_code",
  "HS code export": "export_hs_code",
  "Export hs code": "export_hs_code",
  "Item description ( Export)": "export_item_description",
  "Item description ( import)": "import_item_description",
  "Qty ( export)": "export_qty",
  "Qty( import)": "import_qty",
  "Balance qty( import)": "balance_qty_import",
  "Utilisation details ( import)": "utilisation_details_import",
  "Utilisation details ( export)": "utilisation_details_export",
  "Import value ( CIF USD)": "import_value_usd",
  "Import value ( CIF Rs)": "import_value_rs",
  "Export value ( FOB USD)": "export_value_usd",
  "Export value ( FOB Rs)": "export_value_rs",
  "BG expiry date": "bg_expiry_date",
  "Bond expiry date": "bond_expiry_date",
  "Documents received date": "documents_received_date",
  "Documents send date to ICD": "documents_send_to_icd",
  "Documents send date to accounts": "documents_send_to_accounts",
  "Accounts Billing Invoice Number": "accounts_billing_invoice_no",
  "Accounts Billing Invoice Date": "accounts_billing_invoice_date",
};

router.post(
  "/api/upload-authorization-registration-excel",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      // Map Excel column headers to model field names
      const records = rawData.map((row) => {
        const mapped = {};
        for (const [excelHeader, modelField] of Object.entries(AUTH_HEADER_MAP)) {
          if (row[excelHeader] !== undefined) {
            mapped[modelField] = String(row[excelHeader]);
          } else {
            const key = Object.keys(row).find(
              (k) => k.trim().toLowerCase() === excelHeader.trim().toLowerCase()
            );
            if (key) mapped[modelField] = String(row[key]);
          }
        }

        // --- Split "Licence No" if it contains combined format like "0811003091 DT 08.11.2021" ---
        if (mapped._licence_no_combined) {
          const combinedVal = mapped._licence_no_combined;
          const parsed = parseLicenceNoDate(combinedVal);
          mapped.licence_no = parsed.licence_no;
          if (!mapped.licence_date || mapped.licence_date.trim() === "") {
            mapped.licence_date = parsed.licence_date;
          }
          delete mapped._licence_no_combined;
        }

        // --- If licence_no itself looks like a date, move it to licence_date ---
        if (mapped.licence_no && looksLikeDate(mapped.licence_no) && !mapped.licence_date) {
          mapped.licence_date = mapped.licence_no;
          mapped.licence_no = "";
        }

        // --- Normalize all date fields to DD/MM/YYYY ---
        const AUTH_DATE_KEYS = ["date", "licence_date", "date_send_to_icd_ports", "registration_date", "lic_recd_from_party", "accounts_billing_invoice_date"];
        AUTH_DATE_KEYS.forEach((key) => {
          if (mapped[key]) {
            mapped[key] = normalizeDate(mapped[key]);
          }
        });

        return mapped;
      });

      // Filter valid records (must have content)
      const validRecords = records.filter((r) =>
        Object.values(r).some((v) => v && v.trim() !== "")
      );

      if (validRecords.length === 0) {
        return res
          .status(400)
          .json({ message: "No valid data found in the Excel file" });
      }

      // Filter records that have a Job No (required for upsert)
      const recordsWithJobNo = validRecords.filter(
        (r) => r.job_no && r.job_no.trim() !== ""
      );

      if (recordsWithJobNo.length === 0) {
        return res
          .status(400)
          .json({ message: "No records with 'Job No' found." });
      }

      // Bulk Upsert Logic based on 'job_no'
      const operations = recordsWithJobNo.map((record) => ({
        updateOne: {
          filter: { job_no: record.job_no },
          update: { $set: record },
          upsert: true,
        },
      }));

      const result = await AuthorizationRegistrationModel.bulkWrite(operations);

      res.status(201).json({
        message: `Upload complete: ${result.upsertedCount} inserted, ${result.modifiedCount} updated.`,
        count: recordsWithJobNo.length,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error processing Excel file" });
    }
  }
);

// GET distinct categories for DGFT register
router.get("/api/get-dgft-categories", async (req, res) => {
  try {
    const categories = await DgftRegisterModel.distinct("category");
    const schemes = await DgftRegisterModel.distinct("scheme");
    const validCategories = Array.from(new Set([...(categories || []), ...(schemes || [])]))
      .filter((c) => c)
      .sort();
    res.status(200).json(validCategories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ============= Authorization Registration CRUD =============

// GET all authorization registrations
router.get("/api/get-authorization-registrations", async (req, res) => {
  try {
    const data = await AuthorizationRegistrationModel.find().sort({
      createdAt: -1,
    });
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// POST add authorization registration
router.post("/api/add-authorization-registration", async (req, res) => {
  try {
    const record = await AuthorizationRegistrationModel.create(req.body);
    res
      .status(201)
      .json({ message: "Record added successfully", data: record });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// PUT update authorization registration
router.put("/api/update-authorization-registration/:id", async (req, res) => {
  try {
    const updated = await AuthorizationRegistrationModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Record not found" });

    // Recalculate utilization using the newly saved quantities/values to refresh dynamic balances
    await recalculateLicenseUtilization(updated.registration_no || updated.licence_no || updated.job_no);
    const finalDoc = await AuthorizationRegistrationModel.findById(req.params.id);

    // Sync compliance details back to JobModel for any linked BE numbers
    const beNos = [];
    if (updated.be_details && Array.isArray(updated.be_details)) {
      updated.be_details.forEach(item => {
        if (item.be_no) {
          beNos.push(item.be_no);
        }
      });
    }

    if (beNos.length > 0) {
      const jobUpdate = {};
      const convertToYyyyMmDd = (dateStr) => {
        if (!dateStr || typeof dateStr !== "string") return dateStr;
        if (dateStr.includes("-")) return dateStr; // Already in YYYY-MM-DD
        const parts = dateStr.split("/");
        if (parts.length === 3) {
          const [dd, mm, yyyy] = parts;
          return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
        }
        return dateStr;
      };

      if (req.body.bg_number !== undefined) jobUpdate.bg_number = req.body.bg_number;
      if (req.body.bg_expiry_date !== undefined) jobUpdate.bg_expiry_date = convertToYyyyMmDd(req.body.bg_expiry_date);
      if (req.body.bond_number !== undefined) jobUpdate.bond_number = req.body.bond_number;
      if (req.body.bond_expiry_date !== undefined) jobUpdate.bond_expiry_date = convertToYyyyMmDd(req.body.bond_expiry_date);
      if (req.body.documents_received_date !== undefined) jobUpdate.documents_received_date = convertToYyyyMmDd(req.body.documents_received_date);
      if (req.body.documents_send_to_icd !== undefined) jobUpdate.documents_send_to_icd = convertToYyyyMmDd(req.body.documents_send_to_icd);
      if (req.body.documents_send_to_accounts !== undefined) jobUpdate.documents_send_to_accounts = convertToYyyyMmDd(req.body.documents_send_to_accounts);

      if (Object.keys(jobUpdate).length > 0) {
        const result = await JobModel.updateMany(
          { be_no: { $in: beNos } },
          { $set: jobUpdate }
        );
        console.log(`✅ Synced DGFT authorization changes to ${result.modifiedCount} import operations jobs.`);
      }
    }

    res
      .status(200)
      .json({ message: "Record updated successfully", data: finalDoc });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// DELETE authorization registration
router.delete(
  "/api/delete-authorization-registration/:id",
  async (req, res) => {
    try {
      const deleted =
        await AuthorizationRegistrationModel.findByIdAndDelete(req.params.id);
      if (!deleted)
        return res.status(404).json({ message: "Record not found" });

      // Clean up associated utilization records
      const authNo = deleted.registration_no || deleted.licence_no || deleted.job_no;
      if (authNo) {
        const cleanedNo = String(authNo).replace(/^LIC\//i, "").trim();
        const searchNos = [authNo, cleanedNo];
        if (deleted.registration_no) searchNos.push(deleted.registration_no);
        if (deleted.licence_no) searchNos.push(deleted.licence_no);
        if (deleted.job_no) {
          searchNos.push(deleted.job_no);
          searchNos.push(`LIC/${deleted.job_no}`);
          searchNos.push(`lic/${deleted.job_no}`);
        }
        const uniqueSearchNos = [...new Set(searchNos.filter(n => n && n.trim() !== ""))];
        await LicenseUtilizationModel.deleteMany({ authorization_no: { $in: uniqueSearchNos } });
      }

      res.status(200).json({ message: "Record deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

// DELETE all DGFT registers
router.delete("/api/delete-all-dgft-registers", async (req, res) => {
  try {
    await DgftRegisterModel.deleteMany({});
    res.status(200).json({ message: "All DGFT registers deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// DELETE all authorization registrations
router.delete("/api/delete-all-authorization-registrations", async (req, res) => {
  try {
    await AuthorizationRegistrationModel.deleteMany({});
    res.status(200).json({ message: "All authorization registrations deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// GET distinct categories for Authorization Registration
router.get("/api/get-auth-reg-categories", async (req, res) => {
  try {
    const categories = await AuthorizationRegistrationModel.distinct("category");
    const validCategories = categories.filter((c) => c).sort();
    res.status(200).json(validCategories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ── New: GET authorization by authorization number (for DSR license auto-populate) ──
// Returns the authorization record so DSR can auto-fill license_date, scheme_code, import_details_array
router.get("/api/get-authorization-by-no", async (req, res) => {
  try {
    const { authorization_no } = req.query;
    if (!authorization_no) {
      return res.status(400).json({ message: "authorization_no query param is required" });
    }
    const cleanedNo = String(authorization_no).replace(/^LIC\//i, "").trim();
    const record = await AuthorizationRegistrationModel.findOne({
      $or: [
        { registration_no: authorization_no },
        { licence_no: authorization_no },
        { job_no: authorization_no },
        { job_no: cleanedNo }
      ],
    })
      .select("registration_no licence_no auth_date licence_date scheme_code iec_no import_details_array export_details_array party_name job_no import_validity export_validity notification_number bg_number bg_amount bg_date bg_expiry_date bond_number bond_amount bond_date bond_expiry_date documents_received_date documents_send_to_icd documents_send_to_accounts accounts_billing_invoice_no accounts_billing_invoice_date")
      .lean();

    if (!record) {
      return res.status(404).json({ message: "Authorization not found" });
    }
    res.status(200).json(record);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ── New: GET list of authorizations by IEC (for DSR license dropdown suggestions) ──
// Returns minimal info for the autocomplete list (auth no, date, scheme_code, party_name)
router.get("/api/get-authorizations-by-iec", async (req, res) => {
  try {
    const { iec_no } = req.query;
    let query = {};
    if (iec_no) {
      if (typeof iec_no === "string" && iec_no.includes(",")) {
        const list = iec_no.split(",").map((s) => s.trim()).filter(Boolean);
        query = { iec_no: { $in: list } };
      } else if (Array.isArray(iec_no)) {
        query = { iec_no: { $in: iec_no } };
      } else {
        query = { iec_no };
      }
    }
    const records = await AuthorizationRegistrationModel.find(query)
      .select("registration_no licence_no auth_date licence_date scheme_code party_name import_details_array bond_number bond_amount bond_expiry_date job_no port_code job_status job_type category iec_no")
      .sort({ createdAt: -1 })
      .lean();

    // Map to a simple list format
    const list = records.map((r) => ({
      _id: r._id,
      authorization_no: r.registration_no || r.licence_no || "",
      licence_no: r.licence_no || r.registration_no || "",
      authorization_date: r.auth_date || r.licence_date || "",
      licence_date: r.licence_date || r.auth_date || "",
      auth_date: r.auth_date || r.licence_date || "",
      scheme_code: r.scheme_code || "",
      party_name: r.party_name || "",
      iec_no: r.iec_no || "",
      bond_number: r.bond_number || "",
      bond_amount: r.bond_amount || "",
      bond_expiry_date: r.bond_expiry_date || "",
      job_no: r.job_no || "",
      port_code: r.port_code || "",
      job_status: r.job_status || "",
      job_category: r.job_type || r.category || "",
      import_details_array: r.import_details_array || [],
    }));

    res.status(200).json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ── New: GET license utilization logs loaded from licenseUtilizationModel ──
router.get("/api/license-utilization/records", async (req, res) => {
  try {
    const { authorization_no } = req.query;
    if (!authorization_no) {
      return res.status(400).json({ message: "authorization_no query param is required" });
    }
    const cleanedNo = String(authorization_no).replace(/^LIC\//i, "").trim();
    const auth = await AuthorizationRegistrationModel.findOne({
      $or: [
        { registration_no: authorization_no },
        { licence_no: authorization_no },
        { job_no: authorization_no },
        { job_no: cleanedNo }
      ]
    }).lean();

    const searchNos = [authorization_no, cleanedNo];
    if (auth) {
      if (auth.registration_no) searchNos.push(auth.registration_no);
      if (auth.licence_no) searchNos.push(auth.licence_no);
      if (auth.job_no) {
        searchNos.push(auth.job_no);
        searchNos.push(`LIC/${auth.job_no}`);
        searchNos.push(`lic/${auth.job_no}`);
      }
    }
    const uniqueSearchNos = [...new Set(searchNos.filter(n => n && n.trim() !== ""))];

    const records = await LicenseUtilizationModel.find({
      authorization_no: { $in: uniqueSearchNos }
    }).sort({ created_at: -1 });
    res.status(200).json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ===================== RODTEP Details CRUD =====================

// Helper to query all jobs utilizing a specific RODTEP certificate
async function getRodtepUtilization(rodtepNo) {
  const jobs = await JobModel.find({
    "description_details.rodtep": rodtepNo
  }).select("job_no ie_code_no exrate description_details").lean();

  const utilizationList = [];
  let totalUtilized = 0;

  for (const job of jobs) {
    const jobEx = parseFloat(job.exrate) || 84;
    for (const row of job.description_details) {
      if (row.rodtep === rodtepNo) {
        const amt = parseFloat(row.amount) || 0;
        const amtInr = row.amount_currency === "INR" ? amt : amt * jobEx;

        utilizationList.push({
          job_no: job.job_no,
          ie_code_no: job.ie_code_no,
          description: row.description || "—",
          amount: amt,
          currency: row.amount_currency || "USD",
          amount_inr: Math.round(amtInr * 100) / 100
        });
        totalUtilized += amtInr;
      }
    }
  }
  return { utilizationList, totalUtilized };
}

// GET all RODTEP scrips (enriched with utilized & balance values)
router.get("/api/get-rodteps", async (req, res) => {
  try {
    const data = await RodtepModel.find().sort({ createdAt: -1 }).lean();
    const enriched = [];
    for (const item of data) {
      const { totalUtilized } = await getRodtepUtilization(item.rodtep);
      enriched.push({
        ...item,
        utilized_amount: Math.round(totalUtilized * 100) / 100,
        balance_amount: Math.max(0, Math.round((item.value_inr - totalUtilized) * 100) / 100)
      });
    }
    res.status(200).json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// POST add new RODTEP scrip (auto-calculates sr_no sequentially)
router.post("/api/add-rodtep", async (req, res) => {
  try {
    const maxEntry = await RodtepModel.findOne().sort({ sr_no: -1 });
    const nextSr = maxEntry && maxEntry.sr_no ? maxEntry.sr_no + 1 : 1;
    req.body.sr_no = nextSr;

    const record = await RodtepModel.create(req.body);
    res.status(201).json({ message: "RODTEP record added successfully", data: record });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// PUT update RODTEP scrip details
router.put("/api/update-rodtep/:id", async (req, res) => {
  try {
    const updated = await RodtepModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Record not found" });
    res.status(200).json({ message: "RODTEP record updated successfully", data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// DELETE RODTEP scrip
router.delete("/api/delete-rodtep/:id", async (req, res) => {
  try {
    const deleted = await RodtepModel.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Record not found" });
    res.status(200).json({ message: "RODTEP record deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// GET utilizing jobs for a specific RODTEP scrip
router.get("/api/get-rodtep-utilization", async (req, res) => {
  try {
    const { rodtep } = req.query;
    if (!rodtep) {
      return res.status(400).json({ message: "rodtep query param is required" });
    }
    const { utilizationList } = await getRodtepUtilization(rodtep);
    res.status(200).json(utilizationList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// GET RODTEPs matching job IEC code
router.get("/api/get-rodteps-by-iec", async (req, res) => {
  try {
    const { iec_no } = req.query;
    if (!iec_no) {
      return res.status(400).json({ message: "iec_no query param is required" });
    }
    const data = await RodtepModel.find({ iec_code: iec_no }).sort({ createdAt: -1 }).lean();
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ===================== DGFT Payment Approval Workflow =====================

// GET all DGFT records with a payment status (for approval tab)
router.get("/api/get-dgft-payment-requests", async (req, res) => {
  try {
    const data = await DgftRegisterModel.find({
      payment_status: { $exists: true, $ne: "" },
    }).sort({ payment_requested_at: -1 });
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// PUT submit a payment request
router.put("/api/dgft-request-payment/:id", authMiddleware, async (req, res) => {
  try {
    const record = await DgftRegisterModel.findById(req.params.id);
    if (!record) return res.status(404).json({ message: "Record not found" });

    const eftAmount = req.body.eft_amount || record.eft_amount;
    if (!eftAmount || String(eftAmount).trim() === "") {
      return res.status(400).json({ message: "EFT Amount is required to request payment" });
    }

    const requestedBy = req.user?.username || req.user?.first_name || req.body.requested_by || "Admin";

    record.eft_amount = eftAmount;
    record.payment_status = "Payment Requested";
    record.job_status = "PAYMENT REQUESTED";
    record.payment_requested_by = requestedBy;
    record.payment_requested_at = new Date();
    // Clear any previous rejection
    record.payment_rejection_reason = "";
    record.payment_approved_by = "";
    record.payment_approved_at = null;

    await record.save();
    res.status(200).json({ message: "Payment request submitted", data: record });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// PUT approve a payment request
router.put("/api/dgft-approve-payment/:id", authMiddleware, async (req, res) => {
  try {
    const record = await DgftRegisterModel.findById(req.params.id);
    if (!record) return res.status(404).json({ message: "Record not found" });
    if (record.payment_status !== "Payment Requested") {
      return res.status(400).json({ message: "Only records with 'Payment Requested' status can be approved" });
    }

    const approvedBy = req.user?.username || req.user?.first_name || req.body.approved_by || "Admin";

    record.payment_status = "Payment Approved";
    record.job_status = "APPROVED";
    record.payment_approved_by = approvedBy;
    record.payment_approved_at = new Date();

    await record.save();
    res.status(200).json({ message: "Payment approved", data: record });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// PUT reject a payment request
router.put("/api/dgft-reject-payment/:id", authMiddleware, async (req, res) => {
  try {
    const record = await DgftRegisterModel.findById(req.params.id);
    if (!record) return res.status(404).json({ message: "Record not found" });
    if (record.payment_status !== "Payment Requested") {
      return res.status(400).json({ message: "Only records with 'Payment Requested' status can be rejected" });
    }

    const rejectedBy = req.user?.username || req.user?.first_name || req.body.rejected_by || "Admin";
    const reason = req.body.reason || "";

    record.payment_status = "Payment Rejected";
    record.job_status = "DEFICIENT";
    record.payment_approved_by = rejectedBy;
    record.payment_approved_at = new Date();
    record.payment_rejection_reason = reason;

    await record.save();
    res.status(200).json({ message: "Payment rejected", data: record });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;

