import { useEffect, useState } from "react";
import axios from "axios";

function useTruckNumber() {
  const [truckNo, setTruckNo] = useState([]);

  useEffect(() => {
    async function getTruckNumber() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-vehicles`
      );
      setTruckNo(res.data.map((item) => item.truck_no));
    }

    getTruckNumber();
  }, []);

  return { truckNo, setTruckNo };
}

export default useTruckNumber;
