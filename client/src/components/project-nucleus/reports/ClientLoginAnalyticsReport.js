import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import {
    ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { getEndpoint, months } from './reports-helper';

const CustomMonthlyTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        let formattedLabel = '';
        if (label) {
            const parts = label.split('-');
            if (parts.length >= 2) {
                const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
                formattedLabel = format(d, 'MMMM yyyy');
            } else {
                formattedLabel = label;
            }
        }
        
        const names = data.names || [];

        return (
            <div className="custom-chart-tooltip">
                <p className="tooltip-title">{formattedLabel}</p>
                <p className="tooltip-value">
                    <span className="tooltip-bullet" style={{ backgroundColor: '#8b5cf6' }}></span>
                    Active Users: <strong>{data.count}</strong>
                </p>
                {names.length > 0 && (
                    <div className="tooltip-users-list">
                        <p className="users-list-title">Active Names:</p>
                        <div className="users-list-tags">
                            {names.map((name, i) => (
                                <span key={i} className="tooltip-user-tag">{name}</span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

const ClientLoginAnalyticsReport = () => {
    const [clientAnalyticsData, setClientAnalyticsData] = useState({ users: [], daily: [], monthly: [] });
    const [loading, setLoading] = useState(true);

    const [clientSearch, setClientSearch] = useState('');
    const [clientRoleFilter, setClientRoleFilter] = useState('all');
    const [clientStatusFilter, setClientStatusFilter] = useState('all');
    const [clientMonthFilter, setClientMonthFilter] = useState('all');
    const [clientYearFilter, setClientYearFilter] = useState('all');

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);

    useEffect(() => {
        const fetchClientAnalytics = async () => {
            setLoading(true);
            try {
                const endpoint = getEndpoint('/project-nucleus/client-login-analytics');
                const res = await axios.get(endpoint, { withCredentials: true });
                setClientAnalyticsData(res.data || { users: [], daily: [], monthly: [] });
            } catch (err) {
                console.error("Error fetching client login analytics for Project Nucleus:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchClientAnalytics();
    }, []);

    const filteredClientData = useMemo(() => {
        return (clientAnalyticsData.users || []).filter(item => {
            const name = (item.name || '').toLowerCase();
            const email = (item.email || '').toLowerCase();
            const search = clientSearch.toLowerCase();
            const matchesSearch = name.includes(search) || email.includes(search);

            let matchesRole = true;
            if (clientRoleFilter !== 'all') {
                matchesRole = (item.role || '').toLowerCase() === clientRoleFilter.toLowerCase();
            }

            let matchesStatus = true;
            if (clientStatusFilter !== 'all') {
                if (clientStatusFilter === 'active') {
                    matchesStatus = item.isActive && item.status === 'active';
                } else if (clientStatusFilter === 'inactive') {
                    matchesStatus = !item.isActive || item.status !== 'active';
                }
            }

            let matchesMonth = true;
            if (clientMonthFilter !== 'all') {
                if (!item.lastLogin) {
                    matchesMonth = false;
                } else {
                    const d = new Date(item.lastLogin);
                    matchesMonth = d.getMonth() === parseInt(clientMonthFilter);
                }
            }

            let matchesYear = true;
            if (clientYearFilter !== 'all') {
                if (!item.lastLogin) {
                    matchesYear = false;
                } else {
                    const d = new Date(item.lastLogin);
                    matchesYear = d.getFullYear() === parseInt(clientYearFilter);
                }
            }

            return matchesSearch && matchesRole && matchesStatus && matchesMonth && matchesYear;
        });
    }, [clientAnalyticsData.users, clientSearch, clientRoleFilter, clientStatusFilter, clientMonthFilter, clientYearFilter]);

    if (loading) {
        return (
            <div className="nucleus-loading-container">
                <div className="nucleus-loader"></div>
                <div style={{ marginTop: '1rem', color: '#6b7280' }}>Loading report details...</div>
            </div>
        );
    }

    const users = clientAnalyticsData.users || [];
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive && u.status === 'active').length;
    
    const loggedInToday = users.filter(u => {
        if (!u.lastLogin) return false;
        const d = new Date(u.lastLogin);
        const today = new Date();
        return d.getDate() === today.getDate() && 
               d.getMonth() === today.getMonth() && 
               d.getFullYear() === today.getFullYear();
    }).length;

    const loggedInThisMonth = users.filter(u => {
        if (!u.lastLogin) return false;
        const d = new Date(u.lastLogin);
        const today = new Date();
        return d.getMonth() === today.getMonth() && 
               d.getFullYear() === today.getFullYear();
    }).length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Stats Card */}
            <div className="nucleus-stats-card" style={{ borderLeft: '4px solid #3b82f6', background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.01) 100%)' }}>
                <div className="stats-text" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                    <div>
                        Total Clients: <span className="highlight-val" style={{ color: '#3b82f6' }}>{totalUsers}</span>
                    </div>
                    <div>
                        Active System Users: <span className="highlight-val" style={{ color: '#10b981' }}>{activeUsers}</span>
                    </div>
                    <div>
                        Logged In Today: <span className="highlight-val" style={{ color: '#ec4899' }}>{loggedInToday}</span>
                    </div>
                    <div>
                        Logged In This Month: <span className="highlight-val" style={{ color: '#8b5cf6' }}>{loggedInThisMonth}</span>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                        Active Engagement Rate: <span className="highlight-val" style={{ color: '#10b981' }}>
                            {totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Custom Search & Filters */}
            <div className="nucleus-controls-container">
                <div className="nucleus-filter-section">
                    <div className="filter-row custom-filter-row" style={{ marginTop: 0, paddingLeft: 0, background: 'transparent', gap: '1.5rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="filter-label" style={{ minWidth: 'auto', margin: 0 }}>Search:</span>
                            <input
                                type="text"
                                placeholder="Search clients by name or email..."
                                className="nucleus-input"
                                style={{ width: '220px', padding: '6px 12px', fontSize: '0.9rem' }}
                                value={clientSearch}
                                onChange={(e) => setClientSearch(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="filter-label" style={{ minWidth: 'auto', margin: 0 }}>Role:</span>
                            <select
                                value={clientRoleFilter}
                                onChange={(e) => setClientRoleFilter(e.target.value)}
                                className="nucleus-select"
                                style={{ padding: '6px 24px 6px 12px', fontSize: '0.9rem' }}
                            >
                                <option value="all">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="user">User</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="filter-label" style={{ minWidth: 'auto', margin: 0 }}>Status:</span>
                            <select
                                value={clientStatusFilter}
                                onChange={(e) => setClientStatusFilter(e.target.value)}
                                className="nucleus-select"
                                style={{ padding: '6px 24px 6px 12px', fontSize: '0.9rem' }}
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="filter-label" style={{ minWidth: 'auto', margin: 0 }}>Month:</span>
                            <select
                                value={clientMonthFilter}
                                onChange={(e) => setClientMonthFilter(e.target.value)}
                                className="nucleus-select"
                                style={{ padding: '6px 24px 6px 12px', fontSize: '0.9rem' }}
                            >
                                <option value="all">All Months</option>
                                {months.map((m, i) => (
                                    <option key={i} value={i}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="filter-label" style={{ minWidth: 'auto', margin: 0 }}>Year:</span>
                            <select
                                value={clientYearFilter}
                                onChange={(e) => setClientYearFilter(e.target.value)}
                                className="nucleus-select"
                                style={{ padding: '6px 24px 6px 12px', fontSize: '0.9rem' }}
                            >
                                <option value="all">All Years</option>
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Graphs Section */}
            <div className="analytics-graphs-container">
                <div className="analytics-graph-card">
                    <div className="graph-card-header">
                        <h3>Daily Active Logins</h3>
                        <span className="graph-subtitle">Unique login events per calendar day</span>
                    </div>
                    <div style={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer>
                            <AreaChart
                                data={clientAnalyticsData.daily || []}
                                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.5)"/>
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(str) => {
                                        if (!str) return '';
                                        const d = new Date(str);
                                        return format(d, 'dd MMM');
                                    }}
                                    stroke="#94a3b8"
                                    fontSize={11}
                                    tickLine={false}
                                />
                                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false}/>
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                                        border: '1px solid #e2e8f0', 
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)'
                                    }}
                                    labelFormatter={(str) => {
                                        if (!str) return '';
                                        const d = new Date(str);
                                        return format(d, 'eeee, dd MMMM yyyy');
                                    }}
                                    formatter={(value) => [`${value} Logins`, 'Activity']}
                                />
                                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDaily)"/>
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="analytics-graph-card">
                    <div className="graph-card-header">
                        <h3>Monthly Login Distribution</h3>
                        <span className="graph-subtitle">Total logins grouped by month</span>
                    </div>
                    <div style={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer>
                            <BarChart
                                data={clientAnalyticsData.monthly || []}
                                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.5)"/>
                                <XAxis 
                                    dataKey="month" 
                                    tickFormatter={(str) => {
                                        if (!str) return '';
                                        const parts = str.split('-');
                                        if (parts.length < 2) return str;
                                        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
                                        return format(d, 'MMM yy');
                                    }}
                                    stroke="#94a3b8"
                                    fontSize={11}
                                    tickLine={false}
                                />
                                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false}/>
                                <Tooltip content={<CustomMonthlyTooltip />} />
                                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={45}/>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="nucleus-table-wrapper">
                <table className="nucleus-table">
                    <thead>
                        <tr>
                            <th>S.No</th>
                            <th>Client Name</th>
                            <th>Email Address</th>
                            <th>Role</th>
                            <th>Active Status</th>
                            <th>Account Status</th>
                            <th>Last Login Date</th>
                            <th>Registered At</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClientData.length > 0 ? (
                            filteredClientData.map((item, index) => (
                                <tr key={item._id || index}>
                                    <td style={{ fontWeight: 500 }}>{index + 1}</td>
                                    <td style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{item.name}</td>
                                    <td className="mono-text">{item.email}</td>
                                    <td>
                                        <span className={`status-pill ${item.role === 'admin' ? 'error' : 'info'}`} style={{ textTransform: 'capitalize', fontSize: '0.8rem' }}>
                                            {item.role || 'user'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-pill ${item.isActive ? 'success' : 'warning'}`}>
                                            {item.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-pill ${item.status === 'active' ? 'success' : 'error'}`} style={{ textTransform: 'capitalize' }}>
                                            {item.status || 'unknown'}
                                        </span>
                                    </td>
                                    <td className="mono-text" style={{ fontWeight: 500 }}>
                                        {item.lastLogin ? (
                                            <>
                                                {new Date(item.lastLogin).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>
                                                    {new Date(item.lastLogin).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                </span>
                                            </>
                                        ) : (
                                            <span style={{ color: 'var(--slate-400)', fontStyle: 'italic' }}>Never logged in</span>
                                        )}
                                    </td>
                                    <td className="mono-text" style={{ color: '#64748b' }}>
                                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : '—'}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', color: '#6b7280', padding: '30px' }}>
                                    No client users found matching the search criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ClientLoginAnalyticsReport;
