import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Row, Col } from "react-bootstrap";
import { TextField } from "@mui/material";
import BackButton from "./BackButton";
import "./customerKyc.css";
import { ViewButton, MultipleViewButtons } from "../../utils/documentHelpers";
import ImagePreview from "../gallery/ImagePreview";
import { useSnackbar } from "../../contexts/SnackbarContext";
import { UserContext } from "../../contexts/UserContext";

function ViewCompletedKycDetails() {
  const { _id } = useParams();
  const [data, setData] = useState();
  const { showSuccess, showError } = useSnackbar();
  const { user } = useContext(UserContext);

  useEffect(() => {
    async function getData() {
      const res = await axios(
        `${process.env.REACT_APP_API_STRING}/view-customer-kyc-details/${_id}`
      );

      setData(res.data);
      console.log("Fetching KYC details for ID:", res);
    }
    console.log(data, "data.authorisation_letter");
    getData();
  }, [_id]);

  // Handle file deletion by admin
  const handleFileDelete = async (fileIndex, fieldName, arrayIndex = null) => {
    try {
      // Create a copy of data to update
      const updatedData = { ...data };

      if (arrayIndex !== null && fieldName.includes(".")) {
        // Handle nested array fields (like factory_addresses.gst_reg or banks.adCode_file)
        const [arrayField, subField] = fieldName.split(".");
        if (updatedData[arrayField] && updatedData[arrayField][arrayIndex]) {
          if (Array.isArray(updatedData[arrayField][arrayIndex][subField])) {
            const newArray = [...updatedData[arrayField][arrayIndex][subField]];
            newArray.splice(fileIndex, 1);
            updatedData[arrayField] = [...updatedData[arrayField]];
            updatedData[arrayField][arrayIndex] = {
              ...updatedData[arrayField][arrayIndex],
              [subField]: newArray,
            };
          } else {
            // Handle single file in nested structure
            updatedData[arrayField] = [...updatedData[arrayField]];
            updatedData[arrayField][arrayIndex] = {
              ...updatedData[arrayField][arrayIndex],
              [subField]: "",
            };
          }
        }
      } else {
        // Handle regular array fields
        if (Array.isArray(updatedData[fieldName])) {
          const newArray = [...updatedData[fieldName]];
          newArray.splice(fileIndex, 1);
          updatedData[fieldName] = newArray;
        } else {
          // Handle single file fields
          updatedData[fieldName] = "";
        }
      }

      // Update the database
      await axios.put(
        `${process.env.REACT_APP_API_STRING}/update-customer-kyc/${_id}`,
        updatedData
      );

      // Update local state
      setData(updatedData);
      showSuccess("File deleted successfully by admin");
    } catch (error) {
      console.error("Error updating database after file deletion:", error);
      showError("Failed to update database. Please refresh and try again.");
    }
  };

  const supportingDocuments = (type) => {
    switch (type) {
      case "Individual/ Proprietary Firm":
        return (
          <>
            <Row>
              <Col>
                <strong>Passport:&nbsp;</strong>
                <ImagePreview
                  images={data.individual_passport_img}
                  onDeleteImage={(index) =>
                    handleFileDelete(index, "individual_passport_img")
                  }
                  showDeleteForAdmin={true}
                />
              </Col>
              <Col>
                <strong>Voter Card:&nbsp;</strong>
                <ImagePreview
                  images={data.individual_voter_card_img}
                  onDeleteImage={(index) =>
                    handleFileDelete(index, "individual_voter_card_img")
                  }
                  showDeleteForAdmin={true}
                />
              </Col>
              <Col>
                <strong>Driving License:&nbsp;</strong>
                <ImagePreview
                  images={data.individual_driving_license_img}
                  onDeleteImage={(index) =>
                    handleFileDelete(index, "individual_driving_license_img")
                  }
                  showDeleteForAdmin={true}
                />
              </Col>
            </Row>
            <Row>
              <Col>
                <strong>Bank Statement:&nbsp;</strong>
                <ImagePreview
                  images={data.individual_bank_statement_img}
                  onDeleteImage={(index) =>
                    handleFileDelete(index, "individual_bank_statement_img")
                  }
                  showDeleteForAdmin={true}
                />
              </Col>
              <Col>
                <strong>Ration Card:&nbsp;</strong>
                <ImagePreview
                  images={data.individual_ration_card_img}
                  onDeleteImage={(index) =>
                    handleFileDelete(index, "individual_ration_card_img")
                  }
                  showDeleteForAdmin={true}
                />
              </Col>
              <Col>
                <strong>Aadhar Card:&nbsp;</strong>
                <ImagePreview
                  images={data.individual_aadhar_card}
                  onDeleteImage={(index) =>
                    handleFileDelete(index, "individual_aadhar_card")
                  }
                  showDeleteForAdmin={true}
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
                <ImagePreview
                  images={data.partnership_registration_certificate_img}
                  onDeleteImage={(index) =>
                    handleFileDelete(
                      index,
                      "partnership_registration_certificate_img"
                    )
                  }
                  showDeleteForAdmin={true}
                />
              </Col>
              <Col>
                <strong>Partnership Deed:&nbsp;</strong>
                <ImagePreview
                  images={data.partnership_deed_img}
                  onDeleteImage={(index) =>
                    handleFileDelete(index, "partnership_deed_img")
                  }
                  showDeleteForAdmin={true}
                />
              </Col>
              <Col>
                <strong>Power of Attorney:&nbsp;</strong>
                <ImagePreview
                  images={data.partnership_power_of_attorney_img}
                  onDeleteImage={(index) =>
                    handleFileDelete(index, "partnership_power_of_attorney_img")
                  }
                  showDeleteForAdmin={true}
                />
              </Col>
            </Row>
            <Row>
              <Col>
                <strong>Valid Document:&nbsp;</strong>
                <ImagePreview
                  images={data.partnership_valid_document}
                  onDeleteImage={(index) =>
                    handleFileDelete(index, "partnership_valid_document")
                  }
                  showDeleteForAdmin={true}
                />
              </Col>
              <Col>
                <strong>Aadhar Card Front:&nbsp;</strong>
                <ImagePreview
                  images={data.partnership_aadhar_card_front_photo}
                  onDeleteImage={(index) =>
                    handleFileDelete(
                      index,
                      "partnership_aadhar_card_front_photo"
                    )
                  }
                  showDeleteForAdmin={true}
                />
              </Col>
              <Col>
                <strong>Aadhar Card Back:&nbsp;</strong>
                <ImagePreview
                  images={data.partnership_aadhar_card_back_photo}
                  onDeleteImage={(index) =>
                    handleFileDelete(
                      index,
                      "partnership_aadhar_card_back_photo"
                    )
                  }
                  showDeleteForAdmin={true}
                />
              </Col>
            </Row>
            <Row>
              <Col>
                <strong>Telephone Bill:&nbsp;</strong>
                <ImagePreview
                  images={data.partnership_telephone_bill}
                  onDeleteImage={(index) =>
                    handleFileDelete(index, "partnership_telephone_bill")
                  }
                  showDeleteForAdmin={true}
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
                <ImagePreview
                  images={data.company_certificate_of_incorporation_img}
                  onDeleteImage={(index) =>
                    handleFileDelete(
                      index,
                      "company_certificate_of_incorporation_img"
                    )
                  }
                  showDeleteForAdmin={true}
                />
              </Col>
              <Col>
                <strong>Memorandum of Association:&nbsp;</strong>
                <ImagePreview
                  images={data.company_memorandum_of_association_img}
                  onDeleteImage={(index) =>
                    handleFileDelete(
                      index,
                      "company_memorandum_of_association_img"
                    )
                  }
                  showDeleteForAdmin={true}
                />
              </Col>
              <Col>
                <strong>Articles of Association:&nbsp;</strong>
                <ImagePreview
                  images={data.company_articles_of_association_img}
                  onDeleteImage={(index) =>
                    handleFileDelete(
                      index,
                      "company_articles_of_association_img"
                    )
                  }
                  showDeleteForAdmin={true}
                />
              </Col>
            </Row>
            <Row>
              <Col>
                <strong>Power of Attorney:&nbsp;</strong>
                <ImagePreview
                  images={data.company_power_of_attorney_img}
                  onDeleteImage={(index) =>
                    handleFileDelete(index, "company_power_of_attorney_img")
                  }
                  showDeleteForAdmin={true}
                />
              </Col>
              <Col>
                <strong>Telephone Bill:&nbsp;</strong>
                <ImagePreview
                  images={data.company_telephone_bill_img}
                  onDeleteImage={(index) =>
                    handleFileDelete(index, "company_telephone_bill_img")
                  }
                  showDeleteForAdmin={true}
                />
              </Col>
              <Col>
                <strong>PAN Allotment Letter:&nbsp;</strong>
                <ImagePreview
                  images={data.company_pan_allotment_letter_img}
                  onDeleteImage={(index) =>
                    handleFileDelete(index, "company_pan_allotment_letter_img")
                  }
                  showDeleteForAdmin={true}
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
                <ImagePreview
                  images={data.trust_certificate_of_registration_img}
                  onDeleteImage={(index) =>
                    handleFileDelete(
                      index,
                      "trust_certificate_of_registration_img"
                    )
                  }
                  showDeleteForAdmin={true}
                />
              </Col>
              <Col>
                <strong>Power of Attorney:&nbsp;</strong>
                <ImagePreview
                  images={data.trust_power_of_attorney_img}
                  onDeleteImage={(index) =>
                    handleFileDelete(index, "trust_power_of_attorney_img")
                  }
                  showDeleteForAdmin={true}
                />
              </Col>
              <Col>
                <strong>Offically Valid Document:&nbsp;</strong>
                <ImagePreview
                  images={data.trust_officially_valid_document_img}
                  onDeleteImage={(index) =>
                    handleFileDelete(
                      index,
                      "trust_officially_valid_document_img"
                    )
                  }
                  showDeleteForAdmin={true}
                />
              </Col>
            </Row>
            <Row>
              <Col>
                <strong>Resoultion of Managing Body:&nbsp;</strong>
                <ImagePreview
                  images={data.trust_resolution_of_managing_body_img}
                  onDeleteImage={(index) =>
                    handleFileDelete(
                      index,
                      "trust_resolution_of_managing_body_img"
                    )
                  }
                  showDeleteForAdmin={true}
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

  if (!user || user.role !== "Admin") {
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          color: "#d32f2f",
          fontWeight: 600,
        }}
      >
        You do not have permission to view this page.
      </div>
    );
  }

  return (
    <div
      style={{
        width: "80%",
        margin: "auto",
        boxShadow: "2px 2px 50px 10px rgba(0, 0, 0, 0.05)",
        padding: "20px",
      }}
    >
      {/* Header with Back Button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "20px",
          padding: "10px 0",
          borderBottom: "2px solid #e0e0e0",
        }}
      >
        <BackButton />
        <h2
          style={{
            color: "var(--primary-orange)",
            margin: "0 auto",
            textAlign: "center",
            flex: 1,
          }}
        >
          📋 View Completed KYC Details
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
                    <ImagePreview
                      images={address.gst_reg}
                      onDeleteImage={(index) =>
                        handleFileDelete(index, "factory_addresses.gst_reg", id)
                      }
                      showDeleteForAdmin={true}
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
              <ImagePreview
                images={data.authorised_signatories}
                onDeleteImage={(index) =>
                  handleFileDelete(index, "authorised_signatories")
                }
                showDeleteForAdmin={true}
              />
            </Col>
          </Row>
          <br />
          <h6>
            <strong>Authorisation Letter</strong>
          </h6>
          <Row>
            <Col>
              <ImagePreview
                images={data.authorisation_letter}
                onDeleteImage={(index) =>
                  handleFileDelete(index, "authorisation_letter")
                }
                showDeleteForAdmin={true}
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
              <ImagePreview
                images={data.iec_copy}
                onDeleteImage={(index) => handleFileDelete(index, "iec_copy")}
                showDeleteForAdmin={true}
              />
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
              <ImagePreview
                images={data.pan_copy}
                onDeleteImage={(index) => handleFileDelete(index, "pan_copy")}
                showDeleteForAdmin={true}
              />
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
                    <ImagePreview
                      images={bank.adCode_file}
                      onDeleteImage={(index) =>
                        handleFileDelete(index, "banks.adCode_file", id)
                      }
                      showDeleteForAdmin={true}
                    />
                  </Col>
                </Row>
              </div>
            );
          })}

          <br />
          <h4>Other Documents</h4>
          <Row>
            <Col>
              <ImagePreview
                images={data.other_documents}
                onDeleteImage={(index) =>
                  handleFileDelete(index, "other_documents")
                }
                showDeleteForAdmin={true}
              />
            </Col>
          </Row>
          <br />
          <Row>
            <Col>
              <strong>SPCB Registration Certificate: </strong>
              <ImagePreview
                images={data.spcb_reg}
                onDeleteImage={(index) => handleFileDelete(index, "spcb_reg")}
                showDeleteForAdmin={true}
              />
            </Col>
            <Col>
              <strong>KYC Verification Images: </strong>
              <ImagePreview
                images={data.kyc_verification_images}
                onDeleteImage={(index) =>
                  handleFileDelete(index, "kyc_verification_images")
                }
                showDeleteForAdmin={true}
              />
            </Col>
            <Col>
              <strong>GST Returns: </strong>
              <ImagePreview
                images={data.gst_returns}
                onDeleteImage={(index) =>
                  handleFileDelete(index, "gst_returns")
                }
                showDeleteForAdmin={true}
              />
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
