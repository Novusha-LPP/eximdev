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

  const log = (...args) => console.log("[determineDetailedStatus]", ...args);

  const isValidDate = (date, tag) => {
    if (!date) {
      log("isValidDate=false (empty)", { tag, value: date });
      return false;
    }
    const d = new Date(date);
    const ok = !isNaN(d.getTime());
    log("isValidDate", { tag, value: date, parsed: d.toString(), ok });
    return ok;
  };

  log("INPUT", {
    be_no,
    out_of_charge,
    pcv_date,
    discharge_date,
    gateway_igm_date,
    vessel_berthing,
    type_of_b_e,
    consignment_type,
    container_count: Array.isArray(container_nos) ? container_nos.length : null,
  });

  const anyArrival = Array.isArray(container_nos)
    ? container_nos.some((c, i) => isValidDate(c?.arrival_date, `arrival_date[${i}]`))
    : false;

  const anyRailOut = Array.isArray(container_nos)
    ? container_nos.some((c, i) => isValidDate(c?.container_rail_out_date, `rail_out[${i}]`))
    : false;

  const hasContainers = Array.isArray(container_nos) && container_nos.length > 0;
  log("hasContainers", { hasContainers });

  const allDelivered = hasContainers
    ? container_nos.every((c, i) => isValidDate(c?.delivery_date, `delivery_date[${i}]`))
    : false;

  const allEmptyOffloaded = hasContainers
    ? container_nos.every((c, i) => isValidDate(c?.emptyContainerOffLoadDate, `emptyOffload[${i}]`))
    : false;

  const validOOC = isValidDate(out_of_charge, "out_of_charge");
  const validPCV = isValidDate(pcv_date, "pcv_date");
  const validDischarge = isValidDate(discharge_date, "discharge_date");
  const validIGM = isValidDate(gateway_igm_date, "gateway_igm_date");
  const validETA = isValidDate(vessel_berthing, "vessel_berthing");

  const norm = (s) => String(s || "").trim().toLowerCase();
  const isExBond = norm(type_of_b_e) === "ex-bond";
  const isLCL = norm(consignment_type) === "lcl";

  log("DERIVED FLAGS", {
    isExBond,
    isLCL,
    anyArrival,
    anyRailOut,
    allDelivered,
    allEmptyOffloaded,
    validOOC,
    validPCV,
    validDischarge,
    validIGM,
    validETA,
  });

  // Ex-Bond: return early to avoid fall-through
  if (isExBond) {
    log("PATH", "Ex-Bond");
    if (be_no && validOOC && allDelivered) {
      log("DECISION", "Billing Pending (Ex-Bond)");
      return "Billing Pending";
    }
    if (be_no && validOOC) {
      log("DECISION", "Custom Clearance Completed (Ex-Bond)");
      return "Custom Clearance Completed";
    }
    if (be_no && validPCV) {
      log("DECISION", "PCV Done, Duty Payment Pending (Ex-Bond)");
      return "PCV Done, Duty Payment Pending";
    }
    log("DECISION", "Fallback (Ex-Bond) -> ETA Date Pending");
    return "ETA Date Pending";
  }

  // Non Ex-Bond (original import flow)
  log("PATH", "Non Ex-Bond");
  const billingComplete = isLCL ? allDelivered : allEmptyOffloaded;
  log("billingComplete", { billingComplete });

  if (be_no && anyArrival && validOOC && billingComplete) {
    log("DECISION", "Billing Pending");
    return "Billing Pending";
  }
  if (be_no && anyArrival && validOOC) {
    log("DECISION", "Custom Clearance Completed");
    return "Custom Clearance Completed";
  }
  if (be_no && anyArrival && validPCV) {
    log("DECISION", "PCV Done, Duty Payment Pending");
    return "PCV Done, Duty Payment Pending";
  }
  if (be_no && anyArrival) {
    log("DECISION", "BE Noted, Clearance Pending");
    return "BE Noted, Clearance Pending";
  }
  if (!be_no && anyArrival) {
    log("DECISION", "Arrived, BE Note Pending");
    return "Arrived, BE Note Pending";
  }
  if (be_no && !anyArrival) {
    log("DECISION", "BE Noted, Arrival Pending");
    return "BE Noted, Arrival Pending";
  }
  if (anyRailOut) {
    log("DECISION", "Rail Out");
    return "Rail Out";
  }
  if (validDischarge) {
    log("DECISION", "Discharged");
    return "Discharged";
  }
  if (validIGM) {
    log("DECISION", "Gateway IGM Filed");
    return "Gateway IGM Filed";
  }
  if (validETA) {
    log("DECISION", "Estimated Time of Arrival");
    return "Estimated Time of Arrival";
  }
  log("DECISION", "ETA Date Pending (final fallback)");
  return "ETA Date Pending";
}
