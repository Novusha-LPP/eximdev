import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  X, Plus, Trash2, Edit2, Building2, Layout, Check, Palette, Upload, Image as ImageIcon,
  Sparkles, FileText, ChevronRight, Settings, ShieldCheck, CreditCard, Layers
} from 'lucide-react';
import { message, Modal } from 'antd';

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

const ZOHO_THEMES = [
  { name: 'Zoho Classic Navy', theme: '#1e3a8a', accent: '#3b82f6', bg: '#f8fafc' },
  { name: 'Sapphire Professional', theme: '#0f172a', accent: '#0284c7', bg: '#f0f9ff' },
  { name: 'Crimson Executive', theme: '#881337', accent: '#e11d48', bg: '#fff1f2' },
  { name: 'Emerald Commerce', theme: '#064e3b', accent: '#10b981', bg: '#ecfdf5' },
  { name: 'Sleek Dark Slate', theme: '#18181b', accent: '#6366f1', bg: '#f8fafc' },
  { name: 'Warm Amber Corporate', theme: '#78350f', accent: '#d97706', bg: '#fffbeb' }
];

export default function QuotationTemplatesManager({ isOpen, onClose, onRefresh }) {
  const [activeTab, setActiveTab] = useState('templates'); // 'templates' | 'companies'

  // Data states
  const [companies, setCompanies] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Edit / Form states for Company
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    tagline: '',
    logoUrl: '',
    address: { street: '', city: '', state: '', pincode: '', country: 'India' },
    gstin: '',
    pan: '',
    cin: '',
    email: '',
    phone: '',
    website: '',
    bankDetails: { bankName: '', accountName: '', accountNumber: '', ifscCode: '', swiftCode: '', branch: '' },
    authorizedSignatory: { name: '', designation: '' },
    isDefault: false
  });

  // Edit / Form states for Template
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    templateName: '',
    companyId: '',
    description: '',
    category: 'general',
    zohoStyle: {
      themeColor: '#1e3a8a',
      accentColor: '#3b82f6',
      headerLayout: 'top_right',
      fontFamily: 'helvetica',
      showLogo: true,
      showBankDetails: true,
      showSignatory: true,
      showHsnSac: true,
      termsAndConditions: '1. Quotation valid for 30 days from issue date.\n2. Payment terms as agreed upon.\n3. Taxes extra as applicable by law.',
      footerNotes: 'Thank you for considering our services. Feel free to reach out if you have any questions.'
    },
    customColumns: [
      { key: 'cbm', label: 'Volume (CBM)', type: 'number', width: '100px', align: 'center', defaultValue: '' },
      { key: 'containerSize', label: 'Container Size', type: 'select', options: ['20FT', '40FT', '40HC', 'LCL'], width: '120px', align: 'center', defaultValue: '20FT' }
    ],
    defaultLineItems: [],
    isDefault: false
  });

  // Custom Column builder modal state inside Template Form
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [newCol, setNewCol] = useState({
    label: '',
    key: '',
    type: 'text',
    optionsStr: '',
    width: '120px',
    align: 'left',
    defaultValue: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, tempRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_STRING}/crm/quotation-companies`, getHeaders()),
        axios.get(`${process.env.REACT_APP_API_STRING}/crm/quotation-templates`, getHeaders())
      ]);
      setCompanies(compRes.data || []);
      setTemplates(tempRes.data || []);
    } catch (err) {
      console.error('Failed to load companies/templates:', err);
      message.error('Failed to load quotation configurations');
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Company Handlers ----------------
  const handleOpenCompanyModal = (comp = null) => {
    if (comp) {
      setEditingCompany(comp);
      setCompanyForm({
        name: comp.name || '',
        tagline: comp.tagline || '',
        logoUrl: comp.logoUrl || '',
        address: {
          street: comp.address?.street || '',
          city: comp.address?.city || '',
          state: comp.address?.state || '',
          pincode: comp.address?.pincode || '',
          country: comp.address?.country || 'India'
        },
        gstin: comp.gstin || '',
        pan: comp.pan || '',
        cin: comp.cin || '',
        email: comp.email || '',
        phone: comp.phone || '',
        website: comp.website || '',
        bankDetails: {
          bankName: comp.bankDetails?.bankName || '',
          accountName: comp.bankDetails?.accountName || '',
          accountNumber: comp.bankDetails?.accountNumber || '',
          ifscCode: comp.bankDetails?.ifscCode || '',
          swiftCode: comp.bankDetails?.swiftCode || '',
          branch: comp.bankDetails?.branch || ''
        },
        authorizedSignatory: {
          name: comp.authorizedSignatory?.name || '',
          designation: comp.authorizedSignatory?.designation || ''
        },
        isDefault: !!comp.isDefault
      });
    } else {
      setEditingCompany(null);
      setCompanyForm({
        name: '',
        tagline: '',
        logoUrl: '',
        address: { street: '', city: '', state: '', pincode: '', country: 'India' },
        gstin: '',
        pan: '',
        cin: '',
        email: '',
        phone: '',
        website: '',
        bankDetails: { bankName: '', accountName: '', accountNumber: '', ifscCode: '', swiftCode: '', branch: '' },
        authorizedSignatory: { name: '', designation: '' },
        isDefault: companies.length === 0
      });
    }
    setIsCompanyModalOpen(true);
  };

  const handleLogoFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      message.error('Logo image must be smaller than 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCompanyForm(prev => ({ ...prev, logoUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCompany = async () => {
    if (!companyForm.name.trim()) {
      message.error('Company Name is required');
      return;
    }
    try {
      if (editingCompany) {
        await axios.put(
          `${process.env.REACT_APP_API_STRING}/crm/quotation-companies/${editingCompany._id}`,
          companyForm,
          getHeaders()
        );
        message.success('Company profile updated successfully');
      } else {
        await axios.post(
          `${process.env.REACT_APP_API_STRING}/crm/quotation-companies`,
          companyForm,
          getHeaders()
        );
        message.success('Company profile created successfully');
      }
      setIsCompanyModalOpen(false);
      fetchData();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to save company:', err);
      message.error(err.response?.data?.message || 'Failed to save company profile');
    }
  };

  const handleDeleteCompany = async (id) => {
    Modal.confirm({
      title: 'Delete Company Profile?',
      content: 'Are you sure you want to delete this company profile? Templates linked to it will need a new company selected.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await axios.delete(`${process.env.REACT_APP_API_STRING}/crm/quotation-companies/${id}`, getHeaders());
          message.success('Company profile deleted');
          fetchData();
          if (onRefresh) onRefresh();
        } catch (err) {
          message.error('Failed to delete company profile');
        }
      }
    });
  };

  // ---------------- Template Handlers ----------------
  const handleOpenTemplateModal = (temp = null) => {
    if (temp) {
      setEditingTemplate(temp);
      setTemplateForm({
        templateName: temp.templateName || '',
        companyId: temp.companyId?._id || temp.companyId || (companies[0]?._id || ''),
        description: temp.description || '',
        category: temp.category || 'general',
        zohoStyle: {
          themeColor: temp.zohoStyle?.themeColor || '#1e3a8a',
          accentColor: temp.zohoStyle?.accentColor || '#3b82f6',
          headerLayout: temp.zohoStyle?.headerLayout || 'top_right',
          fontFamily: temp.zohoStyle?.fontFamily || 'helvetica',
          showLogo: temp.zohoStyle?.showLogo !== false,
          showBankDetails: temp.zohoStyle?.showBankDetails !== false,
          showSignatory: temp.zohoStyle?.showSignatory !== false,
          showHsnSac: temp.zohoStyle?.showHsnSac !== false,
          termsAndConditions: temp.zohoStyle?.termsAndConditions || '1. Quotation valid for 30 days from issue date.',
          footerNotes: temp.zohoStyle?.footerNotes || 'Thank you for considering our services.'
        },
        customColumns: temp.customColumns || [],
        defaultLineItems: temp.defaultLineItems || [],
        isDefault: !!temp.isDefault
      });
    } else {
      setEditingTemplate(null);
      const defaultCompId = companies.find(c => c.isDefault)?._id || companies[0]?._id || '';
      setTemplateForm({
        templateName: '',
        companyId: defaultCompId,
        description: '',
        category: 'general',
        zohoStyle: {
          themeColor: '#1e3a8a',
          accentColor: '#3b82f6',
          headerLayout: 'top_right',
          fontFamily: 'helvetica',
          showLogo: true,
          showBankDetails: true,
          showSignatory: true,
          showHsnSac: true,
          termsAndConditions: '1. Quotation valid for 30 days from issue date.\n2. Payment terms as agreed upon.\n3. Taxes extra as applicable by law.',
          footerNotes: 'Thank you for considering our services. Feel free to reach out if you have any questions.'
        },
        customColumns: [
          { key: 'cbm', label: 'Volume (CBM)', type: 'number', width: '100px', align: 'center', defaultValue: '' },
          { key: 'containerSize', label: 'Container Size', type: 'select', options: ['20FT', '40FT', '40HC', 'LCL'], width: '120px', align: 'center', defaultValue: '20FT' }
        ],
        defaultLineItems: [],
        isDefault: templates.length === 0
      });
    }
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.templateName.trim()) {
      message.error('Template Name is required');
      return;
    }
    if (!templateForm.companyId) {
      message.error('Please select a Company for this template');
      return;
    }
    try {
      if (editingTemplate) {
        await axios.put(
          `${process.env.REACT_APP_API_STRING}/crm/quotation-templates/${editingTemplate._id}`,
          templateForm,
          getHeaders()
        );
        message.success('Quotation template updated successfully');
      } else {
        await axios.post(
          `${process.env.REACT_APP_API_STRING}/crm/quotation-templates`,
          templateForm,
          getHeaders()
        );
        message.success('Quotation template created successfully');
      }
      setIsTemplateModalOpen(false);
      fetchData();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to save template:', err);
      message.error(err.response?.data?.message || 'Failed to save quotation template');
    }
  };

  const handleDeleteTemplate = async (id) => {
    Modal.confirm({
      title: 'Delete Quotation Template?',
      content: 'Are you sure you want to delete this template?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await axios.delete(`${process.env.REACT_APP_API_STRING}/crm/quotation-templates/${id}`, getHeaders());
          message.success('Template deleted');
          fetchData();
          if (onRefresh) onRefresh();
        } catch (err) {
          message.error('Failed to delete template');
        }
      }
    });
  };

  // Add custom column to current template form
  const handleAddCustomColumn = () => {
    if (!newCol.label.trim()) {
      message.error('Column Header Label is required');
      return;
    }
    const generatedKey = newCol.key.trim()
      ? newCol.key.trim()
      : newCol.label.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    const opts = newCol.optionsStr ? newCol.optionsStr.split(',').map(s => s.trim()).filter(Boolean) : [];

    const colObj = {
      key: generatedKey,
      label: newCol.label.trim(),
      type: newCol.type,
      options: opts,
      width: newCol.width || '120px',
      align: newCol.align || 'left',
      defaultValue: newCol.defaultValue || ''
    };

    setTemplateForm(prev => ({
      ...prev,
      customColumns: [...prev.customColumns.filter(c => c.key !== generatedKey), colObj]
    }));

    setNewCol({ label: '', key: '', type: 'text', optionsStr: '', width: '120px', align: 'left', defaultValue: '' });
    setIsColumnModalOpen(false);
    message.success(`Column '${colObj.label}' added to line items!`);
  };

  const handleRemoveCustomColumn = (keyToRemove) => {
    setTemplateForm(prev => ({
      ...prev,
      customColumns: prev.customColumns.filter(c => c.key !== keyToRemove)
    }));
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px'
    }}>
      <div style={{
        background: '#fff', width: '100%', maxWidth: '1050px', maxHeight: '92vh',
        borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        {/* Top Header */}
        <div style={{
          padding: '20px 28px', borderBottom: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                <Layout size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: '1.2rem', letterSpacing: '-0.3px' }}>
                  Quotation Branding & Templates Center
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                  Manage company profiles, logos, Zoho-inspired styles & custom dynamic table columns
                </p>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#cbd5e1', padding: '8px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div style={{ background: '#f8fafc', padding: '12px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('templates')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '9px 18px', borderRadius: '10px', border: 'none',
                fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer',
                background: activeTab === 'templates' ? '#1e3a8a' : 'transparent',
                color: activeTab === 'templates' ? '#fff' : '#64748b',
                transition: 'all 0.2s'
              }}
            >
              <Layout size={16} /> Quotation Templates ({templates.length})
            </button>

            <button
              onClick={() => setActiveTab('companies')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '9px 18px', borderRadius: '10px', border: 'none',
                fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer',
                background: activeTab === 'companies' ? '#1e3a8a' : 'transparent',
                color: activeTab === 'companies' ? '#fff' : '#64748b',
                transition: 'all 0.2s'
              }}
            >
              <Building2 size={16} /> Company Profiles ({companies.length})
            </button>
          </div>

          <div>
            {activeTab === 'templates' ? (
              <button
                onClick={() => handleOpenTemplateModal()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '10px',
                  fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                }}
              >
                <Plus size={16} /> Create Template
              </button>
            ) : (
              <button
                onClick={() => handleOpenCompanyModal()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '10px',
                  fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                }}
              >
                <Plus size={16} /> Add Company Profile
              </button>
            )}
          </div>
        </div>

        {/* Tab Body Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: '#ffffff' }}>
          
          {/* TAB 1: TEMPLATES */}
          {activeTab === 'templates' && (
            <div>
              {templates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', border: '2px dashed #cbd5e1', borderRadius: '16px', background: '#f8fafc' }}>
                  <Layout size={48} style={{ color: '#94a3b8', marginBottom: '12px' }} />
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#334155' }}>No Quotation Templates Created Yet</h4>
                  <p style={{ margin: '0 0 20px 0', fontSize: '0.88rem', color: '#64748b', maxWidth: '450px', marginLeft: 'auto', marginRight: 'auto' }}>
                    Create custom quotation templates bound to your company profiles, complete with custom Zoho themes and dynamic quote line item columns!
                  </p>
                  <button
                    onClick={() => handleOpenTemplateModal()}
                    style={{ background: '#1e3a8a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    + Create First Template
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '20px' }}>
                  {templates.map(temp => {
                    const linkedCompany = temp.companyId || {};
                    const themeColor = temp.zohoStyle?.themeColor || '#1e3a8a';
                    const customColsCount = temp.customColumns?.length || 0;

                    return (
                      <div
                        key={temp._id}
                        style={{
                          borderRadius: '16px', border: '1px solid #e2e8f0', background: '#fff',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04)', overflow: 'hidden',
                          display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', position: 'relative'
                        }}
                      >
                        {/* Color Banner */}
                        <div style={{ background: themeColor, height: '8px', width: '100%' }}></div>

                        <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                                  {temp.templateName}
                                </h4>
                                {temp.isDefault && (
                                  <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                                    Default
                                  </span>
                                )}
                              </div>
                              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                {temp.description || 'Custom quotation template'}
                              </p>
                            </div>
                          </div>

                          {/* Linked Company */}
                          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {linkedCompany.logoUrl ? (
                              <img src={linkedCompany.logoUrl} alt="Logo" style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '4px' }} />
                            ) : (
                              <Building2 size={20} style={{ color: '#3b82f6' }} />
                            )}
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Linked Company</div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{linkedCompany.name || 'No Company Linked'}</div>
                            </div>
                          </div>

                          {/* Dynamic Custom Columns Tags */}
                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                              LINE ITEM CUSTOM COLUMNS ({customColsCount})
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              <span style={{ background: '#e2e8f0', color: '#475569', fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>Standard (Qty, Price, Tax)</span>
                              {(temp.customColumns || []).map(c => (
                                <span key={c.key} style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                                  + {c.label}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Action Footer */}
                          <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              Theme: <strong style={{ color: themeColor }}>● {ZOHO_THEMES.find(t => t.theme === themeColor)?.name || 'Custom'}</strong>
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => handleOpenTemplateModal(temp)}
                                style={{ background: '#f1f5f9', color: '#334155', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Edit2 size={14} /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTemplate(temp._id)}
                                style={{ background: '#fef2f2', color: '#dc2626', border: 'none', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COMPANIES */}
          {activeTab === 'companies' && (
            <div>
              {companies.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', border: '2px dashed #cbd5e1', borderRadius: '16px', background: '#f8fafc' }}>
                  <Building2 size={48} style={{ color: '#94a3b8', marginBottom: '12px' }} />
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#334155' }}>No Company Profiles Added Yet</h4>
                  <p style={{ margin: '0 0 20px 0', fontSize: '0.88rem', color: '#64748b', maxWidth: '450px', marginLeft: 'auto', marginRight: 'auto' }}>
                    Add company entities with logos, addresses, bank accounts, and GST details to issue quotations under different business units.
                  </p>
                  <button
                    onClick={() => handleOpenCompanyModal()}
                    style={{ background: '#059669', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    + Add First Company
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                  {companies.map(comp => (
                    <div
                      key={comp._id}
                      style={{
                        borderRadius: '16px', border: '1px solid #e2e8f0', background: '#fff',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04)', padding: '20px',
                        display: 'flex', flexDirection: 'column', gap: '14px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {comp.logoUrl ? (
                          <div style={{ width: '54px', height: '54px', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '4px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src={comp.logoUrl} alt={comp.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                          </div>
                        ) : (
                          <div style={{ width: '54px', height: '54px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.2rem' }}>
                            {comp.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>{comp.name}</h4>
                            {comp.isDefault && (
                              <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>Default</span>
                            )}
                          </div>
                          {comp.tagline && <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>{comp.tagline}</p>}
                          {comp.gstin && <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>GSTIN: {comp.gstin}</p>}
                        </div>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px', background: '#f8fafc', padding: '12px', borderRadius: '10px' }}>
                        <div>📍 {[comp.address?.street, comp.address?.city, comp.address?.state].filter(Boolean).join(', ') || 'No address specified'}</div>
                        {comp.phone && <div>📞 {comp.phone} | ✉️ {comp.email || 'N/A'}</div>}
                        {comp.bankDetails?.bankName && <div>🏦 {comp.bankDetails.bankName} (A/C: {comp.bankDetails.accountNumber})</div>}
                      </div>

                      <div style={{ marginTop: 'auto', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => handleOpenCompanyModal(comp)}
                          style={{ background: '#f1f5f9', color: '#334155', border: 'none', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Edit2 size={14} /> Edit Profile
                        </button>
                        <button
                          onClick={() => handleDeleteCompany(comp._id)}
                          style={{ background: '#fef2f2', color: '#dc2626', border: 'none', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* COMPANY EDIT/CREATE MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isCompanyModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '750px', maxHeight: '90vh', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '1.1rem' }}>
                {editingCompany ? 'Edit Company Profile' : 'Add New Company Entity'}
              </h3>
              <button onClick={() => setIsCompanyModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Logo Upload Section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {companyForm.logoUrl ? (
                    <img src={companyForm.logoUrl} alt="Logo preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <ImageIcon size={32} style={{ color: '#cbd5e1' }} />
                  )}
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>COMPANY LOGO</label>
                  <input type="file" accept="image/*" onChange={handleLogoFileUpload} id="logo-input-file" style={{ display: 'none' }} />
                  <label htmlFor="logo-input-file" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#1e3a8a', color: '#fff', padding: '7px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                    <Upload size={14} /> Upload Logo Image
                  </label>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>Supports PNG, JPG, WebP (Max 2MB)</p>
                </div>
              </div>

              {/* Basic Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>COMPANY NAME *</label>
                  <input
                    type="text" required placeholder="Ex. Paramount Propack Pvt Ltd"
                    value={companyForm.name}
                    onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>TAGLINE / SUBTITLE</label>
                  <input
                    type="text" placeholder="Ex. Premium Packaging Solutions"
                    value={companyForm.tagline}
                    onChange={e => setCompanyForm({ ...companyForm, tagline: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              {/* GST & Tax Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>GSTIN / TAX NO</label>
                  <input
                    type="text" placeholder="24AAHCP4599D1Z8"
                    value={companyForm.gstin}
                    onChange={e => setCompanyForm({ ...companyForm, gstin: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>PAN NO</label>
                  <input
                    type="text" placeholder="AAHCP4599D"
                    value={companyForm.pan}
                    onChange={e => setCompanyForm({ ...companyForm, pan: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>CIN (Optional)</label>
                  <input
                    type="text" placeholder="U25202GJ2018PTC..."
                    value={companyForm.cin}
                    onChange={e => setCompanyForm({ ...companyForm, cin: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>STREET ADDRESS</label>
                <input
                  type="text" placeholder="A-306, Wall Street 2, Opp. Orient Club, Ellis Bridge"
                  value={companyForm.address.street}
                  onChange={e => setCompanyForm({ ...companyForm, address: { ...companyForm.address, street: e.target.value } })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>CITY</label>
                  <input
                    type="text" placeholder="Ahmedabad"
                    value={companyForm.address.city}
                    onChange={e => setCompanyForm({ ...companyForm, address: { ...companyForm.address, city: e.target.value } })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>STATE</label>
                  <input
                    type="text" placeholder="Gujarat"
                    value={companyForm.address.state}
                    onChange={e => setCompanyForm({ ...companyForm, address: { ...companyForm.address, state: e.target.value } })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>PINCODE</label>
                  <input
                    type="text" placeholder="380006"
                    value={companyForm.address.pincode}
                    onChange={e => setCompanyForm({ ...companyForm, address: { ...companyForm.address, pincode: e.target.value } })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>COUNTRY</label>
                  <input
                    type="text" placeholder="India"
                    value={companyForm.address.country}
                    onChange={e => setCompanyForm({ ...companyForm, address: { ...companyForm.address, country: e.target.value } })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              {/* Contacts */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>PHONE</label>
                  <input
                    type="text" placeholder="+91 9924304363"
                    value={companyForm.phone}
                    onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>EMAIL</label>
                  <input
                    type="email" placeholder="sales@company.com"
                    value={companyForm.email}
                    onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>WEBSITE</label>
                  <input
                    type="text" placeholder="www.company.com"
                    value={companyForm.website}
                    onChange={e => setCompanyForm({ ...companyForm, website: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              {/* Bank Details */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={16} /> BANK ACCOUNT DETAILS (FOR QUOTATIONS)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>BANK NAME</label>
                    <input
                      type="text" placeholder="HDFC Bank / ICICI Bank"
                      value={companyForm.bankDetails.bankName}
                      onChange={e => setCompanyForm({ ...companyForm, bankDetails: { ...companyForm.bankDetails, bankName: e.target.value } })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>ACCOUNT NAME</label>
                    <input
                      type="text" placeholder="Paramount Propack Pvt Ltd"
                      value={companyForm.bankDetails.accountName}
                      onChange={e => setCompanyForm({ ...companyForm, bankDetails: { ...companyForm.bankDetails, accountName: e.target.value } })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>ACCOUNT NUMBER</label>
                    <input
                      type="text" placeholder="50200012345678"
                      value={companyForm.bankDetails.accountNumber}
                      onChange={e => setCompanyForm({ ...companyForm, bankDetails: { ...companyForm.bankDetails, accountNumber: e.target.value } })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>IFSC CODE</label>
                    <input
                      type="text" placeholder="HDFC0001234"
                      value={companyForm.bankDetails.ifscCode}
                      onChange={e => setCompanyForm({ ...companyForm, bankDetails: { ...companyForm.bankDetails, ifscCode: e.target.value } })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>SWIFT CODE (Optional)</label>
                    <input
                      type="text" placeholder="HDFCINBBXXX"
                      value={companyForm.bankDetails.swiftCode}
                      onChange={e => setCompanyForm({ ...companyForm, bankDetails: { ...companyForm.bankDetails, swiftCode: e.target.value } })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>BRANCH</label>
                    <input
                      type="text" placeholder="Ellis Bridge Branch"
                      value={companyForm.bankDetails.branch}
                      onChange={e => setCompanyForm({ ...companyForm, bankDetails: { ...companyForm.bankDetails, branch: e.target.value } })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Authorized Signatory */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>AUTHORIZED SIGNATORY NAME</label>
                  <input
                    type="text" placeholder="Ex. Rajesh Sharma"
                    value={companyForm.authorizedSignatory.name}
                    onChange={e => setCompanyForm({ ...companyForm, authorizedSignatory: { ...companyForm.authorizedSignatory, name: e.target.value } })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>DESIGNATION</label>
                  <input
                    type="text" placeholder="Ex. Director / Managing Partner"
                    value={companyForm.authorizedSignatory.designation}
                    onChange={e => setCompanyForm({ ...companyForm, authorizedSignatory: { ...companyForm.authorizedSignatory, designation: e.target.value } })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox" id="default-company-chk"
                  checked={companyForm.isDefault}
                  onChange={e => setCompanyForm({ ...companyForm, isDefault: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="default-company-chk" style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 600, cursor: 'pointer' }}>
                  Set as Default Primary Company for Quotations
                </label>
              </div>

            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#f8fafc' }}>
              <button onClick={() => setIsCompanyModalOpen(false)} style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '9px 18px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSaveCompany} style={{ background: '#059669', color: '#fff', border: 'none', padding: '9px 22px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                Save Company Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TEMPLATE EDIT/CREATE MODAL WITH ZOHO THEMES & DYNAMIC COLUMNS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isTemplateModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '880px', maxHeight: '92vh', borderRadius: '18px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%)', color: '#fff' }}>
              <h3 style={{ margin: 0, fontWeight: 700, color: '#fff', fontSize: '1.15rem' }}>
                {editingTemplate ? 'Edit Quotation Template' : 'Create Zoho-Inspired Quotation Template'}
              </h3>
              <button onClick={() => setIsTemplateModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '22px' }}>
              
              {/* 1. Select Company Binding */}
              <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', padding: '16px', borderRadius: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '6px' }}>
                  1. SELECT COMPANY ENTITY FOR THIS TEMPLATE *
                </label>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: '#3b82f6' }}>
                  Selecting a company binds its logo, header branding, registered address, GSTIN, and bank details to this quotation template.
                </p>
                <select
                  value={templateForm.companyId}
                  onChange={e => setTemplateForm({ ...templateForm, companyId: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #93c5fd', fontSize: '0.92rem', fontWeight: 600, background: '#fff', outline: 'none' }}
                >
                  <option value="">-- Select Company Profile --</option>
                  {companies.map(c => (
                    <option key={c._id} value={c._id}>
                      🏢 {c.name} {c.gstin ? `(GST: ${c.gstin})` : ''} {c.isDefault ? '[DEFAULT]' : ''}
                    </option>
                  ))}
                </select>
                {companies.length === 0 && (
                  <p style={{ color: '#dc2626', fontSize: '0.78rem', margin: '6px 0 0 0' }}>
                    ⚠️ No company profiles exist yet. Switch to "Company Profiles" tab to create one first.
                  </p>
                )}
              </div>

              {/* Template Name & Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>TEMPLATE NAME *</label>
                  <input
                    type="text" required placeholder="Ex. Zoho Modern Navy Export Proposal"
                    value={templateForm.templateName}
                    onChange={e => setTemplateForm({ ...templateForm, templateName: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>CATEGORY</label>
                  <select
                    value={templateForm.category}
                    onChange={e => setTemplateForm({ ...templateForm, category: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', background: '#fff' }}
                  >
                    <option value="general">General / Standard</option>
                    <option value="customs_import">Customs - Import</option>
                    <option value="customs_export">Customs - Export</option>
                    <option value="freight">Freight Forwarding</option>
                    <option value="transport">Transportation / Trucking</option>
                    <option value="pfp">Packaging / Products</option>
                  </select>
                </div>
              </div>

              {/* 2. Zoho Styling Customizer */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', background: '#fafafa' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Palette size={16} style={{ color: '#2563eb' }} /> ZOHO BOOKS DESIGN & COLOR THEMES
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {ZOHO_THEMES.map(theme => {
                    const isSelected = templateForm.zohoStyle?.themeColor === theme.theme;
                    return (
                      <div
                        key={theme.name}
                        onClick={() => setTemplateForm(prev => ({
                          ...prev,
                          zohoStyle: { ...prev.zohoStyle, themeColor: theme.theme, accentColor: theme.accent }
                        }))}
                        style={{
                          padding: '10px', borderRadius: '8px', border: isSelected ? `2px solid ${theme.theme}` : '1px solid #cbd5e1',
                          background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px'
                        }}
                      >
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: theme.theme, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          {isSelected && <Check size={14} />}
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: isSelected ? 700 : 500, color: '#1e293b' }}>
                          {theme.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. DYNAMIC QUOTE LINE ITEM TABLE COLUMNS (CRITICAL REQUIREMENT) */}
              <div style={{ border: '2px solid #3b82f6', borderRadius: '14px', padding: '18px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={18} /> QUOTE LINE ITEMS - DYNAMIC TABLE COLUMNS
                    </div>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                      Define custom extra columns (e.g. Container Size, CBM Volume, Gross Wt, Port of Loading) for every line item in quotes using this template.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsColumnModalOpen(true)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      background: '#1e3a8a', color: '#fff', border: 'none',
                      padding: '8px 14px', borderRadius: '8px', fontSize: '0.8rem',
                      fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 6px rgba(30, 58, 138, 0.2)'
                    }}
                  >
                    <Plus size={15} /> Add Custom Column
                  </button>
                </div>

                {/* Table Preview of Columns */}
                <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: templateForm.zohoStyle?.themeColor || '#1e3a8a', color: '#fff' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Product / Service *</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>HSN/SAC</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Qty</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Rate (₹)</th>
                        
                        {/* Dynamic Custom Columns Headers */}
                        {(templateForm.customColumns || []).map(col => (
                          <th key={col.key} style={{ padding: '8px 10px', textAlign: col.align || 'center', background: 'rgba(255,255,255,0.15)', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                              <span>✨ {col.label}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomColumn(col.key)}
                                style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: '0 2px' }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </th>
                        ))}

                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Disc %</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>Tax %</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '8px 10px', color: '#94a3b8' }}>Sample Line Item...</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#94a3b8' }}>9967</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#94a3b8' }}>1</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#94a3b8' }}>₹0</td>
                        {(templateForm.customColumns || []).map(col => (
                          <td key={col.key} style={{ padding: '8px 10px', textAlign: col.align || 'center', background: '#eff6ff', color: '#1e40af', fontWeight: 600 }}>
                            {col.defaultValue || `[${col.type}]`}
                          </td>
                        ))}
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#94a3b8' }}>0%</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#94a3b8' }}>18%</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#94a3b8' }}>₹0</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '16px' }}>
                  <span>🔒 Standard columns are preserved automatically</span>
                  <span>➕ You can add as many dynamic columns as needed</span>
                </div>
              </div>

              {/* Terms & Footer Preset */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>DEFAULT TERMS & CONDITIONS PRESET</label>
                <textarea
                  rows={3}
                  value={templateForm.zohoStyle?.termsAndConditions}
                  onChange={e => setTemplateForm({ ...templateForm, zohoStyle: { ...templateForm.zohoStyle, termsAndConditions: e.target.value } })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>FOOTER NOTES / THANK YOU MESSAGE</label>
                <input
                  type="text"
                  value={templateForm.zohoStyle?.footerNotes}
                  onChange={e => setTemplateForm({ ...templateForm, zohoStyle: { ...templateForm.zohoStyle, footerNotes: e.target.value } })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox" id="default-temp-chk"
                  checked={templateForm.isDefault}
                  onChange={e => setTemplateForm({ ...templateForm, isDefault: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="default-temp-chk" style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 600, cursor: 'pointer' }}>
                  Set as Default Quotation Template
                </label>
              </div>

            </div>

            {/* Footer Buttons */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#f8fafc' }}>
              <button onClick={() => setIsTemplateModalOpen(false)} style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '9px 18px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSaveTemplate} style={{ background: '#1e3a8a', color: '#fff', border: 'none', padding: '9px 22px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ADD CUSTOM COLUMN MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isColumnModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '480px', borderRadius: '14px', padding: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>➕ Define New Line Item Table Column</h4>
              <button onClick={() => setIsColumnModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>COLUMN HEADER LABEL *</label>
                <input
                  type="text" required placeholder="Ex. Container Size, Volume (CBM), Port"
                  value={newCol.label}
                  onChange={e => setNewCol({ ...newCol, label: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>DATA TYPE</label>
                  <select
                    value={newCol.type}
                    onChange={e => setNewCol({ ...newCol, type: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="select">Dropdown Select</option>
                    <option value="date">Date</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>TEXT ALIGN</label>
                  <select
                    value={newCol.align}
                    onChange={e => setNewCol({ ...newCol, align: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>

              {newCol.type === 'select' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>DROPDOWN OPTIONS (COMMA SEPARATED)</label>
                  <input
                    type="text" placeholder="20FT, 40FT, 40HC, LCL"
                    value={newCol.optionsStr}
                    onChange={e => setNewCol({ ...newCol, optionsStr: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>DEFAULT VALUE (OPTIONAL)</label>
                <input
                  type="text" placeholder="Ex. 20FT or 0"
                  value={newCol.defaultValue}
                  onChange={e => setNewCol({ ...newCol, defaultValue: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button onClick={() => setIsColumnModalOpen(false)} style={{ background: '#e2e8f0', border: 'none', padding: '7px 14px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleAddCustomColumn} style={{ background: '#1e3a8a', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                  Add Column
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
