import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import { 
    Megaphone, Target, TrendingUp, Download, 
    Calendar, Loader2, BarChart3, PieChart as PieChartIcon,
    Filter, MapPin, Users, Activity, FilterX, User
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, 
    Tooltip as RechartsTooltip, ResponsiveContainer, 
    BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

export const MarketingOverviewPage = () => {
    const user = useAuthStore((state: any) => state.user);

    // --- RAW DATA STATE ---
    const [leads, setLeads] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [officers, setOfficers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- FILTER STATE ---
    const [filterBranch, setFilterBranch] = useState('ALL');
    const [filterOfficer, setFilterOfficer] = useState('ALL');
    const [filterPeriod, setFilterPeriod] = useState('THIS_MONTH');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    useEffect(() => {
        const fetchMarketingData = async () => {
            if (!user?.lender_id && user?.role !== 'Super Admin') return;
            
            setIsLoading(true);
            try {
                const activeLenderId = user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e';
                const queryParams = `?lender_id=${activeLenderId}`;

                const [leadsRes, branchesRes, usersRes] = await Promise.all([
                    api.get(`/leads${queryParams}`),
                    api.get(`/branches${queryParams}`).catch(() => ({ data: [] })),
                    api.get(`/users${queryParams}`).catch(() => ({ data: [] }))
                ]);

                // Defensive extraction
                const extractedLeads = Array.isArray(leadsRes.data) ? leadsRes.data : (leadsRes.data?.data || []);
                const extractedBranches = Array.isArray(branchesRes.data) ? branchesRes.data : (branchesRes.data?.data || []);
                const extractedUsers = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.data || []);

                setLeads(extractedLeads);
                setBranches(extractedBranches);
                
                // Filter for actionable officers
                setOfficers(extractedUsers.filter((u: any) => 
                    ['Loan Officer', 'Branch Manager'].includes(u.role?.name) || u.role_id === 4 || u.role_id === 3
                ));

            } catch (error) {
                console.error('Failed to fetch marketing data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMarketingData();
    }, [user]);

    // --- DATA AGGREGATION ENGINE ---
    const { filteredLeads, kpis, funnelData, sourceData, timelineData } = useMemo(() => {
        // 1. Resolve Date Range
        const now = new Date();
        let start = new Date(0); 
        let end = new Date();
        let groupBy = 'DAY';

        if (filterPeriod === 'TODAY') {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            end = new Date(start);
            end.setHours(23, 59, 59, 999);
        } else if (filterPeriod === 'YESTERDAY') {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            end = new Date(start);
            end.setHours(23, 59, 59, 999);
        } else if (filterPeriod === 'THIS_WEEK') {
            start = new Date(now);
            start.setDate(now.getDate() - now.getDay());
            start.setHours(0, 0, 0, 0);
        } else if (filterPeriod === 'THIS_MONTH') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (filterPeriod === 'THIS_YEAR') {
            start = new Date(now.getFullYear(), 0, 1);
            groupBy = 'MONTH';
        } else if (filterPeriod === 'CUSTOM' && customStart && customEnd) {
            start = new Date(customStart);
            start.setHours(0, 0, 0, 0);
            end = new Date(customEnd);
            end.setHours(23, 59, 59, 999);
            const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
            if (diffDays > 60) groupBy = 'MONTH';
        }

        // 2. Apply Filters
        const filtered = leads.filter(l => {
            const d = new Date(l.created_at);
            if (d < start || d > end) return false;
            if (filterBranch !== 'ALL' && l.branch_id !== filterBranch) return false;
            if (filterOfficer !== 'ALL' && l.assigned_to !== filterOfficer) return false;
            return true;
        });

        // 3. Compute KPIs
        const totalLeads = filtered.length;
        const converted = filtered.filter(l => l.status === 'CONVERTED').length;
        const conversionRate = totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(1) : '0.0';
        const activePipeline = filtered.filter(l => ['NEW', 'CONTACTED', 'QUALIFIED'].includes(l.status)).length;
        const lostLeads = filtered.filter(l => l.status === 'LOST').length;

        // 4. Compute Funnel Chart (Cascading logic)
        const contactedCount = filtered.filter(l => ['CONTACTED', 'QUALIFIED', 'CONVERTED'].includes(l.status)).length;
        const qualifiedCount = filtered.filter(l => ['QUALIFIED', 'CONVERTED'].includes(l.status)).length;
        
        const funnel = [
            { stage: '1. Total Leads', count: totalLeads, fill: '#3B82F6' },
            { stage: '2. Contacted', count: contactedCount, fill: '#8B5CF6' },
            { stage: '3. Qualified', count: qualifiedCount, fill: '#F59E0B' },
            { stage: '4. Converted', count: converted, fill: '#10B981' }
        ];

        // 5. Compute Source Distribution (Pie Chart)
        const sourceMap = filtered.reduce((acc: any, lead) => {
            const src = lead.source || 'Unknown';
            acc[src] = (acc[src] || 0) + 1;
            return acc;
        }, {});

        const sources = Object.keys(sourceMap).map((key, i) => ({
            name: key,
            value: sourceMap[key],
            color: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#64748B'][i % 6]
        })).sort((a, b) => b.value - a.value);

        // 6. Compute Timeline (Area Chart)
        const timeMap = new Map();
        const formatLabel = (date: Date) => groupBy === 'MONTH' 
            ? date.toLocaleString('default', { month: 'short', year: 'numeric' })
            : date.toLocaleString('default', { day: '2-digit', month: 'short' });

        // Initialize buckets
        let cursor = new Date(start);
        while (cursor <= end && cursor <= now) {
            const lbl = formatLabel(cursor);
            if (!timeMap.has(lbl)) {
                timeMap.set(lbl, { label: lbl, newLeads: 0, converted: 0, rawDate: new Date(cursor) });
            }
            if (groupBy === 'DAY') cursor.setDate(cursor.getDate() + 1);
            else cursor.setMonth(cursor.getMonth() + 1);
        }

        filtered.forEach(l => {
            const lbl = formatLabel(new Date(l.created_at));
            if (timeMap.has(lbl)) {
                const item = timeMap.get(lbl);
                item.newLeads += 1;
                if (l.status === 'CONVERTED') item.converted += 1;
            }
        });

        const timeline = Array.from(timeMap.values()).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

        return {
            filteredLeads: filtered,
            kpis: { totalLeads, converted, conversionRate, activePipeline, lostLeads },
            funnelData: funnel,
            sourceData: sources,
            timelineData: timeline
        };
    }, [leads, filterBranch, filterOfficer, filterPeriod, customStart, customEnd]);

    // --- EXPORT FUNCTION ---
    const handleExportReport = () => {
        if (filteredLeads.length === 0) return;
        
        const headers = ['Date Added', 'Prospect Name', 'Phone', 'Email', 'Source', 'Status', 'Assigned Officer', 'Branch'];
        const csvRows = filteredLeads.map(l => [
            new Date(l.created_at).toLocaleDateString(),
            `${l.first_name} ${l.last_name}`,
            l.phone_number,
            l.email || 'N/A',
            l.source || 'N/A',
            l.status,
            l.officer ? `${l.officer.first_name} ${l.officer.last_name}` : 'Unassigned',
            l.branch?.name || 'Headquarters'
        ]);
        
        const csvContent = [headers.join(','), ...csvRows.map(r => `"${r.join('","')}"`)].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Marketing_Overview_${filterPeriod}_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700/50 text-sm font-bold z-50 relative">
                    {label && <p className="text-slate-400 text-xs mb-2 uppercase tracking-widest border-b border-slate-700 pb-1">{label}</p>}
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex justify-between items-center space-x-4 mb-1.5 last:mb-0">
                            <div className="flex items-center">
                                <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
                                <span className="text-slate-300 font-medium text-xs">{entry.name}</span>
                            </div>
                            <span>{entry.value}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Filter officers based on selected branch
    const availableOfficers = officers.filter(o => filterBranch === 'ALL' ? true : o.branch_id === filterBranch);

    return (
        <div className="max-w-7xl mx-auto animate-fade-in pb-10">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Marketing Overview</h1>
                    <p className="text-slate-500 font-medium mt-1">Analyze lead generation, conversion funnels, and marketing ROI.</p>
                </div>
                <button 
                    onClick={handleExportReport}
                    disabled={filteredLeads.length === 0}
                    className="flex items-center space-x-2 bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow-md outline-none disabled:opacity-50"
                >
                    <Download size={18} />
                    <span>Export Data</span>
                </button>
            </div>

            {/* Advanced Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 mb-8">
                <div className="flex items-center text-slate-400 mr-2 shrink-0">
                    <Filter size={18} className="mr-2" />
                    <span className="text-xs font-black uppercase tracking-widest">Analytics Filters</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
                    <div className="relative">
                        <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={filterBranch} onChange={(e) => { setFilterBranch(e.target.value); setFilterOfficer('ALL'); }}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer"
                        >
                            <option value="ALL">All Branches</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>

                    <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={filterOfficer} onChange={(e) => setFilterOfficer(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer"
                        >
                            <option value="ALL">All Officers</option>
                            {availableOfficers.map(o => <option key={o.id} value={o.id}>{o.first_name} {o.last_name}</option>)}
                        </select>
                    </div>

                    <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer"
                        >
                            <option value="ALL">All Time</option>
                            <option value="TODAY">Today</option>
                            <option value="YESTERDAY">Yesterday</option>
                            <option value="THIS_WEEK">This Week</option>
                            <option value="THIS_MONTH">This Month</option>
                            <option value="THIS_YEAR">This Year</option>
                            <option value="CUSTOM">Custom Range</option>
                        </select>
                    </div>

                    {filterPeriod === 'CUSTOM' && (
                        <div className="flex gap-2 animate-in fade-in zoom-in-95">
                            <input 
                                type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                            />
                            <input 
                                type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><Megaphone size={64} className="text-blue-500" /></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Generated Leads</p>
                    <h3 className="text-3xl font-black text-blue-600 tracking-tight mb-2">{kpis.totalLeads}</h3>
                    <p className="text-xs font-bold text-slate-400">Total volume in period</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><Target size={64} className="text-emerald-500" /></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Conversion Rate</p>
                    <h3 className="text-3xl font-black text-emerald-500 tracking-tight mb-2">{kpis.conversionRate}%</h3>
                    <p className="text-xs font-bold text-slate-400">{kpis.converted} Official Customers</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><Activity size={64} className="text-amber-500" /></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Active Pipeline</p>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{kpis.activePipeline}</h3>
                    <p className="text-xs font-bold text-slate-400">Prospects in negotiation</p>
                </div>

                <div className="bg-[#0B1121] p-6 rounded-3xl shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><FilterX size={64} className="text-red-500" /></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 relative z-10">Lost Opportunities</p>
                    <h3 className="text-3xl font-black text-red-400 tracking-tight mb-2 relative z-10">{kpis.lostLeads}</h3>
                    <p className="text-xs font-bold text-slate-500 relative z-10">Dropped or rejected</p>
                </div>
            </div>

            {/* Charts Row 1: Funnel & Sources */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Sales Funnel Chart */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
                    <div className="flex items-center space-x-2 mb-6">
                        <BarChart3 size={20} className="text-slate-400" />
                        <h2 className="text-lg font-bold text-slate-900">Conversion Funnel</h2>
                    </div>
                    
                    <div className="flex-1 w-full relative">
                        {isLoading ? (
                            <div className="absolute inset-0 bg-slate-50 rounded-2xl animate-pulse"></div>
                        ) : kpis.totalLeads === 0 ? (
                            <div className="flex items-center justify-center h-full text-slate-400 font-bold">No Data Available</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={funnelData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="stage" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11, fontWeight: 700}} width={100} />
                                    <RechartsTooltip cursor={{fill: '#f8fafc'}} content={<CustomTooltip />} />
                                    <Bar dataKey="count" name="Leads" radius={[0, 6, 6, 0]} barSize={32}>
                                        {funnelData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Lead Sources Pie Chart */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
                    <div className="flex items-center space-x-2 mb-6">
                        <PieChartIcon size={20} className="text-slate-400" />
                        <h2 className="text-lg font-bold text-slate-900">Acquisition Sources</h2>
                    </div>
                    
                    <div className="flex-1 flex flex-col md:flex-row items-center justify-center relative">
                        {isLoading ? (
                            <div className="w-48 h-48 rounded-full border-[12px] border-slate-50 animate-pulse"></div>
                        ) : sourceData.length > 0 ? (
                        <>
                            <div className="w-full md:w-1/2 h-[200px] md:h-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={sourceData} cx="50%" cy="50%"
                                            innerRadius={60} outerRadius={85} paddingAngle={4}
                                            dataKey="value" stroke="none"
                                        >
                                            {sourceData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="w-full md:w-1/2 mt-4 md:mt-0 md:pl-6 space-y-3">
                                {sourceData.map((item) => (
                                    <div key={item.name}>
                                        <div className="flex justify-between items-center text-xs font-bold mb-1">
                                            <div className="flex items-center text-slate-700">
                                                <span className="w-2.5 h-2.5 rounded-sm mr-2" style={{ backgroundColor: item.color }}></span>
                                                {item.name}
                                            </div>
                                            <span className="text-slate-900">{((item.value / kpis.totalLeads) * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono ml-4">{item.value} Leads</div>
                                    </div>
                                ))}
                            </div>
                        </>
                        ) : (
                            <div className="text-slate-400 font-medium text-sm">No source data available.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Charts Row 2: Timeline */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[420px]">
                <div className="flex items-center space-x-2 mb-6">
                    <TrendingUp size={20} className="text-blue-600" />
                    <h2 className="text-lg font-bold text-slate-900">Lead Generation vs Conversions Timeline</h2>
                </div>

                <div className="flex-1 w-full relative">
                    {isLoading ? (
                        <div className="absolute inset-0 bg-slate-50 rounded-2xl animate-pulse"></div>
                    ) : timelineData.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-slate-400 font-bold">No Timeline Data Available</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }} dy={10} minTickGap={30} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} allowDecimals={false} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                <Area type="monotone" dataKey="newLeads" name="New Leads Generated" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorNew)" />
                                <Area type="monotone" dataKey="converted" name="Successful Conversions" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorConv)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

        </div>
    );
};