import React from 'react';
import { DashboardNavigationGroup } from '../../types/dashboard';

interface DashboardNavigationProps {
  navigationGroups: DashboardNavigationGroup[];
  onPageChange: (pageKey: string) => void;
}

const DashboardNavigation: React.FC<DashboardNavigationProps> = ({ navigationGroups, onPageChange }) => {
  return (
    <div className="dashboard-navigation-content">
      {navigationGroups.map(group => (
        <div key={group.id} className="navigation-group">
          <h3>{group.label}</h3>
          <ul>
            {group.items
              .filter(item => item.visibility === 'visible')
              .map(item => (
                <li key={item.id}>
                  <button onClick={() => onPageChange(item.target)}>
                    {item.label}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default DashboardNavigation;
