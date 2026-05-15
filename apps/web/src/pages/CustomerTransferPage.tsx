import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import { 
  ArrowRightLeft, Search, MapPin, User, ShieldAlert, 
  Loader2, CheckCircle2, Briefcase, Building2, Users
} from 'lucide-react';

export const CustomerTransferPage = () => {
  const user = useAuthStore((state: any) => state.user);
  
  const [borrowers, setBorrowers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Transfer Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBorrower, setSelectedBorrower] = useState<any>(null);
  const [targetBranchId, setTargetBranchId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const activeLenderId = user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e'; // Super Admin fallback
      
      const [borrowersRes, branchesRes] = await Promise.all([
        api.get('/borrowers/transfer-list'),
        api.get(`/branches?lender_id=${activeLenderId}`)
      ]);
      
      setBorrowers(borrowersRes.data);
      setBranches(branchesRes.data);
    } catch (error) {
      console.error('Failed to load transfer data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const openTransferModal = (borrower: any) => {
    setSelectedBorrower(borrower);
    setTargetBranchId('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBranchId) {
      setErrorMsg('Please select a destination branch.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    try {
      await api.patch(`/borrowers/${selectedBorrower.id}/transfer`, {
        target_branch_id: targetBranchId
      });
      setIsModalOpen(false);
      loadData(); // Refresh the grid to show new branch assignments
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Failed to transfer customer.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredBorrowers = borrowers.filter(b => 
    `${b.first_name} ${b.last_name} ${b.national_id}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inter-Branch Transfers</h1>
          <p className="text-slate-500 font-medium mt-1">Reassign customer profiles and loan histories to different physical branches.</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <div className="relative group w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search customers by name or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
          </div>
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-600 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <Users size={16} className="text-blue-500" /> <span>{borrowers.length} Customers Available</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Loader2 size={40} className="animate-spin mb-4 text-slate-300" />
            <p className="font-bold">Loading customer directory...</p>
          </div>
        ) : filteredBorrowers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <User size={32} className="text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-slate-900">No customers found</h3>
            <p className="text-slate-500 text-sm mt-1">Adjust your search to find a specific borrower.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                  <th className="p-5 pl-6">Customer Profile</th>
                  <th className="p-5">Contact Details</th>
                  <th className="p-5">Current Branch Assignment</th>
                  <th className="p-5 text-center">KYC Status</th>
                  <th className="p-5 text-right pr-6">Administrative Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBorrowers.map((borrower) => (
                  <tr key={borrower.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5 pl-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-black text-sm uppercase border border-slate-200 shrink-0">
                          {borrower.first_name[0]}{borrower.last_name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{borrower.first_name} {borrower.last_name}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {borrower.national_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <p className="text-sm font-bold text-slate-700">{borrower.phone_number}</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">{borrower.email || 'No email registered'}</p>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center space-x-2">
                        <Building2 size={16} className="text-indigo-400" />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{borrower.branch?.name || 'Unassigned'}</p>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5"><MapPin size={10} className="inline mr-0.5"/> {borrower.branch?.location || '--'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        borrower.kyc_status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        borrower.kyc_status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {borrower.kyc_status}
                      </span>
                    </td>
                    <td className="p-5 text-right pr-6">
                      <button onClick={() => openTransferModal(borrower)} className="px-4 py-2 bg-white text-slate-700 border border-slate-300 text-xs font-bold rounded-lg hover:bg-slate-50 hover:text-blue-600 hover:border-blue-300 transition-colors shadow-sm outline-none inline-flex items-center">
                        <ArrowRightLeft size={14} className="mr-1.5" /> Transfer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- TRANSFER MODAL --- */}
      {isModalOpen && selectedBorrower && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setIsModalOpen(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-fade-in border border-slate-200">
            <div className="bg-[#0B1121] p-6 text-white shrink-0 flex items-center space-x-3">
              <ArrowRightLeft className="text-blue-400" size={20} />
              <h3 className="font-black text-xl tracking-tight">Transfer Customer</h3>
            </div>
            
            <div className="p-6 bg-slate-50/50 border-b border-slate-200 space-y-4">
               <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer Profile</p>
                 <div className="flex items-center space-x-3">
                    <User size={16} className="text-slate-500" />
                    <span className="text-sm font-bold text-slate-900">{selectedBorrower.first_name} {selectedBorrower.last_name} ({selectedBorrower.national_id})</span>
                 </div>
               </div>
               <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Branch</p>
                 <div className="flex items-center space-x-3">
                    <MapPin size={16} className="text-slate-500" />
                    <span className="text-sm font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200">{selectedBorrower.branch?.name || 'Unassigned'}</span>
                 </div>
               </div>
            </div>

            <form onSubmit={handleTransfer} className="p-8 space-y-6">
              {errorMsg && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center"><ShieldAlert size={18} className="mr-2 shrink-0" /> {errorMsg}</div>}
              
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Destination Branch *</label>
                <div className="relative">
                  <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select 
                    required 
                    value={targetBranchId} 
                    onChange={e => setTargetBranchId(e.target.value)} 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-700 appearance-none"
                  >
                    <option value="" disabled>Select a target branch...</option>
                    {branches
                      .filter(b => b.id !== selectedBorrower.branch_id) // Hide their current branch from the list
                      .map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.location})</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={isProcessing} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors">Cancel</button>
                <button type="submit" disabled={isProcessing || !targetBranchId} className="flex-[2] flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50">
                  {isProcessing ? <><Loader2 size={18} className="animate-spin" /> <span>Executing...</span></> : <><CheckCircle2 size={18} /><span>Confirm Transfer</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};