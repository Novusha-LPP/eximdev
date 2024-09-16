import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Row, Col } from "react-bootstrap";
import { TextField } from "@mui/material";

function ViewCompletedKycDetails() {
  const { _id } = useParams();
  const [data, setData] = useState();

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
                {data.individual_passport_img && (
                  <a href={data.individual_passport_img}>View</a>
                )}
              </Col>
              <Col>
                <strong>Voter Card:&nbsp;</strong>
                {data.individual_voter_card_img && (
                  <a href={data.individual_voter_card_img}>View</a>
                )}
              </Col>
              <Col>
                <strong>Driving License:&nbsp;</strong>
                {data.individual_driving_license_img && (
                  <a href={data.individual_driving_license_img}>View</a>
                )}
              </Col>
            </Row>
            <Row>
              <Col>
                <strong>Bank Statement:&nbsp;</strong>
                {data.individual_bank_statement_img && (
                  <a href={data.individual_bank_statement_img}>View</a>
                )}
              </Col>
              <Col>
                <strong>Ration Card:&nbsp;</strong>
                {data.individual_ration_card_img && (
                  <a href={data.individual_ration_card_img}>View</a>
                )}
              </Col>
              <Col>
                <strong>Aadhar Card:&nbsp;</strong>
                {data.individual_aadhar_card && (
                  <a href={data.individual_aadhar_card}>View</a>
                )}
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
                {data.partnership_registration_certificate_img && (
                  <a href={data.partnership_registration_certificate_img}>
                    View
                  </a>
                )}
              </Col>
              <Col>
                <strong>Partnership Deed:&nbsp;</strong>
                {data.partnership_deed_img && (
                  <a href={data.partnership_deed_img}>View</a>
                )}
              </Col>
              <Col>
                <strong>Power of Attorney:&nbsp;</strong>
                {data.partnership_power_of_attorney_img && (
                  <a href={data.partnership_power_of_attorney_img}>View</a>
                )}
              </Col>
            </Row>
            <Row>
              <Col>
                <strong>Valid Document:&nbsp;</strong>
                {data.partnership_valid_document && (
                  <a href={data.partnership_valid_document}>View</a>
                )}
              </Col>
              <Col>
                <strong>Aadhar Card Front:&nbsp;</strong>
                {data.partnership_aadhar_card_front_photo && (
                  <a href={data.partnership_aadhar_card_front_photo}>View</a>
                )}
              </Col>
              <Col>
                <strong>Aadhar Card Back:&nbsp;</strong>
                {data.partnership_aadhar_card_back_photo && (
                  <a href={data.partnership_aadhar_card_back_photo}>View</a>
                )}
              </Col>
            </Row>
            <Row>
              <Col>
                <strong>Telephone Bill:&nbsp;</strong>
                {data.partnership_telephone_bill && (
                  <a href={data.partnership_telephone_bill}>View</a>
                )}
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
                {data.company_certificate_of_incorporation_img && (
                  <a href={data.company_certificate_of_incorporation_img}>
                    View
                  </a>
                )}
              </Col>
              <Col>
                <strong>Memorandum of Association:&nbsp;</strong>
                {data.company_memorandum_of_association_img && (
                  <a href={data.company_memorandum_of_association_img}>View</a>
                )}
              </Col>
              <Col>
                <strong>Articles of Association:&nbsp;</strong>
                {data.company_articles_of_association_img && (
                  <a href={data.company_articles_of_association_img}>View</a>
                )}
              </Col>
            </Row>
            <Row>
              <Col>
                <strong>Power of Attorney:&nbsp;</strong>
                {data.company_power_of_attorney_img && (
                  <a href={data.company_power_of_attorney_img}>View</a>
                )}
              </Col>
              <Col>
                <strong>Telephone Bill:&nbsp;</strong>
                {data.company_telephone_bill_img && (
                  <a href={data.company_telephone_bill_img}>View</a>
                )}
              </Col>
              <Col>
                <strong>PAN Allotment Letter:&nbsp;</strong>
                {data.company_pan_allotment_letter_img && (
                  <a href={data.company_pan_allotment_letter_img}>View</a>
                )}
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
                {data.trust_certificate_of_registration_img && (
                  <a href={data.trust_certificate_of_registration_img}>View</a>
                )}
              </Col>
              <Col>
                <strong>Power of Attorney:&nbsp;</strong>
                {data.trust_power_of_attorney_img && (
                  <a href={data.trust_power_of_attorney_img}>View</a>
                )}
              </Col>
              <Col>
                <strong>Offically Valid Document:&nbsp;</strong>
                {data.trust_officially_valid_document_img && (
                  <a href={data.trust_officially_valid_document_img}>View</a>
                )}
              </Col>
            </Row>
            <Row>
              <Col>
                <strong>Resoultion of Managing Body:&nbsp;</strong>
                {data.trust_resolution_of_managing_body_img && (
                  <a href={data.trust_resolution_of_managing_body_img}>View</a>
                )}
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

  const downloadBase64File = (base64Data, fileName) => {
    const [prefix, base64String] = base64Data.split(",");
    const linkSource = `${prefix},${base64String}`;
    const downloadLink = document.createElement("a");
    downloadLink.href = linkSource;
    downloadLink.download = fileName;
    downloadLink.click();
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
                <Row>
                  <Col>
                    <strong>GST Registration Certificate: </strong>
                    {address.gst_reg && (
                      <>
                        {/* eslint-disable-next-line */}
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            downloadBase64File(
                              address.gst_reg,
                              `GST_Registration_Certificate_${id}.pdf`
                            );
                          }}
                        >
                          View
                        </a>
                      </>
                    )}
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
              {data.authorised_signatories && (
                <a href={data.authorised_signatories}>View</a>
              )}
            </Col>
          </Row>
          <br />
          <h6>
            <strong>Authorisation Letter</strong>
          </h6>
          <Row>
            <Col>
              {data.authorisation_letter && (
                <a href={data.authorisation_letter}>View</a>
              )}
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
              {data.iec_copy && <a href={data.iec_copy}>View</a>}
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
              {data.pan_copy && <a href={data.pan_copy}>View</a>}
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
                    {bank.ad_code}
                  </Col>
                  <Col>
                    <strong>AD Code File: </strong>
                    {bank.ad_code_file && (
                      <>
                        {/* eslint-disable-next-line */}
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            downloadBase64File(
                              bank.ad_code_file,
                              `AD_Code_File_${id}.pdf`
                            );
                          }}
                        >
                          View
                        </a>
                      </>
                    )}
                  </Col>
                </Row>
              </div>
            );
          })}

          <br />
          <h4>Other Documents</h4>
          {data.other_documents?.map((doc, id) => {
            return (
              <Row key={id}>
                <Col>
                  <a href={doc}>View</a>
                </Col>
              </Row>
            );
          })}
          <br />
          <Row>
            <Col>
              <strong>SPCB Registration Certificate: </strong>
              {data.spcb_reg && <a href={data.spcb_reg}>View</a>}
            </Col>
            <Col>
              <strong>KYC Verification Images: </strong>
              {data.kyc_verification_images &&
                data.kyc_verification_images.map((data, id) => (
                  <a href={data}>View</a>
                ))}
            </Col>
            <Col>
              <strong>GST Returns: </strong>
              {data.gst_returns &&
                data.gst_returns.map((data, id) => <a href={data}>View</a>)}
            </Col>
          </Row>
          <br />
          {supportingDocuments(data.category)}
        </>
      )}
    </div>
  );
}

export default ViewCompletedKycDetails;
