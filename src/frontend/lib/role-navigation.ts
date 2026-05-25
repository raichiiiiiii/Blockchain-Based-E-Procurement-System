import type { SupportedDashboardRole } from './dashboard-state-resolver';

export type DashboardNavigationTarget =
  | 'dashboard'
  | 'members'
  | 'roles'
  | 'access-history'
  | 'orders'
  | 'received-orders'
  | 'delivery-evidence'
  | 'escrow'
  | 'blockchain-proof'
  | 'compliance'
  | 'eligibility-status'
  | 'shariah-review'
  | 'financing'
  | 'settings'
  | 'audit-trail'
  | 'export-bundle'
  | 'security-status'
  | 'access-alerts'
  | 'proof-failures'
  | 'denied-actions'
  | 'logout';

export type RoleNavigationItem = {
  id: DashboardNavigationTarget;
  label: string;
};

export const ROLE_NAVIGATION: Record<SupportedDashboardRole, RoleNavigationItem[]> = {
  administrator: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'members', label: 'Members' },
    { id: 'roles', label: 'Roles' },
    { id: 'access-history', label: 'Access History' },
    { id: 'settings', label: 'Settings' },
    { id: 'logout', label: 'Logout' },
  ],
  buyer: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'orders', label: 'Orders' },
    { id: 'escrow', label: 'Escrow' },
    { id: 'blockchain-proof', label: 'Blockchain Proof' },
    { id: 'settings', label: 'Settings' },
    { id: 'logout', label: 'Logout' },
  ],
  supplier: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'received-orders', label: 'Received Orders' },
    { id: 'delivery-evidence', label: 'Delivery Evidence' },
    { id: 'escrow', label: 'Escrow' },
    { id: 'settings', label: 'Settings' },
    { id: 'logout', label: 'Logout' },
  ],
  complianceReviewer: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'eligibility-status', label: 'Eligibility Status' },
    { id: 'settings', label: 'Settings' },
    { id: 'logout', label: 'Logout' },
  ],
  shariahReviewer: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'shariah-review', label: 'Shariah Review' },
    { id: 'settings', label: 'Settings' },
    { id: 'logout', label: 'Logout' },
  ],
  financier: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'financing', label: 'Financing' },
    { id: 'shariah-review', label: 'Shariah Review' },
    { id: 'settings', label: 'Settings' },
    { id: 'logout', label: 'Logout' },
  ],
  auditor: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'audit-trail', label: 'Audit Trail' },
    { id: 'blockchain-proof', label: 'Blockchain Proof' },
    { id: 'export-bundle', label: 'Export Bundle' },
    { id: 'settings', label: 'Settings' },
    { id: 'logout', label: 'Logout' },
  ],
  regulator: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'export-bundle', label: 'Export Bundle' },
    { id: 'blockchain-proof', label: 'Blockchain Proof' },
    { id: 'settings', label: 'Settings' },
    { id: 'logout', label: 'Logout' },
  ],
  securityOperator: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'security-status', label: 'Security Status' },
    { id: 'access-alerts', label: 'Access Alerts' },
    { id: 'proof-failures', label: 'Proof Failures' },
    { id: 'denied-actions', label: 'Denied Actions' },
    { id: 'settings', label: 'Settings' },
    { id: 'logout', label: 'Logout' },
  ],
};

export function getRoleNavigation(role: SupportedDashboardRole): RoleNavigationItem[] {
  return ROLE_NAVIGATION[role];
}

export function isNavigationTargetAllowed(role: SupportedDashboardRole, target: DashboardNavigationTarget): boolean {
  return ROLE_NAVIGATION[role].some(item => item.id === target);
}
