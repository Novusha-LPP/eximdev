import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { getEndpoint } from './reports-helper';

const CustomerUdyamReport = () => {
    const [udyamData, setUdyamData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [udyamSearch, setUdyamSearch] = useState('');
    const [udyamStatusFilter, setUdyamStatusFilter] = useState('all');

    useEffect(() => {
        const fetchUdyam = async () => {
            setLoading(true);
            try {
                const endpoint = getEndpoint('/project-nucleus/customer-udyam');
                const res = await axios.get(endpoint, { withCredentials: true });
                setUdyamData(res.data || []);
            } catch (error) {
                console.error("Error fetching customer udyam details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUdyam();
    }, []);

    const filteredUdyamData = useMemo(() => {
        return udyamData.filter(item => {
            const name = (item.name_of_individual || '').toLowerCase();
            const iec = (item.iec_no || '').toLowerCase();
            const udyam = (item.udyam_no || '').toLowerCase();
            const search = udyamSearch.toLowerCase();
            const matchesSearch = name.includes(search) || iec.includes(search) || udyam.includes(search);

            let matchesStatus = true;
            if (udyamStatusFilter === 'registered') {
                matchesStatus = !!item.udyam_no && item.udyam_no.trim() !== '';
            } else if (udyamStatusFilter === 'pending') {
                matchesStatus = !item.udyam_no || item.udyam_no.trim() === '';
            }

            return matchesSearch && matchesStatus;
        });
    }, [udyamData, udyamSearch, udyamStatusFilter]);

    const totalCustomersCount = udyamData.length;
    const registeredCount = udyamData.filter(c => c.udyam_no && c.udyam_no.trim() !== "").length;
    const pendingCount = totalCustomersCount - registeredCount;

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
            <div className="nucleus-stats-card" style={{ borderLeft: '4px solid var(--primary-500)', background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.08) 0%, rgba(6, 182, 212, 0.01) 100%)' }}>
                <div className="stats-text" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                    <div>
                        Total Entities: <span className="highlight-val" style={{ color: 'var(--primary-700)' }}>{totalCustomersCount}</span>
                    </div>
                    <div>
                        UDYAM Registered: <span className="highlight-val" style={{ color: '#10b981' }}>{registeredCount}</span>
                    </div>
                    <div>
                        Pending / Not Provided: <span className="highlight-val" style={{ color: '#f59e0b' }}>{pendingCount}</span>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                        Registration Rate: <span className="highlight-val" style={{ color: 'var(--primary-700)' }}>
                            {totalCustomersCount > 0 ? ((registeredCount / totalCustomersCount) * 100).toFixed(1) : 0}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Custom Search & Filters */}
            <div className="nucleus-controls-container">
                <div className="nucleus-filter-section">
                    <div className="filter-row custom-filter-row" style={{ marginTop: 0, paddingLeft: 0, background: 'transparent', gap: '1.5rem', display: 'flex', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="filter-label" style={{ minWidth: 'auto', margin: 0 }}>Search:</span>
                            <input
                                type="text"
                                placeholder="Search by customer name, IEC, or UDYAM..."
                                className="nucleus-input"
                                style={{ width: '280px', padding: '6px 12px', fontSize: '0.9rem' }}
                                value={udyamSearch}
                                onChange={(e) => setUdyamSearch(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="filter-label" style={{ minWidth: 'auto', margin: 0 }}>Status:</span>
                            <select
                                value={udyamStatusFilter}
                                onChange={(e) => setUdyamStatusFilter(e.target.value)}
                                className="nucleus-select"
                                style={{ padding: '6px 24px 6px 12px', fontSize: '0.9rem' }}
                            >
                                <option value="all">All Customers</option>
                                <option value="registered">UDYAM Registered</option>
                                <option value="pending">Pending / Not Provided</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="nucleus-table-wrapper">
                <table className="nucleus-table">
                    <thead>
                        <tr>
                            <th>S.No</th>
                            <th>Customer Name</th>
                            <th>Category</th>
                            <th>IEC Number</th>
                            <th>UDYAM Number</th>
                            <th>Approval Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUdyamData.length > 0 ? (
                            filteredUdyamData.map((item, index) => (
                                <tr key={item._id || index}>
                                    <td style={{ fontWeight: 500 }}>{index + 1}</td>
                                    <td style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{item.name_of_individual}</td>
                                    <td>
                                        <span className="status-pill info" style={{ textTransform: 'capitalize', fontSize: '0.8rem' }}>
                                            {item.category || 'General'}
                                        </span>
                                    </td>
                                    <td className="mono-text" style={{ fontWeight: 500 }}>{item.iec_no || '—'}</td>
                                    <td className="mono-text">
                                        {item.udyam_no ? (
                                            <span style={{ color: 'var(--primary-700)', fontWeight: 600 }}>{item.udyam_no}</span>
                                        ) : (
                                            <span style={{ color: 'var(--slate-400)', fontStyle: 'italic' }}>Pending / Not Provided</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`status-pill ${
                                            item.approval === 'Approved' ? 'success' : 
                                            item.approval === 'Rejected' ? 'error' : 'warning'
                                        }`} style={{ fontWeight: 600 }}>
                                            {item.approval || 'Pending'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', color: '#6b7280', padding: '30px' }}>
                                    No customers found matching the search criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CustomerUdyamReport;
