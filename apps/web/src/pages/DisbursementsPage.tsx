import React, { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import { api } from '../lib/api';
import { 
  Search, Plus, Check, X, Eye, 
  CheckCircle2, XCircle, Clock, Send, Loader2, AlertCircle,
  User, CreditCard, Banknote, TrendingUp, AlertTriangle, CalendarDays, Receipt
} from 'lucide-react';

export const DisbursementsPage = ({ onNavigate }: { onNavigate?: (path: string) => void }) => {
  const user = useAuthStore((state: any) => state.user);
  
  const [loans, setLoans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'DISBURSED' | 'REJECTED' | 'DEFAULTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [viewModal, setViewModal] = useState<any | null>(null);
  const [detailsTab, setDetailsTab] = useState<'overview' | 'schedule' | 'transactions'>('overview'); 
  
  const [disburseModal, setDisburseModal] = useState<any | null>(null);
  const [rejectModal, setRejectModal] = useState<any | null>(null);
  const [receivePaymentModal, setReceivePaymentModal] = useState<any | null>(null); 
  
  const [isProcessing, setIsProcessing] = useState(false);

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    method: 'M-Pesa',
    reference_code: ''
  });

  const loadLoans = async () => {
    setIsLoading(true);
    try {
      const lenderId = user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e';
      const response = await api.get(`/loans?lender_id=${lenderId}`);
      setLoans(response.data);
    } catch (error) {
      console.error('Failed to fetch loans:', error);
      alert('Failed to load the disbursement queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadLoans();
  }, [user]);

  const filteredLoans = loans.filter(loan => {
    const matchesTab = activeFilter === 'ALL' || loan.status === activeFilter;
    const searchString = `${loan.borrower?.first_name} ${loan.borrower?.last_name} ${loan.id} ${loan.borrower?.national_id}`.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // KPIs
  const pendingCount = loans.filter(l => l.status === 'PENDING').length;
  const disbursedTotal = loans.filter(l => ['DISBURSED', 'COMPLETED', 'DEFAULTED'].includes(l.status)).reduce((sum, l) => sum + Number(l.principal_amount), 0);
  
  // PAR Calculation: (Defaulted Balance / Total Outstanding Balance) * 100
  const totalOutstanding = loans.filter(l => ['DISBURSED', 'DEFAULTED'].includes(l.status)).reduce((sum, l) => sum + Number(l.outstanding_balance), 0);
  const defaultedBalance = loans.filter(l => l.status === 'DEFAULTED').reduce((sum, l) => sum + Number(l.outstanding_balance), 0);
  const parPercentage = totalOutstanding > 0 ? ((defaultedBalance / totalOutstanding) * 100).toFixed(1) : '0.0';

  const handleDisburse = async () => {
    setIsProcessing(true);
    try {
      await api.patch(`/loans/${disburseModal.id}/disburse`);
      setDisburseModal(null);
      loadLoans(); 
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to disburse loan.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await api.patch(`/loans/${rejectModal.id}/reject`);
      setRejectModal(null);
      loadLoans(); 
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to reject loan.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const activeLenderId = user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e';
      
      await api.post('/transactions/repayment', {
        ...paymentForm,
        loan_id: receivePaymentModal.id,
        amount: parseFloat(paymentForm.amount),
        description: `Method: ${paymentForm.method}`,
        lender_id: activeLenderId,
      });
      
      setReceivePaymentModal(null);
      setPaymentForm({ amount: '', transaction_date: new Date().toISOString().split('T')[0], method: 'M-Pesa', reference_code: '' });
      loadLoans(); 
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to record repayment.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openViewModal = (loan: any) => {
    setDetailsTab('overview');
    setViewModal(loan);
  };

  // --- UPDATED: Pass target context through local storage before redirecting ---
  const openReceivePayment = (loan: any) => {
    setViewModal(null); 
    if (onNavigate) {
       localStorage.setItem('autoOpenRepayment', loan.id);
       onNavigate('repayments');
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
      DISBURSED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      REJECTED: 'bg-slate-100 text-slate-500 border-slate-200',
      COMPLETED: 'bg-blue-50 text-blue-700 border-blue-200',
      DEFAULTED: 'bg-red-50 text-red-700 border-red-200',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status] || 'bg-slate-100'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Loan Registry</h1>
          <p className="text-slate-500 font-medium mt-1">Manage applications, approvals, and portfolio health.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative group flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" placeholder="Search loans or ID..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => onNavigate && onNavigate('loan-application')}
            className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all outline-none"
          >
            <Plus size={18} /> <span className="hidden sm:inline">New Application</span>
          </button>
        </div>
      </div>

      {/* Advanced KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-amber-400 hover:-translate-y-1 transition-transform">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending Approvals</p>
            <h3 className="text-2xl font-black text-slate-900">{pendingCount}</h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center"><Clock size={20} /></div>
        </div>
        
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-blue-500 hover:-translate-y-1 transition-transform">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Disbursed</p>
            <h3 className="text-2xl font-black text-slate-900">KES {(disbursedTotal / 1000).toLocaleString()}k</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center"><TrendingUp size={20} /></div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-emerald-500 hover:-translate-y-1 transition-transform">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Outstanding</p>
            <h3 className="text-2xl font-black text-slate-900">KES {(totalOutstanding / 1000).toLocaleString()}k</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center"><Banknote size={20} /></div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-red-500 hover:-translate-y-1 transition-transform">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Portfolio At Risk</p>
            <h3 className="text-2xl font-black text-red-600">{parPercentage}%</h3>
          </div>
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center"><AlertTriangle size={20} /></div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">
        {['ALL', 'PENDING', 'DISBURSED', 'DEFAULTED', 'REJECTED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab as any)}
            className={`px-5 py-2 rounded-xl text-sm font-bold capitalize transition-all outline-none whitespace-nowrap ${
              activeFilter === tab 
                ? 'bg-slate-800 text-white shadow-md' 
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.toLowerCase()} {tab !== 'ALL' && `(${loans.filter(l => l.status === tab).length})`}
          </button>
        ))}
      </div>

      {/* Registry Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 animate-pulse">
            <Loader2 size={40} className="animate-spin mb-4 text-slate-300" />
            <p className="font-bold">Fetching live registry...</p>
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4"><Search size={28} /></div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No records found</h3>
            <p className="text-slate-500 font-medium text-sm">No loans match the current status or search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-widest font-black">
                  <th className="p-5 pl-6">Loan ID</th>
                  <th className="p-5">Customer</th>
                  <th className="p-5 text-right">Amount (KES)</th>
                  <th className="p-5 text-right">Balance</th>
                  <th className="p-5">Applied Date</th>
                  <th className="p-5 text-center">Status</th>
                  <th className="p-5 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-5 pl-6">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border border-slate-200">
                        #{loan.id.substring(0, 8)}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm border border-slate-200 shrink-0 uppercase">
                          {loan.borrower?.first_name?.[0]}{loan.borrower?.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{loan.borrower?.first_name} {loan.borrower?.last_name}</p>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">ID: {loan.borrower?.national_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-right">
                      <div className="font-black text-slate-900 text-base">{Number(loan.principal_amount).toLocaleString()}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 truncate max-w-[120px] inline-block">{loan.loan_product?.name}</div>
                    </td>
                    <td className="p-5 text-right">
                      <div className={`font-bold text-base ${loan.outstanding_balance > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {Number(loan.outstanding_balance).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="text-sm font-semibold text-slate-700">{new Date(loan.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </td>
                    <td className="p-5 text-center">
                      <StatusBadge status={loan.status} />
                    </td>
                    <td className="p-5 text-right pr-6">
                      <div className="flex justify-end space-x-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openViewModal(loan)}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm outline-none" title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        
                        {loan.status === 'PENDING' && (
                          <>
                            <button 
                              onClick={() => setDisburseModal(loan)}
                              className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors shadow-sm outline-none" title="Approve & Disburse"
                            >
                              <Check size={16} strokeWidth={3} />
                            </button>
                            <button 
                              onClick={() => setRejectModal(loan)}
                              className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm outline-none" title="Reject Application"
                            >
                              <X size={16} strokeWidth={3} />
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

      {/* --- ACTION VIEW MODAL --- */}
      {viewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewModal(null)}></div>
          
          <div className="bg-slate-50 rounded-[2rem] shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            
            {/* Dark Financial Hero */}
            <div className="bg-[#0B1121] px-8 pt-8 pb-4 text-white relative shrink-0">
              <button onClick={() => setViewModal(null)} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full outline-none">
                <X size={20} />
              </button>
              
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-2xl border border-blue-500/30 uppercase">
                   {viewModal.borrower?.first_name?.[0]}{viewModal.borrower?.last_name?.[0]}
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight">{viewModal.borrower?.first_name} {viewModal.borrower?.last_name}</h2>
                  <div className="flex items-center space-x-3 mt-1.5">
                    <span className="font-mono text-sm bg-white/10 px-2.5 py-1 rounded-lg">LN-#{viewModal.id.substring(0, 8)}</span>
                    <StatusBadge status={viewModal.status} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Principal</p>
                  <p className="text-xl font-black">KES {Number(viewModal.principal_amount).toLocaleString()}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Payable</p>
                  <p className="text-xl font-black">KES {Number(viewModal.total_owed).toLocaleString()}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Paid So Far</p>
                  <p className="text-xl font-black text-emerald-400">KES {Number(viewModal.total_owed - viewModal.outstanding_balance).toLocaleString()}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Outstanding</p>
                  <p className="text-xl font-black text-amber-400">KES {Number(viewModal.outstanding_balance).toLocaleString()}</p>
                </div>
              </div>

              <div className="mt-6 mb-2">
                <div className="flex justify-between text-xs font-bold mb-2 text-slate-300">
                  <span>Repayment Progress</span>
                  <span>{(((viewModal.total_owed - viewModal.outstanding_balance) / viewModal.total_owed) * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                    style={{ width: `${((viewModal.total_owed - viewModal.outstanding_balance) / viewModal.total_owed) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* In-Modal Navigation Tabs */}
            <div className="flex px-8 bg-white border-b border-slate-200 shrink-0">
              <button 
                onClick={() => setDetailsTab('overview')}
                className={`py-4 px-2 mr-6 border-b-2 font-bold text-sm transition-colors outline-none ${detailsTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Overview
              </button>
              
              {['PENDING', 'DISBURSED', 'DEFAULTED', 'COMPLETED'].includes(viewModal.status) && (
                <button 
                  onClick={() => setDetailsTab('schedule')}
                  className={`py-4 px-2 mr-6 border-b-2 font-bold text-sm transition-colors outline-none ${detailsTab === 'schedule' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  Amortization Schedule
                </button>
              )}

              {['DISBURSED', 'DEFAULTED', 'COMPLETED'].includes(viewModal.status) && (
                <button 
                  onClick={() => setDetailsTab('transactions')}
                  className={`py-4 px-2 border-b-2 font-bold text-sm transition-colors outline-none ${detailsTab === 'transactions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  Transaction History
                </button>
              )}
            </div>

            {/* Modal Body: Content Panel */}
            <div className="p-6 md:p-8 overflow-y-auto bg-slate-50">
              
              {/* TAB 1: OVERVIEW */}
              {detailsTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center space-x-2 mb-6 text-slate-800">
                      <CreditCard size={20} className="text-blue-500" />
                      <h3 className="font-black text-lg">Loan Configuration</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <span className="text-slate-500 text-sm font-medium">Product Type</span>
                        <span className="text-slate-900 font-bold">{viewModal.loan_product?.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <span className="text-slate-500 text-sm font-medium">Interest Rate</span>
                        <span className="text-slate-900 font-bold">{viewModal.interest_rate}%</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <span className="text-slate-500 text-sm font-medium">Repayment Cycle</span>
                        <span className="text-slate-900 font-bold">{viewModal.loan_product?.repayment_cycle || 'Monthly'}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <span className="text-slate-500 text-sm font-medium">Application Date</span>
                        <span className="text-slate-900 font-bold">{new Date(viewModal.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center pb-1">
                        <span className="text-slate-500 text-sm font-medium">Disbursed Date</span>
                        <span className="text-slate-900 font-bold">{viewModal.disbursed_at ? new Date(viewModal.disbursed_at).toLocaleDateString() : 'Awaiting Funding'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center space-x-2 mb-6 text-slate-800">
                      <User size={20} className="text-blue-500" />
                      <h3 className="font-black text-lg">Borrower Details</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <span className="text-slate-500 text-sm font-medium">Full Name</span>
                        <span className="text-slate-900 font-bold">{viewModal.borrower?.first_name} {viewModal.borrower?.last_name}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <span className="text-slate-500 text-sm font-medium">National ID</span>
                        <span className="text-slate-900 font-bold font-mono">{viewModal.borrower?.national_id}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <span className="text-slate-500 text-sm font-medium">Phone Number</span>
                        <span className="text-slate-900 font-bold">{viewModal.borrower?.phone_number}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <span className="text-slate-500 text-sm font-medium">KYC Status</span>
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold text-xs">{viewModal.borrower?.kyc_status || 'VERIFIED'}</span>
                      </div>
                      <div className="flex justify-between items-center pb-1">
                        <span className="text-slate-500 text-sm font-medium">Risk Score</span>
                        <span className="text-slate-900 font-bold">{viewModal.borrower?.risk_score || '0.0'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: AMORTIZATION SCHEDULE - CORRECTED TERM PARSING */}
              {detailsTab === 'schedule' && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                   <table className="w-full text-left border-collapse">
                     <thead>
                       <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-widest font-black">
                         <th className="p-4 pl-6">Installment</th>
                         <th className="p-4">Due Date</th>
                         <th className="p-4 text-right pr-6">Expected Amount</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {Array.from({ length: viewModal.term || viewModal.loan_product?.default_term || 1 }).map((_, i) => {
                         // Use the specific loan's actual term applied for, fallback to product default
                         const term = viewModal.term || viewModal.loan_product?.default_term || 1;
                         const installmentPay = viewModal.total_owed / term;
                         
                         const cycle = viewModal.loan_product?.repayment_cycle || 'Monthly';
                         const dueDate = new Date(viewModal.disbursed_at || viewModal.created_at);
                         let periodLabel = 'Monthly';
                         
                         switch (cycle) {
                           case 'Daily':
                             dueDate.setDate(dueDate.getDate() + (i + 1));
                             periodLabel = 'Daily';
                             break;
                           case 'Weekly':
                             dueDate.setDate(dueDate.getDate() + (i + 1) * 7);
                             periodLabel = 'Weekly';
                             break;
                           case 'Quarterly':
                             dueDate.setMonth(dueDate.getMonth() + (i + 1) * 3);
                             periodLabel = 'Quarterly';
                             break;
                           case 'Semi-Annually':
                             dueDate.setMonth(dueDate.getMonth() + (i + 1) * 6);
                             periodLabel = 'Semi-Annual';
                             break;
                           case 'Annually':
                             dueDate.setFullYear(dueDate.getFullYear() + (i + 1));
                             periodLabel = 'Annual';
                             break;
                           case 'None':
                             dueDate.setMonth(dueDate.getMonth() + (i + 1));
                             periodLabel = 'Term';
                             break;
                           case 'Monthly':
                           default:
                             dueDate.setMonth(dueDate.getMonth() + (i + 1));
                             periodLabel = 'Monthly';
                             break;
                         }

                         return (
                           <tr key={i} className="hover:bg-slate-50 transition-colors">
                             <td className="p-4 pl-6 text-sm font-bold text-slate-700">{periodLabel} {i + 1}</td>
                             <td className="p-4 text-sm font-semibold text-slate-600 flex items-center">
                                <CalendarDays size={14} className="mr-2 text-slate-400" />
                                {dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                             </td>
                             <td className="p-4 pr-6 text-sm font-black text-slate-900 text-right">
                               KES {installmentPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                             </td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                </div>
              )}

              {/* TAB 3: TRANSACTION HISTORY */}
              {detailsTab === 'transactions' && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                     <thead>
                       <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-widest font-black">
                         <th className="p-4 pl-6">Date</th>
                         <th className="p-4">Reference No.</th>
                         <th className="p-4">Method / Type</th>
                         <th className="p-4 text-right pr-6">Amount (KES)</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {viewModal.transactions?.length > 0 ? viewModal.transactions.map((tx: any) => (
                         <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                           <td className="p-4 pl-6">
                             <div className="text-sm font-bold text-slate-700">{new Date(tx.transaction_date).toLocaleDateString()}</div>
                             <div className="text-xs text-slate-400 font-medium">{new Date(tx.transaction_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                           </td>
                           <td className="p-4 text-sm font-mono font-bold text-slate-700">{tx.reference_code || '-'}</td>
                           <td className="p-4">
                             <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                               {tx.description?.replace('Method: ', '') || tx.type}
                             </span>
                           </td>
                           <td className="p-4 pr-6 text-sm font-black text-emerald-600 text-right flex items-center justify-end">
                             <TrendingUp size={14} className="mr-1.5" /> {Number(tx.amount).toLocaleString()}
                           </td>
                         </tr>
                       )) : (
                         <tr>
                           <td colSpan={4} className="p-8 text-center text-slate-500">
                             <Receipt size={32} className="mx-auto text-slate-300 mb-3" />
                             <span className="font-semibold block text-slate-600">No transactions recorded.</span>
                             <span className="text-sm text-slate-400 mt-1">Payments made to this loan will appear here.</span>
                           </td>
                         </tr>
                       )}
                     </tbody>
                  </table>
                </div>
              )}

            </div>

            {/* Integrated Action Footer */}
            <div className="bg-white p-6 border-t border-slate-200 shrink-0 flex flex-wrap gap-3 justify-end items-center">
              
              <button 
                onClick={() => setViewModal(null)} 
                className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors outline-none"
              >
                Close
              </button>

              {/* --- UPDATED: Pass target context through local storage before redirecting --- */}
              <button 
                onClick={() => { 
                  setViewModal(null); 
                  localStorage.setItem('autoOpenBorrower', viewModal.borrower_id);
                  if(onNavigate) onNavigate('borrowers'); 
                }}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center outline-none shadow-sm"
              >
                <User size={18} className="mr-2 text-blue-500" /> View Profile
              </button>
              
              {viewModal.status === 'PENDING' && (
                <>
                  <button 
                    onClick={() => { setViewModal(null); setRejectModal(viewModal); }}
                    className="px-5 py-2.5 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors flex items-center outline-none"
                  >
                    <X size={18} className="mr-2" /> Reject
                  </button>
                  <button 
                    onClick={() => { setViewModal(null); setDisburseModal(viewModal); }}
                    className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center outline-none"
                  >
                    <Check size={18} className="mr-2" /> Approve & Disburse
                  </button>
                </>
              )}

              {['DISBURSED', 'DEFAULTED'].includes(viewModal.status) && (
                <>
                  <button 
                    onClick={() => openReceivePayment(viewModal)}
                    className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center outline-none"
                  >
                    <Banknote size={18} className="mr-2" /> Receive Payment
                  </button>
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* --- APPROVE & DISBURSE MODAL --- */}
      {disburseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setDisburseModal(null)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-fade-in border border-slate-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Send size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Approve & Disburse</h3>
              <p className="text-slate-500 font-medium text-sm mb-6">
                Are you sure you want to approve this loan for <strong className="text-slate-800">{disburseModal.borrower?.first_name} {disburseModal.borrower?.last_name}</strong>?
              </p>
              
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6 text-left">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amount to Fund</span>
                  <span className="text-xl font-black text-emerald-600">KES {Number(disburseModal.principal_amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Destination</span>
                  <span className="text-sm font-bold text-slate-700">Client Default Account</span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button onClick={() => setDisburseModal(null)} disabled={isProcessing} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors disabled:opacity-50 outline-none">
                  Cancel
                </button>
                <button onClick={handleDisburse} disabled={isProcessing} className="flex-[2] flex items-center justify-center space-x-2 bg-emerald-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-80 outline-none">
                  {isProcessing ? <><Loader2 size={18} className="animate-spin" /> <span>Processing...</span></> : <span>Confirm Disbursement</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- REJECT MODAL --- */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setRejectModal(null)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm relative z-10 overflow-hidden animate-fade-in border border-slate-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <XCircle size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Reject Application</h3>
              <p className="text-slate-500 font-medium text-sm mb-6">
                Are you sure you want to reject the application for <strong className="text-slate-800">{rejectModal.borrower?.first_name} {rejectModal.borrower?.last_name}</strong>? This action cannot be undone.
              </p>

              <div className="flex space-x-3">
                <button onClick={() => setRejectModal(null)} disabled={isProcessing} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors disabled:opacity-50 outline-none">
                  Cancel
                </button>
                <button onClick={handleReject} disabled={isProcessing} className="flex-1 flex items-center justify-center space-x-2 bg-red-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-red-500/30 hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-80 outline-none">
                  {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <span>Reject Loan</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};