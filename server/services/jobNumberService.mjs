import JobCounterModel from "../model/jobCounterModel.mjs";
import BranchModel from "../model/branchModel.mjs";

export const generateJobNumber = async ({ branch_id, trade_type, mode, financial_year }) => {
    // 1. Get branch code
    const branch = await BranchModel.findById(branch_id);
    if (!branch) {
        throw new Error("Branch not found");
    }
    const branch_code = branch.branch_code;

    // 2. Atomic increment of sequence
    const counter = await JobCounterModel.findOneAndUpdate(
        { branch_id, trade_type, mode, financial_year },
        { $inc: { last_sequence: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const sequence = counter.last_sequence;
    const paddedSequence = sequence.toString().padStart(5, '0');

    // 3. Generate structured job number
    // Format: BRANCH_CODE / TRADE_TYPE / MODE / SEQUENCE / FINANCIAL_YEAR
    const job_number = `${branch_code}/${trade_type}/${mode}/${paddedSequence}/${financial_year}`;

    return {
        job_number,
        branch_code,
        sequence_number: sequence
    };
};
