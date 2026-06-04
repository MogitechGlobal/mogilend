import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import { 
  Megaphone, Plus, Search, Filter, Phone, Mail, 
  UserPlus, Loader2, CheckCircle2, TrendingUp, 
  AlertCircle, X, ShieldAlert, Download, MapPin, 
  User, Eye, Trash2, Calendar, FileText, Briefcase
} from 'lucide-react';

export const MarketingLeadsPage = () => {
  const user = useAuthStore((state: any) => state.user);
  
  // --- RAW DATA STATE ---
  const [leads, setLeads] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- FILTERS ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [filterBranch, setFilterBranch] = useState('ALL');
  const [filterOfficer, setFilterOfficer] = useState('ALL');

  // --- MODALS ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [viewLeadData, setViewLeadData] = useState<any>(null); // For slide-out
  
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [nationalId, setNationalId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const initialFormState = {
    first_name: '', last_name: '', phone_number: '', email: '', 
    source: 'Website', notes: '', assigned_to: '', branch_id: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const lenderId = user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e';
      const [leadsRes, usersRes, branchesRes] = await Promise.all([
        api.get(`/leads?lender_id=${lenderId}`),
        api.get(`/users?lender_id=${lenderId}`).catch(() => ({ data: [] })),
        api.get(`/branches?lender_id=${lenderId}`).catch(() => ({ data: [] }))
      ]);
      
      // FIXED: Defensive array extraction to ensure dropdowns always populate
      const extractedLeads = Array.isArray(leadsRes.data) ? leadsRes.data : (leadsRes.data?.data || []);
      const extractedUsers = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.data || []);
      const extractedBranches = Array.isArray(branchesRes.data) ? branchesRes.data : (branchesRes.data?.data || []);

      setLeads(extractedLeads);
      setBranches(extractedBranches);
      
      // Filter for actionable officers
      setOfficers(extractedUsers.filter((u: any) => 
        ['Loan Officer', 'Branch Manager'].includes(u.role?.name) || u.role_id === 4 || u.role_id === 3
      ));
    } catch (error) {
      console.error('Failed to load leads data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  // --- ACTIONS ---
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const payload = { 
        ...formData, 
        lender_id: user?.lender_id,
        assigned_to: formData.assigned_to === '' ? null : formData.assigned_to,
        branch_id: formData.branch_id === '' ? null : formData.branch_id
      };
      
      await api.post('/leads', payload);
      setIsAddModalOpen(false);
      setFormData(initialFormState);
      loadData();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Failed to create new lead.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/leads/${id}`, { status: newStatus });
      loadData();
      if (viewLeadData?.id === id) setViewLeadData({ ...viewLeadData, status: newStatus });
    } catch (error) {
      alert('Failed to update lead status');
    }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMsg('');
    try {
      await api.post(`/leads/${selectedLead.id}/convert`, { national_id: nationalId });
      setIsConvertModalOpen(false);
      setViewLeadData(null);
      setNationalId('');
      loadData();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Failed to convert lead. National ID might be in use.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this lead?")) return;
    try {
      await api.delete(`/leads/${id}`);
      setViewLeadData(null);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete lead.');
    }
  };

  // --- FILTERING & KPIS ---
  const filteredLeads = leads.filter(l => {
    const searchStr = `${l.first_name} ${l.last_name} ${l.phone_number} ${l.email || ''}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
    const matchesBranch = filterBranch === 'ALL' || l.branch_id === filterBranch;
    const matchesOfficer = filterOfficer === 'ALL' || l.assigned_to === filterOfficer;
    
    return matchesSearch && matchesStatus && matchesBranch && matchesOfficer;
  });

  const convertedCount = leads.filter(l => l.status === 'CONVERTED').length;
  const conversionRate = leads.length > 0 ? ((convertedCount / leads.length) * 100).toFixed(1) : 0;

  // Dynamic Modals Form Officers
  const formAvailableOfficers = formData.branch_id 
    ? officers.filter(o => o.branch_id === formData.branch_id) 
    : officers;

  // --- EXPORT ---
  const handleExportCSV = () => {
    if (filteredLeads.length === 0) return;
    const headers = ['Date Added', 'Prospect Name', 'Phone', 'Email', 'Source', 'Status', 'Assigned Officer', 'Branch'];
    const csvRows = filteredLeads.map(l => [
        new Date(l.created_at).toLocaleDateString(),
        `${l.first_name} ${l.last_name}`,
        l.phone_number,
        l.email || 'N/A',
        l.source || 'N/A',
        l.status,
        l.officer ? `${l.officer.first_name} ${l.officer.last_name}` : 'Unassigned',
        l.branch?.name || 'Unassigned'
    ]);
    const csvContent = [headers.join(','), ...csvRows.map(r => `"${r.join('","')}"`)].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Marketing_Leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const availableOfficers = officers.filter(o => filterBranch === 'ALL' ? true : o.branch_id === filterBranch);

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Marketing Leads</h1>
          <p className="text-slate-500 font-medium mt-1">Track pipeline prospects, assign officers, and convert to customers.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportCSV} disabled={filteredLeads.length === 0} className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl hover:bg-slate-50 shadow-sm outline-none disabled:opacity-50">
            <Download size={18} /> <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={() => { setErrorMsg(''); setIsAddModalOpen(true); }} className="flex items-center space-x-2 bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 outline-none">
            <Plus size={18} /> <span>New Lead</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-blue-500 hover:-translate-y-1 transition-transform">
          <div><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Pipeline</p><h3 className="text-3xl font-black text-slate-900">{leads.length}</h3></div>
          <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center"><Megaphone size={24} /></div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-emerald-500 hover:-translate-y-1 transition-transform">
          <div><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Converted</p><h3 className="text-3xl font-black text-slate-900">{convertedCount}</h3></div>
          <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center"><UserPlus size={24} /></div>
        </div>
        <div className="bg-[#0B1121] p-5 rounded-3xl shadow-lg flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp size={64} className="text-white" /></div>
          <div className="relative z-10"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Win Rate</p><h3 className="text-3xl font-black text-white">{conversionRate}%</h3></div>
        </div>
      </div>

      {/* Advanced Filters Bar */}
      <div className="bg-white p-4 rounded-t-3xl border-x border-t border-slate-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative w-full sm:w-80 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input type="text" placeholder="Search by name, phone, or email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium transition-all text-sm" />
            </div>

            <div className="relative w-full sm:w-48">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold text-slate-700 appearance-none cursor-pointer">
                    <option value="ALL">All Statuses</option>
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="QUALIFIED">Qualified</option>
                    <option value="LOST">Lost</option>
                    <option value="CONVERTED">Converted</option>
                </select>
            </div>

            <div className="relative w-full sm:w-48">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select value={filterBranch} onChange={(e) => { setFilterBranch(e.target.value); setFilterOfficer('ALL'); }} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold text-slate-700 appearance-none cursor-pointer">
                    <option value="ALL">All Branches</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
            </div>

            <div className="relative w-full sm:w-48">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select value={filterOfficer} onChange={e => setFilterOfficer(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold text-slate-700 appearance-none cursor-pointer">
                    <option value="ALL">All Officers</option>
                    {availableOfficers.map(o => <option key={o.id} value={o.id}>{o.first_name} {o.last_name}</option>)}
                </select>
            </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-b-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto custom-scrollbar w-full">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-slate-50/80 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-5 pl-6">Prospect Profile</th>
                <th className="p-5">Contact Details</th>
                <th className="p-5">Source & Assignment</th>
                <th className="p-5 text-center">Pipeline Status</th>
                <th className="p-5 text-right pr-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={5} className="py-16 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" /> Loading leads...</td></tr>
              ) : filteredLeads.length === 0 ? (
                 <tr>
                   <td colSpan={5} className="py-16 text-center">
                     <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400"><Megaphone size={28} /></div>
                     <h3 className="text-slate-900 font-bold text-lg">No leads found</h3>
                     <p className="text-slate-500 text-sm mt-1">Adjust filters or create a new prospect.</p>
                   </td>
                 </tr>
              ) : (
                filteredLeads.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-5 pl-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm uppercase shrink-0 border border-blue-100">
                          {lead.first_name[0]}{lead.last_name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm mb-0.5">{lead.first_name} {lead.last_name}</p>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center"><Calendar size={10} className="mr-1"/> Added {new Date(lead.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <p className="text-xs font-bold text-slate-700 flex items-center mb-1"><Phone size={12} className="mr-1.5 text-slate-400"/> {lead.phone_number}</p>
                      {lead.email && <p className="text-[11px] font-medium text-slate-500 flex items-center"><Mail size={12} className="mr-1.5 text-slate-400"/> {lead.email}</p>}
                    </td>
                    <td className="p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 bg-slate-100 px-2 py-0.5 rounded inline-block mb-1.5 border border-slate-200">{lead.source}</p>
                      <p className="text-[11px] font-bold text-slate-500 flex items-center">
                        <User size={12} className="mr-1 text-slate-400"/> {lead.officer ? `${lead.officer.first_name} ${lead.officer.last_name}` : 'Unassigned'}
                      </p>
                    </td>
                    <td className="p-5 text-center">
                      <select 
                        value={lead.status} 
                        disabled={lead.status === 'CONVERTED'}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer border shadow-sm transition-colors ${
                          lead.status === 'NEW' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' :
                          lead.status === 'CONVERTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 opacity-80' :
                          lead.status === 'LOST' ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : 
                          'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        <option value="NEW">New Lead</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="QUALIFIED">Qualified</option>
                        <option value="LOST">Lost / Dropped</option>
                        <option value="CONVERTED" disabled>Converted</option>
                      </select>
                    </td>
                    <td className="p-5 text-right pr-6">
                      <div className="flex justify-end space-x-2">
                        <button onClick={() => setViewLeadData(lead)} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-lg text-xs font-bold transition-colors outline-none shadow-sm flex items-center">
                          <Eye size={14} className="mr-1.5" /> View
                        </button>
                        {lead.status !== 'CONVERTED' && (
                          <button onClick={() => { setSelectedLead(lead); setIsConvertModalOpen(true); }} className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold transition-colors outline-none shadow-sm flex items-center">
                            Convert
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD NEW LEAD MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setIsAddModalOpen(false)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden animate-fade-in border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="bg-[#0B1121] p-6 text-white shrink-0 flex items-center space-x-3">
              <Megaphone className="text-blue-400" size={24} />
              <div>
                <h3 className="font-black text-xl tracking-tight">Add New Lead</h3>
                <p className="text-blue-400/80 text-xs font-medium mt-0.5">Manually enter a prospect into the sales pipeline.</p>
              </div>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
              <form id="add-lead-form" onSubmit={handleCreateLead} className="space-y-6">
                {errorMsg && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center"><ShieldAlert size={18} className="mr-2 shrink-0" /> {errorMsg}</div>}
                
                <h6 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Prospect Details</h6>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">First Name *</label>
                    <input type="text" required value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Last Name *</label>
                    <input type="text" required value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Phone Number *</label>
                    <div className="relative"><Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" required value={formData.phone_number} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900" /></div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Email Address</label>
                    <div className="relative"><Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900" /></div>
                  </div>
                </div>

                <h6 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 pt-4 border-t border-slate-100">Assignment & Tracking</h6>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Lead Source</label>
                    <select value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900 appearance-none">
                      <option value="Website">Website</option>
                      <option value="Walk-in">Walk-in</option>
                      <option value="Referral">Referral</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Field Agent">Field Agent</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Branch Assign</label>
                    <select value={formData.branch_id} onChange={e => {
                        setFormData({ ...formData, branch_id: e.target.value, assigned_to: '' }); // Reset officer if branch changes
                    }} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900 appearance-none">
                      <option value="">-- Optional --</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Officer Assign</label>
                    <select value={formData.assigned_to} onChange={e => setFormData({ ...formData, assigned_to: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900 appearance-none">
                      <option value="">-- Optional --</option>
                      {formAvailableOfficers.map(o => <option key={o.id} value={o.id}>{o.first_name} {o.last_name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Internal Notes / Context</label>
                  <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-900 resize-none" placeholder="Add initial discussion points..." />
                </div>
              </form>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0 flex space-x-3">
              <button type="button" onClick={() => setIsAddModalOpen(false)} disabled={isProcessing} className="flex-1 py-3.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors">Cancel</button>
              <button form="add-lead-form" type="submit" disabled={isProcessing} className="flex-[2] flex items-center justify-center space-x-2 bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all">
                {isProcessing ? <><Loader2 size={18} className="animate-spin" /> <span>Saving...</span></> : <><CheckCircle2 size={18} /><span>Add Prospect to Pipeline</span></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- LEAD DETAILS / VIEW MODAL (SLIDE OUT) --- */}
      {viewLeadData && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewLeadData(null)}></div>
          <div className="bg-white w-full max-w-md h-full relative z-10 shadow-2xl flex flex-col animate-fade-in translate-x-0 border-l border-slate-200">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-[#0B1121] text-white">
              <div className="flex items-center space-x-3">
                <Megaphone className="text-blue-400" size={24} />
                <h2 className="text-xl font-black tracking-tight">Lead Dossier</h2>
              </div>
              <button onClick={() => setViewLeadData(null)} className="text-slate-400 hover:text-white transition-colors outline-none"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
              {/* Profile Card */}
              <div className="text-center pb-6 border-b border-slate-200 relative">
                {viewLeadData.status !== 'CONVERTED' && (
                  <button onClick={() => handleDelete(viewLeadData.id)} className="absolute top-0 right-0 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors outline-none">
                    <Trash2 size={18} />
                  </button>
                )}
                <div className="w-20 h-20 bg-blue-100 rounded-2xl mx-auto mb-4 flex items-center justify-center text-blue-600 font-black text-2xl shadow-inner border border-blue-200 uppercase">
                  {viewLeadData.first_name[0]}{viewLeadData.last_name[0]}
                </div>
                <h3 className="text-xl font-black text-slate-900">{viewLeadData.first_name} {viewLeadData.last_name}</h3>
                <p className="text-sm font-medium text-slate-500 font-mono mt-1">LID: {viewLeadData.id.substring(0,8)}</p>
                <div className="mt-4 flex justify-center space-x-2">
                  <select 
                      value={viewLeadData.status} 
                      disabled={viewLeadData.status === 'CONVERTED'}
                      onChange={(e) => handleStatusChange(viewLeadData.id, e.target.value)}
                      className={`px-3 py-1.5 text-xs font-black uppercase tracking-widest rounded-full border outline-none cursor-pointer ${
                        viewLeadData.status === 'NEW' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                        viewLeadData.status === 'CONVERTED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 opacity-80' :
                        viewLeadData.status === 'LOST' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                      }`}
                    >
                      <option value="NEW">New Lead</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="QUALIFIED">Qualified</option>
                      <option value="LOST">Lost / Dropped</option>
                      <option value="CONVERTED" disabled>Converted</option>
                  </select>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Contact Information</h4>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                  <div className="p-4 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 flex items-center"><Phone size={14} className="mr-2"/> Phone</span>
                    <span className="text-sm font-bold text-slate-900">{viewLeadData.phone_number}</span>
                  </div>
                  <div className="p-4 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 flex items-center"><Mail size={14} className="mr-2"/> Email</span>
                    <span className="text-sm font-bold text-slate-900">{viewLeadData.email || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Source & Assignment */}
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Acquisition & Routing</h4>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                  <div className="p-4 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Source</span>
                    <span className="text-xs font-black uppercase tracking-wider bg-slate-100 px-2 py-1 rounded text-slate-700">{viewLeadData.source}</span>
                  </div>
                  <div className="p-4 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Date Logged</span>
                    <span className="text-sm font-medium text-slate-900">{new Date(viewLeadData.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="p-4 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Branch</span>
                    <span className="text-sm font-bold text-slate-900 flex items-center"><MapPin size={14} className="mr-1.5 text-slate-400"/> {viewLeadData.branch?.name || 'Unassigned'}</span>
                  </div>
                  <div className="p-4 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Officer</span>
                    <span className="text-sm font-bold text-slate-900 flex items-center"><User size={14} className="mr-1.5 text-slate-400"/> {viewLeadData.officer ? `${viewLeadData.officer.first_name} ${viewLeadData.officer.last_name}` : 'Unassigned'}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Internal Notes</h4>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  {viewLeadData.notes ? (
                    <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap">{viewLeadData.notes}</p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No notes were provided for this lead.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-200 flex gap-3">
              <button onClick={() => setViewLeadData(null)} className="flex-1 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors outline-none">Close</button>
              {viewLeadData.status !== 'CONVERTED' && (
                <button onClick={() => { setSelectedLead(viewLeadData); setIsConvertModalOpen(true); }} className="flex-[2] py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 transition-all outline-none">
                  Convert to Borrower
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- CONVERT TO BORROWER MODAL --- */}
      {isConvertModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setIsConvertModalOpen(false)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-fade-in border border-slate-200">
            <div className="bg-[#0B1121] p-6 text-white shrink-0 flex items-center space-x-3">
              <UserPlus className="text-emerald-400" size={24} />
              <div>
                <h3 className="font-black text-xl tracking-tight">Convert to Borrower</h3>
              </div>
            </div>
            <form onSubmit={handleConvert} className="p-8">
              <p className="text-sm text-slate-600 font-medium mb-6 leading-relaxed">
                Converting <strong className="text-slate-900 font-black">{selectedLead?.first_name} {selectedLead?.last_name}</strong> will officially move them into the core banking system. A verifiable National ID is required.
              </p>
              
              {errorMsg && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center"><ShieldAlert size={18} className="mr-2 shrink-0"/> {errorMsg}</div>}
              
              <div className="mb-8">
                <label className="text-xs font-bold text-slate-700 block mb-1.5">National ID Number *</label>
                <div className="relative">
                  <FileText size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" required value={nationalId} onChange={e => setNationalId(e.target.value)} className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900" placeholder="e.g. 30123456" />
                </div>
              </div>
              
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsConvertModalOpen(false)} disabled={isProcessing} className="flex-1 py-3.5 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" disabled={isProcessing} className="flex-[2] py-3.5 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2">
                  {isProcessing ? <><Loader2 size={18} className="animate-spin" /><span>Processing...</span></> : <><CheckCircle2 size={18} /><span>Execute Conversion</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};