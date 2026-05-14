import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import { 
  Search, Filter, Briefcase, FileText, 
  AlertTriangle, CheckCircle2, ChevronRight, 
  Loader2, Wallet, Send, ShieldCheck
} from 'lucide-react';

export const ActiveLoansPage = ({ onNavigate }: { onNavigate: (path: any) => void }) => {
  const user = useAuthStore((state: any) => state.user);
  
  const [loans, setLoans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE'); // 'ALL', 'PENDING', 'ACTIVE', 'DEFAULTED'

  useEffect(() => {
    const fetchLoans = async () => {
      if (!user?.lender_id) return;
      
      setIsLoading(true);
      try {
        const response = await api.get(`/loans?lender_id=${user.lender_id}`);
        const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        
        // Transform backend statuses to match UI filters if necessary
        const processedData = data.map((loan: any) => ({
          ...loan,
          ui_status: loan.status === 'DISBURSED' ? 'ACTIVE' : loan.status
        }));

        setLoans(processedData);
      } catch (error) {
        console.error('Failed to fetch loans:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLoans();
  }, [user]);

  // --- FILTERING ENGINE ---
  const filteredLoans = loans.filter((loan) => {
    const searchString = `${loan.borrower?.first_name} ${loan.borrower?.last_name} ${loan.borrower?.national_id}`.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());
    
    // Status Filter Logic
    let matchesStatus = false;
    if (statusFilter === 'ALL') {
      matchesStatus = ['ACTIVE', 'DEFAULTED', 'PENDING'].includes(loan.ui_status);
    } else {
      matchesStatus = loan.ui_status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  // --- KPI CALCULATIONS ---
  const totalActiveValue = filteredLoans
    .filter(l => l.ui_status === 'ACTIVE' || l.ui_status === 'DEFAULTED')
    .reduce((sum, l) => sum + (Number(l.outstanding_balance) || 0), 0);

  // --- FORMATTERS ---
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(val || 0);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200/50"><CheckCircle2 size={12} className="mr-1"/> Active</span>;
      case 'DEFAULTED':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-200/50 animate-pulse"><AlertTriangle size={12} className="mr-1"/> PAR / Default</span>;
      case 'PENDING':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200/50">Pending</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200/50">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-10">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Active Portfolio</h1>
          <p className="text-slate-500 font-medium mt-1">Manage ongoing credit facilities, track repayments, and monitor risk.</p>
        </div>
        <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-lg flex items-center space-x-4 border border-slate-700">
          <div className="p-2 bg-slate-800 rounded-xl"><Briefcase size={20} className="text-blue-400" /></div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-0.5">Filtered Value</p>
            <p className="text-xl font-black tracking-tight">{formatCurrency(totalActiveValue)}</p>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-t-3xl border-x border-t border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        
        {/* Search */}
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search by borrower name or National ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-[3px] focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-900 placeholder-slate-400"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center p-1 bg-slate-100 border border-slate-200 rounded-xl w-full md:w-auto">
          {['ALL', 'ACTIVE', 'DEFAULTED', 'PENDING'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === status 
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {status === 'ACTIVE' ? 'Active' : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-b-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Borrower</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Facility Type</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Principal</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Outstanding Bal</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Status</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold">Loading active facilities...</p>
                  </td>
                </tr>
              ) : filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                    No credit facilities found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan: any) => (
                  <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors group">
                    
                    {/* Borrower */}
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm uppercase border border-slate-200 shrink-0">
                          {loan.borrower?.first_name?.[0]}{loan.borrower?.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">
                            {loan.borrower?.first_name} {loan.borrower?.last_name}
                          </p>
                          <p className="text-xs text-slate-500 font-mono">ID: {loan.borrower?.national_id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Facility Type */}
                    <td className="py-4 px-6">
                      <p className="text-sm font-bold text-slate-700">{loan.loan_product?.name || 'Standard Loan'}</p>
                      <p className="text-xs font-medium text-slate-500">Rate: {loan.interest_rate}% {loan.loan_product?.interest_type === 'Flat Rate' ? 'Flat' : ''}</p>
                    </td>

                    {/* Principal Amount */}
                    <td className="py-4 px-6 text-right">
                      <p className="text-sm font-bold font-mono text-slate-600">
                        {formatCurrency(loan.principal_amount)}
                      </p>
                    </td>

                    {/* Outstanding Balance */}
                    <td className="py-4 px-6 text-right">
                      <p className={`text-sm font-black font-mono ${
                        loan.ui_status === 'DEFAULTED' ? 'text-red-600' : 'text-slate-900'
                      }`}>
                        {formatCurrency(loan.outstanding_balance)}
                      </p>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-6 text-center">
                      {getStatusBadge(loan.ui_status)}
                    </td>

                    {/* Quick Actions */}
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center space-x-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        
                        {/* If Active/Defaulted -> Show Receive Payment Button */}
                        {(loan.ui_status === 'ACTIVE' || loan.ui_status === 'DEFAULTED') && (
                          <button 
                            onClick={() => onNavigate('repayments')}
                            title="Record Repayment"
                            className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors outline-none shadow-sm"
                          >
                            <Wallet size={16} />
                          </button>
                        )}

                        {/* If Pending -> Show Disburse Button */}
                        {loan.ui_status === 'PENDING' && (
                          <button 
                            onClick={() => onNavigate('disbursements')}
                            title="Process Disbursement"
                            className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors outline-none shadow-sm"
                          >
                            <Send size={16} />
                          </button>
                        )}

                        {/* View Statement Button */}
                        <button 
                          onClick={() => onNavigate('portfolio-report')}
                          title="View Ledger"
                          className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white rounded-lg transition-colors outline-none shadow-sm"
                        >
                          <FileText size={16} />
                        </button>
                        
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {!isLoading && filteredLoans.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 flex justify-between items-center">
            <span>Showing {filteredLoans.length} active facilities</span>
            <span className="flex items-center space-x-1"><ShieldCheck size={14} className="text-blue-500 mr-1"/> Portfolio live sync active</span>
          </div>
        )}
      </div>

    </div>
  );
};