import mongoose from 'mongoose';
import { generateJobNumber } from './services/jobNumberService.mjs';
import BranchModel from './model/branchModel.mjs';
import JobCounterModel from './model/jobCounterModel.mjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI || 'mongodb://localhost:27017/eximNew';

async function verify() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Get a branch
        const branch = await BranchModel.findOne();
        if (!branch) {
            console.error('No branches found. Please create a branch first.');
            process.exit(1);
        }
        console.log(`Using branch: ${branch.branch_name} (${branch.branch_code})`);

        // 2. Generate a job number
        const tradeType = 'IMP';
        const mode = 'SEA';
        const financialYear = '26-27'; // Targeted year
        const targetBranchId = '69abeeae0a6647027c4a09a8'; // Targeted branch

        console.log('Generating job number for target case...');
        const result = await generateJobNumber({
            branch_id: targetBranchId,
            trade_type: tradeType,
            mode: mode,
            financial_year: financialYear
        });

        console.log('Generated Result:', result);

        const expectedFormat = new RegExp(`^${branch.branch_code}/${tradeType}/${mode}/\\d{5}/${financialYear}$`);
        if (expectedFormat.test(result.job_number)) {
            console.log('✅ Job number format is correct');
        } else {
            console.error('❌ Job number format is INCORRECT');
        }

        // 3. Verify sequence increment
        console.log('Generating second job number...');
        const result2 = await generateJobNumber({
            branch_id: branch._id,
            trade_type: tradeType,
            mode: mode,
            financial_year: financialYear
        });
        console.log('Second Generated Result:', result2);

        if (result2.sequence_number === result.sequence_number + 1) {
            console.log('✅ Sequence incremented correctly');
        } else {
            console.error('❌ Sequence increment FAILED');
        }

        // 4. Test concurrency (simple)
        console.log('Testing concurrency with 5 parallel requests...');
        const results = await Promise.all([
            generateJobNumber({ branch_id: branch._id, trade_type: tradeType, mode: mode, financial_year: financialYear }),
            generateJobNumber({ branch_id: branch._id, trade_type: tradeType, mode: mode, financial_year: financialYear }),
            generateJobNumber({ branch_id: branch._id, trade_type: tradeType, mode: mode, financial_year: financialYear }),
            generateJobNumber({ branch_id: branch._id, trade_type: tradeType, mode: mode, financial_year: financialYear }),
            generateJobNumber({ branch_id: branch._id, trade_type: tradeType, mode: mode, financial_year: financialYear }),
        ]);

        const sequences = results.map(r => r.sequence_number).sort((a, b) => a - b);
        const uniqueSequences = new Set(sequences);

        if (uniqueSequences.size === 5) {
            console.log('✅ Concurrency test passed: All sequences are unique');
            console.log('Sequences:', sequences);
        } else {
            console.error('❌ Concurrency test FAILED: Non-unique sequences found');
        }

        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

verify();
