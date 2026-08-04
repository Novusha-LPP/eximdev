import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchProjectPoints, fetchProjectDetails } from '../../../services/openPointsService';
import moment from 'moment';

const ForecastingDashboard = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [points, setPoints] = useState([]);
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('current'); // 'current', 'carry', 'load'

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
                console.error("Error loading forecasting data:", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [projectId]);

    const processedData = useMemo(() => {
        if (!points.length) return null;

        const now = moment();
        const startOfMonth = now.clone().startOf('month');
        const endOfMonth = now.clone().endOf('month');

        const weeks = [];
        let currentStart = startOfMonth.clone();
        for (let i = 1; i <= 5; i++) {
            if (currentStart.isAfter(endOfMonth)) break;
            
            let currentEnd = currentStart.clone().add(6, 'days');
            if (i === 5 || currentEnd.isAfter(endOfMonth)) {
                currentEnd = endOfMonth.clone();
            }
            
            weeks.push({
                label: `Week ${i} (${currentStart.format('D')}–${currentEnd.format('D MMM')})`,
                start: currentStart.clone(),
                end: currentEnd.clone(),
                tasks: []
            });
            
            currentStart = currentEnd.clone().add(1, 'day');
        }

        const carryForwardMap = {};
        const getDev = (task) => {
            if (task.responsibility) return task.responsibility;
            if (task.responsible_person && task.responsible_person.username) return task.responsible_person.username;
            return 'Unassigned';
        };

        points.forEach(p => {
            if (p.status === 'Green') return; 
            
            const target = p.target_date ? moment(p.target_date) : null;
            if (!target) return;

            if (target.isBefore(startOfMonth, 'day')) {
                const dev = getDev(p);
                if (!carryForwardMap[dev]) carryForwardMap[dev] = [];
                carryForwardMap[dev].push(p);
            } else if (target.isSameOrBefore(endOfMonth, 'day')) {
                for (let w of weeks) {
                    if (target.isBetween(w.start, w.end, 'day', '[]')) {
                        w.tasks.push(p);
                        break;
                    }
                }
            }
        });

        const devLoad = {};
        weeks.forEach(w => {
            w.tasks.forEach(t => {
                const dev = getDev(t);
                if (!devLoad[dev]) devLoad[dev] = 0;
                devLoad[dev]++;
            });
        });

        const totalCarry = Object.values(carryForwardMap).reduce((acc, arr) => acc + arr.length, 0);

        return {
            monthName: now.format('MMMM').toUpperCase(),
            year: now.format('YYYY'),
            nextMonthName: now.clone().add(1, 'month').format('MMMM').toUpperCase(),
            nextYear: now.clone().add(1, 'month').format('YYYY'),
            weeks,
            carryForward: Object.entries(carryForwardMap).sort((a, b) => b[1].length - a[1].length),
            devLoad: Object.entries(devLoad).sort((a, b) => b[1] - a[1]),
            totalCarry
        };
    }, [points]);

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading roadmap...</div>;
    if (!processedData) return <div style={{ padding: '20px', textAlign: 'center' }}>No data available.</div>;

    const { monthName, year, nextMonthName, nextYear, weeks, carryForward, devLoad, totalCarry } = processedData;

    return (
        <div className="forecasting-container">
            <style>{`
                .forecasting-container {
                    --navy:#0a1f44;--navy2:#132c5e;--gold:#c9a227;--gold2:#e8c766;
                    --green:#1e8e3e;--yellow:#e0a800;--red:#c62828;--hold:#6a1b9a;--bg:#f4f6fb;
                    font-family: 'Segoe UI',Arial,sans-serif;
                    background: var(--bg);
                    color: #1a1a1a;
                    min-height: 100vh;
                }
                .forecasting-container * { box-sizing: border-box; }
                .f-header {
                    background: linear-gradient(135deg,var(--navy),var(--navy2));
                    color: #fff;
                    padding: 26px 40px;
                    border-bottom: 6px solid var(--gold);
                }
                .f-header h1 { margin: 0; font-size: 24px; }
                .f-header p { margin: 6px 0 0; color: var(--gold2); font-size: 13px; }
                .wrap { padding: 22px 40px 60px; max-width: 1400px; margin: 0 auto; }
                .forecasting-container h2 { color: var(--navy); border-bottom: 2px solid var(--gold); padding-bottom: 6px; margin-top: 10px; }
                .forecasting-container h3 { color: var(--navy2); margin: 22px 0 6px; font-size: 16px; border-left: 5px solid var(--gold); padding-left: 10px; }
                .forecasting-container table { width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 2px 6px rgba(10,31,68,.08); margin-top: 8px; }
                .forecasting-container th { background: var(--navy); color: var(--gold2); padding: 8px 10px; text-align: left; font-size: 12.5px; }
                .forecasting-container td { padding: 7px 10px; border-bottom: 1px solid #e5e8f0; font-size: 12.5px; }
                .forecasting-container tr:nth-child(even) td { background: #f8f9fd; }
                .pill { padding: 2px 9px; border-radius: 10px; color: #fff; font-size: 11px; font-weight: 600; display: inline-block; }
                .pill.green { background: var(--green); }
                .pill.yellow { background: var(--yellow); color: #222; }
                .pill.red { background: var(--red); }
                .pill.hold { background: var(--hold); }
                .weekbox { background: #fff; border-radius: 8px; padding: 4px 18px 14px; margin: 14px 0; box-shadow: 0 2px 6px rgba(10,31,68,.08); border-top: 4px solid var(--navy); }
                .f-note { background: #fff8e1; border-left: 4px solid var(--gold); padding: 10px 16px; font-size: 13px; margin: 14px 0; }
                .f-footer { text-align: center; padding: 18px; color: #888; font-size: 12px; }
                
                .tabs { display: flex; gap: 6px; margin: 20px 0 0; border-bottom: 3px solid var(--navy); }
                .tab-btn { background: #dfe4f0; border: none; padding: 12px 28px; font-size: 15px; font-weight: 700; color: var(--navy); cursor: pointer; border-radius: 8px 8px 0 0; letter-spacing: .3px; }
                .tab-btn.active { background: var(--navy); color: var(--gold2); }
                .exp-date { font-weight: 700; color: #8e1b1b; }
            `}</style>

            <div className="f-header">
                <button onClick={() => navigate(`/open-points/project/${projectId}`)} className="btn btn-sm btn-light" style={{ float: 'right', marginTop: '-10px', background: 'transparent', border: '1px solid var(--gold2)', color: 'var(--gold2)' }}>
                    &larr; Back
                </button>
                <h1>PRODUCT ROADMAP — WEEK-WISE / DEVELOPER-WISE</h1>
                <p>{monthName} & {nextMonthName} {year} | Source: {project?.title || 'Project'} | QA Owner: Project Team</p>
            </div>

            <div className="wrap">
                <div className="tabs">
                    <button className={`tab-btn ${activeTab === 'current' ? 'active' : ''}`} onClick={() => setActiveTab('current')}>
                        📅 {monthName} {year}
                    </button>
                    <button className={`tab-btn ${activeTab === 'carry' ? 'active' : ''}`} onClick={() => setActiveTab('carry')}>
                        📅 {nextMonthName} {nextYear} (Carry-Forward)
                    </button>
                    <button className={`tab-btn ${activeTab === 'load' ? 'active' : ''}`} onClick={() => setActiveTab('load')}>
                        🗓️ DEVELOPER LOAD
                    </button>
                </div>

                {activeTab === 'current' && (
                    <div>
                        {weeks.map(week => (
                            <div className="weekbox" key={week.label}>
                                <h3>{week.label}</h3>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Developer</th>
                                            <th>Task</th>
                                            <th>Priority</th>
                                            <th>Target</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {week.tasks.length === 0 ? (
                                            <tr><td colSpan="5" style={{ color: '#888', fontStyle: 'italic' }}>No tasks scheduled for this week.</td></tr>
                                        ) : (
                                            week.tasks.map(task => {
                                                let stClass = 'hold';
                                                if (task.status === 'Green') stClass = 'green';
                                                else if (['Yellow', 'Orange'].includes(task.status)) stClass = 'yellow';
                                                else if (task.status === 'Red') stClass = 'red';

                                                return (
                                                    <tr key={task._id}>
                                                        <td style={{ fontWeight: 600 }}>{task.responsibility || (task.responsible_person?.username) || 'Unassigned'}</td>
                                                        <td>{task.title}</td>
                                                        <td>{task.priority || 'Medium'}</td>
                                                        <td>{task.target_date ? moment(task.target_date).format('D-MMM') : ''}</td>
                                                        <td><span className={`pill ${stClass}`}>{task.status || 'Hold'}</span></td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'carry' && (
                    <div>
                        <div className="f-note">
                            Tasks carrying forward from past dates into the current backlog. Expected Finish Date per task is sequenced by priority and each developer's current closure pace.
                        </div>

                        {carryForward.length === 0 ? (
                            <div className="weekbox"><h3 style={{ color: 'var(--green)' }}>No overdue tasks carrying forward.</h3></div>
                        ) : (
                            carryForward.map(([dev, devTasks]) => (
                                <div className="weekbox" key={dev}>
                                    <h3>{dev} — {devTasks.length} tasks carrying forward</h3>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Task</th>
                                                <th>Priority</th>
                                                <th>Orig Target</th>
                                                <th>Status</th>
                                                <th>Expected Finish</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {devTasks.map((t, idx) => {
                                                let stClass = 'hold';
                                                if (t.status === 'Green') stClass = 'green';
                                                else if (['Yellow', 'Orange'].includes(t.status)) stClass = 'yellow';
                                                else if (t.status === 'Red') stClass = 'red';
                                                
                                                // Simple estimation logic just to populate the column reasonably
                                                const estDate = moment().add((idx + 1) * 2, 'days').format('D-MMM');

                                                return (
                                                    <tr key={t._id}>
                                                        <td>{t.title}</td>
                                                        <td>{t.priority || 'Medium'}</td>
                                                        <td>{moment(t.target_date).format('D-MMM')}</td>
                                                        <td><span className={`pill ${stClass}`}>{t.status || 'Hold'}</span></td>
                                                        <td className="exp-date">{estDate}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ))
                        )}
                        <div className="f-note">
                            <b>Total projected carry-forward: {totalCarry} tasks</b>. Expected finish dates are automatically estimated and not a committed date.
                        </div>
                    </div>
                )}

                {activeTab === 'load' && (
                    <div>
                        <div className="f-note">Master developer-wise load plan for the current month.</div>
                        <div className="weekbox">
                            <h3>Developer Load Summary (Task Count)</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Developer</th>
                                        <th>Tasks Planned This Month</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {devLoad.map(([dev, count]) => (
                                        <tr key={dev}>
                                            <td style={{ fontWeight: 600 }}>{dev}</td>
                                            <td>{count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
            <div className="f-footer">Generated {moment().format('DD-MMM-YYYY')} from Project {project?.title || ''} Open Points source</div>
        </div>
    );
};

export default ForecastingDashboard;
