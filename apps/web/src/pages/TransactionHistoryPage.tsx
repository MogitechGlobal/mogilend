import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import { 
  Search, Filter, ArrowDownLeft, ArrowUpRight, 
  ReceiptText, Download, Loader2, Calendar,
  ShieldCheck
} from 'lucide-react';

export const TransactionHistoryPage = () => {
  const user = useAuthStore((state: any) => state.user);
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'REPAYMENT', 'DISBURSEMENT'

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user?.lender_id) return;
      
      setIsLoading(true);
      try {
        // Construct the query based on filters and roles
        let url = `/transactions?lender_id=${user.lender_id}`;
        if (filterType !== 'ALL') {
          url += `&type=${filterType}`;
        }

        const response = await api.get(url);
        // Defensively extract data
        const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        setTransactions(data);
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [user, filterType]); // Re-fetch when the type filter changes

  // Formatting Helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    }).format(d);
  };

  // Local Search Filtering
  const filteredTransactions = transactions.filter((tx: any) => {
    const searchLower = searchTerm.toLowerCase();
    const borrowerName = `${tx.loan?.borrower?.first_name || ''} ${tx.loan?.borrower?.last_name || ''}`.toLowerCase();
    const refCode = (tx.reference_code || '').toLowerCase();
    
    return borrowerName.includes(searchLower) || refCode.includes(searchLower);
  });

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-10">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Transaction Ledger</h1>
          <p className="text-slate-500 font-medium mt-1">Comprehensive history of all incoming and outgoing funds.</p>
        </div>
        <button className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all outline-none focus:ring-4 focus:ring-slate-100 shadow-sm">
          <Download size={18} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-t-3xl border-x border-t border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        
        {/* Search */}
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

        {/* Type Filter */}
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

      {/* Data Table */}
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
                      {/* Type Indicator */}
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

                      {/* Borrower */}
                      <td className="py-4 px-6">
                        <p className="text-sm font-bold text-slate-900">
                          {tx.loan?.borrower?.first_name} {tx.loan?.borrower?.last_name}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">ID: {tx.loan?.borrower?.national_id}</p>
                      </td>

                      {/* Reference */}
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {tx.reference_code || 'N/A'}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2 text-slate-600">
                          <Calendar size={14} className="text-slate-400" />
                          <span className="text-sm font-medium">{formatDate(tx.transaction_date)}</span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-6 text-right">
                        <p className={`text-sm font-black font-mono ${isRepayment ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {isRepayment ? '+' : '-'}{formatCurrency(tx.amount)}
                        </p>
                      </td>

                      {/* Action */}
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