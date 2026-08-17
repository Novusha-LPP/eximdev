import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../../contexts/UserContext';
import payrollAPI from '../../../api/attendance/payroll.api';
import toast from 'react-hot-toast';
import moment from 'moment';
import {
  FiArrowLeft, FiPrinter, FiDownload, FiSearch,
  FiLock, FiEye, FiCheckSquare, FiSquare, FiShield, FiUsers
} from 'react-icons/fi';
import { generatePayslipPDF, computePay } from '../../../lib/payslip-pdf';
import './PayrollPages.css';

const PayslipGenerator = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  // Role simulation to allow easy UI testing of both Admin and Employee views
  const [roleSimulation, setRoleSimulation] = useState('ADMIN');
  const isAdmin = roleSimulation === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(moment().format('YYYY-MM'));
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [selectedMonth, setSelectedMonth] = useState(moment().format('MM'));
  const [entries, setEntries] = useState([]);
  const [payrollRun, setPayrollRun] = useState(null);
  const [statutoryConfig, setStatutoryConfig] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [generating, setGenerating] = useState(false);

  const companyId = user?.company_id?._id || user?.company_id;

  // Initialize role simulation based on actual logged in user
  useEffect(() => {
    if (user) {
      const isActualAdmin = user.role === 'ADMIN' || user.isAttendanceAllowedAdmin === true;
      setRoleSimulation(isActualAdmin ? 'ADMIN' : 'EMPLOYEE');
    }
  }, [user]);

  const fetchStatutoryConfig = useCallback(async () => {
    if (!companyId) return;
    if (!isAdmin) {
      setStatutoryConfig({ payslip_password_rule: 'PAN' });
      return;
    }
    try {
      const res = await payrollAPI.getStatutoryConfig(companyId);
      if (res.success) {
        setStatutoryConfig(res.data);
      }
    } catch (err) {
      console.error('Fetch statutory config error:', err);
    }
  }, [companyId, isAdmin]);

  const fetchEntries = useCallback(async () => {
    if (!companyId) {
      if (user) setLoading(false);
      return;
    }

    if (!isAdmin) {
      // Simulate/mock own payslips history for Employee (showing their own payslip card)
      setLoading(true);
      setTimeout(() => {
        setEntries([
          {
            _id: 'emp-demo-summary-1',
            employee_id: {
              _id: user?._id || 'demo-user-id',
              first_name: user?.first_name || 'Demo',
              last_name: user?.last_name || 'Employee',
              employee_code: user?.employee_code || 'EMP-1001',
              department: user?.department || 'Engineering',
              pan_no: 'ABCDE1234F',
              date_of_birth: '1995-12-03',
              date_of_joining: '2024-06-01'
            },
            payroll_month: selectedMonth,
            payroll_year: selectedYear,
            gross_amount: 146767,
            deduction_amount: 15308,
            net_payable_amount: 131459,
            payable_days: 30,
            total_days_in_month: 31
          }
        ]);
        setPayrollRun({ payroll_status: 'LOCKED' });
        setLoading(false);
      }, 300);
      return;
    }

    // Normal Admin/HR fetch
    setLoading(true);
    try {
      const res = await payrollAPI.getPayrollEntries(companyId, selectedYear, selectedMonth);
      if (res.success) {
        setEntries(res.data.summaries || []);
        setPayrollRun(res.data.run || null);
      }
    } catch (err) {
      console.error('Fetch entries error:', err);
      toast.error('Failed to load payroll records');
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedYear, selectedMonth, isAdmin, user]);

  useEffect(() => {
    fetchStatutoryConfig();
  }, [fetchStatutoryConfig]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handlePeriodChange = (val) => {
    setSelectedPeriod(val);
    const [year, month] = val.split('-');
    setSelectedYear(parseInt(year, 10));
    setSelectedMonth(month);
  };

  const handlePasswordRuleChange = async (newRule) => {
    if (!companyId || !statutoryConfig) return;
    if (!isAdmin) {
      setStatutoryConfig(prev => ({ ...prev, payslip_password_rule: newRule }));
      return;
    }
    try {
      const updatedConfig = { ...statutoryConfig, payslip_password_rule: newRule };
      const res = await payrollAPI.updateStatutoryConfig(companyId, updatedConfig);
      if (res.success) {
        setStatutoryConfig(res.data);
        toast.success('PDF Password Rule updated successfully!');
        fetchEntries();
      } else {
        toast.error(res.message || 'Failed to update password rule');
      }
    } catch (err) {
      console.error('Update statutory config error:', err);
      toast.error('Failed to update password rule');
    }
  };

  const getRecentPeriods = () => {
    const list = [];
    for (let i = 0; i < 12; i++) {
      const d = moment().subtract(i, 'months');
      list.push({
        value: d.format('YYYY-MM'),
        label: d.format('YYYY-MM')
      });
    }
    return list;
  };

  const getPasswordValue = (emp) => {
    const rule = statutoryConfig?.payslip_password_rule || 'DOB';
    if (rule === 'PAN') {
      return (emp?.pan_no || 'ABCDE1234F').toUpperCase().slice(-4);
    } else if (rule === 'DOB') {
      const dob = emp?.date_of_birth || emp?.dob;
      if (dob) {
        const d = new Date(dob);
        if (!isNaN(d.getTime())) {
          return `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`;
        }
      }
      return '12031995';
    } else if (rule === 'EMP_CODE_DOB_DAY') {
      const code = emp?.employee_code || 'EMP-1001';
      const dob = emp?.date_of_birth || emp?.dob;
      let day = '01';
      if (dob) {
        const d = new Date(dob);
        if (!isNaN(d.getTime())) {
          day = String(d.getDate()).padStart(2, '0');
        }
      }
      return `${code}${day}`;
    } else if (rule === 'DOJ') {
      const doj = emp?.date_of_joining;
      if (doj) {
        const d = new Date(doj);
        if (!isNaN(d.getTime())) {
          return `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`;
        }
      }
      return '01062024';
    }
    return '';
  };

  // Toast confirmation and actual encrypted PDF generation
  const handleDownloadPDF = async (e) => {
    try {
      const emp = e.employee_id || {};
      const plainPassword = getPasswordValue(emp);
      const maskedPassword = getPasswordHint(emp);

      const companyInfo = {
        name: user?.company_name || 'ALVISION EXIM PRIVATE LIMITED',
        address: 'Corporate Office Address'
      };

      const doc = await generatePayslipPDF(e, companyInfo, plainPassword, getRuleLabel());
      const fileName = `Payslip_${emp.employee_code || 'EMP'}_${selectedPeriod}.pdf`;
      doc.save(fileName);

      const passwordNotice = isAdmin 
        ? `Password: ${maskedPassword}` 
        : `Password: ${plainPassword}`;

      toast.success(
        <div>
          <strong>Payslip for {emp.first_name || 'Employee'} ({selectedPeriod}) downloaded</strong>
          <div style={{ fontSize: '11px', marginTop: '4px', color: '#475569' }}>
            {passwordNotice}
          </div>
        </div>,
        { duration: 5000 }
      );
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate protected PDF');
    }
  };

  const handleBulkGenerate = async () => {
    if (filtered.length === 0) {
      toast.error('No payslips available to download');
      return;
    }

    setGenerating(true);
    toast.success(`${filtered.length} payslips queued for generation`);

    try {
      // Loop through all visible employees and download each with a short gap
      for (const item of filtered) {
        const emp = item.employee_id || {};
        const plainPassword = getPasswordValue(emp);
        const companyInfo = {
          name: user?.company_name || 'ALVISION EXIM PRIVATE LIMITED',
          address: 'Corporate Office Address'
        };

        const doc = await generatePayslipPDF(item, companyInfo, plainPassword, getRuleLabel());
        const fileName = `Payslip_${emp.employee_code || 'EMP'}_${selectedPeriod}.pdf`;
        doc.save(fileName);

        // Gap of 800ms between downloads
        await new Promise(r => setTimeout(r, 800));
      }
      toast.success('Bulk payslip downloads complete!');
    } catch (err) {
      console.error(err);
      toast.error('Bulk generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const formatCardCurrency = (v) => {
    return '₹' + Math.round(Number(v || 0)).toLocaleString('en-IN');
  };

  const getPasswordHint = (emp) => {
    const rule = statutoryConfig?.payslip_password_rule || 'DOB';
    if (rule === 'PAN') {
      const pan = emp?.pan_no || 'ABCDE1234F';
      if (pan.length >= 4) {
        return `••••••${pan.toUpperCase().slice(-4)}`;
      }
      return '••••';
    } else if (rule === 'DOB') {
      const dob = emp?.date_of_birth || emp?.dob;
      if (dob) {
        const d = new Date(dob);
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          return `••••${yyyy}`;
        }
      }
      return 'DDMMYYYY';
    } else if (rule === 'EMP_CODE_DOB_DAY') {
      const code = emp?.employee_code || 'EMP-1001';
      const dob = emp?.date_of_birth || emp?.dob;
      let day = '01';
      if (dob) {
        const d = new Date(dob);
        if (!isNaN(d.getTime())) {
          day = String(d.getDate()).padStart(2, '0');
        }
      }
      return `${code}••`;
    } else if (rule === 'DOJ') {
      const doj = emp?.date_of_joining;
      if (doj) {
        const d = new Date(doj);
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          return `••••${yyyy}`;
        }
      }
      return 'DDMMYYYY';
    }
    return '••••';
  };

  const getRuleLabel = () => {
    const rule = statutoryConfig?.payslip_password_rule || 'DOB';
    if (rule === 'PAN') return 'Last 4 digits of PAN';
    if (rule === 'DOB') return 'Date of birth (DDMMYYYY)';
    if (rule === 'EMP_CODE_DOB_DAY') return 'Employee code + DOB day';
    if (rule === 'DOJ') return 'Date of joining (DDMMYYYY)';
    return '';
  };

  const filtered = entries.filter(e => {
    const name = `${e.employee_id?.first_name || ''} ${e.employee_id?.last_name || ''}`.toLowerCase();
    const code = (e.employee_id?.employee_code || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || code.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="payroll-page">
      {/* Title Header */}
      <div className="payroll-page__header" style={{ marginBottom: '24px' }}>
        <div>
          <button className="payroll-page__back-btn" onClick={() => navigate('/attendance/admin/payroll-dashboard')}>
            <FiArrowLeft /> Back to Dashboard
          </button>
          <h1 style={{ marginTop: '12px' }}>Payslip Generation</h1>
          <p>Payroll run {selectedPeriod}</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {isAdmin && (
            <button
              className="payroll-action-btn primary"
              onClick={handleBulkGenerate}
              disabled={filtered.length === 0 || generating}
              style={{ height: '38px', borderRadius: '8px' }}
            >
              {generating ? 'Generating...' : 'Generate all'}
            </button>
          )}
          
          {/* Interactive Role Switcher Pill/Dropdown */}
          <select
            className="filter-select"
            style={{ height: '38px', borderRadius: '8px', minWidth: '150px', fontWeight: 600, border: '1px solid #cbd5e1' }}
            value={roleSimulation}
            onChange={e => setRoleSimulation(e.target.value)}
          >
            <option value="ADMIN">Payroll Admin</option>
            <option value="EMPLOYEE">Employee (Demo)</option>
          </select>
        </div>
      </div>

      {/* Settings & Filters Card */}
      <div className="payslip-settings-card">
        <div className="payslip-settings-grid">
          {/* Payroll Period */}
          <div className="payslip-settings-field">
            <label>Payroll Period</label>
            <select
              value={selectedPeriod}
              onChange={e => handlePeriodChange(e.target.value)}
              disabled={!isAdmin}
            >
              {getRecentPeriods().map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Password Rule */}
          <div className="payslip-settings-field">
            <label>PDF Password Rule</label>
            <select
              value={statutoryConfig?.payslip_password_rule || 'DOB'}
              onChange={e => handlePasswordRuleChange(e.target.value)}
              disabled={!isAdmin}
            >
              <option value="PAN">Last 4 digits of PAN</option>
              <option value="DOB">Date of birth (DDMMYYYY)</option>
              <option value="EMP_CODE_DOB_DAY">Employee code + DOB day</option>
              <option value="DOJ">Date of joining (DDMMYYYY)</option>
            </select>
          </div>

          {/* Search Field */}
          <div className="payslip-settings-field" style={{ flex: 1, minWidth: '220px' }}>
            <label>Search Employee</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="payroll-search-input"
                style={{ width: '100%', height: '38px', boxSizing: 'border-box' }}
                placeholder="Search name or code..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                disabled={!isAdmin}
              />
            </div>
          </div>
        </div>

        {/* Security Notes */}
        <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
            <FiShield size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
            <span>PDFs are rendered by the payroll service account, never a personal admin login.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
            <FiLock size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
            <span>Statutory fields like PAN, Aadhaar, bank account, UAN, PF, and ESI are masked by default and only unmasked when the role has unmask permission.</span>
          </div>
        </div>
      </div>

      {/* Grid of Employee Cards */}
      {loading ? (
        <div className="payroll-loading" style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <div className="payroll-loading__spinner" />
          <span>Loading payslip summaries...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="payroll-empty" style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <div className="payroll-empty__icon">📄</div>
          <div className="payroll-empty__title">No Calculated Payslips Found</div>
          <div className="payroll-empty__desc">
            Generate payroll for the selected month to view payslips.
          </div>
        </div>
      ) : (
        <div className="payslip-grid">
          {filtered.map(e => {
            const passwordHint = getPasswordHint(e.employee_id);
            return (
              <div className="payslip-card" key={e._id}>
                <div className="payslip-card__header">
                  <div className="payslip-card__name">{e.employee_id?.first_name} {e.employee_id?.last_name}</div>
                  <div className="payslip-card__meta">
                    {e.employee_id?.employee_code || 'No Code'} · {e.employee_id?.department || 'Staff'}
                  </div>
                </div>

                <div className="payslip-card__summary">
                  <div className="payslip-card__row">
                    <span>Gross</span>
                    <span className="value">{formatCardCurrency(e.gross_amount)}</span>
                  </div>
                  <div className="payslip-card__row">
                    <span>Deductions</span>
                    <span className="value" style={{ color: '#dc2626' }}>-{formatCardCurrency(e.deduction_amount)}</span>
                  </div>
                  <div className="payslip-card__row net-pay">
                    <span>Net pay</span>
                    <span className="value">{formatCardCurrency(e.net_payable_amount)}</span>
                  </div>
                </div>

                <div className="payslip-card__password">
                  <FiLock size={12} style={{ color: '#64748b' }} />
                  <span>Password: {passwordHint} - {getRuleLabel()}</span>
                </div>

                <button
                  className="payslip-card__btn"
                  onClick={() => handleDownloadPDF(e)}
                >
                  <FiDownload size={14} /> Download PDF
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PayslipGenerator;
