import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Search } from 'lucide-react';
import { message } from 'antd';

const modelMap = {
  lead: 'Lead',
  contact: 'Contact',
  opportunity: 'Opportunity',
  account: 'Account',
  Lead: 'Lead',
  Contact: 'Contact',
  Opportunity: 'Opportunity',
  Account: 'Account'
};

const getLocalISOString = (dateInput) => {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) return '';
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().substring(0, 16);
};

export default function ActivityFormModal({ isOpen, onClose, onRefresh, activity, linkedId, linkedType = 'opportunity' }) {
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    type: 'call',
    duration: '',
    outcome: 'neutral',
    nextSteps: '',
    activityDate: getLocalISOString(),
    relatedTo: {
      model: '',
      id: '',
      name: ''
    }
  });

  const [entities, setEntities] = useState([]);
  const [entitySearch, setEntitySearch] = useState('');
  const [isEntityDropdownOpen, setIsEntityDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getHeaders = () => {
    const user = JSON.parse(localStorage.getItem('exim_user') || '{}');
    return {
      headers: {
        'Content-Type': 'application/json',
        'user-id': user._id || user.id || '',
        'username': user.username || '',
        'user-role': user.role || '',
        'Authorization': user.token ? `Bearer ${user.token}` : undefined
      },
      withCredentials: true
    };
  };

  const fetchEntityOptions = async (model) => {
    if (!model) return;
    try {
      let endpoint = '';
      if (model === 'Lead') endpoint = '/crm/leads?all=true';
      else if (model === 'Opportunity') endpoint = '/crm/opportunities?all=true';
      else if (model === 'Account') endpoint = '/crm/accounts?all=true';
      else if (model === 'Contact') endpoint = '/crm/contacts?all=true';

      const res = await axios.get(`${process.env.REACT_APP_API_STRING}${endpoint}`, getHeaders());
      const mapped = (res.data || []).map(item => {
        let name = '';
        if (model === 'Lead') name = `${item.firstName || ''} ${item.lastName || ''} ${item.company ? `(${item.company})` : ''}`.trim();
        else if (model === 'Opportunity') name = `${item.name || 'Unnamed Deal'} (${typeof item.accountId === 'object' ? (item.accountId?.name || 'No Account') : 'No Account'})`;
        else if (model === 'Account') name = item.name || 'Unnamed Account';
        else if (model === 'Contact') name = `${item.firstName || ''} ${item.lastName || ''}`.trim();
        return { id: item._id, name: name || 'Unnamed Record' };
      });
      setEntities(mapped);
    } catch (err) {
      console.error('Error fetching entity options:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (activity) {
        setFormData({
          ...activity,
          activityDate: getLocalISOString(activity.activityDate),
          relatedTo: activity.relatedTo || { model: '', id: '', name: '' }
        });
        if (activity.relatedTo?.model) {
          fetchEntityOptions(activity.relatedTo.model);
          setEntitySearch(activity.relatedTo.name || '');
        } else {
          setEntitySearch('');
        }
      } else {
        const initialModel = linkedId ? modelMap[linkedType] : '';
        setFormData({
          subject: '',
          description: '',
          type: 'call',
          duration: '',
          outcome: 'neutral',
          nextSteps: '',
          activityDate: getLocalISOString(),
          relatedTo: {
            model: initialModel || '',
            id: linkedId || '',
            name: ''
          }
        });
        setEntitySearch('');
        setEntities([]);
        if (initialModel) {
          fetchEntityOptions(initialModel);
        }
      }
    }
  }, [activity, isOpen, linkedId, linkedType]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!linkedId && (!formData.relatedTo?.model || !formData.relatedTo?.id)) {
      return message.error('Please link this activity to a record (Lead/Account/Deal)');
    }

    setIsSubmitting(true);
    try {
      const user = JSON.parse(localStorage.getItem('exim_user') || '{}');
      const userId = user._id || user.id;

      const dataToSubmit = {
        ...formData,
        userId: userId,
        relatedTo: linkedId ? {
          model: modelMap[linkedType],
          id: linkedId
        } : {
          model: formData.relatedTo.model,
          id: formData.relatedTo.id
        }
      };

      if (activity?._id) {
        await axios.put(`${process.env.REACT_APP_API_STRING}/crm/activities/${activity._id}`, dataToSubmit, getHeaders());
        message.success('Activity updated successfully');
      } else {
        await axios.post(`${process.env.REACT_APP_API_STRING}/crm/activities`, dataToSubmit, getHeaders());
        message.success('Activity logged successfully');
      }
      onRefresh();
      onClose();
    } catch (error) {
      message.error('Error: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: '#fff',
        width: '100%',
        maxWidth: '520px',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <h3 style={{ margin: 0, color: '#1e293b', fontWeight: 700 }}>{activity ? 'Edit Activity' : 'Log Activity'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-scroll" style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', margin: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Activity Type *</label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
              >
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="demo">Demo</option>
                <option value="note">Note</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Outcome</label>
              <select
                value={formData.outcome}
                onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
              >
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Subject *</label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="e.g., Quarterly Business Review"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add detailed notes about this activity..."
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', minHeight: '80px', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Duration (minutes)</label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g., 30"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Activity Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={formData.activityDate}
                onChange={(e) => setFormData({ ...formData, activityDate: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', background: '#fff' }}
              />
            </div>
          </div>

          {/* Polymorphic Record Linker (Only if linkedId is not pre-specified) */}
          {!linkedId && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>LINK TYPE *</label>
                <select
                  value={formData.relatedTo?.model || ''}
                  onChange={(e) => {
                    const model = e.target.value;
                    setFormData({
                      ...formData,
                      relatedTo: { model, id: '', name: '' }
                    });
                    setEntitySearch('');
                    setEntities([]);
                    if (model) {
                      fetchEntityOptions(model);
                    }
                  }}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', background: '#fff', cursor: 'pointer' }}
                >
                  <option value="">None</option>
                  <option value="Lead">Lead</option>
                  <option value="Opportunity">Opportunity (Deal)</option>
                  <option value="Account">Account</option>
                  <option value="Contact">Contact</option>
                </select>
              </div>

              {formData.relatedTo?.model && (
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>SELECT RECORD *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder={`Search ${formData.relatedTo.model}...`}
                      value={entitySearch}
                      onChange={e => {
                        setEntitySearch(e.target.value);
                        setIsEntityDropdownOpen(true);
                      }}
                      onFocus={() => setIsEntityDropdownOpen(true)}
                      style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', background: '#fff' }}
                    />
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  </div>

                  {isEntityDropdownOpen && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
                      border: '1px solid #e2e8f0', borderRadius: '8px', maxHeight: '180px',
                      overflowY: 'auto', background: '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                    }}>
                      {entities.filter(ent => ent.name.toLowerCase().includes(entitySearch.toLowerCase())).length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No matching records</div>
                      ) : entities.filter(ent => ent.name.toLowerCase().includes(entitySearch.toLowerCase())).map(ent => {
                        const isSelected = formData.relatedTo?.id === ent.id;
                        return (
                          <div
                            key={ent.id}
                            onClick={() => {
                              setFormData({
                                ...formData,
                                relatedTo: {
                                  ...formData.relatedTo,
                                  id: ent.id,
                                  name: ent.name
                                }
                              });
                              setEntitySearch(ent.name);
                              setIsEntityDropdownOpen(false);
                            }}
                            style={{
                              padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                              background: isSelected ? '#f1f5f9' : 'transparent',
                              fontSize: '0.85rem', color: '#1e293b',
                              fontWeight: isSelected ? 600 : 400
                            }}
                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#f1f5f9' : 'transparent'; }}
                          >
                            {ent.name}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {isEntityDropdownOpen && (
                    <div 
                      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                      onClick={() => setIsEntityDropdownOpen(false)}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Next Steps</label>
            <textarea
              value={formData.nextSteps}
              onChange={(e) => setFormData({ ...formData, nextSteps: e.target.value })}
              placeholder="What should happen next?"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', minHeight: '60px', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #f1f5f9', marginTop: 'auto' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '10px 20px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: '10px 20px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, opacity: isSubmitting ? 0.6 : 1 }}
            >
              {isSubmitting ? 'Saving...' : activity ? 'Update' : 'Log Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
