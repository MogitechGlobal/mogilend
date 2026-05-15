import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import { 
  MapPin, Plus, Edit, Trash2, Loader2, CheckCircle2, ShieldAlert, 
  Search, Users, Briefcase
} from 'lucide-react';

export const BranchManagementPage = () => {
  const user = useAuthStore((state: any) => state.user);
  
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const initialFormState = { id: '', name: '', location: '' };
  const [formData, setFormData] = useState(initialFormState);
  const [isEditing, setIsEditing] = useState(false);

  const loadBranches = async () => {
    setIsLoading(true);
    try {
      const activeLenderId = user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e'; // Fallback for root testing
      const response = await api.get(`/branches?lender_id=${activeLenderId}`);
      setBranches(response.data);
    } catch (error: any) {
      console.error('Failed to load branches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadBranches();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMsg('');

    try {
      if (isEditing) {
        await api.patch(`/branches/${formData.id}`, formData);
      } else {
        const activeLenderId = user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e';
        await api.post('/branches', { ...formData, lender_id: activeLenderId });
      }
      setIsModalOpen(false);
      loadBranches();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Failed to save branch.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openCreateModal = () => {
    setFormData(initialFormState);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (branch: any) => {
    setFormData({ id: branch.id, name: branch.name, location: branch.location });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this branch?")) return;
    try {
      await api.delete(`/branches/${id}`);
      loadBranches();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete branch.');
    }
  };

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Branch Management</h1>
          <p className="text-slate-500 font-medium mt-1">Configure physical and virtual office locations for your institution.</p>
        </div>
        <button onClick={openCreateModal} className="flex items-center space-x-2 bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all outline-none">
          <Plus size={18} /><span>Add New Branch</span>
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <div className="relative group w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input type="text" placeholder="Search branches by name or city..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Loader2 size={40} className="animate-spin mb-4 text-slate-300" />
            <p className="font-bold">Fetching branches...</p>
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <MapPin size={32} className="text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-slate-900">No branches found</h3>
            <p className="text-slate-500 text-sm mt-1">Click "Add New Branch" to create your first location.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                  <th className="p-5 pl-6">Branch Details</th>
                  <th className="p-5">Location</th>
                  <th className="p-5 text-center">Assigned Staff</th>
                  <th className="p-5 text-center">Active Borrowers</th>
                  <th className="p-5 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBranches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-5 pl-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm uppercase shadow-sm border border-indigo-100 shrink-0">
                          <Briefcase size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{branch.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {branch.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center text-xs font-bold text-slate-700">
                        <MapPin size={14} className="mr-1.5 text-slate-400" /> {branch.location}
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 w-8 h-8 rounded-lg font-bold text-xs border border-slate-200">
                        {branch._count?.users || 0}
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      <span className="inline-flex items-center justify-center bg-emerald-50 text-emerald-700 w-8 h-8 rounded-lg font-bold text-xs border border-emerald-200">
                        {branch._count?.borrowers || 0}
                      </span>
                    </td>
                    <td className="p-5 text-right pr-6">
                      <div className="flex items-center justify-end space-x-2">
                        <button onClick={() => openEditModal(branch)} title="Edit Branch" className="p-1.5 text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-600 hover:text-white rounded-lg transition-colors outline-none"><Edit size={16} /></button>
                        <button onClick={() => handleDelete(branch.id)} title="Delete Branch" className="p-1.5 text-red-600 bg-red-50 border border-red-200 hover:bg-red-600 hover:text-white rounded-lg transition-colors outline-none"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- ADD/EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setIsModalOpen(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-fade-in border border-slate-200">
            <div className="bg-[#0B1121] p-6 text-white shrink-0">
              <h3 className="font-black text-xl tracking-tight">{isEditing ? 'Update Branch' : 'Register New Branch'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {errorMsg && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center"><ShieldAlert size={18} className="mr-2" /> {errorMsg}</div>}
              
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Branch Name *</label>
                <div className="relative">
                  <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900" placeholder="e.g. Westlands Branch" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Physical Location / City *</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900" placeholder="e.g. Nairobi CBD" />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors">Cancel</button>
                <button type="submit" disabled={isProcessing} className="flex-[2] flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all">
                  {isProcessing ? <><Loader2 size={18} className="animate-spin" /> <span>Saving...</span></> : <span>{isEditing ? 'Update Details' : 'Create Branch'}</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};