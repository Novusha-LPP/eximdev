import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { getTransportDates, TRANSPORT_BASE, TRANSPORT_HEADERS } from './reports-helper';

const BillingTrendTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        let formattedDate = data.date || '';
        try {
            if (data.date) {
                formattedDate = format(new Date(data.date), 'dd MMMM yyyy');
            }
        } catch (e) {
            console.error("Invalid date in BillingTrendTooltip", e);
        }
        return (
            <div className="custom-chart-tooltip">
                <p className="tooltip-title">{formattedDate}</p>
                <p className="tooltip-value">
                    <span className="tooltip-bullet" style={{ backgroundColor: '#6366f1' }}></span>
                    SRCC Billing: <strong>₹{(data.srccBilling ?? 0).toLocaleString('en-IN')}</strong>
                </p>
                <p className="tooltip-value">
                    <span className="tooltip-bullet" style={{ backgroundColor: '#f59e0b' }}></span>
                    Others Billing: <strong>₹{(data.othersBilling ?? 0).toLocaleString('en-IN')}</strong>
                </p>
                <p className="tooltip-value" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '4px', marginTop: '4px', fontWeight: 600 }}>
                    Total Billing: <strong>₹{(data.totalBilling ?? 0).toLocaleString('en-IN')}</strong>
                </p>
            </div>
        );
    }
    return null;
};

