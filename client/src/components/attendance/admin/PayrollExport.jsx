import { useContext } from 'react';
import { UserContext } from '../../../contexts/UserContext';
import React, { useState, useEffect, useCallback } from 'react';
import attendanceAPI from '../../../api/attendance/attendance.api';
import toast from 'react-hot-toast';
import { FiDownload, FiInfo, FiAlertTriangle, FiCheckCircle, FiFileText, FiArrowLeft, FiUsers } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import moment from 'moment';
import './PayrollExport.css';

const PayrollExport = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [payrollData, setPayrollData] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [year, month] = selectedMonth.split('-');
      const response = await attendanceAPI.getPayrollData(month, year);
      if (response.success) {
        setPayrollData(response.data);
      }
    } catch (err) {
      toast.error('Failed to fetch payroll data');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportExcel = () => {
    if (payrollData.length === 0) return;

    const exportData = payrollData.map(emp => {
      return {
        'Employee Code': emp.code,
        'Name': emp.name,
        'Department': emp.department,
        'Effective Working Days': emp.stats.totalWorkingDays,
        'Present': emp.stats.present,
        'Paid Leave': emp.stats.paidLeave || 0,
        'Unpaid Leave (LOP)': emp.stats.unpaidLeave || 0,
        'Half Day': emp.stats.halfDay,
        'LOP Days': emp.stats.lopDays,
        'Payable Days': emp.stats.payableDays,
        'Total Work Hours': emp.stats.workHours,
        'Overtime Hours': emp.stats.overtimeHours
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll");
    XLSX.writeFile(workbook, `Payroll_Report_${selectedMonth}.xlsx`);
    toast.success('Excel report generated successfully');
  };

  const handleExportCSV = () => {
    if (payrollData.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(payrollData.map(emp => ({
      'Code': emp.code,
      'Name': emp.name,
      'Dept': emp.department,
      'Working Days': emp.stats.totalWorkingDays,
      'Present': emp.stats.present,
      'Paid Leave': emp.stats.paidLeave || 0,
      'Unpaid Leave': emp.stats.unpaidLeave || 0,
      'Half Day': emp.stats.halfDay,
      'LOP Days': emp.stats.lopDays,
      'Payable Days': emp.stats.payableDays,
      'Work Hours': emp.stats.workHours,
      'Overtime Hours': emp.stats.overtimeHours
    })));
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payroll_${selectedMonth}.csv`;
    a.click();
    toast.success('CSV report generated successfully');
  };

  const totalStats = payrollData.reduce((acc, curr) => {
    acc.totalPayable += curr.stats?.payableDays || 0;
    acc.totalLop += curr.stats?.lopDays || 0;
    return acc;
  }, { totalPayable: 0, totalLop: 0 });

  const warningsCount = payrollData.reduce((acc, curr) => acc + (curr.warnings?.length || 0), 0);

  return (
    <div className="settings-container" style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      <div className="settings-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="settings-header-content">
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Advanced Payroll Console</h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Transparent attendance metrics, LOP tracking, and audit-ready exports for RABS.</p>
        </div>
        <div className="settings-header-actions">
          <button className="p-btn-outline" onClick={() => navigate('/attendance/dashboard')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <FiArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="payroll-export-container">
        <div className="p-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', background: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>RABS Attendance Metrics</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>Select period to fetch aggregate employee attendance data contract.</p>
          </div>
          <div className="p-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="month"
              className="p-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ width: '160px', height: '38px', padding: '0 12px', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none' }}
            />
            <button className="p-btn-outline" onClick={handleExportCSV} disabled={loading || !payrollData.length}>
              <FiDownload /> Export CSV
            </button>
            <button className="p-btn-primary" onClick={handleExportExcel} disabled={loading || !payrollData.length} style={{ background: '#4f46e5', color: '#fff' }}>
              <FiDownload /> Export Excel
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="p-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="p-stat-card">
            <div className="p-stat-icon blue">
              <FiUsers />
            </div>
            <div>
              <div className="p-stat-value">{payrollData.length}</div>
              <div className="p-stat-label">Total Employees</div>
            </div>
          </div>

          <div className="p-stat-card">
            <div className="p-stat-icon green">
              <FiCheckCircle />
            </div>
            <div>
              <div className="p-stat-value">{totalStats.totalPayable.toFixed(1)}</div>
              <div className="p-stat-label">Total Payable Days</div>
            </div>
          </div>

          <div className="p-stat-card">
            <div className="p-stat-icon rose">
              <FiAlertTriangle />
            </div>
            <div>
              <div className="p-stat-value">{totalStats.totalLop.toFixed(1)}</div>
              <div className="p-stat-label">Total LOP Days</div>
            </div>
          </div>

          <div className="p-stat-card">
            <div className="p-stat-icon amber">
              <FiInfo />
            </div>
            <div>
              <div className="p-stat-value">{warningsCount}</div>
              <div className="p-stat-label">Validation Warnings</div>
            </div>
          </div>
        </div>

        {/* Warnings Banner */}
        {warningsCount > 0 && (
          <div className="validation-banner" style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px 20px', display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '24px', color: '#92400e', fontSize: '13px' }}>
            <FiAlertTriangle className="warn-icon" size={20} style={{ color: '#d97706', flexShrink: 0 }} />
            <div>
              <strong>Attendance Alerts Detected:</strong> There are {warningsCount} validation warnings across the active workforce for this period. Please review warnings inside the grid before exporting.
            </div>
          </div>
        )}

        {/* Data Grid Table */}
        <div className="p-table-container">
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div className="spinner" style={{ margin: '0 auto 12px auto', width: '24px', height: '24px', border: '3px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <span style={{ fontSize: '13px', fontWeight: '500' }}>Collecting payroll integration records...</span>
            </div>
          ) : payrollData.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <FiFileText size={32} style={{ color: '#94a3b8', marginBottom: '12px' }} />
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>No records found</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>There are no active RABS employees found for the period of {moment(selectedMonth).format('MMMM YYYY')}.</div>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table className="p-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th style={{ textAlign: 'center' }}>Working Days</th>
                    <th style={{ textAlign: 'center' }}>Present</th>
                    <th style={{ textAlign: 'center' }}>Paid Leave</th>
                    <th style={{ textAlign: 'center' }}>Unpaid Leave</th>
                    <th style={{ textAlign: 'center' }}>Half Day</th>
                    <th style={{ textAlign: 'center' }}>LOP Days</th>
                    <th style={{ textAlign: 'center' }}>Payable Days</th>
                    <th style={{ textAlign: 'center' }}>OT Hours</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollData.map((emp) => {
                    const hasWarnings = emp.warnings && emp.warnings.length > 0;
                    return (
                      <tr key={emp.id} className={hasWarnings ? 'row-warn' : ''}>
                        <td>
                          <div className="emp-name-cell">
                            <span>{emp.name}</span>
                            <span className="emp-dept-badge">{emp.code} · {emp.department}</span>
                          </div>
                        </td>
                        <td className="font-mono" style={{ textAlign: 'center' }}>{emp.stats?.totalWorkingDays ?? 0}</td>
                        <td className="font-mono" style={{ textAlign: 'center' }}>{emp.stats?.present ?? 0}</td>
                        <td className="font-mono text-success" style={{ textAlign: 'center' }}>{emp.stats?.paidLeave ?? 0}</td>
                        <td className="font-mono text-rose" style={{ textAlign: 'center' }}>{emp.stats?.unpaidLeave ?? 0}</td>
                        <td className="font-mono" style={{ textAlign: 'center' }}>{emp.stats?.halfDay ?? 0}</td>
                        <td className="font-mono" style={{ textAlign: 'center' }}>
                          {(emp.stats?.lopDays || 0) > 0 ? (
                            <span className="lop-badge">{emp.stats.lopDays} d</span>
                          ) : (
                            '0'
                          )}
                        </td>
                        <td className="font-mono" style={{ textAlign: 'center', fontWeight: '700', color: '#0f172a' }}>{emp.stats?.payableDays ?? 0}</td>
                        <td className="font-mono" style={{ textAlign: 'center' }}>{emp.stats?.overtimeHours ?? 0}</td>
                        <td style={{ textAlign: 'center' }}>
                          {hasWarnings ? (
                            <div className="tooltip-container">
                              <FiAlertTriangle className="icon-warn-trigger" size={16} />
                              <div className="tooltip-content">
                                {emp.warnings.map((w, idx) => (
                                  <div key={idx} style={{ marginBottom: '4px' }}>• {w}</div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-success" style={{ fontSize: '15px', fontWeight: 'bold' }}>✓</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PayrollExport;
