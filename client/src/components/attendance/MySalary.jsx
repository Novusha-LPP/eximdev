import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../contexts/UserContext';
import payrollAPI from '../../api/attendance/payroll.api';
import toast from 'react-hot-toast';
import moment from 'moment';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  FiDownload, FiLock, FiCalendar, FiShield, FiCreditCard, FiTrendingUp, FiActivity, FiArrowLeft
} from 'react-icons/fi';
import { generatePayslipPDF, computeYTDStatsFromHistory } from '../../lib/payslip-pdf';
import './MySalary.css';

const DEFAULT_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40"><circle cx="12" cy="8" r="4" fill="%23cbd5e1"/><path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" fill="none" stroke="%23cbd5e1" stroke-width="2" stroke-linecap="round"/></svg>`;

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

const MySalary = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('slip'); // 'slip' or 'report'
  const [loading, setLoading] = useState(true);
  
  const [history, setHistory] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [activeSummary, setActiveSummary] = useState(null);
  const [statutoryConfig, setStatutoryConfig] = useState(null);

  const companyId = user?.company_id?._id || user?.company_id;

  // Fetch statutory configuration
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

  // Fetch payroll history
  const fetchHistory = useCallback(async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      const res = await payrollAPI.getEmployeePayrollHistory(user._id);
      if (res.success && res.data) {
        setHistory(res.data);
        if (res.data.length > 0) {
          // Default to latest summary period
          const latest = res.data[0];
          const periodStr = `${latest.payroll_year}-${String(latest.payroll_month).padStart(2, '0')}`;
          setSelectedPeriod(periodStr);
          setActiveSummary(latest);
        }
      }
    } catch (err) {
      console.error('Fetch history error:', err);
      toast.error('Failed to load salary history');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
    fetchStatutoryConfig();
  }, [fetchHistory, fetchStatutoryConfig]);

  // Handle month selection change
  const handlePeriodChange = (val) => {
    setSelectedPeriod(val);
    const [year, month] = val.split('-');
    const match = history.find(
      s => s.payroll_year === parseInt(year, 10) && String(s.payroll_month).padStart(2, '0') === month
    );
    setActiveSummary(match || null);

  };

  // Helper: Get password value for decryption
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

  // Helper: Get password label
  const getRuleLabel = () => {
    const rule = statutoryConfig?.payslip_password_rule || 'DOB';
    if (rule === 'PAN') return 'last 4 of your PAN';
    if (rule === 'DOB') return 'date of birth in DDMMYYYY';
    if (rule === 'EMP_CODE_DOB_DAY') return 'employee code + DOB day';
    if (rule === 'DOJ') return 'date of joining in DDMMYYYY';
    return '';
  };

  // Helper: Get password hint (e.g. 234K)
  const getPasswordHint = (emp) => {
    const rule = statutoryConfig?.payslip_password_rule || 'DOB';
    if (rule === 'PAN') {
      const pan = emp?.pan_no || 'ABCDE1234F';
      return '••••' + pan.toUpperCase().slice(-4);
    } else if (rule === 'DOB') {
      const dob = emp?.date_of_birth || emp?.dob;
      if (dob) {
        const d = new Date(dob);
        if (!isNaN(d.getTime())) {
          return `DDMM${d.getFullYear()}`;
        }
      }
      return 'DDMMYYYY';
    } else if (rule === 'EMP_CODE_DOB_DAY') {
      const code = emp?.employee_code || 'EMP-1042';
      return `${code}DD`;
    } else if (rule === 'DOJ') {
      const doj = emp?.date_of_joining;
      if (doj) {
        const d = new Date(doj);
        if (!isNaN(d.getTime())) {
          return `DDMM${d.getFullYear()}`;
        }
      }
      return 'DDMMYYYY';
    }
    return '••••';
  };

  // Download PDF payslip
  const handleDownloadPDF = async (summaryRecord) => {
    if (!summaryRecord) return;
    try {
      const emp = (typeof summaryRecord.employee_id === 'object' && summaryRecord.employee_id !== null) ? { ...summaryRecord.employee_id } : { ...user };
      const plainPassword = getPasswordValue(emp);

      const companyInfo = {
        name: user?.company || user?.company_name || 'ALVISION EXIM PRIVATE LIMITED',
        address: 'Corporate Office Address'
      };

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

      // Calculate YTD stats
      const ytdStats = computeYTDStatsFromHistory(history, summaryRecord);

      // Mutate summaryRecord.employee_id temporarily for generatePayslipPDF
      const originalEmp = summaryRecord.employee_id;
      summaryRecord.employee_id = emp;

      const doc = await generatePayslipPDF(summaryRecord, companyInfo, plainPassword, getRuleLabel(), ytdStats);

      // Restore original
      summaryRecord.employee_id = originalEmp;

      const fileName = `Payslip_${emp.employee_code || 'EMP'}_${summaryRecord.payroll_month}_${summaryRecord.payroll_year}.pdf`;
      doc.save(fileName);

      toast.success(
        <div>
          <strong>Payslip downloaded successfully</strong>
          <div style={{ fontSize: '11px', marginTop: '4px', color: '#475569' }}>
            Password Hint: {getPasswordHint(emp)}
          </div>
        </div>,
        { duration: 5000 }
      );
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate protected PDF');
    }
  };

  // Indian Financial Year Range aggregator (April - March)
  const getFinancialYearRange = (year, monthStr) => {
    const month = parseInt(monthStr, 10);
    return month >= 4 ? year : year - 1;
  };

  // YTD computations based on active summary financial year
  const getYTDStats = () => {
    if (history.length === 0 || !selectedPeriod) return { net: 0, tax: 0 };
    const [year, month] = selectedPeriod.split('-');
    const activeFY = getFinancialYearRange(parseInt(year, 10), month);
    
    let ytdNet = 0;
    let ytdTax = 0;
    
    history.forEach(s => {
      const sFY = getFinancialYearRange(s.payroll_year, s.payroll_month);
      if (sFY === activeFY) {
        ytdNet += s.net_payable_amount || 0;
        ytdTax += s.tds || 0;
      }
    });
    
    return { net: ytdNet, tax: ytdTax };
  };

  const ytd = getYTDStats();

  const formatCurrency = (v) => {
    return '₹' + Math.round(v || 0).toLocaleString('en-IN');
  };

  // Prepare chart data
  const chartData = [...history]
    .slice(0, 6)
    .reverse()
    .map(s => ({
      name: moment(`${s.payroll_year}-${s.payroll_month}-01`).format('MMM'),
      'Net pay': s.net_payable_amount || 0,
      'Deductions': s.deduction_amount || 0
    }));

  const earnComponents = activeSummary ? [
    { label: 'Basic', value: Math.round(activeSummary.basic_amount || activeSummary.gross_amount * 0.5) },
    { label: 'HRA', value: Math.round((activeSummary.gross_amount || 0) * 0.25) },
    { label: 'Conveyance', value: Math.round((activeSummary.gross_amount || 0) * 0.05) },
    { label: 'Special Allowance', value: Math.round((activeSummary.gross_amount || 0) - (activeSummary.basic_amount || activeSummary.gross_amount * 0.5) - ((activeSummary.gross_amount || 0) * 0.3)) }
  ] : [];

  const otAmt = activeSummary?.overtime_amount || 0;
  const adjAmt = activeSummary?.adjustment_amount || 0;

  const totalEarnings = activeSummary ? activeSummary.gross_amount + (otAmt > 0 ? otAmt : 0) + (adjAmt > 0 ? adjAmt : 0) : 0;

  const isRabs = user?.company && /RABS/i.test(user.company);

  if (!isRabs) {
    return (
      <div className="mysalary-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h3 style={{ color: '#ef4444', fontSize: '20px', fontWeight: 700 }}>Access Denied</h3>
        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '8px' }}>
          The payroll and salary self-service module is restricted to RABS employees only.
        </p>
      </div>
    );
  }

  return (
    <div className="mysalary-container">
      {/* Header */}
      <div className="mysalary-header">
        <div>
          <h1 className="mysalary-title">My Salary</h1>
          <div className="mysalary-subtitle">
            {user?.first_name} {user?.last_name} · {user?.employee_code || 'EMP-1042'} · {user?.designation || 'Senior Engineer'}
          </div>
        </div>

        <div className="mysalary-actions">
          <button
            className="mysalary-btn-primary"
            onClick={() => handleDownloadPDF(activeSummary)}
            disabled={!activeSummary}
          >
            <FiDownload size={15} /> Download payslip
          </button>


        </div>
      </div>



      {/* Stats Cards Grid */}
      <div className="mysalary-stats-grid">
        <div className="mysalary-stat-card">
          <div className="mysalary-stat-icon-wrapper" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>
            <FiCreditCard />
          </div>
          <div>
            <div className="mysalary-stat-label">Net Pay This Month</div>
            <div className="mysalary-stat-value">
              {activeSummary ? formatCurrency(activeSummary.net_payable_amount) : '--'}
            </div>
          </div>
        </div>

        <div className="mysalary-stat-card">
          <div className="mysalary-stat-icon-wrapper" style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}>
            <FiTrendingUp />
          </div>
          <div>
            <div className="mysalary-stat-label">YTD Net Earnings</div>
            <div className="mysalary-stat-value">{formatCurrency(ytd.net)}</div>
          </div>
        </div>

        <div className="mysalary-stat-card">
          <div className="mysalary-stat-icon-wrapper" style={{ backgroundColor: '#faf5ff', color: '#7e22ce' }}>
            <FiActivity />
          </div>
          <div>
            <div className="mysalary-stat-label">YTD Tax Deducted</div>
            <div className="mysalary-stat-value">{formatCurrency(ytd.tax)}</div>
          </div>
        </div>
      </div>

      {/* Tabs and Filters Row */}
      <div className="mysalary-nav-row">
        <div className="mysalary-tabs">
          <button
            className={`mysalary-tab-btn ${activeTab === 'slip' ? 'active' : ''}`}
            onClick={() => setActiveTab('slip')}
          >
            Salary slip
          </button>
          <button
            className={`mysalary-tab-btn ${activeTab === 'report' ? 'active' : ''}`}
            onClick={() => setActiveTab('report')}
          >
            Salary report
          </button>
        </div>

        <div className="mysalary-period-selector">
          <label>Month</label>
          <select
            className="mysalary-select"
            value={selectedPeriod}
            onChange={e => handlePeriodChange(e.target.value)}
          >
            {history.map(s => {
              const pStr = `${s.payroll_year}-${String(s.payroll_month).padStart(2, '0')}`;
              return (
                <option key={pStr} value={pStr}>
                  {moment(`${s.payroll_year}-${s.payroll_month}-01`).format('MMM YYYY')}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Content Rendering */}
      {loading ? (
        <div className="mysalary-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div className="payroll-loading__spinner" style={{ margin: '0 auto 16px auto' }} />
          <span>Loading salary records...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="mysalary-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>No Payroll Records Found</h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            There are no salary records generated for your profile. Please contact the payroll admin.
          </p>
        </div>
      ) : activeTab === 'slip' ? (
        <div className="mysalary-split-layout">
          {/* Active Month Payslip card */}
          {activeSummary ? (
            <div className="mysalary-card">
              <div className="mysalary-card-title-row">
                <div>
                  <h2 className="mysalary-card-title">
                    Salary slip · {moment(`${activeSummary.payroll_year}-${activeSummary.payroll_month}-01`).format('MMM YYYY')}
                  </h2>
                  <div className="mysalary-card-subtitle">
                    Payable {activeSummary.payable_days} days · Present {activeSummary.present_days} · Paid leave {activeSummary.leave_days} · LOP {activeSummary.absent_days}
                  </div>
                </div>
                <span className={`mysalary-badge ${activeSummary.payroll_run_id?.payroll_status === 'LOCKED' ? 'locked' : 'draft'}`}>
                  {activeSummary.payroll_run_id?.payroll_status === 'LOCKED' ? 'Locked' : 'Draft'}
                </span>
              </div>

              {/* Payslip breakdown */}
              <div className="mysalary-slip-grid">
                <div>
                  <div className="mysalary-slip-col-title">
                    <span>Earnings</span>
                    <span>Amount</span>
                  </div>
                  <div className="mysalary-slip-row">
                    <span>Basic</span>
                    <span>{formatCurrency(activeSummary.basic_amount || activeSummary.gross_amount * 0.5)}</span>
                  </div>
                  <div className="mysalary-slip-row">
                    <span>HRA</span>
                    <span>{formatCurrency((activeSummary.gross_amount || 0) * 0.25)}</span>
                  </div>
                  <div className="mysalary-slip-row">
                    <span>Conveyance</span>
                    <span>{formatCurrency((activeSummary.gross_amount || 0) * 0.05)}</span>
                  </div>
                  <div className="mysalary-slip-row">
                    <span>Special Allowance</span>
                    <span>{formatCurrency((activeSummary.gross_amount || 0) - (activeSummary.basic_amount || activeSummary.gross_amount * 0.5) - ((activeSummary.gross_amount || 0) * 0.3))}</span>
                  </div>
                  {otAmt > 0 && (
                    <div className="mysalary-slip-row">
                      <span>Overtime Payout</span>
                      <span>{formatCurrency(otAmt)}</span>
                    </div>
                  )}
                  {adjAmt > 0 && (
                    <div className="mysalary-slip-row">
                      <span>Adjustments</span>
                      <span>{formatCurrency(adjAmt)}</span>
                    </div>
                  )}
                  <div className="mysalary-slip-row bold">
                    <span>Gross</span>
                    <span>{formatCurrency(totalEarnings)}</span>
                  </div>
                </div>

                <div>
                  <div className="mysalary-slip-col-title">
                    <span>Deductions</span>
                    <span>Amount</span>
                  </div>
                  <div className="mysalary-slip-row">
                    <span>PF (Employee)</span>
                    <span>{formatCurrency(activeSummary.pf_employee)}</span>
                  </div>
                  <div className="mysalary-slip-row">
                    <span>ESI (Employee)</span>
                    <span>{formatCurrency(activeSummary.esi_employee)}</span>
                  </div>
                  <div className="mysalary-slip-row">
                    <span>Professional Tax</span>
                    <span>{formatCurrency(activeSummary.professional_tax)}</span>
                  </div>
                  <div className="mysalary-slip-row">
                    <span>TDS</span>
                    <span>{formatCurrency(activeSummary.tds)}</span>
                  </div>
                  {activeSummary.other_deductions > 0 && (
                    <div className="mysalary-slip-row">
                      <span>Other Deductions</span>
                      <span>{formatCurrency(activeSummary.other_deductions)}</span>
                    </div>
                  )}
                  {adjAmt < 0 && (
                    <div className="mysalary-slip-row">
                      <span>Adjustments (Deduct)</span>
                      <span>{formatCurrency(Math.abs(adjAmt))}</span>
                    </div>
                  )}
                  <div className="mysalary-slip-row bold">
                    <span>Total deductions</span>
                    <span>{formatCurrency(activeSummary.deduction_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Net pay box */}
              <div className="mysalary-netbox">
                <span className="mysalary-netbox-label">Net pay</span>
                <span className="mysalary-netbox-value">
                  {formatCurrency(activeSummary.net_payable_amount)}
                </span>
              </div>

              {/* Security Hint */}
              <div className="mysalary-security-footer">
                <FiLock size={14} style={{ flexShrink: 0, marginTop: '2px', color: '#64748b' }} />
                <span>
                  PDF opens with password: {getPasswordHint(activeSummary.employee_id || user)} [{getRuleLabel()}]
                </span>
              </div>
            </div>
          ) : (
            <div className="mysalary-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Select a period to view details.
            </div>
          )}

          {/* Payslip History Right sidebar */}
          <div className="mysalary-card">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700 }}>Payslip history</h3>
            <div className="mysalary-history-list">
              {history.map(s => (
                <div
                  className={`mysalary-history-item ${activeSummary?._id === s._id ? 'active' : ''}`}
                  key={s._id}
                  onClick={() => handlePeriodChange(`${s.payroll_year}-${String(s.payroll_month).padStart(2, '0')}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <div className="mysalary-history-date">
                      {moment(`${s.payroll_year}-${s.payroll_month}-01`).format('MMM YYYY')}
                    </div>
                    <div className="mysalary-history-net">
                      {formatCurrency(s.net_payable_amount)} net
                    </div>
                  </div>
                  <button
                    className="mysalary-btn-icon-outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadPDF(s);
                    }}
                    title="Download Payslip PDF"
                  >
                    <FiDownload size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Salary Report tab content */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Chart card */}
          <div className="mysalary-card">
            <h3 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: 700 }}>Net pay vs deductions</h3>
            <div className="mysalary-chart-card">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `${v / 1000}k`}
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Bar dataKey="Net pay" fill="#1e2540" radius={[4, 4, 0, 0]} barSize={26} />
                  <Bar dataKey="Deductions" fill="#1a7c5c" radius={[4, 4, 0, 0]} barSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table card */}
          <div className="mysalary-card">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700 }}>Salary history details</h3>
            <div className="mysalary-table-wrapper">
              <table className="mysalary-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Gross</th>
                    <th>PF</th>
                    <th>TDS</th>
                    <th>Deductions</th>
                    <th>Net</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(s => {
                    const statusVal = s.payroll_run_id?.payroll_status === 'LOCKED' ? 'Paid' : 'Draft';
                    return (
                      <tr key={s._id}>
                        <td style={{ fontWeight: 700 }}>
                          {moment(`${s.payroll_year}-${s.payroll_month}-01`).format('MMM YYYY')}
                        </td>
                        <td>{formatCurrency(s.gross_amount)}</td>
                        <td>{formatCurrency(s.pf_employee)}</td>
                        <td>{formatCurrency(s.tds)}</td>
                        <td style={{ color: '#ef4444' }}>-{formatCurrency(s.deduction_amount)}</td>
                        <td style={{ fontWeight: 700, color: '#0f766e' }}>{formatCurrency(s.net_payable_amount)}</td>
                        <td>
                          <span className={`mysalary-badge ${statusVal.toLowerCase()}`}>
                            {statusVal}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MySalary;
