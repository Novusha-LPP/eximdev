import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  FiSettings, FiClock, FiPlus, FiTrash2,
  FiCalendar, FiLock, FiUnlock, FiFileText, FiCheck, FiRefreshCw,
  FiInfo
} from 'react-icons/fi';
import payrollAPI from '../../../api/attendance/payroll.api';
import moment from 'moment';

const THEME = {
  primary: '#0f172a',
  indigo: '#4f46e5',
  green: '#10b981',
  red: '#ef4444',
  amber: '#f59e0b',
  border: '#e2e8f0',
  bg: '#f8fafc',
  card: '#ffffff',
  text: '#1e293b',
  muted: '#64748b'
};

const S = {
  card: {
    background: THEME.card,
    border: `1px solid ${THEME.border}`,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)',
    marginBottom: '24px'
  },
  title: {
    fontSize: '16px',
    fontWeight: '700',
    color: THEME.primary,
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: THEME.text,
    marginBottom: '6px'
  },
  input: {
    width: '100%',
    height: '38px',
    padding: '0 12px',
    borderRadius: '6px',
    border: `1px solid ${THEME.border}`,
    fontSize: '13px',
    color: THEME.text,
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box'
  },
  btn: (variant = 'primary') => ({
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s',
    ...(variant === 'primary' ? { background: THEME.primary, color: '#fff' } :
        variant === 'danger' ? { background: THEME.red, color: '#fff' } :
        variant === 'success' ? { background: THEME.green, color: '#fff' } :
        { background: 'transparent', color: THEME.text, border: `1px solid ${THEME.border}` })
  }),
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
    marginTop: '12px'
  },
  th: {
    background: '#f8fafc',
    color: THEME.muted,
    fontWeight: '600',
    padding: '10px 12px',
    textAlign: 'left',
    borderBottom: `1px solid ${THEME.border}`
  },
  td: {
    padding: '10px 12px',
    borderBottom: `1px solid ${THEME.border}`,
    color: THEME.text
  }
};

