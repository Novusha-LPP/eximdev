
export const STATUS_RANK_MAP = {
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
    return STATUS_RANK_MAP[status]?.rank || 999;
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

    // Pure Global ETA Sort: Primary sort date is ETA (vessel_berthing / eta / eta_date)
    const etaStr = job.vessel_berthing || job.eta || job.eta_date;
    if (etaStr) {
        const parsedEta = parseDateString(etaStr);
        if (parsedEta) return parsedEta;
    }

    // Default to far future so jobs with missing ETA appear at the end
    return new Date("9999-12-31T23:59:59.999Z");
};

