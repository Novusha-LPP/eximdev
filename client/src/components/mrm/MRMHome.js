
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../contexts/UserContext';
import { fetchMRMItems, createMRMItem, updateMRMItem, deleteMRMItem, importMRMItems, fetchMRMMetadata, saveMRMMetadata, fetchMRMUsers } from '../../services/mrmService';
import { IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import '../../styles/mrm.scss';

// Admins who can view all users' MRM
const MRM_ADMINS = ['suraj_rajan', 'shallini_arun'];

const MRMHome = () => {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    // Metadata State
    const [metadata, setMetadata] = useState({ meetingDate: '', reviewDate: '' });

    // Admin View: User Selection
    const isAdmin = MRM_ADMINS.includes(user?.username);
    const [mrmUsers, setMrmUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(''); // Empty = view all (for admin) or own (for regular user)

    // Import Modal
    const [showImportModal, setShowImportModal] = useState(false);
    const [importMode, setImportMode] = useState('as-is');
    const [importSourceMonth, setImportSourceMonth] = useState(selectedMonth === 1 ? 12 : selectedMonth - 1);
    const [importSourceYear, setImportSourceYear] = useState(selectedMonth === 1 ? selectedYear - 1 : selectedYear);

    // Status Filter
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'Green', 'Yellow', 'Red', 'Gray'

    // Delete Confirmation Dialog
    const [deleteDialog, setDeleteDialog] = useState({
        open: false,
        itemId: null,
        itemName: ''
    });

    // Load MRM users for admin dropdown
    useEffect(() => {
        if (isAdmin) {
            fetchMRMUsers().then(users => setMrmUsers(users)).catch(console.error);
        }
    }, [isAdmin]);

    useEffect(() => {
        loadData();
        // Update default import source when selection changes
        setImportSourceMonth(selectedMonth === 1 ? 12 : selectedMonth - 1);
        setImportSourceYear(selectedMonth === 1 ? selectedYear - 1 : selectedYear);
    }, [selectedMonth, selectedYear, selectedUserId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const monthStr = String(selectedMonth).padStart(2, '0');
            // For admin: pass selectedUserId if selected, otherwise fetch all
            // For regular user: no userId param (backend will show shared data)
            const userIdParam = isAdmin && selectedUserId ? selectedUserId : null;

            // Parallel fetch items and metadata
            const [itemsData, metaData] = await Promise.all([
                fetchMRMItems(monthStr, selectedYear, userIdParam),
                fetchMRMMetadata(monthStr, selectedYear)
            ]);

            setItems(itemsData.map(i => ({ ...i, isDirty: false })));
            setMetadata({
                meetingDate: metaData?.meetingDate ? new Date(metaData.meetingDate).toISOString().split('T')[0] : '',
                reviewDate: metaData?.reviewDate ? new Date(metaData.reviewDate).toISOString().split('T')[0] : ''
            });

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
            await saveMRMMetadata({
                month: String(selectedMonth).padStart(2, '0'),
                year: selectedYear,
                ...newMeta
            });
        } catch (err) {
            console.error("Failed to save metadata", err);
        }
    };

    const handleAddItem = async () => {
        const newItem = {
            month: String(selectedMonth).padStart(2, '0'),
            year: selectedYear,
            processDescription: "New Item",
            status: "Gray",
            createdBy: user?._id
        };
        try {
            const saved = await createMRMItem(newItem);
            setItems([...items, { ...saved, isDirty: false }]);
        } catch (err) {
            console.error(err);
            alert("Failed to create item: " + (err.response?.data?.error || err.message));
        }
    };

    // Only updates local state
    const handleFieldChange = (id, field, value) => {
        setItems(prevItems => prevItems.map(item =>
            item._id === id ? { ...item, [field]: value, isDirty: true } : item
        ));
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
                userId: user?._id
            });
            setShowImportModal(false);
            loadData();
        } catch (err) {
            alert("Import failed: " + (err.response?.data?.error || err.message));
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
        Green: items.filter(i => i.status === 'Green').length,
        Yellow: items.filter(i => i.status === 'Yellow').length,
        Red: items.filter(i => i.status === 'Red').length,
        Gray: items.filter(i => i.status === 'Gray' || !i.status).length,
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
                            <button
                                className={`filter-btn gray ${statusFilter === 'Gray' ? 'active' : ''}`}
                                onClick={() => setStatusFilter('Gray')}
                            >
                                ⚪ {statusCounts.Gray}
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
                            <option value="">-- All Users --</option>
                            {mrmUsers.map(u => (
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
                                <tr><td><strong>Status</strong></td><td><span style={{ color: '#065f46' }}>🟢 Green</span> = On Track, <span style={{ color: '#92400e' }}>🟡 Yellow</span> = At Risk, <span style={{ color: '#991b1b' }}>🔴 Red</span> = Off Track, <span style={{ color: '#6b7280' }}>⚪ Gray</span> = Not Started</td></tr>
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
                                <th style={{ width: '200px' }}>Process Description</th>
                                <th style={{ width: '150px' }}>Objective</th>
                                <th style={{ width: '100px' }}>Target</th>
                                <th style={{ width: '100px' }}>Frequency</th>
                                <th style={{ width: '120px' }}>Responsibility</th>
                                <th style={{ width: '120px' }}>Actual ({prevMonthName}-{getYearShort(prevYearVal)})</th>
                                <th style={{ width: '120px' }}>Plan ({currentMonthName}-{getYearShort(selectedYear)})</th>
                                <th style={{ width: '200px' }}>Action Plan</th>
                                <th style={{ width: '120px' }}>Resp. (Action)</th>
                                <th style={{ width: '120px' }}>Target Date</th>
                                <th style={{ width: '100px' }}>Status</th>
                                <th style={{ width: '200px' }}>Remarks</th>
                                <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan="13" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                        {items.length === 0
                                            ? 'No entries for this month. Add a new row or import from previous month.'
                                            : `No items with "${statusFilter}" status.`}
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map(item => (
                                    <tr key={item._id} className={item.isDirty ? 'row-dirty' : ''}>
                                        <td><textarea value={item.processDescription || ''} onChange={e => handleFieldChange(item._id, 'processDescription', e.target.value)} /></td>
                                        <td><textarea value={item.objective || ''} onChange={e => handleFieldChange(item._id, 'objective', e.target.value)} /></td>
                                        <td><input value={item.target || ''} onChange={e => handleFieldChange(item._id, 'target', e.target.value)} /></td>
                                        <td><input value={item.monitoringFrequency || ''} onChange={e => handleFieldChange(item._id, 'monitoringFrequency', e.target.value)} /></td>
                                        <td><input value={item.responsibility || ''} onChange={e => handleFieldChange(item._id, 'responsibility', e.target.value)} /></td>
                                        <td><input value={item.actual || ''} onChange={e => handleFieldChange(item._id, 'actual', e.target.value)} /></td>
                                        <td><input value={item.plan || ''} onChange={e => handleFieldChange(item._id, 'plan', e.target.value)} /></td>
                                        <td><textarea value={item.actionPlan || ''} onChange={e => handleFieldChange(item._id, 'actionPlan', e.target.value)} /></td>
                                        <td><input value={item.responsibilityAction || ''} onChange={e => handleFieldChange(item._id, 'responsibilityAction', e.target.value)} /></td>
                                        <td>
                                            <input
                                                type="date"
                                                value={item.targetDate ? new Date(item.targetDate).toISOString().split('T')[0] : ''}
                                                onChange={e => handleFieldChange(item._id, 'targetDate', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <select
                                                value={item.status || 'Gray'}
                                                onChange={e => handleFieldChange(item._id, 'status', e.target.value)}
                                                className={`status-badge ${item.status}`}
                                                style={{ width: '100%', height: '35px', border: 'none' }}
                                            >
                                                <option value="Green">Green</option>
                                                <option value="Yellow">Yellow</option>
                                                <option value="Red">Red</option>
                                                <option value="Gray">Gray</option>
                                            </select>
                                        </td>
                                        <td><textarea value={item.remarks || ''} onChange={e => handleFieldChange(item._id, 'remarks', e.target.value)} /></td>
                                        <td style={{ display: 'flex', gap: '5px', justifyContent: 'center', alignItems: 'center' }}>
                                            <IconButton
                                                onClick={() => handleSaveItem(item)}
                                                color={item.isDirty ? "primary" : "default"}
                                                title="Save"
                                            >
                                                <SaveIcon />
                                            </IconButton>
                                            <IconButton onClick={() => openDeleteDialog(item)} color="error" title="Delete">
                                                <DeleteIcon />
                                            </IconButton>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
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
        </div >
    );
};

export default MRMHome;
