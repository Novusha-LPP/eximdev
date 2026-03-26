import React, { useState, useEffect } from 'react';
import FileUploadModal from './FileUploadModal';
import RequestPaymentModal from './RequestPaymentModal';
import PurchaseBookModal from './PurchaseBookModal';
import { Chip } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import axios from 'axios';
import './charges.css';

const EditChargeModal = ({ 
  isOpen, 
  onClose, 
  selectedCharges, 
  onSave, 
  shippingLineAirline, 
  importerName,
  jobNumber = '',
  jobYear = '',
  jobInvoiceNumber = '',
  jobInvoiceDate = '',
  jobInvoiceValue = ''
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

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [slRes, supRes, orgRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_STRING}/get-shipping-lines`),
          axios.get(`${process.env.REACT_APP_API_STRING}/get-suppliers`),
          axios.get(`${process.env.REACT_APP_API_STRING}/organization`)
        ]);
        setShippingLines(slRes.data);
        setSuppliers(supRes.data);
        setOrganizations(orgRes.data.organizations || []);
      } catch (error) {
        console.error("Error fetching master data:", error);
      }
    };
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (isOpen) {
      const initialData = JSON.parse(JSON.stringify(selectedCharges)).map(charge => ({
        ...charge,
        invoice_number: charge.invoice_number || jobInvoiceNumber,
        invoice_date: charge.invoice_date || jobInvoiceDate,
        invoice_value: charge.invoice_value || jobInvoiceValue
      }));
      setFormData(initialData);
      setPanelOpen(selectedCharges.reduce((acc, _, i) => ({ ...acc, [i]: 'cost' }), {}));
      setUploadIndex(null);
    }
  }, [isOpen, selectedCharges, jobInvoiceNumber, jobInvoiceDate, jobInvoiceValue]);

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
      
      // Auto-populate Payable To if type is 'Others' in Cost section
      if (section === 'cost' && field === 'partyType' && value === 'Others' && shippingLineAirline) {
        updated[index][section].partyName = shippingLineAirline;
      }

      // Auto-populate Payable To if type is 'Importer' in Cost section
      if (section === 'cost' && field === 'partyType' && value === 'Importer' && importerName) {
        updated[index][section].partyName = importerName;
      }

      const fieldsToTriggerRecalc = ['qty', 'rate', 'isGst', 'gstRate', 'isTds', 'tdsPercent', 'exchangeRate'];
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
        const derivedBasic = amount / (1 + (gstRate / 100));
        const derivedGst = amount - derivedBasic;
        
        sectionRef.gstAmount = derivedGst;
        sectionRef.basicAmount = derivedBasic; // TDS always calculated on this

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
        const includeGst = sectionRef.isGst || false;
        if (includeGst) {
          sectionRef.netPayable = amount - sectionRef.tdsAmount;
        } else {
          sectionRef.netPayable = sectionRef.basicAmount - sectionRef.tdsAmount;
        }
      }
    } else {
      updated[index][field] = value;
    }
    setFormData(updated);
  };

  const handleSave = () => {
    onSave(formData);
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

  return (
    <div className="modal-overlay active">
      <div className="edit-charge-modal">
        <div className="modal-title">Edit Charge</div>
        <div className="modal-body">
          {formData.map((row, i) => (
            <div key={row._id || i} style={{ marginBottom: formData.length > 1 ? '30px' : '0' }}>
              <div className="form-section-new">
                <div className="form-grid">
                  <div className="form-row span-2">
                    <span className="form-label">Charge</span>
                    <div className="form-input-search">
                      <input type="text" readOnly className="form-input" style={{ background: '#f5f8fc', color: '#1a3a5c', fontWeight: 'bold' }} value={row.chargeHead || ''} />
                      <button type="button" className="search-btn">🔍</button>
                    </div>
                  </div>
                  <div className="form-row">
                    <span className="form-label">Category</span>
                    <input type="text" className="form-input" value={row.category || ''} onChange={e => handleFieldChange(i, 'category', e.target.value)} />
                  </div>
                  <div className="form-row">
                    <span className="form-label">Invoice Number</span>
                    <input type="text" className="form-input" value={row.invoice_number || ''} onChange={e => handleFieldChange(i, 'invoice_number', e.target.value)} />
                  </div>
                  <div className="form-row">
                    <span className="form-label">Invoice Date</span>
                    <input type="date" className="form-input" value={row.invoice_date || ''} onChange={e => handleFieldChange(i, 'invoice_date', e.target.value)} />
                  </div>
                  <div className="form-row">
                    <span className="form-label">Invoice Value</span>
                    <input type="number" className="form-input" value={row.invoice_value || ''} onChange={e => handleFieldChange(i, 'invoice_value', e.target.value)} />
                  </div>
                </div>

                <div className="form-remark-row">
                  <span className="form-label" style={{ textAlign: 'right' }}>Remark</span>
                  <input 
                    type="text"
                    className="form-input"
                    style={{ width: '100%' }}
                    value={row.remark || ''} 
                    onChange={e => handleFieldChange(i, 'remark', e.target.value)} 
                  />
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
                            <div className="ep-grid">
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
                                  <input type="number" step="0.01" value={row.revenue?.qty ?? 1.00} onChange={e => handleFieldChange(i, 'qty', e.target.value, 'revenue')} />
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
                                  <input type="number" step="0.01" value={row.revenue?.rate ?? 0.00} onChange={e => handleFieldChange(i, 'rate', e.target.value, 'revenue')} />
                                  <select value={row.revenue?.currency || 'INR'} onChange={e => handleFieldChange(i, 'currency', e.target.value, 'revenue')}>
                                    <option>INR</option><option>USD</option><option>EUR</option>
                                  </select>
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Receivable From</span>
                                <div className="ep-search-wrap">
                                  <input type="text" value={row.revenue?.partyName || ''} onChange={e => handleFieldChange(i, 'partyName', e.target.value, 'revenue')} />
                                  <button type="button" className="ep-search-btn">🔍</button>
                                </div>
                                {row.revenue?.branchCode && <span className="ep-link" style={{ marginLeft: '6px', whiteSpace: 'nowrap' }}>{row.revenue.branchCode}</span>}
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Total Amount</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={row.revenue?.amount || 0} />
                                  <span style={{ fontSize: '11px', color: '#555', paddingLeft: '4px' }}>{row.revenue?.currency || 'INR'}</span>
                                </div>
                              </div>
                              <div className="ep-row"></div>
                              <div className="ep-row">
                                <span className="ep-label">Total Amount(INR)</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={row.revenue?.amountINR || 0} />
                                  <span style={{ fontSize: '11px', color: '#555', paddingLeft: '4px' }}>INR</span>
                                </div>
                              </div>
                            </div>
                            <div className="ep-copy-row">
                              Copy to Cost <input type="checkbox" checked={row.copyToCost || false} onChange={e => handleFieldChange(i, 'copyToCost', e.target.checked)} />
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                    {row.cost?.url ? (
                                        <Chip
                                            icon={<DescriptionIcon style={{ fontSize: "14px" }} />}
                                            label={extractFileName(row.cost.url)}
                                            size="small"
                                            onDelete={() => handleFieldChange(i, 'url', null, 'cost')}
                                            component="a"
                                            href={row.cost.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            clickable
                                            sx={{ maxWidth: "180px", fontSize: "10px", height: "22px", backgroundColor: "#e3f2fd", color: "#1565c0" }}
                                        />
                                    ) : (
                                        <span style={{ fontSize: '11px', color: '#8aA0b0', fontStyle: 'italic' }}>No file attached</span>
                                    )}
                                    <button type="button" className="upload-btn" style={{ padding: '2px 8px' }} onClick={() => { setUploadIndex(i); setUploadSection('cost'); }}>
                                        {row.cost?.url ? 'Change' : 'Upload File'}
                                    </button>
                                </div>
                            </div>
                            <div className="ep-grid">
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
                                  <input type="number" step="0.01" value={row.cost?.qty ?? 1.00} onChange={e => handleFieldChange(i, 'qty', e.target.value, 'cost')} />
                                  <input type="text" value={row.cost?.unit || ''} onChange={e => handleFieldChange(i, 'unit', e.target.value, 'cost')} />
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Payable Type</span>
                                <select className="ep-select" value={row.cost?.partyType || ''} onChange={e => handleFieldChange(i, 'partyType', e.target.value, 'cost')}>
                                  <option>Vendor</option><option>Transporter</option><option>Importer</option><option>Others</option><option>Agent</option>
                                </select>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Rate</span>
                                <div className="ep-inline">
                                  <input type="number" step="0.01" value={row.cost?.rate ?? 0.00} onChange={e => handleFieldChange(i, 'rate', e.target.value, 'cost')} />
                                  <select value={row.cost?.currency || 'INR'} onChange={e => handleFieldChange(i, 'currency', e.target.value, 'cost')}>
                                    <option>INR</option><option>USD</option><option>EUR</option>
                                  </select>
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Payable To</span>
                                <div className="ep-search-wrap">
                                  <input 
                                    type="text" 
                                    list={`masterList-${i}`}
                                    value={row.cost?.partyName || ''} 
                                    onChange={e => handleFieldChange(i, 'partyName', e.target.value, 'cost')} 
                                  />
                                  <button type="button" className="ep-search-btn">🔍</button>
                                  <datalist id={`masterList-${i}`}>
                                    {(row.cost?.partyType === 'Agent' || row.cost?.partyType === 'Others' ? shippingLines : 
                                      row.cost?.partyType === 'Vendor' || row.cost?.partyType === 'Transporter' ? suppliers :
                                      row.cost?.partyType === 'Importer' ? organizations : [])
                                      .filter(item => !row.cost?.partyName || item.name.toLowerCase().includes(row.cost.partyName.toLowerCase()))
                                      .slice(0, 10)
                                      .map((item, idx) => (
                                        <option key={idx} value={item.name} />
                                      ))}
                                  </datalist>
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Total Amount</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={row.cost?.amount || 0} />
                                  <span style={{ fontSize: '11px', color: '#555', paddingLeft: '4px' }}>{row.cost?.currency || 'INR'}</span>
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Total Amount(INR)</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={row.cost?.amountINR || 0} />
                                  <span style={{ fontSize: '11px', color: '#555', paddingLeft: '4px' }}>INR</span>
                                </div>
                              </div>

                              {/* GST & TDS FIELDS FOR COST */}
                              <div className="ep-row">
                                <span className="ep-label">Include GST?</span>
                                <div className="ep-inline">
                                  <input type="checkbox" checked={row.cost?.isGst || false} onChange={e => handleFieldChange(i, 'isGst', e.target.checked, 'cost')} />
                                  {row.cost?.isGst && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <input type="number" style={{ width: '50px' }} value={row.cost?.gstRate ?? 18} onChange={e => handleFieldChange(i, 'gstRate', e.target.value, 'cost')} />
                                      <span style={{ fontSize: '11px' }}>%</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="ep-row">
                                <span className="ep-label">Basic Amount</span>
                                <div className="ep-inline">
                                  <input type="number" readOnly className="ep-read" style={{ background: '#f4f8fc' }} value={formatNumber(row.cost?.basicAmount)} />
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
                                  <input type="number" readOnly className="ep-read" style={{ background: '#fff9f9', fontWeight: 'bold', color: '#d32f2f', border: '1px solid #ffcdd2' }} value={formatNumber(row.cost?.netPayable)} />
                                  <button 
                                    type="button" 
                                    className="upload-btn" 
                                    style={{ 
                                      marginRight: '10px', 
                                      backgroundColor: '#1976d2', 
                                      color: '#fff', 
                                      borderColor: '#1565c0' 
                                    }}
                                    onClick={() => setPurchaseBookData({
                                        partyName: row.cost?.partyName,
                                        amount: row.cost?.amount,
                                        gstRate: row.cost?.gstRate,
                                        cgst: row.cost?.cgst,
                                        sgst: row.cost?.sgst,
                                        igst: row.cost?.igst,
                                        tdsAmount: row.cost?.tdsAmount,
                                        totalAmount: row.cost?.totalAmount,
                                        chargeHead: row.chargeHead
                                    })}
                                  >
                                    Purchase book
                                  </button>
                                  <button 
                                    type="button" 
                                    className="upload-btn" 
                                    style={{ backgroundColor: '#d32f2f', color: '#fff', borderColor: '#b71c1c' }}
                                    onClick={() => setPaymentRequestData({
                                        partyName: row.cost?.partyName,
                                        netPayable: row.cost?.netPayable,
                                        chargeHead: row.chargeHead
                                    })}
                                  >
                                    Request Payment
                                  </button>
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
          <button type="button" className="btn" onClick={handleSave}>Update</button>
          <button type="button" className="btn" onClick={handleSave}>Update & Close</button>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
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
        jobYear={jobYear}
      />

      <PurchaseBookModal 
        isOpen={purchaseBookData !== null}
        onClose={() => setPurchaseBookData(null)}
        initialData={purchaseBookData}
        jobNumber={jobNumber}
      />
    </div>
  );
};

export default EditChargeModal;
