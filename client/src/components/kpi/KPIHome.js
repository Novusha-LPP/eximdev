import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { UserContext } from "../../contexts/UserContext";
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './kpi.scss';

// Icons as simple SVG components to avoid MUI
const Icons = {
    Dashboard: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
        </svg>
    ),
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
    Document: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
        </svg>
    ),
    Check: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
    ),
    Pending: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
        </svg>
    ),
    Cancel: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
        </svg>
    ),
    Edit: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
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
};

const KPIHome = () => {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();
    const [templates, setTemplates] = useState([]);
    const [sheets, setSheets] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [deleteDialog, setDeleteDialog] = useState({ open: false, sheetId: null });
    const [overwriteDialog, setOverwriteDialog] = useState({ open: false });
    const [message, setMessage] = useState({ show: false, text: '', type: '' });

    const [hods, setHods] = useState([]);
    const [signatories, setSignatories] = useState({
        checked_by: '',
        verified_by: '',
        approved_by: ''
    });

    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [pendingReviewCount, setPendingReviewCount] = useState(0);

    // Team template import feature
    const [teamTemplates, setTeamTemplates] = useState([]);
    const [selectedTeamTemplate, setSelectedTeamTemplate] = useState('');
    const [showTeamImport, setShowTeamImport] = useState(false);
    const [importTemplateName, setImportTemplateName] = useState('');
    const [importNameError, setImportNameError] = useState('');

    useEffect(() => {
        fetchTemplates();
        fetchSheets();
        fetchPendingCount();
        fetchTeamTemplates();
    }, []);

    useEffect(() => {
        fetchHods();
    }, [user]);

    useEffect(() => {
        fetchSheets();
    }, [filterYear]);

    const fetchPendingCount = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/kpi/reviewer/pending`, { withCredentials: true });
            const total = (res.data.counts?.check || 0) + (res.data.counts?.verify || 0) + (res.data.counts?.approve || 0);
            setPendingReviewCount(total);
        } catch (error) {
            console.error("Error fetching pending counts", error);
        }
    };

    const fetchHods = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/kpi/my-hods`, { withCredentials: true });
            let availableHods = res.data || [];

            // If user is HOD, include themselves in the dictionary
            if (user?.role === 'Head_of_Department') {
                const alreadyExists = availableHods.some(h => h._id === user._id);
                if (!alreadyExists) {
                    availableHods.push({
                        _id: user._id,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        username: user.username
                    });
                }
            }

            setHods(availableHods);
            // Auto-select if only one HOD
            if (availableHods.length === 1) {
                setSignatories(prev => ({ ...prev, checked_by: availableHods[0]._id }));
            }
        } catch (error) {
            console.error("Error fetching HODs", error);
        }
    };

    const fetchSheets = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/kpi/sheets?year=${filterYear}`, { withCredentials: true });
            setSheets(res.data);
        } catch (error) {
            console.error("Error fetching sheets", error);
        }
    };

    const fetchTemplates = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/kpi/templates`, { withCredentials: true });
            setTemplates(res.data);
            if (res.data.length > 0 && !selectedTemplate) setSelectedTemplate(res.data[0]._id);
        } catch (error) {
            console.error("Error fetching templates", error);
        }
    };

    const fetchTeamTemplates = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/kpi/team-templates`, { withCredentials: true });
            setTeamTemplates(res.data);
        } catch (error) {
            console.error("Error fetching team templates", error);
        }
    };

    // Handle team template selection - auto-populate name
    const handleTeamTemplateSelect = (templateId) => {
        setSelectedTeamTemplate(templateId);
        setImportNameError('');
        if (templateId) {
            const selected = teamTemplates.find(t => t._id === templateId);
            if (selected) {
                setImportTemplateName(selected.name);
                // Check for duplicate immediately
                checkDuplicateName(selected.name);
            }
        } else {
            setImportTemplateName('');
        }
    };

    // Check if template name already exists
    const checkDuplicateName = (name) => {
        const trimmedName = name.trim().toLowerCase();
        const exists = templates.some(t => t.name.trim().toLowerCase() === trimmedName);
        if (exists) {
            setImportNameError('A template with this name already exists. Please use a different name.');
            return true;
        }
        setImportNameError('');
        return false;
    };

    const handleImportTemplate = async () => {
        if (!selectedTeamTemplate) {
            showMessage("Please select a template to import", "warning");
            return;
        }
        if (!importTemplateName.trim()) {
            showMessage("Please enter a template name", "warning");
            return;
        }
        // Final duplicate check
        if (checkDuplicateName(importTemplateName)) {
            showMessage("A template with this name already exists. Please use a different name.", "warning");
            return;
        }
        try {
            const res = await axios.post(`${process.env.REACT_APP_API_STRING}/kpi/import-template`,
                { templateId: selectedTeamTemplate, customName: importTemplateName.trim() },
                { withCredentials: true }
            );
            showMessage(res.data.message || "Template imported successfully!");
            setSelectedTeamTemplate('');
            setImportTemplateName('');
            setShowTeamImport(false);
            fetchTemplates(); // Refresh templates list
        } catch (error) {
            if (error.response?.status === 409) {
                setImportNameError(error.response.data.message);
                showMessage(error.response.data.message, "warning");
            } else {
                showMessage(error.response?.data?.message || "Failed to import template", "error");
            }
        }
    };

    const showMessage = (text, type = 'success') => {
        setMessage({ show: true, text, type });
        setTimeout(() => setMessage({ show: false, text: '', type: '' }), 4000);
    };

    const handleCreateSheet = async () => {
        // Validate checked_by is selected
        if (!signatories.checked_by) {
            showMessage("Please select a 'Checked By' person", "error");
            return;
        }

        try {
            const res = await axios.post(`${process.env.REACT_APP_API_STRING}/kpi/sheet/generate`, {
                year,
                month,
                templateId: selectedTemplate,
                signatories
            }, { withCredentials: true });

            navigate(`/kpi/sheet/${res.data._id}`);
        } catch (error) {
            if (error.response && error.response.status === 409) {
                setOverwriteDialog({ open: true });
            } else if (error.response && error.response.status === 400) {
                // Fallback for generic 400 if backend fails to send 409 for some reason, though logic changed
                showMessage(error.response.data.message || "Sheet creation failed", "warning");
            } else {
                showMessage("Failed to create sheet", "error");
            }
        }
    };

    const confirmOverwrite = async () => {
        try {
            const res = await axios.post(`${process.env.REACT_APP_API_STRING}/kpi/sheet/generate`, {
                year,
                month,
                templateId: selectedTemplate,
                signatories,
                overwrite: true
            }, { withCredentials: true });

            setOverwriteDialog({ open: false });
            navigate(`/kpi/sheet/${res.data._id}`);
        } catch (error) {
            setOverwriteDialog({ open: false });
            showMessage("Failed to overwrite sheet", "error");
        }
    };

    const handleDeleteClick = (e, id) => {
        e.stopPropagation();
        setDeleteDialog({ open: true, sheetId: id });
    };

    const confirmDeleteSheet = async () => {
        if (!deleteDialog.sheetId) return;
        try {
            await axios.delete(`${process.env.REACT_APP_API_STRING}/kpi/sheet/${deleteDialog.sheetId}`, { withCredentials: true });
            showMessage("Sheet deleted successfully");
            fetchSheets();
        } catch (error) {
            showMessage("Error deleting sheet", "error");
        } finally {
            setDeleteDialog({ open: false, sheetId: null });
        }
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'APPROVED': return { icon: <Icons.Check />, class: 'approved', label: 'Approved' };
            case 'REJECTED': return { icon: <Icons.Cancel />, class: 'rejected', label: 'Rejected' };
            case 'SUBMITTED': return { icon: <Icons.Pending />, class: 'pending', label: 'Pending' };
            default: return { icon: <Icons.Edit />, class: 'draft', label: 'Draft' };
        }
    };

    const stats = {
        total: sheets.length,
        approved: sheets.filter(s => s.status === 'APPROVED').length,
        pending: sheets.filter(s => s.status === 'SUBMITTED').length,
        drafts: sheets.filter(s => s.status === 'DRAFT').length
    };

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    return (
        <>
            <motion.div
                className="kpi-modern-wrapper"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                {/* Header */}
                <div className="modern-header" style={{ marginBottom: '24px' }}>
                    <div className="header-title">
                        <h1>KPI Dashboard</h1>
                        <p>Track performance, manage sheets, and analyze results.</p>
                    </div>
                    <div className="header-actions">
                        {user?.role === 'Admin' && (
                            <button className="modern-btn secondary" onClick={() => navigate('/kpi/admin')}>
                                <Icons.Dashboard /> Admin View
                            </button>
                        )}
                        {pendingReviewCount > 0 && (
                            <button className="modern-btn secondary" onClick={() => navigate('/kpi/reviews')} style={{ position: 'relative' }}>
                                <Icons.Pending /> Pending Reviews
                                <span style={{
                                    position: 'absolute',
                                    top: '-6px',
                                    right: '-6px',
                                    background: '#ef4444',
                                    color: 'white',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '10px',
                                    minWidth: '18px',
                                    textAlign: 'center'
                                }}>
                                    {pendingReviewCount}
                                </span>
                            </button>
                        )}
                        <button className="modern-btn secondary" onClick={() => navigate('/kpi/templates')}>
                            <Icons.Settings /> Manage Templates
                        </button>
                    </div>
                </div>

                {/* Content Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 350px) 1fr', gap: '24px', alignItems: 'start' }}>

                    {/* Left Column: Create Panel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <motion.div
                            className="modern-section"
                            style={{ borderTop: '4px solid #0078d4' }}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            <div className="section-header">
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Icons.Add /> Create New Sheet
                                </h2>
                            </div>
                            <div className="section-body">
                                <div className="modern-form-group">
                                    <label>Template</label>
                                    <select
                                        value={selectedTemplate}
                                        onChange={(e) => setSelectedTemplate(e.target.value)}
                                        style={{ background: '#f8f9fa' }}
                                    >
                                        <option value="" disabled>Select Template...</option>
                                        {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                                    </select>

                                    {/* Import from Team Member - Hyperlink */}
                                    {teamTemplates.length > 0 && (
                                        <div style={{ marginTop: '6px' }}>
                                            <span
                                                onClick={() => setShowTeamImport(!showTeamImport)}
                                                style={{
                                                    color: '#0078d4',
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer',
                                                    textDecoration: 'underline'
                                                }}
                                            >
                                                📥 Import from Team Member
                                            </span>

                                            {showTeamImport && (
                                                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <select
                                                        value={selectedTeamTemplate}
                                                        onChange={(e) => handleTeamTemplateSelect(e.target.value)}
                                                        style={{
                                                            background: '#f8f9fa',
                                                            padding: '6px 8px',
                                                            fontSize: '0.8rem',
                                                            borderRadius: '4px',
                                                            border: '1px solid #ddd'
                                                        }}
                                                    >
                                                        <option value="">Select template...</option>
                                                        {teamTemplates.map(t => (
                                                            <option key={t._id} value={t._id}>
                                                                {t.name} - {t.owner?.first_name} {t.owner?.last_name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {selectedTeamTemplate && (
                                                        <>
                                                            <div>
                                                                <label style={{ fontSize: '0.75rem', color: '#666', marginBottom: '4px', display: 'block' }}>
                                                                    Template Name (you can modify)
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={importTemplateName}
                                                                    onChange={(e) => {
                                                                        setImportTemplateName(e.target.value);
                                                                        checkDuplicateName(e.target.value);
                                                                    }}
                                                                    placeholder="Enter template name"
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '6px 8px',
                                                                        fontSize: '0.8rem',
                                                                        borderRadius: '4px',
                                                                        border: importNameError ? '1px solid #ef4444' : '1px solid #ddd',
                                                                        background: '#f8f9fa'
                                                                    }}
                                                                />
                                                                {importNameError && (
                                                                    <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '4px' }}>
                                                                        {importNameError}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="modern-btn primary"
                                                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                                                onClick={handleImportTemplate}
                                                                disabled={!selectedTeamTemplate || !importTemplateName.trim() || importNameError}
                                                            >
                                                                Import Template
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div className="modern-form-group">
                                        <label>Month</label>
                                        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ background: '#f8f9fa' }}>
                                            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div className="modern-form-group">
                                        <label>Year</label>
                                        <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ background: '#f8f9fa' }}>
                                            {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#95a5a6', marginBottom: '12px', display: 'block', textTransform: 'uppercase' }}>
                                        Signatories
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {/* Checked By - Selectable (Required) */}
                                        <div>
                                            <div style={{ fontSize: '0.8rem', marginBottom: '4px', color: '#666' }}>Checked By <span style={{ color: '#ef4444' }}>*</span></div>
                                            <select
                                                value={signatories.checked_by}
                                                onChange={(e) => setSignatories({ ...signatories, checked_by: e.target.value })}
                                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '0.9rem' }}
                                                disabled={hods.length === 0}
                                            >
                                                <option value="">{hods.length === 0 ? 'No HOD assigned' : 'Select HOD...'}</option>
                                                {hods.map(u => (
                                                    <option key={u._id} value={u._id}>{u.first_name} {u.last_name}</option>
                                                ))}
                                            </select>
                                            {hods.length === 0 && (
                                                <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '4px' }}>
                                                    You are not part of any team. Contact your administrator.
                                                </div>
                                            )}
                                        </div>

                                        {/* Verified By - Static */}
                                        <div>
                                            <div style={{ fontSize: '0.8rem', marginBottom: '4px', color: '#666' }}>Verified By</div>
                                            <input
                                                type="text"
                                                value="SHALINI ARUN"
                                                disabled
                                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '0.9rem', background: '#f5f5f5', color: '#666' }}
                                            />
                                        </div>

                                        {/* Approved By - Static */}
                                        <div>
                                            <div style={{ fontSize: '0.8rem', marginBottom: '4px', color: '#666' }}>Approved By</div>
                                            <input
                                                type="text"
                                                value="SURAJ RAJAN"
                                                disabled
                                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '0.9rem', background: '#f5f5f5', color: '#666' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    className="modern-btn primary"
                                    onClick={handleCreateSheet}
                                    style={{ width: '100%', marginTop: '24px', justifyContent: 'center', padding: '12px' }}
                                >
                                    <Icons.Add /> Generate Sheet
                                </button>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column: Stats & Sheets */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* Stats */}
                        <div className="modern-stats-grid" style={{ marginBottom: 0, gridTemplateColumns: 'repeat(4, 1fr)' }}>
                            {[
                                { label: 'Total Sheets', value: stats.total, color: 'blue', icon: <Icons.Document /> },
                                { label: 'Approved', value: stats.approved, color: 'green', icon: <Icons.Check /> },
                                { label: 'Pending', value: stats.pending, color: 'orange', icon: <Icons.Pending /> },
                                { label: 'Drafts', value: stats.drafts, color: 'gray', icon: <Icons.Edit /> }
                            ].map((stat, i) => (
                                <motion.div key={i} className="modern-stat-card" whileHover={{ y: -3 }}>
                                    <div className={`icon-box ${stat.color}`}>{stat.icon}</div>
                                    <div className="stat-content">
                                        <h3>{stat.value}</h3>
                                        <span>{stat.label}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Sheets List */}
                        <motion.div
                            className="modern-section"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="section-header" style={{ justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <h2><Icons.List /> My KPI Sheets</h2>
                                    <span style={{ background: '#e2e8f0', padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                                        {sheets.length}
                                    </span>
                                </div>
                                <select
                                    value={filterYear}
                                    onChange={(e) => setFilterYear(Number(e.target.value))}
                                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '0.9rem', outline: 'none' }}
                                >
                                    {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div className="section-body" style={{ background: '#fcfcfc', minHeight: '400px' }}>
                                {sheets.length > 0 ? (
                                    <div className="modern-sheet-grid">
                                        <AnimatePresence>
                                            {sheets.map((sheet) => (
                                                <motion.div
                                                    key={sheet._id}
                                                    layout
                                                    className="modern-sheet-card"
                                                    onClick={() => navigate(`/kpi/sheet/${sheet._id}`)}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    whileHover={{ y: -5, boxShadow: '0 12px 24px rgba(0,0,0,0.1)' }}
                                                    style={{ position: 'relative' }}
                                                    title={`Status: ${sheet.status}\n${sheet.summary?.submission_date ? `Submitted: ${new Date(sheet.summary.submission_date).toLocaleDateString()}` : ''}${sheet.approval_history?.find(h => h.action === 'CHECK')?.date ? `\nChecked: ${new Date(sheet.approval_history.find(h => h.action === 'CHECK').date).toLocaleDateString()}` : ''}${sheet.approval_history?.find(h => h.action === 'VERIFY')?.date ? `\nVerified: ${new Date(sheet.approval_history.find(h => h.action === 'VERIFY').date).toLocaleDateString()}` : ''}${sheet.approval_history?.find(h => h.action === 'APPROVE')?.date ? `\nApproved: ${new Date(sheet.approval_history.find(h => h.action === 'APPROVE').date).toLocaleDateString()}` : ''}`}
                                                >
                                                    <button
                                                        className="delete-btn-modern"
                                                        onClick={(e) => handleDeleteClick(e, sheet._id)}
                                                        title="Delete Sheet"
                                                    >
                                                        <Icons.Delete />
                                                    </button>
                                                    <div className="card-top" style={{ background: sheet.status === 'APPROVED' ? '#4caf50' : sheet.status === 'VERIFIED' ? '#0078d4' : sheet.status === 'CHECKED' ? '#17a2b8' : sheet.status === 'SUBMITTED' ? '#ff9800' : '#e0e0e0' }} />
                                                    <div className="card-content">
                                                        <h3>{months[sheet.month - 1]} {sheet.year}</h3>
                                                        <p className="date">{sheet.template_name}</p>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                                                            <span className={`status-badge ${sheet.status.toLowerCase()}`}>{sheet.status}</span>
                                                            <span style={{ fontSize: '0.8rem', color: '#95a5a6' }}>{sheet.completion_percentage || 0}% Complete</span>
                                                        </div>
                                                        {/* Mini Timeline on Card */}
                                                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #eee', fontSize: '0.7rem', color: '#94a3b8' }}>
                                                            {sheet.summary?.submission_date && (
                                                                <div>📤 {new Date(sheet.summary.submission_date).toLocaleDateString()}</div>
                                                            )}
                                                            {sheet.approval_history?.find(h => h.action === 'CHECK') && (
                                                                <div>✓ Checked {new Date(sheet.approval_history.find(h => h.action === 'CHECK').date).toLocaleDateString()}</div>
                                                            )}
                                                            {sheet.approval_history?.find(h => h.action === 'VERIFY') && (
                                                                <div>✓ Verified {new Date(sheet.approval_history.find(h => h.action === 'VERIFY').date).toLocaleDateString()}</div>
                                                            )}
                                                            {sheet.approval_history?.find(h => h.action === 'APPROVE') && (
                                                                <div>✅ Approved {new Date(sheet.approval_history.find(h => h.action === 'APPROVE').date).toLocaleDateString()}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        <Icons.Document style={{ width: 48, height: 48, opacity: 0.2 }} />
                                        <h3>No Sheets Found</h3>
                                        <p>Select a different year or create a new sheet.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>

            </motion.div>

            {/* Modal & Toast */}
            {deleteDialog.open && (
                <div className="kpi-confirm-overlay">
                    <motion.div className="kpi-confirm-modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                        <div className="kpi-confirm-header">
                            <h3>Confirm Delete</h3>
                            <button className="close-btn" onClick={() => setDeleteDialog({ open: false, sheetId: null })}><Icons.Close /></button>
                        </div>
                        <div className="kpi-confirm-body">
                            <p>Are you sure you want to delete this sheet? This action cannot be undone.</p>
                        </div>
                        <div className="kpi-confirm-footer">
                            <button className="modern-btn secondary" onClick={() => setDeleteDialog({ open: false, sheetId: null })}>Cancel</button>
                            <button className="modern-btn primary" style={{ background: '#ef5350' }} onClick={confirmDeleteSheet}>Delete</button>
                        </div>
                    </motion.div>
                </div>
            )}

            {overwriteDialog.open && (
                <div className="kpi-confirm-overlay">
                    <motion.div className="kpi-confirm-modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                        <div className="kpi-confirm-header">
                            <h3>Sheet Already Exists</h3>
                            <button className="close-btn" onClick={() => setOverwriteDialog({ open: false })}><Icons.Close /></button>
                        </div>
                        <div className="kpi-confirm-body">
                            <p>A KPI Sheet for {months[month - 1]} {year} already exists.</p>
                            <p style={{ marginTop: '10px', fontSize: '0.9rem', color: '#666' }}>
                                Creating a new sheet will <strong>permanently delete</strong> the existing one and replace it with a blank template.
                            </p>
                            <p style={{ marginTop: '10px', fontWeight: 600 }}>Are you sure you want to proceed?</p>
                        </div>
                        <div className="kpi-confirm-footer">
                            <button className="modern-btn secondary" onClick={() => setOverwriteDialog({ open: false })}>Cancel</button>
                            <button className="modern-btn primary" style={{ background: '#ef5350' }} onClick={confirmOverwrite}>Yes, Overwrite</button>
                        </div>
                    </motion.div>
                </div>
            )}

            {message.show && (
                <div style={{
                    position: 'fixed',
                    top: '80px', right: '20px',
                    padding: '12px 20px', borderRadius: '8px',
                    background: message.type === 'error' ? '#ef5350' : message.type === 'warning' ? '#ffa726' : '#66bb6a',
                    color: 'white', fontWeight: 500,
                    zIndex: 2000, boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
                }}>
                    {message.text}
                </div>
            )}
        </>
    );
};

export default KPIHome;
