import React, { useState, useEffect, useContext } from 'react';
import { Modal } from 'antd';
import { FiPlus, FiArrowLeft, FiEdit2, FiTrash2, FiChevronDown, FiChevronUp, FiSave, FiX, FiList, FiSettings, FiCheck, FiMinus, FiFileText, FiShield, FiBriefcase, FiClock, FiUsers, FiAward } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import masterAPI from '../../../api/attendance/master.api';
import toast from 'react-hot-toast';
import EnterpriseTable from '../common/EnterpriseTable';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { UserContext } from '../../../contexts/UserContext';
import './AdminSettings.css';
import './LeavePolicyCards.css';

const LEAVE_TYPES = [

    { value: 'privilege', label: 'Privilege Leave', code: 'PL' },

    { value: 'lwp', label: 'Unpaid Leave (LWP)', code: 'LWP' }
];

const EMPLOYMENT_TYPES = ['full_time', 'permanent', 'probation', 'contract', 'intern', 'part_time'];

/* -- Leave type emoji + color class -- */
const POLICY_CONFIG = {
    casual: { emoji: '🍃', cls: 'casual', label: 'Casual' },
    sick: { emoji: '🤒', cls: 'sick', label: 'Sick' },
    earned: { emoji: '⭐', cls: 'earned', label: 'Earned' },
    privilege: { emoji: '🎖️', cls: 'earned', label: 'Privilege' },
    maternity: { emoji: '🍼', cls: 'maternity', label: 'Maternity' },
    paternity: { emoji: '🍼', cls: 'maternity', label: 'Paternity' },
    compensatory: { emoji: '🎁', cls: 'compoff', label: 'Comp Off' },
    unpaid: { emoji: '⏳', cls: 'unpaid', label: 'Unpaid' },
};
const getPolicyCfg = (leaveType = '') => {
    const key = Object.keys(POLICY_CONFIG).find(k => leaveType.toLowerCase().includes(k));
    return POLICY_CONFIG[key] || { emoji: '📝', cls: 'default', label: leaveType };
};

const formatActor = (actor) => {
    if (!actor) return 'Unknown';
    if (typeof actor === 'string') return actor;
    const fullName = `${actor.first_name || ''} ${actor.last_name || ''}`.trim();
    return fullName || actor.username || 'Unknown';
};

