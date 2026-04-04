import React, { useState, useEffect, useCallback } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Search,
    Filter,
    ArrowUpDown,
    Download,
    MoreHorizontal,
    CheckCircle,
    XCircle,
    AlertCircle
} from 'lucide-react';
import './EnterpriseTable.css';
import Button from './Button';
import Badge from './Badge';

/**
 * EnterpriseTable - A generic, scalable table component
 * Features: Sorting, Filtering, Searching, Pagination, Bulk Actions
 */
const EnterpriseTable = ({
    columns,
    fetchData, // Function(params) => Promise({ data, pagination })
    bulkActions = [],
    filterOptions = [],
    exportAction,
    searchPlaceholder = "Search...",
    title,
    selectable = true
}) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
    const [params, setParams] = useState({
        page: 1,
        limit: 10,
        sortBy: '',
        order: 'desc',
        search: '',
    });

    // Load Data
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchData(params);
            setData(result.data || []);
            setPagination(result.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
        } catch (err) {
            console.error("Table Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    }, [fetchData, params]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Handle Sort
    const handleSort = (field) => {
        if (!field) return;
        setParams(prev => ({
            ...prev,
            sortBy: field,
            order: prev.sortBy === field && prev.order === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Handle Search
    const handleSearch = (e) => {
        setParams(prev => ({ ...prev, search: e.target.value, page: 1 }));
    };

    // Handle Selection
    const toggleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(data.map(item => item._id));
        } else {
            setSelectedIds([]);
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <div className="enterprise-table-container">
            {/* --- Toolbar --- */}
            <div className="table-toolbar">
                <div className="toolbar-left">
                    {title && <h2 className="table-title">{title}</h2>}
                    <div className="search-input-wrapper">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={params.search}
                            onChange={handleSearch}
                        />
                    </div>
                    {filterOptions.length > 0 && selectable && (
                        <div className="filter-dropdown">
                            <Button variant="outline" size="sm">
                                <Filter size={16} style={{ marginRight: 8 }} />
                                Filters
                            </Button>
                        </div>
                    )}
                </div>
                <div className="toolbar-right">
                    {exportAction && (
                        <Button variant="outline" size="sm" onClick={() => exportAction(params)}>
                            <Download size={16} style={{ marginRight: 8 }} />
                            Export
                        </Button>
                    )}
                    {bulkActions.length > 0 && selectedIds.length > 0 && (
                        <Button variant="primary" size="sm">
                            Actions
                        </Button>
                    )}
                </div>
            </div>

            {/* --- Bulk Actions Bar --- */}
            {selectable && selectedIds.length > 0 && (
                <div className="bulk-actions-bar">
                    <span className="selected-count">{selectedIds.length} items selected</span>
                    <div className="bulk-buttons">
                        {bulkActions.map(action => (
                            <Button
                                key={action.label}
                                variant={action.variant || "ghost"}
                                size="sm"
                                onClick={() => action.onClick(selectedIds)}
                            >
                                {action.icon && <action.icon size={14} style={{ marginRight: 6 }} />}
                                {action.label}
                            </Button>
                        ))}
                    </div>
                    <Button variant="ghost" size="sm" style={{ marginLeft: 'auto' }} onClick={() => setSelectedIds([])}>
                        Cancel
                    </Button>
                </div>
            )}

            {/* --- Table --- */}
            <div className="table-scroll-wrapper">
                <table className="enterprise-table">
                    <thead>
                        <tr>
                            {selectable && (
                                <th style={{ width: 40 }}>
                                    <input
                                        type="checkbox"
                                        onChange={toggleSelectAll}
                                        checked={selectedIds.length === data.length && data.length > 0}
                                    />
                                </th>
                            )}
                            {columns.map(col => (
                                <th
                                    key={col.key || col.label}
                                    className={col.sortable ? 'sortable' : ''}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                    style={{ width: col.width }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {col.label}
                                        {col.sortable && <ArrowUpDown size={12} />}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="table-loader-overlay">
                                    Loading data...
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="empty-state">
                                    No records found
                                </td>
                            </tr>
                        ) : (
                            data.map(item => (
                                <tr key={item._id} className={selectable && selectedIds.includes(item._id) ? 'selected' : ''}>
                                    {selectable && (
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(item._id)}
                                                onChange={() => toggleSelect(item._id)}
                                            />
                                        </td>
                                    )}
                                    {columns.map(col => (
                                        <td key={col.key || col.label}>
                                            {col.render ? col.render(item[col.key], item) : item[col.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- Pagination --- */}
            <div className="table-pagination">
                <div className="pagination-info">
                    Showing {((params.page - 1) * params.limit) + 1} to {Math.min(params.page * params.limit, pagination.total)} of {pagination.total} records
                </div>
                <div className="pagination-controls">
                    <button
                        className="page-btn"
                        disabled={params.page === 1}
                        onClick={() => setParams(p => ({ ...p, page: p.page - 1 }))}
                    >
                        <ChevronLeft size={16} />
                    </button>

                    {[...Array(pagination.pages)].map((_, i) => {
                        const pageNum = i + 1;
                        // Only show local pages around current for large datasets
                        if (
                            pageNum === 1 ||
                            pageNum === pagination.pages ||
                            (pageNum >= params.page - 1 && pageNum <= params.page + 1)
                        ) {
                            return (
                                <button
                                    key={pageNum}
                                    className={`page-btn ${params.page === pageNum ? 'active' : ''}`}
                                    onClick={() => setParams(p => ({ ...p, page: pageNum }))}
                                >
                                    {pageNum}
                                </button>
                            );
                        } else if (pageNum === params.page - 2 || pageNum === params.page + 2) {
                            return <span key={pageNum} className="pagination-ellipsis">...</span>;
                        }
                        return null;
                    })}

                    <button
                        className="page-btn"
                        disabled={params.page === pagination.pages}
                        onClick={() => setParams(p => ({ ...p, page: p.page + 1 }))}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EnterpriseTable;

