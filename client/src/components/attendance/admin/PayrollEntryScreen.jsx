import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../../contexts/UserContext';
import payrollAPI from '../../../api/attendance/payroll.api';
import toast from 'react-hot-toast';
import moment from 'moment';
import {
  FiArrowLeft, FiSave, FiEdit2, FiInfo, FiTrendingUp,
  FiTrendingDown, FiLock, FiAlertCircle, FiSettings, FiCheck
} from 'react-icons/fi';
import './PayrollPages.css';
const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";

const PayrollEntryScreen = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [selectedMonth, setSelectedMonth] = useState(moment().format('MM'));
  const [entries, setEntries] = useState([]);
  const [payrollRun, setPayrollRun] = useState(null);
  
  // Track editing state per summary
  const [editData, setEditData] = useState({}); // { [summaryId]: { ...fields } }
  const [savingId, setSavingId] = useState(null);

  const companyId = user?.company_id?._id || user?.company_id;

  const fetchEntries = useCallback(async () => {
    if (!companyId) {
      if (user) setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await payrollAPI.getPayrollEntries(companyId, selectedYear, selectedMonth);
      if (res.success) {
        setEntries(res.data.summaries || []);
        setPayrollRun(res.data.run || null);
        
        // Initialize editing state
        const initialEdits = {};
        (res.data.summaries || []).forEach(e => {
          initialEdits[e._id] = {
            adjustment_amount: e.adjustment_amount || 0,
            adjustment_remarks: e.adjustment_remarks || '',
            other_deductions: e.other_deductions || 0,
            other_deduction_remarks: e.other_deduction_remarks || '',
            remarks: e.remarks || ''
          };
        });
        setEditData(initialEdits);
      }
    } catch (err) {
      console.error('Fetch entries error:', err);
      toast.error('Failed to load payroll entries');
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedYear, selectedMonth]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleInputChange = (summaryId, field, value) => {
    setEditData(prev => ({
      ...prev,
      [summaryId]: {
        ...prev[summaryId],
        [field]: value
      }
    }));
  };

  const handleSaveRow = async (summaryId) => {
    const changes = editData[summaryId];
    if (!changes) return;

    setSavingId(summaryId);
    try {
      const res = await payrollAPI.updatePayrollEntry(summaryId, {
        adjustment_amount: Number(changes.adjustment_amount) || 0,
        adjustment_remarks: changes.adjustment_remarks,
        other_deductions: Number(changes.other_deductions) || 0,
        other_deduction_remarks: changes.other_deduction_remarks,
        remarks: changes.remarks
      });

      if (res.success) {
        toast.success('Row updated successfully');
        // Refresh local entry values to match computed totals returned from server
        setEntries(prev => prev.map(item => {
          if (item._id === summaryId) {
            return {
              ...item,
              ...res.data,
              employee_id: item.employee_id || res.data?.employee_id
            };
          }
          return item;
        }));
      } else {
        toast.error(res.message || 'Failed to update row');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to save');
    } finally {
      setSavingId(null);
    }
  };

  const formatCurrency = (v) => {
    return '₹' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const isLocked = payrollRun?.payroll_status === 'LOCKED';

  // Calculate Column Totals
  const totals = entries.reduce((acc, cur) => {
    acc.gross += cur.gross_amount || 0;
    acc.pf += cur.pf_employee || 0;
    acc.esi += cur.esi_employee || 0;
    acc.pt += cur.professional_tax || 0;
    
    // Use edited values if modified, else fallback to current summary
    const edits = editData[cur._id] || {};
    acc.adjustments += Number(edits.adjustment_amount) || 0;
    acc.otherDeductions += Number(edits.other_deductions) || 0;
    
    acc.net += cur.net_payable_amount || 0;
    return acc;
  }, { gross: 0, pf: 0, esi: 0, pt: 0, adjustments: 0, otherDeductions: 0, net: 0 });

  return (
    <div className="payroll-page">
      {/* Header */}
      <div className="payroll-page__header">
        <div>
          <button className="payroll-page__back-btn" onClick={() => navigate('/attendance/admin/payroll-dashboard')}>
            <FiArrowLeft /> Back to Dashboard
          </button>
          <h1 style={{ marginTop: '12px' }}>Payroll Entries</h1>
          <p>Review, adjust, and edit individual payroll calculations</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="payroll-filter-bar">
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
          {moment.months().map((m, i) => (
            <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
          ))}
        </select>
        <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value, 10))}>
          {[moment().year(), moment().year() - 1, moment().year() - 2].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button className="payroll-action-btn ghost" onClick={fetchEntries}>
          Refresh List
        </button>
        <div className="payroll-filter-bar__spacer" />
        {payrollRun && (
          <span className={`payroll-status-badge ${payrollRun.payroll_status?.toLowerCase()}`}>
            {isLocked ? <FiLock size={12} style={{ marginRight: '4px' }} /> : null}
            {payrollRun.payroll_status}
          </span>
        )}
      </div>

      {/* Warning if Locked */}
      {isLocked && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          color: '#991b1b',
          fontSize: '13px',
          fontWeight: 500
        }}>
          <FiAlertCircle size={18} />
          <span>Payroll is LOCKED for this month. Unlock it from the Dashboard to make adjustments.</span>
        </div>
      )}

      {/* Main Entries Grid */}
      <div className="payroll-card">
        <div className="payroll-card__header">
          <div className="payroll-card__title">
            All Calculated Summaries
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Showing {entries.length} employees
          </div>
        </div>
        
        <div className="payroll-card__body" style={{ padding: 0 }}>
          {loading ? (
            <div className="payroll-loading" style={{ padding: '40px' }}>
              <div className="payroll-loading__spinner" />
              <span>Loading payroll entries...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="payroll-empty">
              <div className="payroll-empty__icon">📭</div>
              <div className="payroll-empty__title">No Payroll Data Found</div>
              <div className="payroll-empty__desc">
                Generate payroll for the selected month to get started.
              </div>
            </div>
          ) : (
            <>
              <div className="payroll-table-scroll">
                <table className="payroll-data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th className="text-center">Days</th>
                      <th className="text-right">Gross Salary</th>
                      <th className="text-right">PF (EE)</th>
                      <th className="text-right">ESI</th>
                      <th className="text-right">PT</th>
                      <th className="text-right">Other Deduct</th>
                      <th className="text-right">Adjustment</th>
                      <th className="text-right">Net Payable</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(e => {
                      const rowEdit = editData[e._id] || {};
                      const isSaving = savingId === e._id;
                      
                      // Check if dirty
                      const isDirty = 
                        Number(rowEdit.adjustment_amount) !== (e.adjustment_amount || 0) ||
                        rowEdit.adjustment_remarks !== (e.adjustment_remarks || '') ||
                        Number(rowEdit.other_deductions) !== (e.other_deductions || 0) ||
                        rowEdit.other_deduction_remarks !== (e.other_deduction_remarks || '');

                      return (
                        <tr key={e._id}>
                          <td>
                            <div className="emp-cell">
                              <img 
                                src={e.employee_id?.employee_photo || DEFAULT_AVATAR} 
                                alt="" 
                                className="emp-cell__avatar"
                                onError={(el) => { el.target.onerror = null; el.target.src = DEFAULT_AVATAR; }}
                              />
                              <div className="emp-cell__info">
                                <span className="emp-cell__name">
                                  {e.employee_id?.first_name} {e.employee_id?.last_name}
                                </span>
                                <span className="emp-cell__meta">
                                  {e.employee_id?.employee_code || 'No Code'} • {e.employee_id?.department || 'Staff'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="text-center font-mono">
                            <span title={`Present: ${e.present_days}, Payable: ${e.payable_days}`}>
                              {e.payable_days}/{e.total_days_in_month}
                            </span>
                          </td>
                          <td className="text-right font-mono">{formatCurrency(e.gross_amount)}</td>
                          <td className="text-right font-mono">{formatCurrency(e.pf_employee)}</td>
                          <td className="text-right font-mono">{formatCurrency(e.esi_employee)}</td>
                          <td className="text-right font-mono">{formatCurrency(e.professional_tax)}</td>
                          
                          {/* Other Deductions */}
                          <td className="text-right">
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                              <input
                                type="number"
                                className="payroll-inline-input"
                                value={rowEdit.other_deductions || ''}
                                onChange={el => handleInputChange(e._id, 'other_deductions', el.target.value)}
                                disabled={isLocked || isSaving}
                                placeholder="0"
                              />
                              <input
                                type="text"
                                style={{ width: '80px', fontSize: '9px', padding: '2px', border: '1px solid #f1f5f9', borderRadius: '4px', outline: 'none' }}
                                value={rowEdit.other_deduction_remarks || ''}
                                onChange={el => handleInputChange(e._id, 'other_deduction_remarks', el.target.value)}
                                disabled={isLocked || isSaving}
                                placeholder="Reason"
                              />
                            </div>
                          </td>

                          {/* Adjustment Amount */}
                          <td className="text-right">
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                              <input
                                type="number"
                                className="payroll-inline-input"
                                style={{ color: Number(rowEdit.adjustment_amount) > 0 ? '#10b981' : Number(rowEdit.adjustment_amount) < 0 ? '#ef4444' : 'inherit' }}
                                value={rowEdit.adjustment_amount || ''}
                                onChange={el => handleInputChange(e._id, 'adjustment_amount', el.target.value)}
                                disabled={isLocked || isSaving}
                                placeholder="0"
                              />
                              <input
                                type="text"
                                style={{ width: '80px', fontSize: '9px', padding: '2px', border: '1px solid #f1f5f9', borderRadius: '4px', outline: 'none' }}
                                value={rowEdit.adjustment_remarks || ''}
                                onChange={el => handleInputChange(e._id, 'adjustment_remarks', el.target.value)}
                                disabled={isLocked || isSaving}
                                placeholder="Reason"
                              />
                            </div>
                          </td>
                          
                          <td className="text-right font-mono" style={{ fontWeight: 'bold' }}>
                            {formatCurrency(e.net_payable_amount)}
                          </td>
                          


                          <td className="text-center">
                            <button
                              className={`payroll-action-btn ${isDirty ? 'primary' : 'ghost'}`}
                              style={{ padding: '6px 10px', borderRadius: '6px' }}
                              onClick={() => handleSaveRow(e._id)}
                              disabled={isLocked || isSaving || !isDirty}
                              title="Save details"
                            >
                              {isSaving ? '...' : isDirty ? <FiSave size={14} /> : <FiCheck size={14} style={{ color: '#10b981' }} />}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Total Summary</td>
                      <td className="text-center">—</td>
                      <td className="text-right font-mono">{formatCurrency(totals.gross)}</td>
                      <td className="text-right font-mono">{formatCurrency(totals.pf)}</td>
                      <td className="text-right font-mono">{formatCurrency(totals.esi)}</td>
                      <td className="text-right font-mono">{formatCurrency(totals.pt)}</td>
                      <td className="text-right font-mono">{formatCurrency(totals.otherDeductions)}</td>
                      <td className="text-right font-mono" style={{ color: totals.adjustments >= 0 ? '#10b981' : '#ef4444' }}>
                        {totals.adjustments >= 0 ? '+' : ''}{formatCurrency(totals.adjustments)}
                      </td>
                      <td className="text-right font-mono">{formatCurrency(totals.net)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Bottom Summary Panel */}
              <div className="payroll-summary-footer">
                <div className="payroll-summary-footer__item">
                  <span className="payroll-summary-footer__label">Gross Payroll</span>
                  <span className="payroll-summary-footer__value">{formatCurrency(totals.gross)}</span>
                </div>
                <div className="payroll-summary-footer__item">
                  <span className="payroll-summary-footer__label">Adjustments</span>
                  <span className="payroll-summary-footer__value" style={{ color: totals.adjustments >= 0 ? '#10b981' : '#ef4444' }}>
                    {totals.adjustments >= 0 ? '+' : ''}{formatCurrency(totals.adjustments)}
                  </span>
                </div>
                <div className="payroll-summary-footer__item">
                  <span className="payroll-summary-footer__label">Net Payable</span>
                  <span className="payroll-summary-footer__value green">{formatCurrency(totals.net)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayrollEntryScreen;
