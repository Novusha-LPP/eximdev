import React, { useState, useEffect, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';
import { UserContext } from "../../contexts/UserContext";
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './kpi.scss';

// Icons as simple SVG components
const Icons = {
    Settings: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
        </svg>
    ),
    Add: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
    ),
    Delete: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
        </svg>
    ),
    Edit: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
        </svg>
    ),
    Back: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
    ),

    Save: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
        </svg>
    ),
    Close: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
    ),
    List: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
        </svg>
    ),
    Category: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l-5.5 9h11z M17.5 17.5L22 22H13l4.5-4.5z M3 13.5h8v8H3z M17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5z" />
        </svg>
    ),
};



const KPITemplateManager = () => {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();
    const [templates, setTemplates] = useState([]);
    const [isEditing, setIsEditing] = useState(false);

    const [currentTemplate, setCurrentTemplate] = useState({
        name: '',
        department: '',
        rows: []
    });


    const [message, setMessage] = useState({ show: false, text: '', type: '' });
    const [deleteDialog, setDeleteDialog] = useState({ open: false, template: null });

    const showMessage = (text, type = 'success') => {
        setMessage({ show: true, text, type });
        setTimeout(() => setMessage({ show: false, text: '', type: '' }), 4000);
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/kpi/templates`, { withCredentials: true });
            setTemplates(res.data);
        } catch (error) {
            console.error("Error fetching templates", error);
        }
    };

    const handleEdit = (tmpl) => {
        // Handle legacy array if present, take first or empty
        const dept = Array.isArray(tmpl.department) ? (tmpl.department[0] || '') : (tmpl.department || '');
        setCurrentTemplate({ ...tmpl, department: dept });
        setIsEditing(true);
    };

    const handleNew = () => {
        setCurrentTemplate({
            name: '',
            department: '',
            rows: [{ id: Date.now().toString(), label: 'New KPI', type: 'numeric' }]
        });
        setIsEditing(true);
    };

    const handleSave = async () => {
        try {
            await axios.post(`${process.env.REACT_APP_API_STRING}/kpi/template`, {
                id: currentTemplate._id,
                name: currentTemplate.name,
                department: currentTemplate.department,
                rows: currentTemplate.rows
            }, { withCredentials: true });

            showMessage("Template saved successfully!");
            setIsEditing(false);
            fetchTemplates();
        } catch (error) {
            showMessage("Failed to save template", "error");
        }
    };

    const updateRow = (idx, field, val) => {
        const newRows = [...currentTemplate.rows];
        newRows[idx][field] = val;
        if (!newRows[idx].id) newRows[idx].id = Date.now().toString() + idx;
        setCurrentTemplate({ ...currentTemplate, rows: newRows });
    };

    const addRow = () => {
        setCurrentTemplate({
            ...currentTemplate,
            rows: [...currentTemplate.rows, { id: Date.now().toString(), label: '', type: 'numeric' }]
        });
    };

    const removeRow = (idx) => {
        const newRows = [...currentTemplate.rows];
        newRows.splice(idx, 1);
        setCurrentTemplate({ ...currentTemplate, rows: newRows });
    };


    const handleDeleteClick = (tmpl) => {
        setDeleteDialog({ open: true, template: tmpl });
    };

    const confirmDelete = async () => {
        if (!deleteDialog.template) return;
        try {
            await axios.delete(`${process.env.REACT_APP_API_STRING}/kpi/template/${deleteDialog.template._id}`, { withCredentials: true });
            showMessage("Template deleted successfully");
            fetchTemplates();
        } catch (error) {
            showMessage("Error deleting template", "error");
        } finally {
            setDeleteDialog({ open: false, template: null });
        }
    };

    const handleDepartmentChange = (selected) => {
        setCurrentTemplate({ ...currentTemplate, department: selected });
    };

    // Editor View
    if (isEditing) {
        return (
            <motion.div
                className="kpi-modern-wrapper"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
            >
                {/* Top Action Bar */}
                <div className="modern-header">
                    <div className="header-title">
                        <h1>{currentTemplate._id ? 'Edit Template' : 'Create New Template'}</h1>
                        <p>Design your KPI Sheet structure</p>
                    </div>
                    <div className="header-actions">
                        <button className="modern-btn secondary" onClick={() => setIsEditing(false)}>
                            <Icons.Close /> Cancel
                        </button>
                        <button className="modern-btn primary" onClick={handleSave}>
                            <Icons.Save /> Save Template
                        </button>
                    </div>
                </div>

                {/* Message Toast */}
                {message.show && (
                    <div style={{
                        position: 'fixed',
                        top: '80px',
                        right: '20px',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        background: message.type === 'error' ? '#ef5350' : '#66bb6a',
                        color: 'white',
                        zIndex: 1001,
                        boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                        fontWeight: 500
                    }}>
                        {message.text}
                    </div>
                )}

                {/* CONFIG SECTION */}
                <motion.div
                    className="modern-section"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    style={{ position: 'relative', zIndex: 10 }}
                >
                    <div className="section-header">
                        <h2><Icons.Settings /> Template Configuration</h2>
                    </div>
                    <div className="section-body">
                        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                            <div className="modern-form-group">
                                <label>Template Name</label>
                                <input
                                    type="text"
                                    value={currentTemplate.name}
                                    onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                                    placeholder="e.g., Sales Team KPI"
                                />
                            </div>
                            <div className="modern-form-group">
                                <label>Departments</label>
                                <select
                                    value={currentTemplate.department || ''}
                                    onChange={(e) => handleDepartmentChange(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.9rem',
                                        outline: 'none',
                                        background: 'white'
                                    }}
                                >
                                    <option value="" disabled>Select Department...</option>
                                    {[
                                        'Export', 'Import', 'Operation-Khodiyar', 'Operation-Sanand', 'Feild', 'Accounts', 'SRCC',
                                        'Gandhidham', 'DGFT', 'Software', 'Marketing', 'Paramount', 'Rabs'
                                    ].map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* PREVIEW SECTION & EDITOR */}
                <motion.div
                    className="modern-section"
                    style={{ marginTop: '24px' }}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="section-header" style={{ justifyContent: 'space-between', borderBottom: 'none', paddingBottom: 0 }}>
                        <h2><Icons.List /> KPI Sheet Preview & Editor</h2>
                        <button className="modern-btn secondary" onClick={addRow}>
                            <Icons.Add /> Add New Row
                        </button>
                    </div>

                    <div className="section-body" style={{ background: '#fff', padding: '0' }}>
                        {/* Authentic KPI Sheet Style Wrapper */}
                        <div className="kpi-sheet-page" style={{ margin: '20px', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                            {/* Header */}
                            <div className="kpi-sheet-header">
                                <div className="header-main">
                                    KEY RESULT AREA (KRA) - {(currentTemplate.name || 'TEMPLATE NAME').toUpperCase()}
                                </div>
                                <div className="header-sub">
                                    [Employee Name] KPI (Key Performance Indicator)
                                </div>
                                <div className="header-dept">
                                    Department: {currentTemplate.department || '[Select Department]'}
                                </div>
                            </div>

                            {/* Action Bar Mock */}
                            <div className="kpi-action-bar">
                                <div className="period-info">
                                    <strong>Period:</strong> {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#666' }}>Preview Mode</div>
                            </div>

                            {/* Table */}
                            <div className="kpi-grid-container" style={{ border: 'none', borderTop: '2px solid #000' }}>
                                <table className="kpi-table" style={{ width: '100%', minWidth: 'auto', marginBottom: 0 }}>
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                                        <tr>
                                            <th style={{ minWidth: '300px', textAlign: 'left', paddingLeft: '8px' }}>KPI Metrics / Parameters</th>
                                            <th style={{ width: '100px', textAlign: 'left', paddingLeft: '8px' }}>Type</th>
                                            {[1, 2, 3, 4].map(d => <th key={d} style={{ width: '40px' }}>{d}</th>)}
                                            <th style={{ width: '40px' }}>...</th>
                                            <th style={{ width: '40px' }}>30</th>
                                            <th style={{ width: '40px' }}>31</th>
                                            <th style={{ width: '80px' }}>Total</th>
                                            <th style={{ width: '80px' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <AnimatePresence>
                                            {currentTemplate.rows.map((row, idx) => (
                                                <motion.tr
                                                    key={row.id || idx}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                >
                                                    <td style={{ textAlign: 'left', padding: '0', position: 'relative' }}>
                                                        <input
                                                            type="text"
                                                            value={row.label}
                                                            onChange={(e) => updateRow(idx, 'label', e.target.value)}
                                                            placeholder="Enter KPI Name..."
                                                            style={{
                                                                width: '100%',
                                                                border: 'none',
                                                                background: 'transparent',
                                                                padding: '6px',
                                                                fontWeight: 500,
                                                                outline: 'none',
                                                                fontSize: '11px',
                                                                fontFamily: 'inherit'
                                                            }}
                                                            autoFocus={row.label === 'New KPI' || row.label === ''}
                                                        />
                                                    </td>
                                                    <td style={{ padding: 0 }}>
                                                        <select
                                                            value={row.type || 'numeric'}
                                                            onChange={(e) => updateRow(idx, 'type', e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                border: 'none',
                                                                background: 'transparent',
                                                                padding: '6px',
                                                                fontSize: '11px',
                                                                color: '#555',
                                                                outline: 'none',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <option value="numeric">Numeric (123)</option>
                                                            <option value="checkbox">Checkbox (☑)</option>
                                                        </select>
                                                    </td>
                                                    {/* Mock Empty Cells */}
                                                    {[1, 2, 3, 4].map(d => <td key={d}></td>)}
                                                    <td>...</td>
                                                    <td></td>
                                                    <td></td>
                                                    <td className="total-col">0</td>
                                                    <td style={{ textAlign: 'center', padding: '0' }}>
                                                        <button
                                                            className="modern-btn icon-only danger"
                                                            onClick={() => removeRow(idx)}
                                                            style={{
                                                                width: '24px',
                                                                height: '24px',
                                                                minWidth: '24px',
                                                                padding: 0,
                                                                margin: '2px',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                            title="Remove Row"
                                                        >
                                                            <Icons.Delete style={{ fontSize: '14px' }} />
                                                        </button>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                        {currentTemplate.rows.length === 0 && (
                                            <tr>
                                                <td colSpan="12" style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                                                    No KPI rows added. Click "+ Add New Row" to begin building your template.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        );
    }

    // List View
    return (
        <motion.div
            className="kpi-modern-wrapper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {/* Header */}
            <div className="modern-header" style={{ marginBottom: '24px' }}>
                <div className="header-title">
                    <h1>Template Manager</h1>
                    <p>Design and configure KPI templates.</p>
                </div>
                <div className="header-actions">
                    <button className="modern-btn secondary" onClick={() => navigate('/kpi')}>
                        <Icons.Back /> Back to Dashboard
                    </button>
                    <button className="modern-btn primary" onClick={handleNew}>
                        <Icons.Add /> Create New Template
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px', alignItems: 'start' }}>

                {/* Left: Stats & Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <motion.div
                        className="modern-section"
                        style={{ background: '#f8fcff', border: '1px solid #e0f2fe', borderTop: '4px solid #0284c7' }}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="section-body" style={{ padding: '20px' }}>
                            <div style={{ marginBottom: '20px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Overview</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ width: 40, height: 40, fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7' }}>
                                    <Icons.Category />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.4rem', lineHeight: 1 }}>{templates.length}</h3>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Templates</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: 40, height: 40, fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: '#dcfce7', color: '#16a34a' }}>
                                    <Icons.List />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.4rem', lineHeight: 1 }}>{templates.reduce((sum, t) => sum + (t.rows?.length || 0), 0)}</h3>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Metrics</span>
                                </div>
                            </div>

                            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1' }}>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                                    Use templates to standardize KPI sheets across different departments.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Right: List */}
                <motion.div
                    className="modern-section"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="section-header" style={{ justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h2>Available Templates</h2>
                            <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', color: '#64748b' }}>
                                {templates.length} items
                            </span>
                        </div>
                    </div>
                    <div className="section-body" style={{ padding: 0 }}>
                        {templates.length > 0 ? (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="modern-table" style={{ border: 'none' }}>
                                    <thead style={{ background: '#f8fafc' }}>
                                        <tr>
                                            <th style={{ paddingLeft: '24px' }}>Template Name</th>
                                            <th>Departments</th>
                                            <th style={{ textAlign: 'center' }}>Metrics</th>
                                            <th style={{ textAlign: 'center' }}>Version</th>
                                            <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <AnimatePresence>
                                            {templates.map((tmpl, i) => (
                                                <motion.tr
                                                    key={tmpl._id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    style={{ borderBottom: '1px solid #f1f5f9' }}
                                                >
                                                    <td style={{ paddingLeft: '24px', fontWeight: 600, color: '#334155' }}>{tmpl.name}</td>
                                                    <td>
                                                        <span style={{
                                                            background: '#eef2ff', color: '#4f46e5',
                                                            padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500
                                                        }}>
                                                            {Array.isArray(tmpl.department) ? (tmpl.department[0] || '-') : (tmpl.department || '-')}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'center', color: '#64748b' }}>{tmpl.rows?.length || 0}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span style={{
                                                            background: '#f1f5f9', color: '#64748b',
                                                            padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace'
                                                        }}>v{tmpl.version}</span>
                                                    </td>
                                                    <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                            <button
                                                                className="modern-btn icon-only"
                                                                onClick={() => handleEdit(tmpl)}
                                                                title="Edit"
                                                                style={{ color: '#0ea5e9' }}
                                                            >
                                                                <Icons.Edit />
                                                            </button>
                                                            <button
                                                                className="modern-btn icon-only danger"
                                                                onClick={() => handleDeleteClick(tmpl)}
                                                                title="Delete"
                                                            >
                                                                <Icons.Delete />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <Icons.Category style={{ width: 48, height: 48, opacity: 0.2 }} />
                                <h3>No Templates Found</h3>
                                <p>Create your first KPI template to get started.</p>
                                <button className="modern-btn primary" onClick={handleNew} style={{ marginTop: '16px' }}>
                                    <Icons.Add /> Create First Template
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Message Toast */}
            {message.show && (
                <div style={{
                    position: 'fixed',
                    top: '80px', right: '20px',
                    padding: '12px 20px', borderRadius: '8px',
                    background: message.type === 'error' ? '#ef5350' : '#22c55e',
                    color: 'white', fontWeight: 500,
                    zIndex: 2000, boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
                }}>
                    {message.text}
                </div>
            )}

            {/* Delete Modal */}
            {deleteDialog.open && createPortal(
                <div className="kpi-confirm-overlay" onClick={() => setDeleteDialog({ open: false, template: null })}>
                    <motion.div
                        className="kpi-confirm-modal"
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="kpi-confirm-header">
                            <h3>Confirm Delete</h3>
                            <button className="close-btn" onClick={() => setDeleteDialog({ open: false, template: null })}>
                                <Icons.Close />
                            </button>
                        </div>
                        <div className="kpi-confirm-body">
                            <p>Are you sure you want to delete template "<strong>{deleteDialog.template?.name}</strong>"?</p>
                            <p style={{ color: '#999', fontSize: '0.9rem' }}>This action cannot be undone.</p>
                        </div>
                        <div className="kpi-confirm-footer">
                            <button className="modern-btn secondary" onClick={() => setDeleteDialog({ open: false, template: null })}>
                                Cancel
                            </button>
                            <button className="modern-btn danger" style={{ backgroundColor: '#ef5350', color: 'white' }} onClick={confirmDelete}>
                                <Icons.Delete /> Delete
                            </button>
                        </div>
                    </motion.div>
                </div>,
                document.body
            )}
        </motion.div>
    );
};

export default KPITemplateManager;
