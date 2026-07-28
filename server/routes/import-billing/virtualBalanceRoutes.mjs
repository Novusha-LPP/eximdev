import express from "express";
import JobModel from "../../model/jobModel.mjs";
import VirtualBalanceModel from "../../model/virtualBalanceModel.mjs";
import PurchaseBookEntryModel from "../../model/purchaseBookEntryModel.mjs";
import CfsModel from "../../model/cfsModel.mjs";

const router = express.Router();

// Helper function to escape regex characters
function escapeRegex(string) {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&");
}

// Helper to extract individual job tokens from single or comma-separated job strings
function extractJobTokens(str) {
  if (!str) return [];
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

// Helper to test if two job strings (e.g., "00236" and "GIM/IMP/SEA/00236/26-27") match the same job
function jobTokensMatch(jobStr1, jobStr2) {
  if (!jobStr1 || !jobStr2) return false;
  const s1 = jobStr1.trim().toUpperCase();
  const s2 = jobStr2.trim().toUpperCase();
  if (s1 === s2) return true;

  // Direct substring matching
  if (s1.includes(s2) || s2.includes(s1)) return true;

  // Structured job format comparison (BRANCH/TRADE/MODE/SEQ/YEAR)
  const parts1 = s1.split("/");
  const parts2 = s2.split("/");

  if (parts1.length >= 4 && parts2.length >= 4) {
    const branch1 = parts1[0];
    const seq1 = parts1[3].replace(/^0+/, "");
    const branch2 = parts2[0];
    const seq2 = parts2[3].replace(/^0+/, "");
    return branch1 === branch2 && seq1 === seq2;
  }

  // Fallback: compare numeric sequence numbers
  const getSeq = (s) => {
    const match = s.match(/(?:^|\/|-)(\d{3,5})(?:\/|-|$)/);
    if (match) return match[1].replace(/^0+/, "");
    const numOnly = s.match(/\d+/);
    return numOnly ? numOnly[0].replace(/^0+/, "") : null;
  };

  const seq1 = getSeq(s1);
  const seq2 = getSeq(s2);
  return Boolean(seq1 && seq2 && seq1 === seq2);
}

// Helper to check if a Purchase Book entry matches a Virtual Balance job specification
function isPbForVirtualBalanceEntry(entryJobNo, pbJobNo) {
  if (!entryJobNo || !pbJobNo) return false;
  const entryJobs = extractJobTokens(entryJobNo);
  return entryJobs.some((ej) => jobTokensMatch(ej, pbJobNo));
}

// Helper to look up importer name
async function getImporterName(jobNo) {
  if (!jobNo) return "";
  const trimmed = jobNo.trim();
  const seqMatch = trimmed.match(/(?:^|\/|-)(\d{3,5})(?:\/|-|$)/) || trimmed.match(/\d+/);
  const conditions = [
    { job_no: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, "i") } },
    { job_number: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, "i") } },
  ];
  if (seqMatch) {
    const seqNum = parseInt(seqMatch[1] || seqMatch[0], 10);
    const flexRegex = new RegExp(`(?:^|/|-)0*${seqNum}(?:/|-|$)`, "i");
    conditions.push({ job_no: { $regex: flexRegex } });
    conditions.push({ job_number: { $regex: flexRegex } });
  }

  const job = await JobModel.findOne({ $or: conditions })
    .select("importer importer_name name")
    .lean();
  if (!job) return "";
  return job.importer || job.importer_name || job.name || "";
}

