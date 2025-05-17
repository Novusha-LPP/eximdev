import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Row, Col } from "react-bootstrap";

function ViewIndividualKyc() {
  const { username } = useParams();
  const [data, setData] = useState();

  useEffect(() => {
    async function getUser() {
      const res = await axios(
        `${process.env.REACT_APP_API_STRING}/get-user-data/${username}`
      );
      setData(res.data);
    }

    getUser();
  }, [username]);

  const handleKycApproval = async (status) => {
    const kyc_approval = status === true ? "Approved" : "Rejected";
    const res = await axios.post(
      `${process.env.REACT_APP_API_STRING}/kyc-approval`,
      { username, kyc_approval }
    );
    alert(res.data.message);
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
          <h5>Basic Info</h5>
          <Row>
            <Col>
              <strong>First Name:</strong> {data.first_name}
            </Col>
            <Col>
              <strong>Middle Name:</strong> {data.middle_name}
            </Col>
            <Col>
              <strong>Last Name:</strong> {data.last_name}
            </Col>
          </Row>
          <Row>
            <Col>
              <strong>Designation:</strong> {data.designation}
            </Col>
            <Col>
              <strong>Department:</strong> {data.department}
            </Col>
            <Col>
              <strong>Joining Date:</strong> {data.joining_date}
            </Col>
          </Row>
          <Row>
            <Col>
              <strong>Date of Birth:</strong> {data.dob}
            </Col>
          </Row>

          <br />
          <h5>Permanent Address</h5>
          <Row>
            <Col>
              <strong>Address Line 1: </strong> {data.permanent_address_line_1}
            </Col>
            <Col>
              <strong>Address Line 2: </strong> {data.permanent_address_line_2}
            </Col>
            <Col>
              <strong>City: </strong> {data.permanent_address_city}
            </Col>
          </Row>
          <Row>
            <Col>
              <strong>Area: </strong> {data.permanent_address_area}
            </Col>
            <Col>
              <strong>State: </strong> {data.permanent_address_state}
            </Col>
            <Col>
              <strong>PIN Code: </strong> {data.permanent_address_pincode}
            </Col>
          </Row>
          <br />
          <h5>Communication Address</h5>
          <Row>
            <Col>
              <strong>Address Line 1: </strong>
              {data.communication_address_line_1}
            </Col>
            <Col>
              <strong>Address Line 2: </strong>
              {data.communication_address_line_2}
            </Col>
            <Col>
              <strong>City: </strong> {data.communication_address_city}
            </Col>
          </Row>
          <Row>
            <Col>
              <strong>Area: </strong> {data.communication_address_area}
            </Col>
            <Col>
              <strong>State: </strong> {data.communication_address_state}
            </Col>
            <Col>
              <strong>PIN Code: </strong> {data.communication_address_pincode}
            </Col>
          </Row>

          <br />
          <h5>Contact Details</h5>
          <Row>
            <Col>
              <strong>Personal Email: </strong> {data.personal_email}
            </Col>
            <Col>
              <strong>Official Email: </strong> {data.official_email}
            </Col>
            <Col>
              <strong>Personal Mobile: </strong> {data.mobile}
            </Col>
          </Row>
          <Row>
            <Col>
              <strong>Emergency Contact Name: </strong>
              {data.emergency_contact_name}
            </Col>
            <Col>
              <strong>Emergency Contact Number:</strong>
              {data.emergency_contact}
            </Col>
            <Col>
              <strong>Close Friend Contact Name: </strong>
              {data.close_friend_contact_name}
            </Col>
          </Row>
          <Row>
            <Col>
              <strong>Close Friend Contact: </strong>
              {data.close_friend_contact_no}
            </Col>
          </Row>
          <br />
          <h5>Family Members</h5>
          <Row>
            <Col>
              <strong>Family Members: </strong>
              {data.family_members?.map((item) => `${item}, `)}
            </Col>
          </Row>
          <br />
          <h5>Documents</h5>
          <Row>
            <Col>
              <strong>PAN Number:</strong> {data.pan_no}
            </Col>
            <Col>
              <strong>PAN Photo: </strong>
              <a href={data.pan_photo}>View</a>
            </Col>
            <Col></Col>
          </Row>
          <Row>
            <Col>
              <strong>AADHAR Number: </strong> {data.aadhar_no}
            </Col>
            <Col>
              <strong>AADHAR Photo Front: </strong>
              <a href={data.aadhar_photo_front}>View</a>
            </Col>
            <Col>
              <strong>AADHAR Photo Back: </strong>
              <a href={data.aadhar_photo_back}>View</a>
            </Col>
          </Row>
          <Row>
            <Col>
              <strong>Driving License Photo Front: </strong>
              <a href={data.license_front}>View</a>
            </Col>
            <Col>
              <strong>Driving License Photo Back: </strong>
              <a href={data.license_back}>View</a>
            </Col>
            <Col></Col>
          </Row>
          <br />
          <h5>Bank Details</h5>
          <Row>
            <Col>
              <strong>Account Number: </strong> {data.bank_account_no}
            </Col>
            <Col>
              <strong>Bank Name: </strong> {data.bank_name}
            </Col>
            <Col>
              <strong>IFSC: </strong> {data.ifsc_code}
            </Col>
          </Row>

          <br />
          <h5>Other Details</h5>
          <Row>
            <Col>
              <strong>Marital Status: </strong> {data.marital_status}
            </Col>
            <Col>
              <strong>Insurance Details: </strong>{" "}
              {data.insurance_status?.map((item) => `${item}, `)}
            </Col>
            <Col>
              <strong>PF Number: </strong> {data.pf_no}
            </Col>
          </Row>
          <Row>
            <Col>
              <strong>ESIC Number: </strong> {data.esic_no}
            </Col>
            <Col>
              <strong>Blood Group: </strong> {data.blood_group}
            </Col>
            <Col>
              <strong>Highest Qualification: </strong>
              {data.highest_qualification}
            </Col>
          </Row>
          <Row>
            <Col>
              <strong>Favorite Song: </strong>
              {data.favorite_song}
            </Col>
          </Row>
          <br />
          <button className="btn" onClick={() => handleKycApproval(true)}>
            Approve
          </button>
          <button
            className="btn"
            style={{ marginLeft: "10px" }}
            onClick={() => handleKycApproval(false)}
          >
            Reject
          </button>
          <br />
          <br />
        </>
      )}
    </div>
  );
}

export default React.memo(ViewIndividualKyc);
