import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import attendanceAPI from '../../../api/attendance/attendance.api';
import leaveAPI from '../../../api/attendance/leave.api';
import masterAPI from '../../../api/attendance/master.api';

// Theme colors matching AttendanceManagement
const THEME = {
  navy: '#0d1b2a',
  green: '#0c9e6e',
  red: '#d63031',
  amber: '#c87f0a',
  lightBg: '#f3f4f6',
  border: '#e5e7eb',
  muted: '#6b7280',
  shadow: '0 1px 3px rgba(0, 0, 0, 0.12)'
};

const cardStyle = {
  background: '#ffffff',
  borderRadius: '12px',
  padding: '16px',
  border: `1px solid ${THEME.border}`,
  boxShadow: THEME.shadow
};

const buttonStyle = {
  cursor: 'pointer',
  padding: '8px 12px',
  borderRadius: '8px',
  border: 'none',
  fontWeight: '500',
  transition: 'all 0.2s'
};

const inputStyle = {
  width: '100%',
  border: `1px solid ${THEME.border}`,
  borderRadius: '8px',
  padding: '8px 10px',
  fontSize: '14px',
  transition: 'border-color 0.2s'
};

const EmployeeProfileWorkspace = ({ employeeId }) => {
    const navigate = useNavigate();
    const params = useParams();
    const id = employeeId || params.userId || params.id;

  const now = new Date();
  const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(now.toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);

  const [tab, setTab] = useState('attendance');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [leavePolicies, setLeavePolicies] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [showLeaveBalanceForm, setShowLeaveBalanceForm] = useState(false);
  
  // ─── Organization & Grid View ───
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [gridEmployees, setGridEmployees] = useState([]);
  const [gridLoading, setGridLoading] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [migratingEmployeeId, setMigratingEmployeeId] = useState(null);
  const [destOrgId, setDestOrgId] = useState('');
  const [showBulkPolicyModal, setShowBulkPolicyModal] = useState(false);
  const [selectedPolicyIds, setSelectedPolicyIds] = useState([]);
  const [bulkPolicyLoading, setBulkPolicyLoading] = useState(false);

  const [manualForm, setManualForm] = useState({
    attendance_date: now.toISOString().split('T')[0],
    status: 'present',
    first_in: `${now.toISOString().split('T')[0]}T09:00`,
    last_out: `${now.toISOString().split('T')[0]}T18:00`,
    remarks: ''
  });

  const [balanceForm, setBalanceForm] = useState({
    leave_policy_id: '',
    opening_balance: 0,
    used: 0,
    pending: 0
  });

  const fetchData = async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [profileRes, policiesRes] = await Promise.all([
        attendanceAPI.getEmployeeFullProfile(id, startDate, endDate),
        masterAPI.getLeavePolicies({ limit: 200 }).catch(() => ({ data: [] }))
      ]);
      setProfile(profileRes || null);

      const policyRows = Array.isArray(policiesRes?.data)
        ? policiesRes.data
        : Array.isArray(policiesRes)
          ? policiesRes
          : [];
      setLeavePolicies(policyRows);
    } catch (error) {
      toast.error(error?.message || 'Failed to load employee profile workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, startDate, endDate]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await masterAPI.getUsers({ limit: 2000, isActive: true });
        const rows = response?.data || [];
        setUsers(rows);
        if (rows.length > 0 && !selectedEmployeeId) {
          setSelectedEmployeeId(rows[0]._id);
        }
      } catch {
        setUsers([]);
      }
    };

    if (!id) {
      fetchUsers();
    }
  }, [id, selectedEmployeeId]);

  // ─── Fetch Organizations ───
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await masterAPI.getOrganizations();
        const orgs = response?.data || [];
        setOrganizations(orgs);
        if (orgs.length > 0 && !selectedOrgId) {
          setSelectedOrgId(orgs[0]._id);
        }
      } catch (err) {
        toast.error('Failed to load organizations');
        setOrganizations([]);
      }
    };

    if (!id) {
      fetchOrganizations();
    }
  }, [id]);

  // ─── Fetch Employees per Organization ───
  useEffect(() => {
    const fetchOrgEmployees = async () => {
      if (!selectedOrgId) return;
      setGridLoading(true);
      try {
        const response = await masterAPI.getUsers({ limit: 2000, isActive: true, company_id: selectedOrgId });
        const rows = response?.data || [];
        setGridEmployees(rows);
      } catch (err) {
        toast.error('Failed to load employees');
        setGridEmployees([]);
      } finally {
        setGridLoading(false);
      }
    };

    if (!id && selectedOrgId) {
      fetchOrgEmployees();
    }
  }, [id, selectedOrgId]);

  const employeeName = useMemo(() => {
    if (!profile?.employee) return 'Employee';
    const e = profile.employee;
    return `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.username || 'Employee';
  }, [profile]);



  const handleManualAdjustment = async (e) => {
    e.preventDefault();
    try {
      await attendanceAPI.createManualAdjustment({
        employee_id: id,
        attendance_date: manualForm.attendance_date,
        status: manualForm.status,
        first_in: manualForm.first_in,
        last_out: manualForm.last_out,
        remarks: manualForm.remarks
      });
      await attendanceAPI.calculateDailyAttendance(id, manualForm.attendance_date).catch(() => null);
      toast.success('Manual attendance updated');
      fetchData();
    } catch (error) {
      toast.error(error?.message || 'Failed to save manual attendance update');
    }
  };

  useEffect(() => {
    const newStart = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
    const newEnd = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];
    setStartDate(newStart);
    setEndDate(newEnd);
  }, [selectedMonth, selectedYear]);

  const handleUpdateBalance = async (e) => {
    e.preventDefault();
    if (!balanceForm.leave_policy_id) {
      toast.error('Please select a leave policy');
      return;
    }
    try {
      await leaveAPI.updateBalance(id, {
        leave_policy_id: balanceForm.leave_policy_id,
        opening_balance: Number(balanceForm.opening_balance) || 0,
        used: Number(balanceForm.used) || 0,
        pending: Number(balanceForm.pending) || 0
      });
      toast.success('Leave balance updated');
      setShowLeaveBalanceForm(false);
      fetchData();
    } catch (error) {
      toast.error(error?.message || 'Failed to update leave balance');
    }
  };

  // ─── Migration Handler ───
  const handleMigrateEmployee = async (employeeId) => {
    if (!destOrgId) {
      toast.error('Please select destination organization');
      return;
    }
    try {
      const result = await attendanceAPI.migrateEmployee(employeeId, destOrgId);
      if (result.success) {
        toast.success(`Migrated to ${result.migratedEmployee.company_name}`);
        setShowMigrationModal(false);
        setMigratingEmployeeId(null);
        setDestOrgId('');
        // Refresh employee list
        if (selectedOrgId) {
          const response = await masterAPI.getUsers({ limit: 2000, isActive: true });
          const rows = response?.data || [];
          const filtered = rows.filter(u => u.company_id?._id === selectedOrgId || u.company_id === selectedOrgId);
          setGridEmployees(filtered);
        }
      }
    } catch (error) {
      toast.error(error?.message || 'Migration failed');
    }
  };

  // ─── Bulk Policy Handler ───
  const handleBulkAssignPolicies = async () => {
    if (!selectedOrgId || selectedPolicyIds.length === 0) {
      toast.error('Select organization and at least one policy');
      return;
    }
    setBulkPolicyLoading(true);
    try {
      const result = await attendanceAPI.bulkAssignPolicies(selectedOrgId, selectedPolicyIds);
      if (result.success) {
        toast.success(`Assigned policies to ${result.assignedCount} employees`);
        setShowBulkPolicyModal(false);
        setSelectedPolicyIds([]);
      }
    } catch (error) {
      toast.error(error?.message || 'Failed to assign policies');
    } finally {
      setBulkPolicyLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading employee profile workspace...</div>;
  }

  if (!id) {
    return (
      <div style={{ padding: '12px', minHeight: '100vh', background: '#f9fafb' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          {/* Header with Organization Filter & Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ margin: 0, color: THEME.navy, fontSize: '24px' }}>👥 Employee Directory</h1>
              <p style={{ margin: '4px 0 0 0', color: THEME.muted, fontSize: '13px' }}>Select an organization to view employees</p>
            </div>
            <button 
              onClick={() => setShowBulkPolicyModal(true)}
              style={{
                ...buttonStyle,
                background: THEME.green,
                color: '#fff',
                padding: '10px 16px',
                fontSize: '12px',
                fontWeight: '600'
              }}
            >
              📋 Bulk Assign Policies
            </button>
          </div>

          {/* Organization Filter */}
          <div style={{ ...cardStyle, marginBottom: '16px', padding: '12px', borderLeft: `4px solid ${THEME.navy}` }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px', color: THEME.navy }}>🏢 Organization</label>
            <select 
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              style={{ ...inputStyle, padding: '10px 12px', fontSize: '13px', fontWeight: '500' }}
            >
              {organizations.length === 0 && <option value="">No organizations found</option>}
              {organizations.map((org) => (
                <option key={org._id} value={org._id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Cards Grid */}
          {gridLoading ? (
            <div style={{ textAlign: 'center', color: THEME.muted, padding: '40px' }}>Loading employees...</div>
          ) : gridEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', color: THEME.muted, padding: '40px' }}>No employees in selected organization</div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px'
            }}>
              {gridEmployees.map((emp) => {
                const initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase();
                return (
                  <div 
                    key={emp._id}
                    style={{
                      ...cardStyle,
                      padding: '14px',
                      borderLeft: `4px solid ${THEME.green}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    {/* Avatar & Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: emp.photo ? `url(${emp.photo})` : THEME.green,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '20px',
                        fontWeight: 'bold'
                      }}>
                        {!emp.photo && initials}
                      </div>
                      <span style={{
                        background: emp.isActive ? THEME.green : '#ccc',
                        color: '#fff',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: '600'
                      }}>
                        {emp.isActive ? '✓ Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Name + Code */}
                    <div>
                      <div style={{ fontWeight: '600', color: THEME.navy, fontSize: '13px', lineHeight: '1.3' }}>
                        {emp.first_name} {emp.last_name}
                      </div>
                      <div style={{ color: THEME.muted, fontSize: '11px' }}>
                        Code: {emp.employee_code}
                      </div>
                    </div>

                    {/* Contact */}
                    <div style={{ fontSize: '11px', color: THEME.muted }}>
                      📞 {emp.contact_number || 'N/A'}
                    </div>

                    {/* Designation */}
                    <div style={{ fontSize: '11px', color: THEME.muted }}>
                      💼 {emp.designation?.designation_name || emp.designation || 'N/A'}
                    </div>

                    {/* Company */}
                    <div style={{
                      background: THEME.lightBg,
                      padding: '6px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      color: THEME.navy,
                      fontWeight: '500'
                    }}>
                      🏢 {emp.company_id?.company_name || emp.company || 'N/A'}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                      <button
                        onClick={() => navigate(`/attendance/admin/employee/${emp._id}`)}
                        style={{
                          ...buttonStyle,
                          background: THEME.navy,
                          color: '#fff',
                          padding: '8px 12px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}
                      >
                        👁️ View
                      </button>
                      <button
                        onClick={() => {
                          setMigratingEmployeeId(emp._id);
                          setShowMigrationModal(true);
                        }}
                        style={{
                          ...buttonStyle,
                          background: THEME.amber,
                          color: '#fff',
                          padding: '8px 12px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}
                      >
                        🔄 Migrate
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Migration Modal */}
          {showMigrationModal && migratingEmployeeId && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                ...cardStyle,
                maxWidth: '500px',
                width: '90%',
                padding: '20px'
              }}>
                <h2 style={{ margin: '0 0 16px 0', color: THEME.navy }}>🔄 Migrate Employee</h2>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '12px', color: THEME.muted }}>Destination Organization</label>
                  <select 
                    value={destOrgId}
                    onChange={(e) => setDestOrgId(e.target.value)}
                    style={{ ...inputStyle, padding: '10px 12px', fontSize: '12px' }}
                  >
                    <option value="">Select organization</option>
                    {organizations.map((org) => (
                      <option key={org._id} value={org._id}>
                        {org.name} {org.hodName ? `(HOD: ${org.hodName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    onClick={() => {
                      setShowMigrationModal(false);
                      setMigratingEmployeeId(null);
                      setDestOrgId('');
                    }}
                    style={{
                      ...buttonStyle,
                      background: THEME.lightBg,
                      color: THEME.navy,
                      border: `1px solid ${THEME.border}`,
                      padding: '10px 16px',
                      fontSize: '12px'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleMigrateEmployee(migratingEmployeeId)}
                    style={{
                      ...buttonStyle,
                      background: THEME.amber,
                      color: '#fff',
                      padding: '10px 16px',
                      fontSize: '12px'
                    }}
                  >
                    Migrate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Policy Modal */}
          {showBulkPolicyModal && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                ...cardStyle,
                maxWidth: '500px',
                width: '90%',
                padding: '20px',
                maxHeight: '80vh',
                overflowY: 'auto'
              }}>
                <h2 style={{ margin: '0 0 16px 0', color: THEME.navy }}>📋 Bulk Assign Policies</h2>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '12px', color: THEME.muted }}>Organization</label>
                  <select 
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    style={{ ...inputStyle, padding: '10px 12px', fontSize: '12px' }}
                  >
                    {organizations.map((org) => (
                      <option key={org._id} value={org._id}>{org.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '12px', color: THEME.muted }}>Select Policies</label>
                  <div style={{ border: `1px solid ${THEME.border}`, borderRadius: '8px', padding: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                    {leavePolicies.length === 0 ? (
                      <div style={{ color: THEME.muted, fontSize: '12px' }}>Loading policies...</div>
                    ) : (
                      leavePolicies.map((policy) => (
                        <label key={policy._id} style={{ display: 'flex', gap: '8px', padding: '6px 0', alignItems: 'center', fontSize: '12px', cursor: 'pointer' }}>
                          <input 
                            type="checkbox"
                            checked={selectedPolicyIds.includes(policy._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPolicyIds([...selectedPolicyIds, policy._id]);
                              } else {
                                setSelectedPolicyIds(selectedPolicyIds.filter(p => p !== policy._id));
                              }
                            }}
                          />
                          {policy.policy_name || policy.leave_type}
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    onClick={() => {
                      setShowBulkPolicyModal(false);
                      setSelectedPolicyIds([]);
                    }}
                    style={{
                      ...buttonStyle,
                      background: THEME.lightBg,
                      color: THEME.navy,
                      border: `1px solid ${THEME.border}`,
                      padding: '10px 16px',
                      fontSize: '12px'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkAssignPolicies}
                    disabled={bulkPolicyLoading}
                    style={{
                      ...buttonStyle,
                      background: THEME.green,
                      color: '#fff',
                      padding: '10px 16px',
                      fontSize: '12px',
                      opacity: bulkPolicyLoading ? 0.6 : 1
                    }}
                  >
                    {bulkPolicyLoading ? 'Assigning...' : 'Assign'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!profile?.employee) {
    return <div style={{ padding: '20px' }}>Employee not found</div>;
  }

  return (
    <div style={{ padding: '12px', background: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ margin: 0, color: THEME.navy, fontSize: '22px' }}>👤 {employeeName}</h1>
            <div style={{ color: THEME.muted, marginTop: '2px', fontSize: '12px' }}>
              Code: {profile.employee.employee_code || '---'} • Username: {profile.employee.username || '---'}
            </div>
          </div>
          <button 
            onClick={() => navigate('/attendance/admin/attendance')} 
            style={{
              ...buttonStyle,
              background: THEME.navy,
              color: '#fff',
              padding: '8px 14px',
              fontSize: '12px'
            }}
          >
            ← Back
          </button>
        </div>

        {/* Stats Cards - More Compact */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '12px' }}>
          <div style={{ ...cardStyle, padding: '12px', borderLeft: `3px solid ${THEME.navy}` }}>
            <div style={{ fontSize: '11px', color: THEME.muted, fontWeight: '500' }}>ATTENDANCE</div>
            <div style={{ fontSize: '20px', color: THEME.navy, fontWeight: 'bold', marginTop: '4px' }}>{(profile.attendance || []).length}</div>
          </div>
          <div style={{ ...cardStyle, padding: '12px', borderLeft: `3px solid ${THEME.green}` }}>
            <div style={{ fontSize: '11px', color: THEME.muted, fontWeight: '500' }}>LEAVE BALANCES</div>
            <div style={{ fontSize: '20px', color: THEME.green, fontWeight: 'bold', marginTop: '4px' }}>{(profile.balances || []).length}</div>
          </div>
          <div style={{ ...cardStyle, padding: '12px', borderLeft: `3px solid ${THEME.amber}` }}>
            <div style={{ fontSize: '11px', color: THEME.muted, fontWeight: '500' }}>PENDING LEAVES</div>
            <div style={{ fontSize: '20px', color: THEME.amber, fontWeight: 'bold', marginTop: '4px' }}>{(profile.pendingLeaves || []).length}</div>
          </div>
        </div>

        {/* Tab Navigation - Compact */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', borderBottom: `2px solid ${THEME.border}` }}>
          {['attendance', 'leave', 'actions'].map((tabName) => (
            <button 
              key={tabName}
              onClick={() => setTab(tabName)} 
              style={{
                ...buttonStyle,
                background: tab === tabName ? THEME.navy : 'transparent',
                color: tab === tabName ? '#fff' : THEME.muted,
                border: 'none',
                borderBottom: tab === tabName ? `3px solid ${THEME.green}` : 'none',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: tab === tabName ? '600' : '500',
                borderRadius: '0'
              }}
            >
              {tabName.charAt(0).toUpperCase() + tabName.slice(1)}
            </button>
          ))}
        </div>

        {/* Attendance Filter */}
        <div style={{ ...cardStyle, marginBottom: '12px', borderLeft: `4px solid ${THEME.green}`, padding: '12px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: THEME.navy, fontWeight: '600' }}>📅 Filter by Date Range</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px', color: THEME.muted }}>Month</label>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px' }}
              >
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px', color: THEME.muted }}>Year</label>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px' }}
              >
                {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', paddingTop: '12px', borderTop: `1px solid ${THEME.border}` }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px', color: THEME.muted }}>From Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px', color: THEME.muted }}>To Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px' }} />
            </div>
          </div>
        </div>

      {tab === 'attendance' && (
        <div style={{ ...cardStyle, padding: '12px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '14px' }}>📊 Daily Records</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: THEME.navy, color: '#fff' }}>
                  <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600' }}>In</th>
                  <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600' }}>Out</th>
                  <th style={{ textAlign: 'right', padding: '8px', fontWeight: '600' }}>Hours</th>
                </tr>
              </thead>
              <tbody>
                {(profile.attendance || []).map((row) => (
                  <tr key={row._id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                    <td style={{ padding: '6px 8px' }}>{new Date(row.attendance_date).toLocaleDateString()}</td>
                    <td style={{ padding: '6px 8px' }}><span style={{ background: THEME.lightBg, padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{row.status}</span></td>
                    <td style={{ padding: '6px 8px' }}>{row.first_in ? new Date(row.first_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                    <td style={{ padding: '6px 8px' }}>{row.last_out ? new Date(row.last_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '500' }}>{Number(row.total_work_hours || 0).toFixed(1)}h</td>
                  </tr>
                ))}
                {(profile.attendance || []).length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '12px', textAlign: 'center', color: THEME.muted }}>No records in selected period</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'leave' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
          {showLeaveBalanceForm && (
            <div style={{ ...cardStyle, borderLeft: `4px solid ${THEME.green}`, padding: '12px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '14px', color: THEME.green }}>➕ Add Leave Balance</h3>
              <form onSubmit={handleUpdateBalance} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px', color: THEME.muted }}>Policy</label>
                  <select style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px' }} value={balanceForm.leave_policy_id} onChange={(e) => setBalanceForm({ ...balanceForm, leave_policy_id: e.target.value })}>
                    <option value="">Select policy</option>
                    {leavePolicies.map((p) => (
                      <option key={p._id} value={p._id}>{p.policy_name || p.leave_type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px', color: THEME.muted }}>Opening</label>
                  <input type="number" step="0.5" style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px' }} value={balanceForm.opening_balance} onChange={(e) => setBalanceForm({ ...balanceForm, opening_balance: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px', color: THEME.muted }}>Used</label>
                  <input type="number" step="0.5" style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px' }} value={balanceForm.used} onChange={(e) => setBalanceForm({ ...balanceForm, used: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px', color: THEME.muted }}>Pending</label>
                  <input type="number" step="0.5" style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px' }} value={balanceForm.pending} onChange={(e) => setBalanceForm({ ...balanceForm, pending: e.target.value })} />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px' }}>
                  <button type="submit" style={{ ...buttonStyle, background: THEME.green, color: '#fff', flex: 1, padding: '8px 10px', fontSize: '12px' }}>Save</button>
                  <button type="button" onClick={() => setShowLeaveBalanceForm(false)} style={{ ...buttonStyle, background: THEME.lightBg, color: THEME.navy, border: `1px solid ${THEME.border}`, flex: 1, padding: '8px 10px', fontSize: '12px' }}>Cancel</button>
                </div>
              </form>
            </div>
          )}
          <div style={{ ...cardStyle, padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '14px' }}>💰 Leave Balance</h3>
              {!showLeaveBalanceForm && <button onClick={() => setShowLeaveBalanceForm(true)} style={{ ...buttonStyle, background: THEME.green, color: '#fff', padding: '6px 12px', fontSize: '12px' }}>+ Add</button>}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: THEME.navy, color: '#fff' }}>
                    <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600' }}>Policy</th>
                    <th style={{ textAlign: 'right', padding: '8px', fontWeight: '600' }}>Opening</th>
                    <th style={{ textAlign: 'right', padding: '8px', fontWeight: '600' }}>Used</th>
                    <th style={{ textAlign: 'right', padding: '8px', fontWeight: '600' }}>Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {(profile.balances || []).map((b) => (
                    <tr key={b._id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                      <td style={{ padding: '6px 8px' }}>{b.leave_type || b.leave_policy_id?.policy_name || 'Policy'}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(b.opening_balance || 0).toFixed(1)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(b.used ?? 0).toFixed(1)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(b.pending ?? 0).toFixed(1)}</td>
                    </tr>
                  ))}
                  {(profile.balances || []).length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '12px', textAlign: 'center', color: THEME.muted }}>No leave balances</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ ...cardStyle, padding: '12px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '14px' }}>📋 Leave History</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: THEME.navy, color: '#fff' }}>
                    <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600' }}>From</th>
                    <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600' }}>To</th>
                    <th style={{ textAlign: 'left', padding: '8px', fontWeight: '600' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(profile.leaves || []).map((l) => (
                    <tr key={l._id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                      <td style={{ padding: '6px 8px' }}>{l.leave_type || l.leave_policy_id?.policy_name || 'Leave'}</td>
                      <td style={{ padding: '6px 8px' }}>{l.from_date ? new Date(l.from_date).toLocaleDateString() : '--'}</td>
                      <td style={{ padding: '6px 8px' }}>{l.to_date ? new Date(l.to_date).toLocaleDateString() : '--'}</td>
                      <td style={{ padding: '6px 8px' }}><span style={{ background: THEME.lightBg, padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{l.approval_status || l.status || '--'}</span></td>
                    </tr>
                  ))}
                  {(profile.leaves || []).length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: '12px', textAlign: 'center', color: THEME.muted }}>No leave history</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'actions' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
          <div style={{ ...cardStyle, borderLeft: `4px solid ${THEME.navy}`, padding: '12px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '14px', color: THEME.navy }}>✏️ Manual Attendance Update</h3>
            <form onSubmit={handleManualAdjustment} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px', color: THEME.muted }}>Date</label>
                <input type="date" style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px' }} value={manualForm.attendance_date} onChange={(e) => setManualForm({ ...manualForm, attendance_date: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px', color: THEME.muted }}>Status</label>
                <select style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px' }} value={manualForm.status} onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}>
                  <option value="present">present</option>
                  <option value="absent">absent</option>
                  <option value="half_day">half_day</option>
                  <option value="incomplete">incomplete</option>
                  <option value="leave">leave</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px', color: THEME.muted }}>First In</label>
                <input type="datetime-local" style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px' }} value={manualForm.first_in} onChange={(e) => setManualForm({ ...manualForm, first_in: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px', color: THEME.muted }}>Last Out</label>
                <input type="datetime-local" style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px' }} value={manualForm.last_out} onChange={(e) => setManualForm({ ...manualForm, last_out: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px', color: THEME.muted }}>Remarks</label>
                <textarea rows={2} style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px' }} value={manualForm.remarks} onChange={(e) => setManualForm({ ...manualForm, remarks: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px' }}>
                <button type="submit" style={{ ...buttonStyle, background: THEME.navy, color: '#fff', flex: 1, padding: '8px 10px', fontSize: '12px' }}>Save Update</button>
              </div>
            </form>
          </div>

          {/* Migration Card */}
          <div style={{ ...cardStyle, borderLeft: `4px solid ${THEME.amber}`, padding: '12px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '14px', color: THEME.amber }}>🔄 Migrate Employee</h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: THEME.muted }}>
              Move this employee to a different organization. Policies and leave balances will be updated automatically.
            </p>
            <div style={{ display: 'grid', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', fontSize: '12px', color: THEME.muted }}>Destination Organization</label>
                <select 
                  value={destOrgId}
                  onChange={(e) => setDestOrgId(e.target.value)}
                  style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px' }}
                >
                  <option value="">Select organization</option>
                  {organizations.map((org) => (
                    <option key={org._id} value={org._id}>
                      {org.name} {org.hodName ? `(HOD: ${org.hodName})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  if (destOrgId) {
                    handleMigrateEmployee(id);
                  } else {
                    toast.error('Please select destination organization');
                  }
                }}
                style={{
                  ...buttonStyle,
                  background: THEME.amber,
                  color: '#fff',
                  padding: '8px 10px',
                  fontSize: '12px'
                }}
              >
                🔄 Migrate Employee
              </button>
            </div>
          </div>
        </div>
      )}      </div>
    </div>
  );
};

export default EmployeeProfileWorkspace;
