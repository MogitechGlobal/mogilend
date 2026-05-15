import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import { 
  UserCog, Search, MapPin, User, ShieldAlert, 
  Loader2, CheckCircle2, Phone, Mail, FileText,
  ShieldCheck, X, Save
} from 'lucide-react';

export const CustomerEditsPage = () => {
  const user = useAuthStore((state: any) => state.user);
  
  const [borrowers, setBorrowers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedBorrower, setSelectedBorrower] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', national_id: '', phone_number: '',
    email: '', address: '', gender: '', kyc_status: '', branch_id: ''
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const activeLenderId = user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e'; 
      
      const [borrowersRes, branchesRes] = await Promise.all([
        api.get(`/borrowers?lender_id=${activeLenderId}`),
        api.get(`/branches?lender_id=${activeLenderId}`)
      ]);
      
      setBorrowers(borrowersRes.data);
      setBranches(branchesRes.data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const openEditDrawer = (borrower: any) => {
    setSelectedBorrower(borrower);
    setFormData({
      first_name: borrower.first_name || '',
      last_name: borrower.last_name || '',
      national_id: borrower.national_id || '',
      phone_number: borrower.phone_number || '',
      email: borrower.email || '',
      address: borrower.address || '',
      gender: borrower.gender || 'MALE',
      kyc_status: borrower.kyc_status || 'PENDING',
      branch_id: borrower.branch_id || ''
    });
    setErrorMsg('');
    setIsDrawerOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMsg('');

    try {
      await api.patch(`/borrowers/${selectedBorrower.id}`, formData);
      setIsDrawerOpen(false);
      loadData(); // Refresh grid with updated data
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Failed to update customer profile.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredBorrowers = borrowers.filter(b => 
    `${b.first_name} ${b.last_name} ${b.national_id} ${b.phone_number}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Profile Directory</h1>
          <p className="text-slate-500 font-medium mt-1">Audit and update core customer information and compliance statuses.</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <div className="relative group w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search by name, ID, or phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
          </div>
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-600 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <UserCog size={16} className="text-blue-500" /> <span>{borrowers.length} Profiles Available</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Loader2 size={40} className="animate-spin mb-4 text-slate-300" />
            <p className="font-bold">Loading directory...</p>
          </div>
        ) : filteredBorrowers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <User size={32} className="text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-slate-900">No customers found</h3>
            <p className="text-slate-500 text-sm mt-1">Adjust your search parameters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                  <th className="p-5 pl-6">Customer Name</th>
                  <th className="p-5">National ID</th>
                  <th className="p-5">Contact Details</th>
                  <th className="p-5 text-center">KYC Compliance</th>
                  <th className="p-5 text-right">Last Updated</th>
                  <th className="p-5 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBorrowers.map((borrower) => (
                  <tr key={borrower.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-5 pl-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-black text-sm uppercase border border-slate-200 shrink-0">
                          {borrower.first_name[0]}{borrower.last_name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{borrower.first_name} {borrower.last_name}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{borrower.gender}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <span className="font-mono text-sm font-bold text-slate-700">{borrower.national_id}</span>
                    </td>
                    <td className="p-5">
                      <p className="text-sm font-bold text-slate-700">{borrower.phone_number}</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate max-w-[150px]">{borrower.email || 'No email'}</p>
                    </td>
                    <td className="p-5 text-center">
                      <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        borrower.kyc_status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        borrower.kyc_status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {borrower.kyc_status}
                      </span>
                    </td>
                    <td className="p-5 text-right text-xs font-medium text-slate-500">
                       {new Date(borrower.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric'})}
                    </td>
                    <td className="p-5 text-right pr-6">
                      <button onClick={() => openEditDrawer(borrower)} className="p-2 text-blue-600 bg-blue-50 border border-blue-200 text-xs font-bold rounded-lg hover:bg-blue-600 hover:text-white transition-colors shadow-sm outline-none inline-flex items-center md:opacity-0 md:group-hover:opacity-100 focus:opacity-100">
                        <UserCog size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- EDIT SLIDE-OUT DRAWER --- */}
      {isDrawerOpen && selectedBorrower && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setIsDrawerOpen(false)}></div>
          <div className="bg-white w-full max-w-lg h-full relative z-10 shadow-2xl flex flex-col animate-fade-in translate-x-0 border-l border-slate-200">
            
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-[#0B1121] text-white shrink-0">
              <div className="flex items-center space-x-3">
                <UserCog className="text-blue-400" size={24}/>
                <h2 className="text-xl font-black tracking-tight">Edit Customer Profile</h2>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="text-slate-400 hover:text-white transition-colors outline-none"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/50">
              {errorMsg && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center"><ShieldAlert size={18} className="mr-2 shrink-0" /> {errorMsg}</div>}

              <form id="edit-form" onSubmit={handleUpdate} className="space-y-8">
                
                {/* 1. Identity Verification Section */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center"><FileText size={14} className="mr-1.5"/> Legal Identity</h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-1">First Name</label>
                      <input type="text" required value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-900" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-1">Last Name</label>
                      <input type="text" required value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-900" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-1">National ID</label>
                      <input type="text" required value={formData.national_id} onChange={e => setFormData({...formData, national_id: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-900 font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-1">Gender</label>
                      <select required value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-900 appearance-none">
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Contact Information */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center"><Phone size={14} className="mr-1.5"/> Contact & Address</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block mb-1">Mobile Number</label>
                        <div className="relative"><Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" required value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-900" /></div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block mb-1">Email (Optional)</label>
                        <div className="relative"><Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-900" /></div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-1">Physical Address</label>
                      <div className="relative"><MapPin size={14} className="absolute left-3 top-3 text-slate-400" /><textarea rows={2} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-900 resize-none" placeholder="Enter full address..."></textarea></div>
                    </div>
                  </div>
                </div>

                {/* 3. Compliance & Administration */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center"><ShieldCheck size={14} className="mr-1.5"/> Compliance Administration</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-1">KYC Status</label>
                      <select required value={formData.kyc_status} onChange={e => setFormData({...formData, kyc_status: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-black text-slate-700 appearance-none">
                        <option value="PENDING">PENDING</option>
                        <option value="VERIFIED">VERIFIED</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-1">Branch Assignment</label>
                      <select required value={formData.branch_id} onChange={e => setFormData({...formData, branch_id: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-700 appearance-none">
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

              </form>
            </div>
            
            {/* Action Footer */}
            <div className="p-6 bg-white border-t border-slate-200 flex space-x-3 shrink-0">
              <button type="button" onClick={() => setIsDrawerOpen(false)} disabled={isProcessing} className="flex-1 py-3.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 outline-none">Cancel</button>
              <button form="edit-form" type="submit" disabled={isProcessing} className="flex-[2] flex items-center justify-center space-x-2 bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 outline-none">
                {isProcessing ? <><Loader2 size={18} className="animate-spin" /> <span>Saving Changes...</span></> : <><Save size={18} /><span>Update Customer</span></>}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};