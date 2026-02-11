import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { TextField, InputAdornment, MenuItem } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import BusinessIcon from '@mui/icons-material/Business';
import FilterListIcon from '@mui/icons-material/FilterList';

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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [companyFilter, setCompanyFilter] = useState("All");

  useEffect(() => {
    async function getData() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/view-all-kycs`
        );
        setData(res.data);
      } catch (error) {
        console.error("Error fetching KYC list:", error);
      }
    }
    getData();
  }, []);

  // Get Unique Companies for Dropdown
  const uniqueCompanies = React.useMemo(() => {
    const companies = new Set(data.map(item => item.company).filter(Boolean));
    return Array.from(companies).sort();
  }, [data]);

  // Filter Data
  const filteredData = data.filter((row) => {
    const term = searchTerm.toLowerCase();
    const name = `${row.first_name} ${row.middle_name} ${row.last_name}`.toLowerCase();
    const email = (row.email || "").toLowerCase();
    const company = (row.company || "").toLowerCase();
    
    // Status Logic
    const rowStatus = row.kyc_approval ? row.kyc_approval.toLowerCase() : 'pending';
    const filterStatus = statusFilter.toLowerCase();
    const matchesStatus = statusFilter === 'All' || rowStatus === filterStatus;

    // Company Logic
    const matchesCompany = companyFilter === 'All' || row.company === companyFilter;
    
    return (name.includes(term) || email.includes(term) || company.includes(term)) && matchesStatus && matchesCompany;
  });

 

  const renderRow = (row, index) => (
    <tr key={row.username || index}>
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
  );

  return (
    <div style={{ padding: '0 20px 20px 20px' }}>
      {/* Controls Header */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
        
        {/* Search Input */}
        <TextField
          placeholder="Search employees..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            style: { backgroundColor: 'white', borderRadius: '8px' }
          }}
          sx={{ width: '250px' }}
        />

        {/* Company Filter Dropdown */}
        <TextField
          select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          variant="outlined"
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <BusinessIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            style: { backgroundColor: 'white', borderRadius: '8px' }
          }}
          sx={{ width: '200px' }}
        >
          <MenuItem value="All">All Companies</MenuItem>
          {uniqueCompanies.map((comp) => (
            <MenuItem key={comp} value={comp}>{comp}</MenuItem>
          ))}
        </TextField>

        {/* Status Filter Dropdown */}
        <TextField
          select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          variant="outlined"
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FilterListIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            style: { backgroundColor: 'white', borderRadius: '8px' }
          }}
          sx={{ width: '150px' }}
        >
          <MenuItem value="All">All Status</MenuItem>
          <MenuItem value="Pending">Pending</MenuItem>
          <MenuItem value="Approved">Approved</MenuItem>
          <MenuItem value="Rejected">Rejected</MenuItem>
        </TextField>

        {/* Group By Button */}
      
      </div>

      <div className="hr-table-container hr-animate-in" style={{ padding: '0', border: 'none', boxShadow: 'none' }}>
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
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                    {data.length === 0 ? "Loading records..." : "No matching records found"}
                  </td>
                </tr>
              ) : (
                filteredData.map((row, index) => renderRow(row, index))
              )}
            </tbody>  
          </table>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ViewKycList);
