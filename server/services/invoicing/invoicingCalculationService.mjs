import moment from "moment";

/**
 * Check if a date is an Off-Day (Sunday or Second Saturday)
 * @param {string|Date} dateInput YYYY-MM-DD string or Date object
 * @returns {{ isOffDay: boolean, reason: string|null }}
 */
export const getOffDayInfo = (dateInput) => {
    try {
        const m = moment(dateInput);
        if (!m.isValid()) return { isOffDay: false, reason: null };

        const dayOfWeek = m.day(); // 0 = Sunday, 6 = Saturday
        const dayOfMonth = m.date(); // 1 to 31

        if (dayOfWeek === 0) {
            return { isOffDay: true, reason: "Sunday" };
        }

        // 2nd Saturday occurs between day 8 and day 14
        if (dayOfWeek === 6 && dayOfMonth >= 8 && dayOfMonth <= 14) {
            return { isOffDay: true, reason: "Second Saturday" };
        }

        return { isOffDay: false, reason: null };
    } catch (err) {
        return { isOffDay: false, reason: null };
    }
};

/**
 * Calculate Working Days and Off Days in a given date range
 * @param {string|Date} startDate 
 * @param {string|Date} endDate 
 * @returns {{ totalDays: number, workingDays: number, offDays: number }}
 */
export const calculateWorkingDaysInRange = (startDate, endDate) => {
    let curr = moment(startDate).startOf("day");
    const end = moment(endDate).startOf("day");
    let workingDays = 0;
    let offDays = 0;
    let totalDays = 0;

    while (curr.isSameOrBefore(end)) {
        totalDays++;
        const { isOffDay } = getOffDayInfo(curr.toDate());
        if (isOffDay) {
            offDays++;
        } else {
            workingDays++;
        }
        curr.add(1, "day");
    }

    return { totalDays, workingDays, offDays };
};

/**
 * Get date range for standard period filters
 * @param {string} periodType 'yesterday'|'today'|'this_week'|'month'|'quarter'|'half_year'|'year'|'custom'
 * @param {object} options custom params like { customStartDate, customEndDate, selectedMonth, selectedYear, financialYear }
 */
export const getPeriodDateRange = (periodType, options = {}) => {
    const today = moment();
    const todayStr = today.format("YYYY-MM-DD");

    switch (periodType?.toLowerCase()) {
        case "yesterday": {
            const yStr = moment().subtract(1, "day").format("YYYY-MM-DD");
            return { startDate: yStr, endDate: yStr, label: "Yesterday" };
        }
        case "today": {
            return { startDate: todayStr, endDate: todayStr, label: "Today" };
        }
        case "this_week": {
            const weekStart = moment().startOf("isoWeek").format("YYYY-MM-DD");
            const weekEnd = moment().endOf("isoWeek").format("YYYY-MM-DD");
            return { startDate: weekStart, endDate: weekEnd, label: "This Week" };
        }
        case "month": {
            const m = options.selectedYear && options.selectedMonth !== undefined
                ? moment().year(options.selectedYear).month(options.selectedMonth)
                : moment();
            const mStart = m.clone().startOf("month").format("YYYY-MM-DD");
            const mEnd = m.clone().endOf("month").format("YYYY-MM-DD");
            return { startDate: mStart, endDate: mEnd, label: m.format("MMMM YYYY") };
        }
        case "quarter": {
            const q = options.selectedQuarter || Math.ceil((moment().month() + 1) / 3);
            const yr = options.selectedYear || moment().year();
            const qStart = moment().year(yr).quarter(q).startOf("quarter").format("YYYY-MM-DD");
            const qEnd = moment().year(yr).quarter(q).endOf("quarter").format("YYYY-MM-DD");
            return { startDate: qStart, endDate: qEnd, label: `Q${q} ${yr}` };
        }
        case "half_year": {
            const yr = options.selectedYear || moment().year();
            const isH2 = (options.selectedHalf || (moment().month() >= 6 ? 2 : 1)) === 2;
            const hStart = isH2 ? `${yr}-07-01` : `${yr}-01-01`;
            const hEnd = isH2 ? `${yr}-12-31` : `${yr}-06-30`;
            return { startDate: hStart, endDate: hEnd, label: isH2 ? `H2 ${yr}` : `H1 ${yr}` };
        }
        case "year":
        case "financial_year": {
            let startYear = today.year();
            let endYear = today.year() + 1;
            
            if (options.financialYear) {
                const parts = options.financialYear.split("-");
                if (parts.length === 2) {
                    const y1 = parseInt(parts[0], 10);
                    startYear = y1 < 100 ? 2000 + y1 : y1;
                    endYear = startYear + 1;
                }
            } else if (today.month() < 3) {
                startYear = today.year() - 1;
                endYear = today.year();
            }

            return {
                startDate: `${startYear}-04-01`,
                endDate: `${endYear}-03-31`,
                label: `FY ${startYear}-${String(endYear).slice(-2)}`
            };
        }
        case "custom":
        default: {
            if (options.customStartDate && options.customEndDate) {
                return {
                    startDate: options.customStartDate,
                    endDate: options.customEndDate,
                    label: `${options.customStartDate} to ${options.customEndDate}`
                };
            }
            const mStart = moment().startOf("month").format("YYYY-MM-DD");
            const mEnd = moment().endOf("month").format("YYYY-MM-DD");
            return { startDate: mStart, endDate: mEnd, label: moment().format("MMMM YYYY") };
        }
    }
};

