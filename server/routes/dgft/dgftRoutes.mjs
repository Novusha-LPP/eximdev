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
  "Licence No.& date.": "licence_no_date",
  "Matter Complete / Closed date.": "matter_closed_date",
  "Docs. handed over to A/c Dept.": "docs_handed_over_to_ac",
  "Remarks": "remarks",
  "Accounts INV. NO.": "accounts_inv_no",
};

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
  "Licence No": "licence_no",
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

export default router;
