import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { UserContext } from "../../contexts/UserContext";
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, ZAxis } from 'recharts';
import './kpi.scss';

// ─── Quadrant Config ────────────────────────────────────────────────
const QUADRANTS = {
    Star: { label: 'Stars', emoji: '⭐', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', desc: 'High Volume + High Complexity', action: 'Promote / Empower' },
    Engine: { label: 'Engines', emoji: '⚙️', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', desc: 'High Volume + Low Complexity', action: 'Automate / Standardise' },
    Specialist: { label: 'Specialists', emoji: '🎯', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', desc: 'Low Volume + High Complexity', action: 'Protect / Consult' },
    Drainer: { label: 'Drainers', emoji: '⚠️', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', desc: 'Low Volume + Low Complexity', action: 'Retrain / Review' },
};

// ─── Custom Tooltip ─────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const d = payload[0].payload;
        const q = QUADRANTS[d.quadrant] || QUADRANTS.Drainer;
        return (
            <div style={{
                background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)',
                padding: '14px 18px', borderRadius: '12px', border: `1px solid ${q.border}`,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)', minWidth: '200px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '1.3rem' }}>{q.emoji}</span>
                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{d.name}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: '0.82rem' }}>
                    <span style={{ color: '#64748b' }}>Tasks</span>
                    <span style={{ fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>{d.x}</span>
                    <span style={{ color: '#64748b' }}>Avg Weight</span>
                    <span style={{ fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>{d.y.toFixed(2)}</span>
                    <span style={{ color: '#64748b' }}>Value Score</span>
                    <span style={{ fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>{d.totalValueScore}</span>
                </div>
                <div style={{ marginTop: '10px', padding: '6px 10px', borderRadius: '6px', background: q.bg, textAlign: 'center' }}>
                    <span style={{ fontWeight: 600, color: q.color, fontSize: '0.8rem' }}>{q.label} — {q.action}</span>
                </div>
            </div>
        );
    }
    return null;
};

// ─── Stat Card Component ────────────────────────────────────────────
const QuadrantCard = ({ quadrantKey, count, total, delay = 0 }) => {
    const q = QUADRANTS[quadrantKey];
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay, duration: 0.4 }}
            style={{
                background: q.bg, borderRadius: '16px', padding: '20px 24px',
                border: `1px solid ${q.border}`, position: 'relative', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0,
            }}
        >
            {/* Background decorative circle */}
            <div style={{
                position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px',
                borderRadius: '50%', background: q.color, opacity: 0.07
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <span style={{ fontSize: '1.6rem' }}>{q.emoji}</span>
                    <h3 style={{ fontSize: '2.2rem', fontWeight: 800, color: q.color, margin: '4px 0 0 0', lineHeight: 1 }}>{count}</h3>
                </div>
                <div style={{
                    padding: '4px 10px', borderRadius: '20px',
                    background: `${q.color}18`, color: q.color,
                    fontSize: '0.78rem', fontWeight: 700
                }}>
                    {pct}%
                </div>
            </div>
            <p style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{q.label}</p>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.78rem', lineHeight: 1.4 }}>{q.desc}</p>
            {/* Progress bar */}
            <div style={{ height: '4px', background: `${q.color}20`, borderRadius: '2px', marginTop: '4px' }}>
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: delay + 0.3, duration: 0.6 }}
                    style={{ height: '100%', background: q.color, borderRadius: '2px' }}
                />
            </div>
        </motion.div>
    );
};

// ─── Delta Row Component ────────────────────────────────────────────
const DeltaRow = ({ item, index }) => {
    const insight = item.delta?.insight || 'Stable / Insufficient Data';
    const qtyChange = item.delta?.qty_change_percent || 0;
    const weightChange = item.delta?.weight_change || 0;
    const quadrant = item.current?.quadrant || 'Drainer';
    const q = QUADRANTS[quadrant] || QUADRANTS.Drainer;

    let trendColor = '#64748b';
    let trendBg = '#f1f5f9';
    let TrendIcon = '→';
    if (insight.includes('Promotion') || insight.includes('Consistent')) {
        trendColor = '#059669'; trendBg = '#ecfdf5'; TrendIcon = '↑';
    } else if (insight.includes('Warning') || insight.includes('Burnout')) {
        trendColor = '#dc2626'; trendBg = '#fef2f2'; TrendIcon = '↓';
    } else if (insight.includes('Stagnation')) {
        trendColor = '#d97706'; trendBg = '#fffbeb'; TrendIcon = '→';
    }

    return (
        <motion.tr
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            style={{ borderBottom: '1px solid #f1f5f9' }}
        >
            {/* Employee */}
            <td style={{ padding: '14px 16px 14px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: `linear-gradient(135deg, ${q.color}22, ${q.color}08)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.85rem', fontWeight: 700, color: q.color,
                        border: `1px solid ${q.color}30`, flexShrink: 0
                    }}>
                        {(item.user?.first_name || '?')[0]}{(item.user?.last_name || '?')[0]}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>
                            {item.user?.first_name} {item.user?.last_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.department || '-'}</div>
                    </div>
                </div>
            </td>
            {/* Quadrant Badge */}
            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '4px 12px', borderRadius: '20px',
                    background: q.bg, color: q.color, border: `1px solid ${q.border}`,
                    fontSize: '0.78rem', fontWeight: 600
                }}>
                    {q.emoji} {q.label.replace(/s$/, '')}
                </span>
            </td>
            {/* Curr Score */}
            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>
                    {item.current?.total_value_score || 0}
                </span>
            </td>
            {/* Prev Score */}
            <td style={{ padding: '14px 16px', textAlign: 'center', color: '#94a3b8', fontWeight: 500 }}>
                {item.previous?.total_value_score || '—'}
            </td>
            {/* Qty Change */}
            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '4px 12px', borderRadius: '20px',
                    background: qtyChange > 0 ? '#ecfdf5' : qtyChange < 0 ? '#fef2f2' : '#f8fafc',
                    color: qtyChange > 0 ? '#059669' : qtyChange < 0 ? '#dc2626' : '#64748b',
                    fontWeight: 700, fontSize: '0.85rem'
                }}>
                    {qtyChange > 0 ? '▲' : qtyChange < 0 ? '▼' : '●'} {qtyChange > 0 ? '+' : ''}{qtyChange}%
                </div>
            </td>
            {/* Weight Change */}
            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                <span style={{
                    fontWeight: 600, fontSize: '0.85rem',
                    color: weightChange > 0 ? '#059669' : weightChange < 0 ? '#dc2626' : '#94a3b8'
                }}>
                    {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}
                </span>
            </td>
            {/* CEO Insight */}
            <td style={{ padding: '14px 16px' }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '6px 14px', borderRadius: '8px',
                    background: trendBg, color: trendColor,
                    fontSize: '0.8rem', fontWeight: 600, maxWidth: '280px'
                }}>
                    <span style={{ fontSize: '1rem' }}>{TrendIcon}</span>
                    {insight}
                </div>
            </td>
        </motion.tr>
    );
};

