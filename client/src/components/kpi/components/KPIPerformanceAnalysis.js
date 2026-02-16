import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Cell } from 'recharts';
import { Dialog, DialogTitle, DialogContent, Button } from '@mui/material';

/**
 * KPIPerformanceAnalysis - Executive Performance Analysis
 * Top and bottom performers with detailed insights
 */

const KPIPerformanceAnalysis = ({ analytics = {} }) => {
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [viewMode, setViewMode] = useState('top'); // top, bottom, all

    const topPerformers = analytics.topPerformers || [];
    const bottomPerformers = analytics.bottomPerformers || [];

    // Format currency
    const formatCurrency = (value) => {
        if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
        if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
        if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
        return `₹${value.toFixed(0)}`;
    };

    // Get performance badge
    const getPerformanceBadge = (performance) => {
        if (performance >= 85) return { color: '#059669', label: 'Exceptional', bg: '#ecfdf5' };
        if (performance >= 75) return { color: '#0369a1', label: 'Excellent', bg: '#f0f9ff' };
        if (performance >= 60) return { color: '#0d9488', label: 'Good', bg: '#f0fdfa' };
        if (performance >= 45) return { color: '#b45309', label: 'At Risk', bg: '#fffbeb' };
        return { color: '#991b1b', label: 'Critical', bg: '#fef2f2' };
    };

    // Enhanced data with badges
    const enhancedTopPerformers = useMemo(() => {
        return (topPerformers || []).map((emp, idx) => ({
            ...emp,
            rank: idx + 1,
            badge: getPerformanceBadge(emp.perf || 0),
            medal: idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
        }));
    }, [topPerformers]);

    const enhancedBottomPerformers = useMemo(() => {
        return (bottomPerformers || []).map((emp, idx) => ({
            ...emp,
            rank: idx + 1,
            badge: getPerformanceBadge(emp.perf || 0)
        }));
    }, [bottomPerformers]);

    // Chart data
    const chartData = useMemo(() => {
        if (viewMode === 'top') {
            return enhancedTopPerformers.slice(0, 10);
        } else if (viewMode === 'bottom') {
            return enhancedBottomPerformers.slice(0, 10);
        }
        return [...enhancedTopPerformers, ...enhancedBottomPerformers].slice(0, 15);
    }, [viewMode, enhancedTopPerformers, enhancedBottomPerformers]);

    const selectedEmpData = useMemo(() => {
        const allEmps = [...enhancedTopPerformers, ...enhancedBottomPerformers];
        return allEmps.find(e => e.name === selectedEmployee);
    }, [selectedEmployee, enhancedTopPerformers, enhancedBottomPerformers]);

    return (
        <div style={{ display: 'grid', gap: 32 }}>
            {/* Section Header */}
            <div style={{
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: 24
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div>
                        <h2 style={{
                            margin: 0,
                            fontSize: '1.75rem',
                            fontWeight: 600,
                            color: '#111827',
                            letterSpacing: '-0.5px'
                        }}>
                            Performance Analysis
                        </h2>
                        <p style={{
                            margin: '8px 0 0 0',
                            color: '#6b7280',
                            fontSize: '0.95rem',
                            fontWeight: 400
                        }}>
                            Identify top performers and support those needing improvement
                        </p>
                    </div>
                </div>
            </div>

            {/* View Mode Tabs */}
            <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e5e7eb', paddingBottom: 16 }}>
                {[
                    { id: 'top', label: 'Top Performers', Icon: '⭐' },
                    { id: 'bottom', label: 'Need Support', Icon: '📈' },
                    { id: 'all', label: 'All Employees', Icon: '👥' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setViewMode(tab.id)}
                        style={{
                            padding: '10px 16px',
                            background: viewMode === tab.id ? '#ffffff' : 'transparent',
                            border: viewMode === tab.id ? '1px solid #e5e7eb' : 'none',
                            borderBottom: viewMode === tab.id ? '2px solid #0369a1' : 'none',
                            borderRadius: '6px 6px 0 0',
                            color: viewMode === tab.id ? '#0369a1' : '#6b7280',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => !viewMode === tab.id && (e.currentTarget.style.color = '#374151')}
                        onMouseLeave={(e) => !viewMode === tab.id && (e.currentTarget.style.color = '#6b7280')}
                    >
                        {tab.Icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Summary Stats */}
            {(viewMode === 'top' || viewMode === 'all') && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 8 }}>
                    <div style={{
                        background: '#ecfdf5',
                        border: '1px solid #d1fae5',
                        borderRadius: '8px',
                        padding: '16px',
                        borderLeft: '4px solid #059669'
                    }}>
                        <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                            Top Performers
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#059669' }}>
                            {enhancedTopPerformers.length}
                        </div>
                    </div>
                </div>
            )}

            {(viewMode === 'bottom' || viewMode === 'all') && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 8 }}>
                    <div style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        padding: '16px',
                        borderLeft: '4px solid #991b1b'
                    }}>
                        <div style={{ fontSize: '0.75rem', color: '#7f1d1d', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                            Need Support
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#991b1b' }}>
                            {enhancedBottomPerformers.length}
                        </div>
                    </div>
                </div>
            )}

            {/* Performance Chart */}
            <div style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '20px'
            }}>
                <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#111827',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                }}>
                    {viewMode === 'top' ? 'Top 10 Performers' : viewMode === 'bottom' ? 'Bottom 10 (Need Support)' : 'All Employees Performance'}
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData} layout="vertical" margin={{ left: 150 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 100]} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={140} />
                        <ReTooltip
                            contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                            formatter={(value) => `${value}%`}
                        />
                        <Bar dataKey="perf" fill="#0369a1" radius={[0, 4, 4, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.badge?.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Employees Table */}
            <div style={{
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                overflow: 'hidden'
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '0.9rem'
                    }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Rank</th>
                                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Name</th>
                                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Department</th>
                                <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Performance</th>
                                <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Business Loss</th>
                                <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Status</th>
                                <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(viewMode === 'top' ? enhancedTopPerformers : viewMode === 'bottom' ? enhancedBottomPerformers : [...enhancedTopPerformers, ...enhancedBottomPerformers]).map((emp, idx) => (
                                <tr
                                    key={idx}
                                    style={{
                                        borderBottom: '1px solid #f3f4f6',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#fafbfc'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                                >
                                    <td style={{ padding: '16px 20px', color: '#111827', fontWeight: 600 }}>
                                        {emp.medal ? <span style={{ fontSize: '1.2rem', marginRight: 8 }}>{emp.medal}</span> : <span>#{emp.rank}</span>}
                                    </td>
                                    <td style={{ padding: '16px 20px', color: '#111827', fontWeight: 500 }}>
                                        {emp.name}
                                    </td>
                                    <td style={{ padding: '16px 20px', color: '#6b7280' }}>
                                        {emp.dept || '-'}
                                    </td>
                                    <td style={{
                                        padding: '16px 20px',
                                        textAlign: 'right',
                                        color: emp.badge.color,
                                        fontWeight: 600
                                    }}>
                                        {emp.perf}%
                                    </td>
                                    <td style={{
                                        padding: '16px 20px',
                                        textAlign: 'right',
                                        color: '#6b7280'
                                    }}>
                                        {emp.loss ? formatCurrency(emp.loss) : '-'}
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                        <div style={{
                                            padding: '4px 12px',
                                            background: emp.badge.bg,
                                            color: emp.badge.color,
                                            borderRadius: '4px',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            display: 'inline-block'
                                        }}>
                                            {emp.badge.label}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => setSelectedEmployee(emp.name)}
                                            style={{
                                                padding: '6px 14px',
                                                background: '#f3f4f6',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '4px',
                                                color: '#374151',
                                                fontWeight: 500,
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = '#e5e7eb';
                                                e.currentTarget.style.borderColor = '#9ca3af';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = '#f3f4f6';
                                                e.currentTarget.style.borderColor = '#d1d5db';
                                            }}
                                        >
                                            Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Employee Detail Modal */}
            {selectedEmpData && (
                <Dialog open={!!selectedEmployee} onClose={() => setSelectedEmployee(null)} maxWidth="sm" fullWidth>
                    <DialogTitle style={{
                        padding: '20px',
                        borderBottom: '1px solid #e5e7eb',
                        background: '#f9fafb'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Employee Performance
                                </div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginTop: 4 }}>
                                    {selectedEmpData.name}
                                </div>
                            </div>
                            <Button onClick={() => setSelectedEmployee(null)} size="small">Close</Button>
                        </div>
                    </DialogTitle>
                    <DialogContent style={{ padding: '20px' }}>
                        {/* Key Metrics */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                            <div style={{
                                padding: '16px',
                                background: selectedEmpData.badge.bg,
                                borderRadius: '6px',
                                border: `1px solid ${selectedEmpData.badge.color}33`
                            }}>
                                <div style={{ fontSize: '0.75rem', color: selectedEmpData.badge.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                                    Performance Score
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 600, color: selectedEmpData.badge.color }}>
                                    {selectedEmpData.perf}%
                                </div>
                            </div>

                            <div style={{
                                padding: '16px',
                                background: '#f0f9ff',
                                borderRadius: '6px',
                                border: '1px solid #bfdbfe'
                            }}>
                                <div style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                                    Business Loss
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 600, color: '#0369a1' }}>
                                    {selectedEmpData.loss ? formatCurrency(selectedEmpData.loss) : '-'}
                                </div>
                            </div>
                        </div>

                        {/* Status and Department */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                            <div style={{
                                padding: '12px 16px',
                                background: '#f9fafb',
                                borderRadius: '6px',
                                border: '1px solid #e5e7eb'
                            }}>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                                    Department
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
                                    {selectedEmpData.dept || '-'}
                                </div>
                            </div>

                            <div style={{
                                padding: '12px 16px',
                                background: selectedEmpData.badge.bg,
                                borderRadius: '6px',
                                border: `1px solid ${selectedEmpData.badge.color}33`
                            }}>
                                <div style={{ fontSize: '0.75rem', color: selectedEmpData.badge.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                                    Status
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 600, color: selectedEmpData.badge.color }}>
                                    {selectedEmpData.badge.label}
                                </div>
                            </div>
                        </div>

                        {/* Recommendations */}
                        <div style={{
                            padding: '16px',
                            background: '#f9fafb',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb'
                        }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>
                                Next Steps
                            </h4>
                            <ul style={{ margin: 0, paddingLeft: 20, color: '#6b7280', fontSize: '0.9rem' }}>
                                {selectedEmpData.perf >= 80 && (
                                    <>
                                        <li>Consider for leadership roles</li>
                                        <li>Increase responsibilities</li>
                                        <li>Share expertise with team</li>
                                    </>
                                )}
                                {selectedEmpData.perf >= 60 && selectedEmpData.perf < 80 && (
                                    <>
                                        <li>Acknowledge good performance</li>
                                        <li>Identify growth areas</li>
                                        <li>Plan development goals</li>
                                    </>
                                )}
                                {selectedEmpData.perf < 60 && (
                                    <>
                                        <li>Schedule performance review</li>
                                        <li>Provide targeted training</li>
                                        <li>Establish improvement plan</li>
                                    </>
                                )}
                            </ul>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};

export default KPIPerformanceAnalysis;
