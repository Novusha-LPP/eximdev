import React, { useState, useEffect } from 'react';
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
import './AttendanceReport.css';

const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
const formatSession = (s) => (s === 'first_half' ? '1st Half' : '2nd Half');

const StatusPill = ({ status, session }) => {
    const map = { present: ['Present', 'present'], absent: ['Absent', 'absent'], leave: ['Leave', 'leave'], half_day: ['Half Day', 'half-day'], weekly_off: ['Off', 'off'], holiday: ['Holiday', 'holiday'] };
    const [label, cls] = map[status] || [status, 'default'];
    return (
        <span className={`ar-status-pill ar-pill-${cls}`}>
            {status === 'half_day' ? (session ? (session === 'first_half' ? '1st Half' : '2nd Half') : ' ½ Day') : label}
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
                                transition: 'margin 0.2s ease'
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
                                    <div key={e.id} className="ar-summary-item" style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                        <div className="ar-si-name" style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.name}</div>
                                        <div className="ar-si-meta" style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', marginTop: '4px', marginBottom: '8px' }}>
                                            <FiBriefcase size={10} style={{ marginRight: 4 }}/> 
                                            <span className="ar-si-co" title={e.company_name}>{e.company_name?.substring(0, 20) || '-'}</span>
                                        </div>
                                        <div className="ar-si-stats" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                                            <span title="Present Count">P: <span style={{ color: '#0f172a', fontWeight: '500' }}>{e.present}</span></span>
                                            <span title="Absent Count">A: <span style={{ color: '#0f172a', fontWeight: '500' }}>{e.absent}</span></span>
                                            <span title="Late Count">L: <span style={{ color: '#0f172a', fontWeight: '500' }}>{e.late}</span></span>
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

const AttendanceReport = ({ isAdmin }) => {
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
    const ALLOWED_USERNAMES = React.useMemo(() => new Set(['uday_zope', 'h.chavan']), []);
    const isAllowedUser = ALLOWED_USERNAMES.has(user?.username);
    const [showDailySummary, setShowDailySummary] = useState(false);
    const [empHistory, setEmpHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);

    // Profile Hub States
    const [activeTab, setActiveTab] = useState('attendance'); // 'attendance', 'leaves', 'details'
    const [profileData, setProfileData] = useState(null); // Full profile from API
    const [jobForm, setJobForm] = useState({});
    const [updatingProfile, setUpdatingProfile] = useState(false);
    const [shifts, setShifts] = useState([]);

    const now = new Date();
    const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(now.toISOString().split('T')[0]);

    // History browsing in drawer
    const [browseMonth, setBrowseMonth] = useState(now.getMonth() + 1);
    const [browseYear, setBrowseYear] = useState(now.getFullYear());

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
            console.error('[AttendanceReport] fetchReport error:', err?.response?.status, err?.response?.data || err?.message);
            toast.error(err?.response?.data?.message || 'Failed to load report');
        }
        finally { setLoading(false); }
    };

    const openDrawer = async (emp, tab = 'attendance') => {
        setSelectedEmp(emp);
        setLoadingHistory(true);
        setEditingId(null);
        setActiveTab(tab);
        setProfileData(null);

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

    const fetchBrowseHistory = async () => {
        if (!selectedEmp) return;
        setLoadingHistory(true);
        setEditingId(null);
        try {
            const start = moment([browseYear, browseMonth - 1]).startOf('month').format('YYYY-MM-DD');
            const end = moment([browseYear, browseMonth - 1]).endOf('month').format('YYYY-MM-DD');
            const r = await attendanceAPI.getEmployeeFullProfile(selectedEmp.id, start, end, companyId);
            setProfileData(r);
            setEmpHistory(r?.attendance || []);
        } catch {
            toast.error('Failed to load history for selected period');
        } finally {
            setLoadingHistory(false);
        }
    };

    const saveEdit = async () => {
        setSaving(true);
        try {
            if (editingId === 'new') {
                await attendanceAPI.createManualAdjustment(editForm);
            } else {
                await attendanceAPI.updateAttendanceRecord(editingId, editForm);
            }
            toast.success('Record updated');
            setEditingId(null);
            // Refresh local logs
            fetchBrowseHistory();
            // Refresh main report if relevant
            fetchReport();
        } catch (err) { toast.error(err.response?.data?.message || 'Update failed'); }
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
        setEditingId(rec._id || 'new');
        setEditForm({
            attendance_date: rec.attendance_date,
            employee_id: selectedEmp.id,
            status: rec.status || 'present',
            first_in: rec.first_in ? moment(rec.first_in).format('YYYY-MM-DDTHH:mm') : 
                     (rec._id ? '' : moment(rec.attendance_date).set({ hour: 9, minute: 0 }).format('YYYY-MM-DDTHH:mm')),
            last_out: rec.last_out ? moment(rec.last_out).format('YYYY-MM-DDTHH:mm') : 
                     (rec._id ? '' : moment(rec.attendance_date).set({ hour: 18, minute: 0 }).format('YYYY-MM-DDTHH:mm')),
            remarks: rec.remarks || ''
        });
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
    }, [filtered, endDate]);

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
                                    <h2>{selectedEmp?.name}</h2>
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
                                            <div className="ar-score-pill"><span className="ar-score-val ar-c-green">{selectedEmp?.present}</span><span className="ar-score-lbl">Present</span></div>
                                            <div className="ar-score-pill"><span className="ar-score-val ar-c-red">{selectedEmp?.absent}</span><span className="ar-score-lbl">Absent</span></div>
                                            <div className="ar-score-pill"><span className="ar-score-val ar-c-amber">{selectedEmp?.late}</span><span className="ar-score-lbl">Late</span></div>
                                            <div className="ar-score-pill"><span className="ar-score-val ar-c-blue">{selectedEmp?.leaves}</span><span className="ar-score-lbl">Leaves</span></div>
                                        </div>

                                        {/* Professional Calendar Insight */}
                                        <div className="ar-cal-preview">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                                                <h4 className="ar-pane-title" style={{ margin: 0 }}>Attendance Continuity</h4>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <select className="ar-history-select" style={{ padding: '4px 8px' }} value={browseMonth} onChange={e => setBrowseMonth(parseInt(e.target.value))}>
                                                        {moment.months().map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                                    </select>
                                                    <button className="ar-browse-btn" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={fetchBrowseHistory}>Sync</button>
                                                </div>
                                            </div>

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
                                                        const rec = empHistory.find(r => moment(r.attendance_date).format('YYYY-MM-DD') === dateStr);
                                                        const isToday = dateStr === moment().format('YYYY-MM-DD');

                                                        days.push(
                                                            <div
                                                                key={day}
                                                                className={`ar-cal-cell ${rec?.status || 'none'} ${isToday ? 'today' : ''}`}
                                                                onClick={() => {
                                                                    // Allowing both ADMIN and HOD to edit/adjust
                                                                    if (rec) startEdit(rec);
                                                                    else startEdit({ attendance_date: dateStr, status: 'absent' });
                                                                }}
                                                                title={rec ? `${moment(dateStr).format('DD MMM')}: ${rec.status}` : 'No Record'}
                                                            >
                                                                {day}
                                                                {rec && <div className="ar-cal-dot" />}
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
                                                    <div key={i} className="ar-tl-mini-row" onClick={() => isAdmin && startEdit(rec)}>
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

                                                    const totalQuota = (bal.opening_balance || 0) + (bal.credited || 0);

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
                                                {(!profileData?.leaves || profileData.leaves.filter(lv => lv.approval_status === 'approved').length === 0) ? (
                                                    <div className="ar-empty-state">
                                                        <p>No used leave records to display</p>
                                                    </div>
                                                ) : (
                                                    <table className="ar-history-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Leave Type</th>
                                                                <th style={{ textAlign: 'right' }}>Dates Consumed</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {profileData.leaves.filter(lv => lv.approval_status === 'approved').map((lv, idx) => (
                                                                <tr key={idx}>
                                                                    <td>
                                                                        <strong>{lv.leave_policy_id?.leave_type?.toUpperCase() || 'LEAVE'}</strong>
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
                        <div className="ar-alert-box" style={{ backgroundColor: '#fff4e5', color: '#663c00', padding: '10px', borderRadius: '4px', fontSize: '13px', marginBottom: '15px', border: '1px solid #ffe8cc' }}>
                            💡 <strong>Security Warning:</strong> You cannot modify raw biometric/web punch events. You are adjusting the official summary record.
                        </div>
                        <div className="ar-edit-grid">
                            <div className="ar-edit-field">
                                <label>Status</label>
                                <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                                    <option value="present">Present</option>
                                    <option value="absent">Absent</option>
                                    <option value="half_day">Half Day</option>
                                    <option value="leave">Leave</option>
                                    <option value="weekly_off">Weekly Off</option>
                                    <option value="holiday">Holiday</option>
                                </select>
                            </div>
                            <div className="ar-edit-field"><label>Official In-Time (Overrides raw punch)</label><input type="datetime-local" value={editForm.first_in} onChange={e => setEditForm({ ...editForm, first_in: e.target.value })} /></div>
                            <div className="ar-edit-field"><label>Official Out-Time (Overrides raw punch)</label><input type="datetime-local" value={editForm.last_out} onChange={e => setEditForm({ ...editForm, last_out: e.target.value })} /></div>
                        </div>
                        <div className="ar-edit-field" style={{ marginTop: '15px' }}><label>Administrative Remarks</label>
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
