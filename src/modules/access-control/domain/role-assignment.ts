export type RoleAssignmentStatus = 'active' | 'revoked';

export type RoleAssignment = {
  userId: string;
  organizationId: string;
  roleId: string;
  status: RoleAssignmentStatus;
};
