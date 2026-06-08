import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Popconfirm, Button } from 'antd';
import axios from 'axios';
import moment from 'moment';
import {
  FiActivity, FiArrowRight, FiCheckCircle, FiClock, FiUsers, FiAlertTriangle,
  FiUser, FiX, FiCalendar, FiLogIn, FiLogOut, FiEdit, FiFileText, FiRefreshCw, FiDownload, FiSearch, FiGrid, FiList, FiChevronDown, FiChevronRight,
  FiGlobe, FiPhone, FiMapPin, FiBriefcase, FiAward, FiHome, FiXCircle, FiPlus, FiFilter
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

const THEME = {
  primary: '#0f172a',
  indigo: '#4f46e5',
  navy: '#0f172a',
  green: '#10b981',
  red: '#ef4444',
  amber: '#f59e0b',
  bg: '#fdfdfd',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#1e293b',
  muted: '#94a3b8',
  shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
};

const S = {
  section: {
    borderBottom: `1px solid ${THEME.border}`,
    paddingBottom: '20px',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: THEME.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '12px',
  },
  btn: (variant = 'default') => ({
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    fontWeight: '600',
    fontSize: '12px',
    transition: 'all 0.2s',
    ...(variant === 'primary' ? { background: THEME.primary, color: '#fff' } :
        variant === 'green'   ? { background: THEME.green, color: '#fff' } :
        variant === 'amber'   ? { background: THEME.amber, color: '#fff' } :
        variant === 'ghost'   ? { background: 'transparent', color: THEME.text, border: `1px solid ${THEME.border}` } :
        { background: '#f1f5f9', color: THEME.text, border: `1px solid ${THEME.border}` })
  }),
  input: {
    width: '100%',
    border: `1px solid ${THEME.border}`,
    borderRadius: '6px',
    padding: '0 10px',
    height: '36px',
    fontSize: '13px',
    color: THEME.text,
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
  },
};

const RABS_ORG_KEY = 'rabs industries india private limited';
const SPECIAL_GROUP_LABELS = new Set(['No Organization', 'No Team']);
const getOrgName = (emp) => emp?.company_id?.company_name || 'No Organization';
const isRabsOrganization = (name = '') => String(name).trim().toLowerCase() === RABS_ORG_KEY;
const sortGroupNamesWithRabsLast = (names = []) =>
  [...names].sort((a, b) => {
    const aSpecial = SPECIAL_GROUP_LABELS.has(String(a));
    const bSpecial = SPECIAL_GROUP_LABELS.has(String(b));
    if (aSpecial !== bSpecial) return aSpecial ? 1 : -1;
    const aR = isRabsOrganization(a), bR = isRabsOrganization(b);
    if (aR !== bR) return aR ? 1 : -1;
    return String(a).localeCompare(String(b));
  });

const toWhole = (v) => Math.max(0, Math.floor(Number(v) || 0));
const formatLeaveDays = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n % 1) < 1e-9) return String(Math.max(0, Math.trunc(n)));
  return String(Math.max(0, Number(n.toFixed(2))));
};
const IDEMPOTENT_LEAVE_TYPES = new Set(['lwp', 'privilege']);
const normalizeLeaveType = (v) => String(v || '').toLowerCase().trim();
const NON_WORKING_STATUSES = new Set(['absent', 'leave', 'pending_leave', 'weekly_off', 'holiday']);
const isNonWorkingStatus = (s) => NON_WORKING_STATUSES.has(String(s || '').toLowerCase());

const calculateWorkHours = (firstIn, lastOut) => {
  if (!firstIn || !lastOut) return 0;
  const a = moment(firstIn), b = moment(lastOut);
  if (!a.isValid() || !b.isValid() || b.isBefore(a)) return 0;
  return b.diff(a, 'hours', true);
};

const getOrdinalNum = (n) => n + (n > 0 ? ['th','st','nd','rd'][(n>3&&n<21)||n%10>3?0:n%10] : '');
const formatStatus = (s) => { if (!s) return '--'; const str = String(s).replace(/_/g,' '); return str.charAt(0).toUpperCase()+str.slice(1); };
const getAttendanceDateLabel = (v) => formatAttendanceDate(v, 'd MMM, EEE', ATTENDANCE_TIME_ZONE);

const getCalendarStatusClass = (status = '') => {
  const n = String(status||'').toLowerCase();
  if (n==='weekly_off'||n==='weekoff'||n==='off') return 'weekly_off';
  if (n==='present_late') return 'late';
  if (n==='pending_leave') return 'pending_leave';
  if (n==='incomplete') return 'missed_punch';
  return n||'none';
};

const formatLeaveBadge = (lt) => {
  if (!lt) return '';
  const l = lt.toLowerCase();
  if (l.includes('privilege')||l.includes('earned')) return 'PL';
  if (l.includes('without pay')||l==='lwp') return 'LWP';
  return lt.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,3);
};

const getCalendarStatusBadge = (status = '') => {
  const n = String(status||'').toLowerCase();
  const m = { weekly_off:'Off', weekoff:'Off', off:'Off', holiday:'Holiday', leave:'Leave', half_day:'Half Day', late:'P', present_late:'P', absent:'Absent', present:'P', incomplete:'Missed', pending_leave:'Leave' };
  return m[n]||'';
};

