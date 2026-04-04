import { useState, useCallback } from 'react';
import axios from 'axios';
import { message } from 'antd';

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);

  const uploadFiles = useCallback(async (files, bucketPath = 'crm-docs') => {
    if (!files || files.length === 0) return [];
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f.originFileObj || f));
      formData.append('bucketPath', bucketPath);

      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/upload`,
        formData,
        { withCredentials: true }
      );
      return res.data.urls || [];
    } catch (err) {
      message.error(err?.response?.data?.error || 'File upload failed.');
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  return { uploading, uploadFiles };
}
