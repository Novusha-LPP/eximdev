import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../../contexts/UserContext';
import payrollAPI from '../../../api/attendance/payroll.api';
import toast from 'react-hot-toast';
import moment from 'moment';
import * as XLSX from 'xlsx';
import {
  FiArrowLeft, FiDownload, FiFileText, FiRefreshCw,
  FiActivity, FiGrid, FiShield, FiPercent, FiPrinter
} from 'react-icons/fi';
import './PayrollPages.css';

const PayrollReports = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [selectedMonth, setSelectedMonth] = useState(moment().format('MM'));
  const [activeTab, setActiveTab] = useState('register'); // 'register', 'pf', 'esi', 'pt', 'department'
  
  const [reportData, setReportData] = useState([]);

  const companyId = user?.company_id?._id || user?.company_id;

  const fetchReport = useCallback(async () => {
    if (!companyId) {
      if (user) setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let res;
      if (activeTab === 'register') {
        res = await payrollAPI.getSalaryRegister(companyId, selectedYear, selectedMonth);
      } else if (activeTab === 'pf') {
        res = await payrollAPI.getPFReport(companyId, selectedYear, selectedMonth);
      } else if (activeTab === 'esi') {
        res = await payrollAPI.getESIReport(companyId, selectedYear, selectedMonth);
      } else if (activeTab === 'pt') {
        res = await payrollAPI.getPTReport(companyId, selectedYear, selectedMonth);
      } else if (activeTab === 'department') {
        res = await payrollAPI.getDepartmentReport(companyId, selectedYear, selectedMonth);
      }

      if (res && res.success) {
        setReportData(res.data || []);
      } else {
        setReportData([]);
      }
    } catch (err) {
      console.error('Fetch report error:', err);
      toast.error('Failed to load report data');
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedYear, selectedMonth, activeTab]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportExcel = () => {
    if (reportData.length === 0) {
      toast.error('No data to export');
      return;
    }

    let exportRows = [];
    let filename = `Payroll_${activeTab}_${selectedMonth}_${selectedYear}.xlsx`;

    if (activeTab === 'register') {
      exportRows = reportData.map(r => {
        // Collect all earnings breakups into dynamic columns if present
        const row = {
          'Employee Code': r.employee_id?.employee_code || '',
          'Employee Name': `${r.employee_id?.first_name || ''} ${r.employee_id?.last_name || ''}`.trim(),
          'Department': r.employee_id?.department || '',
          'Designation': r.employee_id?.designation || '',
          'Present Days': r.present_days,
          'Payable Days': r.payable_days,
          'Gross Amount': r.gross_amount,
          'PF (EE)': r.pf_employee,
          'ESI': r.esi_employee,
          'PT': r.professional_tax,
          'Other Deductions': r.other_deductions,
          'Total Deductions': r.deduction_amount,
          'Adjustments': r.adjustment_amount,
          'Net Payable': r.net_payable_amount
        };

        // Add dynamically calculated earnings components
        (r.earnings_breakup || []).forEach(e => {
          row[`Earning - ${e.payhead}`] = e.amount;
        });

        return row;
      });
    } else if (activeTab === 'pf') {
      exportRows = reportData.map(r => ({
        'Employee Code': r.employee_id?.employee_code || '',
        'Employee Name': `${r.employee_id?.first_name || ''} ${r.employee_id?.last_name || ''}`.trim(),
        'PF Account No': r.pf_no || '',
        'UAN': r.uan_number || '',
        'Basic Wages': r.basic_amount || 0,
        'Gross Wages': r.gross_amount || 0,
        'Employee PF Share (12%)': r.pf_employee || 0,
        'Employer PF Share (12%)': r.pf_employer || 0,
        'Total PF Contribution': (r.pf_employee || 0) + (r.pf_employer || 0)
      }));
    } else if (activeTab === 'esi') {
      exportRows = reportData.map(r => ({
        'Employee Code': r.employee_id?.employee_code || '',
        'Employee Name': `${r.employee_id?.first_name || ''} ${r.employee_id?.last_name || ''}`.trim(),
        'ESI Number': r.esic_no || '',
        'Gross Wages': r.gross_amount || 0,
        'Employee Share (0.75%)': r.esi_employee || 0,
        'Employer Share (3.25%)': r.esi_employer || 0,
        'Total ESI Contribution': (r.esi_employee || 0) + (r.esi_employer || 0)
      }));
    } else if (activeTab === 'pt') {
      exportRows = reportData.map(r => ({
        'Employee Code': r.employee_id?.employee_code || '',
        'Employee Name': `${r.employee_id?.first_name || ''} ${r.employee_id?.last_name || ''}`.trim(),
        'Gross Salary': r.gross_amount || 0,
        'PT Deducted': r.professional_tax || 0
      }));
    } else if (activeTab === 'department') {
      exportRows = reportData.map(r => ({
        'Department': r.department,
        'Headcount': r.count,
        'Gross Salary': r.totalGross,
        'Net Payable': r.totalNet,
        'PF Cost': r.totalPF,
        'ESI Cost': r.totalESI,
        'PT Deduction': r.totalPT,
        'Total Deductions': r.totalDeductions
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, filename);
    toast.success('Report exported to Excel successfully!');
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (v) => {
    return '₹' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="payroll-page">
      {/* Print View Header Override */}
      <style>{`
        @media print {
          body {
            background: #fff !important;
          }
          .payroll-page__header,
          .payroll-filter-bar,
          .payroll-tabs,
          .payroll-page__back-btn,
          .payroll-action-btn,
          button {
            display: none !important;
          }
          .payroll-card {
            border: none !important;
            box-shadow: none !important;
          }
          .payroll-data-table th {
            background: #eee !important;
            color: #000 !important;
            border-bottom: 2px solid #000 !important;
          }
          .payroll-data-table td {
            border-bottom: 1px solid #ddd !important;
          }
          .print-header-show {
            display: block !important;
            margin-bottom: 20px;
          }
        }
        .print-header-show {
          display: none;
        }
      `}</style>

      {/* Header */}
      <div className="payroll-page__header">
        <div>
          <button className="payroll-page__back-btn" onClick={() => navigate('/attendance/admin/payroll-dashboard')}>
            <FiArrowLeft /> Back to Dashboard
          </button>
          <h1 style={{ marginTop: '12px' }}>Payroll Reports Hub</h1>
          <p>Generate, print, and export statutory register and department payroll summaries</p>
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
        <button className="payroll-action-btn ghost" onClick={fetchReport}>
          <FiRefreshCw /> Reload
        </button>
        <div className="payroll-filter-bar__spacer" />
        <button className="payroll-action-btn ghost" onClick={handlePrint} disabled={reportData.length === 0}>
          <FiPrinter /> Print Report
        </button>
        <button className="payroll-action-btn success" onClick={handleExportExcel} disabled={reportData.length === 0}>
          <FiDownload /> Export to Excel
        </button>
      </div>

      {/* Tabs */}
      <div className="payroll-tabs">
        <button className={`payroll-tab ${activeTab === 'register' ? 'active' : ''}`} onClick={() => setActiveTab('register')}>
          <FiFileText /> Salary Register
        </button>
        <button className={`payroll-tab ${activeTab === 'pf' ? 'active' : ''}`} onClick={() => setActiveTab('pf')}>
          <FiShield /> PF Report
        </button>
        <button className={`payroll-tab ${activeTab === 'esi' ? 'active' : ''}`} onClick={() => setActiveTab('esi')}>
          <FiActivity /> ESI Report
        </button>
        <button className={`payroll-tab ${activeTab === 'pt' ? 'active' : ''}`} onClick={() => setActiveTab('pt')}>
          <FiPercent /> PT Report
        </button>
        <button className={`payroll-tab ${activeTab === 'department' ? 'active' : ''}`} onClick={() => setActiveTab('department')}>
          <FiGrid /> Department Summary
        </button>
      </div>

      {/* Print-only title */}
      <div className="print-header-show">
        <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0' }}>
          {activeTab.toUpperCase()} REPORT
        </h1>
        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
          Month/Year: {moment(`${selectedYear}-${selectedMonth}-01`).format('MMMM YYYY')}
        </p>
      </div>

      {/* Data Container */}
      <div className="payroll-card">
        <div className="payroll-card__body" style={{ padding: 0 }}>
          {loading ? (
            <div className="payroll-loading" style={{ padding: '40px' }}>
              <div className="payroll-loading__spinner" />
              <span>Generating report data...</span>
            </div>
          ) : reportData.length === 0 ? (
            <div className="payroll-empty" style={{ padding: '60px' }}>
              <div className="payroll-empty__icon">📊</div>
              <div className="payroll-empty__title">No Report Data Found</div>
              <div className="payroll-empty__desc">
                There are no payroll records generated for the selected month.
              </div>
            </div>
          ) : (
            <div className="payroll-table-scroll">
              {/* SALARY REGISTER TABLE */}
              {activeTab === 'register' && (
                <table className="payroll-data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Dept</th>
                      <th className="text-center">Days</th>
                      <th className="text-right">Gross Salary</th>
                      <th className="text-right">PF (EE)</th>
                      <th className="text-right">ESI</th>
                      <th className="text-right">PT</th>
                      <th className="text-right">Other Deduct</th>
                      <th className="text-right">Adjustments</th>
                      <th className="text-right">Net Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map(r => (
                      <tr key={r._id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.employee_id?.first_name} {r.employee_id?.last_name}</div>
                          <div style={{ fontSize: '10px', color: '#94a3b8' }}>{r.employee_id?.employee_code || 'No Code'}</div>
                        </td>
                        <td>{r.employee_id?.department || 'Staff'}</td>
                        <td className="text-center font-mono">{r.payable_days}/{r.total_days_in_month}</td>
                        <td className="text-right font-mono">{formatCurrency(r.gross_amount)}</td>
                        <td className="text-right font-mono">{formatCurrency(r.pf_employee)}</td>
                        <td className="text-right font-mono">{formatCurrency(r.esi_employee)}</td>
                        <td className="text-right font-mono">{formatCurrency(r.professional_tax)}</td>
                        <td className="text-right font-mono">{formatCurrency(r.other_deductions)}</td>
                        <td className="text-right font-mono" style={{ color: r.adjustment_amount >= 0 ? '#10b981' : '#ef4444' }}>
                          {r.adjustment_amount >= 0 ? '+' : ''}{formatCurrency(r.adjustment_amount)}
                        </td>
                        <td className="text-right font-mono" style={{ fontWeight: 'bold' }}>{formatCurrency(r.net_payable_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* PF REPORT TABLE */}
              {activeTab === 'pf' && (
                <table className="payroll-data-table">
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>PF Account No</th>
                      <th>UAN</th>
                      <th className="text-right">Basic Wages</th>
                      <th className="text-right">Gross Wages</th>
                      <th className="text-right">Employee Share (12%)</th>
                      <th className="text-right">Employer Share (12%)</th>
                      <th className="text-right">Total PF Contribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map(r => (
                      <tr key={r._id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.employee_id?.first_name} {r.employee_id?.last_name}</div>
                          <div style={{ fontSize: '10px', color: '#94a3b8' }}>{r.employee_id?.employee_code || 'No Code'}</div>
                        </td>
                        <td className="font-mono">{r.pf_no || '—'}</td>
                        <td className="font-mono">{r.uan_number || '—'}</td>
                        <td className="text-right font-mono">{formatCurrency(r.basic_amount)}</td>
                        <td className="text-right font-mono">{formatCurrency(r.gross_amount)}</td>
                        <td className="text-right font-mono">{formatCurrency(r.pf_employee)}</td>
                        <td className="text-right font-mono">{formatCurrency(r.pf_employer)}</td>
                        <td className="text-right font-mono" style={{ fontWeight: 600 }}>
                          {formatCurrency((r.pf_employee || 0) + (r.pf_employer || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* ESI REPORT TABLE */}
              {activeTab === 'esi' && (
                <table className="payroll-data-table">
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>ESI Number</th>
                      <th className="text-right">Gross Wages</th>
                      <th className="text-right">Employee Share (0.75%)</th>
                      <th className="text-right">Employer Share (3.25%)</th>
                      <th className="text-right">Total ESI Contribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map(r => (
                      <tr key={r._id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.employee_id?.first_name} {r.employee_id?.last_name}</div>
                          <div style={{ fontSize: '10px', color: '#94a3b8' }}>{r.employee_id?.employee_code || 'No Code'}</div>
                        </td>
                        <td className="font-mono">{r.esic_no || '—'}</td>
                        <td className="text-right font-mono">{formatCurrency(r.gross_amount)}</td>
                        <td className="text-right font-mono">{formatCurrency(r.esi_employee)}</td>
                        <td className="text-right font-mono">{formatCurrency(r.esi_employer)}</td>
                        <td className="text-right font-mono" style={{ fontWeight: 600 }}>
                          {formatCurrency((r.esi_employee || 0) + (r.esi_employer || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* PT REPORT TABLE */}
              {activeTab === 'pt' && (
                <table className="payroll-data-table">
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th className="text-right">Gross Wages</th>
                      <th className="text-right">Professional Tax (PT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map(r => (
                      <tr key={r._id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.employee_id?.first_name} {r.employee_id?.last_name}</div>
                          <div style={{ fontSize: '10px', color: '#94a3b8' }}>{r.employee_id?.employee_code || 'No Code'}</div>
                        </td>
                        <td className="text-right font-mono">{formatCurrency(r.gross_amount)}</td>
                        <td className="text-right font-mono" style={{ fontWeight: 600, color: '#ef4444' }}>
                          {formatCurrency(r.professional_tax)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* DEPARTMENT REPORT TABLE */}
              {activeTab === 'department' && (
                <table className="payroll-data-table">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th className="text-center">Headcount</th>
                      <th className="text-right">Gross Total</th>
                      <th className="text-right">PF Total Cost</th>
                      <th className="text-right">ESI Total Cost</th>
                      <th className="text-right">PT Total Deduction</th>
                      <th className="text-right">Net Payable Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map(r => (
                      <tr key={r.department}>
                        <td style={{ fontWeight: 600 }}>{r.department}</td>
                        <td className="text-center font-mono">{r.count}</td>
                        <td className="text-right font-mono">{formatCurrency(r.totalGross)}</td>
                        <td className="text-right font-mono">{formatCurrency(r.totalPF)}</td>
                        <td className="text-right font-mono">{formatCurrency(r.totalESI)}</td>
                        <td className="text-right font-mono">{formatCurrency(r.totalPT)}</td>
                        <td className="text-right font-mono" style={{ fontWeight: 700, color: '#10b981' }}>
                          {formatCurrency(r.totalNet)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayrollReports;
