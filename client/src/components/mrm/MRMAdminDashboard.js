import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import {
    fetchMRMUsers,
    fetchMRMDashboard,
    fetchApprovalQueue,
    fetchAnnualRollup,
    fetchRecurringIssues,
    fetchMRMOpenPoints,
    approveMRM,
    requestMRMRevision,
    updateObjectiveConfig
} from '../../services/mrmService';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    TextField,
    IconButton,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Snackbar,
    Alert
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import TimelineIcon from '@mui/icons-material/Timeline';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import TuneIcon from '@mui/icons-material/Tune';
import SearchIcon from '@mui/icons-material/Search';
import '../../styles/mrm.scss';

const API_URL = (process.env.REACT_APP_API_STRING || 'http://localhost:9006/api');

const MRMAdminDashboard = () => {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();

    // Permissions check: Executive (Suraj/Admin) vs HOD
    const isAdmin = String(user?.role || '').toLowerCase() === 'admin';
    const isSuraj = user?.username === 'suraj_rajan' || String(user?.username || '').includes('suraj');
    const isApprover = isAdmin || isSuraj;
    const isHOD = String(user?.role || '').toLowerCase() === 'head_of_department' || String(user?.role || '').toLowerCase() === 'hod';
    const canAccessApprovalQueue = isApprover || isHOD;
    const isAuthorized = canAccessApprovalQueue || (user?.modules && user.modules.includes('MRM'));

    // Navigation Tabs: 0: Approval Queue, 1: Submissions Matrix, 2: Annual Rollup, 3: Recurring Issues, 4: MRM Open Points
    const [activeTab, setActiveTab] = useState(canAccessApprovalQueue ? 0 : 1);

    // Global Filter State
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedUserId, setSelectedUserId] = useState('');
    const [mrmUsers, setMrmUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Tab 0: Approval Queue State
    const [queueData, setQueueData] = useState([]);

    // Tab 1: Submissions Matrix State
    const [submissionsData, setSubmissionsData] = useState([]);

    // Tab 2: Annual Rollup State
    const [rollupData, setRollupData] = useState(null);
    const [forecastMethod, setForecastMethod] = useState('best_worst'); // 'best_worst', 'run_rate', 'linear_trend'
    const [tileFilter, setTileFilter] = useState('');
    const [anomalyOnlyFilter, setAnomalyOnlyFilter] = useState(false);
    const [objectiveSearchQuery, setObjectiveSearchQuery] = useState('');

    // Objective Config Modal State (Admin)
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [configTargetObj, setConfigTargetObj] = useState(null);
    const [configAggregation, setConfigAggregation] = useState('Sum');
    const [configOptimization, setConfigOptimization] = useState('Higher');
    const [configTolerance, setConfigTolerance] = useState(5);
    const [configBaseline, setConfigBaseline] = useState('');
    const [configBaselineMetric, setConfigBaselineMetric] = useState('');
    const [configSaving, setConfigSaving] = useState(false);

    // Approval Confirmation Modal State
    const [approveModal, setApproveModal] = useState({ open: false, item: null });

    // Tab 3: Recurring Issues State
    const [recurringData, setRecurringData] = useState({ consecutiveRed: [], chronicOwners: [], systemicTiles: [] });

    // Tab 4: MRM Open Points State
    const [openPointsData, setOpenPointsData] = useState([]);
    const [opStatusFilter, setOpStatusFilter] = useState('all');
    const [opAgeFilter, setOpAgeFilter] = useState('all'); // 'all', '30', '60', 'overdue'
    const [opOwnerSearch, setOpOwnerSearch] = useState('');

    // Action & Modal States
    const [actionLoading, setActionLoading] = useState(false);
    const [revisionModal, setRevisionModal] = useState({ open: false, item: null, comment: '' });

    // Modern Toast Notification State
    const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
    const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

    // Load initial users list
    useEffect(() => {
        if (isAuthorized) {
            fetchMRMUsers().then(users => setMrmUsers(users)).catch(console.error);
        }
    }, [isAuthorized]);

    // Reload tab data whenever tab or filters change
    useEffect(() => {
        if (!isAuthorized) return;

        if (activeTab === 0 && canAccessApprovalQueue) {
            loadApprovalQueue();
        } else if (activeTab === 1) {
            loadSubmissionsMatrix();
        } else if (activeTab === 2) {
            loadRollupData();
        } else if (activeTab === 3) {
            loadRecurringIssues();
        } else if (activeTab === 4) {
            loadMRMOpenPoints();
        }
    }, [activeTab, selectedMonth, selectedYear, selectedUserId, forecastMethod, opStatusFilter, opAgeFilter, opOwnerSearch, isAuthorized]);

    // Data Fetchers
    const loadApprovalQueue = async () => {
        setLoading(true);
        try {
            const data = await fetchApprovalQueue(selectedYear);
            setQueueData(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load approval queue", err);
            setQueueData([]);
        } finally {
            setLoading(false);
        }
    };

    const loadSubmissionsMatrix = async () => {
        setLoading(true);
        try {
            const monthStr = String(selectedMonth).padStart(2, '0');
            const data = await fetchMRMDashboard(monthStr, selectedYear);
            setSubmissionsData(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load submissions matrix", err);
            setSubmissionsData([]);
        } finally {
            setLoading(false);
        }
    };

    const loadRollupData = async () => {
        setLoading(true);
        try {
            const data = await fetchAnnualRollup({
                year: selectedYear,
                userId: selectedUserId || undefined,
                forecastMethod
            });
            setRollupData(data);
        } catch (err) {
            console.error("Failed to load annual rollup", err);
            setRollupData(null);
        } finally {
            setLoading(false);
        }
    };

    const loadRecurringIssues = async () => {
        setLoading(true);
        try {
            const data = await fetchRecurringIssues(selectedYear);
            setRecurringData(data || { consecutiveRed: [], chronicOwners: [], systemicTiles: [] });
        } catch (err) {
            console.error("Failed to load recurring issues", err);
            setRecurringData({ consecutiveRed: [], chronicOwners: [], systemicTiles: [] });
        } finally {
            setLoading(false);
        }
    };

    const loadMRMOpenPoints = async () => {
        setLoading(true);
        try {
            const params = {};
            if (opStatusFilter !== 'all') params.status = opStatusFilter;
            if (opAgeFilter !== 'all') params.age = opAgeFilter;
            if (opOwnerSearch.trim()) params.owner = opOwnerSearch.trim();
            if (selectedUserId) params.userId = selectedUserId;
            const data = await fetchMRMOpenPoints(params);
            setOpenPointsData(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load MRM Open Points", err);
            setOpenPointsData([]);
        } finally {
            setLoading(false);
        }
    };

    // Approval Queue Actions
    const handleConfirmApprove = async () => {
        if (!approveModal.item) return;
        const item = approveModal.item;
        setActionLoading(true);
        try {
            await approveMRM({
                month: item.month,
                year: item.year,
                userId: item.userId
            });
            showToast("MRM successfully approved and locked.", 'success');
            setApproveModal({ open: false, item: null });
            loadApprovalQueue();
        } catch (err) {
            showToast("Approval failed: " + (err.response?.data?.error || err.message), 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectClick = (item) => {
        setRevisionModal({
            open: true,
            item,
            comment: ''
        });
    };

    const scrollToObjective = (tile, objective) => {
        if (tileFilter && tileFilter !== tile) {
            setTileFilter('');
        }
        setObjectiveSearchQuery('');
        setTimeout(() => {
            const id = `mrm-obj-${encodeURIComponent(tile || 'General')}-${encodeURIComponent(objective)}`;
            const el = document.getElementById(id);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.style.backgroundColor = '#fed7aa';
                el.style.outline = '3px solid #ea580c';
                setTimeout(() => {
                    el.style.backgroundColor = '';
                    el.style.outline = '';
                }, 3500);
            }
        }, 150);
    };

    const openConfigModal = (obj) => {
        setConfigTargetObj(obj);
        setConfigAggregation(obj.aggregationType || 'Sum');
        setConfigOptimization(obj.optimizationDirection || 'Higher');
        setConfigTolerance(obj.toleranceBand != null ? obj.toleranceBand : 5);
        setConfigBaseline(obj.lastYearBaseline != null ? obj.lastYearBaseline : '');
        setConfigBaselineMetric(obj.lastYearBaselineMetric || '');
        setConfigModalOpen(true);
    };

    const handleSaveConfig = async () => {
        if (!configTargetObj) return;
        setConfigSaving(true);
        try {
            await updateObjectiveConfig({
                objective: configTargetObj.objective,
                processDescription: configTargetObj.tile,
                userId: selectedUserId || undefined,
                year: selectedYear,
                aggregationType: configAggregation,
                optimizationDirection: configOptimization,
                toleranceBand: Number(configTolerance),
                lastYearBaseline: configBaseline !== '' ? Number(configBaseline) : null,
                lastYearBaselineMetric: configBaselineMetric.trim(),
                applyToAllMonths: true
            });
            setConfigModalOpen(false);
            showToast("Configuration saved successfully", 'success');
            await loadRollupData();
        } catch (err) {
            console.error("Failed to update config", err);
            showToast("Failed to update config: " + (err.response?.data?.error || err.message), 'error');
        } finally {
            setConfigSaving(false);
        }
    };

    const handleConfirmRevision = async () => {
        if (!revisionModal.comment.trim()) {
            showToast("Please enter revision feedback comments.", 'warning');
            return;
        }
        setActionLoading(true);
        try {
            await requestMRMRevision({
                month: revisionModal.item.month,
                year: revisionModal.item.year,
                userId: revisionModal.item.userId,
                comment: revisionModal.comment
            });
            setRevisionModal({ open: false, item: null, comment: '' });
            showToast("MRM sent back for revision.", 'info');
            loadApprovalQueue();
        } catch (err) {
            showToast("Failed to request revision: " + (err.response?.data?.error || err.message), 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const getMonthName = (m) => new Date(0, m - 1).toLocaleString('default', { month: 'long' });
    const getMonthShort = (m) => new Date(0, m - 1).toLocaleString('default', { month: 'short' });

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    if (!isAuthorized) {
        return (
            <div className="mrm-container">
                <div className="title-bar">
                    <div className="title-center">
                        <h1>Access Restricted</h1>
                        <span className="user-name">You need HOD or Executive permissions to view this dashboard.</span>
                    </div>
                </div>
            </div>
        );
    }

    // Executive KPI Summary Values
    const pendingCount = queueData.length;
    const activePresentersCount = submissionsData.length;
    const totalItems = submissionsData.reduce((acc, row) => acc + (row.itemsCount || 0), 0);
    const totalGreen = submissionsData.reduce((acc, row) => acc + (row.greenCount || 0), 0);
    const healthPercentage = totalItems > 0 ? Math.round((totalGreen / totalItems) * 100) : 100;

    return (
        <div className="mrm-container">
            {/* Title Bar */}
            <div className="title-bar">
                <div className="title-center">
                    <h1>Executive MRM & Operations Governance</h1>
                    <span className="user-name">
                        {isApprover ? 'Executive Approver View — Suraj Rajan / Admin' : `Department Management — ${user?.first_name} ${user?.last_name}`}
                    </span>
                </div>
                <div className="title-buttons">
                    <button className="help-btn" onClick={() => navigate('/mrm')}>
                        <span>📋</span> My MRM Sheet
                    </button>
                </div>
            </div>

            {/* Executive KPI Summary Cards */}
            <div className="mrm-kpi-grid">
                <div className={`kpi-card ${pendingCount > 0 ? 'warning' : 'success'}`}>
                    <div className="kpi-header">
                        <span className="kpi-title">Pending Approvals</span>
                        <div className="kpi-icon-badge">
                            {pendingCount > 0 ? <WarningAmberIcon sx={{ fontSize: 18 }} /> : <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />}
                        </div>
                    </div>
                    <div className="kpi-value">{pendingCount}</div>
                    <div className="kpi-subtitle">
                        {pendingCount > 0 ? `${pendingCount} sheets awaiting executive review` : 'All submitted sheets up to date'}
                    </div>
                </div>

                <div className="kpi-card info">
                    <div className="kpi-header">
                        <span className="kpi-title">Active Presenters</span>
                        <div className="kpi-icon-badge">
                            <PeopleIcon sx={{ fontSize: 18 }} />
                        </div>
                    </div>
                    <div className="kpi-value">{activePresentersCount}</div>
                    <div className="kpi-subtitle">
                        Reporting HODs for {getMonthName(selectedMonth)} {selectedYear}
                    </div>
                </div>

                <div className="kpi-card success">
                    <div className="kpi-header">
                        <span className="kpi-title">Health Index</span>
                        <div className="kpi-icon-badge">
                            <TimelineIcon sx={{ fontSize: 18 }} />
                        </div>
                    </div>
                    <div className="kpi-value">{healthPercentage}%</div>
                    <div className="kpi-subtitle">
                        {totalGreen} Green of {totalItems} total monthly objectives
                    </div>
                </div>

                <div className="kpi-card accent">
                    <div className="kpi-header">
                        <span className="kpi-title">Synced Action Points</span>
                        <div className="kpi-icon-badge">
                            <AssignmentIcon sx={{ fontSize: 18 }} />
                        </div>
                    </div>
                    <div className="kpi-value">{openPointsData.length}</div>
                    <div className="kpi-subtitle">
                        Active items tracking in Open Points
                    </div>
                </div>
            </div>

            {/* Top Navigation Tabs */}
            <div className="mrm-dashboard-tabs">
                {canAccessApprovalQueue && (
                    <button
                        className={`dash-tab ${activeTab === 0 ? 'active' : ''}`}
                        onClick={() => setActiveTab(0)}
                    >
                        <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />
                        {isApprover ? "Suraj's Approval Queue" : "Team Approval Queue"}
                        {queueData.length > 0 && <span className="tab-badge">{queueData.length}</span>}
                    </button>
                )}
                <button
                    className={`dash-tab ${activeTab === 1 ? 'active' : ''}`}
                    onClick={() => setActiveTab(1)}
                >
                    <PeopleIcon sx={{ fontSize: 18 }} />
                    Submissions Matrix
                </button>
                <button
                    className={`dash-tab ${activeTab === 2 ? 'active' : ''}`}
                    onClick={() => setActiveTab(2)}
                >
                    <TimelineIcon sx={{ fontSize: 18 }} />
                    Annual Rollup & Forecast
                </button>
                <button
                    className={`dash-tab ${activeTab === 3 ? 'active' : ''}`}
                    onClick={() => setActiveTab(3)}
                >
                    <WarningAmberIcon sx={{ fontSize: 18 }} />
                    Recurring Issues & Bottlenecks
                </button>
                <button
                    className={`dash-tab ${activeTab === 4 ? 'active' : ''}`}
                    onClick={() => setActiveTab(4)}
                >
                    <AssignmentIcon sx={{ fontSize: 18 }} />
                    MRM Open Points Hub
                </button>
            </div>

            {/* TAB 0: EXECUTIVE / HOD APPROVAL QUEUE */}
            {activeTab === 0 && canAccessApprovalQueue && (
                <div style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#14532d' }}>
                                {isApprover ? "Pending Approvals — Executive Queue" : "Pending Team Submissions"} ({queueData.length})
                            </h2>
                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                {isApprover 
                                    ? "Submitted sheets awaiting executive review. Reviewing ensures objectives are certified before locking."
                                    : "Track your department's submissions, wait times, and follow-through on monthly objectives."}
                            </span>
                        </div>
                        <button
                            onClick={loadApprovalQueue}
                            style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <AutorenewIcon sx={{ fontSize: 16 }} /> Refresh
                        </button>
                    </div>

                    <div className="data-grid-container" style={{ borderRadius: '12px' }}>
                        {loading ? (
                            <p style={{ padding: '40px', textAlign: 'center' }}>Loading queue...</p>
                        ) : queueData.length === 0 ? (
                            <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>
                                <CheckCircleOutlineIcon sx={{ fontSize: 48, color: '#16a34a', mb: 1 }} />
                                <h3>All Caught Up!</h3>
                                <p>There are currently no MRM submissions pending your approval.</p>
                            </div>
                        ) : (
                            <table style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '80px' }}>Wait Time</th>
                                        <th style={{ width: '180px' }}>Presenter</th>
                                        <th style={{ width: '110px' }}>Month</th>
                                        <th style={{ width: '90px' }}>Items</th>
                                        <th style={{ width: '130px' }}>Health</th>
                                        <th style={{ width: '120px' }}>Submitted On</th>
                                        <th style={{ width: '220px', textAlign: 'center' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {queueData.map((item, idx) => {
                                        const presenter = item.presenterName || (item.user ? `${item.user.first_name || ''} ${item.user.last_name || ''}`.trim() || item.user.username : 'Unknown Presenter');
                                        const uname = item.username || item.user?.username || '';
                                        const uid = item.userId || item.user?._id || item.user;
                                        const count = item.totalItems ?? item.itemsCount ?? 0;
                                        const waitText = item.waitDisplay || `${item.daysPending ?? 0}d ago`;

                                        return (
                                            <tr key={item._id || item.metadataId || idx}>
                                                <td style={{ textAlign: 'center', fontWeight: '700', color: (item.daysPending || 0) > 3 ? '#dc2626' : '#b45309' }}>
                                                    {waitText}
                                                </td>
                                                <td style={{ fontWeight: '600' }}>
                                                    {presenter}
                                                    {uname && <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>@{uname}</div>}
                                                </td>
                                                <td style={{ fontWeight: '500' }}>
                                                    {getMonthName(Number(item.month))} {item.year}
                                                </td>
                                                <td style={{ textAlign: 'center', fontWeight: '600' }}>
                                                    {count}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem' }}>
                                                            {item.greenCount ?? 0} 🟢
                                                        </span>
                                                        <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem' }}>
                                                            {item.redCount ?? 0} 🔴
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: '0.82rem', color: '#475569' }}>
                                                    {formatDate(item.submittedAt)}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => navigate(`/mrm?userId=${uid}&month=${Number(item.month)}&year=${item.year}`)}
                                                        style={{ background: '#217346', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem', marginRight: '6px' }}
                                                    >
                                                        Review
                                                    </button>
                                                    {isApprover && (
                                                        <>
                                                            <button
                                                                onClick={() => setApproveModal({ open: true, item })}
                                                                disabled={actionLoading}
                                                                style={{ background: '#166534', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem', marginRight: '6px' }}
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectClick(item)}
                                                                disabled={actionLoading}
                                                                style={{ background: '#dc2626', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem' }}
                                                            >
                                                                Send Back
                                                            </button>
                                                        </>
                                                    )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 1: SUBMISSIONS MATRIX */}
            {activeTab === 1 && (
                <div style={{ padding: '20px 24px' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px',
                        background: '#ffffff',
                        padding: '16px 20px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                        flexWrap: 'wrap',
                        gap: '14px'
                    }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#166534', fontWeight: 700 }}>
                                Submissions for {getMonthName(selectedMonth)} {selectedYear}
                            </h2>
                            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                                Department MRM submissions matrix, health status breakdown, and approval states.
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div className="executive-select-wrapper">
                                <select
                                    value={selectedMonth}
                                    onChange={e => setSelectedMonth(Number(e.target.value))}
                                    className="executive-select"
                                    style={{ minWidth: '135px' }}
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>{getMonthName(m)}</option>
                                    ))}
                                </select>
                                <span className="select-arrow">▼</span>
                            </div>

                            <div className="executive-select-wrapper">
                                <select
                                    value={selectedYear}
                                    onChange={e => setSelectedYear(Number(e.target.value))}
                                    className="executive-select"
                                    style={{ minWidth: '95px' }}
                                >
                                    {[2024, 2025, 2026, 2027, 2028].map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                                <span className="select-arrow">▼</span>
                            </div>
                        </div>
                    </div>

                    <div className="data-grid-container" style={{ borderRadius: '12px' }}>
                        {loading ? (
                            <p style={{ padding: '40px', textAlign: 'center' }}>Loading submissions matrix...</p>
                        ) : submissionsData.length === 0 ? (
                            <p style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                No MRM submissions recorded for {getMonthName(selectedMonth)} {selectedYear}
                            </p>
                        ) : (
                            <table style={{ minWidth: '850px', width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px' }}>#</th>
                                        <th style={{ width: '180px' }}>User Name</th>
                                        <th style={{ width: '110px' }}>Review Date</th>
                                        <th style={{ width: '110px' }}>Meeting Date</th>
                                        <th style={{ width: '80px' }}>Items</th>
                                        <th style={{ width: '130px' }}>Health</th>
                                        <th style={{ width: '120px' }}>Status</th>
                                        <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissionsData.map((row, idx) => (
                                        <tr key={row.userId || idx}>
                                            <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                            <td style={{ fontWeight: '600' }}>
                                                {row.firstName} {row.lastName}
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>{row.username}</div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{formatDate(row.reviewDate)}</td>
                                            <td style={{ textAlign: 'center' }}>{formatDate(row.meetingDate)}</td>
                                            <td style={{ textAlign: 'center', fontWeight: '700' }}>{row.itemsCount || 0}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    {row.greenCount > 0 && (
                                                        <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem' }}>
                                                            {row.greenCount} 🟢
                                                        </span>
                                                    )}
                                                    {row.yellowCount > 0 && (
                                                        <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem' }}>
                                                            {row.yellowCount} 🟡
                                                        </span>
                                                    )}
                                                    {row.redCount > 0 && (
                                                        <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem' }}>
                                                            {row.redCount} 🔴
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {row.meetingDone || row.status === 'Approved' ? (
                                                    <span style={{
                                                        padding: '3px 10px',
                                                        borderRadius: '12px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700,
                                                        background: '#dcfce7',
                                                        color: '#166534'
                                                    }}>
                                                        ✓ Approved
                                                    </span>
                                                ) : row.status === 'Submitted' ? (
                                                    <span style={{
                                                        padding: '3px 10px',
                                                        borderRadius: '12px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700,
                                                        background: '#fef3c7',
                                                        color: '#92400e'
                                                    }}>
                                                        ⏳ Submitted {row.submittedAt ? `(${Math.floor((Date.now() - new Date(row.submittedAt).getTime()) / (1000 * 60 * 60 * 24))}d)` : ''}
                                                    </span>
                                                ) : row.status === 'RevisionRequested' ? (
                                                    <span 
                                                        title={row.latestRevisionComment || 'Revisions requested'}
                                                        style={{
                                                            padding: '3px 10px',
                                                            borderRadius: '12px',
                                                            fontSize: '0.72rem',
                                                            fontWeight: 700,
                                                            background: '#fee2e2',
                                                            color: '#991b1b',
                                                            cursor: 'help'
                                                        }}
                                                    >
                                                        ↩ Revision Requested
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        padding: '3px 10px',
                                                        borderRadius: '12px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700,
                                                        background: '#f1f5f9',
                                                        color: '#475569'
                                                    }}>
                                                        Draft
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    onClick={() => navigate(`/mrm?userId=${row.userId}&month=${selectedMonth}&year=${selectedYear}`)}
                                                    style={{
                                                        background: '#217346',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '5px 12px',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem'
                                                    }}
                                                >
                                                    View Sheet
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: ANNUAL ROLLUP & FORECAST */}
            {/* TAB 2: ANNUAL ROLLUP & FORECAST */}
            {activeTab === 2 && (() => {
                const allObjectives = rollupData?.objectives || [];
                const anomalyObjectives = allObjectives.filter(obj => obj.anomaly?.isAnomaly);
                const anomalyCount = anomalyObjectives.length;

                const filteredObjectives = allObjectives.filter(obj => {
                    if (anomalyOnlyFilter && !obj.anomaly?.isAnomaly) return false;
                    if (tileFilter && obj.tile !== tileFilter) return false;
                    if (objectiveSearchQuery.trim()) {
                        const q = objectiveSearchQuery.toLowerCase().trim();
                        const inObj = (obj.objective || '').toLowerCase().includes(q);
                        const inTile = (obj.tile || '').toLowerCase().includes(q);
                        if (!inObj && !inTile) return false;
                    }
                    return true;
                });

                return (
                    <div style={{ padding: '20px 24px' }}>
                        {/* Header Banner Card */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px',
                            background: '#ffffff',
                            padding: '16px 20px',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                            flexWrap: 'wrap',
                            gap: '14px'
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#14532d', fontWeight: 700 }}>
                                        Annual Rollup & Trajectory ({selectedYear})
                                    </h2>
                                    <span style={{ 
                                        fontSize: '0.75rem', 
                                        background: '#dcfce7', 
                                        color: '#166534', 
                                        padding: '2px 8px', 
                                        borderRadius: '12px', 
                                        fontWeight: 600,
                                        border: '1px solid #bbf7d0'
                                    }}>
                                        {rollupData?.approvedMonths?.length || 0} Approved Months
                                    </span>
                                </div>
                                <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
                                    Formed strictly from <strong>Approved</strong> months ({rollupData?.approvedMonths?.length || 0} approved). Unapproved months are excluded to prevent premature data leaks.
                                </span>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div className="executive-select-wrapper">
                                    <select
                                        value={selectedYear}
                                        onChange={e => setSelectedYear(Number(e.target.value))}
                                        className="executive-select"
                                        style={{ width: '95px' }}
                                    >
                                        {[2024, 2025, 2026, 2027, 2028].map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                    <span className="select-arrow">▼</span>
                                </div>

                                {/* Viewer-Selectable Forecast Switcher */}
                                <div className="forecast-switcher">
                                    <button
                                        className={forecastMethod === 'best_worst' ? 'active' : ''}
                                        onClick={() => setForecastMethod('best_worst')}
                                        title="Conservative & Optimistic Band (Default)"
                                    >
                                        Best / Worst Band
                                    </button>
                                    <button
                                        className={forecastMethod === 'run_rate' ? 'active' : ''}
                                        onClick={() => setForecastMethod('run_rate')}
                                        title="Extrapolates average of approved months"
                                    >
                                        Run-Rate
                                    </button>
                                    <button
                                        className={forecastMethod === 'linear_trend' ? 'active' : ''}
                                        onClick={() => setForecastMethod('linear_trend')}
                                        title="Fits regression line to trend"
                                    >
                                        Linear Trend
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Person-Level Composite Summary */}
                        {rollupData?.personSummary && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Objectives</div>
                                    <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{rollupData.personSummary.totalObjectives}</div>
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>Department targets configured</div>
                                </div>
                                <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Approved Months</div>
                                    <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#166534', marginTop: '4px' }}>{rollupData.personSummary.approvedMonthsCount} / 12</div>
                                    <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: '2px' }}>Certified by Suraj Rajan</div>
                                </div>
                                <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Tracked Objectives</div>
                                    <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0369a1', marginTop: '4px' }}>{rollupData.personSummary.objectivesWithApprovedData}</div>
                                    <div style={{ fontSize: '0.72rem', color: '#0284c7', marginTop: '2px' }}>With live approved data points</div>
                                </div>
                                <div 
                                    onClick={() => {
                                        if (anomalyCount > 0) {
                                            setAnomalyOnlyFilter(prev => !prev);
                                        }
                                    }}
                                    title={anomalyCount > 0 ? (anomalyOnlyFilter ? "Click to show all objectives" : `Click to filter table to only show the ${anomalyCount} flagged anomalies`) : "No anomalies detected"}
                                    style={{ 
                                        background: anomalyOnlyFilter ? '#fef2f2' : (anomalyCount > 0 ? '#fff7ed' : '#ffffff'), 
                                        padding: '12px 16px', 
                                        borderRadius: '10px', 
                                        border: anomalyOnlyFilter ? '2px solid #dc2626' : (anomalyCount > 0 ? '1px solid #fdba74' : '1px solid #e2e8f0'),
                                        cursor: anomalyCount > 0 ? 'pointer' : 'default',
                                        boxShadow: anomalyOnlyFilter ? '0 0 0 3px rgba(220, 38, 38, 0.2)' : '0 1px 3px rgba(0,0,0,0.02)',
                                        transition: 'all 0.2s ease',
                                        userSelect: 'none'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: '0.72rem', color: anomalyCount > 0 ? '#c2410c' : '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                                            Statistical Anomalies (≥30%)
                                        </div>
                                        {anomalyCount > 0 && (
                                            <span style={{ 
                                                fontSize: '0.65rem', 
                                                fontWeight: 700, 
                                                color: anomalyOnlyFilter ? '#ffffff' : '#c2410c', 
                                                background: anomalyOnlyFilter ? '#dc2626' : '#ffedd5', 
                                                padding: '2px 6px', 
                                                borderRadius: '8px',
                                                border: '1px solid ' + (anomalyOnlyFilter ? '#b91c1c' : '#fed7aa')
                                            }}>
                                                {anomalyOnlyFilter ? 'ACTIVE FILTER' : 'CLICK TO FILTER'}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '1.35rem', fontWeight: 700, color: anomalyCount > 0 ? '#ea580c' : '#166534', marginTop: '4px' }}>
                                        {anomalyCount > 0 ? `⚡ ${anomalyCount} Flagged` : '0 Clean'}
                                    </div>
                                    {anomalyCount > 0 && (
                                        <div style={{ fontSize: '0.72rem', color: '#9a3412', marginTop: '2px' }}>
                                            {anomalyOnlyFilter ? 'Showing only flagged objectives (click to clear)' : 'Click card to isolate flagged objectives'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Dedicated Filter & Search Bar */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '14px',
                            background: '#ffffff',
                            padding: '12px 18px',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                            flexWrap: 'wrap',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {isAdmin && (
                                    <div className="executive-select-wrapper">
                                        <select
                                            value={selectedUserId}
                                            onChange={e => setSelectedUserId(e.target.value)}
                                            className="executive-select"
                                            style={{ width: '190px' }}
                                        >
                                            <option value="">All Team Presenters</option>
                                            {mrmUsers
                                                .filter(u => (u.displayName || u.first_name || u.username))
                                                .map(u => {
                                                    const name = u.displayName || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
                                                    return (
                                                        <option key={u._id} value={u._id}>{name}</option>
                                                    );
                                                })}
                                        </select>
                                        <span className="select-arrow">▼</span>
                                    </div>
                                )}

                                {rollupData?.objectives && rollupData.objectives.length > 0 && (
                                    <div className="executive-select-wrapper">
                                        <select
                                            value={tileFilter}
                                            onChange={e => setTileFilter(e.target.value)}
                                            className="executive-select"
                                            style={{ width: '220px' }}
                                        >
                                            <option value="">All Process Tiles</option>
                                            {Array.from(new Set(allObjectives.map(o => o.tile).filter(Boolean))).map(t => {
                                                const tileAnomalies = allObjectives.filter(o => o.tile === t && o.anomaly?.isAnomaly).length;
                                                return (
                                                    <option key={t} value={t}>
                                                        {t} {tileAnomalies > 0 ? `(⚡ ${tileAnomalies} Anomaly)` : ''}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                        <span className="select-arrow">▼</span>
                                    </div>
                                )}

                                {/* Search Input */}
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        placeholder="Search objectives..."
                                        value={objectiveSearchQuery}
                                        onChange={e => setObjectiveSearchQuery(e.target.value)}
                                        style={{
                                            height: '38px',
                                            padding: '0 12px 0 32px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '0.84rem',
                                            width: '190px',
                                            outline: 'none',
                                            transition: 'border-color 0.2s ease',
                                            background: '#ffffff'
                                        }}
                                    />
                                    <SearchIcon sx={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#94a3b8' }} />
                                </div>

                                {/* Filter Anomaly Only Toggle Button */}
                                {anomalyCount > 0 && (
                                    <button
                                        onClick={() => setAnomalyOnlyFilter(prev => !prev)}
                                        style={{
                                            height: '38px',
                                            padding: '0 14px',
                                            borderRadius: '8px',
                                            border: anomalyOnlyFilter ? '2px solid #dc2626' : '1px solid #fdba74',
                                            background: anomalyOnlyFilter ? '#fef2f2' : '#fff7ed',
                                            color: anomalyOnlyFilter ? '#dc2626' : '#c2410c',
                                            fontWeight: 700,
                                            fontSize: '0.82rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            boxShadow: anomalyOnlyFilter ? '0 0 0 3px rgba(220, 38, 38, 0.15)' : 'none',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <span>⚡</span>
                                        <span>{anomalyOnlyFilter ? `Showing Anomalies Only (${anomalyCount})` : `Show Flagged (${anomalyCount})`}</span>
                                    </button>
                                )}

                                {/* Clear Filters Button */}
                                {(tileFilter || objectiveSearchQuery || anomalyOnlyFilter || selectedUserId) && (
                                    <button
                                        onClick={() => {
                                            setTileFilter('');
                                            setObjectiveSearchQuery('');
                                            setAnomalyOnlyFilter(false);
                                            setSelectedUserId('');
                                        }}
                                        style={{
                                            border: 'none',
                                            background: 'transparent',
                                            color: '#dc2626',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            padding: '6px 8px',
                                            textDecoration: 'underline'
                                        }}
                                    >
                                        Clear filters
                                    </button>
                                )}
                            </div>

                            {/* Showing count */}
                            <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                                Showing <strong>{filteredObjectives.length}</strong> of {allObjectives.length} objectives
                            </div>
                        </div>

                        {/* Anomaly Quick Navigation Banner */}
                        {anomalyCount > 0 && (
                            <div style={{
                                background: '#fff7ed',
                                border: '1px solid #fdba74',
                                borderRadius: '10px',
                                padding: '10px 16px',
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                flexWrap: 'wrap'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9a3412', fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                    <span>⚡ {anomalyCount} Flagged Anomalies:</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                                    {anomalyObjectives.map((anom, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => scrollToObjective(anom.tile, anom.objective)}
                                            title={`Click to scroll to and highlight "${anom.objective}"`}
                                            style={{
                                                background: '#ffffff',
                                                border: '1px solid #fb923c',
                                                borderRadius: '6px',
                                                padding: '4px 10px',
                                                fontSize: '0.78rem',
                                                color: '#c2410c',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <span><strong>{anom.tile}</strong>: {anom.objective}</span>
                                            <span style={{
                                                padding: '1px 5px',
                                                borderRadius: '4px',
                                                fontSize: '0.72rem',
                                                fontWeight: 700,
                                                background: anom.anomaly.diffPct > 0 ? '#dcfce7' : '#fee2e2',
                                                color: anom.anomaly.diffPct > 0 ? '#166534' : '#991b1b'
                                            }}>
                                                {anom.anomaly.diffPct > 0 ? `+${anom.anomaly.diffPct}%` : `${anom.anomaly.diffPct}%`}
                                            </span>
                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>📍 Jump</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="data-grid-container" style={{ borderRadius: '12px', overflowX: 'auto' }}>
                            {loading ? (
                                <p style={{ padding: '40px', textAlign: 'center' }}>Calculating rollup & projections...</p>
                            ) : !rollupData || allObjectives.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                    <p>No approved MRM data found for {selectedYear} to compute rollup.</p>
                                    <small>Ensure sheets have been approved by Suraj Rajan in Tab 0.</small>
                                </div>
                            ) : filteredObjectives.length === 0 ? (
                                <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
                                    <p style={{ fontSize: '1rem', fontWeight: 600, color: '#334155' }}>No objectives matched your filter criteria.</p>
                                    <button
                                        onClick={() => {
                                            setTileFilter('');
                                            setObjectiveSearchQuery('');
                                            setAnomalyOnlyFilter(false);
                                        }}
                                        style={{
                                            marginTop: '8px',
                                            padding: '8px 16px',
                                            background: '#166534',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        Reset Filters
                                    </button>
                                </div>
                            ) : (
                                <>
                                <table style={{ width: '100%', minWidth: '1200px' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: '150px' }}>Tile</th>
                                            <th style={{ width: '220px' }}>Objective</th>
                                            <th style={{ width: '95px', textAlign: 'center' }}>Baseline</th>
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                <th key={m} style={{ width: '45px', textAlign: 'center' }}>{getMonthShort(m)}</th>
                                            ))}
                                            <th style={{ width: '90px', textAlign: 'center', background: '#e2e8f0' }}>Approved YTD</th>
                                            <th style={{ width: '105px', textAlign: 'center', background: '#f1f5f9' }}>vs Last Year</th>
                                            <th style={{ width: '140px', textAlign: 'center', background: '#dcfce7' }}>
                                                {forecastMethod === 'best_worst' ? 'Forecast Band' : 'Projected Year-End'}
                                            </th>
                                            {isAdmin && <th style={{ width: '50px', textAlign: 'center' }}>Config</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const groups = [];
                                            filteredObjectives.forEach(obj => {
                                                const t = obj.tile || 'General';
                                                let group = groups.find(g => g.tile === t);
                                                if (!group) {
                                                    group = { tile: t, items: [] };
                                                    groups.push(group);
                                                }
                                                group.items.push(obj);
                                            });

                                            return groups.map(group => {
                                                const tileSub = (rollupData.tileSummaries || []).find(ts => ts.tile === group.tile);
                                                return (
                                                    <React.Fragment key={group.tile}>
                                                        {group.items.map((obj, idx) => (
                                                            <tr 
                                                                id={`mrm-obj-${encodeURIComponent(group.tile)}-${encodeURIComponent(obj.objective)}`}
                                                                key={`${group.tile}-${idx}`}
                                                                style={{
                                                                    background: obj.anomaly?.isAnomaly ? '#fff7ed' : undefined,
                                                                    borderLeft: obj.anomaly?.isAnomaly ? '4px solid #ea580c' : undefined,
                                                                    transition: 'background-color 0.3s ease, outline 0.3s ease'
                                                                }}
                                                            >
                                                                <td style={{ fontWeight: '600', color: '#1e293b' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <span>{obj.tile}</span>
                                                                        {obj.anomaly?.isAnomaly && (
                                                                            <span style={{ color: '#ea580c', fontSize: '0.85rem' }} title="Flagged Statistical Anomaly">⚡</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <div style={{ fontWeight: obj.anomaly?.isAnomaly ? 700 : 500, color: obj.anomaly?.isAnomaly ? '#9a3412' : '#0f172a' }}>
                                                                        {obj.objective}
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: '6px', marginTop: '3px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                                        {obj.anomaly?.isAnomaly && (
                                                                            <span 
                                                                                style={{ 
                                                                                    fontSize: '0.72rem', 
                                                                                    padding: '2px 8px', 
                                                                                    borderRadius: '5px', 
                                                                                    background: '#ffedd5', 
                                                                                    color: '#9a3412', 
                                                                                    border: '1px solid #fdba74', 
                                                                                    fontWeight: '700',
                                                                                    display: 'inline-flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '4px'
                                                                                }}
                                                                                title={`Statistical Anomaly: trailing mean was ${obj.anomaly.trailingMean}, jump/drop of ${obj.anomaly.diffPct}%`}
                                                                            >
                                                                                ⚡ ANOMALY: {obj.anomaly.diffPct > 0 ? `+${obj.anomaly.diffPct}% spike` : `${obj.anomaly.diffPct}% drop`} (trailing avg: {obj.anomaly.trailingMean})
                                                                            </span>
                                                                        )}
                                                                        <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                                                                            [{obj.aggregationType || 'Sum'} | {obj.optimizationDirection === 'Lower' ? 'Min' : 'Max'}]
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                {obj.lastYearBaseline != null ? (
                                                                    <div>
                                                                        <span style={{ fontWeight: '600', color: '#0369a1', fontSize: '0.82rem' }}>
                                                                            {obj.lastYearBaseline} {obj.lastYearBaselineMetric || ''}
                                                                        </span>
                                                                        {obj.macroReferences && obj.macroReferences.length > 0 && (
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '3px' }}>
                                                                                {obj.macroReferences.slice(0, 3).map((ref, rIdx) => (
                                                                                    <span key={rIdx} style={{ fontSize: '0.66rem', color: '#0369a1', background: '#f0f9ff', padding: '1px 4px', borderRadius: '3px', border: '1px solid #bae6fd' }}>
                                                                                        📌 {ref.label}: {ref.value} {ref.unit || ''}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : obj.macroReferences && obj.macroReferences.length > 0 ? (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                        {obj.macroReferences.slice(0, 3).map((ref, rIdx) => (
                                                                            <span key={rIdx} style={{ fontSize: '0.66rem', color: '#0369a1', background: '#f0f9ff', padding: '1px 4px', borderRadius: '3px', border: '1px solid #bae6fd' }}>
                                                                                📌 {ref.label}: {ref.value} {ref.unit || ''}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <span style={{ fontSize: '0.7rem', padding: '2px 5px', borderRadius: '4px', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}>
                                                                        No baseline
                                                                    </span>
                                                                )}
                                                            </td>
                                                            {/* 12 Monthly Strip */}
                                                            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(mStr => {
                                                                const mData = (obj.months && obj.months[mStr]) || (obj.strip && obj.strip.find(s => s.month === mStr));
                                                                const isApproved = rollupData.approvedMonths.includes(mStr);
                                                                return (
                                                                    <td
                                                                        key={mStr}
                                                                        style={{
                                                                            textAlign: 'center',
                                                                            background: mData ? (mData.status === 'Green' ? '#f0fdf4' : mData.status === 'Red' ? '#fef2f2' : '#fffbeb') : '#fafafa',
                                                                            color: mData ? '#0f172a' : '#cbd5e1',
                                                                            fontSize: '0.8rem',
                                                                            fontWeight: mData ? '600' : 'normal'
                                                                        }}
                                                                    >
                                                                        {mData ? (
                                                                            isApproved ? (
                                                                                mData.actual || '—'
                                                                            ) : mData.actual ? (
                                                                                <span 
                                                                                    style={{ color: '#64748b', fontStyle: 'italic', borderBottom: '1px dotted #94a3b8', cursor: 'help' }}
                                                                                    title={`Month ${mStr} is pending approval (excluded from YTD rollup)`}
                                                                                >
                                                                                    {mData.actual}*
                                                                                </span>
                                                                            ) : '—'
                                                                        ) : '—'}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td style={{ textAlign: 'center', fontWeight: '700', background: '#f8fafc' }}>
                                                                {obj.ytd != null ? obj.ytd : '—'}
                                                            </td>
                                                            <td style={{ textAlign: 'center', fontWeight: '600' }}>
                                                                {obj.yoyDelta ? (
                                                                    <span style={{ color: (obj.yoyDelta.pctDelta != null ? obj.yoyDelta.pctDelta : obj.yoyDelta.absDelta) >= 0 ? '#166534' : '#dc2626', fontSize: '0.82rem' }}>
                                                                        {obj.yoyDelta.formattedText || (obj.yoyDelta.pctDelta != null ? (obj.yoyDelta.pctDelta > 0 ? `+${obj.yoyDelta.pctDelta}%` : `${obj.yoyDelta.pctDelta}%`) : (obj.yoyDelta.absDelta > 0 ? `+${obj.yoyDelta.absDelta}` : obj.yoyDelta.absDelta))}
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>No baseline</span>
                                                                )}
                                                            </td>
                                                            <td style={{ textAlign: 'center', fontWeight: '700', color: '#166534', background: '#f0fdf4' }}>
                                                                {obj.forecast ? (
                                                                    obj.forecast.range ? (
                                                                        <span>[{obj.forecast.range.worst} – {obj.forecast.range.best}]</span>
                                                                    ) : (
                                                                        <span>{obj.forecast.value}</span>
                                                                    )
                                                                ) : '—'}
                                                            </td>
                                                            {isAdmin && (
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <IconButton size="small" onClick={() => openConfigModal(obj)} title="Configure Objective Settings">
                                                                        <TuneIcon sx={{ fontSize: 16, color: '#475569' }} />
                                                                    </IconButton>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                    {/* Tile Subtotal Row */}
                                                    {tileSub && (
                                                        <tr style={{ background: '#f8fafc', fontWeight: '700', borderTop: '2px solid #e2e8f0', borderBottom: '2px solid #cbd5e1' }}>
                                                            <td colSpan={2} style={{ color: '#1e293b', fontSize: '0.82rem' }}>
                                                                Subtotal: {group.tile} ({tileSub.approvedObjectivesCount}/{tileSub.totalObjectives} tracked)
                                                                {tileSub.hasAnomaly && (
                                                                    <span style={{ marginLeft: '8px', color: '#b91c1c', fontSize: '0.7rem', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fecaca' }}>
                                                                        ⚡ {tileSub.anomalyCount} Anomaly
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td colSpan={13} style={{ textAlign: 'right', color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>
                                                                Tile YTD Sum:
                                                            </td>
                                                            <td style={{ textAlign: 'center', background: '#e2e8f0', color: '#0f172a', fontSize: '0.82rem' }}>
                                                                {tileSub.ytdSum != null ? tileSub.ytdSum : '—'}
                                                            </td>
                                                            <td></td>
                                                            <td style={{ textAlign: 'center', background: '#dcfce7', color: '#166534', fontSize: '0.82rem' }}>
                                                                {tileSub.projectedTotal != null ? tileSub.projectedTotal : '—'}
                                                            </td>
                                                            {isAdmin && <td></td>}
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                            <div style={{ marginTop: '10px', fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span>🔒 <strong>Approved Months:</strong> Official locked numbers included in YTD & Forecast.</span>
                                <span>* <em>Italic with asterisk:</em> Pending approval (visible for tracking, excluded from locked YTD & forecast).</span>
                            </div>
                            </>
                        )}
                    </div>
                </div>
            );})()}

            {/* TAB 3: RECURRING ISSUES & BOTTLENECK ANALYSIS */}
            {activeTab === 3 && (
                <div style={{ padding: '20px 24px' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px',
                        background: '#ffffff',
                        padding: '16px 20px',
                        borderRadius: '12px',
                        border: '1px solid #fee2e2',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                        flexWrap: 'wrap',
                        gap: '14px'
                    }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#991b1b', fontWeight: 700 }}>
                                Recurring Issues & Governance Bottlenecks ({selectedYear})
                            </h2>
                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                Deterministic rules identifying consecutive Red streaks, chronic owners, and systemic tile bottlenecks.
                            </span>
                        </div>
                        <div className="executive-select-wrapper">
                            <select
                                value={selectedYear}
                                onChange={e => setSelectedYear(Number(e.target.value))}
                                className="executive-select"
                                style={{ minWidth: '95px' }}
                            >
                                {[2024, 2025, 2026, 2027, 2028].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            <span className="select-arrow">▼</span>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                        {/* Rule A: Consecutive Red Objectives */}
                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #fecaca', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', marginBottom: '12px' }}>
                                <ErrorOutlineIcon />
                                <h3 style={{ margin: 0, fontSize: '1rem' }}>Consecutive Red Objectives (2+ Mos)</h3>
                            </div>
                            {(!recurringData.consecutiveRed || recurringData.consecutiveRed.length === 0) ? (
                                <p style={{ color: '#16a34a', fontSize: '0.85rem', padding: '10px 0' }}>✓ No recurring red objectives detected.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {recurringData.consecutiveRed.map((item, i) => (
                                        <div key={i} style={{ padding: '10px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                                            <div style={{ fontWeight: '600', color: '#991b1b', fontSize: '0.85rem' }}>{item.objective}</div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                                                <span>Tile: {item.tile}</span>
                                                <span style={{ fontWeight: '700', color: '#dc2626' }}>{item.streak || item.consecutiveCount} Months in Red</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Rule A2: Cross-Year Same-Month Red (Structural/Seasonal) */}
                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #fecaca', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', marginBottom: '12px' }}>
                                <ErrorOutlineIcon />
                                <h3 style={{ margin: 0, fontSize: '1rem' }}>Cross-Year Red in Same Month</h3>
                            </div>
                            {(!recurringData.sameMonthAcrossYears || recurringData.sameMonthAcrossYears.length === 0) ? (
                                <p style={{ color: '#16a34a', fontSize: '0.85rem', padding: '10px 0' }}>✓ No cross-year recurring red patterns found.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {recurringData.sameMonthAcrossYears.map((item, i) => (
                                        <div key={i} style={{ padding: '10px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                                            <div style={{ fontWeight: '600', color: '#991b1b', fontSize: '0.85rem' }}>{item.objective}</div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                                                <span>Tile: {item.tile}</span>
                                                <span style={{ fontWeight: '700', color: '#dc2626' }}>Red in {getMonthName(Number(item.month))} ({item.years ? item.years.join(' & ') : 'YoY'})</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Rule B: Chronic Open Point Owners */}
                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #fed7aa', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c2410c', marginBottom: '12px' }}>
                                <PeopleIcon />
                                <h3 style={{ margin: 0, fontSize: '1rem' }}>Chronic Open Point Owners</h3>
                            </div>
                            {(!recurringData.chronicOwners || recurringData.chronicOwners.length === 0) ? (
                                <p style={{ color: '#16a34a', fontSize: '0.85rem', padding: '10px 0' }}>✓ No chronic open point bottlenecks found.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {recurringData.chronicOwners.map((owner, i) => (
                                        <div key={i} style={{ padding: '10px', background: '#fff7ed', borderRadius: '8px', border: '1px solid #fdba74' }}>
                                            <div style={{ fontWeight: '600', color: '#9a3412', fontSize: '0.85rem' }}>{owner.owner || owner.ownerName}</div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                                                <span>Overdue Points: <strong>{owner.overdueCount}</strong></span>
                                                <span>Max Age: <strong>{owner.maxAgeDays} days</strong></span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Rule C: Systemic Tile Bottlenecks */}
                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', marginBottom: '12px' }}>
                                <AssignmentIcon />
                                <h3 style={{ margin: 0, fontSize: '1rem' }}>Systemic Tile Bottlenecks (&gt;35% Red)</h3>
                            </div>
                            {(!recurringData.systemicTiles || recurringData.systemicTiles.length === 0) ? (
                                <p style={{ color: '#16a34a', fontSize: '0.85rem', padding: '10px 0' }}>✓ All operational tiles within healthy thresholds.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {recurringData.systemicTiles.map((tile, i) => (
                                        <div key={i} style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                            <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.85rem' }}>{tile.tile}</div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#dc2626', fontWeight: 600, marginTop: '4px' }}>
                                                <span>Red Percentage: {tile.redPercentage}%</span>
                                                <span>Total: {tile.total || tile.totalItems}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: MRM OPEN POINTS HUB */}
            {activeTab === 4 && (
                <div style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#15803d' }}>
                                MRM Action Items in Open Points ({openPointsData.length})
                            </h2>
                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                Every MRM action plan automatically flows into Open Points on Save. Status changes here automatically sync back to MRM.
                            </span>
                        </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        {/* Search Input */}
                        <div style={{ flex: 1, minWidth: '220px' }}>
                            <input
                                type="text"
                                placeholder="Search by assigned owner or task..."
                                value={opOwnerSearch}
                                onChange={e => setOpOwnerSearch(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '7px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '0.82rem'
                                }}
                            />
                        </div>

                        {/* Age Filter */}
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Age:</span>
                            <button
                                className={`filter-btn ${opAgeFilter === 'all' ? 'active' : ''}`}
                                onClick={() => setOpAgeFilter('all')}
                            >
                                All
                            </button>
                            <button
                                className={`filter-btn ${opAgeFilter === '30' ? 'active' : ''}`}
                                onClick={() => setOpAgeFilter('30')}
                            >
                                &gt;30d
                            </button>
                            <button
                                className={`filter-btn ${opAgeFilter === '60' ? 'active' : ''}`}
                                onClick={() => setOpAgeFilter('60')}
                            >
                                &gt;60d
                            </button>
                            <button
                                className={`filter-btn red ${opAgeFilter === 'overdue' ? 'active' : ''}`}
                                onClick={() => setOpAgeFilter('overdue')}
                            >
                                Overdue
                            </button>
                        </div>

                        {/* Status Filter */}
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Status:</span>
                            <button
                                className={`filter-btn ${opStatusFilter === 'all' ? 'active' : ''}`}
                                onClick={() => setOpStatusFilter('all')}
                            >
                                All
                            </button>
                            <button
                                className={`filter-btn red ${opStatusFilter === 'Red' ? 'active' : ''}`}
                                onClick={() => setOpStatusFilter('Red')}
                            >
                                🔴 Red
                            </button>
                            <button
                                className={`filter-btn yellow ${opStatusFilter === 'Yellow' ? 'active' : ''}`}
                                onClick={() => setOpStatusFilter('Yellow')}
                            >
                                🟡 Yellow
                            </button>
                            <button
                                className={`filter-btn green ${opStatusFilter === 'Green' ? 'active' : ''}`}
                                onClick={() => setOpStatusFilter('Green')}
                            >
                                🟢 Green
                            </button>
                        </div>
                    </div>

                    <div className="data-grid-container" style={{ borderRadius: '12px' }}>
                        {loading ? (
                            <p style={{ padding: '40px', textAlign: 'center' }}>Loading MRM action points...</p>
                        ) : openPointsData.length === 0 ? (
                            <p style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                No Open Points found originating from MRM matching filter criteria.
                            </p>
                        ) : (
                            <table style={{ width: '100%', minWidth: '850px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '90px' }}>Task ID</th>
                                        <th style={{ width: '230px' }}>Action Plan / Task</th>
                                        <th style={{ width: '130px' }}>Origin Objective</th>
                                        <th style={{ width: '120px' }}>Assigned Owner</th>
                                        <th style={{ width: '100px' }}>Target Date</th>
                                        <th style={{ width: '80px', textAlign: 'center' }}>Age</th>
                                        <th style={{ width: '85px', textAlign: 'center' }}>Status</th>
                                        <th style={{ width: '85px', textAlign: 'center' }}>Month/Year</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {openPointsData.map(op => {
                                        const now = Date.now();
                                        const createdTime = op.createdAt ? new Date(op.createdAt).getTime() : now;
                                        const ageDays = Math.max(0, Math.floor((now - createdTime) / (1000 * 60 * 60 * 24)));
                                        const isOverdue = op.target_date && new Date(op.target_date) < new Date();

                                        return (
                                            <tr key={op._id}>
                                                <td style={{ fontWeight: '700', color: '#2563eb' }}>{op.unique_id}</td>
                                                <td style={{ fontWeight: '500' }}>{op.task || op.description || op.title || '—'}</td>
                                                <td style={{ color: '#475569', fontSize: '0.82rem' }}>
                                                    {op.originContext?.objective || '—'}
                                                </td>
                                                <td style={{ fontWeight: '600' }}>
                                                    {op.assigned_to_name || (op.responsible_person ? `${op.responsible_person.first_name || ''} ${op.responsible_person.last_name || ''}`.trim() || op.responsible_person.username : op.responsibility) || 'Unassigned'}
                                                </td>
                                                <td style={{ fontSize: '0.82rem', color: isOverdue ? '#dc2626' : 'inherit', fontWeight: isOverdue ? 600 : 400 }}>
                                                    {formatDate(op.target_date)}
                                                </td>
                                                <td style={{ textAlign: 'center', fontSize: '0.8rem', color: ageDays > 60 ? '#dc2626' : ageDays > 30 ? '#d97706' : '#64748b', fontWeight: ageDays > 30 ? 600 : 400 }}>
                                                    {ageDays}d
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className={`status-badge ${op.status}`} style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                                                        {op.status}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center', fontSize: '0.82rem', color: '#64748b' }}>
                                                    {op.originContext?.month ? `${op.originContext.month}/${op.originContext.year}` : '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Executive Approve & Lock Confirmation Dialog */}
            <Dialog 
                open={approveModal.open} 
                onClose={() => !actionLoading && setApproveModal({ open: false, item: null })} 
                maxWidth="sm" 
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)'
                    }
                }}
            >
                <DialogTitle sx={{ 
                    bgcolor: '#f0fdf4', 
                    color: '#166534', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.5,
                    borderBottom: '1px solid #bbf7d0',
                    py: 2,
                    fontSize: '1.15rem',
                    fontWeight: 700
                }}>
                    <CheckCircleOutlineIcon sx={{ color: '#16a34a', fontSize: 28 }} />
                    Approve & Lock MRM Sheet
                </DialogTitle>
                <DialogContent sx={{ pt: 3, pb: 2 }}>
                    <DialogContentText sx={{ color: '#334155', fontSize: '0.95rem', mb: 2.5 }}>
                        Are you sure you want to <strong>APPROVE and LOCK</strong> the MRM performance sheet for{' '}
                        <strong style={{ color: '#166534' }}>
                            {approveModal.item?.presenterName}
                        </strong>?
                    </DialogContentText>

                    <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '14px 16px',
                        marginBottom: '16px'
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: '8px', fontSize: '0.85rem' }}>
                            <span style={{ color: '#64748b', fontWeight: 600 }}>Period:</span>
                            <span style={{ color: '#0f172a', fontWeight: 600 }}>
                                {approveModal.item ? `${getMonthName(Number(approveModal.item.month))} ${approveModal.item.year}` : '—'}
                            </span>
                            <span style={{ color: '#64748b', fontWeight: 600 }}>Presenter:</span>
                            <span style={{ color: '#0f172a', fontWeight: 600 }}>
                                {approveModal.item?.presenterName || '—'}
                            </span>
                            <span style={{ color: '#64748b', fontWeight: 600 }}>Governance:</span>
                            <span style={{ color: '#15803d', fontWeight: 600 }}>
                                Locks actuals & action items against future edits.
                            </span>
                        </div>
                    </div>

                    <div style={{
                        background: '#fffbeb',
                        border: '1px solid #fef3c7',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        fontSize: '0.8rem',
                        color: '#92400e',
                        lineHeight: 1.45
                    }}>
                        🔒 <strong>Note:</strong> Once locked, this monthly record is permanently audited. Presenters will not be able to modify performance metrics unless an executive formally reopens the sheet.
                    </div>
                </DialogContent>
                <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', gap: 1 }}>
                    <Button 
                        onClick={() => setApproveModal({ open: false, item: null })} 
                        variant="outlined"
                        disabled={actionLoading}
                        sx={{ 
                            color: '#64748b', 
                            borderColor: '#cbd5e1', 
                            textTransform: 'none', 
                            fontWeight: 600,
                            '&:hover': { borderColor: '#94a3b8', bgcolor: '#f1f5f9' }
                        }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleConfirmApprove} 
                        variant="contained" 
                        disabled={actionLoading}
                        sx={{ 
                            bgcolor: '#166534', 
                            color: '#fff', 
                            textTransform: 'none', 
                            fontWeight: 600,
                            px: 3,
                            boxShadow: '0 2px 4px rgba(22, 101, 52, 0.25)',
                            '&:hover': { bgcolor: '#14532d' }
                        }}
                    >
                        {actionLoading ? 'Approving...' : '✓ Confirm & Lock Sheet'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Request Revision Dialog (Suraj Queue) */}
            <Dialog open={revisionModal.open} onClose={() => setRevisionModal({ open: false, item: null, comment: '' })} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ color: '#dc2626' }}>
                    Send Back for Revision
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Provide specific instructions to {revisionModal.item?.presenterName} explaining what needs to be fixed:
                    </DialogContentText>
                    <TextField
                        autoFocus
                        multiline
                        rows={3}
                        fullWidth
                        placeholder="e.g., Action Plan for Turnaround Time is missing specific operational deliverables..."
                        value={revisionModal.comment}
                        onChange={e => setRevisionModal({ ...revisionModal, comment: e.target.value })}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setRevisionModal({ open: false, item: null, comment: '' })} variant="outlined">
                        Cancel
                    </Button>
                    <Button onClick={handleConfirmRevision} variant="contained" sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}>
                        Send Feedback
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Objective-Level Governance Config Modal (Admin) */}
            <Dialog open={configModalOpen} onClose={() => setConfigModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ color: '#166534', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TuneIcon sx={{ color: '#166534' }} /> Objective Governance Configuration
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2, fontSize: '0.85rem' }}>
                        Admin-configured rules controlling rollup aggregation, optimization direction, auto-RAG tolerance, and historical baseline.
                    </DialogContentText>

                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Tile: <strong>{configTargetObj?.tile}</strong></div>
                        <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.95rem' }}>{configTargetObj?.objective}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Aggregation Type</InputLabel>
                            <Select
                                value={configAggregation}
                                label="Aggregation Type"
                                onChange={e => setConfigAggregation(e.target.value)}
                            >
                                <MenuItem value="Sum">Sum (Additive Volumes)</MenuItem>
                                <MenuItem value="Average">Average (Ratios/Percentages)</MenuItem>
                                <MenuItem value="Latest">Latest Value (Headcounts/Balances)</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl size="small" fullWidth>
                            <InputLabel>Optimization Direction</InputLabel>
                            <Select
                                value={configOptimization}
                                label="Optimization Direction"
                                onChange={e => setConfigOptimization(e.target.value)}
                            >
                                <MenuItem value="Higher">Higher is Better (e.g. Sales)</MenuItem>
                                <MenuItem value="Lower">Lower is Better (e.g. Turnaround Time)</MenuItem>
                            </Select>
                        </FormControl>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>
                                Tolerance Band (±%)
                            </label>
                            <TextField
                                size="small"
                                type="number"
                                fullWidth
                                value={configTolerance}
                                onChange={e => setConfigTolerance(e.target.value)}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>
                                Baseline Value
                            </label>
                            <TextField
                                size="small"
                                type="number"
                                fullWidth
                                placeholder="e.g. 500"
                                value={configBaseline}
                                onChange={e => setConfigBaseline(e.target.value)}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '4px' }}>
                                Metric Label
                            </label>
                            <TextField
                                size="small"
                                fullWidth
                                placeholder="e.g. Units, TEU"
                                value={configBaselineMetric}
                                onChange={e => setConfigBaselineMetric(e.target.value)}
                            />
                        </div>
                    </div>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setConfigModalOpen(false)} variant="outlined">Cancel</Button>
                    <Button 
                        onClick={handleSaveConfig} 
                        variant="contained" 
                        disabled={configSaving}
                        sx={{ bgcolor: '#166534', '&:hover': { bgcolor: '#14532d' } }}
                    >
                        {configSaving ? 'Saving...' : 'Save Configuration'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modern Toast Notification */}
            <Snackbar 
                open={toast.open} 
                autoHideDuration={4000} 
                onClose={() => setToast(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert 
                    onClose={() => setToast(prev => ({ ...prev, open: false }))} 
                    severity={toast.severity} 
                    variant="filled"
                    sx={{ width: '100%', fontWeight: 600, borderRadius: '8px', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }}
                >
                    {toast.message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default MRMAdminDashboard;
