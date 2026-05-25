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

// Filter widgets by active role code for security hardening
export function filterWidgetsByRole(
  widgets: DashboardWidget[],
  activeRoleCode: DashboardRoleCode | undefined
): DashboardWidget[] {
  if (!activeRoleCode) {
    // If no active role, only show widgets that allow all roles (empty allowedRoles array)
    return widgets.filter(widget => widget.allowedRoles.length === 0);
  }

  // Filter widgets to only include those allowed for the active role
  return widgets.filter(widget => 
    widget.allowedRoles.includes(activeRoleCode)
  );
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
          id: 'access-history-search',
          label: 'Access History Search',
          target: 'access-history-search',
          allowedRoles: ['auditor'],
          visibility: 'visible',
          blockedBehavior: 'hide'
        },
        {
          id: 'access-event-detail',
          label: 'Event Detail',
          target: 'access-event-detail',
          allowedRoles: ['auditor'],
          visibility: 'visible',
          blockedBehavior: 'hide'
        },
        {
          id: 'access-event-sequence',
          label: 'Event Sequence',
          target: 'access-event-sequence',
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
          id: 'security-investigation',
          label: 'Security Investigation',
          target: 'security-investigation',
          allowedRoles: ['securityOperator'],
          visibility: 'visible',
          blockedBehavior: 'hide'
        }
      ]
    }
  ]
};

// Define known dashboard targets with availability status
export const DASHBOARD_TARGETS: Record<string, {
  target: string;
  label: string;
  allowedRoles: DashboardRoleCode[];
  pageKey?: string;
  availability: 'available' | 'placeholder';
  blockedMessage?: string;
  unavailableMessage?: string;
}> = {
  // Implemented pages
  'member-onboarding': {
    target: 'member-onboarding',
    label: 'Member Onboarding',
    allowedRoles: ['administrator'],
    pageKey: 'member-onboarding',
    availability: 'available'
  },
  'role-management': {
    target: 'role-management',
    label: 'Role Management',
    allowedRoles: ['administrator'],
    pageKey: 'role-management',
    availability: 'available'
  },
  'role-assignment': {
    target: 'role-assignment',
    label: 'Role Assignment',
    allowedRoles: ['administrator'],
    pageKey: 'role-assignment',
    availability: 'available'
  },
  'shariah-reviews': {
    target: 'shariah-reviews',
    label: 'Shariah Reviews',
    allowedRoles: ['shariahReviewer'],
    pageKey: 'shariah-review-submission',
    availability: 'available'
  },
  'shariah-checklists': {
    target: 'shariah-checklists',
    label: 'Shariah Checklists',
    allowedRoles: ['shariahReviewer'],
    pageKey: 'shariah-review-checklist',
    availability: 'available'
  },
  'shariah-decisions': {
    target: 'shariah-decisions',
    label: 'Shariah Decisions',
    allowedRoles: ['shariahReviewer'],
    pageKey: 'shariah-review-decision',
    availability: 'available'
  },
  'shariah-history': {
    target: 'shariah-history',
    label: 'Shariah History',
    allowedRoles: ['shariahReviewer'],
    pageKey: 'shariah-review-history',
    availability: 'available'
  },
  'runway': {
    target: 'runway',
    label: 'Platform Readiness',
    allowedRoles: ['administrator'],
    pageKey: 'runway',
    availability: 'available'
  },
  // New auditor targets
  'access-history-search': {
    target: 'access-history-search',
    label: 'Access History Search',
    allowedRoles: ['auditor'],
    pageKey: 'access-history-search',
    availability: 'available'
  },
  'access-event-detail': {
    target: 'access-event-detail',
    label: 'Access Event Detail',
    allowedRoles: ['auditor'],
    pageKey: 'access-event-detail',
    availability: 'available'
  },
  'access-event-sequence': {
    target: 'access-event-sequence',
    label: 'Access Event Sequence',
    allowedRoles: ['auditor'],
    pageKey: 'access-event-sequence',
    availability: 'available'
  },
  // New security operator target
  'security-investigation': {
    target: 'security-investigation',
    label: 'Security Investigation',
    allowedRoles: ['securityOperator'],
    pageKey: 'security-investigation',
    availability: 'placeholder'
  },
  // Placeholder targets
  'member-management': {
    target: 'member-management',
    label: 'Member Management',
    allowedRoles: ['administrator'],
    availability: 'placeholder'
  },
  'tenders': {
    target: 'tenders',
    label: 'Tenders',
    allowedRoles: ['buyer'],
    availability: 'placeholder'
  },
  'orders': {
    target: 'orders',
    label: 'Orders',
    allowedRoles: ['buyer'],
    availability: 'placeholder'
  },
  'responses': {
    target: 'responses',
    label: 'Tender Responses',
    allowedRoles: ['supplier'],
    availability: 'placeholder'
  },
  'deliveries': {
    target: 'deliveries',
    label: 'Deliveries',
    allowedRoles: ['supplier'],
    availability: 'placeholder'
  },
  'facilities': {
    target: 'facilities',
    label: 'Financing Facilities',
    allowedRoles: ['financier'],
    availability: 'placeholder'
  },
  'settlements': {
    target: 'settlements',
    label: 'Settlements',
    allowedRoles: ['financier'],
    availability: 'placeholder'
  },
  'kyc-queue': {
    target: 'kyc-queue',
    label: 'KYC Queue',
    allowedRoles: ['complianceReviewer'],
    availability: 'placeholder'
  },
  'aml-reviews': {
    target: 'aml-reviews',
    label: 'AML Reviews',
    allowedRoles: ['complianceReviewer'],
    availability: 'placeholder'
  },
  'onboarding-status': {
    target: 'onboarding-status',
    label: 'Onboarding Status',
    allowedRoles: ['complianceReviewer'],
    availability: 'placeholder'
  },
  'checklists': {
    target: 'checklists',
    label: 'Checklists',
    allowedRoles: ['shariahReviewer'],
    availability: 'placeholder'
  },
  'access-history': {
    target: 'access-history',
    label: 'Access History',
    allowedRoles: ['auditor'],
    availability: 'placeholder'
  },
  'investigations': {
    target: 'investigations',
    label: 'Investigations',
    allowedRoles: ['auditor'],
    availability: 'placeholder'
  },
  'monitoring': {
    target: 'monitoring',
    label: 'Monitoring',
    allowedRoles: ['securityOperator'],
    availability: 'placeholder'
  },
  'incidents': {
    target: 'incidents',
    label: 'Incidents',
    allowedRoles: ['securityOperator'],
    availability: 'placeholder'
  }
};

