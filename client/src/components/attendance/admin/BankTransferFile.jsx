import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../../contexts/UserContext';
import payrollAPI from '../../../api/attendance/payroll.api';
import toast from 'react-hot-toast';
import moment from 'moment';
import * as XLSX from 'xlsx';
import {
  FiArrowLeft, FiDownload, FiDollarSign, FiRefreshCw,
  FiBriefcase, FiAlertTriangle, FiCheckCircle, FiEye, FiEyeOff
} from 'react-icons/fi';
import './PayrollPages.css';

const BankTransferFile = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [selectedMonth, setSelectedMonth] = useState(moment().format('MM'));
  const [transferData, setTransferData] = useState(null);
  const [unmaskedRows, setUnmaskedRows] = useState({});

  const companyId = user?.company_id?._id || user?.company_id;

  const fetchTransferData = useCallback(async () => {
    if (!companyId) {
      if (user) setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch current month's payroll run to get run ID
      const runRes = await payrollAPI.getPayrollRun(companyId, selectedYear, selectedMonth);
      if (runRes.success && runRes.data) {
        // 2. Fetch bank transfer data using run ID
        const res = await payrollAPI.getBankTransferData(runRes.data._id);
        if (res.success) {
          setTransferData(res.data);
        } else {
          setTransferData(null);
        }
      } else {
        setTransferData(null);
      }
    } catch (err) {
      console.error('Fetch bank transfer data error:', err);
      setTransferData(null);
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedYear, selectedMonth]);

  useEffect(() => {
    fetchTransferData();
  }, [fetchTransferData]);

  const handleExportCSV = () => {
    if (!transferData || !transferData.transfers || transferData.transfers.length === 0) {
      toast.error('No transfer records to export');
      return;
    }

    const exportRows = transferData.transfers.map((t, index) => ({
      'Sr No': index + 1,
      'Employee Code': t.employee_code,
      'Beneficiary Name': t.name_on_bank || t.employee_name,
      'Beneficiary Account No': t.bank_account_no,
      'IFSC Code': t.ifsc_code,
      'Bank Name': t.bank_name || '',
      'Amount (INR)': t.net_amount,
      'Narration': t.narration
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Salary_Transfer_${user?.company_name?.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedMonth}_${selectedYear}.csv`;
    a.click();
    toast.success('CSV bank transfer file downloaded successfully!');
  };

  const handleExportExcel = () => {
    if (!transferData || !transferData.transfers || transferData.transfers.length === 0) {
      toast.error('No transfer records to export');
      return;
    }

    const exportRows = transferData.transfers.map((t, index) => ({
      'Sr No': index + 1,
      'Employee Code': t.employee_code,
      'Beneficiary Name': t.name_on_bank || t.employee_name,
      'Beneficiary Account No': t.bank_account_no,
      'IFSC Code': t.ifsc_code,
      'Bank Name': t.bank_name || '',
      'Amount (INR)': t.net_amount,
      'Narration': t.narration
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bank_Transfer');
    XLSX.writeFile(workbook, `Salary_Transfer_${user?.company_name?.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedMonth}_${selectedYear}.xlsx`);
    toast.success('Excel bank transfer file generated successfully!');
  };

  const formatCurrency = (v) => {
    return '₹' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const transfers = transferData?.transfers || [];
  const run = transferData?.run;

  // Find incomplete bank profiles
  const incompleteProfiles = transfers.filter(
    t => !t.bank_account_no || !t.ifsc_code
  );

  return (
    <div className="payroll-page">
      {/* Header */}
      <div className="payroll-page__header">
        <div>
          <button className="payroll-page__back-btn" onClick={() => navigate('/attendance/admin/payroll-dashboard')}>
            <FiArrowLeft /> Back to Dashboard
          </button>
          <h1 style={{ marginTop: '12px' }}>Bank Transfer File Generator</h1>
          <p>Download corporate bank-compatible flat files for direct net salary transfer</p>
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
        <button className="payroll-action-btn ghost" onClick={fetchTransferData}>
          <FiRefreshCw /> Refresh
        </button>
        <div className="payroll-filter-bar__spacer" />
        <button
          className="payroll-action-btn ghost"
          onClick={handleExportCSV}
          disabled={transfers.length === 0}
        >
          <FiDownload /> Export CSV
        </button>
        <button
          className="payroll-action-btn success"
          onClick={handleExportExcel}
          disabled={transfers.length === 0}
        >
          <FiDownload /> Export Excel (xlsx)
        </button>
      </div>

      {/* Warnings / Bank Profile Checks */}
      {incompleteProfiles.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '20px',
          color: '#b45309',
          fontSize: '13px',
          fontWeight: 500
        }}>
          <FiAlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>
            <strong>Warning:</strong> {incompleteProfiles.length} employees have missing Bank Account or IFSC details. Please correct them in the Employee Master.
          </span>
        </div>
      )}

      {/* Details summary panel */}
      {transferData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div className="payroll-card" style={{ marginBottom: 0, padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Total Salary Outflow</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
              {formatCurrency(transferData.totalAmount)}
            </div>
          </div>
          <div className="payroll-card" style={{ marginBottom: 0, padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Total Transfers</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
              {transferData.totalTransfers} Employee(s)
            </div>
          </div>
          <div className="payroll-card" style={{ marginBottom: 0, padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Status</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', fontWeight: 700, color: run?.payroll_status === 'LOCKED' ? '#dc2626' : '#0284c7', marginTop: '6px' }}>
              {run?.payroll_status === 'LOCKED' ? <FiCheckCircle style={{ color: '#16a34a' }} /> : <FiAlertTriangle />}
              {run?.payroll_status || 'NOT CREATED'}
            </div>
          </div>
        </div>
      )}

      {/* Main card */}
      <div className="payroll-card">
        <div className="payroll-card__header">
          <div className="payroll-card__title">
            Direct Salary Transfer List
          </div>
        </div>

        <div className="payroll-card__body" style={{ padding: 0 }}>
          {loading ? (
            <div className="payroll-loading" style={{ padding: '40px' }}>
              <div className="payroll-loading__spinner" />
              <span>Loading transfer records...</span>
            </div>
          ) : transfers.length === 0 ? (
            <div className="payroll-empty">
              <div className="payroll-empty__icon">💸</div>
              <div className="payroll-empty__title">No Transfers Found</div>
              <div className="payroll-empty__desc">
                Generate payroll for the selected month to render the salary bank list.
              </div>
            </div>
          ) : (
            <div className="payroll-table-scroll">
              <table className="payroll-data-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Beneficiary Name (Bank)</th>
                    <th>Bank Name</th>
                    <th>Account Number</th>
                    <th>IFSC Code</th>
                    <th className="text-right">Net Salary</th>
                    <th>Narration</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t, idx) => {
                    const hasMissingInfo = !t.bank_account_no || !t.ifsc_code;
                    const isAccUnmasked = unmaskedRows[`${idx}-acc`];
                    const isIfscUnmasked = unmaskedRows[`${idx}-ifsc`];

                    const displayAcc = t.bank_account_no
                      ? (isAccUnmasked ? t.bank_account_no : (t.bank_account_no.length > 4 ? '••••••••' + t.bank_account_no.slice(-4) : '••••••••'))
                      : null;

                    const displayIfsc = t.ifsc_code
                      ? (isIfscUnmasked ? t.ifsc_code : (t.ifsc_code.length > 4 ? t.ifsc_code.slice(0, 4) + '••••' + t.ifsc_code.slice(-3) : '••••••••'))
                      : null;

                    return (
                      <tr key={idx} style={{ background: hasMissingInfo ? '#fef2f2' : 'inherit' }}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{t.employee_name}</div>
                          <div style={{ fontSize: '10px', color: '#94a3b8' }}>{t.employee_code}</div>
                        </td>
                        <td>{t.name_on_bank || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Same as Name</span>}</td>
                        <td>{t.bank_name || '—'}</td>
                        <td className="font-mono">
                          {t.bank_account_no ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{displayAcc}</span>
                              <button
                                onClick={() => setUnmaskedRows(prev => ({ ...prev, [`${idx}-acc`]: !prev[`${idx}-acc`] }))}
                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#64748b', display: 'inline-flex', alignItems: 'center' }}
                                title={isAccUnmasked ? "Mask Account Number" : "Unmask Account Number"}
                              >
                                {isAccUnmasked ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: '#ef4444', fontWeight: 600 }}>MISSING</span>
                          )}
                        </td>
                        <td className="font-mono">
                          {t.ifsc_code ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{displayIfsc}</span>
                              <button
                                onClick={() => setUnmaskedRows(prev => ({ ...prev, [`${idx}-ifsc`]: !prev[`${idx}-ifsc`] }))}
                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#64748b', display: 'inline-flex', alignItems: 'center' }}
                                title={isIfscUnmasked ? "Mask IFSC Code" : "Unmask IFSC Code"}
                              >
                                {isIfscUnmasked ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: '#ef4444', fontWeight: 600 }}>MISSING</span>
                          )}
                        </td>
                        <td className="text-right font-mono" style={{ fontWeight: 'bold' }}>
                          {formatCurrency(t.net_amount)}
                        </td>
                        <td>{t.narration}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BankTransferFile;
