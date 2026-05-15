import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import { 
  Building2, Plus, Mail, Phone, FileText, 
  MapPin, Loader2, CheckCircle2, ShieldAlert, 
  Server, Search, ShieldCheck
} from 'lucide-react';

export const SystemConfigPage = () => {
  const user = useAuthStore((state: any) => state.user);
  
  const [lenders, setLenders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    tax_pin: '',
    registration_number: '',
    location: ''
  });

  const loadLenders = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/lenders');
      setLenders(response.data);
    } catch (error: any) {
      console.error('Failed to fetch lenders:', error);
      if (error.response?.status === 403) {
        setErrorMsg('You do not have Super Admin privileges to view this area.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'Super Admin') {
      loadLenders();
    } else {
      setIsLoading(false);
      setErrorMsg('Access Denied: Super Admin privileges required.');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMsg('');

    try {
      await api.post('/lenders', formData);
      setIsModalOpen(false);
      loadLenders(); // Refresh table
      setFormData({ name: '', email: '', phone: '', tax_pin: '', registration_number: '', location: '' }); // Reset
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Failed to onboard new institution.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredLenders = lenders.filter(l => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Security Block: If not Super Admin, show access denied
  if (user?.role !== 'Super Admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fade-in">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert size={40} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Access Restricted</h2>
        <p className="text-slate-500 font-medium max-w-md">System configuration and tenant management are restricted to platform owners (Super Admins) only.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-10">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">SaaS Tenant Management</h1>
          <p className="text-slate-500 font-medium mt-1">Manage platform institutions, billing, and system configurations.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all outline-none focus:ring-4 focus:ring-blue-500/30"
        >
          <Plus size={18} />
          <span>Onboard Institution</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-blue-500">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Institutions</p>
            <h3 className="text-3xl font-black text-slate-900">{lenders.length}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center"><Building2 size={24} /></div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">System Status</p>
            <h3 className="text-xl font-black text-emerald-600 flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse mr-2"></span> Operational</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center"><Server size={24} /></div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-slate-800">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Global Branches</p>
            <h3 className="text-3xl font-black text-slate-900">
              {lenders.reduce((acc, lender) => acc + (lender.branches?.length || 0), 0)}
            </h3>
          </div>
          <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center"><MapPin size={24} /></div>
        </div>
      </div>

      {/* Lenders Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <div className="relative group w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" placeholder="Search registered institutions..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 animate-pulse">
            <Loader2 size={40} className="animate-spin mb-4 text-slate-300" />
            <p className="font-bold">Fetching tenant registry...</p>
          </div>
        ) : filteredLenders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4"><Building2 size={28} /></div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No institutions found</h3>
            <p className="text-slate-500 font-medium text-sm">Click "Onboard Institution" to register a new tenant.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                  <th className="p-5 pl-6">Institution Name</th>
                  <th className="p-5">Contact Details</th>
                  <th className="p-5 text-center">Branches</th>
                  <th className="p-5 text-center">Status</th>
                  <th className="p-5 text-right pr-6">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLenders.map((lender) => (
                  <tr key={lender.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-5 pl-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm uppercase border border-blue-100 shrink-0">
                          {lender.name.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{lender.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">PIN: {lender.tax_pin || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center text-xs font-medium text-slate-600 mb-1">
                        <Mail size={12} className="mr-1.5 text-slate-400" /> {lender.email}
                      </div>
                      <div className="flex items-center text-xs font-medium text-slate-600">
                        <Phone size={12} className="mr-1.5 text-slate-400" /> {lender.phone}
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 w-8 h-8 rounded-lg font-bold text-xs border border-slate-200">
                        {lender.branches?.length || 0}
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200/50">
                        <ShieldCheck size={12} className="mr-1" /> {lender.status}
                      </span>
                    </td>
                    <td className="p-5 text-right pr-6 text-sm font-medium text-slate-500">
                      {new Date(lender.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric'})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- ONBOARDING MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setIsModalOpen(false)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden animate-fade-in border border-slate-200 flex flex-col max-h-[90vh]">
            
            <div className="bg-[#0B1121] p-6 text-white shrink-0">
              <h3 className="font-black text-xl tracking-tight">Onboard New Institution</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Register a new microfinance tenant onto the platform.</p>
            </div>

            <div className="overflow-y-auto custom-scrollbar p-8">
              {errorMsg && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-bold flex items-center">
                  <ShieldAlert size={18} className="mr-2 shrink-0" /> {errorMsg}
                </div>
              )}

              <form id="onboard-form" onSubmit={handleSubmit} className="space-y-6">
                
                {/* Organization Details */}
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Organization Details</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">Registered Name *</label>
                      <div className="relative">
                        <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" required
                          value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-slate-900"
                          placeholder="e.g. Acme Microfinance Ltd"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1.5">Official Email *</label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="email" required
                            value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-slate-900"
                            placeholder="info@acme.com"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1.5">Contact Phone *</label>
                        <div className="relative">
                          <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text" required
                            value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-slate-900"
                            placeholder="254700000000"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legal & Compliance */}
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Legal & Compliance</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">KRA PIN</label>
                      <div className="relative">
                        <FileText size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          value={formData.tax_pin} onChange={e => setFormData({...formData, tax_pin: e.target.value})}
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-slate-900 uppercase"
                          placeholder="P000000000A"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">Reg. Number (CR12)</label>
                      <div className="relative">
                        <FileText size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          value={formData.registration_number} onChange={e => setFormData({...formData, registration_number: e.target.value})}
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-slate-900 uppercase"
                          placeholder="PVT-XXXXXX"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* HQ Location */}
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Default Branch (HQ)</h4>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">HQ Location / City *</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" required
                        value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-slate-900"
                        placeholder="Nairobi CBD"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 font-medium bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <Server size={12} className="inline mr-1 text-slate-400"/>
                    Saving this form will automatically generate the root tenant profile and their Headquarters branch in the database.
                  </p>
                </div>

              </form>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0 flex space-x-3">
              <button type="button" onClick={() => setIsModalOpen(false)} disabled={isProcessing} className="flex-1 py-3.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 outline-none">Cancel</button>
              <button form="onboard-form" type="submit" disabled={isProcessing} className="flex-[2] flex items-center justify-center space-x-2 bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-80 outline-none">
                {isProcessing ? <><Loader2 size={18} className="animate-spin" /> <span>Provisioning Tenant...</span></> : <><CheckCircle2 size={18} /><span>Complete Registration</span></>}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};