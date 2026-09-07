
import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UserContext } from '../../contexts/UserContext';
import { 
    fetchMRMItems, createMRMItem, updateMRMItem, deleteMRMItem, 
    bulkDeleteMRMItems, importMRMItems, fetchMRMMetadata, 
    saveMRMMetadata, fetchMRMUsers, reorderMRMItems,
    submitMRM, approveMRM, requestMRMRevision, reopenMRM, updateObjectiveConfig 
} from '../../services/mrmService';
import { IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Autocomplete, TextField, Menu, MenuItem, Tooltip, Checkbox, FormControlLabel, Snackbar, Alert } from '@mui/material';
import { Reorder, useDragControls } from "framer-motion";
import SaveIcon from '@mui/icons-material/Save';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import TableChartIcon from '@mui/icons-material/TableChart';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SendIcon from '@mui/icons-material/Send';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../../styles/mrm.scss';

const ReorderRow = ({ item, index, handleFieldChange, handleSaveItem, openDeleteDialog, handleInsertItem, autoResizeTextarea, mrmUsers, isLocked, openBaselineDialog, handleStatusChange, hasTileAnomaly }) => {
    const controls = useDragControls();

    if (item.isTitleRow) {
        return (
            <Reorder.Item
                as="tr"
                key={item._id}
                value={item}
                dragListener={!isLocked}
                dragControls={controls}
                className="title-row-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ backgroundColor: item.bgColor || '#f8fafc' }}
            >
                <td className="drag-handle-cell">
                    {!isLocked && (
                        <div className="drag-handle" onPointerDown={(e) => controls.start(e)}>
                            <DragIndicatorIcon sx={{ fontSize: 20, color: '#64748b' }} />
                        </div>
                    )}
                </td>
                <td colSpan="13" className="title-row-content">
                    <div className="title-row-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '8px' }}>
                            <input
                                type="text"
                                value={item.processDescription || ''}
                                onChange={e => handleFieldChange(item._id, 'processDescription', e.target.value)}
                                placeholder="Enter Title..."
                                className="title-input"
                                disabled={isLocked}
                            />
                            {hasTileAnomaly && (
                                <span 
                                    style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '4px', 
                                        fontSize: '0.72rem', 
                                        padding: '2px 8px', 
                                        borderRadius: '12px', 
                                        background: '#fef2f2', 
                                        color: '#b91c1c', 
                                        border: '1px solid #fecaca',
                                        fontWeight: '700'
                                    }}
                                    title="One or more child objectives in this tile have a statistical anomaly"
                                >
                                    ⚡ Anomaly in Tile
                                </span>
                            )}
                        </div>
                        {!isLocked && (
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
                        )}
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
                {!isLocked && (
                    <div 
                        className="drag-handle" 
                        onPointerDown={(e) => controls.start(e)}
                        style={{ cursor: 'grab', display: 'flex', justifyContent: 'center' }}
                    >
                        <DragIndicatorIcon sx={{ fontSize: 20, color: '#94a3b8' }} />
                    </div>
                )}
            </td>
            <td onClick={e => !isLocked && e.currentTarget.querySelector('textarea')?.focus()} style={{ cursor: isLocked ? 'default' : 'text' }}>
                <textarea
                    value={item.processDescription || ''}
                    onChange={e => handleFieldChange(item._id, 'processDescription', e.target.value, e)}
                    onFocus={autoResizeTextarea}
                    onInput={autoResizeTextarea}
                    disabled={isLocked}
                />
            </td>
            <td onClick={e => !isLocked && e.currentTarget.querySelector('textarea')?.focus()} style={{ cursor: isLocked ? 'default' : 'text' }}>
                <textarea
                    value={item.objective || ''}
                    onChange={e => handleFieldChange(item._id, 'objective', e.target.value, e)}
                    onFocus={autoResizeTextarea}
                    onInput={autoResizeTextarea}
                    disabled={isLocked}
                />
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '3px', alignItems: 'center' }}>
                    {item.anomaly?.isAnomaly && (
                        <span 
                            style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '2px', 
                                fontSize: '0.67rem', 
                                padding: '1px 5px', 
                                borderRadius: '4px', 
                                background: '#fef2f2', 
                                color: '#b91c1c', 
                                border: '1px solid #fecaca',
                                fontWeight: '700'
                            }}
                            title={`Statistical Anomaly: Trailing avg was ${item.anomaly.trailingMean}, sudden jump/drop of ${item.anomaly.diffPct}%`}
                        >
                            ⚡ Anomaly {item.anomaly.diffPct > 0 ? `+${item.anomaly.diffPct}%` : `${item.anomaly.diffPct}%`}
                        </span>
                    )}

                    {/* Dual Delta Display (Abs and %) */}
                    {item.yoyDelta ? (
                        <span 
                            style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '2px', 
                                fontSize: '0.67rem', 
                                padding: '1px 5px', 
                                borderRadius: '4px', 
                                background: '#f0f9ff', 
                                color: '#0369a1', 
                                border: '1px solid #bae6fd',
                                fontWeight: '600'
                            }}
                            title={`Baseline: ${item.yoyDelta.baseline} ${item.yoyDelta.metric || ''} | Abs: ${item.yoyDelta.absDelta > 0 ? `+${item.yoyDelta.absDelta}` : item.yoyDelta.absDelta}${item.yoyDelta.pctDelta != null ? ` (${item.yoyDelta.pctDelta > 0 ? `+${item.yoyDelta.pctDelta}%` : `${item.yoyDelta.pctDelta}%`})` : ''}`}
                        >
                            vs LY: {item.yoyDelta.formattedText || (item.yoyDelta.pctDelta != null ? `${item.yoyDelta.absDelta > 0 ? `+${item.yoyDelta.absDelta}` : item.yoyDelta.absDelta} (${item.yoyDelta.pctDelta > 0 ? `+${item.yoyDelta.pctDelta}%` : `${item.yoyDelta.pctDelta}%`})` : (item.yoyDelta.absDelta > 0 ? `+${item.yoyDelta.absDelta}` : item.yoyDelta.absDelta))}
                        </span>
                    ) : (
                        <span 
                            style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                fontSize: '0.65rem', 
                                padding: '1px 4px', 
                                borderRadius: '4px', 
                                background: '#f1f5f9', 
                                color: '#64748b', 
                                border: '1px solid #e2e8f0'
                            }}
                            title="No last-year baseline configured. Click baseline button to add."
                        >
                            No baseline
                        </span>
                    )}

                    {/* Macro Reference Data Points Display */}
                    {item.macroReferences && item.macroReferences.filter(m => m.label && m.value !== null && m.value !== undefined).map((m, mIdx) => (
                        <span
                            key={mIdx}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                fontSize: '0.65rem',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: '#f8fafc',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                                fontWeight: 500
                            }}
                            title={`Macro Reference Data Point: ${m.label} = ${m.value} ${m.unit || ''}`}
                        >
                            📌 {m.label}: {m.value}{m.unit ? ` ${m.unit}` : ''}
                        </span>
                    ))}
                </div>
            </td>
            <td onClick={e => !isLocked && e.currentTarget.querySelector('textarea')?.focus()} style={{ cursor: isLocked ? 'default' : 'text' }}>
                <textarea
                    value={item.target || ''}
                    onChange={e => handleFieldChange(item._id, 'target', e.target.value, e)}
                    onFocus={autoResizeTextarea}
                    onInput={autoResizeTextarea}
                    disabled={isLocked}
                />
            </td>
            <td onClick={e => !isLocked && e.currentTarget.querySelector('select')?.focus()} style={{ cursor: isLocked ? 'default' : 'pointer' }}>
                <select
                    value={item.monitoringFrequency || ''}
                    onChange={e => handleFieldChange(item._id, 'monitoringFrequency', e.target.value)}
                    style={{ width: '100%', height: '35px', border: 'none', background: 'transparent', padding: '4px 8px', fontSize: '0.8rem' }}
                    disabled={isLocked}
                >
                    <option value="">Select...</option>
                    <option value="Week">Week</option>
                    <option value="Month">Month</option>
                    <option value="Quarter">Quarter</option>
                    <option value="Half Year">Half Year</option>
                    <option value="Year">Year</option>
                </select>
            </td>
            <td onClick={e => !isLocked && e.currentTarget.querySelector('textarea')?.focus()} style={{ cursor: isLocked ? 'default' : 'text' }}>
                <textarea
                    value={item.responsibility || ''}
                    onChange={e => handleFieldChange(item._id, 'responsibility', e.target.value, e)}
                    onFocus={autoResizeTextarea}
                    onInput={autoResizeTextarea}
                    disabled={isLocked}
                />
            </td>
            <td onClick={e => !isLocked && e.currentTarget.querySelector('textarea')?.focus()} style={{ cursor: isLocked ? 'default' : 'text' }}>
                <textarea
                    value={item.actual || ''}
                    onChange={e => handleFieldChange(item._id, 'actual', e.target.value, e)}
                    onFocus={autoResizeTextarea}
                    onInput={autoResizeTextarea}
                    disabled={isLocked}
                />
            </td>
            <td onClick={e => !isLocked && e.currentTarget.querySelector('textarea')?.focus()} style={{ cursor: isLocked ? 'default' : 'text' }}>
                <textarea
                    value={item.plan || ''}
                    onChange={e => handleFieldChange(item._id, 'plan', e.target.value, e)}
                    onFocus={autoResizeTextarea}
                    onInput={autoResizeTextarea}
                    disabled={isLocked}
                />
            </td>
            <td onClick={e => !isLocked && e.currentTarget.querySelector('textarea')?.focus()} style={{ cursor: isLocked ? 'default' : 'text' }}>
                <textarea
                    value={item.actionPlan || ''}
                    onChange={e => handleFieldChange(item._id, 'actionPlan', e.target.value, e)}
                    onFocus={autoResizeTextarea}
                    onInput={autoResizeTextarea}
                    disabled={isLocked}
                />
                {item.openPointId && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                        <span 
                            style={{ 
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.65rem', 
                                padding: '1px 5px', 
                                borderRadius: '4px', 
                                background: '#ecfdf5', 
                                color: '#047857', 
                                border: '1px solid #a7f3d0',
                                fontWeight: '600'
                            }}
                            title="Action item is synchronized to Open Points module"
                        >
                            ✓ Open Point Synced
                        </span>
                    </div>
                )}
            </td>
            <td onClick={() => {}} style={{ cursor: isLocked ? 'default' : 'pointer' }}>
                <Autocomplete
                    size="small"
                    disabled={isLocked}
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
            <td onClick={e => !isLocked && e.currentTarget.querySelector('input')?.focus()} style={{ cursor: isLocked ? 'default' : 'pointer' }}>
                <input
                    type="date"
                    disabled={isLocked}
                    value={item.targetDate ? new Date(item.targetDate).toISOString().split('T')[0] : ''}
                    onChange={e => handleFieldChange(item._id, 'targetDate', e.target.value)}
                />
            </td>
            <td onClick={e => !isLocked && e.currentTarget.querySelector('select')?.focus()} style={{ cursor: isLocked ? 'default' : 'pointer' }}>
                <select
                    value={item.status || 'Green'}
                    disabled={isLocked}
                    onChange={e => handleStatusChange ? handleStatusChange(item, e.target.value) : handleFieldChange(item._id, 'status', e.target.value)}
                    className={`status-badge ${item.status}`}
                    style={{ width: '100%', height: '28px', border: 'none' }}
                >
                    <option value="Green" style={{ background: 'white', color: '#166534' }}>Green</option>
                    <option value="Yellow" style={{ background: 'white', color: '#ca8a04' }}>Yellow</option>
                    <option value="Red" style={{ background: 'white', color: '#dc2626' }}>Red</option>
                </select>
            </td>
            <td onClick={e => !isLocked && e.currentTarget.querySelector('textarea')?.focus()} style={{ cursor: isLocked ? 'default' : 'text' }}>
                <textarea
                    value={item.remarks || ''}
                    onChange={e => handleFieldChange(item._id, 'remarks', e.target.value, e)}
                    onFocus={autoResizeTextarea}
                    onInput={autoResizeTextarea}
                    disabled={isLocked}
                />
            </td>
            <td className="action-cell">
                {isLocked ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <Tooltip title="Month is locked (Approved)">
                            <LockIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                        </Tooltip>
                    </div>
                ) : (
                    <div className="action-buttons">
                        <IconButton
                            onClick={(e) => {
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
                            onClick={() => openBaselineDialog(item)}
                            size="small"
                            sx={{
                                backgroundColor: item.lastYearBaseline != null ? '#e0f2fe' : '#f1f5f9',
                                color: item.lastYearBaseline != null ? '#0284c7' : '#64748b',
                                '&:hover': { backgroundColor: '#bae6fd' },
                                width: 24,
                                height: 24,
                                padding: '4px'
                            }}
                            title="Last Year Baseline & Macro References"
                        >
                            <TrendingUpIcon sx={{ fontSize: 14 }} />
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
                )}
            </td>
        </Reorder.Item>
    );
};

