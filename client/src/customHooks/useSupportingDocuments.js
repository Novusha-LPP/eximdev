import React, { useState } from "react";
import { TextField } from "@mui/material";
import { handleSingleFileUpload } from "../utils/awsSingleFileUpload";

function useSupportingDocuments(formik) {
  const [fileSnackbar, setFileSnackbar] = useState(false);

  function getSupportingDocs() {
    if (formik.values.category === "Individual/ Proprietary Firm") {
      return (
        <>
          <h4>Supporting Documents</h4>
          <br />
          <label style={{ marginRight: "10px" }}>Passport:</label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "individual_passport_img",
                "passport_img",
                formik,
                setFileSnackbar
              )
            }
          />
          <br />
          {formik.touched.individual_passport_img &&
          formik.errors.individual_passport_img ? (
            <div style={{ color: "red" }}>
              {formik.errors.individual_passport_img}
            </div>
          ) : null}

          {formik.values.individual_passport_img && (
            <a href={formik.values.individual_passport_img}>View</a>
          )}
          <br />
          <br />
          <label style={{ marginRight: "10px" }}>Voter Card:</label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "individual_voter_card_img",
                "voter_card_img",
                formik,
                setFileSnackbar
              )
            }
          />
          <br />
          {formik.touched.individual_voter_card_img &&
          formik.errors.individual_voter_card_img ? (
            <div style={{ color: "red" }}>
              {formik.errors.individual_voter_card_img}
            </div>
          ) : null}
          {formik.values.individual_voter_card_img && (
            <a href={formik.values.individual_voter_card_img}>View</a>
          )}
          <br />
          <br />
          <label style={{ marginRight: "10px" }}>Driver's License:</label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "individual_driving_license_img",
                "driving_license_img",
                formik,
                setFileSnackbar
              )
            }
          />
          <br />
          {formik.touched.individual_driving_license_img &&
          formik.errors.individual_driving_license_img ? (
            <div style={{ color: "red" }}>
              {formik.errors.individual_driving_license_img}
            </div>
          ) : null}
          {formik.values.individual_driving_license_img && (
            <a href={formik.values.individual_driving_license_img}>View</a>
          )}
          <br />
          <br />
          <label style={{ marginRight: "10px" }}>Bank Statement:</label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "individual_bank_statement_img",
                "bank_statement_img",
                formik,
                setFileSnackbar
              )
            }
          />
          <br />
          {formik.touched.individual_bank_statement_img &&
          formik.errors.individual_bank_statement_img ? (
            <div style={{ color: "red" }}>
              {formik.errors.individual_bank_statement_img}
            </div>
          ) : null}
          {formik.values.individual_bank_statement_img && (
            <a href={formik.values.individual_bank_statement_img}>View</a>
          )}
          <br />
          <br />
          <label style={{ marginRight: "10px" }}>Ration Card:</label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "individual_ration_card_img",
                "ration_card_img",
                formik,
                setFileSnackbar
              )
            }
          />
          <br />
          {formik.touched.individual_ration_card_img &&
          formik.errors.individual_ration_card_img ? (
            <div style={{ color: "red" }}>
              {formik.errors.individual_ration_card_img}
            </div>
          ) : null}
          {formik.values.individual_ration_card_img && (
            <a href={formik.values.individual_ration_card_img}>View</a>
          )}
          <br />
          <br />
          <label style={{ marginRight: "10px" }}>Aadhar Card:</label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "individual_aadhar_card",
                "ration_card_img",
                formik,
                setFileSnackbar
              )
            }
          />
          <br />
          {formik.touched.individual_aadhar_card &&
          formik.errors.individual_aadhar_card ? (
            <div style={{ color: "red" }}>
              {formik.errors.individual_aadhar_card}
            </div>
          ) : null}
          {formik.values.individual_aadhar_card && (
            <a href={formik.values.individual_aadhar_card}>View</a>
          )}
          <br />
          <br />
        </>
      );
    } else if (formik.values.category === "Partnership Firm") {
      return (
        <>
          <h4>Supporting Documents</h4>
          <br />
          <label style={{ marginRight: "10px" }}>
            Registration certificate, if registered:
          </label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "partnership_registration_certificate_img",
                "registration_certificate_img",
                formik,
                setFileSnackbar
              )
            }
          />
          {formik.touched.partnership_registration_certificate_img &&
          formik.errors.partnership_registration_certificate_img ? (
            <div style={{ color: "red" }}>
              {formik.errors.partnership_registration_certificate_img}
            </div>
          ) : null}
          {formik.values.partnership_registration_certificate_img && (
            <a href={formik.values.partnership_registration_certificate_img}>
              View
            </a>
          )}
          <br />
          <br />
          <label style={{ marginRight: "10px" }}>Partnership deed:</label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "partnership_deed_img",
                "partnership_deed_img",
                formik,
                setFileSnackbar
              )
            }
          />
          {formik.touched.partnership_deed_img &&
          formik.errors.partnership_deed_img ? (
            <div style={{ color: "red" }}>
              {formik.errors.partnership_deed_img}
            </div>
          ) : null}
          {formik.values.partnership_deed_img && (
            <a href={formik.values.partnership_deed_img}>View</a>
          )}
          <br />
          <br />
          <label style={{ marginRight: "10px" }}>
            Power of Attorney(PoA) granted to a partner or an employee to
            transact business on its behalf:
          </label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "partnership_power_of_attorney_img",
                "power_of_attorney_partnership_img",
                formik,
                setFileSnackbar
              )
            }
          />
          {formik.touched.partnership_power_of_attorney_img &&
          formik.errors.partnership_power_of_attorney_img ? (
            <div style={{ color: "red" }}>
              {formik.errors.partnership_power_of_attorney_img}
            </div>
          ) : null}
          {formik.values.partnership_power_of_attorney_img && (
            <a href={formik.values.partnership_power_of_attorney_img}>View</a>
          )}
          <br />
          <br />
          <label style={{ marginRight: "10px" }}>Aadhar Card Front Photo</label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "partnership_aadhar_card_front_photo",
                "partnership_aadhar_card_front_photo",
                formik,
                setFileSnackbar
              )
            }
          />
          {formik.touched.partnership_aadhar_card_front_photo &&
          formik.errors.partnership_aadhar_card_front_photo ? (
            <div style={{ color: "red" }}>
              {formik.errors.partnership_aadhar_card_front_photo}
            </div>
          ) : null}
          {formik.values.partnership_aadhar_card_front_photo && (
            <a href={formik.values.partnership_aadhar_card_front_photo}>View</a>
          )}
          <br />
          <br />
          <label style={{ marginRight: "10px" }}>Aadhar Card Back Photo</label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "partnership_aadhar_card_back_photo",
                "partnership_aadhar_card_back_photo",
                formik,
                setFileSnackbar
              )
            }
          />
          {formik.touched.partnership_aadhar_card_back_photo &&
          formik.errors.partnership_aadhar_card_back_photo ? (
            <div style={{ color: "red" }}>
              {formik.errors.partnership_aadhar_card_back_photo}
            </div>
          ) : null}
          {formik.values.partnership_aadhar_card_back_photo && (
            <a href={formik.values.partnership_aadhar_card_back_photo}>View</a>
          )}
          <br />
          <br />
          <label style={{ marginRight: "10px" }}>Valid Document Photo</label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "partnership_valid_document",
                "partnership_valid_document",
                formik,
                setFileSnackbar
              )
            }
          />
          {formik.touched.partnership_valid_document &&
          formik.errors.partnership_valid_document ? (
            <div style={{ color: "red" }}>
              {formik.errors.partnership_valid_document}
            </div>
          ) : null}
          {formik.values.partnership_valid_document && (
            <a href={formik.values.partnership_valid_document}>View</a>
          )}
          <br />
          <br />
          <label style={{ marginRight: "10px" }}>
            Telephone/ Electricity bill in the name of firm/partners:
          </label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "partnership_telephone_bill",
                "telephone_bill_in_the_name_of_firm_img",
                formik,
                setFileSnackbar
              )
            }
          />
          {formik.touched.partnership_telephone_bill &&
          formik.errors.partnership_telephone_bill ? (
            <div style={{ color: "red" }}>
              {formik.errors.partnership_telephone_bill}
            </div>
          ) : null}
          {formik.values.partnership_telephone_bill && (
            <a href={formik.values.partnership_telephone_bill}>View</a>
          )}
          <br />
          <br />
        </>
      );
    } else if (formik.values.category === "Company") {
      return (
        <>
          <h4>Supporting Documents</h4>
          <br />
          <label style={{ marginRight: "10px" }}>
            Certificate of Incorporation:
          </label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "company_certificate_of_incorporation_img",
                "certificate_of_incorporation_img",
                formik,
                setFileSnackbar
              )
            }
          />
          <br />
          {formik.touched.company_certificate_of_incorporation_img &&
          formik.errors.company_certificate_of_incorporation_img ? (
            <div style={{ color: "red" }}>
              {formik.errors.company_certificate_of_incorporation_img}
            </div>
          ) : null}
          {formik.values.company_certificate_of_incorporation_img && (
            <a href={formik.values.company_certificate_of_incorporation_img}>
              View
            </a>
          )}
          <br />
          <br />
          <label style={{ marginRight: "10px" }}>
            Memorandum of Association:
          </label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "company_memorandum_of_association_img",
                "memorandum_of_association_img",
                formik,
                setFileSnackbar
              )
            }
          />
          <br />
          {formik.touched.company_memorandum_of_association_img &&
          formik.errors.company_memorandum_of_association_img ? (
            <div style={{ color: "red" }}>
              {formik.errors.company_memorandum_of_association_img}
            </div>
          ) : null}
          {formik.values.company_memorandum_of_association_img && (
            <a href={formik.values.company_memorandum_of_association_img}>
              View
            </a>
          )}
          <br />
          <br />
          <label style={{ marginRight: "10px" }}>
            Articles of Association:
          </label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "company_articles_of_association_img",
                "articles_of_association_img",
                formik,
                setFileSnackbar
              )
            }
          />
          <br />
          {formik.touched.company_articles_of_association_img &&
          formik.errors.company_articles_of_association_img ? (
            <div style={{ color: "red" }}>
              {formik.errors.company_articles_of_association_img}
            </div>
          ) : null}
          {formik.values.company_articles_of_association_img && (
            <a href={formik.values.company_articles_of_association_img}>View</a>
          )}
          <br />
          <br />
          <label style={{ marginRight: "10px" }}>
            Power of Attorney granted to its managers, officers or employees to
            transact business on its behalf:
          </label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "company_power_of_attorney_img",
                "power_of_attorney_company_img",
                formik,
                setFileSnackbar
              )
            }
          />
          <br />
          {formik.touched.company_power_of_attorney_img &&
          formik.errors.company_power_of_attorney_img ? (
            <div style={{ color: "red" }}>
              {formik.errors.company_power_of_attorney_img}
            </div>
          ) : null}
          {formik.values.company_power_of_attorney_img && (
            <a href={formik.values.company_power_of_attorney_img}>View</a>
          )}
          <br />
          <br />
          <label style={{ marginRight: "10px" }}>
            Telephone/ Electricity bill in the name of the company:
          </label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "company_telephone_bill_img",
                "telephone_bill_company_img",
                formik,
                setFileSnackbar
              )
            }
          />
          <br />
          {formik.touched.company_telephone_bill_img &&
          formik.errors.company_telephone_bill_img ? (
            <div style={{ color: "red" }}>
              {formik.errors.company_telephone_bill_img}
            </div>
          ) : null}
          {formik.values.company_telephone_bill_img && (
            <a href={formik.values.company_telephone_bill_img}>View</a>
          )}
          <br />
          <br />
          <label style={{ marginRight: "10px" }}>PAN allotment letter:</label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "company_pan_allotment_letter_img",
                "pan_allotment_letter_img",
                formik,
                setFileSnackbar
              )
            }
          />
          <br />
          {formik.touched.company_pan_allotment_letter_img &&
          formik.errors.company_pan_allotment_letter_img ? (
            <div style={{ color: "red" }}>
              {formik.errors.company_pan_allotment_letter_img}
            </div>
          ) : null}
          {formik.values.company_pan_allotment_letter_img && (
            <a href={formik.values.company_pan_allotment_letter_img}>View</a>
          )}
        </>
      );
    } else if (formik.values.category === "Trust Foundations") {
      return (
        <>
          <h4>Supporting Documents</h4>
          <br />
          <label style={{ marginRight: "10px" }}>
            Certificate of registration, if registered:
          </label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "trust_certificate_of_registration_img",
                "certificate_of_registration_img",
                formik,
                setFileSnackbar
              )
            }
          />
          <br />
          {formik.touched.trust_certificate_of_registration_img &&
          formik.errors.trust_certificate_of_registration_img ? (
            <div style={{ color: "red" }}>
              {formik.errors.trust_certificate_of_registration_img}
            </div>
          ) : null}
          {formik.values.trust_certificate_of_registration_img && (
            <a href={formik.values.trust_certificate_of_registration_img}>
              View
            </a>
          )}
          <br />
          <br />
          <label style={{ marginRight: "10px" }}>
            Power of Attorney (PoA) granted to transact business on its behalf:
          </label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "trust_power_of_attorney_img",
                "power_of_attorney_trust_img",
                formik,
                setFileSnackbar
              )
            }
          />
          <br />
          <br />
          {formik.touched.trust_power_of_attorney_img &&
          formik.errors.trust_power_of_attorney_img ? (
            <div style={{ color: "red" }}>
              {formik.errors.trust_power_of_attorney_img}
            </div>
          ) : null}
          {formik.values.trust_power_of_attorney_img && (
            <a href={formik.values.trust_power_of_attorney_img}>View</a>
          )}
          <br />
          <br />
          <label style={{ marginRight: "10px" }}>
            Any officially valid document to identify the trustees, settlers,
            beneficiaries and those holding the PoA, founders/managers/directors
            and their addresses:
          </label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "trust_officially_valid_document_img",
                "officially_valid_document_trust_img",
                formik,
                setFileSnackbar
              )
            }
          />
          <br />
          {formik.touched.trust_officially_valid_document_img &&
          formik.errors.trust_officially_valid_document_img ? (
            <div style={{ color: "red" }}>
              {formik.errors.trust_officially_valid_document_img}
            </div>
          ) : null}
          {formik.values.trust_officially_valid_document_img && (
            <a href={formik.values.trust_officially_valid_document_img}>View</a>
          )}
          <br />
          <br />
          <label style={{ marginRight: "10px" }}>
            Resolution of the managing body of the foundation/association:
          </label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "trust_resolution_of_managing_body_img",
                "resolution_of_managing_body_img",
                formik,
                setFileSnackbar
              )
            }
          />
          <br />
          {formik.touched.trust_resolution_of_managing_body_img &&
          formik.errors.trust_resolution_of_managing_body_img ? (
            <div style={{ color: "red" }}>
              {formik.errors.trust_resolution_of_managing_body_img}
            </div>
          ) : null}
          {formik.values.trust_resolution_of_managing_body_img && (
            <a href={formik.values.trust_resolution_of_managing_body_img}>
              View
            </a>
          )}
          <br />
          <br />
          <label style={{ marginRight: "10px" }}>
            Telephone/ Electricity bill in the name of trust/foundation:
          </label>
          <input
            type="file"
            onChange={(e) =>
              handleSingleFileUpload(
                e,
                "trust_telephone_bill_img",
                "telephone_bill_trust_img",
                formik,
                setFileSnackbar
              )
            }
          />
          <br />
          {formik.touched.trust_telephone_bill_img &&
          formik.errors.trust_telephone_bill_img ? (
            <div style={{ color: "red" }}>
              {formik.errors.trust_telephone_bill_img}
            </div>
          ) : null}
          {formik.values.trust_telephone_bill_img && (
            <a href={formik.values.trust_telephone_bill_img}>View</a>
          )}
          <br />

          <TextField
            fullWidth
            size="small"
            margin="dense"
            variant="filled"
            id="trust_name_of_trustees"
            name="trust_name_of_trustees"
            label="Name of trustees, settlers, beneficiaries and signatories"
            value={formik.values.trust_name_of_trustees}
            onChange={formik.handleChange}
            error={
              formik.touched.trust_name_of_trustees &&
              Boolean(formik.errors.trust_name_of_trustees)
            }
            helperText={
              formik.touched.trust_name_of_trustees &&
              formik.errors.trust_name_of_trustees
            }
            className="login-input"
          />
          <TextField
            fullWidth
            size="small"
            margin="dense"
            variant="filled"
            id="trust_name_of_founder"
            name="trust_name_of_founder"
            label="Name of the founder, the managers and trustees"
            value={formik.values.trust_name_of_founder}
            onChange={formik.handleChange}
            error={
              formik.touched.trust_name_of_founder &&
              Boolean(formik.errors.trust_name_of_founder)
            }
            helperText={
              formik.touched.trust_name_of_founder &&
              formik.errors.trust_name_of_founder
            }
            className="login-input"
          />
          <TextField
            fullWidth
            size="small"
            margin="dense"
            variant="filled"
            id="trust_address_of_founder"
            name="trust_address_of_founder"
            label="Address of the founder, the managers and trustees"
            value={formik.values.trust_address_of_founder}
            onChange={formik.handleChange}
            error={
              formik.touched.trust_address_of_founder &&
              Boolean(formik.errors.trust_address_of_founder)
            }
            helperText={
              formik.touched.trust_address_of_founder &&
              formik.errors.trust_address_of_founder
            }
            className="login-input"
          />
          <TextField
            fullWidth
            size="small"
            margin="dense"
            variant="filled"
            id="trust_telephone_of_founder"
            name="trust_telephone_of_founder"
            label="Mobile of the founder, the managers and trustees"
            value={formik.values.trust_telephone_of_founder}
            onChange={formik.handleChange}
            error={
              formik.touched.trust_telephone_of_founder &&
              Boolean(formik.errors.trust_telephone_of_founder)
            }
            helperText={
              formik.touched.trust_telephone_of_founder &&
              formik.errors.trust_telephone_of_founder
            }
            className="login-input"
          />
          <TextField
            fullWidth
            size="small"
            margin="dense"
            variant="filled"
            id="trust_email_of_founder"
            name="trust_email_of_founder"
            label="Email of the founder, the managers and trustees"
            value={formik.values.trust_email_of_founder}
            onChange={formik.handleChange}
            error={
              formik.touched.trust_email_of_founder &&
              Boolean(formik.errors.trust_email_of_founder)
            }
            helperText={
              formik.touched.trust_email_of_founder &&
              formik.errors.trust_email_of_founder
            }
            className="login-input"
          />
        </>
      );
    }
  }
  return { getSupportingDocs, fileSnackbar, setFileSnackbar };
}

export default useSupportingDocuments;