const ElockBillingReport = ({
    filterType,
    selectedMonth,
    selectedYear,
    selectedQuarter,
    dateRange,
    selectedDay
}) => {
    const [billingData, setBillingData] = useState({ summary: {}, trend: [], rows: [] });
    const [loading, setLoading] = useState(true);
    const [apiError, setApiError] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchBillingData = async () => {
            setLoading(true);
            setApiError(false);
            try {
                const { startDate: from, endDate: to } = getTransportDates(
                    filterType,
                    selectedDay,
                    selectedYear,
                    selectedMonth,
                    selectedQuarter,
                    dateRange
                );
                
                const url = `${TRANSPORT_BASE}/api/client-elock-dashboard/billing`;
                const res = await axios.get(url, { 
                    params: { from, to },
                    headers: TRANSPORT_HEADERS,
                    withCredentials: true 
                });
                
                if (res.data && res.data.success) {
                    setBillingData(res.data.data || { summary: {}, trend: [], rows: [] });
                } else {
                    setApiError(true);
                }
            } catch (err) {
                console.error("Error fetching E-Lock billing data:", err);
                setApiError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchBillingData();
    }, [filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay]);

    // Metrics fallback values (N/A / 0 if no real data is found)
    const metrics = useMemo(() => {
        const summary = billingData.summary || {};
        return {
            totalBilling: summary.totalBilling ?? 0,
            srccBilling: summary.srccBilling ?? 0,
            othersBilling: summary.othersBilling ?? 0,
            srccPercent: summary.srccPercent ?? '0.0',
            othersPercent: summary.othersPercent ?? '0.0',
            avgTicketSize: summary.avgTicketSize ?? 0,
            totalTrips: billingData.rows?.length ?? 0,
            srccTrips: billingData.rows?.filter(r => r.elock_assign === 'SRCC').length ?? 0,
            othersTrips: billingData.rows?.filter(r => r.elock_assign !== 'SRCC').length ?? 0
        };
    }, [billingData]);

    const filteredLedgerRows = useMemo(() => {
        const rows = billingData.rows || [];
        if (!searchQuery.trim()) return rows;

        const query = searchQuery.toLowerCase();
        return rows.filter(row => {
            return (
                (row.container_number || '').toLowerCase().includes(query) ||
                (row.lock_number || '').toLowerCase().includes(query) ||
                (row.tr_no || '').toLowerCase().includes(query) ||
                (row.customer_name || '').toLowerCase().includes(query) ||
                (row.location || '').toLowerCase().includes(query)
            );
        });
    }, [billingData.rows, searchQuery]);

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
                    <div style={{ marginTop: '1.5rem', color: '#1e293b', fontWeight: 600 }}>Connecting to E-Lock Billing API...</div>
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
                
                .billing-split-wrapper {
                    background: rgba(255, 255, 255, 0.85);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.03);
                    border-radius: 20px;
                    padding: 24px;
                }

                .billing-split-bar {
                    height: 24px;
                    border-radius: 12px;
                    background: #f1f5f9;
                    display: flex;
                    overflow: hidden;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
                }

                .split-srcc {
                    background: linear-gradient(90deg, #6366f1, #8b5cf6);
                    height: 100%;
                    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .split-others {
                    background: linear-gradient(90deg, #f59e0b, #eab308);
                    height: 100%;
                    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .analytics-graph-card {
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    padding: 28px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04);
                }
                
                .graph-card-header h3 {
                    color: #1e293b;
                    font-weight: 700;
                    font-size: 16px;
                    margin-bottom: 4px;
                }
                
                .graph-card-header .graph-subtitle {
                    color: #64748b;
                    font-weight: 500;
                    font-size: 13px;
                }

                .assignee-badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 10px;
                    border-radius: 8px;
                    font-weight: 700;
                    font-size: 12px;
                }

                .assignee-badge.srcc {
                    background: rgba(99, 102, 241, 0.1);
                    color: #6366f1;
                    border: 1px solid rgba(99, 102, 241, 0.15);
                }

                .assignee-badge.others {
                    background: rgba(245, 158, 11, 0.1);
                    color: #d97706;
                    border: 1px solid rgba(245, 158, 11, 0.15);
                }

                .search-bar-input {
                    padding: 10px 16px;
                    border-radius: 12px;
                    border: 1px solid rgba(226, 232, 240, 0.8);
                    font-size: 13.5px;
                    font-weight: 600;
                    outline: none;
                    width: 320px;
                    background: rgba(255, 255, 255, 0.85);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
                    transition: border 0.2s;
                }

                .search-bar-input:focus {
                    border-color: #6366f1;
                }

                .api-pending-notice {
                    background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(239, 68, 68, 0.02));
                    border: 1px dashed rgba(99, 102, 241, 0.3);
                    border-radius: 20px;
                    padding: 32px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    align-items: center;
                    text-align: center;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.02);
                }
            `}</style>

            {apiError ? (
                /* Premium Placeholder when backend API is not yet deployed */
                <div className="api-pending-notice">
                    <span style={{ fontSize: '48px' }}>🔒</span>
                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', margin: 0 }}>E-Lock Realtime Billing API Integration Pending</h3>
                    <p style={{ color: '#64748b', fontSize: '14.5px', maxWidth: '640px', lineHeight: 1.6, margin: 0 }}>
                        We are ready to retrieve and present live E-Lock financial statistics! The dashboard will activate automatically as soon as your backend endpoint 
                        <code style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', margin: '0 4px', color: '#4f46e5', fontWeight: 700 }}>/api/client-elock-dashboard/billing</code> is deployed.
                    </p>
                    <div style={{ background: '#0f172a', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '580px', textAlign: 'left', overflowX: 'auto', border: '1px solid #1e293b' }}>
                        <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: '10px' }}>Expected API Response Schema (JSON)</div>
                        <pre style={{ margin: 0, color: '#38bdf8', fontSize: '12px', fontFamily: '"Fira Code", monospace' }}>
{`{
  "success": true,
  "data": {
    "summary": {
      "totalBilling": 125000,
      "srccBilling": 85000,
      "othersBilling": 40000,
      "srccPercent": "68.0",
      "othersPercent": "32.0",
      "avgTicketSize": 1120
    },
    "trend": [
      { "date": "2026-06-01", "srccBilling": 5000, "othersBilling": 2400, "totalBilling": 7400 }
    ],
    "rows": [
      {
        "_id": "6a15435c45daeff48b27066e",
        "tr_no": "GR/2627/6824",
        "container_number": "CAIU9529620",
        "lock_number": "8294630573",
        "date": "2026-06-01",
        "elock_return_date": "2026-06-02",
        "location": "Mundra to Sanand",
        "customer_name": "Sakar Industries",
        "elock_assign": "SRCC",
        "rate": 1000,
        "amount": 1000
      }
    ]
  }
}`}
                        </pre>
                    </div>
                </div>
            ) : (
                /* Dynamic Billing Dashboard when API is operational */
                <>
                    {/* Six Premium Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                        {[
                            { label: 'Total E-Lock Billing', value: `₹${metrics.totalBilling.toLocaleString('en-IN')}`, color: '#10b981', sub: `${metrics.totalTrips} Total Trips`, gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.02))' },
                            { label: 'SRCC Trips Billing', value: `₹${metrics.srccBilling.toLocaleString('en-IN')}`, color: '#6366f1', sub: `${metrics.srccTrips} SRCC Trips`, gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 0.02))' },
                            { label: 'Others Trips Billing', value: `₹${metrics.othersBilling.toLocaleString('en-IN')}`, color: '#f59e0b', sub: `${metrics.othersTrips} Hired Trips`, gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.02))' },
                            { label: 'SRCC Share %', value: `${metrics.srccPercent}%`, color: '#6366f1', sub: 'Of Total Revenue', gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 0.02))' },
                            { label: 'Others Share %', value: `${metrics.othersPercent}%`, color: '#f59e0b', sub: 'Of Total Revenue', gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.02))' },
                            { label: 'Avg Ticket Size', value: `₹${metrics.avgTicketSize.toLocaleString('en-IN')}`, color: '#8b5cf6', sub: 'Per Lock Trip', gradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.02))' }
                        ].map((card, idx) => (
                            <div key={idx} className="nucleus-stats-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '8px', background: card.gradient }}>
                                <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{card.label}</div>
                                <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a' }} className="mono-text">{card.value}</div>
                                <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>{card.sub}</div>
                            </div>
                        ))}
                    </div>

                    {/* Split Progress Bar */}
                    <div className="billing-split-wrapper">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontWeight: 700, fontSize: '14px', color: '#475569' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: 'linear-gradient(#6366f1, #8b5cf6)' }}></span>
                                SRCC Share: <strong style={{ color: '#6366f1' }}>{metrics.srccPercent}%</strong> (₹{metrics.srccBilling.toLocaleString('en-IN')})
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Others Share: <strong style={{ color: '#d97706' }}>{metrics.othersPercent}%</strong> (₹{metrics.othersBilling.toLocaleString('en-IN')})
                                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: 'linear-gradient(#f59e0b, #eab308)' }}></span>
                            </div>
                        </div>
                        <div className="billing-split-bar">
                            <div className="split-srcc" style={{ width: `${metrics.srccPercent}%` }}></div>
                            <div className="split-others" style={{ width: `${metrics.othersPercent}%` }}></div>
                        </div>
                    </div>

                    {/* Trend Chart */}
                    <div className="analytics-graph-card">
                        <div className="graph-card-header" style={{ marginBottom: '20px' }}>
                            <h3>Daily E-Lock Billing Trend</h3>
                            <span className="graph-subtitle">Breakdown of daily revenue from SRCC vs Hired Lock Trips</span>
                        </div>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <AreaChart
                                    data={billingData.trend}
                                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="colorSrccBill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05}/>
                                        </linearGradient>
                                        <linearGradient id="colorOthersBill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.5)"/>
                                    <XAxis 
                                        dataKey="date" 
                                        tickFormatter={(str) => {
                                            if (!str) return '';
                                            try {
                                                return format(new Date(str), 'dd MMM');
                                            } catch (e) {
                                                return str;
                                            }
                                        }}
                                        stroke="#94a3b8"
                                        fontSize={11}
                                        tickLine={false}
                                    />
                                    <YAxis 
                                        stroke="#94a3b8" 
                                        fontSize={11} 
                                        tickLine={false} 
                                        tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                                    />
                                    <Tooltip content={<BillingTrendTooltip />} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                    <Area type="monotone" name="SRCC Billing" dataKey="srccBilling" stackId="1" stroke="#6366f1" strokeWidth={2.5} fill="url(#colorSrccBill)"/>
                                    <Area type="monotone" name="Others Billing" dataKey="othersBilling" stackId="1" stroke="#f59e0b" strokeWidth={2.5} fill="url(#colorOthersBill)"/>
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Search and Table Ledger */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>Detailed E-Lock Billing Ledger</div>
                            <input 
                                type="text" 
                                placeholder="🔍 Search lock, container, customer, route..."
                                className="search-bar-input"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="nucleus-table-wrapper">
                            <table className="nucleus-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '60px' }}>#</th>
                                        <th>TR / LR No</th>
                                        <th>Container No</th>
                                        <th>Lock No</th>
                                        <th>Assign Date</th>
                                        <th>Return Date</th>
                                        <th>Location (Route)</th>
                                        <th>Customer Name</th>
                                        <th>Category</th>
                                        <th style={{ textAlign: 'right' }}>Rate (₹)</th>
                                        <th style={{ textAlign: 'right' }}>Billing Amount (₹)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLedgerRows.length > 0 ? (
                                        filteredLedgerRows.map((row, index) => {
                                            const isSRCC = row.elock_assign === 'SRCC';
                                            return (
                                                <tr key={row._id || index}>
                                                    <td style={{ fontWeight: 500, color: '#64748b' }} className="mono-text">{index + 1}</td>
                                                    <td style={{ color: '#3b82f6', fontWeight: 500 }} className="mono-text">{row.tr_no ?? '—'}</td>
                                                    <td style={{ fontWeight: 700, color: '#0f172a' }} className="mono-text">{row.container_number ?? '—'}</td>
                                                    <td className="mono-text" style={{ fontWeight: 600 }}>{row.lock_number ?? '—'}</td>
                                                    <td className="mono-text">{row.date ?? '—'}</td>
                                                    <td className="mono-text">{row.elock_return_date ?? '—'}</td>
                                                    <td style={{ color: '#475569' }}>{row.location ?? '—'}</td>
                                                    <td style={{ fontWeight: 500 }}>{row.customer_name ?? '—'}</td>
                                                    <td>
                                                        <span className={`assignee-badge ${isSRCC ? 'srcc' : 'others'}`}>
                                                            {row.elock_assign ?? 'Others'}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600 }} className="mono-text">₹{(row.rate ?? 0).toLocaleString('en-IN')}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#10b981' }} className="mono-text">₹{(row.amount ?? 0).toLocaleString('en-IN')}</td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="11" style={{ textAlign: 'center', color: '#64748b', padding: '40px', fontWeight: 500 }}>
                                                No billing records found matching the search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ElockBillingReport;
