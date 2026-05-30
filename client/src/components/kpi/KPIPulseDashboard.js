import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { UserContext } from "../../contexts/UserContext";
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
    ResponsiveContainer, ReferenceLine, Cell, ZAxis, BarChart, Bar
} from 'recharts';
import {
    TextField, MenuItem, InputAdornment, Dialog, DialogContent, DialogTitle, IconButton, Avatar, Chip, Drawer, Box, Typography, Stack, Grid
} from '@mui/material';
import {
    DashboardOutlined, AssessmentOutlined, GroupsOutlined,
    WarningAmberOutlined, ErrorOutlineOutlined, TrendingDownOutlined,
    CloseOutlined, AdminPanelSettingsOutlined,
    SearchOutlined, BlockOutlined, DoneAllOutlined,
    FlagOutlined, PersonOutlined, ScoreboardOutlined,
    AttachMoneyOutlined, ChevronRightOutlined,
    HourglassEmptyOutlined, CheckCircleOutlineOutlined
} from '@mui/icons-material';
import KPISheet from './KPISheet';
import './kpi.scss';

// Quadrants definition (adjusted for cool tones)
const QUADRANTS = {
    Star:       { label: 'Star',       emoji: '★', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)', desc: 'High Volume + High Complexity',   action: 'Promote / Empower' },
    Engine:     { label: 'Engine',     emoji: '⚙', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)', desc: 'High Volume + Low Complexity',    action: 'Automate / Standardise' },
    Specialist: { label: 'Specialist', emoji: '◆', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.2)', desc: 'Low Volume + High Complexity',    action: 'Protect / Consult' },
    Drainer:    { label: 'Drainer',    emoji: '▲', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', desc: 'Low Volume + Low Complexity',     action: 'Retrain / Review' },
};

const TAB_CONFIG = [
    { key: 'overview',      label: 'Executive Overview',  icon: '📊' },
    { key: 'matrix',        label: 'Performance Matrix',  icon: '📈' },
    { key: 'teams',         label: 'Team Analytics',      icon: '👥' },
    { key: 'blockers',      label: 'Blockers',            icon: '🚧' },
    { key: 'losses',        label: 'Business Losses',     icon: '💸' },
    { key: 'openpoints',    label: 'Open Points',         icon: '🚩' },
    { key: 'nonsubmitters', label: 'Non Submitters',      icon: '⏳' },
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const initials = (fn, ln) => `${(fn || '?')[0]}${(ln || '?')[0]}`.toUpperCase();
const formatCurrency = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

const getTeamStats = (pulseData, reportData, nonSubmitterData) => {
    const teams = {};
    pulseData.forEach(p => {
        const t = p.team || p.department || 'Unassigned';
        if (!teams[t]) teams[t] = { name: t, members: [], totalScore: 0, stars: 0, engines: 0, specialists: 0, drainers: 0, totalLoss: 0, totalBlockers: 0, nonSubmitters: 0 };
        teams[t].members.push(p);
        teams[t].totalScore += p.current?.total_value_score || 0;
        const q = p.current?.quadrant || 'Drainer';
        if (q === 'Star') teams[t].stars++;
        else if (q === 'Engine') teams[t].engines++;
        else if (q === 'Specialist') teams[t].specialists++;
        else teams[t].drainers++;
    });
    (reportData.records || []).forEach(r => {
        const t = r.team || 'Unassigned';
        if (!teams[t]) teams[t] = { name: t, members: [], totalScore: 0, stars: 0, engines: 0, specialists: 0, drainers: 0, totalLoss: 0, totalBlockers: 0, nonSubmitters: 0 };
        teams[t].totalLoss += r.businessLoss || 0;
        if (r.blocker) teams[t].totalBlockers += r.blocker.split(' | ').filter(Boolean).length;
    });
    (nonSubmitterData.nonSubmitters || []).forEach(ns => {
        const t = ns.team || 'Unassigned';
        if (!teams[t]) teams[t] = { name: t, members: [], totalScore: 0, stars: 0, engines: 0, specialists: 0, drainers: 0, totalLoss: 0, totalBlockers: 0, nonSubmitters: 0 };
        teams[t].nonSubmitters++;
    });
    return Object.values(teams).map(t => ({
        ...t,
        avgScore: t.members.length ? Math.round(t.totalScore / t.members.length) : 0,
        memberCount: t.members.length,
        submissionRate: t.members.length ? Math.round(((t.members.length - t.nonSubmitters) / t.members.length) * 100) : 100
    })).sort((a, b) => b.avgScore - a.avgScore);
};

const CustomScatterTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const d = payload[0].payload;
        const q = QUADRANTS[d.quadrant] || QUADRANTS.Drainer;
        return (
            <div className="custom-chart-tooltip">
                <p className="tooltip-title">{d.name}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>Volume</span>
                    <strong style={{ textAlign: 'right' }}>{d.x}</strong>
                    <span style={{ color: '#64748b' }}>Complexity</span>
                    <strong style={{ textAlign: 'right' }}>{d.y.toFixed(2)}</strong>
                    <span style={{ color: '#64748b' }}>Score</span>
                    <strong style={{ textAlign: 'right', color: q.color }}>{d.totalValueScore}</strong>
                </div>
                <div style={{ marginTop: '12px', padding: '4px 8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', textAlign: 'center', fontSize: '11px', fontWeight: 700 }}>
                    {q.label} • {q.action}
                </div>
            </div>
        );
    }
    return null;
};

// Get default previous month and year to prevent day overflow bugs (e.g. March 31st -> Feb 28th)
const getPreviousMonthAndYear = () => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return {
        year: d.getFullYear(),
        month: d.getMonth() + 1
    };
};
const defaultDate = getPreviousMonthAndYear();

