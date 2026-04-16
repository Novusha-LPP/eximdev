import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { X, Edit2, Trash2 } from 'lucide-react';
import { message, Modal } from 'antd';
import { UserContext } from '../../../contexts/UserContext';
import ActivityTimeline from './ActivityTimeline';

const STAGES = ['lead', 'qualified', 'opportunity', 'proposal', 'negotiation', 'won', 'lost'];

const ALLOWED_SERVICES = [
  'custom clearance', 
  'freight forwarding', 
  'dgft', 
  'e-lock', 
  'client', 
  'transportation', 
  'paramount', 
  'rabs', 
  'auto rack'
];

export default function OpportunityDetailModal({ isOpen, onClose, opportunity, onRefresh }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [newRemark, setNewRemark] = useState('');
  const [editingRemarkId, setEditingRemarkId] = useState(null);
  const [editingRemarkText, setEditingRemarkText] = useState('');
  
  const { user } = useContext(UserContext);
  const fullUserName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : 'Unknown User';

  useEffect(() => {
    if (isOpen && opportunity?._id) {
      setFormData(opportunity);
      setNewRemark('');
    }
  }, [isOpen, opportunity]);

  const toggleService = (service) => {
    const currentServices = formData.services || [];
    if (currentServices.includes(service)) {
      setFormData({ 
        ...formData, 
        services: currentServices.filter(s => s !== service) 
      });
    } else {
      setFormData({ 
        ...formData, 
        services: [...currentServices, service] 
      });
    }
  };

  const [customService, setCustomService] = useState('');
  const handleAddCustomService = () => {
    if (!customService.trim()) return;
    const currentServices = formData.services || [];
    if (!currentServices.includes(customService.trim())) {
      setFormData({
        ...formData,
        services: [...currentServices, customService.trim()]
      });
    }
    setCustomService('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const currentStage = opportunity.stage;
      const newStage = formData.stage;
      const stageChanged = newStage && newStage !== currentStage;

      // Only send the fields the form actually edits — never send stageHistory, __v, _id etc.
      const payload = {
        name: formData.name,
        value: formData.value,
        probability: formData.probability,
        expectedCloseDate: formData.expectedCloseDate,
        services: formData.services || [],
        newRemark: newRemark,
        userName: fullUserName
      };

      // If stage changed, use the dedicated PATCH /stage endpoint
      if (stageChanged) {
        await axios.patch(
          `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}/stage`,
          { stage: newStage },
          { withCredentials: true }
        );
      }

      // Update other fields via PUT (without stage in payload to skip validation)
      await axios.put(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}`,
        payload,
        { withCredentials: true }
      );

      message.success('Opportunity updated successfully');
      setIsEditMode(false);
      onRefresh();
      onClose();
    } catch (error) {
      message.error('Error updating opportunity: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: 'Delete Opportunity',
      content: 'Are you sure you want to delete this opportunity?',
      okText: 'Delete',
      okType: 'danger',
      async onOk() {
        try {
          await axios.delete(`${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}`, { withCredentials: true });
          message.success('Opportunity deleted successfully');
          onRefresh();
          onClose();
        } catch (error) {
          message.error('Error deleting opportunity');
        }
      }
    });
  };

  const handleEditRemark = async (remarkId) => {
    if (!editingRemarkText.trim()) return;
    try {
      await axios.put(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}/remarks/${remarkId}`,
        { text: editingRemarkText },
        { withCredentials: true }
      );
      message.success('Remark updated');
      setEditingRemarkId(null);
      onRefresh();
      // Update local state to show change immediately if possible, but onRefresh is safer
    } catch (error) {
      message.error('Error updating remark');
    }
  };

  const handleDeleteRemark = (remarkId) => {
    Modal.confirm({
      title: 'Delete Remark',
      content: 'Are you sure you want to delete this remark?',
      okText: 'Delete',
      okType: 'danger',
      async onOk() {
        try {
          await axios.delete(
            `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}/remarks/${remarkId}`,
            { withCredentials: true }
          );
          message.success('Remark deleted');
          onRefresh();
        } catch (error) {
          message.error('Error deleting remark');
        }
      }
    });
  };

  if (!isOpen || !opportunity) return null;

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
      zIndex: 1010,
      padding: '20px'
    }}>
      <div style={{
        background: '#fff',
        width: '100%',
        maxWidth: '700px',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1e293b', fontWeight: 700, fontSize: '1.2rem' }}>{formData.name || opportunity.name}</h3>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Stage: {formData.stage || opportunity.stage}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {!isEditMode && (
              <>
                <button
                  onClick={() => setIsEditMode(true)}
                  style={{ padding: '8px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Edit2 size={16} /> Edit
                </button>
                <button
                  onClick={handleDelete}
                  style={{ padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Trash2 size={16} /> Delete
                </button>
              </>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #4f46e5' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Value</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>₹{parseFloat(formData.value || 0).toLocaleString('en-IN')}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Probability</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{formData.probability || 0}%</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Weighted Value</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                ₹{(parseFloat(formData.value || 0) * (parseFloat(formData.probability || 0) / 100)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {isEditMode ? (
            // Edit Form
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Name</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Stage</label>
                  <select
                    value={formData.stage || 'lead'}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                  >
                    {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Deal Value (₹)</label>
                  <input
                    type="number"
                    value={formData.value || ''}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Probability (%)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.probability || 0}
                      onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) })}
                      style={{ flex: 1 }}
                    />
                    <span style={{ minWidth: '40px', textAlign: 'center', fontWeight: 700, color: '#4f46e5' }}>{formData.probability || 0}%</span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Expected Close Date</label>
                <input
                  type="date"
                  value={formData.expectedCloseDate?.substring(0, 10) || ''}
                  onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '12px' }}>Interested Services</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {ALLOWED_SERVICES.map(service => (
                    <button
                      key={service}
                      type="button"
                      onClick={() => toggleService(service)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: (formData.services || []).includes(service) ? '#4f46e5' : '#e2e8f0',
                        background: (formData.services || []).includes(service) ? '#eef2ff' : '#fff',
                        color: (formData.services || []).includes(service) ? '#4f46e5' : '#64748b',
                        transition: 'all 0.2s'
                      }}
                    >
                      {service.charAt(0).toUpperCase() + service.slice(1)}
                    </button>
                  ))}
                  {(formData.services || []).filter(s => !ALLOWED_SERVICES.includes(s)).map(service => (
                    <button
                      key={service}
                      type="button"
                      onClick={() => toggleService(service)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid #4f46e5',
                        background: '#eef2ff',
                        color: '#4f46e5',
                        transition: 'all 0.2s'
                      }}
                    >
                      {service}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text"
                    value={customService}
                    onChange={(e) => setCustomService(e.target.value)}
                    placeholder="Add custom service..."
                    style={{ flex: 1, padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem' }}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomService())}
                  />
                  <button 
                    onClick={handleAddCustomService}
                    style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Add
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Add Remark</label>
                <textarea
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  placeholder="Type a new remark here..."
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  onClick={() => setIsEditMode(false)}
                  style={{ padding: '10px 20px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{ padding: '10px 20px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, opacity: isSaving ? 0.6 : 1 }}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Opportunity Details */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: '#475569', fontWeight: 700, marginBottom: '12px', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Expected Close</span>
                    <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600 }}>
                      {formData.expectedCloseDate ? new Date(formData.expectedCloseDate).toLocaleDateString('en-IN') : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Forecast Category</span>
                    <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600 }}>{formData.forecastCategory || 'Pipeline'}</p>
                  </div>
                </div>
                
                {/* Services Display */}
                {(formData.services || []).length > 0 && (
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '8px' }}>Interested Services</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {(formData.services || []).map(service => (
                        <span
                          key={service}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: '#eef2ff',
                            color: '#4f46e5',
                            border: '1px solid #4f46e5'
                          }}
                        >
                          {service.charAt(0).toUpperCase() + service.slice(1)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Remarks History */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: '#475569', fontWeight: 700, marginBottom: '12px', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Remarks History</h4>
                {formData.remarks && formData.remarks.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {formData.remarks.slice().reverse().map((remark, idx) => (
                      <div key={remark._id || idx} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #4f46e5', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.85rem' }}>{remark.userName || 'Unknown'}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {new Date(remark.createdAt).toLocaleDateString('en-IN')} {new Date(remark.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button 
                                onClick={() => {
                                  setEditingRemarkId(remark._id);
                                  setEditingRemarkText(remark.text);
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px' }}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteRemark(remark._id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {editingRemarkId === remark._id ? (
                          <div style={{ marginTop: '8px' }}>
                            <textarea
                              value={editingRemarkText}
                              onChange={(e) => setEditingRemarkText(e.target.value)}
                              style={{ width: '100%', padding: '8px', border: '1px solid #3b82f6', borderRadius: '6px', fontSize: '0.9rem', minHeight: '60px' }}
                            />
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                              <button onClick={() => setEditingRemarkId(null)} style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'white' }}>Cancel</button>
                              <button onClick={() => handleEditRemark(remark._id)} style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', background: '#4f46e5', color: 'white', border: 'none' }}>Update</button>
                            </div>
                          </div>
                        ) : (
                          <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{remark.text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>No remarks added yet.</p>
                )}
              </div>

              {/* Activity Timeline */}
              <div style={{ marginTop: '24px' }}>
                <ActivityTimeline linkedId={opportunity._id} linkedType="opportunity" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
