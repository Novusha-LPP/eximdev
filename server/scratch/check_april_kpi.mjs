import mongoose from 'mongoose';
import KPISheet from '../model/kpi/kpiSheetModel.mjs';
import UserModel from '../model/userModel.mjs';
import KPITemplate from '../model/kpi/kpiTemplateModel.mjs';
import dotenv from 'dotenv';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.DEV_MONGODB_URI || process.env.SERVER_MONGODB_URI;

async function generateReport() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to DB");

        const year = 2026;
        const month = 4; // April

        const sheets = await KPISheet.find({ year, month })
            .populate('user', 'first_name last_name email department')
            .populate('template_version', 'name');

        console.log(`Found ${sheets.length} sheets for ${month}/${year}`);

        if (sheets.length === 0) {
            console.log("No sheets found for the specified period.");
            await mongoose.disconnect();
            return;
        }

        const summaryData = [];
        const detailedData = [];

        // Sort sheets by employee name
        sheets.sort((a, b) => {
            const nameA = a.user ? `${a.user.first_name} ${a.user.last_name || ''}`.toLowerCase() : '';
            const nameB = b.user ? `${b.user.first_name} ${b.user.last_name || ''}`.toLowerCase() : '';
            return nameA.localeCompare(nameB);
        });

        sheets.forEach(sheet => {
            const userName = sheet.user ? `${sheet.user.first_name} ${sheet.user.last_name || ''}` : 'Unknown';
            const userEmail = sheet.user?.email || 'N/A';
            const department = sheet.department || sheet.user?.department || 'N/A';
            const status = sheet.status;
            
            // Metrics from summary object
            const overallPercentage = sheet.summary?.overall_percentage || 0;
            const totalValueScore = sheet.summary?.total_value_score || 0;
            const averageComplexity = sheet.summary?.average_complexity || 0;
            const totalQuantity = sheet.summary?.total_quantity || 0;
            const quadrant = sheet.summary?.performance_quadrant || 'N/A';

            // Add to Summary Data
            summaryData.push({
                'Employee Name': userName,
                'Email': userEmail,
                'Department': department,
                'Total Quantity': totalQuantity,
                'Total Value Score': totalValueScore,
                'Avg Complexity': averageComplexity,
                'Overall %': overallPercentage,
                'Performance Quadrant': quadrant,
                'Status': status
            });

            // Add to Detailed Data
            if (sheet.rows && sheet.rows.length > 0) {
                sheet.rows.forEach((row, index) => {
                    detailedData.push({
                        'Employee Name': index === 0 ? userName : '',
                        'Email': index === 0 ? userEmail : '',
                        'Department': index === 0 ? department : '',
                        'KPI Label': row.label,
                        'Weight': row.weight || 3,
                        'Achieved Total': row.total || 0,
                        'Score': (row.total || 0) * (row.weight || 3),
                        'Status': status
                    });
                });
            }
        });

        const workbook = xlsx.utils.book_new();
        
        // Summary Sheet
        const summarySheet = xlsx.utils.json_to_sheet(summaryData);
        const summaryCols = [
            { wch: 25 }, // Employee Name
            { wch: 30 }, // Email
            { wch: 20 }, // Department
            { wch: 15 }, // Total Quantity
            { wch: 15 }, // Total Value Score
            { wch: 15 }, // Avg Complexity
            { wch: 12 }, // Overall %
            { wch: 20 }, // Performance Quadrant
            { wch: 15 }  // Status
        ];
        summarySheet['!cols'] = summaryCols;
        xlsx.utils.book_append_sheet(workbook, summarySheet, 'User Summary');

        // Detailed Sheet
        const detailedSheet = xlsx.utils.json_to_sheet(detailedData);
        const detailedCols = [
            { wch: 25 }, // Employee Name
            { wch: 30 }, // Email
            { wch: 20 }, // Department
            { wch: 30 }, // KPI Label
            { wch: 10 }, // Weight
            { wch: 15 }, // Achieved Total
            { wch: 15 }, // Score
            { wch: 15 }  // Status
        ];
        detailedSheet['!cols'] = detailedCols;
        xlsx.utils.book_append_sheet(workbook, detailedSheet, 'KPI Details');

        const outputPath = path.join(__dirname, '..', `KPI_Clean_Grouped_April_2026_${Date.now()}.xlsx`);
        xlsx.writeFile(workbook, outputPath);

        console.log(`Excel report generated successfully at: ${outputPath}`);

        await mongoose.disconnect();
    } catch (err) {
        console.error("Error generating report:", err);
    }
}

generateReport();
