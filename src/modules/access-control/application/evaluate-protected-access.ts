import type { UserStatusLookup } from '../../shared/application/user-status-lookup.js';
import type { MemberStatusLookup } from '../../shared/application/member-status-lookup.js';

export type ProtectedAccessDecision =
  | { status: 'allowed' }
  | {
      status: 'denied';
      reason:
        | 'userInactive'
        | 'organizationInactive'
        | 'organizationSuspended'
        | 'organizationDeleted'
        | 'organizationNotActive'
        | 'userNotFound'
        | 'organizationNotFound';
      message: string;
    };

export type EvaluateProtectedAccessInput = {
  userId: string;
  organizationId: string;
  userStatusLookup: UserStatusLookup;
  memberStatusLookup: MemberStatusLookup;
};

export async function evaluateProtectedAccess(input: EvaluateProtectedAccessInput): Promise<ProtectedAccessDecision> {
  // Check user status
  const userStatus = await input.userStatusLookup.getUserStatus(input.userId);
  
  if (userStatus === null) {
    return {
      status: 'denied',
      reason: 'userNotFound',
      message: 'User not found'
    };
  }
  
  if (userStatus === 'inactive') {
    return {
      status: 'denied',
      reason: 'userInactive',
      message: 'User account is inactive'
    };
  }
  
  // Check organization status
  const organizationStatus = await input.memberStatusLookup.getMemberOrganizationStatus(input.organizationId);
  
  if (organizationStatus === null) {
    return {
      status: 'denied',
      reason: 'organizationNotFound',
      message: 'Organization not found'
    };
  }
  
  switch (organizationStatus) {
    case 'active':
      return { status: 'allowed' };
      
    case 'inactive':
      return {
        status: 'denied',
        reason: 'organizationInactive',
        message: 'Organization is inactive'
      };
      
    case 'suspended':
      return {
        status: 'denied',
        reason: 'organizationSuspended',
        message: 'Organization is suspended'
      };
      
    case 'deleted':
      return {
        status: 'denied',
        reason: 'organizationDeleted',
        message: 'Organization is deleted'
      };
      
    case 'pendingReview':
      return {
        status: 'denied',
        reason: 'organizationNotActive',
        message: 'Organization is not active'
      };
      
    default:
      // Handle any unexpected status values
      return {
        status: 'denied',
        reason: 'organizationNotActive',
        message: 'Organization is not in an active state'
      };
  }
}
