import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../../styles/hr-modules.scss";

// Data item component
const DataItem = ({ label, value, isLink = false }) => (
  <div className="hr-compact-data-item">
    <div className="data-label">{label}</div>
    <div className="data-value">
      {isLink && value ? (
        <a href={value} target="_blank" rel="noopener noreferrer">View</a>
      ) : (
        value || '—'
      )}
    </div>
  </div>
);

function ViewIndividualKyc() {
  const { username } = useParams();
  const navigate = useNavigate();
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

  const employeeName = [data?.first_name, data?.middle_name, data?.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="hr-page-container">
      {/* Header */}
      <div className="hr-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button className="hr-compact-btn hr-compact-btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: '8px' }}>
            ← Back
          </button>
          <h1 className="hr-page-title">Employee KYC Details</h1>
        </div>
        {data && (
          <span className={`hr-compact-badge ${data.kyc_approval?.toLowerCase() === 'approved' ? 'approved' : data.kyc_approval?.toLowerCase() === 'rejected' ? 'rejected' : 'pending'}`}>
            {data.kyc_approval || 'Pending'}
          </span>
        )}
      </div>

      {data && (
        <>
          {/* Employee Header */}
          <div className="hr-compact-employee-header">
            <div className="emp-avatar">{employeeName.charAt(0)}</div>
            <div className="emp-info">
              <span className="emp-name">{employeeName}</span>
              <span className="emp-detail">Email: {data.email || data.personal_email}</span>
              <span className="emp-detail">Company: {data.company}</span>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="hr-compact-layout">
            {/* LEFT COLUMN */}
            <div>
              {/* Basic Info */}
              <div className="hr-compact-section">
                <div className="hr-section-header">Basic Information</div>
                <div className="hr-section-body">
                  <div className="hr-compact-data-grid">
                    <DataItem label="First Name" value={data.first_name} />
                    <DataItem label="Middle Name" value={data.middle_name} />
                    <DataItem label="Last Name" value={data.last_name} />
                    <DataItem label="Designation" value={data.designation} />
                    <DataItem label="Department" value={data.department} />
                    <DataItem label="Joining Date" value={data.joining_date} />
                    <DataItem label="Date of Birth" value={data.dob} />
                    <DataItem label="Blood Group" value={data.blood_group} />
                    <DataItem label="Qualification" value={data.highest_qualification} />
                    <DataItem label="Marital Status" value={data.marital_status} />
                    <DataItem label="Favorite Song" value={data.favorite_song} />
                  </div>
                </div>
              </div>

              {/* Permanent Address */}
              <div className="hr-compact-section">
                <div className="hr-section-header">Permanent Address</div>
                <div className="hr-section-body">
                  <div className="hr-compact-data-grid">
                    <DataItem label="Address Line 1" value={data.permanent_address_line_1} />
                    <DataItem label="Address Line 2" value={data.permanent_address_line_2} />
                    <DataItem label="City" value={data.permanent_address_city} />
                    <DataItem label="Area" value={data.permanent_address_area} />
                    <DataItem label="State" value={data.permanent_address_state} />
                    <DataItem label="PIN Code" value={data.permanent_address_pincode} />
                  </div>
                </div>
              </div>

              {/* Communication Address */}
              <div className="hr-compact-section">
                <div className="hr-section-header">Communication Address</div>
                <div className="hr-section-body">
                  <div className="hr-compact-data-grid">
                    <DataItem label="Address Line 1" value={data.communication_address_line_1} />
                    <DataItem label="Address Line 2" value={data.communication_address_line_2} />
                    <DataItem label="City" value={data.communication_address_city} />
                    <DataItem label="Area" value={data.communication_address_area} />
                    <DataItem label="State" value={data.communication_address_state} />
                    <DataItem label="PIN Code" value={data.communication_address_pincode} />
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="hr-compact-section">
                <div className="hr-section-header">Bank Details</div>
                <div className="hr-section-body">
                  <div className="hr-compact-data-grid">
                    <DataItem label="Account Number" value={data.bank_account_no} />
                    <DataItem label="Bank Name" value={data.bank_name} />
                    <DataItem label="IFSC Code" value={data.ifsc_code} />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div>
              {/* Contact Details */}
              <div className="hr-compact-section">
                <div className="hr-section-header">Contact Details</div>
                <div className="hr-section-body">
                  <div className="hr-compact-data-grid">
                    <DataItem label="Personal Email" value={data.personal_email} />
                    <DataItem label="Official Email" value={data.official_email} />
                    <DataItem label="Mobile" value={data.mobile} />
                    <DataItem label="Emergency Name" value={data.emergency_contact_name} />
                    <DataItem label="Emergency No." value={data.emergency_contact} />
                    <DataItem label="Friend Name" value={data.close_friend_contact_name} />
                    <DataItem label="Friend No." value={data.close_friend_contact_no} />
                  </div>
                </div>
              </div>

              {/* Family & Insurance */}
              <div className="hr-compact-section">
                <div className="hr-section-header">Family & Insurance</div>
                <div className="hr-section-body">
                  <div className="hr-compact-data-grid">
                    <DataItem label="Family Members" value={data.family_members?.join(", ")} />
                    <DataItem label="Insurance Status" value={data.insurance_status?.join(", ")} />
                    <DataItem label="PF Number" value={data.pf_no} />
                    <DataItem label="ESIC Number" value={data.esic_no} />
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="hr-compact-section">
                <div className="hr-section-header">Identity Documents</div>
                <div className="hr-section-body">
                  <div className="hr-compact-data-grid">
                    <DataItem label="PAN Number" value={data.pan_no} />
                    <DataItem label="PAN Card" value={data.pan_photo} isLink />
                    <DataItem label="Aadhaar No." value={data.aadhar_no} />
                    <DataItem label="Aadhaar Front" value={data.aadhar_photo_front} isLink />
                    <DataItem label="Aadhaar Back" value={data.aadhar_photo_back} isLink />
                    <DataItem label="License Front" value={data.license_front} isLink />
                    <DataItem label="License Back" value={data.license_back} isLink />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="hr-btn-row" style={{ justifyContent: 'flex-start' }}>
            <button className="hr-compact-btn hr-compact-btn-success" onClick={() => handleKycApproval(true)}>
              ✓ Approve KYC
            </button>
            <button className="hr-compact-btn hr-compact-btn-danger" onClick={() => handleKycApproval(false)}>
              ✕ Reject KYC
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default React.memo(ViewIndividualKyc);
