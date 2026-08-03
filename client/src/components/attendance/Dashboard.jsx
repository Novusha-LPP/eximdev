import { useContext } from 'react';
import { UserContext } from '../../contexts/UserContext';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiLogIn, FiLogOut, FiRefreshCw, FiArrowRight,
  FiCalendar, FiCheckSquare, FiFileText, FiActivity,
  FiCheck, FiX, FiSettings, FiBookOpen, FiClock, FiUsers,
  FiCheckCircle, FiXCircle, FiSun,
  FiChevronLeft, FiChevronRight, FiList
} from 'react-icons/fi';
import Badge from './common/Badge';
import attendanceAPI from '../../api/attendance/attendance.api';
import leaveAPI from '../../api/attendance/leave.api';
import masterAPI from '../../api/attendance/master.api';
import { getAttendanceDateKey, minutesToHours, isToday } from './utils/helpers';
import toast from 'react-hot-toast';
import AdminAnalyticsTab from './AdminAnalyticsTab';
import AdminMonthlySummaryTab from './AdminMonthlySummaryTab';
import ApplyLeaveModal from './ApplyLeaveModal';
import AttendanceAnalyticsModal from './AttendanceAnalyticsModal';
import { downloadRabsPolicyBook } from '../../utils/rabsPolicyManual';
import './Dashboard.css';

/* -- Constants -- */
const AUTHORIZED_DASHBOARD_ADMINS = new Set([
  'shalini_arun', 'manu_pillai', 'suraj_rajan', 'rajan_aranamkatte', 'uday_zope'
]);

/* -- Helpers -- */
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const fmtTime = iso => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  let h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0'), ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
};

const fmtLate = mins => {
  const m = parseInt(mins || 0);
  return m < 60 ? `+${m}m late` : `+${Math.floor(m / 60)}h ${m % 60}m late`;
};

const initials = (n = '') => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);


const getHolidayEmoji = (name = '', type = '') => {
  const n = (name + type).toLowerCase();
  if (n.includes('diwali')) return '🪔';
  if (n.includes('holi')) return '🎨';
  if (n.includes('eid')) return '🌙';
  if (n.includes('christmas')) return '🎄';
  if (n.includes('new year')) return '🎆';
  if (n.includes('independence') || n.includes('republic')) return '🇮🇳';
  if (type === 'national') return '🏛️';
  return '📅';
};

const LEAVE_ICONS = [
  { keys: ['casual', 'cl'], emoji: '🍃', color: '#3b82f6' },
  { keys: ['sick', 'sl', 'medical'], emoji: '🤒', color: '#10b981' },
  { keys: ['earned', 'el', 'annual'], emoji: '⭐', color: '#8b5cf6' },
  { keys: ['comp', 'co'], emoji: '🎁', color: '#f59e0b' },
  { keys: ['wfh', 'work from'], emoji: '🏠', color: '#06b6d4' },
  { keys: ['lwp'], emoji: '⏳', color: '#9ca3af' },
];
const getLeaveIcon = (name = '') => {
  const n = name.toLowerCase();
  return LEAVE_ICONS.find(c => c.keys.some(k => n.includes(k))) || { emoji: '📝', color: '#9ca3af' };
};

const formatLeaveDates = (from, to) => {
  if (!from) return '';
  const f = new Date(from);
  if (isNaN(f)) return '';
  const fStr = f.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (!to) return fStr;
  const t = new Date(to);
  if (isNaN(t)) return fStr;
  const tStr = t.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (fStr === tStr) return fStr;
  if (f.getMonth() === t.getMonth() && f.getFullYear() === t.getFullYear()) {
    const monthName = f.toLocaleString('en-US', { month: 'short' });
    return `${monthName} ${f.getDate()} – ${t.getDate()}`;
  }
  return `${fStr} – ${tStr}`;
};


