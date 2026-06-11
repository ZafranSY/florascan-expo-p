export type UserRole = 'farmer' | 'researcher' | 'admin' | null;

export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  locale: string;
}
