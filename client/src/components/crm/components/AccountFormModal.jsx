import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import { message } from 'antd';

export default function AccountFormModal({ isOpen, onClose, onRefresh, account }) {
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    size: '',
    website: '',
    annualRevenue: '',
    address: '',
    parentAccountId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (account) {
      setFormData(account);
    } else {
      setFormData({
        name: '',
        industry: '',
        size: '',
        website: '',
        annualRevenue: '',
        address: '',
        parentAccountId: ''
      });
    }
  }, [account]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const submissionData = { ...formData };
    if (!submissionData.parentAccountId) delete submissionData.parentAccountId;
    if (!submissionData.annualRevenue) delete submissionData.annualRevenue;
    
    try {
      if (account?._id) {
        await axios.put(`${process.env.REACT_APP_API_STRING}/crm/accounts/${account._id}`, submissionData, { withCredentials: true });
        message.success('Account updated successfully');
      } else {
        await axios.post(`${process.env.REACT_APP_API_STRING}/crm/accounts`, submissionData, { withCredentials: true });
        message.success('Account created successfully');
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
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#fff',
        width: '100%',
        maxWidth: '620px',
        borderRadius: '18px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        maxHeight: 'min(92vh, 680px)',
        display: 'flex',
        flexDirection: 'column',
        margin: 'auto',
        animation: 'modalOpen 0.25s ease-out'
      }}>
        <style>{`
          @keyframes modalOpen {
            from { transform: scale(0.96); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>

        <div style={{ padding: '16px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', flexShrink: 0 }}>
          <h3 style={{ margin: 0, color: '#1e293b', fontWeight: 700, fontSize: '1.15rem' }}>{account ? 'Edit Account' : 'New Account'}</h3>
          <button onClick={onClose} style={{ background: '#fff', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#64748b', borderRadius: '8px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Company Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Industry</label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="e.g., Import/Export, Manufacturing"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Company Size</label>
              <select
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
              >
                <option value="">Select size</option>
                <option value="startup">Startup</option>
                <option value="small">Small (1-50)</option>
                <option value="medium">Medium (51-500)</option>
                <option value="large">Large (500+)</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Website</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://example.com"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Annual Revenue</label>
            <input
              type="number"
              value={formData.annualRevenue}
              onChange={(e) => setFormData({ ...formData, annualRevenue: e.target.value })}
              placeholder="0"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Full address"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', minHeight: '80px', fontFamily: 'inherit' }}
            />
          </div>

          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '14px 22px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', flexShrink: 0 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 18px', border: '1px solid #cbd5e1', background: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#64748b', fontSize: '0.875rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: '8px 22px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: isSubmitting ? 0.7 : 1, fontSize: '0.875rem' }}
            >
              {isSubmitting ? 'Saving...' : account ? 'Update Account' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
