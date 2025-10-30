import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './BEStatus.css';

const BEStatus = () => {
  const { beNo, beDt, location } = useParams();
  const [beDetails, setBeDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navItems = [
    { id: 'be-details', label: 'BE Details' },
    { id: 'current-status', label: 'Current Status' },
    { id: 'payment', label: 'Payment Details' },
    { id: 'edocument', label: 'eDocument Validity' },
    { id: 'amendment', label: 'BE Amendment' },
    { id: 'agencies', label: 'Other Agencies' }
  ];

  const [activeNav, setActiveNav] = useState('be-details');
  const decodedLocation = location.match(/\(([^)]+)\)/)?.[1] || location;

  useEffect(() => {
    if (location && beNo && beDt) {
      const locationCode = location.match(/\(([^)]+)\)/)?.[1] || location;
      const formattedDate = beDt.replace(/-/g, '');
      
      fetchBEDetails({ 
        location: locationCode,
        beDt: formattedDate,
        beNo: beNo
      });
    } else {
      setError('Missing required URL parameters: location, beNo, or beDt');
    }
  }, [location, beNo, beDt]);

  const fetchBEDetails = async () => {
    setLoading(true);
    setError('');

    try {
      let formattedBeDt = beDt;
      if (beDt && beDt.includes('-')) {
        formattedBeDt = beDt.replace(/-/g, '');
      }
      
      const response = await axios.post(
        `${process.env.REACT_APP_API_STRING}/be-details`, 
        {
          location: decodedLocation,
          beNo,
          beDt: formattedBeDt
        },
        {
          timeout: 35000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setBeDetails(response.data.data);
      } else {
        setError(response.data.error || 'Failed to fetch BE details');
      }
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        setError('Cannot connect to backend server. Please ensure the proxy server is running on port 5000.');
      } else if (err.code === 'ECONNABORTED') {
        setError('Request timeout. The ICEGATE server might be slow.');
      } else if (err.response) {
        setError(`Server error: ${err.response.status} - ${err.response.data?.error || 'Unknown error'}`);
      } else {
        setError(`Network error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderBEDetailsContent = () => {
    if (!beDetails?.beDetailsModel?.[0]) return <p>No data available.</p>;
    const detail = beDetails.beDetailsModel[0];

    return (
      <div className="content-grid">
        <div className="field"><label>IEC:</label><span>{detail.iec || 'N.A.'}</span></div>
        <div className="field"><label>Total Value:</label><span>{detail.totalVal || 'N.A.'}</span></div>
        <div className="field"><label>Type:</label><span>{detail.typ || 'N.A.'}</span></div>
        <div className="field"><label>CHA Number:</label><span>{detail.chaNo || 'N.A.'}</span></div>
        <div className="field"><label>First Check:</label><span>{detail.firstCheck || 'N.A.'}</span></div>
        <div className="field"><label>Prior BE:</label><span>{detail.priorBe || 'N.A.'}</span></div>
        <div className="field"><label>Section 48:</label><span>{detail.sec48 || 'N.A.'}</span></div>
        <div className="field"><label>Appraising Group:</label><span>{detail.appraisingGroup || 'N.A.'}</span></div>
        <div className="field"><label>Total Assessible Value:</label><span>{detail.totalAssessableValue || 'N.A.'}</span></div>
        <div className="field"><label>Total Package:</label><span>{detail.totalPackage || 'N.A.'}</span></div>
        <div className="field"><label>Gross Weight (Kg):</label><span>{detail.grossWeight || 'N.A.'}</span></div>
        <div className="field"><label>Total Duty (INR):</label><span>{detail.totalDuty || 'N.A.'}</span></div>
        <div className="field"><label>Fine Penalty (INR):</label><span>{detail.finePenalty || 'N.A.'}</span></div>
        <div className="field"><label>WBE No.:</label><span>{detail.wbeNo || 'N.A.'}</span></div>
      </div>
    );
  };

  const renderCurrentStatusContent = () => {
    if (!beDetails?.currentStatusModel?.[0]) return <p>No data available.</p>;
    const status = beDetails.currentStatusModel[0];

    return (
      <div className="content-grid">
        <div className="field"><label>Appraisement:</label><span>{status.appraisement || 'N.A.'}</span></div>
        <div className="field"><label>Current Queue:</label><span>{status.currentQueue || 'N.A.'}</span></div>
        <div className="field"><label>Query Raised:</label><span>{status.queryRaised || 'N.A.'}</span></div>
        <div className="field"><label>Query Reply:</label><span>{status.queryReply || 'N.A.'}</span></div>
        <div className="field"><label>Reply Date:</label><span>{status.replyDate || 'N.A.'}</span></div>
        <div className="field"><label>Reply Status:</label><span>{status.replyStatus || 'N.A.'}</span></div>
        <div className="field"><label>Appraisal Date:</label><span>{status.apprDate || 'N.A.'}</span></div>
        <div className="field"><label>Assessment Date:</label><span>{status.assessDate || 'N.A.'}</span></div>
        <div className="field"><label>Payment Date:</label><span>{status.pymtDate || 'N.A.'}</span></div>
        <div className="field"><label>Exam Date:</label><span>{status.examDate || 'N.A.'}</span></div>
        <div className="field"><label>Out of Charge Date:</label><span>{status.oocDate || 'N.A.'}</span></div>
      </div>
    );
  };

  const renderPaymentContent = () => {
    if (!beDetails?.paymentDetailsModel?.[0]) return <p>No data available.</p>;
    const payment = beDetails.paymentDetailsModel[0];

    return (
      <div className="content-grid">
        <div className="field"><label>Challan No:</label><span>{payment.challaNo || 'N.A.'}</span></div>
        <div className="field"><label>Duty Amount:</label><span>{payment.dutyAmt || 'N.A.'}</span></div>
        <div className="field"><label>Fine Amount:</label><span>{payment.fineAmt || 'N.A.'}</span></div>
        <div className="field"><label>Interest Amount:</label><span>{payment.interestAmt || 'N.A.'}</span></div>
        <div className="field"><label>Penalty Amount:</label><span>{payment.penalAmt || 'N.A.'}</span></div>
        <div className="field"><label>Total Duty:</label><span>{payment.totalDuty || 'N.A.'}</span></div>
        <div className="field"><label>Duty Paid:</label><span>{payment.dutyPaid || 'N.A.'}</span></div>
        <div className="field"><label>Payment Mode:</label><span>{payment.modeOfPymt || 'N.A.'}</span></div>
      </div>
    );
  };

  const renderEdocContent = () => {
    if (!beDetails?.edocValidityModel || beDetails.edocValidityModel.length === 0) {
      return <p>No eDocument validity data available.</p>;
    }

    return (
      <div className="compact-table">
        <table>
          <thead>
            <tr>
              <th>Document Version</th>
              <th>Description</th>
              <th>Validity</th>
            </tr>
          </thead>
          <tbody>
            {beDetails.edocValidityModel.map((doc, index) => (
              <tr key={index}>
                <td>{doc.docVersion}</td>
                <td>{doc.docDescription}</td>
                <td className={doc.validity === 'Y' ? 'valid' : 'invalid'}>
                  {doc.validity === 'Y' ? 'Valid' : 'Invalid'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAmendmentContent = () => {
    if (!beDetails?.beAmendmentModel || beDetails.beAmendmentModel.length === 0) {
      return <p>No BE amendment data available.</p>;
    }

    return (
      <div className="compact-table">
        <table>
          <thead>
            <tr>
              <th>Amendment No</th>
              <th>Date</th>
              <th>Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {beDetails.beAmendmentModel.map((amendment, index) => (
              <tr key={index}>
                <td>{amendment.amendmentNo || 'N.A.'}</td>
                <td>{amendment.amendmentDate || 'N.A.'}</td>
                <td>{amendment.amendmentType || 'N.A.'}</td>
                <td>{amendment.status || 'N.A.'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAgenciesContent = () => {
    const pqAgency = beDetails?.otherGovtAgencyModel?.pqAgencyModel || [];
    const otherAgency = beDetails?.otherGovtAgencyModel?.otherAgencyModel || [];

    if (pqAgency.length === 0 && otherAgency.length === 0) {
      return <p>No other government agency data available.</p>;
    }

    return (
      <>
        {pqAgency.length > 0 && (
          <>
            <h4>PQ Agency</h4>
            <div className="compact-table">
              <table>
                <thead>
                  <tr>
                    <th>Agency Name</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pqAgency.map((agency, index) => (
                    <tr key={index}>
                      <td>{agency.agencyName || 'N.A.'}</td>
                      <td>{agency.status || 'N.A.'}</td>
                      <td>{agency.date || 'N.A.'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {otherAgency.length > 0 && (
          <>
            <h4>Other Agency</h4>
            <div className="compact-table">
              <table>
                <thead>
                  <tr>
                    <th>Agency Name</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {otherAgency.map((agency, index) => (
                    <tr key={index}>
                      <td>{agency.agencyName || 'N.A.'}</td>
                      <td>{agency.status || 'N.A.'}</td>
                      <td>{agency.date || 'N.A.'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </>
    );
  };

  const renderContent = () => {
    switch (activeNav) {
      case 'be-details':
        return renderBEDetailsContent();
      case 'current-status':
        return renderCurrentStatusContent();
      case 'payment':
        return renderPaymentContent();
      case 'edocument':
        return renderEdocContent();
      case 'amendment':
        return renderAmendmentContent();
      case 'agencies':
        return renderAgenciesContent();
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="be-status-wrapper">
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Loading BE Details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="be-status-wrapper">
        <div className="error-message">
          <strong>Error:</strong> 
          <div style={{ whiteSpace: 'pre-wrap', marginTop: '8px' }}>{error}</div>
          <button onClick={fetchBEDetails} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="be-status-wrapper">
      <div className="header-bar">
        <h2>BE Status - {beNo}</h2>
        <div className="header-actions">
          <button className="btn-icon" onClick={() => window.print()} title="Print">
            🖨️
          </button>
          <button className="btn-secondary" onClick={() => window.history.back()}>
            Back
          </button>
        </div>
      </div>

      <div className="main-layout">
        <nav className="side-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <main className="content-area">
          {beDetails ? renderContent() : (
            <div className="no-results">
              <p>No BE details found.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default BEStatus;