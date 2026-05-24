import React from 'react';
import { DashboardNavigationGroup, DashboardRoleCode } from '../../types/dashboard';
import { filterNavigationGroupsByRole } from '../../lib/dashboard-contract';

interface DashboardNavigationProps {
  navigationGroups: DashboardNavigationGroup[];
  activeRoleCode: DashboardRoleCode | undefined;
  onPageChange: (pageKey: string) => void;
}

const DashboardNavigation: React.FC<DashboardNavigationProps> = ({ 
  navigationGroups, 
  activeRoleCode,
  onPageChange 
}) => {
  // Filter navigation groups based on active role
  const filteredNavigationGroups = filterNavigationGroupsByRole(navigationGroups, activeRoleCode);

  return (
    <div className="dashboard-navigation-content">
      {filteredNavigationGroups.map(group => (
        <div key={group.id} className="navigation-group">
          <h3>{group.label}</h3>
          <ul>
            {group.items.map(item => (
              <li key={item.id}>
                <button onClick={() => onPageChange(item.target)}>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      
      {/* Role switcher for users with multiple roles */}
      {/* This would be implemented in a more complete solution */}
    </div>
  );
};

export default DashboardNavigation;