/* -- Read-only Policy Card -- */
const PolicyCard = ({ policy }) => {
    const cfg = getPolicyCfg(policy.leave_type);
    const rules = policy.rules || {};
    const elig = policy.eligibility || {};
    const cf = policy.carry_forward || {};
    const acc = policy.accrual || {};

    const ruleChips = [
        { emoji: '📏', val: `${rules.max_days_per_application ?? '-'} days`, lbl: 'Max per App' },
        { emoji: '🕒', val: `${rules.advance_notice_days ?? '-'} days`, lbl: 'Advance Notice' },
        { emoji: '🖇️', val: `${rules.min_days_per_application ?? '-'} day`, lbl: 'Minimum Days' },
        { emoji: '⛓️', val: `${rules.max_consecutive_days ?? '-'} days`, lbl: 'Max Consecutive' },
    ];

    const flags = [
        { val: rules.half_day_allowed, label: 'Half Day' },
        { val: rules.can_apply_on_probation, label: 'On Probation' },
        { val: rules.backdated_allowed, label: 'Backdated' },
        { val: rules.sandwich_rule_enabled, label: 'Sandwich Rule' },
        { val: rules.requires_document, label: 'Doc Required' },
    ];

    return (
        <div className="lpc-card">
            <div className={`lpc-stripe lpc-stripe-${cfg.cls}`} />
            <div className="lpc-head">
                <div className={`lpc-emoji-box lpc-ebox-${cfg.cls}`}>{cfg.emoji}</div>
                <div className="lpc-head-info">
                    <div className="lpc-name">{policy.policy_name}</div>
                    <div className="lpc-badges">
                        <span className={`lpc-type-badge lpc-badge-${cfg.cls}`}>
                            <span className="lpc-dot" />{cfg.label}
                        </span>
                        <span className="lpc-code">{policy.leave_code}</span>
                    </div>
                </div>
                <span className="lpc-quota">💰 {policy.leave_type === 'lwp' ? 'Unlimited' : `${policy.annual_quota} days`}</span>
            </div>
            <div className="lpc-body">
                <div className="lpc-sec-title"><FiClock size={10} /> Application Rules</div>
                <div className="lpc-rules-grid">
                    {ruleChips.map((c, i) => (
                        <div key={i} className="lpc-chip">
                            <span className="lpc-chip-emoji">{c.emoji}</span>
                            <div>
                                <div className="lpc-chip-val">{c.val}</div>
                                <div className="lpc-chip-lbl">{c.lbl}</div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="lpc-sec-title"><FiCheck size={10} /> Features</div>
                <div className="lpc-flags">
                    {flags.map((f, i) => (
                        <span key={i} className={`lpc-flag ${f.val ? 'yes' : 'no'}`}>
                            {f.val ? '✓' : '✗'} {f.label}
                        </span>
                    ))}
                </div>
                {elig.employment_types?.length > 0 && (
                    <>
                        <div className="lpc-sec-title"><FiUsers size={10} /> Eligible For</div>
                        <div className="lpc-elig">
                            {elig.employment_types.map((et, i) => (
                                <span key={i} className="lpc-elig-tag">👤 {et}</span>
                            ))}
                            {elig.gender && (
                                <span className="lpc-elig-tag">
                                    {elig.gender === 'female' ? '👩' : '👨'} {elig.gender} only
                                </span>
                            )}
                            {elig.min_service_months > 0 && (
                                <span className="lpc-elig-tag">⏳ {elig.min_service_months}m service</span>
                            )}
                        </div>
                    </>
                )}
                <div className="lpc-footer">
                    <div className="lpc-foot-item">
                        <span className="lpc-foot-val">{cf.allowed ? `${cf.max_days || 0} days` : '-'}</span>
                        <span className="lpc-foot-lbl">🔄 Carry Forward</span>
                    </div>
                    <div className="lpc-foot-item">
                        <span className="lpc-foot-val">{cf.encashment_allowed ? `${cf.encashment_percentage || 0}%` : '-'}</span>
                        <span className="lpc-foot-lbl">💵 Encashment</span>
                    </div>
                    <div className="lpc-foot-item">
                        <span className="lpc-foot-val" style={{ textTransform: 'capitalize' }}>{acc.accrual_type || 'Yearly'}</span>
                        <span className="lpc-foot-lbl">📈 Accrual</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const emptyForm = {
    policy_name: '',
    leave_type: 'casual',
    leave_code: 'CL',
    annual_quota: 12,

    eligibility: {
        employment_types: ['permanent', 'probation', 'contract'],
        min_service_months: 0,
        gender: '',
        departments: []
    },

    accrual: {
        accrual_type: 'yearly',
        accrual_rate: 1,
        accrual_start_date: 'calendar_year'
    },

    carry_forward: {
        allowed: false,
        max_days: 0,
        encashment_allowed: false,
        encashment_percentage: 0
    },

    rules: {
        min_days_per_application: 1,
        max_days_per_application: 10,
        max_consecutive_days: 10,
        min_gap_between_applications: 0,
        advance_notice_days: 1,
        backdated_allowed: false,
        backdated_max_days: 0,
        sandwich_rule_enabled: false,
        requires_document: false,
        document_required_after_days: 0,
        clubbing_allowed_with: [],
        half_day_allowed: true,
        can_apply_on_probation: true
    },

    approval_workflow: {
        levels: [{ level: 1, approver_role: 'HOD', is_mandatory: true }],
        auto_approve_if_balance: false
    },

    deduction_rules: {
        deduct_from_salary: false,
        affects_attendance_percentage: true,
        counted_as_absence: false
    },

    status: 'active'
};

const LeavePolicyManagement = ({ embedded = false, readOnly = false }) => {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [logsOpen, setLogsOpen] = useState(false);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsRows, setLogsRows] = useState([]);

    // For read-only card view (employee/HOD)
    const [policies, setPolicies] = useState([]);
    const [cardLoading, setCardLoading] = useState(false);
    const [typeFilter, setTypeFilter] = useState('all');

    useEffect(() => {
        if (readOnly) fetchCardsData();
    }, [readOnly, refreshKey]);

    const fetchCardsData = async () => {
        try {
            setCardLoading(true);
            const res = await masterAPI.getLeavePolicies({ limit: 100 });
            setPolicies(res?.data || []);
        } catch { toast.error('Failed to load leave policies'); }
        finally { setCardLoading(false); }
    };

    const handleLeaveTypeChange = (leaveType) => {
        const selected = LEAVE_TYPES.find(t => t.value === leaveType);
        setFormData({
            ...formData,
            leave_type: leaveType,
            leave_code: selected?.code || leaveType.toUpperCase().slice(0, 2)
        });
    };

    const updateNestedField = (section, field, value) => {
        setFormData({
            ...formData,
            [section]: {
                ...formData[section],
                [field]: value
            }
        });
    };

    const toggleArrayField = (section, field, value) => {
        const current = formData[section][field] || [];
        const updated = current.includes(value)
            ? current.filter(v => v !== value)
            : [...current, value];
        updateNestedField(section, field, updated);
    };

    const isOwnerOrUnowned = (policy) => {
        const creatorId = policy?.created_by?._id || policy?.created_by;
        const userId = user?._id?._id || user?._id;
        return !creatorId || String(creatorId) === String(userId);
    };

    const columns = [
        {
            label: 'Policy Name',
            key: 'policy_name',
            sortable: true,
            render: (val, row) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--as-t1)', fontSize: '.9375rem' }}>{val}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                            fontSize: '.625rem',
                            fontWeight: 800,
                            fontFamily: 'var(--as-mono)',
                            color: 'var(--as-t4)',
                            background: 'var(--as-s2)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            border: '1px solid var(--as-border2)'
                        }}>{row.leave_code}</span>
                        <span style={{ fontSize: '.6875rem', color: 'var(--as-t3)' }}>{getPolicyCfg(row.leave_type).label}</span>
                    </div>
                    <div style={{ fontSize: '.6875rem', color: 'var(--as-t3)' }}>
                        Created by: {formatActor(row.created_by)}
                    </div>
                </div>
            )
        },
        {
            label: 'Annual Quota',
            key: 'annual_quota',
            sortable: true,
            render: (val, row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: 'var(--as-s2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1rem'
                    }}>
                        {getPolicyCfg(row.leave_type).emoji}
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, color: 'var(--as-t1)', fontSize: '1rem' }}>
                            {row.leave_type === 'lwp' ? '0' : val}
                        </div>
                        <div style={{ fontSize: '.625rem', color: 'var(--as-t4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.4px' }}>
                            Days / Year
                        </div>
                    </div>
                </div>
            )
        },
        {
            label: 'Eligibility',
            render: (_, row) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {row.eligibility?.employment_types?.slice(0, 2).map((t, i) => (
                            <Badge key={i} variant="neutral" style={{ fontSize: '.625rem' }}>{t.replace('_', ' ')}</Badge>
                        )) || <Badge variant="neutral">All Types</Badge>}
                        {row.eligibility?.employment_types?.length > 2 && <span style={{ fontSize: '.625rem', color: 'var(--as-t4)' }}>+{row.eligibility.employment_types.length - 2} more</span>}
                    </div>
                    {row.eligibility?.gender && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '.6875rem', color: 'var(--as-amber)', fontWeight: 600 }}>
                            {row.eligibility.gender === 'female' ? '👩' : '👨'} {row.eligibility.gender} Only
                        </div>
                    )}
                </div>
            )
        },
        {
            label: 'Core Rules',
            render: (_, row) => (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '.75rem' }}>
                    <div style={{ color: 'var(--as-t3)' }}>
                        Notice: <span style={{ fontWeight: 700, color: 'var(--as-t1)' }}>{row.rules?.advance_notice_days}d</span>
                    </div>
                    <div style={{ color: 'var(--as-t3)' }}>
                        Max/App: <span style={{ fontWeight: 700, color: 'var(--as-t1)' }}>{row.rules?.max_days_per_application}d</span>
                    </div>
                    <div style={{ color: 'var(--as-t3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Half-Day: {row.rules?.half_day_allowed ?
                            <span style={{ color: 'var(--as-green)', fontWeight: 800 }}>YES</span> :
                            <span style={{ color: 'var(--as-t5)' }}>NO</span>}
                    </div>
                    <div style={{ color: 'var(--as-t3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Carry: {row.carry_forward?.allowed ?
                            <span style={{ color: 'var(--as-blue)', fontWeight: 800 }}>YES</span> :
                            <span style={{ color: 'var(--as-t5)' }}>NO</span>}
                    </div>
                </div>
            )
        },
        ...(!readOnly ? [{
            label: 'Actions',
            width: '80px',
            render: (_, row) => (
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn-icon" onClick={() => handleEdit(row)} title={isOwnerOrUnowned(row) ? 'Edit' : 'Only creator can edit'} disabled={!isOwnerOrUnowned(row)}>
                        <FiEdit2 size={13} />
                    </button>
                    <button className="btn-icon danger" onClick={() => handleDelete(row._id)} title={isOwnerOrUnowned(row) ? 'Delete' : 'Only creator can delete'} disabled={!isOwnerOrUnowned(row)}>
                        <FiTrash2 size={13} />
                    </button>
                </div>
            )
        }] : [])
    ];

    const fetchPolicies = async (params) => {
        return await masterAPI.getLeavePolicies(params);
    };

    const fetchLeaveLogs = async () => {
        try {
            setLogsLoading(true);
            const hres = await masterAPI.getPolicyHistory({
                limit: 100,
                policy_type: 'leave',
                include_approvals: false
            });
            setLogsRows(hres?.data || []);
        } catch (err) {
            toast.error('Failed to load logs');
        } finally {
            setLogsLoading(false);
        }
    };

    const handleEdit = async (policy) => {
        setEditingId(policy._id);
        setShowForm(true);
        setFormData({
            ...emptyForm,
            ...policy,
            eligibility: { ...emptyForm.eligibility, ...policy.eligibility },
            accrual: { ...emptyForm.accrual, ...policy.accrual },
            carry_forward: { ...emptyForm.carry_forward, ...policy.carry_forward },
            rules: { ...emptyForm.rules, ...policy.rules },
            approval_workflow: { ...emptyForm.approval_workflow, ...policy.approval_workflow },
            deduction_rules: { ...emptyForm.deduction_rules, ...policy.deduction_rules }
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = (id) => {
        Modal.confirm({
            title: 'Delete Leave Policy',
            content: 'Are you sure you want to delete this leave policy? This action cannot be undone.',
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await masterAPI.deleteLeavePolicy(id);
                    toast.success('Leave policy deleted');
                    setRefreshKey(k => k + 1);
                } catch (err) {
                    toast.error(err.message || 'Failed to delete');
                }
            }
        });
    };

    const handleSubmit = async () => {
        if (!formData.policy_name || !formData.leave_code) {
            toast.error('Policy Name and Code are required');
            return;
        }
        try {
            if (editingId) {
                await masterAPI.updateLeavePolicy(editingId, formData);
                toast.success('Leave policy updated successfully');
            } else {
                await masterAPI.createLeavePolicy(formData);
                toast.success('Leave policy created successfully');
            }
            handleCancel();
            setRefreshKey(k => k + 1);
        } catch (err) {
            toast.error(err.message || 'Failed to save policy');
        }
    };

    const handleCancel = () => {
        setFormData(emptyForm);
        setEditingId(null);
        setShowForm(false);
        setShowAdvanced(false);
    };

    return (
        <div className={embedded ? "" : "settings-container"}>
            {!embedded && (
                <div className="settings-header">
                    <div className="settings-header-content">
                        <h2>Leave Policy Management</h2>
                        <p>Configure leave types, quotas, eligibility, and application rules for your company.</p>
                    </div>
                    <div className="settings-header-actions" style={{ display: 'flex', gap: '1rem' }}>
                        {!readOnly && (
                            <button className="btn btn-outline" onClick={() => { setLogsOpen(true); fetchLeaveLogs(); }}>
                                <FiList size={18} /> Logs
                            </button>
                        )}
                        {!readOnly && (
                            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                                {showForm ? <><FiMinus size={18} /> Cancel</> : <><FiPlus size={18} /> New Policy</>}
                            </button>
                        )}
                        <button className="btn btn-outline" onClick={() => navigate('/')}>
                            <FiArrowLeft size={18} />
                            Back
                        </button>
                    </div>
                </div>
            )}

            <Modal
                title="Leave Policy Logs"
                open={logsOpen}
                onCancel={() => setLogsOpen(false)}
                footer={null}
                width={860}
            >
                {logsLoading ? (
                    <div style={{ padding: '16px', color: '#64748b' }}>Loading logs...</div>
                ) : logsRows.length === 0 ? (
                    <div style={{ padding: '16px', color: '#94a3b8' }}>No logs found.</div>
                ) : (
                    <div style={{ maxHeight: '460px', overflowY: 'auto', display: 'grid', gap: '10px' }}>
                        {logsRows.map((row) => {
                            const actionLabel = (row.action || '').replaceAll('_', ' ');
                            const isDelete = actionLabel.includes('DELETE');
                            const isCreate = actionLabel.includes('CREATE');
                            const badgeStyle = isDelete
                                ? { color: '#b91c1c', background: '#fee2e2' }
                                : isCreate
                                    ? { color: '#166534', background: '#dcfce7' }
                                    : { color: '#1e3a8a', background: '#dbeafe' };
                            return (
                                <div key={row.id} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px', background: '#f8fafc' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.3px', padding: '3px 8px', borderRadius: '999px', ...badgeStyle }}>
                                            {actionLabel}
                                        </span>
                                        <span style={{ fontSize: '11px', color: '#64748b' }}>{new Date(row.timestamp).toLocaleString()}</span>
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>{row.details || '-'}</div>
                                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#475569' }}>
                                        By {row.actor_name || 'Unknown'} ({row.actor_role || 'N/A'})
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Modal>

            {/* Embedded mode add button */}
            {embedded && !readOnly && !showForm && (
                <div style={{ marginBottom: '1rem' }}>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        <FiPlus size={18} /> Add New Policy
                    </button>
                </div>
            )}

            {(showForm || editingId) ? (
                <div className="modern-setting-form animation-slide-down">
                    <div className="modern-form-header">
                        <FiFileText size={20} color="var(--color-primary)" />
                        <h3>{editingId ? 'Edit Leave Policy' : 'Create New Leave Policy'}</h3>
                        <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }} onClick={handleCancel}>
                            <FiX size={24} />
                        </button>
                    </div>

                    <div className="modern-form-body">

                        {/* Section 1: Basic Information */}
                        <div className="modern-section">
                            <h4 className="modern-section-title"><FiBriefcase /> Basic Details</h4>
                            <div className="modern-grid">
                                <div className="form-group">
                                    <label>Policy Name <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. Annual Casual"
                                        value={formData.policy_name}
                                        onChange={e => setFormData({ ...formData, policy_name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Leave Type <span className="required">*</span></label>
                                    <select
                                        className="form-select"
                                        value={formData.leave_type}
                                        onChange={e => handleLeaveTypeChange(e.target.value)}
                                    >
                                        {LEAVE_TYPES.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Leave Code <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. CL"
                                        value={formData.leave_code}
                                        onChange={e => setFormData({ ...formData, leave_code: e.target.value.toUpperCase() })}
                                        maxLength={4}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Annual Quota (Days) <span className="required">*</span></label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.annual_quota}
                                        onChange={e => setFormData({ ...formData, annual_quota: parseInt(e.target.value) || 0 })}
                                        min={0}
                                        disabled={formData.leave_type === 'lwp'}
                                    />
                                    {formData.leave_type === 'lwp' && <div style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--color-primary)' }}>LWP is always unlimited</div>}
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Eligibility Criteria */}
                        <div className="modern-section">
                            <h4 className="modern-section-title"><FiShield /> Eligibility & Access</h4>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label>Employment Types</label>
                                <div className="checkbox-group" style={{ marginTop: '0.5rem' }}>
                                    {EMPLOYMENT_TYPES.map(type => {
                                        const label = type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                        return (
                                            <div
                                                key={type}
                                                className={`modern-day-pill ${formData.eligibility.employment_types?.includes(type) ? 'active' : ''}`}
                                                onClick={() => toggleArrayField('eligibility', 'employment_types', type)}
                                            >
                                                {label}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="modern-grid">
                                <div className="form-group">
                                    <label>Minimum Service (Months)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={formData.eligibility.min_service_months}
                                        onChange={e => updateNestedField('eligibility', 'min_service_months', parseInt(e.target.value) || 0)}
                                        min={0}
                                    />
                                    <div style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--text-tertiary)' }}>0 means available upon joining</div>
                                </div>
                                <div className="form-group">
                                    <label>Gender Restriction</label>
                                    <select
                                        className="form-select"
                                        value={formData.eligibility.gender || ''}
                                        onChange={e => updateNestedField('eligibility', 'gender', e.target.value)}
                                    >
                                        <option value="">All Genders</option>
                                        <option value="male">Male Only</option>
                                        <option value="female">Female Only</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Core Application Rules */}
                        <div className="modern-section">
                            <h4 className="modern-section-title"><FiCheck /> Base Rules</h4>
                            <div className="modern-grid modern-grid-4">
                                <div className="form-group">
                                    <label>Min Days / App</label>
                                    <input type="number" className="form-input" value={formData.rules.min_days_per_application} onChange={e => updateNestedField('rules', 'min_days_per_application', parseInt(e.target.value) || 1)} step={0.5} />
                                </div>
                                <div className="form-group">
                                    <label>Max Days / App</label>
                                    <input type="number" className="form-input" value={formData.rules.max_days_per_application} onChange={e => updateNestedField('rules', 'max_days_per_application', parseInt(e.target.value) || 10)} min={1} />
                                </div>
                                <div className="form-group">
                                    <label>Max Consecutive</label>
                                    <input type="number" className="form-input" value={formData.rules.max_consecutive_days || ''} onChange={e => updateNestedField('rules', 'max_consecutive_days', parseInt(e.target.value) || 0)} min={1} />
                                </div>
                                <div className="form-group">
                                    <label>Advance Notice</label>
                                    <input type="number" className="form-input" value={formData.rules.advance_notice_days} onChange={e => updateNestedField('rules', 'advance_notice_days', parseInt(e.target.value) || 0)} min={0} />
                                </div>
                            </div>

                            {/* Inline Rules Toggle Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
                                <label className="checkbox-label">
                                    <input type="checkbox" checked={formData.rules.half_day_allowed} onChange={e => updateNestedField('rules', 'half_day_allowed', e.target.checked)} />
                                    <span>Half Day Allowed</span>
                                </label>
                                <label className="checkbox-label">
                                    <input type="checkbox" checked={formData.rules.can_apply_on_probation} onChange={e => updateNestedField('rules', 'can_apply_on_probation', e.target.checked)} />
                                    <span>Allowed During Probation</span>
                                </label>
                                <label className="checkbox-label">
                                    <input type="checkbox" checked={formData.rules.backdated_allowed} onChange={e => updateNestedField('rules', 'backdated_allowed', e.target.checked)} />
                                    <span>Backdated Allowed</span>
                                </label>
                                <label className="checkbox-label">
                                    <input type="checkbox" checked={formData.rules.sandwich_rule_enabled} onChange={e => updateNestedField('rules', 'sandwich_rule_enabled', e.target.checked)} />
                                    <span>Sandwich Rule Enabled</span>
                                </label>
                            </div>
                        </div>

                        {/* Collapsible Advanced Settings */}
                        <div className="modern-section" style={{ padding: 0, overflow: 'hidden' }}>
                            <div
                                style={{ background: showAdvanced ? '#f8fafc' : 'transparent', padding: '1.25rem 1.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                onClick={() => setShowAdvanced(!showAdvanced)}
                            >
                                <h4 style={{ margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155' }}>
                                    <FiSettings size={16} /> Advanced Rules (Accruals, Logic, Documents)
                                </h4>
                                {showAdvanced ? <FiChevronUp /> : <FiChevronDown />}
                            </div>

                            {showAdvanced && (
                                <div style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0', background: '#fafafa' }} className="animation-slide-down">

                                    <div style={{ marginBottom: '2rem' }}>
                                        <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '1rem', textTransform: 'uppercase' }}>1. Accrual Setup</h5>
                                        <div className="modern-grid">
                                            <div className="form-group">
                                                <label>Accrual Frequency</label>
                                                <select className="form-select" value={formData.accrual.accrual_type} onChange={e => updateNestedField('accrual', 'accrual_type', e.target.value)}>
                                                    <option value="yearly">Yearly (Lump Sum)</option>
                                                    <option value="monthly">Monthly</option>
                                                    <option value="quarterly">Quarterly</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label>Accrual Rate</label>
                                                <input type="number" className="form-input" value={formData.accrual.accrual_rate} onChange={e => updateNestedField('accrual', 'accrual_rate', parseFloat(e.target.value) || 1)} step={0.1} />
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '2rem' }}>
                                        <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '1rem', textTransform: 'uppercase' }}>2. Carry Forward Mechanics</h5>
                                        <div className="modern-grid">
                                            <div className="form-group">
                                                <label className="checkbox-label" style={{ marginBottom: '0.75rem' }}>
                                                    <input type="checkbox" checked={formData.carry_forward.allowed} onChange={e => updateNestedField('carry_forward', 'allowed', e.target.checked)} />
                                                    <span>Enable Carry Forward</span>
                                                </label>
                                                <input disabled={!formData.carry_forward.allowed} type="number" className="form-input" placeholder="Max Carry Days" value={formData.carry_forward.max_days} onChange={e => updateNestedField('carry_forward', 'max_days', parseInt(e.target.value) || 0)} />
                                            </div>
                                            <div className="form-group">
                                                <label className="checkbox-label" style={{ marginBottom: '0.75rem' }}>
                                                    <input type="checkbox" checked={formData.carry_forward.encashment_allowed} onChange={e => updateNestedField('carry_forward', 'encashment_allowed', e.target.checked)} />
                                                    <span>Enable Encashment</span>
                                                </label>
                                                <input disabled={!formData.carry_forward.encashment_allowed} type="number" className="form-input" placeholder="Encashment % limit" value={formData.carry_forward.encashment_percentage} onChange={e => updateNestedField('carry_forward', 'encashment_percentage', parseInt(e.target.value) || 0)} min={0} max={100} />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginBottom: '1rem', textTransform: 'uppercase' }}>3. Payroll Logic & Documents</h5>
                                        <div style={{ display: 'grid', gap: '1rem' }}>
                                            <label className="checkbox-label">
                                                <input type="checkbox" checked={formData.deduction_rules.deduct_from_salary} onChange={e => updateNestedField('deduction_rules', 'deduct_from_salary', e.target.checked)} />
                                                <span>Deduct from Employee Salary (Loss of Pay)</span>
                                            </label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <label className="checkbox-label">
                                                    <input type="checkbox" checked={formData.rules.requires_document} onChange={e => updateNestedField('rules', 'requires_document', e.target.checked)} />
                                                    <span>Proof Required</span>
                                                </label>
                                                {formData.rules.requires_document && (
                                                    <input type="number" className="form-input" style={{ width: '200px' }} placeholder="Required After (Days)" value={formData.rules.document_required_after_days} onChange={e => updateNestedField('rules', 'document_required_after_days', parseInt(e.target.value) || 0)} />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            )}
                        </div>

                        <div className="form-actions" style={{ borderTop: 'none', marginTop: 0, paddingBottom: 0 }}>
                            <button className="btn btn-outline" onClick={handleCancel}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSubmit}>
                                <FiSave style={{ marginRight: 8 }} />
                                {editingId ? 'Update Policy' : 'Save Leave Type'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                readOnly ? (
                <div className="lpc-page">
                    {/* Summary strip */}
                    <div className="lpc-summary">
                        <div className="lpc-sum-tile">
                            <div className="lpc-sum-emoji">📊</div>
                            <div className="lpc-sum-val">{policies.length}</div>
                            <div className="lpc-sum-lbl">Total Policies</div>
                        </div>
                        <div className="lpc-sum-tile">
                            <div className="lpc-sum-emoji">📅</div>
                            <div className="lpc-sum-val">{policies.reduce((s, p) => s + (p.annual_quota || 0), 0)}</div>
                            <div className="lpc-sum-lbl">Total Days / Year</div>
                        </div>
                        <div className="lpc-sum-tile">
                            <div className="lpc-sum-emoji">🌓</div>
                            <div className="lpc-sum-val">{policies.filter(p => p.rules?.half_day_allowed).length}</div>
                            <div className="lpc-sum-lbl">Half-Day Allowed</div>
                        </div>
                        <div className="lpc-sum-tile">
                            <div className="lpc-sum-emoji">🔄</div>
                            <div className="lpc-sum-val">{policies.filter(p => p.carry_forward?.allowed).length}</div>
                            <div className="lpc-sum-lbl">Carry Forward</div>
                        </div>
                    </div>

                    {/* Filter pills */}
                    <div className="lpc-filter-bar">
                        {[
                            { key: 'all', emoji: '🔍', label: 'All', count: policies.length },
                            ...[...new Set(policies.map(p => p.leave_type))].map(t => ({
                                key: t, emoji: getPolicyCfg(t).emoji,
                                label: getPolicyCfg(t).label,
                                count: policies.filter(p => p.leave_type === t).length,
                            }))
                        ].map(f => (
                            <button
                                key={f.key}
                                className={`lpc-filter-pill ${typeFilter === f.key ? 'active' : ''}`}
                                onClick={() => setTypeFilter(f.key)}
                            >
                                {f.emoji} {f.label}
                                <span className="lpc-pill-count">{f.count}</span>
                            </button>
                        ))}
                    </div>

                    {/* Cards grid */}
                    <div className="lpc-grid">
                        {cardLoading ? (
                            <div className="lpc-load"><div className="lpc-spin" /></div>
                        ) : policies.filter(p => typeFilter === 'all' || p.leave_type === typeFilter).length === 0 ? (
                            <div className="lpc-empty">
                                <div style={{ fontSize: '2.25rem', marginBottom: 6 }}>🏜️</div>
                                <p>No leave policies found.</p>
                            </div>
                        ) : (
                            policies
                                .filter(p => typeFilter === 'all' || p.leave_type === typeFilter)
                                .map((policy, i) => <PolicyCard key={policy._id || i} policy={policy} />)
                        )}
                    </div>
                </div>
            ) : (
                /* -- ADMIN: Enterprise table (unchanged) -- */
                <EnterpriseTable
                    key={refreshKey}
                    title="Active Leave Policies"
                    columns={columns}
                    fetchData={fetchPolicies}
                    searchPlaceholder="Search policies..."
                    selectable={false}
                />
                )
            )}

        </div>
    );
};

export default LeavePolicyManagement;
