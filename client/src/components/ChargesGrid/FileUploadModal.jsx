import React, { useState, useEffect } from 'react';
import { uploadFileToS3 } from "../../utils/awsFileUpload"; 

const FileUploadModal = ({ isOpen, onClose, chargeLabel, initialUrl = null, onAttach }) => {
  const [tempFile, setTempFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTempFile(null);
      setIsUploading(false);
      setIsRemoved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setTempFile(e.target.files[0]);
      setIsRemoved(false);
    }
    e.target.value = '';
  };

  const handleRemove = () => {
    if (tempFile) {
        setTempFile(null);
    } else {
        setIsRemoved(true);
    }
  };

  const getS3FileName = (url) => {
    try {
        if (!url) return "File";
        const parts = url.split("/");
        return decodeURIComponent(parts[parts.length - 1]);
    } catch (error) {
        return "File";
    }
  };

  const handleAttach = async () => {
    setIsUploading(true);
    try {
        let finalUrl = isRemoved ? null : initialUrl;

        if (tempFile) {
            try {
                const result = await uploadFileToS3(tempFile, "charges"); 
                finalUrl = result.Location;
            } catch (err) {
                console.error("Failed to upload", tempFile.name, err);
                alert("Failed to upload " + tempFile.name);
                return;
            }
        }

        onAttach(finalUrl);
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <div className="file-modal-overlay active">
      <div className="file-modal">
        <div className="file-modal-title">📎 Attach File — {chargeLabel}</div>
        <div className="file-modal-body">
          <div 
             className="drop-zone" 
             onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over') }}
             onDragLeave={(e) => { e.currentTarget.classList.remove('drag-over') }}
             onDrop={(e) => {
               e.preventDefault();
               e.currentTarget.classList.remove('drag-over');
               if(e.dataTransfer.files && e.dataTransfer.files[0]) {
                   setTempFile(e.dataTransfer.files[0]);
                   setIsRemoved(false);
               }
             }}
             onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <div style={{ fontSize: '28px', marginBottom: '6px', opacity: 0.5 }}>⬆</div>
            <p><strong>Drag &amp; drop file here</strong></p>
            <p>or <span className="browse-link" onClick={(e) => { e.stopPropagation(); fileInputRef.current && fileInputRef.current.click()}}>browse to upload</span></p>
            <p style={{ color: '#8aA0b0', fontSize: '11px', marginTop: '6px' }}>PDF, JPG, PNG, XLSX, DOCX supported</p>
            <input 
               type="file" 
               ref={fileInputRef}
               style={{ display: 'none' }} 
               onChange={handleFileChange} 
            />
          </div>
          
          <div className="file-list" style={{ minHeight: '60px' }}>
            {(initialUrl && !isRemoved && !tempFile) && (
                <div className="file-item">
                  <span className="file-item-name">📄 {getS3FileName(initialUrl)}</span>
                  <span className="file-remove" onClick={handleRemove}>✕</span>
                </div>
            )}

            {tempFile && (
              <div className="file-item">
                <span className="file-item-name">📄 {tempFile.name} <span style={{ color: '#8aA0b0' }}>({(tempFile.size/1024).toFixed(1)} KB)</span></span>
                <span className="file-remove" onClick={handleRemove}>✕</span>
              </div>
            )}
            
            {(!initialUrl || isRemoved) && !tempFile && (
                <div style={{ textAlign: 'center', padding: '10px', color: '#8aA0b0', fontSize: '12px' }}>
                    No file selected
                </div>
            )}
          </div>
        </div>
        <div className="file-modal-footer">
          <button type="button" className="btn" onClick={handleAttach} disabled={isUploading}>
             {isUploading ? 'Uploading...' : 'Attach'}
          </button>
          <button type="button" className="btn" onClick={onClose} disabled={isUploading}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default FileUploadModal;
