import { DashboardRoleCode, DashboardShell, DashboardNavigationGroup, DashboardWidgetZone, DashboardWidget } from '../types/dashboard';

// Role priority order as defined in API_CONTRACTS.md section 15.7
const ROLE_PRIORITY: DashboardRoleCode[] = [
  'administrator',
  'auditor',
  'securityOperator',
  'complianceReviewer',
  'shariahReviewer',
  'financier',
  'buyer',
  'supplier'
];

// Check if a role code is one of our canonical dashboard roles
export function isCanonicalDashboardRole(roleCode: string): roleCode is DashboardRoleCode {
  return ROLE_PRIORITY.includes(roleCode as DashboardRoleCode);
}

// Get the highest priority role from a list of roles
export function getHighestPriorityRole(roles: string[]): DashboardRoleCode | null {
  for (const priorityRole of ROLE_PRIORITY) {
    if (roles.includes(priorityRole)) {
      return priorityRole;
    }
  }
  return null;
}

// Define widget zones as per API_CONTRACTS.md section 15.4
export const WIDGET_ZONES: Record<string, DashboardWidgetZone> = {
  summary: {
    id: 'summary',
    label: 'Summary',
    purpose: 'High-level overview information',
    ordering: 'priority',
    emptyState: {
      message: 'No summary data available'
    }
  },
  primary: {
    id: 'primary',
    label: 'Primary',
    purpose: 'Main functional area for primary role activities',
    ordering: 'fixed',
    emptyState: {
      message: 'No primary widgets available'
    }
  },
  secondary: {
    id: 'secondary',
    label: 'Secondary',
    purpose: 'Supporting information and tools',
    ordering: 'fixed',
    emptyState: {
      message: 'No secondary widgets available'
    }
  },
  actions: {
    id: 'actions',
    label: 'Actions',
    purpose: 'Quick access to common actions',
    ordering: 'fixed',
    emptyState: {
      message: 'No quick actions available'
    }
  },
  alerts: {
    id: 'alerts',
    label: 'Alerts',
    purpose: 'Notifications and warnings',
    ordering: 'chronological',
    emptyState: {
      message: 'No alerts'
    }
  },
  investigation: {
    id: 'investigation',
    label: 'Investigation',
    purpose: 'Specialized area for investigative workflows',
    ordering: 'fixed',
    emptyState: {
      message: 'No investigation tools available'
    }
  }
};

// Define navigation groups for each role
export const ROLE_NAVIGATION_GROUPS: Record<DashboardRoleCode, DashboardNavigationGroup[]> = {
  administrator: [
    {
      id: 'admin-membership',
      label: 'Membership',
      items: [
        {
          id: 'member-onboarding',
          label: 'Member Onboarding',
          target: 'member-onboarding',
          allowedRoles: ['administrator'],
          visibility: 'visible',
          blockedBehavior: 'hide'
        },
        {
          id: 'member-management',
          label: 'Member Management',
          target: 'member-management',
          allowedRoles: ['administrator'],
          visibility: 'visible',
          blockedBehavior: 'hide'
        }
      ]
    },
    {
      id: 'admin-access',
      label: 'Access Control',
      items: [
        {
          id: 'role-management',
          label: 'Role Management',
          target: 'role-management',
          allowedRoles: ['administrator'],
          visibility: 'visible',
          blockedBehavior: 'hide'
        },
        {
          id: 'role-assignment',
          label: 'Role Assignment',
          target: 'role-assignment',
          allowedRoles: ['administrator'],
          visibility: 'visible',
          blockedBehavior: 'hide'
        }
      ]
    }
  ],
  buyer: [
    {
      id: 'procurement',
      label: 'Procurement',
      items: [
        {
          id: 'tenders',
          label: 'Tenders',
          target: 'tenders',
          allowedRoles: ['buyer'],
          visibility: 'visible',
          blockedBehavior: 'hide'
        },
        {
          id: 'orders',
          label: 'Orders',
          target: 'orders',
          allowedRoles: ['buyer'],
          visibility: 'visible',
          blockedBehavior: 'hide'
        }
      ]
    }
  ],
  supplier: [
    {
      id: 'supply',
      label: 'Supply',
      items: [
        {
          id: 'responses',
          label: 'Tender Responses',
          target: 'responses',
          allowedRoles: ['supplier'],
          visibility: 'visible',
          blockedBehavior: 'hide'
        },
        {
          id: 'deliveries',
          label: 'Deliveries',
          target: 'deliveries',
          allowedRoles: ['supplier'],
          visibility: 'visible',
          blockedBehavior: 'hide'
        }
      ]
    }
  ],
  financier: [
    {
      id: 'finance',
      label: 'Financing',
      items: [
        {
          id: 'facilities',
          label: 'Financing Facilities',
          target: 'facilities',
          allowedRoles: ['financier'],
          visibility: 'visible',
          blockedBehavior: 'hide'
        },
        {
          id: 'settlements',
          label: 'Settlements',
          target: 'settlements',
          allowedRoles: ['financier'],
          visibility: 'visible',
          blockedBehavior: 'hide'
        }
      ]
    }
  ],
  complianceReviewer: [
    {
      id: 'compliance',
      label: 'Compliance',
      items: [
        {
          id: 'kyc-queue',
          label: 'KYC Queue',
          target: 'kyc-queue',
          allowedRoles: ['complianceReviewer'],
          visibility: 'visible',
          blockedBehavior: 'hide'
        },
        {
          id: 'aml-reviews',
          label: 'AML Reviews',
          target: 'aml-reviews',
          allowedRoles: ['complianceReviewer'],
          visibility: 'visible',
          blockedBehavior: 'hide'
        }
      ]
    }
  ],
  shariahReviewer: [
    {
      id: 'shariah',
      label: 'Shariah Governance',
      items: [
        {
          id: 'reviews',
          label: 'Shariah Reviews',
          target: 'shariah-reviews',
          allowedRoles: ['shariahReviewer'],
          visibility: 'visible',
          blockedBehavior: 'hide'
        },
        {
          id: 'checklists',
          label: 'Checklists',
          target: 'shariah-checklists',
          allowedRoles: ['shariahReviewer'],
          visibility: 'visible',
          blockedBehavior: 'hide'
        }
      ]
    }
  ],
  auditor: [
    {
      id: 'audit',
      label: 'Audit',
      items: [
        {
          id: 'access-history',
          label: 'Access History',
          target: 'access-history',
          allowedRoles: ['auditor'],
          visibility: 'visible',
          blockedBehavior: 'hide'
        },
        {
          id: 'investigations',
          label: 'Investigations',
          target: 'investigations',
          allowedRoles: ['auditor'],
          visibility: 'visible',
          blockedBehavior: 'hide'
        }
      ]
    }
  ],
  securityOperator: [
    {
      id: 'security',
      label: 'Security',
      items: [
        {
          id: 'monitoring',
          label: 'Monitoring',
          target: 'monitoring',
          allowedRoles: ['securityOperator'],
          visibility: 'visible',
          blockedBehavior: 'hide'
        },
        {
          id: 'incidents',
          label: 'Incidents',
          target: 'incidents',
          allowedRoles: ['securityOperator'],
          visibility: 'visible',
          blockedBehavior: 'hide'
        }
      ]
    }
  ]
};

