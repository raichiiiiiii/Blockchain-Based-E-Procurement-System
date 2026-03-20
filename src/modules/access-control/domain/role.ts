export type RoleScope = 'organization';

export type RoleStatus = 'active' | 'inactive';

export type Role = {
  roleCode: string;
  displayName: string;
  scope: RoleScope;
  description?: string;
  permissions: string[];
  status: RoleStatus;
  isSystemReserved: boolean;
};
