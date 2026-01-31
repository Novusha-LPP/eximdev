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
    const [message, setMessage] = useState({ show: false, text: '', type: '' });

    const departments = [
        'Import DSR', 'Export DSR', 'Documentation', 'e-Sanchit', 'Submission', 'DO', 'Operation',
        'Accounts', 'Billing', 'Admin', 'HR', 'Management'
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

    const showMessage = (text, type = 'success') => {
        setMessage({ show: true, text, type });
        setTimeout(() => setMessage({ show: false, text: '', type: '' }), 4000);
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
                    <button className="modern-btn secondary" onClick={() => navigate('/kpi')}>
                        <Icons.Back /> Back to My KPI
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

            {/* Stats Cards (Submission Rates) */}
            <motion.div
                className="modern-section"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                style={{ background: 'transparent', boxShadow: 'none', border: 'none', padding: 0 }}
            >
                <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', color: '#64748b' }}>Department Analytics ({months[month - 1]} {year})</h3>
                <div className="modern-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                    {stats.length > 0 ? stats.map((stat) => (
                        <div key={stat._id} className="modern-stat-card">
                            <div className="icon-box blue" style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>
                                {stat._id.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="stat-content" style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ fontSize: '1.2rem' }}>{stat._id}</h3>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>{Math.round((stat.approved / stat.total) * 100)}% Approved</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                                    <span style={{ color: '#0078d4' }}>Total: {stat.total}</span>
                                    <span style={{ color: '#22c55e' }}>Approved: {stat.approved}</span>
                                    <span style={{ color: '#f59e0b' }}>Submitted: {stat.submitted}</span>
                                </div>
                                {/* Progress Bar */}
                                <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                                    <div style={{ width: `${(stat.approved / stat.total) * 100}%`, height: '100%', background: '#22c55e' }}></div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div style={{ padding: '20px', color: '#999', gridColumn: '1 / -1', textAlign: 'center', background: 'white', borderRadius: '8px' }}>
                            No statistics available for this month.
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Filter by Dept */}
            <div style={{ margin: '24px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontWeight: 600, color: '#64748b' }}><Icons.Filter /> Filter Sheets:</span>
                <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                >
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
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
                                        <th style={{ textAlign: 'center' }}>Score</th>
                                        <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {sheets.map((sheet, i) => (
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
                                                        {(sheet.department || []).join(', ')}
                                                    </span>
                                                </td>
                                                <td style={{ color: '#64748b' }}>{sheet.template_version?.name || 'Unknown'}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className={`status-badge ${sheet.status.toLowerCase()}`}>{sheet.status}</span>
                                                </td>
                                                <td style={{ textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                                                    {sheet.summary?.overall_percentage || 0}%
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
