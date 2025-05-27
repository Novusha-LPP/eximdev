import { useState, useEffect } from "react";
import axios from "axios";

function usePrData() {
  const [organisations, setOrganisations] = useState([]);
  const [containerTypes, setContainerTypes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [truckTypes, setTruckTypes] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/organisations`
        );

        // Map organisations to the correct format with organisation_name field
        const formattedOrganisations = res.data.data.map((org) => ({
          _id: org._id,
          organisation_name: org.name,
          ...org,
        }));

        setOrganisations(formattedOrganisations);
        console.log("✅ Organisations loaded:", formattedOrganisations);
      } catch (error) {
        console.error("❌ Error fetching organisations:", error);
      }
    }

    async function getContainerTypes() {
      try {
        const res = await axios(
          `${process.env.REACT_APP_API_STRING}/get-container-types`
        );
        setContainerTypes(res.data);
        console.log("✅ Container types loaded:", res.data);
      } catch (error) {
        console.error("❌ Error fetching container types:", error);
      }
    }

    async function getLocationMasters() {
      try {
        const res = await axios(
          `${process.env.REACT_APP_API_STRING}/get-location`
        );

        // Map locations to the correct format with location_name field
        const formattedLocations = res.data.map((location) => ({
          _id: location._id,
          location_name: location.name,
          ...location,
        }));

        setLocations(formattedLocations);
        console.log("✅ Locations loaded:", formattedLocations);
      } catch (error) {
        console.error("❌ Error fetching locations:", error);
      }
    }

    const getTruckTypes = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/vehicle-types`
        );

        // Keep the full objects instead of just extracting vehicleType strings
        setTruckTypes(res.data.data);
        console.log("✅ Vehicle types loaded:", res.data.data);
      } catch (error) {
        console.error("❌ Error fetching vehicle types:", error);
      }
    };

    fetchData();
    getContainerTypes();
    getLocationMasters();
    getTruckTypes();
  }, []);

  return { organisations, containerTypes, locations, truckTypes };
}

export default usePrData;
