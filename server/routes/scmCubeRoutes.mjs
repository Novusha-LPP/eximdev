import express from "express";
import JobModel from "../model/jobModel.mjs";
import authApiKey from "../middleware/authApiKey.mjs";
import CountryModel from "../model/countryModel.mjs";
import CustomHouseModel from "../model/customHouseModel.mjs";
import PortModel from "../model/portModel.mjs";

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

    // --- Validation Helpers ---
    const getVal = (val) => (val === undefined || val === null ? "" : String(val).trim());

    // C - Char/String: Truncate to length, ensures mandatory check
    const validateChar = (val, length, mandatory = false, fieldName = "") => {
      let s = getVal(val);
      if (mandatory && !s) {
        throw new Error(`Mandatory field '${fieldName}' is missing`);
      }
      return s.substring(0, length);
    };

    // N - Number: Ensures it's a number and fits length/precision
    const validateNum = (val, length, decimals = 0, mandatory = false, fieldName = "") => {
      const s = getVal(val).replace(/[^0-9.]/g, "");
      if (!s) {
        if (mandatory) {
          throw new Error(`Mandatory field '${fieldName}' is missing`);
        }
        return null;
      }
      let num = parseFloat(s);
      if (isNaN(num)) {
        if (mandatory) {
          throw new Error(`Mandatory field '${fieldName}' is missing`);
        }
        return null;
      }
      
      if (decimals > 0) {
        return Number(num.toFixed(decimals));
      }
      return Math.floor(num);
    };

    // Date: Formats date objects or ensures existence
    const validateDate = (val, mandatory = false, fieldName = "") => {
      const s = getVal(val);
      if (!s) {
        if (mandatory) {
          throw new Error(`Mandatory field '${fieldName}' is missing`);
        }
        return null;
      }
      const date = new Date(s);
      if (isNaN(date.getTime())) {
        if (mandatory) {
          throw new Error(`Mandatory field '${fieldName}' is missing`);
        }
        return null;
      }
      return date;
    };

    // --- State Code Helper ---
    const getStateCode = (gstNo) => {
      const s = getVal(gstNo);
      if (s.length >= 2 && /^\d{2}/.test(s)) {
        return s.substring(0, 2);
      }
      return "";
    };

    // Lookup Custom House Code
    let resolvedCustomHouseCode = getVal(job.custom_house);
    if (resolvedCustomHouseCode) {
      const chDoc = await CustomHouseModel.findOne({ 
        $or: [
          { name: new RegExp(`^${resolvedCustomHouseCode}$`, 'i') },
          { code: new RegExp(`^${resolvedCustomHouseCode}$`, 'i') }
        ]
      }).lean();
      if (chDoc) {
        resolvedCustomHouseCode = chDoc.code;
      }
    }

    // Lookup Port of Origin Code
    let resolvedPortOfOriginCode = getVal(job.loading_port || job.port_of_loading);
    if (resolvedPortOfOriginCode) {
      // Handle the case where the value might be in the format "(CODE) Name" from MasterLists
      const match = resolvedPortOfOriginCode.match(/\((.*?)\)\s*(.*)/);
      const searchVal = match ? match[1].trim() : resolvedPortOfOriginCode;

      const portDoc = await PortModel.findOne({ 
        $or: [
          { port_name: new RegExp(`^${searchVal}$`, 'i') },
          { port_code: new RegExp(`^${searchVal}$`, 'i') }
        ]
      }).lean();
      if (portDoc) {
        resolvedPortOfOriginCode = portDoc.port_code;
      } else if (match) {
        // Fallback to the code extracted from the parentheses if no DB match
        resolvedPortOfOriginCode = match[1].trim();
      }
    }

    // Map fields according to user request
    const responseData = {
      CHADetails: [
        {
          "CHA Code": validateChar("", 5, true, "CHA Code"),
          "CHA Branch Code": validateChar("", 6, true, "CHA Branch Code"),
          "Financial Year": (() => {
            const fy = job.financial_year || job.year;
            if (typeof fy === 'string' && /^\d{2}-\d{2}$/.test(fy)) {
              const [start, end] = fy.split("-");
              const sNum = parseInt(start, 10);
              const eNum = parseInt(end, 10);
              const startFull = `20${start}`;
              const endFull = eNum < sNum ? `21${end}` : `20${end}`;
              return validateChar(`${startFull}-${endFull}`, 9, true, "Financial Year");
            }
            return validateChar(fy, 9, true, "Financial Year");
          })(),
          "SenderID": validateChar("SURAJAHD", 15, true, "SenderID")
        }
      ],
      BE_Details: [
        {
          "Custom House Code": validateChar(resolvedCustomHouseCode, 6, true, "Custom House Code"),
          "Running SequenceNo": validateNum(job.sequence_number, 6, 0, true, "Running SequenceNo"),
          "RNoPrifix": validateChar("", 6, false, "RNoPrifix"),
          "RNoSufix": validateChar("", 6, false, "RNoSufix"),
          "User Job No.": validateNum(job.job_no, 15, 0, false, "User Job No."),
          "User Job Date": validateDate(job.job_date, false, "User Job Date"),
          "BE Type": (() => {
            let beType = "";
            if (job.type_of_b_e === "Home") beType = "H";
            else if (job.type_of_b_e === "In-Bond") beType = "W";
            else if (job.type_of_b_e === "Ex-Bond") beType = "X";
            return validateChar(beType, 4, true, "BE Type");
          })(),
          "IEC Code": validateNum(job.ie_code_no, 10, 0, true, "IEC Code"),
          "Branch Sr. No": validateNum(job.branchSrNo, 3, 0, true, "Branch Sr. No"),
          "Name of the importer": validateChar(job.importer, 50, false, "Name of the importer"),
          "Address 1": validateChar(job.importer_address, 35, false, "Address 1"),
          "Address 2": validateChar("", 35, false, "Address 2"),
          "City": validateChar("", 35, false, "City"),
          "State": validateChar("", 25, false, "State"),
          "Pin": validateChar("", 6, false, "Pin"),
          "State Code": validateChar(getStateCode(job.gst_no), 2, true, "State Code"),
          "Commercial Tax Type": validateChar(job.gst_no ? "G" : "", 1, true, "Commercial Tax Type"),
          "Commercial Tax RegistrationNo": validateChar(job.gst_no, 20, true, "Commercial Tax RegistrationNo"),
          "Class": validateChar("N", 1, true, "Class"),
          "Mode of Transport": (() => {
            let mode = "";
            if (job.branch_code === "AMD" && job.mode === "SEA") mode = "L";
            else if (job.branch_code === "GIM" && job.mode === "SEA") mode = "S";
            else if (job.mode === "AIR") mode = "A";
            return validateChar(mode, 1, true, "Mode of Transport");
          })(),
          "ImporterType": validateChar("P", 1, true, "ImporterType"),
          "Kachcha BE": validateChar("N", 1, true, "Kachcha BE"),
          "High sea sale flag": (() => {
            const hssVal = getVal(job.hss).toUpperCase();
            return validateChar(hssVal === "YES" ? "Y" : "N", 1, true, "High sea sale flag");
          })(),
          "Port of Origin": validateChar(resolvedPortOfOriginCode, 6, true, "Port of Origin"),
          "CHA Code": validateChar("", 15, true, "CHA Code"),
          "Country of Origin": validateChar(countryCode, 2, true, "Country of Origin"),
          "Country of Consignment": validateChar(countryCode, 2, true, "Country of Consignment"),
          "Port Of Shipment": validateChar(resolvedPortOfOriginCode, 6, true, "Port Of Shipment"),
          "Green Channel Requested": validateChar("N", 1, true, "Green Channel Requested"),
          "Section 48 Requested": validateChar("N", 1, true, "Section 48 Requested"),
          "Whether Prior BE": validateChar(job.be_filing_type === "Prior" ? "Y" : "N", 1, true, "Whether Prior BE"),
          "Authorized Dealer Code": validateChar(job.adCode, 10, true, "Authorized Dealer Code"),
          "First Check Requested": validateChar(getVal(job.firstCheck).toUpperCase() === "YES" ? "Y" : "N", 1, true, "First Check Requested"),
          "Warehouse Code": validateChar("", 8, false, "Warehouse Code"),
          "Warehouse Customs Site ID": validateNum("", 6, 0, false, "Warehouse Customs Site ID"),
          "Ware house BE No": validateChar(job.in_bond_be_no, 7, false, "Ware house BE No"),
          "Ware house BE Date": validateDate(job.in_bond_be_date, false, "Ware house BE Date"),
          "No of packages released": validateNum(job.no_of_pkgs, 8, 0, false, "No of packages released"),
          "Package Code": validateChar(job.unit, 3, false, "Package Code"),
          "Gross Weight": validateNum(job.gross_weight, 12, 3, false, "Gross Weight"),
          "Unit of Measurement": validateChar(job.unit, 3, false, "Unit of Measurement"),
          "Payment method code": (() => {
            let pm = "";
            if (job.payment_method === "Transaction") pm = "T";
            else if (job.payment_method === "Deferred") pm = "D";
            return validateChar(pm, 1, true, "Payment method code");
          })()
        }
      ],
      IGMS: [
        {
          "IGM No.": validateNum(job.igm_no, 7, 0, true, "IGM No."),
          "IGM Date": validateDate(job.igm_date, true, "IGM Date"),
          "Inward Date": validateDate(job.vessel_berthing || job.discharge_date, true, "Inward Date"),
          "Gateway IGM Number": validateNum(job.gateway_igm, 7, 0, false, "Gateway IGM Number"),
          "Gateway IGM date": validateDate(job.gateway_igm_date, false, "Gateway IGM date"),
          "Gateway Port Code": validateChar(job.branch_code === "GIM" ? "INMUN1" : "", 6, false, "Gateway Port Code"),
          "MAWB.BL No": validateChar(job.awb_bl_no, 20, true, "MAWB.BL No"),
          "MAWB.BL Date": validateDate(job.awb_bl_date, true, "MAWB.BL Date"),
          "HAWB.HBL No": validateChar(job.hawb_hbl_no, 20, false, "HAWB.HBL No"),
          "HAWB.HBL Date": validateDate(job.hawb_hbl_date, false, "HAWB.HBL Date"),
          "Total No. Of Packages": validateNum(job.no_of_pkgs, 8, 0, true, "Total No. Of Packages"),
          "Gross Weight": validateNum(job.gross_weight, 9, 3, true, "Gross Weight"),
          "Unit Quantity Code": validateChar(job.unit, 3, true, "Unit Quantity Code"),
          "Package Code": validateChar(job.unit, 3, true, "Package Code"),
          "Marks And Numbers 1": validateChar(job.description, 40, true, "Marks And Numbers 1"),
          "Marks And Numbers 2": validateChar("", 40, false, "Marks And Numbers 2"),
          "Marks And Numbers 3": validateChar("", 40, false, "Marks And Numbers 3")
        }
      ],
      CONTAINER: (job.container_nos || []).map(container => ({
        "IGM Number": validateNum(job.igm_no, 7, 0, true, "IGM Number"),
        "IGM Date": validateDate(job.igm_date, true, "IGM Date"),
        "LCL.FCL": (() => {
          const type = getVal(job.consignment_type).toUpperCase();
          let code = "";
          if (type === "LCL") code = "L";
          else if (type === "FCL") code = "F";
          return validateChar(code, 1, true, "LCL.FCL");
        })(),
        "Container Number": validateChar(container.container_number, 11, true, "Container Number"),
        "Seal Number": validateChar(container.seal_no, 10, true, "Seal Number"),
        "Truck Number": validateChar(container.vehicle_no, 15, false, "Truck Number")
      })),
      SupportingDocumentList: [
        ...(job.documents || []).map(doc => ({
          "Document Code": validateChar(doc.document_code, 8, false, "Document Code"),
          "Document Name": validateChar(doc.document_name, 50, true, "Document Name"),
          "Document Public File Path": validateChar(Array.isArray(doc.url) ? doc.url[0] : doc.url, 200, true, "Document Public File Path"),
          "Document File Format": validateChar("PDF", 10, true, "Document File Format")
        })),
        ...(job.cth_documents || []).map(doc => ({
          "Document Code": validateChar(doc.document_code, 8, false, "Document Code"),
          "Document Name": validateChar(doc.document_name, 50, true, "Document Name"),
          "Document Public File Path": validateChar(Array.isArray(doc.url) ? doc.url[0] : doc.url, 200, true, "Document Public File Path"),
          "Document File Format": validateChar("PDF", 10, true, "Document File Format")
        }))
      ]
    };

    // If CONTAINER or SupportingDocumentList are empty, provide a template with empty/default values meeting mandatory requirements
    if (responseData.CONTAINER.length === 0) {
      responseData.CONTAINER.push({
        "IGM Number": validateNum("", 7, 0, true),
        "IGM Date": validateDate("", true),
        "LCL.FCL": validateChar("", 1, true),
        "Container Number": validateChar("", 11, true),
        "Seal Number": validateChar("", 10, true),
        "Truck Number": validateChar("", 15, false)
      });
    }

    if (responseData.SupportingDocumentList.length === 0) {
      responseData.SupportingDocumentList.push({
        "Document Code": validateChar("", 8, false),
        "Document Name": validateChar("", 50, true),
        "Document Public File Path": validateChar("", 200, true),
        "Document File Format": validateChar("PDF", 10, true)
      });
    }

    res.status(200).json(responseData);
  } catch (error) {
    if (error.message.startsWith("Mandatory field")) {
      return res.status(400).send({ error: error.message });
    }
    console.error("scmCube API Error:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

export default router;
