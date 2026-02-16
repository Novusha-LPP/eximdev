import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, ScatterChart, Scatter, Cell } from 'recharts';
import { Dialog, DialogTitle, DialogContent, Button } from '@mui/material';

/**
 * KPIRiskAnalysis - Executive Risk Assessment Dashboard
 * Identifies and tracks high-risk cases and mitigation strategies
 */

const KPIRiskAnalysis = ({ analytics = {} }) => {
    const [selectedRiskCase, setSelectedRiskCase] = useState(null);
    const [riskFilter, setRiskFilter] = useState('all'); // all, critical, high, medium

    const riskMatrix = analytics.riskMatrix || {};
    const blockerImpact = analytics.blockerImpact || {};

    // Format currency
    const formatCurrency = (value) => {
        if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
        if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
        if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
        return `₹${value.toFixed(0)}`;
    };

    // Categorize risk level
    const getRiskLevel = (score) => {
        if (score >= 75) return { type: 'CRITICAL', color: '#991b1b', bg: '#fef2f2', border: '#fecaca', label: 'Critical' };
        if (score >= 60) return { type: 'HIGH', color: '#b45309', bg: '#fffbeb', border: '#fde68a', label: 'High' };
        if (score >= 40) return { type: 'MEDIUM', color: '#d97706', bg: '#fef3c7', border: '#fcd34d', label: 'Medium' };
        return { type: 'LOW', color: '#059669', bg: '#ecfdf5', border: '#d1fae5', label: 'Low' };
    };

    // Prepare risk data with categorization
    const riskCases = useMemo(() => {
        const cases = Object.entries(riskMatrix || {}).map(([dept, data]) => ({
            department: dept,
            riskScore: data.riskScore || 0,
            performanceGap: data.performanceGap || 0,
            businessImpact: data.businessImpact || 0,
            employeeCount: data.employeeCount || 0,
            riskLevel: getRiskLevel(data.riskScore || 0)
        }));

        // Filter by risk level
        if (riskFilter === 'all') return cases;
        return cases.filter(c => c.riskLevel.type === riskFilter);
    }, [riskMatrix, riskFilter]);

    // Prepare blocker impact data
    const topBlockers = useMemo(() => {
        if (!blockerImpact || !blockerImpact.top) return [];
        return blockerImpact.top.map(blocker => ({
            ...blocker,
            loss: blocker.totalLoss || 0,
            count: blocker.occurrences || 0
        })).slice(0, 8);
    }, [blockerImpact]);

    // Risk distribution for chart
    const riskDistribution = useMemo(() => {
        const dist = {
            critical: riskCases.filter(c => c.riskLevel.type === 'CRITICAL').length,
            high: riskCases.filter(c => c.riskLevel.type === 'HIGH').length,
            medium: riskCases.filter(c => c.riskLevel.type === 'MEDIUM').length,
            low: riskCases.filter(c => c.riskLevel.type === 'LOW').length
        };
        return [
            { name: 'Critical', value: dist.critical, fill: '#991b1b' },
            { name: 'High', value: dist.high, fill: '#b45309' },
            { name: 'Medium', value: dist.medium, fill: '#d97706' },
            { name: 'Low', value: dist.low, fill: '#059669' }
        ];
    }, [riskCases]);

    // Get selected risk case data
    const selectedRiskData = useMemo(() => {
        if (!selectedRiskCase) return null;
        return riskCases.find(c => c.department === selectedRiskCase);
    }, [selectedRiskCase, riskCases]);

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
                            Risk & Issue Analysis
                        </h2>
                        <p style={{
                            margin: '8px 0 0 0',
                            color: '#6b7280',
                            fontSize: '0.95rem',
                            fontWeight: 400
                        }}>
                            Monitor risk factors and identify mitigation priorities
                        </p>
                    </div>
                    <select
                        value={riskFilter}
                        onChange={(e) => setRiskFilter(e.target.value)}
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
                        <option value="all">All Risk Levels</option>
                        <option value="CRITICAL">Critical Only</option>
                        <option value="HIGH">High & Critical</option>
                        <option value="MEDIUM">Medium & Above</option>
                    </select>
                </div>
            </div>

            {/* Risk Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                {[
                    { level: 'CRITICAL', color: '#991b1b', bg: '#fef2f2', border: '#fecaca', count: riskCases.filter(c => c.riskLevel.type === 'CRITICAL').length },
                    { level: 'HIGH', color: '#b45309', bg: '#fffbeb', border: '#fde68a', count: riskCases.filter(c => c.riskLevel.type === 'HIGH').length },
                    { level: 'MEDIUM', color: '#d97706', bg: '#fef3c7', border: '#fcd34d', count: riskCases.filter(c => c.riskLevel.type === 'MEDIUM').length },
                    { level: 'LOW', color: '#059669', bg: '#ecfdf5', border: '#d1fae5', count: riskCases.filter(c => c.riskLevel.type === 'LOW').length }
                ].map(card => (
                    <div
                        key={card.level}
                        style={{
                            background: card.bg,
                            border: `1px solid ${card.border}`,
                            borderRadius: '8px',
                            padding: '16px',
                            borderLeft: `4px solid ${card.color}`
                        }}
                    >
                        <div style={{ fontSize: '0.75rem', color: card.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                            {card.level}
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: card.color }}>
                            {card.count}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 4 }}>
                            Cases Identified
                        </div>
                    </div>
                ))}
            </div>

            {/* Risk Matrix Chart */}
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
                    Risk Score by Department
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={riskCases.slice(0, 12)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                        <ReTooltip
                            contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                            formatter={(value) => `${value}/100`}
                        />
                        <Bar dataKey="riskScore" fill="#0369a1" radius={[4, 4, 0, 0]}>
                            {riskCases.slice(0, 12).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.riskLevel.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Top Blockers by Impact */}
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
                    Top Blockers by Business Impact
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topBlockers} layout="vertical" margin={{ left: 200 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(value) => formatCurrency(value)} />
                        <YAxis dataKey="blocker" type="category" tick={{ fontSize: 9 }} width={190} />
                        <ReTooltip
                            contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                            formatter={(value) => formatCurrency(value)}
                        />
                        <Bar dataKey="loss" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Risk Cases Table */}
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
                                <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Department</th>
                                <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Risk Score</th>
                                <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Performance Gap</th>
                                <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Business Impact</th>
                                <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Employees</th>
                                <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Level</th>
                                <th style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {riskCases.map((risk, idx) => (
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
                                        {risk.department}
                                    </td>
                                    <td style={{
                                        padding: '16px 20px',
                                        textAlign: 'right',
                                        color: risk.riskLevel.color,
                                        fontWeight: 600
                                    }}>
                                        {risk.riskScore}/100
                                    </td>
                                    <td style={{
                                        padding: '16px 20px',
                                        textAlign: 'right',
                                        color: '#6b7280'
                                    }}>
                                        {risk.performanceGap}%
                                    </td>
                                    <td style={{
                                        padding: '16px 20px',
                                        textAlign: 'right',
                                        color: '#6b7280'
                                    }}>
                                        {formatCurrency(risk.businessImpact)}
                                    </td>
                                    <td style={{
                                        padding: '16px 20px',
                                        textAlign: 'center',
                                        color: '#374151'
                                    }}>
                                        {risk.employeeCount}
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                        <div style={{
                                            padding: '4px 12px',
                                            background: risk.riskLevel.bg,
                                            color: risk.riskLevel.color,
                                            borderRadius: '4px',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            display: 'inline-block',
                                            border: `1px solid ${risk.riskLevel.border}`
                                        }}>
                                            {risk.riskLevel.label}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => setSelectedRiskCase(risk.department)}
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

            {/* Risk Case Detail Modal */}
            {selectedRiskData && (
                <Dialog open={!!selectedRiskCase} onClose={() => setSelectedRiskCase(null)} maxWidth="md" fullWidth>
                    <DialogTitle style={{
                        padding: '20px',
                        borderBottom: '1px solid #e5e7eb',
                        background: '#f9fafb'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Risk Assessment
                                </div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginTop: 4 }}>
                                    {selectedRiskData.department}
                                </div>
                            </div>
                            <Button onClick={() => setSelectedRiskCase(null)} size="small">Close</Button>
                        </div>
                    </DialogTitle>
                    <DialogContent style={{ padding: '20px' }}>
                        {/* Risk Level Indicator */}
                        <div style={{
                            padding: '16px',
                            background: selectedRiskData.riskLevel.bg,
                            border: `1px solid ${selectedRiskData.riskLevel.border}`,
                            borderLeft: `4px solid ${selectedRiskData.riskLevel.color}`,
                            borderRadius: '8px',
                            marginBottom: 24
                        }}>
                            <div style={{ fontSize: '0.75rem', color: selectedRiskData.riskLevel.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                                Risk Level
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: selectedRiskData.riskLevel.color, marginBottom: 8 }}>
                                {selectedRiskData.riskLevel.label}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                                Score: <strong>{selectedRiskData.riskScore}/100</strong>
                            </div>
                        </div>

                        {/* Risk Factors Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
                            <div style={{
                                padding: '16px',
                                background: '#f0f9ff',
                                borderRadius: '6px',
                                border: '1px solid #bfdbfe'
                            }}>
                                <div style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                                    Performance Gap
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 600, color: '#0369a1' }}>
                                    {selectedRiskData.performanceGap}%
                                </div>
                            </div>

                            <div style={{
                                padding: '16px',
                                background: '#fef2f2',
                                borderRadius: '6px',
                                border: '1px solid #fecaca'
                            }}>
                                <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                                    Business Impact
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 600, color: '#991b1b' }}>
                                    {formatCurrency(selectedRiskData.businessImpact)}
                                </div>
                            </div>

                            <div style={{
                                padding: '16px',
                                background: '#f9fafb',
                                borderRadius: '6px',
                                border: '1px solid #e5e7eb'
                            }}>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                                    Employees Affected
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 600, color: '#374151' }}>
                                    {selectedRiskData.employeeCount}
                                </div>
                            </div>

                            <div style={{
                                padding: '16px',
                                background: '#fef3c7',
                                borderRadius: '6px',
                                border: '1px solid #fcd34d'
                            }}>
                                <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                                    Priority
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#b45309' }}>
                                    {selectedRiskData.riskScore >= 75 ? 'Immediate' : selectedRiskData.riskScore >= 60 ? 'High' : selectedRiskData.riskScore >= 40 ? 'Medium' : 'Low'}
                                </div>
                            </div>
                        </div>

                        {/* Mitigation Strategy */}
                        <div style={{
                            padding: '16px',
                            background: '#f9fafb',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb'
                        }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>
                                Recommended Actions
                            </h4>
                            <ul style={{ margin: 0, paddingLeft: 20, color: '#6b7280', fontSize: '0.9rem' }}>
                                {selectedRiskData.riskScore >= 75 && (
                                    <>
                                        <li>Immediate escalation to senior management</li>
                                        <li>Form task force for mitigation</li>
                                        <li>Daily monitoring and reporting</li>
                                        <li>Consider external support/resources</li>
                                    </>
                                )}
                                {selectedRiskData.riskScore >= 60 && selectedRiskData.riskScore < 75 && (
                                    <>
                                        <li>Schedule department-level review</li>
                                        <li>Identify root causes of performance gap</li>
                                        <li>Develop improvement plan</li>
                                        <li>Weekly progress monitoring</li>
                                    </>
                                )}
                                {selectedRiskData.riskScore >= 40 && selectedRiskData.riskScore < 60 && (
                                    <>
                                        <li>Routine monitoring and support</li>
                                        <li>Training and skill development</li>
                                        <li>Process optimization</li>
                                        <li>Bi-weekly progress check</li>
                                    </>
                                )}
                                {selectedRiskData.riskScore < 40 && (
                                    <>
                                        <li>Maintain current performance level</li>
                                        <li>Share best practices with other departments</li>
                                        <li>Monthly reviews</li>
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

export default KPIRiskAnalysis;
