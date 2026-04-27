import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { uploadFileToS3 } from "../../utils/awsFileUpload"; 

const FileUploadModal = ({ isOpen, onClose, chargeLabel, initialUrls = [], onAttach }) => {
  const [tempFiles, setTempFiles] = useState([]);
  const [remainingUrls, setRemainingUrls] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTempFiles([]);
      setRemainingUrls(Array.isArray(initialUrls) ? initialUrls : (initialUrls ? [initialUrls] : []));
      setIsUploading(false);
    }
  }, [isOpen, initialUrls]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setTempFiles([...tempFiles, ...Array.from(e.target.files)]);
    }
    e.target.value = '';
  };

  const removeTempFile = (index) => {
    setTempFiles(tempFiles.filter((_, i) => i !== index));
  };

  const removeInitialUrl = (index) => {
    setRemainingUrls(remainingUrls.filter((_, i) => i !== index));
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
        const uploadedUrls = [];
        for (const file of tempFiles) {
            try {
                const result = await uploadFileToS3(file, "charges"); 
                uploadedUrls.push(result.Location);
            } catch (err) {
                console.error("Failed to upload", file.name, err);
                alert("Failed to upload " + file.name);
                // Continue with others? For now, yes, but we could stop.
            }
        }

        const finalUrls = [...remainingUrls, ...uploadedUrls];
        onAttach(finalUrls);
    } finally {
        setIsUploading(false);
    }
  };

  return createPortal(
    <div className="charges-file-modal-overlay charges-active">
      <div className="charges-file-modal">
        <div className="charges-file-modal-title">📎 Attach Files — {chargeLabel}</div>
        <div className="charges-file-modal-body">
          <div 
             className="charges-drop-zone" 
             onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('charges-drag-over') }}
             onDragLeave={(e) => { e.currentTarget.classList.remove('charges-drag-over') }}
             onDrop={(e) => {
               e.preventDefault();
               e.currentTarget.classList.remove('charges-drag-over');
               if(e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                   setTempFiles([...tempFiles, ...Array.from(e.dataTransfer.files)]);
               }
             }}
             onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <div style={{ fontSize: '28px', marginBottom: '6px', opacity: 0.5 }}>⬆</div>
            <p><strong>Drag &amp; drop files here</strong></p>
            <p>or <span className="charges-browse-link" onClick={(e) => { e.stopPropagation(); fileInputRef.current && fileInputRef.current.click()}}>browse to upload</span></p>
            <p style={{ color: '#8aA0b0', fontSize: '11px', marginTop: '6px' }}>PDF, JPG, PNG, XLSX, DOCX supported</p>
            <input 
               type="file" 
               multiple
               ref={fileInputRef}
               style={{ display: 'none' }} 
               onChange={handleFileChange} 
            />
          </div>
          
          <div className="charges-file-list" style={{ minHeight: '60px', maxHeight: '200px', overflowY: 'auto' }}>
            {remainingUrls.map((url, idx) => (
                <div className="charges-file-item" key={`init-${idx}`}>
                  <span className="charges-file-item-name">📄 {getS3FileName(url)}</span>
                  <span className="charges-file-remove" onClick={() => removeInitialUrl(idx)}>✕</span>
                </div>
            ))}

            {tempFiles.map((file, idx) => (
              <div className="charges-file-item" key={`temp-${idx}`}>
                <span className="charges-file-item-name">📄 {file.name} <span style={{ color: '#8aA0b0' }}>({(file.size/1024).toFixed(1)} KB)</span></span>
                <span className="charges-file-remove" onClick={() => removeTempFile(idx)}>✕</span>
              </div>
            ))}
            
            {remainingUrls.length === 0 && tempFiles.length === 0 && (
                <div style={{ textAlign: 'center', padding: '10px', color: '#8aA0b0', fontSize: '12px' }}>
                    No files selected
                </div>
            )}
          </div>
        </div>
        <div className="charges-file-modal-footer">
          <button type="button" className="charges-btn" onClick={handleAttach} disabled={isUploading || (remainingUrls.length === 0 && tempFiles.length === 0)}>
             {isUploading ? 'Uploading...' : 'Attach Files'}
          </button>
          <button type="button" className="charges-btn" onClick={onClose} disabled={isUploading}>Cancel</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FileUploadModal;


