import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchProjectPoints, fetchProjectDetails } from '../../../services/openPointsService';
import moment from 'moment';

const getKarmaForTask = (task) => {
    const p = task.priority || 'Medium';
    if (['P1', 'Emergency', 'Critical'].includes(p)) return 10;
    if (['P2', 'High'].includes(p)) return 5;
    if (['P3', 'Medium'].includes(p)) return 3;
    if (['P4', 'Low'].includes(p)) return 1;
    return 3;
};

const MonthDashboard = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [points, setPoints] = useState([]);
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const now = moment();
    const currentYear = now.year();
    const currentMonthNum = now.month() + 1;

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonthNum);

    const availableYears = useMemo(() => {
        const yearsSet = new Set([currentYear]);
        points.forEach(p => {
            if (p.completion_date) {
                const y = moment(p.completion_date).year();
                if (y <= currentYear) yearsSet.add(y);
            }
            if (p.target_date) {
                const y = moment(p.target_date).year();
                if (y <= currentYear) yearsSet.add(y);
            }
        });
        return Array.from(yearsSet).sort((a, b) => b - a);
    }, [points, currentYear]);

    const allMonths = moment.months().map((m, i) => ({ val: i + 1, label: m }));

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [projectData, pointsData] = await Promise.all([
                    fetchProjectDetails(projectId),
                    fetchProjectPoints(projectId)
                ]);
                setProject(projectData);
                setPoints(pointsData);
            } catch (err) {
                console.error("Error loading month dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [projectId]);

    const processedData = useMemo(() => {
        if (!points.length) return null;

        const now = moment();
        let startOfMonth, endOfMonth;
        const isAllTime = selectedYear === 'allTime';
        const timeFilterStr = isAllTime ? 'allTime' : `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
        
        if (isAllTime) {
            startOfMonth = now.clone().startOf('month');
            endOfMonth = now.clone().endOf('month');
        } else {
            startOfMonth = moment(timeFilterStr, 'YYYY-MM').startOf('month');
            endOfMonth = moment(timeFilterStr, 'YYYY-MM').endOf('month');
        }

        const lastWeekStart = now.clone().subtract(7, 'days');

        const currentMonthTasks = [];
        const lastWeekCompleted = [];

        const devMap = {};
        let totalGreen = 0, totalYellow = 0, totalRed = 0, totalHold = 0;
        let totalKarmaPossible = 0;
        let totalKarmaEarned = 0;

        const getDev = (task) => {
            if (task.responsibility) return task.responsibility;
            if (task.responsible_person && task.responsible_person.username) return task.responsible_person.username;
            return 'Unassigned';
        };

        points.forEach(p => {
            const completedMoment = p.completion_date ? moment(p.completion_date) : null;
            const targetMoment = p.target_date ? moment(p.target_date) : null;

            let inCurrentMonth = false;

            if (p.status === 'Green') {
                const effectiveCompletedMoment = completedMoment || targetMoment || moment();
                if (effectiveCompletedMoment && effectiveCompletedMoment.isBetween(startOfMonth, endOfMonth, 'day', '[]')) {
                    inCurrentMonth = true;
                }
                if (effectiveCompletedMoment && effectiveCompletedMoment.isBetween(lastWeekStart, now, 'day', '[]')) {
                    lastWeekCompleted.push(p);
                }
            } else {
                if (targetMoment && targetMoment.isBetween(startOfMonth, endOfMonth, 'day', '[]')) {
                    inCurrentMonth = true;
                }
            }

            if (isAllTime) {
                inCurrentMonth = true;
            }

            if (inCurrentMonth) {
                currentMonthTasks.push(p);
                const dev = getDev(p);
                if (!devMap[dev]) devMap[dev] = { name: dev, total: 0, green: 0, yellow: 0, red: 0, hold: 0, karmaEarned: 0, karmaTotal: 0 };
                
                const karma = getKarmaForTask(p);
                devMap[dev].total++;
                devMap[dev].karmaTotal += karma;
                totalKarmaPossible += karma;

                if (p.status === 'Green') { 
                    devMap[dev].green++; totalGreen++; 
                    devMap[dev].karmaEarned += karma;
                    totalKarmaEarned += karma;
                }
                else if (p.status === 'Yellow' || p.status === 'Orange') { devMap[dev].yellow++; totalYellow++; }
                else if (p.status === 'Red') { devMap[dev].red++; totalRed++; }
                else { devMap[dev].hold++; totalHold++; }
            }
        });

        const devs = Object.values(devMap).sort((a, b) => b.total - a.total);
        let highestDelay = null;
        let maxRed = 0;
        devs.forEach(d => {
            if (d.red > maxRed) {
                maxRed = d.red;
                highestDelay = d;
            }
        });

        const totalTasks = currentMonthTasks.length;
        
        let dateStr = now.format('DD-MMM-YYYY');
        if (isAllTime) dateStr = 'All Time';
        else {
            const filterMoment = moment(timeFilterStr, 'YYYY-MM');
            if (filterMoment.isSame(now, 'month') && filterMoment.isSame(now, 'year')) {
                dateStr = now.format('DD-MMM-YYYY');
            } else {
                dateStr = filterMoment.endOf('month').format('DD-MMM-YYYY');
            }
        }

        return {
            dateStr,
            totalTasks,
            totalGreen, totalYellow, totalRed, totalHold,
            pctGreen: totalTasks ? (totalGreen / totalTasks * 100).toFixed(1) : 0,
            pctYellow: totalTasks ? (totalYellow / totalTasks * 100).toFixed(1) : 0,
            pctRed: totalTasks ? (totalRed / totalTasks * 100).toFixed(1) : 0,
            pctHold: totalTasks ? (totalHold / totalTasks * 100).toFixed(1) : 0,
            totalKarmaPossible, totalKarmaEarned,
            pctKarma: totalKarmaPossible ? (totalKarmaEarned / totalKarmaPossible * 100).toFixed(1) : 0,
            highestDelay,
            devs,
            lastWeekCompleted: lastWeekCompleted.sort((a, b) => moment(b.completion_date).diff(moment(a.completion_date)))
        };
    }, [points, selectedYear, selectedMonth]);

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading report...</div>;
    if (!processedData) return <div style={{ padding: '20px', textAlign: 'center' }}>No data available for this month.</div>;

    const { dateStr, totalTasks, totalGreen, totalYellow, totalRed, totalHold, pctGreen, pctYellow, pctRed, pctHold, totalKarmaPossible, totalKarmaEarned, pctKarma, highestDelay, devs, lastWeekCompleted } = processedData;

    return (
        <div className="month-dashboard-container">
            <style>{`
                .month-dashboard-container {
                    --navy:#0a1f44; --navy2:#132c5e; --gold:#c9a227; --gold2:#e8c766;
                    --green:#1e8e3e; --yellow:#e0a800; --red:#c62828; --hold:#6a1b9a; --gray:#757575; --bg:#f4f6fb;
                    font-family: 'Segoe UI',Arial,sans-serif;
                    background: var(--bg);
                    color: #1a1a1a;
                    min-height: 100vh;
                }
                .month-dashboard-container * { box-sizing: border-box; }
                .m-header {
                    background: linear-gradient(135deg,var(--navy),var(--navy2));
                    color: #fff;
                    padding: 28px 40px;
                    border-bottom: 6px solid var(--gold);
                }
                .m-header h1 { margin: 0; font-size: 26px; letter-spacing: .5px; }
                .m-header p { margin: 6px 0 0; color: var(--gold2); font-size: 14px; }
                .wrap { padding: 24px 40px 60px; max-width: 1400px; margin: 0 auto; }
                .cards { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 28px; }
                .card { flex: 1; min-width: 140px; background: #fff; border-radius: 8px; padding: 16px 18px; box-shadow: 0 2px 6px rgba(10,31,68,.1); border-top: 4px solid var(--navy); }
                .card h3 { margin: 0 0 4px; font-size: 13px; color: #666; text-transform: uppercase; letter-spacing: .5px; }
                .card .num { font-size: 26px; font-weight: 700; color: var(--navy); }
                .card.green { border-top-color: var(--green); } .card.green .num { color: var(--green); }
                .card.yellow { border-top-color: var(--yellow); } .card.yellow .num { color: var(--yellow); }
                .card.red { border-top-color: var(--red); } .card.red .num { color: var(--red); }
                .card.hold { border-top-color: var(--hold); } .card.hold .num { color: var(--hold); }
                
                .bar { display: flex; height: 26px; border-radius: 6px; overflow: hidden; margin: 10px 0 28px; box-shadow: 0 1px 4px rgba(0,0,0,.15); }
                .bar span { display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: 600; white-space: nowrap; overflow: hidden; }
                .seg-green { background: var(--green); }
                .seg-yellow { background: var(--yellow); color: #222 !important; }
                .seg-red { background: var(--red); }
                .seg-hold { background: var(--hold); }
                
                .month-dashboard-container h2 { color: var(--navy); border-bottom: 2px solid var(--gold); padding-bottom: 6px; margin-top: 38px; }
                .month-dashboard-container table { width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 2px 6px rgba(10,31,68,.08); margin-top: 10px; }
                .month-dashboard-container th { background: var(--navy); color: var(--gold2); padding: 10px 12px; text-align: left; font-size: 13px; }
                .month-dashboard-container td { padding: 9px 12px; border-bottom: 1px solid #e5e8f0; font-size: 13px; }
                .month-dashboard-container tr:nth-child(even) td { background: #f8f9fd; }
                .flag td { background: #fdecea !important; }
                
                .pill { padding: 3px 10px; border-radius: 12px; color: #fff; font-size: 12px; font-weight: 600; display: inline-block; }
                .pill.green { background: var(--green); }
                .pill.yellow { background: var(--yellow); color: #222; }
                .pill.red { background: var(--red); }
                
                .m-note { background: #fff8e1; border-left: 4px solid var(--gold); padding: 10px 16px; font-size: 13px; margin: 14px 0; }
                .delay-box { background: linear-gradient(135deg,#c62828,#8e1b1b); color: #fff; padding: 18px 22px; border-radius: 8px; margin: 16px 0; }
                .delay-box h3 { margin: 0 0 6px; color: var(--gold2); }
                .m-footer { text-align: center; padding: 18px; color: #888; font-size: 12px; }
            `}</style>

            <div className="m-header">
                <button onClick={() => navigate(`/open-points/project/${projectId}`)} className="btn btn-sm btn-light" style={{ float: 'right', marginTop: '-10px', background: 'transparent', border: '1px solid var(--gold2)', color: 'var(--gold2)' }}>
                    &larr; Back
                </button>
                <h1>PROJECT OPEN POINTS — STATUS REPORT</h1>
                <p>Team-wise Planned vs Actual | Snapshot Date: {dateStr} | QA Owner: Project Team</p>
            </div>

            <div className="wrap">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <h2 style={{ flex: 1 }}>Overall Team Snapshot ({totalTasks} Tasks)</h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <select 
                            value={selectedYear}
                            onChange={(e) => {
                                const y = e.target.value;
                                setSelectedYear(y);
                                if (y === String(currentYear) && selectedMonth > currentMonthNum) {
                                    setSelectedMonth(currentMonthNum);
                                }
                            }}
                            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--navy)', background: '#fff', color: 'var(--navy)', fontWeight: '600', cursor: 'pointer', outline: 'none', fontSize: '13px', marginBottom: '6px' }}
                        >
                            <option value="allTime">All Time</option>
                            {availableYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        
                        {selectedYear !== 'allTime' && (
                            <select 
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--navy)', background: '#fff', color: 'var(--navy)', fontWeight: '600', cursor: 'pointer', outline: 'none', fontSize: '13px', marginBottom: '6px' }}
                            >
                                {allMonths.map(m => {
                                    const isFuture = String(selectedYear) === String(currentYear) && m.val > currentMonthNum;
                                    return <option key={m.val} value={m.val} disabled={isFuture}>
                                        {m.label} {isFuture ? '(No Data)' : ''}
                                    </option>;
                                })}
                            </select>
                        )}
                    </div>
                </div>
                <div className="cards">
                    <div className="card"><h3>Total Tasks</h3><div className="num">{totalTasks}</div></div>
                    <div className="card green"><h3>Green (Done)</h3><div className="num">{totalGreen}</div></div>
                    <div className="card yellow"><h3>Yellow (In Progress)</h3><div className="num">{totalYellow}</div></div>
                    <div className="card red"><h3>Red (Delayed)</h3><div className="num">{totalRed}</div></div>
                    <div className="card hold"><h3>Hold</h3><div className="num">{totalHold}</div></div>
                </div>
                <div className="bar">
                    {pctGreen > 0 && <span className="seg-green" style={{ width: `${pctGreen}%` }}>Green {pctGreen}%</span>}
                    {pctYellow > 0 && <span className="seg-yellow" style={{ width: `${pctYellow}%` }}>Yellow {pctYellow}%</span>}
                    {pctRed > 0 && <span className="seg-red" style={{ width: `${pctRed}%` }}>Red {pctRed}%</span>}
                    {pctHold > 0 && <span className="seg-hold" style={{ width: `${pctHold}%` }}>Hold {pctHold}%</span>}
                </div>
                <div className="m-note">
                    Planned = {totalTasks} open points. Actual completed (Green) as of {dateStr} = <b>{totalGreen} tasks ({pctGreen}%)</b>.
                    <br/>
                    Karma: Total possible ≈ <b>{totalKarmaPossible} pts</b> | Earned so far ≈ <b>{totalKarmaEarned} pts ({pctKarma}%)</b>.
                </div>

                {highestDelay && (
                    <div className="delay-box">
                        <h3>🚩 Highest Delay Contributor: {highestDelay.name.toUpperCase()}</h3>
                        {highestDelay.red} of {highestDelay.total} tasks still Red ({((highestDelay.red/highestDelay.total)*100).toFixed(1)}%) · Completion {((highestDelay.green/highestDelay.total)*100).toFixed(1)}% ·
                        Pending karma stuck: {highestDelay.karmaTotal - highestDelay.karmaEarned} of {highestDelay.karmaTotal} pts.
                    </div>
                )}

                <h2>Developer-wise Planned vs Actual</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Developer</th>
                            <th>Total</th>
                            <th>Green</th>
                            <th>Yellow</th>
                            <th>Red</th>
                            <th>Hold</th>
                            <th>Completion %</th>
                            <th>Karma (Earned/Total)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {devs.map(dev => {
                            const compPct = dev.total ? (dev.green / dev.total * 100).toFixed(1) : 0;
                            const isHighestDelay = highestDelay && highestDelay.name === dev.name;
                            return (
                                <tr key={dev.name} className={isHighestDelay ? 'flag' : ''}>
                                    <td style={{ fontWeight: 600 }}>{dev.name}</td>
                                    <td>{dev.total}</td>
                                    <td>{dev.green}</td>
                                    <td>{dev.yellow}</td>
                                    <td>{dev.red}</td>
                                    <td>{dev.hold}</td>
                                    <td>{compPct}%</td>
                                    <td>{dev.karmaEarned} / {dev.karmaTotal}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <h2>Tasks Completed Last Week (Review Date = {dateStr})</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Developer</th>
                            <th>Task</th>
                            <th>Review Date</th>
                            <th>Karma</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lastWeekCompleted.length === 0 ? (
                            <tr><td colSpan="4" style={{ color: '#888', fontStyle: 'italic' }}>No tasks completed last week.</td></tr>
                        ) : (
                            lastWeekCompleted.map(task => (
                                <tr key={task._id}>
                                    <td style={{ fontWeight: 600 }}>{task.responsibility || task.responsible_person?.username || 'Unassigned'}</td>
                                    <td>{task.title}</td>
                                    <td>{moment(task.completion_date).format('DD-MMM-YY')}</td>
                                    <td style={{ fontWeight: 700 }}>{getKarmaForTask(task)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                <h2>📌 Karma Points Guide</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Priority</th>
                            <th>Points</th>
                            <th>Meaning</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td><span className="pill red">P1 / Emergency</span></td><td>10 pts</td><td>Urgent / security / blocking issue — must close immediately</td></tr>
                        <tr><td><span className="pill yellow">P2 / High</span></td><td>5 pts</td><td>Important feature or bug — affects users or deadlines</td></tr>
                        <tr><td><span className="pill green">P3 / Medium</span></td><td>3 pts</td><td>Standard task — normal development cycle</td></tr>
                        <tr><td><span className="pill" style={{ background: '#eee', color: '#777' }}>P4 / Low</span></td><td>1 pt</td><td>Low priority task</td></tr>
                    </tbody>
                </table>
            </div>
            <div className="m-footer">Generated {dateStr} from Project {project?.title || 'Open Points'} source file</div>
        </div>
    );
};

export default MonthDashboard;
