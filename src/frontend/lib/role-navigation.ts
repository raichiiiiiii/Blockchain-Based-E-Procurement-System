import type { SupportedDashboardRole } from './dashboard-state-resolver';

export type DashboardNavigationTarget =
  | 'dashboard'
  | 'members'
  | 'roles'
  | 'access-history'
  | 'orders'
  | 'source-to-award'
  | 'received-orders'
  | 'delivery-evidence'
  | 'invoices'
  | 'supplier-performance'
  | 'documents'
  | 'contracts'
  | 'organization-network'
  | 'organization-users'
  | 'company-ledger'
  | 'productivity'
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
    { id: 'documents', label: 'Contract Documents' },
    { id: 'contracts', label: 'Contract Negotiation' },
    { id: 'organization-network', label: 'Organization Network' },
    { id: 'organization-users', label: 'Company Users' },
    { id: 'company-ledger', label: 'Company Ledger' },
    { id: 'productivity', label: 'Productivity' },
    { id: 'settings', label: 'Settings' },
    { id: 'logout', label: 'Sign out' },
  ],
  organizationAdmin: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'organization-network', label: 'Organization Network' },
    { id: 'organization-users', label: 'Company Users' },
    { id: 'company-ledger', label: 'Company Ledger' },
    { id: 'productivity', label: 'Productivity' },
    { id: 'members', label: 'Members' },
    { id: 'roles', label: 'Roles' },
    { id: 'settings', label: 'Settings' },
    { id: 'logout', label: 'Sign out' },
  ],
  buyer: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'source-to-award', label: 'Source to Award' },
    { id: 'orders', label: 'Orders' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'supplier-performance', label: 'Supplier Performance' },
    { id: 'documents', label: 'Contract Documents' },
    { id: 'contracts', label: 'Contract Negotiation' },
    { id: 'organization-network', label: 'Organization Network' },
    { id: 'company-ledger', label: 'Company Ledger' },
    { id: 'productivity', label: 'Productivity' },
    { id: 'escrow', label: 'Escrow' },
    { id: 'blockchain-proof', label: 'Blockchain Proof' },
    { id: 'settings', label: 'Settings' },
    { id: 'logout', label: 'Sign out' },
  ],
  supplier: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'source-to-award', label: 'Source to Award' },
    { id: 'received-orders', label: 'Received Orders' },
    { id: 'delivery-evidence', label: 'Delivery Evidence' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'supplier-performance', label: 'Supplier Performance' },
    { id: 'documents', label: 'Contract Documents' },
    { id: 'contracts', label: 'Contract Negotiation' },
    { id: 'organization-network', label: 'Organization Network' },
    { id: 'company-ledger', label: 'Company Ledger' },
    { id: 'productivity', label: 'Productivity' },
    { id: 'escrow', label: 'Escrow' },
    { id: 'settings', label: 'Settings' },
    { id: 'logout', label: 'Sign out' },
  ],
  complianceReviewer: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'documents', label: 'Contract Documents' },
    { id: 'organization-network', label: 'Organization Network' },
    { id: 'company-ledger', label: 'Company Ledger' },
    { id: 'productivity', label: 'Productivity' },
    { id: 'eligibility-status', label: 'Eligibility Status' },
    { id: 'settings', label: 'Settings' },
    { id: 'logout', label: 'Sign out' },
  ],
  shariahReviewer: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'shariah-review', label: 'Shariah Review' },
    { id: 'documents', label: 'Contract Documents' },
    { id: 'organization-network', label: 'Organization Network' },
    { id: 'company-ledger', label: 'Company Ledger' },
    { id: 'productivity', label: 'Productivity' },
    { id: 'settings', label: 'Settings' },
    { id: 'logout', label: 'Sign out' },
  ],
  financier: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'financing', label: 'Financing' },
    { id: 'documents', label: 'Contract Documents' },
    { id: 'contracts', label: 'Contract Negotiation' },
    { id: 'organization-network', label: 'Organization Network' },
    { id: 'company-ledger', label: 'Company Ledger' },
    { id: 'productivity', label: 'Productivity' },
    { id: 'shariah-review', label: 'Shariah Review' },
    { id: 'settings', label: 'Settings' },
    { id: 'logout', label: 'Sign out' },
  ],
  auditor: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'audit-trail', label: 'Audit Trail' },
    { id: 'blockchain-proof', label: 'Blockchain Proof' },
    { id: 'supplier-performance', label: 'Supplier Performance' },
    { id: 'organization-network', label: 'Organization Network' },
    { id: 'company-ledger', label: 'Company Ledger' },
    { id: 'productivity', label: 'Productivity' },
    { id: 'export-bundle', label: 'Export Bundle' },
    { id: 'settings', label: 'Settings' },
    { id: 'logout', label: 'Sign out' },
  ],
  regulator: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'export-bundle', label: 'Export Bundle' },
    { id: 'blockchain-proof', label: 'Blockchain Proof' },
    { id: 'organization-network', label: 'Organization Network' },
    { id: 'company-ledger', label: 'Company Ledger' },
    { id: 'productivity', label: 'Productivity' },
    { id: 'settings', label: 'Settings' },
    { id: 'logout', label: 'Sign out' },
  ],
  securityOperator: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'security-status', label: 'Security Status' },
    { id: 'organization-network', label: 'Organization Network' },
    { id: 'company-ledger', label: 'Company Ledger' },
    { id: 'productivity', label: 'Productivity' },
    { id: 'access-alerts', label: 'Access Alerts' },
    { id: 'proof-failures', label: 'Proof Failures' },
    { id: 'denied-actions', label: 'Denied Actions' },
    { id: 'settings', label: 'Settings' },
    { id: 'logout', label: 'Sign out' },
  ],
};

export function getRoleNavigation(role: SupportedDashboardRole): RoleNavigationItem[] {
  return ROLE_NAVIGATION[role];
}

export function isNavigationTargetAllowed(role: SupportedDashboardRole, target: DashboardNavigationTarget): boolean {
  return ROLE_NAVIGATION[role].some(item => item.id === target);
}
