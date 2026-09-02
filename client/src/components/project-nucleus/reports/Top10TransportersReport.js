import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getTransportDates, TRANSPORT_BASE, TRANSPORT_HEADERS } from './reports-helper';

const Top10TransportersReport = ({
    filterType,
    selectedMonth,
    selectedYear,
    selectedQuarter,
    dateRange,
    selectedDay
}) => {
    const [transportTable, setTransportTable] = useState([]);
    const [transportTableMeta, setTransportTableMeta] = useState({ totalCount: 0 });
    const [loading, setLoading] = useState(true);
    const [transportTablePage, setTransportTablePage] = useState(1);
    const TRANSPORT_TABLE_LIMIT = 20;
    const [transportSortBy, setTransportSortBy] = useState('totalShipments');
    const [transportSortOrder, setTransportSortOrder] = useState('desc');

    useEffect(() => {
        const fetchTable = async () => {
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
                const res = await axios.get(`${TRANSPORT_BASE}/api/reports/table`, {
                    params: {
                        from,
                        to,
                        page: transportTablePage,
                        limit: TRANSPORT_TABLE_LIMIT,
                        sortBy: transportSortBy,
                        sortOrder: transportSortOrder
                    },
                    headers: TRANSPORT_HEADERS,
                    withCredentials: true
                });
                setTransportTable(res.data?.data || res.data || []);
                setTransportTableMeta({ totalCount: res.data?.totalCount || 0 });
            } catch (err) {
                console.error('Error fetching transport table:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTable();
    }, [filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay, transportTablePage, transportSortBy, transportSortOrder]);

    if (loading) {
        return (
            <div className="nucleus-loading-container">
                <div className="nucleus-loader"></div>
                <div style={{ marginTop: '1rem', color: '#6b7280' }}>Loading report details...</div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Sort by:</span>
                    <select
                        value={transportSortBy}
                        onChange={e => { setTransportSortBy(e.target.value); setTransportTablePage(1); }}
                        className="nucleus-select"
                        style={{ padding: '6px 34px 6px 12px', fontSize: '13px' }}
                    >
                        <option value="totalShipments">Total Shipments</option>
                        <option value="consignor">Consignor</option>
                        <option value="consignee">Consignee</option>
                        <option value="route">Route</option>
                        <option value="period">Period</option>
                    </select>
                    <select
                        value={transportSortOrder}
                        onChange={e => { setTransportSortOrder(e.target.value); setTransportTablePage(1); }}
                        className="nucleus-select"
                        style={{ padding: '6px 34px 6px 12px', fontSize: '13px' }}
                    >
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                    </select>
                </div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                    Total Records: <strong style={{ color: '#1e293b' }}>{transportTableMeta.totalCount}</strong>
                </div>
            </div>

            <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc' }}>
                            {['#', 'Consignor', 'Consignee', 'Route', 'Period', 'Shipments', 'Category'].map((h, i) => (
                                <th
                                    key={i}
                                    style={{
                                        padding: '11px 14px',
                                        textAlign: i === 5 ? 'right' : 'left',
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
                        {transportTable.length > 0 ? (
                            transportTable.map((row, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                    <td style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 500 }}>
                                        {(transportTablePage - 1) * TRANSPORT_TABLE_LIMIT + i + 1}
                                    </td>
                                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{row.consignor ?? '—'}</td>
                                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{row.consignee ?? '—'}</td>
                                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{row.route ?? '—'}</td>
                                    <td style={{ padding: '10px 14px', color: '#64748b', fontFamily: 'monospace', fontSize: '12px' }}>{row.period ?? '—'}</td>
                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#3b82f6' }}>{row.totalShipments ?? '—'}</td>
                                    <td style={{ padding: '10px 14px' }}>
                                        <span style={{ background: '#3b82f610', color: '#3b82f6', border: '1px solid #3b82f620', borderRadius: '6px', padding: '2px 10px', fontSize: '11px', fontWeight: 600 }}>
                                            {row.category ?? row.import_export ?? '—'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                                    No shipment data found for the selected period.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {transportTableMeta.totalCount > TRANSPORT_TABLE_LIMIT && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                    <button
                        disabled={transportTablePage === 1}
                        onClick={() => setTransportTablePage(p => Math.max(1, p - 1))}
                        style={{
                            padding: '6px 16px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            background: transportTablePage === 1 ? '#f8fafc' : '#fff',
                            cursor: transportTablePage === 1 ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            color: '#64748b'
                        }}
                    >
                        ← Prev
                    </button>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                        Page <strong>{transportTablePage}</strong> of <strong>{Math.ceil(transportTableMeta.totalCount / TRANSPORT_TABLE_LIMIT)}</strong>
                    </span>
                    <button
                        disabled={transportTablePage >= Math.ceil(transportTableMeta.totalCount / TRANSPORT_TABLE_LIMIT)}
                        onClick={() => setTransportTablePage(p => p + 1)}
                        style={{
                            padding: '6px 16px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            background: '#fff',
                            cursor: 'pointer',
                            fontWeight: 600,
                            color: '#64748b'
                        }}
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
};

export default Top10TransportersReport;
