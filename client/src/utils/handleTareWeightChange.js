export const handlePhysicalWeightChange = (e, index, formik) => {
  const newPhysicalWeight = parseFloat(e.target.value) || 0;
  const tareWeight =
    parseFloat(formik.values.container_nos[index].tare_weight) || 0;

  const newActualWeight = newPhysicalWeight - tareWeight;

  formik.setFieldValue(
    `container_nos[${index}].physical_weight`,
    newPhysicalWeight
  );


  formik.setFieldValue(
    `container_nos[${index}].actual_weight`,
    newActualWeight
  );


  // Pass newActualWeight to the function
  calculateWeightExcessShortage(index, formik, newActualWeight);
};

export const handleTareWeightChange = (e, index, formik) => {
  const newTareWeight = parseFloat(e.target.value) || 0;

  const physicalWeight =
    parseFloat(formik.values.container_nos[index].physical_weight) || 0;

  const newActualWeight = physicalWeight - newTareWeight;

  formik.setFieldValue(`container_nos[${index}].tare_weight`, newTareWeight);

  formik.setFieldValue(
    `container_nos[${index}].actual_weight`,
    newActualWeight
  );

  // Pass newActualWeight to the function
  calculateWeightExcessShortage(index, formik, newActualWeight);
};

export const handleWeightAsPerDocumentChange = (e, index, formik) => {
  // console.log("Weight as per document change triggered");
  // const newWeightAsPerDocument = parseFloat(e.target.value) || 0;
  // console.log(`newWeightAsPerDocument (parsed):`, newWeightAsPerDocument);
  // formik.setFieldValue(
  //   `container_nos[${index}].net_weight`,
  //   newWeightAsPerDocument
  // );
  // console.log(
  //   `Set formik value: container_nos[${index}].net_weight = ${newWeightAsPerDocument}`
  // );
  // // Use current actual weight from formik as there's no new value calculation here
  // const currentActualWeight =
  //   parseFloat(formik.values.container_nos[index].actual_weight) || 0;
  // calculateWeightExcessShortage(index, formik, currentActualWeight);
};
export const handleGrossWeightAsPerDocumentChange = (e, index, formik) => {
  const newGrossWeightAsPerDocument = parseFloat(e.target.value) || 0;

  formik.setFieldValue(
    `container_nos[${index}].container_gross_weight`,
    newGrossWeightAsPerDocument
  );

  // Use current actual weight from formik as there's no new value calculation here
  const currentActualWeight =
    parseFloat(formik.values.container_nos[index].actual_weight) || 0;
  calculateWeightExcessShortage(index, formik, currentActualWeight);
};

export const handleActualWeightChange = (e, index, formik) => {
  const newActualWeight = parseFloat(e.target.value) || 0;

  formik.setFieldValue(
    `container_nos[${index}].actual_weight`,
    newActualWeight
  );

  // Pass newActualWeight to the function
  calculateWeightExcessShortage(index, formik, newActualWeight);
};

// Update function to accept newActualWeight as parameter
const calculateWeightExcessShortage = (index, formik, newActualWeight) => {

  const weightAsPerDocument =
    parseFloat(formik.values.container_nos[index].net_weight) || 0;
  const grossWeightAsPerDocument =
    parseFloat(formik.values.container_nos[index].container_gross_weight) || 0;


  let difference = newActualWeight - grossWeightAsPerDocument;
  const formattedDifference = difference.toFixed(2);

  formik.setFieldValue(
    `container_nos[${index}].weight_shortage`,
    formattedDifference
  );
};
