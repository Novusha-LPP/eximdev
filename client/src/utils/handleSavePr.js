import axios from "axios";

export const handleSavePr = async (row, getPrData) => {
  const errors = [];

  // Helper function to check if a field is empty (handles both strings and objects)
  const isEmpty = (field) => {
    if (!field) return true;
    if (typeof field === "string" && field.trim() === "") return true;
    if (typeof field === "object" && (!field._id || field._id === ""))
      return true;
    return false;
  };

  if (row.branch === "") {
    errors.push("Please select branch");
  }
  if (isEmpty(row.consignor)) {
    errors.push("Please select consignor");
  }
  if (isEmpty(row.consignee)) {
    errors.push("Please select consignee");
  }
  if (
    !row.container_count ||
    isNaN(row.container_count) ||
    Number(row.container_count) <= 0
  ) {
    errors.push(
      "Invalid container count. Container count must be a positive number."
    );
  }

  if (row.isBranch) {
    if (!row.suffix || !row.prefix) {
      errors.push("Suffix and Prefix are required when isBranch is true.");
    }
  }

  if (errors.length > 0) {
    alert(errors.join("\n"));
    return;
  }

  // Prepare the data for submission
  const submitData = { ...row };

  // Helper function to extract ObjectId from object fields
  const extractObjectId = (field) => {
    if (field && typeof field === "object" && field._id) {
      return field._id;
    }
    // Return null for empty strings or falsy values to avoid sending empty strings
    if (!field || field === "") {
      return null;
    }
    return field;
  };

  // Handle all ObjectId reference fields
  submitData.container_type = extractObjectId(submitData.container_type);
  submitData.consignor = extractObjectId(submitData.consignor);
  submitData.consignee = extractObjectId(submitData.consignee);
  submitData.shipping_line = extractObjectId(submitData.shipping_line);
  submitData.container_loading = extractObjectId(submitData.container_loading);
  submitData.container_offloading = extractObjectId(
    submitData.container_offloading
  );
  submitData.goods_pickup = extractObjectId(submitData.goods_pickup);
  submitData.goods_delivery = extractObjectId(submitData.goods_delivery);
  submitData.type_of_vehicle = extractObjectId(submitData.type_of_vehicle);

  const res = await axios.post(
    `${process.env.REACT_APP_API_STRING}/update-pr`,
    submitData
  );
  alert(res.data.message);
  getPrData();
};
