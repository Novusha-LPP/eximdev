import mongoose from 'mongoose';
import { getBalance } from '../controllers/attendance/leave.controller.js';

import UserModel from '../model/userModel.mjs';

async function test() {
    try {
        await mongoose.connect('mongodb://localhost:27017/exim');
        const afzal = await UserModel.findOne({ username: 'afzal_ghanchi' });
        if (!afzal) {
            console.error('Afzal not found');
            process.exit(1);
        }
        const req = {
            user: afzal,
            query: { employee_id: String(afzal._id) }
        };
        const res = {
            json: (data) => {
                console.log('Balance result:');
                data.data.forEach(d => {
                    console.log(`${d.name} (${d._id}) [Type: ${d.leave_type}]: Available=${d.available}, Pending=${d.pending}, Used=${d.used}`);
                });
                process.exit(0);
            },
            status: (code) => ({ json: (err) => { console.error(code, err); process.exit(1); } })
        };
        await getBalance(req, res);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
test();
