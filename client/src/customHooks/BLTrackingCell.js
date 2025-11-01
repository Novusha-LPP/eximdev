import React, { useState } from 'react';
import { IconButton } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShip, faAnchor } from '@fortawesome/free-solid-svg-icons';
import BLStatus from './BLStatus';
import SeaCargoStatus from './SeaCargoStatus';

const BLTrackingCell = ({
  blNumber,
  hblNumber,
  shippingLine,
  customHouse,
  container_nos,
  jobId,
  portOfReporting,
  containerNos,
  onCopy
}) => {
  const [isAirCargoDialogOpen, setIsAirCargoDialogOpen] = useState(false);
  const [isSeaCargoDialogOpen, setIsSeaCargoDialogOpen] = useState(false);
  const [selectedMawb, setSelectedMawb] = useState('');
  const [selectedBL, setSelectedBL] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  // Extract location code
  const locationCode = portOfReporting?.match(/\(([^)]+)\)/)?.[1] || portOfReporting;

  // Build shipping line URLs
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

  // Handle opening BL Status dialog
  const handleOpenAirCargoDialog = (event, mawbNumber) => {
    event.preventDefault();
    setSelectedMawb(mawbNumber);
    setIsAirCargoDialogOpen(true);
  };

  // Handle opening Sea Cargo dialog
  const handleOpenSeaCargoDialog = (event, blNo) => {
    event.preventDefault();
    setSelectedBL(blNo);
    setSelectedLocation(locationCode);
    setIsSeaCargoDialogOpen(true);
  };

  // Render number block with icons
  const renderNumberBlock = (num, label) => {
    if (!num) return null;

    const urls = buildShippingLineUrls(num);
    const url = urls[shippingLine] || "#";

    return (
      <div style={{ marginBottom: "12px" }}>
        {/* Number as clickable link - opens BL Status dialog */}
        <a
          href="#"
          onClick={(e) => handleOpenAirCargoDialog(e, num)}
          style={{
            cursor: 'pointer',
            color: '#1976d2',
            textDecoration: 'none',
            fontWeight: 500
          }}
          onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
          onMouseOut={(e) => e.target.style.textDecoration = 'none'}
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
          {/* Copy Number */}
          <IconButton
            size="small"
            onClick={(event) => onCopy?.(event, num)}
          >
            <abbr title={`Copy ${label}`}>
              <ContentCopyIcon fontSize="inherit" />
            </abbr>
          </IconButton>

          {/* Shipping Line Tracking Link */}
          {shippingLine && url !== "#" && (
            <abbr title={`Track Shipment at ${shippingLine}`}>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <FontAwesomeIcon icon={faShip} size="1x" color="blue" />
              </a>
            </abbr>
          )}

          {/* Sea Cargo Tracking Icon */}
          <abbr title={`Sea IGM Entry`}>
            <a
              href="#"
              onClick={(e) => handleOpenSeaCargoDialog(e, num)}
              style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            >
              <FontAwesomeIcon icon={faAnchor} size="1x" color="blue" />
            </a>
          </abbr>
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

      {/* BL Status Dialog */}
      <BLStatus
        isOpen={isAirCargoDialogOpen}
        jobId={jobId}
        customHouse={customHouse}
        container_nos={container_nos}
        onClose={() => setIsAirCargoDialogOpen(false)}
        mawbNumber={selectedMawb}
      />

      {/* Sea Cargo Status Dialog */}
      <SeaCargoStatus
        isOpen={isSeaCargoDialogOpen}
        onClose={() => setIsSeaCargoDialogOpen(false)}
        location={selectedLocation}
        masterBlNo={selectedBL}
      />
    </>
  );
};

export default BLTrackingCell;
