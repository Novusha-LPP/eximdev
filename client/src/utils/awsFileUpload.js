import axios from "axios";

// Helper function to determine the correct API base URL
const getApiBaseUrl = () => {
  const apiBaseUrl = process.env.REACT_APP_API_STRING || "";
  return apiBaseUrl;
};

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
    const uploadedFiles = [];
    const apiBaseUrl = getApiBaseUrl();

    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];

      // Use uploadFileToS3 function to handle the upload
      const uploadResult = await uploadFileToS3(file, folderName);

      // Store the S3 URL in the uploadedFiles array
      uploadedFiles.push(uploadResult.Location);
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
    alert("Failed to upload files. Please try again.");
  }
};

export const uploadFileToS3 = async (file, folderName) => {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const endpoint = `${apiBaseUrl}/upload/get-upload-url`;

    // Get the pre-signed URL from the backend
    const presignedUrlResponse = await axios.post(endpoint, {
      fileName: file.name,
      fileType: file.type,
      folderName: folderName,
    });

    if (!presignedUrlResponse.data.success) {
      throw new Error("Failed to get upload URL");
    }

    const { uploadURL, key } = presignedUrlResponse.data;

    // Upload the file directly to S3 using the pre-signed URL
    await axios.put(uploadURL, file, {
      headers: {
        "Content-Type": file.type,
      },
    });

    // Return the S3 file location
    const bucketName = "alvision-exim-images";
    const region = "ap-south-1";
    const location = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

    return {
      Location: location,
      key,
    };
  } catch (error) {
    throw error;
  }
};
