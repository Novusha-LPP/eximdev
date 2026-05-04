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
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
        
        const query = { 
            company_id: new mongoose.Types.ObjectId(companyId), 
            role: { $nin: ['ADMIN', 'Admin'] }, 
            isActive: true 
        };
        
        const employees = await User.find(query).select('username role isActive first_name last_name');
        console.log('Query:', JSON.stringify(query));
        console.log('Employees found with $nin logic:', employees.length);
        if (employees.length > 0) {
            console.log('Sample:', employees.slice(0, 5).map(u => u.username));
        }

        // Check if company_id is stored as string in some docs?
        const stringQuery = { 
            company_id: companyId, 
            role: { $nin: ['ADMIN', 'Admin'] }, 
            isActive: true 
        };
        const employeesStr = await User.find(stringQuery);
        console.log('Employees found with string ID:', employeesStr.length);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}
check();
