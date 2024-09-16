import { useState, useEffect } from "react";
import axios from "axios";

function usePrData() {
  const [organisations, setOrganisations] = useState([]);
  const [containerTypes, setContainerTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [truckTypes, setTruckTypes] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-organisations`
      );

      setOrganisations(res.data);
    }

    async function getContainerTypes() {
      const res = await axios(
        `${process.env.REACT_APP_API_STRING}/get-container-types`
      );
      setContainerTypes(res.data);
    }

    async function getLocationMasters() {
      const res = await axios(
        `${process.env.REACT_APP_API_STRING}/get-locations`
      );
      setLocations(res.data);
    }

    const getTruckTypes = async () => {
      const res = await axios(
        `${process.env.REACT_APP_API_STRING}/get-type-of-vehicles`
      );
      setTruckTypes(res.data);
    };

    fetchData();
    getContainerTypes();
    getLocationMasters();
    getTruckTypes();
  }, []);

  return { organisations, containerTypes, locations, truckTypes };
}

export default usePrData;
