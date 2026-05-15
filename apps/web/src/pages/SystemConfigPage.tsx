import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import {
  Building2, Plus, Mail, Phone, FileText,
  MapPin, Loader2, CheckCircle2, ShieldAlert,
  Server, Search, ShieldCheck, Edit, Trash2, Ban, Eye, X, Activity, Users, CreditCard
} from 'lucide-react';

export const SystemConfigPage = () => {
  const user = useAuthStore((state: any) => state.user);

  const [lenders, setLenders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const initialFormState = { id: '', name: '', email: '', phone: '', tax_pin: '', registration_number: '', location: '' };
  const [formData, setFormData] = useState(initialFormState);
  const [selectedLender, setSelectedLender] = useState<any>(null);

  const loadLenders = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/lenders');
      setLenders(response.data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        setErrorMsg('You do not have Super Admin privileges to view this area.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'Super Admin') loadLenders();
    else { setIsLoading(false); setErrorMsg('Access Denied: Super Admin privileges required.'); }
  }, [user]);

  // --- ACTIONS ---

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true); setErrorMsg('');
    try {
      await api.post('/lenders', formData);
      setIsModalOpen(false);
      loadLenders();
      setFormData(initialFormState);
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Failed to onboard new institution.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true); setErrorMsg('');
    try {
      await api.patch(`/lenders/${formData.id}`, formData);
      setIsEditModalOpen(false);
      loadLenders();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Failed to update institution.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const action = currentStatus === 'ACTIVE' ? 'suspend' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} this tenant?`)) return;
    try {
      await api.patch(`/lenders/${id}/toggle-status`);
      loadLenders();
      if (selectedLender?.id === id) setIsDetailsOpen(false); // Close details if open
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update tenant status.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("WARNING: This will permanently delete the tenant, all their branches, and staff. Proceed?")) return;
    try {
      await api.delete(`/lenders/${id}`);
      loadLenders();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete institution.');
    }
  };

  const openEdit = (lender: any) => {
    setFormData({
      id: lender.id, name: lender.name, email: lender.email, phone: lender.phone,
      tax_pin: lender.tax_pin || '', registration_number: lender.registration_number || '', location: ''
    });
    setIsEditModalOpen(true);
  };

  const openDetails = (lender: any) => {
    setSelectedLender(lender);
    setIsDetailsOpen(true);
  };

  const filteredLenders = lenders.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.tax_pin?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (user?.role !== 'Super Admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fade-in">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6"><ShieldAlert size={40} /></div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Access Restricted</h2>
        <p className="text-slate-500 font-medium max-w-md">SaaS configuration and tenant management are restricted to platform owners.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">SaaS Tenant Architecture</h1>
          <p className="text-slate-500 font-medium mt-1">Manage platform microfinance institutions, billing, and system access.</p>
        </div>
        <button onClick={() => { setFormData(initialFormState); setIsModalOpen(true); }} className="flex items-center space-x-2 bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl shadow-md hover:bg-slate-800 active:scale-95 transition-all outline-none">
          <Plus size={18} /><span>Onboard Tenant</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Tenants</span><Building2 size={16} className="text-blue-500" /></div>
          <h3 className="text-2xl font-black text-slate-900">{lenders.filter(l => l.status === 'ACTIVE').length}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suspended</span><Ban size={16} className="text-red-500" /></div>
          <h3 className="text-2xl font-black text-slate-900">{lenders.filter(l => l.status === 'SUSPENDED').length}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Branches</span><MapPin size={16} className="text-indigo-500" /></div>
          <h3 className="text-2xl font-black text-slate-900">{lenders.reduce((acc, lender) => acc + (lender.branches?.length || 0), 0)}</h3>
        </div>
        <div className="bg-[#0B1121] p-5 rounded-2xl shadow-lg flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10"><Server size={40} className="text-emerald-500" /></div>
          <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest z-10">Platform Status</span></div>
          <h3 className="text-lg font-black text-emerald-400 flex items-center z-10"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2"></span> Operational</h3>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <div className="relative group w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input type="text" placeholder="Search institutions by name, email, or PIN..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 animate-pulse">
            <Loader2 size={40} className="animate-spin mb-4 text-slate-300" />
            <p className="font-bold">Fetching tenant registry...</p>
          </div>
        ) : filteredLenders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <Building2 size={32} className="text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-slate-900">No institutions found</h3>
            <p className="text-slate-500 text-sm mt-1">Adjust your search or onboard a new tenant.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                  <th className="p-5 pl-6">Institution Details</th>
                  <th className="p-5">Compliance (CR12 / PIN)</th>
                  <th className="p-5 text-center">Status</th>
                  <th className="p-5 text-right">Joined Date</th>
                  <th className="p-5 text-right pr-6">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLenders.map((lender) => (
                  <tr key={lender.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-5 pl-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm uppercase shadow-sm shrink-0">
                          {lender.name.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{lender.name}</p>
                          <div className="flex items-center space-x-2 mt-0.5 text-[10px] font-medium text-slate-500">
                            <span className="flex items-center"><Mail size={10} className="mr-1" /> {lender.email}</span>
                            <span>•</span>
                            <span className="flex items-center"><Phone size={10} className="mr-1" /> {lender.phone}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <p className="text-xs font-mono font-bold text-slate-700">{lender.registration_number || 'Unverified'}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5 uppercase">PIN: {lender.tax_pin || 'Pending'}</p>
                    </td>
                    <td className="p-5 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${lender.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : lender.status === 'SUSPENDED' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                        {lender.status === 'ACTIVE' ? <ShieldCheck size={12} className="mr-1" /> : lender.status === 'SUSPENDED' ? <Ban size={12} className="mr-1" /> : <Activity size={12} className="mr-1" />}
                        {lender.status}
                      </span>
                    </td>
                    <td className="p-5 text-right text-sm font-medium text-slate-500">
                      {new Date(lender.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-5 text-right pr-6">
                      <div className="flex items-center justify-end space-x-2">
                        <button onClick={() => openDetails(lender)} title="System Overview" className="p-1.5 text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors outline-none"><Eye size={16} /></button>
                        <button onClick={() => openEdit(lender)} title="Edit Institution" className="p-1.5 text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-600 hover:text-white rounded-lg transition-colors outline-none"><Edit size={16} /></button>
                        <button onClick={() => handleToggleStatus(lender.id, lender.status)} title={lender.status === 'ACTIVE' ? "Suspend Tenant" : "Reactivate Tenant"} className={`p-1.5 rounded-lg border transition-colors outline-none ${lender.status === 'ACTIVE' ? 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-500 hover:text-white' : 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-500 hover:text-white'}`}>
                          {lender.status === 'ACTIVE' ? <Ban size={16} /> : <CheckCircle2 size={16} />}
                        </button>
                        <button onClick={() => handleDelete(lender.id)} title="Purge Tenant" className="p-1.5 text-red-600 bg-red-50 border border-red-200 hover:bg-red-600 hover:text-white rounded-lg transition-colors outline-none"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- ADVANCED DETAILS SLIDE-OUT MODAL --- */}
      {isDetailsOpen && selectedLender && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsDetailsOpen(false)}></div>
          <div className="bg-white w-full max-w-md h-full relative z-10 shadow-2xl flex flex-col animate-fade-in translate-x-0 border-l border-slate-200">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-[#0B1121] text-white">
              <div className="flex items-center space-x-3">
                <Building2 className="text-blue-400" size={24} />
                <h2 className="text-xl font-black tracking-tight">Tenant Audit View</h2>
              </div>
              <button onClick={() => setIsDetailsOpen(false)} className="text-slate-400 hover:text-white transition-colors outline-none"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
              {/* Profile Card */}
              <div className="text-center pb-6 border-b border-slate-200">
                <div className="w-20 h-20 bg-slate-200 rounded-2xl mx-auto mb-4 flex items-center justify-center text-slate-600 font-black text-2xl shadow-inner border border-slate-300">
                  {selectedLender.name.substring(0, 2).toUpperCase()}
                </div>
                <h3 className="text-xl font-black text-slate-900">{selectedLender.name}</h3>
                <p className="text-sm font-medium text-slate-500 font-mono mt-1">Tenant ID: {selectedLender.id.split('-')[0]}...</p>
                <div className="mt-4 flex justify-center space-x-2">
                  <span className={`px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full border ${selectedLender.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                    {selectedLender.status}
                  </span>
                </div>
              </div>

              {/* Stats Overview */}
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Infrastructure Usage</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                    <MapPin size={20} className="mx-auto text-blue-500 mb-2" />
                    <h5 className="text-2xl font-black text-slate-900">{selectedLender.branches?.length || 0}</h5>
                    <p className="text-[10px] font-bold uppercase text-slate-500">Active Branches</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                    <Users size={20} className="mx-auto text-indigo-500 mb-2" />
                    <h5 className="text-2xl font-black text-slate-900">--</h5>
                    <p className="text-[10px] font-bold uppercase text-slate-500">Staff Members</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center col-span-2">
                    <CreditCard size={20} className="mx-auto text-emerald-500 mb-2" />
                    <h5 className="text-2xl font-black text-slate-900">--</h5>
                    <p className="text-[10px] font-bold uppercase text-slate-500">Total Capital Processed (KES)</p>
                  </div>
                </div>
              </div>

              {/* Contact & Legal */}
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Compliance Ledger</h4>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                  <div className="p-4 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Corporate Email</span>
                    <span className="text-sm font-bold text-slate-900">{selectedLender.email}</span>
                  </div>
                  <div className="p-4 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Support Phone</span>
                    <span className="text-sm font-bold text-slate-900">{selectedLender.phone}</span>
                  </div>
                  <div className="p-4 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">CR12 Reg No.</span>
                    <span className="text-sm font-mono font-bold text-slate-700">{selectedLender.registration_number || 'N/A'}</span>
                  </div>
                  <div className="p-4 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">KRA PIN</span>
                    <span className="text-sm font-mono font-bold text-slate-700">{selectedLender.tax_pin || 'N/A'}</span>
                  </div>
                  <div className="p-4 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Onboarding Date</span>
                    <span className="text-sm font-bold text-slate-900">{new Date(selectedLender.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-200">
              <button onClick={() => { setIsDetailsOpen(false); openEdit(selectedLender); }} className="w-full py-3 bg-blue-50 text-blue-600 font-bold rounded-xl border border-blue-200 hover:bg-blue-600 hover:text-white transition-colors">Edit Tenant Configuration</button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setIsEditModalOpen(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl relative z-10 overflow-hidden animate-fade-in border border-slate-200">
            <div className="bg-[#0B1121] p-6 text-white shrink-0">
              <h3 className="font-black text-xl tracking-tight">Edit Tenant Configuration</h3>
            </div>
            <form onSubmit={handleEditSubmit} className="p-8 space-y-6">
              {errorMsg && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center"><ShieldAlert size={18} className="mr-2" /> {errorMsg}</div>}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Registered Name</label>
                <div className="relative"><Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Corporate Email</label>
                  <div className="relative"><Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900" /></div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Contact Phone</label>
                  <div className="relative"><Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900" /></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">CR12 Reg Number</label>
                  <div className="relative"><FileText size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={formData.registration_number} onChange={e => setFormData({ ...formData, registration_number: e.target.value })} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900 uppercase" /></div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">KRA PIN</label>
                  <div className="relative"><FileText size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={formData.tax_pin} onChange={e => setFormData({ ...formData, tax_pin: e.target.value })} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900 uppercase" /></div>
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors">Cancel</button>
                <button type="submit" disabled={isProcessing} className="flex-[2] flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all">
                  {isProcessing ? <><Loader2 size={18} className="animate-spin" /> <span>Updating...</span></> : <span>Save Configuration</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ONBOARDING MODAL (Retained) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setIsModalOpen(false)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden animate-fade-in border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="bg-[#0B1121] p-6 text-white shrink-0">
              <h3 className="font-black text-xl tracking-tight">Onboard New Tenant</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Register a new microfinance institution onto the platform.</p>
            </div>
            <div className="overflow-y-auto custom-scrollbar p-8">
              {errorMsg && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center"><ShieldAlert size={18} className="mr-2" /> {errorMsg}</div>}
              <form id="onboard-form" onSubmit={handleOnboardSubmit} className="space-y-6">
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Organization Details</h4>
                  <div className="space-y-4">
                    <div><label className="text-xs font-bold text-slate-700 block mb-1.5">Registered Name *</label><div className="relative"><Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900" /></div></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-xs font-bold text-slate-700 block mb-1.5">Official Email *</label><div className="relative"><Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900" /></div></div>
                      <div><label className="text-xs font-bold text-slate-700 block mb-1.5">Contact Phone *</label><div className="relative"><Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900" /></div></div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Legal & Compliance</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-slate-700 block mb-1.5">KRA PIN</label><div className="relative"><FileText size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={formData.tax_pin} onChange={e => setFormData({ ...formData, tax_pin: e.target.value })} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900 uppercase" /></div></div>
                    <div><label className="text-xs font-bold text-slate-700 block mb-1.5">Reg. Number (CR12)</label><div className="relative"><FileText size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={formData.registration_number} onChange={e => setFormData({ ...formData, registration_number: e.target.value })} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900 uppercase" /></div></div>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Default Branch (HQ)</h4>
                  <div><label className="text-xs font-bold text-slate-700 block mb-1.5">HQ Location / City *</label><div className="relative"><MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" required value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900" placeholder="Nairobi CBD" /></div></div>
                  <p className="text-[10px] text-slate-500 mt-2 font-medium bg-slate-50 p-2 rounded-lg border border-slate-100"><Server size={12} className="inline mr-1 text-slate-400" />Saving this form automatically generates the root profile and HQ.</p>
                </div>
              </form>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0 flex space-x-3">
              <button type="button" onClick={() => setIsModalOpen(false)} disabled={isProcessing} className="flex-1 py-3.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors">Cancel</button>
              <button form="onboard-form" type="submit" disabled={isProcessing} className="flex-[2] flex items-center justify-center space-x-2 bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all">
                {isProcessing ? <><Loader2 size={18} className="animate-spin" /> <span>Provisioning...</span></> : <><CheckCircle2 size={18} /><span>Complete Registration</span></>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};