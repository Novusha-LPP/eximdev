import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getTransportDates, TRANSPORT_BASE, TRANSPORT_HEADERS } from './reports-helper';

const ElockAssignedCountReport = ({
    filterType,
    selectedMonth,
    selectedYear,
    selectedQuarter,
    dateRange,
    selectedDay
}) => {
    const [elockAssigned, setElockAssigned] = useState([]);
    const [elockAssignedSummary, setElockAssignedSummary] = useState({});
    const [loading, setLoading] = useState(true);
    const [elockDashFilterType, setElockDashFilterType] = useState('consignee'); // consignee | consignor

    useEffect(() => {
        const fetchAssigned = async () => {
            setLoading(true);
            try {
                const { startDate: from, endDate: to } = getTransportDates(
                    filterType,
                    selectedDay,
                    selectedYear,
                    selectedMonth,
                    selectedQuarter,
                    dateRange
                );
                if (!from || !to) {
                    setLoading(false);
                    return;
                }
                const url = `${TRANSPORT_BASE}/api/client-elock-dashboard/assigned-count`;
                const res = await axios.get(url, {
                    params: { from, to, filterType: elockDashFilterType },
                    headers: TRANSPORT_HEADERS,
                    withCredentials: true
                });
                const raw = res.data;
                const inner = raw?.data ?? {};
                const arr = Array.isArray(inner?.byParty) ? inner.byParty : [];
                setElockAssigned(arr);
                setElockAssignedSummary({
                    prAssignedCount: inner.prAssignedCount ?? 0,
                    othersAssignedCount: inner.othersAssignedCount ?? 0,
                    totalAssignedCount: inner.totalAssignedCount ?? arr.length
                });
            } catch (err) {
                console.error('Error fetching elock assigned count:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAssigned();
    }, [filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay, elockDashFilterType]);

    if (loading) {
        return (
            <div className="nucleus-loading-container">
                <div className="nucleus-loader"></div>
                <div style={{ marginTop: '1rem', color: '#6b7280' }}>Loading report details...</div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Stats Card */}
            <div className="nucleus-stats-card" style={{ borderLeft: '4px solid #3b82f6', background: 'linear-gradient(90deg, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.01) 100%)' }}>
                <div className="stats-text" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                    <div>Parties: <span className="highlight-val" style={{ color: '#3b82f6' }}>{Array.isArray(elockAssigned) ? elockAssigned.length : 0}</span></div>
                    <div>PR Assigned: <span className="highlight-val" style={{ color: '#8b5cf6' }}>{elockAssignedSummary.prAssignedCount ?? 0}</span></div>
                    <div>Others Assigned: <span className="highlight-val" style={{ color: '#f59e0b' }}>{elockAssignedSummary.othersAssignedCount ?? 0}</span></div>
                    <div>Total Assigned: <span className="highlight-val" style={{ color: '#10b981' }}>{elockAssignedSummary.totalAssignedCount ?? 0}</span></div>
                </div>
            </div>

            {/* Custom Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Filter by:</span>
                {['consignee', 'consignor'].map(ft => (
                    <button
                        key={ft}
                        onClick={() => setElockDashFilterType(ft)}
                        style={{
                            padding: '6px 16px',
                            border: `1px solid ${elockDashFilterType === ft ? '#3b82f6' : '#e2e8f0'}`,
                            borderRadius: '8px',
                            background: elockDashFilterType === ft ? '#3b82f610' : '#fff',
                            color: elockDashFilterType === ft ? '#3b82f6' : '#64748b',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '13px',
                            textTransform: 'capitalize'
                        }}
                    >
                        {ft}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc' }}>
                            {['#', 'Party Name', 'PR Assigned', 'Others Assigned', 'Total Assigned'].map((h, i) => (
                                <th
                                    key={i}
                                    style={{
                                        padding: '11px 14px',
                                        textAlign: i >= 2 ? 'right' : 'left',
                                        color: '#64748b',
                                        fontWeight: 600,
                                        borderBottom: '2px solid #e2e8f0',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.isArray(elockAssigned) && elockAssigned.length > 0 ? (
                            elockAssigned.map((row, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                    <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{i + 1}</td>
                                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{row.partyName ?? row.party_name ?? row.consignee ?? row.consignor ?? row.name ?? '—'}</td>
                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>{row.prCount ?? 0}</td>
                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>{row.othersCount ?? 0}</td>
                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#3b82f6', fontSize: '15px' }}>{row.totalCount ?? row.count ?? 0}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                                    No e-lock assignment data found for the selected period.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ElockAssignedCountReport;
