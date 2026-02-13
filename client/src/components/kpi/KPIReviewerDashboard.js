import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { UserContext } from "../../contexts/UserContext";
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    Slider, Checkbox, FormControlLabel, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip as ReTooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    LineChart,
    Line,
    ScatterChart,
    Scatter,
    Area,
    AreaChart,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar
} from 'recharts';
import './kpi.scss';

const Icons = {
    Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>,
    Reject: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>,
    Eye: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>,
    Back: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>,
    Pending: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>,
    Analytics: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" /></svg>,
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

    // Filter state
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    
    // Advanced Analytics Filters
    const [analyticsFilters, setAnalyticsFilters] = useState({
        dateRange: 'last_6_months',
        departments: [],
        customStartMonth: new Date().getMonth() + 1,
        customStartYear: new Date().getFullYear(),
        customEndMonth: new Date().getMonth() + 1,
        customEndYear: new Date().getFullYear()
    });

    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [analyticsView, setAnalyticsView] = useState('overview'); // overview, trends, departments, performance, risk

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    // Review Dialog State
    const [reviewDialog, setReviewDialog] = useState({
        open: false,
        sheetId: null,
        action: '',
        comments: ''
    });
    const [selectedDept, setSelectedDept] = useState(null);

    useEffect(() => {
        if (activeTab !== 'analytics') setSelectedDept(null);
    }, [activeTab]);

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

    // Get all unique departments
    const allDepartments = useMemo(() => {
        const depts = new Set();
        [...data.pending_check, ...data.pending_verify, ...data.pending_approve, ...data.recently_processed]
            .forEach(s => {
                if (s.department) depts.add(s.department);
            });
        return Array.from(depts).sort();
    }, [data]);

    // Filter sheets based on analytics filters
    const getFilteredSheets = useMemo(() => {
        const allSheets = [];
        const pushUnique = (arr) => (arr || []).forEach(s => { 
            if (s && !allSheets.find(x => x._id === s._id)) allSheets.push(s); 
        });
        pushUnique(data.pending_check);
        pushUnique(data.pending_verify);
        pushUnique(data.pending_approve);
        pushUnique(data.recently_processed);

        return allSheets.filter(sheet => {
            // Date range filter
            const sheetDate = new Date(sheet.year, sheet.month - 1);
            let startDate, endDate;

            if (analyticsFilters.dateRange === 'current_month') {
                const now = new Date();
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            } else if (analyticsFilters.dateRange === 'last_3_months') {
                const now = new Date();
                startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            } else if (analyticsFilters.dateRange === 'last_6_months') {
                const now = new Date();
                startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            } else if (analyticsFilters.dateRange === 'ytd') {
                const now = new Date();
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            } else if (analyticsFilters.dateRange === 'custom') {
                startDate = new Date(analyticsFilters.customStartYear, analyticsFilters.customStartMonth - 1, 1);
                endDate = new Date(analyticsFilters.customEndYear, analyticsFilters.customEndMonth, 0);
            }

            if (sheetDate < startDate || sheetDate > endDate) return false;

            // Department filter
            if (analyticsFilters.departments.length > 0 && 
                !analyticsFilters.departments.includes(sheet.department)) {
                return false;
            }

           
      

            return true;
        });
    }, [data, analyticsFilters]);

    // Comprehensive Analytics
    const comprehensiveAnalytics = useMemo(() => {
        const sheets = getFilteredSheets;
        if (sheets.length === 0) {
            return {
                summary: { total: 0, avgPerf: 0, totalLoss: 0, avgLoss: 0, avgWorkload: 0, blockerRate: 0 },
                trends: [],
                departments: [],
                performanceDistribution: [],
                riskMatrix: [],
                topPerformers: [],
                bottomPerformers: [],
                blockerAnalysis: [],
                statusBreakdown: [],
                monthlyTrends: [],
                lossDistribution: []
            };
        }

        // Summary metrics
        let totalPerf = 0, totalLoss = 0, totalWorkload = 0, blockersCount = 0;
        const statusCount = {};
        const deptStats = {};
        const monthlyData = {};
        const perfBuckets = {};
        const lossBuckets = {};
        const blockersList = [];

        sheets.forEach(sheet => {
            const perf = sheet.summary?.overall_percentage || 0;
            const loss = sheet.summary?.business_loss || 0;
            const workload = sheet.summary?.total_workload_percentage || 0;
            const dept = sheet.department || 'Other';
            const status = sheet.status;
            const monthKey = `${sheet.year}-${String(sheet.month).padStart(2, '0')}`;
            const blockers = sheet.summary?.blockers || '';

            totalPerf += perf;
            totalLoss += loss;
            totalWorkload += workload;

            if (blockers.trim()) {
                blockersCount++;
                blockersList.push({
                    dept,
                    user: sheet.user?.first_name || 'Unknown',
                    blocker: blockers,
                    loss,
                    perf,
                    month: monthKey
                });
            }

            // Status breakdown
            statusCount[status] = (statusCount[status] || 0) + 1;

            // Department stats
            if (!deptStats[dept]) {
                deptStats[dept] = { 
                    perf: 0, loss: 0, workload: 0, count: 0, blockers: 0,
                    approved: 0, rejected: 0, pending: 0
                };
            }
            deptStats[dept].perf += perf;
            deptStats[dept].loss += loss;
            deptStats[dept].workload += workload;
            deptStats[dept].count++;
            if (blockers.trim()) deptStats[dept].blockers++;
            if (status === 'APPROVED') deptStats[dept].approved++;
            if (status === 'REJECTED') deptStats[dept].rejected++;
            if (['SUBMITTED', 'CHECKED', 'VERIFIED'].includes(status)) deptStats[dept].pending++;

            // Monthly trends
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { perf: 0, loss: 0, count: 0, blockers: 0 };
            }
            monthlyData[monthKey].perf += perf;
            monthlyData[monthKey].loss += loss;
            monthlyData[monthKey].count++;
            if (blockers.trim()) monthlyData[monthKey].blockers++;

            // Performance distribution buckets
            const perfBucket = Math.floor(perf / 10) * 10;
            perfBuckets[perfBucket] = (perfBuckets[perfBucket] || 0) + 1;

            // Loss distribution buckets
            const lossBucket = Math.floor(loss / 10000) * 10000;
            lossBuckets[lossBucket] = (lossBuckets[lossBucket] || 0) + 1;
        });

        const total = sheets.length;
        const avgPerf = Math.round(totalPerf / total);
        const avgLoss = Math.round(totalLoss / total);
        const avgWorkload = Math.round(totalWorkload / total);
        const blockerRate = Math.round((blockersCount / total) * 100);

        // Department analytics
        const departments = Object.entries(deptStats)
            .map(([name, stats]) => ({
                name,
                avgPerf: Math.round(stats.perf / stats.count),
                totalLoss: stats.loss,
                avgLoss: Math.round(stats.loss / stats.count),
                avgWorkload: Math.round(stats.workload / stats.count),
                blockerRate: Math.round((stats.blockers / stats.count) * 100),
                approvalRate: Math.round((stats.approved / stats.count) * 100),
                rejectionRate: Math.round((stats.rejected / stats.count) * 100),
                count: stats.count,
                efficiency: Math.round((stats.perf / stats.count) - (stats.loss / stats.count / 1000))
            }))
            .sort((a, b) => b.avgPerf - a.avgPerf);

        // Monthly trends
        const monthlyTrends = Object.entries(monthlyData)
            .map(([month, data]) => ({
                month,
                avgPerf: Math.round(data.perf / data.count),
                totalLoss: data.loss,
                avgLoss: Math.round(data.loss / data.count),
                count: data.count,
                blockerRate: Math.round((data.blockers / data.count) * 100)
            }))
            .sort((a, b) => a.month.localeCompare(b.month));

        // Performance distribution
        const performanceDistribution = Object.entries(perfBuckets)
            .map(([bucket, count]) => ({
                range: `${bucket}-${parseInt(bucket) + 10}%`,
                count,
                percentage: Math.round((count / total) * 100)
            }))
            .sort((a, b) => parseInt(a.range) - parseInt(b.range));

        // Loss distribution
        const lossDistribution = Object.entries(lossBuckets)
            .map(([bucket, count]) => ({
                range: `₹${(parseInt(bucket) / 1000).toFixed(0)}k-${((parseInt(bucket) + 10000) / 1000).toFixed(0)}k`,
                count,
                totalLoss: parseInt(bucket) * count,
                percentage: Math.round((count / total) * 100)
            }))
            .sort((a, b) => parseInt(a.range) - parseInt(b.range));

        // Status breakdown
        const statusBreakdown = Object.entries(statusCount).map(([status, count]) => ({
            status,
            count,
            percentage: Math.round((count / total) * 100)
        }));

        // Top/Bottom performers
        const sortedByPerf = [...sheets].sort((a, b) => 
            (b.summary?.overall_percentage || 0) - (a.summary?.overall_percentage || 0)
        );
        const topPerformers = sortedByPerf.slice(0, 10).map(s => ({
            name: `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim(),
            dept: s.department,
            perf: s.summary?.overall_percentage || 0,
            loss: s.summary?.business_loss || 0,
            month: `${months[s.month - 1]} ${s.year}`
        }));
        const bottomPerformers = sortedByPerf.slice(-10).reverse().map(s => ({
            name: `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim(),
            dept: s.department,
            perf: s.summary?.overall_percentage || 0,
            loss: s.summary?.business_loss || 0,
            month: `${months[s.month - 1]} ${s.year}`
        }));

        // Risk matrix (high loss + low performance + has active blockers)
        const riskMatrix = sheets
            .filter(s => {
                const perf = s.summary?.overall_percentage || 0;
                const loss = s.summary?.business_loss || 0;
                const blockers = s.summary?.blockers || '';
                // Blockers not NA, loss > 0
                return perf < 70 && loss > 0 && blockers.trim().length > 0 && blockers.trim().toUpperCase() !== 'NA';
            })
            .map(s => ({
                name: `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim(),
                dept: s.department,
                perf: s.summary?.overall_percentage || 0,
                loss: s.summary?.business_loss || 0,
                blockers: s.summary?.blockers || '',
                month: `${months[s.month - 1]} ${s.year}`,
                riskScore: Math.round((100 - (s.summary?.overall_percentage || 0)) + 
                    ((s.summary?.business_loss || 0) / 1000))
            }))
            .sort((a, b) => b.riskScore - a.riskScore)
            .slice(0, 20);

        // Blocker analysis
        const blockerAnalysis = blockersList
            .sort((a, b) => b.loss - a.loss)
            .slice(0, 15);

        // Leave Analysis
        const leaveData = sheets.map(s => ({
            name: `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim(),
            dept: s.department,
            leaves: s.holidays ? s.holidays.length : 0,
            perf: s.summary?.overall_percentage || 0
        })).sort((a, b) => b.leaves - a.leaves);

        const mostLeaves = leaveData.slice(0, 10);
        const leastLeaves = [...leaveData].sort((a, b) => a.leaves - b.leaves).slice(0, 10);

        return {
            summary: {
                total,
                avgPerf,
                totalLoss,
                avgLoss,
                avgWorkload,
                blockerRate,
                blockersCount
            },
            departments,
            monthlyTrends,
            performanceDistribution,
            lossDistribution,
            statusBreakdown,
            topPerformers,
            bottomPerformers,
            riskMatrix,
            blockerAnalysis,
            leaveAnalysis: {
                mostLeaves,
                leastLeaves
            }
        };
    }, [getFilteredSheets, months]);

    const deptAnalytics = useMemo(() => {
        const analytics = {};
        const process = (sheets, stage) => {
            sheets.forEach(s => {
                const dept = s.department || 'Common';
                if (!analytics[dept]) analytics[dept] = { check: 0, verify: 0, approve: 0, total: 0 };
                analytics[dept][stage]++;
                analytics[dept].total++;
            });
        };
        process(data.pending_check, 'check');
        process(data.pending_verify, 'verify');
        process(data.pending_approve, 'approve');

        return Object.entries(analytics).map(([name, stats]) => {
            const stages = [];
            if (stats.check > 0) stages.push('Check');
            if (stats.verify > 0) stages.push('Verify');
            if (stats.approve > 0) stages.push('Approve');
            return {
                name,
                ...stats,
                stages: stages.join(', ')
            };
        }).sort((a, b) => b.total - a.total);
    }, [data]);

    // Department-specific KPI analytics when selected
    const deptDetailStats = useMemo(() => {
        if (!selectedDept) return null;

        const sheets = getFilteredSheets.filter(s => s.department === selectedDept);

        let totalPerf = 0, totalLoss = 0, blockerCount = 0, workloadTotal = 0, approvedCount = 0;
        const blockersList = [];
        const statusDist = { draft: 0, submitted: 0, checked: 0, verified: 0, approved: 0, rejected: 0 };

        sheets.forEach(sheet => {
            const perf = sheet.summary?.overall_percentage || 0;
            const loss = sheet.summary?.business_loss || 0;
            const workload = sheet.summary?.total_workload_percentage || 0;
            const blockers = sheet.summary?.blockers || '';

            totalPerf += perf;
            totalLoss += loss;
            workloadTotal += workload;

            if (blockers.trim().length > 0) {
                blockerCount++;
                blockersList.push({ user: sheet.user?.first_name || 'Unknown', blocker: blockers, loss });
            }

            if ((sheet.approval_history || []).find(h => h.action === 'APPROVE')) approvedCount++;
            statusDist[sheet.status.toLowerCase()]++;
        });

        const total = sheets.length || 1;

        return {
            sheets,
            avgPerf: Math.round(totalPerf / total),
            totalLoss,
            avgLoss: Math.round(totalLoss / total),
            avgWorkload: Math.round(workloadTotal / total),
            blockerCount,
            blockerRate: Math.round((blockerCount / total) * 100),
            blockersList: blockersList.sort((a, b) => b.loss - a.loss).slice(0, 5),
            approvalRate: Math.round((approvedCount / total) * 100),
            total,
            statusDist
        };
    }, [selectedDept, getFilteredSheets]);

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

        // Only filter by date for history. Show all pending items for other tabs.
        if (activeTab === 'history') {
            return sheets.filter(s => s.month === filterMonth && s.year === filterYear)
                .sort((a, b) => b.year - a.year || b.month - a.month); // Newest first
        }

        return sheets.sort((a, b) => a.year - b.year || a.month - b.month); // Oldest first (FIFO) for pending
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

                <div
                    className={`modern-stat-card ${activeTab === 'analytics' ? 'active' : ''}`}
                    onClick={() => setActiveTab('analytics')}
                    style={{ cursor: 'pointer', border: activeTab === 'analytics' ? '2px solid #6366f1' : '1px solid #e2e8f0' }}
                >
                    <div className="icon-box" style={{ background: '#eef2ff', color: '#6366f1' }}>
                        <Icons.Analytics />
                    </div>
                    <div className="stat-content">
                        <h3>{comprehensiveAnalytics.summary.total}</h3>
                        <p>Analytics Dashboard</p>
                    </div>
                </div>
            </div>

            {/* Analytics Dashboard */}
            {activeTab === 'analytics' && (
                <>
                    {/* Filter Panel */}
                    <motion.div className="modern-section" style={{ marginBottom: 20 }}>
                        <div className="section-header" style={{ cursor: 'pointer' }} onClick={() => setShowFilterPanel(!showFilterPanel)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Icons.Filter />
                                <h2>Advanced Filters</h2>
                            </div>
                            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                {showFilterPanel ? '▼ Hide' : '▶ Show'}
                            </span>
                        </div>
                        
                        {showFilterPanel && (
                            <div className="section-body" style={{ padding: 24 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
                                    {/* Date Range */}
                                    <div>
                                        <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Date Range</label>
                                        <select
                                            value={analyticsFilters.dateRange}
                                            onChange={(e) => setAnalyticsFilters({...analyticsFilters, dateRange: e.target.value})}
                                            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}
                                        >
                                            <option value="current_month">Current Month</option>
                                            <option value="last_3_months">Last 3 Months</option>
                                            <option value="last_6_months">Last 6 Months</option>
                                            <option value="ytd">Year to Date</option>
                                            <option value="custom">Custom Range</option>
                                        </select>
                                    </div>

                                    {/* Departments */}
                                    <div>
                                        <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Departments</label>
                                        <div style={{ maxHeight: 100, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, padding: 8 }}>
                                            {allDepartments.map(dept => (
                                                <FormControlLabel
                                                    key={dept}
                                                    control={
                                                        <Checkbox
                                                            checked={analyticsFilters.departments.includes(dept)}
                                                            onChange={(e) => {
                                                                const newDepts = e.target.checked
                                                                    ? [...analyticsFilters.departments, dept]
                                                                    : analyticsFilters.departments.filter(d => d !== dept);
                                                                setAnalyticsFilters({...analyticsFilters, departments: newDepts});
                                                            }}
                                                            size="small"
                                                        />
                                                    }
                                                    label={dept}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                
                                  
                                </div>

                                {analyticsFilters.dateRange === 'custom' && (
                                    <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                                        <div>
                                            <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Start Month</label>
                                            <select
                                                value={analyticsFilters.customStartMonth}
                                                onChange={(e) => setAnalyticsFilters({...analyticsFilters, customStartMonth: Number(e.target.value)})}
                                                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}
                                            >
                                                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Start Year</label>
                                            <select
                                                value={analyticsFilters.customStartYear}
                                                onChange={(e) => setAnalyticsFilters({...analyticsFilters, customStartYear: Number(e.target.value)})}
                                                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}
                                            >
                                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>End Month</label>
                                            <select
                                                value={analyticsFilters.customEndMonth}
                                                onChange={(e) => setAnalyticsFilters({...analyticsFilters, customEndMonth: Number(e.target.value)})}
                                                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}
                                            >
                                                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>End Year</label>
                                            <select
                                                value={analyticsFilters.customEndYear}
                                                onChange={(e) => setAnalyticsFilters({...analyticsFilters, customEndYear: Number(e.target.value)})}
                                                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}
                                            >
                                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                                    <button 
                                        className="modern-btn primary"
                                        onClick={() => setAnalyticsFilters({
                                            dateRange: 'current_month',
                                            departments: [],

                                            customStartMonth: new Date().getMonth() + 1,
                                            customStartYear: new Date().getFullYear(),
                                            customEndMonth: new Date().getMonth() + 1,
                                            customEndYear: new Date().getFullYear()
                                        })}
                                    >
                                        Reset Filters
                                    </button>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem', padding: 8 }}>
                                        Showing {getFilteredSheets.length} of {
                                            [...data.pending_check, ...data.pending_verify, ...data.pending_approve, ...data.recently_processed]
                                                .filter((s, i, arr) => arr.findIndex(x => x._id === s._id) === i).length
                                        } sheets
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Analytics View Selector */}
                    <div style={{ marginBottom: 20, display: 'flex', gap: 12, overflowX: 'auto', padding: '0 4px' }}>
                        {[
                            { id: 'overview', label: 'Overview', icon: <Icons.Analytics /> },
                            { id: 'leaves', label: 'Leave Analysis', icon: <div style={{ transform: 'rotate(180deg)' }}><Icons.Trend /></div> },
                            { id: 'departments', label: 'Departments', icon: <Icons.Analytics /> },
                            { id: 'performance', label: 'Performance', icon: <Icons.Trend /> },
                            { id: 'risk', label: 'Risk Analysis', icon: <Icons.Warning /> }
                        ].map(view => (
                            <button
                                key={view.id}
                                className={`modern-btn ${analyticsView === view.id ? 'primary' : 'secondary'}`}
                                onClick={() => setAnalyticsView(view.id)}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
                            >
                                {view.icon}
                                {view.label}
                            </button>
                        ))}
                    </div>

                    {/* Overview Analytics */}
                    {analyticsView === 'overview' && (
                        <div style={{ display: 'grid', gap: 20 }}>
                            {/* Summary Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                                <div style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 8 }}>Total Sheets</div>
                                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#334155' }}>
                                        {comprehensiveAnalytics.summary.total}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 4 }}>
                                        In selected period
                                    </div>
                                </div>

                                <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', padding: 20, borderRadius: 12, color: 'white' }}>
                                    <div style={{ fontSize: '0.9rem', marginBottom: 8, opacity: 0.9 }}>Avg Performance</div>
                                    <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                                        {comprehensiveAnalytics.summary.avgPerf}%
                                    </div>
                                    <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: 4 }}>
                                        {comprehensiveAnalytics.summary.avgPerf >= 75 ? 'Excellent' : 
                                         comprehensiveAnalytics.summary.avgPerf >= 60 ? 'Good' : 'Needs Improvement'}
                                    </div>
                                </div>

                                <div style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', padding: 20, borderRadius: 12, color: 'white' }}>
                                    <div style={{ fontSize: '0.9rem', marginBottom: 8, opacity: 0.9 }}>Total Business Loss</div>
                                    <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                                        {formatCurrency(comprehensiveAnalytics.summary.totalLoss)}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: 4 }}>
                                        Avg: {formatCurrency(comprehensiveAnalytics.summary.avgLoss)} per sheet
                                    </div>
                                </div>

                                <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', padding: 20, borderRadius: 12, color: 'white' }}>
                                    <div style={{ fontSize: '0.9rem', marginBottom: 8, opacity: 0.9 }}>Blockers Rate</div>
                                    <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                                        {comprehensiveAnalytics.summary.blockerRate}%
                                    </div>
                                    <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: 4 }}>
                                        {comprehensiveAnalytics.summary.blockersCount} active blockers
                                    </div>
                                </div>

                                <div style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 8 }}>Avg Workload</div>
                                    <div style={{ fontSize: '2rem', fontWeight: 700, color: '#6366f1' }}>
                                        {comprehensiveAnalytics.summary.avgWorkload}%
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 4 }}>
                                        Utilization rate
                                    </div>
                                </div>
                            </div>

                            {/* Charts Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
                                {/* Performance Distribution */}
                                <div style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                    <h3 style={{ marginBottom: 16, color: '#334155' }}>Performance Distribution</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={comprehensiveAnalytics.performanceDistribution}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <ReTooltip />
                                            <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Status Breakdown */}
                                <div style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                    <h3 style={{ marginBottom: 16, color: '#334155' }}>Status Breakdown</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={comprehensiveAnalytics.statusBreakdown}
                                                dataKey="count"
                                                nameKey="status"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={100}
                                                label={({ status, percentage }) => `${status}: ${percentage}%`}
                                            >
                                                {comprehensiveAnalytics.statusBreakdown.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={
                                                        entry.status === 'APPROVED' ? COLORS.excellent :
                                                        entry.status === 'VERIFIED' ? COLORS.good :
                                                        entry.status === 'CHECKED' ? COLORS.average :
                                                        entry.status === 'SUBMITTED' ? COLORS.primary :
                                                        entry.status === 'REJECTED' ? COLORS.poor :
                                                        '#94a3b8'
                                                    } />
                                                ))}
                                            </Pie>
                                            <ReTooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Leave Analysis View */}
                    {analyticsView === 'leaves' && (
                        <div style={{ display: 'grid', gap: 20 }}>
                            <div style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 20 }}>
                                <h3 style={{ marginBottom: 8, color: '#334155' }}>CEO Insights: Leave Patterns</h3>
                                <p style={{ color: '#64748b', margin: 0 }}>
                                    Analyzing employee leave patterns against performance metrics. 
                                    Looking for correlations between time off, burnout risks, and productivity.
                                </p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
                                {/* Highest Leave Takers */}
                                <div style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                    <h3 style={{ marginBottom: 16, color: '#334155' }}>🌴 Most Leaves Taken (Last Period)</h3>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                                    <th style={{ padding: 12, textAlign: 'left' }}>Employee</th>
                                                    <th style={{ padding: 12, textAlign: 'left' }}>Dept</th>
                                                    <th style={{ padding: 12, textAlign: 'center' }}>Leaves</th>
                                                    <th style={{ padding: 12, textAlign: 'right' }}>Performance</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {comprehensiveAnalytics.leaveAnalysis?.mostLeaves?.map((emp, i) => (
                                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                        <td style={{ padding: 12, fontWeight: 600 }}>{emp.name}</td>
                                                        <td style={{ padding: 12, fontSize: '0.9rem', color: '#64748b' }}>{emp.dept}</td>
                                                        <td style={{ padding: 12, textAlign: 'center', fontWeight: 700, color: '#f59e0b' }}>{emp.leaves}</td>
                                                        <td style={{ padding: 12, textAlign: 'right', fontWeight: 600, color: emp.perf >= 75 ? COLORS.excellent : emp.perf >= 60 ? COLORS.good : COLORS.poor }}>
                                                            {emp.perf}%
                                                        </td>
                                                    </tr>
                                                ))}
                                                {(!comprehensiveAnalytics.leaveAnalysis?.mostLeaves || comprehensiveAnalytics.leaveAnalysis.mostLeaves.length === 0) && (
                                                     <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No data available</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Least Leave Takers */}
                                <div style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                    <h3 style={{ marginBottom: 16, color: '#334155' }}>💼 Least Leaves Taken (Burnout Watch)</h3>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                                    <th style={{ padding: 12, textAlign: 'left' }}>Employee</th>
                                                    <th style={{ padding: 12, textAlign: 'left' }}>Dept</th>
                                                    <th style={{ padding: 12, textAlign: 'center' }}>Leaves</th>
                                                    <th style={{ padding: 12, textAlign: 'right' }}>Performance</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {comprehensiveAnalytics.leaveAnalysis?.leastLeaves?.map((emp, i) => (
                                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                        <td style={{ padding: 12, fontWeight: 600 }}>{emp.name}</td>
                                                        <td style={{ padding: 12, fontSize: '0.9rem', color: '#64748b' }}>{emp.dept}</td>
                                                        <td style={{ padding: 12, textAlign: 'center', fontWeight: 700, color: '#334155' }}>{emp.leaves}</td>
                                                        <td style={{ padding: 12, textAlign: 'right', fontWeight: 600, color: emp.perf >= 75 ? COLORS.excellent : emp.perf >= 60 ? COLORS.good : COLORS.poor }}>
                                                            {emp.perf}%
                                                        </td>
                                                    </tr>
                                                ))}
                                                {(!comprehensiveAnalytics.leaveAnalysis?.leastLeaves || comprehensiveAnalytics.leaveAnalysis.leastLeaves.length === 0) && (
                                                     <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No data available</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Departments View */}
                    {analyticsView === 'departments' && (
                        <div style={{ display: 'grid', gap: 20 }}>
                            {/* Department Rankings */}
                            <div style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                <h3 style={{ marginBottom: 16, color: '#334155' }}>Department Performance Rankings</h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                                <th style={{ padding: 12, textAlign: 'left' }}>Rank</th>
                                                <th style={{ padding: 12, textAlign: 'left' }}>Department</th>
                                                <th style={{ padding: 12, textAlign: 'right' }}>Avg Perf</th>
                                                <th style={{ padding: 12, textAlign: 'right' }}>Total Loss</th>
                                                <th style={{ padding: 12, textAlign: 'right' }}>Avg Loss</th>
                                                <th style={{ padding: 12, textAlign: 'right' }}>Blocker Rate</th>
                                                <th style={{ padding: 12, textAlign: 'right' }}>Approval Rate</th>
                                                <th style={{ padding: 12, textAlign: 'right' }}>Sheets</th>
                                                <th style={{ padding: 12, textAlign: 'center' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {comprehensiveAnalytics.departments.map((dept, index) => (
                                                <tr key={dept.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: 12, fontWeight: 600 }}>#{index + 1}</td>
                                                    <td style={{ padding: 12, fontWeight: 600 }}>{dept.name}</td>
                                                    <td style={{ 
                                                        padding: 12, 
                                                        textAlign: 'right',
                                                        color: dept.avgPerf >= 75 ? COLORS.excellent : dept.avgPerf >= 60 ? COLORS.good : COLORS.average,
                                                        fontWeight: 700
                                                    }}>
                                                        {dept.avgPerf}%
                                                    </td>
                                                    <td style={{ padding: 12, textAlign: 'right', color: dept.totalLoss > 0 ? '#ef4444' : '#94a3b8', fontWeight: 600 }}>
                                                        {dept.totalLoss > 0 ? formatCurrency(dept.totalLoss) : '-'}
                                                    </td>
                                                    <td style={{ padding: 12, textAlign: 'right', color: '#94a3b8' }}>
                                                        {dept.avgLoss > 0 ? formatCurrency(dept.avgLoss) : '-'}
                                                    </td>
                                                    <td style={{ padding: 12, textAlign: 'right', color: '#f59e0b' }}>
                                                        {dept.blockerRate}%
                                                    </td>
                                                    <td style={{ padding: 12, textAlign: 'right', color: '#22c55e' }}>
                                                        {dept.approvalRate}%
                                                    </td>
                                                    <td style={{ padding: 12, textAlign: 'right' }}>{dept.count}</td>
                                                    <td style={{ padding: 12, textAlign: 'center' }}>
                                                        <button 
                                                            className="modern-btn icon-only"
                                                            onClick={() => setSelectedDept(dept.name)}
                                                            title="View Details"
                                                        >
                                                            <Icons.Eye />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Department Comparison Charts */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
                                {/* Performance Comparison */}
                                <div style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                    <h3 style={{ marginBottom: 16, color: '#334155' }}>Department Performance</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={comprehensiveAnalytics.departments.slice(0, 10)} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis type="number" tick={{ fontSize: 12 }} />
                                            <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
                                            <ReTooltip />
                                            <Bar dataKey="avgPerf" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Loss Comparison */}
                                <div style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                    <h3 style={{ marginBottom: 16, color: '#334155' }}>Department Business Loss</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={comprehensiveAnalytics.departments.slice(0, 10).sort((a, b) => b.totalLoss - a.totalLoss).filter(d => d.totalLoss > 0)} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis type="number" tick={{ fontSize: 12 }} />
                                            <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
                                            <ReTooltip formatter={(value) => formatCurrency(value)} />
                                            <Bar dataKey="totalLoss" fill="#ef4444" radius={[0, 8, 8, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Department Detail Modal */}
                            {selectedDept && deptDetailStats && (
                                <Dialog open={true} onClose={() => setSelectedDept(null)} maxWidth="lg" fullWidth>
                                    <DialogTitle>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>{selectedDept} - Detailed Analytics</span>
                                            <Button onClick={() => setSelectedDept(null)}>Close</Button>
                                        </div>
                                    </DialogTitle>
                                    <DialogContent>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 24 }}>
                                            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                                                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 4 }}>Total Sheets</div>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{deptDetailStats.total}</div>
                                            </div>
                                            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                                                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 4 }}>Avg Performance</div>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: COLORS.good }}>{deptDetailStats.avgPerf}%</div>
                                            </div>
                                            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                                                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 4 }}>Total Loss</div>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: COLORS.poor }}>{formatCurrency(deptDetailStats.totalLoss)}</div>
                                            </div>
                                            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                                                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 4 }}>Blockers</div>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: COLORS.average }}>{deptDetailStats.blockerRate}%</div>
                                            </div>
                                            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                                                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 4 }}>Approval Rate</div>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: COLORS.excellent }}>{deptDetailStats.approvalRate}%</div>
                                            </div>
                                        </div>

                                        {deptDetailStats.blockersList.length > 0 && (
                                            <div style={{ marginTop: 24 }}>
                                                <h4 style={{ marginBottom: 12 }}>Top Blockers by Impact</h4>
                                                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                                                    {deptDetailStats.blockersList.map((blocker, i) => (
                                                        <div key={i} style={{ padding: 12, marginBottom: 8, background: '#fef2f2', borderLeft: '3px solid #ef4444', borderRadius: 4 }}>
                                                            <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>
                                                                {blocker.user} - Loss: {formatCurrency(blocker.loss)}
                                                            </div>
                                                            <div style={{ fontSize: '0.9rem', color: '#7f1d1d' }}>{blocker.blocker}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>
                    )}

                    {/* Performance View */}
                    {analyticsView === 'performance' && (
                        <div style={{ display: 'grid', gap: 20 }}>
                            {/* Top Performers */}
                            <div style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                <h3 style={{ marginBottom: 16, color: '#334155' }}>🏆 Top 10 Performers</h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#dcfce7', borderBottom: '2px solid #22c55e' }}>
                                                <th style={{ padding: 12, textAlign: 'left' }}>Rank</th>
                                                <th style={{ padding: 12, textAlign: 'left' }}>Name</th>
                                                <th style={{ padding: 12, textAlign: 'left' }}>Department</th>
                                                <th style={{ padding: 12, textAlign: 'right' }}>Performance</th>
                                                <th style={{ padding: 12, textAlign: 'right' }}>Business Loss</th>
                                                <th style={{ padding: 12, textAlign: 'left' }}>Period</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {comprehensiveAnalytics.topPerformers.map((emp, index) => (
                                                <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: 12, fontWeight: 700, color: index < 3 ? '#f59e0b' : '#64748b' }}>
                                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                                    </td>
                                                    <td style={{ padding: 12, fontWeight: 600 }}>{emp.name}</td>
                                                    <td style={{ padding: 12 }}>{emp.dept}</td>
                                                    <td style={{ padding: 12, textAlign: 'right', color: COLORS.excellent, fontWeight: 700 }}>
                                                        {emp.perf}%
                                                    </td>
                                                    <td style={{ padding: 12, textAlign: 'right', color: emp.loss > 0 ? '#64748b' : '#94a3b8' }}>
                                                        {emp.loss > 0 ? formatCurrency(emp.loss) : '-'}
                                                    </td>
                                                    <td style={{ padding: 12, fontSize: '0.85rem', color: '#94a3b8' }}>{emp.month}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Bottom Performers */}
                            <div style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                <h3 style={{ marginBottom: 16, color: '#334155' }}>⚠️ Bottom 10 Performers (Need Support)</h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#fee2e2', borderBottom: '2px solid #ef4444' }}>
                                                <th style={{ padding: 12, textAlign: 'left' }}>Rank</th>
                                                <th style={{ padding: 12, textAlign: 'left' }}>Name</th>
                                                <th style={{ padding: 12, textAlign: 'left' }}>Department</th>
                                                <th style={{ padding: 12, textAlign: 'right' }}>Performance</th>
                                                <th style={{ padding: 12, textAlign: 'right' }}>Business Loss</th>
                                                <th style={{ padding: 12, textAlign: 'left' }}>Period</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {comprehensiveAnalytics.bottomPerformers.map((emp, index) => (
                                                <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: 12 }}>{index + 1}</td>
                                                    <td style={{ padding: 12, fontWeight: 600 }}>{emp.name}</td>
                                                    <td style={{ padding: 12 }}>{emp.dept}</td>
                                                    <td style={{ padding: 12, textAlign: 'right', color: COLORS.poor, fontWeight: 700 }}>
                                                        {emp.perf}%
                                                    </td>
                                                    <td style={{ padding: 12, textAlign: 'right', color: emp.loss > 0 ? '#ef4444' : '#94a3b8', fontWeight: 600 }}>
                                                        {emp.loss > 0 ? formatCurrency(emp.loss) : '-'}
                                                    </td>
                                                    <td style={{ padding: 12, fontSize: '0.85rem', color: '#94a3b8' }}>{emp.month}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Performance vs Loss Scatter */}
                            <div style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                <h3 style={{ marginBottom: 16, color: '#334155' }}>Performance vs Business Loss Correlation</h3>
                                <ResponsiveContainer width="100%" height={400}>
                                    <ScatterChart>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="perf" name="Performance" unit="%" tick={{ fontSize: 12 }} label={{ value: 'Performance %', position: 'insideBottom', offset: -5 }} />
                                        <YAxis dataKey="loss" name="Loss" unit="₹" tick={{ fontSize: 12 }} label={{ value: 'Business Loss (₹)', angle: -90, position: 'insideLeft' }} />
                                        <ReTooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name) => [name === 'loss' ? formatCurrency(value) : `${value}%`, name]} />
                                        <Scatter 
                                            name="Employees" 
                                            data={[...comprehensiveAnalytics.topPerformers, ...comprehensiveAnalytics.bottomPerformers].filter(e => e.loss > 0).map(e => ({ perf: e.perf, loss: e.loss }))} 
                                            fill="#6366f1" 
                                        />
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Risk Analysis View */}
                    {analyticsView === 'risk' && (
                        <div style={{ display: 'grid', gap: 20 }}>
                            {/* High Risk Cases */}
                            <div style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                <h3 style={{ marginBottom: 16, color: '#334155' }}>🚨 High Risk Cases (Active Blockers & Business Loss)</h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#fee2e2', borderBottom: '2px solid #ef4444' }}>
                                                <th style={{ padding: 12, textAlign: 'left' }}>Risk Score</th>
                                                <th style={{ padding: 12, textAlign: 'left' }}>Name</th>
                                                <th style={{ padding: 12, textAlign: 'left' }}>Department</th>
                                                <th style={{ padding: 12, textAlign: 'right' }}>Performance</th>
                                                <th style={{ padding: 12, textAlign: 'right' }}>Business Loss</th>
                                                <th style={{ padding: 12, textAlign: 'left' }}>Active Blockers</th>
                                                <th style={{ padding: 12, textAlign: 'left' }}>Period</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {comprehensiveAnalytics.riskMatrix.map((emp, index) => (
                                                <tr key={index} style={{ borderBottom: '1px solid #f1f5f9', background: index % 2 ? '#fef2f2' : 'white' }}>
                                                    <td style={{ padding: 12, fontWeight: 700, color: emp.riskScore > 150 ? '#dc2626' : emp.riskScore > 100 ? '#f59e0b' : '#64748b' }}>
                                                        {emp.riskScore}
                                                    </td>
                                                    <td style={{ padding: 12, fontWeight: 600 }}>{emp.name}</td>
                                                    <td style={{ padding: 12 }}>{emp.dept}</td>
                                                    <td style={{ padding: 12, textAlign: 'right', color: '#ef4444', fontWeight: 700 }}>
                                                        {emp.perf}%
                                                    </td>
                                                    <td style={{ padding: 12, textAlign: 'right', color: '#ef4444', fontWeight: 700 }}>
                                                        {formatCurrency(emp.loss)}
                                                    </td>
                                                    <td style={{ padding: 12, fontSize: '0.85rem', maxWidth: 200 }}>
                                                        {emp.blockers ? emp.blockers.substring(0, 50) + '...' : 'None'}
                                                    </td>
                                                    <td style={{ padding: 12, fontSize: '0.85rem', color: '#94a3b8' }}>{emp.month}</td>
                                                </tr>
                                            ))}
                                            {comprehensiveAnalytics.riskMatrix.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#22c55e' }}>
                                                        ✅ No high-risk cases found in the current filter
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Blocker Analysis */}
                            <div style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                <h3 style={{ marginBottom: 16, color: '#334155' }}>🔴 Critical Blockers by Impact</h3>
                                <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                                    {comprehensiveAnalytics.blockerAnalysis.map((blocker, index) => (
                                        <div key={index} style={{ 
                                            padding: 16, 
                                            marginBottom: 12, 
                                            background: blocker.loss > 100000 ? '#fee2e2' : blocker.loss > 50000 ? '#fef3c7' : '#f1f5f9',
                                            borderLeft: `4px solid ${blocker.loss > 100000 ? '#ef4444' : blocker.loss > 50000 ? '#f59e0b' : '#94a3b8'}`,
                                            borderRadius: 6
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <div>
                                                    <span style={{ fontWeight: 700, marginRight: 12 }}>{blocker.user}</span>
                                                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{blocker.dept}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                                    <span style={{ color: '#ef4444', fontWeight: 700 }}>Loss: {formatCurrency(blocker.loss)}</span>
                                                    <span style={{ color: '#64748b' }}>Perf: {blocker.perf}%</span>
                                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{blocker.month}</span>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6 }}>
                                                {blocker.blocker}
                                            </div>
                                        </div>
                                    ))}
                                    {comprehensiveAnalytics.blockerAnalysis.length === 0 && (
                                        <div style={{ padding: 40, textAlign: 'center', color: '#22c55e' }}>
                                            ✅ No blockers reported in the current filter
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Risk Score Distribution */}
                            <div style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                <h3 style={{ marginBottom: 16, color: '#334155' }}>Risk Score Distribution</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={[
                                        { range: '0-50 (Low)', count: comprehensiveAnalytics.riskMatrix.filter(r => r.riskScore <= 50).length },
                                        { range: '51-100 (Medium)', count: comprehensiveAnalytics.riskMatrix.filter(r => r.riskScore > 50 && r.riskScore <= 100).length },
                                        { range: '101-150 (High)', count: comprehensiveAnalytics.riskMatrix.filter(r => r.riskScore > 100 && r.riskScore <= 150).length },
                                        { range: '151+ (Critical)', count: comprehensiveAnalytics.riskMatrix.filter(r => r.riskScore > 150).length }
                                    ]}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <ReTooltip />
                                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                            <Cell fill="#94a3b8" />
                                            <Cell fill="#f59e0b" />
                                            <Cell fill="#fb923c" />
                                            <Cell fill="#ef4444" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Sheets List (unchanged from original) */}
            {activeTab !== 'analytics' && (
                <motion.div className="modern-section">
                    <div className="section-header" style={{ justifyContent: 'space-between' }}>
                        <h2>
                            {activeTab === 'check' && 'Sheets Pending Check'}
                            {activeTab === 'verify' && 'Sheets Pending Verification'}
                            {activeTab === 'approve' && 'Sheets Pending Approval'}
                            {activeTab === 'history' && 'Recently Reviewed'}
                        </h2>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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

                            {activeTab === 'history' && (
                                <>
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
                                </>
                            )}
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
            )}

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