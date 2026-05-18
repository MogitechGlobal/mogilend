import React, { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import { api } from '../lib/api';
import { 
  Percent, Calculator, ShieldAlert, Plus, 
  Loader2, Activity, Clock, X, Save, Edit, Trash2
} from 'lucide-react';

export const InterestRatesPage = () => {
  const user = useAuthStore((state: any) => state.user);
  
  const [rates, setRates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form/Drawer State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const defaultFormState = {
    profile_name: '', calculation_method: 'Flat Rate',
    base_rate: '', penalty_rate: '',
    compounding_frequency: 'Monthly', status: 'Active'
  };
  const [formData, setFormData] = useState(defaultFormState);

  // Check Permissions
  const canManageRates = user?.role === 'Super Admin' || user?.role === 'Lender Admin';

  const loadRates = async () => {
    setIsLoading(true);
    try {
      const activeLenderId = user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e';
      const response = await api.get(`/interest-rates?lender_id=${activeLenderId}`);
      setRates(response.data);
    } catch (error) {
      console.error('Failed to load interest rates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
  }, [user]);

  const openCreateForm = () => {
    setEditingId(null);
    setFormData(defaultFormState);
    setErrorMsg('');
    setShowForm(true);
  };

  const openEditForm = (rate: any) => {
    setEditingId(rate.id);
    setFormData({
      profile_name: rate.profile_name,
      calculation_method: rate.calculation_method,
      base_rate: rate.base_rate.toString(),
      penalty_rate: rate.penalty_rate.toString(),
      compounding_frequency: rate.compounding_frequency,
      status: rate.status
    });
    setErrorMsg('');
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the "${name}" profile? This action cannot be undone.`)) return;
    
    try {
      await api.delete(`/interest-rates/${id}`);
      loadRates();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete the profile.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (editingId) {
        await api.patch(`/interest-rates/${editingId}`, formData);
      } else {
        const payload = {
          ...formData,
          lender_id: user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e'
        };
        await api.post('/interest-rates', payload);
      }
      
      setShowForm(false);
      loadRates();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Failed to save interest rate matrix.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-10 px-4 sm:px-6 lg:px-8">
      
      {/* Header - Now fully mobile responsive */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pt-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center">
            <Percent size={28} className="mr-3 text-blue-600 shrink-0" /> Interest Rate Matrix
          </h1>
          <p className="text-slate-500 font-medium mt-1 text-sm sm:text-base">Configure global lending rates, penalties, and compounding logic.</p>
        </div>
        {canManageRates && (
          <button onClick={openCreateForm} className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-slate-900 text-white px-5 py-3 sm:py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-sm outline-none shrink-0">
            <Plus size={18} /> <span>Create Profile</span>
          </button>
        )}
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
            <p className="font-bold text-sm uppercase tracking-widest">Loading Matrices...</p>
          </div>
        ) : rates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <Calculator size={48} className="text-slate-200 mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No Rate Profiles Found</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">Create an interest rate profile to start originating loans for your institution.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar w-full">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                  <th className="p-5 pl-6">Profile Name</th>
                  <th className="p-5">Calculation Logic</th>
                  <th className="p-5 text-right">Base Rate</th>
                  <th className="p-5 text-right">Penalty Rate</th>
                  <th className="p-5 text-center">Status</th>
                  {canManageRates && <th className="p-5 text-right pr-6">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rates.map((rate) => (
                  <tr key={rate.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-5 pl-6">
                      <p className="font-bold text-slate-900 text-sm">{rate.profile_name}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center">
                        <Clock size={10} className="mr-1 shrink-0" /> Compounding: {rate.compounding_frequency}
                      </p>
                    </td>
                    <td className="p-5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold whitespace-nowrap">
                        <Calculator size={12} className="mr-1.5 shrink-0" />
                        {rate.calculation_method}
                      </span>
                    </td>
                    <td className="p-5 text-right font-mono font-black text-blue-600 text-lg">
                      {rate.base_rate}%
                    </td>
                    <td className="p-5 text-right font-mono font-bold text-red-500">
                      {rate.penalty_rate}%
                    </td>
                    <td className="p-5 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${
                        rate.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {rate.status || 'Active'}
                      </span>
                    </td>
                    {canManageRates && (
                      <td className="p-5 text-right pr-6">
                        {/* FIXED: Removed opacity-0 and group-hover logic so buttons are always visible on mobile/desktop */}
                        <div className="flex items-center justify-end space-x-2">
                          <button onClick={() => openEditForm(rate)} className="p-2 text-blue-600 bg-blue-50 border border-blue-200 text-xs font-bold rounded-lg hover:bg-blue-600 hover:text-white transition-colors shadow-sm outline-none">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDelete(rate.id, rate.profile_name)} className="p-2 text-red-600 bg-red-50 border border-red-200 text-xs font-bold rounded-lg hover:bg-red-600 hover:text-white transition-colors shadow-sm outline-none">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- CREATE / EDIT MATRIX DRAWER --- */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSubmitting && setShowForm(false)}></div>
          <div className="bg-white w-full max-w-md h-full relative z-10 shadow-2xl flex flex-col animate-fade-in translate-x-0 border-l border-slate-200">
            
            <div className="p-4 sm:p-6 border-b border-slate-200 flex justify-between items-center bg-[#0B1121] text-white shrink-0">
              <div className="flex items-center space-x-3">
                <Calculator className="text-blue-400" size={24}/>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">{editingId ? 'Edit Rate Profile' : 'New Rate Profile'}</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white transition-colors outline-none"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-slate-50/50">
              {errorMsg && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center"><ShieldAlert size={18} className="mr-2 shrink-0" /> {errorMsg}</div>}

              <form id="rate-form" onSubmit={handleSubmit} className="space-y-6">
                
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center"><Activity size={14} className="mr-1.5"/> Core Parameters</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-1">Profile Name (e.g., Premium SME Loan)</label>
                      <input type="text" required value={formData.profile_name} onChange={e => setFormData({...formData, profile_name: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-900" />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-1">Calculation Method</label>
                      <select required value={formData.calculation_method} onChange={e => setFormData({...formData, calculation_method: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-900 appearance-none">
                        <option value="Flat Rate">Flat Rate</option>
                        <option value="Reducing Balance">Reducing Balance</option>
                        <option value="Compound Interest">Compound Interest</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-1">Profile Status</label>
                      <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-900 appearance-none">
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive (Suspended)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center"><Percent size={14} className="mr-1.5"/> Rate Mathematics</h4>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-1">Base Interest Rate (%)</label>
                      <input type="number" step="0.01" required value={formData.base_rate} onChange={e => setFormData({...formData, base_rate: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono font-black text-blue-600" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-1">Late Penalty Rate (%)</label>
                      <input type="number" step="0.01" required value={formData.penalty_rate} onChange={e => setFormData({...formData, penalty_rate: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono font-black text-red-500" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">Compounding Frequency</label>
                    <select required value={formData.compounding_frequency} onChange={e => setFormData({...formData, compounding_frequency: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700 appearance-none">
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Semi-Annually">Semi-Annually</option>
                      <option value="Annually">Annually</option>
                      <option value="None">None (Simple Interest)</option>
                    </select>
                  </div>
                </div>

              </form>
            </div>
            
            <div className="p-4 sm:p-6 bg-white border-t border-slate-200 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 shrink-0">
              <button type="button" onClick={() => setShowForm(false)} disabled={isSubmitting} className="w-full sm:flex-1 py-3.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 outline-none order-2 sm:order-1">Cancel</button>
              <button form="rate-form" type="submit" disabled={isSubmitting} className="w-full sm:flex-[2] flex items-center justify-center space-x-2 bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 outline-none order-1 sm:order-2">
                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> <span>Saving...</span></> : <><Save size={18} /><span>{editingId ? 'Update Profile' : 'Save Profile'}</span></>}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};