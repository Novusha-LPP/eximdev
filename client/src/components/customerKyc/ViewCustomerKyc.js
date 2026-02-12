import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Row, Col } from "react-bootstrap";
import { TextField } from "@mui/material";
import { UserContext } from "../../contexts/UserContext";
import BackButton from "./BackButton";
import "./customerKyc.css";
import { useSnackbar } from "../../contexts/SnackbarContext";
import { ViewButton, MultipleViewButtons } from "../../utils/documentHelpers";

function ViewCustomerKyc() {
  const { _id } = useParams();
  const [data, setData] = useState();
  const [remarks, setRemarks] = useState("");
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const { showWarning, showSuccess } = useSnackbar();

  useEffect(() => {
    async function getData() {
      const res = await axios(
        `${process.env.REACT_APP_API_STRING}/view-customer-kyc-details/${_id}`
      );

      setData(res.data);
    }

    getData();
  }, [_id]);

  const supportingDocuments = (type) => {
    switch (type) {
      case "Individual/ Proprietary Firm":
        return (
          <>
            <Row>
              <Col>
                <strong>Passport:&nbsp;</strong>
                <MultipleViewButtons
                  urls={data.individual_passport_img}
                  label="Passport"
                />
              </Col>
              <Col>
                <strong>Voter Card:&nbsp;</strong>
                <MultipleViewButtons
                  urls={data.individual_voter_card_img}
                  label="Voter Card"
                />
              </Col>
              <Col>
                <strong>Driving License:&nbsp;</strong>
                <MultipleViewButtons
                  urls={data.individual_driving_license_img}
                  label="License"
                />
              </Col>
            </Row>
            <Row>
              <Col>
                <strong>Bank Statement:&nbsp;</strong>
                <MultipleViewButtons
                  urls={data.individual_bank_statement_img}
                  label="Statement"
                />
              </Col>
              <Col>
                <strong>Ration Card:&nbsp;</strong>
                <MultipleViewButtons
                  urls={data.individual_ration_card_img}
                  label="Ration Card"
                />
              </Col>
              <Col>
                <strong>Aadhar Card:&nbsp;</strong>
                <MultipleViewButtons
                  urls={data.individual_aadhar_card}
                  label="Aadhar"
                />
              </Col>
            </Row>
          </>
        );
      case "Partnership Firm":
        return (
          <>
            <Row>
              <Col>
                <strong>Registration Certificate:&nbsp;</strong>
                <MultipleViewButtons
                  urls={data.partnership_registration_certificate_img}
                  label="Certificate"
                />
              </Col>
              <Col>
                <strong>Partnership Deed:&nbsp;</strong>
                <MultipleViewButtons
                  urls={data.partnership_deed_img}
                  label="Deed"
                />
              </Col>
              <Col>
                <strong>Power of Attorney:&nbsp;</strong>
                <MultipleViewButtons
                  urls={data.partnership_power_of_attorney_img}
                  label="Power of Attorney"
                />
              </Col>
            </Row>
            <Row>
              <Col>
                <strong>Valid Document:&nbsp;</strong>
                <MultipleViewButtons
                  urls={data.partnership_valid_document}
                  label="Document"
                />
              </Col>
              <Col>
                <strong>Aadhar Card Front:&nbsp;</strong>
                <MultipleViewButtons
                  urls={data.partnership_aadhar_card_front_photo}
                  label="Aadhar Front"
                />
              </Col>
              <Col>
                <strong>Aadhar Card Back:&nbsp;</strong>
                <MultipleViewButtons
                  urls={data.partnership_aadhar_card_back_photo}
                  label="Aadhar Back"
                />
              </Col>
            </Row>
            <Row>
              <Col>
                <strong>Telephone Bill:&nbsp;</strong>
                <MultipleViewButtons
                  urls={data.partnership_telephone_bill}
                  label="Telephone Bill"
                />
              </Col>
              <Col></Col>
              <Col></Col>
            </Row>
          </>
        );
      case "Company":
        return (
          <>
            <Row>
              <Col>
                <strong>Certificate of Incorporation:&nbsp;</strong>
                <MultipleViewButtons
                  urls={data.company_certificate_of_incorporation_img}
                  label="Certificate"
                />
              </Col>
              <Col>
                <strong>Memorandum of Association:&nbsp;</strong>
                <MultipleViewButtons
                  urls={data.company_memorandum_of_association_img}
                  label="Memorandum"
                />
              </Col>
              <Col>
                <strong>Articles of Association:&nbsp;</strong>
                <MultipleViewButtons
                  urls={data.company_articles_of_association_img}
                  label="Articles"
                />
              </Col>
            </Row>
            <Row>
              <Col>
                <strong>Power of Attorney:&nbsp;</strong>
                <MultipleViewButtons
                  urls={data.company_power_of_attorney_img}
                  label="Power of Attorney"
                />
              </Col>
              <Col>
                <strong>Telephone Bill:&nbsp;</strong>
                <MultipleViewButtons
                  urls={data.company_telephone_bill_img}
                  label="Telephone Bill"
                />
              </Col>
              <Col>
                <strong>PAN Allotment Letter:&nbsp;</strong>
                <MultipleViewButtons
                  urls={data.company_pan_allotment_letter_img}
                  label="PAN Letter"
                />
              </Col>
            </Row>
          </>
        );
      case "Trust Foundations":
        return (
          <>
            <Row>
              <Col>
                <strong>Certificate of Registration:&nbsp;</strong>
                <MultipleViewButtons
                  urls={data.trust_certificate_of_registration_img}
                  label="Certificate"
                />
              </Col>
              <Col>
                <strong>Power of Attorney:&nbsp;</strong>
                <MultipleViewButtons
                  urls={data.trust_power_of_attorney_img}
                  label="Power of Attorney"
                />
              </Col>
              <Col>
                <strong>Offically Valid Document:&nbsp;</strong>
                <MultipleViewButtons
                  urls={data.trust_officially_valid_document_img}
                  label="Valid Document"
                />
              </Col>
            </Row>
            <Row>
              <Col>
                <strong>Resoultion of Managing Body:&nbsp;</strong>
                <MultipleViewButtons
                  urls={data.trust_resolution_of_managing_body_img}
                  label="Resolution"
                />
              </Col>
              <Col>
                <strong>Name of Trustees:&nbsp;</strong>
                {data.trust_name_of_trustees}
              </Col>
              <Col>
                <strong>Name of Founder:&nbsp;</strong>
                {data.trust_name_of_founder}
              </Col>
            </Row>
            <Row>
              <Col>
                <strong>Address of Founder:&nbsp;</strong>
                {data.trust_address_of_founder}
              </Col>
              <Col>
                <strong>Telephone of Founder:&nbsp;</strong>
                {data.trust_telephone_of_founder}
              </Col>
              <Col>
                <strong>Email of Founder:&nbsp;</strong>
                {data.trust_email_of_founder}
              </Col>
            </Row>
          </>
        );
      default:
        return null;
    }
  };

  // Remove duplicate helper functions since we're importing from utils
  // isValidFileUrl and openFileInNewTab are now imported from documentHelpers

  const handleKycApproval = async (approval) => {
    const approved_by = `${user.first_name} ${user.last_name}`;
    if (approval === "Sent for revision" && remarks === "") {
      showWarning("Please enter remarks");
    } else {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/customer-kyc-approval/${_id}`,
        { approval, remarks, approved_by }
      );

      showSuccess("KYC status updated successfully");
      navigate("/customer-kyc");
    }
  };

  return (
    <div
      className="kyc-form-container"
      style={{
        width: "90%",
        maxWidth: "2400px",
        margin: "2rem auto",
        background: "var(--white)",
        boxShadow: "var(--shadow-soft)",
        padding: "var(--spacing-xl)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid rgba(243, 163, 16, 0.1)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "var(--spacing-lg)",
          paddingBottom: "16px",
          borderBottom: "2px solid rgba(243, 163, 16, 0.2)",
        }}
      >
        <BackButton />
        <h2
          style={{
            color: "var(--primary-orange)",
            margin: 0,
            textAlign: "center",
            flex: 1,
          }}
        >
          View Customer KYC Details
        </h2>
      </div>
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
                <Row>
                  <Col>
                    <strong>GST Registration Certificate: </strong>
                    <MultipleViewButtons
                      urls={address.gst_reg}
                      label="Certificate"
                    />
                  </Col>
                </Row>
              </div>
            );
          })}

          <br />
          <h6>
            <strong>
              Name of Authorised Signatory/ies for signing import/export
              documents on behalf of the Firm/ Company. Please provide recent
              passport size self attested photographs of each signatory
            </strong>
          </h6>
          <Row>
            <Col>
              <MultipleViewButtons
                urls={data.authorised_signatories}
                label="Photo"
              />
            </Col>
          </Row>
          <br />
          <h6>
            <strong>Authorisation Letter</strong>
          </h6>
          <Row>
            <Col>
              <MultipleViewButtons
                urls={data.authorisation_letter}
                label="Letter"
              />
            </Col>
          </Row>
          <br />
          <h4>IEC</h4>
          <Row>
            <Col>
              <strong>IEC Number:</strong> {data.iec_no}
            </Col>
            <Col>
              <strong>IEC Copy:&nbsp;</strong>
              <MultipleViewButtons urls={data.iec_copy} label="IEC Document" />
            </Col>
            <Col></Col>
          </Row>
          <br />
          <h4>PAN</h4>
          <Row>
            <Col>
              <strong>PAN:</strong> {data.pan_no}
            </Col>
            <Col>
              <strong>PAN Copy:&nbsp;</strong>
              <MultipleViewButtons urls={data.pan_copy} label="PAN Document" />
            </Col>
            <Col></Col>
          </Row>
          <br />
          <h4>Bank</h4>
          {data.banks?.map((bank, id) => {
            return (
              <div key={id}>
                <Row>
                  <Col>
                    <strong>Banker's Name: </strong>
                    {bank.bankers_name}
                  </Col>
                  <Col>
                    <strong>Branch Address:</strong>
                    {bank.branch_address}
                  </Col>
                  <Col>
                    <strong>Account Number: </strong>
                    {bank.account_no}
                  </Col>
                </Row>
                <Row>
                  <Col>
                    <strong>IFSC: </strong>
                    {bank.ifsc}
                  </Col>
                  <Col>
                    <strong>AD Code: </strong>
                    {bank.adCode}
                  </Col>
                  <Col>
                    <strong>AD Code File: </strong>
                    <MultipleViewButtons
                      urls={bank.adCode_file}
                      label="AD Code Document"
                    />
                  </Col>
                </Row>
              </div>
            );
          })}

          <br />
          <h4>Other Documents</h4>
          <MultipleViewButtons urls={data.other_documents} label="Document" />
          <br />
          <Row>
            <Col>
              <strong>SPCB Registration Certificate: </strong>
              <MultipleViewButtons
                urls={data.spcb_reg}
                label="SPCB Certificate"
              />
            </Col>
            <Col>
              <strong>KYC Verification Images: </strong>
              <MultipleViewButtons
                urls={data.kyc_verification_images}
                label="Image"
              />
            </Col>
            <Col>
              <strong>GST Returns: </strong>
              <MultipleViewButtons urls={data.gst_returns} label="Return" />
            </Col>
          </Row>
          <br />
          {supportingDocuments(data.category)}
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
              className="btn btn-success"
              onClick={() => handleKycApproval("Approved")}
              style={{ marginRight: "var(--spacing-md)" }}
            >
              Approve
            </button>
            <button
              className="btn btn-secondary"
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

export default ViewCustomerKyc;
