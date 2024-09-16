export const handlePhysicalWeightChange = (e, index, formik) => {
  const newPhysicalWeight = e.target.value;
  const newActualWeight =
    newPhysicalWeight - formik.values.container_nos[index].tare_weight;
  formik.setFieldValue(
    `container_nos[${index}].physical_weight`,
    newPhysicalWeight
  );
  formik.setFieldValue(
    `container_nos[${index}].actual_weight`,
    newActualWeight
  );
};
