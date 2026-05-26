import React, { useState, useContext } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShip, faAnchor, faLayerGroup, faCopy } from "@fortawesome/free-solid-svg-icons";
import BLStatus from "./BLStatus";
import SeaCargoStatus from "./SeaCargoStatus";
import AirCargoStatus from "./AirCargoStatus";
import AirConsoleStatus from "./AirConsoleStatus";
import { BranchContext } from "../contexts/BranchContext";

const BLTrackingCell = ({
  blNumber,
  hblNumber,
  shippingLine,
  customHouse,
  container_nos,
  jobId,
  branch_code,
  mode,
  portOfReporting,
  containerNos,
  onCopy,
  onUpdateSuccess,
  invalidateCache,
  selectedYear,
}) => {
  const [isAirCargoDialogOpen, setIsAirCargoDialogOpen] = useState(false);
  const [isAirExtendedDialogOpen, setIsAirExtendedDialogOpen] = useState(false);
  const [isAirConsoleDialogOpen, setIsAirConsoleDialogOpen] = useState(false);
  const [isSeaCargoDialogOpen, setIsSeaCargoDialogOpen] = useState(false);
  const [selectedMawb, setSelectedMawb] = useState("");
  const [selectedBL, setSelectedBL] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [isExtended, setIsExtended] = useState(false);

  const { branches } = useContext(BranchContext);
  const activeBranchConfig = branches?.find(b => b.branch_code === branch_code)?.configuration || null;

  const locationCode =
    portOfReporting?.match(/\(([^)]+)\)/)?.[1] || portOfReporting;

  const containerFirst = containerNos?.[0]?.container_number || "";

  const buildShippingLineUrls = (num) => ({
    MSC: `https://www.msc.com/en/track-a-shipment`,
    "M S C": `https://www.msc.com/en/track-a-shipment`,
    "MSC LINE": `https://www.msc.com/en/track-a-shipment`,
    "Maersk Line": `https://www.maersk.com/tracking/${num}`,
    "CMA CGM AGENCIES INDIA PVT. LTD":
      "https://www.cma-cgm.com/ebusiness/tracking/search",
    "Hapag-Lloyd": `https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html?blno=${num}`,
    "Trans Asia": `http://182.72.192.230/TASFREIGHT/AppTasnet/ContainerTracking.aspx?&containerno=${containerFirst}&blNo=${num}`,
    "ONE LINE":
      "https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking",
    HMM: "https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do",
    HYUNDI:
      "https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do",
    "Cosco Container Lines":
      "https://elines.coscoshipping.com/ebusiness/cargotracking",
    COSCO: "https://elines.coscoshipping.com/ebusiness/cargotracking",
    "Unifeeder Agencies India Pvt Ltd": num
      ? `https://www.unifeeder.cargoes.com/tracking?ID=${num.slice(
          0,
          3
        )}%2F${num.slice(3, 6)}%2F${num.slice(6, 8)}%2F${num.slice(8)}`
      : "#",
    UNIFEEDER: num
      ? `https://www.unifeeder.cargoes.com/tracking?ID=${num.slice(
          0,
          3
        )}%2F${num.slice(3, 6)}%2F${num.slice(6, 8)}%2F${num.slice(8)}`
      : "#",
  });

  const handleOpenAirCargoDialog = (event, mawbNumber) => {
    event.preventDefault();
    setSelectedMawb(mawbNumber);
    if (branch_code?.startsWith('AMD') && mode === 'AIR') {
      setSelectedLocation('INAMD4');
      setIsAirExtendedDialogOpen(true);
    } else {
      setIsAirCargoDialogOpen(true);
    }
  };

  const handleOpenSeaCargoDialog = (event, blNo) => {
    event.preventDefault();
    setSelectedBL(blNo);
    if (branch_code?.startsWith('GIM')) {
      setSelectedLocation('INMUN1');
      setIsExtended(true);
    } else {
      setSelectedLocation(locationCode);
      setIsExtended(false);
    }
    setIsSeaCargoDialogOpen(true);
  };

  const handleOpenAirConsoleDialog = (event, mawbNo) => {
    event.preventDefault();
    setSelectedMawb(mawbNo);
    if (branch_code?.startsWith('AMD')) {
      setSelectedLocation('INAMD4');
    } else {
      setSelectedLocation(locationCode);
    }
    setIsAirConsoleDialogOpen(true);
  };

  const handleOpenTracking = (event, num) => {
    if ((branch_code?.startsWith('AMD') || branch_code?.startsWith('BRD')) && mode === 'SEA') {
      handleOpenAirCargoDialog(event, num);
    } else if (mode === 'SEA' || branch_code?.startsWith('GIM')) {
      handleOpenSeaCargoDialog(event, num);
    } else {
      handleOpenAirCargoDialog(event, num);
    }
  };

  const handleSeaCargoUpdate = (responseData) => {
    if (invalidateCache && selectedYear) {
      invalidateCache(selectedYear);
    }
    if (onUpdateSuccess) {
      onUpdateSuccess(jobId, responseData.data);
    }
  };

  const renderNumberBlock = (num, label) => {
    if (!num) return null;

    const urls = buildShippingLineUrls(num);
    const url = urls[shippingLine] || "#";

    return (
      <div style={{ marginBottom: "12px" }}>
        <a
          href="#"
          onClick={(e) => handleOpenTracking(e, num)}
          style={{
            cursor: "pointer",
            color: "#1976d2",
            textDecoration: "none",
            fontWeight: 500,
          }}
          onMouseOver={(e) => (e.target.style.textDecoration = "underline")}
          onMouseOut={(e) => (e.target.style.textDecoration = "none")}
        >
          {num}
        </a>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginTop: "4px",
          }}
        >
          <button
            className="icon-btn"
            title={`Copy ${label}`}
            onClick={(event) => onCopy?.(event, num)}
          >
            <FontAwesomeIcon icon={faCopy} size="sm" />
          </button>

          {shippingLine && url !== "#" && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title={`Track Shipment at ${shippingLine}`}
              style={{ display: "inline-flex", alignItems: "center" }}
            >
              <FontAwesomeIcon icon={faShip} size="sm" color="#1976d2" />
            </a>
          )}

          <a
            href="#"
            onClick={(e) => handleOpenSeaCargoDialog(e, num)}
            title="Sea IGM Entry"
            style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}
          >
            <FontAwesomeIcon icon={faAnchor} size="sm" color="#1976d2" />
          </a>

          {mode === 'AIR' && (
            <a
              href="#"
              onClick={(e) => handleOpenAirConsoleDialog(e, num)}
              title="Air Console Master/House"
              style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}
            >
              <FontAwesomeIcon icon={faLayerGroup} size="sm" color="#2e7d32" />
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div>
        {blNumber && renderNumberBlock(blNumber, "BL Number")}
        {hblNumber && renderNumberBlock(hblNumber, "HBL Number")}
      </div>

      <BLStatus
        isOpen={isAirCargoDialogOpen}
        jobId={jobId}
        customHouse={customHouse}
        container_nos={container_nos}
        onClose={() => setIsAirCargoDialogOpen(false)}
        mawbNumber={selectedMawb}
      />

      <AirCargoStatus
        isOpen={isAirExtendedDialogOpen}
        jobId={jobId}
        onClose={() => setIsAirExtendedDialogOpen(false)}
        location={selectedLocation}
        mawbNumber={selectedMawb}
      />

      <AirConsoleStatus
        isOpen={isAirConsoleDialogOpen}
        onClose={() => setIsAirConsoleDialogOpen(false)}
        location={selectedLocation}
        mawbNumber={selectedMawb}
      />

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
    </>
  );
};

export default BLTrackingCell;
