import type { SupportedDashboardRole } from './dashboard-state-resolver';

export type DashboardNavigationTarget =
  | 'dashboard'
  | 'orders'
  | 'escrow'
  | 'blockchain-proof'
  | 'settings'
  | 'audit-trail'
  | 'export-bundle'
  | 'logout';

export type RoleNavigationItem = {
  id: DashboardNavigationTarget;
  label: string;
};

export const ROLE_NAVIGATION: Record<SupportedDashboardRole, RoleNavigationItem[]> = {
  buyer: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'orders', label: 'Orders' },
    { id: 'escrow', label: 'Escrow' },
    { id: 'blockchain-proof', label: 'Blockchain Proof' },
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
};

export function getRoleNavigation(role: SupportedDashboardRole): RoleNavigationItem[] {
  return ROLE_NAVIGATION[role];
}

export function isNavigationTargetAllowed(role: SupportedDashboardRole, target: DashboardNavigationTarget): boolean {
  return ROLE_NAVIGATION[role].some(item => item.id === target);
}
