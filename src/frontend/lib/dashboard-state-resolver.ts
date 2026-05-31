import type { FrontendActorContext } from './session-state';

export type DashboardUserStatus = 'active' | 'inactive';
export type DashboardOrganizationStatus = 'pendingReview' | 'active' | 'inactive' | 'suspended' | 'deleted';
export type DashboardRoleAssignmentStatus = 'active' | 'revoked' | 'none';
export type SupportedDashboardRole =
  | 'administrator'
  | 'organizationAdmin'
  | 'buyer'
  | 'supplier'
  | 'complianceReviewer'
  | 'shariahReviewer'
  | 'financier'
  | 'auditor'
  | 'regulator'
  | 'securityOperator';

export type DashboardStateCode =
  | 'loading'
  | 'ready'
  | 'noRole'
  | 'unsupportedRole'
  | 'pendingReview'
  | 'inactiveUser'
  | 'suspendedOrganization'
  | 'forbidden'
  | 'backendUnavailable';

export type DashboardStateResult =
  | { state: 'ready'; role: SupportedDashboardRole; actor: FrontendActorContext }
  | { state: Exclude<DashboardStateCode, 'ready'>; actor?: FrontendActorContext; role?: SupportedDashboardRole };

export type DashboardResolverInput = {
  actor?: FrontendActorContext;
  userStatus?: DashboardUserStatus;
  organizationStatus?: DashboardOrganizationStatus;
  roleAssignmentStatus?: DashboardRoleAssignmentStatus;
  backendAvailable?: boolean;
};

const ROLE_PRIORITY: SupportedDashboardRole[] = [
  'administrator',
  'organizationAdmin',
  'auditor',
  'regulator',
  'securityOperator',
  'complianceReviewer',
  'shariahReviewer',
  'financier',
  'buyer',
  'supplier',
];

export function isSupportedDashboardRole(role: string): role is SupportedDashboardRole {
  return ROLE_PRIORITY.includes(role as SupportedDashboardRole);
}

function resolveSupportedRole(roleCodes: string[]): SupportedDashboardRole | undefined {
  return ROLE_PRIORITY.find(role => roleCodes.includes(role));
}

export function resolveDashboardState(input: DashboardResolverInput): DashboardStateResult {
  const {
    actor,
    userStatus = 'active',
    organizationStatus = 'active',
    roleAssignmentStatus = 'active',
    backendAvailable = true,
  } = input;

  if (!backendAvailable) {
    return { state: 'backendUnavailable', actor };
  }

  if (!actor) {
    return { state: 'loading' };
  }

  if (userStatus === 'inactive') {
    return { state: 'inactiveUser', actor };
  }

  if (actor.actorRoleCodes.length === 0 || roleAssignmentStatus === 'none' || roleAssignmentStatus === 'revoked') {
    return { state: 'noRole', actor };
  }

  const role = resolveSupportedRole(actor.actorRoleCodes);
  if (!role) {
    return { state: 'unsupportedRole', actor };
  }

  if (organizationStatus === 'pendingReview') {
    return { state: 'pendingReview', actor, role };
  }

  if (organizationStatus === 'inactive' || organizationStatus === 'suspended' || organizationStatus === 'deleted') {
    return { state: 'suspendedOrganization', actor, role };
  }

  return { state: 'ready', actor, role };
}
