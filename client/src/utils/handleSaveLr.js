import axios from "axios";

export const handleSaveLr = async (row, props) => {
  console.log("Save row:", row);
  console.log("Props:", props);
  const errors = [];

  if (!row.container_number || row.container_number.trim() === "") {
    errors.push("Please enter container number.");
  } else {
    const containerNumber = row.container_number.toUpperCase();
    const containerNumberRegex = /^[A-Z]{3}[UJZ][A-Z0-9]{6}\d$/i;

    if (!containerNumberRegex.test(containerNumber)) {
      const proceed = window.confirm(
        "Container number is not valid. Do you want to continue?"
      );
      if (!proceed) return;
    } else {
      // Validate check digit
      const checkDigit = calculateCheckDigit(containerNumber.slice(0, 10));
      if (checkDigit !== parseInt(containerNumber[10], 10)) {
        const proceed = window.confirm(
          "Invalid container number. Do you want to continue?"
        );
        if (!proceed) return;
      }
    }
  }
  // Validate weights
  if (row.gross_weight && (isNaN(row.gross_weight) || row.gross_weight <= 0)) {
    errors.push("Gross weight must be a positive number.");
  }

  if (row.tare_weight && (isNaN(row.tare_weight) || row.tare_weight <= 0)) {
    errors.push("Tare weight must be a positive number.");
  }

  if (row.net_weight && (isNaN(row.net_weight) || row.net_weight <= 0)) {
    errors.push("Net weight must be a positive number.");
  }
  // Validate driver phone number
  const indianMobileRegex = /^[6-9]\d{9}$/;
  if (row.driver_phone && !indianMobileRegex.test(row.driver_phone)) {
    errors.push(
      "Driver phone number is not valid. It should be a 10-digit Indian mobile number starting with 6-9."
    );
  }

  const vehicleNoRegex = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/i;
  if (row.vehicle_no && !vehicleNoRegex.test(row.vehicle_no)) {
    errors.push(
      "Vehicle number is not valid. Format should be AA00AA0000, aa00aa0000, AA00A0000, or aa00a0000."
    );
  }

  if (errors.length > 0) {
    alert(errors.join("\n"));
    return;
  }
  // If both sr_cel_FGUID and sr_cel_no are present, call the PATCH API
  if (row.sr_cel_FGUID && row.sr_cel_no && row.sr_cel_id) {
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/get-srcel/${row.sr_cel_id}`,
        {
          sr_cel_locked: true,
        }
      );
      console.log("SR CEL Locked successfully");
    } catch (error) {
      console.error("Error locking SR CEL:", error);
      return; // Stop further execution if there's an error
    }
  }
  // Proceed with save logic
  const pr_no = props.pr_no;

  try {
    const res = await axios.post(
      `${process.env.REACT_APP_API_STRING}/update-container`,
      { ...row, pr_no }
    );
    alert(res.data.message);
  } catch (error) {
    console.error("Error updating container:", error);
  }
};

function calculateCheckDigit(containerNumber) {
  if (containerNumber.length !== 10) {
    return null;
  }

  const weightingFactors = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
  let total = 0;

  for (let i = 0; i < containerNumber.length; i++) {
    total += equivalentValue(containerNumber[i]) * weightingFactors[i];
  }

  const subTotal = Math.floor(total / 11);
  const checkDigit = total - subTotal * 11;

  return checkDigit;
}

function equivalentValue(char) {
  const equivalences = {
    A: 10,
    B: 12,
    C: 13,
    D: 14,
    E: 15,
    F: 16,
    G: 17,
    H: 18,
    I: 19,
    J: 20,
    K: 21,
    L: 23,
    M: 24,
    N: 25,
    O: 26,
    P: 27,
    Q: 28,
    R: 29,
    S: 30,
    T: 31,
    U: 32,
    V: 34,
    W: 35,
    X: 36,
    Y: 37,
    Z: 38,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    0: 0,
  };
  return equivalences[char];
}
