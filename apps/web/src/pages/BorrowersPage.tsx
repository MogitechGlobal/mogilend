import React, { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import { api } from '../lib/api';
import {
  Search, Plus, User, Phone, MapPin, Edit,
  ShieldCheck, Clock, XCircle, Eye, ShieldAlert,
  Loader2, CheckCircle2, FileUp, Activity, X,
  Briefcase, Filter, Building2, CalendarDays,
  Banknote, Trash2, Image as ImageIcon,
  Download
} from 'lucide-react';

export const BorrowersPage = ({ onNavigate }: { onNavigate?: (path: string) => void }) => {
  const user = useAuthStore((state: any) => state.user);
  const canManage = ['Super Admin', 'Lender Admin', 'Branch Manager'].includes(user?.role);

  const [borrowers, setBorrowers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING' | 'REJECTED'>('ALL');

  // Advanced Filters State
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const loadBorrowers = async () => {
    setIsLoading(true);
    try {
      const activeLenderId = user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e';
      const response = await api.get(`/borrowers?lender_id=${activeLenderId}`);
      setBorrowers(response.data);
    } catch (error) {
      console.error('Failed to fetch borrowers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadBorrowers();
  }, [user]);

  // Modal States
  const [viewModal, setViewModal] = useState<any | null>(null);
  const [detailsTab, setDetailsTab] = useState<'overview' | 'loans' | 'documents' | 'history' | 'kin' | 'guarantors'>('overview');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModal, setEditModal] = useState<any | null>(null);
  const [deleteModal, setDeleteModal] = useState<any | null>(null);

  // States for Next of Kin Forms
  const [kinForm, setKinForm] = useState({ full_name: '', relationship: '', phone_number: '', id_number: '' });
  const [isEditingKin, setIsEditingKin] = useState(false);
  const [selectedKinIdDoc, setSelectedKinIdDoc] = useState<File | null>(null);
  const [selectedKinIdDocBack, setSelectedKinIdDocBack] = useState<File | null>(null);
  const [selectedKinPassport, setSelectedKinPassport] = useState<File | null>(null);
  
  // States for Guarantor Forms
  const [guarForm, setGuarForm] = useState({ full_name: '', relationship: '', phone_number: '', id_number: '' });
  const [editingGuarantorId, setEditingGuarantorId] = useState<string | null>(null);
  const [selectedGuarIdDoc, setSelectedGuarIdDoc] = useState<File | null>(null);
  const [selectedGuarIdDocBack, setSelectedGuarIdDocBack] = useState<File | null>(null);
  const [selectedGuarPassport, setSelectedGuarPassport] = useState<File | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);

  // Reset Kin Edit state safely on tab or profile change
  useEffect(() => {
    setIsEditingKin(false);
    setKinForm({ full_name: '', relationship: '', phone_number: '', id_number: '' });
    setSelectedKinIdDoc(null);
    setSelectedKinIdDocBack(null);
    setSelectedKinPassport(null);
  }, [detailsTab, viewModal?.id]);

  // Document Upload & Delete States
  const [uploadDocModalOpen, setUploadDocModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [deleteDocModal, setDeleteDocModal] = useState<any | null>(null);
  const [uploadForm, setUploadForm] = useState<{ type: string; file: File | null }>({
    type: 'NATIONAL_ID_FRONT',
    file: null
  });

  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', national_id: '', phone_number: '',
    email: '', gender: 'MALE', address: '', branch_id: ''
  });

  const [editFormData, setEditFormData] = useState<any>({});

  const loadData = async () => {
    setIsLoading(true);
    try {
      const lenderId = user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e';
      const [borrowersRes, branchesRes] = await Promise.all([
        api.get(`/borrowers?lender_id=${lenderId}`),
        api.get(`/branches?lender_id=${lenderId}`)
      ]);
      setBorrowers(borrowersRes.data);
      setBranches(branchesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  useEffect(() => {
    if (viewModal) {
      const updatedBorrower = borrowers.find(b => b.id === viewModal.id);
      if (updatedBorrower) setViewModal(updatedBorrower);
    }
  }, [borrowers]);

  const filteredBorrowers = borrowers.filter(b => {
    const matchesTab = activeFilter === 'ALL' || (b.kyc_status || 'PENDING').toUpperCase() === activeFilter;
    const searchString = `${b.first_name} ${b.last_name} ${b.national_id} ${b.phone_number} ${b.email || ''}`.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());
    const matchesBranch = branchFilter === 'ALL' || b.branch_id === branchFilter;

    let matchesDate = true;
    if (dateRange.start) matchesDate = matchesDate && new Date(b.created_at) >= new Date(dateRange.start);
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && new Date(b.created_at) <= endDate;
    }

    return matchesTab && matchesSearch && matchesBranch && matchesDate;
  });

  const totalBorrowers = borrowers.length;
  const verifiedCount = borrowers.filter(b => (b.kyc_status || '').toUpperCase() === 'VERIFIED').length;
  const pendingCount = borrowers.filter(b => (b.kyc_status || 'PENDING').toUpperCase() === 'PENDING').length;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const payload = {
        ...formData,
        email: formData.email.trim() === '' ? undefined : formData.email.trim(),
        lender_id: user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e'
      };
      await api.post('/borrowers', payload);
      setCreateModalOpen(false);
      setFormData({ first_name: '', last_name: '', national_id: '', phone_number: '', email: '', gender: 'MALE', address: '', branch_id: '' });
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to register customer.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const payload = {
        ...editFormData,
        email: editFormData.email?.trim() === '' ? null : editFormData.email?.trim(),
      };
      await api.patch(`/borrowers/${editModal.id}`, payload);
      setEditModal(null);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update customer.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSubmit = async () => {
    setIsProcessing(true);
    try {
      await api.delete(`/borrowers/${deleteModal.id}`);
      setDeleteModal(null);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Deletion failed due to system rules.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file || !viewModal) return;

    setIsProcessing(true);
    try {
      const formPayload = new FormData();
      formPayload.append('file', uploadForm.file);
      formPayload.append('document_type', uploadForm.type);

      await api.post(`/borrowers/${viewModal.id}/documents`, formPayload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadForm({ type: 'NATIONAL_ID_FRONT', file: null });
      setUploadDocModalOpen(false);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to upload document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!viewModal || !deleteDocModal) return;
    setIsProcessing(true);
    try {
      await api.delete(`/borrowers/${viewModal.id}/documents/${deleteDocModal.id}`);
      setDeleteDocModal(null);
      setPreviewDoc(null);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const s = (status || 'PENDING').toUpperCase();
    if (s === 'VERIFIED') return <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-emerald-200"><ShieldCheck size={10} className="inline mr-1 sm:w-3 sm:h-3 -mt-0.5" /> Verified</span>;
    if (s === 'REJECTED') return <span className="bg-red-50 text-red-700 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-red-200"><XCircle size={10} className="inline mr-1 sm:w-3 sm:h-3 -mt-0.5" /> Rejected</span>;
    return <span className="bg-amber-50 text-amber-700 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-amber-200"><Clock size={10} className="inline mr-1 sm:w-3 sm:h-3 -mt-0.5" /> Pending KYC</span>;
  };

  const LoanStatusBadge = ({ status }: { status: string }) => {
    const s = (status || 'PENDING').toUpperCase();
    if (s === 'DISBURSED') return <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200">Active</span>;
    if (s === 'DEFAULTED') return <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-200">Defaulted</span>;
    if (s === 'COMPLETED') return <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-200">Completed</span>;
    return <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200">{s}</span>;
  };

  const refreshViewModal = async () => {
    loadBorrowers(); 
    const response = await api.get(`/borrowers?lender_id=${user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e'}`);
    const updatedBorrower = response.data.find((b: any) => b.id === viewModal?.id);
    if (updatedBorrower) setViewModal(updatedBorrower);
  };

  // --- NEXT OF KIN HANDLERS ---
  const handleEditKinClick = () => {
    setKinForm({
      full_name: viewModal.next_of_kin.full_name,
      relationship: viewModal.next_of_kin.relationship,
      phone_number: viewModal.next_of_kin.phone_number,
      id_number: viewModal.next_of_kin.id_number || ''
    });
    setSelectedKinIdDoc(null);
    setSelectedKinIdDocBack(null);
    setSelectedKinPassport(null);
    setIsEditingKin(true);
  };

  const handleSaveKin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      const formPayload = new FormData();
      Object.entries(kinForm).forEach(([key, value]) => formPayload.append(key, value as string));
      
      if (selectedKinIdDoc) formPayload.append('id_document', selectedKinIdDoc);
      if (selectedKinIdDocBack) formPayload.append('id_document_back', selectedKinIdDocBack);
      if (selectedKinPassport) formPayload.append('passport_photo', selectedKinPassport);

      await api.post(`/borrowers/${viewModal.id}/next-of-kin`, formPayload, { headers: { 'Content-Type': 'multipart/form-data' }});
      
      setSelectedKinIdDoc(null);
      setSelectedKinIdDocBack(null);
      setSelectedKinPassport(null);
      setIsEditingKin(false);
      setKinForm({ full_name: '', relationship: '', phone_number: '', id_number: '' });
      await refreshViewModal();
    } catch (error) { alert('Failed to save Next of Kin.'); } finally { setIsUploading(false); }
  };

  const handleDeleteKin = async () => {
    if (!window.confirm('Are you sure you want to remove the Next of Kin?')) return;
    try {
      await api.delete(`/borrowers/${viewModal.id}/next-of-kin`);
      setKinForm({ full_name: '', relationship: '', phone_number: '', id_number: '' });
      setIsEditingKin(false);
      await refreshViewModal();
    } catch (error) { alert('Failed to delete Next of Kin.'); }
  };

  // --- GUARANTOR HANDLERS ---
  const handleEditGuarantorClick = (g: any) => {
    setEditingGuarantorId(g.id);
    setGuarForm({ full_name: g.full_name, relationship: g.relationship, phone_number: g.phone_number, id_number: g.id_number || '' });
    setSelectedGuarIdDoc(null);
    setSelectedGuarIdDocBack(null);
    setSelectedGuarPassport(null);
  };

  const handleSaveGuarantor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      const formPayload = new FormData();
      Object.entries(guarForm).forEach(([key, value]) => formPayload.append(key, value as string));
      
      if (selectedGuarIdDoc) formPayload.append('id_document', selectedGuarIdDoc);
      if (selectedGuarIdDocBack) formPayload.append('id_document_back', selectedGuarIdDocBack);
      if (selectedGuarPassport) formPayload.append('passport_photo', selectedGuarPassport);

      if (editingGuarantorId) {
        await api.patch(`/borrowers/${viewModal.id}/guarantors/${editingGuarantorId}`, formPayload, { headers: { 'Content-Type': 'multipart/form-data' }});
      } else {
        await api.post(`/borrowers/${viewModal.id}/guarantors`, formPayload, { headers: { 'Content-Type': 'multipart/form-data' }});
      }

      setSelectedGuarIdDoc(null);
      setSelectedGuarIdDocBack(null);
      setSelectedGuarPassport(null);
      setEditingGuarantorId(null);
      setGuarForm({ full_name: '', relationship: '', phone_number: '', id_number: '' });
      await refreshViewModal();
    } catch (error) { alert('Failed to save Guarantor.'); } finally { setIsUploading(false); }
  };

  const handleDeleteGuarantor = async (gid: string) => {
    if (!window.confirm('Are you sure you want to remove this Guarantor?')) return;
    try {
      await api.delete(`/borrowers/${viewModal.id}/guarantors/${gid}`);
      if (editingGuarantorId === gid) {
        setEditingGuarantorId(null);
        setGuarForm({ full_name: '', relationship: '', phone_number: '', id_number: '' });
      }
      await refreshViewModal();
    } catch (error) { alert('Failed to delete Guarantor.'); }
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Customer Registry</h1>
          <p className="text-slate-500 font-medium mt-1">Manage borrower profiles, KYC verification, and interactions.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative group flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input
              type="text" placeholder="Search name, ID, or phone..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`p-2.5 border rounded-xl transition-colors outline-none flex items-center justify-center shadow-sm ${showAdvancedFilters || branchFilter !== 'ALL' || dateRange.start || dateRange.end
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              title="Advanced Filters"
            >
              <Filter size={18} />
            </button>

            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all outline-none"
            >
              <Plus size={18} /> <span className="hidden sm:inline">New Customer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-6 animate-fade-in grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 shadow-inner">
          <div className="md:col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center"><Building2 size={12} className="mr-1.5" /> Filter by Branch</label>
            <select
              value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              <option value="ALL">All Operating Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.location})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center"><CalendarDays size={12} className="mr-1.5" /> Date From</label>
            <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center"><CalendarDays size={12} className="mr-1.5" /> Date To</label>
            <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-blue-500 hover:-translate-y-1 transition-transform">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Customers</p>
            <h3 className="text-2xl font-black text-slate-900">{totalBorrowers}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center"><User size={20} /></div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-emerald-500 hover:-translate-y-1 transition-transform">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fully Verified</p>
            <h3 className="text-2xl font-black text-slate-900">{verifiedCount}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center"><ShieldCheck size={20} /></div>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-amber-400 hover:-translate-y-1 transition-transform">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending KYC</p>
            <h3 className="text-2xl font-black text-slate-900">{pendingCount}</h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center"><ShieldAlert size={20} /></div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">
        {['ALL', 'VERIFIED', 'PENDING', 'REJECTED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab as any)}
            className={`px-5 py-2 rounded-xl text-sm font-bold capitalize transition-all outline-none whitespace-nowrap ${activeFilter === tab
              ? 'bg-slate-800 text-white shadow-md'
              : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
          >
            {tab.toLowerCase()}
          </button>
        ))}
      </div>

      {/* Registry Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 animate-pulse">
            <Loader2 size={40} className="animate-spin mb-4 text-slate-300" />
            <p className="font-bold">Fetching customer registry...</p>
          </div>
        ) : filteredBorrowers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4"><Search size={28} /></div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No customers found</h3>
            <p className="text-slate-500 font-medium text-sm">Adjust your filters or register a new client.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[1050px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-widest font-black">
                  <th className="p-5 pl-6">Customer Details</th>
                  <th className="p-5">National ID</th>
                  <th className="p-5">Contact Info</th>
                  <th className="p-5">Branch</th>
                  <th className="p-5">Registration Date</th>
                  <th className="p-5 text-center">KYC Status</th>
                  <th className="p-5 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBorrowers.map((borrower) => (
                  <tr key={borrower.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-5 pl-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm border border-blue-100 shrink-0 uppercase">
                          {borrower.first_name?.[0]}{borrower.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{borrower.first_name} {borrower.last_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">UID: {borrower.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="font-mono text-sm font-bold text-slate-700">{borrower.national_id}</div>
                    </td>
                    <td className="p-5">
                      <div className="text-sm font-semibold text-slate-600">{borrower.phone_number}</div>
                      {borrower.email && <div className="text-xs text-slate-400 font-medium mt-0.5">{borrower.email}</div>}
                    </td>
                    <td className="p-5">
                      <div className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md inline-block uppercase tracking-wider border border-slate-200">
                        {borrower.branch?.name || 'Unassigned'}
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="text-sm font-semibold text-slate-700">{new Date(borrower.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">{new Date(borrower.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="p-5 text-center">
                      <StatusBadge status={borrower.kyc_status} />
                    </td>
                    <td className="p-5 text-right pr-6">
                      <div className="flex justify-end space-x-2 opacity-80 group-hover:opacity-100 transition-opacity">

                        <button
                          onClick={() => { setDetailsTab('overview'); setViewModal(borrower); }}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm outline-none" title="View Profile"
                        >
                          <Eye size={16} />
                        </button>

                        {canManage && (
                          <>
                            <button
                              onClick={() => {
                                setEditFormData({
                                  first_name: borrower.first_name, last_name: borrower.last_name,
                                  national_id: borrower.national_id, phone_number: borrower.phone_number,
                                  email: borrower.email || '', gender: borrower.gender || 'MALE',
                                  address: borrower.address || '', branch_id: borrower.branch_id || '',
                                  kyc_status: borrower.kyc_status || 'PENDING'
                                });
                                setEditModal(borrower);
                              }}
                              className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-colors shadow-sm outline-none" title="Edit Customer"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteModal(borrower)}
                              className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm outline-none" title="Delete Customer"
                            >
                              <Trash2 size={16} />
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

      {/* --- ACTION VIEW MODAL --- */}
      {viewModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setViewModal(null)}></div>

          <div className="bg-slate-50 w-full sm:max-w-4xl lg:max-w-5xl h-[95vh] sm:h-auto sm:max-h-[95vh] rounded-t-3xl sm:rounded-b-3xl sm:rounded-[2rem] shadow-2xl relative z-10 overflow-hidden animate-fade-in flex flex-col">

            <div className="bg-[#0B1121] px-5 sm:px-8 pt-6 sm:pt-10 pb-5 sm:pb-6 text-white relative shrink-0">
              <button onClick={() => setViewModal(null)} className="absolute top-4 sm:top-6 right-4 sm:right-6 text-slate-400 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full outline-none">
                <X size={20} />
              </button>

              <div className="flex flex-row items-center space-x-4 sm:space-x-5 mb-5 sm:mb-8 mt-1 sm:mt-0">
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-2xl sm:text-4xl border-2 sm:border-4 border-blue-500/30 uppercase shadow-xl shrink-0">
                  {viewModal.first_name?.[0]}{viewModal.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-1.5 sm:mb-3 truncate">{viewModal.first_name} {viewModal.last_name}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] sm:text-sm bg-white/10 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg border border-white/5">ID: {viewModal.national_id}</span>
                    <StatusBadge status={viewModal.kyc_status} />
                    <span className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest border ${viewModal.risk_score > 0 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                      Risk Score: {viewModal.risk_score || '0.0'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Glance Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
                <div className="bg-white/5 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10 flex flex-col justify-center">
                  <div className="flex items-center text-slate-400 mb-1 sm:mb-1.5"><Phone size={12} className="mr-1.5 sm:w-3.5 sm:h-3.5" /> <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Phone</span></div>
                  <p className="text-xs sm:text-base font-semibold truncate">{viewModal.phone_number}</p>
                </div>
                <div className="bg-white/5 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10 flex flex-col justify-center">
                  <div className="flex items-center text-slate-400 mb-1 sm:mb-1.5"><User size={12} className="mr-1.5 sm:w-3.5 sm:h-3.5" /> <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Gender</span></div>
                  <p className="text-xs sm:text-base font-semibold truncate">{viewModal.gender || 'Not Specified'}</p>
                </div>
                <div className="bg-white/5 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10 flex flex-col justify-center">
                  <div className="flex items-center text-slate-400 mb-1 sm:mb-1.5"><Building2 size={12} className="mr-1.5 sm:w-3.5 sm:h-3.5" /> <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Branch</span></div>
                  <p className="text-xs sm:text-base font-semibold truncate">{viewModal.branch?.name || 'Unassigned'}</p>
                </div>
                <div className="bg-white/5 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10 flex flex-col justify-center">
                  <div className="flex items-center text-slate-400 mb-1 sm:mb-1.5"><CalendarDays size={12} className="mr-1.5 sm:w-3.5 sm:h-3.5" /> <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Since</span></div>
                  <p className="text-xs sm:text-base font-semibold truncate">{new Date(viewModal.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* In-Modal Navigation Tabs (Slimmer on mobile) */}
            <div className="flex px-4 sm:px-8 bg-white border-b border-slate-200 shrink-0 overflow-x-auto custom-scrollbar shadow-sm z-10">
              <button onClick={() => setDetailsTab('overview')} className={`py-3 sm:py-4 px-3 sm:px-4 mr-2 border-b-2 font-bold text-xs sm:text-sm transition-colors outline-none whitespace-nowrap ${detailsTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Profile Overview</button>
              <button onClick={() => setDetailsTab('loans')} className={`py-3 sm:py-4 px-3 sm:px-4 mr-2 border-b-2 font-bold text-xs sm:text-sm transition-colors outline-none whitespace-nowrap flex items-center ${detailsTab === 'loans' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Loan History <span className="ml-1.5 sm:ml-2 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] sm:text-xs">{viewModal.loans?.length || 0}</span></button>
              <button onClick={() => setDetailsTab('documents')} className={`py-3 sm:py-4 px-3 sm:px-4 mr-2 border-b-2 font-bold text-xs sm:text-sm transition-colors outline-none whitespace-nowrap flex items-center ${detailsTab === 'documents' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>KYC Documents <span className="ml-1.5 sm:ml-2 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] sm:text-xs">{viewModal.documents?.length || 0}</span></button>
              <button onClick={() => setDetailsTab('kin')} className={`py-3 sm:py-4 px-3 sm:px-4 mr-2 border-b-2 font-bold text-xs sm:text-sm transition-colors outline-none whitespace-nowrap ${detailsTab === 'kin' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Next of Kin</button>
              <button onClick={() => setDetailsTab('guarantors')} className={`py-3 sm:py-4 px-3 sm:px-4 mr-2 border-b-2 font-bold text-xs sm:text-sm transition-colors outline-none whitespace-nowrap ${detailsTab === 'guarantors' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Guarantors</button>
              <button onClick={() => setDetailsTab('history')} className={`py-3 sm:py-4 px-3 sm:px-4 border-b-2 font-bold text-xs sm:text-sm transition-colors outline-none whitespace-nowrap ${detailsTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Interactions & Alerts</button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-8 overflow-y-auto bg-slate-50 flex-1">

              {/* TAB 1: OVERVIEW */}
              {detailsTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-center space-x-2 mb-5 sm:mb-6 text-slate-800">
                      <MapPin size={18} className="text-blue-500 sm:w-5 sm:h-5" />
                      <h3 className="font-black text-base sm:text-lg">Contact & Location</h3>
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 sm:pb-3">
                        <span className="text-slate-500 text-xs sm:text-sm font-medium">Primary Phone</span>
                        <span className="text-slate-900 font-bold text-xs sm:text-sm">{viewModal.phone_number}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 sm:pb-3">
                        <span className="text-slate-500 text-xs sm:text-sm font-medium">Email Address</span>
                        <span className="text-slate-900 font-bold text-xs sm:text-sm">{viewModal.email || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center pb-1">
                        <span className="text-slate-500 text-xs sm:text-sm font-medium">Physical Address</span>
                        <span className="text-slate-900 font-bold text-xs sm:text-sm text-right max-w-[150px] sm:max-w-[250px] truncate">{viewModal.address || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-center space-x-2 mb-5 sm:mb-6 text-slate-800">
                      <Briefcase size={18} className="text-blue-500 sm:w-5 sm:h-5" />
                      <h3 className="font-black text-base sm:text-lg">Professional Details</h3>
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 sm:pb-3">
                        <span className="text-slate-500 text-xs sm:text-sm font-medium">Employment Status</span>
                        <span className="text-slate-900 font-bold text-xs sm:text-sm">{viewModal.employment_status || 'Not Specified'}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 sm:pb-3">
                        <span className="text-slate-500 text-xs sm:text-sm font-medium">Income Range</span>
                        <span className="text-slate-400 text-xs sm:text-sm italic">Pending Update</span>
                      </div>
                      <div className="flex justify-between items-center pb-1">
                        <span className="text-slate-500 text-xs sm:text-sm font-medium">Industry</span>
                        <span className="text-slate-400 text-xs sm:text-sm italic">Pending Update</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: LOAN HISTORY */}
              {detailsTab === 'loans' && (
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[300px] flex flex-col">
                  {viewModal.loans && viewModal.loans.length > 0 ? (
                    <div className="overflow-x-auto w-full custom-scrollbar">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-widest font-black">
                            <th className="p-4 sm:p-5 pl-4 sm:pl-6">Loan ID</th>
                            <th className="p-4 sm:p-5 text-right">Principal</th>
                            <th className="p-4 sm:p-5 text-right">Balance</th>
                            <th className="p-4 sm:p-5 text-center">Interest</th>
                            <th className="p-4 sm:p-5">Applied Date</th>
                            <th className="p-4 sm:p-5 text-center pr-4 sm:pr-6">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {viewModal.loans.map((loan: any) => (
                            <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4 sm:p-5 pl-4 sm:pl-6 font-mono text-xs sm:text-sm font-bold text-slate-700">#{loan.id.substring(0, 8)}</td>
                              <td className="p-4 sm:p-5 text-right font-black text-sm text-slate-900">{Number(loan.principal_amount).toLocaleString()}</td>
                              <td className="p-4 sm:p-5 text-right font-bold text-sm text-amber-600">{Number(loan.outstanding_balance).toLocaleString()}</td>
                              <td className="p-4 sm:p-5 text-center font-semibold text-sm text-slate-500">{loan.interest_rate}%</td>
                              <td className="p-4 sm:p-5 text-xs sm:text-sm text-slate-600">{new Date(loan.created_at).toLocaleDateString()}</td>
                              <td className="p-4 sm:p-5 text-center pr-4 sm:pr-6"><LoanStatusBadge status={loan.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-1 py-16 text-center px-4">
                      <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4"><Banknote size={28} /></div>
                      <h3 className="text-lg font-bold text-slate-900 mb-1">No Loan History</h3>
                      <p className="text-slate-500 font-medium text-sm mb-6">This customer has not applied for any facilities yet.</p>
                      <button
                        onClick={() => { setViewModal(null); onNavigate && onNavigate('loan-application'); }}
                        className="px-5 py-2.5 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-colors outline-none text-sm sm:text-base"
                      >
                        Apply First Loan
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: KYC DOCUMENTS */}
              {detailsTab === 'documents' && (
                <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm min-h-[300px] flex flex-col">

                  <div className="flex flex-row justify-between items-center border-b border-slate-100 pb-4 mb-5 sm:mb-6">
                    <h3 className="font-black text-base sm:text-lg text-slate-900">KYC Records</h3>
                    <button
                      onClick={() => setUploadDocModalOpen(true)}
                      className="px-3 sm:px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg sm:rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center text-xs sm:text-sm outline-none"
                    >
                      <Plus size={14} className="mr-1 sm:w-4 sm:h-4" /> Add Photo
                    </button>
                  </div>

                  {viewModal.documents && viewModal.documents.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                      {viewModal.documents.map((doc: any) => (
                        <div key={doc.id} className="group border border-slate-200 rounded-2xl p-2 bg-slate-50 hover:bg-white hover:border-blue-500 hover:shadow-md transition-all text-center relative overflow-hidden">
                          <div onClick={() => setPreviewDoc(doc)} className="w-full h-24 sm:h-32 bg-slate-200 rounded-xl overflow-hidden mb-2 sm:mb-3 relative flex items-center justify-center cursor-pointer">
                            <img src={doc.file_url} alt="Document" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="text-white" size={24} />
                            </div>
                          </div>
                          <div className="px-1 sm:px-2 pb-1 flex justify-between items-end">
                            <div className="text-left overflow-hidden">
                              <p className="text-[10px] sm:text-xs font-bold text-slate-800 truncate" title={doc.document_type.replace(/_/g, ' ')}>
                                {doc.document_type.replace(/_/g, ' ')}
                              </p>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                                {new Date(doc.uploaded_at || doc.created_at || Date.now()).toLocaleDateString()}
                              </p>
                            </div>
                            {canManage && (
                              <button onClick={() => setDeleteDocModal(doc)} className="text-slate-400 hover:text-red-500 p-1 sm:p-1.5 transition-colors outline-none shrink-0" title="Delete Document">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center flex-1 py-12 text-center">
                      <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4"><ImageIcon size={28} /></div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">No Photos Uploaded</h3>
                      <p className="text-slate-500 text-xs sm:text-sm mb-6 max-w-sm mx-auto">Photos of National ID, Passport, or Business Licenses will appear here.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: NEXT OF KIN */}
              {detailsTab === 'kin' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-y-auto max-h-[600px] custom-scrollbar">
                    <h3 className="font-black text-lg mb-4 text-slate-800">Current Next of Kin</h3>
                    {viewModal.next_of_kin ? (
                      <div className={`p-4 border rounded-xl transition-all ${isEditingKin ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-black text-slate-900">{viewModal.next_of_kin.full_name} <span className="text-xs font-normal text-slate-500">({viewModal.next_of_kin.relationship})</span></p>
                            <p className="text-sm text-slate-600">{viewModal.next_of_kin.phone_number} | ID: {viewModal.next_of_kin.id_number || 'N/A'}</p>
                          </div>
                          <div className="flex space-x-1 opacity-80 hover:opacity-100">
                            <button onClick={handleEditKinClick} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors outline-none"><Edit size={16} /></button>
                            <button onClick={handleDeleteKin} className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors outline-none"><Trash2 size={16} /></button>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2 mt-3 overflow-x-auto pb-2 custom-scrollbar">
                          {viewModal.next_of_kin.document_url && (
                            <div className="flex-1 min-w-[100px] group relative">
                              <span className="text-[10px] font-bold text-slate-400 block mb-1">ID (Front)</span>
                              <div onClick={() => setPreviewDoc({ file_url: viewModal.next_of_kin.document_url, document_type: 'Next of Kin ID (Front)', created_at: viewModal.next_of_kin.created_at, is_readonly: true })} className="w-full h-24 bg-slate-200 rounded-lg overflow-hidden relative flex items-center justify-center cursor-pointer border border-slate-200">
                                <img src={viewModal.next_of_kin.document_url} alt="ID Front" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Eye className="text-white" size={24} /></div>
                              </div>
                            </div>
                          )}
                          {viewModal.next_of_kin.id_back_document_url && (
                            <div className="flex-1 min-w-[100px] group relative">
                              <span className="text-[10px] font-bold text-slate-400 block mb-1">ID (Back)</span>
                              <div onClick={() => setPreviewDoc({ file_url: viewModal.next_of_kin.id_back_document_url, document_type: 'Next of Kin ID (Back)', created_at: viewModal.next_of_kin.created_at, is_readonly: true })} className="w-full h-24 bg-slate-200 rounded-lg overflow-hidden relative flex items-center justify-center cursor-pointer border border-slate-200">
                                <img src={viewModal.next_of_kin.id_back_document_url} alt="ID Back" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Eye className="text-white" size={24} /></div>
                              </div>
                            </div>
                          )}
                          {viewModal.next_of_kin.passport_photo_url && (
                            <div className="flex-1 min-w-[100px] group relative">
                              <span className="text-[10px] font-bold text-slate-400 block mb-1">Passport</span>
                              <div onClick={() => setPreviewDoc({ file_url: viewModal.next_of_kin.passport_photo_url, document_type: 'Next of Kin Passport', created_at: viewModal.next_of_kin.created_at, is_readonly: true })} className="w-full h-24 bg-slate-200 rounded-lg overflow-hidden relative flex items-center justify-center cursor-pointer border border-slate-200">
                                <img src={viewModal.next_of_kin.passport_photo_url} alt="Passport" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Eye className="text-white" size={24} /></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm">No Next of Kin recorded.</p>
                    )}
                  </div>

                  {/* Add/Update Kin Form */}
                  {(!viewModal.next_of_kin || isEditingKin) && (
                    <form onSubmit={handleSaveKin} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-fit">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-black text-lg text-slate-800">{isEditingKin ? 'Edit Next of Kin' : 'Add Next of Kin'}</h3>
                        {isEditingKin && (
                          <button type="button" onClick={() => { setIsEditingKin(false); setKinForm({full_name:'', relationship:'', phone_number:'', id_number:''}); setSelectedKinIdDoc(null); setSelectedKinIdDocBack(null); setSelectedKinPassport(null); }} className="text-xs font-bold text-slate-400 hover:text-slate-600 outline-none">Cancel Edit</button>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        <input type="text" placeholder="Full Name" required value={kinForm.full_name} onChange={e => setKinForm({...kinForm, full_name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                        <input type="text" placeholder="Relationship (e.g., Sister, Father)" required value={kinForm.relationship} onChange={e => setKinForm({...kinForm, relationship: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                        <input type="text" placeholder="Phone Number" required value={kinForm.phone_number} onChange={e => setKinForm({...kinForm, phone_number: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                        <input type="text" placeholder="ID Number (Optional)" value={kinForm.id_number} onChange={e => setKinForm({...kinForm, id_number: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">ID (Front)</label>
                            <input type="file" accept="image/*" onChange={e => setSelectedKinIdDoc(e.target.files?.[0] || null)} className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">ID (Back)</label>
                            <input type="file" accept="image/*" onChange={e => setSelectedKinIdDocBack(e.target.files?.[0] || null)} className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 block mb-1">Passport Photo</label>
                            <input type="file" accept="image/*" onChange={e => setSelectedKinPassport(e.target.files?.[0] || null)} className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                          </div>
                        </div>

                        <button type="submit" disabled={isUploading} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 outline-none">
                          {isUploading ? <><Loader2 size={16} className="animate-spin inline mr-2" /> Saving...</> : (isEditingKin ? 'Update Record' : 'Save Next of Kin')}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* TAB: GUARANTORS (MULTIPLE ALLOWED WITH MULTIPLE PHOTOS EACH) */}
              {detailsTab === 'guarantors' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Existing Guarantors List */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-y-auto max-h-[700px] custom-scrollbar">
                    <h3 className="font-black text-lg mb-4 text-slate-800">Registered Guarantors ({viewModal.guarantors?.length || 0})</h3>
                    {viewModal.guarantors?.length > 0 ? (
                      <div className="space-y-4">
                        {viewModal.guarantors.map((g: any) => (
                          <div key={g.id} className={`p-4 border rounded-xl transition-all ${editingGuarantorId === g.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-black text-slate-900">{g.full_name} <span className="text-xs font-normal text-slate-500">({g.relationship})</span></p>
                                <p className="text-sm text-slate-600">{g.phone_number} | ID: {g.id_number || 'N/A'}</p>
                              </div>
                              <div className="flex space-x-1 opacity-80 hover:opacity-100">
                                <button onClick={() => handleEditGuarantorClick(g)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors outline-none"><Edit size={16} /></button>
                                <button onClick={() => handleDeleteGuarantor(g.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors outline-none"><Trash2 size={16} /></button>
                              </div>
                            </div>
                            
                            <div className="flex space-x-2 mt-3 overflow-x-auto pb-2 custom-scrollbar">
                              {g.document_url && (
                                <div className="flex-1 min-w-[100px] group relative">
                                  <span className="text-[10px] font-bold text-slate-400 block mb-1">ID (Front)</span>
                                  <div onClick={() => setPreviewDoc({ file_url: g.document_url, document_type: 'Guarantor ID (Front)', created_at: g.created_at, is_readonly: true })} className="w-full h-24 bg-slate-200 rounded-lg overflow-hidden relative flex items-center justify-center cursor-pointer border border-slate-200">
                                    <img src={g.document_url} alt="ID Front" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Eye className="text-white" size={24} /></div>
                                  </div>
                                </div>
                              )}
                              {g.id_back_document_url && (
                                <div className="flex-1 min-w-[100px] group relative">
                                  <span className="text-[10px] font-bold text-slate-400 block mb-1">ID (Back)</span>
                                  <div onClick={() => setPreviewDoc({ file_url: g.id_back_document_url, document_type: 'Guarantor ID (Back)', created_at: g.created_at, is_readonly: true })} className="w-full h-24 bg-slate-200 rounded-lg overflow-hidden relative flex items-center justify-center cursor-pointer border border-slate-200">
                                    <img src={g.id_back_document_url} alt="ID Back" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Eye className="text-white" size={24} /></div>
                                  </div>
                                </div>
                              )}
                              {g.passport_photo_url && (
                                <div className="flex-1 min-w-[100px] group relative">
                                  <span className="text-[10px] font-bold text-slate-400 block mb-1">Passport</span>
                                  <div onClick={() => setPreviewDoc({ file_url: g.passport_photo_url, document_type: 'Guarantor Passport', created_at: g.created_at, is_readonly: true })} className="w-full h-24 bg-slate-200 rounded-lg overflow-hidden relative flex items-center justify-center cursor-pointer border border-slate-200">
                                    <img src={g.passport_photo_url} alt="Passport" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Eye className="text-white" size={24} /></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm">No guarantors recorded.</p>
                    )}
                  </div>

                  {/* Add/Edit Guarantor Form */}
                  <form onSubmit={handleSaveGuarantor} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-fit">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-black text-lg text-slate-800">{editingGuarantorId ? 'Edit Guarantor' : 'Add Guarantor'}</h3>
                      {editingGuarantorId && (
                        <button type="button" onClick={() => { setEditingGuarantorId(null); setGuarForm({full_name:'', relationship:'', phone_number:'', id_number:''}); setSelectedGuarIdDoc(null); setSelectedGuarIdDocBack(null); setSelectedGuarPassport(null); }} className="text-xs font-bold text-slate-400 hover:text-slate-600 outline-none">Cancel Edit</button>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <input type="text" placeholder="Full Name" required value={guarForm.full_name} onChange={e => setGuarForm({...guarForm, full_name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                      <input type="text" placeholder="Relationship" required value={guarForm.relationship} onChange={e => setGuarForm({...guarForm, relationship: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                      <input type="text" placeholder="Phone Number" required value={guarForm.phone_number} onChange={e => setGuarForm({...guarForm, phone_number: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                      <input type="text" placeholder="ID Number (Optional)" value={guarForm.id_number} onChange={e => setGuarForm({...guarForm, id_number: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">ID (Front)</label>
                          <input type="file" accept="image/*" onChange={e => setSelectedGuarIdDoc(e.target.files?.[0] || null)} className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">ID (Back)</label>
                          <input type="file" accept="image/*" onChange={e => setSelectedGuarIdDocBack(e.target.files?.[0] || null)} className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">Passport Photo</label>
                          <input type="file" accept="image/*" onChange={e => setSelectedGuarPassport(e.target.files?.[0] || null)} className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                        </div>
                      </div>

                      <button type="submit" disabled={isUploading} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 outline-none">
                        {isUploading ? <><Loader2 size={16} className="animate-spin inline mr-2" /> Saving...</> : (editingGuarantorId ? 'Update Record' : 'Add Guarantor')}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 4: INTERACTION HISTORY */}
              {detailsTab === 'history' && (
                <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm text-center min-h-[300px] flex flex-col items-center justify-center">
                  <div className="py-10">
                    <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4"><Activity size={28} /></div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">No Recorded Interactions</h3>
                    <p className="text-slate-500 text-xs sm:text-sm">Calls, emails, SMS alerts, and HQ approvals will be tracked here.</p>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Footer actions */}
            <div className="bg-white p-4 sm:p-6 border-t border-slate-200 shrink-0 flex justify-between items-center">
              <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
                Profile ID: {viewModal.id.substring(0, 8)}
              </div>
              <div className="flex w-full sm:w-auto space-x-3">
                <button
                  onClick={() => setViewModal(null)}
                  className="flex-1 sm:flex-none px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors outline-none text-sm sm:text-base"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- UPLOAD DOCUMENT MODAL (IMAGE ONLY) --- */}
      {uploadDocModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setUploadDocModalOpen(false)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-fade-in border border-slate-200">

            <div className="bg-[#0B1121] p-5 sm:p-6 text-white flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/30">
                  <FileUp size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Attach Photo</h3>
                  <p className="text-blue-400/80 text-xs font-medium">Upload KYC file for {viewModal?.first_name}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleDocumentUpload} className="p-5 sm:p-8">
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Document Classification</label>
                  <select
                    required
                    value={uploadForm.type}
                    onChange={e => setUploadForm({ ...uploadForm, type: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-slate-900 text-sm"
                  >
                    <option value="NATIONAL_ID_FRONT">National ID (Front)</option>
                    <option value="NATIONAL_ID_BACK">National ID (Back)</option>
                    <option value="PASSPORT">Passport Photo</option>
                    <option value="KRA_PIN">KRA PIN Certificate (Photo)</option>
                    <option value="BUSINESS_LICENSE">Business License (Document)</option>
                    <option value="BUSINESS_SHOP_IMAGE">Business / Shop Image</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Select File (Image only)</label>
                  <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors">
                    <input
                      type="file"
                      required
                      accept="image/*"
                      onChange={e => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <ImageIcon size={32} className="mx-auto text-slate-400 mb-2" />
                    {uploadForm.file ? (
                      <p className="text-sm font-bold text-blue-600 truncate px-4">{uploadForm.file.name}</p>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-slate-700 mb-1">Click to browse or tap</p>
                        <p className="text-xs text-slate-500">JPG, PNG up to 5MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-8">
                <button type="button" onClick={() => setUploadDocModalOpen(false)} disabled={isProcessing} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors disabled:opacity-50 outline-none">Cancel</button>
                <button type="submit" disabled={isProcessing || !uploadForm.file} className="flex-[2] flex items-center justify-center space-x-2 bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-80 outline-none">
                  {isProcessing ? <><Loader2 size={18} className="animate-spin" /> <span>Uploading...</span></> : <><FileUp size={18} /><span>Secure Upload</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PREVIEW DOCUMENT MODAL LIGHTBOX (IMAGE ONLY) --- */}
      {previewDoc && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-0 sm:p-4 bg-slate-900/95 sm:bg-slate-900/90 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setPreviewDoc(null)}></div>

          <div className="relative z-10 w-full h-full sm:h-auto sm:max-w-4xl flex flex-col items-center">

            {/* Top Toolbar */}
            <div className="w-full flex justify-between items-center p-4 sm:mb-4 text-white bg-slate-900/50 sm:bg-transparent">
              <div className="truncate pr-4">
                <h3 className="font-black text-lg sm:text-xl truncate">{previewDoc.document_type.replace(/_/g, ' ')}</h3>
                <p className="text-xs sm:text-sm text-slate-300 font-mono mt-0.5">Uploaded: {new Date(previewDoc.uploaded_at || previewDoc.created_at || Date.now()).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
                {canManage && !previewDoc.is_readonly && (
                  <button
                    onClick={() => setDeleteDocModal(previewDoc)}
                    className="p-2 sm:px-4 sm:py-2 bg-red-500/20 text-red-400 hover:bg-red-500/40 hover:text-red-300 rounded-full sm:rounded-xl transition-colors outline-none flex items-center"
                    title="Delete Image"
                  >
                    <Trash2 size={18} className="sm:mr-2" /> <span className="hidden sm:inline font-bold text-sm">Delete</span>
                  </button>
                )}
                <a
                  href={previewDoc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 rounded-full sm:rounded-xl font-bold flex items-center transition-colors outline-none text-sm sm:text-base"
                  title="Download Image"
                >
                  <Download size={18} className="sm:mr-2" /> <span className="hidden sm:inline">Download</span>
                </a>
                <button onClick={() => setPreviewDoc(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors outline-none">
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Render Image Safely */}
            <div className="w-full flex-1 sm:bg-black/50 sm:rounded-2xl overflow-hidden sm:border border-white/10 flex items-center justify-center min-h-[30vh] sm:min-h-[50vh] p-2 sm:p-8">
              <img src={previewDoc.file_url} alt="Document Preview" className="max-w-full h-auto max-h-[85vh] sm:max-h-[80vh] object-contain sm:rounded-xl shadow-none sm:shadow-2xl" />
            </div>

          </div>
        </div>
      )}

      {/* --- DELETE DOCUMENT CONFIRMATION MODAL --- */}
      {deleteDocModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => !isProcessing && setDeleteDocModal(null)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm relative z-10 overflow-hidden animate-fade-in p-6 sm:p-8 text-center border border-slate-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner"><Trash2 size={28} /></div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">Delete Document?</h3>
            <p className="text-slate-500 text-sm mb-6">
              Are you sure you want to permanently delete the <strong>{deleteDocModal.document_type.replace(/_/g, ' ')}</strong> file? This action cannot be undone.
            </p>

            <div className="flex space-x-3">
              <button onClick={() => setDeleteDocModal(null)} disabled={isProcessing} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors disabled:opacity-50 outline-none">Cancel</button>
              <button onClick={handleDeleteDocument} disabled={isProcessing} className="flex-1 flex justify-center items-center py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all active:scale-[0.98] disabled:opacity-50 outline-none">
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CREATE BORROWER MODAL --- */}
      {createModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setCreateModalOpen(false)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden animate-fade-in border border-slate-200 flex flex-col max-h-[90vh]">

            <div className="bg-[#0B1121] p-4 sm:p-6 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/30">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Register New Customer</h3>
                  <p className="text-blue-400/80 text-xs font-medium">Create a profile for a new loan applicant.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-4 sm:p-8 overflow-y-auto flex-1 custom-scrollbar">

              <h6 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Personal Details</h6>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">First Name</label>
                  <input type="text" required value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-slate-900" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Last Name</label>
                  <input type="text" required value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-slate-900" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">National ID</label>
                  <input type="text" required value={formData.national_id} onChange={e => setFormData({ ...formData, national_id: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono font-bold text-slate-900" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Gender</label>
                  <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-slate-900">
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
              </div>

              <h6 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-t border-slate-100 pt-6">Contact & Location</h6>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Phone Number</label>
                  <input type="text" required value={formData.phone_number} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-slate-900" placeholder="+254 7XX..." />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Email Address (Optional)</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-slate-900" placeholder="e.g. client@email.com" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Allocated Branch</label>
                  <select
                    required
                    value={formData.branch_id}
                    onChange={e => setFormData({ ...formData, branch_id: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-slate-900"
                  >
                    <option value="" disabled>-- Select Database Branch --</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.location})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Physical Address (Optional)</label>
                  <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold text-slate-900" placeholder="e.g. Kilifi Town" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mt-8 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setCreateModalOpen(false)} disabled={isProcessing} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors disabled:opacity-50 outline-none">Cancel</button>
                <button type="submit" disabled={isProcessing || !formData.branch_id} className="flex-[2] flex items-center justify-center space-x-2 bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-80 outline-none">
                  {isProcessing ? <><Loader2 size={18} className="animate-spin" /> <span>Saving...</span></> : <><CheckCircle2 size={18} /><span>Save Profile</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT BORROWER MODAL --- */}
      {editModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setEditModal(null)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden animate-fade-in border border-slate-200 flex flex-col max-h-[90vh]">

            <div className="bg-[#0B1121] p-4 sm:p-6 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center border border-amber-500/30">
                  <Edit size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Edit Customer Details</h3>
                  <p className="text-amber-400/80 text-xs font-medium">Update profile information or modify KYC status.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="p-4 sm:p-8 overflow-y-auto flex-1 custom-scrollbar">

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                <div>
                  <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1">Administrative Action</label>
                  <span className="font-bold text-amber-900 text-sm">Update KYC Verification Status</span>
                </div>
                <select
                  value={editFormData.kyc_status} onChange={e => setEditFormData({ ...editFormData, kyc_status: e.target.value })}
                  className="w-full sm:w-auto p-2.5 bg-white border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-all font-black text-slate-900 text-sm"
                >
                  <option value="PENDING">PENDING KYC</option>
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="REJECTED">REJECTED (Deactivated)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">First Name</label>
                  <input type="text" required value={editFormData.first_name} onChange={e => setEditFormData({ ...editFormData, first_name: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-semibold text-slate-900" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Last Name</label>
                  <input type="text" required value={editFormData.last_name} onChange={e => setEditFormData({ ...editFormData, last_name: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-semibold text-slate-900" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">National ID</label>
                  <input type="text" required value={editFormData.national_id} onChange={e => setEditFormData({ ...editFormData, national_id: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-mono font-bold text-slate-900" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Gender</label>
                  <select value={editFormData.gender} onChange={e => setEditFormData({ ...editFormData, gender: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-semibold text-slate-900">
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Phone Number</label>
                  <input type="text" required value={editFormData.phone_number} onChange={e => setEditFormData({ ...editFormData, phone_number: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-semibold text-slate-900" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Email Address (Optional)</label>
                  <input type="email" value={editFormData.email} onChange={e => setEditFormData({ ...editFormData, email: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-semibold text-slate-900" />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Allocated Branch</label>
                  <select
                    required
                    value={editFormData.branch_id}
                    onChange={e => setEditFormData({ ...editFormData, branch_id: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-semibold text-slate-900"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5">Physical Address (Optional)</label>
                  <input type="text" value={editFormData.address} onChange={e => setEditFormData({ ...editFormData, address: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-semibold text-slate-900" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mt-8 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setEditModal(null)} disabled={isProcessing} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors disabled:opacity-50 outline-none">Cancel</button>
                <button type="submit" disabled={isProcessing} className="flex-[2] flex items-center justify-center space-x-2 bg-amber-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-amber-500/30 hover:bg-amber-600 active:scale-[0.98] transition-all disabled:opacity-80 outline-none">
                  {isProcessing ? <><Loader2 size={18} className="animate-spin" /> <span>Updating...</span></> : <><CheckCircle2 size={18} /><span>Save Changes</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SECURE DELETE CONFIRMATION MODAL --- */}
      {deleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setDeleteModal(null)}></div>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-fade-in p-6 sm:p-8 text-center border border-slate-200">
            <div className="w-16 sm:w-20 h-16 sm:h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-inner"><Trash2 size={32} /></div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">Delete Customer?</h3>
            <p className="text-slate-500 text-sm mb-4">
              Are you sure you want to permanently delete the profile for <strong>{deleteModal.first_name} {deleteModal.last_name}</strong>?
            </p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left mb-6">
              <p className="text-xs font-bold text-slate-600 leading-relaxed"><span className="text-red-500">Security Rule:</span> To preserve accounting integrity, the system will block this deletion if the customer has any active or historical loans. If blocked, you must edit the profile and mark their KYC status as <span className="text-slate-900 bg-slate-200 px-1 rounded">REJECTED</span> to deactivate them instead.</p>
            </div>

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <button onClick={() => setDeleteModal(null)} disabled={isProcessing} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors disabled:opacity-50 outline-none">Cancel</button>
              <button onClick={handleDeleteSubmit} disabled={isProcessing} className="flex-[1.5] flex justify-center items-center py-3.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all active:scale-[0.98] disabled:opacity-50 outline-none">
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};