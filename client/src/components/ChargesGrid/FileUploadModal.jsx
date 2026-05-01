import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { uploadFileToS3 } from "../../utils/awsFileUpload"; 

const FileUploadModal = ({ isOpen, onClose, chargeLabel, initialUrls = [], onAttach, showTypeSelection = false, categorizedUrls = null }) => {
  const [tempFiles, setTempFiles] = useState([]);
  const [remainingUrls, setRemainingUrls] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState('draft'); // 'draft' | 'final'
  const fileInputRef = React.useRef(null);

  // For categorized uploads, we keep track of changes for each type
  const [allCategorizedData, setAllCategorizedData] = useState({
    draft: { files: [], urls: [] },
    final: { files: [], urls: [] }
  });

  const [wasOpen, setWasOpen] = useState(false);

  useEffect(() => {
    if (isOpen && !wasOpen) {
      // Only reset when modal is actually opening
      setTempFiles([]);
      setRemainingUrls(Array.isArray(initialUrls) ? initialUrls : (initialUrls ? [initialUrls] : []));
      setIsUploading(false);
      setUploadType('draft');

      if (showTypeSelection && categorizedUrls) {
        setAllCategorizedData({
          draft: { files: [], urls: categorizedUrls.draft || [] },
          final: { files: [], urls: categorizedUrls.final || [] }
        });
        // Set initial view to draft
        setRemainingUrls(categorizedUrls.draft || []);
      }
    }
    setWasOpen(isOpen);
  }, [isOpen, wasOpen, initialUrls, showTypeSelection, categorizedUrls]);

  // Handle switching between types
  const handleTypeChange = (newType) => {
    if (newType === uploadType) return;
    
    // 1. Capture current state
    const currentData = { files: tempFiles, urls: remainingUrls };
    
    // 2. Update allCategorizedData and load next state in one go
    setAllCategorizedData(prev => {
        const updated = { ...prev, [uploadType]: currentData };
        
        // Load next state
        const nextData = updated[newType];
        setTempFiles(nextData.files);
        setRemainingUrls(nextData.urls);
        setUploadType(newType);
        
        return updated;
    });
  };

  const moveToOtherType = (item, isTemp = false) => {
    const targetType = uploadType === 'draft' ? 'final' : 'draft';
    
    // 1. Remove from current local state
    if (isTemp) {
        setTempFiles(prev => prev.filter(f => f !== item));
    } else {
        setRemainingUrls(prev => prev.filter(u => u !== item));
    }

    // 2. Sync allCategorizedData immediately for both types
    setAllCategorizedData(prev => {
        const currentData = { 
            files: isTemp ? tempFiles.filter(f => f !== item) : tempFiles, 
            urls: !isTemp ? remainingUrls.filter(u => u !== item) : remainingUrls 
        };
        
        const targetData = prev[targetType];
        const updatedTarget = {
            ...targetData,
            files: isTemp ? [...targetData.files, item] : targetData.files,
            urls: !isTemp ? [...targetData.urls, item] : targetData.urls
        };
        
        return { 
            ...prev, 
            [uploadType]: currentData,
            [targetType]: updatedTarget 
        };
    });
  };

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setTempFiles(prev => {
          const updated = [...prev, ...newFiles];
          // Sync with allCategorizedData
          setAllCategorizedData(cPrev => ({
              ...cPrev,
              [uploadType]: { ...cPrev[uploadType], files: updated }
          }));
          return updated;
      });
    }
    e.target.value = '';
  };

  const removeTempFile = (index) => {
    setTempFiles(prev => {
        const updated = prev.filter((_, i) => i !== index);
        setAllCategorizedData(cPrev => ({
            ...cPrev,
            [uploadType]: { ...cPrev[uploadType], files: updated }
        }));
        return updated;
    });
  };

  const removeInitialUrl = (index) => {
    setRemainingUrls(prev => {
        const updated = prev.filter((_, i) => i !== index);
        setAllCategorizedData(cPrev => ({
            ...cPrev,
            [uploadType]: { ...cPrev[uploadType], urls: updated }
        }));
        return updated;
    });
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
        // 1. Save current state to allCategorizedData one last time
        const finalCategorizedData = { ...allCategorizedData };
        finalCategorizedData[uploadType] = { files: tempFiles, urls: remainingUrls };

        // 2. Process all categories
        const results = {};
        
        for (const type of ['draft', 'final']) {
            const data = finalCategorizedData[type];
            const uploadedUrls = [];
            for (const file of data.files) {
                try {
                    const result = await uploadFileToS3(file, "charges"); 
                    uploadedUrls.push(result.Location);
                } catch (err) {
                    console.error("Failed to upload", file.name, err);
                }
            }
            results[type] = [...data.urls, ...uploadedUrls];
        }

        if (showTypeSelection) {
            // Pass the entire results object
            onAttach(results, 'bulk');
        } else {
            // Standard behavior for non-categorized
            onAttach(results[uploadType], uploadType);
        }
    } finally {
        setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return createPortal(
    <div className="charges-file-modal-overlay charges-active">
      <div className="charges-file-modal">
        <div className="charges-file-modal-title">📎 Attach Files — {chargeLabel}</div>
        <div className="charges-file-modal-body">
          {showTypeSelection && (
            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f0f7ff', borderRadius: '6px', border: '1px solid #d1e3ff' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#1976d2' }}>Select Upload Type:</div>
              <div style={{ display: 'flex', gap: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                  <input type="radio" name="uploadType" value="draft" checked={uploadType === 'draft'} onChange={() => handleTypeChange('draft')} /> Draft Invoice
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                  <input type="radio" name="uploadType" value="final" checked={uploadType === 'final'} onChange={() => handleTypeChange('final')} /> Tax Invoice
                </label>
              </div>
            </div>
          )}
          <div 
             className="charges-drop-zone" 
             onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('charges-drag-over') }}
             onDragLeave={(e) => { e.currentTarget.classList.remove('charges-drag-over') }}
             onDrop={(e) => {
               e.preventDefault();
               e.currentTarget.classList.remove('charges-drag-over');
               if(e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                   const droppedFiles = Array.from(e.dataTransfer.files);
                   setTempFiles(prev => [...prev, ...droppedFiles]);
               }
             }}
             onClick={triggerFileInput}
          >
            <div style={{ fontSize: '28px', marginBottom: '6px', opacity: 0.5 }}>⬆</div>
            <p><strong>Drag &amp; drop files here</strong></p>
            <p>or <span className="charges-browse-link">browse to upload</span></p>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {showTypeSelection && (
                      <button 
                        type="button" 
                        onClick={() => moveToOtherType(url, false)}
                        style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Move to {uploadType === 'draft' ? 'Tax Inv.' : 'Draft'}
                      </button>
                    )}
                    <span className="charges-file-remove" onClick={() => removeInitialUrl(idx)}>✕</span>
                  </div>
                </div>
            ))}

            {tempFiles.map((file, idx) => (
              <div className="charges-file-item" key={`temp-${idx}`}>
                <span className="charges-file-item-name">📄 {file.name} <span style={{ color: '#8aA0b0' }}>({(file.size/1024).toFixed(1)} KB)</span></span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {showTypeSelection && (
                    <button 
                      type="button" 
                      onClick={() => moveToOtherType(file, true)}
                      style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Move to {uploadType === 'draft' ? 'Tax Inv.' : 'Draft'}
                    </button>
                  )}
                  <span className="charges-file-remove" onClick={() => removeTempFile(idx)}>✕</span>
                </div>
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


