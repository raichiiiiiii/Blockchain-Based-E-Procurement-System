import type { ReactNode } from 'react';
import type { SupportedDashboardRole } from '../../lib/dashboard-state-resolver';
import type { DashboardNavigationTarget, RoleNavigationItem } from '../../lib/role-navigation';

type AppLayoutProps = {
  role: SupportedDashboardRole;
  actorLabel: string;
  organizationLabel?: string;
  activeTarget: DashboardNavigationTarget;
  navigationItems: RoleNavigationItem[];
  children: ReactNode;
  onNavigate: (target: DashboardNavigationTarget) => void;
};

const roleLabels: Record<SupportedDashboardRole, string> = {
  administrator: 'Administrator',
  buyer: 'Buyer',
  supplier: 'Supplier',
  complianceReviewer: 'Compliance Reviewer',
  shariahReviewer: 'Shariah Reviewer',
  financier: 'Financier',
  auditor: 'Auditor',
  regulator: 'Regulator',
  securityOperator: 'Security Operator',
};

function AppLayout({
  role,
  actorLabel,
  organizationLabel,
  activeTarget,
  navigationItems,
  children,
  onNavigate,
}: AppLayoutProps) {
  return (
    <div className="app-layout">
      <aside className="app-sidebar" aria-label={`${roleLabels[role]} navigation`}>
        <div className="brand-lockup app-sidebar-brand" aria-label="PLS procurement platform">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>PLS Procurement</span>
        </div>
        <nav className="app-sidebar-nav">
          {navigationItems.map(item => (
            <button
              className={activeTarget === item.id ? 'nav-item nav-item-active' : 'nav-item'}
              type="button"
              key={item.id}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="app-layout-main">
        <header className="app-dashboard-header">
          <div>
            <p className="dashboard-role-label">{roleLabels[role]} workspace</p>
            <h1>{activeTarget === 'dashboard' ? 'Dashboard' : navigationItems.find(item => item.id === activeTarget)?.label}</h1>
          </div>
          <div className="dashboard-actor-card">
            <span>{actorLabel}</span>
            {organizationLabel && <strong>{organizationLabel}</strong>}
          </div>
        </header>

        <main className="app-dashboard-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
