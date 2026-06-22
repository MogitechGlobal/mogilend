import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import {
  Users, TrendingUp, CreditCard, Clock,
  ArrowRight, AlertTriangle, Phone,
  Activity, Wallet, CheckCircle, FileText, MapPin, User, Calendar, ChevronDown, Briefcase, Filter, Loader2, Megaphone, BarChart3
} from 'lucide-react';
import {
  BarChart, Bar, Line, ComposedChart, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

// Helper to calculate current month dates synchronously for initial load
const getCurrentMonthDates = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end };
};

export const BranchDashboard = ({ onNavigate }: { onNavigate: (path: any) => void }) => {
  const user = useAuthStore((state: any) => state.user);
  
  // --- RAW DATA STATE (Fetched Once) ---
  const [isFetching, setIsFetching] = useState(true);
  const [rawLoans, setRawLoans] = useState<any[]>([]);
  const [rawBorrowers, setRawBorrowers] = useState<any[]>([]);
  const [rawTransactions, setRawTransactions] = useState<any[]>([]);
  
  // --- DROPDOWN DATA STATE ---
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [officersList, setOfficersList] = useState<any[]>([]);

  // --- FILTER STATE (Pre-filled with This Month synchronously) ---
  const [filters, setFilters] = useState({
    branch: 'all',
    officer: 'all',
    period: 'this_month',
    startDate: getCurrentMonthDates().start,
    endDate: getCurrentMonthDates().end
  });

  const [appliedFilters, setAppliedFilters] = useState({ ...filters });

  // --- DYNAMIC KPI & COLLECTIONS STATE ---
  const [isLoading, setIsLoading] = useState(true);
  const [kpis, setKpis] = useState({
    activePortfolio: 0,
    activeClients: 0,
    collectedInPeriod: 0,
    parValue: 0,
    parPercentage: 0,
    loansIssuedInPeriod: 0,
  });
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [statusChartData, setStatusChartData] = useState<any[]>([]);
  const [branchChartData, setBranchChartData] = useState<any[]>([]);

  // Collections State
  const [activeDueTab, setActiveDueTab] = useState<'yesterday' | 'today' | 'tomorrow'>('today');
  const [dueCollections, setDueCollections] = useState<{ yesterday: any[], today: any[], tomorrow: any[] }>({ yesterday: [], today: [], tomorrow: [] });

  // Set dates dynamically based on period selection
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

        // Fetch all base data for the institution
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
        
        // Populate Officers List cleanly
        const staff = fetchedUsers.filter((u: any) => u.role?.name === 'Loan Officer' || u.role?.name === 'Branch Manager' || u.role_id === 4 || u.role_id === 3);
        
        if (staff.length > 0) {
          setOfficersList(staff);
        } else {
          // Smart Fallback: Extract actual officer names from the borrower's relation object
          const uniqueOfficerIds = Array.from(new Set(fetchedBorrowers.map((b: any) => b.user_id).filter(Boolean)));
          const fallbackOfficers = uniqueOfficerIds.map((id: any) => {
            const b = fetchedBorrowers.find((b: any) => b.user_id === id);
            return {
              id: id,
              first_name: b?.user?.first_name || 'Officer',
              last_name: b?.user?.last_name || String(id).substring(0, 6),
              branch_id: b?.branch_id
            };
          });
          setOfficersList(fallbackOfficers);
        }

        // Auto-apply initial this-month filters once data is loaded
        setAppliedFilters(filters);

      } catch (error) {
        console.error('Failed to fetch raw dashboard data:', error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchRawData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.lender_id, user?.role]);

  // Action Button Trigger
  const handleApplyFilters = () => {
    setAppliedFilters(filters);
  };

  // --- 2. INSTANT FILTERING & AGGREGATION ---
  useEffect(() => {
    if (isFetching || !appliedFilters.startDate) return;
    setIsLoading(true);

    // STEP A: Apply Hierarchical & UI Filters to Borrowers
    let currentBorrowers = rawBorrowers;
    
    // Strict Role Enforcement (This guarantees Loan Officers ONLY see their own borrowers)
    if (user?.role === 'Loan Officer') {
      currentBorrowers = currentBorrowers.filter(b => b.user_id === user.id);
    } else if (user?.role === 'Branch Manager') {
      currentBorrowers = currentBorrowers.filter(b => b.branch_id === user.branch_id);
      if (appliedFilters.officer !== 'all') {
        currentBorrowers = currentBorrowers.filter(b => b.user_id === appliedFilters.officer);
      }
    } else {
      // Admins
      if (appliedFilters.branch !== 'all') {
        currentBorrowers = currentBorrowers.filter(b => b.branch_id === appliedFilters.branch);
      }
      if (appliedFilters.officer !== 'all') {
        currentBorrowers = currentBorrowers.filter(b => b.user_id === appliedFilters.officer);
      }
    }

    // STEP B: Cascade Filters to Loans and Transactions
    const validBorrowerIds = new Set(currentBorrowers.map(b => b.id));
    const currentLoans = rawLoans.filter(l => validBorrowerIds.has(l.borrower_id));

    const validLoanIds = new Set(currentLoans.map(l => l.id));
    const currentTransactions = rawTransactions.filter(t => validLoanIds.has(t.loan_id));

    // STEP C: Date Bounding (Snapshots vs Flow)
    const startObj = new Date(appliedFilters.startDate);
    startObj.setHours(0, 0, 0, 0);
    const endObj = new Date(appliedFilters.endDate);
    endObj.setHours(23, 59, 59, 999);

    // Balance Sheet Snapshots (Everything up to the end date)
    const portfolioLoans = currentLoans.filter(l => new Date(l.created_at) <= endObj);
    const portfolioBorrowers = currentBorrowers.filter(b => new Date(b.created_at) <= endObj);

    // Flow Period Statements (Strictly within the selected range)
    const periodLoans = currentLoans.filter(l => {
        const d = new Date(l.disbursed_at || l.created_at);
        return d >= startObj && d <= endObj;
    });
    const periodTransactions = currentTransactions.filter(t => {
        const d = new Date(t.transaction_date);
        return d >= startObj && d <= endObj;
    });


    // --- 3. CALCULATE KPIs & COLLECTIONS SCHEDULE ---
    const activeLoans = portfolioLoans.filter((l: any) => l.status === 'DISBURSED' || l.status === 'DEFAULTED');
    const activePortfolio = activeLoans.reduce((sum: number, l: any) => sum + (Number(l.outstanding_balance) || 0), 0);

    const activeClientIds = new Set(activeLoans.map((l: any) => l.borrower_id));
    const activeClients = activeClientIds.size;

    const defaultedLoans = portfolioLoans.filter((l: any) => l.status === 'DEFAULTED');
    const parValue = defaultedLoans.reduce((sum: number, l: any) => sum + (Number(l.outstanding_balance) || 0), 0);
    const parPercentage = activePortfolio > 0 ? (parValue / activePortfolio) * 100 : 0;

    const collectedInPeriod = periodTransactions
      .filter((t: any) => t.type === 'REPAYMENT')
      .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

    const loansIssuedInPeriod = periodLoans.filter((l: any) => ['DISBURSED', 'COMPLETED', 'DEFAULTED'].includes(l.status)).length;

    setKpis({
      activePortfolio,
      activeClients,
      collectedInPeriod,
      parValue,
      parPercentage,
      loansIssuedInPeriod
    });

    // --- NEW: Calculate Due Installments (FIXED) ---
    
    // Helper function to safely format dates to YYYY-MM-DD in the local timezone
    const getLocalYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const now = new Date();
    const todayStr = getLocalYMD(now);

    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = getLocalYMD(yesterdayDate);

    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = getLocalYMD(tomorrowDate);

    const dueYesterday: any[] = [];
    const dueToday: any[] = [];
    const dueTomorrow: any[] = [];

    // We use `currentLoans` instead of `portfolioLoans` so the real-time 
    // tracker is not broken by the user changing the dashboard's Date Range filter.
    currentLoans.forEach((loan: any) => {
      // Only check schedule for active loans
      if (loan.status !== 'DISBURSED' || !loan.disbursed_at || loan.outstanding_balance <= 0) return;
      
      // Ensure cycle string is safely uppercase
      const cycle = String(loan.loan_product?.repayment_cycle || 'MONTHLY').toUpperCase();
      const term = loan.term || 1;
      const installmentAmount = (Number(loan.total_owed) || 0) / term;
      
      const disbursedDate = new Date(loan.disbursed_at);

      let isDueYesterday = false;
      let isDueToday = false;
      let isDueTomorrow = false;

      // Project all expected due dates for the length of the loan
      for (let i = 1; i <= term; i++) {
        const expectedDueDate = new Date(disbursedDate);
        
        if (cycle === 'DAILY') {
          expectedDueDate.setDate(expectedDueDate.getDate() + i);
        } else if (cycle === 'WEEKLY') {
          expectedDueDate.setDate(expectedDueDate.getDate() + (i * 7));
        } else if (cycle === 'MONTHLY') {
          expectedDueDate.setMonth(expectedDueDate.getMonth() + i);
        }

        // Compare safe strings instead of strict epoch milliseconds
        const expectedStr = getLocalYMD(expectedDueDate);
        
        if (expectedStr === yesterdayStr) isDueYesterday = true;
        if (expectedStr === todayStr) isDueToday = true;
        if (expectedStr === tomorrowStr) isDueTomorrow = true;
      }

      if (isDueYesterday) dueYesterday.push({ ...loan, installmentAmount });
      if (isDueToday) dueToday.push({ ...loan, installmentAmount });
      if (isDueTomorrow) dueTomorrow.push({ ...loan, installmentAmount });
    });

    setDueCollections({ yesterday: dueYesterday, today: dueToday, tomorrow: dueTomorrow });


    // --- 4. GENERATE CHART DATA ---
    const statusCounts = portfolioLoans.reduce((acc: any, loan: any) => {
      const status = loan.status || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    setStatusChartData([
      { name: 'Disbursed', value: statusCounts['DISBURSED'] || 0, color: '#10B981' },
      { name: 'Pending', value: statusCounts['PENDING'] || 0, color: '#0F172A' },
      { name: 'Completed', value: statusCounts['COMPLETED'] || 0, color: '#3B82F6' },
      { name: 'Defaulted', value: statusCounts['DEFAULTED'] || 0, color: '#EF4444' },
    ]);

    const branchCounts = portfolioBorrowers.reduce((acc: any, borrower: any) => {
      const branchObj = branchesList.find(b => b.id === borrower.branch_id);
      const branchName = branchObj ? branchObj.name : (borrower.branch?.name || 'Headquarters');
      acc[branchName] = (acc[branchName] || 0) + 1;
      return acc;
    }, {});

    setBranchChartData(
      Object.keys(branchCounts).map(branch => ({
        branch,
        clients: branchCounts[branch]
      })).sort((a, b) => b.clients - a.clients)
    );

    // --- 5. DYNAMIC CASH FLOW CHART ---
    const daysDiff = (endObj.getTime() - startObj.getTime()) / (1000 * 3600 * 24);
    let chartBins: any[] = [];
    
    if (daysDiff <= 31) {
        for (let d = new Date(startObj); d <= endObj; d.setDate(d.getDate() + 1)) {
            chartBins.push({
                label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                matchDate: d.toISOString().split('T')[0],
                disbursed: 0,
                repaid: 0
            });
        }
        periodLoans.forEach(l => {
            const dStr = new Date(l.disbursed_at || l.created_at).toISOString().split('T')[0];
            const bin = chartBins.find(b => b.matchDate === dStr);
            if (bin) bin.disbursed += Number(l.principal_amount) || 0;
        });
        periodTransactions.filter(t => t.type === 'REPAYMENT').forEach(t => {
            const dStr = new Date(t.transaction_date).toISOString().split('T')[0];
            const bin = chartBins.find(b => b.matchDate === dStr);
            if (bin) bin.repaid += Number(t.amount) || 0;
        });
    } else {
        const startMonth = new Date(startObj.getFullYear(), startObj.getMonth(), 1);
        const endMonth = new Date(endObj.getFullYear(), endObj.getMonth(), 1);
        
        for (let d = new Date(startMonth); d <= endMonth; d.setMonth(d.getMonth() + 1)) {
              chartBins.push({
                label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
                month: d.getMonth(),
                year: d.getFullYear(),
                disbursed: 0,
                repaid: 0
            });
        }
        periodLoans.forEach(l => {
            const d = new Date(l.disbursed_at || l.created_at);
            const bin = chartBins.find(b => b.month === d.getMonth() && b.year === d.getFullYear());
            if (bin) bin.disbursed += Number(l.principal_amount) || 0;
        });
        periodTransactions.filter(t => t.type === 'REPAYMENT').forEach(t => {
            const d = new Date(t.transaction_date);
            const bin = chartBins.find(b => b.month === d.getMonth() && b.year === d.getFullYear());
            if (bin) bin.repaid += Number(t.amount) || 0;
        });
    }

    setCashFlowData(chartBins);
    setIsLoading(false);

  }, [appliedFilters, rawLoans, rawBorrowers, rawTransactions, isFetching, user, branchesList]); 

  // --- REUSABLE COMPONENTS ---
  const StatCard = ({ title, value, subtext, icon: Icon, colorClass, highlightClass }: any) => (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300 relative overflow-hidden group cursor-pointer">
      <div className={`absolute left-0 top-6 bottom-6 w-1 rounded-r-full ${highlightClass}`}></div>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5">{title}</h3>
          {isLoading ? (
            <div className="h-8 bg-slate-100 rounded-lg w-32 animate-pulse"></div>
          ) : (
            <p className={`text-2xl xl:text-3xl font-black tracking-tight ${colorClass}`}>{value}</p>
          )}
        </div>
        <div className={`p-3 rounded-2xl ${highlightClass} bg-opacity-10 text-opacity-100`}>
          <Icon size={24} className={colorClass} />
        </div>
      </div>
      <p className="text-xs font-semibold text-slate-500 flex items-center">
        {subtext}
      </p>
    </div>
  );

  const QuickAction = ({ title, icon: Icon, colorClass, onClick }: any) => (
    <button
      onClick={onClick}
      className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center space-x-4 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all outline-none focus:ring-2 focus:ring-blue-500/20 w-full text-left group"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon size={20} />
      </div>
      <span className="font-bold text-sm text-slate-700 group-hover:text-slate-900">{title}</span>
    </button>
  );

  // --- FORMATTERS & TOOLTIPS ---
  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return new Intl.NumberFormat('en-KE').format(val || 0);
  };

  const CustomCashFlowTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700/50 min-w-[160px]">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">{label} Data</p>
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white text-xs font-bold py-2.5 px-3.5 rounded-xl shadow-xl border border-slate-700/50 flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span className="text-slate-300 font-medium">{payload[0].payload.branch}:</span>
          <span>{payload[0].value} Clients</span>
        </div>
      );
    }
    return null;
  };

  const getDashboardTitle = () => {
    if (user?.role === 'Loan Officer') return 'My Portfolio';
    if (user?.role === 'Branch Manager') return 'Branch Dashboard';
    return 'Executive Dashboard';
  };

  const availableOfficers = officersList.filter(o => 
    filters.branch === 'all' ? true : o.branch_id === filters.branch
  );

  const currentDueList = dueCollections[activeDueTab];

  return (
    <div className="animate-fade-in space-y-6 max-w-7xl mx-auto pb-10">

      {/* Header & Live Data Badge */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end pb-2 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{getDashboardTitle()}</h1>
          <div className="flex items-center space-x-3 mt-2">
            <span className="text-slate-500 text-sm font-medium">Financial Health Overview</span>
            <span className="text-slate-300">|</span>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md flex items-center shadow-sm">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span>
              Live Data
            </span>
          </div>
        </div>
      </div>

      {/* --- ADVANCED FILTER BAR --- */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row xl:items-center gap-4">
        <div className="flex items-center text-slate-400 mr-2 shrink-0">
          <Filter size={18} className="mr-2" />
          <span className="text-xs font-black uppercase tracking-widest">Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 flex-1">
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={filters.branch}
              onChange={(e) => setFilters({ ...filters, branch: e.target.value, officer: 'all' })} 
              disabled={['Branch Manager', 'Loan Officer'].includes(user?.role)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer disabled:opacity-70"
            >
              {['Branch Manager', 'Loan Officer'].includes(user?.role) ? (
                <option value="all">My Branch</option>
              ) : (
                <>
                  <option value="all">All Branches</option>
                  {branchesList.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.location})</option>
                  ))}
                </>
              )}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={filters.officer}
              onChange={(e) => setFilters({ ...filters, officer: e.target.value })}
              disabled={user?.role === 'Loan Officer'}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer disabled:opacity-70"
            >
              {user?.role === 'Loan Officer' ? (
                <option value="all">My Portfolio</option>
              ) : (
                <>
                  <option value="all">All Officers</option>
                  {availableOfficers.map(o => (
                    <option key={o.id} value={o.id}>{o.first_name} {o.last_name}</option>
                  ))}
                </>
              )}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={filters.period}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value, period: 'custom' })}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value, period: 'custom' })}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <button 
          onClick={handleApplyFilters}
          className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95 outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <ArrowRight size={20} />
        </button>
      </div>

      {/* Quick Action Grid with Role Enforcements */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
        {user?.role !== 'Loan Officer' && (
          <QuickAction title="Disburse" icon={CreditCard} colorClass="bg-blue-50 text-blue-600" onClick={() => onNavigate('disbursements')} />
        )}
        
        {user?.role !== 'Loan Officer' && (
          <QuickAction title="Receive" icon={Wallet} colorClass="bg-emerald-50 text-emerald-600" onClick={() => onNavigate('repayments')} />
        )}
        
        <QuickAction title="New Client" icon={Users} colorClass="bg-indigo-50 text-indigo-600" onClick={() => onNavigate('borrowers')} />
        
        <QuickAction title="Overdue" icon={AlertTriangle} colorClass="bg-red-50 text-red-600" onClick={() => onNavigate('active-loans')} />
        
        {['Super Admin', 'Lender Admin', 'Branch Manager'].includes(user?.role) && (
          <>
            <QuickAction title="Leads" icon={Megaphone} colorClass="bg-amber-50 text-amber-600" onClick={() => onNavigate('marketing-leads')} />
            <QuickAction title="Marketing Overview" icon={BarChart3} colorClass="bg-fuchsia-50 text-fuchsia-600" onClick={() => onNavigate('marketing-overview')} />
          </>
        )}

        {user?.role !== 'Loan Officer' && (
          <QuickAction title="Reports" icon={FileText} colorClass="bg-slate-100 text-slate-700" onClick={() => onNavigate('financial-reports')} />
        )}
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Active Portfolio"
          value={`KES ${formatCurrency(kpis.activePortfolio)}`}
          subtext={<><Users size={14} className="mr-1.5 text-blue-500" /> {kpis.activeClients} Active Clients</>}
          icon={Briefcase} colorClass="text-slate-900" highlightClass="bg-blue-500"
        />
        <StatCard
          title="Period Collections"
          value={`KES ${formatCurrency(kpis.collectedInPeriod)}`}
          subtext={<><CheckCircle size={14} className="mr-1.5 text-emerald-500" /> In Selected Range</>}
          icon={TrendingUp} colorClass="text-emerald-600" highlightClass="bg-emerald-500"
        />
        <StatCard
          title="Portfolio At Risk (PAR)"
          value={`${kpis.parPercentage.toFixed(1)}%`}
          subtext={<><AlertTriangle size={14} className="mr-1.5 text-red-500" /> Value: KES {formatCurrency(kpis.parValue)}</>}
          icon={Activity} colorClass="text-red-600" highlightClass="bg-red-500"
        />
        <StatCard
          title="Loans Issued"
          value={kpis.loansIssuedInPeriod.toLocaleString()}
          subtext={<><Clock size={14} className="mr-1.5 text-indigo-500" /> In Selected Range</>}
          icon={FileText} colorClass="text-slate-900" highlightClass="bg-indigo-500"
        />
      </div>

      {/* --- UPCOMING COLLECTIONS COMPONENT --- */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mt-6">
        <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center">
              <Calendar className="mr-2 text-blue-600" size={20} />
              Upcoming Collections Tracker
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">Track expected installments based on loan product schedules</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto overflow-x-auto">
            <button 
              onClick={() => setActiveDueTab('yesterday')}
              className={`flex-1 lg:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all outline-none whitespace-nowrap ${activeDueTab === 'yesterday' ? 'bg-white text-red-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Due Yesterday ({dueCollections.yesterday.length})
            </button>
            <button 
              onClick={() => setActiveDueTab('today')}
              className={`flex-1 lg:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all outline-none whitespace-nowrap ${activeDueTab === 'today' ? 'bg-white text-blue-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Due Today ({dueCollections.today.length})
            </button>
            <button 
              onClick={() => setActiveDueTab('tomorrow')}
              className={`flex-1 lg:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all outline-none whitespace-nowrap ${activeDueTab === 'tomorrow' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Due Tomorrow ({dueCollections.tomorrow.length})
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                <th className="p-4 pl-6 w-1/4">Borrower</th>
                <th className="p-4 w-1/5">Contact</th>
                <th className="p-4 w-1/4">Loan Product</th>
                <th className="p-4 text-right w-1/6">Expected Installment</th>
                <th className="p-4 text-right pr-6 w-1/6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={5} className="py-8 text-center text-slate-400"><Loader2 className="animate-spin inline mx-auto" size={24}/></td></tr>
              ) : currentDueList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400"><CheckCircle size={28} /></div>
                    <p className="text-slate-700 font-bold text-lg">You're all caught up!</p>
                    <p className="text-slate-500 text-sm mt-1">No scheduled installments are due {activeDueTab}.</p>
                  </td>
                </tr>
              ) : (
                currentDueList.map(loan => (
                  <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-slate-900 text-sm mb-0.5">{loan.borrower?.first_name} {loan.borrower?.last_name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">ID: {loan.borrower?.national_id}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-xs font-bold text-slate-700 flex items-center"><Phone size={12} className="mr-1.5 text-slate-400" /> {loan.borrower?.phone_number}</p>
                    </td>
                    <td className="p-4">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-indigo-100 inline-block mb-1">
                        {loan.loan_product?.name || 'Standard Loan'}
                      </span>
                      <p className="text-[10px] font-bold text-slate-500 flex items-center">
                        Bal: KES {formatCurrency(loan.outstanding_balance)}
                      </p>
                    </td>
                    <td className="p-4 text-right">
                      <p className={`text-sm font-black ${activeDueTab === 'yesterday' ? 'text-red-600' : 'text-slate-900'}`}>
                        KES {formatCurrency(loan.installmentAmount)}
                      </p>
                    </td>
                    <td className="p-4 text-right pr-6">
                       {user?.role !== 'Loan Officer' && (
                         <button onClick={() => onNavigate('repayments')} className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold transition-colors outline-none shadow-sm">
                            Log Repayment
                         </button>
                       )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ANALYTICS ROW 1: Cash Flow (2/3) & Loan Status (1/3) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">

        {/* Cash Flow Trends Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Cash Flow Trends</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Disbursements vs Repayments</p>
            </div>

            {/* Custom Chart Legend */}
            <div className="hidden sm:flex items-center space-x-4 text-xs font-bold text-slate-600 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
              <div className="flex items-center"><span className="w-3 h-3 rounded bg-slate-900 mr-2"></span> Disbursements</div>
              <div className="flex items-center"><span className="w-3 h-3 rounded bg-emerald-500 mr-2"></span> Repayments</div>
            </div>
          </div>

          <div className="flex-1 w-full">
            {isFetching || isLoading ? (
              <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-2xl animate-pulse">
                <span className="text-slate-400 font-medium text-sm">Aggregating records...</span>
              </div>
            ) : cashFlowData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={cashFlowData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} tickFormatter={formatCurrency} />
                  <Tooltip content={<CustomCashFlowTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar yAxisId="left" dataKey="repaid" name="Repayments" fill="#10B981" radius={[6, 6, 0, 0]} barSize={28} />
                  <Line yAxisId="left" type="monotone" dataKey="disbursed" name="Disbursements" stroke="#0F172A" strokeWidth={4} dot={{ r: 5, strokeWidth: 3, fill: '#fff' }} activeDot={{ r: 7, strokeWidth: 0, fill: '#0F172A' }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium text-sm">No transaction data available.</div>
            )}
          </div>
        </div>

        {/* Loan Status Doughnut Chart */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8 flex flex-col h-[400px]">
          <div className="mb-2 text-center lg:text-left">
            <h2 className="text-lg font-bold text-slate-900">Loan Status</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">Portfolio distribution by state</p>
          </div>

          <div className="flex-1 w-full flex items-center justify-center min-h-[200px]">
            {isFetching || isLoading ? (
              <div className="w-48 h-48 rounded-full border-[12px] border-slate-50 animate-pulse"></div>
            ) : statusChartData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusChartData.filter(d => d.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} className="outline-none hover:opacity-80 transition-opacity cursor-pointer" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontWeight: 'bold', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#0F172A' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-slate-400 font-medium text-sm">No loans recorded.</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-y-3 gap-x-2 mt-2">
            {statusChartData.map(item => (
              <div key={item.name} className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }}></span>
                <span className="text-xs font-bold text-slate-600 truncate">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* --- ANALYTICS ROW 2: Clients By Branch (2/3) & Payment Channels (1/3) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Clients By Branch Horizontal Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8 flex flex-col h-[340px]">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Clients by Branch</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Customer distribution across locations</p>
            </div>
            <button className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors outline-none">Download CSV</button>
          </div>

          <div className="flex-1 w-full">
            {isFetching || isLoading ? (
              <div className="w-full h-full bg-slate-50 rounded-2xl animate-pulse"></div>
            ) : branchChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={branchChartData.slice(0, 5)} // Limit to top 5
                  margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
                  <YAxis dataKey="branch" type="category" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 12, fontWeight: 700 }} width={150} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="clients" radius={[0, 8, 8, 0]} barSize={20}>
                    {branchChartData.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#3B82F6' : '#93C5FD'} className="hover:opacity-80 transition-opacity cursor-pointer" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium text-sm">No branch data available.</div>
            )}
          </div>
        </div>

        {/* Payment Channels */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 lg:p-8 flex flex-col h-[340px]">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Recent Activity <span className="text-xs font-semibold text-slate-400 font-normal ml-1">(Database Linked)</span></h2>

          <div className="space-y-4 flex-1 flex flex-col justify-center items-center text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-2">
              <Activity size={28} />
            </div>
            <p className="text-sm font-bold text-slate-700">Metrics are live!</p>
            <p className="text-xs font-medium text-slate-500 px-4">
              The charts and KPIs above are now actively syncing with your PostgreSQL database.
            </p>
          </div>

          <button onClick={() => onNavigate('transaction-history')} className="w-full mt-2 py-3.5 bg-white text-blue-600 font-bold text-sm rounded-xl hover:bg-blue-50 transition-colors border border-slate-200 hover:border-blue-200 outline-none shadow-sm">
            View All Transactions
          </button>
        </div>

      </div>

    </div>
  );
};