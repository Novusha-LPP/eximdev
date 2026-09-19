import React, { useEffect, useState, useContext, useCallback } from "react";
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Skeleton,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  Fade,
  Zoom,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@mui/material";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import DownloadIcon from '@mui/icons-material/Download';
import TableViewIcon from '@mui/icons-material/TableView';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { UserContext } from "../../contexts/UserContext";
import { useFetchYears } from "../../utils/useFetchYears";
import { BranchContext } from '../../contexts/BranchContext';

const columns = [
  { label: "Srl No.", key: "srlNo", minWidth: 50 },
  { label: "JOB No", key: "job_no", minWidth: 100 },
  { label: "LOCATION", key: "location", minWidth: 80 },
  { label: "IMPORTERS NAME", key: "importer", minWidth: 150 },
  { label: "COMMODITY", key: "commodity", minWidth: 300 },
  { label: 'PRICE', key: 'cif_amount', minWidth: 170 }, // NEW PRICE COLUMN
  { label: "B/E. NO.", key: "be_no", minWidth: 100 },
  { label: "DATE", key: "be_date", minWidth: 80 },
  { label: "CONTAINER NO.", key: "containerNumbers", minWidth: 120 },
  { label: "NO. OF CNTR", key: "totalContainers", minWidth: 70 },
  { label: "SIZE", key: "size", minWidth: 60 },
  { label: "Teus", key: "teus", minWidth: 60 },
  { label: "CLRG DATE", key: "out_of_charge", minWidth: 80 },
  { label: "REMARKS", key: "remarks", minWidth: 100 },
];

const formatDateSafe = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) {
    const str = String(dateVal).trim();
    const parts = str.split(/[-/]/);
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);
      if (p0 <= 31 && p1 <= 12 && p2 > 1000) {
        const parsed = new Date(p2, p1 - 1, p0);
        if (!isNaN(parsed.getTime())) {
          return parsed.toLocaleDateString('en-GB');
        }
      }
      if (p0 > 1000 && p1 <= 12 && p2 <= 31) {
        const parsed = new Date(p0, p1 - 1, p2);
        if (!isNaN(parsed.getTime())) {
          return parsed.toLocaleDateString('en-GB');
        }
      }
    }
    return str;
  }
  return d.toLocaleDateString('en-GB');
};