const KPIPulseDashboard = () => {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();

    const [year, setYear] = useState(defaultDate.year);
    const [month, setMonth] = useState(defaultDate.month);
    const [department, setDepartment] = useState('');
    const [team, setTeam] = useState('');
    const [teams, setTeams] = useState([]);
    const [data, setData] = useState({ pulseData: [], stats: {} });
    const [reportData, setReportData] = useState({ records: [], stats: {} });
    const [allOpenPoints, setAllOpenPoints] = useState([]);
    const [nonSubmitterData, setNonSubmitterData] = useState({ nonSubmitters: [], submitters: [], stats: {} });
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [opSearchQuery, setOpSearchQuery] = useState('');
    const [selectedSheetId, setSelectedSheetId] = useState(null);

    // Drawer / Dialog states
    const [teamDrawer, setTeamDrawer] = useState({ open: false, teamData: null });
    const [userOpDialog, setUserOpDialog] = useState({ open: false, user: null, points: [] });
    const [userOpLoading, setUserOpLoading] = useState(false);

    useEffect(() => { fetchTeams(); }, []);
    useEffect(() => {
        if (user && (user.role === 'Admin' || user.role === 'Head_of_Department')) fetchPulseData();
    }, [year, month, department, team, user]);

    const fetchTeams = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/teams/all`, { withCredentials: true });
            setTeams(res.data?.teams || []);
        } catch (err) { console.error("Error fetching teams", err); }
    };

    const fetchPulseData = async () => {
        try {
            setLoading(true);
            let url = `${process.env.REACT_APP_API_STRING}/kpi/analytics/pulse?year=${year}&month=${month}`;
            if (team) url += `&team=${encodeURIComponent(team)}`;
            else if (department) url += `&department=${encodeURIComponent(department)}`;
            const res = await axios.get(url, { withCredentials: true });
            const pulseArray = res.data || [];

            let stars = 0, specialists = 0, engines = 0, drainers = 0;
            pulseArray.forEach(item => {
                const q = item.current?.quadrant || 'Drainer';
                if (q === 'Star') stars++;
                else if (q === 'Specialist') specialists++;
                else if (q === 'Engine') engines++;
                else drainers++;
            });
            setData({ pulseData: pulseArray, stats: { totalUsers: pulseArray.length, stars, specialists, engines, drainers } });

            let reportUrl = `${process.env.REACT_APP_API_STRING}/kpi/analytics/blockers-losses?year=${year}&month=${month}`;
            if (team) reportUrl += `&team=${encodeURIComponent(team)}`;
            else if (department) reportUrl += `&department=${encodeURIComponent(department)}`;
            const reportRes = await axios.get(reportUrl, { withCredentials: true });
            setReportData(reportRes.data);

            const allOpRes = await axios.get(`${process.env.REACT_APP_API_STRING}/kpi/analytics/all-open-points`, { withCredentials: true });
            setAllOpenPoints(allOpRes.data || []);

            const nsUrl = `${process.env.REACT_APP_API_STRING}/kpi/analytics/non-submitters?year=${year}&month=${month}`;
            if (team) {
                const nsRes = await axios.get(`${nsUrl}&team=${encodeURIComponent(team)}`, { withCredentials: true });
                setNonSubmitterData(nsRes.data || { nonSubmitters: [], submitters: [], stats: {} });
            } else {
                const nsRes = await axios.get(nsUrl, { withCredentials: true });
                setNonSubmitterData(nsRes.data || { nonSubmitters: [], submitters: [], stats: {} });
            }
        } catch (error) {
            console.error("Error fetching pulse data", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserOpenPoints = async (username) => {
        try {
            setUserOpLoading(true);
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/open-points/user/${username}/points`, { withCredentials: true });
            setUserOpDialog(prev => ({ ...prev, points: res.data?.points || [], user: res.data?.userInfo || prev.user }));
        } catch (err) {
            console.error("Error fetching user open points", err);
        } finally {
            setUserOpLoading(false);
        }
    };

    const filteredData = useMemo(() => {
        const arr = data.pulseData || [];
        if (!searchQuery.trim()) return arr;
        const q = searchQuery.toLowerCase();
        return arr.filter(item => {
            const name = `${item.user?.first_name} ${item.user?.last_name}`.toLowerCase();
            const dept = (item.department || '').toLowerCase();
            const teamName = (item.team || '').toLowerCase();
            return name.includes(q) || dept.includes(q) || teamName.includes(q);
        });
    }, [data.pulseData, searchQuery]);

    const dashboardStats = useMemo(() => {
        let stars = 0, specialists = 0, engines = 0, drainers = 0;
        filteredData.forEach(item => {
            const q = item.current?.quadrant || 'Drainer';
            if (q === 'Star') stars++;
            else if (q === 'Specialist') specialists++;
            else if (q === 'Engine') engines++;
            else drainers++;
        });
        return { totalFiltered: filteredData.length, stars, specialists, engines, drainers };
    }, [filteredData]);

    const scatterData = useMemo(() => filteredData.map(item => {
        const quadrant = item.current?.quadrant || 'Drainer';
        const q = QUADRANTS[quadrant] || QUADRANTS.Drainer;
        return {
            x: item.current?.total_quantity || 0,
            y: item.current?.average_complexity || 0,
            z: Math.max(60, (item.current?.total_value_score || 0) * 0.3),
            name: `${item.user?.first_name} ${item.user?.last_name}`,
            quadrant, totalValueScore: item.current?.total_value_score || 0, color: q.color,
        };
    }), [filteredData]);

    const teamStats = useMemo(() => getTeamStats(data.pulseData, reportData, nonSubmitterData), [data.pulseData, reportData, nonSubmitterData]);
    const totalLoss = reportData.stats?.totalValueAtLoss || 0;
    const totalBlockers = reportData.stats?.blockerDistribution?.reduce((s, b) => s + b.count, 0) || 0;
    const avgScore = data.pulseData.length ? Math.round(data.pulseData.reduce((s, p) => s + (p.current?.total_value_score || 0), 0) / data.pulseData.length) : 0;
    const blockerChartData = useMemo(() => (reportData.stats?.blockerDistribution || []).map(b => ({ name: b.category, count: b.count })), [reportData]);

    const opFiltered = useMemo(() => {
        if (!opSearchQuery.trim()) return allOpenPoints;
        const q = opSearchQuery.toLowerCase();
        return allOpenPoints.filter(item => item.user.name.toLowerCase().includes(q) || (item.user.department || '').toLowerCase().includes(q));
    }, [allOpenPoints, opSearchQuery]);

    if (user?.role !== 'Admin' && user?.role !== 'Head_of_Department') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', flexDirection: 'column', gap: '24px', padding: '32px' }}>
                <div style={{ fontSize: '3.5rem' }}>🔐</div>
                <h3 style={{ fontWeight: 800, color: '#334155', margin: 0 }}>Access Restricted</h3>
                <p style={{ color: '#64748b', maxWidth: 450, textAlign: 'center', margin: 0 }}>This terminal is reserved for Executive Management and Department Heads.</p>
                <button onClick={() => navigate('/kpi')} style={{ padding: '10px 28px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Return to Personnel HQ</button>
            </div>
        );
    }

    return (
        <div className="report-root-container">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
                
                .report-root-container {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    display: flex;
                    flex-direction: column;
                    gap: 28px;
                    padding: 0;
                    background: transparent;
                    min-height: 100vh;
                }
                
                .report-header {
                    position: sticky;
                    top: 0;
                    z-index: 50;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(16px);
                    padding: 20px 40px;
                    border-bottom: 1px solid rgba(226, 232, 240, 0.6);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 16px;
                }
                
                /* Smooth Tab Selector */
                .nucleus-tab-container {
                    display: flex;
                    gap: 8px;
                    padding: 6px;
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: 16px;
                    width: fit-content;
                    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.04);
                }
                
                .nucleus-tab-btn {
                    padding: 10px 22px;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    border: none;
                    background: transparent;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    letter-spacing: -0.01em;
                }
                
                .nucleus-tab-btn.active {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: #ffffff;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                    font-weight: 700;
                }
                
                .nucleus-tab-btn:not(.active):hover {
                    background: rgba(102, 126, 234, 0.1);
                    color: #334155;
                }
                
                /* Glass Cards */
                .nucleus-stats-card {
                    background: rgba(255, 255, 255, 0.8);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04), 0 1px 4px rgba(0, 0, 0, 0.02);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                    position: relative;
                }
                
                .nucleus-stats-card::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
                }
                
                .nucleus-stats-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
                }
                
                /* Tables */
                .nucleus-table-wrapper {
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04);
                    overflow: hidden;
                }
                
                .nucleus-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                }
                
                .nucleus-table th {
                    background: linear-gradient(180deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.9) 100%);
                    color: #0f172a;
                    font-weight: 800;
                    font-size: 13.5px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    padding: 16px 20px;
                    border-bottom: 1px solid rgba(226, 232, 240, 0.6);
                    white-space: nowrap;
                    text-align: left;
                }
                
                .nucleus-table td {
                    color: #1e293b;
                    font-weight: 600;
                    font-size: 14.5px;
                    padding: 14px 20px;
                    border-bottom: 1px solid rgba(226, 232, 240, 0.4);
                    transition: background 0.2s;
                }
                
                .nucleus-table tr:hover td {
                    background: rgba(102, 126, 234, 0.04);
                }
                
                .nucleus-table tr:last-child td {
                    border-bottom: none;
                }
                
                /* Status Pills */
                .status-pill {
                    display: inline-flex;
                    align-items: center;
                    padding: 6px 14px;
                    border-radius: 999px;
                    font-weight: 600;
                    font-size: 11.5px;
                    letter-spacing: 0.02em;
                    text-transform: uppercase;
                    transition: all 0.2s;
                }
                
                .status-pill.neutral { background: rgba(148, 163, 184, 0.1); color: #475569; border: 1px solid rgba(148, 163, 184, 0.2); }
                .status-pill.success { background: rgba(16, 185, 129, 0.1); color: #059669; border: 1px solid rgba(16, 185, 129, 0.2); }
                .status-pill.warning { background: rgba(245, 158, 11, 0.1); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.2); }
                .status-pill.info { background: rgba(14, 165, 233, 0.1); color: #0284c7; border: 1px solid rgba(14, 165, 233, 0.2); }
                .status-pill.error { background: rgba(239, 68, 68, 0.1); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.2); }
                
                /* Charts */
                .analytics-graph-card {
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    padding: 28px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04);
                }
                
                .graph-card-header h3 {
                    color: #1e293b;
                    font-weight: 700;
                    font-size: 16px;
                    margin-bottom: 4px;
                }
                
                .graph-card-header .graph-subtitle {
                    color: #64748b;
                    font-weight: 500;
                    font-size: 13px;
                }
                
                .custom-chart-tooltip {
                    background: rgba(255, 255, 255, 0.95) !important;
                    backdrop-filter: blur(10px) !important;
                    -webkit-backdrop-filter: blur(10px) !important;
                    border: 1px solid rgba(226, 232, 240, 0.6) !important;
                    border-radius: 16px !important;
                    padding: 16px 20px !important;
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08) !important;
                }
                
                .custom-chart-tooltip .tooltip-title {
                    font-weight: 700;
                    font-size: 14px;
                    color: #1e293b;
                    margin-bottom: 10px;
                }
                
                .mono-text {
                    font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
                }

                .nucleus-loader {
                    width: 48px;
                    height: 48px;
                    border: 3px solid rgba(102, 126, 234, 0.2);
                    border-top-color: #667eea;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-bottom: 24px;
                }
                
                .section-header h3 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 800;
                    color: #0f172a;
                }
                
                .section-header p {
                    margin: 4px 0 0;
                    font-size: 13px;
                    color: #64748b;
                }
            `}</style>

            <div className="report-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <ScoreboardOutlined />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>CEO Pulse Dashboard</h2>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Strategic Command Center — Performance, Blockers & Accountability</p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <TextField select size="small" value={month} onChange={e => setMonth(Number(e.target.value))}
                        sx={{ minWidth: 130, '& .MuiOutlinedInput-root': { borderRadius: 2, background: '#fff', fontWeight: 600, fontSize: '13px' } }}>
                        {MONTHS.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" value={year} onChange={e => setYear(Number(e.target.value))}
                        sx={{ minWidth: 100, '& .MuiOutlinedInput-root': { borderRadius: 2, background: '#fff', fontWeight: 600, fontSize: '13px' } }}>
                        {[2024, 2025, 2026].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                    </TextField>
                    <TextField select size="small" value={team || 'ALL'} onChange={e => { const v = e.target.value; setTeam(v === 'ALL' ? '' : v); setDepartment(''); }}
                        sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: 2, background: '#fff', fontWeight: 600, fontSize: '13px' } }}>
                        <MenuItem value="ALL">All Teams</MenuItem>
                        {teams.map(t => <MenuItem key={t._id} value={t.name}>{t.name}</MenuItem>)}
                    </TextField>
                    <IconButton onClick={() => navigate('/kpi/admin')} sx={{ background: '#667eea', color: '#fff', borderRadius: 2, width: 40, height: 40, '&:hover': { background: '#764ba2' } }}>
                        <AdminPanelSettingsOutlined fontSize="small" />
                    </IconButton>
                </div>

                <div style={{ width: '100%', marginTop: '8px' }}>
                    <div className="nucleus-tab-container">
                        {TAB_CONFIG.map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`nucleus-tab-btn ${activeTab === tab.key ? 'active' : ''}`}>
                                <span>{tab.icon}</span> {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ padding: '0 40px', paddingBottom: '40px' }}>
                <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>

                        {/* ─────────────────────────────────────────── TAB: OVERVIEW ── */}
                        {activeTab === 'overview' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                    {[
                                        { label: 'Personnel', value: dashboardStats.totalFiltered, subtext: `of ${data.stats.totalUsers} org-wide`, color: '#667eea' },
                                        { label: 'Avg Score', value: avgScore, subtext: 'Mean value score', color: '#3b82f6' },
                                        { label: 'Business Loss', value: formatCurrency(totalLoss), subtext: `${reportData.records?.filter(r=>r.businessLoss>0).length || 0} cases`, color: '#ef4444' },
                                        { label: 'Blockers', value: totalBlockers, subtext: `${reportData.stats?.blockerDistribution?.length || 0} categories`, color: '#f59e0b' },
                                        { label: 'Submitters', value: `${nonSubmitterData.stats?.submissionRate || 0}%`, subtext: `${nonSubmitterData.stats?.submitted || 0} of ${nonSubmitterData.stats?.total || 0}`, color: '#10b981' },
                                        { label: 'Non Submitters', value: nonSubmitterData.stats?.nonSubmitted || 0, subtext: 'Require follow-up', color: '#64748b' }
                                    ].map((m, idx) => (
                                        <div key={idx} className="nucleus-stats-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '8px', background: `linear-gradient(135deg, ${m.color}10, transparent)` }}>
                                            <div style={{ fontSize: '13px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{m.label}</div>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                                <span style={{ fontSize: '38px', fontWeight: 900, color: '#0f172a' }} className="mono-text">{m.value}</span>
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{m.subtext}</div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                    <div className="analytics-graph-card" style={{ gridColumn: '1 / -1' }}>
                                        <div className="section-header">
                                            <div>
                                                <h3>Team Performance</h3>
                                                <p>Aggregated KPI metrics per team</p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                                            {teamStats.slice(0, 4).map(t => (
                                                <div key={t.name} className="nucleus-stats-card" onClick={() => setTeamDrawer({ open: true, teamData: t })} style={{ padding: '20px', cursor: 'pointer', background: 'rgba(255,255,255,0.6)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                        <strong style={{ fontSize: '15px', color: '#0f172a' }}>{t.name}</strong>
                                                        <span className="status-pill info">Avg {t.avgScore}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {[{l:'Stars',c:QUADRANTS.Star.color,v:t.stars},{l:'Engines',c:QUADRANTS.Engine.color,v:t.engines},{l:'Specialists',c:QUADRANTS.Specialist.color,v:t.specialists},{l:'Drainers',c:QUADRANTS.Drainer.color,v:t.drainers}].map(item => (
                                                            <div key={item.l} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.c }} />
                                                                <span style={{ flex: 1, fontSize: '12px', color: '#475569' }}>{item.l}</span>
                                                                <strong style={{ fontSize: '13px' }}>{item.v}</strong>
                                                                <div style={{ width: 60, height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                                                                    <div style={{ width: t.memberCount ? `${(item.v/t.memberCount)*100}%` : '0%', height: '100%', background: item.c }} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div style={{ borderTop: '1px solid rgba(226,232,240,0.6)', marginTop: '16px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                                                        <span>{t.memberCount} Members</span>
                                                        {t.totalLoss > 0 && <span style={{ color: '#ef4444', fontWeight: 700 }}>{formatCurrency(t.totalLoss)}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─────────────────────────────────────────── TAB: MATRIX ── */}
                        {activeTab === 'matrix' && (
                            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                                <div className="nucleus-stats-card" style={{ width: '320px', display: 'flex', flexDirection: 'column', padding: 0, maxHeight: 'calc(100vh - 200px)', overflow: 'hidden' }}>
                                    <div style={{ padding: '20px', borderBottom: '1px solid rgba(226,232,240,0.6)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: 800, color: '#0f172a' }}>
                                            👥 Personnel
                                        </div>
                                        <TextField fullWidth size="small" placeholder="Search members..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined sx={{ color: '#94a3b8', fontSize: 18 }} /></InputAdornment> }}
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, background: '#f8fafc', fontSize: '13px' } }} />
                                    </div>
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                                        {filteredData.length > 0 ? filteredData.map((item, i) => {
                                            const q = QUADRANTS[item.current?.quadrant || 'Drainer'];
                                            const isActive = selectedSheetId === item.current?.sheetId;
                                            return (
                                                <div key={i} onClick={() => item.current?.sheetId && setSelectedSheetId(item.current.sheetId)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', cursor: 'pointer', background: isActive ? 'rgba(102,126,234,0.1)' : 'transparent', marginBottom: '4px', transition: 'all 0.2s' }}>
                                                    <Avatar sx={{ width: 34, height: 34, fontSize: '12px', fontWeight: 700, background: q.bg, color: q.color, border: `1px solid ${q.border}` }}>
                                                        {initials(item.user?.first_name, item.user?.last_name)}
                                                    </Avatar>
                                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{item.user?.first_name} {item.user?.last_name}</div>
                                                        <div style={{ fontSize: '11px', color: '#64748b' }}><strong style={{ color: q.color }}>{q.label}</strong> • {item.team || item.department}</div>
                                                    </div>
                                                    <span className="status-pill neutral">{item.current?.total_value_score || 0}</span>
                                                </div>
                                            );
                                        }) : <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No members found.</div>}
                                    </div>
                                </div>

                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', minWidth: '400px' }}>
                                    <div className="analytics-graph-card" style={{ padding: '24px' }}>
                                        <div className="section-header">
                                            <div>
                                                <h3>Performance Matrix</h3>
                                                <p>Volume vs Complexity quadrant analysis</p>
                                            </div>
                                        </div>
                                        <div style={{ height: 420 }}>
                                            {loading ? (
                                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
                                                    <div className="nucleus-loader"></div>
                                                    <div style={{ color: '#64748b', fontWeight: 600 }}>Syncing Analytics...</div>
                                                </div>
                                            ) : (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
                                                        <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" />
                                                        <XAxis type="number" dataKey="x" name="Volume" domain={[0, 'dataMax + 20']} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                                                        <YAxis type="number" dataKey="y" name="Complexity" domain={[0, 5.5]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                                                        <ZAxis type="number" dataKey="z" range={[80, 600]} />
                                                        <ReTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#cbd5e1' }} />
                                                        <ReferenceLine x={100} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.5} />
                                                        <ReferenceLine y={3.0} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.5} />
                                                        <Scatter name="Teams" data={scatterData}>
                                                            {scatterData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.color} opacity={0.9} stroke="#ffffff" strokeWidth={2} />
                                                            ))}
                                                        </Scatter>
                                                    </ScatterChart>
                                                </ResponsiveContainer>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="analytics-graph-card" style={{ padding: '24px' }}>
                                        <div className="section-header">
                                            <div>
                                                <h3>Distribution</h3>
                                                <p>Quadrant breakdown</p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                            {Object.entries(QUADRANTS).map(([key, q]) => {
                                                const count = dashboardStats[key.toLowerCase() + 's'] || 0;
                                                const pct = dashboardStats.totalFiltered > 0 ? Math.round((count / dashboardStats.totalFiltered) * 100) : 0;
                                                return (
                                                    <div key={key} style={{ padding: '16px', borderRadius: '12px', background: q.bg, border: `1px solid ${q.border}` }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span style={{ fontSize: '14px' }}>{q.emoji}</span>
                                                                <strong style={{ fontSize: '13px', color: '#0f172a' }}>{q.label}</strong>
                                                            </div>
                                                            <strong style={{ fontSize: '20px', color: q.color }}>{count}</strong>
                                                        </div>
                                                        <div style={{ height: 6, background: 'rgba(255,255,255,0.6)', borderRadius: 3, overflow: 'hidden' }}>
                                                            <div style={{ width: `${pct}%`, height: '100%', background: q.color }} />
                                                        </div>
                                                        <div style={{ marginTop: '8px', fontSize: '10px', fontWeight: 700, color: '#64748b', textAlign: 'right', textTransform: 'uppercase' }}>{pct}% of view</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─────────────────────────────────────────── TAB: TEAMS ── */}
                        {activeTab === 'teams' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                                    {teamStats.map(t => (
                                        <div key={t.name} className="nucleus-stats-card" onClick={() => setTeamDrawer({ open: true, teamData: t })} style={{ padding: '24px', cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{t.name}</h3>
                                                <span className="status-pill info">Avg {t.avgScore}</span>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                                {[{l:'Stars',c:QUADRANTS.Star.color,v:t.stars},{l:'Engines',c:QUADRANTS.Engine.color,v:t.engines},{l:'Specialists',c:QUADRANTS.Specialist.color,v:t.specialists},{l:'Drainers',c:QUADRANTS.Drainer.color,v:t.drainers}].map(item => (
                                                    <div key={item.l} style={{ textAlign: 'center', padding: '8px', borderRadius: '8px', background: `${item.c}10`, border: `1px solid ${item.c}30` }}>
                                                        <div style={{ fontSize: '16px', fontWeight: 800, color: item.c }}>{item.v}</div>
                                                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: '4px' }}>{item.l}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Members</span><strong style={{ color: '#0f172a' }}>{t.memberCount}</strong></div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Submission Rate</span><strong style={{ color: t.submissionRate >= 90 ? '#10b981' : t.submissionRate >= 70 ? '#f59e0b' : '#ef4444' }}>{t.submissionRate}%</strong></div>
                                                {t.totalLoss > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Business Loss</span><strong style={{ color: '#ef4444' }}>{formatCurrency(t.totalLoss)}</strong></div>}
                                                {t.totalBlockers > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Blockers</span><strong style={{ color: '#f59e0b' }}>{t.totalBlockers}</strong></div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {teamStats.length > 0 && (
                                    <div className="nucleus-table-wrapper">
                                        <div style={{ padding: '24px' }}>
                                            <div className="section-header">
                                                <div>
                                                    <h3>Team Comparison</h3>
                                                    <p>Side-by-side performance metrics</p>
                                                </div>
                                            </div>
                                        </div>
                                        <table className="nucleus-table">
                                            <thead>
                                                <tr>
                                                    <th>Team</th>
                                                    <th style={{ textAlign: 'center' }}>Members</th>
                                                    <th style={{ textAlign: 'center' }}>Avg Score</th>
                                                    <th style={{ textAlign: 'center' }}>Stars</th>
                                                    <th style={{ textAlign: 'center' }}>Engines</th>
                                                    <th style={{ textAlign: 'center' }}>Specialists</th>
                                                    <th style={{ textAlign: 'center' }}>Drainers</th>
                                                    <th style={{ textAlign: 'center' }}>Submit Rate</th>
                                                    <th style={{ textAlign: 'right' }}>Loss</th>
                                                    <th style={{ textAlign: 'right' }}>Blockers</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {teamStats.map((t, i) => (
                                                    <tr key={i} onClick={() => setTeamDrawer({ open: true, teamData: t })} style={{ cursor: 'pointer' }}>
                                                        <td style={{ fontWeight: 700, color: '#3b82f6' }}>{t.name}</td>
                                                        <td style={{ textAlign: 'center' }}>{t.memberCount}</td>
                                                        <td style={{ textAlign: 'center' }}><span className="status-pill info">{t.avgScore}</span></td>
                                                        <td style={{ textAlign: 'center', color: QUADRANTS.Star.color }}>{t.stars}</td>
                                                        <td style={{ textAlign: 'center', color: QUADRANTS.Engine.color }}>{t.engines}</td>
                                                        <td style={{ textAlign: 'center', color: QUADRANTS.Specialist.color }}>{t.specialists}</td>
                                                        <td style={{ textAlign: 'center', color: QUADRANTS.Drainer.color }}>{t.drainers}</td>
                                                        <td style={{ textAlign: 'center', color: t.submissionRate >= 90 ? '#10b981' : t.submissionRate >= 70 ? '#f59e0b' : '#ef4444' }}>{t.submissionRate}%</td>
                                                        <td style={{ textAlign: 'right', color: t.totalLoss > 0 ? '#ef4444' : '#94a3b8' }}>{formatCurrency(t.totalLoss)}</td>
                                                        <td style={{ textAlign: 'right', color: t.totalBlockers > 0 ? '#f59e0b' : '#94a3b8' }}>{t.totalBlockers}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─────────────────────────────────────────── TAB: BLOCKERS ── */}
                        {activeTab === 'blockers' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div className="nucleus-stats-card" style={{ padding: '24px', background: 'linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{ width: 56, height: 56, borderRadius: '12px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                                                <BlockOutlined style={{ fontSize: 28 }} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Blockers Reported</div>
                                                <div style={{ fontSize: '32px', fontWeight: 800, color: '#d97706', lineHeight: 1 }}>{totalBlockers}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '32px' }}>
                                            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{reportData.stats?.blockerDistribution?.length || 0}</div><div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Categories</div></div>
                                            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{reportData.records?.filter(r => r.blocker).length || 0}</div><div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Personnel Affected</div></div>
                                            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{reportData.records?.length || 0}</div><div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Total Cases</div></div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                    <div className="analytics-graph-card">
                                        <div className="section-header">
                                            <div>
                                                <h3>Blocker Distribution</h3>
                                                <p>By category frequency</p>
                                            </div>
                                        </div>
                                        <div style={{ height: 320 }}>
                                            {blockerChartData.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={blockerChartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                        <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                                                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} width={120} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                                                        <ReTooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: '13px' }} cursor={{ fill: '#f8fafc' }} />
                                                        <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]} barSize={24} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            ) : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No blocker data.</div>}
                                        </div>
                                    </div>
                                    
                                    <div className="analytics-graph-card">
                                        <div className="section-header">
                                            <div>
                                                <h3>Highest Registered Blockers</h3>
                                                <p>Ranked by report volume</p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {(reportData.stats?.blockerDistribution || []).slice(0, 6).map((stat, i) => (
                                                <div key={i} style={{ padding: '16px', borderRadius: '12px', background: i === 0 ? '#fffbeb' : '#f8fafc', border: `1px solid ${i === 0 ? '#fde68a' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div>
                                                        <div style={{ fontSize: '11px', fontWeight: 700, color: i === 0 ? '#b45309' : '#94a3b8', textTransform: 'uppercase' }}>{i === 0 ? '🔥 Top Blocker' : `Rank #${i + 1}`}</div>
                                                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{stat.category}</div>
                                                    </div>
                                                    <span className={`status-pill ${i === 0 ? 'warning' : 'neutral'}`}>{stat.count} Reports</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="nucleus-table-wrapper">
                                    <div style={{ padding: '24px' }}>
                                        <div className="section-header" style={{ marginBottom: 0 }}>
                                            <div>
                                                <h3>Blocker Detail Register</h3>
                                                <p>Individual blocker case breakdown</p>
                                            </div>
                                        </div>
                                    </div>
                                    <table className="nucleus-table">
                                        <thead>
                                            <tr>
                                                <th>Personnel</th>
                                                <th>Team</th>
                                                <th>Blocker Details</th>
                                                <th>Category</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportData.records?.filter(r => r.blocker).length > 0 ? reportData.records.filter(r => r.blocker).flatMap((rec, i) => {
                                                const individualBlockers = rec.blocker.split(' | ').filter(b => b);
                                                return individualBlockers.map((b, idx) => {
                                                    let category = "Others";
                                                    let detail = b;
                                                    if (b.includes(":")) {
                                                        const parts = b.split(":");
                                                        category = parts[0].trim();
                                                        detail = parts.slice(1).join(":").trim();
                                                    }
                                                    return (
                                                        <tr key={`${i}-${idx}`}>
                                                            {idx === 0 && (
                                                                <>
                                                                    <td rowSpan={individualBlockers.length} style={{ fontWeight: 700, color: '#0f172a', verticalAlign: 'middle' }}>{rec.user.name}</td>
                                                                    <td rowSpan={individualBlockers.length} style={{ color: '#64748b', verticalAlign: 'middle' }}>{rec.team}</td>
                                                                </>
                                                            )}
                                                            <td style={{ color: '#334155', maxWidth: '400px', whiteSpace: 'normal', lineHeight: 1.5 }}>
                                                                {detail}
                                                            </td>
                                                            <td><span className="status-pill warning">{category}</span></td>
                                                        </tr>
                                                    );
                                                });
                                            }) : <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No blockers registered.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* ─────────────────────────────────────────── TAB: LOSSES ── */}
                        {activeTab === 'losses' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div className="nucleus-stats-card" style={{ padding: '24px', background: 'linear-gradient(135deg, #fee2e2 0%, #fff5f5 100%)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{ width: 56, height: 56, borderRadius: '12px', background: '#fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                                                <AttachMoneyOutlined style={{ fontSize: 28 }} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Financial Impact</div>
                                                <div style={{ fontSize: '32px', fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{formatCurrency(totalLoss)}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '32px' }}>
                                            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{reportData.records?.filter(r => r.businessLoss > 0).length || 0}</div><div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Loss Cases</div></div>
                                            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{formatCurrency(reportData.records?.filter(r=>r.businessLoss>0).length ? totalLoss / reportData.records.filter(r => r.businessLoss > 0).length : 0)}</div><div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Avg / Case</div></div>
                                            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{formatCurrency(Math.max(...(reportData.records?.map(r => r.businessLoss) || [0])))}</div><div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Highest</div></div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="nucleus-table-wrapper">
                                    <div style={{ padding: '24px' }}>
                                        <div className="section-header" style={{ marginBottom: 0 }}>
                                            <div>
                                                <h3>Business Loss Register</h3>
                                                <p>Individual financial impact breakdown</p>
                                            </div>
                                        </div>
                                    </div>
                                    <table className="nucleus-table">
                                        <thead>
                                            <tr>
                                                <th>Personnel</th>
                                                <th>Team</th>
                                                <th style={{ textAlign: 'right' }}>Business Loss</th>
                                                <th>Loss Category</th>
                                                <th>Root Cause / Description</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportData.records?.filter(r => r.businessLoss > 0).length > 0 ? reportData.records.filter(r => r.businessLoss > 0).sort((a, b) => b.businessLoss - a.businessLoss).map((rec, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{rec.user.name}</td>
                                                    <td style={{ color: '#64748b' }}>{rec.team}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#ef4444' }}>{formatCurrency(rec.businessLoss)}</td>
                                                    <td>
                                                        {rec.lossCategory ? (
                                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                                {rec.lossCategory.split(' | ').map((l, idx) => (
                                                                    <span key={idx} className="status-pill error">{l.includes(':') ? l.split(':').slice(1).join(':').trim() : l}</span>
                                                                ))}
                                                            </div>
                                                        ) : <span style={{ color: '#94a3b8' }}>—</span>}
                                                    </td>
                                                    <td style={{ color: '#475569', maxWidth: '300px', whiteSpace: 'normal', fontStyle: 'italic' }}>{rec.lossDescription || 'No description'}</td>
                                                </tr>
                                            )) : <tr><td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No business losses registered.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* ─────────────────────────────────────────── TAB: OPEN POINTS ── */}
                        {activeTab === 'openpoints' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                    {[
                                        { label: 'Red Open Points', value: allOpenPoints.reduce((s, p) => s + p.redCount, 0), color: '#ef4444', bg: '#fef2f2', border: '#fecaca', icon: <ErrorOutlineOutlined /> },
                                        { label: 'Amber Open Points', value: allOpenPoints.reduce((s, p) => s + p.amberCount, 0), color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: <WarningAmberOutlined /> },
                                        { label: 'Green Open Points', value: allOpenPoints.reduce((s, p) => s + p.greenCount, 0), color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', icon: <DoneAllOutlined /> }
                                    ].map((item, idx) => (
                                        <div key={idx} className="nucleus-stats-card" style={{ padding: '24px', textAlign: 'center', background: item.bg, border: `1px solid ${item.border}` }}>
                                            <div style={{ color: item.color, marginBottom: '8px' }}>{item.icon}</div>
                                            <div style={{ fontSize: '32px', fontWeight: 900, color: item.color, lineHeight: 1 }}>{item.value}</div>
                                            <div style={{ fontSize: '12px', fontWeight: 700, color: item.color, textTransform: 'uppercase', marginTop: '8px', opacity: 0.8 }}>{item.label}</div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="nucleus-table-wrapper">
                                    <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div className="section-header" style={{ marginBottom: 0 }}>
                                            <div>
                                                <h3>Accountability Tracker</h3>
                                                <p>Open points status for all employees — click a name to view details</p>
                                            </div>
                                        </div>
                                        <TextField size="small" placeholder="Search employee..." value={opSearchQuery} onChange={e => setOpSearchQuery(e.target.value)}
                                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined sx={{ color: '#94a3b8', fontSize: 18 }} /></InputAdornment> }}
                                            sx={{ minWidth: 240, '& .MuiOutlinedInput-root': { borderRadius: 2, background: '#f8fafc', fontSize: '13px' } }} />
                                    </div>
                                    <table className="nucleus-table">
                                        <thead>
                                            <tr>
                                                <th>Personnel</th>
                                                <th>Department</th>
                                                <th style={{ textAlign: 'center' }}>Red</th>
                                                <th style={{ textAlign: 'center' }}>Amber</th>
                                                <th style={{ textAlign: 'center' }}>Green</th>
                                                <th style={{ textAlign: 'center' }}>Score</th>
                                                <th style={{ textAlign: 'center' }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {opFiltered.length > 0 ? opFiltered.map((item, i) => (
                                                <tr key={i}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <Avatar sx={{ width: 32, height: 32, fontSize: '12px', fontWeight: 700, background: item.redCount > 0 ? '#ef4444' : '#10b981', color: '#fff' }}>{item.user.name.charAt(0)}</Avatar>
                                                            <div onClick={() => { setUserOpDialog({ open: true, user: item.user, points: [] }); fetchUserOpenPoints(item.user.username); }}
                                                                style={{ fontWeight: 700, color: '#3b82f6', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(59,130,246,0.3)' }}>
                                                                {item.user.name}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ color: '#64748b' }}>{item.user.department}</td>
                                                    <td style={{ textAlign: 'center' }}><span className={`status-pill ${item.redCount > 0 ? 'error' : 'neutral'}`}>{item.redCount}</span></td>
                                                    <td style={{ textAlign: 'center' }}><span className={`status-pill ${item.amberCount > 0 ? 'warning' : 'neutral'}`}>{item.amberCount}</span></td>
                                                    <td style={{ textAlign: 'center' }}><span className={`status-pill ${item.greenCount > 0 ? 'success' : 'neutral'}`}>{item.greenCount}</span></td>
                                                    <td style={{ textAlign: 'center' }}><strong style={{ color: item.accountabilityScore >= 90 ? '#10b981' : item.accountabilityScore >= 60 ? '#f59e0b' : '#ef4444' }}>{item.accountabilityScore}%</strong></td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {item.accountabilityScore >= 90 ? <span className="status-pill success">On Track</span> :
                                                         item.accountabilityScore >= 60 ? <span className="status-pill warning">At Risk</span> :
                                                         <span className="status-pill error">Critical</span>}
                                                    </td>
                                                </tr>
                                            )) : <tr><td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No records found.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* ─────────────────────────────────────────── TAB: NON SUBMITTERS ── */}
                        {activeTab === 'nonsubmitters' && (
                            <div className="nucleus-table-wrapper">
                                <div style={{ padding: '24px' }}>
                                    <div className="section-header" style={{ marginBottom: 0 }}>
                                        <div>
                                            <h3>Non Submitters List</h3>
                                            <p>Personnel who missed their daily reporting</p>
                                        </div>
                                    </div>
                                </div>
                                <table className="nucleus-table">
                                    <thead>
                                        <tr>
                                            <th>Personnel</th>
                                            <th>Team</th>
                                            <th>Manager / Head</th>
                                            <th>Last Login</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {nonSubmitterData.nonSubmitters?.length > 0 ? nonSubmitterData.nonSubmitters.map((ns, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 700, color: '#0f172a' }}>{ns.name}</td>
                                                <td style={{ color: '#64748b' }}>{ns.team || ns.department}</td>
                                                <td style={{ color: '#475569' }}>{ns.manager || '—'}</td>
                                                <td style={{ color: '#64748b' }}>{ns.lastActive ? new Date(ns.lastActive).toLocaleDateString('en-IN') : '—'}</td>
                                                <td><span className="status-pill error">Requires Follow-up</span></td>
                                            </tr>
                                        )) : <tr><td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No non-submitters found! All clear. 🎉</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* TEAM DRAWER */}
            <Drawer anchor="right" open={teamDrawer.open} onClose={() => setTeamDrawer({ open: false, teamData: null })}
                PaperProps={{ sx: { width: { xs: '100%', sm: 400 }, background: '#f8fafc' } }}>
                {teamDrawer.teamData && (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ padding: '24px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>{teamDrawer.teamData.name}</h2>
                                <IconButton onClick={() => setTeamDrawer({ open: false, teamData: null })} sx={{ color: '#fff' }}><CloseOutlined /></IconButton>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
                                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px' }}>Avg Score: {teamDrawer.teamData.avgScore}</span>
                                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px' }}>{teamDrawer.teamData.memberCount} Members</span>
                            </div>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {teamDrawer.teamData.members.map((m, i) => {
                                    const q = QUADRANTS[m.current?.quadrant || 'Drainer'];
                                    return (
                                        <div key={i} onClick={() => m.current?.sheetId && setSelectedSheetId(m.current.sheetId)}
                                            style={{ padding: '16px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <Avatar sx={{ width: 36, height: 36, fontSize: '13px', fontWeight: 700, background: q.bg, color: q.color, border: `1px solid ${q.border}` }}>{initials(m.user?.first_name, m.user?.last_name)}</Avatar>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{m.user?.first_name} {m.user?.last_name}</div>
                                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{m.department}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span className="status-pill neutral">{m.current?.total_value_score || 0}</span>
                                                <ChevronRightOutlined sx={{ fontSize: 18, color: '#94a3b8' }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </Drawer>

            {/* USER OPEN POINTS DIALOG */}
            <Dialog open={userOpDialog.open} onClose={() => setUserOpDialog({ open: false, user: null, points: [] })} maxWidth="md" fullWidth
                PaperProps={{ sx: { borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: '0 24px 48px rgba(0,0,0,0.18)', overflow: 'hidden' } }}>
                {userOpDialog.user && (
                    <>
                        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', py: 2.5, px: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Avatar sx={{ width: 36, height: 36, background: '#fff', color: '#667eea', fontWeight: 700, fontSize: '14px' }}>{userOpDialog.user.name?.charAt(0)}</Avatar>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '16px' }}>{userOpDialog.user.name}</div>
                                    <div style={{ fontSize: '12px', opacity: 0.85 }}>{userOpDialog.user.department}</div>
                                </div>
                            </div>
                            <IconButton onClick={() => setUserOpDialog({ open: false, user: null, points: [] })} sx={{ color: '#fff' }}><CloseOutlined /></IconButton>
                        </DialogTitle>
                        <DialogContent sx={{ p: 0 }}>
                            <div style={{ p: 3, background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '24px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                    {[
                                        { label: 'Red', count: userOpDialog.points.filter(p => p.status === 'Red').length, color: '#ef4444', border: '#fecaca' },
                                        { label: 'Amber', count: userOpDialog.points.filter(p => ['Yellow','Orange'].includes(p.status)).length, color: '#f59e0b', border: '#fde68a' },
                                        { label: 'Green', count: userOpDialog.points.filter(p => p.status === 'Green').length, color: '#10b981', border: '#a7f3d0' }
                                    ].map(st => (
                                        <div key={st.label} style={{ textAlign: 'center', padding: '12px', borderRadius: '8px', background: '#fff', border: `1px solid ${st.border}` }}>
                                            <div style={{ fontSize: '24px', fontWeight: 800, color: st.color }}>{st.count}</div>
                                            <div style={{ fontSize: '12px', fontWeight: 700, color: st.color }}>{st.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div style={{ padding: '24px', maxHeight: 480, overflowY: 'auto' }}>
                                {userOpLoading ? (
                                    <div style={{ padding: '48px 0', textAlign: 'center', color: '#94a3b8' }}>Loading open points...</div>
                                ) : userOpDialog.points.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {userOpDialog.points.sort((a,b) => {
                                            const order = { Red: 0, Orange: 1, Yellow: 2, Green: 3 };
                                            return (order[a.status] ?? 4) - (order[b.status] ?? 4);
                                        }).map((pt, i) => {
                                            const isOverdue = pt.status === 'Red' && pt.target_date && new Date(pt.target_date) < new Date();
                                            const statusColor = pt.status === 'Red' ? '#ef4444' : pt.status === 'Green' ? '#10b981' : '#f59e0b';
                                            return (
                                                <div key={i} style={{ padding: '16px', borderRadius: '12px', border: `1px solid ${statusColor}40`, background: `${statusColor}10` }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{pt.title}</div>
                                                            <div style={{ fontSize: '12px', color: '#64748b' }}>{pt.project_name} • {pt.unique_id}</div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            <span className="status-pill" style={{ background: `${statusColor}20`, color: statusColor, border: 'none' }}>{pt.status}</span>
                                                            {isOverdue && <span className="status-pill error">OVERDUE</span>}
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                                                        <span style={{ color: '#475569' }}><strong>Target:</strong> {pt.target_date ? new Date(pt.target_date).toLocaleDateString('en-IN') : '—'}</span>
                                                        <span style={{ color: '#475569' }}><strong>Priority:</strong> {pt.priority || '—'}</span>
                                                        <span style={{ color: '#475569' }}><strong>Level:</strong> {pt.level || '—'}</span>
                                                    </div>
                                                    {pt.gap_action && <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}><strong>Action:</strong> {pt.gap_action}</div>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div style={{ padding: '48px 0', textAlign: 'center' }}>
                                        <DoneAllOutlined style={{ fontSize: 48, color: '#10b981', opacity: 0.6, marginBottom: '8px' }} />
                                        <div style={{ fontWeight: 700, color: '#0f172a' }}>All Clear</div>
                                        <div style={{ color: '#64748b', fontSize: '13px' }}>This employee has no open points assigned.</div>
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </>
                )}
            </Dialog>

            {/* KPI Sheet Modal */}
            <Dialog open={Boolean(selectedSheetId)} onClose={() => setSelectedSheetId(null)} maxWidth="xl" fullWidth
                PaperProps={{ sx: { background: '#f8fafc', borderRadius: 4, boxShadow: '0 24px 48px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', minHeight: '85vh', overflow: 'hidden' } }}
                BackdropProps={{ sx: { backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)' } }}>
                <DialogContent sx={{ p: 0, position: 'relative' }}>
                    <IconButton onClick={() => setSelectedSheetId(null)} sx={{ position: 'absolute', top: 20, right: 20, zIndex: 1000, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, '&:hover': { background: '#f8fafc' } }}>
                        <CloseOutlined sx={{ fontSize: 18 }} />
                    </IconButton>
                    {selectedSheetId && <KPISheet sheetId={selectedSheetId} />}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default KPIPulseDashboard;
