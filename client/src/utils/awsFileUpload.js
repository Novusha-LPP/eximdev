import axios from "axios";

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
    const formData = new FormData();
    // Append all files
    for (let i = 0; i < e.target.files.length; i++) {
      formData.append("files", e.target.files[i]);
    }
    formData.append("bucketPath", folderName);

    const response = await axios.post(
      `${process.env.REACT_APP_API_STRING}/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    const uploadedFiles = response.data.urls;

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

export const uploadFileToS3 = async (file, folderName) => {
  const formData = new FormData();
  formData.append("files", file);
  formData.append("bucketPath", folderName);

  const response = await axios.post(
    `${process.env.REACT_APP_API_STRING}/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  // Return object with Location to match previous interface
  return { Location: response.data.urls[0] };
};
