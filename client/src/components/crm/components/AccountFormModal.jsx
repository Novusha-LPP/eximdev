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
        maxWidth: '600px',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        animation: 'modalOpen 0.3s ease-out'
      }}>
        <style>{`
          @keyframes modalOpen {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>

        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#1e293b', fontWeight: 700 }}>{account ? 'Edit Account' : 'New Account'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
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

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
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
              {isSubmitting ? 'Saving...' : account ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
