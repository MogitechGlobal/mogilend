import { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import { Logo } from '../components/Logo';
import { 
  Search, ChevronDown, CreditCard, Users, 
  PieChart, Settings, LogOut, Menu, Briefcase, 
  TrendingUp, Megaphone, X, LayoutDashboard, 
  Package, Percent, FileEdit, Send, RefreshCw, 
  Target, FileClock, CheckSquare, ArrowRightLeft, 
  UserCog, LineChart, History, Sliders, UserPlus
} from 'lucide-react';

export const LoanOfficerLayout = ({ children, onNavigate, onLogout, currentPath }: any) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({ 
    credit: true, registry: true, settings_credit: false, marketing_group: false, portfolio: false, reports: false, system: false
  });
  
  const user = useAuthStore((state: any) => state.user);

  // --- ROLE-BASED ACCESS CONTROL (RBAC) HELPER ---
  const hasAccess = (allowedRoles: string[]) => {
    if (!user) return false;
    if (user.role === 'Super Admin') return true; // Super Admins bypass all UI restrictions
    return allowedRoles.includes(user.role);
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentPath]);

  const toggleMenu = (key: string) => {
    setExpandedMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const NavGroup = ({ title, icon: Icon, menuKey, children }: any) => {
    const isExpanded = expandedMenus[menuKey];
    
    return (
      <div className="mb-1">
        <button 
          onClick={() => toggleMenu(menuKey)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 outline-none group
            ${isExpanded ? 'bg-slate-800/80 text-white' : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'}
          `}
        >
          <div className="flex items-center space-x-3">
            <Icon size={18} className={`${isExpanded ? 'text-blue-400' : 'group-hover:text-blue-400'} transition-colors`} />
            <span className="text-[13px] font-semibold tracking-wide">{title}</span>
          </div>
          <ChevronDown 
            size={14} 
            className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-400' : 'text-slate-500 group-hover:text-slate-400'}`} 
          />
        </button>
        <div 
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="flex flex-col space-y-0.5 py-1 mb-2">
            {children}
          </div>
        </div>
      </div>
    );
  };

  const NavLink = ({ path, label, icon: Icon, isSubItem = true }: any) => {
    const isActive = currentPath === path;
    
    return (
      <button 
        onClick={() => onNavigate(path)}
        className={`w-full flex items-center space-x-3 text-left transition-all duration-200 outline-none rounded-xl
          ${isSubItem ? 'pl-[42px] pr-4 py-2 text-[13px]' : 'px-3 py-2.5 text-[14px] font-semibold mb-2'}
          ${isActive 
            ? isSubItem 
                ? 'text-white bg-blue-500/10 font-medium relative before:absolute before:left-[22px] before:top-1/2 before:-translate-y-1/2 before:w-1.5 before:h-1.5 before:bg-blue-500 before:rounded-full' 
                : 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
            : isSubItem 
                ? 'text-slate-400 font-medium hover:text-slate-200 hover:bg-slate-800/40' 
                : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
          }`}
      >
        {Icon && <Icon size={18} className={isActive ? 'text-blue-400' : 'text-slate-500'} />}
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] flex overflow-hidden font-sans antialiased selection:bg-blue-500/30">
      
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-[#0B1121] text-white flex flex-col shadow-2xl lg:shadow-none border-r border-slate-800/50
        transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="h-20 px-5 flex items-center justify-between shrink-0 relative">
          <Logo />
          <button 
            className="lg:hidden text-slate-400 hover:text-white bg-slate-800/50 p-1.5 rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
          <div className="absolute bottom-0 left-5 right-5 h-px bg-gradient-to-r from-slate-800 via-slate-700 to-transparent"></div>
        </div>

        {/* Scrollable Navigation Area */}
        <nav className="flex-1 overflow-y-auto pt-5 pb-8 px-3 space-y-1 custom-scrollbar">
          
          <NavLink path="dashboard" label="Branch Dashboard" icon={LayoutDashboard} isSubItem={false} />

          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 mt-4">Core Modules</p>

          {/* Group 1: Credit Administration */}
          {hasAccess(['Lender Admin', 'Branch Manager', 'Loan Officer', 'Cashier', 'Viewer']) && (
            <NavGroup title="Credit Admin" icon={CreditCard} menuKey="credit">
              {hasAccess(['Lender Admin', 'Branch Manager', 'Loan Officer', 'Viewer']) && <NavLink path="application" label="New Application" icon={FileEdit} />}
              {hasAccess(['Lender Admin', 'Branch Manager', 'Viewer']) && <NavLink path="disbursements" label="Disbursements" icon={Send} />}
              {hasAccess(['Lender Admin', 'Branch Manager', 'Cashier', 'Viewer']) && <NavLink path="repayments" label="Repayments" icon={RefreshCw} />}
            </NavGroup>
          )}

          {/* Group 2: Customer Registry */}
          {hasAccess(['Lender Admin', 'Branch Manager', 'Loan Officer', 'Viewer']) && (
            <NavGroup title="Customer Registry" icon={Users} menuKey="registry">
              <NavLink path="borrowers" label="Client Database" icon={Users} />
              {hasAccess(['Lender Admin', 'Branch Manager', 'Viewer']) && <NavLink path="pending-amendments" label="Pending Amendments" icon={FileClock} />}
              {hasAccess(['Lender Admin', 'Branch Manager', 'Viewer']) && <NavLink path="approvals-pending" label="Approvals Pending" icon={CheckSquare} />}
              {hasAccess(['Lender Admin', 'Branch Manager', 'Viewer']) && <NavLink path="customer-transfer" label="Customer Transfer" icon={ArrowRightLeft} />}
              {hasAccess(['Lender Admin', 'Branch Manager', 'Viewer']) && <NavLink path="customer-edits" label="Customer Edits" icon={UserCog} />}
            </NavGroup>
          )}

          {/* Group 3: Loan Portfolio */}
          {hasAccess(['Lender Admin', 'Branch Manager', 'Loan Officer', 'Viewer']) && (
            <NavGroup title="Loan Portfolio" icon={Briefcase} menuKey="portfolio">
              <NavLink path="active-loans" label="Active Loans" icon={Briefcase} />
            </NavGroup>
          )}

          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 mt-6">Growth & Analytics</p>

          {/* Group 4: Marketing */}
          {hasAccess(['Lender Admin', 'Branch Manager', 'Viewer']) && (
            <NavGroup title="Marketing" icon={Megaphone} menuKey="marketing_group">
              <NavLink path="marketing" label="Campaign Overview" icon={Megaphone} />
              <NavLink path="marketing-leads" label="Lead Generation" icon={Target} />
            </NavGroup>
          )}

          {/* Group 5: Reports */}
          {hasAccess(['Lender Admin', 'Branch Manager', 'Cashier', 'Viewer']) && (
            <NavGroup title="Reports & Insights" icon={PieChart} menuKey="reports">
              {hasAccess(['Lender Admin', 'Branch Manager', 'Viewer']) && <NavLink path="financial-reports" label="Financial Reports" icon={LineChart} />}
              {hasAccess(['Lender Admin', 'Branch Manager', 'Viewer']) && <NavLink path="portfolio-report" label="Portfolio Analytics" icon={PieChart} />}
              {hasAccess(['Lender Admin', 'Branch Manager', 'Cashier', 'Viewer']) && <NavLink path="transaction-history" label="Transaction History" icon={History} />}
            </NavGroup>
          )}

          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 mt-6">Administration</p>

          {/* Group 6: Credit Settings */}
          {hasAccess(['Lender Admin']) && (
            <NavGroup title="Credit Settings" icon={TrendingUp} menuKey="settings_credit">
              <NavLink path="loan-products" label="Loan Products" icon={Package} />
              <NavLink path="interest-rates" label="Interest Rates" icon={Percent} />
            </NavGroup>
          )}

          {/* Group 7: System Settings */}
          {hasAccess(['Lender Admin', 'Branch Manager']) && (
            <NavGroup title="System Settings" icon={Settings} menuKey="system">
              {hasAccess(['Lender Admin']) && <NavLink path="system-config" label="Lender Management" icon={Sliders} />}
              <NavLink path="register-staff" label="User Management" icon={UserPlus} />
              {hasAccess(['Lender Admin']) && <NavLink path="branch-management" label="Branch Management" icon={UserPlus} />}
              {hasAccess(['Lender Admin']) && <NavLink path="audit-ledger" label="Audit Ledger" icon={FileClock} />}
            </NavGroup>
          )}
        </nav>

        {/* Persistent Bottom User Profile */}
        <div className="p-4 bg-[#080d19] border-t border-slate-800/50 shrink-0">
          <button 
            onClick={() => onNavigate('profile')} 
            className="w-full flex items-center space-x-3 p-2.5 hover:bg-slate-800/60 rounded-2xl transition-all duration-200 text-left group outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-black text-lg shadow-lg shadow-blue-500/20 uppercase shrink-0 ring-2 ring-transparent group-hover:ring-blue-400 transition-all">
              {user?.email?.[0] || 'U'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-bold truncate text-slate-200 tracking-wide group-hover:text-white transition-colors">{user?.email}</p>
              <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5 uppercase tracking-wider">{user?.role}</p>
            </div>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen bg-[#F8FAFC]">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 shrink-0">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="lg:hidden p-2.5 text-slate-600 hover:bg-slate-100 hover:text-blue-600 rounded-xl transition-colors outline-none"
            >
              <Menu size={24} />
            </button>
            
            <div className="relative group hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search customers, loans, or transactions..." 
                className="pl-11 pr-4 py-2.5 bg-slate-100/80 border border-transparent rounded-2xl w-72 lg:w-[400px] focus:border-blue-500/30 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-semibold text-slate-700 placeholder-slate-400 shadow-sm hover:bg-slate-100"
              />
            </div>
          </div>
          
          <button 
            onClick={onLogout} 
            className="flex items-center space-x-2 text-slate-500 hover:text-red-600 font-bold text-sm bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 px-4 py-2.5 rounded-xl transition-all shadow-sm outline-none"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
};