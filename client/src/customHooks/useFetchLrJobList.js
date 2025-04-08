import { useEffect, useState } from "react";
import axios from "axios";

function useFetchLrJobList(
  detailedStatus,
  selectedYearState,
  status,
  searchQuery,
  selectedImporter
) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchJobs = async (page) => {
    setLoading(true);
    try {
      // Properly encode importer
      const formattedImporter =
        selectedImporter && selectedImporter.toLowerCase() !== "select importer"
          ? encodeURIComponent(selectedImporter) // Encodes special characters
          : "all"; // Default to "all" if not selected

      // Properly encode search query
      const formattedSearchQuery = searchQuery
        ? encodeURIComponent(searchQuery)
        : "";

      console.log(selectedYearState);

      // Construct API URL
      const apiUrl = `${process.env.REACT_APP_API_STRING}/lr-job-list?status=${status}&page=${page}&limit=100`;

      const response = await axios.get(apiUrl);

      const { data, total, totalPages, currentPage } = response.data;

      // Ensure sr_cel_id is safely accessed
      const processedData = data.map((item) => ({
        ...item,
        container_details: {
          ...item.container_details,
          tr_no: item.container_details?.tr_no || "N/A",
          container_number: item.container_details?.container_number || "N/A",
          seal_no: item.container_details?.seal_no || "N/A",
          gross_weight: item.container_details?.gross_weight || 0,
          tare_weight: item.container_details?.tare_weight || 0,
          net_weight: item.container_details?.net_weight || 0,
          goods_pickup: item.container_details?.goods_pickup || "N/A",
          goods_delivery: item.container_details?.goods_delivery || "N/A",
          own_hired: item.container_details?.own_hired || "N/A",
          type_of_vehicle: item.container_details?.type_of_vehicle || "N/A",
          vehicle_no: item.container_details?.vehicle_no || "N/A",
          driver_name: item.container_details?.driver_name || "N/A",
          driver_phone: item.container_details?.driver_phone || "N/A",
          eWay_bill: item.container_details?.eWay_bill || "N/A",
          isOccupied: item.container_details?.isOccupied || false,
          sr_cel_no: item.container_details?.sr_cel_no || "N/A",
          sr_cel_FGUID: item.container_details?.sr_cel_FGUID || "N/A",
          sr_cel_id: item.container_details?.sr_cel_id || "N/A",
          elock: item.container_details?.elock || "N/A",
          status: item.container_details?.status || "N/A",
          lr_completed: item.container_details?.lr_completed || false,
        },
      }));

      setRows(processedData);
      setTotal(total);
      setTotalPages(totalPages);
      setCurrentPage(currentPage);
    } catch (error) {
      console.error("Error fetching job list:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedYearState) {
      fetchJobs(currentPage);
    }
  }, [
    detailedStatus,
    selectedYearState,
    status,
    currentPage,
    searchQuery,
    selectedImporter,
  ]);

  const handlePageChange = (newPage) => setCurrentPage(newPage);

  return {
    rows,
    total,
    totalPages,
    currentPage,
    loading,
    handlePageChange,
    fetchJobs,
  };
}

export default useFetchLrJobList;
