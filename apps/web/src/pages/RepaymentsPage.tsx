import React, { useState, useEffect, useMemo } from 'react';
import useAuthStore from '../store/authStore';
import { api } from '../lib/api';
import { 
  Search, Plus, CheckCircle2, 
  Clock, Wallet, Loader2, ArrowDownLeft, FileText, Banknote,
  Eye, Printer, Edit, Trash2, X, AlertTriangle
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export const RepaymentsPage = () => {
  const user = useAuthStore((state: any) => state.user);
  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Lender Admin';
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeLoans, setActiveLoans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Main Action Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewReceiptModal, setViewReceiptModal] = useState<any | null>(null);
  const [deleteModal, setDeleteModal] = useState<any | null>(null);
  const [editModal, setEditModal] = useState<any | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [formError, setFormError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    loan_id: '',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    method: 'M-Pesa',
    reference_code: ''
  });

  const selectedLoan = activeLoans.find(l => l.id === formData.loan_id);

  // Fetch Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const lenderId = user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e';
      
      const [transRes, loansRes] = await Promise.all([
        api.get(`/transactions?type=REPAYMENT&lender_id=${lenderId}`),
        api.get(`/loans?lender_id=${lenderId}`)
      ]);

      setTransactions(transRes.data);
      setActiveLoans(loansRes.data.filter((l: any) => ['DISBURSED', 'DEFAULTED'].includes(l.status)));
    } catch (error) {
      console.error('Failed to fetch repayment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  // Handle Form Submission (New Payment with Duplicate Check)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsProcessing(true);
    
    // Feature 1: Prevent duplicate transaction reference codes
    const isDuplicate = transactions.some(
      t => t.reference_code?.toLowerCase() === formData.reference_code.trim().toLowerCase()
    );

    if (isDuplicate) {
      setFormError(`Transaction code '${formData.reference_code.toUpperCase()}' has already been posted.`);
      setIsProcessing(false);
      return;
    }

    try {
      const activeLenderId = user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e';
      
      await api.post('/transactions/repayment', {
        ...formData,
        reference_code: formData.reference_code.toUpperCase().trim(),
        amount: parseFloat(formData.amount),
        description: `Method: ${formData.method}`,
        lender_id: activeLenderId,
      });
      
      setIsModalOpen(false);
      loadData(); 
      setFormData({ loan_id: '', amount: '', transaction_date: new Date().toISOString().split('T')[0], method: 'M-Pesa', reference_code: '' });
    } catch (error: any) {
      setFormError(error.response?.data?.message || 'Failed to record repayment.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Delete Transaction
  const handleDelete = async () => {
    setIsProcessing(true);
    try {
      await api.delete(`/transactions/${deleteModal.id}`);
      setDeleteModal(null);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete transaction.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter Table
  const filteredTransactions = transactions.filter(t => {
    const searchString = `${t.loan?.borrower?.first_name} ${t.loan?.borrower?.last_name} ${t.reference_code}`.toLowerCase();
    return searchString.includes(searchQuery.toLowerCase());
  });

  // KPIs
  const today = new Date().toISOString().split('T')[0];
  const collectedToday = transactions
    .filter(t => t.transaction_date.startsWith(today))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalTransactions = transactions.length;

  // Feature 3: Daily Collections Chart Data (Last 7 Days)
  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dailyTotal = transactions
        .filter(t => t.transaction_date.startsWith(dateStr))
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
      days.push({
        name: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
        Collections: dailyTotal
      });
    }
    return days;
  }, [transactions]);

  const formatCurrency = (val: number): string => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toString();
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-10">
      
      {/* Print Styles */}
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #printable-receipt, #printable-receipt * { visibility: visible; }
            #printable-receipt { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
            .no-print { display: none !important; }
          }
        `}
      </style>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Repayments</h1>
          <p className="text-slate-500 font-medium mt-1">Track incoming loan payments and history.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative group flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" placeholder="Search reference or name..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => { setFormError(''); setIsModalOpen(true); }}
            className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all outline-none"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Record Payment</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-emerald-500 hover:-translate-y-1 transition-transform">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Collected Today</p>
            <h3 className="text-2xl font-black text-slate-900">KES {collectedToday.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center"><Wallet size={20} /></div>
        </div>
        
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-blue-500 hover:-translate-y-1 transition-transform">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Transactions</p>
            <h3 className="text-2xl font-black text-slate-900">{totalTransactions}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center"><FileText size={20} /></div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-amber-400 hover:-translate-y-1 transition-transform">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Accounts</p>
            <h3 className="text-2xl font-black text-slate-900">{activeLoans.length}</h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center"><Clock size={20} /></div>
        </div>
      </div>

      {/* Feature 3: Daily Collections Chart */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-8 flex flex-col h-[300px]">
        <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Collection Trends</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Live daily payment influx (Last 7 Days)</p>
            </div>
            <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> <span>Collections</span>
            </div>
        </div>
        <div className="flex-1 w-full text-xs">
          {isLoading ? (
             <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-2xl animate-pulse">
                <Loader2 size={24} className="animate-spin text-slate-400" />
             </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} tickFormatter={formatCurrency} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontWeight: 'bold', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: '#0F172A' }}
                  formatter={(value: any) => [`KES ${Number(value).toLocaleString()}`, 'Collections']}
                />
                <Area type="monotone" dataKey="Collections" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" activeDot={{ r: 6, fill: '#10B981', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 animate-pulse">
            <Loader2 size={40} className="animate-spin mb-4 text-slate-300" />
            <p className="font-bold">Fetching transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4"><Search size={28} /></div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No payments found</h3>
            <p className="text-slate-500 font-medium text-sm">Record a payment to see it listed here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-widest font-black">
                  <th className="p-5 pl-6">Trans ID</th>
                  <th className="p-5">Date</th>
                  <th className="p-5">Customer</th>
                  <th className="p-5">Method / Ref</th>
                  <th className="p-5 text-right">Amount (KES)</th>
                  <th className="p-5 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-5 pl-6">
                      <span className="text-slate-500 text-xs font-mono font-bold">
                        #{tx.id.substring(0, 8)}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="font-bold text-slate-700 text-sm">{new Date(tx.transaction_date).toLocaleDateString()}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{new Date(tx.transaction_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs border border-slate-200 shrink-0 uppercase">
                          {tx.loan?.borrower?.first_name?.[0]}{tx.loan?.borrower?.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{tx.loan?.borrower?.first_name} {tx.loan?.borrower?.last_name}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">LN-#{tx.loan_id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{tx.description?.replace('Method: ', '') || 'N/A'}</span>
                      <div className="text-sm font-bold text-slate-700 mt-1 uppercase">{tx.reference_code}</div>
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end space-x-1 text-emerald-600">
                        <ArrowDownLeft size={16} strokeWidth={3} />
                        <span className="font-black text-lg">{Number(tx.amount).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="p-5 text-right pr-6">
                      <div className="flex justify-end space-x-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setViewReceiptModal(tx)}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm outline-none" title="View Receipt"
                        >
                          <Eye size={16} />
                        </button>
                        {isAdmin && (
                          <>
                            <button 
                              onClick={() => setEditModal(tx)}
                              className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-colors shadow-sm outline-none" title="Edit Transaction"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => setDeleteModal(tx)}
                              className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm outline-none" title="Delete Transaction"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* 1. Record Repayment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setIsModalOpen(false)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg relative z-10 overflow-hidden animate-fade-in border border-slate-200">
            
            <div className="bg-[#0B1121] p-6 text-white flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/30">
                  <Banknote size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Receive Payment</h3>
                  <p className="text-emerald-400/80 text-xs font-medium">Record a manual repayment from a client</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8">
              {formError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-bold flex items-center">
                  <AlertTriangle size={18} className="mr-2 shrink-0" /> {formError}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Select Customer / Loan</label>
                  <select 
                    required
                    value={formData.loan_id}
                    onChange={(e) => setFormData({...formData, loan_id: e.target.value})}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-semibold text-slate-700"
                  >
                    <option value="" disabled>-- Search Client --</option>
                    {activeLoans.map(loan => (
                      <option key={loan.id} value={loan.id}>
                        {loan.borrower?.first_name} {loan.borrower?.last_name} (Bal: KES {Number(loan.outstanding_balance).toLocaleString()})
                      </option>
                    ))}
                  </select>
                  
                  {selectedLoan && (
                    <div className="mt-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex justify-between items-center">
                      <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Current Outstanding</span>
                      <span className="font-black text-emerald-700">KES {Number(selectedLoan.outstanding_balance).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-1.5">Amount (KES)</label>
                    <input 
                      type="number" required step="0.01" min="1" max={selectedLoan ? selectedLoan.outstanding_balance : undefined}
                      value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono font-bold text-slate-900"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-1.5">Payment Date</label>
                    <input 
                      type="date" required
                      value={formData.transaction_date} onChange={e => setFormData({...formData, transaction_date: e.target.value})}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-semibold text-slate-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-1.5">Method</label>
                    <select 
                      required
                      value={formData.method} onChange={e => setFormData({...formData, method: e.target.value})}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-semibold text-slate-700"
                    >
                      <option value="M-Pesa">M-Pesa</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-1.5">Reference No.</label>
                    <input 
                      type="text" required
                      value={formData.reference_code} onChange={e => setFormData({...formData, reference_code: e.target.value})}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-semibold text-slate-900 uppercase"
                      placeholder="e.g. QFH38291"
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={isProcessing} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors disabled:opacity-50 outline-none">Cancel</button>
                <button type="submit" disabled={isProcessing || !formData.loan_id} className="flex-[2] flex items-center justify-center space-x-2 bg-emerald-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-80 outline-none">
                  {isProcessing ? <><Loader2 size={18} className="animate-spin" /> <span>Recording...</span></> : <><CheckCircle2 size={18} /><span>Confirm Payment</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. View Receipt Modal */}
      {viewReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm no-print" onClick={() => setViewReceiptModal(null)}></div>
          
          <div id="printable-receipt" className="bg-white rounded-[2rem] shadow-xl w-full max-w-sm relative z-10 overflow-hidden animate-fade-in">
            <div className="p-8 text-center border-b border-dashed border-slate-200">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32} /></div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Payment Receipt</h3>
              <p className="text-slate-500 text-sm">{new Date(viewReceiptModal.transaction_date).toLocaleString()}</p>
            </div>
            
            <div className="p-6 bg-slate-50 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500">Receipt No.</span>
                <span className="font-mono font-bold uppercase">{viewReceiptModal.reference_code}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500">Customer</span>
                <span className="font-bold">{viewReceiptModal.loan?.borrower?.first_name} {viewReceiptModal.loan?.borrower?.last_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500">Method</span>
                <span className="font-bold">{viewReceiptModal.description?.replace('Method: ', '') || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-sm font-bold text-slate-700">Amount Paid</span>
                <span className="text-xl font-black text-emerald-600">KES {Number(viewReceiptModal.amount).toLocaleString()}</span>
              </div>
            </div>
            
            {/* Modal Actions (Hidden during print) */}
            <div className="p-4 bg-white flex space-x-2 no-print">
              <button 
                onClick={() => setViewReceiptModal(null)} 
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => window.print()} 
                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <Printer size={16} className="mr-2"/> Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Delete Confirmation Modal (Admin Only) */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setDeleteModal(null)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm relative z-10 overflow-hidden animate-fade-in p-8 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={28} /></div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Delete Transaction?</h3>
            <p className="text-slate-500 text-sm mb-6">Are you sure you want to permanently delete receipt <strong>{deleteModal.reference_code}</strong>? This will reverse the loan balance by KES {Number(deleteModal.amount).toLocaleString()}.</p>
            <div className="flex space-x-3">
              <button onClick={() => setDeleteModal(null)} disabled={isProcessing} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50 outline-none">Cancel</button>
              <button onClick={handleDelete} disabled={isProcessing} className="flex-1 flex justify-center items-center py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 outline-none">
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : 'Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Edit Transaction Placeholder (Admin Only) */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditModal(null)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-fade-in p-8 text-center">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4"><Edit size={28} /></div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Edit Transaction</h3>
            <p className="text-slate-500 text-sm mb-6">To maintain accounting integrity, modifying a finalized ledger entry requires overriding the transaction log via the API. This feature must be explicitly enabled by your database administrator.</p>
            <button onClick={() => setEditModal(null)} className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors outline-none">Understood</button>
          </div>
        </div>
      )}

    </div>
  );
};