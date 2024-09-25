import { useEffect, useState } from "react";
import axios from "axios";

// Status ranks and their respective sorting fields
const statusRank = {
  "Custom Clearance Completed": { rank: 1, field: "detention_from" },
  "BE Noted, Clearance Pending": { rank: 2, field: "detention_from" },
  "BE Noted, Arrival Pending": { rank: 3, field: "be_date" },
  "Gateway IGM Filed": { rank: 4, field: "gateway_igm_date" },
  Discharged: { rank: 5, field: "discharge_date" },
  "Estimated Time of Arrival": { rank: 6, field: "vessel_berthing" },
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

          // Function to sort jobs by a specific field (dates)
          const customSort = (a, b, field) => {
            const dateA = new Date(a[field]);
            const dateB = new Date(b[field]);
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
