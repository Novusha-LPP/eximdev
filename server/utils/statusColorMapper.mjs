/**
 * Maps detailed_status to row_color class name
 * Used by both server (when saving jobs) and client (when rendering)
 */
export const getRowColorFromStatus = (detailed_status) => {
  if (!detailed_status) return "";

  switch (detailed_status) {
    case "Billing Pending":
      return "billing-pending";
    case "Custom Clearance Completed":
      return "custom-clearance-completed";
    case "PCV Done, Duty Payment Pending":
      return "duty-payment-pending";
    case "BE Noted, Clearance Pending":
      return "clearance-pending";
    case "BE Noted, Arrival Pending":
      return "arrival-pending";
    case "Arrived, BE Note Pending":
      return "arrived-be-note-pending";
    case "Gateway IGM Filed":
      return "sea-igm-filed";
    case "Discharged":
      return "discharge";
    case "Rail Out":
      return "rail-out";
    case "Estimated Time of Arrival":
      return "eta";
    case "ETA Date Pending":
      return "eta-date-pending";
    default:
      return "";
  }
};
