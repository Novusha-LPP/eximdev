import React, { useState, useEffect, useMemo } from 'react';
import {
    FiX, FiLogIn, FiLogOut, FiEdit, FiFileText, FiUsers, FiAlertTriangle,
    FiUser, FiBriefcase, FiActivity, FiArrowRight, FiRefreshCw, FiDownload, FiCalendar, FiSearch, FiCheckCircle, FiClock, FiList, FiGrid,
    FiChevronDown, FiChevronRight
} from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import attendanceAPI from '../../api/attendance/attendance.api';
import masterAPI from '../../api/attendance/master.api';
import { formatTime12Hr, minutesToHours, formatDate } from './utils/helpers';
import moment from 'moment';
import toast from 'react-hot-toast';
import { UserContext } from '../../contexts/UserContext';
import AdminApplyLeaveModal from './admin/AdminApplyLeaveModal';
import './AttendanceReport.css';

const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
const formatSession = (s) => (s === 'first_half' ? '1st Half' : '2nd Half');

const getCalendarStatusClass = (status = '') => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'weekly_off' || normalized === 'weekoff' || normalized === 'off') return 'weekly_off';
    if (normalized === 'present_late') return 'late';
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
        pending_leave: 'PLV'
    };
    return map[normalized] || '';
};

const StatusPill = ({ status, session }) => {
    const map = { 
        present: ['Present', 'present'], 
        absent: ['Absent', 'absent'], 
        leave: ['Leave', 'leave'], 
        pending_leave: ['Pending Leave', 'pending-leave'],
        half_day: ['Half Day', 'half-day'], 
        weekly_off: ['Off', 'off'], 
        holiday: ['Holiday', 'holiday'] 
    };
    const [label, cls] = map[status] || [status, 'default'];
    return (
        <span className={`ar-status-pill ar-pill-${cls}`}>
            {status === 'half_day' ? (session ? (session === 'First Half' || session === 'first_half' ? '1st Half' : '2nd Half') : ' ½ Day') : label}
        </span>
    );
};

