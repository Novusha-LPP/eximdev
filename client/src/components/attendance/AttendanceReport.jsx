import React, { useState, useEffect, useMemo } from 'react';
import {
    FiX, FiLogIn, FiLogOut, FiEdit, FiFileText, FiUsers, FiAlertTriangle,
    FiUser, FiBriefcase, FiActivity, FiArrowRight, FiRefreshCw, FiDownload, FiCalendar, FiSearch, FiCheckCircle, FiClock, FiList, FiGrid,
    FiChevronDown, FiChevronRight
} from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import attendanceAPI from '../../api/attendance/attendance.api';
import masterAPI from '../../api/attendance/master.api';
import { formatAttendanceDate, formatTime12Hr, minutesToHours, formatDate, getAttendanceDateKey, ATTENDANCE_TIME_ZONE } from './utils/helpers';
import moment from 'moment';
import toast from 'react-hot-toast';
import { UserContext } from '../../contexts/UserContext';
import AdminApplyLeaveModal from './admin/AdminApplyLeaveModal';
import './admin/EmployeeProfilePerformance.css';
import './AttendanceReport.css';

const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
const formatSession = (s) => (s === 'first_half' ? '1st Half' : '2nd Half');
// NOTE: getAttendanceDateKey is now imported from helpers.js (timezone-aware)
const getAttendanceDateLabel = (value) => formatAttendanceDate(value, 'dd MMM', ATTENDANCE_TIME_ZONE);

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

const getCorrectionStatusMeta = (request = {}) => {
    const source = String(request?.resolution_source || '').toLowerCase();
    const status = String(request?.status || 'pending').toLowerCase();

    if (request?.is_resolved || source === 'admin_manual_correction' || source === 'hod_manual_correction') {
        return { label: 'Resolved', className: 'resolved' };
    }
    if (status === 'approved') {
        return { label: 'Approved', className: 'approved' };
    }
    if (status === 'rejected') {
        return { label: 'Rejected', className: 'rejected' };
    }
    return { label: 'Pending', className: 'pending' };
};

const roundLeave = (value) => Math.round(Number(value || 0) * 10) / 10;

const formatHoursMinutes = (val, fallback = '—') => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed || trimmed === '—' || trimmed === '-') return fallback;
        if (trimmed.includes('h') && trimmed.includes('m')) return trimmed;
        if (trimmed.endsWith('h') && !trimmed.includes('m')) {
            const parsedNum = parseFloat(trimmed);
            if (!isNaN(parsedNum)) {
                const totalMinutes = Math.round(parsedNum * 60);
                const h = Math.floor(totalMinutes / 60);
                const m = totalMinutes % 60;
                return `${h}h ${m}m`;
            }
        }
        const num = parseFloat(trimmed);
        if (isNaN(num)) return trimmed;
        val = num;
    }
    const num = Number(val);
    if (isNaN(num)) return fallback;
    if (num === 0) return '0h 0m';
    if (num < 0) return fallback;
    const totalMinutes = Math.round(num * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
};

const isPrivilegeLeave = (leaveType = '') => {
    const type = String(leaveType || '').toLowerCase();
    return type === 'pl' || type.includes('privilege') || type.includes('earned') || type === 'el';
};

const isLwpLeave = (leaveType = '') => {
    const type = String(leaveType || '').toLowerCase();
    return type === 'lwp' || type.includes('without pay') || type.includes('unpaid') || type === 'lop';
};

const isHalfDayLeave = (day) => {
    if (day?.is_half_day_leave || day?.isHalfDayLeave) return true;
    const s = String(day?.status || '').toLowerCase();
    const lt = String(day?.leaveType || day?.leave_type || day?.leaveReason || '').trim();
    let workHours = 0;
    if (day?.total_work_hours !== null && day?.total_work_hours !== undefined && Number(day.total_work_hours) > 0) {
        workHours = Number(day.total_work_hours);
    } else if (day?.first_in && day?.last_out) {
        workHours = moment(day.last_out).diff(moment(day.first_in), 'hours', true);
    }
    if (day?.is_half_day && (lt || s === 'leave' || workHours < 4)) return true;
    if (s === 'half_day' && (lt || workHours < 4)) return true;
    return false;
};

const getActualHalfDays = (employee) => {
    if (!Array.isArray(employee?.history) || employee.history.length === 0) return Number(employee?.halfDay || 0);

    return employee.history.filter((day) => {
        const s = String(day?.status || '').toLowerCase();
        if (s === 'none' || s === '' || s === 'future') return false;
        if (s === 'weekly_off' || s === 'weekoff' || s === 'off' || s === 'holiday' || s === 'leave') return false;
        if (isHalfDayLeave(day)) return false;

        let workHours = 0;
        if (day?.total_work_hours !== null && day?.total_work_hours !== undefined && Number(day.total_work_hours) > 0) {
            workHours = Number(day.total_work_hours);
        } else if (day?.first_in && day?.last_out) {
            workHours = moment(day.last_out).diff(moment(day.first_in), 'hours', true);
        }

        if ((s === 'present' || s === 'late' || s === 'present_late' || s === 'on_duty') && !day?.is_half_day && s !== 'half_day') return false;
        if (s === 'half_day' || day?.is_half_day) return true;

        if (workHours >= 8) return false;
        if (workHours >= 4) return true;
        return false;
    }).length;
};

const getPresentDaysForReport = (employee) => {
    const actualHalfDays = getActualHalfDays(employee);
    if (!Array.isArray(employee?.history) || employee.history.length === 0) {
        return roundLeave(Number(employee?.present || 0) + (actualHalfDays * 0.5));
    }
    const fullPresent = employee.history.filter((day) => {
        const s = String(day?.status || '').toLowerCase();
        if (s === 'none' || s === '' || s === 'future') return false;
        if (s === 'weekly_off' || s === 'weekoff' || s === 'off' || s === 'holiday' || s === 'leave') return false;
        if (isHalfDayLeave(day)) return false;

        let workHours = 0;
        if (day?.total_work_hours !== null && day?.total_work_hours !== undefined && Number(day.total_work_hours) > 0) {
            workHours = Number(day.total_work_hours);
        } else if (day?.first_in && day?.last_out) {
            workHours = moment(day.last_out).diff(moment(day.first_in), 'hours', true);
        }

        if ((s === 'present' || s === 'late' || s === 'present_late' || s === 'on_duty') && !day?.is_half_day && s !== 'half_day') return true;
        if (s === 'half_day' || day?.is_half_day) return false;
        if (workHours >= 8) return true;
        if (workHours >= 4) return false; // Half day
        return false;
    }).length;
    return roundLeave(fullPresent + (actualHalfDays * 0.5));
};

const getHalfDayLeaveCountForReport = (employee) => {
    if (!Array.isArray(employee?.history) || employee.history.length === 0) return 0;
    return employee.history.filter((day) => isHalfDayLeave(day)).length;
};

const getFullDayLeaveCountForReport = (employee) => {
    if (!Array.isArray(employee?.history) || employee.history.length === 0) return Number(employee?.leaves || 0);

    return employee.history.filter((day) => {
        const s = String(day?.status || '').toLowerCase();
        const isHalfLeave = isHalfDayLeave(day);
        return (s === 'leave' || s === 'pending_leave') && !isHalfLeave;
    }).length;
};

const getAbsentDaysForReport = (employee) => {
    const actualHalfDays = getActualHalfDays(employee);
    if (!Array.isArray(employee?.history) || employee.history.length === 0) {
        return roundLeave(Number(employee?.absent || 0) + (actualHalfDays * 0.5));
    }
    const fullAbsent = employee.history.filter((day) => {
        const s = String(day?.status || '').toLowerCase();
        const lt = String(day?.leaveType || day?.leave_type || day?.leaveReason || '').trim();
        const isHalfLeave = isHalfDayLeave(day);

        // If future date or status is 'none', it is NOT absent
        if (s === 'none' || s === '' || s === 'future') return false;
        if (day?.date && moment(day.date).isAfter(moment().endOf('day'))) return false;

        if (s === 'weekly_off' || s === 'weekoff' || s === 'off' || s === 'holiday') return false;
        if (s === 'leave' || s === 'pending_leave' || isHalfLeave || lt) return false;

        let workHours = 0;
        if (day?.total_work_hours !== null && day?.total_work_hours !== undefined && Number(day.total_work_hours) > 0) {
            workHours = Number(day.total_work_hours);
        } else if (day?.first_in && day?.last_out) {
            workHours = moment(day.last_out).diff(moment(day.first_in), 'hours', true);
        }

        if (workHours >= 4) return false;
        if (s === 'present' || s === 'late' || s === 'present_late' || s === 'half_day' || s === 'on_duty') return false;
        return s === 'absent' || (!s && workHours < 4);
    }).length;
    return roundLeave(fullAbsent + (actualHalfDays * 0.5));
};

const getWeekOffCount = (employee) => {
    if (!Array.isArray(employee?.history) || employee.history.length === 0) return Number(employee?.weekOff || 0);
    return employee.history.filter((d) => {
        const s = String(d?.status || '').toLowerCase();
        return s === 'weekly_off' || s === 'weekoff' || s === 'off';
    }).length;
};

const getHolidayCount = (employee) => {
    if (!Array.isArray(employee?.history) || employee.history.length === 0) return Number(employee?.holiday || 0);
    return employee.history.filter((d) => {
        const s = String(d?.status || '').toLowerCase();
        return s === 'holiday';
    }).length;
};

const getTotalWeekOffAndHoliday = (employee) => {
    return getWeekOffCount(employee) + getHolidayCount(employee);
};

const getLeaveCountForReport = (employee) => {
    const halfDayLeaves = getHalfDayLeaveCountForReport(employee);
    const fullDayLeaves = getFullDayLeaveCountForReport(employee);
    return roundLeave(fullDayLeaves + (halfDayLeaves * 0.5));
};

const calculateEmployeeLeaveBreakdown = (employee, reportMetricsById = null) => {
    const metrics = reportMetricsById ? (reportMetricsById.get(employee?.id || employee?._id) || {}) : employee;
    const openingBalance = roundLeave(Number(metrics?.opening_balance || employee?.opening_balance || 0));
    const completeLeaves = getLeaveCountForReport(employee);

    if (!Array.isArray(employee?.history) || employee.history.length === 0) {
        const plTaken = roundLeave(Math.min(openingBalance, completeLeaves));
        const lwpTaken = roundLeave(Math.max(0, completeLeaves - openingBalance));
        const availableBalance = roundLeave(Math.max(0, openingBalance - plTaken));
        return { openingBalance, plTaken, lwpTaken, availableBalance };
    }

    let explicitLwp = 0;
    let explicitPl = 0;

    employee.history.forEach((day) => {
        const s = String(day?.status || '').toLowerCase();
        const lt = String(day?.leaveType || day?.leave_type || day?.leaveReason || '').trim();
        const isHalfLeave = isHalfDayLeave(day);

        if (s === 'weekly_off' || s === 'weekoff' || s === 'off' || s === 'holiday') return;

        if (isHalfLeave || (s === 'half_day' && lt)) {
            if (isLwpLeave(lt)) {
                explicitLwp += 0.5;
            } else {
                explicitPl += 0.5;
            }
        } else if (s === 'leave' || s === 'pending_leave') {
            if (isLwpLeave(lt)) {
                explicitLwp += 1.0;
            } else {
                explicitPl += 1.0;
            }
        }
    });

    const plTaken = roundLeave(Math.min(openingBalance, explicitPl));
    const lwpTaken = roundLeave(explicitLwp + Math.max(0, explicitPl - openingBalance));
    const availableBalance = roundLeave(Math.max(0, openingBalance - plTaken));

    return { openingBalance, plTaken, lwpTaken, availableBalance };
};

const getTotalWorkingDays = (employee, reportMetricsById = null) => {
    const presentDays = getPresentDaysForReport(employee);
    const { plTaken } = calculateEmployeeLeaveBreakdown(employee, reportMetricsById);
    const holidayCount = getHolidayCount(employee);
    const weekOffCount = getWeekOffCount(employee);
    return roundLeave(presentDays + plTaken + holidayCount + weekOffCount);
};

const getCalendarStatusClass = (status = '') => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'weekly_off' || normalized === 'weekoff' || normalized === 'off') return 'weekly_off';
    if (normalized === 'present_late') return 'late';
    if (normalized === 'incomplete' || normalized === 'missed_punch') return 'incomplete';
    return normalized || 'none';
};

const getCalendarStatusBadge = (status = '') => {
    const normalized = String(status || '').toLowerCase();
    const map = {
        weekly_off: 'WO',
        weekoff: 'WO',
        off: 'WO',
        holiday: 'HD',
        leave: 'LV',
        half_day: 'HDY',
        late: 'L',
        present_late: 'L',
        absent: 'A',
        present: 'P',
        incomplete: 'MP',
        missed_punch: 'MP',
        pending_leave: 'LV'
    };
    return map[normalized] || '';
};

const StatusPill = ({ status, session, leaveType, leaveStatus }) => {
    const map = { 
        present: ['Present', 'present'], 
        absent: ['Absent', 'absent'], 
        leave: ['Leave', 'leave'], 
        pending_leave: ['Leave', 'pending-leave'],
        half_day: ['Half Day', 'half-day'], 
        weekly_off: ['Off', 'off'], 
        holiday: ['Holiday', 'holiday'],
        incomplete: ['Missed Punch', 'missed-punch'],
        missed_punch: ['Missed Punch', 'missed-punch']
    };
    let [label, cls] = map[status] || [status, 'default'];

    if (leaveType) {
        const badge = formatLeaveBadge(leaveType);
        const isApproved = leaveStatus === 'approved';
        const isPending = leaveStatus && leaveStatus !== 'approved' && !['rejected', 'cancelled', 'withdrawn'].includes(leaveStatus);
        const statusTxt = isApproved ? 'Approved' : (isPending ? 'Pending' : 'Applied');
        
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
        <span className={`ar-status-pill ar-pill-${cls}`}>
            {label}
        </span>
    );
};

