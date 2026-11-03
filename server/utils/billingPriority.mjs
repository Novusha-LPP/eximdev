/**
 * Billing urgency ranking, the same rules the Import DO billing sheet uses (getDoBilling.mjs):
 *   1 = red     (billing overdue by 10 days or more)
 *   2 = orange  (overdue by 6 to 9 days)
 *   3 = white   (overdue by 1 to 5 days)
 *   100 = date is today or in the future, 999 = no date
 * For "Billing Pending" jobs the date is each container's empty-off-load date (delivery date for LCL),
 * the most urgent container counts; other jobs fall back to vessel berthing, then delivery date.
 */

const daysFromToday = (dateStr) => {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((date.getTime() - today.getTime()) / (1000 * 3600 * 24));
};

export const getColorPriority = (daysDifference) => {
  if (daysDifference === null) return 999;
  if (daysDifference <= -10) return 1; // Red
  if (daysDifference <= -6) return 2; // Orange
  if (daysDifference < 0) return 3; // White
  return 100; // Future dates
};

export const rankByBillingUrgency = (job) => {
  let mostCriticalDays = null;
  let mostCriticalPriority = 999;

  if (job.detailed_status === "Billing Pending" && Array.isArray(job.container_nos) && job.container_nos.length > 0) {
    job.container_nos.forEach((container) => {
      const targetDate = job.consignment_type === "LCL" ? container.delivery_date : container.emptyContainerOffLoadDate;
      if (targetDate) {
        const daysDiff = daysFromToday(targetDate);
        const priority = getColorPriority(daysDiff);
        if (priority < mostCriticalPriority) {
          mostCriticalDays = daysDiff;
          mostCriticalPriority = priority;
        } else if (priority === mostCriticalPriority && daysDiff !== null) {
          if (mostCriticalDays === null || daysDiff < mostCriticalDays) mostCriticalDays = daysDiff;
        }
      }
    });
  }

  if (mostCriticalDays === null && mostCriticalPriority === 999) {
    const fallbackDate = job.vessel_berthing || job.delivery_date;
    if (fallbackDate) {
      mostCriticalDays = daysFromToday(fallbackDate);
      mostCriticalPriority = getColorPriority(mostCriticalDays);
    }
  }

  return { daysDifference: mostCriticalDays, colorPriority: mostCriticalPriority };
};

// Most urgent first, then the most overdue, jobs without a date last, then job number
export const compareByBillingUrgency = (a, b) => {
  if (a.colorPriority !== b.colorPriority) return a.colorPriority - b.colorPriority;
  if (a.daysDifference !== null && b.daysDifference !== null) return a.daysDifference - b.daysDifference;
  if (a.daysDifference === null && b.daysDifference !== null) return 1;
  if (a.daysDifference !== null && b.daysDifference === null) return -1;
  return String(a.job_no || "").localeCompare(String(b.job_no || ""));
};
