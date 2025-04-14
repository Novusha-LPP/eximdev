// Helper function to determine the correct API base URL
const getApiBaseUrl = () => {
  const apiBaseUrl = process.env.REACT_APP_API_STRING || "";
  return apiBaseUrl;
};

export const uploadFileToS3 = async (files, folderName) => {
  try {
    const filesArray = Array.isArray(files)
      ? files
      : files instanceof FileList
      ? Array.from(files)
      : [files];

    const formData = new FormData();
    filesArray.forEach((file, index) => {
      formData.append("files", file);
    });
    formData.append("folderName", folderName);

    const apiBaseUrl = getApiBaseUrl();
    const endpoint = `${apiBaseUrl}/upload/upload-files`;

    console.log("Uploading to:", endpoint);
    console.log("Files:", filesArray);
    console.log("Folder name:", folderName);

    const uploadResponse = await fetch(endpoint, {
      method: "POST",
      body: formData,
      // credentials: "include", // Enable if cookies are used
      cache: "no-cache",
    });

    if (!uploadResponse.ok) {
      console.error("Upload failed with status:", uploadResponse.status);
      const errorText = await uploadResponse.text();
      console.error("Server response:", errorText);
      throw new Error(`Server responded with status: ${uploadResponse.status}`);
    }

    const responseData = await uploadResponse.json();
    console.log("Upload response:", responseData);

    if (!responseData.success) {
      throw new Error(responseData.message || "Failed to upload files");
    }

    return {
      uploaded: responseData.uploaded,
      errors: responseData.errors || [],
    };
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    console.error("Upload error:", {
      message: errorMessage,
      status: error.response?.status,
      details: error.stack,
    });
    throw error;
  }
};

/**
 * Handles file upload from form input
 */
export const handleFileUpload = async (
  e,
  folderName,
  formikKey,
  formik,
  setFileSnackbar
) => {
  if (e.target.files.length === 0) {
    alert("No files selected");
    console.warn("File input event triggered with no files.");
    return;
  }

  try {
    const filesArray = Array.from(e.target.files);
    console.log("Files selected for upload:", filesArray);

    const uploadResult = await uploadFileToS3(filesArray, folderName);

    if (uploadResult.uploaded.length > 0) {
      const fileLocations = uploadResult.uploaded.map((file) => file.location);
      console.log("File locations uploaded:", fileLocations);

      formik.setValues((values) => ({
        ...values,
        [formikKey]: fileLocations,
      }));

      setFileSnackbar(true);
      setTimeout(() => {
        setFileSnackbar(false);
      }, 3000);

      if (uploadResult.errors.length > 0) {
        console.warn("Some files failed to upload:", uploadResult.errors);
        alert(
          `${uploadResult.uploaded.length} files uploaded successfully, but ${uploadResult.errors.length} files failed.`
        );
      }
    } else {
      console.error("No files uploaded. Check server or network issues.");
      alert("No files were uploaded successfully. Please try again.");
    }
  } catch (err) {
    console.error("Upload exception:", err);
    alert(`Failed to upload files: ${err.message}`);
  }
};
