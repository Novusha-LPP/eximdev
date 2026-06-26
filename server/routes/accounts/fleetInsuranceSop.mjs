import express from "express";
import XLSX from "xlsx";
import FleetInsuranceSopModel from "../../model/accounts/fleetInsuranceSop.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import { context } from "../../utils/context.mjs";

const router = express.Router();

// GET all records with pagination and search
router.get("/fleet-insurance-sop", authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", month = "", year = "" } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { registrationNo: { $regex: search, $options: "i" } },
        { owner: { $regex: search, $options: "i" } },
        { insuranceCompany: { $regex: search, $options: "i" } },
        { policyNo: { $regex: search, $options: "i" } }
      ];
    }

    if (year && month) {
      // month is 1-12
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      query.createdAt = { $gte: startDate, $lte: endDate };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 12, 0, 23, 59, 59);
      query.createdAt = { $gte: startDate, $lte: endDate };
    } else if (month) {
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, parseInt(month) - 1, 1);
      const endDate = new Date(currentYear, parseInt(month), 0, 23, 59, 59);
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const data = await FleetInsuranceSopModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await FleetInsuranceSopModel.countDocuments(query);

    res.status(200).json({ data, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error("Error fetching Fleet Insurance SOP records:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET single record by ID
router.get("/fleet-insurance-sop/:id", authMiddleware, async (req, res) => {
  try {
    const record = await FleetInsuranceSopModel.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }
    res.status(200).json({ data: record });
  } catch (error) {
    console.error("Error fetching record:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// CREATE new record
router.post("/fleet-insurance-sop", authMiddleware, async (req, res) => {
  try {
    const newRecord = new FleetInsuranceSopModel(req.body);
    await context.run({ user: req.user, req }, async () => {
      await newRecord.save();
    });
    res.status(201).json({ message: "Record created successfully", data: newRecord });
  } catch (error) {
    console.error("Error creating record:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// UPDATE record
router.put("/fleet-insurance-sop/:id", authMiddleware, async (req, res) => {
  try {
    let updatedRecord;
    await context.run({ user: req.user, req }, async () => {
      const record = await FleetInsuranceSopModel.findById(req.params.id);
      if (!record) throw new Error("Record not found");
      Object.assign(record, req.body);
      updatedRecord = await record.save();
    });
    res.status(200).json({ message: "Record updated successfully", data: updatedRecord });
  } catch (error) {
    console.error("Error updating record:", error);
    if (error.message === "Record not found") {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// DELETE record
router.delete("/fleet-insurance-sop/:id", authMiddleware, async (req, res) => {
  try {
    await context.run({ user: req.user, req }, async () => {
      const record = await FleetInsuranceSopModel.findById(req.params.id);
      if (!record) throw new Error("Record not found");
      await record.deleteOne();
    });
    res.status(200).json({ message: "Record deleted successfully" });
  } catch (error) {
    console.error("Error deleting record:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// EXPORT to Excel
router.get("/fleet-insurance-sop/:id/export", authMiddleware, async (req, res) => {
  try {
    const doc = await FleetInsuranceSopModel.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "Record not found" });

    const wb = XLSX.utils.book_new();

    const headers = [
      "Sr. No.",
      "Registration No.",
      "Registration Date",
      "MAKE/MODEL",
      "From",
      "To",
      "Model",
      "Size",
      "Owner",
      "From",
      "To",
      "Insurance Company",
      "Policy No",
      "GVW",
      "IDV",
      "Premium Amount",
      "Remarks",
      "NCB",
      "PREMIUM",
      "", // Empty column as per original
      "This year idv",
      "NEW IDV",
      "NCB",
      "RSD TAKEN",
      "IMT 23",
      "zero dep+ Towing cover 20000",
      "PREMIUM QUOTE",
      "RENEWED",
      "NEW EXPIRY DT",
      "RENEWED DT"
    ];

    const formatDate = (d) => {
      if (!d) return "";
      const date = new Date(d);
      return `${date.getDate().toString().padStart(2, "0")}.${(date.getMonth() + 1).toString().padStart(2, "0")}.${date.getFullYear()}`;
    };

    const row = [
      doc.srNo || "",
      doc.registrationNo || "",
      formatDate(doc.registrationDate),
      doc.makeModel || "",
      formatDate(doc.fromOwner),
      formatDate(doc.toOwner),
      doc.modelType || "",
      doc.size || "",
      doc.owner || "",
      formatDate(doc.policyFromDate),
      formatDate(doc.policyToDate),
      doc.insuranceCompany || "",
      doc.policyNo || "",
      doc.gvw || "",
      doc.idv || "",
      doc.premiumAmount || "",
      doc.remarks || "",
      doc.ncbPercentage || "",
      doc.premium || "",
      "", // Empty
      doc.thisYearIdv || "",
      doc.newIdv || "",
      doc.newNcbPercentage || "",
      doc.rsdTaken || "",
      doc.imt23 || "",
      doc.zeroDepTowingCover || "",
      doc.premiumQuote || "",
      doc.renewed || "",
      formatDate(doc.newExpiryDate),
      formatDate(doc.renewedDate)
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, row]);
    XLSX.utils.book_append_sheet(wb, ws, "Policy Data");

    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", `attachment; filename=Fleet_Insurance_${doc.registrationNo || "Doc"}.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(excelBuffer);
  } catch (error) {
    console.error("Error exporting to excel:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// BULK EXPORT to Excel
router.get("/fleet-insurance-sop/export/bulk", authMiddleware, async (req, res) => {
  try {
    const { search = "", month = "", year = "" } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { registrationNo: { $regex: search, $options: "i" } },
        { owner: { $regex: search, $options: "i" } },
        { insuranceCompany: { $regex: search, $options: "i" } },
        { policyNo: { $regex: search, $options: "i" } }
      ];
    }

    if (year && month) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      query.createdAt = { $gte: startDate, $lte: endDate };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 12, 0, 23, 59, 59);
      query.createdAt = { $gte: startDate, $lte: endDate };
    } else if (month) {
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, parseInt(month) - 1, 1);
      const endDate = new Date(currentYear, parseInt(month), 0, 23, 59, 59);
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    const docs = await FleetInsuranceSopModel.find(query).sort({ createdAt: -1 }).lean();

    const wb = XLSX.utils.book_new();

    const headers = [
      "Sr. No.",
      "Registration No.",
      "Registration Date",
      "MAKE/MODEL",
      "From",
      "To",
      "Model",
      "Size",
      "Owner",
      "From",
      "To",
      "Insurance Company",
      "Policy No",
      "GVW",
      "IDV",
      "Premium Amount",
      "Remarks",
      "NCB",
      "PREMIUM",
      "", // Empty column as per original
      "This year idv",
      "NEW IDV",
      "NCB",
      "RSD TAKEN",
      "IMT 23",
      "zero dep+ Towing cover 20000",
      "PREMIUM QUOTE",
      "RENEWED",
      "NEW EXPIRY DT",
      "RENEWED DT"
    ];

    const formatDate = (d) => {
      if (!d) return "";
      const date = new Date(d);
      return `${date.getDate().toString().padStart(2, "0")}.${(date.getMonth() + 1).toString().padStart(2, "0")}.${date.getFullYear()}`;
    };

    const aoaData = [headers];

    docs.forEach(doc => {
      aoaData.push([
        doc.srNo || "",
        doc.registrationNo || "",
        formatDate(doc.registrationDate),
        doc.makeModel || "",
        formatDate(doc.fromOwner),
        formatDate(doc.toOwner),
        doc.modelType || "",
        doc.size || "",
        doc.owner || "",
        formatDate(doc.policyFromDate),
        formatDate(doc.policyToDate),
        doc.insuranceCompany || "",
        doc.policyNo || "",
        doc.gvw || "",
        doc.idv || "",
        doc.premiumAmount || "",
        doc.remarks || "",
        doc.ncbPercentage || "",
        doc.premium || "",
        "", // Empty
        doc.thisYearIdv || "",
        doc.newIdv || "",
        doc.newNcbPercentage || "",
        doc.rsdTaken || "",
        doc.imt23 || "",
        doc.zeroDepTowingCover || "",
        doc.premiumQuote || "",
        doc.renewed || "",
        formatDate(doc.newExpiryDate),
        formatDate(doc.renewedDate)
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoaData);
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Policy Data");

    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    
    let filename = "Fleet_Insurance_Export.xlsx";
    if (month && year) {
      filename = `Fleet_Insurance_${month}_${year}.xlsx`;
    } else if (year) {
      filename = `Fleet_Insurance_${year}.xlsx`;
    } else if (month) {
      filename = `Fleet_Insurance_Month_${month}.xlsx`;
    }

    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(excelBuffer);
  } catch (error) {
    console.error("Error bulk exporting to excel:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// EXPORT template
router.get("/fleet-insurance-sop/template/download", authMiddleware, async (req, res) => {
  try {
    const wb = XLSX.utils.book_new();
    const headers = [
      "Sr. No.",
      "Registration No.",
      "Registration Date",
      "MAKE/MODEL",
      "From",
      "To",
      "Model",
      "Size",
      "Owner",
      "From",
      "To",
      "Insurance Company",
      "Policy No",
      "GVW",
      "IDV",
      "Premium Amount",
      "Remarks",
      "NCB",
      "PREMIUM",
      "", // Empty column as per original
      "This year idv",
      "NEW IDV",
      "NCB",
      "RSD TAKEN",
      "IMT 23",
      "zero dep+ Towing cover 20000",
      "PREMIUM QUOTE",
      "RENEWED",
      "NEW EXPIRY DT",
      "RENEWED DT"
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    XLSX.utils.book_append_sheet(wb, ws, "Policy Data");

    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", `attachment; filename=Fleet_Insurance_SOP_Template.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(excelBuffer);
  } catch (error) {
    console.error("Error exporting template:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
