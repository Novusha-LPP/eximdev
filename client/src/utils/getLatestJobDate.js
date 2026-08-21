// Utility function to determine the latest milestone date in sequence for an import job

const isDateValid = (dateStr) => {
  if (!dateStr) return false;
  const s = String(dateStr).trim();
  if (!s || s === "null" || s === "undefined" || s === "N/A") return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Returns the latest milestone reached in the operational sequence for an import job.
 * Operational chronological sequence (latest to earliest):
 * 1. Empty Off / Destuffing Date
 * 2. Delivery Date
 * 3. DO Completed Date
 * 4. Out of Charge (OOC) Date
 * 5. Duty Paid Date
 * 6. PCV Date
 * 7. Assessment Date
 * 8. BE Date
 * 9. Arrival Date
 * 10. Rail Out / By Road Movement Date
 * 11. Discharge Date
 * 12. Gateway IGM Date / IGM Date
 * 13. ETA / Vessel Berthing
 * 14. Document Received / Job Date
 */
export function getLatestJobDate(job) {
  if (!job) return { label: "N/A", date: "", formattedDate: "N/A" };

  const containers = Array.isArray(job.container_nos) ? job.container_nos : [];

  // 1. Empty Off / Destuffing Date (from containers)
  const emptyOffDates = containers
    .map((c) => c?.emptyContainerOffLoadDate)
    .filter(isDateValid);
  if (emptyOffDates.length > 0) {
    const latest = emptyOffDates.sort().reverse()[0];
    return {
      label: "Empty Off",
      date: latest,
      formattedDate: formatDate(latest),
      badgeColor: "#10b981", // green
    };
  }

  // 2. Delivery Date (from containers or job level)
  const deliveryDates = containers
    .map((c) => c?.delivery_date)
    .filter(isDateValid);
  if (deliveryDates.length > 0) {
    const latest = deliveryDates.sort().reverse()[0];
    return {
      label: "Delivery",
      date: latest,
      formattedDate: formatDate(latest),
      badgeColor: "#059669",
    };
  }
  if (isDateValid(job.delivery_completed_date)) {
    return {
      label: "Delivery",
      date: job.delivery_completed_date,
      formattedDate: formatDate(job.delivery_completed_date),
      badgeColor: "#059669",
    };
  }

  // 3. DO Completed Date
  if (isDateValid(job.do_completed)) {
    return {
      label: "DO Done",
      date: job.do_completed,
      formattedDate: formatDate(job.do_completed),
      badgeColor: "#0284c7",
    };
  }

  // 4. Out of Charge (OOC) Date
  if (isDateValid(job.out_of_charge)) {
    return {
      label: "OOC",
      date: job.out_of_charge,
      formattedDate: formatDate(job.out_of_charge),
      badgeColor: "#16a34a",
    };
  }

  // 5. Duty Paid Date
  if (isDateValid(job.duty_paid_date)) {
    return {
      label: "Duty Paid",
      date: job.duty_paid_date,
      formattedDate: formatDate(job.duty_paid_date),
      badgeColor: "#2563eb",
    };
  }

  // 6. PCV Date
  if (isDateValid(job.pcv_date)) {
    return {
      label: "PCV",
      date: job.pcv_date,
      formattedDate: formatDate(job.pcv_date),
      badgeColor: "#7c3aed",
    };
  }

  // 7. Assessment Date
  if (isDateValid(job.assessment_date)) {
    return {
      label: "Assessment",
      date: job.assessment_date,
      formattedDate: formatDate(job.assessment_date),
      badgeColor: "#9333ea",
    };
  }

  // 8. BE Date
  if (isDateValid(job.be_date)) {
    return {
      label: "BE Noted",
      date: job.be_date,
      formattedDate: formatDate(job.be_date),
      badgeColor: "#d97706",
    };
  }

  // 9. Arrival Date (from containers)
  const arrivalDates = containers
    .map((c) => c?.arrival_date)
    .filter(isDateValid);
  if (arrivalDates.length > 0) {
    const latest = arrivalDates.sort().reverse()[0];
    return {
      label: "Arrived",
      date: latest,
      formattedDate: formatDate(latest),
      badgeColor: "#ea580c",
    };
  }

  // 10. Rail Out / By Road Movement Date (from containers)
  const railOutDates = containers
    .map((c) => c?.container_rail_out_date || c?.by_road_movement_date)
    .filter(isDateValid);
  if (railOutDates.length > 0) {
    const latest = railOutDates.sort().reverse()[0];
    return {
      label: "Rail Out",
      date: latest,
      formattedDate: formatDate(latest),
      badgeColor: "#0284c7",
    };
  }

  // 11. Discharge Date
  if (isDateValid(job.discharge_date)) {
    return {
      label: "Discharge",
      date: job.discharge_date,
      formattedDate: formatDate(job.discharge_date),
      badgeColor: "#0891b2",
    };
  }

  // 12. Gateway IGM Date / IGM Date
  if (isDateValid(job.gateway_igm_date)) {
    return {
      label: "G-IGM",
      date: job.gateway_igm_date,
      formattedDate: formatDate(job.gateway_igm_date),
      badgeColor: "#4f46e5",
    };
  }
  if (isDateValid(job.igm_date)) {
    return {
      label: "IGM Date",
      date: job.igm_date,
      formattedDate: formatDate(job.igm_date),
      badgeColor: "#4f46e5",
    };
  }

  // 13. ETA / Vessel Berthing
  if (isDateValid(job.vessel_berthing)) {
    return {
      label: "ETA",
      date: job.vessel_berthing,
      formattedDate: formatDate(job.vessel_berthing),
      badgeColor: "#64748b",
    };
  }

  // 14. Document Received / Job Date
  if (isDateValid(job.document_received_date)) {
    return {
      label: "Doc Recvd",
      date: job.document_received_date,
      formattedDate: formatDate(job.document_received_date),
      badgeColor: "#6b7280",
    };
  }
  if (isDateValid(job.job_date)) {
    return {
      label: "Job Date",
      date: job.job_date,
      formattedDate: formatDate(job.job_date),
      badgeColor: "#6b7280",
    };
  }

  return { label: "ETA Pending", date: "", formattedDate: "N/A", badgeColor: "#9ca3af" };
}

export default getLatestJobDate;
