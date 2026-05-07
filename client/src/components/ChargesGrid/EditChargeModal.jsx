import React, { useState, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import FileUploadModal from './FileUploadModal';
import RequestPaymentModal from './RequestPaymentModal';
import PurchaseBookModal from './PurchaseBookModal';
import { Chip } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import axios from 'axios';
import './charges.css';
import { generatePurchaseBookPDF } from '../../utils/purchaseBookPrint';
import logo from '../../assets/images/logo.webp';
import PrintIcon from '@mui/icons-material/Print';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { IconButton } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';

const EditChargeModal = ({ 
  isOpen, 
  onClose, 
  selectedCharges, 
  onSave, 
  updateCharge,
  parentId,
  shippingLineAirline, 
  importerName,
  jobNumber = '',
  jobDisplayNumber = '',
  jobYear = '',
  jobInvoiceNumber = '',
  jobInvoiceDate = '',
  jobInvoiceValue = '',
  jobCthNo = '',
  branch_code = '',
  workMode = 'Payment',
  readOnly = false,
  isAuthorized = false,
  isLocked = false,
  readOnlyBase = false,
  fetchCharges,
  awbBlNo = '',
  awbBlDate = ''
}) => {
  const [formData, setFormData] = useState([]);
  const [panelOpen, setPanelOpen] = useState({}); // { rowIndex: 'rev' | 'cost' | null }
  const [uploadIndex, setUploadIndex] = useState(null); // index of charge being uploaded for
  const [uploadSection, setUploadSection] = useState(null); // 'revenue' | 'cost'
  const [paymentRequestData, setPaymentRequestData] = useState(null);
  const [purchaseBookData, setPurchaseBookData] = useState(null);
  const [shippingLines, setShippingLines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [generalOrgs, setGeneralOrgs] = useState([]);
  const [cfsList, setCfsList] = useState([]);
  
  const [showLogs, setShowLogs] = useState({ open: false, chargeId: null, chargeName: '' });
  const [chargeLogs, setChargeLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchChargeLogs = async (chargeId, chargeName) => {
    setLogsLoading(true);
    setChargeLogs([]);
    setShowLogs({ open: true, chargeId, chargeName });
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/charges/audit-trail/${chargeId}`, { withCredentials: true });
      if (res.data.success) {
        setChargeLogs(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching charge logs", err);
    } finally {
      setLogsLoading(false);
    }
  };

  const [jobSearchResults, setJobSearchResults] = useState([]);
  const [jobSearchTerm, setJobSearchTerm] = useState('');

  const handleJobSearch = async (term) => {
    setJobSearchTerm(term);
    if (term.length < 2) {
      setJobSearchResults([]);
      return;
    }
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/jobs/search-by-number`, { 
        params: { 
          search: term,
          year: jobYear,
          branch_code: branch_code
        },
        withCredentials: true 
      });
      if (res.data.success) {
        setJobSearchResults(res.data.data);
      }
    } catch (err) {
      console.error("Error searching jobs", err);
    }
  };

  const addSharedJob = (index, jobNo) => {
    const currentShared = formData[index].sharedWith || [];
    if (!currentShared.some(item => (item.jobNo || item) === jobNo)) {
      handleFieldChange(index, 'sharedWith', [...currentShared, { jobNo, amount: 0 }]);
    }
    setJobSearchTerm('');
    setJobSearchResults([]);
  };

  const removeSharedJob = (index, jobNo) => {
    const currentShared = formData[index].sharedWith || [];
    handleFieldChange(index, 'sharedWith', currentShared.filter(item => (item.jobNo || item) !== jobNo));
  };

  const [transporters, setTransporters] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState({ index: null, section: null }); // Track which row/section has open dropdown
  const [paymentDetailsAudit, setPaymentDetailsAudit] = useState({});
  const dropdownRef = useRef(null);
  const modalRef = useRef(null);

  // Lock body scroll when modal is open
  // NOTE: Restored document.body lock. The previous flicker was caused by CSS transforms on parent containers
  // breaking the fixed positioning. createPortal fixes this.
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown({ index: null, section: null });
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [slRes, supRes, orgRes, genOrgRes, cfsRes, transRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_STRING}/get-shipping-lines`),
          axios.get(`${process.env.REACT_APP_API_STRING}/get-suppliers`),
          axios.get(`${process.env.REACT_APP_API_STRING}/organization`),
          axios.get(`${process.env.REACT_APP_API_STRING}/get-general-orgs`),
          axios.get(`${process.env.REACT_APP_API_STRING}/get-cfs-list`),
          axios.get(`${process.env.REACT_APP_API_STRING}/get-transporters`)
        ]);
        setShippingLines(slRes.data);
        setSuppliers(supRes.data);
        setOrganizations(orgRes.data.organizations || []);
        setGeneralOrgs(genOrgRes.data);
        setCfsList(cfsRes.data);
        setTransporters(transRes.data);
      } catch (error) {
        console.error("Error fetching master data:", error);
      }
    };
    fetchMasterData();
  }, []);

  // Fetch Payment Request Audit Info on demand
  useEffect(() => {
    const fetchAudits = async () => {
      const prNos = [...new Set(formData.map(r => r.payment_request_no).filter(Boolean))];
      const pbNos = [...new Set(formData.map(r => r.purchase_book_no).filter(Boolean))];
      const allNos = [...new Set([...prNos, ...pbNos])];
      const newAudits = { ...paymentDetailsAudit };
      let changed = false;

      for (const pr of allNos) {
        if (!newAudits[pr]) {
          try {
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-payment-request-details/${encodeURIComponent(pr)}`);
            if (res.data) {
              newAudits[pr] = res.data;
              changed = true;
            }
          } catch (err) {
            console.error("Error fetching PR audit for", pr, err);
          }
        }
      }

      if (changed) {
        setPaymentDetailsAudit(newAudits);
      }
    };

    if (isOpen && formData.length > 0) {
      fetchAudits();
    }
  }, [isOpen, formData]);

  useEffect(() => {
    if (isOpen) {
      const initialData = JSON.parse(JSON.stringify(selectedCharges)).map(charge => ({
        ...charge,
        invoice_number: charge.invoice_number || '',
        invoice_date: charge.invoice_date || '',
        payment_request_no: charge.payment_request_no || '',
        payment_request_status: charge.payment_request_status || '',
        purchase_book_no: charge.purchase_book_no || '',
        purchase_book_status: charge.purchase_book_status || '',
        sharedWith: (charge.sharedWith || []).map(item => 
            typeof item === 'string' ? { jobNo: item, amount: 0 } : item
        ),
        sharedGroupId: charge.sharedGroupId || '',
        revenue: {
          ...(charge.revenue || {}),
          isGst: (charge.revenue && charge.revenue.isGst !== undefined) ? charge.revenue.isGst : true,
          partyType: charge.revenue?.partyType || 'Customer',
          partyName: charge.revenue?.partyName || importerName || ''
        },
        cost: {
          ...(charge.cost || {}),
          isGst: (charge.cost && charge.cost.isGst !== undefined) ? charge.cost.isGst : true,
          partyType: charge.cost?.partyType || 'Vendor',
          tdsCategory: charge.cost?.tdsCategory || '94C'
        }
      }));
      setFormData(initialData);
      setPanelOpen(selectedCharges.reduce((acc, _, i) => ({ ...acc, [i]: 'cost' }), {}));
      setUploadIndex(null);

      // Trigger a one-time calculation for both sections to ensure consistency when modal opens
      setTimeout(() => {
        initialData.forEach((_, i) => {
          handleFieldChange(i, 'category', initialData[i].category);
        });
      }, 100);
    }
  }, [isOpen, selectedCharges]);

  if (!isOpen) return null;

  const extractFileName = (url) => {
    try {
        if (!url) return "File";
        const parts = url.split("/");
        return decodeURIComponent(parts[parts.length - 1]);
    } catch (error) {
        return "File";
    }
  };

  const handleFieldChange = (index, field, value, section = null) => {
    setFormData(prev => {
      const updated = [...prev];
      if (!updated[index]) return prev;

      if (section) {
        updated[index][section] = updated[index][section] || {};
        updated[index][section][field] = value;
        
        // Synchronize 'url' (attachments) between revenue and cost
        if (field === 'url' || field === 'url_draft' || field === 'url_final') {
          const otherSection = section === 'revenue' ? 'cost' : 'revenue';
          updated[index][otherSection] = updated[index][otherSection] || {};
          updated[index][otherSection][field] = value;
        }
        
        // Auto-populate TDS if selecting a shipping line or CFS or transporter
        if (section === 'cost' && field === 'partyName') {
          const partyType = updated[index][section].partyType?.toUpperCase();
          const normName = value?.trim().toUpperCase();
          
          let searchList = [];
          if (partyType === 'TRANSPORTER') searchList = transporters;
          else if (partyType === 'VENDOR') searchList = suppliers;
          else if (partyType === 'IMPORTER' || partyType === 'CUSTOMER') searchList = organizations;
          else if (partyType === 'AGENT' || partyType === 'OTHERS') searchList = shippingLines;
          else if (partyType === 'CFS') searchList = cfsList;
          else if (partyType === 'GENERAL ORG') searchList = generalOrgs;

          let matchedSL = searchList.find(sl => sl.name?.trim().toUpperCase() === normName);
          if (!matchedSL) {
            const allParties = [...shippingLines, ...suppliers, ...organizations, ...cfsList, ...transporters, ...generalOrgs];
            matchedSL = allParties.find(sl => sl.name?.trim().toUpperCase() === normName);
          }

          if (matchedSL && matchedSL.tds_percent > 0) {
            updated[index][section].isTds = true;
            updated[index][section].tdsPercent = matchedSL.tds_percent;
          }
        }

        // Auto-populate Payable To if type is 'Others' in Cost section
        if (section === 'cost' && field === 'partyType' && value === 'Others' && shippingLineAirline) {
          updated[index][section].partyName = shippingLineAirline;
        }

        // Auto-populate Payable To if type is 'Importer' in Cost section
        if (section === 'cost' && field === 'partyType' && value === 'Importer' && importerName) {
          updated[index][section].partyName = importerName;
        }

        // Auto-populate Payable To if type is 'Custom Duty' in Cost section
        if (section === 'cost' && field === 'partyType' && value === 'Custom Duty') {
          updated[index][section].partyName = 'CUSTOM DUTY';
        }
      } else {
        updated[index][field] = value;
      }

      // --- CALCULATION LOGIC ---
      const fieldsToTriggerRecalc = ['qty', 'rate', 'isGst', 'gstRate', 'isTds', 'tdsPercent', 'exchangeRate', 'partyName', 'basicAmount', 'category'];
      if (fieldsToTriggerRecalc.includes(field)) {
        const affectedSections = section ? [section] : ['revenue', 'cost'];
        
        affectedSections.forEach(secKey => {
          const sectionRef = updated[index][secKey];
          if (!sectionRef) return;

          const qty = parseFloat(sectionRef.qty) || 0;
          const rate = parseFloat(sectionRef.rate) || 0;
          const exRate = parseFloat(sectionRef.exchangeRate) || 1;
          
          // GST Rate
          const gstRate = parseFloat(sectionRef.gstRate) || 18;
          const includeGst = sectionRef.isGst !== false;
          
          let amount = qty * rate;
          let derivedBasic, derivedGst;

          if (updated[index].category === 'Margin') {
              if (includeGst) {
                  // EXCLUSIVE LOGIC for Margin
                  if (field === 'basicAmount' && section === secKey) {
                      derivedBasic = parseFloat(value) || 0;
                  } else if (['qty', 'rate'].includes(field)) {
                      derivedBasic = amount;
                  } else {
                      derivedBasic = parseFloat(sectionRef.basicAmount) || 0;
                  }
                  derivedGst = derivedBasic * (gstRate / 100);
                  amount = derivedBasic + derivedGst; // Total = Basic + GST
              } else {
                  derivedBasic = amount;
                  derivedGst = 0;
              }
          } else if (updated[index].category === 'Reimbursement') {
              // REIMBURSEMENT LOGIC: No GST calculation, but Basic is used for TDS
              if (field === 'basicAmount' && section === secKey) {
                  derivedBasic = parseFloat(value) || 0;
              } else if (['qty', 'rate', 'gstRate'].includes(field)) {
                  derivedBasic = Number((amount / (1 + (gstRate / 100))).toFixed(2));
              } else {
                  derivedBasic = parseFloat(sectionRef.basicAmount) || 0;
              }
              derivedGst = 0;
          } else {
              // INCLUSIVE LOGIC for other categories
              if (field === 'basicAmount' && section === secKey) {
                  derivedBasic = parseFloat(value) || 0;
              } else if (['qty', 'rate', 'gstRate', 'isGst'].includes(field)) {
                  derivedBasic = Number((amount / (1 + (gstRate / 100))).toFixed(2));
              } else {
                  derivedBasic = parseFloat(sectionRef.basicAmount) || 0;
              }
              derivedGst = amount - derivedBasic;
          }

          sectionRef.amount = amount;
          sectionRef.amountINR = amount * exRate;
          sectionRef.gstAmount = derivedGst;
          sectionRef.basicAmount = derivedBasic;

          // GST Split Logic based on GSTIN (24 = Gujarat)
          const partyName = sectionRef.partyName;
          const partyType = sectionRef.partyType?.toUpperCase();
          const normName = partyName?.trim().toUpperCase();

          let searchList = [];
          if (partyType === 'TRANSPORTER') searchList = transporters;
          else if (partyType === 'VENDOR') searchList = suppliers;
          else if (partyType === 'IMPORTER' || partyType === 'CUSTOMER') searchList = organizations;
          else if (partyType === 'AGENT' || partyType === 'OTHERS') searchList = shippingLines;
          else if (partyType === 'CFS') searchList = cfsList;
          else if (partyType === 'GENERAL ORG') searchList = generalOrgs;

          let party = searchList.find(p => p.name?.trim().toUpperCase() === normName);
          if (!party) {
            const allParties = [...shippingLines, ...suppliers, ...organizations, ...cfsList, ...transporters, ...generalOrgs];
            party = allParties.find(p => p.name?.trim().toUpperCase() === normName);
          }
          
          const branchIndex = sectionRef.branchIndex || 0;
          const gstin = party?.branches?.[branchIndex]?.gst || "";
          
          if (gstin.startsWith("24")) {
            sectionRef.cgst = derivedGst / 2;
            sectionRef.sgst = derivedGst / 2;
            sectionRef.igst = 0;
          } else {
            sectionRef.cgst = 0;
            sectionRef.sgst = 0;
            sectionRef.igst = derivedGst;
          }

          // TDS Calculation: ALWAYS on the GST-exclusive Basic Amount
          const isTds = sectionRef.isTds || false;
          const tdsPercent = parseFloat(sectionRef.tdsPercent) || 0;
          if (isTds) {
            // TDS is calculated on the basicAmount (which for Reimbursement is now Amount / 1.18)
            sectionRef.tdsAmount = sectionRef.basicAmount * (tdsPercent / 100);
          } else {
            sectionRef.tdsAmount = 0;
          }

          // Net Payable Calculation:
          // "Include GST" (Checked): Net = Total Amount - TDS
          // "Exclude GST" (Unchecked): Net = Basic Amount - TDS
          // For Reimbursement: Always use Total Amount - TDS
          if (updated[index].category === 'Reimbursement' || includeGst) {
            sectionRef.netPayable = Math.round(amount - sectionRef.tdsAmount);
          } else {
            sectionRef.netPayable = Math.round(sectionRef.basicAmount - sectionRef.tdsAmount);
          }
        });
      }
      return updated;
    });

    // Side effects (dropdowns) outside the functional update
    if (section) {
      if (field === 'partyName') {
        setActiveDropdown({ index, section });
      } else if (field === 'partyType') {
        setActiveDropdown({ index: null, section: null });
      }
    }
  };

  const handleSelectParty = (index, section, item) => {
    // To avoid race conditions, we perform all updates in a single logic block
    // We update partyName and branchIndex together, then trigger any side effects
    
    const updated = [...formData];
    const sectionRef = updated[index][section];
    
    sectionRef.partyName = item.name;
    sectionRef.branchIndex = 0;
    
    // Trigger any auto-populate logic (TDS, etc.)
    if (section === 'cost') {
      const allParties = [...shippingLines, ...suppliers, ...organizations, ...cfsList, ...transporters, ...generalOrgs];
      const matchedSL = allParties.find(sl => sl.name?.toUpperCase() === item.name?.toUpperCase());
      if (matchedSL && matchedSL.tds_percent > 0) {
        sectionRef.isTds = true;
        sectionRef.tdsPercent = matchedSL.tds_percent;
      }
    }
    
    // Now trigger the standard recalc logic (simulating call to handleFieldChange)
    // We reuse the updated object as much as possible
    setFormData(updated);
    
    // Finally, trigger the recalc by calling handleFieldChange with the 'branchIndex' update
    // which will use the state resulting from the setFormData above.
    // NOTE: Using a 10ms timeout to ensure setFormData has processed in the React cycle
    setTimeout(() => {
      handleFieldChange(index, 'branchIndex', 0, section);
    }, 10);
    
    setActiveDropdown({ index: null, section: null });
  };

  const handleCopyFromCost = (index) => {
    const updated = [...formData];
    const cost = updated[index].cost || {};
    const revenue = { 
      ...(updated[index].revenue || {}),
      basis: cost.basis,
      qty: cost.qty,
      unit: cost.unit,
      rate: cost.rate,
      currency: cost.currency,
      exchangeRate: cost.exchangeRate || 1,
      isGst: cost.isGst !== undefined ? cost.isGst : true,
      gstRate: cost.gstRate || 18,
      chargeDescription: cost.chargeDescription,
      partyName: cost.partyName,
      partyType: cost.partyType,
      branchIndex: cost.branchIndex,
      branchCode: cost.branchCode
    };
    
    // Recalculate everything for revenue
    const qty = parseFloat(revenue.qty) || 0;
    const rate = parseFloat(revenue.rate) || 0;
    const exRate = parseFloat(revenue.exchangeRate) || 1;
    const amount = qty * rate;
    
    revenue.amount = amount;
    revenue.amountINR = amount * exRate;

    const gstRate = parseFloat(revenue.gstRate) || 18;
    const isMargin = updated[index].category === 'Margin';
    const isReimbursement = updated[index].category === 'Reimbursement';
    const derivedBasic = isMargin ? amount : Number((amount / (1 + (gstRate / 100))).toFixed(2));
    const derivedGst = (isMargin || isReimbursement) ? 0 : (amount - derivedBasic);
    
    revenue.gstAmount = derivedGst;
    revenue.basicAmount = derivedBasic;

    updated[index].revenue = revenue;
    setFormData(updated);
  };
  
  const handleCopyToRevenue = (index) => {
    const updated = [...formData];
    const cost = updated[index].cost || {};
    const revenue = { 
      ...(updated[index].revenue || {}),
      basis: cost.basis,
      qty: cost.qty,
      unit: cost.unit,
      rate: cost.rate,
      currency: cost.currency,
      exchangeRate: cost.exchangeRate || 1,
      isGst: cost.isGst !== undefined ? cost.isGst : true,
      gstRate: cost.gstRate || 18,
      chargeDescription: cost.chargeDescription,
      partyName: cost.partyName,
      partyType: cost.partyType,
      branchIndex: cost.branchIndex,
      branchCode: cost.branchCode
    };
    
    // Recalculate everything for revenue
    const qty = parseFloat(revenue.qty) || 0;
    const rate = parseFloat(revenue.rate) || 0;
    const exRate = parseFloat(revenue.exchangeRate) || 1;
    const amount = qty * rate;
    const isMargin = updated[index].category === 'Margin';
    const isReimbursement = updated[index].category === 'Reimbursement';
    
    revenue.amount = amount;
    revenue.amountINR = amount * exRate;

    const gstRate = parseFloat(revenue.gstRate) || 18;
    const derivedBasic = isMargin ? amount : Number((amount / (1 + (gstRate / 100))).toFixed(2));
    const derivedGst = (isMargin || isReimbursement) ? 0 : (amount - derivedBasic);
    
    revenue.gstAmount = derivedGst;
    revenue.basicAmount = derivedBasic;

    updated[index].revenue = revenue;
    setFormData(updated);
  };

  const handleSave = (shouldClose = true) => {
    onSave(formData, shouldClose);
  };

  const togglePanel = (idx, panel) => {
    setPanelOpen(prev => ({
      ...prev,
      [idx]: prev[idx] === panel ? null : panel
    }));
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0.00';
    return Number(num).toFixed(2);
  };

  const handleCopy = (event, text) => {
    event.stopPropagation();
    if (!text || text === "N/A") return;
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      navigator.clipboard
        .writeText(text)
        .then(() => console.log("Copied:", text))
        .catch((err) => console.error("Copy failed:", err));
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        console.log("Copied (fallback):", text);
      } catch (err) {
        console.error("Fallback failed:", err);
      }
      document.body.removeChild(textArea);
    }
  };
  const findPartyDetails = (row) => {
    const partyName = row.cost?.partyName;
    const partyType = row.cost?.partyType?.toUpperCase();
    const normName = partyName?.trim().toUpperCase();

    let searchList = [];
    if (partyType === 'TRANSPORTER') searchList = transporters;
    else if (partyType === 'VENDOR') searchList = suppliers;
    else if (partyType === 'IMPORTER' || partyType === 'CUSTOMER') searchList = organizations;
    else if (partyType === 'AGENT' || partyType === 'OTHERS') searchList = shippingLines;
    else if (partyType === 'CFS') searchList = cfsList;
    else if (partyType === 'GENERAL ORG') searchList = generalOrgs;

    let partyDetails = searchList.find(p => p.name?.trim().toUpperCase() === normName);
    if (!partyDetails) {
      const allParties = [...shippingLines, ...suppliers, ...organizations, ...cfsList, ...transporters, ...generalOrgs];
      partyDetails = allParties.find(p => p.name?.trim().toUpperCase() === normName);
    }
    return partyDetails;
  };

  const handleBulkPurchaseBook = async () => {
    // Collect all charges that don't have a PB yet
    const eligible = formData.filter(row => !row.purchase_book_no || row.purchase_book_status === 'Rejected');
    if (eligible.length === 0) {
      alert("No eligible charges to group into a Purchase Book.");
      return;
    }

    let allCharges = [...eligible];
    const sharedGroupIds = eligible.map(r => r.sharedGroupId).filter(Boolean);
    
    if (sharedGroupIds.length > 0) {
      try {
        const res = await axios.post(`${process.env.REACT_APP_API_STRING}/charges/by-shared-groups`, { groupIds: sharedGroupIds }, { withCredentials: true });
        if (res.data.success) {
          const fetchedCharges = res.data.data;
          const existingIds = new Set(eligible.map(r => r._id.toString()));
          const newCharges = fetchedCharges.filter(c => !existingIds.has(c._id.toString()) && (!c.purchase_book_no || c.purchase_book_status === 'Rejected'));
          allCharges = [...allCharges, ...newCharges];
        }
      } catch (err) {
        console.error("Error fetching bifurcated shared charges", err);
      }
    }

    // Check if they all have the same vendor
    const firstVendor = allCharges[0].cost?.partyName;
    const sameVendor = allCharges.every(row => row.cost?.partyName === firstVendor);
    if (!sameVendor) {
       if (!window.confirm("Charges have different vendors. Are you sure you want to group them?")) return;
    }

    // Prepare data for PurchaseBookModal
    const firstRow = allCharges[0];
    const charges = allCharges.map(row => {
        const cost = row.cost || {};
        const rate = parseFloat(cost.gstRate) || 18;
        const amt = parseFloat(cost.amount || cost.amountINR) || 0;
        const includeGst = cost.isGst || false;
        let basic = parseFloat(cost.basicAmount);
        let totalGst = parseFloat(cost.gstAmount);
        
        if (isNaN(basic)) {
          if (includeGst) {
            basic = amt / (1 + (rate / 100));
            totalGst = amt - basic;
          } else {
            basic = amt;
            totalGst = amt * (rate / 100);
          }
        }

        const partyDetails = findPartyDetails(row);
        const branch = partyDetails?.branches?.[cost.branchIndex || 0] || {};
        const isGujarat = branch.gst?.startsWith('24');
        const isReimbursement = (row.category || '').toUpperCase() === 'REIMBURSEMENT' || row.isReimbursement;
        if (isReimbursement) {
          basic = amt;
          totalGst = 0;
        }

        return {
          chargeHeading: row.chargeHead,
          chargeId: row._id,
          taxableValue: basic,
          gstPercent: isReimbursement ? 0 : rate,
          cgst: isGujarat ? totalGst / 2 : 0,
          sgst: isGujarat ? totalGst / 2 : 0,
          igst: !isGujarat ? totalGst : 0,
          tdsAmount: cost.tdsAmount || 0,
          netPayable: cost.netPayable || (basic + totalGst - (cost.tdsAmount || 0)),
          totalAmount: basic + totalGst,
          chargeDescription: row.cost?.chargeDescription || '',
          chargeHeadCategory: row.category,
          tdsCategory: row.cost?.tdsCategory || '94C',
          jobId: row.jobId || parentId,
          chargeRef: row._id,
          jobRef: row.jobId || parentId,
          jobNo: row.jobDisplayNumber || jobDisplayNumber
        };
    });

    const partyDetails = findPartyDetails(firstRow);
    setPurchaseBookData({
      partyName: firstVendor,
      partyDetails,
      charges: charges,
      invoice_number: firstRow.invoice_number,
      invoice_date: firstRow.invoice_date,
      cthNo: jobCthNo,
      jobDisplayNumber,
      branchIndex: firstRow.cost?.branchIndex || 0,
      jobId: parentId,
      awbBlNo: awbBlNo
    });
  };

  return createPortal(
    <div className="charges-edit-modal-overlay charges-active" onMouseDown={() => setActiveDropdown({ index: null, section: null })}>
      <div className="charges-edit-modal" ref={modalRef} onMouseDown={(e) => e.stopPropagation()}>
        <div className="charges-modal-title">Edit Charge</div>
        <div className="charges-modal-body">
          {formData.length > 1 && (
            <div style={{ marginBottom: '15px', padding: '12px', background: '#f0f7ff', borderRadius: '6px', border: '1px solid #cce3ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1565c0' }}>Bulk Purchase Book Entry</div>
                <div style={{ fontSize: '11px', color: '#666' }}>Combine all {formData.length} charges into a single entry number.</div>
              </div>
              <button 
                type="button" 
                className="charges-upload-btn"
                style={{ backgroundColor: '#1976d2', color: '#fff', fontSize: '12px', padding: '6px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                onClick={handleBulkPurchaseBook}
              >
                Generate Single PB for All
              </button>
            </div>
          )}
          {formData.map((row, i) => {
            const hasPR = row.payment_request_no && String(row.payment_request_no).trim().length > 0;
            const hasPB = row.purchase_book_no && String(row.purchase_book_no).trim().length > 0;
            
            const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
            const role = (user?.role || "").toLowerCase();
            const isAuth = role === "admin" || role === "head_of_department" || role === "hod";
            
            const hasActivePR = row.payment_request_no && row.payment_request_status !== 'Rejected';
            const hasActivePB = row.purchase_book_no && row.purchase_book_status !== 'Rejected';
            const isIndividualLocked = (hasActivePR || hasActivePB) && !isAuth;
            const effectiveReadOnly = readOnly || isIndividualLocked;

            return (
            <div key={row._id || i} style={{ marginBottom: formData.length > 1 ? '30px' : '0' }}>
              {isIndividualLocked && (
                <div style={{ background: '#fff9c4', color: '#f57f17', padding: '6px 12px', borderRadius: '4px', marginBottom: '10px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #fbc02d' }}>
                  🔒 This charge is locked because a Payment Request or Purchase Book number has been generated.
                </div>
              )}
              <div className="charges-form-section-new">
                <div className="charges-form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginRight: '30px', gap: '10px 20px' }}>
                  <div className="charges-form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="charges-form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Charge {row.isPurchaseBookMandatory && <span style={{ fontSize: '9px', background: '#ffebee', color: '#c62828', padding: '1px 6px', borderRadius: '4px', marginLeft: '8px', border: '1px solid #ef9a9a' }}>PB MANDATORY</span>}</span>
                      {isAuth && (
                        <IconButton 
                            size="small" 
                            onClick={() => fetchChargeLogs(row._id, row.chargeHead)}
                            title="View Edit Logs"
                            style={{ padding: '2px' }}
                        >
                            <HistoryIcon style={{ fontSize: '16px', color: '#1976d2' }} />
                        </IconButton>
                      )}
                    </span>
                    <div className="charges-form-input-search">
                      <input type="text" readOnly className="charges-form-input" style={{ background: '#f5f8fc', color: '#1a3a5c', fontWeight: 'bold' }} value={row.chargeHead || ''} />
                      <button type="button" className="charges-search-btn" disabled={effectiveReadOnly}>🔍</button>
                    </div>
                    {row.createdBy && (
                      <div style={{ fontSize: '10px', color: '#666', fontStyle: 'italic', marginTop: '2px', textAlign: 'right' }}>
                        Created by: {row.createdBy.first_name} {row.createdBy.last_name}
                      </div>
                    )}
                  </div>
                  <div className="charges-form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="charges-form-label">Category</span>
                    <select disabled={effectiveReadOnly} value={row.category || ''} onChange={e => handleFieldChange(i, 'category', e.target.value)}>
                      <option value="">-- Category --</option>
                      <option>Reimbursement</option>
                      <option>Margin</option>
                    </select>
                  </div>

                  <div className="charges-form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="charges-form-label">Invoice Number</span>
                    <input type="text" disabled={effectiveReadOnly} value={row.invoice_number || ''} onChange={e => handleFieldChange(i, 'invoice_number', e.target.value)} />
                  </div>
                  <div className="charges-form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="charges-form-label">Invoice Date</span>
                    <input type="date" disabled={effectiveReadOnly} value={row.invoice_date || ''} onChange={e => handleFieldChange(i, 'invoice_date', e.target.value)} />
                  </div>

                  <div className="charges-form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="charges-form-label">SAC/HSN code</span>
                    <input type="text" disabled={effectiveReadOnly} placeholder="e.g. 996511" value={row.sacHsn || ''} onChange={e => handleFieldChange(i, 'sacHsn', e.target.value)} />
                  </div>
                  <div className="charges-form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="charges-form-label">Shared with Jobs</span>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="text" 
                        disabled={effectiveReadOnly} 
                        placeholder="Type job number to link..." 
                        value={jobSearchTerm} 
                        onChange={e => handleJobSearch(e.target.value)} 
                        style={{ width: '100%' }}
                      />
                      {jobSearchResults.length > 0 && (
                        <div className="charges-dropdown" style={{ display: 'block', top: '100%', left: 0, right: 0, maxHeight: '200px', overflowY: 'auto', zIndex: 1000 }}>
                          {jobSearchResults.map(job => (
                            <div 
                              key={job._id} 
                              className="charges-dropdown-item" 
                              onClick={() => addSharedJob(i, job.job_number)}
                              style={{ display: 'flex', flexDirection: 'column', padding: '8px' }}
                            >
                              <span style={{ fontWeight: 'bold' }}>{job.job_number} {job.job_no ? `(${job.job_no})` : ''}</span>
                              <span style={{ fontSize: '10px', color: '#666' }}>{job.importer} | {job.branch_code}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                      {(row.sharedWith || []).map((sharedItem, sIdx) => {
                        const jobNo = typeof sharedItem === 'string' ? sharedItem : sharedItem.jobNo;
                        const amount = typeof sharedItem === 'string' ? 0 : (sharedItem.amount || 0);
                        return (
                          <div key={jobNo} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f5f8fc', padding: '4px 8px', borderRadius: '4px', border: '1px solid #d0e1f9' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1565c0', minWidth: '100px' }}>{jobNo}</span>
                            <span style={{ fontSize: '11px', color: '#666' }}>Amount:</span>
                            <input 
                                type="number"
                                disabled={effectiveReadOnly}
                                style={{ width: '80px', padding: '2px 4px', fontSize: '11px', border: '1px solid #ccc', borderRadius: '3px' }}
                                value={amount}
                                onChange={(e) => {
                                    const newShared = [...(row.sharedWith || [])];
                                    newShared[sIdx] = { jobNo, amount: e.target.value };
                                    handleFieldChange(i, 'sharedWith', newShared);
                                }}
                            />
                            {!effectiveReadOnly && (
                                <button type="button" onClick={() => removeSharedJob(i, jobNo)} style={{ background: 'none', border: 'none', color: '#d32f2f', cursor: 'pointer', fontSize: '14px', marginLeft: 'auto' }}>×</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="charges-form-row" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="charges-form-label" style={{ marginBottom: 0 }}>Is Header?</span>
                    <input type="checkbox" checked={row.isHeader || false} disabled={effectiveReadOnly} onChange={e => handleFieldChange(i, 'isHeader', e.target.checked)} />
                  </div>

                  {/* Tally Numbers & Status Row */}
                  <div className="charges-form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="charges-form-label" style={{ color: '#1565c0', fontWeight: 'bold' }}>PB No</span>
                    <div className="charges-ep-inline">
                        <input type="text" readOnly disabled={readOnly} style={{ background: '#e3f2fd', color: '#1565c0', width: '60%' }} value={row.purchase_book_no || ''} />
                        {row.purchase_book_no && (
                          <>
                            <IconButton 
                                size="small" 
                                color="primary" 
                                onClick={(e) => handleCopy(e, row.purchase_book_no)}
                                style={{ marginLeft: '4px' }}
                                title="Copy PB No"
                            >
                                <ContentCopyIcon style={{ fontSize: '16px' }} />
                            </IconButton>
                            <IconButton 
                                size="small" 
                                color="primary" 
                                onClick={async () => {
                                    let data = paymentDetailsAudit[row.purchase_book_no];
                                    if (!data) {
                                        try {
                                            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-payment-request-details/${encodeURIComponent(row.purchase_book_no)}`);
                                            data = res.data;
                                            setPaymentDetailsAudit(prev => ({ ...prev, [row.purchase_book_no]: data }));
                                        } catch (err) { console.error(err); alert('Could not fetch details'); return; }
                                    }
                                    generatePurchaseBookPDF(data, logo);
                                }}
                                style={{ marginLeft: '4px' }}
                                title="Print Payment Advice"
                            >
                                <PrintIcon style={{ fontSize: '18px' }} />
                            </IconButton>
                          </>
                        )}
                        <span className="ep-status-pill" style={{ 
                            marginLeft: '10px', 
                            fontSize: '11px', 
                            padding: '2px 8px', 
                            borderRadius: '10px', 
                            background: row.purchase_book_status === 'Rejected' ? '#ffebee' : (row.purchase_book_status ? '#e8f5e9' : '#f5f5f5'), 
                            color: row.purchase_book_status === 'Rejected' ? '#c62828' : (row.purchase_book_status === 'Active' || row.purchase_book_status === 'Approved' || row.purchase_book_status === 'Paid' ? '#2e7d32' : '#757575'), 
                            border: `1px solid ${row.purchase_book_status === 'Rejected' ? '#ef9a9a' : '#ddd'}`,
                            fontWeight: 'bold'
                        }}>
                            {row.purchase_book_status || 'Pending'}
                        </span>
                    </div>
                  </div>
                  <div className="charges-form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="charges-form-label" style={{ color: '#d32f2f', fontWeight: 'bold' }}>PR No</span>
                    <div className="charges-ep-inline" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                            <input type="text" readOnly disabled={readOnly} style={{ background: '#ffebee', color: '#c62828', width: '60%' }} value={row.payment_request_no || ''} />
                            {row.payment_request_no && (
                              <>
                                <IconButton 
                                    size="small" 
                                    color="error" 
                                    onClick={(e) => handleCopy(e, row.payment_request_no)}
                                    style={{ marginLeft: '4px' }}
                                    title="Copy PR No"
                                >
                                    <ContentCopyIcon style={{ fontSize: '16px' }} />
                                </IconButton>
                                <IconButton 
                                    size="small" 
                                    color="error" 
                                    onClick={async () => {
                                        let data = paymentDetailsAudit[row.payment_request_no];
                                        if (!data) {
                                            try {
                                                const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-payment-request-details/${encodeURIComponent(row.payment_request_no)}`);
                                                data = res.data;
                                                setPaymentDetailsAudit(prev => ({ ...prev, [row.payment_request_no]: data }));
                                            } catch (err) { console.error(err); alert('Could not fetch details'); return; }
                                        }
                                        generatePurchaseBookPDF(data, logo);
                                    }}
                                    style={{ marginLeft: '4px' }}
                                    title="Print Payment Advice"
                                >
                                    <PrintIcon style={{ fontSize: '18px' }} />
                                </IconButton>
                              </>
                            )}
                            <span className="ep-status-pill" style={{ 
                                marginLeft: '10px', 
                                fontSize: '11px', 
                                padding: '2px 8px', 
                                borderRadius: '10px', 
                                background: row.payment_request_status === 'Rejected' ? '#ffebee' : ((row.payment_request_status === 'Paid' || paymentDetailsAudit[row.payment_request_no]?.utrNumber) ? '#e8f5e9' : '#fff3e0'), 
                                color: row.payment_request_status === 'Rejected' ? '#c62828' : ((row.payment_request_status === 'Paid' || paymentDetailsAudit[row.payment_request_no]?.utrNumber) ? '#2e7d32' : '#ef6c00'), 
                                border: `1px solid ${row.payment_request_status === 'Rejected' ? '#ef9a9a' : '#ffe0e0'}`,
                                fontWeight: 'bold'
                            }}>
                                {row.payment_request_status === 'Rejected' ? 'Rejected' : ((row.payment_request_status === 'Paid' || paymentDetailsAudit[row.payment_request_no]?.utrNumber) ? 'Payment Done' : (row.payment_request_status || 'Pending'))}
                            </span>
                        </div>
                        {paymentDetailsAudit[row.payment_request_no]?.utrNumber && (
                            <div style={{ fontSize: '10px', color: '#2e7d32', marginTop: '4px', fontWeight: '500', display: 'flex', flexDirection: 'column' }}>
                                <span>UTR: {paymentDetailsAudit[row.payment_request_no].utrNumber}</span>
                                <span style={{ opacity: 0.8 }}>By {paymentDetailsAudit[row.payment_request_no].utrAddedBy || 'Accounts'} on {new Date(paymentDetailsAudit[row.payment_request_no].utrAddedAt).toLocaleString('en-GB')}</span>
                                {paymentDetailsAudit[row.payment_request_no].paymentReceiptUrl && (
                                    <a 
                                        href={paymentDetailsAudit[row.payment_request_no].paymentReceiptUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        style={{ 
                                            color: '#1565c0', 
                                            textDecoration: 'underline', 
                                            marginTop: '4px',
                                            fontWeight: 'bold',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <DescriptionIcon style={{ fontSize: '12px' }} /> View Payment Receipt
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                  </div>

                  <div className="charges-form-row" style={{ gridColumn: 'span 4' }}>
                    <span className="charges-form-label">Remark</span>
                    <input type="text" disabled={effectiveReadOnly} value={row.remark || ''} onChange={e => handleFieldChange(i, 'remark', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="charges-table-wrap">
                <table className="charges-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}></th>
                      <th style={{ width: '80px' }}>Basis</th>
                      <th>Qty/Unit</th>
                      <th style={{ width: '40px' }}></th>
                      <th>Rate</th>
                      <th>Total Amount</th>
                      <th>Total Amount(INR)</th>
                      <th style={{ width: '34px' }}>Ovrd</th>
                      <th style={{ width: '34px' }}>Pstd</th>
                      <th style={{ width: '26px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* --- REVENUE ROW --- */}
                    <tr style={{ cursor: 'pointer' }} onClick={() => togglePanel(i, 'rev')}>
                      <td className="charges-row-label">Revenue</td>
                      <td>{row.revenue?.basis || 'Per B/E - Per Shp'}</td>
                      <td>{row.revenue?.qty || '1.00'}</td>
                      <td>{row.revenue?.currency || 'INR'}</td>
                      <td>{formatNumber(row.revenue?.rate)}</td>
                      <td>{formatNumber(row.revenue?.amount)}</td>
                      <td>{formatNumber(row.revenue?.amountINR)}</td>
                      <td style={{ textAlign: 'center' }}><input type="checkbox" checked={row.revenue?.overrideAutoRate || false} readOnly /></td>
                      <td style={{ textAlign: 'center' }}><input type="checkbox" checked={row.revenue?.isPosted || false} readOnly /></td>
                      <td>
                        <button type="button" className="charges-arrow-btn" onClick={(e) => { e.stopPropagation(); togglePanel(i, 'rev'); }}>
                          {panelOpen[i] === 'rev' ? '▲' : '▼'}
                        </button>
                      </td>
                    </tr>
                    
                    {/* --- REVENUE EXPANDED --- */}
                    {panelOpen[i] === 'rev' && (
                      <tr className="charges-expand-row">
                        <td colSpan="10">
                          <div className="charges-expand-panel charges-open">
                            <div className="charges-ep-desc-row">
                              <span className="charges-ep-label">Charge Description</span>
                              <input type="text" className="charges-ep-desc-input" disabled={effectiveReadOnly} value={row.revenue?.chargeDescription || ''} onChange={e => handleFieldChange(i, 'chargeDescription', e.target.value, 'revenue')} />
                            </div>
                            <div className="charges-ep-desc-row">
                                <span className="charges-ep-label">Attachment</span>
                                {(() => {
                                    const row = formData[i];
                                    // Use case-insensitive check to ensure reliable detection
                                    const isShippingLine = row.chargeHead?.trim().toUpperCase() === shippingLineAirline?.trim().toUpperCase();
                                    
                                    if (!isShippingLine) {
                                        return (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                                                {Array.isArray(row.revenue?.url) && row.revenue.url.length > 0 ? (
                                                    row.revenue.url.map((url, urlIdx) => (
                                                        <Chip
                                                            key={urlIdx}
                                                            icon={<DescriptionIcon style={{ fontSize: "14px" }} />}
                                                            label={extractFileName(url)}
                                                            size="small"
                                                            onDelete={readOnlyBase ? undefined : () => {
                                                                const newUrls = row.revenue.url.filter((_, i) => i !== urlIdx);
                                                                handleFieldChange(i, 'url', newUrls, 'revenue');
                                                            }}
                                                            component="a"
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            clickable
                                                            sx={{ maxWidth: "180px", fontSize: "10px", height: "22px", backgroundColor: "#e3f2fd", color: "#1565c0" }}
                                                        />
                                                    ))
                                                ) : (
                                                    <span style={{ fontSize: '11px', color: '#8aA0b0', fontStyle: 'italic' }}>No files attached</span>
                                                )}
                                                <button type="button" className="charges-upload-btn" style={{ padding: '2px 8px' }} disabled={readOnlyBase} onClick={() => { setUploadIndex(i); setUploadSection('revenue'); }}>
                                                    {Array.isArray(row.revenue?.url) && row.revenue.url.length > 0 ? 'Edit Files' : 'Upload Files'}
                                                </button>
                                            </div>
                                        );
                                    }

                                    // For Shipping Line Charges, show categorized sections
                                    const renderCategory = (label, field, color) => {
                                        const urls = row.revenue?.[field] || [];
                                        return (
                                            <div style={{ width: '100%', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '10px', fontWeight: 'bold', minWidth: '80px', color: '#555' }}>{label}:</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
                                                    {urls.map((url, urlIdx) => (
                                                        <Chip
                                                            key={urlIdx}
                                                            icon={<DescriptionIcon style={{ fontSize: "14px" }} />}
                                                            label={extractFileName(url)}
                                                            size="small"
                                                            onDelete={readOnlyBase ? undefined : () => {
                                                                const newUrls = urls.filter((_, i) => i !== urlIdx);
                                                                handleFieldChange(i, field, newUrls, 'revenue');
                                                            }}
                                                            component="a"
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            clickable
                                                            sx={{ maxWidth: "180px", fontSize: "10px", height: "22px", backgroundColor: color, color: "#1565c0" }}
                                                        />
                                                    ))}
                                                    {urls.length === 0 && <span style={{ fontSize: '10px', color: '#8aA0b0' }}>None</span>}
                                                </div>
                                            </div>
                                        );
                                    };

                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                            {renderCategory('Draft Inv.', 'url_draft', '#fff3e0')}
                                            {renderCategory('Final Inv.', 'url_final', '#e8f5e9')}
                                            <div style={{ marginTop: '4px' }}>
                                                <button type="button" className="charges-upload-btn" style={{ padding: '2px 10px', backgroundColor: '#2e7d32', color: '#fff' }} disabled={readOnlyBase} onClick={() => { setUploadIndex(i); setUploadSection('revenue'); }}>
                                                    Upload / Edit categorized files
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="charges-ep-grid" style={{ marginRight: '30px' }}>
                              <div className="charges-ep-row">
                                <span className="charges-ep-label">Basis</span>
                                <select className="charges-ep-select" disabled={effectiveReadOnly} value={row.revenue?.basis || 'Per B/E - Per Shp'} onChange={e => handleFieldChange(i, 'basis', e.target.value, 'revenue')}>
                                  <option>Per Package</option><option>By Gross Wt</option><option>By Chg Wt</option>
                                  <option>By Volume</option><option>Per Container</option><option>Per TEU</option>
                                  <option>Per FEU</option><option>% of Other Charges</option>
                                  <option>% of Assessable Value</option><option>% of AV+Duty</option>
                                  <option>% of CIF Value</option><option>Per Vehicle</option>
                                  <option>% of Invoice Value</option><option>Per License</option>
                                  <option>Per B/E - Per Shp</option>
                                  <option>% of Product Value</option><option>Per Labour</option>
                                  <option>Per Product</option><option>By Net Wt</option><option>Per Invoice</option>
                                </select>
                              </div>
                              <div className="charges-ep-row">
                                <span className="charges-ep-label">Override Auto Rate</span>
                                <input type="checkbox" disabled={effectiveReadOnly} checked={row.revenue?.overrideAutoRate || false} onChange={e => handleFieldChange(i, 'overrideAutoRate', e.target.checked, 'revenue')} />
                              </div>
                              <div className="charges-ep-row">
                                <span className="charges-ep-label">Qty/Unit</span>
                                <div className="charges-ep-inline">
                                  <input type="number" step="0.01" disabled={effectiveReadOnly} value={row.revenue?.qty || ''} onChange={e => handleFieldChange(i, 'qty', e.target.value, 'revenue')} />
                                  <input type="text" disabled={effectiveReadOnly} value={row.revenue?.unit || ''} onChange={e => handleFieldChange(i, 'unit', e.target.value, 'revenue')} />
                                </div>
                              </div>
                              <div className="charges-ep-row">
                                <span className="charges-ep-label">Receivable Type</span>
                                <select className="charges-ep-select" disabled={effectiveReadOnly} value={row.revenue?.partyType || ''} onChange={e => handleFieldChange(i, 'partyType', e.target.value, 'revenue')}>
                                  <option>Customer</option><option>Agent</option><option>Carrier</option>
                                </select>
                              </div>
                              <div className="charges-ep-row">
                                <span className="charges-ep-label">Rate</span>
                                <div className="charges-ep-inline">
                                  <input type="number" step="0.01" disabled={effectiveReadOnly} value={row.revenue?.rate || ''} onChange={e => handleFieldChange(i, 'rate', e.target.value, 'revenue')} />
                                  <select disabled={effectiveReadOnly} value={row.revenue?.currency || 'INR'} onChange={e => handleFieldChange(i, 'currency', e.target.value, 'revenue')}>
                                    <option>INR</option><option>USD</option><option>EUR</option>
                                  </select>
                                </div>
                              </div>
                              <div className="charges-ep-row">
                                <span className="charges-ep-label">Receivable From</span>
                                <div className="charges-ep-search-container">
                                  <div className="charges-ep-search-wrap">
                                    <input 
                                      type="text" 
                                      disabled={effectiveReadOnly}
                                      value={row.revenue?.partyName || ''} 
                                      onChange={e => handleFieldChange(i, 'partyName', e.target.value, 'revenue')} 
                                      onFocus={() => !effectiveReadOnly && setActiveDropdown({ index: i, section: 'revenue' })}
                                    />
                                    <button type="button" className="charges-ep-search-btn" disabled={effectiveReadOnly}>🔍</button>
                                  </div>
                                  {activeDropdown.index === i && activeDropdown.section === 'revenue' && (row.revenue?.partyName?.length >= 2) && (
                                    <ul className="charges-ep-dropdown-list" ref={dropdownRef}>
                                      {(() => {
                                        const pType = (row.revenue?.partyType || 'Customer').toUpperCase();
                                        const searchList = (pType === 'AGENT' || pType === 'CARRIER') ? shippingLines : organizations;
                                        const filtered = searchList.filter(item => !row.revenue?.partyName || item.name.toLowerCase().includes(row.revenue.partyName.toLowerCase())).slice(0, 20);
                                        
                                        if (filtered.length === 0) {
                                          return <li className="charges-ep-dropdown-item"><span className="charges-ep-item-sub">No results found</span></li>;
                                        }
                                        
                                        return filtered.map((item, idx) => (
                                          <li key={idx} className="charges-ep-dropdown-item" onClick={() => handleSelectParty(i, 'revenue', item)}>
                                            <span className="charges-ep-item-name">{item.name}</span>
                                            <span className="charges-ep-item-sub">{item.city || 'Master Directory'}</span>
                                          </li>
                                        ));
                                      })()}
                                    </ul>
                                  )}
                                </div>
                                {row.revenue?.branchCode && <span className="charges-ep-link" style={{ marginLeft: '6px', whiteSpace: 'nowrap' }}>{row.revenue.branchCode}</span>}
                              </div>
                              <div className="charges-ep-row">
                                <span className="charges-ep-label">Total Amount</span>
                                <div className="charges-ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={row.revenue?.amountINR || 0} />
                                  <span style={{ fontSize: '11px', color: '#555', paddingLeft: '4px' }}>INR</span>
                                </div>
                              </div>
                              {(() => {
                                const party = [...shippingLines, ...suppliers].find(p => p.name?.toUpperCase() === row.revenue?.partyName?.toUpperCase());
                                if (party && party.branches?.length > 1) {
                                  return (
                                    <div className="charges-ep-row">
                                      <span className="charges-ep-label">Branch</span>
                                      <select className="charges-ep-select" disabled={effectiveReadOnly} value={row.revenue?.branchIndex || 0} onChange={e => handleFieldChange(i, 'branchIndex', parseInt(e.target.value), 'revenue')}>
                                        {party.branches.map((b, bIdx) => (
                                          <option key={bIdx} value={bIdx}>{b.branchName || `Branch ${bIdx + 1}`}</option>
                                        ))}
                                      </select>
                                    </div>
                                  );
                                }
                                return null;
                              })()}

                              {/* GST FIELDS FOR REVENUE */}
                              <div className="charges-ep-row">
                                <span className="charges-ep-label">Include GST?</span>
                                <div className="charges-ep-inline">
                                  <input type="checkbox" disabled={effectiveReadOnly} checked={row.revenue?.isGst !== false} onChange={e => handleFieldChange(i, 'isGst', e.target.checked, 'revenue')} />
                                  {row.revenue?.isGst !== false && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <input type="number" disabled={effectiveReadOnly} style={{ width: '50px' }} value={row.revenue?.gstRate ?? 18} onChange={e => handleFieldChange(i, 'gstRate', e.target.value, 'revenue')} />
                                      <span style={{ fontSize: '11px' }}>%</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="charges-ep-row">
                                <span className="charges-ep-label">Basic Amount</span>
                                <div className="charges-ep-inline">
                                  <input type="number" step="0.01" disabled={effectiveReadOnly} className="ep-input-small" style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '2px 6px', width: '100%' }} value={row.revenue?.basicAmount || ''} onChange={e => handleFieldChange(i, 'basicAmount', e.target.value, 'revenue')} />
                                </div>
                              </div>
                              <div className="charges-ep-row">
                                <span className="charges-ep-label">GST Amount</span>
                                <div className="charges-ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={formatNumber(row.revenue?.gstAmount)} />
                                </div>
                              </div>
                            </div>
                            <div className="charges-ep-copy-row" style={{ gap: '15px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                Copy to Cost <input type="checkbox" disabled={effectiveReadOnly} checked={row.copyToCost || false} onChange={e => handleFieldChange(i, 'copyToCost', e.target.checked)} />
                              </div>
                              <button 
                                type="button" 
                                className="copy-btn" 
                                style={{ 
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px', 
                                  padding: '1px 8px', 
                                  backgroundColor: '#fff', 
                                  border: '1px solid #1976d2', 
                                  borderRadius: '4px',
                                  cursor: readOnly ? 'not-allowed' : 'pointer',
                                  color: readOnly ? '#aaa' : '#1976d2',
                                  fontWeight: '600',
                                  transition: 'all 0.2s'
                                }}
                                disabled={readOnly}
                                onClick={(e) => { e.stopPropagation(); handleCopyFromCost(i); }}
                                onMouseOver={(e) => { if (!readOnly) e.currentTarget.style.backgroundColor = '#f5faff'; }}
                                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                              >
                                <ContentCopyIcon style={{ fontSize: '13px' }} /> Copy from Cost
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* --- COST ROW --- */}
                    <tr style={{ cursor: 'pointer' }} onClick={() => togglePanel(i, 'cost')}>
                      <td className="charges-row-label">Cost</td>
                      <td>{row.cost?.basis || 'Per B/E - Per Shp'}</td>
                      <td>{row.cost?.qty || '1.00'}</td>
                      <td>{row.cost?.currency || 'INR'}</td>
                      <td>{formatNumber(row.cost?.rate)}</td>
                      <td>{formatNumber(row.cost?.amount)}</td>
                      <td>{formatNumber(row.cost?.amountINR)}</td>
                      <td style={{ textAlign: 'center' }}><input type="checkbox" checked={row.cost?.overrideAutoRate || false} readOnly /></td>
                      <td style={{ textAlign: 'center' }}><input type="checkbox" checked={row.cost?.isPosted || false} readOnly /></td>
                      <td>
                        <button type="button" className="charges-arrow-btn" onClick={(e) => { e.stopPropagation(); togglePanel(i, 'cost'); }}>
                          {panelOpen[i] === 'cost' ? '▲' : '▼'}
                        </button>
                      </td>
                    </tr>

                    {/* --- COST EXPANDED --- */}
                    {panelOpen[i] === 'cost' && (
                      <tr className="charges-expand-row">
                        <td colSpan="10">
                          <div className="charges-expand-panel charges-open">
                            <div className="charges-ep-desc-row">
                              <span className="charges-ep-label">Charge Description</span>
                              <input type="text" className="charges-ep-desc-input" disabled={effectiveReadOnly} value={row.cost?.chargeDescription || ''} onChange={e => handleFieldChange(i, 'chargeDescription', e.target.value, 'cost')} />
                            </div>
                            <div className="charges-ep-desc-row" style={{ backgroundColor: '#f8f9fa', padding: '4px', borderRadius: '4px', border: '1px solid #e9ecef', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '10px' }}>
                                    <span style={{ fontSize: '10px', color: '#666', fontWeight: 'bold', minWidth: '120px' }}>Tally: Description of Service</span>
                                    <input type="text" readOnly style={{ flex: 1, fontSize: '10px', height: '20px', background: 'transparent', border: 'none', color: '#1976d2' }} value={row.cost?.partyName || ''} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '10px', borderLeft: '1px solid #dee2e6', paddingLeft: '10px' }}>
                                    <span style={{ fontSize: '10px', color: '#666', fontWeight: 'bold', minWidth: '110px' }}>Tally: Charge Heading</span>
                                    <input type="text" readOnly style={{ flex: 1, fontSize: '10px', height: '20px', background: 'transparent', border: 'none', color: '#1976d2' }} value={row.chargeHead || ''} />
                                </div>
                            </div>
                            <div className="charges-ep-desc-row">
                                <span className="charges-ep-label">Attachment</span>
                                {(() => {
                                    const row = formData[i];
                                    // Use case-insensitive check to ensure reliable detection
                                    const isShippingLine = row.chargeHead?.trim().toUpperCase() === shippingLineAirline?.trim().toUpperCase();
                                    
                                    if (!isShippingLine) {
                                        return (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                                                {Array.isArray(row.cost?.url) && row.cost.url.length > 0 ? (
                                                    row.cost.url.map((url, urlIdx) => (
                                                        <Chip
                                                            key={urlIdx}
                                                            icon={<DescriptionIcon style={{ fontSize: "14px" }} />}
                                                            label={extractFileName(url)}
                                                            size="small"
                                                            onDelete={readOnlyBase ? undefined : () => {
                                                                const newUrls = row.cost.url.filter((_, i) => i !== urlIdx);
                                                                handleFieldChange(i, 'url', newUrls, 'cost');
                                                            }}
                                                            component="a"
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            clickable
                                                            sx={{ maxWidth: "180px", fontSize: "10px", height: "22px", backgroundColor: "#e3f2fd", color: "#1565c0" }}
                                                        />
                                                    ))
                                                ) : (
                                                    <span style={{ fontSize: '11px', color: '#8aA0b0', fontStyle: 'italic' }}>No files attached</span>
                                                )}
                                                <button type="button" className="charges-upload-btn" style={{ padding: '2px 8px' }} disabled={readOnlyBase} onClick={() => { setUploadIndex(i); setUploadSection('cost'); }}>
                                                    {Array.isArray(row.cost?.url) && row.cost.url.length > 0 ? 'Edit Files' : 'Upload Files'}
                                                </button>
                                            </div>
                                        );
                                    }

                                    // For Shipping Line Charges, show categorized sections
                                    const renderCategory = (label, field, color) => {
                                        let urls = row.cost?.[field] || [];
                                        // Merge legacy 'url' field into 'Draft' for display
                                        if (field === 'url_draft') {
                                            const legacyUrl = row.cost?.url;
                                            const legacyArr = Array.isArray(legacyUrl) ? legacyUrl : (legacyUrl ? [legacyUrl] : []);
                                            urls = [...legacyArr, ...urls];
                                        }
                                        return (
                                            <div style={{ width: '100%', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '10px', fontWeight: 'bold', minWidth: '80px', color: '#555' }}>{label}:</span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
                                                    {urls.map((url, urlIdx) => (
                                                        <Chip
                                                            key={urlIdx}
                                                            icon={<DescriptionIcon style={{ fontSize: "14px" }} />}
                                                            label={extractFileName(url)}
                                                            size="small"
                                                            onDelete={readOnlyBase ? undefined : () => {
                                                                if (field === 'url_draft') {
                                                                    const legacyUrls = row.cost?.url || [];
                                                                    if (urlIdx < legacyUrls.length) {
                                                                        const newLegacy = legacyUrls.filter((_, i) => i !== urlIdx);
                                                                        handleFieldChange(i, 'url', newLegacy, 'cost');
                                                                    } else {
                                                                        const draftIdx = urlIdx - legacyUrls.length;
                                                                        const newDraft = (row.cost?.url_draft || []).filter((_, i) => i !== draftIdx);
                                                                        handleFieldChange(i, 'url_draft', newDraft, 'cost');
                                                                    }
                                                                } else {
                                                                    const newUrls = urls.filter((_, i) => i !== urlIdx);
                                                                    handleFieldChange(i, field, newUrls, 'cost');
                                                                }
                                                            }}
                                                            component="a"
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            clickable
                                                            sx={{ maxWidth: "180px", fontSize: "10px", height: "22px", backgroundColor: color, color: "#1565c0" }}
                                                        />
                                                    ))}
                                                    {urls.length === 0 && <span style={{ fontSize: '10px', color: '#8aA0b0' }}>None</span>}
                                                </div>
                                            </div>
                                        );
                                    };

                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                            {renderCategory('Draft Inv.', 'url_draft', '#fff3e0')}
                                            {renderCategory('Tax Inv.', 'url_final', '#e8f5e9')}
                                            <div style={{ marginTop: '4px' }}>
                                                <button type="button" className="charges-upload-btn" style={{ padding: '2px 10px', backgroundColor: '#2e7d32', color: '#fff' }} disabled={readOnlyBase} onClick={() => { setUploadIndex(i); setUploadSection('cost'); }}>
                                                    Upload / Edit categorized files
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="charges-ep-grid" style={{ marginRight: '30px' }}>
                              <div className="charges-ep-row">
                                <span className="charges-ep-label">Basis</span>
                                <select className="charges-ep-select" disabled={effectiveReadOnly} value={row.cost?.basis || 'Per B/E - Per Shp'} onChange={e => handleFieldChange(i, 'basis', e.target.value, 'cost')}>
                                  <option>Per Package</option><option>By Gross Wt</option><option>By Chg Wt</option>
                                  <option>By Volume</option><option>Per Container</option><option>Per TEU</option>
                                  <option>Per FEU</option><option>% of Other Charges</option>
                                  <option>% of Assessable Value</option><option>% of AV+Duty</option>
                                  <option>% of CIF Value</option><option>Per Vehicle</option>
                                  <option>% of Invoice Value</option><option>Per License</option>
                                  <option>Per B/E - Per Shp</option>
                                  <option>% of Product Value</option><option>Per Labour</option>
                                  <option>Per Product</option><option>By Net Wt</option><option>Per Invoice</option>
                                </select>
                              </div>
                              <div className="charges-ep-row">
                                <span className="charges-ep-label">Override Auto Rate</span>
                                <input type="checkbox" disabled={effectiveReadOnly} checked={row.cost?.overrideAutoRate || false} onChange={e => handleFieldChange(i, 'overrideAutoRate', e.target.checked, 'cost')} />
                              </div>
                              <div className="charges-ep-row">
                                <span className="charges-ep-label">Qty/Unit</span>
                                <div className="charges-ep-inline">
                                  <input type="number" step="0.01" disabled={effectiveReadOnly} value={row.cost?.qty || ''} onChange={e => handleFieldChange(i, 'qty', e.target.value, 'cost')} />
                                  <input type="text" disabled={effectiveReadOnly} value={row.cost?.unit || ''} onChange={e => handleFieldChange(i, 'unit', e.target.value, 'cost')} />
                                </div>
                              </div>
                              <div className="charges-ep-row">
                                <span className="charges-ep-label">Payable Type</span>
                                <select className="charges-ep-select" disabled={effectiveReadOnly} value={row.cost?.partyType || 'Vendor'} onChange={e => handleFieldChange(i, 'partyType', e.target.value, 'cost')}>
                                  <option>Vendor</option><option>Transporter</option><option>Importer</option><option>Custom Duty</option><option>Others</option><option>Agent</option><option value="CFS">Terminal</option><option>General Org</option>
                                </select>
                              </div>
                              <div className="charges-ep-row">
                                <span className="charges-ep-label">Rate</span>
                                <div className="charges-ep-inline">
                                  <input type="number" step="0.01" disabled={effectiveReadOnly} value={row.cost?.rate || ''} onChange={e => handleFieldChange(i, 'rate', e.target.value, 'cost')} />
                                  <select disabled={effectiveReadOnly} value={row.cost?.currency || 'INR'} onChange={e => handleFieldChange(i, 'currency', e.target.value, 'cost')}>
                                    <option>INR</option><option>USD</option><option>EUR</option>
                                  </select>
                                </div>
                              </div>
                              <div className="charges-ep-row">
                                <span className="charges-ep-label">Payable To</span>
                                <div className="charges-ep-search-container">
                                  <div className="charges-ep-search-wrap">
                                    <input 
                                      type="text" 
                                      disabled={effectiveReadOnly}
                                      value={row.cost?.partyName || ''} 
                                      onChange={e => handleFieldChange(i, 'partyName', e.target.value, 'cost')} 
                                      onFocus={() => !effectiveReadOnly && setActiveDropdown({ index: i, section: 'cost' })}
                                    />
                                    <button type="button" className="charges-ep-search-btn" disabled={effectiveReadOnly}>🔍</button>
                                  </div>
                                  {activeDropdown.index === i && activeDropdown.section === 'cost' && (row.cost?.partyName?.length >= 2) && (
                                    <ul className="charges-ep-dropdown-list" ref={dropdownRef}>
                                      {(() => {
                                        const pType = (row.cost?.partyType || 'Vendor').toUpperCase();
                                        let searchList = [];
                                        if (pType === 'AGENT' || pType === 'OTHERS') searchList = shippingLines;
                                        else if (pType === 'VENDOR') searchList = suppliers;
                                        else if (pType === 'TRANSPORTER') searchList = transporters;
                                        else if (pType === 'IMPORTER') searchList = organizations;
                                        else if (pType === 'GENERAL ORG') searchList = generalOrgs;
                                        else if (pType === 'CFS') searchList = cfsList;
                                        
                                        const filtered = searchList.filter(item => !row.cost?.partyName || item.name.toLowerCase().includes(row.cost.partyName.toLowerCase())).slice(0, 20);
                                        
                                        if (filtered.length === 0) {
                                          return <li className="charges-ep-dropdown-item"><span className="charges-ep-item-sub">No results found</span></li>;
                                        }
                                        
                                        return filtered.map((item, idx) => (
                                          <li key={idx} className="charges-ep-dropdown-item" onClick={() => handleSelectParty(i, 'cost', item)}>
                                            <span className="charges-ep-item-name">{item.name}</span>
                                            <span className="charges-ep-item-sub">{item.city || 'Master Directory'}</span>
                                          </li>
                                        ));
                                      })()}
                                    </ul>
                                  )}
                                </div>
                              </div>
                              <div className="charges-ep-row">
                                <span className="charges-ep-label">Total Amount</span>
                                <div className="charges-ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={row.cost?.amountINR || 0} />
                                  <span style={{ fontSize: '11px', color: '#555', paddingLeft: '4px' }}>INR</span>
                                </div>
                              </div>
                              {(() => {
                                const partyName = row.cost?.partyName;
                                const partyType = row.cost?.partyType?.toUpperCase();
                                const normName = partyName?.trim().toUpperCase();

                                let searchList = [];
                                if (partyType === 'TRANSPORTER') searchList = transporters;
                                else if (partyType === 'VENDOR') searchList = suppliers;
                                else if (partyType === 'IMPORTER' || partyType === 'CUSTOMER') searchList = organizations;
                                else if (partyType === 'AGENT' || partyType === 'OTHERS') searchList = shippingLines;
                                else if (partyType === 'CFS') searchList = cfsList;
                                else if (partyType === 'GENERAL ORG') searchList = generalOrgs;

                                let party = searchList.find(p => p.name?.trim().toUpperCase() === normName);
                                if (!party) {
                                  const allParties = [...shippingLines, ...suppliers, ...organizations, ...cfsList, ...transporters, ...generalOrgs];
                                  party = allParties.find(p => p.name?.trim().toUpperCase() === normName);
                                }

                                if (party && party.branches?.length > 1) {
                                  return (
                                    <div className="charges-ep-row">
                                      <span className="charges-ep-label">Branch</span>
                                      <select className="charges-ep-select" disabled={effectiveReadOnly} value={row.cost?.branchIndex || 0} onChange={e => handleFieldChange(i, 'branchIndex', parseInt(e.target.value), 'cost')}>
                                        {party.branches.map((b, bIdx) => (
                                          <option key={bIdx} value={bIdx}>{b.branchName || `Branch ${bIdx + 1}`}</option>
                                        ))}
                                      </select>
                                    </div>
                                  );
                                }
                                return null;
                              })()}

                              {/* GST & TDS FIELDS FOR COST */}
                              <div className="charges-ep-row">
                                <span className="charges-ep-label">Include GST?</span>
                                <div className="charges-ep-inline">
                                  <input type="checkbox" disabled={effectiveReadOnly} checked={row.cost?.isGst !== false} onChange={e => handleFieldChange(i, 'isGst', e.target.checked, 'cost')} />
                                  {row.cost?.isGst !== false && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <input type="number" disabled={effectiveReadOnly} style={{ width: '50px' }} value={row.cost?.gstRate || ''} onChange={e => handleFieldChange(i, 'gstRate', e.target.value, 'cost')} />
                                      <span style={{ fontSize: '11px' }}>%</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="charges-ep-row">
                                <span className="charges-ep-label">Basic Amount</span>
                                <div className="charges-ep-inline">
                                  <input type="number" step="0.01" disabled={effectiveReadOnly} className="ep-input-small" style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '2px 6px', width: '100%' }} value={row.cost?.basicAmount || ''} onChange={e => handleFieldChange(i, 'basicAmount', e.target.value, 'cost')} />
                                </div>
                              </div>
                              <div className="charges-ep-row">
                                <span className="charges-ep-label">GST Amount</span>
                                <div className="charges-ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={formatNumber(row.cost?.gstAmount)} />
                                </div>
                              </div>
                              <div className="charges-ep-row">
                                <span className="charges-ep-label">Apply TDS?</span>
                                <div className="charges-ep-inline">
                                  <input type="checkbox" disabled={effectiveReadOnly} checked={row.cost?.isTds || false} onChange={e => handleFieldChange(i, 'isTds', e.target.checked, 'cost')} />
                                  {row.cost?.isTds && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <input type="number" disabled={effectiveReadOnly} style={{ width: '50px' }} value={row.cost?.tdsPercent ?? 0} onChange={e => handleFieldChange(i, 'tdsPercent', e.target.value, 'cost')} />
                                        <span style={{ fontSize: '11px' }}>%</span>
                                      </div>
                                      <select 
                                        disabled={effectiveReadOnly} 
                                        className="charges-ep-select" 
                                        style={{ fontSize: '10px', height: '22px', padding: '0 4px', width: 'auto' }}
                                        value={row.cost?.tdsCategory || '94C'} 
                                        onChange={e => handleFieldChange(i, 'tdsCategory', e.target.value, 'cost')}
                                      >
                                        <option value="94C">94C</option>
                                        <option value="94I">94I</option>
                                      </select>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="charges-ep-row">
                                <span className="charges-ep-label">TDS Amount</span>
                                <div className="charges-ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={formatNumber(row.cost?.tdsAmount)} />
                                </div>
                              </div>
                              <div className="charges-ep-row">
                                <span className="charges-ep-label" style={{ fontWeight: 'bold', color: '#d32f2f' }}>Net Payable</span>
                                <div className="charges-ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#fff9f9', fontWeight: 'bold', color: '#d32f2f', border: '1px solid #ffcdd2' }} value={Math.round(row.cost?.netPayable || 0)} />
                                </div>
                              </div>
                              <div className="charges-ep-copy-row" style={{ marginTop: '10px' }}>
                                <button 
                                  type="button" 
                                  className="copy-btn" 
                                  style={{ 
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '11px', 
                                    padding: '1px 8px', 
                                    backgroundColor: '#fff', 
                                    border: '1px solid #1976d2', 
                                    borderRadius: '4px',
                                    cursor: readOnly ? 'not-allowed' : 'pointer',
                                    color: readOnly ? '#aaa' : '#1976d2',
                                    fontWeight: '600',
                                    transition: 'all 0.2s'
                                  }}
                                  disabled={readOnly}
                                  onClick={(e) => { e.stopPropagation(); handleCopyToRevenue(i); }}
                                  onMouseOver={(e) => { if (!readOnly) e.currentTarget.style.backgroundColor = '#f5faff'; }}
                                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                                >
                                  <ContentCopyIcon style={{ fontSize: '13px' }} /> Copy to Revenue
                                </button>
                              </div>
                              <div className="charges-ep-grid" style={{ marginTop: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  {row.purchase_book_no && row.purchase_book_status !== 'Rejected' ? (
                                    <div style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '6px', 
                                      backgroundColor: '#e8f5e9', 
                                      color: '#2e7d32', 
                                      padding: '4px 10px', 
                                      borderRadius: '4px',
                                      border: '1px solid #2e7d32',
                                      fontSize: '12px',
                                      fontWeight: 'bold'
                                    }}>
                                      <span>{row.purchase_book_no}</span>
                                      <IconButton size="small" onClick={(e) => handleCopy(e, row.purchase_book_no)} sx={{ p: 0, color: '#2e7d32' }}>
                                        <ContentCopyIcon style={{ fontSize: '14px' }} />
                                      </IconButton>
                                    </div>
                                  ) : (
                                    <button 
                                      type="button" 
                                      className="charges-upload-btn" 
                                      style={{ 
                                        marginRight: '10px', 
                                        backgroundColor: '#1976d2', 
                                        color: '#fff', 
                                        borderColor: '#1565c0',
                                        fontSize: workMode === 'Purchase Book' ? '12px' : '11px',
                                        padding: workMode === 'Purchase Book' ? '6px 12px' : '4px 8px'
                                      }}
                                      onClick={() => {
                                        const partyName = row.cost?.partyName;
                                        const partyType = row.cost?.partyType?.toUpperCase();
                                        const normName = partyName?.trim().toUpperCase();

                                        let searchList = [];
                                        if (partyType === 'TRANSPORTER') searchList = transporters;
                                        else if (partyType === 'VENDOR') searchList = suppliers;
                                        else if (partyType === 'IMPORTER' || partyType === 'CUSTOMER') searchList = organizations;
                                        else if (partyType === 'AGENT' || partyType === 'OTHERS') searchList = shippingLines;
                                        else if (partyType === 'CFS') searchList = cfsList;
                                        else if (partyType === 'GENERAL ORG') searchList = generalOrgs;

                                        let partyDetails = searchList.find(p => p.name?.trim().toUpperCase() === normName);
                                        if (!partyDetails) {
                                          const allParties = [...shippingLines, ...suppliers, ...organizations, ...cfsList, ...transporters, ...generalOrgs];
                                          partyDetails = allParties.find(p => p.name?.trim().toUpperCase() === normName);
                                        }

                                        setPurchaseBookData(() => {
                                          const cost = row.cost || {};
                                          const branch = partyDetails?.branches?.[cost.branchIndex || 0] || {};
                                          const isGujarat = branch.gst?.startsWith('24');

                                          return {
                                            partyName: partyName,
                                            chargeHeading: row.chargeHead,
                                            descriptionOfServices: row.category === 'Margin' ? row.chargeHead : (partyName ? `NEW ${partyName}` : row.chargeHead),
                                            partyDetails,
                                            amount: parseFloat(cost.amount) || 0,
                                            basicAmount: parseFloat(cost.basicAmount) || parseFloat(cost.amount) || 0,
                                            taxableValue: ((row.category || '').toUpperCase() === 'REIMBURSEMENT' || row.isReimbursement) ? (parseFloat(cost.amount) || 0) : (parseFloat(cost.basicAmount) || parseFloat(cost.amount) || 0),
                                            gstAmount: parseFloat(cost.gstAmount) || 0,
                                            gstRate: ((row.category || '').toUpperCase() === 'REIMBURSEMENT' || row.isReimbursement) ? 0 : (parseFloat(cost.gstRate) || 0),
                                            cgst: isGujarat ? (parseFloat(cost.gstAmount) / 2 || 0) : 0,
                                            sgst: isGujarat ? (parseFloat(cost.gstAmount) / 2 || 0) : 0,
                                            igst: !isGujarat ? (parseFloat(cost.gstAmount) || 0) : 0,
                                            tdsAmount: cost.tdsAmount,
                                            netPayable: cost.netPayable,
                                            totalAmount: cost.totalAmount,
                                            chargeHead: row.chargeHead,
                                            invoice_number: row.invoice_number,
                                            invoice_date: row.invoice_date,
                                            cthNo: jobCthNo,
                                            jobDisplayNumber,
                                            branchIndex: cost.branchIndex || 0,
                                            chargeId: row._id,
                                            jobId: parentId,
                                            chargeHeadCategory: row.category,
                                            chargeDescription: row.cost?.chargeDescription || '',
                                            tdsCategory: row.cost?.tdsCategory || '94C',
                                            awbBlNo: awbBlNo,
                                            attachments: [
                                              ...(Array.isArray(row.cost?.url) ? row.cost.url : []),
                                              ...(Array.isArray(row.cost?.url_draft) ? row.cost.url_draft : []),
                                              ...(Array.isArray(row.cost?.url_final) ? row.cost.url_final : [])
                                            ]
                                          };
                                        });
                                      }}
                                    >
                                      Purchase book
                                    </button>
                                  )}
                                    {row.payment_request_no && row.payment_request_status !== 'Rejected' ? (
                                      <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '6px', 
                                        backgroundColor: '#e3f2fd', 
                                        color: '#1565c0', 
                                        padding: '4px 10px', 
                                        borderRadius: '4px',
                                        border: '1px solid #1565c0',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                      }}>
                                        <span>{row.payment_request_no}</span>
                                        <IconButton size="small" onClick={(e) => handleCopy(e, row.payment_request_no)} sx={{ p: 0, color: '#1565c0' }}>
                                          <ContentCopyIcon style={{ fontSize: '14px' }} />
                                        </IconButton>
                                      </div>
                                    ) : (
                                      <button 
                                      type="button" 
                                      className="charges-upload-btn" 
                                      style={{ 
                                        backgroundColor: '#d32f2f', 
                                        color: '#fff', 
                                        borderColor: '#b71c1c',
                                        fontSize: workMode === 'Payment' ? '12px' : '11px',
                                        padding: workMode === 'Payment' ? '6px 12px' : '4px 8px'
                                      }}
                                      onClick={() => {
                                        const partyName = row.cost?.partyName;
                                        const partyType = row.cost?.partyType?.toUpperCase();
                                        const normName = partyName?.trim().toUpperCase();

                                        let searchList = [];
                                        if (partyType === 'TRANSPORTER') searchList = transporters;
                                        else if (partyType === 'VENDOR') searchList = suppliers;
                                        else if (partyType === 'IMPORTER' || partyType === 'CUSTOMER') searchList = organizations;
                                        else if (partyType === 'AGENT' || partyType === 'OTHERS') searchList = shippingLines;
                                        else if (partyType === 'CFS') searchList = cfsList;
                                        else if (partyType === 'GENERAL ORG') searchList = generalOrgs;

                                        let partyDetails = searchList.find(p => p.name?.trim().toUpperCase() === normName);
                                        if (!partyDetails) {
                                          const allParties = [...shippingLines, ...suppliers, ...organizations, ...cfsList, ...transporters, ...generalOrgs];
                                          partyDetails = allParties.find(p => p.name?.trim().toUpperCase() === normName);
                                        }

                                        if (row.isPurchaseBookMandatory && (!row.purchase_book_no || row.purchase_book_status === 'Rejected')) {
                                          alert(`Purchase Book entry is mandatory for "${row.chargeHead}" before requesting payment.`);
                                          return;
                                        }
                                        setPaymentRequestData({
                                          partyName: partyName,
                                          chargeHeading: row.category === 'Margin' ? row.chargeHead : `NEW ${partyName}`,
                                          partyDetails,
                                          jobDisplayNumber,
                                          branchIndex: row.cost?.branchIndex || 0,
                                          netPayable: row.cost?.netPayable,
                                          chargeHead: row.chargeHead,
                                          chargeId: row._id,
                                          jobId: parentId,
                                          chargeHeadCategory: row.category,
                                          chargeDescription: row.cost?.chargeDescription || '',
                                          tdsCategory: row.cost?.tdsCategory || '94C',
                                          attachments: [
                                            ...(Array.isArray(row.cost?.url) ? row.cost.url : []),
                                            ...(Array.isArray(row.cost?.url_draft) ? row.cost.url_draft : []),
                                            ...(Array.isArray(row.cost?.url_final) ? row.cost.url_final : [])
                                          ]
                                        });
                                      }}
                                    >
                                      Request Payment
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            );
          })}
        </div>
        <div className="charges-modal-footer">
          {(() => {
            const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
            const role = (user?.role || "").toLowerCase();
            const isAuth = role === "admin" || role === "head_of_department" || role === "hod";
            
            const allLocked = formData.every(row => {
              const hasPR = row.payment_request_no && String(row.payment_request_no).trim().length > 0;
              const hasPB = row.purchase_book_no && String(row.purchase_book_no).trim().length > 0;
              return (hasPR || hasPB) && !isAuth;
            });
            const showUpdate = !readOnlyBase;
            return (
              <>
                {showUpdate && <button type="button" className="charges-btn" onClick={() => handleSave(false)}>Update</button>}
                {showUpdate && <button type="button" className="charges-btn" onClick={() => handleSave(true)}>Update & Close</button>}
                <button type="button" className="charges-btn" onClick={onClose} style={{ marginRight: '30px' }}>{!showUpdate ? 'Close' : 'Cancel'}</button>
              </>
            );
          })()}
        </div>
      </div>

      {uploadIndex !== null && (
        <FileUploadModal 
            isOpen={true}
            onClose={() => { setUploadIndex(null); setUploadSection(null); }}
            chargeLabel={`${formData[uploadIndex]?.chargeHead} (${uploadSection})`}
            showTypeSelection={formData[uploadIndex]?.chargeHead?.trim().toUpperCase() === shippingLineAirline?.trim().toUpperCase()}
            initialUrls={[
                ...(formData[uploadIndex]?.[uploadSection]?.url || []),
                ...(formData[uploadIndex]?.[uploadSection]?.url_draft || []),
                ...(formData[uploadIndex]?.[uploadSection]?.url_final || [])
            ]}
            categorizedUrls={{
                draft: [
                    ...(Array.isArray(formData[uploadIndex]?.[uploadSection]?.url) ? formData[uploadIndex][uploadSection].url : (formData[uploadIndex]?.[uploadSection]?.url ? [formData[uploadIndex][uploadSection].url] : [])),
                    ...(formData[uploadIndex]?.[uploadSection]?.url_draft || [])
                ],
                final: formData[uploadIndex]?.[uploadSection]?.url_final || []
            }}
            onAttach={(data, type = 'draft') => {
                const isShippingLine = formData[uploadIndex]?.chargeHead?.trim().toUpperCase() === shippingLineAirline?.trim().toUpperCase();
                
                if (isShippingLine && type === 'bulk') {
                    // Bulk update for both categories
                    handleFieldChange(uploadIndex, 'url_draft', data.draft, uploadSection);
                    handleFieldChange(uploadIndex, 'url_final', data.final, uploadSection);
                    // Clear the legacy 'url' field to migrate files to categorized fields
                    handleFieldChange(uploadIndex, 'url', [], uploadSection);
                } else if (isShippingLine) {
                    let targetField = 'url_draft';
                    if (type === 'final') targetField = 'url_final';
                    handleFieldChange(uploadIndex, targetField, data, uploadSection);
                    handleFieldChange(uploadIndex, 'url', [], uploadSection);
                } else {
                    handleFieldChange(uploadIndex, 'url', data, uploadSection);
                }
                setUploadIndex(null);
                setUploadSection(null);
            }}
        />
      )}

      <RequestPaymentModal 
        isOpen={paymentRequestData !== null}
        onClose={() => setPaymentRequestData(null)}
        initialData={paymentRequestData}
        jobNumber={jobNumber}
        jobDisplayNumber={jobDisplayNumber}
        jobYear={jobYear}
        onSuccess={async (requestNo) => {
          // Update the localized formData state with the new number
          const updated = [...formData];
          const activeIndex = formData.findIndex(c => c._id === paymentRequestData.chargeId || c.chargeHead === paymentRequestData.chargeHead);
          if (activeIndex !== -1) {
            const initialStatus = 'Pending';
            updated[activeIndex].payment_request_no = requestNo;
            updated[activeIndex].payment_request_status = initialStatus;
            
            // PERSIST IMMEDIATELY
            if (updateCharge && updated[activeIndex]._id) {
              await updateCharge(updated[activeIndex]._id, { 
                payment_request_no: requestNo, 
                payment_request_status: initialStatus 
              }, true);
            }
            
            if (fetchCharges) await fetchCharges();
            setFormData(updated);
          }
        }}
      />

      <PurchaseBookModal 
        isOpen={purchaseBookData !== null}
        onClose={() => setPurchaseBookData(null)}
        initialData={purchaseBookData}
        jobNumber={jobNumber}
        jobDisplayNumber={jobDisplayNumber}
        jobYear={jobYear}
        awbBlNo={awbBlNo}
        awbBlDate={awbBlDate}
        onSuccess={async (entryNo) => {
          // Update the localized formData state with the new number
          const updated = [...formData];
          const initialStatus = 'Pending';
          
          // Identify all charges that were included in this Purchase Book
          const chargesToUpdate = purchaseBookData.charges && purchaseBookData.charges.length > 0 
            ? purchaseBookData.charges 
            : [{ chargeId: purchaseBookData.chargeId }];

          for (const c of chargesToUpdate) {
            const activeIndex = updated.findIndex(item => item._id === c.chargeId);
            if (activeIndex !== -1) {
              updated[activeIndex].purchase_book_no = entryNo;
              updated[activeIndex].purchase_book_status = initialStatus;
              
              // PERSIST IMMEDIATELY
              if (updateCharge && updated[activeIndex]._id) {
                await updateCharge(updated[activeIndex]._id, { 
                  purchase_book_no: entryNo, 
                  purchase_book_status: initialStatus 
                }, true);
              }
            }
          }
          
          if (fetchCharges) await fetchCharges();
          setFormData(updated);
        }}
      />
      {showLogs.open && (
        <ChargeLogsModal 
            isOpen={showLogs.open} 
            onClose={() => setShowLogs({ open: false, chargeId: null, chargeName: '' })} 
            logs={chargeLogs} 
            loading={logsLoading} 
            chargeName={showLogs.chargeName} 
        />
      )}
    </div>,
    document.body
  );
};

const ChargeLogsModal = ({ isOpen, onClose, logs, loading, chargeName }) => {
    if (!isOpen) return null;
    return createPortal(
        <div className="charges-edit-modal-overlay charges-active" style={{ zIndex: 1300 }}>
            <div className="charges-edit-modal" style={{ width: '700px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                <div className="charges-modal-title" style={{ background: 'linear-gradient(to bottom, #1976d2, #1565c0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Audit Logs: {chargeName}</span>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '20px' }}>×</button>
                </div>
                <div className="charges-modal-body" style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                           <div className="loading-spinner" style={{ margin: '0 auto 10px' }}></div>
                           Loading audit trails...
                        </div>
                    ) : logs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                           <HistoryIcon style={{ fontSize: '48px', color: '#ddd', marginBottom: '10px' }} />
                           <div>No change logs found for this charge. Only changes to cost/revenue are tracked here.</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {logs.map((log, idx) => (
                                <div key={log._id} style={{ borderLeft: '3px solid #2196f3', paddingLeft: '15px', paddingBottom: '10px', position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '-8px', top: '0', width: '12px', height: '12px', borderRadius: '50%', background: '#2196f3', border: '2px solid white' }}></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <div style={{ fontWeight: 'bold', color: '#1565c0', fontSize: '13px' }}>
                                            {log.username} <span style={{ fontWeight: 'normal', color: '#666', fontSize: '11px', background: '#e3f2fd', padding: '2px 6px', borderRadius: '10px', marginLeft: '5px' }}>{log.userRole}</span>
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#888' }}>{new Date(log.timestamp).toLocaleString()}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        {log.changes.map((change, cIdx) => (
                                            <div key={cIdx} style={{ fontSize: '11px', background: '#f8f9fa', padding: '8px', borderRadius: '6px', border: '1px solid #eee' }}>
                                                <div style={{ fontWeight: 'bold', color: '#555', marginBottom: '4px', textTransform: 'capitalize' }}>
                                                    {change.fieldPath.replace('charge.', '').replace(/\./g, ' ➔ ')}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ flex: 1, color: '#d32f2f', background: '#ffebee', padding: '2px 6px', borderRadius: '3px' }}>
                                                        {change.oldValue === null || change.oldValue === undefined ? <em style={{opacity: 0.5}}>None</em> : String(change.oldValue)}
                                                    </div>
                                                    <span style={{ color: '#999' }}>➔</span>
                                                    <div style={{ flex: 1, color: '#2e7d32', background: '#e8f5e9', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold' }}>
                                                        {change.newValue === null || change.newValue === undefined ? <em style={{opacity: 0.5}}>None</em> : String(change.newValue)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="charges-modal-footer" style={{ borderTop: '1px solid #eee' }}>
                    <button type="button" className="charges-btn" onClick={onClose} style={{ background: '#666' }}>Close</button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default memo(EditChargeModal);
