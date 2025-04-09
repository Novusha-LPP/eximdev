import AWS from "aws-sdk";

export const handleFileUpload = async (
  e,
  folderName,
  formikKey,
  formik,
  setFileSnackbar
) => {
  if (e.target.files.length === 0) {
    alert("No file selected");
    return;
  }

  try {
    const s3 = new AWS.S3({
      accessKeyId: process.env.REACT_APP_ACCESS_KEY,
      secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
      region: "ap-south-1",
    });

    const uploadedFiles = [];

    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      const params = {
        Bucket: "alvision-exim-images",
        Key: `${folderName}/${file.name}`,
        Body: file,
      };

      // Upload the file to S3 and wait for the promise to resolve
      const data = await s3.upload(params).promise();

      // Store the S3 URL in the uploadedFiles array
      uploadedFiles.push(data.Location);
    }

    // Update formik values with the uploaded file URLs
    formik.setValues((values) => ({
      ...values,
      [formikKey]: uploadedFiles,
    }));

    setFileSnackbar(true);

    setTimeout(() => {
      setFileSnackbar(false);
    }, 3000);
  } catch (err) {
    console.error("Error uploading files:", err);
  }
};

// utils/awsFileUpload.js
// utils/awsFileUpload.js
export const uploadFileToS3 = async (file, folderName) => {
  try {
    // Step 1: Get the pre-signed URL from your backend
    const response = await fetch(`${process.env.REACT_APP_API_STRING}/upload/get-upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        folderName
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to get upload URL');
    }

    // Step 2: Use the pre-signed URL to upload the file directly to S3
    const uploadResponse = await fetch(data.uploadURL, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file to S3');
    }

    // Step 3: Return the result in the same format expected by existing code
    const bucketUrl = `https://alvision-exim-images.s3.ap-south-1.amazonaws.com`;
    const location = `${bucketUrl}/${data.key}`;
    
    return {
      Key: data.key,
      Location: location, // Capital 'L' to match the format in your existing code
      Bucket: 'alvision-exim-images'
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};
