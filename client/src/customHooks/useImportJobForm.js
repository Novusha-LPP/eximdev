import { useState, useEffect } from "react";
import { useFormik } from "formik";
import axios from "axios";
import {
  customHouseOptions,
  importerOptions,
  shippingLineOptions,
  cth_Dropdown,
} from "../components/MasterLists/MasterLists";
import { set } from "date-fns";
import { sanitizeContainerPayload } from "../utils/modeLogic";

const getFormattedDateForRates = (dateInput) => {
  if (!dateInput) dateInput = new Date();
  if (dateInput instanceof Date) {
    const day = String(dateInput.getDate()).padStart(2, '0');
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const year = dateInput.getFullYear();
    return `${day}-${month}-${year}`;
  }
  if (typeof dateInput === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [y, m, d] = dateInput.split('-');
      return `${d}-${m}-${y}`;
    }
    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(dateInput)) {
      return dateInput.replace(/\//g, '-');
    }
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}-${month}-${year}`;
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const exrateCache = {};

const fetchExrateForCurrency = async (currency, date) => {
  if (!currency || currency.toUpperCase() === "INR") return 1;
  const formattedDate = getFormattedDateForRates(date);
  const cacheKey = `${currency}_${formattedDate}`;
  
  if (exrateCache[cacheKey]) {
    return exrateCache[cacheKey];
  }

  if (!exrateCache[`promise_${cacheKey}`]) {
    exrateCache[`promise_${cacheKey}`] = (async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_STRING}/currency-rates/by-date/${formattedDate}`
        );
        if (response.data.success && response.data.data?.exchange_rates) {
          const rateObj = response.data.data.exchange_rates.find(
            r => r.currency_code.toUpperCase() === currency.toUpperCase()
          );
          if (rateObj) {
            return parseFloat(rateObj.import_rate) || 1;
          }
        }
      } catch (err) {
        console.error("Error fetching exchange rate:", err);
      }
      
      const currentDateFormatted = getFormattedDateForRates(new Date());
      if (formattedDate !== currentDateFormatted) {
        try {
          const response = await axios.get(
            `${process.env.REACT_APP_API_STRING}/currency-rates/by-date/${currentDateFormatted}`
          );
          if (response.data.success && response.data.data?.exchange_rates) {
            const rateObj = response.data.data.exchange_rates.find(
              r => r.currency_code.toUpperCase() === currency.toUpperCase()
            );
            if (rateObj) {
              return parseFloat(rateObj.import_rate) || 1;
            }
          }
        } catch (err) {
          console.error("Error fetching fallback exchange rate:", err);
        }
      }
      return 1;
    })();
  }
  
  const result = await exrateCache[`promise_${cacheKey}`];
  exrateCache[cacheKey] = result;
  return result;
};


