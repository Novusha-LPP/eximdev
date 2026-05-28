import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, Edit2, Globe, MapPin, Users, 
  Briefcase, Phone, Mail, TrendingUp, Calendar, Info,
  DollarSign, Activity, Building, Copy, Check
} from 'lucide-react';
import ActivityTimeline from './ActivityTimeline';

const SkeletonRow = () => (
  <div style={{
    background: '#f8fafc',
    height: '64px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '10px',
    animation: 'pulse 1.5s infinite ease-in-out'
  }}>
    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e2e8f0' }} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ width: '35%', height: '12px', background: '#e2e8f0', borderRadius: '4px' }} />
      <div style={{ width: '20%', height: '8px', background: '#e2e8f0', borderRadius: '4px' }} />
    </div>
    <div style={{ width: '60px', height: '12px', background: '#e2e8f0', borderRadius: '4px' }} />
  </div>
);

export default function AccountDetailModal({ isOpen, onClose, account, onEdit, onRefresh }) {
  const [opportunities, setOpportunities] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('contacts');
  const [copiedText, setCopiedText] = useState(null);

  const handleCopy = (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1500);
  };
  
  // Hover states for micro-interactions
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [hoveredContactId, setHoveredContactId] = useState(null);
  const [hoveredOppId, setHoveredOppId] = useState(null);
  const [isEditHovered, setIsEditHovered] = useState(false);
  const [isCloseHovered, setIsCloseHovered] = useState(false);

  // Responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen && account?._id) {
      fetchDetails();
      setActiveTab('contacts'); // Reset to first tab when opening
    }
  }, [isOpen, account]);

  const fetchDetails = async () => {
    try {
      setLoadingDetails(true);
      const [oppRes, contactRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_STRING}/crm/opportunities?accountId=${account._id}`, { withCredentials: true }),
        axios.get(`${process.env.REACT_APP_API_STRING}/crm/contacts?accountId=${account._id}`, { withCredentials: true })
      ]);
      setOpportunities(oppRes.data);
      setContacts(contactRes.data);
    } catch (err) {
      console.error('Error loading details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  if (!isOpen || !account) return null;

  const getStageColor = (stage) => {
    switch (String(stage).toLowerCase()) {
      case 'won': return { bg: '#ecfdf5', text: '#059669', border: '#10b981' };
      case 'lost': return { bg: '#fef2f2', text: '#dc2626', border: '#ef4444' };
      case 'negotiation': return { bg: '#fff7ed', text: '#ea580c', border: '#f97316' };
      case 'proposal': return { bg: '#faf5ff', text: '#7c3aed', border: '#8b5cf6' };
      case 'opportunity': return { bg: '#eff6ff', text: '#2563eb', border: '#3b82f6' };
      case 'qualified': return { bg: '#f0fdfa', text: '#0d9488', border: '#14b8a6' };
      default: return { bg: '#f1f5f9', text: '#475569', border: '#64748b' };
    }
  };

  const getContactGradient = (name) => {
    const code = (name || 'C').charCodeAt(0) % 5;
    const gradients = [
      'linear-gradient(135deg, #eff6ff, #dbeafe)',
      'linear-gradient(135deg, #ecfdf5, #d1fae5)',
      'linear-gradient(135deg, #faf5ff, #f3e8ff)',
      'linear-gradient(135deg, #fff7ed, #ffedd5)',
      'linear-gradient(135deg, #fdf2f8, #fce7f3)',
    ];
    const textColors = ['#1e40af', '#065f46', '#6b21a8', '#9a3412', '#9d174d'];
    return { bg: gradients[code], text: textColors[code] };
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: isMobile ? '0' : '20px',
      transition: 'all 0.3s ease'
    }}>
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes modalAppear {
          from { opacity: 0; transform: scale(0.96) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .custom-scroll::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      <div style={{
        background: '#ffffff',
        width: '100%',
        maxWidth: isMobile ? '100%' : '900px',
        height: isMobile ? '100%' : '580px',
        borderRadius: isMobile ? '0' : '24px',
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        border: isMobile ? 'none' : '1px solid #e2e8f0',
        animation: 'modalAppear 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Left column / Sidebar */}
        <div style={{
          width: isMobile ? '100%' : '320px',
          background: '#f8fafc',
          borderRight: isMobile ? 'none' : '1px solid #e2e8f0',
          borderBottom: isMobile ? '1px solid #e2e8f0' : 'none',
          padding: isMobile ? '24px 20px 16px 20px' : '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          overflowY: isMobile ? 'visible' : 'auto',
          flexShrink: 0
        }}>
          {/* Avatar and name */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: isMobile ? 'center' : 'flex-start', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #4f46e5, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 800,
              fontSize: '1.5rem',
              boxShadow: '0 10px 20px -5px rgba(79, 70, 229, 0.3)',
              flexShrink: 0
            }}>
              {(account.name?.[0] || 'A').toUpperCase()}
            </div>
            <div>
              <h3 style={{
                margin: '0 0 6px 0',
                color: '#0f172a',
                fontWeight: 800,
                fontSize: '1.25rem',
                lineHeight: '1.3',
                letterSpacing: '-0.02em'
              }}>
                {account.name}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                <span style={{
                  fontSize: '0.7rem',
                  color: '#4f46e5',
                  background: '#eff6ff',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em'
                }}>
                  {account.industry || 'No Industry'}
                </span>
                {account.size && (
                  <span style={{
                    fontSize: '0.7rem',
                    color: '#0d9488',
                    background: '#f0fdfa',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em'
                  }}>
                    {account.size}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!isMobile && <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />}

          {/* Quick info list */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr', 
            gap: '16px' 
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Website</span>
              {account.website ? (
                <a 
                  href={account.website.startsWith('http') ? account.website : `https://${account.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ 
                    color: '#2563eb', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    width: 'fit-content'
                  }}
                >
                  <Globe size={14} style={{ color: '#3b82f6' }} /> 
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '150px' }}>
                    {account.website.replace(/^https?:\/\/(www\.)?/, '')}
                  </span>
                </a>
              ) : (
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>N/A</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Annual Revenue</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a', fontWeight: 700, fontSize: '0.95rem' }}>
                <DollarSign size={14} style={{ color: '#0d9488' }} />
                <span>₹{account.annualRevenue ? parseFloat(account.annualRevenue).toLocaleString('en-IN') : '0'}</span>
              </div>
            </div>

            {account.address && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: isMobile ? 'span 2' : 'span 1' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Address</span>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: '#475569', fontSize: '0.8rem', lineHeight: '1.4', fontWeight: 500 }}>
                  <MapPin size={14} style={{ color: '#ef4444', marginTop: '2px', flexShrink: 0 }} />
                  <span>{account.address}</span>
                </div>
              </div>
            )}
          </div>

          {!isMobile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
              <div 
                onClick={() => setActiveTab('contacts')}
                onMouseEnter={() => setHoveredCard('contacts')}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  background: activeTab === 'contacts' ? '#ffffff' : '#f1f5f9',
                  border: activeTab === 'contacts' ? '1px solid #cbd5e1' : '1px solid transparent',
                  borderLeft: '4px solid #10b981',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transform: hoveredCard === 'contacts' ? 'translateY(-1px)' : 'none',
                  boxShadow: activeTab === 'contacts' || hoveredCard === 'contacts' ? '0 4px 12px rgba(15, 23, 42, 0.05)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Users size={16} style={{ color: '#10b981' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Contacts</span>
                </div>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{contacts.length}</span>
              </div>

              <div 
                onClick={() => setActiveTab('opportunities')}
                onMouseEnter={() => setHoveredCard('opportunities')}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  background: activeTab === 'opportunities' ? '#ffffff' : '#f1f5f9',
                  border: activeTab === 'opportunities' ? '1px solid #cbd5e1' : '1px solid transparent',
                  borderLeft: '4px solid #3b82f6',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transform: hoveredCard === 'opportunities' ? 'translateY(-1px)' : 'none',
                  boxShadow: activeTab === 'opportunities' || hoveredCard === 'opportunities' ? '0 4px 12px rgba(15, 23, 42, 0.05)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <TrendingUp size={16} style={{ color: '#3b82f6' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Opportunities</span>
                </div>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{opportunities.length}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right column / Main Content Area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: isMobile ? 'auto' : '100%',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: isMobile ? '12px 20px' : '24px 32px 16px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: isMobile ? 'none' : '1px solid #e2e8f0',
            flexShrink: 0
          }}>
            {!isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={16} style={{ color: '#4f46e5' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Account Workspace
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: 'auto' }}>
              <button
                onClick={() => {
                  onEdit(account);
                  onClose();
                }}
                onMouseEnter={() => setIsEditHovered(true)}
                onMouseLeave={() => setIsEditHovered(false)}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  boxShadow: isEditHovered ? '0 4px 12px rgba(16,185,129,0.3)' : '0 2px 8px rgba(16,185,129,0.15)',
                  transform: isEditHovered ? 'translateY(-1px)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <Edit2 size={14} /> Edit Account
              </button>
              <button 
                onClick={onClose} 
                onMouseEnter={() => setIsCloseHovered(true)}
                onMouseLeave={() => setIsCloseHovered(false)}
                style={{
                  background: isCloseHovered ? '#f1f5f9' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: isCloseHovered ? 'scale(1.05)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Tabs bar */}
          <div style={{ 
            display: 'flex', 
            gap: isMobile ? '12px' : '24px', 
            borderBottom: '1px solid #e2e8f0', 
            padding: isMobile ? '0 20px' : '0 32px',
            overflowX: 'auto',
            flexShrink: 0
          }}>
            {[
              { id: 'contacts', label: 'Contacts', count: contacts.length, icon: Users },
              { id: 'opportunities', label: 'Opportunities', count: opportunities.length, icon: TrendingUp },
              { id: 'timeline', label: 'Timeline', count: null, icon: Activity }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isHovered = hoveredTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  onMouseEnter={() => setHoveredTab(tab.id)}
                  onMouseLeave={() => setHoveredTab(null)}
                  style={{
                    padding: '12px 4px',
                    border: 'none',
                    background: 'transparent',
                    borderBottom: isActive ? '3px solid #4f46e5' : '3px solid transparent',
                    color: isActive ? '#4f46e5' : isHovered ? '#0f172a' : '#64748b',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Icon size={14} style={{ color: isActive ? '#4f46e5' : '#64748b' }} />
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 6px',
                      borderRadius: '9999px',
                      background: isActive ? '#eff6ff' : '#f1f5f9',
                      color: isActive ? '#2563eb' : '#64748b',
                      fontWeight: 700,
                      transition: 'all 0.2s ease'
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Scrollable Tab contents */}
          <div 
            className="custom-scroll"
            style={{ 
              flex: 1, 
              padding: isMobile ? '20px' : '24px 32px 32px 32px', 
              overflowY: 'auto'
            }}
          >
            {loadingDetails ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeIn 0.2s ease' }}>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </div>
            ) : (
              <div>
                {activeTab === 'contacts' && (
                  <div style={{ display: 'grid', gap: '12px', animation: 'fadeIn 0.2s ease' }}>
                    {contacts.length > 0 ? (
                      contacts.map(contact => {
                        const contactFullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed Contact';
                        const contactInitials = `${contact.firstName?.[0]||''}${contact.lastName?.[0]||''}`.toUpperCase() || 'C';
                        const colors = getContactGradient(contactFullName);
                        const isHovered = hoveredContactId === contact._id;
                        return (
                          <div 
                            key={contact._id}
                            onMouseEnter={() => setHoveredContactId(contact._id)}
                            onMouseLeave={() => setHoveredContactId(null)}
                            style={{ 
                              background: '#ffffff', 
                              padding: '14px 18px', 
                              borderRadius: '16px', 
                              border: isHovered ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
                              transform: isHovered ? 'translateY(-1px)' : 'none',
                              boxShadow: isHovered ? '0 4px 12px rgba(15, 23, 42, 0.04)' : '0 2px 4px rgba(15, 23, 42, 0.01)',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ 
                                width: '38px', 
                                height: '38px', 
                                borderRadius: '10px', 
                                background: colors.bg, 
                                color: colors.text, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.9rem'
                              }}>
                                {contactInitials}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{contactFullName}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Briefcase size={11} style={{ color: '#94a3b8' }} /> 
                                  <span>{contact.title || 'Contact Person'}</span>
                                </div>
                              </div>
                            </div>                             <div style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: '6px', 
                              alignItems: 'flex-end'
                            }}>
                              {contact.email && (
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '8px', 
                                  background: '#eff6ff', 
                                  padding: '4px 10px', 
                                  borderRadius: '8px',
                                  fontSize: '0.8rem',
                                  border: '1px solid #dbeafe',
                                  color: '#1e40af'
                                }}>
                                  <Mail size={12} style={{ color: '#2563eb' }} />
                                  <span style={{ color: '#2563eb', fontWeight: 600 }}>
                                    {contact.email}
                                  </span>
                                  <button 
                                    onClick={() => handleCopy(contact.email)}
                                    style={{ 
                                      background: 'none', 
                                      border: 'none', 
                                      cursor: 'pointer', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      color: copiedText === contact.email ? '#10b981' : '#94a3b8', 
                                      padding: '2px',
                                      marginLeft: '4px',
                                      transition: 'color 0.2s ease'
                                    }}
                                    title="Copy Email"
                                  >
                                    {copiedText === contact.email ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                                  </button>
                                </div>
                              )}
                              {contact.phone && (
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '8px', 
                                  background: '#ecfdf5', 
                                  padding: '4px 10px', 
                                  borderRadius: '8px',
                                  fontSize: '0.8rem',
                                  border: '1px solid #d1fae5',
                                  color: '#065f46'
                                }}>
                                  <Phone size={12} style={{ color: '#10b981' }} />
                                  <span style={{ color: '#10b981', fontWeight: 600 }}>
                                    {contact.phone}
                                  </span>
                                  <button 
                                    onClick={() => handleCopy(contact.phone)}
                                    style={{ 
                                      background: 'none', 
                                      border: 'none', 
                                      cursor: 'pointer', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      color: copiedText === contact.phone ? '#10b981' : '#94a3b8', 
                                      padding: '2px',
                                      marginLeft: '4px',
                                      transition: 'color 0.2s ease'
                                    }}
                                    title="Copy Phone"
                                  >
                                    {copiedText === contact.phone ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                                  </button>
                                </div>
                              )}
                              {!contact.email && !contact.phone && (
                                <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>No contact details</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '40px 20px', 
                        background: '#f8fafc', 
                        borderRadius: '16px', 
                        border: '1px dashed #cbd5e1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px'
                      }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                          <Users size={18} />
                        </div>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', color: '#1e293b', fontWeight: 700, fontSize: '0.9rem' }}>No contacts found</h4>
                          <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>Add contacts to this account to start building relationships.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'opportunities' && (
                  <div style={{ display: 'grid', gap: '12px', animation: 'fadeIn 0.2s ease' }}>
                    {opportunities.length > 0 ? (
                      opportunities.map(opp => {
                        const stageStyles = getStageColor(opp.stage);
                        const isHovered = hoveredOppId === opp._id;
                        return (
                          <div 
                            key={opp._id}
                            onMouseEnter={() => setHoveredOppId(opp._id)}
                            onMouseLeave={() => setHoveredOppId(null)}
                            style={{ 
                              background: '#ffffff', 
                              padding: '14px 18px', 
                              borderRadius: '16px', 
                              border: isHovered ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
                              borderLeft: `5px solid ${stageStyles.border}`,
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              transform: isHovered ? 'translateY(-1px)' : 'none',
                              boxShadow: isHovered ? '0 4px 12px rgba(15, 23, 42, 0.04)' : '0 2px 4px rgba(15, 23, 42, 0.01)',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{opp.name}</div>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                                <span style={{ 
                                  fontSize: '0.65rem', 
                                  background: stageStyles.bg, 
                                  color: stageStyles.text, 
                                  padding: '1px 6px', 
                                  borderRadius: '6px',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.02em'
                                }}>
                                  {opp.stage || 'Unknown'}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <TrendingUp size={11} style={{ color: '#94a3b8' }} /> 
                                  <span>{opp.probability || 0}% probability</span>
                                </span>
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, color: '#4f46e5', fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
                                ₹{parseFloat(opp.value || 0).toLocaleString('en-IN')}
                              </div>
                              {opp.closeDate && (
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
                                  <Calendar size={11} /> 
                                  <span>Est: {new Date(opp.closeDate).toLocaleDateString('en-IN')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '40px 20px', 
                        background: '#f8fafc', 
                        borderRadius: '16px', 
                        border: '1px dashed #cbd5e1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px'
                      }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                          <TrendingUp size={18} />
                        </div>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', color: '#1e293b', fontWeight: 700, fontSize: '0.9rem' }}>No opportunities found</h4>
                          <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>Create pipeline deals or opportunities for this account.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'timeline' && (
                  <div style={{ animation: 'fadeIn 0.2s ease' }}>
                    <ActivityTimeline linkedId={account._id} linkedType="account" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

