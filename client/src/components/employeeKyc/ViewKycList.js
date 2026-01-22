import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

// Status badge component
const StatusBadge = ({ status }) => {
  const getStatusClass = () => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'approved';
      case 'rejected':
        return 'rejected';
      default:
        return 'pending';
    }
  };

  return (
    <span className={`hr-status-badge ${getStatusClass()}`}>
      {status || 'Pending'}
    </span>
  );
};

function ViewKycList() {
  const [data, setData] = useState([]);

  useEffect(() => {
    async function getData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/view-all-kycs`
      );
      setData(res.data);
    }
    getData();
  }, []);

  return (
    <div className="hr-table-container hr-animate-in" style={{ padding: '0', border: 'none' }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="excel-table">
          <thead>
            <tr>
              <th>First Name</th>
              <th>Middle Name</th>
              <th>Last Name</th>
              <th>Email</th>
              <th>Company</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No records found</td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={index}>
                  <td>{row.first_name || '—'}</td>
                  <td>{row.middle_name || '—'}</td>
                  <td>{row.last_name || '—'}</td>
                  <td>{row.email || '—'}</td>
                  <td>{row.company || '—'}</td>
                  <td><StatusBadge status={row.kyc_approval} /></td>
                  <td>
                    <Link
                      to={`/view-kyc/${row.username}`}
                      className="view-link"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default React.memo(ViewKycList);
