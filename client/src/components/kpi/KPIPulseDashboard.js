import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { UserContext } from "../../contexts/UserContext";
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, ZAxis } from 'recharts';
import { Dialog, DialogContent } from '@mui/material';
import KPISheet from './KPISheet';
import './kpi.scss';

// ─── Quadrant Config (Modernized Colors) ────────────────────────────
const QUADRANTS = {
    Star: { label: 'Stars', emoji: '⭐', color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', desc: 'High Volume + High Complexity', action: 'Promote / Empower' },
    Engine: { label: 'Engines', emoji: '⚙️', color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', desc: 'High Volume + Low Complexity', action: 'Automate / Standardise' },
    Specialist: { label: 'Specialists', emoji: '🎯', color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE', desc: 'Low Volume + High Complexity', action: 'Protect / Consult' },
    Drainer: { label: 'Drainers', emoji: '⚠️', color: '#F43F5E', bg: '#FFF1F2', border: '#FECDD3', desc: 'Low Volume + Low Complexity', action: 'Retrain / Review' },
};

// ─── Inline Styles (Modern UI) ──────────────────────────────────────
const S = {
    root: {
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        background: '#F8FAFC', // Soft off-white background
        color: '#0F172A', // Slate 900
        minHeight: '100vh',
        display: 'flex',
    },
    sidebar: {
        width: '340px',
        borderRight: '1px solid #E2E8F0',
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#FFFFFF',
        boxShadow: '4px 0 24px rgba(0,0,0,0.02)',
        zIndex: 10,
    },
    sidebarHead: {
        padding: '28px 24px 20px',
        borderBottom: '1px solid #F1F5F9',
    },
    sidebarContent: {
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
    },
    employeeItem: (active) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '12px 16px',
        borderRadius: '12px',
        cursor: 'pointer',
        background: active ? '#F1F5F9' : 'transparent',
        color: '#0F172A',
        border: '1px solid',
        borderColor: active ? '#E2E8F0' : 'transparent',
        transition: 'all 0.2s ease',
        marginBottom: '6px',
        boxShadow: active ? '0 2px 4px rgba(0,0,0,0.02)' : 'none',
    }),
    main: {
        flex: 1,
        height: '100vh',
        overflowY: 'auto',
        padding: '40px 48px',
        background: '#F8FAFC',
    },
    headerTop: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '28px',
    },
    headerTitle: {
        margin: 0,
        fontSize: '1.85rem',
        fontWeight: 800,
        color: '#0F172A',
        letterSpacing: '-0.02em',
    },
    headerSub: {
        margin: '6px 0 0 0',
        fontSize: '0.9rem',
        color: '#64748B',
        fontWeight: 500,
    },
    headerBadge: {
        display: 'inline-flex',
        padding: '4px 12px',
        fontSize: '0.7rem',
        fontWeight: 700,
        color: '#3B82F6',
        background: '#EFF6FF',
        borderRadius: '999px', // Pill shape
        marginTop: '12px',
    },
    controls: {
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
    },
    selectField: {
        padding: '10px 16px',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        background: '#FFFFFF',
        fontSize: '0.85rem',
        fontWeight: 600,
        color: '#334155',
        cursor: 'pointer',
        outline: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    deptBar: {
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        marginTop: '24px',
    },
    deptBtn: (active) => ({
        padding: '8px 16px',
        border: '1px solid',
        borderColor: active ? '#3B82F6' : '#E2E8F0',
        background: active ? '#3B82F6' : '#FFFFFF',
        color: active ? '#FFFFFF' : '#475569',
        fontSize: '0.8rem',
        fontWeight: 600,
        borderRadius: '999px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: active ? '0 4px 12px rgba(59, 130, 246, 0.25)' : '0 1px 2px rgba(0,0,0,0.05)',
    }),
    summaryContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '32px',
    },
    summaryItem: {
        padding: '24px',
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    summaryLabel: {
        fontSize: '0.75rem',
        fontWeight: 700,
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    summaryVal: {
        fontSize: '2rem',
        fontWeight: 800,
        color: '#0F172A',
        letterSpacing: '-0.02em',
    },
    bentoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gridAutoRows: 'minmax(100px, auto)',
        gap: '24px',
    },
    bentoCard: (span = 6) => ({
        gridColumn: `span ${span}`,
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        padding: '28px',
        background: '#FFFFFF',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
    }),
    cardTitle: {
        fontSize: '0.9rem',
        fontWeight: 700,
        color: '#1E293B',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    scatterWrap: {
        height: '400px',
        width: '100%',
    },
    accessDenied: {
        padding: '100px 40px',
        textAlign: 'center',
        background: '#F8FAFC',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    navBtn: {
        padding: '10px 20px',
        borderRadius: '10px',
        border: 'none',
        background: '#0F172A',
        color: '#ffffff',
        fontWeight: 600,
        fontSize: '0.85rem',
        cursor: 'pointer',
        boxShadow: '0 4px 6px rgba(15, 23, 42, 0.2)',
        transition: 'transform 0.1s, background 0.2s',
    },
    searchInput: {
        width: '100%',
        padding: '12px 16px 12px 40px',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        outline: 'none',
        fontSize: '0.85rem',
        fontWeight: 500,
        color: '#334155',
        background: '#F8FAFC',
        transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
    },
    avatarBox: (q) => ({
        width: '38px',
        height: '38px',
        borderRadius: '50%',
        background: q.bg,
        color: q.color,
        border: `1px solid ${q.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.85rem',
        fontWeight: 700,
        flexShrink: 0,
    }),
};

// ─── Custom Tooltip (Modernized) ────────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const d = payload[0].payload;
        const q = QUADRANTS[d.quadrant] || QUADRANTS.Drainer;
        return (
            <div style={{
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(8px)',
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#ffffff',
                minWidth: '240px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: q.color, boxShadow: `0 0 8px ${q.color}` }} />
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{d.name}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.8rem' }}>
                    <span style={{ color: '#94A3B8' }}>Volume</span>
                    <span style={{ fontWeight: 600, textAlign: 'right' }}>{d.x}</span>
                    <span style={{ color: '#94A3B8' }}>Avg Weight</span>
                    <span style={{ fontWeight: 600, textAlign: 'right' }}>{d.y.toFixed(2)}</span>
                    <span style={{ color: '#94A3B8' }}>Value Score</span>
                    <span style={{ fontWeight: 800, textAlign: 'right', color: q.color }}>{d.totalValueScore}</span>
                </div>
                <div style={{ marginTop: '16px', padding: '6px 12px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F8FAFC', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                    {q.label} • {q.action}
                </div>
            </div>
        );
    }
    return null;
};


// ─── Main Dashboard ──────────────────────────────────────────────────
const KPIPulseDashboard = () => {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();

    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [department, setDepartment] = useState('');
    const [team, setTeam] = useState('');
    const [teams, setTeams] = useState([]);
    const [data, setData] = useState({ pulseData: [], stats: { totalUsers: 0, stars: 0, specialists: 0, engines: 0, drainers: 0 } });
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSheetId, setSelectedSheetId] = useState(null);

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    useEffect(() => {
        if (user && (user.role === 'Admin' || user.role === 'Head_of_Department')) {
            fetchPulseData();
        }
    }, [year, month, department, team, user]);

    useEffect(() => {
        fetchTeams();
    }, []);

    const fetchTeams = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/teams/all`, { withCredentials: true });
            setTeams(res.data?.teams || []);
        } catch (err) {
            console.error("Error fetching teams", err);
        }
    };

    const fetchPulseData = async () => {
        try {
            setLoading(true);
            let url = `${process.env.REACT_APP_API_STRING}/kpi/analytics/pulse?year=${year}&month=${month}`;
            if (team) url += `&team=${encodeURIComponent(team)}`;
            else if (department) url += `&department=${encodeURIComponent(department)}`;
            const res = await axios.get(url, { withCredentials: true });

            let stars = 0, specialists = 0, engines = 0, drainers = 0;
            const pulseArray = res.data || [];
            pulseArray.forEach(item => {
                const q = item.current?.quadrant || 'Drainer';
                if (q === 'Star') stars++;
                else if (q === 'Specialist') specialists++;
                else if (q === 'Engine') engines++;
                else if (q === 'Drainer') drainers++;
            });

            setData({ pulseData: pulseArray, stats: { totalUsers: pulseArray.length, stars, specialists, engines, drainers } });
        } catch (error) {
            console.error("Error fetching pulse data", error);
        } finally {
            setLoading(false);
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
            const insight = (item.delta?.insight || '').toLowerCase();
            const quadrant = (item.current?.quadrant || '').toLowerCase();
            return name.includes(q) || dept.includes(q) || teamName.includes(q) || insight.includes(q) || quadrant.includes(q);
        });
    }, [data.pulseData, searchQuery]);

    const dashboardStats = useMemo(() => {
        let stars = 0, specialists = 0, engines = 0, drainers = 0;
        filteredData.forEach(item => {
            const q = item.current?.quadrant || 'Drainer';
            if (q === 'Star') stars++;
            else if (q === 'Specialist') specialists++;
            else if (q === 'Engine') engines++;
            else if (q === 'Drainer') drainers++;
        });
        return { totalFiltered: filteredData.length, stars, specialists, engines, drainers };
    }, [filteredData]);

    const scatterData = useMemo(() => {
        return filteredData.map(item => {
            const quadrant = item.current?.quadrant || 'Drainer';
            const q = QUADRANTS[quadrant] || QUADRANTS.Drainer;
            return {
                x: item.current?.total_quantity || 0,
                y: item.current?.average_complexity || 0,
                z: Math.max(60, (item.current?.total_value_score || 0) * 0.3),
                name: `${item.user?.first_name} ${item.user?.last_name}`,
                quadrant,
                totalValueScore: item.current?.total_value_score || 0,
                color: q.color,
            };
        });
    }, [filteredData]);

    // Access Denied
    if (user?.role !== 'Admin' && user?.role !== 'Head_of_Department') {
        return (
            <div style={S.accessDenied}>
                <div style={{ fontSize: '4rem', marginBottom: '24px' }}>🔐</div>
                <h1 style={{ fontWeight: 800, fontSize: '1.75rem', color: '#0F172A' }}>Access Restricted</h1>
                <p style={{ color: '#64748B', fontSize: '1.1rem', maxWidth: '450px', margin: '16px 0 32px 0', lineHeight: 1.6 }}>
                    This terminal is reserved for Executive Management and Department Heads. Continuous monitoring of strategic trajectories is active.
                </p>
                <button onClick={() => navigate('/kpi')} style={S.navBtn}>
                    Return to Personnel HQ
                </button>
            </div>
        );
    }

    const { stars, specialists, engines, drainers, totalFiltered } = dashboardStats;
    const totalActual = data.stats.totalUsers;

    return (
        <div style={S.root}>
            {/* ── Sidebar: Employee Navigation ────────────────── */}
            <div style={S.sidebar}>
                <div style={S.sidebarHead}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ background: '#EFF6FF', padding: '8px', borderRadius: '10px', color: '#3B82F6' }}>👥</div>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A' }}>Organization</span>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', color: '#94A3B8' }}>🔍</span>
                        <input
                            type="text"
                            placeholder="Search members..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ ...S.searchInput, outline: 'none' }}
                            onFocus={(e) => { e.target.style.borderColor = '#3B82F6'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; e.target.style.background = '#FFFFFF'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#F8FAFC'; }}
                        />
                    </div>
                </div>

                <div style={S.sidebarContent}>
                    {filteredData.length > 0 ? (
                        filteredData.map((item, i) => {
                            const q = QUADRANTS[item.current?.quadrant || 'Drainer'] || QUADRANTS.Drainer;
                            const isActive = selectedSheetId === item.current?.sheetId;
                            return (
                                <div
                                    key={i}
                                    style={S.employeeItem(isActive)}
                                    onClick={() => { if (item.current?.sheetId) setSelectedSheetId(item.current?.sheetId); }}
                                    onMouseEnter={e => !isActive && (e.currentTarget.style.background = '#F8FAFC')}
                                    onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'transparent')}
                                >
                                    <div style={S.avatarBox(q)}>
                                        {(item.user?.first_name || '?')[0]}{(item.user?.last_name || '?')[0]}
                                    </div>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isActive ? '#0F172A' : '#334155' }}>
                                            {item.user?.first_name} {item.user?.last_name}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                                            <span style={{ color: q.color, fontWeight: 600 }}>{q.label}</span>
                                            <span>•</span>
                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.team || item.department}</span>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', background: '#FFFFFF', padding: '4px 8px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                        {item.current?.total_value_score || 0}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.5rem' }}>📭</span>
                            No members found matching your search.
                        </div>
                    )}
                </div>
            </div>

            {/* ── Main Canvas ───────────────────────────────── */}
            <div style={S.main}>
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                >
                    {/* Header Controls */}
                    <div style={S.headerTop}>
                        <div>
                            <h1 style={S.headerTitle}>Executive Analytics</h1>
                            <p style={S.headerSub}>Strategic overview and performance trajectories</p>
                            <span style={S.headerBadge}>Pulse Mode Active</span>
                        </div>

                        <div style={S.controls}>
                            <select
                                value={month}
                                onChange={(e) => setMonth(Number(e.target.value))}
                                style={S.selectField}
                            >
                                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                            </select>
                            <select
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                                style={S.selectField}
                            >
                                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <button
                                onClick={() => navigate('/kpi/admin')}
                                style={S.navBtn}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                            >
                                Admin Center
                            </button>
                        </div>
                    </div>

                    {/* Team Selectors (Primary Focus) */}
                    <div style={S.deptBar}>
                        <button 
                            onClick={() => { setTeam(''); setDepartment(''); }} 
                            style={S.deptBtn(team === '' && department === '')}
                        >
                            All Teams
                        </button>
                        {teams.map(t => (
                            <button 
                                key={t._id} 
                                onClick={() => { setTeam(t.name); setDepartment(''); }} 
                                style={S.deptBtn(team === t.name)}
                            >
                                {t.name}
                            </button>
                        ))}
                    </div>

                    <div style={{ height: '36px' }} />

                    {/* Bento Row 1: High Level Summary */}
                    <div style={S.summaryContainer}>
                        <div style={S.summaryItem}>
                            <span style={S.summaryLabel}>Total Personnel</span>
                            <span style={S.summaryVal}>{totalFiltered}</span>
                        </div>
                        <div style={S.summaryItem}>
                            <span style={S.summaryLabel}>Org Coverage</span>
                            <span style={S.summaryVal}>{Math.round((totalFiltered / totalActual) * 100)}%</span>
                        </div>
                        <div style={S.summaryItem}>
                            <span style={S.summaryLabel}>Reporting period</span>
                            <span style={S.summaryVal}>{months[month - 1]} '{year.toString().slice(-2)}</span>
                        </div>
                        <div style={S.summaryItem}>
                            <span style={S.summaryLabel}>View Focus</span>
                            <span style={S.summaryVal}>{team || department || 'Global'}</span>
                        </div>
                    </div>

                    {/* Bento Row 2: Matrix & Quadrant Breakdown */}
                    <div style={S.bentoGrid}>
                        {/* 2x2 Matrix */}
                        <div style={S.bentoCard(8)}>
                            <div style={S.cardTitle}>
                                <div style={{ background: '#F1F5F9', padding: '6px', borderRadius: '8px' }}>📈</div>
                                Performance Matrix (Volume vs Complexity)
                            </div>
                            <div style={S.scatterWrap}>
                                {loading ? (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '24px', height: '24px', border: '3px solid #E2E8F0', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>Syncing Analytics...</span>
                                        </div>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                                            <CartesianGrid strokeDasharray="4 4" stroke="#F1F5F9" />
                                            <XAxis
                                                type="number" dataKey="x" name="Volume"
                                                domain={[0, 'dataMax + 20']}
                                                tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
                                                axisLine={{ stroke: '#E2E8F0', strokeWidth: 1 }}
                                                tickLine={{ stroke: '#E2E8F0' }}
                                            />
                                            <YAxis
                                                type="number" dataKey="y" name="Complexity"
                                                domain={[0, 5.5]}
                                                tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
                                                axisLine={{ stroke: '#E2E8F0', strokeWidth: 1 }}
                                                tickLine={{ stroke: '#E2E8F0' }}
                                            />
                                            <ZAxis type="number" dataKey="z" range={[80, 600]} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#94A3B8' }} />
                                            <ReferenceLine x={100} stroke="#CBD5E1" strokeDasharray="4 4" strokeWidth={1.5} />
                                            <ReferenceLine y={3.0} stroke="#CBD5E1" strokeDasharray="4 4" strokeWidth={1.5} />
                                            <Scatter name="Teams" data={scatterData}>
                                                {scatterData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} opacity={0.8} stroke="#FFFFFF" strokeWidth={2} style={{ transition: 'all 0.3s' }} />
                                                ))}
                                            </Scatter>
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* Distribution */}
                        <div style={S.bentoCard(4)}>
                            <div style={S.cardTitle}>
                                <div style={{ background: '#F1F5F9', padding: '6px', borderRadius: '8px' }}>📊</div>
                                Distribution Breakdown
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {Object.entries(QUADRANTS).map(([key, q]) => {
                                    const count = dashboardStats[key.toLowerCase() + 's'] || 0;
                                    const pct = totalFiltered > 0 ? Math.round((count / totalFiltered) * 100) : 0;
                                    return (
                                        <div key={key} style={{ padding: '16px', borderRadius: '12px', background: q.bg, border: `1px solid ${q.border}` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '1rem' }}>{q.emoji}</span>
                                                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A' }}>{q.label}</span>
                                                </div>
                                                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: q.color }}>{count}</span>
                                            </div>
                                            <div style={{ marginTop: '12px', height: '6px', background: 'rgba(255,255,255,0.6)', borderRadius: '99px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${pct}%`, background: q.color, borderRadius: '99px' }} />
                                            </div>
                                            <div style={{ marginTop: '6px', fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textAlign: 'right' }}>{pct}% OF VIEW</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Insights List */}
                        <div style={S.bentoCard(12)}>
                            <div style={S.cardTitle}>
                                <div style={{ background: '#F1F5F9', padding: '6px', borderRadius: '8px' }}>⚡</div>
                                Personnel Trajectories & Movement (Delta)
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                {filteredData.slice(0, 8).map((item, i) => {
                                    const insight = item.delta?.insight || 'Stable Performance';
                                    const q = QUADRANTS[item.current?.quadrant || 'Drainer'] || QUADRANTS.Drainer;
                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                padding: '20px', borderRadius: '14px', border: '1px solid #E2E8F0', background: '#FAFAFA',
                                                display: 'flex', flexDirection: 'column', gap: '12px',
                                                cursor: 'pointer', transition: 'all 0.2s',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                                            }}
                                            onClick={() => item.current?.sheetId && setSelectedSheetId(item.current.sheetId)}
                                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                                            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', display: 'block' }}>{item.user?.first_name} {item.user?.last_name}</span>
                                                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{item.team || item.department}</span>
                                                </div>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: '99px', background: q.bg, color: q.color, border: `1px solid ${q.border}` }}>
                                                    {q.label}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 500, color: '#475569', background: '#F1F5F9', padding: '8px 12px', borderRadius: '8px' }}>
                                                {insight}
                                            </div>
                                            <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '2px' }}>Score</div>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>{item.current?.total_value_score}</div>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '2px' }}>Qty Δ</div>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: item.delta?.qty_change_percent > 0 ? '#10B981' : item.delta?.qty_change_percent < 0 ? '#F43F5E' : '#64748B' }}>
                                                        {item.delta?.qty_change_percent > 0 ? '+' : ''}{item.delta?.qty_change_percent}%
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div style={{ height: '60px' }} />
                </motion.div>
            </div>

            {/* KPI Sheet Dialog (Modern Modal) */}
            <Dialog
                open={Boolean(selectedSheetId)}
                onClose={() => setSelectedSheetId(null)}
                maxWidth="xl"
                fullWidth
                PaperProps={{
                    style: {
                        background: '#F8FAFC',
                        borderRadius: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #E2E8F0',
                        minHeight: '85vh',
                        overflow: 'hidden'
                    }
                }}
                BackdropProps={{
                    style: {
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(4px)'
                    }
                }}
            >
                <DialogContent style={{ padding: '0', position: 'relative' }}>
                    <button
                        onClick={() => setSelectedSheetId(null)}
                        style={{
                            position: 'absolute', top: '24px', right: '24px', zIndex: 1000,
                            background: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0',
                            padding: '10px 20px', cursor: 'pointer', borderRadius: '99px',
                            fontWeight: 600, fontSize: '0.85rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; }}
                    >
                        ✕ Close Insight
                    </button>
                    {selectedSheetId && <KPISheet sheetId={selectedSheetId} />}
                </DialogContent>
            </Dialog>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default KPIPulseDashboard;