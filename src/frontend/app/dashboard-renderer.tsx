import AdminDashboard from '../pages/AdminDashboard';
import BuyerDashboard from '../pages/BuyerDashboard';
import SupplierDashboard from '../pages/SupplierDashboard';
import ComplianceDashboard from '../pages/ComplianceDashboard';
import AuditorDashboard from '../pages/AuditorDashboard';
import RegulatorDashboard from '../pages/RegulatorDashboard';
import SecurityDashboard from '../pages/SecurityDashboard';
import ShariahDashboard from '../pages/ShariahDashboard';
import FinancingDashboard from '../pages/FinancingDashboard';
import RoleDashboard from '../pages/RoleDashboard';
import DocumentWorkspacePage from '../pages/DocumentWorkspacePage';
import ContractNegotiationPage from '../pages/ContractNegotiationPage';
import OrganizationNetworkPage from '../pages/OrganizationNetworkPage';
import OrganizationUsersPage from '../pages/OrganizationUsersPage';
import AccountSettingsPage from '../pages/AccountSettingsPage';
import CompanyLedgerPage from '../pages/CompanyLedgerPage';
import CompanyProductivityPage from '../pages/CompanyProductivityPage';
import InvoiceWorkspacePage from '../pages/InvoiceWorkspacePage';
import SourceToAwardPage from '../pages/SourceToAwardPage';
import SupplierPerformancePage from '../pages/SupplierPerformancePage';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type { SupportedDashboardRole } from '../lib/dashboard-state-resolver';
import type { DashboardNavigationTarget } from '../lib/role-navigation';

export function renderRoleDashboard(
  role: SupportedDashboardRole,
  activeTarget: DashboardNavigationTarget,
  session: AuthenticatedFrontendSession,
  onOpenCompanyLedger: () => void,
) {
  if (activeTarget === 'settings') {
    return <AccountSettingsPage session={session} />;
  }

  if (activeTarget === 'company-ledger') {
    return <CompanyLedgerPage session={session} />;
  }

  if (activeTarget === 'productivity') {
    return <CompanyProductivityPage session={session} />;
  }

  if (activeTarget === 'source-to-award') {
    return <SourceToAwardPage session={session} />;
  }

  if (activeTarget === 'invoices') {
    return <InvoiceWorkspacePage session={session} />;
  }

  if (activeTarget === 'supplier-performance') {
    return <SupplierPerformancePage session={session} />;
  }

  if (activeTarget === 'organization-users') {
    return <OrganizationUsersPage session={session} />;
  }

  if (activeTarget === 'documents') {
    return <DocumentWorkspacePage session={session} />;
  }

  if (activeTarget === 'contracts') {
    return <ContractNegotiationPage session={session} />;
  }

  if (activeTarget === 'organization-network') {
    return <OrganizationNetworkPage session={session} onOpenCompanyLedger={onOpenCompanyLedger} />;
  }

  if (role === 'buyer') {
    return <BuyerDashboard activeTarget={activeTarget} session={session} />;
  }

  if (role === 'administrator') {
    return <AdminDashboard activeTarget={activeTarget} session={session} />;
  }

  if (role === 'supplier') {
    return <SupplierDashboard activeTarget={activeTarget} session={session} />;
  }

  if (role === 'complianceReviewer') {
    return <ComplianceDashboard activeTarget={activeTarget} session={session} />;
  }

  if (role === 'auditor') {
    return <AuditorDashboard activeTarget={activeTarget} session={session} />;
  }

  if (role === 'regulator') {
    return <RegulatorDashboard activeTarget={activeTarget} session={session} />;
  }

  if (role === 'securityOperator') {
    return <SecurityDashboard activeTarget={activeTarget} session={session} />;
  }

  if (role === 'shariahReviewer') {
    return <ShariahDashboard activeTarget={activeTarget} session={session} />;
  }

  if (role === 'financier') {
    return <FinancingDashboard activeTarget={activeTarget} session={session} />;
  }

  return <RoleDashboard role={role} activeTarget={activeTarget} />;
}
