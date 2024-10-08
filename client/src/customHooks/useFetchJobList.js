import { useEffect, useState } from "react";
import axios from "axios";

// Status ranks and their respective sorting fields
const statusRank = {
  "Custom Clearance Completed": { rank: 1, field: "detention_from" },
  "PCV Done, Duty Payment Pending": { rank: 2, field: "detention_from" },
  "BE Noted, Clearance Pending": { rank: 3, field: "detention_from" },
  "BE Noted, Arrival Pending": { rank: 4, field: "be_date" },
  "Gateway IGM Filed": { rank: 5, field: "gateway_igm_date" },
  Discharged: { rank: 6, field: "discharge_date" },
  "Estimated Time of Arrival": { rank: 7, field: "vessel_berthing" },
};

function useFetchJobList(detailedStatus, selectedYear, status) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function getData() {
      setRows([]);

      if (selectedYear) {
        try {
          const res = await axios.get(
            `${
              process.env.REACT_APP_API_STRING
            }/${selectedYear}/jobs/${status}/${detailedStatus
              .toLowerCase()
              .replace(/ /g, "_")
              .replace(/,/g, "")}`
          );

          let jobList = res.data.data;

          // Function to extract the earliest detention_from from the container_nos array
          const getEarliestDetentionFrom = (containerNos) => {
            const detentionDates = containerNos
              .map((container) => container.detention_from)
              .filter(Boolean) // Exclude null or empty detention_from
              .map((date) => new Date(date));
            return detentionDates.length > 0
              ? new Date(Math.min(...detentionDates))
              : new Date("9999-12-31"); // Fallback to a future date if no valid dates
          };

          // Function to sort jobs by a specific field (dates)
          const customSort = (a, b, field) => {
            let dateA, dateB;

            if (field === "detention_from") {
              // Special handling for detention_from to get the earliest date from container_nos
              dateA = getEarliestDetentionFrom(a.container_nos);
              dateB = getEarliestDetentionFrom(b.container_nos);
            } else {
              dateA = new Date(a[field]);
              dateB = new Date(b[field]);
            }

            return dateA - dateB;
          };

          // Apply sorting logic for 'all' status
          if (detailedStatus === "all") {
            jobList = jobList.sort((a, b) => {
              // First, sort by the rank of the status
              const rankA = statusRank[a.detailed_status]?.rank || 999;
              const rankB = statusRank[b.detailed_status]?.rank || 999;

              if (rankA === rankB) {
                // If ranks are the same, sort by the field corresponding to the status
                const field = statusRank[a.detailed_status]?.field;
                return field ? customSort(a, b, field) : 0;
              }

              return rankA - rankB;
            });
          } else {
            // For a specific detailed status, sort by the corresponding field
            const field = statusRank[detailedStatus]?.field;
            jobList = field
              ? jobList.sort((a, b) => customSort(a, b, field))
              : jobList;
          }

          setRows(jobList);
          setTotal(res.data.total);
        } catch (error) {
          console.error("Error fetching job list:", error);
        }
      }
    }

    getData();
  }, [detailedStatus, selectedYear, status]);

  return { rows, total };
}

export default useFetchJobList;
