import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { getEndpoint, months } from './reports-helper';
import { format } from 'date-fns';

const NewCustomersReport = () => {
    const [customerData, setCustomerData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMonthYear, setSelectedMonthYear] = useState('all');

    useEffect(() => {
        const fetchCustomers = async () => {
            setLoading(true);
            try {
                const endpoint = getEndpoint('/project-nucleus/new-customers-report');
                const res = await axios.get(endpoint, { withCredentials: true });
                setCustomerData(res.data || []);
            } catch (error) {
                console.error("Error fetching new customers report details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCustomers();
    }, []);

    // Process customer approval dates to determine month and year groupings
    const processedCustomers = useMemo(() => {
        return customerData.map(c => {
            let dateObj = null;
            if (c.approvalDate) {
                dateObj = new Date(c.approvalDate);
            }
            
            let monthYearKey = 'Unknown';
            let monthYearLabel = 'Unknown';
            let formattedDate = '—';

            if (dateObj && !isNaN(dateObj.getTime())) {
                const year = dateObj.getFullYear();
                const month = dateObj.getMonth(); // 0-indexed
                monthYearKey = `${year}-${String(month + 1).padStart(2, '0')}`;
                monthYearLabel = `${months[month]} ${year}`;
                formattedDate = dateObj.toLocaleDateString('en-GB'); // DD/MM/YYYY
            }

            return {
                ...c,
                dateObj,
                monthYearKey,
                monthYearLabel,
                formattedDate
            };
        });
    }, [customerData]);

    // Get unique month-years for filter dropdown, sorted descending (newest first)
    const uniqueMonthYears = useMemo(() => {
        const seen = new Set();
        const list = [];
        processedCustomers.forEach(c => {
            if (c.monthYearKey !== 'Unknown' && !seen.has(c.monthYearKey)) {
                seen.add(c.monthYearKey);
                list.push({ key: c.monthYearKey, label: c.monthYearLabel, dateObj: c.dateObj });
            }
        });
        
        // Sort descending
        return list.sort((a, b) => b.dateObj - a.dateObj);
    }, [processedCustomers]);

    // Filter customers based on search and selected month-year
    const filteredCustomers = useMemo(() => {
        return processedCustomers.filter(c => {
            const name = (c.name_of_individual || '').toLowerCase();
            const iec = (c.iec_no || '').toLowerCase();
            const udyam = (c.udyam_no || '').toLowerCase();
            const city = (c.city || '').toLowerCase();
            const state = (c.state || '').toLowerCase();
            const search = searchQuery.toLowerCase();
            const matchesSearch = name.includes(search) || iec.includes(search) || udyam.includes(search) || city.includes(search) || state.includes(search);

            let matchesMonth = true;
            if (selectedMonthYear !== 'all') {
                matchesMonth = c.monthYearKey === selectedMonthYear;
            }

            return matchesSearch && matchesMonth;
        });
    }, [processedCustomers, searchQuery, selectedMonthYear]);

    // Statistics Calculations
    const totalCount = processedCustomers.length;

    const currentMonthKey = format(new Date(), 'yyyy-MM');
    const thisMonthCount = processedCustomers.filter(c => c.monthYearKey === currentMonthKey).length;

    // Find peak month
    const peakMonthStats = useMemo(() => {
        const counts = {};
        processedCustomers.forEach(c => {
            if (c.monthYearKey !== 'Unknown') {
                counts[c.monthYearLabel] = (counts[c.monthYearLabel] || 0) + 1;
            }
        });

        let peakMonth = '—';
        let peakVal = 0;
        Object.entries(counts).forEach(([month, count]) => {
            if (count > peakVal) {
                peakVal = count;
                peakMonth = month;
            }
        });

        return { month: peakMonth, count: peakVal };
    }, [processedCustomers]);

    // Average monthly additions
    const avgMonthlyAdditions = useMemo(() => {
        if (uniqueMonthYears.length === 0) return 0;
        return (totalCount / uniqueMonthYears.length).toFixed(1);
    }, [totalCount, uniqueMonthYears]);

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
            <div className="nucleus-stats-card" style={{ borderLeft: '4px solid #10b981', background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.01) 100%)' }}>
                <div className="stats-text" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                    <div>
                        Total Customers Added: <span className="highlight-val" style={{ color: '#10b981' }}>{totalCount}</span>
                    </div>
                    <div>
                        Added This Month: <span className="highlight-val" style={{ color: '#06b6d4' }}>{thisMonthCount}</span>
                    </div>
                    <div>
                        Peak Month: <span className="highlight-val" style={{ color: '#8b5cf6' }}>{peakMonthStats.month} ({peakMonthStats.count})</span>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                        Avg. Additions / Month: <span className="highlight-val" style={{ color: '#f59e0b' }}>{avgMonthlyAdditions}</span>
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
                                placeholder="Search by name, IEC, city..."
                                className="nucleus-input"
                                style={{ width: '300px', padding: '6px 12px', fontSize: '0.9rem' }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="filter-label" style={{ minWidth: 'auto', margin: 0 }}>Filter Month:</span>
                            <select
                                value={selectedMonthYear}
                                onChange={(e) => setSelectedMonthYear(e.target.value)}
                                className="nucleus-select"
                                style={{ padding: '6px 24px 6px 12px', fontSize: '0.9rem' }}
                            >
                                <option value="all">All Months (All Time)</option>
                                {uniqueMonthYears.map(my => (
                                    <option key={my.key} value={my.key}>{my.label}</option>
                                ))}
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
                            <th>Approval Date</th>
                            <th>Approved By</th>
                            <th>Location</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.length > 0 ? (
                            filteredCustomers.map((item, index) => (
                                <tr key={item._id || index}>
                                    <td style={{ fontWeight: 500 }}>{index + 1}</td>
                                    <td style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{item.name_of_individual}</td>
                                    <td>
                                        <span className="status-pill info" style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>
                                            {item.category || 'General'}
                                        </span>
                                    </td>
                                    <td className="mono-text" style={{ fontWeight: 500 }}>{item.iec_no || '—'}</td>
                                    <td className="mono-text">{item.udyam_no || '—'}</td>
                                    <td className="mono-text" style={{ fontWeight: 500 }}>
                                        {item.formattedDate}
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{item.approved_by || '—'}</td>
                                    <td>
                                        {item.city || item.state ? (
                                            <span>
                                                {item.city || ''}
                                                {item.city && item.state ? ', ' : ''}
                                                {item.state || ''}
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--slate-400)', fontStyle: 'italic' }}>—</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', color: '#6b7280', padding: '30px' }}>
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

export default NewCustomersReport;
