export interface UserExistenceLookup {
  userExists(userId: string): Promise<boolean>;
}
