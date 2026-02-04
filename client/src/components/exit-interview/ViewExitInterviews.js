import React, { useEffect, useState } from "react";
import axios from "axios";

function ViewExitOnboardings() {
  const [data, setData] = useState([]);

  useEffect(() => {
    async function getData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/view-exit-interviews`
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
              <th>Employee Name</th>
              <th>Company</th>
              <th>Department</th>
              <th>Last Date</th>
              <th>Job Satisfaction</th>
              <th>Manager Support</th>
              <th>Manager Approach</th>
              <th>Company Culture</th>
              <th>Training</th>
              <th>Suggestions</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '20px' }}>No records found</td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr key={index}>
                  <td>{row.employee_name || '—'}</td>
                  <td>{row.company || '—'}</td>
                  <td>{row.department || '—'}</td>
                  <td>{row.last_date || '—'}</td>
                  <td>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: row.job_satisfaction >= 4 ? 'var(--hr-success)' : row.job_satisfaction >= 3 ? 'var(--hr-warning)' : 'var(--hr-error)'
                    }}>
                      {'★'.repeat(row.job_satisfaction || 0)}
                      {'☆'.repeat(5 - (row.job_satisfaction || 0))}
                    </span>
                  </td>
                  <td>{row.support_from_manager || '—'}</td>
                  <td>{row.approach_of_reporting_manager || '—'}</td>
                  <td>{row.overall_company_culture || '—'}</td>
                  <td>{row.training_and_development || '—'}</td>
                  <td title={row.suggestions || ''}>
                    <span style={{
                      display: 'block',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {row.suggestions || '—'}
                    </span>
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

export default React.memo(ViewExitOnboardings);
