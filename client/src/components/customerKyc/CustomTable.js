import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, FilterList } from '@mui/icons-material';

const CustomTable = ({ columns, data, rowsPerPage = 10 }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Filter data based on search term
    const filteredData = useMemo(() => {
        if (!searchTerm) return data;

        const lowerTerm = searchTerm.toLowerCase();
        return data.filter(row => {
            return columns.some(col => {
                const val = row[col.accessorKey];
                return val && String(val).toLowerCase().includes(lowerTerm);
            });
        });
    }, [data, searchTerm, columns]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return filteredData.slice(start, start + rowsPerPage);
    }, [filteredData, currentPage, rowsPerPage]);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Reset to first page on search
    };

    if (!data || data.length === 0) {
        return (
            <div className="clean-table-container" style={{ padding: '3rem', textAlign: 'center', color: 'var(--slate-500)' }}>
                <p>No records found.</p>
            </div>
        );
    }

    return (
        <div style={{ paddingBottom: '1rem' }}>
    

            <div className="clean-table-container">
                <table className="premium-table">
                    <thead>
                        <tr>
                            {columns.map((col, index) => (
                                <th key={index} style={{ width: col.size ? `${col.size}px` : 'auto' }}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.length > 0 ? (
                            paginatedData.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    {columns.map((col, colIndex) => (
                                        <td key={colIndex}>
                                            {col.Cell
                                                ? col.Cell({ cell: { getValue: () => row[col.accessorKey], row: { original: row }, value: row[col.accessorKey] } })
                                                : row[col.accessorKey] || '-'}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem', color: 'var(--slate-400)' }}>
                                    No matches found for "{searchTerm}"
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="pagination-controls">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="btn btn-secondary"
                    >
                        <ChevronLeft style={{ fontSize: '1rem' }} /> Previous
                    </button>

                    <span className="pagination-text">
                        Page {currentPage} of {totalPages}
                    </span>

                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="btn btn-secondary"
                    >
                        Next <ChevronRight style={{ fontSize: '1rem' }} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default CustomTable;
