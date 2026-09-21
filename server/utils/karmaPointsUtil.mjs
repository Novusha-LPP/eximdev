/**
 * Shared utility for karma point calculations based on task priority.
 * Standard scale: P1/Emergency/Critical = 20, P2/High = 15, P3/Medium = 10, P4/Low = 5.
 */
export const getKarmaPriorityPoints = (priority) => {
    const p = String(priority || '').trim();
    if (['P1', 'Emergency', 'Critical'].includes(p)) return 20;
    if (['P2', 'High'].includes(p)) return 15;
    if (['P3', 'Medium'].includes(p)) return 10;
    if (['P4', 'Low'].includes(p)) return 5;
    return 10;
};

export default getKarmaPriorityPoints;
