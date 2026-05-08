import React, { useEffect, useMemo, useState } from 'react'; // Standardized path
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import moment from 'moment';
import { 
  FiActivity, FiArrowRight, FiCheckCircle, FiClock, FiUsers, FiAlertTriangle, 
  FiUser, FiX, FiCalendar, FiLogIn, FiLogOut, FiEdit, FiFileText, FiRefreshCw, FiDownload, FiSearch, FiGrid, FiList, FiChevronDown, FiChevronRight,
  FiGlobe
} from 'react-icons/fi';
import attendanceAPI from '../../../api/attendance/attendance.api';
import leaveAPI from '../../../api/attendance/leave.api';
import masterAPI from '../../../api/attendance/master.api';
import LocationPickerModal from '../common/LocationPickerModal';
import LocationDirectorySelect from '../common/LocationDirectorySelect';
import { formatTime12Hr, minutesToHours, formatDate, getAttendanceDateKey, formatAttendanceDate, ATTENDANCE_TIME_ZONE } from '../../attendance/utils/helpers';
import AdminApplyLeaveModal from './AdminApplyLeaveModal';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import './EmployeeProfilePerformance.css';

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
  padding: '0 12px',
  height: '42px',
  fontSize: '14px',
  color: THEME.text,
  background: '#ffffff',
  transition: 'border-color 0.2s',
  outline: 'none',
  boxSizing: 'border-box',
  lineHeight: '40px'
};

const RABS_ORG_KEY = 'rabs industries india private limited';
const getOrgName = (emp) => {
  const org = emp?.company_id?.company_name || 'No Organization';
  console.log('[EmployeeDirectory] org for emp', emp?._id || emp?.id || emp?.username || 'unknown', org);
  return org;
};
const isRabsOrganization = (name = '') => String(name).trim().toLowerCase() === RABS_ORG_KEY;
const sortGroupNamesWithRabsLast = (names = []) => {
  return [...names].sort((a, b) => {
    const aIsRabs = isRabsOrganization(a);
    const bIsRabs = isRabsOrganization(b);
    if (aIsRabs !== bIsRabs) return aIsRabs ? 1 : -1;
    return String(a || '').localeCompare(String(b || ''));
  });
};

const toWhole = (value) => Math.max(0, Math.floor(Number(value) || 0));
const formatLeaveDays = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  if (Math.abs(num % 1) < 1e-9) return String(Math.max(0, Math.trunc(num)));
  return String(Math.max(0, Number(num.toFixed(2))));
};
const IDEMPOTENT_LEAVE_TYPES = new Set(['lwp', 'privilege']);
const normalizeLeaveType = (value) => String(value || '').toLowerCase().trim();
const NON_WORKING_STATUSES = new Set(['absent', 'leave', 'pending_leave', 'weekly_off', 'holiday']);

const isNonWorkingStatus = (status) => NON_WORKING_STATUSES.has(String(status || '').toLowerCase());

const calculateWorkHours = (firstIn, lastOut) => {
  if (!firstIn || !lastOut) return 0;
  const inTime = moment(firstIn);
  const outTime = moment(lastOut);
  if (!inTime.isValid() || !outTime.isValid() || outTime.isBefore(inTime)) return 0;
  return outTime.diff(inTime, 'hours', true);
};

