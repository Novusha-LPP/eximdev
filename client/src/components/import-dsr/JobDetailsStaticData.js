import React, { useMemo, useCallback } from "react";
import { Row, Col } from "react-bootstrap";
import { IconButton } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { handleCopyText } from "../../utils/handleCopyText";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShip, faAnchor } from "@fortawesome/free-solid-svg-icons";

function JobDetailsStaticData(props) {
  if (props.data) {
    const inv_value = (props.data.cif_amount / props.data.exrate).toFixed(2);
    var invoice_value_and_unit_price = `${props.data.inv_currency} ${inv_value} | ${props.data.unit_price}`;
  }

  if (props.container_nos) {
    var net_weight = props.container_nos?.reduce((sum, container) => {
      const weight = parseFloat(container.net_weight);
      return sum + (isNaN(weight) ? 0 : weight);
    }, 0);
  }

  // const handleCopy = (event, text) => {
  //   event.stopPropagation();

  //   if (
  //     navigator.clipboard &&
  //     typeof navigator.clipboard.writeText === "function"
  //   ) {
  //     navigator.clipboard
  //       .writeText(text)
  //       .then(() => {
  //         console.log("Text copied to clipboard:", text);
  //       })
  //       .catch((err) => {
  //         alert("Failed to copy text to clipboard.");
  //         console.error("Failed to copy:", err);
  //       });
  //   } else {
  //     // Fallback approach for older browsers
  //     const textArea = document.createElement("textarea");
  //     textArea.value = text;
  //     document.body.appendChild(textArea);
  //     textArea.focus();
  //     textArea.select();
  //     try {
  //       document.execCommand("copy");
  //       console.log("Text copied to clipboard using fallback method:", text);
  //     } catch (err) {
  //       alert("Failed to copy text to clipboard.");
  //       console.error("Fallback copy failed:", err);
  //     }
  //     document.body.removeChild(textArea);
  //   }
  // };
  const getShippingLineUrl = (shippingLine, blNumber, containerFirst) => {
    const shippingLineUrls = {
      MSC: `https://www.msc.com/en/track-a-shipment`,
      "M S C": `https://www.msc.com/en/track-a-shipment`,
      "MSC LINE": `https://www.msc.com/en/track-a-shipment`,
      "Maersk Line": `https://www.maersk.com/tracking/${blNumber}`,
      "CMA CGM AGENCIES INDIA PVT. LTD":
        "https://www.cma-cgm.com/ebusiness/tracking/search",
      "Hapag-Lloyd": `https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html?blno=${blNumber}`,
      "Trans Asia": `http://182.72.192.230/TASFREIGHT/AppTasnet/ContainerTracking.aspx?&containerno=${containerFirst}&blNo=${blNumber}`,
      "ONE LINE":
        "https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking",

      HMM: "https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do",
      HYUNDI:
        "https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do",
      "Cosco Container Lines":
        "https://elines.coscoshipping.com/ebusiness/cargotracking",
      COSCO: "https://elines.coscoshipping.com/ebusiness/cargotracking",
      "Unifeeder Agencies India Pvt Ltd": `https://www.unifeeder.cargoes.com/tracking?ID=${blNumber.slice(
        0,
        3
      )}%2F${blNumber.slice(3, 6)}%2F${blNumber.slice(6, 8)}%2F${blNumber.slice(
        8
      )}`,
      UNIFEEDER: `https://www.unifeeder.cargoes.com/tracking?ID=${blNumber.slice(
        0,
        3
      )}%2F${blNumber.slice(3, 6)}%2F${blNumber.slice(6, 8)}%2F${blNumber.slice(
        8
      )}`,
    };
    return shippingLineUrls[shippingLine] || "#";
  };
  // Memoized utility functions to avoid unnecessary re-calculations
  const getPortLocation = useMemo(
    () => (portOfReporting) => {
      const portMap = {
        "(INMUN1) Mundra Sea": "MUNDRA SEA (INMUN1)",
        "(INNSA1) Nhava Sheva Sea": "NHAVA SHEVA SEA (INNSA1)",
        "(INPAV1) Pipavav": "PIPAVAV - VICTOR PORT GUJARAT SEA (INPAV1)",
        "(INPAV6) Pipavav (Victor) Port":
          "PIPAVAV - VICTOR PORT GUJARAT SEA (INPAV1)",
        "(INHZA1) Hazira": "HAZIRA PORT SURAT (INHZA1)",
      };
      return portMap[portOfReporting] || "";
    },
    []
  );

  const getCustomHouseLocation = useMemo(
    () => (customHouse) => {
      const houseMap = {
        "ICD SACHANA": "SACHANA ICD (INJKA6)",
        "ICD SANAND": "THAR DRY PORT ICD/AHMEDABAD GUJARAT ICD (INSAU6)",
        "ICD KHODIYAR": "AHEMDABAD ICD (INSBI6)",
      };
      return houseMap[customHouse] || customHouse;
    },
    []
  );

  const formatDate = useCallback((dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  }, []);

  return (
    <div className="job-details-container">
      <Row>
        <h4>
          Job Number:&nbsp;{props.params.job_no}&nbsp;|&nbsp;
          {props.data && `Custom House: ${props.data.custom_house}`}
          &nbsp;
          {props.data?.be_no ? (
            // Render BE No if it exists
            <>&nbsp;</>
          ) : (
            // Render Priority Job if BE No does not exist
            props.data?.priorityJob &&
            (props.data.priorityJob === "High Priority" ||
              props.data.priorityJob === "Priority") && (
              <span
                style={{
                  display: "inline-block",
                  fontWeight: "bold",
                  fontStyle: "italic",
                  fontSize: "1.2rem",
                  color:
                    props.data.priorityJob === "High Priority"
                      ? "white"
                      : "black",
                  border: "2px solid",
                  borderColor:
                    props.data.priorityJob === "High Priority" ? "red" : "blue",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  backgroundColor:
                    props.data.priorityJob === "High Priority"
                      ? "rgba(255, 0, 0, 0.8)"
                      : "rgba(0, 0, 255, 0.2)",
                  marginTop: "10px",
                }}
              >
                {props.data.priorityJob}
              </span>
            )
          )}
        </h4>
      </Row>

      <Row
        className="job-detail-row"
        style={{
          padding: "20px", // Add padding for better spacing
          marginBottom: "15px", // Add spacing between rows
          backgroundColor: "#f8f9fa", // Light background color for visual distinction
          borderRadius: "8px", // Rounded corners for a modern look
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", // Subtle shadow for depth
        }}
      >
        <Col
          xs={12}
          lg={5}
          style={{
            borderRight: "2px solid #ddd", // Add a vertical separator
            paddingRight: "10px", // Add padding inside the column
          }}
        >
          <strong style={{ color: "#495057", fontSize: "1.1rem" }}>
            Payment Method:&nbsp;
          </strong>
          <span
            className="non-editable-text"
            style={{
              color: "#007bff", // Highlight the value in a blue color
              fontWeight: "600", // Semi-bold for emphasis
            }}
          >
            {props.data.payment_method}
          </span>
        </Col>

        <Col
          xs={12}
          lg={3}
          style={{
            borderRight: "2px solid #ddd", // Add a vertical separator
            paddingRight: "10px", // Add padding inside the column
          }}
        >
          <strong style={{ color: "#495057", fontSize: "1.1rem" }}>
            Clearance Under:&nbsp;
          </strong>
          <span
            className="non-editable-text"
            style={{
              color: "#007bff", // Use green to signify "clearance under" value
              fontWeight: "600",
            }}
          >
            {props.data.type_of_b_e === "Ex-Bond"
              ? props.data.exBondValue && props.data.exBondValue === "other"
                ? `${props.data.clearanceValue} `
                : `${props.data.clearanceValue} (${props.data.exBondValue})`
              : props.data.clearanceValue || "NA"}{" "}
          </span>
        </Col>

        <Col xs={12} lg={4}>
          <strong style={{ color: "#495057", fontSize: "1.1rem" }}>
            FTA Benefit:&nbsp;
          </strong>
          <span
            className="non-editable-text"
            style={{
              color: "#007bff", // Red to signify time-sensitive or critical information
              fontWeight: "600",
            }}
          >
            {isNaN(new Date(props.data.fta_Benefit_date_time).getTime()) ||
            props.data.fta_Benefit_date_time === ""
              ? `No (${props.data.origin_country})`
              : `Yes (${new Date(
                  props.data.fta_Benefit_date_time
                ).toLocaleString()}) (${props.data.origin_country})`}
          </span>
        </Col>
      </Row>

      {/*************************** Row 1 ****************************/}
      <Row className="job-detail-row">
        <Col xs={12} lg={5}>
          <strong>Importer:&nbsp;</strong>
          <span className="non-editable-text">{props.data.importer} - {props.data.ie_code_no}</span>
        </Col>
        <Col xs={12} lg={3}>
          <strong>Invoice No.:&nbsp;</strong>
          <span className="non-editable-text">{props.data.invoice_number}</span>
        </Col>
        <Col xs={12} lg={4}>
          <strong>Invoice Date:&nbsp;</strong>
          <span className="non-editable-text">{props.data.invoice_date}</span>
        </Col>
      </Row>
      {/*************************** Row 2 ****************************/}
      <Row className="job-detail-row">
        <Col xs={12} lg={5}>
          <strong>Invoice Value and Unit Price:&nbsp;</strong>
          <span className="non-editable-text">
            {invoice_value_and_unit_price}
          </span>
        </Col>
        {/* <Col xs={12} lg={3}>
          <strong>Bill Number:&nbsp;</strong>
          <span className="non-editable-text">{props.data.bill_no}</span>
        </Col> */}
        <Col xs={12} lg={3}>
          <strong>Origin Country:&nbsp;</strong>
          <span className="non-editable-text">{props.data.origin_country}</span>
        </Col>
        <Col xs={12} lg={3}>
          <strong>Supplier/Exporter:&nbsp;</strong>
          <span className="non-editable-text">
            {props.data.supplier_exporter}
          </span>
        </Col>
        {/* <Col xs={12} lg={4}>
          <strong>Bill Date:&nbsp;</strong>
          <span className="non-editable-text">{props.data.bill_date}</span>
        </Col> */}
      </Row>
      {/*************************** Row 3 ****************************/}
      <Row className="job-detail-row">
        <Col xs={12} lg={5}>
          <strong>POL:&nbsp;</strong>
          <span className="non-editable-text">{props.data.loading_port}</span>
        </Col>
        <Col xs={12} lg={3}>
          <strong>POD:&nbsp;</strong>
          <span className="non-editable-text">
            {props.data.port_of_reporting}
          </span>
        </Col>
        <Col xs={12} lg={4}>
          <strong>Shipping Line:&nbsp;</strong>
          <span className="non-editable-text">
            {props.data.shipping_line_airline}
          </span>
        </Col>
      </Row>
      {/*************************** Row 4 ****************************/}
      <Row className="job-detail-row">
        <Col xs={12} lg={5}>
          <strong>CTH No:&nbsp;</strong>
          <span className="non-editable-text">{props.data.cth_no}</span>
        </Col>
        <Col xs={12} lg={3}>
          <strong>Exchange Rate:&nbsp;</strong>
          <span className="non-editable-text">{props.data.exrate}</span>
        </Col>
        <Col xs={12} lg={4}>
          <strong>CIF Amount(INR):&nbsp;</strong>
          <span className="non-editable-text">{props.data.cif_amount}</span>
        </Col>
      </Row>
      {/*************************** Row 4+ ****************************/}

      {/*************************** Row 5 ****************************/}
      <Row className="job-detail-row">
        <Col xs={12} lg={5}>
          <strong>Bill Of Entry (BOE) No.:&nbsp;</strong>
          <span className="non-editable-text">
            {props.data.be_no && (
              <a
                href={`https://enquiry.icegate.gov.in/enquiryatices/beTrackIces?BE_NO=${
                  props.data.be_no
                }&BE_DT=${formatDate(
                  props.data.be_date
                )}&beTrack_location=${getCustomHouseLocation(
                  props.data.custom_house
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {props.data.be_no}
              </a>
            )}
          </span>
        </Col>

        <Col xs={12} lg={3}>
          <strong> BOE Date:&nbsp;</strong>
          <span className="non-editable-text">{props.data.be_date}</span>
        </Col>
        <Col xs={12} lg={4}>
          <strong> No of Packages: &nbsp;</strong>
          <span className="non-editable-text">{props.data.no_of_pkgs}</span>
        </Col>
      </Row>
      <Row>
        <Col xs={12} lg={5}>
          {/* Outer Flex Container */}
          <div style={{ display: "flex", flexDirection: "row" }}>
            {/* Inner Flex Row 1: Label and Value */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <strong>Bill of Lading (BL) No.:&nbsp;</strong>
            </div>

            <div style={{ marginTop: "5px" }}>
              <div className="non-editable-text">
                <a
                  href={`https://enquiry.icegate.gov.in/enquiryatices/blStatusIces?mawbNo=${props.data.awb_bl_no}&HAWB_NO=`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {props.data.awb_bl_no}
                </a>
              </div>
              {/* Inner Flex Row 2: Icon Row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "15px",
                }}
              >
                {/* Copy Button */}
                {/* <IconButton
                  size="medium"
                  onPointerOver={(e) => (e.target.style.cursor = "pointer")}
                  onClick={() =>
                    handleCopyText(props.bl_no_ref, props.setSnackbar)
                  }
                  aria-label="copy-btn"
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton> */}

                {/* Shipping Line Tracking Link */}
                {props.data.shipping_line_airline && (
                  <abbr
                    title={`Track Shipment at ${props.data.shipping_line_airline}`}
                  >
                    <a
                      href={
                        getShippingLineUrl(
                          props.data.shipping_line_airline,
                          props.data.awb_bl_no,
                          props.data.container_nos?.[0]?.container_number
                        ) || "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FontAwesomeIcon icon={faShip} size="1x" color="blue" />
                    </a>
                  </abbr>
                )}

                {/* Sea IGM Entry Link */}
                <abbr title="Sea IGM Entry">
                  <a
                    href={`https://enquiry.icegate.gov.in/enquiryatices/seaIgmEntry?IGM_loc_Name=${getPortLocation(
                      props.data.port_of_reporting
                    )}&MAWB_NO=${props.data.awb_bl_no}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FontAwesomeIcon icon={faAnchor} size="1x" color="blue" />
                  </a>
                </abbr>
              </div>
            </div>
          </div>
        </Col>

        <Col xs={12} lg={3}>
          <strong>BL Date:&nbsp;</strong>
          <span className="non-editable-text">{props.data.awb_bl_date}</span>
        </Col>
        {/* <Col xs={12} lg={4}>
          <strong>Clearance Under:&nbsp;</strong>
          <span className="non-editable-text">
            {props.data.clearanceValue === "Ex-Bond"
              ? props.data.exBondValue && props.data.exBondValue === "other"
                ? `${props.data.clearanceValue} `
                : `${props.data.clearanceValue} (${props.data.exBondValue})`
              : props.data.clearanceValue || "NA"}{" "}
            ({props.data.scheme})
          </span>
        </Col> */}
      </Row>

      {/*************************** Row 6 ****************************/}
      <Row className="job-detail-row">
        <Col xs={12} lg={5}>
          <strong>Gross Weight (KGS):&nbsp;</strong>
          <span className="non-editable-text">{props.data.gross_weight}</span>
        </Col>
        <Col xs={12} lg={3}>
          <strong>Net Weight (KGS):&nbsp;</strong>
          <span className="non-editable-text">{props.data.job_net_weight}</span>
        </Col>
      </Row>
      <Row className="job-detail-row">
        <Col xs={12} lg={5}>
          <strong>HSS:&nbsp;</strong>
          <span className="non-editable-text">{props.data.hss}</span>
        </Col>
        <Col xs={12} lg={5}>
          <strong>Seller Name:&nbsp;</strong>
          {props.data.hss === "Yes" && (
            <span className="non-editable-text">{props.data.saller_name}</span>
          )}
        </Col>
      </Row>
      <Row>
      <Col xs={12} lg={5}>
          <strong>Ad Code:&nbsp;</strong>
          <span className="non-editable-text">{props.data.adCode}</span>
        </Col>
      <Col xs={12} lg={5}>
          <strong>Bank Name:&nbsp;</strong>
          <span className="non-editable-text">{props.data.bankName}</span>
        </Col>
      </Row>
    </div>
  );
}

export default React.memo(JobDetailsStaticData);
