import React, { useState } from 'react';
import {
  Table, Button, Space, Modal, Form, Input, message, Popconfirm,
  Typography, Tag, Tooltip, Badge
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BankOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import FileUpload from './FileUpload';

const { Text } = Typography;

/* Detect common bank names from IFSC prefix */
const BANK_NAMES = {
  SBIN: 'SBI', HDFC: 'HDFC Bank', ICIC: 'ICICI Bank', UTIB: 'Axis Bank',
  PUNB: 'PNB', BARB: 'Bank of Baroda', KKBK: 'Kotak Bank', YESB: 'Yes Bank',
  INDB: 'IndusInd Bank', IOBA: 'IOB', CNRB: 'Canara Bank', UBIN: 'Union Bank',
  BKID: 'Bank of India', CBIN: 'Central Bank', IDIB: 'Indian Bank', KVBL: 'Karur Vysya',
};
function detectBank(ifsc) { return BANK_NAMES[ifsc?.slice(0, 4)?.toUpperCase()] || null; }

function maskAccount(no) {
  if (!no || no.length <= 4) return no || '—';
  return '•'.repeat(no.length - 4) + no.slice(-4);
}

function BankAccountManager({ value = [], onChange }) {
  const [visibleAccounts, setVisibleAccounts] = useState({});

  const toggleVisibility = (i) => setVisibleAccounts(p => ({ ...p, [i]: !p[i] }));
  const add = () => onChange([...value, {}]);
  const remove = i => onChange(value.filter((_, idx) => idx !== i));
  const update = (i, field, val) => {
    const next = [...value];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue)' }}>BANK ACCOUNTS ({value.length})</div>
          {value.length === 0 && <Tag color="error" style={{ fontSize: 10 }}>Min 1 required</Tag>}
        </Space>
        <button type="button" className="btn btn-outline btn-sm" onClick={add}>+ Add Bank</button>
      </div>

      {value.map((b, i) => {
        const detected = detectBank(b.ifsc);
        return (
          <div key={i} className="repeat-entry">
            <div className="repeat-entry-header">
              <div className="repeat-entry-title">
                <BankOutlined style={{ marginRight: 6 }} /> Bank Account {i + 1}
                {detected && <Tag color="blue" style={{ marginLeft: 8, fontSize: 10 }}>{detected}</Tag>}
              </div>
              <button type="button" className="btn-remove" onClick={() => remove(i)}>🗑</button>
            </div>
            <div className="fields">
              <div className="row">
                <div className="field w-half">
                  <label>Bank Name <span className="req">*</span></label>
                  <input type="text" placeholder="e.g. HDFC Bank" value={b.bankers_name || ''} onChange={e => update(i, 'bankers_name', e.target.value)} />
                </div>
                <div className="field w-half">
                  <label>IFSC Code <span className="req">*</span></label>
                  <input type="text" placeholder="HDFC0001234" maxLength={11} style={{ textTransform: 'uppercase', fontFamily: 'monospace' }} value={b.ifsc || ''} onChange={e => {
                    const val = e.target.value.toUpperCase();
                    update(i, 'ifsc', val);
                  }} />
                </div>
              </div>
              <div className="row mt-2">
                <div className="field w-half">
                  <label>Account Number <span className="req">*</span></label>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: 4, paddingRight: 6 }}>
                    <input type="text" placeholder="9-18 digit account number" style={{ border: 'none', flex: 1, fontFamily: 'monospace' }} value={visibleAccounts[i] ? (b.account_no || '') : maskAccount(b.account_no)} onChange={e => update(i, 'account_no', e.target.value)} />
                    <Button type="text" size="small" icon={visibleAccounts[i] ? <EyeInvisibleOutlined style={{ color: '#8c8c8c' }} /> : <EyeOutlined style={{ color: '#1890ff' }} />} onClick={() => toggleVisibility(i)} style={{ padding: 0, height: 20, width: 20 }} />
                  </div>
                </div>
                <div className="field w-half">
                  <label>AD Code</label>
                  <input type="text" placeholder="AD Code (if available)" value={b.adCode || ''} onChange={e => update(i, 'adCode', e.target.value)} />
                </div>
              </div>
              <div className="row mt-2">
                <div className="field w-full">
                  <label>Branch Address</label>
                  <textarea rows="2" placeholder="Full branch address" value={b.branch_address || ''} onChange={e => update(i, 'branch_address', e.target.value)} />
                </div>
              </div>
              <div className="row mt-2">
                <div className="field w-full">
                  <FileUpload label="AD Code Document" value={b.adCode_file || []} onChange={v => update(i, 'adCode_file', v)} bucketPath="crm-docs/ad-code" />
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {value.length === 0 && (
        <div className="empty-state">No bank accounts added — at least 1 is required for submission.</div>
      )}
    </div>
  );
}

export default BankAccountManager;
