import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Cell } from 'recharts';
import { Dialog, DialogTitle, DialogContent, Button } from '@mui/material';

/**
 * KPILeaveAnalysis - Professional Leave & Burnout Analysis
 * Executive view of employee leave patterns and burnout risks
 */

const KPILeaveAnalysis = ({ analytics = {} }) => {
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [sortBy, setSortBy] = useState('leaves');

    const leaveAnalysis = analytics.leaveAnalysis || {};

    // Combine and analyze leave data
    const leaveData = useMemo(() => {
        const combined = [...(leaveAnalysis.mostLeaves || []), ...(leaveAnalysis.leastLeaves || [])];
        const sorted = [...combined];

        switch (sortBy) {
            case 'performance':
                return sorted.sort((a, b) => (b.perf || 0) - (a.perf || 0));
            case 'burnout':
                return sorted.sort((a, b) => (a.leaves || 0) - (b.leaves || 0));
            case 'leaves':
            default:
                return sorted.sort((a, b) => (b.leaves || 0) - (a.leaves || 0));
        }
    }, [leaveAnalysis, sortBy]);

    // Assessment function
    const assessLeaveStatus = (leaves, performance) => {
        if (leaves < 2 && performance < 70) {
            return { type: 'BURNOUT_RISK', color: '#991b1b', label: 'Burnout Risk', description: 'Low leave usage + declining performance' };
        }
        if (leaves < 2 && performance >= 70) {
            return { type: 'COMMITTED', color: '#059669', label: 'High Commitment', description: 'Low leave usage with strong performance' };
        }
        if (leaves >= 5 && performance < 70) {
            return { type: 'PERFORMANCE_CONCERN', color: '#b45309', label: 'Performance Concern', description: 'High absences impacting performance' };
        }
        if (leaves >= 5 && performance >= 75) {
            return { type: 'BALANCED', color: '#0369a1', label: 'Well Balanced', description: 'Healthy work-life balance' };
        }
        return { type: 'NORMAL', color: '#6b7280', label: 'Normal', description: 'Standard leave pattern' };
    };

    // Enhanced leave data with assessments
    const enhancedLeaveData = useMemo(() => {
        return leaveData.map(emp => {
            const assessment = assessLeaveStatus(emp.leaves || 0, emp.perf || 0);
            return { ...emp, ...assessment };
        });
    }, [leaveData]);

    // Format currency
    const formatCurrency = (value) => {
        if (value >= 1000000) return `₹${(value / 100000).toFixed(1)}L`;
        if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
        return `₹${value.toFixed(0)}`;
    };

    const selectedEmpData = useMemo(() => {
        if (!selectedEmployee) return null;
        return enhancedLeaveData.find(e => e.name === selectedEmployee);
    }, [selectedEmployee, enhancedLeaveData]);

    // Chart data - Top leave takers
    const chartData = useMemo(() => {
        return enhancedLeaveData.slice(0, 10);
    }, [enhancedLeaveData]);

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
                            Leave & Burnout Analysis
                        </h2>
                        <p style={{
                            margin: '8px 0 0 0',
                            color: '#6b7280',
                            fontSize: '0.95rem',
                            fontWeight: 400
                        }}>
                            Monitor employee leave patterns and identify burnout risks
                        </p>
                    </div>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            fontSize: '0.9rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            color: '#374151',
                            background: '#ffffff',
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        <option value="leaves">Sort by Leaves Taken</option>
                        <option value="performance">Sort by Performance</option>
                        <option value="burnout">Sort by Burnout Risk</option>
                    </select>
                </div>
            </div>

            {/* Risk Categories Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                {[
                    { type: 'BURNOUT_RISK', count: enhancedLeaveData.filter(e => e.type === 'BURNOUT_RISK').length, color: '#991b1b', label: 'Burnout Risk' },
                    { type: 'PERFORMANCE_CONCERN', count: enhancedLeaveData.filter(e => e.type === 'PERFORMANCE_CONCERN').length, color: '#b45309', label: 'Performance Concern' },
                    { type: 'COMMITTED', count: enhancedLeaveData.filter(e => e.type === 'COMMITTED').length, color: '#059669', label: 'High Commitment' },
                    { type: 'BALANCED', count: enhancedLeaveData.filter(e => e.type === 'BALANCED').length, color: '#0369a1', label: 'Well Balanced' }
                ].map(category => (
                    <div
                        key={category.type}
                        style={{
                            background: '#ffffff',
                            border: `1px solid ${category.color}33`,
                            backgroundColor: `${category.color}08`,
                            borderRadius: '8px',
                            padding: '16px',
                            borderLeft: `4px solid ${category.color}`
                        }}
                    >
                        <div style={{ fontSize: '0.75rem', color: category.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                            {category.label}
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: category.color }}>
                            {category.count}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 4 }}>
                            Employees
                        </div>
                    </div>
                ))}
            </div>

            {/* Leave Distribution Chart */}
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
                    Leave Distribution by Employee (Top 10)
                </h3>
                <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={chartData} layout="vertical" margin={{ left: 150 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={140} />
                        <ReTooltip
                            contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                            formatter={(value) => `${value} days`}
                        />
                        <Bar dataKey="leaves" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Employee Analysis Table */}
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
                                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Employee Name</th>
                                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Department</th>
                                <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Leaves Taken</th>
                                <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Performance</th>
                                <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Status</th>
                                <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {enhancedLeaveData.map((emp, idx) => (
                                <tr
                                    key={idx}
                                    style={{
                                        borderBottom: '1px solid #f3f4f6',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#fafbfc'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                                >
                                    <td style={{ padding: '16px 20px', color: '#111827', fontWeight: 500 }}>
                                        {emp.name}
                                    </td>
                                    <td style={{ padding: '16px 20px', color: '#6b7280' }}>
                                        {emp.dept || '-'}
                                    </td>
                                    <td style={{
                                        padding: '16px 20px',
                                        textAlign: 'center',
                                        color: emp.leaves < 2 ? '#991b1b' : emp.leaves >= 5 ? '#0369a1' : '#6b7280',
                                        fontWeight: 600
                                    }}>
                                        {emp.leaves}
                                    </td>
                                    <td style={{
                                        padding: '16px 20px',
                                        textAlign: 'right',
                                        color: emp.perf >= 75 ? '#059669' : emp.perf >= 60 ? '#0369a1' : '#991b1b',
                                        fontWeight: 600
                                    }}>
                                        {emp.perf}%
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                        <div style={{
                                            padding: '4px 12px',
                                            background: `${emp.color}08`,
                                            color: emp.color,
                                            borderRadius: '4px',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            display: 'inline-block',
                                            border: `1px solid ${emp.color}33`
                                        }}>
                                            {emp.label}
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
                                            View
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
                                    Employee Analysis
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
                                background: '#f0f9ff',
                                borderRadius: '6px',
                                border: '1px solid #bfdbfe'
                            }}>
                                <div style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                                    Leaves Taken
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 600, color: '#0369a1' }}>
                                    {selectedEmpData.leaves}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 4 }}>
                                    Days
                                </div>
                            </div>

                            <div style={{
                                padding: '16px',
                                background: selectedEmpData.perf >= 75 ? '#ecfdf5' : '#fffbeb',
                                borderRadius: '6px',
                                border: selectedEmpData.perf >= 75 ? '1px solid #d1fae5' : '1px solid #fde68a'
                            }}>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: selectedEmpData.perf >= 75 ? '#15803d' : '#b45309',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    marginBottom: 8
                                }}>
                                    Performance
                                </div>
                                <div style={{
                                    fontSize: '1.8rem',
                                    fontWeight: 600,
                                    color: selectedEmpData.perf >= 75 ? '#059669' : '#b45309'
                                }}>
                                    {selectedEmpData.perf}%
                                </div>
                            </div>
                        </div>

                        {/* Status Assessment */}
                        <div style={{
                            padding: '16px',
                            background: `${selectedEmpData.color}08`,
                            borderRadius: '6px',
                            border: `1px solid ${selectedEmpData.color}33`,
                            borderLeft: `4px solid ${selectedEmpData.color}`,
                            marginBottom: 24
                        }}>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>
                                Assessment
                            </h4>
                            <div style={{ fontSize: '1.2rem', fontWeight: 600, color: selectedEmpData.color, marginBottom: 8 }}>
                                {selectedEmpData.label}
                            </div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
                                {selectedEmpData.description}
                            </p>
                        </div>

                        {/* Recommendations */}
                        <div style={{
                            padding: '16px',
                            background: '#f9fafb',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb'
                        }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>
                                Recommendation
                            </h4>
                            <ul style={{ margin: 0, paddingLeft: 20, color: '#6b7280', fontSize: '0.9rem' }}>
                                {selectedEmpData.type === 'BURNOUT_RISK' && (
                                    <>
                                        <li>Schedule wellness check-in</li>
                                        <li>Review workload distribution</li>
                                        <li>Encourage leave usage</li>
                                    </>
                                )}
                                {selectedEmpData.type === 'PERFORMANCE_CONCERN' && (
                                    <>
                                        <li>Provide additional training</li>
                                        <li>Monitor performance closely</li>
                                        <li>Increase mentoring support</li>
                                    </>
                                )}
                                {selectedEmpData.type === 'COMMITTED' && (
                                    <>
                                        <li>Recognition and rewards</li>
                                        <li>Career growth opportunities</li>
                                        <li>Maintain engagement level</li>
                                    </>
                                )}
                                {selectedEmpData.type === 'BALANCED' && (
                                    <>
                                        <li>Maintain current approach</li>
                                        <li>Share best practices</li>
                                        <li>Potential for advancement</li>
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

export default KPILeaveAnalysis;
