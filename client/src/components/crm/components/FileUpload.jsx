import React, { useState } from 'react';
import { Upload, message, Typography, Button, Image, Space, Spin } from 'antd';
import { InboxOutlined, DeleteOutlined } from '@ant-design/icons';
import { useFileUpload } from '../hooks/useFileUpload';

const { Dragger } = Upload;
const { Text } = Typography;

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const MAX_SIZE_MB = 5;

/**
 * FileUpload component
 * @param {string[]} value  - array of S3 URLs (controlled)
 * @param {Function} onChange - called with new URLs array
 * @param {string}   bucketPath - S3 folder key
 * @param {string}   label
 * @param {boolean}  multiple
 */
function FileUpload({ value = [], onChange, bucketPath = 'crm-docs', label = 'Upload Files', multiple = true }) {
  const { uploading, uploadFiles } = useFileUpload();
  const [fileList, setFileList] = useState([]);

  const beforeUpload = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      message.error(`${file.name}: Only PDF, JPG, JPEG, PNG files allowed.`);
      return Upload.LIST_IGNORE;
    }
    if (file.size / 1024 / 1024 > MAX_SIZE_MB) {
      message.error(`${file.name}: File must be smaller than ${MAX_SIZE_MB}MB.`);
      return Upload.LIST_IGNORE;
    }
    return false; // prevent auto-upload
  };

  const handleChange = ({ fileList: newList }) => {
    setFileList(newList);
  };

  const handleUpload = async () => {
    if (!fileList.length) return;
    const rawFiles = fileList.filter(f => f.status !== 'done').map(f => f.originFileObj);
    if (!rawFiles.length) return;
    try {
      const urls = await uploadFiles(rawFiles, bucketPath);
      const merged = [...value, ...urls];
      onChange && onChange(merged);
      setFileList([]);
      message.success('Files uploaded successfully.');
    } catch (_) {}
  };

  const removeExisting = (url) => {
    const next = value.filter(u => u !== url);
    onChange && onChange(next);
  };

  const isImage = (url) => /\.(jpg|jpeg|png)$/i.test(url);
  const fileName = (url) => decodeURIComponent(url.split('/').pop().split('?')[0]);

  return (
    <div style={{ marginBottom: value.length > 0 ? 0 : 4 }}>
      <style>{`
        .compact-dragger .ant-upload-btn {
          padding: 8px 0 !important;
        }
        .compact-dragger .ant-upload-list-item {
          margin-top: 4px !important;
          font-size: 11px !important;
        }
      `}</style>
      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--label, #8a93a2)', textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', marginBottom: 4 }}>
        {label}
      </label>
      <Dragger
        className="compact-dragger"
        multiple={multiple}
        fileList={fileList}
        beforeUpload={beforeUpload}
        onChange={handleChange}
        accept=".pdf,.jpg,.jpeg,.png"
        style={{ background: '#fafbfc' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <InboxOutlined style={{ fontSize: 20, color: 'var(--blue, #1890ff)' }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-mid, #374151)', lineHeight: 1.2 }}>Click or drag files here</div>
            <div style={{ fontSize: 9.5, color: 'var(--text-faint, #9ca3af)', lineHeight: 1.2, marginTop: 2 }}>PDF, JPG, PNG — max {MAX_SIZE_MB}MB</div>
          </div>
        </div>
      </Dragger>

      {fileList.length > 0 && (
        <Button
          type="primary"
          onClick={handleUpload}
          loading={uploading}
          style={{ marginBottom: 12 }}
          size="small"
        >
          {uploading ? 'Uploading…' : 'Upload Selected Files'}
        </Button>
      )}

      {value.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Uploaded ({value.length}):</Text>
          <Space wrap style={{ marginTop: 4 }}>
            {value.map((url, i) => (
              <div
                key={i}
                style={{
                  border: '1px solid var(--border, #dde1e9)',
                  borderRadius: 4,
                  padding: '3px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#fafafa',
                  maxWidth: 220
                }}
              >
                {isImage(url) ? (
                  <Image src={url} width={24} height={24} style={{ objectFit: 'cover', borderRadius: 2 }} />
                ) : (
                  <span role="img" aria-label="pdf" style={{ fontSize: 16 }}>📄</span>
                )}
                <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fileName(url)}
                </a>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  onClick={() => removeExisting(url)}
                />
              </div>
            ))}
          </Space>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
