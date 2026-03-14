
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UserContext } from '../../contexts/UserContext';
import { fetchMRMItems, createMRMItem, updateMRMItem, deleteMRMItem, bulkDeleteMRMItems, importMRMItems, fetchMRMMetadata, saveMRMMetadata, fetchMRMUsers, reorderMRMItems } from '../../services/mrmService';
import { IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Autocomplete, TextField, Menu, MenuItem, Tooltip } from '@mui/material';
import { Reorder, useDragControls } from "framer-motion";
import SaveIcon from '@mui/icons-material/Save';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import '../../styles/mrm.scss';

const ReorderRow = ({ item, index, handleFieldChange, handleSaveItem, openDeleteDialog, handleInsertItem, autoResizeTextarea, mrmUsers }) => {
    const controls = useDragControls();

    if (item.isTitleRow) {
        return (
            <Reorder.Item
                as="tr"
                key={item._id}
                value={item}
                dragListener={false}
                dragControls={controls}
                className="title-row-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ backgroundColor: item.bgColor || '#f8fafc' }}
            >
                <td className="drag-handle-cell">
                    <div className="drag-handle" onPointerDown={(e) => controls.start(e)}>
                        <DragIndicatorIcon sx={{ fontSize: 20, color: '#64748b' }} />
                    </div>
                </td>
                <td colSpan="13" className="title-row-content">
                    <div className="title-row-inner">
                        <input
                            type="text"
                            value={item.processDescription || ''}
                            onChange={e => handleFieldChange(item._id, 'processDescription', e.target.value)}
                            placeholder="Enter Title..."
                            className="title-input"
                        />
                        <div className="title-actions">
                            <IconButton onClick={() => handleSaveItem(item)} size="small" color={item.isDirty ? "primary" : "default"}>
                                <SaveIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                            <IconButton onClick={() => openDeleteDialog(item)} size="small" color="error">
                                <DeleteIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                            <IconButton onClick={(e) => handleInsertItem(index, 'normal')} size="small">
                                <AddCircleOutlineIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </div>
                    </div>
                </td>
            </Reorder.Item>
        );
    }

    return (
        <Reorder.Item
            as="tr"
            key={item._id}
            value={item}
            dragListener={false}
            dragControls={controls}
            className={item.isDirty ? 'row-dirty' : ''}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
        >
            <td className="drag-handle-cell">
                <div 
                    className="drag-handle" 
                    onPointerDown={(e) => controls.start(e)}
                    style={{ cursor: 'grab', display: 'flex', justifyContent: 'center' }}
                >
                    <DragIndicatorIcon sx={{ fontSize: 20, color: '#94a3b8' }} />
                </div>
            </td>
            <td onClick={e => e.currentTarget.querySelector('textarea')?.focus()} style={{ cursor: 'text' }}>
                <textarea
                    value={item.processDescription || ''}
                    onChange={e => handleFieldChange(item._id, 'processDescription', e.target.value, e)}
                    onFocus={autoResizeTextarea}
                    onInput={autoResizeTextarea}
                />
            </td>
            <td onClick={e => e.currentTarget.querySelector('textarea')?.focus()} style={{ cursor: 'text' }}>
                <textarea
                    value={item.objective || ''}
                    onChange={e => handleFieldChange(item._id, 'objective', e.target.value, e)}
                    onFocus={autoResizeTextarea}
                    onInput={autoResizeTextarea}
                />
            </td>
            <td onClick={e => e.currentTarget.querySelector('textarea')?.focus()} style={{ cursor: 'text' }}>
                <textarea
                    value={item.target || ''}
                    onChange={e => handleFieldChange(item._id, 'target', e.target.value, e)}
                    onFocus={autoResizeTextarea}
                    onInput={autoResizeTextarea}
                />
            </td>
            <td onClick={e => e.currentTarget.querySelector('select')?.focus()} style={{ cursor: 'pointer' }}>
                <select
                    value={item.monitoringFrequency || ''}
                    onChange={e => handleFieldChange(item._id, 'monitoringFrequency', e.target.value)}
                    style={{ width: '100%', height: '35px', border: 'none', background: 'transparent', padding: '4px 8px', fontSize: '0.8rem' }}
                >
                    <option value="">Select...</option>
                    <option value="Week">Week</option>
                    <option value="Month">Month</option>
                    <option value="Quarter">Quarter</option>
                    <option value="Half Year">Half Year</option>
                    <option value="Year">Year</option>
                </select>
            </td>
            <td onClick={e => e.currentTarget.querySelector('textarea')?.focus()} style={{ cursor: 'text' }}>
                <textarea
                    value={item.responsibility || ''}
                    onChange={e => handleFieldChange(item._id, 'responsibility', e.target.value, e)}
                    onFocus={autoResizeTextarea}
                    onInput={autoResizeTextarea}
                />
            </td>
            <td onClick={e => e.currentTarget.querySelector('textarea')?.focus()} style={{ cursor: 'text' }}>
                <textarea
                    value={item.actual || ''}
                    onChange={e => handleFieldChange(item._id, 'actual', e.target.value, e)}
                    onFocus={autoResizeTextarea}
                    onInput={autoResizeTextarea}
                />
            </td>
            <td onClick={e => e.currentTarget.querySelector('textarea')?.focus()} style={{ cursor: 'text' }}>
                <textarea
                    value={item.plan || ''}
                    onChange={e => handleFieldChange(item._id, 'plan', e.target.value, e)}
                    onFocus={autoResizeTextarea}
                    onInput={autoResizeTextarea}
                />
            </td>
            <td onClick={e => e.currentTarget.querySelector('textarea')?.focus()} style={{ cursor: 'text' }}>
                <textarea
                    value={item.actionPlan || ''}
                    onChange={e => handleFieldChange(item._id, 'actionPlan', e.target.value, e)}
                    onFocus={autoResizeTextarea}
                    onInput={autoResizeTextarea}
                />
            </td>
            <td onClick={() => {}} style={{ cursor: 'pointer' }}>
                <Autocomplete
                    size="small"
                    options={mrmUsers}
                    getOptionLabel={(option) => {
                        if (typeof option === 'string') return option;
                        return `${option.first_name || ''} ${option.last_name || ''}`.trim() || option.username;
                    }}
                    value={mrmUsers.find(u => u.username === item.responsibilityAction) || item.responsibilityAction || null}
                    onChange={(e, newValue) => {
                        const username = newValue?.username || (typeof newValue === 'string' ? newValue : '');
                        handleFieldChange(item._id, 'responsibilityAction', username);
                    }}
                    freeSolo
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            variant="standard"
                            placeholder="Select..."
                            InputProps={{
                                ...params.InputProps,
                                disableUnderline: true,
                                style: { fontSize: '0.8rem', padding: '2px 4px' }
                            }}
                        />
                    )}
                    sx={{
                        width: '100%',
                        '& .MuiAutocomplete-input': { padding: '2px 4px !important', fontSize: '0.75rem' },
                        '& .MuiInputBase-root': { padding: '0 !important' }
                    }}
                />
            </td>
            <td onClick={e => e.currentTarget.querySelector('input')?.focus()} style={{ cursor: 'pointer' }}>
                <input
                    type="date"
                    value={item.targetDate ? new Date(item.targetDate).toISOString().split('T')[0] : ''}
                    onChange={e => handleFieldChange(item._id, 'targetDate', e.target.value)}
                />
            </td>
            <td onClick={e => e.currentTarget.querySelector('select')?.focus()} style={{ cursor: 'pointer' }}>
                <select
                    value={item.status || 'Green'}
                    onChange={e => handleFieldChange(item._id, 'status', e.target.value)}
                    className={`status-badge ${item.status}`}
                    style={{ width: '100%', height: '25px', border: 'none' }}
                >
                    <option value="Green" style={{ background: 'white', color: '#166534' }}>Green</option>
                    <option value="Yellow" style={{ background: 'white', color: '#ca8a04' }}>Yellow</option>
                    <option value="Red" style={{ background: 'white', color: '#dc2626' }}>Red</option>
                </select>
            </td>
            <td onClick={e => e.currentTarget.querySelector('textarea')?.focus()} style={{ cursor: 'text' }}>
                <textarea
                    value={item.remarks || ''}
                    onChange={e => handleFieldChange(item._id, 'remarks', e.target.value, e)}
                    onFocus={autoResizeTextarea}
                    onInput={autoResizeTextarea}
                />
            </td>
            <td className="action-cell">
                <div className="action-buttons">
                        <IconButton
                        onClick={(e) => {
                            // We'll pass the anchor element to show a menu
                            handleInsertItem(index, 'menu', e.currentTarget);
                        }}
                        size="small"
                        sx={{
                            backgroundColor: '#f0f9ff',
                            color: '#0369a1',
                            '&:hover': { backgroundColor: '#e0f2fe' },
                            width: 24,
                            height: 24,
                            padding: '4px'
                        }}
                        title="Add row below"
                    >
                        <AddCircleOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton
                        onClick={() => handleSaveItem(item)}
                        size="small"
                        sx={{
                            backgroundColor: item.isDirty ? '#217346' : '#e5e7eb',
                            color: item.isDirty ? 'white' : '#6b7280',
                            '&:hover': { backgroundColor: item.isDirty ? '#1b5e20' : '#d1d5db' },
                            width: 24,
                            height: 24,
                            padding: '4px'
                        }}
                        title="Save"
                    >
                        <SaveIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                    <IconButton
                        onClick={() => openDeleteDialog(item)}
                        size="small"
                        sx={{
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            '&:hover': { backgroundColor: '#fecaca' },
                            width: 24,
                            height: 24,
                            padding: '4px'
                        }}
                        title="Delete"
                    >
                        <DeleteIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                </div>
            </td>
        </Reorder.Item>
    );
};

