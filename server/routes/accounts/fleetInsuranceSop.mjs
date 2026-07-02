import express from "express";
import XLSX from "xlsx";
import FleetInsuranceSopModel from "../../model/accounts/fleetInsuranceSop.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import { context } from "../../utils/context.mjs";

const router = express.Router();

// GET all records with pagination and search
router.get("/fleet-insurance-sop", authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", month = "", year = "", regNo, owner, size, modelType, premiumAmount, premiumQuote, expiryDate, renewed } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { registrationNo: { $regex: search, $options: "i" } },
        { owner: { $regex: search, $options: "i" } },
        { insuranceCompany: { $regex: search, $options: "i" } },
        { policyNo: { $regex: search, $options: "i" } }
      ];
    }
    
    if (regNo) query.registrationNo = { $regex: regNo, $options: "i" };
    if (owner) query.owner = owner;
    if (size) query.size = size;
    if (modelType) query.modelType = modelType;
    if (premiumAmount) query.premiumAmount = Number(premiumAmount);
    if (premiumQuote) query.premiumQuote = Number(premiumQuote);
    if (renewed) {
      if (renewed.toUpperCase() === "YES") {
        query.renewed = { $regex: "^yes$", $options: "i" };
      } else if (renewed.toUpperCase() === "NO") {
        query.$or = [
          { renewed: { $regex: "^no$", $options: "i" } },
          { renewed: null },
          { renewed: "" }
        ];
      }
    }
    if (expiryDate) {
      // filter by date string exact match or range. A simple regex on date string won't work well on Date type.
      // Usually users type a date. We can parse it and match the start/end of that day.
      const date = new Date(expiryDate);
      if (!isNaN(date.getTime())) {
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));
        query.policyToDate = { $gte: startOfDay, $lte: endOfDay };
      }
    }

    if (year && month) {
      // month is 1-12
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      query.policyFromDate = { $gte: startDate, $lte: endDate };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 12, 0, 23, 59, 59);
      query.policyFromDate = { $gte: startDate, $lte: endDate };
    } else if (month) {
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, parseInt(month) - 1, 1);
      const endDate = new Date(currentYear, parseInt(month), 0, 23, 59, 59);
      query.policyFromDate = { $gte: startDate, $lte: endDate };
    }

    const pipeline = [
      { $match: query },
      { $sort: { policyToDate: -1, createdAt: -1 } },
      {
        $group: {
          _id: { $toLower: "$registrationNo" },
          latestDoc: { $first: "$$ROOT" }
        }
      },
      { $replaceRoot: { newRoot: "$latestDoc" } },
      { $sort: { registrationDate: -1, policyFromDate: -1, createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: (page - 1) * limit },
            { $limit: parseInt(limit) }
          ],
          totalCount: [
            { $count: "count" }
          ]
        }
      }
    ];

    console.log("Fleet Insurance query:", JSON.stringify(query));

    const result = await FleetInsuranceSopModel.aggregate(pipeline);
    const data = result[0].data;
    const total = result[0].totalCount[0] ? result[0].totalCount[0].count : 0;

    res.status(200).json({ data, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error("Error fetching Fleet Insurance SOP records:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET filter options (distinct values for owner, size, modelType)
router.get("/fleet-insurance-sop/filters/options", authMiddleware, async (req, res) => {
  try {
    const owners = await FleetInsuranceSopModel.distinct("owner");
    const sizes = await FleetInsuranceSopModel.distinct("size");
    const models = await FleetInsuranceSopModel.distinct("modelType");
    
    res.status(200).json({
      owners: owners.filter(Boolean),
      sizes: sizes.filter(Boolean),
      models: models.filter(Boolean)
    });
  } catch (error) {
    console.error("Error fetching filter options:", error);
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

// GET historical record by Registration No (most recent one)
router.get("/fleet-insurance-sop/history/:registrationNo", authMiddleware, async (req, res) => {
  try {
    const { registrationNo } = req.params;
    if (!registrationNo) {
      return res.status(400).json({ message: "Registration number required" });
    }

    const records = await FleetInsuranceSopModel.find({
      registrationNo: new RegExp(`^${registrationNo}$`, "i")
    }).sort({ policyFromDate: -1, createdAt: -1 });

    if (!records || records.length === 0) {
      return res.status(404).json({ message: "No history found for this vehicle" });
    }

    res.status(200).json(records);
  } catch (error) {
    console.error("Error fetching vehicle history:", error);
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

// ─── Shared Excel Helpers ───

const formatDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  return `${date.getDate().toString().padStart(2, "0")}.${(date.getMonth() + 1).toString().padStart(2, "0")}.${date.getFullYear()}`;
};

const policyPortalHeaders = [
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

const fDataNewHeaders = [
  "Sr No",
  "Renewal Date",
  "REGISTRATION NUMBER",
  "Policy No.",
  "Period of Insurance(From)",
  "Period of Insurance(To)",
  "ENGINE NUMBER",
  "CHASSIS NUMBER",
  "MAKE/MODEL",
  "CUBIC CAPACITY/KW/GVW",
  "MFG. YEAR / REGISTRATION DATE",
  "VEHICLE IDV",
  "ELECTRICAL ACCESSORIES IDV",
  "CNG KIT IDV",
  "TOTAL IDV (VALUE)",
  "OD PREMIUM",
  "IMT23",
  "IMT24",
  "IMT25",
  "No Claim Bonus",
  "TOTAL OD PREMIUM",
  "IMT17",
  "IMT252",
  "IMT28",
  "IMT29",
  "LIABILITY PREMIUM",
  "TOTAL GST",
  "TOTAL POLICY PREMIUM",
  "REMARKS"
];

function policyPortalRow(doc) {
  return [
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
}

function fDataNewRow(doc) {
  return [
    doc.srNo || "",
    formatDate(doc.renewalDate),
    doc.registrationNo || "",
    doc.policyNo || "",
    formatDate(doc.policyFromDate),
    formatDate(doc.policyToDate),
    doc.engineNumber || "",
    doc.chassisNumber || "",
    doc.makeModel || "",
    doc.cubicCapacityKw || (doc.gvw ? String(doc.gvw) : ""),
    doc.mfgYear || formatDate(doc.registrationDate),
    doc.idv || 0,
    doc.electricalAccessoriesIdv || 0,
    doc.cngKitIdv || 0,
    doc.totalIdv || ((doc.idv || 0) + (doc.electricalAccessoriesIdv || 0) + (doc.cngKitIdv || 0)),
    doc.odPremium || 0,
    doc.imt23 || 0,
    doc.imt24 || 0,
    doc.imt25 || 0,
    doc.ncbPercentage || 0,
    doc.totalOdPremium || 0,
    doc.imt17 || 0,
    doc.imt252 || 0,
    doc.imt28 || 0,
    doc.imt29 || 0,
    doc.liabilityPremium || 0,
    doc.totalGst || 0,
    doc.totalPolicyPremium || doc.premiumAmount || 0,
    doc.remarks || ""
  ];
}

// EXPORT to Excel (single record — both sheets)
router.get("/fleet-insurance-sop/:id/export", authMiddleware, async (req, res) => {
  try {
    const doc = await FleetInsuranceSopModel.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: "Record not found" });

    const wb = XLSX.utils.book_new();

    // Sheet 1: Policy Portal format
    const ws1 = XLSX.utils.aoa_to_sheet([policyPortalHeaders, policyPortalRow(doc)]);
    XLSX.utils.book_append_sheet(wb, ws1, "Policy Portal");

    // Sheet 2: F Data-NEW format
    const ws2 = XLSX.utils.aoa_to_sheet([fDataNewHeaders, fDataNewRow(doc)]);
    XLSX.utils.book_append_sheet(wb, ws2, "F Data-NEW");

    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", `attachment; filename=Fleet_Insurance_${doc.registrationNo || "Doc"}.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(excelBuffer);
  } catch (error) {
    console.error("Error exporting to excel:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// BULK EXPORT to Excel (both sheets)
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
      query.policyFromDate = { $gte: startDate, $lte: endDate };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 12, 0, 23, 59, 59);
      query.policyFromDate = { $gte: startDate, $lte: endDate };
    } else if (month) {
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, parseInt(month) - 1, 1);
      const endDate = new Date(currentYear, parseInt(month), 0, 23, 59, 59);
      query.policyFromDate = { $gte: startDate, $lte: endDate };
    }

    const docs = await FleetInsuranceSopModel.find(query).sort({ createdAt: -1 }).lean();

    const wb = XLSX.utils.book_new();

    // Sheet 1: Policy Portal
    const aoaPP = [policyPortalHeaders];
    docs.forEach(doc => aoaPP.push(policyPortalRow(doc)));
    const ws1 = XLSX.utils.aoa_to_sheet(aoaPP);
    XLSX.utils.book_append_sheet(wb, ws1, "Policy Portal");

    // Sheet 2: F Data-NEW
    const aoaFD = [fDataNewHeaders];
    docs.forEach(doc => aoaFD.push(fDataNewRow(doc)));
    const ws2 = XLSX.utils.aoa_to_sheet(aoaFD);
    XLSX.utils.book_append_sheet(wb, ws2, "F Data-NEW");

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

// EXPORT template (both sheets)
router.get("/fleet-insurance-sop/template/download", authMiddleware, async (req, res) => {
  try {
    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.aoa_to_sheet([policyPortalHeaders]);
    XLSX.utils.book_append_sheet(wb, ws1, "Policy Portal");

    const ws2 = XLSX.utils.aoa_to_sheet([fDataNewHeaders]);
    XLSX.utils.book_append_sheet(wb, ws2, "F Data-NEW");

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

