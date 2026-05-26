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
    Box, Tabs, Tab, Card, CardContent, Typography, Chip, Avatar,
    LinearProgress, IconButton, Grid, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Stack, TextField, MenuItem, InputAdornment, Drawer,
    Dialog, DialogContent, DialogTitle, Divider
} from '@mui/material';
import {
    DashboardOutlined, AssessmentOutlined, GroupsOutlined,
    WarningAmberOutlined, ErrorOutlineOutlined, TrendingDownOutlined,
    CloseOutlined, AdminPanelSettingsOutlined,
    SearchOutlined, ArrowUpwardOutlined, ArrowDownwardOutlined,
    BlockOutlined, DoneAllOutlined,
    FlagOutlined, PersonOutlined, ScoreboardOutlined,
    AttachMoneyOutlined, ChevronRightOutlined,
    HourglassEmptyOutlined, CheckCircleOutlineOutlined,
    CancelOutlined, PendingActionsOutlined
} from '@mui/icons-material';
import KPISheet from './KPISheet';
import './kpi.scss';

// ═══════════════════════════════════════════════════════════════
// NEW DESIGN SYSTEM – Fresh, modern & attractive palette
// ═══════════════════════════════════════════════════════════════
const DS = {
    primary:   '#2D3A54',      // refined navy – still authoritative but softer
    secondary: '#4F5D75',
    accent:    '#5B8DEF',      // friendly electric blue
    accentLight:'#EBF2FF',
    success:   '#1B998B',      // teal green – more modern
    successBg: '#E6F7F5',
    warning:   '#F0A500',      // warm amber
    warningBg: '#FFF8EB',
    danger:    '#E15554',      // soft red
    dangerBg:  '#FDEDEE',
    surface:   '#FFFFFF',
    bg:        '#F4F6FA',      // light cool gray
    text:      '#1E293B',
    textSec:   '#64748B',
    textMute:  '#94A3B8',
    border:    '#E2E8F0',
};

// Quadrant colours – keep distinct, but softer & more pleasant
const QUADRANTS = {
    Star:       { label: 'Star',       emoji: '★', color: '#E9B741', bg: '#FFF7E6', border: '#F7D774', desc: 'High Volume + High Complexity',   action: 'Promote / Empower' },
    Engine:     { label: 'Engine',     emoji: '⚙', color: '#4D96FF', bg: '#EDF3FF', border: '#A3C6FF', desc: 'High Volume + Low Complexity',    action: 'Automate / Standardise' },
    Specialist: { label: 'Specialist', emoji: '◆', color: '#9B5DE5', bg: '#F5F0FF', border: '#C8B3F5', desc: 'Low Volume + High Complexity',    action: 'Protect / Consult' },
    Drainer:    { label: 'Drainer',    emoji: '▲', color: '#EC7063', bg: '#FEF2F1', border: '#F5B7B1', desc: 'Low Volume + Low Complexity',     action: 'Retrain / Review' },
};

const STATUS_PALETTE = {
    Red:    { color: '#E15554', bg: '#FDEDEE', border: '#F5B7B1', label: 'Red' },
    Amber:  { color: '#F0A500', bg: '#FFF8EB', border: '#FDE4A8', label: 'Amber' },
    Green:  { color: '#1B998B', bg: '#E6F7F5', border: '#8DD3CC', label: 'Green' },
};

const TAB_CONFIG = [
    { key: 'overview',      label: 'Executive Overview',  icon: <DashboardOutlined fontSize="small" /> },
    { key: 'matrix',        label: 'Performance Matrix',  icon: <AssessmentOutlined fontSize="small" /> },
    { key: 'teams',         label: 'Team Analytics',      icon: <GroupsOutlined fontSize="small" /> },
    { key: 'blockers',      label: 'Blockers',            icon: <BlockOutlined fontSize="small" /> },
    { key: 'losses',        label: 'Business Losses',     icon: <AttachMoneyOutlined fontSize="small" /> },
    { key: 'openpoints',    label: 'Open Points',         icon: <FlagOutlined fontSize="small" /> },
    { key: 'nonsubmitters', label: 'Non Submitters',      icon: <HourglassEmptyOutlined fontSize="small" /> },
];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ───── unchanged helpers ─────
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

// ═══════════════════════════════════════════════════════════════
// MINI COMPONENTS (unchanged, but use DS automatically)
// ═══════════════════════════════════════════════════════════════
const KpiCard = ({ title, value, subtext, icon, color = DS.accent, onClick }) => (
    <Card onClick={onClick} sx={{ borderRadius: 3, border: `1px solid ${DS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', height: '100%', cursor: onClick ? 'pointer' : 'default', transition: 'all 0.25s', '&:hover': onClick ? { transform: 'translateY(-3px)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', borderColor: color + '40' } : {} }}>
        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: DS.textMute, textTransform: 'uppercase', letterSpacing: 1.2, fontSize: '0.68rem' }}>{title}</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: DS.text, mt: 1, fontSize: '1.9rem', letterSpacing: '-0.03em' }}>{value}</Typography>
                    {subtext && <Typography variant="caption" sx={{ color: DS.textSec, mt: 0.5, display: 'block', fontSize: '0.78rem' }}>{subtext}</Typography>}
                </Box>
                <Box sx={{ width: 44, height: 44, borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}12`, color }}>
                    {icon}
                </Box>
            </Stack>
        </CardContent>
    </Card>
);

const SectionHeader = ({ title, subtitle, action }) => (
    <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mb: 3 }}>
        <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: DS.primary, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>{title}</Typography>
            {subtitle && <Typography variant="body2" sx={{ color: DS.textMute, mt: 0.3, fontSize: '0.8rem' }}>{subtitle}</Typography>}
        </Box>
        {action}
    </Stack>
);

const QuadrantBadge = ({ quadrant }) => {
    const q = QUADRANTS[quadrant] || QUADRANTS.Drainer;
    return <Chip size="small" label={q.label} sx={{ fontWeight: 700, background: q.bg, color: q.color, border: `1px solid ${q.border}`, fontSize: '0.68rem', height: 24 }} />;
};

const StatusDot = ({ color }) => <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />;

const CustomScatterTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const d = payload[0].payload;
        const q = QUADRANTS[d.quadrant] || QUADRANTS.Drainer;
        return (
            <Box sx={{ background: 'rgba(45,58,84,0.96)', backdropFilter: 'blur(10px)', p: 2.5, borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', color: '#fff', minWidth: 200, boxShadow: '0 24px 48px rgba(0,0,0,0.35)' }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5, pb: 1, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <StatusDot color={q.color} />
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{d.name}</Typography>
                </Stack>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, fontSize: '0.78rem' }}>
                    <Typography sx={{ color: '#94A3B8' }}>Volume</Typography><Typography sx={{ fontWeight: 600, textAlign: 'right' }}>{d.x}</Typography>
                    <Typography sx={{ color: '#94A3B8' }}>Complexity</Typography><Typography sx={{ fontWeight: 600, textAlign: 'right' }}>{d.y.toFixed(2)}</Typography>
                    <Typography sx={{ color: '#94A3B8' }}>Score</Typography><Typography sx={{ fontWeight: 800, textAlign: 'right', color: q.color }}>{d.totalValueScore}</Typography>
                </Box>
                <Box sx={{ mt: 1.5, px: 1.5, py: 0.5, background: 'rgba(255,255,255,0.08)', borderRadius: 1, textAlign: 'center', fontSize: '0.68rem', fontWeight: 600 }}>{q.label} • {q.action}</Box>
            </Box>
        );
    }
    return null;
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT (unchanged logic, updated styling where needed)
// ═══════════════════════════════════════════════════════════════
const KPIPulseDashboard = () => {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();

    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
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

    // ─── Access Control ─────────────────────────────────────────
    if (user?.role !== 'Admin' && user?.role !== 'Head_of_Department') {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: DS.bg, flexDirection: 'column', gap: 3, p: 4 }}>
                <Typography sx={{ fontSize: '3.5rem' }}>🔐</Typography>
                <Typography variant="h3" sx={{ fontWeight: 800, color: DS.primary }}>Access Restricted</Typography>
                <Typography sx={{ color: DS.textSec, maxWidth: 450, textAlign: 'center' }}>This terminal is reserved for Executive Management and Department Heads.</Typography>
                <button onClick={() => navigate('/kpi')} style={{ padding: '10px 28px', borderRadius: 2.5, border: 'none', background: DS.primary, color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Return to Personnel HQ</button>
            </Box>
        );
    }

    return (
        <Box sx={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: DS.bg, color: DS.text, minHeight: '100vh' }}>
            {/* ═══ CORPORATE HEADER ═══ */}
            <Paper elevation={0} sx={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: `1px solid ${DS.border}`, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', px: { xs: 2, md: 4, lg: 6 }, py: 2.5 }}>
                <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', lg: 'center' }} spacing={2}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Box sx={{ width: 48, height: 48, borderRadius: 2.5, background: DS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            <ScoreboardOutlined />
                        </Box>
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: DS.primary, letterSpacing: '-0.02em', fontSize: '1.4rem', lineHeight: 1.2 }}>CEO Pulse Dashboard</Typography>
                            <Typography variant="body2" sx={{ color: DS.textMute, fontSize: '0.8rem' }}>Strategic Command Center — Performance, Blockers & Accountability</Typography>
                        </Box>
                    </Stack>

                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                        <TextField select size="small" value={month} onChange={e => setMonth(Number(e.target.value))}
                            sx={{ minWidth: 130, '& .MuiOutlinedInput-root': { borderRadius: 2, background: '#fff', fontWeight: 600, fontSize: '0.82rem', borderColor: DS.border } }}>
                            {MONTHS.map((m, i) => <MenuItem key={i} value={i + 1}>{m}</MenuItem>)}
                        </TextField>
                        <TextField select size="small" value={year} onChange={e => setYear(Number(e.target.value))}
                            sx={{ minWidth: 100, '& .MuiOutlinedInput-root': { borderRadius: 2, background: '#fff', fontWeight: 600, fontSize: '0.82rem' } }}>
                            {[2024, 2025, 2026].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                        </TextField>
                        <TextField select size="small" value={team || 'ALL'} onChange={e => { const v = e.target.value; setTeam(v === 'ALL' ? '' : v); setDepartment(''); }}
                            sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: 2, background: '#fff', fontWeight: 600, fontSize: '0.82rem' } }}>
                            <MenuItem value="ALL">All Teams</MenuItem>
                            {teams.map(t => <MenuItem key={t._id} value={t.name}>{t.name}</MenuItem>)}
                        </TextField>
                        <IconButton onClick={() => navigate('/kpi/admin')} sx={{ background: DS.primary, color: '#fff', borderRadius: 2, width: 40, height: 40, '&:hover': { background: DS.secondary } }}>
                            <AdminPanelSettingsOutlined fontSize="small" />
                        </IconButton>
                    </Stack>
                </Stack>

                <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} textColor="primary" indicatorColor="transparent"
                    sx={{ mt: 2.5, '& .MuiTabs-flexContainer': { gap: 0.5 } }}>
                    {TAB_CONFIG.map(t => (
                        <Tab key={t.key} value={t.key} label={
                            <Stack direction="row" alignItems="center" spacing={0.8}>
                                {t.icon}
                                <Typography sx={{ fontWeight: activeTab === t.key ? 700 : 600, fontSize: '0.78rem', textTransform: 'none' }}>{t.label}</Typography>
                            </Stack>
                        } sx={{ textTransform: 'none', minHeight: 38, px: 2, py: 0.75, borderRadius: 2, color: DS.textSec, '&.Mui-selected': { background: DS.accentLight, color: DS.accent } }} />
                    ))}
                </Tabs>
            </Paper>

            {/* ═══ CONTENT ═══ */}
            <Box sx={{ px: { xs: 2, md: 4, lg: 6 }, py: 4 }}>
                <AnimatePresence mode="wait">
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>

                        {/* ─────────────────────────────────────────── TAB: OVERVIEW ── */}
                        {activeTab === 'overview' && (
                            <Stack spacing={4}>
                                <Grid container spacing={2}>
                                    <Grid item xs={6} md={4} lg={2}><KpiCard title="Personnel" value={dashboardStats.totalFiltered} subtext={`of ${data.stats.totalUsers} org-wide`} icon={<PersonOutlined />} color={DS.accent} /></Grid>
                                    <Grid item xs={6} md={4} lg={2}><KpiCard title="Avg Score" value={avgScore} subtext="Mean value score" icon={<ScoreboardOutlined />} color={DS.secondary} /></Grid>
                                    <Grid item xs={6} md={4} lg={2}><KpiCard title="Business Loss" value={formatCurrency(totalLoss)} subtext={`${reportData.records?.filter(r=>r.businessLoss>0).length || 0} cases`} icon={<AttachMoneyOutlined />} color={DS.danger} /></Grid>
                                    <Grid item xs={6} md={4} lg={2}><KpiCard title="Blockers" value={totalBlockers} subtext={`${reportData.stats?.blockerDistribution?.length || 0} categories`} icon={<BlockOutlined />} color={DS.warning} /></Grid>
                                    <Grid item xs={6} md={4} lg={2}><KpiCard title="Submitters" value={`${nonSubmitterData.stats?.submissionRate || 0}%`} subtext={`${nonSubmitterData.stats?.submitted || 0} of ${nonSubmitterData.stats?.total || 0}`} icon={<CheckCircleOutlineOutlined />} color={DS.success} /></Grid>
                                    <Grid item xs={6} md={4} lg={2}><KpiCard title="Non Submitters" value={nonSubmitterData.stats?.nonSubmitted || 0} subtext="Require follow-up" icon={<HourglassEmptyOutlined />} color="#64748B" onClick={() => setActiveTab('nonsubmitters')} /></Grid>
                                </Grid>

                                <Grid container spacing={3}>
                                    <Grid item xs={12} lg={8}>
                                        <Card sx={{ borderRadius: 3, border: `1px solid ${DS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                            <CardContent sx={{ p: 3 }}>
                                                <SectionHeader title="Team Performance" subtitle="Aggregated KPI metrics per team" />
                                                <Grid container spacing={2}>
                                                    {teamStats.slice(0, 4).map(t => (
                                                        <Grid item xs={12} sm={6} key={t.name}>
                                                            <Card onClick={() => setTeamDrawer({ open: true, teamData: t })}
                                                                sx={{ borderRadius: 2.5, border: `1px solid ${DS.border}`, cursor: 'pointer', transition: 'all 0.2s', '&:hover': { borderColor: DS.accent + '60', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' } }}>
                                                                <CardContent sx={{ p: 2 }}>
                                                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                                                                        <Typography sx={{ fontWeight: 800, color: DS.primary, fontSize: '0.95rem' }}>{t.name}</Typography>
                                                                        <Chip size="small" label={`Avg ${t.avgScore}`} sx={{ fontWeight: 700, background: DS.accentLight, color: DS.accent, fontSize: '0.7rem' }} />
                                                                    </Stack>
                                                                    <Stack spacing={0.8}>
                                                                        {[{k:'stars',l:'Stars',c:QUADRANTS.Star.color,v:t.stars},{k:'engines',l:'Engines',c:QUADRANTS.Engine.color,v:t.engines},{k:'specialists',l:'Specialists',c:QUADRANTS.Specialist.color,v:t.specialists},{k:'drainers',l:'Drainers',c:QUADRANTS.Drainer.color,v:t.drainers}].map(item => (
                                                                            <Stack key={item.k} direction="row" alignItems="center" spacing={1}>
                                                                                <StatusDot color={item.c} />
                                                                                <Typography variant="caption" sx={{ color: DS.textSec, flex: 1 }}>{item.l}</Typography>
                                                                                <Typography variant="caption" sx={{ fontWeight: 700, color: DS.text }}>{item.v}</Typography>
                                                                                <LinearProgress variant="determinate" value={t.memberCount ? (item.v/t.memberCount)*100 : 0} sx={{ width: 50, height: 4, borderRadius: 2, backgroundColor: '#F1F5F9', '& .MuiLinearProgress-bar': { backgroundColor: item.c, borderRadius: 2 } }} />
                                                                            </Stack>
                                                                        ))}
                                                                    </Stack>
                                                                    <Divider sx={{ my: 1.5 }} />
                                                                    <Stack direction="row" justifyContent="space-between">
                                                                        <Typography variant="caption" sx={{ color: DS.textMute }}>{t.memberCount} Members</Typography>
                                                                        {t.totalLoss > 0 && <Typography variant="caption" sx={{ fontWeight: 700, color: DS.danger }}>{formatCurrency(t.totalLoss)}</Typography>}
                                                                    </Stack>
                                                                </CardContent>
                                                            </Card>
                                                        </Grid>
                                                    ))}
                                                </Grid>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={12} lg={4}>
                                        <Stack spacing={2}>
                                            <Card sx={{ borderRadius: 3, border: `1px solid ${DS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                                <CardContent sx={{ p: 3 }}>
                                                    <SectionHeader title="Rising Stars" subtitle="Top momentum performers" />
                                                    <Stack spacing={1}>
                                                        {filteredData.filter(p => (p.current?.quadrant === 'Star') || (p.delta?.qty_change_percent > 20)).sort((a,b) => (b.current?.total_value_score || 0) - (a.current?.total_value_score || 0)).slice(0, 5).map((item, i) => {
                                                            const q = QUADRANTS[item.current?.quadrant || 'Drainer'];
                                                            return (
                                                                <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{ p: 1.5, borderRadius: 2, background: q.bg, border: `1px solid ${q.border}`, cursor: 'pointer' }} onClick={() => item.current?.sheetId && setSelectedSheetId(item.current.sheetId)}>
                                                                    <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', fontWeight: 700, background: '#fff', color: q.color, border: `1px solid ${q.border}` }}>{initials(item.user?.first_name, item.user?.last_name)}</Avatar>
                                                                    <Box sx={{ flex: 1 }}>
                                                                        <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: DS.text }}>{item.user?.first_name} {item.user?.last_name}</Typography>
                                                                        <Typography sx={{ fontSize: '0.7rem', color: DS.textMute }}>{item.team || item.department}</Typography>
                                                                    </Box>
                                                                    <Chip size="small" label={item.current?.total_value_score} sx={{ fontWeight: 800, background: '#fff', border: `1px solid ${DS.border}`, fontSize: '0.72rem' }} />
                                                                </Stack>
                                                            );
                                                        })}
                                                    </Stack>
                                                </CardContent>
                                            </Card>
                                            <Card sx={{ borderRadius: 3, border: `1px solid ${DS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                                <CardContent sx={{ p: 3 }}>
                                                    <SectionHeader title="Concern Areas" subtitle="Require CEO attention" />
                                                    <Stack spacing={1}>
                                                        {filteredData.filter(p => (p.current?.quadrant === 'Drainer') || (p.delta?.qty_change_percent < -15)).slice(0, 5).map((item, i) => {
                                                            const declining = (item.delta?.qty_change_percent || 0) < -15;
                                                            return (
                                                                <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{ p: 1.5, borderRadius: 2, background: declining ? DS.dangerBg : '#FAFAFA', border: `1px solid ${declining ? DS.danger+'30' : DS.border}`, cursor: 'pointer' }} onClick={() => item.current?.sheetId && setSelectedSheetId(item.current.sheetId)}>
                                                                    <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', fontWeight: 700, background: '#fff', color: DS.text, border: `1px solid ${DS.border}` }}>{initials(item.user?.first_name, item.user?.last_name)}</Avatar>
                                                                    <Box sx={{ flex: 1 }}>
                                                                        <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: DS.text }}>{item.user?.first_name} {item.user?.last_name}</Typography>
                                                                        <Typography sx={{ fontSize: '0.7rem', color: DS.textMute }}>{item.team || item.department}</Typography>
                                                                    </Box>
                                                                    {declining && <Chip size="small" icon={<TrendingDownOutlined sx={{fontSize:12}}/>} label={`${item.delta.qty_change_percent}%`} sx={{ fontWeight: 700, background: DS.dangerBg, color: DS.danger, fontSize: '0.68rem' }} />}
                                                                    <QuadrantBadge quadrant={item.current?.quadrant} />
                                                                </Stack>
                                                            );
                                                        })}
                                                    </Stack>
                                                </CardContent>
                                            </Card>
                                        </Stack>
                                    </Grid>
                                </Grid>
                            </Stack>
                        )}

                        {/* ─────────────────────────────────────────── TAB: MATRIX ── */}
                        {activeTab === 'matrix' && (
                            <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
                                <Paper sx={{ width: { xs: '100%', lg: 320 }, borderRadius: 3, border: `1px solid ${DS.border}`, flexShrink: 0, maxHeight: 'calc(100vh - 200px)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                    <Box sx={{ p: 2.5, borderBottom: `1px solid ${DS.border}` }}>
                                        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                                            <GroupsOutlined sx={{ color: DS.accent, fontSize: 20 }} />
                                            <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: DS.primary }}>Personnel</Typography>
                                        </Stack>
                                        <TextField fullWidth size="small" placeholder="Search members..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined sx={{ color: DS.textMute, fontSize: 18 }} /></InputAdornment> }}
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, background: DS.bg, fontSize: '0.82rem' } }} />
                                    </Box>
                                    <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
                                        {filteredData.length > 0 ? filteredData.map((item, i) => {
                                            const q = QUADRANTS[item.current?.quadrant || 'Drainer'];
                                            const isActive = selectedSheetId === item.current?.sheetId;
                                            return (
                                                <Box key={i} onClick={() => item.current?.sheetId && setSelectedSheetId(item.current.sheetId)}
                                                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, cursor: 'pointer', background: isActive ? DS.accentLight : 'transparent', border: '1px solid', borderColor: isActive ? DS.accent+'30' : 'transparent', mb: 0.5, transition: 'all 0.15s', '&:hover': { background: DS.bg } }}>
                                                    <Avatar sx={{ width: 34, height: 34, fontSize: '0.78rem', fontWeight: 700, background: q.bg, color: q.color, border: `1px solid ${q.border}` }}>
                                                        {initials(item.user?.first_name, item.user?.last_name)}
                                                    </Avatar>
                                                    <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                                        <Typography noWrap sx={{ fontWeight: 600, fontSize: '0.82rem', color: DS.text }}>{item.user?.first_name} {item.user?.last_name}</Typography>
                                                        <Typography noWrap sx={{ fontSize: '0.72rem', color: DS.textMute }}><span style={{ color: q.color, fontWeight: 600 }}>{q.label}</span> • {item.team || item.department}</Typography>
                                                    </Box>
                                                    <Chip size="small" label={item.current?.total_value_score || 0} sx={{ fontWeight: 800, fontSize: '0.72rem', background: '#fff', border: `1px solid ${DS.border}` }} />
                                                </Box>
                                            );
                                        }) : (
                                            <Box sx={{ p: 4, textAlign: 'center', color: DS.textMute }}><Typography variant="body2">No members found.</Typography></Box>
                                        )}
                                    </Box>
                                </Paper>

                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Grid container spacing={3}>
                                        <Grid item xs={12} xl={8}>
                                            <Card sx={{ borderRadius: 3, border: `1px solid ${DS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                                <CardContent sx={{ p: 3 }}>
                                                    <SectionHeader title="Performance Matrix" subtitle="Volume vs Complexity quadrant analysis" />
                                                    <Box sx={{ height: 420 }}>
                                                        {loading ? (
                                                            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
                                                                <Box sx={{ width: 28, height: 28, border: '3px solid #E2E8F0', borderTopColor: DS.accent, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                                                <Typography variant="body2" sx={{ color: DS.textMute, fontWeight: 600 }}>Syncing Analytics...</Typography>
                                                            </Box>
                                                        ) : (
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
                                                                    <CartesianGrid strokeDasharray="4 4" stroke="#F1F5F9" />
                                                                    <XAxis type="number" dataKey="x" name="Volume" domain={[0, 'dataMax + 20']} tick={{ fontSize: 11, fill: DS.textMute }} axisLine={{ stroke: DS.border }} tickLine={{ stroke: DS.border }} />
                                                                    <YAxis type="number" dataKey="y" name="Complexity" domain={[0, 5.5]} tick={{ fontSize: 11, fill: DS.textMute }} axisLine={{ stroke: DS.border }} tickLine={{ stroke: DS.border }} />
                                                                    <ZAxis type="number" dataKey="z" range={[80, 600]} />
                                                                    <ReTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#94A3B8' }} />
                                                                    <ReferenceLine x={100} stroke="#CBD5E1" strokeDasharray="4 4" strokeWidth={1.5} />
                                                                    <ReferenceLine y={3.0} stroke="#CBD5E1" strokeDasharray="4 4" strokeWidth={1.5} />
                                                                    <Scatter name="Teams" data={scatterData}>
                                                                        {scatterData.map((entry, index) => (
                                                                            <Cell key={`cell-${index}`} fill={entry.color} opacity={0.9} stroke="#FFFFFF" strokeWidth={2} />
                                                                        ))}
                                                                    </Scatter>
                                                                </ScatterChart>
                                                            </ResponsiveContainer>
                                                        )}
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                        <Grid item xs={12} xl={4}>
                                            <Card sx={{ borderRadius: 3, border: `1px solid ${DS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', height: '100%' }}>
                                                <CardContent sx={{ p: 3 }}>
                                                    <SectionHeader title="Distribution" subtitle="Quadrant breakdown" />
                                                    <Stack spacing={2}>
                                                        {Object.entries(QUADRANTS).map(([key, q]) => {
                                                            const count = dashboardStats[key.toLowerCase() + 's'] || 0;
                                                            const pct = dashboardStats.totalFiltered > 0 ? Math.round((count / dashboardStats.totalFiltered) * 100) : 0;
                                                            return (
                                                                <Box key={key} sx={{ p: 2, borderRadius: 2, background: q.bg, border: `1px solid ${q.border}` }}>
                                                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                                                        <Stack direction="row" alignItems="center" spacing={1}>
                                                                            <Typography sx={{ fontSize: '0.85rem' }}>{q.emoji}</Typography>
                                                                            <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: DS.text }}>{q.label}</Typography>
                                                                        </Stack>
                                                                        <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: q.color }}>{count}</Typography>
                                                                    </Stack>
                                                                    <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)', '& .MuiLinearProgress-bar': { backgroundColor: q.color, borderRadius: 3 } }} />
                                                                    <Typography sx={{ mt: 0.5, fontSize: '0.65rem', fontWeight: 700, color: DS.textMute, textAlign: 'right', textTransform: 'uppercase' }}>{pct}% of view</Typography>
                                                                </Box>
                                                            );
                                                        })}
                                                    </Stack>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Card sx={{ borderRadius: 3, border: `1px solid ${DS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                                <CardContent sx={{ p: 3 }}>
                                                    <SectionHeader title="Personnel Trajectories" subtitle="Month-over-month movement & delta insights" />
                                                    <Grid container spacing={2}>
                                                        {filteredData.slice(0, 8).map((item, i) => {
                                                            const insight = item.delta?.insight || 'Stable Performance';
                                                            const q = QUADRANTS[item.current?.quadrant || 'Drainer'];
                                                            return (
                                                                <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                                                                    <Card onClick={() => item.current?.sheetId && setSelectedSheetId(item.current.sheetId)}
                                                                        sx={{ borderRadius: 2.5, border: `1px solid ${DS.border}`, background: '#FAFAFA', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(0,0,0,0.06)', borderColor: '#CBD5E1' } }}>
                                                                        <CardContent sx={{ p: 2 }}>
                                                                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                                                                <Box>
                                                                                    <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: DS.text }}>{item.user?.first_name} {item.user?.last_name}</Typography>
                                                                                    <Typography sx={{ fontSize: '0.7rem', color: DS.textMute }}>{item.team || item.department}</Typography>
                                                                                </Box>
                                                                                <QuadrantBadge quadrant={item.current?.quadrant} />
                                                                            </Stack>
                                                                            <Box sx={{ fontSize: '0.75rem', fontWeight: 500, color: DS.textSec, background: '#F1F5F9', p: 1, borderRadius: 1.5, mb: 1.5, lineHeight: 1.3 }}>{insight}</Box>
                                                                            <Stack direction="row" spacing={2}>
                                                                                <Box sx={{ flex: 1 }}>
                                                                                    <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: DS.textMute, textTransform: 'uppercase' }}>Score</Typography>
                                                                                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: DS.text }}>{item.current?.total_value_score}</Typography>
                                                                                </Box>
                                                                                <Box sx={{ flex: 1 }}>
                                                                                    <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: DS.textMute, textTransform: 'uppercase' }}>Qty Δ</Typography>
                                                                                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: (item.delta?.qty_change_percent || 0) > 0 ? DS.success : (item.delta?.qty_change_percent || 0) < 0 ? DS.danger : DS.textMute }}>
                                                                                        {(item.delta?.qty_change_percent || 0) > 0 ? '+' : ''}{item.delta?.qty_change_percent}%
                                                                                    </Typography>
                                                                                </Box>
                                                                            </Stack>
                                                                        </CardContent>
                                                                    </Card>
                                                                </Grid>
                                                            );
                                                        })}
                                                    </Grid>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    </Grid>
                                </Box>
                            </Box>
                        )}

                        {/* ─────────────────────────────────────────── TAB: TEAMS ── */}
                        {activeTab === 'teams' && (
                            <Stack spacing={4}>
                                <Grid container spacing={2}>
                                    {teamStats.map(t => (
                                        <Grid item xs={12} md={6} lg={4} key={t.name}>
                                            <Card onClick={() => setTeamDrawer({ open: true, teamData: t })}
                                                sx={{ borderRadius: 3, border: `1px solid ${DS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'all 0.25s', '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 28px rgba(0,0,0,0.08)', borderColor: DS.accent+'50' } }}>
                                                <CardContent sx={{ p: 3 }}>
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                                                        <Typography variant="h6" sx={{ fontWeight: 800, color: DS.primary, fontSize: '1rem' }}>{t.name}</Typography>
                                                        <Chip label={`Avg ${t.avgScore}`} sx={{ fontWeight: 700, background: DS.accentLight, color: DS.accent, fontSize: '0.72rem' }} />
                                                    </Stack>
                                                    <Grid container spacing={1.5} mb={2}>
                                                        {[{k:'stars',l:'Stars',c:QUADRANTS.Star.color,v:t.stars},{k:'engines',l:'Engines',c:QUADRANTS.Engine.color,v:t.engines},{k:'specialists',l:'Specialists',c:QUADRANTS.Specialist.color,v:t.specialists},{k:'drainers',l:'Drainers',c:QUADRANTS.Drainer.color,v:t.drainers}].map(item => (
                                                            <Grid item xs={3} key={item.k}>
                                                                <Box sx={{ textAlign: 'center', p: 1, borderRadius: 2, background: item.c+'10', border: '1px solid ' + item.c + '20' }}>
                                                                    <Typography sx={{ fontWeight: 800, color: item.c, fontSize: '1rem' }}>{item.v}</Typography>
                                                                    <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, color: DS.textMute, textTransform: 'uppercase' }}>{item.l}</Typography>
                                                                </Box>
                                                            </Grid>
                                                        ))}
                                                    </Grid>
                                                    <Stack spacing={0.8}>
                                                        <Stack direction="row" justifyContent="space-between"><Typography variant="caption" sx={{ color: DS.textMute }}>Members</Typography><Typography variant="caption" sx={{ fontWeight: 700, color: DS.text }}>{t.memberCount}</Typography></Stack>
                                                        <Stack direction="row" justifyContent="space-between"><Typography variant="caption" sx={{ color: DS.textMute }}>Submission Rate</Typography><Typography variant="caption" sx={{ fontWeight: 700, color: t.submissionRate >= 90 ? DS.success : t.submissionRate >= 70 ? DS.warning : DS.danger }}>{t.submissionRate}%</Typography></Stack>
                                                        {t.totalLoss > 0 && <Stack direction="row" justifyContent="space-between"><Typography variant="caption" sx={{ color: DS.textMute }}>Business Loss</Typography><Typography variant="caption" sx={{ fontWeight: 700, color: DS.danger }}>{formatCurrency(t.totalLoss)}</Typography></Stack>}
                                                        {t.totalBlockers > 0 && <Stack direction="row" justifyContent="space-between"><Typography variant="caption" sx={{ color: DS.textMute }}>Blockers</Typography><Typography variant="caption" sx={{ fontWeight: 700, color: DS.warning }}>{t.totalBlockers}</Typography></Stack>}
                                                        {t.nonSubmitters > 0 && <Stack direction="row" justifyContent="space-between"><Typography variant="caption" sx={{ color: DS.textMute }}>Non Submitters</Typography><Typography variant="caption" sx={{ fontWeight: 700, color: DS.danger }}>{t.nonSubmitters}</Typography></Stack>}
                                                    </Stack>
                                                    <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${DS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, color: DS.accent, fontSize: '0.78rem', fontWeight: 700 }}>
                                                        View Team Members <ChevronRightOutlined sx={{ fontSize: 16 }} />
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                    {teamStats.length === 0 && (
                                        <Grid item xs={12}>
                                            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, color: DS.textMute }}>No team analytics available for this period.</Paper>
                                        </Grid>
                                    )}
                                </Grid>

                                {teamStats.length > 0 && (
                                    <Card sx={{ borderRadius: 3, border: `1px solid ${DS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <SectionHeader title="Team Comparison" subtitle="Side-by-side performance metrics" />
                                            <TableContainer>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow sx={{ '& th': { fontWeight: 700, color: DS.textMute, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 1, borderBottom: '2px solid ' + DS.border, py: 1.5 } }}>
                                                            <TableCell>Team</TableCell>
                                                            <TableCell align="center">Members</TableCell>
                                                            <TableCell align="center">Avg Score</TableCell>
                                                            <TableCell align="center">Stars</TableCell>
                                                            <TableCell align="center">Engines</TableCell>
                                                            <TableCell align="center">Specialists</TableCell>
                                                            <TableCell align="center">Drainers</TableCell>
                                                            <TableCell align="center">Submit Rate</TableCell>
                                                            <TableCell align="right">Loss</TableCell>
                                                            <TableCell align="right">Blockers</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {teamStats.map((t, i) => (
                                                            <TableRow key={i} onClick={() => setTeamDrawer({ open: true, teamData: t })} sx={{ '& td': { py: 1.5, borderBottom: '1px solid rgba(226,232,240,0.4)', cursor: 'pointer' }, '&:hover': { background: DS.accentLight } }}>
                                                                <TableCell><Typography sx={{ fontWeight: 700, color: DS.primary, fontSize: '0.82rem' }}>{t.name}</Typography></TableCell>
                                                                <TableCell align="center">{t.memberCount}</TableCell>
                                                                <TableCell align="center"><Chip size="small" label={t.avgScore} sx={{ fontWeight: 800, background: DS.accentLight, color: DS.accent }} /></TableCell>
                                                                <TableCell align="center" sx={{ color: QUADRANTS.Star.color, fontWeight: 700 }}>{t.stars}</TableCell>
                                                                <TableCell align="center" sx={{ color: QUADRANTS.Engine.color, fontWeight: 700 }}>{t.engines}</TableCell>
                                                                <TableCell align="center" sx={{ color: QUADRANTS.Specialist.color, fontWeight: 700 }}>{t.specialists}</TableCell>
                                                                <TableCell align="center" sx={{ color: QUADRANTS.Drainer.color, fontWeight: 700 }}>{t.drainers}</TableCell>
                                                                <TableCell align="center" sx={{ color: t.submissionRate >= 90 ? DS.success : t.submissionRate >= 70 ? DS.warning : DS.danger, fontWeight: 700 }}>{t.submissionRate}%</TableCell>
                                                                <TableCell align="right" sx={{ color: t.totalLoss > 0 ? DS.danger : DS.textMute, fontWeight: 700 }}>{formatCurrency(t.totalLoss)}</TableCell>
                                                                <TableCell align="right" sx={{ color: t.totalBlockers > 0 ? DS.warning : DS.textMute, fontWeight: 700 }}>{t.totalBlockers}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </CardContent>
                                    </Card>
                                )}
                            </Stack>
                        )}

                        {/* ─────────────────────────────────────────── TAB: BLOCKERS ── */}
                        {activeTab === 'blockers' && (
                            <Stack spacing={4}>
                                <Card sx={{ borderRadius: 3, border: '1px solid ' + DS.warning + '30', background: 'linear-gradient(135deg, ' + DS.warningBg + ' 0%, #FFF7ED 100%)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" spacing={3}>
                                            <Stack direction="row" alignItems="center" spacing={2}>
                                                <Box sx={{ width: 56, height: 56, borderRadius: 3, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: DS.warning }}>
                                                    <BlockOutlined sx={{ fontSize: 28 }} />
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#B45309', textTransform: 'uppercase', letterSpacing: 1 }}>Total Blockers Reported</Typography>
                                                    <Typography variant="h3" sx={{ fontWeight: 800, color: DS.warning, letterSpacing: '-0.02em' }}>{totalBlockers}</Typography>
                                                </Box>
                                            </Stack>
                                            <Stack direction="row" spacing={4}>
                                                <Box sx={{ textAlign: 'center' }}><Typography variant="h5" sx={{ fontWeight: 800, color: DS.text }}>{reportData.stats?.blockerDistribution?.length || 0}</Typography><Typography variant="caption" sx={{ color: DS.textMute, fontWeight: 600 }}>Categories</Typography></Box>
                                                <Box sx={{ textAlign: 'center' }}><Typography variant="h5" sx={{ fontWeight: 800, color: DS.text }}>{reportData.records?.filter(r => r.blocker).length || 0}</Typography><Typography variant="caption" sx={{ color: DS.textMute, fontWeight: 600 }}>Personnel Affected</Typography></Box>
                                                <Box sx={{ textAlign: 'center' }}><Typography variant="h5" sx={{ fontWeight: 800, color: DS.text }}>{reportData.records?.length || 0}</Typography><Typography variant="caption" sx={{ color: DS.textMute, fontWeight: 600 }}>Total Cases</Typography></Box>
                                            </Stack>
                                        </Stack>
                                    </CardContent>
                                </Card>

                                <Grid container spacing={3}>
                                    <Grid item xs={12} lg={6}>
                                        <Card sx={{ borderRadius: 3, border: `1px solid ${DS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                            <CardContent sx={{ p: 3 }}>
                                                <SectionHeader title="Blocker Distribution" subtitle="By category frequency" />
                                                <Box sx={{ height: 320 }}>
                                                    {blockerChartData.length > 0 ? (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={blockerChartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                                                                <XAxis type="number" tick={{ fontSize: 11, fill: DS.textMute }} axisLine={{ stroke: DS.border }} />
                                                                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: DS.textMute }} width={120} axisLine={{ stroke: DS.border }} />
                                                                <ReTooltip contentStyle={{ borderRadius: 12, border: `1px solid ${DS.border}`, fontSize: '0.8rem' }} />
                                                                <Bar dataKey="count" fill={DS.warning} radius={[0, 6, 6, 0]} barSize={24} />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    ) : (
                                                        <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: DS.textMute }}><Typography>No blocker data.</Typography></Box>
                                                    )}
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={12} lg={6}>
                                        <Card sx={{ borderRadius: 3, border: `1px solid ${DS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                            <CardContent sx={{ p: 3 }}>
                                                <SectionHeader title="Highest Registered Blockers" subtitle="Ranked by report volume" />
                                                <Stack spacing={1.5}>
                                                    {(reportData.stats?.blockerDistribution || []).slice(0, 6).map((stat, i) => (
                                                        <Box key={i} sx={{ p: 2, borderRadius: 2, background: i === 0 ? '#FFF8EB' : DS.bg, border: `1px solid ${i === 0 ? '#FDE4A8' : DS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <Box>
                                                                <Typography variant="caption" sx={{ fontWeight: 700, color: i === 0 ? '#B45309' : DS.textMute, textTransform: 'uppercase' }}>{i === 0 ? '🔥 Top Blocker' : `Rank #${i + 1}`}</Typography>
                                                                <Typography variant="body2" sx={{ fontWeight: 800, color: DS.text, mt: 0.3 }}>{stat.category}</Typography>
                                                            </Box>
                                                            <Chip label={`${stat.count} Reports`} sx={{ fontWeight: 700, background: i === 0 ? '#FFF0C4' : '#F1F5F9', color: i === 0 ? '#B45309' : DS.textSec }} />
                                                        </Box>
                                                    ))}
                                                    {(reportData.stats?.blockerDistribution || []).length === 0 && (
                                                        <Box sx={{ p: 4, textAlign: 'center', color: DS.textMute }}><BlockOutlined sx={{ fontSize: 40, mb: 1, opacity: 0.4 }} /><Typography variant="body2">No blockers registered.</Typography></Box>
                                                    )}
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                </Grid>

                                <Card sx={{ borderRadius: 3, border: `1px solid ${DS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                    <CardContent sx={{ p: 3 }}>
                                        <SectionHeader title="Blocker Detail Register" subtitle="Individual blocker case breakdown" />
                                        <TableContainer>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow sx={{ '& th': { fontWeight: 700, color: DS.textMute, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 1, borderBottom: `2px solid ${DS.border}` } }}>
                                                        <TableCell>Personnel</TableCell><TableCell>Team</TableCell><TableCell>Blocker Details</TableCell><TableCell>Category</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {reportData.records?.filter(r => r.blocker).length > 0 ? reportData.records.filter(r => r.blocker).map((rec, i) => (
                                                        <TableRow key={i} sx={{ '& td': { py: 1.5, borderBottom: '1px solid rgba(226,232,240,0.4)' }, '&:hover': { background: DS.bg } }}>
                                                            <TableCell><Typography sx={{ fontWeight: 700, color: DS.text, fontSize: '0.82rem' }}>{rec.user.name}</Typography></TableCell>
                                                            <TableCell><Typography sx={{ fontSize: '0.78rem', color: DS.textMute }}>{rec.team}</Typography></TableCell>
                                                            <TableCell><Typography sx={{ fontSize: '0.78rem', color: DS.textSec, lineHeight: 1.4 }}>{rec.blocker.split(' | ').map(b => b.includes(':') ? b.split(':').slice(1).join(':').trim() : b).join(', ')}</Typography></TableCell>
                                                            <TableCell><Chip size="small" label={rec.blockerCategory || 'General'} sx={{ fontWeight: 600, fontSize: '0.68rem', background: '#FEF3C7', color: '#92400E' }} /></TableCell>
                                                        </TableRow>
                                                    )) : (
                                                        <TableRow><TableCell colSpan={4} sx={{ py: 6, textAlign: 'center', color: DS.textMute }}>{loading ? 'Analyzing...' : 'No blockers registered.'}</TableCell></TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </CardContent>
                                </Card>
                            </Stack>
                        )}

                        {/* ─────────────────────────────────────────── TAB: LOSSES ── */}
                        {activeTab === 'losses' && (
                            <Stack spacing={4}>
                                <Card sx={{ borderRadius: 3, border: '1px solid ' + DS.danger + '30', background: 'linear-gradient(135deg, ' + DS.dangerBg + ' 0%, #FFF5F5 100%)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" spacing={3}>
                                            <Stack direction="row" alignItems="center" spacing={2}>
                                                <Box sx={{ width: 56, height: 56, borderRadius: 3, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: DS.danger }}>
                                                    <AttachMoneyOutlined sx={{ fontSize: 28 }} />
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#991B1B', textTransform: 'uppercase', letterSpacing: 1 }}>Total Financial Impact</Typography>
                                                    <Typography variant="h3" sx={{ fontWeight: 800, color: DS.danger, letterSpacing: '-0.02em' }}>{formatCurrency(totalLoss)}</Typography>
                                                </Box>
                                            </Stack>
                                            <Stack direction="row" spacing={4}>
                                                <Box sx={{ textAlign: 'center' }}><Typography variant="h5" sx={{ fontWeight: 800, color: DS.text }}>{reportData.records?.filter(r => r.businessLoss > 0).length || 0}</Typography><Typography variant="caption" sx={{ color: DS.textMute, fontWeight: 600 }}>Loss Cases</Typography></Box>
                                                <Box sx={{ textAlign: 'center' }}><Typography variant="h5" sx={{ fontWeight: 800, color: DS.text }}>{formatCurrency(reportData.records?.filter(r=>r.businessLoss>0).length ? totalLoss / reportData.records.filter(r => r.businessLoss > 0).length : 0)}</Typography><Typography variant="caption" sx={{ color: DS.textMute, fontWeight: 600 }}>Avg / Case</Typography></Box>
                                                <Box sx={{ textAlign: 'center' }}><Typography variant="h5" sx={{ fontWeight: 800, color: DS.text }}>{formatCurrency(Math.max(...(reportData.records?.map(r => r.businessLoss) || [0])))}</Typography><Typography variant="caption" sx={{ color: DS.textMute, fontWeight: 600 }}>Highest</Typography></Box>
                                            </Stack>
                                        </Stack>
                                    </CardContent>
                                </Card>

                                <Card sx={{ borderRadius: 3, border: `1px solid ${DS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                    <CardContent sx={{ p: 3 }}>
                                        <SectionHeader title="Business Loss Register" subtitle="Individual financial impact breakdown" />
                                        <TableContainer>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow sx={{ '& th': { fontWeight: 700, color: DS.textMute, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 1, borderBottom: `2px solid ${DS.border}` } }}>
                                                        <TableCell>Personnel</TableCell><TableCell>Team</TableCell><TableCell align="right">Business Loss</TableCell><TableCell>Loss Category</TableCell><TableCell>Root Cause / Description</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {reportData.records?.filter(r => r.businessLoss > 0).length > 0 ? reportData.records.filter(r => r.businessLoss > 0).sort((a, b) => b.businessLoss - a.businessLoss).map((rec, i) => (
                                                        <TableRow key={i} sx={{ '& td': { py: 1.5, borderBottom: '1px solid rgba(226,232,240,0.4)' }, '&:hover': { background: DS.bg } }}>
                                                            <TableCell><Typography sx={{ fontWeight: 700, color: DS.text, fontSize: '0.82rem' }}>{rec.user.name}</Typography></TableCell>
                                                            <TableCell><Typography sx={{ fontSize: '0.78rem', color: DS.textMute }}>{rec.team}</Typography></TableCell>
                                                            <TableCell align="right"><Typography sx={{ fontWeight: 800, color: DS.danger, fontSize: '0.88rem' }}>{formatCurrency(rec.businessLoss)}</Typography></TableCell>
                                                            <TableCell>
                                                                {rec.lossCategory ? (
                                                                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                                                        {rec.lossCategory.split(' | ').map((l, idx) => (
                                                                            <Chip key={idx} size="small" label={l.includes(':') ? l.split(':').slice(1).join(':').trim() : l} sx={{ fontSize: '0.62rem', fontWeight: 600, background: DS.dangerBg, color: '#B91C1C', my: 0.25 }} />
                                                                        ))}
                                                                    </Stack>
                                                                ) : <Typography sx={{ color: DS.textMute, fontSize: '0.78rem' }}>—</Typography>}
                                                            </TableCell>
                                                            <TableCell><Typography sx={{ fontSize: '0.78rem', color: DS.textSec, fontStyle: 'italic' }}>{rec.lossDescription || 'No description'}</Typography></TableCell>
                                                        </TableRow>
                                                    )) : (
                                                        <TableRow><TableCell colSpan={5} sx={{ py: 6, textAlign: 'center', color: DS.textMute }}>{loading ? 'Analyzing...' : 'No business losses registered.'}</TableCell></TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </CardContent>
                                </Card>
                            </Stack>
                        )}

                        {/* ─────────────────────────────────────────── TAB: OPEN POINTS ── */}
                        {activeTab === 'openpoints' && (
                            <Stack spacing={4}>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={4}>
                                        <Card sx={{ borderRadius: 3, border: `1px solid ${STATUS_PALETTE.Red.border}`, background: STATUS_PALETTE.Red.bg }}>
                                            <CardContent sx={{ p: 3, textAlign: 'center' }}>
                                                <ErrorOutlineOutlined sx={{ fontSize: 32, color: STATUS_PALETTE.Red.color, mb: 1 }} />
                                                <Typography variant="h4" sx={{ fontWeight: 800, color: STATUS_PALETTE.Red.color }}>{allOpenPoints.reduce((s, p) => s + p.redCount, 0)}</Typography>
                                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#7F1D1D', textTransform: 'uppercase' }}>Red Open Points</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <Card sx={{ borderRadius: 3, border: `1px solid ${STATUS_PALETTE.Amber.border}`, background: STATUS_PALETTE.Amber.bg }}>
                                            <CardContent sx={{ p: 3, textAlign: 'center' }}>
                                                <WarningAmberOutlined sx={{ fontSize: 32, color: STATUS_PALETTE.Amber.color, mb: 1 }} />
                                                <Typography variant="h4" sx={{ fontWeight: 800, color: STATUS_PALETTE.Amber.color }}>{allOpenPoints.reduce((s, p) => s + p.amberCount, 0)}</Typography>
                                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>Amber Open Points</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                        <Card sx={{ borderRadius: 3, border: `1px solid ${STATUS_PALETTE.Green.border}`, background: STATUS_PALETTE.Green.bg }}>
                                            <CardContent sx={{ p: 3, textAlign: 'center' }}>
                                                <DoneAllOutlined sx={{ fontSize: 32, color: STATUS_PALETTE.Green.color, mb: 1 }} />
                                                <Typography variant="h4" sx={{ fontWeight: 800, color: STATUS_PALETTE.Green.color }}>{allOpenPoints.reduce((s, p) => s + p.greenCount, 0)}</Typography>
                                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>Green Open Points</Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                </Grid>

                                <Card sx={{ borderRadius: 3, border: `1px solid ${DS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
                                            <Box>
                                                <Typography variant="h6" sx={{ fontWeight: 800, color: DS.primary, fontSize: '1.05rem' }}>Accountability Tracker</Typography>
                                                <Typography variant="body2" sx={{ color: DS.textMute, mt: 0.3, fontSize: '0.8rem' }}>Open points status for all employees — click a name to view details</Typography>
                                            </Box>
                                            <TextField size="small" placeholder="Search employee..." value={opSearchQuery} onChange={e => setOpSearchQuery(e.target.value)}
                                                InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined sx={{ color: DS.textMute, fontSize: 18 }} /></InputAdornment> }}
                                                sx={{ minWidth: 240, '& .MuiOutlinedInput-root': { borderRadius: 2, background: DS.bg, fontSize: '0.82rem' } }} />
                                        </Stack>
                                        <TableContainer>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow sx={{ '& th': { fontWeight: 700, color: DS.textMute, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 1, borderBottom: `2px solid ${DS.border}` } }}>
                                                        <TableCell>Personnel</TableCell><TableCell>Department</TableCell><TableCell align="center">Red</TableCell><TableCell align="center">Amber</TableCell><TableCell align="center">Green</TableCell><TableCell align="center">Score</TableCell><TableCell align="center">Status</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {opFiltered.length > 0 ? opFiltered.map((item, i) => (
                                                        <TableRow key={i} sx={{ '& td': { py: 1.5, borderBottom: '1px solid rgba(226,232,240,0.4)' }, '&:hover': { background: DS.bg } }}>
                                                            <TableCell>
                                                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                                                    <Avatar sx={{ width: 32, height: 32, fontSize: '0.78rem', fontWeight: 700, background: item.redCount > 0 ? DS.danger : DS.success, color: '#fff' }}>{item.user.name.charAt(0)}</Avatar>
                                                                    <Typography onClick={() => { setUserOpDialog({ open: true, user: item.user, points: [] }); fetchUserOpenPoints(item.user.username); }}
                                                                        sx={{ fontWeight: 700, color: DS.accent, fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: DS.accent+'40', '&:hover': { textDecorationColor: DS.accent } }}>
                                                                        {item.user.name}
                                                                    </Typography>
                                                                </Stack>
                                                            </TableCell>
                                                            <TableCell><Typography sx={{ fontSize: '0.78rem', color: DS.textMute }}>{item.user.department}</Typography></TableCell>
                                                            <TableCell align="center"><Chip size="small" label={item.redCount} sx={{ fontWeight: 800, background: item.redCount > 0 ? '#FEE2E2' : '#F1F5F9', color: item.redCount > 0 ? DS.danger : DS.textMute, minWidth: 36 }} /></TableCell>
                                                            <TableCell align="center"><Chip size="small" label={item.amberCount} sx={{ fontWeight: 800, background: item.amberCount > 0 ? '#FEF3C7' : '#F1F5F9', color: item.amberCount > 0 ? DS.warning : DS.textMute, minWidth: 36 }} /></TableCell>
                                                            <TableCell align="center"><Chip size="small" label={item.greenCount} sx={{ fontWeight: 800, background: item.greenCount > 0 ? '#D1FAE5' : '#F1F5F9', color: item.greenCount > 0 ? DS.success : DS.textMute, minWidth: 36 }} /></TableCell>
                                                            <TableCell align="center">
                                                                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                                                                    <LinearProgress variant="determinate" value={(item.score / 10) * 100} sx={{ width: 60, height: 6, borderRadius: 3, backgroundColor: '#F1F5F9', '& .MuiLinearProgress-bar': { backgroundColor: item.score >= 7 ? DS.success : item.score >= 4 ? DS.warning : DS.danger, borderRadius: 3 } }} />
                                                                    <Typography sx={{ fontWeight: 800, fontSize: '0.78rem', color: DS.text, minWidth: 30 }}>{item.score}/10</Typography>
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Chip size="small" label={item.redCount === 0 ? 'On Track' : item.redCount <= 2 ? 'Attention' : 'Critical'}
                                                                    sx={{ fontWeight: 700, fontSize: '0.68rem', background: item.redCount === 0 ? '#D1FAE5' : item.redCount <= 2 ? '#FEF3C7' : '#FEE2E2', color: item.redCount === 0 ? DS.success : item.redCount <= 2 ? DS.warning : DS.danger }} />
                                                            </TableCell>
                                                        </TableRow>
                                                    )) : (
                                                        <TableRow><TableCell colSpan={7} sx={{ py: 6, textAlign: 'center', color: DS.textMute }}><SearchOutlined sx={{ fontSize: 40, mb: 1, opacity: 0.4 }} /><Typography variant="body2" sx={{ fontWeight: 600 }}>No employees match your search.</Typography></TableCell></TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </CardContent>
                                </Card>
                            </Stack>
                        )}

                        {/* ─────────────────────────────────────────── TAB: NON SUBMITTERS ── */}
                        {activeTab === 'nonsubmitters' && (
                            <Stack spacing={4}>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <KpiCard title="Total Employees" value={nonSubmitterData.stats?.total || 0} subtext="In selected scope" icon={<GroupsOutlined />} color={DS.secondary} />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <KpiCard title="Submitted" value={nonSubmitterData.stats?.submitted || 0} subtext="Sheets received" icon={<CheckCircleOutlineOutlined />} color={DS.success} />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <KpiCard title="Non Submitters" value={nonSubmitterData.stats?.nonSubmitted || 0} subtext="Require follow-up" icon={<HourglassEmptyOutlined />} color={DS.danger} />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={3}>
                                        <KpiCard title="Submission Rate" value={`${nonSubmitterData.stats?.submissionRate || 0}%`} subtext="Org compliance" icon={<PendingActionsOutlined />} color={DS.warning} />
                                    </Grid>
                                </Grid>

                                <Grid container spacing={3}>
                                    <Grid item xs={12} lg={6}>
                                        <Card sx={{ borderRadius: 3, border: `1px solid ${DS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                            <CardContent sx={{ p: 3 }}>
                                                <SectionHeader title="Non Submitters" subtitle={`${nonSubmitterData.nonSubmitters?.length || 0} employees have not submitted their KPI sheets`} />
                                                <Stack spacing={1.5}>
                                                    {nonSubmitterData.nonSubmitters?.length > 0 ? nonSubmitterData.nonSubmitters.map((ns, i) => (
                                                        <Card key={i} sx={{ borderRadius: 2, border: '1px solid ' + DS.danger + '25', background: DS.dangerBg, transition: 'all 0.2s', '&:hover': { transform: 'translateX(4px)' } }}>
                                                            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                                                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                                                    <Stack direction="row" alignItems="center" spacing={1.5}>
                                                                        <Avatar sx={{ width: 34, height: 34, fontSize: '0.8rem', fontWeight: 700, background: '#fff', color: DS.danger, border: `1px solid ${DS.danger}40` }}>{initials(ns.name?.split(' ')[0], ns.name?.split(' ')[1])}</Avatar>
                                                                        <Box>
                                                                            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: DS.text }}>{ns.name}</Typography>
                                                                            <Typography sx={{ fontSize: '0.72rem', color: DS.textMute }}>{ns.team} • {ns.department}</Typography>
                                                                        </Box>
                                                                    </Stack>
                                                                    <Chip size="small" icon={<CancelOutlined sx={{fontSize:14}}/>} label="Not Submitted" sx={{ fontWeight: 700, background: '#FEE2E2', color: DS.danger, fontSize: '0.68rem' }} />
                                                                </Stack>
                                                            </CardContent>
                                                        </Card>
                                                    )) : (
                                                        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, color: DS.success, background: DS.successBg, border: '1px solid ' + DS.success + '30' }}>
                                                            <CheckCircleOutlineOutlined sx={{ fontSize: 40, mb: 1 }} />
                                                            <Typography variant="h6" sx={{ fontWeight: 700 }}>All Submitted</Typography>
                                                            <Typography variant="body2">Every employee has submitted their KPI sheet for this period.</Typography>
                                                        </Paper>
                                                    )}
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    <Grid item xs={12} lg={6}>
                                        <Card sx={{ borderRadius: 3, border: `1px solid ${DS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                            <CardContent sx={{ p: 3 }}>
                                                <SectionHeader title="Submission Overview" subtitle="Status breakdown by employee" />
                                                <TableContainer>
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow sx={{ '& th': { fontWeight: 700, color: DS.textMute, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 1, borderBottom: `2px solid ${DS.border}` } }}>
                                                                <TableCell>Personnel</TableCell><TableCell>Team</TableCell><TableCell>Department</TableCell><TableCell align="center">Status</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {[...(nonSubmitterData.submitters || []), ...(nonSubmitterData.nonSubmitters || [])].sort((a,b) => (a.submitted === b.submitted ? 0 : a.submitted ? 1 : -1)).map((u, i) => (
                                                                <TableRow key={i} sx={{ '& td': { py: 1.2, borderBottom: '1px solid rgba(226,232,240,0.4)' }, '&:hover': { background: DS.bg } }}>
                                                                    <TableCell><Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: DS.text }}>{u.name}</Typography></TableCell>
                                                                    <TableCell><Typography sx={{ fontSize: '0.78rem', color: DS.textMute }}>{u.team}</Typography></TableCell>
                                                                    <TableCell><Typography sx={{ fontSize: '0.78rem', color: DS.textMute }}>{u.department}</Typography></TableCell>
                                                                    <TableCell align="center">
                                                                        {u.submitted ? (
                                                                            <Chip size="small" icon={<CheckCircleOutlineOutlined sx={{fontSize:12}}/>} label="Submitted" sx={{ fontWeight: 700, background: '#D1FAE5', color: DS.success, fontSize: '0.68rem' }} />
                                                                        ) : (
                                                                            <Chip size="small" icon={<CancelOutlined sx={{fontSize:12}}/>} label="Not Submitted" sx={{ fontWeight: 700, background: '#FEE2E2', color: DS.danger, fontSize: '0.68rem' }} />
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                </Grid>
                            </Stack>
                        )}
                    </motion.div>
                </AnimatePresence>
            </Box>

            {/* ═══════════════════════════════════════════════════════════════
                TEAM DRAWER
            ═══════════════════════════════════════════════════════════════ */}
            <Drawer anchor="right" open={teamDrawer.open} onClose={() => setTeamDrawer({ open: false, teamData: null })}
                PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, background: DS.bg, borderLeft: `1px solid ${DS.border}` } }}>
                {teamDrawer.teamData && (
                    <Box sx={{ p: 4 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 800, color: DS.primary }}>{teamDrawer.teamData.name}</Typography>
                                <Typography variant="body2" sx={{ color: DS.textMute }}>{teamDrawer.teamData.memberCount} members • Avg Score {teamDrawer.teamData.avgScore}</Typography>
                            </Box>
                            <IconButton onClick={() => setTeamDrawer({ open: false, teamData: null })} sx={{ background: DS.surface, border: `1px solid ${DS.border}` }}>
                                <CloseOutlined sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Stack>

                        <Grid container spacing={2} mb={3}>
                            {[{k:'stars',l:'Stars',c:QUADRANTS.Star.color,v:teamDrawer.teamData.stars},{k:'engines',l:'Engines',c:QUADRANTS.Engine.color,v:teamDrawer.teamData.engines},{k:'specialists',l:'Specialists',c:QUADRANTS.Specialist.color,v:teamDrawer.teamData.specialists},{k:'drainers',l:'Drainers',c:QUADRANTS.Drainer.color,v:teamDrawer.teamData.drainers}].map(item => (
                                <Grid item xs={3} key={item.k}>
                                    <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, background: item.c+'10', border: '1px solid ' + item.c + '25' }}>
                                        <Typography sx={{ fontWeight: 800, color: item.c, fontSize: '1.25rem' }}>{item.v}</Typography>
                                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: DS.textMute, textTransform: 'uppercase' }}>{item.l}</Typography>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>

                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: DS.primary, mb: 2, fontSize: '0.9rem' }}>Team Members</Typography>
                        <Stack spacing={1.5}>
                            {teamDrawer.teamData.members.map((m, i) => {
                                const q = QUADRANTS[m.current?.quadrant || 'Drainer'];
                                return (
                                    <Card key={i} onClick={() => m.current?.sheetId && setSelectedSheetId(m.current.sheetId)}
                                        sx={{ borderRadius: 2, border: `1px solid ${DS.border}`, cursor: 'pointer', transition: 'all 0.2s', '&:hover': { borderColor: DS.accent+'40', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' } }}>
                                        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                                    <Avatar sx={{ width: 36, height: 36, fontSize: '0.82rem', fontWeight: 700, background: q.bg, color: q.color, border: `1px solid ${q.border}` }}>
                                                        {initials(m.user?.first_name, m.user?.last_name)}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: DS.text }}>{m.user?.first_name} {m.user?.last_name}</Typography>
                                                        <Typography sx={{ fontSize: '0.72rem', color: DS.textMute }}>{m.department}</Typography>
                                                    </Box>
                                                </Stack>
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Chip size="small" label={m.current?.total_value_score || 0} sx={{ fontWeight: 800, background: '#fff', border: `1px solid ${DS.border}`, fontSize: '0.72rem' }} />
                                                    <QuadrantBadge quadrant={m.current?.quadrant} />
                                                    <ChevronRightOutlined sx={{ fontSize: 18, color: DS.textMute }} />
                                                </Stack>
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                            {teamDrawer.teamData.members.length === 0 && (
                                <Typography sx={{ color: DS.textMute, textAlign: 'center', py: 4 }}>No member data available.</Typography>
                            )}
                        </Stack>
                    </Box>
                )}
            </Drawer>

            {/* ═══════════════════════════════════════════════════════════════
                USER OPEN POINTS DIALOG
            ═══════════════════════════════════════════════════════════════ */}
            <Dialog open={userOpDialog.open} onClose={() => setUserOpDialog({ open: false, user: null, points: [] })} maxWidth="md" fullWidth
                PaperProps={{ sx: { borderRadius: 4, border: `1px solid ${DS.border}`, boxShadow: '0 24px 48px rgba(0,0,0,0.18)', overflow: 'hidden' } }}>
                {userOpDialog.user && (
                    <>
                        <DialogTitle sx={{ background: DS.primary, color: '#fff', py: 2.5, px: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                <Avatar sx={{ width: 36, height: 36, background: '#fff', color: DS.primary, fontWeight: 700, fontSize: '0.9rem' }}>{userOpDialog.user.name?.charAt(0)}</Avatar>
                                <Box>
                                    <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }}>{userOpDialog.user.name}</Typography>
                                    <Typography sx={{ fontSize: '0.75rem', opacity: 0.85 }}>{userOpDialog.user.department}</Typography>
                                </Box>
                            </Stack>
                            <IconButton onClick={() => setUserOpDialog({ open: false, user: null, points: [] })} sx={{ color: '#fff' }}>
                                <CloseOutlined />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent sx={{ p: 0 }}>
                            <Box sx={{ p: 3, background: DS.bg, borderBottom: `1px solid ${DS.border}` }}>
                                <Grid container spacing={2}>
                                    <Grid item xs={4}>
                                        <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, background: '#fff', border: `1px solid ${STATUS_PALETTE.Red.border}` }}>
                                            <Typography variant="h5" sx={{ fontWeight: 800, color: STATUS_PALETTE.Red.color }}>{userOpDialog.points.filter(p => p.status === 'Red').length}</Typography>
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#7F1D1D' }}>Red</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, background: '#fff', border: `1px solid ${STATUS_PALETTE.Amber.border}` }}>
                                            <Typography variant="h5" sx={{ fontWeight: 800, color: STATUS_PALETTE.Amber.color }}>{userOpDialog.points.filter(p => ['Yellow','Orange'].includes(p.status)).length}</Typography>
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#92400E' }}>Amber</Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 2, background: '#fff', border: `1px solid ${STATUS_PALETTE.Green.border}` }}>
                                            <Typography variant="h5" sx={{ fontWeight: 800, color: STATUS_PALETTE.Green.color }}>{userOpDialog.points.filter(p => p.status === 'Green').length}</Typography>
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#065F46' }}>Green</Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Box>
                            <Box sx={{ p: 3, maxHeight: 480, overflowY: 'auto' }}>
                                {userOpLoading ? (
                                    <Box sx={{ py: 6, textAlign: 'center' }}><Typography sx={{ color: DS.textMute }}>Loading open points...</Typography></Box>
                                ) : userOpDialog.points.length > 0 ? (
                                    <Stack spacing={1.5}>
                                        {userOpDialog.points.sort((a,b) => {
                                            const order = { Red: 0, Orange: 1, Yellow: 2, Green: 3 };
                                            return (order[a.status] ?? 4) - (order[b.status] ?? 4);
                                        }).map((pt, i) => {
                                            const isOverdue = pt.status === 'Red' && pt.target_date && new Date(pt.target_date) < new Date();
                                            const statusColor = pt.status === 'Red' ? DS.danger : pt.status === 'Green' ? DS.success : DS.warning;
                                            return (
                                                <Card key={i} sx={{ borderRadius: 2.5, border: '1px solid ' + statusColor + '25', background: statusColor+'08' }}>
                                                    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                                                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                                            <Box sx={{ flex: 1 }}>
                                                                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: DS.text }}>{pt.title}</Typography>
                                                                <Typography sx={{ fontSize: '0.72rem', color: DS.textMute }}>{pt.project_name} • {pt.unique_id}</Typography>
                                                            </Box>
                                                            <Stack direction="row" spacing={0.5} alignItems="center">
                                                                <Chip size="small" label={pt.status} sx={{ fontWeight: 700, fontSize: '0.65rem', background: statusColor+'15', color: statusColor }} />
                                                                {isOverdue && <Chip size="small" label="OVERDUE" sx={{ fontWeight: 700, fontSize: '0.6rem', background: DS.dangerBg, color: DS.danger }} />}
                                                            </Stack>
                                                        </Stack>
                                                        <Stack direction="row" spacing={2}>
                                                            <Typography variant="caption" sx={{ color: DS.textSec }}><strong>Target:</strong> {pt.target_date ? new Date(pt.target_date).toLocaleDateString('en-IN') : '—'}</Typography>
                                                            <Typography variant="caption" sx={{ color: DS.textSec }}><strong>Priority:</strong> {pt.priority || '—'}</Typography>
                                                            <Typography variant="caption" sx={{ color: DS.textSec }}><strong>Level:</strong> {pt.level || '—'}</Typography>
                                                        </Stack>
                                                        {pt.gap_action && (
                                                            <Typography variant="caption" sx={{ color: DS.textSec, mt: 0.5, display: 'block' }}><strong>Action:</strong> {pt.gap_action}</Typography>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </Stack>
                                ) : (
                                    <Box sx={{ py: 6, textAlign: 'center' }}>
                                        <DoneAllOutlined sx={{ fontSize: 48, color: DS.success, mb: 1, opacity: 0.6 }} />
                                        <Typography sx={{ fontWeight: 700, color: DS.text }}>All Clear</Typography>
                                        <Typography sx={{ color: DS.textMute, fontSize: '0.85rem' }}>This employee has no open points assigned.</Typography>
                                    </Box>
                                )}
                            </Box>
                        </DialogContent>
                    </>
                )}
            </Dialog>

            {/* KPI Sheet Modal */}
            <Dialog open={Boolean(selectedSheetId)} onClose={() => setSelectedSheetId(null)} maxWidth="xl" fullWidth
                PaperProps={{ sx: { background: DS.bg, borderRadius: 4, boxShadow: '0 24px 48px rgba(0,0,0,0.2)', border: `1px solid ${DS.border}`, minHeight: '85vh', overflow: 'hidden' } }}
                BackdropProps={{ sx: { backgroundColor: 'rgba(45,58,84,0.5)', backdropFilter: 'blur(4px)' } }}>
                <DialogContent sx={{ p: 0, position: 'relative' }}>
                    <IconButton onClick={() => setSelectedSheetId(null)} sx={{ position: 'absolute', top: 20, right: 20, zIndex: 1000, background: '#fff', border: `1px solid ${DS.border}`, borderRadius: 10, '&:hover': { background: DS.bg } }}>
                        <CloseOutlined sx={{ fontSize: 18 }} />
                    </IconButton>
                    {selectedSheetId && <KPISheet sheetId={selectedSheetId} />}
                </DialogContent>
            </Dialog>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </Box>
    );
};

export default KPIPulseDashboard;