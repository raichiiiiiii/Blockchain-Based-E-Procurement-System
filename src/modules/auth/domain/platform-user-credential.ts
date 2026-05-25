export type PlatformUserCredential = {
  userId: string;
  username: string;
  passwordHash: string;
  actorOrganizationId?: string;
  actorRoleCodes?: string[];
  createdAt: string;
  updatedAt: string;
};
