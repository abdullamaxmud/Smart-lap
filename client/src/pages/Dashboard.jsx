import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { AlertCircle, CheckCircle, Clock, FileText, ArrowUpRight, PlusCircle, RefreshCw } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area
} from 'recharts';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { StatCard, StatusBadge, PriorityBadge, PageLoader, EmptyState } from '../components/ui';
import { errorMessage, timeAgo } from '../utils/format';

const STATUS_COLORS = { Pending: '#f59e0b', 'In Progress': '#3b82f6', Resolved: '#10b981' };

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [recentIssues, setRecentIssues] = useState([]);
    const [loading, setLoading] = useState(true);

    const isStaff = ['super_admin', 'admin'].includes(user?.role);
    const isTech = user?.role === 'technician';

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const params = { limit: 6 };
            if (isTech) params.mine = 'true';
            const [statsRes, reportsRes] = await Promise.all([
                axios.get('/api/reports/stats'),
                axios.get('/api/reports', { params })
            ]);
            setStats(statsRes.data.data);
            setRecentIssues(reportsRes.data.data);
        } catch (err) {
            toast.error(errorMessage(err, 'Failed to load dashboard'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?._id]);

    const pieData = stats
        ? [
            { name: 'Pending', value: stats.pendingIssues },
            { name: 'In Progress', value: stats.inProgressIssues },
            { name: 'Resolved', value: stats.resolvedIssues }
        ].filter((d) => d.value > 0)
        : [];

    const trendData = (stats?.dailyStats || []).map((d) => ({
        ...d,
        label: new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }));

    const scopeLabel = isStaff ? 'across all labs' : isTech ? 'assigned to you' : 'that you reported';
    const viewAllPath = user?.role === 'user' ? '/my-reports' : '/manage-issues';

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar
                title="Dashboard"
                subtitle={`Welcome back, ${user?.name?.split(' ')[0] || ''}`}
                actions={
                    <button onClick={fetchDashboardData} className="btn-icon" aria-label="Refresh" disabled={loading}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                }
            />

            {loading && !stats ? (
                <PageLoader />
            ) : (
                <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
                        <StatCard
                            title="Total Issues"
                            value={stats?.totalIssues ?? 0}
                            icon={<FileText className="text-blue-600" />}
                            hint={`${stats?.createdThisWeek ?? 0} new in the last 7 days · ${scopeLabel}`}
                            tone="bg-blue-50"
                        />
                        <StatCard
                            title="Pending"
                            value={stats?.pendingIssues ?? 0}
                            icon={<AlertCircle className="text-amber-600" />}
                            hint={isStaff ? `${stats?.unassignedIssues ?? 0} open issue(s) not yet assigned` : 'Waiting for a technician'}
                            tone="bg-amber-50"
                        />
                        <StatCard
                            title="In Progress"
                            value={stats?.inProgressIssues ?? 0}
                            icon={<Clock className="text-sky-600" />}
                            hint="Currently being worked on"
                            tone="bg-sky-50"
                        />
                        <StatCard
                            title="Resolved"
                            value={stats?.resolvedIssues ?? 0}
                            icon={<CheckCircle className="text-emerald-600" />}
                            hint={`${stats?.resolvedThisWeek ?? 0} this week${stats?.avgResolutionHours != null ? ` · avg ${stats.avgResolutionHours}h to fix` : ''}`}
                            tone="bg-emerald-50"
                        />
                    </div>

                    {user?.role === 'user' && (
                        <div className="card bg-gradient-to-r from-hu-blue to-[#0055aa] text-white border-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold heading-font">Something not working in the lab?</h3>
                                <p className="text-sm text-blue-100">Report it in under a minute and a technician will be assigned.</p>
                            </div>
                            <Link to="/report" className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-hu-gold text-slate-900 font-bold rounded-lg hover:brightness-95">
                                <PlusCircle size={18} /> Report a Problem
                            </Link>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 card">
                            <h3 className="text-lg font-bold heading-font">Reporting Trend</h3>
                            <p className="text-xs text-slate-400 mb-4">New reports per day, last 30 days</p>
                            <div className="h-[260px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData} margin={{ left: -20, right: 8 }}>
                                        <defs>
                                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#003366" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#003366" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} interval={4} />
                                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                        <Tooltip formatter={(v) => [v, 'Reports']} />
                                        <Area type="monotone" dataKey="count" stroke="#003366" fill="url(#colorCount)" strokeWidth={2.5} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="card">
                            <h3 className="text-lg font-bold heading-font">Status Distribution</h3>
                            <p className="text-xs text-slate-400 mb-2">Issues {scopeLabel}</p>
                            {pieData.length === 0 ? (
                                <EmptyState title="No data yet" message="Statistics appear once reports exist." />
                            ) : (
                                <>
                                    <div className="h-[180px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={pieData} innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                                                    {pieData.map((entry) => (
                                                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-2 mt-4">
                                        {pieData.map((item) => (
                                            <div key={item.name} className="flex justify-between items-center text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.name] }} />
                                                    <span className="text-slate-600 font-medium">{item.name}</span>
                                                </div>
                                                <span className="font-bold">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {(stats?.categoryDistribution?.length > 0 || (isStaff && stats?.topLabs?.length > 0)) && (
                        <div className={`grid grid-cols-1 ${isStaff ? 'lg:grid-cols-2' : ''} gap-6`}>
                            <div className="card">
                                <h3 className="text-lg font-bold heading-font mb-4">Issues by Category</h3>
                                <div className="h-[220px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.categoryDistribution} margin={{ left: -20 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                            <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(v) => [v, 'Reports']} />
                                            <Bar dataKey="count" fill="#003366" radius={[6, 6, 0, 0]} maxBarSize={48} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            {isStaff && (
                                <div className="card">
                                    <h3 className="text-lg font-bold heading-font mb-4">Labs With Most Issues</h3>
                                    <div className="space-y-4">
                                        {stats.topLabs.map((lab) => {
                                            const pct = Math.round((lab.count / (stats.topLabs[0]?.count || 1)) * 100);
                                            return (
                                                <div key={lab.name}>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="font-medium text-slate-700">{lab.name}</span>
                                                        <span className="font-bold text-slate-900">{lab.count}</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-hu-blue rounded-full" style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="card p-0 overflow-hidden">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                            <h3 className="text-lg font-bold heading-font">Recent Problem Reports</h3>
                            <Link to={viewAllPath} className="text-hu-blue text-sm font-bold flex items-center gap-1 hover:underline">
                                View All <ArrowUpRight size={16} />
                            </Link>
                        </div>
                        {recentIssues.length === 0 ? (
                            <EmptyState title="No reports yet" message="New problem reports will show up here." />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr>
                                            <th className="table-head">Reporter</th>
                                            <th className="table-head">Lab / Computer</th>
                                            <th className="table-head">Category</th>
                                            <th className="table-head">Priority</th>
                                            <th className="table-head">Status</th>
                                            <th className="table-head">Reported</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {recentIssues.map((issue) => (
                                            <tr key={issue._id} className="hover:bg-slate-50 transition-colors">
                                                <td className="table-cell">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 shrink-0 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-hu-blue">
                                                            {issue.user?.name?.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-slate-800 truncate">{issue.user?.name || 'Deleted user'}</p>
                                                            <p className="text-xs text-slate-400 truncate">{issue.department?.name}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="table-cell whitespace-nowrap">
                                                    <p className="font-medium text-slate-700">{issue.lab?.name}</p>
                                                    <p className="text-xs text-slate-400">PC {issue.computerNumber}</p>
                                                </td>
                                                <td className="table-cell">{issue.category}</td>
                                                <td className="table-cell"><PriorityBadge priority={issue.priority} /></td>
                                                <td className="table-cell"><StatusBadge status={issue.status} /></td>
                                                <td className="table-cell text-slate-500 whitespace-nowrap">{timeAgo(issue.createdAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
