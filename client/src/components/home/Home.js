import React, { useContext, useEffect, useState } from "react";
import { UserContext } from "../../contexts/UserContext";
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

function Home() {
  const { user } = useContext(UserContext);
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
  const categorizedModules = data?.modules?.reduce((acc, module) => {
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

    fetchPendingCount();
    fetchPointsCount();
  }, []);

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
          .sort()
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
