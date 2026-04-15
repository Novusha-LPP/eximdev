import mongoose from 'mongoose';
import { getBalance } from '../controllers/attendance/leave.controller.js';

async function test() {
    try {
        await mongoose.connect('mongodb://localhost:27017/exim');
        const req = {
            user: { _id: '6672a2501aa931b68b091fa9', role: 'ADMIN' },
            query: { employee_id: '6672a2501aa931b68b091fa9' }
        };
        const res = {
            json: (data) => {
                console.log('Balance result:');
                data.data.forEach(d => {
                    console.log(`${d.name} (${d._id}): Available=${d.available}, Pending=${d.pending}`);
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
