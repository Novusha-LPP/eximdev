import {
    parse, isValid, isWithinInterval, getYear, getMonth, getQuarter, format,
    startOfMonth, endOfMonth, startOfWeek, endOfWeek
} from 'date-fns';

export const getApiUrl = () => {
    let apiUrl = process.env.REACT_APP_API_STRING || 'http://0.0.0.0:9006';
    if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
    return apiUrl;
};

export const getEndpoint = (path) => {
    const apiUrl = getApiUrl();
    // If apiUrl ends with /api, don't append it again
    return apiUrl.endsWith('/api')
        ? `${apiUrl}${path}`
        : `${apiUrl}/api${path}`;
};

export const TRANSPORT_BASE = 'https://eximbot.alvision.in/transport';
// export const TRANSPORT_BASE = 'http://0.0.0.0:9007';
export const TRANSPORT_API_KEY = '1234567890';
export const TRANSPORT_HEADERS = { 'x-api-key': TRANSPORT_API_KEY };

export const filterByTime = (items, filterType, dateRange, selectedMonth, selectedYear, selectedQuarter, selectedDay) => {
    return items.filter(item => {
        if (!item.be_date) return false;

        // Try parsing with multiple formats
        let date = parse(item.be_date, 'dd-MM-yyyy', new Date());

        if (!isValid(date)) {
            // Try ISO format
            date = parse(item.be_date, 'yyyy-MM-dd', new Date());
        }

        if (!isValid(date)) {
            // Fallback to standard JS date parser
            date = new Date(item.be_date);
        }

        if (!isValid(date)) return false;

        if (filterType === 'day') {
            if (!selectedDay) return true;
            const itemDateStr = format(date, 'yyyy-MM-dd');
            return itemDateStr === selectedDay;
        } else if (filterType === 'week') {
            if (!selectedDay) return true;
            const refDate = parse(selectedDay, 'yyyy-MM-dd', new Date());
            if (!isValid(refDate)) return true;
            const start = startOfWeek(refDate, { weekStartsOn: 1 });
            const end = endOfWeek(refDate, { weekStartsOn: 1 });
            return isWithinInterval(date, { start, end });
        } else if (filterType === 'date-range') {
            if (!dateRange.start || !dateRange.end) return true;
            const start = new Date(dateRange.start);
            const end = new Date(dateRange.end);
            // Set end date to end of day to include the full day
            end.setHours(23, 59, 59, 999);
            return isWithinInterval(date, { start, end });
        } else if (filterType === 'month') {
            // selectedMonth is 0-indexed
            return getMonth(date) === parseInt(selectedMonth) && getYear(date) === parseInt(selectedYear);
        } else if (filterType === 'quarter') {
            return getQuarter(date) === parseInt(selectedQuarter) && getYear(date) === parseInt(selectedYear);
        } else if (filterType === 'year') {
            return getYear(date) === parseInt(selectedYear);
        }
        // If preset is still set (like 'all'), show all
        return true;
    });
};

export const getTransportDates = (filterType, selectedDay, selectedYear, selectedMonth, selectedQuarter, dateRange) => {
    let sd = '', ed = '';
    if (filterType === 'day') {
        const dateObj = parse(selectedDay, 'yyyy-MM-dd', new Date());
        if (isValid(dateObj)) {
            sd = format(dateObj, 'yyyy-MM-dd');
            ed = format(dateObj, 'yyyy-MM-dd');
        } else {
            sd = format(new Date(), 'yyyy-MM-dd');
            ed = format(new Date(), 'yyyy-MM-dd');
        }
    } else if (filterType === 'week') {
        const dateObj = parse(selectedDay, 'yyyy-MM-dd', new Date());
        if (isValid(dateObj)) {
            sd = format(startOfWeek(dateObj, { weekStartsOn: 1 }), 'yyyy-MM-dd');
            ed = format(endOfWeek(dateObj, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        } else {
            sd = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
            ed = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        }
    } else if (filterType === 'month') {
        sd = format(new Date(selectedYear, selectedMonth, 1), 'yyyy-MM-dd');
        ed = format(endOfMonth(new Date(selectedYear, selectedMonth, 1)), 'yyyy-MM-dd');
    } else if (filterType === 'quarter') {
        const firstMonthOfQuarter = (selectedQuarter - 1) * 3;
        sd = format(new Date(selectedYear, firstMonthOfQuarter, 1), 'yyyy-MM-dd');
        ed = format(endOfMonth(new Date(selectedYear, firstMonthOfQuarter + 2, 1)), 'yyyy-MM-dd');
    } else if (filterType === 'year') {
        sd = format(new Date(selectedYear, 0, 1), 'yyyy-MM-dd');
        ed = format(new Date(selectedYear, 11, 31), 'yyyy-MM-dd');
    } else if (filterType === 'custom' || filterType === 'date-range') {
        sd = dateRange.start;
        ed = dateRange.end;
    }
    return { startDate: sd, endDate: ed };
};

export const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];
