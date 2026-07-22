import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import { message } from 'antd';

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

const SOURCES = [
  'Web / Own Generated Lead',
  'IndiaMart Lead',
  'Direct Sales Visit',
  'Referral',
  'Email Campaign',
  'Other'
];

// Sources specific to the Transportation business vertical
const TRANSPORT_SOURCES = [
  'CHA (Custom House Agent)',
  'Freight Forwarder',
  'Importer',
  'Exporter',
  'Other'
];

// All known named sources across both verticals (used to detect custom "Other" text)
const ALL_STANDARD_SOURCES = [
  'Web / Own Generated Lead', 'IndiaMart Lead', 'Direct Sales Visit',
  'Referral', 'Email Campaign',
  'CHA (Custom House Agent)', 'Freight Forwarder', 'Importer', 'Exporter'
];

export default function LeadFormModal({ isOpen, onClose, onRefresh, leadToDuplicate, leadToEdit }) {
  const currentUser = JSON.parse(localStorage.getItem('exim_user') || '{}');
  const currentUserId = currentUser._id || currentUser.id || '';
  const [users, setUsers] = useState([]);

  const [formData, setFormData] = useState({
    company: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    source: 'Web / Own Generated Lead',
    businessVertical: 'Paramount',
    ownerId: '',
    interestedServices: [],
    crateSize: '',
    shipper: '',
    stuffing: '',
    shippingLine: '',
    shipmentType: '',
    pol: '',
    pod: '',
    containerType: '',
    containerWeight: '',
    containerVolume: '',
    paymentTerm: '',
    detentionFreeDays: '',
    transitTime: '',
    currentFreightIndications: '',
    referralSourceName: '',
    monthlyVolume: '',
    monthlyRevenue: ''
  });
  const [customSource, setCustomSource] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        try {
          const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-all-users`, getHeaders());
          setUsers(res.data || []);
        } catch (err) {
          console.error('Failed to load users list in lead form modal:', err);
        }
      };
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const activeLead = leadToEdit || leadToDuplicate;
      if (activeLead) {
        setFormData({
          company: activeLead.company || '',
          firstName: activeLead.firstName || '',
          lastName: activeLead.lastName || '',
          email: activeLead.email || '',
          phone: activeLead.phone || '',
          source: activeLead.source || 'Web / Own Generated Lead',
          businessVertical: activeLead.businessVertical || 'Paramount',
          ownerId: activeLead.ownerId?._id || activeLead.ownerId || '',
          interestedServices: activeLead.interestedServices || [],
          crateSize: activeLead.crateSize || '',
          shipper: activeLead.shipper || '',
          stuffing: activeLead.stuffing || '',
          shippingLine: activeLead.shippingLine || '',
          shipmentType: activeLead.shipmentType || '',
          pol: activeLead.pol || '',
          pod: activeLead.pod || '',
          containerType: activeLead.containerType || '',
          containerWeight: activeLead.containerWeight || '',
          containerVolume: activeLead.containerVolume || '',
          paymentTerm: activeLead.paymentTerm || '',
          detentionFreeDays: activeLead.detentionFreeDays || '',
          transitTime: activeLead.transitTime || '',
          currentFreightIndications: activeLead.currentFreightIndications || '',
          referralSourceName: activeLead.referralSourceName || '',
          monthlyVolume: activeLead.monthlyVolume || '',
          monthlyRevenue: activeLead.monthlyRevenue || ''
        });
        const standardSources = ALL_STANDARD_SOURCES;
        if (activeLead.source && !standardSources.includes(activeLead.source)) {
          setCustomSource(activeLead.source);
        } else {
          setCustomSource('');
        }
      } else {
        setFormData({
          company: '',
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          source: 'Web / Own Generated Lead',
          businessVertical: 'Paramount',
          ownerId: currentUserId || '',
          interestedServices: [],
          crateSize: '',
          shipper: '',
          stuffing: '',
          shippingLine: '',
          shipmentType: '',
          pol: '',
          pod: '',
          containerType: '',
          containerWeight: '',
          containerVolume: '',
          paymentTerm: '',
          detentionFreeDays: '',
          transitTime: '',
          currentFreightIndications: '',
          referralSourceName: '',
          monthlyVolume: '',
          monthlyRevenue: ''
        });
        setCustomSource('');
      }
    }
  }, [isOpen, leadToDuplicate, leadToEdit, currentUserId]);

  if (!isOpen) return null;

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (leadToEdit) {
        await axios.put(`${process.env.REACT_APP_API_STRING}/crm/leads/${leadToEdit._id}`, formData, getHeaders());
        message.success("Lead updated successfully!");
      } else {
        await axios.post(`${process.env.REACT_APP_API_STRING}/crm/leads`, formData, getHeaders());
        message.success("Lead created successfully!");
      }
      onRefresh();
      onClose();
    } catch (error) {
      message.error((leadToEdit ? "Error updating lead: " : "Error creating lead: ") + (error.response?.data?.message || error.message));
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
        maxWidth: '800px',
        maxHeight: '90vh',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: 'modalOpen 0.3s ease-out'
      }}>
        <style>{`
          @keyframes modalOpen {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          .modal-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .modal-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
          }
          .modal-scroll::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
          }
          .modal-scroll::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>
        
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <h3 style={{ margin: 0, color: '#1e293b', fontWeight: 700, fontSize: '1.25rem' }}>
            {leadToEdit ? 'Edit Lead' : leadToDuplicate ? 'Duplicate Lead' : 'Create New Lead'}
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
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', margin: 0 }}>
          <div className="modal-scroll" style={{ 
            padding: '24px', 
            overflowY: 'auto', 
            flex: 1, 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '20px 24px' 
          }}>
            {/* Company */}
            <div style={{ gridColumn: 'span 2' }}>
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
            <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
            <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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

            {/* Business Vertical */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Business Vertical *</label>
              <select
                value={formData.businessVertical || 'Paramount'}
                onChange={e => {
                  const vertical = e.target.value;
                  const isTrans = vertical === 'Transportation';
                  const defaultSource = isTrans ? 'CHA (Custom House Agent)' : 'Web / Own Generated Lead';
                  setFormData({
                    ...formData,
                    businessVertical: vertical,
                    source: defaultSource
                  });
                  setCustomSource('');
                }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', background: '#fff' }}
              >
                <option value="Paramount">Paramount</option>
                <option value="Transportation">Transportation</option>
                <option value="Customs Clearance">Customs Clearance</option>
                <option value="Export">Export</option>
                <option value="Import">Import</option>
              </select>
            </div>

            {/* Source */}
            {(() => {
              const isTransportation = formData.businessVertical === 'Transportation';
              const activeSources = isTransportation ? TRANSPORT_SOURCES : SOURCES;
              const isCustom = formData.source && !ALL_STANDARD_SOURCES.includes(formData.source) && formData.source !== 'Other';
              const selectedVal = isCustom ? 'Other' : (formData.source || activeSources[0]);
              return (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                    Lead Source
                    {isTransportation && (
                      <span style={{ marginLeft: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#7c3aed', background: '#ede9fe', padding: '2px 8px', borderRadius: '99px' }}>Transportation</span>
                    )}
                  </label>
                  <select
                    value={selectedVal}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === 'Other') {
                        setFormData({...formData, source: customSource || 'Other'});
                      } else {
                        setCustomSource('');
                        setFormData({...formData, source: val});
                      }
                    }}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', background: '#fff' }}
                  >
                    {activeSources.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {(isCustom || selectedVal === 'Other') && (
                    <div style={{ marginTop: '8px' }}>
                      <input
                        required
                        type="text"
                        value={customSource || (formData.source === 'Other' ? '' : formData.source)}
                        onChange={e => {
                          setCustomSource(e.target.value);
                          setFormData({...formData, source: e.target.value});
                        }}
                        placeholder={isTransportation ? 'Specify transportation source...' : 'Enter custom source (e.g. LinkedIn, Exhibition)'}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                      />
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Referral Source Name (Conditional) */}
            {formData.source === 'Referral' ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Referral By (Person/Company Name) *</label>
                <input 
                  required
                  type="text"
                  value={formData.referralSourceName || ''}
                  onChange={e => setFormData({...formData, referralSourceName: e.target.value})}
                  placeholder="Who referred this lead?"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                />
              </div>
            ) : null}

            {formData.businessVertical === 'Customs Clearance' && (
              <>
                {/* Shipper */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Shipper</label>
                  <input 
                    type="text"
                    value={formData.shipper || ''}
                    onChange={e => setFormData({...formData, shipper: e.target.value})}
                    placeholder="Enter Shipper Name"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                  />
                </div>

                {/* Stuffing */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Stuffing</label>
                  <input 
                    type="text"
                    value={formData.stuffing || ''}
                    onChange={e => setFormData({...formData, stuffing: e.target.value})}
                    placeholder="Ex. Factory stuffing, Dock stuffing"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                  />
                </div>

                {/* Shipping Line */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Shipping Line</label>
                  <input 
                    type="text"
                    value={formData.shippingLine || ''}
                    onChange={e => setFormData({...formData, shippingLine: e.target.value})}
                    placeholder="Ex. Maersk, MSC"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                  />
                </div>

                {/* Shipment Type */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Shipment Type</label>
                  <input 
                    type="text"
                    value={formData.shipmentType || ''}
                    onChange={e => setFormData({...formData, shipmentType: e.target.value})}
                    placeholder="Ex. FCL, LCL"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                  />
                </div>

                {/* POL (Port of Loading) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>POL (Port of Loading)</label>
                  <input 
                    type="text"
                    value={formData.pol || ''}
                    onChange={e => setFormData({...formData, pol: e.target.value})}
                    placeholder="Ex. Nhava Sheva, Mundra"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                  />
                </div>

                {/* POD (Port of Discharge) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>POD (Port of Discharge)</label>
                  <input 
                    type="text"
                    value={formData.pod || ''}
                    onChange={e => setFormData({...formData, pod: e.target.value})}
                    placeholder="Ex. Rotterdam, Singapore"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                  />
                </div>

                {/* Container Type */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Container Type</label>
                  <input 
                    type="text"
                    value={formData.containerType || ''}
                    onChange={e => setFormData({...formData, containerType: e.target.value})}
                    placeholder="Ex. 20ft GP, 40ft HC"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                  />
                </div>

                {/* Container Weight */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Container Weight</label>
                  <input 
                    type="text"
                    value={formData.containerWeight || ''}
                    onChange={e => setFormData({...formData, containerWeight: e.target.value})}
                    placeholder="Ex. 18.5 Tons"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                  />
                </div>

                {/* Container Volume */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Container Volume</label>
                  <input 
                    type="text"
                    value={formData.containerVolume || ''}
                    onChange={e => setFormData({...formData, containerVolume: e.target.value})}
                    placeholder="Ex. 5 Containers"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                  />
                </div>

                {/* Payment Term */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Payment Term</label>
                  <input 
                    type="text"
                    value={formData.paymentTerm || ''}
                    onChange={e => setFormData({...formData, paymentTerm: e.target.value})}
                    placeholder="Ex. Net 30, CAD"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                  />
                </div>

                {/* Detention Free Days */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Detention Free Days</label>
                  <input 
                    type="text"
                    value={formData.detentionFreeDays || ''}
                    onChange={e => setFormData({...formData, detentionFreeDays: e.target.value})}
                    placeholder="Ex. 14 Days"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                  />
                </div>

                {/* Transit Time */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Transit Time</label>
                  <input 
                    type="text"
                    value={formData.transitTime || ''}
                    onChange={e => setFormData({...formData, transitTime: e.target.value})}
                    placeholder="Ex. 25 Days"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                  />
                </div>

                {/* Current Freight Indications */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Current Freight Indications</label>
                  <input 
                    type="text"
                    value={formData.currentFreightIndications || ''}
                    onChange={e => setFormData({...formData, currentFreightIndications: e.target.value})}
                    placeholder="Ex. $3500 / 40ft"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                  />
                </div>
              </>
            )}

            {formData.businessVertical === 'Transportation' && (
              <>
                {/* Monthly Volume (IN TEUs) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Monthly Volume (IN TEUs)</label>
                  <input 
                    type="text"
                    value={formData.monthlyVolume || ''}
                    onChange={e => setFormData({...formData, monthlyVolume: e.target.value})}
                    placeholder="Ex. 50 TEUs"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                  />
                </div>

                {/* Monthly Revenue */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Monthly Revenue</label>
                  <input 
                    type="text"
                    value={formData.monthlyRevenue || ''}
                    onChange={e => setFormData({...formData, monthlyRevenue: e.target.value})}
                    placeholder="Ex. $15,000"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                  />
                </div>
              </>
            )}

            {/* Crate Size */}
            {!['transportation', 'customs clearance', 'export', 'import'].includes((formData.businessVertical || '').toLowerCase()) && (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Crate Size (Optional)</label>
                <input 
                  type="text"
                  value={formData.crateSize || ''}
                  onChange={e => setFormData({...formData, crateSize: e.target.value})}
                  placeholder="Ex. 40ft x 20 units"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' }}
                />
              </div>
            )}

            {/* Services */}
            <div style={{ gridColumn: 'span 2' }}>
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

          {/* Footer */}
          <div style={{ 
            padding: '20px 24px', 
            borderTop: '1px solid #f1f5f9', 
            display: 'flex', 
            gap: '12px', 
            background: '#f8fafc' 
          }}>
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
              {isSubmitting ? (leadToEdit ? 'Updating...' : 'Creating...') : (leadToEdit ? 'Update Lead' : 'Create Lead')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
