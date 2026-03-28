import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

// Load .env from server directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const MONGODB_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        // 1. Manually register models if they haven't been registered yet
        // Accessing model files directly to ensure schemas are loaded
        const attendanceModelDir = path.resolve(__dirname, '../routes/attendance/models');
        
        // Helper to load models from the attendance directory
        const loadModel = async (name, fileName) => {
            const filePath = path.join(attendanceModelDir, fileName);
            // Since they are likely CommonJS (judging by the .js extension and previous context)
            // but we are in ESM, we'll try to import or just define them.
            // Actually, the project seems to use a mix. Let's see the Company.js content first.
        };

        // For simplicity and robustness, I will define the schemas here to avoid interop issues with .js/.mjs
        const CompanySchema = new mongoose.Schema({
            company_name: String,
            timezone: { type: String, default: 'Asia/Kolkata' },
            attendance_config: {
                grace_in_minutes: { type: Number, default: 15 },
                full_day_threshold_hours: { type: Number, default: 8 },
                half_day_threshold_hours: { type: Number, default: 4 }
            },
            settings: {
                geo_fencing_enabled: { type: Boolean, default: false },
                ip_restriction_enabled: { type: Boolean, default: false }
            }
        }, { versionKey: false, timestamps: true });

        const ShiftSchema = new mongoose.Schema({
            name: String,
            start_time: { type: String, default: '09:00' },
            end_time: { type: String, default: '18:00' },
            weekly_off_days: { type: [Number], default: [0] } // Sunday
        }, { versionKey: false, timestamps: true });

        const DepartmentSchema = new mongoose.Schema({
            department_name: String,
            company_id: mongoose.Schema.Types.ObjectId
        }, { versionKey: false, timestamps: true });

        const Company = mongoose.models.Company || mongoose.model('Company', CompanySchema);
        const Shift = mongoose.models.Shift || mongoose.model('Shift', ShiftSchema);
        const Department = mongoose.models.Department || mongoose.model('Department', DepartmentSchema);
        
        // Load User model - assuming it's already registered via the main app, 
        // but we'll register it just in case for this standalone script.
        const UserSchema = new mongoose.Schema({}, { strict: false });
        const User = mongoose.models.User || mongoose.model('User', UserSchema);

        // --- SEEDING ---
        
        // 1. Create Default Company
        let company = await Company.findOne({ company_name: 'EXIM Global' });
        if (!company) {
            console.log('Creating default company...');
            company = new Company({
                company_name: 'EXIM Global',
                timezone: 'Asia/Kolkata',
                attendance_config: {
                    grace_in_minutes: 15,
                    full_day_threshold_hours: 8,
                    half_day_threshold_hours: 4
                }
            });
            await company.save();
            console.log('Company created:', company._id);
        } else {
            console.log('Default company already exists.');
        }

        // 2. Create Default Shift
        let shift = await Shift.findOne({ name: 'Standard Shift' });
        if (!shift) {
            console.log('Creating standard shift...');
            shift = new Shift({
                name: 'Standard Shift',
                start_time: '09:00',
                end_time: '18:00',
                weekly_off_days: [0]
            });
            await shift.save();
            console.log('Shift created:', shift._id);
        } else {
            console.log('Standard shift already exists.');
        }

        // 3. Create General Department
        let department = await Department.findOne({ department_name: 'General' });
        if (!department) {
            console.log('Creating general department...');
            department = new Department({
                department_name: 'General',
                company_id: company._id
            });
            await department.save();
            console.log('Department created:', department._id);
        } else {
            console.log('General department already exists.');
        }

        // 4. MAP USERS
        console.log('Mapping users to defaults...');
        const result = await User.updateMany(
            { $or: [ { company_id: { $exists: false } }, { company_id: null } ] },
            {
                $set: {
                    company_id: company._id,
                    shift_id: shift._id,
                    department_id: department._id,
                    current_status: 'out_office'
                }
            }
        );
        console.log(`Updated ${result.modifiedCount} users.`);

        console.log('Initialization complete.');
        process.exit(0);
    } catch (err) {
        console.error('Initialization failed:', err);
        process.exit(1);
    }
}

run();
