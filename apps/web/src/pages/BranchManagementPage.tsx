import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import { 
  MapPin, Plus, Edit, Trash2, Loader2, CheckCircle2, ShieldAlert, 
  Search, Users, Briefcase, Building2, Eye, Filter, X, Mail, Phone, Clock
} from 'lucide-react';

export const BranchManagementPage = () => {
  const user = useAuthStore((state: any) => state.user);
  const canManage = ['Super Admin', 'Lender Admin'].includes(user?.role);
  
  // State
  const [branches, setBranches] = useState<any[]>([]);
  const [lenders, setLenders] = useState<any[]>([]);
  const [activeLenderId, setActiveLenderId] = useState(user?.lender_id || '');
  const [isLoading, setIsLoading] = useState(true);
  
  // Advanced Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStaff, setFilterStaff] = useState('ALL'); // ALL, HAS_STAFF, EMPTY

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewModal, setViewModal] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const initialFormState = { id: '', name: '', location: '' };
  const [formData, setFormData] = useState(initialFormState);
  const [isEditing, setIsEditing] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      let currentLenderId = activeLenderId;

      // Super Admin: Fetch Institutions for isolation
      if (user?.role === 'Super Admin') {
        try {
           const lendersRes = await api.get('/lenders');
           const fetchedLenders = lendersRes.data.map((l: any) => ({ id: l.id, name: l.name }));
           setLenders(fetchedLenders);
           if (fetchedLenders.length > 0 && !currentLenderId) {
              currentLenderId = fetchedLenders[0].id;
              setActiveLenderId(currentLenderId);
           }
        } catch (e) {
           console.error("Failed to fetch lenders");
        }
      }

      if (!currentLenderId && user?.role !== 'Super Admin') {
          currentLenderId = user?.lender_id;
      }

      if (currentLenderId) {
          const response = await api.get(`/branches?lender_id=${currentLenderId}`);
          setBranches(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load branches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeLenderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMsg('');

    try {
      if (isEditing) {
        await api.patch(`/branches/${formData.id}`, {
          name: formData.name,
          location: formData.location
        });
      } else {
        await api.post('/branches', {
          name: formData.name,
          location: formData.location,
          lender_id: activeLenderId // Attach securely for Super Admins
        });
      }
      setIsModalOpen(false);
      setFormData(initialFormState);
      loadData();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Failed to save branch.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this branch?')) return;
    try {
      await api.delete(`/branches/${id}`);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete branch.');
    }
  };

  const openCreateModal = () => {
    setErrorMsg('');
    setIsEditing(false);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (branch: any) => {
    setErrorMsg('');
    setIsEditing(true);
    setFormData({ id: branch.id, name: branch.name, location: branch.location });
    setIsModalOpen(true);
  };

  // --- FILTERING & KPIs ---
  const filteredBranches = branches.filter(b => {
      const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.location.toLowerCase().includes(searchQuery.toLowerCase());
      let matchesStaff = true;
      if (filterStaff === 'HAS_STAFF') matchesStaff = b._count.users > 0;
      if (filterStaff === 'EMPTY') matchesStaff = b._count.users === 0;

      return matchesSearch && matchesStaff;
  });

  const totalBranches = filteredBranches.length;
  const totalStaffCount = filteredBranches.reduce((acc, b) => acc + b._count.users, 0);
  const totalCustomersCount = filteredBranches.reduce((acc, b) => acc + b._count.borrowers, 0);

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Branch Management</h1>
          <p className="text-slate-500 font-medium mt-1">Manage physical locations, assign staff, and monitor regional operations.</p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-indigo-500 hover:-translate-y-1 transition-transform">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Branches</p>
            <h3 className="text-2xl font-black text-slate-900">{totalBranches}</h3>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center"><Building2 size={20} /></div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-blue-500 hover:-translate-y-1 transition-transform">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Staff Assigned</p>
            <h3 className="text-2xl font-black text-slate-900">{totalStaffCount}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center"><Briefcase size={20} /></div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-emerald-500 hover:-translate-y-1 transition-transform">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Regional Customers</p>
            <h3 className="text-2xl font-black text-slate-900">{totalCustomersCount}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center"><Users size={20} /></div>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
        
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Tenant Isolation (Super Admin) */}
          {user?.role === 'Super Admin' && lenders.length > 0 && (
            <div className="relative group w-full sm:w-64">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select 
                value={activeLenderId} 
                onChange={(e) => setActiveLenderId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm appearance-none"
              >
                {lenders.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="relative group w-full sm:w-64 shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search branches..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
            />
          </div>

          <div className="relative group w-full sm:w-48 shrink-0">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
              value={filterStaff} 
              onChange={(e) => setFilterStaff(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm appearance-none cursor-pointer"
            >
              <option value="ALL">All Branches</option>
              <option value="HAS_STAFF">Has Active Staff</option>
              <option value="EMPTY">Unstaffed / Empty</option>
            </select>
          </div>
        </div>

        {canManage && (
          <button onClick={openCreateModal} className="shrink-0 flex items-center justify-center space-x-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all outline-none">
            <Plus size={18} /> <span>New Branch</span>
          </button>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Loader2 size={40} className="animate-spin mb-4 text-slate-300" />
            <p className="font-bold">Loading branches...</p>
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4"><Building2 size={28} /></div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No branches found</h3>
            <p className="text-slate-500 font-medium text-sm">Adjust your filters or add a new location.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-widest font-black">
                  <th className="p-5 pl-6 w-[35%]">Branch Details</th>
                  <th className="p-5 w-[20%] text-center">Assigned Officers</th>
                  <th className="p-5 w-[20%] text-center">Registered Customers</th>
                  <th className="p-5 text-right pr-6 w-[25%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBranches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-5 pl-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm border border-indigo-100 shrink-0">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm mb-0.5">{branch.name}</p>
                          <p className="text-[11px] text-slate-500 font-bold flex items-center"><MapPin size={10} className="mr-1"/> {branch.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold ${branch._count.users > 0 ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                        {branch._count.users} Staff
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold ${branch._count.borrowers > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {branch._count.borrowers} Customers
                      </span>
                    </td>
                    <td className="p-5 text-right pr-6">
                      <div className="flex justify-end space-x-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setViewModal(branch)} 
                          className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white rounded-lg text-xs font-bold transition-colors outline-none shadow-sm flex items-center"
                        >
                          <Eye size={14} className="mr-1.5" /> View
                        </button>
                        
                        {canManage && (
                          <>
                            <button onClick={() => openEditModal(branch)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-amber-50 hover:text-amber-600 transition-colors outline-none shadow-sm">
                              <Edit size={14} />
                            </button>
                            <button onClick={() => handleDelete(branch.id)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors outline-none shadow-sm">
                              <Trash2 size={14} />
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

      {/* --- VIEW BRANCH MODAL (COMPREHENSIVE) --- */}
      {viewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewModal(null)}></div>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
               
               {/* Header */}
               <div className="bg-[#0B1121] p-6 sm:p-8 text-white shrink-0 flex justify-between items-start sm:items-center relative">
                  <button onClick={() => setViewModal(null)} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors outline-none bg-white/10 hover:bg-white/20 p-2 rounded-full"><X size={20}/></button>
                  <div className="flex items-center space-x-4 pr-12">
                     <div className="w-14 h-14 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/30 shrink-0">
                        <Building2 size={28} />
                     </div>
                     <div>
                        <h3 className="font-black text-2xl tracking-tight leading-tight mb-1">{viewModal.name}</h3>
                        <p className="text-indigo-300 text-sm font-medium flex items-center"><MapPin size={14} className="mr-1.5" /> {viewModal.location}</p>
                     </div>
                  </div>
               </div>

               {/* Modal KPIs */}
               <div className="p-6 bg-slate-50/50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Assigned Staff Directory</p>
                        <h4 className="text-3xl font-black text-slate-900">{viewModal._count?.users || 0}</h4>
                     </div>
                     <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Briefcase size={24}/></div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Registered Customers</p>
                        <h4 className="text-3xl font-black text-slate-900">{viewModal._count?.borrowers || 0}</h4>
                     </div>
                     <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><Users size={24}/></div>
                  </div>
               </div>

               {/* Staff Directory Body */}
               <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-slate-50/30">
                  <h4 className="font-black text-lg text-slate-800 mb-4 flex items-center"><Users className="mr-2 text-slate-400" size={20}/> Branch Officers & Staff</h4>
                  
                  {viewModal.users && viewModal.users.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                          {viewModal.users.map((u: any) => (
                              <div key={u.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4 hover:border-blue-300 transition-colors">
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg uppercase shrink-0 ${u.is_active ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                                      {u.first_name?.[0]}{u.last_name?.[0]}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <p className="font-bold text-slate-900 truncate">{u.first_name} {u.last_name}</p>
                                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1.5">{u.role?.name}</p>
                                      <div className="flex flex-col space-y-1">
                                          <span className="text-[11px] font-bold text-slate-500 flex items-center truncate"><Mail size={12} className="mr-1.5 text-slate-400"/> {u.email}</span>
                                          {u.phone && <span className="text-[11px] font-bold text-slate-500 flex items-center truncate"><Phone size={12} className="mr-1.5 text-slate-400"/> {u.phone}</span>}
                                      </div>
                                  </div>
                                  <div className="pl-2 border-l border-slate-100 shrink-0">
                                      {u.is_active ? (
                                          <div className="flex flex-col items-center text-emerald-600" title="Active">
                                              <CheckCircle2 size={16} />
                                          </div>
                                      ) : (
                                          <div className="flex flex-col items-center text-slate-400" title="Suspended">
                                              <Clock size={16} />
                                          </div>
                                      )}
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="py-16 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-slate-200 border-dashed">
                          <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4"><Users size={32} /></div>
                          <h5 className="font-bold text-slate-700 text-lg">No Staff Assigned</h5>
                          <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">This branch currently has no active loan officers or managers assigned to it.</p>
                      </div>
                  )}
               </div>
            </div>
          </div>
      )}

      {/* --- ADD / EDIT BRANCH MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setIsModalOpen(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-fade-in border border-slate-200">
            <div className="bg-[#0B1121] p-6 text-white shrink-0 flex items-center space-x-3">
              <Building2 className="text-blue-400" size={20} />
              <h3 className="font-black text-xl tracking-tight">{isEditing ? 'Edit Branch' : 'Create New Branch'}</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              {errorMsg && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center"><ShieldAlert size={18} className="mr-2 shrink-0" /> {errorMsg}</div>}
              
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Branch Name *</label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900" placeholder="e.g. Downtown HQ" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Physical Location / City *</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900" placeholder="e.g. Nairobi CBD" />
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors">Cancel</button>
                <button type="submit" disabled={isProcessing} className="flex-[2] flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30">
                  {isProcessing ? <><Loader2 size={18} className="animate-spin" /> <span>Saving...</span></> : <><CheckCircle2 size={18} /><span>Save Branch</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};