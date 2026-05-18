import React, { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import { api } from '../lib/api';
import { 
  Plus, Package, Clock, Banknote, ArrowLeft, Loader2, CheckCircle2,
  ShieldAlert, Edit, Trash2, Power, Search, Filter, BarChart3
} from 'lucide-react';

export const LoanProductsPage = () => {
  const user = useAuthStore((state: any) => state.user);
  
  const [products, setProducts] = useState<any[]>([]);
  const [rateProfiles, setRateProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Form State
  const initialFormState = {
    name: '',
    selected_profile_id: '', 
    interest_rate: '',
    interest_type: '',
    penalty_rate: '',
    repayment_cycle: 'Monthly',
    min_amount: '',
    max_amount: '',
    default_term: '1',
    status: 'ACTIVE'
  };

  const [formData, setFormData] = useState(initialFormState);

  // --- ROLE BASED ACCESS CONTROL ---
  const canManageProducts = user?.role === 'Super Admin' || user?.role === 'Lender Admin';

  const loadData = async () => {
    setIsLoading(true);
    try {
      const activeLenderId = user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e';
      
      const [productsRes, ratesRes] = await Promise.all([
        api.get(`/loan-products?lender_id=${activeLenderId}`),
        api.get(`/interest-rates?lender_id=${activeLenderId}`)
      ]);

      setProducts(productsRes.data);
      setRateProfiles(ratesRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const profileId = e.target.value;
    const selectedProfile = rateProfiles.find(p => p.id === profileId);

    if (selectedProfile) {
      setFormData({
        ...formData,
        selected_profile_id: profileId,
        interest_rate: selectedProfile.base_rate.toString(),
        interest_type: selectedProfile.calculation_method,
        penalty_rate: selectedProfile.penalty_rate.toString(),
      });
    } else {
      setFormData({ ...formData, selected_profile_id: '' });
    }
  };

  const openCreateForm = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setShowForm(true);
  };

  const openEditForm = (product: any) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      selected_profile_id: '', // Requires re-selection or mapping if saved in DB
      interest_rate: product.interest_rate.toString(),
      interest_type: product.interest_type,
      penalty_rate: (product.penalty_rate || 0).toString(),
      repayment_cycle: product.repayment_cycle || 'Monthly',
      min_amount: product.min_amount.toString(),
      max_amount: product.max_amount.toString(),
      default_term: product.default_term.toString(),
      status: product.status || 'ACTIVE'
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to completely delete the "${name}" product? This is destructive and may affect historical records. Consider suspending it instead.`)) return;
    
    try {
      await api.delete(`/loan-products/${id}`);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete product.');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.patch(`/loan-products/${id}/toggle`, { status: newStatus });
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to change product status.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        lender_id: user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e'
      };
      
      if (editingId) {
        await api.patch(`/loan-products/${editingId}`, payload);
      } else {
        await api.post('/loan-products', payload);
      }
      
      setShowForm(false);
      setFormData(initialFormState);
      loadData();
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('Failed to save loan product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const productStatus = p.status || 'ACTIVE'; // Fallback for old records
    const matchesStatus = statusFilter === 'ALL' || productStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-10 px-4 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pt-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center">
            <Package size={28} className="mr-3 text-blue-600 shrink-0" /> Loan Products
          </h1>
          <p className="text-slate-500 font-medium mt-1 text-sm sm:text-base">Configure and manage your lending portfolio offerings.</p>
        </div>
        {!showForm && canManageProducts && (
          <button onClick={openCreateForm} className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-slate-900 text-white px-5 py-3 sm:py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-sm outline-none shrink-0">
            <Plus size={18} /> <span>New Product</span>
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden max-w-4xl animate-in slide-in-from-bottom-4 duration-500">
          <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button onClick={() => setShowForm(false)} className="p-2 bg-white rounded-full border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors outline-none shadow-sm"><ArrowLeft size={16} /></button>
              <h2 className="text-lg sm:text-xl font-black text-slate-800">{editingId ? 'Edit Product Configuration' : 'Create Loan Product'}</h2>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Product Identity */}
              <div className="space-y-5">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center border-b border-slate-100 pb-2"><Package size={16} className="mr-2" /> Product Identity</h3>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">Product Name</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-900" placeholder="e.g., Premium Business Loan" />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">Link Interest Rate Matrix</label>
                  {rateProfiles.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center text-amber-700 text-xs font-bold">
                      <ShieldAlert size={14} className="mr-2 shrink-0" />
                      You must create an Interest Rate Profile first.
                    </div>
                  ) : (
                    <select required={!editingId} value={formData.selected_profile_id} onChange={handleProfileChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700 appearance-none">
                      <option value="" disabled>{editingId ? 'Leave blank to keep current rates...' : 'Select a rate profile...'}</option>
                      {rateProfiles.map(profile => (
                        <option key={profile.id} value={profile.id}>
                          {profile.profile_name} ({profile.base_rate}% {profile.calculation_method})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Read-only feedback fields from Matrix */}
                {(formData.interest_rate) && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl animate-fade-in">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Applied Base Rate</p>
                      <p className="text-sm font-black text-blue-700">{formData.interest_rate}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Applied Penalty</p>
                      <p className="text-sm font-black text-red-600">{formData.penalty_rate}%</p>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-blue-200/50 mt-1">
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Calculation Method</p>
                       <p className="text-xs font-bold text-slate-700">{formData.interest_type}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Repayment & Limits */}
              <div className="space-y-5">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center border-b border-slate-100 pb-2"><Banknote size={16} className="mr-2" /> Repayment & Limits</h3>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-700 block mb-1">Repayment Cycle</label>
                  <select required value={formData.repayment_cycle} onChange={e => setFormData({...formData, repayment_cycle: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-900 appearance-none">
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Semi-Annually">Semi-Annually</option>
                    <option value="Annually">Annually</option>
                    <option value="None">None (Simple Interest)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">Min Amount (KES)</label>
                    <input type="number" required value={formData.min_amount} onChange={e => setFormData({...formData, min_amount: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-900 font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">Max Amount (KES)</label>
                    <input type="number" required value={formData.max_amount} onChange={e => setFormData({...formData, max_amount: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-900 font-mono" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">Default Term (Cycles)</label>
                    <input type="number" required value={formData.default_term} onChange={e => setFormData({...formData, default_term: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-900 font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">Initial Status</label>
                    <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold text-slate-900 appearance-none">
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive (Hidden)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors w-full sm:w-auto">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 outline-none w-full sm:w-auto">
                {isSubmitting ? <><Loader2 size={18} className="animate-spin"/> <span>Saving...</span></> : <><CheckCircle2 size={18} /><span>{editingId ? 'Update Product' : 'Launch Product'}</span></>}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Advanced Toolbar */}
          {!isLoading && products.length > 0 && (
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 gap-4">
              <div className="relative w-full md:max-w-md">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" placeholder="Search products..." 
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div className="flex items-center space-x-2 w-full md:w-auto">
                <Filter size={16} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mr-2">Filter:</span>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="flex-1 md:w-auto py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none">
                  <option value="ALL">All Products</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="INACTIVE">Suspended Only</option>
                </select>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
              <p className="font-bold text-sm uppercase tracking-widest">Loading Portfolio...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-6 border border-blue-100 shadow-inner">
                <Package size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">No Loan Products Yet</h3>
              <p className="text-slate-500 font-medium max-w-sm mx-auto mb-8 text-sm">
                Build your first loan product by combining an interest rate matrix with repayment terms and limits.
              </p>
              {canManageProducts && (
                <button onClick={openCreateForm} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center space-x-2 outline-none">
                  <Plus size={18} /> <span>Build Product</span>
                </button>
              )}
            </div>
          ) : filteredProducts.length === 0 ? (
             <div className="text-center py-12 text-slate-500 font-medium">No products match your search criteria.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(product => {
                const isActive = product.status !== 'INACTIVE';
                // Simulated usage percentage for UI purposes (Backend to replace with real metric)
                const usagePercentage = product.usage_percentage || Math.floor(Math.random() * 40) + 15; 

                return (
                  <div key={product.id} className={`bg-white rounded-3xl p-6 border shadow-sm transition-all flex flex-col h-full ${isActive ? 'border-slate-200 hover:shadow-md' : 'border-slate-200 opacity-75 grayscale-[20%]'}`}>
                    
                    <div className="flex justify-between items-start mb-5 relative z-10">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${isActive ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        <Banknote size={20} />
                      </div>
                      <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {isActive ? 'Active' : 'Suspended'}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-slate-900 mb-1 line-clamp-1" title={product.name}>{product.name}</h3>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-5 border-b border-slate-100 pb-4">{product.interest_type}</p>

                    <div className="space-y-3 mb-6 flex-1">
                      <div className="flex justify-between items-center p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Interest Rate</span>
                        <span className={`font-black text-lg ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>{product.interest_rate}%</span>
                      </div>
                      
                      <div className="flex justify-between items-center px-2">
                        <span className="text-sm font-semibold text-slate-500">Limits</span>
                        <span className="font-mono text-sm font-bold text-slate-800">
                          K{Number(product.min_amount).toLocaleString()} - K{Number(product.max_amount).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex justify-between items-center px-2">
                        <span className="text-sm font-semibold text-slate-500">Default Term</span>
                        <span className="text-sm font-bold text-slate-800">{product.default_term} {product.repayment_cycle}(s)</span>
                      </div>
                    </div>

                    {/* --- PORTFOLIO USAGE ANALYTICS --- */}
                    <div className="mb-6 bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                          <BarChart3 size={12} className="mr-1" /> Portfolio Usage
                        </span>
                        <span className="text-xs font-black text-slate-700">{usagePercentage}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${isActive ? 'bg-blue-500' : 'bg-slate-400'}`} style={{ width: `${usagePercentage}%` }}></div>
                      </div>
                    </div>

                    {/* --- ADMIN ACTION PANEL --- */}
                    {canManageProducts && (
                      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 mt-auto">
                        <button onClick={() => openEditForm(product)} className="flex items-center justify-center p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-colors outline-none" title="Edit Configuration">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleToggleStatus(product.id, product.status || 'ACTIVE')} className={`flex items-center justify-center p-2.5 rounded-xl transition-colors outline-none ${isActive ? 'bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white'}`} title={isActive ? 'Suspend Product' : 'Activate Product'}>
                          <Power size={16} />
                        </button>
                        <button onClick={() => handleDelete(product.id, product.name)} className="flex items-center justify-center p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-colors outline-none" title="Delete Permanently">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};