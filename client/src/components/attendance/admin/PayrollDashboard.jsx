import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../../contexts/UserContext';
import payrollAPI from '../../../api/attendance/payroll.api';
import toast from 'react-hot-toast';
import moment from 'moment';
import {
  FiDollarSign, FiUsers, FiTrendingUp, FiShield,
  FiFileText, FiDownload, FiRefreshCw, FiLock, FiUnlock,
  FiBarChart2, FiCreditCard, FiGrid, FiClipboard, FiPrinter,
  FiArrowRight, FiSearch, FiCalendar, FiClock, FiSettings,
  FiActivity, FiArrowUp, FiArrowDown, FiInfo, FiX, FiTrendingDown
} from 'react-icons/fi';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';
import './PayrollDashboard.css';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6', '#ec4899', '#14b8a6'];

const PayrollDashboard = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [selectedMonth, setSelectedMonth] = useState(moment().format('MM'));
  const [kpiData, setKpiData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [locking, setLocking] = useState(false);

  // Tabs & Directory search/sort/filter state
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'analytics', 'directory'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(''); // '', 'operator', 'management'
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedEmployee, setSelectedEmployee] = useState(null); // for Detailed Modal view

  const companyId = user?.company_id?._id || user?.company_id;

  const fetchDashboard = useCallback(async () => {
    if (!companyId) {
      if (user) setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await payrollAPI.getDashboardKPIs(companyId, selectedYear, selectedMonth);
      if (res.success) {
        setKpiData(res.data);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedYear, selectedMonth]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleGenerate = async () => {
    if (!companyId) return;
    setGenerating(true);
    try {
      const res = await payrollAPI.generatePayroll({
        company_id: companyId,
        year: selectedYear,
        month: selectedMonth
      });
      if (res.success) {
        toast.success(res.message || 'Payroll generated successfully!');
        fetchDashboard();
      } else {
        toast.error(res.message || 'Failed to generate payroll.');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleLockToggle = async () => {
    const run = kpiData?.run;
    if (!run) return;
    setLocking(true);
    try {
      const isLocked = run.payroll_status === 'LOCKED';
      const res = isLocked
        ? await payrollAPI.unlockPayrollRun(run._id)
        : await payrollAPI.lockPayrollRun(run._id);
      if (res.success) {
        toast.success(res.message || `Payroll ${isLocked ? 'unlocked' : 'locked'}.`);
        fetchDashboard();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Action failed');
    } finally {
      setLocking(false);
    }
  };

  const formatCurrency = (v) => {
    if (v === undefined || v === null) return '₹0';
    return '₹' + Number(v).toLocaleString('en-IN');
  };

  const kpis = kpiData?.kpis || {};
  const run = kpiData?.run;
  const deptBreakdown = kpiData?.departmentBreakdown || [];
  const trendData = kpiData?.trendData || [];
  const summaries = kpiData?.summaries || [];

  // ─── Analytics calculations ───
  // 1. Net Pay Distribution bins
  const getPayDistribution = () => {
    const bins = [
      { range: '< ₹15k', count: 0 },
      { range: '₹15k-30k', count: 0 },
      { range: '₹30k-50k', count: 0 },
      { range: '₹50k-100k', count: 0 },
      { range: '₹100k+', count: 0 }
    ];
    summaries.forEach(s => {
      const net = s.net_payable_amount || 0;
      if (net < 15000) bins[0].count++;
      else if (net < 30000) bins[1].count++;
      else if (net < 50000) bins[2].count++;
      else if (net < 100000) bins[3].count++;
      else bins[4].count++;
    });
    return bins.filter(b => b.count > 0).length > 0 ? bins : [];
  };

  // 2. Average Salary by Category (Operator vs Staff/Management)
  const getCategoryAverages = () => {
    let opSum = 0, opCount = 0;
    let mgSum = 0, mgCount = 0;
    summaries.forEach(s => {
      const net = s.net_payable_amount || 0;
      if (s.is_operator) {
        opSum += net;
        opCount++;
      } else {
        mgSum += net;
        mgCount++;
      }
    });
    const avgs = [];
    if (opCount > 0) avgs.push({ name: 'Operator', average: Math.round(opSum / opCount) });
    if (mgCount > 0) avgs.push({ name: 'Management', average: Math.round(mgSum / mgCount) });
    return avgs;
  };

  const payDistribution = getPayDistribution();
  const categoryAverages = getCategoryAverages();

  // 3. Leaderboards
  const topEarners = [...summaries]
    .sort((a, b) => (b.net_payable_amount || 0) - (a.net_payable_amount || 0))
    .slice(0, 5);

  const overtimeLeaders = [...summaries]
    .filter(s => (s.total_overtime_hours || 0) > 0)
    .sort((a, b) => (b.total_overtime_hours || 0) - (a.total_overtime_hours || 0))
    .slice(0, 5);

  const adjustmentLeaders = [...summaries]
    .filter(s => (s.adjustment_amount || 0) !== 0)
    .sort((a, b) => Math.abs(b.adjustment_amount || 0) - Math.abs(a.adjustment_amount || 0))
    .slice(0, 5);

  // ─── Directory Filters & Sorting ───
  const deptList = [...new Set(summaries.map(s => s.employee_id?.department).filter(Boolean))];

  const filteredSummaries = summaries.filter(s => {
    const fullName = `${s.employee_id?.first_name || ''} ${s.employee_id?.last_name || ''}`.toLowerCase();
    const code = (s.employee_id?.employee_code || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    
    const matchesSearch = fullName.includes(query) || code.includes(query);
    const matchesDept = !selectedDept || s.employee_id?.department === selectedDept;
    
    let matchesCat = true;
    if (selectedCategory === 'operator') matchesCat = s.is_operator === true;
    if (selectedCategory === 'management') matchesCat = s.is_operator === false;
    
    return matchesSearch && matchesDept && matchesCat;
  });

  const sortedSummaries = [...filteredSummaries].sort((a, b) => {
    let valA, valB;
    if (sortField === 'name') {
      valA = `${a.employee_id?.first_name || ''} ${a.employee_id?.last_name || ''}`.toLowerCase();
      valB = `${b.employee_id?.first_name || ''} ${b.employee_id?.last_name || ''}`.toLowerCase();
    } else if (sortField === 'gross') {
      valA = a.gross_amount || 0;
      valB = b.gross_amount || 0;
    } else if (sortField === 'deductions') {
      valA = a.deduction_amount || 0;
      valB = b.deduction_amount || 0;
    } else if (sortField === 'net') {
      valA = a.net_payable_amount || 0;
      valB = b.net_payable_amount || 0;
    } else if (sortField === 'ot') {
      valA = a.total_overtime_hours || 0;
      valB = b.total_overtime_hours || 0;
    } else if (sortField === 'days') {
      valA = a.payable_days || 0;
      valB = b.payable_days || 0;
    }
    
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <FiArrowUp size={12} style={{ marginLeft: '4px' }} /> : <FiArrowDown size={12} style={{ marginLeft: '4px' }} />;
  };

  if (loading) {
    return (
      <div className="payroll-dash">
        <div className="payroll-loading">
          <div className="payroll-loading__spinner" />
          <span>Loading payroll dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="payroll-dash">
      {/* Header */}
      <div className="payroll-dash__header">
        <div>
          <h1>Payroll Dashboard</h1>
          <p>Comprehensive payroll analytics for {moment(`${selectedYear}-${selectedMonth}-01`).format('MMMM YYYY')}</p>
        </div>
        <div className="payroll-dash__controls">
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
          <button className="payroll-action-btn ghost" onClick={fetchDashboard}>
            <FiRefreshCw size={14} /> Refresh
          </button>
          {run && (
            <span className={`payroll-status-badge ${run.payroll_status?.toLowerCase()}`}>
              {run.payroll_status === 'LOCKED' ? <FiLock size={12} /> : null}
              {run.payroll_status}
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="payroll-kpi-grid">
        <div className="payroll-kpi-card indigo">
          <div className="payroll-kpi-card__icon indigo"><FiDollarSign /></div>
          <div className="payroll-kpi-card__value">{formatCurrency(kpis.totalNet)}</div>
          <div className="payroll-kpi-card__label">Total Net Payable</div>
        </div>
        <div className="payroll-kpi-card emerald">
          <div className="payroll-kpi-card__icon emerald"><FiUsers /></div>
          <div className="payroll-kpi-card__value">{kpis.totalEmployees || 0}</div>
          <div className="payroll-kpi-card__label">Employees Processed</div>
        </div>
        <div className="payroll-kpi-card sky">
          <div className="payroll-kpi-card__icon sky"><FiTrendingUp /></div>
          <div className="payroll-kpi-card__value">{formatCurrency(kpis.avgSalary)}</div>
          <div className="payroll-kpi-card__label">Average Salary</div>
        </div>
        <div className="payroll-kpi-card rose">
          <div className="payroll-kpi-card__icon rose"><FiShield /></div>
          <div className="payroll-kpi-card__value">{formatCurrency(kpis.totalDeductions)}</div>
          <div className="payroll-kpi-card__label">Total Deductions</div>
        </div>
        <div className="payroll-kpi-card amber">
          <div className="payroll-kpi-card__icon amber"><FiDollarSign /></div>
          <div className="payroll-kpi-card__value">{formatCurrency(kpis.totalGross)}</div>
          <div className="payroll-kpi-card__label">Gross Payroll</div>
        </div>
        <div className="payroll-kpi-card violet">
          <div className="payroll-kpi-card__icon violet"><FiBarChart2 /></div>
          <div className="payroll-kpi-card__value">{formatCurrency(kpis.totalPF)}</div>
          <div className="payroll-kpi-card__label">Total PF (EE+ER)</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="payroll-dash__tabs">
        <button
          className={`payroll-dash__tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FiGrid size={16} /> Company Overview
        </button>
        <button
          className={`payroll-dash__tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <FiActivity size={16} /> Employee Analytics
        </button>
        <button
          className={`payroll-dash__tab ${activeTab === 'directory' ? 'active' : ''}`}
          onClick={() => setActiveTab('directory')}
        >
          <FiUsers size={16} /> Employee Directory ({summaries.length})
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: COMPANY OVERVIEW */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          {/* Actions Bar */}
          <div className="payroll-actions-bar">
            {!run ? (
              <button className="payroll-action-btn primary" onClick={handleGenerate} disabled={generating}>
                <FiRefreshCw size={14} /> {generating ? 'Generating...' : 'Generate Payroll'}
              </button>
            ) : (
              <>
                <button className="payroll-action-btn primary" onClick={handleGenerate} disabled={generating || run.payroll_status === 'LOCKED'}>
                  <FiRefreshCw size={14} /> {generating ? 'Regenerating...' : 'Regenerate'}
                </button>
                <button
                  className={`payroll-action-btn ${run.payroll_status === 'LOCKED' ? 'ghost' : 'success'}`}
                  onClick={handleLockToggle}
                  disabled={locking}
                >
                  {run.payroll_status === 'LOCKED' ? <><FiUnlock size={14} /> Unlock</> : <><FiLock size={14} /> Lock Payroll</>}
                </button>
              </>
            )}
          </div>

          {/* Charts */}
          <div className="payroll-charts-grid">
            {/* Trend Chart */}
            <div className="payroll-chart-card">
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Month-over-month payroll cost</h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>In ₹ lakh</span>
              </div>
              {trendData.length > 0 ? (
                <div style={{ width: '100%', height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trendData.map(t => ({
                        name: t.label ? t.label.split(' ')[0] : '',

                        
                        cost: (t.totalNet || 0) / 100000
                      }))}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 'dataMax + 4']} />
                      <RechartsTooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div style={{
                                background: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                              }}>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>{label}</div>
                                <div style={{ fontSize: '12px', color: '#6366f1', fontWeight: 700 }}>Cost: ₹{payload[0].value.toFixed(2)} Lakh</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="cost"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={{ fill: '#6366f1', stroke: '#fff', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="payroll-empty">
                  <div className="payroll-empty__desc">No trend data available</div>
                </div>
              )}
            </div>

            {/* Department Breakdown */}
            <div className="payroll-chart-card">
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Department-wise breakdown</h3>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Gross payout in ₹ lakh</span>
              </div>
              {deptBreakdown.length > 0 ? (
                <div style={{ width: '100%', height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={deptBreakdown.map(d => ({
                        name: d.department || 'Unknown',
                        gross: (d.grossTotal || 0) / 100000
                      }))}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                      <RechartsTooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div style={{
                                background: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                              }}>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>{label}</div>
                                <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>Gross: ₹{payload[0].value.toFixed(2)} Lakh</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="gross" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="payroll-empty">
                  <div className="payroll-empty__desc">No department data</div>
                </div>
              )}
            </div>
          </div>

          {/* Deduction Breakdown */}
          {(kpis.totalPF > 0 || kpis.totalESI > 0 || kpis.totalPT > 0) && (
            <div className="payroll-chart-card" style={{ marginBottom: '28px' }}>
              <h3><FiShield size={16} /> Statutory Deduction Summary</h3>
              <table className="payroll-dept-table">
                <thead>
                  <tr>
                    <th>Deduction Type</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Provident Fund (Employee + Employer)</td><td className="amount" style={{ textAlign: 'right' }}>{formatCurrency(kpis.totalPF)}</td></tr>
                  <tr><td>ESI (Employee + Employer)</td><td className="amount" style={{ textAlign: 'right' }}>{formatCurrency(kpis.totalESI)}</td></tr>
                  <tr><td>Professional Tax</td><td className="amount" style={{ textAlign: 'right' }}>{formatCurrency(kpis.totalPT)}</td></tr>
                  <tr style={{ fontWeight: 700, borderTop: '2px solid #e2e8f0' }}>
                    <td>Total</td>
                    <td className="amount" style={{ textAlign: 'right' }}>{formatCurrency(kpis.totalDeductions)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Department Table */}
          {deptBreakdown.length > 0 && (
            <div className="payroll-chart-card" style={{ marginBottom: '28px' }}>
              <h3><FiUsers size={16} /> Department-wise Salary Summary</h3>
              <table className="payroll-dept-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th style={{ textAlign: 'center' }}>Headcount</th>
                    <th style={{ textAlign: 'right' }}>Gross Total</th>
                    <th style={{ textAlign: 'right' }}>Net Total</th>
                  </tr>
                </thead>
                <tbody>
                  {deptBreakdown.map(d => (
                    <tr key={d.department}>
                      <td>{d.department}</td>
                      <td style={{ textAlign: 'center' }}>{d.count}</td>
                      <td className="amount" style={{ textAlign: 'right' }}>{formatCurrency(d.grossTotal)}</td>
                      <td className="amount" style={{ textAlign: 'right' }}>{formatCurrency(d.netTotal)}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 700, borderTop: '2px solid #e2e8f0' }}>
                    <td>Total</td>
                    <td style={{ textAlign: 'center' }}>{kpis.totalEmployees}</td>
                    <td className="amount" style={{ textAlign: 'right' }}>{formatCurrency(kpis.totalGross)}</td>
                    <td className="amount" style={{ textAlign: 'right' }}>{formatCurrency(kpis.totalNet)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Quick Navigation */}
          <div className="payroll-nav-grid">
            <div className="payroll-nav-card" onClick={() => navigate('/attendance/admin/payroll-entries')}>
              <div className="payroll-nav-card__icon"><FiClipboard /></div>
              <div className="payroll-nav-card__label">Payroll Entries</div>
            </div>
            <div className="payroll-nav-card" onClick={() => navigate('/attendance/admin/payroll-master')}>
              <div className="payroll-nav-card__icon" style={{ background: '#ecfdf5', color: '#10b981' }}><FiUsers /></div>
              <div className="payroll-nav-card__label">Employee Master</div>
            </div>
            <div className="payroll-nav-card" onClick={() => navigate('/attendance/admin/payslip-generator')}>
              <div className="payroll-nav-card__icon" style={{ background: '#fffbeb', color: '#f59e0b' }}><FiPrinter /></div>
              <div className="payroll-nav-card__label">Payslip Generator</div>
            </div>
            <div className="payroll-nav-card" onClick={() => navigate('/attendance/admin/bank-transfer')}>
              <div className="payroll-nav-card__icon" style={{ background: '#fff1f2', color: '#f43f5e' }}><FiCreditCard /></div>
              <div className="payroll-nav-card__label">Bank Transfer</div>
            </div>
            <div className="payroll-nav-card" onClick={() => navigate('/attendance/admin/payroll-reports')}>
              <div className="payroll-nav-card__icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}><FiBarChart2 /></div>
              <div className="payroll-nav-card__label">Reports</div>
            </div>
          </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: EMPLOYEE ANALYTICS */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div style={{ animation: 'modal-fade-in 0.2s ease-out' }}>
          {summaries.length === 0 ? (
            <div className="payroll-chart-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div className="payroll-empty__icon">📊</div>
              <div className="payroll-empty__title">No Analytics Data Available</div>
              <div className="payroll-empty__desc">
                Generate payroll for the selected month to view employee analytics.
              </div>
            </div>
          ) : (
            <>
              {/* Analytics Charts Grid */}
              <div className="payroll-charts-grid">
                {/* Net Pay Distribution Bar Chart */}
                {payDistribution.length > 0 && (
                  <div className="payroll-chart-card">
                    <h3><FiActivity size={15} style={{ color: '#6366f1' }} /> Net Salary Distribution</h3>
                    <div style={{ width: '100%', height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={payDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="range" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                          <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                          <RechartsTooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div style={{
                                    background: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '8px 12px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                                  }}>
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>{label} Range</div>
                                    <div style={{ fontSize: '12px', color: '#6366f1', fontWeight: 700 }}>Headcount: {payload[0].value}</div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={48}>
                            {payDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Operator vs Management Average Net Pay */}
                {categoryAverages.length > 0 && (
                  <div className="payroll-chart-card">
                    <h3><FiTrendingUp size={15} style={{ color: '#0ea5e9' }} /> Average Salary by Category</h3>
                    <div style={{ width: '100%', height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryAverages} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                          <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                          <RechartsTooltip
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div style={{
                                    background: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '8px 12px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                                  }}>
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>{label}</div>
                                    <div style={{ fontSize: '12px', color: '#0ea5e9', fontWeight: 700 }}>Average: {formatCurrency(payload[0].value)}</div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="average" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={48}>
                            {categoryAverages.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#6366f1'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>

              {/* Leaderboards/Rankings Row */}
              <div className="analytics-leaderboards">
                {/* Top Earners */}
                <div className="leaderboard-card">
                  <h3><FiDollarSign style={{ color: '#10b981' }} /> Top Earners (Net Pay)</h3>
                  <div className="leaderboard-list">
                    {topEarners.map((s, idx) => (
                      <div key={s._id} className="leaderboard-item" onClick={() => setSelectedEmployee(s)} style={{ cursor: 'pointer' }}>
                        <div className="leaderboard-item__emp">
                          <img
                            src={s.employee_id?.employee_photo || '/avatar-placeholder.png'}
                            alt=""
                            className="leaderboard-item__avatar"
                            onError={el => { el.target.src = '/avatar-placeholder.png'; }}
                          />
                          <div className="leaderboard-item__info">
                            <span className="leaderboard-item__name">{s.employee_id?.first_name} {s.employee_id?.last_name}</span>
                            <span className="leaderboard-item__meta">{s.employee_id?.employee_code || 'No Code'} • {s.employee_id?.department || 'Staff'}</span>
                          </div>
                        </div>
                        <span className="leaderboard-item__value green">{formatCurrency(s.net_payable_amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Overtime Leaders */}
                <div className="leaderboard-card">
                  <h3><FiClock style={{ color: '#f59e0b' }} /> Overtime Leaders</h3>
                  <div className="leaderboard-list">
                    {overtimeLeaders.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>No overtime recorded this month</div>
                    ) : (
                      overtimeLeaders.map(s => (
                        <div key={s._id} className="leaderboard-item" onClick={() => setSelectedEmployee(s)} style={{ cursor: 'pointer' }}>
                          <div className="leaderboard-item__emp">
                            <img
                              src={s.employee_id?.employee_photo || '/avatar-placeholder.png'}
                              alt=""
                              className="leaderboard-item__avatar"
                              onError={el => { el.target.src = '/avatar-placeholder.png'; }}
                            />
                            <div className="leaderboard-item__info">
                              <span className="leaderboard-item__name">{s.employee_id?.first_name} {s.employee_id?.last_name}</span>
                              <span className="leaderboard-item__meta">{s.employee_id?.employee_code || 'No Code'} • {s.employee_id?.department || 'Staff'}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className="leaderboard-item__value" style={{ display: 'block' }}>{s.total_overtime_hours || 0} Hrs</span>
                            <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>+{formatCurrency(s.overtime_amount)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Manual Adjustments */}
                <div className="leaderboard-card">
                  <h3><FiSettings style={{ color: '#8b5cf6' }} /> Key Adjustments</h3>
                  <div className="leaderboard-list">
                    {adjustmentLeaders.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>No manual adjustments recorded</div>
                    ) : (
                      adjustmentLeaders.map(s => (
                        <div key={s._id} className="leaderboard-item" onClick={() => setSelectedEmployee(s)} style={{ cursor: 'pointer' }}>
                          <div className="leaderboard-item__emp">
                            <img
                              src={s.employee_id?.employee_photo || '/avatar-placeholder.png'}
                              alt=""
                              className="leaderboard-item__avatar"
                              onError={el => { el.target.src = '/avatar-placeholder.png'; }}
                            />
                            <div className="leaderboard-item__info">
                              <span className="leaderboard-item__name">{s.employee_id?.first_name} {s.employee_id?.last_name}</span>
                              <span className="leaderboard-item__meta" title={s.adjustment_remarks || 'Adjustment'}>
                                {s.adjustment_remarks ? (s.adjustment_remarks.slice(0, 18) + (s.adjustment_remarks.length > 18 ? '...' : '')) : 'No Remarks'}
                              </span>
                            </div>
                          </div>
                          <span className={`leaderboard-item__value ${s.adjustment_amount > 0 ? 'green' : 'blue'}`}>
                            {s.adjustment_amount > 0 ? '+' : ''}{formatCurrency(s.adjustment_amount)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: EMPLOYEE DIRECTORY */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'directory' && (
        <div style={{ animation: 'modal-fade-in 0.2s ease-out' }}>
          {/* Search & filters */}
          <div className="directory-filters">
            <div className="directory-search">
              <FiSearch className="directory-search__icon" />
              <input
                type="text"
                placeholder="Search employee name or code..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            <select
              className="filter-select"
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
            >
              <option value="">All Departments</option>
              {deptList.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            <select
              className="filter-select"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="management">Management / Staff</option>
              <option value="operator">Operator / Wage-Worker</option>
            </select>
            
            <div style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
              Showing {sortedSummaries.length} of {summaries.length}
            </div>
          </div>

          {/* Directory table */}
          {sortedSummaries.length === 0 ? (
            <div className="payroll-chart-card" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <FiFileText size={36} style={{ opacity: 0.4, marginBottom: '8px' }} />
              <div>No matching employee summaries found.</div>
            </div>
          ) : (
            <div className="emp-table-container">
              <table className="emp-data-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('name')}>Employee {getSortIcon('name')}</th>
                    <th onClick={() => handleSort('days')} style={{ textAlign: 'center' }}>Payable Days {getSortIcon('days')}</th>
                    <th onClick={() => handleSort('gross')} style={{ textAlign: 'right' }}>Gross Pay {getSortIcon('gross')}</th>
                    <th onClick={() => handleSort('deductions')} style={{ textAlign: 'right' }}>Deductions {getSortIcon('deductions')}</th>
                    <th onClick={() => handleSort('ot')} style={{ textAlign: 'right' }}>Overtime {getSortIcon('ot')}</th>
                    <th onClick={() => handleSort('net')} style={{ textAlign: 'right' }}>Net Payable {getSortIcon('net')}</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSummaries.map(s => (
                    <tr key={s._id}>
                      <td>
                        <div className="emp-cell">
                          <img
                            src={s.employee_id?.employee_photo || '/avatar-placeholder.png'}
                            alt=""
                            className="emp-cell__avatar"
                            onError={el => { el.target.src = '/avatar-placeholder.png'; }}
                          />
                          <div className="emp-cell__info">
                            <span className="emp-cell__name">{s.employee_id?.first_name} {s.employee_id?.last_name}</span>
                            <span className="emp-cell__meta">
                              {s.employee_id?.employee_code || 'No Code'} • {s.employee_id?.designation || 'Staff'} • <span style={{ fontWeight: 600, color: s.is_operator ? '#10b981' : '#6366f1' }}>{s.is_operator ? 'OP' : 'MGT'}</span>
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: '500', fontVariantNumeric: 'tabular-nums' }}>
                        <span title={`Present: ${s.present_days}, Absent: ${s.absent_days}, Weekly Offs: ${s.weekly_off_days}, Leaves: ${s.leave_days}`}>
                          {s.payable_days} / {s.total_days_in_month}
                        </span>
                      </td>
                      <td className="amount-cell" style={{ textAlign: 'right' }}>{formatCurrency(s.gross_amount)}</td>
                      <td className="amount-cell red" style={{ textAlign: 'right' }} title={`PF: ${formatCurrency((s.pf_employee || 0))}, ESI: ${formatCurrency((s.esi_employee || 0))}, PT: ${formatCurrency(s.professional_tax)}, Other: ${formatCurrency(s.other_deductions)}`}>
                        {s.deduction_amount > 0 ? `-${formatCurrency(s.deduction_amount)}` : '₹0'}
                      </td>
                      <td className="amount-cell green" style={{ textAlign: 'right' }}>
                        {s.overtime_amount > 0 ? `+${formatCurrency(s.overtime_amount)}` : '₹0'}
                        {(s.total_overtime_hours || 0) > 0 && <span style={{ display: 'block', fontSize: '9px', color: '#64748b', fontWeight: 500 }}>({s.total_overtime_hours} hrs)</span>}
                      </td>
                      <td className="amount-cell bold green" style={{ textAlign: 'right', fontSize: '14px' }}>{formatCurrency(s.net_payable_amount)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="payroll-action-btn ghost"
                          style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '6px' }}
                          onClick={() => setSelectedEmployee(s)}
                        >
                          <FiInfo size={12} /> View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* DETAILED COMPUTATION MODAL POPUP */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {selectedEmployee && (
        <div className="payroll-modal-backdrop" onClick={() => setSelectedEmployee(null)}>
          <div className="payroll-modal-content" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <img
                  src={selectedEmployee.employee_id?.employee_photo || '/avatar-placeholder.png'}
                  alt=""
                  style={{ width: '48px', height: '48px', borderRadius: '50%', border: '1px solid #cbd5e1', objectFit: 'cover' }}
                  onError={el => { el.target.src = '/avatar-placeholder.png'; }}
                />
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                    {selectedEmployee.employee_id?.first_name} {selectedEmployee.employee_id?.last_name}
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                    {selectedEmployee.employee_id?.employee_code || 'No Code'} • {selectedEmployee.employee_id?.designation || 'Staff'} • {selectedEmployee.employee_id?.department || 'General'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', borderRadius: '50%', display: 'flex', transition: 'background 0.2s' }}
                onMouseOver={el => el.currentTarget.style.background = '#f1f5f9'}
                onMouseOut={el => el.currentTarget.style.background = 'none'}
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div>
              {/* Category info */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <span className="payroll-status-badge draft" style={{ textTransform: 'none', background: '#e0f2fe', color: '#0369a1' }}>
                  Category: {selectedEmployee.is_operator ? 'Operator' : 'Management / Staff'}
                </span>
                <span className="payroll-status-badge draft" style={{ textTransform: 'none', background: '#f0fdf4', color: '#166534' }}>
                  Payroll Type: {selectedEmployee.payroll_type}
                </span>
                <span className="payroll-status-badge draft" style={{ textTransform: 'none', background: '#faf5ff', color: '#6b21a8' }}>
                  Base: {selectedEmployee.payroll_type === 'DAILY_WAGE' ? `₹${selectedEmployee.daily_wage_snapshot || 0}/day` : `₹${selectedEmployee.monthly_salary_snapshot || 0}/month`}
                </span>
              </div>

              {/* Attendance metrics */}
              <h4 className="modal-section-title"><FiCalendar size={13} /> Attendance Breakdown</h4>
              <div className="modal-grid-3">
                <div className="modal-stat-card">
                  <div className="modal-stat-card__val">{selectedEmployee.payable_days} Days</div>
                  <div className="modal-stat-card__lbl">Payable Days</div>
                </div>
                <div className="modal-stat-card">
                  <div className="modal-stat-card__val">{selectedEmployee.present_days} Days</div>
                  <div className="modal-stat-card__lbl">Present / Half Days ({selectedEmployee.half_days} HD)</div>
                </div>
                <div className="modal-stat-card">
                  <div className="modal-stat-card__val">{selectedEmployee.leave_days + selectedEmployee.weekly_off_days + selectedEmployee.holiday_days} Days</div>
                  <div className="modal-stat-card__lbl">Paid Leaves & Holidays</div>
                </div>
              </div>

              {/* Work Hours Metrics */}
              <h4 className="modal-section-title"><FiClock size={13} /> Hours and Shifts Summary</h4>
              <div className="modal-grid-3">
                <div className="modal-stat-card">
                  <div className="modal-stat-card__val">{selectedEmployee.total_regular_hours || 0} Hrs</div>
                  <div className="modal-stat-card__lbl">Regular Work Hours</div>
                </div>
                <div className="modal-stat-card">
                  <div className="modal-stat-card__val" style={{ color: selectedEmployee.total_overtime_hours > 0 ? '#10b981' : 'inherit' }}>
                    {selectedEmployee.total_overtime_hours || 0} Hrs
                  </div>
                  <div className="modal-stat-card__lbl">Overtime (OT) Hours</div>
                </div>
                <div className="modal-stat-card">
                  <div className="modal-stat-card__val">{selectedEmployee.total_shift_count || 0}</div>
                  <div className="modal-stat-card__lbl">Monthly Shifts</div>
                </div>
              </div>

              {/* Calculations Detailed Split */}
              <div className="modal-grid-2" style={{ marginTop: '20px' }}>
                {/* Earnings */}
                <div>
                  <h4 className="modal-section-title"><FiTrendingUp size={13} style={{ color: '#10b981' }} /> Monthly Earnings</h4>
                  <div className="modal-list-item">
                    <span className="modal-list-item__lbl">Basic Salary:</span>
                    <span className="modal-list-item__val">{formatCurrency(selectedEmployee.basic_amount)}</span>
                  </div>
                  {/* Earnings Components (if exists) */}
                  {(selectedEmployee.earnings_breakup || []).map((comp, i) => (
                    <div key={i} className="modal-list-item">
                      <span className="modal-list-item__lbl" style={{ paddingLeft: '8px', fontSize: '12px', color: '#64748b' }}>• {comp.payhead}:</span>
                      <span className="modal-list-item__val" style={{ fontSize: '12px', color: '#475569' }}>{formatCurrency(comp.amount)}</span>
                    </div>
                  ))}
                  <div className="modal-list-item">
                    <span className="modal-list-item__lbl">Overtime Amount:</span>
                    <span className="modal-list-item__val" style={{ color: '#10b981' }}>+{formatCurrency(selectedEmployee.overtime_amount)}</span>
                  </div>
                  <div className="modal-list-item" style={{ borderTop: '1px solid #cbd5e1', paddingTop: '10px', fontWeight: 'bold' }}>
                    <span className="modal-list-item__lbl" style={{ color: '#0f172a', fontWeight: 'bold' }}>Gross Amount:</span>
                    <span className="modal-list-item__val" style={{ color: '#0f172a', fontWeight: 'bold' }}>{formatCurrency(selectedEmployee.gross_amount)}</span>
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <h4 className="modal-section-title"><FiTrendingDown size={13} style={{ color: '#ef4444' }} /> Monthly Deductions</h4>
                  <div className="modal-list-item">
                    <span className="modal-list-item__lbl">Provident Fund (PF):</span>
                    <span className="modal-list-item__val">{formatCurrency(selectedEmployee.pf_employee)}</span>
                  </div>
                  <div className="modal-list-item">
                    <span className="modal-list-item__lbl">ESI Contribution:</span>
                    <span className="modal-list-item__val">{formatCurrency(selectedEmployee.esi_employee)}</span>
                  </div>
                  <div className="modal-list-item">
                    <span className="modal-list-item__lbl">Professional Tax (PT):</span>
                    <span className="modal-list-item__val">{formatCurrency(selectedEmployee.professional_tax)}</span>
                  </div>
                  {selectedEmployee.other_deductions > 0 && (
                    <div className="modal-list-item" title={selectedEmployee.other_deduction_remarks}>
                      <span className="modal-list-item__lbl">Other ({selectedEmployee.other_deduction_remarks || 'Deductions'}):</span>
                      <span className="modal-list-item__val">{formatCurrency(selectedEmployee.other_deductions)}</span>
                    </div>
                  )}
                  <div className="modal-list-item" style={{ borderTop: '1px solid #cbd5e1', paddingTop: '10px', fontWeight: 'bold' }}>
                    <span className="modal-list-item__lbl" style={{ color: '#0f172a', fontWeight: 'bold' }}>Total Deductions:</span>
                    <span className="modal-list-item__val" style={{ color: '#ef4444', fontWeight: 'bold' }}>-{formatCurrency(selectedEmployee.deduction_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Adjustments & Net Pay Footer */}
              <div style={{ marginTop: '24px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Gross Earnings:</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(selectedEmployee.gross_amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Total Deductions:</span>
                  <span style={{ fontWeight: 600, color: '#ef4444' }}>-{formatCurrency(selectedEmployee.deduction_amount)}</span>
                </div>
                {selectedEmployee.adjustment_amount !== 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }} title={selectedEmployee.adjustment_remarks}>
                    <span style={{ color: '#64748b' }}>Manual Adjustments ({selectedEmployee.adjustment_remarks || 'Adjustment'}):</span>
                    <span style={{ fontWeight: 600, color: selectedEmployee.adjustment_amount > 0 ? '#10b981' : '#ef4444' }}>
                      {selectedEmployee.adjustment_amount > 0 ? '+' : ''}{formatCurrency(selectedEmployee.adjustment_amount)}
                    </span>
                  </div>
                )}
                
                <div style={{ borderTop: '1px solid #cbd5e1', marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '15px' }}>Net Payout Amount:</span>
                  <span style={{ fontWeight: 800, color: '#166534', fontSize: '18px' }}>{formatCurrency(selectedEmployee.net_payable_amount)}</span>
                </div>
              </div>
              
              {/* Formula explanation */}
              <div style={{ marginTop: '12px', fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FiInfo /> Formula: Net Payout = Gross Amount ({selectedEmployee.gross_amount}) - Deductions ({selectedEmployee.deduction_amount}) {selectedEmployee.adjustment_amount !== 0 ? ` + Adjustments (${selectedEmployee.adjustment_amount})` : ''}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button
                className="payroll-action-btn primary"
                style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '8px' }}
                onClick={() => {
                  setSelectedEmployee(null);
                  navigate('/attendance/admin/payroll-entries');
                }}
              >
                <FiClipboard size={12} /> Go to Entry Adjustments
              </button>
              <button
                className="payroll-action-btn ghost"
                style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '8px' }}
                onClick={() => setSelectedEmployee(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollDashboard;