const formatDateSafePDF = (dateVal) => {
  const formatted = formatDateSafe(dateVal);
  return formatted ? formatted.replace(/\//g, '-') : '';
};

const DetailedReport = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { years, selectedYear: year, setSelectedYear: setYear } = useFetchYears();
  const [gradeFilter, setGradeFilter] = useState(""); // ✅ New Grade Filter
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportType, setExportType] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const { selectedBranch, selectedCategory, loading: branchLoading } = useContext(BranchContext);

  const gradeOptions = [
    { value: "", label: "All Grades" },
    { value: "Grade 316", label: "Grade 316" },
    { value: "Nickel", label: "Nickel" },
    { value: "Grade 304", label: "Grade 304" },
  ];

  const { user } = useContext(UserContext);
  const isSrManager = !!(
    user &&
    typeof user.role === 'string' &&
    user.role.toLowerCase().includes('sr') &&
    user.role.toLowerCase().includes('manager')
  );

  // The years array is now fetched dynamically through the useFetchYears hook.

  const months = [
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
  ];

  const fetchData = useCallback(async (signal) => {
    if (!year || branchLoading) return; // Prevent 404 with empty year or incorrect data before branch context
    setLoading(true);
    setError("");
    try {
      const apiBase = process.env.REACT_APP_API_STRING || "";
      // ✅ Pass grade filter as query param
      const url = new URL(`${apiBase}/report/import-clearance/${year}/${month}`);
      // Only include grade when user is Sr. Manager
      if (isSrManager && gradeFilter) {
        url.searchParams.append('grade', gradeFilter);
      }
      if (selectedBranch && selectedBranch !== 'all') {
        url.searchParams.append('branchId', selectedBranch);
      }
      if (selectedCategory && selectedCategory !== 'all') {
        url.searchParams.append('category', selectedCategory);
      }
      const res = await fetch(url.toString(), { signal });
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError("Failed to fetch import clearance data");
    } finally {
      setLoading(false);
    }
  }, [year, month, isSrManager, gradeFilter, selectedBranch, selectedCategory, branchLoading]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const handlePreviousMonth = () => {
    const prev = parseInt(month) - 1;
    setMonth(prev < 1 ? "12" : String(prev));
  };

  const handleNextMonth = () => {
    const next = parseInt(month) + 1;
    setMonth(next > 12 ? "1" : String(next));
  };

  // Export menu handlers
  const handleExportClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setAnchorEl(null);
  };

  // Generate summary data
  const generateSummaryData = () => {
    const locationGroups = {};

    data.forEach(row => {
      const location = row.location || 'Unknown';
      if (!locationGroups[location]) {
        locationGroups[location] = {
          scrap: { count20: 0, count40: 0, teus: 0, containers: 0 },
          others: { count20: 0, count40: 0, teus: 0, containers: 0 },
          total: { count20: 0, count40: 0, teus: 0, containers: 0 }
        };
      }

      if (row.be_filing_type === "Ex-Bond" || row.type_of_b_e === "Ex-Bond") return;

      const teus = parseInt(row.teus) || 0;
      const containers = parseInt(row.totalContainers) || 0;
      const commodity = (row.commodity || '').toLowerCase();

      // Determine container sizes from noOfContrSize
      const sizeInfo = row.noOfContrSize || '';
      const count20 = (sizeInfo.match(/(\d+)\s*x\s*20/i) || [0, 0])[1];
      const count40 = (sizeInfo.match(/(\d+)\s*x\s*40/i) || [0, 0])[1];

      const category = commodity.includes('scrap') ? 'scrap' : 'others';

      locationGroups[location][category].count20 += parseInt(count20) || 0;
      locationGroups[location][category].count40 += parseInt(count40) || 0;
      locationGroups[location][category].teus += teus;
      locationGroups[location][category].containers += containers;

      locationGroups[location].total.count20 += parseInt(count20) || 0;
      locationGroups[location].total.count40 += parseInt(count40) || 0;
      locationGroups[location].total.teus += teus;
      locationGroups[location].total.containers += containers;
    });

    return locationGroups;
  };

  // Generate summary for dialog (with LCL row)
  const generateSummaryRows = () => {
    const isAir = selectedCategory && selectedCategory.toLowerCase() === 'air';
    
    if (isAir) {
      const locationCounts = {};
      let grandTotal = 0;
      
      data.forEach(row => {
        const location = row.location || 'Unknown';
        locationCounts[location] = (locationCounts[location] || 0) + 1;
        grandTotal += 1;
      });
      
      const rows = [];
      Object.entries(locationCounts).forEach(([location, count]) => {
        rows.push({
          location,
          details: '',
          count20: 0,
          count40: 0,
          teus: 0,
          containers: count
        });
      });
      
      rows.push({
        location: 'TOTAL',
        details: '',
        count20: 0,
        count40: 0,
        teus: 0,
        containers: grandTotal
      });
      
      return rows;
    }

    const isIcdLoc = (loc) => /\bICD\b/i.test(loc);
    const icdSummaryData = {};
    const otherSummaryData = {};
    let lclContainers = 0, lcl20 = 0, lcl40 = 0, lclTeus = 0;
    let exBondContainers = 0, exBond20 = 0, exBond40 = 0, exBondTeus = 0;

    data.forEach(row => {
      const isRowAir = row.mode && row.mode.toLowerCase() === 'air';
      if (isRowAir) return; // Air jobs do not have ocean containers or TEUs

      const location = row.location || 'Unknown';
      const target = isIcdLoc(location) ? icdSummaryData : otherSummaryData;
      const remarks = (row.remarks || '').toLowerCase();
      const consignmentType = (row.consignment_type || '').toUpperCase();
      const sizeInfo = row.noOfContrSize || '';
      const count20 = row.count20 !== undefined ? Number(row.count20) : (parseInt((sizeInfo.match(/(\d+)\s*x\s*20/i) || [0, 0])[1]) || 0);
      const count40 = row.count40 !== undefined ? Number(row.count40) : (parseInt((sizeInfo.match(/(\d+)\s*x\s*40/i) || [0, 0])[1]) || 0);
      const teus = parseInt(row.teus) || 0;
      const containers = parseInt(row.totalContainers) || 0;

      if (row.be_filing_type === "Ex-Bond" || row.type_of_b_e === "Ex-Bond") {
        exBondContainers += containers;
        exBond20 += count20;
        exBond40 += count40;
        exBondTeus += teus;
        return;
      }

      if (consignmentType === 'LCL' || remarks.includes('lcl')) {
        lclContainers += 1;
        lcl20 += 1;
        lcl40 += 0;
        lclTeus += 1;
        return;
      }

      if (!target[location]) {
        target[location] = {
          scrap: { count20: 0, count40: 0, teus: 0, containers: 0 },
          others: { count20: 0, count40: 0, teus: 0, containers: 0 }
        };
      }

      if (remarks.includes('scrap')) {
        target[location].scrap.count20 += count20;
        target[location].scrap.count40 += count40;
        target[location].scrap.teus += teus;
        target[location].scrap.containers += containers;
      } else {
        target[location].others.count20 += count20;
        target[location].others.count40 += count40;
        target[location].others.teus += teus;
        target[location].others.containers += containers;
      }
    });

    const buildGroupRows = (summaryMap, groupLabel, sectionKey) => {
      const entries = Object.entries(summaryMap);
      if (entries.length === 0) {
        return { rows: [], subtotal: { count20: 0, count40: 0, teus: 0, containers: 0 }, subtotalRow: null };
      }

      const scrapRows = [];
      const othersRows = [];
      const locTotalRows = [];
      const subtotal = { count20: 0, count40: 0, teus: 0, containers: 0 };

      entries.forEach(([location, details]) => {
        scrapRows.push({ location, details: 'Scrap', ...details.scrap, section: sectionKey });
      });
      entries.forEach(([location, details]) => {
        othersRows.push({ location, details: 'Others', ...details.others, section: sectionKey });
      });
      entries.forEach(([location, details]) => {
        const tot = {
          location,
          details: 'TOTAL',
          count20: details.scrap.count20 + details.others.count20,
          count40: details.scrap.count40 + details.others.count40,
          teus: details.scrap.teus + details.others.teus,
          containers: details.scrap.containers + details.others.containers,
          section: sectionKey
        };
        locTotalRows.push(tot);
        subtotal.count20 += tot.count20;
        subtotal.count40 += tot.count40;
        subtotal.teus += tot.teus;
        subtotal.containers += tot.containers;
      });

      const subtotalRow = {
        location: `TOTAL ${groupLabel}`,
        details: 'SUBTOTAL',
        ...subtotal,
        isSubtotal: true,
        section: sectionKey
      };

      const groupRows = [
        ...scrapRows,
        ...othersRows,
        ...locTotalRows,
        subtotalRow
      ];

      return { rows: groupRows, subtotal, subtotalRow };
    };

    const hasIcd = Object.keys(icdSummaryData).length > 0;
    const hasOther = Object.keys(otherSummaryData).length > 0;
    const isSplit = hasIcd && hasOther;

    const icdGroup = buildGroupRows(icdSummaryData, 'ICD CLEARANCE', 'icd');
    const otherGroup = buildGroupRows(otherSummaryData, 'OTHER LOCATIONS', 'other');

    const rows = [];

    if (isSplit) {
      if (hasIcd) {
        rows.push({ location: 'ICD CLEARANCE SUMMARY', details: '', isSectionHeader: true, section: 'icd' });
        rows.push(...icdGroup.rows);
      }
      if (hasOther) {
        rows.push({ location: 'OTHER LOCATIONS CLEARANCE SUMMARY', details: '', isSectionHeader: true, section: 'other' });
        rows.push(...otherGroup.rows);
      }
      // Overall totals section header
      rows.push({ location: 'OVERALL CLEARANCE TOTALS', details: '', isSectionHeader: true, section: 'overall' });
      if (icdGroup.subtotalRow) rows.push(icdGroup.subtotalRow);
      if (otherGroup.subtotalRow) rows.push(otherGroup.subtotalRow);
      rows.push({ location: 'LCL', details: '', count20: lcl20, count40: lcl40, teus: lclTeus, containers: lclContainers });
      rows.push({ location: 'Ex-Bond', details: '', count20: exBond20, count40: exBond40, teus: exBondTeus, containers: exBondContainers });
    } else {
      if (hasIcd) {
        rows.push(...icdGroup.rows.filter(r => !r.isSubtotal));
      } else if (hasOther) {
        rows.push(...otherGroup.rows.filter(r => !r.isSubtotal));
      }
      rows.push({ location: 'LCL', details: '', count20: lcl20, count40: lcl40, teus: lclTeus, containers: lclContainers });
      rows.push({ location: 'Ex-Bond', details: '', count20: exBond20, count40: exBond40, teus: exBondTeus, containers: exBondContainers });
    }

    const summaryTotalTeus = icdGroup.subtotal.teus + otherGroup.subtotal.teus + lclTeus;
    const summaryTotal20 = icdGroup.subtotal.count20 + otherGroup.subtotal.count20 + lcl20;
    const summaryTotal40 = icdGroup.subtotal.count40 + otherGroup.subtotal.count40 + lcl40;
    const summaryTotalContainers = icdGroup.subtotal.containers + otherGroup.subtotal.containers + lclContainers;

    rows.push({
      location: 'TOTAL',
      details: '',
      count20: summaryTotal20,
      count40: summaryTotal40,
      teus: summaryTotalTeus,
      containers: summaryTotalContainers
    });

    return rows;
  };

  const deriveSize = (noOfContrSize) => {
    if (!noOfContrSize) return '';
    const str = String(noOfContrSize);
    const has20 = /\b20\b|20\s*standard|20\s*open/i.test(str);
    const has40 = /\b40\b|40\s*standard|40\s*hc|40\s*high/i.test(str);
    if (has20 && has40) return '20/40';
    if (has20) return '20';
    if (has40) return '40';
    return noOfContrSize;
  };

  // Export functionality
  const handleExportReport = async (format) => {
    setExportLoading(true);
    setExportType(format);
    setAnchorEl(null);

    try {
      if (format === 'excel') {
        await exportToExcel();
      } else if (format === 'pdf') {
        await exportToPDF();
      }
    } catch (error) {
      console.error('Export failed:', error);
      setError(`Failed to export report as ${format.toUpperCase()}: ${error.message || error}`);
    } finally {
      setExportLoading(false);
      setExportType('');
    }
  };

  const exportToExcel = async () => {
    const isAir = (selectedCategory && selectedCategory.toLowerCase() === 'air') ||
      (data.length > 0 && data.every(row => row.mode && row.mode.toLowerCase() === 'air'));
    const monthName = months.find(m => String(m.value) === String(month))?.label || 'Unknown';
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Alvision Exim';
    workbook.created = new Date();

    // -------------------------------------------------------------
    // SHEET 1: Main Clearance Report
    // -------------------------------------------------------------
    const worksheet = workbook.addWorksheet(isAir ? 'Air Clearance Report' : 'Import Clearance Report', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    const visibleCols = columns.filter((col) => {
      if (col.key === 'cif_amount' && !isSrManager) return false;
      if (isAir && ['containerNumbers', 'totalContainers', 'size', 'teus'].includes(col.key)) {
        return false;
      }
      return true;
    });

    // Define column headers and keys
    worksheet.columns = visibleCols.map(col => ({
      header: col.label.toUpperCase(),
      key: col.key,
      width: Math.max(col.minWidth ? Math.round(col.minWidth / 7) : 14, 12),
    }));

    // Header row styling
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1A237E' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF0D47A1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    });

    // Add data rows
    data.forEach((row, index) => {
      const isRowAir = row.mode && row.mode.toLowerCase() === 'air';
      const invValue = row.cif_amount && row.inv_currency
        ? `${row.inv_currency} ${(parseFloat(row.cif_amount)).toFixed(2)}`
        : '';

      const rowData = {};
      visibleCols.forEach(col => {
        switch (col.key) {
          case 'srlNo':
            rowData[col.key] = String(index + 1).padStart(3, "0");
            break;
          case 'cif_amount':
            rowData[col.key] = invValue;
            break;
          case 'size':
            rowData[col.key] = isRowAir ? '' : deriveSize(row.noOfContrSize);
            break;
          case 'containerNumbers':
            rowData[col.key] = isRowAir ? '' : (Array.isArray(row.containerNumbers) ? row.containerNumbers.join('; ') : String(row.containerNumbers || ''));
            break;
          case 'totalContainers':
            rowData[col.key] = isRowAir ? '' : (row.totalContainers != null ? Number(row.totalContainers) : '');
            break;
          case 'teus':
            rowData[col.key] = isRowAir ? '' : (row.teus != null ? Number(row.teus) : '');
            break;
          case 'be_date':
            rowData[col.key] = formatDateSafe(row.be_date);
            break;
          case 'out_of_charge':
            rowData[col.key] = formatDateSafe(row.out_of_charge);
            break;
          case 'remarks':
            rowData[col.key] = row[col.key] || '';
            break;
          default:
            rowData[col.key] = row[col.key] || '';
        }
      });

      const excelRow = worksheet.addRow(rowData);
      excelRow.height = 22;

      // Clean zebra striping
      const isEven = index % 2 === 0;
      const rowBgColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

      visibleCols.forEach((col, colIdx) => {
        const cell = excelRow.getCell(colIdx + 1);
        cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF1E293B' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowBgColor }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        // Alignments
        if (['srlNo', 'job_no', 'location', 'be_no', 'be_date', 'size', 'totalContainers', 'teus', 'out_of_charge'].includes(col.key)) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (col.key === 'cif_amount') {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else if (col.key === 'remarks' || col.key === 'commodity' || col.key === 'containerNumbers') {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }

        // Emphasis on primary keys/numbers
        if (col.key === 'job_no') {
          cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
        } else if (col.key === 'totalContainers') {
          cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF166534' } };
        } else if (col.key === 'teus') {
          cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFB91C1C' } };
        }
      });
    });

    // Auto-fit column widths with bounds
    worksheet.columns.forEach((column) => {
      let maxLen = column.header ? String(column.header).length : 10;
      column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
        if (rowNumber > 1) {
          const valStr = cell.value != null ? String(cell.value) : '';
          const lineLen = valStr.includes('\n') ? Math.max(...valStr.split('\n').map(s => s.length)) : valStr.length;
          if (lineLen > maxLen) maxLen = lineLen;
        }
      });
      column.width = Math.min(Math.max(maxLen + 3, 12), 48);
    });

    // Enable Excel auto-filter
    if (visibleCols.length > 0) {
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: data.length + 1, column: visibleCols.length }
      };
    }

    // Helper: Build Executive Air Summary Sheet
    const populateAirSummaryWorksheet = (sheet, airRecords) => {
      sheet.views = [{ showGridLines: true }];

      // Title Banner
      const titleRow = sheet.addRow([`AIR CLEARANCE SUMMARY REPORT — ${monthName.toUpperCase()} ${year}`]);
      titleRow.height = 32;
      sheet.mergeCells(1, 1, 1, 4);
      const titleCell = titleRow.getCell(1);
      titleCell.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1A237E' }
      };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      sheet.addRow([]);

      const locationCounts = {};
      const impCounts = {};
      airRecords.forEach(r => {
        const loc = r.location || 'Unknown';
        const imp = r.importer || 'Unknown';
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
        impCounts[imp] = (impCounts[imp] || 0) + 1;
      });

      const grandTotal = airRecords.length;

      // Executive Metric Cards Block
      const kpiLabelRow = sheet.addRow(['TOTAL AIR SHIPMENTS', '', 'ACTIVE IMPORTERS', 'AIRPORTS / CUSTOMS']);
      kpiLabelRow.height = 20;
      sheet.mergeCells(kpiLabelRow.number, 1, kpiLabelRow.number, 2);
      kpiLabelRow.eachCell((c) => {
        c.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF475569' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        c.alignment = { vertical: 'middle', horizontal: 'center' };
        c.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });

      const kpiValRow = sheet.addRow([grandTotal, '', Object.keys(impCounts).length, Object.keys(locationCounts).length]);
      kpiValRow.height = 28;
      sheet.mergeCells(kpiValRow.number, 1, kpiValRow.number, 2);
      kpiValRow.eachCell((c) => {
        c.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF0F172A' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        c.alignment = { vertical: 'middle', horizontal: 'center' };
        c.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });

      sheet.addRow([]);

      // Section 1: Location Summary
      const locSecBanner = sheet.addRow(['LOCATION / AIRPORT CLEARANCE SUMMARY']);
      locSecBanner.height = 24;
      sheet.mergeCells(locSecBanner.number, 1, locSecBanner.number, 4);
      const locBannerCell = locSecBanner.getCell(1);
      locBannerCell.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: 'FF92400E' } };
      locBannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      locBannerCell.alignment = { vertical: 'middle', horizontal: 'center' };

      const locHeader = sheet.addRow(['SRL NO.', 'AIRPORT / CUSTOM HOUSE', 'TOTAL B/ES FILED', 'SHARE (%)']);
      locHeader.height = 26;
      locHeader.eachCell((c) => {
        c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1E293B' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } };
        c.alignment = { vertical: 'middle', horizontal: 'center' };
        c.border = {
          top: { style: 'medium', color: { argb: 'FFD97706' } },
          left: { style: 'thin', color: { argb: 'FFD97706' } },
          bottom: { style: 'medium', color: { argb: 'FFD97706' } },
          right: { style: 'thin', color: { argb: 'FFD97706' } }
        };
      });

      let locIdx = 1;
      Object.entries(locationCounts).forEach(([loc, cnt]) => {
        const r = sheet.addRow([
          String(locIdx++).padStart(2, '0'),
          loc,
          cnt,
          grandTotal > 0 ? `${((cnt / grandTotal) * 100).toFixed(1)}%` : '0.0%'
        ]);
        r.height = 22;
        r.eachCell((c, colNum) => {
          c.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF1E293B' } };
          c.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
          if (colNum === 2) {
            c.alignment = { vertical: 'middle', horizontal: 'left' };
          } else if (colNum === 3) {
            c.alignment = { vertical: 'middle', horizontal: 'center' };
            c.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
          } else {
            c.alignment = { vertical: 'middle', horizontal: 'center' };
          }
        });
      });

      const locTotal = sheet.addRow(['', 'TOTAL AIR SHIPMENTS', grandTotal, '100.0%']);
      locTotal.height = 24;
      locTotal.eachCell((c, colNum) => {
        c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF000000' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF08A' } };
        c.alignment = { vertical: 'middle', horizontal: colNum === 2 ? 'left' : 'center' };
        c.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FFB0BEC5' } },
          bottom: { style: 'double', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FFB0BEC5' } }
        };
      });

      // Blank rows
      sheet.addRow([]);
      sheet.addRow([]);

      // Section 2: Importer Breakdown
      const secTitle = sheet.addRow(['IMPORTER-WISE AIR VOLUME RANKING']);
      secTitle.height = 26;
      sheet.mergeCells(secTitle.number, 1, secTitle.number, 4);
      const secCell = secTitle.getCell(1);
      secCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF0369A1' } };
      secCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
      secCell.alignment = { vertical: 'middle', horizontal: 'center' };

      const impHeader = sheet.addRow(['SRL NO.', 'IMPORTER NAME', 'AIR B/ES FILED', 'SHARE (%)']);
      impHeader.height = 26;
      impHeader.eachCell((c) => {
        c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0369A1' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBAE6FD' } };
        c.alignment = { vertical: 'middle', horizontal: 'center' };
        c.border = {
          top: { style: 'medium', color: { argb: 'FF0284C7' } },
          left: { style: 'thin', color: { argb: 'FF0284C7' } },
          bottom: { style: 'medium', color: { argb: 'FF0284C7' } },
          right: { style: 'thin', color: { argb: 'FF0284C7' } }
        };
      });

      const sortedImps = Object.entries(impCounts).sort((a, b) => b[1] - a[1]);
      sortedImps.forEach(([imp, cnt], idx) => {
        const r = sheet.addRow([
          String(idx + 1).padStart(2, '0'),
          imp,
          cnt,
          grandTotal > 0 ? `${((cnt / grandTotal) * 100).toFixed(1)}%` : '0.0%'
        ]);
        r.height = 22;
        const isEven = idx % 2 === 0;
        const rowBgColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

        r.eachCell((c, colNum) => {
          c.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF1E293B' } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } };
          c.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
          if (colNum === 2) {
            c.alignment = { vertical: 'middle', horizontal: 'left' };
          } else if (colNum === 3) {
            c.alignment = { vertical: 'middle', horizontal: 'center' };
            c.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0369A1' } };
          } else {
            c.alignment = { vertical: 'middle', horizontal: 'center' };
          }
        });
      });

      const impTotal = sheet.addRow(['', 'TOTAL AIR SHIPMENTS', grandTotal, '100.0%']);
      impTotal.height = 24;
      impTotal.eachCell((c, colNum) => {
        c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF000000' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF08A' } };
        c.alignment = { vertical: 'middle', horizontal: colNum === 2 ? 'left' : 'center' };
        c.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FFB0BEC5' } },
          bottom: { style: 'double', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FFB0BEC5' } }
        };
      });

      sheet.getColumn(1).width = 12;
      sheet.getColumn(2).width = 46;
      sheet.getColumn(3).width = 22;
      sheet.getColumn(4).width = 16;
    };

    // -------------------------------------------------------------
    // SHEET 2: Summary Report
    // -------------------------------------------------------------
    if (isAir) {
      const summaryWorksheet = workbook.addWorksheet('Air Summary');
      populateAirSummaryWorksheet(summaryWorksheet, data);
    } else {
      // ------------------ OCEAN SUMMARY LAYOUT ------------------
      const summaryWorksheet = workbook.addWorksheet('Summary');
      summaryWorksheet.views = [{ showGridLines: true }];
      const summaryRows = generateSummaryRows();

      // Title Row
      const titleRow = summaryWorksheet.addRow([`SUMMARY REPORT — ${monthName.toUpperCase()} ${year}`]);
      titleRow.height = 32;
      summaryWorksheet.mergeCells(1, 1, 1, 6);
      const titleCell = titleRow.getCell(1);
      titleCell.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1A237E' }
      };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      summaryWorksheet.addRow([]);

      // Ocean KPI metrics
      const isIcdLoc = (loc) => /\bICD\b/i.test(loc);
      const oceanRecords = data.filter(r => !(r.mode && r.mode.toLowerCase() === 'air'));
      const oceanImporters = new Set(oceanRecords.map(r => r.importer).filter(Boolean));
      const oceanLocations = new Set(oceanRecords.map(r => r.location).filter(Boolean));
      const icdLocations = new Set(oceanRecords.map(r => r.location).filter(l => l && isIcdLoc(l)));
      const otherLocations = new Set(oceanRecords.map(r => r.location).filter(l => l && !isIcdLoc(l)));
      const grandTotalRow = summaryRows.find(r => r.location === 'TOTAL') || {};
      const totalContainersVal = grandTotalRow.containers || 0;
      const totalTeusVal = grandTotalRow.teus || 0;

      // Executive Metric Cards Block (All 6 columns utilized, no truncation!)
      const kpiLabelRow = summaryWorksheet.addRow([
        'TOTAL CONTAINERS',
        'TOTAL TEUS',
        'ACTIVE IMPORTERS',
        'ICD LOCATIONS',
        'OTHER LOCATIONS',
        'TOTAL LOCATIONS'
      ]);
      kpiLabelRow.height = 20;
      kpiLabelRow.eachCell((c) => {
        c.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF475569' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        c.alignment = { vertical: 'middle', horizontal: 'center' };
        c.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });

      const kpiValRow = summaryWorksheet.addRow([
        totalContainersVal,
        totalTeusVal,
        oceanImporters.size,
        icdLocations.size,
        otherLocations.size,
        oceanLocations.size
      ]);
      kpiValRow.height = 28;
      kpiValRow.eachCell((c, colNum) => {
        let valColor = 'FF0F172A';
        if (colNum === 1) valColor = 'FF166534'; // bold green for containers
        else if (colNum === 2) valColor = 'FFB91C1C'; // bold red for TEUs
        else if (colNum === 6) valColor = 'FF1E3A8A'; // navy for total locations
        c.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: valColor } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        c.alignment = { vertical: 'middle', horizontal: 'center' };
        c.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });

      summaryWorksheet.addRow([]);

      // Helper function to style each summary data row
      const styleSummaryRow = (excelRow, sRow) => {
        excelRow.height = 22;
        const isTotal = sRow.location === 'TOTAL';
        const isLcl = sRow.location === 'LCL';
        const isExBond = sRow.location === 'Ex-Bond';
        const isSubtotal = sRow.isSubtotal;
        const isLocTotal = sRow.details === 'TOTAL';

        excelRow.eachCell((cell, colIdx) => {
          cell.font = {
            name: 'Segoe UI',
            size: 9.5,
            bold: isTotal || isSubtotal || isLocTotal || isLcl,
            color: { argb: isTotal ? 'FF000000' : isSubtotal ? 'FF0F172A' : 'FF1E293B' }
          };

          cell.alignment = { vertical: 'middle', horizontal: 'center' };

          if (isTotal) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFEF08A' }
            };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF000000' } },
              left: { style: 'thin', color: { argb: 'FFB0BEC5' } },
              bottom: { style: 'double', color: { argb: 'FF000000' } },
              right: { style: 'thin', color: { argb: 'FFB0BEC5' } }
            };
            if (colIdx === 5) cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFB91C1C' } };
            else if (colIdx === 6) cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF166534' } };
          } else if (isSubtotal) {
            const isIcdSub = sRow.section === 'icd' || sRow.location.includes('ICD');
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: isIcdSub ? 'FFFEF9C3' : 'FFE0F2FE' }
            };
            cell.border = {
              top: { style: 'thin', color: { argb: isIcdSub ? 'FFD97706' : 'FF0284C7' } },
              left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
              bottom: { style: 'medium', color: { argb: isIcdSub ? 'FFD97706' : 'FF0284C7' } },
              right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
            };
          } else if (isLocTotal) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF1F5F9' }
            };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
              left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
              bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
              right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
            };
          } else if (isLcl) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE0F2FE' }
            };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFBAE6FD' } },
              left: { style: 'thin', color: { argb: 'FFBAE6FD' } },
              bottom: { style: 'thin', color: { argb: 'FFBAE6FD' } },
              right: { style: 'thin', color: { argb: 'FFBAE6FD' } }
            };
          } else if (isExBond) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8FAFC' }
            };
            cell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF64748B' } };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
          } else {
            const isScrap = sRow.details === 'Scrap';
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: isScrap ? 'FFFFFBEB' : 'FFFFFFFF' }
            };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
          }
        });
      };

      const hasSectionHeaders = summaryRows.some(r => r.isSectionHeader);

      if (hasSectionHeaders) {
        summaryRows.forEach((sRow) => {
          if (sRow.isSectionHeader) {
            if (summaryWorksheet.rowCount > 5) {
              summaryWorksheet.addRow([]);
            }
            const bannerRow = summaryWorksheet.addRow([sRow.location]);
            bannerRow.height = 24;
            summaryWorksheet.mergeCells(bannerRow.number, 1, bannerRow.number, 6);
            const isIcd = sRow.section === 'icd';
            const isOverall = sRow.section === 'overall';
            const bannerCell = bannerRow.getCell(1);
            bannerCell.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: isIcd ? 'FF92400E' : isOverall ? 'FF1E293B' : 'FF0369A1' } };
            bannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isIcd ? 'FFFEF3C7' : isOverall ? 'FFF1F5F9' : 'FFE0F2FE' } };
            bannerCell.alignment = { vertical: 'middle', horizontal: 'center' };

            const headerRow = summaryWorksheet.addRow(['PARTICULARS', 'DETAILS', '20 FT', '40 FT', 'TEUS', 'CONTAINERS']);
            headerRow.height = 24;
            headerRow.eachCell(c => {
              c.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: isIcd ? 'FF92400E' : isOverall ? 'FF334155' : 'FF0369A1' } };
              c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isIcd ? 'FFFDE68A' : isOverall ? 'FFE2E8F0' : 'FFBAE6FD' } };
              c.alignment = { vertical: 'middle', horizontal: 'center' };
              c.border = {
                top: { style: 'medium', color: { argb: isIcd ? 'FFD97706' : isOverall ? 'FF94A3B8' : 'FF0284C7' } },
                left: { style: 'thin', color: { argb: isIcd ? 'FFD97706' : isOverall ? 'FF94A3B8' : 'FF0284C7' } },
                bottom: { style: 'medium', color: { argb: isIcd ? 'FFD97706' : isOverall ? 'FF94A3B8' : 'FF0284C7' } },
                right: { style: 'thin', color: { argb: isIcd ? 'FFD97706' : isOverall ? 'FF94A3B8' : 'FF0284C7' } }
              };
            });
            return;
          }

          const r = summaryWorksheet.addRow([
            sRow.location,
            sRow.details,
            sRow.count20,
            sRow.count40,
            sRow.teus,
            sRow.containers
          ]);
          styleSummaryRow(r, sRow);
        });
      } else {
        const sec1Banner = summaryWorksheet.addRow(['LOCATION CLEARANCE SUMMARY']);
        sec1Banner.height = 24;
        summaryWorksheet.mergeCells(sec1Banner.number, 1, sec1Banner.number, 6);
        const sec1Cell = sec1Banner.getCell(1);
        sec1Cell.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: 'FF92400E' } };
        sec1Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        sec1Cell.alignment = { vertical: 'middle', horizontal: 'center' };

        const sumHeaderRow = summaryWorksheet.addRow(['PARTICULARS', 'DETAILS', '20 FT', '40 FT', 'TEUS', 'CONTAINERS']);
        sumHeaderRow.height = 26;
        sumHeaderRow.eachCell(cell => {
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1E293B' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'medium', color: { argb: 'FFD97706' } },
            left: { style: 'thin', color: { argb: 'FFD97706' } },
            bottom: { style: 'medium', color: { argb: 'FFD97706' } },
            right: { style: 'thin', color: { argb: 'FFD97706' } }
          };
        });

        summaryRows.forEach(sRow => {
          const r = summaryWorksheet.addRow([
            sRow.location,
            sRow.details,
            sRow.count20,
            sRow.count40,
            sRow.teus,
            sRow.containers
          ]);
          styleSummaryRow(r, sRow);
        });
      }

      // Summary Column Widths
      const summaryColWidths = [26, 16, 18, 16, 18, 18];
      summaryColWidths.forEach((w, idx) => {
        summaryWorksheet.getColumn(idx + 1).width = w;
      });

      // If there are also Air jobs in this mixed dataset, add dedicated Sheet 3 for Air Summary
      const airOnlyRecords = data.filter(r => r.mode && r.mode.toLowerCase() === 'air');
      if (airOnlyRecords.length > 0) {
        const airSummaryWorksheet = workbook.addWorksheet('Air Summary');
        populateAirSummaryWorksheet(airSummaryWorksheet, airOnlyRecords);
      }
    }

    // -------------------------------------------------------------
    // Generate and Download Excel
    // -------------------------------------------------------------
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${isAir ? 'air_clearance_report' : 'clearance_report'}_${monthName}_${year}_${timestamp}.xlsx`;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };


  const exportToPDF = async () => {
    const isAir = (selectedCategory && selectedCategory.toLowerCase() === 'air') ||
      (data.length > 0 && data.every(row => row.mode && row.mode.toLowerCase() === 'air'));
    const doc = new jsPDF('l', 'mm', 'a4');
    // Main report page
    const monthName = months.find(m => String(m.value) === String(month))?.label || 'Unknown';
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const title = `${isAir ? 'Air Clearance Details' : 'Import Clearing Details'} of ${monthName}-${year}`;
    const pageWidth = doc.internal.pageSize.getWidth();
    const textWidth = doc.getTextWidth(title);
    const x = (pageWidth - textWidth) / 2;
    doc.text(title, x, 15);

    // Main table - build headers/data based on visible columns and role
    const visibleCols = columns.filter((col) => {
      if (col.key === 'cif_amount' && !isSrManager) return false;
      if (isAir && ['containerNumbers', 'totalContainers', 'size', 'teus'].includes(col.key)) {
        return false;
      }
      return true;
    });
    const tableHeaders = visibleCols.map(c => c.label);
    const tableData = data.map((row, index) => {
      const isRowAir = row.mode && row.mode.toLowerCase() === 'air';
      const containerNos = Array.isArray(row.containerNumbers) ? row.containerNumbers.join('\n') : String(row.containerNumbers || '');
      const beDate = formatDateSafePDF(row.be_date);
      const clrgDate = formatDateSafePDF(row.out_of_charge);
      const invValueDisplay = row.cif_amount && row.inv_currency
        ? `${row.inv_currency} ${(parseFloat(row.cif_amount)).toFixed(2)}`
        : '';

      return visibleCols.map((col) => {
        switch (col.key) {
          case 'srlNo':
            return String(index + 1).padStart(4, '0');
          case 'job_no':
            return row.job_no || '';
          case 'location':
            return row.location || '';
          case 'importer':
            return row.importer || '';
          case 'commodity':
            return row.commodity || '';
          case 'cif_amount':
            return invValueDisplay;
          case 'be_no':
            return row.be_no || '';
          case 'be_date':
            return beDate;
          case 'containerNumbers':
            return isRowAir ? '' : containerNos;
          case 'totalContainers':
            return isRowAir ? '' : (row.totalContainers || '');
          case 'noOfContrSize':
            return isRowAir ? '' : (row.noOfContrSize || '');
          case 'size':
            return isRowAir ? '' : deriveSize(row.noOfContrSize);
          case 'teus':
            return isRowAir ? '' : (row.teus || '');
          case 'out_of_charge':
            return clrgDate;
          case 'remarks':
            return row.remarks || '';
          default:
            return row[col.key] || '';
        }
      });
    });

    // Build columnStyles dynamically so hidden columns (eg. PRICE) are not present
    const styleMap = {
      srlNo: { cellWidth: 12, halign: 'center' },
      job_no: { cellWidth: 12, halign: 'center' },
      location: { cellWidth: 18, halign: 'center' },
      importer: { cellWidth: 35, halign: 'left' },
      commodity: { cellWidth: 55, halign: 'left' },
      cif_amount: { cellWidth: 18, halign: 'center' },
      be_no: { cellWidth: 18, halign: 'center' },
      be_date: { cellWidth: 22, halign: 'center' },
      containerNumbers: { cellWidth: 25, halign: 'center' },
      totalContainers: { cellWidth: 15, halign: 'center' },
      size: { cellWidth: 18, halign: 'center' },
      teus: { cellWidth: 12, halign: 'center' },
      out_of_charge: { cellWidth: 18, halign: 'center' },
      remarks: { cellWidth: 20, halign: 'center' }
    };

    const columnStyles = {};
    visibleCols.forEach((col, idx) => {
      const cfg = styleMap[col.key] || { cellWidth: 18, halign: 'center' };
      columnStyles[idx] = { cellWidth: cfg.cellWidth, halign: cfg.halign };
    });

    doc.autoTable({
      head: [tableHeaders],
      body: tableData,
      startY: 25,
      styles: {
        fontSize: 6,
        cellPadding: 1,
        overflow: 'linebreak',
        lineColor: [205, 133, 63],
        lineWidth: 0.3,
        textColor: [0, 0, 0]
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 6,
        halign: 'center',
        valign: 'middle',
        lineColor: [205, 133, 63],
        lineWidth: 0.5
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 6,
        valign: 'middle',
        lineColor: [205, 133, 63],
        lineWidth: 0.3
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255],
      },
      columnStyles: columnStyles,
      margin: { top: 25, right: 5, bottom: 15, left: 5 },
      theme: 'grid',
      tableLineColor: [205, 133, 63],
      tableLineWidth: 0.5
    });

    // Add summary table on a new page
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const summaryTitle = `${isAir ? 'Air Clearance Summary' : 'Summary'} - ${monthName} ${year}`;
    const summaryTextWidth = doc.getTextWidth(summaryTitle);
    const summaryX = (doc.internal.pageSize.getWidth() - summaryTextWidth) / 2;
    doc.text(summaryTitle, summaryX, 15);

    // Prepare summary table data
    const summaryRows = generateSummaryRows();
      
    const summaryHeaders = isAir
      ? ['Particulars', 'Total Filed']
      : ['Particulars', 'Details', '20', '40', 'TEUS', 'Containers'];
      
    const summaryBody = summaryRows.map(row => {
      if (isAir) {
        return [row.location, row.containers];
      }
      if (row.isSectionHeader) {
        const isIcd = row.section === 'icd';
        const isOverall = row.section === 'overall';
        return [{
          content: row.location,
          colSpan: 6,
          styles: {
            halign: 'center',
            fontStyle: 'bold',
            fillColor: isIcd ? [254, 243, 199] : isOverall ? [241, 245, 249] : [224, 242, 254],
            textColor: isIcd ? [146, 64, 14] : isOverall ? [30, 41, 59] : [3, 105, 161]
          }
        }];
      }
      return [
        row.location,
        row.details,
        row.count20,
        row.count40,
        row.teus,
        row.containers
      ];
    });
    doc.autoTable({
      head: [summaryHeaders],
      body: summaryBody,
      startY: 25,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        halign: 'center',
        valign: 'middle',
        lineColor: [205, 133, 63],
        lineWidth: 0.3,
        textColor: [0, 0, 0]
      },
      headStyles: {
        fillColor: [255, 224, 178],
        textColor: [51, 51, 51],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        valign: 'middle',
        lineColor: [205, 133, 63],
        lineWidth: 0.5
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [51, 51, 51],
        fontSize: 8,
        halign: 'center',
        valign: 'middle',
        lineColor: [205, 133, 63],
        lineWidth: 0.3
      },
      alternateRowStyles: {
        fillColor: [247, 250, 255],
      },
      margin: { top: 25, right: 5, bottom: 15, left: 5 },
      theme: 'grid',
      tableLineColor: [205, 133, 63],
      tableLineWidth: 0.5
    });

    // Add page numbering at bottom
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`${i}/${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
    }

    // Generate filename and save
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${isAir ? 'AIR_CLEARANCE_DETAILS' : 'IMPORT_CLEARING_DETAILS'}_${monthName.toUpperCase()}-${year}_${timestamp}.pdf`;
    doc.save(filename);
  };

  return (
    <Container maxWidth="xl" sx={{ padding: 1, background: 'linear-gradient(135deg, #fdf6f0 0%, #f7faff 100%)', minHeight: '100vh' }}>
      {/* Compact Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 2,
          padding: 1,
          background: 'linear-gradient(90deg, #1976d2 0%, #e3f2fd 100%)',
          borderRadius: 1,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <Box sx={{ flex: 1, display: 'flex', gap: 1 }}>
          {/* Export Button with Dark Blue Gradient */}
          <Button
            variant="contained"
            startIcon={exportLoading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
            endIcon={!exportLoading && <ArrowDropDownIcon />}
            onClick={handleExportClick}
            disabled={loading || data.length === 0 || exportLoading}
            size="small"
            sx={{
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 50%, #5c6bc0 100%)',
              boxShadow: '0 4px 8px rgba(26, 35, 126, 0.3)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 50%, #42a5f5 100%)',
                boxShadow: '0 6px 12px rgba(26, 35, 126, 0.4)',
                transform: 'translateY(-1px)'
              },
              '&:disabled': {
                background: 'linear-gradient(135deg, #9e9e9e 0%, #bdbdbd 100%)',
                color: 'rgba(255,255,255,0.7)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            {exportLoading ? `Exporting ${exportType}...` : 'Export Report'}
          </Button>

          {/* Summary Button */}
          <Button
            variant="outlined"
            startIcon={<TableViewIcon fontSize="small" sx={{ color: '#1976d2' }} />}
            onClick={() => setSummaryOpen(true)}
            disabled={loading || data.length === 0}
            size="small"
            sx={{
              fontWeight: 'bold',
              borderColor: '#1976d2',
              color: '#1976d2',
              background: 'linear-gradient(135deg, #e3f2fd 0%, #fdf6f0 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #bbdefb 0%, #ffe0b2 100%)',
                borderColor: '#1976d2',
                color: '#1565c0'
              },
              '&:disabled': {
                color: '#bdbdbd',
                borderColor: '#bdbdbd',
                background: 'linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            Summary
          </Button>

          {/* Export Options Menu */}
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleExportClose}
            PaperProps={{
              elevation: 8,
              sx: {
                mt: 1,
                minWidth: 200,
                borderRadius: 2,
                '& .MuiMenuItem-root': {
                  px: 2,
                  py: 1.5,
                  borderRadius: 1,
                  mx: 1,
                  my: 0.5,
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  }
                }
              }
            }}
          >
            <MenuItem onClick={() => handleExportReport('excel')}>
              <ListItemIcon>
                <TableViewIcon fontSize="small" sx={{ color: '#1976d2' }} />
              </ListItemIcon>
              <ListItemText
                primary="Export as Excel"
                secondary="With summary sheet"
                sx={{
                  '& .MuiListItemText-secondary': {
                    fontSize: '0.75rem',
                    color: '#666'
                  }
                }}
              />
            </MenuItem>
            <Divider sx={{ mx: 1 }} />
            <MenuItem onClick={() => handleExportReport('pdf')}>
              <ListItemIcon>
                <PictureAsPdfIcon fontSize="small" sx={{ color: '#d32f2f' }} />
              </ListItemIcon>
              <ListItemText
                primary="Export as PDF"
                secondary="With summary table"
                sx={{
                  '& .MuiListItemText-secondary': {
                    fontSize: '0.75rem',
                    color: '#666'
                  }
                }}
              />
            </MenuItem>
          </Menu>
        </Box>
        {/* Summary Dialog */}
        <Dialog open={summaryOpen} onClose={() => setSummaryOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 'bold', background: 'linear-gradient(90deg, #fdf6f0 0%, #e3f2fd 100%)' }}>
            {((selectedCategory && selectedCategory.toLowerCase() === 'air') || (data.length > 0 && data.every(row => row.mode && row.mode.toLowerCase() === 'air')))
              ? `Air Clearance Summary - ${months.find(m => String(m.value) === String(month))?.label} ${year}`
              : `Summary - ${months.find(m => String(m.value) === String(month))?.label} ${year}`
            }
          </DialogTitle>
          <DialogContent sx={{ background: '#fff' }}>
            {((selectedCategory && selectedCategory.toLowerCase() === 'air') || (data.length > 0 && data.every(row => row.mode && row.mode.toLowerCase() === 'air'))) ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, my: 1 }}>
                {/* Location Summary */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#92400e', mb: 1, textTransform: 'uppercase' }}>
                    Location / Airport Clearance Summary
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell align="center" sx={{ fontWeight: 'bold', background: '#fde68a', color: '#1e293b', width: 60 }}>#</TableCell>
                          <TableCell align="left" sx={{ fontWeight: 'bold', background: '#fde68a', color: '#1e293b' }}>Airport / Custom House</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', background: '#fde68a', color: '#1e293b', width: 140 }}>Total B/Es Filed</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', background: '#fde68a', color: '#1e293b', width: 100 }}>Share (%)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(() => {
                          const locCounts = {};
                          data.forEach(r => {
                            const loc = r.location || 'Unknown';
                            locCounts[loc] = (locCounts[loc] || 0) + 1;
                          });
                          const total = data.length;
                          return (
                            <>
                              {Object.entries(locCounts).map(([loc, cnt], idx) => (
                                <TableRow key={loc} sx={{ '&:nth-of-type(even)': { background: '#f8fafc' } }}>
                                  <TableCell align="center" sx={{ color: '#64748b' }}>{String(idx + 1).padStart(2, '0')}</TableCell>
                                  <TableCell align="left" sx={{ fontWeight: 500 }}>{loc}</TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>{cnt}</TableCell>
                                  <TableCell align="center">{total > 0 ? `${((cnt / total) * 100).toFixed(1)}%` : '0.0%'}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow sx={{ background: '#fef08a', borderTop: '2px solid #1a237e', borderBottom: '3px double #1a237e' }}>
                                <TableCell />
                                <TableCell align="left" sx={{ fontWeight: 'bold' }}>TOTAL AIR SHIPMENTS</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold', color: '#1a237e' }}>{total}</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>100.0%</TableCell>
                              </TableRow>
                            </>
                          );
                        })()}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>

                {/* Importer Breakdown */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#0369a1', mb: 1, textTransform: 'uppercase' }}>
                    Importer-Wise Air Volume Ranking
                  </Typography>
                  <TableContainer sx={{ maxHeight: 320 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell align="center" sx={{ fontWeight: 'bold', background: '#bae6fd', color: '#0369a1', width: 60 }}>#</TableCell>
                          <TableCell align="left" sx={{ fontWeight: 'bold', background: '#bae6fd', color: '#0369a1' }}>Importer Name</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', background: '#bae6fd', color: '#0369a1', width: 140 }}>Air B/Es Filed</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', background: '#bae6fd', color: '#0369a1', width: 100 }}>Share (%)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(() => {
                          const impCounts = {};
                          data.forEach(r => {
                            const imp = r.importer || 'Unknown';
                            impCounts[imp] = (impCounts[imp] || 0) + 1;
                          });
                          const total = data.length;
                          const sorted = Object.entries(impCounts).sort((a, b) => b[1] - a[1]);
                          return (
                            <>
                              {sorted.map(([imp, cnt], idx) => (
                                <TableRow key={imp} sx={{ '&:nth-of-type(even)': { background: '#f8fafc' } }}>
                                  <TableCell align="center" sx={{ color: '#64748b' }}>{String(idx + 1).padStart(2, '0')}</TableCell>
                                  <TableCell align="left">{imp}</TableCell>
                                  <TableCell align="center" sx={{ fontWeight: 'bold', color: '#0369a1' }}>{cnt}</TableCell>
                                  <TableCell align="center">{total > 0 ? `${((cnt / total) * 100).toFixed(1)}%` : '0.0%'}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow sx={{ background: '#fef08a', borderTop: '2px solid #0284c7', borderBottom: '3px double #0284c7' }}>
                                <TableCell />
                                <TableCell align="left" sx={{ fontWeight: 'bold' }}>TOTAL AIR SHIPMENTS</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold', color: '#0369a1' }}>{total}</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>100.0%</TableCell>
                              </TableRow>
                            </>
                          );
                        })()}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell align="center" sx={{ fontWeight: 'bold', background: '#ffe0b2', color: '#333' }}>Particulars</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', background: '#ffe0b2', color: '#333' }}>Details</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', background: '#ffe0b2', color: '#333' }}>20</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', background: '#ffe0b2', color: '#333' }}>40</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', background: '#ffe0b2', color: '#333' }}>TEUS</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold', background: '#ffe0b2', color: '#333' }}>Containers</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {generateSummaryRows().map((row, idx) => {
                      if (row.isSectionHeader) {
                        const isIcd = row.section === 'icd';
                        const isOverall = row.section === 'overall';
                        return (
                          <TableRow key={idx} sx={{ background: isIcd ? '#fff3e0' : isOverall ? '#f1f5f9' : '#e0f2fe' }}>
                            <TableCell
                              colSpan={6}
                              align="center"
                              sx={{
                                fontWeight: 'bold',
                                fontSize: '0.85rem',
                                letterSpacing: '0.05em',
                                color: isIcd ? '#b45309' : isOverall ? '#1e293b' : '#0369a1',
                                py: 1
                              }}
                            >
                              {row.location}
                            </TableCell>
                          </TableRow>
                        );
                      }

                      const isGrandTotal = row.location === 'TOTAL';
                      const isSubtotal = row.isSubtotal;
                      const isLocTotal = row.details === 'TOTAL';
                      const isLcl = row.location === 'LCL';
                      const isExBond = row.location === 'Ex-Bond';

                      let rowBg = undefined;
                      if (isGrandTotal) rowBg = '#fff9c4';
                      else if (isSubtotal) rowBg = row.location.includes('ICD') ? '#fef9c3' : '#e0f2fe';
                      else if (isLocTotal) rowBg = '#f1f5f9';
                      else if (isLcl) rowBg = '#e3f2fd';
                      else if (isExBond) rowBg = '#f8fafc';
                      else if (row.details === 'Scrap') rowBg = '#fffde7';
                      else if (row.details === 'Others') rowBg = '#f7faff';

                      const isBold = isGrandTotal || isSubtotal || isLocTotal || isLcl;

                      return (
                        <TableRow
                          key={idx}
                          sx={{
                            background: rowBg,
                            borderTop: isGrandTotal ? '2px solid #1a237e' : isSubtotal ? '1px solid #cbd5e1' : undefined,
                            borderBottom: isGrandTotal ? '3px double #1a237e' : isSubtotal ? '2px solid #94a3b8' : undefined
                          }}
                        >
                          <TableCell
                            align="center"
                            sx={{
                              fontWeight: isBold ? 'bold' : 'normal',
                              color: isGrandTotal ? '#1a237e' : isSubtotal ? '#0f172a' : 'inherit'
                            }}
                          >
                            {row.location}
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              fontWeight: isBold ? 'bold' : 'normal',
                              color: isLocTotal || isSubtotal ? '#0d47a1' : 'inherit'
                            }}
                          >
                            {row.details}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: isBold ? 'bold' : 'normal' }}>{row.count20}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: isBold ? 'bold' : 'normal' }}>{row.count40}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: isBold ? 'bold' : 'normal', color: isGrandTotal ? '#b91c1c' : 'inherit' }}>{row.teus}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: isBold ? 'bold' : 'normal', color: isGrandTotal ? '#166534' : 'inherit' }}>{row.containers}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSummaryOpen(false)} color="primary" variant="contained">Close</Button>
          </DialogActions>
        </Dialog>

        <Typography
          variant="h6"
          align="center"
          sx={{
            fontWeight: 'bold',
            color: 'white',
            textShadow: '0 1px 4px rgba(25, 118, 210, 0.15)',
            fontSize: '1rem'
          }}
        >
          Import Clearance Report
        </Typography>



        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>

          {isSrManager && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Grade</InputLabel>
              <Select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                label="Grade"
              >
                {gradeOptions.map((grade) => (
                  <MenuItem key={grade.value} value={grade.value}>
                    {grade.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel>Year</InputLabel>
            <Select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              label="Year"
            >
              {years.map((y) => (
                <MenuItem key={y.value} value={y.value}>{y.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={handlePreviousMonth}
              sx={{
                bgcolor: '#f5f5f5',
                '&:hover': { bgcolor: '#e0e0e0' }
              }}
            >
              <ArrowBackIosNewIcon fontSize="small" />
            </IconButton>

            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Month</InputLabel>
              <Select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                label="Month"
              >
                {months.map((m) => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <IconButton
              size="small"
              onClick={handleNextMonth}
              sx={{
                bgcolor: '#f5f5f5',
                '&:hover': { bgcolor: '#e0e0e0' }
              }}
            >
              <ArrowForwardIosIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ marginBottom: 2 }}>
          {error}
        </Alert>
      )}

      {/* Data Summary Card */}
      {data.length > 0 && (
        <Card elevation={1} sx={{ marginBottom: 2, padding: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              Report Summary: {data.length} records found for {months.find(m => String(m.value) === String(month))?.label} {year}
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              {selectedCategory && selectedCategory.toLowerCase() === 'air' ? (
                <Typography variant="body2" sx={{ color: '#444' }}>
                  Total Air Shipments: <strong style={{ color: '#1976d2' }}>{data.length}</strong>
                </Typography>
              ) : (
                <>
                  <Typography variant="body2" sx={{ color: '#444' }}>
                    Total Containers: <strong style={{ color: '#2e7d32' }}>{
                      (() => {
                        const filteredData = data.filter(row => {
                          const isRowAir = row.mode && row.mode.toLowerCase() === 'air';
                          return !isRowAir && row.be_filing_type !== "Ex-Bond" && row.type_of_b_e !== "Ex-Bond";
                        });
                        return filteredData.reduce((sum, row) => sum + (parseInt(row.totalContainers) || 0), 0);
                      })()
                    }</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#444' }}>
                    Total TEUs: <strong style={{ color: '#1976d2' }}>{
                      (() => {
                        const filteredData = data.filter(row => {
                          const isRowAir = row.mode && row.mode.toLowerCase() === 'air';
                          return !isRowAir && row.be_filing_type !== "Ex-Bond" && row.type_of_b_e !== "Ex-Bond";
                        });
                        const totalTeus = filteredData.reduce((sum, row) => {
                          const consType = (row.consignment_type || '').toUpperCase();
                          const remarks = (row.remarks || '').toLowerCase();
                          const isLCL = consType === 'LCL' || remarks.includes('lcl');
                          if (isLCL) return sum + 1;
                          return sum + (parseInt(row.teus) || 0);
                        }, 0);

                        return totalTeus;
                      })()
                    }</strong>
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        </Card>
      )}

      {/* Data Table */}
      {data.length > 0 && (
        <Card elevation={1} sx={{ overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {columns
                    .filter((col) => {
                      if (col.key === 'cif_amount' && !isSrManager) return false;
                      const isAir = selectedCategory && selectedCategory.toLowerCase() === 'air';
                      if (isAir && ['containerNumbers', 'totalContainers', 'size', 'teus'].includes(col.key)) {
                        return false;
                      }
                      return true;
                    })
                    .map((col) => (
                      <TableCell
                        key={col.key}
                        align="center"
                        sx={{
                          fontWeight: "bold",
                          fontSize: "0.75rem",
                          padding: "8px 6px",
                          backgroundColor: '#f5f5f5',
                          color: '#333',
                          minWidth: col.minWidth,
                          whiteSpace: 'nowrap',
                          borderBottom: '2px solid #e0e0e0'
                        }}
                      >
                        {col.label}
                      </TableCell>
                    ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading
                  ? Array.from({ length: 8 }).map((_, idx) => (
                    <TableRow key={idx}>
                      {columns
                        .filter((col) => {
                          if (col.key === 'cif_amount' && !isSrManager) return false;
                          const isAir = selectedCategory && selectedCategory.toLowerCase() === 'air';
                          if (isAir && ['containerNumbers', 'totalContainers', 'size', 'teus'].includes(col.key)) {
                            return false;
                          }
                          return true;
                        })
                        .map((col) => (
                          <TableCell
                            key={col.key}
                            align="center"
                            sx={{
                              fontSize: "0.75rem",
                              padding: "6px 8px",
                              borderBottom: '1px solid #e0e0e0'
                            }}
                          >
                            <Skeleton variant="text" height={20} />
                          </TableCell>
                        ))}
                    </TableRow>
                  ))
                  : data.map((row, idx) => (
                    <TableRow
                      key={idx}
                      sx={{
                        '&:hover': {
                          backgroundColor: '#f9f9f9'
                        },
                        '&:nth-of-type(even)': {
                          backgroundColor: '#fafafa'
                        }
                      }}
                    >
                      {/* Srl No. */}
                      <TableCell align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px", fontWeight: 'bold', color: '#666' }}>
                        {String(idx + 1).padStart(3, "0")}
                      </TableCell>

                      {/* JOB No */}
                      <TableCell align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px", fontWeight: '500' }}>
                        {row.job_no}
                      </TableCell>

                      {/* LOCATION */}
                      <TableCell align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px" }}>
                        {row.location}
                      </TableCell>

                      {/* IMPORTERS NAME */}
                      <TableCell align="left" sx={{ fontSize: "0.75rem", padding: "6px 8px", maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <Tooltip title={row.importer}>
                          <span>{row.importer}</span>
                        </Tooltip>
                      </TableCell>

                      {/* COMMODITY */}
                      <TableCell align="left" sx={{ fontSize: "0.75rem", padding: "6px 8px", maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <Tooltip title={row.commodity}>
                          <span>{row.commodity}</span>
                        </Tooltip>
                      </TableCell>

                      {/* PRICE (cif_amount) - NEW COLUMN (only for Sr. Manager) */}
                      {isSrManager && (
                        <TableCell align="right" sx={{
                          fontSize: "0.8rem",
                          padding: "6px 8px",
                          fontWeight: '500',
                          color: '#1976d2',
                          fontFamily: 'monospace',
                          whiteSpace: 'nowrap'
                        }}>
                          {row?.cif_amount && row?.inv_currency
                            ? `${row.inv_currency} ${(parseFloat(row.cif_amount)).toFixed(2)}`
                            : '—'
                          }
                        </TableCell>
                      )}



                      {/* B/E. NO. */}
                      <TableCell align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px" }}>
                        {row.be_no}
                      </TableCell>

                      {/* DATE */}
                      <TableCell align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px" }}>
                        {formatDateSafe(row.be_date)}
                      </TableCell>

                      {/* CONTAINER NO. */}
                      {!(selectedCategory && selectedCategory.toLowerCase() === 'air') && (
                        <TableCell align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px" }}>
                          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
                            {!(row.mode && row.mode.toLowerCase() === 'air') && row.containerNumbers && row.containerNumbers.map((num, i) => (
                              <Typography key={i} variant="caption" sx={{ fontSize: '0.7rem' }}>
                                {num}
                              </Typography>
                            ))}
                          </Box>
                        </TableCell>
                      )}

                      {/* NO. OF CNTR */}
                      {!(selectedCategory && selectedCategory.toLowerCase() === 'air') && (
                        <TableCell align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px", fontWeight: 'bold' }}>
                          {row.mode && row.mode.toLowerCase() === 'air' ? '' : row.totalContainers}
                        </TableCell>
                      )}

                      {/* SIZE (separate column) */}
                      {!(selectedCategory && selectedCategory.toLowerCase() === 'air') && (
                        <TableCell align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px" }}>
                          {row.mode && row.mode.toLowerCase() === 'air' ? '' : deriveSize(row.noOfContrSize)}
                        </TableCell>
                      )}

                      {/* Teus */}
                      {!(selectedCategory && selectedCategory.toLowerCase() === 'air') && (
                        <TableCell align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px", fontWeight: 'bold', color: '#1976d2' }}>
                          {row.mode && row.mode.toLowerCase() === 'air' ? '' : row.teus}
                        </TableCell>
                      )}

                      {/* CLRG DATE */}
                      <TableCell align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px" }}>
                        {formatDateSafe(row.out_of_charge)}
                      </TableCell>

                      {/* REMARKS */}
                      <TableCell align="center" sx={{ fontSize: "0.75rem", padding: "6px 8px" }}>
                        {row.remarks
                          ? row.remarks.split('\n').map((line, idx) => (
                            <React.Fragment key={idx}>
                              {line}
                              {idx < row.remarks.split('\n').length - 1 && <br />}
                            </React.Fragment>
                          ))
                          : ""}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>

            </Table>
          </TableContainer>
        </Card>
      )}

      {/* No Data State */}
      {!loading && data.length === 0 && (
        <Card elevation={1} sx={{ padding: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary" sx={{ mb: 2 }}>
            No Data Available
          </Typography>
          <Typography variant="body2" color="textSecondary">
            No import clearance records found for {months.find(m => String(m.value) === String(month))?.label} {year}
          </Typography>
        </Card>
      )}
    </Container>
  );
};

export default DetailedReport;
