import { useEffect, useState } from "react";
import axios from "axios";

// Status ranks for sorting
const statusRank = {
  "Custom Clearance Completed": 1, // Sort by vessel_berthing
  "BE Noted, Clearance Pending": 2,
  "BE Noted, Arrival Pending": 3, // Sort by discharge_date
  "Gateway IGM Filed": 4, // Sort by be_date
  Discharged: 5, // Sort by detention_from
  "Estimated Time of Arrival": 6, // Sort by detention_from
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

        // Apply ranking logic based on `detailedStatus`
        if (detailedStatus === "all") {
          // Sort jobs by rank if 'all' status is selected
          jobList = jobList.sort((a, b) => {
            const rankA = statusRank[a.detailed_status] || 999;
            const rankB = statusRank[b.detailed_status] || 999;
            return rankA - rankB;
          });
        } else {
          // Custom sorting based on specific detailed status
          // jobList = jobList.sort((a, b) => {
          //   switch (detailedStatus) {
          //     case "Estimated Time of Arrival":
          //       return (
          //         new Date(a.vessel_berthing) - new Date(b.vessel_berthing)
          //       );
          //     case "Discharged":
          //       return new Date(a.discharge_date) - new Date(b.discharge_date);
          //     case "BE Noted, Arrival Pending":
          //       return new Date(a.be_date) - new Date(b.be_date);
          //     case "BE Noted, Clearance Pending":
          //     case "Custom Clearance Completed":
          //       return new Date(a.detention_from) - new Date(b.detention_from);
          //     default:
          //       return 0; // No sorting applied for unhandled statuses
          //   }
          // });
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