const formatSession = (s) => {
  if (!s) return '';
  return s === 'first_half' ? '1st Half' : '2nd Half';
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

const isHalfDayRequest = (req) => Boolean(req?.is_half_day || req?.is_start_half_day || req?.is_end_half_day);
const getHalfDaySession = (req) => req?.half_day_session || req?.start_half_session || req?.end_half_session || '';

const calClass = (rec, isCurrentDay, punchStatus) => {
  if (!rec) return '';
  if (rec.status === 'incomplete') return 'missed_punch';
  if (rec.status === 'half_day' || rec?.is_half_day || rec?.half_day_session) return 'half_day';
  if (isCurrentDay && (punchStatus?.status === 'Checked In' || punchStatus?.status === 'Checked Out')) {
    return rec?.isLate ? 'late' : 'present';
  }
  if (rec.status === 'present') return rec.isLate ? 'late' : 'present';
  return { absent: 'absent', holiday: 'holiday', weekly_off: 'weekly_off', leave: 'leave', pending_leave: 'pending_leave', incomplete: 'missed_punch' }[rec.status] || '';
};

const DOT_MAP = { present: 'P', absent: 'A', late: 'L', present_late: 'L', half_day: '½', leave: 'LV', pending_leave: 'LV', holiday: 'HD', weekly_off: 'O', missed_punch: 'M', empty: '' };

const CAL_LABELS = {
  present: 'Present',
  late: 'Present',
  absent: 'Absent',
  half_day: 'Half-Day',
  leave: 'Leave',
  pending_leave: 'Leave',
  weekly_off: 'Weekly Off',
  holiday: 'Holiday',
  missed_punch: 'Missed Punch',
  none: ''
};

/* ------------------------------------------
   UNIFIED DASHBOARD – All Roles
------------------------------------------ */
export default function Dashboard() {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const normalizeRole = (r) => String(r || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
  const nRole = normalizeRole(user?.role);
  const isAdmin = nRole === 'ADMIN';
  const isHOD = nRole === 'HOD' || nRole === 'HEADOFDEPARTMENT' || !!user?.isHOD || !!user?.hodId;
  const isManager = isAdmin || isHOD;

  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [approving, setApproving] = useState({});
  const [dash, setDash] = useState(null);
  const [balances, setBalances] = useState([]);
  const [correctionDatesSet, setCorrectionDatesSet] = useState(new Set()); // dates with correction requests
  const [mgmtData, setMgmtData] = useState(null);
  const [todayTab, setTodayTab] = useState('absent');
  const [pendingTab, setPendingTab] = useState('leave');
  const [holidays, setHolidays] = useState([]);
  const [month, setMonth] = useState(new Date());
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
  const [leaveModalDate, setLeaveModalDate] = useState('');

  // Analytics Modal
  const [analyticsModal, setAnalyticsModal] = useState({
    isOpen: false,
    type: 'present',
    initialDate: new Date().toISOString().split('T')[0]
  });
  const [liveTimer, setLiveTimer] = useState('0h 00m 00s');
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  // Adhoc Admin Tabs
  const [activeTab, setActiveTab] = useState('calendar');
  const [adminData, setAdminData] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminDate, setAdminDate] = useState(new Date().toISOString().split('T')[0]);
  const [adminEndDate, setAdminEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [adminMonth, setAdminMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [adminCompanyId, setAdminCompanyId] = useState('');
  const [companies, setCompanies] = useState([]);

  const username = String(user?.username || '').toLowerCase();
  const isAuthorizedAdmin = AUTHORIZED_DASHBOARD_ADMINS.has(username) || user?.isAttendanceAllowedAdmin === true;
  const isHR = nRole === 'HR';
  const canManagePolicy = isAuthorizedAdmin || isAdmin || isHR;
  const [weekOff, setWeekOff] = useState(0);

  /* -- Fetch -- */
  const load = useCallback(async (mo, yr) => {
    try {
      setLoading(true);
      const base = [
        attendanceAPI.getDashboardData(mo, yr),
        leaveAPI.getBalance().catch(() => ({ data: [] })),
        attendanceAPI.getRegularizations({ limit: 100 }).catch(() => null),
      ];

      if (isAdmin && isAuthorizedAdmin) {
        base.push(attendanceAPI.getAdminDashboard().catch(() => null));
        base.push(masterAPI.getHolidays({ limit: 5 }).catch(() => null));
      } else if (isHOD || isAdmin) {
        base.push(attendanceAPI.getHODDashboard().catch(() => null));
      }

      const [dashRes, balRes, corrRes, extraRes, holRes] = await Promise.all(base);

      if (dashRes) setDash(dashRes);
      setBalances(balRes?.data || []);

      // Build set of dates with pending/unresolved correction requests
      const corrList = Array.isArray(corrRes?.data) ? corrRes.data : Array.isArray(corrRes?.requests) ? corrRes.requests : [];
      const corrDates = new Set();
      corrList.forEach(r => {
        const s = String(r.status || '').toLowerCase();
        const source = String(r.resolution_source || '').toLowerCase();
        const isResolved = r.is_resolved || s === 'approved' || s === 'resolved' || s === 'rejected' || s === 'cancelled' || source === 'admin_manual_correction' || source === 'hod_manual_correction';
        if (!isResolved) {
          const d = String(r.date || r.attendance_date || '').slice(0, 10);
          if (d) corrDates.add(d);
        }
      });
      setCorrectionDatesSet(corrDates);

      if (isAdmin && isAuthorizedAdmin && extraRes?.success) {
        setMgmtData(extraRes.data);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        setHolidays(
          (holRes?.data || [])
            .filter(h => new Date(h.holiday_date) >= today)
            .sort((a, b) => new Date(a.holiday_date) - new Date(b.holiday_date))
            .slice(0, 4)
        );
      } else if ((isHOD || isAdmin) && extraRes?.data) {
        setMgmtData(extraRes.data);
      }
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); }
  }, [isAdmin, isHOD, isAuthorizedAdmin]);

  // Fetch companies for admin filtering
  useEffect(() => {
    if (isAuthorizedAdmin) {
      masterAPI.getCompanies().then(res => {
        if (res?.success) {
          const list = res.data || [];
          const isRabsAdmin = String(user?.company || '').toLowerCase().includes('rabs') || String(user?.department || '').toLowerCase().includes('rabs');
          const filteredList = list.filter(c => {
            const name = String(c.company_name || '').toLowerCase();
            return isRabsAdmin ? name.includes('rabs') : !name.includes('rabs');
          });
          setCompanies(filteredList);
        }
      }).catch(err => console.error('Failed to load companies', err));
    }
  }, [isAuthorizedAdmin, user]);



  useEffect(() => { load(month.getMonth() + 1, month.getFullYear()); }, [month]);

  const loadAdminData = useCallback(async (date, companyId, endDate) => {
    if (!isAuthorizedAdmin && !isHOD) return;
    try {
      setAdminLoading(true);
      const res = isAuthorizedAdmin
        ? await attendanceAPI.getAdminAttendanceReport(
          date,
          endDate || date,
          'all',
          companyId || undefined
        )
        : await attendanceAPI.getTeamAttendanceReport(
          date,
          endDate || date,
          'all'
        );

      if (res?.success) {
        const rows = Array.isArray(res.data) ? res.data : [];
        const targetDate = String(date || '').slice(0, 10);

        const normalizedRows = rows.map((row, index) => {
          const todayRecord = (row.history || []).find((entry) => entry.date === targetDate) || row.history?.[0] || {};
          const status = String(todayRecord.status || '').toLowerCase() || 'absent';
          const leaveStatus = String(todayRecord.leaveStatus || todayRecord.approval_status || status).toLowerCase();

          return {
            id: row.id || row._id || `row-${index}`,
            name: row.name || 'Unknown',
            organization: row.company_name || 'All Companies',
            department: row.designation || 'General',
            team: row.team_name || row.team || 'Unassigned',
            status,
            inTime: row.latestRecord?.first_in || todayRecord.check_in || null,
            outTime: row.latestRecord?.check_out || todayRecord.check_out || null,
            lateMinutes: Number(row.latestRecord?.late_by_minutes ?? todayRecord.late_by_minutes ?? 0),
            shiftName: todayRecord.shift_id?.shift_name || row.shift_id?.shift_name || row.shift_name || null,
            leave: todayRecord.leaveType || todayRecord.leave_type ? {
              type: todayRecord.leaveType || todayRecord.leave_type,
              status: leaveStatus,
              reason: todayRecord.leaveReason || todayRecord.reason || ''
            } : null
          };
        });

        const isRabsAdmin = String(user?.company || '').toLowerCase().includes('rabs') || String(user?.department || '').toLowerCase().includes('rabs');
        const filteredRows = normalizedRows.filter(row => {
          const comp = String(row.organization || '').toLowerCase();
          const dept = String(row.department || '').toLowerCase();
          const hasRabs = comp.includes('rabs') || dept.includes('rabs');
          return isRabsAdmin ? hasRabs : !hasRabs;
        });

        const stats = {
          total: filteredRows.length,
          present: filteredRows.filter(e => ['present', 'late', 'half_day'].includes(e.status)).length,
          absent: filteredRows.filter(e => e.status === 'absent').length,
          onLeave: filteredRows.filter(e => ['leave', 'pending_leave'].includes(e.status)).length,
          halfDay: filteredRows.filter(e => e.status === 'half_day').length,
          late: filteredRows.filter(e => e.status === 'late').length
        };

        setAdminData({
          success: true,
          stats,
          dailySummary: filteredRows,
          summaryRows: filteredRows,
          employees: filteredRows
        });
      }
    } catch {
      toast.error('Failed to load daily analytics');
    } finally {
      setAdminLoading(false);
    }
  }, [isAuthorizedAdmin, isHOD, user]);

  const handlePolicyDownloadClick = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const url = dash?.companySettings?.policy_handbook_url;
    const filename = dash?.companySettings?.policy_handbook_name || 'Policy_Manual.pdf';
    if (!url) return;

    try {
      toast.loading('Downloading policy document...', { id: 'policy-download' });
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Download complete!', { id: 'policy-download' });
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download policy manual. Opening in new tab...', { id: 'policy-download' });
      // Fallback: open in new tab if blob fetch fails
      window.open(url, '_blank');
    }
  };

  const handlePolicyUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }

    const formData = new FormData();
    formData.append('files', file);
    formData.append('bucketPath', 'policies');

    try {
      setLoading(true);
      const res = await masterAPI.uploadPolicyFile(formData);
      if (res && res.urls && res.urls[0]) {
        const currentSettings = await masterAPI.getCompanySettings();
        const updated = {
          ...currentSettings,
          policy_handbook_url: res.urls[0],
          policy_handbook_name: file.name
        };
        await masterAPI.updateCompanySettings(updated);
        
        load(month.getMonth() + 1, month.getFullYear());
        toast.success('Policy handbook uploaded and saved!');
      } else {
        toast.error('Failed to upload file');
      }
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePolicy = async () => {
    try {
      setLoading(true);
      const currentSettings = await masterAPI.getCompanySettings();
      const updated = {
        ...currentSettings,
        policy_handbook_url: null,
        policy_handbook_name: null
      };
      await masterAPI.updateCompanySettings(updated);
      
      load(month.getMonth() + 1, month.getFullYear());
      toast.success('Policy handbook removed!');
    } catch (err) {
      toast.error(err.message || 'Remove failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'daily' && (isAuthorizedAdmin || isHOD)) {
      loadAdminData(adminDate, adminCompanyId, adminEndDate);
    }
  }, [activeTab, adminDate, adminEndDate, adminCompanyId, isAuthorizedAdmin, isHOD, loadAdminData]);

  useEffect(() => {
    const h = () => load(month.getMonth() + 1, month.getFullYear());
    window.addEventListener('attendance-updated', h);
    window.addEventListener('leave-balance-updated', h);
    return () => {
      window.removeEventListener('attendance-updated', h);
      window.removeEventListener('leave-balance-updated', h);
    };
  }, [month, load]);

  /* Live timer */
  useEffect(() => {
    let iv;
    const ps = dash?.punchStatus;
    if (ps?.action === 'OUT' && ps.sessionStartTime) {
      const tick = () => {
        const total = Math.round((ps.previousSessionsHours || 0) * 3600) +
          Math.floor((Date.now() - new Date(ps.sessionStartTime)) / 1000);
        const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
        setLiveTimer(`${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`);
      };
      tick(); iv = setInterval(tick, 1000);
    } else { setLiveTimer(ps?.workHours || '0h 00m 00s'); }
    return () => clearInterval(iv);
  }, [dash]);

  /* -- Punch -- */
  const handlePunch = async () => {
    try {
      setPunching(true);
      let location = null;
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          })
        );
        location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch (e) {
        console.warn("Geolocation failed:", e);
      }
      const type = dash?.punchStatus?.action || 'IN';
      const r = await attendanceAPI.punch({ type, method: 'WEB', location });
      if (r?.message) {
        toast.success(r.message);
        if (r?.warning?.message) toast.info(r.warning.message);
        if (r?.info?.message) toast.info(r.info.message);
        load(month.getMonth() + 1, month.getFullYear());
        window.dispatchEvent(new CustomEvent('attendance-updated'));
      }
    } catch (e) { toast.error(e?.message || 'Action failed'); }
    finally { setPunching(false); }
  };

  /* -- Approve -- */
  const handleApprove = async (id, kind, status) => {
    setApproving(p => ({ ...p, [id]: true }));
    try {
      await attendanceAPI.approveRequest(kind === 'leave' ? 'leave' : 'regularization', id, status);
      toast.success(status === 'approved' ? 'Approved' : 'Rejected');
      load(month.getMonth() + 1, month.getFullYear());
    } catch { toast.error('Action failed'); }
    finally { setApproving(p => ({ ...p, [id]: false })); }
  };

  // const openAnalytics = (type) => {
  //   if (!isAuthorizedAdmin) return;
  //   setAnalyticsModal({
  //     isOpen: true,
  //     type,
  //     initialDate: adminDate || new Date().toISOString().split('T')[0]
  //   });
  // };

  /* -- Calendar -- */
  const getCalDays = () => {
    const y = month.getFullYear(), mo = month.getMonth();
    const fd = new Date(y, mo, 1).getDay(); // Sunday-based
    const total = new Date(y, mo + 1, 0).getDate();
    return [...Array(fd).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  };

  const getCalRecord = day => {
    if (!day || !dash?.calendar) return null;
    const y = month.getFullYear(), m = String(month.getMonth() + 1).padStart(2, '0');
    return dash.calendar[`${y}-${m}-${String(day).padStart(2, '0')}`] || null;
  };

  /* -- Open Apply Leave Modal -- */
  const openApplyLeaveModal = (day) => {
    if (!day) return;
    const selectedDate = new Date(month.getFullYear(), month.getMonth(), day);
    const formatted = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    setLeaveModalDate(formatted);
    setShowApplyLeaveModal(true);
  };

  const handleApplyLeaveSuccess = () => {
    load(month.getMonth() + 1, month.getFullYear());
  };

  /* -- Team calendar -- */
  const getWeekDays = (off = 0) => {
    const today = new Date(), dow = today.getDay(), diff = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(today); mon.setDate(today.getDate() + diff + off * 7);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
  };
  const weekDays = getWeekDays(weekOff);
  const todayStr = new Date().toDateString();

  /* -- Loading -- */
  if (loading && !dash) return (
    <div className="db-loading"><div className="db-spin" /><p>Loading...</p></div>
  );

  /* -- Derived -- */
  const ps = dash?.punchStatus;
  const ms = dash?.monthStats;
  const isIn = ps?.action === 'OUT';
  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : (user?.name || 'there');
  const monthName = month.toLocaleString('default', { month: 'long', year: 'numeric' });

  const showMiss = !ps?.lastOut && ps?.firstIn && !isToday(ps?.date);

  /* Management data */
  const stats = mgmtData?.stats || mgmtData?.summary || dash?.mgmtSnapshot || {};
  // If admin has applied filters and we've loaded adminData, prefer those stats
  const derivedStats = adminData?.stats || stats;
  const visibleActiveTotal = derivedStats.total || derivedStats.totalEmployees || 0;
  const showManagerTiles = isHOD || isAuthorizedAdmin;
  const pendingLeaves = mgmtData?.pendingLeaves || [];
  const pendingRegs = mgmtData?.pendingRegularization || [];
  const teamCalendar = mgmtData?.teamCalendar || mgmtData?.teamAvailability || [];
  const absentList = mgmtData?.absentToday || mgmtData?.absent || [];
  const lateList = mgmtData?.lateToday || mgmtData?.late || [];
  const onLeaveList = mgmtData?.onLeaveToday || [];

  const allPending = [
    ...pendingLeaves.map(r => ({ ...r, _kind: 'leave' })),
    ...pendingRegs.map(r => ({ ...r, _kind: 'reg' })),
  ];

  const upcomingHolidays = (dash?.upcomingHolidays || []).slice(0, 4);

  /* -- Role-aware stat tiles -- */
  const calendarArray = Object.values(dash?.calendar || {});
  const myLateCount = calendarArray.filter(rec => rec?.isLate || rec?.status === 'late').length;
  const myAbsentCount = calendarArray.filter(rec => rec?.status === 'absent').length;
  const workingDays = calendarArray.filter(
    rec => rec && !['weekly_off', 'holiday'].includes(rec.status)
  ).length;

  const personalTiles = [
    { cls: 'green', val: ms?.present ?? 0, lbl: 'Days Present', sub: `of ${workingDays || ms?.workingDays || 0} working days` },
    { cls: 'red', val: myAbsentCount || ms?.absent || 0, lbl: 'Absent Days', sub: 'unexcused absences' },
    { cls: 'blue', val: ms?.leaves ?? 0, lbl: 'Leaves Taken', sub: 'approved leaves' },
    { cls: 'amber', val: myLateCount || ms?.late || 0, lbl: 'Late Arrivals', sub: 'late punch-ins this month' },
  ];

  const managerTiles = [
    { cls: 'green', val: derivedStats.present ?? 0, lbl: 'Present Today', sub: `of ${visibleActiveTotal || '—'} active users, including late arrivals`, type: 'present' },
    { cls: 'red', val: derivedStats.absent ?? 0, lbl: 'Absent Today', sub: 'unexcused absences', type: 'absent' },
    { cls: 'blue', val: derivedStats.onLeave ?? derivedStats.onLeaveCount ?? 0, lbl: 'On Leave', sub: 'approved leaves', type: 'leave' },
    { cls: 'amber', val: derivedStats.late ?? 0, lbl: 'Late Arrivals', sub: 'still counted in Present', type: 'late' },
  ];

  const openAnalytics = (type, date) => {
    // default to adminDate when opening analytics so modal matches current filters
    const initDate = date || adminDate || new Date().toISOString().split('T')[0];
    setAnalyticsModal({
      isOpen: true,
      type,
      initialDate: initDate
    });
  };

  /* -- Quick actions -- */
  const hodActions = [
    { icon: <FiCheckSquare size={14} />, lbl: 'Leave Approvals', sub: `${pendingLeaves.length} pending`, path: '/attendance/hod/leave-approval', count: pendingLeaves.length },
    { icon: <FiFileText size={14} />, lbl: 'Regularizations', sub: `${pendingRegs.length} pending`, path: '/attendance/admin/employee/all', count: pendingRegs.length },
    { icon: <FiActivity size={14} />, lbl: 'Team Report', sub: 'Attendance & analytics', path: '/attendance/hod/report', count: 0 },
    { icon: <FiCalendar size={14} />, lbl: 'Apply My Leave', sub: 'Submit a leave request', path: '/attendance/leave', count: 0 },
  ];

  const adminActions = [
    { icon: <FiActivity size={14} />, lbl: 'Attendance Report', sub: 'Company-wide records', path: '/attendance/admin/attendance' },
    { icon: <FiUsers size={14} />, lbl: 'All User Attendance', sub: 'View team assignments & profiles', path: '/attendance/teams' },
    { icon: <FiCalendar size={14} />, lbl: 'Manage Holidays', sub: 'Add or edit holidays', path: '/attendance/admin/holidays' },
    { icon: <FiClock size={14} />, lbl: 'Shift Management', sub: 'Manage timings & rules', path: '/attendance/admin/shifts' },
    { icon: <FiBookOpen size={14} />, lbl: 'Leave Policies', sub: 'Create & control rules', path: '/attendance/admin/leave-policies' },
  ];

  const employeeActions = [
    { icon: <FiFileText size={14} />, lbl: 'Apply Leave', sub: 'Submit a leave request', path: '/attendance/leave', count: 0 },
    { icon: <FiActivity size={14} />, lbl: 'My Attendance', sub: 'View full punch history', path: '/attendance/my-attendance', count: 0 },
    { icon: <FiCalendar size={14} />, lbl: 'Holiday Calendar', sub: 'View upcoming holidays', path: '/attendance/holiday-calendar', count: 0 },
  ];

  return (
    <div className="db">

      {/* -- HERO -- */}
      <div className="db-hero">
        <div className="db-hero-inner">
          <div>
            <h1>{`${greeting()}, ${displayName}`}</h1>
            <p>{new Date().toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* -- STAT TILES -- */}
      <div className="db-tiles-wrap">

        <div className="db-tiles">
          {(activeTab === 'calendar' ? personalTiles : managerTiles).map((t, i) => (
            <div
              key={i}
              className={`tile ${t.cls} ${activeTab !== 'calendar' && showManagerTiles && (isAuthorizedAdmin || isHOD) && ['present', 'absent', 'leave', 'late'].includes(t.type) ? 'clickable' : ''}`}
              onClick={() => activeTab !== 'calendar' && showManagerTiles && (isAuthorizedAdmin || isHOD) && ['present', 'absent', 'leave', 'late'].includes(t.type) && openAnalytics(t.type)}
            >
              <div className="tile-val">{t.val}</div>
              <div className="tile-lbl">{t.lbl}</div>
              <div className="tile-sub">{t.sub}</div>
            </div>
          ))}
        </div>

        {(isAuthorizedAdmin || isHOD) && (
          <div className="db-main-tabs">
            <button
              className={`db-main-tab ${activeTab === 'calendar' ? 'active' : ''}`}
              onClick={() => setActiveTab('calendar')}
            >
              <FiCalendar /> My Dashboard
            </button>
            <button
              className={`db-main-tab ${activeTab === 'daily' ? 'active' : ''}`}
              onClick={() => setActiveTab('daily')}
            >
              <FiActivity /> Daily Summary
            </button>
            <button
              className={`db-main-tab ${activeTab === 'monthly' ? 'active' : ''}`}
              onClick={() => setActiveTab('monthly')}
            >
              <FiList /> Monthly Summary
            </button>
          </div>
        )}
      </div>

      {/* -- BODY -- */}
      <div className={`db-body ${activeTab !== 'calendar' ? 'full-width' : ''}`}>

        {/* -- LEFT / MAIN -- */}
        {activeTab === 'calendar' ? (
          <>
            <div className="db-main">

              <div className={`db-upper-row ${(isAuthorizedAdmin || isHOD) ? 'has-pending' : ''}`}>
                {/* Personal punch card */}
                <div className="ph-card" style={{ height: '100%' }}>
                  <div className="ph-top">
                    <div>
                      <div className={`ph-status ${isIn ? 'on' : 'off'}`}>
                        <span className="ph-dot" />
                        <span className="ph-status-text">{isIn ? 'Clocked in' : 'Not clocked in'}</span>
                      </div>
                      <div className="ph-greeting">{ps?.shiftName || 'General Shift'}</div>
                      {ps?.shiftTime && <div className="ph-shift">{ps.shiftTime}</div>}
                      <div className="ph-timer">{liveTimer}</div>
                      <div className="ph-timer-lbl">Time logged today</div>
                      <div className="ph-meta">
                        <div className="ph-meta-item">
                          <span className="ph-meta-key">Punched In</span>
                          <span className="ph-meta-val">{ps?.firstIn ? fmtTime(ps.firstIn) : '-'}</span>
                        </div>
                        <div className="ph-meta-item">
                          <span className="ph-meta-key">Punched Out</span>
                          <span className={`ph-meta-val ${showMiss ? 'red' : ''}`}>
                            {showMiss ? 'Miss' : ps?.lastOut ? fmtTime(ps.lastOut) : '-'}
                          </span>
                        </div>
                        <div className="ph-meta-item">
                          <span className="ph-meta-key">Status</span>
                          <span className={`ph-meta-val ${isIn ? 'green' : ''}`}>{ps?.status || '-'}</span>
                        </div>
                        {ps?.isLate && (
                          <div className="ph-meta-item">
                            <span className="ph-meta-key">Late By</span>
                            <span className="ph-meta-val amber">{minutesToHours(ps.lateByMinutes)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* -- Pending Approvals -- */}
                {(isAuthorizedAdmin || isHOD) && (
                  <div className="card pending-approvals-card" style={{ margin: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div className="card-head" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span className="card-title">Pending Approvals</span>
                        {allPending.length > 0
                          ? <span className="card-badge badge-amber">{allPending.length}</span>
                          : <span className="card-badge badge-green">All clear</span>
                        }
                      </div>
                      <div className="db-tabs-mini" style={{ width: '100%' }}>
                        <button
                          className={`db-tab-mini ${pendingTab === 'leave' ? 'active' : ''}`}
                          onClick={() => setPendingTab('leave')}
                          style={{ flex: 1, justifyContent: 'center' }}
                        >
                          Leaves {allPending.filter(r => r._kind === 'leave').length > 0 && <span className="tab-count-amber">{allPending.filter(r => r._kind === 'leave').length}</span>}
                        </button>
                        <button
                          className={`db-tab-mini ${pendingTab === 'reg' ? 'active' : ''}`}
                          onClick={() => setPendingTab('reg')}
                          style={{ flex: 1, justifyContent: 'center' }}
                        >
                          Corrections {allPending.filter(r => r._kind === 'reg').length > 0 && <span className="tab-count-amber">{allPending.filter(r => r._kind === 'reg').length}</span>}
                        </button>
                      </div>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                      {allPending.filter(r => r._kind === pendingTab).length === 0 ? (
                        <div className="empty-msg">Nothing pending right now! ✨</div>
                      ) : allPending.filter(r => r._kind === pendingTab).slice(0, 4).map((req, i) => (
                        <div
                          key={i}
                          className="approval-row"
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            if (req._kind === 'reg') {
                              if (req.employeeUsername) {
                                navigate(`/attendance/teams/${req.company_id || 'all'}/user/${req.employeeUsername}/performance`);
                              } else {
                                navigate(isHOD ? "/attendance/hod/report" : "/attendance/admin/attendance", { state: { openUserId: req.employeeId || req.employee_id } });
                              }
                            } else {
                              navigate(isHOD ? "/attendance/hod/leave-approval" : "/attendance/admin/leave-approval");
                            }
                          }}
                        >
                          <div className="approval-left">
                            <div className="approval-av">{(req.employeeName || "?")[0]}</div>
                            <div className="approval-body">
                              <div className="approval-name">
                                {req.employeeName}{req.teamName ? ` - ${req.teamName}` : ''}
                              </div>
                              <div className="approval-meta">
                                {req._kind === 'leave' ? (
                                  <>
                                    {formatLeaveDates(req.fromDate || req.from_date, req.toDate || req.to_date)}
                                    {req.totalDays ? ` • ${isHalfDayRequest(req) ? 'Half Day' : `${req.totalDays} Day${req.totalDays > 1 ? 's' : ''}`}` : ''}
                                    {` • ${req.leaveType || 'Leave'}`}
                                  </>
                                ) : (
                                  <>
                                    {req.date ? new Date(req.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : 'Regularization'}
                                    {` • Correction`}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {req.canAct && (
                            <div className="approval-actions" onClick={e => e.stopPropagation()}>
                              <button
                                className="act approve"
                                disabled={approving[req.id]}
                                onClick={() => handleApprove(req.id, req._kind, "approved")}
                              >
                                <FiCheck size={10} /> Approve
                              </button>
                              <button
                                className="act reject"
                                disabled={approving[req.id]}
                                onClick={() => handleApprove(req.id, req._kind, "rejected")}
                              >
                                <FiX size={10} /> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {allPending.filter(r => r._kind === pendingTab).length > 4 && (
                      <div style={{ padding: ".75rem 1.25rem", borderTop: "1px solid var(--border)" }}>
                        <button className="card-link" onClick={() => {
                          if (pendingTab === 'reg') {
                            navigate(isHOD ? "/attendance/hod/report" : "/attendance/admin/attendance");
                          } else {
                            navigate(isHOD ? "/attendance/hod/leave-approval" : "/attendance/admin/leave-approval");
                          }
                        }}>
                          +{allPending.filter(r => r._kind === pendingTab).length - 4} more <FiArrowRight size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>


              {/* -- Attendance calendar – ALL ROLES -- */}
              <div className="card cal-card">
                <div className="card-head">
                  <span className="card-title">Attendance Calendar</span>
                  <button className="card-link" onClick={() => navigate('/attendance/my-attendance')}>
                    Full report <FiArrowRight size={12} />
                  </button>
                </div>
                <div className="cal-nav">
                  <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
                  <span>{monthName}</span>
                  <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
                </div>
                <div className="cal-grid">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="cal-day-header">{d}</div>
                  ))}
                  {getCalDays().map((day, i) => {
                    const rec = getCalRecord(day);
                    const isTd = day && month.getMonth() === new Date().getMonth() && month.getFullYear() === new Date().getFullYear() && day === new Date().getDate();
                    let cls = calClass(rec, isTd, dash?.punchStatus);

                    if (day && !rec) {
                      const dObj = new Date(month.getFullYear(), month.getMonth(), day);
                      const dow = dObj.getDay();
                      const offDays = dash?.punchStatus?.weeklyOffDays || [0, 6];
                      if (offDays.includes(dow)) {
                        cls = 'weekly_off';
                      } else if (dObj <= new Date()) {
                        cls = 'absent';
                      }
                    }

                    let statusLabel = CAL_LABELS[cls] || '';
                    let leaveLabel = '';
                    let isLeavePending = false;

                    if (cls === 'half_day') {
                      const session = rec?.half_day_session || '';
                      statusLabel = session.toLowerCase().includes('first') ? '1st Half' : (session.toLowerCase().includes('second') ? '2nd Half' : '½ Day');
                    }

                    if (rec?.leaveType) {
                      const badge = formatLeaveBadge(rec.leaveType);
                      const isApproved = rec.leaveStatus === 'approved';
                      const isPending = rec.leaveStatus && rec.leaveStatus !== 'approved' && !['rejected', 'cancelled', 'withdrawn'].includes(rec.leaveStatus);
                      isLeavePending = isPending;
                      const statusTxt = isApproved ? 'Approved' : (isPending ? 'Pending' : 'Applied');

                      if (cls === 'half_day') {
                        statusLabel = `${statusLabel} (${badge})`;
                        leaveLabel = statusTxt;
                      } else {
                        leaveLabel = `${badge} ${statusTxt}`;
                      }
                    }

                    // Check if this day has a correction request
                    const dayKey = day ? `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
                    const hasCorrectionDot = dayKey && correctionDatesSet.has(dayKey);

                    return (
                      <div
                        key={i}
                        className={`cal-day-v2 ${cls} ${isTd ? 'today' : ''} ${!day ? 'empty' : ''}`}
                        onClick={() => openApplyLeaveModal(day)}
                      >
                        <span className="cal-day-num">{day}</span>
                        {day && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', alignItems: 'center' }}>
                            {statusLabel && <div className={`cal-status-badge ${cls}`}>{statusLabel}</div>}
                            {leaveLabel && <div className={`cal-status-badge ${isLeavePending ? 'pending_leave' : 'leave'}`}>{leaveLabel}</div>}
                          </div>
                        )}
                        {hasCorrectionDot && (
                          <div className="cal-correction-dot" title="Correction request submitted" />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="cal-legend">
                  {[
                    ['Present', '#36b60f'],
                    ['Absent', '#c02e2e'],
                    ['Half-Day', '#ff9101'],
                    ['Leave', '#1e40af'],
                    ['Weekly Off', '#475569'],
                    ['Holiday', '#86198f'],
                    ['Missed Punch', '#f97316']
                  ].map(([l, c]) => (
                    <span key={l}><span className="cal-ldot" style={{ background: c }} />{l}</span>
                  ))}
                  <span><span className="cal-correction-legend-dot" />Correction</span>
                </div>
              </div>
            </div>

            {/* -- RIGHT SIDEBAR -- */}
            <div className="db-side">

              {/* Quick actions – for allowed admins and HODs */}
              {(isAuthorizedAdmin || isHOD) && (
                <div className="card">
                  <div className="card-head">
                    <span className="card-title">Quick Actions</span>
                  </div>
                  {(isAdmin ? adminActions : hodActions).map((item, i) => (
                    <button key={i} className="qa-item" onClick={() => navigate(item.path)}>
                      <div className="qa-icon">{item.icon}</div>
                      <div className="qa-text">
                        <div className="qa-lbl">{item.lbl}</div>
                        {item.sub && <div className="qa-sub">{item.sub}</div>}
                      </div>
                      {item.count > 0 && <span className="qa-count">{item.count}</span>}
                      <FiChevronRight className="qa-arrow" size={13} />
                    </button>
                  ))}
                </div>
              )}

              {/* Leave balance – all roles */}
              <div className="card">
                <div className="card-head">
                  <span className="card-title">Leave Balance</span>
                  <button className="card-link" onClick={() => navigate("/attendance/leave")}>
                    Apply leave <FiArrowRight size={12} />
                  </button>
                </div>
                {balances.length === 0
                  ? <div className="empty-msg">No leave data</div>
                  : balances.slice(0, 5).map((b, i) => {
                    const available = b.available || b.balance || 0;
                    const used = b.used ?? 0;
                    const total = b.total || b.annual_quota || 1;
                    const pct = Math.min(100, (used / total) * 100);
                    const icon = getLeaveIcon(b.name || b.leave_type || "");
                    const countCls = available === 0 ? "zero" : available <= 2 ? "low" : "";
                    return (
                      <div key={i} className="leave-row">
                        <span className="leave-emoji">{icon.emoji}</span>
                        <div className="leave-info">
                          <div className="leave-name">{b.name || b.leave_type}</div>
                          <div className="leave-sub">{used} used{b.pending > 0 ? ` • ${b.pending} pending` : ""}</div>
                          <div className="leave-bar">
                            <div className="leave-fill" style={{ width: `${pct}%`, background: icon.color }} />
                          </div>
                        </div>
                        <div className={`leave-count ${countCls}`}>
                          {available}
                        </div>
                      </div>
                    );
                  })
                }
              </div>

              {/* Upcoming holidays */}
              {!isAuthorizedAdmin && (
                <div className="card">
                  <div className="card-head" style={{ cursor: 'pointer' }} onClick={() => navigate('/attendance/holiday-calendar')}>
                    <span className="card-title">Upcoming Holidays</span>
                    {isAdmin
                      ? <button className="card-link" onClick={(e) => { e.stopPropagation(); navigate("/attendance/admin/holidays"); }}>
                        Manage <FiArrowRight size={12} />
                      </button>
                      : <button className="card-link" onClick={(e) => { e.stopPropagation(); navigate('/attendance/holiday-calendar'); }}>
                        View all <FiArrowRight size={12} />
                      </button>
                    }
                  </div>
                  {(isAdmin ? holidays : upcomingHolidays).length === 0 ? (
                    <div className="empty-msg" style={{ cursor: 'pointer' }} onClick={() => navigate('/attendance/holiday-calendar')}>No upcoming holidays</div>
                  ) : (isAdmin ? holidays : upcomingHolidays).map((h, i) => {
                    const d = new Date(h.holiday_date || h.date);
                    const name = h.holiday_name || h.name || "";
                    const type = h.holiday_type || h.type || "national";
                    return (
                      <div key={i} className="upcoming-row" style={{ cursor: 'pointer' }} onClick={() => navigate('/attendance/holiday-calendar')}>
                        <div className="upcoming-badge">
                          <span className="upcoming-month">{d.toLocaleString("default", { month: "short" })}</span>
                          <span className="upcoming-day">{d.getDate()}</span>
                        </div>
                        <div>
                          <div className="upcoming-name">{getHolidayEmoji(name, type)} {name}</div>
                          <div className="upcoming-sub">{d.toLocaleString("default", { weekday: "long" })}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Company Policy Manual - RABS Only (Compact Sidebar Row) */}
              {(() => {
                const companyName = dash?.companySettings?.company_name || user?.company_name || '';
                const isRabs = String(companyName).match(/RABS/i);
                const canSeePolicy = isAuthorizedAdmin || isAdmin || isHOD || isHR;
                if (!isRabs || !canSeePolicy) return null;

                const hasFile = !!dash?.companySettings?.policy_handbook_url;

                return (
                  <div className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 1rem 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FiBookOpen size={15} style={{ color: '#3b82f6' }} />
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>Policy Manual</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '600' }}>
                      {hasFile ? (
                        <>
                          <a 
                            href={dash.companySettings.policy_handbook_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{ color: '#3b82f6', textDecoration: 'none' }}
                          >
                            View
                          </a>
                          <span style={{ color: '#cbd5e1' }}>|</span>
                          <button 
                            onClick={handlePolicyDownloadClick}
                            style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, fontWeight: '600', fontSize: '12px' }}
                          >
                            Download
                          </button>
                          {canManagePolicy && (
                            <>
                              <span style={{ color: '#cbd5e1' }}>|</span>
                              <button 
                                onClick={() => setShowPolicyModal(true)}
                                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, fontWeight: '600' }}
                              >
                                Manage
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {canManagePolicy ? (
                            <>
                              <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 'normal' }}>Please upload manual</span>
                              <span style={{ color: '#cbd5e1' }}>|</span>
                              <button 
                                onClick={() => setShowPolicyModal(true)}
                                style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, fontWeight: '600' }}
                              >
                                Upload
                              </button>
                            </>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 'normal' }}>Not uploaded yet</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </>
        ) : activeTab === "daily" ? (
          <div className="db-full-page">
            <AdminAnalyticsTab
              data={adminData}
              loading={adminLoading}
              currentDate={adminDate}
              endDate={adminEndDate}
              onDateChange={setAdminDate}
              onEndDateChange={setAdminEndDate}
              companies={companies}
              selectedCompanyId={adminCompanyId}
              onCompanyChange={setAdminCompanyId}
              isHOD={isHOD && !isAuthorizedAdmin}
              isAdmin={isAdmin}
            />
          </div>
        ) : activeTab === "monthly" ? (
          <div className="db-full-page">
            <AdminMonthlySummaryTab
              currentMonth={adminMonth}
              onMonthChange={setAdminMonth}
              companies={companies}
              selectedCompanyId={adminCompanyId}
              onCompanyChange={setAdminCompanyId}
            />
          </div>
        ) : null}
      </div>


      {/* -- Apply Leave Modal -- */}
      <ApplyLeaveModal
        isOpen={showApplyLeaveModal}
        onClose={() => setShowApplyLeaveModal(false)}
        onSuccess={handleApplyLeaveSuccess}
        balances={balances}
        initialDate={leaveModalDate}
        employeeId={user?._id || user?.id}
      />

      {/* -- Attendance Analytics Modal -- */}
      <AttendanceAnalyticsModal
        isOpen={analyticsModal.isOpen}
        onClose={() => setAnalyticsModal({ ...analyticsModal, isOpen: false })}
        type={analyticsModal.type}
        initialDate={analyticsModal.initialDate}
        companyId={adminCompanyId}
        isHOD={isHOD && !isAuthorizedAdmin}
        isAdmin={isAdmin}
      />

      {/* -- Manage Policy Modal -- */}
      {showPolicyModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={() => setShowPolicyModal(false)}
        >
          <div 
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '400px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>Manage Policy Handbook</h3>
              <button 
                onClick={() => setShowPolicyModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                <FiX size={18} />
              </button>
            </div>
            
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0', lineHeight: '1.5' }}>
              Upload a custom PDF policy manual to override the default system-generated RABS Handbook.
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
              {dash?.companySettings?.policy_handbook_url ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '24px' }}>📄</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {dash.companySettings.policy_handbook_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px', fontWeight: '500' }}>
                        ✓ Custom PDF Active
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <a 
                      href={dash.companySettings.policy_handbook_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="btn btn-secondary text-center" 
                      style={{ flex: 1, padding: '6px 12px', fontSize: '12px', fontWeight: '600', textDecoration: 'none', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', display: 'inline-block' }}
                    >
                      View Current
                    </a>
                    <button 
                      className="btn btn-danger" 
                      style={{ flex: 1, padding: '6px 12px', fontSize: '12px', fontWeight: '600', color: '#ef4444', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer' }}
                      onClick={async () => {
                        await handleRemovePolicy();
                        setShowPolicyModal(false);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
                    Using system-generated RABS Handbook.
                  </div>
                  <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={async (e) => {
                      await handlePolicyUpload(e);
                      setShowPolicyModal(false);
                    }} 
                    style={{ display: 'none' }} 
                    id="modal-policy-file-input" 
                  />
                  <label 
                    htmlFor="modal-policy-file-input" 
                    style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px 16px', 
                      background: '#0f172a', 
                      color: '#ffffff', 
                      borderRadius: '6px', 
                      fontWeight: '600', 
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Upload PDF Handbook
                  </label>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowPolicyModal(false)}
                style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: '#475569' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
