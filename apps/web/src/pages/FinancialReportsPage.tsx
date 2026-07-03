import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import {
    TrendingUp, TrendingDown, DollarSign, Download,
    Calendar, Loader2, LineChart as LineChartIcon,
    Wallet, PiggyBank, ArrowUpRight, ArrowDownLeft,
    Filter, MapPin, User, Building2, ChevronDown, Activity, FileText, ArrowRight
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Line, ComposedChart
} from 'recharts';

// Helper to calculate current month dates synchronously for initial load
const getCurrentMonthDates = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end };
};

export const FinancialReportsPage = () => {
    const user = useAuthStore((state: any) => state.user);

    // --- RAW DATA STATE (Fetched Once) ---
    const [isFetching, setIsFetching] = useState(true);
    const [rawLoans, setRawLoans] = useState<any[]>([]);
    const [rawBorrowers, setRawBorrowers] = useState<any[]>([]);
    const [rawTransactions, setRawTransactions] = useState<any[]>([]);
    
    const [branchesList, setBranchesList] = useState<any[]>([]);
    const [officersList, setOfficersList] = useState<any[]>([]);

    // --- FILTER STATE ---
    const [filters, setFilters] = useState({
      branch: 'all',
      officer: 'all',
      period: 'this_month',
      startDate: getCurrentMonthDates().start,
      endDate: getCurrentMonthDates().end
    });

    const [appliedFilters, setAppliedFilters] = useState({ ...filters });

    // --- DYNAMIC REPORT STATE ---
    const [isLoading, setIsLoading] = useState(true);
    const [kpis, setKpis] = useState({
      totalDisbursed: 0,
      totalRepaid: 0,
      netCashFlow: 0,
      projectedInterest: 0
    });
    
    const [cashFlowData, setCashFlowData] = useState<any[]>([]);
    const [productChartData, setProductChartData] = useState<any[]>([]);
    const [aggregatedLedger, setAggregatedLedger] = useState<any[]>([]);

    // Handle preset date periods
    const handlePeriodChange = (period: string) => {
      const now = new Date();
      let start = filters.startDate;
      let end = filters.endDate;
      const formatDate = (d: Date) => d.toISOString().split('T')[0];

      if (period === 'today') {
        start = formatDate(now);
        end = start;
      } else if (period === 'yesterday') {
        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        start = formatDate(yest);
        end = start;
      } else if (period === 'this_week') {
        const first = new Date(now);
        first.setDate(now.getDate() - now.getDay() + 1);
        start = formatDate(first);
        end = formatDate(now);
      } else if (period === 'this_month') {
        start = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
        end = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      } else if (period === 'this_year') {
        start = formatDate(new Date(now.getFullYear(), 0, 1));
        end = formatDate(new Date(now.getFullYear(), 11, 31));
      }
      setFilters(prev => ({ ...prev, period, startDate: start, endDate: end }));
    };

    // --- 1. INITIAL DATA FETCH ---
    useEffect(() => {
      const fetchRawData = async () => {
        if (!user?.lender_id && user?.role !== 'Super Admin') return;
        setIsFetching(true);
        try {
          const activeLenderId = user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e';
          const queryParams = `?lender_id=${activeLenderId}`;

          const [loansRes, borrowersRes, transactionsRes, branchesRes, usersRes] = await Promise.all([
            api.get(`/loans${queryParams}`),
            api.get(`/borrowers${queryParams}`),
            api.get(`/transactions${queryParams}`),
            api.get(`/branches${queryParams}`).catch(() => ({ data: [] })),
            api.get(`/users${queryParams}`).catch(() => ({ data: [] })) 
          ]);

          const fetchedBorrowers = Array.isArray(borrowersRes.data) ? borrowersRes.data : (borrowersRes.data?.data || []);
          const fetchedUsers = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.data || []);

          setRawBorrowers(fetchedBorrowers);
          setRawLoans(Array.isArray(loansRes.data) ? loansRes.data : (loansRes.data?.data || []));
          setRawTransactions(Array.isArray(transactionsRes.data) ? transactionsRes.data : (transactionsRes.data?.data || []));
          setBranchesList(branchesRes.data || []);
          
          const staff = fetchedUsers.filter((u: any) => u.role?.name === 'Loan Officer' || u.role?.name === 'Branch Manager' || u.role_id === 4 || u.role_id === 3);
          
          if (staff.length > 0) {
            setOfficersList(staff);
          } else {
            const uniqueOfficerIds = Array.from(new Set(fetchedBorrowers.map((b: any) => b.user_id).filter(Boolean)));
            const fallbackOfficers = uniqueOfficerIds.map((id: any) => {
              const b = fetchedBorrowers.find((b: any) => b.user_id === id);
              return { id: id, first_name: b?.user?.first_name || 'Officer', last_name: b?.user?.last_name || '', branch_id: b?.branch_id };
            });
            setOfficersList(fallbackOfficers);
          }
          setAppliedFilters(filters);
        } catch (error) {
          console.error('Failed to fetch report data:', error);
        } finally {
          setIsFetching(false);
        }
      };

      fetchRawData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.lender_id, user?.role]);

    const handleApplyFilters = () => { setAppliedFilters(filters); };

    // --- 2. AGGREGATION & REPORT COMPILATION ---
    useEffect(() => {
      if (isFetching || !appliedFilters.startDate) return;
      setIsLoading(true);

      // A. Hierarchical Filtering
      let currentBorrowers = rawBorrowers;
      if (user?.role === 'Loan Officer') {
        currentBorrowers = currentBorrowers.filter(b => b.user_id === user.id);
      } else if (user?.role === 'Branch Manager') {
        currentBorrowers = currentBorrowers.filter(b => b.branch_id === user.branch_id);
        if (appliedFilters.officer !== 'all') currentBorrowers = currentBorrowers.filter(b => b.user_id === appliedFilters.officer);
      } else {
        if (appliedFilters.branch !== 'all') currentBorrowers = currentBorrowers.filter(b => b.branch_id === appliedFilters.branch);
        if (appliedFilters.officer !== 'all') currentBorrowers = currentBorrowers.filter(b => b.user_id === appliedFilters.officer);
      }

      // B. Cascade to Loans & Transactions
      const validBorrowerIds = new Set(currentBorrowers.map(b => b.id));
      const currentLoans = rawLoans.filter(l => validBorrowerIds.has(l.borrower_id));
      const validLoanIds = new Set(currentLoans.map(l => l.id));
      const currentTransactions = rawTransactions.filter(t => validLoanIds.has(t.loan_id));

      // C. Date Bounding
      const startObj = new Date(appliedFilters.startDate); startObj.setHours(0, 0, 0, 0);
      const endObj = new Date(appliedFilters.endDate); endObj.setHours(23, 59, 59, 999);

      const periodLoans = currentLoans.filter(l => {
          const d = new Date(l.disbursed_at || l.created_at);
          return d >= startObj && d <= endObj && ['DISBURSED', 'COMPLETED', 'DEFAULTED'].includes(l.status);
      });
      const periodTransactions = currentTransactions.filter(t => {
          const d = new Date(t.transaction_date);
          return d >= startObj && d <= endObj;
      });

      // --- CALCULATE KPIs ---
      const totalDisbursed = periodLoans.reduce((sum, l) => sum + (Number(l.principal_amount) || 0), 0);
      const totalRepaid = periodTransactions.filter(t => t.type === 'REPAYMENT').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const netCashFlow = totalRepaid - totalDisbursed;
      const projectedInterest = periodLoans.reduce((sum, l) => sum + ((Number(l.total_owed) || 0) - (Number(l.principal_amount) || 0)), 0);

      setKpis({ totalDisbursed, totalRepaid, netCashFlow, projectedInterest });

      // --- COMPILE CHART DATA ---
      const daysDiff = (endObj.getTime() - startObj.getTime()) / (1000 * 3600 * 24);
      let chartBins: any[] = [];
      const ledgerMap = new Map();
      
      if (daysDiff <= 31) {
          for (let d = new Date(startObj); d <= endObj; d.setDate(d.getDate() + 1)) {
              const dStr = d.toISOString().split('T')[0];
              const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
              chartBins.push({ label, matchDate: dStr, disbursed: 0, repaid: 0 });
              ledgerMap.set(dStr, { date: dStr, label, cashOut: 0, cashIn: 0 });
          }
          periodLoans.forEach(l => {
              const dStr = new Date(l.disbursed_at || l.created_at).toISOString().split('T')[0];
              const bin = chartBins.find(b => b.matchDate === dStr);
              if (bin) bin.disbursed += Number(l.principal_amount) || 0;
              if (ledgerMap.has(dStr)) ledgerMap.get(dStr).cashOut += Number(l.principal_amount) || 0;
          });
          periodTransactions.filter(t => t.type === 'REPAYMENT').forEach(t => {
              const dStr = new Date(t.transaction_date).toISOString().split('T')[0];
              const bin = chartBins.find(b => b.matchDate === dStr);
              if (bin) bin.repaid += Number(t.amount) || 0;
              if (ledgerMap.has(dStr)) ledgerMap.get(dStr).cashIn += Number(t.amount) || 0;
          });
      } else {
          const startMonth = new Date(startObj.getFullYear(), startObj.getMonth(), 1);
          const endMonth = new Date(endObj.getFullYear(), endObj.getMonth(), 1);
          for (let d = new Date(startMonth); d <= endMonth; d.setMonth(d.getMonth() + 1)) {
              const mKey = `${d.getFullYear()}-${d.getMonth()}`;
              const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
              chartBins.push({ label, month: d.getMonth(), year: d.getFullYear(), disbursed: 0, repaid: 0 });
              ledgerMap.set(mKey, { date: d.toISOString(), label, cashOut: 0, cashIn: 0 });
          }
          periodLoans.forEach(l => {
              const d = new Date(l.disbursed_at || l.created_at);
              const mKey = `${d.getFullYear()}-${d.getMonth()}`;
              const bin = chartBins.find(b => b.month === d.getMonth() && b.year === d.getFullYear());
              if (bin) bin.disbursed += Number(l.principal_amount) || 0;
              if (ledgerMap.has(mKey)) ledgerMap.get(mKey).cashOut += Number(l.principal_amount) || 0;
          });
          periodTransactions.filter(t => t.type === 'REPAYMENT').forEach(t => {
              const d = new Date(t.transaction_date);
              const mKey = `${d.getFullYear()}-${d.getMonth()}`;
              const bin = chartBins.find(b => b.month === d.getMonth() && b.year === d.getFullYear());
              if (bin) bin.repaid += Number(t.amount) || 0;
              if (ledgerMap.has(mKey)) ledgerMap.get(mKey).cashIn += Number(t.amount) || 0;
          });
      }
      setCashFlowData(chartBins);

      const aggLedger = Array.from(ledgerMap.values()).map(item => ({
          label: item.label,
          date: item.date,
          cashOut: item.cashOut,
          cashIn: item.cashIn,
          net: item.cashIn - item.cashOut
      })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAggregatedLedger(aggLedger);

      // Product Bar Chart
      const productCounts = periodLoans.reduce((acc: any, loan: any) => {
          const pName = loan.loan_product?.name || 'Standard Loan';
          if (!acc[pName]) acc[pName] = { name: pName, value: 0 };
          acc[pName].value += Number(loan.principal_amount) || 0;
          return acc;
      }, {});
      setProductChartData(Object.values(productCounts).sort((a: any, b: any) => b.value - a.value));

      setIsLoading(false);

    }, [appliedFilters, rawLoans, rawBorrowers, rawTransactions, isFetching, user]);

    // --- REUSABLE COMPONENTS & FORMATTERS ---
    const availableOfficers = officersList.filter(o => filters.branch === 'all' ? true : o.branch_id === filters.branch);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-KE').format(val || 0);
    };

    const StatCard = ({ title, value, subtext, icon: Icon, colorClass, highlightClass }: any) => (
        <div className="bg-white p-3 lg:p-4 rounded-xl lg:rounded-2xl border border-slate-200 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300 relative overflow-hidden group cursor-pointer flex flex-col justify-between min-h-[90px]">
          <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${highlightClass}`}></div>
          <div className="flex justify-between items-start mb-1 lg:mb-2 pl-2">
            <div className="flex-1 overflow-hidden pr-1">
              <h3 className="text-slate-500 text-[8px] lg:text-[9px] font-black uppercase tracking-widest mb-1 line-clamp-1">{title}</h3>
              {isLoading ? (
                <div className="h-4 lg:h-6 bg-slate-100 rounded-lg w-16 lg:w-24 animate-pulse"></div>
              ) : (
                <p className={`text-sm sm:text-base lg:text-lg font-black tracking-tight ${colorClass} truncate leading-none`}>{value}</p>
              )}
            </div>
            <div className={`p-1.5 lg:p-2 rounded-lg lg:rounded-xl shrink-0 ${highlightClass} bg-opacity-10 text-opacity-100`}>
              <Icon size={16} className={`lg:w-5 lg:h-5 ${colorClass}`} />
            </div>
          </div>
          <div className="text-[9px] lg:text-[10px] font-semibold text-slate-500 flex items-center line-clamp-1 pl-2">
            {subtext}
          </div>
        </div>
    );

    const CustomCashFlowTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
          return (
            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700/50 min-w-[160px]">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">{label} Metrics</p>
              {payload.map((entry: any, index: number) => (
                <div key={index} className="flex justify-between items-center space-x-4 mb-1.5 last:mb-0">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                    <span className="text-xs font-medium text-slate-300">{entry.name}</span>
                  </div>
                  <span className="text-sm font-bold">KES {formatCurrency(entry.value)}</span>
                </div>
              ))}
            </div>
          );
        }
        return null;
    };

    const CustomBarTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 text-white text-xs font-bold py-2.5 px-3.5 rounded-xl shadow-xl border border-slate-700/50 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="text-slate-300 font-medium">{payload[0].payload.name}:</span>
                    <span>KES {formatCurrency(payload[0].value)}</span>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="animate-fade-in space-y-4 lg:space-y-5 max-w-7xl mx-auto pb-8">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end pb-1 gap-2 lg:gap-3">
                <div>
                    <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Financial Reports</h1>
                    <div className="flex items-center space-x-2 mt-1 lg:mt-1.5">
                        <span className="text-slate-500 text-[11px] lg:text-xs font-medium">Income & Ledger Analytics</span>
                    </div>
                </div>
                <button className="flex items-center space-x-2 px-3 lg:px-4 py-1.5 lg:py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg lg:rounded-xl shadow-sm hover:bg-slate-50 transition-colors text-[10px] lg:text-xs outline-none">
                    <Download size={14} /> <span className="hidden sm:inline">Export Statement</span>
                </button>
            </div>

            {/* --- ADVANCED FILTER BAR --- */}
            <div className="bg-white p-2.5 lg:p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col xl:flex-row xl:items-center gap-2.5 lg:gap-3">
                <div className="hidden xl:flex items-center text-slate-400 mr-1 shrink-0">
                <Filter size={14} className="mr-1.5" />
                <span className="text-[9px] font-black uppercase tracking-widest">Filters</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-2.5 flex-1">
                <div className="relative">
                    <MapPin size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 lg:w-3.5 lg:h-3.5" />
                    <select
                    value={filters.branch} onChange={(e) => setFilters({ ...filters, branch: e.target.value, officer: 'all' })} 
                    disabled={['Branch Manager', 'Loan Officer'].includes(user?.role)}
                    className="w-full pl-7 lg:pl-8 pr-7 lg:pr-3 py-1.5 lg:py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] lg:text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer disabled:opacity-70"
                    >
                    {['Branch Manager', 'Loan Officer'].includes(user?.role) ? (
                        <option value="all">My Branch</option>
                    ) : (
                        <>
                        <option value="all">All Branches</option>
                        {branchesList.map(b => <option key={b.id} value={b.id}>{b.name} ({b.location})</option>)}
                        </>
                    )}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <div className="relative">
                    <User size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 lg:w-3.5 lg:h-3.5" />
                    <select
                    value={filters.officer} onChange={(e) => setFilters({ ...filters, officer: e.target.value })}
                    disabled={user?.role === 'Loan Officer'}
                    className="w-full pl-7 lg:pl-8 pr-7 lg:pr-3 py-1.5 lg:py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] lg:text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer disabled:opacity-70"
                    >
                    {user?.role === 'Loan Officer' ? (
                        <option value="all">My Portfolio</option>
                    ) : (
                        <>
                        <option value="all">All Officers</option>
                        {availableOfficers.map(o => <option key={o.id} value={o.id}>{o.first_name} {o.last_name}</option>)}
                        </>
                    )}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <div className="relative">
                    <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 lg:w-3.5 lg:h-3.5" />
                    <select
                    value={filters.period} onChange={(e) => handlePeriodChange(e.target.value)}
                    className="w-full pl-7 lg:pl-8 pr-7 lg:pr-3 py-1.5 lg:py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] lg:text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                    >
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="this_week">This Week</option>
                    <option value="this_month">This Month</option>
                    <option value="this_year">This Year</option>
                    <option value="custom">Custom Range</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <input
                    type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value, period: 'custom' })}
                    className="w-full px-2.5 lg:px-3 py-1.5 lg:py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] lg:text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />

                <input
                    type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value, period: 'custom' })}
                    className="w-full px-2.5 lg:px-3 py-1.5 lg:py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] lg:text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                </div>

                <button 
                onClick={handleApplyFilters}
                className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white p-1.5 lg:p-2 rounded-lg shadow-sm shadow-blue-500/20 transition-all active:scale-95 outline-none focus:ring-2 focus:ring-blue-500/50 flex justify-center items-center"
                >
                <ArrowRight size={16} className="lg:w-4 lg:h-4" />
                </button>
            </div>

            {/* Main KPI Grid - Small Font exact figures */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
                <StatCard
                    title="Total Disbursed"
                    value={`KES ${formatCurrency(kpis.totalDisbursed)}`}
                    subtext={<><ArrowUpRight size={10} className="lg:w-3 lg:h-3 mr-1 text-blue-500" /> Capital Deployed</>}
                    icon={Wallet} colorClass="text-slate-900" highlightClass="bg-blue-500"
                />
                <StatCard
                    title="Total Repaid"
                    value={`KES ${formatCurrency(kpis.totalRepaid)}`}
                    subtext={<><ArrowDownLeft size={10} className="lg:w-3 lg:h-3 mr-1 text-emerald-500" /> Capital Recovered</>}
                    icon={PiggyBank} colorClass="text-emerald-600" highlightClass="bg-emerald-500"
                />
                <StatCard
                    title="Net Cash Flow"
                    value={`${kpis.netCashFlow > 0 ? '+' : ''}KES ${formatCurrency(kpis.netCashFlow)}`}
                    subtext={<><Activity size={10} className={`lg:w-3 lg:h-3 mr-1 ${kpis.netCashFlow >= 0 ? 'text-emerald-500' : 'text-red-500'}`} /> In Selected Range</>}
                    icon={DollarSign} colorClass={kpis.netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'} highlightClass={kpis.netCashFlow >= 0 ? 'bg-emerald-500' : 'bg-red-500'}
                />
                <StatCard
                    title="Projected Interest"
                    value={`KES ${formatCurrency(kpis.projectedInterest)}`}
                    subtext={<><TrendingUp size={10} className="lg:w-3 lg:h-3 mr-1 text-indigo-500" /> Expected Yield</>}
                    icon={TrendingUp} colorClass="text-indigo-600" highlightClass="bg-indigo-500"
                />
            </div>

            {/* --- CHARTS ROW --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 mt-3 lg:mt-4">

                {/* Cash Flow Trends Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl lg:rounded-2xl border border-slate-200 shadow-sm p-3 lg:p-4 xl:p-6 flex flex-col h-[240px] lg:h-[300px]">
                    <div className="flex justify-between items-center mb-3 lg:mb-4">
                        <div>
                        <h2 className="text-xs lg:text-sm font-bold text-slate-900">Liquidity Movement</h2>
                        <p className="text-[9px] lg:text-[10px] text-slate-500 font-medium mt-0.5">Disbursements vs Incoming Collections</p>
                        </div>
                        <div className="hidden sm:flex items-center space-x-2 lg:space-x-3 text-[9px] lg:text-[10px] font-bold text-slate-600 bg-slate-50 px-2 lg:px-3 py-1 lg:py-1.5 rounded-md lg:rounded-lg border border-slate-100">
                        <div className="flex items-center"><span className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded bg-slate-900 mr-1 lg:mr-1.5"></span> Outflow</div>
                        <div className="flex items-center"><span className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded bg-emerald-500 mr-1 lg:mr-1.5"></span> Inflow</div>
                        </div>
                    </div>

                    <div className="flex-1 w-full text-[10px]">
                        {isFetching || isLoading ? (
                        <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-lg lg:rounded-xl animate-pulse">
                            <span className="text-slate-400 font-medium text-[10px] lg:text-xs">Aggregating records...</span>
                        </div>
                        ) : cashFlowData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={cashFlowData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }} dy={5} />
                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }} tickFormatter={(val) => new Intl.NumberFormat('en-KE').format(val)} width={75} />
                            <Tooltip content={<CustomCashFlowTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar yAxisId="left" dataKey="repaid" name="Repayments" fill="#10B981" radius={[3, 3, 0, 0]} barSize={14} />
                            <Line yAxisId="left" type="monotone" dataKey="disbursed" name="Disbursements" stroke="#0F172A" strokeWidth={2} dot={{ r: 2, strokeWidth: 1.5, fill: '#fff' }} activeDot={{ r: 4, strokeWidth: 0, fill: '#0F172A' }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                        ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium text-[10px] lg:text-xs">No transaction data available.</div>
                        )}
                    </div>
                </div>

                {/* Capital Allocation by Product */}
                <div className="bg-white rounded-xl lg:rounded-2xl border border-slate-200 shadow-sm p-3 lg:p-4 xl:p-6 flex flex-col h-[240px] lg:h-[300px]">
                    <div className="mb-3 lg:mb-4">
                        <h2 className="text-xs lg:text-sm font-bold text-slate-900">Capital Allocation</h2>
                        <p className="text-[9px] lg:text-[10px] text-slate-500 font-medium mt-0.5">Disbursement volume by loan product</p>
                    </div>

                    <div className="flex-1 w-full text-[10px]">
                        {isFetching || isLoading ? (
                        <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-lg lg:rounded-xl animate-pulse"></div>
                        ) : productChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                            layout="vertical"
                            data={productChartData}
                            margin={{ top: 0, right: 10, left: -20, bottom: 0 }}
                            >
                            <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }} tickFormatter={(val) => new Intl.NumberFormat('en-KE').format(val)} />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 9, fontWeight: 700 }} width={85} />
                            <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                                {productChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#3B82F6' : '#93C5FD'} className="hover:opacity-80 transition-opacity cursor-pointer" />
                                ))}
                            </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium text-[10px] lg:text-xs">No product data available.</div>
                        )}
                    </div>
                </div>

            </div>

            {/* Daily Ledger Table */}
            <div className="bg-white rounded-xl lg:rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mt-3 lg:mt-4">
                <div className="p-3 lg:p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                        <h2 className="text-sm lg:text-base font-bold text-slate-900 flex items-center">
                            <FileText className="mr-1.5 text-blue-600 w-3.5 h-3.5 lg:w-4 lg:h-4" />
                            Daily Financial Ledger
                        </h2>
                        <p className="text-[9px] lg:text-[10px] text-slate-500 font-medium mt-0.5">Summary of grouped cash flows per date</p>
                    </div>
                </div>
                
                <div className="overflow-x-auto custom-scrollbar max-h-[400px]">
                    <table className="w-full text-left border-collapse min-w-[600px] lg:min-w-[800px]">
                        <thead className="sticky top-0 bg-slate-50/95 backdrop-blur z-10 shadow-sm">
                            <tr className="border-b border-slate-200 text-slate-500 text-[8px] lg:text-[9px] uppercase tracking-widest font-black">
                                <th className="p-2 lg:p-3 pl-3 lg:pl-4">Date / Period</th>
                                <th className="p-2 lg:p-3 text-right">Cash Outflow (KES)</th>
                                <th className="p-2 lg:p-3 text-right">Cash Inflow (KES)</th>
                                <th className="p-2 lg:p-3 text-right pr-3 lg:pr-4">Net Position (KES)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan={4} className="py-8 text-center text-slate-400"><Loader2 className="animate-spin inline mx-auto" size={16}/></td></tr>
                            ) : aggregatedLedger.length === 0 ? (
                                <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-medium text-[10px] lg:text-xs">No financial activity recorded for the selected criteria.</td></tr>
                            ) : (
                                aggregatedLedger.filter(d => d.cashIn > 0 || d.cashOut > 0).map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="p-2 lg:p-3 pl-3 lg:pl-4 font-bold text-slate-900 text-[10px] lg:text-xs">{row.label}</td>
                                        <td className="p-2 lg:p-3 text-right font-black text-slate-600 text-[11px] lg:text-xs">
                                            {row.cashOut > 0 ? formatCurrency(row.cashOut) : '-'}
                                        </td>
                                        <td className="p-2 lg:p-3 text-right font-black text-emerald-600 text-[11px] lg:text-xs">
                                            {row.cashIn > 0 ? formatCurrency(row.cashIn) : '-'}
                                        </td>
                                        <td className={`p-2 lg:p-3 text-right pr-3 lg:pr-4 font-black text-[11px] lg:text-xs ${row.net >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
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