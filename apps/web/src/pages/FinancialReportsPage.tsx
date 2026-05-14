import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import {
    TrendingUp, TrendingDown, DollarSign, Download,
    Calendar, Loader2, LineChart as LineChartIcon,
    Wallet, PiggyBank, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, Legend,
    Cell
} from 'recharts';

export const FinancialReportsPage = () => {
    const user = useAuthStore((state: any) => state.user);

    const [transactions, setTransactions] = useState<any[]>([]);
    const [loans, setLoans] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [period, setPeriod] = useState('2026'); // Default filter to current year

    useEffect(() => {
        const fetchFinancialData = async () => {
            if (!user?.lender_id) return;

            setIsLoading(true);
            try {
                const queryParams = `?lender_id=${user.lender_id}`;
                const [txRes, loansRes] = await Promise.all([
                    api.get(`/transactions${queryParams}`),
                    api.get(`/loans${queryParams}`)
                ]);

                const txData = Array.isArray(txRes.data) ? txRes.data : (txRes.data?.data || []);
                const loanData = Array.isArray(loansRes.data) ? loansRes.data : (loansRes.data?.data || []);

                setTransactions(txData);
                setLoans(loanData);
            } catch (error) {
                console.error('Failed to fetch financial data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFinancialData();
    }, [user]);

    // --- FINANCIAL AGGREGATION ENGINE ---

    // 1. High-Level KPIs
    const totalDisbursed = loans
        .filter(l => ['DISBURSED', 'COMPLETED', 'DEFAULTED'].includes(l.status))
        .reduce((sum, l) => sum + (Number(l.principal_amount) || 0), 0);

    const expectedInterest = loans
        .filter(l => ['DISBURSED', 'COMPLETED', 'DEFAULTED'].includes(l.status))
        .reduce((sum, l) => sum + ((Number(l.total_owed) || 0) - (Number(l.principal_amount) || 0)), 0);

    const totalCollected = transactions
        .filter(t => t.type === 'REPAYMENT')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const netCashFlow = totalCollected - totalDisbursed;

    // 2. Monthly Cash Flow Aggregation (For Charts and Table)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const monthlyDataMap = new Map();
    monthNames.forEach(m => monthlyDataMap.set(m, { month: m, cashIn: 0, cashOut: 0, net: 0 }));

    // Map Cash Out (Disbursements)
    loans.forEach(loan => {
        if (loan.disbursed_at) {
            const date = new Date(loan.disbursed_at);
            if (date.getFullYear().toString() === period) {
                const month = monthNames[date.getMonth()];
                const data = monthlyDataMap.get(month);
                data.cashOut += Number(loan.principal_amount) || 0;
                data.net -= Number(loan.principal_amount) || 0;
            }
        }
    });

    // Map Cash In (Repayments)
    transactions.forEach(tx => {
        if (tx.type === 'REPAYMENT' && tx.transaction_date) {
            const date = new Date(tx.transaction_date);
            if (date.getFullYear().toString() === period) {
                const month = monthNames[date.getMonth()];
                const data = monthlyDataMap.get(month);
                data.cashIn += Number(tx.amount) || 0;
                data.net += Number(tx.amount) || 0;
            }
        }
    });

    const chartData = Array.from(monthlyDataMap.values());

    // --- FORMATTERS ---
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(val);
    };

    const formatCompact = (val: number) => {
        if (Math.abs(val) >= 1000000) return `KES ${(val / 1000000).toFixed(2)}M`;
        if (Math.abs(val) >= 1000) return `KES ${(val / 1000).toFixed(1)}K`;
        return `KES ${val}`;
    };

    const CustomChartTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-700/50 min-w-[200px]">
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-3 border-b border-slate-700 pb-2">{label} {period} Summary</p>
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

    return (
        <div className="max-w-7xl mx-auto animate-fade-in pb-10">

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Financial Reports</h1>
                    <p className="text-slate-500 font-medium mt-1">Real-time cash flow, revenue tracking, and profitability analysis.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            value={period} onChange={(e) => setPeriod(e.target.value)}
                            className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm appearance-none cursor-pointer"
                        >
                            <option value="2026">FY 2026</option>
                            <option value="2025">FY 2025</option>
                        </select>
                    </div>
                    <button className="flex items-center space-x-2 bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow-md shadow-slate-900/20 outline-none">
                        <Download size={18} />
                        <span className="hidden sm:inline">Export Statement</span>
                    </button>
                </div>
            </div>

            {/* KPI Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600"><Wallet size={24} /></div>
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md">Capital Out</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 mb-1">Total Disbursed (All Time)</p>
                        <h3 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">{formatCompact(totalDisbursed)}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600"><PiggyBank size={24} /></div>
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md">Capital In</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 mb-1">Total Collected (All Time)</p>
                        <h3 className="text-2xl lg:text-3xl font-black text-emerald-600 tracking-tight">{formatCompact(totalCollected)}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-2xl bg-blue-50 text-blue-600"><TrendingUp size={24} /></div>
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md">Projected</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 mb-1">Expected Interest Yield</p>
                        <h3 className="text-2xl lg:text-3xl font-black text-blue-600 tracking-tight">{formatCompact(expectedInterest)}</h3>
                    </div>
                </div>

                <div className="bg-[#0B1121] p-6 rounded-3xl shadow-lg flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><DollarSign size={80} className="text-white" /></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className={`p-3 rounded-2xl ${netCashFlow >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {netCashFlow >= 0 ? <ArrowUpRight size={24} /> : <ArrowDownLeft size={24} />}
                        </div>
                    </div>
                    <div className="relative z-10">
                        <p className="text-xs font-bold text-slate-400 mb-1">Net Cash Flow (All Time)</p>
                        <h3 className={`text-2xl lg:text-3xl font-black tracking-tight ${netCashFlow >= 0 ? 'text-white' : 'text-red-400'}`}>
                            {formatCompact(netCashFlow)}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Analytics Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

                {/* Cash Flow Area Chart */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[420px]">
                    <div className="flex items-center space-x-2 mb-6">
                        <LineChartIcon size={20} className="text-blue-600" />
                        <h2 className="text-lg font-bold text-slate-900">Cash Flow Dynamics ({period})</h2>
                    </div>

                    <div className="flex-1 w-full">
                        {isLoading ? (
                            <div className="w-full h-full bg-slate-50 rounded-2xl animate-pulse"></div>
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
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11, fontWeight: 700 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} tickFormatter={(val) => `KES ${(val / 1000)}k`} />
                                    <RechartsTooltip content={<CustomChartTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                    <Area type="monotone" dataKey="cashIn" name="Cash In (Repayments)" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" />
                                    <Area type="monotone" dataKey="cashOut" name="Cash Out (Disbursed)" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Net Monthly Position Bar Chart */}
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[420px]">
                    <div className="flex items-center space-x-2 mb-6">
                        <TrendingDown size={20} className="text-slate-400" />
                        <h2 className="text-lg font-bold text-slate-900">Net Monthly Position ({period})</h2>
                    </div>

                    <div className="flex-1 w-full">
                        {isLoading ? (
                            <div className="w-full h-full bg-slate-50 rounded-2xl animate-pulse"></div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11, fontWeight: 700 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} tickFormatter={(val) => `KES ${(val / 1000)}k`} />
                                    <RechartsTooltip content={<CustomChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="net" name="Net Position" radius={[6, 6, 0, 0]}>
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

            {/* Monthly Summary Ledger Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Monthly Statement Summary</h2>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-200">
                                <th className="p-5 pl-8">Accounting Month</th>
                                <th className="p-5 text-right">Cash Out (Disbursed)</th>
                                <th className="p-5 text-right">Cash In (Collected)</th>
                                <th className="p-5 text-right pr-8">Net Position</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-bold"><Loader2 className="animate-spin inline mr-2" /> Compiling ledgers...</td></tr>
                            ) : chartData.filter(d => d.cashIn > 0 || d.cashOut > 0).length === 0 ? (
                                <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-medium">No financial activity recorded for {period}.</td></tr>
                            ) : (
                                chartData.filter(d => d.cashIn > 0 || d.cashOut > 0).reverse().map((row) => (
                                    <tr key={row.month} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-5 pl-8 font-bold text-slate-900">{row.month} {period}</td>
                                        <td className="p-5 text-right font-mono font-medium text-slate-600">
                                            {row.cashOut > 0 ? formatCurrency(row.cashOut) : '-'}
                                        </td>
                                        <td className="p-5 text-right font-mono font-bold text-emerald-600">
                                            {row.cashIn > 0 ? formatCurrency(row.cashIn) : '-'}
                                        </td>
                                        <td className={`p-5 text-right pr-8 font-mono font-black ${row.net >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {row.net >= 0 ? '+' : ''}{formatCurrency(row.net)}
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