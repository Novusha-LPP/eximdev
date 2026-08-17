import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../../contexts/UserContext';
import payrollAPI from '../../../api/attendance/payroll.api';
import PayrollTab from './PayrollTab';
import { FiArrowLeft, FiUser, FiSearch, FiGrid, FiSettings } from 'react-icons/fi';
import './PayrollPages.css';

const PayrollMaster = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmp, setSelectedEmp] = useState(null);

  const companyId = user?.company_id?._id || user?.company_id;

  const fetchMasterList = useCallback(async () => {
    if (!companyId) {
      if (user) setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await payrollAPI.getPayrollMasterList(companyId);
      if (res.success) {
        setEmployees(res.data || []);
      }
    } catch (err) {
      console.error('Fetch master list error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchMasterList();
  }, [fetchMasterList]);

  // Filter based on search query
  const filtered = employees.filter(item => {
    const empName = `${item.employee?.first_name || ''} ${item.employee?.last_name || ''}`.toLowerCase();
    const empCode = (item.employee?.employee_code || '').toLowerCase();
    const dept = (item.employee?.department || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return empName.includes(query) || empCode.includes(query) || dept.includes(query);
  });

  const formatCurrency = (v) => {
    return '₹' + Number(v || 0).toLocaleString('en-IN');
  };

  return (
    <div className="payroll-page">
      {/* Header */}
      <div className="payroll-page__header">
        <div>
          <button className="payroll-page__back-btn" onClick={() => navigate('/attendance/admin/payroll-dashboard')}>
            <FiArrowLeft /> Back to Dashboard
          </button>
          <h1 style={{ marginTop: '12px' }}>Employee Payroll Master</h1>
          <p>Configure base salary, grade/band, statutory opt-ins, and allowances structure</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedEmp ? '380px 1fr' : '1fr', gap: '20px', alignItems: 'start' }}>
        {/* Left Side: Employee List */}
        <div>
          <div className="payroll-filter-bar" style={{ padding: '10px 14px', marginBottom: '14px' }}>
            <input
              type="text"
              className="payroll-search-input"
              style={{ width: '100%' }}
              placeholder="Search employee, code, dept..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', borderRadius: '12px' }}>
            {loading ? (
              <div className="payroll-card" style={{ padding: '20px', textAlign: 'center' }}>
                <div className="payroll-loading__spinner" style={{ margin: '0 auto 10px auto' }} />
                <span>Loading employee master...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="payroll-card" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                No active payroll configurations.
              </div>
            ) : (
              filtered.map(item => {
                const emp = item.employee;
                const conf = item.config;
                if (!emp) return null;

                const isSelected = selectedEmp?.employee?._id === emp._id;

                return (
                  <div
                    key={emp._id}
                    className="payroll-master-card"
                    style={{
                      borderColor: isSelected ? '#6366f1' : '#e2e8f0',
                      background: isSelected ? '#f5f3ff' : '#fff',
                      boxShadow: isSelected ? '0 4px 12px rgba(99, 102, 241, 0.08)' : 'none'
                    }}
                    onClick={() => setSelectedEmp(item)}
                  >
                    <div className="payroll-master-card__row">
                      <img
                        src={emp.employee_photo || '/avatar-placeholder.png'}
                        alt=""
                        style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }}
                        onError={el => { el.target.src = '/avatar-placeholder.png'; }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
                          {emp.first_name} {emp.last_name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {emp.employee_code || 'No Code'} • {emp.department || 'Staff'}
                        </div>
                      </div>
                      {conf.grade && (
                        <span className="payroll-grade-badge">{conf.grade}</span>
                      )}
                    </div>

                    <div className="payroll-master-card__detail">
                      <div className="payroll-master-card__field">
                        <span className="payroll-master-card__field-label">Payroll Type</span>
                        <span className="payroll-master-card__field-value" style={{ textTransform: 'capitalize' }}>
                          {conf.payroll_type?.toLowerCase()?.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="payroll-master-card__field">
                        <span className="payroll-master-card__field-label">Base Rate</span>
                        <span className="payroll-master-card__field-value">
                          {conf.payroll_type === 'DAILY_WAGE' ? formatCurrency(conf.daily_wage) : formatCurrency(conf.monthly_salary)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Configuration View */}
        {selectedEmp ? (
          <div style={{ position: 'sticky', top: '24px' }}>
            <div className="payroll-card" style={{ marginBottom: '14px' }}>
              <div className="payroll-card__header" style={{ padding: '12px 20px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={selectedEmp.employee?.employee_photo || '/avatar-placeholder.png'}
                    alt=""
                    style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }}
                    onError={el => { el.target.src = '/avatar-placeholder.png'; }}
                  />
                  <div>
                    <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>
                      {selectedEmp.employee?.first_name} {selectedEmp.employee?.last_name}
                    </h2>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {selectedEmp.employee?.designation || 'Staff'}
                    </span>
                  </div>
                </div>
                <button
                  className="payroll-page__back-btn"
                  style={{ padding: '4px 10px', fontSize: '11px' }}
                  onClick={() => setSelectedEmp(null)}
                >
                  Close Settings
                </button>
              </div>
            </div>

            <PayrollTab
              employeeId={selectedEmp.employee?._id}
              companyId={companyId}
              employeeName={`${selectedEmp.employee?.first_name} ${selectedEmp.employee?.last_name}`}
            />
          </div>
        ) : (
          <div className="payroll-card" style={{ padding: '80px 20px', textAlign: 'center', color: '#94a3b8' }}>
            <FiUser size={40} style={{ margin: '0 auto 16px auto', opacity: 0.4 }} />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              No Employee Selected
            </h3>
            <p style={{ fontSize: '12px', margin: 0 }}>
              Select an employee from the left panel to review or edit settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollMaster;
