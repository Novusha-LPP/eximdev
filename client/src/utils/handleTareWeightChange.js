export const validateTareWeight = (size, tareWeight) => {
  if (
    tareWeight === "" ||
    tareWeight === null ||
    tareWeight === undefined ||
    String(tareWeight).trim() === ""
  ) {
    return null; // Empty value is acceptable
  }

  const weightNum = parseFloat(tareWeight);
  if (isNaN(weightNum)) {
    return "Invalid tare weight";
  }

  const sizeStr = String(size || "").trim().toLowerCase();
  if (sizeStr.startsWith("20") || sizeStr.includes("20")) {
    if (weightNum < 2100) {
      return "Tare weight for 20 feet container cannot be less than 2100 KG";
    }
  } else if (sizeStr.startsWith("40") || sizeStr.includes("40")) {
    if (weightNum < 3600) {
      return "Tare weight for 40 feet container cannot be less than 3600 KG";
    }
  }

  return null;
};

export const handlePhysicalWeightChange = (e, index, formik) => {
  const rawValue = e.target.value;
  formik.setFieldValue(`container_nos[${index}].physical_weight`, rawValue);

  const tareWeightVal = formik.values.container_nos[index]?.tare_weight;
  const isPhysicalValid = rawValue !== "" && !isNaN(parseFloat(rawValue));
  const isTareValid =
    tareWeightVal !== "" &&
    tareWeightVal !== null &&
    tareWeightVal !== undefined &&
    !isNaN(parseFloat(tareWeightVal));

  if (isPhysicalValid && isTareValid) {
    const newPhysicalWeight = parseFloat(rawValue);
    const tareWeight = parseFloat(tareWeightVal);
    const newActualWeight = (newPhysicalWeight - tareWeight).toFixed(2);
    formik.setFieldValue(`container_nos[${index}].actual_weight`, newActualWeight);
    calculateWeightExcessShortage(index, formik, parseFloat(newActualWeight));
  } else {
    formik.setFieldValue(`container_nos[${index}].actual_weight`, "");
    formik.setFieldValue(`container_nos[${index}].weight_shortage`, "");
  }
};

export const handleTareWeightChange = (e, index, formik) => {
  const rawValue = e.target.value;
  formik.setFieldValue(`container_nos[${index}].tare_weight`, rawValue);

  const physicalWeightVal = formik.values.container_nos[index]?.physical_weight;
  const isTareValid = rawValue !== "" && !isNaN(parseFloat(rawValue));
  const isPhysicalValid =
    physicalWeightVal !== "" &&
    physicalWeightVal !== null &&
    physicalWeightVal !== undefined &&
    !isNaN(parseFloat(physicalWeightVal));

  if (isTareValid && isPhysicalValid) {
    const newTareWeight = parseFloat(rawValue);
    const physicalWeight = parseFloat(physicalWeightVal);
    const newActualWeight = (physicalWeight - newTareWeight).toFixed(2);
    formik.setFieldValue(`container_nos[${index}].actual_weight`, newActualWeight);
    calculateWeightExcessShortage(index, formik, parseFloat(newActualWeight));
  } else {
    formik.setFieldValue(`container_nos[${index}].actual_weight`, "");
    formik.setFieldValue(`container_nos[${index}].weight_shortage`, "");
  }
};

export const handleWeightAsPerDocumentChange = (e, index, formik) => {
  // Optional / unused handler preserved for compatibility
};

export const handleGrossWeightAsPerDocumentChange = (e, index, formik) => {
  const newGrossWeightAsPerDocument = parseFloat(e.target.value) || 0;

  formik.setFieldValue(
    `container_nos[${index}].container_gross_weight`,
    newGrossWeightAsPerDocument
  );

  const currentActualWeight =
    parseFloat(formik.values.container_nos[index]?.actual_weight) || 0;
  calculateWeightExcessShortage(index, formik, currentActualWeight);
};

export const handleActualWeightChange = (e, index, formik) => {
  const newActualWeight = parseFloat(e.target.value) || 0;

  formik.setFieldValue(
    `container_nos[${index}].actual_weight`,
    newActualWeight
  );

  calculateWeightExcessShortage(index, formik, newActualWeight);
};

// Update function to accept newActualWeight as parameter
const calculateWeightExcessShortage = (index, formik, newActualWeight) => {
  const grossWeightAsPerDocument =
    parseFloat(formik.values.container_nos[index]?.container_gross_weight) || 0;

  let difference = newActualWeight - grossWeightAsPerDocument;
  const formattedDifference = difference.toFixed(2);

  formik.setFieldValue(
    `container_nos[${index}].weight_shortage`,
    formattedDifference
  );
};
