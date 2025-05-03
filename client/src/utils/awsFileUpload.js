// Helper function to determine the correct API base URL
const getApiBaseUrl = () => {
  const apiBaseUrl = process.env.REACT_APP_API_STRING || "";
  return apiBaseUrl;
};

export const uploadFileToS3 = async (files, folderName) => {
  console.log("=== UPLOAD TO S3 INITIATED ===");
  console.log(`Files to upload: ${files?.length || 0}, Folder: ${folderName}`);

  try {
    const filesArray = Array.isArray(files)
      ? files
      : files instanceof FileList
      ? Array.from(files)
      : [files];

    console.log(
      "Files prepared for upload:",
      filesArray.map((file) => ({
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024).toFixed(2)} KB`,
        lastModified: new Date(file.lastModified).toISOString(),
      }))
    );

    const formData = new FormData();
    filesArray.forEach((file, index) => {
      formData.append("files", file);
      console.log(`Added file ${index + 1} to FormData: ${file.name}`);
    });
    formData.append("folderName", folderName);
    console.log(`Added folderName to FormData: ${folderName}`);

    const apiBaseUrl = getApiBaseUrl();
    const endpoint = `${apiBaseUrl}/upload/upload-files`;

    console.log("=== UPLOAD REQUEST DETAILS ===");
    console.log(`API Base URL: ${apiBaseUrl}`);
    console.log(`Upload endpoint: ${endpoint}`);
    console.log(
      "FormData entries:",
      [...formData.entries()].map(([key, value]) => {
        if (value instanceof File) {
          return {
            key,
            fileName: value.name,
            fileType: value.type,
            fileSize: `${(value.size / 1024).toFixed(2)} KB`,
          };
        }
        return { key, value };
      })
    );

    console.log("Initiating fetch request to upload files...");
    const uploadResponse = await fetch(endpoint, {
      method: "POST",
      body: formData,
      credentials: "include", // Enable if cookies are used
      cache: "no-cache",
    });

    console.log("=== UPLOAD RESPONSE RECEIVED ===");
    console.log(
      "Response status:",
      uploadResponse.status,
      uploadResponse.statusText
    );
    console.log(
      "Response headers:",
      Object.fromEntries([...uploadResponse.headers.entries()])
    );

    if (!uploadResponse.ok) {
      console.error(`Upload failed with status: ${uploadResponse.status}`);
      const errorText = await uploadResponse.text();
      console.error("Server error response:", errorText);
      throw new Error(`Server responded with status: ${uploadResponse.status}`);
    }

    const responseData = await uploadResponse.json();
    console.log("Upload response data:", responseData);

    if (!responseData.success) {
      console.error("Upload unsuccessful:", responseData.message);
      throw new Error(responseData.message || "Failed to upload files");
    }

    console.log("Upload successful!", {
      filesUploaded: responseData.uploaded.length,
      errors: responseData.errors?.length || 0,
    });

    return {
      uploaded: responseData.uploaded,
      errors: responseData.errors || [],
    };
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    console.error("=== UPLOAD ERROR ===", {
      message: errorMessage,
      status: error.response?.status,
      details: error.stack,
    });
    throw error;
  }
};

export const handleFileUpload = async (
  e,
  folderName,
  formikKey,
  formik,
  setFileSnackbar
) => {
  if (e.target.files.length === 0) {
    console.warn("No files selected for upload");
    alert("No files selected");
    console.warn("File input event triggered with no files.");
    return;
  }

  try {
    const filesArray = Array.from(e.target.files);
    console.log(
      "Files selected for upload:",
      filesArray.map((file) => ({
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024).toFixed(2)} KB`,
      }))
    );

    const uploadResult = await uploadFileToS3(filesArray, folderName);

    if (uploadResult.uploaded.length > 0) {
      const fileLocations = uploadResult.uploaded.map((file) => file.location);
      // console.log("File locations uploaded:", fileLocations);

      // console.log(`Updating formik values for key: ${formikKey}`);
      formik.setValues((values) => {
        //console.log("Current formik values:", values);
        const newValues = {
          ...values,
          [formikKey]: fileLocations,
        };
        // console.log("New formik values:", newValues);
        return newValues;
      });

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
    console.error("Error stack:", err.stack);
    alert(`Failed to upload files: ${err.message}`);
  }
};
