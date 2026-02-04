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
    type_of_Do,
  } = job || {};

  const isValidDate = (date) => {
    if (!date) return false;
    const d = new Date(date);
    return !isNaN(d.getTime());
  };

  const anyArrival = Array.isArray(container_nos)
    ? container_nos.some((c) => isValidDate(c?.arrival_date))
    : false;

  const anyRailOut = Array.isArray(container_nos)
    ? container_nos.some((c) => isValidDate(c?.container_rail_out_date))
    : false;

  const hasContainers = Array.isArray(container_nos) && container_nos.length > 0;

  const allDelivered = hasContainers
    ? container_nos.every((c) => isValidDate(c?.delivery_date))
    : false;

  const allEmptyOffloaded = hasContainers
    ? container_nos.every((c) => isValidDate(c?.emptyContainerOffLoadDate))
    : false;

  const validOOC = isValidDate(out_of_charge);
  const validPCV = isValidDate(pcv_date);
  const validDischarge = isValidDate(discharge_date);
  const validIGM = isValidDate(gateway_igm_date);
  const validETA = isValidDate(vessel_berthing);

  const norm = (s) => String(s || "").trim().toLowerCase();
  const isExBond = norm(type_of_b_e) === "ex-bond";
  const isLCL = norm(consignment_type) === "lcl";
  const isTypeDoIcd = norm(type_of_Do) === "icd";

  // Ex-Bond: return early to avoid fall-through
  if (isExBond) {
    if (be_no && validOOC && allDelivered) {
      return "Billing Pending";
    }
    if (be_no && validOOC) {
      return "Custom Clearance Completed";
    }
    if (be_no && validPCV) {
      return "PCV Done, Duty Payment Pending";
    }
    return "ETA Date Pending";
  }

  // Non Ex-Bond (original import flow)
  // If type_of_Do is 'icd', we treat it like LCL (wait for delivery date)
  const billingComplete = (isLCL || isTypeDoIcd) ? allDelivered : allEmptyOffloaded;

  if (be_no && anyArrival && validOOC && billingComplete) {
    return "Billing Pending";
  }
  if (be_no && anyArrival && validOOC) {
    return "Custom Clearance Completed";
  }
  if (be_no && anyArrival && validPCV) {
    return "PCV Done, Duty Payment Pending";
  }
  if (be_no && anyArrival) {
    return "BE Noted, Clearance Pending";
  }
  if (!be_no && anyArrival) {
    return "Arrived, BE Note Pending";
  }
  if (be_no && !anyArrival) {
    return "BE Noted, Arrival Pending";
  }
  if (anyRailOut) {
    return "Rail Out";
  }
  if (validDischarge) {
    return "Discharged";
  }
  if (validIGM) {
    return "Gateway IGM Filed";
  }
  if (validETA) {
    return "Estimated Time of Arrival";
  }
  return "ETA Date Pending";
}
