import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import { 
    Loader2, ShieldCheck, Search, UserCircle, 
    Clock, ShieldAlert, Activity, Database, 
    Filter, Download, Calendar, FileJson, X,
    Terminal
} from 'lucide-react';

export const AuditLedgerPage = () => {
    const user = useAuthStore((state: any) => state.user);
    
    // Server State
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);
    
    // Advanced Filters State
    const [filterRisk, setFilterRisk] = useState<'ALL' | 'HIGH_RISK' | 'STANDARD'>('ALL');
    const [dateFilter, setDateFilter] = useState('ALL');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    // Payload Modal State
    const [selectedLog, setSelectedLog] = useState<any>(null);

    useEffect(() => {
        const fetchLogs = async () => {
            setIsLoading(true);
            try {
                const res = await api.get(`/audit/ledger?page=${page}&search=${searchQuery}`);
                setLogs(res.data.data);
                setTotalPages(res.data.meta.last_page);
                setTotalLogs(res.data.meta.total);
            } catch (err) {
                console.error('Failed to load audit ledger:', err);
            } finally {
                setIsLoading(false);
            }
        };
        const timeoutId = setTimeout(() => fetchLogs(), 300);
        return () => clearTimeout(timeoutId);
    }, [page, searchQuery]);

    const getActionRisk = (action: string) => {
        const act = action.toUpperCase();
        if (act.includes('SUSPEND') || act.includes('DELETE') || act.includes('IMPERSONATE') || act.includes('REJECT')) return 'HIGH_RISK';
        if (act.includes('UPDATE') || act.includes('TRANSFER') || act.includes('EDIT')) return 'MEDIUM_RISK';
        return 'STANDARD';
    };

    const getActionStyle = (action: string) => {
        const risk = getActionRisk(action);
        if (risk === 'HIGH_RISK') return 'bg-rose-50 text-rose-700 border-rose-200';
        if (risk === 'MEDIUM_RISK') return 'bg-amber-50 text-amber-700 border-amber-200';
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    };

    // --- ADVANCED CLIENT-SIDE FILTERING ---
    const filteredLogs = useMemo(() => {
        let result = logs;

        // 1. Filter by Risk
        if (filterRisk !== 'ALL') {
            const isHighRisk = filterRisk === 'HIGH_RISK';
            result = result.filter(log => (getActionRisk(log.action) === 'HIGH_RISK') === isHighRisk);
        }

        // 2. Filter by Date Range
        if (dateFilter !== 'ALL') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            result = result.filter(log => {
                const logDate = new Date(log.created_at);
                switch (dateFilter) {
                    case 'TODAY': return logDate >= today;
                    case 'YESTERDAY':
                        const yesterdayStart = new Date(today);
                        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
                        return logDate >= yesterdayStart && logDate < today;
                    case 'THIS_WEEK':
                        const weekStart = new Date(today);
                        weekStart.setDate(today.getDate() - today.getDay());
                        return logDate >= weekStart;
                    case 'THIS_MONTH':
                        return logDate >= new Date(now.getFullYear(), now.getMonth(), 1);
                    case 'CUSTOM':
                        if (customStartDate && customEndDate) {
                            const start = new Date(customStartDate);
                            const end = new Date(customEndDate);
                            end.setHours(23, 59, 59, 999);
                            return logDate >= start && logDate <= end;
                        }
                        return true;
                    default: return true;
                }
            });
        }
        return result;
    }, [logs, filterRisk, dateFilter, customStartDate, customEndDate]);

    // --- Derived Metrics ---
    const highRiskCount = filteredLogs.filter(log => getActionRisk(log.action) === 'HIGH_RISK').length;
    const uniqueAdmins = new Set(filteredLogs.map(log => log.user?.email).filter(Boolean)).size;

    // --- EXPORT CSV FUNCTION ---
    const handleExportCSV = () => {
        if (filteredLogs.length === 0) return;
        const headers = ['Timestamp', 'Operator Email', 'Entity Type', 'Action', 'Risk Level', 'JSON Details'];
        const csvRows = filteredLogs.map(log => {
            const timestamp = new Date(log.created_at).toLocaleString().replace(/,/g, ''); 
            const email = log.user?.email || 'SYSTEM AUTOMATION';
            const riskLevel = getActionRisk(log.action).replace('_', ' ');
            const safeDetails = `"${JSON.stringify(log.details).replace(/"/g, '""')}"`; 
            return [timestamp, email, log.entity_type, log.action, riskLevel, safeDetails];
        });
        const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Security_Audit_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (user?.role !== 'Super Admin' && user?.role !== 'Lender Admin') {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fade-in">
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6"><ShieldAlert size={40} /></div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Security Clearance Required</h2>
                <p className="text-slate-500 font-medium max-w-md">The Master Audit Ledger is strictly restricted to system administrators.</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto animate-fade-in pb-10">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center">
                        <Terminal size={28} className="mr-3 text-slate-700" /> Master Audit Ledger
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">
                        Immutable read-only ledger tracking all administrative actions, configurations, and access modifications.
                    </p>
                </div>
            </div>

            {/* --- Bento Box Analytics Grid --- */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between group hover:-translate-y-1 transition-all relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex items-center justify-between mb-3 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                            <Database className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 text-right leading-tight">Total<br/>Records</span>
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-2xl font-black text-slate-900 tracking-tight truncate">{totalLogs.toLocaleString()}</h4>
                        <p className="text-xs text-slate-500 font-medium mt-1">Lifetime actions logged</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between group hover:-translate-y-1 transition-all relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-50 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex items-center justify-between mb-3 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
                            <ShieldAlert className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 text-right leading-tight">High Risk<br/>(Current View)</span>
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-2xl font-black text-slate-900 tracking-tight truncate">{highRiskCount}</h4>
                        <p className="text-xs text-slate-500 font-medium mt-1">Suspensions & Impersonations</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between group hover:-translate-y-1 transition-all relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex items-center justify-between mb-3 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                            <Activity className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 text-right leading-tight">Active<br/>Admins</span>
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-2xl font-black text-slate-900 tracking-tight truncate">{uniqueAdmins}</h4>
                        <p className="text-xs text-slate-500 font-medium mt-1">Unique operators in view</p>
                    </div>
                </div>
            </div>

            {/* --- Main Table Container --- */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
                
                {/* Advanced Toolbar */}
                <div className="p-4 md:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    
                    <div className="flex flex-wrap items-center gap-3">
                        
                        {/* RISK FILTER */}
                        <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest hidden sm:inline">Risk:</span>
                        </div>
                        <div className="flex gap-1.5 pr-3 border-r border-slate-200">
                            {['ALL', 'HIGH_RISK', 'STANDARD'].map((risk) => (
                                <button
                                    key={risk}
                                    onClick={() => setFilterRisk(risk as any)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                        filterRisk === risk 
                                            ? 'bg-slate-800 text-white shadow-sm' 
                                            : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    {risk.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                        {/* DATE FILTER */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 pl-1 pr-3 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
                                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                <select 
                                    className="text-[10px] font-black text-slate-700 bg-transparent outline-none cursor-pointer uppercase tracking-widest"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                >
                                    <option value="ALL">All Time</option>
                                    <option value="TODAY">Today</option>
                                    <option value="YESTERDAY">Yesterday</option>
                                    <option value="THIS_WEEK">This Week</option>
                                    <option value="THIS_MONTH">This Month</option>
                                    <option value="CUSTOM">Custom Range</option>
                                </select>
                            </div>
                            
                            {/* Custom Date Range Inputs */}
                            {dateFilter === 'CUSTOM' && (
                                <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                                    <input 
                                        type="date" 
                                        className="px-2 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-700 outline-none bg-white shadow-sm cursor-pointer"
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                    />
                                    <span className="text-slate-400 text-xs font-bold">-</span>
                                    <input 
                                        type="date" 
                                        className="px-2 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-700 outline-none bg-white shadow-sm cursor-pointer"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- SEARCH & EXPORT ACTIONS --- */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                        <div className="relative w-full sm:w-72">
                            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3" />
                            <input
                                type="text"
                                placeholder="Search actions or emails..."
                                className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all bg-white shadow-sm"
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                            />
                        </div>
                        <button
                            onClick={handleExportCSV}
                            disabled={filteredLogs.length === 0}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors shadow-sm disabled:opacity-50 shrink-0 outline-none"
                        >
                            <Download className="w-4 h-4" />
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto custom-scrollbar flex-1 bg-white">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-[400px] text-blue-500 gap-4 bg-white">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="font-bold text-sm uppercase tracking-widest text-slate-400">Fetching Secure Logs...</span>
                        </div>
                    ) : (
                        <table className="min-w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-black">
                                    <th className="px-6 py-4 pl-8">Timestamp</th>
                                    <th className="px-6 py-4">Admin / Operator</th>
                                    <th className="px-6 py-4">Action Signature</th>
                                    <th className="px-6 py-4">Entity Affected</th>
                                    <th className="px-6 py-4 text-center pr-8">Payload</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center">
                                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-500">
                                                <ShieldCheck className="w-8 h-8" />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 mb-1">No Audit Logs Found</h3>
                                            <p className="text-sm text-slate-500 font-medium">No actions match your current search or filter criteria.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 pl-8">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-900 font-bold mb-0.5">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-5">
                                                    {new Date(log.created_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                                                        <UserCircle className="w-5 h-5 text-slate-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 text-sm">{log.user?.email ? log.user.email.split('@')[0] : 'SYSTEM'}</p>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{log.user?.email || 'Automated Job'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getActionStyle(log.action)}`}>
                                                    {log.action.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-bold text-slate-700 uppercase">{log.entity_type}</p>
                                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {log.entity_id || 'N/A'}</p>
                                            </td>
                                            <td className="px-6 py-4 text-center pr-8">
                                                <button 
                                                    onClick={() => setSelectedLog(log)}
                                                    disabled={!log.details || Object.keys(log.details).length === 0}
                                                    className="p-1.5 text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-600 hover:text-white rounded-lg transition-colors outline-none disabled:opacity-30 mx-auto block"
                                                    title="Inspect JSON Payload"
                                                >
                                                    <FileJson size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
                
                {/* Server Pagination */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-50 bg-white hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 shadow-sm outline-none">Previous</button>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Server Page {page} of {totalPages || 1}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-50 bg-white hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 shadow-sm outline-none">Next</button>
                </div>
            </div>

            {/* --- FORENSIC PAYLOAD INSPECTOR MODAL --- */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setSelectedLog(null)}></div>
                    <div className="bg-[#0B1121] rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden animate-fade-in border border-slate-700 flex flex-col max-h-[85vh]">
                        
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center text-white shrink-0">
                            <div className="flex items-center space-x-3">
                                <Database className="text-blue-400" size={18}/>
                                <h3 className="text-sm font-bold tracking-widest uppercase text-slate-300">Forensic Data Inspector</h3>
                            </div>
                            <button onClick={() => setSelectedLog(null)} className="text-slate-500 hover:text-white transition-colors outline-none"><X size={18}/></button>
                        </div>
                        
                        <div className="p-6 bg-slate-900 overflow-y-auto custom-scrollbar flex-1">
                            <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-slate-800">
                                <div>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Log ID</p>
                                    <p className="text-xs text-slate-300 font-mono">{selectedLog.id}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Tenant ID</p>
                                    <p className="text-xs text-slate-300 font-mono">{selectedLog.lender_id || 'Global Environment'}</p>
                                </div>
                            </div>

                            <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-2 flex items-center"><FileJson size={12} className="mr-1.5"/> Captured JSON Payload</p>
                            <div className="bg-[#050810] p-4 rounded-xl border border-slate-800 overflow-x-auto">
                                <pre className="text-xs font-mono text-emerald-400 leading-relaxed">
                                    {JSON.stringify(selectedLog.details, null, 2)}
                                </pre>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};