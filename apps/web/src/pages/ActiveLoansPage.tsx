import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import { 
  Search, Filter, Briefcase, FileText, 
  AlertTriangle, CheckCircle2, ChevronRight, ArrowRight, 
  Loader2, Wallet, Send, ShieldCheck, MapPin, User, Calendar, ChevronDown, Clock, XCircle
} from 'lucide-react';

// Helper to calculate current month dates synchronously
const getCurrentMonthDates = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end };
};

export const ActiveLoansPage = ({ onNavigate }: { onNavigate: (path: any) => void }) => {
  const user = useAuthStore((state: any) => state.user);
  const canManage = ['Super Admin', 'Lender Admin', 'Branch Manager'].includes(user?.role);
  
  // NEW: Strict rule for who can see the Actions column at all
  const canViewActions = ['Super Admin', 'Lender Admin', 'Branch Manager'].includes(user?.role);
  
  // --- RAW DATA STATE ---
  const [isFetching, setIsFetching] = useState(true);
  const [rawLoans, setRawLoans] = useState<any[]>([]);
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
  const [statusFilter, setStatusFilter] = useState('ACTIVE'); // 'ALL', 'PENDING', 'ACTIVE', 'DEFAULTED'
  const [filteredLoans, setFilteredLoans] = useState<any[]>([]);

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

        const [loansRes, branchesRes, usersRes] = await Promise.all([
          api.get(`/loans${queryParams}`),
          api.get(`/branches${queryParams}`).catch(() => ({ data: [] })),
          api.get(`/users${queryParams}`).catch(() => ({ data: [] }))
        ]);

        const fetchedLoans = Array.isArray(loansRes.data) ? loansRes.data : (loansRes.data?.data || []);
        const fetchedUsers = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.data || []);

        setRawLoans(fetchedLoans);
        setBranchesList(branchesRes.data || []);
        
        // Extract strictly staff users
        const staff = fetchedUsers.filter((u: any) => 
          u.role?.name === 'Loan Officer' || 
          u.role?.name === 'Branch Manager' || 
          u.role_id === 4 || 
          u.role_id === 3
        );
        
        if (staff.length > 0) {
          setOfficersList(staff);
        } else {
          // Fallback: Infer officers from loans
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

  // 2. APPLY HIERARCHICAL & DATE FILTERS
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

  const availableOfficers = officersList.filter(o => 
    filters.branch === 'all' ? true : o.branch_id === filters.branch || !o.branch_id
  );

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'ACTIVE') return <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-emerald-200"><CheckCircle2 size={10} className="inline mr-1 -mt-0.5"/> Active</span>;
    if (status === 'DEFAULTED') return <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-red-200"><AlertTriangle size={10} className="inline mr-1 -mt-0.5"/> Defaulted</span>;
    if (status === 'COMPLETED') return <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-blue-200"><CheckCircle2 size={10} className="inline mr-1 -mt-0.5"/> Completed</span>;
    return <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-amber-200"><Clock size={10} className="inline mr-1 -mt-0.5"/> Pending</span>;
  };

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

      {/* Data Table */}
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