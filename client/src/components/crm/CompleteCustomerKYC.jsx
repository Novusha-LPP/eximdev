import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Tabs, Form, Input, Select, Button, Card, Space, Typography,
  Row, Col, Divider, message, Spin, Tag, DatePicker, Switch,
  Steps, Alert, Descriptions, Avatar, Tooltip, Badge, Collapse
} from 'antd';
import {
  SaveOutlined, ArrowLeftOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, SendOutlined, UserOutlined,
  PhoneOutlined, MailOutlined, BankOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { useKyc } from './hooks/useKyc';
import FileUpload from './components/FileUpload';
import FactoryAddressManager from './components/FactoryAddressManager';
import BranchManager from './components/BranchManager';
import BankAccountManager from './components/BankAccountManager';
import OpenPoints from './components/OpenPoints';
import dayjs from 'dayjs';
import '../customerKyc/customerKyc.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

/* ─── Category-specific docs ──────────────────────────────────────────────── */
const CATEGORY_DOCS = {
  'Individual/ Proprietary Firm': [
    { field: 'individual_passport_img',         label: 'Passport' },
    { field: 'individual_voter_card_img',        label: 'Voter ID Card' },
    { field: 'individual_driving_license_img',   label: 'Driving License' },
    { field: 'individual_bank_statement_img',    label: 'Bank Statement (6 months)' },
    { field: 'individual_ration_card_img',       label: 'Ration Card' },
    { field: 'individual_aadhar_card',           label: 'Aadhar Card' },
  ],
  'Partnership Firm': [
    { field: 'partnership_registration_certificate_img', label: 'Registration Certificate' },
    { field: 'partnership_deed_img',                     label: 'Partnership Deed' },
    { field: 'partnership_power_of_attorney_img',        label: 'Power of Attorney' },
    { field: 'partnership_valid_document',               label: 'Officially Valid Document' },
    { field: 'partnership_aadhar_card_front_photo',      label: 'Aadhar — Front' },
    { field: 'partnership_aadhar_card_back_photo',       label: 'Aadhar — Back' },
    { field: 'partnership_telephone_bill',               label: 'Telephone Bill' },
  ],
  'Company': [
    { field: 'company_certificate_of_incorporation_img', label: 'Certificate of Incorporation' },
    { field: 'company_memorandum_of_association_img',    label: 'Memorandum of Association' },
    { field: 'company_articles_of_association_img',      label: 'Articles of Association' },
    { field: 'company_power_of_attorney_img',            label: 'Power of Attorney' },
    { field: 'company_telephone_bill_img',               label: 'Telephone Bill' },
    { field: 'company_pan_allotment_letter_img',         label: 'PAN Allotment Letter' },
  ],
  'Trust Foundations': [
    { field: 'trust_certificate_of_registration_img',   label: 'Certificate of Registration' },
    { field: 'trust_power_of_attorney_img',             label: 'Power of Attorney' },
    { field: 'trust_officially_valid_document_img',     label: 'Officially Valid Document' },
    { field: 'trust_resolution_of_managing_body_img',   label: 'Resolution of Managing Body' },
    { field: 'trust_telephone_bill_img',                label: 'Telephone Bill' },
  ],
};

/* ─── Completion checker ─────────────────────────────────────────────────── */
function checkPhase3(record, files, banks) {
  const catDocs = CATEGORY_DOCS[record?.category] || [];
  const uploadedCatDocs = catDocs.filter(d => (files[d.field] || []).length > 0).length;
  return {
    banks:        (banks || []).length >= 1,
    nameBoard:    (files.factoryBoard  || []).length >= 1,
    selfie:       (files.factorySelfie || []).length >= 1,
    catDocs:      uploadedCatDocs >= 2,
    catDocsCount: uploadedCatDocs,
    catDocsTotal: catDocs.length,
  };
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  TAB: OVERVIEW                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */
function OverviewTab({ record, contacts }) {
  const address = (pre) => {
    if (!record) return null;
    const l1 = record[`${pre}_line_1`] || record[`${pre}_address_line_1`] || '';
    const city  = record[`${pre}_city`]  || record[`${pre}_address_city`]  || '';
    const state = record[`${pre}_state`] || record[`${pre}_address_state`] || '';
    const pin   = record[`${pre}_pin_code`] || record[`${pre}_address_pin_code`] || '';
    if (!l1 && !city) return null;
    return [l1, city, state, pin].filter(Boolean).join(', ');
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        {/* Addresses */}
        <Col xs={24} md={12}>
          <Card size="small" title="Addresses" style={{ borderRadius: 8 }}>
            {address('permanent_address') ? (
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Permanent</Text>
                <Paragraph style={{ margin: 0, fontSize: 13 }}>{address('permanent_address')}</Paragraph>
              </div>
            ) : null}
            {address('principle_business_address') ? (
              <div>
                <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Principal Business</Text>
                <Paragraph style={{ margin: 0, fontSize: 13 }}>
                  {address('principle_business_address')}
                  {record.principle_business_gst_no && (
                    <div style={{ marginTop: 4 }}>
                      <Tag color="blue" style={{ fontSize: 10 }}>GST: {record.principle_business_gst_no}</Tag>
                    </div>
                  )}
                </Paragraph>
              </div>
            ) : null}
            {!address('permanent_address') && !address('principle_business_address') && (
              <Text type="secondary">No addresses on file</Text>
            )}
          </Card>
        </Col>

        {/* Contacts snapshot */}
        <Col xs={24} md={12}>
          <Card size="small" title={`Contacts (${(contacts || []).length})`} style={{ borderRadius: 8 }}>
            {(contacts || []).length === 0 && <Text type="secondary">No contacts added</Text>}
            {(contacts || []).slice(0, 4).map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < contacts.length - 1 ? 8 : 0 }}>
                <Avatar size={30} style={{ background: '#722ed1', fontSize: 12 }}>{c.name?.charAt(0) || '?'}</Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ fontSize: 13, display: 'block' }}>{c.name || c.full_name} <Text type="secondary" style={{ fontSize: 11 }}>{c.designation}</Text></Text>
                  <Space size={8}>
                    {c.mobile && <Text style={{ fontSize: 11 }}><PhoneOutlined /> {c.mobile}</Text>}
                    {c.email  && <Text style={{ fontSize: 11 }}><MailOutlined /> {c.email}</Text>}
                  </Space>
                </div>
              </div>
            ))}
            {contacts?.length > 4 && <Text type="secondary" style={{ fontSize: 11 }}>+{contacts.length - 4} more in Contacts tab</Text>}
          </Card>
        </Col>

        {/* Quick facts */}
        <Col xs={24}>
          <Card size="small" title="Quick Facts" style={{ borderRadius: 8 }}>
            <Descriptions size="small" column={{ xs: 1, sm: 2, md: 4 }}>
              <Descriptions.Item label="Approval">{record?.approval}</Descriptions.Item>
              <Descriptions.Item label="Approved By">{record?.approved_by || '—'}</Descriptions.Item>
              <Descriptions.Item label="Contacts">{(contacts || []).length}</Descriptions.Item>
              <Descriptions.Item label="Remarks">{record?.remarks || '—'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  TAB: CONTACTS (rich cards)                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
function ContactsTab({ contacts }) {
  if (!contacts || contacts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Text type="secondary">No contacts on file. Use the Prospect edit form to add contacts.</Text>
      </div>
    );
  }
  return (
    <Row gutter={[16, 16]}>
      {contacts.map((c, i) => (
        <Col xs={24} sm={12} md={8} key={i}>
          <Card size="small" style={{ borderRadius: 10, height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Avatar size={40} style={{ background: '#722ed1', fontSize: 16 }}>
                {(c.name || c.full_name || '?').charAt(0)}
              </Avatar>
              <div>
                <Text strong style={{ display: 'block' }}>{c.name || c.full_name}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{c.designation || '—'}</Text>
              </div>
            </div>
            <Descriptions size="small" column={1}>
              {c.department && <Descriptions.Item label="Dept">{c.department}</Descriptions.Item>}
              {c.mobile     && <Descriptions.Item label="Mobile">{c.mobile}</Descriptions.Item>}
              {c.email      && <Descriptions.Item label="Email">{c.email}</Descriptions.Item>}
              {c.salutation && <Descriptions.Item label="Salutation">{c.salutation}</Descriptions.Item>}
            </Descriptions>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  TAB: DOCUMENTS (thumbnail grid)                                            */
/* ─────────────────────────────────────────────────────────────────────────── */
function DocLink({ files, label }) {
  if (!files || files.length === 0) return (
    <div style={{ padding: '8px 0', color: '#bfbfbf', fontSize: 13 }}>{label}: <em>Not uploaded</em></div>
  );
  return (
    <div style={{ padding: '6px 0' }}>
      <Text style={{ fontSize: 12, color: '#595959' }}>{label}:</Text>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        {files.map((f, i) => (
          <a key={i} href={f} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: '#1890ff', border: '1px solid #91d5ff', borderRadius: 4, padding: '2px 8px', background: '#e6f7ff' }}>
            File {i + 1}
          </a>
        ))}
      </div>
    </div>
  );
}

function DocumentsTab({ record, files }) {
  const catDocs = CATEGORY_DOCS[record?.category] || [];
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={12}>
        <Card size="small" title="Core Documents" style={{ borderRadius: 8 }}>
          <DocLink files={record?.pan_copy}  label="PAN Copy" />
          {record?.pan_no && <Text style={{ fontSize: 12 }}>PAN No: <strong style={{ fontFamily: 'monospace' }}>{record.pan_no}</strong></Text>}
          <Divider dashed style={{ margin: '8px 0' }} />
          <DocLink files={record?.iec_copy}  label="IEC Copy" />
          <DocLink files={record?.authorised_signatories} label="Authorised Signatories" />
          <DocLink files={record?.authorisation_letter}   label="Authorisation Letter" />
        </Card>
      </Col>
      {catDocs.length > 0 && (
        <Col xs={24} md={12}>
          <Card size="small" title={`${record?.category} Documents`} style={{ borderRadius: 8 }}>
            {catDocs.map(d => (
              <DocLink key={d.field} files={files[d.field] || record?.[d.field]} label={d.label} />
            ))}
          </Card>
        </Col>
      )}
      <Col xs={24} md={12}>
        <Card size="small" title="Compliance Documents" style={{ borderRadius: 8 }}>
          <DocLink files={files.spcbReg    || record?.spcb_reg}   label="SPCB Registration" />
          <DocLink files={files.gstReturns || record?.gst_returns} label="GST Returns" />
          <DocLink files={files.otherDocs  || record?.other_documents} label="Other Documents" />
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card size="small" title="Physical Verification" style={{ borderRadius: 8 }}>
          <DocLink files={files.factoryBoard  || record?.factory_name_board_img} label="Factory Name Board" />
          <DocLink files={files.factorySelfie || record?.factory_selfie_img}     label="Factory Selfie" />
          <DocLink files={files.kycVerification || record?.kyc_verification_images} label="Additional Photos" />
        </Card>
      </Col>
    </Row>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  TAB: BANKING                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */
function BankingTab({ banks, onChange }) {
  return <BankAccountManager value={banks} onChange={onChange} />;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  TAB: FACTORY & BRANCHES                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
function LocationsTab({ factories, onFactoryChange, branches, onBranchChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <FactoryAddressManager value={factories} onChange={onFactoryChange} />
      <Divider dashed />
      <BranchManager value={branches} onChange={onBranchChange} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  TAB: FINANCE                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */
function FinanceTab({ form, record }) {
  const catDocs = CATEGORY_DOCS[record?.category] || [];
  return (
    <Row gutter={[16, 0]}>
      <Col xs={24} sm={8}><Form.Item name="credit_period"              label="Credit Period">     <Input placeholder="e.g. 30 days" /></Form.Item></Col>
      <Col xs={24} sm={8}><Form.Item name="outstanding_limit"          label="Credit Limit">      <Input placeholder="e.g. ₹5,00,000" /></Form.Item></Col>
      <Col xs={24} sm={8}><Form.Item name="credit_limit_validity_date" label="Credit Validity">   <DatePicker style={{ width: '100%' }} /></Form.Item></Col>
      <Col xs={24} sm={8}><Form.Item name="quotation"                  label="Quotation">
        <Select><Option value="Yes">Yes</Option><Option value="No">No</Option></Select>
      </Form.Item></Col>
      <Col xs={24} sm={8}><Form.Item name="advance_payment"  label="Advance Payment" valuePropName="checked"><Switch /></Form.Item></Col>
      <Col xs={24} sm={8}><Form.Item name="date_of_incorporation" label="Date of Incorporation">  <DatePicker style={{ width: '100%' }} /></Form.Item></Col>
      <Col xs={24} sm={8}><Form.Item name="principle_business_gst_no" label="Principal Address GST No"> <Input placeholder="GST No" /></Form.Item></Col>
      <Col xs={24}><Form.Item name="hsn_codes" label="HSN Codes (comma-separated)"><Input.TextArea rows={2} placeholder="8471, 8473, 9013" /></Form.Item></Col>
    </Row>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  TAB: COMPLIANCE & LEGAL DOCS                                               */
/* ─────────────────────────────────────────────────────────────────────────── */
function ComplianceTab({ record, files, setFile }) {
  const catDocs = CATEGORY_DOCS[record?.category] || [];
  const uploadedCatDocs = catDocs.filter(d => (files[d.field] || []).length > 0).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Physical verification */}
      <div>
        <Text strong style={{ color: '#1890ff', display: 'block', marginBottom: 12 }}>Physical Verification</Text>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <div style={{ padding: 12, border: `1px solid ${(files.factoryBoard||[]).length > 0 ? '#b7eb8f':'#ffccc7'}`, borderRadius: 8, background: (files.factoryBoard||[]).length > 0 ? '#f6ffed':'#fff1f0' }}>
              <FileUpload label={<><span style={{ color:'#ff4d4f' }}>*</span> Factory Name Board</>} value={files.factoryBoard} onChange={v => setFile('factoryBoard', v)} bucketPath="crm-docs/factory" />
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ padding: 12, border: `1px solid ${(files.factorySelfie||[]).length > 0 ? '#b7eb8f':'#ffccc7'}`, borderRadius: 8, background: (files.factorySelfie||[]).length > 0 ? '#f6ffed':'#fff1f0' }}>
              <FileUpload label={<><span style={{ color:'#ff4d4f' }}>*</span> Factory Selfie</>} value={files.factorySelfie} onChange={v => setFile('factorySelfie', v)} bucketPath="crm-docs/factory-selfie" />
            </div>
          </Col>
          <Col xs={24}>
            <FileUpload label="Additional Photos" value={files.kycVerification} onChange={v => setFile('kycVerification', v)} bucketPath="crm-docs/kyc" />
          </Col>
        </Row>
      </div>

      <Divider dashed />

      {/* Compliance docs */}
      <div>
        <Text strong style={{ color: '#1890ff', display: 'block', marginBottom: 12 }}>Compliance</Text>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}><FileUpload label="SPCB Registration"    value={files.spcbReg}    onChange={v => setFile('spcbReg', v)}    bucketPath="crm-docs/spcb" /></Col>
          <Col xs={24} md={12}><FileUpload label="GST Returns (3 months)" value={files.gstReturns} onChange={v => setFile('gstReturns', v)} bucketPath="crm-docs/gst" /></Col>
          <Col xs={24} md={12}><FileUpload label="Other Documents"       value={files.otherDocs}  onChange={v => setFile('otherDocs', v)}  bucketPath="crm-docs/other" /></Col>
        </Row>
      </div>

      <Divider dashed />

      {/* Category-specific */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Text strong style={{ color: '#1890ff' }}>{record?.category} Documents</Text>
          <Badge
            count={`${uploadedCatDocs}/${catDocs.length}`}
            style={{ backgroundColor: uploadedCatDocs >= 2 ? '#52c41a' : uploadedCatDocs > 0 ? '#faad14' : '#ff4d4f' }}
          />
          <Tag color="error" style={{ fontSize: 11 }}>Min 2 required</Tag>
        </div>
        {catDocs.length === 0 ? (
          <Alert type="info" message="Category not set. Check the Phase 1 info." />
        ) : (
          <Row gutter={[16, 16]}>
            {catDocs.map(doc => (
              <Col xs={24} md={12} key={doc.field}>
                <div style={{ padding: 12, border: `1px solid ${(files[doc.field]||[]).length > 0 ? '#91d5ff':'#d9d9d9'}`, borderRadius: 8, background: (files[doc.field]||[]).length > 0 ? '#e6f7ff':'#fafafa' }}>
                  <FileUpload
                    label={doc.label}
                    value={files[doc.field] || []}
                    onChange={v => setFile(doc.field, v)}
                    bucketPath={`crm-docs/${record?.category?.toLowerCase().replace(/\s+/g,'-') || 'docs'}`}
                  />
                </div>
              </Col>
            ))}
          </Row>
        )}
        {record?.category === 'Trust Foundations' && (
          <>
            <Divider dashed style={{ margin: '16px 0' }} />
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12}><Form.Item name="trust_name_of_trustees"   label="Name of Trustees"><Input /></Form.Item></Col>
              <Col xs={24} sm={12}><Form.Item name="trust_name_of_founder"    label="Name of Founder"><Input /></Form.Item></Col>
              <Col xs={24} sm={12}><Form.Item name="trust_address_of_founder" label="Founder Address"><Input /></Form.Item></Col>
              <Col xs={24} sm={12}><Form.Item name="trust_telephone_of_founder" label="Founder Phone"><Input /></Form.Item></Col>
              <Col xs={24} sm={12}><Form.Item name="trust_email_of_founder"   label="Founder Email"><Input /></Form.Item></Col>
            </Row>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  COMPLETION HEADER STEPS                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
function CompletionSteps({ done }) {
  const count = [done.banks, done.nameBoard, done.selfie, done.catDocs].filter(Boolean).length;
  const steps = [
    { title: 'Banks',      done: done.banks     },
    { title: 'Name Board', done: done.nameBoard },
    { title: 'Selfie',     done: done.selfie    },
    { title: `Docs (${done.catDocsCount}/${done.catDocsTotal})`, done: done.catDocs },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 0', flexWrap: 'wrap' }}>
      <Text style={{ fontSize: 13, color: count === 4 ? '#52c41a' : '#faad14', fontWeight: 600 }}>
        Phase 3: {count}/4
      </Text>
      {steps.map((s, i) => (
        <Space key={i} size={4}>
          {s.done
            ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 15 }} />
            : <ExclamationCircleOutlined style={{ color: '#d9d9d9', fontSize: 15 }} />}
          <Text style={{ fontSize: 12, color: s.done ? '#52c41a' : '#8c8c8c' }}>{s.title}</Text>
        </Space>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */
function CompleteCustomerKYC({ onNavigate, record: initRecord }) {
  const [form]              = Form.useForm();
  const { updateCustomer, loading } = useKyc();
  const [record, setRecord] = useState(initRecord);
  const [fetching, setFetching] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [banks,     setBanks]     = useState([]);
  const [factories, setFactories] = useState([]);
  const [branches,  setBranches]  = useState([]);
  const [contacts,  setContacts]  = useState([]);

  const [files, setFiles] = useState({
    factoryBoard: [], factorySelfie: [], kycVerification: [],
    spcbReg: [], gstReturns: [], otherDocs: [],
  });
  const setFile = (field, val) => setFiles(p => ({ ...p, [field]: val }));

  /* ── Load ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!initRecord?._id) return;
    setFetching(true);
    const get = async (id) => {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/customers/${id}`,
        { withCredentials: true }
      );
      return res.data;
    };
    get(initRecord._id)
      .then(full => {
        setRecord(full);
        const fv = { ...full };
        if (full.credit_limit_validity_date) fv.credit_limit_validity_date = dayjs(full.credit_limit_validity_date);
        if (full.date_of_incorporation)      fv.date_of_incorporation      = dayjs(full.date_of_incorporation);
        form.setFieldsValue(fv);
        setBanks(full.banks || []);
        setFactories(full.factory_addresses || []);
        setBranches(full.branches || []);
        setContacts(full.contacts || []);

        const catDocs = CATEGORY_DOCS[full.category] || [];
        const fileState = {
          factoryBoard:    full.factory_name_board_img   || [],
          factorySelfie:   full.factory_selfie_img       || [],
          kycVerification: full.kyc_verification_images  || [],
          spcbReg:         full.spcb_reg                 || [],
          gstReturns:      full.gst_returns              || [],
          otherDocs:       full.other_documents          || [],
        };
        catDocs.forEach(d => { fileState[d.field] = full[d.field] || []; });
        setFiles(fileState);
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [initRecord?._id]);

  /* ── Build payload ────────────────────────────────────────────────────── */
  const buildPayload = () => {
    const vals = form.getFieldsValue(true);
    if (vals.credit_limit_validity_date?.toDate) vals.credit_limit_validity_date = vals.credit_limit_validity_date.toDate();
    if (vals.date_of_incorporation?.toDate)      vals.date_of_incorporation      = vals.date_of_incorporation.toDate();
    const catDocs = CATEGORY_DOCS[record?.category] || [];
    const catPayload = {};
    catDocs.forEach(d => { catPayload[d.field] = files[d.field] || []; });
    return {
      ...vals,
      banks, factory_addresses: factories, branches,
      factory_name_board_img:  files.factoryBoard,
      factory_selfie_img:      files.factorySelfie,
      kyc_verification_images: files.kycVerification,
      spcb_reg:                files.spcbReg,
      gst_returns:             files.gstReturns,
      other_documents:         files.otherDocs,
      ...catPayload,
    };
  };

  /* ── Save ─────────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    try {
      await updateCustomer(record._id, buildPayload());
      message.success('Saved successfully.');
    } catch (_) {}
  };

  /* ── Submit-final ─────────────────────────────────────────────────────── */
  const handleSubmitFinal = async () => {
    const done = checkPhase3(record, files, banks);
    if (!done.banks)    { message.error('Add at least 1 bank account.'); return; }
    if (!done.nameBoard){ message.error('Upload factory name board photo.'); return; }
    if (!done.selfie)   { message.error('Upload factory selfie photo.'); return; }
    if (!done.catDocs)  { message.error(`Upload at least 2 ${record?.category} documents (${done.catDocsCount} uploaded).`); return; }
    try {
      await updateCustomer(record._id, buildPayload());
      await axios.post(`${process.env.REACT_APP_API_STRING}/crm/customers/${record._id}/submit-final`, {}, { withCredentials: true });
      message.success('KYC marked as complete!');
      onNavigate('customers');
    } catch (err) {
      message.error(err?.response?.data?.message || 'Submission failed.');
    }
  };

  const done = checkPhase3(record, files, banks);
  if (!record) return null;

  /* ── Tab items ────────────────────────────────────────────────────────── */
  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: <OverviewTab record={record} contacts={contacts} />,
    },
    {
      key: 'contacts',
      label: <Space>Contacts <Badge count={contacts.length} style={{ backgroundColor: '#722ed1' }} /></Space>,
      children: <ContactsTab contacts={contacts} />,
    },
    {
      key: 'documents',
      label: 'Documents',
      children: <DocumentsTab record={record} files={files} />,
    },
    {
      key: 'banking',
      label: <Space>Banking {banks.length === 0 && <Badge count="!" style={{ backgroundColor: '#ff4d4f' }} />}</Space>,
      children: <Form form={form} layout="vertical"><BankingTab banks={banks} onChange={setBanks} /></Form>,
    },
    {
      key: 'locations',
      label: 'Factory & Branches',
      children: <LocationsTab factories={factories} onFactoryChange={setFactories} branches={branches} onBranchChange={setBranches} />,
    },
    {
      key: 'finance',
      label: 'Finance',
      children: <Form form={form} layout="vertical"><FinanceTab form={form} record={record} /></Form>,
    },
    {
      key: 'compliance',
      label: 'Compliance & Docs',
      children: <Form form={form} layout="vertical"><ComplianceTab record={record} files={files} setFile={setFile} /></Form>,
    },
    {
      key: 'activity',
      label: <Space>Activity {done.catDocsCount === 0 && <Badge count="0" style={{ backgroundColor: '#faad14' }} />}</Space>,
      children: <OpenPoints recordId={record._id} />,
    },
  ];

  return (
    <Spin spinning={fetching}>
      <div className="app customer-kyc-wrapper" style={{ minHeight: 'auto', padding: 0, background: 'transparent' }}>
        <div className="page" style={{ padding: 0 }}>
          
          <div className="card-header" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
            <div className="flex-between" style={{ alignItems: 'flex-start' }}>
              <div>
                <button
                  className="back-btn"
                  onClick={() => onNavigate('customers')}
                >
                  <ArrowLeftOutlined /> Back
                </button>
                <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', marginBottom: 4 }}>
                  {record.name_of_individual}
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', background: 'var(--success)', color: '#fff', borderRadius: 4, textTransform: 'none', letterSpacing: 'normal' }}>
                    {record.approval}
                  </span>
                </h2>
                <div style={{ display: 'flex', gap: '12px', fontSize: '13px', alignItems: 'center', marginTop: 4 }}>
                   <span style={{ color: 'var(--text-mid)' }}>IEC: <strong style={{ color: 'var(--text-dark)', fontFamily: 'monospace' }}>{record.iec_no}</strong></span>
                   {record.pan_no && <span style={{ color: 'var(--text-mid)' }}>PAN: <strong style={{ color: 'var(--text-dark)', fontFamily: 'monospace' }}>{record.pan_no}</strong></span>}
                   {record.category && <span style={{ padding: '2px 10px', background: 'var(--blue-light)', color: 'var(--blue)', borderRadius: 14, fontSize: 11, fontWeight: 600 }}>{record.category}</span>}
                   {record.status && <span style={{ padding: '2px 10px', background: 'var(--info-light)', color: 'var(--info)', borderRadius: 14, fontSize: 11, fontWeight: 600 }}>{record.status}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <CompletionSteps done={done} />
              </div>
            </div>
          </div>

          <div className="kyc-card" style={{ padding: 0 }}>
            {/* ─── Tabs ─────────────────────────────────────────────────────────── */}
            <div style={{ background: 'var(--surface)' }}>
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                style={{ padding: '0 8px' }}
                tabBarStyle={{ marginBottom: 0, paddingLeft: 8 }}
              />
              <div style={{ padding: 20, minHeight: 300 }}>
                {tabItems.find(t => t.key === activeTab)?.children}
              </div>
            </div>

            {/* ─── Footer Actions ──────────────────────────────────────────────── */}
            <div className="form-footer" style={{ marginTop: 0, borderTop: '1px solid var(--border)' }}>
              <div className="footer-info">
                Phase 3 Requirements: {done.banks && done.nameBoard && done.selfie && done.catDocs ? <span style={{ color: 'var(--success)' }}>Completed</span> : <span style={{ color: 'var(--warning)' }}>Pending</span>}
              </div>
              <div className="footer-actions">
                <button type="button" className="btn btn-secondary" onClick={handleSave} disabled={loading}>
                  <SaveOutlined /> Save Draft
                </button>
                <button
                  type="button"
                  className={done.banks && done.nameBoard && done.selfie && done.catDocs ? "btn btn-success" : "btn btn-primary"}
                  onClick={handleSubmitFinal}
                  disabled={loading}
                >
                  <SendOutlined /> Mark Complete
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Spin>
  );
}

export default React.memo(CompleteCustomerKYC);
