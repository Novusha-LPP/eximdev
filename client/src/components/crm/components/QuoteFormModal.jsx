import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Plus, Trash2, Search } from 'lucide-react';
import { message } from 'antd';
import { generateQuotePDF } from '../utils/pdfGenerator';

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

export default function QuoteFormModal({
  isOpen,
  onClose,
  quoteToEdit,
  onRefresh,
  initialAccountId,
  initialOpportunityId,
  initialOpportunityName,
  initialContactId,
  initialTitle,
  initialCompany,
  initialEmail,
  initialContactName
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    accountId: '',
    opportunityId: '',
    contactId: '',
    placeOfSupply: 'Gujarat (24)',
    billToAddress: '',
    shipToAddress: '',
    lineItems: [
      { productName: '', hsnSac: '392310', quantity: 1, unitPrice: 0, discount: 0, tax: 0, lineTotal: 0 }
    ],
    terms: {
      validFrom: '',
      validUntil: '',
      paymentTerms: 'Net 30',
      deliveryTerms: '',
      notes: ''
    },
    status: 'draft',
    createNewVersion: false
  });

  const [accounts, setAccounts] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Autocomplete search states
  const [accountSearch, setAccountSearch] = useState('');
  const [opportunitySearch, setOpportunitySearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');

  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isOpportunityDropdownOpen, setIsOpportunityDropdownOpen] = useState(false);
  const [isContactDropdownOpen, setIsContactDropdownOpen] = useState(false);

  // Fetch Accounts, Opportunities, Contacts for links
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          const [accsRes, oppsRes, contsRes] = await Promise.all([
            axios.get(`${process.env.REACT_APP_API_STRING}/crm/accounts`, getHeaders()),
            axios.get(`${process.env.REACT_APP_API_STRING}/crm/opportunities`, getHeaders()),
            axios.get(`${process.env.REACT_APP_API_STRING}/crm/contacts`, getHeaders())
          ]);
          setAccounts(accsRes.data || []);
          setOpportunities(oppsRes.data || []);
          setContacts(contsRes.data || []);

          if (quoteToEdit) {
            const accId = quoteToEdit.accountId?._id || quoteToEdit.accountId || '';
            const oppId = quoteToEdit.opportunityId?._id || quoteToEdit.opportunityId || '';
            const cntId = quoteToEdit.contactId?._id || quoteToEdit.contactId || '';

            const selectedAcc = accsRes.data.find(a => a._id === accId);
            setAccountSearch(selectedAcc ? selectedAcc.name : '');

            const selectedOpp = oppsRes.data.find(o => o._id === oppId);
            setOpportunitySearch(selectedOpp ? selectedOpp.name : '');

            const selectedCnt = contsRes.data.find(c => c._id === cntId);
            setContactSearch(selectedCnt ? `${selectedCnt.firstName} ${selectedCnt.lastName || ''}`.trim() : '');

            // Populate form data
            setFormData({
              title: quoteToEdit.title || '',
              description: quoteToEdit.description || '',
              accountId: accId,
              opportunityId: oppId,
              contactId: cntId,
              placeOfSupply: quoteToEdit.placeOfSupply || 'Gujarat (24)',
              billToAddress: quoteToEdit.billToAddress || '',
              shipToAddress: quoteToEdit.shipToAddress || '',
              lineItems: quoteToEdit.lineItems?.length > 0 ? quoteToEdit.lineItems.map(item => ({
                productName: item.productName || '',
                hsnSac: item.hsnSac || '392310',
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
                discount: item.discount || 0,
                tax: item.tax || 0,
                lineTotal: item.lineTotal || 0
              })) : [{ productName: '', hsnSac: '392310', quantity: 1, unitPrice: 0, discount: 0, tax: 0, lineTotal: 0 }],
              terms: {
                validFrom: quoteToEdit.terms?.validFrom ? quoteToEdit.terms.validFrom.substring(0, 10) : '',
                validUntil: quoteToEdit.terms?.validUntil ? quoteToEdit.terms.validUntil.substring(0, 10) : '',
                paymentTerms: quoteToEdit.terms?.paymentTerms || 'Net 30',
                deliveryTerms: quoteToEdit.terms?.deliveryTerms || '',
                notes: quoteToEdit.terms?.notes || ''
              },
              status: quoteToEdit.status || 'draft',
              createNewVersion: false
            });
          } else {
            // Default dates
            const today = new Date();
            const nextMonth = new Date();
            nextMonth.setDate(today.getDate() + 30);

            // Attempt auto-matching if initialAccountId is not set but initialCompany is
            let accId = initialAccountId || '';
            if (!accId && initialCompany) {
              const matchedAcc = (accsRes.data || []).find(a =>
                a.name && (
                  a.name.toLowerCase() === String(initialCompany).toLowerCase() ||
                  a.name.toLowerCase().includes(String(initialCompany).toLowerCase())
                )
              );
              if (matchedAcc) accId = matchedAcc._id;
            }
            // Removed fallback to random first account to preserve initial lead data in search fields

            // Attempt auto-matching for contact if initialContactId is not set
            let cntId = initialContactId || '';
            if (!cntId && (initialEmail || initialContactName)) {
              const matchedCnt = (contsRes.data || []).find(c =>
                (initialEmail && c.email?.toLowerCase() === String(initialEmail).toLowerCase()) ||
                (initialContactName && `${c.firstName || ''} ${c.lastName || ''}`.trim().toLowerCase() === String(initialContactName).toLowerCase())
              );
              if (matchedCnt) cntId = matchedCnt._id;
            }

            // If an account is selected but no contact is explicitly matched yet,
            // try to auto-select the first contact belonging to that account
            if (!cntId && accId) {
              const accountContacts = (contsRes.data || []).filter(c => {
                const id = typeof c.accountId === 'object' ? c.accountId?._id : c.accountId;
                return id === accId;
              });
              if (accountContacts.length > 0) {
                const primary = accountContacts.find(c => c.isPrimary);
                cntId = primary ? primary._id : accountContacts[0]._id;
              }
            }

            // Attempt auto-matching for opportunity if not explicitly set
            let oppId = initialOpportunityId || '';
            if (!oppId && accId) {
              const accountOpps = (oppsRes.data || []).filter(o => {
                const id = typeof o.accountId === 'object' ? o.accountId?._id : o.accountId;
                return id === accId;
              });
              if (accountOpps.length > 0) {
                oppId = accountOpps[0]._id;
              }
            }

            const selectedAcc = accsRes.data.find(a => a._id === accId);
            setAccountSearch(selectedAcc ? selectedAcc.name : (initialCompany || ''));

            const selectedOpp = oppsRes.data.find(o => o._id === oppId);
            setOpportunitySearch(selectedOpp ? selectedOpp.name : (initialOpportunityName || ''));

            const selectedCnt = contsRes.data.find(c => c._id === cntId);
            setContactSearch(selectedCnt ? `${selectedCnt.firstName} ${selectedCnt.lastName || ''}`.trim() : (initialContactName || ''));

            setFormData({
              title: initialTitle || '',
              description: '',
              accountId: accId,
              opportunityId: oppId,
              contactId: cntId,
              placeOfSupply: 'Gujarat (24)',
              billToAddress: selectedAcc ? (selectedAcc.address || '') : '',
              shipToAddress: selectedAcc ? (selectedAcc.address || '') : '',
              lineItems: [
                { productName: '', hsnSac: '392310', quantity: 1, unitPrice: 0, discount: 0, tax: 0, lineTotal: 0 }
              ],
              terms: {
                validFrom: today.toISOString().substring(0, 10),
                validUntil: nextMonth.toISOString().substring(0, 10),
                paymentTerms: 'Net 30',
                deliveryTerms: '',
                notes: ''
              },
              status: 'draft',
              createNewVersion: false
            });
          }
        } catch (err) {
          console.error("Error fetching form data:", err);
          message.error("Failed to load necessary data");
        }
      };

      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, quoteToEdit, initialAccountId, initialOpportunityId, initialContactId, initialCompany, initialEmail, initialContactName, initialOpportunityName]);

  // Handle line item update
  const handleLineItemChange = (index, field, value) => {
    const newItems = [...formData.lineItems];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };

    // Calculate line total
    const qty = Number(newItems[index].quantity) || 0;
    const price = Number(newItems[index].unitPrice) || 0;
    const discount = Number(newItems[index].discount) || 0;
    const tax = Number(newItems[index].tax) || 0;

    const subtotal = qty * price;
    const itemDiscount = subtotal * (discount / 100);
    const itemTax = (subtotal - itemDiscount) * (tax / 100);

    newItems[index].lineTotal = subtotal - itemDiscount + itemTax;

    setFormData({
      ...formData,
      lineItems: newItems
    });
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      lineItems: [
        ...formData.lineItems,
        { productName: '', hsnSac: '392310', quantity: 1, unitPrice: 0, discount: 0, tax: 0, lineTotal: 0 }
      ]
    });
  };

  const removeLineItem = (index) => {
    if (formData.lineItems.length === 1) return;
    const newItems = formData.lineItems.filter((_, i) => i !== index);
    setFormData({ ...formData, lineItems: newItems });
  };

  // Live Math calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    formData.lineItems.forEach(item => {
      const lineSubtotal = (item.quantity || 0) * (item.unitPrice || 0);
      const itemDiscount = lineSubtotal * ((item.discount || 0) / 100);
      const itemTax = (lineSubtotal - itemDiscount) * ((item.tax || 0) / 100);

      subtotal += lineSubtotal;
      totalDiscount += itemDiscount;
      totalTax += itemTax;
    });

    const total = subtotal - totalDiscount + totalTax;
    return { subtotal, totalDiscount, totalTax, total };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.accountId || !formData.title || formData.lineItems.some(i => !i.productName)) {
      message.warning('Please complete all required fields (Account, Title, and Line Item names)');
      return;
    }

    setIsSubmitting(true);
    try {
      if (quoteToEdit) {
        // Edit / Update
        await axios.put(
          `${process.env.REACT_APP_API_STRING}/crm/quotes/${quoteToEdit._id}`,
          formData,
          getHeaders()
        );
        message.success(formData.createNewVersion ? 'New quote version created successfully' : 'Quotation updated successfully');
      } else {
        // Create new
        const res = await axios.post(
          `${process.env.REACT_APP_API_STRING}/crm/quotes`,
          formData,
          getHeaders()
        );
        message.success('Quotation created successfully');
        if (res.data) {
          try {
            generateQuotePDF(res.data);
          } catch (pdfErr) {
            console.error('Failed to auto-download PDF:', pdfErr);
          }
        }
      }
      onRefresh();
      onClose();
    } catch (err) {
      console.error('Failed to submit quote:', err);
      message.error(err.response?.data?.message || 'Failed to submit quote');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dynamic filtering where if the typed text matches the selected name, we show ALL items.
  const selectedAcc = accounts.find(a => a._id === formData.accountId);
  const isAccNameSelected = selectedAcc && accountSearch === selectedAcc.name;
  const filteredAccounts = isAccNameSelected || !accountSearch
    ? accounts
    : accounts.filter(a => a.name.toLowerCase().includes(accountSearch.toLowerCase()));

  const selectedOpp = opportunities.find(o => o._id === formData.opportunityId);
  const isOppNameSelected = selectedOpp && opportunitySearch === selectedOpp.name;

  const getFilteredOpportunities = () => {
    let list = opportunities;
    if (formData.accountId) {
      const accountOpps = opportunities.filter(o => {
        const id = typeof o.accountId === 'object' ? o.accountId?._id : o.accountId;
        return id === formData.accountId;
      });
      if (accountOpps.length > 0) {
        list = accountOpps;
      }
    }

    if (isOppNameSelected || !opportunitySearch) {
      return list;
    }

    const searchedList = list.filter(o => o.name.toLowerCase().includes(opportunitySearch.toLowerCase()));
    if (searchedList.length > 0) {
      return searchedList;
    }
    return opportunities.filter(o => o.name.toLowerCase().includes(opportunitySearch.toLowerCase()));
  };
  const filteredOpportunities = getFilteredOpportunities();

  const selectedCnt = contacts.find(c => c._id === formData.contactId);
  const selectedCntName = selectedCnt ? `${selectedCnt.firstName} ${selectedCnt.lastName || ''}`.trim() : '';
  const isCntNameSelected = selectedCnt && contactSearch === selectedCntName;

  const getFilteredContacts = () => {
    let list = contacts;
    if (formData.accountId) {
      const accountContacts = contacts.filter(c => {
        const id = typeof c.accountId === 'object' ? c.accountId?._id : c.accountId;
        return id === formData.accountId;
      });
      if (accountContacts.length > 0) {
        list = accountContacts;
      }
    }

    if (isCntNameSelected || !contactSearch) {
      return list;
    }

    const searchedList = list.filter(c => `${c.firstName} ${c.lastName || ''}`.toLowerCase().includes(contactSearch.toLowerCase()));
    if (searchedList.length > 0) {
      return searchedList;
    }
    return contacts.filter(c => `${c.firstName} ${c.lastName || ''}`.toLowerCase().includes(contactSearch.toLowerCase()));
  };
  const filteredContacts = getFilteredContacts();

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px'
    }}>
      <div style={{
        background: '#fff', width: '100%', maxWidth: '850px', maxHeight: '90vh',
        borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        animation: 'modalOpen 0.25s ease-out'
      }}>
        <style>{`
          @keyframes modalOpen {
            from { transform: scale(0.96); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          .scrollable-body::-webkit-scrollbar {
            width: 6px;
          }
          .scrollable-body::-webkit-scrollbar-track {
            background: #f1f5f9;
          }
          .scrollable-body::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
          }
        `}</style>

        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#f8fafc'
        }}>
          <h3 style={{ margin: 0, color: '#1e293b', fontWeight: 700, fontSize: '1.15rem' }}>
            {quoteToEdit ? `Edit Quotation (v${quoteToEdit.version || 1})` : 'Create Pricing Proposal / Quotation'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', margin: 0 }}>

          <div className="scrollable-body" style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Meta Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>PROPOSAL TITLE *</label>
                <input
                  required type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex. Standard Customs Clearence Rates Proposal 2026"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>STATUS</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', background: '#fff' }}
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Links Block */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>

              {/* Customer Account Searchable */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>CUSTOMER ACCOUNT *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="Search account..."
                    value={accountSearch}
                    onChange={e => {
                      setAccountSearch(e.target.value);
                      setIsAccountDropdownOpen(true);
                      if (!e.target.value) {
                        setFormData(prev => ({ ...prev, accountId: '' }));
                      }
                    }}
                    onFocus={() => setIsAccountDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsAccountDropdownOpen(false), 250)}
                    style={{ width: '100%', padding: '10px 12px 10px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                  />
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>
                {isAccountDropdownOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
                    border: '1px solid #cbd5e1', borderRadius: '8px', maxHeight: '160px',
                    overflowY: 'auto', background: '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                  }}>
                    {filteredAccounts.length === 0 ? (
                      <div style={{ padding: '10px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No accounts found</div>
                    ) : (
                      filteredAccounts.map(a => (
                        <div
                          key={a._id}
                          onClick={() => {
                            // Find matching contacts for the new account
                            const newAccountContacts = contacts.filter(c => {
                              const id = typeof c.accountId === 'object' ? c.accountId?._id : c.accountId;
                              return id === a._id;
                            });
                            const primaryCnt = newAccountContacts.find(c => c.isPrimary) || newAccountContacts[0];
                            const newCntId = primaryCnt ? primaryCnt._id : '';
                            const newCntName = primaryCnt ? `${primaryCnt.firstName} ${primaryCnt.lastName || ''}`.trim() : '';

                            // Find matching opportunities for the new account
                            const newAccountOpps = opportunities.filter(o => {
                              const id = typeof o.accountId === 'object' ? o.accountId?._id : o.accountId;
                              return id === a._id;
                            });
                            const newOppId = newAccountOpps.length > 0 ? newAccountOpps[0]._id : '';
                            const newOppName = newAccountOpps.length > 0 ? newAccountOpps[0].name : '';

                            setFormData(prev => ({
                              ...prev,
                              accountId: a._id,
                              contactId: newCntId,
                              opportunityId: newOppId,
                              billToAddress: a.address || '',
                              shipToAddress: a.address || ''
                            }));
                            setAccountSearch(a.name);
                            setContactSearch(newCntName);
                            setOpportunitySearch(newOppName);
                            setIsAccountDropdownOpen(false);
                          }}
                          style={{
                            padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem',
                            background: formData.accountId === a._id ? '#f1f5f9' : 'transparent',
                            color: '#1e293b'
                          }}
                        >
                          {a.name}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Opportunity/Deal Searchable */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>OPPORTUNITY / DEAL</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search deal..."
                    value={opportunitySearch}
                    onChange={e => {
                      setOpportunitySearch(e.target.value);
                      setIsOpportunityDropdownOpen(true);
                      if (!e.target.value) {
                        setFormData(prev => ({ ...prev, opportunityId: '' }));
                      }
                    }}
                    onFocus={() => setIsOpportunityDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsOpportunityDropdownOpen(false), 250)}
                    style={{ width: '100%', padding: '10px 12px 10px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                  />
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>
                {isOpportunityDropdownOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
                    border: '1px solid #cbd5e1', borderRadius: '8px', maxHeight: '160px',
                    overflowY: 'auto', background: '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                  }}>
                    <div
                      onClick={() => {
                        setFormData(prev => ({ ...prev, opportunityId: '' }));
                        setOpportunitySearch('');
                        setIsOpportunityDropdownOpen(false);
                      }}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem', color: '#ef4444', borderBottom: '1px solid #f1f5f9', fontWeight: 600 }}
                    >
                      Clear linked deal selection
                    </div>
                    {filteredOpportunities.length === 0 ? (
                      <div style={{ padding: '10px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No deals found</div>
                    ) : (
                      filteredOpportunities.map(o => (
                        <div
                          key={o._id}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, opportunityId: o._id }));
                            setOpportunitySearch(o.name);
                            setIsOpportunityDropdownOpen(false);
                          }}
                          style={{
                            padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem',
                            background: formData.opportunityId === o._id ? '#f1f5f9' : 'transparent',
                            color: '#1e293b'
                          }}
                        >
                          {o.name}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Contact Searchable */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>PRIMARY CONTACT</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search contact..."
                    value={contactSearch}
                    onChange={e => {
                      setContactSearch(e.target.value);
                      setIsContactDropdownOpen(true);
                      if (!e.target.value) {
                        setFormData(prev => ({ ...prev, contactId: '' }));
                      }
                    }}
                    onFocus={() => setIsContactDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsContactDropdownOpen(false), 250)}
                    style={{ width: '100%', padding: '10px 12px 10px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                  />
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>
                {isContactDropdownOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
                    border: '1px solid #cbd5e1', borderRadius: '8px', maxHeight: '160px',
                    overflowY: 'auto', background: '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                  }}>
                    <div
                      onClick={() => {
                        setFormData(prev => ({ ...prev, contactId: '' }));
                        setContactSearch('');
                        setIsContactDropdownOpen(false);
                      }}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem', color: '#ef4444', borderBottom: '1px solid #f1f5f9', fontWeight: 600 }}
                    >
                      Clear contact selection
                    </div>
                    {filteredContacts.length === 0 ? (
                      <div style={{ padding: '10px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No contacts found</div>
                    ) : (
                      filteredContacts.map(c => {
                        const nameStr = `${c.firstName} ${c.lastName || ''}`.trim();
                        return (
                          <div
                            key={c._id}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, contactId: c._id }));
                              setContactSearch(nameStr);
                              setIsContactDropdownOpen(false);
                            }}
                            style={{
                              padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem',
                              background: formData.contactId === c._id ? '#f1f5f9' : 'transparent',
                              color: '#1e293b'
                            }}
                          >
                            {nameStr}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Custom Invoicing & Address Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>PLACE OF SUPPLY</label>
                <input
                  type="text"
                  value={formData.placeOfSupply}
                  onChange={e => setFormData({ ...formData, placeOfSupply: e.target.value })}
                  placeholder="Ex. Gujarat (24)"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>BILL TO ADDRESS</label>
                <textarea
                  value={formData.billToAddress}
                  onChange={e => setFormData({ ...formData, billToAddress: e.target.value })}
                  placeholder="Billing address details..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', minHeight: '60px', resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>SHIP TO ADDRESS</label>
                <textarea
                  value={formData.shipToAddress}
                  onChange={e => setFormData({ ...formData, shipToAddress: e.target.value })}
                  placeholder="Shipping address details..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', minHeight: '60px', resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>QUOTE LINE ITEMS</label>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px', width: '30%' }}>Product / Service Name *</th>
                      <th style={{ padding: '10px 12px', width: '12%' }}>HSN/SAC</th>
                      <th style={{ padding: '10px 12px', width: '10%' }}>Qty</th>
                      <th style={{ padding: '10px 12px', width: '15%' }}>Unit Price (₹)</th>
                      <th style={{ padding: '10px 12px', width: '10%' }}>Disc %</th>
                      <th style={{ padding: '10px 12px', width: '10%' }}>Tax %</th>
                      <th style={{ padding: '10px 12px', width: '12%' }}>Total</th>
                      <th style={{ padding: '10px 12px', width: '6%', textStyle: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.lineItems.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px' }}>
                          <input
                            type="text" required
                            value={item.productName}
                            onChange={e => handleLineItemChange(idx, 'productName', e.target.value)}
                            placeholder="Ex. 40ft container transportation rate"
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <input
                            type="text"
                            value={item.hsnSac || ''}
                            onChange={e => handleLineItemChange(idx, 'hsnSac', e.target.value)}
                            placeholder="392310"
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <input
                            type="number" required min="1"
                            value={item.quantity}
                            onChange={e => handleLineItemChange(idx, 'quantity', Number(e.target.value))}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <input
                            type="number" required min="0"
                            value={item.unitPrice}
                            onChange={e => handleLineItemChange(idx, 'unitPrice', Number(e.target.value))}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <input
                            type="number" min="0" max="100"
                            value={item.discount}
                            onChange={e => handleLineItemChange(idx, 'discount', Number(e.target.value))}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <input
                            type="number" min="0"
                            value={item.tax}
                            onChange={e => handleLineItemChange(idx, 'tax', Number(e.target.value))}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#334155' }}>
                          ₹{Math.round(item.lineTotal || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => removeLineItem(idx)}
                            disabled={formData.lineItems.length === 1}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ padding: '10px 12px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                  <button
                    type="button" onClick={addLineItem}
                    style={{
                      background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px',
                      padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, color: '#475569',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                  >
                    <Plus size={14} /> Add Line Item
                  </button>
                </div>
              </div>
            </div>

            {/* Calculations & Validity Block */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginTop: '10px' }}>

              {/* Validity Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>VALID FROM</label>
                    <input
                      type="date" required
                      value={formData.terms.validFrom}
                      onChange={e => setFormData({ ...formData, terms: { ...formData.terms, validFrom: e.target.value } })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>VALID UNTIL</label>
                    <input
                      type="date" required
                      value={formData.terms.validUntil}
                      onChange={e => setFormData({ ...formData, terms: { ...formData.terms, validUntil: e.target.value } })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>PAYMENT TERMS</label>
                  <select
                    value={formData.terms.paymentTerms}
                    onChange={e => setFormData({ ...formData, terms: { ...formData.terms, paymentTerms: e.target.value } })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                  >
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                    <option value="COD">Cash on Delivery (COD)</option>
                    <option value="Advance">100% Advance Payment</option>
                  </select>
                </div>
              </div>

              {/* Calculations Block */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Subtotal:</span>
                  <span>₹{Math.round(totals.subtotal).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                  <span>Total Discount:</span>
                  <span>- ₹{Math.round(totals.totalDiscount).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563eb' }}>
                  <span>Tax Amount:</span>
                  <span>+ ₹{Math.round(totals.totalTax).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ borderTop: '2px solid #cbd5e1', marginTop: '6px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>
                  <span>Grand Total:</span>
                  <span>₹{Math.round(totals.total).toLocaleString('en-IN')}</span>
                </div>
              </div>

            </div>

            {/* Version control toggle button when editing */}
            {quoteToEdit && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', marginTop: '10px' }}>
                <input
                  type="checkbox"
                  id="createNewVersion"
                  checked={formData.createNewVersion}
                  onChange={e => setFormData({ ...formData, createNewVersion: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="createNewVersion" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e40af', cursor: 'pointer' }}>
                  Create New Negotiation Version (v{(quoteToEdit.version || 1) + 1}) - Keep v{quoteToEdit.version || 1} in archives
                </label>
              </div>
            )}

          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#f8fafc',
            display: 'flex', justifyContent: 'flex-end', gap: '12px'
          }}>
            <button
              type="button" onClick={onClose} disabled={isSubmitting}
              style={{ padding: '9px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', fontSize: '0.875rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={isSubmitting}
              style={{ padding: '9px 16px', border: 'none', borderRadius: '8px', background: '#4f46e5', fontSize: '0.875rem', fontWeight: 600, color: '#fff', cursor: 'pointer' }}
            >
              {isSubmitting ? 'Saving...' : quoteToEdit ? 'Save Changes' : 'Create Quotation'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
