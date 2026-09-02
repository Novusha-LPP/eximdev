import React, { useState, useContext, useMemo } from "react";
import { IconButton } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShip, faAnchor, faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import BLStatus from "./BLStatus";
import SeaCargoStatus from "./SeaCargoStatus";
import AirCargoStatus from "./AirCargoStatus";
import AirConsoleStatus from "./AirConsoleStatus";
import { BranchContext } from "../contexts/BranchContext";

// Static shipping line URL lookup to avoid object allocation per render
const getShippingLineUrl = (shippingLine, num, containerFirst) => {
  if (!shippingLine || !num) return "#";
  switch (shippingLine) {
    case "MSC":
    case "M S C":
    case "MSC LINE":
      return "https://www.msc.com/en/track-a-shipment";
    case "Maersk Line":
      return `https://www.maersk.com/tracking/${num}`;
    case "CMA CGM AGENCIES INDIA PVT. LTD":
    case "CMA CGM AGENCIES (INDIA) PVT. LTD":
      return "https://www.cma-cgm.com/ebusiness/tracking/search";
    case "Hapag-Lloyd":
      return `https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html?blno=${num}`;
    case "Trans Asia":
      return `http://182.72.192.230/TASFREIGHT/AppTasnet/ContainerTracking.aspx?&containerno=${containerFirst || ""}&blNo=${num}`;
    case "ONE LINE":
    case "Ocean Network Express (India) Private Limited":
    case "OCEAN NETWORK EXPRESS PTE LTD":
      return "https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking";
    case "HMM":
    case "HYUNDI":
      return "https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do";
    case "Cosco Container Lines":
    case "COSCO":
      return "https://elines.coscoshipping.com/ebusiness/cargotracking";
    case "Unifeeder Agencies India Pvt Ltd":
    case "UNIFEEDER":
      return num.length >= 8
        ? `https://www.unifeeder.cargoes.com/tracking?ID=${num.slice(0, 3)}%2F${num.slice(3, 6)}%2F${num.slice(6, 8)}%2F${num.slice(8)}`
        : "#";
    default:
      return "#";
  }
};

