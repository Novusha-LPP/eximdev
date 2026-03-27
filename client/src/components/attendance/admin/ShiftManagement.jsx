import React, { useState } from 'react';
import { FiPlus, FiClock, FiTrash2, FiUsers, FiCalendar, FiSettings, FiCheckCircle, FiMinus, FiX } from 'react-icons/fi';
import masterAPI from '../../../api/attendance/master.api';
import toast from 'react-hot-toast';
import EnterpriseTable from '../common/EnterpriseTable';
import Button from '../common/Button';
import Badge from '../common/Badge';
import './AdminSettings.css';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ShiftManagement = () => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    shift_name: '', shift_code: '', shift_type: 'fixed', status: 'active',
    start_time: '', end_time: '', is_cross_day: false, night_shift: false,
    break_time_minutes: 60, break_included_in_work_hours: false,
    grace_in_minutes: 15, grace_out_minutes: 0, full_day_hours: 8, half_day_hours: 4,
    weekly_off_days: [], alternate_saturday_pattern: '',
  });

  const columns = [
    {
      label: 'Shift', key: 'shift_name', sortable: true, render: (val, row) =>
        <div><div style={{ fontWeight: 700, color: 'var(--as-t1)' }}>{val}</div><div style={{ fontSize: '.6875rem', fontFamily: 'monospace', color: 'var(--as-t4)' }}>{row.shift_code}</div></div>
    },
    {
      label: 'Timings', render: (_, row) =>
        <span style={{ fontFamily: 'monospace', background: 'var(--as-s2)', padding: '4px 9px', borderRadius: 6, fontSize: '.8rem', color: 'var(--as-t1)', fontWeight: 600 }}>
          {row.start_time || 'N/A'} � {row.end_time || 'N/A'}
        </span>
    },
    { label: 'Grace', render: (_, row) => <span style={{ fontSize: '.8125rem', color: 'var(--as-t2)' }}>{row.grace_in_minutes}m</span> },
    {
      label: 'Days Off', render: (_, row) =>
        <span style={{ fontSize: '.8125rem', color: 'var(--as-t3)' }}>
          {row.weekly_off_days?.map(d => DAYS[d]?.slice(0, 3)).join(', ') || 'None'}
        </span>
    },
    {
      label: 'Actions', render: (_, row) =>
        <button className="btn-icon danger" onClick={() => handleDelete(row._id)} title="Delete"><FiTrash2 size={13} /></button>
    },
  ];

  const fetchShifts = async (params) => masterAPI.getShifts(params);
  const toggleDay = i => {
    const cur = formData.weekly_off_days;
    setFormData({ ...formData, weekly_off_days: cur.includes(i) ? cur.filter(d => d !== i) : [...cur, i] });
  };

  const handleAddShift = async () => {
    if (!formData.shift_name || !formData.start_time || !formData.end_time) { toast.error('Fill required fields'); return; }
    try {
      await masterAPI.createShift({ ...formData, shift_code: formData.shift_code || formData.shift_name.slice(0, 3).toUpperCase() });
      toast.success('Shift created'); setShowForm(false);
      setFormData({ shift_name: '', shift_code: '', shift_type: 'fixed', status: 'active', start_time: '', end_time: '', is_cross_day: false, night_shift: false, break_time_minutes: 60, break_included_in_work_hours: false, grace_in_minutes: 15, grace_out_minutes: 0, full_day_hours: 8, half_day_hours: 4, weekly_off_days: [], alternate_saturday_pattern: '' });
      window.location.reload();
    } catch (err) { toast.error(err.message || 'Failed'); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this shift?')) return;
    try { await masterAPI.deleteShift(id); toast.success('Deleted'); window.location.reload(); }
    catch (err) { toast.error(err.message || 'Failed'); }
  };

  return (
    <div className="settings-container">
      {/* Hero header */}
      <div className="settings-header">
        <div className="settings-header-content">
          <h2>Shift Management</h2>
          <p>Define work timings, grace periods and weekly off patterns</p>
        </div>
        <div className="settings-header-actions">
          <button className="btn btn-outline" onClick={() => setShowForm(f => !f)}>
            {showForm ? <><FiMinus size={13} /> Cancel</> : <><FiPlus size={13} /> New Shift</>}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="modern-setting-form animation-slide-down">
          <div className="modern-form-header">
            <FiClock size={18} />
            <h3>Create New Shift</h3>
            <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.5)', display: 'flex' }} onClick={() => setShowForm(false)}><FiX size={18} /></button>
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
                  <label className="checkbox-label" style={{ marginTop: '1.5rem' }}>
                    <input type="checkbox" checked={formData.is_cross_day} onChange={e => setFormData({ ...formData, is_cross_day: e.target.checked })} /> Cross-day (Overnight)
                  </label>
                  <label className="checkbox-label" style={{ marginTop: 6 }}>
                    <input type="checkbox" checked={formData.night_shift} onChange={e => setFormData({ ...formData, night_shift: e.target.checked })} /> Night Shift
                  </label>
                </div>
              </div>
            </div>

            {/* Rules */}
            <div className="modern-section">
              <h4 className="modern-section-title"><FiCheckCircle size={11} /> Rules & Thresholds</h4>
              <div className="modern-grid modern-grid-4">
                <div className="form-group"><label>Grace In (mins)</label><input type="number" className="form-input" value={formData.grace_in_minutes} onChange={e => setFormData({ ...formData, grace_in_minutes: parseInt(e.target.value) || 0 })} /></div>
                <div className="form-group"><label>Grace Out (mins)</label><input type="number" className="form-input" value={formData.grace_out_minutes} onChange={e => setFormData({ ...formData, grace_out_minutes: parseInt(e.target.value) || 0 })} /></div>
                <div className="form-group"><label>Full Day Hours</label><input type="number" className="form-input" value={formData.full_day_hours} onChange={e => setFormData({ ...formData, full_day_hours: parseFloat(e.target.value) || 0 })} /></div>
                <div className="form-group"><label>Half Day Hours</label><input type="number" className="form-input" value={formData.half_day_hours} onChange={e => setFormData({ ...formData, half_day_hours: parseFloat(e.target.value) || 0 })} /></div>
              </div>
            </div>

            {/* Week Off */}
            <div className="modern-section">
              <h4 className="modern-section-title"><FiCalendar size={11} /> Week Off Pattern</h4>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Weekly Off Days</label>
                <div className="checkbox-group" style={{ marginTop: 6 }}>
                  {DAYS.map((day, i) => (
                    <div key={day} className={`modern-day-pill ${formData.weekly_off_days.includes(i) ? 'active' : ''}`} onClick={() => toggleDay(i)}>{day.slice(0, 3)}</div>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{ maxWidth: 280 }}>
                <label>Alternate Saturday Pattern</label>
                <input type="text" className="form-input" placeholder="e.g. 1,3" value={formData.alternate_saturday_pattern} onChange={e => setFormData({ ...formData, alternate_saturday_pattern: e.target.value })} />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddShift}><FiCheckCircle size={13} /> Save Shift</button>
            </div>
          </div>
        </div>
      )}

      <EnterpriseTable
        title="Available Shifts"
        columns={columns}
        fetchData={fetchShifts}
        searchPlaceholder="Search shifts�"
        selectable={false}
      />
    </div>
  );
};

export default ShiftManagement;


