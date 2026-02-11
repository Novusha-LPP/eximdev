import React, { useEffect, useState } from "react";
import axios from "axios";

// Document link component
const DocumentLink = ({ url, label }) => {
  if (!url) {
    return (
      <span style={{ color: 'var(--hr-text-muted)', fontSize: '0.85rem' }}>
        Not uploaded
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: 'var(--hr-primary)',
        textDecoration: 'none',
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
      </svg>
      View
    </a>
  );
};

function ViewOnboardings() {
  const [data, setData] = useState([]);

  useEffect(() => {
    async function getData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/view-onboardings`
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
              <th>Username</th>
              <th>First Name</th>
              <th>Middle Name</th>
              <th>Last Name</th>
              <th>Email</th>
              <th>Photo</th>
              <th>Resume</th>
              <th>Address Proof</th>
              <th>NDA</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>No records found</td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={index}>
                  <td>{row.username || '—'}</td>
                  <td>{row.first_name || '—'}</td>
                  <td>{row.middle_name || '—'}</td>
                  <td>{row.last_name || '—'}</td>
                  <td>{row.email || '—'}</td>
                  <td><DocumentLink url={row.employee_photo} /></td>
                  <td><DocumentLink url={row.resume} /></td>
                  <td><DocumentLink url={row.address_proof} /></td>
                  <td><DocumentLink url={row.nda} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default React.memo(ViewOnboardings);