const RenderHeatmap = ({ history, startDate, endDate }) => {
    const start = moment.utc(startDate);
    const end = moment.utc(endDate);
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
                    'Absent': '#ef4444', 'Leave': '#8b5cf6', 'Other': '#64748b'
                };
                const bgColors = {
                    'Present': '#ecfdf5', 'Late': '#fffbeb', 'Half Day': '#eff6ff',
                    'Absent': '#fef2f2', 'Leave': '#f5f3ff', 'Other': '#f8fafc'
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
                            <div className="ar-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                                {employees.map(e => (
                                    <div key={e.id} className="ar-summary-item" style={{ backgroundColor: '#fff', border: '2px solid #000000', padding: '12px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                        <div className="ar-si-name" style={{ fontWeight: 800, fontSize: '13px', color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</div>
                                        <div className="ar-si-meta" style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', marginTop: '4px', marginBottom: '8px' }}>
                                            <FiBriefcase size={10} style={{ marginRight: 4 }}/> 
                                            <span className="ar-si-co" title={e.company_name}>{e.company_name?.substring(0, 20) || '-'}</span>
                                        </div>
                                        <div className="ar-si-stats" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#000', borderTop: '2px solid #000000', paddingTop: '8px', marginTop: '4px' }}>
                                            <span title="Present Count">P: <span style={{ color: '#10b981', fontWeight: '800' }}>{e.present}</span></span>
                                            <span title="Absent Count">A: <span style={{ color: '#ef4444', fontWeight: '800' }}>{e.absent}</span></span>
                                            <span title="Late Count">L: <span style={{ color: '#f59e0b', fontWeight: '800' }}>{e.late}</span></span>
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
    const ALLOWED_USERNAMES = React.useMemo(() => new Set(['shalini_arun', 'manu_pillai', 'suraj_rajan', 'rajan_aranamkatte', 'uday_zope']), []);
    const normalizedRole = normalizeRole(user?.role);
    const isHOD = normalizedRole === 'HOD' || normalizedRole === 'HEADOFDEPARTMENT';
    const isAdmin = Boolean(isAdminProp) && normalizedRole === 'ADMIN';
    const isAllowedUser = isAdmin || isHOD || ALLOWED_USERNAMES.has(user?.username);
    const [showDailySummary, setShowDailySummary] = useState(false);

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
    const isTimeCorrectionDisabled = shouldForceStatusCorrection || editForm.correction_mode === 'status_correction';

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
            if (isAdmin) {
                r = await attendanceAPI.getAdminAttendanceReport(startDate, endDate, undefined, companyId);
            } else {
                r = await attendanceAPI.getTeamAttendanceReport(startDate, endDate, 'all');
            }
            setReportData(r?.data || []);
        } catch (err) {
            console.error('[AttendanceReport] fetchReport error:', err?.response?.status || err?.status, err?.response?.data || err?.message || err);
            toast.error(err?.response?.data?.message || err?.message || 'Failed to load report');
        }
        finally { setLoading(false); }
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
            await attendanceAPI.punch({ 
                type, 
                employee_id: empId, 
                method: 'Admin-Report-Panel' 
            });
            toast.success(`Quick punch ${type} recorded for ${empName}!`);
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
            const status = getCalendarStatusClass(rec?.status);
            if (status === 'present') stats.present += 1;
            if (status === 'late') {
                stats.late += 1;
                stats.present += 1;
            }
            if (status === 'absent') stats.absent += 1;
            if (status === 'leave') stats.leaves += 1;
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
                    return { _id: s, shift_name: 'Assigned Shift', start_time: '09:00', end_time: '18:00', half_day_hours: 4 };
                }
                return s;
            })
            .filter((s) => s && s._id && !seen.has(String(s._id)) && seen.add(String(s._id)));
    }, [profileData?.employee]);

    const toEditDateTime = (attendanceDate, hhmm = '09:00') => {
        const [hh, mm] = String(hhmm || '09:00').split(':').map((v) => Number(v));
        // Force local time interpretation by using the browser's local moment
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

        if (statusNormalized === 'absent' || statusNormalized === 'leave' || statusNormalized === 'weekly_off' || statusNormalized === 'holiday') {
            return { ...form, status: statusNormalized, first_in: '', last_out: '' };
        }

        const startTime = selectedShift?.start_time || '09:00';
        const endTime = selectedShift?.end_time || '18:00';
        const firstInValue = toEditDateTime(form.attendance_date, startTime);
        let lastOutValue = toEditDateTime(form.attendance_date, endTime);

        // Midnight Shift Handling: If end time is objectively before start time, it belongs to next day
        if (moment(lastOutValue).isBefore(moment(firstInValue))) {
            lastOutValue = moment(lastOutValue).add(1, 'day').format('YYYY-MM-DDTHH:mm');
        }

        return {
            ...form,
            status: statusNormalized || 'present',
            half_day_session: null,
            first_in: firstInValue,
            last_out: lastOutValue
        };
    };

    useEffect(() => {
        if (!editingId || !shouldForceStatusCorrection || editForm.correction_mode !== 'time_correction') return;

        setAutoSwitchHintShown(true);
        setEditForm((prev) => {
            const nextMode = {
                ...prev,
                correction_mode: 'status_correction',
                apply_status_correction: true,
                apply_time_correction: true
            };
            return applyStatusModeTimes(nextMode, nextMode.status || 'present', nextMode.shift_id);
        });
    }, [editingId, shouldForceStatusCorrection, editForm.correction_mode]);

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
            // Refresh local logs
            fetchBrowseHistory();
            // Refresh main report if relevant
            fetchReport();
        } catch (err) {
            const apiErrorCode = err?.response?.data?.error || err?.response?.data?.code;
            const apiMessage = String(err?.response?.data?.message || '').toLowerCase();
            const shouldAutoSwitchToTimeUnchanged =
                apiErrorCode === 'CONFLICT_STATUS_TIME_CORRECTION' ||
                (apiMessage.includes('time correction is not applicable') && apiMessage.includes('status'));

            if (apiErrorCode === 'PENDING_LEAVE_ACTION_REQUIRED') {
                const conflict = err?.response?.data?.pending_leave;
                const fromDate = conflict?.from_date ? moment(conflict.from_date).format('DD MMM YYYY') : 'the selected date';
                const toDate = conflict?.to_date ? moment(conflict.to_date).format('DD MMM YYYY') : '';
                const leaveLabel = conflict?.leave_type || conflict?.policy_name || 'leave';
                const detail = toDate && fromDate !== toDate ? `${fromDate} to ${toDate}` : fromDate;
                const retryWithOverride = (isAdmin || isHOD) && window.confirm(`Pending ${leaveLabel} exists for ${detail}. Approve/reject/withdraw first, or force override this attendance change?`);

                if (retryWithOverride) {
                    try {
                        setSaving(true);
                        const overridePayload = { ...payload, force_override: true };
                        if (editingId === 'new') {
                            await attendanceAPI.createManualAdjustment(overridePayload);
                        } else {
                            await attendanceAPI.updateAttendanceRecord(editingId, overridePayload);
                        }
                        toast.success('Record updated with override');
                        setEditingId(null);
                        fetchBrowseHistory();
                        fetchReport();
                        return;
                    } catch (overrideErr) {
                        toast.error(overrideErr?.response?.data?.message || 'Override failed');
                        return;
                    } finally {
                        setSaving(false);
                    }
                }

                toast.error(err?.response?.data?.message || 'Pending leave must be resolved before editing attendance');
                return;
            }

            if (shouldAutoSwitchToTimeUnchanged) {
                setAutoSwitchHintShown(true);
                setEditForm((prev) => ({
                    ...prev,
                    correction_mode: 'status_correction_time_unchanged',
                    apply_status_correction: true,
                    apply_time_correction: false
                }));
                toast.info('Switched to Status Correction (Time Unchanged). Please verify and save again.');
                return;
            }

            toast.error(err?.response?.data?.message || 'Update failed');
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
            toast.error(err.message || 'Update failed');
        } finally {
            setUpdatingProfile(false);
        }
    };

    const startEdit = rec => {
        const employee = profileData?.employee || {};
        const recordShiftId = rec.shift_id?._id || rec.shift_id || '';
        const defaultShiftId = recordShiftId || employee.shift_id?._id || employee.shift_id || assignedShiftOptions?.[0]?._id || '';

        const hasPunchIn = Boolean(rec.first_in);
        const defaultCorrectionMode = hasPunchIn ? 'time_correction' : 'status_correction';

        const baseForm = {
            attendance_date: rec.attendance_date,
            employee_id: selectedEmp.id,
            correction_mode: defaultCorrectionMode,
            apply_status_correction: defaultCorrectionMode === 'status_correction',
            apply_time_correction: defaultCorrectionMode === 'time_correction',
            shift_id: defaultShiftId,
            status: rec.status || 'present',
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

    const exportExcel = async () => {
        // Dynamic import so it doesn't block initial page load
        const ExcelJS = await import('exceljs');
        const { saveAs } = await import('file-saver');

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Exim Application';
        const worksheet = workbook.addWorksheet(`Attendance`);

        const cols = ['Employee', 'Company', 'P', 'A', 'L', 'Early In', 'Early Out', 'Leaves', 'Avg Hours'];
        
        // Report Header
        const reportHeader = worksheet.addRow([`Attendance Report: ${startDate} to ${endDate}`]);
        reportHeader.font = { bold: true, size: 14 };
        worksheet.addRow([]); // Empty row
        
        for (const [sectionTitle, employees] of Object.entries(groups)) {
            if (employees.length === 0) continue;
            
            const titleRow = worksheet.addRow([`${sectionTitle.toUpperCase()} (${employees.length})`]);
            titleRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
            titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } }; // Slate color
            worksheet.mergeCells(`A${titleRow.number}:I${titleRow.number}`);

            const headerRow = worksheet.addRow(cols);
            headerRow.font = { bold: true, color: { argb: 'FF0F172A' } };
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // Slate 100
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
            });
            
            employees.forEach(e => {
                worksheet.addRow([
                    e.name, 
                    e.company_name || '-', 
                    e.present, 
                    e.absent, 
                    e.late, 
                    e.earlyIn || 0, 
                    e.earlyOut || 0, 
                    e.leaves, 
                    e.avgHours
                ]);
            });
            worksheet.addRow([]); // Empty row
        }

        // Auto format width lengths
        worksheet.columns.forEach((column) => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, (cell) => {
                const columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            column.width = Math.min(maxLength < 10 ? 10 : maxLength + 2, 50); // Min 10, Max 50
        });

        // Trigger Download
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `AttendanceReport_${startDate}_to_${endDate}.xlsx`);
    };

    const filtered = reportData.filter(e => {
        const matchesSearch = e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              e.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
        
        let matchesStatus = true;
        if (statusFilter !== 'all') {
            // Find the robust processed status for the specific targeted end date
            const targetDateReport = e.history?.find(h => h.date === endDate);
            let targetStatus = targetDateReport ? targetDateReport.status.toLowerCase() : 'absent';
            
            matchesStatus = targetStatus === statusFilter.toLowerCase();
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

        // Default: Group by Status
        const g = {
            'Present': [],
            'Late': [],
            'Half Day': [],
            'Absent': [],
            'Leave': [],
            'Other': []
        };
        filtered.forEach(e => {
            const targetDateReport = e.history?.find(h => h.date === endDate);
            let targetStatus = targetDateReport ? targetDateReport.status.toLowerCase() : 'absent';
            
            if (targetStatus === 'present') g['Present'].push(e);
            else if (targetStatus === 'late') g['Late'].push(e);
            else if (targetStatus === 'half_day') g['Half Day'].push(e);
            else if (targetStatus === 'absent') g['Absent'].push(e);
            else if (targetStatus === 'leave') g['Leave'].push(e);
            else g['Other'].push(e);
        });
        return g;
    }, [filtered, endDate, groupBy]);

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
                        <button className="ar-hero-btn" onClick={fetchReport}><FiRefreshCw size={13} /> Refresh</button>
                        
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
                        {totalEmp > 0 ? (filtered.reduce((s, e) => s + e.present + (e.halfDay || 0) * 0.5, 0) / (totalEmp * (moment(endDate).diff(moment(startDate), 'days') + 1)) * 100).toFixed(1) : 0}%
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
                                        <th>Continuity Pattern</th>
                                        <th style={{ textAlign: 'center' }}>P</th>
                                        <th style={{ textAlign: 'center' }}>A</th>
                                        <th style={{ textAlign: 'center' }}>L</th>
                                        <th style={{ textAlign: 'center' }}>HD</th>
                                        <th style={{ textAlign: 'center' }}>LV</th>
                                        <th>Work Hrs</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length > 0 ? filtered.map(emp => (
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
                                                <RenderHeatmap history={emp.history || []} startDate={startDate} endDate={endDate} />
                                            </td>
                                            <td style={{ textAlign: 'center' }}><span className="ar-count ar-c-green">{emp.present}</span></td>
                                            <td style={{ textAlign: 'center' }}><span className="ar-count ar-c-red">{emp.absent}</span></td>
                                            <td style={{ textAlign: 'center' }}><span className="ar-count ar-c-amber">{emp.late}</span></td>
                                            <td style={{ textAlign: 'center' }}><span className="ar-count ar-c-blue">{emp.halfDay || 0}</span></td>
                                            <td style={{ textAlign: 'center' }}><span className="ar-count ar-c-purple">{emp.leaves || 0}</span></td>
                                            <td>
                                                <div className="ar-hours-wrap">
                                                    <span className="ar-hours-val">{emp.avgHours} avg.</span>
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
                                    )) : (
                                        <tr><td colSpan={10} className="ar-empty-row">No data found for the selected range.</td></tr>
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
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    <select className="ar-history-select" style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }} value={browseMonth} onChange={e => setBrowseMonth(parseInt(e.target.value))}>
                                                        {moment.months().map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            {isAdmin && (
                                                <div style={{ 
                                                    marginBottom: '20px', 
                                                    background: '#f8fafc', 
                                                    padding: '16px', 
                                                    borderRadius: '12px', 
                                                    border: '1px solid #e2e8f0',
                                                    boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.05)'
                                                }}>
                                                    <form onSubmit={handleApplyFullMonthPresence} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <label style={{ fontSize: '11px', fontWeight: '700', color: '#000' }}>Selected Month</label>
                                                            <div style={{ padding: '8px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}>
                                                                {moment([browseYear, browseMonth - 1]).format('MMMM YYYY')}
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', gridColumn: '1 / -1' }}>
                                                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#000' }}>Enable Full Month Presence:</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setFullMonthPresenceEnabled(true)}
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #cbd5e1',
                                                                    background: fullMonthPresenceEnabled ? '#0f172a' : '#fff',
                                                                    color: fullMonthPresenceEnabled ? '#fff' : '#0f172a',
                                                                    fontWeight: '700',
                                                                    fontSize: '12px',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                Yes
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setFullMonthPresenceEnabled(false)}
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #cbd5e1',
                                                                    background: !fullMonthPresenceEnabled ? '#0f172a' : '#fff',
                                                                    color: !fullMonthPresenceEnabled ? '#fff' : '#0f172a',
                                                                    fontWeight: '700',
                                                                    fontSize: '12px',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                No
                                                            </button>
                                                        </div>

                                                        <div style={{ fontSize: '11px', color: '#64748b', gridColumn: '1 / -1' }}>
                                                            Applies present status to the selected month, skips all configured week-offs, and preserves leave/holiday/weekly-off records.
                                                        </div>
                                                        <div style={{ gridColumn: '1 / -1' }}>
                                                            <button 
                                                                type="submit" 
                                                                disabled={applyingFullMonth || !fullMonthPresenceEnabled}
                                                                style={{ 
                                                                    width: '100%', 
                                                                    padding: '10px', 
                                                                    background: '#0f172a', 
                                                                    color: '#fff', 
                                                                    border: 'none', 
                                                                    borderRadius: '8px', 
                                                                    fontWeight: '700', 
                                                                    fontSize: '13px',
                                                                    cursor: 'pointer',
                                                                    opacity: applyingFullMonth || !fullMonthPresenceEnabled ? 0.7 : 1
                                                                }}
                                                            >
                                                                {applyingFullMonth ? 'Applying...' : 'Apply Full Month Presence'}
                                                            </button>
                                                        </div>
                                                    </form>
                                                </div>
                                            )}

                                            <div className="ar-cal-grid">
                                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="ar-cal-day-lbl">{d}</div>)}
                                                {(() => {
                                                    const startOfMonth = moment([browseYear, browseMonth - 1]).startOf('month');
                                                    const endOfMonth = moment([browseYear, browseMonth - 1]).endOf('month');
                                                    const days = [];

                                                    // Padding for first week
                                                    for (let i = 0; i < startOfMonth.day(); i++) days.push(<div key={`pad-${i}`} className="ar-cal-cell empty" />);

                                                    // Days of month
                                                    for (let day = 1; day <= endOfMonth.date(); day++) {
                                                        const dateStr = moment([browseYear, browseMonth - 1, day]).format('YYYY-MM-DD');
                                                        const rec = empHistory.find(r => r.attendance_date && moment(r.attendance_date).format('YYYY-MM-DD') === dateStr);
                                                        const isToday = dateStr === moment().format('YYYY-MM-DD');
                                                        const statusClass = getCalendarStatusClass(rec?.status);
                                                        const statusBadge = getCalendarStatusBadge(rec?.status);

                                                        days.push(
                                                            <div
                                                                key={day}
                                                                className={`ar-cal-cell ${statusClass} ${isToday ? 'today' : ''}`}
                                                                onClick={() => {
                                                                    // Allowing both ADMIN and HOD to edit/adjust
                                                                    if (rec) startEdit(rec);
                                                                    else startEdit({ attendance_date: dateStr, status: 'absent' });
                                                                }}
                                                                title={rec ? `${moment(dateStr).format('DD MMM')}: ${rec.status}` : 'No Record'}
                                                            >
                                                                {day}
                                                                {statusBadge ? <div className="ar-cal-status-tag">{statusBadge}</div> : (rec && <div className="ar-cal-dot" />)}
                                                            </div>
                                                        );
                                                    }
                                                    return days;
                                                })()}
                                            </div>
                                        </div>

                                        {/* Daily Log - Collapsed for clean UI */}
                                        <div className="ar-timeline-minimal">
                                            <h4 className="ar-pane-title">Activity Highlights</h4>
                                            <div className="ar-timeline-body">
                                                {empHistory.slice(0, 10).map((rec, i) => (
                                                    <div key={i} className="ar-tl-mini-row" onClick={() => (isAdmin || isHOD) && startEdit(rec)}>
                                                        <span className="ar-tl-mini-date">{moment(rec.attendance_date).format('DD MMM')}</span>
                                                        <StatusPill status={rec.status} session={rec.half_day_session} />
                                                        <span className="ar-tl-mini-time">{rec.first_in ? formatTime12Hr(rec.first_in) : '--:--'}</span>
                                                        <FiArrowRight size={10} />
                                                        <span className="ar-tl-mini-time">{rec.last_out ? formatTime12Hr(rec.last_out) : '--:--'}</span>
                                                    </div>
                                                ))}
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
                                                                    {moment(leave.from_date).format('DD MMM')} - {moment(leave.to_date).format('DD MMM')} 
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
                                                                            <span>{moment(lv.from_date).format('DD MMM YYYY')}</span>
                                                                            {lv.total_days > 1 && (
                                                                                <small>to {moment(lv.to_date).format('DD MMM YYYY')} ({lv.total_days} days)</small>
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
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 600, color: isTimeCorrectionDisabled ? '#ccc' : '#334155', opacity: isTimeCorrectionDisabled ? 0.5 : 1, cursor: isTimeCorrectionDisabled ? 'not-allowed' : 'pointer' }} title={!hasInitialPunchIn ? 'Not available when no punch-in exists for this date' : editForm.correction_mode === 'status_correction' ? 'Not available in Status Correction mode' : isNonWorkingStatus(editForm.status) ? 'Not applicable for non-working statuses' : ''}>
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
                            <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 600, color: !hasInitialPunchIn ? '#ccc' : '#334155', opacity: !hasInitialPunchIn ? 0.5 : 1, cursor: !hasInitialPunchIn ? 'not-allowed' : 'pointer' }} title={!hasInitialPunchIn ? 'Not available when no punch-in exists for this date' : ''}>
                                <input
                                    type="radio"
                                    name="correction_mode"
                                    disabled={!hasInitialPunchIn}
                                    checked={editForm.correction_mode === 'status_correction_time_unchanged'}
                                    onChange={() => setEditForm((prev) => ({
                                        ...prev,
                                        correction_mode: 'status_correction_time_unchanged',
                                        apply_status_correction: true,
                                        apply_time_correction: false
                                    }))}
                                />
                                Status Correction (Time Unchanged)
                            </label>
                        </div>
                        {autoSwitchHintShown && (
                            <div className="ar-alert-box" style={{ backgroundColor: '#e0f7f4', color: '#0d5d5a', padding: '10px', borderRadius: '4px', fontSize: '13px', marginBottom: '15px', border: '1px solid #80dedb' }}>
                                ℹ️ <strong>Auto-switched mode:</strong> Time correction is not applicable for holidays/leaves/week off. Switched to Status Correction (Time Unchanged).
                            </div>
                        )}
                        <div className="ar-edit-grid">
                            {editForm.correction_mode === 'status_correction' || editForm.correction_mode === 'status_correction_time_unchanged' ? (
                                <>
                                    <div className="ar-edit-field">
                                        <label>Status</label>
                                        <select
                                            value={editForm.status}
                                            onChange={e => {
                                                const nextStatus = e.target.value;
                                                // Auto-switch to time-unchanged mode if selecting non-working status
                                                if (isNonWorkingStatus(nextStatus) && editForm.correction_mode !== 'status_correction_time_unchanged') {
                                                    setAutoSwitchHintShown(true);
                                                    setEditForm((prev) => ({
                                                        ...prev,
                                                        status: nextStatus,
                                                        correction_mode: 'status_correction_time_unchanged',
                                                        apply_status_correction: true,
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
                                            <option value="present">Present (P)</option>
                                            <option value="absent">Absent (A)</option>
                                            <option value="half_day">Half Day</option>
                                            <option value="leave">Leave</option>
                                            <option value="weekly_off">Weekly Off</option>
                                            <option value="holiday">Holiday</option>
                                        </select>
                                    </div>
                                    {editForm.status === 'half_day' && (
                                        <div className="ar-edit-field">
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
                                        <label>Assigned Shift</label>
                                        <select
                                            value={editForm.shift_id || ''}
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
                                            {assignedShiftOptions.map((s) => (
                                                <option key={s._id} value={s._id}>
                                                    {s.shift_name || 'Shift'} ({s.start_time || '--:--'} - {s.end_time || '--:--'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="ar-edit-field">
                                        <label>Official In-Time</label>
                                        <input
                                            type="datetime-local"
                                            value={editForm.first_in || ''}
                                            onChange={e => {
                                                setEditForm((prev) => {
                                                    const next = { ...prev, first_in: e.target.value };
                                                    // Auto-derive status based on work hours
                                                    const workHours = calculateWorkHours(next.first_in, next.last_out);
                                                    if (workHours >= 8) {
                                                        next.status = 'present';
                                                    } else if (workHours >= 4) {
                                                        next.status = 'half_day';
                                                    } else if (workHours > 0) {
                                                        next.status = 'incomplete';
                                                    }
                                                    return next;
                                                });
                                            }}
                                        />
                                    </div>
                                    <div className="ar-edit-field">
                                        <label>Official Out-Time</label>
                                        <input
                                            type="datetime-local"
                                            value={editForm.last_out || ''}
                                            onChange={e => {
                                                setEditForm((prev) => {
                                                    const next = { ...prev, last_out: e.target.value };
                                                    // Auto-derive status based on work hours
                                                    const workHours = calculateWorkHours(next.first_in, next.last_out);
                                                    if (workHours >= 8) {
                                                        next.status = 'present';
                                                    } else if (workHours >= 4) {
                                                        next.status = 'half_day';
                                                    } else if (workHours > 0) {
                                                        next.status = 'incomplete';
                                                    }
                                                    return next;
                                                });
                                            }}
                                        />
                                    </div>
                                    <div style={{ gridColumn: '1 / -1', fontSize: '12px', color: '#666', marginTop: '8px' }}>
                                        💡 <strong>Time Correction Mode:</strong> Status is auto-derived from work hours. Provide both in-time and out-time for accurate status calculation.
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="ar-edit-field" style={{ marginTop: '15px' }}><label>Administrative Remarks</label>
                            <textarea placeholder="Reason for change..." value={editForm.remarks} onChange={e => setEditForm({ ...editForm, remarks: e.target.value })} />
                        </div>
                        <div className="ar-edit-actions">
                            <button className="ar-cancel" onClick={() => { setEditingId(null); setAutoSwitchHintShown(false); }}>Discard</button>
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
