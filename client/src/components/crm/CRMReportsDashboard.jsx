import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart2, Download, Table, TrendingUp, AlertTriangle, ChevronDown, ChevronRight, PieChart, Phone, Mail, Calendar, FileText, CheckCircle2, MinusCircle, XCircle } from 'lucide-react';
import FilterBar from './components/FilterBar';

export default function CRMReportsDashboard() {
  const user = JSON.parse(localStorage.getItem('exim_user') || '{}');
  const role = user.role || '';
  const crmRole = user.crmRole || '';
  const isHOD = role === 'HOD' || role === 'Head_of_Department' || (typeof role === 'string' && (role.toLowerCase() === 'hod' || role.toLowerCase() === 'head_of_department'));
  const isCrmAdmin = crmRole === 'Admin' || (typeof crmRole === 'string' && crmRole.toLowerCase() === 'admin');
  const isSystemAdmin = role === 'Admin' || (typeof role === 'string' && role.toLowerCase() === 'admin');
  const isAdmin = (isSystemAdmin || isCrmAdmin) && !isHOD;
  const isRestricted = !isAdmin || isHOD;
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(null);
  const [activeTab, setActiveTab] = useState('month'); // 'month' | 'week' | 'stage_analysis' | 'reps_overview'
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedVertical, setSelectedVertical] = useState('all');
  const [users, setUsers] = useState([]);
  const [selectedOwner, setSelectedOwner] = useState('all');

  const uniqueVerticals = [...new Set(teams.map(t => t.businessVertical).filter(Boolean))];

  // Stage Analysis Tab States
  const [analysisStage, setAnalysisStage] = useState('all');
  const [analysisData, setAnalysisData] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [expandedStages, setExpandedStages] = useState({}); // For 'all' stages expandable list

  // Activity Report States
  const [activityFilterType, setActivityFilterType] = useState('all');
  const [activityData, setActivityData] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);

  // Representatives Overview States
  const [repsData, setRepsData] = useState([]);
  const [repsLoading, setRepsLoading] = useState(false);
  const [repsSearchQuery, setRepsSearchQuery] = useState('');
  const [repsSelectedTeam, setRepsSelectedTeam] = useState('all');

  const fetchRepsOverview = async () => {
    setRepsLoading(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/reports/reps-overview`,
        { withCredentials: true }
      );
      setRepsData(res.data?.representatives || []);
    } catch (err) {
      console.error('Error fetching reps overview:', err);
    } finally {
      setRepsLoading(false);
    }
  };

  const fetchActivityReport = async (activeFilters = filters, ownerId = selectedOwner) => {
    if (!activeFilters) return;
    setActivityLoading(true);
    try {
      const params = { type: activityFilterType };
      if (activeFilters.startDate && activeFilters.endDate) {
        params.startDate = activeFilters.startDate;
        params.endDate = activeFilters.endDate;
      } else if (activeFilters.month) {
        params.period = activeFilters.month;
      }

      if (selectedTeam && selectedTeam !== 'all') params.teamId = selectedTeam;
      if (selectedVertical && selectedVertical !== 'all') params.businessVertical = selectedVertical;
      if (ownerId && ownerId !== 'all') params.userId = ownerId;

      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/reports/activity-report`,
        { params, withCredentials: true }
      );
      setActivityData(res.data);
    } catch (err) {
      console.error('Error fetching activity reports:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => {
      if (
        prev &&
        prev.type === newFilters.type &&
        prev.month === newFilters.month &&
        prev.startDate === newFilters.startDate &&
        prev.endDate === newFilters.endDate
      ) {
        return prev;
      }
      return newFilters;
    });
  };

  const fetchReport = async (activeFilters = filters, ownerId = selectedOwner) => {
    if (!activeFilters) return;
    setLoading(true);
    try {
      const params = {};
      if (activeFilters.startDate && activeFilters.endDate) {
        params.startDate = activeFilters.startDate;
        params.endDate = activeFilters.endDate;
      } else if (activeFilters.month) {
        params.period = activeFilters.month;
      }

      if (selectedTeam && selectedTeam !== 'all') params.teamId = selectedTeam;
      if (selectedVertical && selectedVertical !== 'all') params.businessVertical = selectedVertical;
      if (ownerId && ownerId !== 'all') params.ownerId = ownerId;

      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/reports/performance`,
        { params, withCredentials: true }
      );
      setReportData(res.data);
    } catch (err) {
      console.error('Error fetching performance reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysisReport = async (activeFilters = filters, ownerId = selectedOwner) => {
    if (!activeFilters) return;
    setAnalysisLoading(true);
    try {
      const params = { stage: analysisStage };
      if (activeFilters.startDate && activeFilters.endDate) {
        params.startDate = activeFilters.startDate;
        params.endDate = activeFilters.endDate;
      } else if (activeFilters.month) {
        params.period = activeFilters.month;
      }

      if (selectedTeam && selectedTeam !== 'all') params.teamId = selectedTeam;
      if (selectedVertical && selectedVertical !== 'all') params.businessVertical = selectedVertical;
      if (ownerId && ownerId !== 'all') params.ownerId = ownerId;

      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/reports/stage-analysis`,
        { params, withCredentials: true }
      );
      setAnalysisData(res.data);
    } catch (err) {
      console.error('Error fetching stage analysis reports:', err);
    } finally {
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    const fetchMyTeams = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/crm/teams/my-teams`,
          { withCredentials: true }
        );
        const fetchedTeams = res.data || [];
        setTeams(fetchedTeams);
        if (isRestricted && fetchedTeams.length > 0) {
          const verticals = [...new Set(fetchedTeams.map(t => t.businessVertical).filter(Boolean))];
          setSelectedTeam(fetchedTeams[0]._id);
          setRepsSelectedTeam(fetchedTeams[0].name);
          if (verticals.length > 0) {
            setSelectedVertical(verticals[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load user teams:', err);
      }
    };
    const fetchUsers = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-all-users`,
          { withCredentials: true }
        );
        setUsers(res.data || []);
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    };
    fetchMyTeams();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (isRestricted && teams.length > 0 && selectedTeam === 'all') {
      return;
    }
    const verticals = [...new Set(teams.map(t => t.businessVertical).filter(Boolean))];
    if (isRestricted && verticals.length > 0 && selectedVertical === 'all') {
      return;
    }
    if (filters) {
      fetchReport(filters, selectedOwner);
    }
  }, [filters, selectedTeam, selectedVertical, selectedOwner, teams]);

  useEffect(() => {
    if (isRestricted && teams.length > 0 && selectedTeam === 'all') {
      return;
    }
    const verticals = [...new Set(teams.map(t => t.businessVertical).filter(Boolean))];
    if (isRestricted && verticals.length > 0 && selectedVertical === 'all') {
      return;
    }
    if (filters && activeTab === 'stage_analysis') {
      fetchAnalysisReport(filters, selectedOwner);
    }
  }, [filters, activeTab, analysisStage, selectedTeam, selectedVertical, selectedOwner, teams]);

  useEffect(() => {
    if (isRestricted && teams.length > 0 && selectedTeam === 'all') {
      return;
    }
    const verticals = [...new Set(teams.map(t => t.businessVertical).filter(Boolean))];
    if (isRestricted && verticals.length > 0 && selectedVertical === 'all') {
      return;
    }
    if (filters && activeTab === 'activity') {
      fetchActivityReport(filters, selectedOwner);
    }
  }, [filters, activeTab, activityFilterType, selectedTeam, selectedVertical, selectedOwner, teams]);

  useEffect(() => {
    if (activeTab === 'reps_overview') {
      if (isAdmin) {
        fetchRepsOverview();
      } else {
        setActiveTab('month');
      }
    }
  }, [activeTab, isAdmin]);

  const handleExportCSV = () => {
    if (!reportData) return;

    let csvContent = "data:text/csv;charset=utf-8,";

    if (activeTab === 'month') {
      csvContent += "Stage Name,Deals Count,Total Value (INR),Weighted Value (INR)\n";
      reportData.performanceData.forEach(row => {
        csvContent += `${row.stage.toUpperCase()},${row.count},${row.value},${row.weightedValue}\n`;
      });
    } else {
      csvContent += "Week Name,Deals Count,Total Value (INR)\n";
      reportData.weekWise.forEach(row => {
        csvContent += `${row.name},${row.count},${row.value}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `crm_report_${activeTab}_wise_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAnalysis = () => {
    if (!analysisData || !analysisData.deals) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Deal Name,Company,Contact Person,Lead Source,Crate Size,Deal Value (INR),Probability (%),Weighted Value (INR),Stage Entry Date,Days in Stage,Assigned To,Status,Lost Reason\n";

    analysisData.deals.forEach(deal => {
      const contact = deal.primaryContactId ? `${deal.primaryContactId.firstName} ${deal.primaryContactId.lastName || ''}`.trim() : 'N/A';
      const assigned = deal.ownerId ? `${deal.ownerId.first_name || ''} ${deal.ownerId.last_name || ''}`.trim() || deal.ownerId.username : 'Unassigned';
      const entryDate = new Date(deal.stageEntryDate).toLocaleDateString('en-IN');
      const status = deal.carry_forward ? 'Carried Forward' : 'Active';
      const lostReason = deal.stage === 'lost' ? (deal.closeReason || 'N/A') : 'N/A';
      const companyName = typeof deal.accountId === 'object' ? (deal.accountId?.name || 'N/A') : (deal.accountId || 'N/A');

      const dName = `"${(deal.name || '').replace(/"/g, '""')}"`;
      const cName = `"${companyName.replace(/"/g, '""')}"`;
      const source = `"${(deal.source || 'N/A').replace(/"/g, '""')}"`;
      const crate = `"${(deal.crateSize || 'N/A').replace(/"/g, '""')}"`;

      csvContent += `${dName},${cName},"${contact}",${source},${crate},${deal.value || 0},${deal.probability || 0},${deal.weightedValue || 0},${entryDate},${deal.daysInStage || 0},"${assigned}",${status},"${lostReason}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `crm_stage_analysis_report_${analysisStage}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportActivityCSV = () => {
    if (!activityData || !activityData.activities) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Activity Type,Subject,Description,Related Record Type,Related Record Name,Outcome,Recorded By\n";

    activityData.activities.forEach(act => {
      const date = new Date(act.activityDate).toLocaleDateString('en-IN');
      const type = (act.type || 'N/A').toUpperCase();
      const subject = `"${(act.subject || '').replace(/"/g, '""')}"`;
      const description = `"${(act.description || '').replace(/"/g, '""')}"`;
      const relType = act.relatedTo?.model || 'N/A';
      const relName = `"${(act.relatedName || 'N/A').replace(/"/g, '""')}"`;
      const outcome = (act.outcome || 'N/A').toUpperCase();
      const recordedBy = act.userId ? `"${(`${act.userId.first_name || ''} ${act.userId.last_name || ''}`.trim() || act.userId.username).replace(/"/g, '""')}"` : 'Unknown';

      csvContent += `${date},${type},${subject},${description},${relType},${relName},${outcome},${recordedBy}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `crm_activity_report_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleStageExpand = (stageId) => {
    setExpandedStages(prev => ({
      ...prev,
      [stageId]: !prev[stageId]
    }));
  };

  
  
  const isManager = teams.some(t => {
    const mgrId = t.managerId?._id || t.managerId;
    const currentUserId = user._id || user.id;
    return mgrId?.toString() === currentUserId?.toString();
  });

  const getVisibleUsers = () => {
    if (isAdmin) {
      return users;
    }
    if (isManager) {
      const membersMap = new Map();
      teams.forEach(team => {
        const mgrId = team.managerId?._id || team.managerId;
        const currentUserId = user._id || user.id;
        if (mgrId?.toString() === currentUserId?.toString()) {
          if (team.memberIds && Array.isArray(team.memberIds)) {
            team.memberIds.forEach(member => {
              if (member) {
                const id = member._id?.toString() || member.toString();
                membersMap.set(id, member);
              }
            });
          }
          if (team.managerId && typeof team.managerId === 'object') {
            membersMap.set(team.managerId._id?.toString(), team.managerId);
          }
        }
      });
      return Array.from(membersMap.values());
    }
    return [];
  };

  const visibleUsers = getVisibleUsers();

  const summary = reportData?.summary || { totalValue: 0, totalDeals: 0, weightedPipelineValue: 0 };
  const performanceData = reportData?.performanceData || [];
  const weekWise = reportData?.weekWise || [];

  const lostSummary = performanceData.find(p => p.stage === 'lost')?.lostBreakdown || { price: 0, product: 0, noReply: 0, total: 0 };

  const PIPELINE_STAGES = [
    { id: 'lead', name: 'Lead', color: '#4f8ef7' },
    { id: 'qualified', name: 'Qualified', color: '#7b8ef7' },
    { id: 'opportunity', name: 'Opportunity', color: '#a47af7' },
    { id: 'sales_visit', name: 'Sales Visit', color: '#d45af7' },
    { id: 'proposal', name: 'Proposal', color: '#c47af7' },
    { id: 'negotiation', name: 'Negotiation', color: '#f77ac4' },
    { id: 'won', name: 'Won', color: '#00d4aa' },
    { id: 'lost', name: 'Lost', color: '#f75a5a' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Team and Vertical Filters */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '24px',
        padding: '16px 20px',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        alignItems: 'center',
        justifyContent: 'flex-start'
      }}>
        {(!isRestricted || teams.length > 1) && teams && teams.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Select Sales Team:</span>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              style={{
                padding: '8px 14px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '0.85rem',
                color: '#334155',
                background: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {!isRestricted && <option value="all">All Teams</option>}
              {teams.map(t => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        {(!isRestricted || uniqueVerticals.length > 1) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Select Vertical:</span>
            <select
              value={selectedVertical}
              onChange={(e) => setSelectedVertical(e.target.value)}
              style={{
                padding: '8px 14px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '0.85rem',
                color: '#334155',
                background: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {!isRestricted && <option value="all">All Verticals</option>}
              {isRestricted ? (
                uniqueVerticals.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))
              ) : (
                ['Paramount', 'Transportation', 'Customs Clearance', 'Export', 'Import'].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))
              )}
            </select>
          </div>
        )}

      </div>

      {/* Filters */}
      <FilterBar moduleName="reports" onChange={handleFilterChange} />

      {/* Representative report active banner */}
      {selectedOwner !== 'all' && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          padding: '12px 20px',
          borderRadius: '12px',
          fontSize: '0.85rem',
          color: '#1e40af',
          fontWeight: 600,
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            ℹ️ Viewing performance reports for representative: <strong style={{ color: '#1d4ed8' }}>{
              (() => {
                const repObj = users.find(u => (u._id?.toString() === selectedOwner.toString()) || (u.id?.toString() === selectedOwner.toString()));
                return repObj ? [repObj.first_name, repObj.last_name].filter(Boolean).join(' ') || repObj.username : 'Selected Representative';
              })()
            }</strong>
          </span>
          <button
            onClick={() => setSelectedOwner('all')}
            style={{
              padding: '6px 14px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
            onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}
          >
            Clear Person Filter
          </button>
        </div>
      )}

      {loading || !reportData ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div>
            <div style={{ fontSize: '18px', marginBottom: '12px' }}>⏳ Loading Sales Reports...</div>
            <div style={{ fontSize: '14px', color: '#94a3b8' }}>Aggregating deal statistics and trends</div>
          </div>
        </div>
      ) : (
        <>
          {/* Quick Summary Cards */}
          {activeTab === 'activity' ? (
            (() => {
              const actSummary = activityData?.summary || { totalCount: 0, typeBreakdown: { call: 0, email: 0, meeting: 0, demo: 0, note: 0 }, outcomeBreakdown: { positive: 0, neutral: 0, negative: 0 } };
              const totalAct = actSummary.totalCount;
              const positivePercent = totalAct > 0 ? Math.round((actSummary.outcomeBreakdown.positive / totalAct) * 100) : 0;
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '5px solid #3b82f6' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Total Activities</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>{totalAct}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Logged in period</div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '5px solid #10b981' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Calls Logged</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>{actSummary.typeBreakdown.call}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Phone outreach</div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '5px solid #f59e0b' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Emails Sent</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>{actSummary.typeBreakdown.email}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Email outreach logs</div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '5px solid #8b5cf6' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Meetings & Demos</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>{actSummary.typeBreakdown.meeting + actSummary.typeBreakdown.demo}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>High-touch sessions</div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '5px solid #10b981' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Positive Outcome Rate</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>{positivePercent}%</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>{actSummary.outcomeBreakdown.positive} positive outcomes</div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '5px solid #4f46e5' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Total Active Pipeline</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>₹{(summary.totalValue / 100000).toFixed(1)}L</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Across {summary.totalDeals} deals</div>
              </div>

              <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '5px solid #10b981' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Weighted Revenue Forecast</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>₹{(summary.weightedPipelineValue / 100000).toFixed(1)}L</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Based on win probabilities</div>
              </div>

              <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '5px solid #ef4444' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Deals Lost This Period</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>{lostSummary.total} Deals</div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Requires conversion reviews</div>
              </div>
            </div>
          )}

          {/* Main Panel */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {/* Header Tabs */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '4px', borderRadius: '10px' }}>
                <button
                  onClick={() => setActiveTab('month')}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    background: activeTab === 'month' ? '#ffffff' : 'transparent',
                    color: activeTab === 'month' ? '#1e293b' : '#64748b',
                    boxShadow: activeTab === 'month' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <BarChart2 size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> Stage-wise (Month)
                </button>
                <button
                  onClick={() => setActiveTab('week')}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    background: activeTab === 'week' ? '#ffffff' : 'transparent',
                    color: activeTab === 'week' ? '#1e293b' : '#64748b',
                    boxShadow: activeTab === 'week' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <TrendingUp size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> Week-wise Breakdown
                </button>
                <button
                  onClick={() => setActiveTab('stage_analysis')}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    background: activeTab === 'stage_analysis' ? '#ffffff' : 'transparent',
                    color: activeTab === 'stage_analysis' ? '#1e293b' : '#64748b',
                    boxShadow: activeTab === 'stage_analysis' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <Table size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> Stage Analysis (Granular)
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    background: activeTab === 'activity' ? '#ffffff' : 'transparent',
                    color: activeTab === 'activity' ? '#1e293b' : '#64748b',
                    boxShadow: activeTab === 'activity' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <Table size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> Activity Report
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setActiveTab('reps_overview')}
                    style={{
                      padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                      background: activeTab === 'reps_overview' ? '#ffffff' : 'transparent',
                      color: activeTab === 'reps_overview' ? '#1e293b' : '#64748b',
                      boxShadow: activeTab === 'reps_overview' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    <BarChart2 size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> Representatives Overview
                  </button>
                )}
              </div>

              {activeTab === 'stage_analysis' ? (
                <button
                  onClick={handleExportAnalysis}
                  disabled={!analysisData || !analysisData.deals || analysisData.deals.length === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px',
                    fontSize: '0.85rem', fontWeight: 600, color: '#475569', cursor: 'pointer', transition: 'all 0.2s', opacity: (!analysisData || !analysisData.deals || analysisData.deals.length === 0) ? 0.5 : 1
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff'; }}
                >
                  <Download size={16} /> Export Analysis CSV
                </button>
              ) : activeTab === 'activity' ? (
                <button
                  onClick={handleExportActivityCSV}
                  disabled={!activityData || !activityData.activities || activityData.activities.length === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px',
                    fontSize: '0.85rem', fontWeight: 600, color: '#475569', cursor: 'pointer', transition: 'all 0.2s', opacity: (!activityData || !activityData.activities || activityData.activities.length === 0) ? 0.5 : 1
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff'; }}
                >
                  <Download size={16} /> Export Activity CSV
                </button>
              ) : (
                <button
                  onClick={handleExportCSV}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px',
                    fontSize: '0.85rem', fontWeight: 600, color: '#475569', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff'; }}
                >
                  <Download size={16} /> Export CSV
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div style={{ padding: '24px' }}>
              {activeTab === 'month' && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', flexWrap: 'wrap' }}>
                  {/* Metrics Table */}
                  <div>
                    <h4 style={{ margin: '0 0 16px', color: '#334155', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Table size={18} /> Stage Summary
                    </h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <th style={{ padding: '12px 8px' }}>Stage</th>
                            <th style={{ padding: '12px 8px', textAlign: 'center' }}>Count</th>
                            <th style={{ padding: '12px 8px', textAlign: 'right' }}>Total Value</th>
                            <th style={{ padding: '12px 8px', textAlign: 'right' }}>Weighted Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {performanceData.map(row => (
                            <tr key={row.stage} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>
                              <td style={{ padding: '14px 8px', fontWeight: 600, color: '#334155', textTransform: 'capitalize' }}>{row.stage}</td>
                              <td style={{ padding: '14px 8px', textAlign: 'center', color: '#475569', fontWeight: 700 }}>{row.count}</td>
                              <td style={{ padding: '14px 8px', textAlign: 'right', color: '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>₹{row.value.toLocaleString('en-IN')}</td>
                              <td style={{ padding: '14px 8px', textAlign: 'right', color: '#4f46e5', fontWeight: 700, fontFamily: 'monospace' }}>₹{row.weightedValue.toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Chart & Lost Breakdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* CSS Bar Chart */}
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 16px', color: '#334155', fontWeight: 700 }}>Stage Counts Chart</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {performanceData.map(row => {
                          const maxVal = Math.max(...performanceData.map(p => p.count), 1);
                          const widthPercent = (row.count / maxVal) * 100;
                          return (
                            <div key={row.stage}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'capitalize' }}>
                                <span>{row.stage}</span>
                                <span>{row.count}</span>
                              </div>
                              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${widthPercent}%`, height: '100%', background: '#4f46e5', borderRadius: '4px', transition: 'width 0.5s ease-out' }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Lost Deals Breakdown */}
                    <div style={{ background: '#fef2f2', padding: '20px', borderRadius: '16px', border: '1px solid #fee2e2' }}>
                      <h4 style={{ margin: '0 0 12px', color: '#991b1b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={18} /> Lost Reasons breakdown
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7f1d1d' }}>
                          <span>Price Lost:</span>
                          <strong>{lostSummary.price} deals</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7f1d1d' }}>
                          <span>Product Lost:</span>
                          <strong>{lostSummary.product} deals</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7f1d1d' }}>
                          <span>No Response:</span>
                          <strong>{lostSummary.noReply} deals</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'week' && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 16px', color: '#334155', fontWeight: 700 }}>Weekly Performance Grid</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <th style={{ padding: '12px 8px' }}>Week Period</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center' }}>Total Deals</th>
                          <th style={{ padding: '12px 8px', textAlign: 'right' }}>Total Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weekWise.map(row => (
                          <tr key={row.name} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>
                            <td style={{ padding: '14px 8px', fontWeight: 600, color: '#334155' }}>{row.name}</td>
                            <td style={{ padding: '14px 8px', textAlign: 'center', color: '#475569', fontWeight: 700 }}>{row.count}</td>
                            <td style={{ padding: '14px 8px', textAlign: 'right', color: '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>₹{row.value.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 16px', color: '#334155', fontWeight: 700 }}>Weekly Value Breakdown</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {weekWise.map(row => {
                        const maxVal = Math.max(...weekWise.map(w => w.value), 1);
                        const heightPercent = (row.value / maxVal) * 100;
                        return (
                          <div key={row.name}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                              <span>{row.name}</span>
                              <span>₹{(row.value / 100000).toFixed(1)}L</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${heightPercent}%`, height: '100%', background: '#10b981', borderRadius: '4px' }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'stage_analysis' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Stage analysis sub header filter */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Select Stage for Analysis:</span>
                      <select
                        value={analysisStage}
                        onChange={e => setAnalysisStage(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <option value="all">All Stages (Grouped / Expandable)</option>
                        {PIPELINE_STAGES.map(st => (
                          <option key={st.id} value={st.id}>{st.name}</option>
                        ))}
                      </select>
                    </div>

                    {analysisData && analysisStage !== 'all' && (
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
                        <span style={{ color: '#64748b' }}>
                          Conversion Rate: <strong style={{ color: '#10b981' }}>{analysisData.summary?.conversionRate || 0}%</strong>
                        </span>
                        <span style={{ color: '#64748b' }}>
                          Avg Days in Stage: <strong style={{ color: '#4f46e5' }}>{analysisData.summary?.averageDaysInStage || 0} days</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {analysisLoading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                      ⏳ Loading Granular Stage Reports...
                    </div>
                  ) : !analysisData ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      No data loaded. Apply filters or change analysis stage selection.
                    </div>
                  ) : analysisStage === 'all' ? (
                    /* Collapsed Stage Summary Rows expandable to show list */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ overflowX: 'auto', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid #f1f5f9', background: '#f8fafc', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              <th style={{ padding: '12px 16px', width: '40px' }}></th>
                              <th style={{ padding: '12px 16px' }}>Stage</th>
                              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Deals Count</th>
                              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Value</th>
                              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Weighted Forecast</th>
                              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Avg Days in Stage</th>
                              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Pipeline Share</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analysisData.allStagesSummary?.map(stRow => {
                              const isExpanded = !!expandedStages[stRow.stage];
                              const stageColor = PIPELINE_STAGES.find(s => s.id === stRow.stage)?.color || '#64748b';
                              const matchingDeals = analysisData.deals?.filter(d => d.stage === stRow.stage) || [];

                              return (
                                <React.Fragment key={stRow.stage}>
                                  <tr
                                    onClick={() => toggleStageExpand(stRow.stage)}
                                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s', background: isExpanded ? '#f8fafc' : 'transparent' }}
                                    onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = '#fafafa'; }}
                                    onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
                                  >
                                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#94a3b8' }}>
                                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                    </td>
                                    <td style={{ padding: '14px 16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'capitalize', color: '#1e293b' }}>
                                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: stageColor }}></span>
                                      {stRow.stage}
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>
                                      {stRow.count} {stRow.count === 1 ? 'deal' : 'deals'}
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                                      ₹{stRow.value ? (stRow.value / 100000).toFixed(2) + 'L' : '0.00L'}
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#4f46e5', fontFamily: 'monospace' }}>
                                      ₹{stRow.weightedValue ? (stRow.weightedValue / 100000).toFixed(2) + 'L' : '0.00L'}
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                                      {stRow.avgDaysInStage} days
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>
                                      {stRow.percentage}%
                                    </td>
                                  </tr>

                                  {isExpanded && (
                                    <tr>
                                      <td colSpan="7" style={{ padding: '0 0 16px 0', background: '#f8fafc' }}>
                                        <div style={{ padding: '16px 24px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', margin: '0 24px 12px 48px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                                          <h5 style={{ margin: '0 0 12px 0', color: '#475569', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                            Granular list: {stRow.stage.toUpperCase()}
                                          </h5>
                                          {matchingDeals.length === 0 ? (
                                            <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '8px 0' }}>
                                              No deal records found under this stage for selected filters.
                                            </div>
                                          ) : (
                                            <div style={{ overflowX: 'auto' }}>
                                              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                                                <thead>
                                                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 700 }}>
                                                    <th style={{ padding: '8px' }}>Deal Name</th>
                                                    <th style={{ padding: '8px' }}>Company</th>
                                                    <th style={{ padding: '8px', textAlign: 'right' }}>Value</th>
                                                    <th style={{ padding: '8px', textAlign: 'center' }}>Prob (%)</th>
                                                    <th style={{ padding: '8px' }}>Source</th>
                                                    <th style={{ padding: '8px', textAlign: 'center' }}>Days In Stage</th>
                                                    <th style={{ padding: '8px' }}>Assigned salesperson</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {matchingDeals.map(d => {
                                                    const assignedName = d.ownerId ? `${d.ownerId.first_name || ''} ${d.ownerId.last_name || ''}`.trim() || d.ownerId.username : 'Unassigned';
                                                    const comp = typeof d.accountId === 'object' ? (d.accountId?.name || 'N/A') : (d.accountId || 'N/A');

                                                    return (
                                                      <tr key={d._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                        <td style={{ padding: '10px 8px', fontWeight: 600, color: '#1e293b' }}>
                                                          {d.name} {d.carry_forward && '🔄'}
                                                        </td>
                                                        <td style={{ padding: '10px 8px', color: '#475569' }}>{comp}</td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                                                          ₹{d.value ? d.value.toLocaleString('en-IN') : '0'}
                                                        </td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#4f46e5' }}>{d.probability}%</td>
                                                        <td style={{ padding: '10px 8px', color: '#64748b' }}>{d.source || 'N/A'}</td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#eab308', fontWeight: 600 }}>{d.daysInStage} days</td>
                                                        <td style={{ padding: '10px 8px', color: '#475569' }}>{assignedName}</td>
                                                      </tr>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* Single Stage Granular Reports Table View */
                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '24px', flexWrap: 'wrap' }}>
                      {/* Deal records list table */}
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', overflowX: 'auto' }}>
                        <h4 style={{ margin: '0 0 16px', color: '#334155', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Table size={18} /> Deal-Level Records list
                        </h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              <th style={{ padding: '12px 10px' }}>Deal Name</th>
                              <th style={{ padding: '12px 10px' }}>Company Name</th>
                              <th style={{ padding: '12px 10px' }}>Source</th>
                              <th style={{ padding: '12px 10px', textAlign: 'right' }}>Value</th>
                              <th style={{ padding: '12px 10px', textAlign: 'center' }}>Prob</th>
                              <th style={{ padding: '12px 10px', textAlign: 'right' }}>Weighted (₹)</th>
                              <th style={{ padding: '12px 10px', textAlign: 'center' }}>Days in Stage</th>
                              <th style={{ padding: '12px 10px' }}>Assigned salesperson</th>
                              {analysisStage === 'lost' && <th style={{ padding: '12px 10px' }}>Lost Reason</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {analysisData.deals?.length === 0 ? (
                              <tr>
                                <td colSpan={analysisStage === 'lost' ? 9 : 8} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                                  No deal records found in this stage for selected filters.
                                </td>
                              </tr>
                            ) : (
                              analysisData.deals?.map(deal => {
                                const assigned = deal.ownerId ? `${deal.ownerId.first_name || ''} ${deal.ownerId.last_name || ''}`.trim() || deal.ownerId.username : 'Unassigned';
                                const compName = typeof deal.accountId === 'object' ? (deal.accountId?.name || 'N/A') : (deal.accountId || 'N/A');
                                return (
                                  <tr key={deal._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                                    <td style={{ padding: '12px 10px', fontWeight: 600, color: '#1e293b' }}>
                                      {deal.name} {deal.carry_forward && '🔄'}
                                    </td>
                                    <td style={{ padding: '12px 10px', color: '#475569' }}>{compName}</td>
                                    <td style={{ padding: '12px 10px', color: '#64748b' }}>{deal.source || 'N/A'}</td>
                                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                                      ₹{(deal.value || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700, color: '#4f46e5' }}>{deal.probability}%</td>
                                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, color: '#00d4aa', fontFamily: 'monospace' }}>
                                      ₹{(deal.weightedValue || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td style={{ padding: '12px 10px', textAlign: 'center', color: '#eab308', fontWeight: 600 }}>{deal.daysInStage} days</td>
                                    <td style={{ padding: '12px 10px', color: '#475569' }}>{assigned}</td>
                                    {analysisStage === 'lost' && (
                                      <td style={{ padding: '12px 10px', color: '#ef4444', fontWeight: 600 }}>
                                        {deal.closeReason || 'N/A'}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                          {/* CR-011 Aggregated Summary Row */}
                          {analysisData.deals?.length > 0 && (
                            <tfoot>
                              <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0', fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>
                                <td colSpan="3" style={{ padding: '14px 10px' }}>Total stage Aggregates:</td>
                                <td style={{ padding: '14px 10px', textAlign: 'right', color: '#10b981', fontFamily: 'monospace' }}>
                                  ₹{(analysisData.summary?.totalValue || 0).toLocaleString('en-IN')}
                                </td>
                                <td style={{ padding: '14px 10px' }}></td>
                                <td style={{ padding: '14px 10px', textAlign: 'right', color: '#00d4aa', fontFamily: 'monospace' }}>
                                  ₹{(analysisData.summary?.totalWeightedValue || 0).toLocaleString('en-IN')}
                                </td>
                                <td style={{ padding: '14px 10px', textAlign: 'center', color: '#eab308' }}>
                                  {analysisData.summary?.averageDaysInStage} days (avg)
                                </td>
                                <td colSpan={analysisStage === 'lost' ? 2 : 1} style={{ padding: '14px 10px', color: '#64748b' }}>
                                  Total: {analysisData.summary?.totalDeals} deals
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>

                      {/* Lead Source breakdown details widget */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                          <h4 style={{ margin: '0 0 16px', color: '#334155', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <PieChart size={18} /> Lead Source share
                          </h4>
                          {analysisData.sourceBreakdown?.length === 0 ? (
                            <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
                              No source tag records.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                              {analysisData.sourceBreakdown?.map(srcRow => {
                                const maxPercent = Math.max(...analysisData.sourceBreakdown.map(s => s.percentage), 1);
                                const progressWidth = srcRow.percentage;
                                return (
                                  <div key={srcRow.source}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                      <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={srcRow.source}>
                                        {srcRow.source}
                                      </span>
                                      <span>{srcRow.count} deals | {srcRow.percentage}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                      <div style={{
                                        width: `${progressWidth}%`,
                                        height: '100%',
                                        background: srcRow.source === 'IndiaMart Lead' ? '#f97316'
                                          : srcRow.source === 'Referral' ? '#22c55e'
                                            : srcRow.source === 'Direct Sales Visit' ? '#a855f7'
                                              : srcRow.source === 'Email Campaign' ? '#ec4899'
                                                : srcRow.source === 'Web / Own Generated Lead' ? '#3b82f6'
                                                  : '#64748b',
                                        borderRadius: '4px'
                                      }}></div>
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px', fontWeight: 600 }}>
                                      ₹{(srcRow.value / 100000).toFixed(1)}L
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'activity' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Activity filter toolbar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Filter by Activity Type:</span>
                      <select
                        value={activityFilterType}
                        onChange={e => setActivityFilterType(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <option value="all">All Activity Types</option>
                        <option value="call">Call</option>
                        <option value="email">Email</option>
                        <option value="meeting">Meeting</option>
                        <option value="demo">Demo</option>
                        <option value="note">Note</option>
                      </select>
                    </div>
                  </div>

                  {activityLoading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                      ⏳ Loading Activity Report...
                    </div>
                  ) : !activityData || !activityData.activities || activityData.activities.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                      No activities found matching the selected filters.
                    </div>
                  ) : (
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <th style={{ padding: '12px 10px', width: '120px' }}>Date</th>
                            <th style={{ padding: '12px 10px', width: '120px' }}>Type</th>
                            <th style={{ padding: '12px 10px' }}>Subject</th>
                            <th style={{ padding: '12px 10px' }}>Description</th>
                            <th style={{ padding: '12px 10px', width: '180px' }}>Related To</th>
                            <th style={{ padding: '12px 10px', width: '120px', textAlign: 'center' }}>Outcome</th>
                            <th style={{ padding: '12px 10px', width: '150px' }}>Recorded By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activityData.activities.map(act => {
                            const date = new Date(act.activityDate).toLocaleDateString('en-IN');
                            const typeLabel = (act.type || 'note');
                            const outcomeLabel = (act.outcome || 'neutral');

                            // Icon mapping
                            let typeIcon = <FileText size={14} />;
                            let typeColor = '#64748b';
                            if (typeLabel === 'call') { typeIcon = <Phone size={14} />; typeColor = '#10b981'; }
                            else if (typeLabel === 'email') { typeIcon = <Mail size={14} />; typeColor = '#3b82f6'; }
                            else if (typeLabel === 'meeting') { typeIcon = <Calendar size={14} />; typeColor = '#8b5cf6'; }
                            else if (typeLabel === 'demo') { typeIcon = <TrendingUp size={14} />; typeColor = '#f59e0b'; }

                            // Outcome badge
                            let outcomeBadge = (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: '#f1f5f9', color: '#475569' }}>
                                <MinusCircle size={12} /> Neutral
                              </span>
                            );
                            if (outcomeLabel === 'positive') {
                              outcomeBadge = (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: '#ecfdf5', color: '#065f46' }}>
                                  <CheckCircle2 size={12} /> Positive
                                </span>
                              );
                            } else if (outcomeLabel === 'negative') {
                              outcomeBadge = (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: '#fef2f2', color: '#991b1b' }}>
                                  <XCircle size={12} /> Negative
                                </span>
                              );
                            }

                            const userName = act.userId ? `${act.userId.first_name || ''} ${act.userId.last_name || ''}`.trim() || act.userId.username : 'Unknown';

                            return (
                              <tr key={act._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                                <td style={{ padding: '12px 10px', color: '#475569', fontWeight: 500 }}>{date}</td>
                                <td style={{ padding: '12px 10px' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, background: `${typeColor}15`, color: typeColor, textTransform: 'uppercase' }}>
                                    {typeIcon} {typeLabel}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 10px', fontWeight: 600, color: '#1e293b' }}>{act.subject}</td>
                                <td style={{ padding: '12px 10px', color: '#64748b', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={act.description}>
                                  {act.description || 'No description'}
                                </td>
                                <td style={{ padding: '12px 10px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 600, color: '#475569' }}>{act.relatedName}</span>
                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>{act.relatedTo?.model || 'N/A'}</span>
                                  </div>
                                </td>
                                <td style={{ padding: '12px 10px', textAlign: 'center' }}>{outcomeBadge}</td>
                                <td style={{ padding: '12px 10px', color: '#475569', fontWeight: 500 }}>{userName}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reps_overview' && isAdmin && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Filters inside tab */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', background: '#f8fafc', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Search Representative:</span>
                      <input
                        type="text"
                        placeholder="Search by name or username..."
                        value={repsSearchQuery}
                        onChange={(e) => setRepsSearchQuery(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                        }}
                      />
                    </div>

                    {(!isRestricted || teams.length > 1) && teams && teams.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '200px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Team:</span>
                        <select
                          value={repsSelectedTeam}
                          onChange={(e) => setRepsSelectedTeam(e.target.value)}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            background: '#fff',
                            outline: 'none',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {!isRestricted && <option value="all">All Teams</option>}
                          {teams.map(t => (
                            <option key={t._id} value={t.name}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {repsLoading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                      ⏳ Loading Representatives Performance Grid...
                    </div>
                  ) : (() => {
                    const filtered = repsData.filter(rep => {
                      const matchesSearch = (rep.name || '').toLowerCase().includes(repsSearchQuery.toLowerCase()) || 
                                            (rep.username || '').toLowerCase().includes(repsSearchQuery.toLowerCase());
                      const matchesTeam = repsSelectedTeam === 'all' || (rep.teams || []).includes(repsSelectedTeam);
                      return matchesSearch && matchesTeam;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                          No representatives match the selected filters.
                        </div>
                      );
                    }

                    return (
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              <th style={{ padding: '12px 10px' }}>Representative Name</th>
                              <th style={{ padding: '12px 10px' }}>Teams</th>
                              <th style={{ padding: '12px 10px' }}>Role</th>
                              <th style={{ padding: '12px 10px', textAlign: 'center' }}>Total Leads</th>
                              <th style={{ padding: '12px 10px', textAlign: 'center' }}>Active Deals</th>
                              <th style={{ padding: '12px 10px', textAlign: 'right' }}>Active Pipeline</th>
                              <th style={{ padding: '12px 10px', textAlign: 'right' }}>Closed Won (MTD)</th>
                              <th style={{ padding: '12px 10px', textAlign: 'center' }}>Pending Tasks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map(rep => (
                              <tr 
                                key={rep.userId} 
                                onClick={() => {
                                  setSelectedOwner(rep.userId);
                                  setActiveTab('month');
                                }}
                                style={{ 
                                  borderBottom: '1px solid #f1f5f9', 
                                  fontSize: '0.85rem', 
                                  cursor: 'pointer',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                title="Click to view detailed person report"
                              >
                                <td style={{ padding: '14px 10px', fontWeight: 700, color: '#1e293b' }}>
                                  {rep.name}
                                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>@{rep.username}</div>
                                </td>
                                <td style={{ padding: '14px 10px' }}>
                                  {rep.teams && rep.teams.length > 0 ? (
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                      {rep.teams.map(t => (
                                        <span key={t} style={{ padding: '2px 8px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontSize: '0.7rem', fontWeight: 600 }}>
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>None</span>
                                  )}
                                </td>
                                <td style={{ padding: '14px 10px', color: '#475569', fontWeight: 500 }}>{rep.role}</td>
                                <td style={{ padding: '14px 10px', textAlign: 'center', color: '#4f46e5', fontWeight: 700 }}>{rep.totalLeads}</td>
                                <td style={{ padding: '14px 10px', textAlign: 'center', color: '#0891b2', fontWeight: 700 }}>{rep.totalDeals}</td>
                                <td style={{ padding: '14px 10px', textAlign: 'right', color: '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>
                                  ₹{(rep.pipelineValue || 0).toLocaleString('en-IN')}
                                </td>
                                <td style={{ padding: '14px 10px', textAlign: 'right', color: '#059669', fontWeight: 700, fontFamily: 'monospace' }}>
                                  ₹{(rep.wonValue || 0).toLocaleString('en-IN')}
                                </td>
                                <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                                  {rep.pendingTasks > 0 ? (
                                    <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#fef2f2', color: '#b91c1c', fontWeight: 700, fontSize: '0.75rem' }}>
                                      {rep.pendingTasks}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#94a3b8' }}>0</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
