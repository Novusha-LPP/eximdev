import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Formats a date value to DD-MMM-YYYY string or empty string
 */
const formatDate = (val) => {
    if (!val) return '—';
    try {
        const d = new Date(val);
        if (isNaN(d.getTime())) {
            // Check string format dd-MM-yyyy
            if (typeof val === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(val)) return val;
            return String(val);
        }
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return String(val);
    }
};

/**
 * Auto-fits columns in an Excel worksheet based on content length
 */
const autoFitColumns = (worksheet, minWidth = 12, maxWidth = 45) => {
    worksheet.columns.forEach((col) => {
        let maxLen = minWidth;
        col.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
            // Ignore title and metadata merged header rows (rows 1-3)
            if (rowNumber > 3) {
                const val = cell.value;
                if (val !== null && val !== undefined) {
                    const text = typeof val === 'object' && val.text ? val.text : String(val);
                    if (text.length > maxLen) {
                        maxLen = text.length;
                    }
                }
            }
        });
        col.width = Math.min(maxLen + 4, maxWidth);
    });
};

/**
 * Adds corporate header title banner and filter metadata block to a worksheet
 */
const addSheetHeader = ({
    worksheet,
    title,
    subtitle,
    filterMeta = {},
    totalCols = 15,
    lastColLetter = 'O'
}) => {
    // Row 1: Main Title Banner
    worksheet.addRow([title.toUpperCase()]);
    worksheet.mergeCells(`A1:${lastColLetter}1`);
    const titleRow = worksheet.getRow(1);
    titleRow.height = 36;
    titleRow.getCell(1).font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 2: Subtitle & Corporate Branding
    worksheet.addRow([subtitle || 'ALVISION EXIM OPERATIONS & PROJECT NUCLEUS INTELLIGENCE PLATFORM']);
    worksheet.mergeCells(`A2:${lastColLetter}2`);
    const subRow = worksheet.getRow(2);
    subRow.height = 20;
    subRow.getCell(1).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFCBD5E1' } };
    subRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    subRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 3: Applied Filter Summary Block
    const filterInfo = [
        `Generated: ${new Date().toLocaleString('en-GB')}`,
        filterMeta.filterType ? `Filter: ${filterMeta.filterType.toUpperCase()}` : null,
        filterMeta.selectedFinancialYear ? `FY: ${filterMeta.selectedFinancialYear}` : null,
        filterMeta.selectedMonth ? `Month: ${filterMeta.selectedMonth}/${filterMeta.selectedYear || ''}` : null,
        filterMeta.branchId || filterMeta.selectedBranch ? `Branch: ${String(filterMeta.branchId || filterMeta.selectedBranch).toUpperCase()}` : 'Branch: ALL',
        filterMeta.category && filterMeta.category !== 'all' ? `Category: ${filterMeta.category.toUpperCase()}` : null
    ].filter(Boolean).join('  |  ');

    worksheet.addRow([filterInfo]);
    worksheet.mergeCells(`A3:${lastColLetter}3`);
    const metaRow = worksheet.getRow(3);
    metaRow.height = 22;
    metaRow.getCell(1).font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF1E293B' } };
    metaRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    metaRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 4: Spacer
    worksheet.addRow([]);
    worksheet.getRow(4).height = 6;
};

/**
 * Styles a table header row with gradient-like solid fill, borders, and bold typography
 */
const styleHeaderRow = (headerRow, fillColor = 'FF1E3A8A') => {
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FF94A3B8' } },
            left: { style: 'thin', color: { argb: 'FF94A3B8' } },
            bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
            right: { style: 'thin', color: { argb: 'FF94A3B8' } }
        };
    });
};

/**
 * Styles standard data cells with zebra striping, subtle borders, and alignment rules
 */
const styleDataCell = (cell, isEven, align = 'left', isNumber = false, format = null) => {
    cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF1E293B' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' } };
    cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };
    cell.alignment = { horizontal: align, vertical: 'middle' };
    if (format) {
        cell.numFmt = format;
    }
};

/**
 * Master Excel Exporter for Project Nucleus (Import OOC & Export LEO)
 */
