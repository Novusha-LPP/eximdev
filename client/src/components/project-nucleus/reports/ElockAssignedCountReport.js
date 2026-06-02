import React, { useState, useEffect, useMemo } from 'react';
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
                    totalAssignedCount: inner.totalAssignedCount ?? arr.reduce((acc, curr) => acc + (curr.totalCount ?? curr.count ?? 0), 0)
                });
            } catch (err) {
                console.error('Error fetching elock assigned count:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAssigned();
    }, [filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay, elockDashFilterType]);

    const stats = useMemo(() => {
        const partiesCount = Array.isArray(elockAssigned) ? elockAssigned.length : 0;
        const prAssigned = elockAssignedSummary.prAssignedCount ?? 0;
        const othersAssigned = elockAssignedSummary.othersAssignedCount ?? 0;
        const totalAssigned = elockAssignedSummary.totalAssignedCount ?? (prAssigned + othersAssigned);
        
        const srccPercent = totalAssigned > 0 ? ((prAssigned / totalAssigned) * 100).toFixed(1) : '0.0';
        const othersPercent = totalAssigned > 0 ? ((othersAssigned / totalAssigned) * 100).toFixed(1) : '0.0';

        return {
            partiesCount,
            prAssigned,
            othersAssigned,
            totalAssigned,
            srccPercent,
            othersPercent
        };
    }, [elockAssigned, elockAssignedSummary]);

    if (loading) {
        return (
            <div className="report-root-container">
                <style>{`
                    .nucleus-loading-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 80px 20px;
                        background: rgba(255, 255, 255, 0.5);
                        backdrop-filter: blur(20px);
                        border-radius: 24px;
                    }
                    .nucleus-loader {
                        width: 48px;
                        height: 48px;
                        border: 3px solid rgba(102, 126, 234, 0.2);
                        border-top-color: #667eea;
                        border-radius: 50%;
                        animation: spin 0.8s linear infinite;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
                <div className="nucleus-loading-container">
                    <div className="nucleus-loader"></div>
                    <div style={{ marginTop: '1.5rem', color: '#1e293b', fontWeight: 600 }}>Loading report details...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="report-root-container">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
                
                .report-root-container {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    display: flex;
                    flex-direction: column;
                    gap: 28px;
                    padding: 0;
                    background: transparent;
                }
                
                .nucleus-stats-card {
                    background: rgba(255, 255, 255, 0.8);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04), 0 1px 4px rgba(0, 0, 0, 0.02);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                    position: relative;
                }
                
                .nucleus-stats-card::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
                }
                
                .nucleus-stats-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
                }
                
                .nucleus-table-wrapper {
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04);
                    overflow: hidden;
                }
                
                .nucleus-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                }
                
                .nucleus-table th {
                    background: linear-gradient(180deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.9) 100%);
                    color: #0f172a;
                    font-weight: 800;
                    font-size: 13.5px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    padding: 16px 20px;
                    border-bottom: 1px solid rgba(226, 232, 240, 0.6);
                    white-space: nowrap;
                }
                
                .nucleus-table td {
                    color: #1e293b;
                    font-weight: 600;
                    font-size: 14.5px;
                    padding: 14px 20px;
                    border-bottom: 1px solid rgba(226, 232, 240, 0.4);
                    transition: background 0.2s;
                }
                
                .nucleus-table tr:hover td {
                    background: rgba(102, 126, 234, 0.04);
                }
                
                .nucleus-table tr:last-child td {
                    border-bottom: none;
                }
                
                .mono-text {
                    font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
                }

                .filter-pill {
                    padding: 8px 20px;
                    border: 1px solid rgba(226, 232, 240, 0.8);
                    border-radius: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    font-size: 13px;
                    text-transform: uppercase;
                    letter-spacing: 0.03em;
                    transition: all 0.2s;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.01);
                }

                .filter-pill.active {
                    background: #6366f1;
                    color: #fff;
                    border-color: #6366f1;
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
                }

                .filter-pill:not(.active) {
                    background: #fff;
                    color: #64748b;
                }

                .filter-pill:not(.active):hover {
                    background: #f8fafc;
                    color: #0f172a;
                    border-color: #cbd5e1;
                }
            `}</style>

            {/* KPI Stats Cards (CR-007) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                {[
                    { label: 'Parties Count', value: stats.partiesCount, color: '#6366f1', gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 0.02))' },
                    { label: 'SRCC Assigned', value: stats.prAssigned, color: '#8b5cf6', gradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.02))' },
                    { label: 'Others Assigned', value: stats.othersAssigned, color: '#f59e0b', gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.02))' },
                    { label: 'Total Assigned', value: stats.totalAssigned, color: '#10b981', gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.02))' },
                    { label: 'SRCC Assignment %', value: `${stats.srccPercent}%`, color: '#8b5cf6', gradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.02))' },
                    { label: 'Others Assignment %', value: `${stats.othersPercent}%`, color: '#f59e0b', gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.02))' }
                ].map((m, idx) => (
                    <div key={idx} className="nucleus-stats-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '8px', background: m.gradient }}>
                        <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{m.label}</div>
                        <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a' }} className="mono-text">{m.value}</div>
                    </div>
                ))}
            </div>

            {/* Custom Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', background: 'rgba(255,255,255,0.4)', padding: '12px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)' }}>
                <span style={{ fontSize: '13.5px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Group Assignment:</span>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {['consignee', 'consignor'].map(ft => (
                        <button
                            key={ft}
                            onClick={() => setElockDashFilterType(ft)}
                            className={`filter-pill ${elockDashFilterType === ft ? 'active' : ''}`}
                        >
                            {ft}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="nucleus-table-wrapper">
                <table className="nucleus-table">
                    <thead>
                        <tr>
                            <th style={{ width: '80px' }}>#</th>
                            <th>Party Name</th>
                            <th style={{ textAlign: 'right' }}>PR Assigned</th>
                            <th style={{ textAlign: 'right' }}>Others Assigned</th>
                            <th style={{ textAlign: 'right' }}>Total Assigned</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.isArray(elockAssigned) && elockAssigned.length > 0 ? (
                            elockAssigned.map((row, i) => {
                                const prCount = row.prCount ?? 0;
                                const othersCount = row.othersCount ?? 0;
                                const totalCount = row.totalCount ?? row.count ?? (prCount + othersCount);

                                return (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 500, color: '#64748b' }} className="mono-text">{i + 1}</td>
                                        <td style={{ fontWeight: 700, color: '#0f172a' }}>
                                            {row.partyName ?? row.party_name ?? row.consignee ?? row.consignor ?? row.name ?? '—'}
                                        </td>
                                        <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 600, color: '#475569' }} className="mono-text">{prCount}</td>
                                        <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 600, color: '#475569' }} className="mono-text">{othersCount}</td>
                                        <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 800, color: '#6366f1', fontSize: '15px' }} className="mono-text">{totalCount}</td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: '40px', fontWeight: 500 }}>
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

