// Helper function to determine the correct API base URL
const getApiBaseUrl = () => {
  const apiBaseUrl = process.env.REACT_APP_API_STRING || "";
  return apiBaseUrl;
};

export const uploadFileToS3 = async (files, folderName) => {
  try {
    // Step 1: Convert files to array if necessary
    const filesArray = Array.isArray(files)
      ? files
      : files instanceof FileList
      ? Array.from(files)
      : [files];

    // Step 2: Prepare FormData object
    const formData = new FormData();

    // Append all files with the key 'files'
    filesArray.forEach((file, index) => {
      formData.append("files", file);
    });

    // Add the folder name
    formData.append("folderName", folderName);

    // Step 3: Determine endpoint URL
    const apiBaseUrl = getApiBaseUrl();
    const endpoint = `${apiBaseUrl}/upload/upload-files`;

    // Step 4: Send the request using fetch
    const uploadResponse = await fetch(endpoint, {
      method: "POST",
      body: formData,
      credentials: "include", // Include cookies if needed
      cache: "no-cache", // Bypass service worker cache
    });

    // Step 5: Parse JSON response
    if (!uploadResponse.ok) {
      throw new Error(`Server responded with status: ${uploadResponse.status}`);
    }

    const responseData = await uploadResponse.json();

    // Step 6: Handle success/failure
    if (!responseData.success) {
      throw new Error(responseData.message || "Failed to upload files");
    }

    return {
      uploaded: responseData.uploaded,
      errors: responseData.errors || [],
    };
  } catch (error) {
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
    return;
  }

  try {
    // Convert FileList to array
    const filesArray = Array.from(e.target.files);

    // Upload all files at once
    const uploadResult = await uploadFileToS3(filesArray, folderName);

    if (uploadResult.uploaded.length > 0) {
      // Extract the locations of successfully uploaded files
      const fileLocations = uploadResult.uploaded.map((file) => file.location);

      // Update formik values with the uploaded file URLs
      formik.setValues((values) => ({
        ...values,
        [formikKey]: fileLocations,
      }));

      // Show success notification
      setFileSnackbar(true);
      setTimeout(() => {
        setFileSnackbar(false);
      }, 3000);

      // Report any errors
      if (uploadResult.errors.length > 0) {
        alert(
          `${uploadResult.uploaded.length} files uploaded successfully, but ${uploadResult.errors.length} files failed.`
        );
      }
    } else {
      alert("No files were uploaded successfully. Please try again.");
    }
  } catch (err) {
    alert(`Failed to upload files: ${err.message}`);
  }
};
