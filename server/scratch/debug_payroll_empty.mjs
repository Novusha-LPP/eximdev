import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
    try {
        const uri = process.env.PROD_MONGODB_URI || 'mongodb://localhost:27017/eximdev';
        console.log('Connecting to:', uri);
        await mongoose.connect(uri);
        
        const companyId = '69cd1e3b50e6c73acc73a918';
        
        // Check Company
        const Company = mongoose.model('Company', new mongoose.Schema({}, { strict: false }), 'companies');
        const company = await Company.findById(companyId);
        console.log('Company:', company ? company.company_name : 'NOT FOUND');

        // Check Users
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
        const allUsersCount = await User.countDocuments({ company_id: new mongoose.Types.ObjectId(companyId) });
        console.log('Total users in company:', allUsersCount);

        const activeEmployees = await User.find({ 
            company_id: new mongoose.Types.ObjectId(companyId), 
            role: 'EMPLOYEE', 
            isActive: true 
        }).select('username role isActive');
        
        console.log('Active Employees found:', activeEmployees.length);
        if (activeEmployees.length > 0) {
            console.log('First 5:', activeEmployees.slice(0, 5).map(u => u.username));
        } else {
            // Check for case sensitivity or other roles
            const roles = await User.distinct('role', { company_id: new mongoose.Types.ObjectId(companyId) });
            console.log('Available roles in this company:', roles);
            
            const inactive = await User.countDocuments({ company_id: new mongoose.Types.ObjectId(companyId), role: 'EMPLOYEE', isActive: false });
            console.log('Inactive Employees:', inactive);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}
check();
