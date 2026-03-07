import JobCounterModel from "../model/jobCounterModel.mjs";
import BranchModel from "../model/branchModel.mjs";
import JobModel from "../model/jobModel.mjs";

export const generateJobNumber = async ({ branch_id, trade_type, mode, financial_year }) => {
    // 1. Get branch code
    const branch = await BranchModel.findById(branch_id);
    if (!branch) {
        throw new Error("Branch not found");
    }
    const branch_code = branch.branch_code;

    // 2. Atomic increment of sequence
    // We use a specific counter for the branch, year, trade_type, and mode
    let counter = await JobCounterModel.findOneAndUpdate(
        { branch_id, financial_year, trade_type, mode },
        { $inc: { last_sequence: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    let sequence = counter.last_sequence;
    let paddedSequence = sequence.toString().padStart(5, '0');

    // 3. Self-healing Sync Logic:
    let existingJob = await JobModel.findOne({
        branch_id,
        year: financial_year,
        trade_type,
        mode,
        $or: [
            { sequence_number: sequence },
            { job_no: paddedSequence }
        ]
    }).lean();

    if (existingJob) {
        console.log(`⚠️ Sequence desync detected for branch ${branch_code}, year ${financial_year}, mode ${mode}. Syncing...`);
        const allJobs = await JobModel.find({ branch_id, year: financial_year, trade_type, mode }, { sequence_number: 1, job_no: 1 }).lean();

        console.log(`[JobNumService] Found ${allJobs.length} existing jobs for branch_id ${branch_id}, year ${financial_year}, mode ${mode}`);

        let maxSeq = 0;
        allJobs.forEach(j => {
            if (j.sequence_number && j.sequence_number > maxSeq) maxSeq = j.sequence_number;
            const parsedJobNo = parseInt(j.job_no, 10);
            if (!isNaN(parsedJobNo) && parsedJobNo > maxSeq) maxSeq = parsedJobNo;
        });

        sequence = maxSeq + 1;
        paddedSequence = sequence.toString().padStart(5, '0'); // CRITICAL: RE-PADDING
        console.log(`[JobNumService] Synced sequence to: ${sequence} (padded: ${paddedSequence})`);

        // Update the counter to this new max value
        await JobCounterModel.findOneAndUpdate(
            { branch_id, financial_year, trade_type, mode },
            { $set: { last_sequence: sequence } }
        );
    }

    // 4. Generate structured job number
    // Format: BRANCH_CODE / TRADE_TYPE / MODE / SEQUENCE / FINANCIAL_YEAR
    const job_number = `${branch_code}/${trade_type}/${mode}/${paddedSequence}/${financial_year}`;

    return {
        job_number,
        branch_code,
        sequence_number: sequence,
        job_no: paddedSequence // Return this explicitly to ensure consistency
    };
};