const RenderHeatmap = ({ history, startDate, endDate }) => {
    // Parse dates in Asia/Kolkata timezone instead of UTC to match attendance data timezone
    const start = moment(startDate);
    const end = moment(endDate);
    const diff = Math.min(end.diff(start, 'days') + 1, 31);
    const dots = [];
    for (let i = 0; i < diff; i++) {
        const d = start.clone().add(i, 'days').format('YYYY-MM-DD');
        const h = history.find(hh => hh.date === d);
        dots.push({ status: (h?.status || 'none').toLowerCase(), date: d });
    }
    return (
        <div className="ar-heatmap">
            {dots.map((d, i) => (
                <div
                    key={i}
                    className={`ar-h-dot ar-h-${d.status}`}
                    title={`${moment(d.date).format('DD MMM')}: ${d.status === 'none' ? 'No Record' : d.status}`}
                />
            ))}
        </div>
    );
};

const DailySummaryView = ({ groups, startDate, endDate }) => {
    const [collapsed, setCollapsed] = useState({});

    const toggleCollapse = (title) => {
        setCollapsed(prev => ({ ...prev, [title]: !prev[title] }));
    };

    return (
        <div className="ar-daily-summary-container" style={{ padding: '20px' }}>
            {Object.entries(groups).map(([sectionTitle, employees]) => {
                if (employees.length === 0) return null;
                const isCollapsed = collapsed[sectionTitle];
                const sectionColorObj = {
                    'Present': '#10b981', 'Late': '#f59e0b', 'Half Day': '#3b82f6',
                    'Absent': '#ef4444', 'Leave': '#8b5cf6', 'Missed Punch': '#d97706', 'Other': '#64748b'
                };
                const bgColors = {
                    'Present': '#ecfdf5', 'Late': '#fffbeb', 'Half Day': '#eff6ff',
                    'Absent': '#fef2f2', 'Leave': '#f5f3ff', 'Missed Punch': '#fff7ed', 'Other': '#f8fafc'
                };
                const color = sectionColorObj[sectionTitle] || '#64748b';
                const bg = bgColors[sectionTitle] || '#f8fafc';
                
                return (
                    <div key={sectionTitle} className="ar-summary-group" style={{ marginBottom: '24px' }}>
                        <div 
                            className="ar-summary-header" 
                            onClick={() => toggleCollapse(sectionTitle)}
                            style={{ 
                                backgroundColor: bg, 
                                borderLeft: `4px solid ${color}`, 
                                padding: '10px 16px', 
                                borderRadius: '4px', 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                marginBottom: isCollapsed ? '0' : '12px',
                                cursor: 'pointer',
                                userSelect: 'none',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                {isCollapsed ? <FiChevronRight style={{ color, marginRight: '8px' }} /> : <FiChevronDown style={{ color, marginRight: '8px' }} />}
                                <span style={{ color: color, fontWeight: 700, letterSpacing: '0.5px' }}>{sectionTitle.toUpperCase()}</span>
                            </div>
                            <span className="ar-summary-count" style={{ backgroundColor: color, color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{employees.length}</span>
                        </div>
                        
                        {!isCollapsed && (
                            <div className="ar-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
                                {employees.map(e => (
                                    <div 
                                        key={e.id} 
                                        className="ar-summary-item" 
                                        style={{ 
                                            backgroundColor: '#ffffff', 
                                            border: '1px solid #e2e8f0', 
                                            padding: '14px 16px', 
                                            borderRadius: '12px', 
                                            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px'
                                        }}
                                    >
                                        <div className="ar-si-name" style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</div>
                                        <div className="ar-si-meta" style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                                            <FiBriefcase size={11} style={{ flexShrink: 0, color: '#94a3b8' }}/> 
                                            <span className="ar-si-co" title={e.company_name} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.company_name || '—'}</span>
                                        </div>
                                        <div className="ar-si-stats" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '4px' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }} title="Present Count">P: {e.present}</span>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#fef2f2', color: '#b91c1c', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }} title="Absent Count">A: {e.absent}</span>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#fffbeb', color: '#b45309', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }} title="Late Count">L: {e.late}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
            {Object.values(groups).every(arr => arr.length === 0) && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    No data found for the selected range.
                </div>
            )}
        </div>
    );
};

const normalizeRole = (role) => String(role || '').trim().toUpperCase().replace(/[^A-Z]/g, '');

// Non-working statuses where time correction should not be allowed
const NON_WORKING_STATUSES = new Set(['absent', 'leave', 'weekly_off', 'holiday']);
const isNonWorkingStatus = (status) => NON_WORKING_STATUSES.has(String(status || '').toLowerCase());

// Calculate work hours between two datetime strings (ISO format or datetime-local)
const calculateWorkHours = (firstIn, lastOut) => {
    if (!firstIn || !lastOut) return 0;
    try {
        const inTime = moment(firstIn);
        const outTime = moment(lastOut);
        if (!inTime.isValid() || !outTime.isValid() || outTime.isBefore(inTime)) return 0;
        return outTime.diff(inTime, 'hours', true);
    } catch (e) {
        return 0;
    }
};

const AttendanceReport = ({ isAdmin: isAdminProp }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [companies, setCompanies] = useState([]);
    const [companyId, setCompanyId] = useState('');
    const [companiesLoaded, setCompaniesLoaded] = useState(false); // guard: wait until company is resolved
    const [selectedEmp, setSelectedEmp] = useState(null);
    const { user } = React.useContext(UserContext);
    const ALLOWED_USERNAMES = React.useMemo(() => new Set(['shalini_arun', 'manu_pillai', 'suraj_rajan', 'rajan_aranamkatte', 'masood_raza']), []);
    const isDynamicAdmin = user?.isAttendanceAllowedAdmin === true;
    const normalizedRole = normalizeRole(user?.role);
    const isHOD = normalizedRole === 'HOD' || normalizedRole === 'HEADOFDEPARTMENT';
    const isAdmin = (Boolean(isAdminProp) && normalizedRole === 'ADMIN') || isDynamicAdmin;
    const isAllowedUser = isAdmin || isHOD || ALLOWED_USERNAMES.has(user?.username) || isDynamicAdmin;
    const [showDailySummary, setShowDailySummary] = useState(false);
    const [dashboardData, setDashboardData] = useState(null);
    const [dashLoading, setDashLoading] = useState(false);
    const [pendingCorrectionCounts, setPendingCorrectionCounts] = useState({});

    const now = new Date();
    const [startDate, setStartDate] = useState(moment().startOf('month').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(moment().format('YYYY-MM-DD'));

    useEffect(() => {
        if (!startDate || !endDate) return;
        if (moment(endDate).isBefore(moment(startDate))) {
            toast.error('End date cannot be before start date');
            setEndDate(startDate); // Simple correction
        }
    }, [startDate, endDate]);

    const [empHistory, setEmpHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [hasInitialPunchIn, setHasInitialPunchIn] = useState(true);
    const [saving, setSaving] = useState(false);
    const [applyingFullMonth, setApplyingFullMonth] = useState(false);
    const [groupBy, setGroupBy] = useState('status'); // 'status' or 'organization'
    const [excelGrouping, setExcelGrouping] = useState('organization'); // 'organization', 'team', 'single'
    const [teams, setTeams] = useState([]);
    const [fullMonthPresenceEnabled, setFullMonthPresenceEnabled] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);

    // Profile Hub States
    const [activeTab, setActiveTab] = useState('attendance'); // 'attendance', 'leaves', 'details'
    const [profileData, setProfileData] = useState(null); // Full profile from API
    const [jobForm, setJobForm] = useState({});
    const [updatingProfile, setUpdatingProfile] = useState(false);
    const [shifts, setShifts] = useState([]);

    // History browsing in drawer
    const [browseMonth, setBrowseMonth] = useState(moment().month() + 1);
    const [browseYear, setBrowseYear] = useState(moment().year());

    // Auto-switch hint for non-working statuses
    const [autoSwitchHintShown, setAutoSwitchHintShown] = useState(false);
    const shouldForceStatusCorrection = !hasInitialPunchIn || isNonWorkingStatus(editForm.status);
    const isTimeCorrectionDisabled = shouldForceStatusCorrection;

    useEffect(() => {
        const loadTeams = async () => {
            try {
                const r = await masterAPI.getTeams();
                setTeams(Array.isArray(r?.teams) ? r.teams : Array.isArray(r) ? r : []);
            } catch (err) {
                console.error('[AttendanceReport] loadTeams failed:', err);
            }
        };
        loadTeams();
    }, []);

    useEffect(() => {
        if (isAdmin) fetchCompanies();
        else setCompaniesLoaded(true); // non-admin: no company fetch needed, proceed immediately
    }, [isAdmin]);
 
    // Guard: only fetch report after companyId is resolved (companiesLoaded = true)
    useEffect(() => {
        if (!companiesLoaded) return;
        if (isAdmin && !companyId) return; // admin must have a company selected
        fetchReport();
    }, [startDate, endDate, companyId, companiesLoaded]);

    const fetchCompanies = async () => {
        try {
            const res = await masterAPI.getCompanies();
            const list = res?.data || [];
            setCompanies(list);
            // Check if company was passed via navigation state (from Dashboard "View all")
            const passedCompanyId = location.state?.companyId;
            if (passedCompanyId && list.some(c => c._id === passedCompanyId)) {
                setCompanyId(passedCompanyId);
            } else if (list.length > 0) {
                // Default to all companies for admin
                setCompanyId(prev => prev || 'all');
            }
        } catch (err) {
            console.error('[AttendanceReport] fetchCompanies failed:', err);
        } finally {
            // Mark companies as loaded regardless — so fetchReport can proceed
            setCompaniesLoaded(true);
        }
    };

    // const fetchDepts = async () => {
    //     try {
    //         const params = companyId ? { company_id: companyId } : {};
    //         const [sr] = await Promise.all([masterAPI.getShifts(params)]);
    //         setShifts(sr?.data || []);
    //     } catch { }
    // };

    const fetchReport = async () => {
        try {
            setLoading(true);
            let r;
            let dashR = null;

            if (isAdmin) {
                // Fetch report AND dashboard summary in parallel for the endDate to ensure accuracy
                const [reportRes, dashRes] = await Promise.all([
                    attendanceAPI.getAdminAttendanceReport(startDate, endDate, undefined, companyId),
                    attendanceAPI.getAdminDashboard({ 
                        date: endDate, 
                        company_id: companyId === 'all' ? undefined : companyId 
                    }).catch(err => {
                        console.error('[AttendanceReport] dashboard fetch failed:', err);
                        return null;
                    })
                ]);
                r = reportRes;
                dashR = dashRes;
            } else {
                r = await attendanceAPI.getTeamAttendanceReport(startDate, endDate, 'all');
            }
            
            let data = r?.data || [];
            
            // If we have dashboard data, store it for the daily summary tab
            if (dashR?.success && dashR?.data?.dailySummary) {
                setDashboardData(dashR.data);
            } else {
                setDashboardData(null);
            }

            const reportDataWithBalance = await enrichReportWithLeaveBalance(data, startDate, endDate);
            setReportData(reportDataWithBalance);
 
             try {
                 const countsRes = await attendanceAPI.getPendingCorrectionCount();
                 if (countsRes && countsRes.byEmployee) {
                     setPendingCorrectionCounts(countsRes.byEmployee);
                 }
             } catch (e) {
                 console.error('Failed to fetch pending counts in report:', e);
             }
        } catch (err) {
            console.error('[AttendanceReport] fetchReport error:', err?.response?.status || err?.status, err?.response?.data || err?.message || err);
            toast.error(err?.response?.data?.message || err?.message || 'Failed to load report');
        }
        finally { setLoading(false); }
    };

    const enrichReportWithLeaveBalance = async (data, startDate, endDate) => {
        try {
            // Fetch leave balances for all employees in the report
            const employeeIds = data.map(emp => emp.id || emp._id).filter(Boolean);
            if (employeeIds.length === 0) return data;
            
            const balanceRes = await attendanceAPI.getLeaveBalances(employeeIds, startDate, endDate);
            const privilegeOpeningMap = new Map();
            const privilegeAvailableMap = new Map();
            const privilegeUsedMap = new Map();
            const lwpUsedMap = new Map();
            
            // Create maps of employee metrics by leave type.
            if (balanceRes?.data) {
                balanceRes.data.forEach(balance => {
                    const empId = String(balance.employee_id?._id || balance.employee_id || '');
                    const leaveType = String(balance.leave_type || balance.leave_policy_id?.leave_type || balance.name || '').toLowerCase();

                    if (leaveType.includes('privilege') || leaveType.includes('earned') || leaveType === 'pl' || leaveType === 'el' || leaveType.includes('casual') || leaveType.includes('paid') || leaveType === 'cl') {
                        privilegeOpeningMap.set(empId, Number(balance.opening_balance || 0));
                        privilegeAvailableMap.set(empId, Number(balance.closing_balance || 0));
                        privilegeUsedMap.set(empId, Number(balance.used || 0));
                    } else if (leaveType.includes('lwp') || leaveType.includes('without pay') || leaveType === 'lop' || leaveType.includes('unpaid')) {
                        lwpUsedMap.set(empId, Number(balance.used || 0));
                    }
                });
            }
            
            // Enrich report data with leave balance
            return data.map(emp => {
                const eid = String(emp.id || emp._id || '');
                return {
                    ...emp,
                    opening_balance: privilegeOpeningMap.has(eid) ? privilegeOpeningMap.get(eid) : Number(emp.opening_balance || 0),
                    available_balance: privilegeAvailableMap.has(eid) ? privilegeAvailableMap.get(eid) : Number(emp.available_balance || 0),
                    leave_balance: privilegeAvailableMap.has(eid) ? privilegeAvailableMap.get(eid) : Number(emp.leave_balance || 0),
                    privilege_taken: privilegeUsedMap.has(eid) ? privilegeUsedMap.get(eid) : Number(emp.privilege_taken || 0),
                    lwp_taken: lwpUsedMap.has(eid) ? lwpUsedMap.get(eid) : Number(emp.lwp_taken || 0)
                };
            });
        } catch (err) {
            console.error('[AttendanceReport] enrichReportWithLeaveBalance failed:', err);
            // Return data without balance enrichment
            return data;
        }
    };

    const openDrawer = async (emp, tab = 'attendance') => {
        setSelectedEmp(emp);
        setLoadingHistory(true);
        setEditingId(null);
        setActiveTab(tab);
        setProfileData(null);
        setFullMonthPresenceEnabled(false);

        // Reset browser to current month (or the filtered range month)
        const rangeStart = new Date(startDate);
        setBrowseMonth(rangeStart.getMonth() + 1);
        setBrowseYear(rangeStart.getFullYear());


        try {
            const startMonth = moment(rangeStart).startOf('month').format('YYYY-MM-DD');
            const endMonth = moment(rangeStart).endOf('month').format('YYYY-MM-DD');
            const r = await attendanceAPI.getEmployeeFullProfile(emp.id, startMonth, endMonth, companyId);
            setProfileData(r);
            setEmpHistory(r?.attendance || []);
            setJobForm({
                first_name: r.employee.first_name,
                last_name: r.employee.last_name,
                email: r.employee.email,
                employee_code: r.employee.employee_code,
                shift_id: r.employee.shift_id?._id || r.employee.shift_id,
                role: r.employee.role,
                isActive: r.employee.isActive
            });
        } catch {
            setEmpHistory([]);
            toast.error('Failed to load profile details');
        }
        finally { setLoadingHistory(false); }
    };

    const handleApproveLeave = async (leaveId, status) => {
        try {
            await attendanceAPI.approveRequest('leave', leaveId, status);
            toast.success(`Leave ${status} successfully`);
            
            // Refresh data
            if (selectedEmp) {
                const start = moment([browseYear, browseMonth - 1]).startOf('month').format('YYYY-MM-DD');
                const end = moment([browseYear, browseMonth - 1]).endOf('month').format('YYYY-MM-DD');
                const r = await attendanceAPI.getEmployeeFullProfile(selectedEmp.id, start, end, companyId);
                setProfileData(r);
            }
            fetchReport();
        } catch (err) {
            toast.error(err.message || 'Action failed');
        }
    };

    const handleQuickPunch = async (empId, currentStatus, empName) => {
        const type = currentStatus === 'Present' || currentStatus === 'present' ? 'OUT' : 'IN';
        try {
            const response = await attendanceAPI.punch({ 
                type, 
                employee_id: empId, 
                method: 'Admin-Report-Panel' 
            });
            toast.success(response?.message || `Quick punch ${type} recorded for ${empName}!`);
            if (response?.warning?.message) toast.info(response.warning.message);
            if (response?.info?.message) toast.info(response.info.message);
            fetchReport(); // refresh the list to show new status
        } catch (err) {
            toast.error(err?.message || 'Quick punch failed');
        }
    };

    const fetchBrowseHistory = async (paramMonth, paramYear) => {
        if (!selectedEmp) return;
        
        // Robust parameter handling: default to state, but ignore if an Event object is passed
        const targetMonth = (typeof paramMonth === 'number') ? paramMonth : browseMonth;
        const targetYear = (typeof paramYear === 'number') ? paramYear : browseYear;

        setLoadingHistory(true);
        setEditingId(null);
        try {
            const start = moment([targetYear, targetMonth - 1]).startOf('month').format('YYYY-MM-DD');
            const end = moment([targetYear, targetMonth - 1]).endOf('month').format('YYYY-MM-DD');
            const r = await attendanceAPI.getEmployeeFullProfile(selectedEmp.id, start, end, companyId);
            setProfileData(r);
            setEmpHistory(r?.attendance || []);
        } catch (error) {
            console.error('Fetch history failed:', error);
            toast.error('Failed to load history for selected period');
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (!selectedEmp) return;
        fetchBrowseHistory(browseMonth, browseYear);
    }, [browseMonth, browseYear, selectedEmp?.id]);

    const continuityStats = React.useMemo(() => {
        const stats = {
            present: 0,
            absent: 0,
            late: 0,
            leaves: 0,
            weeklyOff: 0,
            holidays: 0
        };

        (empHistory || []).forEach((rec) => {
            const explicitStatus = String(rec?.status || '').toLowerCase();
            const isHalf = explicitStatus
                ? explicitStatus === 'half_day'
                : Boolean(rec.is_half_day || rec.isHalfDay || rec.is_half || rec.half_day);
            const status = getCalendarStatusClass(isHalf ? 'half_day' : rec?.status);
            
            if (status === 'present') stats.present += 1;
            if (status === 'late') {
                stats.late += 1;
                stats.present += 1;
            }
            if (status === 'absent') stats.absent += 1;
            if (status === 'leave' || status === 'pending_leave') stats.leaves += 1;
            if (status === 'half_day') {
                const hasLeave = !!(rec.leaveType || rec.leave_type || rec.is_half_day_leave || rec.isHalfDayLeave);
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
                present: profileData?.summary?.present ?? selectedEmp?.present ?? 0,
                absent: profileData?.summary?.absent ?? selectedEmp?.absent ?? 0,
                late: profileData?.summary?.late ?? selectedEmp?.late ?? 0,
                leaves: profileData?.summary?.leaves ?? selectedEmp?.leaves ?? 0,
                weeklyOff: 0,
                holidays: (profileData?.holidays || []).length
            };
        }

        return stats;
    }, [empHistory, profileData?.summary, profileData?.holidays, selectedEmp]);

        const leaveHistory = useMemo(() => {
            const approved = Array.isArray(profileData?.leaves) ? profileData.leaves : [];
            const pending = Array.isArray(profileData?.pendingLeaves) ? profileData.pendingLeaves : [];

            return [...approved, ...pending]
                .filter((leave) => {
                    const status = String(leave?.approval_status || leave?.status || '').toLowerCase();
                    return !['rejected', 'cancelled', 'withdrawn'].includes(status);
                })
                .sort((a, b) => new Date(b.createdAt || b.from_date || 0) - new Date(a.createdAt || a.from_date || 0));
        }, [profileData?.leaves, profileData?.pendingLeaves]);

    const correctionHistory = useMemo(() => {
        const requests = Array.isArray(profileData?.correctionRequests)
            ? profileData.correctionRequests
            : (Array.isArray(profileData?.pendingRegularizations) ? profileData.pendingRegularizations : []);

        return [...requests].sort((a, b) => {
            const left = new Date(b.createdAt || b.updatedAt || b.attendance_date || 0).getTime();
            const right = new Date(a.createdAt || a.updatedAt || a.attendance_date || 0).getTime();
            return left - right;
        });
    }, [profileData?.correctionRequests, profileData?.pendingRegularizations]);

    const assignedShiftOptions = React.useMemo(() => {
        const employee = profileData?.employee || {};
        const raw = Array.isArray(employee.shift_ids) ? employee.shift_ids : [];
        const fallback = employee.shift_id ? [employee.shift_id] : [];
        const combined = [...raw, ...fallback];

        const seen = new Set();
        return combined
            .map((s) => {
                if (!s) return null;
                if (typeof s === 'string') {
                    return { _id: s, shift_name: 'Assigned Shift', start_time: '10:00', end_time: '19:00', half_day_hours: 4 };
                }
                return s;
            })
            .filter((s) => s && s._id && !seen.has(String(s._id)) && seen.add(String(s._id)));
    }, [profileData?.employee]);

    const toEditDateTime = (attendanceDate, hhmm = '10:00') => {
        const [hh, mm] = String(hhmm || '10:00').split(':').map((v) => Number(v));
        // Force local time interpretation by using the browser's local moment
        const m = moment(attendanceDate).startOf('day').set({
            hour: Number.isFinite(hh) ? hh : 9,
            minute: Number.isFinite(mm) ? mm : 0,
            second: 0,
            millisecond: 0
        });
        return m.format('YYYY-MM-DDTHH:mm');
    };

    const handleApplyFullMonthPresence = async (e) => {
        e.preventDefault();
        if (!selectedEmp) return;

        if (!fullMonthPresenceEnabled) {
            toast.error('Enable Full Month Presence to continue');
            return;
        }

        const ok = window.confirm('Are you sure you want to mark the entire month as present?');
        if (!ok) return;

        setApplyingFullMonth(true);
        try {
            const res = await attendanceAPI.applyFullMonthPresence({
                employee_id: selectedEmp.id,
                year: browseYear,
                month: browseMonth
            });

            if (res.success) {
                toast.success(res.message || 'Full month presence applied');
                fetchBrowseHistory(browseMonth, browseYear);

                // Force a slightly longer delay to ensure DB aggregation consistency for main report
                setTimeout(() => {
                    fetchReport();
                }, 1000);
            } else {
                toast.error(res.message || 'Failed to apply full month presence');
            }
        } catch (error) {
            const msg = error?.message || error?.response?.data?.message || 'Error applying full month presence';
            toast.error(msg);
        } finally {
            setApplyingFullMonth(false);
        }
    };

    const saveEdit = async () => {
        if (editForm.first_in && editForm.last_out) {
            if (moment(editForm.last_out).isBefore(moment(editForm.first_in))) {
                toast.error('Punch-Out cannot be before Punch-In');
                return;
            }
            const durationHours = moment(editForm.last_out).diff(moment(editForm.first_in), 'hours', true);
            if (durationHours > 20) {
                toast.error(`Invalid Time: Work duration (${durationHours.toFixed(1)}h) exceeds 20-hour limit. Please check dates.`);
                return;
            }
        }

        setSaving(true);
        const payload = {
            ...editForm,
            status: editForm.status === 'pending_leave' ? 'leave' : editForm.status,
            first_in: editForm.first_in || null,
            last_out: editForm.last_out || null
        };

        try {
            if (editingId === 'new') {
                await attendanceAPI.createManualAdjustment(payload);
            } else {
                await attendanceAPI.updateAttendanceRecord(editingId, payload);
            }
            toast.success('Record updated');
            setEditingId(null);
            // Refresh local logs
            fetchBrowseHistory();
            // Refresh main report if relevant
            fetchReport();
        } catch (err) {
            const apiErrorCode = err?.error || err?.code || err?.response?.data?.error || err?.response?.data?.code;
            const apiMessage = err?.message || err?.response?.data?.message || 'Update failed';

            if (apiErrorCode === 'PENDING_LEAVE_ACTION_REQUIRED') {
                toast.error(apiMessage || 'Pending leave exists for this date. Approve, reject, or withdraw it before adjusting attendance.');
                return;
            }
            toast.error(apiMessage);
        }
        finally { setSaving(false); }
    };

    const saveProfile = async () => {
        setUpdatingProfile(true);
        try {
            if (isAdmin) {
                await attendanceAPI.updateEmployeeProfile(selectedEmp.id, jobForm);
            } else {
                // HOD version - shift only
                await attendanceAPI.updateEmployeeProfileHOD(selectedEmp.id, { shift_id: jobForm.shift_id });
            }
            toast.success('Employee profile updated');
            // Refresh main report
            fetchReport();
        } catch (err) {
            const msg = err?.message || err?.response?.data?.message || 'Update failed';
            toast.error(msg);
        } finally {
            setUpdatingProfile(false);
        }
    };

    const startEdit = (rec, overrideDate = null) => {
        const recordShiftId = rec.shift_id?._id || rec.shift_id || '';
        const defaultShiftId = recordShiftId || assignedShiftOptions?.[0]?._id || '';

        const baseForm = {
            attendance_date: overrideDate || rec.attendance_date,
            employee_id: selectedEmp.id,
            shift_id: defaultShiftId,
            status: (rec.status === 'missed_punch' || rec.status === 'incomplete') ? 'incomplete' : (rec.status || 'present'),
            half_day_session: rec.half_day_session || 'first_half',
            first_in: rec.first_in ? moment(rec.first_in).format('YYYY-MM-DDTHH:mm') : '',
            last_out: rec.last_out ? moment(rec.last_out).format('YYYY-MM-DDTHH:mm') : '',
            remarks: rec.remarks || ''
        };
        setEditingId(rec._id || 'new');
        setEditForm(baseForm);
    };

    const exportExcel = async () => {
        const ExcelJS = await import('exceljs');
        const { saveAs } = await import('file-saver');

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Exim Application';

        const processedReportData = reportData;
        const processedFiltered = filtered;

        const reportMetricsById = new Map(processedReportData.map(row => [row.id, row]));

        // ── Helper: style a header row ──────────────────────────────────────
        const styleHeader = (row, bgArgb, textArgb = 'FFFFFFFF') => {
            row.eachCell(cell => {
                cell.font  = { bold: true, color: { argb: textArgb }, name: 'Arial', size: 10 };
                cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF94A3B8' } },
                    left: { style: 'thin', color: { argb: 'FF94A3B8' } },
                    bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
                    right: { style: 'thin', color: { argb: 'FF94A3B8' } }
                };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            });
        };

        const roundLeave = (value) => Math.round(Number(value || 0) * 10) / 10;
        const getLeaveMetrics = (employeeId) => reportMetricsById.get(employeeId) || {};
        const isPrivilegeLeave = (leaveType = '') => {
            const type = String(leaveType || '').toLowerCase();
            return type === 'pl' || type.includes('privilege') || type.includes('earned') || type === 'el';
        };
        const isLwpLeave = (leaveType = '') => {
            const type = String(leaveType || '').toLowerCase();
            return type === 'lwp' || type.includes('without pay') || type.includes('unpaid') || type === 'lop';
        };
        const isHalfDayLeave = (day) => {
            if (day?.is_half_day_leave || day?.isHalfDayLeave) return true;
            const s = String(day?.status || '').toLowerCase();
            const lt = String(day?.leaveType || day?.leave_type || day?.leaveReason || '').trim();
            let workHours = 0;
            if (day?.total_work_hours !== null && day?.total_work_hours !== undefined && Number(day.total_work_hours) > 0) {
                workHours = Number(day.total_work_hours);
            } else if (day?.first_in && day?.last_out) {
                workHours = moment(day.last_out).diff(moment(day.first_in), 'hours', true);
            }
            if (day?.is_half_day && (lt || s === 'leave' || workHours < 4)) return true;
            if (s === 'half_day' && (lt || workHours < 4)) return true;
            return false;
        };

        // Full days present (count of >= 8h or marked present/late, plus 0.5 per half day)
        const getPresentDaysForReport = (employee) => {
            const actualHalfDays = getActualHalfDays(employee);
            if (!Array.isArray(employee.history) || employee.history.length === 0) {
                return roundLeave(Number(employee.present || 0) + (actualHalfDays * 0.5));
            }
            const fullPresent = employee.history.filter((day) => {
                const s = String(day?.status || '').toLowerCase();
                if (s === 'none' || s === '' || s === 'future') return false;
                if (s === 'weekly_off' || s === 'weekoff' || s === 'off' || s === 'holiday' || s === 'leave') return false;
                if (isHalfDayLeave(day)) return false;

                let workHours = 0;
                if (day?.total_work_hours !== null && day?.total_work_hours !== undefined && Number(day.total_work_hours) > 0) {
                    workHours = Number(day.total_work_hours);
                } else if (day?.first_in && day?.last_out) {
                    workHours = moment(day.last_out).diff(moment(day.first_in), 'hours', true);
                }

                if ((s === 'present' || s === 'late' || s === 'present_late' || s === 'on_duty') && !day?.is_half_day && s !== 'half_day') return true;
                if (s === 'half_day' || day?.is_half_day) return false;
                if (workHours >= 8) return true;
                if (workHours >= 4) return false; // Half day
                return false;
            }).length;
            return roundLeave(fullPresent + (actualHalfDays * 0.5));
        };

        const getActualHalfDays = (employee) => {
            if (!Array.isArray(employee.history) || employee.history.length === 0) return Number(employee.halfDay || 0);

            return employee.history.filter((day) => {
                const s = String(day?.status || '').toLowerCase();
                if (s === 'none' || s === '' || s === 'future') return false;
                if (s === 'weekly_off' || s === 'weekoff' || s === 'off' || s === 'holiday' || s === 'leave') return false;
                if (isHalfDayLeave(day)) return false;

                if ((s === 'present' || s === 'late' || s === 'present_late' || s === 'on_duty') && !day?.is_half_day && s !== 'half_day') return false;
                if (s === 'half_day' || day?.is_half_day) return true;

                let workHours = 0;
                if (day?.total_work_hours !== null && day?.total_work_hours !== undefined && Number(day.total_work_hours) > 0) {
                    workHours = Number(day.total_work_hours);
                } else if (day?.first_in && day?.last_out) {
                    workHours = moment(day.last_out).diff(moment(day.first_in), 'hours', true);
                }

                if (workHours >= 8) return false;
                if (workHours >= 4) return true;
                return false;
            }).length;
        };

        const getHalfDayLeaveCountForReport = (employee) => {
            if (!Array.isArray(employee.history) || employee.history.length === 0) return 0;
            return employee.history.filter((day) => isHalfDayLeave(day)).length;
        };

        const getFullDayLeaveCountForReport = (employee) => {
            if (!Array.isArray(employee.history) || employee.history.length === 0) return Number(employee.leaves || 0);

            return employee.history.filter((day) => {
                const s = String(day?.status || '').toLowerCase();
                const isHalfLeave = isHalfDayLeave(day);
                return (s === 'leave' || s === 'pending_leave') && !isHalfLeave;
            }).length;
        };

        // Absent days (unauthorized/unexcused absence with <4h worked and NO approved leave + 0.5 per half day)
        const getAbsentDaysForReport = (employee) => {
            const actualHalfDays = getActualHalfDays(employee);
            if (!Array.isArray(employee.history) || employee.history.length === 0) {
                return roundLeave(Number(employee.absent || 0) + (actualHalfDays * 0.5));
            }
            const fullAbsent = employee.history.filter((day) => {
                const s = String(day?.status || '').toLowerCase();
                const lt = String(day?.leaveType || day?.leave_type || day?.leaveReason || '').trim();
                const isHalfLeave = isHalfDayLeave(day);

                // If future date or status is 'none', it is NOT absent
                if (s === 'none' || s === '' || s === 'future') return false;
                if (day?.date && moment(day.date).isAfter(moment().endOf('day'))) return false;

                if (s === 'weekly_off' || s === 'weekoff' || s === 'off' || s === 'holiday') return false;
                if (s === 'leave' || s === 'pending_leave' || isHalfLeave || lt) return false;

                let workHours = 0;
                if (day?.total_work_hours !== null && day?.total_work_hours !== undefined && Number(day.total_work_hours) > 0) {
                    workHours = Number(day.total_work_hours);
                } else if (day?.first_in && day?.last_out) {
                    workHours = moment(day.last_out).diff(moment(day.first_in), 'hours', true);
                }

                if (workHours >= 4) return false;
                if (s === 'present' || s === 'late' || s === 'present_late' || s === 'half_day' || s === 'on_duty') return false;
                return s === 'absent' || (!s && workHours < 4);
            }).length;
            return roundLeave(fullAbsent + (actualHalfDays * 0.5));
        };

        const getWeekOffCount = (employee) => {
            if (!Array.isArray(employee.history) || employee.history.length === 0) return Number(employee.weekOff || 0);
            return employee.history.filter((d) => {
                const s = String(d?.status || '').toLowerCase();
                return s === 'weekly_off' || s === 'weekoff' || s === 'off';
            }).length;
        };

        const getHolidayCount = (employee) => {
            if (!Array.isArray(employee.history) || employee.history.length === 0) return Number(employee.holiday || 0);
            return employee.history.filter((d) => {
                const s = String(d?.status || '').toLowerCase();
                return s === 'holiday';
            }).length;
        };

        const getTotalWeekOffAndHoliday = (employee) => {
            return getWeekOffCount(employee) + getHolidayCount(employee);
        };

        const getTotalWorkingDays = (employee) => {
            const presentDays = getPresentDaysForReport(employee);
            const { plTaken } = calculateEmployeeLeaveBreakdown(employee);
            const holidayCount = getHolidayCount(employee);
            const weekOffCount = getWeekOffCount(employee);
            return roundLeave(presentDays + plTaken + holidayCount + weekOffCount);
        };

        // Complete leaves = sum of [Full Day Leaves] + (0.5 * [Half Day Leaves])
        const getLeaveCountForReport = (employee) => {
            const halfDayLeaves = getHalfDayLeaveCountForReport(employee);
            const fullDayLeaves = getFullDayLeaveCountForReport(employee);
            return roundLeave(fullDayLeaves + (halfDayLeaves * 0.5));
        };

        // Calculate exact PL Taken, LWP Taken, Available Balance
        const calculateEmployeeLeaveBreakdown = (employee) => {
            const metrics = getLeaveMetrics(employee.id || employee._id);
            const openingBalance = roundLeave(Number(metrics.opening_balance || 0));
            const completeLeaves = getLeaveCountForReport(employee);

            if (!Array.isArray(employee.history) || employee.history.length === 0) {
                const plTaken = roundLeave(Math.min(openingBalance, completeLeaves));
                const lwpTaken = roundLeave(Math.max(0, completeLeaves - openingBalance));
                const availableBalance = roundLeave(Math.max(0, openingBalance - plTaken));
                return { openingBalance, plTaken, lwpTaken, availableBalance };
            }

            let explicitLwp = 0;
            let explicitPl = 0;

            employee.history.forEach((day) => {
                const s = String(day?.status || '').toLowerCase();
                const lt = String(day?.leaveType || day?.leave_type || day?.leaveReason || '').trim();
                const isHalfLeave = isHalfDayLeave(day);

                if (s === 'weekly_off' || s === 'weekoff' || s === 'off' || s === 'holiday') return;

                if (isHalfLeave || (s === 'half_day' && lt)) {
                    if (isLwpLeave(lt)) {
                        explicitLwp += 0.5;
                    } else {
                        explicitPl += 0.5;
                    }
                } else if (s === 'leave' || s === 'pending_leave') {
                    if (isLwpLeave(lt)) {
                        explicitLwp += 1.0;
                    } else {
                        explicitPl += 1.0;
                    }
                }
            });

            const plTaken = roundLeave(Math.min(openingBalance, explicitPl));
            const lwpTaken = roundLeave(explicitLwp + Math.max(0, explicitPl - openingBalance));
            const availableBalance = roundLeave(Math.max(0, openingBalance - plTaken));

            return { openingBalance, plTaken, lwpTaken, availableBalance };
        };
        const sumLeaveMetric = (employees, key) => roundLeave(
            employees.reduce((sum, employee) => {
                const metrics = getLeaveMetrics(employee.id);
                const breakdown = calculateEmployeeLeaveBreakdown(employee);
                let value;
                if (key === 'available_balance') value = breakdown.availableBalance;
                else if (key === 'privilege_taken') value = breakdown.plTaken;
                else if (key === 'lwp_taken') value = breakdown.lwpTaken;
                else if (key === 'opening_balance') value = breakdown.openingBalance;
                else value = metrics[key] ?? 0;
                return sum + Number(value || 0);
            }, 0)
        );

        const formatLeaveStatusLabel = (day, workHours = 0) => {
            const statusLower = String(day?.status || '').toLowerCase();
            const leaveType = String(day?.leaveType || day?.leave_type || day?.leaveReason || '').trim();
            const lLower = leaveType.toLowerCase();

            let leaveCode = 'PL';
            if (isLwpLeave(leaveType)) leaveCode = 'LWP';
            else if (isPrivilegeLeave(leaveType)) leaveCode = 'PL';
            else if (lLower.includes('casual') || lLower === 'cl') leaveCode = 'CL';
            else if (lLower.includes('sick') || lLower === 'sl') leaveCode = 'SL';
            else if (lLower.includes('comp') || lLower === 'co') leaveCode = 'Comp Off';
            else if (leaveType) leaveCode = leaveType.toUpperCase();

            if (statusLower === 'weekly_off' || statusLower === 'weekoff' || statusLower === 'off') return 'Weekly Off';
            if (statusLower === 'holiday') return 'Holiday';
            const isHalfLeave = isHalfDayLeave(day);
            if ((statusLower === 'leave' || statusLower === 'pending_leave') && !isHalfLeave) {
                return leaveCode;
            }
            if (isHalfLeave) {
                return `Half Day (${leaveCode})`;
            }
            if ((statusLower === 'present' || statusLower === 'late' || statusLower === 'present_late' || statusLower === 'on_duty') && !day?.is_half_day && statusLower !== 'half_day') {
                return 'Present';
            }
            if (statusLower === 'half_day' || day?.is_half_day) {
                return 'Half Day';
            }
            if (workHours >= 8 || (workHours === 0 && !day?.first_in && (statusLower === 'present' || statusLower === 'late' || statusLower === 'present_late'))) {
                return 'Present';
            }
            if (workHours >= 4) {
                return 'Half Day';
            }
            if (statusLower === 'incomplete' || statusLower === 'missed_punch') return 'Missed Punch';
            return 'Absent';
        };

        // ── Group filtered employees by selected option ─────────────────────
        const byGroup = {};
        if (excelGrouping === 'single') {
            byGroup['Attendance Report'] = processedFiltered;
        } else if (excelGrouping === 'team') {
            const teamNameByEmployee = new Map();
            teams.forEach(team => {
                const teamName = team?.name || team?.team_name || team?.teamName || 'No Team';
                const teamMembers = [
                    ...(Array.isArray(team?.members) ? team.members : []),
                    ...(Array.isArray(team?.membersDetails) ? team.membersDetails : []),
                ];
                teamMembers.forEach(member => {
                    const memberId = member?._id || member?.id || member;
                    if (memberId) {
                        const normalizedKey = String(memberId).trim().toLowerCase();
                        teamNameByEmployee.set(normalizedKey, teamName);
                    }
                });
            });

            const getEmployeeTeamName = (emp) => {
                const directTeamName = emp?.teamId?.name || emp?.team?.name || emp?.team_name || emp?.teamName || emp?.team;
                if (directTeamName) return directTeamName;
                
                const key = String(emp?.id || emp?._id || '').trim().toLowerCase();
                if (teamNameByEmployee.has(key)) {
                    return teamNameByEmployee.get(key);
                }
                return 'No Team';
            };

            processedFiltered.forEach(e => {
                const team = getEmployeeTeamName(e);
                if (!byGroup[team]) byGroup[team] = [];
                byGroup[team].push(e);
            });
        } else {
            // Default: organization-wise
            processedFiltered.forEach(e => {
                const rawCo = (e.company_name || '').trim();
                const co = (!rawCo || rawCo === '---' || rawCo === '—' || rawCo === '--' || rawCo === '-') ? 'Unassigned' : rawCo;
                if (!byGroup[co]) byGroup[co] = [];
                byGroup[co].push(e);
            });
        }

        // ── Build worksheets ────────────────────────────────
        const METRIC_STYLES = {
            present:     { bg: 'FFECFDF5', fg: 'FF047857', bd: 'FFA7F3D0' },
            absent:      { bg: 'FFFEF2F2', fg: 'FFB91C1C', bd: 'FFFECACA' },
            totWorking:  { bg: 'FFF0FDF4', fg: 'FF166534', bd: 'FFBBF7D0' },
            hdLeaves:    { bg: 'FFF5F3FF', fg: 'FF6D28D9', bd: 'FFDDD6FE' },
            fdLeaves:    { bg: 'FFEEF2FF', fg: 'FF4338CA', bd: 'FFC7D2FE' },
            compLeaves:  { bg: 'FFFAF5FF', fg: 'FF7E22CE', bd: 'FFE9D5FF' },
            weekOff:     { bg: 'FFF8FAFC', fg: 'FF475569', bd: 'FFE2E8F0' },
            holiday:     { bg: 'FFFEFCE8', fg: 'FFA16207', bd: 'FFFEF08A' },
            openBal:     { bg: 'FFFFFBEB', fg: 'FFB45309', bd: 'FFFDE68A' },
            plTaken:     { bg: 'FFFFF7ED', fg: 'FFC2410C', bd: 'FFFED7AA' },
            lwpTaken:    { bg: 'FFFEF2F2', fg: 'FF991B1B', bd: 'FFFECACA' },
            availBal:    { bg: 'FFF0FDF4', fg: 'FF15803D', bd: 'FFBBF7D0' },
            avgHours:    { bg: 'FFF1F5F9', fg: 'FF334155', bd: 'FFE2E8F0' },
        };

        Object.entries(byGroup).sort(([a], [b]) => a.localeCompare(b)).forEach(([groupName, employees]) => {
            const ws = workbook.addWorksheet(groupName.substring(0, 31)); // Excel sheet name limit
            ws.views = [{ showGridLines: true }];

            // Set column properties/widths
            ws.columns = [
                { key: 'col1', width: 28 }, // Employee/Date
                { key: 'col2', width: 20 }, // Total Working Days
                { key: 'col3', width: 13 }, // Present/Day
                { key: 'col4', width: 13 }, // Absent/Shift
                { key: 'col5', width: 18 }, // HalfDayLeaves / InTime
                { key: 'col6', width: 18 }, // FullDayLeaves / OutTime
                { key: 'col7', width: 18 }, // CompleteLeaves (Total PL Taken) / TotalHours
                { key: 'col8', width: 14 }, // LWP Taken
                { key: 'col9', width: 14 }, // Week Off
                { key: 'col10', width: 14 }, // Holiday
                { key: 'col11', width: 6 },  // Spacer 1
                { key: 'col12', width: 6 }, // Spacer 2
                { key: 'col13', width: 28 }, // OpeningBalance / Late In/Out
                { key: 'col14', width: 14 }, // PL Taken
                { key: 'col15', width: 18 }, // Available Balance
                { key: 'col16', width: 18 }  // Avg Hours/Day
            ];

            // ── 1. Master Title Block at Top of Sheet ───────────────────────
            const r1 = ws.addRow([`${groupName.toUpperCase()} — ATTENDANCE & LEAVE REGISTER`]);
            const r2 = ws.addRow([`Period: ${moment(startDate).format('DD MMM YYYY')} to ${moment(endDate).format('DD MMM YYYY')}   |   Generated on: ${moment().format('DD-MMM-YYYY HH:mm')}   |   Staff Count: ${employees.length}`]);
            
            ws.mergeCells(r1.number, 1, r1.number, 16);
            ws.mergeCells(r2.number, 1, r2.number, 16);

            r1.height = 30;
            r1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
            r1.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI', size: 13 };
            r1.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

            r2.height = 22;
            r2.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            r2.getCell(1).font = { color: { argb: 'FFE2E8F0' }, name: 'Segoe UI', size: 9.5, italic: true };
            r2.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

            ws.addRow([]); // Blank spacer

            // ── 2. Master Summary Table (All Employees) ───────────────────
            const openBalHeader = `${moment(startDate).isValid() ? moment(startDate).format('MMMM') : moment().format('MMMM')} Opening Balance`;
            const COLS = ['Employee', 'Total Working Days', 'Present', 'Absent', 'Half Day PL', 'Full Day PL', 'Total PL Taken', 'LWP Taken', 'Week Off', 'Holiday', '', '', openBalHeader, 'PL Taken', 'Available Balance', 'Avg Hours/Day'];
            const sumHeaderRow = ws.addRow(COLS);
            sumHeaderRow.height = 26;
            styleHeader(sumHeaderRow, 'FF0F172A', 'FFFFFFFF');

            let grandPresent = 0, grandAbsent = 0, grandWeekOff = 0, grandHoliday = 0, grandTotalWorkingDays = 0;
            let grandHdLeaves = 0, grandFdLeaves = 0, grandCompLeaves = 0;
            let grandOpenBal = 0, grandPlTaken = 0, grandLwpTaken = 0, grandAvailBal = 0;

            employees.forEach((e, idx) => {
                const { openingBalance, plTaken, lwpTaken, availableBalance } = calculateEmployeeLeaveBreakdown(e);
                const presentDays = getPresentDaysForReport(e);
                const absentDays = getAbsentDaysForReport(e);
                const weekOffCount = getWeekOffCount(e);
                const holidayCount = getHolidayCount(e);
                const totalWorkingDays = getTotalWorkingDays(e);
                const halfDayLeaves = getHalfDayLeaveCountForReport(e);
                const fullDayLeaves = getFullDayLeaveCountForReport(e);
                const completeLeaves = getLeaveCountForReport(e);

                const openB = roundLeave(openingBalance);
                const plT = roundLeave(plTaken);
                const lwpT = roundLeave(lwpTaken);
                const availB = roundLeave(availableBalance);

                grandPresent += presentDays;
                grandAbsent += absentDays;
                grandWeekOff += weekOffCount;
                grandHoliday += holidayCount;
                grandTotalWorkingDays += totalWorkingDays;
                grandHdLeaves += halfDayLeaves;
                grandFdLeaves += fullDayLeaves;
                grandCompLeaves += completeLeaves;
                grandOpenBal += openB;
                grandPlTaken += plT;
                grandLwpTaken += lwpT;
                grandAvailBal += availB;

                const isOdd = idx % 2 === 1;
                const rowBg = isOdd ? 'FFF8FAFC' : 'FFFFFFFF';

                const sumValRow = ws.addRow([
                    e.name,
                    totalWorkingDays,
                    presentDays,
                    absentDays,
                    halfDayLeaves,
                    fullDayLeaves,
                    completeLeaves,
                    lwpT,
                    weekOffCount,
                    holidayCount,
                    '',
                    '',
                    openB,
                    plT,
                    availB,
                    formatHoursMinutes(e.avgHours),
                ]);
                sumValRow.height = 22;

                const nameCell = sumValRow.getCell(1);
                nameCell.font = { bold: true, name: 'Segoe UI', size: 10, color: { argb: 'FF0F172A' } };
                nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
                nameCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

                const metricConfigs = [
                    [2, METRIC_STYLES.totWorking],
                    [3, METRIC_STYLES.present],
                    [4, METRIC_STYLES.absent],
                    [5, METRIC_STYLES.hdLeaves],
                    [6, METRIC_STYLES.fdLeaves],
                    [7, METRIC_STYLES.compLeaves],
                    [8, METRIC_STYLES.lwpTaken],
                    [9, METRIC_STYLES.weekOff],
                    [10, METRIC_STYLES.holiday],
                    [13, METRIC_STYLES.openBal],
                    [14, METRIC_STYLES.plTaken],
                    [15, METRIC_STYLES.availBal],
                ];

                metricConfigs.forEach(([col, style]) => {
                    const cell = sumValRow.getCell(col);
                    cell.font = { bold: true, color: { argb: style.fg }, name: 'Segoe UI', size: 10 };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.bg } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });

                const avgCell = sumValRow.getCell(16);
                avgCell.font = { name: 'Segoe UI', size: 10, color: { argb: METRIC_STYLES.avgHours.fg } };
                avgCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: METRIC_STYLES.avgHours.bg } };
                avgCell.alignment = { horizontal: 'center', vertical: 'middle' };

                sumValRow.eachCell(cell => {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                    };
                });
            });

            // ── 3. Blank Separator Rows ─────────────────────────────────────
            ws.addRow([]);
            ws.addRow([]);

            // ── 4. Detailed Daily Logs Section for Each Employee ────────────
            employees.forEach((e) => {
                const empHeaderRow = ws.addRow([`DAILY LOGS: ${e.name.toUpperCase()}`]);
                empHeaderRow.height = 26;
                ws.mergeCells(empHeaderRow.number, 1, empHeaderRow.number, 8);
                const empCell = empHeaderRow.getCell(1);
                empCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
                empCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI', size: 11 };
                empCell.alignment = { horizontal: 'center', vertical: 'middle' };

                const detailCols = ['Date', 'Day', 'Shift', 'Status', 'In Time', 'Out Time', 'Total Hours', 'Late In / Early Out'];
                const detailHeaderRow = ws.addRow(detailCols);
                detailHeaderRow.height = 22;
                styleHeader(detailHeaderRow, 'FF334155', 'FFFFFFFF');

                let totalHoursSum = 0;
                const metrics = getLeaveMetrics(e.id || e._id);
                let runningPl = Number(e.opening_balance ?? e._openingBalance ?? metrics?.opening_balance ?? 0);
                const history = e.history || [];

                history.forEach((day, logIdx) => {
                    const mDate = moment(day.date || day.attendance_date);
                    const dateStr = mDate.format('DD-MM-YYYY');
                    const dayName = mDate.format('ddd');

                    const statusLower = String(day.status || '').toLowerCase();
                    const isOffOrHoliday = ['weekly_off', 'holiday', 'leave', 'pending_leave'].includes(statusLower);

                    let shiftStr = '—';
                    if (!isOffOrHoliday && statusLower !== 'absent') {
                        shiftStr = day.shift_id?.shift_name 
                            ? `${day.shift_id.shift_name} ${day.shift_id.start_time || '09:00'}-${day.shift_id.end_time || '17:30'}`
                            : 'GENERAL SHIFT 09:00-17:30';
                    }

                    const inStr = day.first_in ? moment(day.first_in).format('h:mm A') : '';
                    const outStr = day.last_out ? moment(day.last_out).format('h:mm A') : '';

                    let hoursStr = '';
                    let workHours = 0;
                    const diffHours = (day.first_in && day.last_out) ? moment(day.last_out).diff(moment(day.first_in), 'hours', true) : 0;
                    if (day.total_work_hours !== null && day.total_work_hours !== undefined && Number(day.total_work_hours) > 0) {
                        workHours = Number(day.total_work_hours);
                    } else if (diffHours > 0 && diffHours < 24) {
                        workHours = diffHours;
                    }

                    if (workHours > 0 && workHours < 24) {
                        hoursStr = formatHoursMinutes(workHours);
                        totalHoursSum += workHours;
                    }

                    const leaveType = String(day?.leaveType || day?.leave_type || day?.leaveReason || '').trim();
                    const isHalfLeave = isHalfDayLeave(day);

                    let statusLabel = null;
                    if (statusLower === 'weekly_off' || statusLower === 'weekoff' || statusLower === 'off') {
                        statusLabel = 'Weekly Off';
                    } else if (statusLower === 'holiday') {
                        statusLabel = 'Holiday';
                    } else if (isHalfLeave) {
                        if (isLwpLeave(leaveType)) {
                            statusLabel = 'Half Day (LWP)';
                        } else if (runningPl >= 0.5) {
                            runningPl = roundLeave(runningPl - 0.5);
                            statusLabel = 'Half Day (PL)';
                        } else {
                            statusLabel = 'Half Day (LWP)';
                        }
                    } else if (statusLower === 'leave' || statusLower === 'pending_leave') {
                        if (isLwpLeave(leaveType)) {
                            statusLabel = 'LWP';
                        } else if (runningPl >= 1.0) {
                            runningPl = roundLeave(runningPl - 1.0);
                            statusLabel = 'PL';
                        } else if (runningPl === 0.5) {
                            runningPl = 0;
                            statusLabel = 'PL (0.5) / LWP (0.5)';
                        } else {
                            statusLabel = 'LWP';
                        }
                    } else if ((statusLower === 'present' || statusLower === 'late' || statusLower === 'present_late' || statusLower === 'on_duty') && !day?.is_half_day && statusLower !== 'half_day') {
                        statusLabel = 'Present';
                    } else if (statusLower === 'half_day' || day?.is_half_day) {
                        statusLabel = 'Half Day';
                    } else if (workHours >= 8 || (workHours === 0 && !day?.first_in && (statusLower === 'present' || statusLower === 'late' || statusLower === 'present_late'))) {
                        statusLabel = 'Present';
                    } else if (workHours >= 4) {
                        statusLabel = 'Half Day';
                    } else if (statusLower === 'incomplete' || statusLower === 'missed_punch') {
                        statusLabel = 'Missed Punch';
                    } else {
                        statusLabel = 'Absent';
                    }

                    let timingRemarks = '—';
                    const lateText = (day.is_late || (day.late_by_minutes > 0)) ? `Late In (${day.late_by_minutes || 0}m)` : '';
                    const earlyText = (day.is_early_exit || (day.early_exit_minutes > 0)) ? `Early Out (${day.early_exit_minutes || 0}m)` : '';
                    if (lateText && earlyText) {
                        timingRemarks = `${lateText}, ${earlyText}`;
                    } else if (lateText) {
                        timingRemarks = lateText;
                    } else if (earlyText) {
                        timingRemarks = earlyText;
                    } else if (inStr || outStr || workHours > 0) {
                        timingRemarks = 'On Time';
                    }

                    const isLogOdd = logIdx % 2 === 1;
                    const logRowBg = isLogOdd ? 'FFF8FAFC' : 'FFFFFFFF';

                    const dayRow = ws.addRow([
                        dateStr,
                        dayName,
                        shiftStr,
                        statusLabel,
                        inStr,
                        outStr,
                        hoursStr,
                        timingRemarks
                    ]);
                    dayRow.height = 20;

                    [1, 2, 4, 5, 6, 7, 8].forEach(c => {
                        dayRow.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
                    });
                    dayRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

                    dayRow.eachCell(cell => {
                        cell.font = { name: 'Segoe UI', size: 10 };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: logRowBg } };
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                        };
                    });

                    // Color code status label
                    const sCell = dayRow.getCell(4);
                    sCell.font = { bold: true, name: 'Segoe UI', size: 10 };
                    if (statusLabel === 'Present') {
                        sCell.font.color = { argb: 'FF047857' };
                        sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
                    } else if (statusLabel === 'Absent') {
                        sCell.font.color = { argb: 'FFB91C1C' };
                        sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
                    } else if (statusLabel === 'PL' || statusLabel === 'Leave') {
                        sCell.font.color = { argb: 'FF7E22CE' };
                        sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAF5FF' } };
                    } else if (statusLabel === 'LWP') {
                        sCell.font.color = { argb: 'FFC2410C' };
                        sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } };
                    } else if (statusLabel.startsWith('Half Day')) {
                        sCell.font.color = { argb: 'FF1D4ED8' };
                        sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
                    } else if (statusLabel === 'Weekly Off') {
                        sCell.font.color = { argb: 'FF64748B' };
                    } else if (statusLabel === 'Holiday') {
                        sCell.font.color = { argb: 'FFD97706' };
                        sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
                    }

                    // Color code Late In / Early Out
                    const tCell = dayRow.getCell(8);
                    tCell.font = { name: 'Segoe UI', size: 10, bold: timingRemarks !== '—' && timingRemarks !== 'On Time' };
                    if (lateText || earlyText) tCell.font.color = { argb: 'FFD97706' };
                    else if (timingRemarks === 'On Time') tCell.font.color = { argb: 'FF059669' };
                });

                // Total worked hours summary row for this employee
                const totEmpRow = ws.addRow([
                    'Total Worked Hours',
                    '', '', '', '', '',
                    formatHoursMinutes(totalHoursSum),
                    ''
                ]);
                totEmpRow.height = 22;
                ws.mergeCells(`A${totEmpRow.number}:F${totEmpRow.number}`);
                for (let c = 1; c <= 8; c++) {
                    const cell = totEmpRow.getCell(c);
                    cell.font = { bold: true, name: 'Segoe UI', size: 10, color: { argb: 'FF0F172A' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
                        bottom: { style: 'thin', color: { argb: 'FF94A3B8' } }
                    };
                    if (c === 1) cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
                    else if (c === 7) cell.alignment = { horizontal: 'center', vertical: 'middle' };
                }

                // Spacer row between employees
                ws.addRow([]);
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(
            new Blob([buffer], { type: 'application/octet-stream' }),
            `AttendanceReport_${startDate}_to_${endDate}.xlsx`
        );
    };

    const filtered = reportData.filter(e => {
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction && e.username === 'dev_master') {
            return false;
        }
        if (String(e.role || '').trim().toLowerCase() === 'driver') {
            return false;
        }
        // Hide 'dev_master' by default (when search is empty)
        if (e.username === 'dev_master' && !searchTerm.trim()) {
            return false;
        }

        const matchesSearch = e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              e.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (e.username && e.username.toLowerCase().includes(searchTerm.toLowerCase()));
        
        let matchesStatus = true;
        if (statusFilter !== 'all') {
            // Find the robust processed status for the specific targeted end date
            const targetDateReport = e.history?.find(h => h.date === endDate);
            const rawTargetStatus = targetDateReport ? String(targetDateReport.status || '').toLowerCase() : 'absent';
            const targetStatus = rawTargetStatus === 'incomplete' ? 'missed_punch' : rawTargetStatus;
            const selectedStatus = String(statusFilter || '').toLowerCase();
            
            matchesStatus = targetStatus === selectedStatus;
        }
        
        return matchesSearch && matchesStatus;
    });

    const totalEmp = filtered.length;

    const groups = React.useMemo(() => {
        if (groupBy === 'organization') {
            const g = {};
            filtered.forEach(e => {
                const orgName = e.company_name || 'Unassigned Organization';
                if (!g[orgName]) g[orgName] = [];
                g[orgName].push(e);
            });
            // Sort organizations alphabetically
            return Object.keys(g).sort().reduce((acc, key) => {
                acc[key] = g[key];
                return acc;
            }, {});
        }

        // Default: Group by Status using endDate from history
        const g = {
            'Present': [],
            'Late': [],
            'Half Day': [],
            'Absent': [],
            'Leave': [],
            'Missed Punch': [],
            'Weekly Off': [],
            'Holiday': [],
            'Other': []
        };
        filtered.forEach(e => {
            const targetDateReport = e.history?.find(h => h.date === endDate);
            let targetStatus = targetDateReport ? String(targetDateReport.status || '').toLowerCase() : 'absent';
            
            if (targetStatus === 'present') g['Present'].push(e);
            else if (targetStatus === 'late') g['Late'].push(e);
            else if (targetStatus === 'half_day') g['Half Day'].push(e);
            else if (targetStatus === 'absent') g['Absent'].push(e);
            else if (targetStatus === 'leave' || targetStatus === 'pending_leave') g['Leave'].push(e);
            else if (targetStatus === 'incomplete' || targetStatus === 'missed_punch') g['Missed Punch'].push(e);
            else if (targetStatus === 'weekly_off') g['Weekly Off'].push(e);
            else if (targetStatus === 'holiday') g['Holiday'].push(e);
            else g['Other'].push(e);
        });
        return g;
    }, [filtered, endDate, groupBy, dashboardData]);

    // Auto-open drawer if navigated from dashboard corrections tab
    useEffect(() => {
        const openId = location.state?.openUserId;
        if (openId && filtered.length > 0 && !selectedEmp) {
            const emp = filtered.find(e => String(e.id) === String(openId) || String(e._id) === String(openId));
            if (emp) {
                setActiveTab('attendance');
                openDrawer(emp, 'attendance');
                // Clear state so it doesn't re-open on drawer close
                navigate(location.pathname, { replace: true, state: { ...location.state, openUserId: undefined } });
            }
        }
    }, [filtered, location.state, location.pathname, selectedEmp, navigate]);

    return (
        <div className="ar-console">

            {/* -- HERO -- */}
            <div className="ar-hero">
                <div className="ar-hero-inner">
                    <div>
                        <h1 className="ar-hero-title">{isAdmin ? 'Organisation Report' : 'Team Report'}</h1>
                        <p className="ar-hero-sub">
                            {isAdmin ? 'Company-wide attendance summary & compliance analysis' : "Your team's attendance performance"}
                        </p>
                    </div>
                    <div className="ar-hero-controls">
                        <button className="ar-hero-btn" onClic  k={fetchReport}><FiRefreshCw size={13} /> Refresh</button>
                        
                        {showDailySummary && (
                            <div className="ar-group-toggle" style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '2px', border: '1px solid #e2e8f0' }}>
                                <button 
                                    onClick={() => setGroupBy('status')}
                                    style={{ 
                                        padding: '4px 10px', fontSize: '11px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                        background: groupBy === 'status' ? '#fff' : 'transparent',
                                        boxShadow: groupBy === 'status' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                        color: groupBy === 'status' ? '#0f172a' : '#64748b',
                                        fontWeight: groupBy === 'status' ? '700' : '500'
                                    }}
                                >Status</button>
                                <button 
                                    onClick={() => setGroupBy('organization')}
                                    style={{ 
                                        padding: '4px 10px', fontSize: '11px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                        background: groupBy === 'organization' ? '#fff' : 'transparent',
                                        boxShadow: groupBy === 'organization' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                        color: groupBy === 'organization' ? '#0f172a' : '#64748b',
                                        fontWeight: groupBy === 'organization' ? '700' : '500'
                                    }}
                                >Organization</button>
                            </div>
                        )}

                        {isAllowedUser && (
                            <button className={`ar-hero-btn ${showDailySummary ? 'ar-btn-active' : ''}`} onClick={() => setShowDailySummary(!showDailySummary)}>
                                {showDailySummary ? <FiList size={13} style={{ marginRight: '6px' }} /> : <FiGrid size={13} style={{ marginRight: '6px' }} />}
                                {showDailySummary ? 'Table View' : 'Daily Summary'}
                            </button>
                        )}
                        <select
                            value={excelGrouping}
                            onChange={e => setExcelGrouping(e.target.value)}
                            style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                background: '#fff',
                                color: '#0f172a',
                                outline: 'none',
                                cursor: 'pointer',
                                height: '32px',
                                marginRight: '8px'
                            }}
                        >
                            <option value="organization">Organization-wise</option>
                            <option value="team">Team-wise</option>
                            <option value="single">Single Sheet</option>
                        </select>
                        <button className="ar-hero-btn ar-btn-primary" onClick={exportExcel}><FiDownload size={13} /> Export Excel</button>
                    </div>
                </div>
            </div>

            {/* -- SUMMARY DASHBOARD -- */}
            <div className="ar-summary-row">
                <div className="ar-sum-card">
                    <div className="ar-sum-head">
                        <span className="ar-sum-lbl">Total Staff</span>
                        <div className="ar-sum-icon" style={{ background: '#e0f2fe', color: '#0369a1' }}><FiUsers size={16} /></div>
                    </div>
                    <div className="ar-sum-val">{totalEmp}</div>
                    <span className="ar-sum-sub">Active members in scope</span>
                </div>

                <div className="ar-sum-card">
                    <div className="ar-sum-head">
                        <span className="ar-sum-lbl">Average Presence</span>
                        <div className="ar-sum-icon" style={{ background: '#ecfdf5', color: '#059669' }}><FiCheckCircle size={16} /></div>
                    </div>
                    <div className="ar-sum-val">
                        {(() => {
                            if (totalEmp === 0) return '0%';
                            const totalPresent = filtered.reduce((s, e) => s + Number(e.present || 0), 0);
                            const totalAccounted = filtered.reduce((s, e) => s + Number(e.present || 0) + Number(e.absent || 0) + Number(e.leaves || 0), 0);
                            if (totalAccounted === 0) return '0%';
                            return `${((totalPresent / totalAccounted) * 100).toFixed(1)}%`;
                        })()}
                    </div>
                    <span className="ar-sum-sub">Staff attendance rate</span>
                </div>

                <div className="ar-sum-card">
                    <div className="ar-sum-head">
                        <span className="ar-sum-lbl">Late Trends</span>
                        <div className="ar-sum-icon" style={{ background: '#fffbeb', color: '#d97706' }}><FiClock size={16} /></div>
                    </div>
                    <div className="ar-sum-val">{filtered.reduce((s, e) => s + e.late, 0)}</div>
                    <span className="ar-sum-sub">Delayed arrivals this period</span>
                </div>

                <div className="ar-sum-card">
                    <div className="ar-sum-head">
                        <span className="ar-sum-lbl">Average Work Day</span>
                        <div className="ar-sum-icon" style={{ background: '#f3f4f6', color: '#374151' }}><FiBriefcase size={16} /></div>
                    </div>
                    <div className="ar-sum-val">
                        {(() => {
                            let totalHrs = 0;
                            let totalDaysCount = 0;
                            filtered.forEach(e => {
                                totalHrs += Number(e.raw_total_hours || 0);
                                totalDaysCount += Number(e.raw_total_present_days || 0);
                            });
                            const avgValue = totalDaysCount > 0 ? (totalHrs / totalDaysCount) : 0;
                            const hCount = Math.floor(avgValue), mCount = Math.floor((avgValue - hCount) * 60);
                            return `${hCount}h ${mCount}m`;
                        })()}
                    </div>
                    <span className="ar-sum-sub">Staff productivity benchmark</span>
                </div>
            </div>

            {/* -- CONTENT -- */}
            <div className="ar-content">

                {/* Filter bar */}
                <div className="ar-filter-bar">
                    <div className="ar-search">
                        <FiSearch size={14} />
                        <input placeholder="Search by name" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    
                    <select
                        className="ar-input-ctrl ar-select"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        style={{ minWidth: 120 }}
                    >
                        <option value="all">All Status</option>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="late">Late</option>
                        <option value="half_day">Half Day</option>
                        <option value="leave">Leave</option>
                        <option value="missed_punch">Missed Punch</option>
                    </select>

                    {isAdmin && companies.length > 0 && (
                        <select
                            className="ar-input-ctrl ar-select"
                            value={companyId}
                            onChange={e => setCompanyId(e.target.value)}
                            style={{ minWidth: 220 }}
                        >
                            <option value="all">All Companies</option>
                            {companies.map(c => <option key={c._id} value={c._id}>{c.company_name}</option>)}
                        </select>
                    )}

                    {/* Heatmap Legend */}
                    <div className="ar-legend">
                        <div className="ar-leg-item"><div className="ar-leg-dot ar-h-present" /><span>Present</span></div>
                        <div className="ar-leg-item"><div className="ar-leg-dot ar-h-absent" /><span>Absent</span></div>
                        <div className="ar-leg-item"><div className="ar-leg-dot ar-h-late" /><span>Late</span></div>
                        <div className="ar-leg-item"><div className="ar-leg-dot ar-h-half_day" /><span>HD</span></div>
                        <div className="ar-leg-item"><div className="ar-leg-dot ar-h-leave" /><span>Leave</span></div>
                    </div>

                    <div className="ar-filter-right">
                        <div className="ar-date-group">
                            <input type="date" className="ar-input-ctrl" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            <span>—</span>
                            <input type="date" className="ar-input-ctrl" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                        <select className="ar-input-ctrl ar-select" onChange={e => {
                            if (e.target.value === 'custom') return;
                            const [y, m] = e.target.value.split('-');
                            setStartDate(moment([y, m - 1]).startOf('month').format('YYYY-MM-DD'));
                            setEndDate(moment([y, m - 1]).endOf('month').format('YYYY-MM-DD'));
                        }}>
                            <option value="custom">Quick Month...</option>
                            {[0, 1, 2, 3, 4, 5].map(i => {
                                const m = moment().subtract(i, 'months');
                                return <option key={i} value={m.format('YYYY-MM')}>{m.format('MMMM YYYY')}</option>;
                            })}
                        </select>
                    </div>
                </div>

                {/* Table or Summary View */}
                <div className="ar-table-card" style={showDailySummary ? { backgroundColor: 'transparent', boxShadow: 'none' } : {}}>
                    {loading ? (
                        <div className="ar-loading"><div className="ar-spinner" /><p>Generating report...</p></div>
                    ) : showDailySummary ? (
                        <DailySummaryView groups={groups} startDate={startDate} endDate={endDate} />
                    ) : (
                        <div className="ar-table-scroll">
                            <table className="ar-table">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>In/Out</th>
                                        <th>Correction</th>
                                        <th style={{ textAlign: 'center' }} title="Present Days">P</th>
                                        <th style={{ textAlign: 'center' }} title="Absent Days (including 0.5 per half day)">A</th>
                                        <th style={{ textAlign: 'center' }} title="Late Count">L</th>
                                        <th style={{ textAlign: 'center' }} title="Leave Count">LV</th>
                                        <th style={{ textAlign: 'center' }} title="Total Week Off and Holiday">WO+HD</th>
                                        <th style={{ textAlign: 'center' }} title="Total Working Days (Present + PL + Holiday + Week Off)">Tot Work</th>
                                        <th>Work Hrs</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length > 0 ? filtered.map(emp => {
                                        const pCount = getPresentDaysForReport(emp);
                                        const aCount = getAbsentDaysForReport(emp);
                                        const woHdCount = getTotalWeekOffAndHoliday(emp);
                                        const totWork = getTotalWorkingDays(emp);
                                        return (
                                        <tr key={emp.id} className="ar-row">
                                            <td onClick={() => openDrawer(emp, 'attendance')}>
                                                <div className="ar-emp-cell">
                                                    <div className="ar-avatar" style={{ position: 'relative' }}>
                                                        {emp.name?.[0]}
                                                        <span className={`status-dot ${emp.latestRecord?.status === 'present' ? 'online' : 'offline'}`} />
                                                    </div>
                                                    <div>
                                                    <div className="ar-emp-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {emp.name}
                                                        {pendingCorrectionCounts[emp.id] > 0 && (
                                                            <span style={{
                                                                width: '8px',
                                                                height: '8px',
                                                                backgroundColor: '#dc2626',
                                                                borderRadius: '50%',
                                                                display: 'inline-block'
                                                            }} title={`${pendingCorrectionCounts[emp.id]} pending regularization requests`} />
                                                        )}
                                                        {isAdmin && (
                                                            <button 
                                                                className={`ar-quick-punch ${emp.latestRecord?.status === 'present' ? 'punch-out' : 'punch-in'}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleQuickPunch(emp.id, emp.latestRecord?.status, emp.name);
                                                                }}
                                                                title={`Record ${emp.latestRecord?.status === 'present' ? 'OUT' : 'IN'} punch`}
                                                            >
                                                                {emp.latestRecord?.status === 'present' ? '🔴 Out' : '🟢 In'}
                                                            </button>
                                                        )}
                                                    </div>
                                                    {(emp.weekoff_policy_name || emp.holiday_policy_name) && (
                                                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                            {emp.weekoff_policy_name ? `WO: ${emp.weekoff_policy_name}` : 'WO: -'}
                                                            {' | '}
                                                            {emp.holiday_policy_name ? `HD: ${emp.holiday_policy_name}` : 'HD: -'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    <div className="ar-punch-cell">
                                                        <FiLogIn size={11} className="icon-in" />
                                                        <span>{emp.latestRecord?.first_in ? fmtTime(emp.latestRecord.first_in) : '--:--'}</span>
                                                    </div>
                                                    <div className="ar-punch-cell">
                                                        <FiLogOut size={11} className="icon-out" />
                                                        <span>{emp.latestRecord?.last_out ? fmtTime(emp.latestRecord.last_out) : '--:--'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <button className="ar-act-btn ar-btn-edit" style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }} onClick={() => { setActiveTab('attendance'); openDrawer(emp, 'attendance'); }}>
                                                    View
                                                </button>
                                            </td>
                                            <td style={{ textAlign: 'center' }}><span className="ar-count ar-c-green">{pCount}</span></td>
                                            <td style={{ textAlign: 'center' }}><span className="ar-count ar-c-red">{aCount}</span></td>
                                            <td style={{ textAlign: 'center' }}><span className="ar-count ar-c-amber">{emp.late}</span></td>
                                            <td style={{ textAlign: 'center' }}><span className="ar-count ar-c-purple">{emp.leaves || 0}</span></td>
                                            <td style={{ textAlign: 'center' }}><span className="ar-count" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' }}>{woHdCount}</span></td>
                                            <td style={{ textAlign: 'center' }}><span className="ar-count" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontWeight: 800 }}>{totWork}</span></td>
                                            <td>
                                                <div className="ar-hours-wrap">
                                                    <span className="ar-hours-val">{formatHoursMinutes(emp.avgHours)} avg.</span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div className="ar-actions-cell">
                                                    {/* {isAdmin && (
                                                        <button className="ar-act-btn ar-btn-edit" onClick={() => openDrawer(emp, 'details')} title="Edit Profile & Job">
                                                            <FiEdit size={13} />
                                                        </button>
                                                    )} */}
                                                    <button className="ar-act-btn ar-btn-log" onClick={() => openDrawer(emp, 'attendance')} title={isAdmin ? "View & Edit Attendance Log" : "View Attendance Log"}>
                                                        <FiFileText size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                    }) : (
                                        <tr><td colSpan={11} className="ar-empty-row">No data found for the selected range.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* -- 360° PERSONNEL HUB (DRAWER) -- */}
            <div className={`ar-overlay${selectedEmp ? ' open' : ''}`} onClick={() => setSelectedEmp(null)}>
                <div className="ar-drawer" onClick={e => e.stopPropagation()}>
                    <div className="ar-drawer-head">
                        <div className="ar-hub-top">
                            <div className="ar-hub-hero">
                                <div className="ar-hub-avatar">{selectedEmp?.name?.[0]}</div>
                                <div className="ar-hub-meta">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <h2>{selectedEmp?.name}</h2>
                                        {isAdmin && (
                                            <button 
                                                onClick={() => setShowLeaveModal(true)}
                                                style={{
                                                    background: '#0f172a',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    padding: '2px 8px',
                                                    fontSize: '10px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Apply Leave
                                            </button>
                                        )}
                                    </div>
                                    <span className="ar-hub-dept">Team Member</span>
                                </div>
                            </div>
                            <button className="ar-drawer-close" onClick={() => setSelectedEmp(null)} title="Close Drawer"><FiX size={15} /></button>
                        </div>

                        <div className="ar-tabs-nav">
                            <button className={`ar-tab-link ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>
                                <FiActivity size={14} /> Performance
                            </button>
                            {/* <button className={`ar-tab-link ${activeTab === 'leaves' ? 'active' : ''}`} onClick={() => setActiveTab('leaves')}>
                                <FiCalendar size={14} /> Leave Hub
                                {profileData?.pendingLeaves?.length > 0 && <span className="ar-tab-badge">{profileData.pendingLeaves.length}</span>}
                            </button>
                            <button className={`ar-tab-link ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>
                                <FiUser size={14} /> Job Profile
                            </button> */}
                        </div>
                    </div>

                    <div className="ar-drawer-body">
                        {loadingHistory ? (
                            <div className="ar-loading-full"><div className="ar-spinner" /><p>Consulting HR Database...</p></div>
                        ) : (
                            <div className="ar-tab-pane">
                                {activeTab === 'attendance' && (
                                    <>
                                        {/* Performance Scorecard */}
                                        <div className="ar-hub-scorecard">
                                            <div className="ar-score-pill"><span className="ar-score-lbl">Present</span><span className="ar-score-val ar-c-green">{continuityStats.present}</span></div>
                                            <div className="ar-score-pill"><span className="ar-score-lbl">Absent</span><span className="ar-score-val ar-c-red">{continuityStats.absent}</span></div>
                                            <div className="ar-score-pill"><span className="ar-score-lbl">Late</span><span className="ar-score-val ar-c-amber">{continuityStats.late}</span></div>
                                            <div className="ar-score-pill"><span className="ar-score-lbl">Leaves</span><span className="ar-score-val ar-c-blue">{continuityStats.leaves}</span></div>
                                            <div className="ar-score-pill"><span className="ar-score-lbl">Weekly Off</span><span className="ar-score-val" style={{ color: '#64748b' }}>{continuityStats.weeklyOff}</span></div>
                                            <div className="ar-score-pill"><span className="ar-score-lbl">Holidays</span><span className="ar-score-val" style={{ color: '#c2410c' }}>{continuityStats.holidays}</span></div>
                                        </div>

                                        {/* Professional Calendar Insight */}
                                        <div className="ar-cal-preview">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                                                <h4 className="ar-pane-title" style={{ margin: 0 }}>Attendance Continuity</h4>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <button 
                                                        onClick={() => {
                                                            const prev = moment([browseYear, browseMonth - 1]).subtract(1, 'month');
                                                            setBrowseYear(prev.year());
                                                            setBrowseMonth(prev.month() + 1);
                                                        }}
                                                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}
                                                    >←</button>
                                                    <span style={{ fontSize: '13px', fontWeight: '700', minWidth: '100px', textAlign: 'center' }}>
                                                        {moment([browseYear, browseMonth - 1]).format('MMMM YYYY')}
                                                    </span>
                                                    <button 
                                                        onClick={() => {
                                                            const next = moment([browseYear, browseMonth - 1]).add(1, 'month');
                                                            setBrowseYear(next.year());
                                                            setBrowseMonth(next.month() + 1);
                                                        }}
                                                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}
                                                    >→</button>
                                                </div>
                                            </div>

                                            {isAdmin && (
                                                <div style={{ 
                                                    marginBottom: '20px', 
                                                    background: '#f8fafc', 
                                                    padding: '12px', 
                                                    borderRadius: '12px', 
                                                    border: '1px solid #e2e8f0'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                                        <FiActivity size={14} color="#4f46e5" />
                                                        <span style={{ fontSize: '13px', fontWeight: '700' }}>Admin Controls</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={fullMonthPresenceEnabled} 
                                                                onChange={(e) => setFullMonthPresenceEnabled(e.target.checked)} 
                                                            />
                                                            Enable Full Month Presence
                                                        </label>
                                                        
                                                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                            Mark all working days as present, skipping week-offs and preserving leaves.
                                                        </div>

                                                        <button 
                                                            onClick={handleApplyFullMonthPresence} 
                                                            disabled={applyingFullMonth || !fullMonthPresenceEnabled}
                                                            style={{ 
                                                                width: '100%', 
                                                                padding: '8px', 
                                                                background: '#0f172a', 
                                                                color: '#fff', 
                                                                border: 'none', 
                                                                borderRadius: '6px', 
                                                                fontWeight: '700', 
                                                                fontSize: '12px',
                                                                cursor: 'pointer',
                                                                opacity: fullMonthPresenceEnabled ? 1 : 0.5
                                                            }}
                                                        >
                                                            {applyingFullMonth ? 'Applying...' : 'Mark Full Month Present'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="ar-cal-grid">
                                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="ar-day-header">{d}</div>)}
                                                {(() => {
                                                    const startOfMonth = moment([browseYear, browseMonth - 1]).startOf('month');
                                                    const endOfMonth = moment([browseYear, browseMonth - 1]).endOf('month');
                                                    const days = [];

                                                    // Padding for first week
                                                    for (let i = 0; i < startOfMonth.day(); i++) days.push(<div key={`pad-${i}`} className="ar-cal-day empty" />);

                                                    // Days of month
                                                    for (let day = 1; day <= endOfMonth.date(); day++) {
                                                        const dateStr = moment([browseYear, browseMonth - 1, day]).format('YYYY-MM-DD');
                                                        const rec = empHistory.find(r => r.attendance_date && getAttendanceDateKey(r.attendance_date) === dateStr);
                                                        const isToday = dateStr === moment().format('YYYY-MM-DD');
                                                        // Robust half-day detection synced with EmployeeProfileWorkspace
                                                        const explicitStatus = String(rec?.status || '').toLowerCase();
                                                        const isHalfFlag = explicitStatus
                                                            ? explicitStatus === 'half_day'
                                                            : Boolean(rec?.is_half_day || rec?.isHalfDay || rec?.is_half || rec?.half_day);
                                                        const displayStatus = isHalfFlag ? 'half_day' : (rec?.status || 'none');
                                                        
                                                        const statusClass = getCalendarStatusClass(displayStatus);
                                                        let statusBadge = getCalendarStatusBadge(displayStatus);

                                                        if (displayStatus === 'half_day') {
                                                            const session = rec?.half_day_session || rec?.start_half_session || rec?.end_half_session || '';
                                                            statusBadge = session.toLowerCase().includes('first') ? '1st Half' : (session.toLowerCase().includes('second') ? '2nd Half' : '½ Day');
                                                        }

                                                        const lType = rec?.leaveType || rec?.leave_type;
                                                        const lStatus = rec?.leaveStatus || rec?.approval_status;
                                                        let leaveBadge = null;
                                                        let isLeavePending = false;
                                                        if (lType) {
                                                            const badge = formatLeaveBadge(lType);
                                                            const isApproved = lStatus === 'approved';
                                                            const isPending = lStatus && lStatus !== 'approved' && !['rejected', 'cancelled', 'withdrawn'].includes(lStatus);
                                                            isLeavePending = isPending;
                                                            const statusTxt = isApproved ? 'Approved' : (isPending ? 'Pending' : 'Applied');
                                                            
                                                            if (rec?.status === 'half_day') {
                                                                statusBadge = `${statusBadge} (${badge})`;
                                                                leaveBadge = statusTxt;
                                                            } else {
                                                                leaveBadge = `${badge} ${statusTxt}`;
                                                            }
                                                        }

                                                        days.push(
                                                            <div
                                                                key={day}
                                                                className={`ar-cal-day ${statusClass} ${isToday ? 'today' : ''}`}
                                                                onClick={() => {
                                                                    // Allowing both ADMIN and HOD to edit/adjust
                                                                    if (rec) startEdit(rec, dateStr);
                                                                    else startEdit({ attendance_date: dateStr, status: 'absent' });
                                                                }}
                                                                title={rec ? `${getAttendanceDateLabel(dateStr)}: ${rec.status}` : 'No Record'}
                                                            >
                                                                <span className="ar-day-num">{day}</span>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', width: '100%' }}>
                                                                    {statusBadge && <span className={`ar-day-badge ${statusClass}`}>{statusBadge}</span>}
                                                                    {leaveBadge && <span className={`ar-day-badge ${isLeavePending ? 'pending_leave' : 'leave'}`}>{leaveBadge}</span>}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return days;
                                                })()}
                                            </div>

                                            <div className="ar-correction-req-wrap">
                                                <div className="ar-correction-req-head">
                                                    <h4 className="ar-pane-title" style={{ margin: 0 }}>Attendance Correction Requests</h4>
                                                    <span className="ar-correction-req-count">{correctionHistory.length}</span>
                                                </div>

                                                {correctionHistory.length === 0 ? (
                                                    <div className="ar-correction-empty">No correction requests for this period.</div>
                                                ) : (
                                                    <div className="ar-correction-list">
                                                        {correctionHistory.map((request) => {
                                                            const statusMeta = getCorrectionStatusMeta(request);
                                                            return (
                                                                <div key={request._id || `${request.attendance_date}-${request.createdAt || ''}`} className="ar-correction-item">
                                                                    <div className="ar-correction-item-main">
                                                                        <div className="ar-correction-item-top">
                                                                            <span className="ar-correction-date">{formatAttendanceDate(request.attendance_date, 'dd MMM yyyy')}</span>
                                                                            <span className={`ar-correction-status ${statusMeta.className}`}>{statusMeta.label}</span>
                                                                        </div>
                                                                        <div className="ar-correction-reason">{request.reason || 'No details provided'}</div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>


                                    </>
                                )}

                                {activeTab === 'leaves' && (
                                    <div className="ar-leaves-hub">
                                        {profileData?.pendingLeaves?.length > 0 && (
                                            <div className="ar-job-card" style={{ borderLeft: '4px solid #f59e0b', marginBottom: 20 }}>
                                                <h4 className="ar-job-section-title" style={{ color: '#b45309' }}><FiAlertTriangle size={14} /> Action Required: Pending Leaves</h4>
                                                <div className="ar-pending-list">
                                                    {profileData.pendingLeaves.map(leave => (
                                                        <div key={leave._id} className="ar-pending-item">
                                                            <div className="ar-pending-info">
                                                                <div className="ar-p-type">{leave.leave_policy_id?.policy_name || leave.leave_type}</div>
                                                                <div className="ar-p-dates">
                                                                    {formatAttendanceDate(leave.from_date, 'dd MMM')} - {formatAttendanceDate(leave.to_date, 'dd MMM')} 
                                                                    <span className="ar-p-days">({leave.total_days} days)</span>
                                                                </div>
                                                                {leave.reason && <div className="ar-p-reason">"{leave.reason}"</div>}
                                                            </div>
                                                            <div className="ar-pending-actions">
                                                                <button className="ar-p-btn reject" onClick={() => handleApproveLeave(leave._id, 'rejected')}>Reject</button>
                                                                <button className="ar-p-btn approve" onClick={() => handleApproveLeave(leave._id, 'approved')}>Approve</button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="ar-job-card">
                                            <h4 className="ar-job-section-title">Leave Balance & Usage</h4>
                                            <div className="ar-leave-balances">
                                                {profileData?.balances?.map(bal => {
                                                    const usedFromHistory = (profileData.leaves || [])
                                                        .filter(lv => lv.approval_status === 'approved' && (lv.leave_policy_id?._id === bal.leave_policy_id?._id || lv.leave_policy_id === bal.leave_policy_id?._id))
                                                        .reduce((s, lv) => s + (lv.total_days || 0), 0);

                                                    const totalQuota = bal.total ?? bal.annual_quota ?? bal.opening_balance ?? 0;

                                                    return (
                                                        <div key={bal._id} className="ar-bal-card">
                                                            <div className="ar-bal-type">{bal.leave_policy_id?.leave_type?.toUpperCase() || bal.leave_type?.toUpperCase()}</div>
                                                            <div className="ar-bal-main">
                                                                <span className="ar-val-used">{usedFromHistory}</span>
                                                                <span className="ar-val-sep">of</span>
                                                                <span className="ar-val-total">{totalQuota}</span>
                                                                <span className="ar-bal-unit"> days used</span>
                                                            </div>
                                                            <div className="ar-bal-sub-lbl">Available: {bal.closing_balance} days</div>
                                                        </div>
                                                    );
                                                })}
                                                {(!profileData?.balances || profileData.balances.length === 0) && (
                                                    <div className="ar-empty-state">No leave policies assigned</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="ar-job-card" style={{ marginTop: '20px' }}>
                                            <h4 className="ar-job-section-title">Leave Usage Dates</h4>
                                            <div className="ar-leave-history-list">
                                                {leaveHistory.length === 0 ? (
                                                    <div className="ar-empty-state">
                                                        <p>No used leave records to display</p>
                                                    </div>
                                                ) : (
                                                    <table className="ar-history-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Leave Type</th>
                                                                <th style={{ textAlign: 'right' }}>Dates Used</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {leaveHistory.map((lv, idx) => (
                                                                <tr key={idx}>
                                                                    <td>
                                                                        <strong>{lv.leave_policy_id?.leave_type?.toUpperCase() || lv.leave_type?.toUpperCase() || 'LEAVE'}</strong>
                                                                    </td>
                                                                    <td style={{ textAlign: 'right' }}>
                                                                        <div className="ar-lv-date-cell" style={{ alignItems: 'flex-end' }}>
                                                                            <span>{formatAttendanceDate(lv.from_date, 'dd MMM yyyy')}</span>
                                                                            {lv.total_days > 1 && (
                                                                                <small>to {formatAttendanceDate(lv.to_date, 'dd MMM yyyy')} ({lv.total_days} days)</small>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'details' && (
                                    <div className="ar-job-profile">
                                        <div className="ar-job-card">
                                            <h4 className="ar-job-section-title"><FiUser size={14} /> Employment Record</h4>
                                            <div className="ar-job-fields">
                                                <div className="ar-field-group"><label>Official Name</label><div className="ar-field-val">{selectedEmp?.name}</div></div>
                                                <div className="ar-field-group"><label>Employee Code</label><div className="ar-field-val">{jobForm.employee_code}</div></div>
                                                <div className="ar-field-group"><label>Work Shift</label>
                                                    <select className="ar-select-mini" value={jobForm.shift_id} onChange={e => setJobForm({ ...jobForm, shift_id: e.target.value })}>
                                                        {shifts.map(s => <option key={s._id} value={s._id}>{s.shift_name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="ar-field-group"><label>System Role</label><div className="ar-field-val">{jobForm.role}</div></div>
                                                <div className="ar-field-group">
                                                    <label>Security Status</label>
                                                    {isAdmin ? (
                                                        <select className="ar-select-mini" value={jobForm.isActive ? 'true' : 'false'} onChange={e => setJobForm({ ...jobForm, isActive: e.target.value === 'true' })}>
                                                            <option value="true">Authorized / Active</option>
                                                            <option value="false">Deactivated</option>
                                                        </select>
                                                    ) : (
                                                        <div className={`ar-field-val ${jobForm.isActive ? 'ar-c-green' : 'ar-c-red'}`}>
                                                            {jobForm.isActive ? 'Authorized / Active' : 'Deactivated'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ marginTop: 30, display: 'flex', justifyContent: 'flex-end' }}>
                                                <button className="ar-save-btn" style={{ width: 'auto', padding: '10px 24px' }} onClick={saveProfile}>Commit Changes</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {editingId && (
                <div className="ar-edit-modal-overlay" onClick={() => setEditingId(null)}>
                    <div className="ar-edit-box" onClick={e => e.stopPropagation()}>
                        <div className="ar-edit-header">
                            <h3 className="ar-pane-title">Record Adjustment: {moment(editForm.attendance_date).format('DD MMMM YYYY')}</h3>
                            <button className="ar-edit-close" onClick={() => setEditingId(null)}><FiX size={18} /></button>
                        </div>
                        {/* <div className="ar-alert-box" style={{ backgroundColor: '#fff4e5', color: '#663c00', padding: '10px', borderRadius: '4px', fontSize: '13px', marginBottom: '15px', border: '1px solid #ffe8cc' }}>
                            💡 <strong>Security Warning:</strong> You cannot modify raw biometric/web punch events. You are adjusting the official summary record.
                        </div>
                        {editingId && !hasInitialPunchIn && (
                            <div className="ar-alert-box" style={{ backgroundColor: '#edf7ff', color: '#0f4c81', padding: '10px', borderRadius: '4px', fontSize: '13px', marginBottom: '12px', border: '1px solid #cfe8ff' }}>
                                ℹ️ <strong>No punch-in found:</strong> Time Correction and Status Correction (Time Unchanged) are disabled. Use Status Correction.
                            </div>
                        )} */}
                        <div className="ar-edit-grid">
                            <div className="ar-edit-field">
                                <label>Status</label>
                                <select
                                    value={editForm.status}
                                    onChange={e => {
                                        const nextStatus = e.target.value;
                                        setEditForm((prev) => ({
                                            ...prev,
                                            status: nextStatus,
                                            half_day_session: nextStatus === 'half_day' ? (prev.half_day_session || 'first_half') : null
                                        }));
                                    }}
                                >
                                    <option value="incomplete">Missed Punch (MP)</option>
                                    <option value="present">Present (P)</option>
                                    <option value="absent">Absent (A)</option>
                                    <option value="half_day">Half Day</option>
                                    <option value="leave">Leave</option>
                                    <option value="weekly_off">Weekly Off</option>
                                    <option value="holiday">Holiday</option>
                                </select>
                            </div>
                            <div className="ar-edit-field">
                                <label>Assigned Shift</label>
                                <select
                                    value={editForm.shift_id || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, shift_id: e.target.value }))}
                                >
                                    <option value="">Select Shift</option>
                                    {assignedShiftOptions.map((s) => (
                                        <option key={s._id} value={s._id}>
                                            {s.shift_name || 'Shift'} ({s.start_time || '--:--'} - {s.end_time || '--:--'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {editForm.status === 'half_day' && (
                                <div className="ar-edit-field" style={{ gridColumn: '1 / -1' }}>
                                    <label>Half Day Session</label>
                                    <select
                                        value={editForm.half_day_session || 'first_half'}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, half_day_session: e.target.value }))}
                                    >
                                        <option value="first_half">First Half</option>
                                        <option value="second_half">Second Half</option>
                                    </select>
                                </div>
                            )}
                            <div className="ar-edit-field">
                                <label>Official In-Time (Punch-In)</label>
                                <input
                                    type="datetime-local"
                                    value={editForm.first_in || ''}
                                    onChange={e => setEditForm(prev => ({ ...prev, first_in: e.target.value }))}
                                />
                            </div>
                            <div className="ar-edit-field">
                                <label>Official Out-Time (Punch-Out)</label>
                                <input
                                    type="datetime-local"
                                    value={editForm.last_out || ''}
                                    onChange={e => setEditForm(prev => ({ ...prev, last_out: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="ar-edit-field" style={{ marginTop: '15px' }}>
                            <label>Administrative Remarks</label>
                            <textarea placeholder="Reason for change..." value={editForm.remarks} onChange={e => setEditForm({ ...editForm, remarks: e.target.value })} />
                        </div>
                        <div className="ar-edit-actions">
                            <button className="ar-cancel" onClick={() => setEditingId(null)}>Discard</button>
                            <button className="ar-save" onClick={saveEdit} disabled={saving}>{saving ? 'Processing...' : 'Verify & Save'}</button>
                        </div>
                    </div>
                </div>
            )}

            {isAdmin && selectedEmp && (
                <AdminApplyLeaveModal 
                    isOpen={showLeaveModal}
                    onClose={() => setShowLeaveModal(false)}
                    employeeId={selectedEmp.id}
                    employeeName={selectedEmp.name}
                    onSuccess={() => {
                        fetchBrowseHistory();
                        fetchReport();
                    }}
                />
            )}

            {isAdmin && selectedEmp && (
                <div className="ar-fixed-footer">
                    <button className="ar-drawer-footer-btn" onClick={() => { setSelectedEmp(null); navigate('/attendance/admin/attendance'); }}>
                        <FiEdit size={14} /> Global Adjustment Center
                    </button>
                    {/* Note: In EXIM integration, this button likely points to the same page or a specialized management page.
                        For now, corrected to the valid integrated route. */}
                </div>
            )}
        </div>
    );
};

export default AttendanceReport;
