export const handleTareWeightChange = (e, index, formik) => {
  const newTareWeight = e.target.value;
  const newActualWeight =
    formik.values.container_nos[index].physical_weight - newTareWeight;
  formik.setFieldValue(`container_nos[${index}].tare_weight`, newTareWeight);
  formik.setFieldValue(
    `container_nos[${index}].actual_weight`,
    newActualWeight
  );
};