const MRMHome = () => {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    // Metadata State
    const [metadata, setMetadata] = useState({ meetingDate: '', reviewDate: '' });

    // Admin View: User Selection - Dynamic check based on role
    const isAdmin = user?.role === 'Admin';
    const [mrmUsers, setMrmUsers] = useState([]);
    // Initialize selectedUserId from URL param if present (for admin navigation from dashboard)
    const [selectedUserId, setSelectedUserId] = useState(searchParams.get('userId') || '');

    // Import Modal
    const [showImportModal, setShowImportModal] = useState(false);
    const [importMode, setImportMode] = useState('as-is');
    const [importSourceMonth, setImportSourceMonth] = useState(selectedMonth === 1 ? 12 : selectedMonth - 1);
    const [importSourceYear, setImportSourceYear] = useState(selectedMonth === 1 ? selectedYear - 1 : selectedYear);

    // Status Filter
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'Green', 'Yellow', 'Red'

    // Delete Confirmation Dialog
    const [deleteDialog, setDeleteDialog] = useState({
        open: false,
        itemId: null,
        itemName: ''
    });

    // Bulk Delete Dialog
    const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);

    // Load MRM users for admin dropdown
    // Load MRM users for dropdowns
    useEffect(() => {
        fetchMRMUsers().then(users => setMrmUsers(users)).catch(console.error);
    }, []);

    useEffect(() => {
        loadData();
        // Update default import source when selection changes
        setImportSourceMonth(selectedMonth === 1 ? 12 : selectedMonth - 1);
        setImportSourceYear(selectedMonth === 1 ? selectedYear - 1 : selectedYear);
    }, [selectedMonth, selectedYear, selectedUserId, user]);

    const loadData = async () => {
        setLoading(true);
        try {
            const monthStr = String(selectedMonth).padStart(2, '0');
            // For admin: pass selectedUserId if selected, otherwise fetch all
            // For regular user: no userId param (backend will show shared data)
            // Determine distinct user ID for fetching/saving
            const targetUserId = (isAdmin && selectedUserId) ? selectedUserId : user?._id;

            // Parallel fetch items and metadata
            const [itemsData, metaData] = await Promise.all([
                fetchMRMItems(monthStr, selectedYear, targetUserId),
                fetchMRMMetadata(monthStr, selectedYear, targetUserId)
            ]);

            setItems(itemsData.map(i => ({ ...i, isDirty: false })));
            setMetadata({
                meetingDate: metaData?.meetingDate ? new Date(metaData.meetingDate).toISOString().split('T')[0] : '',
                reviewDate: metaData?.reviewDate ? new Date(metaData.reviewDate).toISOString().split('T')[0] : ''
            });

            // Auto-resize all textareas after data loads
            setTimeout(() => {
                document.querySelectorAll('.data-grid-container textarea').forEach(textarea => {
                    textarea.style.height = 'auto';
                    textarea.style.height = textarea.scrollHeight + 'px';
                });
            }, 100);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleMetadataChange = async (field, value) => {
        const newMeta = { ...metadata, [field]: value };
        setMetadata(newMeta);

        try {
            const targetUserId = (isAdmin && selectedUserId) ? selectedUserId : user?._id;

            await saveMRMMetadata({
                month: String(selectedMonth).padStart(2, '0'),
                year: selectedYear,
                userId: targetUserId,
                ...newMeta
            });
        } catch (err) {
            console.error("Failed to save metadata", err);
        }
    };

    // Add Row Menu State
    const [addRowMenu, setAddRowMenu] = useState(null);
    const [addRowIndex, setAddRowIndex] = useState(null);

    const handleAddItem = async () => {
        const targetUserId = (isAdmin && selectedUserId) ? selectedUserId : user?._id;
        const newItem = {
            month: String(selectedMonth).padStart(2, '0'),
            year: selectedYear,
            processDescription: "New Item",
            status: "Red",
            createdBy: targetUserId
        };
        try {
            const saved = await createMRMItem(newItem);
            setItems([...items, { ...saved, isDirty: false }]);
        } catch (err) {
            console.error(err);
            alert("Failed to create item: " + (err.response?.data?.error || err.message));
        }
    };

    const handleInsertItem = async (index, type, anchor = null) => {
        if (type === 'menu') {
            setAddRowIndex(index);
            setAddRowMenu(anchor);
            return;
        }

        setAddRowMenu(null);
        const targetUserId = (isAdmin && selectedUserId) ? selectedUserId : user?._id;
        const currentItem = items[index];
        const newItem = {
            month: String(selectedMonth).padStart(2, '0'),
            year: selectedYear,
            processDescription: type === 'title' ? "New Title" : "New In-between Item",
            status: "Red",
            createdBy: targetUserId,
            insertAfterSeq: currentItem.seq,
            isTitleRow: type === 'title'
        };
        try {
            const saved = await createMRMItem(newItem);
            const newItems = [...items];
            // Update local sequences for UI consistency until next reload
            newItems.slice(index + 1).forEach(item => { item.seq += 1; });
            newItems.splice(index + 1, 0, { ...saved, isDirty: false });
            setItems(newItems);
        } catch (err) {
            console.error(err);
            alert("Failed to insert item");
        }
    };

    const handleReorder = async (newOrder) => {
        setItems(newOrder);
        try {
            const itemsToUpdate = newOrder.map((item, index) => ({
                _id: item._id,
                seq: index
            }));
            await reorderMRMItems(itemsToUpdate);
        } catch (err) {
            console.error("Failed to persist reorder", err);
        }
    };

    // Auto-resize textarea based on content
    const autoResizeTextarea = (e) => {
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    };

    // Only updates local state
    const handleFieldChange = (id, field, value, e) => {
        setItems(prevItems => prevItems.map(item =>
            item._id === id ? { ...item, [field]: value, isDirty: true } : item
        ));
        // Auto-resize if it's a textarea
        if (e && e.target.tagName === 'TEXTAREA') {
            autoResizeTextarea(e);
        }
    };

    // Performs the API call
    const handleSaveItem = async (item) => {
        try {
            // Remove isDirty before sending if API is strict, but usually extra fields are ignored
            const { isDirty, ...dataToSend } = item;
            await updateMRMItem(item._id, dataToSend);

            // Reset dirty flag on success
            setItems(prev => prev.map(i => i._id === item._id ? { ...i, isDirty: false } : i));
        } catch (err) {
            console.error("Failed to save", err);
            alert("Failed to save row");
        }
    };

    // Opens delete confirmation dialog
    const openDeleteDialog = (item) => {
        setDeleteDialog({
            open: true,
            itemId: item._id,
            itemName: item.processDescription || 'this item'
        });
    };

    // Closes delete dialog
    const closeDeleteDialog = () => {
        setDeleteDialog({ open: false, itemId: null, itemName: '' });
    };

    // Performs the actual delete
    const confirmDelete = async () => {
        const id = deleteDialog.itemId;
        closeDeleteDialog();

        try {
            await deleteMRMItem(id);
            setItems(items.filter(i => i._id !== id));
        } catch (err) {
            console.error(err);
            alert("Failed to delete item");
        }
    };

    const handleImport = async () => {
        try {
            await importMRMItems({
                targetMonth: String(selectedMonth).padStart(2, '0'),
                targetYear: selectedYear,
                sourceMonth: String(importSourceMonth).padStart(2, '0'),
                sourceYear: importSourceYear,
                mode: importMode,
                userId: (isAdmin && selectedUserId) ? selectedUserId : user?._id
            });
            setShowImportModal(false);
            loadData();
        } catch (err) {
            alert("Import failed: " + (err.response?.data?.error || err.message));
        }
    };

    const handleBulkDelete = async () => {
        setBulkDeleteDialog(false);
        setLoading(true);
        try {
            const monthStr = String(selectedMonth).padStart(2, '0');
            const targetUserId = (isAdmin && selectedUserId) ? selectedUserId : user?._id;
            await bulkDeleteMRMItems(monthStr, selectedYear, targetUserId);
            await loadData();
        } catch (err) {
            console.error(err);
            alert("Failed to delete month data: " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    // Helper for labels
    const getMonthName = (m) => new Date(0, m - 1).toLocaleString('default', { month: 'short' });
    const getYearShort = (y) => String(y).slice(-2);

    const currentMonthName = getMonthName(selectedMonth);
    const prevMonthIdx = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevMonthName = getMonthName(prevMonthIdx);
    const prevYearVal = selectedMonth === 1 ? selectedYear - 1 : selectedYear;

    // Filter items by status
    const filteredItems = statusFilter === 'all'
        ? items
        : items.filter(item => item.status === statusFilter);

    // Status counts for filter badges
    const statusCounts = {
        all: items.length,
        Green: items.filter(i => i.status === 'Green' || !i.status).length,
        Yellow: items.filter(i => i.status === 'Yellow').length,
        Red: items.filter(i => i.status === 'Red').length,
    };

    // Help Modal State
    const [showHelpModal, setShowHelpModal] = useState(false);

    return (
        <div className="mrm-container">
            {/* Title Bar */}
            <div className="title-bar">
                <div className="title-center">
                    <h1>Monthly Review Meeting (MRM)</h1>
                    <span className="user-name">Welcome, {user?.first_name} {user?.last_name}</span>
                </div>
                <div className="title-buttons">
                    {isAdmin && (
                        <button
                            className="help-btn"
                            onClick={() => navigate('/mrm/admin')}
                            title="View All Users' MRM"
                        >
                            <span>📊</span> Dashboard
                        </button>
                    )}
                    <button className="help-btn" onClick={() => setShowHelpModal(true)} title="What is MRM?">
                        <span>ℹ️</span> Help
                    </button>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="header-actions">
                <div className="date-controls">
                    <div className="date-field">
                        <label>Review Date:</label>
                        <input
                            type="date"
                            value={metadata.reviewDate}
                            onChange={e => handleMetadataChange('reviewDate', e.target.value)}
                        />
                    </div>
                    <div className="date-field">
                        <label>Meeting Date:</label>
                        <input
                            type="date"
                            value={metadata.meetingDate}
                            onChange={e => handleMetadataChange('meetingDate', e.target.value)}
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="status-filter">
                        <label>Filter:</label>
                        <div className="filter-buttons">
                            <button
                                className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                                onClick={() => setStatusFilter('all')}
                            >
                                All ({statusCounts.all})
                            </button>
                            <button
                                className={`filter-btn green ${statusFilter === 'Green' ? 'active' : ''}`}
                                onClick={() => setStatusFilter('Green')}
                            >
                                🟢 {statusCounts.Green}
                            </button>
                            <button
                                className={`filter-btn yellow ${statusFilter === 'Yellow' ? 'active' : ''}`}
                                onClick={() => setStatusFilter('Yellow')}
                            >
                                🟡 {statusCounts.Yellow}
                            </button>
                            <button
                                className={`filter-btn red ${statusFilter === 'Red' ? 'active' : ''}`}
                                onClick={() => setStatusFilter('Red')}
                            >
                                🔴 {statusCounts.Red}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="action-controls">
                    {/* Admin User Selector */}
                    {isAdmin && (
                        <select
                            value={selectedUserId}
                            onChange={e => setSelectedUserId(e.target.value)}
                            className="user-selector"
                        >
                            <option value="" disabled>Select User</option>
                            {mrmUsers
                                .filter(u => ['Head_of_Department', 'Admin'].includes(u.role))
                                .map(u => (
                                    <option key={u._id} value={u._id}>
                                        {u.first_name} {u.last_name}
                                    </option>
                                ))}
                        </select>
                    )}

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

                    <button className="secondary" onClick={() => setShowImportModal(true)}>Import / Copy</button>
                    {items.length > 0 && (
                        <button
                            className="danger-btn-outline"
                            onClick={() => setBulkDeleteDialog(true)}
                            title="Delete all rows for this month"
                        >
                            🗑️ Delete Month
                        </button>
                    )}
                    <button onClick={handleAddItem}>+ Add Row</button>
                </div>
            </div>

            {/* Help Modal */}
            {showHelpModal && (
                <div className="modal-overlay">
                    <div className="modal-content help-modal">
                        <h2>📋 What is MRM?</h2>
                        <p><strong>Monthly Review Meeting (MRM)</strong> is a structured process to track organizational objectives, monitor performance, and plan corrective actions on a monthly basis.</p>

                        <h3>How should an MRM Point be?</h3>
                        <ul>
                            <li><strong>Specific</strong> – Clearly define what is being measured</li>
                            <li><strong>Measurable</strong> – Include quantifiable targets</li>
                            <li><strong>Actionable</strong> – Ensure there's a clear action plan</li>
                            <li><strong>Time-bound</strong> – Set realistic target dates</li>
                        </ul>

                        <h3>Field Descriptions</h3>
                        <table className="help-table">
                            <tbody>
                                <tr><td><strong>Process Description</strong></td><td>The business process or activity being reviewed</td></tr>
                                <tr><td><strong>Objective</strong></td><td>The goal or purpose of this process</td></tr>
                                <tr><td><strong>Target</strong></td><td>The measurable target value (e.g., 95%, ₹10L)</td></tr>
                                <tr><td><strong>Frequency</strong></td><td>How often this is monitored (Daily, Weekly, Monthly)</td></tr>
                                <tr><td><strong>Responsibility</strong></td><td>Person accountable for this process</td></tr>
                                <tr><td><strong>Actual (Prev Month)</strong></td><td>The actual achieved value from last month</td></tr>
                                <tr><td><strong>Plan (Current Month)</strong></td><td>The planned target for current month</td></tr>
                                <tr><td><strong>Action Plan</strong></td><td>Steps to be taken if target is not met</td></tr>
                                <tr><td><strong>Resp. (Action)</strong></td><td>Person responsible for the action plan</td></tr>
                                <tr><td><strong>Target Date</strong></td><td>Deadline for completing the action</td></tr>
                                <tr><td><strong>Status</strong></td><td><span style={{ color: '#166534' }}>🟢 Green</span> = Completed, <span style={{ color: '#ca8a04' }}>🟡 Yellow</span> = In Progress, <span style={{ color: '#dc2626' }}>🔴 Red</span> = Not Started</td></tr>
                                <tr><td><strong>Remarks</strong></td><td>Additional notes or comments</td></tr>
                            </tbody>
                        </table>

                        <div className="modal-actions">
                            <button className="confirm" onClick={() => setShowHelpModal(false)}>Got it!</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="data-grid-container">
                {loading ? <p style={{ padding: '20px', textAlign: 'center' }}>Loading...</p> : (
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: '30px' }}></th>
                                <th style={{ width: '250px' }} title="Process Description">Process<br />Description</th>
                                <th style={{ width: '180px' }} title="Objective">Objective</th>
                                <th style={{ width: '70px' }} title="Target">Target</th>
                                <th style={{ width: '80px' }} title="Monitoring Frequency">Monitoring<br />Freq.</th>
                                <th style={{ width: '90px' }} title="Responsibility">Resp.</th>
                                <th style={{ width: '90px' }} title={`Actual (${prevMonthName} ${prevYearVal})`}>Act.<br />({prevMonthName.substring(0, 3)}-{getYearShort(prevYearVal)})</th>
                                <th style={{ width: '90px' }} title={`Plan (${currentMonthName} ${selectedYear})`}>Plan<br />({currentMonthName.substring(0, 3)}-{getYearShort(selectedYear)})</th>
                                <th style={{ width: '220px' }} title="Action Plan">Action<br />Plan</th>
                                <th style={{ width: '80px' }} title="Action Responsibility">Act.<br />Resp.</th>
                                <th style={{ width: '95px' }} title="Target Date">Target<br />Date</th>
                                <th style={{ width: '75px' }} title="Status">Status</th>
                                <th style={{ width: '200px' }} title="Remarks">Remarks</th>
                                <th style={{ width: '80px', textAlign: 'center' }} title="Actions">Act.</th>
                            </tr>
                        </thead>
                        <Reorder.Group as="tbody" axis="y" values={filteredItems} onReorder={handleReorder}>
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan="14" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                        {items.length === 0
                                            ? 'No entries for this month. Add a new row or import from previous month.'
                                            : `No items with "${statusFilter}" status.`}
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item, index) => (
                                    <ReorderRow 
                                        key={item._id} 
                                        item={item} 
                                        index={index}
                                        handleFieldChange={handleFieldChange}
                                        handleSaveItem={handleSaveItem}
                                        openDeleteDialog={openDeleteDialog}
                                        handleInsertItem={handleInsertItem}
                                        autoResizeTextarea={autoResizeTextarea}
                                        mrmUsers={mrmUsers}
                                    />
                                ))
                            )}
                        </Reorder.Group>
                    </table>
                )}
            </div>

            {/* Import Modal */}
            {
                showImportModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h2>Import Data</h2>
                            <div className="form-group">
                                <label>Source Month</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <select value={importSourceMonth} onChange={e => setImportSourceMonth(Number(e.target.value))}>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                            <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                                        ))}
                                    </select>
                                    <select value={importSourceYear} onChange={e => setImportSourceYear(Number(e.target.value))}>
                                        {[2024, 2025, 2026, 2027].map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Import Mode</label>
                                <select value={importMode} onChange={e => setImportMode(e.target.value)}>
                                    <option value="as-is">As-Is (Copy Everything)</option>
                                    <option value="blank">Blank (Structure/Objective Only)</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button className="cancel" onClick={() => setShowImportModal(false)}>Cancel</button>
                                <button className="confirm" onClick={handleImport}>Import</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialog.open}
                onClose={closeDeleteDialog}
                aria-labelledby="delete-dialog-title"
                aria-describedby="delete-dialog-description"
                PaperProps={{
                    sx: {
                        borderRadius: '12px',
                        minWidth: '400px'
                    }
                }}
            >
                <DialogTitle
                    id="delete-dialog-title"
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        color: '#dc2626',
                        fontWeight: 600
                    }}
                >
                    <WarningAmberIcon sx={{ color: '#dc2626' }} />
                    Delete Row
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="delete-dialog-description" sx={{ color: '#4b5563' }}>
                        Are you sure you want to delete "<strong>{deleteDialog.itemName}</strong>"?
                        This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ padding: '16px 24px', gap: '10px' }}>
                    <Button
                        onClick={closeDeleteDialog}
                        variant="outlined"
                        sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 600,
                            color: '#374151',
                            borderColor: '#d1d5db'
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmDelete}
                        variant="contained"
                        sx={{
                            backgroundColor: '#dc2626',
                            '&:hover': { backgroundColor: '#b91c1c' },
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 600
                        }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Bulk Delete Confirmation */}
            <Dialog
                open={bulkDeleteDialog}
                onClose={() => setBulkDeleteDialog(false)}
            >
                <DialogTitle sx={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningAmberIcon /> Delete Entire Month
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete <strong>ALL</strong> entries for <strong>{currentMonthName} {selectedYear}</strong>?
                        This action is irreversible and will remove all rows for this user in this month.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ padding: '16px 24px' }}>
                    <Button onClick={() => setBulkDeleteDialog(false)} variant="outlined">Cancel</Button>
                    <Button
                        onClick={handleBulkDelete}
                        variant="contained"
                        sx={{ backgroundColor: '#dc2626', '&:hover': { backgroundColor: '#b91c1c' } }}
                    >
                        Delete Everything
                    </Button>
                </DialogActions>
            </Dialog>
            {/* Add Row Menu */}
            <Menu
                anchorEl={addRowMenu}
                open={Boolean(addRowMenu)}
                onClose={() => setAddRowMenu(null)}
            >
                <MenuItem onClick={() => handleInsertItem(addRowIndex, 'normal')}>Normal Row</MenuItem>
                <MenuItem onClick={() => handleInsertItem(addRowIndex, 'title')}>Title Row</MenuItem>
            </Menu>
        </div >
    );
};

export default MRMHome;
