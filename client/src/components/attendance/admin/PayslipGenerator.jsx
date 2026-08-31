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
import { generatePayslipPDF, computePay, computeYTDStatsFromHistory } from '../../../lib/payslip-pdf';
import './PayrollPages.css';

const makeCircularImage = (base64OrUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        const radius = size * 0.1; // 10% corner radius
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(size - radius, 0);
        ctx.quadraticCurveTo(size, 0, size, radius);
        ctx.lineTo(size, size - radius);
        ctx.quadraticCurveTo(size, size, size - radius, size);
        ctx.lineTo(radius, size);
        ctx.quadraticCurveTo(0, size, 0, size - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();
        ctx.clip();
        
        ctx.drawImage(
          img,
          (img.width - size) / 2,
          (img.height - size) / 2,
          size,
          size,
          0,
          0,
          size,
          size
        );
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.error('Failed to make rounded-square image:', err);
        resolve(base64OrUrl);
      }
    };
    img.onerror = () => {
      resolve(base64OrUrl);
    };
    img.src = base64OrUrl;
  });
};

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
    const compId = companyId || user?.company_id?._id || user?.company_id;
    if (!compId) return;
    try {
      const res = await payrollAPI.getStatutoryConfig(compId);
      if (res.success) {
        setStatutoryConfig(res.data);
      }
    } catch (err) {
      console.error('Fetch statutory config error:', err);
    }
  }, [companyId, user]);

  const fetchEntries = useCallback(async () => {
    const compId = companyId || user?.company_id?._id || user?.company_id;
    if (!compId) {
      if (user) setLoading(false);
      return;
    }

    if (!isAdmin) {
      setLoading(true);
      try {
        const res = await payrollAPI.getEmployeePayrollSummary(user._id, selectedYear, selectedMonth);
        if (res.success && res.data) {
          setEntries([res.data]);
          setPayrollRun({ payroll_status: res.data.payroll_run_id?.payroll_status || 'LOCKED' });
        } else {
          setEntries([]);
          setPayrollRun(null);
        }
      } catch (err) {
        console.error('Fetch employee payroll summary error:', err);
        setEntries([]);
        setPayrollRun(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Normal Admin/HR fetch
    setLoading(true);
    try {
      const res = await payrollAPI.getPayrollEntries(compId, selectedYear, selectedMonth);
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
      const emp = e.employee_id ? { ...e.employee_id } : {};
      const plainPassword = getPasswordValue(emp);
      const maskedPassword = getPasswordHint(emp);

      const companyInfo = {
        name: user?.company || user?.company_name || 'ALVISION EXIM PRIVATE LIMITED',
        address: 'Corporate Office Address'
      };

      // Fetch history for YTD stats
      let ytdStats = null;
      try {
        const historyRes = await payrollAPI.getEmployeePayrollHistory(emp._id);
        if (historyRes.success && historyRes.data) {
          ytdStats = computeYTDStatsFromHistory(historyRes.data, e);
        }
      } catch (err) {
        console.error('Failed to fetch YTD stats for admin download:', err);
      }

      // Fetch photo base64 via proxy to prevent CORS issues
      const photoUrl = emp.employee_photo || emp.profile_photo_proof?.url;
      if (photoUrl) {
        try {
          const proxyRes = await payrollAPI.proxyPhoto(photoUrl);
          if (proxyRes.success && proxyRes.data) {
            emp.photoBase64 = await makeCircularImage(proxyRes.data);
          }
        } catch (err) {
          console.error('Failed to proxy photo:', err);
        }
      }

      const originalEmp = e.employee_id;
      e.employee_id = emp;

      const doc = await generatePayslipPDF(e, companyInfo, plainPassword, getRuleLabel(), ytdStats);

      e.employee_id = originalEmp;

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
        const emp = item.employee_id ? { ...item.employee_id } : {};
        const plainPassword = getPasswordValue(emp);
        const companyInfo = {
          name: user?.company || user?.company_name || 'ALVISION EXIM PRIVATE LIMITED',
          address: 'Corporate Office Address'
        };

        // Fetch history for YTD stats
        let ytdStats = null;
        try {
          const historyRes = await payrollAPI.getEmployeePayrollHistory(emp._id);
          if (historyRes.success && historyRes.data) {
            ytdStats = computeYTDStatsFromHistory(historyRes.data, item);
          }
        } catch (err) {
          console.error('Failed to fetch YTD stats for bulk download:', err);
        }

        // Fetch photo base64 via proxy to prevent CORS issues
        const photoUrl = emp.employee_photo || emp.profile_photo_proof?.url;
        if (photoUrl) {
          try {
            const proxyRes = await payrollAPI.proxyPhoto(photoUrl);
            if (proxyRes.success && proxyRes.data) {
              emp.photoBase64 = await makeCircularImage(proxyRes.data);
            }
          } catch (err) {
            console.error('Failed to proxy photo:', err);
          }
        }

        const originalEmp = item.employee_id;
        item.employee_id = emp;

        const doc = await generatePayslipPDF(item, companyInfo, plainPassword, getRuleLabel(), ytdStats);

        item.employee_id = originalEmp;

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

  const renderEmployeePortal = () => {
    const e = entries[0];
    const passwordHint = e ? getPasswordHint(e.employee_id) : '';
    
    // Compute Earnings and Deductions splits
    const otAmt = e?.overtime_amount || 0;
    const adjAmt = e?.adjustment_amount || 0;
    const basicEarn = e?.gross_amount || 0;
    const earnComponents = [
      { label: 'Basic & Allowances', value: basicEarn },
      ...(otAmt > 0 ? [{ label: 'Overtime Earnings', value: otAmt }] : []),
      ...(adjAmt > 0 ? [{ label: 'Performance / Other Adjustments', value: adjAmt }] : [])
    ];
    const totalEarnings = earnComponents.reduce((sum, item) => sum + item.value, 0);

    const pfDed = e?.pf_employee || 0;
    const esiDed = e?.esi_employee || 0;
    const ptDed = e?.professional_tax || 0;
    const otherDed = e?.other_deductions || 0;
    const dedComponents = [
      ...(pfDed > 0 ? [{ label: 'Provident Fund (PF)', value: pfDed }] : []),
      ...(esiDed > 0 ? [{ label: 'Employee State Insurance (ESI)', value: esiDed }] : []),
      ...(ptDed > 0 ? [{ label: 'Professional Tax (PT)', value: ptDed }] : []),
      ...(otherDed > 0 ? [{ label: 'Other Deductions', value: otherDed }] : []),
      ...(adjAmt < 0 ? [{ label: 'Other Adjustments', value: Math.abs(adjAmt) }] : [])
    ];
    const totalDeductions = dedComponents.reduce((sum, item) => sum + item.value, 0);

    return (
      <div className="payroll-page" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>My Payslips</h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>View and download your monthly salary slips</p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Select Month</label>
              <select
                className="filter-select"
                style={{ height: '40px', borderRadius: '8px', minWidth: '160px', fontWeight: 600, border: '1px solid #cbd5e1', padding: '0 12px', outline: 'none' }}
                value={selectedPeriod}
                onChange={e => handlePeriodChange(e.target.value)}
              >
                {getRecentPeriods().map(p => (
                  <option key={p.value} value={p.value}>{moment(p.value).format('MMMM YYYY')}</option>
                ))}
              </select>
            </div>

            {/* Simulation role switcher for actual admin debugging */}
            {(user?.role === 'ADMIN' || user?.isAttendanceAllowedAdmin === true) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Simulate Role</label>
                <select
                  className="filter-select"
                  style={{ height: '40px', borderRadius: '8px', minWidth: '130px', fontWeight: 600, border: '1px solid #cbd5e1', padding: '0 12px', outline: 'none' }}
                  value={roleSimulation}
                  onChange={e => setRoleSimulation(e.target.value)}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="EMPLOYEE">Employee</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="payroll-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div className="payroll-loading__spinner" style={{ margin: '0 auto 16px auto' }} />
            <span style={{ color: '#475569', fontWeight: 500 }}>Fetching your salary record...</span>
          </div>
        ) : !e ? (
          <div className="payroll-card" style={{ padding: '60px 20px', textAlign: 'center', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>No Salary Slip Found</h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0, maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
              Your salary slip for <strong>{moment(selectedPeriod).format('MMMM YYYY')}</strong> has not been generated or finalized by HR yet. Please check back later.
            </p>
          </div>
        ) : (
          <div className="payroll-card" style={{ padding: '32px', background: '#fff', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
            {/* Logo and Company Details */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px', marginBottom: '24px', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#4f46e5', letterSpacing: '-0.5px' }}>
                  {user?.company || user?.company_name || 'ALVISION EXIM PRIVATE LIMITED'}
                </h2>
                <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Official Pay Slip</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '6px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700 }}>
                  {moment(selectedPeriod).format('MMMM YYYY')}
                </span>
              </div>
            </div>

            {/* Profile Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '28px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Employee Name</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>{e.employee_id?.first_name} {e.employee_id?.last_name}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Employee Code</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>{e.employee_id?.employee_code || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Department & Desg.</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>
                  {e.employee_id?.department || 'Staff'} • {e.employee_id?.designation || 'Executive'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Payable Days</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>
                  {e.payable_days} / {e.total_days_in_month} Days
                </div>
              </div>
            </div>

            {/* Earnings and Deductions Side-by-Side */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', marginBottom: '32px' }}>
              {/* Earnings Column */}
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0', paddingBottom: '8px', borderBottom: '2px solid #ecfdf5', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Earnings</span>
                  <span style={{ color: '#10b981' }}>Amount</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {earnComponents.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#64748b' }}>{item.label}</span>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{formatCardCurrency(item.value)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, borderTop: '1px dashed #e2e8f0', paddingTop: '12px', marginTop: '8px' }}>
                    <span style={{ color: '#0f172a' }}>Gross Earnings</span>
                    <span style={{ color: '#10b981' }}>{formatCardCurrency(totalEarnings)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions Column */}
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0', paddingBottom: '8px', borderBottom: '2px solid #fef2f2', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Deductions</span>
                  <span style={{ color: '#ef4444' }}>Amount</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {dedComponents.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>No deductions applicable</div>
                  ) : (
                    dedComponents.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: '#64748b' }}>{item.label}</span>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{formatCardCurrency(item.value)}</span>
                      </div>
                    ))
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, borderTop: '1px dashed #e2e8f0', paddingTop: '12px', marginTop: '8px' }}>
                    <span style={{ color: '#0f172a' }}>Total Deductions</span>
                    <span style={{ color: '#ef4444' }}>{formatCardCurrency(totalDeductions)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Net Payout Section */}
            <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', borderRadius: '16px', padding: '24px 32px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
              <div>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: 600, opacity: 0.8, letterSpacing: '0.5px' }}>Net Transferable Salary</span>
                <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '4px' }}>
                  {formatCardCurrency(e.net_payable_amount)}
                </div>
              </div>
              <button
                onClick={() => handleDownloadPDF(e)}
                style={{
                  background: '#fff',
                  color: '#4f46e5',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s'
                }}
              >
                <FiDownload size={16} /> Download Payslip (PDF)
              </button>
            </div>

            {/* Password Hint */}
            <div style={{ display: 'flex', gap: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px 18px', color: '#166534', fontSize: '13px', lineHeight: '1.4' }}>
              <FiLock size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#15803d' }} />
              <div>
                <strong style={{ fontWeight: 700 }}>Security Note:</strong> The downloaded PDF is password-protected.
                <div style={{ marginTop: '4px' }}>
                  Password Hint: <span style={{ fontFamily: 'monospace', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>{passwordHint}</span> &mdash; {getRuleLabel()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isAdmin) {
    return renderEmployeePortal();
  }

  return (
    <div className="payroll-page">
      {/* Title Header */}
      <div className="payroll-page__header" style={{ marginBottom: '24px' }}>
        <div>
          {isAdmin && (
            <button className="payroll-page__back-btn" onClick={() => navigate('/attendance/admin/payroll-dashboard')}>
              <FiArrowLeft /> Back to Dashboard
            </button>
          )}
          <h1 style={{ marginTop: '12px' }}>{isAdmin ? 'Payslip Generation' : 'My Payslips'}</h1>
          <p>{isAdmin ? `Payroll run ${selectedPeriod}` : `View and download your payslips`}</p>
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
          
          {/* Interactive Role Switcher Pill/Dropdown (Only shown to actual admins/allowed admins) */}
          {(user?.role === 'ADMIN' || user?.isAttendanceAllowedAdmin === true) && (
            <select
              className="filter-select"
              style={{ height: '38px', borderRadius: '8px', minWidth: '150px', fontWeight: 600, border: '1px solid #cbd5e1' }}
              value={roleSimulation}
              onChange={e => setRoleSimulation(e.target.value)}
            >
              <option value="ADMIN">Payroll Admin</option>
              <option value="EMPLOYEE">Employee (Demo)</option>
            </select>
          )}
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
