import { useState } from 'react';
import RunwayPage from './pages/RunwayPage';
import MemberOnboardingPage from './pages/MemberOnboardingPage';
import RoleManagementPage from './pages/RoleManagementPage';
import RoleAssignmentPage from './pages/RoleAssignmentPage';
import ShariahReviewSubmissionPage from './pages/ShariahReviewSubmissionPage';
import ShariahReviewChecklistPage from './pages/ShariahReviewChecklistPage';
import ShariahReviewDecisionPage from './pages/ShariahReviewDecisionPage';
import ShariahReviewHistoryPage from './pages/ShariahReviewHistoryPage';
import DashboardShell from './components/dashboard/DashboardShell';
import { initializeDashboardShell } from './lib/dashboard-contract';

type PageKey = 'dashboard' | 'runway' | 'member-onboarding' | 'role-management' | 'role-assignment' | 'shariah-review-submission' | 'shariah-review-checklist' | 'shariah-review-decision' | 'shariah-review-history';

function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');


  const demoUserContext = {
    userId: 'user-123',
    displayName: 'Admin User',
    roleCodes: ['administrator'],
  };

  const dashboard = initializeDashboardShell(
    demoUserContext.roleCodes,
    demoUserContext.userId,
    demoUserContext.displayName,
  );


  const handlePageChange = (pageKey: string) => {
    // Map targets to actual page keys
    const pageMap: Record<string, PageKey> = {
      'member-onboarding': 'member-onboarding',
      'role-management': 'role-management',
      'role-assignment': 'role-assignment',
      'shariah-reviews': 'shariah-review-submission',
      'shariah-checklists': 'shariah-review-checklist',
      // Add other mappings as needed
    };

    const page = pageMap[pageKey];
    if (page) {
      setCurrentPage(page);
    } else {
      // Default to dashboard for unrecognized pages
      setCurrentPage('dashboard');
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
              onClick={() => setCurrentPage('runway')}
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
              onClick={() => setCurrentPage('dashboard')}
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
              onClick={() => setCurrentPage('runway')}
              style={{
                marginRight: '1rem',
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
            <button
              onClick={() => setCurrentPage('member-onboarding')}
              style={{
                marginRight: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: currentPage === 'member-onboarding' ? '#007bff' : '#fff',
                color: currentPage === 'member-onboarding' ? '#fff' : '#000',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Member Onboarding
            </button>
            <button
              onClick={() => setCurrentPage('role-management')}
              style={{
                marginRight: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: currentPage === 'role-management' ? '#007bff' : '#fff',
                color: currentPage === 'role-management' ? '#fff' : '#000',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Role Management
            </button>
            <button
              onClick={() => setCurrentPage('role-assignment')}
              style={{
                marginRight: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: currentPage === 'role-assignment' ? '#007bff' : '#fff',
                color: currentPage === 'role-assignment' ? '#fff' : '#000',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Role Assignment
            </button>
            <button
              onClick={() => setCurrentPage('shariah-review-submission')}
              style={{
                marginRight: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: currentPage === 'shariah-review-submission' ? '#007bff' : '#fff',
                color: currentPage === 'shariah-review-submission' ? '#fff' : '#000',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Shariah Review Submission
            </button>
            <button
              onClick={() => setCurrentPage('shariah-review-checklist')}
              style={{
                marginRight: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: currentPage === 'shariah-review-checklist' ? '#007bff' : '#fff',
                color: currentPage === 'shariah-review-checklist' ? '#fff' : '#000',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Shariah Checklist
            </button>
            <button
              onClick={() => setCurrentPage('shariah-review-decision')}
              style={{
                marginRight: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: currentPage === 'shariah-review-decision' ? '#007bff' : '#fff',
                color: currentPage === 'shariah-review-decision' ? '#fff' : '#000',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Shariah Decision
            </button>
            <button
              onClick={() => setCurrentPage('shariah-review-history')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: currentPage === 'shariah-review-history' ? '#007bff' : '#fff',
                color: currentPage === 'shariah-review-history' ? '#fff' : '#000',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Shariah History
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
          </div>
        </>
      )}
    </div>
  );
}

export default App;
