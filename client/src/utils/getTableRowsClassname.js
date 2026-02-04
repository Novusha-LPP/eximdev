/**
 * Map detailed_status to CSS class name for row coloring. */
export const getTableRowsClassname = (params) => {
  const job = params.original;
  // Determine the row color key from `detailed_status` only (use DB detailed_status as source of truth)
  const status = job?.detailed_status;
  const mapping = (s) => {
    switch (s) {
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
      case "Do completed and Delivery pending":
        return "do-completed-delivery-pending";
      default:
        return "";
    }
  };

  // Use detailed_status mapping as the single source of truth for row color/class
  return mapping(status) || "";
};

/**
 * Return an inline style object for the table row based on DB `row_color`.
 * This allows the UI to use the database-driven color value directly
 * (preferred) while keeping existing CSS classnames for compatibility.
 */
export const getTableRowInlineStyle = (params) => {
  const job = params?.original || {};
  // Use detailed_status as the source of truth to derive the color key
  const status = job?.detailed_status;
  const mapping = (s) => {
    switch (s) {
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
      case "Do completed and Delivery pending":
        return "do-completed-delivery-pending";
      default:
        return "";
    }
  };

  const colorKey = mapping(status);

  // Map known row_color keys to the same colors used in App.scss
  const colorMap = {
    "custom-clearance-completed": "#ccffff",
    "duty-payment-pending": "#e6ffff",
    "clearance-pending": "#99ccff",
    "arrival-pending": "#99ccff",
    "sea-igm-filed": "#ffcc99",
    "discharge": "#ffcc99",
    "eta": "#ffff99",
    "eta-date-pending": "#ffffcc",
    "payment_made": "#ffc5c5",
    "billing-pending": "#ffcccc",
    "arrived-be-note-pending": "#e6ccff",
    "rail-out": "#ccffcc",
    "bg-yellow": "#f9e781",
    "bg-orange": "#fbba5f",
    "bg-green": "#b0f8b0",
    "do-completed-delivery-pending": "#ccffcc",
  };

  const bg = colorMap[colorKey] || "";
  return bg ? { backgroundColor: bg } : {};
};