const MRMHome = () => {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [selectedMonth, setSelectedMonth] = useState(
        searchParams.get('month') ? Number(searchParams.get('month')) : (new Date().getMonth() + 1)
    );
    const [selectedYear, setSelectedYear] = useState(
        searchParams.get('year') ? Number(searchParams.get('year')) : new Date().getFullYear()
    );
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    // Metadata State & Lifecycle Workflow
    const [metadata, setMetadata] = useState({ 
        meetingDate: '', 
        reviewDate: '',
        status: 'Draft',
        isLocked: false,
        submittedAt: null,
        approvedAt: null,
        revisionHistory: [],
        reopenHistory: []
    });
    const isAdmin = String(user?.role || '').toLowerCase() === 'admin';
    const isApprover = isAdmin || user?.username === 'suraj_rajan' || String(user?.username || '').includes('suraj');
    const canManagePresenters = isAdmin || isApprover;

    // Submission & Workflow Dialog States
    const [validationErrors, setValidationErrors] = useState([]);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [showRevisionModal, setShowRevisionModal] = useState(false);
    const [revisionComment, setRevisionComment] = useState('');
    const [showReopenModal, setShowReopenModal] = useState(false);
    const [reopenReason, setReopenReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Baseline & Macro References Dialog State
    const [baselineDialogOpen, setBaselineDialogOpen] = useState(false);
    const [baselineTargetItem, setBaselineTargetItem] = useState(null);
    const [baselineValue, setBaselineValue] = useState('');
    const [baselineMetric, setBaselineMetric] = useState('');
    const [macroReferences, setMacroReferences] = useState([
        { label: '', value: '', unit: '' },
        { label: '', value: '', unit: '' },
        { label: '', value: '', unit: '' }
    ]);
    const [applyToAllMonths, setApplyToAllMonths] = useState(true);
    const [baselineSaving, setBaselineSaving] = useState(false);

    const openBaselineDialog = (item) => {
        setBaselineTargetItem(item);
        setBaselineValue(item.lastYearBaseline != null ? item.lastYearBaseline : '');
        setBaselineMetric(item.lastYearBaselineMetric || '');
        const existingMacros = item.macroReferences || [];
        setMacroReferences([
            existingMacros[0] || { label: '', value: '', unit: '' },
            existingMacros[1] || { label: '', value: '', unit: '' },
            existingMacros[2] || { label: '', value: '', unit: '' }
        ]);
        setApplyToAllMonths(true);
        setBaselineDialogOpen(true);
    };

    const handleSaveBaseline = async () => {
        if (!baselineTargetItem) return;
        setBaselineSaving(true);
        try {
            const validMacros = macroReferences
                .filter(m => m.label && m.label.trim())
                .map(m => ({
                    label: m.label.trim(),
                    value: m.value !== '' ? Number(m.value) : null,
                    unit: m.unit ? m.unit.trim() : ''
                }));

            const targetUserId = (canManagePresenters && selectedUserId) ? selectedUserId : user?._id;
            await updateObjectiveConfig({
                objective: baselineTargetItem.objective,
                processDescription: baselineTargetItem.processDescription,
                userId: targetUserId,
                year: selectedYear,
                lastYearBaseline: baselineValue !== '' ? Number(baselineValue) : null,
                lastYearBaselineMetric: baselineMetric.trim(),
                macroReferences: validMacros,
                applyToAllMonths
            });

            setBaselineDialogOpen(false);
            showToast("Baseline saved successfully", 'success');
            await loadData();
        } catch (err) {
            console.error("Failed to save baseline", err);
            showToast("Failed to save baseline: " + (err.response?.data?.error || err.message), 'error');
        } finally {
            setBaselineSaving(false);
        }
    };

    // Admin View: User Selection
    const [mrmUsers, setMrmUsers] = useState([]);
    const initialParamUserId = searchParams.get('userId');
    const [selectedUserId, setSelectedUserId] = useState((initialParamUserId && initialParamUserId !== 'undefined') ? initialParamUserId : '');

    // Modern Toast Notification State
    const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
    const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

    // Sync with URL parameters when navigation occurs from dashboard review buttons
    useEffect(() => {
        const pUserId = searchParams.get('userId');
        const pMonth = searchParams.get('month');
        const pYear = searchParams.get('year');
        if (pUserId && pUserId !== 'undefined' && pUserId !== 'null') {
            setSelectedUserId(pUserId);
        }
        if (pMonth && !isNaN(Number(pMonth))) {
            setSelectedMonth(Number(pMonth));
        }
        if (pYear && !isNaN(Number(pYear))) {
            setSelectedYear(Number(pYear));
        }
    }, [searchParams]);

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

    // Approve & Lock Confirmation Dialog (Suraj / Admin)
    const [showApproveModal, setShowApproveModal] = useState(false);

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
            const targetUserId = (canManagePresenters && selectedUserId) ? selectedUserId : user?._id;

            // Parallel fetch items and metadata
            const [itemsData, metaData] = await Promise.all([
                fetchMRMItems(monthStr, selectedYear, targetUserId),
                fetchMRMMetadata(monthStr, selectedYear, targetUserId)
            ]);

            setItems(itemsData.map(i => ({ ...i, isDirty: false })));
            
            const metaStatus = metaData?.status || (metaData?.meetingDone ? 'Approved' : 'Draft');
            const metaLocked = Boolean(metaData?.isLocked || metaData?.meetingDone || metaStatus === 'Approved');

            setMetadata({
                meetingDate: metaData?.meetingDate ? new Date(metaData.meetingDate).toISOString().split('T')[0] : '',
                reviewDate: metaData?.reviewDate ? new Date(metaData.reviewDate).toISOString().split('T')[0] : '',
                status: metaStatus,
                isLocked: metaLocked,
                submittedAt: metaData?.submittedAt || null,
                approvedAt: metaData?.approvedAt || null,
                revisionHistory: metaData?.revisionHistory || [],
                reopenHistory: metaData?.reopenHistory || []
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

    const handleSubmitForReview = async () => {
        setActionLoading(true);
        try {
            // Auto-save any unsaved dirty rows so backend completeness validation checks latest inputs
            const dirtyItems = items.filter(i => i.isDirty);
            if (dirtyItems.length > 0) {
                await Promise.all(dirtyItems.map(item => {
                    const { isDirty, ...dataToSend } = item;
                    return updateMRMItem(item._id, dataToSend);
                }));
            }

            const targetUserId = (canManagePresenters && selectedUserId) ? selectedUserId : user?._id;
            const res = await submitMRM({
                month: String(selectedMonth).padStart(2, '0'),
                year: selectedYear,
                userId: targetUserId
            });
            showToast(res.message || "MRM successfully submitted to Suraj Rajan for review!", 'success');
            await loadData();
        } catch (err) {
            if (err.response?.status === 422 && err.response?.data?.errors) {
                setValidationErrors(err.response.data.errors);
                setShowValidationModal(true);
            } else {
                showToast("Submission failed: " + (err.response?.data?.error || err.message), 'error');
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleApprove = async () => {
        setActionLoading(true);
        try {
            const targetUserId = (canManagePresenters && selectedUserId) ? selectedUserId : user?._id;
            const res = await approveMRM({
                month: String(selectedMonth).padStart(2, '0'),
                year: selectedYear,
                userId: targetUserId
            });
            showToast(res.message || "MRM approved and locked.", 'success');
            await loadData();
        } catch (err) {
            showToast("Approval failed: " + (err.response?.data?.error || err.message), 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSendRevision = async () => {
        if (!revisionComment.trim()) {
            showToast("Please provide feedback comments explaining what needs revision.", 'warning');
            return;
        }
        setActionLoading(true);
        try {
            const targetUserId = (canManagePresenters && selectedUserId) ? selectedUserId : user?._id;
            const res = await requestMRMRevision({
                month: String(selectedMonth).padStart(2, '0'),
                year: selectedYear,
                userId: targetUserId,
                comment: revisionComment
            });
            setShowRevisionModal(false);
            setRevisionComment('');
            showToast(res.message || "MRM sent back for revision.", 'info');
            await loadData();
        } catch (err) {
            showToast("Failed to request revision: " + (err.response?.data?.error || err.message), 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReopen = async () => {
        if (!reopenReason.trim()) {
            showToast("Please enter a reason for reopening this approved month.", 'warning');
            return;
        }
        setActionLoading(true);
        try {
            const targetUserId = (canManagePresenters && selectedUserId) ? selectedUserId : user?._id;
            const res = await reopenMRM({
                month: String(selectedMonth).padStart(2, '0'),
                year: selectedYear,
                userId: targetUserId,
                reason: reopenReason
            });
            setShowReopenModal(false);
            setReopenReason('');
            showToast(res.message || "Month reopened for editing.", 'success');
            await loadData();
        } catch (err) {
            showToast("Failed to reopen month: " + (err.response?.data?.error || err.message), 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleMetadataChange = async (field, value) => {
        const newMeta = { ...metadata, [field]: value };
        setMetadata(newMeta);

        try {
            const targetUserId = (canManagePresenters && selectedUserId) ? selectedUserId : user?._id;

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
        const targetUserId = (canManagePresenters && selectedUserId) ? selectedUserId : user?._id;
        let activeTile = 'General';
        for (let i = items.length - 1; i >= 0; i--) {
            if (items[i].isTitleRow) {
                activeTile = (items[i].tileName || items[i].processDescription || 'General').trim();
                break;
            }
        }
        const newItem = {
            month: String(selectedMonth).padStart(2, '0'),
            year: selectedYear,
            processDescription: "New Item",
            status: "Red",
            createdBy: targetUserId,
            tileName: activeTile
        };
        try {
            const saved = await createMRMItem(newItem);
            setItems([...items, { ...saved, isDirty: false }]);
        } catch (err) {
            console.error("Failed to add item", err);
            showToast("Failed to create item: " + (err.response?.data?.error || err.message), 'error');
        }
    };

    const handleInsertItem = async (index, type, anchor = null) => {
        if (type === 'menu') {
            setAddRowIndex(index);
            setAddRowMenu(anchor);
            return;
        }

        setAddRowMenu(null);
        const targetUserId = (canManagePresenters && selectedUserId) ? selectedUserId : user?._id;
        const currentItem = items[index];

        let parentTile = 'General';
        if (type === 'title') {
            parentTile = "New Title";
        } else {
            for (let i = index; i >= 0; i--) {
                if (items[i].isTitleRow) {
                    parentTile = (items[i].tileName || items[i].processDescription || 'General').trim();
                    break;
                }
            }
        }

        const newItem = {
            month: String(selectedMonth).padStart(2, '0'),
            year: selectedYear,
            processDescription: type === 'title' ? "New Title" : "New In-between Item",
            status: "Red",
            createdBy: targetUserId,
            insertAfterSeq: currentItem.seq,
            isTitleRow: type === 'title',
            tileName: parentTile
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
            showToast("Failed to insert item", 'error');
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

    // Auto-RAG status evaluation helper based on Actual vs Plan, Optimization Direction, and Tolerance Band
    const evaluateAutoRAG = (actual, planOrTarget, direction = 'Higher', toleranceBand = 5) => {
        if (actual === null || actual === undefined || actual === '' || planOrTarget === null || planOrTarget === undefined || planOrTarget === '') {
            return null;
        }
        const cleanNum = (val) => {
            const cleaned = String(val).replace(/[^0-9.-]/g, '');
            const num = parseFloat(cleaned);
            return isNaN(num) ? null : num;
        };
        const numActual = cleanNum(actual);
        const numPlan = cleanNum(planOrTarget);
        if (numActual === null || numPlan === null) return null;

        const tol = Math.max(0, Number(toleranceBand) || 5);
        const isHigher = String(direction || '').toLowerCase() !== 'lower';

        if (isHigher) {
            if (numActual >= numPlan) return 'Green';
            if (numPlan === 0) return numActual >= 0 ? 'Green' : 'Red';
            const shortfallPct = ((numPlan - numActual) / Math.abs(numPlan)) * 100;
            return shortfallPct <= tol ? 'Yellow' : 'Red';
        } else {
            if (numActual <= numPlan) return 'Green';
            if (numPlan === 0) return numActual <= 0 ? 'Green' : 'Red';
            const overrunPct = ((numActual - numPlan) / Math.abs(numPlan)) * 100;
            return overrunPct <= tol ? 'Yellow' : 'Red';
        }
    };

    // Only updates local state
    const handleFieldChange = (id, field, value, e) => {
        setItems(prevItems => prevItems.map(item => {
            if (item._id !== id) return item;

            const updatedItem = { ...item, [field]: value, isDirty: true };

            // Auto-RAG status evaluation if actual, plan, or target changes
            if (field === 'actual' || field === 'plan' || field === 'target') {
                const currentActual = field === 'actual' ? value : item.actual;
                const currentPlan = field === 'plan' ? value : (item.plan || (field === 'target' ? value : item.target));
                const computedStatus = evaluateAutoRAG(
                    currentActual,
                    currentPlan,
                    item.optimizationDirection || 'Higher',
                    item.toleranceBand != null ? item.toleranceBand : 5
                );
                if (computedStatus) {
                    updatedItem.status = computedStatus;
                }
            }

            return updatedItem;
        }));

        // Auto-resize if it's a textarea
        if (e && e.target.tagName === 'TEXTAREA') {
            autoResizeTextarea(e);
        }
    };

    // Managerial Governance Tile Insertion (Section 7)
    const [showManagerialBanner, setShowManagerialBanner] = useState(true);

    const hasManagerialTile = items.some(i => 
        (i.tileName && i.tileName.toLowerCase().includes('managerial')) || 
        (i.processDescription && i.processDescription.toLowerCase().includes('managerial'))
    );

    const handleInsertManagerialTile = async () => {
        if (metadata.isLocked) return;
        try {
            const targetUserId = selectedUserId || user?._id;
            const monthStr = String(selectedMonth).padStart(2, '0');

            // 1. Create Tile Header Row
            const tileData = {
                month: monthStr,
                year: selectedYear,
                processDescription: 'Team & Managerial Governance',
                tileName: 'Team & Managerial Governance',
                isTitleRow: true,
                createdBy: targetUserId,
                seq: items.length + 1
            };
            const createdTile = await createMRMItem(tileData);

            // 2. Create the 4 recommended objectives
            const objectivesDefs = [
                {
                    processDescription: 'Team Development',
                    objective: 'Team Training & Skill Development (Hours / Sessions)',
                    target: '100%',
                    plan: '100%',
                    actual: '',
                    optimizationDirection: 'Higher',
                    toleranceBand: 5,
                    responsibility: user?.first_name || 'HOD',
                    monitoringFrequency: 'Month'
                },
                {
                    processDescription: 'Escalations',
                    objective: 'Departmental Escalation Handling TAT',
                    target: '< 24 hrs',
                    plan: '24',
                    actual: '',
                    optimizationDirection: 'Lower',
                    toleranceBand: 10,
                    responsibility: user?.first_name || 'HOD',
                    monitoringFrequency: 'Month'
                },
                {
                    processDescription: 'Governance Follow-Through',
                    objective: 'Action Item Follow-Through (% team Open Points closed on time)',
                    target: '> 95%',
                    plan: '95%',
                    actual: '',
                    optimizationDirection: 'Higher',
                    toleranceBand: 5,
                    responsibility: user?.first_name || 'HOD',
                    monitoringFrequency: 'Month'
                },
                {
                    processDescription: 'Team Stability',
                    objective: 'Attrition & Team Morale Index',
                    target: '0',
                    plan: '0',
                    actual: '',
                    optimizationDirection: 'Lower',
                    toleranceBand: 0,
                    responsibility: user?.first_name || 'HOD',
                    monitoringFrequency: 'Month'
                }
            ];

            const createdItems = [createdTile];
            for (let i = 0; i < objectivesDefs.length; i++) {
                const def = objectivesDefs[i];
                const objData = {
                    month: monthStr,
                    year: selectedYear,
                    ...def,
                    tileName: 'Team & Managerial Governance',
                    isTitleRow: false,
                    status: 'Gray',
                    createdBy: targetUserId,
                    seq: items.length + 2 + i
                };
                const created = await createMRMItem(objData);
                createdItems.push(created);
            }

            setItems(prev => [...prev, ...createdItems]);
            showToast("Team & Managerial Governance tile inserted successfully", 'success');
        } catch (err) {
            console.error("Failed to insert managerial tile", err);
            showToast("Failed to insert managerial tile: " + (err.response?.data?.error || err.message), 'error');
        }
    };

    // Performs the API call
    const handleSaveItem = async (item) => {
        try {
            // Remove isDirty before sending if API is strict, but usually extra fields are ignored
            const { isDirty, ...dataToSend } = item;
            const saved = await updateMRMItem(item._id, dataToSend);

            // Reset dirty flag on success and merge returned item (includes openPointId)
            setItems(prev => prev.map(i => i._id === item._id ? { ...(saved || i), isDirty: false } : i));
            showToast("Row saved successfully", 'success');
        } catch (err) {
            console.error("Failed to save", err);
            showToast("Failed to save row", 'error');
        }
    };

    // Auto-save status change to trigger immediate bidirectional sync
    const handleStatusChange = async (item, newStatus) => {
        let itemToSave;
        setItems(prev => prev.map(i => {
            if (i._id === item._id) {
                itemToSave = { ...i, status: newStatus };
                return itemToSave;
            }
            return i;
        }));
        try {
            const saved = await updateMRMItem(item._id, itemToSave || { ...item, status: newStatus });
            setItems(prev => prev.map(i => i._id === item._id ? { ...(saved || i), status: newStatus, isDirty: false } : i));
        } catch (err) {
            console.error("Status auto-sync failed:", err);
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
            showToast("Item deleted", 'info');
        } catch (err) {
            console.error(err);
            showToast("Failed to delete item", 'error');
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
                userId: (canManagePresenters && selectedUserId) ? selectedUserId : user?._id
            });
            setShowImportModal(false);
            showToast("Data imported successfully", 'success');
            loadData();
        } catch (err) {
            showToast("Import failed: " + (err.response?.data?.error || err.message), 'error');
        }
    };

    const handleBulkDelete = async () => {
        setBulkDeleteDialog(false);
        setLoading(true);
        try {
            const monthStr = String(selectedMonth).padStart(2, '0');
            const targetUserId = (canManagePresenters && selectedUserId) ? selectedUserId : user?._id;
            await bulkDeleteMRMItems(monthStr, selectedYear, targetUserId);
            setItems([]);
            showToast("Month data deleted", 'info');
        } catch (err) {
            console.error(err);
            showToast("Failed to delete month data: " + (err.response?.data?.error || err.message), 'error');
        } finally {
            setLoading(false);
        }
    };

    // Helper for labels
    const getMonthName = (m) => new Date(0, m - 1).toLocaleString('default', { month: 'short' });
    const getMonthLong = (m) => new Date(0, m - 1).toLocaleString('default', { month: 'long' });
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

    // Export Menu
    const [exportMenuAnchor, setExportMenuAnchor] = useState(null);

    // ─── Export Helpers ──────────────────────────────────────────────────────────
    const getExportRows = () => items.filter(i => !i.isTitleRow);

    const formatDate = (val) => {
        if (!val) return '';
        const d = new Date(val);
        if (isNaN(d)) return val;
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const STATUS_COLORS = {
        Green:  { hex: '166534', fill: 'D1FAE5', text: '14532D' },
        Yellow: { hex: 'CA8A04', fill: 'FEF9C3', text: '713F12' },
        Red:    { hex: 'DC2626', fill: 'FEE2E2', text: '7F1D1D' },
    };

    // ─── Excel Export ─────────────────────────────────────────────────────────────
    const handleExportExcel = async () => {
        setExportMenuAnchor(null);
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'AlVision Exim';
        workbook.created = new Date();

        const ws = workbook.addWorksheet('MRM', {
            pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
            views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
        });

        const COLS = [
            { header: '#',                    key: 'sno',        width: 6  },
            { header: 'Process Description', key: 'process',    width: 36 },
            { header: 'Objective',            key: 'objective',  width: 32 },
            { header: 'Target',               key: 'target',     width: 14 },
            { header: 'Freq.',                key: 'freq',       width: 14 },
            { header: 'Responsibility',       key: 'resp',       width: 20 },
            { header: `Act. (${prevMonthName}-${getYearShort(prevYearVal)})`, key: 'actual', width: 16 },
            { header: `Plan (${currentMonthName}-${getYearShort(selectedYear)})`, key: 'plan', width: 16 },
            { header: 'Action Plan',          key: 'actionPlan', width: 36 },
            { header: 'Act. Resp.',           key: 'actResp',    width: 20 },
            { header: 'Target Date',          key: 'targetDate', width: 16 },
            { header: 'Status',               key: 'status',     width: 14 },
            { header: 'Remarks',              key: 'remarks',    width: 32 },
        ];
        ws.columns = COLS;

        // ── Row 1: Company Header ──
        ws.mergeCells('A1:M1');
        const r1 = ws.getRow(1);
        r1.height = 36;
        const c1 = ws.getCell('A1');
        c1.value = 'AlVision Exim - Monthly Review Meeting (MRM)';
        c1.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        c1.alignment = { horizontal: 'center', vertical: 'middle' };
        c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF185A32' } };

        // ── Row 2: Sub-header info ──
        ws.mergeCells('A2:M2');
        const c2 = ws.getCell('A2');
        const reviewDateStr = metadata.reviewDate ? formatDate(metadata.reviewDate) : 'N/A';
        const meetingDateStr = metadata.meetingDate ? formatDate(metadata.meetingDate) : 'N/A';
        c2.value = `Month: ${getMonthLong(selectedMonth)} ${selectedYear}   |   Review Date: ${reviewDateStr}   |   Meeting Date: ${meetingDateStr}   |   Exported: ${new Date().toLocaleDateString('en-IN')}`;
        c2.font = { name: 'Calibri', size: 10.5, color: { argb: 'FFFFFFFF' } };
        c2.alignment = { horizontal: 'center', vertical: 'middle' };
        c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF217346' } };
        ws.getRow(2).height = 22;

        // ── Row 3: blank spacer ──
        ws.mergeCells('A3:M3');
        ws.getRow(3).height = 6;
        ws.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };

        // ── Row 4: Column headers ──
        const headerRow = ws.getRow(4);
        headerRow.height = 28;
        COLS.forEach((col, ci) => {
            const cell = headerRow.getCell(ci + 1);
            cell.value = col.header;
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
            cell.border = {
                top:    { style: 'medium', color: { argb: 'FF217346' } },
                bottom: { style: 'medium', color: { argb: 'FF217346' } },
                left:   { style: 'thin',   color: { argb: 'FF334155' } },
                right:  { style: 'thin',   color: { argb: 'FF334155' } },
            };
        });

        // ── Data rows ──
        let sno = 0;
        items.forEach((item) => {
            if (item.isTitleRow) {
                // Title separator row spanning all columns (A to M)
                const titleRowNum = ws.rowCount + 1;
                ws.mergeCells(`A${titleRowNum}:M${titleRowNum}`);
                const tr = ws.getRow(titleRowNum);
                tr.height = 22;
                const tc = ws.getCell(`A${titleRowNum}`);
                tc.value = (item.processDescription || '').toUpperCase();
                tc.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
                tc.alignment = { horizontal: 'center', vertical: 'middle' };
                tc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
                tc.border = {
                    top:    { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                };
                return;
            }

            sno++;
            const status = item.status || 'Green';
            const sc = STATUS_COLORS[status] || STATUS_COLORS.Green;
            const dataRow = ws.addRow([
                sno,
                item.processDescription || '',
                item.objective || '',
                item.target || '',
                item.monitoringFrequency || '',
                item.responsibility || '',
                item.actual || '',
                item.plan || '',
                item.actionPlan || '',
                item.responsibilityAction || '',
                formatDate(item.targetDate),
                status,
                item.remarks || '',
            ]);
            dataRow.height = 19;
            dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
                cell.font = { name: 'Calibri', size: 9 };
                cell.alignment = { vertical: 'top', wrapText: true, horizontal: [1, 4, 5, 7, 8, 11, 12].includes(colNum) ? 'center' : 'left' };
                cell.border = {
                    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                    right:  { style: 'hair', color: { argb: 'FFE5E7EB' } },
                };
                // Status cell coloring (Col 12)
                if (colNum === 12) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${sc.fill}` } };
                    cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: `FF${sc.text}` } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = {
                        top:    { style: 'thin', color: { argb: `FF${sc.hex}` } },
                        bottom: { style: 'thin', color: { argb: `FF${sc.hex}` } },
                        left:   { style: 'thin', color: { argb: `FF${sc.hex}` } },
                        right:  { style: 'thin', color: { argb: `FF${sc.hex}` } },
                    };
                }
                // Alternate row shading
                if (sno % 2 === 0 && colNum !== 12) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                }
            });
        });

        // ── Summary footer ──
        const footerRowNum = ws.rowCount + 2;
        ws.mergeCells(`A${footerRowNum}:M${footerRowNum}`);
        const footerCell = ws.getCell(`A${footerRowNum}`);
        footerCell.value = `Total Items: ${sno}   |   Green: ${statusCounts.Green}   |   Yellow: ${statusCounts.Yellow}   |   Red: ${statusCounts.Red}`;
        footerCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1F2937' } };
        footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
        footerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        footerCell.border = {
            top:    { style: 'medium', color: { argb: 'FF217346' } },
            bottom: { style: 'medium', color: { argb: 'FF217346' } },
        };
        ws.getRow(footerRowNum).height = 24;

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
            `MRM_${getMonthLong(selectedMonth)}_${selectedYear}.xlsx`);
    };

    // ─── PDF Export (A4 Landscape) ────────────────────────────────────────────────
    const handleExportPDF = () => {
        setExportMenuAnchor(null);
        // A4 landscape: 297 x 210 mm
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();   // 297
        const pageH = doc.internal.pageSize.getHeight();  // 210
        const margin = 10;

        // ── Header: dark slate top + green accent stripe ──
        doc.setFillColor(15, 23, 42);    // slate-950
        doc.rect(0, 0, pageW, 14, 'F');
        doc.setFillColor(33, 115, 70);   // brand green accent
        doc.rect(0, 14, pageW, 3, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('AlVision Exim - Monthly Review Meeting', pageW / 2, 9, { align: 'center' });
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(134, 239, 172);  // green-300
        doc.text('MRM REPORT', pageW - margin, 9, { align: 'right' });

        // ── Info row ──
        doc.setFillColor(241, 245, 249);  // slate-100
        doc.rect(0, 17, pageW, 9, 'F');
        const reviewDateStr  = metadata.reviewDate  ? formatDate(metadata.reviewDate)  : 'N/A';
        const meetingDateStr = metadata.meetingDate ? formatDate(metadata.meetingDate) : 'N/A';
        const exportedBy = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'N/A';
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text(`${getMonthLong(selectedMonth).toUpperCase()} ${selectedYear}`, margin, 22.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(
            `Review Date: ${reviewDateStr}   |   Meeting Date: ${meetingDateStr}   |   Exported: ${new Date().toLocaleDateString('en-IN')}   |   By: ${exportedBy}`,
            pageW / 2, 22.5, { align: 'center' }
        );

        // ── Status Summary Pills (Clean ASCII text, no symbols that corrupt) ──
        const pillY = 28;
        const pillH = 7;
        const pills = [
            { label: 'TOTAL:',  value: items.filter(i => !i.isTitleRow).length, bg: [30, 41, 59],   fg: [255, 255, 255] },
            { label: 'GREEN:',  value: statusCounts.Green,                      bg: [22, 101, 52],  fg: [220, 252, 231] },
            { label: 'YELLOW:', value: statusCounts.Yellow,                     bg: [161, 98, 7],   fg: [254, 240, 138] },
            { label: 'RED:',    value: statusCounts.Red,                        bg: [185, 28, 28],  fg: [254, 226, 226] },
        ];
        const pillW = 38;
        const pillsStartX = (pageW - pills.length * pillW - (pills.length - 1) * 4) / 2;
        pills.forEach((p, i) => {
            const x = pillsStartX + i * (pillW + 4);
            doc.setFillColor(...p.bg);
            doc.roundedRect(x, pillY, pillW, pillH, 2, 2, 'F');
            doc.setTextColor(...p.fg);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text(`${p.label} ${p.value}`, x + pillW / 2, pillY + 4.8, { align: 'center' });
        });

        // ── Build table body ──
        const body = [];
        let sno = 0;
        items.forEach((item) => {
            if (item.isTitleRow) {
                body.push([{
                    content: (item.processDescription || '').toUpperCase(),
                    colSpan: 12,
                    styles: {
                        fontStyle: 'bold',
                        fillColor: [226, 232, 240],
                        textColor: [15, 23, 42],
                        halign: 'center',
                        fontSize: 7.5,
                        cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
                    }
                }]);
                return;
            }
            sno++;
            const status = item.status || 'Green';
            body.push([
                { content: sno, styles: { halign: 'center', fontStyle: 'bold', textColor: [100, 116, 139] } },
                item.processDescription || '',
                item.objective || '',
                { content: item.target || '', styles: { halign: 'center' } },
                { content: item.monitoringFrequency || '', styles: { halign: 'center' } },
                item.responsibility || '',
                { content: item.actual || '', styles: { halign: 'center' } },
                { content: item.plan || '', styles: { halign: 'center' } },
                item.actionPlan || '',
                item.responsibilityAction || '',
                { content: formatDate(item.targetDate), styles: { halign: 'center' } },
                { content: status, styles: getStatusCellStyle(status) },
            ]);
        });

        // A4 landscape usable width = 277 mm (10 mm margins each side)
        // Column widths: 7+42+34+13+13+22+14+14+50+22+18+28 = 277
        autoTable(doc, {
            startY: 38,
            margin: { left: margin, right: margin },
            head: [[
                '#',
                'Process Description',
                'Objective',
                'Target',
                'Freq.',
                'Responsibility',
                `Act.\n(${prevMonthName}-${getYearShort(prevYearVal)})`,
                `Plan\n(${currentMonthName}-${getYearShort(selectedYear)})`,
                'Action Plan',
                'Act. Resp.',
                'Target Date',
                'Status',
            ]],
            body,
            theme: 'grid',
            tableWidth: pageW - margin * 2,
            styles: {
                font: 'helvetica',
                fontSize: 6.5,
                cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 },
                valign: 'top',
                overflow: 'linebreak',
                lineColor: [203, 213, 225],
                lineWidth: 0.15,
                textColor: [30, 41, 59],
            },
            headStyles: {
                fillColor: [15, 23, 42],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 7,
                halign: 'center',
                valign: 'middle',
                cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
                lineColor: [51, 65, 85],
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252],
            },
            columnStyles: {
                0:  { cellWidth: 7,  halign: 'center' },
                1:  { cellWidth: 42 },
                2:  { cellWidth: 34 },
                3:  { cellWidth: 13, halign: 'center' },
                4:  { cellWidth: 13, halign: 'center' },
                5:  { cellWidth: 22 },
                6:  { cellWidth: 14, halign: 'center' },
                7:  { cellWidth: 14, halign: 'center' },
                8:  { cellWidth: 50 },
                9:  { cellWidth: 22 },
                10: { cellWidth: 18, halign: 'center' },
                11: { cellWidth: 28, halign: 'center' },
            },
            didDrawPage: (data) => {
                // Green accent top stripe on continuation pages
                doc.setFillColor(33, 115, 70);
                doc.rect(0, 0, pageW, 2, 'F');
                // Footer
                const pageCount = doc.internal.getNumberOfPages();
                doc.setFillColor(248, 250, 252);
                doc.rect(0, pageH - 8, pageW, 8, 'F');
                doc.setDrawColor(226, 232, 240);
                doc.line(margin, pageH - 8, pageW - margin, pageH - 8);
                doc.setFontSize(6.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(148, 163, 184);
                doc.text(
                    `AlVision Exim - MRM Report - ${getMonthLong(selectedMonth)} ${selectedYear}`,
                    margin, pageH - 3
                );
                doc.text(
                    `Page ${data.pageNumber} of ${pageCount}`,
                    pageW - margin, pageH - 3,
                    { align: 'right' }
                );
            },
        });

        doc.save(`MRM_${getMonthLong(selectedMonth)}_${selectedYear}.pdf`);
    };

    const getStatusCellStyle = (status) => {
        const map = {
            Green:  { fillColor: [220, 252, 231], textColor: [22, 101, 52],   fontStyle: 'bold', halign: 'center' },
            Yellow: { fillColor: [254, 240, 138], textColor: [133, 77, 14],  fontStyle: 'bold', halign: 'center' },
            Red:    { fillColor: [254, 226, 226], textColor: [153, 27, 27],  fontStyle: 'bold', halign: 'center' },
        };
        return map[status] || map.Green;
    };

    return (
        <div className="mrm-container">
            {/* Title Bar */}
            <div className="title-bar">
                <div className="title-center">
                    <h1>Monthly Review Meeting (MRM)</h1>
                    <span className="user-name">Welcome, {user?.first_name} {user?.last_name}</span>
                </div>
                <div className="title-buttons">
                    {(isAdmin || isApprover) && (
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
            {/* Controls Bar */}
            <div className="header-actions">
                <div className="toolbar-row top-row">
                    <div className="context-group">
                        <div className="control-item">
                            <span className="control-label">Review Date:</span>
                            <input
                                type="date"
                                value={metadata.reviewDate}
                                onChange={e => handleMetadataChange('reviewDate', e.target.value)}
                            />
                        </div>
                        <div className="control-item">
                            <span className="control-label">Meeting Date:</span>
                            <input
                                type="date"
                                value={metadata.meetingDate}
                                onChange={e => handleMetadataChange('meetingDate', e.target.value)}
                            />
                        </div>

                        <div className="toolbar-divider" />

                        {/* Admin / Approver Presenter Selector */}
                        {canManagePresenters && (
                            <div className="control-item">
                                <span className="control-label">Presenter:</span>
                                <div className="executive-select-wrapper">
                                    <select
                                        value={selectedUserId}
                                        onChange={e => setSelectedUserId(e.target.value)}
                                        className="executive-select"
                                        style={{ minWidth: '180px' }}
                                    >
                                        <option value="" disabled>Select Presenter</option>
                                        {mrmUsers
                                            .filter(u => (u.displayName || u.first_name || u.username))
                                            .map(u => {
                                                const name = u.displayName || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
                                                return (
                                                    <option key={u._id} value={u._id}>
                                                        {name}
                                                    </option>
                                                );
                                            })}
                                    </select>
                                    <span className="select-arrow">▼</span>
                                </div>
                            </div>
                        )}

                        <div className="control-item">
                            <span className="control-label">Period:</span>
                            <div className="period-group">
                                <div className="executive-select-wrapper">
                                    <select
                                        value={selectedMonth}
                                        onChange={e => setSelectedMonth(Number(e.target.value))}
                                        className="executive-select"
                                        style={{ minWidth: '135px' }}
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                            <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                                        ))}
                                    </select>
                                    <span className="select-arrow">▼</span>
                                </div>
                                <div className="executive-select-wrapper">
                                    <select
                                        value={selectedYear}
                                        onChange={e => setSelectedYear(Number(e.target.value))}
                                        className="executive-select"
                                        style={{ minWidth: '95px' }}
                                    >
                                        {[2024, 2025, 2026, 2027, 2028].map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                    <span className="select-arrow">▼</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="toolbar-row bottom-row">
                    {/* Status Filter */}
                    <div className="status-filter">
                        <span className="control-label">Filter:</span>
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

                    {/* Action Controls */}
                    <div className="action-buttons-group">
                        {!metadata.isLocked && (
                            <>
                                <button className="action-btn secondary" onClick={() => setShowImportModal(true)}>
                                    📥 Import / Copy
                                </button>
                                <button 
                                    className="action-btn secondary" 
                                    onClick={handleInsertManagerialTile}
                                    title="Insert standard Team & Managerial Governance tile with recommended leadership objectives"
                                    style={{ background: '#f0fdf4', color: '#065f46', borderColor: '#a7f3d0', fontWeight: '600' }}
                                >
                                    👔 + Managerial Tile
                                </button>
                            </>
                        )}
                        {items.length > 0 && (
                            <>
                                {/* Export Dropdown Button */}
                                <button
                                    className="action-btn export-btn"
                                    onClick={(e) => setExportMenuAnchor(e.currentTarget)}
                                    title="Export MRM data"
                                >
                                    <FileDownloadIcon sx={{ fontSize: 16 }} />
                                    Export
                                    <span className="export-arrow">▾</span>
                                </button>
                                <Menu
                                    anchorEl={exportMenuAnchor}
                                    open={Boolean(exportMenuAnchor)}
                                    onClose={() => setExportMenuAnchor(null)}
                                    PaperProps={{
                                        sx: {
                                            borderRadius: '12px',
                                            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                                            minWidth: '200px',
                                            overflow: 'visible',
                                            mt: '6px',
                                            border: '1px solid #e5e7eb',
                                        }
                                    }}
                                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                                >
                                    <div className="export-menu-header">Export {getMonthLong(selectedMonth)} {selectedYear}</div>
                                    <MenuItem
                                        onClick={handleExportExcel}
                                        className="export-menu-item"
                                        sx={{
                                            gap: '10px',
                                            py: '10px',
                                            px: '16px',
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            color: '#166534',
                                            '&:hover': { background: '#f0fdf4' }
                                        }}
                                    >
                                        <TableChartIcon sx={{ fontSize: 20, color: '#16a34a' }} />
                                        <div>
                                            <div style={{ fontWeight: 600 }}>Export to Excel</div>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 400 }}>Styled .xlsx with colors</div>
                                        </div>
                                    </MenuItem>
                                    <MenuItem
                                        onClick={handleExportPDF}
                                        className="export-menu-item"
                                        sx={{
                                            gap: '10px',
                                            py: '10px',
                                            px: '16px',
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            color: '#991b1b',
                                            '&:hover': { background: '#fef2f2' }
                                        }}
                                    >
                                        <PictureAsPdfIcon sx={{ fontSize: 20, color: '#dc2626' }} />
                                        <div>
                                            <div style={{ fontWeight: 600 }}>Export to PDF</div>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 400 }}>Landscape A3 format</div>
                                        </div>
                                    </MenuItem>
                                </Menu>
                                {!metadata.isLocked && (
                                    <button
                                        className="action-btn danger-btn-outline"
                                        onClick={() => setBulkDeleteDialog(true)}
                                        title="Delete all rows for this month"
                                    >
                                        🗑️ Delete Month
                                    </button>
                                )}
                            </>
                        )}
                        {!metadata.isLocked && (
                            <button className="action-btn primary" onClick={handleAddItem}>
                                + Add Row
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Lifecycle Status Banner */}
            <div className={`mrm-lifecycle-banner ${metadata.status?.toLowerCase() || 'draft'}`}>
                <div className="banner-content">
                    <span className="status-badge-lg">{metadata.status || 'Draft'}</span>
                    <div className="banner-text">
                        {metadata.status === 'Approved' && (
                            <span>✓ <strong>Approved & Locked</strong>. Certified official numbers feed annual rollup & forecasting.</span>
                        )}
                        {metadata.status === 'Submitted' && (
                            <span>⏳ <strong>Submitted for Review</strong> on {metadata.submittedAt ? formatDate(metadata.submittedAt) : 'recently'}. Pending Suraj Rajan's approval.</span>
                        )}
                        {metadata.status === 'RevisionRequested' && (
                            <span>⚠️ <strong>Revision Requested by Suraj:</strong> "{metadata.revisionHistory?.[metadata.revisionHistory.length - 1]?.comment || 'Please update highlighted rows.'}"</span>
                        )}
                        {(!metadata.status || metadata.status === 'Draft') && (
                            <span>📝 <strong>Draft Mode</strong> — Edit freely and save work-in-progress. Hit "Submit for Approval" once all objectives are complete.</span>
                        )}
                    </div>
                </div>
                <div className="banner-actions">
                    {/* Presenter Action */}
                    {(!metadata.isLocked && (metadata.status === 'Draft' || metadata.status === 'RevisionRequested')) && (
                        <button
                            onClick={handleSubmitForReview}
                            disabled={actionLoading}
                            style={{ background: '#217346', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}
                            title="Validate completeness and submit to Suraj"
                        >
                            <SendIcon sx={{ fontSize: 16 }} />
                            {actionLoading ? 'Checking...' : 'Submit for Approval'}
                        </button>
                    )}

                    {/* Approver Actions (Suraj / Admin) */}
                    {isApprover && metadata.status === 'Submitted' && (
                        <>
                            <button
                                onClick={() => setShowApproveModal(true)}
                                disabled={actionLoading}
                                style={{ background: '#166534', color: 'white' }}
                            >
                                ✓ Approve & Lock
                            </button>
                            <button
                                onClick={() => setShowRevisionModal(true)}
                                disabled={actionLoading}
                                style={{ background: '#dc2626', color: 'white' }}
                            >
                                ↩ Request Revision
                            </button>
                        </>
                    )}

                    {/* Reopen Action (Suraj / Admin) */}
                    {isApprover && metadata.isLocked && (
                        <button
                            onClick={() => setShowReopenModal(true)}
                            disabled={actionLoading}
                            style={{ background: '#475569', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <LockOpenIcon sx={{ fontSize: 16 }} />
                            Reopen Month
                        </button>
                    )}
                </div>
            </div>

            {/* HOD Managerial Governance Guidance Banner (Section 7) */}
            {showManagerialBanner && !hasManagerialTile && !metadata.isLocked && (
                <div style={{
                    margin: '0 24px 16px 24px',
                    padding: '12px 18px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                    border: '1px solid #a7f3d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.08)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.4rem' }}>👔</span>
                        <div>
                            <div style={{ fontWeight: '700', color: '#065f46', fontSize: '0.88rem' }}>
                                HOD Performance Guidance: Team & Managerial Governance
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#047857' }}>
                                An HOD's MRM reflects both team operational results and managerial leadership. Include objectives for team development, escalation TAT, and open points follow-through.
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={handleInsertManagerialTile}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#059669',
                                color: 'white',
                                fontWeight: '600',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            + Insert Managerial Tile
                        </button>
                        <button
                            onClick={() => setShowManagerialBanner(false)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#6b7280',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                padding: '4px'
                            }}
                            title="Dismiss"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Help Modal */}
            <Dialog open={showHelpModal} onClose={() => setShowHelpModal(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ color: '#064e3b', display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800 }}>
                    📋 What is MRM (Management Review Meeting)?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2, color: '#334155', fontSize: '0.9rem', lineHeight: 1.6 }}>
                        <strong>Monthly Review Meeting (MRM)</strong> is a structured operational governance process to track organizational objectives, monitor performance, and enforce corrective action plans on a monthly basis.
                    </DialogContentText>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', marginBottom: '16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '8px', fontSize: '0.9rem' }}>
                            Guiding Principles for Effective MRM Points
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                            <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <strong style={{ color: '#059669' }}>Specific</strong> – Clearly define what is measured
                            </div>
                            <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <strong style={{ color: '#0284c7' }}>Measurable</strong> – Include quantifiable targets
                            </div>
                            <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ca8a04' }}>
                                <strong style={{ color: '#ca8a04' }}>Actionable</strong> – Action plan with owner
                            </div>
                            <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #dc2626' }}>
                                <strong style={{ color: '#dc2626' }}>Time-bound</strong> – Set realistic target dates
                            </div>
                        </div>
                    </div>

                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '8px', fontSize: '0.9rem' }}>
                        Field Definitions
                    </div>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                            <tbody>
                                {[
                                    ['Process Description', 'The business process or activity being reviewed'],
                                    ['Objective', 'The goal or purpose of this process'],
                                    ['Target', 'The measurable target value (e.g., 95%, ₹10L)'],
                                    ['Frequency', 'How often this is monitored (Daily, Weekly, Monthly)'],
                                    ['Responsibility', 'Person accountable for this process'],
                                    ['Actual (Prev Month)', 'The actual achieved value from last month'],
                                    ['Plan (Current Month)', 'The planned target for current month'],
                                    ['Action Plan', 'Corrective steps (automatically synced to Open Points at Save time)'],
                                    ['Resp. (Action)', 'Person responsible for chasing the action item to closure'],
                                    ['Target Date', 'Deadline for completing the action item'],
                                    ['Status', '🟢 Green = On Target / Completed | 🟡 Yellow = In Progress | 🔴 Red = Off Target (Requires Action Plan)'],
                                    ['Remarks', 'Additional notes, context, or escalation details']
                                ].map(([field, desc], i) => (
                                    <tr key={i} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '8px 14px', fontWeight: 600, color: '#1e293b', width: '180px' }}>{field}</td>
                                        <td style={{ padding: '8px 14px', color: '#475569' }}>{desc}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setShowHelpModal(false)} variant="contained" sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>
                        Got it!
                    </Button>
                </DialogActions>
            </Dialog>

            <div className="data-grid-container">
                {loading ? <p style={{ padding: '20px', textAlign: 'center' }}>Loading...</p> : (
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: '30px' }}></th>
                                <th style={{ width: '250px' }} title="Process Description">Process<br />Description</th>
                                <th style={{ width: '200px' }} title="Objective">Objective</th>
                                <th style={{ width: '70px' }} title="Target">Target</th>
                                <th style={{ width: '80px' }} title="Monitoring Frequency">Monitoring<br />Freq.</th>
                                <th style={{ width: '90px' }} title="Responsibility">Resp.</th>
                                <th style={{ width: '90px' }} title={`Actual (${prevMonthName} ${prevYearVal})`}>Act.<br />({prevMonthName.substring(0, 3)}-{getYearShort(prevYearVal)})</th>
                                <th style={{ width: '90px' }} title={`Plan (${currentMonthName} ${selectedYear})`}>Plan<br />({currentMonthName.substring(0, 3)}-{getYearShort(selectedYear)})</th>
                                <th style={{ width: '220px' }} title="Action Plan">Action<br />Plan</th>
                                <th style={{ width: '125px' }} title="Action Responsibility">Act.<br />Resp.</th>
                                <th style={{ width: '100px' }} title="Target Date">Target<br />Date</th>
                                <th style={{ width: '100px' }} title="Status">Status</th>
                                <th style={{ width: '200px' }} title="Remarks">Remarks</th>
                                <th style={{ width: '110px', textAlign: 'center' }} title="Actions">Actions</th>
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
                            ) : (() => {
                                // Pre-calculate which title rows contain an objective with an anomaly
                                const tileAnomalyMap = new Map();
                                let activeTileId = null;
                                filteredItems.forEach(it => {
                                    if (it.isTitleRow) {
                                        activeTileId = it._id;
                                        tileAnomalyMap.set(activeTileId, false);
                                    } else if (activeTileId && it.anomaly?.isAnomaly) {
                                        tileAnomalyMap.set(activeTileId, true);
                                    }
                                });

                                return filteredItems.map((item, index) => (
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
                                        isLocked={metadata.isLocked}
                                        openBaselineDialog={openBaselineDialog}
                                        handleStatusChange={handleStatusChange}
                                        hasTileAnomaly={item.isTitleRow ? Boolean(tileAnomalyMap.get(item._id)) : false}
                                    />
                                ));
                            })()}
                        </Reorder.Group>
                    </table>
                )}
            </div>

            {/* Import Modal */}
            <Dialog open={showImportModal} onClose={() => setShowImportModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ color: '#064e3b', display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800 }}>
                    📥 Import / Copy Previous MRM Data
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2, fontSize: '0.85rem', color: '#475569' }}>
                        Quickly copy structure or previous data from an earlier month as a template for this sheet.
                    </DialogContentText>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                                Source Month
                            </label>
                            <select
                                value={importSourceMonth}
                                onChange={e => setImportSourceMonth(Number(e.target.value))}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                                Source Year
                            </label>
                            <select
                                value={importSourceYear}
                                onChange={e => setImportSourceYear(Number(e.target.value))}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                            >
                                {[2024, 2025, 2026, 2027, 2028].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Import Mode
                        </label>
                        <select
                            value={importMode}
                            onChange={e => setImportMode(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        >
                            <option value="as-is">As-Is (Copy Objectives, Plans, Actuals & Action Plans)</option>
                            <option value="blank">Blank (Structure & Objectives Only, Clear Numbers)</option>
                        </select>
                    </div>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setShowImportModal(false)} variant="outlined">
                        Cancel
                    </Button>
                    <Button onClick={handleImport} variant="contained" sx={{ bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}>
                        Import Rows
                    </Button>
                </DialogActions>
            </Dialog>

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

            {/* Submission Completeness Validation Modal */}
            <Dialog 
                open={showValidationModal} 
                onClose={() => setShowValidationModal(false)} 
                maxWidth="md" 
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        overflow: 'hidden'
                    }
                }}
            >
                <DialogTitle sx={{ 
                    bgcolor: '#fff1f2', 
                    color: '#b91c1c', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.5,
                    borderBottom: '1px solid #fecdd3',
                    py: 2
                }}>
                    <WarningAmberIcon sx={{ color: '#dc2626', fontSize: 28 }} />
                    <div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>Submission Blocked: Incomplete Objectives Found</div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 500, color: '#9f1239', marginTop: '2px' }}>
                            Mandatory fields must be completed before submitting for Suraj's review
                        </div>
                    </div>
                </DialogTitle>
                <DialogContent sx={{ py: 2.5, px: 3 }}>
                    <DialogContentText sx={{ mb: 2, color: '#475569', fontSize: '0.88rem', lineHeight: 1.5 }}>
                        Before submitting to <strong>Suraj</strong> for approval, all objectives must have both <strong>Plan</strong> and <strong>Actual</strong> filled in, and any objective marked <strong style={{ color: '#dc2626' }}>Red</strong> must include an <strong>Action Plan</strong> and <strong>Assigned Owner</strong>.
                    </DialogContentText>
                    <div className="validation-error-list">
                        {validationErrors.map((err, idx) => (
                            <div key={idx} className="val-error-item">
                                <div className="error-info">
                                    <span className="row-badge">Row {err.rowNum}</span>
                                    <strong className="tile-badge">{err.tile || 'Process'}</strong>
                                    <span className="obj-text">{err.objective || 'Unnamed Objective'}</span>
                                </div>
                                <div className="error-tags">
                                    {err.missingFields.map((f, i) => (
                                        <span key={i} className="missing-tag">
                                            ⚠️ {f} Missing
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
                <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'flex-end' }}>
                    <Button 
                        onClick={() => setShowValidationModal(false)} 
                        variant="contained" 
                        sx={{ 
                            bgcolor: '#166534', 
                            '&:hover': { bgcolor: '#14532d' },
                            fontWeight: 700,
                            borderRadius: '8px',
                            px: 3,
                            py: 1,
                            textTransform: 'none',
                            fontSize: '0.88rem'
                        }}
                    >
                        Back to Edit & Fix Rows
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Executive Approve & Lock Confirmation Dialog (Suraj / Admin) */}
            <Dialog 
                open={showApproveModal} 
                onClose={() => !actionLoading && setShowApproveModal(false)} 
                maxWidth="sm" 
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '14px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                        overflow: 'hidden'
                    }
                }}
            >
                <DialogTitle sx={{ 
                    bgcolor: '#f0fdf4', 
                    borderBottom: '1px solid #bbf7d0',
                    color: '#166534', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.5,
                    py: 2,
                    fontWeight: 700,
                    fontSize: '1.15rem'
                }}>
                    <CheckCircleOutlineIcon sx={{ color: '#16a34a', fontSize: 26 }} />
                    Approve & Lock MRM Sheet
                </DialogTitle>
                <DialogContent sx={{ pt: 2.5, pb: 1.5 }}>
                    <DialogContentText sx={{ color: '#334155', fontSize: '0.92rem', mb: 2, lineHeight: 1.6 }}>
                        Are you sure you want to <strong>APPROVE and LOCK</strong> the MRM submission for <strong>{getMonthLong(selectedMonth)} {selectedYear}</strong>?
                    </DialogContentText>
                    
                    <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        marginBottom: '12px',
                        fontSize: '0.84rem',
                        color: '#475569'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ color: '#64748b' }}>Period:</span>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{getMonthLong(selectedMonth)} {selectedYear}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ color: '#64748b' }}>Presenter:</span>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                {(() => {
                                    const curr = mrmUsers.find(u => String(u._id) === String(selectedUserId)) || user;
                                    return curr?.displayName || (curr ? `${curr.first_name || ''} ${curr.last_name || ''}`.trim() : '') || curr?.username || 'Current Presenter';
                                })()}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Governance Effect:</span>
                            <span style={{ fontWeight: 600, color: '#166534' }}>✓ Lock sheet & certify numbers into Annual Rollup</span>
                        </div>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                        ⚠️ Once approved, the sheet is formally locked against further edits. Only Suraj Rajan or an Admin can reopen an approved month with an audit trail.
                    </div>
                </DialogContent>
                <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', gap: 1 }}>
                    <Button 
                        onClick={() => setShowApproveModal(false)} 
                        disabled={actionLoading}
                        variant="outlined" 
                        sx={{ 
                            borderRadius: '8px',
                            color: '#64748b',
                            borderColor: '#cbd5e1',
                            '&:hover': { borderColor: '#94a3b8', bgcolor: '#f1f5f9' }
                        }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={async () => {
                            setShowApproveModal(false);
                            await handleApprove();
                        }} 
                        disabled={actionLoading}
                        variant="contained" 
                        sx={{ 
                            borderRadius: '8px',
                            bgcolor: '#166534', 
                            '&:hover': { bgcolor: '#14532d' },
                            fontWeight: 700,
                            boxShadow: '0 2px 6px rgba(22, 101, 52, 0.3)'
                        }}
                    >
                        {actionLoading ? 'Approving...' : '✓ Confirm & Lock Sheet'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Request Revision Modal (Suraj / Admin) */}
            <Dialog open={showRevisionModal} onClose={() => setShowRevisionModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ color: '#dc2626' }}>
                    Request Revision from Presenter
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Please provide a specific comment explaining why this MRM needs revision:
                    </DialogContentText>
                    <TextField
                        autoFocus
                        multiline
                        rows={3}
                        fullWidth
                        variant="outlined"
                        placeholder="e.g., Please provide an actionable recovery plan for the Customer Lead Time target..."
                        value={revisionComment}
                        onChange={e => setRevisionComment(e.target.value)}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setShowRevisionModal(false)} variant="outlined">Cancel</Button>
                    <Button onClick={handleSendRevision} variant="contained" sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}>
                        Send Feedback
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Formal Reopening Modal (Suraj / Admin) */}
            <Dialog open={showReopenModal} onClose={() => setShowReopenModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ color: '#475569' }}>
                    Formally Reopen Approved Month
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        This month was previously approved and locked. Reopening it will unlock the sheet for edits and log your reason in the audit trail:
                    </DialogContentText>
                    <TextField
                        autoFocus
                        multiline
                        rows={3}
                        fullWidth
                        variant="outlined"
                        placeholder="e.g., Reopened to adjust billing target reconciliation..."
                        value={reopenReason}
                        onChange={e => setReopenReason(e.target.value)}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setShowReopenModal(false)} variant="outlined">Cancel</Button>
                    <Button onClick={handleReopen} variant="contained" sx={{ bgcolor: '#217346', '&:hover': { bgcolor: '#166534' } }}>
                        Confirm Reopen
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Last Year Baseline & Macro References Dialog */}
            <Dialog open={baselineDialogOpen} onClose={() => setBaselineDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ color: '#0369a1', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUpIcon sx={{ color: '#0284c7' }} /> Last Year Baseline & YoY Reference
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2, fontSize: '0.85rem', color: '#475569' }}>
                        Define a light historical reference (~3 macro numbers like monthly volume, unit count, or headcount). Presenters can self-serve and update these figures anytime.
                    </DialogContentText>
                    
                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Objective</div>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>
                            {baselineTargetItem?.objective || baselineTargetItem?.processDescription || 'Selected Objective'}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '4px' }}>
                                Last Year Baseline Value
                            </label>
                            <TextField
                                fullWidth
                                size="small"
                                type="number"
                                placeholder="e.g. 500"
                                value={baselineValue}
                                onChange={e => setBaselineValue(e.target.value)}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '4px' }}>
                                Metric / Unit Label
                            </label>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="e.g. Volume, Headcount, TEUs"
                                value={baselineMetric}
                                onChange={e => setBaselineMetric(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '8px' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>
                            Macro Reference Data Points (Up to 3)
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '10px' }}>
                            Key reference markers for context (e.g. Peak Month, FTE, Avg TAT).
                        </div>

                        {macroReferences.map((macro, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                <TextField
                                    size="small"
                                    placeholder={`Reference #${idx + 1} Label`}
                                    value={macro.label}
                                    onChange={e => {
                                        const updated = [...macroReferences];
                                        updated[idx].label = e.target.value;
                                        setMacroReferences(updated);
                                    }}
                                />
                                <TextField
                                    size="small"
                                    type="number"
                                    placeholder="Value"
                                    value={macro.value}
                                    onChange={e => {
                                        const updated = [...macroReferences];
                                        updated[idx].value = e.target.value;
                                        setMacroReferences(updated);
                                    }}
                                />
                                <TextField
                                    size="small"
                                    placeholder="Unit"
                                    value={macro.unit}
                                    onChange={e => {
                                        const updated = [...macroReferences];
                                        updated[idx].unit = e.target.value;
                                        setMacroReferences(updated);
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '12px' }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={applyToAllMonths}
                                    onChange={e => setApplyToAllMonths(e.target.checked)}
                                    size="small"
                                    color="primary"
                                />
                            }
                            label={<span style={{ fontSize: '0.8rem', color: '#334155' }}>Apply to all months of this objective in {selectedYear}</span>}
                        />
                    </div>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setBaselineDialogOpen(false)} variant="outlined">Cancel</Button>
                    <Button 
                        onClick={handleSaveBaseline} 
                        variant="contained" 
                        disabled={baselineSaving}
                        sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' } }}
                    >
                        {baselineSaving ? 'Saving...' : 'Save Baseline'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modern Toast Notification */}
            <Snackbar 
                open={toast.open} 
                autoHideDuration={4000} 
                onClose={() => setToast(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert 
                    onClose={() => setToast(prev => ({ ...prev, open: false }))} 
                    severity={toast.severity} 
                    variant="filled"
                    sx={{ width: '100%', fontWeight: 600, borderRadius: '8px', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }}
                >
                    {toast.message}
                </Alert>
            </Snackbar>
        </div >
    );
};

export default MRMHome;
