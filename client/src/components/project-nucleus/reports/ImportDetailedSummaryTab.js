import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
    FiSearch, FiDownload, FiFileText, FiChevronLeft, FiChevronRight,
    FiLayers, FiBox, FiUsers
} from 'react-icons/fi';

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
};

const formatCurrency = (amount, currency = 'INR') => {
    if (amount === undefined || amount === null || amount === '') return '-';
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    return `${currency ? currency + ' ' : ''}${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const ImportDetailedSummaryTab = ({ detailedJobs = [], loading = false, reportType = 'import_out_of_charge_summary' }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [pageSize, setPageSize] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: 'out_of_charge', direction: 'desc' });
    const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
    const [selectedSizeFilter, setSelectedSizeFilter] = useState('ALL');

    // Distinct branches & statuses for quick dropdown filters
    const availableBranches = useMemo(() => {
        const set = new Set();
        detailedJobs.forEach(j => {
            if (j.branch) set.add(j.branch);
        });
        return Array.from(set).sort();
    }, [detailedJobs]);

    const availableStatuses = useMemo(() => {
        const set = new Set();
        detailedJobs.forEach(j => {
            if (j.detailed_status) set.add(j.detailed_status);
        });
        return Array.from(set).sort();
    }, [detailedJobs]);

    // Filtering
    const filteredJobs = useMemo(() => {
        let list = detailedJobs || [];

        if (selectedBranchFilter !== 'ALL') {
            list = list.filter(j => j.branch === selectedBranchFilter);
        }

        if (selectedStatusFilter !== 'ALL') {
            list = list.filter(j => j.detailed_status === selectedStatusFilter);
        }

        if (selectedSizeFilter !== 'ALL') {
            list = list.filter(j => {
                const ft20 = Number(j.sizeCounts?.ft20) || 0;
                const ft40 = Number(j.sizeCounts?.ft40) || 0;
                const isLcl = j.consignment_type === 'LCL' || (ft20 === 0 && ft40 === 0);

                switch (selectedSizeFilter) {
                    case '20_ONLY':
                        return ft20 > 0 && ft40 === 0;
                    case '40_ONLY':
                        return ft40 > 0 && ft20 === 0;
                    case 'MIXED':
                        return ft20 > 0 && ft40 > 0;
                    case 'HAS_20':
                        return ft20 > 0;
                    case 'HAS_40':
                        return ft40 > 0;
                    case 'LCL':
                        return isLcl;
                    default:
                        return true;
                }
            });
        }

        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            list = list.filter(j => {
                const jobNo = String(j.job_no || j.job_number || '').toLowerCase();
                const importer = String(j.importer || '').toLowerCase();
                const beNo = String(j.be_no || '').toLowerCase();
                const loc = String(j.location || j.custom_house || j.port_of_reporting || '').toLowerCase();
                const commodity = String(j.commodity || '').toLowerCase();
                const owner = String(j.job_owner || '').toLowerCase();
                const cntrs = Array.isArray(j.containerNumbers)
                    ? j.containerNumbers.join(' ').toLowerCase()
                    : '';
                return jobNo.includes(q) ||
                    importer.includes(q) ||
                    beNo.includes(q) ||
                    loc.includes(q) ||
                    commodity.includes(q) ||
                    owner.includes(q) ||
                    cntrs.includes(q);
            });
        }

        return list;
    }, [detailedJobs, selectedBranchFilter, selectedStatusFilter, selectedSizeFilter, searchTerm]);

    // Sorting
    const sortedJobs = useMemo(() => {
        if (!sortConfig.key) return filteredJobs;
        return [...filteredJobs].sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            if (valA === undefined || valA === null) valA = '';
            if (valB === undefined || valB === null) valB = '';

            // Numeric comparison
            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            }

            // Date parsing comparison if key is a date
            if (['out_of_charge', 'be_date', 'job_date'].includes(sortConfig.key)) {
                const dateA = new Date(valA).getTime() || 0;
                const dateB = new Date(valB).getTime() || 0;
                return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
            }

            // String comparison
            const strA = String(valA).toLowerCase();
            const strB = String(valB).toLowerCase();
            if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredJobs, sortConfig]);

    // Pagination
    const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(sortedJobs.length / (parseInt(pageSize, 10) || 25));
    const paginatedJobs = useMemo(() => {
        if (pageSize === 'ALL') return sortedJobs;
        const size = parseInt(pageSize, 10) || 25;
        const start = (currentPage - 1) * size;
        return sortedJobs.slice(start, start + size);
    }, [sortedJobs, currentPage, pageSize]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return ' ⇅';
        return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
    };

    // ─── Summary KPIs Calculation ───────────────────────────────────────
    const summaryKPIs = useMemo(() => {
        let totalJobs = filteredJobs.length;
        let total20 = 0;
        let total40 = 0;
        let totalTeus = 0;
        let totalCifVal = 0;
        const uniqueImporters = new Set();

        filteredJobs.forEach(j => {
            if (j.importer) uniqueImporters.add(j.importer);
            if (j.sizeCounts) {
                total20 += Number(j.sizeCounts.ft20) || 0;
                total40 += Number(j.sizeCounts.ft40) || 0;
            }
            totalTeus += Number(j.teus) || 0;
            const cif = parseFloat(j.cif_amount || j.cif_amount_inr);
            if (!isNaN(cif)) totalCifVal += cif;
        });

        return {
            totalJobs,
            total20,
            total40,
            totalContainers: total20 + total40,
            totalTeus,
            totalCifVal,
            uniqueImportersCount: uniqueImporters.size
        };
    }, [filteredJobs]);

    // ─── Export to Excel (Styled & with AutoFilter) ─────────────────────
    const exportToExcel = async () => {
        if (!sortedJobs.length) return;

        try {
            const ExcelJS = await import('exceljs');
            const { saveAs } = await import('file-saver');
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'AlVision Exim Operations';
            workbook.created = new Date();

            const isExport = reportType === 'export_leo_summary';
            const sheetTitle = isExport ? 'Export Detailed Summary' : 'Import Detailed Summary';

            const ws = workbook.addWorksheet(sheetTitle, {
                views: [{ state: 'frozen', ySplit: 4 }]
            });

            const headers = isExport ? [
                "Srl No.", "Job No", "Branch", "Location", "Exporter Name",
                "Commodity", "FOB / Invoice Value", "Currency", "S/B No.", "S/B Date",
                "Container Nos", "Total Containers", "Size Breakdown", "TEUs",
                "Clearance Date (LEO)", "Detailed Status", "Job Owner"
            ] : [
                "Srl No.", "Job No", "Branch", "Location", "Importer Name",
                "Commodity", "Price / CIF Amount", "Currency", "B/E No.", "B/E Date",
                "Container Nos", "Total Containers", "Size Breakdown", "TEUs",
                "Clearance Date (OOC)", "Detailed Status", "Job Owner", "RMS", "CTH No"
            ];

            const totalCols = headers.length;
            const lastColLetter = isExport ? 'Q' : 'S';

            // Row 1: Banner Title
            ws.addRow([`ALVISION EXIM — ${isExport ? 'EXPORT LEO' : 'IMPORT OPERATIONS'} DETAILED SUMMARY REPORT`]);
            ws.mergeCells(`A1:${lastColLetter}1`);
            const titleRow = ws.getRow(1);
            titleRow.height = 36;
            titleRow.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
            titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1B4B' } };
            titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

            // Row 2: Metadata Block
            const metaText = `Generated: ${new Date().toLocaleString('en-GB')} | Total Records: ${sortedJobs.length} | Branch Filter: ${selectedBranchFilter} | Status Filter: ${selectedStatusFilter} | Size Filter: ${selectedSizeFilter}`;
            ws.addRow([metaText]);
            ws.mergeCells(`A2:${lastColLetter}2`);
            const metaRow = ws.getRow(2);
            metaRow.height = 22;
            metaRow.getCell(1).font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF1E293B' } };
            metaRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            metaRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

            // Row 3: Separator
            ws.addRow([]);
            ws.getRow(3).height = 8;

            // Row 4: Column Headers
            ws.addRow(headers);
            const headerRow = ws.getRow(4);
            headerRow.height = 28;
            headerRow.eachCell((cell) => {
                cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
                    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                };
            });

            // Set Native Excel AutoFilter on row 4 across all columns
            ws.autoFilter = {
                from: { row: 4, column: 1 },
                to: { row: 4 + sortedJobs.length, column: totalCols }
            };

            let sumCif = 0;
            let sumTotalContainers = 0;
            let sumTeus = 0;

            sortedJobs.forEach((j, idx) => {
                const rowNum = 5 + idx;
                const bgArgb = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';

                const cifVal = Number(j.cif_amount || j.cif_amount_inr || j.fob_amount || j.invoice_amount || 0);
                const contCount = Number(j.totalContainers || (j.sizeCounts ? (j.sizeCounts.ft20 + j.sizeCounts.ft40) : 0));
                const teuVal = Number(j.teus || 0);

                if (!isNaN(cifVal)) sumCif += cifVal;
                if (!isNaN(contCount)) sumTotalContainers += contCount;
                if (!isNaN(teuVal)) sumTeus += teuVal;

                const rowValues = isExport ? [
                    idx + 1,
                    j.job_no || j.jobNumber || j.job_number || '—',
                    j.branch || j.branch_code || '—',
                    j.location || j.custom_house || j.port_of_reporting || '—',
                    j.exporter || j.shipper || '—',
                    j.commodity || '—',
                    cifVal || '—',
                    j.inv_currency || j.currency || 'INR',
                    j.sb_no || '—',
                    formatDate(j.sb_date),
                    Array.isArray(j.containerNumbers) ? j.containerNumbers.join(', ') : (j.container_nos || '—'),
                    contCount || 0,
                    j.noOfContrSize || '—',
                    teuVal || 0,
                    formatDate(j.leoDate || j.out_of_charge),
                    j.detailedStatus || j.detailed_status || j.status || '—',
                    j.job_owner || '—'
                ] : [
                    idx + 1,
                    j.job_no || j.job_number || '—',
                    j.branch || '—',
                    j.location || j.custom_house || j.port_of_reporting || '—',
                    j.importer || '—',
                    j.commodity || '—',
                    cifVal || '—',
                    j.inv_currency || 'INR',
                    j.be_no || '—',
                    formatDate(j.be_date),
                    Array.isArray(j.containerNumbers) ? j.containerNumbers.join(', ') : (j.container_nos || '—'),
                    contCount || 0,
                    j.noOfContrSize || '—',
                    teuVal || 0,
                    formatDate(j.out_of_charge),
                    j.detailed_status || '—',
                    j.job_owner || '—',
                    j.RMS || '—',
                    j.cth_no || '—'
                ];

                ws.addRow(rowValues);

                const row = ws.getRow(rowNum);
                row.height = 21;
                row.eachCell((cell, colNum) => {
                    cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                    };

                    if (colNum === 1 || colNum === 3 || colNum === 8 || colNum === 9 || colNum === 10 || colNum === 15 || colNum === 18 || colNum === 19) {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    } else if (colNum === 2) {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF4338CA' } };
                    } else if (colNum === 5 || colNum === 6) {
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    } else if (colNum === 7) {
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                        if (typeof cell.value === 'number') {
                            cell.numFmt = '#,##0.00';
                        }
                    } else if (colNum === 12 || colNum === 14) {
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                        cell.numFmt = '#,##0';
                    } else {
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    }
                });
            });

            // Summary Total Row
            if (sortedJobs.length > 0) {
                const totalRowNum = 5 + sortedJobs.length;
                const totalRowData = isExport ? [
                    'TOTAL',
                    `${sortedJobs.length} Jobs`,
                    '—',
                    '—',
                    'All Exporters',
                    '—',
                    sumCif,
                    'INR',
                    '—',
                    '—',
                    '—',
                    sumTotalContainers,
                    '—',
                    sumTeus,
                    '—',
                    '—',
                    '—'
                ] : [
                    'TOTAL',
                    `${sortedJobs.length} Jobs`,
                    '—',
                    '—',
                    'All Importers',
                    '—',
                    sumCif,
                    'INR',
                    '—',
                    '—',
                    '—',
                    sumTotalContainers,
                    '—',
                    sumTeus,
                    '—',
                    '—',
                    '—',
                    '—',
                    '—'
                ];

                ws.addRow(totalRowData);

                const totRow = ws.getRow(totalRowNum);
                totRow.height = 25;
                totRow.eachCell((cell, colNum) => {
                    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
                    cell.border = {
                        top: { style: 'medium', color: { argb: 'FF0F172A' } },
                        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                        bottom: { style: 'double', color: { argb: 'FF0F172A' } },
                        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                    };

                    if (colNum === 7) {
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                        cell.numFmt = '#,##0.00';
                    } else if (colNum === 12 || colNum === 14) {
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                        cell.numFmt = '#,##0';
                    } else if (colNum === 5) {
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    } else {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                });
            }

            // Auto-fit column widths
            ws.columns.forEach((col) => {
                let max = 0;
                col.eachCell({ includeEmpty: true }, (cell, rn) => {
                    if (rn > 3) {
                        const l = cell.value ? String(cell.value).length : 0;
                        if (l > max) max = l;
                    }
                });
                col.width = Math.max(max + 4, 13);
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const prefix = isExport ? 'Export_Detailed_Summary' : 'Import_Detailed_Summary';
            saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${prefix}_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (err) {
            console.error("Excel export error:", err);
            alert("Failed to export Excel file. Please try again.");
        }
    };

    // ─── Export to PDF ─────────────────────────────────────────────────
    const exportToPDF = () => {
        if (!sortedJobs.length) return;

        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

        doc.setFontSize(14);
        doc.text("Import Clearance - Detailed Summary Report", 40, 35);
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString('en-GB')} | Total Records: ${sortedJobs.length} | TEUs: ${summaryKPIs.totalTeus}`, 40, 50);

        const tableColumn = [
            "Srl", "Job No", "Branch", "Location", "Importer", "Commodity",
            "B/E No.", "B/E Date", "Containers", "Size", "TEU", "OOC Date", "Status"
        ];

        const tableRows = sortedJobs.map((j, idx) => [
            idx + 1,
            j.job_no || j.job_number || '',
            j.branch || '',
            j.location || j.custom_house || '',
            (j.importer || '').slice(0, 22),
            (j.commodity || '').slice(0, 25),
            j.be_no || '',
            formatDate(j.be_date),
            Array.isArray(j.containerNumbers) ? j.containerNumbers.slice(0, 2).join(', ') + (j.containerNumbers.length > 2 ? '...' : '') : '',
            j.noOfContrSize || '',
            j.teus || 0,
            formatDate(j.out_of_charge),
            j.detailed_status || ''
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 65,
            theme: 'grid',
            styles: { fontSize: 7.5, cellPadding: 4 },
            headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 30, right: 30 }
        });

        doc.save(`Import_Detailed_Summary_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            {/* ─── Top KPI Metric Strip ─────────────────────────────────────── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                width: '100%',
                boxSizing: 'border-box'
            }}>
                <div className="fleet-card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '16px', boxSizing: 'border-box' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                        <FiFileText />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Jobs</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>{summaryKPIs.totalJobs}</div>
                    </div>
                </div>

                <div className="fleet-card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '16px', boxSizing: 'border-box' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                        <FiBox />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Containers / TEUs</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>
                            {summaryKPIs.totalContainers} <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>({summaryKPIs.totalTeus} TEUs)</span>
                        </div>
                    </div>
                </div>

                {/* Interactive Sizes Breakdown Card */}
                <div
                    className="fleet-card"
                    style={{
                        padding: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        boxSizing: 'border-box',
                        borderColor: selectedSizeFilter !== 'ALL' ? '#ec4899' : undefined,
                        boxShadow: selectedSizeFilter !== 'ALL' ? '0 0 0 2px rgba(236, 72, 153, 0.2)' : undefined,
                        position: 'relative'
                    }}
                >
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fdf2f8', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                        <FiLayers />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sizes Breakdown</div>
                            {selectedSizeFilter !== 'ALL' && (
                                <button
                                    onClick={() => setSelectedSizeFilter('ALL')}
                                    style={{
                                        border: 'none',
                                        background: 'rgba(236, 72, 153, 0.1)',
                                        color: '#ec4899',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                    title="Clear size filter"
                                >
                                    ✕ Clear
                                </button>
                            )}
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginTop: '3px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span
                                onClick={() => setSelectedSizeFilter(prev => prev === 'HAS_20' ? 'ALL' : 'HAS_20')}
                                style={{
                                    cursor: 'pointer',
                                    color: '#4f46e5',
                                    background: selectedSizeFilter === 'HAS_20' ? '#e0e7ff' : 'transparent',
                                    padding: '2px 6px',
                                    borderRadius: '6px',
                                    transition: 'all 0.15s ease'
                                }}
                                title="Click to filter by 20ft containers"
                            >
                                {summaryKPIs.total20} × 20'
                            </span>
                            <span style={{ color: '#cbd5e1' }}>|</span>
                            <span
                                onClick={() => setSelectedSizeFilter(prev => prev === 'HAS_40' ? 'ALL' : 'HAS_40')}
                                style={{
                                    cursor: 'pointer',
                                    color: '#db2777',
                                    background: selectedSizeFilter === 'HAS_40' ? '#fce7f3' : 'transparent',
                                    padding: '2px 6px',
                                    borderRadius: '6px',
                                    transition: 'all 0.15s ease'
                                }}
                                title="Click to filter by 40ft containers"
                            >
                                {summaryKPIs.total40} × 40'
                            </span>
                        </div>
                    </div>
                </div>

                <div className="fleet-card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '16px', boxSizing: 'border-box' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fffbeb', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                        <FiUsers />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Importers</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b' }}>{summaryKPIs.uniqueImportersCount}</div>
                    </div>
                </div>
            </div>

            {/* ─── Search & Toolbar ────────────────────────────────────────── */}
            <div
                className="fleet-card"
                style={{
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    width: '100%',
                    boxSizing: 'border-box'
                }}
            >
                {/* Row 1: Search + Export Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    {/* Search Box */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(241, 245, 249, 0.8)',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        flex: '1 1 280px',
                        maxWidth: '460px',
                        boxSizing: 'border-box'
                    }}>
                        <FiSearch style={{ color: '#94a3b8', flexShrink: 0 }} />
                        <input
                            type="text"
                            placeholder="Search by Job, Importer, BE, Container, Port..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                outline: 'none',
                                width: '100%',
                                fontSize: '13px',
                                color: '#1e293b'
                            }}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontSize: '12px', padding: 0 }}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Export Action Buttons */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                            onClick={exportToExcel}
                            disabled={sortedJobs.length === 0}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '7px',
                                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '10px',
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: sortedJobs.length === 0 ? 'not-allowed' : 'pointer',
                                opacity: sortedJobs.length === 0 ? 0.6 : 1,
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
                                letterSpacing: '0.2px'
                            }}
                        >
                            <FiDownload style={{ strokeWidth: 2.5 }} />
                            <span>Download Excel</span>
                            <span style={{
                                background: 'rgba(255, 255, 255, 0.22)',
                                padding: '1px 5px',
                                borderRadius: '5px',
                                fontSize: '10px',
                                fontWeight: 700,
                                letterSpacing: '0.5px'
                            }}>XLSX</span>
                        </button>

                        <button
                            onClick={exportToPDF}
                            disabled={sortedJobs.length === 0}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '7px',
                                background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '10px',
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: sortedJobs.length === 0 ? 'not-allowed' : 'pointer',
                                opacity: sortedJobs.length === 0 ? 0.6 : 1,
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.25)',
                                letterSpacing: '0.2px'
                            }}
                        >
                            <FiFileText style={{ strokeWidth: 2.5 }} />
                            <span>Download PDF</span>
                            <span style={{
                                background: 'rgba(255, 255, 255, 0.22)',
                                padding: '1px 5px',
                                borderRadius: '5px',
                                fontSize: '10px',
                                fontWeight: 700,
                                letterSpacing: '0.5px'
                            }}>PDF</span>
                        </button>
                    </div>
                </div>

                {/* Row 2: Filter Pills Strip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '2px' }}>
                        Filters:
                    </span>

                    {/* Sizes Breakdown Dropdown */}
                    <select
                        value={selectedSizeFilter}
                        onChange={(e) => {
                            setSelectedSizeFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                        style={{
                            padding: '6px 34px 6px 12px',
                            borderRadius: '8px',
                            border: selectedSizeFilter !== 'ALL' ? '1.5px solid #ec4899' : '1px solid #e2e8f0',
                            background: selectedSizeFilter !== 'ALL' ? '#fdf2f8' : '#ffffff',
                            fontWeight: selectedSizeFilter !== 'ALL' ? 700 : 500,
                            fontSize: '12.5px',
                            color: selectedSizeFilter !== 'ALL' ? '#be185d' : '#334155',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="ALL">All Sizes Breakdown</option>
                        <option value="HAS_20">Has 20' Containers</option>
                        <option value="HAS_40">Has 40' Containers</option>
                        <option value="20_ONLY">20' Containers Only</option>
                        <option value="40_ONLY">40' Containers Only</option>
                        <option value="MIXED">Mixed (20' & 40')</option>
                        <option value="LCL">LCL / Non-containerized</option>
                    </select>

                    {/* Branch Filter */}
                    {availableBranches.length > 1 && (
                        <select
                            value={selectedBranchFilter}
                            onChange={(e) => {
                                setSelectedBranchFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            style={{
                                padding: '6px 34px 6px 12px',
                                borderRadius: '8px',
                                border: selectedBranchFilter !== 'ALL' ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                                background: selectedBranchFilter !== 'ALL' ? '#eff6ff' : '#ffffff',
                                fontWeight: selectedBranchFilter !== 'ALL' ? 700 : 500,
                                fontSize: '12.5px',
                                color: selectedBranchFilter !== 'ALL' ? '#1d4ed8' : '#334155',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="ALL">All Branches ({availableBranches.length})</option>
                            {availableBranches.map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    )}

                    {/* Status Filter */}
                    {availableStatuses.length > 1 && (
                        <select
                            value={selectedStatusFilter}
                            onChange={(e) => {
                                setSelectedStatusFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            style={{
                                padding: '6px 34px 6px 12px',
                                borderRadius: '8px',
                                border: selectedStatusFilter !== 'ALL' ? '1.5px solid #8b5cf6' : '1px solid #e2e8f0',
                                background: selectedStatusFilter !== 'ALL' ? '#f5f3ff' : '#ffffff',
                                fontWeight: selectedStatusFilter !== 'ALL' ? 700 : 500,
                                fontSize: '12.5px',
                                color: selectedStatusFilter !== 'ALL' ? '#6d28d9' : '#334155',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="ALL">All Statuses ({availableStatuses.length})</option>
                            {availableStatuses.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    )}

                    {/* Reset Filters Button */}
                    {(selectedSizeFilter !== 'ALL' || selectedBranchFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || searchTerm) && (
                        <button
                            onClick={() => {
                                setSelectedSizeFilter('ALL');
                                setSelectedBranchFilter('ALL');
                                setSelectedStatusFilter('ALL');
                                setSearchTerm('');
                                setCurrentPage(1);
                            }}
                            style={{
                                padding: '5px 10px',
                                borderRadius: '8px',
                                border: '1px dashed #ef4444',
                                background: '#fef2f2',
                                color: '#dc2626',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            ✕ Reset
                        </button>
                    )}

                    {/* Live Counter */}
                    <div style={{ marginLeft: 'auto', fontSize: '12.5px', color: '#64748b', fontWeight: 500 }}>
                        Showing <strong style={{ color: '#0f172a' }}>{sortedJobs.length}</strong> of <strong style={{ color: '#0f172a' }}>{detailedJobs.length}</strong> jobs
                    </div>
                </div>
            </div>

            {/* ─── Detailed Data Table ─────────────────────────────────────── */}
            <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box'
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '100%',
                    overflowX: 'auto',
                    maxHeight: '680px',
                    WebkitOverflowScrolling: 'touch',
                    boxSizing: 'border-box'
                }}>
                    <table style={{
                        width: '100%',
                        minWidth: '1300px',
                        borderCollapse: 'collapse',
                        textAlign: 'left',
                        fontSize: '13px',
                        background: '#ffffff'
                    }}>
                        <thead style={{
                            background: '#f1f5f9',
                            borderBottom: '2px solid #cbd5e1',
                            position: 'sticky',
                            top: 0,
                            zIndex: 2
                        }}>
                            <tr>
                                <th style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, width: '50px' }}>Srl</th>
                                <th onClick={() => handleSort('job_no')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '110px' }}>
                                    Job No {getSortIcon('job_no')}
                                </th>
                                <th onClick={() => handleSort('branch')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '85px' }}>
                                    Branch {getSortIcon('branch')}
                                </th>
                                <th onClick={() => handleSort('location')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '100px' }}>
                                    Location {getSortIcon('location')}
                                </th>
                                <th onClick={() => handleSort('importer')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '190px' }}>
                                    Importer Name {getSortIcon('importer')}
                                </th>
                                <th style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, width: '170px' }}>Commodity</th>
                                <th onClick={() => handleSort('cif_amount')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '120px' }}>
                                    Price / CIF {getSortIcon('cif_amount')}
                                </th>
                                <th onClick={() => handleSort('be_no')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '100px' }}>
                                    B/E No. {getSortIcon('be_no')}
                                </th>
                                <th onClick={() => handleSort('be_date')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '90px' }}>
                                    B/E Date {getSortIcon('be_date')}
                                </th>
                                <th style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, width: '130px' }}>Containers</th>
                                <th style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, width: '90px' }}>Size</th>
                                <th onClick={() => handleSort('teus')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '65px', textAlign: 'center' }}>
                                    TEUs {getSortIcon('teus')}
                                </th>
                                <th onClick={() => handleSort('out_of_charge')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '100px' }}>
                                    OOC Date {getSortIcon('out_of_charge')}
                                </th>
                                <th onClick={() => handleSort('detailed_status')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '130px' }}>
                                    Status {getSortIcon('detailed_status')}
                                </th>
                                <th onClick={() => handleSort('job_owner')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '110px' }}>
                                    Job Owner {getSortIcon('job_owner')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedJobs.length === 0 ? (
                                <tr>
                                    <td colSpan={15} style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                                        No detailed jobs found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedJobs.map((j, idx) => {
                                    const srl = pageSize === 'ALL' ? (idx + 1) : ((currentPage - 1) * (parseInt(pageSize, 10) || 25) + idx + 1);
                                    const jobNum = j.job_no || j.job_number;
                                    return (
                                        <tr
                                            key={j._id || idx}
                                            style={{
                                                borderBottom: '1px solid #e2e8f0',
                                                background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                                                transition: 'background 0.15s ease'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#f8fafc'}
                                        >
                                            <td style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>{srl}</td>
                                            <td style={{ padding: '10px 14px', fontWeight: 800, color: '#1e293b' }}>
                                                {jobNum}
                                            </td>
                                            <td style={{ padding: '10px 14px', color: '#1e293b' }}>
                                                <span style={{
                                                    background: '#e0e7ff',
                                                    color: '#312e81',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '11.5px',
                                                    fontWeight: 700
                                                }}>
                                                    {j.branch || 'Unassigned'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 14px', color: '#334155', fontWeight: 600 }}>
                                                {j.location || j.custom_house || j.port_of_reporting || '-'}
                                            </td>
                                            <td style={{ padding: '10px 14px', color: '#0f172a', fontWeight: 700, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={j.importer}>
                                                {j.importer || '-'}
                                            </td>
                                            <td style={{ padding: '10px 14px', color: '#475569', fontWeight: 500, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={j.commodity}>
                                                {j.commodity || '-'}
                                            </td>
                                            <td style={{ padding: '10px 14px', color: '#0f172a', fontWeight: 700 }}>
                                                {formatCurrency(j.cif_amount || j.cif_amount_inr, j.inv_currency)}
                                            </td>
                                            <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 700 }}>
                                                {j.be_no || '-'}
                                            </td>
                                            <td style={{ padding: '10px 14px', color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                {formatDate(j.be_date)}
                                            </td>
                                            <td style={{ padding: '10px 14px', color: '#334155', fontWeight: 600, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={Array.isArray(j.containerNumbers) ? j.containerNumbers.join(', ') : ''}>
                                                {Array.isArray(j.containerNumbers) && j.containerNumbers.length > 0
                                                    ? `${j.containerNumbers[0]}${j.containerNumbers.length > 1 ? ` (+${j.containerNumbers.length - 1})` : ''}`
                                                    : (j.totalContainers || '-')}
                                            </td>
                                            <td style={{ padding: '10px 14px', color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                {j.noOfContrSize || '-'}
                                            </td>
                                            <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: '#0f172a', fontSize: '13.5px' }}>
                                                {j.teus || 0}
                                            </td>
                                            <td style={{ padding: '10px 14px', color: '#059669', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                {formatDate(j.out_of_charge)}
                                            </td>
                                            <td style={{ padding: '10px 14px' }}>
                                                <span style={{
                                                    background: j.detailed_status === 'Billing Pending' ? '#fef3c7' : '#ecfdf5',
                                                    color: j.detailed_status === 'Billing Pending' ? '#92400e' : '#065f46',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '11.5px',
                                                    fontWeight: 700,
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {j.detailed_status || 'Cleared'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>
                                                {j.job_owner || '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ─── Pagination Footer ─────────────────────────────────────── */}
                <div style={{
                    padding: '14px 20px',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    background: '#ffffff'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#64748b' }}>
                        <span>Rows per page:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            style={{
                                padding: '4px 28px 4px 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                outline: 'none',
                                fontSize: '13px',
                                background: '#f8fafc',
                                cursor: 'pointer'
                            }}
                        >
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value="ALL">All ({sortedJobs.length})</option>
                        </select>
                        <span>
                            Showing {sortedJobs.length === 0 ? 0 : (pageSize === 'ALL' ? 1 : (currentPage - 1) * (parseInt(pageSize, 10) || 25) + 1)} to {pageSize === 'ALL' ? sortedJobs.length : Math.min(currentPage * (parseInt(pageSize, 10) || 25), sortedJobs.length)} of {sortedJobs.length} records
                        </span>
                    </div>

                    {pageSize !== 'ALL' && totalPages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    border: currentPage === 1 ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                                    background: currentPage === 1 ? '#f8fafc' : '#eff6ff',
                                    color: currentPage === 1 ? '#94a3b8' : '#2563eb',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                <FiChevronLeft />
                            </button>
                            <span style={{ fontSize: '13px', color: '#1e40af', margin: '0 8px', fontWeight: 600 }}>
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    border: currentPage === totalPages ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                                    background: currentPage === totalPages ? '#f8fafc' : '#eff6ff',
                                    color: currentPage === totalPages ? '#94a3b8' : '#2563eb',
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                <FiChevronRight />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportDetailedSummaryTab;
