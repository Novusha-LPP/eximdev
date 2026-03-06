import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { UserContext } from "../../contexts/UserContext";
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './kpi.scss';

// Reuse Icons
const Icons = {
    Dashboard: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" /></svg>,
    Check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>,
    Pending: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>,
    Cancel: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" /></svg>,
    Edit: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>,
    Back: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>,
    Filter: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" /></svg>,
    Eye: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>,
    Approve: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" /></svg>
};

const KPIAdminDashboard = () => {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();

    // Filters
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [department, setDepartment] = useState('');

    const [stats, setStats] = useState([]);
    const [sheets, setSheets] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [message, setMessage] = useState({ show: false, text: '', type: '' });

    // Deadline Config
    const [deadlineConfig, setDeadlineConfig] = useState({
        show: false,
        overrideYear: new Date().getFullYear(),
        overrideMonth: new Date().getMonth() + 1,
        deadlineDate: '',
        currentOverride: null,
        loading: false
    });

    const [detailModal, setDetailModal] = useState({
        show: false,
        department: '',
        data: null,
        loading: false
    });

    const departments = [
        'Export', 'Import', 'Operation-Khodiyar', 'Operation-Sanand', 'Feild', 'Accounts', 'SRCC',
        'Gandhidham', 'DGFT', 'Software', 'Marketing', 'Paramount', 'Rabs', 'Admin'
    ];

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    useEffect(() => {
        if (user && user.role === 'Admin') {
            fetchData();
        }
    }, [year, month, department]);

    const fetchData = async () => {
        try {
            // Fetch Stats
            const statsRes = await axios.get(`${process.env.REACT_APP_API_STRING}/kpi/admin/stats?year=${year}&month=${month}`, { withCredentials: true });
            setStats(statsRes.data);

            // Fetch Sheets
            let url = `${process.env.REACT_APP_API_STRING}/kpi/admin/all-sheets?year=${year}&month=${month}`;
            if (department) url += `&department=${department}`;

            const sheetsRes = await axios.get(url, { withCredentials: true });
            setSheets(sheetsRes.data);

        } catch (error) {
            console.error("Error fetching admin data", error);
            showMessage("Failed to load dashboard data", "error");
        }
    };

    const fetchDeadlineSettings = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/kpi/settings/deadline`, { withCredentials: true });
            const override = res.data.override;
            setDeadlineConfig(prev => ({
                ...prev,
                currentOverride: override
            }));
        } catch (err) {
            console.error("Error fetching deadline settings", err);
        }
    };

    // Auto-update the deadline date input when month/year changes
    useEffect(() => {
        const { overrideMonth, overrideYear, currentOverride } = deadlineConfig;

        // 1. Check if the current selection matches an active override
        if (currentOverride &&
            currentOverride.month === overrideMonth &&
            currentOverride.year === overrideYear) {
            const dateStr = new Date(currentOverride.deadline_date).toISOString().split('T')[0];
            setDeadlineConfig(prev => ({ ...prev, deadlineDate: dateStr }));
            return;
        }

        // 2. Otherwise default to 4th of the NEXT month
        const nextMonthDate = new Date(overrideYear, overrideMonth, 4); // Date(year, monthIndex, day)
        // Note: overrideMonth is 1-indexed. new Date(2026, 1, 4) is Feb 4th.
        // If overrideMonth is 2 (Feb), new Date(2026, 2, 4) is March 4th. Correct.
        const dateStr = nextMonthDate.toISOString().split('T')[0];
        setDeadlineConfig(prev => ({ ...prev, deadlineDate: dateStr }));

    }, [deadlineConfig.overrideMonth, deadlineConfig.overrideYear, deadlineConfig.currentOverride]);

    // Initial fetch on mount
    useEffect(() => {
        if (user && user.role === 'Admin') fetchDeadlineSettings();
    }, []);

    const saveDeadlineOverride = async () => {
        try {
            setDeadlineConfig(prev => ({ ...prev, loading: true }));
            const res = await axios.post(`${process.env.REACT_APP_API_STRING}/kpi/settings/deadline`, {
                year: deadlineConfig.overrideYear,
                month: deadlineConfig.overrideMonth,
                deadline_date: deadlineConfig.deadlineDate
            }, { withCredentials: true });
            showMessage(res.data.message);
            setDeadlineConfig(prev => ({ ...prev, currentOverride: res.data.override, loading: false }));
        } catch (err) {
            showMessage(err.response?.data?.message || 'Failed to save', 'error');
            setDeadlineConfig(prev => ({ ...prev, loading: false }));
        }
    };

    const clearDeadlineOverride = async () => {
        try {
            const res = await axios.post(`${process.env.REACT_APP_API_STRING}/kpi/settings/deadline`, { clear: true }, { withCredentials: true });
            showMessage(res.data.message);
            setDeadlineConfig(prev => ({ ...prev, currentOverride: null }));
        } catch (err) {
            showMessage('Failed to clear override', 'error');
        }
    };

    const showMessage = (text, type = 'success') => {
        setMessage({ show: true, text, type });
        setTimeout(() => setMessage({ show: false, text: '', type: '' }), 4000);
    };

    const fetchSubmissionDetails = async (dept = '') => {
        try {
            setDetailModal(prev => ({ ...prev, show: true, department: dept || 'Global', loading: true, data: null }));
            let url = `${process.env.REACT_APP_API_STRING}/kpi/admin/submission-status?year=${year}&month=${month}`;
            if (dept) url += `&department=${dept}`;

            const res = await axios.get(url, { withCredentials: true });
            setDetailModal(prev => ({ ...prev, data: res.data, loading: false }));
        } catch (err) {
            console.error("Error fetching submission details", err);
            showMessage("Failed to load details", "error");
            setDetailModal(prev => ({ ...prev, loading: false, show: false }));
        }
    };

    const handleAction = async (e, sheet) => {
        e.stopPropagation();

        // Determine correct action based on current status
        let action, confirmMsg, successMsg;

        if (sheet.status === 'SUBMITTED') {
            action = 'CHECK';
            confirmMsg = "Are you sure you want to CHECK this sheet and proceed to verification?";
            successMsg = "Sheet checked successfully";
        } else if (sheet.status === 'CHECKED') {
            action = 'VERIFY';
            confirmMsg = "Are you sure you want to VERIFY this sheet and proceed to approval?";
            successMsg = "Sheet verified successfully";
        } else if (sheet.status === 'VERIFIED') {
            action = 'APPROVE';
            confirmMsg = "Are you sure you want to APPROVE this sheet?";
            successMsg = "Sheet approved successfully";
        } else {
            return; // No action for other statuses
        }

        if (!window.confirm(confirmMsg)) return;

        try {
            await axios.post(`${process.env.REACT_APP_API_STRING}/kpi/sheet/review`, {
                sheetId: sheet._id,
                action: action,
                comments: `${action} via Admin Dashboard`
            }, { withCredentials: true });

            showMessage(successMsg);
            fetchData(); // Refresh
        } catch (error) {
            console.error("Action failed:", error.response?.data);
            showMessage(`Failed to ${action.toLowerCase()} sheet: ${error.response?.data?.message || 'Unknown error'}`, "error");
        }
    };

    if (user?.role !== 'Admin') {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <h2>Access Denied</h2>
                <p>You do not have permission to view this page.</p>
                <button className="modern-btn primary" onClick={() => navigate('/kpi')}>Go Back</button>
            </div>
        );
    }

    return (
        <motion.div
            className="kpi-modern-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {/* Header */}
            <div className="modern-header">
                <div className="header-title">
                    <h1>KPI Admin Dashboard</h1>
                    <p>Overview of all department submissions and approvals.</p>
                </div>
                <div className="header-actions">
                    <button className="modern-btn secondary" onClick={() => fetchSubmissionDetails('')}>
                        <Icons.Filter /> View All Non-Submitters
                    </button>
                    <button className="modern-btn secondary" onClick={() => navigate('/kpi')}>
                        <Icons.Back /> Back to My KPI
                    </button>
                    <button className="modern-btn primary" onClick={() => navigate('/kpi/pulse')}>
                        <Icons.Dashboard /> CEO Pulse Matrix
                    </button>
                    <div style={{ display: 'flex', gap: '8px', background: 'white', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ border: 'none', padding: '6px', outline: 'none' }}>
                            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                        </select>
                        <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ border: 'none', padding: '6px', outline: 'none' }}>
                            {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Top Toolbar: Deadline Config & Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) 450px', gap: '20px', marginBottom: '24px', alignItems: 'start' }}>

                {/* Left Side: Search & Filters */}
                <motion.div
                    className="modern-section"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="section-header" style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <h2 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Icons.Filter /> Search & Filters
                        </h2>
                    </div>
                    <div className="section-body" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="Search by name, dept, template or quadrant..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%', padding: '12px 14px 12px 40px',
                                        borderRadius: '10px', border: '1px solid #e2e8f0',
                                        outline: 'none', fontSize: '0.95rem',
                                        background: '#f8fafc', focus: { background: 'white', borderColor: '#6366f1' }
                                    }}
                                />
                                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontSize: '1.2rem' }}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <select
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', background: 'white' }}
                                >
                                    <option value="">All Departments</option>
                                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                                    <button
                                        className="modern-btn"
                                        onClick={fetchData}
                                        style={{ padding: '4px 12px', fontSize: '0.8rem', background: 'white' }}
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Right Side: Deadline Configuration */}
                <motion.div
                    className="modern-section"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    style={{ borderTop: '4px solid #f59e0b' }}
                >
                    <div
                        style={{
                            padding: '16px 20px', borderBottom: '1px solid #f1f5f9',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}
                    >
                        <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            📅 Submission Deadline
                        </h2>
                        {deadlineConfig.currentOverride && (
                            <span style={{
                                padding: '3px 10px', borderRadius: '20px',
                                background: '#fef3c7', color: '#92400e',
                                fontSize: '0.75rem', fontWeight: 700
                            }}>
                                OVERRIDE ACTIVE
                            </span>
                        )}
                    </div>
                    <div className="section-body" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) 2fr', gap: '10px', alignItems: 'center' }}>
                                <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Period:</label>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <select
                                        value={deadlineConfig.overrideMonth}
                                        onChange={(e) => setDeadlineConfig(prev => ({ ...prev, overrideMonth: Number(e.target.value) }))}
                                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                                    >
                                        {months.map((m, i) => <option key={i} value={i + 1}>{m.substring(0, 3)}</option>)}
                                    </select>
                                    <select
                                        value={deadlineConfig.overrideYear}
                                        onChange={(e) => setDeadlineConfig(prev => ({ ...prev, overrideYear: Number(e.target.value) }))}
                                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                                    >
                                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) 2fr', gap: '10px', alignItems: 'center' }}>
                                <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Deadline:</label>
                                <input
                                    type="date"
                                    value={deadlineConfig.deadlineDate}
                                    onChange={(e) => setDeadlineConfig(prev => ({ ...prev, deadlineDate: e.target.value }))}
                                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                <button
                                    className="modern-btn primary"
                                    onClick={saveDeadlineOverride}
                                    disabled={!deadlineConfig.deadlineDate || deadlineConfig.loading}
                                    style={{ flex: 1, fontSize: '0.8rem', padding: '10px', justifyContent: 'center' }}
                                >
                                    {deadlineConfig.loading ? '...' : 'Save Extension'}
                                </button>
                                {deadlineConfig.currentOverride && (
                                    <button
                                        className="modern-btn secondary"
                                        onClick={clearDeadlineOverride}
                                        style={{ padding: '10px', border: '1px solid #dc2626', color: '#dc2626' }}
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Stats Summary Area */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{ marginBottom: '24px' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b', fontWeight: 700 }}>
                        Department Pulse <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.9rem' }}>({months[month - 1]} {year})</span>
                    </h3>
                </div>
                <div className="modern-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                    {stats.length > 0 ? stats.map((stat) => (
                        <div
                            key={stat._id}
                            className="modern-stat-card"
                            style={{ background: 'white', cursor: 'pointer', border: '1px solid #f1f5f9' }}
                            onClick={() => fetchSubmissionDetails(stat._id)}
                            whileHover={{ scale: 1.02, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        >
                            <div className="icon-box blue" style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>
                                {stat._id.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="stat-content" style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ fontSize: '1.2rem' }}>{stat._id}</h3>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#22c55e' }}>{Math.round((stat.approved / stat.total) * 100)}%</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                                    <div style={{ width: `${(stat.approved / stat.total) * 100}%`, height: '100%', background: '#22c55e' }}></div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', fontSize: '0.75rem', color: '#64748b' }}>
                                    <span>T: {stat.total}</span>
                                    <span>Sub: {stat.submitted}</span>
                                    <span>App: {stat.approved}</span>
                                    <span style={{ marginLeft: 'auto', color: '#6366f1', fontWeight: 600 }}>See Details →</span>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div style={{ padding: '30px', color: '#94a3b8', gridColumn: '1 / -1', textAlign: 'center', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                            No statistics available for this period.
                        </div>
                    )}
                </div>
            </motion.div>

            <div style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
                Showing {sheets.filter(sheet => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    const name = sheet.user ? `${sheet.user.first_name} ${sheet.user.last_name}`.toLowerCase() : '';
                    const dept = (sheet.department || '').toLowerCase();
                    const tmpl = (sheet.template_version?.name || '').toLowerCase();
                    const quadrant = (sheet.summary?.performance_quadrant || '').toLowerCase();
                    return name.includes(q) || dept.includes(q) || tmpl.includes(q) || quadrant.includes(q);
                }).length} KPI Sheets
            </div>

            {/* Sheets Table */}
            <motion.div
                className="modern-section"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                <div className="section-body" style={{ padding: 0 }}>
                    {sheets.length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="modern-table" style={{ border: 'none' }}>
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr>
                                        <th style={{ paddingLeft: '24px' }}>Employee</th>
                                        <th>Department</th>
                                        <th>Template</th>
                                        <th style={{ textAlign: 'center' }}>Status</th>
                                        <th>Check Date</th>
                                        <th>Verify Date</th>
                                        <th>Approve Date</th>
                                        <th style={{ textAlign: 'center' }}>Score</th>
                                        <th style={{ textAlign: 'center' }}>Avg Wt.</th>
                                        <th style={{ textAlign: 'center' }}>Quadrant</th>
                                        <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {sheets.filter(sheet => {
                                            if (!searchQuery.trim()) return true;
                                            const q = searchQuery.toLowerCase();
                                            const name = sheet.user ? `${sheet.user.first_name} ${sheet.user.last_name}`.toLowerCase() : '';
                                            const dept = (sheet.department || '').toLowerCase();
                                            const tmpl = (sheet.template_version?.name || '').toLowerCase();
                                            const quadrant = (sheet.summary?.performance_quadrant || '').toLowerCase();
                                            return name.includes(q) || dept.includes(q) || tmpl.includes(q) || quadrant.includes(q);
                                        }).map((sheet, i) => (
                                            <motion.tr
                                                key={sheet._id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: i * 0.05 }}
                                                style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                                                onClick={() => navigate(`/kpi/sheet/${sheet._id}`)}
                                                whileHover={{ background: '#f8fafc' }}
                                            >
                                                <td style={{ paddingLeft: '24px' }}>
                                                    <div style={{ fontWeight: 600, color: '#334155' }}>
                                                        {sheet.user ? `${sheet.user.first_name} ${sheet.user.last_name}` : 'Unknown'}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{sheet.user?.email || ''}</div>
                                                </td>
                                                <td>
                                                    <span style={{ background: '#eef2ff', color: '#4f46e5', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500 }}>
                                                        {sheet.department || '-'}
                                                    </span>
                                                </td>
                                                <td style={{ color: '#64748b' }}>{sheet.template_version?.name || 'Unknown'}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className={`status-badge ${sheet.status.toLowerCase()}`}>{sheet.status}</span>
                                                </td>
                                                <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                                                    {sheet.approval_history?.find(h => h.action === 'CHECK')?.date
                                                        ? new Date(sheet.approval_history.find(h => h.action === 'CHECK').date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                                        : '-'}
                                                </td>
                                                <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                                                    {sheet.approval_history?.find(h => h.action === 'VERIFY')?.date
                                                        ? new Date(sheet.approval_history.find(h => h.action === 'VERIFY').date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                                        : '-'}
                                                </td>
                                                <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                                                    {sheet.approval_history?.find(h => h.action === 'APPROVE')?.date
                                                        ? new Date(sheet.approval_history.find(h => h.action === 'APPROVE').date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                                        : '-'}
                                                </td>
                                                <td style={{ textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                                                    {sheet.summary?.overall_percentage || 0}%
                                                </td>
                                                <td style={{ textAlign: 'center', fontWeight: 600, color: '#059669' }}>
                                                    {sheet.summary?.average_complexity ? sheet.summary.average_complexity.toFixed(1) : '-'}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        background: sheet.summary?.performance_quadrant === 'Star' ? '#dcfce7' : sheet.summary?.performance_quadrant === 'Drainer' ? '#fee2e2' : sheet.summary?.performance_quadrant === 'Specialist' ? '#f3e8ff' : '#e0f2fe',
                                                        color: sheet.summary?.performance_quadrant === 'Star' ? '#059669' : sheet.summary?.performance_quadrant === 'Drainer' ? '#dc2626' : sheet.summary?.performance_quadrant === 'Specialist' ? '#7c3aed' : '#2563eb'
                                                    }}>
                                                        {sheet.summary?.performance_quadrant || '-'}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                        <button
                                                            className="modern-btn icon-only"
                                                            title="View"
                                                            onClick={(e) => { e.stopPropagation(); navigate(`/kpi/sheet/${sheet._id}`); }}
                                                        >
                                                            <Icons.Eye />
                                                        </button>
                                                        {(sheet.status === 'SUBMITTED' || sheet.status === 'CHECKED' || sheet.status === 'VERIFIED') && (
                                                            <button
                                                                className="modern-btn icon-only"
                                                                style={{
                                                                    color: sheet.status === 'VERIFIED' ? '#22c55e' : sheet.status === 'CHECKED' ? '#0078d4' : '#f59e0b',
                                                                    background: sheet.status === 'VERIFIED' ? '#dcfce7' : sheet.status === 'CHECKED' ? '#e0f2fe' : '#fef3c7'
                                                                }}
                                                                title={sheet.status === 'SUBMITTED' ? 'Check' : sheet.status === 'CHECKED' ? 'Verify' : 'Approve'}
                                                                onClick={(e) => handleAction(e, sheet)}
                                                            >
                                                                <Icons.Approve />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <Icons.Dashboard style={{ width: 48, height: 48, opacity: 0.2 }} />
                            <h3>No Sheets Found</h3>
                            <p>No KPI sheets found for the selected month and filter.</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Submission Detail Modal */}
            <AnimatePresence>
                {detailModal.show && (
                    <div className="modern-modal-overlay" onClick={() => setDetailModal(prev => ({ ...prev, show: false }))}>
                        <motion.div
                            className="modern-modal-content"
                            style={{ width: '90%', maxWidth: '900px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                                        Submission Details: {detailModal.department}
                                    </h2>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                                        KPI period: {months[month - 1]} {year}
                                    </p>
                                </div>
                                <button className="close-btn" onClick={() => setDetailModal(prev => ({ ...prev, show: false }))} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    ×
                                </button>
                            </div>

                            <div className="modal-body" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                                {detailModal.loading ? (
                                    <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
                                ) : detailModal.data ? (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{detailModal.data.stats.total}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>TOTAL USERS</div>
                                            </div>
                                            <div style={{ background: '#ecfdf5', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669' }}>{detailModal.data.stats.submitted}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>SUBMITTED</div>
                                            </div>
                                            <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{detailModal.data.stats.pending}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>PENDING</div>
                                            </div>
                                            <div style={{ background: '#fff7ed', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{detailModal.data.stats.late}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>LATE SUBMISSIONS</div>
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '12px', padding: '12px', borderRadius: '8px', background: '#fefce8', border: '1px solid #fef08a', fontSize: '0.85rem', color: '#854d0e' }}>
                                            <strong>Policy Deadline:</strong> {new Date(detailModal.data.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </div>

                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
                                                    <th style={{ padding: '12px 0', fontSize: '0.8rem', color: '#64748b' }}>EMPLOYEE</th>
                                                    <th style={{ padding: '12px 0', fontSize: '0.8rem', color: '#64748b' }}>DEPARTMENT</th>
                                                    <th style={{ padding: '12px 0', fontSize: '0.8rem', color: '#64748b' }}>STATUS</th>
                                                    <th style={{ padding: '12px 0', fontSize: '0.8rem', color: '#64748b' }}>SUBMIT DATE</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detailModal.data.users
                                                    .sort((a, b) => (a.submitted === b.submitted) ? 0 : a.submitted ? 1 : -1)
                                                    .map((u, i) => (
                                                        <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                                                            <td style={{ padding: '12px 0' }}>
                                                                <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>{u.name}</div>
                                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{u.email}</div>
                                                            </td>
                                                            <td style={{ padding: '12px 0' }}>
                                                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.department}</span>
                                                            </td>
                                                            <td style={{ padding: '12px 0' }}>
                                                                {u.submitted ? (
                                                                    <span style={{
                                                                        padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                                                                        background: '#dcfce7', color: '#059669'
                                                                    }}>
                                                                        SUBMITTED
                                                                    </span>
                                                                ) : (
                                                                    <span style={{
                                                                        padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                                                                        background: '#fee2e2', color: '#dc2626'
                                                                    }}>
                                                                        NON-SUBMITTER
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td style={{ padding: '12px 0' }}>
                                                                {u.submissionDate ? (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                        <span style={{ fontSize: '0.8rem', color: '#1e293b' }}>
                                                                            {new Date(u.submissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                        </span>
                                                                        {u.isLate && (
                                                                            <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 700 }}>
                                                                                ⚠️ LATE SUBMISSION
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ) : '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </>
                                ) : null}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {message.show && (
                <div style={{
                    position: 'fixed',
                    top: '80px', right: '20px',
                    padding: '12px 20px', borderRadius: '8px',
                    background: message.type === 'error' ? '#ef5350' : '#22c55e',
                    color: 'white', fontWeight: 500,
                    zIndex: 2000, boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
                }}>
                    {message.text}
                </div>
            )}
        </motion.div>
    );
};

export default KPIAdminDashboard;