/**
 * Calculate Projections, Daily Averages and Target Achievements
 */
export const calculateInvoicingMetrics = ({
    mtdSales = 0,
    creditNotes = 0,
    netSales = 0,
    monthlyTarget = 0,
    projectionDaysSetting = 30,
    date = new Date()
}) => {
    const m = moment(date);
    const dayOfMonth = m.date();
    const totalDaysInMonth = m.daysInMonth();

    const monthStart = m.clone().startOf("month");
    const { workingDays: workingDaysElapsed } = calculateWorkingDaysInRange(monthStart.toDate(), m.toDate());

    const actualNetSales = netSales || (mtdSales - creditNotes);
    const divisor = Math.max(1, workingDaysElapsed > 0 ? workingDaysElapsed : dayOfMonth);
    const averageDailyBilling = actualNetSales / divisor;

    const effectiveProjectionDays = projectionDaysSetting && projectionDaysSetting > 0
        ? projectionDaysSetting
        : totalDaysInMonth;

    const projectedBilling = averageDailyBilling * effectiveProjectionDays;
    const targetAchievementPct = monthlyTarget > 0 ? (actualNetSales / monthlyTarget) * 100 : 0;
    const projectedAchievementPct = monthlyTarget > 0 ? (projectedBilling / monthlyTarget) * 100 : 0;

    return {
        netSales: Math.round(actualNetSales * 100) / 100,
        averageDailyBilling: Math.round(averageDailyBilling * 100) / 100,
        projectedBilling: Math.round(projectedBilling * 100) / 100,
        projectionDaysUsed: effectiveProjectionDays,
        targetAchievementPct: Math.round(targetAchievementPct * 10) / 10,
        projectedAchievementPct: Math.round(projectedAchievementPct * 10) / 10,
        workingDaysElapsed,
        dayOfMonth,
        totalDaysInMonth
    };
};

/**
 * Helper to compute YoY differences
 */
export const calculateYoY = (currentVal = 0, lastYearVal = 0) => {
    const diff = currentVal - lastYearVal;
    const growthPct = lastYearVal > 0 ? (diff / lastYearVal) * 100 : (currentVal > 0 ? 100 : 0);
    return {
        diff: Math.round(diff * 100) / 100,
        growthPct: Math.round(growthPct * 10) / 10
    };
};