// GET /api/virtual-balance - Fetch list of virtual balances with running balances
router.get("/api/virtual-balance", async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "", status = "", startDate = "", endDate = "" } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    // 1. Fetch all virtual balances in chronological order
    const allBalances = await VirtualBalanceModel.find().sort({ createdAt: 1 }).lean();

    // 2. Build flexible purchase book query for all jobs across all virtual balances
    const jobTokens = [];
    allBalances.forEach((b) => {
      if (b.jobNo) {
        b.jobNo.split(",").forEach((t) => {
          const trimmed = t.trim();
          if (trimmed) jobTokens.push(trimmed);
        });
      }
    });

    let pbQuery = {};
    if (jobTokens.length > 0) {
      const orConditions = [];
      jobTokens.forEach((jt) => {
        const escaped = escapeRegex(jt);
        orConditions.push({ jobNo: { $regex: new RegExp(escaped, "i") } });
        orConditions.push({ entryNo: { $regex: new RegExp(escaped, "i") } });
        const seqMatch = jt.match(/(?:^|\/|-)(\d{3,5})(?:\/|-|$)/) || jt.match(/\d+/);
        if (seqMatch) {
          const seqNum = parseInt(seqMatch[1] || seqMatch[0], 10);
          const flexRegex = new RegExp(`(?:^|/|-)0*${seqNum}(?:/|-|$)`, "i");
          orConditions.push({ jobNo: { $regex: flexRegex } });
          orConditions.push({ entryNo: { $regex: flexRegex } });
        }
      });
      pbQuery = { $or: orConditions };
    }

    const purchaseBooks = await PurchaseBookEntryModel.find(pbQuery).lean();

    // 3. Fetch all CFS directory opening balances
    const cfsList = await CfsModel.find().lean();
    const cfsOpeningMap = {};
    cfsList.forEach((c) => {
      if (c.name) {
        cfsOpeningMap[c.name.trim().toUpperCase()] = c.openingBalance || 0;
      }
    });

    // 4. Calculate running balances chronologically
    const cfsRunningMap = {};
    const calculatedEntries = allBalances.map((entry) => {
      const cfsKey = entry.cfsName.trim().toUpperCase();
      const initialBalance = cfsOpeningMap[cfsKey] || 0;
      const openingBalance = cfsRunningMap[cfsKey] !== undefined ? cfsRunningMap[cfsKey] : initialBalance;
      const amountPaid = entry.amountPaid || 0;
      const availableBalance = openingBalance + amountPaid;

      // Get purchase books filed for this job and CFS
      let spentAmount = 0;
      if (entry.jobNo) {
        const matchingPbs = purchaseBooks.filter((pb) => {
          const targetTerminal = (pb.virtualBalanceTerminal || pb.supplierName || "").trim().toUpperCase();
          if (targetTerminal !== cfsKey) return false;
          return isPbForVirtualBalanceEntry(entry.jobNo, pb.jobNo || pb.entryNo);
        });

        spentAmount = matchingPbs.reduce((sum, pb) => sum + ((pb.total || 0) - (pb.tds || 0)), 0);
      }

      const remainingBalance = availableBalance - spentAmount;

      // Update running balance for next entry of this CFS
      cfsRunningMap[cfsKey] = remainingBalance;

      return {
        ...entry,
        openingBalance,
        availableBalance,
        spentAmount,
        remainingBalance,
      };
    });

    // 5. Apply filters and search in memory
    let filtered = [...calculatedEntries];

    if (status) {
      const matchStatus = status.toLowerCase();
      filtered = filtered.filter((e) => e.status && e.status.toLowerCase() === matchStatus);
    }

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter((e) => new Date(e.createdAt) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((e) => new Date(e.createdAt) <= end);
    }

    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      filtered = filtered.filter((e) => {
        return (
          (e.referenceNo && e.referenceNo.toLowerCase().includes(term)) ||
          (e.jobNo && e.jobNo.toLowerCase().includes(term)) ||
          (e.cfsName && e.cfsName.toLowerCase().includes(term)) ||
          (e.partyName && e.partyName.toLowerCase().includes(term)) ||
          (e.utr && e.utr.toLowerCase().includes(term)) ||
          (e.remarks && e.remarks.toLowerCase().includes(term))
        );
      });
    }

    // 6. Sort by newest first for listing
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 7. Paginate the filtered list
    const total = filtered.length;
    const paginatedEntries = filtered.slice(skip, skip + limitNum);

    res.status(200).json({
      success: true,
      data: {
        entries: paginatedEntries,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error("Error fetching virtual balances:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// POST /api/virtual-balance - Create a new virtual balance entry
router.post("/api/virtual-balance", async (req, res) => {
  try {
    const { cfsName, jobNo, amountPaid, utr, fromBank, remarks, status = "unpaid", fileUrl } = req.body;

    if (!cfsName || amountPaid === undefined) {
      return res.status(400).json({ success: false, message: "CFS Name and Amount Paid are required." });
    }

    // Use partyName from request body if provided (client sends formatted string for multi-job)
    const partyName = req.body.partyName !== undefined
      ? req.body.partyName
      : (jobNo ? await getImporterName(jobNo) : "");

    // Sequence generation: VB/IMP/YYYY/XXXX
    const year = new Date().getFullYear();
    const count = await VirtualBalanceModel.countDocuments({
      referenceNo: new RegExp(`^VB/IMP/${year}/`, "i"),
    });

    let nextSeq = count + 1;
    let referenceNo = `VB/IMP/${year}/${String(nextSeq).padStart(4, "0")}`;

    // Ensure uniqueness
    let exists = await VirtualBalanceModel.findOne({ referenceNo });
    while (exists) {
      nextSeq += 1;
      referenceNo = `VB/IMP/${year}/${String(nextSeq).padStart(4, "0")}`;
      exists = await VirtualBalanceModel.findOne({ referenceNo });
    }

    const paymentDate = status.toLowerCase() === "paid" ? new Date() : null;

    const newEntry = new VirtualBalanceModel({
      referenceNo,
      cfsName,
      jobNo: jobNo || "",
      partyName,
      amountPaid,
      utr,
      fromBank,
      remarks,
      status: status.toLowerCase(),
      paymentDate,
      fileUrl,
    });

    await newEntry.save();

    res.status(201).json({ success: true, message: "Virtual Balance entry created successfully", data: newEntry });
  } catch (error) {
    console.error("Error creating virtual balance:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// PUT /api/virtual-balance/:id - Update an existing virtual balance entry
router.put("/api/virtual-balance/:id", async (req, res) => {
  try {
    const { cfsName, jobNo, amountPaid, utr, fromBank, remarks, status, fileUrl } = req.body;
    const entryId = req.params.id;

    const entry = await VirtualBalanceModel.findById(entryId);
    if (!entry) {
      return res.status(404).json({ success: false, message: "Entry not found" });
    }

    if (cfsName) entry.cfsName = cfsName;

    if (jobNo !== undefined) {
      entry.jobNo = (jobNo || "").trim();
      // Use partyName from request body if provided (client now sends formatted string)
      if (req.body.partyName !== undefined) {
        entry.partyName = req.body.partyName;
      }
    }

    if (amountPaid !== undefined) entry.amountPaid = amountPaid;
    if (utr !== undefined) entry.utr = utr;
    if (fromBank !== undefined) entry.fromBank = fromBank;
    if (remarks !== undefined) entry.remarks = remarks;
    if (fileUrl !== undefined) entry.fileUrl = fileUrl;

    if (status && status.toLowerCase() !== entry.status) {
      const prevStatus = entry.status;
      entry.status = status.toLowerCase();
      if (entry.status === "paid" && prevStatus !== "paid") {
        entry.paymentDate = new Date();
      } else if (entry.status === "unpaid") {
        entry.paymentDate = null;
      }
    }

    await entry.save();

    res.status(200).json({ success: true, message: "Virtual Balance updated successfully", data: entry });
  } catch (error) {
    console.error("Error updating virtual balance:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// DELETE /api/virtual-balance/:id - Delete a virtual balance entry
router.delete("/api/virtual-balance/:id", async (req, res) => {
  try {
    const deleted = await VirtualBalanceModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Entry not found" });
    }
    res.status(200).json({ success: true, message: "Entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting virtual balance:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET /api/virtual-balance/job-details/:jobNo - Auto-populate partyName and branch/mode details for a jobNo
router.get("/api/virtual-balance/job-details/:jobNo", async (req, res) => {
  try {
    const jobNo = req.params.jobNo ? req.params.jobNo.trim() : "";
    if (!jobNo) {
      return res.status(200).json({ success: true, partyName: "", branchCode: "", customHouse: "", mode: "", jobNo: "" });
    }

    const seqMatch = jobNo.match(/(?:^|\/|-)(\d{3,5})(?:\/|-|$)/) || jobNo.match(/\d+/);
    const conditions = [
      { job_no: { $regex: new RegExp(`^${escapeRegex(jobNo)}$`, "i") } },
      { job_number: { $regex: new RegExp(`^${escapeRegex(jobNo)}$`, "i") } },
    ];
    if (seqMatch) {
      const seqNum = parseInt(seqMatch[1] || seqMatch[0], 10);
      const flexRegex = new RegExp(`(?:^|/|-)0*${seqNum}(?:/|-|$)`, "i");
      conditions.push({ job_no: { $regex: flexRegex } });
      conditions.push({ job_number: { $regex: flexRegex } });
    }

    const job = await JobModel.findOne({ $or: conditions })
      .select("job_no job_number importer importer_name name branch_code custom_house mode")
      .lean();

    if (!job) {
      return res.status(200).json({ success: true, partyName: "", branchCode: "", customHouse: "", mode: "", jobNo: jobNo });
    }

    res.status(200).json({
      success: true,
      jobNo: job.job_number || job.job_no || jobNo,
      partyName: job.importer || job.importer_name || job.name || "",
      branchCode: job.branch_code || "",
      customHouse: job.custom_house || "",
      mode: job.mode || "",
    });
  } catch (error) {
    console.error("Error fetching job details:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET /api/virtual-balance/job-purchase-books - Compare with purchase books
router.get("/api/virtual-balance/job-purchase-books", async (req, res) => {
  try {
    const { jobNo, cfsName } = req.query;

    if (!jobNo || !cfsName) {
      return res.status(400).json({ success: false, message: "Job No and CFS Name are required." });
    }

    const jobTokens = extractJobTokens(jobNo);
    const orConditions = [];

    jobTokens.forEach((jt) => {
      const escaped = escapeRegex(jt);
      orConditions.push({ jobNo: { $regex: new RegExp(escaped, "i") } });
      orConditions.push({ entryNo: { $regex: new RegExp(escaped, "i") } });
      const seqMatch = jt.match(/(?:^|\/|-)(\d{3,5})(?:\/|-|$)/) || jt.match(/\d+/);
      if (seqMatch) {
        const seqNum = parseInt(seqMatch[1] || seqMatch[0], 10);
        const flexRegex = new RegExp(`(?:^|/|-)0*${seqNum}(?:/|-|$)`, "i");
        orConditions.push({ jobNo: { $regex: flexRegex } });
        orConditions.push({ entryNo: { $regex: flexRegex } });
      }
    });

    const cfsRegex = new RegExp(`^${escapeRegex(cfsName.trim())}$`, "i");

    const purchaseBooks = await PurchaseBookEntryModel.find({
      $and: [
        { $or: orConditions.length > 0 ? orConditions : [{ jobNo: jobNo.trim() }] },
        {
          $or: [
            { virtualBalanceTerminal: { $regex: cfsRegex } },
            {
              $and: [
                { $or: [{ virtualBalanceTerminal: { $exists: false } }, { virtualBalanceTerminal: "" }, { virtualBalanceTerminal: null }] },
                { supplierName: { $regex: cfsRegex } }
              ]
            }
          ]
        }
      ]
    }).lean();

    res.status(200).json({ success: true, data: purchaseBooks });
  } catch (error) {
    console.error("Error fetching comparison purchase books:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET /api/virtual-balance/jobs - Return all import jobs as {jobNo, partyName, branchCode, customHouse, mode} for autocomplete
router.get("/api/virtual-balance/jobs", async (req, res) => {
  try {
    const { search = "" } = req.query;
    const trimmed = search.trim();
    let query = {};
    if (trimmed) {
      const regex = new RegExp(escapeRegex(trimmed), "i");
      query = {
        $or: [
          { job_no: regex },
          { job_number: regex },
          { branch_code: regex },
          { custom_house: regex },
          { mode: regex },
          { importer: regex },
          { importer_name: regex },
          { name: regex },
        ],
      };
    }
    const jobs = await JobModel.find(query)
      .select("job_no job_number importer importer_name name branch_code custom_house mode trade_type year")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const data = jobs.map((j) => ({
      jobNo: j.job_number || j.job_no || "",
      jobSeq: j.job_no || "",
      partyName: j.importer || j.importer_name || j.name || "",
      branchCode: j.branch_code || "",
      customHouse: j.custom_house || "",
      mode: j.mode || "",
    }));
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching jobs list:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;

