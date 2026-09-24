import { useState, useEffect, useMemo } from "react";
import axios from "axios";

/**
 * Custom hook to fetch unique shipping lines for the given year (or all years)
 * and provide formatted options for MUI Autocomplete.
 *
 * @param {string} year - Financial year (e.g. "24-25", "25-26", or "all")
 * @returns {{ shippingLines: Array, shippingLineNames: Array, loading: boolean }}
 */
const useShippingLines = (year) => {
  const [shippingLines, setShippingLines] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchShippingLines = async () => {
      setLoading(true);
      try {
        const yearParam = year ? year.trim() : "all";
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-shipping-lines/${yearParam}`
        );
        if (isMounted && Array.isArray(res.data)) {
          setShippingLines(res.data);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Error fetching shipping lines:", error);
          setShippingLines([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchShippingLines();

    return () => {
      isMounted = false;
    };
  }, [year]);

  const shippingLineNames = useMemo(() => {
    if (!Array.isArray(shippingLines)) return [];
    const seen = new Set();
    const result = [];
    shippingLines.forEach((item, index) => {
      const name = item?.shipping_line_airline?.trim();
      if (name && !seen.has(name.toUpperCase())) {
        seen.add(name.toUpperCase());
        result.push({
          label: name,
          key: `${name}-${index}`,
        });
      }
    });
    return result;
  }, [shippingLines]);

  return { shippingLines, shippingLineNames, loading };
};

export default useShippingLines;
