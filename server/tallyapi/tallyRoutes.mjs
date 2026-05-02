import express from "express";
import JobModel from "../model/jobModel.mjs";
import authApiKey from "../middleware/authApiKey.mjs";
import PurchaseBookEntryModel from "../model/purchaseBookEntryModel.mjs";
import PaymentRequestModel from "../model/paymentRequestModel.mjs";

const router = express.Router();

router.get("/test", (req, res) => res.json({ status: "Tally API is connected and working!" }));

/**
 * Internal helper to retrieve and format job data for Tally
 */
const getJobDetailsInternal = async (job_number) => {
  if (!job_number) return null;

  const job = await JobModel.findOne({ job_number }).lean();
  if (!job) return null;

  return {
    "Job Number": job.job_number,
    "Job Year": job.year,
    "Job Type": job.type || `${job.trade_type || ""} ${job.mode || ""}`.trim(),
    "Job Date": job.job_date,
    "ImporterExporter Name": job.importer || job.exporter || job.supplier_exporter,
    "Shipper Name": job.shipper || job.supplier_exporter,
    "Consignee": job.consignee,
    "Shipper": job.shipper,
    "Origin Port": job.loading_port || job.port_of_loading,
    "Destination Port": job.port_of_discharge || job.destination_port,
    "Custom House": job.custom_house,
    "Gross Weight": job.gross_weight,
    "Net Weight": job.net_weight, // Legacy
    "Net Wt.": job.job_net_weight || job.net_weight,
    "Package Count": job.no_of_pkgs, // Legacy
    "Packages": job.no_of_pkgs,
    "Package Unit": job.unit,
    "Container Count": (() => {
      if (job.mode === "AIR") return "";
      const containers = job.container_nos || [];
      if (containers.length === 0) return "0";
      const counts = {};
      containers.forEach(c => {
        const size = c.size || "20"; // Default to 20 if size missing
        counts[size] = (counts[size] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([size, count]) => `${count} X ${size}`)
        .join(", ");
    })(),
    "Containers": job.mode === "AIR" ? "" : (job.container_nos || []).map(c => c.container_number).filter(Boolean).join(", "),
    "BE No": job.be_no || "",
    "BE Date": job.be_date || "",
    "BE Type": job.type_of_b_e,
    "BE Heading": job.description,
    "SB No": job.sb_no || "",
    "SB Date": job.sb_date || "",
    "MBL NO": job.awb_bl_no,
    "MBL Date": job.awb_bl_date,
    "HBL No": job.hawb_hbl_no,
    "HBL Date": job.hawb_hbl_date,
    "Consignment Type": job.consignment_type,
    "Vessel": job.vessel_flight,
    "Voyage": job.voyage_no,
    "Customer Ref.": job.po_no,
    "Invoice Number": job.invoice_number,
    "Inv Date": job.invoice_date,
    "Terms of Invoice": job.toi,
    "Invoice Value": job.total_inv_value,
    "CIF Value": job.cifValue || job.cif_amount,
    "Assess Value": job.assbl_value,
    "Total Duty": job.total_duty,
    "Branch": job.branch_code,
    "Status": ""
  };
};

/**
 * @api {get} /api/tally/job-data Retrieve job data for Tally integration
 * @apiHeader {String} x-api-key API Key for external authentication
 * @apiParam {String} job_number Job Number (unique/structured)
 */
router.get("/job-data", authApiKey, async (req, res) => {
  try {
    const { job_number } = req.query;

    if (!job_number) {
      return res.status(400).send({ error: "job_number is a required query parameter" });
    }

    const responseData = await getJobDetailsInternal(job_number);

    if (!responseData) {
      return res.status(404).send({ error: "Job not found for the provided job_number" });
    }

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Tally API Error:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

/**
 * @api {get} /api/tally/next-sequence Retrieve the next sequence number for a job
 */
router.get("/next-sequence", authApiKey, async (req, res) => {
  try {
    const { type, jobNo, year, jobId } = req.query;
    if (!type || !jobNo) {
      return res.status(400).json({ error: "type (purchase/payment) and jobNo are required query parameters" });
    }

    // Standardize jobNo: Use structured job_number (canonical reference) if possible
    let canonicalJobNo = jobNo;
    if (jobId) {
      const job = await JobModel.findById(jobId).select('job_number').lean();
      if (job && job.job_number) canonicalJobNo = job.job_number;
    } else if (!jobNo.includes('/')) {
      const query = { job_no: jobNo };
      if (year) query.year = year;
      const job = await JobModel.findOne(query).select('job_number').lean();
      if (job && job.job_number) canonicalJobNo = job.job_number;
    }

    let maxIndex = 0;
    let prefix = "";
    if (type === "purchase") {
      const existing = await PurchaseBookEntryModel.find({
        $or: [
          { jobNo: canonicalJobNo }, 
          { jobNo: jobNo },
          { entryNo: { $regex: canonicalJobNo } }
        ]
      }, { entryNo: 1 }).lean();

      existing.forEach(entry => {
        const parts = (entry.entryNo || "").split('/');
        const match = (parts[0] || "").match(/\d+/);
        if (match) {
          const idx = parseInt(match[0], 10);
          if (idx > maxIndex) maxIndex = idx;
        }
      });
      prefix = "PB";
    } else if (type === "payment") {
      const existing = await PaymentRequestModel.find({
        $or: [
          { jobNo: canonicalJobNo }, 
          { jobNo: jobNo },
          { requestNo: { $regex: canonicalJobNo } }
        ]
      }, { requestNo: 1 }).lean();

      existing.forEach(reqObj => {
        const parts = (reqObj.requestNo || "").split('/');
        const match = (parts[0] || "").match(/\d+/);
        if (match) {
          const idx = parseInt(match[0], 10);
          if (idx > maxIndex) maxIndex = idx;
        }
      });
      prefix = "R";
    } else {
      return res.status(400).json({ error: "Invalid type. Must be 'purchase' or 'payment'" });
    }

    const nextIndex = (maxIndex + 1).toString().padStart(2, '0');
    let fullNo = `${prefix}${nextIndex}/${canonicalJobNo}`;

    // If purchase entry, try to reformat to PB01/BRANCH/MODE/YEAR/SERIAL if canonicalJobNo matches standard format
    if (type === "purchase" && canonicalJobNo.includes('/')) {
      const parts = canonicalJobNo.split('/');
      if (parts.length === 5) {
        // Format: BRANCH_CODE (0) / TRADE_TYPE (1) / MODE (2) / SEQUENCE (3) / FINANCIAL_YEAR (4)
        // Requested: PB01 / BRANCH (0) / TRADE (1) / MODE (2) / SEQUENCE (3) / YEAR (4)
        fullNo = `${prefix}${nextIndex}/${parts[0]}/${parts[1]}/${parts[2]}/${parts[3]}/${parts[4]}`;
      }
    }

    res.status(200).json({
      success: true,
      nextIndex,
      fullNo,
      jobNo: canonicalJobNo
    });

  } catch (error) {
    console.error("Next Sequence Error:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// --- PURCHASE BOOK ENTRY ROUTES ---

/**
 * Helper to map readable keys to PurchaseBookEntryModel fields
 */
const mapPurchaseEntryData = (data) => {
  return {
    entryNo: data["Entry No"] || data.entryNo,
    entryDate: data["Entry Date"] || data.entryDate,
    supplierInvNo: data["Supplier Inv No"] || data.supplierInvNo,
    supplierInvDate: data["Supplier Inv Date"] || data.supplierInvDate,
    jobNo: data["Job No"] || data.jobNo,
    supplierName: data["Supplier Name"] || data.supplierName,
    address1: data["Address 1"] || data.address1,
    address2: data["Address 2"] || data.address2,
    address3: data["Address 3"] || data.address3,
    state: data["State"] || data.state,
    country: data["Country"] || data.country,
    pinCode: data["Pin Code"] || data.pinCode,
    registrationType: data["Registration Type"] || data.registrationType,
    gstinNo: data["GSTIN No"] || data.gstinNo,
    pan: data["PAN"] || data.pan,
    cin: data["CIN"] || data.cin,
    placeOfSupply: data["Place of Supply"] || data.placeOfSupply,
    creditTerms: data["Credit Terms"] || data.creditTerms,
    descriptionOfServices: data["Description of Services"] || data.descriptionOfServices,
    chargeHeading: data["Charge Heading"] || data.chargeHeading,
    sac: data["SAC"] || data.sac,
    taxableValue: data["Taxable Value"] || data.taxableValue,
    gstPercent: data["GST%"] || data.gstPercent,
    cgstAmt: data["CGST"] || data.cgstAmt,
    sgstAmt: data["SGST"] || data.sgstAmt,
    igstAmt: data["IGST"] || data.igstAmt,
    tds: data["TDS"] || data.tds,
    total: data["Total"] || data.total,
    chargeRef: data.chargeRef,
    jobRef: data.jobRef,
    chargeDescription: data["Charge Description"] || data.chargeDescription || '',
    chargeHeadCategory: data["Charge Head Category"] || data.chargeHeadCategory || '',
    tdsCategory: data["TDS Category"] || data.tdsCategory || '94C',
    status: data["Status"] || data.status || ''
  };
};

/**
 * @api {post} /api/tally/purchase-entry Submit Purchase Book Entry for Tally (supports readable keys)
 */
router.post("/purchase-entry", authApiKey, async (req, res) => {
  try {
    const rawData = req.body;
    const data = mapPurchaseEntryData(rawData);

    // Standardize jobNo to canonicalJobNo if possible before saving
    if (data.jobRef) {
      const job = await JobModel.findById(data.jobRef).select('job_number').lean();
      if (job && job.job_number) {
        data.jobNo = job.job_number;
      }
    }

    let entry;
    let attempts = 0;
    while (attempts < 5) {
      try {
        console.log("Saving Purchase Entry (Attempt " + (attempts + 1) + "):", data.entryNo);
        entry = await PurchaseBookEntryModel.create(data);
        break; 
      } catch (err) {
        if (err.code === 11000) {
          console.warn("Duplicate Entry No detected, auto-incrementing:", data.entryNo);
          const parts = data.entryNo.split('/');
          const prefixPart = parts[0]; // e.g., PB01
          const match = prefixPart.match(/\d+/);
          if (match) {
            const currentIdx = parseInt(match[0], 10);
            const nextIdx = (currentIdx + 1).toString().padStart(2, '0');
            const prefix = prefixPart.replace(/\d+/, nextIdx);
            parts[0] = prefix;
            data.entryNo = parts.join('/');
            attempts++;
          } else {
            throw err; // Cannot auto-increment
          }
        } else {
          throw err;
        }
      }
    }

    if (!entry) throw new Error("Failed to generate a unique Entry No after multiple attempts.");

    if (data.jobRef && data.chargeRef) {
      await JobModel.updateOne(
        { _id: data.jobRef, "charges._id": data.chargeRef },
        {
          $set: {
            "charges.$.purchase_book_no": entry.entryNo,
            "charges.$.purchase_book_status": "Pending"
          }
        }
      );
    }

    res.status(201).json({
      success: true,
      message: "Purchase Book Entry saved and submitted successfully",
      id: entry._id,
      "Entry No": entry.entryNo
    });
  } catch (error) {
    console.error("Tally Purchase Entry Storage Error:", error);
    res.status(500).send({ error: "Internal Server Error", details: error.message });
  }
});


/**
 * @api {get} /api/tally/purchase-entry Retrieve Purchase Book Entry (supports query params)
 */
router.get("/purchase-entry", authApiKey, async (req, res) => {
  try {
    const entryNo = req.query.entry_no || req.query.entryNo;

    if (!entryNo) {
      return res.status(400).json({ error: "entry_no is a required query parameter" });
    }

    console.log("Fetching Purchase Entry:", entryNo);

    const entry = await PurchaseBookEntryModel.findOne({ entryNo }).lean();
    if (!entry) return res.status(404).json({ error: "Purchase Book Entry not found." });

    // Fallback for Charge Head Category if missing
    let chargeCategory = entry.chargeHeadCategory;
    if (!chargeCategory && entry.jobRef && entry.chargeRef) {
      try {
        const job = await JobModel.findOne(
          { _id: entry.jobRef, "charges._id": entry.chargeRef },
          { "charges.$": 1 }
        ).lean();
        if (job && job.charges && job.charges[0]) {
          chargeCategory = job.charges[0].category;
        }
      } catch (err) {
        console.error("Error fetching fallback category for purchase entry:", err);
      }
    }

    const formattedData = {
      "Entry No": entry.entryNo,
      "Entry Date": entry.entryDate,
      "Supplier Inv No": entry.supplierInvNo,
      "Supplier Inv Date": entry.supplierInvDate,
      "Job No": entry.jobNo,
      "Supplier Name": entry.supplierName,
      "Address 1": entry.address1,
      "Address 2": entry.address2,
      "Address 3": entry.address3,
      "State": entry.state,
      "Country": entry.country,
      "Pin Code": entry.pinCode,
      "Registration Type": entry.registrationType,
      "GSTIN No": entry.gstinNo,
      "PAN": entry.pan,
      "CIN": entry.cin,
      "Place of Supply": entry.placeOfSupply,
      "Credit Terms": entry.creditTerms,
      "Description of Services": entry.descriptionOfServices || "",
      "Charge Heading": entry.chargeHeading || "",
      "SAC": entry.sac,
      "Taxable Value": entry.taxableValue,
      "GST%": entry.gstPercent,
      "CGST": entry.cgstAmt,
      "SGST": entry.sgstAmt,
      "IGST": entry.igstAmt,
      "TDS": entry.tds,
      "Total": entry.total,
      "Charge Description": entry.chargeDescription || '',
      "Charge Head Category": chargeCategory || '',
      "TDS Category": entry.tdsCategory || '94C',
      "Status": entry.status
    };

    // Include Job Details
    const job_number = entry.jobNo || (entry.entryNo && entry.entryNo.includes('/') ? entry.entryNo.split('/').slice(1).join('/') : entry.entryNo);
    const jobDetails = await getJobDetailsInternal(job_number);
    if (jobDetails) {
      formattedData["Job Details"] = jobDetails;
    }

    res.status(200).json(formattedData);


  } catch (error) {
    console.error("Fetch Purchase Entry Error:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

/**
 * @api {post} /api/tally/purchase-entry/status Retrieve Status by Entry Number
 */
router.post("/purchase-entry/status", authApiKey, async (req, res) => {
  try {
    const entryNo = req.body["Entry No"] || req.body.entryNo;
    if (!entryNo) return res.status(400).json({ error: "Entry No is required" });
    const entry = await PurchaseBookEntryModel.findOne({ entryNo }, { status: 1 }).lean();
    if (!entry) return res.status(404).json({ error: "Entry not found" });
    res.status(200).json({ "Entry No": entryNo, "Status": entry.status });
  } catch (error) {

    console.error("Fetch Purchase Status Error:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

// --- PAYMENT REQUEST ROUTES ---

/**
 * Helper to map readable keys to PaymentRequestModel fields
 */
const mapPaymentRequestData = (data) => {
  return {
    requestNo: data["Request No"] || data.requestNo,
    requestDate: data["Request Date"] || data.requestDate,
    bankFrom: data["Bank From"] || data.bankFrom,
    paymentTo: data["Payment To"] || data.paymentTo,
    againstBill: data["Against Bill"] || data.againstBill,
    amount: data["Amount"] || data.amount,
    transactionType: data["Transaction Type"] || data.transactionType,
    accountNo: data["Account No"] || data.accountNo,
    ifscCode: data["IFSC Code"] || data.ifscCode,
    bankName: data["Bank Name"] || data.bankName,
    jobNo: data["Job No"] || data.jobNo,
    chargeRef: data.chargeRef,
    jobRef: data.jobRef,
    instrumentNo: data["Instrument No"] || data.instrumentNo,
    instrumentDate: data["Instrument Date"] || data.instrumentDate,
    importer: data["Importer"] || data.importer,
    transferMode: data["Transfer Mode"] || data.transferMode,
    requestedBy: data["Requested By"] || data.requestedBy,
    beneficiaryCode: data["Beneficiary Code"] || data.beneficiaryCode,
    chargeDescription: data["Charge Description"] || data.chargeDescription || '',
    chargeHeadCategory: data["Charge Head Category"] || data.chargeHeadCategory || '',
    tdsCategory: data["TDS Category"] || data.tdsCategory || '94C',
    chargeHeading: data["Charge Heading"] || data.chargeHeading || '',
    descriptionOfServices: data["Description of Services"] || data.descriptionOfServices || '',
    status: data["Status"] || data.status || ''
  };
};

/**
 * @api {post} /api/tally/payment-request Submit Payment Request for Tally (supports readable keys)
 */
router.post("/payment-request", authApiKey, async (req, res) => {
  try {
    const rawData = req.body;
    const data = mapPaymentRequestData(rawData);

    // Standardize jobNo to canonicalJobNo if possible before saving
    if (data.jobRef) {
      const job = await JobModel.findById(data.jobRef).select('job_number importer').lean();
      if (job) {
        if (job.job_number) data.jobNo = job.job_number;
        if (job.importer && !data.importer) data.importer = job.importer;
      }
    }

    let request;
    let attempts = 0;
    while (attempts < 5) {
      try {
        console.log("Saving Payment Request (Attempt " + (attempts + 1) + "):", data.requestNo);
        request = await PaymentRequestModel.create(data);
        break;
      } catch (err) {
        if (err.code === 11000) {
          console.warn("Duplicate Request No detected, auto-incrementing:", data.requestNo);
          const parts = data.requestNo.split('/');
          const prefixPart = parts[0]; // e.g., R01
          const match = prefixPart.match(/\d+/);
          if (match) {
            const currentIdx = parseInt(match[0], 10);
            const nextIdx = (currentIdx + 1).toString().padStart(2, '0');
            const prefix = prefixPart.replace(/\d+/, nextIdx);
            parts[0] = prefix;
            data.requestNo = parts.join('/');
            attempts++;
          } else {
            throw err; // Cannot auto-increment
          }
        } else {
          throw err;
        }
      }
    }

    if (!request) throw new Error("Failed to generate a unique Request No after multiple attempts.");

    if (data.jobRef && data.chargeRef) {
      await JobModel.updateOne(
        { _id: data.jobRef, "charges._id": data.chargeRef },
        {
          $set: {
            "charges.$.payment_request_no": request.requestNo,
            "charges.$.payment_request_status": "Pending",
            "charges.$.payment_request_requested_by": request.requestedBy,
            "charges.$.payment_request_transaction_type": request.transactionType
          }
        }
      );
    }

    res.status(201).json({
      success: true,
      message: "Payment Request saved and submitted successfully",
      id: request._id,
      "Request No": request.requestNo
    });
  } catch (error) {
    console.error("Tally Payment Request Storage Error:", error);
    res.status(500).send({ error: "Internal Server Error", details: error.message });
  }
});



/**
 * @api {get} /api/tally/payment-request Retrieve Payment Request (supports query params)
 */
router.get("/payment-request", authApiKey, async (req, res) => {
  try {
    const requestNo = req.query.request_no || req.query.requestNo;

    if (!requestNo) {
      return res.status(400).json({ error: "request_no is a required query parameter" });
    }

    const request = await PaymentRequestModel.findOne({ requestNo }).lean();
    if (!request) return res.status(404).json({ error: "Payment Request not found." });

    // Fallback for Charge Head Category if missing
    let chargeCategory = request.chargeHeadCategory;
    if (!chargeCategory && request.jobRef && request.chargeRef) {
      try {
        const job = await JobModel.findOne(
          { _id: request.jobRef, "charges._id": request.chargeRef },
          { "charges.$": 1 }
        ).lean();
        if (job && job.charges && job.charges[0]) {
          chargeCategory = job.charges[0].category;
        }
      } catch (err) {
        console.error("Error fetching fallback category for payment request:", err);
      }
    }

    const formattedData = {
      "Request No": request.requestNo,
      "Request Date": request.requestDate,
      "Bank From": request.bankFrom,
      "Payment To": request.paymentTo,
      "Against Bill": request.againstBill,
      "Amount": request.amount,
      "Transaction Type": request.transactionType,
      "Account No": request.accountNo,
      "IFSC Code": request.ifscCode,
      "Bank Name": request.bankName,
      "Instrument No": request.instrumentNo,
      "Instrument Date": request.instrumentDate,
      "Transfer Mode": request.transferMode,
      "Beneficiary Code": request.beneficiaryCode,
      "Charge Description": request.chargeDescription || '',
      "Charge Heading": request.chargeHeading || '',
      "Description of Services": request.descriptionOfServices || '',
      "Charge Head Category": chargeCategory || '',
      "TDS Category": request.tdsCategory || '94C',
      "Status": request.status
    };

    // Include Job Details
    const job_number = request.jobNo || (request.requestNo && request.requestNo.includes('/') ? request.requestNo.split('/').slice(1).join('/') : request.requestNo);
    const jobDetails = await getJobDetailsInternal(job_number);
    if (jobDetails) {
      formattedData["Job Details"] = jobDetails;
    }

    res.status(200).json(formattedData);

  } catch (error) {
    console.error("Fetch Payment Request Error:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

/**
 * @api {post} /api/tally/payment-request/status Retrieve Status by Request Number
 */
router.post("/payment-request/status", authApiKey, async (req, res) => {
  try {
    const requestNo = req.body["Request No"] || req.body.requestNo;
    if (!requestNo) return res.status(400).json({ error: "Request No is required" });
    const request = await PaymentRequestModel.findOne({ requestNo }, { status: 1 }).lean();
    if (!request) return res.status(404).json({ error: "Request not found" });
    res.status(200).json({ "Request No": requestNo, "Status": request.status });
  } catch (error) {

    console.error("Fetch Payment Status Error:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

export default router;
