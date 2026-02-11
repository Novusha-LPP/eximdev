import { useEffect, useState } from "react";
import axios from "axios";

function usePendingList(detailedStatus, selectedYear) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function getData() {
      setRows([]);

      if (selectedYear) {
        const res = await axios(
          `${
            process.env.REACT_APP_API_STRING
          }/pending-jobs/${selectedYear}/${detailedStatus
            .toLowerCase()
            .replace(/ /g, "_")
            .replace(/,/g, "")}`
        );

        setRows(res.data.data);
        setTotal(res.data.total);
      }
    }

    getData();
  }, [detailedStatus, selectedYear]);

  return { rows, total };
}

export default usePendingList;
