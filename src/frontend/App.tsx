import { useState } from 'react';
import RunwayPage from './pages/RunwayPage';
import MemberOnboardingPage from './pages/MemberOnboardingPage';
import RoleManagementPage from './pages/RoleManagementPage';
import RoleAssignmentPage from './pages/RoleAssignmentPage';
import ShariahReviewSubmissionPage from './pages/ShariahReviewSubmissionPage';
import ShariahReviewChecklistPage from './pages/ShariahReviewChecklistPage';
import ShariahReviewDecisionPage from './pages/ShariahReviewDecisionPage';
import ShariahReviewHistoryPage from './pages/ShariahReviewHistoryPage';
import AccessHistorySearchPage from './pages/AccessHistorySearchPage';
import AccessEventDetailPage from './pages/AccessEventDetailPage';
import AccessEventSequencePage from './pages/AccessEventSequencePage';
import SecurityInvestigationPlaceholderPage from './pages/SecurityInvestigationPlaceholderPage';
import DashboardShell from './components/dashboard/DashboardShell';
import { initializeDashboardShell } from './lib/dashboard-contract';
import { resolveDashboardTargetAccess } from './lib/dashboard-contract';
import { DashboardRoleCode } from './types/dashboard';

type PageKey = 'dashboard' | 'runway' | 'member-onboarding' | 'role-management' | 'role-assignment' | 'shariah-review-submission' | 'shariah-review-checklist' | 'shariah-review-decision' | 'shariah-review-history' | 'access-history-search' | 'access-event-detail' | 'access-event-sequence' | 'security-investigation';

function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');
  const [dashboardShellState, setDashboardShellState] = useState<'ready' | 'forbidden' | 'error'>('ready');

  const demoUserContext = {
    userId: 'user-123',
    displayName: 'Admin User',
    roleCodes: ['administrator', 'auditor', 'securityOperator'],
  };

  const dashboard = initializeDashboardShell(
    demoUserContext.roleCodes,
    demoUserContext.userId,
    demoUserContext.displayName,
  );

  // Update dashboard shell state based on access resolution
  if (dashboardShellState !== 'ready') {
    dashboard.shellState = dashboardShellState;
  }

  const handlePageChange = (target: string) => {
    // Resolve access for the target
    const access = resolveDashboardTargetAccess(target, dashboard.activeRoleCode);
    
    switch (access) {
      case 'allowed':
        // Check if the target has an implemented page
        const targetInfo = Object.values(resolveDashboardTargetAccess as any).find(
          (t: any) => t.target === target
        );
        
        // We need to map targets to page keys
        const targetToPageKey: Record<string, PageKey> = {
          'member-onboarding': 'member-onboarding',
          'role-management': 'role-management',
          'role-assignment': 'role-assignment',
          'shariah-reviews': 'shariah-review-submission',
          'shariah-checklists': 'shariah-review-checklist',
          'shariah-decisions': 'shariah-review-decision',
          'shariah-history': 'shariah-review-history',
          'runway': 'runway',
          'access-history-search': 'access-history-search',
          'access-event-detail': 'access-event-detail',
          'access-event-sequence': 'access-event-sequence',
          'security-investigation': 'security-investigation'
        };

        const pageKey = targetToPageKey[target];
        if (pageKey) {
          setCurrentPage(pageKey);
          setDashboardShellState('ready');
        } else {
          // Target is allowed but page is not implemented
          setDashboardShellState('error');
        }
        break;
        
      case 'forbidden':
        setDashboardShellState('forbidden');
        setCurrentPage('dashboard');
        break;
        
      case 'unavailable':
      case 'unknown':
        setDashboardShellState('error');
        setCurrentPage('dashboard');
        break;
    }
  };

  return (
    <div className="app">
      {currentPage === 'dashboard' ? (
        <>
          <nav style={{
            padding: '1rem',
            borderBottom: '1px solid #ccc',
            backgroundColor: '#f5f5f5'
          }}>
            <button
              onClick={() => {
                setCurrentPage('runway');
                setDashboardShellState('ready');
              }}
              style={{
                marginRight: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#fff',
                color: '#000',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Frontend Runway
            </button>
          </nav>
          <DashboardShell
            dashboard={dashboard}
            onPageChange={handlePageChange}
          />
        </>
      ) : (
        <>
          <nav style={{
            padding: '1rem',
            borderBottom: '1px solid #ccc',
            backgroundColor: '#f5f5f5'
          }}>
            <button
              onClick={() => {
                setCurrentPage('dashboard');
                setDashboardShellState('ready');
              }}
              style={{
                marginRight: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#007bff',
                color: '#fff',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                setCurrentPage('runway');
                setDashboardShellState('ready');
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: currentPage === 'runway' ? '#007bff' : '#fff',
                color: currentPage === 'runway' ? '#fff' : '#000',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Frontend Runway
            </button>
          </nav>

          <div>
            {currentPage === 'runway' && <RunwayPage />}
            {currentPage === 'member-onboarding' && <MemberOnboardingPage />}
            {currentPage === 'role-management' && <RoleManagementPage />}
            {currentPage === 'role-assignment' && <RoleAssignmentPage />}
            {currentPage === 'shariah-review-submission' && <ShariahReviewSubmissionPage />}
            {currentPage === 'shariah-review-checklist' && <ShariahReviewChecklistPage />}
            {currentPage === 'shariah-review-decision' && <ShariahReviewDecisionPage />}
            {currentPage === 'shariah-review-history' && <ShariahReviewHistoryPage />}
            {currentPage === 'access-history-search' && <AccessHistorySearchPage />}
            {currentPage === 'access-event-detail' && <AccessEventDetailPage />}
            {currentPage === 'access-event-sequence' && <AccessEventSequencePage />}
            {currentPage === 'security-investigation' && <SecurityInvestigationPlaceholderPage />}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
