import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { UserContext } from "../../contexts/UserContext";
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    Slider, Checkbox, FormControlLabel, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';


import './kpi.scss';

const Icons = {
    Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>,
    Reject: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>,
    Eye: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>,
    Back: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>,
    Pending: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>,

    Filter: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" /></svg>,
    Trend: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" /></svg>,
    Money: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" /></svg>,
    Warning: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" /></svg>,
    Download: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>,
};

const KPIReviewerDashboard = () => {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();

    const [data, setData] = useState({
        pending_check: [],
        pending_verify: [],
        pending_approve: [],
        recently_processed: [],
        counts: { check: 0, verify: 0, approve: 0 }
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('check');
    const [message, setMessage] = useState({ show: false, text: '', type: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSheets, setSelectedSheets] = useState([]);

    // Filter state
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];




    // Review Dialog State
    const [reviewDialog, setReviewDialog] = useState({
        open: false,
        sheetId: null,
        action: '',
        comments: ''
    });

    const [bulkDialog, setBulkDialog] = useState({
        open: false
    });

    useEffect(() => {
        fetchPendingSheets();
    }, []);

    const fetchPendingSheets = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/kpi/reviewer/pending`, { withCredentials: true });
            setData(res.data);
        } catch (error) {
            console.error("Failed to fetch pending sheets", error);
            showMessage("Failed to load pending sheets", "error");
        } finally {
            setLoading(false);
        }
    };



    const showMessage = (text, type = 'success') => {
        setMessage({ show: true, text, type });
        setTimeout(() => setMessage({ show: false, text: '', type: '' }), 4000);
    };

    const handleAction = (sheetId, action) => {
        setReviewDialog({
            open: true,
            sheetId,
            action,
            comments: ''
        });
    };

    const confirmAction = async () => {
        const { sheetId, action, comments } = reviewDialog;

        if (action === 'REJECT' && !comments.trim()) {
            showMessage("Please provide a reason for rejection", "error");
            return;
        }

        try {
            await axios.post(`${process.env.REACT_APP_API_STRING}/kpi/sheet/review`, {
                sheetId,
                action,
                comments
            }, { withCredentials: true });

            showMessage(`Sheet ${action.toLowerCase()}ed successfully`);
            setReviewDialog({ open: false, sheetId: null, action: '', comments: '' });
            fetchPendingSheets();
        } catch (error) {
            console.error("Action failed:", error.response?.data);
            showMessage(`Failed: ${error.response?.data?.message || 'Unknown error'}`, "error");
        }
    };

    const getActiveSheets = () => {
        let sheets = [];
        switch (activeTab) {
            case 'check': sheets = data.pending_check; break;
            case 'verify': sheets = data.pending_verify; break;
            case 'approve': sheets = data.pending_approve; break;
            case 'history': sheets = data.recently_processed; break;
            default: sheets = [];
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            sheets = sheets.filter(s => {
                const name = s.user ? `${s.user.first_name} ${s.user.last_name}`.toLowerCase() : '';
                const dept = (s.department || '').toLowerCase();
                const quadrant = (s.summary?.performance_quadrant || '').toLowerCase();
                return name.includes(q) || dept.includes(q) || quadrant.includes(q);
            });
        }

        // Filter by date for all tabs
        sheets = sheets.filter(s => s.month === filterMonth && s.year === filterYear);

        if (activeTab === 'history') {
            return sheets.sort((a, b) => b.year - a.year || b.month - a.month); // Newest first
        }

        return sheets.sort((a, b) => a.year - b.year || a.month - b.month); // Oldest first (FIFO) for pending
    };

    // Clear selection when filters or tabs change
    useEffect(() => {
        setSelectedSheets([]);
    }, [activeTab, filterMonth, filterYear, searchQuery]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const visibleIds = getActiveSheets().map(s => s._id);
            setSelectedSheets(visibleIds);
        } else {
            setSelectedSheets([]);
        }
    };

    const handleSelectSheet = (e, id) => {
        if (e.target.checked) {
            setSelectedSheets([...selectedSheets, id]);
        } else {
            setSelectedSheets(selectedSheets.filter(sId => sId !== id));
        }
    };

    const handleBulkAction = async () => {
        if (selectedSheets.length === 0) return;

        // Disable "Bulk" in history tab
        if (activeTab === 'history') return;

        setBulkDialog({ open: true });
    };

    const confirmBulkAction = async () => {
        setBulkDialog({ open: false });
        const action = getActionLabel();
        const actionName = action.toLowerCase();

        setLoading(true);
        let successCount = 0;
        let failCount = 0;

        for (const sheetId of selectedSheets) {
            try {
                await axios.post(`${process.env.REACT_APP_API_STRING}/kpi/sheet/review`, {
                    sheetId,
                    action,
                    comments: `Bulk ${actionName} by ${user.first_name}`
                }, { withCredentials: true });
                successCount++;
            } catch (error) {
                console.error(`Failed to bulk ${actionName} sheet ${sheetId}`, error);
                failCount++;
            }
        }

        setSelectedSheets([]);
        fetchPendingSheets();

        if (failCount > 0) {
            showMessage(`Bulk Review completed: ${successCount} successful, ${failCount} failed.`, "warning");
        } else {
            showMessage(`Successfully bulk ${actionName}ed ${successCount} sheets.`, "success");
        }
    };

    const getActionLabel = () => {
        switch (activeTab) {
            case 'check': return 'CHECK';
            case 'verify': return 'VERIFY';
            case 'approve': return 'APPROVE';
            default: return '';
        }
    };

    const filteredCounts = useMemo(() => {
        const check = data.pending_check.filter(s => s.month === filterMonth && s.year === filterYear).length;
        const verify = data.pending_verify.filter(s => s.month === filterMonth && s.year === filterYear).length;
        const approve = data.pending_approve.filter(s => s.month === filterMonth && s.year === filterYear).length;
        const history = data.recently_processed.filter(s => s.month === filterMonth && s.year === filterYear).length;
        return { check, verify, approve, history, total: check + verify + approve };
    }, [data, filterMonth, filterYear]);

    const formatCurrency = (value) => {
        if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
        if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
        if (value >= 1000) return `₹${(value / 1000).toFixed(2)}K`;
        return `₹${value.toFixed(0)}`;
    };

    const COLORS = {
        excellent: '#22c55e',
        good: '#3b82f6',
        average: '#f59e0b',
        poor: '#ef4444',
        primary: '#6366f1',
        secondary: '#8b5cf6'
    };

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
                    <h1>KPI Review Dashboard</h1>
                    <p>Comprehensive analytics and approval management</p>
                </div>
                <div className="header-actions">
                    <button className="modern-btn secondary" onClick={() => navigate('/kpi')}>
                        <Icons.Back /> Back to My KPI
                    </button>
                    {filteredCounts.total > 0 && (
                        <div style={{
                            background: '#ef4444',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontWeight: 600,
                            fontSize: '0.9rem'
                        }}>
                            {filteredCounts.total} Pending
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="modern-stats-grid" style={{ marginBottom: '24px' }}>
                <div
                    className={`modern-stat-card ${activeTab === 'check' ? 'active' : ''}`}
                    onClick={() => setActiveTab('check')}
                    style={{ cursor: 'pointer', border: activeTab === 'check' ? '2px solid #f59e0b' : '1px solid #e2e8f0' }}
                >
                    <div className="icon-box" style={{ background: '#fef3c7', color: '#f59e0b' }}>
                        <Icons.Pending />
                    </div>
                    <div className="stat-content">
                        <h3>{filteredCounts.check}</h3>
                        <p>Pending Check</p>
                    </div>
                </div>

                <div
                    className={`modern-stat-card ${activeTab === 'verify' ? 'active' : ''}`}
                    onClick={() => setActiveTab('verify')}
                    style={{ cursor: 'pointer', border: activeTab === 'verify' ? '2px solid #0078d4' : '1px solid #e2e8f0' }}
                >
                    <div className="icon-box" style={{ background: '#e0f2fe', color: '#0078d4' }}>
                        <Icons.Pending />
                    </div>
                    <div className="stat-content">
                        <h3>{filteredCounts.verify}</h3>
                        <p>Pending Verify</p>
                    </div>
                </div>

                <div
                    className={`modern-stat-card ${activeTab === 'approve' ? 'active' : ''}`}
                    onClick={() => setActiveTab('approve')}
                    style={{ cursor: 'pointer', border: activeTab === 'approve' ? '2px solid #22c55e' : '1px solid #e2e8f0' }}
                >
                    <div className="icon-box" style={{ background: '#dcfce7', color: '#22c55e' }}>
                        <Icons.Pending />
                    </div>
                    <div className="stat-content">
                        <h3>{filteredCounts.approve}</h3>
                        <p>Pending Approve</p>
                    </div>
                </div>

                <div
                    className={`modern-stat-card ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                    style={{ cursor: 'pointer', border: activeTab === 'history' ? '2px solid #64748b' : '1px solid #e2e8f0' }}
                >
                    <div className="icon-box" style={{ background: '#f1f5f9', color: '#64748b' }}>
                        <Icons.Eye />
                    </div>
                    <div className="stat-content">
                        <h3>{filteredCounts.history}</h3>
                        <p>Recently Reviewed</p>
                    </div>
                </div>

            </div>

            {/* Analytics Dashboard */}


            {/* Sheets List (unchanged from original) */}

            <motion.div className="modern-section">
                <div className="section-header" style={{ justifyContent: 'space-between' }}>
                    <h2>
                        {activeTab === 'check' && 'Sheets Pending Check'}
                        {activeTab === 'verify' && 'Sheets Pending Verification'}
                        {activeTab === 'approve' && 'Sheets Pending Approval'}
                        {activeTab === 'history' && 'Recently Reviewed'}
                    </h2>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {selectedSheets.length > 0 && activeTab !== 'history' && (
                            <button
                                className="modern-btn"
                                onClick={handleBulkAction}
                                style={{
                                    background: activeTab === 'check' ? '#f59e0b' : activeTab === 'verify' ? '#0078d4' : '#22c55e',
                                    color: 'white',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Icons.Check /> Bulk {getActionLabel()} ({selectedSheets.length})
                            </button>
                        )}
                        <button
                            className="modern-btn icon-only"
                            title="Refresh Data"
                            onClick={fetchPendingSheets}
                            style={{ marginRight: 8, background: 'white', border: '1px solid #e2e8f0', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, cursor: 'pointer' }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 4v6h-6"></path>
                                <path d="M1 20v-6h6"></path>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                            </svg>
                        </button>

                        <select
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(Number(e.target.value))}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '0.9rem', outline: 'none', background: 'white' }}
                        >
                            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                        </select>
                        <select
                            value={filterYear}
                            onChange={(e) => setFilterYear(Number(e.target.value))}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '0.9rem', outline: 'none', background: 'white' }}
                        >
                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
                {/* Search Bar */}
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Search by employee name, department, quadrant..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ flex: 1, padding: '8px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '0.8rem', color: '#64748b' }}>Clear</button>
                    )}
                </div>
                <div className="section-body" style={{ padding: 0 }}>
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>Loading...</div>
                    ) : getActiveSheets().length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="modern-table" style={{ border: 'none' }}>
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr>
                                        {activeTab !== 'history' && (
                                            <th style={{ paddingLeft: '24px', width: '40px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={getActiveSheets().length > 0 && selectedSheets.length === getActiveSheets().length}
                                                    onChange={handleSelectAll}
                                                    style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                                />
                                            </th>
                                        )}
                                        <th style={{ paddingLeft: activeTab !== 'history' ? '12px' : '24px' }}>Employee</th>
                                        <th>Department</th>
                                        <th>Period</th>
                                        <th>Check Date</th>
                                        <th>Verify Date</th>
                                        <th>Approve Date</th>
                                        <th style={{ textAlign: 'center' }}>Status</th>
                                        <th style={{ textAlign: 'center' }}>Score</th>
                                        <th style={{ textAlign: 'center' }}>Value</th>
                                        <th style={{ textAlign: 'center' }}>Quadrant</th>
                                        {activeTab === 'history' && <th>Last Action</th>}
                                        <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {getActiveSheets().map((sheet, i) => {
                                            const lastRejection = sheet.approval_history?.filter(h => h.action === 'REJECT').pop();

                                            return (
                                                <motion.tr
                                                    key={sheet._id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: i * 0.03 }}
                                                    style={{ borderBottom: '1px solid #f1f5f9', background: selectedSheets.includes(sheet._id) ? '#f8fafc' : 'transparent' }}
                                                >
                                                    {activeTab !== 'history' && (
                                                        <td style={{ paddingLeft: '24px' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedSheets.includes(sheet._id)}
                                                                onChange={(e) => handleSelectSheet(e, sheet._id)}
                                                                style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                                            />
                                                        </td>
                                                    )}
                                                    <td style={{ paddingLeft: activeTab !== 'history' ? '12px' : '24px' }}>
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
                                                    <td style={{ color: '#64748b' }}>
                                                        {new Date(sheet.year, sheet.month - 1).toLocaleDateString('default', { month: 'short', year: 'numeric' })}
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
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className={`status-badge ${sheet.status.toLowerCase()}`}>{sheet.status}</span>
                                                        {lastRejection && sheet.status === 'REJECTED' && (
                                                            <div style={{ fontSize: '0.65rem', color: '#ef4444', marginTop: '4px', maxWidth: '150px' }}>
                                                                Reason: {lastRejection.comments || 'No reason provided'}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                                                        {sheet.summary?.overall_percentage || 0}%
                                                    </td>
                                                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#059669' }}>
                                                        {sheet.summary?.total_value_score || 0}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '12px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            background: sheet.summary?.performance_quadrant === 'Star' ? '#dcfce7' : sheet.summary?.performance_quadrant === 'Drainer' ? '#fee2e2' : '#e0f2fe',
                                                            color: sheet.summary?.performance_quadrant === 'Star' ? '#059669' : sheet.summary?.performance_quadrant === 'Drainer' ? '#dc2626' : '#2563eb'
                                                        }}>
                                                            {sheet.summary?.performance_quadrant || 'N/A'}
                                                        </span>
                                                    </td>
                                                    {activeTab === 'history' && (
                                                        <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                            {sheet.approval_history?.slice(-1)[0]?.action || '-'}
                                                        </td>
                                                    )}
                                                    <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                            <button
                                                                className="modern-btn icon-only"
                                                                title="View Sheet"
                                                                onClick={() => navigate(`/kpi/sheet/${sheet._id}`)}
                                                            >
                                                                <Icons.Eye />
                                                            </button>
                                                            {activeTab !== 'history' && (
                                                                <>
                                                                    <button
                                                                        className="modern-btn icon-only"
                                                                        style={{
                                                                            color: activeTab === 'check' ? '#f59e0b' : activeTab === 'verify' ? '#0078d4' : '#22c55e',
                                                                            background: activeTab === 'check' ? '#fef3c7' : activeTab === 'verify' ? '#e0f2fe' : '#dcfce7'
                                                                        }}
                                                                        title={getActionLabel()}
                                                                        onClick={() => handleAction(sheet._id, getActionLabel())}
                                                                    >
                                                                        <Icons.Check />
                                                                    </button>
                                                                    <button
                                                                        className="modern-btn icon-only"
                                                                        style={{ color: '#ef4444', background: '#fee2e2' }}
                                                                        title="Reject"
                                                                        onClick={() => handleAction(sheet._id, 'REJECT')}
                                                                    >
                                                                        <Icons.Reject />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-state" style={{ padding: '60px' }}>
                            <Icons.Check style={{ width: 48, height: 48, opacity: 0.2 }} />
                            <h3>No Sheets Pending</h3>
                            <p>You're all caught up! No sheets require your review in this category.</p>
                        </div>
                    )}
                </div>
            </motion.div>


            {/* Review Dialog */}
            <Dialog open={reviewDialog.open} onClose={() => setReviewDialog({ ...reviewDialog, open: false })} fullWidth maxWidth="sm">
                <DialogTitle>
                    {reviewDialog.action === 'CHECK' ? '✓ Check Sheet' :
                        reviewDialog.action === 'VERIFY' ? '✓ Verify Sheet' :
                            reviewDialog.action === 'APPROVE' ? '✅ Approve Sheet' : '❌ Reject Sheet'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label={reviewDialog.action === 'REJECT' ? "Reason for Rejection (Required)" : "Comments (Optional)"}
                        fullWidth
                        multiline
                        rows={4}
                        value={reviewDialog.comments}
                        onChange={(e) => setReviewDialog({ ...reviewDialog, comments: e.target.value })}
                        placeholder={reviewDialog.action === 'REJECT' ? "Please explain why this sheet is being rejected..." : "Add any comments..."}
                        required={reviewDialog.action === 'REJECT'}
                        error={reviewDialog.action === 'REJECT' && !reviewDialog.comments.trim()}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReviewDialog({ ...reviewDialog, open: false })}>Cancel</Button>
                    <Button
                        onClick={confirmAction}
                        variant="contained"
                        color={reviewDialog.action === 'REJECT' ? "error" : "primary"}
                    >
                        {reviewDialog.action}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Bulk Action Dialog */}
            <Dialog open={bulkDialog.open} onClose={() => setBulkDialog({ open: false })} fullWidth maxWidth="xs">
                <DialogTitle style={{ fontWeight: 700 }}>Confirm Bulk Action</DialogTitle>
                <DialogContent>
                    <p style={{ margin: 0, color: '#334155' }}>
                        Are you sure you want to bulk <strong>{getActionLabel().toLowerCase()}</strong> {selectedSheets.length} sheets?
                    </p>
                    <p style={{ margin: '12px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                        This action cannot be immediately undone and employees will be notified.
                    </p>
                </DialogContent>
                <DialogActions style={{ padding: '16px 24px' }}>
                    <Button onClick={() => setBulkDialog({ open: false })} style={{ color: '#64748b' }}>Cancel</Button>
                    <Button
                        onClick={confirmBulkAction}
                        variant="contained"
                        style={{ background: '#6366f1', color: '#fff', fontWeight: 600 }}
                    >
                        Confirm Action
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Toast Message */}
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

export default KPIReviewerDashboard;