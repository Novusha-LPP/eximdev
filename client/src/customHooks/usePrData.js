import { useState, useEffect } from "react";
import axios from "axios";

function usePrData() {
  const [organisations, setOrganisations] = useState([]);
  const [containerTypes, setContainerTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [truckTypes, setTruckTypes] = useState([]);

  useEffect(() => {
    async function fetchData() {
      // const res = await axios.get(
      //   `${process.env.REACT_APP_API_STRING}/get-organisations`
      // );
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/organisations/names`
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
        `${process.env.REACT_APP_API_STRING}/location-names`
      );
      setLocations(res.data);
    }

    const getTruckTypes = async () => {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/vehicle-types`
      );

      // Extract just the vehicleType field from each object
      const vehicleTypeArray = res.data.data.map((item) => item.vehicleType);

      // Now your truckTypes state is just an array of strings
      setTruckTypes(vehicleTypeArray);
    };

    fetchData();
    getContainerTypes();
    getLocationMasters();
    getTruckTypes();
  }, []);

  return { organisations, containerTypes, locations, truckTypes };
}

export default usePrData;
