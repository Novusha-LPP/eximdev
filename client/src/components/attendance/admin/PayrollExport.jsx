import { useContext } from 'react';
import { UserContext } from '../../../contexts/UserContext';
import React, { useState, useEffect } from 'react';
import attendanceAPI from '../../../api/attendance/attendance.api';
import toast from 'react-hot-toast';
import { FiDownload, FiInfo, FiAlertTriangle, FiCheckCircle, FiLock, FiUnlock, FiFileText, FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import './PayrollExport.css';

const PayrollExport = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const isAdmin = user?.role === 'ADMIN';
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [payrollData, setPayrollData] = useState([]);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [year, month] = selectedMonth.split('-');
      const response = await attendanceAPI.getPayrollData(month, year);
      if (response.success) {
        setPayrollData(response.data);
        setIsLocked(response.isLocked);
      }
    } catch (err) {
      toast.error('Failed to fetch payroll data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (payrollData.length === 0) return;

    const exportData = payrollData.map(emp => {
      const base = {
        'Employee Code': emp.code,
        'Name': emp.name,
        'Department': emp.department,
        'Effective Working Days': emp.stats.totalWorkingDays,
        'Present': emp.stats.present,
        'Leave': emp.stats.leave,
        'Half Day': emp.stats.halfDay,
        'LOP Days': emp.stats.lopDays,
        'Payable Days': emp.stats.payableDays,
        'Total Work Hours': emp.stats.workHours
      };

      if (isAdmin && emp.salary) {
        base['Base Salary'] = emp.salary.monthlyBase;
        base['LOP Deduction'] = emp.salary.lopDeduction;
        base['Overtime Pay'] = emp.salary.overtimePay;
        base['Final Salary'] = emp.salary.final;
      }

      return base;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll");
    XLSX.writeFile(workbook, `Payroll_Report_${selectedMonth}.xlsx`);
    toast.success('Excel report generated successfully');
  };

  const handleExportCSV = () => {
    const worksheet = XLSX.utils.json_to_sheet(payrollData.map(emp => ({
      'Code': emp.code,
      'Name': emp.name,
      'Dept': emp.department,
      'WorkingDays': emp.stats.totalWorkingDays,
      'PayableDays': emp.stats.payableDays,
      'LOP': emp.stats.lopDays,
      ...(isAdmin ? { 'FinalSalary': emp.salary?.final } : {})
    })));
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payroll_${selectedMonth}.csv`;
    a.click();
  };

  const totalStats = payrollData.reduce((acc, curr) => {
    acc.totalPayable += curr.stats.payableDays;
    acc.totalLop += curr.stats.lopDays;
    return acc;
  }, { totalPayable: 0, totalLop: 0 });

  const warningsCount = payrollData.reduce((acc, curr) => acc + (curr.warnings?.length || 0), 0);

  return (
    <div className="settings-container">
      <div className="settings-header">
        <div className="settings-header-content">
          <h2>Advanced Payroll Console</h2>
          <p>Transparent salary calculations, LOP tracking, and audit-ready exports.</p>
        </div>
        <div className="settings-header-actions">
          <button className="btn btn-outline" onClick={() => navigate('/admin-dashboard')}>
            <FiArrowLeft size={18} />
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="payroll-export-container">
        <div className="coming-soon-wrapper">
          <div className="coming-soon-content">
            <FiFileText size={64} className="coming-soon-icon" />
            <h1>Payroll Module Coming Soon</h1>
            <p>Our engineering team is working hard to bring you a comprehensive payroll management system. Stay tuned for updates!</p>
            <div className="coming-soon-badge">Estimated Release: Q2 2026</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollExport;



