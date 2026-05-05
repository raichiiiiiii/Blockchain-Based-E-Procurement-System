export type RoleScope = 'organization';

export type RoleStatus = 'active' | 'inactive';

export type CreateRoleRequest = {
  roleCode: string;
  displayName: string;
  scope: RoleScope;
  permissions: string[];
  status: RoleStatus;
  isSystemReserved: boolean;
  description?: string;
};

export type UpdateRoleRequest = {
  displayName?: string;
  description?: string;
  permissions?: string[];
  status?: RoleStatus;
};

export type RoleResponse = {
  id: string;
  roleCode: string;
  displayName: string;
  scope: RoleScope;
  permissions: string[];
  status: RoleStatus;
  isSystemReserved: boolean;
  description?: string;
};
