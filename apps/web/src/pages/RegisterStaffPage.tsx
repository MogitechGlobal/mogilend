import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import {
  Users, UserPlus, Mail, Phone, MapPin,
  Loader2, CheckCircle2, ShieldCheck, Search, ShieldAlert,
  Briefcase, Clock, Edit, Trash2, X, RefreshCw
} from 'lucide-react';

export const RegisterStaffPage = () => {
  const user = useAuthStore((state: any) => state.user);

  const [staff, setStaff] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form States
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    role_name: 'Loan Officer', branch_id: ''
  });
  
  const [editData, setEditData] = useState({
    id: '', role_name: '', branch_id: ''
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const activeLenderId = user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e';

      const [staffRes, branchesRes] = await Promise.all([
        api.get(`/users?lender_id=${activeLenderId}`), 
        api.get(`/branches?lender_id=${activeLenderId}`)
      ]);

      setStaff(staffRes.data);
      setBranches(branchesRes.data);
    } catch (error) {
      console.error('Failed to load system data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMsg('');

    try {
      const activeLenderId = user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e';
      
      await api.post('/users/invite', {
        ...formData,
        lender_id: activeLenderId
      });

      setIsInviteModalOpen(false);
      setFormData({ first_name: '', last_name: '', email: '', phone: '', role_name: 'Loan Officer', branch_id: '' });
      loadData();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Failed to provision staff member.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResendInvite = async (userId: string) => {
    if (!window.confirm('Are you sure you want to generate a new password and resend the invite email?')) return;
    try {
      await api.post(`/users/${userId}/resend-invite`);
      alert('A new invite has been successfully sent to the user.');
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to resend invite.');
    }
  };

  const toggleUserStatus = async (userId: string) => {
    if (!window.confirm('Are you sure you want to change this user\'s access status?')) return;
    try {
      await api.patch(`/users/${userId}/toggle-status`);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update user status.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMsg('');
    try {
      await api.patch(`/users/${editData.id}`, {
        role_name: editData.role_name,
        branch_id: editData.branch_id
      });
      setIsEditModalOpen(false);
      loadData();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Failed to update staff member.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteStaff = async (userId: string) => {
    if (!window.confirm('WARNING: Deleting a staff member is permanent. Are you absolutely sure?')) return;
    try {
      await api.delete(`/users/${userId}`);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete staff member.');
    }
  };

  const filteredStaff = staff.filter(s => {
    const searchString = `${s.first_name} ${s.last_name} ${s.email} ${s.role?.name}`.toLowerCase();
    return searchString.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff Directory</h1>
          <p className="text-slate-500 font-medium mt-1">Provision accounts and manage role-based access controls.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative group flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input
              type="text" placeholder="Search staff or role..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() => { setErrorMsg(''); setIsInviteModalOpen(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all outline-none"
          >
            <UserPlus size={18} /> <span className="hidden sm:inline">Invite Staff</span>
          </button>
        </div>
      </div>

      {/* Active Staff List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[1050px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-widest font-black">
                <th className="p-5 pl-6 w-[25%]">Staff Member</th>
                <th className="p-5 w-[20%]">Contact</th>
                <th className="p-5 w-[20%]">Role & Location</th>
                <th className="p-5 text-center w-[15%]">Status</th>
                <th className="p-5 text-right pr-6 w-[20%]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Loader2 size={40} className="animate-spin mb-4 text-slate-300" />
                      <p className="font-bold">Loading directory...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 px-4">
                      <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4"><Users size={28} /></div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">No staff found</h3>
                      <p className="text-slate-500 font-medium text-sm">No accounts match your current filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => {
                  // Determine Invite Status
                  const isInviteExpired = member.invite_expires_at && new Date(member.invite_expires_at) < new Date();
                  
                  return (
                    <tr key={member.id} className={`hover:bg-slate-50/80 transition-colors group ${!member.is_active ? 'opacity-60 grayscale-[50%]' : ''}`}>
                      <td className="p-5 pl-6">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm uppercase shrink-0 ${member.is_active ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                            {member.first_name?.[0]}{member.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{member.first_name} {member.last_name}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">UID: {member.id.substring(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center text-sm font-semibold text-slate-700 mb-1">
                          <Mail size={12} className="mr-2 text-slate-400" /> {member.email}
                        </div>
                        {member.phone && (
                          <div className="flex items-center text-xs font-medium text-slate-500">
                            <Phone size={12} className="mr-2 text-slate-400" /> {member.phone}
                          </div>
                        )}
                      </td>
                      <td className="p-5">
                        <p className="text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 inline-block px-2 py-0.5 rounded-md mb-1.5">{member.role?.name || 'Unassigned'}</p>
                        <div className="flex items-center text-[11px] font-bold text-slate-500">
                          <MapPin size={12} className="mr-1.5" /> {member.branch?.name || 'Headquarters'}
                        </div>
                      </td>
                      <td className="p-5 text-center">
                        {member.requires_password_change ? (
                          isInviteExpired ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-red-50 text-red-700 border-red-200" title="Temporary password expired">
                              <Clock size={10} className="mr-1 -mt-0.5" /> Expired
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-blue-50 text-blue-700 border-blue-200" title="User needs to log in and set their own password">
                              <Mail size={10} className="mr-1 -mt-0.5" /> Pending
                            </span>
                          )
                        ) : (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${member.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {member.is_active ? <CheckCircle2 size={10} className="mr-1 -mt-0.5" /> : <ShieldAlert size={10} className="mr-1 -mt-0.5" />}
                            {member.is_active ? 'Active' : 'Suspended'}
                          </span>
                        )}
                      </td>
                      <td className="p-5 text-right pr-6">
                        <div className="flex justify-end space-x-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          
                          {member.requires_password_change && (
                            <button 
                              onClick={() => handleResendInvite(member.id)} 
                              title="Resend Invite"
                              className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors outline-none shadow-sm"
                            >
                              <RefreshCw size={14} />
                            </button>
                          )}

                          <button onClick={() => toggleUserStatus(member.id)} title={member.is_active ? 'Suspend User' : 'Activate User'} className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-colors outline-none shadow-sm ${member.is_active ? 'bg-white border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200' : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'}`}>
                            {member.is_active ? <Clock size={14} /> : <CheckCircle2 size={14} />}
                          </button>
                          <button onClick={() => { setEditData({ id: member.id, role_name: member.role?.name, branch_id: member.branch_id || '' }); setIsEditModalOpen(true); }} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors outline-none shadow-sm">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDeleteStaff(member.id)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors outline-none shadow-sm">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- PROVISION NEW STAFF MODAL --- */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setIsInviteModalOpen(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden animate-fade-in border border-slate-200">
            <div className="bg-[#0B1121] p-6 text-white flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/30"><UserPlus size={20} /></div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Provision New Staff</h3>
                  <p className="text-blue-400/80 text-xs font-medium">An invite with a temporary password will be sent automatically.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleInviteSubmit} className="p-8">
              {errorMsg && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center"><ShieldAlert size={18} className="mr-2 shrink-0" /> {errorMsg}</div>}

              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">First Name</label>
                    <input type="text" required value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Last Name</label>
                    <input type="text" required value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Work Email Address</label>
                    <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Phone Number</label>
                    <input type="text" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">System Role</label>
                    <div className="relative">
                      <ShieldCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select required value={formData.role_name} onChange={e => setFormData({ ...formData, role_name: e.target.value })} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 appearance-none">
                        <option value="Loan Officer">Loan Officer</option>
                        <option value="Cashier">Cashier</option>
                        <option value="Branch Manager">Branch Manager</option>
                        {user?.role === 'Super Admin' && <option value="Lender Admin">Lender Admin (HQ)</option>}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Assigned Location</label>
                    <div className="relative">
                      <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select required={formData.role_name !== 'Lender Admin'} value={formData.branch_id} onChange={e => setFormData({ ...formData, branch_id: e.target.value })} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 appearance-none">
                        <option value="" disabled>-- Select Branch --</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-8">
                <button type="button" onClick={() => setIsInviteModalOpen(false)} disabled={isProcessing} className="flex-1 py-3 bg-slate-100 border border-transparent text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" disabled={isProcessing} className="flex-[2] flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all">
                  {isProcessing ? <><Loader2 size={18} className="animate-spin" /> <span>Provisioning...</span></> : <><CheckCircle2 size={18} /><span>Send Secure Invite</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT STAFF MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setIsEditModalOpen(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm relative z-10 overflow-hidden animate-fade-in border border-slate-200">
            <div className="bg-[#0B1121] p-6 text-white flex justify-between items-center">
              <h3 className="font-black text-lg">Edit Assignment</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white transition-colors outline-none"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-8">
              {errorMsg && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center"><ShieldAlert size={18} className="mr-2 shrink-0" /> {errorMsg}</div>}
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">System Role</label>
                  <div className="relative">
                    <ShieldCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select required value={editData.role_name} onChange={e => setEditData({ ...editData, role_name: e.target.value })} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 appearance-none">
                      <option value="Loan Officer">Loan Officer</option>
                      <option value="Cashier">Cashier</option>
                      <option value="Branch Manager">Branch Manager</option>
                      {user?.role === 'Super Admin' && <option value="Lender Admin">Lender Admin (HQ)</option>}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Assigned Location</label>
                  <div className="relative">
                    <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select required value={editData.branch_id} onChange={e => setEditData({ ...editData, branch_id: e.target.value })} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 appearance-none">
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-200 flex space-x-3 -mx-8 -mb-8 mt-8">
                <button type="button" onClick={() => setIsEditModalOpen(false)} disabled={isProcessing} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors">Cancel</button>
                <button type="submit" disabled={isProcessing} className="flex-[2] flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all">
                  {isProcessing ? <><Loader2 size={18} className="animate-spin" /> <span>Saving...</span></> : <><CheckCircle2 size={18} /><span>Save Changes</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};