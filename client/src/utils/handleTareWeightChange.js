export const handlePhysicalWeightChange = (e, index, formik) => {
  console.log("Physical weight change triggered");
  const newPhysicalWeight = parseFloat(e.target.value) || 0;
  console.log(`newPhysicalWeight (parsed):`, newPhysicalWeight);

  const tareWeight =
    parseFloat(formik.values.container_nos[index].tare_weight) || 0;
  console.log(`tareWeight (from formik):`, tareWeight);

  const newActualWeight = newPhysicalWeight - tareWeight;
  console.log(`newActualWeight (calculated):`, newActualWeight);

  formik.setFieldValue(
    `container_nos[${index}].physical_weight`,
    newPhysicalWeight
  );
  console.log(
    `Set formik value: container_nos[${index}].physical_weight = ${newPhysicalWeight}`
  );

  formik.setFieldValue(
    `container_nos[${index}].actual_weight`,
    newActualWeight
  );
  console.log(
    `Set formik value: container_nos[${index}].actual_weight = ${newActualWeight}`
  );

  // Pass newActualWeight to the function
  calculateWeightExcessShortage(index, formik, newActualWeight);
};

export const handleTareWeightChange = (e, index, formik) => {
  console.log("Tare weight change triggered");
  const newTareWeight = parseFloat(e.target.value) || 0;
  console.log(`newTareWeight (parsed):`, newTareWeight);

  const physicalWeight =
    parseFloat(formik.values.container_nos[index].physical_weight) || 0;
  console.log(`physicalWeight (from formik):`, physicalWeight);

  const newActualWeight = physicalWeight - newTareWeight;
  console.log(`newActualWeight (calculated):`, newActualWeight);

  formik.setFieldValue(`container_nos[${index}].tare_weight`, newTareWeight);
  console.log(
    `Set formik value: container_nos[${index}].tare_weight = ${newTareWeight}`
  );

  formik.setFieldValue(
    `container_nos[${index}].actual_weight`,
    newActualWeight
  );
  console.log(
    `Set formik value: container_nos[${index}].actual_weight = ${newActualWeight}`
  );

  // Pass newActualWeight to the function
  calculateWeightExcessShortage(index, formik, newActualWeight);
};

export const handleWeightAsPerDocumentChange = (e, index, formik) => {
  console.log("Weight as per document change triggered");
  const newWeightAsPerDocument = parseFloat(e.target.value) || 0;
  console.log(`newWeightAsPerDocument (parsed):`, newWeightAsPerDocument);

  formik.setFieldValue(
    `container_nos[${index}].net_weight`,
    newWeightAsPerDocument
  );
  console.log(
    `Set formik value: container_nos[${index}].net_weight = ${newWeightAsPerDocument}`
  );

  // Use current actual weight from formik as there's no new value calculation here
  const currentActualWeight =
    parseFloat(formik.values.container_nos[index].actual_weight) || 0;
  calculateWeightExcessShortage(index, formik, currentActualWeight);
};

export const handleActualWeightChange = (e, index, formik) => {
  console.log("Actual weight change triggered");
  const newActualWeight = parseFloat(e.target.value) || 0;
  console.log(`newActualWeight (parsed):`, newActualWeight);

  formik.setFieldValue(
    `container_nos[${index}].actual_weight`,
    newActualWeight
  );
  console.log(
    `Set formik value: container_nos[${index}].actual_weight = ${newActualWeight}`
  );

  // Pass newActualWeight to the function
  calculateWeightExcessShortage(index, formik, newActualWeight);
};

// Update function to accept newActualWeight as parameter
const calculateWeightExcessShortage = (index, formik, newActualWeight) => {
  console.log(
    `Calculating weight excess/shortage for container at index ${index}`
  );

  // Use newActualWeight passed as a parameter instead of getting it from formik
  console.log(`newActualWeight (passed as parameter):`, newActualWeight);

  const weightAsPerDocument =
    parseFloat(formik.values.container_nos[index].net_weight) || 0;
  console.log(`weightAsPerDocument (from formik):`, weightAsPerDocument);

  let difference = newActualWeight - weightAsPerDocument;
  console.log(`difference (calculated):`, difference);

  const formattedDifference = difference.toFixed(2);
  console.log(
    `formattedDifference (formatted to 2 decimal places):`,
    formattedDifference
  );

  formik.setFieldValue(
    `container_nos[${index}].weight_shortage`,
    formattedDifference
  );
  console.log(
    `Set formik value: container_nos[${index}].weight_shortage = ${formattedDifference}`
  );
};
