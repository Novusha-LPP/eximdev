
import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import '../../styles/mrm.scss';

const API_URL = (process.env.REACT_APP_API_STRING || 'http://localhost:9006/api');

const MRMAdminDashboard = () => {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [dashboardData, setDashboardData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Admin access based on role
    const isAuthorized = user?.role === 'Admin';

    useEffect(() => {
        if (isAuthorized) {
            loadDashboardData();
        }
    }, [selectedMonth, selectedYear, isAuthorized]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const monthStr = String(selectedMonth).padStart(2, '0');
            const response = await fetch(
                `${API_URL}/mrm/dashboard?month=${monthStr}&year=${selectedYear}`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'username': user?.username || '',
                        'user-role': user?.role || '',
                        'user-id': user?._id || ''
                    }
                }
            );
            const data = await response.json();

            // Handle error responses
            if (data.error || !Array.isArray(data)) {
                console.error('Dashboard API error:', data.error);
                setDashboardData([]);
                return;
            }

            setDashboardData(data);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            setDashboardData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleMeeting = async (userId, currentStatus) => {
        try {
            const newStatus = !currentStatus;

            // Optimistic update
            setDashboardData(prev => prev.map(row =>
                row.userId === userId ? { ...row, meetingDone: newStatus } : row
            ));

            const monthStr = String(selectedMonth).padStart(2, '0');
            const response = await fetch(`${API_URL}/mrm/metadata/toggle-meeting`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'username': user?.username || '',
                    'user-role': user?.role || '',
                    'user-id': user?._id || ''
                },
                body: JSON.stringify({
                    month: monthStr,
                    year: selectedYear,
                    userId: userId,
                    meetingDone: newStatus
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update status');
            }
        } catch (error) {
            console.error(error);
            alert("Failed to update status");
            // Revert on error
            loadDashboardData();
        }
    };

    const getMonthName = (m) => new Date(0, m - 1).toLocaleString('default', { month: 'long' });

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    if (!isAuthorized) {
        return (
            <div className="mrm-container">
                <div className="title-bar">
                    <div className="title-center">
                        <h1>Access Denied</h1>
                        <span className="user-name">You do not have permission to view this page.</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mrm-container">
            {/* Title Bar */}
            <div className="title-bar">
                <div className="title-center">
                    <h1>MRM Admin Dashboard</h1>
                    <span className="user-name">Overview of all users' MRM for {getMonthName(selectedMonth)} {selectedYear}</span>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="header-actions">
                <div className="date-controls">
                    <span style={{ color: '#2e7d32', fontWeight: '600' }}>
                        Viewing MRM Status for All Users
                    </span>
                </div>

                <div className="action-controls">
                    <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                        ))}
                    </select>
                    <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                        {[2024, 2025, 2026, 2027, 2028].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Dashboard Table */}
            <div className="data-grid-container" style={{ margin: '16px', borderRadius: '12px' }}>
                {loading ? (
                    <p style={{ padding: '40px', textAlign: 'center' }}>Loading...</p>
                ) : (
                    <table style={{ minWidth: '800px' }}>
                        <thead>
                            <tr>
                                <th style={{ width: '50px' }}>#</th>
                                <th style={{ width: '200px' }}>User Name</th>
                                <th style={{ width: '150px' }}>Username</th>
                                <th style={{ width: '150px' }}>Review Date</th>
                                <th style={{ width: '150px' }}>Meeting Date</th>
                                <th style={{ width: '100px' }}>Items Count</th>
                                <th style={{ width: '150px' }}>Status Summary</th>
                                <th style={{ width: '130px' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dashboardData.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                        No MRM data found for {getMonthName(selectedMonth)} {selectedYear}
                                    </td>
                                </tr>
                            ) : (
                                dashboardData.map((row, idx) => (
                                    <tr key={row.userId || idx}>
                                        <td style={{ textAlign: 'center', padding: '12px' }}>{idx + 1}</td>
                                        <td style={{ padding: '12px', fontWeight: '500' }}>
                                            {row.firstName} {row.lastName}
                                        </td>
                                        <td style={{ padding: '12px', color: '#64748b' }}>{row.username}</td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <span style={{
                                                background: row.reviewDate ? '#dcfce7' : '#fee2e2',
                                                color: row.reviewDate ? '#166534' : '#991b1b',
                                                padding: '4px 10px',
                                                borderRadius: '4px',
                                                fontSize: '0.85rem'
                                            }}>
                                                {formatDate(row.reviewDate)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <span style={{
                                                background: row.meetingDate ? '#dcfce7' : '#fee2e2',
                                                color: row.meetingDate ? '#166534' : '#991b1b',
                                                padding: '4px 10px',
                                                borderRadius: '4px',
                                                fontSize: '0.85rem'
                                            }}>
                                                {formatDate(row.meetingDate)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>
                                            {row.itemsCount || 0}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                {row.greenCount > 0 && (
                                                    <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                                                        {row.greenCount} 🟢
                                                    </span>
                                                )}
                                                {row.yellowCount > 0 && (
                                                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                                                        {row.yellowCount} 🟡
                                                    </span>
                                                )}
                                                {row.redCount > 0 && (
                                                    <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                                                        {row.redCount} 🔴
                                                    </span>
                                                )}
                                                {row.grayCount > 0 && (
                                                    <span style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                                                        {row.grayCount} ⚪
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => navigate(`/mrm?userId=${row.userId}`)}
                                                style={{
                                                    background: '#217346',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '6px 12px',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem',
                                                    marginRight: '8px'
                                                }}
                                            >
                                                View
                                            </button>
                                            <button
                                                onClick={() => handleToggleMeeting(row.userId, row.meetingDone)}
                                                title={row.meetingDone ? "Mark as Not Done" : "Mark as Done"}
                                                style={{
                                                    background: row.meetingDone ? '#166534' : '#e2e8f0',
                                                    color: row.meetingDone ? 'white' : '#64748b',
                                                    border: 'none',
                                                    padding: '6px 10px',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.9rem',
                                                    border: row.meetingDone ? 'none' : '1px solid #cbd5e1'
                                                }}
                                            >
                                                {row.meetingDone ? '✓' : '○'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default MRMAdminDashboard;
