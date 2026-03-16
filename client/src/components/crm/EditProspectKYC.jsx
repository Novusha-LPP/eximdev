import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Form, Input, Select, Button, Card, Space, Typography, 
  Row, Col, Divider, message, Spin, Tag, Steps, 
  Tooltip, Badge, Avatar, InputNumber, DatePicker
} from 'antd';
import {
  SaveOutlined, SendOutlined, ArrowLeftOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, InfoCircleOutlined,
  GlobalOutlined, IdcardOutlined, ContactsOutlined,
  FileTextOutlined, ThunderboltOutlined, UserOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useKyc } from './hooks/useKyc';
import ContactManager from './components/ContactManager';
import FileUpload from './components/FileUpload';
import '../customerKyc/KycForm.scss';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh'
];

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

function SectionHeader({ icon, title, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
      <div style={{ 
        width: '40px', height: '40px', background: '#f0f9ff', color: '#3b82f6', 
        borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' 
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>{title}</div>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>{sub}</div>
      </div>
    </div>
  );
}

export default function EditProspectKYC({ onNavigate, record: initialRecord }) {
  const [form] = Form.useForm();
  const { getProspect, updateProspect, loading } = useKyc();
  const [record, setRecord] = useState(initialRecord);
  const [fetching, setFetching] = useState(false);

  const [panCopy, setPanCopy] = useState([]);
  const [iecCopy, setIecCopy] = useState([]);
  const [authSig, setAuthSig] = useState([]);
  const [authLetter, setAuthLetter] = useState([]);
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    if (!initialRecord?._id) return;
    setFetching(true);
    getProspect(initialRecord._id)
      .then(full => {
        setRecord(full);
        form.setFieldsValue({
            ...full,
            expected_closure_date: full.expected_closure_date ? dayjs(full.expected_closure_date) : null
        });
        setContacts(full.contacts || []);
        setPanCopy(full.pan_copy || []);
        setIecCopy(full.iec_copy || []);
        setAuthSig(full.authorised_signatories || []);
        setAuthLetter(full.authorisation_letter || []);
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [initialRecord?._id, form]);

  const loadCompletion = useMemo(() => {
    const vals = form.getFieldsValue(true) || {};
    return checkCompletion({ ...vals, contacts }, { panCopy, iecCopy });
  }, [form.getFieldsValue(true), contacts, panCopy, iecCopy]);

  const buildPayload = () => {
    const vals = form.getFieldsValue(true);
    return {
        ...vals,
        contacts,
        pan_copy: panCopy,
        iec_copy: iecCopy,
        authorised_signatories: authSig,
        authorisation_letter: authLetter,
        expected_closure_date: vals.expected_closure_date ? vals.expected_closure_date.toDate() : undefined
    };
  };

  const handleSave = async () => {
    try {
      const updated = await updateProspect(record._id, buildPayload());
      setRecord(updated?.data || record);
      message.success('Lead progress saved');
    } catch (_) {}
  };

  const handleSubmit = async () => {
    const payload = buildPayload();
    const done = checkCompletion(payload, { panCopy, iecCopy });
    
    if (!done.address || !done.contacts || !done.pan || !done.iec) {
        message.warning('KYC documentation requirements not fully met. Progress saved, but cannot submit for final approval yet.');
        handleSave();
        return;
    }

    try {
      await updateProspect(record._id, payload);
      const { default: axios } = await import('axios');
      await axios.post(`${process.env.REACT_APP_API_STRING}/crm/prospects/${record._id}/submit`, {}, { withCredentials: true });
      message.success('Lead submitted to Compliance for final onboarding!');
      onNavigate('prospects');
    } catch (err) {
      message.error(err?.response?.data?.message || 'Submission failed');
    }
  };

  if (!record) return null;

  return (
    <Spin spinning={fetching}>
      <div style={{ animation: "fadeIn 0.5s ease", maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header Block */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <Space direction="vertical" size={0}>
            <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => onNavigate('prospects')} style={{ padding: 0 }}>
              Back to Pipeline
            </Button>
            <Title level={2} style={{ margin: 0, fontWeight: 800 }}>
              {record.name_of_individual}
              <Tag color="processing" style={{ marginLeft: '12px', verticalAlign: 'middle', borderRadius: '4px' }}>{record.crm_stage?.toUpperCase()}</Tag>
            </Title>
            <Text type="secondary">Enterprise ID: {record.iec_no} • Created {dayjs(record.createdAt).fromNow()}</Text>
          </Space>
          <Space size="middle">
             <Button icon={<SaveOutlined />} onClick={handleSave} loading={loading}>Save Progress</Button>
             <Button type="primary" icon={<SendOutlined />} onClick={handleSubmit} loading={loading}>Submit for Onboarding</Button>
          </Space>
        </div>

        <Row gutter={[24, 24]}>
          {/* Main Form Left Column */}
          <Col xs={24} lg={16}>
            <Form form={form} layout="vertical">
              
              {/* Sales Intelligence Card */}
              <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
                <SectionHeader icon={<ThunderboltOutlined />} title="Sales Intelligence" sub="Deal mechanics and revenue forecasting" />
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="estimated_revenue" label={<Text strong>Deal Value (₹)</Text>}>
                      <InputNumber style={{ width: '100%' }} size="large" prefix="₹" formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="deal_probability" label={<Text strong>Win Probability (%)</Text>}>
                      <Select size="large">
                        <Option value={10}>10% - Cold Discovery</Option>
                        <Option value={30}>30% - Needs Discovery</Option>
                        <Option value={50}>50% - Proposal Sent</Option>
                        <Option value={75}>75% - Negotiation</Option>
                        <Option value={90}>90% - Verball Agreement</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="service_interest" label={<Text strong>Service Interest</Text>}>
                      <Select mode="multiple" size="large" placeholder="Select products">
                        <Option value="CHA">Customs Clearance (CHA)</Option>
                        <Option value="Freight">Freight Forwarding</Option>
                        <Option value="Transport">Surface Transport</Option>
                        <Option value="Warehouse">Warehousing</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="expected_closure_date" label={<Text strong>Expected Close Date</Text>}>
                      <DatePicker size="large" style={{ width: '100%' }} format="DD MMM YYYY" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              {/* Physical Addresses */}
              <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
                <SectionHeader icon={<GlobalOutlined />} title="Office Locations" sub="Regulatory and business addresses" />
                
                <Title level={5}>Permanent Address</Title>
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item name="permanent_address_line_1" label="Address Line 1"><Input placeholder="Building/Street" /></Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="permanent_address_city" label="City"><Input /></Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item name="permanent_address_state" label="State">
                       <Select showSearch>
                         {INDIAN_STATES.map(s => <Option key={s} value={s}>{s}</Option>)}
                       </Select>
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item name="permanent_address_pin_code" label="PIN Code"><Input maxLength={6} /></Form.Item>
                  </Col>
                </Row>

                <Divider />

                <Title level={5}>Business Communication Contact</Title>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="permanent_address_telephone" label="Phone/Mobile"><Input prefix="+91" /></Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="permanent_address_email" label="Official Email"><Input /></Form.Item>
                  </Col>
                </Row>
              </Card>

              {/* Contact Personnel */}
              <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
                <SectionHeader icon={<ContactsOutlined />} title="Key Relationships" sub="Stakeholders and decision makers" />
                <ContactManager value={contacts} onChange={setContacts} />
              </Card>

              {/* Statutory Documents */}
              <Card bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <SectionHeader icon={<FileTextOutlined />} title="Compliance Dossier" sub="Mandatory regulatory documentation" />
                <Row gutter={24}>
                    <Col span={12}>
                        <Form.Item name="pan_no" label={<Text strong>PAN Number</Text>} rules={[{ pattern: /^[A-Z]{5}[0-9]{4}[A-Z]$/, message: 'Invalid PAN' }]}>
                            <Input size="large" maxLength={10} style={{ textTransform: 'uppercase', fontFamily: 'monospace' }} />
                        </Form.Item>
                        <FileUpload label="PAN Card Copy" value={panCopy} onChange={setPanCopy} bucketPath="crm/pan" />
                    </Col>
                    <Col span={12}>
                        <Form.Item label={<Text strong>IEC Registration</Text>}>
                            <Input size="large" disabled value={record.iec_no} style={{ fontFamily: 'monospace' }} />
                        </Form.Item>
                        <FileUpload label="IEC Certificate Copy" value={iecCopy} onChange={setIecCopy} bucketPath="crm/iec" />
                    </Col>
                </Row>
              </Card>
            </Form>
          </Col>

          {/* Side Info Column */}
          <Col xs={24} lg={8}>
            <Card title="KYC Progress Tracker" bordered={false} style={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', position: 'sticky', top: '24px' }}>
                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    <Badge count={`${Object.values(loadCompletion).filter(Boolean).length}/4`} color="#52c41a" offset={[10, 0]}>
                        <Avatar size={64} style={{ backgroundColor: '#f0f9ff', color: '#3b82f6' }} icon={<ThunderboltOutlined />} />
                    </Badge>
                </div>
                <Steps
                    direction="vertical"
                    size="small"
                    items={[
                        { title: 'Physical Presence', sub: 'Address Details', status: loadCompletion.address ? 'finish' : 'wait' },
                        { title: 'Stakeholders', sub: 'Contact Manager', status: loadCompletion.contacts ? 'finish' : 'wait' },
                        { title: 'Tax Identity', sub: 'PAN Identification', status: loadCompletion.pan ? 'finish' : 'wait' },
                        { title: 'Import Logic', sub: 'IEC Verification', status: loadCompletion.iec ? 'finish' : 'wait' },
                    ]}
                />
                
                <Divider />
                
                <div style={{ padding: '12px', background: '#fff7e6', borderRadius: '8px', border: '1px solid #ffe7ba' }}>
                    <Space align="start">
                        <InfoCircleOutlined style={{ color: '#faad14', marginTop: '4px' }} />
                        <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
                            <Text strong>Onboarding Policy:</Text>
                            <br />
                            A lead cannot be converted to a "Customer" until all 4 verification pillars are completed and documents are uploaded.
                        </div>
                    </Space>
                </div>
            </Card>
          </Col>
        </Row>
      </div>
    </Spin>
  );
}
