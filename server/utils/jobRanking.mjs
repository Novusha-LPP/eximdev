
export const STATUS_RANK_MAP = {
    "Billing Pending": { rank: 1, field: "emptyContainerOffLoadDate" },
    "Custom Clearance Completed": { rank: 2, field: "detention_from" },
    "PCV Done, Duty Payment Pending": { rank: 3, field: "detention_from" },
    "BE Noted, Clearance Pending": { rank: 4, field: "detention_from" },
    "BE Noted, Arrival Pending": { rank: 5, field: "be_date" },
    "Arrived, BE Note Pending": { rank: 6, field: "be_date" },
    "Rail Out": { rank: 7, field: "container_rail_out_date" },
    "Discharged": { rank: 8, field: "discharge_date" },
    "Gateway IGM Filed": { rank: 9, field: "gateway_igm_date" },
    "Estimated Time of Arrival": { rank: 10, field: "vessel_berthing" },
};

export const getJobStatusRank = (status) => {
    return STATUS_RANK_MAP[status]?.rank || 999;
};

export const getJobSortDate = (job, status) => {
    const config = STATUS_RANK_MAP[status];
    // Default to far future if no status or unknown status
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

    // 3. Try parsing
    if (dateVal) {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
            return d;
        }
    }

    // Default
    return new Date("9999-12-31T23:59:59.999Z");
};
