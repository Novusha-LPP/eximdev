import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  FiUser, FiDollarSign, FiClock, FiLayers, FiFileText,
  FiTrendingUp, FiCreditCard, FiActivity, FiCalendar, FiCheck, FiDownload, FiX,
  FiChevronDown, FiAlertCircle, FiSettings, FiSliders
} from 'react-icons/fi';
import payrollAPI from '../../../api/attendance/payroll.api';
import masterAPI from '../../../api/attendance/master.api';
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
    border: `1.5px solid ${THEME.border}`,
    borderRadius: '16px',
    padding: '30px',
    boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04), 0 2px 8px -1px rgba(15, 23, 42, 0.02)',
    marginBottom: '28px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '800',
    color: THEME.primary,
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: `2.5px solid #f1f5f9`,
    paddingBottom: '14px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '24px',
    marginBottom: '8px'
  },
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '800',
    color: '#475569',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  radioGroup: {
    display: 'flex',
    gap: '16px',
    height: '40px',
    alignItems: 'center'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: THEME.text,
    fontWeight: '600',
    cursor: 'pointer'
  },
  btn: (variant = 'primary') => ({
    padding: '12px 24px',
    borderRadius: '10px',
    border: 'none',
    fontWeight: '750',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)',
    outline: 'none',
    ...(variant === 'primary' ? { background: 'linear-gradient(135deg, #4f46e5, #3730a3)', color: '#fff', boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)' } :
        variant === 'success' ? { background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)' } :
        variant === 'ghost' ? { background: 'transparent', color: THEME.text, border: `1.5px solid ${THEME.border}` } :
        { background: '#f1f5f9', color: THEME.text, border: `1.5px solid ${THEME.border}` })
  }),
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
    marginTop: '12px',
    border: `1.5px solid ${THEME.border}`,
    borderRadius: '10px',
    overflow: 'hidden'
  },
  th: {
    background: '#f8fafc',
    color: '#475569',
    fontWeight: '800',
    padding: '14px 16px',
    textAlign: 'left',
    borderBottom: `2.5px solid ${THEME.border}`,
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  td: {
    padding: '14px 16px',
    borderBottom: `1px solid ${THEME.border}`,
    color: THEME.text,
    background: '#ffffff'
  }
};

const stylesHtml = `
  .premium-input {
    width: 100%;
    height: 42px;
    padding: 0 14px;
    border-radius: 8px;
    border: 1.5px solid #cbd5e1;
    font-size: 13px;
    color: #1e293b;
    background: #fff;
    outline: none;
    box-sizing: border-box;
    transition: all 0.2s ease-in-out;
  }
  .premium-input:focus {
    border-color: #4f46e5 !important;
    box-shadow: 0 0 0 3.5px rgba(79, 70, 229, 0.15) !important;
  }
  .premium-input:disabled {
    background: #f8fafc;
    color: #94a3b8;
    border-color: #e2e8f0;
    cursor: not-allowed;
  }
  .premium-btn {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .premium-btn:hover:not(:disabled) {
    transform: translateY(-1.5px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08) !important;
  }
  .premium-btn:active:not(:disabled) {
    transform: translateY(0);
  }
  .premium-table tr {
    transition: background-color 0.15s ease;
  }
  .premium-table tr:hover {
    background-color: #f8fafc;
  }
  .bio-dropdown-item {
    transition: all 0.15s ease;
  }
  .bio-dropdown-item:hover {
    background-color: #eff6ff !important;
    padding-left: 16px !important;
  }
`;

// Premium macOS-style Segmented Toggle Switch for PF / ESIC Applicable
const SegmentedToggle = ({ value, onChange, label }) => {
  const isNotApplicable = !!value; // true means not applicable, false means applicable
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      {label && <span style={{ fontSize: '12px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#f1f5f9',
        padding: '3px',
        borderRadius: '24px',
        border: '1px solid #cbd5e1',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
        position: 'relative'
      }}>
        {/* Slide overlay background for active state */}
        <div style={{
          position: 'absolute',
          top: '3px',
          left: isNotApplicable ? 'calc(50% + 1px)' : '3px',
          width: 'calc(50% - 4px)',
          height: 'calc(100% - 6px)',
          borderRadius: '20px',
          background: isNotApplicable ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isNotApplicable 
            ? '0 4px 12px rgba(239,68,68,0.35)' 
            : '0 4px 12px rgba(16,185,129,0.35)',
          zIndex: 1
        }} />
        
        <button
          type="button"
          onClick={() => onChange(false)} // Applicable (pf_not_applicable: false)
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '6px 16px',
            borderRadius: '20px',
            border: 'none',
            fontSize: '11px',
            fontWeight: '800',
            cursor: 'pointer',
            background: 'transparent',
            color: !isNotApplicable ? '#fff' : '#64748b',
            zIndex: 2,
            transition: 'color 0.2s',
            outline: 'none',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}
        >
          <FiCheck size={13} />
          Applicable
        </button>
        
        <button
          type="button"
          onClick={() => onChange(true)} // Not Applicable (pf_not_applicable: true)
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '6px 16px',
            borderRadius: '20px',
            border: 'none',
            fontSize: '11px',
            fontWeight: '800',
            cursor: 'pointer',
            background: 'transparent',
            color: isNotApplicable ? '#fff' : '#64748b',
            zIndex: 2,
            transition: 'color 0.2s',
            outline: 'none',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}
        >
          <FiX size={13} />
          Not Applicable
        </button>
      </div>
    </div>
  );
};

