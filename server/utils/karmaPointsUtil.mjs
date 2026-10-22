/**
 * Shared utility for karma point calculations based on task priority.
 * Standard scale: P1/Emergency/Critical = 20, P2/High = 15, P3/Medium = 10, P4/Low = 5.
 */
export const getKarmaPriorityPoints = (priority) => {
    const p = String(priority || '').trim().toLowerCase();
    if (['p1', 'emergency', 'critical'].includes(p)) return 20;
    if (['p2', 'high'].includes(p)) return 15;
    if (['p3', 'medium'].includes(p)) return 10;
    if (['p4', 'low'].includes(p)) return 5;
    return 5;
};

/**
 * Checks if a task should be penalized as delayed/overdue.
 * - If status is Green, Yellow, or Orange: never penalized.
 * - If status is Red: penalized if target_date has passed or is missing.
 * - A task with a future target_date is NOT penalized.
 */
export const isPointDelayedOrOverdue = (point, asOfDate = new Date()) => {
    if (!point) return false;
    if (point.status === 'Green' || point.status === 'Yellow' || point.status === 'Orange') {
        return false;
    }
    if (point.target_date) {
        const target = new Date(point.target_date);
        if (!isNaN(target.getTime()) && target > asOfDate) {
            return false;
        }
    }
    return true;
};

export default getKarmaPriorityPoints;