const getOrdinalNum = (n) => n + (n > 0 ? ['th', 'st', 'nd', 'rd'][(n > 3 && n < 21) || n % 10 > 3 ? 0 : n % 10] : '');
const formatDateOrdinal = (dateString) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '--';
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${getOrdinalNum(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}`;
};
const formatStatus = (s) => {
    if (!s) return '--';
    const str = String(s).replace(/_/g, ' ');
    return str.charAt(0).toUpperCase() + str.slice(1);
};

const getAttendanceDateLabel = (value) => formatAttendanceDate(value, 'd MMM, EEE', ATTENDANCE_TIME_ZONE);

const getCalendarStatusClass = (status = '') => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'weekly_off' || normalized === 'weekoff' || normalized === 'off') return 'weekly_off';
  if (normalized === 'present_late') return 'late';
  if (normalized === 'pending_leave') return 'leave';
  if (normalized === 'incomplete') return 'missed_punch';
  return normalized || 'none';
};

const formatLeaveBadge = (leaveType) => {
  if (!leaveType) return '';
  const lt = leaveType.toLowerCase();
  if (lt.includes('privilege') || lt.includes('earned')) return 'PL';
  if (lt.includes('without pay') || lt === 'lwp') return 'LWP';

  return leaveType
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);
};

const getCalendarStatusBadge = (status = '') => {
  const normalized = String(status || '').toLowerCase();
  const map = {
      weekly_off: 'Off',
      weekoff: 'Off',
      off: 'Off',
      holiday: 'Holiday',
      leave: 'Leave',
      half_day: 'Half Day',
      late: 'P',
      present_late: 'P',
      absent: 'Absent',
      present: 'P',
      incomplete: 'Missed',
      pending_leave: 'Pending LV'
  };
  return map[normalized] || '';
};

const StatusPill = ({ status, session, leaveType, leaveStatus }) => {
  const map = { 
    present: ['Present', 'present'], 
    absent: ['Absent', 'absent'], 
    leave: ['Leave', 'leave'], 
    pending_leave: ['Leave', 'leave'],
    half_day: ['Half Day', 'half_day'], 
    weekly_off: ['WeekOff', 'weekly_off'], 
    holiday: ['Holiday', 'holiday'],
    incomplete: ['Miss Punch', 'missed_punch'],
    missed_punch: ['Miss Punch', 'missed_punch']
  };
  let [label, cls] = map[status] || [status, 'default'];

  if (leaveType) {
    const badge = formatLeaveBadge(leaveType);
    const isApproved = leaveStatus === 'approved' || status === 'leave';
    const statusTxt = isApproved ? 'Approved' : 'Applied';
    
    if (status === 'half_day') {
      label = `${session ? (session.toLowerCase().includes('first') ? '1H' : '2H') : 'HD'} - ${badge} ${statusTxt}`;
    } else {
      label = `${badge} ${statusTxt}`;
    }
    cls = isApproved ? 'leave' : 'pending-leave';
  } else if (status === 'half_day') {
    label = session ? (session === 'First Half' || session === 'first_half' ? '1st Half' : '2nd Half') : '½ Day';
  }

  return (
    <td className={`ar-status-cell ar-status-${cls}`} style={{ border: '1px solid #dee2e6' }}>
      <div className="ar-status-inner">
        {label}
      </div>
    </td>
  );
};

const EmployeeProfileWorkspace = ({ employeeId, preselectedEmployeeIds = [], headerActions }) => {
    const { id: idFromRoute, teamId, userId, activeTab: urlTab } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
  const [localEmployeeId, setLocalEmployeeId] = useState(null);
  const [pickerModal, setPickerModal] = useState({ open: false, index: -1 });
  
  // Resolve the employee ID, ensuring we don't pick up route paths like 'teams' or 'users' as IDs
  const idFromParams = userId || idFromRoute;
  const isValidParamId = idFromParams && /^[0-9a-fA-F]{24}$/.test(idFromParams);
  
  const id = employeeId || localEmployeeId || (isValidParamId ? idFromParams : null);

  // ─── Pagination & View State ───
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [pageSize, setPageSize] = useState(24); // Items per page

  const now = new Date();
  const [startDate, setStartDate] = useState(moment().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(moment().format('YYYY-MM-DD'));
  const [selectedMonth, setSelectedMonth] = useState(moment().month());
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [exportModal, setExportModal] = useState({ open: false, orgName: '', items: [] });
  const [exportDateRange, setExportDateRange] = useState({ 
    start: moment().startOf('month').format('YYYY-MM-DD'), 
    end: moment().endOf('month').format('YYYY-MM-DD') 
  });

  const [tab, setTab] = useState(urlTab || 'performance');

  useEffect(() => {
    if (urlTab && urlTab !== tab) {
      setTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    // Determine the base path correctly whether in admin view or team view
    let newPath = '';
    if (id) {
      newPath = `/attendance/admin/employee/${id}/${newTab}`;
    } else if (teamId && userId) {
      newPath = `/attendance/teams/${teamId}/user/${userId}/${newTab}`;
    } else {
      // Fallback: search and replace in current path
      const pathSegments = location.pathname.split('/');
      const tabs = ['performance', 'attendance', 'leave', 'policies', 'actions'];
      const lastSegment = pathSegments[pathSegments.length - 1];
      if (tabs.includes(lastSegment)) {
        pathSegments[pathSegments.length - 1] = newTab;
      } else {
        pathSegments.push(newTab);
      }
      newPath = pathSegments.join('/');
    }
    navigate(newPath);
  };

  const handleSelectEmployee = (emp) => {
    const empId = emp._id;
    const username = emp.username || empId;

    let newPath = '';
    if (teamId) {
      newPath = `/attendance/teams/${teamId}/user/${username}/performance`;
    } else {
      newPath = `/attendance/admin/employee/${empId}/performance`;
    }
    
    setLocalEmployeeId(empId);
    navigate(newPath);
  };

  const handlePreviousUser = () => {
    if (!profile?.employee || !teamId || groupBy !== 'organization') {
      toast.error('Navigation not available');
      return;
    }

    const currentOrgName = profile.employee.company_id?.company_name || 'No Organization';
    // Filter employees by the same organization
    const orgEmployees = gridEmployees.filter(emp => {
      const empOrgName = emp.company_id?.company_name || 'No Organization';
      return empOrgName === currentOrgName;
    });

    if (orgEmployees.length === 0) {
      toast.error('No other users in this organization');
      return;
    }

    // Find the current user's index
    const currentIndex = orgEmployees.findIndex(emp => emp._id === id || emp.username === userId);
    if (currentIndex === -1) {
      toast.error('Could not find current user in organization');
      return;
    }

    // Get the previous user (loop to last if at beginning)
    const prevIndex = currentIndex === 0 ? orgEmployees.length - 1 : currentIndex - 1;
    const prevUser = orgEmployees[prevIndex];

    const username = prevUser.username || prevUser._id;
    navigate(`/attendance/teams/${teamId}/user/${username}/performance`);
    setLocalEmployeeId(prevUser._id);
  };

  const handleNextUser = () => {
    if (!profile?.employee || !teamId || groupBy !== 'organization') {
      toast.error('Navigation not available');
      return;
    }

    const groupedByOrg = {};
    gridEmployees.forEach((emp) => {
      const orgName = getOrgName(emp);
      if (!groupedByOrg[orgName]) groupedByOrg[orgName] = [];
      groupedByOrg[orgName].push(emp);
    });

    const orderedOrgNames = sortGroupNamesWithRabsLast(Object.keys(groupedByOrg));
    const orderedEmployees = orderedOrgNames.flatMap((orgName) => groupedByOrg[orgName] || []);

    if (orderedEmployees.length === 0) {
      toast.error('No users found for navigation');
      return;
    }

    // Move in visual order: users of current org, then first user of next org.
    const currentIndex = orderedEmployees.findIndex(emp => emp._id === id || emp.username === userId);
    if (currentIndex === -1) {
      toast.error('Could not find current user in directory');
      return;
    }

    // Loop to the first user after the last visible user.
    const nextIndex = (currentIndex + 1) % orderedEmployees.length;
    const nextUser = orderedEmployees[nextIndex];

    const username = nextUser.username || nextUser._id;
    navigate(`/attendance/teams/${teamId}/user/${username}/performance`);
    setLocalEmployeeId(nextUser._id);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [groupBy, setGroupBy] = useState('none'); // 'none', 'organization', 'team'
  const [loading, setLoading] = useState(true);
  console.log("LOading",loading);
  const [profile, setProfile] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showPendingLeavesModal, setShowPendingLeavesModal] = useState(false);
  const [leavePolicies, setLeavePolicies] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [showLeaveBalanceForm, setShowLeaveBalanceForm] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);
  const [isEditingPolicy, setIsEditingPolicy] = useState(false);
  const [migrationHistory, setMigrationHistory] = useState([]);
  const [migrationHistoryLoading, setMigrationHistoryLoading] = useState(false);
  const [pendingLeavesModalTab, setPendingLeavesModalTab] = useState('pending');
  
  // Performance Tab States
  const [fullMonthPresenceEnabled, setFullMonthPresenceEnabled] = useState(false);
  const [applyingFullMonth, setApplyingFullMonth] = useState(false);
  const [browseMonth, setBrowseMonth] = useState(moment().month() + 1);
  const [browseYear, setBrowseYear] = useState(moment().year());
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [hasInitialPunchIn, setHasInitialPunchIn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSwitchHintShown, setAutoSwitchHintShown] = useState(false);
  const shouldForceStatusCorrection = !hasInitialPunchIn || isNonWorkingStatus(editForm.status);
  const isTimeCorrectionDisabled = shouldForceStatusCorrection || editForm.correction_mode === 'status_correction';

  const [balanceForm, setBalanceForm] = useState({
    leave_policy_id: '',
    opening_balance: 0,
    used: 0,
    pending: 0
  });

  const isEditingBalance = useMemo(() => {
    if (!balanceForm.leave_policy_id) return false;
    const matchesById = (profile?.balances || []).some(b => {
      const bPolicyId = b.leave_policy_id?._id || b.leave_policy_id || b._id;
      return String(bPolicyId) === String(balanceForm.leave_policy_id);
    });
    if (matchesById) return true;

    const selectedPolicy = (leavePolicies || []).find((p) => String(p._id) === String(balanceForm.leave_policy_id));
    const selectedType = normalizeLeaveType(selectedPolicy?.leave_type || selectedPolicy?.policy_name);
    if (!IDEMPOTENT_LEAVE_TYPES.has(selectedType)) return false;

    return (profile?.balances || []).some((b) => {
      const balanceType = normalizeLeaveType(b.leave_type || b.leave_policy_id?.leave_type || b.name);
      return balanceType === selectedType;
    });
  }, [balanceForm.leave_policy_id, profile?.balances]);

  const availablePolicies = useMemo(() => {
    const assignedPolicyIds = new Set((profile?.balances || []).map(b => {
      const pId = b.leave_policy_id?._id || b.leave_policy_id || b._id;
      return String(pId);
    }));

    return (leavePolicies || []).filter(p => {
      const pId = String(p._id);
      const isPrivilege = (p.policy_name || p.leave_type || '').toLowerCase().includes('privilege');
      
      // If a privilege policy is already assigned, exclude it from the dropdown
      // (Except when we are specifically editing that policy record)
      if (isPrivilege && assignedPolicyIds.has(pId) && String(balanceForm.leave_policy_id) !== pId) {
        return false;
      }

      // Generally de-duplicate already assigned policies from the "Add" view
      if (!isEditingBalance && assignedPolicyIds.has(pId)) {
        return false;
      }

      return true;
    });
  }, [leavePolicies, profile?.balances, balanceForm.leave_policy_id, isEditingBalance]);

  const editingBalancePolicyLabel = useMemo(() => {
    if (!isEditingBalance || !balanceForm.leave_policy_id) return '';
    const current = (profile?.balances || []).find((b) => {
      const bPolicyId = b.leave_policy_id?._id || b.leave_policy_id || b._id;
      return String(bPolicyId) === String(balanceForm.leave_policy_id);
    });
    return current?.leave_policy_id?.policy_name || current?.name || current?.leave_type || 'Selected Policy';
  }, [isEditingBalance, balanceForm.leave_policy_id, profile?.balances]);

  // Sync balanceForm when policy is selected
  useEffect(() => {
    if (!balanceForm.leave_policy_id || !showLeaveBalanceForm) return;
    
    // We only want to auto-fill if we are NOT already in the middle of typing
    // Actually, it's better to auto-fill once when the policy ID changes in the dropdown
    let existing = (profile?.balances || []).find(b => {
      const bPolicyId = b.leave_policy_id?._id || b.leave_policy_id || b._id;
      return String(bPolicyId) === String(balanceForm.leave_policy_id);
    });

    if (!existing) {
      const selectedPolicy = (leavePolicies || []).find((p) => String(p._id) === String(balanceForm.leave_policy_id));
      const selectedType = normalizeLeaveType(selectedPolicy?.leave_type || selectedPolicy?.policy_name);
      if (IDEMPOTENT_LEAVE_TYPES.has(selectedType)) {
        existing = (profile?.balances || []).find((b) => {
          const balanceType = normalizeLeaveType(b.leave_type || b.leave_policy_id?.leave_type || b.name);
          return balanceType === selectedType;
        });
      }
    }

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
  }, [balanceForm.leave_policy_id, profile?.balances, showLeaveBalanceForm, leavePolicies]);
  
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
  console.log()
  const [bulkPolicyForm, setBulkPolicyForm] = useState({
    weekoff_policy_id: '',
    holiday_policy_id: '',
    shift_id: '',
    leave_policy_ids: []
  });

  const [manualForm, setManualForm] = useState({
    attendance_date: moment().format('YYYY-MM-DD'),
    status: 'present',
    first_in: `${moment().format('YYYY-MM-DD')}T09:00`,
    last_out: `${moment().format('YYYY-MM-DD')}T18:00`,
    remarks: ''
  });

  const [policyForm, setPolicyForm] = useState({
    weekoff_policy_id: '',
    holiday_policy_id: '',
    shift_id: '',
    attendance_settings: {
      geo_fencing_required: true,
      allowed_locations: []
    }
  });

  const [bulkManualForm, setBulkManualForm] = useState({
    startDate: moment().format('YYYY-MM-DD'),
    endDate: moment().format('YYYY-MM-DD'),
    status: 'present',
    remarks: '',
    excludeSundays: true,
    excludeSaturdays: true
  });

  const handleMapConfirm = (locationData) => {
    if (pickerModal.index === -1) return;
    setPolicyForm(prev => {
      const newList = [...(prev.attendance_settings?.allowed_locations || [])];
      newList[pickerModal.index] = {
        ...newList[pickerModal.index],
        latitude: locationData.lat,
        longitude: locationData.lng,
        radius_meters: locationData.radius_meters
      };
      return {
        ...prev,
        attendance_settings: { ...prev.attendance_settings, allowed_locations: newList }
      };
    });
    setPickerModal({ open: false, index: -1 });
  };

  const handleDirectorySelect = (index, loc) => {
    setPolicyForm(prev => {
      const newList = [...(prev.attendance_settings?.allowed_locations || [])];
      newList[index] = {
        name: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude,
        radius_meters: loc.radius_meters
      };
      return {
        ...prev,
        attendance_settings: { ...prev.attendance_settings, allowed_locations: newList }
      };
    });
  };

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
    return [...result].sort((a, b) => {
      const aIsRabs = isRabsOrganization(getOrgName(a));
      const bIsRabs = isRabsOrganization(getOrgName(b));
      if (aIsRabs !== bIsRabs) return aIsRabs ? 1 : -1;
      return 0;
    });
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
  
  const empHistory = profile?.attendance || [];

  const continuityStats = useMemo(() => {
    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      leaves: 0,
      weeklyOff: 0,
      holidays: 0
    };

    (empHistory || []).forEach((rec) => {
      const status = getCalendarStatusClass(rec?.status);
      if (status === 'present') stats.present += 1;
      if (status === 'late') {
        stats.late += 1;
        stats.present += 1;
      }
      if (status === 'absent') stats.absent += 1;
      if (status === 'leave' || status === 'pending_leave') stats.leaves += 1;
      if (status === 'half_day') {
        const hasLeave = !!(rec.leaveType || rec.leave_type);
        if (hasLeave) {
          stats.leaves += 0.5;
          stats.present += 0.5;
        } else {
          stats.present += 0.5;
          stats.absent += 0.5;
        }
      }
      if (status === 'weekly_off') stats.weeklyOff += 1;
      if (status === 'holiday') stats.holidays += 1;
    });

    if ((empHistory || []).length === 0) {
      return {
        present: profile?.summary?.present ?? 0,
        absent: profile?.summary?.absent ?? 0,
        late: profile?.summary?.late ?? 0,
        leaves: profile?.summary?.leaves ?? 0,
        weeklyOff: 0,
        holidays: (profile?.holidays || []).length
      };
    }

    return stats;
  }, [empHistory, profile?.summary, profile?.holidays]);

  const leaveHistory = useMemo(() => {
    const approved = Array.isArray(profile?.leaves) ? profile.leaves : [];
    const pending = Array.isArray(profile?.pendingLeaves) ? profile.pendingLeaves : [];

    return [...approved, ...pending]
      .filter((leave) => {
        const status = String(leave?.approval_status || leave?.status || '').toLowerCase();
        return !['rejected', 'cancelled', 'withdrawn'].includes(status);
      })
      .sort((a, b) => new Date(b.createdAt || b.from_date || 0) - new Date(a.createdAt || a.from_date || 0));
  }, [profile?.leaves, profile?.pendingLeaves]);

  const visibleShiftPolicies = useMemo(() => {
    const seen = new Set();

    const normalized = (shiftPolicies || []).filter((shift) => {
      const name = String(shift?.shift_name || shift?.name || '').trim();
      if (!name) return false;
      const normalizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (normalizedName === 'standard shift') return false;

      // Keep only active shifts where possible
      const status = String(shift?.status || '').toLowerCase();
      const isActiveFlag = (typeof shift?.isActive === 'boolean') ? shift.isActive : shift?.is_active;
      if (status && status !== 'active') return false;
      if (typeof isActiveFlag === 'boolean' && !isActiveFlag) return false;

      // De-duplicate by shift identity and equivalent timing signature
      const timingSignature = `${String(shift?.start_time || '')}-${String(shift?.end_time || '')}-${String(shift?.full_day_hours || shift?.fullDayHours || '')}`;
      const key = `${normalizedName}|${timingSignature}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return normalized;
  }, [shiftPolicies]);

  const resolveShiftPolicyId = (employee, overrideShiftId = '') => {
    const assignedShiftRef = Array.isArray(employee?.shift_ids) && employee.shift_ids.length > 0
      ? employee.shift_ids[0]
      : employee?.shift_id;

    const resolved = assignedShiftRef?._id || assignedShiftRef || overrideShiftId?._id || overrideShiftId || '';
    return resolved ? String(resolved) : '';
  };

  const policyShiftOptions = useMemo(() => {
    return (visibleShiftPolicies || [])
      .map((shift) => ({ ...shift, _id: String(shift?._id || '') }))
      .filter((shift) => shift._id);
  }, [visibleShiftPolicies]);

  const assignedShiftOptions = useMemo(() => {
    const employee = profile?.employee || {};
    const raw = Array.isArray(employee.shift_ids) ? employee.shift_ids : [];
    const fallback = employee.shift_id ? [employee.shift_id] : [];
    const combined = [...raw, ...fallback];

    const seen = new Set();
    return combined
        .map((s) => {
            if (!s) return null;
            if (typeof s === 'string') {
                return { _id: s, shift_name: 'Assigned Shift', start_time: '09:00', end_time: '18:00', half_day_hours: 4 };
            }
            return s;
        })
        .filter((s) => s && s._id && !seen.has(String(s._id)) && seen.add(String(s._id)));
  }, [profile?.employee]);

  // Ported Record Adjustment Helpers
  const toEditDateTime = (attendanceDate, hhmm = '09:00') => {
    const [hh, mm] = String(hhmm || '09:00').split(':').map((v) => Number(v));
    const m = moment(attendanceDate).startOf('day').set({
        hour: Number.isFinite(hh) ? hh : 9,
        minute: Number.isFinite(mm) ? mm : 0,
        second: 0,
        millisecond: 0
    });
    return m.format('YYYY-MM-DDTHH:mm');
  };

  const applyStatusModeTimes = (form, statusValue, shiftIdValue) => {
    const statusNormalized = String(statusValue || '').toLowerCase();
    const selectedShift = assignedShiftOptions.find((s) => String(s._id) === String(shiftIdValue)) || assignedShiftOptions[0] || null;

    if (statusNormalized === 'absent' || statusNormalized === 'leave' || statusNormalized === 'pending_leave' || statusNormalized === 'weekly_off' || statusNormalized === 'holiday') {
        return { ...form, status: statusNormalized, first_in: '', last_out: '' };
    }

    const startTime = selectedShift?.start_time || '09:00';
    const endTime = selectedShift?.end_time || '18:00';
    const firstInValue = toEditDateTime(form.attendance_date, startTime);
    let lastOutValue = toEditDateTime(form.attendance_date, endTime);

    // Midnight Shift Handling: If end time is before start time, it belongs to the next day
    if (moment(lastOutValue).isBefore(moment(firstInValue))) {
        lastOutValue = moment(lastOutValue).add(1, 'day').format('YYYY-MM-DDTHH:mm');
    }

    if (statusNormalized === 'half_day') {
        const halfHours = Number(selectedShift?.half_day_hours || 4);
        lastOutValue = moment(firstInValue).add(halfHours, 'hours').format('YYYY-MM-DDTHH:mm');
        return {
            ...form,
            status: 'half_day',
            half_day_session: form.half_day_session || 'first_half',
            first_in: firstInValue,
            last_out: lastOutValue
        };
    }

    return {
        ...form,
        status: (statusNormalized === 'none' || !statusNormalized) ? 'present' : statusNormalized,
        half_day_session: null,
        first_in: firstInValue,
        last_out: lastOutValue
    };
  };

  const startEdit = (rec, overrideDate = null) => {
    const employee = profile?.employee || {};
    const recordShiftId = rec.shift_id?._id || rec.shift_id || '';
    const defaultShiftId = recordShiftId || employee.shift_id?._id || employee.shift_id || assignedShiftOptions?.[0]?._id || '';

    const hasPunchIn = Boolean(rec.first_in);
    const defaultCorrectionMode = hasPunchIn ? 'time_correction' : 'status_correction';

    const baseForm = {
        attendance_date: overrideDate || rec.attendance_date,
        employee_id: id,
        correction_mode: defaultCorrectionMode,
      apply_status_correction: defaultCorrectionMode === 'status_correction',
      apply_time_correction: defaultCorrectionMode === 'time_correction',
        shift_id: defaultShiftId,
        status: (!rec.status || rec.status === 'none') ? 'present' : rec.status,
        half_day_session: rec.half_day_session || 'first_half',
        first_in: rec.first_in ? moment(rec.first_in).format('YYYY-MM-DDTHH:mm') :
            (rec._id ? '' : toEditDateTime(rec.attendance_date, assignedShiftOptions?.[0]?.start_time || '09:00')),
        last_out: rec.last_out ? moment(rec.last_out).format('YYYY-MM-DDTHH:mm') :
            (rec._id ? '' : toEditDateTime(rec.attendance_date, assignedShiftOptions?.[0]?.end_time || '18:00')),
        remarks: rec.remarks || ''
    };

    setEditingId(rec._id || 'new');
    setHasInitialPunchIn(hasPunchIn);
    setEditForm(baseForm);
  };

  const fetchBrowseHistory = async (paramMonth, paramYear) => {
    if (!id) return;
    const targetMonth = (typeof paramMonth === 'number') ? paramMonth : browseMonth;
    const targetYear = (typeof paramYear === 'number') ? paramYear : browseYear;

    setLoading(true);
    setEditingId(null);
    try {
        const start = moment([targetYear, targetMonth - 1]).startOf('month').format('YYYY-MM-DD');
        const end = moment([targetYear, targetMonth - 1]).endOf('month').format('YYYY-MM-DD');
        
        // Use the current company ID if available to maintain consistency across migration boundaries
        const effectiveCompanyId = profile?.employee?.company_id?._id || profile?.employee?.company_id;

        const [r, leaveBalanceRes] = await Promise.all([
          attendanceAPI.getEmployeeFullProfile(id, start, end, effectiveCompanyId),
          leaveAPI.getBalance(id).catch(() => ({ data: [] }))
        ]);
        setProfile({
          ...(r || {}),
          balances: Array.isArray(leaveBalanceRes?.data) ? leaveBalanceRes.data : (r?.balances || [])
        });
    } catch (error) {
        console.error('Performance fetch error:', error);
        toast.error('Failed to load history for selected period');
    } finally {
        setLoading(false);
    }
  };

  const handleApplyFullMonthPresence = async (e) => {
    e.preventDefault();
    if (!id) return;

    if (!fullMonthPresenceEnabled) {
        toast.error('Enable Full Month Presence to continue');
        return;
    }

    const ok = window.confirm('Are you sure you want to mark the entire month as present?');
    if (!ok) return;

    setApplyingFullMonth(true);
    try {
        const res = await attendanceAPI.applyFullMonthPresence({
            employee_id: id,
            year: browseYear,
            month: browseMonth
        });

        if (res.success) {
            toast.success(res.message || 'Full month presence applied');
            fetchBrowseHistory(browseMonth, browseYear);
        } else {
            toast.error(res.message || 'Failed to apply full month presence');
        }
    } catch (error) {
        toast.error(error?.response?.data?.message || 'Error applying full month presence');
    } finally {
        setApplyingFullMonth(false);
    }
  };

  const saveEdit = async () => {
    const mode = String(editForm.correction_mode || '').toLowerCase();
    
    // Validation for Time Correction
    if (mode === 'time_correction') {
      if (!editForm.shift_id) {
        toast.error('Please assign shift policy to this user');
        return;
      }
      if (!editForm.first_in || !editForm.last_out) {
        toast.error('Please provide both Punch-In and Punch-Out times');
        return;
      }
      if (moment(editForm.last_out).isBefore(moment(editForm.first_in))) {
        toast.error('Punch-Out cannot be before Punch-In');
        return;
      }
    }

    setSaving(true);
    const payload = {
      ...editForm,
      status: editForm.status === 'pending_leave' ? 'leave' : editForm.status,
      apply_status_correction: mode === 'status_correction',
      apply_time_correction: mode === 'time_correction'
    };

    try {
        if (editingId === 'new') {
        await attendanceAPI.createManualAdjustment(payload);
        } else {
        await attendanceAPI.updateAttendanceRecord(editingId, payload);
        }
        toast.success('Record updated');
        setEditingId(null);
        // Refresh the correct month context
        if (tab === 'performance') {
            fetchBrowseHistory(browseMonth, browseYear);
        } else {
            fetchData();
        }
    } catch (err) {
        const apiErrorCode = err?.response?.data?.error || err?.response?.data?.code;
        const apiMessage = String(err?.response?.data?.message || '').toLowerCase();
        const shouldAutoSwitchToTimeUnchanged =
            apiErrorCode === 'CONFLICT_STATUS_TIME_CORRECTION' ||
            (apiMessage.includes('time correction is not applicable') && apiMessage.includes('status'));

        if (apiErrorCode === 'PENDING_LEAVE_ACTION_REQUIRED') {
          toast.error(err?.response?.data?.message || 'Pending leave exists for this date. Approve, reject, or withdraw it before adjusting attendance.');
          return;
        }

        if (shouldAutoSwitchToTimeUnchanged) {
            setAutoSwitchHintShown(true);
            setEditForm((prev) => ({
                ...prev,
                correction_mode: 'status_correction_time_unchanged',
            apply_status_correction: false,
                apply_time_correction: false
            }));
            toast.info('Switched to Status Correction (Time Unchanged). Please verify and save again.');
            return;
        }
        toast.error(err?.response?.data?.message || 'Update failed');
    }
    finally { setSaving(false); }
  };

  // Sync Browse Month/Year with startDate
  useEffect(() => {
    const d = new Date(startDate);
    setBrowseMonth(d.getMonth() + 1);
    setBrowseYear(d.getFullYear());
  }, [startDate]);

  // Auto-switch logic
  useEffect(() => {
    const isNonWorking = isNonWorkingStatus(editForm.status);
    if (!editingId || !(!hasInitialPunchIn || isNonWorking) || editForm.correction_mode !== 'time_correction') return;

    setAutoSwitchHintShown(true);
    setEditForm((prev) => {
        const nextMode = {
            ...prev,
            correction_mode: 'status_correction',
            apply_status_correction: true,
        apply_time_correction: false
        };
        return applyStatusModeTimes(nextMode, nextMode.status || 'present', nextMode.shift_id);
    });
  }, [editingId, hasInitialPunchIn, editForm.status, editForm.correction_mode]);

  useEffect(() => {
    if (!profile?.employee || isEditingPolicy) return;

    const employee = profile.employee;
    const overrides = employee.policy_overrides || {};
    const resolvedShiftId = resolveShiftPolicyId(employee, overrides.shift_id);
    const shiftExists = policyShiftOptions.some((shift) => String(shift._id) === String(resolvedShiftId));

    setPolicyForm({
      weekoff_policy_id: employee.weekoff_policy_id?._id || employee.weekoff_policy_id || overrides.weekoff_policy_id?._id || overrides.weekoff_policy_id || '',
      holiday_policy_id: employee.holiday_policy_id?._id || employee.holiday_policy_id || overrides.holiday_policy_id?._id || overrides.holiday_policy_id || '',
      shift_id: shiftExists ? resolvedShiftId : '',
      attendance_settings: employee.attendance_settings || { geo_fencing_required: true, allowed_locations: [] }
    });
  }, [profile, policyShiftOptions]);

  const hasSavedIndividualPolicy = useMemo(() => {
    const e = profile?.employee;
    if (!e) return false;
    return Boolean(
      e.weekoff_policy_id ||
      e.holiday_policy_id ||
      e.shift_id ||
      e.policy_overrides?.weekoff_policy_id ||
      e.policy_overrides?.holiday_policy_id ||
      e.policy_overrides?.shift_id
    );
  }, [profile]);

  const fetchData = async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setMigrationHistoryLoading(true);
    try {
      const [profileRes, leaveBalanceRes, policiesRes, migrationRes] = await Promise.all([
        attendanceAPI.getEmployeeFullProfile(id, startDate, endDate),
        leaveAPI.getBalance(id).catch(() => ({ data: [] })),
        masterAPI.getLeavePolicies({ limit: 200 }).catch(() => ({ data: [] })),
        attendanceAPI.getEmployeeMigrationHistory(id).catch(() => ({ data: [] }))
      ]);
      setProfile({
        ...(profileRes || {}),
        balances: Array.isArray(leaveBalanceRes?.data) ? leaveBalanceRes.data : (profileRes?.balances || [])
      });
      setMigrationHistory(Array.isArray(migrationRes?.data) ? migrationRes.data : []);

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
      setMigrationHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!startDate || !endDate) return;
    if (moment(endDate).isBefore(moment(startDate))) {
      toast.error('End date cannot be before start date');
      // Set end date to start date to prevent invalid state
      setEndDate(startDate);
      return;
    }
    fetchData();
  }, [id, startDate, endDate]);

  // Sync performance calendar data when navigation or tab changes
  useEffect(() => {
    if (id && tab === 'performance') {
      fetchBrowseHistory(browseMonth, browseYear);
    }
  }, [id, browseMonth, browseYear, tab]);

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

    fetchOrganizations();
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
          masterAPI.getShifts({
            limit: 500,
            all_companies: true
          }).catch(() => ({ data: [] }))
        ]);

        setLeavePolicies(Array.isArray(leaveRes?.data) ? leaveRes.data : []);
        setWeekOffPolicies(Array.isArray(weekOffRes?.data) ? weekOffRes.data : []);
        setHolidayPolicies(Array.isArray(holidayRes?.data) ? holidayRes.data : []);
        const shifts = Array.isArray(shiftRes?.data) ? shiftRes.data : [];
        setShiftPolicies(shifts);
      } catch {
        setLeavePolicies([]);
        setWeekOffPolicies([]);
        setHolidayPolicies([]);
        setShiftPolicies([]);
      }
    };

    fetchPolicyCatalogs();
  }, [id, profile]);

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
    const newStart = moment([selectedYear, selectedMonth]).startOf('month').format('YYYY-MM-DD');
    const newEnd = moment([selectedYear, selectedMonth]).endOf('month').format('YYYY-MM-DD');
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
      const openingBalance = Number(balanceForm.opening_balance) || 0;
      const used = Number(balanceForm.used) || 0;
      const pending = Number(balanceForm.pending) || 0;

      if (openingBalance < 0 || used < 0 || pending < 0) {
        toast.error('Balance values cannot be negative');
        return;
      }

      await leaveAPI.updateBalance(id, {
        leave_policy_id: balanceForm.leave_policy_id,
        opening_balance: openingBalance,
        used: used,
        pending: pending
      });
      toast.success('Leave balance updated successfully');
      setShowLeaveBalanceForm(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('leave-balance-updated'));
      }
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
    setPolicySaving(true);
    try {
      const result = await masterAPI.assignPolicyToUser(id, policyForm);
      if (result) {
        toast.success('Individual policies updated successfully');
        setIsEditingPolicy(false);
        fetchData(); // Reload to reflect any derived changes
      }
    } catch (error) {
      toast.error(error?.message || 'Failed to update individual policies');
    } finally {
      setPolicySaving(false);
    }
  };

  const formatMigrationPeriod = (period) => {
    if (!period?.from || !period?.to) return 'Unavailable';
    const days = Number(period?.days);
    const fromText = new Date(period.from).toLocaleDateString();
    const toText = new Date(period.to).toLocaleDateString();
    if (Number.isFinite(days)) {
      return `${days} day${days === 1 ? '' : 's'} (${fromText} to ${toText})`;
    }
    return `${fromText} to ${toText}`;
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

  const handleDownloadOrgReport = (orgName, items) => {
    setExportModal({ open: true, orgName, items });
  };

  const confirmDownloadOrgReport = async (orgName, items, startDt, endDt) => {
    try {
      const loadingToast = toast.loading(`Preparing report for ${orgName}...`);
      
      const allLogs = [];
      const start = moment(startDt).startOf('day').format('YYYY-MM-DD');
      const end = moment(endDt).endOf('day').format('YYYY-MM-DD');
      
      const chunkSize = 5;
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (emp) => {
          try {
            const effectiveCompanyId = emp.company_id?._id || emp.company_id;
            const profile = await attendanceAPI.getEmployeeFullProfile(emp._id, start, end, effectiveCompanyId);
            const history = profile?.attendance || [];
            
            history.forEach(log => {
               let shiftName = '';
               let shiftHours = '';
               
               if (log.shift_id) {
                   shiftName = log.shift_id.shift_name || log.shift_id.name || '';
                   shiftHours = `${log.shift_id.start_time || ''} - ${log.shift_id.end_time || ''}`;
               } else if (profile.employee?.shift_id) {
                   const s = profile.employee.shift_id;
                   shiftName = s.shift_name || s.name || '';
                   shiftHours = `${s.start_time || ''} - ${s.end_time || ''}`;
               }
               
               const formatDateTime = (dt) => dt ? moment(dt).format('DD-MM-YYYY h:mm A') : '';
               let formattedStatus = log.status || 'Present';
               if (log.status === 'half_day') {
                   formattedStatus = log.half_day_session === 'first_half' ? 'Half Day (First)' : 'Half Day (Second)';
               } else if (log.status) {
                   formattedStatus = log.status.charAt(0).toUpperCase() + log.status.slice(1).replace('_', ' ');
               }

               allLogs.push({
                   "NAME": `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.username,
                   "DATE": moment(log.attendance_date).format('YYYY-MM-DD'),
                   "STATUS": formattedStatus,
                   "ATTENDANCE INTIME": formatDateTime(log.first_in),
                   "ATTENDANCE OUTTIME": formatDateTime(log.last_out),
                   "SHIFT NAME": shiftName,
                   "SHIFT HOURS": shiftHours
               });
            });
          } catch (e) {
            console.error(`Failed to fetch history for ${emp.username}`, e);
          }
        }));
      }

      if (allLogs.length === 0) {
          toast.dismiss(loadingToast);
          toast.error(`No attendance logs found for ${orgName} in this period.`);
          return;
      }

      // Using ExcelJS for styling
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance Logs');

      // Style definitions
      const navyHeaderStyle = {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }, // Navy Blue (#0f172a)
          font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 14 },
          alignment: { horizontal: 'center', vertical: 'middle' }
      };

      const dateHeaderStyle = {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }, // Navy Blue (#0f172a)
          font: { color: { argb: 'FFFFFFFF' }, bold: true },
          alignment: { horizontal: 'left', vertical: 'middle' }
      };

      const tableHeaderStyle = {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }, // Light Gray
          font: { bold: true, color: { argb: 'FF0F172A' } },
          border: { bottom: { style: 'thin' } }
      };

      // 1. Company Name Header
      worksheet.mergeCells('A1:F1');
      const companyCell = worksheet.getCell('A1');
      companyCell.value = orgName.toUpperCase();
      companyCell.style = navyHeaderStyle;
      worksheet.getRow(1).height = 35;

      // 2. Report Sub-title
      worksheet.mergeCells('A2:F2');
      const subTitleCell = worksheet.getCell('A2');
      subTitleCell.value = `ATTENDANCE LOG REPORT: ${moment(start).format('DD MMM YYYY')} TO ${moment(end).format('DD MMM YYYY')}`;
      subTitleCell.font = { bold: true, size: 11, color: { argb: 'FF475569' } };
      subTitleCell.alignment = { horizontal: 'center' };
      worksheet.getRow(2).height = 20;

      worksheet.addRow([]); // Spacer row

      // Get unique dates sorted descending
      const uniqueDates = [...new Set(allLogs.map(log => log.DATE))].sort((a, b) => new Date(b) - new Date(a));

      uniqueDates.forEach(dateStr => {
          // Date Group Header
          const dateRow = worksheet.addRow([`DATE: ${moment(dateStr).format('DD MMMM YYYY, dddd').toUpperCase()}`]);
          dateRow.eachCell(cell => { cell.style = dateHeaderStyle; });
          worksheet.mergeCells(`A${dateRow.number}:F${dateRow.number}`);
          
          // Column Headers
          const headerRow = worksheet.addRow(["NAME", "STATUS", "ATTENDANCE INTIME", "ATTENDANCE OUTTIME", "SHIFT NAME", "SHIFT HOURS"]);
          headerRow.eachCell(cell => { cell.style = tableHeaderStyle; });
          
          // Logs for this date
          const dayLogs = allLogs
            .filter(l => l.DATE === dateStr)
            .sort((a, b) => a.NAME.localeCompare(b.NAME));
          
          dayLogs.forEach(log => {
              worksheet.addRow([
                  log.NAME,
                  log.STATUS,
                  log["ATTENDANCE INTIME"],
                  log["ATTENDANCE OUTTIME"],
                  log["SHIFT NAME"],
                  log["SHIFT HOURS"]
              ]);
          });
          
          worksheet.addRow([]); // Spacer row between dates
      });

      // Set column widths
      worksheet.columns = [
          { width: 35 }, // Name
          { width: 18 }, // Status
          { width: 25 }, // In Time
          { width: 25 }, // Out Time
          { width: 22 }, // Shift Name
          { width: 22 }  // Shift Hours
      ];

      // Export file
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Attendance_Log_${orgName.replace(/[^a-z0-9]/gi, '_')}_${moment(start).format('MMM_DD_YYYY')}.xlsx`);

      toast.dismiss(loadingToast);
      toast.success('Report downloaded successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download report');
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                  <h1 style={{ margin: 0, color: THEME.navy, fontSize: '32px', fontWeight: '900', letterSpacing: '-0.03em' }}>Employee Directory</h1>
                  <div style={{ background: '#eff6ff', color: '#1d4ed8', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiUsers size={14} />
                    {filteredEmployees.length} Total
                  </div>
                </div>
              </div>
              <p style={{ margin: '4px 0 0 0', color: THEME.muted, fontSize: '14px', fontWeight: '500' }}>Manage workforce policies and profiles</p>
              
              {/* Search Bar */}
              <div style={{ marginTop: '20px', position: 'relative', maxWidth: '420px' }}>
                <FiSearch 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    left: '14px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: THEME.muted 
                  }} 
                />
                <input 
                  type="text" 
                  placeholder="Search by name, ID or employee code..." 
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    ...inputStyle,
                    paddingLeft: '44px',
                    paddingRight: searchTerm ? '40px' : '14px',
                    height: '48px',
                    fontSize: '15px',
                    borderRadius: '12px',
                    borderColor: searchTerm ? THEME.indigo : THEME.border,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    background: '#fff',
                    transition: 'all 0.2s ease'
                  }}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    style={{ 
                      position: 'absolute', 
                      right: '14px', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      border: 'none', 
                      background: 'transparent', 
                      cursor: 'pointer', 
                      color: THEME.muted,
                      padding: '4px'
                    }}
                  >
                    <FiX size={16} />
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
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  color: '#fff',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '700',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <FiFileText size={18} />
                Bulk assign policies
              </button>
              {headerActions && <div style={{ marginLeft: '8px', paddingLeft: '16px', borderLeft: `1px solid ${THEME.border}` }}>{headerActions}</div>}
            </div>
          </div>

          {/* Employee Directory Content */}
          <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '12px', color: THEME.muted, fontWeight: '600' }}>
              Showing {Math.min(filteredEmployees.length, (currentPage-1)*pageSize + 1)}-{Math.min(filteredEmployees.length, currentPage*pageSize)} of {filteredEmployees.length}
            </span>
          </div>
          {gridLoading ? (
            <div style={{ textAlign: 'center', color: THEME.muted, padding: '40px' }}>Loading employees...</div>
          ) : gridEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', color: THEME.muted, padding: '40px' }}>No employees found</div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              {(groupBy === 'none' ? [{ name: null, items: paginatedEmployees }] : sortGroupNamesWithRabsLast(Object.keys(groupedEmployeesData)).map(name => ({ name, items: groupedEmployeesData[name] }))).map((group, gIdx) => (
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
                      {groupBy === 'organization' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDownloadOrgReport(group.name, group.items); }}
                          style={{ marginLeft: 'auto', background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <FiDownload size={14} /> Export Logs
                        </button>
                      )}
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
                        handleSelectEmployee(emp);
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
              {(groupBy === 'none' ? [{ name: null, items: paginatedEmployees }] : sortGroupNamesWithRabsLast(Object.keys(groupedEmployeesData)).map(name => ({ name, items: groupedEmployeesData[name] }))).map((group, gIdx) => (
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
                      {groupBy === 'organization' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDownloadOrgReport(group.name, group.items); }}
                          style={{ marginLeft: 'auto', background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <FiDownload size={14} /> Export Logs
                        </button>
                      )}
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
                            onClick={() => handleSelectEmployee(emp)}
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
                    {visibleShiftPolicies.map((p) => (
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

          {/* Export Logs Modal */}
          {exportModal.open && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setExportModal({ open: false, orgName: '', items: [] })}>
              <div style={{ background: '#fff', borderRadius: '16px', width: '400px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Export Logs</h3>
                  <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748b' }}>Select date range to export attendance for <b>{exportModal.orgName}</b>.</p>
                </div>
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>From Date</label>
                    <input type="date" value={exportDateRange.start} onChange={e => setExportDateRange(p => ({ ...p, start: e.target.value }))} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>To Date</label>
                    <input type="date" value={exportDateRange.end} onChange={e => setExportDateRange(p => ({ ...p, end: e.target.value }))} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button onClick={() => setExportModal({ open: false, orgName: '', items: [] })} style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: '#64748b', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
                  <button onClick={() => { confirmDownloadOrgReport(exportModal.orgName, exportModal.items, exportDateRange.start, exportDateRange.end); setExportModal({ open: false, orgName: '', items: [] }); }} style={{ padding: '8px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>Download</button>
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
            {teamId && groupBy === 'organization' && (
              <>
                <button 
                  onClick={handlePreviousUser} 
                  style={{
                    ...buttonStyle,
                    background: '#1890ff',
                    color: '#fff',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: '600',
                    borderRadius: '8px'
                  }}
                >
                  ← Previous User
                </button>
                <button 
                  onClick={handleNextUser} 
                  style={{
                    ...buttonStyle,
                    background: '#1890ff',
                    color: '#fff',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: '600',
                    borderRadius: '8px'
                  }}
                >
                  Next User →
                </button>
              </>
            )}
            <button 
              onClick={() => {
                setLocalEmployeeId(null);
                if (teamId) navigate(`/attendance/teams/${teamId}`);
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
            { label: 'ATTENDANCE', value: `${(profile.attendance || []).length} Records`, icon: <FiFileText />, color: '#64748b', bg: '#f1f5f9', onClick: null, hasBadge: false },
            { label: 'LEAVE QUOTA', value: `${(profile.balances || []).length} Policies`, icon: <FiActivity />, color: '#94a3b8', bg: '#f8fafc', onClick: null, hasBadge: false },
            {
              label: 'PENDING',
              value: `${(profile.pendingLeaves || []).length} Requests`,
              icon: <FiClock />,
              color: (profile.pendingLeaves || []).length > 0 ? '#d97706' : '#94a3b8',
              bg: (profile.pendingLeaves || []).length > 0 ? '#fffbeb' : '#f8fafc',
              onClick: () => {
                setPendingLeavesModalTab('pending');
                setShowPendingLeavesModal(true);
              },
              hasBadge: (profile.pendingLeaves || []).length > 0
            }
          ].map((stat, idx) => (
            <div
              key={idx}
              onClick={stat.onClick || undefined}
              style={{
                ...cardStyle,
                background: '#fff',
                border: `1px solid ${stat.hasBadge ? '#fde68a' : THEME.border}`,
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: stat.onClick ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={stat.onClick ? (e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(245,158,11,0.18)';
              } : undefined}
              onMouseLeave={stat.onClick ? (e) => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = THEME.shadow;
              } : undefined}
            >
              {stat.hasBadge && (
                <div style={{
                  position: 'absolute', top: '10px', right: '10px',
                  background: '#f59e0b', color: '#fff',
                  borderRadius: '10px', fontSize: '9px', fontWeight: '800',
                  padding: '2px 8px', letterSpacing: '0.05em', textTransform: 'uppercase'
                }}>View</div>
              )}
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: stat.bg, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{stat.icon}</div>
              <div>
                <div style={{ fontSize: '10px', color: THEME.muted, fontWeight: '700', letterSpacing: '0.05em' }}>{stat.label}</div>
                <div style={{ fontSize: '16px', color: stat.hasBadge ? '#d97706' : THEME.text, fontWeight: '700' }}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Navigation - Premium Indigo */}
        <div style={{ display: 'flex', gap: '30px', borderBottom: `1px solid ${THEME.border}`, marginBottom: '30px', padding: '0 10px' }}>
          {['Performance', 'Attendance', 'Leave', 'Policies', 'Actions'].map((label) => {
            const t = label.toLowerCase();
            const isActive = tab === t;
            return (
              <button 
                key={t}
                onClick={() => handleTabChange(t)} 
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

        {tab === 'performance' && (
          <div className="ar-perf-container">
            {/* Scorecard */}
            <div className="ar-scorecard">
              {[
                { label: 'Present', val: continuityStats.present, color: '#10b981' },
                { label: 'Absent', val: continuityStats.absent, color: '#ef4444' },
                { label: 'Late', val: continuityStats.late, color: '#f59e0b' },
                { label: 'Leaves', val: continuityStats.leaves, color: '#4f46e5' },
                { label: 'Off', val: continuityStats.weeklyOff, color: '#64748b' },
                { label: 'Holiday', val: continuityStats.holidays, color: '#ec4899' }
              ].map((s, idx) => (
                <div key={idx} className="ar-score-tile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="ar-score-lbl">{s.label}</div>
                  <div className="ar-score-val" style={{ color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '24px' }}>
               {/* Continuity Calendar Grid */}
               <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: THEME.navy }}>Attendance Continuity</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => {
                          const prev = moment([browseYear, browseMonth - 1]).subtract(1, 'month');
                          setBrowseYear(prev.year());
                          setBrowseMonth(prev.month() + 1);
                        }}
                        style={{ ...buttonStyle, background: '#fff', border: `1px solid ${THEME.border}`, padding: '4px 8px' }}
                      >←</button>
                      <span style={{ fontSize: '12px', fontWeight: '700', padding: '4px 8px', background: '#f1f5f9', borderRadius: '6px' }}>
                         {moment([browseYear, browseMonth - 1]).format('MMMM YYYY')}
                      </span>
                      <button 
                        onClick={() => {
                          const next = moment([browseYear, browseMonth - 1]).add(1, 'month');
                          setBrowseYear(next.year());
                          setBrowseMonth(next.month() + 1);
                        }}
                        style={{ ...buttonStyle, background: '#fff', border: `1px solid ${THEME.border}`, padding: '4px 8px' }}
                      >→</button>
                    </div>
                  </div>

                  <div className="ar-cal-grid">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="ar-day-header">{d}</div>
                    ))}
                    {(() => {
                      const startOfMonth = moment([browseYear, browseMonth - 1]).startOf('month');
                      const endOfMonth = moment([browseYear, browseMonth - 1]).endOf('month');
                      const startDay = startOfMonth.day();
                      const totalDays = endOfMonth.date();
                      
                      const cells = [];
                      for (let i = 0; i < startDay; i++) cells.push(<div key={`empty-${i}`} className="ar-cal-day empty" />);
                      
                      for (let d = 1; d <= totalDays; d++) {
                        const dateStr = moment([browseYear, browseMonth - 1, d]).format('YYYY-MM-DD');
                        const record = empHistory.find(r => getAttendanceDateKey(r.attendance_date) === dateStr) || { attendance_date: dateStr, status: 'none' };

                        // Respect explicit half-day flags returned by APIs (is_half_day / isHalfDay)
                        const explicitStatus = String(record.status || '').toLowerCase();
                        const isHalfFlag = explicitStatus
                          ? explicitStatus === 'half_day'
                          : Boolean(record.is_half_day || record.isHalfDay || record.is_half || record.half_day);
                        const displayStatus = isHalfFlag ? 'half_day' : (record.status || 'none');

                        const statusClass = getCalendarStatusClass(displayStatus);
                        let statusBadge = getCalendarStatusBadge(displayStatus);
                        if (displayStatus === 'half_day') {
                          const session = record.half_day_session || record.start_half_session || record.end_half_session || '';
                          statusBadge = session.toLowerCase().includes('first') ? '1st Half' : (session.toLowerCase().includes('second') ? '2nd Half' : '½ Day');
                        }
                        
                        const lType = record.leaveType || record.leave_type;
                        const lStatus = record.leaveStatus || record.approval_status;
                        let leaveBadge = null;
                        
                        if (lType) {
                          const badge = formatLeaveBadge(lType);
                          const isApproved = lStatus === 'approved' || record.status === 'leave' || record.leaveStatus === 'approved';
                          const isPending = lStatus === 'pending' || record.leaveStatus === 'pending';
                          const statusTxt = isApproved ? 'Approved' : (isPending ? 'Pending' : 'Applied');
                          
                          if (record.status === 'half_day') {
                            // Combine half-day and leave for better bifurcation
                            statusBadge = `${statusBadge} (${badge})`;
                            leaveBadge = statusTxt;
                          } else {
                            leaveBadge = `${badge} ${statusTxt}`;
                          }
                        }
                        
                        cells.push(
                          <div 
                            key={d} 
                            className={`ar-cal-day ${statusClass}`}
                            onClick={() => startEdit(record, dateStr)}
                          >
                            <span className="ar-day-num">{d}</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', width: '100%' }}>
                              {statusBadge && <span className={`ar-day-badge ${statusClass}`}>{statusBadge}</span>}
                              {leaveBadge && <span className="ar-day-badge leave">{leaveBadge}</span>}
                            </div>
                          </div>
                        );
                      }
                      return cells;
                    })()}
                  </div>
               </div>

               {/* Right Side: Quick Actions & Highlights */}
               <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Full Month Presence */}
                  <div style={{ ...cardStyle }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                       <FiActivity color={THEME.indigo} />
                       <span style={{ fontSize: '13px', fontWeight: '700' }}>Admin Controls</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                        <input 
                          type="checkbox" 
                          checked={fullMonthPresenceEnabled} 
                          onChange={(e) => setFullMonthPresenceEnabled(e.target.checked)} 
                        />
                        Enable Full Month Presence
                      </label>
                      <button
                        onClick={handleApplyFullMonthPresence}
                        disabled={!fullMonthPresenceEnabled || applyingFullMonth}
                        style={{
                          ...buttonStyle,
                          width: '100%',
                          background: THEME.primary,
                          color: '#fff',
                          opacity: fullMonthPresenceEnabled ? 1 : 0.5,
                          fontSize: '12px'
                        }}
                      >
                        {applyingFullMonth ? 'Processing...' : 'Mark Full Month Present'}
                      </button>
                      
                      <button
                        onClick={() => setShowLeaveModal(true)}
                        style={{
                          ...buttonStyle,
                          width: '100%',
                          background: '#fff',
                          color: THEME.navy,
                          border: `1px solid ${THEME.border}`,
                          fontSize: '12px',
                          fontWeight: '700'
                        }}
                      >
                        📬 Apply Leave on Behalf
                      </button>

                      <p style={{ margin: 0, fontSize: '11px', color: THEME.muted, lineHeight: 1.5 }}>
                        This will mark all working days in this month as present with standard shift times.
                      </p>
                    </div>
                  </div>

                  {/* Recent Activity Log */}
                  <div style={{ ...cardStyle, flex: 1 }}>
                     <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '700' }}>Activity Highlights</h3>
                     <div className="ar-timeline">
                        {empHistory.filter(r => r.status && r.status !== 'none').slice(0, 5).map((rec, i) => (
                          <div key={i} className="ar-time-item">
                             <div className="ar-time-icon">
                               <FiClock size={16} />
                             </div>
                             <div className="ar-time-info">
                               <div className="ar-time-title">{getAttendanceDateLabel(rec.attendance_date)}</div>
                               <div className="ar-time-sub">
                                 <StatusPill 
                                   status={getCalendarStatusClass(rec.status)} 
                                   session={rec.half_day_session} 
                                   leaveType={rec.leaveType || rec.leave_type}
                                   leaveStatus={rec.leaveStatus || rec.approval_status}
                                 />
                                 {rec.first_in && <span style={{ marginLeft: '8px' }}>{moment(rec.first_in).format('h:mm a')}</span>}
                               </div>
                             </div>
                          </div>
                        ))}
                        {empHistory.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: THEME.muted, fontSize: '12px' }}>No recent activity</div>}
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {tab === 'attendance' && (
          <>
            <div style={{ ...cardStyle, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>📊</span>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: THEME.navy }}>Daily Records</h3>
                </div>
                
                {/* Embedded Date Filters */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', border: `1px solid ${THEME.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontWeight: '500', fontSize: '12px', color: THEME.text }}>Month</label>
                    <select 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      style={{ ...inputStyle, width: '100px', padding: '4px 8px', fontSize: '12px' }}
                    >
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontWeight: '500', fontSize: '12px', color: THEME.text }}>Year</label>
                    <select 
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      style={{ ...inputStyle, width: '80px', padding: '4px 8px', fontSize: '12px' }}
                    >
                      {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <span style={{ color: THEME.border }}>|</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontWeight: '500', fontSize: '12px', color: THEME.text }}>From</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ ...inputStyle, width: '115px', padding: '4px 8px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontWeight: '500', fontSize: '12px', color: THEME.text }}>To</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ ...inputStyle, width: '115px', padding: '4px 8px', fontSize: '12px' }} />
                  </div>
                </div>
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                <table className="ar-log-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Attendance InTime</th>
                      <th>Attendance OutTime</th>
                      <th>Shift Name</th>
                      <th>Shift Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(profile.attendance || []).map((row) => {
                      const statusClass = getCalendarStatusClass(row.status);
                      
                      // Robust shift fallback: Row -> Assigned Policy -> Employee Default
                      const shift = row.shift_id || assignedShiftOptions?.[0] || profile?.employee?.shift_id || {};
                      const shiftName = shift.shift_name || row.shift_name || (assignedShiftOptions?.[0]?.shift_name) || '--';
                      
                      const fmtShiftTime = (t) => t ? moment(t, 'HH:mm').format('h:mma') : '';
                      const shiftTimeRange = shift.start_time && shift.end_time 
                        ? ` ${fmtShiftTime(shift.start_time)} To ${fmtShiftTime(shift.end_time)}` 
                        : '';
                      const fullShiftName = shiftName + shiftTimeRange;
                      
                      // Calculate shift hours if not explicitly provided
                      let shiftHours = shift.full_day_hours || shift.total_hours || row.shift_hours;
                      if (!shiftHours && shift.start_time && shift.end_time) {
                          const start = moment(shift.start_time, 'HH:mm');
                          const end = moment(shift.end_time, 'HH:mm');
                          if (start.isValid() && end.isValid()) {
                              let diff = end.diff(start, 'hours', true);
                              if (diff < 0) diff += 24; // Overnight shift
                              shiftHours = Math.round(diff);
                          }
                      }
                      if (!shiftHours) shiftHours = '--';

                      return (
                        <tr key={row._id}>
                          <td>{employeeName}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{moment(row.attendance_date).format('YYYY-MM-DD')}</td>
                          <StatusPill 
                            status={statusClass} 
                            session={row.half_day_session}
                            leaveType={row.leaveType || row.leave_type}
                            leaveStatus={row.leaveStatus || row.approval_status}
                          />
                          <td style={{ whiteSpace: 'nowrap' }}>{row.first_in ? moment(row.first_in).format('DD-MM-YYYY h:mm A') : ''}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{row.last_out ? moment(row.last_out).format('DD-MM-YYYY h:mm A') : ''}</td>
                          <td>{fullShiftName}</td>
                          <td style={{ textAlign: 'center' }}>{shiftHours}</td>
                        </tr>
                      );
                    })}
                    {(profile.attendance || []).length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: THEME.muted }}>No records in selected period</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      {tab === 'leave' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
          {showLeaveBalanceForm && (
            <div style={{ ...cardStyle, borderLeft: `4px solid ${isEditingBalance ? THEME.amber : THEME.green}`, padding: '12px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '14px', color: isEditingBalance ? THEME.amber : THEME.green }}>
                {isEditingBalance ? 'Edit Leave Balance' : 'Add Leave Balance'}
              </h3>
              <form onSubmit={handleUpdateBalance} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px 10px', flexWrap: 'wrap' }}>
                  <label style={{ fontWeight: '700', fontSize: '12px', color: '#000', minWidth: '60px' }}>Policy:</label>
                  <select style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px', flex: '1 1 180px' }} value={String(balanceForm.leave_policy_id)} onChange={(e) => setBalanceForm({ ...balanceForm, leave_policy_id: e.target.value })}>
                    <option value="">Select policy</option>
                    {availablePolicies.map((p) => (
                      <option key={p._id} value={String(p._id)}>{p.policy_name || p.leave_type}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px 10px', flexWrap: 'wrap' }}>
                  <label style={{ fontWeight: '700', fontSize: '12px', color: '#000', minWidth: '60px' }}>Opening:</label>
                  <input 
                    type="number" 
                    step="1" 
                    style={{ ...inputStyle, padding: '8px 10px', fontSize: '12px', flex: '1 1 100px' }} 
                    value={balanceForm.opening_balance} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setBalanceForm(prev => ({ 
                        ...prev, 
                        opening_balance: val,
                        pending: val // Mirror opening to pending as default
                      }));
                    }} 
                  />
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
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setShowLeaveModal(true)}
                  style={{ ...buttonStyle, background: THEME.navy, color: '#fff', padding: '6px 12px', fontSize: '12px' }}
                >
                  Apply Leave
                </button>
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
            </div>
            {showLeaveBalanceForm && isEditingBalance && (
              <div
                style={{
                  marginBottom: '10px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: `1px solid ${THEME.amber}`,
                  background: '#fffbeb',
                  color: '#92400e',
                  fontSize: '12px',
                  fontWeight: '700'
                }}
              >
                Editing leave balance: {editingBalancePolicyLabel}
              </div>
            )}
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
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatLeaveDays(b.opening_balance || 0)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatLeaveDays(b.used ?? b.consumed ?? 0)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                        {String((b.leave_type || b.leave_policy_id?.leave_type || '')).toLowerCase().includes('lwp')
                          ? 0
                          : formatLeaveDays(b.pending ?? b.pending_approval ?? Math.max(0, (b.opening_balance || 0) - (b.used ?? b.consumed ?? 0)))}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '700', color: THEME.primary }}>
                        {String((b.leave_type || b.leave_policy_id?.leave_type || '')).toLowerCase().includes('lwp')
                          ? 0
                          : formatLeaveDays(b.pending ?? b.pending_approval ?? Math.max(0, (b.opening_balance || 0) - (b.used ?? b.consumed ?? 0)))}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                        {(() => {
                          const rowPolicyId = b.leave_policy_id?._id || b.leave_policy_id || b._id;
                          const isRowEditing = showLeaveBalanceForm && isEditingBalance && String(balanceForm.leave_policy_id) === String(rowPolicyId);

                          return (
                            <button
                              onClick={() => {
                                setBalanceForm({
                                  leave_policy_id: rowPolicyId,
                                  opening_balance: b.opening_balance || 0,
                                  used: b.used ?? b.consumed ?? 0,
                                  pending: b.pending ?? b.pending_approval ?? 0
                                });
                                setShowLeaveBalanceForm(true);
                              }}
                              disabled={isRowEditing}
                              style={{
                               ...buttonStyle,
                                background: isRowEditing ? '#fff7ed' : '#fff',
                                color: isRowEditing ? '#9a3412' : THEME.navy,
                                border: `1px solid ${isRowEditing ? '#fdba74' : THEME.border}`,
                                padding: '4px 10px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: isRowEditing ? 'default' : 'pointer'
                              }}
                              title={isRowEditing ? 'Currently editing this balance' : 'Edit Balance'}
                            >
                              {isRowEditing ? 'Editing...' : 'Edit'}
                            </button>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                  {(profile.balances || []).length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '12px', textAlign: 'center', color: THEME.muted }}>No leave balances</td>
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
                  {leaveHistory.map((l) => (
                    <tr key={l._id} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                      <td style={{ padding: '6px 8px' }}>{l.leave_type || l.leave_policy_id?.policy_name || 'Leave'}</td>
                      <td style={{ padding: '6px 8px' }}>{l.from_date ? formatAttendanceDate(l.from_date) : '--'}</td>
                      <td style={{ padding: '6px 8px' }}>{l.to_date ? formatAttendanceDate(l.to_date) : '--'}</td>
                      <td style={{ padding: '6px 8px' }}><span style={{ background: THEME.bg, padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{l.approval_status || l.status || '--'}</span></td>
                    </tr>
                  ))}
                  {leaveHistory.length === 0 && (
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
          <div style={{ ...cardStyle, borderLeft: `5px solid ${THEME.primary}`, padding: '24px', opacity: isEditingPolicy ? 1 : 0.95 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: THEME.navy, display: 'flex', alignItems: 'center', gap: '10px' }}>
                🛡️ Individual Policy Management
              </h2>
              {!isEditingPolicy && (
                <button 
                  onClick={() => setIsEditingPolicy(true)}
                  style={{ ...buttonStyle, background: THEME.bg, border: `1px solid ${THEME.border}`, color: THEME.navy, padding: '6px 16px' }}
                >
                  Edit Configuration
                </button>
              )}
            </div>
            
            <p style={{ color: THEME.muted, fontSize: '13px', marginBottom: '24px' }}>
              Override organization-level defaults for this employee. Select the policies that should apply specifically to this individual.
            </p>

            <form onSubmit={handleUpdateIndividualPolicies} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontWeight: '700', fontSize: '13px', color: '#000', whiteSpace: 'nowrap', minWidth: '120px' }}>Week-Off Policy:</label>
                  <select
                    disabled={!isEditingPolicy}
                    value={policyForm.weekoff_policy_id}
                    onChange={(e) => setPolicyForm((prev) => ({ ...prev, weekoff_policy_id: e.target.value }))}
                    style={{ ...inputStyle, padding: '12px', background: isEditingPolicy ? '#fff' : '#f8fafc', flex: 1, cursor: isEditingPolicy ? 'default' : 'not-allowed' }}
                  >
                    {!policyForm.weekoff_policy_id && <option value="">Select Week-Off Policy...</option>}
                    {weekOffPolicies.map((p) => (
                      <option key={p._id} value={p._id}>{p.policy_name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontWeight: '700', fontSize: '13px', color: '#000', whiteSpace: 'nowrap', minWidth: '100px' }}>Shift Policy:</label>
                  <select
                    disabled={!isEditingPolicy}
                    value={policyForm.shift_id}
                    onChange={(e) => setPolicyForm((prev) => ({ ...prev, shift_id: e.target.value }))}
                    style={{ ...inputStyle, padding: '12px', background: isEditingPolicy ? '#fff' : '#f8fafc', flex: 1, cursor: isEditingPolicy ? 'default' : 'not-allowed' }}
                  >
                    {!policyForm.shift_id && <option value="">Select Shift Policy...</option>}
                    {policyShiftOptions.map((p) => (
                      <option key={p._id} value={p._id}>{p.shift_name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontWeight: '700', fontSize: '13px', color: '#000', whiteSpace: 'nowrap', minWidth: '110px' }}>Holiday Policy:</label>
                  <select
                    disabled={!isEditingPolicy}
                    value={policyForm.holiday_policy_id}
                    onChange={(e) => setPolicyForm((prev) => ({ ...prev, holiday_policy_id: e.target.value }))}
                    style={{ ...inputStyle, padding: '12px', background: isEditingPolicy ? '#fff' : '#f8fafc', flex: 1, cursor: isEditingPolicy ? 'default' : 'not-allowed' }}
                  >
                    {!policyForm.holiday_policy_id && <option value="">Select Holiday Policy...</option>}
                    {holidayPolicies.map((p) => (
                      <option key={p._id} value={p._id}>{p.policy_name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1', borderTop: `1px solid ${THEME.border}`, paddingTop: '20px', marginTop: '10px' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: THEME.navy, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📍 Geofencing Configuration
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: isEditingPolicy ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: '600' }}>
                        <input
                          type="checkbox"
                          disabled={!isEditingPolicy}
                          checked={policyForm.attendance_settings?.geo_fencing_required ?? (profile?.employee?.company_id?.settings?.geo_fencing_enabled || false)}
                          onChange={(e) => setPolicyForm(prev => ({
                            ...prev,
                            attendance_settings: {
                              ...(prev.attendance_settings || {}),
                              geo_fencing_required: e.target.checked
                            }
                          }))}
                          style={{ width: '18px', height: '18px' }}
                        />
                        Geo-fencing Required for this Employee
                      </label>
                      {policyForm.attendance_settings?.geo_fencing_required === undefined && profile?.employee?.company_id?.settings?.geo_fencing_enabled && (
                        <span style={{ fontSize: '11px', color: THEME.indigo, marginLeft: '28px', fontWeight: '600' }}>
                          (Inherited from {profile?.employee?.company_id?.company_name})
                        </span>
                      )}
                    </div>
                  </div>

                  {(policyForm.attendance_settings?.geo_fencing_required ?? (profile?.employee?.company_id?.settings?.geo_fencing_enabled || false)) && (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: `1px solid ${THEME.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: THEME.navy }}>Individual Allowed Locations (Whitelist)</span>
                        {isEditingPolicy && (
                          <button
                            type="button"
                            onClick={() => {
                              const newLocation = { name: '', latitude: 0, longitude: 0, radius_meters: 200 };
                              setPolicyForm(prev => ({
                                ...prev,
                                attendance_settings: {
                                  ...(prev.attendance_settings || {}),
                                  allowed_locations: [...(prev.attendance_settings?.allowed_locations || []), newLocation]
                                }
                              }));
                            }}
                            style={{ ...buttonStyle, background: THEME.bg, border: `1px solid ${THEME.border}`, color: THEME.primary, padding: '4px 12px', fontSize: '12px' }}
                          >
                            + Add Custom Location
                          </button>
                        )}
                      </div>
                      
                      {(!policyForm.attendance_settings?.allowed_locations || policyForm.attendance_settings.allowed_locations.length === 0) ? (
                        <p style={{ fontSize: '12px', color: THEME.muted, fontStyle: 'italic', margin: 0 }}>
                          No individual locations defined. System will fallback to organization-level allowed locations.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {(policyForm.attendance_settings.allowed_locations || []).map((loc, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 80px 40px', gap: '10px', alignItems: 'start' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <LocationDirectorySelect 
                                  currentName={loc.name}
                                  onSelect={(l) => handleDirectorySelect(idx, l)}
                                />
                                <input
                                  placeholder="Or type custom name..."
                                  disabled={!isEditingPolicy}
                                  value={loc.name}
                                  onChange={(e) => {
                                    setPolicyForm(prev => {
                                      const newList = (prev.attendance_settings?.allowed_locations || []).map((loc, i) => 
                                        i === idx ? { ...loc, name: e.target.value } : loc
                                      );
                                      return { ...prev, attendance_settings: { ...prev.attendance_settings, allowed_locations: newList } };
                                    });
                                  }}
                                  style={{ ...inputStyle, padding: '8px', fontSize: '11px' }}
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="Lat"
                                  disabled={!isEditingPolicy}
                                  value={loc.latitude}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                    setPolicyForm(prev => {
                                      const newList = (prev.attendance_settings?.allowed_locations || []).map((loc, i) => 
                                        i === idx ? { ...loc, latitude: val } : loc
                                      );
                                      return { ...prev, attendance_settings: { ...prev.attendance_settings, allowed_locations: newList } };
                                    });
                                  }}
                                  style={{ ...inputStyle, padding: '8px' }}
                                />
                                {isEditingPolicy && (
                                  <button 
                                    type="button"
                                    onClick={() => setPickerModal({ open: true, index: idx })}
                                    style={{ padding: '8px', background: THEME.bg, border: `1px solid ${THEME.border}`, borderRadius: '8px', color: THEME.indigo }}
                                    title="Pick from Map"
                                  >
                                    <FiGlobe size={14} />
                                  </button>
                                )}
                              </div>
                              <input
                                type="number"
                                step="any"
                                placeholder="Long"
                                disabled={!isEditingPolicy}
                                value={loc.longitude}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  setPolicyForm(prev => {
                                    const newList = (prev.attendance_settings?.allowed_locations || []).map((loc, i) => 
                                      i === idx ? { ...loc, longitude: val } : loc
                                    );
                                    return { ...prev, attendance_settings: { ...prev.attendance_settings, allowed_locations: newList } };
                                  });
                                }}
                                style={{ ...inputStyle, padding: '8px' }}
                              />
                              <div style={{ position: 'relative' }}>
                                <input
                                  type="number"
                                  placeholder="Radius"
                                  disabled={!isEditingPolicy}
                                  value={loc.radius_meters}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                    setPolicyForm(prev => {
                                      const newList = (prev.attendance_settings?.allowed_locations || []).map((loc, i) => 
                                        i === idx ? { ...loc, radius_meters: val } : loc
                                      );
                                      return { ...prev, attendance_settings: { ...prev.attendance_settings, allowed_locations: newList } };
                                    });
                                  }}
                                  style={{ ...inputStyle, padding: '8px', paddingRight: '20px' }}
                                />
                                <span style={{ position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: THEME.muted }}>m</span>
                              </div>
                              {isEditingPolicy && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newList = policyForm.attendance_settings.allowed_locations.filter((_, i) => i !== idx);
                                    setPolicyForm(prev => ({ ...prev, attendance_settings: { ...prev.attendance_settings, allowed_locations: newList } }));
                                  }}
                                  style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '16px' }}
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isEditingPolicy && (
                  <div style={{ gridColumn: '1 / -1', marginTop: '10px', display: 'flex', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingPolicy(false);
                        // Reset form to profile data
                        const employee = profile.employee;
                        const overrides = employee.policy_overrides || {};
                        setPolicyForm({
                          weekoff_policy_id: employee.weekoff_policy_id?._id || employee.weekoff_policy_id || overrides.weekoff_policy_id?._id || overrides.weekoff_policy_id || '',
                          holiday_policy_id: employee.holiday_policy_id?._id || employee.holiday_policy_id || overrides.holiday_policy_id?._id || overrides.holiday_policy_id || '',
                          shift_id: resolveShiftPolicyId(employee, overrides.shift_id),
                          attendance_settings: employee.attendance_settings || { geo_fencing_required: true, allowed_locations: [] }
                        });
                      }}
                      style={{
                        ...buttonStyle,
                        background: '#fff',
                        border: `1px solid ${THEME.border}`,
                        color: THEME.navy,
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      Discard
                    </button>
                    <button
                      type="submit"
                      disabled={policySaving}
                      style={{
                        ...buttonStyle,
                        background: THEME.primary,
                        color: '#fff',
                        padding: '12px 32px',
                        fontSize: '14px',
                        fontWeight: '700',
                        borderRadius: '10px',
                        boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.2)',
                        opacity: policySaving ? 0.7 : 1
                      }}
                    >
                      {policySaving ? 'Saving...' : '💾 Save Policy Overrides'}
                    </button>
                  </div>
                )}
            </form>
            <p style={{ marginTop: '14px', fontSize: '12px', color: THEME.muted }}>
              {isEditingPolicy 
                ? 'You are currently in edit mode. Changes will be applied to the individual employee pattern.' 
                : 'Click "Edit Configuration" to modify individual policy overrides.'}
            </p>
          </div>
        </div>
      )}

      {tab === 'actions' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
          {/* <div style={{ ...cardStyle, borderLeft: `4px solid ${THEME.navy}`, padding: '12px' }}>
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
          </div> */}

         

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

          <div style={{ ...cardStyle, borderLeft: `4px solid ${THEME.indigo}`, padding: '12px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '14px', color: THEME.indigo }}>🔁 Migration History</h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: THEME.muted }}>
              Track who migrated this employee and how long they stayed in the previous organization before each move.
            </p>

            {migrationHistoryLoading ? (
              <div style={{ color: THEME.muted, fontSize: '12px' }}>Loading migration history...</div>
            ) : migrationHistory.length === 0 ? (
              <div style={{ color: THEME.muted, fontSize: '12px' }}>No migration history found for this employee.</div>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {migrationHistory.map((event) => (
                  <div
                    key={event._id}
                    style={{
                      border: `1px solid ${THEME.border}`,
                      borderRadius: '10px',
                      padding: '10px',
                      background: '#fff'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                      <strong style={{ color: THEME.text, fontSize: '12px' }}>
                        {event.sourceCompany?.name || 'Unknown'} to {event.destinationCompany?.name || 'Unknown'}
                      </strong>
                      <span style={{ color: THEME.muted, fontSize: '11px' }}>
                        {event.migratedAt ? new Date(event.migratedAt).toLocaleString() : 'Unknown date'}
                      </span>
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '12px', color: THEME.text }}>
                      Migrated by: <strong>{event.migratedBy?.name || 'Unknown'}</strong>
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '11px', color: THEME.muted }}>
                      Previous company period: {formatMigrationPeriod(event.previousCompanyPeriod)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Export Logs Modal */}
          {exportModal.open && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setExportModal({ open: false, orgName: '', items: [] })}>
              <div style={{ background: '#fff', borderRadius: '16px', width: '400px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Export Logs</h3>
                  <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748b' }}>Select date range to export attendance for <b>{exportModal.orgName}</b>.</p>
                </div>
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>From Date</label>
                    <input type="date" value={exportDateRange.start} onChange={e => setExportDateRange(p => ({ ...p, start: e.target.value }))} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>To Date</label>
                    <input type="date" value={exportDateRange.end} onChange={e => setExportDateRange(p => ({ ...p, end: e.target.value }))} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button onClick={() => setExportModal({ open: false, orgName: '', items: [] })} style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: '#64748b', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
                  <button onClick={() => { confirmDownloadOrgReport(exportModal.orgName, exportModal.items, exportDateRange.start, exportDateRange.end); setExportModal({ open: false, orgName: '', items: [] }); }} style={{ padding: '8px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>Download</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}        {/* Leave Modal */}
        <AdminApplyLeaveModal 
          isOpen={showLeaveModal}
          onClose={() => setShowLeaveModal(false)}
          employeeId={id}
          employeeName={employeeName}
          onSuccess={() => {
            fetchData();
            fetchBrowseHistory();
          }}
        />

        {/* Record Adjustment Modal */}
        {editingId && (
            <div className="ar-modal-overlay" onClick={() => setEditingId(null)}>
                <div className="ar-modal-card" onClick={(e) => e.stopPropagation()}>
                    <div className="ar-modal-head">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FiEdit size={16} color={THEME.primary} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '15px' }}>Adjust Record: {moment(editForm.attendance_date).format('D MMM YYYY')}</h3>
                        </div>
                        <button onClick={() => setEditingId(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: THEME.muted }}><FiX size={20} /></button>
                    </div>
                    <div className="ar-modal-body">
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 600, color: isTimeCorrectionDisabled ? '#ccc' : '#334155', opacity: isTimeCorrectionDisabled ? 0.5 : 1, cursor: isTimeCorrectionDisabled ? 'not-allowed' : 'pointer' }}>
                          <input
                            type="radio"
                            name="correction_mode"
                            disabled={isTimeCorrectionDisabled}
                            checked={editForm.correction_mode === 'time_correction'}
                            onChange={() => setEditForm((prev) => ({ ...prev, correction_mode: 'time_correction', apply_status_correction: false, apply_time_correction: true }))}
                          />
                          Time Correction
                        </label>
                        <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 600, color: '#334155' }}>
                          <input
                            type="radio"
                            name="correction_mode"
                            checked={editForm.correction_mode === 'status_correction'}
                            onChange={() => {
                              setEditForm((prev) => {
                                const nextMode = {
                                  ...prev,
                                  correction_mode: 'status_correction',
                                  apply_status_correction: true,
                                  apply_time_correction: false
                                };
                                return applyStatusModeTimes(nextMode, nextMode.status || 'present', nextMode.shift_id);
                              });
                            }}
                          />
                          Status Correction
                        </label>
                        <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 600, color: !hasInitialPunchIn ? '#ccc' : '#334155', opacity: !hasInitialPunchIn ? 0.5 : 1, cursor: !hasInitialPunchIn ? 'not-allowed' : 'pointer' }}>
                          <input
                            type="radio"
                            name="correction_mode"
                            disabled={!hasInitialPunchIn}
                            checked={editForm.correction_mode === 'status_correction_time_unchanged'}
                            onChange={() => setEditForm((prev) => ({
                              ...prev,
                              correction_mode: 'status_correction_time_unchanged',
                              apply_status_correction: false,
                              apply_time_correction: false
                            }))}
                          />
                          Status Correction (Time Unchanged)
                        </label>
                      </div>

                      {editForm.correction_mode === 'status_correction' || editForm.correction_mode === 'status_correction_time_unchanged' ? (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="ar-form-group">
                              <label className="ar-form-label">Status</label>
                              <select
                                className="ar-input-ctrl ar-select"
                                style={{ ...inputStyle }}
                                value={editForm.status}
                                onChange={(e) => {
                                  const nextStatus = e.target.value;
                                  if (isNonWorkingStatus(nextStatus) && editForm.correction_mode !== 'status_correction_time_unchanged') {
                                    setAutoSwitchHintShown(true);
                                    setEditForm((prev) => ({
                                      ...prev,
                                      status: nextStatus,
                                      correction_mode: 'status_correction_time_unchanged',
                                      apply_status_correction: false,
                                      apply_time_correction: false,
                                      first_in: '',
                                      last_out: '',
                                      half_day_session: nextStatus === 'half_day' ? (prev.half_day_session || 'first_half') : null
                                    }));
                                  } else {
                                    setAutoSwitchHintShown(false);
                                    setEditForm((prev) => {
                                      if (prev.correction_mode === 'status_correction_time_unchanged') {
                                        return {
                                          ...prev,
                                          status: nextStatus,
                                          half_day_session: nextStatus === 'half_day' ? (prev.half_day_session || 'first_half') : null
                                        };
                                      }
                                      return applyStatusModeTimes({ ...prev }, nextStatus, prev.shift_id);
                                    });
                                  }
                                }}
                              >
                                <option value="present">Present</option>
                                <option value="absent">Absent</option>
                                <option value="half_day">Half Day</option>
                                <option value="leave">Leave</option>
                                <option value="weekly_off">Weekly Off</option>
                                <option value="holiday">Holiday</option>
                              </select>
                            </div>
                            <div className="ar-form-group">
                              <label className="ar-form-label">Shift</label>
                              <select
                                className="ar-input-ctrl ar-select"
                                style={{ ...inputStyle }}
                                value={editForm.shift_id}
                                onChange={(e) => {
                                  const nextShiftId = e.target.value;
                                  setEditForm((prev) => {
                                    const next = { ...prev, shift_id: nextShiftId };
                                    if (prev.correction_mode === 'status_correction') {
                                      return applyStatusModeTimes(next, next.status, nextShiftId);
                                    }
                                    return next;
                                  });
                                }}
                              >
                                <option value="">Select Shift</option>
                                {(visibleShiftPolicies.length > 0 ? visibleShiftPolicies : assignedShiftOptions).map((s) => (
                                  <option key={s._id} value={s._id}>
                                    {s.shift_name || 'Shift'} ({s.start_time || '--:--'} - {s.end_time || '--:--'})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {editForm.status === 'half_day' && (
                            <div className="ar-form-group">
                              <label className="ar-form-label">Session</label>
                              <div style={{ display: 'flex', gap: '10px' }}>
                                {['first_half', 'second_half'].map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => setEditForm({ ...editForm, half_day_session: s })}
                                    style={{
                                      ...buttonStyle,
                                      flex: 1,
                                      background: editForm.half_day_session === s ? THEME.primary : '#f8fafc',
                                      color: editForm.half_day_session === s ? '#fff' : THEME.text,
                                      border: `1px solid ${editForm.half_day_session === s ? THEME.primary : THEME.border}`,
                                      fontSize: '11px'
                                    }}
                                  >
                                    {s === 'first_half' ? 'First Half' : 'Second Half'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="ar-form-group">
                              <label className="ar-form-label">Punch In</label>
                              <input
                                type="datetime-local"
                                className="ar-input-ctrl"
                                style={{ ...inputStyle }}
                                value={editForm.first_in}
                                onChange={(e) => {
                                  const nextFirstIn = e.target.value;
                                  setEditForm((prev) => {
                                    const next = { ...prev, first_in: nextFirstIn, correction_mode: 'time_correction' };
                                    const workHours = calculateWorkHours(next.first_in, next.last_out);
                                    if (workHours >= 8) next.status = 'present';
                                    else if (workHours >= 4) next.status = 'half_day';
                                    else if (workHours > 0) next.status = 'incomplete';
                                    return next;
                                  });
                                }}
                              />
                            </div>
                            <div className="ar-form-group">
                              <label className="ar-form-label">Punch Out</label>
                              <input
                                type="datetime-local"
                                className="ar-input-ctrl"
                                style={{ ...inputStyle }}
                                value={editForm.last_out}
                                onChange={(e) => {
                                  const nextLastOut = e.target.value;
                                  setEditForm((prev) => {
                                    const next = { ...prev, last_out: nextLastOut, correction_mode: 'time_correction' };
                                    const workHours = calculateWorkHours(next.first_in, next.last_out);
                                    if (workHours >= 8) next.status = 'present';
                                    else if (workHours >= 4) next.status = 'half_day';
                                    else if (workHours > 0) next.status = 'incomplete';
                                    return next;
                                  });
                                }}
                              />
                            </div>
                          </div>
                          <div style={{ marginTop: '8px', fontSize: '11px', color: THEME.muted }}>
                            Time Correction Mode auto-derives status from work hours.
                          </div>
                        </>
                      )}

                        <div className="ar-form-group">
                            <label className="ar-form-label">Remarks</label>
                            <textarea 
                              className="ar-input-ctrl" 
                              rows={2} 
                              style={{ ...inputStyle, height: 'auto' }}
                              value={editForm.remarks} 
                              onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })} 
                              placeholder="Reason for adjustment..."
                            />
                        </div>

                        {autoSwitchHintShown && (
                           <div style={{ padding: '10px', background: '#fff9db', border: '1px solid #ffe066', borderRadius: '8px', fontSize: '11px', color: '#856404', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              <FiAlertTriangle style={{ flexShrink: 0, marginTop: '2px' }} />
                              <span>Switching to Status Correction automatically based on availability of initial punch data.</span>
                           </div>
                        )}
                    </div>
                    <div className="ar-modal-foot">
                        <button onClick={() => setEditingId(null)} style={{ ...buttonStyle, background: 'transparent', color: THEME.muted, fontSize: '12px' }}>Cancel</button>
                        <button 
                          onClick={saveEdit} 
                          disabled={saving}
                          style={{ ...buttonStyle, background: THEME.primary, color: '#fff', padding: '10px 24px', fontSize: '12px', fontWeight: '700' }}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        <LocationPickerModal 
          isOpen={pickerModal.open}
          onClose={() => setPickerModal({ open: false, index: -1 })}
          onConfirm={handleMapConfirm}
          initialLocation={
            pickerModal.index !== -1 && policyForm.attendance_settings?.allowed_locations[pickerModal.index]?.latitude 
              ? { lat: policyForm.attendance_settings.allowed_locations[pickerModal.index].latitude, lng: policyForm.attendance_settings.allowed_locations[pickerModal.index].longitude }
              : null
          }
        />

        {/* ── Pending Leaves Detail Modal ──────────────────────────────────── */}
        {showPendingLeavesModal && (() => {
          const pendingLeaves = profile?.pendingLeaves || [];
          const approvedLeaves = Array.isArray(profile?.leaves) ? profile.leaves : [];
          const historyLeaves = approvedLeaves
            .filter((leave) => {
              const status = String(leave?.approval_status || leave?.status || '').toLowerCase();
              return !['rejected', 'cancelled', 'withdrawn', 'pending', 'pending_hod', 'pending_shalini', 'pending_final'].includes(status);
            })
            .sort((a, b) => new Date(b.createdAt || b.from_date || 0) - new Date(a.createdAt || a.from_date || 0));

          // Group by calendar month of from_date
          const byMonth = {};
          pendingLeaves.forEach(leave => {
            const key = moment(leave.from_date).format('MMMM YYYY');
            if (!byMonth[key]) byMonth[key] = [];
            byMonth[key].push(leave);
          });
          const sortedMonths = Object.keys(byMonth).sort(
            (a, b) => moment(b, 'MMMM YYYY').valueOf() - moment(a, 'MMMM YYYY').valueOf()
          );

          const stageLabels = {
            stage_1_hod:    { label: 'HOD',     short: 'HOD',  color: '#6366f1' },
            stage_2_shalini:{ label: 'HR',       short: 'HR',   color: '#8b5cf6' },
            stage_3_final:  { label: 'Final',    short: 'Fin',  color: '#10b981' },
          };

          const statusChipStyle = (status) => {
            const map = {
              pending:                    { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
              pending_hod:                { bg: '#eef2ff', color: '#4f46e5', border: '#c7d2fe' },
              pending_shalini:            { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
              pending_final:              { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
              hod_approved_pending_admin: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
              in_review:                  { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
            };
            return map[status] || { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
          };

          const allStages = ['stage_1_hod', 'stage_2_shalini', 'stage_3_final'];

          const getStageIndex = (stage) => allStages.indexOf(stage);

          const historyByMonth = {};
          historyLeaves.forEach((leave) => {
            const key = moment(leave.from_date || leave.createdAt).format('MMMM YYYY');
            if (!historyByMonth[key]) historyByMonth[key] = [];
            historyByMonth[key].push(leave);
          });
          const historyMonths = Object.keys(historyByMonth).sort(
            (a, b) => moment(b, 'MMMM YYYY').valueOf() - moment(a, 'MMMM YYYY').valueOf()
          );

          const closePendingLeavesModal = () => {
            setShowPendingLeavesModal(false);
            setPendingLeavesModalTab('pending');
          };

          return (
            <div
              style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px' }}
              onClick={(e) => { if (e.target === e.currentTarget) closePendingLeavesModal(); }}
            >
              <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>

                {/* ── Header ── */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #fffbeb, #fff7ed)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>⏳</span>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
                        {pendingLeavesModalTab === 'history' ? 'Leave History' : 'Pending Leave Requests'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#334155', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>{employeeName}</span>
                        <span style={{ color: '#cbd5e1' }}>·</span>
                        <span><strong style={{ color: '#d97706' }}>{pendingLeaves.length}</strong> <span style={{ color: '#64748b' }}>pending</span></span>
                        <span style={{ color: '#cbd5e1' }}>·</span>
                        <span><strong style={{ color: '#4f46e5' }}>{historyLeaves.length}</strong> <span style={{ color: '#64748b' }}>history</span></span>
                        {(() => {
                          // Resolve HOD name: prefer populated hod_id, fallback to approval chain stage_1_hod
                          const hodObj = profile?.employee?.hod_id;
                          let hodName = hodObj
                            ? ([hodObj.first_name, hodObj.last_name].filter(Boolean).join(' ') || hodObj.username || '')
                            : '';

                          if (!hodName) {
                            // Fallback: find from any leave's approval_chain stage_1_hod entry
                            for (const lv of pendingLeaves) {
                              const entry = (lv.approval_chain || []).find(c => c.stage === 'stage_1_hod' && c.approver_username);
                              if (entry?.approver_username) { hodName = entry.approver_username; break; }
                            }
                          }

                          if (!hodName) return null;
                          return (
                            <>
                              <span style={{ color: '#cbd5e1' }}>·</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '10px', fontWeight: '800', background: '#1e293b', color: '#fff', borderRadius: '4px', padding: '1px 5px', letterSpacing: '0.04em' }}>HOD</span>
                                <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '12px' }}>{hodName}</span>
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <button onClick={closePendingLeavesModal} style={{ background: '#e2e8f0', border: 'none', borderRadius: '8px', width: '30px', height: '30px', cursor: 'pointer', fontSize: '16px', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>×</button>
                </div>

                <div style={{ display: 'flex', gap: '8px', padding: '12px 20px 0 20px', background: '#fff', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => setPendingLeavesModalTab('pending')}
                    style={{
                      ...buttonStyle,
                      background: pendingLeavesModalTab === 'pending' ? '#0f172a' : '#f8fafc',
                      color: pendingLeavesModalTab === 'pending' ? '#fff' : '#475569',
                      border: `1px solid ${pendingLeavesModalTab === 'pending' ? '#0f172a' : '#e2e8f0'}`,
                      fontSize: '12px',
                      fontWeight: '700'
                    }}
                  >
                    Pending Leaves
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingLeavesModalTab('history')}
                    style={{
                      ...buttonStyle,
                      background: pendingLeavesModalTab === 'history' ? '#0f172a' : '#f8fafc',
                      color: pendingLeavesModalTab === 'history' ? '#fff' : '#475569',
                      border: `1px solid ${pendingLeavesModalTab === 'history' ? '#0f172a' : '#e2e8f0'}`,
                      fontSize: '12px',
                      fontWeight: '700'
                    }}
                  >
                    Leave History
                  </button>
                </div>

                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {pendingLeavesModalTab === 'pending' ? (
                    <>
                      {pendingLeaves.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 56px 72px 180px', gap: '0', padding: '7px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                          {['Leave / Dates', 'Status', 'Days', 'Applied', 'Approval Stage'].map(h => (
                            <div key={h} style={{ fontSize: '10px', fontWeight: '800', color: '#1c1d1dff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                          ))}
                        </div>
                      )}

                      {pendingLeaves.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
                          <div style={{ fontSize: '40px', marginBottom: '8px' }}>🎉</div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#475569' }}>No Pending Leaves</div>
                        </div>
                      ) : (
                        sortedMonths.map(month => (
                          <div key={month}>
                            <div style={{ padding: '6px 20px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{month}</span>
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>· {byMonth[month].length} {byMonth[month].length === 1 ? 'request' : 'requests'}</span>
                            </div>

                            {byMonth[month].map((leave, li) => {
                              const sc = statusChipStyle(leave.approval_status);
                              const chain = leave.approval_chain || [];
                              const currentStageIdx = getStageIndex(leave.approval_stage);
                              const isLast = li === byMonth[month].length - 1;

                              return (
                                <div
                                  key={leave._id || li}
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 90px 56px 72px 180px',
                                    gap: '0',
                                    padding: '10px 20px',
                                    alignItems: 'center',
                                    borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
                                    background: '#fff',
                                    transition: 'background 0.15s'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                >
                                  <div style={{ paddingRight: '12px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', lineHeight: 1.3 }}>
                                      {leave.leave_type || leave.leave_policy_id?.leave_type || 'Leave'}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                      {moment(leave.from_date).format('DD MMM')}
                                      {leave.from_date !== leave.to_date ? ` – ${moment(leave.to_date).format('DD MMM YYYY')}` : `, ${moment(leave.from_date).format('YYYY')}`}
                                    </div>
                                    {leave.reason && (
                                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontStyle: 'italic', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={leave.reason}>
                                        "{leave.reason}"
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, borderRadius: '12px', padding: '3px 8px', fontSize: '10px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                                      {String(leave.approval_status || 'pending').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace('Hod ', 'HOD ')}
                                    </span>
                                  </div>

                                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                                    {leave.total_days}<span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500', marginLeft: '2px' }}>d</span>
                                  </div>

                                  <div style={{ fontSize: '11px', color: '#181818ff' }}>
                                    {moment(leave.applied_on || leave.createdAt).format('DD MMM')}
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                                    {allStages.map((stg, si) => {
                                      const stgInfo = stageLabels[stg];
                                      const chainEntry = chain.find(c => c.stage === stg);

                                      let stepState = 'upcoming';
                                      if (chainEntry) {
                                        if (chainEntry.action === 'approved') stepState = 'done';
                                        else if (chainEntry.action === 'rejected') stepState = 'rejected';
                                        else stepState = si === currentStageIdx ? 'current' : (si < currentStageIdx ? 'done' : 'upcoming');
                                      } else {
                                        if (si < currentStageIdx) stepState = 'done';
                                        else if (si === currentStageIdx) stepState = 'current';
                                      }

                                      const pal = {
                                        done:     { dot: '#10b981', label: '#10b981', glyph: '✓', ring: 'none' },
                                        current:  { dot: '#f59e0b', label: '#d97706', glyph: '●', ring: '0 0 0 2px rgba(245,158,11,0.25)' },
                                        rejected: { dot: '#ef4444', label: '#dc2626', glyph: '✗', ring: 'none' },
                                        upcoming: { dot: '#d1d5db', label: '#9ca3af', glyph: '○', ring: 'none' },
                                      }[stepState];

                                      const approverName = chainEntry?.approver_username || null;
                                      const isLast2 = si === allStages.length - 1;

                                      return (
                                        <div key={stg} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                          {si > 0 && (
                                            <div style={{ flex: 1, height: '1.5px', background: si <= currentStageIdx ? '#10b981' : '#e2e8f0' }} />
                                          )}
                                          <div
                                            title={`${stgInfo.label}${approverName ? `: ${approverName}` : ''}${chainEntry?.action_date ? ` · ${moment(chainEntry.action_date).format('DD MMM')}` : ''}`}
                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'default' }}
                                          >
                                            <div style={{
                                              width: '20px', height: '20px', borderRadius: '50%',
                                              background: stepState === 'upcoming' ? '#f1f5f9' : (stepState === 'done' ? '#ecfdf5' : stepState === 'current' ? '#fffbeb' : '#fef2f2'),
                                              border: `1.5px solid ${stepState === 'upcoming' ? '#d1d5db' : pal.dot}`,
                                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                                              fontSize: '10px', fontWeight: '900', color: pal.dot,
                                              boxShadow: pal.ring,
                                              flexShrink: 0
                                            }}>
                                              {pal.glyph}
                                            </div>
                                            <div style={{ fontSize: '9px', fontWeight: '700', color: pal.label, marginTop: '2px', textAlign: 'center', lineHeight: 1 }}>
                                              {stgInfo.short}
                                            </div>
                                          </div>
                                          {!isLast2 && si === 0 && (
                                            <div style={{ flex: 1, height: '1.5px', background: si < currentStageIdx ? '#10b981' : '#e2e8f0' }} />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))
                      )}
                    </>
                  ) : (
                    <>
                      {historyMonths.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
                          <div style={{ fontSize: '40px', marginBottom: '8px' }}>📅</div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#475569' }}>No Leave History</div>
                        </div>
                      ) : (
                        historyMonths.map((month) => (
                          <div key={month}>
                            <div style={{ padding: '6px 20px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{month}</span>
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>· {historyByMonth[month].length} {historyByMonth[month].length === 1 ? 'entry' : 'entries'}</span>
                            </div>

                            {historyByMonth[month].map((leave, index) => {
                              const status = String(leave.approval_status || leave.status || 'leave').toLowerCase();
                              const statusPalette = {
                                approved: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
                                rejected: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
                                pending: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' }
                              }[status] || { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };

                              const isLast = index === historyByMonth[month].length - 1;

                              return (
                                <div
                                  key={leave._id || index}
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1.3fr 1fr 110px 84px',
                                    gap: '12px',
                                    padding: '12px 20px',
                                    alignItems: 'center',
                                    borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
                                    background: '#fff'
                                  }}
                                >
                                  <div>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{leave.leave_type || leave.leave_policy_id?.leave_type || 'Leave'}</div>
                                    {leave.reason && (
                                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={leave.reason}>
                                        {leave.reason}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                                    {moment(leave.from_date).format('DD MMM YYYY')}
                                    {leave.to_date && leave.from_date !== leave.to_date ? ` - ${moment(leave.to_date).format('DD MMM YYYY')}` : ''}
                                  </div>
                                  <div>
                                    <span style={{ background: statusPalette.bg, color: statusPalette.color, border: `1px solid ${statusPalette.border}`, borderRadius: '12px', padding: '3px 8px', fontSize: '10px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                                      {String(leave.approval_status || leave.status || 'leave').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                    </span>
                                  </div>
                                  <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                                    {formatLeaveDays(leave.total_days ?? leave.days ?? 0)}d
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>

                {/* ── Footer ── */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc', flexShrink: 0 }}>
                  <button onClick={closePendingLeavesModal} style={{ ...buttonStyle, background: '#0f172a', color: '#fff', padding: '8px 22px', fontSize: '13px', fontWeight: '700' }}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Export Logs Modal */}
      {exportModal.open && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setExportModal({ open: false, orgName: '', items: [] })}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '400px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Export Logs</h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748b' }}>Select date range to export attendance for <b>{exportModal.orgName}</b>.</p>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>From Date</label>
                <input type="date" value={exportDateRange.start} onChange={e => setExportDateRange(p => ({ ...p, start: e.target.value }))} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>To Date</label>
                <input type="date" value={exportDateRange.end} onChange={e => setExportDateRange(p => ({ ...p, end: e.target.value }))} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setExportModal({ open: false, orgName: '', items: [] })} style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: '#64748b', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
              <button onClick={() => { confirmDownloadOrgReport(exportModal.orgName, exportModal.items, exportDateRange.start, exportDateRange.end); setExportModal({ open: false, orgName: '', items: [] }); }} style={{ padding: '8px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>Download</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmployeeProfileWorkspace;



