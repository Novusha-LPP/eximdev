import React, { createContext, useContext, useState, useCallback } from 'react';
import { uploadFileToS3 } from '../utils/awsFileUpload';

const FileUploadQueueContext = createContext();

export const useFileUploadQueue = () => {
  const context = useContext(FileUploadQueueContext);
  if (!context) {
    throw new Error('useFileUploadQueue must be used within a FileUploadQueueProvider');
  }
  return context;
};

export const FileUploadQueueProvider = ({ children }) => {
  const [uploadQueue, setUploadQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Add files to the queue
  const queueFiles = useCallback((files, bucketPath, fieldName, onUploadComplete) => {
    const queueItems = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      bucketPath,
      fieldName,
      onUploadComplete,
      status: 'queued', // queued, uploading, completed, failed
      uploadedUrl: null,
      error: null
    }));

    setUploadQueue(prev => [...prev, ...queueItems]);
    return queueItems.map(item => item.id);
  }, []);

  // Process the upload queue with the customer name
  const processQueue = useCallback(async (customerName) => {
    if (isProcessing || uploadQueue.length === 0) {
      return;
    }

    setIsProcessing(true);
    
    try {
      console.log(`🚀 Processing upload queue with customer name: "${customerName}"`);
      console.log(`📦 Queue size: ${uploadQueue.length} files`);

      // Process files in batches to avoid overwhelming the server
      const batchSize = 3;
      const queuedItems = uploadQueue.filter(item => item.status === 'queued');
      
      for (let i = 0; i < queuedItems.length; i += batchSize) {
        const batch = queuedItems.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (item) => {
          try {
            // Update status to uploading
            setUploadQueue(prev => prev.map(qItem => 
              qItem.id === item.id ? { ...qItem, status: 'uploading' } : qItem
            ));

            // Upload to S3
            const result = await uploadFileToS3(item.file, item.bucketPath, customerName);
            
            // Update status to completed
            setUploadQueue(prev => prev.map(qItem => 
              qItem.id === item.id 
                ? { ...qItem, status: 'completed', uploadedUrl: result.Location }
                : qItem
            ));

            // Call the completion callback
            if (item.onUploadComplete) {
              item.onUploadComplete([result.Location], item.fieldName);
            }

            console.log(`✅ Successfully uploaded: ${item.file.name} -> ${result.Location}`);
            return { success: true, item, result };

          } catch (error) {
            console.error(`❌ Failed to upload: ${item.file.name}`, error);
            
            // Update status to failed
            setUploadQueue(prev => prev.map(qItem => 
              qItem.id === item.id 
                ? { ...qItem, status: 'failed', error: error.message }
                : qItem
            ));

            return { success: false, item, error };
          }
        });

        // Wait for batch to complete
        await Promise.all(batchPromises);
        
        // Small delay between batches
        if (i + batchSize < queuedItems.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log('🎉 Upload queue processing completed');

    } catch (error) {
      console.error('💥 Error processing upload queue:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [uploadQueue, isProcessing]);

  // Clear completed and failed items from queue
  const clearProcessedItems = useCallback(() => {
    setUploadQueue(prev => prev.filter(item => 
      item.status !== 'completed' && item.status !== 'failed'
    ));
  }, []);

  // Remove specific items from queue
  const removeFromQueue = useCallback((itemIds) => {
    setUploadQueue(prev => prev.filter(item => !itemIds.includes(item.id)));
  }, []);

  // Get queue statistics
  const getQueueStats = useCallback(() => {
    const stats = uploadQueue.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      acc.total++;
      return acc;
    }, { total: 0, queued: 0, uploading: 0, completed: 0, failed: 0 });

    return stats;
  }, [uploadQueue]);

  const value = {
    uploadQueue,
    queuedFiles: uploadQueue, // Alias for consistency with component usage
    isProcessing,
    queueFiles,
    processQueue,
    clearProcessedItems,
    removeFromQueue,
    getQueueStats
  };

  return (
    <FileUploadQueueContext.Provider value={value}>
      {children}
    </FileUploadQueueContext.Provider>
  );
};

export default FileUploadQueueContext;
