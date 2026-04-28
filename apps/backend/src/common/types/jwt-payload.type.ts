export interface JwtPayload {
  sub: string; // user UUID
  email: string;
  fullName: string;
  roles: string[]; // ['ADMIN', 'MANAGER']
  permissions: string[]; // ['job:create', 'job:assign-reporter', ...]
  iat?: number;
  exp?: number;
}
