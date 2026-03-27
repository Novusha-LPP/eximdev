import express from "express";
import JobModel from "../model/jobModel.mjs";
import authApiKey from "../middleware/authApiKey.mjs";
import CountryModel from "../model/countryModel.mjs";

const router = express.Router();

/**
 * @api {get} /api/scmCube/job-data Retrieve job data for scmCube integration
 * @apiHeader {String} x-api-key API Key for external authentication
 * @apiParam {String} job_number Job Number (unique/structured)
 */
router.get("/api/scmCube/job-data", authApiKey, async (req, res) => {
  try {
    const { job_number } = req.query;

    if (!job_number) {
      return res.status(400).send({ error: "job_number is a required query parameter" });
    }

    // Find the job by job_number
    const job = await JobModel.findOne({ job_number }).lean();

    if (!job) {
      return res.status(404).send({ error: "Job not found for the provided job_number" });
    }

    // Lookup country code
    const countryDoc = await CountryModel.findOne({ name: job.origin_country || "" }).lean();
    const countryCode = countryDoc ? countryDoc.code : "";

    // Helper function to return empty string if field is missing
    const getVal = (val) => (val === undefined || val === null ? "" : String(val));

    // Helper to clean numeric values (returns a Number or null)
    const cleanNum = (val, decimals = null) => {
      const s = getVal(val).trim();
      if (!s) return null; 
      const cleaned = s.replace(/[^0-9.]/g, "");
      const num = parseFloat(cleaned);
      if (isNaN(num)) return null;
      return decimals !== null ? Number(num.toFixed(decimals)) : num;
    };

    // Helper to format date strings - using native Date object (will be ISO string in JSON)
    const formatDate = (val) => {
      const s = getVal(val).trim();
      if (!s) return null;
      const date = new Date(s);
      return isNaN(date.getTime()) ? s : date;
    };

    // Map fields according to user request
    const responseData = {
      CHADetails: [
        {
          "CHA Code": "",
          "CHA Branch Code": "",
          "Financial Year": (() => {
            const fy = job.financial_year || job.year;
            if (typeof fy === 'string' && /^\d{2}-\d{2}$/.test(fy)) {
              const [start, end] = fy.split("-");
              const sNum = parseInt(start, 10);
              const eNum = parseInt(end, 10);
              // Handle century rollover (e.g., 99-00 -> 2099-2100)
              const startFull = `20${start}`;
              const endFull = eNum < sNum ? `21${end}` : `20${end}`;
              return `${startFull}-${endFull}`;
            }
            return getVal(fy);
          })(),
          "SenderID": "SURAJAHD"
        }
      ],
      BE_Details: [
        {
          "Custom House Code": getVal(job.custom_house),
          "Running SequenceNo": cleanNum(job.sequence_number),
          "RNoPrifix": "",
          "RNoSufix": "",
          "User Job No.": getVal(job.job_no),
          "User Job Date": formatDate(job.job_date),
          "BE Type": (() => {
            if (job.type_of_b_e === "Home") return "H";
            if (job.type_of_b_e === "In-Bond") return "W";
            if (job.type_of_b_e === "Ex-Bond") return "X";
            return "";
          })(),
          "IEC Code": getVal(job.ie_code_no),
          "Branch Sr. No": cleanNum(job.branchSrNo),
          "Name of the importer": getVal(job.importer),
          "Address 1": getVal(job.importer_address),
          "Address 2": "",
          "City": "",
          "State": "",
          "Pin": "",
          "State Code": "",
          "Commercial Tax Type": "",
          "Commercial Tax RegistrationNo.": getVal(job.gst_no),
          "Class": "N",
          "Mode of Transport": (() => {
            if (job.branch_code === "AMD" && job.mode === "SEA") return "L";
            if (job.branch_code === "GIM" && job.mode === "SEA") return "S";
            if (job.mode === "AIR") return "A";
            return "";
          })(),
          "ImporterType": "P",
          "Kachcha BE": "N",
          "High sea sale flag": (() => {
            const hssVal = getVal(job.hss).toUpperCase();
            if (hssVal === "YES") return "Y";
            if (hssVal === "NO") return "N";
            return "";
          })(),
          "Port of Origin": getVal(job.loading_port),
          "CHA Code": "",
          "Country of Origin": countryCode,
          "Country of Consignment": countryCode,
          "Port Of Shipment": getVal(job.loading_port),
          "Green Channel Requested": "",
          "Section 48 Requested": "",
          "Whether Prior BE": getVal(job.be_filing_type === "Prior" ? "Yes" : "No"),
          "Authorized Dealer Code": getVal(job.adCode),
          "First Check Requested": getVal(job.firstCheck),
          "Warehouse Code": "",
          "Warehouse Customs Site ID": "",
          "Ware house BE No": getVal(job.in_bond_be_no),
          "Ware house BE Date": formatDate(job.in_bond_be_date),
          "No of packages released": cleanNum(job.no_of_pkgs),
          "Package Code": getVal(job.unit),
          "Gross Weight": cleanNum(job.gross_weight, 3),
          "Unit of Measurement": getVal(job.unit),
          "Payment method code": (() => {
            if (job.payment_method === "Transaction") return "T";
            if (job.payment_method === "Deferred") return "D";
            return "";
          })()
        }
      ],
      IGMS: [
        {
          "IGM No.": getVal(job.igm_no),
          "IGM Date": formatDate(job.igm_date),
          "Inward Date": formatDate(job.vessel_berthing || job.discharge_date),
          "Gateway IGM Number": getVal(job.gateway_igm),
          "Gateway IGM date": formatDate(job.gateway_igm_date),
          "Gateway Port Code": job.branch_code === "GIM" ? "INMUN1" : "",
          "MAWB.BL No": getVal(job.awb_bl_no),
          "MAWB.BL Date": formatDate(job.awb_bl_date),
          "HAWB.HBL No": getVal(job.hawb_hbl_no),
          "HAWB.HBL Date": formatDate(job.hawb_hbl_date),
          "Total No. Of Packages": cleanNum(job.no_of_pkgs),
          "Gross Weight": cleanNum(job.gross_weight, 3),
          "Unit Quantity Code": getVal(job.unit),
          "Package Code": getVal(job.unit),
          "Marks And Numbers 1": getVal(job.description),
          "Marks And Numbers 2": "",
          "Marks And Numbers 3": ""
        }
      ],
      CONTAINER: (job.container_nos || []).map(container => ({
        "IGM Number": getVal(job.igm_no),
        "IGM Date": formatDate(job.igm_date),
        "LCL.FCL": (() => {
          const type = getVal(job.consignment_type).toUpperCase();
          if (type === "LCL") return "L";
          if (type === "FCL") return "F";
          return "";
        })(),
        "Container Number": getVal(container.container_number),
        "Seal Number": getVal(container.seal_no),
        "Truck Number": getVal(container.vehicle_no)
      })),
      SupportingDocumentList: [
        ...(job.documents || []).map(doc => ({
          "Document Code": getVal(doc.document_code),
          "Document Name": getVal(doc.document_name),
          "Document Public File Path": Array.isArray(doc.url) ? getVal(doc.url[0]) : getVal(doc.url),
          "Document File Format": ""
        })),
        ...(job.cth_documents || []).map(doc => ({
          "Document Code": getVal(doc.document_code),
          "Document Name": getVal(doc.document_name),
          "Document Public File Path": Array.isArray(doc.url) ? getVal(doc.url[0]) : getVal(doc.url),
          "Document File Format": "PDF"
        }))
      ]
    };

    // If CONTAINER or SupportingDocumentList are empty, provide a template with empty values
    if (responseData.CONTAINER.length === 0) {
      responseData.CONTAINER.push({
        "IGM Number": "",
        "IGM Date": null,
        "LCL.FCL": "",
        "Container Number": "",
        "Seal Number": "",
        "Truck Number": ""
      });
    }

    if (responseData.SupportingDocumentList.length === 0) {
      responseData.SupportingDocumentList.push({
        "Document Code": "",
        "Document Name": "",
        "Document Public File Path": "",
        "Document File Format": ""
      });
    }

    res.status(200).json(responseData);
  } catch (error) {
    console.error("scmCube API Error:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

export default router;
