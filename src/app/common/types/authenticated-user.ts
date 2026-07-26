export interface AuthenticatedUser {
  id: number;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface JwtPayload {
  sub: number;
  phone: string;
  role: string;
}
