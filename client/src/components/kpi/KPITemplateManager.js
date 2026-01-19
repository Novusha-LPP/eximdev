import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { UserContext } from "../../contexts/UserContext";
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
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
    Download: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
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
        department: [],
        rows: []
    });

    const [openImport, setOpenImport] = useState(false);
    const [publicTemplates, setPublicTemplates] = useState([]);
    const [selectedImportId, setSelectedImportId] = useState('');

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
        const depts = Array.isArray(tmpl.department) ? tmpl.department : (tmpl.department ? [tmpl.department] : []);
        setCurrentTemplate({ ...tmpl, department: depts });
        setIsEditing(true);
    };

    const handleNew = () => {
        setCurrentTemplate({
            name: '',
            department: [],
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

    const handleOpenImport = async () => {
        console.log("handleOpenImport called");
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/kpi/templates/public`, { withCredentials: true });
            console.log("Public templates fetched:", res.data);
            setPublicTemplates(res.data);
            setOpenImport(true);
            console.log("openImport set to true");
        } catch (error) {
            console.error("Error fetching public templates", error);
        }
    };

    const handleImport = async () => {
        if (!selectedImportId) return;
        try {
            await axios.post(`${process.env.REACT_APP_API_STRING}/kpi/template/import`, {
                templateId: selectedImportId
            }, { withCredentials: true });

            showMessage("Template imported successfully!");
            setOpenImport(false);
            fetchTemplates();
        } catch (error) {
            showMessage("Failed to import template", "error");
        }
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

    const handleDepartmentChange = (e) => {
        const options = e.target.options;
        const selected = [];
        for (let i = 0; i < options.length; i++) {
            if (options[i].selected) {
                selected.push(options[i].value);
            }
        }
        setCurrentTemplate({ ...currentTemplate, department: selected });
    };

    // Editor View
    if (isEditing) {
        return (
            <div className="kpi-page">
                {/* Top Bar */}
                <div className="kpi-topbar">
                    <div className="topbar-title">
                        <Icons.Edit />
                        <div>
                            <h1>{currentTemplate._id ? 'Edit Template' : 'Create New Template'}</h1>
                            <span className="subtitle">Configure KPI metrics and structure</span>
                        </div>
                    </div>
                    <div className="topbar-actions">
                        <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                            <Icons.Close /> Cancel
                        </button>
                        <button className="btn btn-success" onClick={handleSave}>
                            <Icons.Save /> Save Template
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="kpi-main">
                    {/* Message Toast */}
                    {message.show && (
                        <div style={{
                            position: 'fixed',
                            top: '80px',
                            right: '20px',
                            padding: '12px 20px',
                            borderRadius: '4px',
                            background: message.type === 'error' ? '#d32f2f' : '#2e7d32',
                            color: 'white',
                            zIndex: 1001,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }}>
                            {message.text}
                        </div>
                    )}

                    {/* Template Details Panel */}
                    <div className="kpi-panel">
                        <div className="panel-header">
                            <h2><Icons.Category /> Template Details</h2>
                        </div>
                        <div className="panel-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Template Name</label>
                                    <input
                                        type="text"
                                        value={currentTemplate.name}
                                        onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                                        placeholder="e.g., Sales Team KPI, HR Metrics..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Departments (Hold Ctrl to select multiple)</label>
                                    <select
                                        multiple
                                        value={currentTemplate.department}
                                        onChange={handleDepartmentChange}
                                        style={{ minHeight: '80px' }}
                                    >
                                        {user?.modules?.length > 0 ? (
                                            user.modules.map((mod, index) => (
                                                <option key={index} value={mod}>{mod}</option>
                                            ))
                                        ) : (
                                            <option value="" disabled>No Modules Assigned</option>
                                        )}
                                    </select>
                                </div>
                            </div>
                            {currentTemplate.department.length > 0 && (
                                <div style={{ marginTop: '12px' }}>
                                    <label style={{ fontSize: '0.75rem', color: '#666' }}>Selected: </label>
                                    {currentTemplate.department.map((d, i) => (
                                        <span key={i} className="chip">{d}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* KPI Rows Panel */}
                    <div className="kpi-panel template-editor">
                        <div className="panel-header">
                            <h2><Icons.List /> KPI Rows ({currentTemplate.rows.length})</h2>
                            <button className="btn btn-primary btn-sm" onClick={addRow}>
                                <Icons.Add /> Add Row
                            </button>
                        </div>
                        <div className="panel-body" style={{ padding: 0 }}>
                            <table className="row-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '60px' }}>#</th>
                                        <th>KPI Label</th>
                                        <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentTemplate.rows.map((row, idx) => (
                                        <tr key={idx}>
                                            <td style={{ fontWeight: 600, color: '#888' }}>{idx + 1}</td>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={row.label}
                                                    onChange={(e) => updateRow(idx, 'label', e.target.value)}
                                                    placeholder="Enter KPI metric name..."
                                                />
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    className="btn-icon danger"
                                                    onClick={() => removeRow(idx)}
                                                    title="Delete Row"
                                                >
                                                    <Icons.Delete />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {currentTemplate.rows.length === 0 && (
                                        <tr>
                                            <td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                                No KPI rows added yet. Click "Add Row" to get started.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // List View
    return (
        <div className="kpi-page">
            {/* Top Bar */}
            <div className="kpi-topbar">
                <div className="topbar-title">
                    <Icons.Settings />
                    <div>
                        <h1>Template Configuration</h1>
                        <span className="subtitle">Create and manage KPI templates</span>
                    </div>
                </div>
                <div className="topbar-actions">
                    <button className="btn btn-secondary" onClick={() => navigate('/kpi')}>
                        <Icons.Back /> Back to KPI
                    </button>
                    <button className="btn btn-secondary" onClick={handleOpenImport}>
                        <Icons.Download /> Import
                    </button>
                    <button className="btn btn-primary" onClick={handleNew}>
                        <Icons.Add /> Create New
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="kpi-main">
                {/* Message Toast */}
                {message.show && (
                    <div style={{
                        position: 'fixed',
                        top: '80px',
                        right: '20px',
                        padding: '12px 20px',
                        borderRadius: '4px',
                        background: message.type === 'error' ? '#d32f2f' : '#2e7d32',
                        color: 'white',
                        zIndex: 1001,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}>
                        {message.text}
                    </div>
                )}

                {/* Stats */}
                <div className="stats-bar">
                    <div className="stat-item">
                        <div className="stat-icon orange"><Icons.Category /></div>
                        <div className="stat-info">
                            <h3>{templates.length}</h3>
                            <p>Total Templates</p>
                        </div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-icon green"><Icons.List /></div>
                        <div className="stat-info">
                            <h3>{templates.reduce((sum, t) => sum + (t.rows?.length || 0), 0)}</h3>
                            <p>Total KPI Metrics</p>
                        </div>
                    </div>
                </div>

                {/* Templates List Panel */}
                <div className="kpi-panel">
                    <div className="panel-header">
                        <h2><Icons.Category /> Available Templates</h2>
                    </div>
                    <div className="panel-body" style={{ padding: 0 }}>
                        {templates.length > 0 ? (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Template Name</th>
                                        <th>Departments</th>
                                        <th>KPI Rows</th>
                                        <th>Version</th>
                                        <th className="center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {templates.map(tmpl => (
                                        <tr key={tmpl._id}>
                                            <td style={{ fontWeight: 600 }}>{tmpl.name}</td>
                                            <td>
                                                {(Array.isArray(tmpl.department) ? tmpl.department : [tmpl.department]).map((dept, i) => (
                                                    <span key={i} className="chip">{dept}</span>
                                                ))}
                                            </td>
                                            <td>{tmpl.rows?.length || 0} rows</td>
                                            <td><span className="version-tag">v{tmpl.version}</span></td>
                                            <td className="center">
                                                <button
                                                    className="btn-icon"
                                                    onClick={() => handleEdit(tmpl)}
                                                    title="Edit Template"
                                                    style={{ color: '#0078d4' }}
                                                >
                                                    <Icons.Edit />
                                                </button>
                                                {user?.role === 'Admin' && (
                                                    <button
                                                        className="btn-icon danger"
                                                        onClick={() => handleDeleteClick(tmpl)}
                                                        title="Delete Template"
                                                    >
                                                        <Icons.Delete />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="empty-state">
                                <Icons.Category />
                                <h3>No Templates Found</h3>
                                <p>Create your first KPI template to get started.</p>
                                <button className="btn btn-primary" onClick={handleNew}>
                                    <Icons.Add /> Create First Template
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Import Modal */}
            {/* Import Modal */}
            {openImport && createPortal(
                <div className="kpi-modal-overlay" onClick={() => setOpenImport(false)}>
                    <div className="kpi-custom-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Import Template</h3>
                            <button className="close-btn" onClick={() => setOpenImport(false)}>
                                <Icons.Close />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: '16px', color: '#666' }}>
                                Select a template from the public library to import.
                            </p>
                            <div className="form-group">
                                <label>Select Template</label>
                                <select
                                    value={selectedImportId}
                                    onChange={(e) => setSelectedImportId(e.target.value)}
                                >
                                    <option value="">Choose a template...</option>
                                    {publicTemplates.map(t => (
                                        <option key={t._id} value={t._id}>
                                            {t.name} (v{t.version}) - {Array.isArray(t.department) ? t.department.join(', ') : t.department} - by {t.owner?.first_name || t.owner?.username || 'Unknown'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setOpenImport(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleImport}>
                                <Icons.Download /> Import
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirmation Modal */}
            {/* Delete Confirmation Modal */}
            {deleteDialog.open && createPortal(
                <div className="kpi-modal-overlay" onClick={() => setDeleteDialog({ open: false, template: null })}>
                    <div className="kpi-custom-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Confirm Delete</h3>
                            <button className="close-btn" onClick={() => setDeleteDialog({ open: false, template: null })}>
                                <Icons.Close />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to delete the template "<strong>{deleteDialog.template?.name}</strong>"?</p>
                            <p style={{ color: '#999', fontSize: '0.9rem' }}>This action cannot be undone.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setDeleteDialog({ open: false, template: null })}>
                                Cancel
                            </button>
                            <button className="btn btn-danger" onClick={confirmDelete}>
                                <Icons.Delete /> Delete
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default KPITemplateManager;
