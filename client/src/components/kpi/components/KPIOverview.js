import React, { useMemo } from 'react';
import {
    BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
    Tooltip as ReTooltip, ResponsiveContainer
} from 'recharts';

/**
 * KPIOverview - Executive Dashboard Overview
 * Professional KPI summary with key metrics
 */

const KPIOverview = ({ analytics = {}, summary = {} }) => {
    const comprehensiveAnalytics = analytics;

    // Format currency
    const formatCurrency = (value) => {
        if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
        if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
        if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
        return `₹${value.toFixed(0)}`;
    };

    // Status indicators with subtle colors
    const getMetricStatus = (value, metric) => {
        switch (metric) {
            case 'performance':
                if (value >= 75) return { color: '#059669', label: 'Excellent' };
                if (value >= 60) return { color: '#0369a1', label: 'Good' };
                if (value >= 45) return { color: '#b45309', label: 'At Risk' };
                return { color: '#991b1b', label: 'Critical' };
            case 'blockers':
                if (value < 15) return { color: '#059669', label: 'Healthy' };
                if (value < 30) return { color: '#b45309', label: 'Watch' };
                return { color: '#991b1b', label: 'High' };
            case 'approval':
                if (value >= 90) return { color: '#059669', label: 'Excellent' };
                if (value >= 75) return { color: '#0369a1', label: 'Good' };
                return { color: '#b45309', label: 'Review' };
            default:
                return { color: '#475569', label: 'Info' };
        }
    };

    const perfStatus = getMetricStatus(comprehensiveAnalytics.summary?.avgPerf || 0, 'performance');
    const blockerStatus = getMetricStatus(comprehensiveAnalytics.summary?.blockerRate || 0, 'blockers');
    const approvalStatus = getMetricStatus(comprehensiveAnalytics.summary?.approvalRate || 0, 'approval');

    return (
        <div style={{ display: 'grid', gap: 32 }}>
            {/* Section Header */}
            <div style={{
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: 24
            }}>
                <h2 style={{
                    margin: 0,
                    fontSize: '1.75rem',
                    fontWeight: 600,
                    color: '#111827',
                    letterSpacing: '-0.5px'
                }}>
                    KPI Dashboard Overview
                </h2>
                <p style={{
                    margin: '8px 0 0 0',
                    color: '#6b7280',
                    fontSize: '0.95rem',
                    fontWeight: 400
                }}>
                    Executive summary of key performance indicators
                </p>
            </div>

            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
                {/* Total Sheets Card */}
                <div style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '20px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: 8
                        }}>
                            Total Sheets
                        </div>
                        <div style={{
                            fontSize: '2.5rem',
                            fontWeight: 700,
                            color: '#111827',
                            marginBottom: 8
                        }}>
                            {comprehensiveAnalytics.summary?.total || 0}
                        </div>
                        <div style={{
                            fontSize: '0.85rem',
                            color: '#6b7280'
                        }}>
                            In selected period
                        </div>
                    </div>
                    <div style={{
                        position: 'absolute',
                        top: -10,
                        right: -10,
                        width: 80,
                        height: 80,
                        background: '#f3f4f6',
                        borderRadius: '50%',
                        opacity: 0.3
                    }} />
                </div>

                {/* Performance Card */}
                <div style={{
                    background: '#ffffff',
                    border: `1px solid ${perfStatus.color}33`,
                    backgroundColor: `${perfStatus.color}08`,
                    borderRadius: '8px',
                    padding: '20px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{
                            fontSize: '0.75rem',
                            color: perfStatus.color,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: 8
                        }}>
                            Average Performance
                        </div>
                        <div style={{
                            fontSize: '2.5rem',
                            fontWeight: 700,
                            color: perfStatus.color,
                            marginBottom: 8
                        }}>
                            {comprehensiveAnalytics.summary?.avgPerf || 0}%
                        </div>
                        <div style={{
                            fontSize: '0.85rem',
                            color: '#6b7280'
                        }}>
                            Status: <strong style={{ color: perfStatus.color }}>{perfStatus.label}</strong>
                        </div>
                    </div>
                    <div style={{
                        position: 'absolute',
                        top: -10,
                        right: -10,
                        width: 80,
                        height: 80,
                        background: perfStatus.color,
                        borderRadius: '50%',
                        opacity: 0.1
                    }} />
                </div>

                {/* Business Loss Card */}
                <div style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '20px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: 8
                        }}>
                            Total Business Loss
                        </div>
                        <div style={{
                            fontSize: '2.5rem',
                            fontWeight: 700,
                            color: '#991b1b',
                            marginBottom: 8
                        }}>
                            {formatCurrency(comprehensiveAnalytics.summary?.totalLoss || 0)}
                        </div>
                        <div style={{
                            fontSize: '0.85rem',
                            color: '#6b7280'
                        }}>
                            Avg: {formatCurrency((comprehensiveAnalytics.summary?.avgLoss || 0))} per sheet
                        </div>
                    </div>
                    <div style={{
                        position: 'absolute',
                        top: -10,
                        right: -10,
                        width: 80,
                        height: 80,
                        background: '#fecaca',
                        borderRadius: '50%',
                        opacity: 0.3
                    }} />
                </div>

                {/* Blockers Rate Card */}
                <div style={{
                    background: '#ffffff',
                    border: `1px solid ${blockerStatus.color}33`,
                    backgroundColor: `${blockerStatus.color}08`,
                    borderRadius: '8px',
                    padding: '20px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{
                            fontSize: '0.75rem',
                            color: blockerStatus.color,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: 8
                        }}>
                            Blockers Rate
                        </div>
                        <div style={{
                            fontSize: '2.5rem',
                            fontWeight: 700,
                            color: blockerStatus.color,
                            marginBottom: 8
                        }}>
                            {comprehensiveAnalytics.summary?.blockerRate || 0}%
                        </div>
                        <div style={{
                            fontSize: '0.85rem',
                            color: '#6b7280'
                        }}>
                            {comprehensiveAnalytics.summary?.blockersCount || 0} active issues
                        </div>
                    </div>
                </div>

                {/* Approval Rate Card */}
                <div style={{
                    background: '#ffffff',
                    border: `1px solid ${approvalStatus.color}33`,
                    backgroundColor: `${approvalStatus.color}08`,
                    borderRadius: '8px',
                    padding: '20px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{
                            fontSize: '0.75rem',
                            color: approvalStatus.color,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: 8
                        }}>
                            Approval Rate
                        </div>
                        <div style={{
                            fontSize: '2.5rem',
                            fontWeight: 700,
                            color: approvalStatus.color,
                            marginBottom: 8
                        }}>
                            {comprehensiveAnalytics.summary?.approvalRate || 0}%
                        </div>
                        <div style={{
                            fontSize: '0.85rem',
                            color: '#6b7280'
                        }}>
                            Status: <strong style={{ color: approvalStatus.color }}>{approvalStatus.label}</strong>
                        </div>
                    </div>
                </div>

                {/* Workload Utilization Card */}
                <div style={{
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '20px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: 8
                        }}>
                            Avg Workload
                        </div>
                        <div style={{
                            fontSize: '2.5rem',
                            fontWeight: 700,
                            color: '#0369a1',
                            marginBottom: 8
                        }}>
                            {comprehensiveAnalytics.summary?.avgWorkload || 0}%
                        </div>
                        <div style={{
                            fontSize: '0.85rem',
                            color: '#6b7280'
                        }}>
                            Utilization rate
                        </div>
                    </div>
                    <div style={{
                        position: 'absolute',
                        top: -10,
                        right: -10,
                        width: 80,
                        height: 80,
                        background: '#0369a1',
                        borderRadius: '50%',
                        opacity: 0.1
                    }} />
                </div>
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: 24 }}>
                {/* Performance Distribution Chart */}
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
                        Performance Distribution
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={comprehensiveAnalytics.performanceDistribution || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <ReTooltip
                                contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                            />
                            <Bar dataKey="count" fill="#0369a1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Status Breakdown Chart */}
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
                        Sheet Status Distribution
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={comprehensiveAnalytics.statusBreakdown || []}
                                dataKey="count"
                                nameKey="status"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label={({ status, percentage }) => `${status}: ${percentage}%`}
                            >
                                {(comprehensiveAnalytics.statusBreakdown || []).map((entry, index) => {
                                    const colorMap = {
                                        'APPROVED': '#059669',
                                        'VERIFIED': '#0369a1',
                                        'CHECKED': '#f59e0b',
                                        'SUBMITTED': '#6b7280',
                                        'REJECTED': '#991b1b'
                                    };
                                    return (
                                        <Cell key={`cell-${index}`} fill={colorMap[entry.status] || '#94a3b8'} />
                                    );
                                })}
                            </Pie>
                            <ReTooltip
                                contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default KPIOverview;
