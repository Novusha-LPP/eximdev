import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Loader, Search, User, Check } from 'lucide-react';
import { message } from 'antd';

const getHeaders = () => {
  const user = JSON.parse(localStorage.getItem('exim_user') || '{}');
  return {
    headers: {
      'Content-Type': 'application/json',
      'user-id': user._id || user.id || '',
      'username': user.username || '',
      'user-role': user.role || '',
    },
    withCredentials: true
  };
};

export default function PricingRequestFormModal({ isOpen, onClose, onRefresh, initialRelatedType, initialRelatedId, initialSubject, initialTargetPrice }) {
  const isContextual = !!initialRelatedId;
  const [formData, setFormData] = useState({
    relatedType: 'Opportunity',
    relatedId: '',
    assignedTo: '',
    subject: '',
    description: '',
    targetPrice: '',
    crateSize: '',
    qty: '',
    additionalRequirement: ''
  });

  const [assignees, setAssignees] = useState([]);
  const [relatedRecords, setRelatedRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const getDisplayName = (user) => {
    if (!user) return '';
    return user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username;
  };

  useEffect(() => {
    if (formData.assignedTo && assignees.length > 0) {
      const user = assignees.find(u => (u._id || u.id)?.toString() === formData.assignedTo.toString());
      if (user) {
        setUserSearch(getDisplayName(user));
      }
    } else if (!formData.assignedTo) {
      setUserSearch('');
    }
  }, [formData.assignedTo, assignees]);

  const filteredAssignees = assignees.filter(u => {
    const search = userSearch.toLowerCase();
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    return (
      u.username?.toLowerCase().includes(search) ||
      fullName.includes(search) ||
      (u.role || u.crmRole || '').toLowerCase().includes(search)
    );
  });

  useEffect(() => {
    if (isOpen) {
      // Reset form fields with initial values if provided
      setFormData({
        relatedType: initialRelatedType || 'Opportunity',
        relatedId: initialRelatedId || '',
        assignedTo: '',
        subject: initialSubject || '',
        description: '',
        targetPrice: initialTargetPrice || '',
        crateSize: '',
        qty: '',
        additionalRequirement: ''
      });
      setUserSearch('');

      // Fetch assignees
      const fetchAssignees = async () => {
        try {
          const res = await axios.get(
            `${process.env.REACT_APP_API_STRING}/crm/pricing-requests/assignees`,
            getHeaders()
          );
          const userList = res.data || [];
          setAssignees(userList);

          if (initialRelatedId && userList.length > 0) {
            const pricingUser = userList.find(u =>
              (u.crmRole || '').toLowerCase().includes('pricing') ||
              (u.role || '').toLowerCase().includes('pricing') ||
              (u.crmRole || '').toLowerCase().includes('accounts') ||
              (u.role || '').toLowerCase().includes('accounts')
            ) || userList[0];

            if (pricingUser) {
              const uId = (pricingUser._id || pricingUser.id)?.toString();
              setFormData(prev => ({ ...prev, assignedTo: uId }));
              setUserSearch(pricingUser.first_name ? `${pricingUser.first_name} ${pricingUser.last_name || ''}`.trim() : pricingUser.username);
            }
          }
        } catch (err) {
          console.error('Failed to fetch assignees:', err);
        }
      };

      fetchAssignees();
    }
  }, [isOpen, initialRelatedType, initialRelatedId, initialSubject, initialTargetPrice]);

  useEffect(() => {
    if (isOpen) {
      const fetchRelatedRecords = async () => {
        setLoadingRecords(true);
        try {
          let url = '';
          if (formData.relatedType === 'Lead') {
            url = `${process.env.REACT_APP_API_STRING}/crm/leads`;
          } else if (formData.relatedType === 'Opportunity') {
            url = `${process.env.REACT_APP_API_STRING}/crm/opportunities`;
          } else if (formData.relatedType === 'Account') {
            url = `${process.env.REACT_APP_API_STRING}/crm/accounts`;
          }

          const res = await axios.get(url, getHeaders());
          const records = res.data || [];
          setRelatedRecords(records);

          if (initialRelatedId && formData.relatedType === initialRelatedType && records.some(r => r._id === initialRelatedId)) {
            setFormData(prev => ({ ...prev, relatedId: initialRelatedId }));
          } else if (records.length > 0) {
            setFormData(prev => ({ ...prev, relatedId: records[0]._id }));
          } else {
            setFormData(prev => ({ ...prev, relatedId: '' }));
          }
        } catch (err) {
          console.error(`Failed to load ${formData.relatedType}s:`, err);
        } finally {
          setLoadingRecords(false);
        }
      };

      fetchRelatedRecords();
    }
  }, [isOpen, formData.relatedType, initialRelatedId, initialRelatedType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.relatedId || !formData.assignedTo) {
      message.warning('Please fill in all required fields');
      return;
    }


    setIsSubmitting(true);
    try {
      const selectedRecord = relatedRecords.find(r => r._id === formData.relatedId);
      const recordName = selectedRecord
        ? (selectedRecord.company || selectedRecord.name || `${selectedRecord.firstName} ${selectedRecord.lastName}`)
        : '';

      const payload = {
        assignedTo: formData.assignedTo,
        subject: formData.subject,
        description: formData.description,
        targetPrice: formData.targetPrice ? Number(formData.targetPrice) : undefined,
        crateSize: formData.crateSize,
        qty: formData.qty ? Number(formData.qty) : undefined,
        additionalRequirement: formData.additionalRequirement,
        relatedTo: {
          model: formData.relatedType,
          id: formData.relatedId,
          name: recordName
        }
      };

      await axios.post(
        `${process.env.REACT_APP_API_STRING}/crm/pricing-requests`,
        payload,
        getHeaders()
      );

      message.success('Pricing request submitted successfully');
      onRefresh();
      onClose();
      // Reset form
      setFormData({
        relatedType: 'Opportunity',
        relatedId: '',
        assignedTo: '',
        subject: '',
        description: '',
        targetPrice: '',
        crateSize: '',
        qty: '',
        additionalRequirement: ''
      });
    } catch (err) {
      console.error('Failed to create pricing request:', err);
      message.error(err.response?.data?.message || 'Failed to submit pricing request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: '#fff',
        width: '100%',
        maxWidth: '550px',
        maxHeight: '90vh',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: 'modalOpen 0.25s ease-out'
      }}>
        <style>{`
          @keyframes modalOpen {
            from { transform: scale(0.96); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>

        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <h3 style={{ margin: 0, color: '#1e293b', fontWeight: 700, fontSize: '1.15rem' }}>
            Request New Pricing / Quote
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: 0 }}>
          <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {isContextual ? (
              <>

                {/* Crate Size */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Crate Size *</label>
                  <input
                    required
                    type="text"
                    value={formData.crateSize}
                    onChange={e => setFormData({ ...formData, crateSize: e.target.value })}
                    placeholder="Ex. 20ft / 40ft"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>

                {/* Qty */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Qty (Quantity) *</label>
                  <input
                    required
                    type="number"
                    value={formData.qty}
                    onChange={e => setFormData({ ...formData, qty: e.target.value })}
                    placeholder="Ex. 5"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>

                {/* Additional Requirement */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Additional Requirement</label>
                  <textarea
                    value={formData.additionalRequirement}
                    onChange={e => setFormData({ ...formData, additionalRequirement: e.target.value })}
                    placeholder="Ex. Customs clearance needed, priority shipping..."
                    rows={4}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', resize: 'vertical' }}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Subject */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Request Subject / Line *</label>
                  <input
                    required
                    type="text"
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Ex. Ocean freight rate request - NHAVA SHEVA to ROTTERDAM"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>

                {/* Related Type & Record */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Link To Type</label>
                    <select
                      value={formData.relatedType}
                      onChange={e => setFormData({ ...formData, relatedType: e.target.value, relatedId: '' })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', background: '#fff' }}
                    >
                      <option value="Opportunity">Opportunity</option>
                      <option value="Lead">Lead</option>
                      <option value="Account">Account</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Select Record *</label>
                    {loadingRecords ? (
                      <div style={{ height: '42px', display: 'flex', alignItems: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                        <Loader size={14} className="animate-spin" style={{ marginRight: '6px' }} /> Loading...
                      </div>
                    ) : (
                      <select
                        value={formData.relatedId}
                        onChange={e => setFormData({ ...formData, relatedId: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', background: '#fff' }}
                        required
                      >
                        {relatedRecords.length === 0 ? (
                          <option value="" disabled>No records found</option>
                        ) : (
                          relatedRecords.map(r => {
                            const displayName = r.company || r.name || `${r.firstName} ${r.lastName || ''}`;
                            return (
                              <option key={r._id} value={r._id}>
                                {displayName}
                              </option>
                            );
                          })
                        )}
                      </select>
                    )}
                  </div>
                </div>

                {/* Crate Size, Qty Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Crate Size</label>
                    <input
                      type="text"
                      value={formData.crateSize}
                      onChange={e => setFormData({ ...formData, crateSize: e.target.value })}
                      placeholder="Ex. 20ft / 40ft"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Qty (Quantity)</label>
                    <input
                      type="number"
                      value={formData.qty}
                      onChange={e => setFormData({ ...formData, qty: e.target.value })}
                      placeholder="Ex. 5"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                {/* Additional Requirement */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Additional Requirement</label>
                  <input
                    type="text"
                    value={formData.additionalRequirement}
                    onChange={e => setFormData({ ...formData, additionalRequirement: e.target.value })}
                    placeholder="Ex. Priority customs clearance needed..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>

                {/* Assignee */}
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Assign Pricing Request To *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Search teammate..."
                      value={userSearch}
                      onChange={e => {
                        setUserSearch(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                      required
                    />
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  </div>

                  {isDropdownOpen && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
                      border: '1px solid #e2e8f0', borderRadius: '8px', maxHeight: '160px',
                      overflowY: 'auto', background: '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                    }}>
                      {filteredAssignees.length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No matching teammates</div>
                      ) : filteredAssignees.map(user => {
                        const userId = (user._id || user.id)?.toString();
                        const isSelected = formData.assignedTo === userId;
                        return (
                          <div
                            key={userId}
                            onClick={() => {
                              setFormData({ ...formData, assignedTo: userId });
                              setUserSearch(getDisplayName(user));
                              setIsDropdownOpen(false);
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                              background: isSelected ? '#f1f5f9' : 'transparent',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#f1f5f9' : 'transparent'; }}
                          >
                            <div style={{
                              width: '24px', height: '24px', borderRadius: '50%',
                              background: isSelected ? '#4f46e5' : '#e2e8f0',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSelected ? '#fff' : '#64748b'
                            }}>
                              <User size={12} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>{getDisplayName(user)}</div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{user.role || user.crmRole || 'User'}</div>
                            </div>
                            {isSelected && <Check size={14} style={{ color: '#4f46e5' }} />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {isDropdownOpen && (
                    <div
                      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                      onClick={() => setIsDropdownOpen(false)}
                    />
                  )}
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Request Details & Requirements</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Specify container size, weight, shipping lines preferred, or target rates details..."
                    rows={4}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', resize: 'vertical' }}
                  />
                </div>
              </>
            )}

          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #f1f5f9',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '9px 16px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                background: '#fff',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '9px 16px',
                border: 'none',
                borderRadius: '8px',
                background: '#4f46e5',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#fff',
                cursor: 'pointer',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