// Beautiful SubCard with header separator
const SubCard = ({ title, children, icon: Icon, extraHeader }) => {
  return (
    <div style={{
      background: '#fff',
      border: '1.5px solid #e2e8f0',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px',
      boxShadow: '0 1px 3px 0 rgba(0,0,0,0.02)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        borderBottom: '1.5px solid #f1f5f9',
        paddingBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '800', color: THEME.indigo }}>
          {Icon && <Icon size={16} />}
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</span>
        </div>
        {extraHeader && <div>{extraHeader}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
};

// Segmented controller for GROSS vs CTC
const SegmentedSalaryType = ({ value, onChange }) => {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      background: '#f1f5f9',
      padding: '3px',
      borderRadius: '10px',
      border: '1px solid #cbd5e1',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
      position: 'relative',
      width: '100%'
    }}>
      <div style={{
        position: 'absolute',
        top: '3px',
        left: value === 'CTC' ? 'calc(50% + 1px)' : '3px',
        width: 'calc(50% - 4px)',
        height: 'calc(100% - 6px)',
        borderRadius: '7px',
        background: 'linear-gradient(135deg, #4f46e5, #3730a3)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
        zIndex: 1
      }} />
      
      <button
        type="button"
        onClick={() => onChange('GROSS')}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 16px',
          borderRadius: '7px',
          border: 'none',
          fontSize: '12px',
          fontWeight: '800',
          cursor: 'pointer',
          background: 'transparent',
          color: value === 'GROSS' ? '#fff' : '#64748b',
          zIndex: 2,
          transition: 'color 0.2s',
          outline: 'none',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
      >
        GROSS
      </button>
      
      <button
        type="button"
        onClick={() => onChange('CTC')}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 16px',
          borderRadius: '7px',
          border: 'none',
          fontSize: '12px',
          fontWeight: '800',
          cursor: 'pointer',
          background: 'transparent',
          color: value === 'CTC' ? '#fff' : '#64748b',
          zIndex: 2,
          transition: 'color 0.2s',
          outline: 'none',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
      >
        CTC
      </button>
    </div>
  );
};

