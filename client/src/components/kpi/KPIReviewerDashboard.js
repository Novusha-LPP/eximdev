import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { UserContext } from "../../contexts/UserContext";
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import './kpi.scss';

const Icons = {
    Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>,
    Reject: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>,
    Eye: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>,
    Back: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>,
    Pending: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>,
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

        // Filter by month and year
        return sheets.filter(s => s.month === filterMonth && s.year === filterYear)
            .sort((a, b) => a.month - b.month); // Sort by month
    };

    const getActionLabel = () => {
        switch (activeTab) {
            case 'check': return 'CHECK';
            case 'verify': return 'VERIFY';
            case 'approve': return 'APPROVE';
            default: return '';
        }
    };

    const totalPending = data.counts.check + data.counts.verify + data.counts.approve;

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
                    <p>Sheets pending your review and approval</p>
                </div>
                <div className="header-actions">
                    <button className="modern-btn secondary" onClick={() => navigate('/kpi')}>
                        <Icons.Back /> Back to My KPI
                    </button>
                    {totalPending > 0 && (
                        <div style={{
                            background: '#ef4444',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontWeight: 600,
                            fontSize: '0.9rem'
                        }}>
                            {totalPending} Pending
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
                        <h3>{data.counts.check}</h3>
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
                        <h3>{data.counts.verify}</h3>
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
                        <h3>{data.counts.approve}</h3>
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
                        <h3>{data.recently_processed.length}</h3>
                        <p>Recently Reviewed</p>
                    </div>
                </div>
            </div>

            {/* Sheets List */}
            <motion.div className="modern-section">
                <div className="section-header" style={{ justifyContent: 'space-between' }}>
                    <h2>
                        {activeTab === 'check' && 'Sheets Pending Check'}
                        {activeTab === 'verify' && 'Sheets Pending Verification'}
                        {activeTab === 'approve' && 'Sheets Pending Approval'}
                        {activeTab === 'history' && 'Recently Reviewed'}
                    </h2>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <select
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(Number(e.target.value))}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '0.9rem', outline: 'none' }}
                        >
                            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                        </select>
                        <select
                            value={filterYear}
                            onChange={(e) => setFilterYear(Number(e.target.value))}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '0.9rem', outline: 'none' }}
                        >
                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
                <div className="section-body" style={{ padding: 0 }}>
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>Loading...</div>
                    ) : getActiveSheets().length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="modern-table" style={{ border: 'none' }}>
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr>
                                        <th style={{ paddingLeft: '24px' }}>Employee</th>
                                        <th>Department</th>
                                        <th>Period</th>
                                        <th>Check Date</th>
                                        <th>Verify Date</th>
                                        <th>Approve Date</th>
                                        <th style={{ textAlign: 'center' }}>Status</th>
                                        <th style={{ textAlign: 'center' }}>Score</th>
                                        {activeTab === 'history' && <th>Last Action</th>}
                                        <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {getActiveSheets().map((sheet, i) => {
                                            // Get last rejection reason if any
                                            const lastRejection = sheet.approval_history?.filter(h => h.action === 'REJECT').pop();

                                            return (
                                                <motion.tr
                                                    key={sheet._id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: i * 0.03 }}
                                                    style={{ borderBottom: '1px solid #f1f5f9' }}
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
