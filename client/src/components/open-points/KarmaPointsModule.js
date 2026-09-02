import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Card, Table, Typography, Space, Input, Tag, Spin, Empty, Select, Button, Row, Col } from 'antd';
import { SearchOutlined, TrophyOutlined, TeamOutlined, FilterOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;

const KarmaPointsModule = () => {
    const [teamData, setTeamData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [selectedTeam, setSelectedTeam] = useState(null);

    useEffect(() => {
        const fetchTeamKarma = async () => {
            setLoading(true);
            try {
                const params = { filterType };
                if (filterType === 'month') {
                    params.month = new Date().getMonth();
                    params.year = new Date().getFullYear();
                }

                const res = await axios.get(`${process.env.REACT_APP_API_STRING}/open-points/team-karma`, {
                    params,
                    withCredentials: true
                });
                
                if (Array.isArray(res.data)) {
                    setTeamData(res.data);
                    if (res.data.length === 1) {
                        setSelectedTeam(res.data[0]);
                    }
                } else {
                    console.error("API did not return an array:", res.data);
                    setTeamData([]);
                }
            } catch (error) {
                console.error("Error fetching team karma data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTeamKarma();
    }, [filterType]);
    
    useEffect(() => {
        if (selectedTeam && teamData.length > 0) {
            const updated = teamData.find(t => t.teamName === selectedTeam.teamName);
            if (updated) setSelectedTeam(updated);
        }
    }, [teamData]);

    // Helper to get initials for avatar
    const getInitials = (name) => {
        if (!name) return "?";
        return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
    };

    const getAvatarBg = (username) => {
        const colors = ['#eff6ff', '#f0fdf4', '#fdf2f8', '#fff7ed', '#faf5ff', '#f0fdfa'];
        const textColors = ['#2563eb', '#16a34a', '#db2777', '#ea580c', '#9333ea', '#0d9488'];
        let hash = 0;
        for (let i = 0; i < (username || '').length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colors.length;
        return { bg: colors[index], text: textColors[index] };
    };

    const columns = [
        {
            title: 'Rank',
            key: 'rank',
            width: 80,
            align: 'center',
            render: (text, record, index) => {
                if (index === 0 && record.totalKarma > 0) return <span style={{ fontSize: '1.4rem' }} title="1st Place">🥇</span>;
                if (index === 1 && record.totalKarma > 0) return <span style={{ fontSize: '1.4rem' }} title="2nd Place">🥈</span>;
                if (index === 2 && record.totalKarma > 0) return <span style={{ fontSize: '1.4rem' }} title="3rd Place">🥉</span>;
                return <span style={{ fontWeight: 600, color: '#64748b' }}>{index + 1}</span>;
            }
        },
        {
            title: 'Team Member',
            key: 'member',
            render: (text, record) => {
                const avatarStyle = getAvatarBg(record.username);
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: avatarStyle.bg, color: avatarStyle.text,
                            fontWeight: 600, fontSize: '14px', flexShrink: 0
                        }}>
                            {getInitials(record.displayName)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{record.displayName}</span>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>{record.role || record.department}</span>
                        </div>
                    </div>
                );
            }
        },
        {
            title: 'Total Tasks',
            key: 'total_tasks',
            align: 'center',
            render: (text, record) => (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>{record.totalTasks}</span>
                </div>
            )
        },
        {
            title: 'Completed',
            key: 'completed',
            align: 'center',
            render: (text, record) => (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#16a34a' }}>
                        {filterType === 'all' ? record.totalCompleted : record.monthlyCompleted}
                    </span>
                </div>
            )
        },
        {
            title: 'In Progress',
            key: 'in_progress',
            align: 'center',
            render: (text, record) => (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#f59e0b' }}>{record.totalInProgress}</span>
                </div>
            )
        },
        {
            title: 'Not Started',
            key: 'not_started',
            align: 'center',
            render: (text, record) => (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#ef4444' }}>{record.totalNotStarted}</span>
                </div>
            )
        },
        {
            title: 'Breakdown',
            key: 'breakdown',
            render: (text, record) => (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {record.breakdown.critical > 0 && <Tag color="red">P1: {record.breakdown.critical}</Tag>}
                    {record.breakdown.high > 0 && <Tag color="orange">P2: {record.breakdown.high}</Tag>}
                    {record.breakdown.medium > 0 && <Tag color="blue">P3: {record.breakdown.medium}</Tag>}
                    {record.breakdown.low > 0 && <Tag color="default">P4: {record.breakdown.low}</Tag>}
                </div>
            )
        },
        {
            title: 'Karma Points',
            key: 'karma',
            align: 'right',
            render: (text, record) => {
                const points = filterType === 'all' ? record.totalKarma : record.monthlyKarma;
                return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '16px', color: '#0ea5e9' }}>{points}</span>
                        <TrophyOutlined style={{ color: '#eab308' }} />
                    </div>
                );
            }
        }
    ];

    // Add comparison columns if viewing 'This Month'
    if (filterType === 'month') {
        const karmaIndex = columns.findIndex(c => c.key === 'karma');
        columns.splice(karmaIndex, 0, {
            title: 'Last Month Karma',
            key: 'lastMonthKarma',
            align: 'right',
            render: (text, record) => (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '15px', color: '#64748b' }}>{record.lastMonthKarma}</span>
                    <TrophyOutlined style={{ color: '#94a3b8' }} />
                </div>
            )
        });
    }

    const filteredTeams = useMemo(() => {
        if (!searchQuery.trim()) return teamData;
        const search = searchQuery.toLowerCase();
        
        // Filter teams where team name, HOD name, or any member matches the search
        return teamData.map(team => {
            const teamMatches = team.teamName.toLowerCase().includes(search) || team.hodName.toLowerCase().includes(search);
            const matchingMembers = team.members.filter(user => {
                const name = (user.displayName || '').toLowerCase();
                const username = (user.username || '').toLowerCase();
                const dept = (user.department || '').toLowerCase();
                return name.includes(search) || username.includes(search) || dept.includes(search);
            });
            
            if (teamMatches) {
                return team; // Return full team if team name matches
            } else if (matchingMembers.length > 0) {
                return { ...team, members: matchingMembers }; // Return team with filtered members
            }
            return null;
        }).filter(Boolean);
    }, [teamData, searchQuery]);

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <Title level={3} style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TrophyOutlined style={{ color: '#eab308' }} />
                        Team Karma Leaderboard
                    </Title>
                    <Text type="secondary">View and track karma points for your team members based on their Open Points resolution. <strong>Green tasks add points, Red tasks deduct points.</strong></Text>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <Tag color="red" style={{ margin: 0 }}>🚨 Critical (P1): ±20</Tag>
                        <Tag color="orange" style={{ margin: 0 }}>🔥 High (P2): ±15</Tag>
                        <Tag color="blue" style={{ margin: 0 }}>⚡ Medium (P3): ±10</Tag>
                        <Tag color="default" style={{ margin: 0 }}>🌱 Low (P4): ±5</Tag>
                    </div>
                </div>
                
                <Space>
                    <Select 
                        value={filterType} 
                        onChange={setFilterType} 
                        style={{ width: 160 }}
                        suffixIcon={<FilterOutlined />}
                    >
                        <Option value="all">All Time (Total)</Option>
                        <Option value="month">This Month</Option>
                    </Select>
                    
                    <Input
                        placeholder="Search users or teams..."
                        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: 250, borderRadius: '6px' }}
                        allowClear
                    />
                </Space>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                    <Spin size="large" />
                </div>
            ) : filteredTeams.length === 0 ? (
                <Card style={{ textAlign: 'center', padding: '40px 0', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <Empty description={
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '16px', fontWeight: 500, color: '#64748b' }}>No Team Karma Data Found</span>
                            <span style={{ fontSize: '13px', color: '#94a3b8' }}>You either don't manage any teams, or there are no completed tasks yet.</span>
                        </div>
                    } />
                </Card>
            ) : selectedTeam ? (
                <Card 
                    bordered={false} 
                    style={{ 
                        borderRadius: '12px', 
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
                    }}
                    headStyle={{ borderBottom: '1px solid #f1f5f9', padding: '16px 24px' }}
                    bodyStyle={{ padding: '0' }}
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {teamData.length > 1 && (
                                <Button 
                                    type="text" 
                                    icon={<ArrowLeftOutlined />} 
                                    onClick={() => setSelectedTeam(null)}
                                    style={{ padding: '4px 8px' }}
                                >
                                    Back
                                </Button>
                            )}
                            <div style={{ padding: '8px', backgroundColor: '#eff6ff', borderRadius: '8px', color: '#3b82f6', display: 'flex' }}>
                                <TeamOutlined style={{ fontSize: '20px' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>{selectedTeam.teamName}</span>
                                <span style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>HOD: {selectedTeam.hodName}</span>
                            </div>
                        </div>
                    }
                >
                    <Table 
                        columns={columns} 
                        dataSource={selectedTeam.members} 
                        rowKey="userId"
                        pagination={false}
                        size="middle"
                        style={{ margin: 0 }}
                        components={{
                            header: {
                                cell: (props) => (
                                    <th {...props} style={{ ...props.style, background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                                )
                            }
                        }}
                    />
                </Card>
            ) : (
                <Row gutter={[24, 24]}>
                    {filteredTeams.map(team => (
                        <Col xs={24} sm={12} md={8} lg={8} key={team.teamName}>
                            <Card 
                                hoverable
                                onClick={() => setSelectedTeam(team)}
                                bordered={false} 
                                style={{ 
                                    borderRadius: '12px', 
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                                    height: '100%'
                                }}
                                bodyStyle={{ padding: '24px' }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
                                    <div style={{ padding: '16px', backgroundColor: '#eff6ff', borderRadius: '50%', color: '#3b82f6', display: 'flex', fontSize: '32px' }}>
                                        <TeamOutlined />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>{team.teamName}</span>
                                        <span style={{ fontSize: '14px', fontWeight: 400, color: '#64748b' }}>HOD: {team.hodName}</span>
                                    </div>
                                    <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #f1f5f9', width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#64748b', fontSize: '14px' }}>Members: <strong>{team.members.length}</strong></span>
                                        <span style={{ color: '#0ea5e9', fontSize: '14px', fontWeight: 600 }}>View Leaderboard &rarr;</span>
                                    </div>
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </div>
    );
};

export default KarmaPointsModule;
