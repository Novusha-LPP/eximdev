# AlVision Exim Client Application

## Description

AlVision Exim is a comprehensive application designed to streamline export-import business processes, replacing manual Excel sheet management with a robust online system. This application supports various operations, such as automatic data ingestion from email attachments, manual data entry, dynamic report generation, and real-time updates on import and export consignments.

## Features

- **Admin Accounts**: Creation of two initial admin accounts with capabilities to onboard new employees and manage their access to different modules.
- **Employee Management**: Admins can onboard new employees by providing details such as name, email, company, and designation. Employees receive credentials via email and can subsequently complete their profiles.
- **Module-Based Access**: Specific modules can be assigned to or removed from employees by admins. Employees will have access only to the modules assigned to them.
- **Data Handling**: Supports uploading and parsing of Excel sheets manually or from email attachments.
- **Interactive Dashboards**: Visualization of operational data such as job statuses and detailed reports for specific importers using React-ApexCharts and MUI Data Grid.
- **Document Management**: Ability to upload and manage documents via AWS S3.

## Modules

1. **Import Daily Status Report (DSR)**

   - **Functionality**: Upload Excel sheets manually or automatically process them from email attachments. Update and manage data as required.
   - **DSR Dashboard**: Features a selection tag to choose the financial year for displaying data, defaulting to the current year. Displays total, completed, pending, and cancelled jobs. After selecting an importer, their specific job stats are shown in a donut chart.
   - **Importer Selection**: Another tab allows selection of an importer to display a list of all jobs with the selected status, presented in tables using MUI DataGrid.
   - **Document Upload**: Key documents are uploaded to AWS S3 (bucket: exim-images-p1, region: ap-south-1).
   - **Navigation**: Links within data tables navigate to detailed DSR pages.
   - **Excel Operations**: On the dashboard, a button is provided to upload Excel sheets, converting them to JSON and saving the data in the backend database.
   - **Jobs Tab**: Features a button to download the DSR for the selected importer and status.

2. Import Delivery Order (DO)
3. Import Operations
4. Employee Onboarding
5. Employee KYC
6. Exit Feedback
7. Accounts
8. Customer KYC
9. Inward Register
10. Outward Register
11. LR Operations
12. Tyre maintenance

## Installation

To set up the AlVision Exim client application, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   ```
2. **Install the dependencies:**
   ```bash
   npm install
   ```
3. **Start the application:**
   ```bash
   npm start
   ```
4. **To build the application for production, use:**
   ```bash
   npm run build
   ```

## Usage

- Start the application using the `npm start` command to launch the development server.
- Use the `electron-dev` script for developing with Electron in a local environment.

## Additional Notes

- Ensure that all environment variables and system prerequisites (like Node.js, npm, and Electron) are correctly set up before installing and running the application.
- Configuration details for AWS S3 should be securely stored and managed via environment variables or configuration files.