const BLTrackingCell = ({
  blNumber,
  hblNumber,
  blDate,
  hblDate,
  mbl_details,
  hbl_details,
  shippingLine,
  customHouse,
  container_nos,
  jobId,
  branch_code,
  mode,
  portOfReporting,
  containerNos,
  onCopy,
  onUpdateSuccess, // Add this prop to handle updates
  invalidateCache, // Add this prop for cache invalidation
  selectedYear, // Add this prop for the current year
}) => {
  const [isAirCargoDialogOpen, setIsAirCargoDialogOpen] = useState(false);
  const [isAirExtendedDialogOpen, setIsAirExtendedDialogOpen] = useState(false);
  const [isAirConsoleDialogOpen, setIsAirConsoleDialogOpen] = useState(false);
  const [isSeaCargoDialogOpen, setIsSeaCargoDialogOpen] = useState(false);
  const [selectedMawb, setSelectedMawb] = useState("");
  const [selectedBL, setSelectedBL] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [isExtended, setIsExtended] = useState(false);
  const [selectedHawb, setSelectedHawb] = useState("");

  const { branches } = useContext(BranchContext);
  const activeBranchConfig = useMemo(
    () => branches?.find(b => b.branch_code === branch_code)?.configuration || null,
    [branches, branch_code]
  );

  // Extract location code memoized
  const locationCode = useMemo(
    () => portOfReporting?.match(/\(([^)]+)\)/)?.[1] || portOfReporting || "",
    [portOfReporting]
  );

  const containerFirst = useMemo(
    () => containerNos?.[0]?.container_number || "",
    [containerNos]
  );

  // Handle opening BL Status dialog
  const handleOpenAirCargoDialog = (event, mawbNumber, hawbNumber = "") => {
    event.preventDefault();
    setSelectedMawb(mawbNumber);
    setSelectedHawb(hawbNumber);
    
    // Logic for AMD branch AIR mode
    if (branch_code?.startsWith('AMD') && mode === 'AIR') {
      setSelectedLocation('INAMD4');
      setIsAirExtendedDialogOpen(true);
    } else {
      setIsAirCargoDialogOpen(true);
    }
  };

  // Handle opening Sea Cargo dialog
  const handleOpenSeaCargoDialog = (event, blNo) => {
    event.preventDefault();
    setSelectedBL(blNo);
    
    // Logic for GIM branch
    if (branch_code?.startsWith('GIM')) {
      setSelectedLocation('INMUN1');
      setIsExtended(true);
    } else {
      setSelectedLocation(locationCode);
      setIsExtended(false);
    }
    
    setIsSeaCargoDialogOpen(true);
  };

  // Handle opening Air Console dialog
  const handleOpenAirConsoleDialog = (event, mawbNo) => {
    event.preventDefault();
    setSelectedMawb(mawbNo);
    
    // Logic for AMD branch
    if (branch_code?.startsWith('AMD')) {
      setSelectedLocation('INAMD4');
    } else {
      setSelectedLocation(locationCode);
    }
    
    setIsAirConsoleDialogOpen(true);
  };

  // Unified tracking handler
  const handleOpenTracking = (event, num, isHbl = false) => {
    const primaryMbl = blNumber || (typeof mblList[0] === 'object' ? mblList[0]?.mbl_no : mblList[0]) || "";
    if ((branch_code?.startsWith('AMD') || branch_code?.startsWith('BRD')) && mode === 'SEA') {
      // AMD and BRD SEA branch uses BL tracking
      if (isHbl) {
        handleOpenAirCargoDialog(event, primaryMbl || num, primaryMbl ? num : "");
      } else {
        handleOpenAirCargoDialog(event, num);
      }
    } else if (mode === 'SEA' || branch_code?.startsWith('GIM')) {
      handleOpenSeaCargoDialog(event, num);
    } else {
      if (isHbl) {
        handleOpenAirCargoDialog(event, primaryMbl || num, primaryMbl ? num : "");
      } else {
        handleOpenAirCargoDialog(event, num);
      }
    }
  };

  // Handle successful update from SeaCargoStatus
  const handleSeaCargoUpdate = (responseData) => {
    // Invalidate cache if function is provided
    if (invalidateCache && selectedYear) {
      invalidateCache(selectedYear);
    }

    // Call parent's update handler if provided
    if (onUpdateSuccess) {
      onUpdateSuccess(jobId, responseData.data);
    }
  };

  // Render number block with icons
  const renderNumberBlock = (num, label, dateStr, isHbl = false) => {
    if (!num) return null;

    const url = getShippingLineUrl(shippingLine, num, containerFirst);

    return (
      <div style={{ marginBottom: "10px", paddingBottom: "4px", borderBottom: "1px dashed #e0e0e0" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "6px" }}>
          {/* Number as clickable link - opens tracking dialog */}
          <a
            href="#"
            onClick={(e) => handleOpenTracking(e, num, isHbl)}
            style={{
              cursor: "pointer",
              color: "#1976d2",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "0.85rem",
            }}
            onMouseOver={(e) => (e.target.style.textDecoration = "underline")}
            onMouseOut={(e) => (e.target.style.textDecoration = "none")}
          >
            {num}
          </a>
          {dateStr && (
            <span style={{ fontSize: "0.72rem", color: "#666", whiteSpace: "nowrap" }}>
              {dateStr.slice(0, 10)}
            </span>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "2px",
          }}
        >
          {/* Copy Number */}
          <IconButton size="small" onClick={(event) => onCopy?.(event, num)} sx={{ p: 0.3 }}>
            <abbr title={`Copy ${label}`}>
              <ContentCopyIcon sx={{ fontSize: 14 }} />
            </abbr>
          </IconButton>

          {/* Shipping Line Tracking Link */}
          {shippingLine && url !== "#" && (
            <abbr title={`Track Shipment at ${shippingLine}`}>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <FontAwesomeIcon icon={faShip} size="sm" color="blue" />
              </a>
            </abbr>
          )}

          {/* Sea Cargo Tracking Icon */}
          <abbr title={`Sea IGM Entry`}>
            <a
              href="#"
              onClick={(e) => handleOpenSeaCargoDialog(e, num)}
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <FontAwesomeIcon icon={faAnchor} size="sm" color="blue" />
            </a>
          </abbr>

          {/* Air Console Tracking Icon */}
          {mode === 'AIR' && (
            <abbr title={`Air Console Master/House`}>
              <a
                href="#"
                onClick={(e) => handleOpenAirConsoleDialog(e, num)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <FontAwesomeIcon icon={faLayerGroup} size="sm" color="green" />
              </a>
            </abbr>
          )}
        </div>
      </div>
    );
  };

  // Extract all MBL items (memoized)
  const mblList = useMemo(() => {
    return Array.isArray(mbl_details) && mbl_details.length > 0
      ? mbl_details.filter(m => (typeof m === 'object' ? m?.mbl_no : m))
      : (blNumber ? [{ mbl_no: blNumber, mbl_date: blDate || "" }] : []);
  }, [mbl_details, blNumber, blDate]);

  // Extract all HBL items (memoized)
  const hblList = useMemo(() => {
    return Array.isArray(hbl_details) && hbl_details.length > 0
      ? hbl_details.filter(h => (typeof h === 'object' ? h?.hbl_no : h))
      : (hblNumber ? [{ hbl_no: hblNumber, hbl_date: hblDate || "" }] : []);
  }, [hbl_details, hblNumber, hblDate]);

  return (
    <>
      <div>
        {mblList.map((m, idx) => {
          const num = typeof m === 'object' ? m.mbl_no : m;
          const date = typeof m === 'object' ? m.mbl_date : "";
          return (
            <React.Fragment key={`mbl-track-${idx}-${num}`}>
              {renderNumberBlock(num, mblList.length > 1 ? `BL #${idx + 1}` : "BL Number", date, false)}
            </React.Fragment>
          );
        })}
        {hblList.map((h, idx) => {
          const num = typeof h === 'object' ? h.hbl_no : h;
          const date = typeof h === 'object' ? h.hbl_date : "";
          return (
            <React.Fragment key={`hbl-track-${idx}-${num}`}>
              {renderNumberBlock(num, hblList.length > 1 ? `HBL #${idx + 1}` : "HBL Number", date, true)}
            </React.Fragment>
          );
        })}
      </div>

      {/* BL Status Dialog - Lazy mounted */}
      {isAirCargoDialogOpen && (
        <BLStatus
          isOpen={isAirCargoDialogOpen}
          jobId={jobId}
          customHouse={customHouse}
          container_nos={container_nos}
          onClose={() => {
            setIsAirCargoDialogOpen(false);
            setSelectedHawb("");
          }}
          mawbNumber={selectedMawb}
          hawbNumber={selectedHawb}
        />
      )}

      {/* Air Cargo Status Dialog (Extended) - Lazy mounted */}
      {isAirExtendedDialogOpen && (
        <AirCargoStatus
          isOpen={isAirExtendedDialogOpen}
          jobId={jobId}
          onClose={() => setIsAirExtendedDialogOpen(false)}
          location={selectedLocation}
          mawbNumber={selectedMawb}
        />
      )}

      {/* Air Console Status Dialog - Lazy mounted */}
      {isAirConsoleDialogOpen && (
        <AirConsoleStatus
          isOpen={isAirConsoleDialogOpen}
          onClose={() => setIsAirConsoleDialogOpen(false)}
          location={selectedLocation}
          mawbNumber={selectedMawb}
        />
      )}

      {/* Sea Cargo Status Dialog - Lazy mounted */}
      {isSeaCargoDialogOpen && (
        <SeaCargoStatus
          isOpen={isSeaCargoDialogOpen}
          jobId={jobId}
          onClose={() => setIsSeaCargoDialogOpen(false)}
          location={selectedLocation}
          masterBlNo={selectedBL}
          isExtended={isExtended}
          branchCode={branch_code}
          onUpdateSuccess={handleSeaCargoUpdate}
          invalidateCache={invalidateCache}
          selectedYear={selectedYear}
          containers={containerNos}
          branchConfig={activeBranchConfig}
        />
      )}
    </>
  );
};

export default React.memo(BLTrackingCell);
