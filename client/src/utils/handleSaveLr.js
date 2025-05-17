import axios from "axios";

export const handleSaveLr = async (row, props) => {
  console.log("🔄 Starting handleSaveLr...");
  console.log("🧾 Row data received:", row);
  console.log("🧭 Props received:", props);

  const errors = [];

  // Validate container number
  if (!row.container_number || row.container_number.trim() === "") {
    console.warn("⚠️ Missing container number.");
    errors.push("Please enter container number.");
  } else {
    const containerNumber = row.container_number.toUpperCase();
    console.log("🔢 Container Number (Uppercased):", containerNumber);
    const containerNumberRegex = /^[A-Z]{3}[UJZ][A-Z0-9]{6}\d$/i;

    if (!containerNumberRegex.test(containerNumber)) {
      console.warn("❌ Container number failed initial regex validation.");
      const proceed = window.confirm(
        "Container number is not valid. Do you want to continue?"
      );
      if (!proceed) {
        console.log(
          "⛔ User chose not to proceed due to invalid container format."
        );
        return;
      }
    } else {
      // Validate check digit
      const checkDigit = calculateCheckDigit(containerNumber.slice(0, 10));
      console.log("✅ Calculated Check Digit:", checkDigit);
      const lastDigit = parseInt(containerNumber[10], 10);
      console.log("📦 Provided Check Digit:", lastDigit);

      if (checkDigit !== lastDigit) {
        console.warn("❌ Check digit mismatch.");
        const proceed = window.confirm(
          "Invalid container number. Do you want to continue?"
        );
        if (!proceed) {
          console.log("⛔ User cancelled due to check digit mismatch.");
          return;
        }
      }
    }
  }

  // Validate weights
  console.log("⚖️ Validating weights...");
  if (row.gross_weight) {
    console.log("Gross Weight:", row.gross_weight);
    if (isNaN(row.gross_weight) || row.gross_weight <= 0) {
      errors.push("Gross weight must be a positive number.");
    }
  }

  if (row.tare_weight) {
    console.log("Tare Weight:", row.tare_weight);
    if (isNaN(row.tare_weight) || row.tare_weight <= 0) {
      errors.push("Tare weight must be a positive number.");
    }
  }

  if (row.net_weight) {
    console.log("Net Weight:", row.net_weight);
    if (isNaN(row.net_weight) || row.net_weight <= 0) {
      errors.push("Net weight must be a positive number.");
    }
  }

  if (row.container_gross_weight) {
    console.log("Container Gross Weight:", row.container_gross_weight);
    if (isNaN(row.container_gross_weight) || row.container_gross_weight <= 0) {
      errors.push("Gross weight must be a positive number.");
    }
  }

  // Validate driver phone number
  const indianMobileRegex = /^[6-9]\d{9}$/;
  console.log("📱 Validating Driver Phone:", row.driver_phone);
  if (row.driver_phone && !indianMobileRegex.test(row.driver_phone)) {
    console.warn("❌ Invalid driver phone number.");
    errors.push(
      "Driver phone number is not valid. It should be a 10-digit Indian mobile number starting with 6-9."
    );
  }

  // Validate E-Way Bill
  const eWaybillRegex = /^\d{12}$/;
  if (row.eWay_bill) {
    console.log("📄 Validating E-Way Bill:", row.eWay_bill);
    if (!eWaybillRegex.test(row.eWay_bill)) {
      errors.push("E-Way Bill number must be exactly 12 digits.");
    }
  }

  // Validate Vehicle Number
  const vehicleNoRegex = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/i;
  if (row.vehicle_no) {
    console.log("🚗 Validating Vehicle Number:", row.vehicle_no);
    if (!vehicleNoRegex.test(row.vehicle_no)) {
      console.warn("❌ Vehicle number format invalid.");
      errors.push(
        "Vehicle number is not valid. Format should be AA00AA0000, aa00aa0000, AA00A0000, or aa00a0000."
      );
    }
  }

  if (errors.length > 0) {
    console.error("❌ Validation Errors:", errors);
    alert(errors.join("\n"));
    return;
  }

  // If both sr_cel_FGUID and sr_cel_no are present, call the PATCH API
  if (row.sr_cel_FGUID && row.sr_cel_no && row.sr_cel_id) {
    console.log("🔒 Locking SR CEL...");
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/get-srcel/${row.sr_cel_id}`,
        {
          sr_cel_locked: true,
        }
      );
      console.log("✅ SR CEL Locked successfully");
    } catch (error) {
      console.error("❌ Error locking SR CEL:", error);
      return;
    }
  }

  // Proceed with save logic
  const pr_no = props.pr_no;
  console.log(`pr_no: ${pr_no}`);
  console.log("📦 Sending final container save request...");
  console.log("Payload:", { ...row, pr_no: props.pr_no, elock: row.elock });

  try {
    const res = await axios.post(
      `${process.env.REACT_APP_API_STRING}/update-container`,
      { ...row, pr_no: props.pr_no, elock: row.elock }
    );
    console.log("✅ Container update response:", res.data);
    alert(res.data.message);
  } catch (error) {
    console.error("❌ Error updating container:", error);
  }

  console.log("✅ handleSaveLr completed.");
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
