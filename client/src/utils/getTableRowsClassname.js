export const getTableRowsClassname = (params) => {
  const status = params.original.detailed_status;

  if (status === "Custom Clearance Completed") {
    return "custom-clearance-completed";
  } else if (status === "BE Noted, Clearance Pending") {
    return "clearance-pending";
  } else if (status === "BE Noted, Arrival Pending") {
    return "arrival-pending";
  } else if (status === "Gateway IGM Filed") {
    return "sea-igm-filed";
  } else if (status === "Discharged") {
    return "discharge";
  } else if (status === "Estimated Time of Arrival") {
    return "eta";
  }

  return ""; // Default class name
};
