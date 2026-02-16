import React, { useState, useMemo } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as ReTooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { Dialog, DialogTitle, DialogContent, Button } from '@mui/material';

/**
 * KPIDepartmentAnalytics - Professional Executive Dashboard
 * Clean, minimalist design suitable for C-level presentations
 */

const KPIDepartmentAnalytics = ({ departments = [], sheets = [], months = [] }) => {
    const [selectedDept, setSelectedDept] = useState(null);
    const [sortBy, setSortBy] = useState('performance');

    // Prepare enriched department data
    const departmentData = useMemo(() => {
        return departments.map((dept, idx) => {
            const healthScore = (dept.avgPerf * 0.5) + ((100 - dept.blockerRate) * 0.3) + (dept.approvalRate * 0.2);

            return {
                ...dept,
                healthScore: Math.round(healthScore),
                rank: idx + 1,
                status: healthScore >= 75 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 45 ? 'At Risk' : 'Critical'
            };
        });
    }, [departments]);

    // Sorted departments
    const sortedData = useMemo(() => {
        const sorted = [...departmentData];
        switch (sortBy) {
            case 'loss':
                return sorted.sort((a, b) => b.totalLoss - a.totalLoss);
            case 'count':
                return sorted.sort((a, b) => b.count - a.count);
            case 'performance':
            default:
                return sorted.sort((a, b) => b.avgPerf - a.avgPerf);
        }
    }, [departmentData, sortBy]);

    // Get department details
    const selectedDeptData = useMemo(() => {
        if (!selectedDept) return null;
        const dept = departmentData.find(d => d.name === selectedDept);
        if (!dept) return null;

        const deptSheets = sheets.filter(s => s.department === selectedDept);
        const performers = deptSheets
            .sort((a, b) => (b.summary?.overall_percentage || 0) - (a.summary?.overall_percentage || 0))
            .slice(0, 5)
            .map(s => ({
                name: `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim(),
                perf: s.summary?.overall_percentage || 0,
                loss: s.summary?.business_loss || 0
            }));

        return { ...dept, performers, sheetCount: deptSheets.length };
    }, [selectedDept, departmentData, sheets]);

    // Format currency
    const formatCurrency = (value) => {
        if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
        if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
        if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
        return `₹${value.toFixed(0)}`;
    };

    // Get status styling (subtle, professional)
    const getStatusStyle = (status) => {
        switch (status) {
            case 'Excellent':
                return { color: '#059669', bg: '#ecfdf5', border: '#d1fae5' };
            case 'Good':
                return { color: '#0369a1', bg: '#f0f9ff', border: '#bfdbfe' };
            case 'At Risk':
                return { color: '#b45309', bg: '#fffbeb', border: '#fde68a' };
            case 'Critical':
                return { color: '#7f1d1d', bg: '#fef2f2', border: '#fecaca' };
            default:
                return { color: '#475569', bg: '#f8fafc', border: '#e2e8f0' };
        }
    };

    return (
        <div style={{ display: 'grid', gap: 32 }}>
            {/* Section Header */}
            <div style={{
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: 24
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{
                            margin: 0,
                            fontSize: '1.75rem',
                            fontWeight: 600,
                            color: '#111827',
                            letterSpacing: '-0.5px'
                        }}>
                            Department Performance Analysis
                        </h2>
                        <p style={{
                            margin: '8px 0 0 0',
                            color: '#6b7280',
                            fontSize: '0.95rem',
                            fontWeight: 400
                        }}>
                            Key metrics and performance indicators across departments
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
                        <option value="performance">Sort by Performance</option>
                        <option value="loss">Sort by Loss</option>
                        <option value="count">Sort by Volume</option>
                    </select>
                </div>
            </div>

            {/* Main Table - Professional Executive View */}
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
                                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Department</th>
                                <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Performance</th>
                                <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Total Loss</th>
                                <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Avg Loss</th>
                                <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Blockers</th>
                                <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Approval</th>
                                <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Volume</th>
                                <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Status</th>
                                <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedData.map((dept) => {
                                const statusStyle = getStatusStyle(dept.status);
                                return (
                                    <tr
                                        key={dept.name}
                                        style={{
                                            borderBottom: '1px solid #f3f4f6',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#fafbfc'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                                    >
                                        <td style={{ padding: '16px 20px', color: '#6b7280', fontWeight: 500 }}>#{dept.rank}</td>
                                        <td style={{ padding: '16px 20px', color: '#111827', fontWeight: 500 }}>{dept.name}</td>
                                        <td style={{
                                            padding: '16px 20px',
                                            textAlign: 'right',
                                            color: dept.avgPerf >= 75 ? '#059669' : dept.avgPerf >= 60 ? '#0369a1' : '#7f1d1d',
                                            fontWeight: 600,
                                            fontSize: '0.95rem'
                                        }}>
                                            {dept.avgPerf}%
                                        </td>
                                        <td style={{
                                            padding: '16px 20px',
                                            textAlign: 'right',
                                            color: '#111827',
                                            fontWeight: 500
                                        }}>
                                            {formatCurrency(dept.totalLoss)}
                                        </td>
                                        <td style={{
                                            padding: '16px 20px',
                                            textAlign: 'right',
                                            color: '#6b7280'
                                        }}>
                                            {formatCurrency(dept.avgLoss)}
                                        </td>
                                        <td style={{
                                            padding: '16px 20px',
                                            textAlign: 'right',
                                            color: dept.blockerRate > 30 ? '#7f1d1d' : dept.blockerRate > 15 ? '#b45309' : '#059669',
                                            fontWeight: 500
                                        }}>
                                            {dept.blockerRate}%
                                        </td>
                                        <td style={{
                                            padding: '16px 20px',
                                            textAlign: 'right',
                                            color: '#059669',
                                            fontWeight: 500
                                        }}>
                                            {dept.approvalRate}%
                                        </td>
                                        <td style={{
                                            padding: '16px 20px',
                                            textAlign: 'center',
                                            color: '#374151',
                                            fontWeight: 500
                                        }}>
                                            {dept.count}
                                        </td>
                                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                            <div style={{
                                                padding: '4px 12px',
                                                background: statusStyle.bg,
                                                color: statusStyle.color,
                                                borderRadius: '4px',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                display: 'inline-block',
                                                border: `1px solid ${statusStyle.border}`
                                            }}>
                                                {dept.status}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => setSelectedDept(dept.name)}
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
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Key Metrics Summary Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Performance Comparison */}
                <div style={{
                    background: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
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
                        Department Performance
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={sortedData.slice(0, 8)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <ReTooltip
                                contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                                formatter={(value) => `${value}%`}
                            />
                            <Bar dataKey="avgPerf" fill="#0369a1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Business Loss Analysis */}
                <div style={{
                    background: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
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
                        Total Business Loss
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={sortedData.slice(0, 8).sort((a, b) => b.totalLoss - a.totalLoss)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => formatCurrency(value)} />
                            <ReTooltip
                                contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                                formatter={(value) => formatCurrency(value)}
                            />
                            <Bar dataKey="totalLoss" fill="#dc2626" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Department Detail Modal */}
            {selectedDeptData && (
                <Dialog open={!!selectedDept} onClose={() => setSelectedDept(null)} maxWidth="md" fullWidth>
                    <DialogTitle style={{
                        padding: '20px',
                        borderBottom: '1px solid #e5e7eb',
                        background: '#f9fafb'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Department Details
                                </div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginTop: 4 }}>
                                    {selectedDept}
                                </div>
                            </div>
                            <Button onClick={() => setSelectedDept(null)} size="small">Close</Button>
                        </div>
                    </DialogTitle>
                    <DialogContent style={{ padding: '20px' }}>
                        {/* Key Metrics Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 24 }}>
                            <div style={{
                                padding: '16px',
                                background: '#f0f9ff',
                                borderRadius: '6px',
                                border: '1px solid #bfdbfe'
                            }}>
                                <div style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Performance</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 600, color: '#0369a1' }}>
                                    {selectedDeptData.avgPerf}%
                                </div>
                            </div>

                            <div style={{
                                padding: '16px',
                                background: '#fef2f2',
                                borderRadius: '6px',
                                border: '1px solid #fecaca'
                            }}>
                                <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Total Loss</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 600, color: '#dc2626' }}>
                                    {formatCurrency(selectedDeptData.totalLoss)}
                                </div>
                            </div>

                            <div style={{
                                padding: '16px',
                                background: '#fffbeb',
                                borderRadius: '6px',
                                border: '1px solid #fde68a'
                            }}>
                                <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Blockers</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 600, color: '#b45309' }}>
                                    {selectedDeptData.blockerRate}%
                                </div>
                            </div>

                            <div style={{
                                padding: '16px',
                                background: '#ecfdf5',
                                borderRadius: '6px',
                                border: '1px solid #d1fae5'
                            }}>
                                <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Approval Rate</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 600, color: '#059669' }}>
                                    {selectedDeptData.approvalRate}%
                                </div>
                            </div>
                        </div>

                        {/* Top Performers */}
                        {selectedDeptData.performers && selectedDeptData.performers.length > 0 && (
                            <div style={{ marginBottom: 24 }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>Top Performers</h4>
                                <div style={{ display: 'grid', gap: 12 }}>
                                    {selectedDeptData.performers.map((emp, i) => (
                                        <div key={i} style={{
                                            padding: '12px',
                                            background: '#f9fafb',
                                            borderRadius: '6px',
                                            borderLeft: '3px solid #059669',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 500, color: '#111827' }}>{emp.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>Performance: {emp.perf}%</div>
                                            </div>
                                            <div style={{ textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                                                {formatCurrency(emp.loss)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Summary Section */}
                        <div style={{
                            padding: '16px',
                            background: '#f9fafb',
                            borderRadius: '6px',
                            borderLeft: '3px solid #0369a1'
                        }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>Summary</h4>
                            <ul style={{ margin: 0, paddingLeft: 20, color: '#6b7280', fontSize: '0.9rem' }}>
                                <li style={{ marginBottom: 8 }}>Total Sheets: <strong style={{ color: '#111827' }}>{selectedDeptData.sheetCount}</strong></li>
                                <li style={{ marginBottom: 8 }}>Average Loss: <strong style={{ color: '#111827' }}>{formatCurrency(selectedDeptData.avgLoss)}</strong></li>
                                <li style={{ marginBottom: 8 }}>Health Score: <strong style={{ color: '#111827' }}>{selectedDeptData.healthScore}/100</strong></li>
                                <li>Status: <strong style={{
                                    color: selectedDeptData.status === 'Excellent' ? '#059669' :
                                           selectedDeptData.status === 'Good' ? '#0369a1' :
                                           selectedDeptData.status === 'At Risk' ? '#b45309' : '#991b1b'
                                }}>
                                    {selectedDeptData.status}
                                </strong></li>
                            </ul>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};

export default KPIDepartmentAnalytics;
