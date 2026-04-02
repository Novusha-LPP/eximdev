// NfimsSimsJobs.js
import React, { useEffect, useState, useCallback, useContext } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import { IconButton, Pagination, TextField, InputAdornment, MenuItem, Autocomplete, Box, Typography, Button, Badge } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { TabContext } from "../eSanchit/ESanchitTab.js";
import { YearContext } from "../../contexts/yearContext.js";
import { UserContext } from "../../contexts/UserContext";
import { useSearchQuery } from "../../contexts/SearchQueryContext";
import { BranchContext } from "../../contexts/BranchContext.js";
import ContainerTrackButton from '../ContainerTrackButton';
import ChargesGrid from "../ChargesGrid/index.jsx";


function NfimsSimsJobs() {
    const { currentTab } = useContext(TabContext);
    const { selectedYearState, setSelectedYearState } = useContext(YearContext);
    const { user } = useContext(UserContext);
    const { selectedBranch, selectedCategory } = useContext(BranchContext);
    const [years, setYears] = useState([]);
    const [rows, setRows] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const { 
        searchQuery, 
        setSearchQuery, 
        selectedImporter, 
        setSelectedImporter, 
        currentPageTabNFIMS: currentPage, 
        setCurrentPageTabNFIMS: setCurrentPage 
    } = useSearchQuery();
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
    const limit = 100;
    const [totalJobs, setTotalJobs] = useState(0);
    const [importers, setImporters] = useState([]);

    const NFIMS_CHARGES = [
        "NFMIMS APPLICATION FEES",
        "NFMIMS REGISTRATION CHARGES",
        "SIMS APPLICATION FEES",
        "SIMS REGISTRATION CHARGES"
    ];

    useEffect(() => {
        async function getImporterList() {
            if (selectedYearState) {
                const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-importer-list/${selectedYearState}`);
                setImporters(res.data);
            }
        }
        getImporterList();
    }, [selectedYearState]);

    useEffect(() => {
        async function getYears() {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-years`);
                setYears(res.data.filter(y => y !== null));
            } catch (err) {
                console.error("Error fetching years:", err);
            }
        }
        getYears();
    }, []);

    const fetchJobs = useCallback(async (page, search, importer, year, branch, category) => {
        setLoading(true);
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-nfims-sims-jobs`, {
                params: {
                    page,
                    limit,
                    search,
                    importer: importer?.trim() || "",
                    year: year || "",
                    branchId: branch || "all",
                    category: category || "all",
                }
            });
            setRows(res.data.jobs);
            setTotalPages(res.data.totalPages);
            setTotalJobs(res.data.totalJobs);
        } catch (err) {
            console.error("Error fetching NFIMS/SIMS jobs:", err);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        if (selectedYearState && user?.username) {
            fetchJobs(currentPage, debouncedSearchQuery, selectedImporter, selectedYearState, selectedBranch, selectedCategory);
        }
    }, [currentPage, debouncedSearchQuery, selectedImporter, selectedYearState, user?.username, selectedBranch, selectedCategory, fetchJobs]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const handleSearchInputChange = (e) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    const handlePageChange = (event, newPage) => {
        setCurrentPage(newPage);
    };

    const handleCopy = useCallback((event, text) => {
        event.stopPropagation();
        navigator.clipboard.writeText(text).catch(err => console.error("Copy failed", err));
    }, []);

    const columns = React.useMemo(() => [
        {
            accessorKey: "job_no",
            header: "Job No",
            muiTableHeadCellProps: { align: "center" },
            muiTableBodyCellProps: { sx: { verticalAlign: "top", textAlign: "center" } },
            size: 200,
            Cell: ({ cell }) => {
                const { job_no, job_number, year, type_of_b_e, consignment_type, custom_house, branch_code, trade_type, mode } = cell.row.original;
                return (
                    <a
                        href={`/esanchit-job/${branch_code}/${trade_type}/${mode}/${job_no}/${year}`}
                        style={{
                            cursor: "pointer", color: "blue", textDecoration: "none", display: "inline-block", width: "100%", textAlign: "center",
                            backgroundColor: cell.row.original.priorityJob === "High Priority" ? "orange" : cell.row.original.priorityJob === "Priority" ? "yellow" : "transparent",
                            padding: "5px", borderRadius: "4px"
                        }}
                        target="_blank" rel="noreferrer"
                    >
                        {job_number || job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br /> {custom_house}
                    </a>
                );
            }
        },
        {
            accessorKey: "importer",
            header: "Importer",
            size: 150,
        },
        {
            header: "Pending NFIMS/SIMS Charges",
            size: 250,
            Cell: ({ cell }) => {
                const charges = cell.row.original.charges || [];
                const pendingSpecific = charges.filter(c => NFIMS_CHARGES.includes(c.chargeHead) && c.payment_request_status !== "Paid");
                return (
                    <Box>
                        {pendingSpecific.map((c, i) => (
                            <Typography key={i} variant="caption" display="block" color="error">
                                • {c.chargeHead} ({c.payment_request_status || "Not Requested"})
                            </Typography>
                        ))}
                    </Box>
                );
            }
        },
        {
            accessorKey: "awb_bl_no",
            header: "BL Num & Date",
            size: 150,
            Cell: ({ cell }) => (
                <Box>
                    {cell.row.original.awb_bl_no} <br /> {cell.row.original.awb_bl_date}
                </Box>
            )
        },
        {
            accessorKey: "container_nos",
            header: "Containers",
            size: 200,
            Cell: ({ cell }) => (
                <Box>
                    {cell.row.original.container_nos?.map((c, i) => (
                        <div key={i} style={{ marginBottom: "2px" }}>
                            {c.container_number} <ContainerTrackButton customHouse={cell.row.original.custom_house} containerNo={c.container_number} /> | {c.size}
                            <IconButton size="small" onClick={(e) => handleCopy(e, c.container_number)}><ContentCopyIcon fontSize="inherit"/></IconButton>
                        </div>
                    ))}
                </Box>
            )
        }
    ], [handleCopy]);

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="h6">NFIMS/SIMS Jobs: {totalJobs}</Typography>
                
                <Autocomplete
                    sx={{ width: 300 }}
                    options={importers.map(i => i.importer)}
                    value={selectedImporter || ""}
                    onInputChange={(e, val) => setSelectedImporter(val)}
                    renderInput={(params) => <TextField {...params} size="small" label="Filter Importer" />}
                />

                <TextField
                    select
                    size="small"
                    value={selectedYearState}
                    onChange={(e) => setSelectedYearState(e.target.value)}
                    sx={{ width: 120 }}
                >
                    {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                </TextField>

                <TextField
                    placeholder="Search Job/BL/Importer"
                    size="small"
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    InputProps={{
                        endAdornment: <InputAdornment position="end"><SearchIcon /></InputAdornment>
                    }}
                    sx={{ width: 300 }}
                />
            </Box>

            <MaterialReactTable
                columns={columns}
                data={rows}
                enablePagination={false}
                enableBottomToolbar={false}
                enableDensityToggle={false}
                enableExpanding={true}
                initialState={{ density: "compact" }}
                muiTableContainerProps={{ sx: { maxHeight: "650px" } }}
                renderDetailPanel={({ row }) => (
                    <Box sx={{ p: 1, backgroundColor: '#f9f9f9', border: '1px solid #ddd', borderRadius: '4px' }}>
                        <ChargesGrid 
                            parentId={row.original._id}
                            parentModule="Job"
                            jobNumber={row.original.job_no}
                            jobDisplayNumber={row.original.job_number}
                            importerName={row.original.importer}
                            jobYear={row.original.year}
                        />
                    </Box>
                )}
            />

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination count={totalPages} page={currentPage} onChange={handlePageChange} color="primary" />
            </Box>
        </Box>
    );
}

export default React.memo(NfimsSimsJobs);
