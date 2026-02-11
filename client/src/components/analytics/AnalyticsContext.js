import React, { createContext, useState, useContext } from 'react';

const AnalyticsContext = createContext();

export const useAnalytics = () => useContext(AnalyticsContext);

export const AnalyticsProvider = ({ children }) => {
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [dateRangeLabel, setDateRangeLabel] = useState('Today');

    const [importer, setImporter] = useState('');

    const setRange = (label, start, end) => {
        setDateRangeLabel(label);
        setStartDate(start);
        setEndDate(end);
    };

    return (
        <AnalyticsContext.Provider value={{ startDate, endDate, dateRangeLabel, setRange, importer, setImporter }}>
            {children}
        </AnalyticsContext.Provider>
    );
};
