export const handleNetWeightChange = (e, index, formik) => {
  const newNetWeight = e.target.value;
  // const newWeightShortage =
  //   formik.values.container_nos[index].actual_weight - newNetWeight;
  // formik.setFieldValue(`container_nos[${index}].net_weight`, newNetWeight);
  // formik.setFieldValue(
  //   `container_nos[${index}].weight_shortage`,
  //   newWeightShortage
  // );
};
export const handleGrossWeightChange = (e, index, formik) => {
  const newGrossWeight = e.target.value;
  const newWeightShortage =
    formik.values.container_nos[index].actual_weight - newGrossWeight;
  formik.setFieldValue(`container_nos[${index}].container_gross_weight`, newGrossWeight);
  formik.setFieldValue(
    `container_nos[${index}].weight_shortage`,
    newWeightShortage
  );
};
