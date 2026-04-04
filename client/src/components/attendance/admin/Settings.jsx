import React, { useState, useEffect } from 'react';
import { FiClock, FiFileText, FiShield, FiBriefcase, FiPlus } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import masterAPI from '../../../api/attendance/master.api';
import toast from 'react-hot-toast';
import './AdminSettings.css';

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('company_info');
  const [settings, setSettings] = useState({
    company_name: '', address: { line1: '', city: '' },
    timezone: 'Asia/Kolkata', financial_year_start: 'April',
    settings: { geo_fencing_enabled: false, ip_restriction_enabled: false, standard_work_hours: 8 },
    payroll_config: { overtime_threshold_hours: 9 },
    attendance_config: { full_day_threshold_hours: 8, half_day_threshold_hours: 4 },
  });

  useEffect(() => { fetchSettings(); }, [activeTab]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      if (['company_info', 'attendance_policy', 'security_rules'].includes(activeTab)) {
        const data = await masterAPI.getCompanySettings();
        if (data) setSettings({
          ...data,
          address: data.address || { line1: '', city: '' },
          settings: data.settings || { standard_work_hours: 8 },
          payroll_config: data.payroll_config || { overtime_threshold_hours: 9 },
          attendance_config: data.attendance_config || { full_day_threshold_hours: 8, half_day_threshold_hours: 4 },
          timezone: data.timezone || 'Asia/Kolkata',
          financial_year_start: 'April',
        });
      } 
    } catch (err) { toast.error(err.message || 'Failed to load settings'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await masterAPI.updateCompanySettings(settings);
      toast.success('Settings saved');
    } catch (err) { toast.error(err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const setNested = (parent, key, value) =>
    setSettings(prev => ({ ...prev, [parent]: { ...prev[parent], [key]: value } }));

  const TABS = [
    { key: 'company_info', icon: <FiBriefcase size={13} />, label: 'Company' },
    { key: 'attendance_policy', icon: <FiClock size={13} />, label: 'Attendance' },
    { key: 'leave_policy', icon: <FiFileText size={13} />, label: 'Leave Policy' },
    { key: 'security_rules', icon: <FiShield size={13} />, label: 'Security' },
  ];

  return (
    <div className="settings-container">
      {/* Hero header */}
      <div className="settings-header">
        <div className="settings-header-content">
          <h2>Company Settings</h2>
          <p>Configure company profile, attendance policies and security rules</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="settings-tabs-container">
        {TABS.map(t => (
          <button key={t.key} className={activeTab === t.key ? 'active' : ''} onClick={() => setActiveTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* -- Company Info -- */}
      {activeTab === 'company_info' && (
        <div className="card ui-card animation-fade-in">
          <h3><FiBriefcase size={16} /> Company Profile</h3>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Company Name</label>
            <input type="text" className="form-input" value={settings.company_name || ''} onChange={e => setSettings({ ...settings, company_name: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Address</label>
            <input type="text" className="form-input"
              value={`${settings.address?.line1 || ''}${settings.address?.city ? ', ' + settings.address.city : ''}`}
              onChange={e => { const p = e.target.value.split(', '); setSettings(prev => ({ ...prev, address: { ...prev.address, line1: p[0] || '', city: p[1] || '' } })); }}
            />
          </div>
          <div className="modern-grid">
            <div className="form-group">
              <label>Timezone</label>
              <input type="text" className="form-input" value={settings.timezone || ''} onChange={e => setSettings({ ...settings, timezone: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Financial Year Start</label>
              <input type="text" className="form-input" value={settings.financial_year_start || ''} onChange={e => setSettings({ ...settings, financial_year_start: e.target.value })} />
            </div>
          </div>
          <button className="ui-save-btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving ' : 'Save Changes'}</button>
        </div>
      )}

      {/* -- Attendance Policy -- */}
      {activeTab === 'attendance_policy' && (
        <div className="card ui-card animation-fade-in">
          <h3><FiClock size={16} /> Attendance Policy</h3>
          <div className="modern-grid-4 modern-grid" style={{ maxWidth: 640 }}>
            <div className="form-group">
              <label>Work Hours / Day</label>
              <input type="number" className="form-input" value={settings.settings?.standard_work_hours || ''} onChange={e => setNested('settings', 'standard_work_hours', Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label>Full-Day Threshold (hrs)</label>
              <input type="number" className="form-input" value={settings.attendance_config?.full_day_threshold_hours || ''} onChange={e => setNested('attendance_config', 'full_day_threshold_hours', Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label>OT Threshold (hrs)</label>
              <input type="number" className="form-input" value={settings.payroll_config?.overtime_threshold_hours || ''} onChange={e => setNested('payroll_config', 'overtime_threshold_hours', Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label>Half-Day Threshold (hrs)</label>
              <input type="number" className="form-input" value={settings.attendance_config?.half_day_threshold_hours || ''} onChange={e => setNested('attendance_config', 'half_day_threshold_hours', Number(e.target.value))} />
            </div>
          </div>
          <button className="ui-save-btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving ' : 'Save Changes'}</button>
        </div>
      )}

      {/* -- Leave Policy -- */}
      {activeTab === 'leave_policy' && (
        <div className="card ui-card animation-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}><FiFileText size={16} /> Leave Types Configuration</h3>
            <button className="btn btn-primary" onClick={() => navigate('/admin/leave-policies')}>
              <FiPlus size={13} /> Manage Policies
            </button>
          </div>
          <p style={{ fontSize: '.875rem', color: 'var(--as-t3)' }}>Configure leave types, quotas, and rules from the dedicated Leave Policy page.</p>
        </div>
      )}


      {/* -- Security Rules -- */}
      {activeTab === 'security_rules' && (
        <div className="card ui-card animation-fade-in">
          <h3><FiShield size={16} /> Security Rules</h3>
          <div style={{ maxWidth: 560 }}>
            <div className="switch-group">
              <div>
                <div style={{ fontWeight: 600, fontSize: '.875rem', color: 'var(--as-t1)' }}>IP Restriction</div>
                <div style={{ fontSize: '.75rem', color: 'var(--as-t3)', marginTop: 2 }}>Limit punch-in to office WiFi/VPN only</div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={settings.settings?.ip_restriction_enabled || false}
                  onChange={() => setNested('settings', 'ip_restriction_enabled', !settings.settings.ip_restriction_enabled)} />
                <span className="slider" />
              </label>
            </div>
            <div className="switch-group">
              <div>
                <div style={{ fontWeight: 600, fontSize: '.875rem', color: 'var(--as-t1)' }}>Geo-Fencing</div>
                <div style={{ fontSize: '.75rem', color: 'var(--as-t3)', marginTop: 2 }}>Enable GPS radius verification for punch-in</div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={settings.settings?.geo_fencing_enabled || false}
                  onChange={() => setNested('settings', 'geo_fencing_enabled', !settings.settings.geo_fencing_enabled)} />
                <span className="slider" />
              </label>
            </div>
          </div>
          <button className="ui-save-btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving ' : 'Save Changes'}</button>
        </div>
      )}
    </div>
  );
};

export default Settings;


