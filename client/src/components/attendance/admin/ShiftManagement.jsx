import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiClock, FiTrash2, FiUsers, FiCalendar, FiSettings, FiCheckCircle, FiMinus, FiX, FiEdit2, FiList } from 'react-icons/fi';
import masterAPI from '../../../api/attendance/master.api';
import toast from 'react-hot-toast';
import { Modal } from 'antd';
import EnterpriseTable from '../common/EnterpriseTable';
import Button from '../common/Button';
import Badge from '../common/Badge';
import './AdminSettings.css';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const emptyForm = () => ({
  shift_name: '', shift_code: '', shift_type: 'fixed', status: 'active',
  start_time: '', end_time: '', is_cross_day: false, night_shift: false,
  break_time_minutes: 60, break_included_in_work_hours: false,
  full_day_hours: 8, half_day_hours: 4, minimum_hours: 3,
  late_allowed_minutes: 0, early_leave_allowed_minutes: 0,
  applicability: {
    teams: { all: true, list: [] }
  }
});

const formatActor = (actor) => {
  if (!actor) return 'Unknown';
  if (typeof actor === 'string') return actor;
  const fullName = `${actor.first_name || ''} ${actor.last_name || ''}`.trim();
  return fullName || actor.username || 'Unknown';
};

const ShiftManagement = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [formData, setFormData] = useState(emptyForm());
  const [tableKey, setTableKey] = useState(Date.now());
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsRows, setLogsRows] = useState([]);
  const [logsShiftId, setLogsShiftId] = useState('');
  const [logsShifts, setLogsShifts] = useState([]);

  const columns = [
    {
      label: 'Shift', key: 'shift_name', sortable: true, render: (val, row) =>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--as-t1)' }}>{val}</div>
          <div style={{ fontSize: '.6875rem', fontFamily: 'monospace', color: 'var(--as-t4)' }}>{row.shift_code}</div>
          <div style={{ fontSize: '.6875rem', color: 'var(--as-t3)', marginTop: '2px' }}>
            Created by: {formatActor(row.created_by)}
          </div>
        </div>
    },
    {
      label: 'Timings', render: (_, row) =>
        <span style={{ fontFamily: 'monospace', background: 'var(--as-s2)', padding: '4px 9px', borderRadius: 6, fontSize: '.8rem', color: 'var(--as-t1)', fontWeight: 600 }}>
          {row.start_time || 'N/A'}   {row.end_time || 'N/A'}
        </span>
    },
    { label: 'Full Day Hrs', render: (_, row) => <span style={{ fontSize: '.8125rem', color: 'var(--as-t2)' }}>{row.full_day_hours || 8}h</span> },
    {
      label: 'Applicability', render: (_, row) =>
        <span style={{ fontSize: '.75rem', color: 'var(--as-t3)', maxWidth: 200, display: 'block' }}>
          Global policy
        </span>
    },
    {
      label: 'Actions', render: (_, row) =>
        <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-icon" onClick={() => handleEdit(row)} title="Edit"><FiEdit2 size={13} /></button>
            <button className="btn-icon danger" onClick={() => handleDelete(row._id)} title="Delete"><FiTrash2 size={13} /></button>
        </div>
    },
  ];

  const fetchShifts = async (params) => masterAPI.getShifts({ ...params, company_id: companyId || undefined });

  const fetchShiftLogs = useCallback(async (shiftId = '') => {
    try {
      setLogsLoading(true);
      const [historyRes, shiftsRes] = await Promise.all([
        masterAPI.getPolicyHistory({
          limit: 100,
          policy_type: 'shift',
          policy_id: shiftId || undefined,
          include_approvals: false,
          company_id: companyId || undefined
        }),
        masterAPI.getShifts({
          limit: 200,
          page: 1,
          company_id: companyId || undefined
        })
      ]);
      setLogsRows(historyRes?.data || []);
      setLogsShifts(shiftsRes?.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load logs');
    } finally {
      setLogsLoading(false);
    }
  }, [companyId]);
  
  const handleEdit = (row) => {
    setEditingId(row._id);
    setFormData({
      ...row,
      applicability: {
        teams: {
          all: row.applicability?.teams?.all ?? true,
          list: (row.applicability?.teams?.list || []).map(t => t._id || t)
        }
      }
    });
    setShowForm(true);
  };

  const handleSaveShift = async () => {
    if (!formData.shift_name || !formData.start_time || !formData.end_time) { toast.error('Fill required fields'); return; }
    try {
      const payload = {
        ...formData,
        applicability: { teams: { all: true, list: [] } },
        shift_code: formData.shift_code || formData.shift_name.slice(0, 3).toUpperCase(),
        company_id: companyId || undefined
      };

      if (editingId) {
        await masterAPI.updateShift(editingId, payload);
        toast.success('Shift updated');
      } else {
        await masterAPI.createShift(payload);
        toast.success('Shift created');
      }
      
      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm());
      setTableKey(Date.now());
    } catch (err) { toast.error(err.message || 'Failed'); }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete Shift',
      content: 'Are you sure you want to delete this shift?',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try { 
          await masterAPI.deleteShift(id); 
          toast.success('Deleted'); 
          setTableKey(Date.now());
        } catch (err) { toast.error(err.message || 'Failed'); }
      }
    });
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await masterAPI.getCompanies();
        const list = res?.data || [];
        setCompanies(list);
        if (!companyId && list.length > 0) setCompanyId(list[0]._id);
      } catch {
        // ignore
      }
    })();
  }, [companyId]);

  return (
    <div className="settings-container">
      {/* Hero header */}
      <div className="settings-header">
        <div className="settings-header-content">
          <h2>Shift Management</h2>
          <p>Define reference timings and work-hour thresholds for global shifts</p>
        </div>
        <div className="settings-header-actions">
          <button className="btn btn-outline" onClick={() => { setLogsOpen(true); fetchShiftLogs(logsShiftId); }}>
            <FiList size={13} /> Logs
          </button>
          <button className="btn btn-outline" onClick={() => { if(showForm){setShowForm(false); setEditingId(null); setFormData(emptyForm());} else {setShowForm(true);} }}>
            {showForm ? <><FiMinus size={13} /> Cancel</> : <><FiPlus size={13} /> New Shift</>}
          </button>
        </div>
      </div>

      <Modal
        title="Shift Policy Logs"
        open={logsOpen}
        onCancel={() => setLogsOpen(false)}
        footer={null}
        width={900}
      >
        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '12px', color: '#334155', fontWeight: 700 }}>Shift</label>
          <select
            className="form-select"
            style={{ maxWidth: '340px' }}
            value={logsShiftId}
            onChange={(e) => {
              const nextId = e.target.value;
              setLogsShiftId(nextId);
              fetchShiftLogs(nextId);
            }}
          >
            <option value="">All Shifts</option>
            {logsShifts.map((s) => (
              <option key={s._id} value={s._id}>{s.shift_name}</option>
            ))}
          </select>
        </div>
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

      {showForm && (
        <div className="modern-setting-form animation-slide-down">
          <div className="modern-form-header">
            <FiClock size={18} />
            <h3>{editingId ? 'Edit Shift' : 'Create New Shift'}</h3>
            <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.5)', display: 'flex' }} onClick={() => {setShowForm(false); setEditingId(null); setFormData(emptyForm());}}><FiX size={18} /></button>
          </div>
          <div className="modern-form-body">

            {/* Basic */}
            <div className="modern-section">
              <h4 className="modern-section-title"><FiSettings size={11} /> Basic Details</h4>
              <div className="modern-grid">
                <div className="form-group">
                  <label>Shift Name <span className="required">*</span></label>
                  <input type="text" className="form-input" placeholder="e.g. Morning Shift" value={formData.shift_name} onChange={e => setFormData({ ...formData, shift_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Shift Code</label>
                  <input type="text" className="form-input" placeholder="Auto-generated" value={formData.shift_code} onChange={e => setFormData({ ...formData, shift_code: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select className="form-select" value={formData.shift_type} onChange={e => setFormData({ ...formData, shift_type: e.target.value })}>
                    <option value="fixed">Fixed</option><option value="rotational">Rotational</option><option value="flexible">Flexible</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select className="form-select" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="active">Active</option><option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Applicability */}
            <div className="modern-section">
              <h4 className="modern-section-title"><FiUsers size={11} /> Applicability</h4>
                <div className="form-group">
                <div style={{ color: 'var(--as-t2)', fontSize: '13px' }}>
                  This shift is created globally and can be assigned from the Users tab.
                </div>
                </div>
            </div>

            {/* Timings */}
            <div className="modern-section">
              <h4 className="modern-section-title"><FiClock size={11} /> Timings</h4>
              <div className="modern-grid">
                <div className="form-group">
                  <label>Start Time <span className="required">*</span></label>
                  <input type="time" className="form-input" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>End Time <span className="required">*</span></label>
                  <input type="time" className="form-input" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Break Time (mins)</label>
                  <input type="number" className="form-input" value={formData.break_time_minutes} onChange={e => setFormData({ ...formData, break_time_minutes: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                  <label className="checkbox-label" style={{ marginTop: '1.5rem', color: 'var(--as-t2)' }}>
                    <input type="checkbox" checked={formData.is_cross_day} onChange={e => setFormData({ ...formData, is_cross_day: e.target.checked })} /> Cross-day (Overnight)
                  </label>
                  <label className="checkbox-label" style={{ marginTop: 6, color: 'var(--as-t2)' }}>
                    <input type="checkbox" checked={formData.night_shift} onChange={e => setFormData({ ...formData, night_shift: e.target.checked })} /> Night Shift
                  </label>
                </div>
              </div>
            </div>

            {/* Rules */}
            <div className="modern-section">
              <h4 className="modern-section-title"><FiCheckCircle size={11} /> Rules & Thresholds</h4>
              <div className="modern-grid modern-grid-4">
                <div className="form-group"><label>Full Day Hours</label><input type="number" className="form-input" value={formData.full_day_hours} onChange={e => setFormData({ ...formData, full_day_hours: parseFloat(e.target.value) || 0 })} /></div>
                <div className="form-group"><label>Half Day Hours</label><input type="number" className="form-input" value={formData.half_day_hours} onChange={e => setFormData({ ...formData, half_day_hours: parseFloat(e.target.value) || 0 })} /></div>
                <div className="form-group">
                  <label>Late Allowed (mins)</label>
                  <input type="number" className="form-input" value={formData.late_allowed_minutes} onChange={e => setFormData({ ...formData, late_allowed_minutes: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label>Early Leave Allowed (mins)</label>
                  <input type="number" className="form-input" value={formData.early_leave_allowed_minutes} onChange={e => setFormData({ ...formData, early_leave_allowed_minutes: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
            </div>


            <div className="form-actions">
              <button className="btn btn-outline" onClick={() => {setShowForm(false); setEditingId(null); setFormData(emptyForm());}}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveShift}><FiCheckCircle size={13} /> {editingId ? 'Update Shift' : 'Save Shift'}</button>
            </div>
          </div>
        </div>
      )}

      {!showForm && (
        <EnterpriseTable
          title="Available Shifts"
          columns={columns}
          fetchData={fetchShifts}
          searchPlaceholder="Search shifts "
          selectable={false}
          key={`${tableKey}`}
        />
      )}
    </div>
  );
};

export default ShiftManagement;



