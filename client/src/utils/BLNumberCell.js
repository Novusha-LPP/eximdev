// BLNumberCell.jsx
import React, { useMemo, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShip, faAnchor } from "@fortawesome/free-solid-svg-icons";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import IconButton from "@mui/material/IconButton";
import { shippingLineUrls } from "./shippingLineUrls";

const BLNumberCell = ({
  blNumber,
  portOfReporting,
  shippingLine,
  containerNos,
  line_no
}) => {
  const containerFirst = containerNos?.[0]?.container_number;

  // Memoized function to get the port location
  const getPortLocation = useCallback((port) => {
    const portMap = {
      "(INMUN1) Mundra Sea": "MUNDRA SEA (INMUN1)",
      "(INNSA1) Nhava Sheva Sea": "NHAVA SHEVA SEA (INNSA1)",
      "(INPAV1) Pipavav": "PIPAVAV - VICTOR PORT GUJARAT SEA (INPAV1)",
      "(INPAV6) Pipavav (Victor) Port":
        "PIPAVAV - VICTOR PORT GUJARAT SEA (INPAV1)",
      "(INHZA1) Hazira": "HAZIRA PORT SURAT (INHZA1)",
    };
    return portMap[port] || "Unknown Location";
  }, []);

  const location = getPortLocation(portOfReporting);

  const shippingLineUrl =
    typeof shippingLineUrls[shippingLine] === "function"
      ? shippingLineUrls[shippingLine](blNumber, containerFirst)
      : shippingLineUrls[shippingLine] || "#";

  const handleCopy = (event, text) => {
    // Optimized handleCopy function using useCallback to avoid re-creation on each render

    event.stopPropagation();

    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          console.log("Text copied to clipboard:", text);
        })
        .catch((err) => {
          alert("Failed to copy text to clipboard.");
          console.error("Failed to copy:", err);
        });
    } else {
      // Fallback approach for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        console.log("Text copied to clipboard using fallback method:", text);
      } catch (err) {
        alert("Failed to copy text to clipboard.");
        console.error("Fallback copy failed:", err);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <>
      <a
        href={`https://enquiry.icegate.gov.in/enquiryatices/blStatusIces?mawbNo=${blNumber}&HAWB_NO=`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {blNumber}
      </a>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <IconButton
          size="small"
          onClick={(event) => handleCopy(event, blNumber)}
        >
          <abbr title="Copy BL Number">
            <ContentCopyIcon fontSize="inherit" />
          </abbr>
        </IconButton>

        {shippingLine && shippingLineUrl !== "#" && (
          <abbr title={`Track Shipment at ${shippingLine}`}>
            <a href={shippingLineUrl} target="_blank" rel="noopener noreferrer">
              <FontAwesomeIcon icon={faShip} size="1x" color="blue" />
            </a>
          </abbr>
        )}

        <abbr title={`Sea IGM Entry at ${location}`}>
          <a
            href={`https://enquiry.icegate.gov.in/enquiryatices/seaIgmEntry?IGM_loc_Name=${location}&MAWB_NO=${blNumber}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FontAwesomeIcon icon={faAnchor} size="1x" color="blue" />
          </a>
        </abbr>
      </div>
      <div>{shippingLine}</div>
    </>
  );
};

export default BLNumberCell;
