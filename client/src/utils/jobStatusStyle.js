import { detailedStatusOptions } from "../assets/data/detailedStatusOptions";

// Colour of each job "detailed status" in the Import DSR list. The hues are the ones the rows have
// always used (see getTableRowInlineStyle); here each status gets a strong colour for the card's
// side bar and dots (bar), the old pastel for the status pill (bg) and a dark text colour (ink).
const BLUE = { bar: "#3b82f6", bg: "#99ccff", ink: "#1e3a8a" };
const ORANGE = { bar: "#fb923c", bg: "#ffcc99", ink: "#7c2d12" };
const GREY = { bar: "#94a3b8", bg: "#f1f5f9", ink: "#334155" };

export const JOB_STATUS_STYLE = {
  "ETA Date Pending": { bar: "#b6c0d1", bg: "#f1f4f9", ink: "#475569" },
  "Estimated Time of Arrival": { bar: "#eab308", bg: "#ffff99", ink: "#713f12" },
  "Gateway IGM Filed": ORANGE,
  Discharged: ORANGE,
  "Rail Out": BLUE,
  "BE Noted, Arrival Pending": BLUE,
  "Arrived, BE Note Pending": { bar: "#8b5cf6", bg: "#e6ccff", ink: "#4c1d95" },
  "BE Noted, Clearance Pending": BLUE,
  "PCV Done, Duty Payment Pending": { bar: "#5eead4", bg: "#e6ffff", ink: "#115e59" },
  "Custom Clearance Completed": { bar: "#06b6d4", bg: "#ccffff", ink: "#155e75" },
  "Do completed and Delivery pending": { bar: "#22c55e", bg: "#ccffcc", ink: "#14532d" },
  "Billing Pending": { bar: "#ef4444", bg: "#ffcccc", ink: "#7f1d1d" },
  Billed: GREY,
  "Status Completed": GREY,
};

// "DO Planning" is a list filter, not a job status
export const DO_PLANNING_STYLE = { bar: "#6366f1", bg: "#e0e7ff", ink: "#3730a3" };

export const DEFAULT_STATUS_STYLE = { bar: "#cbd5e1", bg: "#f1f5f9", ink: "#475569" };

export const getJobStatusStyle = (status) => JOB_STATUS_STYLE[status] || DEFAULT_STATUS_STYLE;

// Name shown for a status value (the filter list calls "Custom Clearance Completed" something longer)
export const getJobStatusLabel = (status) =>
  detailedStatusOptions.find((o) => o.value === status)?.name || status || "—";

// How urgent a job is. Same rules as the coloured job-number badge always used:
// arrival soon (ETA), detention about to start (clearance stages) and billing waiting too long.
// Returns { label, bg, fg } or null when there is nothing to flag.
const DAY = 1000 * 3600 * 24;
const daysUntil = (target, now) => Math.ceil((new Date(target).getTime() - now.getTime()) / DAY);

export function getJobUrgency(row, now = new Date()) {
  const { detailed_status, vessel_berthing, consignment_type } = row || {};
  const containers = Array.isArray(row?.container_nos) ? row.container_nos : [];
  let urgency = null;

  if (detailed_status === "Estimated Time of Arrival") {
    const d = daysUntil(vessel_berthing, now);
    if (d === 0) urgency = { label: "Vessel arrives today", bg: "#ef1c1c", fg: "#ffffff" };
    else if (d > 0 && d <= 2) urgency = { label: "Arrives in 1–2 days", bg: "#f87171", fg: "#2b0505" };
    else if (d > 2 && d <= 5) urgency = { label: "Arrives in 3–5 days", bg: "#fca5a5", fg: "#2b0505" };
  }

  if (detailed_status === "Billing Pending") {
    containers.forEach((container) => {
      const target = consignment_type === "LCL" ? container.delivery_date : container.emptyContainerOffLoadDate;
      if (!target) return;
      const d = daysUntil(target, now);
      if (d <= 0 && d >= -5) urgency = null;
      else if (d <= -6 && d >= -10) urgency = { label: "Off-loaded 6–10 days ago", bg: "#f59e0b", fg: "#241500" };
      else if (d < -10) urgency = { label: "Off-loaded more than 10 days ago", bg: "#e5484d", fg: "#ffffff" };
    });
  }

  if (
    detailed_status === "Custom Clearance Completed" ||
    detailed_status === "BE Noted, Clearance Pending" ||
    detailed_status === "PCV Done, Duty Payment Pending"
  ) {
    containers.forEach((container) => {
      const d = daysUntil(container.detention_from, now);
      if (d <= 0) urgency = { label: "Detention has started", bg: "#8f1d1d", fg: "#ffffff" };
      else if (d === 1) urgency = { label: "Detention starts tomorrow", bg: "#e5484d", fg: "#ffffff" };
      else if (d === 2) urgency = { label: "Detention starts in 2 days", bg: "#f59e0b", fg: "#241500" };
      else if (d === 3) urgency = { label: "Detention starts in 3 days", bg: "#facc15", fg: "#241f00" };
    });
  }

  return urgency;
}