const PayrollTab = ({ employeeId, companyId, employeeName }) => {
  // Config States
  const [config, setConfig] = useState({
    company_id: companyId || '',
    is_operator: false,
    payroll_type: 'MONTHLY',
    monthly_salary: 0,
    daily_wage: 0,
    overtime_rate_per_hour: 0,
    overtime_eligible: false,
    overtime_grace_minutes: 20,
    effective_from: moment().startOf('month').format('YYYY-MM-DD'),
    revision_reason: ''
  });
  const [configHistory, setConfigHistory] = useState([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);

  // Structure States
  const [structure, setStructure] = useState({
    gross_salary: 0,
    effective_from: moment().startOf('month').format('YYYY-MM-DD'),
    salary_type: 'GROSS',
    components: []
  });
  const [structureHistory, setStructureHistory] = useState([]);
  const [structureLoading, setStructureLoading] = useState(false);
  const [structureSaving, setStructureSaving] = useState(false);

  // Summary States
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [selectedMonth, setSelectedMonth] = useState(moment().format('MM'));
  const [summary, setSummary] = useState(null);
  const [run, setRun] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [locking, setLocking] = useState(false);
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  // Section Selector
  const [activeSection, setActiveSection] = useState('config'); // 'config', 'structure', 'summary'

  useEffect(() => {
    if (employeeId) {
      fetchConfig();
      fetchStructure();
      fetchSummary();
    }
  }, [employeeId, companyId]);

  useEffect(() => {
    if (employeeId && activeSection === 'summary') {
      fetchSummary();
    }
  }, [selectedYear, selectedMonth, activeSection]);

  const fetchConfig = async () => {
    setConfigLoading(true);
    try {
      const res = await payrollAPI.getEmployeePayrollConfig(employeeId);
      if (res.success && res.data) {
        setConfig({
          ...res.data,
          effective_from: moment(res.data.effective_from).format('YYYY-MM-DD'),
          revision_reason: ''
        });
      }
      const historyRes = await payrollAPI.getPayrollConfigHistory(employeeId);
      if (historyRes.success) {
        setConfigHistory(historyRes.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setConfigLoading(false);
    }
  };

  const fetchStructure = async () => {
    setStructureLoading(true);
    try {
      const res = await payrollAPI.getSalaryStructure(employeeId);
      if (res.success && res.data) {
        setStructure({
          ...res.data,
          effective_from: moment(res.data.effective_from).format('YYYY-MM-DD')
        });
      }
      const historyRes = await payrollAPI.getSalaryStructureHistory(employeeId);
      if (historyRes.success) {
        setStructureHistory(historyRes.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStructureLoading(false);
    }
  };

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      // 1. Get Summary
      const summaryRes = await payrollAPI.getEmployeePayrollSummary(employeeId, selectedYear, selectedMonth);
      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
      } else {
        setSummary(null);
      }

      // 2. Get Run status
      if (companyId) {
        const runRes = await payrollAPI.getPayrollRun(companyId, selectedYear, selectedMonth);
        if (runRes.success && runRes.data) {
          setRun(runRes.data);
        } else {
          setRun(null);
        }
      }
    } catch (err) {
      console.error(err);
      setSummary(null);
      setRun(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleConfigSave = async (e) => {
    e.preventDefault();
    setConfigSaving(true);
    try {
      const payload = {
        ...config,
        company_id: config.company_id || companyId
      };
      const res = await payrollAPI.updateEmployeePayrollConfig(employeeId, payload);
      if (res.success) {
        toast.success(res.message || 'Configuration saved successfully!');
        fetchConfig();
      } else {
        toast.error(res.message || 'Failed to save configuration.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save configuration.');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleStructureSave = async (e) => {
    e.preventDefault();
    setStructureSaving(true);
    try {
      const payload = {
        ...structure,
        company_id: companyId
      };
      const res = await payrollAPI.saveSalaryStructure(employeeId, payload);
      if (res.success) {
        toast.success(res.message || 'Salary structure saved successfully!');
        fetchStructure();
      } else {
        toast.error(res.message || 'Failed to save salary structure.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save salary structure.');
    } finally {
      setStructureSaving(false);
    }
  };

  const handleAddComponent = () => {
    setStructure(prev => ({
      ...prev,
      components: [...prev.components, { payhead: '', formula: '', monthly_amount: 0, yearly_amount: 0 }]
    }));
  };

  const handleRemoveComponent = (idx) => {
    setStructure(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== idx)
    }));
  };

  const handleComponentChange = (idx, field, value) => {
    setStructure(prev => {
      const comps = [...prev.components];
      if (field === 'monthly_amount') {
        const val = parseFloat(value) || 0;
        comps[idx] = { ...comps[idx], monthly_amount: val, yearly_amount: val * 12 };
      } else if (field === 'yearly_amount') {
        const val = parseFloat(value) || 0;
        comps[idx] = { ...comps[idx], yearly_amount: val, monthly_amount: val / 12 };
      } else {
        comps[idx] = { ...comps[idx], [field]: value };
      }
      return { ...prev, components: comps };
    });
  };

  const handleGeneratePayroll = async () => {
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
        fetchSummary();
      } else {
        toast.error(res.message || 'Failed to generate payroll.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to generate payroll.');
    } finally {
      setGenerating(false);
    }
  };

  const handleLockUnlock = async () => {
    if (!run) return;
    setLocking(true);
    try {
      const isLocked = run.payroll_status === 'LOCKED';
      const res = isLocked
        ? await payrollAPI.unlockPayrollRun(run._id)
        : await payrollAPI.lockPayrollRun(run._id);
      
      if (res.success) {
        toast.success(res.message || `Payroll ${isLocked ? 'unlocked' : 'locked'} successfully.`);
        fetchSummary();
      } else {
        toast.error(res.message || 'Failed to update lock state.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update lock state.');
    } finally {
      setLocking(false);
    }
  };

  const componentsSum = structure.components.reduce((sum, item) => sum + (item.monthly_amount || 0), 0);

  return (
    <div>
      {/* Navigation Inside Tab */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { id: 'config', label: 'Payroll Config', icon: <FiSettings /> },
          { id: 'structure', label: 'Salary Breakup', icon: <span style={{ fontWeight: 'bold', fontSize: '14px', lineHeight: 1 }}>₹</span> },
          { id: 'summary', label: 'Monthly Summary', icon: <FiCalendar /> }
        ].map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              ...S.btn(activeSection === s.id ? 'primary' : 'ghost'),
              fontSize: '12px',
              padding: '6px 12px'
            }}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. CONFIGURATION SECTION */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeSection === 'config' && (
        <div>
          {configLoading ? (
            <div style={{ padding: '20px', color: THEME.muted }}>Loading payroll configuration...</div>
          ) : (
            <form onSubmit={handleConfigSave} style={S.card}>
              <div style={S.title}>
                <FiSettings /> Payroll Settings for {employeeName}
              </div>

              <div style={S.grid}>
                <div>
                  <label style={S.label}>Category</label>
                  <select
                    value={config.is_operator ? 'operator' : 'management'}
                    onChange={e => {
                      const isOp = e.target.value === 'operator';
                      setConfig(prev => ({
                        ...prev,
                        is_operator: isOp,
                        payroll_type: isOp ? 'DAILY_WAGE' : 'MONTHLY',
                        overtime_eligible: isOp
                      }));
                    }}
                    style={S.input}
                  >
                    <option value="management">Management / Staff</option>
                    <option value="operator">Operator / Wage-Worker</option>
                  </select>
                </div>

                <div>
                  <label style={S.label}>Payroll Type</label>
                  <select
                    value={config.payroll_type}
                    onChange={e => setConfig(prev => ({ ...prev, payroll_type: e.target.value }))}
                    style={S.input}
                  >
                    <option value="MONTHLY">Monthly Salary</option>
                    <option value="DAILY_WAGE">Daily Wage</option>
                  </select>
                </div>

                {config.payroll_type === 'MONTHLY' ? (
                  <div>
                    <label style={S.label}>Monthly Salary (₹)</label>
                    <input
                      type="number"
                      value={config.monthly_salary}
                      onChange={e => setConfig(prev => ({ ...prev, monthly_salary: parseFloat(e.target.value) || 0 }))}
                      style={S.input}
                    />
                  </div>
                ) : (
                  <div>
                    <label style={S.label}>Daily Wage (₹)</label>
                    <input
                      type="number"
                      value={config.daily_wage}
                      onChange={e => setConfig(prev => ({ ...prev, daily_wage: parseFloat(e.target.value) || 0 }))}
                      style={S.input}
                    />
                  </div>
                )}
              </div>

              <div style={{ borderTop: `1px solid ${THEME.border}`, margin: '20px 0', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <input
                    type="checkbox"
                    id="ot_elg"
                    checked={config.overtime_eligible}
                    onChange={e => setConfig(prev => ({ ...prev, overtime_eligible: e.target.checked }))}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <label htmlFor="ot_elg" style={{ ...S.label, margin: 0, cursor: 'pointer' }}>Eligible for Overtime (OT)</label>
                </div>

                {config.overtime_eligible && (
                  <div style={S.grid}>
                    <div>
                      <label style={S.label}>OT Hourly Rate (₹)</label>
                      <input
                        type="number"
                        value={config.overtime_rate_per_hour}
                        onChange={e => setConfig(prev => ({ ...prev, overtime_rate_per_hour: parseFloat(e.target.value) || 0 }))}
                        style={S.input}
                      />
                    </div>
                    <div>
                      <label style={S.label}>Grace Period (Minutes)</label>
                      <input
                        type="number"
                        value={config.overtime_grace_minutes}
                        onChange={e => setConfig(prev => ({ ...prev, overtime_grace_minutes: parseInt(e.target.value) || 0 }))}
                        style={S.input}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ borderTop: `1px solid ${THEME.border}`, margin: '20px 0', paddingTop: '16px' }}>
                <div style={S.grid}>
                  <div>
                    <label style={S.label}>Effective From</label>
                    <input
                      type="date"
                      value={config.effective_from}
                      onChange={e => setConfig(prev => ({ ...prev, effective_from: e.target.value }))}
                      style={S.input}
                    />
                  </div>
                  <div>
                    <label style={S.label}>Reason for Setup/Revision</label>
                    <input
                      type="text"
                      placeholder="e.g. Initial setup, Salary Increment"
                      value={config.revision_reason}
                      onChange={e => setConfig(prev => ({ ...prev, revision_reason: e.target.value }))}
                      style={S.input}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="submit" disabled={configSaving} style={S.btn('primary')}>
                  {configSaving ? 'Saving...' : 'Save Payroll Config'}
                </button>
              </div>
            </form>
          )}

          {/* History */}
          <div style={S.card}>
            <div style={S.title}>Revision History</div>
            {configHistory.length === 0 ? (
              <div style={{ fontSize: '13px', color: THEME.muted }}>No revision history available.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Effective From</th>
                      <th style={S.th}>Effective To</th>
                      <th style={S.th}>Category</th>
                      <th style={S.th}>Wage Details</th>
                      <th style={S.th}>OT</th>
                      <th style={S.th}>Status</th>
                      <th style={S.th}>Reason</th>
                      <th style={S.th}>Updated By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configHistory.map(h => (
                      <tr key={h._id}>
                        <td style={S.td}>{moment(h.effective_from).format('DD MMM YYYY')}</td>
                        <td style={S.td}>{h.effective_to ? moment(h.effective_to).format('DD MMM YYYY') : '-'}</td>
                        <td style={S.td}>{h.is_operator ? 'OPERATOR' : 'MANAGEMENT'}</td>
                        <td style={S.td}>
                          {h.payroll_type === 'MONTHLY' ? `₹${h.monthly_salary}/mo` : `₹${h.daily_wage}/day`}
                        </td>
                        <td style={S.td}>
                          {h.overtime_eligible ? `₹${h.overtime_rate_per_hour}/hr` : 'No'}
                        </td>
                        <td style={S.td}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: h.status === 'ACTIVE' ? '#ecfdf5' : '#f1f5f9',
                            color: h.status === 'ACTIVE' ? '#059669' : '#64748b'
                          }}>{h.status}</span>
                        </td>
                        <td style={S.td}>{h.revision_reason || '-'}</td>
                        <td style={S.td}>
                          {h.created_by ? `${h.created_by.first_name || ''} ${h.created_by.last_name || ''}`.trim() || h.created_by.username : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. SALARY STRUCTURE BREAKDOWN */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeSection === 'structure' && (
        <div>
          {structureLoading ? (
            <div style={{ padding: '20px', color: THEME.muted }}>Loading salary structure...</div>
          ) : (
            <form onSubmit={handleStructureSave} style={S.card}>
              <div style={S.title}>
                Salary Breakup
              </div>

              {/* Active Config Info Card */}
              <div style={{
                background: '#f8fafc',
                border: `1px solid ${THEME.border}`,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px',
                fontSize: '13px'
              }}>
                <div style={{ fontWeight: '700', marginBottom: '8px', color: THEME.primary, display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <FiSettings size={14} style={{ color: THEME.indigo }} /> Active Payroll Config Snapshot:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div><strong>Employee Category:</strong> {config.is_operator ? 'Operator' : 'Management'}</div>
                  <div><strong>Payroll Structure:</strong> {config.payroll_type}</div>
                  <div>
                    <strong>Base Rate:</strong> {config.payroll_type === 'DAILY_WAGE' ? `₹${config.daily_wage || 0}/day` : `₹${config.monthly_salary || 0}/month`}
                  </div>
                  <div><strong>OT Eligibility:</strong> {config.overtime_eligible ? `Eligible (₹${config.overtime_rate_per_hour || 0}/hr)` : 'Not Eligible'}</div>
                </div>
                {config.payroll_type === 'DAILY_WAGE' && (
                  <div style={{ marginTop: '10px', color: THEME.muted, fontSize: '12px', fontStyle: 'italic' }}>
                    * Note: Because this employee is configured as an Operator, their final monthly payout is calculated on a daily rate base (Daily Wage × Payable Days) instead of a fixed monthly salary.
                  </div>
                )}
              </div>

              <div style={S.grid}>
                <div>
                  <label style={S.label}>Salary Type</label>
                  <select
                    value={structure.salary_type}
                    onChange={e => setStructure(prev => ({ ...prev, salary_type: e.target.value }))}
                    style={S.input}
                  >
                    <option value="GROSS">GROSS Salary</option>
                    <option value="CTC">CTC (Cost to Company)</option>
                    <option value="NET">NET Salary</option>
                  </select>
                </div>

                <div>
                  <label style={S.label}>Total Monthly Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="Enter monthly amount"
                    value={structure.gross_salary}
                    onChange={e => setStructure(prev => ({ ...prev, gross_salary: parseFloat(e.target.value) || 0 }))}
                    style={S.input}
                  />
                  <span style={{ fontSize: '11px', color: THEME.muted, display: 'block', marginTop: '4px' }}>
                    * Enter monthly value (Gross, CTC, and Net are all considered monthly)
                  </span>
                </div>

                <div>
                  <label style={S.label}>Effective From</label>
                  <input
                    type="date"
                    value={structure.effective_from}
                    onChange={e => setStructure(prev => ({ ...prev, effective_from: e.target.value }))}
                    style={S.input}
                  />
                </div>
              </div>

              {/* Payheads */}
              <div style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: THEME.primary }}>Pay Components</span>
                  <button type="button" onClick={handleAddComponent} style={S.btn('ghost')}>
                    <FiPlus /> Add Component
                  </button>
                </div>

                {structure.components.length === 0 ? (
                  <div style={{ padding: '16px', border: `1px dashed ${THEME.border}`, borderRadius: '6px', textAlign: 'center', color: THEME.muted, fontSize: '13px' }}>
                    No break-up components added. The basic monthly salary will be calculated as a single block.
                  </div>
                ) : (
                  <div>
                    {/* Column Headers */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 2fr 1fr 1fr 40px',
                      gap: '10px',
                      marginBottom: '8px',
                      padding: '0 4px',
                      fontSize: '11px',
                      fontWeight: '700',
                      color: THEME.muted
                    }}>
                      <div>Component Name</div>
                      <div>Formula / Description</div>
                      <div>Monthly Amount (₹)</div>
                      <div>Yearly Amount (₹)</div>
                      <div></div>
                    </div>

                    {structure.components.map((item, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 40px', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
                        <input
                          placeholder="Payhead Name (e.g. Basic, HRA)"
                          value={item.payhead}
                          onChange={e => handleComponentChange(idx, 'payhead', e.target.value)}
                          style={S.input}
                          required
                        />
                        <input
                          placeholder="Formula / Comments"
                          value={item.formula || ''}
                          onChange={e => handleComponentChange(idx, 'formula', e.target.value)}
                          style={S.input}
                        />
                        <input
                          type="number"
                          placeholder="Monthly (₹)"
                          value={item.monthly_amount || ''}
                          onChange={e => handleComponentChange(idx, 'monthly_amount', e.target.value)}
                          style={S.input}
                          required
                        />
                        <input
                          type="number"
                          placeholder="Yearly (₹)"
                          value={item.yearly_amount || ''}
                          onChange={e => handleComponentChange(idx, 'yearly_amount', e.target.value)}
                          style={S.input}
                        />
                        <button type="button" onClick={() => handleRemoveComponent(idx)} style={{ ...S.btn('danger'), padding: '10px' }}>
                          <FiTrash2 />
                        </button>
                      </div>
                    ))}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', fontSize: '13px', fontWeight: '600', color: THEME.primary }}>
                      Total Components sum: ₹{componentsSum.toLocaleString()}/mo 
                      {componentsSum !== structure.gross_salary && (
                        <span style={{ color: THEME.amber, marginLeft: '10px' }}> (Does not match Gross salary)</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px', borderTop: `1px solid ${THEME.border}`, paddingTop: '16px' }}>
                <button type="submit" disabled={structureSaving} style={S.btn('primary')}>
                  {structureSaving ? 'Saving...' : 'Save Salary Breakup'}
                </button>
              </div>
            </form>
          )}

          {/* History */}
          <div style={S.card}>
            <div style={S.title}>Structure History</div>
            {structureHistory.length === 0 ? (
              <div style={{ fontSize: '13px', color: THEME.muted }}>No revision history available.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Effective From</th>
                      <th style={S.th}>Effective To</th>
                      <th style={S.th}>Gross Salary</th>
                      <th style={S.th}>Salary Type</th>
                      <th style={S.th}>Components count</th>
                      <th style={S.th}>Status</th>
                      <th style={S.th}>Updated By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {structureHistory.map(h => (
                      <tr key={h._id}>
                        <td style={S.td}>{moment(h.effective_from).format('DD MMM YYYY')}</td>
                        <td style={S.td}>{h.effective_to ? moment(h.effective_to).format('DD MMM YYYY') : '-'}</td>
                        <td style={S.td}>₹{h.gross_salary?.toLocaleString()}</td>
                        <td style={S.td}>{h.salary_type}</td>
                        <td style={S.td}>{h.components?.length || 0}</td>
                        <td style={S.td}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: h.status === 'ACTIVE' ? '#ecfdf5' : '#f1f5f9',
                            color: h.status === 'ACTIVE' ? '#059669' : '#64748b'
                          }}>{h.status}</span>
                        </td>
                        <td style={S.td}>
                          {h.created_by ? `${h.created_by.first_name || ''} ${h.created_by.last_name || ''}`.trim() || h.created_by.username : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. MONTHLY PAYROLL RUN SUMMARY */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeSection === 'summary' && (
        <div>
          {/* Filter Bar */}
          <div style={{ ...S.card, padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: THEME.text }}>Month:</span>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                style={{ ...S.input, width: '130px', height: '34px' }}
              >
                {moment.months().map((m, i) => (
                  <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: THEME.text }}>Year:</span>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
                style={{ ...S.input, width: '100px', height: '34px' }}
              >
                {[moment().year(), moment().year() - 1, moment().year() - 2].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button onClick={fetchSummary} style={{ ...S.btn('ghost'), padding: '6px 12px' }}>
              <FiRefreshCw /> Refresh
            </button>

            <div style={{ marginLeft: 'auto' }}>
              {run ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: run.payroll_status === 'LOCKED' ? '#fee2e2' : '#e0f2fe',
                    color: run.payroll_status === 'LOCKED' ? '#ef4444' : '#0284c7'
                  }}>
                    Status: {run.payroll_status}
                  </span>

                  <button
                    onClick={handleLockUnlock}
                    disabled={locking}
                    style={{ ...S.btn(run.payroll_status === 'LOCKED' ? 'ghost' : 'success'), padding: '6px 12px' }}
                  >
                    {run.payroll_status === 'LOCKED' ? <><FiUnlock /> Unlock Payroll</> : <><FiLock /> Lock Payroll</>}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGeneratePayroll}
                  disabled={generating || !companyId}
                  style={{ ...S.btn('primary'), padding: '6px 12px' }}
                >
                  <FiRefreshCw /> Generate Payroll
                </button>
              )}
            </div>
          </div>

          {summaryLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: THEME.muted }}>Loading employee summary data...</div>
          ) : !summary ? (
            <div style={{ ...S.card, textAlign: 'center', padding: '40px', color: THEME.muted }}>
              <FiFileText size={40} style={{ marginBottom: '12px' }} />
              <div>No payroll data found for this employee in {moment(`${selectedYear}-${selectedMonth}-01`).format('MMMM YYYY')}.</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Click "Generate Payroll" above to run calculation for the company.</div>
            </div>
          ) : (
            <div>
              {/* Dashboard Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                
                {/* Attendance Aggregation */}
                <div style={S.card}>
                  <div style={S.title}>Attendance Summary</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                    <div>Total Month Days:</div><strong style={{ textAlign: 'right' }}>{summary.total_days_in_month} days</strong>
                    <div>Present Days:</div><strong style={{ color: THEME.green, textAlign: 'right' }}>{summary.present_days} days</strong>
                    <div>Half Days:</div><strong style={{ color: THEME.amber, textAlign: 'right' }}>{summary.half_days} days</strong>
                    <div>Absent Days:</div><strong style={{ color: THEME.red, textAlign: 'right' }}>{summary.absent_days} days</strong>
                    <div>Paid Leaves:</div><strong style={{ color: THEME.indigo, textAlign: 'right' }}>{summary.leave_days} days</strong>
                    <div>Weekly Offs:</div><strong style={{ textAlign: 'right' }}>{summary.weekly_off_days} days</strong>
                    <div>Holidays:</div><strong style={{ textAlign: 'right' }}>{summary.holiday_days} days</strong>
                    <div style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: '8px', fontWeight: '700' }}>Payable Days:</div>
                    <strong style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: '8px', fontWeight: '700', textAlign: 'right' }}>
                      {summary.payable_days} days
                    </strong>
                  </div>
                </div>

                {/* Hours Aggregation */}
                <div style={S.card}>
                  <div style={S.title}>Work Hours Summary</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                    <div>Regular Work Hours:</div><strong style={{ textAlign: 'right' }}>{summary.total_regular_hours} hrs</strong>
                    <div>Overtime (OT) Hours:</div><strong style={{ color: THEME.green, textAlign: 'right' }}>{summary.total_overtime_hours} hrs</strong>
                    <div style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: '8px' }}>Total Shifts:</div>
                    <strong style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: '8px', color: THEME.indigo, textAlign: 'right' }}>
                      {summary.total_shift_count} shifts
                    </strong>
                  </div>
                  <div style={{ fontSize: '11px', color: THEME.muted, marginTop: '20px', borderTop: `1px solid ${THEME.border}`, paddingTop: '8px' }}>
                    * Shift count is derived from daily work hours and shift rules (not hard-persisted).
                  </div>
                </div>

                {/* Pay Summary Card */}
                <div style={{ ...S.card, background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                  <div style={{ ...S.title, color: '#166534', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                       Payslip Summary
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowFormulaModal(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#166534',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        transition: 'background 0.2s'
                      }}
                      title="View Calculation Formula"
                      onMouseOver={e => e.currentTarget.style.background = '#dcfce7'}
                      onMouseOut={e => e.currentTarget.style.background = 'none'}
                    >
                      <FiInfo size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                    <div>Basic Amount:</div><strong style={{ textAlign: 'right' }}>₹{summary.basic_amount?.toLocaleString()}</strong>
                    <div>OT Amount:</div><strong style={{ color: THEME.green, textAlign: 'right' }}>+ ₹{summary.overtime_amount?.toLocaleString()}</strong>
                    <div style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: '8px', fontWeight: '700' }}>Gross Amount:</div>
                    <strong style={{ borderTop: `1px solid ${THEME.border}`, paddingTop: '8px', fontWeight: '700', textAlign: 'right' }}>
                      ₹{summary.gross_amount?.toLocaleString()}
                    </strong>
                    <div>Deductions:</div><strong style={{ color: THEME.red, textAlign: 'right' }}>- ₹{summary.deduction_amount?.toLocaleString()}</strong>
                    <div style={{ borderTop: `2px double #bbf7d0`, paddingTop: '8px', fontWeight: '800', fontSize: '15px', color: '#166534' }}>Net Payable:</div>
                    <strong style={{ borderTop: `2px double #bbf7d0`, paddingTop: '8px', fontWeight: '800', fontSize: '15px', color: '#166534', textAlign: 'right' }}>
                      ₹{summary.net_payable_amount?.toLocaleString()}
                    </strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#15803d', marginTop: '16px', borderTop: '1px solid #bbf7d0', paddingTop: '8px' }}>
                    Config Snapshot: {summary.is_operator ? 'Operator' : 'Management'} · {summary.payroll_type}
                    {summary.payroll_type === 'DAILY_WAGE' ? ` · Wage: ₹${summary.daily_wage_snapshot}/d` : ` · Sal: ₹${summary.monthly_salary_snapshot}/m`}
                  </div>
                </div>

              </div>

              {/* Status footer */}
              <div style={{ fontSize: '11px', color: THEME.muted, textAlign: 'right' }}>
                Summary Generated at: {moment(summary.createdAt).format('DD MMM YYYY HH:mm')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Salary Formula Modal Dialog */}
      {showFormulaModal && summary && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            border: `1px solid ${THEME.border}`,
            padding: '28px',
            width: '100%',
            maxWidth: '550px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            boxSizing: 'border-box',
            position: 'relative'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700', color: THEME.primary, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiInfo style={{ color: THEME.indigo }} /> Salary Calculation Formula
            </h3>
            
            <div style={{ fontSize: '13px', color: THEME.text, lineHeight: '1.6' }}>
              {summary.payroll_type === 'DAILY_WAGE' ? (
                <div>
                  <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '6px', borderLeft: `4px solid ${THEME.indigo}` }}>
                    <strong>Category:</strong> Operator (Daily Wage)<br />
                    <strong>Daily Wage Rate:</strong> ₹{summary.daily_wage_snapshot || 0}<br />
                    <strong>Payable Days:</strong> {summary.payable_days} days
                  </div>

                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>1. Basic Pay Formula:</h4>
                  <div style={{ background: '#f1f5f9', padding: '10px 12px', borderRadius: '6px', fontFamily: 'monospace', marginBottom: '8px' }}>
                    Basic Pay = Payable Days × Daily Wage
                  </div>
                  <div style={{ marginBottom: '16px', color: THEME.muted }}>
                    Calculation: {summary.payable_days} × ₹{summary.daily_wage_snapshot || 0} = <strong>₹{summary.basic_amount?.toLocaleString()}</strong>
                  </div>

                  {summary.total_overtime_hours > 0 && (
                    <>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>2. Overtime (OT) Pay Formula:</h4>
                      <div style={{ background: '#f1f5f9', padding: '10px 12px', borderRadius: '6px', fontFamily: 'monospace', marginBottom: '8px' }}>
                        OT Pay = Total OT Hours × OT Hourly Rate
                      </div>
                      <div style={{ marginBottom: '16px', color: THEME.muted }}>
                        Calculation: {summary.total_overtime_hours} hrs × ₹{summary.ot_rate_snapshot || 0}/hr = <strong>₹{summary.overtime_amount?.toLocaleString()}</strong>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '6px', borderLeft: `4px solid ${THEME.indigo}` }}>
                    <strong>Category:</strong> Management (Monthly Salary)<br />
                    <strong>Monthly Base Salary:</strong> ₹{summary.monthly_salary_snapshot || 0}<br />
                    <strong>Days in Month:</strong> {summary.total_days_in_month} days<br />
                    <strong>Payable Days:</strong> {summary.payable_days} days
                  </div>

                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>1. Basic Pay Formula:</h4>
                  <div style={{ background: '#f1f5f9', padding: '10px 12px', borderRadius: '6px', fontFamily: 'monospace', marginBottom: '8px' }}>
                    Basic Pay = (Payable Days / Days in Month) × Monthly Salary
                  </div>
                  <div style={{ marginBottom: '16px', color: THEME.muted }}>
                    Calculation: ({summary.payable_days} / {summary.total_days_in_month}) × ₹{summary.monthly_salary_snapshot || 0} = <strong>₹{summary.basic_amount?.toLocaleString()}</strong>
                  </div>

                  {summary.total_overtime_hours > 0 && (
                    <>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>2. Overtime (OT) Pay Formula:</h4>
                      <div style={{ background: '#f1f5f9', padding: '10px 12px', borderRadius: '6px', fontFamily: 'monospace', marginBottom: '8px' }}>
                        OT Pay = Total OT Hours × OT Hourly Rate
                      </div>
                      <div style={{ marginBottom: '16px', color: THEME.muted }}>
                        Calculation: {summary.total_overtime_hours} hrs × ₹{summary.ot_rate_snapshot || 0}/hr = <strong>₹{summary.overtime_amount?.toLocaleString()}</strong>
                      </div>
                    </>
                  )}
                </div>
              )}

              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', borderTop: `1px solid ${THEME.border}`, paddingTop: '12px' }}>3. Net Payable Formula:</h4>
              <div style={{ background: '#f0fdf4', padding: '10px 12px', borderRadius: '6px', fontFamily: 'monospace', marginBottom: '8px', color: '#166534', border: '1px solid #bbf7d0' }}>
                Net Payable = Basic Pay + OT Pay - Deductions
              </div>
              <div style={{ marginBottom: '20px', color: '#166534' }}>
                Calculation: ₹{summary.basic_amount?.toLocaleString()} + ₹{summary.overtime_amount?.toLocaleString()} - ₹{summary.deduction_amount?.toLocaleString()} = <strong>₹{summary.net_payable_amount?.toLocaleString()}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                style={S.btn('primary')}
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

export default PayrollTab;
