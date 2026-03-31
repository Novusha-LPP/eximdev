
import mongoose from 'mongoose';
import './model/userModel.mjs';


const uri = 'mongodb://localhost:27017/exim';

async function reproduce() {
    await mongoose.connect(uri);
    const User = mongoose.model('User');
    
    // Exact query from controller
    const companyId = "69cbc481d44c495e5ef54678";
    const userQuery = {
        company_id: companyId, // Express handles query params as strings. Mongoose usually casts them to ObjectId if the schema says so.
        isActive: true
    };
    
    const employees = await User.find(userQuery);
    console.log(`Querying for string company_id: Found ${employees.length}`);
    
    const employeesManual = await User.find({
        company_id: new mongoose.Types.ObjectId(companyId),
        isActive: true
    });
    console.log(`Querying for ObjectId company_id: Found ${employeesManual.length}`);

    await mongoose.disconnect();
}

reproduce();
