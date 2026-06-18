import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../model/userModel.mjs';
import TeamModel from '../model/teamModel.mjs';
import EmployeePayrollConfig from '../model/attendance/EmployeePayrollConfig.js';
import { getEmployeePayrollConfig, updateEmployeePayrollConfig } from '../controllers/attendance/payroll.controller.js';

dotenv.config({ path: './server/.env' });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB...');

    // Get Ajith (HOD)
    const ajith = await User.findOne({ username: 'ajith_sivadasan' });
    // Get Afzal (another user in Ajith's team, RABS)
    const afzal = await User.findOne({ username: 'afzal_ghanchi' });
    // Find some user NOT in RABS team
    const allTeams = await TeamModel.find({ isActive: { $ne: false } }).lean();
    const rabsTeam = allTeams.find(t => t.name === 'RABS' || t.hodUsername === 'ajith_sivadasan');
    
    let outsider = null;
    for (const team of allTeams) {
      if (rabsTeam && team._id.toString() !== rabsTeam._id.toString()) {
        const outsideMember = team.members?.find(m => m.username && m.username !== 'ajith_sivadasan' && m.username !== 'afzal_ghanchi');
        if (outsideMember) {
          outsider = await User.findOne({ username: outsideMember.username });
          if (outsider) break;
        }
      }
    }

    if (!outsider) {
      // fallback to some user
      outsider = await User.findOne({ username: { $nin: ['ajith_sivadasan', 'afzal_ghanchi'] } });
    }

    console.log('Test Users resolved:');
    console.log('  HOD (Ajith):', ajith?.username);
    console.log('  Team Member (Afzal):', afzal?.username);
    console.log('  Outsider:', outsider?.username);

    // Mock Express Response
    const mockRes = () => {
      const res = {
        statusCode: 200,
        status: function(code) {
          this.statusCode = code;
          return this;
        },
        json: function(data) {
          this.data = data;
          return this;
        }
      };
      return res;
    };

    console.log('\n--- 1. Testing HOD viewing own team member config (should succeed) ---');
    if (ajith && afzal) {
      const req = {
        user: ajith,
        params: { employeeId: afzal._id.toString() }
      };
      const res = mockRes();
      await getEmployeePayrollConfig(req, res);
      console.log('  Response code:', res.statusCode);
      console.log('  Response success:', res.data?.success);
    }

    console.log('\n--- 2. Testing HOD viewing outsider config (should be forbidden 403) ---');
    if (ajith && outsider) {
      const req = {
        user: ajith,
        params: { employeeId: outsider._id.toString() }
      };
      const res = mockRes();
      await getEmployeePayrollConfig(req, res);
      console.log('  Response code:', res.statusCode);
      console.log('  Response message:', res.data?.message);
    }

    console.log('\n--- 3. Testing HOD updating own team member config (should succeed) ---');
    if (ajith && afzal) {
      const req = {
        user: ajith,
        params: { employeeId: afzal._id.toString() },
        body: {
          company_id: afzal.company_id?.toString() || rabsTeam?.company_id?.toString() || '6672a2501aa931b68b091fb6',
          is_operator: true,
          payroll_type: 'DAILY_WAGE',
          daily_wage: 900,
          overtime_rate_per_hour: 120,
          effective_from: new Date().toISOString(),
          revision_reason: 'Testing HOD updates'
        }
      };
      const res = mockRes();
      await updateEmployeePayrollConfig(req, res);
      console.log('  Response code:', res.statusCode);
      console.log('  Response message:', res.data?.message);
      console.log('  Saved data:', res.data?.data);
    }

    console.log('\n--- 4. Testing HOD updating outsider config (should be forbidden 403) ---');
    if (ajith && outsider) {
      const req = {
        user: ajith,
        params: { employeeId: outsider._id.toString() },
        body: {
          company_id: outsider.company_id?.toString() || '6672a2501aa931b68b091fb6',
          is_operator: false,
          monthly_salary: 50000,
          effective_from: new Date().toISOString()
        }
      };
      const res = mockRes();
      await updateEmployeePayrollConfig(req, res);
      console.log('  Response code:', res.statusCode);
      console.log('  Response message:', res.data?.message);
    }

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await mongoose.connection.close();
    console.log('DB connection closed.');
  }
}

run();
