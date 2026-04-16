import React from 'react';
import { X, Edit2, User } from 'lucide-react';
import ActivityTimeline from './ActivityTimeline';

export default function LeadDetailModal({ isOpen, onClose, lead, onEdit, onRefresh }) {
  if (!isOpen || !lead) return null;

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
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#eef2ff', padding: '10px', borderRadius: '10px', color: '#4f46e5' }}>
              <User size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#1e293b', fontWeight: 700, fontSize: '1.2rem' }}>{lead.firstName} {lead.lastName}</h3>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{lead.company}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                onEdit(lead);
                onClose();
              }}
              style={{ padding: '8px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Edit2 size={16} /> Edit
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Contact Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #4f46e5' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Email</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>{lead.email || 'N/A'}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Phone</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>{lead.phone || 'N/A'}</div>
            </div>
          </div>

          <div style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
             <div>
               <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Status</span>
               <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600, textTransform: 'capitalize' }}>{lead.status || 'New'}</p>
             </div>
             <div>
               <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Source</span>
               <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600, textTransform: 'capitalize' }}>{lead.source || 'Unknown'}</p>
             </div>
          </div>

          {/* Services */}
          {lead.interestedServices && lead.interestedServices.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '8px' }}>Interested Services</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {lead.interestedServices.map(service => (
                  <span key={service} style={{ fontSize: '0.75rem', padding: '4px 10px', background: '#f1f5f9', color: '#475569', borderRadius: '20px', border: '1px solid #e2e8f0' }}>{service}</span>
                ))}
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          <div style={{ marginTop: '24px' }}>
            <ActivityTimeline linkedId={lead._id} linkedType="lead" />
          </div>
        </div>
      </div>
    </div>
  );
}
