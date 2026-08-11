import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchProjectPoints, fetchProjectDetails } from '../../../services/openPointsService';
import moment from 'moment';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
  } from 'recharts';

const getKarmaForTask = (task) => {
    const p = task.priority || 'Medium';
    if (['P1', 'Emergency', 'Critical'].includes(p)) return 10;
    if (['P2', 'High'].includes(p)) return 5;
    if (['P3', 'Medium'].includes(p)) return 3;
    if (['P4', 'Low'].includes(p)) return 1;
    return 3;
};

const PlannedDashboard = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [points, setPoints] = useState([]);
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedDevs, setExpandedDevs] = useState({});

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
                console.error("Error loading planned dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [projectId]);

    const processedData = useMemo(() => {
        if (!points.length) return null;

        const now = moment();
        const currentMonth = now.month();
        const currentYear = now.year();
        const lastMonthDate = now.clone().subtract(1, 'months');
        const lastMonth = lastMonthDate.month();
        const lastMonthYear = lastMonthDate.year();

        const lastMonthTasks = [];
        const currentMonthTasks = [];

        points.forEach(p => {
            const completedMoment = p.completion_date ? moment(p.completion_date) : null;
            const targetMoment = p.target_date ? moment(p.target_date) : null;
            const effectiveCompletedMoment = completedMoment || targetMoment || now;
            
            // Strictly bucket by target date, exactly as requested
            if (targetMoment && targetMoment.month() === lastMonth && targetMoment.year() === lastMonthYear) {
                lastMonthTasks.push(p);
            }

            if (targetMoment && targetMoment.month() === currentMonth && targetMoment.year() === currentYear) {
                currentMonthTasks.push(p);
            }
        });

        const devMap = {};
        const getDev = (task) => {
            if (task.responsibility) return task.responsibility;
            if (task.responsible_person && task.responsible_person.username) return task.responsible_person.username;
            return 'Unassigned';
        };

        const processTask = (task, isLastMonth) => {
            const dev = getDev(task);
            if (!devMap[dev]) {
                devMap[dev] = { 
                    name: dev, 
                    lastMonth: { tasks: 0, karma: 0, list: [] }, 
                    currentMonth: { tasks: 0, karma: 0, greenTasks: 0, yellowTasks: 0, redTasks: 0, holdTasks: 0, list: [] } 
                };
            }
            const karma = getKarmaForTask(task);
            if (isLastMonth) {
                devMap[dev].lastMonth.tasks++;
                devMap[dev].lastMonth.karma += karma;
                devMap[dev].lastMonth.list.push(task);
            } else {
                devMap[dev].currentMonth.tasks++;
                devMap[dev].currentMonth.karma += karma;
                devMap[dev].currentMonth.list.push(task);
                
                if (task.status === 'Green') devMap[dev].currentMonth.greenTasks++;
                else if (task.status === 'Yellow' || task.status === 'Orange') devMap[dev].currentMonth.yellowTasks++;
                else if (task.status === 'Red') devMap[dev].currentMonth.redTasks++;
                else devMap[dev].currentMonth.holdTasks++;
            }
        };

        lastMonthTasks.forEach(t => processTask(t, true));
        currentMonthTasks.forEach(t => processTask(t, false));

        const devs = Object.values(devMap).sort((a, b) => b.currentMonth.karma - a.currentMonth.karma);

        const lastMonthTotalKarma = devs.reduce((sum, d) => sum + d.lastMonth.karma, 0);
        const currentMonthTotalKarma = devs.reduce((sum, d) => sum + d.currentMonth.karma, 0);
        
        const lastMonthAvgKarma = devs.filter(d => d.lastMonth.tasks > 0).length ? Math.round(lastMonthTotalKarma / devs.filter(d => d.lastMonth.tasks > 0).length) : 0;
        const currentMonthAvgKarma = devs.filter(d => d.currentMonth.tasks > 0).length ? Math.round(currentMonthTotalKarma / devs.filter(d => d.currentMonth.tasks > 0).length) : 0;

        return {
            lastMonthTasks,
            currentMonthTasks,
            devs,
            lastMonthName: lastMonthDate.format('MMMM'),
            currentMonthName: now.format('MMMM'),
            lastMonthTotalKarma,
            currentMonthTotalKarma,
            lastMonthAvgKarma,
            currentMonthAvgKarma,
            devCountLast: devs.filter(d => d.lastMonth.tasks > 0).length,
            devCountCurrent: devs.filter(d => d.currentMonth.tasks > 0).length,
        };
    }, [points]);

    const toggleDev = (devName) => {
        setExpandedDevs(prev => ({ ...prev, [devName]: !prev[devName] }));
    };

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading dashboard...</div>;
    if (!processedData) return <div style={{ padding: '20px', textAlign: 'center' }}>No data available for this project.</div>;

    const { 
        lastMonthName, currentMonthName, devs, lastMonthTasks, currentMonthTasks,
        lastMonthTotalKarma, currentMonthTotalKarma, lastMonthAvgKarma, currentMonthAvgKarma,
        devCountLast, devCountCurrent
    } = processedData;

    const chartData = devs.map(d => ({
        name: d.name.substring(0, 10),
        [`${lastMonthName} Tasks`]: d.lastMonth.tasks,
        [`${currentMonthName} Tasks`]: d.currentMonth.tasks,
        [`${lastMonthName} Karma`]: d.lastMonth.karma,
        [`${currentMonthName} Karma`]: d.currentMonth.karma,
    }));

    const statusData = [
        { name: 'Green', value: currentMonthTasks.filter(t => t.status === 'Green').length, color: '#0ca30c' },
        { name: 'Yellow', value: currentMonthTasks.filter(t => t.status === 'Yellow' || t.status === 'Orange').length, color: '#eda100' },
        { name: 'Red', value: currentMonthTasks.filter(t => t.status === 'Red').length, color: '#e24b4a' },
        { name: 'Hold', value: currentMonthTasks.filter(t => !['Green', 'Yellow', 'Orange', 'Red'].includes(t.status)).length, color: '#888780' },
    ];

    return (
        <div className="planned-dashboard-container">
            <style>{`
                .planned-dashboard-container {
                    --green:#0ca30c;--green-bg:#eaf3de;--green-text:#27500a;
                    --blue:#2a78d6;--blue-dark:#1f3a6e;--blue-bg:#e6f1fb;--blue-text:#0c447c;
                    --red:#e24b4a;--red-bg:#fcebeb;--red-text:#791f1f;
                    --amber:#eda100;--amber-bg:#faeeda;--amber-text:#854f0b;
                    --hold:#888780;--hold-bg:#f1efe8;
                    --border:#d3d1c7;--border-light:#e8e7e0;
                    --bg:#f5f5f3;--card:#fff;--text:#1a1a18;--muted:#6b6b68;--muted2:#888780;
                    font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                    background: var(--bg);
                    color: var(--text);
                    font-size: 14px;
                    line-height: 1.5;
                    min-height: 100vh;
                }
                .planned-dashboard-container * {
                    box-sizing: border-box;
                }
                .page { max-width:1200px; margin:0 auto; padding:24px 20px 56px; }
                
                .hdr{display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2px solid var(--text);padding-bottom:14px;margin-bottom:24px}
                .hdr h1{font-size:22px;font-weight:700;letter-spacing:-.5px; margin:0;}
                .hdr h1 .jun{color:var(--green)} .hdr h1 .jul{color:var(--blue)}
                .hdr-sub{font-size:12px;color:var(--muted);margin-top:3px}
                .hdr-meta{font-size:11px;color:var(--muted);text-align:right;line-height:1.9}
                .badge{display:inline-block;font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px}
                .badge-qa{background:var(--blue-bg);color:var(--blue-text)}

                .slbl{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted2);margin:28px 0 10px}

                .cmp-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:4px}
                .cmp-card{background:var(--card);border:.5px solid var(--border);border-radius:10px;padding:14px 16px;display:flex;flex-direction:column}
                .cmp-card .cmp-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted2);margin-bottom:6px}
                .cmp-card .cmp-vals{display:flex;align-items:baseline;gap:10px}
                .cmp-card .cv-jun{font-size:26px;font-weight:700;color:var(--green)}
                .cmp-card .cv-arrow{font-size:14px;color:var(--muted2)}
                .cmp-card .cv-jul{font-size:26px;font-weight:700;color:var(--blue)}
                .cmp-card .cmp-sub{font-size:10px;color:var(--muted2);margin-top:4px}

                .dev-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
                .dev-card{background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:16px;transition:box-shadow .2s}
                .dev-card:hover{box-shadow:0 2px 12px rgba(0,0,0,.06)}
                .dev-card.full{grid-column:1/-1}
                .dc-hdr{display:flex;align-items:center;gap:10px;margin-bottom:12px}
                .avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
                .dc-name{font-size:13px;font-weight:700} .dc-role{font-size:11px;color:var(--muted)}
                .dc-karma{margin-left:auto;font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;white-space:nowrap}
                .dc-months{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
                .dc-month{border-radius:8px;padding:10px 12px}
                .dc-month.jun{background:var(--green-bg)} .dc-month.jul{background:var(--blue-bg)}
                .dc-month-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
                .dc-month.jun .dc-month-label{color:var(--green)} .dc-month.jul .dc-month-label{color:var(--blue)}
                .dc-month-val{font-size:20px;font-weight:700;line-height:1.1}
                .dc-month.jun .dc-month-val{color:var(--green)} .dc-month.jul .dc-month-val{color:var(--blue)}
                .dc-month-sub{font-size:10px;color:var(--muted);margin-top:2px}
                .prog-track{height:6px;border-radius:3px;background:var(--border-light);overflow:hidden}
                .prog-fill{height:100%;border-radius:3px}
                .prog-row{display:flex;gap:8px;align-items:center;margin-top:6px}
                .prog-row .plbl{font-size:9px;font-weight:700;white-space:nowrap;min-width:40px}

                .chart-card{background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:16px}
                .chart-title{font-size:13px;font-weight:700;margin-bottom:12px}
                .chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
                .legend-row{display:flex;flex-wrap:wrap;gap:14px;margin-bottom:10px;font-size:11px;color:var(--muted)}
                .legend-item{display:flex;align-items:center;gap:5px}
                .legend-sq{width:10px;height:10px;border-radius:2px}

                .coll{border:.5px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:12px;background:var(--card)}
                .coll-hdr{display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;user-select:none;transition:background .15s}
                .coll-hdr:hover{background:#f9f9f7}
                .coll-hdr .ch-avatar{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;background:var(--blue-dark);color:#fff}
                .coll-hdr .ch-name{font-size:13px;font-weight:700}
                .coll-hdr .ch-meta{font-size:11px;color:var(--muted);margin-left:auto}
                .coll-hdr .ch-arrow{font-size:12px;color:var(--muted2);transition:transform .25s}
                .coll-hdr.open .ch-arrow{transform:rotate(90deg)}
                .coll-body{display:none;overflow-x:auto}
                .coll-body.open{display:block}

                table.ptable{border-collapse:collapse;width:100%;font-size:12px}
                table.ptable thead th{background:#f0f3f8;color:var(--blue-dark);text-align:left;padding:7px 9px;border-bottom:2px solid var(--border);white-space:nowrap;font-size:10px;text-transform:uppercase;letter-spacing:.05em}
                table.ptable tbody td{padding:7px 9px;border-bottom:.5px solid var(--border-light);vertical-align:top}
                table.ptable tbody tr:nth-child(even) td{background:#fafbfd}
                table.ptable tbody tr:hover td{background:#eef3fb}
                .c-num{color:var(--muted);width:26px}
                .c-task{min-width:180px;font-weight:600}
                .c-desc{min-width:200px;color:#3a3f45}
                .c-date{white-space:nowrap}
                .c-karma{text-align:center;font-weight:700;color:var(--blue-dark)}
                
                .st-red{background:var(--red-bg);color:var(--red);padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
                .st-yellow{background:var(--amber-bg);color:var(--amber);padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
                .st-green{background:var(--green-bg);color:var(--green);padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
                .st-hold{background:var(--hold-bg);color:var(--hold);padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
                
                .pri-critical{background:#fde2e1;color:#b91c1c;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
                .pri-high{background:#ffe9d6;color:#c2600a;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
                .pri-medium{background:#e4ecff;color:#2952a3;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
                .pri-low{background:#eee;color:#777;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}

                .lb-table{width:100%;border-collapse:collapse;font-size:13px}
                .lb-table th{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted2);text-align:left;padding:6px 10px;border-bottom:1px solid var(--border-light)}
                .lb-table td{padding:9px 10px;border-bottom:.5px solid var(--border-light);vertical-align:middle}
                .lb-table tbody tr:hover{background:#f9f9f7}
                .rank-medal{font-size:16px}
                .bar-cell{min-width:120px}
                .bar-track{height:8px;background:var(--border-light);border-radius:4px;overflow:hidden;display:flex}
                .bar-fill{height:100%;border-radius:4px;transition:width .6s ease}
                
                @media(max-width:800px){
                    .cmp-kpi{grid-template-columns:repeat(2,1fr)}
                    .dev-grid{grid-template-columns:1fr}
                    .chart-grid{grid-template-columns:1fr}
                    .dc-months{grid-template-columns:1fr}
                }
                @media(max-width:500px){
                    .cmp-kpi{grid-template-columns:1fr}
                    .hdr{flex-direction:column;gap:12px}
                }
            `}</style>
            
            <div className="page">
                <button onClick={() => navigate(`/open-points/project/${projectId}`)} className="btn btn-sm btn-light" style={{ marginBottom: '16px', border: '1px solid #d3d1c7' }}>
                    &larr; Back to Project
                </button>

                <div className="hdr">
                    <div>
                        <h1><span className="jun">{lastMonthName}</span> &rarr; <span className="jul">{currentMonthName}</span> Sprint Dashboard</h1>
                        <div className="hdr-sub">{project?.title || 'Project'} — Last month completed vs this month planned</div>
                    </div>
                    <div className="hdr-meta">
                        Generated: {moment().format('DD MMM YYYY')}<br/>
                        Sprint target: End of {currentMonthName}
                    </div>
                </div>

                <div className="slbl">Month-over-month comparison</div>
                <div className="cmp-kpi">
                    <div className="cmp-card">
                        <div className="cmp-label">Tasks</div>
                        <div className="cmp-vals">
                            <span className="cv-jun">{lastMonthTasks.length}</span><span className="cv-arrow">&rarr;</span><span className="cv-jul">{currentMonthTasks.length}</span>
                        </div>
                        <div className="cmp-sub">{lastMonthName} green &rarr; {currentMonthName} planned</div>
                    </div>
                    <div className="cmp-card">
                        <div className="cmp-label">Karma Points</div>
                        <div className="cmp-vals">
                            <span className="cv-jun">{lastMonthTotalKarma}</span><span className="cv-arrow">&rarr;</span><span className="cv-jul">{currentMonthTotalKarma}</span>
                        </div>
                        <div className="cmp-sub">Total team karma</div>
                    </div>
                    <div className="cmp-card">
                        <div className="cmp-label">Developers</div>
                        <div className="cmp-vals">
                            <span className="cv-jun">{devCountLast}</span><span className="cv-arrow">&rarr;</span><span className="cv-jul">{devCountCurrent}</span>
                        </div>
                        <div className="cmp-sub">Active developers</div>
                    </div>
                    <div className="cmp-card">
                        <div className="cmp-label">Avg Karma / Dev</div>
                        <div className="cmp-vals">
                            <span className="cv-jun">{lastMonthAvgKarma}</span><span className="cv-arrow">&rarr;</span><span className="cv-jul">{currentMonthAvgKarma}</span>
                        </div>
                        <div className="cmp-sub">Per-head productivity</div>
                    </div>
                </div>

                <div className="slbl">Developer scorecards — {lastMonthName} green vs {currentMonthName} plan</div>
                <div className="dev-grid">
                    {devs.map((dev, i) => {
                        const isEven = i % 2 === 0;
                        const lastProgress = 100;
                        const currentProgress = dev.currentMonth.tasks > 0 
                            ? Math.round((dev.currentMonth.greenTasks / dev.currentMonth.tasks) * 100) 
                            : 0;
                        const lastColor = isEven ? 'var(--green)' : 'var(--blue)';
                        const currentColor = isEven ? 'var(--blue)' : 'var(--blue)';
                        return (
                            <div className="dev-card" key={dev.name}>
                                <div className="dc-hdr">
                                    <div className="avatar" style={{ background: isEven ? 'var(--green-bg)' : 'var(--blue-bg)', color: isEven ? 'var(--green-text)' : 'var(--blue-text)' }}>
                                        {dev.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div><div className="dc-name">{dev.name}</div></div>
                                    <div className="dc-karma" style={{ background: isEven ? 'var(--green-bg)' : 'var(--blue-bg)', color: isEven ? 'var(--green-text)' : 'var(--blue-text)' }}>
                                        {dev.lastMonth.karma}&rarr;{dev.currentMonth.karma}
                                    </div>
                                </div>
                                <div className="dc-months">
                                    <div className="dc-month jun">
                                        <div className="dc-month-label">{lastMonthName} — Completed</div>
                                        <div className="dc-month-val">{dev.lastMonth.tasks}</div>
                                        <div className="dc-month-sub">green tasks · {dev.lastMonth.karma} pts</div>
                                    </div>
                                    <div className="dc-month jul">
                                        <div className="dc-month-label">{currentMonthName} — Planned</div>
                                        <div className="dc-month-val">{dev.currentMonth.tasks}</div>
                                        <div className="dc-month-sub">tasks · {dev.currentMonth.karma} pts</div>
                                    </div>
                                </div>
                                <div className="prog-row">
                                    <span className="plbl" style={{ color: 'var(--green)' }}>{lastMonthName.substring(0, 3)}</span>
                                    <div className="prog-track" style={{ flex: 1 }}><div className="prog-fill" style={{ width: '100%', background: 'var(--green)' }}></div></div>
                                    <span className="plbl" style={{ color: 'var(--blue)' }}>{currentMonthName.substring(0, 3)}</span>
                                    <div className="prog-track" style={{ flex: 1 }}><div className="prog-fill" style={{ width: `${currentProgress}%`, background: 'var(--blue)' }}></div></div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="slbl">Visual comparison</div>
                <div className="chart-grid">
                    <div className="chart-card">
                        <div className="chart-title">Task count — {lastMonthName} green vs {currentMonthName} planned</div>
                        <div className="legend-row">
                            <div className="legend-item"><div className="legend-sq" style={{ background: 'var(--green)' }}></div>{lastMonthName} Green</div>
                            <div className="legend-item"><div className="legend-sq" style={{ background: 'var(--blue)' }}></div>{currentMonthName} Planned</div>
                        </div>
                        <div style={{ position: 'relative', height: '240px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e7e0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b6b68' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b6b68' }} />
                                    <RechartsTooltip cursor={{ fill: '#f1efe8' }} />
                                    <Bar dataKey={`${lastMonthName} Tasks`} fill="#0ca30c" />
                                    <Bar dataKey={`${currentMonthName} Tasks`} fill="#2a78d6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="chart-card">
                        <div className="chart-title">{currentMonthName} — Task status breakdown</div>
                        <div className="legend-row">
                            <div className="legend-item"><div className="legend-sq" style={{ background: 'var(--green)' }}></div>Green</div>
                            <div className="legend-item"><div className="legend-sq" style={{ background: 'var(--amber)' }}></div>Yellow</div>
                            <div className="legend-item"><div className="legend-sq" style={{ background: 'var(--red)' }}></div>Red</div>
                            <div className="legend-item"><div className="legend-sq" style={{ background: 'var(--hold)' }}></div>Hold/Other</div>
                        </div>
                        <div style={{ position: 'relative', height: '240px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusData.filter(d => d.value > 0)}
                                        cx="50%" cy="50%"
                                        innerRadius={50} outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="slbl">Karma leaderboard — both months</div>
                <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="lb-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>Rank</th>
                                <th>Developer</th>
                                <th>{lastMonthName.substring(0,3)} Tasks</th>
                                <th>{lastMonthName.substring(0,3)} Karma</th>
                                <th>{currentMonthName.substring(0,3)} Tasks</th>
                                <th>{currentMonthName.substring(0,3)} Karma</th>
                                <th className="bar-cell">{currentMonthName.substring(0,3)} Progress</th>
                            </tr>
                        </thead>
                        <tbody>
                            {devs.map((dev, i) => {
                                let rank = i + 1;
                                let rankDisp = rank;
                                if (rank === 1) rankDisp = '🥇';
                                else if (rank === 2) rankDisp = '🥈';
                                else if (rank === 3) rankDisp = '🥉';
                                else rankDisp = `#${rank}`;
                                
                                const prog = dev.currentMonth.tasks > 0 ? Math.round((dev.currentMonth.greenTasks / dev.currentMonth.tasks) * 100) : 0;
                                return (
                                    <tr key={dev.name}>
                                        <td className={rank <= 3 ? "rank-medal" : ""} style={{ color: rank > 3 ? 'var(--muted)' : '', fontWeight: rank > 3 ? 700 : '' }}>{rankDisp}</td>
                                        <td><strong>{dev.name}</strong></td>
                                        <td style={{ color: 'var(--green)' }}>{dev.lastMonth.tasks}</td>
                                        <td><strong>{dev.lastMonth.karma}</strong></td>
                                        <td style={{ color: 'var(--blue)' }}>{dev.currentMonth.tasks}</td>
                                        <td><strong>{dev.currentMonth.karma}</strong></td>
                                        <td className="bar-cell">
                                            <div className="bar-track">
                                                <div className="bar-fill" style={{ width: `${prog}%`, background: 'var(--blue)' }}></div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="slbl">{currentMonthName} — Detailed task plan (click to expand)</div>
                {devs.map(dev => (
                    <div className="coll" key={dev.name}>
                        <div className={`coll-hdr ${expandedDevs[dev.name] ? 'open' : ''}`} onClick={() => toggleDev(dev.name)}>
                            <span className="ch-avatar">{dev.name.substring(0, 1).toUpperCase()}</span>
                            <span className="ch-name">{dev.name.toUpperCase()}</span>
                            <span className="ch-meta">{dev.currentMonth.tasks} tasks · {dev.currentMonth.karma} karma · {dev.currentMonth.greenTasks} green / {dev.currentMonth.yellowTasks} yellow / {dev.currentMonth.redTasks} red</span>
                            <span className="ch-arrow">▶</span>
                        </div>
                        <div className={`coll-body ${expandedDevs[dev.name] ? 'open' : ''}`}>
                            <table className="ptable">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Task</th>
                                        <th>Priority</th>
                                        <th>Target</th>
                                        <th>Status</th>
                                        <th>Karma</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dev.currentMonth.list.map((task, idx) => {
                                        let priClass = 'pri-low';
                                        if (['P1', 'Emergency'].includes(task.priority)) priClass = 'pri-critical';
                                        else if (['P2', 'High'].includes(task.priority)) priClass = 'pri-high';
                                        else if (['P3', 'Medium'].includes(task.priority)) priClass = 'pri-medium';
                                        
                                        let stClass = 'st-hold';
                                        if (task.status === 'Green') stClass = 'st-green';
                                        else if (['Yellow', 'Orange'].includes(task.status)) stClass = 'st-yellow';
                                        else if (task.status === 'Red') stClass = 'st-red';
                                        
                                        return (
                                            <tr key={task._id}>
                                                <td className="c-num">{idx + 1}</td>
                                                <td className="c-task">{task.title}</td>
                                                <td><span className={priClass}>{task.priority || 'Medium'}</span></td>
                                                <td className="c-date">{task.target_date ? moment(task.target_date).format('DD-MMM') : 'N/A'}</td>
                                                <td><span className={stClass}>{task.status || 'Red'}</span></td>
                                                <td className="c-karma">{getKarmaForTask(task)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PlannedDashboard;
