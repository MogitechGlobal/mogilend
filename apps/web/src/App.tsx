import { useState } from 'react';
import useAuthStore from './store/authStore';
import { LoginPage } from './pages/LoginPage';
import { BorrowersPage } from './pages/BorrowersPage';
import { LoanApplicationPage } from './pages/LoanApplicationPage';
import { ProfileSettings } from './features/profile/ProfileSettings';
import { LoanOfficerLayout } from './layouts/LoanOfficerLayout';
import { BranchDashboard } from './pages/BranchDashboard';
import { LoanProductsPage } from './pages/LoanProductsPage';
import { InterestRatesPage } from './pages/InterestRatesPage';
import { DisbursementsPage } from './pages/DisbursementsPage';
import { RepaymentsPage } from './pages/RepaymentsPage';
import { TransactionHistoryPage } from './pages/TransactionHistoryPage';
import { PortfolioReportPage } from './pages/PortfolioReportPage';
import { FinancialReportsPage } from './pages/FinancialReportsPage';
import { ActiveLoansPage } from './pages/ActiveLoansPage';
import { SystemConfigPage } from './pages/SystemConfigPage';
import { RegisterStaffPage } from './pages/RegisterStaffPage';
import { BranchManagementPage } from './pages/BranchManagementPage';
import { ApprovalsPendingPage } from './pages/ApprovalsPendingPage';
import { PendingAmendmentsPage } from './pages/PendingAmendmentsPage';
import { CustomerTransferPage } from './pages/CustomerTransferPage';
import { CustomerEditsPage } from './pages/CustomerEditsPage';
import { AuditLedgerPage } from './pages/AuditLedgerPage';
import { ShieldAlert } from 'lucide-react';

// Placeholder components for modules currently in development
const Placeholder = ({ title }: { title: string }) => (
  <div className="p-8 bg-white rounded-2xl border border-dashed border-slate-300 text-center text-slate-500">
    {title} Module coming soon.
  </div>
);

