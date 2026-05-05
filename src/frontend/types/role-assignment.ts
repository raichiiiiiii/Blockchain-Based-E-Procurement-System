export type RoleAssignmentStatus = 'active' | 'revoked';

export type CreateRoleAssignmentRequest = {
  userId: string;
  organizationId: string;
  roleId: string;
};

export type RoleAssignmentResponse = {
  id: string;
  userId: string;
  organizationId: string;
  roleId: string;
  status: RoleAssignmentStatus;
  createdAt?: string;
};

export type ChangeRoleAssignmentRequest = {
  userId: string;
  organizationId: string;
  currentRoleId: string;
  newRoleId: string;
};

export type ChangeRoleAssignmentResponse = {
  oldAssignment: RoleAssignmentResponse;
  newAssignment: RoleAssignmentResponse;
};

export type RemoveRoleAssignmentRequest = {
  userId: string;
  organizationId: string;
  roleId: string;
};

export type RemoveRoleAssignmentResponse = {
  id: string;
  status: RoleAssignmentStatus;
};
