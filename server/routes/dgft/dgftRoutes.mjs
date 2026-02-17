import express from "express";
import multer from "multer";
import XLSX from "xlsx";
import DgftRegisterModel from "../../model/dgftRegisterModel.mjs";
import AuthorizationRegistrationModel from "../../model/authorizationRegistrationModel.mjs";

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
    const record = await DgftRegisterModel.create(req.body);
    res.status(201).json({ message: "Record added successfully", data: record });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// PUT update DGFT register
router.put("/api/update-dgft-register/:id", async (req, res) => {
  try {
    const updated = await DgftRegisterModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Record not found" });
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
  "JOB.No.": "job_no",
  "Date": "date",
  "Party's Name": "party_name",
  "Category": "category",
  "Licence Value / CIF Value": "licence_cif_value",
  "Docs. Recvd. Date": "docs_received_date",
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
  // DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY (1-2 digit day/month, 2-4 digit year)
  if (/^\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4}$/.test(s)) return true;
  // YYYY-MM-DD
  if (/^\d{4}[.\/\-]\d{1,2}[.\/\-]\d{1,2}$/.test(s)) return true;
  return false;
}

// Helper: Normalize date strings to consistent DD/MM/YYYY format
function normalizeDate(val) {
  if (!val || typeof val !== "string") return val;
  const trimmed = val.trim();
  if (!trimmed) return "";
  // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
  const dmy = trimmed.match(/^(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{2,4})$/);
  if (dmy) {
    const dd = dmy[1].padStart(2, "0");
    const mm = dmy[2].padStart(2, "0");
    const yyyy = dmy[3].length === 2 ? "20" + dmy[3] : dmy[3];
    return `${dd}/${mm}/${yyyy}`;
  }
  // YYYY-MM-DD
  const ymd = trimmed.match(/^(\d{4})[.\/\-](\d{1,2})[.\/\-](\d{1,2})$/);
  if (ymd) {
    const dd = ymd[3].padStart(2, "0");
    const mm = ymd[2].padStart(2, "0");
    return `${dd}/${mm}/${ymd[1]}`;
  }
  return trimmed;
}

// All date field keys for normalization
const DATE_FIELD_KEYS = [
  "date", "docs_received_date", "application_prepared_on",
  "submitted_at_dgft_on", "bid_date", "file_date", "licence_date",
  "matter_closed_date", "matter_closed_inv_date", "accounts_inv_date",
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

        // --- Handle "DATE" column separately (exact case) to avoid clash with "Date" ---
        // The Excel has "Date" for job date and "DATE" for invoice date near Matter Complete.
        if (row["DATE"] !== undefined && !mapped.matter_closed_inv_date) {
          mapped.matter_closed_inv_date = String(row["DATE"]);
        }
        // Also try __EMPTY variants that XLSX may generate for adjacent unnamed columns
        const dateKeys = Object.keys(row).filter(
          (k) => /^DATE$/i.test(k.trim()) && k !== "Date" && k.trim() !== "Date"
        );
        if (dateKeys.length > 0 && !mapped.matter_closed_inv_date) {
          mapped.matter_closed_inv_date = String(row[dateKeys[0]]);
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
  "Job Type": "job_type",
  "Port Name": "port_name",
  "Category": "category",
  "Licence No": "_licence_no_combined",
  "Licence Date": "licence_date",
  "Licence Amount": "licence_amount",
  "LIC. RECD FROM PARTY": "lic_recd_from_party",
  "Date (send to ICD's/Ports)": "date_send_to_icd_ports",
  "BOND NO / CHALLAN NO.": "bond_challan_no",
  "IEC No.": "iec_no",
  "Completed": "completed",
  "Registration Date": "registration_date",
  "MONTH": "month",
  "Billing Done or Not": "billing_done_or_not",
  "Bill Number": "bill_number",
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
        const AUTH_DATE_KEYS = ["date", "licence_date", "date_send_to_icd_ports", "registration_date"];
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
    const validCategories = categories.filter((c) => c).sort();
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
    res
      .status(200)
      .json({ message: "Record updated successfully", data: updated });
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
      res.status(200).json({ message: "Record deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

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

export default router;
