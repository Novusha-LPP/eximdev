import { useState, useEffect } from 'react';
import axios from 'axios';

export const useFetchYears = (initialYearPair) => {
    const [years, setYears] = useState([]);
    const [selectedYear, setSelectedYear] = useState(initialYearPair || "");

    useEffect(() => {
        async function getYears() {
            try {
                const apiBase = process.env.REACT_APP_API_STRING || "";
                const res = await axios.get(`${apiBase}/get-years`);
                const filteredYears = res.data.filter((year) => year !== null);

                let formattedYears = filteredYears.map(y => ({ value: y, label: y }));

                // If we don't have years from API, fallback to current year
                if (formattedYears.length === 0) {
                    const currentYear = new Date().getFullYear();
                    const currentMonth = new Date().getMonth() + 1;
                    const prevTwoDigits = String((currentYear - 1) % 100).padStart(2, "0");
                    const currentTwoDigits = String(currentYear).slice(-2);
                    const nextTwoDigits = String((currentYear + 1) % 100).padStart(2, "0");

                    let defaultYearPair =
                        currentMonth >= 4
                            ? `${currentTwoDigits}-${nextTwoDigits}`
                            : `${prevTwoDigits}-${currentTwoDigits}`;

                    formattedYears = [{ value: defaultYearPair, label: defaultYearPair }];
                }

                setYears(formattedYears);

                // Auto-select a year if not already selected
                if (!selectedYear && formattedYears.length > 0) {
                    // Check if initialYearPair exists in the fetched years
                    const initialExists = initialYearPair && formattedYears.some(y => y.value === initialYearPair);

                    if (!initialExists) {
                        const currentYear = new Date().getFullYear();
                        const currentMonth = new Date().getMonth() + 1;
                        const prevTwoDigits = String((currentYear - 1) % 100).padStart(2, "0");
                        const currentTwoDigits = String(currentYear).slice(-2);
                        const nextTwoDigits = String((currentYear + 1) % 100).padStart(2, "0");

                        let defaultYearPair =
                            currentMonth >= 4
                                ? `${currentTwoDigits}-${nextTwoDigits}`
                                : `${prevTwoDigits}-${currentTwoDigits}`;

                        const defaultExists = formattedYears.some(y => y.value === defaultYearPair);
                        setSelectedYear(defaultExists ? defaultYearPair : formattedYears[0].value);
                    }
                }
            } catch (error) {
                console.error("Error fetching years:", error);
            }
        }
        getYears();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { years, selectedYear, setSelectedYear };
};