// Create placeholder widgets for each role and zone
export function createPlaceholderWidgets(role: DashboardRoleCode): DashboardWidget[] {
  const zones = Object.keys(WIDGET_ZONES);
  return zones.flatMap(zoneId => {
    // Create 1-2 placeholder widgets per zone
    const widgetCount = zoneId === 'primary' ? 2 : 1;

    return Array.from({ length: widgetCount }, (_, i) => ({
      id: `${role}-${zoneId}-widget-${i + 1}`,
      title: `${zoneId.charAt(0).toUpperCase() + zoneId.slice(1)} Widget ${i + 1}`,
      zoneId,
      allowedRoles: [role],
      status: 'placeholder' as const,
      downstreamPbi: 'PBI-173', // This PBI implements the base shell
      placeholder: true
    }));
  });
}

// Initialize dashboard shell based on user roles
export function initializeDashboardShell(
  userRoles: string[],
  userId: string,
  displayName?: string,
  requestedActiveRoleCode?: string,
): DashboardShell {
  if (userRoles.length === 0) {
    return {
      userContext: { userId, displayName },
      availableRoleCodes: [],
      navigationGroups: [],
      widgetZones: WIDGET_ZONES,
      widgets: [],
      shellState: 'noRole',
    };
  }

  const canonicalRoles = userRoles.filter(isCanonicalDashboardRole);

  if (canonicalRoles.length === 0) {
    return {
      userContext: { userId, displayName },
      availableRoleCodes: userRoles,
      navigationGroups: [],
      widgetZones: WIDGET_ZONES,
      widgets: [],
      shellState: 'unsupportedRole',
    };
  }

  const requestedRole =
    requestedActiveRoleCode &&
    userRoles.includes(requestedActiveRoleCode) &&
    isCanonicalDashboardRole(requestedActiveRoleCode)
      ? requestedActiveRoleCode
      : null;

  const activeRole = requestedRole ?? getHighestPriorityRole(canonicalRoles);

  if (!activeRole) {
    return {
      userContext: { userId, displayName },
      availableRoleCodes: userRoles,
      navigationGroups: [],
      widgetZones: WIDGET_ZONES,
      widgets: [],
      shellState: 'unsupportedRole',
    };
  }

  return {
    userContext: { userId, displayName },
    activeRoleCode: activeRole,
    availableRoleCodes: canonicalRoles,
    navigationGroups: ROLE_NAVIGATION_GROUPS[activeRole],
    widgetZones: WIDGET_ZONES,
    widgets: createPlaceholderWidgets(activeRole),
    shellState: 'ready',
  };
}
