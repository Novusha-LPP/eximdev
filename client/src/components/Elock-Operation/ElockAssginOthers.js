import React, { useEffect, useState, useCallback } from "react";
import { MaterialReactTable } from "material-react-table";
import {
  Box,
  Button,
  TextField,
  Autocomplete,
  MenuItem,
  IconButton,
  Typography,
  InputAdornment,
  Pagination,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  Place as PlaceIcon,
  LockOpen as LockOpenIcon,
} from "@mui/icons-material";
import axios from "axios";
import ElockGPSOperation from "./ElockGPSOperation";

const statusOptions = ["ASSIGNED", "UNASSIGNED", "RETURNED"];

const ElockAssignOthers = () => {
  const [data, setData] = useState([]);
  const [elockOptions, setElockOptions] = useState([]);
  const [organisationOptions, setOrganisationOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [isInlineCreating, setIsInlineCreating] = useState(false);

  // Validation functions
  // ISO 6346 Container Number Validation with Check Digit
  const isValidContainerNumber = (value) => {
    if (!value) return false;

    const containerNumber = value.toUpperCase();
    const containerNumberRegex = /^[A-Z]{3}[UJZ][A-Z0-9]{6}\d$/;

    if (!containerNumberRegex.test(containerNumber)) {
      return false;
    }

    // Validate check digit
    const checkDigit = calculateCheckDigit(containerNumber.slice(0, 10));
    const lastDigit = parseInt(containerNumber[10], 10);

    return checkDigit === lastDigit;
  };

  // Helper function for check digit calculation
  const calculateCheckDigit = (containerNumber) => {
    if (containerNumber.length !== 10) return null;

    const weightingFactors = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
    let total = 0;

    for (let i = 0; i < containerNumber.length; i++) {
      total += equivalentValue(containerNumber[i]) * weightingFactors[i];
    }

    const subTotal = Math.floor(total / 11);
    return total - subTotal * 11;
  };

  // Helper function for character equivalences
  const equivalentValue = (char) => {
    const equivalences = {
      A: 10,
      B: 12,
      C: 13,
      D: 14,
      E: 15,
      F: 16,
      G: 17,
      H: 18,
      I: 19,
      J: 20,
      K: 21,
      L: 23,
      M: 24,
      N: 25,
      O: 26,
      P: 27,
      Q: 28,
      R: 29,
      S: 30,
      T: 31,
      U: 32,
      V: 34,
      W: 35,
      X: 36,
      Y: 37,
      Z: 38,
      1: 1,
      2: 2,
      3: 3,
      4: 4,
      5: 5,
      6: 6,
      7: 7,
      8: 8,
      9: 9,
      0: 0,
    };
    return equivalences[char] || 0;
  };

  // Vehicle number validation regex
  const vehicleNoRegex = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/i;

  // Indian mobile number validation regex
  const indianMobileRegex = /^[6-9]\d{9}$/;
  const [editValues, setEditValues] = useState({
    consignor: "",
    consignee: "",
    tr_no: "",
    container_number: "",
    vehicle_no: "",
    driver_name: "",
    driver_phone: "",
    elock_no: "",
    elock_assign_status: "UNASSIGNED",
    goods_pickup: "",
    goods_delivery: "",
  });
  const [inlineCreateValues, setInlineCreateValues] = useState({
    consignor: "",
    consignee: "",
    tr_no: "",
    container_number: "",
    vehicle_no: "",
    driver_name: "",
    driver_phone: "",
    elock_no: "",
    elock_assign_status: "UNASSIGNED",
    goods_pickup: "",
    goods_delivery: "",
  });
  const [isGPSModalOpen, setIsGPSModalOpen] = useState(false);
  const [selectedElockNo, setSelectedElockNo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(false);

  // Constants for external API
  const TOKEN_ID = "e36d2589-9dc3-4302-be7d-dc239af1846c";
  const ADMIN_API_URL = "http://icloud.assetscontrols.com:8092/OpenApi/Admin";
  const INSTRUCTION_API_URL =
    "http://icloud.assetscontrols.com:8092/OpenApi/Instruction";

  // Fetch main data
  const fetchElockAssignOthersData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/elock/assign-others`,
        {
          params: {
            page,
            limit: 100,
            search: debouncedSearchQuery,
          },
        }
      );
      setData(res.data.jobs || []);
      setTotalJobs(res.data.totalJobs || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error("Error fetching Elock Assign Others data:", err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearchQuery]);

  // Fetch available elocks
  const fetchAvailableElocks = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/available-elocks`
      );
      const elocks = res.data?.data || res.data?.elocks || res.data || [];
      setElockOptions(Array.isArray(elocks) ? elocks : []);
    } catch (err) {
      console.error("Error fetching available elocks:", err);
      setElockOptions([]);
    }
  }, []);

  // Fetch organisations
  const fetchOrganisations = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/organisations`
      );
      const orgs = res.data?.data || res.data?.organisations || res.data || [];
      setOrganisationOptions(Array.isArray(orgs) ? orgs : []);
    } catch (err) {
      console.error("Error fetching organisations:", err);
      setOrganisationOptions([]);
    }
  }, []);

  // Fetch locations
  const fetchLocations = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-location`
      );
      const locations = res.data?.data || res.data?.locations || res.data || [];
      setLocationOptions(Array.isArray(locations) ? locations : []);
    } catch (err) {
      console.error("Error fetching locations:", err);
      setLocationOptions([]);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1);
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchQuery]);

  // Initial data fetch
  useEffect(() => {
    fetchElockAssignOthersData();
  }, [debouncedSearchQuery, page, fetchElockAssignOthersData]);

  // Fetch dropdown data on mount
  useEffect(() => {
    fetchAvailableElocks();
    fetchOrganisations();
    fetchLocations();
  }, [fetchAvailableElocks, fetchOrganisations, fetchLocations]);
  // Function to format user-friendly error messages
  const formatErrorMessage = (error) => {
    if (error.response?.data?.message) {
      const message = error.response.data.message;

      // Handle validation errors
      if (message.includes("validation failed")) {
        let errorMessages = [];

        if (message.includes("consignor") && message.includes("required")) {
          errorMessages.push("Consignor is required");
        }
        if (message.includes("consignee") && message.includes("required")) {
          errorMessages.push("Consignee is required");
        }
        if (
          message.includes("goods_pickup") &&
          message.includes("Cast to ObjectId failed")
        ) {
          errorMessages.push("Please select a valid pickup location");
        }
        if (
          message.includes("goods_delivery") &&
          message.includes("Cast to ObjectId failed")
        ) {
          errorMessages.push("Please select a valid delivery location");
        }
        if (
          message.includes("elock_no") &&
          message.includes("Cast to ObjectId failed")
        ) {
          errorMessages.push("Please select a valid e-lock");
        }
        if (message.includes("container_number")) {
          errorMessages.push("Container number format is invalid");
        }
        if (message.includes("vehicle_no")) {
          errorMessages.push("Vehicle number format is invalid");
        }
        if (message.includes("driver_phone")) {
          errorMessages.push(
            "Driver phone number must be 10 digits starting with 6-9"
          );
        }

        return errorMessages.length > 0
          ? errorMessages.join("\n• ")
          : "Please check all required fields and try again";
      }

      // Handle duplicate key errors
      if (message.includes("duplicate key") || message.includes("E11000")) {
        if (message.includes("tr_no")) {
          return "This TR number already exists";
        }
        if (message.includes("container_number")) {
          return "This container number already exists";
        }
        if (message.includes("vehicle_no")) {
          return "This vehicle number is already assigned";
        }
        return "Record with this information already exists";
      }
    }

    return (
      error.response?.data?.error ||
      error.message ||
      "An unexpected error occurred"
    );
  };

  // Function to clean data before sending to backend
  const cleanDataForSubmission = (data) => {
    const cleanedData = { ...data };

    // Convert empty strings to null for ObjectId fields
    if (!cleanedData.goods_pickup || cleanedData.goods_pickup.trim() === "") {
      cleanedData.goods_pickup = null;
    }
    if (
      !cleanedData.goods_delivery ||
      cleanedData.goods_delivery.trim() === ""
    ) {
      cleanedData.goods_delivery = null;
    }
    if (!cleanedData.elock_no || cleanedData.elock_no.trim() === "") {
      cleanedData.elock_no = null;
    }
    if (!cleanedData.consignor || cleanedData.consignor.trim() === "") {
      delete cleanedData.consignor; // Will trigger required validation
    }
    if (!cleanedData.consignee || cleanedData.consignee.trim() === "") {
      delete cleanedData.consignee; // Will trigger required validation
    }

    return cleanedData;
  };
  // Client-side validation based on schema
  const validateData = (data) => {
    const errors = [];

    // Required fields validation
    if (!data.consignor || data.consignor.trim() === "") {
      errors.push("Consignor is required");
    }
    if (!data.consignee || data.consignee.trim() === "") {
      errors.push("Consignee is required");
    }

    // // Container number validation
    // if (data.container_number && !isValidContainerNumber(data.container_number)) {
    //   errors.push('Container number format is invalid (Format: ABCD1234567)');
    // }

    // Vehicle number validation
    if (data.vehicle_no && !vehicleNoRegex.test(data.vehicle_no)) {
      errors.push("Vehicle number format is invalid (Format: AA00AA0000)");
    }

    // Driver phone validation
    if (data.driver_phone && !indianMobileRegex.test(data.driver_phone)) {
      errors.push("Driver phone must be 10 digits starting with 6-9");
    }

    // Driver name validation (only alphabetic characters)
    if (data.driver_name && !/^[a-zA-Z\s]*$/.test(data.driver_name)) {
      errors.push("Driver name should contain only letters and spaces");
    }

    return errors;
  };
  // Function to check for missing optional fields and confirm with user
  const confirmMissingOptionalFields = (data) => {
    const missingFields = [];

    // Check all optional fields
    if (!data.tr_no || data.tr_no.trim() === "") {
      missingFields.push("LR Number");
    }
    if (!data.container_number || data.container_number.trim() === "") {
      missingFields.push("Container Number");
    }
    if (!data.vehicle_no || data.vehicle_no.trim() === "") {
      missingFields.push("Vehicle Number");
    }
    if (!data.driver_name || data.driver_name.trim() === "") {
      missingFields.push("Driver Name");
    }
    if (!data.driver_phone || data.driver_phone.trim() === "") {
      missingFields.push("Driver Phone");
    }
    if (!data.goods_pickup || data.goods_pickup.trim() === "") {
      missingFields.push("Pickup Location");
    }
    if (!data.goods_delivery || data.goods_delivery.trim() === "") {
      missingFields.push("Delivery Location");
    }
    if (!data.elock_no || data.elock_no.trim() === "") {
      missingFields.push("E-lock Number");
    }

    if (missingFields.length > 0) {
      const message = `The following optional fields are empty:\n• ${missingFields.join(
        "\n• "
      )}\n\nDo you want to continue saving without these fields?\n\nClick "OK" to save anyway, or "Cancel" to go back and fill these fields.`;
      return window.confirm(message);
    }

    return true; // No missing fields, proceed
  };
  // Save edited row
  const handleSaveRow = async (row) => {
    try {
      setLoading(true);

      // Client-side validation
      const validationErrors = validateData(editValues);
      if (validationErrors.length > 0) {
        alert(
          "Please fix the following errors:\n• " + validationErrors.join("\n• ")
        );
        return;
      }

      // Check for missing optional fields and get user confirmation
      const shouldContinue = confirmMissingOptionalFields(editValues);
      if (!shouldContinue) {
        return; // User chose to go back and fill the fields
      }

      let finalEditValues = { ...editValues };

      // Handle elock assignment logic
      if (!editValues.elock_no || editValues.elock_no.trim() === "") {
        finalEditValues.elock_assign_status = "UNASSIGNED";
      } else if (editValues.elock_assign_status === "UNASSIGNED") {
        finalEditValues.elock_no = null;
      }

      // Clean data before submission
      const cleanedData = cleanDataForSubmission(finalEditValues);

      await axios.put(
        `${process.env.REACT_APP_API_STRING}/elock/assign-others/${row.original._id}`,
        cleanedData
      );
      setEditingRow(null);
      fetchElockAssignOthersData();
      fetchAvailableElocks();
    } catch (error) {
      console.error("Error updating record:", error);
      const userFriendlyMessage = formatErrorMessage(error);
      alert(`Failed to update record:\n\n${userFriendlyMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Inline create functions
  const handleStartInlineCreate = () => {
    setIsInlineCreating(true);
    setInlineCreateValues({
      consignor: "",
      consignee: "",
      tr_no: "",
      container_number: "",
      vehicle_no: "",
      driver_name: "",
      driver_phone: "",
      elock_no: "",
      elock_assign_status: "UNASSIGNED",
      goods_pickup: "",
      goods_delivery: "",
    });
  };
  const handleSaveInlineCreate = async () => {
    try {
      setLoading(true);

      // Client-side validation
      const validationErrors = validateData(inlineCreateValues);
      if (validationErrors.length > 0) {
        alert(
          "Please fix the following errors:\n• " + validationErrors.join("\n• ")
        );
        return;
      }

      // Check for missing optional fields and get user confirmation
      const shouldContinue = confirmMissingOptionalFields(inlineCreateValues);
      if (!shouldContinue) {
        return; // User chose to go back and fill the fields
      }

      // Clean data before submission
      const cleanedData = cleanDataForSubmission(inlineCreateValues);

      await axios.post(
        `${process.env.REACT_APP_API_STRING}/elock/assign-others`,
        cleanedData
      );
      setIsInlineCreating(false);
      setInlineCreateValues({
        consignor: "",
        consignee: "",
        tr_no: "",
        container_number: "",
        vehicle_no: "",
        driver_name: "",
        driver_phone: "",
        elock_no: "",
        elock_assign_status: "UNASSIGNED",
        goods_pickup: "",
        goods_delivery: "",
      });
      fetchElockAssignOthersData();
      fetchAvailableElocks();
    } catch (error) {
      console.error("Error creating record:", error);
      const userFriendlyMessage = formatErrorMessage(error);
      alert(`Failed to create record:\n\n${userFriendlyMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInlineCreate = () => {
    setIsInlineCreating(false);
    setInlineCreateValues({
      consignor: "",
      consignee: "",
      tr_no: "",
      container_number: "",
      vehicle_no: "",
      driver_name: "",
      driver_phone: "",
      elock_no: "",
      elock_assign_status: "UNASSIGNED",
      goods_pickup: "",
      goods_delivery: "",
    });
  };

  // Delete record
  const handleDeleteRow = async (row) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        setLoading(true);
        await axios.delete(
          `${process.env.REACT_APP_API_STRING}/elock/assign-others/${row.original._id}`
        );
        fetchElockAssignOthersData();
        fetchAvailableElocks();
      } catch (error) {
        console.error("Error deleting record:", error);
        alert(`Error: ${error.response?.data?.error || error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEditRow = (row) => {
    setEditingRow(row.id);
    const elockNo = row.original.elock_no?._id || "";
    setEditValues({
      consignor: row.original.consignor?._id || "",
      consignee: row.original.consignee?._id || "",
      tr_no: row.original.tr_no || "",
      container_number: row.original.container_number || "",
      vehicle_no: row.original.vehicle_no || "",
      driver_name: row.original.driver_name || "",
      driver_phone: row.original.driver_phone || "",
      elock_no: elockNo,
      elock_assign_status:
        !elockNo || elockNo.trim() === ""
          ? "UNASSIGNED"
          : row.original.elock_assign_status || "UNASSIGNED",
      goods_pickup: row.original.goods_pickup?._id || "",
      goods_delivery: row.original.goods_delivery?._id || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
  };

  const handleSearchInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  // Handle unlock operation
  const handleUnlockElock = async (elockNo) => {
    if (!elockNo || elockNo.trim() === "") {
      alert("No E-lock number available for unlock operation");
      return;
    }

    const confirmUnlock = window.confirm(
      `Are you sure you want to unlock E-lock: ${elockNo}?`
    );

    if (!confirmUnlock) return;

    try {
      const assetResponse = await fetch(ADMIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          FAction: "QueryAdminAssetByAssetId",
          FTokenID: TOKEN_ID,
          FAssetID: elockNo,
        }),
      });

      if (!assetResponse.ok) {
        throw new Error(
          `Failed to fetch asset data: ${assetResponse.statusText}`
        );
      }

      const assetResult = await assetResponse.json();
      if (!assetResult.FObject?.length) {
        throw new Error("Asset not found in external system");
      }

      const assetData = assetResult.FObject[0];

      const unlockResponse = await fetch(INSTRUCTION_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          FTokenID: TOKEN_ID,
          FAction: "OpenLockControl",
          FAssetGUID: assetData.FGUID,
        }),
      });

      if (!unlockResponse.ok) {
        throw new Error(`Unlock request failed: ${unlockResponse.statusText}`);
      }

      const unlockResult = await unlockResponse.json();

      if (unlockResult.Result === 200) {
        alert("Unlock instruction sent successfully!");
      } else {
        alert(
          `Failed to send unlock instruction: ${
            unlockResult.Message || "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("Error during unlock operation:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const columns = [
    {
      accessorKey: "tr_no",
      header: "LR No",
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          return (
            <TextField
              variant="standard"
              size="small"
              value={inlineCreateValues.tr_no}
              onChange={(e) =>
                setInlineCreateValues({
                  ...inlineCreateValues,
                  tr_no: e.target.value,
                })
              }
              sx={{ width: 120 }}
              placeholder="Enter TR No"
            />
          );
        }

        if (editingRow === row.id) {
          return (
            <TextField
              variant="standard"
              size="small"
              value={editValues.tr_no}
              onChange={(e) =>
                setEditValues({ ...editValues, tr_no: e.target.value })
              }
              sx={{ width: 120 }}
            />
          );
        }
        return row.original.tr_no;
      },
    },
    {
      accessorKey: "consignor",
      header: "Consignor",
      size: 200,
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          return (
            <Autocomplete
              options={
                Array.isArray(organisationOptions) ? organisationOptions : []
              }
              getOptionLabel={(option) => option.name || ""}
              value={
                Array.isArray(organisationOptions)
                  ? organisationOptions.find(
                      (opt) => opt._id === inlineCreateValues.consignor
                    ) || null
                  : null
              }
              onChange={(_, newValue) =>
                setInlineCreateValues({
                  ...inlineCreateValues,
                  consignor: newValue ? newValue._id : "",
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="standard"
                  size="small"
                  placeholder="Select Consignor *"
                />
              )}
              sx={{ width: 200 }}
            />
          );
        }

        if (editingRow === row.id) {
          return (
            <Autocomplete
              options={
                Array.isArray(organisationOptions) ? organisationOptions : []
              }
              getOptionLabel={(option) => option.name || ""}
              value={
                Array.isArray(organisationOptions)
                  ? organisationOptions.find(
                      (opt) => opt._id === editValues.consignor
                    ) || null
                  : null
              }
              onChange={(_, newValue) =>
                setEditValues({
                  ...editValues,
                  consignor: newValue ? newValue._id : "",
                })
              }
              renderInput={(params) => (
                <TextField {...params} variant="standard" size="small" />
              )}
              sx={{ width: 200 }}
            />
          );
        }
        return row.original.consignor?.name || "";
      },
    },
    {
      accessorKey: "consignee",
      header: "Consignee",
      size: 200,
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          return (
            <Autocomplete
              options={
                Array.isArray(organisationOptions) ? organisationOptions : []
              }
              getOptionLabel={(option) => option.name || ""}
              value={
                Array.isArray(organisationOptions)
                  ? organisationOptions.find(
                      (opt) => opt._id === inlineCreateValues.consignee
                    ) || null
                  : null
              }
              onChange={(_, newValue) =>
                setInlineCreateValues({
                  ...inlineCreateValues,
                  consignee: newValue ? newValue._id : "",
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="standard"
                  size="small"
                  placeholder="Select Consignee *"
                />
              )}
              sx={{ width: 200 }}
            />
          );
        }

        if (editingRow === row.id) {
          return (
            <Autocomplete
              options={
                Array.isArray(organisationOptions) ? organisationOptions : []
              }
              getOptionLabel={(option) => option.name || ""}
              value={
                Array.isArray(organisationOptions)
                  ? organisationOptions.find(
                      (opt) => opt._id === editValues.consignee
                    ) || null
                  : null
              }
              onChange={(_, newValue) =>
                setEditValues({
                  ...editValues,
                  consignee: newValue ? newValue._id : "",
                })
              }
              renderInput={(params) => (
                <TextField {...params} variant="standard" size="small" />
              )}
              sx={{ width: 200 }}
            />
          );
        }
        return row.original.consignee?.name || "";
      },
    },
    // ...existing code for other columns...
    {
      accessorKey: "container_number",
      header: "Container No",
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          const isValidContainer = isValidContainerNumber(
            inlineCreateValues.container_number
          );
          return (
            <TextField
              variant="standard"
              size="small"
              value={inlineCreateValues.container_number}
              onChange={(e) => {
                const newValue = e.target.value.toUpperCase();
                setInlineCreateValues({
                  ...inlineCreateValues,
                  container_number: newValue,
                });
              }}
              sx={{ width: 150 }}
              placeholder="ABCD1234567"
              error={!!inlineCreateValues.container_number && !isValidContainer}
              helperText={
                !!inlineCreateValues.container_number && !isValidContainer
                  ? "Format: ABCD1234567 (4 uppercase letters + 7 digits) or Not a Real Container Number"
                  : ""
              }
              inputProps={{
                maxLength: 11,
              }}
            />
          );
        }

        if (editingRow === row.id) {
          const isValidContainer = isValidContainerNumber(
            editValues.container_number
          );
          return (
            <TextField
              variant="standard"
              size="small"
              value={editValues.container_number}
              onChange={(e) => {
                const newValue = e.target.value.toUpperCase();
                setEditValues({
                  ...editValues,
                  container_number: newValue,
                });
              }}
              sx={{ width: 150 }}
              error={!!editValues.container_number && !isValidContainer}
              helperText={
                !!editValues.container_number && !isValidContainer
                  ? "Format: ABCD1234567 (4 uppercase letters + 7 digits) or Not a Real Container Number"
                  : ""
              }
              inputProps={{
                maxLength: 11,
              }}
            />
          );
        }
        return row.original.container_number;
      },
    },
    {
      accessorKey: "vehicle_no",
      header: "Vehicle No",
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          const isValidVehicle = vehicleNoRegex.test(
            inlineCreateValues.vehicle_no
          );
          return (
            <TextField
              variant="standard"
              size="small"
              value={inlineCreateValues.vehicle_no}
              onChange={(e) => {
                const inputValue = e.target.value.toUpperCase();
                setInlineCreateValues({
                  ...inlineCreateValues,
                  vehicle_no: inputValue,
                });
              }}
              sx={{ width: 150 }}
              placeholder="AA00AA0000"
              error={!!inlineCreateValues.vehicle_no && !isValidVehicle}
              helperText={
                !!inlineCreateValues.vehicle_no && !isValidVehicle
                  ? "Invalid format. Use: AA00AA0000 or similar"
                  : ""
              }
              inputProps={{
                maxLength: 10,
                style: { textTransform: "uppercase" },
              }}
            />
          );
        }

        if (editingRow === row.id) {
          const isValidVehicle = vehicleNoRegex.test(editValues.vehicle_no);
          return (
            <TextField
              variant="standard"
              size="small"
              value={editValues.vehicle_no}
              onChange={(e) => {
                const inputValue = e.target.value.toUpperCase();
                setEditValues({
                  ...editValues,
                  vehicle_no: inputValue,
                });
              }}
              sx={{ width: 150 }}
              error={!!editValues.vehicle_no && !isValidVehicle}
              helperText={
                !!editValues.vehicle_no && !isValidVehicle
                  ? "Invalid format. Use: AA00AA0000 or similar"
                  : ""
              }
              inputProps={{
                maxLength: 10,
                style: { textTransform: "uppercase" },
              }}
            />
          );
        }
        return row.original.vehicle_no;
      },
    },
    {
      accessorKey: "driver_name",
      header: "Driver Name",
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          return (
            <TextField
              variant="standard"
              size="small"
              value={inlineCreateValues.driver_name}
              onChange={(e) => {
                const inputValue = e.target.value;
                // Allow only alphabetic characters and spaces
                if (/^[a-zA-Z\s]*$/.test(inputValue)) {
                  setInlineCreateValues({
                    ...inlineCreateValues,
                    driver_name: inputValue,
                  });
                }
              }}
              sx={{ width: 150 }}
              placeholder="Driver Name"
            />
          );
        }
        if (editingRow === row.id) {
          return (
            <TextField
              variant="standard"
              size="small"
              value={editValues.driver_name}
              onChange={(e) => {
                const inputValue = e.target.value;
                // Allow only alphabetic characters and spaces
                if (/^[a-zA-Z\s]*$/.test(inputValue)) {
                  setEditValues({ ...editValues, driver_name: inputValue });
                }
              }}
              sx={{ width: 150 }}
            />
          );
        }
        return row.original.driver_name;
      },
    },
    {
      accessorKey: "driver_phone",
      header: "Driver Phone",
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          const isValidPhone = indianMobileRegex.test(
            inlineCreateValues.driver_phone
          );
          return (
            <TextField
              variant="standard"
              size="small"
              value={inlineCreateValues.driver_phone}
              onChange={(e) => {
                const inputValue = e.target.value;
                // Allow only numeric input
                if (/^[0-9]*$/.test(inputValue) && inputValue.length <= 10) {
                  setInlineCreateValues({
                    ...inlineCreateValues,
                    driver_phone: inputValue,
                  });
                }
              }}
              sx={{ width: 150 }}
              placeholder="9876543210"
              error={!!inlineCreateValues.driver_phone && !isValidPhone}
              helperText={
                !!inlineCreateValues.driver_phone && !isValidPhone
                  ? "Driver phone must be 10 digits starting with 6-9"
                  : ""
              }
              inputProps={{
                maxLength: 10,
                inputMode: "numeric",
                pattern: "[0-9]*",
              }}
            />
          );
        }

        if (editingRow === row.id) {
          const isValidPhone = indianMobileRegex.test(editValues.driver_phone);
          return (
            <TextField
              variant="standard"
              size="small"
              value={editValues.driver_phone}
              onChange={(e) => {
                const inputValue = e.target.value;
                // Allow only numeric input
                if (/^[0-9]*$/.test(inputValue) && inputValue.length <= 10) {
                  setEditValues({ ...editValues, driver_phone: inputValue });
                }
              }}
              sx={{ width: 150 }}
              error={!!editValues.driver_phone && !isValidPhone}
              helperText={
                !!editValues.driver_phone && !isValidPhone
                  ? "Driver phone must be 10 digits starting with 6-9"
                  : ""
              }
              inputProps={{
                maxLength: 10,
                inputMode: "numeric",
                pattern: "[0-9]*",
              }}
            />
          );
        }
        return row.original.driver_phone;
      },
    },
    {
      accessorKey: "elock_no",
      header: "E-lock No",
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          return (
            <Autocomplete
              options={Array.isArray(elockOptions) ? elockOptions : []}
              getOptionLabel={(option) => option.FAssetID || ""}
              value={
                Array.isArray(elockOptions)
                  ? elockOptions.find(
                      (opt) => opt._id === inlineCreateValues.elock_no
                    ) || null
                  : null
              }
              onChange={(_, newValue) =>
                setInlineCreateValues({
                  ...inlineCreateValues,
                  elock_no: newValue ? newValue._id : "",
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="standard"
                  size="small"
                  placeholder="Select E-lock"
                />
              )}
              sx={{ width: 150 }}
            />
          );
        }

        if (editingRow === row.id) {
          let mergedOptions = Array.isArray(elockOptions) ? elockOptions : [];
          if (
            editValues.elock_no &&
            !mergedOptions.some((opt) => opt._id === editValues.elock_no)
          ) {
            const currentElock = {
              _id: editValues.elock_no,
              FAssetID: row.original.elock_no?.FAssetID || editValues.elock_no,
            };
            mergedOptions = [currentElock, ...elockOptions];
          }
          return (
            <Autocomplete
              options={mergedOptions}
              getOptionLabel={(option) => option.FAssetID || ""}
              value={
                mergedOptions.find((opt) => opt._id === editValues.elock_no) ||
                null
              }
              onChange={(_, newValue) => {
                const newElockNo = newValue ? newValue._id : "";
                setEditValues({
                  ...editValues,
                  elock_no: newElockNo,
                  elock_assign_status:
                    !newElockNo || newElockNo.trim() === ""
                      ? "UNASSIGNED"
                      : editValues.elock_assign_status,
                });
              }}
              renderInput={(params) => (
                <TextField {...params} variant="standard" size="small" />
              )}
              sx={{ width: 150 }}
            />
          );
        }
        return row.original.elock_no?.FAssetID || "";
      },
    },
    {
      accessorKey: "elock_assign_status",
      header: "Elock Status",
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          return (
            <TextField
              select
              fullWidth
              size="small"
              value={inlineCreateValues.elock_assign_status}
              variant="standard"
              sx={{ width: 150 }}
              onChange={(e) =>
                setInlineCreateValues({
                  ...inlineCreateValues,
                  elock_assign_status: e.target.value,
                })
              }
            >
              {statusOptions.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>
          );
        }

        if (editingRow === row.id) {
          return (
            <TextField
              select
              fullWidth
              size="small"
              value={editValues.elock_assign_status}
              variant="standard"
              sx={{ width: 150 }}
              onChange={(e) => {
                const newStatus = e.target.value;
                setEditValues({
                  ...editValues,
                  elock_assign_status: newStatus,
                  elock_no:
                    newStatus === "UNASSIGNED" ? "" : editValues.elock_no,
                });
              }}
            >
              {statusOptions.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>
          );
        }
        return row.original.elock_assign_status;
      },
    },
    {
      accessorKey: "goods_pickup",
      header: "Pickup Location",
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          return (
            <Autocomplete
              options={Array.isArray(locationOptions) ? locationOptions : []}
              getOptionLabel={(option) => option.name || ""}
              value={
                Array.isArray(locationOptions)
                  ? locationOptions.find(
                      (opt) => opt._id === inlineCreateValues.goods_pickup
                    ) || null
                  : null
              }
              onChange={(_, newValue) =>
                setInlineCreateValues({
                  ...inlineCreateValues,
                  goods_pickup: newValue ? newValue._id : "",
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="standard"
                  size="small"
                  placeholder="Select Pickup"
                />
              )}
              sx={{ width: 180 }}
            />
          );
        }

        if (editingRow === row.id) {
          return (
            <Autocomplete
              options={Array.isArray(locationOptions) ? locationOptions : []}
              getOptionLabel={(option) => option.name || ""}
              value={
                Array.isArray(locationOptions)
                  ? locationOptions.find(
                      (opt) => opt._id === editValues.goods_pickup
                    ) || null
                  : null
              }
              onChange={(_, newValue) =>
                setEditValues({
                  ...editValues,
                  goods_pickup: newValue ? newValue._id : "",
                })
              }
              renderInput={(params) => (
                <TextField {...params} variant="standard" size="small" />
              )}
              sx={{ width: 180 }}
            />
          );
        }
        return row.original.goods_pickup?.name || "";
      },
    },
    {
      accessorKey: "goods_delivery",
      header: "Delivery Location",
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          return (
            <Autocomplete
              options={Array.isArray(locationOptions) ? locationOptions : []}
              getOptionLabel={(option) => option.name || ""}
              value={
                Array.isArray(locationOptions)
                  ? locationOptions.find(
                      (opt) => opt._id === inlineCreateValues.goods_delivery
                    ) || null
                  : null
              }
              onChange={(_, newValue) =>
                setInlineCreateValues({
                  ...inlineCreateValues,
                  goods_delivery: newValue ? newValue._id : "",
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="standard"
                  size="small"
                  placeholder="Select Delivery"
                />
              )}
              sx={{ width: 180 }}
            />
          );
        }

        if (editingRow === row.id) {
          return (
            <Autocomplete
              options={Array.isArray(locationOptions) ? locationOptions : []}
              getOptionLabel={(option) => option.name || ""}
              value={
                Array.isArray(locationOptions)
                  ? locationOptions.find(
                      (opt) => opt._id === editValues.goods_delivery
                    ) || null
                  : null
              }
              onChange={(_, newValue) =>
                setEditValues({
                  ...editValues,
                  goods_delivery: newValue ? newValue._id : "",
                })
              }
              renderInput={(params) => (
                <TextField {...params} variant="standard" size="small" />
              )}
              sx={{ width: 180 }}
            />
          );
        }
        return row.original.goods_delivery?.name || "";
      },
    },
    {
      accessorKey: "elock_gps",
      header: "Elock GPS",
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          return (
            <Box display="flex" gap={1}>
              <IconButton disabled={true} size="small" color="primary">
                <PlaceIcon />
              </IconButton>
              <IconButton disabled={true} size="small" color="secondary">
                <LockOpenIcon />
              </IconButton>
            </Box>
          );
        }

        const elockNo = row.original.elock_no?.FAssetID;
        return (
          <Box display="flex" gap={1}>
            <IconButton
              onClick={() => {
                setSelectedElockNo(elockNo);
                setIsGPSModalOpen(true);
              }}
              disabled={!elockNo || elockNo.trim() === ""}
              size="small"
              color="primary"
              title="View GPS Location"
            >
              <PlaceIcon />
            </IconButton>
            <IconButton
              onClick={() => handleUnlockElock(elockNo)}
              disabled={!elockNo || elockNo.trim() === ""}
              size="small"
              color="secondary"
              title="Unlock E-lock"
            >
              <LockOpenIcon />
            </IconButton>
          </Box>
        );
      },
    },
    {
      header: "Actions",
      accessorKey: "actions",
      size: 200,
      pinned: "left",
      Cell: ({ row }) => {
        if (row.original._id === "inline-create") {
          return (
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={handleSaveInlineCreate}
                disabled={
                  loading ||
                  !inlineCreateValues.consignor ||
                  !inlineCreateValues.consignee
                }
                startIcon={<SaveIcon />}
              ></Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={handleCancelInlineCreate}
                disabled={loading}
                startIcon={<CancelIcon />}
              ></Button>
            </Box>
          );
        }

        return (
          <Box display="flex" gap={1}>
            {editingRow === row.id ? (
              <>
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  onClick={() => handleSaveRow(row)}
                  disabled={loading}
                  startIcon={<SaveIcon />}
                ></Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={handleCancelEdit}
                  disabled={loading}
                  startIcon={<CancelIcon />}
                ></Button>
              </>
            ) : (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={() => handleEditRow(row)}
                  disabled={loading || isInlineCreating}
                  startIcon={<EditIcon />}
                ></Button>
                <IconButton
                  color="error"
                  size="small"
                  onClick={() => handleDeleteRow(row)}
                  disabled={loading || isInlineCreating}
                >
                  <DeleteIcon />
                </IconButton>
              </>
            )}
          </Box>
        );
      },
    },
  ];

  // Create table data with inline create row if needed
  const tableData = React.useMemo(() => {
    if (isInlineCreating) {
      const inlineCreateRow = {
        _id: "inline-create",
        tr_no: "",
        consignor: null,
        consignee: null,
        container_number: "",
        driver_name: "",
        driver_phone: "",
        elock_no: null,
        elock_assign_status: "UNASSIGNED",
        goods_pickup: null,
        goods_delivery: null,
      };
      return [inlineCreateRow, ...data];
    }
    return data;
  }, [isInlineCreating, data]);

  return (
    <Box sx={{ p: 2 }}>
      <MaterialReactTable
        columns={columns}
        data={tableData}
        enableColumnResizing
        enableColumnOrdering
        enablePagination={false}
        enableBottomToolbar={false}
        enableDensityToggle={false}
        initialState={{
          density: "compact",
          columnPinning: { left: ["tr_no"], right: ["actions"] },
        }}
        enableGlobalFilter={false}
        enableGrouping
        enableColumnFilters={false}
        enableColumnActions={false}
        enableStickyHeader
        enablePinning
        muiTableContainerProps={{
          sx: { maxHeight: "650px", overflowY: "auto" },
        }}
        muiTableHeadCellProps={{
          sx: {
            position: "sticky",
            top: 0,
            zIndex: 1,
            textAlign: "left",
          },
        }}
        muiTableBodyCellProps={{
          sx: {
            textAlign: "left",
          },
        }}
        state={{
          isLoading: loading,
        }}
        renderTopToolbarCustomActions={() => (
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              p: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Others Count: {totalJobs}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleStartInlineCreate}
                disabled={loading || isInlineCreating || editingRow !== null}
              >
                Add New Record
              </Button>
            </Box>
            <TextField
              placeholder="Search by any field..."
              size="small"
              variant="outlined"
              value={searchQuery}
              onChange={handleSearchInputChange}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton>
                      <SearchIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ width: "400px" }}
            />
          </Box>
        )}
      />

      <Box display="flex" justifyContent="center" alignItems="center" mt={2}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={handlePageChange}
          color="primary"
          showFirstButton
          showLastButton
          disabled={loading}
        />
      </Box>

      <ElockGPSOperation
        isOpen={isGPSModalOpen}
        onClose={() => setIsGPSModalOpen(false)}
        elockNo={selectedElockNo}
      />
    </Box>
  );
};

export default ElockAssignOthers;
