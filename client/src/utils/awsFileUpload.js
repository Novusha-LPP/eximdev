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

export const uploadFileToS3 = (file, folderName) => {
  AWS.config.update({
    region: "ap-south-1",
    accessKeyId: process.env.REACT_APP_ACCESS_KEY,
    secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
  });

  const s3 = new AWS.S3();
  const params = {
    Bucket: "alvision-exim-images",
    Key: `${folderName}/${file.name}`,
    Body: file,
    ContentType: file.type,
  };

  return s3.upload(params).promise();
};
