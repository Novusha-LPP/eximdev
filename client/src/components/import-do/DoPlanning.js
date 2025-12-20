import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import DoPlanningContainerTable from "./DoPlanningContainerTable";
import { useNavigate, useLocation } from "react-router-dom";
import BLTrackingCell from "../../customHooks/BLTrackingCell";

import {
  IconButton,
  TextField,
  InputAdornment,
  Pagination,
  Button,
  Box,
  Badge,
  Typography,
  MenuItem,
  Autocomplete,
  Checkbox,
  FormControlLabel,
  Popover,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tooltip,
  Chip,
} from "@mui/material";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useContext } from "react";
import { YearContext } from "../../contexts/yearContext.js";
import { UserContext } from "../../contexts/UserContext";
import { useSearchQuery } from "../../contexts/SearchQueryContext";
import { getTableRowInlineStyle } from "../../utils/getTableRowsClassname";

function DoPlanning() {
  const [doDocCounts, setDoDocCounts] = useState({
    totalJobs: 0,
    prepared: 0,
    notPrepared: 0,
  });

  // ✅ State for status filter counts
  const [statusFilterCounts, setStatusFilterCounts] = useState({});
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(false);
  const [showDoPlanningTodayOnly, setShowDoPlanningTodayOnly] = useState(false);
  const [doPlanningTodayCount, setDoPlanningTodayCount] = useState(0);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [selectedICD, setSelectedICD] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [years, setYears] = useState([]);
  const [importers, setImporters] = useState(null);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("");

  // WebSocket states - Simple implementation like Screen1
  const [newJobsCount, setNewJobsCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [showTodayJobs, setShowTodayJobs] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [socketError, setSocketError] = useState(null);

  // Use context for search functionality
  const {
    searchQuery,
    setSearchQuery,
    selectedImporter,
    setSelectedImporter,
    currentPageDoTab1: currentPage,
    setCurrentPageDoTab1: setCurrentPage,
  } = useSearchQuery();
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const navigate = useNavigate();
  const location = useLocation();
  const { job_no, year } = useParams();
  const bl_no_ref = useRef();
  const [totalJobs, setTotalJobs] = React.useState(0);
  const limit = 100;
  const [selectedJobId, setSelectedJobId] = useState(
    location.state?.selectedJobId || null
  );
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const { user } = useContext(UserContext);

  // Status filter options with dynamic counts and styled badges
  const statusFilterOptions = [
    {
      value: "",
      label: "All Status",
      count: statusFilterCounts.total || 0,
    },
    {
      value: "do_doc_prepared",
      label: "DO Doc Prepared",
      count: statusFilterCounts.do_doc_prepared || 0,
    },
    {
      value: "do_doc_not_prepared",
      label: "DO Doc Not Prepared",
      count: statusFilterCounts.do_doc_not_prepared || 0,
    },
    {
      value: "payment_request_sent",
      label: "Payment Request Sent to Billing Team",
      count: statusFilterCounts.payment_request_sent || 0,
    },
    {
      value: "payment_request_not_sent",
      label: "Payment Request Not Sent to Billing Team",
      count: statusFilterCounts.payment_request_not_sent || 0,
    },
    {
      value: "payment_made",
      label: "Payment Made",
      count: statusFilterCounts.payment_made || 0,
    },
    {
      value: "payment_not_made",
      label: "Payment Not Made",
      count: statusFilterCounts.payment_not_made || 0,
    },
    {
      value: "obl_received",
      label: "OBL Received",
      count: statusFilterCounts.obl_received || 0,
    },
    {
      value: "obl_not_received",
      label: "OBL Not Received",
      count: statusFilterCounts.obl_not_received || 0,
    },
    {
      value: "doc_sent_to_shipping_line",
      label: "Doc Sent to Shipping Line",
      count: statusFilterCounts.doc_sent_to_shipping_line || 0,
    },
    {
      value: "doc_not_sent_to_shipping_line",
      label: "Doc Not Sent to Shipping Line",
      count: statusFilterCounts.doc_not_sent_to_shipping_line || 0,
    },
  ];

  // DO List options
  const doListOptions = [
    { value: "", label: "Select DO List" },
    {
      value: "ICD Khodiyar / ICD AHMEDABAD",
      label: "ICD Khodiyar / ICD AHMEDABAD",
    },
    { value: "ICD SANAND", label: "ICD SANAND" },
    {
      value: "CONTAINER CARE SERVICES / OCEAN EMPTY CONTAINER PARK",
      label: "CONTAINER CARE SERVICES / OCEAN EMPTY CONTAINER PARK",
    },
    { value: "ABHI CONTAINER SERVICES", label: "ABHI CONTAINER SERVICES" },
    {
      value: "Golden Horn Container Services (Nr. ICD Khodiyar)",
      label: "Golden Horn Container Services (Nr. ICD Khodiyar)",
    },
    {
      value: "Golden Horn Container Services (Nr. ICD SANAND)",
      label: "Golden Horn Container Services (Nr. ICD SANAND)",
    },
    {
      value: "JAY BHAVANI CONTAINERS YARD",
      label: "JAY BHAVANI CONTAINERS YARD",
    },
    { value: "BALAJI QUEST YARD", label: "BALAJI QUEST YARD" },
    {
      value: "SATURN GLOBAL TERMINAL PVT LTD",
      label: "SATURN GLOBAL TERMINAL PVT LTD",
    },
    { value: "CHEKLA CONTAINER YARD", label: "CHEKLA CONTAINER YARD" },
  ];

  // Handle new job notification
  const handleNewJobNotification = useCallback(
    (message) => {
      console.log("🆕 Processing notification:", message);

      // Extract job data from different possible message formats
      const jobData = message.data || message.job || message;
      const jobNo = jobData.job_no || jobData.jobNumber || "Unknown";

      if (!jobData.job_no) {
        console.warn("⚠️ Notification missing job_no:", message);
        return; // Don't process if no job number
      }

      console.log("🆕 New DO Billing Job:", jobNo, jobData);

      // Create notification object
      const newNotification = {
        id: Date.now() + Math.random(),
        job: jobData,
        timestamp: message.timestamp || new Date().toISOString(),
        read: false,
        type: "do_billing",
      };

      // Add to notifications
      setNotifications((prev) => {
        const updated = [newNotification, ...prev.slice(0, 49)];
        console.log("📋 Notifications updated, total:", updated.length);
        return updated;
      });

      // Update badge count
      setNewJobsCount((prev) => {
        const newCount = prev + 1;
        console.log("🔔 New jobs count:", newCount);
        return newCount;
      });

      // Play notification sound
      playNotificationSound();

      // Show toast notification if not viewing today's jobs
      if (!showTodayJobs) {
        showToastNotification(jobData);
      }

      // Refresh data to show the new job if viewing today's jobs
      if (showTodayJobs) {
        console.log("🔄 Refreshing data for today's jobs");
        fetchJobs(
          currentPage,
          debouncedSearchQuery,
          selectedYearState,
          selectedICD,
          selectedImporter,
          selectedStatusFilter,
          showUnresolvedOnly
        );
      }
    },
    [
      showTodayJobs,
      currentPage,
      debouncedSearchQuery,
      selectedYearState,
      selectedICD,
      selectedImporter,
      selectedStatusFilter,
      showUnresolvedOnly,
    ]
  );

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+NqMu2gv4BDW+u2/Ls4g0AD3nR8/3/9/8AAAj9//v/9v8AAAEAAAD+//3//P/7//r/+f/4//f/9v/1//T/8//y//H/8P/v/+6/7f/s/+v/6v/p/+j/5//m/+X/5P/j/+L/4f/g/9//3v/d/9z/2//a/9n/2P/X/9b/1f/U/9P/0v/R/9D/z//O/83/zP/L/8r/yf/I/8f/xv/F/8T/w//C/8H/wP+//76/vf+8/7v/uv+5/7j/t/+2/7X/tP+z/7L/sf+w/6//rv+t/6z/q/+q/6n/qP+n/6b/pf+k/6P/ov+h/6D/n/+e/53/nP+b/5r/mf+Y/5f/lv+V/5T/k/+S/5H/kP+P/46/jf+M/4v/iv+J/4j/h/+G/4X/hP+D/4L/gf+A/3//fv99/3z/e/96/3n/eP93/3b/df90/3P/cv9x/3D/b/9u/23/bP9r/2r/af9o/2f/Zv9l/2T/Y/9i/2H/YP9f/17/Xf9c/1v/Wv9Z/1j/V/9W/1X/VP9T/1L/Uf9Q/0//Tv9N/0z/S/9K/0n/SP9H/0b/Rf9E/0P/Qv9B/0D/P/8+/z3/PP87/zr/Of84/zf/Nv81/zT/M/8y/zH/MP8v/y7/Lf8s/yv/Kv8p/yj/J/8m/yX/JP8j/yL/If8g/x//Hv8d/xz/G/8a/xn/GP8X/xb/Ff8U/xP/Ev8R/xD/D/8O/w3/DP8L/wr/Cf8I/wf/Bv8F/wT/A/8C/wH/AP///v/9//z/+/8="
      );
      audio.volume = 0.3;
      audio.play().catch((e) => console.log("Audio play failed:", e));
    } catch (error) {
      console.log("Notification sound error:", error);
    }
  };

  // Show toast notification
  const showToastNotification = (job) => {
    // Create toast element
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px;
      border-radius: 8px;
      z-index: 10000;
      box-shadow: 0 8px 25px rgba(0,0,0,0.3);
      min-width: 300px;
      border: 2px solid #fff;
      animation: slideIn 0.3s ease;
    `;

    toast.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="flex: 1;">
          <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">
            🎯 New DO Billing Job!
          </div>
          <div style="font-size: 14px; margin-bottom: 4px;">
            <strong>Job No:</strong> ${job.job_no}
          </div>
          <div style="font-size: 14px; margin-bottom: 4px;">
            <strong>Importer:</strong> ${job.importer}
          </div>
          <div style="font-size: 12px; opacity: 0.8;">
            ${new Date().toLocaleTimeString()}
          </div>
        </div>
        <button 
          onclick="this.parentElement.parentElement.remove()"
          style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 18px; cursor: pointer; padding: 0 8px; border-radius: 50%;"
        >
          ×
        </button>
      </div>
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
    `;

    document.body.appendChild(toast);

    // Auto remove after 8 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, 8000);
  };

  // ✅ Simple WebSocket implementation - like your working Screen1
  useEffect(() => {
    const SOCKET_URL = `ws://${process.env.REACT_APP_SOCKET_URL || "localhost:9000"
      }`;
    console.log("🔗 Connecting to DO Billing WebSocket:", SOCKET_URL);

    let socket = null;
    let reconnectTimeout = null;
    let connectionTimeout = null;
    let subscriptionSent = false;

    const connectWebSocket = () => {
      try {
        // Clear any existing timeouts
        if (connectionTimeout) clearTimeout(connectionTimeout);
        if (reconnectTimeout) clearTimeout(reconnectTimeout);

        // Close existing socket if any
        if (socket && socket.readyState !== WebSocket.CLOSED) {
          socket.close(1000, "New connection requested");
        }

        setConnectionStatus("Connecting");
        setSocketError(null);
        subscriptionSent = false;

        // Use the dedicated path for DO billing WebSocket
        socket = new WebSocket(`${SOCKET_URL}/do-billing`);

        // Set connection timeout
        connectionTimeout = setTimeout(() => {
          if (socket?.readyState !== WebSocket.OPEN) {
            console.error("❌ Connection timeout");
            socket?.close(4000, "Connection timeout");
            setSocketError("Connection timeout");
          }
        }, 5000);

        socket.onopen = () => {
          console.log("✅ Connected successfully");
          setConnectionStatus("Connected");
          setSocketError(null);
          clearTimeout(connectionTimeout);

          if (!subscriptionSent) {
            // Send subscription message
            // Simplified subscription message
            const subscribeMessage = {
              type: "subscribe",
              module: "do_billing",
              timestamp: new Date().toISOString(),
            };

            try {
              const messageString = JSON.stringify(subscribeMessage);
              console.log("📤 Subscription payload:", messageString);
              socket.send(messageString);
              subscriptionSent = true;
              console.log("📤 Subscribe message sent successfully");
            } catch (err) {
              console.error("❌ Failed to send subscribe:", err);
              setSocketError("Failed to subscribe: " + err.message);
            }
          }
        };

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log("📨 Message received:", message);

            switch (message.type) {
              case "welcome":
                console.log("👋 Server welcomed connection");
                break;

              case "subscribed":
                console.log("✅ Successfully subscribed");
                setConnectionStatus("Subscribed");
                setSocketError(null);
                break;

              case "new_job":
                console.log("🎯 New job notification:", message);
                handleNewJobNotification(message);
                break;

              case "error":
                console.error("❌ Server error:", message);
                setSocketError(message.error);
                break;

              default:
                console.log("📨 Other message:", message);
            }
          } catch (err) {
            console.error("❌ Failed to process message:", err);
          }
        };

        socket.onerror = (error) => {
          console.error("❌ WebSocket error:", error);
          setConnectionStatus("Error");
          setSocketError("Connection error occurred");
        };

        socket.onclose = (event) => {
          console.log("👋 WebSocket closed:", event);
          setConnectionStatus("Disconnected");

          // Only reconnect on abnormal closure
          if (event.code !== 1000 && event.code !== 1001) {
            reconnectTimeout = setTimeout(() => {
              console.log("🔄 Attempting to reconnect...");
              connectWebSocket();
            }, 3000);
          }
        };
      } catch (error) {
        console.error("❌ Failed to create WebSocket:", error);
        setSocketError("Failed to create connection");
      }
    };

    // Initial connection
    connectWebSocket();

    // Cleanup
    return () => {
      if (connectionTimeout) clearTimeout(connectionTimeout);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) socket.close(1000, "Component unmounting");
    };
  }, [handleNewJobNotification]);

  // Test function for WebSocket
  const testDoBillingWebSocket = () => {
    console.log("🧪 DO Billing WebSocket Test:", {
      connectionStatus,
      socketError,
      notifications: notifications.length,
    });

    // Simulate a test notification
    handleNewJobNotification({
      type: "test_job",
      data: {
        job_no: "TEST-" + Date.now(),
        importer: "Test Company",
        be_no: "TEST123",
      },
    });
  };

  // Fetch jobs function
  const fetchJobs = useCallback(
    async (
      currentPage,
      currentSearchQuery,
      currentYear,
      currentICD,
      selectedImporter,

      statusFilter = "",
      unresolvedOnly = false,
      doPlanningDateToday = false
    ) => {
      setLoading(true);
      try {
        const apiUrl = showTodayJobs
          ? `${process.env.REACT_APP_API_STRING}/get-today-do-billing`
          : `${process.env.REACT_APP_API_STRING}/get-do-module-jobs`;

        const res = await axios.get(apiUrl, {
          params: {
            page: currentPage,
            limit,
            search: currentSearchQuery,
            year: currentYear,
            selectedICD: currentICD,
            importer: selectedImporter?.trim() || "",
            username: user?.username || "",
            statusFilter: statusFilter || "",

            unresolvedOnly: unresolvedOnly.toString(),
            doPlanningDateToday: doPlanningDateToday.toString(),
          },
        });

        const {
          totalJobs,
          totalPages,
          currentPage: returnedPage,
          jobs,
          doDocCounts,
          statusFilterCounts,
          unresolvedCount,
        } = res.data;

        setRows(jobs);
        setTotalPages(totalPages);
        setTotalJobs(totalJobs);
        setUnresolvedCount(unresolvedCount || 0);
        setDoPlanningTodayCount(res.data.doPlanningTodayCount || 0);

        if (doDocCounts) {
          setDoDocCounts(doDocCounts);
        }

        if (statusFilterCounts) {
          setStatusFilterCounts(statusFilterCounts);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setRows([]);
        setTotalPages(1);
        setDoDocCounts({ totalJobs: 0, prepared: 0, notPrepared: 0 });
        setUnresolvedCount(0);
      } finally {
        setLoading(false);
      }
    },
    [limit, user?.username, showTodayJobs]
  );

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleViewTodayJobs = () => {
    setShowTodayJobs(true);
    setCurrentPage(1);
    handleNotificationClose();
  };

  const handleViewAllJobs = () => {
    setShowTodayJobs(false);
    setCurrentPage(1);
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    setNewJobsCount(0);
  };

  // Remove the automatic clearing - we'll handle this from the tab component instead
  React.useEffect(() => {
    async function getImporterList() {
      if (selectedYearState) {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-importer-list/${selectedYearState}`
        );
        setImporters(res.data);
      }
    }
    getImporterList();
  }, [selectedYearState]);

  const getUniqueImporterNames = (importerData) => {
    if (!importerData || !Array.isArray(importerData)) return [];
    const uniqueImporters = new Set();
    return importerData
      .filter((importer) => {
        if (uniqueImporters.has(importer.importer)) return false;
        uniqueImporters.add(importer.importer);
        return true;
      })
      .map((importer, index) => ({
        label: importer.importer,
        key: `${importer.importer}-${index}`,
      }));
  };

  const importerNames = [...getUniqueImporterNames(importers)];

  useEffect(() => {
    async function getYears() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-years`
        );
        const filteredYears = res.data.filter((year) => year !== null);
        setYears(filteredYears);

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const prevTwoDigits = String((currentYear - 1) % 100).padStart(2, "0");
        const currentTwoDigits = String(currentYear).slice(-2);
        const nextTwoDigits = String((currentYear + 1) % 100).padStart(2, "0");

        let defaultYearPair =
          currentMonth >= 4
            ? `${currentTwoDigits}-${nextTwoDigits}`
            : `${prevTwoDigits}-${currentTwoDigits}`;

        if (!selectedYearState && filteredYears.length > 0) {
          const newYear = filteredYears.includes(defaultYearPair)
            ? defaultYearPair
            : filteredYears[0];

          setSelectedYearState(newYear);
        }
      } catch (error) {
        console.error("Error fetching years:", error);
      }
    }
    getYears();
  }, [selectedYearState, setSelectedYear]);

  const handleCopy = (event, text) => {
    event.stopPropagation();
    if (!text || text === "N/A") return;
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      navigator.clipboard
        .writeText(text)
        .then(() => console.log("Copied:", text))
        .catch((err) => console.error("Copy failed:", err));
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        console.log("Copied (fallback):", text);
      } catch (err) {
        console.error("Fallback failed:", err);
      }
      document.body.removeChild(textArea);
    }
  };

  // Fetch jobs when dependencies change
  useEffect(() => {
    if (selectedYearState && user?.username) {
      fetchJobs(
        currentPage,
        debouncedSearchQuery,
        selectedYearState,
        selectedICD,
        selectedImporter,
        selectedStatusFilter,
        showUnresolvedOnly,
        showDoPlanningTodayOnly
      );
    }
  }, [
    currentPage,
    debouncedSearchQuery,
    selectedYearState,
    selectedICD,
    selectedImporter,
    selectedStatusFilter,
    user?.username,
    showUnresolvedOnly,
    showDoPlanningTodayOnly,
    showTodayJobs,
    fetchJobs,
  ]);

  // Handle search input change
  const handleSearchInputChange = (event) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1);
  };

  // Handle status filter change
  const handleStatusFilterChange = (event) => {
    setSelectedStatusFilter(event.target.value);
    setCurrentPage(1);
  };

  // Debounce search query to reduce excessive API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    setCurrentPage(newPage);
  };

  // Add display component for the counts
  const DoDocCountsDisplay = () => (
    <div
      style={{
        display: "flex",
        gap: "12px",
        alignItems: "center",
      }}
    >
      <div
        style={{
          padding: "4px 12px",
          backgroundColor: "#e3f2fd",
          borderRadius: "8px",
          textAlign: "center",
          border: "2px solid #1976d2",
          minWidth: "60px",
        }}
      >
        <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1976d2" }}>
          {doDocCounts.totalJobs}
        </div>
        <div style={{ fontSize: "11px", color: "#666", fontWeight: "500" }}>
          Total Jobs
        </div>
      </div>

      <div
        style={{
          padding: "4px 12px",
          backgroundColor: "#e8f5e8",
          borderRadius: "8px",
          textAlign: "center",
          border: "2px solid #2e7d32",
          minWidth: "60px",
        }}
      >
        <div style={{ fontSize: "18px", fontWeight: "bold", color: "#2e7d32" }}>
          {doDocCounts.prepared}
        </div>
        <div style={{ fontSize: "11px", color: "#666", fontWeight: "500" }}>
          DO Doc Prepared
        </div>
      </div>

      <div
        style={{
          padding: "4px 12px",
          backgroundColor: "#ffebee",
          borderRadius: "8px",
          textAlign: "center",
          border: "2px solid #d32f2f",
          minWidth: "60px",
        }}
      >
        <div style={{ fontSize: "18px", fontWeight: "bold", color: "#d32f2f" }}>
          {doDocCounts.notPrepared}
        </div>
        <div style={{ fontSize: "11px", color: "#666", fontWeight: "500" }}>
          DO Doc Not Prepared
        </div>
      </div>

    </div>
  );

  // Table columns (your existing columns remain the same)
  const columns = [
    {
      accessorKey: "job_no",
      header: "Job No",
      size: 120,
      Cell: ({ cell }) => {
        const {
          job_no,
          custom_house,
          _id,
          type_of_b_e,
          consignment_type,
          year,
        } = cell.row.original;

        const isSelected = selectedJobId === _id;

        return (
          <Link
            to={`/edit-do-planning/${job_no}/${year}?jobId=${_id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setSelectedJobId(_id)}
            style={{
              backgroundColor: isSelected ? "#ffffcc" : "transparent",
              textAlign: "center",
              cursor: "pointer",
              color: "blue",
              display: "inline-block",
              width: "100%",
              padding: "5px",
              textDecoration: "none",
            }}
          >
            {job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br />
            {custom_house}
          </Link>
        );
      },
    },
    {
      accessorKey: "importer",
      header: "Importer",
      enableSorting: false,
      size: 250,
      Cell: ({ cell, row }) => {
        const importerName = cell?.getValue()?.toString();
        const _id = row.original._id;
        const [isDoDocPrepared, setIsDoDocPrepared] = React.useState(
          row.original.is_do_doc_prepared || false
        );
        const [isOgDocRecieved, setIsOgDocRecieved] = React.useState(
          row.original.is_og_doc_recieved || false
        );

        // Sync local state when row data changes
        React.useEffect(() => {
          setIsDoDocPrepared(row.original.is_do_doc_prepared || false);
          setIsOgDocRecieved(row.original.is_og_doc_recieved || false);
        }, [row.original.is_do_doc_prepared, row.original.is_og_doc_recieved]);

        // Get payment_recipt_date and payment_request_date from do_shipping_line_invoice[0] if present
        const doShippingLineInvoice = row.original.do_shipping_line_invoice;
        let paymentReciptDate = "";
        let paymentRequestDate = "";
        if (
          Array.isArray(doShippingLineInvoice) &&
          doShippingLineInvoice.length > 0
        ) {
          paymentReciptDate = doShippingLineInvoice[0].payment_recipt_date;
          paymentRequestDate = doShippingLineInvoice[0].payment_request_date;
        }

        const handleToggleDoDocPrepared = async (event) => {
          const newValue = event.target.checked;
          const previousValue = isDoDocPrepared;

          // Update local state immediately
          setIsDoDocPrepared(newValue);

          // Update the row data directly
          row.original.is_do_doc_prepared = newValue;

          try {
            const now = new Date().toISOString();
            const updateData = {
              is_do_doc_prepared: newValue,
              do_doc_prepared_date: now,
            };
            const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
            const headers = {
              "Content-Type": "application/json",
              "user-id": user.username || "unknown",
              username: user.username || "unknown",
              "user-role": user.role || "unknown",
            };
            await axios.patch(
              `${process.env.REACT_APP_API_STRING}/jobs/${_id}`,
              updateData,
              { headers }
            );

            // Update the main state
            setRows((prevRows) =>
              prevRows.map((r) =>
                r._id === _id ? { ...r, is_do_doc_prepared: newValue } : r
              )
            );
          } catch (error) {
            // Revert the changes on error
            setIsDoDocPrepared(previousValue);
            row.original.is_do_doc_prepared = previousValue;
            console.error("Error updating DO doc prepared status:", error);

            // Revert the state as well
            setRows((prevRows) =>
              prevRows.map((r) =>
                r._id === _id ? { ...r, is_do_doc_prepared: previousValue } : r
              )
            );
          }
        };

        const handleToggleOgDocRecieved = async (event) => {
          const newValue = event.target.checked;
          const previousValue = isOgDocRecieved;

          // Update local state immediately
          setIsOgDocRecieved(newValue);

          // Update the row data directly
          row.original.is_og_doc_recieved = newValue;

          try {
            const now = new Date().toISOString();
            const updateData = {
              is_og_doc_recieved: newValue,
              og_doc_recieved_date: now,
            };
            const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
            const headers = {
              "Content-Type": "application/json",
              "user-id": user.username || "unknown",
              username: user.username || "unknown",
              "user-role": user.role || "unknown",
            };
            await axios.patch(
              `${process.env.REACT_APP_API_STRING}/jobs/${_id}`,
              updateData,
              { headers }
            );

            // Update the main state
            setRows((prevRows) =>
              prevRows.map((r) =>
                r._id === _id ? { ...r, is_og_doc_recieved: newValue } : r
              )
            );
          } catch (error) {
            // Revert the changes on error
            setIsOgDocRecieved(previousValue);
            row.original.is_og_doc_recieved = previousValue;
            console.error("Error updating OG doc received status:", error);

            // Revert the state as well
            setRows((prevRows) =>
              prevRows.map((r) =>
                r._id === _id ? { ...r, is_og_doc_recieved: previousValue } : r
              )
            );
          }
        };

        return (
          <React.Fragment>
            {importerName}
            <IconButton
              size="small"
              onPointerOver={(e) => (e.target.style.cursor = "pointer")}
              onClick={(event) => {
                handleCopy(event, importerName);
              }}
            >
              <abbr title="Copy Party Name">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
            {/* Show payment request info if available */}
            {paymentRequestDate && (
              <>
                <div
                  style={{
                    color: "#d32f2f",
                    fontWeight: 500,
                    fontSize: "12px",
                    marginTop: 4,
                  }}
                >
                  Payment request sent to billing team
                </div>
                <div
                  style={{
                    color: "#0288d1",
                    fontWeight: 500,
                    fontSize: "12px",
                    marginBottom: 2,
                  }}
                >
                  Payment Request Date:{" "}
                  {new Date(paymentRequestDate).toLocaleString("en-IN", {
                    hour12: true,
                  })}
                </div>
              </>
            )}
            {/* Show payment receipt links if available */}
            {Array.isArray(doShippingLineInvoice) &&
              doShippingLineInvoice.length > 0 &&
              doShippingLineInvoice.map((invoice, idx) =>
                invoice.payment_recipt && invoice.payment_recipt.length > 0 ? (
                  <div
                    key={idx}
                    style={{
                      fontSize: "11px",
                      color: "#388e3c",
                      marginTop: "2px",
                    }}
                  >
                    {invoice.payment_recipt.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#388e3c",
                          textDecoration: "underline",
                          marginRight: 8,
                        }}
                      >
                        View Payment Receipt{" "}
                        {doShippingLineInvoice.length > 1 ? `(${idx + 1})` : ""}
                      </a>
                    ))}
                  </div>
                ) : null
              )}
            {paymentReciptDate && (
              <div
                style={{ fontSize: "11px", color: "#1976d2", marginTop: "2px" }}
              >
                Payment Receipt Uploaded:{" "}
                {new Date(paymentReciptDate).toLocaleString("en-IN", {
                  hour12: true,
                })}
              </div>
            )}
            <br />
            <label
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "12px",
                marginTop: "4px",
              }}
            >
              <input
                type="checkbox"
                checked={isDoDocPrepared}
                onChange={handleToggleDoDocPrepared}
                style={{ marginRight: "6px" }}
              />
              DO Doc Prepared
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "12px",
                marginTop: "4px",
              }}
            >
              <input
                type="checkbox"
                checked={isOgDocRecieved}
                onChange={handleToggleOgDocRecieved}
                style={{ marginRight: "6px" }}
              />
              OG Doc Received
            </label>
          </React.Fragment>
        );
      },
    },
    {
      accessorKey: "be_no_igm_details",
      header: "Bill Of Entry & IGM Details",
      enableSorting: false,
      size: 300,
      Cell: ({ cell }) => {
        const {
          be_no,
          igm_date,
          igm_no,
          be_date,
          gateway_igm_date,
          gateway_igm,
        } = cell.row.original;

        return (
          <div>
            <div
              style={{
                marginBottom: "2px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <strong>BE No:</strong> {be_no || "N/A"}{" "}
              <IconButton
                size="small"
                onClick={(event) => handleCopy(event, be_no)}
                sx={{ padding: "2px", marginLeft: "4px" }}
              >
                <abbr title="Copy BE No">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>

            <div
              style={{
                marginBottom: "2px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <strong>BE Date:</strong> {be_date || "N/A"}{" "}
              <IconButton
                size="small"
                onClick={(event) => handleCopy(event, be_date)}
                sx={{ padding: "2px", marginLeft: "4px" }}
              >
                <abbr title="Copy BE Date">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>

            <div
              style={{
                marginBottom: "2px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <strong>GIGM:</strong> {gateway_igm || "N/A"}{" "}
              <IconButton
                size="small"
                onClick={(event) => handleCopy(event, gateway_igm)}
                sx={{ padding: "2px", marginLeft: "4px" }}
              >
                <abbr title="Copy GIGM">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>

            <div
              style={{
                marginBottom: "2px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <strong>GIGM Date:</strong> {gateway_igm_date || "N/A"}{" "}
              <IconButton
                size="small"
                onClick={(event) => handleCopy(event, gateway_igm_date)}
                sx={{ padding: "2px", marginLeft: "4px" }}
              >
                <abbr title="Copy GIGM Date">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>

            <div
              style={{
                marginBottom: "2px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <strong>IGM No:</strong> {igm_no || "N/A"}{" "}
              <IconButton
                size="small"
                onClick={(event) => handleCopy(event, igm_no)}
                sx={{ padding: "2px", marginLeft: "4px" }}
              >
                <abbr title="Copy IGM No">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>

            <div
              style={{
                marginBottom: "2px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <strong>IGM Date:</strong> {igm_date || "N/A"}{" "}
              <IconButton
                size="small"
                onClick={(event) => handleCopy(event, igm_date)}
                sx={{ padding: "2px", marginLeft: "4px" }}
              >
                <abbr title="Copy IGM Date">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "awb_bl_no",
      header: "BL Number",
      size: 220,
      Cell: ({ row }) => {
        const vesselFlight = row.original.vessel_flight?.toString() || "N/A";
        const voyageNo = row.original.voyage_no?.toString() || "N/A";
        const line_no = row.original.line_no || "N/A";
        const [isOblReceived, setIsOblReceived] = React.useState(
          row.original.is_obl_recieved || false
        );
        const _id = row.original._id;
        const shipping_line_airline = row.original.shipping_line_airline;

        // Sync local state when row data changes
        React.useEffect(() => {
          setIsOblReceived(row.original.is_obl_recieved || false);
        }, [row.original.is_obl_recieved]);

        const handleToggleOBL = async (event) => {
          const newValue = event.target.checked;
          const previousValue = isOblReceived;

          // Update local state immediately
          setIsOblReceived(newValue);

          // Update the row data directly
          row.original.is_obl_recieved = newValue;

          try {
            const now = new Date().toISOString();
            const updateData = {
              is_obl_recieved: newValue,
              obl_recieved_date: now,
            };
            const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
            const headers = {
              "Content-Type": "application/json",
              "user-id": user.username || "unknown",
              username: user.username || "unknown",
              "user-role": user.role || "unknown",
            };
            await axios.patch(
              `${process.env.REACT_APP_API_STRING}/jobs/${_id}`,
              updateData,
              { headers }
            );
            console.log("OBL status and date updated successfully");

            // Update the main state
            setRows((prevRows) =>
              prevRows.map((r) =>
                r._id === _id ? { ...r, is_obl_recieved: newValue } : r
              )
            );
          } catch (error) {
            console.error("Error updating OBL status:", error);
            // Revert the changes on error
            setIsOblReceived(previousValue);
            row.original.is_obl_recieved = previousValue;

            // Revert the state as well
            setRows((prevRows) =>
              prevRows.map((r) =>
                r._id === _id ? { ...r, is_obl_recieved: previousValue } : r
              )
            );
          }
        };

        return (
          <React.Fragment>
            <BLTrackingCell
              blNumber={row.original.awb_bl_no}
              hblNumber={row.original?.hawb_hbl_no?.toString() || ""}
              shippingLine={row.original.shipping_line_airline}
              customHouse={row.original?.custom_house || ""}
              container_nos={row.original.container_nos}
              jobId={_id}
              portOfReporting={row.original.port_of_reporting}
              containerNos={row.original.container_nos}
              onCopy={handleCopy}
            />

            {/* REST OF YOUR CUSTOM CONTENT */}
            <div>
              {shipping_line_airline}
              <Tooltip title="Copy Shipping Line" arrow>
                <IconButton
                  size="small"
                  onClick={(event) => handleCopy(event, shipping_line_airline)}
                >
                  <ContentCopyIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            </div>

            <div>
              {vesselFlight}
              <Tooltip title="Copy Vessel" arrow>
                <IconButton
                  size="small"
                  onClick={(event) => handleCopy(event, vesselFlight)}
                >
                  <ContentCopyIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            </div>

            <div>
              {`Vessel Voyage: ${voyageNo}`}
              <Tooltip title="Copy Voyage Number" arrow>
                <IconButton
                  size="small"
                  onClick={(event) => handleCopy(event, voyageNo)}
                >
                  <ContentCopyIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            </div>

            <div>
              {`Line No: ${line_no}`}
              <Tooltip title="Copy Line Number" arrow>
                <IconButton
                  size="small"
                  onClick={(event) => handleCopy(event, line_no)}
                >
                  <ContentCopyIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            </div>

            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: "12px",
                }}
              >
                <input
                  type="checkbox"
                  checked={isOblReceived}
                  onChange={handleToggleOBL}
                  style={{ marginRight: "6px" }}
                />
                OBL Received
              </label>
            </div>
          </React.Fragment>
        );
      },
    },
    {
      accessorKey: "container_numbers",
      header: "Container Numbers and Size",
      size: 200,
      Cell: ({ cell }) => {
        const containerNos = cell.row.original.container_nos;
        return (
          <React.Fragment>
            {containerNos?.map((container, id) => (
              <div key={id} style={{ marginBottom: "4px" }}>
                <a
                  href={`https://www.ldb.co.in/ldb/containersearch/39/${container.container_number}/1726651147706`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {container.container_number}
                </a>
                | "{container.size}"
                <IconButton
                  size="small"
                  onClick={(event) =>
                    handleCopy(event, container.container_number)
                  }
                >
                  <abbr title="Copy Container Number">
                    <ContentCopyIcon fontSize="inherit" />
                  </abbr>
                </IconButton>
              </div>
            ))}
          </React.Fragment>
        );
      },
    },
    {
      accessorKey: "displayDate",
      header: "Required Do Validity Upto",
      enableSorting: false,
      size: 200,
      Cell: ({ row }) => {
        const displayDate = row.original.displayDate || "N/A";
        const do_list = row.original.do_list || "N/A";
        const typeOfDo = row.original.type_of_Do || "N/A";
        const [isDoDocRecieved, setIsDoDocRecieved] = React.useState(
          row.original.is_do_doc_recieved || false
        );
        const _id = row.original._id;

        // Sync local state when row data changes
        React.useEffect(() => {
          setIsDoDocRecieved(row.original.is_do_doc_recieved || false);
        }, [row.original.is_do_doc_recieved]);

        const handleToggleDoDoc = async (event) => {
          event.stopPropagation();
          const newValue = event.target.checked;
          const previousValue = isDoDocRecieved;

          // Update local state immediately
          setIsDoDocRecieved(newValue);

          // Update the row data directly
          row.original.is_do_doc_recieved = newValue;

          try {
            const now = new Date().toISOString();
            const updateData = {
              is_do_doc_recieved: newValue,
              do_doc_recieved_date: now,
            };
            const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
            const headers = {
              "Content-Type": "application/json",
              "user-id": user.username || "unknown",
              username: user.username || "unknown",
              "user-role": user.role || "unknown",
            };
            await axios.patch(
              `${process.env.REACT_APP_API_STRING}/jobs/${_id}`,
              updateData,
              { headers }
            );

            // Update the main state
            setRows((prevRows) =>
              prevRows.map((r) =>
                r._id === _id ? { ...r, is_do_doc_recieved: newValue } : r
              )
            );
          } catch (error) {
            // Revert the changes on error
            setIsDoDocRecieved(previousValue);
            row.original.is_do_doc_recieved = previousValue;
            console.error("Error updating DO doc received status:", error);

            // Revert the state as well
            setRows((prevRows) =>
              prevRows.map((r) =>
                r._id === _id ? { ...r, is_do_doc_recieved: previousValue } : r
              )
            );
          }
        };

        return (
          <div
            style={{
              backgroundColor:
                row.original.dayDifference > 0 ? "#FFCCCC" : "#CCFFCC",
              padding: "8px",
              borderRadius: "4px",
            }}
          >
            <div>{displayDate}</div>
            {row.original.dayDifference > 0 && (
              <div>(+{row.original.dayDifference} days)</div>
            )}
            <div>Type Of Do: {typeOfDo}</div>
            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: "12px",
                }}
              >
                <input
                  type="checkbox"
                  checked={isDoDocRecieved}
                  onChange={handleToggleDoDoc}
                  style={{ marginRight: "6px" }}
                />
                Do document send to shipping line
              </label>
            </div>
            <div style={{ marginTop: "5px", fontSize: "12px" }}>
              <strong>EmptyOff LOC:</strong> {do_list}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "do_revalidation_upto",
      header: "DO Revalidation Upto",
      size: 180,
      Cell: ({ cell }) => {
        const containers = cell.row.original.container_nos;

        return (
          <React.Fragment>
            {containers.map((container, containerIndex) => {
              const revalidationData = container.do_revalidation || [];

              return (
                <div
                  key={container.container_number}
                  style={{ marginBottom: "8px" }}
                >
                  {revalidationData.length === 0 ? (
                    <div></div>
                  ) : (
                    revalidationData.map((item, index) => (
                      <div key={item._id} style={{ marginBottom: "4px" }}>
                        {containerIndex + 1}.{index + 1}.{" "}
                        {item.do_revalidation_upto || "N/A"}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </React.Fragment>
        );
      },
    },
    {
      accessorKey: "Doc",
      header: "Docs",
      enableSorting: false,
      size: 150,
      Cell: ({ cell }) => {
        const { processed_be_attachment, cth_documents, checklist } =
          cell.row.original;

        const getFirstLink = (input) => {
          if (Array.isArray(input)) {
            return input.length > 0 ? input[0] : null;
          }
          return input || null;
        };

        const checklistLink = getFirstLink(checklist);
        const processed_be_attachmentLink = getFirstLink(
          processed_be_attachment
        );

        return (
          <div style={{ textAlign: "left" }}>
            {checklistLink ? (
              <div style={{ marginBottom: "5px" }}>
                <a
                  href={checklistLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "blue",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  Checklist
                </a>
              </div>
            ) : (
              <div style={{ marginBottom: "5px" }}>
                <span style={{ color: "gray" }}>No Checklist </span>
              </div>
            )}
            {processed_be_attachmentLink ? (
              <div style={{ marginBottom: "5px" }}>
                <a
                  href={processed_be_attachmentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "blue",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  Processed Copy of BE no.
                </a>
              </div>
            ) : (
              <div style={{ marginBottom: "5px" }}>
                <span style={{ color: "gray" }}>Processed Copy of BE no.</span>
              </div>
            )}

            {cth_documents &&
              cth_documents.some(
                (doc) =>
                  doc.url &&
                  doc.url.length > 0 &&
                  (doc.document_name === "Pre-Shipment Inspection Certificate" ||
                    doc.document_name === "Bill of Lading")
              ) ? (
              cth_documents
                .filter(
                  (doc) =>
                    doc.url &&
                    doc.url.length > 0 &&
                    (doc.document_name ===
                      "Pre-Shipment Inspection Certificate" ||
                      doc.document_name === "Bill of Lading")
                )
                .map((doc) => (
                  <div key={doc._id} style={{ marginBottom: "5px" }}>
                    <a
                      href={doc.url[0]}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "blue",
                        textDecoration: "underline",
                        cursor: "pointer",
                      }}
                    >
                      {doc.document_name}
                    </a>
                  </div>
                ))
            ) : (
              <span style={{ color: "gray" }}>
                No Pre-Shipment Inspection Certificate <br />
                No Bill of Lading
              </span>
            )}
          </div>
        );
      },
    },
  ];

  const table = useMaterialReactTable({
    columns,
    data: rows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enableDensityToggle: false,
    initialState: {
      density: "compact",
      columnPinning: { left: ["job_no"] },
    },
    enableGrouping: true,
    enableGlobalFilter: false,
    enableColumnFilters: false,
    enableColumnActions: false,
    enablePagination: false,
    enableStickyHeader: true,
    enablePinning: true,
    enableBottomToolbar: false,
    muiTableContainerProps: {
      sx: { maxHeight: "650px", overflowY: "auto" },
    },
    muiTableBodyRowProps: ({ row }) => ({
      className: getTableRowsClassname(row),
      style: getTableRowInlineStyle(row),
    }),
    muiTableHeadCellProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 1,
      },
    },
    renderTopToolbarCustomActions: () => (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          gap: "16px",
          padding: "16px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          marginBottom: "8px",
        }}
      >
        {/* First Row - Header and Counts */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #e0e0e0",
            paddingBottom: "12px",
          }}
        >
          <DoDocCountsDisplay />

          <Tooltip title="Show Today's Planning Jobs">
            <IconButton
              onClick={() => setShowDoPlanningTodayOnly((prev) => !prev)}
              sx={{
                backgroundColor: showDoPlanningTodayOnly ? '#e3f2fd' : 'transparent',
                border: showDoPlanningTodayOnly ? '1px solid #1976d2' : '1px solid transparent',
                borderRadius: '50%',
                padding: '8px'
              }}
            >
              <Badge badgeContent={doPlanningTodayCount} color="error">
                <NotificationsIcon color={showDoPlanningTodayOnly ? "primary" : "action"} />
              </Badge>
            </IconButton>
          </Tooltip>
        </div>

        {/* Second Row - Filters */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            alignItems: "end",
          }}
        >
          <Autocomplete
            size="small"
            options={importerNames.map((option) => option.label)}
            value={selectedImporter || ""}
            onInputChange={(event, newValue) => setSelectedImporter(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                label="Select Importer"
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "white",
                  },
                }}
              />
            )}
          />

          <TextField
            select
            size="small"
            value={selectedYearState}
            onChange={(e) => setSelectedYearState(e.target.value)}
            label="Financial Year"
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "white",
              },
            }}
          >
            {years.map((year, index) => (
              <MenuItem key={`year-${year}-${index}`} value={year}>
                {year}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            variant="outlined"
            label="ICD Location"
            value={selectedICD}
            onChange={(e) => {
              setSelectedICD(e.target.value);
              setCurrentPage(1);
            }}
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "white",
              },
            }}
          >
            <MenuItem value="">All ICDs</MenuItem>
            <MenuItem value="ICD SANAND">ICD SANAND</MenuItem>
            <MenuItem value="ICD KHODIYAR">ICD KHODIYAR</MenuItem>
            <MenuItem value="ICD SACHANA">ICD SACHANA</MenuItem>
          </TextField>

          <TextField
            select
            size="small"
            variant="outlined"
            label="Status Filter"
            value={selectedStatusFilter}
            onChange={handleStatusFilterChange}
            fullWidth
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "white",
              },
            }}
          >
            {statusFilterOptions.map((option, index) => (
              <MenuItem
                key={`status-${option.value}-${index}`}
                value={option.value}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingRight: "16px",
                }}
              >
                <span>{option.label}</span>
                <div
                  style={{
                    color: "#000000ff",
                    borderRadius: "100px",
                    minWidth: "24px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    fontWeight: "600",
                    marginLeft: "auto",
                    border: "2px solid #e41515ff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    letterSpacing: "0.5px",
                    transition: "all 0.2s ease",
                  }}
                >
                  {option.count}
                </div>
              </MenuItem>
            ))}
          </TextField>

          <div style={{ gridColumn: "span 2", minWidth: "300px" }}>
            <TextField
              placeholder="Search by Job No, Importer, AWB/BL Number..."
              size="small"
              variant="outlined"
              fullWidth
              value={searchQuery}
              onChange={handleSearchInputChange}
              label="Search"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => {
                        setDebouncedSearchQuery(searchQuery);
                        setCurrentPage(1);
                      }}
                      size="small"
                    >
                      <SearchIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "white",
                },
              }}
            />
          </div>





          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ position: "relative" }}>
              <Button
                variant="contained"
                size="small"
                onClick={() => setShowUnresolvedOnly((prev) => !prev)}
                sx={{
                  borderRadius: 3,
                  textTransform: "none",
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  padding: "8px 20px",
                  background:
                    "linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)",
                  color: "#ffffff",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(25, 118, 210, 0.3)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #1565c0 0%, #1976d2 100%)",
                    boxShadow: "0 6px 16px rgba(25, 118, 210, 0.4)",
                    transform: "translateY(-1px)",
                  },
                  "&:active": {
                    transform: "translateY(0px)",
                  },
                }}
              >
                {showUnresolvedOnly ? "Show All Jobs" : "Pending Queries"}
              </Button>
              <Badge
                badgeContent={unresolvedCount}
                color="error"
                overlap="circular"
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                sx={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  "& .MuiBadge-badge": {
                    fontSize: "0.75rem",
                    minWidth: "18px",
                    height: "18px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  },
                }}
              />
            </Box>
          </Box>
        </div>
      </div>
    ),
  });

  const getTableRowsClassname = (params) => {
    const status = params.original.payment_made;
    if (status !== "No" && status !== undefined) {
      return "payment_made";
    } else {
      return "";
    }
  };

  return (
    <div style={{ height: "80%" }}>
      {/* Notification Popover */}
      {/* Table */}
      <MaterialReactTable table={table} />

      {/* Pagination */}
      <Pagination
        count={totalPages}
        page={currentPage}
        onChange={handlePageChange}
        color="primary"
        sx={{ marginTop: "20px", display: "flex", justifyContent: "center" }}
      />
    </div>
  );
}

export default React.memo(DoPlanning);
