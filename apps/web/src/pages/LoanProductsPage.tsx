import React, { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import { api } from '../lib/api';
import { 
  Plus, Package, Percent, Clock, 
  Banknote, MoreVertical, ArrowLeft, Loader2, CheckCircle2,
  Calculator, ShieldAlert
} from 'lucide-react';

export const LoanProductsPage = () => {
  const user = useAuthStore((state: any) => state.user);
  
  const [products, setProducts] = useState<any[]>([]);
  const [rateProfiles, setRateProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const initialFormState = {
    name: '',
    selected_profile_id: '', // Used to track dropdown selection
    interest_rate: '',
    interest_type: '',
    penalty_rate: '',
    repayment_cycle: 'Monthly',
    min_amount: '',
    max_amount: '',
    default_term: '1'
  };

  const [formData, setFormData] = useState(initialFormState);

  // Fetch Products & Rate Profiles simultaneously
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
      console.error('Failed to fetch data:', error);
      // Fallback mock data for UI preview
      setProducts([
        { id: 1, name: 'Salary Advance', interest_rate: 5, interest_type: 'Flat Rate', min_amount: 1000, max_amount: 50000, default_term: 1, status: 'Active' },
        { id: 2, name: 'SME Business Loan', interest_rate: 12, interest_type: 'Reducing Balance', min_amount: 50000, max_amount: 1000000, default_term: 12, status: 'Active' }
      ]);
      setRateProfiles([
        { id: 'mock-1', profile_name: 'Standard SME Tier', calculation_method: 'Reducing Balance', base_rate: 12.5, penalty_rate: 3.0, status: 'Active' },
        { id: 'mock-2', profile_name: 'Micro-Advance Tier', calculation_method: 'Flat Rate', base_rate: 5.0, penalty_rate: 5.0, status: 'Active' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  // Handle Rate Profile Selection
  const handleProfileSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const profileId = e.target.value;
    if (!profileId) {
      setFormData({ ...formData, selected_profile_id: '', interest_rate: '', interest_type: '', penalty_rate: '' });
      return;
    }

    // Find the profile and map its values to the product form payload
    const profile = rateProfiles.find(p => p.id.toString() === profileId);
    if (profile) {
      setFormData({
        ...formData,
        selected_profile_id: profileId,
        interest_rate: profile.base_rate,
        interest_type: profile.calculation_method,
        penalty_rate: profile.penalty_rate || 0
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // We exclude selected_profile_id from the payload to match your Prisma Schema
      const { selected_profile_id, ...payload } = formData;
      
      await api.post('/loan-products', { 
        ...payload, 
        lender_id: user?.lender_id 
      });
      setShowForm(false);
      loadData();
      setFormData(initialFormState); // Reset
    } catch (err) {
      alert('Failed to create product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Loan Products</h1>
          <p className="text-slate-500 font-medium mt-1">Configure and manage your institution's credit offerings.</p>
        </div>
        
        <button
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/50 ${
            showForm 
              ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50' 
              : 'bg-blue-600 text-white shadow-blue-500/30 hover:bg-blue-700 hover:shadow-md'
          }`}
        >
          {showForm ? (
            <><ArrowLeft size={18} /> <span>Back to Products</span></>
          ) : (
            <><Plus size={18} /> <span>New Product</span></>
          )}
        </button>
      </div>

      {showForm ? (
        /* --- CREATE PRODUCT FORM --- */
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-4xl mx-auto animate-fade-in">
          <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-slate-100">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Product Configuration</h2>
              <p className="text-sm text-slate-500 font-medium">Define the core parameters for this credit facility.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">Product Name</label>
                <input 
                  type="text" required
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-slate-900"
                  placeholder="e.g. Salary Advance, SME Business Loan"
                />
              </div>

              {/* INTEGRATED INTEREST RATE MATRIX DROPDOWN */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">Link to Interest Rate Profile</label>
                <div className="relative">
                  <Percent size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select 
                    required
                    value={formData.selected_profile_id} 
                    onChange={handleProfileSelect}
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-slate-700 appearance-none"
                  >
                    <option value="" disabled>-- Select an active Rate Profile --</option>
                    {rateProfiles.filter(r => r.status === 'Active').map(profile => (
                      <option key={profile.id} value={profile.id}>
                        {profile.profile_name} ({profile.base_rate}%)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Read-only preview badge that appears when a profile is selected */}
                {formData.selected_profile_id && (
                  <div className="mt-3 p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex flex-wrap gap-4 items-center animate-fade-in">
                     <div className="flex items-center space-x-2 text-sm text-blue-800 font-semibold bg-blue-100/50 px-3 py-1.5 rounded-lg">
                       <Calculator size={14} /> <span>{formData.interest_type}</span>
                     </div>
                     <div className="flex items-center space-x-2 text-sm text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                       <Percent size={14} /> <span>Base: {formData.interest_rate}%</span>
                     </div>
                     <div className="flex items-center space-x-2 text-sm text-red-600 font-semibold bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                       <ShieldAlert size={14} /> <span>Penalty: {formData.penalty_rate}%</span>
                     </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">Repayment Cycle</label>
                <select 
                  value={formData.repayment_cycle} 
                  onChange={e => setFormData({...formData, repayment_cycle: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-slate-700"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Minimum Amount (KES)</label>
                <div className="relative">
                  <Banknote size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="number" required
                    value={formData.min_amount} onChange={e => setFormData({...formData, min_amount: e.target.value})}
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono font-bold text-slate-900"
                    placeholder="1,000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Maximum Amount (KES)</label>
                <div className="relative">
                  <Banknote size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="number" required
                    value={formData.max_amount} onChange={e => setFormData({...formData, max_amount: e.target.value})}
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono font-bold text-slate-900"
                    placeholder="1,000,000"
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">Default Term Duration (Months)</label>
                <div className="relative">
                  <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="number" required
                    value={formData.default_term} onChange={e => setFormData({...formData, default_term: e.target.value})}
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono font-bold text-slate-900"
                    placeholder="1"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button 
                type="submit" disabled={isSubmitting}
                className="flex items-center space-x-2 bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all disabled:bg-slate-300 disabled:shadow-none"
              >
                {isSubmitting ? <><Loader2 size={20} className="animate-spin" /><span>Saving Product...</span></> : <><CheckCircle2 size={20} /><span>Publish Product</span></>}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* --- PRODUCT GRID VIEW --- */
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 bg-slate-100 rounded-3xl animate-pulse"></div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center bg-white p-16 rounded-3xl border border-dashed border-slate-300">
              <Package size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">No Loan Products Configured</h3>
              <p className="text-slate-500">Click "New Product" above to create your first credit facility.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative group hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col">
                  
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100/50">
                      <Package size={24} />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest border border-emerald-100">
                        {product.status || 'Active'}
                      </span>
                      <button className="text-slate-400 hover:text-slate-900 transition-colors p-1 outline-none focus:ring-2 focus:ring-blue-500/50 rounded-lg">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-black text-xl text-slate-900 mb-1 tracking-tight">{product.name}</h3>
                  <p className="text-slate-500 text-sm font-semibold mb-6 flex items-center">
                     <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-2"></span>
                     {product.interest_type || 'Custom Rate'}
                  </p>
                  
                  <div className="space-y-4 mb-8 flex-1">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Interest Rate</span>
                      <span className="font-black text-blue-600 text-lg">{product.interest_rate}%</span>
                    </div>
                    
                    <div className="flex justify-between items-center px-2">
                      <span className="text-sm font-semibold text-slate-500">Limits</span>
                      <span className="font-mono text-sm font-bold text-slate-800">
                        K {Number(product.min_amount).toLocaleString()} - {Number(product.max_amount).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center px-2">
                      <span className="text-sm font-semibold text-slate-500">Standard Term</span>
                      <span className="text-sm font-bold text-slate-800">{product.default_term} {product.repayment_cycle || 'Month'}(s)</span>
                    </div>
                  </div>

                  <button className="w-full py-3 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors outline-none focus:ring-2 focus:ring-blue-500/20">
                    Edit Configuration
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};