// Unauthorized Component
const UnauthorizedAccess = () => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fade-in">
    <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
      <ShieldAlert size={48} />
    </div>
    <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Access Denied</h2>
    <p className="text-slate-500 font-medium max-w-md">
      Your current role does not have the required permissions to view or interact with this module.
    </p>
  </div>
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('jwt_token'));
  const user = useAuthStore((state: any) => state.user);
  
  type Page = 
    | 'dashboard' | 'loan-products' | 'interest-rates' 
    | 'application' | 'loan-application' | 'disbursements' | 'repayments' 
    | 'marketing' | 'marketing-leads'
    | 'borrowers' | 'pending-amendments' | 'approvals-pending' | 'customer-transfer' | 'customer-edits'
    | 'active-loans' 
    | 'financial-reports' | 'portfolio-report' | 'transaction-history' 
    | 'profile' 
    | 'system-config' | 'register-staff'
    | 'branch-management' | 'audit-ledger';

  // FIX: Initialize the state from localStorage so it survives refreshes
  const [currentPage, setCurrentPage] = useState<Page>(
    (localStorage.getItem('mogi_current_page') as Page) || 'dashboard'
  );

  const logout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('mogi_current_page'); // Clear the saved page on logout
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  // --- ROLE-BASED ACCESS CONTROL (RBAC) HELPER ---
  const hasAccess = (allowedRoles: string[]) => {
    if (!user) return false;
    if (user.role === 'Super Admin') return true; 
    return allowedRoles.includes(user.role);
  };

  // --- TYPE-SAFE NAVIGATION HELPER ---
  const handleNavigate = (path: string) => {
    setCurrentPage(path as Page);
    localStorage.setItem('mogi_current_page', path); // FIX: Save the new path to localStorage on every click
  };

  return (
    <LoanOfficerLayout onNavigate={handleNavigate} onLogout={logout} currentPath={currentPage}>
      
      {/* Dashboards (Everyone) */}
      {currentPage === 'dashboard' && <BranchDashboard onNavigate={handleNavigate} />}
      
      {/* System & Credit Settings (Admins Only) */}
      {currentPage === 'loan-products' && (hasAccess(['Lender Admin']) ? <LoanProductsPage /> : <UnauthorizedAccess />)}
      {currentPage === 'interest-rates' && (hasAccess(['Lender Admin']) ? <InterestRatesPage /> : <UnauthorizedAccess />)}
      {currentPage === 'system-config' && (hasAccess(['Lender Admin']) ? <SystemConfigPage /> : <UnauthorizedAccess />)}
      {currentPage === 'branch-management' && (hasAccess(['Lender Admin']) ? <BranchManagementPage /> : <UnauthorizedAccess />)}
      {currentPage === 'audit-ledger' && (hasAccess(['Lender Admin']) ? <AuditLedgerPage /> : <UnauthorizedAccess />)}
      {currentPage === 'register-staff' && (hasAccess(['Lender Admin', 'Branch Manager']) ? <RegisterStaffPage /> : <UnauthorizedAccess />)}
      
      {/* High-Privilege Operations (Branch Managers & Admins) */}
      {currentPage === 'disbursements' && (hasAccess(['Lender Admin', 'Branch Manager']) ? <DisbursementsPage onNavigate={handleNavigate} /> : <UnauthorizedAccess />)}
      {currentPage === 'approvals-pending' && (hasAccess(['Lender Admin', 'Branch Manager']) ? <ApprovalsPendingPage /> : <UnauthorizedAccess />)}
      {currentPage === 'pending-amendments' && (hasAccess(['Lender Admin', 'Branch Manager']) ? <PendingAmendmentsPage /> : <UnauthorizedAccess />)}
      {currentPage === 'customer-transfer' && (hasAccess(['Lender Admin', 'Branch Manager']) ? <CustomerTransferPage /> : <UnauthorizedAccess />)}
      {currentPage === 'customer-edits' && (hasAccess(['Lender Admin', 'Branch Manager']) ? <CustomerEditsPage /> : <UnauthorizedAccess />)}
      
      {/* Standard Credit Operations (Loan Officers & Above) */}
      {(currentPage === 'application' || currentPage === 'loan-application') && (hasAccess(['Lender Admin', 'Branch Manager', 'Loan Officer']) ? <LoanApplicationPage onNavigate={handleNavigate} /> : <UnauthorizedAccess />)}
      {currentPage === 'borrowers' && (hasAccess(['Lender Admin', 'Branch Manager', 'Loan Officer']) ? <BorrowersPage onNavigate={handleNavigate} /> : <UnauthorizedAccess />)}
      {currentPage === 'active-loans' && (hasAccess(['Lender Admin', 'Branch Manager', 'Loan Officer']) ? <ActiveLoansPage onNavigate={handleNavigate} /> : <UnauthorizedAccess />)}
      
      {/* Cashier & Ledger Operations */}
      {currentPage === 'repayments' && (hasAccess(['Lender Admin', 'Branch Manager', 'Cashier']) ? <RepaymentsPage /> : <UnauthorizedAccess />)}
      {currentPage === 'transaction-history' && (hasAccess(['Lender Admin', 'Branch Manager', 'Cashier']) ? <TransactionHistoryPage /> : <UnauthorizedAccess />)}
      
      {/* Reports */}
      {currentPage === 'financial-reports' && (hasAccess(['Lender Admin', 'Branch Manager']) ? <FinancialReportsPage /> : <UnauthorizedAccess />)}
      {currentPage === 'portfolio-report' && (hasAccess(['Lender Admin', 'Branch Manager']) ? <PortfolioReportPage /> : <UnauthorizedAccess />)}

      {/* Marketing */}
      {currentPage === 'marketing' && <Placeholder title="Marketing Overview" />}
      {currentPage === 'marketing-leads' && <Placeholder title="Marketing Leads" />}

      {/* Profile & Settings (Everyone) */}
      {currentPage === 'profile' && <ProfileSettings />}
      
    </LoanOfficerLayout>
  );
}

export default App;