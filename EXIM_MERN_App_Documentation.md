
# Export-Import Business & Office Administration (EXIM) MERN App

## Project Overview

The EXIM MERN application is designed to streamline operations related to the export-import business and manage various office administration tasks. The system is modular, with each module handling specific aspects of the business, such as import, export, administration, and document management.

### Key Features

- **Employee Management:** HR can add new employees, who then receive credentials via email. Employees can complete their onboarding and KYC processes through dedicated modules.
- **Modular Functionality:** Admins can assign specific modules to employees, granting them access to relevant areas of the application.
- **Document Management:** Upload, manage, and download essential business documents within each module.
- **Role-Based Access:** Certain actions, like uploading data or managing jobs, are restricted to admin users.

## Modules Overview

The application is divided into several broad categories, each containing specific modules:

### 1. **Import Modules**
   - **DSR (Detailed Status Report):**
     - Admins can upload an Excel sheet containing job details.
     - The uploaded data displays a list of jobs, which can be navigated and updated.
     - Options are available to download the DSR for a selected importer or for all importers at once.
   - **e-Sanchit:** Manage and store import-related documentation electronically.
   - **Documentation:** Upload and organize documents related to import operations.
   - **Submission:** Submit required documents to regulatory bodies.
   - **DO (Delivery Order):** Handle delivery orders for imported goods.
   - **Operations:** Manage the operational aspects of the import process.

### 2. **Export Modules**
   - **Export Operations:** Handle export-specific operations and documentation.
   - **Export Documentation:** Manage documents related to export activities.

### 3. **Admin Modules**
   - **Employee Onboarding:** HR fills in basic employee details, and the employee completes the onboarding process.
   - **Employee KYC:** Employees provide their KYC details.
   - **Module Assignment:** Admins assign specific modules to employees.

### 4. **Inward and Outward Register**
   - **Inward Register:** Log and manage inward shipments.
   - **Outward Register:** Log and manage outward shipments.

### 5. **SRCC (Special Risks Coverage Certificate)**
   - **SRCC Directories:** Manage directories related to SRCC operations.

## Installation and Setup

### Prerequisites

Ensure you have the following installed:

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Clone the Repository

git clone https://github.com/ysam020/exim-new.git
cd exim-new

### Install Dependencies

#### For the Backend:

cd server
npm install

#### For the Frontend:

cd client
npm install

### Environment Variables

Create a `.env` file in the `server` directory and add the required environment variables:
env
PORT=5000
MONGO_URI=your_mongo_db_uri
JWT_SECRET=your_jwt_secret
EMAIL_SERVICE_API_KEY=your_email_service_api_key
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

### Run the Application

#### Backend:

cd server
npm start

#### Frontend:

cd client
npm start

The application should now be running at `http://localhost:3000`.

## Deployment

### Server Deployment on AWS EC2

1. Connect to your EC2 instance:

ssh -i "your-key.pem" ec2-user@your-ec2-ip-address

2. Remove any existing workspace directory:

sudo rm -rf /home/ec2-user/workspace

3. Create a new workspace directory:

cd /home/ec2-user/
mkdir workspace && cd workspace

4. Clone the repository:

git clone 'https://github.com/ysam020/exim-new.git'

5. Navigate to the server directory:

cd exim-new/server

6. Install dependencies:

npm install

7. Configure environment variables:

sudo nano .env

8. Start the server using PM2:

pm2 start ecosystem.config.json

### Client Deployment on AWS S3

1. Build the React application:

cd client
npm run build

2. Deploy the build files to your S3 bucket.

## Challenges and Notes

- **Project Evolution:** The project has undergone several fundamental changes as it grew, leading to some uncertainties in documentation. Future updates may require additional documentation as new features or modules are added.
- **Lack of Initial Documentation:** The project started without proper initial documentation, making it difficult to create a comprehensive guide for future development.

## Dependencies

The project relies on the following major dependencies:

### Backend

- Express.js
- Mongoose (MongoDB ODM)
- JWT (JSON Web Tokens for authentication)
- AWS SDK (for S3 integration)
- Refer package.json for more

### Frontend

- React.js
- Axios (for API calls)
- React Router (for routing)
- Refer package.json for more

### DevOps

- AWS S3 (for static asset hosting)
- AWS EC2 (for backend hosting)

