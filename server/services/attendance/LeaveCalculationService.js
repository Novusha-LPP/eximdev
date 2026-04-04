import moment from 'moment';
import WorkingDayEngine from './WorkingDayEngine.js';

class LeaveCalculationService {
    /**
     * Calculates the total days to be deducted for a leave request.
     * Considers: Weekly Offs, Holidays, and the Sandwich Rule.
     * 
     * @param {Object} params 
     * @param {moment} params.fromDate
     * @param {moment} params.toDate
     * @param {boolean} params.isHalfDay
     * @param {Object} params.policy - The LeavePolicy object
     * @param {Object} params.company - The Company object
     * @param {Object} params.shift - The Shift object (optional)
     * @returns {Promise<Object>} { totalDays, appliedDays, sandwichDays, details }
     */
    static async calculateLeaveDays({ fromDate, toDate, isHalfDay, policy, company, shift }) {
        const start = moment(fromDate).startOf('day');
        const end = moment(toDate).startOf('day');
        
        if (isHalfDay) {
            return {
                totalDays: 0.5,
                appliedDays: 0.5,
                sandwichDays: 0,
                details: [{ date: start.format('YYYY-MM-DD'), type: 'half_day', count: 0.5 }]
            };
        }

        const details = [];
        let appliedDays = 0;
        let sandwichDays = 0;

        // Configuration from policy
        const sandwichApplicable = policy.sandwich_applicable || false;
        
        let curr = moment(start);
        while (curr.isSameOrBefore(end, 'day')) {
            const isOff = WorkingDayEngine.isWeeklyOff(curr, company, shift);
            const holiday = await WorkingDayEngine.getHoliday(curr, company._id || company);
            const dateStr = curr.format('YYYY-MM-DD');

            if (isOff || holiday) {
                if (sandwichApplicable) {
                    // In a sandwich-enabled policy, holidays/offs inside the range ARE counted as leave
                    sandwichDays++;
                    details.push({ date: dateStr, type: isOff ? 'weekly_off' : 'holiday', count: 1, sandwiched: true });
                } else {
                    // Standard: holidays/offs are skipped
                    details.push({ date: dateStr, type: isOff ? 'weekly_off' : 'holiday', count: 0, sandwiched: false });
                }
            } else {
                appliedDays++;
                details.push({ date: dateStr, type: 'working_day', count: 1 });
            }
            curr.add(1, 'day');
        }

        return {
            totalDays: appliedDays + sandwichDays,
            appliedDays,
            sandwichDays,
            details
        };
    }

    /**
     * Enhanced Sandwich Rule: Checks if the leave is adjacent to holidays/offs 
     * and extends the range if the policy defines it that way.
     * (Currently, the simple range-based sandwich is implemented above).
     */
}

export default LeaveCalculationService;
