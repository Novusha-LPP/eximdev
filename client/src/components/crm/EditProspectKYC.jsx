import React, { useEffect, useState, useCallback } from 'react';
import {
  Form, Input, Select, Button, Card, Space, Typography, Collapse,
  Row, Col, Divider, message, Spin, Tag, Checkbox, Steps, Alert,
  Tooltip, Badge
} from 'antd';
import {
  SaveOutlined, SendOutlined, ArrowLeftOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { useKyc } from './hooks/useKyc';
import ContactManager from './components/ContactManager';
import FileUpload from './components/FileUpload';
import '../customerKyc/KycForm.scss';

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

/* ─── Indian States & UTs ─────────────────────────────────────────────────── */
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  // UTs
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

/* ─── Completion checker ─────────────────────────────────────────────────── */
function checkCompletion(data, files) {
  const pa = data || {};
  const hasPermAddress =
    pa.permanent_address_line_1 && pa.permanent_address_city &&
    pa.permanent_address_state  && pa.permanent_address_pin_code;
  const hasPrinAddress =
    pa.principle_business_address_line_1 && pa.principle_business_address_city &&
    pa.principle_business_address_state  && pa.principle_business_address_pin_code;

  return {
    address:  !!(hasPermAddress || hasPrinAddress),
    contacts: (data?.contacts?.length ?? 0) >= 1,
    pan:      !!(pa.pan_no && files.panCopy?.length > 0),
    iec:      (files.iecCopy?.length ?? 0) > 0,
  };
}

/* ─── Address sub-form ───────────────────────────────────────────────────── */
function AddressFields({ prefix, disabled }) {
  return (
    <div className="fields">
      <div className="row">
        <div className="field w-full">
          <label>Address Line 1 <span className="req">*</span></label>
          <Form.Item name={`${prefix}_line_1`} style={{ marginBottom: 0 }}>
            <Input placeholder="Building name, street, area" disabled={disabled} />
          </Form.Item>
        </div>
      </div>
      <div className="row">
        <div className="field w-full">
          <label>Address Line 2</label>
          <Form.Item name={`${prefix}_line_2`} style={{ marginBottom: 0 }}>
            <Input placeholder="Locality, landmark" disabled={disabled} />
          </Form.Item>
        </div>
      </div>
      <div className="row">
        <div className="field w-third">
          <label>City <span className="req">*</span></label>
          <Form.Item name={`${prefix}_city`} style={{ marginBottom: 0 }}>
            <Input placeholder="City" disabled={disabled} />
          </Form.Item>
        </div>
        <div className="field w-third">
          <label>State / UT <span className="req">*</span></label>
          <Form.Item name={`${prefix}_state`} style={{ marginBottom: 0 }}>
            <Select placeholder="Select state" disabled={disabled} showSearch optionFilterProp="children" style={{ width: '100%', height: '28px' }}>
              {INDIAN_STATES.map(s => <Option key={s} value={s}>{s}</Option>)}
            </Select>
          </Form.Item>
        </div>
        <div className="field w-third">
          <label>PIN Code <span className="req">*</span></label>
          <Form.Item
            name={`${prefix}_pin_code`}
            rules={[{ pattern: /^\d{6}$/, message: 'Enter valid 6-digit PIN' }]}
            style={{ marginBottom: 0 }}
          >
            <Input placeholder="6 digits" maxLength={6} disabled={disabled} />
          </Form.Item>
        </div>
      </div>
      <div className="row">
        <div className="field w-half">
          <label>Phone <span className="req">*</span></label>
          <Form.Item name={`${prefix === 'permanent_address' ? 'permanent_address_telephone' : 'principle_business_telephone'}`} style={{ marginBottom: 0 }}>
            <Input placeholder="Landline or mobile" disabled={disabled} />
          </Form.Item>
        </div>
        <div className="field w-half">
          <label>Email <span className="req">*</span></label>
          <Form.Item
            name={`${prefix === 'permanent_address' ? 'permanent_address_email' : 'principle_address_email'}`}
            rules={[{ type: 'email', message: 'Invalid email' }]}
            style={{ marginBottom: 0 }}
          >
            <Input placeholder="email@company.com" disabled={disabled} />
          </Form.Item>
        </div>
      </div>
      {prefix !== 'permanent_address' && (
        <div className="row">
          <div className="field w-full">
            <label>Website</label>
            <Form.Item name="principle_business_website" style={{ marginBottom: 0 }}>
              <Input placeholder="https://example.com" disabled={disabled} />
            </Form.Item>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
function EditProspectKYC({ onNavigate, record: initialRecord }) {
  const [form] = Form.useForm();
  const { getProspect, updateProspect, loading } = useKyc();
  const [record, setRecord]         = useState(initialRecord);
  const [fetching, setFetching]     = useState(false);
  const [sameAddr, setSameAddr]     = useState(false);

  // File arrays
  const [panCopy,    setPanCopy]    = useState([]);
  const [iecCopy,    setIecCopy]    = useState([]);
  const [authSig,    setAuthSig]    = useState([]);
  const [authLetter, setAuthLetter] = useState([]);

  // Contacts
  const [contacts, setContacts] = useState([]);

  /* ── Load full record ────────────────────────────────────────────────── */
  useEffect(() => {
    if (!initialRecord?._id) return;
    setFetching(true);
    getProspect(initialRecord._id)
      .then(full => {
        setRecord(full);
        form.setFieldsValue(full);
        setContacts(full.contacts || []);
        setPanCopy(full.pan_copy        || []);
        setIecCopy(full.iec_copy        || []);
        setAuthSig(full.authorised_signatories || []);
        setAuthLetter(full.authorisation_letter || []);
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [initialRecord?._id]);

  /* ── sameAsPermanentAddress handler ─────────────────────────────────── */
  const handleSameAddr = (checked) => {
    setSameAddr(checked);
    if (checked) {
      const vals = form.getFieldsValue();
      form.setFieldsValue({
        principle_business_address_line_1:   vals.permanent_address_line_1   || '',
        principle_business_address_line_2:   vals.permanent_address_line_2   || '',
        principle_business_address_city:     vals.permanent_address_city     || '',
        principle_business_address_state:    vals.permanent_address_state    || '',
        principle_business_address_pin_code: vals.permanent_address_pin_code || '',
        principle_business_telephone:        vals.permanent_address_telephone || '',
        principle_address_email:             vals.permanent_address_email    || '',
      });
    }
  };

  /* ── Build payload ───────────────────────────────────────────────────── */
  const buildPayload = () => ({
    ...form.getFieldsValue(true),
    contacts,
    pan_copy:              panCopy,
    iec_copy:              iecCopy,
    authorised_signatories: authSig,
    authorisation_letter:   authLetter,
    sameAsPermanentAddress: sameAddr,
  });

  /* ── Save ──────────────────────────────────────────────────────────────  */
  const handleSave = async () => {
    try {
      const updated = await updateProspect(record._id, buildPayload());
      setRecord(updated?.data || record);
      message.success('Progress saved successfully.');
    } catch (_) {}
  };

  /* ── Submit for approval ─────────────────────────────────────────────── */
  const handleSubmit = async () => {
    // Client-side gate checks
    const vals  = form.getFieldsValue(true);
    const files = { panCopy, iecCopy };
    const done  = checkCompletion({ ...vals, contacts }, files);

    if (!done.address) {
      message.error('Please complete at least one full address (Line 1, City, State, PIN).');
      return;
    }
    if (!done.contacts) {
      message.error('Please add at least one contact person.');
      return;
    }
    if (!done.pan) {
      message.error('PAN number and PAN copy document are required.');
      return;
    }
    if (!done.iec) {
      message.error('IEC copy document is required.');
      return;
    }

    try {
      // Save first, then submit
      await updateProspect(record._id, buildPayload());
      // Call the submit endpoint
      const { default: axios } = await import('axios');
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/crm/prospects/${record._id}/submit`,
        {},
        { withCredentials: true }
      );
      message.success('Submitted for approval!');
      onNavigate('prospects');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to submit. Please try again.';
      message.error(msg);
    }
  };

  // ─── Completion status for the progress panel ──────────────────────────
  const vals  = form.getFieldsValue(true) || {};
  const done  = checkCompletion({ ...vals, contacts }, { panCopy, iecCopy });
  const completedCount = Object.values(done).filter(Boolean).length;

  const stepItems = [
    { title: 'Address',   description: 'At least 1 full address', status: done.address   ? 'finish' : 'wait' },
    { title: 'Contacts',  description: 'Min. 1 contact',          status: done.contacts  ? 'finish' : 'wait' },
    { title: 'PAN',       description: 'PAN No. + document',      status: done.pan       ? 'finish' : 'wait' },
    { title: 'IEC Copy',  description: 'IEC certificate upload',  status: done.iec       ? 'finish' : 'wait' },
  ];

  if (!record) return null;

  return (
    <Spin spinning={fetching}>
      <div className="app customer-kyc-wrapper" style={{ minHeight: 'auto', padding: 0, background: 'transparent' }}>
        <div className="page" style={{ padding: 0 }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: 12 }}>
            <button
              onClick={() => onNavigate('prospects')}
              style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: 0, fontWeight: 600 }}
            >
              ← Back
            </button>
            <h2 className="page-title" style={{ margin: 0, textTransform: 'uppercase' }}>
              {record.name_of_individual}
              <Tag color="orange" style={{ marginLeft: 8, fontWeight: 'normal', fontSize: 11, verticalAlign: 'middle' }}>{record.approval}</Tag>
            </h2>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', fontSize: '12px', alignItems: 'center' }}>
               <Text type="secondary" style={{ fontSize: 11 }}>IEC: <strong>{record.iec_no}</strong></Text>
               {record.category && <Tag color="blue" style={{ fontSize: 10 }}>{record.category}</Tag>}
               {record.status   && <Tag color="cyan" style={{ fontSize: 10 }}>{record.status}</Tag>}
            </div>
          </div>



          {/* ─── Progress tracker ────────────────────────────────────────────── */}
          <Card size="small" style={{ marginBottom: 16, borderRadius: '4px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text strong style={{ color: 'var(--text)' }}>Phase 2 Completion</Text>
              <Text type={completedCount === 4 ? 'success' : 'secondary'} style={{ fontSize: 12 }}>{completedCount}/4 requirements met</Text>
            </div>
            <Steps
              size="small"
              items={stepItems.map(s => ({
                title: s.title,
                description: <span style={{ fontSize: 10 }}>{s.description}</span>,
                status: s.status,
                icon: s.status === 'finish' ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <ExclamationCircleOutlined style={{ color: '#d9d9d9' }} />,
              }))}
            />
          </Card>

          <Form form={form} layout="vertical" onValuesChange={() => {/* triggers re-render for done */}}>
            <div className="kyc-card">
              <div className="panels">
                
                {/* ── LEFT PANEL ───────────────────────────────────────────────── */}
                <div className="panel">
                  {/* Permanent Address */}
                  <div className="section">
                    <div className="section-header">
                      <span className="section-title section-title-accent">Permanent Address</span>
                      {done.address && <CheckCircleOutlined style={{ color: '#fff', fontSize: 12 }} />}
                    </div>
                    <AddressFields prefix="permanent_address" disabled={false} />
                  </div>
                  
                  {/* Principal Business Address */}
                  <div className="section" style={{ borderBottom: 'none' }}>
                    <div className="section-header">
                      <span className="section-title section-title-accent">Principal Business Address</span>
                      <label className="field-checkbox" style={{ margin: 0, color: '#fff', fontSize: 10 }}>
                        <input
                          type="checkbox"
                          checked={sameAddr}
                          onChange={e => handleSameAddr(e.target.checked)}
                          style={{ margin: 0, width: 11, height: 11 }}
                        />
                        Same as Permanent
                      </label>
                    </div>
                    <AddressFields prefix="principle_business_address" disabled={sameAddr} />
                  </div>
                </div>

                {/* ── RIGHT PANEL ──────────────────────────────────────────────── */}
                <div className="panel">
                  {/* Contacts */}
                  <div className="section">
                    <div className="section-header">
                      <span className="section-title section-title-accent">Contact Information</span>
                      <Space>
                        <Badge count={contacts.length} style={{ backgroundColor: contacts.length > 0 ? '#52c41a' : '#faad14', transform: 'scale(0.8)' }} />
                        {contacts.length === 0 && <Tooltip title="At least 1 contact required"><ExclamationCircleOutlined style={{ color: '#faad14' }} /></Tooltip>}
                      </Space>
                    </div>
                    <div className="fields">
                      <ContactManager value={contacts} onChange={setContacts} />
                      {contacts.length === 0 && (
                        <Text type="warning" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                          Add at least 1 contact to submit for approval.
                        </Text>
                      )}
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="section" style={{ borderBottom: 'none' }}>
                    <div className="section-header">
                      <span className="section-title section-title-accent">Documents</span>
                      {done.pan && done.iec && <CheckCircleOutlined style={{ color: '#fff', fontSize: 12 }} />}
                    </div>
                    <div className="fields">
                      <div className="finance-divider" style={{ marginTop: 0 }}>PAN Details</div>
                      <div className="row">
                        <div className="field w-full">
                          <label>PAN Number <span className="req">*</span></label>
                          <Form.Item
                            name="pan_no"
                            rules={[{ pattern: /^[A-Z]{5}[0-9]{4}[A-Z]$/, message: 'Format: AAAAA9999A' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <Input placeholder="AAAAA9999A" maxLength={10} style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.08em' }} />
                          </Form.Item>
                        </div>
                      </div>
                      <div className="row" style={{ marginTop: 4 }}>
                        <div className="field w-full">
                          <FileUpload
                            label={<>PAN Copy <span style={{ color: '#ff4d4f' }}>*</span></>}
                            value={panCopy}
                            onChange={setPanCopy}
                            bucketPath="crm-docs/pan"
                          />
                        </div>
                      </div>

                      <div className="finance-divider" style={{ marginTop: 8 }}>IEC Details</div>
                      <div className="row">
                        <div className="field w-full">
                          <FileUpload
                            label={<>IEC Copy <span style={{ color: '#ff4d4f' }}>*</span></>}
                            value={iecCopy}
                            onChange={setIecCopy}
                            bucketPath="crm-docs/iec"
                          />
                        </div>
                      </div>

                      <div className="finance-divider" style={{ marginTop: 8 }}>Authorisation Details</div>
                      <div className="row">
                        <div className="field w-half">
                          <FileUpload
                            label="Authorised Signatories"
                            value={authSig}
                            onChange={setAuthSig}
                            bucketPath="crm-docs/signatories"
                          />
                        </div>
                        <div className="field w-half">
                          <FileUpload
                            label="Authorisation Letter"
                            value={authLetter}
                            onChange={setAuthLetter}
                            bucketPath="crm-docs/auth-letter"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Form Footer ── */}
              <div className="form-footer">
                <div className="footer-info">
                  <InfoCircleOutlined style={{ marginRight: 4 }} />
                  Required to submit: 1 address · 1 contact · PAN + copy · IEC copy
                </div>
                <div className="footer-actions">
                  <button type="button" className="btn btn-outline" onClick={() => onNavigate('prospects')}>Cancel</button>
                  <button type="button" className="btn btn-draft" onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save Progress'}</button>
                  <button type="button" className="btn btn-success" onClick={handleSubmit} disabled={loading}>{loading ? 'Submitting...' : 'Submit for Approval'}</button>
                </div>
              </div>
            </div>
          </Form>
        </div>
      </div>
    </Spin>
  );
}

export default React.memo(EditProspectKYC);
