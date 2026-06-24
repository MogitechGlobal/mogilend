import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import { 
  Search, Filter, Briefcase, FileText, 
  AlertTriangle, CheckCircle2, ChevronRight, ArrowRight, 
  Loader2, Wallet, Send, ShieldCheck, MapPin, User, Calendar, ChevronDown, Clock, XCircle, Phone
} from 'lucide-react';

// Helper to calculate current month dates synchronously
const getCurrentMonthDates = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end };
};

// Helper to safely format dates to YYYY-MM-DD in the local timezone
const getLocalYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const ActiveLoansPage = ({ onNavigate }: { onNavigate: (path: any) => void }) => {
  const user = useAuthStore((state: any) => state.user);
  const canManage = ['Super Admin', 'Lender Admin', 'Branch Manager'].includes(user?.role);
  const canViewActions = ['Super Admin', 'Lender Admin', 'Branch Manager'].includes(user?.role);
  
  // --- RAW DATA STATE ---
  const [isFetching, setIsFetching] = useState(true);
  const [rawLoans, setRawLoans] = useState<any[]>([]);
  const [rawTransactions, setRawTransactions] = useState<any[]>([]);
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [officersList, setOfficersList] = useState<any[]>([]);
  
  // --- ADVANCED FILTERS STATE ---
  const [filters, setFilters] = useState({
    branch: 'all',
    officer: 'all',
    period: 'this_month',
    startDate: getCurrentMonthDates().start,
    endDate: getCurrentMonthDates().end
  });
  const [appliedFilters, setAppliedFilters] = useState({ ...filters });

  // --- LOCAL UI STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE'); 
  const [filteredLoans, setFilteredLoans] = useState<any[]>([]);

  // --- COLLECTIONS TRACKER STATE ---
  const [activeDueTab, setActiveDueTab] = useState<'yesterday' | 'today' | 'tomorrow'>('today');
  const [dueCollections, setDueCollections] = useState<{ yesterday: any[], today: any[], tomorrow: any[] }>({ yesterday: [], today: [], tomorrow: [] });

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

  // 1. FETCH BASE DATA
  useEffect(() => {
    const fetchRawData = async () => {
      if (!user?.lender_id && user?.role !== 'Super Admin') return;

      setIsFetching(true);
      try {
        const activeLenderId = user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e';
        const queryParams = `?lender_id=${activeLenderId}`;

        const [loansRes, branchesRes, usersRes, transRes] = await Promise.all([
          api.get(`/loans${queryParams}`),
          api.get(`/branches${queryParams}`).catch(() => ({ data: [] })),
          api.get(`/users${queryParams}`).catch(() => ({ data: [] })),
          api.get(`/transactions?type=REPAYMENT&lender_id=${activeLenderId}`).catch(() => ({ data: [] }))
        ]);

        const fetchedLoans = Array.isArray(loansRes.data) ? loansRes.data : (loansRes.data?.data || []);
        const fetchedUsers = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.data || []);

        setRawLoans(fetchedLoans);
        setRawTransactions(Array.isArray(transRes.data) ? transRes.data : []);
        setBranchesList(branchesRes.data || []);
        
        const staff = fetchedUsers.filter((u: any) => 
          u.role?.name === 'Loan Officer' || 
          u.role?.name === 'Branch Manager' || 
          u.role_id === 4 || 
          u.role_id === 3
        );
        
        if (staff.length > 0) {
          setOfficersList(staff);
        } else {
          const uniqueOfficerIds = Array.from(new Set(fetchedLoans.map((l: any) => l.borrower?.user_id).filter(Boolean)));
          const fallbackOfficers = uniqueOfficerIds.map((id: any) => {
            const sampleLoan = fetchedLoans.find((l: any) => l.borrower?.user_id === id);
            return {
              id: id,
              first_name: sampleLoan?.borrower?.user?.first_name || 'Officer',
              last_name: sampleLoan?.borrower?.user?.last_name || String(id).substring(0, 6),
              branch_id: sampleLoan?.borrower?.branch_id
            };
          });
          setOfficersList(fallbackOfficers);
        }

        setAppliedFilters(filters);
      } catch (error) {
        console.error('Failed to fetch loan data:', error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchRawData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.lender_id, user?.role]);

  // Handle Apply Button
  const handleApplyFilters = () => {
    setAppliedFilters(filters);
  };

  // 2. APPLY HIERARCHICAL & DATE FILTERS FOR MAIN TABLE
  useEffect(() => {
    if (isFetching || !appliedFilters.startDate) return;

    let processed = rawLoans;

    // A. Role & Dropdown Filters
    if (user?.role === 'Loan Officer') {
      processed = processed.filter(l => l.borrower?.user_id === user.id);
    } else if (user?.role === 'Branch Manager') {
      processed = processed.filter(l => l.borrower?.branch_id === user.branch_id);
      if (appliedFilters.officer !== 'all') {
        processed = processed.filter(l => l.borrower?.user_id === appliedFilters.officer);
      }
    } else {
      if (appliedFilters.branch !== 'all') {
        processed = processed.filter(l => l.borrower?.branch_id === appliedFilters.branch);
      }
      if (appliedFilters.officer !== 'all') {
        processed = processed.filter(l => l.borrower?.user_id === appliedFilters.officer);
      }
    }

    // B. Date Filters
    const startObj = new Date(appliedFilters.startDate);
    startObj.setHours(0, 0, 0, 0);
    const endObj = new Date(appliedFilters.endDate);
    endObj.setHours(23, 59, 59, 999);

    processed = processed.filter(l => {
      const d = new Date(l.disbursed_at || l.created_at);
      return d >= startObj && d <= endObj;
    });

    // C. Map UI Statuses
    processed = processed.map(loan => ({
      ...loan,
      ui_status: loan.status === 'DISBURSED' ? 'ACTIVE' : 
                 loan.status === 'DEFAULTED' ? 'DEFAULTED' :
                 loan.status === 'PENDING' || loan.status === 'AMENDMENT_REQUIRED' ? 'PENDING' : 'COMPLETED'
    }));

    // D. Apply Status Tab
    if (statusFilter !== 'ALL') {
      processed = processed.filter(l => l.ui_status === statusFilter);
    }

    // E. Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      processed = processed.filter(l => 
        l.borrower?.first_name?.toLowerCase().includes(q) ||
        l.borrower?.last_name?.toLowerCase().includes(q) ||
        l.borrower?.national_id?.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q)
      );
    }

    setFilteredLoans(processed);
  }, [rawLoans, appliedFilters, statusFilter, searchQuery, isFetching, user]);

  // 3. COLLECTIONS TRACKER CALCULATION
  useEffect(() => {
    if (isFetching) return;

    // Pre-filter loans based ONLY on hierarchy (ignore date ranges for collections)
    let trackerBase = rawLoans;
    
    if (user?.role === 'Loan Officer') {
      trackerBase = trackerBase.filter(l => l.borrower?.user_id === user.id);
    } else if (user?.role === 'Branch Manager') {
      trackerBase = trackerBase.filter(l => l.borrower?.branch_id === user.branch_id);
      if (appliedFilters.officer !== 'all') {
        trackerBase = trackerBase.filter(l => l.borrower?.user_id === appliedFilters.officer);
      }
    } else {
      if (appliedFilters.branch !== 'all') {
        trackerBase = trackerBase.filter(l => l.borrower?.branch_id === appliedFilters.branch);
      }
      if (appliedFilters.officer !== 'all') {
        trackerBase = trackerBase.filter(l => l.borrower?.user_id === appliedFilters.officer);
      }
    }

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

    trackerBase.forEach((loan: any) => {
      // Only check schedule for active loans
      if (loan.status !== 'DISBURSED' || !loan.disbursed_at || loan.outstanding_balance <= 0) return;
      
      const cycle = String(loan.loan_product?.repayment_cycle || 'MONTHLY').toUpperCase();
      const term = loan.term || 1;
      const installmentAmount = (Number(loan.total_owed) || 0) / term;
      
      const disbursedDate = new Date(loan.disbursed_at);

      let isDueYesterday = false;
      let isDueToday = false;
      let isDueTomorrow = false;
      let cumulativeAmortizationExpected = 0;

      // Calculate total paid on this specific loan
      const totalPaidOnLoan = rawTransactions
        .filter((t: any) => t.loan_id === loan.id && t.type === 'REPAYMENT')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

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

        const expectedStr = getLocalYMD(expectedDueDate);
        
        if (expectedDueDate.getTime() <= now.getTime() || expectedStr === todayStr) {
          cumulativeAmortizationExpected += installmentAmount;
        }

        if (expectedStr === yesterdayStr) isDueYesterday = true;
        if (expectedStr === todayStr) isDueToday = true;
        if (expectedStr === tomorrowStr) isDueTomorrow = true;
      }

      const isFullyPaidUpToDate = totalPaidOnLoan >= cumulativeAmortizationExpected;

      // Arrears check for the week
      const paidThisWeek = rawTransactions.some((t: any) => {
         const tDate = new Date(t.transaction_date);
         const daysDiff = (now.getTime() - tDate.getTime()) / (1000 * 3600 * 24);
         return t.loan_id === loan.id && t.type === 'REPAYMENT' && daysDiff <= 7;
      });

      const processedLoanData = { 
         ...loan, 
         installmentAmount, 
         inArrears: !paidThisWeek && !isFullyPaidUpToDate
      };

      if (isDueYesterday && !isFullyPaidUpToDate) dueYesterday.push(processedLoanData);
      if (isDueToday && !isFullyPaidUpToDate) dueToday.push(processedLoanData);
      if (isDueTomorrow) {
         const isPaidIncludingTomorrow = totalPaidOnLoan >= (cumulativeAmortizationExpected + installmentAmount);
         if (!isPaidIncludingTomorrow) dueTomorrow.push(processedLoanData);
      }
    });

    setDueCollections({ yesterday: dueYesterday, today: dueToday, tomorrow: dueTomorrow });

  }, [rawLoans, rawTransactions, appliedFilters.branch, appliedFilters.officer, isFetching, user]);

  const availableOfficers = officersList.filter(o => 
    filters.branch === 'all' ? true : o.branch_id === filters.branch || !o.branch_id
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-KE').format(val || 0);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'ACTIVE') return <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-emerald-200"><CheckCircle2 size={10} className="inline mr-1 -mt-0.5"/> Active</span>;
    if (status === 'DEFAULTED') return <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-red-200"><AlertTriangle size={10} className="inline mr-1 -mt-0.5"/> Defaulted</span>;
    if (status === 'COMPLETED') return <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-blue-200"><CheckCircle2 size={10} className="inline mr-1 -mt-0.5"/> Completed</span>;
    return <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-amber-200"><Clock size={10} className="inline mr-1 -mt-0.5"/> Pending</span>;
  };

  const currentDueList = dueCollections[activeDueTab];

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Active Portfolio</h1>
          <p className="text-slate-500 font-medium mt-1">Monitor, manage, and execute actions on credit facilities.</p>
        </div>
      </div>

      {/* --- ADVANCED FILTER BAR --- */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row xl:items-center gap-4 mb-8">
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
                  {availableOfficers.map((o, idx) => (
                    <option key={o.id || idx} value={o.id}>{o.first_name} {o.last_name}</option>
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

      {/* --- UPCOMING COLLECTIONS TRACKER --- */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mb-8">
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
              {isFetching ? (
                <tr><td colSpan={5} className="py-8 text-center text-slate-400"><Loader2 className="animate-spin inline mx-auto" size={24}/></td></tr>
              ) : currentDueList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400"><CheckCircle2 size={24} /></div>
                    <p className="text-slate-700 font-bold text-sm">You're all caught up!</p>
                    <p className="text-slate-500 text-xs mt-1">No scheduled installments are due {activeDueTab}.</p>
                  </td>
                </tr>
              ) : (
                currentDueList.map(loan => (
                  <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center space-x-2">
                        <div>
                          <p className="font-bold text-slate-900 text-sm mb-0.5">{loan.borrower?.first_name} {loan.borrower?.last_name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">ID: {loan.borrower?.national_id}</p>
                        </div>
                        {loan.inArrears && (
                          <span className="bg-red-50 text-red-600 text-[8px] font-black uppercase tracking-wider border border-red-200 px-1.5 py-0.5 rounded animate-pulse">
                            Arrears
                          </span>
                        )}
                      </div>
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
                      <p className={`text-sm font-black ${activeDueTab === 'yesterday' || loan.inArrears ? 'text-red-600' : 'text-slate-900'}`}>
                        KES {formatCurrency(loan.installmentAmount)}
                      </p>
                    </td>
                    <td className="p-4 text-right pr-6">
                       {canManage && (
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

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex space-x-2 overflow-x-auto pb-2 custom-scrollbar max-w-full">
          {['ALL', 'ACTIVE', 'PENDING', 'DEFAULTED', 'COMPLETED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-5 py-2 rounded-xl text-sm font-bold capitalize transition-all outline-none whitespace-nowrap ${
                statusFilter === tab 
                  ? 'bg-slate-800 text-white shadow-md' 
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.toLowerCase()}
            </button>
          ))}
        </div>

        <div className="relative group w-full md:w-72 shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search Borrower or ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-widest font-black">
                <th className="p-5 pl-6 w-[30%]">Borrower</th>
                <th className="p-5 w-[15%]">Loan Reference</th>
                <th className="p-5 w-[15%] text-right">Principal</th>
                <th className="p-5 w-[15%] text-right">Outstanding</th>
                <th className="p-5 text-center">Status</th>
                {canViewActions && <th className="p-5 text-right pr-6 w-[15%]">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isFetching ? (
                <tr>
                  <td colSpan={canViewActions ? 6 : 5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Loader2 size={40} className="animate-spin mb-4 text-slate-300" />
                      <p className="font-bold">Aggregating portfolio...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={canViewActions ? 6 : 5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 px-4">
                      <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4"><Briefcase size={28} /></div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">No loans found</h3>
                      <p className="text-slate-500 font-medium text-sm">No facilities match the active filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-5 pl-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm border border-blue-100 shrink-0 uppercase">
                          {loan.borrower?.first_name?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{loan.borrower?.first_name} {loan.borrower?.last_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {loan.borrower?.national_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded inline-block border border-slate-200">
                        #{loan.id.substring(0, 8).toUpperCase()}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                        {new Date(loan.disbursed_at || loan.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="p-5 text-right font-black text-sm text-slate-900">
                      KES {Number(loan.principal_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-5 text-right font-black text-sm text-amber-600">
                      KES {Number(loan.outstanding_balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-5 text-center">
                      <StatusBadge status={loan.ui_status} />
                    </td>
                    {canViewActions && (
                      <td className="p-5 text-right pr-6">
                        <div className="flex justify-end items-center space-x-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          
                          {/* Manager/Admin Action: Process Disbursement */}
                          {loan.ui_status === 'PENDING' && canManage && (
                            <button 
                              onClick={() => onNavigate('disbursements')}
                              title="Process Disbursement"
                              className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors outline-none shadow-sm"
                            >
                              <Send size={16} />
                            </button>
                          )}

                          {/* Universal Action: View Statement */}
                          <button 
                            onClick={() => onNavigate('portfolio-report')}
                            title="View Ledger Statement"
                            className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white rounded-lg transition-colors outline-none shadow-sm flex items-center space-x-2"
                          >
                            <FileText size={16} /> <span className="text-xs font-bold hidden xl:inline pr-1">View</span>
                          </button>
                          
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {!isFetching && filteredLoans.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 flex justify-between items-center">
            <span>Showing {filteredLoans.length} filtered facilities</span>
            <span className="flex items-center space-x-1"><ShieldCheck size={14} className="text-blue-500 mr-1"/> Portfolio live sync active</span>
          </div>
        )}
      </div>

    </div>
  );
};