import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import { 
  Users, UserPlus, Mail, Phone, MapPin, 
  Loader2, CheckCircle2, ShieldCheck, Search, ShieldAlert,
  Briefcase
} from 'lucide-react';

export const RegisterStaffPage = () => {
  const user = useAuthStore((state: any) => state.user);
  
  const [staff, setStaff] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role_name: 'Loan Officer', // Default role
    branch_id: ''
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const activeLenderId = user?.role === 'Super Admin' ? '' : `?lender_id=${user?.lender_id}`;
      
      const [staffRes, branchRes] = await Promise.all([
        api.get(`/users/staff${activeLenderId}`),
        api.get(`/branches${activeLenderId}`)
      ]);
      
      setStaff(staffRes.data);
      setBranches(branchRes.data);
      
      // Auto-select the first branch if available
      if (branchRes.data.length > 0) {
        setFormData(prev => ({ ...prev, branch_id: branchRes.data[0].id }));
      }
    } catch (error: any) {
      console.error('Failed to load staff data:', error);
      setErrorMsg('Failed to load organizational data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMsg('');

    try {
      await api.post('/users/invite', {
        ...formData,
        lender_id: user?.lender_id
      });
      
      setIsModalOpen(false);
      loadData();
      setFormData({ ...formData, first_name: '', last_name: '', email: '', phone: '' }); // Keep role/branch selection
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Failed to send invitation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredStaff = staff.filter(member => 
    `${member.first_name} ${member.last_name} ${member.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-10">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">User Management</h1>
          <p className="text-slate-500 font-medium mt-1">Manage institutional access, roles, and branch assignments.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl shadow-md hover:bg-slate-800 active:scale-95 transition-all outline-none"
        >
          <UserPlus size={18} />
          <span>Invite Staff</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <div className="relative group w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" placeholder="Search staff members..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Loader2 size={40} className="animate-spin mb-4 text-slate-300" />
            <p className="font-bold">Loading org chart...</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4"><Users size={28} /></div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No staff members found</h3>
            <p className="text-slate-500 font-medium text-sm">Click "Invite Staff" to add members to your organization.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                  <th className="p-5 pl-6">Staff Member</th>
                  <th className="p-5">Contact</th>
                  <th className="p-5">System Role</th>
                  <th className="p-5">Branch Assignment</th>
                  <th className="p-5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5 pl-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm border border-blue-100 uppercase">
                          {member.first_name?.[0] || 'U'}{member.last_name?.[0] || ''}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{member.first_name || 'System'} {member.last_name || 'Admin'}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {member.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center text-xs font-medium text-slate-600 mb-1">
                        <Mail size={12} className="mr-1.5 text-slate-400" /> {member.email}
                      </div>
                      <div className="flex items-center text-xs font-medium text-slate-600">
                        <Phone size={12} className="mr-1.5 text-slate-400" /> {member.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="p-5">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                        {member.role?.name || 'Unknown'}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center text-sm font-bold text-slate-700">
                        <MapPin size={14} className="mr-2 text-slate-400" />
                        {member.branch?.name || 'All Branches (HQ)'}
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        member.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {member.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- INVITATION MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setIsModalOpen(false)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg relative z-10 overflow-hidden animate-fade-in border border-slate-200">
            
            <div className="bg-[#0B1121] p-6 text-white shrink-0">
              <h3 className="font-black text-xl tracking-tight">Provision Staff Account</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">They will receive an email with their secure login credentials.</p>
            </div>

            <form id="invite-form" onSubmit={handleSubmit} className="p-8 space-y-6">
              {errorMsg && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-bold flex items-center">
                  <ShieldAlert size={18} className="mr-2 shrink-0" /> {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">First Name *</label>
                  <input type="text" required value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-slate-900" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Last Name *</label>
                  <input type="text" required value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-slate-900" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Official Email *</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-slate-900" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">RBAC Role *</label>
                  <div className="relative">
                    <ShieldCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select required value={formData.role_name} onChange={e => setFormData({...formData, role_name: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 appearance-none">
                      <option value="Lender Admin">Lender Admin</option>
                      <option value="Branch Manager">Branch Manager</option>
                      <option value="Loan Officer">Loan Officer</option>
                      <option value="Cashier">Cashier</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Branch Assignment *</label>
                  <div className="relative">
                    <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select required value={formData.branch_id} onChange={e => setFormData({...formData, branch_id: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 appearance-none">
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-200 flex space-x-3 -mx-8 -mb-8 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={isProcessing} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors">Cancel</button>
                <button type="submit" disabled={isProcessing} className="flex-[2] flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all">
                  {isProcessing ? <><Loader2 size={18} className="animate-spin" /> <span>Provisioning...</span></> : <><CheckCircle2 size={18} /><span>Send Invitation</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};