// ─── Main Dashboard ─────────────────────────────────────────────────
const KPIPulseDashboard = () => {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();

    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [department, setDepartment] = useState('');

    const [data, setData] = useState({ pulseData: [], stats: { totalUsers: 0, stars: 0, specialists: 0, engines: 0, drainers: 0 } });
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const departments = [
        'Export', 'Import', 'Operation-Khodiyar', 'Operation-Sanand', 'Feild', 'Accounts', 'SRCC',
        'Gandhidham', 'DGFT', 'Software', 'Marketing', 'Paramount', 'Rabs', 'Admin'
    ];

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    useEffect(() => {
        if (user && (user.role === 'Admin' || user.role === 'Head_of_Department')) {
            fetchPulseData();
        }
    }, [year, month, department, user]);

    const fetchPulseData = async () => {
        try {
            setLoading(true);
            let url = `${process.env.REACT_APP_API_STRING}/kpi/analytics/pulse?year=${year}&month=${month}`;
            if (department) url += `&department=${department}`;

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

            setData({
                pulseData: pulseArray,
                stats: { totalUsers: pulseArray.length, stars, specialists, engines, drainers }
            });
        } catch (error) {
            console.error("Error fetching pulse data", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = useMemo(() => {
        const pulseDataArray = data.pulseData || [];
        if (!searchQuery.trim()) return pulseDataArray;
        const q = searchQuery.toLowerCase();
        return pulseDataArray.filter(item => {
            const name = `${item.user?.first_name} ${item.user?.last_name}`.toLowerCase();
            const dept = (item.department || '').toLowerCase();
            const insight = (item.delta?.insight || '').toLowerCase();
            const quadrant = (item.current?.quadrant || '').toLowerCase();
            return name.includes(q) || dept.includes(q) || insight.includes(q) || quadrant.includes(q);
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
                color: q.color
            };
        });
    }, [filteredData]);

    if (user?.role !== 'Admin' && user?.role !== 'Head_of_Department') {
        return (
            <div style={{
                padding: '60px',
                textAlign: 'center',
                background: 'white',
                borderRadius: '16px',
                margin: '40px auto',
                maxWidth: '600px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
            }}>
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔐</div>
                <h2 style={{ color: '#1e293b', fontWeight: 800, marginBottom: '12px' }}>Access Restricted</h2>
                <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '32px' }}>
                    The <strong>CEO Pulse & Analytics</strong> dashboard contains sensitive performance metrics (Weights & Complexity) intended for management only.
                </p>
                <button
                    onClick={() => navigate('/kpi')}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '12px',
                        background: '#6366f1',
                        color: 'white',
                        border: 'none',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                >
                    Back to My KPI Sheet
                </button>
            </div>
        );
    }

    const { stars, specialists, engines, drainers, totalFiltered } = dashboardStats;
    const totalActual = data.stats.totalUsers;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
        >
            {/* ─── Hero Header ─────────────────────────────────────────── */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
                    borderRadius: '20px', padding: '32px 36px', marginBottom: '28px',
                    position: 'relative', overflow: 'hidden', color: 'white'
                }}
            >
                {/* Decorative grid pattern */}
                <div style={{
                    position: 'absolute', inset: 0, opacity: 0.04,
                    backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                    backgroundSize: '24px 24px'
                }} />
                {/* Accent glow */}
                <div style={{
                    position: 'absolute', top: '-60px', right: '-60px', width: '220px', height: '220px',
                    borderRadius: '50%', background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', opacity: 0.15
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', position: 'relative' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '1.6rem' }}>📊</span>
                            <h1 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.02em' }}>CEO Pulse & Analytics</h1>
                        </div>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem', maxWidth: '480px', lineHeight: 1.5 }}>
                            Strategic overview of team performance — value over volume. Tracking who's delivering impact, not just tasks.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Search Bar in Hero */}
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Search analyst, dept..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    padding: '12px 18px 12px 42px', borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)',
                                    color: 'white', outline: 'none', width: '280px', fontSize: '0.9rem',
                                    backdropFilter: 'blur(10px)', transition: 'all 0.3s'
                                }}
                                onFocus={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
                                onBlur={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                            />
                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem', opacity: 0.7 }}>🔍</span>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '1.2rem' }}
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => navigate('/kpi/admin')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '12px 18px', borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)',
                                    color: '#e2e8f0', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                                    backdropFilter: 'blur(8px)', transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.12)'}
                                onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.07)'}
                            >
                                ← Admin Dashboard
                            </button>
                            <div style={{
                                display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.08)',
                                padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                                <select
                                    value={month} onChange={(e) => setMonth(Number(e.target.value))}
                                    style={{
                                        border: 'none', padding: '8px 12px', outline: 'none', borderRadius: '8px',
                                        background: 'transparent', color: '#e2e8f0', fontSize: '0.85rem', cursor: 'pointer'
                                    }}
                                >
                                    {months.map((m, i) => <option key={i} value={i + 1} style={{ color: '#0f172a' }}>{m}</option>)}
                                </select>
                                <select
                                    value={year} onChange={(e) => setYear(Number(e.target.value))}
                                    style={{
                                        border: 'none', padding: '8px 12px', outline: 'none', borderRadius: '8px',
                                        background: 'transparent', color: '#e2e8f0', fontSize: '0.85rem', cursor: 'pointer'
                                    }}
                                >
                                    {[2024, 2025, 2026].map(y => <option key={y} value={y} style={{ color: '#0f172a' }}>{y}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Department filter row inside header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '20px', position: 'relative' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Department:</span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => setDepartment('')}
                            style={{
                                padding: '6px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
                                border: department === '' ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.12)',
                                background: department === '' ? '#6366f130' : 'transparent',
                                color: department === '' ? '#a5b4fc' : '#94a3b8', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            All
                        </button>
                        {departments.map(d => (
                            <button
                                key={d}
                                onClick={() => setDepartment(d)}
                                style={{
                                    padding: '6px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
                                    border: department === d ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.12)',
                                    background: department === d ? '#6366f130' : 'transparent',
                                    color: department === d ? '#a5b4fc' : '#94a3b8', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* ─── Summary Row ─────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', padding: '0 4px' }}>
                <span style={{ fontSize: '1.1rem' }}>👥</span>
                <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                    <strong style={{ color: '#1e293b', fontSize: '1.1rem' }}>{totalFiltered}</strong> of <strong style={{ color: '#64748b' }}>{totalActual}</strong> team members analysed for <strong style={{ color: '#1e293b' }}>{months[month - 1]} {year}</strong>
                </span>
                {loading && <span style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 600 }}>⟳ Loading...</span>}
            </div>

            {/* ─── Quadrant Cards ──────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
                <QuadrantCard quadrantKey="Star" count={stars} total={totalFiltered} delay={0.05} />
                <QuadrantCard quadrantKey="Engine" count={engines} total={totalFiltered} delay={0.1} />
                <QuadrantCard quadrantKey="Specialist" count={specialists} total={totalFiltered} delay={0.15} />
                <QuadrantCard quadrantKey="Drainer" count={drainers} total={totalFiltered} delay={0.2} />
            </div>

            {/* ─── 2x2 Performance Matrix ──────────────────────────────── */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{
                    background: 'white', borderRadius: '16px', padding: '28px',
                    border: '1px solid #e2e8f0', marginBottom: '28px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>
                            2×2 Performance Matrix
                        </h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                            X-axis = Task Volume · Y-axis = Avg Task Weight · Bubble Size = Total Value Score
                        </p>
                    </div>
                    {/* Quadrant Legend */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {Object.entries(QUADRANTS).map(([key, q]) => (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: q.color }} />
                                <span style={{ color: '#64748b', fontWeight: 500 }}>{q.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ height: '480px', marginTop: '16px' }}>
                    {loading ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                            <span style={{ fontSize: '1.2rem' }}>⟳</span>&nbsp; Loading Matrix...
                        </div>
                    ) : scatterData.length === 0 ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontSize: '2rem' }}>📭</span>
                            <span>No data for this period. Sheets may not have been checked yet.</span>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 30, right: 30, bottom: 30, left: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                <XAxis
                                    type="number" dataKey="x" name="Volume"
                                    domain={[0, 'dataMax + 50']}
                                    label={{ value: '← Low Volume          Total Quantity (Tasks)          High Volume →', position: 'insideBottom', offset: -15, fill: '#94a3b8', fontSize: 11 }}
                                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                                />
                                <YAxis
                                    type="number" dataKey="y" name="Avg Weight"
                                    domain={[0, 5.5]}
                                    label={{ value: 'Average Complexity (Weight)', angle: -90, position: 'insideLeft', offset: 10, fill: '#94a3b8', fontSize: 11 }}
                                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                                />
                                <ZAxis type="number" dataKey="z" range={[80, 500]} />
                                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                                <ReferenceLine
                                    x={100} stroke="#e2e8f0" strokeDasharray="5 5" strokeWidth={1.5}
                                    label={{ value: 'Vol. Line', position: 'top', fill: '#cbd5e1', fontSize: 10 }}
                                />
                                <ReferenceLine
                                    y={3.0} stroke="#e2e8f0" strokeDasharray="5 5" strokeWidth={1.5}
                                    label={{ value: 'Wt. Line', position: 'right', fill: '#cbd5e1', fontSize: 10 }}
                                />
                                <Scatter name="Employees" data={scatterData}>
                                    {scatterData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} opacity={0.85} stroke={entry.color} strokeWidth={1} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </motion.div>

            {/* ─── Delta Variations Table ───────────────────────────────── */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{
                    background: 'white', borderRadius: '16px',
                    border: '1px solid #e2e8f0', overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
            >
                {/* Table header */}
                <div style={{
                    padding: '20px 28px', borderBottom: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>
                            Delta Variations <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.9rem' }}>Month-over-Month</span>
                        </h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                            Track movement, identify growth trajectories & disengagement risks
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{
                            padding: '6px 14px', borderRadius: '20px',
                            background: '#f1f5f9', color: '#64748b',
                            fontSize: '0.78rem', fontWeight: 700
                        }}>
                            {filteredData.length} Results
                        </span>
                    </div>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ background: '#fafbfc', borderBottom: '2px solid #f1f5f9' }}>
                                <th style={{ padding: '12px 16px 12px 24px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quadrant</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Curr Score</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prev Score</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Qty Δ%</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wt Δ</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CEO Insight</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {filteredData.length > 0 ? (
                                    filteredData.map((item, i) => <DeltaRow key={i} item={item} index={i} />)
                                ) : (
                                    <tr>
                                        <td colSpan="7" style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                                            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
                                            {searchQuery ? `No results matching "${searchQuery}"` : 'No performance data available for this period'}
                                        </td>
                                    </tr>
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Footer spacer */}
            <div style={{ height: '40px' }} />
        </motion.div>
    );
};

export default KPIPulseDashboard;
