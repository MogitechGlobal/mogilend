import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  FileEdit, CheckCircle2, AlertCircle, Search, FileText, 
  User, CreditCard, Loader2, X, RotateCcw, ShieldAlert
} from 'lucide-react';

export const PendingAmendmentsPage = () => {
  const [amendments, setAmendments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal State
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [newPrincipal, setNewPrincipal] = useState<number | string>('');

  const loadAmendments = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/loans/amendments');
      setAmendments(response.data);
    } catch (error) {
      console.error('Failed to load amendments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAmendments();
  }, []);

  const openAmendmentModal = (loan: any) => {
    setSelectedLoan(loan);
    setNewPrincipal(loan.principal_amount);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMsg('');

    try {
      await api.patch(`/loans/${selectedLoan.id}/amend`, {
        principal_amount: Number(newPrincipal)
      });
      setIsModalOpen(false);
      loadAmendments();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Failed to submit amendment.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredLoans = amendments.filter(loan => 
    `${loan.borrower?.first_name} ${loan.borrower?.last_name} ${loan.borrower?.national_id}`
      .toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-10">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pending Amendments</h1>
          <p className="text-slate-500 font-medium mt-1">Review and update loan facilities returned by the credit committee.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <div className="relative group w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search by borrower name or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
          </div>
          <div className="flex items-center space-x-2 text-sm font-bold text-amber-600 bg-amber-50 px-4 py-2 rounded-xl border border-amber-200">
            <FileEdit size={16} /> <span>{amendments.length} Action Required</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Loader2 size={40} className="animate-spin mb-4 text-slate-300" />
            <p className="font-bold">Loading amendment queue...</p>
          </div>
        ) : filteredLoans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <CheckCircle2 size={32} className="text-emerald-400 mb-3" />
            <h3 className="text-lg font-bold text-slate-900">All caught up!</h3>
            <p className="text-slate-500 text-sm mt-1">There are no loan applications requiring amendments.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                  <th className="p-5 pl-6">Borrower</th>
                  <th className="p-5">Facility Details</th>
                  <th className="p-5 text-right">Originally Requested</th>
                  <th className="p-5 text-center">Status</th>
                  <th className="p-5 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5 pl-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-black text-sm uppercase border border-slate-200 shrink-0">
                          {loan.borrower.first_name[0]}{loan.borrower.last_name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{loan.borrower.first_name} {loan.borrower.last_name}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {loan.borrower.national_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <p className="text-sm font-bold text-slate-700">{loan.loan_product.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5 uppercase tracking-wide">
                        Limits: KES {loan.loan_product.min_amount} - {loan.loan_product.max_amount}
                      </p>
                    </td>
                    <td className="p-5 text-right">
                      <p className="text-sm font-black text-red-600 line-through">KES {loan.principal_amount.toLocaleString()}</p>
                    </td>
                    <td className="p-5 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-200">
                        <AlertCircle size={12} className="mr-1" /> Edits Needed
                      </span>
                    </td>
                    <td className="p-5 text-right pr-6">
                      <button onClick={() => openAmendmentModal(loan)} className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold rounded-lg hover:bg-blue-600 hover:text-white transition-colors shadow-sm outline-none">
                        Revise Application
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- AMENDMENT MODAL --- */}
      {isModalOpen && selectedLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setIsModalOpen(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-fade-in border border-slate-200">
            <div className="bg-[#0B1121] p-6 text-white shrink-0 flex items-center space-x-3">
              <FileEdit className="text-blue-400" size={20} />
              <h3 className="font-black text-xl tracking-tight">Revise Facility Request</h3>
            </div>
            
            <div className="p-6 bg-slate-50/50 border-b border-slate-200">
               <div className="flex items-center space-x-3 mb-4">
                  <User size={16} className="text-slate-400" />
                  <span className="text-sm font-bold text-slate-900">{selectedLoan.borrower.first_name} {selectedLoan.borrower.last_name}</span>
               </div>
               <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                  <p className="text-xs font-bold text-amber-800">Manager Instruction</p>
                  <p className="text-xs text-amber-700 mt-1">Please reduce the requested principal amount to match the borrower's affordability ratio limits.</p>
               </div>
            </div>

            <form onSubmit={handleResubmit} className="p-8 space-y-6">
              {errorMsg && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center"><ShieldAlert size={18} className="mr-2" /> {errorMsg}</div>}
              
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex justify-between">
                  <span>Revised Principal Amount (KES) *</span>
                  <span className="text-slate-400 font-medium tracking-wide">Limits: {selectedLoan.loan_product.min_amount} - {selectedLoan.loan_product.max_amount}</span>
                </label>
                <div className="relative">
                  <CreditCard size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="number" required min={selectedLoan.loan_product.min_amount} max={selectedLoan.loan_product.max_amount} value={newPrincipal} onChange={e => setNewPrincipal(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-black text-slate-900 text-lg" />
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={isProcessing} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors">Cancel</button>
                <button type="submit" disabled={isProcessing} className="flex-[2] flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30">
                  {isProcessing ? <><Loader2 size={18} className="animate-spin" /> <span>Recalculating...</span></> : <><RotateCcw size={18} /><span>Resubmit to Queue</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};