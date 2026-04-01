import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiUsers, FiChevronDown, FiPlusCircle } from 'react-icons/fi';
import masterAPI from '../../../api/attendance/master.api';
import toast from 'react-hot-toast';
import UserMigrationModal from './UserMigrationModal';
import './CompanyManagement.css';

const CompanyCard = ({ company, onEdit, onDelete, onMigrateUser, users = [], expanded, onToggleExpand }) => {
    return (
        <div className="cm-card">
            <div className="cm-card-header">
                <div className="cm-card-title">
                    <h3>{company.company_name}</h3>
                    <span>{company.company_code}</span>
                </div>
                <div className="cm-card-actions">
                    <button className="cm-icon-btn" onClick={() => onEdit(company)} title="Edit Configuration">
                        <FiEdit size={14} />
                    </button>
                    <button className="cm-icon-btn delete" onClick={() => onDelete(company._id)} title="Delete Company">
                        <FiTrash2 size={14} />
                    </button>
                </div>
            </div>
            <div className="cm-card-body">
                <div className="cm-stats-row">
                    <div className="cm-stat-item">
                        <span className="cm-stat-label">Timezone</span>
                        <span className="cm-stat-value" style={{fontSize: '0.9rem'}}>{company.timezone || 'UTC'}</span>
                    </div>
                    <div className="cm-stat-item" style={{textAlign: 'right'}}>
                        <span className="cm-stat-label">Total Users</span>
                        <span className="cm-stat-value">{users.length}</span>
                    </div>
                </div>
                
                <button className="cm-user-list-toggle" onClick={() => onToggleExpand(company._id)}>
                    <FiUsers size={14} />
                    {expanded ? 'Hide Members' : 'View Members'}
                    <FiChevronDown size={14} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
            </div>
            
            {expanded && (
                <div className="cm-user-list">
                    {users.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                            Zero active users in this company.
                        </div>
                    ) : (
                        users.map(u => (
                            <div key={u._id} className="cm-user-item">
                                <div className="cm-user-info">
                                    <div className="cm-user-avatar">
                                        {u.first_name?.[0]}{u.last_name?.[0]}
                                    </div>
                                    <div className="cm-user-details">
                                        <span className="cm-user-name">{u.first_name} {u.last_name}</span>
                                        <span className="cm-user-sub">{u.employee_code || 'No Code'} • {u.designation || 'Staff'}</span>
                                    </div>
                                </div>
                                <button className="cm-migrate-btn" onClick={() => onMigrateUser(u)}>
                                    Migrate
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

const CompanyManagement = () => {
    const [companies, setCompanies] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedCompany, setExpandedCompany] = useState(null);
    const [modal, setModal] = useState({ open: false, type: 'add', record: null });
    const [migrationModal, setMigrationModal] = useState({ open: false, user: null });
    const [form, setForm] = useState({ company_name: '', company_code: '', timezone: 'Asia/Kolkata', settings: {} });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [cRes, uRes] = await Promise.all([
                masterAPI.getCompanies(),
                masterAPI.getUsers({ limit: 2000, all_companies: true }) // Fetching all users
            ]);
            setCompanies(cRes?.data || []);
            setUsers(uRes?.data || []);
        } catch (err) {
            toast.error("Failed to load company data");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (modal.type === 'add') {
                await masterAPI.createCompany(form);
                toast.success("Company created successfully");
            } else {
                await masterAPI.updateCompany(modal.record._id, form);
                toast.success("Company updated successfully");
            }
            setModal({ open: false });
            fetchData();
        } catch (err) {
            toast.error(err.message || "Operation failed");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this company? This cannot be undone.")) return;
        try {
            await masterAPI.deleteCompany(id);
            toast.success("Company deleted");
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        }
    };

    const handleMigrate = async (migrationData) => {
        try {
            await masterAPI.migrateUser(migrationData);
            toast.success("User successfully migrated!");
            fetchData();
        } catch (err) {
            throw err;
        }
    };

    const openModal = (type, record = null) => {
        setModal({ open: true, type, record });
        if (record) {
            setForm({
                company_name: record.company_name,
                company_code: record.company_code,
                timezone: record.timezone || 'Asia/Kolkata',
                settings: record.settings || {}
            });
        } else {
            setForm({ company_name: '', company_code: '', timezone: 'Asia/Kolkata', settings: {} });
        }
    };

    if (loading) return <div className="cm-loading">Loading Management Console...</div>;

    return (
        <div className="cm-container">
            <div className="cm-header">
                <div className="cm-title-section">
                    <h1>Organization Management</h1>
                    <p>Manage multi-company structures, policy scoping, and cross-company user migrations.</p>
                </div>
                <button className="cm-add-btn" onClick={() => openModal('add')}>
                    <FiPlusCircle /> Add New Organization
                </button>
            </div>

            <div className="cm-grid">
                {companies.map(c => (
                    <CompanyCard 
                        key={c._id} 
                        company={c} 
                        users={users.filter(u => u.company_id === c._id)}
                        expanded={expandedCompany === c._id}
                        onToggleExpand={(id) => setExpandedCompany(expandedCompany === id ? null : id)}
                        onEdit={openModal.bind(null, 'edit')}
                        onDelete={handleDelete}
                        onMigrateUser={(user) => setMigrationModal({ open: true, user })}
                    />
                ))}
            </div>

            {/* CRUD Modal */}
            {modal.open && (
                <div className="cm-modal-overlay" onClick={() => setModal({ open: false })}>
                    <div className="cm-modal" onClick={e => e.stopPropagation()}>
                        <div className="cm-modal-header">
                            <h2>{modal.type === 'add' ? 'Register New Organization' : 'Edit Configuration'}</h2>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="cm-modal-body">
                                <div className="cm-form-group">
                                    <label>Company Name</label>
                                    <input 
                                        type="text" 
                                        value={form.company_name} 
                                        onChange={e => setForm({ ...form, company_name: e.target.value })}
                                        placeholder="e.g. Acme Corporation"
                                        required
                                    />
                                </div>
                                <div className="cm-form-group">
                                    <label>Company Code (Unique Identifier)</label>
                                    <input 
                                        type="text" 
                                        value={form.company_code} 
                                        onChange={e => setForm({ ...form, company_code: e.target.value.toUpperCase() })}
                                        placeholder="e.g. ACME_IND"
                                        required
                                    />
                                </div>
                                <div className="cm-form-group">
                                    <label>Timezone</label>
                                    <select 
                                        value={form.timezone} 
                                        onChange={e => setForm({ ...form, timezone: e.target.value })}
                                    >
                                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                                        <option value="UTC">UTC (Universal Time)</option>
                                        <option value="America/New_York">America/New_York (EST)</option>
                                        <option value="Europe/London">Europe/London (GMT)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="cm-modal-footer">
                                <button type="button" className="cm-btn cm-btn-secondary" onClick={() => setModal({ open: false })}>
                                    Discard Changes
                                </button>
                                <button type="submit" className="cm-btn cm-btn-primary" disabled={saving}>
                                    {saving ? 'Processing...' : 'Save Configuration'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Migration Modal */}
            <UserMigrationModal 
                isOpen={migrationModal.open}
                onClose={() => setMigrationModal({ open: false, user: null })}
                user={migrationModal.user}
                companies={companies}
                onMigrate={handleMigrate}
            />
        </div>
    );
};

export default CompanyManagement;
