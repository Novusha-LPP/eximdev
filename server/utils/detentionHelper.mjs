/**
 * Helper utilities for calculating container detention and DO validity dates.
 */

/**
 * Extract YYYY-MM-DD from any date string or Date object
 */
export const getDateOnly = (dateInput) => {
  if (!dateInput) return null;
  const str = String(dateInput).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Calculate Detention From date: arrival_date + free_time (in days)
 * Uses UTC date operations to avoid timezone / daylight saving issues.
 * Returns YYYY-MM-DD or ""
 */
export const calculateDetentionFrom = (arrivalDate, freeTimeDays) => {
  const base = getDateOnly(arrivalDate);
  const freeDays = parseInt(freeTimeDays, 10);
  if (!base || isNaN(freeDays) || freeDays <= 0) {
    return "";
  }

  const [y, m, d] = base.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (isNaN(dt.getTime())) return "";

  dt.setUTCDate(dt.getUTCDate() + freeDays);

  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

/**
 * Subtract one day from a date string (YYYY-MM-DD)
 * Returns YYYY-MM-DD or ""
 */
export const subtractOneDay = (dateStr) => {
  const base = getDateOnly(dateStr);
  if (!base) return "";

  const [y, m, d] = base.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (isNaN(dt.getTime())) return "";

  dt.setUTCDate(dt.getUTCDate() - 1);

  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};

/**
 * Recalculate detention_from and do_validity for all containers in a job.
 * 
 * @param {Array} containers - Array of container objects
 * @param {number|string} freeTime - Free days (e.g. 14)
 * @param {Object} [options] - Job context: { mode, consignment_type, type_of_b_e }
 * @returns {Object} { containers, earliestDetention, do_validity_upto_job_level }
 */
export const recalculateContainersDetention = (containers, freeTime, options = {}) => {
  if (!Array.isArray(containers)) {
    return { containers: [], earliestDetention: "", do_validity_upto_job_level: "" };
  }

  const mode = String(options.mode || "").trim().toUpperCase();
  const consignmentType = String(options.consignment_type || "").trim().toUpperCase();
  const typeOfBe = String(options.type_of_b_e || "").trim().toLowerCase();

  // Detention not applicable for Air mode, Ex-Bond jobs, or LCL
  const isAir = mode === "AIR" || mode.includes("AIR");
  const isExBond = typeOfBe === "ex-bond";
  const isLCL = consignmentType === "LCL";

  const freeDays = parseInt(freeTime, 10);
  const hasValidFreeTime = !isNaN(freeDays) && freeDays > 0;

  let earliestDetention = "";

  const updatedContainers = containers.map((c) => {
    const containerObj = typeof c?.toObject === "function" ? c.toObject() : { ...c };

    if (isAir || isExBond || isLCL) {
      return containerObj;
    }

    const arrivalDate = containerObj.arrival_date ? String(containerObj.arrival_date).trim() : "";

    if (arrivalDate && hasValidFreeTime) {
      const detentionDate = calculateDetentionFrom(arrivalDate, freeDays);
      containerObj.detention_from = detentionDate;
      containerObj.do_validity_upto_container_level = detentionDate ? subtractOneDay(detentionDate) : "";

      if (detentionDate) {
        if (!earliestDetention || detentionDate < earliestDetention) {
          earliestDetention = detentionDate;
        }
      }
    } else if (!arrivalDate) {
      // Arrival date not present or cleared
      containerObj.detention_from = "";
      containerObj.do_validity_upto_container_level = "";
    }

    return containerObj;
  });

  const do_validity_upto_job_level = earliestDetention ? subtractOneDay(earliestDetention) : "";

  return {
    containers: updatedContainers,
    earliestDetention,
    do_validity_upto_job_level,
  };
};
