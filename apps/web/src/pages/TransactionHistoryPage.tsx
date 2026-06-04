import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import { 
  Search, Filter, ArrowDownLeft, ArrowUpRight, 
  ReceiptText, Download, Loader2, Calendar,
  ShieldCheck, MapPin, User, Wallet, PiggyBank,
  TrendingUp, TrendingDown, DollarSign, Activity
} from 'lucide-react';

export const TransactionHistoryPage = () => {
  const user = useAuthStore((state: any) => state.user);
  
  // --- RAW DATA STATE ---
  const [transactions, setTransactions] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- FILTER STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterBranch, setFilterBranch] = useState('ALL');
  const [filterOfficer, setFilterOfficer] = useState('ALL');
  const [filterPeriod, setFilterPeriod] = useState('THIS_MONTH');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    const fetchLedgerData = async () => {
      if (!user?.lender_id && user?.role !== 'Super Admin') return;
      
      setIsLoading(true);
      try {
        const activeLenderId = user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e';
        const queryParams = `?lender_id=${activeLenderId}`;

        const [txRes, branchesRes, usersRes] = await Promise.all([
          api.get(`/transactions${queryParams}`),
          api.get(`/branches${queryParams}`).catch(() => ({ data: [] })),
          api.get(`/users${queryParams}`).catch(() => ({ data: [] }))
        ]);

        setTransactions(Array.isArray(txRes.data) ? txRes.data : (txRes.data?.data || []));
        setBranches(branchesRes.data || []);
        
        const staff = (usersRes.data || []).filter((u: any) => 
          ['Loan Officer', 'Branch Manager'].includes(u.role?.name) || u.role_id === 4 || u.role_id === 3
        );
        setOfficers(staff.length > 0 ? staff : usersRes.data);

      } catch (error) {
        console.error('Failed to fetch ledger data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLedgerData();
  }, [user]);

  // --- DATA AGGREGATION ENGINE ---
  const { filteredTransactions, kpis } = useMemo(() => {
    const now = new Date();
    let start = new Date(0); 
    let end = new Date();

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
    } else if (filterPeriod === 'CUSTOM' && customStart && customEnd) {
        start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
        end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
    }

    const filtered = transactions.filter(tx => {
        const d = new Date(tx.transaction_date || tx.created_at);
        if (d < start || d > end) return false;

        if (filterType !== 'ALL' && tx.type !== filterType) return false;

        const bMatch = filterBranch === 'ALL' || tx.loan?.borrower?.branch_id === filterBranch;
        const oMatch = filterOfficer === 'ALL' || tx.loan?.borrower?.user_id === filterOfficer;
        if (!bMatch || !oMatch) return false;

        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const borrowerName = `${tx.loan?.borrower?.first_name || ''} ${tx.loan?.borrower?.last_name || ''}`.toLowerCase();
            const refCode = (tx.reference_code || '').toLowerCase();
            if (!borrowerName.includes(searchLower) && !refCode.includes(searchLower)) return false;
        }

        return true;
    });

    let cashIn = 0;
    let cashOut = 0;

    filtered.forEach(tx => {
        const amount = Number(tx.amount) || 0;
        if (tx.type === 'REPAYMENT') cashIn += amount;
        if (tx.type === 'DISBURSEMENT') cashOut += amount;
    });

    return {
        filteredTransactions: filtered,
        kpis: {
            cashIn,
            cashOut,
            netPosition: cashIn - cashOut,
            volume: filtered.length
        }
    };
  }, [transactions, filterType, filterBranch, filterOfficer, filterPeriod, customStart, customEnd, searchTerm]);

  // --- EXPORT FUNCTION ---
  const handleExportStatement = () => {
    if (filteredTransactions.length === 0) return;
    
    const headers = ['Date', 'Reference Code', 'Type', 'Borrower', 'National ID', 'Amount', 'Description'];
    const csvRows = filteredTransactions.map(tx => [
        new Date(tx.transaction_date || tx.created_at).toLocaleString().replace(/,/g, ''),
        tx.reference_code || 'N/A',
        tx.type,
        `${tx.loan?.borrower?.first_name || ''} ${tx.loan?.borrower?.last_name || ''}`.trim() || 'System',
        tx.loan?.borrower?.national_id || 'N/A',
        Number(tx.amount).toFixed(2),
        tx.description || 'System Record'
    ]);
    
    const csvContent = [headers.join(','), ...csvRows.map(r => `"${r.join('","')}"`)].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Transaction_Ledger_${filterPeriod}_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 2 }).format(amount || 0);
  };

  const formatCompact = (val: number) => {
    if (Math.abs(val) >= 1000000) return `KES ${(val / 1000000).toFixed(2)}M`;
    if (Math.abs(val) >= 1000) return `KES ${(val / 1000).toFixed(1)}K`;
    return `KES ${val.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    }).format(d);
  };

  const availableOfficers = officers.filter(o => filterBranch === 'ALL' ? true : o.branch_id === filterBranch);

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-10">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Transaction Ledger</h1>
          <p className="text-slate-500 font-medium mt-1">Comprehensive history of all incoming and outgoing funds.</p>
        </div>
        <button 
          onClick={handleExportStatement}
          disabled={filteredTransactions.length === 0}
          className="flex items-center space-x-2 bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow-md shadow-slate-900/20 outline-none disabled:opacity-50"
        >
          <Download size={18} />
          <span className="hidden sm:inline">Export Statement</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 mb-6">
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
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
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
                      {availableOfficers.map(o => <option key={o.id} value={o.id}>{o.first_name} {o.last_name}</option>)}
                  </select>
              </div>

              <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                      value={filterPeriod}
                      onChange={(e) => setFilterPeriod(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-emerald-300 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600"><PiggyBank size={24} /></div>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md">Collected</span>
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Cash In</p>
                <h3 className="text-2xl lg:text-3xl font-black text-emerald-600 tracking-tight">{formatCompact(kpis.cashIn)}</h3>
            </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-300 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600"><Wallet size={24} /></div>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md">Issued</span>
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Cash Out</p>
                <h3 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">{formatCompact(kpis.cashOut)}</h3>
            </div>
        </div>

        <div className="bg-[#0B1121] p-6 rounded-3xl shadow-lg flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><DollarSign size={80} className="text-white" /></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-3 rounded-2xl ${kpis.netPosition >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {kpis.netPosition >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                </div>
            </div>
            <div className="relative z-10">
                <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Net Position</p>
                <h3 className={`text-2xl lg:text-3xl font-black tracking-tight ${kpis.netPosition >= 0 ? 'text-white' : 'text-red-400'}`}>
                    {formatCompact(kpis.netPosition)}
                </h3>
            </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-indigo-300 transition-colors">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600"><Activity size={24} /></div>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md">Traffic</span>
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Tx Volume</p>
                <h3 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">{kpis.volume.toLocaleString()}</h3>
            </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-t-3xl border-x border-t border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search by reference code or borrower..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-[3px] focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-900 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center p-1 bg-slate-100 border border-slate-200 rounded-xl w-full md:w-auto">
          {['ALL', 'REPAYMENT', 'DISBURSEMENT'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filterType === type 
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {type.charAt(0) + type.slice(1).toLowerCase() + (type === 'ALL' ? ' Types' : 's')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-b-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Transaction</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Borrower</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Reference</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Date</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Amount</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold">Loading ledger records...</p>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                    No transactions found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx: any) => {
                  const isRepayment = tx.type === 'REPAYMENT';
                  
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isRepayment ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {isRepayment ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{isRepayment ? 'Payment Received' : 'Funds Disbursed'}</p>
                            <p className="text-xs text-slate-500 font-medium truncate max-w-[150px]">{tx.description || 'System Record'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <p className="text-sm font-bold text-slate-900">
                          {tx.loan?.borrower?.first_name || 'System'} {tx.loan?.borrower?.last_name || 'Record'}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">ID: {tx.loan?.borrower?.national_id || 'N/A'}</p>
                      </td>

                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {tx.reference_code || 'N/A'}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2 text-slate-600">
                          <Calendar size={14} className="text-slate-400" />
                          <span className="text-sm font-medium">{formatDate(tx.transaction_date || tx.created_at)}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <p className={`text-sm font-black font-mono ${isRepayment ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {isRepayment ? '+' : '-'}{formatCurrency(tx.amount)}
                        </p>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors outline-none focus:ring-2 focus:ring-blue-500/20">
                          <ReceiptText size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {!isLoading && filteredTransactions.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 flex justify-between items-center">
            <span>Showing {filteredTransactions.length} records</span>
            <span className="flex items-center space-x-1"><ShieldCheck size={14} className="text-emerald-500 mr-1"/> Bank-grade encrypted ledger</span>
          </div>
        )}
      </div>

    </div>
  );
};