import { useEffect, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
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
  organizationAdmin: 'Organization Admin',
  buyer: 'Buyer',
  supplier: 'Supplier',
  complianceReviewer: 'Compliance Reviewer',
  shariahReviewer: 'Shariah Reviewer',
  financier: 'Financier',
  auditor: 'Auditor',
  regulator: 'Regulator',
  securityOperator: 'Security Operator',
};

const navigationIconLabels: Record<DashboardNavigationTarget, string> = {
  dashboard: 'D',
  members: 'M',
  roles: 'R',
  'access-history': 'A',
  orders: 'O',
  'source-to-award': 'S',
  'received-orders': 'O',
  'delivery-evidence': 'E',
  invoices: 'I',
  'supplier-performance': 'V',
  documents: 'C',
  contracts: 'N',
  'organization-network': 'G',
  'organization-users': 'U',
  'company-ledger': 'L',
  productivity: 'T',
  escrow: 'E',
  'blockchain-proof': 'P',
  compliance: 'C',
  'eligibility-status': 'S',
  'shariah-review': 'S',
  financing: 'F',
  settings: 'S',
  'audit-trail': 'A',
  'export-bundle': 'X',
  'security-status': 'S',
  'access-alerts': 'A',
  'proof-failures': 'P',
  'denied-actions': 'D',
  logout: 'Q',
};

const SIDEBAR_WIDTH_STORAGE_KEY = 'pls.layout.sidebarWidth.v1';
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'pls.layout.sidebarCollapsed.v1';
const minSidebarWidth = 220;
const maxSidebarWidth = 360;
const collapsedSidebarWidth = 84;

function clampSidebarWidth(width: number): number {
  return Math.min(maxSidebarWidth, Math.max(minSidebarWidth, width));
}

function readStoredSidebarWidth(): number {
  if (typeof window === 'undefined') {
    return 272;
  }

  const stored = Number(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
  return Number.isFinite(stored) ? clampSidebarWidth(stored) : 272;
}

function readStoredSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
}

function AppLayout({
  role,
  actorLabel,
  organizationLabel,
  activeTarget,
  navigationItems,
  children,
  onNavigate,
}: AppLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(readStoredSidebarWidth);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(readStoredSidebarCollapsed);
  const activeLabel = activeTarget === 'dashboard'
    ? 'Dashboard'
    : navigationItems.find(item => item.id === activeTarget)?.label;
  const layoutStyle = {
    '--sidebar-width': `${isSidebarCollapsed ? collapsedSidebarWidth : sidebarWidth}px`,
  } as CSSProperties;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const handleResizePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
      return;
    }

    const startX = event.clientX;
    const startWidth = sidebarWidth;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setSidebarWidth(clampSidebarWidth(startWidth + moveEvent.clientX - startX));
    };

    const stopResize = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize);
  };

  return (
    <div className={`app-layout${isSidebarCollapsed ? ' app-layout-nav-collapsed' : ''}`} style={layoutStyle}>
      <aside className="app-sidebar" aria-label={`${roleLabels[role]} navigation`}>
        <div className="brand-lockup app-sidebar-brand" aria-label="PLS procurement platform">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span className="app-sidebar-brand-text">PLS Procurement</span>
        </div>
        <nav className="app-sidebar-nav">
          {navigationItems.map(item => (
            <button
              className={activeTarget === item.id ? 'nav-item nav-item-active' : 'nav-item'}
              type="button"
              key={item.id}
              onClick={() => onNavigate(item.id)}
              aria-label={item.label}
              title={item.label}
            >
              <span className="nav-item-icon" aria-hidden="true">{navigationIconLabels[item.id]}</span>
              <span className="nav-item-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <button
          className="app-sidebar-collapse"
          type="button"
          onClick={() => setIsSidebarCollapsed(current => !current)}
          aria-label={isSidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          title={isSidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          <span aria-hidden="true">{isSidebarCollapsed ? '>' : '<'}</span>
        </button>
        <button
          className="app-sidebar-resize"
          type="button"
          onPointerDown={handleResizePointerDown}
          aria-label="Resize navigation panel"
          title="Resize navigation panel"
        />
      </aside>

      <div className="app-layout-main">
        <header className="app-dashboard-header">
          <div>
            <p className="dashboard-role-label">{roleLabels[role]} workspace</p>
            <h1>{activeLabel}</h1>
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
