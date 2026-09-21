import express from "express";
import mongoose from "mongoose";
import XLSX from "xlsx";
import FleetInsuranceSopModel from "../../model/accounts/fleetInsuranceSop.mjs";
import UserModel from "../../model/userModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import { context } from "../../utils/context.mjs";

const router = express.Router();

const normalizeReg = (s) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const formatRegNo = (val) => {
  if (!val) return "";
  const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = clean.match(/^([A-Z]{2})(\d{2})([A-Z]{1,2})(\d{4})$/);
  if (m) {
    return `${m[1]}-${m[2]}-${m[3]}-${m[4]}`;
  }
  return val.trim();
};

const buildVehicleSearchRegex = (term) => {
  if (!term || typeof term !== "string") return null;
  const trimmed = term.trim();
  if (!trimmed) return null;
  const alphanumeric = trimmed.replace(/[^a-zA-Z0-9]/g, "");
  if (alphanumeric.length >= 2) {
    const pattern = alphanumeric.split("").join("[- ]*");
    return new RegExp(pattern, "i");
  }
  return new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
};

export async function syncVehiclesToFleetInsurance() {
  try {
    const db = mongoose.connection.db;
    if (!db) return;
    const vehCol = db.collection("vehicleregistrations");
    const countVeh = await vehCol.countDocuments();
    if (countVeh === 0) return;

    const vehicles = await vehCol.find().toArray();
    const existingFleet = await FleetInsuranceSopModel.find().select("registrationNo srNo").lean();
    const existingNormSet = new Set(existingFleet.map((f) => normalizeReg(f.registrationNo)));

    let maxSrNo = existingFleet.reduce((max, f) => Math.max(max, f.srNo || 0), 0);
    const toInsert = [];

    for (const v of vehicles) {
      const norm = normalizeReg(v.vehicleNumber);
      if (!existingNormSet.has(norm)) {
        maxSrNo++;
        const formatted = formatRegNo(v.vehicleNumber);
        toInsert.push({
          srNo: maxSrNo,
          registrationNo: formatted,
          owner: v.registrationName || "S R CONTAINER CARRIERS",
          engineNumber: v.engineNumber || "",
          chassisNumber: v.chassisNumber || "",
          policyToDate: v.insuranceDate ? new Date(v.insuranceDate) : null,
          renewalDate: v.insuranceDate ? new Date(v.insuranceDate) : null,
          modelType: "TRAILER",
          size: v.loadCapacity?.value ? `${v.loadCapacity.value} KG` : "20 FT",
          financialApprovalStatus: "Pending",
          renewalStatus: "Pending",
          quotations: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        existingNormSet.add(norm);
      }
    }

    if (toInsert.length > 0) {
      await FleetInsuranceSopModel.insertMany(toInsert);
      console.log(`[FleetInsuranceSop] Auto-synced ${toInsert.length} new vehicles from Vehicle Directory.`);
    }
  } catch (err) {
    console.error("[FleetInsuranceSop] Error syncing vehicles to fleet insurance:", err);
  }
}


// Helper to generate next PR Number format: INS/{seq}/{MONTH}/{FY_CODE}
async function getNextPrNumber(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  const m = d.getMonth();
  const monthShort = d.toLocaleString("en-US", { month: "short" }).toUpperCase();

  let startYear, endYear;
  if (m >= 3) {
    // April (3) to Dec (11)
    startYear = d.getFullYear();
    endYear = d.getFullYear() + 1;
  } else {
    // Jan (0) to Mar (2)
    startYear = d.getFullYear() - 1;
    endYear = d.getFullYear();
  }
  const fyCode = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;

  const regex = new RegExp(`^INS/(\\d+)/${monthShort}/${fyCode}$`, "i");
  const records = await FleetInsuranceSopModel.find({ prNumber: { $regex: regex } }).select("prNumber").lean();

  let maxSeq = 0;
  records.forEach((rec) => {
    if (rec.prNumber) {
      const match = rec.prNumber.match(new RegExp(`^INS/(\\d+)/${monthShort}/${fyCode}$`, "i"));
      if (match && match[1]) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(2, "0");
  return `INS/${nextSeq}/${monthShort}/${fyCode}`;
}

// Endpoint to fetch next PR number
router.get("/fleet-insurance-sop/next-pr-number", authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const prNumber = await getNextPrNumber(date);
    res.status(200).json({ prNumber, prDate: date || new Date().toISOString().split("T")[0] });
  } catch (error) {
    console.error("Error generating next PR number:", error);
    res.status(500).json({ message: "Error generating PR number" });
  }
});

// Helper to generate next PO Number format: PO/INS/{seq}/{MONTH}/{FY_CODE}
async function getNextPoNumber(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  const monthShort = d.toLocaleString("en-US", { month: "short" }).toUpperCase();

  let startYear, endYear;
  if (d.getMonth() >= 3) {
    startYear = d.getFullYear();
    endYear = d.getFullYear() + 1;
  } else {
    startYear = d.getFullYear() - 1;
    endYear = d.getFullYear();
  }
  const fyCode = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;

  const regex = new RegExp(`^PO/INS/(\\d+)/${monthShort}/${fyCode}$`, "i");
  const records = await FleetInsuranceSopModel.find({ poNumber: { $regex: regex } }).select("poNumber").lean();

  let maxSeq = 0;
  records.forEach((rec) => {
    if (rec.poNumber) {
      const match = rec.poNumber.match(new RegExp(`^PO/INS/(\\d+)/${monthShort}/${fyCode}$`, "i"));
      if (match && match[1]) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(2, "0");
  return `PO/INS/${nextSeq}/${monthShort}/${fyCode}`;
}

// Endpoint to fetch next PO number
router.get("/fleet-insurance-sop/next-po-number", authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const poNumber = await getNextPoNumber(date);
    res.status(200).json({ poNumber });
  } catch (error) {
    console.error("Error generating next PO number:", error);
    res.status(500).json({ message: "Error generating PO number" });
  }
});

// GET records requiring approval (only those with a generated PR number pending approval)
router.get("/fleet-insurance-sop/approvals/list", authMiddleware, async (req, res) => {
  try {
    const records = await FleetInsuranceSopModel.find({
      prNumber: { $exists: true, $ne: "" },
      financialApprovalStatus: { $nin: ["Approved", "Rejected"] }
    }).sort({ updatedAt: -1, createdAt: -1 }).lean();

    res.status(200).json({ data: records, total: records.length });
  } catch (error) {
    console.error("Error fetching approval records:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET records in Payment & UTR stage (Approved by Finance with active PR awaiting UTR)
router.get("/fleet-insurance-sop/payment-utr/list", authMiddleware, async (req, res) => {
  try {
    const records = await FleetInsuranceSopModel.find({
      prNumber: { $exists: true, $ne: "" },
      financialApprovalStatus: "Approved",
      renewed: { $ne: "YES" },
      renewalStatus: { $ne: "Renewed" },
      $or: [{ paymentUtr: { $exists: false } }, { paymentUtr: null }, { paymentUtr: "" }]
    }).sort({ updatedAt: -1, createdAt: -1 }).lean();

    res.status(200).json({ data: records, total: records.length });
  } catch (error) {
    console.error("Error fetching payment UTR records:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Endpoint to explicitly trigger sync from Vehicle Directory
router.post("/fleet-insurance-sop/sync-from-vehicles", authMiddleware, async (req, res) => {
  try {
    await syncVehiclesToFleetInsurance();
    const count = await FleetInsuranceSopModel.countDocuments();
    res.status(200).json({ success: true, message: "Vehicles synced successfully", total: count });
  } catch (err) {
    console.error("Error in sync-from-vehicles endpoint:", err);
    res.status(500).json({ message: "Failed to sync vehicles", error: err.message });
  }
});

// GET all records with pagination and search
router.get("/fleet-insurance-sop", authMiddleware, async (req, res) => {
  try {
    // Ensure any new vehicles from directory are automatically synced
    await syncVehiclesToFleetInsurance();

    const { page = 1, limit = 10, search = "", month = "", year = "", regNo, owner, size, modelType, premiumAmount, premiumQuote, expiryDate, renewed, tat } = req.query;
    const query = {};
    if (tat !== undefined && tat !== "") {
      query.tat = Number(tat);
    }
    const hasSearch = Boolean(search && search.trim()) || Boolean(regNo && regNo.trim());

    if (search && search.trim()) {
      const regRegex = buildVehicleSearchRegex(search);
      const textRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { registrationNo: regRegex || textRegex },
        { owner: textRegex },
        { insuranceCompany: textRegex },
        { policyNo: textRegex },
        { makeModel: textRegex },
        { engineNumber: regRegex || textRegex },
        { chassisNumber: regRegex || textRegex },
      ];
    }
    
    if (regNo && regNo.trim()) query.registrationNo = buildVehicleSearchRegex(regNo);
    if (owner) query.owner = owner;
    if (size) query.size = size;
    if (modelType) query.modelType = modelType;
    if (premiumAmount) query.premiumAmount = Number(premiumAmount);
    if (premiumQuote) query.premiumQuote = Number(premiumQuote);
    if (renewed) {
      if (renewed.toUpperCase() === "YES") {
        query.$or = [{ renewed: { $regex: "^yes$", $options: "i" } }, { renewalStatus: "Renewed" }];
      } else if (renewed.toUpperCase() === "NO") {
        query.$or = [
          { renewed: { $regex: "^no$", $options: "i" } },
          { renewed: null },
          { renewed: "" }
        ];
      }
    }
    if (expiryDate) {
      const date = new Date(expiryDate);
      if (!isNaN(date.getTime())) {
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));
        query.policyToDate = { $gte: startOfDay, $lte: endOfDay };
      }
    }

    // Build pipeline with effective dates computation
    const pipeline = [
      { $match: query },
      {
        $addFields: {
          effectiveFromDate: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$newPolicyFromDate", null] },
                  { $ne: ["$newPolicyFromDate", ""] },
                  { $gt: ["$newPolicyFromDate", new Date("1970-01-01")] }
                ]
              },
              then: "$newPolicyFromDate",
              else: "$policyFromDate"
            }
          },
          effectiveExpiryDate: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$newPolicyToDate", null] },
                  { $ne: ["$newPolicyToDate", ""] },
                  { $gt: ["$newPolicyToDate", new Date("1970-01-01")] }
                ]
              },
              then: "$newPolicyToDate",
              else: "$policyToDate"
            }
          }
        }
      },
    ];

    // Apply date filter only if user is NOT searching for a specific vehicle
    if (!hasSearch) {
      if (year && month) {
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
        pipeline.push({
          $match: {
            $or: [
              { policyToDate: { $gte: startDate, $lte: endDate } },
              { newPolicyToDate: { $gte: startDate, $lte: endDate } },
              { newExpiryDate: { $gte: startDate, $lte: endDate } },
              { renewalDate: { $gte: startDate, $lte: endDate } },
              { paymentDate: { $gte: startDate, $lte: endDate } },
              { renewedDate: { $gte: startDate, $lte: endDate } }
            ]
          }
        });
      } else if (year) {
        const startDate = new Date(parseInt(year), 0, 1);
        const endDate = new Date(parseInt(year), 12, 0, 23, 59, 59, 999);
        pipeline.push({
          $match: {
            $or: [
              { policyToDate: { $gte: startDate, $lte: endDate } },
              { newPolicyToDate: { $gte: startDate, $lte: endDate } },
              { newExpiryDate: { $gte: startDate, $lte: endDate } },
              { renewalDate: { $gte: startDate, $lte: endDate } },
              { paymentDate: { $gte: startDate, $lte: endDate } },
              { renewedDate: { $gte: startDate, $lte: endDate } }
            ]
          }
        });
      } else if (month) {
        const mVal = parseInt(month);
        pipeline.push({
          $match: {
            $expr: {
              $or: [
                { $eq: [{ $month: "$policyToDate" }, mVal] },
                { $eq: [{ $month: "$newPolicyToDate" }, mVal] },
                { $eq: [{ $month: "$newExpiryDate" }, mVal] },
                { $eq: [{ $month: "$renewalDate" }, mVal] },
                { $eq: [{ $month: "$paymentDate" }, mVal] },
                { $eq: [{ $month: "$renewedDate" }, mVal] }
              ]
            }
          }
        });
      }
    }


    // Continue with grouping (sorting by effectiveFromDate DESC & effectiveExpiryDate DESC so newest active/renewed policy is picked per vehicle)
    pipeline.push(
      { $sort: { effectiveFromDate: -1, effectiveExpiryDate: -1, updatedAt: -1, createdAt: -1 } },
      {
        $group: {
          _id: { $toLower: "$registrationNo" },
          latestDoc: { $first: "$$ROOT" }
        }
      },
      { $replaceRoot: { newRoot: "$latestDoc" } },
      { $sort: { registrationDate: -1, effectiveFromDate: -1, createdAt: -1 } },
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
    );

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
    const registrationNumbers = await FleetInsuranceSopModel.distinct("registrationNo");
    
    res.status(200).json({
      owners: owners.filter(Boolean),
      sizes: sizes.filter(Boolean),
      models: models.filter(Boolean),
      registrationNumbers: registrationNumbers.filter(Boolean)
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

    const regRegex = buildVehicleSearchRegex(registrationNo);
    const rawRecords = await FleetInsuranceSopModel.find({
      registrationNo: regRegex || new RegExp(`^${registrationNo}$`, "i")
    }).sort({ policyFromDate: -1, createdAt: -1 }).lean();

    if (!rawRecords || rawRecords.length === 0) {
      return res.status(404).json({ message: "No history found for this vehicle" });
    }

    // Deduplicate records for the same policy year / expiry period
    const deduplicatedMap = new Map();
    rawRecords.forEach((rec) => {
      const expDate = rec.newPolicyToDate || rec.policyToDate;
      const yr = expDate ? new Date(expDate).getFullYear() : (rec.policyFromDate ? new Date(rec.policyFromDate).getFullYear() : "unknown");
      const key = `${yr}_${(rec.policyNo || rec.newPolicyNo || "").trim().toUpperCase()}`;

      if (!deduplicatedMap.has(key)) {
        deduplicatedMap.set(key, rec);
      } else {
        const existing = deduplicatedMap.get(key);
        const existingScore = (existing.paymentUtr ? 4 : 0) + (existing.financialApprovalStatus === "Approved" ? 2 : 0) + (existing.prNumber ? 1 : 0);
        const currentScore = (rec.paymentUtr ? 4 : 0) + (rec.financialApprovalStatus === "Approved" ? 2 : 0) + (rec.prNumber ? 1 : 0);
        if (currentScore > existingScore) {
          deduplicatedMap.set(key, rec);
        }
      }
    });

    const records = Array.from(deduplicatedMap.values()).sort((a, b) => {
      const dateA = new Date(a.policyFromDate || a.createdAt || 0);
      const dateB = new Date(b.policyFromDate || b.createdAt || 0);
      return dateB - dateA;
    });

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
    const role = (req.user?.role || "").toLowerCase();
    if (role !== "admin" && role !== "superadmin") {
      return res.status(403).json({ message: "Only admin users can delete records" });
    }
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
  "HYDRAULIC JACK COVER",
  "MODERATION AMOUNT (TIPPER)",
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
    doc.hydraulicJackCover || doc.hydrolicJackCover || 0,
    doc.moderationAmount || doc.moderationAmountTipper || 0,
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

    const buildDateQuery = (startDate, endDate) => {
      return {
        $or: [
          { newPolicyToDate: { $gte: startDate, $lte: endDate } },
          { policyToDate: { $gte: startDate, $lte: endDate } },
          { renewalDate: { $gte: startDate, $lte: endDate } },
          { paymentDate: { $gte: startDate, $lte: endDate } },
          { renewedDate: { $gte: startDate, $lte: endDate } }
        ]
      };
    };

    if (year && month) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      Object.assign(query, buildDateQuery(startDate, endDate));
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 12, 0, 23, 59, 59, 999);
      Object.assign(query, buildDateQuery(startDate, endDate));
    } else if (month) {
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, parseInt(month) - 1, 1);
      const endDate = new Date(currentYear, parseInt(month), 0, 23, 59, 59, 999);
      Object.assign(query, buildDateQuery(startDate, endDate));
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

// DELETE record by ID
router.delete("/fleet-insurance-sop/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRecord = await FleetInsuranceSopModel.findByIdAndDelete(id);
    if (!deletedRecord) {
      return res.status(404).json({ message: "Record not found" });
    }
    res.status(200).json({ message: "Record deleted successfully", data: deletedRecord });
  } catch (error) {
    console.error("Error deleting Fleet Insurance record:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ─── GET & ASSIGN FLEET INSURANCE TAB PERMISSIONS ───
router.get("/fleet-insurance-sop/user-tabs/:username", authMiddleware, async (req, res) => {
  try {
    const { username } = req.params;
    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.status(200).json({
      success: true,
      allowed_tabs: user.fleet_insurance_tabs || [],
    });
  } catch (error) {
    console.error("Error fetching user fleet insurance tabs:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.post("/fleet-insurance-sop/assign-user-tabs", authMiddleware, async (req, res) => {
  try {
    const { username, allowed_tabs } = req.body;
    const user = await UserModel.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    user.fleet_insurance_tabs = allowed_tabs || [];
    await user.save();
    res.status(200).json({
      success: true,
      message: "Fleet insurance tab permissions updated successfully",
      allowed_tabs: user.fleet_insurance_tabs,
    });
  } catch (error) {
    console.error("Error assigning fleet insurance tabs:", error);
    res.status(500).json({ success: false, error: "Failed to assign tab permissions" });
  }
});

export default router;

