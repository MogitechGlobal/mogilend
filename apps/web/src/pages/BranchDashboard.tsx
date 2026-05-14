import React, { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import { 
  Users, TrendingUp, CreditCard, Clock, 
  ArrowRight, AlertTriangle, 
  Activity, Wallet, CheckCircle, FileText, Smartphone, Building,
  Filter, MapPin, User, Calendar, ChevronDown, Briefcase
} from 'lucide-react';
import { 
  BarChart, Bar, Line, ComposedChart, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

export const BranchDashboard = ({ onNavigate }: { onNavigate: (path: any) => void }) => {
  const user = useAuthStore((state: any) => state.user);
  const [isLoading, setIsLoading] = useState(true);

  // --- FILTER STATE ---
  const [filters, setFilters] = useState({
    branch: 'all',
    officer: 'all',
    period: 'this_month',
    startDate: '2026-05-01',
    endDate: '2026-05-31'
  });

  // --- MOCK DATA ---
  const cashFlowData = [
    { month: 'Jan', disbursed: 1200000, repaid: 950000 },
    { month: 'Feb', disbursed: 1500000, repaid: 1100000 },
    { month: 'Mar', disbursed: 1800000, repaid: 1400000 },
    { month: 'Apr', disbursed: 1400000, repaid: 1550000 },
    { month: 'May', disbursed: 2100000, repaid: 1850000 },
    { month: 'Jun', disbursed: 1900000, repaid: 2000000 },
  ];

  const statusChartData = [
    { name: 'Disbursed', value: 450, color: '#10B981' }, 
    { name: 'Pending', value: 125, color: '#0F172A' },
    { name: 'Completed', value: 310, color: '#EF4444' },
    { name: 'Defaulted', value: 45, color: '#F59E0B' },
  ];

  const branchChartData = [
    { branch: 'Nairobi CBD (HQ)', clients: 450 },
    { branch: 'Mombasa Hub', clients: 320 },
    { branch: 'Nakuru Branch', clients: 210 },
    { branch: 'Kisumu Outlet', clients: 150 },
    { branch: 'Eldoret Branch', clients: 95 },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // --- REUSABLE COMPONENTS ---
  const StatCard = ({ title, value, subtext, icon: Icon, colorClass, highlightClass }: any) => (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300 relative overflow-hidden group cursor-pointer">
      <div className={`absolute left-0 top-6 bottom-6 w-1 rounded-r-full ${highlightClass}`}></div>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5">{title}</h3>
          {isLoading ? (
            <div className="h-8 bg-slate-100 rounded-lg w-32 animate-pulse"></div>
          ) : (
            <p className={`text-2xl xl:text-3xl font-black tracking-tight ${colorClass}`}>{value}</p>
          )}
        </div>
        <div className={`p-3 rounded-2xl ${highlightClass} bg-opacity-10 text-opacity-100`}>
          <Icon size={24} className={colorClass} />
        </div>
      </div>
      <p className="text-xs font-semibold text-slate-500 flex items-center">
        {subtext}
      </p>
    </div>
  );

  const QuickAction = ({ title, icon: Icon, colorClass, onClick }: any) => (
    <button 
      onClick={onClick}
      className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center space-x-4 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all outline-none focus:ring-2 focus:ring-blue-500/20 w-full text-left group"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon size={20} />
      </div>
      <span className="font-bold text-sm text-slate-700 group-hover:text-slate-900">{title}</span>
    </button>
  );

  // --- FORMATTERS & TOOLTIPS ---
  const formatYAxis = (val: number) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${val / 1000}K`;

  const CustomCashFlowTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700/50 min-w-[160px]">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">{label} 2026</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center space-x-4 mb-1.5 last:mb-0">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                <span className="text-xs font-medium text-slate-300">{entry.name}</span>
              </div>
              <span className="text-sm font-bold">KES {(entry.value / 1000000).toFixed(2)}M</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white text-xs font-bold py-2.5 px-3.5 rounded-xl shadow-xl border border-slate-700/50 flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          <span className="text-slate-300 font-medium">{payload[0].payload.branch}:</span> 
          <span>{payload[0].value} Clients</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header & Live Data Badge */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end pb-2 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Executive Dashboard</h1>
          <div className="flex items-center space-x-3 mt-2">
            <span className="text-slate-500 text-sm font-medium">Financial Health Overview</span>
            <span className="text-slate-300">|</span>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md flex items-center shadow-sm">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span>
              Live Data
            </span>
          </div>
        </div>
      </div>

      {/* --- ADVANCED FILTER BAR --- */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row xl:items-center gap-4">
        <div className="flex items-center text-slate-400 mr-2 shrink-0">
          <Filter size={18} className="mr-2" />
          <span className="text-xs font-black uppercase tracking-widest">Filters</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 flex-1">
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select 
              value={filters.branch}
              onChange={(e) => setFilters({...filters, branch: e.target.value})}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Branches</option>
              <option value="hq">Headquarters - Nairobi</option>
              <option value="mombasa">Mombasa Hub</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select 
              value={filters.officer}
              onChange={(e) => setFilters({...filters, officer: e.target.value})}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Officers</option>
              <option value="1">Richard Kassanga</option>
              <option value="2">Jacob Mongeri</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select 
              value={filters.period}
              onChange={(e) => setFilters({...filters, period: e.target.value})}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <input 
            type="date" 
            value={filters.startDate}
            onChange={(e) => setFilters({...filters, startDate: e.target.value, period: 'custom'})}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />

          <input 
            type="date" 
            value={filters.endDate}
            onChange={(e) => setFilters({...filters, endDate: e.target.value, period: 'custom'})}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        
        <button className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95 outline-none focus:ring-2 focus:ring-blue-500/50">
          <ArrowRight size={20} />
        </button>
      </div>

      {/* System Alerts Panel */}
      <div className="bg-white rounded-3xl border-l-4 border-l-slate-900 border-y border-r border-slate-200 shadow-sm p-4 mb-2">
        <div className="flex items-center space-x-2 mb-3 px-2">
          <AlertTriangle size={16} className="text-slate-500" />
          <h6 className="text-[10px] font-black uppercase tracking-widest text-slate-500 m-0">System Alerts</h6>
        </div>
        <div className="space-y-2">
           <button onClick={() => onNavigate('approvals-pending')} className="w-full flex items-center justify-between p-3 bg-amber-50 hover:bg-amber-100 rounded-2xl transition-colors text-left group border border-transparent hover:border-amber-200">
             <div className="flex items-center space-x-4">
               <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                 <Clock size={18} />
               </div>
               <div>
                 <p className="font-bold text-amber-900 text-sm">12 loan applications require approval.</p>
                 <p className="text-xs text-amber-700/70 font-medium mt-0.5">Action required immediately</p>
               </div>
             </div>
             <ArrowRight size={16} className="text-amber-400 group-hover:translate-x-1 transition-transform" />
           </button>

           <button onClick={() => onNavigate('active-loans')} className="w-full flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 rounded-2xl transition-colors text-left group border border-transparent hover:border-red-200">
             <div className="flex items-center space-x-4">
               <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                 <AlertTriangle size={18} />
               </div>
               <div>
                 <p className="font-bold text-red-900 text-sm">5 loans are marked as Defaulted/High Risk.</p>
                 <p className="text-xs text-red-700/70 font-medium mt-0.5">Review Portfolio at Risk (PAR)</p>
               </div>
             </div>
             <ArrowRight size={16} className="text-red-400 group-hover:translate-x-1 transition-transform" />
           </button>
        </div>
      </div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <QuickAction title="Disburse Loan" icon={CreditCard} colorClass="bg-blue-50 text-blue-600" onClick={() => onNavigate('disbursements')} />
        <QuickAction title="Receive Pay" icon={Wallet} colorClass="bg-emerald-50 text-emerald-600" onClick={() => onNavigate('repayments')} />
        <QuickAction title="New Client" icon={Users} colorClass="bg-indigo-50 text-indigo-600" onClick={() => onNavigate('borrowers')} />
        <QuickAction title="Overdue" icon={AlertTriangle} colorClass="bg-red-50 text-red-600" onClick={() => onNavigate('active-loans')} />
        <QuickAction title="Reports" icon={FileText} colorClass="bg-slate-100 text-slate-700" onClick={() => onNavigate('financial-reports')} />
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard 
          title="Active Portfolio" 
          value="KES 14.5M" 
          subtext={<><Users size={14} className="mr-1.5 text-blue-500" /> 142 Active Clients</>}
          icon={Briefcase} colorClass="text-slate-900" highlightClass="bg-blue-500" 
        />
        <StatCard 
          title="Collected Today" 
          value="KES 85,400" 
          subtext={<><CheckCircle size={14} className="mr-1.5 text-emerald-500" /> Verified Transactions</>}
          icon={TrendingUp} colorClass="text-emerald-600" highlightClass="bg-emerald-500" 
        />
        <StatCard 
          title="Portfolio At Risk (PAR)" 
          value="4.2%" 
          subtext={<><AlertTriangle size={14} className="mr-1.5 text-red-500" /> Value: KES 609,000</>}
          icon={Activity} colorClass="text-red-600" highlightClass="bg-red-500" 
        />
        <StatCard 
          title="Total Loans Issued" 
          value="1,204" 
          subtext={<><Clock size={14} className="mr-1.5 text-indigo-500" /> Lifetime Count</>}
          icon={FileText} colorClass="text-slate-900" highlightClass="bg-indigo-500" 
        />
      </div>

      {/* --- ANALYTICS ROW 1: Cash Flow (2/3) & Loan Status (1/3) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cash Flow Trends Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8 flex flex-col h-[400px]">
           <div className="flex justify-between items-center mb-8">
             <div>
               <h2 className="text-lg font-bold text-slate-900">Cash Flow Trends</h2>
               <p className="text-xs text-slate-500 font-medium mt-1">Disbursements vs Repayments</p>
             </div>
             
             {/* Custom Chart Legend designed in Tailwind to match the UI */}
             <div className="hidden sm:flex items-center space-x-4 text-xs font-bold text-slate-600 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
               <div className="flex items-center"><span className="w-3 h-3 rounded bg-slate-900 mr-2"></span> Disbursements</div>
               <div className="flex items-center"><span className="w-3 h-3 rounded bg-emerald-500 mr-2"></span> Repayments</div>
             </div>
           </div>
           
           <div className="flex-1 w-full">
             {isLoading ? (
                <div className="w-full h-full bg-slate-50 rounded-2xl animate-pulse"></div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={cashFlowData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} tickFormatter={formatYAxis} />
                    <Tooltip content={<CustomCashFlowTooltip />} cursor={{fill: '#f8fafc'}} />
                    <Bar yAxisId="left" dataKey="repaid" name="Repayments" fill="#10B981" radius={[6, 6, 0, 0]} barSize={28} />
                    <Line yAxisId="left" type="monotone" dataKey="disbursed" name="Disbursements" stroke="#0F172A" strokeWidth={4} dot={{ r: 5, strokeWidth: 3, fill: '#fff' }} activeDot={{ r: 7, strokeWidth: 0, fill: '#0F172A' }} />
                  </ComposedChart>
                </ResponsiveContainer>
             )}
           </div>
        </div>

        {/* Loan Status Doughnut Chart */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8 flex flex-col h-[400px]">
           <div className="mb-2 text-center lg:text-left">
             <h2 className="text-lg font-bold text-slate-900">Loan Status</h2>
             <p className="text-xs text-slate-500 font-medium mt-1">Portfolio distribution by state</p>
           </div>
           
           <div className="flex-1 w-full flex items-center justify-center min-h-[200px]">
             {isLoading ? (
                <div className="w-48 h-48 rounded-full border-[12px] border-slate-50 animate-pulse"></div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} className="outline-none hover:opacity-80 transition-opacity cursor-pointer" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontWeight: 'bold', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      itemStyle={{ color: '#0F172A' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
             )}
           </div>

           {/* Professional Custom Tailwind Legend (Fixes the overlapping issue in image_39e117.png) */}
           <div className="grid grid-cols-2 gap-y-3 gap-x-2 mt-2">
             {statusChartData.map(item => (
               <div key={item.name} className="flex items-center space-x-2">
                 <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }}></span>
                 <span className="text-xs font-bold text-slate-600 truncate">{item.name}</span>
               </div>
             ))}
           </div>
        </div>

      </div>

      {/* --- ANALYTICS ROW 2: Clients By Branch (2/3) & Payment Channels (1/3) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Clients By Branch Horizontal Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8 flex flex-col h-[340px]">
           <div className="flex justify-between items-center mb-8">
             <div>
               <h2 className="text-lg font-bold text-slate-900">Clients by Branch</h2>
               <p className="text-xs text-slate-500 font-medium mt-1">Customer distribution across locations</p>
             </div>
             <button className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors outline-none">Download CSV</button>
           </div>
           
           <div className="flex-1 w-full">
             {isLoading ? (
                <div className="w-full h-full bg-slate-50 rounded-2xl animate-pulse"></div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={branchChartData}
                    margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} />
                    <YAxis dataKey="branch" type="category" axisLine={false} tickLine={false} tick={{fill: '#334155', fontSize: 12, fontWeight: 700}} width={150} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                    <Bar dataKey="clients" radius={[0, 8, 8, 0]} barSize={20}>
                      {branchChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#3B82F6' : '#93C5FD'} className="hover:opacity-80 transition-opacity cursor-pointer" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             )}
           </div>
        </div>

        {/* Payment Channels */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 lg:p-8 flex flex-col h-[340px]">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Payment Channels <span className="text-xs font-semibold text-slate-400 font-normal ml-1">(30 Days)</span></h2>
          
          <div className="space-y-4 flex-1">
            <div className="flex justify-between items-center p-3.5 bg-slate-50 hover:bg-emerald-50/50 rounded-2xl border border-slate-100 hover:border-emerald-100 transition-all cursor-pointer">
              <div className="flex items-center space-x-4">
                <div className="p-2.5 bg-white text-emerald-600 rounded-xl shadow-sm border border-slate-100"><Smartphone size={20} /></div>
                <span className="font-bold text-slate-700 text-sm">M-Pesa</span>
              </div>
              <span className="font-black text-slate-900">KES 1.2M</span>
            </div>

            <div className="flex justify-between items-center p-3.5 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-100 hover:border-blue-100 transition-all cursor-pointer">
              <div className="flex items-center space-x-4">
                <div className="p-2.5 bg-white text-blue-600 rounded-xl shadow-sm border border-slate-100"><Building size={20} /></div>
                <span className="font-bold text-slate-700 text-sm">Bank Transfer</span>
              </div>
              <span className="font-black text-slate-900">KES 450K</span>
            </div>

            <div className="flex justify-between items-center p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-100 transition-all cursor-pointer">
              <div className="flex items-center space-x-4">
                <div className="p-2.5 bg-white text-slate-600 rounded-xl shadow-sm border border-slate-100"><Wallet size={20} /></div>
                <span className="font-bold text-slate-700 text-sm">Cash</span>
              </div>
              <span className="font-black text-slate-900">KES 85K</span>
            </div>
          </div>

          <button onClick={() => onNavigate('transaction-history')} className="w-full mt-2 py-3.5 bg-white text-blue-600 font-bold text-sm rounded-xl hover:bg-blue-50 transition-colors border border-slate-200 hover:border-blue-200 outline-none shadow-sm">
            View All Transactions
          </button>
        </div>

      </div>

    </div>
  );
};