import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import {
    TrendingUp, TrendingDown, DollarSign, Download,
    Calendar, Loader2, LineChart as LineChartIcon,
    Wallet, PiggyBank, ArrowUpRight, ArrowDownLeft,
    Filter, MapPin, User, Building2
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';

export const FinancialReportsPage = () => {
    const user = useAuthStore((state: any) => state.user);

    // --- RAW DATA STATE ---
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loans, setLoans] = useState<any[]>([]);
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
        const fetchFinancialData = async () => {
            if (!user?.lender_id && user?.role !== 'Super Admin') return;

            setIsLoading(true);
            try {
                const activeLenderId = user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e';
                const queryParams = `?lender_id=${activeLenderId}`;

                const [txRes, loansRes, branchesRes, usersRes] = await Promise.all([
                    api.get(`/transactions${queryParams}`),
                    api.get(`/loans${queryParams}`),
                    api.get(`/branches${queryParams}`).catch(() => ({ data: [] })),
                    api.get(`/users${queryParams}`).catch(() => ({ data: [] }))
                ]);

                setTransactions(Array.isArray(txRes.data) ? txRes.data : (txRes.data?.data || []));
                setLoans(Array.isArray(loansRes.data) ? loansRes.data : (loansRes.data?.data || []));
                setBranches(branchesRes.data || []);
                
                const staff = (usersRes.data || []).filter((u: any) => 
                    ['Loan Officer', 'Branch Manager'].includes(u.role?.name) || u.role_id === 4 || u.role_id === 3
                );
                setOfficers(staff.length > 0 ? staff : usersRes.data);

            } catch (error) {
                console.error('Failed to fetch financial data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFinancialData();
    }, [user]);

    // --- FINANCIAL AGGREGATION ENGINE ---
    const { chartData, kpis, aggregatedLedger } = useMemo(() => {
        // 1. Resolve Date Range
        const now = new Date();
        let start = new Date(0); // Epoch
        let end = new Date();
        let groupBy = 'MONTH'; // 'DAY' or 'MONTH'

        const formatD = (d: Date) => d.toISOString().split('T')[0];

        if (filterPeriod === 'TODAY') {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            end = new Date(start);
            end.setHours(23, 59, 59, 999);
            groupBy = 'DAY';
        } else if (filterPeriod === 'YESTERDAY') {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            end = new Date(start);
            end.setHours(23, 59, 59, 999);
            groupBy = 'DAY';
        } else if (filterPeriod === 'THIS_WEEK') {
            start = new Date(now);
            start.setDate(now.getDate() - now.getDay());
            start.setHours(0, 0, 0, 0);
            groupBy = 'DAY';
        } else if (filterPeriod === 'THIS_MONTH') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            groupBy = 'DAY';
        } else if (filterPeriod === 'THIS_YEAR') {
            start = new Date(now.getFullYear(), 0, 1);
            groupBy = 'MONTH';
        } else if (filterPeriod === 'CUSTOM' && customStart && customEnd) {
            start = new Date(customStart);
            start.setHours(0, 0, 0, 0);
            end = new Date(customEnd);
            end.setHours(23, 59, 59, 999);
            const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
            groupBy = diffDays > 60 ? 'MONTH' : 'DAY';
        }

        // 2. Filter Loans by Hierarchy (Branch & Officer)
        const filteredLoans = loans.filter(l => {
            const bMatch = filterBranch === 'ALL' || l.borrower?.branch_id === filterBranch;
            const oMatch = filterOfficer === 'ALL' || l.borrower?.user_id === filterOfficer;
            return bMatch && oMatch;
        });

        // 3. Filter Transactions & Disbursed Loans strictly within the Date Range
        const periodLoans = filteredLoans.filter(l => {
            if (!l.disbursed_at) return false;
            const d = new Date(l.disbursed_at);
            return d >= start && d <= end;
        });

        const periodTxs = transactions.filter(t => {
            const d = new Date(t.transaction_date || t.created_at);
            if (d < start || d > end) return false;
            
            // Check if transaction belongs to a loan in our filtered hierarchy
            const belongsToHierarchy = filteredLoans.some(loan => loan.id === t.loan_id);
            return belongsToHierarchy;
        });

        // 4. Calculate Advanced KPIs
        const totalDisbursed = periodLoans.reduce((sum, l) => sum + (Number(l.principal_amount) || 0), 0);
        const totalCollected = periodTxs.filter(t => t.type === 'REPAYMENT').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        
        // Expected Interest on Loans Disbursed in this period
        const expectedInterest = periodLoans.reduce((sum, l) => sum + ((Number(l.total_owed) || 0) - (Number(l.principal_amount) || 0)), 0);
        const netCashFlow = totalCollected - totalDisbursed;
        
        // Total Outstanding Portfolio Value (Regardless of period, just filtered by branch/officer)
        const totalOutstanding = filteredLoans
            .filter(l => ['DISBURSED', 'DEFAULTED'].includes(l.status))
            .reduce((sum, l) => sum + (Number(l.outstanding_balance) || 0), 0);

        // 5. Build Aggregation Map for Charts & Table
        const dataMap = new Map();
        
        const formatLabel = (date: Date) => {
            if (groupBy === 'MONTH') {
                return date.toLocaleString('default', { month: 'short', year: 'numeric' });
            }
            return date.toLocaleString('default', { day: '2-digit', month: 'short' });
        };

        // Initialize empty buckets for continuous dates if 'DAY' or 'MONTH' (optional to ensure continuous lines)
        let cursor = new Date(start);
        while (cursor <= end && cursor <= now) { // Stop at 'now' to prevent flatlining into the future
            const lbl = formatLabel(cursor);
            if (!dataMap.has(lbl)) {
                dataMap.set(lbl, { label: lbl, cashIn: 0, cashOut: 0, net: 0, rawDate: new Date(cursor) });
            }
            if (groupBy === 'DAY') cursor.setDate(cursor.getDate() + 1);
            else cursor.setMonth(cursor.getMonth() + 1);
        }

        // Map Disbursements
        periodLoans.forEach(loan => {
            const lbl = formatLabel(new Date(loan.disbursed_at));
            if (dataMap.has(lbl)) {
                const item = dataMap.get(lbl);
                item.cashOut += Number(loan.principal_amount) || 0;
                item.net -= Number(loan.principal_amount) || 0;
            }
        });

        // Map Repayments
        periodTxs.forEach(tx => {
            if (tx.type === 'REPAYMENT') {
                const lbl = formatLabel(new Date(tx.transaction_date || tx.created_at));
                if (dataMap.has(lbl)) {
                    const item = dataMap.get(lbl);
                    item.cashIn += Number(tx.amount) || 0;
                    item.net += Number(tx.amount) || 0;
                }
            }
        });

        const sortedData = Array.from(dataMap.values()).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

        return {
            chartData: sortedData,
            aggregatedLedger: [...sortedData].reverse(), // Newest first for table
            kpis: { totalDisbursed, totalCollected, expectedInterest, netCashFlow, totalOutstanding }
        };
    }, [loans, transactions, filterBranch, filterOfficer, filterPeriod, customStart, customEnd]);

    // --- EXPORT FUNCTION ---
    const handleExportStatement = () => {
        if (aggregatedLedger.length === 0) return;
        
        const headers = ['Period', 'Cash Out (Disbursed)', 'Cash In (Collected)', 'Net Position'];
        const csvRows = aggregatedLedger.map(row => [
            row.label,
            row.cashOut.toFixed(2),
            row.cashIn.toFixed(2),
            row.net.toFixed(2)
        ]);
        
        const csvContent = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Financial_Statement_${filterPeriod}_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- FORMATTERS ---
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(val);
    };

    const formatCompact = (val: number) => {
        if (Math.abs(val) >= 1000000) return `KES ${(val / 1000000).toFixed(2)}M`;
        if (Math.abs(val) >= 1000) return `KES ${(val / 1000).toFixed(1)}K`;
        return `KES ${val.toLocaleString()}`;
    };

    const CustomChartTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-700/50 min-w-[200px] z-50 relative">
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-3 border-b border-slate-700 pb-2">{label} Statement</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex justify-between items-center space-x-4 mb-2 last:mb-0">
                            <div className="flex items-center space-x-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                <span className="text-xs font-medium text-slate-300">{entry.name}</span>
                            </div>
                            <span className="text-sm font-bold">{formatCompact(entry.value)}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    const availableOfficers = officers.filter(o => filterBranch === 'ALL' ? true : o.branch_id === filterBranch);

    return (
        <div className="max-w-7xl mx-auto animate-fade-in pb-10">

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Financial Reports</h1>
                    <p className="text-slate-500 font-medium mt-1">Real-time cash flow, revenue tracking, and profitability analysis.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleExportStatement}
                        disabled={aggregatedLedger.length === 0}
                        className="flex items-center justify-center space-x-2 bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow-md shadow-slate-900/20 outline-none disabled:opacity-50"
                    >
                        <Download size={18} />
                        <span className="hidden sm:inline">Export Statement</span>
                    </button>
                </div>
            </div>

            {/* Advanced Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 mb-8">
                <div className="flex items-center text-slate-400 mr-2 shrink-0">
                    <Filter size={18} className="mr-2" />
                    <span className="text-xs font-black uppercase tracking-widest">Filters</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
                    <div className="relative">
                        <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={filterBranch}
                            onChange={(e) => { setFilterBranch(e.target.value); setFilterOfficer('ALL'); }}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                        >
                            <option value="ALL">All Branches</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={filterOfficer}
                            onChange={(e) => setFilterOfficer(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                        >
                            <option value="ALL">All Officers</option>
                            {availableOfficers.map(o => (
                                <option key={o.id} value={o.id}>{o.first_name} {o.last_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={filterPeriod}
                            onChange={(e) => setFilterPeriod(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                        >
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600"><Wallet size={20} /></div>
                        <span className="bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md">Cash Out</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 mb-0.5 uppercase tracking-wider">Total Disbursed</p>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">{formatCompact(kpis.totalDisbursed)}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600"><PiggyBank size={20} /></div>
                        <span className="bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md">Cash In</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 mb-0.5 uppercase tracking-wider">Total Collected</p>
                        <h3 className="text-xl font-black text-emerald-600 tracking-tight">{formatCompact(kpis.totalCollected)}</h3>
                    </div>
                </div>

                <div className="bg-[#0B1121] p-5 rounded-3xl shadow-lg flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><DollarSign size={60} className="text-white" /></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className={`p-2.5 rounded-xl ${kpis.netCashFlow >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {kpis.netCashFlow >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                        </div>
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold text-slate-400 mb-0.5 uppercase tracking-wider">Net Position</p>
                        <h3 className={`text-xl font-black tracking-tight ${kpis.netCashFlow >= 0 ? 'text-white' : 'text-red-400'}`}>
                            {formatCompact(kpis.netCashFlow)}
                        </h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600"><TrendingUp size={20} /></div>
                        <span className="bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md">Yield</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 mb-0.5 uppercase tracking-wider">Expected Interest</p>
                        <h3 className="text-xl font-black text-blue-600 tracking-tight">{formatCompact(kpis.expectedInterest)}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between border-l-4 border-l-amber-500">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600"><Building2 size={20} /></div>
                        <span className="bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md">Portfolio</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 mb-0.5 uppercase tracking-wider">Total Outstanding</p>
                        <h3 className="text-xl font-black text-amber-600 tracking-tight">{formatCompact(kpis.totalOutstanding)}</h3>
                    </div>
                </div>
            </div>

            {/* Analytics Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

                {/* Cash Flow Area Chart */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[420px]">
                    <div className="flex items-center space-x-2 mb-6">
                        <LineChartIcon size={20} className="text-blue-600" />
                        <h2 className="text-lg font-bold text-slate-900">Cash Flow Dynamics</h2>
                    </div>

                    <div className="flex-1 w-full relative">
                        {isLoading ? (
                            <div className="absolute inset-0 bg-slate-50 rounded-2xl animate-pulse"></div>
                        ) : chartData.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-slate-400 font-bold">No Data Available</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }} dy={10} minTickGap={30} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} tickFormatter={(val) => `${(val / 1000)}k`} />
                                    <RechartsTooltip content={<CustomChartTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                    <Area type="monotone" dataKey="cashIn" name="Cash In (Repayments)" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" />
                                    <Area type="monotone" dataKey="cashOut" name="Cash Out (Disbursed)" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Net Position Bar Chart */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[420px]">
                    <div className="flex items-center space-x-2 mb-6">
                        <TrendingDown size={20} className="text-slate-400" />
                        <h2 className="text-lg font-bold text-slate-900">Net Position Timeline</h2>
                    </div>

                    <div className="flex-1 w-full relative">
                        {isLoading ? (
                            <div className="absolute inset-0 bg-slate-50 rounded-2xl animate-pulse"></div>
                        ) : chartData.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-slate-400 font-bold">No Data Available</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }} dy={10} minTickGap={30} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} tickFormatter={(val) => `${(val / 1000)}k`} />
                                    <RechartsTooltip content={<CustomChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="net" name="Net Position" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.net >= 0 ? '#10B981' : '#EF4444'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

            </div>

            {/* Aggregated Statement Ledger Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Statement Breakdown</h2>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-200">
                                <th className="p-5 pl-8">Date / Period</th>
                                <th className="p-5 text-right">Cash Out (Disbursed)</th>
                                <th className="p-5 text-right">Cash In (Collected)</th>
                                <th className="p-5 text-right pr-8">Net Position</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-bold"><Loader2 className="animate-spin inline mr-2" /> Compiling ledgers...</td></tr>
                            ) : aggregatedLedger.filter(d => d.cashIn > 0 || d.cashOut > 0).length === 0 ? (
                                <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-medium">No financial activity recorded for the selected criteria.</td></tr>
                            ) : (
                                aggregatedLedger.filter(d => d.cashIn > 0 || d.cashOut > 0).map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-5 pl-8 font-bold text-slate-900">{row.label}</td>
                                        <td className="p-5 text-right font-mono font-medium text-slate-600">
                                            {row.cashOut > 0 ? formatCurrency(row.cashOut) : '-'}
                                        </td>
                                        <td className="p-5 text-right font-mono font-bold text-emerald-600">
                                            {row.cashIn > 0 ? formatCurrency(row.cashIn) : '-'}
                                        </td>
                                        <td className={`p-5 text-right pr-8 font-mono font-black ${row.net >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {row.net > 0 ? '+' : ''}{formatCurrency(row.net)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};