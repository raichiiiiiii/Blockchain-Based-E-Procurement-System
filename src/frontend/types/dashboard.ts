// Dashboard contract types aligned with API_CONTRACTS.md section 15

export type DashboardRoleCode =
  | 'administrator'
  | 'buyer'
  | 'supplier'
  | 'financier'
  | 'complianceReviewer'
  | 'shariahReviewer'
  | 'auditor'
  | 'securityOperator';

export interface DashboardShell {
  userContext: {
    userId: string;
    displayName?: string;
  };
  activeRoleCode?: DashboardRoleCode;
  availableRoleCodes: string[];
  navigationGroups: DashboardNavigationGroup[];
  widgetZones: Record<string, DashboardWidgetZone>;
  widgets: DashboardWidget[];
  shellState: 'ready' | 'noRole' | 'unsupportedRole' | 'forbidden' | 'loading' | 'error';
}

export interface DashboardNavigationGroup {
  id: string;
  label: string;
  items: DashboardNavigationItem[];
}

export interface DashboardNavigationItem {
  id: string;
  label: string;
  target: string; // route or page key
  allowedRoles: DashboardRoleCode[]; // roleCodes
  requiredPermissions?: string[]; // Optional specific permissions
  visibility: 'visible' | 'hidden' | 'conditional';
  blockedBehavior: 'hide' | 'showBlockedState';
}

export interface DashboardWidgetZone {
  id: string;
  label: string;
  purpose: string;
  ordering: 'priority' | 'workflow' | 'chronological' | 'fixed';
  emptyState: {
    message: string;
    icon?: string;
  };
}

export interface DashboardWidget {
  id: string;
  title: string;
  zoneId: string; // References a widget zone
  allowedRoles: DashboardRoleCode[]; // roleCodes
  requiredPermissions?: string[]; // Optional specific permissions
  status: 'placeholder' | 'loading' | 'active' | 'unavailable' | 'error';
  downstreamPbi: string; // Reference to the PBI that implements this widget
  placeholder?: boolean; // Whether this is a placeholder widget
}