const useImportJobForm = () => {
  // Get the current date
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // Months are zero-based

  // Extract the last two digits of the current year
  const currentTwoDigits = String(currentYear).slice(-2); // e.g., "24" for 2024

  // Calculate the next year's last two digits
  const nextTwoDigits = String((currentYear + 1) % 100).padStart(2, "0"); // e.g., "25" for 2025
  const prevTwoDigits = String((currentYear - 1) % 100).padStart(2, "0"); // e.g., "23" for 2023

  // Determine the financial year range
  let defaultYearPair;
  if (currentMonth >= 4) {
    // From April of the current year to March of the next year
    defaultYearPair = `${currentTwoDigits}-${nextTwoDigits}`;
  } else {
    // From January to March, previous financial year
    defaultYearPair = `${prevTwoDigits}-${currentTwoDigits}`;
  }

  // Initialize the state with the determined year pair
  const [year, setYear] = useState(defaultYearPair);
  const [job_date, setJob_date] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editJobId, setEditJobId] = useState(null);
  const [jobNumber, setJobNumber] = useState("");

  // Existing states:
  // const [job_no, setJobNo] = useState("");
  const [custom_house, setCustomHouse] = useState("");
  const [importer, setImporter] = useState("");
  const [importer_type, setImporterType] = useState("");
  const [commercial_tax_type, setCommercialTaxType] = useState("");
  const [importer_address, setImporterAddress] = useState("");
  const [importerURL, setImporterURL] = useState("");
  const [shipping_line_airline, setShippingLineAirline] = useState("");
  const [branchSrNo, setBranchSrNo] = useState("");
  const [adCode, setAdCode] = useState("");
  const [importer_address_details, setImporterAddressDetails] = useState("");
  const [importer_city, setImporterCity] = useState("");
  const [importer_state, setImporterState] = useState("");
  const [importer_postal_code, setImporterPostalCode] = useState("");
  const [importer_country, setImporterCountry] = useState("");
  const [supplier_exporter, setSupplierExporter] = useState("");
  const [awb_bl_no, setAwbBlNo] = useState("");
  const [awb_bl_date, setAwbBlDate] = useState("");
  const [hawb_hbl_date, setHawb_hbl_date] = useState("");
  const [hawb_hbl_no, setHawb_hbl_no] = useState("");
  const [vessel_flight, setVesselFlight] = useState("");
  const [voyage_no, setVoyageNo] = useState("");
  const [vessel_berthing, setVesselberthing] = useState("");
  const [type_of_b_e, setTypeOfBE] = useState("");
  const [loading_port, setLoadingPort] = useState("");
  const [gross_weight, setGrossWeight] = useState("");
  const [job_net_weight, setJob_net_weight] = useState("");
  const [cth_no, setCthNo] = useState("");
  const [origin_country, setOriginCountry] = useState("");
  const [port_of_reporting, setPortOfReporting] = useState("");
  const [total_inv_value, setTotalInvValue] = useState("");
  const [inv_currency, setInvCurrency] = useState("");
  const [invoice_number, setInvoiceNumber] = useState("");
  const [invoice_date, setInvoiceDate] = useState("");
  const [po_no, setPoNo] = useState("");
  const [po_date, setPoDate] = useState("");
  const [import_terms, setImportTerms] = useState("CIF");
  const [freight, setFreight] = useState("");
  const [insurance, setInsurance] = useState("");
  const [term_value, setTermValue] = useState("");
  const [cif_amount, setCifAmount] = useState("");
  const [exrate, setExrate] = useState("");
  const [description, setDescription] = useState("");
  const [consignment_type, setConsignmentType] = useState("");
  const [isDraftDoc, setIsDraftDoc] = useState(false);
  const [branch_id, setBranchId] = useState("");
  const [trade_type, setTradeType] = useState("IMP");
  const [mode, setMode] = useState("SEA");
  const [branches, setBranches] = useState([]);
  const [invoice_details, setInvoiceDetails] = useState([
    {
      invoice_number: "",
      invoice_date: "",
      po_no: "",
      po_date: "",
      po_details: [{ po_no: "", po_date: "" }],
      product_value: "",
      total_inv_value: "",
      inv_currency: "",
      exchange_rate: "",
      freight_exchange_rate: "",
      insurance_exchange_rate: "",
      other_charges_exchange_rate: "",
      toi: "CIF",
      freight: "",
      insurance: "",
      po_validation_error: "",
      other_charges: "",
      freight_currency: "",
      insurance_currency: "INR",
      other_charges_currency: "USD",
    },
  ]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_STRING}/admin/get-branches`);
        setBranches(response.data);
      } catch (error) {
        console.error("Error fetching branches:", error);
      }
    };
    fetchBranches();
  }, []);

  const [container_nos, setContainerNos] = useState([
    {
      container_number: "",
      size: "",
      seal_no: "",
      container_gross_weight: "",
      net_weight_as_per_PL_document: "",
    },
  ]);

  const [fta_Benefit_date_time, setFtaBenefitDateTime] = useState("");
  const [exBondValue, setExBondValue] = useState("");
  const [jobDetails, setJobDetails] = useState([]);

  // The back end expects "cth_documents". In your front end, you called it "cthDocuments".
  // Keep your internal state as is, but rename it in the final payload.
  const [cthDocuments, setCthDocuments] = useState([
    {
      document_name: "Commercial Invoice",
      document_code: "380000",
      url: [],
      isDefault: true,
    },
    {
      document_name: "Packing List",
      document_code: "271000",
      url: [],
      isDefault: true,
    },
    {
      document_name: mode === "AIR" ? "Air Way BL" : "Bill of Lading",
      document_code: mode === "AIR" ? "740000" : "704000",
      url: [],
      isDefault: true,
    },
  ]);

  // Update default transport document when mode changes (only for new jobs)
  useEffect(() => {
    if (!isEditMode) {
      const isAir = mode === "AIR";
      const targetDocName = isAir ? "Air Way BL" : "Bill of Lading";
      const targetDocCode = isAir ? "740000" : "704000";
      const otherDocName = isAir ? "Bill of Lading" : "Air Way BL";

      setCthDocuments((prev) => {
        // If the target doc is already present, do nothing
        if (prev.some(doc => doc.document_name === targetDocName)) return prev;

        // Replace the other doc if it's there, otherwise just add it
        const hasOther = prev.some(doc => doc.document_name === otherDocName);
        if (hasOther) {
          return prev.map(doc => 
            doc.document_name === otherDocName 
              ? { ...doc, document_name: targetDocName, document_code: targetDocCode, url: doc.url || [] }
              : doc
          );
        } else {
          return [...prev, { document_name: targetDocName, document_code: targetDocCode, url: [], isDefault: true }];
        }
      });
    }
  }, [mode, isEditMode]);

  const [scheme, setScheme] = useState("");
  const [in_bond_be_no, setBeNo] = useState("");
  const [in_bond_be_date, setBeDate] = useState("");
  const [in_bond_ooc_copies, setOocCopies] = useState([]);
  const [clearanceValue, setClearanceValue] = useState("");

  const [deleteIndex, setDeleteIndex] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // For editing a single doc
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editValues, setEditValues] = useState({});

  // For new doc from dropdown or user
  const [selectedDocument, setSelectedDocument] = useState("");
  const [newDocumentCode, setNewDocumentCode] = useState("");
  const [newDocumentName, setNewDocumentName] = useState("");
  const [HSS, setHSS] = useState("");
  const [sallerName, setSallerName] = useState("");
  const [bankName, setBankName] = useState("")
  const [ie_code_no, setIeCodeNo] = useState("");
  const [hss_address, setHssAddress] = useState("");
  const [hss_address_details, setHssAddressDetails] = useState("");
  const [hss_branch_id, setHssBranchId] = useState("");
  const [hss_city, setHssCity] = useState("");
  const [hss_state, setHssState] = useState("");
  const [hss_ie_code_no, setHssIeCodeNo] = useState("");
  const [gst_no, setGstNo] = useState("");
  const [hss_postal_code, setHssPostalCode] = useState("");
  const [hss_country, setHssCountry] = useState("");
  const [hss_ad_code, setHssAdCode] = useState("");
  const [other_charges_details, setOtherChargesDetails] = useState({
    is_single_for_all: true,
    miscellaneous: { currency: "", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
    agency: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
    discount: { currency: "", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
    loading: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
    freight: { currency: "", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
    insurance: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
    addl_charge: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
    revenue_deposit: { rate: 0, on: "Assessable" },
    landing_charge: { rate: 0 }
  });

  useEffect(() => {
    if (importer) {
      const formattedImporter = importer
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^\w&.]+/g, "")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");
      setImporterURL(formattedImporter);
    }
  }, [importer]);

  // Fetch job numbers dynamically
  // Fetch job details dynamically
  useEffect(() => {
    async function fetchJobDetails() {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_API_STRING}/jobs/add-job-all-In-bond`
        );
        setJobDetails(response.data); // Set the job details from the response
      } catch (error) {
        console.error("Error fetching job details:", error);
      }
    }
    fetchJobDetails();
  }, []);

  // Auto-sync global inv_currency to F&I charges and the first invoice row
  useEffect(() => {
    if (inv_currency) {
      setOtherChargesDetails(prev => {
        const updated = { ...prev };
        let changed = false;
        ["freight"].forEach(key => {
          if (updated[key] && updated[key].currency !== inv_currency) {
            updated[key] = { ...updated[key], currency: inv_currency };
            changed = true;
          }
        });
        ["insurance", "miscellaneous", "agency", "discount", "loading", "addl_charge"].forEach(key => {
          if (updated[key] && updated[key].currency !== "INR") {
            updated[key] = { ...updated[key], currency: "INR" };
            changed = true;
          }
        });
        return changed ? updated : prev;
      });

      setInvoiceDetails(prev => {
        if (prev.length > 0 && !prev[0].inv_currency) {
          const newRows = [...prev];
          newRows[0] = { 
            ...newRows[0], 
            inv_currency: inv_currency,
            freight_currency: inv_currency,
            insurance_currency: "INR",
            other_charges_currency: "USD"
          };
          return newRows;
        }
        return prev;
      });
    }
  }, [inv_currency]);

  // Handle automatic fetching of exchange rates for other_charges_details
  useEffect(() => {
    if (other_charges_details) {
      const chargeKeys = ["miscellaneous", "agency", "discount", "loading", "freight", "insurance", "addl_charge"];
      const fetchChargesRates = async () => {
        let updated = false;
        const newDetails = { ...other_charges_details };
        const globalCurrency = inv_currency || "";

        await Promise.all(chargeKeys.map(async (key) => {
          const charge = newDetails[key] || {};
          const currency = charge.currency;
          let rate = parseFloat(charge.exchange_rate);

          if (currency?.toUpperCase() === "INR") {
            if (parseFloat(charge.exchange_rate) !== 1) {
              newDetails[key] = { ...charge, exchange_rate: 1 };
              updated = true;
            }
          } else if (currency && currency.toUpperCase() === globalCurrency.toUpperCase()) {
            const globalRate = parseFloat(exrate);
            if (globalRate && !isNaN(globalRate) && parseFloat(charge.exchange_rate) !== globalRate) {
              newDetails[key] = { ...charge, exchange_rate: globalRate };
              updated = true;
            } else if (!rate || isNaN(rate)) {
              newDetails[key] = { ...charge, exchange_rate: globalRate || 1 };
              updated = true;
            }
          } else if (currency) {
            if (!rate || isNaN(rate)) {
              const invDate = invoice_details?.[0]?.invoice_date || invoice_date || "";
              const fetchedRate = await fetchExrateForCurrency(currency, invDate);
              newDetails[key] = { ...charge, exchange_rate: fetchedRate > 0 ? fetchedRate : 1 };
              updated = true;
            }
          }
        }));

        if (updated) {
          setOtherChargesDetails(newDetails);
        }
      };
      fetchChargesRates();
    }
  }, [JSON.stringify(other_charges_details), exrate, inv_currency, invoice_date, invoice_details?.[0]?.invoice_date]);
  //
  const [description_details, setDescriptionDetails] = useState([
    {
      description: "",
      cth_no: "",
      clearance_under: "",
      sr_no_invoice: "",
      sr_no_lic: "",
      quantity: "",
      unit: "",
      unit_price: "",
      amount: "",
      foc_item: "No",
      license_no: "",
      license_date: "",
      license_sr: "",
      utilized_qty: "",
      utilized_unit: "",
      utilized_amount: "",
      amount_currency: "USD",
    },
  ]);

  const mandatoryPoImporters = ["CADILA PHARMACEUTICALS LTD", "INTAS PHARMACEUTICALS LIMITED"];
  const isPoMandatory = mandatoryPoImporters.includes(importer);

  const validatePoFields = (poNo, poDate) => {
    // Both PO No and PO Date must either both be filled or both be empty
    const hasPoNo = poNo && String(poNo).trim().length > 0;
    const hasPoDate = poDate && String(poDate).trim().length > 0;

    if (hasPoNo && !hasPoDate) {
      return "PO Date is mandatory when PO No is provided";
    }
    if (!hasPoNo && hasPoDate) {
      return "PO No is mandatory when PO Date is provided";
    }
    if (hasPoNo && hasPoDate) {
      // Both are provided - valid
      return "";
    }
    // Both empty - valid
    return "";
  };

  const updateInvoiceRow = (rowIndex, field, value) => {
    const updatedRows = [...invoice_details];
    updatedRows[rowIndex] = {
      ...updatedRows[rowIndex],
      [field]: value,
    };

    if (field === "freight_currency" && invoice_details[rowIndex]?.freight_currency !== value) {
      updatedRows[rowIndex].freight_exchange_rate = "";
    }
    if (field === "insurance_currency" && invoice_details[rowIndex]?.insurance_currency !== value) {
      updatedRows[rowIndex].insurance_exchange_rate = "";
    }
    if (field === "other_charges_currency" && invoice_details[rowIndex]?.other_charges_currency !== value) {
      updatedRows[rowIndex].other_charges_exchange_rate = "";
    }
    // Auto-sync product_value (Invoice Value) to linked description row(s) amount in product tab
    if (field === "product_value") {
      const matchedInvoiceSr = String(rowIndex + 1);
      const updatedDescRows = description_details.map(dRow => {
        if (dRow.sr_no_invoice === matchedInvoiceSr || (matchedInvoiceSr === "1" && !dRow.sr_no_invoice)) {
          let newPrice = dRow.unit_price;
          const qty = parseFloat(dRow.quantity);
          const amt = parseFloat(value);
          if (!isNaN(qty) && qty > 0 && !isNaN(amt)) {
            newPrice = (amt / qty).toFixed(2);
          }
          return { ...dRow, amount: value || "", unit_price: newPrice };
        }
        return dRow;
      });
      setDescriptionDetails(updatedDescRows);
    }

    if (field === "po_details") {
      if (Array.isArray(value) && value[0]) {
        updatedRows[rowIndex].po_no = value[0].po_no || "";
        updatedRows[rowIndex].po_date = value[0].po_date || "";
        if (rowIndex === 0) {
          setPoNo(value[0].po_no || "");
          setPoDate(value[0].po_date || "");
        }
      }
    }

    // Validate PO fields if updating PO No or PO Date or PO Details
    if (field === "po_no" || field === "po_date" || field === "po_details") {
      const currentRow = updatedRows[rowIndex];
      let validationError = "";
      const poList = currentRow.po_details || [{ po_no: currentRow.po_no, po_date: currentRow.po_date }];
      for (let i = 0; i < poList.length; i++) {
        const err = validatePoFields(poList[i].po_no, poList[i].po_date);
        if (err) {
          validationError = err;
          break;
        }
      }
      updatedRows[rowIndex].po_validation_error = validationError;
    }

    // Auto-calculate freight and insurance based on TOI
    const toiValue = field === "toi" ? value : (updatedRows[rowIndex].toi || "CIF");
    const pv = parseFloat(field === "product_value" ? value : (updatedRows[rowIndex].product_value || 0)) || 0;
    if (toiValue === "FOB") {
      if (field === "product_value" || field === "toi") {
        updatedRows[rowIndex].freight = pv > 0 ? (pv * 0.20).toFixed(2) : "";
        updatedRows[rowIndex].insurance = pv > 0 ? (pv * 0.01125).toFixed(2) : "";
      }
    } else if (toiValue === "CF") {
      // C&F: auto-calculate insurance as 1.125% of invoice value
      if (field === "product_value" || field === "toi") {
        updatedRows[rowIndex].freight = "";
        updatedRows[rowIndex].insurance = pv > 0 ? (pv * 0.01125).toFixed(2) : "";
      }
    } else if (toiValue === "CI") {
      // C&I: auto-calculate freight as 20% of invoice value
      if (field === "product_value" || field === "toi") {
        updatedRows[rowIndex].freight = pv > 0 ? (pv * 0.20).toFixed(2) : "";
        updatedRows[rowIndex].insurance = "";
      }
    } else if (field === "toi") {
      // CIF or other
      updatedRows[rowIndex].freight = "";
      updatedRows[rowIndex].insurance = "";
    }

    // Auto-calculate total_inv_value from contributing fields
    const calcFields = ["product_value", "freight", "insurance", "other_charges", "toi"];
    if (calcFields.includes(field)) {
      const row = updatedRows[rowIndex];
      const pv = parseFloat(field === "product_value" ? value : (row.product_value || 0)) || 0;
      const fr = parseFloat(field === "freight" ? value : (row.freight || 0)) || 0;
      const ins = parseFloat(field === "insurance" ? value : (row.insurance || 0)) || 0;
      const oth = parseFloat(field === "other_charges" ? value : (row.other_charges || 0)) || 0;
      updatedRows[rowIndex].total_inv_value = (pv + fr + ins + oth).toFixed(2);
    }

    setInvoiceDetails(updatedRows);

    // Sync global CIF value (term value) across all rows converted to INR
    const totalCif = updatedRows.reduce((sum, row) => sum + (parseFloat(row.total_inv_value) || 0), 0);
    const totalProductVal = updatedRows.reduce((sum, row) => sum + (parseFloat(row.product_value) || 0), 0);
    if (totalCif > 0) {
      setTotalInvValue(totalProductVal > 0 ? String(totalProductVal.toFixed(2)) : String(totalCif.toFixed(2)));
      
      const syncCifValue = async () => {
        let totalCifInr = 0;
        let updated = false;

        const resolveRate = async (curr, existingRateStr, date) => {
          let rate = parseFloat(existingRateStr);
          const globalCurrency = inv_currency || "";
          const globalRate = parseFloat(exrate);

          if (!curr) return { rate: 1, updated: false };
          if (curr.toUpperCase() === "INR") {
            if (parseFloat(existingRateStr) !== 1) {
              return { rate: 1, updated: true };
            }
            return { rate: 1, updated: false };
          }
          if (curr.toUpperCase() === globalCurrency.toUpperCase()) {
            if (globalRate && !isNaN(globalRate) && parseFloat(existingRateStr) !== globalRate) {
              return { rate: globalRate, updated: true };
            } else if (!rate || isNaN(rate)) {
              const fetchedRate = await fetchExrateForCurrency(curr, date || invoice_date || "");
              const resolved = fetchedRate > 0 ? fetchedRate : (globalRate || 1);
              return { rate: resolved, updated: true };
            }
          } else {
            if (!rate || isNaN(rate)) {
              const fetchedRate = await fetchExrateForCurrency(curr, date || invoice_date || "");
              const resolved = fetchedRate > 0 ? fetchedRate : 1;
              return { rate: resolved, updated: true };
            }
          }
          return { rate: rate, updated: false };
        };

        const newRows = await Promise.all(updatedRows.map(async (row) => {
          const date = row.invoice_date || invoice_date || "";
          const resInv = await resolveRate(row.inv_currency, row.exchange_rate, date);
          const resFr = await resolveRate(row.freight_currency, row.freight_exchange_rate, date);
          const resIns = await resolveRate(row.insurance_currency, row.insurance_exchange_rate, date);
          const resOth = await resolveRate(row.other_charges_currency, row.other_charges_exchange_rate, date);

          if (resInv.updated || resFr.updated || resIns.updated || resOth.updated) {
            updated = true;
          }

          const pv = parseFloat(row.product_value) || 0;
          const fr = parseFloat(row.freight) || 0;
          const ins = parseFloat(row.insurance) || 0;
          const oth = parseFloat(row.other_charges) || 0;

          const rowCif = (pv * resInv.rate) + (fr * resFr.rate) + (ins * resIns.rate) + (oth * resOth.rate);
          totalCifInr += rowCif;

          return {
            ...row,
            exchange_rate: String(resInv.rate),
            freight_exchange_rate: String(resFr.rate),
            insurance_exchange_rate: String(resIns.rate),
            other_charges_exchange_rate: String(resOth.rate),
          };
        }));

        if (updated) {
          setInvoiceDetails(newRows);
        }

        setTermValue(String(totalCifInr.toFixed(2)));
        setCifAmount(String(totalCifInr.toFixed(2)));
      };
      syncCifValue();
    } else if (field === "total_inv_value") {
      setTotalInvValue(value);
      setTermValue(value);
      setCifAmount(value);
    }
    
    // Also sync the global F & I Charges tab amounts and rates based on FOB invoices
    const hasFOB = updatedRows.some(row => row.toi === "FOB");
    if (hasFOB) {
      const totalFreight = updatedRows.reduce((sum, row) => sum + (parseFloat(row.freight) || 0), 0);
      const totalInsurance = updatedRows.reduce((sum, row) => sum + (parseFloat(row.insurance) || 0), 0);
      
      setOtherChargesDetails(prev => ({
        ...prev,
        freight: { ...prev.freight, amount: totalFreight > 0 ? totalFreight.toFixed(2) : "", rate: 20 },
        insurance: { ...prev.insurance, amount: totalInsurance > 0 ? totalInsurance.toFixed(2) : "", rate: 1.125 }
      }));
    } else if (field === "toi") {
       setOtherChargesDetails(prev => ({
        ...prev,
        freight: { ...prev.freight, amount: "", rate: 0 },
        insurance: { ...prev.insurance, amount: "", rate: 0 }
      }));
     }
    
    // Auto-sync currency for all charge heads in other_charges_details when invoice currency changes
    if (field === "inv_currency" && invoice_details[rowIndex]?.inv_currency !== value) {
      updatedRows[rowIndex].freight_currency = value || "";
      updatedRows[rowIndex].insurance_currency = "INR";
      updatedRows[rowIndex].other_charges_currency = "USD";
      updatedRows[rowIndex].exchange_rate = "";
      updatedRows[rowIndex].freight_exchange_rate = "";
      updatedRows[rowIndex].insurance_exchange_rate = "";
      updatedRows[rowIndex].other_charges_exchange_rate = "";

      setOtherChargesDetails(prev => {
        const updated = { ...prev };
        ["freight"].forEach(key => {
          if (updated[key]) {
            updated[key] = {
              ...updated[key],
              currency: value || "",
              exchange_rate: ""
            };
          }
        });
        ["insurance", "miscellaneous", "agency", "discount", "loading", "addl_charge"].forEach(key => {
          if (updated[key]) {
            updated[key] = {
              ...updated[key],
              currency: "INR",
              exchange_rate: 1
            };
          }
        });
        return updated;
      });
    }

    // Sync first row with single fields for backward compatibility
    if (rowIndex === 0) {
      if (field === "invoice_number") setInvoiceNumber(value);
      if (field === "invoice_date") setInvoiceDate(value);
      if (field === "po_no") setPoNo(value);
      if (field === "po_date") setPoDate(value);
      if (field === "inv_currency" && inv_currency !== value) {
        setInvCurrency(value);
        if (!in_bond_be_no || in_bond_be_no.trim().length === 0) {
          setExrate("");
        }
      }
      if (field === "toi") setImportTerms(value);
      if (field === "freight") setFreight(value);
      if (field === "insurance") setInsurance(value);
    }
  };

  const addInvoiceRow = () => {
    setInvoiceDetails([
      ...invoice_details,
      {
        invoice_number: "",
        invoice_date: "",
        po_no: "",
        po_date: "",
        po_details: [{ po_no: "", po_date: "" }],
        product_value: "",
        total_inv_value: "",
        inv_currency: invoice_details[0]?.inv_currency || "",
        exchange_rate: "",
        freight_exchange_rate: "",
        insurance_exchange_rate: "",
        other_charges_exchange_rate: "",
        toi: "CIF",
        freight: "",
        insurance: "",
        other_charges: "",
        po_validation_error: "",
        freight_currency: invoice_details[0]?.inv_currency || "",
        insurance_currency: "INR",
        other_charges_currency: "USD",
      },
    ]);
  };

  const removeInvoiceRow = (rowIndex) => {
    if (invoice_details.length <= 1) return;
    const updatedRows = invoice_details.filter((_, index) => index !== rowIndex);
    setInvoiceDetails(updatedRows);
  };

  const addInvoicePoDetail = (rowIndex) => {
    const updated = [...invoice_details];
    const row = updated[rowIndex];
    const poList = Array.isArray(row.po_details) ? [...row.po_details] : [];
    poList.push({ po_no: "", po_date: "" });
    updated[rowIndex] = { ...row, po_details: poList };
    setInvoiceDetails(updated);
  };

  const removeInvoicePoDetail = (rowIndex, poIndex) => {
    const updated = [...invoice_details];
    const row = { ...updated[rowIndex] };
    const poList = Array.isArray(row.po_details) ? [...row.po_details] : [];
    if (poList.length <= 1) return;
    poList.splice(poIndex, 1);
    row.po_details = poList;

    if (poIndex === 0 && poList[0]) {
      row.po_no = poList[0].po_no || "";
      row.po_date = poList[0].po_date || "";
      if (rowIndex === 0) {
        setPoNo(poList[0].po_no || "");
        setPoDate(poList[0].po_date || "");
      }
    }

    // Validate PO fields for this row
    let validationError = "";
    for (let i = 0; i < poList.length; i++) {
      const err = validatePoFields(poList[i].po_no, poList[i].po_date);
      if (err) {
        validationError = err;
        break;
      }
    }
    row.po_validation_error = validationError;

    updated[rowIndex] = row;
    setInvoiceDetails(updated);
  };

  const updateInvoicePoDetail = (rowIndex, poIndex, poField, value) => {
    const updated = [...invoice_details];
    const row = { ...updated[rowIndex] };
    const poList = Array.isArray(row.po_details) ? [...row.po_details] : [];
    if (poList[poIndex]) {
      poList[poIndex] = { ...poList[poIndex], [poField]: value };
    }
    row.po_details = poList;

    if (poIndex === 0) {
      if (poField === "po_no") {
        row.po_no = value;
        if (rowIndex === 0) setPoNo(value);
      } else if (poField === "po_date") {
        row.po_date = value;
        if (rowIndex === 0) setPoDate(value);
      }
    }

    // Validate PO fields for this row
    let validationError = "";
    for (let i = 0; i < poList.length; i++) {
      const err = validatePoFields(poList[i].po_no, poList[i].po_date);
      if (err) {
        validationError = err;
        break;
      }
    }
    row.po_validation_error = validationError;

    updated[rowIndex] = row;
    setInvoiceDetails(updated);
  };

  const validateAllInvoiceRows = () => {
    const errors = [];
    invoice_details.forEach((row, index) => {
      const poList = row.po_details || [{ po_no: row.po_no, po_date: row.po_date }];
      poList.forEach((po, poIndex) => {
        const poError = validatePoFields(po.po_no, po.po_date);
        if (poError) {
          errors.push(`Row ${index + 1} (PO ${poIndex + 1}): ${poError}`);
        }
      });
    });
    return errors;
  };

  const updateDescriptionRow = (rowIndex, field, value) => {
    const updatedRows = [...description_details];
    updatedRows[rowIndex] = {
      ...updatedRows[rowIndex],
      [field]: value,
    };
    // Auto-populate amount based on matched invoice's value if sr_no_invoice is updated
    if (field === "sr_no_invoice") {
      const invoiceNum = parseInt(value) || 0;
      if (invoiceNum > 0 && invoice_details[invoiceNum - 1]) {
        updatedRows[rowIndex].amount = invoice_details[invoiceNum - 1].product_value || "";
      }
    }

    // Auto-calculate amount or unit_price based on what changes
    if (field === "quantity" || field === "unit_price" || field === "amount") {
      const qValue = field === "quantity" ? value : updatedRows[rowIndex].quantity;
      const pValue = field === "unit_price" ? value : updatedRows[rowIndex].unit_price;
      const aValue = field === "amount" ? value : updatedRows[rowIndex].amount;

      const qty = parseFloat(qValue);
      const price = parseFloat(pValue);
      const amt = parseFloat(aValue);

      if (field === "quantity") {
        if (!isNaN(qty) && qty > 0 && !isNaN(amt)) {
          updatedRows[rowIndex].unit_price = (amt / qty).toFixed(2);
        } else if (!isNaN(qty) && !isNaN(price)) {
          updatedRows[rowIndex].amount = (qty * price).toFixed(2);
        }
      } else if (field === "unit_price") {
        if (!isNaN(qty) && !isNaN(price)) {
          updatedRows[rowIndex].amount = (qty * price).toFixed(2);
        }
      } else if (field === "amount") {
        if (!isNaN(amt) && !isNaN(qty) && qty > 0) {
          updatedRows[rowIndex].unit_price = (amt / qty).toFixed(2);
        }
      }
    }

    setDescriptionDetails(updatedRows);

    if (rowIndex === 0) {
      if (field === "description") setDescription(value);
      if (field === "cth_no") setCthNo(value);
      if (field === "clearance_under") {
        setClearanceValue(value);
        setScheme(value);
      }
    }
  };

  useEffect(() => {
    if (scheme) {
      setDescriptionDetails((prev) =>
        prev.map((row) => ({
          ...row,
          clearance_under: row.clearance_under || scheme,
        }))
      );
    }
  }, [scheme]);

  const addDescriptionRow = () => {
    const defaultSrNo = invoice_details.length > 0 ? String(invoice_details.length) : "";
    setDescriptionDetails([
      ...description_details,
      {
        description: "",
        cth_no: "",
        clearance_under: scheme || clearanceValue || "",
        sr_no_invoice: defaultSrNo,
        sr_no_lic: "",
        quantity: "",
        unit: "",
        unit_price: "",
        amount: "",
        foc_item: "No",
        // License utilization fields
        license_no: "",
        license_date: "",
        license_sr: "",
        utilized_qty: "",
        utilized_unit: "",
        utilized_amount: "",
        amount_currency: "USD",
      },
    ]);
  };

  const removeDescriptionRow = (rowIndex) => {
    if (description_details.length <= 1) return;
    const updatedRows = description_details.filter((_, index) => index !== rowIndex);
    setDescriptionDetails(updatedRows);
  };

  // Reset form function
  const resetForm = () => {
    // setYear(defaultYearPair);
    setCustomHouse("");
    setImporter("");
    setImporterType("");
    setCommercialTaxType("");
    setImporterAddress("");
    setImporterURL("");
    setShippingLineAirline("");
    setBranchSrNo("");
    setAdCode("");
    setSupplierExporter("");
    setAwbBlNo("");
    setHawb_hbl_no("");
    setHawb_hbl_date("");
    setAwbBlDate("");
    setVesselberthing("");
    setVesselFlight("");
    setVoyageNo("");
    setTypeOfBE("");
    setLoadingPort("");
    setGrossWeight("");
    setJob_net_weight("");
    setCthNo("");
    setOriginCountry("");
    setPortOfReporting("");
    setTotalInvValue("");
    setInvCurrency("");
    setInvoiceNumber("");
    setInvoiceDate("");
    setPoNo("");
    setPoDate("");
    setDescription("");
    setDescriptionDetails([
      {
        description: "",
        cth_no: "",
        clearance_under: "",
        sr_no_invoice: "",
        sr_no_lic: "",
        quantity: "",
        unit: "",
        unit_price: "",
        amount: "",
        foc_item: "No",
        // License utilization fields
        license_no: "",
        license_date: "",
        license_sr: "",
        utilized_qty: "",
        utilized_unit: "",
        utilized_amount: "",
        amount_currency: "USD",
      },
    ]);
    setInvoiceDetails([
      {
        invoice_number: "",
        invoice_date: "",
        po_no: "",
        po_date: "",
        po_details: [{ po_no: "", po_date: "" }],
        product_value: "",
        total_inv_value: "",
        inv_currency: "",
        exchange_rate: "",
        freight_exchange_rate: "",
        insurance_exchange_rate: "",
        other_charges_exchange_rate: "",
        toi: "CIF",
        freight: "",
        insurance: "",
        other_charges: "",
        freight_currency: "",
        insurance_currency: "INR",
        other_charges_currency: "USD",
      },
    ]);
    setConsignmentType("");
    setCifAmount("");
    setIsDraftDoc(false);
    setContainerNos([
      {
        container_number: "",
        size: "",
        seal_no: "",
        container_gross_weight: "",
        net_weight_as_per_PL_document: "",
      },
    ]);
    setFtaBenefitDateTime("");
    setExBondValue("");
    setCthDocuments([
      {
        document_name: "Commercial Invoice",
        document_code: "380000",
        url: [],
        isDefault: true,
      },
      {
        document_name: "Packing List",
        document_code: "271000",
        url: [],
        isDefault: true,
      },
      {
        document_name: mode === "AIR" ? "Air Way BL" : "Bill of Lading",
        document_code: mode === "AIR" ? "740000" : "704000",
        url: [],
        isDefault: true,
      },
    ]);
    setScheme("");
    setBeNo("");
    setBeDate("");
    setOocCopies([]);
    setClearanceValue("");
    setSelectedDocument("");
    setNewDocumentName("");
    setNewDocumentCode("");
    setHSS("")
    setSallerName("")
    setBankName("")
    setIeCodeNo("");
    setGstNo("");
    setHssAddress("");
    setHssAddressDetails("");
    setHssBranchId("");
    setHssCity("");
    setHssState("");
    setHssIeCodeNo("");
    setHssPostalCode("");
    setHssCountry("");
    setHssAdCode("");
    setImporterAddressDetails("");
    setImporterCity("");
    setImporterState("");
    setImporterPostalCode("");
    setImporterCountry("");
    setOtherChargesDetails({
      is_single_for_all: true,
      miscellaneous: { currency: "", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
      agency: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
      discount: { currency: "", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
      loading: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
      freight: { currency: "", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
      insurance: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
      addl_charge: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
      revenue_deposit: { rate: 0, on: "Assessable" },
      landing_charge: { rate: 0 }
    });
    setBranchId("");
    setTradeType("IMP");
    setMode("SEA");

    // Reset any other states if necessary
    setIsEditMode(false);
    setEditJobId(null);
    setJobNumber("");
  };

  const populateJobData = (job) => {
    if (!job) return;
    
    setIsEditMode(true);
    setEditJobId(job._id);
    setJobNumber(job.job_number || job.job_no || "");
    
    if (job.year) setYear(job.year);
    if (job.custom_house) setCustomHouse(job.custom_house);
    if (job.importer) setImporter(job.importer);
    if (job.importer_type) setImporterType(job.importer_type);
    if (job.commercial_tax_type) setCommercialTaxType(job.commercial_tax_type);
    if (job.importer_address) setImporterAddress(job.importer_address);
    if (job.shipping_line_airline) setShippingLineAirline(job.shipping_line_airline);
    if (job.branchSrNo) setBranchSrNo(job.branchSrNo);
    if (job.adCode) setAdCode(job.adCode);
    if (job.supplier_exporter) setSupplierExporter(job.supplier_exporter);
    if (job.awb_bl_no) setAwbBlNo(job.awb_bl_no);
    if (job.hawb_hbl_no) setHawb_hbl_no(job.hawb_hbl_no);
    if (job.hawb_hbl_date) setHawb_hbl_date(job.hawb_hbl_date);
    if (job.awb_bl_date) setAwbBlDate(job.awb_bl_date);
    if (job.vessel_berthing) setVesselberthing(job.vessel_berthing);
    if (job.vessel_flight) setVesselFlight(job.vessel_flight);
    if (job.voyage_no) setVoyageNo(job.voyage_no);
    if (job.type_of_b_e) setTypeOfBE(job.type_of_b_e);
    if (job.loading_port) setLoadingPort(job.loading_port);
    if (job.gross_weight) setGrossWeight(job.gross_weight);
    if (job.job_net_weight) setJob_net_weight(job.job_net_weight);
    if (job.cth_no) setCthNo(job.cth_no);
    if (job.origin_country) setOriginCountry(job.origin_country);
    if (job.port_of_reporting) setPortOfReporting(job.port_of_reporting);
    if (job.total_inv_value) setTotalInvValue(job.total_inv_value);
    if (job.inv_currency) setInvCurrency(job.inv_currency);
    if (job.invoice_number) setInvoiceNumber(job.invoice_number);
    if (job.invoice_date) setInvoiceDate(job.invoice_date);
    if (job.po_no) setPoNo(job.po_no);
    if (job.po_date) setPoDate(job.po_date);
    if (job.total_inv_value || job.cifValue || job.cif_amount) {
      setTermValue(job.total_inv_value || job.cifValue || job.cif_amount || "");
      setCifAmount(job.cif_amount || job.total_inv_value || job.cifValue || "");
    }
    if (job.exrate) {
      setExrate(job.exrate);
    }
    if (job.consignment_type) setConsignmentType(job.consignment_type);
    if (job.description) setDescription(job.description);
    if (!job.description && job.description_details && job.description_details.length > 0) {
        setDescription(job.description_details[0].description);
    }
    
    if (job.invoice_details && job.invoice_details.length > 0) {
      setInvoiceDetails(job.invoice_details.map(inv => ({
        ...inv,
        po_no: inv.po_no || "",
        po_date: inv.po_date || "",
        po_details: inv.po_details && inv.po_details.length > 0
          ? inv.po_details.map(p => ({ po_no: p.po_no || "", po_date: p.po_date || "" }))
          : [{ po_no: inv.po_no || "", po_date: inv.po_date || "" }],
        freight_currency: inv.freight_currency || inv.inv_currency || "",
        insurance_currency: inv.insurance_currency || "INR",
        other_charges_currency: inv.other_charges_currency || "USD",
        exchange_rate: inv.exchange_rate || "",
        freight_exchange_rate: inv.freight_exchange_rate || "",
        insurance_exchange_rate: inv.insurance_exchange_rate || "",
        other_charges_exchange_rate: inv.other_charges_exchange_rate || "",
      })));
    } else if (job.invoice_number || job.total_inv_value) {
      setInvoiceDetails([{
        invoice_number: job.invoice_number || "",
        invoice_date: job.invoice_date || "",
        po_no: job.po_no || "",
        po_date: job.po_date || "",
        po_details: [{ po_no: job.po_no || "", po_date: job.po_date || "" }],
        product_value: job.product_value || job.total_inv_value || "",
        total_inv_value: job.total_inv_value || "",
        inv_currency: job.inv_currency || "",
        toi: job.import_terms || "CIF",
        freight: job.freight || "",
        insurance: job.insurance || "",
        other_charges: job.other_charges || "",
        freight_currency: job.inv_currency || "",
        insurance_currency: "INR",
        other_charges_currency: "USD",
        exchange_rate: job.exrate || "",
        freight_exchange_rate: job.exrate || "",
        insurance_exchange_rate: "1",
        other_charges_exchange_rate: "1",
      }]);
    }
    
    if (job.description_details && job.description_details.length > 0) {
      setDescriptionDetails(job.description_details.map(row => ({
        description: row.description || "",
        cth_no: row.cth_no || "",
        clearance_under: row.clearance_under || "",
        sr_no_invoice: row.sr_no_invoice || "",
        sr_no_lic: row.sr_no_lic || "",
        quantity: row.quantity || "",
        unit: row.unit || "",
        unit_price: row.unit_price || "",
        amount: row.amount || "",
        foc_item: row.foc_item || "No",
        license_no: row.license_no || "",
        license_date: row.license_date || "",
        license_sr: row.license_sr !== undefined && row.license_sr !== null ? row.license_sr : "",
        utilized_qty: row.utilized_qty !== undefined && row.utilized_qty !== null ? row.utilized_qty : "",
        utilized_unit: row.utilized_unit || "",
        utilized_amount: row.utilized_amount !== undefined && row.utilized_amount !== null ? row.utilized_amount : "",
        amount_currency: row.amount_currency || "USD"
      })));
    } else if (job.description || job.cth_no) {
      setDescriptionDetails([{
        description: job.description || (job.description_details && job.description_details[0]?.description) || "",
        cth_no: job.cth_no || (job.description_details && job.description_details[0]?.cth_no) || "",
        clearance_under: job.scheme || job.clearanceValue || "Full Duty",
        sr_no_invoice: "1",
        sr_no_lic: job.sr_no_lic || "",
        quantity: job.gross_weight || "",
        unit: job.unit || "",
        unit_price: job.unit_price || "",
        amount: job.total_inv_value || "",
        foc_item: job.foc_item || "No",
        license_no: "",
        license_date: "",
        license_sr: "",
        utilized_qty: "",
        utilized_unit: "",
        utilized_amount: "",
        amount_currency: "USD"
      }]);
    }

    if (job.ie_code_no) setIeCodeNo(job.ie_code_no);
    if (job.gst_no) setGstNo(job.gst_no);

    if (job.container_nos && job.container_nos.length > 0) {
      setContainerNos(job.container_nos);
    }

    if (job.cth_documents && job.cth_documents.length > 0) {
      setCthDocuments(job.cth_documents);
    }

    if (job.scheme) setScheme(job.scheme);
    if (job.in_bond_be_no) setBeNo(job.in_bond_be_no);
    if (job.in_bond_be_date) setBeDate(job.in_bond_be_date);
    if (job.in_bond_ooc_copies) setOocCopies(job.in_bond_ooc_copies);
    if (job.clearanceValue) setClearanceValue(job.clearanceValue);
    if (job.saller_name) setSallerName(job.saller_name);
    if (job.hss) setHSS(job.hss);
    if (job.bank_name) setBankName(job.bank_name);
    // HSS Address Refactor
    if (job.hss_address && typeof job.hss_address === 'object' && !Array.isArray(job.hss_address)) {
      const addr = job.hss_address;
      if (addr.category) setHssAddress(addr.category);
      if (addr.details) setHssAddressDetails(addr.details);
      if (addr.city) setHssCity(addr.city);
      if (addr.state) setHssState(addr.state);
      if (addr.postal_code) setHssPostalCode(addr.postal_code);
      if (addr.country) setHssCountry(addr.country);
      if (addr.ad_code) setHssAdCode(addr.ad_code);
    } else if (job.hss_address) {
      setHssAddress(job.hss_address);
    }

    // Top-level legacy fields (only set if not already set by object)
    if (job.hss_address_details && !job.hss_address?.details) setHssAddressDetails(job.hss_address_details);
    if (job.hss_branch_id) setHssBranchId(job.hss_branch_id);
    if (job.hss_city && !job.hss_address?.city) setHssCity(job.hss_city);
    if (job.hss_state && !job.hss_address?.state) setHssState(job.hss_state);
    if (job.hss_ie_code_no) setHssIeCodeNo(job.hss_ie_code_no);
    if (job.hss_postal_code && !job.hss_address?.postal_code) setHssPostalCode(job.hss_postal_code);
    if (job.hss_country && !job.hss_address?.country) setHssCountry(job.hss_country);
    if (job.hss_ad_code && !job.hss_address?.ad_code) setHssAdCode(job.hss_ad_code);
    
    // Importer Address Refactor
    if (job.importer_address) {
      if (typeof job.importer_address === "object" && !Array.isArray(job.importer_address)) {
        const addr = job.importer_address;
        if (addr.details) setImporterAddressDetails(addr.details);
        if (addr.city) setImporterCity(addr.city);
        if (addr.state) setImporterState(addr.state);
        if (addr.postal_code) setImporterPostalCode(addr.postal_code);
        if (addr.country) setImporterCountry(addr.country);
      } else {
        setImporterAddress(job.importer_address);
      }
    }
    if (job.importer_address_details) setImporterAddressDetails(job.importer_address_details);
    if (job.importer_city) setImporterCity(job.importer_city);
    if (job.importer_state) setImporterState(job.importer_state);
    if (job.importer_postal_code) setImporterPostalCode(job.importer_postal_code);
    if (job.importer_country) setImporterCountry(job.importer_country);
    if (job.branch_id) setBranchId(job.branch_id);
    if (job.trade_type) setTradeType(job.trade_type);
    if (job.mode) setMode(job.mode);
    if (job.other_charges_details) {
      setOtherChargesDetails({
        is_single_for_all: true,
        miscellaneous: { currency: "", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
        agency: { currency: "INR", exchange_rate: 1, rate: 0, remark: "" },
        discount: { currency: "", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
        loading: { currency: "INR", exchange_rate: 1, rate: 0, remark: "" },
        freight: { currency: "", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
        insurance: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
        addl_charge: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
        revenue_deposit: { rate: 0, on: "Assessable" },
        landing_charge: { rate: 0 },
        ...job.other_charges_details,
        landing_charge: {
          rate: 0,
          ...(job.other_charges_details?.landing_charge || {})
        }
      });
    }
  };

  const checkDuplicate = async (blNumber) => {
    if (!blNumber) return { exists: false };
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_STRING}/jobs/check-duplicate`, { 
        blNumber,
      });
      return response.data;
    } catch (error) {
      console.error("Error checking duplication:", error);
      return { exists: false, error: true };
    }
  };
  //
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  const formik = useFormik({
    initialValues: {
      all_documents: [],
    },
    onSubmit: async (values) => {
      try {
        if (!branch_id) {
          setSnackbar({
            open: true,
            message: "Please select a branch before creating the job.",
            severity: "error"
          });
          return;
        }

        // --- PO VALIDATION ---
        // 1. Check for mismatched PO No/Date (one exists but other doesn't)
        const poMismatchErrors = validateAllInvoiceRows();
        if (poMismatchErrors.length > 0) {
          setSnackbar({
            open: true,
            message: `Validation Error: ${poMismatchErrors[0]}`,
            severity: "error"
          });
          return;
        }

        // 2. Check for missing PO No or PO Date entirely IF mandatory for this importer
        if (isPoMandatory) {
          const isPoMissing = invoice_details.some(row => !row.po_no?.trim() || !row.po_date?.trim());
          if (isPoMissing) {
            setSnackbar({
              open: true,
              message: "PO No. and PO Date are mandatory for CADILA and INTAS importers.",
              severity: "error"
            });
            return;
          }
        }

        // --- CTH / HS CODE VALIDATION ---
        if (description_details) {
          for (let i = 0; i < description_details.length; i++) {
            const row = description_details[i];
            if (row.cth_no) {
              const clean = String(row.cth_no).trim();
              if (clean && !/^\d{8,}$/.test(clean)) {
                setSnackbar({
                  open: true,
                  message: `Row ${i + 1}: HS Code (CTH No) must be at least 8 digits long and contain only numbers.`,
                  severity: "error"
                });
                return;
              }
            }
          }
        }

        if (cth_no) {
          const clean = String(cth_no).trim();
          if (clean && !/^\d{8,}$/.test(clean)) {
            setSnackbar({
              open: true,
              message: "Job-level CTH No must be at least 8 digits long and contain only numbers.",
              severity: "error"
            });
            return;
          }
        }

        const payload = {
          ...values,
          year, // <-- MANDATORY for backend
          job_date,
          custom_house,
          importer,
          importer_type,
          commercial_tax_type,
          importer_address: {
            details: importer_address_details,
            city: importer_city,
            state: importer_state,
            postal_code: importer_postal_code,
            country: importer_country,
          },
          hss_address: {
            category: hss_address,
            details: hss_address_details,
            city: hss_city,
            state: hss_state,
            postal_code: hss_postal_code,
            country: hss_country,
            ad_code: hss_ad_code,
          },
          importerURL,
          ie_code_no,
          gst_no,
          shipping_line_airline,
          branchSrNo,
          adCode,
          supplier_exporter,
          awb_bl_no,
          hawb_hbl_no,
          hawb_hbl_date,
          awb_bl_date,
          vessel_berthing,
          vessel_flight,
          voyage_no,
          type_of_b_e,
          loading_port,
          gross_weight,
          job_net_weight,
          cth_no,
          origin_country,
          port_of_reporting,
          total_inv_value,
          inv_currency,
          invoice_number,
          invoice_date,
          po_no,
          po_date,
          invoice_details,
          other_charges_details,
          import_terms,
          freight,
          insurance,
          exrate,
          cifValue: term_value,
          cif_amount: cif_amount || term_value || "",
          description,
          description_details,
          consignment_type,
          isDraftDoc,
          branch_id,
          trade_type,
          mode,
          container_nos: container_nos.map((c) => {
            const sanitized = sanitizeContainerPayload(c, mode);
            return {
              ...sanitized,
              // Copy seal_no into seal_number array so ViewJob can display it
              seal_number: sanitized.seal_no ? [sanitized.seal_no] : [],
            };
          }),
          cth_documents: cthDocuments, // Renamed to match backend expectations
          scheme,
          in_bond_be_no,
          in_bond_be_date,
          in_bond_ooc_copies,
          exBondValue,
          fta_Benefit_date_time,
          remarks: "",
          status: "Pending",
          clearanceValue,
          saller_name: sallerName,
           hss: HSS,
           bank_name: bankName,
           hss_branch_id,
           hss_ie_code_no,
            detailed_status: "ETA Date Pending",
        };

        console.log("📤 Submitting Job Payload:", JSON.stringify(payload, null, 2));

        // Get user info from localStorage for audit trail
        const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
        const headers = {
          'Content-Type': 'application/json',
          'user-id': user.username || 'unknown',
          'username': user.username || 'unknown',
          'user-role': user.role || 'unknown'
        };

        // Make the API call and store response
        const url = isEditMode 
          ? `${process.env.REACT_APP_API_STRING}/jobs/${editJobId}`
          : `${process.env.REACT_APP_API_STRING}/jobs/add-job-imp-man`;

        const response = await axios({
          method: isEditMode ? 'PATCH' : 'POST',
          url,
          data: payload,
          headers
        });

        // Show success alert
        setSnackbar({
          open: true,
          message: `Job successfully ${isEditMode ? 'updated' : 'created'}! Job No: ${response.data.job?.job_number || response.data.job?.job_no}`,
          severity: "success"
        });

        // Reset the form after successful submission
        resetForm();
        formik.resetForm();
      } catch (error) {
        console.log("❌ Error creating job:", error);

        let errorMessage = "Failed to create job. Please try again.";

        if (error.response) {
          // Extract error message from API response
          errorMessage = error.response.data?.message || `Error: ${error.response.status}`;
        } else if (error.message) {
          errorMessage = error.message;
        }

        setSnackbar({
          open: true,
          message: errorMessage,
          severity: "error"
        });
      }
    },
  });

  // Example utility functions
  const resetOtherDetails = () => {
    setBeNo("");
    setBeDate("");
    setOocCopies([]);
    setScheme("");
    setExBondValue("");
  };

  const canChangeClearance = () => {
    return (
      !exBondValue &&
      !in_bond_be_no &&
      !in_bond_be_date &&
      in_bond_ooc_copies.length === 0
    );
  };

  // Container handlers
  const handleAddContainer = () => {
    const newContainer = sanitizeContainerPayload({
      container_number: "",
      size: "",
      seal_no: "",
      container_gross_weight: "",
      net_weight_as_per_PL_document: "",
    }, mode);
    setContainerNos([
      ...container_nos,
      newContainer
    ]);
  };

  const handleRemoveContainer = (index) => {
    const updatedContainers = container_nos.filter((_, i) => i !== index);
    setContainerNos(updatedContainers);
  };

  const handleContainerChange = (index, field, value) => {
    const updatedContainers = [...container_nos];
    updatedContainers[index][field] = value;
    setContainerNos(updatedContainers);
  };

  // CTH Document handlers
  const confirmDeleteDocument = (index) => {
    setDeleteIndex(index);
    setConfirmDialogOpen(true);
  };

  const handleDeleteDocument = () => {
    if (deleteIndex !== null) {
      setCthDocuments((prevDocs) => {
        const updatedDocs = prevDocs.filter((_, i) => i !== deleteIndex);
        return updatedDocs;
      });
      setDeleteIndex(null);
      setConfirmDialogOpen(false);
    }
  };

  const handleOpenEditDialog = (index) => {
    const documentToEdit = cthDocuments[index];
    setEditValues(documentToEdit);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditValues({});
  };

  const handleSaveEdit = () => {
    const updatedDocuments = [...cthDocuments];
    const idx = updatedDocuments.findIndex(
      (doc) => doc.document_code === editValues.document_code
    );
    if (idx !== -1) {
      updatedDocuments[idx] = editValues;
      setCthDocuments(updatedDocuments);
    }
    setEditDialogOpen(false);
  };

  const handleAddDocument = () => {
    if (selectedDocument === "other") {
      // Adding a custom document
      if (newDocumentName && newDocumentCode) {
        setCthDocuments((prevDocs) => [
          ...prevDocs,
          {
            document_name: newDocumentName,
            document_code: newDocumentCode,
            url: [],
          },
        ]);
        setNewDocumentName("");
        setNewDocumentCode("");
      } else {
        setSnackbar({ open: true, message: "Please enter valid document details.", severity: "warning" });
      }
    } else if (selectedDocument) {
      // Adding a document from the dropdown
      const selectedDoc = cth_Dropdown.find(
        (doc) => doc.document_code === selectedDocument
      );
      if (selectedDoc) {
        setCthDocuments((prevDocs) => [
          ...prevDocs,
          { ...selectedDoc, url: [] },
        ]);
        setSelectedDocument("");
      } else {
        setSnackbar({ open: true, message: "Invalid document selected.", severity: "warning" });
      }
    } else {
      setSnackbar({ open: true, message: "Please select or enter document details.", severity: "warning" });
    }
  };

  return {
    formik,
    year,
    setYear,
    custom_house,
    setCustomHouse,
    importer,
    importerURL,
    setImporter,
    shipping_line_airline,
    setShippingLineAirline,
    branchSrNo,
    setBranchSrNo,
    adCode,
    setAdCode,
    supplier_exporter,
    setSupplierExporter,
    awb_bl_no,
    hawb_hbl_no,
    setHawb_hbl_no,
    hawb_hbl_date,
    setHawb_hbl_date,
    setAwbBlNo,
    awb_bl_date,
    vessel_berthing,
    setAwbBlDate,
    setVesselberthing,
    vessel_flight,
    setVesselFlight,
    voyage_no,
    setVoyageNo,
    type_of_b_e,
    setTypeOfBE,
    loading_port,
    setLoadingPort,
    gross_weight,
    setGrossWeight,
    job_net_weight,
    setJob_net_weight,
    cth_no,
    setCthNo,
    origin_country,
    setOriginCountry,
    port_of_reporting,
    setPortOfReporting,
    total_inv_value,
    setTotalInvValue,
    inv_currency,
    setInvCurrency,
    invoice_number,
    setInvoiceNumber,
    invoice_date,
    setInvoiceDate,
    description,
    setDescription,
    consignment_type,
    setConsignmentType,
    isDraftDoc,
    setIsDraftDoc,
    container_nos,
    handleAddContainer,
    handleRemoveContainer,
    handleContainerChange,
    cthDocuments,
    setCthDocuments,
    scheme,
    setScheme,
    in_bond_be_no,
    setBeNo,
    in_bond_be_date,
    setBeDate,
    in_bond_ooc_copies,
    setOocCopies,
    exBondValue,
    setExBondValue,
    fta_Benefit_date_time,
    setFtaBenefitDateTime,
    selectedDocument,
    setSelectedDocument,
    newDocumentName,
    setNewDocumentName,
    newDocumentCode,
    setNewDocumentCode,
    confirmDialogOpen,
    setConfirmDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    editValues,
    setEditValues,
    handleOpenEditDialog,
    handleCloseEditDialog,
    handleSaveEdit,
    confirmDeleteDocument,
    handleDeleteDocument,
    handleAddDocument,
    clearanceValue,
    setClearanceValue,
    resetOtherDetails,
    canChangeClearance,
    jobDetails,
    setJobDetails,
    HSS,
    setHSS,
    sallerName,
    setSallerName,
     bankName,
     setBankName,
     hss_address,
     setHssAddress,
     hss_address_details,
     setHssAddressDetails,
     hss_branch_id,
     setHssBranchId,
     hss_city,
     setHssCity,
     hss_ie_code_no,
     setHssIeCodeNo,
      hss_postal_code,
      setHssPostalCode,
      hss_country,
      setHssCountry,
      hss_ad_code,
      setHssAdCode,
      hss_state,
      setHssState,
      ie_code_no,
     setIeCodeNo,
    gst_no,
    setGstNo,
    branch_id,
    setBranchId,
    trade_type,
    setTradeType,
    mode,
    setMode,
    branches,
    description_details,
    addDescriptionRow,
    updateDescriptionRow,
    removeDescriptionRow,
    other_charges_details,
    setOtherChargesDetails,
    invoice_details,
    addInvoiceRow,
    updateInvoiceRow,
    removeInvoiceRow,
    addInvoicePoDetail,
    removeInvoicePoDetail,
    updateInvoicePoDetail,
    import_terms,
    setImportTerms,
    freight,
    setFreight,
    insurance,
    setInsurance,
    term_value,
    setTermValue,
    cif_amount,
    setCifAmount,
    exrate,
    setExrate,
    isPoMandatory,
    validateAllInvoiceRows,
    validatePoFields,
    snackbar,
    setSnackbar,
    isEditMode,
    setIsEditMode,
    jobNumber,
    populateJobData,
    checkDuplicate,
    importer_type,
    setImporterType,
    commercial_tax_type,
    setCommercialTaxType,
    importer_address,
    setImporterAddress,
    importer_address_details,
    setImporterAddressDetails,
    importer_city,
    setImporterCity,
    importer_state,
    setImporterState,
    importer_postal_code,
    setImporterPostalCode,
    importer_country,
    setImporterCountry,
  };
};

export default useImportJobForm;
