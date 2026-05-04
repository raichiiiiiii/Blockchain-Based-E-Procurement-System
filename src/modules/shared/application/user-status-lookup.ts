export type UserStatus = 'active' | 'inactive';

export interface UserStatusLookup {
  getUserStatus(userId: string): Promise<UserStatus | null>;
}
