import React, { useState } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';

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

const SOURCES = ['web', 'referral', 'email', 'social', 'event'];

export default function LeadFormModal({ isOpen, onClose, onRefresh }) {
  const [formData, setFormData] = useState({
    company: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    source: 'web',
    interestedServices: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_STRING}/crm/leads`, formData, { withCredentials: true });
      onRefresh();
      onClose();
      setFormData({
        company: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        source: 'web',
        interestedServices: []
      });
    } catch (error) {
      alert("Error creating lead: " + (error.response?.data?.message || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleService = (service) => {
    setFormData(prev => ({
      ...prev,
      interestedServices: prev.interestedServices.includes(service)
        ? prev.interestedServices.filter(s => s !== service)
        : [...prev.interestedServices, service]
    }));
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
        maxWidth: '500px',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        animation: 'modalOpen 0.3s ease-out'
      }}>
        <style>{`
          @keyframes modalOpen {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>
        
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <h3 style={{ margin: 0, color: '#1e293b', fontWeight: 700, fontSize: '1.25rem' }}>Create New Lead</h3>
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
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gap: '20px' }}>
            {/* Company */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Company Name *</label>
              <input 
                required
                type="text"
                value={formData.company}
                onChange={e => setFormData({...formData, company: e.target.value})}
                placeholder="Ex. Global Trade Inc."
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
              />
            </div>

            {/* Name Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>First Name *</label>
                <input 
                  required
                  type="text"
                  value={formData.firstName}
                  onChange={e => setFormData({...formData, firstName: e.target.value})}
                  placeholder="John"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Last Name</label>
                <input 
                  type="text"
                  value={formData.lastName}
                  onChange={e => setFormData({...formData, lastName: e.target.value})}
                  placeholder="Doe"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                />
              </div>
            </div>

            {/* Contact Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Email</label>
                <input 
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="john@example.com"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Phone</label>
                <input 
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  placeholder="+91 ...."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                />
              </div>
            </div>

            {/* Source */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Lead Source</label>
              <select 
                value={formData.source}
                onChange={e => setFormData({...formData, source: e.target.value})}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', background: '#fff' }}
              >
                {SOURCES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>

            {/* Services */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '12px' }}>Interested Services</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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
                      borderColor: formData.interestedServices.includes(service) ? '#4f46e5' : '#e2e8f0',
                      background: formData.interestedServices.includes(service) ? '#eef2ff' : '#fff',
                      color: formData.interestedServices.includes(service) ? '#4f46e5' : '#64748b',
                      transition: 'all 0.2s'
                    }}
                  >
                    {service.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{ 
                flex: 2, 
                padding: '12px', 
                borderRadius: '10px', 
                border: 'none', 
                background: '#4f46e5', 
                color: '#fff', 
                fontWeight: 600, 
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
              }}
            >
              {isSubmitting ? 'Creating...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
