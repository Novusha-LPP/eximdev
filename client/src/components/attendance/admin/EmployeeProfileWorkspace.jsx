import React, { useEffect, useMemo, useState } from 'react'; // Standardized path
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import attendanceAPI from '../../../api/attendance/attendance.api';
import leaveAPI from '../../../api/attendance/leave.api';
import masterAPI from '../../../api/attendance/master.api';

// Theme colors matching AttendanceManagement
const THEME = {
  primary: '#0f172a', // Black/Slate-900 for primary buttons
  indigo: '#4f46e5',  // Indigo for highlights
  navy: '#0f172a',    // Slate-900
  green: '#10b981',   // Emerald-500
  red: '#ef4444',     // Red-500
  amber: '#f59e0b',   // Amber-500
  bg: '#fdfdfd',      // Very clean whiteish bg
  card: '#ffffff',    // White cards
  border: '#e2e8f0',  // Slate-200 border
  text: '#1e293b',    // Slate-800
  muted: '#94a3b8',   // Slate-400
  shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
};

const cardStyle = {
  background: '#ffffff',
  borderRadius: '14px',
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

const toWhole = (value) => Math.max(0, Math.floor(Number(value) || 0));

const EmployeeProfileWorkspace = ({ employeeId, preselectedEmployeeIds = [] }) => {
    const params = useParams();
    const navigate = useNavigate();
  const [localEmployeeId, setLocalEmployeeId] = useState(null);
  
  // Resolve the employee ID, ensuring we don't pick up route paths like 'teams' or 'users' as IDs
  const idFromParams = params.userId || params.id;
  const isValidParamId = idFromParams && /^[0-9a-fA-F]{24}$/.test(idFromParams);
  
  const id = employeeId || localEmployeeId || (isValidParamId ? idFromParams : null);

  // ─── Pagination & View State ───
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [pageSize, setPageSize] = useState(24); // Items per page

  const now = new Date();
  const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(now.toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);

  const [tab, setTab] = useState('attendance');
  const [searchTerm, setSearchTerm] = useState('');
  const [groupBy, setGroupBy] = useState('none'); // 'none', 'organization', 'team'
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [leavePolicies, setLeavePolicies] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [showLeaveBalanceForm, setShowLeaveBalanceForm] = useState(false);

  const [balanceForm, setBalanceForm] = useState({
    leave_policy_id: '',
    opening_balance: 0,
    used: 0,
    pending: 0
  });

  const isEditingBalance = useMemo(() => {
    if (!balanceForm.leave_policy_id) return false;
    return (profile?.balances || []).some(b => {
      const bPolicyId = b.leave_policy_id?._id || b.leave_policy_id;
      return String(bPolicyId) === String(balanceForm.leave_policy_id);
    });
  }, [balanceForm.leave_policy_id, profile?.balances]);

  // Sync balanceForm when policy is selected
  useEffect(() => {
    if (!balanceForm.leave_policy_id || !showLeaveBalanceForm) return;
    
    // We only want to auto-fill if we are NOT already in the middle of typing
    // Actually, it's better to auto-fill once when the policy ID changes in the dropdown
    const existing = (profile?.balances || []).find(b => {
      const bPolicyId = b.leave_policy_id?._id || b.leave_policy_id;
      return String(bPolicyId) === String(balanceForm.leave_policy_id);
    });

    if (existing) {
      setBalanceForm(prev => {
        // Only update if it's different to avoid loops if useEffect triggers on balanceForm (though it doesn't)
        if (prev.opening_balance === existing.opening_balance && 
            prev.used === (existing.used ?? existing.consumed ?? 0) &&
            prev.pending === (existing.pending ?? existing.pending_approval ?? 0)) {
          return prev;
        }
        return {
          ...prev,
          opening_balance: existing.opening_balance || 0,
          used: existing.used ?? existing.consumed ?? 0,
          pending: existing.pending ?? existing.pending_approval ?? 0
        };
      });
    }
  }, [balanceForm.leave_policy_id, profile?.balances, showLeaveBalanceForm]);
  
  // ─── Organization & Grid View ───
  const [organizations, setOrganizations] = useState([]);
  const [gridEmployees, setGridEmployees] = useState([]);
  const [gridLoading, setGridLoading] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [migratingEmployeeId, setMigratingEmployeeId] = useState(null);
  const [destOrgId, setDestOrgId] = useState('');
  const [showBulkPolicyModal, setShowBulkPolicyModal] = useState(false);
  const [bulkPolicyLoading, setBulkPolicyLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [weekOffPolicies, setWeekOffPolicies] = useState([]);
  const [holidayPolicies, setHolidayPolicies] = useState([]);
  const [shiftPolicies, setShiftPolicies] = useState([]);
  const [bulkPolicyForm, setBulkPolicyForm] = useState({
    weekoff_policy_id: '',
    holiday_policy_id: '',
    shift_id: '',
    leave_policy_ids: []
  });

  const [manualForm, setManualForm] = useState({
    attendance_date: now.toISOString().split('T')[0],
    status: 'present',
    first_in: `${now.toISOString().split('T')[0]}T09:00`,
    last_out: `${now.toISOString().split('T')[0]}T18:00`,
    remarks: ''
  });

  const [policyForm, setPolicyForm] = useState({
    weekoff_policy_id: '',
    holiday_policy_id: '',
    shift_id: ''
  });

  const [bulkManualForm, setBulkManualForm] = useState({
    startDate: now.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],
    status: 'present',
    remarks: '',
    excludeSundays: true,
    excludeSaturdays: true
  });

  // ─── Search & Filtering & Grouping Logic ───
  const filteredEmployees = useMemo(() => {
    let result = gridEmployees;
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(emp => 
        (emp.first_name || '').toLowerCase().includes(lowerSearch) ||
        (emp.last_name || '').toLowerCase().includes(lowerSearch) ||
        (emp.username || '').toLowerCase().includes(lowerSearch) ||
        (emp.employee_code || '').toLowerCase().includes(lowerSearch)
      );
    }
    return result;
  }, [gridEmployees, searchTerm]);

  const groupedEmployeesData = useMemo(() => {
    if (groupBy === 'none') return null;
    const groups = {};
    filteredEmployees.forEach(emp => {
      let groupName = 'Unassigned';
      if (groupBy === 'organization') {
        groupName = emp.company_id?.company_name || 'No Organization';
      } else if (groupBy === 'team') {
        groupName = emp.teamId?.name || 'No Team';
      }
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(emp);
    });
    return groups;
  }, [filteredEmployees, groupBy]);

  const paginatedEmployees = useMemo(() => {
    // If grouped, we show all filtered employees in their groups (bypass pagination to keep groups together)
    if (groupBy !== 'none') return filteredEmployees;
    
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize, groupBy]);

  const totalPages = Math.ceil(filteredEmployees.length / pageSize);

  // Sync individual policy form with profile data
  useEffect(() => {
    if (profile?.employee?.policy_overrides) {
      const po = profile.employee.policy_overrides;
      setPolicyForm({
        weekoff_policy_id: po.weekoff_policy_id?._id || po.weekoff_policy_id || '',
        holiday_policy_id: po.holiday_policy_id?._id || po.holiday_policy_id || '',
        shift_id: po.shift_id?._id || po.shift_id || ''
      });
    }
  }, [profile]);

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
        const response = await masterAPI.getUsers({ limit: 2000, isActive: true, all_companies: true });
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
      } catch (err) {
        toast.error('Failed to load organizations');
        setOrganizations([]);
      }
    };

    if (!id) {
      fetchOrganizations();
    }
  }, [id]);

  // ─── Fetch Employees ───
  useEffect(() => {
    const fetchAllEmployees = async () => {
      setGridLoading(true);
      try {
        const response = await masterAPI.getUsers({ limit: 2000, isActive: true, all_companies: true });
        const rows = response?.data || [];
        setGridEmployees(rows);
      } catch (err) {
        toast.error('Failed to load employees');
        setGridEmployees([]);
      } finally {
        setGridLoading(false);
      }
    };

    if (!id) {
      fetchAllEmployees();
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setSelectedUserIds([]);
    }
  }, [id]);

  useEffect(() => {
    if (!id && Array.isArray(preselectedEmployeeIds) && preselectedEmployeeIds.length > 0) {
      setSelectedUserIds(preselectedEmployeeIds);
    }
  }, [id, preselectedEmployeeIds]);

  useEffect(() => {
    const fetchPolicyCatalogs = async () => {
      try {
        const [leaveRes, weekOffRes, holidayRes, shiftRes] = await Promise.all([
          masterAPI.getLeavePolicies({ limit: 500 }).catch(() => ({ data: [] })),
          masterAPI.getWeekOffPolicies().catch(() => ({ data: [] })),
          masterAPI.getHolidayPolicies({ year: new Date().getFullYear() }).catch(() => ({ data: [] })),
          masterAPI.getShifts({ limit: 500 }).catch(() => ({ data: [] }))
        ]);

        setLeavePolicies(Array.isArray(leaveRes?.data) ? leaveRes.data : []);
        setWeekOffPolicies(Array.isArray(weekOffRes?.data) ? weekOffRes.data : []);
        setHolidayPolicies(Array.isArray(holidayRes?.data) ? holidayRes.data : []);
        setShiftPolicies(Array.isArray(shiftRes?.data) ? shiftRes.data : []);
      } catch {
        setLeavePolicies([]);
        setWeekOffPolicies([]);
        setHolidayPolicies([]);
        setShiftPolicies([]);
      }
    };

    if (!id) {
      fetchPolicyCatalogs();
    }
  }, [id]);

  const employeeName = useMemo(() => {
    if (!profile?.employee) return 'Employee';
    const e = profile.employee;
    return `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.username || 'Employee';
  }, [profile]);

  const currentOrgName = useMemo(() => {
    if (id && profile?.employee?.company_id) {
      return profile.employee.company_id.company_name || profile.employee.company_id.name || 'N/A';
    }
    if (migratingEmployeeId) {
      const emp = gridEmployees?.find(e => e._id === migratingEmployeeId);
      return emp?.company_id?.company_name || (typeof emp?.company_id === 'object' ? (emp.company_id.company_name || emp.company_id.name || 'N/A') : 'N/A');
    }
    return 'N/A';
  }, [id, profile, migratingEmployeeId, gridEmployees]);



  const handleBulkManualAdjustment = async (e) => {
    e.preventDefault();
    if (!id) return toast.error('No employee selected');
    
    try {
      const response = await attendanceAPI.bulkUpdateAttendance({ 
        employee_id: id, 
        ...bulkManualForm 
      });
      if (response.success) {
        toast.success(response.message || 'Bulk adjustment successful');
        // Force a slightly delayed refresh to ensure DB consistency
        setTimeout(() => {
          fetchData();
        }, 500);
      } else {
        toast.error(response.message || 'Bulk adjustment failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error processing bulk adjustment');
    }
  };

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
    if (!id) {
      toast.error('No employee ID selected for balance update');
      return;
    }
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
      toast.success('Leave balance updated successfully');
      setShowLeaveBalanceForm(false);
      fetchData();
    } catch (error) {
      console.error('[Update Balance Error]', error);
      const msg = error?.message || error?.error || 'Failed to update leave balance';
      toast.error(msg, { duration: 5000 });
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
        const response = await masterAPI.getUsers({ limit: 2000, isActive: true, all_companies: true });
        const rows = response?.data || [];
        setGridEmployees(rows);
      }
    } catch (error) {
      toast.error(error?.message || 'Migration failed');
    }
  };

  // ─── Individual Policy Update Handler ───
  const handleUpdateIndividualPolicies = async (e) => {
    if (e) e.preventDefault();
    try {
      const result = await masterAPI.assignPolicyToUser(id, policyForm);
      if (result) {
        toast.success('Individual policies updated successfully');
        fetchData(); // Reload to reflect any derived changes
      }
    } catch (error) {
      toast.error(error?.message || 'Failed to update individual policies');
    }
  };

  // ─── Bulk Policy Handler ───
  const handleBulkAssignPolicies = async () => {
    if (selectedUserIds.length === 0) {
      toast.error('Select at least one user');
      return;
    }

    const hasAnySelection =
      !!bulkPolicyForm.weekoff_policy_id ||
      !!bulkPolicyForm.holiday_policy_id ||
      !!bulkPolicyForm.shift_id ||
      (bulkPolicyForm.leave_policy_ids || []).length > 0;

    if (!hasAnySelection) {
      toast.error('Select at least one policy type to assign');
      return;
    }

    setBulkPolicyLoading(true);
    try {
      const payload = {
        user_ids: selectedUserIds,
        ...(bulkPolicyForm.weekoff_policy_id ? { weekoff_policy_id: bulkPolicyForm.weekoff_policy_id } : {}),
        ...(bulkPolicyForm.holiday_policy_id ? { holiday_policy_id: bulkPolicyForm.holiday_policy_id } : {}),
        ...(bulkPolicyForm.shift_id ? { shift_id: bulkPolicyForm.shift_id } : {}),
        ...(bulkPolicyForm.leave_policy_ids.length > 0 ? { leave_policy_ids: bulkPolicyForm.leave_policy_ids } : {})
      };

      const result = await masterAPI.bulkAssignPoliciesToUsers(payload);
      if (result.success) {
        toast.success(`Assigned policies to ${result.assignedCount} users`);
        setShowBulkPolicyModal(false);
        setSelectedUserIds([]);
        setBulkPolicyForm({
          weekoff_policy_id: '',
          holiday_policy_id: '',
          shift_id: '',
          leave_policy_ids: []
        });
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
      <div style={{ padding: '12px', minHeight: '100vh', background: 'linear-gradient(180deg, #f8fbff 0%, #f3f6fb 100%)' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          {/* Header with Organization Filter & Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <h1 style={{ margin: 0, color: THEME.navy, fontSize: '28px', fontWeight: '800', letterSpacing: '-0.025em' }}>Employee Directory</h1>
                <span style={{ fontSize: '14px', color: THEME.muted, fontWeight: '600' }}>
                  Showing {Math.min(filteredEmployees.length, (currentPage-1)*pageSize + 1)}-{Math.min(filteredEmployees.length, currentPage*pageSize)} of {filteredEmployees.length} Employees
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', color: THEME.muted, fontSize: '14px', fontWeight: '500' }}>Manage workforce policies and profiles</p>
              
              {/* Search Bar */}
              <div style={{ marginTop: '16px', position: 'relative', maxWidth: '400px' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: THEME.muted, fontSize: '16px' }}>🔍</span>
                <input 
                  type="text" 
                  placeholder="Search by name, ID or username..." 
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    ...inputStyle,
                    paddingLeft: '38px',
                    height: '44px',
                    borderColor: searchTerm ? THEME.primary : THEME.border,
                    background: '#fff',
                    boxShadow: THEME.shadow
                  }}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: THEME.muted }}
                  >
                    ✕
                  </button>
                )}
              </div>
              {selectedUserIds.length > 0 && (
                <div style={{ margin: '8px 0 0 0', display: 'inline-block', background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                  ✨ {selectedUserIds.length} users selected
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {/* Page Size Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: `1px solid ${THEME.border}`, padding: '4px 12px', borderRadius: '10px', fontSize: '12px', color: THEME.muted }}>
                <span>Show</span>
                <select 
                  value={pageSize} 
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{ border: 'none', background: 'transparent', fontWeight: '700', color: THEME.text, cursor: 'pointer', outline: 'none' }}
                >
                  {[10, 24, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              {/* View Toggle */}
              <div style={{ display: 'flex', background: '#fff', border: `1px solid ${THEME.border}`, padding: '4px', borderRadius: '10px', boxShadow: THEME.shadow }}>
                <button 
                  onClick={() => setViewMode('grid')}
                  style={{
                    ...buttonStyle,
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    background: viewMode === 'grid' ? '#f1f5f9' : 'transparent',
                    color: viewMode === 'grid' ? '#0f172a' : '#94a3b8'
                  }}
                >
                  Grid
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  style={{
                    ...buttonStyle,
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    background: viewMode === 'list' ? '#f1f5f9' : 'transparent',
                    color: viewMode === 'list' ? '#0f172a' : '#94a3b8'
                  }}
                >
                  List
                </button>
              </div>

              {/* Group By Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: `1px solid ${THEME.border}`, padding: '4px 12px', borderRadius: '10px', fontSize: '12px', color: THEME.muted }}>
                <span>Group by</span>
                <select 
                  value={groupBy} 
                  onChange={(e) => {
                    setGroupBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ border: 'none', background: 'transparent', fontWeight: '700', color: THEME.text, cursor: 'pointer', outline: 'none', minWidth: '100px' }}
                >
                  <option value="none">None</option>
                  <option value="organization">Organization</option>
                  <option value="team">Team</option>
                </select>
              </div>

              <button 
                onClick={() => setShowBulkPolicyModal(true)}
                style={{
                  ...buttonStyle,
                  background: THEME.primary,
                  color: '#fff',
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: '700',
                  borderRadius: '10px',
                  boxShadow: THEME.shadow
                }}
              >
                Bulk assign policies
              </button>
            </div>
          </div>

          {/* Employee Directory Content */}
          {gridLoading ? (
            <div style={{ textAlign: 'center', color: THEME.muted, padding: '40px' }}>Loading employees...</div>
          ) : gridEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', color: THEME.muted, padding: '40px' }}>No employees found</div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              {(groupBy === 'none' ? [{ name: null, items: paginatedEmployees }] : Object.keys(groupedEmployeesData).sort().map(name => ({ name, items: groupedEmployeesData[name] }))).map((group, gIdx) => (
                <div key={group.name || gIdx}>
                  {group.name && (
                    <h3 style={{ 
                      margin: '0 0 20px 0', 
                      padding: '0 0 12px 0', 
                      fontSize: '18px', 
                      fontWeight: '800', 
                      color: THEME.navy, 
                      borderBottom: `2px solid ${THEME.primary}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span>{group.name}</span>
                      <span style={{ fontSize: '14px', color: THEME.muted, fontWeight: '600', background: '#f1f5f9', padding: '2px 10px', borderRadius: '12px' }}>{group.items.length}</span>
                    </h3>
                  )}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '20px'
                  }}>
                    {group.items.map((emp) => {
                      const initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase();
                      const goToProfile = (e) => {
                        e.stopPropagation();
                        setLocalEmployeeId(emp._id);
                      };
                      return (
                        <div 
                          key={emp._id}
                          style={{
                            ...cardStyle,
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            cursor: 'pointer',
                            border: `1px solid ${THEME.border}`,
                          }}
                          onClick={goToProfile}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)';
                            e.currentTarget.style.borderColor = THEME.primary;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = THEME.shadow;
                            e.currentTarget.style.borderColor = THEME.border;
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: THEME.muted, cursor: 'pointer' }} onClick={e => e.stopPropagation()}>
                              <input type="checkbox" checked={selectedUserIds.includes(emp._id)} onChange={(e) => {
                                  if (e.target.checked) setSelectedUserIds(p => [...p, emp._id]);
                                  else setSelectedUserIds(p => p.filter(idV => idV !== emp._id));
                                }} />
                              Select
                            </label>
                            <span style={{ color: '#10b981', background: '#f0fdf4', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '700' }}>Active</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                            <div style={{
                              width: '48px', height: '48px', borderRadius: '12px', background: '#f1f5f9',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.muted, fontSize: '18px', fontWeight: '700'
                            }}>
                              {initials}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: '700', color: THEME.text, fontSize: '14px' }}>{emp.first_name} {emp.last_name}</div>
                              <div style={{ color: THEME.muted, fontSize: '11px' }}>ID: {emp.employee_code || '-'}</div>
                            </div>
                          </div>

                          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontSize: '11px', color: THEME.muted }}>{emp.designation?.designation_name || emp.designation || 'Specialist'}</div>
                            <div style={{ fontSize: '11px', color: THEME.muted }}>{emp.company_id?.company_name || 'Novusha Consulting'}</div>
                          </div>

                          <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: `1px dotted ${THEME.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: THEME.muted }}>No contact</span>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.muted, border: `1px solid ${THEME.border}`, fontSize: '12px' }}>
                              👤
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {(groupBy === 'none' ? [{ name: null, items: paginatedEmployees }] : Object.keys(groupedEmployeesData).sort().map(name => ({ name, items: groupedEmployeesData[name] }))).map((group, gIdx) => (
                <div key={group.name || gIdx}>
                  {group.name && (
                    <h3 style={{ 
                      margin: '0 0 15px 0', 
                      fontSize: '16px', 
                      fontWeight: '700', 
                      color: THEME.navy,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>{group.name}</span>
                      <span style={{ fontSize: '12px', color: THEME.muted, background: '#f1f5f9', padding: '1px 8px', borderRadius: '10px' }}>{group.items.length}</span>
                    </h3>
                  )}
                  <div style={{ ...cardStyle, padding: '0', overflowX: 'auto', border: `1px solid ${THEME.border}`, background: '#fff' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${THEME.border}` }}>
                          <th style={{ padding: '20px 16px', width: '40px' }}>
                            <input type="checkbox" onChange={(e) => {
                                if (e.target.checked) {
                                  const ids = group.items.map(u => u._id);
                                  setSelectedUserIds(p => [...new Set([...p, ...ids])]);
                                } else {
                                  const ids = new Set(group.items.map(u => u._id));
                                  setSelectedUserIds(p => p.filter(id => !ids.has(id)));
                                }
                            }} />
                          </th>
                          <th style={{ padding: '16px', color: THEME.muted, fontWeight: '700', fontSize: '11px' }}>EMPLOYEE</th>
                          <th style={{ padding: '16px', color: THEME.muted, fontWeight: '700', fontSize: '11px' }}>ID</th>
                          <th style={{ padding: '16px', color: THEME.muted, fontWeight: '700', fontSize: '11px' }}>DESIGNATION</th>
                          <th style={{ padding: '16px', color: THEME.muted, fontWeight: '700', fontSize: '11px' }}>COMPANY</th>
                          <th style={{ padding: '16px', color: THEME.muted, fontWeight: '700', fontSize: '11px' }}>STATUS</th>
                          <th style={{ padding: '16px', color: THEME.muted, fontWeight: '700', fontSize: '11px' }}>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((emp) => (
                          <tr 
                            key={emp._id} 
                            onClick={() => setLocalEmployeeId(emp._id)}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            style={{ borderBottom: `1px solid ${THEME.border}`, cursor: 'pointer', transition: 'background 0.2s' }}
                          >
                            <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                              <input type="checkbox" checked={selectedUserIds.includes(emp._id)} onChange={(e) => {
                                  if (e.target.checked) setSelectedUserIds(p => [...p, emp._id]);
                                  else setSelectedUserIds(p => p.filter(idV => idV !== emp._id));
                                }} />
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: THEME.muted }}>
                                  {(emp.first_name?.[0] || '') + (emp.last_name?.[0] || '')}
                                </div>
                                <div style={{ fontWeight: '600', color: THEME.text }}>{emp.first_name} {emp.last_name}</div>
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px', color: THEME.text }}>{emp.employee_code || '-'}</td>
                            <td style={{ padding: '14px 16px', color: THEME.muted }}>{emp.designation?.designation_name || emp.designation || '-'}</td>
                            <td style={{ padding: '14px 16px', color: THEME.muted }}>{emp.company_id?.company_name || 'Novusha'}</td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ color: '#10b981', background: '#f0fdf4', padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: '700' }}>Active</span>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMigratingEmployeeId(emp._id);
                                  setShowMigrationModal(true);
                                }}
                                style={{ padding: '6px', borderRadius: '8px', background: '#f3f4f6', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                              >
                                🔄
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && !id && groupBy === 'none' && (
            <div style={{ 
              marginTop: '30px', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '12px',
              padding: '20px',
              background: '#fff',
              borderRadius: '16px',
              border: `1px solid ${THEME.border}`,
              boxShadow: THEME.shadow,
              flexWrap: 'wrap'
            }}>
              <button 
                onClick={() => {
                  setCurrentPage(prev => Math.max(1, prev - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === 1}
                style={{ 
                  ...buttonStyle, 
                  background: '#fff', 
                  border: `1px solid ${THEME.border}`,
                  color: currentPage === 1 ? THEME.muted : THEME.primary,
                  opacity: currentPage === 1 ? 0.5 : 1,
                  padding: '10px 18px',
                  boxShadow: THEME.shadow,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                ← Previous
              </button>
              
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  // Only show current page, neighbors, and boundaries
                  if (
                    pageNum === 1 || 
                    pageNum === totalPages || 
                    (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
                  ) {
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setCurrentPage(pageNum);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        style={{
                          ...buttonStyle,
                          background: currentPage === pageNum ? THEME.primary : '#fff',
                          color: currentPage === pageNum ? '#fff' : THEME.text,
                          border: `1px solid ${currentPage === pageNum ? THEME.primary : THEME.border}`,
                          width: '42px',
                          height: '42px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          fontWeight: '700',
                          boxShadow: THEME.shadow,
                          borderRadius: '10px'
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  if (pageNum === currentPage - 3 || pageNum === currentPage + 3) {
                    return <span key={i} style={{ color: THEME.muted, alignSelf: 'center', fontWeight: 'bold' }}>...</span>;
                  }
                  return null;
                })}
              </div>

              <button 
                onClick={() => {
                  setCurrentPage(prev => Math.min(totalPages, prev + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage === totalPages}
                style={{ 
                  ...buttonStyle, 
                  background: '#fff', 
                  border: `1px solid ${THEME.border}`,
                  color: currentPage === totalPages ? THEME.muted : THEME.primary,
                  opacity: currentPage === totalPages ? 0.5 : 1,
                  padding: '10px 18px',
                  boxShadow: THEME.shadow,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                Next →
              </button>
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
                
                {/* Current Org Indicator */}
                <div style={{
                  marginBottom: '16px',
                  padding: '12px',
                  background: '#f8fafc',
                  borderRadius: '10px',
                  border: `1px solid ${THEME.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{ width: '36px', height: '36px', background: '#ecf2ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏢</div>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: THEME.muted, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MIGRATING FROM</span>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: THEME.navy }}>{currentOrgName}</span>
                  </div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ fontWeight: '700', fontSize: '13px', color: '#000', whiteSpace: 'nowrap', minWidth: '160px' }}>Destination Organization:</label>
                    <select 
                      value={destOrgId}
                      onChange={(e) => setDestOrgId(e.target.value)}
                      style={{ ...inputStyle, padding: '10px 12px', fontSize: '12px', flex: 1 }}
                    >
                      <option value="">Select organization</option>
                      {organizations.map((org) => (
                        <option key={org._id} value={org._id}>
                          {org.name} {org.hodName ? `(HOD: ${org.hodName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
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
                      background: THEME.bg,
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

                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontWeight: '700', fontSize: '12px', color: '#000', whiteSpace: 'nowrap', minWidth: '160px' }}>Week-Off Policy (optional):</label>
                  <select
                    value={bulkPolicyForm.weekoff_policy_id}
                    onChange={(e) => setBulkPolicyForm((prev) => ({ ...prev, weekoff_policy_id: e.target.value }))}
                    style={{ ...inputStyle, padding: '10px 12px', fontSize: '12px', flex: 1 }}
                  >
                    <option value="">Do not change</option>
                    {weekOffPolicies.map((p) => (
                      <option key={p._id} value={p._id}>{p.policy_name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontWeight: '700', fontSize: '12px', color: '#000', whiteSpace: 'nowrap', minWidth: '160px' }}>Shift Policy (optional):</label>
                  <select
                    value={bulkPolicyForm.shift_id}
                    onChange={(e) => setBulkPolicyForm((prev) => ({ ...prev, shift_id: e.target.value }))}
                    style={{ ...inputStyle, padding: '10px 12px', fontSize: '12px', flex: 1 }}
                  >
                    <option value="">Do not change</option>
                    {shiftPolicies.map((p) => (
                      <option key={p._id} value={p._id}>{p.shift_name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontWeight: '700', fontSize: '12px', color: '#000', whiteSpace: 'nowrap', minWidth: '160px' }}>Holiday Policy (optional):</label>
                  <select
                    value={bulkPolicyForm.holiday_policy_id}
                    onChange={(e) => setBulkPolicyForm((prev) => ({ ...prev, holiday_policy_id: e.target.value }))}
                    style={{ ...inputStyle, padding: '10px 12px', fontSize: '12px', flex: 1 }}
                  >
                    <option value="">Do not change</option>
                    {holidayPolicies.map((p) => (
                      <option key={p._id} value={p._id}>{p.policy_name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '12px', color: '#000' }}>Leave Policy (optional, multi-select):</label>
                  <div style={{ border: `1px solid ${THEME.border}`, borderRadius: '8px', padding: '10px', maxHeight: '180px', overflowY: 'auto' }}>
                    {leavePolicies.length === 0 ? (
                      <div style={{ color: THEME.muted, fontSize: '12px' }}>No leave policies found</div>
                    ) : (
                      leavePolicies.map((policy) => (
                        <label key={policy._id} style={{ display: 'flex', gap: '8px', padding: '6px 0', alignItems: 'center', fontSize: '12px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={bulkPolicyForm.leave_policy_ids.includes(policy._id)}
                            onChange={(e) => {
                              setBulkPolicyForm((prev) => {
                                const nextList = e.target.checked
                                  ? [...prev.leave_policy_ids, policy._id]
                                  : prev.leave_policy_ids.filter((idValue) => idValue !== policy._id);
                                return { ...prev, leave_policy_ids: nextList };
                              });
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
                      setBulkPolicyForm({
                        weekoff_policy_id: '',
                        holiday_policy_id: '',
                        shift_id: '',
                        leave_policy_ids: []
                      });
                    }}
                    style={{
                      ...buttonStyle,
                      background: THEME.bg,
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
    <div style={{ padding: '12px', background: THEME.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: profile.employee.photo ? `url(${profile.employee.photo})` : THEME.primary,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '22px',
              fontWeight: '800'
            }}>
              {!profile.employee.photo && (profile.employee.first_name?.[0] || profile.employee.username?.[0] || 'E').toUpperCase()}
            </div>
            <div>
              <h1 style={{ margin: 0, color: THEME.navy, fontSize: '24px', fontWeight: '800', letterSpacing: '-0.02em' }}>{employeeName}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '13px', color: THEME.muted, fontWeight: '500' }}>
                <span style={{ color: THEME.primary }}>#{profile.employee.employee_code || '-'}</span>
                <span>•</span>
                <span>{profile.employee.username}</span>
                <span style={{ padding: '2px 8px', background: '#ecfdf5', color: '#059669', borderRadius: '12px', fontSize: '10px', fontWeight: '700', marginLeft: '8px' }}>Active</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => {
                setMigratingEmployeeId(id);
                setShowMigrationModal(true);
              }} 
              style={{
                ...buttonStyle,
                background: '#fff',
                color: THEME.text,
                border: `1px solid ${THEME.border}`,
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '8px'
              }}
            >
              Migrate
            </button>
            <button 
              onClick={() => {
                if (localEmployeeId) setLocalEmployeeId(null);
                else navigate('/attendance/admin/attendance');
              }} 
              style={{
                ...buttonStyle,
                background: '#000',
                color: '#fff',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '8px'
              }}
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Action Highlights - Minimal */}
        {/* Action Highlights - Modern Stats Blocks */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          {[
            { label: 'ATTENDANCE', value: `${(profile.attendance || []).length} Records`, icon: '📖', color: '#64748b', bg: '#f1f5f9' },
            { label: 'LEAVE QUOTA', value: `${(profile.balances || []).length} Policies`, icon: '⭐', color: '#94a3b8', bg: '#f8fafc' },
            { label: 'PENDING', value: `${(profile.pendingLeaves || []).length} Requests`, icon: '🕒', color: '#94a3b8', bg: '#f8fafc' }
          ].map((stat, idx) => (
            <div key={idx} style={{ ...cardStyle, background: '#fff', border: `1px solid ${THEME.border}`, padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
               <div style={{ width: '48px', height: '48px', borderRadius: '12px', border: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{stat.icon}</div>
               <div>
                 <div style={{ fontSize: '10px', color: THEME.muted, fontWeight: '700', letterSpacing: '0.05em' }}>{stat.label}</div>
                 <div style={{ fontSize: '16px', color: THEME.text, fontWeight: '700' }}>{stat.value}</div>
               </div>
            </div>
          ))}
        </div>

        {/* Tab Navigation - Premium Indigo */}
        <div style={{ display: 'flex', gap: '30px', borderBottom: `1px solid ${THEME.border}`, marginBottom: '30px', padding: '0 10px' }}>
          {['Attendance', 'Leave', 'Policies', 'Actions'].map((label) => {
            const t = label.toLowerCase();
            const isActive = tab === t;
            return (
              <button 
                key={t}
                onClick={() => setTab(t)} 
                style={{
                  ...buttonStyle,
                  background: 'transparent',
                  color: isActive ? '#000' : THEME.muted,
                  borderBottom: isActive ? '2px solid #000' : '2px solid transparent',
                  padding: '12px 0',
                  fontSize: '14px',
                  fontWeight: isActive ? '700' : '500',
                  borderRadius: '0',
                  marginBottom: '-1px'
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Attendance Filter */}
        <div style={{ ...cardStyle, marginBottom: '12px', borderLeft: `4px solid ${THEME.green}`, padding: '16px' }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', color: THEME.navy, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📅 Filter by Date Range</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px 10px', flexWrap: 'wrap' }}>
              <label style={{ fontWeight: '700', fontSize: '12px', color: '#000', minWidth: '60px' }}>Month:</label>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px', flex: '1 1 180px' }}
              >
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px 10px', flexWrap: 'wrap' }}>
              <label style={{ fontWeight: '700', fontSize: '12px', color: '#000', minWidth: '50px' }}>Year:</label>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px', flex: '1 1 180px' }}
              >
                {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', paddingTop: '16px', borderTop: `1px solid ${THEME.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px 10px', flexWrap: 'wrap' }}>
              <label style={{ fontWeight: '700', fontSize: '12px', color: '#000', minWidth: '80px' }}>From Date:</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px', flex: '1 1 180px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px 10px', flexWrap: 'wrap' }}>
              <label style={{ fontWeight: '700', fontSize: '12px', color: '#000', minWidth: '60px' }}>To Date:</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px', flex: '1 1 180px' }} />
            </div>
          </div>
        </div>

      {tab === 'attendance' && (
        <div style={{ ...cardStyle, padding: '12px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '14px' }}>📊 Daily Records</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: THEME.navy }}>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: '700', borderBottom: `2px solid ${THEME.border}` }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: '700', borderBottom: `2px solid ${THEME.border}` }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: '700', borderBottom: `2px solid ${THEME.border}` }}>In</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: '700', borderBottom: `2px solid ${THEME.border}` }}>Out</th>
                  <th style={{ textAlign: 'right', padding: '12px', fontWeight: '700', borderBottom: `2px solid ${THEME.border}` }}>Hours</th>
                </tr>
              </thead>
              <tbody>
                {(profile.attendance || []).map((row) => (
                  <tr key={row._id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                    <td style={{ padding: '6px 8px' }}>{new Date(row.attendance_date).toLocaleDateString()}</td>
                    <td style={{ padding: '6px 8px' }}><span style={{ background: THEME.bg, padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{row.status}</span></td>
                    <td style={{ padding: '6px 8px' }}>{row.first_in ? new Date(row.first_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                    <td style={{ padding: '6px 8px' }}>{row.last_out ? new Date(row.last_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '500' }}>{toWhole(row.total_work_hours || 0)}h</td>
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
            <div style={{ ...cardStyle, borderLeft: `4px solid ${isEditingBalance ? THEME.amber : THEME.green}`, padding: '12px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '14px', color: isEditingBalance ? THEME.amber : THEME.green }}>
                {isEditingBalance ? '✏️ Edit Leave Balance' : '➕ Add Leave Balance'}
              </h3>
              <form onSubmit={handleUpdateBalance} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px 10px', flexWrap: 'wrap' }}>
                  <label style={{ fontWeight: '700', fontSize: '12px', color: '#000', minWidth: '60px' }}>Policy:</label>
                  <select style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px', flex: '1 1 180px' }} value={balanceForm.leave_policy_id} onChange={(e) => setBalanceForm({ ...balanceForm, leave_policy_id: e.target.value })}>
                    <option value="">Select policy</option>
                    {leavePolicies.map((p) => (
                      <option key={p._id} value={p._id}>{p.policy_name || p.leave_type}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px 10px', flexWrap: 'wrap' }}>
                  <label style={{ fontWeight: '700', fontSize: '12px', color: '#000', minWidth: '60px' }}>Opening:</label>
                  <input type="number" step="1" style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px', flex: '1 1 100px' }} value={balanceForm.opening_balance} onChange={(e) => setBalanceForm({ ...balanceForm, opening_balance: e.target.value })} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px 10px', flexWrap: 'wrap' }}>
                  <label style={{ fontWeight: '700', fontSize: '12px', color: '#000', minWidth: '50px' }}>Used:</label>
                  <input type="number" step="1" style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px', flex: '1 1 100px' }} value={balanceForm.used} onChange={(e) => setBalanceForm({ ...balanceForm, used: e.target.value })} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px 10px', flexWrap: 'wrap' }}>
                  <label style={{ fontWeight: '700', fontSize: '12px', color: '#000', minWidth: '60px' }}>Pending:</label>
                  <input type="number" step="1" style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px', flex: '1 1 100px' }} value={balanceForm.pending} onChange={(e) => setBalanceForm({ ...balanceForm, pending: e.target.value })} />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px' }}>
                  <button type="submit" style={{ ...buttonStyle, background: isEditingBalance ? THEME.amber : THEME.green, color: '#fff', flex: 1, padding: '8px 10px', fontSize: '12px' }}>
                    {isEditingBalance ? 'Update Balance' : 'Save Balance'}
                  </button>
                  <button type="button" onClick={() => setShowLeaveBalanceForm(false)} style={{ ...buttonStyle, background: THEME.bg, color: THEME.navy, border: `1px solid ${THEME.border}`, flex: 1, padding: '8px 10px', fontSize: '12px' }}>Cancel</button>
                </div>
              </form>
            </div>
          )}
          <div style={{ ...cardStyle, padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '14px' }}>💰 Leave Balance</h3>
              {!showLeaveBalanceForm && (
                <button 
                  onClick={() => {
                    setBalanceForm({ leave_policy_id: '', opening_balance: 0, used: 0, pending: 0 });
                    setShowLeaveBalanceForm(true);
                  }} 
                  style={{ ...buttonStyle, background: THEME.green, color: '#fff', padding: '6px 12px', fontSize: '12px' }}
                >
                  + Add
                </button>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: THEME.navy }}>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: '700', borderBottom: `2px solid ${THEME.border}` }}>Policy</th>
                    <th style={{ textAlign: 'right', padding: '12px', fontWeight: '700', borderBottom: `2px solid ${THEME.border}` }}>Opening</th>
                    <th style={{ textAlign: 'right', padding: '12px', fontWeight: '700', borderBottom: `2px solid ${THEME.border}` }}>Used</th>
                    <th style={{ textAlign: 'right', padding: '12px', fontWeight: '700', borderBottom: `2px solid ${THEME.border}` }}>Pending</th>
                    <th style={{ textAlign: 'right', padding: '12px', fontWeight: '700', borderBottom: `2px solid ${THEME.border}`, color: THEME.primary }}>Net Available</th>
                    <th style={{ textAlign: 'right', padding: '12px', fontWeight: '700', borderBottom: `2px solid ${THEME.border}` }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(profile.balances || []).map((b) => (
                    <tr key={b._id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                      <td style={{ padding: '6px 8px' }}>{b.leave_policy_id?.policy_name || b.leave_type || 'Policy'}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{toWhole(b.opening_balance || 0)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{toWhole(b.used ?? b.consumed ?? 0)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                        {String((b.leave_type || b.leave_policy_id?.leave_type || '')).toLowerCase().includes('lwp')
                          ? 0
                          : toWhole(b.pending ?? b.pending_approval ?? 0)}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '700', color: THEME.primary }}>
                        {String((b.leave_type || b.leave_policy_id?.leave_type || '')).toLowerCase().includes('lwp')
                          ? 0
                          : Math.max(0, (b.opening_balance || 0) - (b.used || 0) - (b.pending_approval || 0))}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setBalanceForm({
                              leave_policy_id: b.leave_policy_id?._id || b.leave_policy_id,
                              opening_balance: b.opening_balance || 0,
                              used: b.used ?? b.consumed ?? 0,
                              pending: b.pending ?? b.pending_approval ?? 0
                            });
                            setShowLeaveBalanceForm(true);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: THEME.navy,
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                          title="Edit Balance"
                        >
                          ✏️
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(profile.balances || []).length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '12px', textAlign: 'center', color: THEME.muted }}>No leave balances</td>
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
                  <tr style={{ background: '#f8fafc', color: THEME.navy }}>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: '700', borderBottom: `2px solid ${THEME.border}` }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: '700', borderBottom: `2px solid ${THEME.border}` }}>From</th>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: '700', borderBottom: `2px solid ${THEME.border}` }}>To</th>
                    <th style={{ textAlign: 'left', padding: '12px', fontWeight: '700', borderBottom: `2px solid ${THEME.border}` }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(profile.leaves || []).map((l) => (
                    <tr key={l._id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                      <td style={{ padding: '6px 8px' }}>{l.leave_type || l.leave_policy_id?.policy_name || 'Leave'}</td>
                      <td style={{ padding: '6px 8px' }}>{l.from_date ? new Date(l.from_date).toLocaleDateString() : '--'}</td>
                      <td style={{ padding: '6px 8px' }}>{l.to_date ? new Date(l.to_date).toLocaleDateString() : '--'}</td>
                      <td style={{ padding: '6px 8px' }}><span style={{ background: THEME.bg, padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{l.approval_status || l.status || '--'}</span></td>
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

      {tab === 'policies' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '20px' }}>
          <div style={{ ...cardStyle, borderLeft: `5px solid ${THEME.primary}`, padding: '24px' }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', color: THEME.navy, display: 'flex', alignItems: 'center', gap: '10px' }}>
              🛡️ Individual Policy Management
            </h2>
            <p style={{ color: THEME.muted, fontSize: '13px', marginBottom: '24px' }}>
              Override organization-level defaults for this employee. Select the policies that should apply specifically to this individual.
            </p>

            <form onSubmit={handleUpdateIndividualPolicies} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontWeight: '700', fontSize: '13px', color: '#000', whiteSpace: 'nowrap', minWidth: '120px' }}>Week-Off Policy:</label>
                  <select
                    value={policyForm.weekoff_policy_id}
                    onChange={(e) => setPolicyForm((prev) => ({ ...prev, weekoff_policy_id: e.target.value }))}
                    style={{ ...inputStyle, padding: '12px', background: THEME.bg, flex: 1 }}
                  >
                    <option value="">Use Organization default</option>
                    {weekOffPolicies.map((p) => (
                      <option key={p._id} value={p._id}>{p.policy_name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontWeight: '700', fontSize: '13px', color: '#000', whiteSpace: 'nowrap', minWidth: '100px' }}>Shift Policy:</label>
                  <select
                    value={policyForm.shift_id}
                    onChange={(e) => setPolicyForm((prev) => ({ ...prev, shift_id: e.target.value }))}
                    style={{ ...inputStyle, padding: '12px', background: THEME.bg, flex: 1 }}
                  >
                    <option value="">Use Organization default</option>
                    {shiftPolicies.map((p) => (
                      <option key={p._id} value={p._id}>{p.shift_name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontWeight: '700', fontSize: '13px', color: '#000', whiteSpace: 'nowrap', minWidth: '110px' }}>Holiday Policy:</label>
                  <select
                    value={policyForm.holiday_policy_id}
                    onChange={(e) => setPolicyForm((prev) => ({ ...prev, holiday_policy_id: e.target.value }))}
                    style={{ ...inputStyle, padding: '12px', background: THEME.bg, flex: 1 }}
                  >
                    <option value="">Use Organization default</option>
                    {holidayPolicies.map((p) => (
                      <option key={p._id} value={p._id}>{p.policy_name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                  <button
                    type="submit"
                    style={{
                      ...buttonStyle,
                      background: THEME.primary,
                      color: '#fff',
                      padding: '14px 28px',
                      fontSize: '14px',
                      fontWeight: '700',
                      borderRadius: '10px',
                      boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
                    }}
                  >
                    💾 Save Policy Changes
                  </button>
                </div>
            </form>
          </div>
        </div>
      )}

      {tab === 'actions' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
          <div style={{ ...cardStyle, borderLeft: `4px solid ${THEME.navy}`, padding: '12px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '14px', color: THEME.navy }}>✏️ Manual Attendance Update</h3>
            <form onSubmit={handleManualAdjustment} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px 10px', flexWrap: 'wrap' }}>
                <label style={{ fontWeight: '700', fontSize: '12px', color: '#000', minWidth: '50px' }}>Date:</label>
                <input type="date" style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px', flex: '1 1 180px' }} value={manualForm.attendance_date} onChange={(e) => setManualForm({ ...manualForm, attendance_date: e.target.value })} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px 10px', flexWrap: 'wrap' }}>
                <label style={{ fontWeight: '700', fontSize: '12px', color: '#000', minWidth: '60px' }}>Status:</label>
                <select style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px', flex: '1 1 180px' }} value={manualForm.status} onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}>
                  <option value="present">present</option>
                  <option value="absent">absent</option>
                  <option value="half_day">half_day</option>
                  <option value="incomplete">incomplete</option>
                  <option value="leave">leave</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px 10px', flexWrap: 'wrap' }}>
                <label style={{ fontWeight: '700', fontSize: '12px', color: '#000', minWidth: '60px' }}>First In:</label>
                <input type="datetime-local" style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px', flex: '1 1 200px' }} value={manualForm.first_in} onChange={(e) => setManualForm({ ...manualForm, first_in: e.target.value })} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px 10px', flexWrap: 'wrap' }}>
                <label style={{ fontWeight: '700', fontSize: '12px', color: '#000', minWidth: '60px' }}>Last Out:</label>
                <input type="datetime-local" style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px', flex: '1 1 200px' }} value={manualForm.last_out} onChange={(e) => setManualForm({ ...manualForm, last_out: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '12px', color: '#000' }}>Remarks:</label>
                <textarea rows={2} style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px' }} value={manualForm.remarks} onChange={(e) => setManualForm({ ...manualForm, remarks: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px' }}>
                <button type="submit" style={{ ...buttonStyle, background: THEME.primary, color: '#fff', flex: 1, padding: '10px', fontSize: '13px', fontWeight: '700' }}>Save Update</button>
              </div>
            </form>
          </div>

          {/* Attendance Continuity (Bulk Update) */}
          <div style={{ ...cardStyle, borderLeft: `4px solid ${THEME.indigo}`, padding: '12px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '14px', color: THEME.indigo }}>📅 Attendance Continuity (Bulk Update)</h3>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
              Update attendance records for a date range in bulk. 
              <br/><strong>Note:</strong> Marking as 'present' will assign default time <strong>10:00 AM to 07:00 PM</strong>.
            </p>
            <form onSubmit={handleBulkManualAdjustment} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px 10px', flexWrap: 'wrap' }}>
                <label style={{ fontWeight: '700', fontSize: '12px', color: '#000', minWidth: '70px' }}>Start Date:</label>
                <input type="date" style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px', flex: '1 1 180px' }} value={bulkManualForm.startDate} onChange={(e) => setBulkManualForm({ ...bulkManualForm, startDate: e.target.value })} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px 10px', flexWrap: 'wrap' }}>
                <label style={{ fontWeight: '700', fontSize: '12px', color: '#000', minWidth: '70px' }}>End Date:</label>
                <input type="date" style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px', flex: '1 1 180px' }} value={bulkManualForm.endDate} onChange={(e) => setBulkManualForm({ ...bulkManualForm, endDate: e.target.value })} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px 10px', flexWrap: 'wrap' }}>
                <label style={{ fontWeight: '700', fontSize: '12px', color: '#000', minWidth: '60px' }}>Status:</label>
                <select 
                  style={{ 
                    ...inputStyle, 
                    padding: '8px 10px', 
                    fontSize: '12px', 
                    flex: '1 1 180px',
                    backgroundColor: '#fff',
                    fontWeight: '600'
                  }} 
                  value={bulkManualForm.status} 
                  onChange={(e) => setBulkManualForm({ ...bulkManualForm, status: e.target.value })}
                >
                  <option value="present">Present (10 AM - 7 PM)</option>
                  <option value="absent">Absent</option>
                  <option value="half_day">Half Day</option>
                  <option value="leave">Leave</option>
                  <option value="weekoff">Week Off</option>
                  <option value="holiday">Holiday</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center', gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                  <input type="checkbox" checked={bulkManualForm.excludeSundays} onChange={e => setBulkManualForm({ ...bulkManualForm, excludeSundays: e.target.checked })} />
                  Skip Sundays
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                  <input type="checkbox" checked={bulkManualForm.excludeSaturdays} onChange={e => setBulkManualForm({ ...bulkManualForm, excludeSaturdays: e.target.checked })} />
                  Skip Saturdays
                </label>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '12px', color: '#000' }}>Remarks:</label>
                <textarea rows={2} style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px' }} value={bulkManualForm.remarks} onChange={(e) => setBulkManualForm({ ...bulkManualForm, remarks: e.target.value })} placeholder="Reason for bulk update..." />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px' }}>
                <button type="submit" style={{ ...buttonStyle, background: THEME.indigo, color: '#fff', flex: 1, padding: '10px', fontSize: '13px', fontWeight: '700' }}>Apply Continuity Update</button>
              </div>
            </form>
          </div>

          {/* Migration Card */}
          <div style={{ ...cardStyle, borderLeft: `4px solid ${THEME.amber}`, padding: '12px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '14px', color: THEME.amber }}>🔄 Migrate Employee</h3>
            
            {/* Current Org Indicator */}
            <div style={{
              marginBottom: '12px',
              padding: '10px',
              background: '#fff9db',
              borderRadius: '8px',
              border: '1px solid #ffe066',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{ width: '32px', height: '32px', background: '#ffe066', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🏢</div>
              <div>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#868e96', display: 'block', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Migrating From</span>
                <span style={{ fontSize: '13px', fontWeight: '800', color: THEME.navy }}>{currentOrgName}</span>
              </div>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: THEME.muted }}>
              Move this employee to a different organization. Policies and leave balances will be updated automatically.
            </p>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ fontWeight: '700', fontSize: '12px', color: '#000', whiteSpace: 'nowrap', minWidth: '160px' }}>Destination Organization:</label>
                <select 
                  value={destOrgId}
                  onChange={(e) => setDestOrgId(e.target.value)}
                  style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px', flex: 1 }}
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