export const exportNucleusReportToExcel = async ({
    reportType = 'import_out_of_charge_summary',
    reportData = {},
    filterMeta = {}
}) => {
    if (!reportData) return;

    try {
        const isExport = reportType === 'export_leo_summary';
        const reportTitle = isExport ? 'Export Let Export Order (LEO) Report' : 'Import Out of Charge (OOC) Report';
        const primaryMilestone = isExport ? 'LEO' : 'OOC';
        const customerLabel = isExport ? 'Exporter' : 'Importer';
        const billLabel = isExport ? 'S/B No.' : 'B/E No.';
        const billDateLabel = isExport ? 'S/B Date' : 'B/E Date';

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'AlVision Exim Logistics';
        workbook.created = new Date();

        // ══════════════════════════════════════════════════════════════════════
        // SHEET 1: DETAILED CLEARANCE DATA (With Native Excel AutoFilter)
        // ══════════════════════════════════════════════════════════════════════
        const detailedJobs = reportData.detailedJobs || [];
        const wsDetail = workbook.addWorksheet('Detailed Clearance Data', {
            views: [{ state: 'frozen', ySplit: 5 }]
        });

        const detailHeaders = isExport ? [
            "Srl", "Job No", "Job Date", "Branch", "Location / Port", "Exporter Name",
            "Commodity", "FOB Value (INR)", "Currency", "S/B No.", "S/B Date",
            "LEO Date", "Transport Mode", "Consignment Type", "Container Numbers",
            "20 FT", "40 FT", "Total Containers", "TEUs", "Detailed Status",
            "Job Owner", "Handover Status", "Rail Out Status", "Billing Status",
            "Drawback Scroll No", "Drawback Date", "Fine / Penalty (INR)"
        ] : [
            "Srl", "Job No", "Job Date", "Branch", "Location / Port", "Importer Name",
            "Commodity", "CIF Value (INR)", "Currency", "B/E No.", "B/E Date",
            "OOC Date", "Transport Mode", "Consignment Type", "Container Numbers",
            "20 FT", "40 FT", "Total Containers", "TEUs", "Detailed Status",
            "Job Owner", "RMS Status", "CTH No", "Detention Risk", "DO Expired",
            "Billing Status", "Delivery Status", "Fine / Penalty (INR)"
        ];

        addSheetHeader({
            worksheet: wsDetail,
            title: `ALVISION EXIM — ${reportTitle.toUpperCase()} (DETAILED REGISTER)`,
            subtitle: `LIVE OPERATIONAL CLEARANCE DATA WITH FILTER CONTROLS — TOTAL JOBS: ${detailedJobs.length}`,
            filterMeta,
            totalCols: detailHeaders.length,
            lastColLetter: 'AA'
        });

        // Add Header Row (Row 5)
        wsDetail.addRow(detailHeaders);
        const detailHeaderRow = wsDetail.getRow(5);
        styleHeaderRow(detailHeaderRow, 'FF1E3A8A');

        // Apply Native Excel AutoFilter on Row 5
        wsDetail.autoFilter = {
            from: { row: 5, column: 1 },
            to: { row: 5 + Math.max(detailedJobs.length, 1), column: detailHeaders.length }
        };

        let sumDetailValue = 0;
        let sumDetail20 = 0;
        let sumDetail40 = 0;
        let sumDetailBoxes = 0;
        let sumDetailTeus = 0;
        let sumDetailFines = 0;

        detailedJobs.forEach((job, idx) => {
            const isEven = idx % 2 === 0;
            const rowNum = 6 + idx;

            const valAmount = Number(job.cif_amount || job.cif_amount_inr || job.fob_amount || job.invoice_amount || 0);
            const ft20 = Number(job.sizeCounts?.ft20 || job.c20 || 0);
            const ft40 = Number(job.sizeCounts?.ft40 || job.c40 || 0);
            const totalBoxes = Number(job.totalContainers || (ft20 + ft40) || 0);
            const teuCount = Number(job.teus || (ft20 + ft40 * 2) || 0);
            const fineAmount = Number(job.fine_amount || job.penalty_amount || 0);

            if (!isNaN(valAmount)) sumDetailValue += valAmount;
            sumDetail20 += ft20;
            sumDetail40 += ft40;
            sumDetailBoxes += totalBoxes;
            sumDetailTeus += teuCount;
            if (!isNaN(fineAmount)) sumDetailFines += fineAmount;

            const cntrStr = Array.isArray(job.containerNumbers)
                ? job.containerNumbers.join(', ')
                : (job.container_nos || job.containers?.map(c => c.containerNo).filter(Boolean).join(', ') || '—');

            const rowData = isExport ? [
                idx + 1,
                job.job_no || job.jobNumber || job.job_number || '—',
                formatDate(job.job_date || job.createdAt),
                job.branch_code || job.branch || '—',
                job.port_of_reporting || job.custom_house || job.location || '—',
                job.exporter || job.shipper || '—',
                job.commodity || '—',
                valAmount || 0,
                job.inv_currency || job.currency || 'INR',
                job.sb_no || '—',
                formatDate(job.sb_date),
                formatDate(job.leoDate || job.out_of_charge),
                job.transportMode || job.mode || 'SEA',
                job.consignmentType || job.consignment_type || 'FCL',
                cntrStr,
                ft20,
                ft40,
                totalBoxes,
                teuCount,
                job.detailedStatus || job.detailed_status || job.status || '—',
                job.job_owner || job.created_by || '—',
                job.isHandoverPending ? 'PENDING' : 'DONE',
                job.isRailOutPending ? 'PENDING' : 'DONE',
                job.isBillingPending ? 'PENDING' : 'DONE',
                job.drawback_scroll_no || '—',
                formatDate(job.drawback_scroll_date),
                fineAmount || 0
            ] : [
                idx + 1,
                job.job_no || job.job_number || '—',
                formatDate(job.job_date || job.be_date),
                job.branch_code || job.branch || '—',
                job.port_of_reporting || job.custom_house || job.location || '—',
                job.importer || '—',
                job.commodity || '—',
                valAmount || 0,
                job.inv_currency || 'INR',
                job.be_no || '—',
                formatDate(job.be_date),
                formatDate(job.out_of_charge),
                job.mode || 'SEA',
                job.consignment_type || 'FCL',
                cntrStr,
                ft20,
                ft40,
                totalBoxes,
                teuCount,
                job.detailed_status || job.status || '—',
                job.job_owner || '—',
                job.RMS || '—',
                job.cth_no || '—',
                job.isDetentionRisk ? 'YES (RISK)' : 'NO',
                job.isDoExpired ? 'EXPIRED' : 'VALID',
                job.isBillingPending ? 'PENDING' : 'DONE',
                job.isDeliveryPending ? 'PENDING' : 'DONE',
                fineAmount || 0
            ];

            wsDetail.addRow(rowData);
            const row = wsDetail.getRow(rowNum);
            row.height = 20;

            row.eachCell((cell, colNum) => {
                let align = 'left';
                let isNum = false;
                let fmt = null;

                if ([1, 4, 9, 10, 11, 12, 13, 14, 20, 21, 22, 23, 24, 25, 26].includes(colNum)) {
                    align = 'center';
                } else if (colNum === 2) {
                    align = 'center';
                } else if (colNum === 8 || colNum === 27 || (isExport && colNum === 28)) {
                    align = 'right';
                    isNum = true;
                    fmt = '₹#,##0.00';
                } else if ([16, 17, 18, 19].includes(colNum)) {
                    align = 'right';
                    isNum = true;
                    fmt = '#,##0';
                }

                styleDataCell(cell, isEven, align, isNum, fmt);

                if (colNum === 2) {
                    cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF2563EB' } };
                }
            });
        });

        // Detailed Totals Row
        const totDetailRowNum = 6 + detailedJobs.length;
        const totDetailRowData = isExport ? [
            'TOTAL', `${detailedJobs.length} Jobs`, '—', '—', '—', 'All Exporters', '—',
            sumDetailValue, 'INR', '—', '—', '—', '—', '—', '—',
            sumDetail20, sumDetail40, sumDetailBoxes, sumDetailTeus, '—', '—', '—', '—', '—', '—', '—',
            sumDetailFines
        ] : [
            'TOTAL', `${detailedJobs.length} Jobs`, '—', '—', '—', 'All Importers', '—',
            sumDetailValue, 'INR', '—', '—', '—', '—', '—', '—',
            sumDetail20, sumDetail40, sumDetailBoxes, sumDetailTeus, '—', '—', '—', '—', '—', '—', '—', '—',
            sumDetailFines
        ];

        wsDetail.addRow(totDetailRowData);
        const totDetailRow = wsDetail.getRow(totDetailRowNum);
        totDetailRow.height = 25;
        totDetailRow.eachCell((cell, colNum) => {
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
            cell.border = {
                top: { style: 'medium', color: { argb: 'FF0F172A' } },
                bottom: { style: 'double', color: { argb: 'FF0F172A' } }
            };
            if (colNum === 8 || colNum === totDetailRowData.length) {
                cell.alignment = { horizontal: 'right', vertical: 'middle' };
                cell.numFmt = '₹#,##0.00';
            } else if ([16, 17, 18, 19].includes(colNum)) {
                cell.alignment = { horizontal: 'right', vertical: 'middle' };
                cell.numFmt = '#,##0';
            } else {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }
        });

        autoFitColumns(wsDetail, 12, 45);

        // ══════════════════════════════════════════════════════════════════════
        // SHEET 2: EXECUTIVE SUMMARY & KPIS
        // ══════════════════════════════════════════════════════════════════════
        const wsKPI = workbook.addWorksheet('Executive KPI Summary');
        addSheetHeader({
            worksheet: wsKPI,
            title: `ALVISION EXIM — ${reportTitle.toUpperCase()} (EXECUTIVE SUMMARY)`,
            subtitle: 'HIGH-LEVEL PERFORMANCE METRICS, RUN-RATES & PROJECTIONS',
            filterMeta,
            totalCols: 6,
            lastColLetter: 'F'
        });

        const totalCleared = reportData.totalLeo || reportData.totalOoc || 0;
        const totalTeus = reportData.totalTeus || 0;
        const stats = reportData.stats || {};
        const prevStats = reportData.prevStats || {};

        wsKPI.addRow(['1. CORE OPERATIONAL KPIS', '', '', '', '', '']);
        wsKPI.mergeCells('A5:F5');
        wsKPI.getRow(5).height = 24;
        wsKPI.getRow(5).getCell(1).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };

        wsKPI.addRow(['Metric', 'Current Period', 'Previous Period', 'Growth / Delta', 'Daily Pace', 'Full Period Projected']);
        const kpiHeader = wsKPI.getRow(6);
        styleHeaderRow(kpiHeader, 'FF334155');

        const kpiRows = [
            [
                `Total ${primaryMilestone} Jobs Cleared`,
                totalCleared,
                prevStats.totalOoc || prevStats.totalLeo || 0,
                `${totalCleared - (prevStats.totalOoc || prevStats.totalLeo || 0)} (${reportData.totalGrowthPct || '0%'})`,
                `${reportData.avgDaily || 0} / day`,
                reportData.projectedTotal || totalCleared
            ],
            [
                'Total TEUs Volume',
                totalTeus,
                prevStats.totalTeus || 0,
                `${totalTeus - (prevStats.totalTeus || 0)} TEUs`,
                `${(totalTeus / Math.max(reportData.elapsedDays || 1, 1)).toFixed(1)} TEU/day`,
                Math.round((totalTeus / Math.max(reportData.elapsedDays || 1, 1)) * (reportData.totalDays || 30))
            ],
            [
                '20 FT Containers',
                stats.fcl20 || 0,
                prevStats.c20 || 0,
                `${(stats.fcl20 || 0) - (prevStats.c20 || 0)}`,
                '—',
                '—'
            ],
            [
                '40 FT Containers',
                stats.fcl40 || 0,
                prevStats.c40 || 0,
                `${(stats.fcl40 || 0) - (prevStats.c40 || 0)}`,
                '—',
                '—'
            ],
            [
                'Sea Mode Jobs',
                stats.seaJobs || 0,
                '—',
                `${totalCleared > 0 ? Math.round(((stats.seaJobs || 0) / totalCleared) * 100) : 0}% share`,
                '—',
                '—'
            ],
            [
                'Air Mode Jobs',
                stats.airJobs || 0,
                '—',
                `${totalCleared > 0 ? Math.round(((stats.airJobs || 0) / totalCleared) * 100) : 0}% share`,
                '—',
                '—'
            ]
        ];

        kpiRows.forEach((r, idx) => {
            wsKPI.addRow(r);
            const row = wsKPI.getRow(7 + idx);
            row.height = 21;
            row.eachCell((cell, colNum) => {
                styleDataCell(cell, idx % 2 === 0, colNum === 1 ? 'left' : 'center');
                if (colNum === 1) cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF1E293B' } };
            });
        });

        autoFitColumns(wsKPI, 16, 40);

        // ══════════════════════════════════════════════════════════════════════
        // SHEET 3: BRANCH PERFORMANCE & PROJECTIONS (With AutoFilter)
        // ══════════════════════════════════════════════════════════════════════
        const branchData = reportData.branchWise || [];
        const wsBranch = workbook.addWorksheet('Branch Performance', {
            views: [{ state: 'frozen', ySplit: 5 }]
        });

        const branchHeaders = [
            "Branch Name", "20 FT", "40 FT", "LCL", "Air", "TEUs", "Daily Average",
            "Projected Volume", `Total ${primaryMilestone}`
        ];

        addSheetHeader({
            worksheet: wsBranch,
            title: `ALVISION EXIM — BRANCH CLEARANCE PERFORMANCE & PROJECTIONS`,
            subtitle: `STATION-WISE CLEARANCE RUN-RATES & FULL PERIOD PROJECTIONS`,
            filterMeta,
            totalCols: branchHeaders.length,
            lastColLetter: 'I'
        });

        wsBranch.addRow(branchHeaders);
        const branchHeaderRow = wsBranch.getRow(5);
        styleHeaderRow(branchHeaderRow, 'FF4F46E5'); // Indigo

        wsBranch.autoFilter = {
            from: { row: 5, column: 1 },
            to: { row: 5 + Math.max(branchData.length, 1), column: branchHeaders.length }
        };

        branchData.forEach((b, idx) => {
            const isEven = idx % 2 === 0;
            const bAvg = reportData.elapsedDays > 0 ? Math.round((b.total / reportData.elapsedDays) * 10) / 10 : 0;
            const bProj = reportData.elapsedDays > 0 ? Math.round((b.total / reportData.elapsedDays) * (reportData.totalDays || 30)) : b.total;

            wsBranch.addRow([
                b.name || '—',
                b.c20 || 0,
                b.c40 || 0,
                b.lcl || 0,
                b.air || 0,
                b.teus || 0,
                bAvg,
                bProj,
                b.total || 0
            ]);
            const row = wsBranch.getRow(6 + idx);
            row.height = 20;
            row.eachCell((cell, colNum) => {
                const align = colNum === 1 ? 'left' : 'center';
                styleDataCell(cell, isEven, align, colNum > 1, '#,##0');
                if (colNum === 1) cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF1E293B' } };
                if (colNum === 8) cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF16A34A' } };
                if (colNum === 9) cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF4338CA' } };
            });
        });

        autoFitColumns(wsBranch, 14, 30);

        // ══════════════════════════════════════════════════════════════════════
        // SHEET 5: CUSTOMER DYNAMICS & VOLUME MOVERS (With AutoFilter)
        // ══════════════════════════════════════════════════════════════════════
        const customerData = reportData.customerWise || [];
        const wsCust = workbook.addWorksheet(`${customerLabel} Dynamics`, {
            views: [{ state: 'frozen', ySplit: 5 }]
        });

        const custHeaders = [
            `${customerLabel} Name`, `Current ${primaryMilestone}`, `Previous ${primaryMilestone}`,
            "Delta Volume", "Growth %", "20 FT", "40 FT", "Air", "TEUs"
        ];

        addSheetHeader({
            worksheet: wsCust,
            title: `ALVISION EXIM — ${customerLabel.toUpperCase()} CLEARANCE DYNAMICS & GROWTH`,
            subtitle: `VOLUME MOVERS, GAINERS/FALLERS & TEU CONTRIBUTIONS`,
            filterMeta,
            totalCols: custHeaders.length,
            lastColLetter: 'I'
        });

        wsCust.addRow(custHeaders);
        const custHeaderRow = wsCust.getRow(5);
        styleHeaderRow(custHeaderRow, 'FF0284C7'); // Light Blue

        wsCust.autoFilter = {
            from: { row: 5, column: 1 },
            to: { row: 5 + Math.max(customerData.length, 1), column: custHeaders.length }
        };

        customerData.forEach((c, idx) => {
            const isEven = idx % 2 === 0;
            wsCust.addRow([
                c.customer || '—',
                c.current || 0,
                c.prev || 0,
                c.diff || 0,
                `${c.pct || 0}%`,
                c.c20 || 0,
                c.c40 || 0,
                c.air || 0,
                c.teus || 0
            ]);
            const row = wsCust.getRow(6 + idx);
            row.height = 20;
            row.eachCell((cell, colNum) => {
                const align = colNum === 1 ? 'left' : 'center';
                styleDataCell(cell, isEven, align, [2, 3, 4, 6, 7, 8, 9].includes(colNum), '#,##0');
                if (colNum === 4) {
                    if (c.diff > 0) cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF16A34A' } };
                    else if (c.diff < 0) cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFDC2626' } };
                }
            });
        });

        autoFitColumns(wsCust, 14, 38);

        // ══════════════════════════════════════════════════════════════════════
        // SHEET 6: OPERATIONAL EXCEPTIONS QUEUE (With AutoFilter)
        // ══════════════════════════════════════════════════════════════════════
        const exceptionsData = reportData.exceptionsList || [];
        if (exceptionsData.length > 0) {
            const wsEx = workbook.addWorksheet('Operational Exceptions', {
                views: [{ state: 'frozen', ySplit: 5 }]
            });

            const exHeaders = isExport ? [
                "Job No", "S/B No.", "S/B Date", "LEO Date", "Exporter Name", "Branch",
                "Mode", "Consignment Type", "Handover Pending", "Rail Out Pending",
                "Billing Pending", "Drawback Pending", "Fine / Penalty (INR)"
            ] : [
                "Job No", "B/E No.", "B/E Date", "OOC Date", "Importer Name", "Branch",
                "Mode", "Consignment Type", "Detention Risk", "DO Expired",
                "Billing Pending", "Delivery Pending", "Fine / Penalty (INR)"
            ];

            addSheetHeader({
                worksheet: wsEx,
                title: `ALVISION EXIM — ${primaryMilestone} OPERATIONAL EXCEPTIONS QUEUE`,
                subtitle: `FLAGGED SHIPMENTS REQUIRING IMMEDIATE OPERATIONAL & FINANCIAL CLEARANCE`,
                filterMeta,
                totalCols: exHeaders.length,
                lastColLetter: 'M'
            });

            wsEx.addRow(exHeaders);
            const exHeaderRow = wsEx.getRow(5);
            styleHeaderRow(exHeaderRow, 'FFE11D48'); // Rose / Red

            wsEx.autoFilter = {
                from: { row: 5, column: 1 },
                to: { row: 5 + exceptionsData.length, column: exHeaders.length }
            };

            exceptionsData.forEach((ex, idx) => {
                const isEven = idx % 2 === 0;
                const fineVal = Number(ex.fine_amount || ex.penalty_amount || 0);

                const exRowData = isExport ? [
                    ex.job_no || ex.jobNumber || '—',
                    ex.sb_no || '—',
                    formatDate(ex.sb_date),
                    formatDate(ex.leoDate || ex.out_of_charge),
                    ex.exporter || '—',
                    ex.branch_code || '—',
                    ex.mode || 'SEA',
                    ex.consignmentType || 'FCL',
                    ex.isHandoverPending ? 'YES' : 'NO',
                    ex.isRailOutPending ? 'YES' : 'NO',
                    ex.isBillingPending ? 'YES' : 'NO',
                    ex.isDrawbackPending ? 'YES' : 'NO',
                    fineVal || 0
                ] : [
                    ex.job_no || ex.job_number || '—',
                    ex.be_no || '—',
                    formatDate(ex.be_date),
                    formatDate(ex.out_of_charge),
                    ex.importer || '—',
                    ex.branch_code || '—',
                    ex.mode || 'SEA',
                    ex.consignment_type || 'FCL',
                    ex.isDetentionRisk ? 'YES (RISK)' : 'NO',
                    ex.isDoExpired ? 'YES (EXPIRED)' : 'NO',
                    ex.isBillingPending ? 'YES' : 'NO',
                    ex.isDeliveryPending ? 'YES' : 'NO',
                    fineVal || 0
                ];

                wsEx.addRow(exRowData);
                const row = wsEx.getRow(6 + idx);
                row.height = 20;
                row.eachCell((cell, colNum) => {
                    const align = (colNum === 5) ? 'left' : (colNum === 13 ? 'right' : 'center');
                    styleDataCell(cell, isEven, align, colNum === 13, colNum === 13 ? '₹#,##0.00' : null);
                    if (colNum === 1) cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFE11D48' } };
                });
            });

            autoFitColumns(wsEx, 14, 35);
        }

        // Generate and save workbook buffer
        const buffer = await workbook.xlsx.writeBuffer();
        const dateStamp = new Date().toISOString().slice(0, 10);
        const fileName = `${reportType === 'export_leo_summary' ? 'Export_LEO' : 'Import_OOC'}_Comprehensive_Report_${dateStamp}.xlsx`;
        saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
        return true;
    } catch (err) {
        console.error('Error generating full Excel report:', err);
        throw err;
    }
};
