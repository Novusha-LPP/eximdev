import React, { useState } from "react";
import FileUpload from "../components/gallery/FileUpload";
import ImagePreview from "../components/gallery/ImagePreview";

function useSupportingDocuments(formik) {
  const [fileSnackbar, setFileSnackbar] = useState(false);

  function getSupportingDocs() {
    const customerName = formik.values.name_of_individual || "customer";

    if (formik.values.category === "Individual/ Proprietary Firm") {
      return (
        <div className="form-section">
          <h4 className="section-title">Supporting Documents</h4>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Passport Copy</label>
              <FileUpload
                label="Upload Passport"
                onFilesUploaded={(files) => formik.setFieldValue("individual_passport_img", files[0] || "")}
                bucketPath="passport"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.individual_passport_img && (
                <ImagePreview images={formik.values.individual_passport_img} onDeleteImage={() => formik.setFieldValue("individual_passport_img", "")} showDeleteForAdmin={true} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Voter ID Card</label>
              <FileUpload
                label="Upload Voter ID"
                onFilesUploaded={(files) => formik.setFieldValue("individual_voter_card_img", files[0] || "")}
                bucketPath="voter-card"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.individual_voter_card_img && (
                <ImagePreview images={formik.values.individual_voter_card_img} onDeleteImage={() => formik.setFieldValue("individual_voter_card_img", "")} showDeleteForAdmin={true} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Driving License</label>
              <FileUpload
                label="Upload License"
                onFilesUploaded={(files) => formik.setFieldValue("individual_driving_license_img", files[0] || "")}
                bucketPath="driving-license"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.individual_driving_license_img && (
                <ImagePreview images={formik.values.individual_driving_license_img} onDeleteImage={() => formik.setFieldValue("individual_driving_license_img", "")} showDeleteForAdmin={true} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Bank Statement</label>
              <FileUpload
                label="Upload Statement"
                onFilesUploaded={(files) => formik.setFieldValue("individual_bank_statement_img", files[0] || "")}
                bucketPath="bank-statement"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.individual_bank_statement_img && (
                <ImagePreview images={formik.values.individual_bank_statement_img} onDeleteImage={() => formik.setFieldValue("individual_bank_statement_img", "")} showDeleteForAdmin={true} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Ration Card</label>
              <FileUpload
                label="Upload Ration Card"
                onFilesUploaded={(files) => formik.setFieldValue("individual_ration_card_img", files[0] || "")}
                bucketPath="ration-card"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.individual_ration_card_img && (
                <ImagePreview images={formik.values.individual_ration_card_img} onDeleteImage={() => formik.setFieldValue("individual_ration_card_img", "")} showDeleteForAdmin={true} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Aadhar Card</label>
              <FileUpload
                label="Upload Aadhar"
                onFilesUploaded={(files) => formik.setFieldValue("individual_aadhar_card", files[0] || "")}
                bucketPath="aadhar-card"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.individual_aadhar_card && (
                <ImagePreview images={formik.values.individual_aadhar_card} onDeleteImage={() => formik.setFieldValue("individual_aadhar_card", "")} showDeleteForAdmin={true} />
              )}
            </div>
          </div>
        </div>
      );
    } else if (formik.values.category === "Partnership Firm") {
      return (
        <div className="form-section">
          <h4 className="section-title">Supporting Documents (Partnership)</h4>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Registration Certificate</label>
              <FileUpload
                label="Upload Registration"
                onFilesUploaded={(files) => formik.setFieldValue("partnership_registration_certificate_img", files[0] || "")}
                bucketPath="partnership-reg"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.partnership_registration_certificate_img && (
                <ImagePreview images={formik.values.partnership_registration_certificate_img} onDeleteImage={() => formik.setFieldValue("partnership_registration_certificate_img", "")} showDeleteForAdmin={true} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Partnership Deed</label>
              <FileUpload
                label="Upload Deed"
                onFilesUploaded={(files) => formik.setFieldValue("partnership_deed_img", files[0] || "")}
                bucketPath="partnership-deed"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.partnership_deed_img && (
                <ImagePreview images={formik.values.partnership_deed_img} onDeleteImage={() => formik.setFieldValue("partnership_deed_img", "")} showDeleteForAdmin={true} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Power of Attorney</label>
              <FileUpload
                label="Upload PoA"
                onFilesUploaded={(files) => formik.setFieldValue("partnership_power_of_attorney_img", files[0] || "")}
                bucketPath="partnership-poa"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.partnership_power_of_attorney_img && (
                <ImagePreview images={formik.values.partnership_power_of_attorney_img} onDeleteImage={() => formik.setFieldValue("partnership_power_of_attorney_img", "")} showDeleteForAdmin={true} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Aadhar Front</label>
              <FileUpload
                label="Upload Front"
                onFilesUploaded={(files) => formik.setFieldValue("partnership_aadhar_card_front_photo", files[0] || "")}
                bucketPath="partnership-aadhar-front"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.partnership_aadhar_card_front_photo && (
                <ImagePreview images={formik.values.partnership_aadhar_card_front_photo} onDeleteImage={() => formik.setFieldValue("partnership_aadhar_card_front_photo", "")} showDeleteForAdmin={true} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Aadhar Back</label>
              <FileUpload
                label="Upload Back"
                onFilesUploaded={(files) => formik.setFieldValue("partnership_aadhar_card_back_photo", files[0] || "")}
                bucketPath="partnership-aadhar-back"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.partnership_aadhar_card_back_photo && (
                <ImagePreview images={formik.values.partnership_aadhar_card_back_photo} onDeleteImage={() => formik.setFieldValue("partnership_aadhar_card_back_photo", "")} showDeleteForAdmin={true} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Valid Document Phote</label>
              <FileUpload
                label="Upload Document"
                onFilesUploaded={(files) => formik.setFieldValue("partnership_valid_document", files[0] || "")}
                bucketPath="partnership-valid-doc"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.partnership_valid_document && (
                <ImagePreview images={formik.values.partnership_valid_document} onDeleteImage={() => formik.setFieldValue("partnership_valid_document", "")} showDeleteForAdmin={true} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Telephone/Electricity Bill</label>
              <FileUpload
                label="Upload Bill"
                onFilesUploaded={(files) => formik.setFieldValue("partnership_telephone_bill", files[0] || "")}
                bucketPath="partnership-bill"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.partnership_telephone_bill && (
                <ImagePreview images={formik.values.partnership_telephone_bill} onDeleteImage={() => formik.setFieldValue("partnership_telephone_bill", "")} showDeleteForAdmin={true} />
              )}
            </div>
          </div>
        </div>
      );
    } else if (formik.values.category === "Company") {
      return (
        <div className="form-section">
          <h4 className="section-title">Supporting Documents (Company)</h4>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Certificate of Incorporation</label>
              <FileUpload
                label="Upload Certificate"
                onFilesUploaded={(files) => formik.setFieldValue("company_certificate_of_incorporation_img", files[0] || "")}
                bucketPath="company-incorporation"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.company_certificate_of_incorporation_img && (
                <ImagePreview images={formik.values.company_certificate_of_incorporation_img} onDeleteImage={() => formik.setFieldValue("company_certificate_of_incorporation_img", "")} showDeleteForAdmin={true} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">MoA</label>
              <FileUpload
                label="Upload MoA"
                onFilesUploaded={(files) => formik.setFieldValue("company_memorandum_of_association_img", files[0] || "")}
                bucketPath="company-moa"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.company_memorandum_of_association_img && (
                <ImagePreview images={formik.values.company_memorandum_of_association_img} onDeleteImage={() => formik.setFieldValue("company_memorandum_of_association_img", "")} showDeleteForAdmin={true} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">AoA</label>
              <FileUpload
                label="Upload AoA"
                onFilesUploaded={(files) => formik.setFieldValue("company_articles_of_association_img", files[0] || "")}
                bucketPath="company-aoa"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.company_articles_of_association_img && (
                <ImagePreview images={formik.values.company_articles_of_association_img} onDeleteImage={() => formik.setFieldValue("company_articles_of_association_img", "")} showDeleteForAdmin={true} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Power of Attorney</label>
              <FileUpload
                label="Upload PoA"
                onFilesUploaded={(files) => formik.setFieldValue("company_power_of_attorney_img", files[0] || "")}
                bucketPath="company-poa"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.company_power_of_attorney_img && (
                <ImagePreview images={formik.values.company_power_of_attorney_img} onDeleteImage={() => formik.setFieldValue("company_power_of_attorney_img", "")} showDeleteForAdmin={true} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Telephone/Electricity Bill</label>
              <FileUpload
                label="Upload Bill"
                onFilesUploaded={(files) => formik.setFieldValue("company_telephone_bill_img", files[0] || "")}
                bucketPath="company-bill"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.company_telephone_bill_img && (
                <ImagePreview images={formik.values.company_telephone_bill_img} onDeleteImage={() => formik.setFieldValue("company_telephone_bill_img", "")} showDeleteForAdmin={true} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">PAN Allotment Letter</label>
              <FileUpload
                label="Upload PAN Letter"
                onFilesUploaded={(files) => formik.setFieldValue("company_pan_allotment_letter_img", files[0] || "")}
                bucketPath="company-pan-letter"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.company_pan_allotment_letter_img && (
                <ImagePreview images={formik.values.company_pan_allotment_letter_img} onDeleteImage={() => formik.setFieldValue("company_pan_allotment_letter_img", "")} showDeleteForAdmin={true} />
              )}
            </div>
          </div>
        </div>
      );
    } else if (formik.values.category === "Trust Foundations") {
      return (
        <div className="form-section">
          <h4 className="section-title">Supporting Documents (Trust)</h4>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Registration Certificate</label>
              <FileUpload
                label="Upload Registration"
                onFilesUploaded={(files) => formik.setFieldValue("trust_certificate_of_registration_img", files[0] || "")}
                bucketPath="trust-reg"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.trust_certificate_of_registration_img && (
                <ImagePreview images={formik.values.trust_certificate_of_registration_img} onDeleteImage={() => formik.setFieldValue("trust_certificate_of_registration_img", "")} showDeleteForAdmin={true} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Power of Attorney</label>
              <FileUpload
                label="Upload PoA"
                onFilesUploaded={(files) => formik.setFieldValue("trust_power_of_attorney_img", files[0] || "")}
                bucketPath="trust-poa"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.trust_power_of_attorney_img && (
                <ImagePreview images={formik.values.trust_power_of_attorney_img} onDeleteImage={() => formik.setFieldValue("trust_power_of_attorney_img", "")} showDeleteForAdmin={true} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Valid Document</label>
              <FileUpload
                label="Upload Document"
                onFilesUploaded={(files) => formik.setFieldValue("trust_officially_valid_document_img", files[0] || "")}
                bucketPath="trust-valid-doc"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.trust_officially_valid_document_img && (
                <ImagePreview images={formik.values.trust_officially_valid_document_img} onDeleteImage={() => formik.setFieldValue("trust_officially_valid_document_img", "")} showDeleteForAdmin={true} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Resolution of Managing Body</label>
              <FileUpload
                label="Upload Resolution"
                onFilesUploaded={(files) => formik.setFieldValue("trust_resolution_of_managing_body_img", files[0] || "")}
                bucketPath="trust-resolution"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.trust_resolution_of_managing_body_img && (
                <ImagePreview images={formik.values.trust_resolution_of_managing_body_img} onDeleteImage={() => formik.setFieldValue("trust_resolution_of_managing_body_img", "")} showDeleteForAdmin={true} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Telephone/Electricity Bill</label>
              <FileUpload
                label="Upload Bill"
                onFilesUploaded={(files) => formik.setFieldValue("trust_telephone_bill_img", files[0] || "")}
                bucketPath="trust-bill"
                multiple={false}
                customerName={customerName}
              />
              {formik.values.trust_telephone_bill_img && (
                <ImagePreview images={formik.values.trust_telephone_bill_img} onDeleteImage={() => formik.setFieldValue("trust_telephone_bill_img", "")} showDeleteForAdmin={true} />
              )}
            </div>
          </div>
          <div className="grid-2" style={{ marginTop: "1.5rem" }}>
            <div className="form-group">
              <label className="form-label">Name of trustees, settlers, etc.</label>
              <input type="text" name="trust_name_of_trustees" className="form-control" value={formik.values.trust_name_of_trustees} onChange={formik.handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Name of founder/managers</label>
              <input type="text" name="trust_name_of_founder" className="form-control" value={formik.values.trust_name_of_founder} onChange={formik.handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Address of founder/managers</label>
              <input type="text" name="trust_address_of_founder" className="form-control" value={formik.values.trust_address_of_founder} onChange={formik.handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Mobile of founder/managers</label>
              <input type="text" name="trust_telephone_of_founder" className="form-control" value={formik.values.trust_telephone_of_founder} onChange={formik.handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Email of founder/managers</label>
              <input type="email" name="trust_email_of_founder" className="form-control" value={formik.values.trust_email_of_founder} onChange={formik.handleChange} />
            </div>
          </div>
        </div>
      );
    }
    return null;
  }
  return { getSupportingDocs, fileSnackbar, setFileSnackbar };
}

export default useSupportingDocuments;
