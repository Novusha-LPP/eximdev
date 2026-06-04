import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { getEndpoint } from './reports-helper';

const KarmaReport = ({ filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay }) => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showRules, setShowRules] = useState(false);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const endpoint = getEndpoint('/project-nucleus/karma-leaderboard');
                const params = {
                    filterType,
                    month: selectedMonth,
                    year: selectedYear,
                    quarter: selectedQuarter,
                    startDate: dateRange?.start,
                    endDate: dateRange?.end,
                    selectedDay
                };

                const res = await axios.get(endpoint, { params, withCredentials: true });
                setLeaderboard(res.data || []);
            } catch (error) {
                console.error("Error fetching karma leaderboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay]);

    // Filter leaderboard based on search query
    const filteredLeaderboard = useMemo(() => {
        if (!searchQuery.trim()) return leaderboard;
        const search = searchQuery.toLowerCase();
        return leaderboard.filter(user => {
            const name = (user.displayName || '').toLowerCase();
            const username = (user.username || '').toLowerCase();
            const dept = (user.department || '').toLowerCase();
            const role = (user.role || '').toLowerCase();
            return name.includes(search) || username.includes(search) || dept.includes(search) || role.includes(search);
        });
    }, [leaderboard, searchQuery]);

    // Statistics calculations
    const stats = useMemo(() => {
        if (leaderboard.length === 0) return { totalKarma: 0, avgKarma: 0, peakPerformer: null, lifetimeLeader: null };

        let totalKarma = 0;
        let peakUser = null;
        let peakPoints = -1;

        leaderboard.forEach(user => {
            totalKarma += user.totalKarma;
            if (user.monthlyKarma > peakPoints) {
                peakPoints = user.monthlyKarma;
                peakUser = user;
            }
        });

        // The leaderboard is already sorted by totalKarma descending
        const lifetimeLeader = leaderboard.find(u => u.totalKarma > 0) || null;
        const avgKarma = (totalKarma / leaderboard.length).toFixed(1);

        return {
            totalKarma,
            avgKarma,
            peakPerformer: peakPoints > 0 ? { ...peakUser, points: peakPoints } : null,
            lifetimeLeader
        };
    }, [leaderboard]);

    // Helper to get initials for avatar
    const getInitials = (name) => {
        if (!name) return "?";
        return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
    };

    // Helper to render rank badge
    const renderRankBadge = (rank) => {
        if (rank === 1) return <span style={{ fontSize: '1.4rem', filter: 'drop-shadow(0 2px 4px rgba(234,179,8,0.3))' }} title="1st Place">🥇</span>;
        if (rank === 2) return <span style={{ fontSize: '1.4rem', filter: 'drop-shadow(0 2px 4px rgba(148,163,184,0.3))' }} title="2nd Place">🥈</span>;
        if (rank === 3) return <span style={{ fontSize: '1.4rem', filter: 'drop-shadow(0 2px 4px rgba(180,83,9,0.3))' }} title="3rd Place">🥉</span>;
        return <span style={{ fontWeight: 600, color: '#64748b', fontSize: '0.9rem' }}>{rank}</span>;
    };

    // Helper to get random soft background color for avatar fallback
    const getAvatarBg = (username) => {
        const colors = [
            '#eff6ff', '#f0fdf4', '#fdf2f8', '#fff7ed', '#faf5ff', '#f0fdfa'
        ];
        const textColors = [
            '#2563eb', '#16a34a', '#db2777', '#ea580c', '#9333ea', '#0d9488'
        ];
        let hash = 0;
        for (let i = 0; i < (username || '').length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colors.length;
        return { bg: colors[index], text: textColors[index] };
    };

    if (loading) {
        return (
            <div className="nucleus-loading-container">
                <div className="nucleus-loader"></div>
                <div style={{ marginTop: '1rem', color: '#6b7280' }}>Loading gamification dashboard...</div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                
                {/* Total Karma Card */}
                <div className="analytics-graph-card" style={{ padding: '20px', borderLeft: '4px solid #2563eb', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Karma Awarded</span>
                            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', margin: '4px 0 0 0' }}>{stats.totalKarma}</h2>
                        </div>
                        <span style={{ fontSize: '24px' }}>📊</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
                        Cumulative team score across all projects
                    </div>
                </div>

                {/* Avg Karma Card */}
                <div className="analytics-graph-card" style={{ padding: '20px', borderLeft: '4px solid #0d9488', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average Karma</span>
                            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', margin: '4px 0 0 0' }}>{stats.avgKarma}</h2>
                        </div>
                        <span style={{ fontSize: '24px' }}>📈</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
                        Average task velocity score per member
                    </div>
                </div>

                {/* Period Peak Performer */}
                <div className="analytics-graph-card" style={{ padding: '20px', borderLeft: '4px solid #db2777', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Peak Performer</span>
                            {stats.peakPerformer ? (
                                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {stats.peakPerformer.displayName}
                                    <span className="status-pill success" style={{ fontSize: '11px', padding: '2px 6px' }}>+{stats.peakPerformer.points} pts</span>
                                </h3>
                            ) : (
                                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#64748b', margin: '4px 0 0 0' }}>No points this period</h3>
                            )}
                        </div>
                        <span style={{ fontSize: '24px' }}>🏆</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
                        Top contributor for selected period filter
                    </div>
                </div>

                {/* Lifetime Leader */}
                <div className="analytics-graph-card" style={{ padding: '20px', borderLeft: '4px solid #ea580c', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lifetime Leader</span>
                            {stats.lifetimeLeader ? (
                                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {stats.lifetimeLeader.displayName}
                                    <span className="status-pill info" style={{ fontSize: '11px', padding: '2px 6px' }}>{stats.lifetimeLeader.totalKarma} pts</span>
                                </h3>
                            ) : (
                                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#64748b', margin: '4px 0 0 0' }}>—</h3>
                            )}
                        </div>
                        <span style={{ fontSize: '24px' }}>👑</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
                        All-time leader on cumulative board
                    </div>
                </div>

            </div>

            {/* Custom Search Filter Controls */}
            <div className="nucleus-controls-container" style={{ margin: 0, paddingBottom: '12px' }}>
                <div className="nucleus-filter-section">
                    <div className="filter-row custom-filter-row" style={{ gap: '1.5rem', display: 'flex', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="filter-label" style={{ minWidth: 'auto', margin: 0 }}>Search Member:</span>
                            <input
                                type="text"
                                placeholder="Search by name, department, role..."
                                className="nucleus-input"
                                style={{ width: '320px', padding: '6px 12px', fontSize: '0.9rem' }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button 
                            className="btn btn-sm btn-info" 
                            style={{ fontSize: '13px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', height: '34px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontWeight: 600, borderRadius: '6px', cursor: 'pointer' }}
                            onClick={() => setShowRules(true)}
                        >
                            ℹ️ Rules & Points Model
                        </button>
                    </div>
                </div>
            </div>

            {/* Leaderboard Table */}
            <div className="nucleus-table-wrapper" style={{ marginTop: 0 }}>
                <table className="nucleus-table">
                    <thead>
                        <tr>
                            <th style={{ width: '80px', textAlign: 'center' }}>Rank</th>
                            <th>Member Name</th>
                            <th>Department</th>
                            <th>Role</th>
                            <th style={{ textAlign: 'center' }}>Completed Tasks (Period)</th>
                            <th style={{ textAlign: 'center' }}>Earned Karma (Period)</th>
                            <th style={{ textAlign: 'center' }}>Completed Tasks (Total)</th>
                            <th style={{ textAlign: 'center' }}>Cumulative Karma</th>
                            <th>Task Priority Breakdown (Total)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLeaderboard.length > 0 ? (
                            filteredLeaderboard.map((item, index) => {
                                const rank = index + 1;
                                const avatarColor = getAvatarBg(item.username);

                                return (
                                    <tr key={item.userId || item.username} style={rank <= 3 ? { backgroundColor: 'rgba(248,250,252,0.6)' } : {}}>
                                        <td style={{ textAlign: 'center', fontWeight: rank <= 3 ? 700 : 500 }}>
                                            {renderRankBadge(rank)}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {item.employee_photo ? (
                                                    <img
                                                        src={item.employee_photo}
                                                        alt={item.displayName}
                                                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0' }}
                                                    />
                                                ) : (
                                                    <div style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '50%',
                                                        backgroundColor: avatarColor.bg,
                                                        color: avatarColor.text,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: 700,
                                                        fontSize: '13px',
                                                        border: '2px solid #e2e8f0'
                                                    }}>
                                                        {getInitials(item.displayName)}
                                                    </div>
                                                )}
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.displayName}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>@{item.username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="status-pill info" style={{ fontSize: '0.8rem', textTransform: 'capitalize', fontWeight: '500' }}>
                                                {item.department || 'General'}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 500, color: '#475569', fontSize: '13px' }}>
                                            {item.role || '—'}
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 600, fontFamily: 'monospace' }}>
                                            {item.monthlyCompleted}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className="status-pill success" style={{ fontSize: '0.85rem', fontWeight: 700, padding: '4px 10px', minWidth: '60px', justifyContent: 'center' }}>
                                                +{item.monthlyKarma}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 600, fontFamily: 'monospace', color: '#64748b' }}>
                                            {item.totalCompleted}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', fontFamily: 'monospace' }}>
                                                {item.totalKarma}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                {item.breakdown.critical > 0 && (
                                                    <span className="status-pill error" style={{ fontSize: '0.75rem', padding: '2px 6px', fontWeight: '600' }} title="Critical Tasks Completed">
                                                        🚨 C: {item.breakdown.critical}
                                                    </span>
                                                )}
                                                {item.breakdown.high > 0 && (
                                                    <span className="status-pill warning" style={{ fontSize: '0.75rem', padding: '2px 6px', fontWeight: '600' }} title="High Priority Tasks Completed">
                                                        🔥 H: {item.breakdown.high}
                                                    </span>
                                                )}
                                                {item.breakdown.medium > 0 && (
                                                    <span className="status-pill info" style={{ fontSize: '0.75rem', padding: '2px 6px', fontWeight: '600' }} title="Medium Priority Tasks Completed">
                                                        ⚡ M: {item.breakdown.medium}
                                                    </span>
                                                )}
                                                {item.breakdown.low > 0 && (
                                                    <span className="status-pill neutral" style={{ fontSize: '0.75rem', padding: '2px 6px', fontWeight: '600' }} title="Low Priority Tasks Completed">
                                                        🌱 L: {item.breakdown.low}
                                                    </span>
                                                )}
                                                {item.breakdown.critical === 0 && item.breakdown.high === 0 && item.breakdown.medium === 0 && item.breakdown.low === 0 && (
                                                    <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No tasks completed yet</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="9" style={{ textAlign: 'center', color: '#6b7280', padding: '30px' }}>
                                    No members found matching the search criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {/* Rules Modal */}
            {showRules && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div style={{ 
                        background: 'white', padding: '28px', borderRadius: '12px', 
                        maxWidth: '500px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                        border: '1px solid #e2e8f0', animation: 'scaleUp 0.15s ease-out'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                🏆 Karma Points Model
                            </h3>
                            <button 
                                style={{ background: '#f1f5f9', border: 'none', color: '#475569', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
                                onClick={() => setShowRules(false)}
                            >
                                ✕
                            </button>
                        </div>
                        
                        <div style={{ fontSize: '14px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <p style={{ margin: 0, lineHeight: 1.5 }}>
                                Karma Points reward team members for completing tasks on time. Scores are calculated automatically from assigned <strong>Open Points</strong>.
                            </p>

                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Points Awarded by Priority:</h4>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🚨 Critical / Emergency (P1)</span>
                                        <span style={{ fontWeight: 700, color: '#dc2626' }}>+20 Points</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🔥 High Priority (P2)</span>
                                        <span style={{ fontWeight: 700, color: '#ea580c' }}>+15 Points</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>⚡ Medium Priority (P3)</span>
                                        <span style={{ fontWeight: 700, color: '#2563eb' }}>+10 Points</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🌱 Low Priority (P4)</span>
                                        <span style={{ fontWeight: 700, color: '#16a34a' }}>+5 Points</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <h4 style={{ margin: '0', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Rules:</h4>
                                <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: 1.4 }}>
                                    <li>Points are earned <strong>only</strong> when a task status is changed to <strong>Green (Completed)</strong>.</li>
                                    <li>Pending status levels such as Red (Delayed), Yellow (In Progress), and Orange (Change Request) earn 0 points.</li>
                                    <li><strong>Earned Karma (Period)</strong> represents points generated within the filtered date ranges.</li>
                                    <li><strong>Cumulative Karma</strong> is the all-time lifetime score of the employee.</li>
                                </ul>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                            <button 
                                className="btn btn-primary" 
                                style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                                onClick={() => setShowRules(false)}
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
        </div>
    );
};

export default KarmaReport;
