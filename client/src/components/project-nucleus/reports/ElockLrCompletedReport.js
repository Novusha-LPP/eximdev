import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { getTransportDates, TRANSPORT_BASE, TRANSPORT_HEADERS } from './reports-helper';

const ElockLrCompletedReport = ({
    filterType,
    selectedMonth,
    selectedYear,
    selectedQuarter,
    dateRange,
    selectedDay
}) => {
    const [closedLRs, setClosedLRs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeGroupTab, setActiveGroupTab] = useState('consignee'); // consignee | consignor | port

    useEffect(() => {
        const fetchLrs = async () => {
            setLoading(true);
            try {
                const { startDate, endDate } = getTransportDates(
                    filterType,
                    selectedDay,
                    selectedYear,
                    selectedMonth,
                    selectedQuarter,
                    dateRange
                );
                
                const params = {};
                if (startDate) params.startDate = startDate;
                if (endDate) params.endDate = endDate;

                // CR-005: Query the exact same live operational dispatch range data source
                const res = await axios.get(`${TRANSPORT_BASE}/api/vehicle-dsr/dispatch-range`, {
                    params,
                    headers: TRANSPORT_HEADERS,
                    withCredentials: true
                });

                if (res.data && res.data.success) {
                    setClosedLRs(res.data.closedLRs || []);
                } else {
                    setClosedLRs([]);
                }
            } catch (err) {
                console.error('Error fetching operational dispatch range for completed LRs:', err);
                setClosedLRs([]);
            } finally {
                setLoading(false);
            }
        };
        fetchLrs();
    }, [filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay]);

    // Client-side grouping & calculations to ensure perfect sync and accuracy
    const groupedData = useMemo(() => {
        const groups = {};
        closedLRs.forEach(lr => {
            let key = '—';
            if (activeGroupTab === 'consignee') {
                key = lr.consignee || '—';
            } else if (activeGroupTab === 'consignor') {
                key = lr.consignor || '—';
            } else if (activeGroupTab === 'port') {
                key = lr.branch || '—';
            }

            const cleanKey = key.trim();
            if (!groups[cleanKey]) {
                groups[cleanKey] = 0;
            }
            groups[cleanKey]++;
        });

        return Object.entries(groups)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [closedLRs, activeGroupTab]);

    if (loading) {
        return (
            <div className="nucleus-loading-container">
                <div className="nucleus-loader"></div>
                <div style={{ marginTop: '1.5rem', color: '#1e293b', fontWeight: 600 }}>Loading completed LRs report...</div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                
                .elock-lr-root {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                }
                
                .stats-badge {
                    display: inline-flex;
                    padding: 6px 14px;
                    border-radius: 999px;
                    font-weight: 700;
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.03em;
                }
                
                .stats-badge.primary {
                    background: rgba(59, 130, 246, 0.1);
                    color: #2563eb;
                    border: 1px solid rgba(59, 130, 246, 0.2);
                }

                .stats-badge.success {
                    background: rgba(16, 185, 129, 0.1);
                    color: #059669;
                    border: 1px solid rgba(16, 185, 129, 0.2);
                }
                
                .group-tab-btn {
                    padding: 8px 18px;
                    border-radius: 10px;
                    font-weight: 600;
                    font-size: 13.5px;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    border: 1px solid #e2e8f0;
                    background: #ffffff;
                    color: #64748b;
                }
                
                .group-tab-btn.active {
                    background: rgba(16, 185, 129, 0.08);
                    color: #059669;
                    border-color: rgba(16, 185, 129, 0.3);
                    font-weight: 700;
                }
                
                .group-tab-btn:not(.active):hover {
                    background: #f8fafc;
                    color: #334155;
                }
            `}</style>

            {/* Premium Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }} className="elock-lr-root">
                <div className="nucleus-stats-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, transparent 100%)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <div style={{ fontSize: '12.5px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>Distinct Groups</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                        <span style={{ fontSize: '38px', fontWeight: 900, color: '#0f172a' }} className="mono-text">{groupedData.length}</span>
                        <span className="stats-badge primary">Active</span>
                    </div>
                </div>

                <div className="nucleus-stats-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, transparent 100%)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ fontSize: '12.5px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>Total LR Completed</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                        <span style={{ fontSize: '38px', fontWeight: 900, color: '#0f172a' }} className="mono-text">{closedLRs.length}</span>
                        <span className="stats-badge success">Completed</span>
                    </div>
                </div>
            </div>

            {/* Grouping Selection Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }} className="elock-lr-root">
                <span style={{ fontSize: '13.5px', color: '#475569', fontWeight: 700 }}>Group Breakdown:</span>
                {[
                    { id: 'consignee', label: '👤 Customer (Consignee)' },
                    { id: 'consignor', label: '👤 Customer (Consignor)' },
                    { id: 'port', label: '🏢 Port / Branch' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveGroupTab(tab.id)}
                        className={`group-tab-btn ${activeGroupTab === tab.id ? 'active' : ''}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Group Summary Table */}
            <div className="nucleus-table-wrapper elock-lr-root">
                <table className="nucleus-table">
                    <thead>
                        <tr>
                            <th style={{ width: '80px' }}>S.No</th>
                            <th>{activeGroupTab === 'port' ? 'Port / Branch Name' : 'Customer Name'}</th>
                            <th style={{ textAlign: 'right', width: '220px' }}>LR Completed Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedData.length > 0 ? (
                            groupedData.map((row, idx) => (
                                <tr key={idx}>
                                    <td style={{ fontWeight: 600, color: '#64748b' }} className="mono-text">{idx + 1}</td>
                                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{row.name}</td>
                                    <td style={{ paddingRight: '24px', textAlign: 'right', fontWeight: 900, color: '#059669', fontSize: '16.5px' }} className="mono-text">
                                        {row.count}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3" style={{ textAlign: 'center', color: '#64748b', padding: '40px', fontWeight: 600 }}>
                                    No completed trips/LRs found for the selected period.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ElockLrCompletedReport;
