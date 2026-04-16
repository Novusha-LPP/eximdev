import React from 'react';
import { X, Edit2, User } from 'lucide-react';
import ActivityTimeline from './ActivityTimeline';

export default function ContactDetailModal({ isOpen, onClose, contact, onEdit, onRefresh }) {
  if (!isOpen || !contact) return null;

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
            <div style={{ background: '#f59e0b', padding: '10px', borderRadius: '10px', color: 'white' }}>
              <User size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#1e293b', fontWeight: 700, fontSize: '1.2rem' }}>{contact.firstName} {contact.lastName}</h3>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{contact.title || 'Contact'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                onEdit(contact);
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
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>{contact.email || 'N/A'}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Phone</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>{contact.phone || 'N/A'}</div>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
             <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Account</span>
             <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600 }}>{typeof contact.accountId === 'object' ? contact.accountId?.name : 'No linked account'}</p>
          </div>

          {/* Activity Timeline */}
          <div style={{ marginTop: '24px' }}>
            <ActivityTimeline linkedId={contact._id} linkedType="contact" />
          </div>
        </div>
      </div>
    </div>
  );
}
