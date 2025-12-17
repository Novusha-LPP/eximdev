import React, { useMemo, useCallback, useState } from "react";
import { Row, Col } from "react-bootstrap";
import { IconButton, Tooltip, Collapse, Box, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShip, faAnchor } from "@fortawesome/free-solid-svg-icons";

function JobDetailsStaticData(props) {
  const [expanded, setExpanded] = useState(false);
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

  const handleCopy = useCallback((event, text) => {
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
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
      } catch (err) {
        alert("Failed to copy text to clipboard.");
        console.error("Fallback copy failed:", err);
      }
      document.body.removeChild(textArea);
    }
  }, []);

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

  const compactRowStyle = {
    padding: "6px 12px",
    marginBottom: "4px",
    backgroundColor: "#f8f9fa",
    borderRadius: "4px",
    fontSize: "0.875rem",
  };

  const labelStyle = {
    color: "#495057",
    fontWeight: "600",
    fontSize: "0.85rem",
  };

  const valueStyle = {
    color: "#212529",
    fontWeight: "400",
  };

  return (
    <div className="job-details-container" style={{ padding: "0px", background: "white", borderRadius: "8px", border: "1px solid #e0e0e0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", transition: "all 0.3s ease" }}>

      {/* Collapsed View (Summary) */}
      {!expanded && (
        <div
          onClick={() => setExpanded(true)}
          style={{
            padding: "12px 20px",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#fff",
            borderRadius: "8px"
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.75rem", color: "#6c757d", fontWeight: "600" }}>Job Number</span>
              <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "#212529" }}>{props.params.job_no}</span>
            </div>

            <div style={{ width: "1px", height: "30px", background: "#e0e0e0" }}></div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.75rem", color: "#6c757d", fontWeight: "600" }}>Custom House</span>
              <span style={{ fontSize: "0.9rem", color: "#212529" }}>{props.data?.custom_house}</span>
            </div>

            <div style={{ width: "1px", height: "30px", background: "#e0e0e0" }}></div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.75rem", color: "#6c757d", fontWeight: "600" }}>Importer</span>
              <span style={{ fontSize: "0.9rem", color: "#212529" }}>{props.data?.importer}</span>
            </div>

            <div style={{ width: "1px", height: "30px", background: "#e0e0e0" }}></div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.75rem", color: "#6c757d", fontWeight: "600" }}>BL No</span>
              <span style={{ fontSize: "0.9rem", color: "#212529" }}>{props.data?.awb_bl_no}</span>
            </div>

            <div style={{ width: "1px", height: "30px", background: "#e0e0e0" }}></div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.75rem", color: "#6c757d", fontWeight: "600" }}>BE No</span>
              <span style={{ fontSize: "0.9rem", color: "#212529" }}>{props.data?.be_no}</span>
            </div>

            {props.data?.status && (
              <>
                <div style={{ width: "1px", height: "30px", background: "#e0e0e0" }}></div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.75rem", color: "#6c757d", fontWeight: "600" }}>Status</span>
                  <span style={{ fontSize: "0.9rem", color: "#007bff", fontWeight: "600" }}>{props.data.status}</span>
                </div>
              </>
            )}
          </div>

          <Tooltip title="Expand Details">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setExpanded(true); }}>
              <KeyboardArrowDownIcon />
            </IconButton>
          </Tooltip>
        </div>
      )}

      {/* Expanded View (Full Details) */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <div style={{ padding: "15px" }}>
          {/* Header */}
          <Row style={{ marginBottom: "15px", borderBottom: "1px solid #eee", paddingBottom: "10px", alignItems: "center" }}>
            <Col className="d-flex align-items-center justify-content-between">
              <h5 style={{ fontSize: "1.1rem", fontWeight: "700", margin: 0 }}>
                Job Number: {props.params.job_no} | Custom House: {props.data?.custom_house}
                {props.data?.be_no ? null : props.data?.priorityJob &&
                  (props.data.priorityJob === "High Priority" ||
                    props.data.priorityJob === "Priority") && (
                    <span
                      style={{
                        display: "inline-block",
                        fontWeight: "bold",
                        fontStyle: "italic",
                        fontSize: "0.9rem",
                        color: props.data.priorityJob === "High Priority" ? "white" : "black",
                        border: "2px solid",
                        borderColor: props.data.priorityJob === "High Priority" ? "red" : "blue",
                        borderRadius: "6px",
                        padding: "4px 8px",
                        backgroundColor:
                          props.data.priorityJob === "High Priority"
                            ? "rgba(255, 0, 0, 0.8)"
                            : "rgba(0, 0, 255, 0.2)",
                        marginLeft: "8px",
                      }}
                    >
                      {props.data.priorityJob}
                    </span>
                  )}
              </h5>
              <Tooltip title="Collapse Details">
                <IconButton size="small" onClick={() => setExpanded(false)}>
                  <KeyboardArrowUpIcon />
                </IconButton>
              </Tooltip>
            </Col>
          </Row>

          {/* Row 1: Payment, Clearance, FTA, Import Terms */}
          <Row style={compactRowStyle}>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>Payment Method: </span>
              <span style={valueStyle}>{props.data.payment_method}</span>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>Clearance Under: </span>
              <span style={valueStyle}>
                {props.data.type_of_b_e === "Ex-Bond"
                  ? props.data.exBondValue && props.data.exBondValue === "other"
                    ? `${props.data.clearanceValue}`
                    : `${props.data.clearanceValue} (${props.data.exBondValue})`
                  : props.data.clearanceValue || "NA"}
              </span>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>FTA Benefit: </span>
              <span style={valueStyle}>
                {isNaN(new Date(props.data.fta_Benefit_date_time).getTime()) ||
                  props.data.fta_Benefit_date_time === ""
                  ? `No (${props.data.origin_country})`
                  : `Yes (${props.data.origin_country})`}
              </span>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>Import Terms: </span>
              <span style={valueStyle}>{props.data.import_terms}</span>
            </Col>
          </Row>

          {/* Row 2: Importer, IE Code, Invoice No, Invoice Date */}
          <Row style={compactRowStyle}>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>Importer: </span>
              <span style={valueStyle}>{props.data.importer}</span>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>IE Code: </span>
              <span style={valueStyle}>{props.data.ie_code_no}</span>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>Invoice No.: </span>
              <span style={valueStyle}>{props.data.invoice_number}</span>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>Invoice Date: </span>
              <span style={valueStyle}>{props.data.invoice_date}</span>
            </Col>
          </Row>

          {/* Row 3: Invoice Value, Origin, Supplier, BE Filing Type */}
          <Row style={compactRowStyle}>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>Invoice Value: </span>
              <span style={valueStyle}>{invoice_value_and_unit_price}</span>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>Origin Country: </span>
              <span style={valueStyle}>{props.data.origin_country}</span>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>Supplier: </span>
              <span style={valueStyle}>{props.data.supplier_exporter}</span>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>BE Filing Type: </span>
              <span style={valueStyle}>{props.data.be_filing_type}</span>
            </Col>
          </Row>

          {/* Row 4: POL, POD, Shipping Line + Copy, CTH */}
          <Row style={compactRowStyle}>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>POL: </span>
              <span style={valueStyle}>{props.data.loading_port}</span>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>POD: </span>
              <span style={valueStyle}>{props.data.port_of_reporting}</span>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>Shipping Line: </span>
              <span style={valueStyle}>{props.data.shipping_line_airline}</span>
              <Tooltip title="Copy Shipping Line">
                <IconButton
                  size="small"
                  onClick={(e) => handleCopy(e, props.data.shipping_line_airline)}
                >
                  <ContentCopyIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>CTH No: </span>
              <span style={valueStyle}>{props.data.cth_no}</span>
            </Col>
          </Row>

          {/* Row 5: Exchange Rate, CIF Amount, Gross Weight, Net Weight */}
          <Row style={compactRowStyle}>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>Exchange Rate: </span>
              <span style={valueStyle}>{props.data.exrate}</span>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>CIF Amount: </span>
              <span style={valueStyle}>{props.data.cif_amount}</span>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>Gross Weight: </span>
              <span style={valueStyle}>{props.data.gross_weight}</span>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>Net Weight: </span>
              <span style={valueStyle}>{props.data.job_net_weight}</span>
            </Col>
          </Row>

          {/* Row 6: BOE No, BOE Date, No of Packages, Ad Code */}
          <Row style={compactRowStyle}>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>BOE No.: </span>
              <span style={valueStyle}>
                {props.data.be_no && (
                  <a
                    href={`https://enquiry.icegate.gov.in/enquiryatices/beTrackIces?BE_NO=${props.data.be_no
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
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>BOE Date: </span>
              <span style={valueStyle}>{props.data.be_date}</span>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>No of Packages: </span>
              <span style={valueStyle}>{props.data.no_of_pkgs}</span>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>Ad Code: </span>
              <span style={valueStyle}>{props.data.adCode}</span>
            </Col>
          </Row>

          {/* Row 7: BL No with icons, BL Date, HWBL No, HWBL Date */}
          <Row style={compactRowStyle}>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>BL No.: </span>
              <span style={valueStyle}>
                <a
                  href={`https://enquiry.icegate.gov.in/enquiryatices/blStatusIces?mawbNo=${props.data.awb_bl_no}&HAWB_NO=`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {props.data.awb_bl_no}
                </a>
              </span>
              {props.data.shipping_line_airline && (
                <>
                  <Tooltip title={`Track at ${props.data.shipping_line_airline}`}>
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
                      style={{ marginLeft: "6px" }}
                    >
                      <FontAwesomeIcon icon={faShip} size="sm" color="blue" />
                    </a>
                  </Tooltip>
                  <Tooltip title="Sea IGM Entry">
                    <a
                      href={`https://enquiry.icegate.gov.in/enquiryatices/seaIgmEntry?IGM_loc_Name=${getPortLocation(
                        props.data.port_of_reporting
                      )}&MAWB_NO=${props.data.awb_bl_no}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ marginLeft: "6px" }}
                    >
                      <FontAwesomeIcon icon={faAnchor} size="sm" color="blue" />
                    </a>
                  </Tooltip>
                </>
              )}
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>BL Date: </span>
              <span style={valueStyle}>{props.data.awb_bl_date}</span>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>HWBL No: </span>
              <span style={valueStyle}>{props.data.hawb_hbl_no}</span>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>HWBL Date: </span>
              <span style={valueStyle}>{props.data.hawb_hbl_date}</span>
            </Col>
          </Row>

          {/* Row 8: G-IGM No, G-IGM Date, Line No, Bank Name */}
          <Row style={compactRowStyle}>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>G-IGM No: </span>
              <span style={valueStyle}>{props.data.gateway_igm}</span>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>G-IGM Date: </span>
              <span style={valueStyle}>{props.data.gateway_igm_date}</span>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>Line No: </span>
              <span style={valueStyle}>{props.data.line_no}</span>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>Bank Name: </span>
              <span style={valueStyle}>{props.data.bank_name}</span>
            </Col>
          </Row>

          {/* Row 9: IGM No, IGM Date, HSS, Seller Name */}
          <Row style={compactRowStyle}>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>IGM No: </span>
              <span style={valueStyle}>{props.data.igm_no}</span>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>IGM Date: </span>
              <span style={valueStyle}>{props.data.igm_date}</span>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <span style={labelStyle}>HSS: </span>
              <span style={valueStyle}>{props.data.hss}</span>
            </Col>
            {props.data.hss === "Yes" && (
              <Col xs={12} md={6} lg={3}>
                <span style={labelStyle}>Seller Name: </span>
                <span style={valueStyle}>{props.data.saller_name}</span>
              </Col>
            )}
          </Row>

          {/* Row 10: Importer Address - Full width */}
          <Row style={compactRowStyle}>
            <Col xs={12}>
              <span style={labelStyle}>Importer Address: </span>
              <span style={valueStyle}>{props.data.importer_address}</span>
              <Tooltip title="Copy Importer Address">
                <IconButton
                  size="small"
                  onClick={(event) => handleCopy(event, props.data.importer_address)}
                >
                  <ContentCopyIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            </Col>
          </Row>
        </div>
      </Collapse>
    </div>
  );
}

export default React.memo(JobDetailsStaticData);