// Access resolver result types
export type DashboardTargetAccess = 'allowed' | 'forbidden' | 'unavailable' | 'unknown';

// Resolve access to a dashboard target for a given role
export function resolveDashboardTargetAccess(
  target: string,
  activeRoleCode: DashboardRoleCode | undefined
): DashboardTargetAccess {
  // If no role is assigned, deny access to role-specific targets
  if (!activeRoleCode) {
    return 'forbidden';
  }

  // Check if target exists in our registry
  const targetInfo = DASHBOARD_TARGETS[target];
  if (!targetInfo) {
    return 'unknown';
  }

  // Check if the active role is allowed for this target
  if (!targetInfo.allowedRoles.includes(activeRoleCode)) {
    return 'forbidden';
  }

  // If target is a placeholder, mark as unavailable
  if (targetInfo.availability === 'placeholder') {
    return 'unavailable';
  }

  // Target is allowed and available
  return 'allowed';
}

// Filter navigation groups based on active role
export function filterNavigationGroupsByRole(
  navigationGroups: DashboardNavigationGroup[],
  activeRoleCode: DashboardRoleCode | undefined
): DashboardNavigationGroup[] {
  if (!activeRoleCode) {
    return [];
  }

  return navigationGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => 
        item.visibility === 'visible' && 
        item.allowedRoles.includes(activeRoleCode)
      )
    }))
    .filter(group => group.items.length > 0);
}

