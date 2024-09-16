import React from "react";
import { Row, Col } from "react-bootstrap";
import { IconButton } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { handleCopyText } from "../../utils/handleCopyText";

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

  return (
    <div className="job-details-container">
      <Row>
        <h4>
          Job Number:&nbsp;{props.params.job_no}&nbsp;|&nbsp;
          {props.data && `Custom House: ${props.data.custom_house}`}
        </h4>
      </Row>

      {/*************************** Row 1 ****************************/}
      <Row className="job-detail-row">
        <Col xs={12} lg={5}>
          <strong>Importer:&nbsp;</strong>
          <span className="non-editable-text">{props.data.importer}</span>
        </Col>
        <Col xs={12} lg={3}>
          <strong>Invoice Number:&nbsp;</strong>
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
        <Col xs={12} lg={3}>
          <strong>Bill Number:&nbsp;</strong>
          <span className="non-editable-text">{props.data.bill_no}</span>
        </Col>
        <Col xs={12} lg={4}>
          <strong>Bill Date:&nbsp;</strong>
          <span className="non-editable-text">{props.data.bill_date}</span>
        </Col>
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
      </Row>
      {/*************************** Row 5 ****************************/}
      <Row className="job-detail-row">
        <Col xs={12} lg={5}>
          <strong>Bill of Entry No:&nbsp;</strong>
          <span className="non-editable-text">{props.data.be_no}</span>
        </Col>
        <Col xs={12} lg={5}>
          <strong>Bill of Entry Date:&nbsp;</strong>
          <span className="non-editable-text">{props.data.be_date}</span>
        </Col>
      </Row>
      <Row>
        <Col xs={12} lg={5}>
          <strong>Bill of Lading Number:&nbsp;</strong>
          <span ref={props.bl_no_ref} className="non-editable-text">
            {props.data.awb_bl_no?.toString()}
          </span>
          <IconButton
            onClick={() => handleCopyText(props.bl_no_ref, props.setSnackbar)}
            aria-label="copy-btn"
          >
            <ContentCopyIcon />
          </IconButton>
        </Col>
        <Col xs={12} lg={5}>
          <strong>Bill of Lading Date:&nbsp;</strong>
          <span className="non-editable-text">{props.data.awb_bl_date}</span>
        </Col>
      </Row>
      {/*************************** Row 6 ****************************/}
      <Row className="job-detail-row">
        <Col xs={12} lg={5}>
          <strong>Number of Packages:&nbsp;</strong>
          <span className="non-editable-text">{props.data.no_of_pkgs}</span>
        </Col>
        <Col xs={12} lg={3}>
          <strong>Gross Weight:&nbsp;</strong>
          <span className="non-editable-text">{props.data.gross_weight}</span>
        </Col>
        <Col xs={12} lg={4}>
          <strong>Net Weight:&nbsp;</strong>
          <span className="non-editable-text">{net_weight}</span>
        </Col>
      </Row>
    </div>
  );
}

export default React.memo(JobDetailsStaticData);