const StatusPill = ({ status, session, leaveType, leaveStatus }) => {
  const map = {
    present:['Present','present'], absent:['Absent','absent'], leave:['Leave','leave'],
    pending_leave:['Leave','leave'], half_day:['Half Day','half_day'],
    weekly_off:['WeekOff','weekly_off'], holiday:['Holiday','holiday'],
    incomplete:['Miss Punch','missed_punch'], missed_punch:['Miss Punch','missed_punch']
  };
  let [label, cls] = map[status]||[status,'default'];
  if (leaveType) {
    const badge = formatLeaveBadge(leaveType);
    const isApproved = leaveStatus==='approved';
    const isPending = leaveStatus&&leaveStatus!=='approved'&&!['rejected','cancelled','withdrawn'].includes(leaveStatus);
    const statusTxt = isApproved?'Approved':(isPending?'Pending':'Applied');
    if (status==='half_day') { label=`${session?(session.toLowerCase().includes('first')?'1H':'2H'):'HD'} - ${badge} ${statusTxt}`; }
    else { label=`${badge} ${statusTxt}`; }
    cls = isApproved?'leave':'pending-leave';
  } else if (status==='half_day') {
    label = session?(session==='First Half'||session==='first_half'?'1st Half':'2nd Half'):'½ Day';
  }
  return (
    <td className={`ar-status-cell ar-status-${cls}`} style={{ border:'1px solid #dee2e6' }}>
      <div className="ar-status-inner">{label}</div>
    </td>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const EmployeeProfileWorkspace = ({ employeeId, preselectedEmployeeIds = [], headerActions }) => {
  const { id: idFromRoute, teamId, userId, activeTab: urlTab } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [localEmployeeId, setLocalEmployeeId] = useState(null);
  const [pickerModal, setPickerModal] = useState({ open:false, index:-1 });



  const [currentPage, setCurrentPage] = useState(() => Number(sessionStorage.getItem(teamId ? `epw_currentPage_${teamId}` : 'epw_currentPage_global') || 1));
  const [viewMode, setViewMode] = useState(() => sessionStorage.getItem(teamId ? `epw_viewMode_${teamId}` : 'epw_viewMode_global') || 'grid');
  const [pageSize, setPageSize] = useState(() => Number(sessionStorage.getItem(teamId ? `epw_pageSize_${teamId}` : 'epw_pageSize_global') || 24));

  // Persist pagination/view state
  useEffect(() => { sessionStorage.setItem(teamId ? `epw_currentPage_${teamId}` : 'epw_currentPage_global', String(currentPage)); }, [currentPage, teamId]);
  useEffect(() => { sessionStorage.setItem(teamId ? `epw_viewMode_${teamId}` : 'epw_viewMode_global', viewMode); }, [viewMode, teamId]);
  useEffect(() => { sessionStorage.setItem(teamId ? `epw_pageSize_${teamId}` : 'epw_pageSize_global', String(pageSize)); }, [pageSize, teamId]);

  const [startDate, setStartDate] = useState(moment().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(moment().format('YYYY-MM-DD'));
  const [selectedMonth, setSelectedMonth] = useState(moment().month());
  const [selectedYear, setSelectedYear] = useState(moment().year());
  const [exportModal, setExportModal] = useState({ open:false, orgName:'', items:[] });
  const [exportDateRange, setExportDateRange] = useState({
    start: moment().startOf('month').format('YYYY-MM-DD'),
    end: moment().endOf('month').format('YYYY-MM-DD')
  });

  // ── Full Directory Export Modal ──
  const [epwExportModal, setEpwExportModal] = useState(false);
  const [epwExportOptions, setEpwExportOptions] = useState({
    startDate: moment().startOf('month').format('YYYY-MM-DD'),
    endDate: moment().endOf('month').format('YYYY-MM-DD'),
    groupBy: 'organization'
  });
  const [epwExporting, setEpwExporting] = useState(false);

  const [tab, setTab] = useState(urlTab||'performance');
  useEffect(() => { if (urlTab&&urlTab!==tab) setTab(urlTab); }, [urlTab]);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    let p = '';
    if (id) p = `/attendance/admin/employee/${id}/${newTab}`;
    else if (teamId&&userId) p = `/attendance/teams/${teamId}/user/${userId}/${newTab}`;
    else {
      const segs = location.pathname.split('/');
      const tabs = ['performance','attendance','leave','policies','actions'];
      const last = segs[segs.length-1];
      if (tabs.includes(last)) segs[segs.length-1]=newTab; else segs.push(newTab);
      p = segs.join('/');
    }
    navigate(p, { state: location.state });
  };

  const handleSelectEmployee = (emp) => {
    const empId = emp._id;
    const username = emp.username||empId;
    const p = teamId ? `/attendance/teams/${teamId}/user/${username}/performance` : `/attendance/admin/employee/${empId}/performance`;
    setLocalEmployeeId(empId);
    navigate(p, { state: { fromPath: location.pathname } });
  };

  const handlePreviousUser = () => {
    if (!profile?.employee||!teamId||groupBy!=='organization') { toast.error('Navigation not available'); return; }
    const currentOrgName = profile.employee.company_id?.company_name||'No Organization';
    const orgEmployees = gridEmployees.filter(emp=>(emp.company_id?.company_name||'No Organization')===currentOrgName);
    if (!orgEmployees.length) { toast.error('No other users in this organization'); return; }
    const idx = orgEmployees.findIndex(emp=>emp._id===id||emp.username===userId);
    if (idx===-1) { toast.error('Could not find current user'); return; }
    const prev = orgEmployees[idx===0?orgEmployees.length-1:idx-1];
    navigate(`/attendance/teams/${teamId}/user/${prev.username||prev._id}/performance`, { state: location.state });
    setLocalEmployeeId(prev._id);
  };

  const handleNextUser = () => {
    if (!profile?.employee||!teamId||groupBy!=='organization') { toast.error('Navigation not available'); return; }
    const grouped = {};
    gridEmployees.forEach(emp=>{ const g=getOrgName(emp); if(!grouped[g]) grouped[g]=[]; grouped[g].push(emp); });
    const ordered = sortGroupNamesWithRabsLast(Object.keys(grouped)).flatMap(n=>grouped[n]||[]);
    if (!ordered.length) { toast.error('No users found'); return; }
    const idx = ordered.findIndex(emp=>emp._id===id||emp.username===userId);
    if (idx===-1) { toast.error('Could not find current user'); return; }
    const next = ordered[(idx+1)%ordered.length];
    navigate(`/attendance/teams/${teamId}/user/${next.username||next._id}/performance`, { state: location.state });
    setLocalEmployeeId(next._id);
  };

  // ── Filter persistence: restore from sessionStorage scoped by teamId ──
  const filterKey = (key) => teamId ? `epw_${key}_${teamId}` : `epw_${key}_global`;
  const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem(filterKey('searchTerm')) || '');
  const [groupBy, setGroupBy] = useState(() => sessionStorage.getItem(filterKey('groupBy')) || 'none');

  // Persist filters to sessionStorage whenever they change
  useEffect(() => { sessionStorage.setItem(filterKey('searchTerm'), searchTerm); }, [searchTerm, teamId]);
  useEffect(() => { sessionStorage.setItem(filterKey('groupBy'), groupBy); }, [groupBy, teamId]);

  // ── Download Report state & version counter ──────────────────────────────
  // Version counter: increments each time a full-directory report is downloaded (resets on page refresh)
  const epwDlVersionRef = useRef(0);
  const [epwDlModal, setEpwDlModal] = useState({
    open: false,
    startDate: moment().startOf('month').format('YYYY-MM-DD'),
    endDate: moment().endOf('month').format('YYYY-MM-DD'),
    groupBy: 'organization',
    exportType: 'detailed',
  });
  const [epwDlLoading, setEpwDlLoading] = useState(false);
  const [loading, setLoading] = useState(true);
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

  const [fullMonthPresenceEnabled, setFullMonthPresenceEnabled] = useState(false);
  const [applyingFullMonth, setApplyingFullMonth] = useState(false);
  const [browseMonth, setBrowseMonth] = useState(moment().month()+1);
  const [browseYear, setBrowseYear] = useState(moment().year());
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [hasInitialPunchIn, setHasInitialPunchIn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSwitchHintShown, setAutoSwitchHintShown] = useState(false);
  const shouldForceStatusCorrection = !hasInitialPunchIn||isNonWorkingStatus(editForm.status);
  const isTimeCorrectionDisabled = shouldForceStatusCorrection;

  const [balanceForm, setBalanceForm] = useState({ leave_policy_id:'', opening_balance:0, used:0, pending:0 });

  const isEditingBalance = useMemo(() => {
    if (!balanceForm.leave_policy_id) return false;
    const byId = (profile?.balances||[]).some(b => String(b.leave_policy_id?._id||b.leave_policy_id||b._id)===String(balanceForm.leave_policy_id));
    if (byId) return true;
    const sel = (leavePolicies||[]).find(p=>String(p._id)===String(balanceForm.leave_policy_id));
    const selType = normalizeLeaveType(sel?.leave_type||sel?.policy_name);
    if (!IDEMPOTENT_LEAVE_TYPES.has(selType)) return false;
    return (profile?.balances||[]).some(b=>normalizeLeaveType(b.leave_type||b.leave_policy_id?.leave_type||b.name)===selType);
  }, [balanceForm.leave_policy_id, profile?.balances]);

  const availablePolicies = useMemo(() => {
    const assigned = new Set((profile?.balances||[]).map(b=>String(b.leave_policy_id?._id||b.leave_policy_id||b._id)));
    return (leavePolicies||[]).filter(p => {
      const pId = String(p._id);
      const isPriv = (p.policy_name||p.leave_type||'').toLowerCase().includes('privilege');
      if (isPriv&&assigned.has(pId)&&String(balanceForm.leave_policy_id)!==pId) return false;
      if (!isEditingBalance&&assigned.has(pId)) return false;
      return true;
    });
  }, [leavePolicies, profile?.balances, balanceForm.leave_policy_id, isEditingBalance]);

  const editingBalancePolicyLabel = useMemo(() => {
    if (!isEditingBalance||!balanceForm.leave_policy_id) return '';
    const cur = (profile?.balances||[]).find(b=>String(b.leave_policy_id?._id||b.leave_policy_id||b._id)===String(balanceForm.leave_policy_id));
    return cur?.leave_policy_id?.policy_name||cur?.name||cur?.leave_type||'Selected Policy';
  }, [isEditingBalance, balanceForm.leave_policy_id, profile?.balances]);

  useEffect(() => {
    if (!balanceForm.leave_policy_id||!showLeaveBalanceForm) return;
    let existing = (profile?.balances||[]).find(b=>String(b.leave_policy_id?._id||b.leave_policy_id||b._id)===String(balanceForm.leave_policy_id));
    if (!existing) {
      const sel = (leavePolicies||[]).find(p=>String(p._id)===String(balanceForm.leave_policy_id));
      const selType = normalizeLeaveType(sel?.leave_type||sel?.policy_name);
      if (IDEMPOTENT_LEAVE_TYPES.has(selType))
        existing = (profile?.balances||[]).find(b=>normalizeLeaveType(b.leave_type||b.leave_policy_id?.leave_type||b.name)===selType);
    }
    if (existing) {
      setBalanceForm(prev => {
        if (prev.opening_balance===existing.opening_balance&&prev.used===(existing.used??existing.consumed??0)&&prev.pending===(existing.pending??existing.pending_approval??0)) return prev;
        return { ...prev, opening_balance:existing.opening_balance||0, used:existing.used??existing.consumed??0, pending:existing.pending??existing.pending_approval??0 };
      });
    } else {
      const sel = (leavePolicies||[]).find(p=>String(p._id)===String(balanceForm.leave_policy_id));
      if (sel) {
        setBalanceForm(prev => {
          const defaultQuota = sel.leave_type === 'lwp' ? 0 : (sel.annual_quota || 0);
          if (prev.opening_balance === defaultQuota && prev.used === 0 && prev.pending === 0) return prev;
          return { ...prev, opening_balance: defaultQuota, used: 0, pending: 0 };
        });
      }
    }
  }, [balanceForm.leave_policy_id, profile?.balances, showLeaveBalanceForm, leavePolicies]);

  const [organizations, setOrganizations] = useState([]);
  const [gridEmployees, setGridEmployees] = useState([]);
  const [teams, setTeams] = useState([]);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const idFromParams = userId||idFromRoute;
  const isValidParamId = idFromParams&&/^[0-9a-fA-F]{24}$/.test(idFromParams);

  const resolvedIdFromParams = useMemo(() => {
    if (!idFromParams) return null;
    if (isValidParamId) return idFromParams;
    const found = gridEmployees.find(emp => emp.username === idFromParams);
    return found ? found._id : null;
  }, [idFromParams, isValidParamId, gridEmployees]);

  const id = employeeId||localEmployeeId||resolvedIdFromParams;
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
  const [bulkPolicyForm, setBulkPolicyForm] = useState({ weekoff_policy_id:'', holiday_policy_id:'', shift_id:'', leave_policy_ids:[] });

  const [policyForm, setPolicyForm] = useState({
    weekoff_policy_id:'', holiday_policy_id:'', shift_id:'',
    attendance_settings:{ geo_fencing_required:true, allowed_locations:[] }
  });

  const [bulkManualForm, setBulkManualForm] = useState({
    startDate: moment().format('YYYY-MM-DD'), endDate: moment().format('YYYY-MM-DD'),
    status:'present', remarks:'', excludeSundays:true, excludeSaturdays:true
  });

  const handleMapConfirm = (ld) => {
    if (pickerModal.index===-1) return;
    setPolicyForm(prev => {
      const nl = [...(prev.attendance_settings?.allowed_locations||[])];
      nl[pickerModal.index] = { ...nl[pickerModal.index], latitude:ld.lat, longitude:ld.lng, radius_meters:ld.radius_meters };
      return { ...prev, attendance_settings:{ ...prev.attendance_settings, allowed_locations:nl } };
    });
    setPickerModal({ open:false, index:-1 });
  };

  const handleDirectorySelect = (index, loc) => {
    setPolicyForm(prev => {
      const nl = [...(prev.attendance_settings?.allowed_locations||[])];
      nl[index] = { name:loc.name, latitude:loc.latitude, longitude:loc.longitude, radius_meters:loc.radius_meters };
      return { ...prev, attendance_settings:{ ...prev.attendance_settings, allowed_locations:nl } };
    });
  };

  const filteredEmployees = useMemo(() => {
    let r = gridEmployees;
    if (!searchTerm.trim()) {
      r = r.filter(e => e.username !== 'dev_master');
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      r = r.filter(e=>(e.first_name||'').toLowerCase().includes(q)||(e.last_name||'').toLowerCase().includes(q)||(e.username||'').toLowerCase().includes(q)||(e.employee_code||'').toLowerCase().includes(q));
    }
    return [...r].sort((a,b)=>{ const aR=isRabsOrganization(getOrgName(a)), bR=isRabsOrganization(getOrgName(b)); if(aR!==bR) return aR?1:-1; return 0; });
  }, [gridEmployees, searchTerm]);

  const teamNameByEmployee = useMemo(() => {
    const map = new Map();

    teams.forEach(team => {
      const teamName = team?.name || team?.team_name || team?.teamName || 'No Team';
      const teamMembers = [
        ...(Array.isArray(team?.members) ? team.members : []),
        ...(Array.isArray(team?.membersDetails) ? team.membersDetails : []),
      ];

      teamMembers.forEach(member => {
        [member?.userId, member?._id, member?.username].filter(Boolean).forEach(key => {
          const normalizedKey = String(key).toLowerCase();
          if (!map.has(normalizedKey)) {
            map.set(normalizedKey, teamName);
          }
        });
      });
    });

    return map;
  }, [teams]);

  const getEmployeeTeamName = (emp) => {
    const directTeamName = emp?.teamId?.name || emp?.team?.name || emp?.team_name || emp?.teamName || emp?.team;
    if (directTeamName) return directTeamName;

    const lookupKeys = [emp?._id, emp?.username].filter(Boolean).map(value => String(value).toLowerCase());
    for (const key of lookupKeys) {
      if (teamNameByEmployee.has(key)) {
        return teamNameByEmployee.get(key);
      }
    }

    return 'No Team';
  };

  const toggleGroupCollapse = (groupName) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const groupedEmployeesData = useMemo(() => {
    if (groupBy==='none') return null;
    const g = {};
    filteredEmployees.forEach(emp => {
      const key = groupBy==='organization'?(emp.company_id?.company_name||'No Organization'):getEmployeeTeamName(emp);
      if (!g[key]) g[key]=[];
      g[key].push(emp);
    });
    return g;
  }, [filteredEmployees, groupBy]);

  const paginatedEmployees = useMemo(() => {
    if (groupBy!=='none') return filteredEmployees;
    const s = (currentPage-1)*pageSize;
    return filteredEmployees.slice(s, s+pageSize);
  }, [filteredEmployees, currentPage, pageSize, groupBy]);

  const totalPages = Math.ceil(filteredEmployees.length/pageSize);
  const empHistory = profile?.attendance||[];

  const continuityStats = useMemo(() => {
    const s = { present:0, absent:0, late:0, leaves:0, weeklyOff:0, holidays:0 };
    (empHistory||[]).forEach(rec => {
      const st = getCalendarStatusClass(rec?.status);
      if (st==='present') s.present+=1;
      if (st==='late') { s.late+=1; s.present+=1; }
      if (st==='absent') s.absent+=1;
      if (st==='leave'||st==='pending_leave') s.leaves+=1;
      if (st==='half_day') {
        const hasLeave = !!(rec.leaveType||rec.leave_type);
        if (hasLeave) { s.leaves+=0.5; s.present+=0.5; } else { s.present+=0.5; s.absent+=0.5; }
      }
      if (st==='weekly_off') s.weeklyOff+=1;
      if (st==='holiday') s.holidays+=1;
    });
    if (!(empHistory||[]).length) return {
      present:profile?.summary?.present??0, absent:profile?.summary?.absent??0,
      late:profile?.summary?.late??0, leaves:profile?.summary?.leaves??0,
      weeklyOff:0, holidays:(profile?.holidays||[]).length
    };
    return s;
  }, [empHistory, profile?.summary, profile?.holidays]);

  const leaveHistory = useMemo(() => {
    const approved = Array.isArray(profile?.leaves)?profile.leaves:[];
    const pending = Array.isArray(profile?.pendingLeaves)?profile.pendingLeaves:[];
    return [...approved,...pending]
      .filter(l=>!['rejected','cancelled','withdrawn'].includes(String(l?.approval_status||l?.status||'').toLowerCase()))
      .sort((a,b)=>new Date(b.createdAt||b.from_date||0)-new Date(a.createdAt||a.from_date||0));
  }, [profile?.leaves, profile?.pendingLeaves]);

  const visibleShiftPolicies = useMemo(() => {
    const seen = new Set();
    return (shiftPolicies||[]).filter(shift => {
      const name = String(shift?.shift_name||shift?.name||'').trim();
      if (!name) return false;
      const nn = name.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
      if (nn==='standard shift') return false;
      const status = String(shift?.status||'').toLowerCase();
      const isActive = typeof shift?.isActive==='boolean'?shift.isActive:shift?.is_active;
      if (status&&status!=='active') return false;
      if (typeof isActive==='boolean'&&!isActive) return false;
      const key = `${nn}|${shift?.start_time||''}-${shift?.end_time||''}-${shift?.full_day_hours||shift?.fullDayHours||''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [shiftPolicies]);

  const resolveShiftPolicyId = (employee, overrideShiftId='') => {
    const ref = Array.isArray(employee?.shift_ids)&&employee.shift_ids.length>0?employee.shift_ids[0]:employee?.shift_id;
    const resolved = ref?._id||ref||overrideShiftId?._id||overrideShiftId||'';
    return resolved?String(resolved):'';
  };

  const policyShiftOptions = useMemo(() => (visibleShiftPolicies||[]).map(s=>({...s,_id:String(s?._id||'')})).filter(s=>s._id), [visibleShiftPolicies]);

  const assignedShiftOptions = useMemo(() => {
    const e = profile?.employee||{};
    const raw = Array.isArray(e.shift_ids)?e.shift_ids:[];
    const fb = e.shift_id?[e.shift_id]:[];
    const seen = new Set();
    return [...raw,...fb].map(s=>{ if(!s) return null; if(typeof s==='string') return {_id:s,shift_name:'Assigned Shift',start_time:'09:00',end_time:'18:00',half_day_hours:4}; return s; })
      .filter(s=>s&&s._id&&!seen.has(String(s._id))&&seen.add(String(s._id)));
  }, [profile?.employee]);

  const toEditDateTime = (attendanceDate, hhmm='09:00') => {
    const [hh,mm] = String(hhmm||'09:00').split(':').map(v=>Number(v));
    return moment(attendanceDate).startOf('day').set({ hour:Number.isFinite(hh)?hh:9, minute:Number.isFinite(mm)?mm:0, second:0, millisecond:0 }).format('YYYY-MM-DDTHH:mm');
  };

  const applyStatusModeTimes = (form, statusValue, shiftIdValue) => {
    const sn = String(statusValue||'').toLowerCase();
    const sel = assignedShiftOptions.find(s=>String(s._id)===String(shiftIdValue))||assignedShiftOptions[0]||null;
    if (['absent','leave','pending_leave','weekly_off','holiday'].includes(sn)) return { ...form, status:sn, first_in:'', last_out:'' };
    const st = sel?.start_time||'09:00', et = sel?.end_time||'18:00';
    const fi = toEditDateTime(form.attendance_date, st);
    let lo = toEditDateTime(form.attendance_date, et);
    if (moment(lo).isBefore(moment(fi))) lo = moment(lo).add(1,'day').format('YYYY-MM-DDTHH:mm');
    if (sn==='half_day') {
      const hh = Number(sel?.half_day_hours||4);
      lo = moment(fi).add(hh,'hours').format('YYYY-MM-DDTHH:mm');
      return { ...form, status:'half_day', half_day_session:form.half_day_session||'first_half', first_in:fi, last_out:lo };
    }
    return { ...form, status:(sn==='none'||!sn)?'present':sn, half_day_session:null, first_in:fi, last_out:lo };
  };

  const startEdit = (rec, overrideDate=null) => {
    const employee = profile?.employee||{};
    const recordShiftId = rec.shift_id?._id||rec.shift_id||'';
    const defaultShiftId = recordShiftId||resolveShiftPolicyId(employee);
    const hasPunchIn = Boolean(rec.first_in);
    const isNW = isNonWorkingStatus(rec.status);
    const defMode = (hasPunchIn&&!isNW)?'time_correction':'status_correction';
    setEditingId(rec._id||'new');
    setHasInitialPunchIn(hasPunchIn);
    setEditForm({
      attendance_date:overrideDate||rec.attendance_date, employee_id:id,
      correction_mode:defMode, apply_status_correction:defMode==='status_correction', apply_time_correction:defMode==='time_correction',
      shift_id:defaultShiftId, status:(!rec.status||rec.status==='none')?'present':rec.status,
      half_day_session:rec.half_day_session||'first_half',
      first_in:rec.first_in?moment(rec.first_in).format('YYYY-MM-DDTHH:mm'):(rec._id?'':toEditDateTime(rec.attendance_date,assignedShiftOptions?.[0]?.start_time||'09:00')),
      last_out:rec.last_out?moment(rec.last_out).format('YYYY-MM-DDTHH:mm'):(rec._id?'':toEditDateTime(rec.attendance_date,assignedShiftOptions?.[0]?.end_time||'18:00')),
      remarks:rec.remarks||''
    });
  };

  const fetchBrowseHistory = async (paramMonth, paramYear) => {
    if (!id) return;
    const tm = typeof paramMonth==='number'?paramMonth:browseMonth;
    const ty = typeof paramYear==='number'?paramYear:browseYear;
    setLoading(true); setEditingId(null);
    try {
      const start = moment([ty,tm-1]).startOf('month').format('YYYY-MM-DD');
      const end = moment([ty,tm-1]).endOf('month').format('YYYY-MM-DD');
      const effectiveCompanyId = profile?.employee?.company_id?._id||profile?.employee?.company_id;
      const [r, lbr] = await Promise.all([
        attendanceAPI.getEmployeeFullProfile(id,start,end,effectiveCompanyId),
        leaveAPI.getBalance(id).catch(()=>({ data:[] }))
      ]);
      setProfile({ ...(r||{}), balances:Array.isArray(lbr?.data)?lbr.data:(r?.balances||[]) });
    } catch (e) { toast.error('Failed to load history for selected period'); }
    finally { setLoading(false); }
  };

  const handleApplyFullMonthPresence = async (e) => {
    e.preventDefault();
    if (!id) return;
    if (!fullMonthPresenceEnabled) { toast.error('Enable Full Month Presence to continue'); return; }
    if (!window.confirm('Mark entire month as present?')) return;
    setApplyingFullMonth(true);
    try {
      const res = await attendanceAPI.applyFullMonthPresence({ employee_id:id, year:browseYear, month:browseMonth });
      if (res.success) { toast.success(res.message||'Applied'); fetchBrowseHistory(browseMonth,browseYear); }
      else toast.error(res.message||'Failed');
    } catch (e) { toast.error(e?.response?.data?.message||'Error'); }
    finally { setApplyingFullMonth(false); }
  };

  const saveEdit = async () => {
    const mode = String(editForm.correction_mode||'').toLowerCase();
    if (mode==='time_correction') {
      if (!editForm.shift_id) { toast.error('Please assign shift policy'); return; }
      if (!editForm.first_in||!editForm.last_out) { toast.error('Provide both Punch-In and Punch-Out'); return; }
      if (moment(editForm.last_out).isBefore(moment(editForm.first_in))) { toast.error('Punch-Out cannot be before Punch-In'); return; }
    }
    setSaving(true);
    const payload = { ...editForm, status:editForm.status==='pending_leave'?'leave':editForm.status, apply_status_correction:mode==='status_correction', apply_time_correction:mode==='time_correction' };
    try {
      if (editingId==='new') await attendanceAPI.createManualAdjustment(payload);
      else await attendanceAPI.updateAttendanceRecord(editingId,payload);
      toast.success('Record updated'); setEditingId(null);
      if (tab==='performance') fetchBrowseHistory(browseMonth,browseYear); else fetchData();
    } catch (err) {
      const code = err?.response?.data?.error||err?.response?.data?.code;
      const msg = String(err?.response?.data?.message||'').toLowerCase();
      if (code==='PENDING_LEAVE_ACTION_REQUIRED') { toast.error(err?.response?.data?.message||'Pending leave exists. Resolve it first.'); return; }
      if (code==='CONFLICT_STATUS_TIME_CORRECTION'||(msg.includes('time correction is not applicable')&&msg.includes('status'))) {
        setAutoSwitchHintShown(true);
        setEditForm(p=>({ ...p, correction_mode:'status_correction_time_unchanged', apply_status_correction:false, apply_time_correction:false }));
        toast.info('Switched to Status Correction (Time Unchanged). Verify and save again.');
        return;
      }
      toast.error(err?.response?.data?.message||'Update failed');
    } finally { setSaving(false); }
  };

  useEffect(() => { const d = new Date(startDate); setBrowseMonth(d.getMonth()+1); setBrowseYear(d.getFullYear()); }, [startDate]);

  useEffect(() => {
    if (!profile?.employee||isEditingPolicy) return;
    const e = profile.employee, ov = e.policy_overrides||{};
    const rsi = resolveShiftPolicyId(e,ov.shift_id);
    setPolicyForm({
      weekoff_policy_id:e.weekoff_policy_id?._id||e.weekoff_policy_id||ov.weekoff_policy_id?._id||ov.weekoff_policy_id||'',
      holiday_policy_id:e.holiday_policy_id?._id||e.holiday_policy_id||ov.holiday_policy_id?._id||ov.holiday_policy_id||'',
      shift_id:policyShiftOptions.some(s=>String(s._id)===String(rsi))?rsi:'',
      attendance_settings:e.attendance_settings||{ geo_fencing_required:true, allowed_locations:[] }
    });
  }, [profile, policyShiftOptions]);

  const fetchData = async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true); setMigrationHistoryLoading(true);
    try {
      const [pr, lbr, polr, migr] = await Promise.all([
        attendanceAPI.getEmployeeFullProfile(id,startDate,endDate),
        leaveAPI.getBalance(id).catch(()=>({ data:[] })),
        masterAPI.getLeavePolicies({ limit:200 }).catch(()=>({ data:[] })),
        attendanceAPI.getEmployeeMigrationHistory(id).catch(()=>({ data:[] }))
      ]);
      setProfile({ ...(pr||{}), balances:Array.isArray(lbr?.data)?lbr.data:(pr?.balances||[]) });
      setMigrationHistory(Array.isArray(migr?.data)?migr.data:[]);
      const rows = Array.isArray(polr?.data)?polr.data:Array.isArray(polr)?polr:[];
      setLeavePolicies(rows);
    } catch (e) { toast.error(e?.message||'Failed to load employee profile'); }
    finally { setLoading(false); setMigrationHistoryLoading(false); }
  };

  useEffect(() => {
    if (!startDate||!endDate) return;
    if (moment(endDate).isBefore(moment(startDate))) { toast.error('End date cannot be before start date'); setEndDate(startDate); return; }
    fetchData();
  }, [id, startDate, endDate]);

  useEffect(() => { if (id&&tab==='performance') fetchBrowseHistory(browseMonth,browseYear); }, [id, browseMonth, browseYear, tab]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const r = await masterAPI.getUsers({ limit:2000, isActive:true, all_companies:true });
        const rows = (r?.data||[]).filter(u => u.username !== 'dev_master');
        setUsers(rows);
        if (rows.length&&!selectedEmployeeId) setSelectedEmployeeId(rows[0]._id);
      } catch { setUsers([]); }
    };
    if (!id) fetchUsers();
  }, [id, selectedEmployeeId]);

  useEffect(() => {
    const fetch = async () => {
      try { const r = await masterAPI.getOrganizations(); setOrganizations(r?.data||[]); }
      catch { toast.error('Failed to load organizations'); setOrganizations([]); }
    };
    fetch();
  }, [id]);

  const fetchAllEmployees = async () => {
    setGridLoading(true);
    try { const r = await masterAPI.getUsers({ limit:2000, isActive:true, all_companies:true }); setGridEmployees(r?.data||[]); }
    catch { toast.error('Failed to load employees'); setGridEmployees([]); }
    finally { setGridLoading(false); }
  };

  useEffect(() => { if (!id) fetchAllEmployees(); }, [id]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await masterAPI.getTeams();
        const teamList = Array.isArray(res?.teams) ? res.teams : Array.isArray(res) ? res : [];
        setTeams(teamList);
      } catch {
        setTeams([]);
      }
    };

    if (!id) fetchTeams();
  }, [id]);

  const handleDeactivateEmployee = async (emp) => {
    try {
      const r = await axios.post(`${process.env.REACT_APP_API_STRING}/toggle-user-status`, { username:emp.username, isActive:false });
      toast.success(r.data.message||'Deactivated');
      await fetchAllEmployees();
    } catch (e) { toast.error(e.response?.data?.message||'Failed to deactivate'); }
  };

  useEffect(() => { if (!id) setSelectedUserIds([]); }, [id]);
  useEffect(() => { if (!id&&Array.isArray(preselectedEmployeeIds)&&preselectedEmployeeIds.length) setSelectedUserIds(preselectedEmployeeIds); }, [id, preselectedEmployeeIds]);

  const empCompanyId = profile?.employee?.company_id?._id || profile?.employee?.company_id;

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const params = empCompanyId ? { company_id: empCompanyId } : {};
        const [lr, wor, hor, sr] = await Promise.all([
          masterAPI.getLeavePolicies({ limit:500, ...params }).catch(()=>({ data:[] })),
          masterAPI.getWeekOffPolicies(params).catch(()=>({ data:[] })),
          masterAPI.getHolidayPolicies({ year:new Date().getFullYear(), all_companies:true, ...params }).catch(()=>({ data:[] })),
          masterAPI.getShifts({ limit:500, all_companies:true, ...params }).catch(()=>({ data:[] }))
        ]);
        setLeavePolicies(Array.isArray(lr?.data)?lr.data:[]);
        setWeekOffPolicies(Array.isArray(wor?.data)?wor.data:[]);
        setHolidayPolicies(Array.isArray(hor?.data)?hor.data:[]);
        setShiftPolicies(Array.isArray(sr?.data)?sr.data:[]);
      } catch { setLeavePolicies([]); setWeekOffPolicies([]); setHolidayPolicies([]); setShiftPolicies([]); }
    };
    if (id && !empCompanyId) return;
    fetchCatalogs();
  }, [id, empCompanyId]);

  const employeeName = useMemo(() => {
    if (!profile?.employee) return 'Employee';
    const e = profile.employee;
    return `${e.first_name||''} ${e.last_name||''}`.trim()||e.username||'Employee';
  }, [profile]);

  const currentOrgName = useMemo(() => {
    if (id&&profile?.employee?.company_id) return profile.employee.company_id.company_name||profile.employee.company_id.name||'N/A';
    if (migratingEmployeeId) { const e = gridEmployees?.find(x=>x._id===migratingEmployeeId); return e?.company_id?.company_name||(typeof e?.company_id==='object'?(e.company_id.company_name||e.company_id.name||'N/A'):'N/A'); }
    return 'N/A';
  }, [id, profile, migratingEmployeeId, gridEmployees]);

  const handleBulkManualAdjustment = async (e) => {
    e.preventDefault();
    if (!id) return toast.error('No employee selected');
    try {
      const r = await attendanceAPI.bulkUpdateAttendance({ employee_id:id, ...bulkManualForm });
      if (r.success) { toast.success(r.message||'Bulk adjustment successful'); setTimeout(()=>fetchData(),500); }
      else toast.error(r.message||'Failed');
    } catch (e) { toast.error(e.response?.data?.message||'Error'); }
  };

  useEffect(() => {
    const ns = moment([selectedYear,selectedMonth]).startOf('month').format('YYYY-MM-DD');
    const ne = moment([selectedYear,selectedMonth]).endOf('month').format('YYYY-MM-DD');
    setStartDate(ns); setEndDate(ne);
  }, [selectedMonth, selectedYear]);

  const handleUpdateBalance = async (e) => {
    e.preventDefault();
    if (!id) { toast.error('No employee ID'); return; }
    if (!balanceForm.leave_policy_id) { toast.error('Select a leave policy'); return; }
    try {
      const ob = Number(balanceForm.opening_balance)||0, u = Number(balanceForm.used)||0, p = Number(balanceForm.pending)||0;
      if (ob<0||u<0||p<0) { toast.error('Values cannot be negative'); return; }
      await leaveAPI.updateBalance(id, { leave_policy_id:balanceForm.leave_policy_id, opening_balance:ob, used:u, pending:p });
      toast.success('Leave balance updated');
      setShowLeaveBalanceForm(false);
      if (typeof window!=='undefined') window.dispatchEvent(new Event('leave-balance-updated'));
      fetchData();
    } catch (e) { toast.error(e?.message||e?.error||'Failed to update leave balance', { duration:5000 }); }
  };

  const handleMigrateEmployee = async (employeeId) => {
    if (!destOrgId) { toast.error('Select destination organization'); return; }
    try {
      const r = await attendanceAPI.migrateEmployee(employeeId,destOrgId);
      if (r.success) {
        toast.success(`Migrated to ${r.migratedEmployee.company_name}`);
        setShowMigrationModal(false); setMigratingEmployeeId(null); setDestOrgId('');
        const res = await masterAPI.getUsers({ limit:2000, isActive:true, all_companies:true });
        setGridEmployees(res?.data||[]);
      }
    } catch (e) { toast.error(e?.message||'Migration failed'); }
  };

  const handleUpdateIndividualPolicies = async (e) => {
    if (e) e.preventDefault();
    setPolicySaving(true);
    try {
      const r = await masterAPI.assignPolicyToUser(id,policyForm);
      if (r) { toast.success('Individual policies updated'); setIsEditingPolicy(false); fetchData(); }
    } catch (e) { toast.error(e?.message||'Failed to update policies'); }
    finally { setPolicySaving(false); }
  };

  const formatMigrationPeriod = (period) => {
    if (!period?.from||!period?.to) return 'Unavailable';
    const days = Number(period?.days);
    const from = new Date(period.from).toLocaleDateString(), to = new Date(period.to).toLocaleDateString();
    if (Number.isFinite(days)) return `${days} day${days===1?'':'s'} (${from} to ${to})`;
    return `${from} to ${to}`;
  };

  const handleBulkAssignPolicies = async () => {
    if (!selectedUserIds.length) { toast.error('Select at least one user'); return; }
    const hasAny = !!bulkPolicyForm.weekoff_policy_id||!!bulkPolicyForm.holiday_policy_id||!!bulkPolicyForm.shift_id||(bulkPolicyForm.leave_policy_ids||[]).length>0;
    if (!hasAny) { toast.error('Select at least one policy type'); return; }
    setBulkPolicyLoading(true);
    try {
      const payload = { user_ids:selectedUserIds,
        ...(bulkPolicyForm.weekoff_policy_id?{weekoff_policy_id:bulkPolicyForm.weekoff_policy_id}:{}),
        ...(bulkPolicyForm.holiday_policy_id?{holiday_policy_id:bulkPolicyForm.holiday_policy_id}:{}),
        ...(bulkPolicyForm.shift_id?{shift_id:bulkPolicyForm.shift_id}:{}),
        ...(bulkPolicyForm.leave_policy_ids.length?{leave_policy_ids:bulkPolicyForm.leave_policy_ids}:{})
      };
      const r = await masterAPI.bulkAssignPoliciesToUsers(payload);
      if (r.success) {
        toast.success(`Assigned policies to ${r.assignedCount} users`);
        setShowBulkPolicyModal(false); setSelectedUserIds([]);
        setBulkPolicyForm({ weekoff_policy_id:'', holiday_policy_id:'', shift_id:'', leave_policy_ids:[] });
      }
    } catch (e) { toast.error(e?.message||'Failed to assign policies'); }
    finally { setBulkPolicyLoading(false); }
  };

  const handleDownloadOrgReport = (orgName, items) => setExportModal({ open:true, orgName, items });

  // ── Full Directory Export (all employees, grouped by org or team) ─────────
  const handleFullDirectoryExport = async () => {
    const { startDate: dlStart, endDate: dlEnd, groupBy: dlGroupBy } = epwDlModal;
    setEpwDlLoading(true);
    epwDlVersionRef.current += 1;
    const version = epwDlVersionRef.current;
    const monthLabel = moment(dlStart).format('MMMM YYYY').replace(' ', '');
    const fileName = `Attendance_Report_${monthLabel}_v${version}.xlsx`;
    const lt = toast.loading('Preparing report…');
    try {
      const ExcelJSLib = await import('exceljs');
      const { saveAs: saveAsLib } = await import('file-saver');
      const wb = new ExcelJSLib.Workbook();
      wb.creator = 'AlVision Exim';

      const navy   = { argb: 'FF1B365D' };
      const white  = { argb: 'FFFFFFFF' };
      const light  = { argb: 'FFF8FAFC' };

      // Build groups from filteredEmployees
      let groups = {};
      if (dlGroupBy === 'organization') {
        filteredEmployees.forEach(emp => {
          const key = emp.company_id?.company_name || 'No Organization';
          if (!groups[key]) groups[key] = [];
          groups[key].push(emp);
        });
      } else if (dlGroupBy === 'team') {
        filteredEmployees.forEach(emp => {
          const key = getEmployeeTeamName(emp);
          if (!groups[key]) groups[key] = [];
          groups[key].push(emp);
        });
      } else {
        groups['All Employees'] = filteredEmployees;
      }

      const groupNames = sortGroupNamesWithRabsLast(Object.keys(groups));

      for (const groupName of groupNames) {
        const employees = groups[groupName];
        if (!employees || employees.length === 0) continue;

        const sheetName = groupName.substring(0, 31);
        const ws = wb.addWorksheet(sheetName);

        // ── Row 1: Org Header ──
        const orgRow = ws.addRow([groupName.toUpperCase()]);
        orgRow.height = 30;
        const orgCell = orgRow.getCell(1);
        orgCell.font = { bold: true, size: 14, name: 'Arial', color: { argb: 'FFFFFFFF' } };
        orgCell.fill = { type: 'pattern', pattern: 'solid', fgColor: navy };
        orgCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.mergeCells(`A${orgRow.number}:G${orgRow.number}`);

        // ── Row 2: Period Header ──
        const periodRow = ws.addRow([`Attendance Log — ${moment(dlStart).format('MMMM YYYY')}`]);
        periodRow.height = 22;
        const periodCell = periodRow.getCell(1);
        periodCell.font = { bold: true, size: 11, name: 'Arial', color: { argb: 'FFFFFFFF' } };
        periodCell.fill = { type: 'pattern', pattern: 'solid', fgColor: navy };
        periodCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.mergeCells(`A${periodRow.number}:G${periodRow.number}`);

        // ── Fetch all employees' logs in bulk ──
        const start = moment(dlStart).format('YYYY-MM-DD');
        const end   = moment(dlEnd).format('YYYY-MM-DD');

        let response;
        if (teamId && teamId !== 'all') {
          response = await attendanceAPI.getTeamAttendanceReport(start, end, teamId);
        } else {
          response = await attendanceAPI.getAdminAttendanceReport(start, end, undefined, 'all');
        }

        const reportDataRaw = response?.data || [];
        const reportDataEnriched = await enrichReportWithLeaveBalance(reportDataRaw);
        const reportMap = new Map(reportDataEnriched.map(e => [String(e.id), e]));

        let summaryRows = []; // for in-sheet summary

        employees.forEach((emp) => {
          try {
            const p = reportMap.get(String(emp._id));
            if (!p) {
              console.warn('No report data found for employee', emp._id);
              return;
            }
            const logs = p.history || [];
            let empPresent = 0, empAbsent = 0, empHalfDay = 0, empLeaves = 0;
            let empTotalHours = 0;
            const empName = [emp.first_name, emp.last_name].filter(Boolean).join(' ').trim() || emp.username || '';

            // Spacer row before each employee name header (except the first employee)
            if (ws.rowCount > 2) {
              ws.addRow([]);
            }

            // Merged Employee Name Header
            const empHeaderRow = ws.addRow([empName]);
            empHeaderRow.height = 22;
            ws.mergeCells(`A${empHeaderRow.number}:G${empHeaderRow.number}`);
            const empCell = empHeaderRow.getCell(1);
            empCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 11 };
            empCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B6CB0' } }; // steel blue
            empCell.alignment = { horizontal: 'center', vertical: 'middle' };

            // Column Subheaders
            const subheaderRow = ws.addRow(['Date', 'Day', 'Shift', 'Status', 'In Time', 'Out Time', 'Total Hours']);
            subheaderRow.height = 20;
            subheaderRow.eachCell(cell => {
              cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }; // royal blue
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              cell.border = {
                top: { style: 'thin', color: { argb: 'FFB0C4DE' } },
                left: { style: 'thin', color: { argb: 'FFB0C4DE' } },
                bottom: { style: 'thin', color: { argb: 'FFB0C4DE' } },
                right: { style: 'thin', color: { argb: 'FFB0C4DE' } }
              };
            });

            // Sort logs ascending
            const sortedLogs = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));

            sortedLogs.forEach(log => {
              const isSunday = moment(log.date).day() === 0;
              let logStatus = log.status || 'Present';
              if (isSunday) {
                logStatus = 'weekly_off';
              }

              const sn = log.shift_id?.shift_name || p.shift_id?.shift_name || '';
              const st = log.shift_id?.start_time || p.shift_id?.start_time || '';
              const et = log.shift_id?.end_time   || p.shift_id?.end_time   || '';
              const shiftStr = sn ? (st && et ? `${sn} ${st}–${et}` : sn) : (st && et ? `${st}–${et}` : '—');

              const fdt = dt => dt ? moment(dt).format('h:mm A') : '';
              let displayStatus = logStatus || 'Present';
              if (logStatus === 'half_day') displayStatus = 'Half Day';
              else if (logStatus) {
                const statusLower = logStatus.toLowerCase();
                if (statusLower === 'weekly_off' || statusLower === 'weekoff' || statusLower === 'off') displayStatus = 'Weekly Off';
                else if (statusLower === 'half_day') displayStatus = 'Half Day';
                else displayStatus = logStatus.charAt(0).toUpperCase() + logStatus.slice(1).replace(/_/g, ' ');
              }

              // Calc work hours
              let wh = '';
              if (log.first_in && log.last_out) {
                const diff = moment(log.last_out).diff(moment(log.first_in), 'hours', true);
                if (diff > 0 && diff < 24) {
                  wh = diff.toFixed(1) + ' hrs';
                  empTotalHours += diff;
                }
              }

              const dateStr = moment(log.date).format('DD-MM-YYYY');
              const dayStr = moment(log.date).format('ddd');

              const dataRow = ws.addRow([dateStr, dayStr, shiftStr, displayStatus, fdt(log.first_in), fdt(log.last_out), wh]);
              dataRow.height = 18;

              dataRow.eachCell((cell, colNumber) => {
                cell.font = { name: 'Arial', size: 10 };
                cell.border = {
                  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                  right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                };
                if (colNumber === 3) {
                  cell.alignment = { horizontal: 'left', vertical: 'middle' };
                } else {
                  cell.alignment = { horizontal: 'center', vertical: 'middle' };
                }
              });

              // Style the Status cell
              const statusCell = dataRow.getCell(4);
              statusCell.font = { bold: true, name: 'Arial', size: 10 };
              const sLower = String(logStatus).toLowerCase();
              
              if (sLower === 'present' || sLower === 'late' || sLower === 'present_late') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; // light green
                statusCell.font.color = { argb: 'FF065F46' }; // dark green
              } else if (sLower === 'absent') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // light red
                statusCell.font.color = { argb: 'FF991B1B' }; // dark red
              } else if (sLower === 'leave' || sLower === 'pending_leave') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // light orange
                statusCell.font.color = { argb: 'FF92400E' }; // dark orange
              } else if (sLower === 'half_day') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }; // light blue
                statusCell.font.color = { argb: 'FF1E40AF' }; // dark blue
              } else if (sLower === 'weekly_off' || sLower === 'weekoff' || sLower === 'off') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } }; // light soft green
                statusCell.font.color = { argb: 'FF15803D' }; // dark green
              } else if (sLower === 'holiday') {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } }; // light purple
                statusCell.font.color = { argb: 'FF6B21A8' }; // dark purple
              } else {
                statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // light grey
                statusCell.font.color = { argb: 'FF475569' }; // dark grey
              }

              if (sLower === 'present' || sLower === 'late' || sLower === 'holiday') empPresent++;
              else if (sLower === 'absent') empAbsent++;
              else if (sLower === 'half_day') empHalfDay++;
              else if (sLower === 'leave' || sLower === 'pending_leave') empLeaves++;
            });

            // Add a total hours summary row right after the daily logs for the employee
            const totalRow = ws.addRow(['Total Worked Hours', '', '', '', '', '', `${empTotalHours.toFixed(1)} hrs`]);
            totalRow.height = 20;
            ws.mergeCells(`A${totalRow.number}:F${totalRow.number}`);
            for (let colNum = 1; colNum <= 7; colNum++) {
              const cell = totalRow.getCell(colNum);
              cell.font = { bold: true, name: 'Arial', size: 10 };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; // light grey/slate-200
              cell.border = {
                top: { style: 'thin', color: { argb: 'FFB0C4DE' } },
                left: { style: 'thin', color: { argb: 'FFB0C4DE' } },
                bottom: { style: 'thin', color: { argb: 'FFB0C4DE' } },
                right: { style: 'thin', color: { argb: 'FFB0C4DE' } }
              };
              if (colNum === 1) {
                cell.alignment = { horizontal: 'right', vertical: 'middle' };
              } else if (colNum === 7) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
              }
            }

            const roundLeave = (value) => Math.round(Number(value || 0) * 10) / 10;
            const openingBalance = roundLeave(p.opening_balance || 0);
            const privilegeTaken = roundLeave(p.privilege_taken || 0);
            const lwpTaken = roundLeave(p.lwp_taken || 0);
            const availableBalance = roundLeave(p.available_balance || 0);

            summaryRows.push({
              name: empName,
              present: empPresent,
              absent: empAbsent,
              halfDay: empHalfDay,
              leaves: empLeaves,
              total: sortedLogs.length,
              totalHours: empTotalHours,
              openingBalance,
              privilegeTaken,
              lwpTaken,
              availableBalance
            });
          } catch (e) {
            console.warn('Failed to process logs for', emp._id, e);
          }
        });

        // ── In-sheet Summary ──────────────────────────────────────────────
        ws.addRow([]); // spacer
        ws.addRow([]);

        const summaryTitleRow = ws.addRow(['--- SUMMARY ---']);
        summaryTitleRow.getCell(1).font = { bold: true, size: 11, name: 'Arial', color: white };
        summaryTitleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B365D' } };
        summaryTitleRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
        summaryTitleRow.height = 24;
        ws.mergeCells(`A${summaryTitleRow.number}:K${summaryTitleRow.number}`);

        const sumHeaderRow = ws.addRow(['Employee Name', 'Present', 'Absent', 'Half Day', 'Leaves', 'Total Records', 'Total Hours', 'Opening Balance', 'PL Taken', 'LWP Taken', 'Available Balance']);
        sumHeaderRow.height = 20;
        sumHeaderRow.eachCell(cell => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // slate
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        summaryRows.forEach((sr, idx) => {
          const sr2 = ws.addRow([
            sr.name,
            sr.present,
            sr.absent,
            sr.halfDay,
            sr.leaves,
            sr.total,
            `${sr.totalHours.toFixed(1)} hrs`,
            sr.openingBalance,
            sr.privilegeTaken,
            sr.lwpTaken,
            sr.availableBalance
          ]);
          sr2.height = 18;
          sr2.getCell(1).font = { bold: true, name: 'Arial', size: 10 };
          if (idx % 2 === 0) sr2.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: light }; });
          
          sr2.eachCell((cell, colNumber) => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
            if (colNumber === 1) {
              cell.alignment = { horizontal: 'left', vertical: 'middle' };
            } else {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }
          });
        });

        // Totals
        const totals = summaryRows.reduce((acc, r) => ({
          present: acc.present + r.present,
          absent: acc.absent + r.absent,
          halfDay: acc.halfDay + r.halfDay,
          leaves: acc.leaves + r.leaves,
          total: acc.total + r.total,
          totalHours: acc.totalHours + r.totalHours,
          openingBalance: acc.openingBalance + r.openingBalance,
          privilegeTaken: acc.privilegeTaken + r.privilegeTaken,
          lwpTaken: acc.lwpTaken + r.lwpTaken,
          availableBalance: acc.availableBalance + r.availableBalance
        }), { present:0, absent:0, halfDay:0, leaves:0, total:0, totalHours:0, openingBalance:0, privilegeTaken:0, lwpTaken:0, availableBalance:0 });

        const totalRow2 = ws.addRow([
          `Total (${summaryRows.length} employees)`,
          totals.present,
          totals.absent,
          totals.halfDay,
          totals.leaves,
          totals.total,
          `${totals.totalHours.toFixed(1)} hrs`,
          totals.openingBalance,
          totals.privilegeTaken,
          totals.lwpTaken,
          totals.availableBalance
        ]);
        totalRow2.height = 22;
        totalRow2.eachCell(cell => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // dark navy
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
        totalRow2.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
        [2,3,4,5,6,7,8,9,10,11].forEach(c => { totalRow2.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' }; });

        // Column widths: 1-7 for daily log columns, 8-11 for leave balance summary
        ws.getColumn(1).width = 14; // Date
        ws.getColumn(2).width = 10; // Day
        ws.getColumn(3).width = 28; // Shift
        ws.getColumn(4).width = 18; // Status
        ws.getColumn(5).width = 15; // In Time
        ws.getColumn(6).width = 15; // Out Time
        ws.getColumn(7).width = 15; // Total Hours
        // Summary-only columns (leave balance) — need explicit widths or they default to ~8 chars
        ws.getColumn(8).width = 18;  // Opening Balance
        ws.getColumn(9).width = 14;  // PL Taken
        ws.getColumn(10).width = 14; // LWP Taken
        ws.getColumn(11).width = 18; // Available Balance

        // Freeze top 2 rows
        ws.views = [{ state: 'frozen', ySplit: 2 }];
      }

      const buffer = await wb.xlsx.writeBuffer();
      saveAsLib(new Blob([buffer], { type: 'application/octet-stream' }), fileName);
      toast.dismiss(lt);
      toast.success(`Report downloaded: ${fileName}`);
    } catch (e) {
      console.error('Full directory export failed:', e);
      toast.dismiss(lt);
      toast.error('Failed to generate report');
    } finally {
      setEpwDlLoading(false);
      setEpwDlModal(p => ({ ...p, open: false }));
    }
  };

  const enrichReportWithLeaveBalance = async (data) => {
    try {
      const employeeIds = data.map(emp => emp.id);
      if (employeeIds.length === 0) return data;
      
      const balanceRes = await attendanceAPI.getLeaveBalances(employeeIds);
      const privilegeOpeningMap = new Map();
      const privilegeAvailableMap = new Map();
      const privilegeUsedMap = new Map();
      const lwpUsedMap = new Map();
      
      if (balanceRes?.data) {
        balanceRes.data.forEach(balance => {
          const empId = balance.employee_id;
          const leaveType = String(balance.leave_type || balance.leave_policy_id?.leave_type || balance.name || '').toLowerCase();

          if (leaveType.includes('privilege') || leaveType.includes('earned') || leaveType === 'el') {
            privilegeOpeningMap.set(empId, Number(balance.opening_balance || 0));
            privilegeAvailableMap.set(empId, Number(balance.closing_balance || 0));
            privilegeUsedMap.set(empId, Number(balance.used || 0));
          } else if (leaveType.includes('lwp') || leaveType.includes('without pay') || leaveType === 'lop') {
            lwpUsedMap.set(empId, Number(balance.used || 0));
          }
        });
      }
      
      return data.map(emp => ({
        ...emp,
        opening_balance: privilegeOpeningMap.get(emp.id) || 0,
        available_balance: privilegeAvailableMap.get(emp.id) || 0,
        leave_balance: privilegeAvailableMap.get(emp.id) || 0,
        privilege_taken: privilegeUsedMap.get(emp.id) || 0,
        lwp_taken: lwpUsedMap.get(emp.id) || 0
      }));
    } catch (err) {
      console.error('[EmployeeProfileWorkspace] enrichReportWithLeaveBalance failed:', err);
      return data.map(emp => ({
        ...emp,
        opening_balance: 0,
        available_balance: 0,
        leave_balance: 0,
        privilege_taken: 0,
        lwp_taken: 0
      }));
    }
  };

  const handleSummaryExport = async () => {
    const { startDate, endDate } = epwDlModal;
    if (!startDate || !endDate) return;

    setEpwDlLoading(true);
    const lt = toast.loading('Generating Summary Attendance Report...');

    try {
      let response;
      if (teamId && teamId !== 'all') {
        response = await attendanceAPI.getTeamAttendanceReport(startDate, endDate, teamId);
      } else {
        response = await attendanceAPI.getAdminAttendanceReport(startDate, endDate, undefined, 'all');
      }

      let reportDataRaw = response?.data || [];
      const reportDataEnriched = await enrichReportWithLeaveBalance(reportDataRaw);
      const filteredEmpIds = new Set(filteredEmployees.map(emp => String(emp._id)));
      const filteredReportData = reportDataEnriched.filter(emp => filteredEmpIds.has(String(emp.id)));
      const reportMetricsById = new Map(filteredReportData.map(row => [row.id, row]));

      // Preprocess to override Sunday logs to 'weekly_off'
      const enrichHistoryWithSundayOverride = (history) => {
        if (!Array.isArray(history)) return [];
        return history.map(day => {
          const isSunday = moment(day.date || day.attendance_date).day() === 0;
          if (isSunday) {
            return {
              ...day,
              status: 'weekly_off'
            };
          }
          return day;
        });
      };

      const processedReportData = filteredReportData.map(e => ({
        ...e,
        history: enrichHistoryWithSundayOverride(e.history)
      }));

      // Setup workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Exim Application';

      // ── Helper functions identical to AttendanceReport.jsx ─────────────────
      const styleHeader = (row, bgArgb, textArgb = 'FF0F172A') => {
        row.eachCell(cell => {
          cell.font  = { bold: true, color: { argb: textArgb }, name: 'Arial', size: 10 };
          cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        });
      };

      const roundLeave = (value) => Math.round(Number(value || 0) * 10) / 10;
      const getLeaveMetrics = (employeeId) => reportMetricsById.get(employeeId) || {};
      const isPrivilegeLeave = (leaveType = '') => {
        const type = String(leaveType || '').toLowerCase();
        return type.includes('privilege') || type.includes('earned');
      };
      const isLwpLeave = (leaveType = '') => {
        const type = String(leaveType || '').toLowerCase();
        return type.includes('lwp') || type.includes('without pay');
      };
      const getPayrollPresentDays = (employee) => {
        if (!Array.isArray(employee.history) || employee.history.length === 0) {
          return Number(employee.present || 0) + Number(employee.late || 0) + Number(employee.halfDay || 0);
        }

        return roundLeave(employee.history.reduce((total, day) => {
          const status = String(day?.status || '').toLowerCase();
          const leaveType = day?.leaveType || day?.leave_type || '';

          if (status === 'present' || status === 'late' || status === 'weekly_off' || status === 'holiday') return total + 1;
          if (status === 'leave') return isPrivilegeLeave(leaveType) ? total + 1 : total;
          if (status === 'half_day') {
            if (isPrivilegeLeave(leaveType)) return total + 1;
            if (isLwpLeave(leaveType)) return total + 0.5;
            return total + 1;
          }

          return total;
        }, 0));
      };
      const isHalfDayLeave = (day) => Boolean(day?.is_half_day_leave || day?.is_half_day || day?.isHalfDayLeave);
      const getActualHalfDays = (employee) => {
        if (!Array.isArray(employee.history) || employee.history.length === 0) return Number(employee.halfDay || 0);

        return roundLeave(employee.history.reduce((total, day) => {
          const status = String(day?.status || '').toLowerCase();
          const leaveType = day?.leaveType || day?.leave_type || '';
          if (status === 'half_day' && !leaveType && !isHalfDayLeave(day)) return total + 1;
          return total;
        }, 0));
      };
      const getLeaveTakenDays = (employee, matcher) => {
        if (!Array.isArray(employee.history) || employee.history.length === 0) return 0;

        return roundLeave(employee.history.reduce((total, day) => {
          const status = String(day?.status || '').toLowerCase();
          const leaveType = day?.leaveType || day?.leave_type || '';

          if (!matcher(leaveType)) return total;
          if (status === 'leave') return total + (isHalfDayLeave(day) ? 0.5 : 1);
          if (status === 'half_day') return total + 0.5;

          return total;
        }, 0));
      };
      const getLeaveCountForReport = (employee) => {
        if (!Array.isArray(employee.history) || employee.history.length === 0) return Number(employee.leaves || 0);

        return roundLeave(employee.history.reduce((total, day) => {
          const status = String(day?.status || '').toLowerCase();
          const leaveType = day?.leaveType || day?.leave_type || '';

          if (status === 'leave') return total + (isHalfDayLeave(day) ? 0.5 : 1);
          if (status === 'half_day' && (leaveType || isHalfDayLeave(day))) return total + 0.5;

          return total;
        }, 0));
      };
      const getHalfDayLeaveCountForReport = (employee) => {
        if (!Array.isArray(employee.history) || employee.history.length === 0) return 0;

        return roundLeave(employee.history.reduce((total, day) => {
          const status = String(day?.status || '').toLowerCase();
          const leaveType = day?.leaveType || day?.leave_type || '';
          if (status === 'half_day' && (leaveType || isHalfDayLeave(day))) return total + 1;
          if (status === 'leave' && isHalfDayLeave(day)) return total + 1;
          return total;
        }, 0));
      };
      const getFullDayLeaveCountForReport = (employee) => {
        if (!Array.isArray(employee.history) || employee.history.length === 0) return Number(employee.leaves || 0);

        return roundLeave(employee.history.reduce((total, day) => {
          const status = String(day?.status || '').toLowerCase();
          if (status === 'leave' && !isHalfDayLeave(day)) return total + 1;
          return total;
        }, 0));
      };
      const getPrivilegeTakenForReport = (employee) => getLeaveTakenDays(employee, isPrivilegeLeave);
      const getLwpTakenForReport = (employee) => getLeaveTakenDays(employee, isLwpLeave);
      const getAvailableBalanceForReport = (employee) => {
        const metrics = getLeaveMetrics(employee.id);
        return Math.max(0, roundLeave(Number(metrics.opening_balance || 0) - getPrivilegeTakenForReport(employee)));
      };
      const sumLeaveMetric = (employees, key) => roundLeave(
        employees.reduce((sum, employee) => {
          const metrics = getLeaveMetrics(employee.id);
          let value;
          if (key === 'available_balance') value = getAvailableBalanceForReport(employee);
          else if (key === 'privilege_taken') value = getPrivilegeTakenForReport(employee);
          else if (key === 'lwp_taken') value = getLwpTakenForReport(employee);
          else value = metrics[key] ?? 0;
          return sum + Number(value || 0);
        }, 0)
      );

      // Group by company name
      const byCompany = {};
      processedReportData.forEach(e => {
        const co = e.company_name?.trim() || 'Unassigned';
        if (!byCompany[co]) byCompany[co] = [];
        byCompany[co].push(e);
      });

      // Build one sheet per company
      Object.entries(byCompany).sort(([a], [b]) => a.localeCompare(b)).forEach(([companyName, employees]) => {
        const ws = workbook.addWorksheet(companyName.substring(0, 31));

        const titleRow = ws.addRow([`${companyName}  |  Attendance Report: ${startDate}  →  ${endDate}`]);
        titleRow.font = { bold: true, size: 13, name: 'Arial', color: { argb: 'FFFFFFFF' } };
        titleRow.height = 28;
        titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
        titleRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
        ws.mergeCells(`A${titleRow.number}:L${titleRow.number}`);

        ws.addRow([]);

        const COLS = ['Employee', 'Present', 'Absent', 'Half Day', 'Half Day Leaves', 'Full Day Leaves', 'Complete Leaves', 'Opening Balance', 'PL Taken', 'LWP Taken', 'Available Balance', 'Avg Hours/Day'];
        const headerRow = ws.addRow(COLS);
        headerRow.height = 22;
        styleHeader(headerRow, 'FF334155', 'FFFFFFFF');

        const STATUS_COLORS = {
          present : 'FF10B981',
          absent  : 'FFEF4444',
          halfDay : 'FF3B82F6',
          leaves  : 'FF8B5CF6',
          pending : 'FFF97316',
        };

        employees.forEach((e, idx) => {
          const leaveMetrics = getLeaveMetrics(e.id);
          const openingBalance = leaveMetrics.opening_balance ?? 0;
          const privilegeTaken = getPrivilegeTakenForReport(e);
          const lwpTaken = getLwpTakenForReport(e);
          const availableBalance = getAvailableBalanceForReport(e);

          const row = ws.addRow([
            e.name,
            getPayrollPresentDays(e),
            e.absent,
            getActualHalfDays(e),
            getHalfDayLeaveCountForReport(e),
            getFullDayLeaveCountForReport(e),
            getLeaveCountForReport(e),
            roundLeave(openingBalance),
            roundLeave(privilegeTaken),
            roundLeave(lwpTaken),
            roundLeave(availableBalance),
            e.avgHours,
          ]);

          row.height = 20;
          row.getCell(1).font = { bold: true, name: 'Arial', size: 10 };
          row.getCell(1).alignment = { vertical: 'middle' };

          if (idx % 2 === 0) {
            row.eachCell(cell => {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            });
          }

          [[2, STATUS_COLORS.present], [3, STATUS_COLORS.absent], [4, STATUS_COLORS.halfDay],
           [5, STATUS_COLORS.leaves], [6, STATUS_COLORS.leaves], [7, STATUS_COLORS.leaves],
           [8, STATUS_COLORS.pending], [9, STATUS_COLORS.pending], [10, STATUS_COLORS.pending],
           [11, STATUS_COLORS.pending]]
          .forEach(([col, color]) => {
            const cell = row.getCell(col);
            cell.font = { bold: true, color: { argb: color }, name: 'Arial', size: 10 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          });

          row.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };

          row.eachCell(cell => {
            cell.border = {
              bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } },
              right:  { style: 'hair', color: { argb: 'FFE2E8F0' } },
            };
          });
        });

        ws.addRow([]);

        const totalRow = ws.addRow([
          `Total  (${employees.length} employees)`,
          employees.reduce((s, e) => s + getPayrollPresentDays(e), 0),
          employees.reduce((s, e) => s + (e.absent || 0), 0),
          employees.reduce((s, e) => s + getActualHalfDays(e), 0),
          employees.reduce((s, e) => s + getHalfDayLeaveCountForReport(e), 0),
          employees.reduce((s, e) => s + getFullDayLeaveCountForReport(e), 0),
          employees.reduce((s, e) => s + getLeaveCountForReport(e), 0),
          sumLeaveMetric(employees, 'opening_balance'),
          sumLeaveMetric(employees, 'privilege_taken'),
          sumLeaveMetric(employees, 'lwp_taken'),
          sumLeaveMetric(employees, 'available_balance'),
          (() => {
            const total = employees.reduce((s, e) => s + parseFloat(e.avgHours || 0), 0);
            return employees.length > 0 ? (total / employees.length).toFixed(1) : '0.0';
          })(),
        ]);
        totalRow.height = 22;
        styleHeader(totalRow, 'FF1E293B', 'FFFFFFFF');

        ws.getColumn(1).width = 30;
        [2,3,4,5,6,7,8,9,10,11].forEach(c => ws.getColumn(c).width = 15);
        ws.getColumn(12).width = 16;

        ws.views = [{ state: 'frozen', ySplit: 3 }];
      });

      // General Summary sheet
      const summaryWs = workbook.addWorksheet('Summary');
      summaryWs.views = [{ state: 'frozen', ySplit: 3 }];

      const sTitleRow = summaryWs.addRow([`All Companies  |  Attendance Summary: ${startDate}  →  ${endDate}`]);
      sTitleRow.font = { bold: true, size: 13, name: 'Arial', color: { argb: 'FFFFFFFF' } };
      sTitleRow.height = 28;
      sTitleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      sTitleRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      summaryWs.mergeCells(`A1:M1`);

      summaryWs.addRow([]);

      const sHeaderRow = summaryWs.addRow(['Company', 'Headcount', 'Present', 'Absent', 'Half Day', 'Half Day Leaves', 'Full Day Leaves', 'Complete Leaves', 'Opening Balance', 'PL Taken', 'LWP Taken', 'Available Balance', 'Avg Hrs/Day']);
      sHeaderRow.height = 22;
      styleHeader(sHeaderRow, 'FF334155', 'FFFFFFFF');

      Object.entries(byCompany).sort(([a], [b]) => a.localeCompare(b)).forEach(([co, emps], idx) => {
        const row = summaryWs.addRow([
          co,
          emps.length,
          emps.reduce((s, e) => s + getPayrollPresentDays(e), 0),
          emps.reduce((s, e) => s + e.absent,  0),
          emps.reduce((s, e) => s + getActualHalfDays(e), 0),
          emps.reduce((s, e) => s + getHalfDayLeaveCountForReport(e), 0),
          emps.reduce((s, e) => s + getFullDayLeaveCountForReport(e), 0),
          emps.reduce((s, e) => s + getLeaveCountForReport(e), 0),
          sumLeaveMetric(emps, 'opening_balance'),
          sumLeaveMetric(emps, 'privilege_taken'),
          sumLeaveMetric(emps, 'lwp_taken'),
          sumLeaveMetric(emps, 'available_balance'),
          (emps.reduce((s,e) => s + parseFloat(e.avgHours||0), 0) / emps.length).toFixed(1),
        ]);
        row.height = 20;
        if (idx % 2 === 0) {
          row.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          });
        }
        row.getCell(1).font = { bold: true, name: 'Arial', size: 10 };
        [2,3,4,5,6,7,8,9,10,11,12,13].forEach(c => { row.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' }; });
      });

      summaryWs.getColumn(1).width = 32;
      [2,3,4,5,6,7,8,9,10,11,12].forEach(c => summaryWs.getColumn(c).width = 15);
      summaryWs.getColumn(13).width = 14;

      const summarySheet = workbook._worksheets.find(ws => ws && ws.name === 'Summary');
      if (summarySheet) {
        workbook._worksheets = [
          undefined,
          summarySheet,
          ...workbook._worksheets.filter(ws => ws && ws.name !== 'Summary')
        ];
        workbook._worksheets.forEach((ws, i) => {
          if (ws) ws.id = i;
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `Attendance_Summary_${moment(startDate).format('MMM_YYYY')}.xlsx`;
      saveAs(new Blob([buffer], { type: 'application/octet-stream' }), fileName);
      toast.dismiss(lt);
      toast.success(`Summary report downloaded: ${fileName}`);
    } catch (e) {
      console.error('Summary directory export failed:', e);
      toast.dismiss(lt);
      toast.error('Failed to generate summary report');
    } finally {
      setEpwDlLoading(false);
      setEpwDlModal(p => ({ ...p, open: false }));
    }
  };

  const confirmDownloadOrgReport = async (orgName, items, startDt, endDt) => {
    try {
      const lt = toast.loading(`Preparing report for ${orgName}...`);
      const allLogs = [];
      const start = moment(startDt).startOf('day').format('YYYY-MM-DD');
      const end = moment(endDt).endOf('day').format('YYYY-MM-DD');
      for (let i=0; i<items.length; i+=5) {
        const chunk = items.slice(i,i+5);
        await Promise.all(chunk.map(async (emp) => {
          try {
            const p = await attendanceAPI.getEmployeeFullProfile(emp._id,start,end,emp.company_id?._id||emp.company_id);
            (p?.attendance||[]).forEach(log => {
              let sn='', sh='';
              if (log.shift_id) { sn=log.shift_id.shift_name||log.shift_id.name||''; sh=`${log.shift_id.start_time||''} - ${log.shift_id.end_time||''}`; }
              else if (p.employee?.shift_id) { const s=p.employee.shift_id; sn=s.shift_name||s.name||''; sh=`${s.start_time||''} - ${s.end_time||''}`; }
              const fdt = dt=>dt?moment(dt).format('DD-MM-YYYY h:mm A'):'';
              let fs = log.status||'Present';
              if (log.status==='half_day') fs=log.half_day_session==='first_half'?'Half Day (First)':'Half Day (Second)';
              else if (log.status) fs=log.status.charAt(0).toUpperCase()+log.status.slice(1).replace('_',' ');
              allLogs.push({ "NAME":`${emp.first_name||''} ${emp.last_name||''}`.trim()||emp.username, "DATE":moment(log.attendance_date).format('YYYY-MM-DD'), "STATUS":fs, "ATTENDANCE INTIME":fdt(log.first_in), "ATTENDANCE OUTTIME":fdt(log.last_out), "SHIFT NAME":sn, "SHIFT HOURS":sh });
            });
          } catch {}
        }));
      }
      if (!allLogs.length) { toast.dismiss(lt); toast.error(`No logs found for ${orgName}`); return; }
      const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet('Attendance Logs');
      const navy = { fill:{type:'pattern',pattern:'solid',fgColor:{argb:'FF0F172A'}}, font:{color:{argb:'FFFFFFFF'},bold:true}, alignment:{horizontal:'center',vertical:'middle'} };
      ws.mergeCells('A1:F1'); const cc=ws.getCell('A1'); cc.value=orgName.toUpperCase(); cc.style=navy; ws.getRow(1).height=35;
      ws.mergeCells('A2:F2'); const sc=ws.getCell('A2'); sc.value=`ATTENDANCE LOG REPORT: ${moment(start).format('DD MMM YYYY')} TO ${moment(end).format('DD MMM YYYY')}`; sc.font={bold:true,size:11,color:{argb:'FF475569'}}; sc.alignment={horizontal:'center'}; ws.getRow(2).height=20;
      ws.addRow([]);
      const dates = [...new Set(allLogs.map(l=>l.DATE))].sort((a,b)=>new Date(b)-new Date(a));
      dates.forEach(ds => {
        const dr=ws.addRow([`DATE: ${moment(ds).format('DD MMMM YYYY, dddd').toUpperCase()}`]); dr.eachCell(c=>{c.style=navy;}); ws.mergeCells(`A${dr.number}:F${dr.number}`);
        const hr=ws.addRow(["NAME","STATUS","ATTENDANCE INTIME","ATTENDANCE OUTTIME","SHIFT NAME","SHIFT HOURS"]); hr.eachCell(c=>{c.style={fill:{type:'pattern',pattern:'solid',fgColor:{argb:'FFF1F5F9'}},font:{bold:true,color:{argb:'FF0F172A'}},border:{bottom:{style:'thin'}}};});
        allLogs.filter(l=>l.DATE===ds).sort((a,b)=>a.NAME.localeCompare(b.NAME)).forEach(l=>ws.addRow([l.NAME,l.STATUS,l["ATTENDANCE INTIME"],l["ATTENDANCE OUTTIME"],l["SHIFT NAME"],l["SHIFT HOURS"]]));
        ws.addRow([]);
      });
      ws.columns=[{width:35},{width:18},{width:25},{width:25},{width:22},{width:22}];
      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf]),`Attendance_Log_${orgName.replace(/[^a-z0-9]/gi,'_')}_${moment(start).format('MMM_DD_YYYY')}.xlsx`);
      toast.dismiss(lt); toast.success('Report downloaded');
    } catch (e) { toast.error('Failed to download report'); }
  };

  if (loading) return <div style={{ padding:'20px', color:THEME.muted }}>Loading...</div>;

  // ─── Directory View (no employee selected) ───────────────────────────────
  if (!id) {
    return (
      <div style={{ padding:'20px', minHeight:'100vh', background:'#f8fafc' }}>
        <style>{`
          .epw-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:20px; }
          .epw-card { background:#fff; border:1px solid #e8eef7; border-radius:14px; padding:20px 20px 12px; display:flex; flex-direction:column; gap:12px; cursor:pointer; transition:all 0.2s; position:relative; overflow:hidden; }
          .epw-card:hover { transform:translateY(-2px); box-shadow:0 12px 28px rgba(15,23,42,0.1); }
          .epw-card-body { display:flex; align-items:flex-start; gap:16px; }
          .epw-initials { width:60px; height:60px; border-radius:50%; background:linear-gradient(145deg,#eef4ff,#efe9ff); display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:700; color:#4338ca; flex-shrink:0; }
          .epw-avatar { width:60px; height:60px; border-radius:50%; object-fit:cover; border:3px solid #eab308; flex-shrink:0; }
          .epw-details { flex:1; min-width:0; }
          .epw-name { font-size:14px; font-weight:800; color:#0f172a; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:6px; }
          .epw-meta { display:flex; align-items:center; gap:6px; font-size:11px; color:#64748b; margin-bottom:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
          .epw-meta-wrap { align-items:flex-start; white-space:normal; overflow:visible; text-overflow:initial; }
          .epw-meta-wrap .epw-meta-val { white-space:normal; overflow-wrap:anywhere; word-break:break-word; line-height:1.25; }
          .epw-meta-lbl { color:#94a3b8; font-weight:600; min-width:125px; display:flex; align-items:center; gap:4px; }
          .epw-footer { display:flex; align-items:center; justify-content:space-between; border-top:1px solid #f1f5f9; padding-top:10px; margin:0 -20px; padding-left:16px; padding-right:16px; }
          .epw-control { height:38px; border:1px solid #dde5f1; background:#fff; border-radius:7px; box-shadow:0 4px 12px rgba(15,23,42,0.06); }
          .epw-icon-btn { width:40px; height:32px; border:none; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
          @media(max-width:1400px){.epw-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
          @media(max-width:900px){.epw-grid{grid-template-columns:1fr;}}
        `}</style>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px', flexWrap:'wrap', gap:'12px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <h1 style={{ margin:0, color:'#071435', fontSize:'28px', fontWeight:'800' }}>Employee Directory</h1>
            <span style={{ color:'#2563eb', background:'#eef5ff', padding:'4px 10px', borderRadius:'16px', fontSize:'11px', fontWeight:'700', display:'flex', alignItems:'center', gap:'4px' }}>
              <FiUsers size={11} /> {filteredEmployees.length}
            </span>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <button
              onClick={() => setEpwDlModal(p => ({ ...p, open: true, exportType: 'detailed' }))}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', background:'linear-gradient(135deg,#0f172a,#334155)', color:'#fff', border:'none', borderRadius:'9px', fontSize:'12px', fontWeight:'700', cursor:'pointer', boxShadow:'0 4px 12px rgba(15,23,42,0.25)', transition:'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
            >
              <FiDownload size={14} /> Attendance Report
            </button>
            {/* <button
              onClick={() => setEpwDlModal(p => ({ ...p, open: true, exportType: 'summary' }))}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', border:'none', borderRadius:'9px', fontSize:'12px', fontWeight:'700', cursor:'pointer', boxShadow:'0 4px 12px rgba(16,185,129,0.25)', transition:'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
            >
              <FiDownload size={14} /> Export Excel
            </button> */}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'10px' }}>
          <div style={{ position:'relative', minWidth:'280px', flex:1, maxWidth:'400px' }}>
            <FiSearch size={14} style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
            <input type="text" placeholder="Search by name, ID or code..." value={searchTerm} onChange={e=>{ setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ ...S.input, paddingLeft:'36px', paddingRight:searchTerm?'36px':'12px', height:'42px', borderRadius:'10px', borderColor:'#dde5f1', boxShadow:'0 4px 12px rgba(15,23,42,0.06)' }} />
            {searchTerm && <button onClick={()=>setSearchTerm('')} style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', border:'none', background:'transparent', cursor:'pointer', color:'#94a3b8', padding:'4px' }}><FiX size={13}/></button>}
          </div>
          <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
            <div className="epw-control" style={{ display:'flex', alignItems:'center', gap:'6px', padding:'0 12px', fontSize:'12px', color:'#64748b', fontWeight:'500' }}>
              <span>Show</span>
              <select value={pageSize} onChange={e=>{ setPageSize(Number(e.target.value)); setCurrentPage(1); }} style={{ border:'none', background:'transparent', fontWeight:'700', color:THEME.text, cursor:'pointer', outline:'none' }}>
                {[10,24,50,100].map(n=><option key={n} value={n}>{n}</option>)}
              </select>
              <FiChevronDown size={11} style={{ color:'#94a3b8' }}/>
            </div>
            <div className="epw-control" style={{ display:'flex', padding:'3px' }}>
              <button onClick={()=>setViewMode('grid')} className="epw-icon-btn" style={{ background:viewMode==='grid'?'#eaf2ff':'transparent', color:viewMode==='grid'?'#2563eb':'#64748b' }}><FiGrid size={14}/></button>
              <button onClick={()=>setViewMode('list')} className="epw-icon-btn" style={{ background:viewMode==='list'?'#eaf2ff':'transparent', color:viewMode==='list'?'#2563eb':'#64748b' }}><FiList size={14}/></button>
            </div>
            <div className="epw-control" style={{ display:'flex', alignItems:'center', gap:'6px', padding:'0 12px', fontSize:'12px', color:'#64748b', fontWeight:'500' }}>
              <span>Group</span>
              <select value={groupBy} onChange={e=>{ setGroupBy(e.target.value); setCurrentPage(1); }} style={{ border:'none', background:'transparent', fontWeight:'700', color:THEME.text, cursor:'pointer', outline:'none', minWidth:'60px' }}>
                <option value="none">None</option>
                <option value="organization">Org</option>
                <option value="team">Team</option>
              </select>
              <FiChevronDown size={11} style={{ color:'#94a3b8' }}/>
            </div>
            <button onClick={()=>navigate('/employee-onboarding')} style={{ ...S.btn('primary'), height:'38px', padding:'0 14px', display:'flex', alignItems:'center', gap:'5px', borderRadius:'8px', boxShadow:'0 4px 12px rgba(37,99,235,0.2)' }}>
              <FiPlus size={13}/> Add User
            </button>
            {headerActions && <div style={{ marginLeft:'6px', paddingLeft:'12px', borderLeft:`1px solid ${THEME.border}` }}>{headerActions}</div>}
          </div>
        </div>

        <div style={{ marginBottom:'8px', display:'flex', justifyContent:'flex-end' }}>
          <span style={{ fontSize:'11px', color:THEME.muted, fontWeight:'600' }}>
            Showing {Math.min(filteredEmployees.length,(currentPage-1)*pageSize+1)}–{Math.min(filteredEmployees.length,currentPage*pageSize)} of {filteredEmployees.length}
          </span>
        </div>

        {gridLoading ? (
          <div style={{ textAlign:'center', color:THEME.muted, padding:'40px' }}>Loading employees...</div>
        ) : gridEmployees.length===0 ? (
          <div style={{ textAlign:'center', color:THEME.muted, padding:'40px' }}>No employees found</div>
        ) : viewMode==='grid' ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'32px' }}>
            {(groupBy==='none'?[{ name:null, items:paginatedEmployees }]:sortGroupNamesWithRabsLast(Object.keys(groupedEmployeesData)).map(n=>({ name:n, items:groupedEmployeesData[n] }))).map((g,gi)=>(
              <div key={g.name||gi}>
                {g.name && (
                  <div onClick={() => toggleGroupCollapse(g.name)} style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px', paddingBottom:'10px', borderBottom:`2px solid ${THEME.primary}`, cursor:'pointer' }}>
                    {collapsedGroups[g.name] ? <FiChevronRight size={15} color={THEME.navy} /> : <FiChevronDown size={15} color={THEME.navy} />}
                    <span style={{ fontSize:'16px', fontWeight:'800', color:THEME.navy }}>{g.name}</span>
                    <span style={{ fontSize:'12px', color:THEME.muted, fontWeight:'600', background:'#f1f5f9', padding:'2px 8px', borderRadius:'10px' }}>{g.items.length}</span>
                    {groupBy==='organization' && (
                      <button onClick={e=>{ e.stopPropagation(); handleDownloadOrgReport(g.name,g.items); }} style={{ ...S.btn('green'), marginLeft:'auto', display:'flex', alignItems:'center', gap:'4px' }}>
                        <FiDownload size={12}/> Export Logs
                      </button>
                    )}
                  </div>
                )}
                {!collapsedGroups[g.name] && <div className="epw-grid">
                  {g.items.map(emp=>{
                    const initials = `${emp.first_name?.[0]||''}${emp.last_name?.[0]||''}`.toUpperCase();
                    const go = (e) => { e.stopPropagation(); handleSelectEmployee(emp); };
                    const name = [emp.first_name,emp.last_name].filter(Boolean).join(' ').toUpperCase()||emp.username||'';
                    return (
                      <div key={emp._id} className="epw-card" onClick={go}>
                        <div style={{ position:'absolute', top:'14px', right:'14px', display:'flex', alignItems:'center', gap:'6px', zIndex:1 }}>
                          {/* <span style={{ color:emp.isActive!==false?'#16a34a':'#475569', background:emp.isActive!==false?'#f0fdf4':'#f1f5f9', padding:'2px 7px', borderRadius:'8px', fontSize:'10px', fontWeight:'700' }}>
                            {emp.isActive!==false?'Activeee':'Inactive'}
                          </span> */}
                        </div>
                        <div className="epw-card-body">
                          {emp.employee_photo ? <img src={emp.employee_photo} className="epw-avatar" alt={name}/> : <div className="epw-initials">{initials||'??'}</div>}
                          <div className="epw-details">
                            <div className="epw-name" title={name}>{name}</div>
                            {[
                              [<FiPhone size={11}/>, 'Contact No', emp.mobile||'--'],
                              [<FiMapPin size={11}/>, 'Team', getEmployeeTeamName(emp)],
                              [<FiBriefcase size={11}/>, 'Department', emp.department_id?.department_name||emp.department||'--'],
                              [<FiAward size={11}/>, 'Designation', emp.designation?.designation_name||emp.designation||'--'],
                              [<FiHome size={11}/>, 'Company Name', emp.company_id?.company_name||emp.company||'--'],
                            ].map(([icon, lbl, val], i)=>(
                              <div key={i} className={`epw-meta ${lbl === 'Company Name' ? 'epw-meta-wrap' : ''}`}>
                                <span className="epw-meta-lbl">{icon} {lbl} <span style={{ marginLeft:'auto', marginRight:'6px' }}>:</span></span>
                                <span className="epw-meta-val" style={{ color:'#475569', fontWeight:'500', minWidth:0, flex:1 }}>{val}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginTop:'32px', flexShrink:0 }}>
                            <Button size="small" style={{ borderColor:'#3b82f6', color:'#3b82f6', fontSize:'11px', fontWeight:'600', width:'64px' }} onClick={go}>Edit</Button>
                            <Popconfirm title="Deactivate this employee?" onConfirm={e=>{ e.stopPropagation(); handleDeactivateEmployee(emp); }} okText="Yes" cancelText="No" onClick={e=>e.stopPropagation()}>
                              <Button size="small" danger style={{ fontSize:'11px', fontWeight:'600', width:'64px' }} onClick={e=>e.stopPropagation()}>Delete</Button>
                            </Popconfirm>
                          </div>
                        </div>
                        <div className="epw-footer">
                          <div style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', fontWeight:'600', color:emp.isActive!==false?'#16a34a':'#dc2626' }}>
                            {emp.isActive!==false?<FiCheckCircle size={13}/>:<FiXCircle size={13}/>}
                            {emp.isActive!==false?'Active':'Inactive'}
                          </div>
                          {emp.current_status==='in_office' && <span style={{ background:'#dcfce7', color:'#15803d', padding:'2px 8px', borderRadius:'10px', fontSize:'10px', fontWeight:'700' }}>Checked In</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'24px' }}>
            {(groupBy==='none'?[{ name:null, items:paginatedEmployees }]:sortGroupNamesWithRabsLast(Object.keys(groupedEmployeesData)).map(n=>({ name:n, items:groupedEmployeesData[n] }))).map((g,gi)=>(
              <div key={g.name||gi}>
                {g.name && (
                  <div onClick={() => toggleGroupCollapse(g.name)} style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px', cursor:'pointer' }}>
                    {collapsedGroups[g.name] ? <FiChevronRight size={13} color={THEME.navy} /> : <FiChevronDown size={13} color={THEME.navy} />}
                    <span style={{ fontSize:'14px', fontWeight:'700', color:THEME.navy }}>{g.name}</span>
                    <span style={{ fontSize:'11px', color:THEME.muted, background:'#f1f5f9', padding:'1px 7px', borderRadius:'8px' }}>{g.items.length}</span>
                    {groupBy==='organization' && <button onClick={e=>{ e.stopPropagation(); handleDownloadOrgReport(g.name,g.items); }} style={{ ...S.btn('green'), marginLeft:'auto', display:'flex', alignItems:'center', gap:'4px' }}><FiDownload size={12}/> Export Logs</button>}
                  </div>
                )}
                {!collapsedGroups[g.name] && <div style={{ background:'#fff', border:`1px solid ${THEME.border}`, borderRadius:'10px', overflow:'hidden' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                    <thead>
                      <tr style={{ background:'#f8fafc', borderBottom:`1px solid ${THEME.border}` }}>
                        <th style={{ padding:'14px 12px', width:'36px' }}><input type="checkbox" onChange={e=>{ if(e.target.checked) setSelectedUserIds(p=>[...new Set([...p,...g.items.map(u=>u._id)])]); else { const ids=new Set(g.items.map(u=>u._id)); setSelectedUserIds(p=>p.filter(id=>!ids.has(id))); } }}/></th>
                        {['EMPLOYEE','ID','DESIGNATION','COMPANY','STATUS','ACTION'].map(h=><th key={h} style={{ padding:'12px', color:THEME.muted, fontWeight:'700', fontSize:'10px', textAlign:'left' }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {g.items.map(emp=>{
                        const initials = `${emp.first_name?.[0]||''}${emp.last_name?.[0]||''}`.toUpperCase();
                        const name = [emp.first_name,emp.last_name].filter(Boolean).join(' ').toUpperCase()||emp.username||'';
                        return (
                          <tr key={emp._id} onClick={()=>handleSelectEmployee(emp)} style={{ borderBottom:`1px solid ${THEME.border}`, cursor:'pointer' }} onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                            <td style={{ padding:'12px' }} onClick={e=>e.stopPropagation()}>
                              <input type="checkbox" checked={selectedUserIds.includes(emp._id)} onChange={e=>{ if(e.target.checked) setSelectedUserIds(p=>[...p,emp._id]); else setSelectedUserIds(p=>p.filter(v=>v!==emp._id)); }}/>
                            </td>
                            <td style={{ padding:'12px' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                                {emp.employee_photo ? (
                                  <img src={emp.employee_photo} style={{ width:'28px', height:'28px', borderRadius:'6px', objectFit:'cover' }} alt=""/>
                                ) : (
                                  <div style={{ width:'28px', height:'28px', borderRadius:'6px', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'700', color:THEME.muted }}>
                                    {initials||'??'}
                                  </div>
                                )}
                                <span style={{ fontWeight:'700', color:THEME.text }}>{name}</span>
                              </div>
                            </td>
                            <td style={{ padding:'12px', color:THEME.text }}>{emp.employee_code||'-'}</td>
                            <td style={{ padding:'12px', color:THEME.muted }}>{emp.designation?.designation_name||emp.designation||'-'}</td>
                            <td style={{ padding:'12px', color:THEME.muted }}>{emp.company_id?.company_name||'--'}</td>
                            <td style={{ padding:'12px' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                                <span style={{ color:emp.isActive!==false?'#16a34a':'#475569', background:emp.isActive!==false?'#f0fdf4':'#f1f5f9', padding:'2px 7px', borderRadius:'8px', fontSize:'10px', fontWeight:'700' }}>
                                  {emp.isActive!==false?'Active':'Inactive'}
                                </span>
                                {emp.current_status==='in_office' && (
                                  <span style={{ background:'#dcfce7', color:'#15803d', padding:'2px 7px', borderRadius:'8px', fontSize:'10px', fontWeight:'700' }}>
                                    Checked In
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding:'12px' }} onClick={e=>e.stopPropagation()}>
                              <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                                <Button size="small" style={{ borderColor:'#3b82f6', color:'#3b82f6', fontSize:'11px', fontWeight:'600' }} onClick={(e)=>{ e.stopPropagation(); handleSelectEmployee(emp); }}>Edit</Button>
                                <Popconfirm title="Deactivate this employee?" onConfirm={e=>{ e.stopPropagation(); handleDeactivateEmployee(emp); }} okText="Yes" cancelText="No" onClick={e=>e.stopPropagation()}>
                                  <Button size="small" danger style={{ fontSize:'11px', fontWeight:'600' }} onClick={e=>e.stopPropagation()}>Delete</Button>
                                </Popconfirm>
                                <button onClick={e=>{ e.stopPropagation(); setMigratingEmployeeId(emp._id); setShowMigrationModal(true); }} style={{ padding:'0 8px', height:'24px', borderRadius:'6px', background:'#f3f4f6', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'600', color:THEME.text }}>Migrate</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages>1&&!id&&groupBy==='none' && (
          <div style={{ marginTop:'24px', display:'flex', justifyContent:'center', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
            <button onClick={()=>{ setCurrentPage(p=>Math.max(1,p-1)); window.scrollTo({top:0,behavior:'smooth'}); }} disabled={currentPage===1} style={{ ...S.btn('ghost'), opacity:currentPage===1?0.5:1 }}>← Prev</button>
            {[...Array(totalPages)].map((_,i)=>{
              const p=i+1;
              if (p===1||p===totalPages||(p>=currentPage-2&&p<=currentPage+2)) return <button key={i} onClick={()=>{ setCurrentPage(p); window.scrollTo({top:0,behavior:'smooth'}); }} style={{ ...S.btn(currentPage===p?'primary':'ghost'), width:'34px', height:'34px', padding:0, fontWeight:'700', borderRadius:'8px' }}>{p}</button>;
              if (p===currentPage-3||p===currentPage+3) return <span key={i} style={{ color:THEME.muted }}>…</span>;
              return null;
            })}
            <button onClick={()=>{ setCurrentPage(p=>Math.min(totalPages,p+1)); window.scrollTo({top:0,behavior:'smooth'}); }} disabled={currentPage===totalPages} style={{ ...S.btn('ghost'), opacity:currentPage===totalPages?0.5:1 }}>Next →</button>
          </div>
        )}

        {/* Migration Modal */}
        {showMigrationModal&&migratingEmployeeId && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
            <div style={{ background:'#fff', borderRadius:'14px', width:'440px', padding:'24px', boxShadow:'0 20px 40px rgba(0,0,0,0.15)' }}>
              <h3 style={{ margin:'0 0 16px', color:THEME.navy }}>🔄 Migrate Employee</h3>
              <div style={{ marginBottom:'16px', padding:'10px 14px', background:'#f8fafc', borderRadius:'8px', border:`1px solid ${THEME.border}`, display:'flex', alignItems:'center', gap:'10px' }}>
                <span style={{ fontSize:'20px' }}>🏢</span>
                <div><div style={{ fontSize:'10px', fontWeight:'700', color:THEME.muted, textTransform:'uppercase' }}>Migrating From</div><div style={{ fontSize:'13px', fontWeight:'800', color:THEME.navy }}>{currentOrgName}</div></div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
                <label style={{ fontWeight:'700', fontSize:'12px', minWidth:'140px' }}>Destination:</label>
                <select value={destOrgId} onChange={e=>setDestOrgId(e.target.value)} style={{ ...S.input, flex:1 }}>
                  <option value="">Select organization</option>
                  {organizations.map(o=><option key={o._id} value={o._id}>{o.name}{o.hodName?` (HOD: ${o.hodName})`:''}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', gap:'10px' }}>
                <button onClick={()=>{ setShowMigrationModal(false); setMigratingEmployeeId(null); setDestOrgId(''); }} style={{ ...S.btn('ghost'), flex:1 }}>Cancel</button>
                <button onClick={()=>handleMigrateEmployee(migratingEmployeeId)} style={{ ...S.btn('amber'), flex:1 }}>Migrate</button>
              </div>
            </div>
          </div>
        )}

        {/* Export Modal */}
        {exportModal.open && (
          <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.4)', zIndex:100000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>setExportModal({ open:false, orgName:'', items:[] })}>
            <div style={{ background:'#fff', borderRadius:'14px', width:'380px', overflow:'hidden', boxShadow:'0 20px 40px rgba(0,0,0,0.2)' }} onClick={e=>e.stopPropagation()}>
              <div style={{ padding:'20px', borderBottom:`1px solid ${THEME.border}` }}>
                <div style={{ fontSize:'16px', fontWeight:'800', color:'#0f172a' }}>Export Logs</div>
                <div style={{ fontSize:'12px', color:'#64748b', marginTop:'4px' }}>Select date range for <b>{exportModal.orgName}</b></div>
              </div>
              <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:'12px' }}>
                {[['From Date','start'],['To Date','end']].map(([lbl,key])=>(
                  <div key={key}>
                    <label style={{ display:'block', marginBottom:'6px', fontSize:'11px', fontWeight:'700', color:'#475569' }}>{lbl}</label>
                    <input type="date" value={exportDateRange[key]} onChange={e=>setExportDateRange(p=>({ ...p, [key]:e.target.value }))} style={{ ...S.input, height:'38px' }}/>
                  </div>
                ))}
              </div>
              <div style={{ padding:'14px 20px', background:'#f8fafc', borderTop:`1px solid ${THEME.border}`, display:'flex', justifyContent:'flex-end', gap:'10px' }}>
                <button onClick={()=>setExportModal({ open:false, orgName:'', items:[] })} style={{ ...S.btn('ghost') }}>Cancel</button>
                <button onClick={()=>{ confirmDownloadOrgReport(exportModal.orgName,exportModal.items,exportDateRange.start,exportDateRange.end); setExportModal({ open:false, orgName:'', items:[] }); }} style={{ ...S.btn('green') }}>Download</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Full Directory Download Report Modal ── */}
        {epwDlModal.open && (
          <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(4px)', zIndex:100001, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }} onClick={() => setEpwDlModal(p => ({ ...p, open:false }))}>
            <div style={{ background:'#fff', borderRadius:'16px', width:'100%', maxWidth:'460px', overflow:'hidden', boxShadow:'0 24px 60px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div style={{ padding:'20px 24px', background: epwDlModal.exportType === 'summary' ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#0f172a,#1e293b)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:'16px', fontWeight:'800', color:'#fff', display:'flex', alignItems:'center', gap:'8px' }}>
                    <FiDownload size={16} color={epwDlModal.exportType === 'summary' ? '#a7f3d0' : '#60a5fa'} />
                    {epwDlModal.exportType === 'summary' ? 'Export Summary Excel' : 'Download Attendance Report'}
                  </div>
                  <div style={{ fontSize:'11px', color: epwDlModal.exportType === 'summary' ? '#d1fae5' : '#94a3b8', marginTop:'4px' }}>
                    {epwDlModal.exportType === 'summary' ? 'Configure your summary export options below' : 'Configure your export options below'}
                  </div>
                </div>
                <button onClick={() => setEpwDlModal(p => ({ ...p, open:false }))} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:'7px', width:'28px', height:'28px', cursor:'pointer', color: epwDlModal.exportType === 'summary' ? '#d1fae5' : '#94a3b8', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
              </div>

              {/* Modal Body */}
              <div style={{ padding:'24px', display:'flex', flexDirection:'column', gap:'18px' }}>

                {/* Date Range */}
                <div>
                  <div style={{ fontSize:'11px', fontWeight:'800', color:'#334155', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' }}>📅 Date Range</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                    {[['From Date', 'startDate'], ['To Date', 'endDate']].map(([lbl, key]) => (
                      <div key={key}>
                        <label style={{ display:'block', marginBottom:'5px', fontSize:'11px', fontWeight:'700', color:'#475569' }}>{lbl}</label>
                        <input
                          type="date"
                          value={epwDlModal[key]}
                          onChange={e => setEpwDlModal(p => ({ ...p, [key]: e.target.value }))}
                          style={{ ...S.input, height:'38px', borderRadius:'8px', borderColor:'#dde5f1' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Month Selector */}
                <div>
                  <label style={{ display:'block', marginBottom:'5px', fontSize:'11px', fontWeight:'700', color:'#475569' }}>Quick Month</label>
                  <select
                    style={{ ...S.input, height:'38px', borderRadius:'8px', borderColor:'#dde5f1' }}
                    onChange={e => {
                      if (e.target.value === 'custom') return;
                      const [y, m] = e.target.value.split('-');
                      setEpwDlModal(p => ({
                        ...p,
                        startDate: moment([y, m-1]).startOf('month').format('YYYY-MM-DD'),
                        endDate: moment([y, m-1]).endOf('month').format('YYYY-MM-DD'),
                      }));
                    }}
                  >
                    <option value="custom">Select month…</option>
                    {[0,1,2,3,4,5].map(i => {
                      const mm = moment().subtract(i, 'months');
                      return <option key={i} value={mm.format('YYYY-MM')}>{mm.format('MMMM YYYY')}</option>;
                    })}
                  </select>
                </div>

                {/* Group By - only display for detailed report */}
                {epwDlModal.exportType !== 'summary' && (
                  <div>
                    <div style={{ fontSize:'11px', fontWeight:'800', color:'#334155', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' }}>📊 Group Sheets By</div>
                    <div style={{ display:'flex', gap:'8px' }}>
                      {[['organization','🏢 Organization'],['team','👥 Team'],['none','📋 None (Single Sheet)']].map(([val, lbl]) => (
                        <button
                          key={val}
                          onClick={() => setEpwDlModal(p => ({ ...p, groupBy: val }))}
                          style={{
                            flex: 1, padding:'10px 6px', border:`2px solid ${epwDlModal.groupBy === val ? '#4f46e5' : '#e2e8f0'}`,
                            borderRadius:'10px', background: epwDlModal.groupBy === val ? '#eef2ff' : '#f8fafc',
                            color: epwDlModal.groupBy === val ? '#4f46e5' : '#64748b',
                            fontWeight: epwDlModal.groupBy === val ? '700' : '500',
                            fontSize:'11px', cursor:'pointer', textAlign:'center', transition:'all 0.15s'
                          }}
                        >{lbl}</button>
                      ))}
                    </div>
                    <div style={{ fontSize:'10px', color:'#94a3b8', marginTop:'8px' }}>
                      {epwDlModal.groupBy === 'organization' && '→ One sheet per organization. In-sheet summary at the bottom.'}
                      {epwDlModal.groupBy === 'team' && '→ One sheet per team. In-sheet summary at the bottom.'}
                      {epwDlModal.groupBy === 'none' && '→ All employees in one sheet with summary at the bottom.'}
                    </div>
                  </div>
                )}

                {/* Filename Preview */}
                <div style={{ padding:'10px 14px', background: epwDlModal.exportType === 'summary' ? '#ecfdf5' : '#f0fdf4', border: epwDlModal.exportType === 'summary' ? '1px solid #a7f3d0' : '1px solid #bbf7d0', borderRadius:'8px', fontSize:'11px', color: epwDlModal.exportType === 'summary' ? '#065f46' : '#166534' }}>
                  <span style={{ fontWeight:'700' }}>📁 File: </span>
                  <span style={{ fontFamily:'monospace' }}>
                    {epwDlModal.exportType === 'summary'
                      ? `Attendance_Summary_${moment(epwDlModal.startDate).format('MMM_YYYY')}.xlsx`
                      : `Attendance_Report_${moment(epwDlModal.startDate).format('MMMM YYYY').replace(' ','')}_v${epwDlVersionRef.current + 1}.xlsx`}
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ padding:'16px 24px', background:'#f8fafc', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'flex-end', gap:'10px' }}>
                <button onClick={() => setEpwDlModal(p => ({ ...p, open:false }))} style={{ ...S.btn('ghost'), padding:'9px 20px' }}>Cancel</button>
                {epwDlModal.exportType === 'summary' ? (
                  <button
                    onClick={handleSummaryExport}
                    disabled={epwDlLoading || !epwDlModal.startDate || !epwDlModal.endDate}
                    style={{ ...S.btn('green'), padding:'9px 22px', fontWeight:'700', opacity:(epwDlLoading || !epwDlModal.startDate || !epwDlModal.endDate) ? 0.6 : 1, display:'flex', alignItems:'center', gap:'6px' }}
                  >
                    {epwDlLoading ? <><span style={{ display:'inline-block', width:'12px', height:'12px', border:'2px solid #fff', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Generating…</> : <><FiDownload size={13}/> Download Summary</>}
                  </button>
                ) : (
                  <button
                    onClick={handleFullDirectoryExport}
                    disabled={epwDlLoading || !epwDlModal.startDate || !epwDlModal.endDate}
                    style={{ ...S.btn('primary'), padding:'9px 22px', fontWeight:'700', opacity:(epwDlLoading || !epwDlModal.startDate || !epwDlModal.endDate) ? 0.6 : 1, display:'flex', alignItems:'center', gap:'6px' }}
                  >
                    {epwDlLoading ? <><span style={{ display:'inline-block', width:'12px', height:'12px', border:'2px solid #fff', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/> Generating…</> : <><FiDownload size={13}/> Download Detailed</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!profile?.employee) return <div style={{ padding:'20px' }}>Employee not found</div>;

  // ─── Employee Profile View ────────────────────────────────────────────────
  return (
    <div style={{ padding:'12px 16px', background:THEME.bg, minHeight:'100vh' }}>
      <div style={{ maxWidth:'1500px', margin:'0 auto' }}>

        {/* ── Top Bar ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px', flexWrap:'wrap', gap:'10px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ width:'44px', height:'44px', borderRadius:'10px', background:profile.employee.photo?`url(${profile.employee.photo}) center/cover`:THEME.primary, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'18px', fontWeight:'800', flexShrink:0 }}>
              {!profile.employee.photo&&(profile.employee.first_name?.[0]||profile.employee.username?.[0]||'E').toUpperCase()}
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <span style={{ fontSize:'18px', fontWeight:'800', color:THEME.navy }}>{employeeName}</span>
                <span style={{ padding:'2px 7px', background:'#ecfdf5', color:'#059669', borderRadius:'10px', fontSize:'10px', fontWeight:'700' }}>Active</span>
              </div>
              <div style={{ fontSize:'12px', color:THEME.muted, display:'flex', gap:'6px', alignItems:'center' }}>
                <span style={{ color:THEME.primary, fontWeight:'600' }}>#{profile.employee.employee_code||'-'}</span>
                <span>·</span>
                <span>{profile.employee.username}</span>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            <button onClick={()=>{ setMigratingEmployeeId(id); setShowMigrationModal(true); }} style={{ ...S.btn('ghost') }}>Migrate</button>
            {teamId&&groupBy==='organization' && <>
              <button onClick={handlePreviousUser} style={{ ...S.btn('primary') }}>← Prev</button>
              <button onClick={handleNextUser} style={{ ...S.btn('primary') }}>Next →</button>
            </>}
            <button onClick={()=>{
              setLocalEmployeeId(null);
              const fromPath = location.state?.fromPath;
              if (fromPath) {
                navigate(fromPath);
              } else if (teamId) {
                navigate(`/attendance/teams/${teamId}`);
              } else {
                navigate('/attendance/teams');
              }
            }} style={{ ...S.btn('primary') }}>← Back</button>
          </div>
        </div>

        {/* ── Summary Strip ── */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
          {[
            { label:'Records', value:`${(profile.attendance||[]).length}`, icon:'📊' },
            { label:'Policies', value:`${(profile.balances||[]).length}`, icon:'📋' },
            { label:'Pending', value:`${(profile.pendingLeaves||[]).length}`, icon:'⏳', highlight:(profile.pendingLeaves||[]).length>0, onClick:()=>{ setPendingLeavesModalTab('pending'); setShowPendingLeavesModal(true); } },
          ].map((s,i)=>(
            <div key={i} onClick={s.onClick} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 14px', background:'#fff', border:`1px solid ${s.highlight?'#fde68a':THEME.border}`, borderRadius:'8px', cursor:s.onClick?'pointer':'default', transition:'all 0.2s', fontSize:'13px' }}
              onMouseEnter={s.onClick?(e)=>e.currentTarget.style.boxShadow='0 4px 12px rgba(245,158,11,0.15)':undefined}
              onMouseLeave={s.onClick?(e)=>e.currentTarget.style.boxShadow='none':undefined}>
              <span>{s.icon}</span>
              <span style={{ fontWeight:'700', color:s.highlight?'#d97706':THEME.text }}>{s.value}</span>
              <span style={{ color:THEME.muted }}>{s.label}</span>
              {s.highlight&&<span style={{ background:'#f59e0b', color:'#fff', borderRadius:'8px', fontSize:'9px', fontWeight:'800', padding:'1px 6px', marginLeft:'2px' }}>View</span>}
            </div>
          ))}
        </div>

        {/* ── Tab Bar ── */}
        <div style={{ display:'flex', gap:'0', borderBottom:`1px solid ${THEME.border}`, marginBottom:'24px' }}>
          {['Performance','Attendance','Leave','Policies','Actions'].map(label=>{
            const t = label.toLowerCase(), isActive = tab===t;
            return (
              <button key={t} onClick={()=>handleTabChange(t)} style={{ background:'transparent', color:isActive?'#000':THEME.muted, borderBottom:isActive?'2px solid #000':'2px solid transparent', padding:'10px 16px', fontSize:'13px', fontWeight:isActive?'700':'500', border:'none', borderBottom:isActive?'2px solid #000':'2px solid transparent', cursor:'pointer', marginBottom:'-1px', transition:'all 0.15s' }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* ══ PERFORMANCE TAB ══════════════════════════════════════════════════ */}
        {tab==='performance' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
            {/* Scorecard */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:'10px' }}>
              {[
                { label:'Present', val:continuityStats.present, color:'#10b981' },
                { label:'Absent', val:continuityStats.absent, color:'#ef4444' },
                { label:'Late', val:continuityStats.late, color:'#f59e0b' },
                { label:'Leaves', val:continuityStats.leaves, color:'#4f46e5' },
                { label:'Off', val:continuityStats.weeklyOff, color:'#64748b' },
                { label:'Holiday', val:continuityStats.holidays, color:'#ec4899' },
              ].map((s,i)=>(
                <div key={i} style={{ background:'#fff', border:`1px solid ${THEME.border}`, borderRadius:'8px', padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:'11px', fontWeight:'700', color:'#64748b', textTransform:'uppercase', letterSpacing:'0.04em' }}>{s.label}</span>
                  <span style={{ fontSize:'18px', fontWeight:'700', color:s.color }}>{s.val}</span>
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'minmax(0,2fr) minmax(0,1fr)', gap:'20px' }}>
              {/* Calendar */}
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                  <span style={{ fontSize:'13px', fontWeight:'700', color:THEME.navy }}>Attendance Continuity</span>
                  <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
                    <button onClick={()=>{ const p=moment([browseYear,browseMonth-1]).subtract(1,'month'); setBrowseYear(p.year()); setBrowseMonth(p.month()+1); }} style={{ ...S.btn('ghost'), padding:'3px 8px' }}>←</button>
                    <span style={{ fontSize:'12px', fontWeight:'700', padding:'4px 10px', background:'#f1f5f9', borderRadius:'6px' }}>{moment([browseYear,browseMonth-1]).format('MMMM YYYY')}</span>
                    <button onClick={()=>{ const n=moment([browseYear,browseMonth-1]).add(1,'month'); setBrowseYear(n.year()); setBrowseMonth(n.month()+1); }} style={{ ...S.btn('ghost'), padding:'3px 8px' }}>→</button>
                  </div>
                </div>
                <div className="ar-cal-grid">
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d} className="ar-day-header">{d}</div>)}
                  {(()=>{
                    const som = moment([browseYear,browseMonth-1]).startOf('month');
                    const eom = moment([browseYear,browseMonth-1]).endOf('month');
                    const sd = som.day(), td = eom.date();
                    const cells = [];
                    for (let i=0;i<sd;i++) cells.push(<div key={`e${i}`} className="ar-cal-day empty"/>);
                    for (let d=1;d<=td;d++) {
                      const ds = moment([browseYear,browseMonth-1,d]).format('YYYY-MM-DD');
                      const rec = empHistory.find(r=>getAttendanceDateKey(r.attendance_date)===ds)||{ attendance_date:ds, status:'none' };
                      const ex = String(rec.status||'').toLowerCase();
                      const isHalf = ex==='half_day'||Boolean(rec.is_half_day||rec.isHalfDay||rec.is_half||rec.half_day);
                      const ds2 = isHalf?'half_day':(rec.status||'none');
                      const sc2 = getCalendarStatusClass(ds2);
                      let sb = getCalendarStatusBadge(ds2);
                      if (ds2==='half_day') { const sess=rec.half_day_session||''; sb=sess.toLowerCase().includes('first')?'1st Half':sess.toLowerCase().includes('second')?'2nd Half':'½ Day'; }
                      const lt = rec.leaveType||rec.leave_type;
                      const ls = rec.leaveStatus||rec.approval_status;
                      let lb=null, isLP=false;
                      if (lt) {
                        const badge=formatLeaveBadge(lt);
                        const isApp=ls==='approved'||rec.leaveStatus==='approved';
                        const isPend=ls&&ls!=='approved'&&!['rejected','cancelled','withdrawn'].includes(ls);
                        isLP=isPend;
                        const stxt=isApp?'Approved':(isPend?'Pending':'Applied');
                        if (rec.status==='half_day') { sb=`${sb} (${badge})`; lb=stxt; } else lb=`${badge} ${stxt}`;
                      }
                      cells.push(
                        <div key={d} className={`ar-cal-day ${sc2}`} onClick={()=>startEdit(rec,ds)}>
                          <span className="ar-day-num">{d}</span>
                          <div style={{ display:'flex', flexDirection:'column', gap:'2px', alignItems:'center', width:'100%' }}>
                            {sb&&<span className={`ar-day-badge ${sc2}`}>{sb}</span>}
                            {lb&&<span className={`ar-day-badge ${isLP?'pending_leave':'leave'}`}>{lb}</span>}
                          </div>
                        </div>
                      );
                    }
                    return cells;
                  })()}
                </div>
              </div>

              {/* Right Panel */}
              <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                {/* Admin Controls */}
                <div style={{ padding:'14px', background:'#fff', border:`1px solid ${THEME.border}`, borderRadius:'10px' }}>
                  <div style={{ fontSize:'12px', fontWeight:'700', color:THEME.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'10px', display:'flex', alignItems:'center', gap:'6px' }}>
                    <FiActivity size={13} color={THEME.indigo}/> Admin Controls
                  </div>
                  <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', fontSize:'12px', fontWeight:'600', marginBottom:'8px' }}>
                    <input type="checkbox" checked={fullMonthPresenceEnabled} onChange={e=>setFullMonthPresenceEnabled(e.target.checked)}/>
                    Enable Full Month Presence
                  </label>
                  <button onClick={handleApplyFullMonthPresence} disabled={!fullMonthPresenceEnabled||applyingFullMonth} style={{ ...S.btn('primary'), width:'100%', marginBottom:'6px', opacity:fullMonthPresenceEnabled?1:0.5 }}>
                    {applyingFullMonth?'Processing...':'Mark Full Month Present'}
                  </button>
                  <button onClick={()=>setShowLeaveModal(true)} style={{ ...S.btn('ghost'), width:'100%', fontWeight:'700' }}>📬 Apply Leave on Behalf</button>
                  <p style={{ margin:'8px 0 0', fontSize:'11px', color:THEME.muted, lineHeight:1.4 }}>Marks all working days as present with standard shift times.</p>
                </div>

                {/* Correction Requests */}
                <div style={{ padding:'14px', background:'#fff', border:`1px solid ${THEME.border}`, borderRadius:'10px' }}>
                  <div style={{ fontSize:'12px', fontWeight:'700', color:THEME.muted, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'10px' }}>Correction Requests</div>
                  {(profile.correctionRequests||[]).length===0 ? (
                    <div style={{ textAlign:'center', padding:'16px', color:THEME.muted, fontSize:'12px' }}>No correction requests</div>
                  ) : (profile.correctionRequests||[]).slice(0,5).map(req=>{
                    const st = String(req.status||'').toLowerCase();
                    const pal = { pending:['#d97706','#fffbeb','Pending'], approved:['#059669','#ecfdf5','Resolved'], resolved:['#059669','#ecfdf5','Resolved'], rejected:['#e11d48','#fff1f2','Rejected'], cancelled:['#64748b','#f1f5f9','Cancelled'] }[st]||['#64748b','#f1f5f9','Unknown'];
                    return (
                      <div key={req._id||req.id} style={{ padding:'10px', border:`1px solid ${THEME.border}`, borderRadius:'7px', marginBottom:'6px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'3px' }}>
                          <span style={{ fontSize:'12px', fontWeight:'700', color:THEME.navy }}>{req.attendance_date?new Date(req.attendance_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'--'}</span>
                          <span style={{ fontSize:'10px', fontWeight:'700', padding:'2px 7px', borderRadius:'10px', color:pal[0], background:pal[1] }}>{pal[2]}</span>
                        </div>
                        <div style={{ fontSize:'11px', color:THEME.text, textTransform:'capitalize' }}>{req.regularization_type?String(req.regularization_type).replace(/_/g,' '):(req.reason||'No details')}</div>
                        {req.reason&&req.regularization_type&&<div style={{ fontSize:'11px', color:THEME.muted, marginTop:'2px', fontStyle:'italic' }}>"{req.reason}"</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ ATTENDANCE TAB ══════════════════════════════════════════════════ */}
        {tab==='attendance' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px', marginBottom:'14px' }}>
              <span style={{ fontSize:'14px', fontWeight:'700', color:THEME.navy }}>📊 Daily Records</span>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', alignItems:'center', background:'#f8fafc', padding:'8px 12px', borderRadius:'8px', border:`1px solid ${THEME.border}` }}>
                {[['Month',selectedMonth,v=>setSelectedMonth(Number(v)),{ style:{ width:'96px' }}, ['January','February','March','April','May','June','July','August','September','October','November','December'].map((m,i)=>({ v:i, l:m }))],
                  ['Year',selectedYear,v=>setSelectedYear(Number(v)),{ style:{ width:'72px' }}, [selectedYear-1,selectedYear,selectedYear+1].map(y=>({ v:y, l:y }))],
                ].map(([lbl,val,onChange,props,opts],i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                    <span style={{ fontSize:'11px', fontWeight:'600', color:THEME.text }}>{lbl}</span>
                    <select value={val} onChange={e=>onChange(e.target.value)} style={{ ...S.input, ...props.style, padding:'3px 7px', height:'30px', fontSize:'12px' }}>
                      {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  </div>
                ))}
                <span style={{ color:THEME.border }}>|</span>
                {[['From',startDate,setStartDate],['To',endDate,setEndDate]].map(([lbl,val,set],i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                    <span style={{ fontSize:'11px', fontWeight:'600', color:THEME.text }}>{lbl}</span>
                    <input type="date" value={val} onChange={e=>set(e.target.value)} style={{ ...S.input, width:'108px', padding:'3px 7px', height:'30px', fontSize:'12px' }}/>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ overflowX:'auto', border:'1px solid #dee2e6', borderRadius:'6px' }}>
              <table className="ar-log-table">
                <thead>
                  <tr>
                    {['Name','Date','Status','In Time','Out Time','Shift','Hrs'].map(h=><th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(profile.attendance||[]).map(row=>{
                    const sc = getCalendarStatusClass(row.status);
                    const shift = row.shift_id||assignedShiftOptions?.[0]||profile?.employee?.shift_id||{};
                    const sn = shift.shift_name||row.shift_name||(assignedShiftOptions?.[0]?.shift_name)||'--';
                    const fst = t=>t?moment(t,'HH:mm').format('h:mma'):'';
                    const str = shift.start_time&&shift.end_time?` ${fst(shift.start_time)} To ${fst(shift.end_time)}`:'';
                    let sh = shift.full_day_hours||shift.total_hours||row.shift_hours;
                    if (!sh&&shift.start_time&&shift.end_time) {
                      const a=moment(shift.start_time,'HH:mm'), b=moment(shift.end_time,'HH:mm');
                      if (a.isValid()&&b.isValid()) { let d=b.diff(a,'hours',true); if(d<0) d+=24; sh=Math.round(d); }
                    }
                    return (
                      <tr key={row._id}>
                        <td>{employeeName}</td>
                        <td style={{ whiteSpace:'nowrap' }}>{moment(row.attendance_date).format('YYYY-MM-DD')}</td>
                        <StatusPill status={sc} session={row.half_day_session} leaveType={row.leaveType||row.leave_type} leaveStatus={row.leaveStatus||row.approval_status}/>
                        <td style={{ whiteSpace:'nowrap' }}>{row.first_in?moment(row.first_in).format('DD-MM-YYYY h:mm A'):''}</td>
                        <td style={{ whiteSpace:'nowrap' }}>{row.last_out?moment(row.last_out).format('DD-MM-YYYY h:mm A'):''}</td>
                        <td>{sn+str}</td>
                        <td style={{ textAlign:'center' }}>{sh||'--'}</td>
                      </tr>
                    );
                  })}
                  {!(profile.attendance||[]).length && <tr><td colSpan={7} style={{ padding:'24px', textAlign:'center', color:THEME.muted }}>No records in selected period</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ LEAVE TAB ══════════════════════════════════════════════════════ */}
        {tab==='leave' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
            {/* Balance Form */}
            {showLeaveBalanceForm && (
              <div style={{ padding:'16px', background:'#fff', border:`1px solid ${isEditingBalance?THEME.amber:THEME.green}`, borderLeft:`4px solid ${isEditingBalance?THEME.amber:THEME.green}`, borderRadius:'8px' }}>
                <div style={{ fontSize:'13px', fontWeight:'700', color:isEditingBalance?THEME.amber:THEME.green, marginBottom:'12px' }}>
                  {isEditingBalance?'Edit Leave Balance':'Add Leave Balance'}
                  {isEditingBalance&&<span style={{ marginLeft:'8px', fontSize:'11px', color:'#92400e', background:'#fffbeb', border:'1px solid #fde68a', padding:'2px 8px', borderRadius:'6px' }}>Editing: {editingBalancePolicyLabel}</span>}
                </div>
                <form onSubmit={handleUpdateBalance} style={{ display:'flex', flexWrap:'wrap', gap:'12px', alignItems:'flex-end' }}>
                  {[
                    ['Policy', <select key="p" style={{ ...S.input, width:'180px' }} value={String(balanceForm.leave_policy_id)} onChange={e=>setBalanceForm({ ...balanceForm, leave_policy_id:e.target.value })}>
                      <option value="">Select policy</option>
                      {availablePolicies.map(p=><option key={p._id} value={String(p._id)}>{p.policy_name||p.leave_type}</option>)}
                    </select>],
                    ['Opening', <input key="ob" type="number" step="1" style={{ ...S.input, width:'90px' }} value={balanceForm.opening_balance} onChange={e=>setBalanceForm(p=>({ ...p, opening_balance:e.target.value }))}/>],
                    ['Used', <input key="u" type="number" step="1" style={{ ...S.input, width:'80px' }} value={balanceForm.used} onChange={e=>setBalanceForm({ ...balanceForm, used:e.target.value })}/>],
                    ['Pending', <input key="pd" type="number" step="1" style={{ ...S.input, width:'80px' }} value={balanceForm.pending} onChange={e=>setBalanceForm({ ...balanceForm, pending:e.target.value })}/>],
                  ].map(([lbl,ctrl],i)=>(
                    <div key={i}>
                      <div style={{ fontSize:'11px', fontWeight:'700', color:'#000', marginBottom:'4px' }}>{lbl}</div>
                      {ctrl}
                    </div>
                  ))}
                  <div style={{ display:'flex', gap:'6px' }}>
                    <button type="submit" style={{ ...S.btn(isEditingBalance?'amber':'green') }}>{isEditingBalance?'Update':'Save'}</button>
                    <button type="button" onClick={()=>setShowLeaveBalanceForm(false)} style={{ ...S.btn('ghost') }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Balance Table */}
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                <span style={{ fontSize:'13px', fontWeight:'700', color:THEME.navy }}>💰 Leave Balance</span>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={()=>setShowLeaveModal(true)} style={{ ...S.btn('primary') }}>Apply Leave</button>
                  {!showLeaveBalanceForm && <button onClick={()=>{ setBalanceForm({ leave_policy_id:'', opening_balance:0, used:0, pending:0 }); setShowLeaveBalanceForm(true); }} style={{ ...S.btn('green') }}>+ Add</button>}
                </div>
              </div>
              <div style={{ overflowX:'auto', border:`1px solid ${THEME.border}`, borderRadius:'8px' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
                  <thead>
                    <tr style={{ background:'#f8fafc' }}>
                      {['Policy','Opening','Used','Pending',''].map(h=><th key={h} style={{ padding:'10px 12px', fontWeight:'700', color:THEME.navy, borderBottom:`1px solid ${THEME.border}`, textAlign:h==='Policy'?'left':'right', whiteSpace:'nowrap' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(profile.balances||[]).map(b=>{
                      const isLwp = String(b.leave_type||b.leave_policy_id?.leave_type||'').toLowerCase().includes('lwp');
                      const net = isLwp?0:formatLeaveDays(b.available??b.balance??b.closing_balance??Math.max(0,(b.opening_balance||0)-(b.used??b.consumed??0)-(b.pending??b.pending_approval??0)));
                      const rid = b.leave_policy_id?._id||b.leave_policy_id||b._id;
                      const isRowEditing = showLeaveBalanceForm&&isEditingBalance&&String(balanceForm.leave_policy_id)===String(rid);
                      return (
                        <tr key={b._id} style={{ borderBottom:`1px solid ${THEME.border}` }}>
                          <td style={{ padding:'8px 12px' }}>{b.leave_policy_id?.policy_name||b.leave_type||'Policy'}</td>
                          <td style={{ padding:'8px 12px', textAlign:'right' }}>{formatLeaveDays(b.opening_balance||0)}</td>
                          <td style={{ padding:'8px 12px', textAlign:'right' }}>{formatLeaveDays(b.used??b.consumed??0)}</td>
                          <td style={{ padding:'8px 12px', textAlign:'right' }}>{isLwp?0:formatLeaveDays(b.pending??b.pending_approval??0)}</td>
                          {/* <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:'700', color:THEME.primary }}>{net}</td> */}
                          <td style={{ padding:'8px 12px', textAlign:'right' }}>
                            <button onClick={()=>{ setBalanceForm({ leave_policy_id:rid, opening_balance:b.opening_balance||0, used:b.used??b.consumed??0, pending:b.pending??b.pending_approval??0 }); setShowLeaveBalanceForm(true); }} disabled={isRowEditing} style={{ ...S.btn('ghost'), fontSize:'11px', opacity:isRowEditing?0.5:1 }}>{isRowEditing?'Editing…':'Edit'}</button>
                          </td>
                        </tr>
                      );
                    })}
                    {!(profile.balances||[]).length&&<tr><td colSpan={6} style={{ padding:'16px', textAlign:'center', color:THEME.muted }}>No leave balances</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Leave History */}
            <div>
              <div style={{ fontSize:'13px', fontWeight:'700', color:THEME.navy, marginBottom:'10px' }}>📋 Leave History</div>
              <div style={{ overflowX:'auto', border:`1px solid ${THEME.border}`, borderRadius:'8px' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
                  <thead>
                    <tr style={{ background:'#f8fafc' }}>
                      {['Type','From','To','Status'].map(h=><th key={h} style={{ padding:'10px 12px', fontWeight:'700', color:THEME.navy, borderBottom:`1px solid ${THEME.border}`, textAlign:'left' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {leaveHistory.map(l=>(
                      <tr key={l._id} style={{ borderBottom:`1px solid ${THEME.border}` }}>
                        <td style={{ padding:'8px 12px' }}>{l.leave_type||l.leave_policy_id?.policy_name||'Leave'}</td>
                        <td style={{ padding:'8px 12px' }}>{l.from_date?formatAttendanceDate(l.from_date):'--'}</td>
                        <td style={{ padding:'8px 12px' }}>{l.to_date?formatAttendanceDate(l.to_date):'--'}</td>
                        <td style={{ padding:'8px 12px' }}><span style={{ background:'#f1f5f9', padding:'2px 7px', borderRadius:'5px', fontSize:'11px' }}>{l.approval_status||l.status||'--'}</span></td>
                      </tr>
                    ))}
                    {!leaveHistory.length&&<tr><td colSpan={4} style={{ padding:'16px', textAlign:'center', color:THEME.muted }}>No leave history</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ POLICIES TAB ══════════════════════════════════════════════════ */}
        {tab==='policies' && (
          <div>
            {/* Company Global Policy Banner */}
            {profile.employee?.company_id && (
              <div style={{ marginBottom:'20px', padding:'14px 18px', background:'linear-gradient(135deg,#f0f4ff,#e8f0fe)', border:'1px solid #c7d2fe', borderRadius:'12px', borderLeft:'4px solid #4f46e5' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
                  <span style={{ fontSize:'14px' }}>🏢</span>
                  <span style={{ fontSize:'13px', fontWeight:'800', color:'#312e81' }}>
                    Company Global Policies
                  </span>
                  <span style={{ fontSize:'11px', color:'#6366f1', background:'#eef2ff', padding:'2px 8px', borderRadius:'10px', fontWeight:'600' }}>
                    {profile.employee.company_id.company_name || profile.employee.company_id.name || 'Organization'}
                  </span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'8px' }}>
                  {[
                    ['Shift Policy', (() => {
                      const compShift = profile.employee.company_id?.shift_policy_id;
                      if (!compShift) return null;
                      return typeof compShift === 'object' ? (compShift.shift_name || compShift.name) : policyShiftOptions?.find?.(s => String(s._id) === String(compShift))?.shift_name || String(compShift).slice(-6);
                    })(), '🕐'],
                    ['Week-Off', (() => {
                      const wo = profile.employee.company_id?.weekoff_policy_id;
                      if (!wo) return null;
                      return typeof wo === 'object' ? (wo.policy_name || wo.name) : weekOffPolicies?.find?.(p => String(p._id) === String(wo))?.policy_name || null;
                    })(), '📅'],
                    ['Holiday Policy', (() => {
                      const hp = profile.employee.company_id?.holiday_policy_id;
                      if (!hp) return null;
                      return typeof hp === 'object' ? (hp.policy_name || hp.name) : holidayPolicies?.find?.(p => String(p._id) === String(hp))?.policy_name || null;
                    })(), '🎉'],
                  ].filter(([,val]) => val).map(([label, val, icon]) => (
                    <div key={label} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 10px', background:'rgba(255,255,255,0.7)', borderRadius:'8px', border:'1px solid #c7d2fe' }}>
                      <span style={{ fontSize:'12px' }}>{icon}</span>
                      <div>
                        <div style={{ fontSize:'9px', fontWeight:'700', color:'#6366f1', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</div>
                        <div style={{ fontSize:'12px', fontWeight:'600', color:'#1e1b4b' }}>{val}</div>
                      </div>
                    </div>
                  ))}
                  {[
                    ['Shift Policy', (() => {
                      const compShift = profile.employee.company_id?.shift_policy_id;
                      if (!compShift) return null;
                      return typeof compShift === 'object' ? (compShift.shift_name || compShift.name) : policyShiftOptions?.find?.(s => String(s._id) === String(compShift))?.shift_name || String(compShift).slice(-6);
                    })(), '🕐'],
                    ['Week-Off', (() => {
                      const wo = profile.employee.company_id?.weekoff_policy_id;
                      if (!wo) return null;
                      return typeof wo === 'object' ? (wo.policy_name || wo.name) : weekOffPolicies?.find?.(p => String(p._id) === String(wo))?.policy_name || null;
                    })(), '📅'],
                    ['Holiday Policy', (() => {
                      const hp = profile.employee.company_id?.holiday_policy_id;
                      if (!hp) return null;
                      return typeof hp === 'object' ? (hp.policy_name || hp.name) : holidayPolicies?.find?.(p => String(p._id) === String(hp))?.policy_name || null;
                    })(), '🎉'],
                  ].every(([,val]) => !val) && (
                    <div style={{ fontSize:'12px', color:'#6366f1', fontStyle:'italic' }}>No global policies set for this organization. Set them from Manage Companies.</div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
              <div>
                <div style={{ fontSize:'15px', fontWeight:'700', color:THEME.navy }}>🛡️ Individual Policy Management</div>
                <div style={{ fontSize:'12px', color:THEME.muted, marginTop:'3px' }}>Override organization-level defaults for this employee.</div>
              </div>
              {!isEditingPolicy && <button onClick={()=>setIsEditingPolicy(true)} style={{ ...S.btn('ghost') }}>Edit Configuration</button>}
            </div>

            <form onSubmit={handleUpdateIndividualPolicies} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              {/* Policy Cards Grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'12px' }}>
                {[
                  { label:'Week-Off Policy', val:policyForm.weekoff_policy_id, onChange:v=>setPolicyForm(p=>({...p,weekoff_policy_id:v})), opts:weekOffPolicies, nameKey:'policy_name', icon:'📅', color:'#0ea5e9', bg:'#f0f9ff' },
                  { label:'Shift Policy', val:policyForm.shift_id, onChange:v=>setPolicyForm(p=>({...p,shift_id:v})), opts:policyShiftOptions, nameKey:'shift_name', icon:'🕐', color:'#8b5cf6', bg:'#f5f3ff' },
                  { label:'Holiday Policy', val:policyForm.holiday_policy_id, onChange:v=>setPolicyForm(p=>({...p,holiday_policy_id:v})), opts:holidayPolicies, nameKey:'policy_name', icon:'🎉', color:'#f59e0b', bg:'#fffbeb' },
                ].map(({label, val, onChange, opts, nameKey, icon, color, bg}) => {
                  const selected = (opts||[]).find(o => String(o._id) === String(val));
                  return (
                    <div key={label} style={{ background:'#fff', border:`1px solid ${THEME.border}`, borderRadius:'10px', overflow:'hidden' }}>
                      <div style={{ padding:'10px 14px', background:bg, borderBottom:`1px solid ${THEME.border}`, display:'flex', alignItems:'center', gap:'8px' }}>
                        <span style={{ fontSize:'16px' }}>{icon}</span>
                        <span style={{ fontSize:'12px', fontWeight:'700', color:color }}>{label}</span>
                        {selected && <span style={{ marginLeft:'auto', fontSize:'10px', background:`${color}20`, color, padding:'2px 7px', borderRadius:'8px', fontWeight:'700' }}>Set</span>}
                        {!val && <span style={{ marginLeft:'auto', fontSize:'10px', background:'#f1f5f9', color:THEME.muted, padding:'2px 7px', borderRadius:'8px', fontWeight:'600' }}>Not Set</span>}
                      </div>
                      <div style={{ padding:'12px 14px' }}>
                        {selected && !isEditingPolicy ? (
                          <div style={{ fontSize:'13px', fontWeight:'700', color:THEME.navy }}>{selected[nameKey] || selected.name || 'Selected'}</div>
                        ) : (
                          <select disabled={!isEditingPolicy} value={val} onChange={e=>onChange(e.target.value)}
                            style={{ ...S.input, background:isEditingPolicy?'#fff':'#f8fafc', cursor:isEditingPolicy?'default':'not-allowed' }}>
                            <option value="">Select {label}…</option>
                            {(opts||[]).map(p=><option key={p._id} value={p._id}>{p[nameKey] || p.name}</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Leave Policies - Read Only Display */}
              {(profile.balances||[]).length > 0 && (
                <div style={{ background:'#fff', border:`1px solid ${THEME.border}`, borderRadius:'10px', overflow:'hidden' }}>
                  <div style={{ padding:'10px 14px', background:'#f0fdf4', borderBottom:`1px solid ${THEME.border}`, display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ fontSize:'16px' }}>📋</span>
                    <span style={{ fontSize:'12px', fontWeight:'700', color:'#15803d' }}>Leave Policies Assigned</span>
                    <span style={{ marginLeft:'auto', fontSize:'11px', background:'#dcfce7', color:'#15803d', padding:'2px 8px', borderRadius:'8px', fontWeight:'700' }}>
                      {(profile.balances||[]).length} active
                    </span>
                  </div>
                  <div style={{ padding:'12px 14px', display:'flex', flexWrap:'wrap', gap:'8px' }}>
                    {(profile.balances||[]).map((b, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'5px 10px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'8px' }}>
                        <span style={{ fontSize:'11px', fontWeight:'700', color:'#166534' }}>{b.leave_policy_id?.policy_name || b.leave_type || 'Policy'}</span>
                        <span style={{ fontSize:'10px', color:'#22c55e', background:'#dcfce7', padding:'1px 5px', borderRadius:'5px' }}>
                          {((b.pending ?? b.pending_approval ?? Math.max(0,(b.opening_balance||0)-(b.used??b.consumed??0))))} left
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Geofencing */}
              <div style={{ paddingTop:'16px', borderTop:`1px solid ${THEME.border}` }}>
                <div style={{ fontSize:'13px', fontWeight:'700', color:THEME.navy, marginBottom:'10px' }}>📍 Geofencing Configuration</div>
                <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:isEditingPolicy?'pointer':'not-allowed', fontSize:'13px', fontWeight:'600', marginBottom:'12px' }}>
                  <input type="checkbox" disabled={!isEditingPolicy} checked={policyForm.attendance_settings?.geo_fencing_required??false} onChange={e=>setPolicyForm(p=>({...p, attendance_settings:{...(p.attendance_settings||{}), geo_fencing_required:e.target.checked}}))} style={{ width:'16px', height:'16px' }}/>
                  Geo-fencing Required
                  {policyForm.attendance_settings?.geo_fencing_required===undefined&&profile?.employee?.company_id?.settings?.geo_fencing_enabled&&<span style={{ fontSize:'11px', color:THEME.indigo, fontWeight:'600', marginLeft:'4px' }}>(Inherited)</span>}
                </label>
                {(policyForm.attendance_settings?.geo_fencing_required) && (
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                      <span style={{ fontSize:'12px', fontWeight:'700', color:THEME.navy }}>Allowed Locations</span>
                      {isEditingPolicy && <button type="button" onClick={()=>setPolicyForm(p=>({...p, attendance_settings:{...(p.attendance_settings||{}), allowed_locations:[...(p.attendance_settings?.allowed_locations||[]),{name:'',latitude:0,longitude:0,radius_meters:200}]}}))} style={{ ...S.btn('ghost'), fontSize:'11px' }}>+ Add Location</button>}
                    </div>
                    {!(policyForm.attendance_settings?.allowed_locations||[]).length ? (
                      <p style={{ fontSize:'12px', color:THEME.muted, fontStyle:'italic' }}>No individual locations. Falls back to org-level locations.</p>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                        {(policyForm.attendance_settings.allowed_locations||[]).map((loc,idx)=>(
                          <div key={idx} style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 80px 36px', gap:'8px', alignItems:'start', padding:'10px', background:'#f8fafc', borderRadius:'7px', border:`1px solid ${THEME.border}` }}>
                            <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                              <LocationDirectorySelect currentName={loc.name} onSelect={l=>handleDirectorySelect(idx,l)}/>
                              <input placeholder="Custom name…" disabled={!isEditingPolicy} value={loc.name} onChange={e=>setPolicyForm(p=>{ const nl=(p.attendance_settings?.allowed_locations||[]).map((x,i)=>i===idx?{...x,name:e.target.value}:x); return {...p,attendance_settings:{...p.attendance_settings,allowed_locations:nl}}; })} style={{ ...S.input, fontSize:'11px' }}/>
                            </div>
                            <div style={{ display:'flex', gap:'4px' }}>
                              <input type="number" step="any" placeholder="Lat" disabled={!isEditingPolicy} value={loc.latitude} onChange={e=>setPolicyForm(p=>{ const nl=(p.attendance_settings?.allowed_locations||[]).map((x,i)=>i===idx?{...x,latitude:e.target.value===''?0:parseFloat(e.target.value)}:x); return {...p,attendance_settings:{...p.attendance_settings,allowed_locations:nl}}; })} style={{ ...S.input }}/>
                              {isEditingPolicy && <button type="button" onClick={()=>setPickerModal({open:true,index:idx})} style={{ padding:'6px', background:'#f1f5f9', border:`1px solid ${THEME.border}`, borderRadius:'6px', color:THEME.indigo, cursor:'pointer' }}><FiGlobe size={13}/></button>}
                            </div>
                            <input type="number" step="any" placeholder="Lng" disabled={!isEditingPolicy} value={loc.longitude} onChange={e=>setPolicyForm(p=>{ const nl=(p.attendance_settings?.allowed_locations||[]).map((x,i)=>i===idx?{...x,longitude:e.target.value===''?0:parseFloat(e.target.value)}:x); return {...p,attendance_settings:{...p.attendance_settings,allowed_locations:nl}}; })} style={{ ...S.input }}/>
                            <div style={{ position:'relative' }}>
                              <input type="number" placeholder="Radius" disabled={!isEditingPolicy} value={loc.radius_meters} onChange={e=>setPolicyForm(p=>{ const nl=(p.attendance_settings?.allowed_locations||[]).map((x,i)=>i===idx?{...x,radius_meters:e.target.value===''?0:parseInt(e.target.value)}:x); return {...p,attendance_settings:{...p.attendance_settings,allowed_locations:nl}}; })} style={{ ...S.input, paddingRight:'20px' }}/>
                              <span style={{ position:'absolute', right:'5px', top:'50%', transform:'translateY(-50%)', fontSize:'10px', color:THEME.muted }}>m</span>
                            </div>
                            {isEditingPolicy && <button type="button" onClick={()=>setPolicyForm(p=>{ const nl=p.attendance_settings.allowed_locations.filter((_,i)=>i!==idx); return {...p,attendance_settings:{...p.attendance_settings,allowed_locations:nl}}; })} style={{ border:'none', background:'transparent', color:'#ef4444', cursor:'pointer', fontSize:'16px' }}>🗑️</button>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isEditingPolicy && (
                <div style={{ display:'flex', gap:'10px', paddingTop:'8px' }}>
                  <button type="button" onClick={()=>{ setIsEditingPolicy(false); const e=profile.employee,ov=e.policy_overrides||{}; setPolicyForm({ weekoff_policy_id:e.weekoff_policy_id?._id||e.weekoff_policy_id||ov.weekoff_policy_id?._id||ov.weekoff_policy_id||'', holiday_policy_id:e.holiday_policy_id?._id||e.holiday_policy_id||ov.holiday_policy_id?._id||ov.holiday_policy_id||'', shift_id:resolveShiftPolicyId(e,ov.shift_id), attendance_settings:e.attendance_settings||{geo_fencing_required:true,allowed_locations:[]} }); }} style={{ ...S.btn('ghost'), padding:'8px 20px' }}>Discard</button>
                  <button type="submit" disabled={policySaving} style={{ ...S.btn('primary'), padding:'8px 24px', opacity:policySaving?0.7:1 }}>{policySaving?'Saving…':'💾 Save Policy Overrides'}</button>
                </div>
              )}
              <p style={{ margin:0, fontSize:'11px', color:THEME.muted }}>{isEditingPolicy?'You are in edit mode. Changes apply to this individual.':'Click "Edit Configuration" to modify policy overrides.'}</p>
            </form>
          </div>
        )}

        {/* ══ ACTIONS TAB ══════════════════════════════════════════════════ */}
        {tab==='actions' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'24px' }}>
            {/* Migrate */}
            <div style={{ borderLeft:`3px solid ${THEME.amber}`, paddingLeft:'14px' }}>
              <div style={{ fontSize:'13px', fontWeight:'700', color:THEME.amber, marginBottom:'8px' }}>🔄 Migrate Employee</div>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px', padding:'8px 12px', background:'#fff9db', borderRadius:'7px', border:'1px solid #ffe066' }}>
                <span style={{ fontSize:'16px' }}>🏢</span>
                <div><div style={{ fontSize:'10px', fontWeight:'700', color:THEME.muted, textTransform:'uppercase' }}>Current Org</div><div style={{ fontSize:'13px', fontWeight:'800', color:THEME.navy }}>{currentOrgName}</div></div>
              </div>
              <p style={{ margin:'0 0 10px', fontSize:'12px', color:THEME.muted }}>Move this employee to a different organization. Policies and balances update automatically.</p>
              <div style={{ display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' }}>
                <select value={destOrgId} onChange={e=>setDestOrgId(e.target.value)} style={{ ...S.input, maxWidth:'320px', flex:1 }}>
                  <option value="">Select destination organization</option>
                  {organizations.map(o=><option key={o._id} value={o._id}>{o.name}{o.hodName?` (HOD: ${o.hodName})`:''}</option>)}
                </select>
                <button onClick={()=>destOrgId?handleMigrateEmployee(id):toast.error('Select destination')} style={{ ...S.btn('amber') }}>🔄 Migrate</button>
              </div>
            </div>

            {/* Migration History */}
            <div style={{ borderLeft:`3px solid ${THEME.indigo}`, paddingLeft:'14px' }}>
              <div style={{ fontSize:'13px', fontWeight:'700', color:THEME.indigo, marginBottom:'4px' }}>🔁 Migration History</div>
              <p style={{ margin:'0 0 12px', fontSize:'12px', color:THEME.muted }}>Track organization changes and tenure.</p>
              {migrationHistoryLoading ? (
                <div style={{ color:THEME.muted, fontSize:'12px' }}>Loading…</div>
              ) : !migrationHistory.length ? (
                <div style={{ color:THEME.muted, fontSize:'12px' }}>No migration history.</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {migrationHistory.map(ev=>(
                    <div key={ev._id} style={{ padding:'10px 14px', border:`1px solid ${THEME.border}`, borderRadius:'8px', background:'#fff' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:'8px', flexWrap:'wrap' }}>
                        <strong style={{ color:THEME.text, fontSize:'12px' }}>{ev.sourceCompany?.name||'Unknown'} → {ev.destinationCompany?.name||'Unknown'}</strong>
                        <span style={{ color:THEME.muted, fontSize:'11px' }}>{ev.migratedAt?new Date(ev.migratedAt).toLocaleString():'Unknown date'}</span>
                      </div>
                      <div style={{ fontSize:'12px', color:THEME.text, marginTop:'4px' }}>By: <strong>{ev.migratedBy?.name||'Unknown'}</strong></div>
                      <div style={{ fontSize:'11px', color:THEME.muted, marginTop:'2px' }}>Previous period: {formatMigrationPeriod(ev.previousCompanyPeriod)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Leave Modal ── */}
        <AdminApplyLeaveModal isOpen={showLeaveModal} onClose={()=>setShowLeaveModal(false)} employeeId={id} employeeName={employeeName} onSuccess={()=>{ fetchData(); fetchBrowseHistory(); }}/>

        {/* ── Record Adjustment Modal ── */}
        {editingId && (
          <div className="ar-modal-overlay" onClick={()=>setEditingId(null)}>
            <div className="ar-modal-card" onClick={e=>e.stopPropagation()}>
              <div className="ar-modal-head">
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <div style={{ width:'30px', height:'30px', borderRadius:'7px', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center' }}><FiEdit size={14} color={THEME.primary}/></div>
                  <span style={{ fontSize:'14px', fontWeight:'700' }}>Adjust: {moment(editForm.attendance_date).format('D MMM YYYY')}</span>
                </div>
                <button onClick={()=>setEditingId(null)} style={{ border:'none', background:'transparent', cursor:'pointer', color:THEME.muted }}><FiX size={18}/></button>
              </div>
              <div className="ar-modal-body">
                {/* Mode selector */}
                <div style={{ display:'flex', gap:'12px', marginBottom:'14px', flexWrap:'wrap' }}>
                  {[
                    ['time_correction', 'Time Correction', isTimeCorrectionDisabled],
                    ['status_correction', 'Status Correction', false],
                    ['status_correction_time_unchanged', 'Status (Time Unchanged)', !hasInitialPunchIn],
                  ].map(([val,lbl,dis])=>(
                    <label key={val} style={{ display:'flex', gap:'6px', alignItems:'center', fontWeight:600, fontSize:'12px', color:dis?'#ccc':THEME.text, opacity:dis?0.5:1, cursor:dis?'not-allowed':'pointer' }}>
                      <input type="radio" name="correction_mode" disabled={dis} checked={editForm.correction_mode===val}
                        onChange={()=>{
                          if (val==='time_correction') setEditForm(p=>({ ...p, correction_mode:'time_correction', apply_status_correction:false, apply_time_correction:true }));
                          else if (val==='status_correction') setEditForm(p=>{ const n={ ...p, correction_mode:'status_correction', apply_status_correction:true, apply_time_correction:false }; return applyStatusModeTimes(n,n.status||'present',n.shift_id); });
                          else setEditForm(p=>({ ...p, correction_mode:'status_correction_time_unchanged', apply_status_correction:false, apply_time_correction:false }));
                        }}/>
                      {lbl}
                    </label>
                  ))}
                </div>

                {(editForm.correction_mode==='status_correction'||editForm.correction_mode==='status_correction_time_unchanged') ? (
                  <>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                      <div className="ar-form-group">
                        <label className="ar-form-label">Status</label>
                        <select style={{ ...S.input }} value={editForm.status} onChange={e=>{
                          const ns=e.target.value;
                          if (isNonWorkingStatus(ns)&&editForm.correction_mode!=='status_correction_time_unchanged') {
                            setAutoSwitchHintShown(true);
                            setEditForm(p=>({ ...p, status:ns, correction_mode:'status_correction_time_unchanged', apply_status_correction:false, apply_time_correction:false, first_in:'', last_out:'', half_day_session:ns==='half_day'?(p.half_day_session||'first_half'):null }));
                          } else {
                            setAutoSwitchHintShown(false);
                            setEditForm(p=>{ if(p.correction_mode==='status_correction_time_unchanged') return { ...p, status:ns, half_day_session:ns==='half_day'?(p.half_day_session||'first_half'):null }; return applyStatusModeTimes({ ...p },ns,p.shift_id); });
                          }
                        }}>
                          <option value="present">Present</option><option value="absent">Absent</option><option value="half_day">Half Day</option>
                          <option value="leave">Leave</option><option value="weekly_off">Weekly Off</option><option value="holiday">Holiday</option>
                        </select>
                      </div>
                      <div className="ar-form-group">
                        <label className="ar-form-label">Shift</label>
                        <select style={{ ...S.input }} value={editForm.shift_id} onChange={e=>{ const ns=e.target.value; setEditForm(p=>{ const n={ ...p, shift_id:ns }; if(p.correction_mode==='status_correction') return applyStatusModeTimes(n,n.status,ns); return n; }); }}>
                          <option value="">Select Shift</option>
                          {(visibleShiftPolicies.length>0?visibleShiftPolicies:assignedShiftOptions).map(s=><option key={s._id} value={s._id}>{s.shift_name||'Shift'} ({s.start_time||'--'} - {s.end_time||'--'})</option>)}
                        </select>
                      </div>
                    </div>
                    {editForm.status==='half_day' && (
                      <div className="ar-form-group">
                        <label className="ar-form-label">Session</label>
                        <div style={{ display:'flex', gap:'8px' }}>
                          {['first_half','second_half'].map(s=>(
                            <button key={s} type="button" onClick={()=>setEditForm({ ...editForm, half_day_session:s })} style={{ ...S.btn(editForm.half_day_session===s?'primary':'ghost'), flex:1, fontSize:'11px' }}>{s==='first_half'?'First Half':'Second Half'}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                      {[['Punch In','first_in'],['Punch Out','last_out']].map(([lbl,key])=>(
                        <div key={key} className="ar-form-group">
                          <label className="ar-form-label">{lbl}</label>
                          <input type="datetime-local" style={{ ...S.input }} value={editForm[key]} onChange={e=>{ const v=e.target.value; setEditForm(p=>{ const n={ ...p, [key]:v, correction_mode:'time_correction' }; const wh=calculateWorkHours(n.first_in,n.last_out); if(wh>=8) n.status='present'; else if(wh>=4) n.status='half_day'; else if(wh>0) n.status='incomplete'; return n; }); }}/>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize:'11px', color:THEME.muted, margin:'0 0 8px' }}>Status auto-derived from work hours.</p>
                  </>
                )}

                <div className="ar-form-group">
                  <label className="ar-form-label">Remarks</label>
                  <textarea className="ar-input-ctrl" rows={2} style={{ ...S.input, height:'auto', padding:'8px 10px' }} value={editForm.remarks} onChange={e=>setEditForm({ ...editForm, remarks:e.target.value })} placeholder="Reason for adjustment…"/>
                </div>

                {autoSwitchHintShown && (
                  <div style={{ padding:'8px 12px', background:'#fff9db', border:'1px solid #ffe066', borderRadius:'7px', fontSize:'11px', color:'#856404', display:'flex', gap:'6px', alignItems:'flex-start' }}>
                    <FiAlertTriangle style={{ flexShrink:0, marginTop:'1px' }}/>
                    <span>Switched to Status Correction (Time Unchanged) based on punch data availability.</span>
                  </div>
                )}
              </div>
              <div className="ar-modal-foot">
                <button onClick={()=>setEditingId(null)} style={{ ...S.btn('ghost') }}>Cancel</button>
                <button onClick={saveEdit} disabled={saving} style={{ ...S.btn('primary'), padding:'8px 20px', fontWeight:'700' }}>{saving?'Saving…':'Save Changes'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Location Picker ── */}
        <LocationPickerModal isOpen={pickerModal.open} onClose={()=>setPickerModal({ open:false, index:-1 })} onConfirm={handleMapConfirm}
          initialLocation={pickerModal.index!==-1&&policyForm.attendance_settings?.allowed_locations[pickerModal.index]?.latitude?{ lat:policyForm.attendance_settings.allowed_locations[pickerModal.index].latitude, lng:policyForm.attendance_settings.allowed_locations[pickerModal.index].longitude }:null}/>

        {/* ── Migration Modal (Profile View) ── */}
        {showMigrationModal&&migratingEmployeeId && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
            <div style={{ background:'#fff', borderRadius:'12px', width:'420px', padding:'20px', boxShadow:'0 16px 32px rgba(0,0,0,0.15)' }}>
              <h3 style={{ margin:'0 0 14px', color:THEME.navy }}>🔄 Migrate Employee</h3>
              <div style={{ marginBottom:'14px', padding:'10px 12px', background:'#f8fafc', borderRadius:'7px', border:`1px solid ${THEME.border}`, display:'flex', gap:'10px', alignItems:'center' }}>
                <span style={{ fontSize:'18px' }}>🏢</span>
                <div><div style={{ fontSize:'10px', fontWeight:'700', color:THEME.muted, textTransform:'uppercase' }}>From</div><div style={{ fontSize:'13px', fontWeight:'800', color:THEME.navy }}>{currentOrgName}</div></div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
                <label style={{ fontWeight:'700', fontSize:'12px', minWidth:'110px' }}>Destination:</label>
                <select value={destOrgId} onChange={e=>setDestOrgId(e.target.value)} style={{ ...S.input, flex:1 }}>
                  <option value="">Select organization</option>
                  {organizations.map(o=><option key={o._id} value={o._id}>{o.name}{o.hodName?` (HOD: ${o.hodName})`:''}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={()=>{ setShowMigrationModal(false); setMigratingEmployeeId(null); setDestOrgId(''); }} style={{ ...S.btn('ghost'), flex:1 }}>Cancel</button>
                <button onClick={()=>handleMigrateEmployee(migratingEmployeeId)} style={{ ...S.btn('amber'), flex:1 }}>Migrate</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Pending Leaves Modal ── */}
        {showPendingLeavesModal && (() => {
          const pendingLeaves = profile?.pendingLeaves||[];
          const approved = Array.isArray(profile?.leaves)?profile.leaves:[];
          const historyLeaves = approved.filter(l=>!['rejected','cancelled','withdrawn','pending','pending_hod','pending_shalini','pending_final'].includes(String(l?.approval_status||l?.status||'').toLowerCase())).sort((a,b)=>new Date(b.createdAt||b.from_date||0)-new Date(a.createdAt||a.from_date||0));
          const byMonth = {};
          pendingLeaves.forEach(l=>{ const k=moment(l.from_date).format('MMMM YYYY'); if(!byMonth[k]) byMonth[k]=[]; byMonth[k].push(l); });
          const sortedMonths = Object.keys(byMonth).sort((a,b)=>moment(b,'MMMM YYYY').valueOf()-moment(a,'MMMM YYYY').valueOf());
          const stageLabels = { stage_1_hod:{ label:'HOD', short:'HOD', color:'#6366f1' }, stage_2_shalini:{ label:'HR', short:'HR', color:'#8b5cf6' }, stage_3_final:{ label:'Final', short:'Fin', color:'#10b981' } };
          const allStages = ['stage_1_hod','stage_2_shalini','stage_3_final'];
          const statusChip = (s) => ({ pending:{bg:'#fffbeb',color:'#d97706',b:'#fde68a'}, pending_hod:{bg:'#eef2ff',color:'#4f46e5',b:'#c7d2fe'}, pending_shalini:{bg:'#f5f3ff',color:'#7c3aed',b:'#ddd6fe'}, pending_final:{bg:'#ecfdf5',color:'#059669',b:'#a7f3d0'} }[s]||{bg:'#f8fafc',color:'#64748b',b:'#e2e8f0'});
          const hbm = {};
          historyLeaves.forEach(l=>{ const k=moment(l.from_date||l.createdAt).format('MMMM YYYY'); if(!hbm[k]) hbm[k]=[]; hbm[k].push(l); });
          const hm = Object.keys(hbm).sort((a,b)=>moment(b,'MMMM YYYY').valueOf()-moment(a,'MMMM YYYY').valueOf());
          const close = () => { setShowPendingLeavesModal(false); setPendingLeavesModalTab('pending'); };

          return (
            <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', backdropFilter:'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, padding:'16px' }} onClick={e=>{ if(e.target===e.currentTarget) close(); }}>
              <div style={{ background:'#fff', borderRadius:'14px', width:'100%', maxWidth:'780px', maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 50px rgba(0,0,0,0.2)', overflow:'hidden' }}>
                {/* Header */}
                <div style={{ padding:'14px 18px', borderBottom:`1px solid ${THEME.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', background:'linear-gradient(135deg,#fffbeb,#fff7ed)', flexShrink:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ fontSize:'16px' }}>⏳</span>
                    <div>
                      <div style={{ fontSize:'14px', fontWeight:'800', color:'#0f172a' }}>{pendingLeavesModalTab==='history'?'Leave History':'Pending Requests'}</div>
                      <div style={{ fontSize:'11px', color:'#334155', display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                        <strong style={{ color:'#0f172a' }}>{employeeName}</strong>
                        <span style={{ color:'#cbd5e1' }}>·</span>
                        <span><strong style={{ color:'#d97706' }}>{pendingLeaves.length}</strong> pending</span>
                        <span style={{ color:'#cbd5e1' }}>·</span>
                        <span><strong style={{ color:'#4f46e5' }}>{historyLeaves.length}</strong> history</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={close} style={{ background:'#e2e8f0', border:'none', borderRadius:'7px', width:'28px', height:'28px', cursor:'pointer', fontSize:'15px', color:'#1e293b', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700' }}>×</button>
                </div>
                {/* Tab */}
                <div style={{ display:'flex', gap:'6px', padding:'10px 18px 0', background:'#fff', flexShrink:0 }}>
                  {[['pending','Pending Leaves'],['history','Leave History']].map(([v,l])=>(
                    <button key={v} onClick={()=>setPendingLeavesModalTab(v)} style={{ ...S.btn(pendingLeavesModalTab===v?'primary':'ghost'), fontSize:'11px' }}>{l}</button>
                  ))}
                </div>
                {/* Body */}
                <div style={{ overflowY:'auto', flex:1 }}>
                  {pendingLeavesModalTab==='pending' ? (
                    <>
                      {pendingLeaves.length>0 && (
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 90px 50px 65px 180px', gap:0, padding:'7px 18px', background:'#f8fafc', borderBottom:`1px solid ${THEME.border}`, flexShrink:0 }}>
                          {['Leave / Dates','Status','Days','Applied','Approval Stage'].map(h=><div key={h} style={{ fontSize:'10px', fontWeight:'800', color:'#334155', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</div>)}
                        </div>
                      )}
                      {!pendingLeaves.length ? (
                        <div style={{ textAlign:'center', padding:'40px', color:'#94a3b8' }}><div style={{ fontSize:'32px', marginBottom:'6px' }}>🎉</div><div style={{ fontWeight:'700', color:'#475569' }}>No Pending Leaves</div></div>
                      ) : sortedMonths.map(month=>(
                        <div key={month}>
                          <div style={{ padding:'5px 18px', background:'#f1f5f9', borderBottom:`1px solid ${THEME.border}`, fontSize:'10px', fontWeight:'800', color:'#475569', textTransform:'uppercase', letterSpacing:'0.06em' }}>{month} · {byMonth[month].length}</div>
                          {byMonth[month].map((leave,li)=>{
                            const sc2=statusChip(leave.approval_status);
                            const chain=leave.approval_chain||[];
                            const csi=allStages.indexOf(leave.approval_stage);
                            return (
                              <div key={leave._id||li} style={{ display:'grid', gridTemplateColumns:'1fr 90px 50px 65px 180px', gap:0, padding:'9px 18px', alignItems:'center', borderBottom:li===byMonth[month].length-1?'none':`1px solid ${THEME.border}` }}
                                onMouseEnter={e=>e.currentTarget.style.background='#fafafa'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                                <div style={{ paddingRight:'10px' }}>
                                  <div style={{ fontSize:'13px', fontWeight:'700', color:'#0f172a' }}>{leave.leave_type||leave.leave_policy_id?.leave_type||'Leave'}</div>
                                  <div style={{ fontSize:'11px', color:'#64748b', marginTop:'1px' }}>{moment(leave.from_date).format('DD MMM')}{leave.from_date!==leave.to_date?` – ${moment(leave.to_date).format('DD MMM YYYY')}`:`, ${moment(leave.from_date).format('YYYY')}`}</div>
                                  {leave.reason&&<div style={{ fontSize:'10px', color:'#94a3b8', marginTop:'1px', fontStyle:'italic', maxWidth:'200px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={leave.reason}>"{leave.reason}"</div>}
                                </div>
                                <div><span style={{ background:sc2.bg, color:sc2.color, border:`1px solid ${sc2.b}`, borderRadius:'10px', padding:'2px 7px', fontSize:'9px', fontWeight:'700', whiteSpace:'nowrap' }}>{String(leave.approval_status||'pending').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).replace('Hod ','HOD ')}</span></div>
                                <div style={{ fontSize:'13px', fontWeight:'700', color:'#0f172a' }}>{leave.total_days}<span style={{ fontSize:'10px', color:'#94a3b8', fontWeight:'500', marginLeft:'1px' }}>d</span></div>
                                <div style={{ fontSize:'11px', color:'#475569' }}>{moment(leave.applied_on||leave.createdAt).format('DD MMM')}</div>
                                <div style={{ display:'flex', alignItems:'center', gap:0 }}>
                                  {allStages.map((stg,si)=>{
                                    const si2=stageLabels[stg];
                                    const ce=chain.find(c=>c.stage===stg);
                                    let ss='upcoming';
                                    if(ce) { if(ce.action==='approved') ss='done'; else if(ce.action==='rejected') ss='rejected'; else ss=si===csi?'current':(si<csi?'done':'upcoming'); }
                                    else { if(si<csi) ss='done'; else if(si===csi) ss='current'; }
                                    const pal2 = { done:{dot:'#10b981',glyph:'✓',ring:'none'}, current:{dot:'#f59e0b',glyph:'●',ring:'0 0 0 2px rgba(245,158,11,0.2)'}, rejected:{dot:'#ef4444',glyph:'✗',ring:'none'}, upcoming:{dot:'#d1d5db',glyph:'○',ring:'none'} }[ss];
                                    return (
                                      <div key={stg} style={{ display:'flex', alignItems:'center', flex:1 }}>
                                        {si>0&&<div style={{ flex:1, height:'1px', background:si<=csi?'#10b981':'#e2e8f0' }}/>}
                                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }} title={`${si2.label}${ce?.approver_username?`: ${ce.approver_username}`:''}`}>
                                          <div style={{ width:'18px', height:'18px', borderRadius:'50%', background:ss==='done'?'#ecfdf5':ss==='current'?'#fffbeb':ss==='rejected'?'#fef2f2':'#f1f5f9', border:`1.5px solid ${pal2.dot}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', fontWeight:'900', color:pal2.dot, boxShadow:pal2.ring, flexShrink:0 }}>{pal2.glyph}</div>
                                          <div style={{ fontSize:'8px', fontWeight:'700', color:pal2.dot, marginTop:'2px', textAlign:'center' }}>{si2.short}</div>
                                        </div>
                                        {si===0&&<div style={{ flex:1, height:'1px', background:si<csi?'#10b981':'#e2e8f0' }}/>}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </>
                  ) : (
                    !hm.length ? (
                      <div style={{ textAlign:'center', padding:'40px', color:'#94a3b8' }}><div style={{ fontSize:'32px', marginBottom:'6px' }}>📅</div><div style={{ fontWeight:'700', color:'#475569' }}>No Leave History</div></div>
                    ) : hm.map(month=>(
                      <div key={month}>
                        <div style={{ padding:'5px 18px', background:'#f1f5f9', borderBottom:`1px solid ${THEME.border}`, fontSize:'10px', fontWeight:'800', color:'#475569', textTransform:'uppercase', letterSpacing:'0.06em' }}>{month} · {hbm[month].length}</div>
                        {hbm[month].map((leave,i)=>{
                          const st=String(leave.approval_status||leave.status||'leave').toLowerCase();
                          const sp={ approved:{bg:'#ecfdf5',c:'#059669',b:'#a7f3d0'}, rejected:{bg:'#fef2f2',c:'#dc2626',b:'#fecaca'}, pending:{bg:'#fffbeb',c:'#d97706',b:'#fde68a'} }[st]||{bg:'#f8fafc',c:'#475569',b:'#e2e8f0'};
                          return (
                            <div key={leave._id||i} style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr 100px 70px', gap:'10px', padding:'10px 18px', alignItems:'center', borderBottom:i===hbm[month].length-1?'none':`1px solid ${THEME.border}` }}>
                              <div><div style={{ fontSize:'13px', fontWeight:'700', color:'#0f172a' }}>{leave.leave_type||leave.leave_policy_id?.leave_type||'Leave'}</div>{leave.reason&&<div style={{ fontSize:'11px', color:'#64748b', fontStyle:'italic', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{leave.reason}</div>}</div>
                              <div style={{ fontSize:'11px', color:'#64748b' }}>{moment(leave.from_date).format('DD MMM YYYY')}{leave.to_date&&leave.from_date!==leave.to_date?` - ${moment(leave.to_date).format('DD MMM YYYY')}`:''}</div>
                              <span style={{ background:sp.bg, color:sp.c, border:`1px solid ${sp.b}`, borderRadius:'10px', padding:'2px 7px', fontSize:'10px', fontWeight:'700', whiteSpace:'nowrap' }}>{String(leave.approval_status||leave.status||'leave').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</span>
                              <div style={{ textAlign:'right', fontSize:'13px', fontWeight:'700', color:'#0f172a' }}>{formatLeaveDays(leave.total_days??leave.days??0)}d</div>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
                <div style={{ padding:'10px 18px', borderTop:`1px solid ${THEME.border}`, display:'flex', justifyContent:'flex-end', background:'#f8fafc', flexShrink:0 }}>
                  <button onClick={close} style={{ ...S.btn('primary'), padding:'7px 20px' }}>Close</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Export Org Logs Modal (per-org button) ── */}
        {exportModal.open && (
          <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.4)', zIndex:100000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>setExportModal({ open:false, orgName:'', items:[] })}>
            <div style={{ background:'#fff', borderRadius:'12px', width:'360px', overflow:'hidden', boxShadow:'0 16px 40px rgba(0,0,0,0.2)' }} onClick={e=>e.stopPropagation()}>
              <div style={{ padding:'18px 20px', borderBottom:`1px solid ${THEME.border}` }}>
                <div style={{ fontSize:'15px', fontWeight:'800', color:'#0f172a' }}>Export Logs</div>
                <div style={{ fontSize:'12px', color:'#64748b', marginTop:'4px' }}>Attendance for <b>{exportModal.orgName}</b></div>
              </div>
              <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:'12px' }}>
                {[['From Date','start'],['To Date','end']].map(([lbl,key])=>(
                  <div key={key}>
                    <label style={{ display:'block', marginBottom:'5px', fontSize:'11px', fontWeight:'700', color:'#475569' }}>{lbl}</label>
                    <input type="date" value={exportDateRange[key]} onChange={e=>setExportDateRange(p=>({ ...p, [key]:e.target.value }))} style={{ ...S.input, height:'38px' }}/>
                  </div>
                ))}
              </div>
              <div style={{ padding:'12px 20px', background:'#f8fafc', borderTop:`1px solid ${THEME.border}`, display:'flex', justifyContent:'flex-end', gap:'8px' }}>
                <button onClick={()=>setExportModal({ open:false, orgName:'', items:[] })} style={{ ...S.btn('ghost') }}>Cancel</button>
                <button onClick={()=>{ confirmDownloadOrgReport(exportModal.orgName,exportModal.items,exportDateRange.start,exportDateRange.end); setExportModal({ open:false, orgName:'', items:[] }); }} style={{ ...S.btn('green') }}>Download</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default EmployeeProfileWorkspace;