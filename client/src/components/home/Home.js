import React, { useContext, useEffect, useState } from "react";
import { UserContext } from "../../contexts/UserContext";
import { YearContext } from "../../contexts/yearContext.js";
import { Row, Col } from "react-bootstrap";
import "../../styles/home.scss";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { navigateToModule } from "../../utils/navigateToModule.js";
import { moduleCategories } from "../../utils/moduleCategories.js";
import { useSearchQuery } from "../../contexts/SearchQueryContext.js";
import { fetchMyPendingCount, searchOpenPointByUniqueId, fetchOpenPointSuggestions } from "../../services/openPointsService.js";



const importPriority = [
  "Import - DSR",
  "e-Sanchit",
  "Documentation",
  "Submission",
  "Import - DO",
  "Import - Operations",
  "Import - Add",
  "Import - Billing",
  "Billing Confirmation",
  "Import Utility Tool",
  "Report",
  "Audit Trail",
  "DGFT",
  "Open Points",
  "MasterDirectory",
];

const getModuleStyle = (module) => {
  const defaults = {
    icon: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="15" y2="17"></line></svg>,
    color: "#6366f1",
    bg: "#f5f3ff"
  };
  
  const map = {
    "Import - DSR": {
      color: "#0284c7",
      bg: "#f0f9ff",
      icon: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
    },
    "Import - DO": {
      color: "#0d9488",
      bg: "#f0fdfa",
      icon: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
    },
    "Import - Operations": {
      color: "#ea580c",
      bg: "#fff7ed",
      icon: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
    },
    "Import - Add": {
      color: "#2563eb",
      bg: "#eff6ff",
      icon: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
    },
    "Import - Billing": {
      color: "#16a34a",
      bg: "#f0fdf4",
      icon: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="12" y1="10" x2="12" y2="18"></line><line x1="8" y1="14" x2="16" y2="14"></line></svg>
    },
    "Import Utility Tool": {
      color: "#4f46e5",
      bg: "#eef2ff",
      icon: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
    },
    "Report": {
      color: "#9333ea",
      bg: "#faf5ff",
      icon: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
    },
    "Audit Trail": {
      color: "#4b5563",
      bg: "#f3f4f6",
      icon: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
    },
    "Export": {
      color: "#2563eb",
      bg: "#eff6ff",
      icon: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
    },
    "Employee Onboarding": {
      color: "#2563eb",
      bg: "#eff6ff",
      icon: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="17" y1="11" x2="23" y2="11"></line></svg>
    },
    "Employee KYC": {
      color: "#0891b2",
      bg: "#ecfeff",
      icon: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="9" cy="10" r="2"></circle><line x1="15" y1="9" x2="17" y2="9"></line><line x1="15" y1="13" x2="18" y2="13"></line><path d="M14 17H4v-1a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1z"></path></svg>
    },
    "Customer KYC": {
      color: "#0369a1",
      bg: "#f0f9ff",
      icon: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
    },
    "CRM": {
      color: "#db2777",
      bg: "#fdf2f8",
      icon: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
    },
    "Supplier Scorecard": {
      color: "#d97706",
      bg: "#fffbeb",
      icon: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
    },
    "AMC Suppliers Renewal": {
      color: "#dc2626",
      bg: "#fef2f2",
      icon: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
    },
    "AMC Visitor Logs": {
      color: "#0f766e",
      bg: "#f0fdfa",
      icon: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>
    },
    "Admin Equipment Checklist": {
      color: "#4f46e5",
      bg: "#eef2ff",
      icon: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
    },
    "Attendance": {
      color: "#059669",
      bg: "#ecfdf5",
      icon: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
    },
    "Open Points": {
      color: "#b91c1c",
      bg: "#fef2f2",
      icon: (color) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
    }
  };

  return map[module] || defaults;
};

