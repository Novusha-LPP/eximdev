import React from 'react';
import { Chip, IconButton } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DescriptionIcon from '@mui/icons-material/Description';
import './charges.css';

const extractFileName = (url) => {
  try {
      if (!url) return "File";
      const parts = url.split("/");
      return decodeURIComponent(parts[parts.length - 1]);
  } catch (error) {
      return "File";
  }
};

const isCustomDutyCharge = (ch) => {
  if (!ch) return false;
  const head = (ch.chargeHead || ch.name || '').toLowerCase().trim();
  const cat = (ch.category || '').toLowerCase().trim();
  const partyType = (ch.cost?.partyType || '').toLowerCase().trim();
  return head.includes('custom duty') || 
         head.includes('customs duty') || 
         cat.includes('custom duty') || 
         cat.includes('customs duty') || 
         partyType === 'custom duty';
};

const ChargesTable = ({ 
  charges, 
  activeTab, 
  selectedIds, 
  onSelectCharge, 
  onSelectAll, 
  onOpenFileModal,
  onRemoveAttachment,
  onEditCharge,
  onUpdateCharge,
  readOnly,
  isLocked,
  readOnlyBase,
  isAuthorized
}) => {
  const [billNoMap, setBillNoMap] = React.useState({});

  // Synchronize local billNoMap with charges
  React.useEffect(() => {
    const map = {};
    (charges || []).forEach(ch => {
      if (ch._id) {
        map[ch._id] = ch.bill_no || ch.billNo || '';
      }
    });
    setBillNoMap(map);
  }, [charges]);

  const handleBillNoChange = (chargeId, value) => {
    setBillNoMap(prev => ({ ...prev, [chargeId]: value }));
  };

  const handleBillNoBlur = async (charge) => {
    const currentVal = billNoMap[charge._id] !== undefined ? billNoMap[charge._id] : (charge.bill_no || charge.billNo || '');
    const originalVal = charge.bill_no || charge.billNo || '';
    if (currentVal.trim() !== (originalVal || '').trim()) {
      if (onUpdateCharge) {
        await onUpdateCharge(charge._id, { bill_no: currentVal.trim(), billNo: currentVal.trim() });
      }
    }
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0.00';
    return Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleCopy = (e, text) => {
    e.stopPropagation();
    if (!text || text === "-" || text === "N/A") return;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text)
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

  const renderParticularsHeaders = () => (
    <>
      <th>Category</th>

      <th style={{ width: '120px' }}>
        PB No.
        <IconButton size="small" onClick={(e) => {
          const pbNos = charges.map(c => c.purchase_book_no).filter(no => no && no !== "-");
          if (pbNos.length > 0) handleCopy(e, pbNos.join(", "));
        }} title="Copy all PB Nos">
          <ContentCopyIcon style={{ fontSize: '14px' }} />
        </IconButton>
      </th>
      <th style={{ width: '120px' }}>
        PR No.
        <IconButton size="small" onClick={(e) => {
          const prNos = charges.map(c => c.payment_request_no).filter(no => no && no !== "-");
          if (prNos.length > 0) handleCopy(e, prNos.join(", "));
        }} title="Copy all PR Nos">
          <ContentCopyIcon style={{ fontSize: '14px' }} />
        </IconButton>
      </th>
      <th>Remarks</th>
      <th style={{ width: '100px' }}>Attach</th>
    </>
  );

  const renderRevenueHeaders = () => (
    <>
      <th style={{ width: '120px' }}>Receivable Party</th>
      <th style={{ width: '80px' }}>Basis</th>
      <th style={{ width: '40px' }}>Curr.</th>
      <th style={{ width: '60px' }}>Ex. Rate</th>
      <th style={{ width: '50px' }}>Qty</th>
      <th style={{ width: '80px' }}>Rate</th>
      <th style={{ width: '95px' }}>Total Amount</th>
      <th style={{ width: '95px' }}>Total Amt (INR)</th>
      <th style={{ width: '180px' }}>Attach</th>
    </>
  );

  const renderCostHeaders = () => (
    <>
      <th style={{ width: '120px' }}>Payable Party</th>
      <th style={{ width: '80px' }}>Basis</th>
      <th style={{ width: '40px' }}>Curr.</th>
      <th style={{ width: '60px' }}>Ex. Rate</th>
      <th style={{ width: '50px' }}>Qty</th>
      <th style={{ width: '80px' }}>Rate</th>
      <th style={{ width: '95px' }}>Total Amount</th>
      <th style={{ width: '95px' }}>Total Amt (INR)</th>
      <th style={{ width: '95px' }}>Net Payable</th>
      <th style={{ width: '110px' }}>Expense Made By</th>
      <th style={{ width: '120px' }}>Payment Status</th>
      <th style={{ width: '180px' }}>Attach</th>
    </>
  );

  const renderAttachmentCell = (ch, urls, isIndividualLocked) => (
    <td className="upload-cell" onClick={(e) => e.stopPropagation()}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center", justifyContent: "center" }}>
        {Array.isArray(urls) && urls.map((url, urlIdx) => (
          <Chip
              key={urlIdx}
              icon={<DescriptionIcon style={{ fontSize: "12px" }} />}
              label={
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={(e) => e.stopPropagation()} 
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  {extractFileName(url)}
                </a>
              }
              size="small"
              onDelete={readOnlyBase ? undefined : (e) => {
                e.stopPropagation();
                e.preventDefault();
                const newUrls = urls.filter((_, i) => i !== urlIdx);
                onRemoveAttachment(ch, activeTab, newUrls);
              }}
              clickable
              sx={{
                  maxWidth: "130px",
                  fontSize: "9px",
                  height: "18px",
                  backgroundColor: "#e3f2fd",
                  color: "#1565c0",
                  "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 4px" },
                  "& .MuiChip-deleteIcon": { 
                    fontSize: "14px", 
                    margin: "0 2px 0 -4px",
                    color: "#d32f2f !important",
                    opacity: 0.8,
                    "&:hover": { opacity: 1 }
                  }
              }}
          />
        ))}
        <button 
           type="button"
           className="upload-btn" 
           onClick={() => onOpenFileModal(ch, activeTab)}
           disabled={readOnlyBase}
           style={{ padding: "1px 4px", fontSize: "9px" }}
        >
          {Array.isArray(urls) && urls.length > 0 ? '+' : '⇧'}
        </button>
      </div>
    </td>
  );

  return (
    <div className="charges-grid-wrapper" style={{ marginTop: '0' }}>
      <table className="charges-main-grid">
        <thead>
          <tr className="charges-header">
            <th style={{ width: '30px', textAlign: 'center' }}>
              <input type="checkbox" onChange={onSelectAll} disabled={readOnly} />
            </th>
            <th style={{ width: '30px', textAlign: 'center' }}>No.</th>
            <th style={{ minWidth: '220px', width: '240px', textAlign: 'left' }}>Charge Item</th>
            {activeTab === 'particulars' && renderParticularsHeaders()}
            {activeTab === 'revenue' && renderRevenueHeaders()}
            {activeTab === 'cost' && renderCostHeaders()}
          </tr>
        </thead>
        <tbody>
          {charges.length === 0 ? (
            <tr>
              <td colSpan="20" style={{ textAlign: 'center', padding: '20px', color: '#8aA0b0' }}>
                No charges found. Add a charge to get started.
              </td>
            </tr>
          ) : charges.map((ch, idx) => {
            const isSelected = selectedIds.has(ch._id);
            
            if (ch.isHeader) {
                const isIndividualLocked = false; // Headers themselves aren't PR-locked usually
                return (
                  <tr 
                    key={ch._id || idx} 
                    className={`charges-header-row ${isSelected ? 'charges-selected' : ''}`}
                    onClick={() => !(readOnly || isIndividualLocked) && onSelectCharge(ch._id)}
                    style={{ backgroundColor: '#f0f4f8', cursor: 'pointer' }}
                  >
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => onSelectCharge(ch._id)} disabled={readOnly || isIndividualLocked} />
                    </td>
                    <td colSpan="20" style={{ fontWeight: 'bold', color: '#061f45', textAlign: 'left', padding: '8px 12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {ch.chargeHead}
                    </td>
                  </tr>
                );
            }

            const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
            const role = (user?.role || "").toLowerCase();
            const isAuth = role === "admin" || role === "head_of_department" || role === "hod";
            
            const hasPR = ch.payment_request_no && String(ch.payment_request_no).trim().length > 0;
            const hasPB = ch.purchase_book_no && String(ch.purchase_book_no).trim().length > 0;
            const isIndividualLocked = (hasPR || hasPB) && !isAuth;
            const attachmentUrls = [...new Set([
              ...(Array.isArray(ch.revenue?.url) ? ch.revenue.url : []),
              ...(Array.isArray(ch.revenue?.url_draft) ? ch.revenue.url_draft : []),
              ...(Array.isArray(ch.revenue?.url_final) ? ch.revenue.url_final : []),
              ...(Array.isArray(ch.cost?.url) ? ch.cost.url : []),
              ...(Array.isArray(ch.cost?.url_draft) ? ch.cost.url_draft : []),
              ...(Array.isArray(ch.cost?.url_final) ? ch.cost.url_final : []),
            ])];

            const isCustomDuty = isCustomDutyCharge(ch);
            const currentBillNo = billNoMap[ch._id] !== undefined ? billNoMap[ch._id] : (ch.bill_no || ch.billNo || '');
            const hasBillNo = Boolean(currentBillNo && String(currentBillNo).trim().length > 0);

            return (
              <tr 
                key={ch._id || idx} 
                className={`${isSelected ? 'charges-selected' : ''} ${isIndividualLocked ? 'charges-locked-row' : ''}`} 
                onClick={() => !(readOnly || isIndividualLocked) && onSelectCharge(ch._id)}
                onDoubleClick={() => onEditCharge(ch)}
                title={isIndividualLocked ? "This charge is locked because a Payment Request or Purchase Book number has been generated." : ""}
              >
                <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={isSelected} onChange={() => onSelectCharge(ch._id)} disabled={readOnly || isIndividualLocked} />
                </td>
                <td style={{ textAlign: 'center' }}>
                  {isIndividualLocked ? (
                    <span title="Locked" style={{ cursor: 'help' }}>🔒</span>
                  ) : (
                    idx + 1
                  )}
                </td>
                <td 
                  style={{ 
                    fontWeight: 'bold', 
                    color: hasBillNo ? '#15803d' : (isIndividualLocked ? '#666' : '#1a3a5c'),
                    backgroundColor: hasBillNo ? '#ecfdf5' : (isCustomDuty ? '#fffdf0' : 'inherit'),
                    borderLeft: hasBillNo ? '4px solid #16a34a' : (isCustomDuty ? '4px solid #f59e0b' : undefined),
                    textAlign: 'left',
                    padding: '4px 8px',
                    transition: 'all 0.25s ease'
                  }}
                  title={isCustomDuty ? (hasBillNo ? `Custom Duty - Bill No: ${currentBillNo}` : 'Custom Duty - Please fill Bill No.') : ''}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', minHeight: '26px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ 
                        color: hasBillNo ? '#15803d' : (isIndividualLocked ? '#666' : '#1a3a5c'),
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap'
                      }}>
                        {ch.chargeHead}
                      </span>
                      {isCustomDuty && hasBillNo && (
                        <span 
                          style={{ 
                            fontSize: '9px',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            border: '1px solid #86efac',
                            fontWeight: '700',
                            letterSpacing: '0.3px',
                            textTransform: 'uppercase'
                          }}
                        >
                          Billed
                        </span>
                      )}
                    </div>

                    {isCustomDuty && (
                      <div 
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }} 
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          placeholder="Bill No."
                          title="Enter Custom Duty Bill No."
                          value={currentBillNo}
                          onChange={(e) => handleBillNoChange(ch._id, e.target.value)}
                          onBlur={() => handleBillNoBlur(ch)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          disabled={readOnlyBase}
                          style={{
                            height: '22px',
                            width: '95px',
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: hasBillNo ? '1.5px solid #22c55e' : '1.5px dashed #f59e0b',
                            backgroundColor: hasBillNo ? '#ffffff' : '#fffdf5',
                            color: hasBillNo ? '#15803d' : '#334155',
                            fontWeight: hasBillNo ? '700' : '500',
                            outline: 'none',
                            boxShadow: hasBillNo ? '0 1px 2px rgba(34, 197, 94, 0.15)' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                        />
                        {hasBillNo && (
                          <span 
                            title={`Custom Duty Bill No: ${currentBillNo}`}
                            style={{ 
                              color: '#16a34a', 
                              fontSize: '13px', 
                              fontWeight: 'bold',
                              lineHeight: 1
                            }}
                          >
                            ✓
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                
                {activeTab === 'particulars' && (
                  <>
                    <td>{ch.category}</td>
                  
                    <td style={{ fontWeight: '600', color: '#2e7d32' }}>
                      {ch.purchase_book_no || '-'}
                      {ch.purchase_book_no && (
                        <IconButton size="small" onClick={(e) => handleCopy(e, ch.purchase_book_no)} title="Copy PB No">
                          <ContentCopyIcon style={{ fontSize: '14px' }} />
                        </IconButton>
                      )}
                    </td>
                    <td style={{ fontWeight: '600', color: '#1565c0' }}>
                      {ch.payment_request_no || '-'}
                      {ch.payment_request_no && (
                        <IconButton size="small" onClick={(e) => handleCopy(e, ch.payment_request_no)} title="Copy PR No">
                          <ContentCopyIcon style={{ fontSize: '14px' }} />
                        </IconButton>
                      )}
                    </td>
                    <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ch.remark || ''}>
                      {ch.remark || ''}
                    </td>
                    {renderAttachmentCell(ch, attachmentUrls, isIndividualLocked)}
                  </>
                )}

                {activeTab === 'revenue' && (
                  <>
                    <td style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.revenue?.partyName || '-'}</td>
                    <td>{ch.revenue?.basis || '-'}</td>
                    <td>{ch.revenue?.currency || 'INR'}</td>
                    <td className="charges-number">{formatNumber(ch.revenue?.exchangeRate)}</td>
                    <td className="charges-number">{ch.revenue?.qty || 0}</td>
                    <td className="charges-number">{formatNumber(ch.revenue?.rate)}</td>
                    <td className="charges-number" style={{ fontWeight: 'bold' }}>{formatNumber(ch.revenue?.amount)}</td>
                    <td className="charges-number" style={{ fontWeight: 'bold', color: '#0a5080' }}>{formatNumber(ch.revenue?.amountINR)}</td>
                    {renderAttachmentCell(ch, attachmentUrls, isIndividualLocked)}
                  </>
                )}

                {activeTab === 'cost' && (
                  <>
                    <td style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.cost?.partyName || '-'}</td>
                    <td>{ch.cost?.basis || '-'}</td>
                    <td>{ch.cost?.currency || 'INR'}</td>
                    <td className="charges-number">{formatNumber(ch.cost?.exchangeRate)}</td>
                    <td className="charges-number">{ch.cost?.qty || 0}</td>
                    <td className="charges-number">{formatNumber(ch.cost?.rate)}</td>
                    <td className="charges-number" style={{ fontWeight: 'bold' }}>{formatNumber(ch.cost?.amount)}</td>
                    <td className="charges-number" style={{ fontWeight: 'bold', color: '#6c4a30' }}>{formatNumber(ch.cost?.amountINR)}</td>
                    <td className="charges-number" style={{ fontWeight: 'bold', color: '#d32f2f' }}>{formatNumber(ch.cost?.netPayable)}</td>
                    <td style={{ textAlign: 'center', fontWeight: '500', color: '#2e7d32' }}>{ch.cost?.expenseMadeBy || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      {ch.payment_request_no ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '10px', color: '#1565c0', fontWeight: 'bold' }}>{ch.payment_request_no}</span>
                            <IconButton size="small" onClick={(e) => handleCopy(e, ch.payment_request_no)} title="Copy PR No" sx={{ p: 0 }}>
                              <ContentCopyIcon style={{ fontSize: '12px' }} />
                            </IconButton>
                          </div>
                          {ch.payment_request_status === 'Paid' ? (
                            ch.payment_request_receipt_url ? (
                              <a 
                                href={ch.payment_request_receipt_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{ 
                                  fontSize: '9px', 
                                  padding: '1px 6px', 
                                  borderRadius: '8px', 
                                  background: '#e8f5e9',
                                  color: '#2e7d32',
                                  border: '1px solid currentColor',
                                  fontWeight: 'bold',
                                  textDecoration: 'none',
                                  cursor: 'pointer'
                                }}
                                title="Click to view receipt"
                              >
                                Payment Done
                              </a>
                            ) : (
                              <span style={{ 
                                fontSize: '9px', 
                                padding: '1px 6px', 
                                borderRadius: '8px', 
                                background: '#e8f5e9',
                                color: '#2e7d32',
                                border: '1px solid currentColor',
                                fontWeight: 'bold'
                              }}>
                                Payment Done
                              </span>
                            )
                          ) : (
                            <span style={{ 
                              fontSize: '9px', 
                              padding: '1px 6px', 
                              borderRadius: '8px', 
                              background: '#fff3e0',
                              color: '#ef6c00',
                              border: '1px solid currentColor',
                              fontWeight: 'bold'
                            }}>
                              {ch.payment_request_status || 'Pending'}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '10px', color: '#ccc', fontStyle: 'italic' }}>No PR</span>
                      )}
                    </td>
                    {renderAttachmentCell(ch, attachmentUrls, isIndividualLocked)}
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ChargesTable;