// Create administrator-specific widgets according to PBI-176 contract
function createAdministratorWidgets(): DashboardWidget[] {
  return [
    // Primary zone widgets
    {
      id: 'admin-membership-overview',
      title: 'Member Onboarding',
      zoneId: 'primary',
      allowedRoles: ['administrator'],
      status: 'active',
      downstreamPbi: 'PBI-177',
      placeholder: false
    },
    {
      id: 'admin-role-catalog-overview',
      title: 'Role Management',
      zoneId: 'primary',
      allowedRoles: ['administrator'],
      status: 'active',
      downstreamPbi: 'PBI-177',
      placeholder: false
    },
    {
      id: 'admin-role-assignment-overview',
      title: 'Role Assignment',
      zoneId: 'primary',
      allowedRoles: ['administrator'],
      status: 'active',
      downstreamPbi: 'PBI-177',
      placeholder: false
    },
    // Actions zone widgets
    {
      id: 'admin-member-onboarding-action',
      title: 'Create New Organization',
      zoneId: 'actions',
      allowedRoles: ['administrator'],
      status: 'active',
      downstreamPbi: 'PBI-177',
      placeholder: false
    },
    {
      id: 'admin-role-management-action',
      title: 'Manage Roles',
      zoneId: 'actions',
      allowedRoles: ['administrator'],
      status: 'active',
      downstreamPbi: 'PBI-177',
      placeholder: false
    },
    {
      id: 'admin-role-assignment-action',
      title: 'Assign Roles',
      zoneId: 'actions',
      allowedRoles: ['administrator'],
      status: 'active',
      downstreamPbi: 'PBI-177',
      placeholder: false
    },
    // Alerts zone widget
    {
      id: 'admin-access-boundary-alert',
      title: 'Authorization Boundary',
      zoneId: 'alerts',
      allowedRoles: ['administrator'],
      status: 'active',
      downstreamPbi: 'PBI-177',
      placeholder: false
    },
    // Secondary zone placeholder widget
    {
      id: 'admin-member-management-placeholder',
      title: 'Member Management',
      zoneId: 'secondary',
      allowedRoles: ['administrator'],
      status: 'placeholder',
      downstreamPbi: 'PBI-177',
      placeholder: true
    }
  ];
}

// Create compliance reviewer widgets according to PBI-180 contract
function createComplianceReviewerWidgets(): DashboardWidget[] {
  return [
    // Primary zone widgets
    {
      id: 'compliance-kyc-queue-overview',
      title: 'KYC Queue',
      zoneId: 'primary',
      allowedRoles: ['complianceReviewer'],
      status: 'placeholder',
      downstreamPbi: 'PBI-181',
      placeholder: true
    },
    {
      id: 'compliance-aml-review-overview',
      title: 'AML Reviews',
      zoneId: 'primary',
      allowedRoles: ['complianceReviewer'],
      status: 'placeholder',
      downstreamPbi: 'PBI-181',
      placeholder: true
    },
    // Summary zone widget
    {
      id: 'compliance-onboarding-status-overview',
      title: 'Onboarding Status',
      zoneId: 'summary',
      allowedRoles: ['complianceReviewer'],
      status: 'placeholder',
      downstreamPbi: 'PBI-181',
      placeholder: true
    },
    // Alerts zone widget
    {
      id: 'compliance-blocked-state-alert',
      title: 'Compliance Authorization Boundary',
      zoneId: 'alerts',
      allowedRoles: ['complianceReviewer'],
      status: 'active',
      downstreamPbi: 'PBI-181',
      placeholder: false
    }
  ];
}

// Create Shariah reviewer widgets according to PBI-180 contract
function createShariahReviewerWidgets(): DashboardWidget[] {
  return [
    // Primary zone widgets
    {
      id: 'shariah-review-submission-overview',
      title: 'Shariah Reviews',
      zoneId: 'primary',
      allowedRoles: ['shariahReviewer'],
      status: 'active',
      downstreamPbi: 'PBI-181',
      placeholder: false
    },
    {
      id: 'shariah-checklist-overview',
      title: 'Shariah Checklist',
      zoneId: 'primary',
      allowedRoles: ['shariahReviewer'],
      status: 'active',
      downstreamPbi: 'PBI-181',
      placeholder: false
    },
    // Actions zone widgets
    {
      id: 'shariah-decision-overview',
      title: 'Shariah Decision',
      zoneId: 'actions',
      allowedRoles: ['shariahReviewer'],
      status: 'active',
      downstreamPbi: 'PBI-181',
      placeholder: false
    },
    // Secondary zone widget (moved from actions)
    {
      id: 'shariah-history-overview',
      title: 'Shariah History',
      zoneId: 'secondary',
      allowedRoles: ['shariahReviewer'],
      status: 'active',
      downstreamPbi: 'PBI-181',
      placeholder: false
    },
    // Alerts zone widget
    {
      id: 'shariah-review-boundary-alert',
      title: 'Shariah Review Boundary',
      zoneId: 'alerts',
      allowedRoles: ['shariahReviewer'],
      status: 'active',
      downstreamPbi: 'PBI-181',
      placeholder: false
    }
  ];
}

