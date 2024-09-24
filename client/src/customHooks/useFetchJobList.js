import { useEffect, useState } from "react";
import axios from "axios";

// Status ranks for sorting
const statusRank = {
  "Estimated Time of Arrival": 1,
  "Gateway IGM Filed": 2,
  Discharged: 3,
  "BE Noted, Arrival Pending": 4,
  "BE Noted, Clearance Pending": 5,
  "Custom Clearance Completed": 6,
};

function useFetchJobList(detailedStatus, selectedYear, status) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function getData() {
      setRows([]);

      if (selectedYear) {
        const res = await axios(
          `${
            process.env.REACT_APP_API_STRING
          }/${selectedYear}/jobs/${status}/${detailedStatus
            .toLowerCase()
            .replace(/ /g, "_")
            .replace(/,/g, "")}`
        );

        let jobList = res.data.data;

        // Apply ranking logic only when `detailedStatus` is 'all'
        if (detailedStatus === "all") {
          jobList = jobList.sort((a, b) => {
            const rankA = statusRank[a.detailed_status] || 999;
            const rankB = statusRank[b.detailed_status] || 999;
            return rankA - rankB;
          });
        }

        setRows(jobList);
        setTotal(res.data.total);
      }
    }

    getData();
  }, [detailedStatus, selectedYear, status]);

  return { rows, total };
}

export default useFetchJobList;