const ProfileTab = ({ employeeId, companyId, employeeName }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // User Profile Form State
  const [profileForm, setProfileForm] = useState({
    // PF Details
    pf_no: '',
    pf_joining_date: '',
    pf_bank: '',
    pf_bank_ifsc_code: '',
    pf_bank_account_number: '',
    uan_number: '',
    pf_not_applicable: false,

    // ESIC Details
    esic_no: '',
    esic_joining_date: '',
    esic_end_month: '',
    esic_not_applicable: false,

    // Bank Details
    bank_name: '',
    ifsc_code: '',
    bank_account_no: '',
    name_on_bank: '',
    bank_account_status: 'Approved',

    // Attendance settings
    attendance_from: 'Biometric', // 'Mobile', 'Biometric', 'Mobile & Biometric'
    biometric_serial_no: [],
    biometric_code: '',

    // Salary calculation Act & policy
    salary_calculation_act: 'Shop Act', // 'Shop Act', 'Factory Act', 'On Working Days'
    payroll_frequency: 'Monthly',
    overtime_applicable: 'No', // 'Yes', 'No'
    enable_full_month_presence: 'No', // 'Yes', 'No'

    // Timeline
    retirement_age: 60,
    notice_period_days: 30,
    worker_type: 'Company Staff', // 'Company Staff', 'Contractor', 'Daily Wage'
    employment_type: 'Confirm',
    employment_applicable_date: '',
    employment_end_date: '',
    skill_category: 'Skilled',
    relieving_date: '',
    date_of_joining: '',
    dob: ''
  });

  // Salary Master States
  const [salaryBy, setSalaryBy] = useState('GROSS'); // 'GROSS', 'CTC'
  const [enteredAmount, setEnteredAmount] = useState(0);
  const [applicableFrom, setApplicableFrom] = useState(moment().format('YYYY-MM'));
  const [selectedGrade, setSelectedGrade] = useState('Without PF ESIC');
  const [salaryStructure, setSalaryStructure] = useState([]);
  const [savingSalary, setSavingSalary] = useState(false);

  // Biometric list dropdown visibility state
  const [showBioDropdown, setShowBioDropdown] = useState(false);

  // Lists for dropdown options
  const bankOptions = ['SBI', 'HDFC', 'ICICI', 'Axis Bank', 'PNB', 'BOB', 'Canara Bank', 'Union Bank'];
  const workerTypeOptions = ['Company Staff', 'Contractor', 'Daily Wage'];
  const employmentTypeOptions = ['Confirm', 'Probation', 'Contract', 'Trainee', 'Apprentice'];
  const skillCategoryOptions = ['Skilled', 'Semi-Skilled', 'Unskilled'];
  const biometricSerials = ['ZYSB01011069', 'JNP2244500561', 'JNP2244500538', 'JNP2244500599'];

  // Calculated retirement date
  const retirementDate = useMemo(() => {
    if (!profileForm.dob || !profileForm.retirement_age) return 'dd-mm-yyyy';
    const birthDate = moment(profileForm.dob);
    if (!birthDate.isValid()) return 'dd-mm-yyyy';
    return birthDate.add(profileForm.retirement_age, 'years').format('DD-MM-YYYY');
  }, [profileForm.dob, profileForm.retirement_age]);

  // Memoized payroll totals for visual breakdown summary box
  const totals = useMemo(() => {
    let gross = 0;
    let deductions = 0;
    let employerAdditions = 0;

    salaryStructure.forEach(item => {
      if (item.group === 'A') {
        gross += item.monthly_amount;
      } else if (item.group === 'B') {
        deductions += item.monthly_amount;
      } else if (item.group === 'C') {
        employerAdditions += item.monthly_amount;
      }
    });

    if (gross === 0 && enteredAmount > 0) {
      gross = enteredAmount;
    }

    const netSalary = gross - deductions;
    const ctc = gross + employerAdditions;

    return {
      gross,
      deductions,
      employerAdditions,
      netSalary,
      ctc
    };
  }, [salaryStructure, enteredAmount]);

  useEffect(() => {
    if (employeeId) {
      fetchEmployeeDetails();
    }
  }, [employeeId]);

  const fetchEmployeeDetails = async () => {
    setLoading(true);
    try {
      const res = await masterAPI.getUsers({ limit: 1, _id: employeeId });
      const user = res?.data?.[0];
      if (user) {
        let attFrom = 'Biometric';
        const pm = user.attendance_settings?.punch_methods || [];
        if (pm.includes('mobile') && pm.includes('biometric')) {
          attFrom = 'Mobile & Biometric';
        } else if (pm.includes('mobile')) {
          attFrom = 'Mobile';
        } else if (pm.includes('biometric')) {
          attFrom = 'Biometric';
        }

        setProfileForm({
          pf_no: user.pf_no || '',
          pf_joining_date: user.pf_joining_date ? moment(user.pf_joining_date).format('YYYY-MM-DD') : '',
          pf_bank: user.pf_bank || '',
          pf_bank_ifsc_code: user.pf_bank_ifsc_code || '',
          pf_bank_account_number: user.pf_bank_account_number || '',
          uan_number: user.uan_number || '',
          pf_not_applicable: user.pf_not_applicable || false,
          esic_no: user.esic_no || '',
          esic_joining_date: user.esic_joining_date ? moment(user.esic_joining_date).format('YYYY-MM-DD') : '',
          esic_end_month: user.esic_end_month ? moment(user.esic_end_month).format('YYYY-MM') : '',
          esic_not_applicable: user.esic_not_applicable || false,
          bank_name: user.bank_name || '',
          ifsc_code: user.ifsc_code || '',
          bank_account_no: user.bank_account_no || '',
          name_on_bank: user.name_on_bank || '',
          bank_account_status: user.bank_account_status || 'Approved',
          attendance_from: attFrom,
          biometric_serial_no: user.biometric_serial_no || [],
          biometric_code: user.biometric_code || '',
          salary_calculation_act: user.salary_calculation_act || 'Shop Act',
          payroll_frequency: user.payroll_frequency || 'Monthly',
          overtime_applicable: user.overtime_eligible || user.overtime_applicable ? 'Yes' : 'No',
          enable_full_month_presence: user.enable_full_month_presence ? 'Yes' : 'No',
          retirement_age: user.retirement_age || 60,
          notice_period_days: user.notice_period_days || 30,
          worker_type: user.worker_type || 'Company Staff',
          employment_type: user.employment_type || 'Confirm',
          employment_applicable_date: user.employment_applicable_date ? moment(user.employment_applicable_date).format('YYYY-MM-DD') : '',
          employment_end_date: user.employment_end_date ? moment(user.employment_end_date).format('YYYY-MM-DD') : '',
          skill_category: user.skill_category || 'Skilled',
          relieving_date: user.relieving_date ? moment(user.relieving_date).format('YYYY-MM-DD') : '',
          date_of_joining: user.date_of_joining ? moment(user.date_of_joining).format('YYYY-MM-DD') : '',
          dob: user.dob || user.date_of_birth || ''
        });

        setEnteredAmount(user.monthly_salary || 0);

        const structRes = await payrollAPI.getSalaryStructure(employeeId);
        if (structRes.success && structRes.data) {
          setSalaryStructure(structRes.data.components || []);
          setSelectedGrade(structRes.data.grade_id || 'Without PF ESIC');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load employee details');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let pm = ['biometric'];
      if (profileForm.attendance_from === 'Mobile') {
        pm = ['mobile'];
      } else if (profileForm.attendance_from === 'Mobile & Biometric') {
        pm = ['mobile', 'biometric'];
      }

      const payload = {
        ...profileForm,
        attendance_settings: {
          punch_methods: pm
        },
        overtime_eligible: profileForm.overtime_applicable === 'Yes',
        enable_full_month_presence: profileForm.enable_full_month_presence === 'Yes'
      };

      const res = await payrollAPI.updateUserProfile(employeeId, payload);
      if (res.success) {
        toast.success('Employee profile updated successfully!');
        fetchEmployeeDetails();
      } else {
        toast.error(res.message || 'Failed to update profile.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCalculateSalary = () => {
    if (!enteredAmount || enteredAmount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    const basic = Math.round(enteredAmount * 0.5);
    const hra = Math.round(enteredAmount * 0.2);
    const conv = Math.round(enteredAmount * 0.1);
    const special = Math.round(enteredAmount * 0.1);
    const other = Math.round(enteredAmount * 0.1);

    let calculatedComponents = [
      { payhead: 'BASIC', group: 'A', formula: 'GROSS*50/100', monthly_amount: basic, yearly_amount: basic * 12 },
      { payhead: 'HRA', group: 'A', formula: 'GROSS*20/100', monthly_amount: hra, yearly_amount: hra * 12 },
      { payhead: 'CONV. ALL.', group: 'A', formula: 'GROSS*10/100', monthly_amount: conv, yearly_amount: conv * 12 },
      { payhead: 'Special All', group: 'A', formula: 'GROSS*10/100', monthly_amount: special, yearly_amount: special * 12 },
      { payhead: 'Other All.', group: 'A', formula: 'GROSS*10/100', monthly_amount: other, yearly_amount: other * 12 }
    ];

    if (selectedGrade === 'With PF ESIC') {
      const pfEmployee = Math.round(Math.min(basic, 15000) * 0.12);
      const esicEmployee = enteredAmount <= 21000 ? Math.round(enteredAmount * 0.0075) : 0;
      
      const pfEmployer = Math.round(Math.min(basic, 15000) * 0.13);
      const esicEmployer = enteredAmount <= 21000 ? Math.round(enteredAmount * 0.0325) : 0;

      calculatedComponents.push(
        { payhead: 'PF (Employee Contribution)', group: 'B', formula: 'MIN(BASIC,15000)*12/100', monthly_amount: pfEmployee, yearly_amount: pfEmployee * 12 },
        { payhead: 'ESIC (Employee Contribution)', group: 'B', formula: 'GROSS<=21000?GROSS*0.75%:0', monthly_amount: esicEmployee, yearly_amount: esicEmployee * 12 },
        { payhead: 'PF (Employer Contribution)', group: 'C', formula: 'MIN(BASIC,15000)*13/100', monthly_amount: pfEmployer, yearly_amount: pfEmployer * 12 },
        { payhead: 'ESIC (Employer Contribution)', group: 'C', formula: 'GROSS<=21000?GROSS*3.25%:0', monthly_amount: esicEmployer, yearly_amount: esicEmployer * 12 }
      );
    }

    setSalaryStructure(calculatedComponents);
    toast.success('Salary structure calculated!');
  };

  const handleSalarySubmit = async () => {
    if (salaryStructure.length === 0) {
      toast.error('Please calculate the salary structure first.');
      return;
    }

    setSavingSalary(true);
    try {
      const payload = {
        company_id: companyId,
        gross_salary: enteredAmount,
        effective_from: moment(applicableFrom, 'YYYY-MM').startOf('month').format('YYYY-MM-DD'),
        salary_type: salaryBy,
        components: salaryStructure,
        grade_id: selectedGrade
      };

      const structRes = await payrollAPI.saveSalaryStructure(employeeId, payload);
      const userRes = await payrollAPI.updateUserProfile(employeeId, { monthly_salary: enteredAmount });

      if (structRes.success && userRes.success) {
        toast.success('Salary structure saved and updated successfully!');
        fetchEmployeeDetails();
      } else {
        toast.error('Failed to save salary structure details.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save salary structure.');
    } finally {
      setSavingSalary(false);
    }
  };

  const handleExport = () => {
    let content = 'Payhead Name,Group,Formula,Amount (Monthly),Amount (Yearly)\n';
    salaryStructure.forEach(item => {
      content += `"${item.payhead}","${item.group}","${item.formula || ''}",${item.monthly_amount},${item.yearly_amount}\n`;
    });
    content += `GROSS,,Monthly Gross,${totals.gross},${totals.gross * 12}\n`;
    content += `NET SALARY,,Monthly Net,${totals.netSalary},${totals.netSalary * 12}\n`;
    content += `CTC,,Monthly CTC,${totals.ctc},${totals.ctc * 12}\n`;

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${employeeName || 'employee'}_salary_structure.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to handle multiselect tag checks
  const handleBioSelect = (s) => {
    const isSelected = profileForm.biometric_serial_no.includes(s);
    const updatedSerials = isSelected
      ? profileForm.biometric_serial_no.filter(x => x !== s)
      : [...profileForm.biometric_serial_no, s];
    setProfileForm(prev => ({ ...prev, biometric_serial_no: updatedSerials }));
  };

  if (loading) {
    return <div style={{ padding: '40px', color: THEME.muted, display: 'flex', alignItems: 'center', gap: '10px' }}><FiSettings className="animate-spin" /> Loading employee profile details...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <style>{stylesHtml}</style>
      
      {/* 1. Profile / Settings Form */}
      <form onSubmit={handleProfileSubmit} style={S.card}>
        <div style={S.sectionTitle}>
          <FiUser /> Employee Profile & Payroll Configuration
        </div>

        {/* PF Details */}
        <SubCard 
          title="PF Details" 
          icon={FiActivity}
          extraHeader={
            <SegmentedToggle
              value={profileForm.pf_not_applicable}
              onChange={(val) => setProfileForm(prev => ({ ...prev, pf_not_applicable: val }))}
              label="PF Status"
            />
          }
        >
          <div style={{ ...S.grid, opacity: profileForm.pf_not_applicable ? 0.55 : 1, transition: 'opacity 0.2s' }}>
            <div>
              <label style={S.label}>PF Number</label>
              <input
                type="text"
                value={profileForm.pf_no}
                onChange={e => setProfileForm(prev => ({ ...prev, pf_no: e.target.value }))}
                className="premium-input"
                disabled={profileForm.pf_not_applicable}
              />
            </div>
            <div>
              <label style={S.label}>PF Joining Date</label>
              <input
                type="date"
                value={profileForm.pf_joining_date}
                onChange={e => setProfileForm(prev => ({ ...prev, pf_joining_date: e.target.value }))}
                className="premium-input"
                disabled={profileForm.pf_not_applicable}
              />
            </div>
            <div>
              <label style={S.label}>PF Bank</label>
              <select
                value={profileForm.pf_bank}
                onChange={e => setProfileForm(prev => ({ ...prev, pf_bank: e.target.value }))}
                className="premium-input"
                disabled={profileForm.pf_not_applicable}
              >
                <option value="">Choose bank...</option>
                {bankOptions.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>PF Bank IFSC Code</label>
              <input
                type="text"
                value={profileForm.pf_bank_ifsc_code}
                onChange={e => setProfileForm(prev => ({ ...prev, pf_bank_ifsc_code: e.target.value }))}
                className="premium-input"
                disabled={profileForm.pf_not_applicable}
              />
            </div>
            <div>
              <label style={S.label}>PF Bank Account Number</label>
              <input
                type="text"
                value={profileForm.pf_bank_account_number}
                onChange={e => setProfileForm(prev => ({ ...prev, pf_bank_account_number: e.target.value }))}
                className="premium-input"
                disabled={profileForm.pf_not_applicable}
              />
            </div>
            <div>
              <label style={S.label}>UAN Number</label>
              <input
                type="text"
                value={profileForm.uan_number}
                onChange={e => setProfileForm(prev => ({ ...prev, uan_number: e.target.value }))}
                className="premium-input"
                disabled={profileForm.pf_not_applicable}
              />
            </div>
          </div>
        </SubCard>

        {/* ESIC Details */}
        <SubCard
          title="ESIC Details"
          icon={FiActivity}
          extraHeader={
            <SegmentedToggle
              value={profileForm.esic_not_applicable}
              onChange={(val) => setProfileForm(prev => ({ ...prev, esic_not_applicable: val }))}
              label="ESIC Status"
            />
          }
        >
          <div style={{ ...S.grid, opacity: profileForm.esic_not_applicable ? 0.55 : 1, transition: 'opacity 0.2s' }}>
            <div>
              <label style={S.label}>ESIC Number</label>
              <input
                type="text"
                value={profileForm.esic_no}
                onChange={e => setProfileForm(prev => ({ ...prev, esic_no: e.target.value }))}
                className="premium-input"
                disabled={profileForm.esic_not_applicable}
              />
            </div>
            <div>
              <label style={S.label}>ESIC Joining Date</label>
              <input
                type="date"
                value={profileForm.esic_joining_date}
                onChange={e => setProfileForm(prev => ({ ...prev, esic_joining_date: e.target.value }))}
                className="premium-input"
                disabled={profileForm.esic_not_applicable}
              />
            </div>
            <div>
              <label style={S.label}>ESIC End Month</label>
              <input
                type="month"
                value={profileForm.esic_end_month}
                onChange={e => setProfileForm(prev => ({ ...prev, esic_end_month: e.target.value }))}
                className="premium-input"
                disabled={profileForm.esic_not_applicable}
              />
            </div>
          </div>
        </SubCard>

        {/* Bank Account Details */}
        <SubCard title="Bank Account Details" icon={FiCreditCard}>
          <div style={S.grid}>
            <div>
              <label style={S.label}>Select Bank *</label>
              <select
                value={profileForm.bank_name}
                onChange={e => setProfileForm(prev => ({ ...prev, bank_name: e.target.value }))}
                className="premium-input"
                required
              >
                <option value="">Choose bank...</option>
                {bankOptions.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Bank IFSC Code</label>
              <input
                type="text"
                value={profileForm.ifsc_code}
                onChange={e => setProfileForm(prev => ({ ...prev, ifsc_code: e.target.value }))}
                className="premium-input"
              />
            </div>
            <div>
              <label style={S.label}>Bank Account No</label>
              <input
                type="text"
                value={profileForm.bank_account_no}
                onChange={e => setProfileForm(prev => ({ ...prev, bank_account_no: e.target.value }))}
                className="premium-input"
              />
            </div>
            <div>
              <label style={S.label}>Name (As On Bank)</label>
              <input
                type="text"
                value={profileForm.name_on_bank}
                onChange={e => setProfileForm(prev => ({ ...prev, name_on_bank: e.target.value }))}
                className="premium-input"
              />
            </div>
            <div>
              <label style={S.label}>Bank Account Status</label>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '800',
                background: '#ecfdf5',
                color: '#059669',
                border: '1.5px solid #a7f3d0',
                marginTop: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <FiCheck size={12} /> {profileForm.bank_account_status}
              </span>
            </div>
          </div>
        </SubCard>

        {/* Attendance Settings */}
        <SubCard title="Attendance Settings" icon={FiClock}>
          <div style={S.grid}>
            <div>
              <label style={S.label}>Attendance From *</label>
              <div style={S.radioGroup}>
                {['Mobile', 'Biometric', 'Mobile & Biometric'].map(opt => (
                  <label key={opt} style={S.radioLabel}>
                    <input
                      type="radio"
                      name="att_from"
                      value={opt}
                      checked={profileForm.attendance_from === opt}
                      onChange={e => setProfileForm(prev => ({ ...prev, attendance_from: e.target.value }))}
                      style={{ accentColor: THEME.indigo }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
            
            {/* High Fidelity Biometric Multiselect */}
            <div style={{ position: 'relative' }}>
              <label style={S.label}>Select Biometric Serial No</label>
              <div
                onClick={() => setShowBioDropdown(!showBioDropdown)}
                className="premium-input"
                style={{
                  height: 'auto',
                  minHeight: '42px',
                  padding: '6px 12px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  alignItems: 'center',
                  cursor: 'pointer',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', flex: 1 }}>
                  {profileForm.biometric_serial_no.length === 0 ? (
                    <span style={{ color: THEME.muted, fontSize: '13px' }}>Select Serials...</span>
                  ) : (
                    profileForm.biometric_serial_no.map(s => (
                      <span
                        key={s}
                        style={{
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: '800',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.1s ease'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBioSelect(s);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#fee2e2';
                          e.currentTarget.style.color = '#ef4444';
                          e.currentTarget.style.borderColor = '#fca5a5';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#eff6ff';
                          e.currentTarget.style.color = '#2563eb';
                          e.currentTarget.style.borderColor = '#bfdbfe';
                        }}
                      >
                        {s}
                        <FiX size={10} style={{ cursor: 'pointer' }} />
                      </span>
                    ))
                  )}
                </div>
                <FiChevronDown size={16} style={{ color: THEME.muted, transform: showBioDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>

              {/* Click-outside backdrop overlay */}
              {showBioDropdown && (
                <div 
                  onClick={() => setShowBioDropdown(false)} 
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 99,
                    background: 'transparent'
                  }} 
                />
              )}

              {showBioDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '105%',
                  left: 0,
                  right: 0,
                  background: '#fff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
                  zIndex: 100,
                  marginTop: '4px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  padding: '6px'
                }}>
                  {biometricSerials.map(s => {
                    const isChecked = profileForm.biometric_serial_no.includes(s);
                    return (
                      <div
                        key={s}
                        onClick={() => handleBioSelect(s)}
                        className="bio-dropdown-item"
                        style={{
                          padding: '8px 14px',
                          fontSize: '13px',
                          color: THEME.text,
                          fontWeight: isChecked ? '800' : '600',
                          background: isChecked ? '#f1f5f9' : 'transparent',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '2px'
                        }}
                      >
                        <span>{s}</span>
                        {isChecked && <FiCheck size={14} color={THEME.indigo} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label style={S.label}>Biometric Code</label>
              <input
                type="text"
                value={profileForm.biometric_code}
                onChange={e => setProfileForm(prev => ({ ...prev, biometric_code: e.target.value }))}
                className="premium-input"
              />
            </div>
          </div>
        </SubCard>

        {/* Salary Settings */}
        <SubCard title="Salary Calculation Settings" icon={FiSliders}>
          <div style={S.grid}>
            <div>
              <label style={S.label}>Salary Calculation ACT *</label>
              <div style={S.radioGroup}>
                {['Shop Act', 'Factory Act', 'On Working Days'].map(opt => (
                  <label key={opt} style={S.radioLabel}>
                    <input
                      type="radio"
                      name="sal_act"
                      value={opt}
                      checked={profileForm.salary_calculation_act === opt}
                      onChange={e => setProfileForm(prev => ({ ...prev, salary_calculation_act: e.target.value }))}
                      style={{ accentColor: THEME.indigo }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={S.label}>Payroll Frequency *</label>
              <select
                value={profileForm.payroll_frequency}
                onChange={e => setProfileForm(prev => ({ ...prev, payroll_frequency: e.target.value }))}
                className="premium-input"
                required
              >
                <option value="Monthly">Monthly</option>
                <option value="Weekly">Weekly</option>
                <option value="Daily">Daily</option>
              </select>
            </div>
            <div>
              <label style={S.label}>Overtime Applicable *</label>
              <div style={S.radioGroup}>
                {['Yes', 'No'].map(opt => (
                  <label key={opt} style={S.radioLabel}>
                    <input
                      type="radio"
                      name="ot_app"
                      value={opt}
                      checked={profileForm.overtime_applicable === opt}
                      onChange={e => setProfileForm(prev => ({ ...prev, overtime_applicable: e.target.value }))}
                      style={{ accentColor: THEME.indigo }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={S.label}>Enable Full Month Presence *</label>
              <div style={S.radioGroup}>
                {['Yes', 'No'].map(opt => (
                  <label key={opt} style={S.radioLabel}>
                    <input
                      type="radio"
                      name="full_pres"
                      value={opt}
                      checked={profileForm.enable_full_month_presence === opt}
                      onChange={e => setProfileForm(prev => ({ ...prev, enable_full_month_presence: e.target.value }))}
                      style={{ accentColor: THEME.indigo }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </SubCard>

        {/* Timeline details */}
        <SubCard title="Timeline & Worker Categories" icon={FiCalendar}>
          <div style={S.grid}>
            <div>
              <label style={S.label}>Retirement Age</label>
              <input
                type="number"
                value={profileForm.retirement_age}
                onChange={e => setProfileForm(prev => ({ ...prev, retirement_age: parseInt(e.target.value, 10) || 60 }))}
                className="premium-input"
              />
            </div>
            <div>
              <label style={S.label}>Retirement Date</label>
              <input
                type="text"
                value={retirementDate}
                className="premium-input"
                disabled
              />
            </div>
            <div>
              <label style={S.label}>Notice Period (In Days) *</label>
              <input
                type="number"
                value={profileForm.notice_period_days}
                onChange={e => setProfileForm(prev => ({ ...prev, notice_period_days: parseInt(e.target.value, 10) || 30 }))}
                className="premium-input"
                required
              />
            </div>
            <div>
              <label style={S.label}>Select Type of Worker *</label>
              <select
                value={profileForm.worker_type}
                onChange={e => setProfileForm(prev => ({ ...prev, worker_type: e.target.value }))}
                className="premium-input"
                required
              >
                {workerTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Employment Type *</label>
              <select
                value={profileForm.employment_type}
                onChange={e => setProfileForm(prev => ({ ...prev, employment_type: e.target.value }))}
                className="premium-input"
                required
              >
                {employmentTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Employment Applicable Date *</label>
              <input
                type="date"
                value={profileForm.employment_applicable_date}
                onChange={e => setProfileForm(prev => ({ ...prev, employment_applicable_date: e.target.value }))}
                className="premium-input"
                required
              />
            </div>
            <div>
              <label style={S.label}>Employment End Date</label>
              <input
                type="date"
                value={profileForm.employment_end_date}
                onChange={e => setProfileForm(prev => ({ ...prev, employment_end_date: e.target.value }))}
                className="premium-input"
              />
            </div>
            <div>
              <label style={S.label}>Employee Skill Category *</label>
              <select
                value={profileForm.skill_category}
                onChange={e => setProfileForm(prev => ({ ...prev, skill_category: e.target.value }))}
                className="premium-input"
                required
              >
                {skillCategoryOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Current Skill Category</label>
              <input
                type="text"
                value={profileForm.skill_category.toUpperCase()}
                className="premium-input"
                disabled
              />
            </div>
            <div>
              <label style={S.label}>Relieving Date</label>
              <input
                type="date"
                value={profileForm.relieving_date}
                onChange={e => setProfileForm(prev => ({ ...prev, relieving_date: e.target.value }))}
                className="premium-input"
              />
            </div>
          </div>
        </SubCard>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: `1.5px solid #f1f5f9`, paddingTop: '20px' }}>
          <button type="submit" disabled={saving} className="premium-btn" style={S.btn('primary')}>
            {saving ? 'Saving...' : 'Submit Profile details'}
          </button>
        </div>
      </form>

      {/* 2. Salary Master Card */}
      <div style={S.card}>
        <div style={S.sectionTitle}>
          <FiDollarSign /> Salary Master Calculator
        </div>

        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
          
          {/* Controls Panel */}
          <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: '22px', background: '#f8fafc', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', fontWeight: '800', color: THEME.primary, borderBottom: '1.5px solid #e2e8f0', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiSettings /> Calculation Parameters
            </div>
            <div>
              <label style={S.label}>Salary By *</label>
              <SegmentedSalaryType value={salaryBy} onChange={setSalaryBy} />
            </div>

            <div>
              <label style={S.label}>Enter {salaryBy} Amount *</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{
                  position: 'absolute',
                  left: '14px',
                  fontSize: '15px',
                  fontWeight: '800',
                  color: THEME.indigo
                }}>
                  ₹
                </span>
                <input
                  type="number"
                  value={enteredAmount || ''}
                  onChange={e => setEnteredAmount(parseFloat(e.target.value) || 0)}
                  className="premium-input"
                  style={{
                    paddingLeft: '28px',
                    fontSize: '15px',
                    fontWeight: '800',
                    color: THEME.primary,
                    borderColor: THEME.indigo,
                    boxShadow: '0 2px 4px rgba(79,70,229,0.04)'
                  }}
                  placeholder="0"
                />
              </div>
              {enteredAmount > 0 && (
                <div style={{
                  fontSize: '11px',
                  fontWeight: '750',
                  color: THEME.muted,
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <FiTrendingUp size={12} color={THEME.green} />
                  <span>Formatted: ₹ {enteredAmount.toLocaleString('en-IN')} / mo (₹ {(enteredAmount * 12).toLocaleString('en-IN')} / yr)</span>
                </div>
              )}
            </div>

            <div>
              <label style={S.label}>Select Grade *</label>
              <select
                value={selectedGrade}
                onChange={e => setSelectedGrade(e.target.value)}
                className="premium-input"
              >
                <option value="Without PF ESIC">Without PF ESIC</option>
                <option value="With PF ESIC">With PF ESIC</option>
              </select>
            </div>

            <div>
              <label style={S.label}>Applicable From YearMonth *</label>
              <input
                type="month"
                value={applicableFrom}
                onChange={e => setApplicableFrom(e.target.value)}
                className="premium-input"
              />
            </div>

            <button
              type="button"
              onClick={handleCalculateSalary}
              className="premium-btn"
              style={{
                ...S.btn('primary'),
                width: '100%',
                background: 'linear-gradient(135deg, #4f46e5, #3b82f6)',
                boxShadow: '0 4px 14px rgba(79,70,229,0.2)'
              }}
            >
              <FiLayers /> Calculate Breakup
            </button>
          </div>

          {/* Table Panel */}
          <div style={{ flex: '2 1 500px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '13px', fontWeight: '800', color: THEME.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiFileText /> Salary Structure Breakup
            </div>
            
            <table className="premium-table" style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Payhead Name</th>
                  <th style={S.th}>Group</th>
                  <th style={S.th}>Formula</th>
                  <th style={S.th}>Amount (Monthly)</th>
                  <th style={S.th}>Amount (Yearly)</th>
                </tr>
              </thead>
              <tbody>
                {salaryStructure.map((item, idx) => {
                  const pct = enteredAmount > 0 ? Math.round((item.monthly_amount / enteredAmount) * 100) : 0;
                  
                  // Harmonic colors for visual component display
                  const componentColors = {
                    'BASIC': '#06b6d4',
                    'HRA': '#6366f1',
                    'CONV. ALL.': '#f59e0b',
                    'Special All': '#ec4899',
                    'Other All.': '#8b5cf6'
                  };
                  const barColor = componentColors[item.payhead] || (item.group === 'B' ? THEME.red : '#64748b');

                  return (
                    <tr key={item.payhead}>
                      <td style={{ ...S.td, fontWeight: '750', color: THEME.primary }}>{item.payhead}</td>
                      <td style={S.td}>
                        <span style={{
                          background: item.group === 'A' ? '#eff6ff' : item.group === 'B' ? '#fef2f2' : '#f8fafc',
                          color: item.group === 'A' ? '#2563eb' : item.group === 'B' ? '#ef4444' : '#64748b',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '10.5px',
                          fontWeight: '800',
                          border: `1px solid ${item.group === 'A' ? '#bfdbfe' : item.group === 'B' ? '#fca5a5' : '#e2e8f0'}`,
                          textTransform: 'uppercase'
                        }}>
                          Group {item.group}
                        </span>
                      </td>
                      <td style={{ ...S.td, fontFamily: 'monospace', color: THEME.muted, fontSize: '11.5px' }}>{item.formula}</td>
                      <td style={S.td}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '850', color: THEME.primary }}>₹{item.monthly_amount?.toLocaleString('en-IN')}</span>
                            {item.group === 'A' && <span style={{ fontSize: '11px', fontWeight: '800', color: barColor }}>{pct}%</span>}
                          </div>
                          {item.group === 'A' && (
                            <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '3px', transition: 'width 0.4s ease-out' }} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ ...S.td, fontWeight: '700', color: THEME.muted, textAlign: 'right', verticalAlign: 'middle' }}>
                        ₹{item.yearly_amount?.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {salaryStructure.length === 0 && (
              <div style={{ border: `1.5px dashed ${THEME.border}`, borderRadius: '12px', padding: '50px 20px', textAlign: 'center', color: THEME.muted, fontSize: '13px', marginTop: '12px', background: '#fafafa' }}>
                <FiAlertCircle size={22} color={THEME.amber} style={{ marginBottom: '8px' }} />
                <div>No structure calculated yet. Enter amount and click <strong>"Calculate Breakup"</strong> to preview salary breakdown.</div>
              </div>
            )}

            {/* Premium Salary Totals Summary Box */}
            {salaryStructure.length > 0 && (
              <div style={{
                marginTop: '24px',
                background: 'linear-gradient(135deg, #f8fafc, #eff6ff)',
                border: '1.5px solid #bfdbfe',
                borderRadius: '12px',
                padding: '18px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 120px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gross Salary</span>
                  <span style={{ fontSize: '20px', fontWeight: '850', color: THEME.primary }}>₹{totals.gross.toLocaleString('en-IN')}<span style={{ fontSize: '12px', fontWeight: '600', color: THEME.muted }}> /mo</span></span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: THEME.muted }}>₹{(totals.gross * 12).toLocaleString('en-IN')} /yr</span>
                </div>

                <div style={{ width: '1.5px', background: '#cbd5e1', alignSelf: 'stretch' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 120px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Payable</span>
                  <span style={{ fontSize: '20px', fontWeight: '850', color: '#059669' }}>₹{totals.netSalary.toLocaleString('en-IN')}<span style={{ fontSize: '12px', fontWeight: '600', color: '#059669' }}> /mo</span></span>
                  <span style={{ fontSize: '11px', fontWeight: '750', color: '#059669' }}>₹{(totals.netSalary * 12).toLocaleString('en-IN')} /yr</span>
                </div>

                <div style={{ width: '1.5px', background: '#cbd5e1', alignSelf: 'stretch' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 120px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CTC</span>
                  <span style={{ fontSize: '20px', fontWeight: '850', color: '#7c3aed' }}>₹{totals.ctc.toLocaleString('en-IN')}<span style={{ fontSize: '12px', fontWeight: '600', color: THEME.muted }}> /mo</span></span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: THEME.muted }}>₹{(totals.ctc * 12).toLocaleString('en-IN')} /yr</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', borderTop: `1.5px solid #f1f5f9`, paddingTop: '20px' }}>
              <button
                type="button"
                onClick={handleExport}
                disabled={salaryStructure.length === 0}
                className="premium-btn"
                style={{
                  ...S.btn('ghost'),
                  borderColor: THEME.green,
                  color: THEME.green,
                  opacity: salaryStructure.length === 0 ? 0.55 : 1
                }}
              >
                <FiDownload /> Export CSV
              </button>
              <button
                type="button"
                onClick={handleSalarySubmit}
                disabled={savingSalary || salaryStructure.length === 0}
                className="premium-btn"
                style={{
                  ...S.btn('success'),
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  opacity: salaryStructure.length === 0 ? 0.55 : 1
                }}
              >
                {savingSalary ? 'Saving...' : 'Submit Salary Master'}
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default ProfileTab;
