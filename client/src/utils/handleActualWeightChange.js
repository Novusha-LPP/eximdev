export const handleActualWeightChange = (e, index, formik) => {
  const newActualWeight = e.target.value;
  const newWeightShortage =
    formik.values.container_nos[index].net_weight - newActualWeight;
  formik.setFieldValue(
    `container_nos[${index}].actual_weight`,
    newActualWeight
  );
  formik.setFieldValue(
    `container_nos[${index}].weight_shortage`,
    newWeightShortage
  );
};
