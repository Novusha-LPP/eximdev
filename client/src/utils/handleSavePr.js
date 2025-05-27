import axios from "axios";

export const handleSavePr = async (row, getPrData) => {
  const errors = [];

  if (row.branch === "") {
    errors.push("Please select branch");
  }
  if (row.consignor === "") {
    errors.push("Please select consignor");
  }
  if (row.consignee === "") {
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

  // Handle container_type - if it's an object with _id, send the _id
  if (
    submitData.container_type &&
    typeof submitData.container_type === "object"
  ) {
    submitData.container_type = submitData.container_type._id;
  }

  const res = await axios.post(
    `${process.env.REACT_APP_API_STRING}/update-pr`,
    submitData
  );
  alert(res.data.message);
  getPrData();
};
