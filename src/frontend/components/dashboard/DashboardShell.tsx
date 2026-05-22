import React from 'react';
import { DashboardShell as DashboardShellType } from '../../types/dashboard';
import DashboardNavigation from './DashboardNavigation';
import DashboardWidgetZone from './DashboardWidgetZone';
import DashboardStateMessage from './DashboardStateMessage';

interface DashboardShellProps {
  dashboard: DashboardShellType;
  onPageChange: (pageKey: string) => void;
}

const DashboardShell: React.FC<DashboardShellProps> = ({ dashboard, onPageChange }) => {
  const { 
    shellState, 
    userContext, 
    activeRoleCode, 
    availableRoleCodes, 
    navigationGroups, 
    widgetZones, 
    widgets 
  } = dashboard;

  // Render shell state messages
  if (shellState !== 'ready') {
    return (
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <h1>Dashboard</h1>
        </header>
        <main className="dashboard-content">
          <DashboardStateMessage state={shellState} />
        </main>
      </div>
    );
  }

  // Render normal dashboard
  return (
    <div className="dashboard-shell">
      {/* Header Region */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Dashboard</h1>
          <div className="user-context">
            <span>Hello, {userContext.displayName || userContext.userId}</span>
            {activeRoleCode && (
              <span className="active-role">Role: {activeRoleCode}</span>
            )}
          </div>
        </div>
      </header>

      <div className="dashboard-main">
        {/* Navigation Region */}
        <nav className="dashboard-navigation">
          <DashboardNavigation
            navigationGroups={navigationGroups}
            activeRoleCode={activeRoleCode}
            onPageChange={onPageChange}
          />

          {/* Role switcher for users with multiple roles */}
          {availableRoleCodes.length > 1 && (
            <div className="role-switcher">
              <h3>Switch Role</h3>
              <ul>
                {availableRoleCodes.map(role => (
                  <li key={role}>
                    <span className={activeRoleCode === role ? 'active-role-option' : undefined}>
                      {role}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        {/* Content Region with Widget Zones */}
        <main className="dashboard-content">
          <div className="widget-zones">
            {Object.values(widgetZones).map(zone => (
              <DashboardWidgetZone
                key={zone.id}
                zone={zone}
                widgets={widgets.filter(w => w.zoneId === zone.id)}
              />
            ))}
          </div>
        </main>
      </div>

      {/* Footer Region */}
      <footer className="dashboard-footer">
        <p>Platform Dashboard v1.0</p>
      </footer>
    </div>
  );
};

export default DashboardShell;
