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

  if (errors.length > 0) {
    alert(errors.join("\n"));
    return;
  }

  const res = await axios.post(
    `${process.env.REACT_APP_API_STRING}/update-pr`,
    row
  );
  alert(res.data.message);
  getPrData();
};
