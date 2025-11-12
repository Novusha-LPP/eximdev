export function determineDetailedStatus(job) {
  const {
    be_no,
    container_nos,
    out_of_charge,
    pcv_date,
    discharge_date,
    gateway_igm_date,
    vessel_berthing,
    type_of_b_e,
    consignment_type,
  } = job || {};

  const isValidDate = (date) => {
    if (!date) return false;
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  };

  const anyContainerArrivalDate = container_nos?.some((container) =>
    isValidDate(container.arrival_date)
  );
  const anyContainer_rail_out_date = container_nos?.some((container) =>
    isValidDate(container.container_rail_out_date)
  );

  const emptyContainerOffLoadDate = container_nos?.every((container) =>
    isValidDate(container.emptyContainerOffLoadDate)
  );
  const delivery_date = container_nos?.every((container) =>
    isValidDate(container.delivery_date)
  );

  const validOutOfChargeDate = isValidDate(out_of_charge);
  const validPcvDate = isValidDate(pcv_date);
  const validDischargeDate = isValidDate(discharge_date);
  const validGatewayIgmDate = isValidDate(gateway_igm_date);
  const validVesselBerthing = isValidDate(vessel_berthing);

  const isExBondOrLCL = type_of_b_e === "Ex-Bond" || consignment_type === "LCL";

  if (
    be_no &&
    anyContainerArrivalDate &&
    validOutOfChargeDate &&
    (isExBondOrLCL ? delivery_date : emptyContainerOffLoadDate)
  ) {
    return "Billing Pending";
  } else if (be_no && anyContainerArrivalDate && validOutOfChargeDate) {
    return "Custom Clearance Completed";
  } else if (be_no && anyContainerArrivalDate && validPcvDate) {
    return "PCV Done, Duty Payment Pending";
  } else if (be_no && anyContainerArrivalDate) {
    return "BE Noted, Clearance Pending";
  } else if (!be_no && anyContainerArrivalDate) {
    return "Arrived, BE Note Pending";
  } else if (be_no) {
    return "BE Noted, Arrival Pending";
  } else if (anyContainer_rail_out_date) {
    return "Rail Out";
  } else if (validDischargeDate) {
    return "Discharged";
  } else if (validGatewayIgmDate) {
    return "Gateway IGM Filed";
  } else if (validVesselBerthing) {
    return "Estimated Time of Arrival";
  } else {
    return "ETA Date Pending";
  }
}
