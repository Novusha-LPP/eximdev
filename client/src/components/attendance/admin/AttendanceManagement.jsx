import React, { useState, useCallback, useEffect } from 'react';
import {
    FiSearch, FiEdit, FiClock, FiX, FiCheck,
    FiAlertCircle, FiTrendingUp, FiRefreshCw,
    FiDownload, FiUsers, FiChevronLeft
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import attendanceAPI from '../../../api/attendance/attendance.api';
import masterAPI from '../../../api/attendance/master.api';
import toast from 'react-hot-toast';
import './AttendanceManagement.css';

const fmtDate = iso => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
const formatSession = (s) => (s === 'first_half' ? '1st Half' : '2nd Half');

const StatusPill = ({ status, session, isEdited }) => {
    const map = { present: ['Present', 'present'], absent: ['Absent', 'absent'], leave: ['Leave', 'leave'], half_day: ['Half Day', 'half-day'] };
    const [label, cls] = map[status] || [status, 'default'];
    return (
        <span className={`am-status-pill am-pill-${cls}`} title={isEdited ? "Manually adjusted by Admin" : ""}>
            {status === 'half_day' && session ? formatSession(session) : label}
            {isEdited && <span style={{marginLeft: '6px', cursor: 'help'}} title="Manually adjusted by Admin">??</span>}
        </span>
    );
};

const PunchBadge = ({ time, type, missing }) => (
    <div className={`am-punch-badge${missing ? ' am-punch-missing' : ''}`} title="?? Raw Punch Data. For security and compliance, raw punches cannot be edited or deleted.">
        <span className="am-punch-type">{type}</span>
        <span className="am-punch-time">
            {missing ? 'MISS' : fmtTime(time)} 
            <span style={{fontSize: '11px', marginLeft: '4px', opacity: 0.6}}>??</span>
        </span>
    </div>
);

const AttendanceManagement = () => {
    const navigate = useNavigate();
    const [mode, setMode] = useState('daily');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState([]);
    const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0 });
    const [designations, setDesignations] = useState([]);
    const [selectedDesignation, setSelectedDesignation] = useState('all');
    const [search, setSearch] = useState('');
    const now = new Date();
    const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(now.toISOString().split('T')[0]);
    const [drawer, setDrawer] = useState({ open: false, type: null, rec: null });
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchDesignations(); }, []);
    useEffect(() => { fetchData(); }, [mode, startDate, endDate, selectedDesignation]);

    const fetchDesignations = async () => {
        try { const r = await masterAPI.getDesignations(); setDesignations(r?.data || []); } catch { }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            if (mode === 'daily') {
                const r = await attendanceAPI.getHistory({
                    startDate, endDate,
                    designation: selectedDesignation !== 'all' ? selectedDesignation : undefined,
                    limit: 500,
                });
                const recs = r?.data || [];
                setData(recs);
                setStats({
                    total: recs.length,
                    present: recs.filter(x => x.status === 'present').length,
                    absent: recs.filter(x => x.status === 'absent').length,
                    late: recs.filter(x => x.status === 'late' || x.is_late).length,
                });
            } else {
                const r = await attendanceAPI.getAdminAttendanceReport(startDate, endDate, selectedDesignation);
                const recs = r?.data || [];
                setData(recs);
                setStats({
                    total: recs.length,
                    present: recs.reduce((s, x) => s + (x.present || 0), 0),
                    absent: recs.reduce((s, x) => s + (x.absent || 0), 0),
                    late: recs.reduce((s, x) => s + (x.late || 0), 0),
                });
            }
        } catch { toast.error('Failed to load data'); }
        finally { setLoading(false); }
    };

    const openEdit = rec => {
        setDrawer({ open: true, type: 'edit', rec });
        const day = rec.attendance_date ? new Date(rec.attendance_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        setEditForm({
            _id: rec._id,
            status: rec.status,
            first_in: rec.first_in ? new Date(rec.first_in).toISOString().slice(0, 16) : `${day}T09:00`,
            last_out: rec.last_out ? new Date(rec.last_out).toISOString().slice(0, 16) : `${day}T18:00`,
            employee_id: rec.employee_id?._id || rec.id, // Ensure employee_id is passed
            remarks: rec.remarks || '',
        });
    };

    const openHistory = async rec => {
        const r = await attendanceAPI.getHistory({
            employee_id: rec.employee_id?._id || rec.id,
            startDate, endDate, limit: 31,
        }).catch(() => ({ data: [] }));
        setDrawer({ open: true, type: 'history', rec: { ...rec, history: r?.data || [] } });
    };

    const handleSave = async e => {
        e.preventDefault(); 
        
        // --- Validation: Out must be after In ---
        if (editForm.first_in && editForm.last_out) {
            const inT = new Date(editForm.first_in);
            const outT = new Date(editForm.last_out);
            if (outT < inT) {
                return toast.error("Punch Out cannot be before Punch In");
            }
        }

        setSaving(true);
        try {
            await attendanceAPI.updateAttendanceRecord(editForm._id, editForm);
            toast.success('Record updated');
            setDrawer({ open: false }); fetchData();
        } catch (err) { toast.error(err.message || 'Update failed'); }
        finally { setSaving(false); }
    };

    const exportCSV = () => {
        const h = mode === 'daily'
            ? ['Employee', 'Date', 'Status', 'In', 'Out', 'Hours']
            : ['Employee', 'Present', 'Absent', 'Late', 'Avg Hours'];
        const rows = data.map(d => mode === 'daily'
            ? [`${d.employee_id?.first_name} ${d.employee_id?.last_name}`, d.attendance_date, d.status, d.first_in, d.last_out, d.total_work_hours]
            : [d.name, d.present, d.absent, d.late, d.avgHours]);
        const csv = [h, ...rows].map(r => r.join(',')).join('\n');
        Object.assign(document.createElement('a'), {
            href: 'data:text/csv,' + encodeURIComponent(csv),
            download: `attendance-${mode}-${startDate}.csv`,
        }).click();
    };

    const filtered = data.filter(d => {
        const name = mode === 'daily' ? `${d.employee_id?.first_name} ${d.employee_id?.last_name}` : d.name;
        return name?.toLowerCase().includes(search.toLowerCase());
    });

    const STAT_TILES = [
        { cls: 'ast-total', chip: 'Records', val: stats.total, label: mode === 'daily' ? 'Total Records' : 'Employees', icon: <FiUsers size={14} /> },
        { cls: 'ast-present', chip: 'Good', val: stats.present, label: mode === 'daily' ? 'Present' : 'Present Days', icon: <FiCheck size={14} /> },
        { cls: 'ast-absent', chip: 'Alert', val: stats.absent, label: mode === 'daily' ? 'Absent' : 'Absent Days', icon: <FiX size={14} /> },
        { cls: 'ast-late', chip: 'Watch', val: stats.late, label: 'Late / Issues', icon: <FiAlertCircle size={14} /> },
    ];

    return (
        <div className="am-console">

            {/* -- HERO -- */}
            <div className="am-hero">
                <div className="am-hero-inner">
                    <div>
                        <h1 className="am-hero-title">Attendance Management</h1>
                        <p className="am-hero-sub">
                            {mode === 'daily' ? 'Daily punch logs, anomaly detection & record correction' : 'Monthly aggregates, trends & compliance analysis'}
                        </p>
                    </div>
                    <div className="am-hero-controls">
                        <div className="am-mode-wrap">
                            <button className={`am-mode-btn${mode === 'daily' ? ' active' : ''}`} onClick={() => setMode('daily')}>Daily View</button>
                            <button className={`am-mode-btn${mode === 'monthly' ? ' active' : ''}`} onClick={() => setMode('monthly')}>Monthly Report</button>
                        </div>
                        <button className="am-hero-btn" onClick={exportCSV}><FiDownload size={13} /> Export</button>
                        <button className="am-hero-icon-btn" onClick={fetchData} title="Refresh"><FiRefreshCw size={13} /></button>
                    </div>
                </div>
            </div>

            {/* -- FLOATING STAT TILES -- */}
            <div className="am-stats-float">
                {STAT_TILES.map((t, i) => (
                    <div key={i} className={`am-stat-tile ${t.cls}`}>
                        <div className="am-stat-top">
                            <div className="am-stat-icon">{t.icon}</div>
                            <span className="am-stat-chip">{t.chip}</span>
                        </div>
                        <div className="am-stat-value">{t.val}</div>
                        <div className="am-stat-label">{t.label}</div>
                    </div>
                ))}
            </div>

            {/* -- CONTENT -- */}
            <div className="am-content">

                {/* Filter bar */}
                <div className="am-filter-bar">
                    <div className="am-search">
                        <FiSearch size={14} />
                        <input placeholder="Search employee " value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="am-filter-right">
                        <div className="am-quick-pills">
                            <button onClick={() => { const t = now.toISOString().split('T')[0]; setStartDate(t); setEndDate(t); }}>Today</button>
                            <button onClick={() => {
                                setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
                                setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
                            }}>This Month</button>
                        </div>
                        <div className="am-date-group">
                            <input type="date" className="am-input-ctrl" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            <span>?</span>
                            <input type="date" className="am-input-ctrl" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                        <select className="am-input-ctrl am-select" value={selectedDesignation} onChange={e => setSelectedDesignation(e.target.value)}>
                            <option value="all">All Positions</option>
                            {[...new Set(designations.map(d => d.designation_name))].sort().map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="am-table-card">
                    <div className="am-table-scroll">
                        {loading ? (
                            <div className="am-loading"><div className="am-spinner" /><span>Loading records </span></div>
                        ) : filtered.length === 0 ? (
                            <div className="am-empty"><FiSearch size={28} /><p>No records found</p></div>
                        ) : (
                            <table className="am-table">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        {mode === 'daily' ? (
                                            <><th>Date</th><th>Status</th><th>Punch Timeline</th><th>Hours</th><th style={{ textAlign: 'right' }}>Action</th></>
                                        ) : (
                                            <><th style={{ textAlign: 'center' }}>Present</th><th style={{ textAlign: 'center' }}>Absent</th><th style={{ textAlign: 'center' }}>Late</th><th>Avg Hours</th><th style={{ textAlign: 'right' }}>Audit</th></>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(row => {
                                        const anomaly = mode === 'daily' && (row.status === 'absent' || row.is_auto_punch_out);
                                        return (
                                            <tr key={row._id || row.id} className={anomaly ? 'am-row-anomaly' : ''}>
                                                <td>
                                                    <div className="am-emp-cell">
                                                        <div className="am-avatar">
                                                            {mode === 'daily'
                                                                ? `${row.employee_id?.first_name?.[0] || ''}${row.employee_id?.last_name?.[0] || ''}`
                                                                : row.name?.[0] || '?'}
                                                        </div>
                                                        <div>
                                                            <div className="am-emp-name">
                                                                {mode === 'daily' ? `${row.employee_id?.first_name} ${row.employee_id?.last_name}` : row.name}
                                                            </div>
                                                            <div className="am-emp-sub">
                                                                {mode === 'daily'
                                                                    ? `${row.employee_id?.employee_code || '---'}   ${row.employee_id?.designation || 'Staff'}`
                                                                    : `${row.designation || 'Staff'}`}
                                                                {mode === 'monthly' && (row.weekoff_policy_name || row.holiday_policy_name) && (
                                                                    <span style={{ display: 'block', marginTop: '2px', color: '#64748b', fontSize: '11px' }}>
                                                                        {row.weekoff_policy_name ? `WO: ${row.weekoff_policy_name}` : 'WO: -'}
                                                                        {' | '}
                                                                        {row.holiday_policy_name ? `HD: ${row.holiday_policy_name}` : 'HD: -'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {mode === 'daily' ? (
                                                    <>
                                                        <td className="am-td-date">{fmtDate(row.attendance_date)}</td>
                                                        <td><StatusPill status={row.status} session={row.half_day_session} isEdited={row.processed_by === 'admin'} /></td>
                                                        <td>
                                                            <div className="am-punch-row">
                                                                <PunchBadge time={row.first_in} type="IN" />
                                                                <div className="am-punch-line" />
                                                                <PunchBadge time={row.last_out} type="OUT" missing={row.is_auto_punch_out} />
                                                            </div>
                                                        </td>
                                                        <td className="am-td-mono">{row.total_work_hours?.toFixed(1)}h</td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            <button
                                                                className="am-act-btn"
                                                                onClick={() => row.employee_id?._id && navigate(`/attendance/admin/employee/${row.employee_id._id}`)}
                                                                title="View Profile"
                                                                style={{ marginRight: '6px' }}
                                                            >
                                                                <FiUsers size={13} />
                                                            </button>
                                                            <button className="am-act-btn" onClick={() => openEdit(row)} title="Edit">
                                                                <FiEdit size={13} />
                                                            </button>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td style={{ textAlign: 'center' }}><span className="am-count-pill am-pill-green">{row.present}</span></td>
                                                        <td style={{ textAlign: 'center' }}><span className="am-count-pill am-pill-red">{row.absent}</span></td>
                                                        <td style={{ textAlign: 'center' }}><span className="am-count-pill am-pill-amber">{row.late}</span></td>
                                                        <td>
                                                            <div className="am-hours-wrap">
                                                                <div className="am-hours-bar">
                                                                    <div className="am-hours-fill" style={{ width: `${Math.min((row.avgHours / 9) * 100, 100)}%` }} />
                                                                </div>
                                                                <span className="am-hours-val">{row.avgHours}h</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            <button className="am-act-btn" onClick={() => openHistory(row)} title="History">
                                                                <FiTrendingUp size={13} />
                                                            </button>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* -- DRAWER OVERLAY -- */}
            <div className={`am-overlay${drawer.open ? ' open' : ''}`} onClick={() => setDrawer({ open: false })}>
                <div className="am-drawer" onClick={e => e.stopPropagation()}>

                    <div className="am-drawer-head">
                        <div>
                            <span className="am-drawer-eyebrow">
                                {drawer.type === 'edit' ? 'Record Adjustment' : 'Employee Audit'}
                            </span>
                            <h2 className="am-drawer-title">
                                {drawer.type === 'edit' ? 'Adjust Attendance' : 'Monthly Timeline'}
                            </h2>
                        </div>
                        <button className="am-drawer-close" onClick={() => setDrawer({ open: false })}>
                            <FiX size={15} />
                        </button>
                    </div>

                    <div className="am-drawer-body">

                        {/* Edit form */}
                        {drawer.type === 'edit' && drawer.rec && (
                            <form onSubmit={handleSave}>
                                <div className="am-ctx-card">
                                    <div className="am-avatar" style={{ flexShrink: 0 }}>
                                        {drawer.rec.employee_id?.first_name?.[0]}
                                    </div>
                                    <div>
                                        <div className="am-ctx-name">
                                            {drawer.rec.employee_id?.first_name} {drawer.rec.employee_id?.last_name}
                                        </div>
                                        <div className="am-ctx-sub">{fmtDate(drawer.rec.attendance_date)}   {drawer.rec.status}</div>
                                    </div>
                                </div>
                                <div className="am-alert-box" style={{backgroundColor: '#fff4e5', color: '#663c00', padding: '10px', borderRadius: '4px', fontSize: '13px', marginBottom: '15px', border: '1px solid #ffe8cc'}}>
                                    ?? <strong>Security Warning:</strong> You cannot modify raw biometric/web punch events. You are adjusting the official summary record.
                                </div>

                                <div className="am-field">
                                    <label>Status Override</label>
                                    <select className="am-field-ctrl" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                                        <option value="present">Present</option>
                                        <option value="absent">Absent</option>
                                        <option value="half_day">Half Day</option>
                                        <option value="leave">Leave</option>
                                    </select>
                                </div>

                                <div className="am-field-2">
                                    <div className="am-field">
                                        <label>Official In-Time (Overrides raw punch)</label>
                                        <input type="datetime-local" className="am-field-ctrl" value={editForm.first_in}
                                            onChange={e => {
                                                const newIn = e.target.value;
                                                const updates = { first_in: newIn };
                                                // Auto-sync DATE part of Out with In if Out exists
                                                if (editForm.last_out && newIn.length >= 10) {
                                                    const inDatePart = newIn.slice(0, 10);
                                                    const outTimePart = editForm.last_out.slice(10);
                                                    updates.last_out = inDatePart + outTimePart;
                                                }
                                                setEditForm({ ...editForm, ...updates });
                                            }} />
                                    </div>
                                    <div className="am-field">
                                        <label>Official Out-Time (Overrides raw punch)</label>
                                        <input type="datetime-local" className="am-field-ctrl" value={editForm.last_out}
                                            onChange={e => setEditForm({ ...editForm, last_out: e.target.value })} />
                                    </div>
                                </div>

                                <div className="am-field">
                                    <label>Remarks</label>
                                    <textarea className="am-field-ctrl am-field-ta" rows={3}
                                        placeholder="Required for audit trail "
                                        value={editForm.remarks}
                                        onChange={e => setEditForm({ ...editForm, remarks: e.target.value })} />
                                </div>

                                <button type="submit" className="am-drawer-submit" disabled={saving}>
                                    {saving ? 'Saving ' : 'Save Changes'}
                                </button>
                            </form>
                        )}

                        {/* History timeline */}
                        {drawer.type === 'history' && drawer.rec && (
                            <>
                                <div className="am-ctx-card">
                                    <div className="am-avatar" style={{ flexShrink: 0 }}>{drawer.rec.name?.[0]}</div>
                                    <div>
                                        <div className="am-ctx-name">{drawer.rec.name}</div>
                                        <div className="am-ctx-sub">{drawer.rec.department}   {startDate} ? {endDate}</div>
                                    </div>
                                </div>
                                <div className="am-timeline">
                                    {(drawer.rec.history || []).map((rec, i) => (
                                        <div key={i} className="am-tl-row">
                                            <div className="am-tl-date">
                                                <span className="am-tl-day">{new Date(rec.attendance_date).getDate()}</span>
                                                <span className="am-tl-mon">{new Date(rec.attendance_date).toLocaleDateString('en', { month: 'short' })}</span>
                                            </div>
                                            <div className="am-tl-card">
                                                <div className="am-tl-top">
                                                    <StatusPill status={rec.status} session={rec.half_day_session} />
                                                    <span className="am-tl-hrs">{rec.total_work_hours?.toFixed(1)}h</span>
                                                </div>
                                                <div className="am-tl-punches">
                                                    {fmtTime(rec.first_in)} ? {rec.last_out ? fmtTime(rec.last_out) : (rec.is_auto_punch_out ? '? MISS' : '--:--')}
                                                </div>
                                                {rec.remarks && <div className="am-tl-remark">"{rec.remarks}"</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceManagement;


