import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Row, Col } from "react-bootstrap";
import { TextField } from "@mui/material";
import { UserContext } from "../../../contexts/UserContext";

function ViewSrccOrganisationData() {
  const { _id } = useParams();
  const [data, setData] = useState();
  const [remarks, setRemarks] = useState("");
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    async function getData() {
      const res = await axios(
        `${process.env.REACT_APP_API_STRING}/view-customer-kyc-details/${_id}`
      );

      setData(res.data);
    }

    getData();
  }, [_id]);

  const handleKycApproval = async (approval) => {
    const approved_by = `${user.first_name} ${user.last_name}`;
    if (approval === "Sent for revision" && remarks === "") {
      alert("Please enter remarks");
    } else {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/customer-kyc-approval/${_id}`,
        { approval, remarks, approved_by }
      );

      navigate("/srcc-directories");
    }
  };

  return (
    <div
      style={{
        width: "80%",
        margin: "auto",
        boxShadow: "2px 2px 50px 10px rgba(0, 0, 0, 0.05)",
        padding: "20px",
      }}
    >
      {data && (
        <>
          <Row>
            <Col>
              <strong>Category:</strong> {data.category}
            </Col>
            <Col>
              <strong>Name of Individual:</strong> {data.name_of_individual}
            </Col>
            <Col>
              <strong>Status of Exporter/ Importer:</strong> {data.status}
            </Col>
          </Row>
          <br />
          <h4>Permanent Address</h4>
          <Row>
            <Col>
              <strong>Line 1:</strong>
              {data.permanent_address_line_1}
            </Col>
            <Col>
              <strong>Line 2:</strong>
              {data.permanent_address_line_2}
            </Col>
            <Col>
              <strong>City:</strong>
              {data.permanent_address_city}
            </Col>
          </Row>
          <Row>
            <Col>
              <strong>State:</strong> {data.permanent_address_state}
            </Col>
            <Col>
              <strong>PIN Code:</strong> {data.permanent_address_pin_code}
            </Col>
            <Col></Col>
          </Row>

          <br />
          <h4>Principal Business Address</h4>
          <Row>
            <Col>
              <strong>Line 1: </strong> {data.principle_business_address_line_1}
            </Col>
            <Col>
              <strong>Line 2: </strong> {data.principle_business_address_line_2}
            </Col>
            <Col>
              <strong>City: </strong> {data.principle_business_address_city}
            </Col>
          </Row>
          <Row>
            <Col>
              <strong>State: </strong> {data.principle_business_address_state}
            </Col>
            <Col>
              <strong>PIN Code: </strong>
              {data.principle_business_address_pin_code}
            </Col>
            <Col></Col>
          </Row>
          <br />
          <h4>Factory Addresses</h4>
          {data.factory_addresses?.map((address, id) => {
            return (
              <div key={id}>
                <Row>
                  <Col>
                    <strong>Line 1: </strong>
                    {address.factory_address_line_1}
                  </Col>
                  <Col>
                    <strong>Line 2: </strong>
                    {address.factory_address_line_2}
                  </Col>
                  <Col>
                    <strong>City: </strong> {address.factory_address_city}
                  </Col>
                </Row>
                <Row>
                  <Col>
                    <strong>State: </strong> {address.factory_address_state}
                  </Col>
                  <Col>
                    <strong>PIN Code: </strong>
                    {address.factory_address_pin_code}
                  </Col>
                  <Col>
                    <strong>GST: </strong> {address.gst}
                  </Col>
                </Row>
              </div>
            );
          })}

          <br />
          <h4>PAN</h4>
          <Row>
            <Col>
              <strong>PAN:</strong> {data.pan_no}
            </Col>
          </Row>

          <Row>
            <Col>
              <strong>KYC Verification Images: </strong>
              {data.kyc_verification_images &&
                data.kyc_verification_images.map((data, id) => (
                  <a href={data}>View</a>
                ))}
            </Col>
          </Row>
          <br />
          <TextField
            multiline
            rows={4}
            fullWidth
            size="small"
            margin="dense"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            label="Remarks"
            className="login-input"
          />
          <br />
          <br />

          <>
            <button
              className="btn"
              onClick={() => handleKycApproval("Approved by HOD")}
            >
              Approve
            </button>
            <button
              className="btn"
              style={{ marginLeft: "10px" }}
              onClick={() => handleKycApproval("Sent for revision")}
            >
              Send for Revision
            </button>
          </>

          <br />
          <br />
        </>
      )}
    </div>
  );
}

export default ViewSrccOrganisationData;
