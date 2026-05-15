import { useState } from 'react';
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

// Placeholder components for modules currently in development
const Placeholder = ({ title }: { title: string }) => (
  <div className="p-8 bg-white rounded-2xl border border-dashed border-slate-300 text-center text-slate-500">
    {title} Module coming soon.
  </div>
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('jwt_token'));
  
  // Expanded Enterprise Routing Type based on the complete Registry and Reports sidebar structure
  type Page = 
    | 'dashboard' | 'loan-products' | 'interest-rates' 
    | 'application' | 'disbursements' | 'repayments' 
    | 'marketing' | 'marketing-leads'
    | 'borrowers' | 'pending-amendments' | 'approvals-pending' | 'customer-transfer' | 'customer-edits'
    | 'active-loans' 
    | 'financial-reports' | 'portfolio-report' | 'transaction-history' 
    | 'profile' 
    | 'system-config' | 'register-staff';

  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  const logout = () => {
    localStorage.removeItem('jwt_token');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <LoanOfficerLayout onNavigate={setCurrentPage} onLogout={logout} currentPath={currentPage}>
      {/* Dashboards */}
      {currentPage === 'dashboard' && <BranchDashboard onNavigate={setCurrentPage} />}
      
      {/* Credit Settings */}
      {currentPage === 'loan-products' && <LoanProductsPage />}
      {currentPage === 'interest-rates' && <InterestRatesPage />}
      
      {/* Credit Admin */}
      {currentPage === 'application' && <LoanApplicationPage onNavigate={setCurrentPage} />}
      {currentPage === 'disbursements' && <DisbursementsPage />}
      {currentPage === 'repayments' && <RepaymentsPage />}
      
      {/* Marketing */}
      {currentPage === 'marketing' && <Placeholder title="Marketing Overview" />}
      {currentPage === 'marketing-leads' && <Placeholder title="Marketing Leads" />}

      {/* Expanded Registry */}
      {currentPage === 'borrowers' && <BorrowersPage />}
      {currentPage === 'pending-amendments' && <Placeholder title="Pending Amendments" />}
      {currentPage === 'approvals-pending' && <Placeholder title="Approvals Pending" />}
      {currentPage === 'customer-transfer' && <Placeholder title="Customer Transfer" />}
      {currentPage === 'customer-edits' && <Placeholder title="Customer Edits" />}
      
      {/* Portfolio */}
      {currentPage === 'active-loans' && <ActiveLoansPage onNavigate={setCurrentPage} />}
      
      {/* Reports */}
      {currentPage === 'financial-reports' && <FinancialReportsPage />}
      {currentPage === 'portfolio-report' && <PortfolioReportPage />}
      {currentPage === 'transaction-history' && <TransactionHistoryPage />}
      {currentPage === 'disbursements' && <DisbursementsPage />}
      
      {/* Profile & Settings */}
      {currentPage === 'profile' && <ProfileSettings />}
      {currentPage === 'system-config' && <SystemConfigPage />}
      {currentPage === 'register-staff' && <RegisterStaffPage />}
    </LoanOfficerLayout>
  );
}

export default App;