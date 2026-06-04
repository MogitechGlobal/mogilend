import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import { 
  Briefcase, AlertTriangle, TrendingUp, Download, 
  Search, Filter, Loader2, PieChart as PieChartIcon, 
  BarChart3, FileText, ArrowUpRight, MapPin, User, Calendar
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

export const PortfolioReportPage = () => {
  const user = useAuthStore((state: any) => state.user);
  
  // --- RAW DATA STATE ---
  const [loans, setLoans] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- FILTER STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [filterBranch, setFilterBranch] = useState('ALL');
  const [filterOfficer, setFilterOfficer] = useState('ALL');
  const [filterPeriod, setFilterPeriod] = useState('THIS_MONTH');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    const fetchPortfolioData = async () => {
      if (!user?.lender_id && user?.role !== 'Super Admin') return;
      
      setIsLoading(true);
      try {
        const activeLenderId = user?.lender_id || '5b1a0b35-2a91-461e-ba7b-c2d1301ea98e';
        const queryParams = `?lender_id=${activeLenderId}`;

        const [loansRes, branchesRes, usersRes] = await Promise.all([
            api.get(`/loans${queryParams}`),
            api.get(`/branches${queryParams}`).catch(() => ({ data: [] })),
            api.get(`/users${queryParams}`).catch(() => ({ data: [] }))
        ]);

        setLoans(Array.isArray(loansRes.data) ? loansRes.data : (loansRes.data?.data || []));
        setBranches(branchesRes.data || []);
        
        const staff = (usersRes.data || []).filter((u: any) => 
            ['Loan Officer', 'Branch Manager'].includes(u.role?.name) || u.role_id === 4 || u.role_id === 3
        );
        setOfficers(staff.length > 0 ? staff : usersRes.data);

      } catch (error) {
        console.error('Failed to fetch portfolio data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortfolioData();
  }, [user]);

  // --- DATA AGGREGATION ENGINE ---
  const { kpis, pieChartData, barChartData, baseFilteredLoans } = useMemo(() => {
    // 1. Resolve Date Range
    const now = new Date();
    let start = new Date(0); // Epoch
    let end = new Date();

    if (filterPeriod === 'TODAY') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
    } else if (filterPeriod === 'YESTERDAY') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
    } else if (filterPeriod === 'THIS_WEEK') {
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
    } else if (filterPeriod === 'THIS_MONTH') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (filterPeriod === 'THIS_YEAR') {
        start = new Date(now.getFullYear(), 0, 1);
    } else if (filterPeriod === 'CUSTOM' && customStart && customEnd) {
        start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
        end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
    }

    // 2. Filter Loans by Hierarchy & Date
    const filtered = loans.filter(l => {
        const bMatch = filterBranch === 'ALL' || l.borrower?.branch_id === filterBranch;
        const oMatch = filterOfficer === 'ALL' || l.borrower?.user_id === filterOfficer;
        if (!bMatch || !oMatch) return false;

        const d = new Date(l.disbursed_at || l.created_at);
        return d >= start && d <= end;
    });

    // 3. Compute Advanced KPIs
    const activeLoans = filtered.filter(l => l.status === 'DISBURSED' || l.status === 'DEFAULTED');
    const defaultedLoans = filtered.filter(l => l.status === 'DEFAULTED');

    const totalPortfolioValue = activeLoans.reduce((sum, l) => sum + (Number(l.outstanding_balance) || 0), 0);
    const totalPrincipalIssued = filtered.filter(l => ['DISBURSED', 'COMPLETED', 'DEFAULTED'].includes(l.status)).reduce((sum, l) => sum + (Number(l.principal_amount) || 0), 0);
    const parValue = defaultedLoans.reduce((sum, l) => sum + (Number(l.outstanding_balance) || 0), 0);
    const parPercentage = totalPortfolioValue > 0 ? (parValue / totalPortfolioValue) * 100 : 0;
    const averageLoanSize = activeLoans.length > 0 ? totalPortfolioValue / activeLoans.length : 0;

    // 4. Compute Pie Chart (Product Distribution)
    const productDistribution = activeLoans.reduce((acc: any, loan) => {
        const productName = loan.loan_product?.name || 'Unknown Product';
        acc[productName] = (acc[productName] || 0) + (Number(loan.outstanding_balance) || 0);
        return acc;
    }, {});

    const pieData = Object.keys(productDistribution).map((key, index) => ({
        name: key,
        value: productDistribution[key],
        color: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'][index % 5] 
    })).sort((a, b) => b.value - a.value);

    // 5. Compute Bar Chart (Status Distribution)
    const statusCounts = filtered.reduce((acc: any, loan) => {
        acc[loan.status] = (acc[loan.status] || 0) + 1;
        return acc;
    }, {});

    const barData = [
        { name: 'Pending', count: statusCounts['PENDING'] || 0, fill: '#64748B' },
        { name: 'Disbursed', count: statusCounts['DISBURSED'] || 0, fill: '#3B82F6' },
        { name: 'Completed', count: statusCounts['COMPLETED'] || 0, fill: '#10B981' },
        { name: 'Defaulted', count: statusCounts['DEFAULTED'] || 0, fill: '#EF4444' },
        { name: 'Rejected', count: statusCounts['REJECTED'] || 0, fill: '#0F172A' },
    ];

    return { 
        baseFilteredLoans: filtered,
        kpis: { totalPortfolioValue, totalPrincipalIssued, parValue, parPercentage, averageLoanSize, activeCount: activeLoans.length },
        pieChartData: pieData,
        barChartData: barData
    };
  }, [loans, filterBranch, filterOfficer, filterPeriod, customStart, customEnd]);

  // --- SECONDARY TABLE FILTERING ---
  const filteredTableData = baseFilteredLoans.filter((loan) => {
    const searchString = `${loan.borrower?.first_name} ${loan.borrower?.last_name} ${loan.borrower?.national_id} ${loan.id}`.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || loan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // --- EXPORT FUNCTION ---
  const handleExportReport = () => {
    if (filteredTableData.length === 0) return;
    
    const headers = ['Facility ID', 'Customer Name', 'National ID', 'Product', 'Principal', 'Outstanding Balance', 'Status', 'Origination Date'];
    const csvRows = filteredTableData.map(l => [
        `#${l.id.substring(0,8)}`,
        `${l.borrower?.first_name} ${l.borrower?.last_name}`,
        l.borrower?.national_id || 'N/A',
        l.loan_product?.name || 'Standard',
        Number(l.principal_amount).toFixed(2),
        Number(l.outstanding_balance).toFixed(2),
        l.status,
        new Date(l.disbursed_at || l.created_at).toLocaleDateString()
    ]);
    
    const csvContent = [headers.join(','), ...csvRows.map(r => `"${r.join('","')}"`)].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Portfolio_Report_${filterPeriod}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- FORMATTERS ---
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(val);
  };
  
  const formatCompact = (val: number) => {
    if (val >= 1000000) return `KES ${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `KES ${(val / 1000).toFixed(1)}K`;
    return `KES ${val.toLocaleString()}`;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700/50 text-sm font-bold z-50 relative">
          <p className="text-slate-400 text-xs mb-1 uppercase tracking-widest">{payload[0].name}</p>
          <p>{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  const availableOfficers = officers.filter(o => filterBranch === 'ALL' ? true : o.branch_id === filterBranch);

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-10">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Portfolio Analytics</h1>
          <p className="text-slate-500 font-medium mt-1">Deep-dive report into asset exposure and risk distribution.</p>
        </div>
        <button 
            onClick={handleExportReport}
            disabled={filteredTableData.length === 0}
            className="flex items-center space-x-2 bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow-md shadow-slate-900/20 outline-none disabled:opacity-50"
        >
          <Download size={18} />
          <span>Export Full Report</span>
        </button>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 mb-8">
          <div className="flex items-center text-slate-400 mr-2 shrink-0">
              <Filter size={18} className="mr-2" />
              <span className="text-xs font-black uppercase tracking-widest">Filters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
              <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                      value={filterBranch}
                      onChange={(e) => { setFilterBranch(e.target.value); setFilterOfficer('ALL'); }}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                  >
                      <option value="ALL">All Branches</option>
                      {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                  </select>
              </div>

              <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                      value={filterOfficer}
                      onChange={(e) => setFilterOfficer(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                  >
                      <option value="ALL">All Officers</option>
                      {availableOfficers.map(o => (
                          <option key={o.id} value={o.id}>{o.first_name} {o.last_name}</option>
                      ))}
                  </select>
              </div>

              <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                      value={filterPeriod}
                      onChange={(e) => setFilterPeriod(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                  >
                      <option value="ALL">All Time</option>
                      <option value="TODAY">Today</option>
                      <option value="YESTERDAY">Yesterday</option>
                      <option value="THIS_WEEK">This Week</option>
                      <option value="THIS_MONTH">This Month</option>
                      <option value="THIS_YEAR">This Year</option>
                      <option value="CUSTOM">Custom Range</option>
                  </select>
              </div>

              {filterPeriod === 'CUSTOM' && (
                  <div className="flex gap-2 animate-in fade-in zoom-in-95">
                      <input 
                          type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                      />
                      <input 
                          type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                      />
                  </div>
              )}
          </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Briefcase size={64} className="text-blue-500" /></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Active Exposure</p>
          <h3 className="text-3xl font-black text-blue-600 tracking-tight mb-2">{formatCompact(kpis.totalPortfolioValue)}</h3>
          <p className="text-xs font-bold text-slate-400">Across {kpis.activeCount} active facilities</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-red-300 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><AlertTriangle size={64} className="text-red-500" /></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Portfolio At Risk (PAR)</p>
          <h3 className="text-3xl font-black text-red-500 tracking-tight mb-2">{kpis.parPercentage.toFixed(2)}%</h3>
          <p className="text-xs font-bold text-slate-400">Value: {formatCompact(kpis.parValue)}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp size={64} className="text-emerald-500" /></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Avg. Loan Size</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{formatCompact(kpis.averageLoanSize)}</h3>
          <p className="text-xs font-bold text-slate-400">Based on active portfolio</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><ArrowUpRight size={64} className="text-indigo-500" /></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Historical Principal</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{formatCompact(kpis.totalPrincipalIssued)}</h3>
          <p className="text-xs font-bold text-slate-400">Total capital deployed in period</p>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Product Distribution Chart */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
          <div className="flex items-center space-x-2 mb-6">
            <PieChartIcon size={20} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-900">Exposure by Product</h2>
          </div>
          
          <div className="flex-1 flex flex-col md:flex-row items-center justify-center">
            {isLoading ? (
               <div className="w-48 h-48 rounded-full border-[12px] border-slate-50 animate-pulse"></div>
            ) : pieChartData.length > 0 ? (
              <>
                <div className="w-full md:w-1/2 h-[200px] md:h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%" cy="50%"
                        innerRadius={60} outerRadius={85}
                        paddingAngle={4}
                        dataKey="value" stroke="none"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 mt-4 md:mt-0 md:pl-6 space-y-3">
                  {pieChartData.map((item) => (
                    <div key={item.name}>
                      <div className="flex justify-between items-center text-xs font-bold mb-1">
                        <div className="flex items-center text-slate-700"><span className="w-2.5 h-2.5 rounded-sm mr-2" style={{ backgroundColor: item.color }}></span>{item.name}</div>
                        <span className="text-slate-900">{((item.value / kpis.totalPortfolioValue) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono ml-4">{formatCurrency(item.value)}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
               <div className="text-slate-400 font-medium text-sm">No active portfolio data in this period.</div>
            )}
          </div>
        </div>

        {/* Status Distribution Chart */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
          <div className="flex items-center space-x-2 mb-6">
            <BarChart3 size={20} className="text-slate-400" />
            <h2 className="text-lg font-bold text-slate-900">Application Pipeline & Status</h2>
          </div>
          
          <div className="flex-1 w-full">
            {isLoading ? (
               <div className="w-full h-full bg-slate-50 rounded-2xl animate-pulse"></div>
            ) : (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11, fontWeight: 700}} dy={10} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} />
                   <RechartsTooltip 
                     cursor={{fill: '#f8fafc'}}
                     contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontWeight: 'bold', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                   />
                   <Bar dataKey="count" name="Applications" radius={[6, 6, 0, 0]} barSize={40}>
                     {barChartData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.fill} />
                     ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Detail Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <FileText size={20} className="text-blue-500" />
            <h2 className="text-lg font-bold text-slate-900">Facility Ledger</h2>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative group w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input 
                type="text" placeholder="Search customer or ID..." 
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="relative w-full sm:w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select 
                value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="DISBURSED">Active (Disbursed)</option>
                <option value="DEFAULTED">Defaulted (PAR)</option>
                <option value="COMPLETED">Completed</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black border-b border-slate-200">
                <th className="p-4 pl-6">Customer</th>
                <th className="p-4">Product</th>
                <th className="p-4 text-right">Principal</th>
                <th className="p-4 text-right">Outstanding Bal</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right pr-6">Origination Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                 <tr><td colSpan={6} className="py-12 text-center text-slate-400 font-bold"><Loader2 className="animate-spin inline mr-2"/> Loading ledger...</td></tr>
              ) : filteredTableData.length === 0 ? (
                 <tr><td colSpan={6} className="py-12 text-center text-slate-400 font-medium">No facilities found matching filters.</td></tr>
              ) : (
                filteredTableData.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-slate-900 text-sm">{loan.borrower?.first_name} {loan.borrower?.last_name}</p>
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">ID: {loan.borrower?.national_id}</p>
                    </td>
                    <td className="p-4">
                      <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-indigo-100/50">
                        {loan.loan_product?.name || 'Standard'}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-sm text-slate-700">
                      {formatCurrency(loan.principal_amount)}
                    </td>
                    <td className="p-4 text-right font-mono font-black text-sm">
                      {loan.status === 'COMPLETED' ? (
                        <span className="text-emerald-500">KES 0</span>
                      ) : loan.status === 'DEFAULTED' ? (
                        <span className="text-red-500">{formatCurrency(loan.outstanding_balance)}</span>
                      ) : loan.status === 'DISBURSED' ? (
                        <span className="text-blue-600">{formatCurrency(loan.outstanding_balance)}</span>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        loan.status === 'DISBURSED' ? 'bg-blue-100 text-blue-700' :
                        loan.status === 'DEFAULTED' ? 'bg-red-100 text-red-700 animate-pulse' :
                        loan.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                        loan.status === 'REJECTED' ? 'bg-slate-100 text-slate-600' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {loan.status}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6 text-sm font-medium text-slate-500">
                      {new Date(loan.disbursed_at || loan.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric'})}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {!isLoading && filteredTableData.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs font-bold text-slate-500 text-center">
            Showing {filteredTableData.length} facility records
          </div>
        )}
      </div>

    </div>
  );
};