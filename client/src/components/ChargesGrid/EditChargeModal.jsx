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
  workMode = 'Payment'
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
        revenue: {
          ...(charge.revenue || {}),
          isGst: (charge.revenue && charge.revenue.isGst !== undefined) ? charge.revenue.isGst : true
        },
        cost: {
          ...(charge.cost || {}),
          isGst: (charge.cost && charge.cost.isGst !== undefined) ? charge.cost.isGst : true
        }
      }));
      setFormData(initialData);
      setPanelOpen(selectedCharges.reduce((acc, _, i) => ({ ...acc, [i]: 'cost' }), {}));
      setUploadIndex(null);
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
    const updated = [...formData];
    if (section) {
      updated[index][section] = updated[index][section] || {};
      updated[index][section][field] = value;
      
      // Synchronize 'url' (attachments) between revenue and cost
      if (field === 'url') {
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

      const fieldsToTriggerRecalc = ['qty', 'rate', 'isGst', 'gstRate', 'isTds', 'tdsPercent', 'exchangeRate', 'partyName', 'basicAmount'];
      if (fieldsToTriggerRecalc.includes(field)) {
        const sectionRef = updated[index][section];
        const qty = parseFloat(sectionRef.qty) || 0;
        const rate = parseFloat(sectionRef.rate) || 0;
        const exRate = parseFloat(sectionRef.exchangeRate) || 1;
        
        // Total Amount: Qty * Rate (Rate is always GST-inclusive)
        const amount = qty * rate;
        sectionRef.amount = amount;
        sectionRef.amountINR = amount * exRate;

        // GST & Basic Amount Calculation:
        // Basic is always GST-exclusive (Amount / 1.18)
        // GST is the difference (Amount - Basic)
        const gstRate = parseFloat(sectionRef.gstRate) || 18;
        
        let derivedBasic, derivedGst;
        if (field === 'basicAmount') {
          // Manual entry: use the value directly
          derivedBasic = parseFloat(value) || 0;
        } else if (['qty', 'rate', 'gstRate', 'isGst'].includes(field)) {
          // Auto-calculation logic for primary amount-altering fields
          derivedBasic = Number((amount / (1 + (gstRate / 100))).toFixed(2));
        } else {
          // For other fields like isTds, tdsPercent, partyName, etc.
          // Keep the existing basic amount (especially if it was manually overridden)
          derivedBasic = parseFloat(sectionRef.basicAmount) || 0;
        }
        
        derivedGst = amount - derivedBasic;
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
          sectionRef.tdsAmount = sectionRef.basicAmount * (tdsPercent / 100);
        } else {
          sectionRef.tdsAmount = 0;
        }

        // Net Payable Calculation:
        // "Include GST" (Checked): Net = Total Amount - TDS
        // "Exclude GST" (Unchecked): Net = Basic Amount - TDS
        const includeGst = sectionRef.isGst !== false;
        if (includeGst) {
          sectionRef.netPayable = Math.round(amount - sectionRef.tdsAmount);
        } else {
          sectionRef.netPayable = Math.round(sectionRef.basicAmount - sectionRef.tdsAmount);
        }
      }
      
      // Open dropdown when typing party name
      if (field === 'partyName') {
        setActiveDropdown({ index, section });
      } else if (field === 'partyType') {
        // Clear party selected when type changes
        updated[index][section].partyName = '';
        updated[index][section].isTds = false;
        updated[index][section].tdsPercent = 0;
        setActiveDropdown({ index: null, section: null });
      }
    } else {
      updated[index][field] = value;
    }
    setFormData(updated);
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
    const derivedBasic = amount / (1 + (gstRate / 100));
    const derivedGst = amount - derivedBasic;
    
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
    
    revenue.amount = amount;
    revenue.amountINR = amount * exRate;

    const gstRate = parseFloat(revenue.gstRate) || 18;
    const derivedBasic = Number((amount / (1 + (gstRate / 100))).toFixed(2));
    const derivedGst = amount - derivedBasic;
    
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

  return createPortal(
    <div className="charge-modal-overlay active" onMouseDown={() => setActiveDropdown({ index: null, section: null })}>
      <div className="edit-charge-modal" ref={modalRef} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-title">Edit Charge</div>
        <div className="modal-body">
          {formData.map((row, i) => (
            <div key={row._id || i} style={{ marginBottom: formData.length > 1 ? '30px' : '0' }}>
              <div className="form-section-new">
                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginRight: '30px', gap: '10px 20px' }}>
                  <div className="form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="form-label">Charge</span>
                    <div className="form-input-search">
                      <input type="text" readOnly className="form-input" style={{ background: '#f5f8fc', color: '#1a3a5c', fontWeight: 'bold' }} value={row.chargeHead || ''} />
                      <button type="button" className="search-btn">🔍</button>
                    </div>
                  </div>
                  <div className="form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="form-label">Category</span>
                    <input type="text" className="form-input" value={row.category || ''} onChange={e => handleFieldChange(i, 'category', e.target.value)} />
                  </div>

                  <div className="form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="form-label">Invoice Number</span>
                    <input type="text" className="form-input" value={row.invoice_number || ''} onChange={e => handleFieldChange(i, 'invoice_number', e.target.value)} />
                  </div>
                  <div className="form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="form-label">Invoice Date</span>
                    <input type="date" className="form-input" value={row.invoice_date || ''} onChange={e => handleFieldChange(i, 'invoice_date', e.target.value)} />
                  </div>

                  <div className="form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="form-label">SAC / HSN</span>
                    <input type="text" className="form-input" placeholder="e.g. 996511" value={row.sacHsn || ''} onChange={e => handleFieldChange(i, 'sacHsn', e.target.value)} />
                  </div>
                  <div className="form-row" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="form-label" style={{ marginBottom: 0 }}>Is Header?</span>
                    <input type="checkbox" checked={row.isHeader || false} onChange={e => handleFieldChange(i, 'isHeader', e.target.checked)} />
                  </div>

                  {/* Tally Numbers & Status Row */}
                  <div className="form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="form-label" style={{ color: '#1565c0', fontWeight: 'bold' }}>PB No</span>
                    <div className="ep-inline">
                        <input type="text" readOnly className="form-input" style={{ background: '#e3f2fd', color: '#1565c0', width: '60%' }} value={row.purchase_book_no || ''} />
                        {row.purchase_book_no && (
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
                        )}
                        <span className="ep-status-pill" style={{ marginLeft: '10px', fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: row.purchase_book_status ? '#e8f5e9' : '#f5f5f5', color: row.purchase_book_status === 'Active' ? '#2e7d32' : '#757575', border: '1px solid #ddd' }}>
                            {row.purchase_book_status || 'Pending'}
                        </span>
                    </div>
                  </div>
                  <div className="form-row" style={{ gridColumn: 'span 2' }}>
                    <span className="form-label" style={{ color: '#d32f2f', fontWeight: 'bold' }}>PR No</span>
                    <div className="ep-inline" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                            <input type="text" readOnly className="form-input" style={{ background: '#ffebee', color: '#c62828', width: '60%' }} value={row.payment_request_no || ''} />
                            {row.payment_request_no && (
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
                            )}
                            <span className="ep-status-pill" style={{ 
                                marginLeft: '10px', 
                                fontSize: '11px', 
                                padding: '2px 8px', 
                                borderRadius: '10px', 
                                background: (row.payment_request_status === 'Paid' || paymentDetailsAudit[row.payment_request_no]?.utrNumber) ? '#e8f5e9' : '#fff3e0', 
                                color: (row.payment_request_status === 'Paid' || paymentDetailsAudit[row.payment_request_no]?.utrNumber) ? '#2e7d32' : '#ef6c00', 
                                border: '1px solid #ffe0e0' 
                            }}>
                                {(row.payment_request_status === 'Paid' || paymentDetailsAudit[row.payment_request_no]?.utrNumber) ? 'Payment Done' : (row.payment_request_status || 'Pending')}
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

                  <div className="form-row" style={{ gridColumn: 'span 4' }}>
                    <span className="form-label">Remark</span>
                    <input type="text" className="form-input" value={row.remark || ''} onChange={e => handleFieldChange(i, 'remark', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="charge-table-wrap">
                <table className="charge-table">
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
                      <td className="row-label">Revenue</td>
                      <td>{row.revenue?.basis || 'Per B/E - Per Shp'}</td>
                      <td>{row.revenue?.qty || '1.00'}</td>
                      <td>{row.revenue?.currency || 'INR'}</td>
                      <td>{formatNumber(row.revenue?.rate)}</td>
                      <td>{formatNumber(row.revenue?.amount)}</td>
                      <td>{formatNumber(row.revenue?.amountINR)}</td>
                      <td style={{ textAlign: 'center' }}><input type="checkbox" checked={row.revenue?.overrideAutoRate || false} readOnly /></td>
                      <td style={{ textAlign: 'center' }}><input type="checkbox" checked={row.revenue?.isPosted || false} readOnly /></td>
                      <td>
                        <button type="button" className="arrow-btn" onClick={(e) => { e.stopPropagation(); togglePanel(i, 'rev'); }}>
                          {panelOpen[i] === 'rev' ? '▲' : '▼'}
                        </button>
                      </td>
                    </tr>
                    
                    {/* --- REVENUE EXPANDED --- */}
                    {panelOpen[i] === 'rev' && (
                      <tr className="expand-row">
                        <td colSpan="10">
                          <div className="expand-panel open">
                            <div className="ep-desc-row">
                              <span className="ep-label">Charge Description</span>
                              <input type="text" className="ep-desc-input" value={row.revenue?.chargeDescription || ''} onChange={e => handleFieldChange(i, 'chargeDescription', e.target.value, 'revenue')} />
                            </div>
                            <div className="ep-desc-row">
                                <span className="ep-label">Attachment</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                                    {Array.isArray(row.revenue?.url) && row.revenue.url.length > 0 ? (
                                        row.revenue.url.map((url, urlIdx) => (
                                            <Chip
                                                key={urlIdx}
                                                icon={<DescriptionIcon style={{ fontSize: "14px" }} />}
                                                label={extractFileName(url)}
                                                size="small"
                                                onDelete={() => {
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
                                    <button type="button" className="upload-btn" style={{ padding: '2px 8px' }} onClick={() => { setUploadIndex(i); setUploadSection('revenue'); }}>
                                        {Array.isArray(row.revenue?.url) && row.revenue.url.length > 0 ? 'Edit Files' : 'Upload Files'}
                                    </button>
                                </div>
                            </div>
                            <div className="ep-grid" style={{ marginRight: '30px' }}>
                              <div className="ep-row">
                                <span className="ep-label">Basis</span>
                                <select className="ep-select" value={row.revenue?.basis || 'Per B/E - Per Shp'} onChange={e => handleFieldChange(i, 'basis', e.target.value, 'revenue')}>
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
                              <div className="ep-row">
                                <span className="ep-label">Override Auto Rate</span>
                                <input type="checkbox" checked={row.revenue?.overrideAutoRate || false} onChange={e => handleFieldChange(i, 'overrideAutoRate', e.target.checked, 'revenue')} />
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Qty/Unit</span>
                                <div className="ep-inline">
                                  <input type="number" step="0.01" value={row.revenue?.qty || ''} onChange={e => handleFieldChange(i, 'qty', e.target.value, 'revenue')} />
                                  <input type="text" value={row.revenue?.unit || ''} onChange={e => handleFieldChange(i, 'unit', e.target.value, 'revenue')} />
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Receivable Type</span>
                                <select className="ep-select" value={row.revenue?.partyType || ''} onChange={e => handleFieldChange(i, 'partyType', e.target.value, 'revenue')}>
                                  <option>Customer</option><option>Agent</option><option>Carrier</option>
                                </select>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Rate</span>
                                <div className="ep-inline">
                                  <input type="number" step="0.01" value={row.revenue?.rate || ''} onChange={e => handleFieldChange(i, 'rate', e.target.value, 'revenue')} />
                                  <select value={row.revenue?.currency || 'INR'} onChange={e => handleFieldChange(i, 'currency', e.target.value, 'revenue')}>
                                    <option>INR</option><option>USD</option><option>EUR</option>
                                  </select>
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Receivable From</span>
                                <div className="ep-search-container">
                                  <div className="ep-search-wrap">
                                    <input 
                                      type="text" 
                                      value={row.revenue?.partyName || ''} 
                                      onChange={e => handleFieldChange(i, 'partyName', e.target.value, 'revenue')} 
                                      onFocus={() => setActiveDropdown({ index: i, section: 'revenue' })}
                                    />
                                    <button type="button" className="ep-search-btn">🔍</button>
                                  </div>
                                  {activeDropdown.index === i && activeDropdown.section === 'revenue' && (row.revenue?.partyName?.length >= 2) && (
                                    <ul className="ep-dropdown-list" ref={dropdownRef}>
                                      {(row.revenue?.partyType?.toUpperCase() === 'AGENT' || row.revenue?.partyType?.toUpperCase() === 'CARRIER' ? shippingLines : 
                                        row.revenue?.partyType?.toUpperCase() === 'CUSTOMER' ? organizations : [])
                                        .filter(item => !row.revenue?.partyName || item.name.toLowerCase().includes(row.revenue.partyName.toLowerCase()))
                                        .slice(0, 20)
                                        .map((item, idx) => (
                                          <li key={idx} className="ep-dropdown-item" onClick={() => handleSelectParty(i, 'revenue', item)}>
                                            <span className="ep-item-name">{item.name}</span>
                                            <span className="ep-item-sub">{item.city || 'Master Directory'}</span>
                                          </li>
                                        ))}
                                      {/* Click outside to close is handled by modal background or focus loss usually, but let's add no-results */}
                                      {((row.revenue?.partyType === 'Agent' || row.revenue?.partyType === 'Carrier' ? shippingLines : 
                                        row.revenue?.partyType === 'Customer' ? organizations : [])
                                        .filter(item => !row.revenue?.partyName || item.name.toLowerCase().includes(row.revenue.partyName.toLowerCase()))
                                        .length === 0) && <li className="ep-dropdown-item"><span className="ep-item-sub">No results found</span></li>}
                                    </ul>
                                  )}
                                </div>
                                {row.revenue?.branchCode && <span className="ep-link" style={{ marginLeft: '6px', whiteSpace: 'nowrap' }}>{row.revenue.branchCode}</span>}
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Total Amount</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={row.revenue?.amountINR || 0} />
                                  <span style={{ fontSize: '11px', color: '#555', paddingLeft: '4px' }}>INR</span>
                                </div>
                              </div>
                              {(() => {
                                const party = [...shippingLines, ...suppliers].find(p => p.name?.toUpperCase() === row.revenue?.partyName?.toUpperCase());
                                if (party && party.branches?.length > 1) {
                                  return (
                                    <div className="ep-row">
                                      <span className="ep-label">Branch</span>
                                      <select className="ep-select" value={row.revenue?.branchIndex || 0} onChange={e => handleFieldChange(i, 'branchIndex', parseInt(e.target.value), 'revenue')}>
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
                              <div className="ep-row">
                                <span className="ep-label">Include GST?</span>
                                <div className="ep-inline">
                                  <input type="checkbox" checked={row.revenue?.isGst !== false} onChange={e => handleFieldChange(i, 'isGst', e.target.checked, 'revenue')} />
                                  {row.revenue?.isGst !== false && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <input type="number" style={{ width: '50px' }} value={row.revenue?.gstRate ?? 18} onChange={e => handleFieldChange(i, 'gstRate', e.target.value, 'revenue')} />
                                      <span style={{ fontSize: '11px' }}>%</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Basic Amount</span>
                                <div className="ep-inline">
                                  <input type="number" step="0.01" className="ep-input-small" style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '2px 6px', width: '100%' }} value={row.revenue?.basicAmount || ''} onChange={e => handleFieldChange(i, 'basicAmount', e.target.value, 'revenue')} />
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">GST Amount</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={formatNumber(row.revenue?.gstAmount)} />
                                </div>
                              </div>
                            </div>
                            <div className="ep-copy-row" style={{ gap: '15px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                Copy to Cost <input type="checkbox" checked={row.copyToCost || false} onChange={e => handleFieldChange(i, 'copyToCost', e.target.checked)} />
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
                                  cursor: 'pointer',
                                  color: '#1976d2',
                                  fontWeight: '600',
                                  transition: 'all 0.2s'
                                }}
                                onClick={(e) => { e.stopPropagation(); handleCopyFromCost(i); }}
                                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f5faff'; }}
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
                      <td className="row-label">Cost</td>
                      <td>{row.cost?.basis || 'Per B/E - Per Shp'}</td>
                      <td>{row.cost?.qty || '1.00'}</td>
                      <td>{row.cost?.currency || 'INR'}</td>
                      <td>{formatNumber(row.cost?.rate)}</td>
                      <td>{formatNumber(row.cost?.amount)}</td>
                      <td>{formatNumber(row.cost?.amountINR)}</td>
                      <td style={{ textAlign: 'center' }}><input type="checkbox" checked={row.cost?.overrideAutoRate || false} readOnly /></td>
                      <td style={{ textAlign: 'center' }}><input type="checkbox" checked={row.cost?.isPosted || false} readOnly /></td>
                      <td>
                        <button type="button" className="arrow-btn" onClick={(e) => { e.stopPropagation(); togglePanel(i, 'cost'); }}>
                          {panelOpen[i] === 'cost' ? '▲' : '▼'}
                        </button>
                      </td>
                    </tr>

                    {/* --- COST EXPANDED --- */}
                    {panelOpen[i] === 'cost' && (
                      <tr className="expand-row">
                        <td colSpan="10">
                          <div className="expand-panel open">
                            <div className="ep-desc-row">
                              <span className="ep-label">Charge Description</span>
                              <input type="text" className="ep-desc-input" value={row.cost?.chargeDescription || ''} onChange={e => handleFieldChange(i, 'chargeDescription', e.target.value, 'cost')} />
                            </div>
                            <div className="ep-desc-row">
                                <span className="ep-label">Attachment</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                                    {Array.isArray(row.cost?.url) && row.cost.url.length > 0 ? (
                                        row.cost.url.map((url, urlIdx) => (
                                            <Chip
                                                key={urlIdx}
                                                icon={<DescriptionIcon style={{ fontSize: "14px" }} />}
                                                label={extractFileName(url)}
                                                size="small"
                                                onDelete={() => {
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
                                    <button type="button" className="upload-btn" style={{ padding: '2px 8px' }} onClick={() => { setUploadIndex(i); setUploadSection('cost'); }}>
                                        {Array.isArray(row.cost?.url) && row.cost.url.length > 0 ? 'Edit Files' : 'Upload Files'}
                                    </button>
                                </div>
                            </div>
                            <div className="ep-grid" style={{ marginRight: '30px' }}>
                              <div className="ep-row">
                                <span className="ep-label">Basis</span>
                                <select className="ep-select" value={row.cost?.basis || 'Per B/E - Per Shp'} onChange={e => handleFieldChange(i, 'basis', e.target.value, 'cost')}>
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
                              <div className="ep-row">
                                <span className="ep-label">Override Auto Rate</span>
                                <input type="checkbox" checked={row.cost?.overrideAutoRate || false} onChange={e => handleFieldChange(i, 'overrideAutoRate', e.target.checked, 'cost')} />
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Qty/Unit</span>
                                <div className="ep-inline">
                                  <input type="number" step="0.01" value={row.cost?.qty || ''} onChange={e => handleFieldChange(i, 'qty', e.target.value, 'cost')} />
                                  <input type="text" value={row.cost?.unit || ''} onChange={e => handleFieldChange(i, 'unit', e.target.value, 'cost')} />
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Payable Type</span>
                                <select className="ep-select" value={row.cost?.partyType || ''} onChange={e => handleFieldChange(i, 'partyType', e.target.value, 'cost')}>
                                  <option>Vendor</option><option>Transporter</option><option>Importer</option><option>Others</option><option>Agent</option><option>CFS</option><option>General Org</option>
                                </select>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Rate</span>
                                <div className="ep-inline">
                                  <input type="number" step="0.01" value={row.cost?.rate || ''} onChange={e => handleFieldChange(i, 'rate', e.target.value, 'cost')} />
                                  <select value={row.cost?.currency || 'INR'} onChange={e => handleFieldChange(i, 'currency', e.target.value, 'cost')}>
                                    <option>INR</option><option>USD</option><option>EUR</option>
                                  </select>
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Payable To</span>
                                <div className="ep-search-container">
                                  <div className="ep-search-wrap">
                                    <input 
                                      type="text" 
                                      value={row.cost?.partyName || ''} 
                                      onChange={e => handleFieldChange(i, 'partyName', e.target.value, 'cost')} 
                                      onFocus={() => setActiveDropdown({ index: i, section: 'cost' })}
                                    />
                                    <button type="button" className="ep-search-btn">🔍</button>
                                  </div>
                                  {activeDropdown.index === i && activeDropdown.section === 'cost' && (row.cost?.partyName?.length >= 2) && (
                                    <ul className="ep-dropdown-list" ref={dropdownRef}>
                                      {(row.cost?.partyType?.toUpperCase() === 'AGENT' || row.cost?.partyType?.toUpperCase() === 'OTHERS' ? shippingLines : 
                                        row.cost?.partyType?.toUpperCase() === 'VENDOR' ? suppliers :
                                        row.cost?.partyType?.toUpperCase() === 'TRANSPORTER' ? transporters :
                                        row.cost?.partyType?.toUpperCase() === 'IMPORTER' ? organizations : 
                                        row.cost?.partyType?.toUpperCase() === 'GENERAL ORG' ? generalOrgs :
                                        row.cost?.partyType?.toUpperCase() === 'CFS' ? cfsList : [])
                                        .filter(item => !row.cost?.partyName || item.name.toLowerCase().includes(row.cost.partyName.toLowerCase()))
                                        .slice(0, 20)
                                        .map((item, idx) => (
                                          <li key={idx} className="ep-dropdown-item" onClick={() => handleSelectParty(i, 'cost', item)}>
                                            <span className="ep-item-name">{item.name}</span>
                                            <span className="ep-item-sub">{item.city || 'Master Directory'}</span>
                                          </li>
                                        ))}
                                      {((row.cost?.partyType === 'Agent' || row.cost?.partyType === 'Others' ? shippingLines : 
                                        row.cost?.partyType === 'Vendor' ? suppliers :
                                        row.cost?.partyType === 'Transporter' ? transporters :
                                        row.cost?.partyType === 'Importer' ? organizations : 
                                        row.cost?.partyType === 'General Org' ? generalOrgs :
                                        row.cost?.partyType === 'CFS' ? cfsList : [])
                                        .filter(item => !row.cost?.partyName || item.name.toLowerCase().includes(row.cost.partyName.toLowerCase()))
                                        .length === 0) && <li className="ep-dropdown-item"><span className="ep-item-sub">No results found</span></li>}
                                    </ul>
                                  )}
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Total Amount</span>
                                <div className="ep-inline">
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
                                    <div className="ep-row">
                                      <span className="ep-label">Branch</span>
                                      <select className="ep-select" value={row.cost?.branchIndex || 0} onChange={e => handleFieldChange(i, 'branchIndex', parseInt(e.target.value), 'cost')}>
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
                              <div className="ep-row">
                                <span className="ep-label">Include GST?</span>
                                <div className="ep-inline">
                                  <input type="checkbox" checked={row.cost?.isGst !== false} onChange={e => handleFieldChange(i, 'isGst', e.target.checked, 'cost')} />
                                  {row.cost?.isGst !== false && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <input type="number" style={{ width: '50px' }} value={row.cost?.gstRate || ''} onChange={e => handleFieldChange(i, 'gstRate', e.target.value, 'cost')} />
                                      <span style={{ fontSize: '11px' }}>%</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Basic Amount</span>
                                <div className="ep-inline">
                                  <input type="number" step="0.01" className="ep-input-small" style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '2px 6px', width: '100%' }} value={row.cost?.basicAmount || ''} onChange={e => handleFieldChange(i, 'basicAmount', e.target.value, 'cost')} />
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">GST Amount</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={formatNumber(row.cost?.gstAmount)} />
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Apply TDS?</span>
                                <div className="ep-inline">
                                  <input type="checkbox" checked={row.cost?.isTds || false} onChange={e => handleFieldChange(i, 'isTds', e.target.checked, 'cost')} />
                                  {row.cost?.isTds && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <input type="number" style={{ width: '50px' }} value={row.cost?.tdsPercent ?? 0} onChange={e => handleFieldChange(i, 'tdsPercent', e.target.value, 'cost')} />
                                      <span style={{ fontSize: '11px' }}>%</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">TDS Amount</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={formatNumber(row.cost?.tdsAmount)} />
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label" style={{ fontWeight: 'bold', color: '#d32f2f' }}>Net Payable</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#fff9f9', fontWeight: 'bold', color: '#d32f2f', border: '1px solid #ffcdd2' }} value={Math.round(row.cost?.netPayable || 0)} />
                                </div>
                              </div>
                              <div className="ep-copy-row" style={{ marginTop: '10px' }}>
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
                                    cursor: 'pointer',
                                    color: '#1976d2',
                                    fontWeight: '600',
                                    transition: 'all 0.2s'
                                  }}
                                  onClick={(e) => { e.stopPropagation(); handleCopyToRevenue(i); }}
                                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f5faff'; }}
                                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                                >
                                  <ContentCopyIcon style={{ fontSize: '13px' }} /> Copy to Revenue
                                </button>
                              </div>
                              <div className="ep-grid" style={{ marginTop: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  {/* Conditionally show based on workMode or if already exists */}
                                  {(!row.purchase_book_no && (workMode === 'Purchase Book' || !row.payment_request_no)) && (
                                    <button 
                                      type="button" 
                                      className="upload-btn" 
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
                                          const rate = parseFloat(cost.gstRate) || 18;
                                          const amt = parseFloat(cost.amount) || 0;
                                          const includeGst = cost.isGst || false;
                                          
                                          let basic = parseFloat(cost.basicAmount);
                                          let totalGst = parseFloat(cost.gstAmount);
                                          
                                          // Fallback in case they are missing
                                          if (isNaN(basic)) {
                                            if (includeGst) {
                                              basic = amt / (1 + (rate / 100));
                                              totalGst = amt - basic;
                                            } else {
                                              basic = amt;
                                              totalGst = amt * (rate / 100);
                                            }
                                          }

                                          const branch = partyDetails?.branches?.[cost.branchIndex || 0] || {};
                                          const isGujarat = branch.gst?.startsWith('24');

                                          return {
                                            partyName,
                                            partyDetails,
                                            amount: amt,
                                            basicAmount: basic,
                                            gstAmount: totalGst,
                                            gstRate: rate,
                                            cgst: isGujarat ? totalGst / 2 : 0,
                                            sgst: isGujarat ? totalGst / 2 : 0,
                                            igst: !isGujarat ? totalGst : 0,
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
                                            jobId: parentId
                                          };
                                        });
                                      }}
                                    >
                                      Purchase book
                                    </button>
                                  )}
                                  {(!row.payment_request_no && (workMode === 'Payment' || !row.purchase_book_no)) && (
                                    <button 
                                      type="button" 
                                      className="upload-btn" 
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

                                        setPaymentRequestData({
                                          partyName,
                                          partyDetails,
                                          jobDisplayNumber,
                                          branchIndex: row.cost?.branchIndex || 0,
                                          netPayable: row.cost?.netPayable,
                                          chargeHead: row.chargeHead,
                                          chargeId: row._id,
                                          jobId: parentId
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
          ))}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={() => handleSave(false)}>Update</button>
          <button type="button" className="btn" onClick={() => handleSave(true)}>Update & Close</button>
          <button type="button" className="btn" onClick={onClose} style={{ marginRight: '30px' }}>Cancel</button>
        </div>
      </div>

      {uploadIndex !== null && (
        <FileUploadModal 
            isOpen={true}
            onClose={() => { setUploadIndex(null); setUploadSection(null); }}
            chargeLabel={`${formData[uploadIndex]?.chargeHead} (${uploadSection})`}
            initialUrls={formData[uploadIndex]?.[uploadSection]?.url || []}
            onAttach={(urls) => {
                handleFieldChange(uploadIndex, 'url', urls, uploadSection);
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
        onSuccess={(requestNo) => {
          // Update the localized formData state with the new number
          const updated = [...formData];
          const activeIndex = formData.findIndex(c => c._id === paymentRequestData.chargeId || c.chargeHead === paymentRequestData.chargeHead);
          if (activeIndex !== -1) {
            const initialStatus = 'Pending';
            updated[activeIndex].payment_request_no = requestNo;
            updated[activeIndex].payment_request_status = initialStatus;
            setFormData(updated);
            // PERSIST IMMEDIATELY
            if (updateCharge && updated[activeIndex]._id) {
              updateCharge(updated[activeIndex]._id, { 
                payment_request_no: requestNo, 
                payment_request_status: initialStatus 
              });
            }
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
        onSuccess={(entryNo) => {
          // Update the localized formData state with the new number
          const updated = [...formData];
          const activeIndex = formData.findIndex(c => c.chargeHead === purchaseBookData.chargeHead);
          if (activeIndex !== -1) {
            const initialStatus = 'Pending';
            updated[activeIndex].purchase_book_no = entryNo;
            updated[activeIndex].purchase_book_status = initialStatus;
            setFormData(updated);
            // PERSIST IMMEDIATELY
            if (updateCharge && updated[activeIndex]._id) {
              updateCharge(updated[activeIndex]._id, { 
                purchase_book_no: entryNo, 
                purchase_book_status: initialStatus 
              });
            }
          }
        }}
      />
    </div>,
    document.body
  );
};

export default memo(EditChargeModal);