// Create auditor widgets according to PBI-188 contract
function createAuditorWidgets(): DashboardWidget[] {
  return [
    // Primary zone widgets
    {
      id: 'auditor-access-history-search-overview',
      title: 'Access History Search',
      zoneId: 'primary',
      allowedRoles: ['auditor'],
      status: 'active',
      downstreamPbi: 'PBI-189',
      placeholder: false
    },
    {
      id: 'auditor-event-detail-overview',
      title: 'Event Detail',
      zoneId: 'primary',
      allowedRoles: ['auditor'],
      status: 'active',
      downstreamPbi: 'PBI-189',
      placeholder: false
    },
    // Investigation zone widgets
    {
      id: 'auditor-event-sequence-overview',
      title: 'Event Sequence',
      zoneId: 'investigation',
      allowedRoles: ['auditor'],
      status: 'active',
      downstreamPbi: 'PBI-189',
      placeholder: false
    },
    // Alerts zone widget
    {
      id: 'auditor-investigation-boundary-alert',
      title: 'Investigation Boundary',
      zoneId: 'alerts',
      allowedRoles: ['auditor'],
      status: 'active',
      downstreamPbi: 'PBI-189',
      placeholder: false
    }
  ];
}

// Create security operator widgets according to PBI-188 contract
function createSecurityOperatorWidgets(): DashboardWidget[] {
  return [
    // Primary zone widget
    {
      id: 'security-investigation-placeholder',
      title: 'Security Investigation',
      zoneId: 'primary',
      allowedRoles: ['securityOperator'],
      status: 'placeholder',
      downstreamPbi: 'PBI-189',
      placeholder: true
    },
    // Alerts zone widget
    {
      id: 'security-investigation-boundary-alert',
      title: 'Investigation Boundary',
      zoneId: 'alerts',
      allowedRoles: ['securityOperator'],
      status: 'active',
      downstreamPbi: 'PBI-189',
      placeholder: false
    }
  ];
}

function createBuyerWidgets(): DashboardWidget[] {
  return [
    {
      id: 'buyer-order-overview',
      title: 'Orders',
      zoneId: 'primary',
      allowedRoles: ['buyer'],
      status: 'placeholder',
      downstreamPbi: 'PBI-263',
      placeholder: true
    },
    {
      id: 'buyer-escrow-overview',
      title: 'Escrow',
      zoneId: 'primary',
      allowedRoles: ['buyer'],
      status: 'placeholder',
      downstreamPbi: 'PBI-263',
      placeholder: true
    },
    {
      id: 'buyer-proof-overview',
      title: 'Blockchain Proof',
      zoneId: 'summary',
      allowedRoles: ['buyer'],
      status: 'placeholder',
      downstreamPbi: 'PBI-263',
      placeholder: true
    }
  ];
}

// Create placeholder widgets for each role and zone
export function createPlaceholderWidgets(role: DashboardRoleCode): DashboardWidget[] {
  // For administrator role, return specific widgets as per PBI-176
  if (role === 'administrator') {
    return createAdministratorWidgets();
  }
  
  // For compliance reviewer role, return specific widgets as per PBI-180
  if (role === 'complianceReviewer') {
    return createComplianceReviewerWidgets();
  }
  
  // For shariah reviewer role, return specific widgets as per PBI-180
  if (role === 'shariahReviewer') {
    return createShariahReviewerWidgets();
  }
  
  // For auditor role, return specific widgets as per PBI-188
  if (role === 'auditor') {
    return createAuditorWidgets();
  }
  
  // For security operator role, return specific widgets as per PBI-188
  if (role === 'securityOperator') {
    return createSecurityOperatorWidgets();
  }

  if (role === 'buyer') {
    return createBuyerWidgets();
  }

  // For other roles, create generic placeholder widgets
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
