import React, { useState } from 'react';
import { X, Edit2, User, FileText, DollarSign } from 'lucide-react';
import ActivityTimeline from './ActivityTimeline';
import QuoteFormModal from './QuoteFormModal';
import PricingRequestFormModal from './PricingRequestFormModal';

export default function LeadDetailModal({ isOpen, onClose, lead, onEdit, onRefresh }) {
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

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
              onClick={() => setIsQuoteModalOpen(true)}
              style={{ padding: '8px 12px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FileText size={16} /> Create Quote
            </button>
            <button
              onClick={() => setIsPricingModalOpen(true)}
              style={{ padding: '8px 12px', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <DollarSign size={16} /> Request Pricing
            </button>
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

          <div style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px 20px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Status</span>
              <p style={{ margin: '4px 0 0 0', color: '#1e293b', fontWeight: 600, textTransform: 'capitalize' }}>{lead.status || 'New'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Source</span>
              <p style={{ margin: '4px 0 0 0', color: '#1e293b', fontWeight: 600, textTransform: 'capitalize' }}>{lead.source || 'Unknown'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Shipper</span>
              <p style={{ margin: '4px 0 0 0', color: '#1e293b', fontWeight: 600 }}>{lead.shipper || 'N/A'}</p>
            </div>

            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Business Vertical</span>
              <p style={{ margin: '4px 0 0 0', color: '#4f46e5', fontWeight: 700 }}>{lead.businessVertical || 'Paramount'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Grade</span>
              <span style={{
                display: 'inline-block', margin: '4px 0 0 0', padding: '2px 8px',
                background: lead.grade === 'A' ? '#ecfdf5' : lead.grade === 'B' ? '#eff6ff' : lead.grade === 'C' ? '#fef3c7' : '#f1f5f9',
                color: lead.grade === 'A' ? '#10b981' : lead.grade === 'B' ? '#3b82f6' : lead.grade === 'C' ? '#d97706' : '#64748b',
                borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700
              }}>
                {lead.grade || 'D'}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Lead Score</span>
              <p style={{ margin: '4px 0 0 0', color: '#1e293b', fontWeight: 600 }}>⭐ {lead.score || 0}</p>
            </div>

            {lead.crateSize && !['transportation', 'customs clearance', 'export', 'import'].includes((lead.businessVertical || '').toLowerCase()) && (
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Crate Size</span>
                <p style={{ margin: '4px 0 0 0', color: '#1e293b', fontWeight: 600 }}>{lead.crateSize}</p>
              </div>
            )}

            {lead.source === 'Referral' && lead.referralSourceName && (
              <div style={{ gridColumn: 'span 3', marginTop: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Referral By (Person/Company Name)</span>
                <p style={{ margin: '4px 0 0 0', color: '#1e293b', fontWeight: 600 }}>{lead.referralSourceName}</p>
              </div>
            )}
          </div>

          {/* Logistics & Freight Details */}
          <div style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px 24px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ gridColumn: 'span 3', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4f46e5' }}>Logistics & Freight Details</span>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Stuffing</span>
              <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600 }}>{lead.stuffing || 'N/A'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Shipping Line</span>
              <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600 }}>{lead.shippingLine || 'N/A'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Shipment Type</span>
              <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600 }}>{lead.shipmentType || 'N/A'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>POL (Port of Loading)</span>
              <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600 }}>{lead.pol || 'N/A'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>POD (Port of Discharge)</span>
              <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600 }}>{lead.pod || 'N/A'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Container Type</span>
              <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600 }}>{lead.containerType || 'N/A'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Container Weight</span>
              <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600 }}>{lead.containerWeight || 'N/A'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Container Volume</span>
              <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600 }}>{lead.containerVolume || 'N/A'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Payment Term</span>
              <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600 }}>{lead.paymentTerm || 'N/A'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Detention Free Days</span>
              <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600 }}>{lead.detentionFreeDays || 'N/A'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Transit Time</span>
              <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600 }}>{lead.transitTime || 'N/A'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Current Freight Indications</span>
              <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600 }}>{lead.currentFreightIndications || 'N/A'}</p>
            </div>
          </div>

          {/* Transportation Details */}
          {(lead.monthlyVolume || lead.monthlyRevenue) && (
            <div style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
              <div style={{ gridColumn: 'span 2', borderBottom: '1px solid #bbf7d0', paddingBottom: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16a34a' }}>Transportation Details</span>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#166534' }}>Monthly Volume (IN TEUs)</span>
                <p style={{ margin: '4px 0 0 0', color: '#14532d', fontWeight: 600 }}>{lead.monthlyVolume || 'N/A'}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#166534' }}>Monthly Revenue</span>
                <p style={{ margin: '4px 0 0 0', color: '#14532d', fontWeight: 600 }}>{lead.monthlyRevenue || 'N/A'}</p>
              </div>
            </div>
          )}

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
      <QuoteFormModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        initialTitle={`${lead.company || `${lead.firstName} ${lead.lastName}`} - Quote`}
        initialAccountId={lead.convertedTo?.accountId || ''}
        initialContactId={lead.convertedTo?.contactId || ''}
        initialOpportunityId={lead.convertedTo?.opportunityId || ''}
        initialCompany={lead.company}
        initialEmail={lead.email}
        initialContactName={`${lead.firstName} ${lead.lastName || ''}`.trim()}
        onRefresh={onRefresh}
      />
      <PricingRequestFormModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        initialRelatedType="Lead"
        initialRelatedId={lead._id}
        initialSubject={`Pricing rate request for Lead: ${lead.company || `${lead.firstName} ${lead.lastName}`}`}
        initialTargetPrice={lead.monthlyRevenue || lead.monthlyVolume || ''}
        onRefresh={onRefresh}
      />
    </div>
  );
}
