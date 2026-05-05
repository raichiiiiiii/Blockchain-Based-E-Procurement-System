import { useState } from 'react';
import RunwayPage from './pages/RunwayPage';
import MemberOnboardingPage from './pages/MemberOnboardingPage';
import RoleManagementPage from './pages/RoleManagementPage';
import RoleAssignmentPage from './pages/RoleAssignmentPage';

type PageKey = 'runway' | 'member-onboarding' | 'role-management' | 'role-assignment';

function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>('runway');

  return (
    <div className="app">
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
      </nav>
      
      <div>
        {currentPage === 'runway' && <RunwayPage />}
        {currentPage === 'member-onboarding' && <MemberOnboardingPage />}
        {currentPage === 'role-management' && <RoleManagementPage />}
        {currentPage === 'role-assignment' && <RoleAssignmentPage />}
      </div>
    </div>
  );
}

export default App;
