import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MRMItem = mongoose.model('MRMItem', new mongoose.Schema({
    seq: Number,
    month: String,
    processDescription: String,
    createdBy: mongoose.Schema.Types.ObjectId
}, { collection: 'mrmitems' }));

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/exim');
        console.log("Connected to MongoDB");
        
        const items = await MRMItem.find({ year: 2026 });
        const summary = items.map(i => `M: ${i.month} | Seq: ${i.seq} | Desc: ${i.processDescription?.substring(0, 20)}`);
        console.log(summary.join('\n'));
        
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