function Home() {
  const { user } = useContext(UserContext);
  const { selectedYearState } = useContext(YearContext);
  const [data, setData] = useState();
  const navigate = useNavigate();

  // Get search context functions to clear all search state
  const {
    setSearchQuery,
    setDetailedStatus,
    setSelectedICD,
    setSelectedImporter
  } = useSearchQuery();

  // Clear all search queries when visiting the home page
  useEffect(() => {
    setSearchQuery("");
    setDetailedStatus("all");
    setSelectedICD("all");
    setSelectedImporter("");
  }, [setSearchQuery, setDetailedStatus, setSelectedICD, setSelectedImporter]);

  useEffect(() => {
    async function getUser() {
      try {
        const res = await axios(
          `${process.env.REACT_APP_API_STRING}/get-user/${user.username}`
        );
        setData(res.data);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    }

    getUser();
  }, [user]);

  let sopsGrouped = false;
  const isRabsUser = user?.company && /RABS/i.test(user.company);
  let userModulesList = data?.modules || [];
  let finalModulesList = [...userModulesList];

  if (!finalModulesList.includes("AMC Suppliers Renewal")) {
    finalModulesList.push("AMC Suppliers Renewal");
  }
  if (!finalModulesList.includes("AMC Visitor Logs")) {
    finalModulesList.push("AMC Visitor Logs");
  }
  if (!finalModulesList.includes("Admin Equipment Checklist")) {
    finalModulesList.push("Admin Equipment Checklist");
  }
  if (isRabsUser && !finalModulesList.includes("First Aid")) {
    finalModulesList.push("First Aid");
  }

  const categorizedModules = finalModulesList.reduce((acc, module) => {
    // Restrict 5S Audit card to RABS Admin and HOD users only
    if (module === "5S Audit") {
      const isRabs = user?.company && /RABS/i.test(user.company);
      const isAdminOrHod = user?.role === "Admin" || user?.role === "Head_of_Department" || user?.role === "HOD" || user?.isHOD;
      if (!(isRabs && isAdminOrHod)) {
        return acc;
      }
    }

    // Restrict First Aid card to RABS Admin and HOD users only
    if (module === "First Aid") {
      const isRabs = user?.company && /RABS/i.test(user.company);
      const isAdminOrHod = user?.role === "Admin" || user?.role === "Head_of_Department" || user?.role === "HOD" || user?.isHOD;
      if (!(isRabs && isAdminOrHod)) {
        return acc;
      }
    }

    if (["RM Procurement SOP", "Tyre Procurement SOP", "Fleet Insurance SOP"].includes(module)) {
      if (!sopsGrouped) {
        const category = "Accounts";
        if (!acc[category]) acc[category] = [];
        acc[category].push("Procurement & Insurance SOPs");
        sopsGrouped = true;
      }
      return acc;
    }

    if (module === "Accounts") {
      const category = "Accounts";
      if (!acc[category]) acc[category] = [];
      if (!acc[category].includes("Accounts")) acc[category].push("Accounts");
      if (!acc[category].includes("Pricing Requests")) acc[category].push("Pricing Requests");
      return acc;
    }
    const category = moduleCategories[module] || "Uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(module);
    return acc;
  }, {});

  const sortImports = (modules) => {
    return modules.sort((a, b) => {
      const indexA = importPriority.indexOf(a);
      const indexB = importPriority.indexOf(b);
      return indexA - indexB;
    });
  };

  const [pendingDocCount, setPendingDocCount] = useState(0);
  const [openPointsCount, setOpenPointsCount] = useState(0);
  const [billingConfirmCount, setBillingConfirmCount] = useState(0);

  useEffect(() => {
    async function fetchPendingCount() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/document-requests/count/pending`
        );
        setPendingDocCount(res.data.count);
      } catch (err) {
        console.error("Error fetching pending doc count:", err);
      }
    }

    async function fetchPointsCount() {
      try {
        const res = await fetchMyPendingCount();
        setOpenPointsCount(res.count);
      } catch (err) {
        console.error("Error fetching open points count:", err);
      }
    }

    async function fetchBillingConfirmCount() {
      if (user && (user.role === "Admin" || user.modules?.includes("Billing Confirmation"))) {
        try {
          const year = selectedYearState || localStorage.getItem("selectedYear") || "25-26";
          const res = await axios.get(
            `${process.env.REACT_APP_API_STRING}/${year}/jobs/Billing_Confirmation/all/all/all?page=1&limit=1`,
            {
              headers: {
                ...(user?.username ? { "x-username": user.username } : {}),
              },
            }
          );
          setBillingConfirmCount(res.data.total || 0);
        } catch (err) {
          console.error("Error fetching billing confirmation count:", err);
        }
      }
    }

    fetchPendingCount();
    fetchPointsCount();
    fetchBillingConfirmCount();
  }, [selectedYearState, user]);

  const [searchQueryId, setSearchQueryId] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Autocomplete suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [hoveredSugId, setHoveredSugId] = useState(null);

  // Debounced search query suggestions hook
  useEffect(() => {
    if (!searchQueryId.trim()) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const data = await fetchOpenPointSuggestions(searchQueryId.trim());
        setSuggestions(data || []);
      } catch (err) {
        console.error("Error loading suggestions", err);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchQueryId]);

  // Position state for the draggable floating search dock
  const [position, setPosition] = useState({ 
    x: typeof window !== "undefined" ? window.innerWidth / 2 - 27 : 500, 
    y: 15 
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Update position if window resizes to keep it centered unless already dragged
  useEffect(() => {
    const handleResize = () => {
      if (!isDragging) {
        const dockWidth = isHovered || isFocused || searchQueryId ? 420 : 54;
        setPosition({
          x: window.innerWidth / 2 - (dockWidth / 2),
          y: 15
        });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isHovered, isFocused, searchQueryId, isDragging]);

  // Window mousemove and mouseup to handle smooth dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const dockWidth = isHovered || isFocused || searchQueryId ? 420 : 54;
        setPosition({
          x: Math.max(10, Math.min(window.innerWidth - dockWidth - 10, e.clientX - dragStart.x)),
          y: Math.max(10, Math.min(window.innerHeight - 70, e.clientY - dragStart.y))
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart, isHovered, isFocused, searchQueryId]);

  const startDrag = (e) => {
    // If user is clicking the input or buttons, let them interact with them
    if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'button' || e.target.tagName.toLowerCase() === 'svg' || e.target.tagName.toLowerCase() === 'path') {
      return;
    }
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.preventDefault();
  };

  const handleGlobalSearch = async (e) => {
    e.preventDefault();
    if (!searchQueryId.trim()) return;
    setSearchLoading(true);
    setSearchError("");
    try {
      const res = await searchOpenPointByUniqueId(searchQueryId.trim());
      if (res.found && res.projectId && res.pointId) {
        navigate(`/open-points/project/${res.projectId}?searchPointId=${res.pointId}`);
      } else {
        setSearchError("Open point not found.");
      }
    } catch (err) {
      console.error(err);
      setSearchError(err.response?.data?.error || "Error finding open point. Verify the ID format (e.g., 'ET-1').");
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div>
      <style>{`
        @keyframes fadeInError {
          from { opacity: 0; transform: translate(-50%, -8px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes fadeInDropdown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* Centered Futuristic Draggable Vista/Apple-like Search Dock */}
      <div 
        onMouseDown={startDrag}
        style={{ 
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 99999, // Floating on top of everything!
          cursor: isDragging ? "grabbing" : (isHovered || isFocused ? "default" : "grab"),
          transition: isDragging ? "none" : "width 0.5s cubic-bezier(0.16, 1, 0.3, 1), left 0.5s cubic-bezier(0.16, 1, 0.3, 1), top 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          userSelect: "none"
        }}
      >
        <form 
          onSubmit={handleGlobalSearch}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            height: "54px",
            borderRadius: "27px",
            // Vista/Apple Aero glass styling
            background: (isHovered || isFocused) 
              ? "rgba(255, 255, 255, 0.28)" 
              : "rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(28px) saturate(180%)",
            WebkitBackdropFilter: "blur(28px) saturate(180%)",
            border: (isHovered || isFocused)
              ? "1px solid rgba(255, 255, 255, 0.5)"
              : "1px solid rgba(255, 255, 255, 0.25)",
            boxShadow: (isHovered || isFocused)
              ? "0 20px 40px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.5)"
              : "0 8px 24px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.3)",
            padding: "4px 6px",
            width: (isHovered || isFocused || searchQueryId) ? "420px" : "54px",
            transition: "width 0.5s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease",
            overflow: "hidden",
            justifyContent: "space-between"
          }}
        >
          {/* Apple Dock Search Icon Circle */}
          <button 
            type="submit"
            onClick={(e) => {
              // Only trigger search if not dragging and is already expanded
              if (!searchQueryId.trim() && !(isHovered || isFocused)) {
                e.preventDefault();
                setIsFocused(true);
              }
            }}
            disabled={searchLoading}
            style={{
              background: (isHovered || isFocused)
                ? "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)"
                : "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.12) 100%)",
              borderRadius: "50%",
              width: "44px",
              height: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: (isHovered || isFocused) ? "0 6px 14px rgba(29, 78, 216, 0.35)" : "none",
              cursor: "pointer",
              flexShrink: 0,
              border: "none",
              outline: "none",
              transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              transform: isHovered && !(isHovered || isFocused) ? "scale(1.1)" : "scale(1)"
            }}
          >
            {searchLoading ? (
              <span 
                className="spinner-border spinner-border-sm" 
                role="status" 
                aria-hidden="true" 
                style={{ width: "16px", height: "16px", color: "white" }}
              ></span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={(isHovered || isFocused) ? "white" : "#1e293b"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            )}
          </button>

          {/* Search Input field that slides open */}
          <input 
            type="text" 
            placeholder="Search unique point ID..." 
            value={searchQueryId}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setTimeout(() => setIsFocused(false), 200);
            }}
            onChange={(e) => {
              setSearchQueryId(e.target.value);
              if (searchError) setSearchError("");
            }}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              color: "#0f172a",
              fontSize: "0.92rem",
              fontWeight: "700",
              marginLeft: "12px",
              width: (isHovered || isFocused || searchQueryId) ? "100%" : "0px",
              opacity: (isHovered || isFocused || searchQueryId) ? 1 : 0,
              transition: "width 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease",
              pointerEvents: (isHovered || isFocused || searchQueryId) ? "auto" : "none"
            }}
          />

          {/* Action buttons (Clear) inside glass dock */}
          {(isHovered || isFocused || searchQueryId) && searchQueryId && (
            <button 
              type="button" 
              onClick={(e) => {
                e.stopPropagation();
                setSearchQueryId("");
                setSearchError("");
              }}
              style={{
                border: "none",
                background: "rgba(0, 0, 0, 0.08)",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#475569",
                fontSize: "0.75rem",
                cursor: "pointer",
                marginRight: "8px",
                flexShrink: 0,
                transition: "background 0.2s ease"
              }}
              onMouseEnter={(e) => e.target.style.background = "rgba(0,0,0,0.15)"}
              onMouseLeave={(e) => e.target.style.background = "rgba(0,0,0,0.08)"}
            >
              ✕
            </button>
          )}
        </form>

        {/* Sleek Fading Aero Autocomplete Dropdown */}
        {suggestions.length > 0 && (isHovered || isFocused || searchQueryId) && (
          <div 
            style={{
              position: "absolute",
              top: "60px",
              left: "0",
              right: "0",
              background: "rgba(255, 255, 255, 0.28)",
              backdropFilter: "blur(28px) saturate(180%)",
              WebkitBackdropFilter: "blur(28px) saturate(180%)",
              borderRadius: "16px",
              border: "1px solid rgba(255, 255, 255, 0.4)",
              boxShadow: "0 12px 30px rgba(0, 0, 0, 0.15)",
              padding: "6px",
              maxHeight: "320px",
              overflowY: "auto",
              zIndex: 100000,
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              animation: "fadeInDropdown 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
            {suggestions.map((sug) => (
              <div
                key={sug._id}
                onClick={() => {
                  navigate(`/open-points/project/${sug.project_id}?searchPointId=${sug._id}`);
                  setSearchQueryId("");
                  setSuggestions([]);
                }}
                onMouseEnter={() => setHoveredSugId(sug._id)}
                onMouseLeave={() => setHoveredSugId(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  background: hoveredSugId === sug._id ? "rgba(37, 99, 235, 0.15)" : "transparent",
                  transition: "background 0.2s ease",
                  textAlign: "left"
                }}
              >
                <span style={{ 
                  fontFamily: "monospace", 
                  fontWeight: "800", 
                  color: "#1d4ed8", 
                  fontSize: "0.88rem",
                  marginRight: "12px",
                  flexShrink: 0
                }}>
                  {sug.unique_id}
                </span>
                <span style={{ 
                  flex: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontSize: "0.85rem",
                  color: "#334155",
                  fontWeight: "600"
                }}>
                  {sug.title}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Center floating error message below dock */}
        {searchError && (
          <div style={{
            position: "absolute",
            top: "64px",
            left: "50%",
            transform: "translateX(-50%)",
            color: "#dc2626",
            fontSize: "0.82rem",
            fontWeight: "700",
            background: "rgba(254, 242, 242, 0.95)",
            backdropFilter: "blur(8px)",
            padding: "6px 14px",
            borderRadius: "20px",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            boxShadow: "0 8px 24px rgba(220, 38, 38, 0.12)",
            zIndex: 100000,
            whiteSpace: "nowrap",
            animation: "fadeInError 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>
            ⚠️ {searchError}
          </div>
        )}
      </div>
      {categorizedModules &&
        Object.keys(categorizedModules)
          .filter((category) => category !== "Uncategorized")
          .sort((a, b) => {
            if (a === "AMC Suppliers Renewal Sheet") return 1;
            if (b === "AMC Suppliers Renewal Sheet") return -1;
            return a.localeCompare(b);
          })
          .map((category, idx) => (
            <div key={idx}>
              <br />
              <h6 style={{ marginBottom: 0, color: "#5B5E5F" }}>
                <strong>{category}</strong>
              </h6>
              <hr style={{ margin: "5px 0" }} />
              <Row>
                {(category === "DSR Module"
                  ? sortImports(categorizedModules[category])
                  : categorizedModules[category].sort()
                ).map((module, id) => (
                  <Col xs={12} md={4} lg={2} key={id} className="module-col">
                    <div
                      className="module-col-inner"
                      style={{ position: "relative" }}
                      onClick={() => navigateToModule(module, navigate)}
                    >
                      <p>{module}</p>
                      {module === "Document Collection" && pendingDocCount > 0 && (
                        <span
                          style={{
                            position: "absolute",
                            top: "-10px",
                            right: "-10px",
                            backgroundColor: "#ef4444",
                            color: "white",
                            borderRadius: "50%",
                            width: "22px",
                            height: "22px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "11px",
                            fontWeight: "bold",
                            border: "2px solid white",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                            zIndex: 10,
                          }}
                        >
                          {pendingDocCount}
                        </span>
                      )}
                      {module === "Open Points" && openPointsCount > 0 && (
                        <span
                          style={{
                            position: "absolute",
                            top: "-10px",
                            right: "-10px",
                            backgroundColor: "#ef4444",
                            color: "white",
                            borderRadius: "50%",
                            width: "22px",
                            height: "22px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "11px",
                            fontWeight: "bold",
                            border: "2px solid white",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                            zIndex: 10,
                          }}
                        >
                          {openPointsCount}
                        </span>
                      )}
                      {module === "Billing Confirmation" && billingConfirmCount > 0 && (
                        <span
                          style={{
                            position: "absolute",
                            top: "-10px",
                            right: "-10px",
                            backgroundColor: "#ef4444",
                            color: "white",
                            borderRadius: "50%",
                            width: "22px",
                            height: "22px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "11px",
                            fontWeight: "bold",
                            border: "2px solid white",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                            zIndex: 10,
                          }}
                        >
                          {billingConfirmCount}
                        </span>
                      )}
                    </div>
                  </Col>
                ))}
              </Row>
            </div>
          ))}
    </div>
  );
}

export default React.memo(Home);
