
export const STATUS_RANK_MAP = {
    "Billed": { rank: 0, field: "billing_completed_date" },
    "Billing Pending": { rank: 1, field: "emptyContainerOffLoadDate" },
    "Do completed and Delivery pending": { rank: 2, field: "do_completed" },
    "Custom Clearance Completed": { rank: 3, field: "detention_from" },
    "PCV Done, Duty Payment Pending": { rank: 4, field: "detention_from" },
    "BE Noted, Clearance Pending": { rank: 5, field: "detention_from" },
    "BE Noted, Arrival Pending": { rank: 6, field: "be_date" },
    "Arrived, BE Note Pending": { rank: 7, field: "be_date" },
    "Rail Out": { rank: 8, field: "container_rail_out_date" },
    "Discharged": { rank: 9, field: "discharge_date" },
    "Gateway IGM Filed": { rank: 10, field: "gateway_igm_date" },
    "Estimated Time of Arrival": { rank: 11, field: "vessel_berthing" },
};

export const getJobStatusRank = (status) => {
    return STATUS_RANK_MAP[status]?.rank ?? 999;
};

const parseDateString = (dateStr) => {
    if (!dateStr) return null;
    if (typeof dateStr !== "string") {
        if (dateStr instanceof Date && !isNaN(dateStr.getTime())) return dateStr;
        return null;
    }
    const clean = dateStr.trim();
    if (!clean || clean.toLowerCase() === "invalid date") return null;
    let d = new Date(clean);
    if (!isNaN(d.getTime())) return d;
    const ddmmyyyyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyyMatch) {
        const [, day, month, year] = ddmmyyyyMatch;
        d = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
        if (!isNaN(d.getTime())) return d;
    }
    return null;
};

export const getJobSortDate = (job, status = null) => {
    if (!job) return new Date("9999-12-31T23:59:59.999Z");

    const effectiveStatus = status || job.detailed_status;
    const config = STATUS_RANK_MAP[effectiveStatus];
    if (!config) return new Date("9999-12-31T23:59:59.999Z");

    const field = config.field;
    let dateVal = null;

    // 1. Try root level
    if (job[field]) {
        dateVal = job[field];
    }
    // 2. Try first container (common pattern in existing aggregation)
    else if (job.container_nos && job.container_nos.length > 0 && job.container_nos[0][field]) {
        dateVal = job.container_nos[0][field];
    }
    // Fallbacks for rail out field naming
    else if (field === "container_rail_out_date" && job.rail_out) {
        dateVal = job.rail_out;
    }
    else if (field === "rail_out" && job.container_nos && job.container_nos.length > 0 && job.container_nos[0].container_rail_out_date) {
        dateVal = job.container_nos[0].container_rail_out_date;
    }

    // 3. Try parsing
    if (dateVal) {
        const d = parseDateString(dateVal);
        if (d) {
            return d;
        }
    }

    // Default
    return new Date("9999-12-31T23:59:59.999Z");
};

