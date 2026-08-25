import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { getEndpoint } from './reports-helper';

const Top10ImportersReport = ({
    filterType,
    selectedMonth,
    selectedYear,
    selectedQuarter,
    dateRange,
    category = 'all',
    branchId = ''
}) => {
    const [top10Data, setTop10Data] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });

    useEffect(() => {
        const fetchTop10 = async () => {
            setLoading(true);
            try {
                const endpoint = getEndpoint('/project-nucleus/top-importers');
                const params = {
                    filterType,
                    month: selectedMonth,
                    year: selectedYear,
                    quarter: selectedQuarter,
                    startDate: dateRange.start,
                    endDate: dateRange.end,
                    category: category || 'all',
                    branchId: branchId || ''
                };

                const res = await axios.get(endpoint, { params, withCredentials: true });
                setTop10Data(res.data);
            } catch (error) {
                console.error("Error fetching top 10 importers:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTop10();
    }, [filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, category, branchId]);

    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const sortedTop10Data = useMemo(() => {
        if (!sortConfig.key) return top10Data;

        return [...top10Data].sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [top10Data, sortConfig]);

    if (loading) {
        return (
            <div className="nucleus-loading-container">
                <div className="nucleus-loader"></div>
                <div style={{ marginTop: '1rem', color: '#6b7280' }}>Loading report details...</div>
            </div>
        );
    }

    return (
        <div className="nucleus-table-wrapper">
            <table className="nucleus-table">
                <thead>
                    <tr>
                        <th>S.No</th>
                        <th>Importer Name</th>
                        <th onClick={() => handleSort('total20')} style={{ cursor: 'pointer' }}>
                            20 FT Containers {sortConfig.key === 'total20' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </th>
                        <th onClick={() => handleSort('total40')} style={{ cursor: 'pointer' }}>
                            40 FT Containers {sortConfig.key === 'total40' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </th>
                        <th onClick={() => handleSort('fclTeus')} style={{ cursor: 'pointer' }}>
                            FCL {sortConfig.key === 'fclTeus' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </th>
                        <th onClick={() => handleSort('lclTeus')} style={{ cursor: 'pointer' }}>
                            LCL {sortConfig.key === 'lclTeus' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </th>
                        <th onClick={() => handleSort('totalTeus')} style={{ cursor: 'pointer' }}>
                            Total TEU {sortConfig.key === 'totalTeus' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </th>
                        <th>Handled By</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedTop10Data.length > 0 ? (
                        sortedTop10Data.map((item, index) => (
                            <tr key={item.importer || index}>
                                <td style={{ fontWeight: 500 }}>{index + 1}</td>
                                <td>{item.importer}</td>
                                <td>{item.total20}</td>
                                <td>{item.total40}</td>
                                <td>{item.fclTeus}</td>
                                <td>{item.lclTeus}</td>
                                <td style={{ fontWeight: 'bold' }}>{item.totalTeus}</td>
                                <td>
                                    {item.handlers && item.handlers.length > 0 ? (
                                        item.handlers.map((h, i) => (
                                            <span key={i} className="handler-tag">{h}</span>
                                        ))
                                    ) : (
                                        <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '12px' }}>Unassigned</span>
                                    )}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="8" style={{ textAlign: 'center', color: '#6b7280', padding: '30px' }}>
                                No data found for the selected period.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Top10ImportersReport;
