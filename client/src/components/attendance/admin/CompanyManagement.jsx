import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiUsers, FiChevronDown, FiPlusCircle, FiSearch } from 'react-icons/fi';
import { Modal } from 'antd';
import masterAPI from '../../../api/attendance/master.api';
import toast from 'react-hot-toast';
import UserMigrationModal from './UserMigrationModal';
import axios from 'axios';
import './CompanyManagement.css';

const CompanyCard = ({ company, onEdit, onDelete, onMigrateUser, users = [], expanded, onToggleExpand }) => {
    const branchCount = Array.isArray(company.branch_ids) ? company.branch_ids.length : 0;

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
                        <span className="cm-stat-label">Shift Policy</span>
                        <span className="cm-stat-value cm-stat-tag">{company.shift_policy || 'fixed'}</span>
                    </div>
                    <div className="cm-stat-item" style={{textAlign: 'center'}}>
                        <span className="cm-stat-label">Branches</span>
                        <span className="cm-stat-value">{branchCount}</span>
                    </div>
                    <div className="cm-stat-item" style={{textAlign: 'right'}}>
                        <span className="cm-stat-label">Total Users</span>
                        <span className="cm-stat-value">{users.length}</span>
                    </div>
                </div>

                {branchCount > 0 && (
                    <div className="cm-branch-tags">
                        {company.branch_ids.slice(0, 3).map((b) => (
                            <span key={b._id || b} className="cm-pill">{b.branch_code || 'BR'} - {b.category || 'GEN'}</span>
                        ))}
                        {branchCount > 3 && <span className="cm-pill cm-pill-muted">+{branchCount - 3} more</span>}
                    </div>
                )}
                
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
    const [branches, setBranches] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedCompany, setExpandedCompany] = useState(null);
    const [modal, setModal] = useState({ open: false, type: 'add', record: null });
    const [migrationModal, setMigrationModal] = useState({ open: false, user: null });
    const [searchTerm, setSearchTerm] = useState('');
    const [policyFilter, setPolicyFilter] = useState('all');
    const [form, setForm] = useState({
        company_name: '',
        company_code: '',
        shift_policy_id: '',
        branch_ids: [],
        selected_user_ids: [],
        settings: {}
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [cRes, uRes, branchRes, shiftRes] = await Promise.all([
                masterAPI.getCompanies(),
                masterAPI.getUsers({ limit: 2000, all_companies: true, isActive: true }),
                axios.get(`${process.env.REACT_APP_API_STRING}/admin/get-branches`, { withCredentials: true }),
                masterAPI.getShifts({ all_companies: true })
            ]);
            setCompanies(cRes?.data || []);
            setUsers(uRes?.data || []);
            setBranches(branchRes?.data || []);
            setShifts(shiftRes?.data || []);
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

    const handleDelete = (id) => {
        Modal.confirm({
            title: 'Delete Organization',
            content: 'Are you sure you want to delete this company? This action cannot be undone and may affect associated users and records.',
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await masterAPI.deleteCompany(id);
                    toast.success("Company deleted");
                    fetchData();
                } catch (err) {
                    toast.error(err.response?.data?.message || err.message);
                }
            }
        });
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
            const userIdsInCompany = users
                .filter((u) => String(u.company_id?._id || u.company_id) === String(record._id))
                .map((u) => u._id);

            setForm({
                company_name: record.company_name,
                company_code: record.company_code,
                shift_policy_id: record.shift_policy_id || '',
                branch_ids: (record.branch_ids || []).map((b) => b._id || b),
                selected_user_ids: userIdsInCompany,
                settings: record.settings || {}
            });
        } else {
            setForm({
                company_name: '',
                company_code: '',
                shift_policy_id: '',
                branch_ids: [],
                selected_user_ids: [],
                settings: {}
            });
        }
    };

    const toggleUserSelection = (userId) => {
        const exists = form.selected_user_ids.includes(userId);
        const selected_user_ids = exists
            ? form.selected_user_ids.filter((id) => id !== userId)
            : [...form.selected_user_ids, userId];
        setForm({ ...form, selected_user_ids });
    };

    const toggleBranchSelection = (branchId) => {
        const exists = form.branch_ids.includes(branchId);
        const branch_ids = exists
            ? form.branch_ids.filter((id) => id !== branchId)
            : [...form.branch_ids, branchId];
        setForm({ ...form, branch_ids });
    };

    const getCompanyUsers = (companyId) => users.filter((u) => String(u.company_id?._id || u.company_id) === String(companyId));

    const assignableUsers = users.filter((u) => (u.role || '').toUpperCase() !== 'ADMIN');

    const filteredCompanies = companies.filter((company) => {
        const nameMatch = (company.company_name || '').toLowerCase().includes(searchTerm.toLowerCase())
            || (company.company_code || '').toLowerCase().includes(searchTerm.toLowerCase());
        const policyMatch = policyFilter === 'all' || (company.shift_policy || 'fixed') === policyFilter;
        return nameMatch && policyMatch;
    });

    const totalAssignedUsers = companies.reduce((acc, c) => acc + getCompanyUsers(c._id).length, 0);

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

            <div className="cm-overview-row">
                <div className="cm-overview-card">
                    <span>Total Organizations</span>
                    <strong>{companies.length}</strong>
                </div>
                <div className="cm-overview-card">
                    <span>Total Assigned Users</span>
                    <strong>{totalAssignedUsers}</strong>
                </div>
                <div className="cm-overview-card">
                    <span>Total Branches Linked</span>
                    <strong>{companies.reduce((acc, c) => acc + (c.branch_ids?.length || 0), 0)}</strong>
                </div>
            </div>

            <div className="cm-toolbar">
                <div className="cm-search-wrap">
                    <FiSearch size={15} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by organization name or code"
                    />
                </div>
                <select value={policyFilter} onChange={(e) => setPolicyFilter(e.target.value)} className="cm-filter-select">
                    <option value="all">All Shift Policies</option>
                    <option value="fixed">Fixed Shift</option>
                    <option value="rotational">Rotational Shift</option>
                    <option value="flexible">Flexible Shift</option>
                </select>
            </div>

            <div className="cm-grid">
                {filteredCompanies.map(c => (
                    <CompanyCard 
                        key={c._id} 
                        company={c} 
                        users={getCompanyUsers(c._id)}
                        expanded={expandedCompany === c._id}
                        onToggleExpand={(id) => setExpandedCompany(expandedCompany === id ? null : id)}
                        onEdit={openModal.bind(null, 'edit')}
                        onDelete={handleDelete}
                        onMigrateUser={(user) => setMigrationModal({ open: true, user })}
                    />
                ))}
            </div>

            {filteredCompanies.length === 0 && (
                <div className="cm-empty-state">
                    <h3>No organizations match your filters</h3>
                    <p>Try a different search term or shift policy, or create a new organization.</p>
                </div>
            )}

            {/* CRUD Modal */}
            {modal.open && (
                <div className="cm-modal-overlay" onClick={() => setModal({ open: false })}>
                    <div className="cm-modal" onClick={e => e.stopPropagation()}>
                        <div className="cm-modal-header">
                            <h2>{modal.type === 'add' ? 'Register New Organization' : 'Edit Configuration'}</h2>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="cm-modal-body">
                                <div className="cm-modal-grid">
                                    <div className="cm-modal-column">
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
                                            <label>Shift Policy (From Shift Management)</label>
                                            <select 
                                                value={form.shift_policy_id}
                                                onChange={e => setForm({ ...form, shift_policy_id: e.target.value })}
                                                required
                                            >
                                                <option value="">Select a Shift Policy...</option>
                                                {shifts.map(s => (
                                                    <option key={s._id} value={s._id}>
                                                        {s.shift_name} ({s.shift_code})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="cm-form-group">
                                            <label>Select Branches</label>
                                            <p className="cm-field-note">Selected: {form.branch_ids.length}</p>
                                            <div className="cm-selection-grid">
                                                {branches.map((branch) => (
                                                    <label key={branch._id} className="cm-check-row">
                                                        <input
                                                            type="checkbox"
                                                            checked={form.branch_ids.includes(branch._id)}
                                                            onChange={() => toggleBranchSelection(branch._id)}
                                                        />
                                                        <span>{branch.branch_code} - {branch.branch_name} ({branch.category})</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="cm-modal-column">
                                        <div className="cm-form-group">
                                            <label>Select Users For Organization</label>
                                            <p className="cm-field-note">Selected: {form.selected_user_ids.length}</p>
                                            <div className="cm-selection-grid cm-user-selection-grid">
                                                {assignableUsers.map((user) => (
                                                    <label key={user._id} className="cm-check-row">
                                                        <input
                                                            type="checkbox"
                                                            checked={form.selected_user_ids.includes(user._id)}
                                                            onChange={() => toggleUserSelection(user._id)}
                                                        />
                                                        <span>
                                                            {(user.first_name || user.username || 'User')} {user.last_name || ''}
                                                            <small>{user.employee_code || user.username || 'No code'}</small>
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
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
