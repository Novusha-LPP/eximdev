import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiUsers, FiChevronDown, FiPlusCircle, FiSearch, FiClock, FiArrowRight, FiX, FiMapPin, FiGlobe, FiShield, FiUserPlus, FiSettings, FiCheck, FiMap } from 'react-icons/fi';
import LocationPickerModal from '../common/LocationPickerModal';
import LocationDirectorySelect from '../common/LocationDirectorySelect';
import { Modal } from 'antd';
import masterAPI from '../../../api/attendance/master.api';
import toast from 'react-hot-toast';
import UserMigrationModal from './UserMigrationModal';
import axios from 'axios';
import './CompanyManagement.css';

const CompanyCard = ({ company, onEdit, onDelete, onMigrateUser, onViewHistory, users = [], expanded, onToggleExpand }) => {
    const branchCount = Array.isArray(company.branch_ids) ? company.branch_ids.length : 0;
    return (
        <div className="cm-card">
            <div className="cm-card-header">
                <div className="cm-card-title">
                    <h3>{company.company_name}</h3>
                    <span>{company.company_code}</span>
                </div>
                <div className="cm-card-actions">
                    <button className="cm-icon-btn" onClick={() => onEdit(company)} title="Edit Configuration"><FiEdit size={14} /></button>
                    <button className="cm-icon-btn" onClick={() => onViewHistory(company)} title="Migration History"><FiClock size={14} /></button>
                    <button className="cm-icon-btn delete" onClick={() => onDelete(company._id)} title="Delete Company"><FiTrash2 size={14} /></button>
                </div>
            </div>
            <div className="cm-card-body">
                <div className="cm-stats-row">
                    <div className="cm-stat-item">
                        <span className="cm-stat-label">Shift Policy</span>
                        <span className="cm-stat-value cm-stat-tag">{company.shift_policy || 'fixed'}</span>
                    </div>
                    <div className="cm-stat-item" style={{ textAlign: 'center' }}>
                        <span className="cm-stat-label">Branches</span>
                        <span className="cm-stat-value">{branchCount}</span>
                    </div>
                    <div className="cm-stat-item" style={{ textAlign: 'right' }}>
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
                                    <div className="cm-user-avatar">{u.first_name?.[0]}{u.last_name?.[0]}</div>
                                    <div className="cm-user-details">
                                        <span className="cm-user-name">{u.first_name} {u.last_name}</span>
                                        <span className="cm-user-sub">{u.employee_code || 'No Code'} • {u.designation || 'Staff'}</span>
                                    </div>
                                </div>
                                <button className="cm-migrate-btn" onClick={() => onMigrateUser(u)}>Migrate</button>
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
    const [pickerModal, setPickerModal] = useState({ open: false, index: -1 });
    const [modal, setModal] = useState({ open: false, type: 'add', record: null });
    const [migrationModal, setMigrationModal] = useState({ open: false, user: null });
    const [historyModal, setHistoryModal] = useState({ open: false, company: null, logs: [], loading: false });
    const [searchTerm, setSearchTerm] = useState('');
    const [policyFilter, setPolicyFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('basic');
    const [form, setForm] = useState({
        company_name: '',
        company_code: '',
        shift_policy_id: '',
        branch_ids: [],
        selected_user_ids: [],
        settings: { geo_fencing_enabled: false, allowed_locations: [] }
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchData(); }, []);

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
            content: 'Are you sure? This cannot be undone.',
            okText: 'Delete', okType: 'danger', cancelText: 'Cancel',
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
        } catch (err) { throw err; }
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
                settings: {
                    ...(record.settings || {}),
                    geo_fencing_enabled: record.settings?.geo_fencing_enabled || false,
                    allowed_locations: record.settings?.allowed_locations || []
                }
            });
        } else {
            setForm({
                company_name: '', company_code: '', shift_policy_id: '',
                branch_ids: [], selected_user_ids: [],
                settings: { geo_fencing_enabled: false, allowed_locations: [] }
            });
        }
        setActiveTab('basic');
    };

    const toggleBranchSelection = (branchId) => {
        const exists = form.branch_ids.includes(branchId);
        setForm({ ...form, branch_ids: exists ? form.branch_ids.filter(id => id !== branchId) : [...form.branch_ids, branchId] });
    };

    const addLocation = () => {
        setForm(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                allowed_locations: [...(prev.settings.allowed_locations || []), { name: '', latitude: 0, longitude: 0, radius_meters: 200 }]
            }
        }));
    };

    const removeLocation = (index) => {
        setForm(prev => ({
            ...prev,
            settings: { ...prev.settings, allowed_locations: prev.settings.allowed_locations.filter((_, i) => i !== index) }
        }));
    };

    const updateLocationField = (index, field, value) => {
        setForm(prev => {
            const newList = [...prev.settings.allowed_locations];
            newList[index] = { ...newList[index], [field]: value };
            return { ...prev, settings: { ...prev.settings, allowed_locations: newList } };
        });
    };

    const handleMapConfirm = (locationData) => {
        if (pickerModal.index === -1) return;
        setForm(prev => {
            const nextLocs = [...prev.settings.allowed_locations];
            nextLocs[pickerModal.index] = {
                ...nextLocs[pickerModal.index],
                latitude: locationData.lat,
                longitude: locationData.lng,
                radius_meters: locationData.radius_meters
            };
            return { ...prev, settings: { ...prev.settings, allowed_locations: nextLocs } };
        });
        setPickerModal({ open: false, index: -1 });
    };

    const handleDirectorySelect = (index, loc) => {
        setForm(prev => {
            const nextLocs = [...prev.settings.allowed_locations];
            nextLocs[index] = { name: loc.name, latitude: loc.latitude, longitude: loc.longitude, radius_meters: loc.radius_meters };
            return { ...prev, settings: { ...prev.settings, allowed_locations: nextLocs } };
        });
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
                <div className="cm-overview-card"><span>Total Organizations</span><strong>{companies.length}</strong></div>
                <div className="cm-overview-card"><span>Total Assigned Users</span><strong>{totalAssignedUsers}</strong></div>
                <div className="cm-overview-card"><span>Total Branches Linked</span><strong>{companies.reduce((acc, c) => acc + (c.branch_ids?.length || 0), 0)}</strong></div>
            </div>

            <div className="cm-toolbar">
                <div className="cm-search-wrap">
                    <FiSearch size={15} />
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by organization name or code" />
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
                        key={c._id} company={c} users={getCompanyUsers(c._id)}
                        expanded={expandedCompany === c._id}
                        onToggleExpand={(id) => setExpandedCompany(expandedCompany === id ? null : id)}
                        onEdit={openModal.bind(null, 'edit')}
                        onDelete={handleDelete}
                        onMigrateUser={(user) => setMigrationModal({ open: true, user })}
                        onViewHistory={async (comp) => {
                            setHistoryModal({ open: true, company: comp, logs: [], loading: true });
                            try {
                                const res = await masterAPI.getOrganizationMigrationHistory(comp._id);
                                setHistoryModal(prev => ({ ...prev, logs: res?.data || [], loading: false }));
                            } catch (err) {
                                toast.error("Failed to fetch migration history");
                                setHistoryModal(prev => ({ ...prev, loading: false }));
                            }
                        }}
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
                            <button className="cm-modal-close" onClick={() => setModal({ open: false })}><FiX size={18} /></button>
                        </div>
                        <form onSubmit={handleSave} className="cm-modal-form-layout">
                            {/* Sidebar */}
                            <div className="cm-modal-sidebar">
                                <div className="cm-modal-sidebar-header"><FiSettings size={13} /><span>Settings</span></div>
                                <div className="cm-modal-tabs-vertical">
                                    {[
                                        { key: 'basic', icon: <FiSettings size={16} />, label: 'Basic info', sub: 'General details' },
                                        { key: 'users', icon: <FiUserPlus size={16} />, label: 'User assignment', sub: 'Manage members' },
                                        { key: 'attendance', icon: <FiGlobe size={16} />, label: 'Attendance & security', sub: 'Geofencing & punch' },
                                    ].map(tab => (
                                        <button key={tab.key} type="button"
                                            className={`cm-tab-btn-v ${activeTab === tab.key ? 'active' : ''}`}
                                            onClick={() => setActiveTab(tab.key)}>
                                            <div className="cm-tab-icon">{tab.icon}</div>
                                            <div className="cm-tab-text"><strong>{tab.label}</strong><span>{tab.sub}</span></div>
                                        </button>
                                    ))}
                                </div>
                                <div className="cm-sidebar-footer"><p>Organization Management System v1.0</p></div>
                            </div>

                            {/* Content */}
                            <div className="cm-modal-content-wrapper">
                                <div className="cm-modal-body">

                                    {/* Basic Info Tab */}
                                    {activeTab === 'basic' && (
                                        <div className="cm-tab-content">
                                            <div className="cm-modal-grid">
                                                <div className="cm-modal-column">
                                                    <div className="cm-form-group">
                                                        <label>Company Name</label>
                                                        <input type="text" value={form.company_name}
                                                            onChange={e => setForm({ ...form, company_name: e.target.value })}
                                                            placeholder="e.g. Acme Corporation" required />
                                                    </div>
                                                    <div className="cm-form-group">
                                                        <label>Company Code</label>
                                                        <input type="text" value={form.company_code}
                                                            onChange={e => setForm({ ...form, company_code: e.target.value.toUpperCase() })}
                                                            placeholder="e.g. ACME_IND" required />
                                                    </div>
                                                </div>
                                                <div className="cm-modal-column">
                                                    <div className="cm-form-group">
                                                        <label>Shift Policy</label>
                                                        <select value={form.shift_policy_id}
                                                            onChange={e => setForm({ ...form, shift_policy_id: e.target.value })} required>
                                                            <option value="">Select a Shift Policy...</option>
                                                            {shifts.map(s => (
                                                                <option key={s._id} value={s._id}>{s.shift_name} ({s.shift_code})</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="cm-divider" />
                                            <div className="cm-form-group">
                                                <label style={{ marginBottom: '16px', display: 'block' }}>Branch Linkage</label>
                                                <div className="cm-branch-grid-new">
                                                    {branches.map((branch) => (
                                                        <div key={branch._id}
                                                            className={`cm-branch-selectable ${form.branch_ids.includes(branch._id) ? 'selected' : ''}`}
                                                            onClick={() => toggleBranchSelection(branch._id)}>
                                                            <div className="cm-branch-check">
                                                                {form.branch_ids.includes(branch._id) ? <FiCheck size={12} /> : null}
                                                            </div>
                                                            <div className="cm-branch-info">
                                                                <span className="cm-b-code">{branch.branch_code}</span>
                                                                <span className="cm-b-name">{branch.branch_name}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Users Tab */}
                                    {activeTab === 'users' && (
                                        <div className="cm-tab-content">
                                            <div className="cm-user-mgmt-layout">
                                                <div className="cm-user-stats">
                                                    <div className="cm-u-stat">
                                                        <span>Current Members</span>
                                                        <strong>{form.selected_user_ids.length}</strong>
                                                    </div>
                                                </div>
                                                <div className="cm-selection-grid-modern">
                                                    {assignableUsers.filter(u => form.selected_user_ids.includes(u._id)).map((user) => (
                                                        <div key={user._id} className="cm-user-card-static">
                                                            <div className="cm-u-avatar-sm">{user.first_name?.[0]}{user.last_name?.[0]}</div>
                                                            <div className="cm-u-details">
                                                                <strong>{user.first_name} {user.last_name}</strong>
                                                                <span>{user.employee_code || 'No code'}</span>
                                                            </div>
                                                            <button type="button" className="cm-user-migrate-btn"
                                                                onClick={() => setMigrationModal({ open: true, user })}>
                                                                Migrate
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                {form.selected_user_ids.length === 0 && (
                                                    <div className="cm-empty-state">
                                                        <p>No users are currently assigned to this organization.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Attendance & Security Tab */}
                                    {activeTab === 'attendance' && (
                                        <div className="cm-tab-content">
                                            {/* Geofencing Toggle */}
                                            <div className="cm-geo-toggle-row">
                                                <div className="cm-geo-toggle-info">
                                                    <div className="cm-geo-toggle-icon"><FiShield size={14} /></div>
                                                    <div>
                                                        <strong>Geofencing enforcement</strong>
                                                        <span>Force members to punch from whitelisted locations only</span>
                                                    </div>
                                                </div>
                                                <div className="cm-switch-wrap">
                                                    <input type="checkbox" id="geo_fencing_enabled"
                                                        checked={form.settings.geo_fencing_enabled}
                                                        onChange={e => setForm({ ...form, settings: { ...form.settings, geo_fencing_enabled: e.target.checked } })} />
                                                    <label htmlFor="geo_fencing_enabled"></label>
                                                </div>
                                            </div>

                                            {/* Locations Table */}
                                            {form.settings.geo_fencing_enabled && (
                                                <div className="cm-loc-table-wrap">
                                                    <div className="cm-loc-table-toolbar">
                                                        <span className="cm-loc-table-count">
                                                            {form.settings.allowed_locations?.length || 0} location{form.settings.allowed_locations?.length !== 1 ? 's' : ''}
                                                        </span>
                                                        <button type="button" className="cm-loc-add-btn" onClick={addLocation}>
                                                            <FiPlus size={11} /> Add location
                                                        </button>
                                                    </div>

                                                    {(!form.settings.allowed_locations || form.settings.allowed_locations.length === 0) ? (
                                                        <div className="cm-loc-empty">
                                                            <FiMapPin size={20} />
                                                            <p>No locations added yet.</p>
                                                        </div>
                                                    ) : (
                                                        <table className="cm-loc-tbl">
                                                            <thead>
                                                                <tr>
                                                                    <th className="cm-lth-num">#</th>
                                                                    <th className="cm-lth-dir">Directory</th>
                                                                    <th className="cm-lth-name">Name</th>
                                                                    <th className="cm-lth-lat">Latitude</th>
                                                                    <th className="cm-lth-lng">Longitude</th>
                                                                    <th className="cm-lth-rad">Radius (m)</th>
                                                                    <th className="cm-lth-act"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {form.settings.allowed_locations.map((loc, index) => (
                                                                    <tr key={index} className="cm-loc-tbl-row">
                                                                        <td className="cm-lth-num">
                                                                            <span className="cm-loc-row-num">{index + 1}</span>
                                                                        </td>
                                                                        <td className="cm-lth-dir">
                                                                            <LocationDirectorySelect
                                                                                currentName={loc.name}
                                                                                onSelect={(l) => handleDirectorySelect(index, l)}
                                                                                className="cm-loc-dir-select"
                                                                            />
                                                                        </td>
                                                                        <td className="cm-lth-name">
                                                                            <input className="cm-loc-tbl-inp" type="text" value={loc.name}
                                                                                placeholder="Custom name"
                                                                                onChange={e => updateLocationField(index, 'name', e.target.value)} />
                                                                        </td>
                                                                        <td className="cm-lth-lat">
                                                                            <div className="cm-loc-lat-cell">
                                                                                <input className="cm-loc-tbl-inp" type="number" step="0.0000001"
                                                                                    value={loc.latitude}
                                                                                    onChange={e => updateLocationField(index, 'latitude', parseFloat(e.target.value))} />
                                                                                <button type="button" className="cm-loc-map-btn"
                                                                                    title="Pick on map"
                                                                                    onClick={() => setPickerModal({ open: true, index })}>
                                                                                    <FiMap size={11} />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                        <td className="cm-lth-lng">
                                                                            <input className="cm-loc-tbl-inp" type="number" step="0.0000001"
                                                                                value={loc.longitude}
                                                                                onChange={e => updateLocationField(index, 'longitude', parseFloat(e.target.value))} />
                                                                        </td>
                                                                        <td className="cm-lth-rad">
                                                                            <input className="cm-loc-tbl-inp" type="number" min="10"
                                                                                value={loc.radius_meters}
                                                                                onChange={e => updateLocationField(index, 'radius_meters', parseInt(e.target.value))} />
                                                                        </td>
                                                                        <td className="cm-lth-act">
                                                                            <button type="button" className="cm-loc-del-btn"
                                                                                onClick={() => removeLocation(index)}>
                                                                                <FiTrash2 size={13} />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="cm-modal-footer-new">
                                    <button type="button" className="cm-btn-new-outline" onClick={() => setModal({ open: false })}>Discard</button>
                                    <button type="submit" className="cm-btn-new-primary" disabled={saving}>
                                        {saving ? 'Saving...' : 'Save Configuration'}
                                    </button>
                                </div>
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

            {/* History Modal */}
            {historyModal.open && (
                <div className="cm-modal-overlay" onClick={() => setHistoryModal({ open: false })}>
                    <div className="cm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px' }}>
                        <div className="cm-modal-header">
                            <div>
                                <h2 style={{ marginBottom: '4px' }}>Migration History</h2>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Logs for {historyModal.company?.company_name}</p>
                            </div>
                            <button className="cm-modal-close" onClick={() => setHistoryModal({ open: false })}><FiX size={20} /></button>
                        </div>
                        <div className="cm-modal-body">
                            {historyModal.loading ? (
                                <div style={{ padding: '40px', textAlign: 'center' }}>Loading history...</div>
                            ) : historyModal.logs.length === 0 ? (
                                <div className="cm-empty-state">
                                    <h3>No migration logs found</h3>
                                    <p>Users haven't been migrated into or out of this organization yet.</p>
                                </div>
                            ) : (
                                <table className="cm-history-table">
                                    <thead>
                                        <tr>
                                            <th>Employee</th>
                                            <th>Migration Path</th>
                                            <th>Date & Executed By</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historyModal.logs.map(log => (
                                            <tr key={log._id}>
                                                <td>
                                                    <div className="cm-history-employee">
                                                        <strong>{log.employee.name}</strong>
                                                        <span>{log.employee.code}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="cm-history-arrow">
                                                        <span style={{ color: log.source === historyModal.company?.company_name ? '#dc2626' : 'inherit' }}>{log.source}</span>
                                                        <FiArrowRight className="fi-arrow" />
                                                        <span style={{ color: log.destination === historyModal.company?.company_name ? '#16a34a' : 'inherit', fontWeight: log.destination === historyModal.company?.company_name ? 600 : 400 }}>{log.destination}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="cm-history-date">{new Date(log.migratedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                                    <div className="cm-history-actor">By {log.migratedBy.name}</div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="cm-modal-footer">
                            <button className="cm-btn cm-btn-secondary" onClick={() => setHistoryModal({ open: false })}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Location Picker Modal */}
            <LocationPickerModal
                isOpen={pickerModal.open}
                onClose={() => setPickerModal({ open: false, index: -1 })}
                onConfirm={handleMapConfirm}
                initialLocation={
                    pickerModal.index !== -1 && form.settings.allowed_locations[pickerModal.index]?.latitude
                        ? { lat: form.settings.allowed_locations[pickerModal.index].latitude, lng: form.settings.allowed_locations[pickerModal.index].longitude }
                        : null
                }
            />
        </div>
    );
};

export default CompanyManagement;