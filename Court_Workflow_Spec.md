# Court Reporting Workflow Manager — Full Technical Specification

> **Stack**: NestJS (backend) + React Vite + TanStack Router (frontend) — Monorepo
> **DB**: PostgreSQL via TypeORM
> **Auth**: JWT (Access + Refresh Token)
> **Arch**: Clean Architecture (NestJS) — strict layering: Controller → Service → Repository → Entity

---

## 0. Monorepo Structure

```
court-workflow/
├── apps/
│   ├── backend/                        # NestJS backend
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── config/
│   │   │   │   └── database.config.ts
│   │   │   ├── common/
│   │   │   │   ├── decorators/
│   │   │   │   │   ├── roles.decorator.ts
│   │   │   │   │   └── current-user.decorator.ts
│   │   │   │   ├── guards/
│   │   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   │   └── roles.guard.ts
│   │   │   │   ├── interceptors/
│   │   │   │   │   └── transform.interceptor.ts
│   │   │   │   ├── filters/
│   │   │   │   │   └── http-exception.filter.ts
│   │   │   │   └── types/
│   │   │   │       └── api-response.type.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── roles/
│   │   │   │   ├── jobs/
│   │   │   │   ├── assignments/
│   │   │   │   └── payments/
│   │   │   └── database/
│   │   │       ├── migrations/
│   │   │       └── seeds/
│   │   ├── test/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── frontend/                        # React Vite frontend
│       ├── src/
│       │   ├── main.tsx
│       │   ├── router.tsx
│       │   ├── routes/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── stores/
│       │   └── lib/
│       ├── package.json
│       └── vite.config.ts
├── packages/
│   └── shared/                     # Shared types/constants
│       ├── src/
│       │   ├── enums/
│       │   └── types/
│       └── package.json
├── package.json                    # Root (workspaces)
├── turbo.json                      # Turborepo config
└── docker-compose.yml
```

---

## 1. Database Design

### 1.1 Entity Relationship Diagram

```
users ──< user_roles >── roles ──< role_permissions >── permissions
  │
  ├──< jobs (as reporter)
  ├──< jobs (as editor)
  └──< payments

jobs ──< assignments
jobs ──< payments
```

### 1.2 Full Migration: `001_create_rbac_tables`

```sql
-- =============================================
-- MIGRATION: 001_create_rbac_tables
-- =============================================

-- ENUM TYPES
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE job_status AS ENUM ('NEW', 'ASSIGNED', 'TRANSCRIBED', 'REVIEWED', 'COMPLETED');
CREATE TYPE job_location_type AS ENUM ('PHYSICAL', 'REMOTE');
CREATE TYPE assignment_type AS ENUM ('REPORTER', 'EDITOR');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID');

-- =============================================
-- RBAC TABLES
-- =============================================

CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL UNIQUE,  -- e.g. "job:create", "job:assign"
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50) NOT NULL UNIQUE,   -- e.g. "ADMIN", "REPORTER", "EDITOR"
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE, -- system roles cannot be deleted
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  city          VARCHAR(100),             -- for physical job matching
  is_available  BOOLEAN NOT NULL DEFAULT TRUE,
  status        user_status NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- Refresh tokens table (for auth)
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- BUSINESS TABLES
-- =============================================

CREATE TABLE jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_name     VARCHAR(255) NOT NULL,
  duration      INTEGER NOT NULL CHECK (duration > 0),  -- in minutes
  location_type job_location_type NOT NULL,
  location_city VARCHAR(100),    -- required if PHYSICAL
  status        job_status NOT NULL DEFAULT 'NEW',
  reporter_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  editor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by    UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE job_status_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  from_status job_status,
  to_status   job_status NOT NULL,
  changed_by  UUID NOT NULL REFERENCES users(id),
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         UUID NOT NULL REFERENCES jobs(id),
  user_id        UUID NOT NULL REFERENCES users(id),
  assignment_type assignment_type NOT NULL,
  amount         DECIMAL(15, 2) NOT NULL,
  rate           DECIMAL(10, 2) NOT NULL,   -- IDR/min for reporter, flat for editor
  duration_used  INTEGER,                   -- minutes (reporter only)
  status         payment_status NOT NULL DEFAULT 'PENDING',
  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, user_id, assignment_type)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_city ON users(city);
CREATE INDEX idx_users_is_available ON users(is_available);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_reporter_id ON jobs(reporter_id);
CREATE INDEX idx_jobs_editor_id ON jobs(editor_id);
CREATE INDEX idx_payments_job_id ON payments(job_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
```

### 1.3 Seed Data: `001_seed_roles_permissions`

```sql
-- =============================================
-- SEED: Permissions
-- =============================================
INSERT INTO permissions (name, description) VALUES
  -- Auth
  ('auth:refresh',          'Refresh access token'),
  -- User management
  ('user:read',             'View user list and profiles'),
  ('user:create',           'Create new users'),
  ('user:update',           'Update user profiles'),
  ('user:delete',           'Delete users'),
  ('user:manage-roles',     'Assign/remove roles from users'),
  -- Job management
  ('job:create',            'Create new jobs'),
  ('job:read',              'View job list and details'),
  ('job:update',            'Update job details'),
  ('job:delete',            'Delete jobs'),
  ('job:assign-reporter',   'Assign reporter to job'),
  ('job:assign-editor',     'Assign editor to job'),
  ('job:update-status',     'Update job status'),
  -- Payment management
  ('payment:read',          'View payment records'),
  ('payment:mark-paid',     'Mark payments as paid'),
  ('payment:read-own',      'View own payment records'),
  -- Role management
  ('role:read',             'View roles'),
  ('role:manage',           'Create/edit/delete roles and permissions');

-- =============================================
-- SEED: Roles
-- =============================================
INSERT INTO roles (name, description, is_system) VALUES
  ('ADMIN',    'Full system access',              TRUE),
  ('MANAGER',  'Manage jobs and assignments',     TRUE),
  ('REPORTER', 'Court reporter, does transcription', TRUE),
  ('EDITOR',   'Reviews and edits transcripts',  TRUE);

-- =============================================
-- SEED: Role-Permission mapping
-- =============================================

-- ADMIN: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'ADMIN';

-- MANAGER: job management + payment read + user read
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.name IN (
    'auth:refresh',
    'user:read',
    'job:create', 'job:read', 'job:update', 'job:delete',
    'job:assign-reporter', 'job:assign-editor', 'job:update-status',
    'payment:read', 'payment:mark-paid'
  )
WHERE r.name = 'MANAGER';

-- REPORTER: view own jobs, update status to TRANSCRIBED, view own payments
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.name IN (
    'auth:refresh',
    'job:read', 'job:update-status',
    'payment:read-own'
  )
WHERE r.name = 'REPORTER';

-- EDITOR: view jobs, update status to REVIEWED, view own payments
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.name IN (
    'auth:refresh',
    'job:read', 'job:update-status',
    'payment:read-own'
  )
WHERE r.name = 'EDITOR';
```

---

## 2. Backend: NestJS Architecture

### 2.1 Clean Code Rules (STRICT)

```
RULES — NO EXCEPTIONS:
1. No business logic in Controllers — controllers only validate input and call services
2. No raw SQL outside Repository classes — use TypeORM QueryBuilder or Repository methods
3. Every Service method must have a single responsibility
4. DTOs for every request body — class-validator + class-transformer
5. Response always wrapped in ApiResponse<T> shape via TransformInterceptor
6. Never expose password_hash in responses — use @Exclude() on entity field
7. Guard order: JwtAuthGuard → RolesGuard (always applied at controller level)
8. Use custom exceptions (extend HttpException) — never throw raw Error
9. Every module is self-contained: its own Module, Controller, Service, Repository, DTOs, Entities
10. No circular dependencies — shared types go to packages/shared
```

### 2.2 API Response Contract

```typescript
// packages/shared/src/types/api-response.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
  meta?: PaginationMeta;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

### 2.3 TransformInterceptor

```typescript
// apps/api/src/common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ApiResponse } from "@court-workflow/shared";

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data: data?.data ?? data,
        message: data?.message ?? "Success",
        meta: data?.meta,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

### 2.4 HttpExceptionFilter

```typescript
// apps/api/src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : "Internal server error";

    response.status(status).json({
      success: false,
      data: null,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 2.5 RBAC Implementation

#### Roles Decorator

```typescript
// apps/api/src/common/decorators/roles.decorator.ts
import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// Usage: @Roles('ADMIN', 'MANAGER')
```

#### Permissions Decorator

```typescript
// apps/api/src/common/decorators/permissions.decorator.ts
import { SetMetadata } from "@nestjs/common";

export const PERMISSIONS_KEY = "permissions";
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// Usage: @RequirePermissions('job:assign-reporter')
```

#### CurrentUser Decorator

```typescript
// apps/api/src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { JwtPayload } from "../types/jwt-payload.type";

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    return data ? user?.[data] : user;
  },
);
```

#### JwtAuthGuard

```typescript
// apps/api/src/common/guards/jwt-auth.guard.ts
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw new UnauthorizedException("Invalid or expired token");
    }
    return user;
  }
}
```

#### RolesGuard (checks both roles AND permissions)

```typescript
// apps/api/src/common/guards/roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import { JwtPayload } from "../types/jwt-payload.type";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No restrictions set — allow
    if (!requiredRoles?.length && !requiredPermissions?.length) return true;

    const user: JwtPayload = context.switchToHttp().getRequest().user;

    if (requiredRoles?.length) {
      const hasRole = requiredRoles.some((role) => user.roles.includes(role));
      if (!hasRole) {
        throw new ForbiddenException("Insufficient role");
      }
    }

    if (requiredPermissions?.length) {
      const hasPermission = requiredPermissions.every((perm) =>
        user.permissions.includes(perm),
      );
      if (!hasPermission) {
        throw new ForbiddenException("Insufficient permissions");
      }
    }

    return true;
  }
}
```

#### JWT Payload Type

```typescript
// apps/api/src/common/types/jwt-payload.type.ts
export interface JwtPayload {
  sub: string; // user UUID
  email: string;
  fullName: string;
  roles: string[]; // ['ADMIN', 'MANAGER']
  permissions: string[]; // ['job:create', 'job:assign-reporter', ...]
  iat?: number;
  exp?: number;
}
```

---

## 3. Module Specifications

### 3.1 Auth Module

**Path**: `apps/api/src/modules/auth/`

**Files**:

```
auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   ├── jwt.strategy.ts
│   └── local.strategy.ts
└── dto/
    ├── login.dto.ts
    └── refresh-token.dto.ts
```

**Endpoints**:

```
POST /auth/login          → { accessToken, refreshToken, user }
POST /auth/refresh        → { accessToken }
POST /auth/logout         → 200 OK (revokes refresh token)
GET  /auth/me             → JwtPayload (current user info)
```

**Auth Service Logic**:

```typescript
// auth.service.ts — Key methods (implement fully)

async login(email: string, password: string): Promise<LoginResponseDto> {
  // 1. Find user by email with roles and permissions (eager load)
  // 2. Verify password hash (bcrypt.compare)
  // 3. If user.status !== 'ACTIVE' → throw UnauthorizedException
  // 4. Build JwtPayload { sub, email, fullName, roles[], permissions[] }
  // 5. Sign accessToken (15m expiry) and refreshToken (7d expiry)
  // 6. Hash refreshToken and save to refresh_tokens table
  // 7. Return { accessToken, refreshToken, user: sanitized }
}

async refresh(token: string): Promise<{ accessToken: string }> {
  // 1. Hash incoming token, lookup in refresh_tokens
  // 2. Check not revoked and not expired
  // 3. Load user with fresh roles/permissions
  // 4. Sign new accessToken
}

async logout(userId: string, token: string): Promise<void> {
  // 1. Hash token, set revoked_at = NOW() in refresh_tokens
}
```

**JWT Strategy**:

```typescript
// strategies/jwt.strategy.ts
// Validate JWT, load roles and permissions from DB (or from token payload)
// Build JwtPayload and attach to request.user
```

---

### 3.2 Users Module

**Path**: `apps/api/src/modules/users/`

**Files**:

```
users/
├── users.module.ts
├── users.controller.ts
├── users.service.ts
├── users.repository.ts
├── entities/
│   └── user.entity.ts
└── dto/
    ├── create-user.dto.ts
    ├── update-user.dto.ts
    ├── assign-role.dto.ts
    └── user-response.dto.ts
```

**Entity**:

```typescript
// user.entity.ts
@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: "password_hash" })
  @Exclude() // NEVER expose in response
  passwordHash: string;

  @Column({ name: "full_name" })
  fullName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  city: string;

  @Column({ name: "is_available", default: true })
  isAvailable: boolean;

  @Column({ type: "enum", enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @ManyToMany(() => Role, { eager: true })
  @JoinTable({
    name: "user_roles",
    joinColumn: { name: "user_id" },
    inverseJoinColumn: { name: "role_id" },
  })
  roles: Role[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  // Computed helper (not a DB column)
  get roleNames(): string[] {
    return this.roles?.map((r) => r.name) ?? [];
  }

  get permissions(): string[] {
    const perms = new Set<string>();
    this.roles?.forEach((role) =>
      role.permissions?.forEach((p) => perms.add(p.name)),
    );
    return [...perms];
  }
}
```

**Endpoints**:

```
GET    /users                → list all users (paginated) [ADMIN, MANAGER]
POST   /users                → create user               [ADMIN]
GET    /users/:id            → user detail               [ADMIN, MANAGER]
PATCH  /users/:id            → update user               [ADMIN]
DELETE /users/:id            → soft-delete (set INACTIVE) [ADMIN]
POST   /users/:id/roles      → assign role               [ADMIN]
DELETE /users/:id/roles/:roleId → remove role            [ADMIN]

GET    /users/reporters      → list available reporters  [MANAGER, ADMIN]
GET    /users/editors        → list available editors    [MANAGER, ADMIN]
```

**Service Rules**:

- `findAvailableReporters(city?: string)` — if city provided, sort same-city first
- Cannot delete yourself
- Cannot remove ADMIN role if only one admin remains
- Password must be hashed with bcrypt (rounds: 12) before save

---

### 3.3 Jobs Module

**Path**: `apps/api/src/modules/jobs/`

**Files**:

```
jobs/
├── jobs.module.ts
├── jobs.controller.ts
├── jobs.service.ts
├── jobs.repository.ts
├── entities/
│   └── job.entity.ts
│   └── job-status-log.entity.ts
└── dto/
    ├── create-job.dto.ts
    ├── update-job.dto.ts
    ├── assign-reporter.dto.ts
    ├── assign-editor.dto.ts
    ├── update-status.dto.ts
    └── job-response.dto.ts
```

**Status Transition Rules (STRICT)**:

```typescript
// Allowed transitions — anything else throws BadRequestException
const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  [JobStatus.NEW]: [JobStatus.ASSIGNED],
  [JobStatus.ASSIGNED]: [JobStatus.TRANSCRIBED],
  [JobStatus.TRANSCRIBED]: [JobStatus.REVIEWED],
  [JobStatus.REVIEWED]: [JobStatus.COMPLETED],
  [JobStatus.COMPLETED]: [], // terminal state
};

// Role constraints per transition:
// NEW → ASSIGNED:       ADMIN, MANAGER (done via assign-reporter)
// ASSIGNED → TRANSCRIBED: REPORTER (only the assigned reporter)
// TRANSCRIBED → REVIEWED: EDITOR (only the assigned editor)
// REVIEWED → COMPLETED:   ADMIN, MANAGER
```

**Endpoints**:

```
GET    /jobs                     → list all jobs (filter: status, reporter, editor) [ALL]
POST   /jobs                     → create job                [ADMIN, MANAGER]
GET    /jobs/:id                 → job detail with assignments [ALL]
PATCH  /jobs/:id                 → update case_name/duration  [ADMIN, MANAGER]
DELETE /jobs/:id                 → delete (only if NEW)       [ADMIN]
POST   /jobs/:id/assign-reporter → assign reporter            [ADMIN, MANAGER]
POST   /jobs/:id/assign-editor   → assign editor              [ADMIN, MANAGER]
PATCH  /jobs/:id/status          → update status              [depends on transition]
GET    /jobs/:id/logs            → status change history      [ADMIN, MANAGER]
```

**Service Logic — assign-reporter**:

```
1. Job must be in NEW status
2. reporter must have REPORTER role
3. reporter must be is_available = true
4. If job.location_type = PHYSICAL: validate reporter.city matches job.location_city
   (MANAGER can override with { force: true } flag)
5. Set job.reporter_id, change status NEW → ASSIGNED
6. Log status change in job_status_logs
7. Auto-create pending Payment record for reporter
```

**Service Logic — assign-editor**:

```
1. Job must be in TRANSCRIBED status
2. editor must have EDITOR role
3. editor must be is_available = true
4. Set job.editor_id, status remains TRANSCRIBED
5. Auto-create pending Payment record for editor
```

**Service Logic — update-status**:

```
1. Validate transition is allowed
2. Validate caller has permission for this transition
3. For ASSIGNED → TRANSCRIBED: caller must be job.reporter_id
4. For TRANSCRIBED → REVIEWED: caller must be job.editor_id
5. Save log entry
6. If REVIEWED → COMPLETED: trigger payment calculation
```

---

### 3.4 Payments Module

**Path**: `apps/api/src/modules/payments/`

**Files**:

```
payments/
├── payments.module.ts
├── payments.controller.ts
├── payments.service.ts
├── payments.repository.ts
├── entities/
│   └── payment.entity.ts
└── dto/
    ├── payment-response.dto.ts
    └── mark-paid.dto.ts
```

**Payment Rules**:

```yaml
Reporter:
  rate: 2000 IDR per minute
  formula: duration_minutes × rate
  assignment_type: REPORTER

Editor:
  rate: 150000 IDR flat per job
  formula: flat fee (rate field)
  assignment_type: EDITOR

Payment record created: when assigned
Payment amount calculated: when job reaches COMPLETED
Payment marked as PAID: manually by ADMIN/MANAGER
```

**Endpoints**:

```
GET  /payments                → list all payments (filter: status, user) [ADMIN, MANAGER]
GET  /payments/my             → own payments                             [REPORTER, EDITOR]
GET  /payments/:id            → payment detail                           [ADMIN, MANAGER]
GET  /payments/job/:jobId     → payments for a specific job              [ADMIN, MANAGER]
PATCH /payments/:id/mark-paid → mark as paid                            [ADMIN, MANAGER]
```

---

## 4. Frontend Architecture

### 4.1 Route Structure (TanStack Router)

```
/                     → redirect to /dashboard
/login                → Login page (public)
/dashboard            → Dashboard (protected)
/jobs                 → Job list
/jobs/new             → Create job
/jobs/:jobId          → Job detail + status management
/users                → User management (ADMIN only)
/users/new            → Create user
/users/:userId        → User detail + role management
/payments             → Payment list
/payments/my          → My payments (reporter/editor view)
/settings             → App settings (ADMIN only)
```

### 4.2 Auth Flow

```
1. POST /auth/login → store accessToken in memory (Zustand), refreshToken in httpOnly cookie
2. Axios interceptor: attach Authorization: Bearer {accessToken} to every request
3. On 401: call POST /auth/refresh → update accessToken in Zustand store
4. On refresh failure: redirect to /login and clear state
5. Route guards: check auth state + role before rendering protected routes
```

### 4.3 Zustand Store Structure

```typescript
// stores/auth.store.ts
interface AuthState {
  user: JwtPayload | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}
```

### 4.4 Component Organization

```
src/
├── routes/
│   ├── __root.tsx           # Root layout
│   ├── _auth/
│   │   └── login.tsx
│   └── _protected/
│       ├── dashboard.tsx
│       ├── jobs/
│       │   ├── index.tsx    # Job list
│       │   ├── new.tsx      # Create job
│       │   └── $jobId.tsx   # Job detail
│       ├── users/
│       │   ├── index.tsx
│       │   ├── new.tsx
│       │   └── $userId.tsx
│       └── payments/
│           ├── index.tsx
│           └── my.tsx
├── components/
│   ├── ui/                  # Reusable primitives (Button, Input, Badge, Table, etc.)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── PageHeader.tsx
│   ├── jobs/
│   │   ├── JobCard.tsx
│   │   ├── JobStatusBadge.tsx
│   │   ├── JobStatusFlow.tsx    # Visual stepper
│   │   ├── AssignReporterModal.tsx
│   │   └── AssignEditorModal.tsx
│   ├── payments/
│   │   └── PaymentSummaryCard.tsx
│   └── users/
│       └── UserRoleChip.tsx
├── hooks/
│   ├── useJobs.ts           # TanStack Query hooks for jobs API
│   ├── useUsers.ts
│   ├── usePayments.ts
│   └── useAuth.ts
├── lib/
│   ├── axios.ts             # Configured axios instance
│   ├── query-client.ts      # TanStack Query client
│   └── format.ts            # IDR formatter, date utils
└── stores/
    └── auth.store.ts
```

### 4.5 Dashboard Widgets

```
┌─────────────────────────────────────────────────────────┐
│  STAT CARDS (top row)                                   │
│  [ Total Jobs ]  [ New Jobs ]  [ In Progress ]  [ Done ]│
├─────────────────────────────────────────────────────────┤
│  JOB LIST TABLE                                         │
│  Case Name | Duration | Type | Reporter | Editor |Status│
│  + filter by status, search by case_name               │
├───────────────────────┬─────────────────────────────────┤
│  RECENT PAYMENTS      │  REPORTER AVAILABILITY          │
│  Job | Assignee | IDR │  Name | City | Available        │
└───────────────────────┴─────────────────────────────────┘
```

### 4.6 Job Detail Page Components

```
JobDetailPage
├── JobHeader (case_name, status badge, created date)
├── JobStatusFlow (stepper: NEW → ASSIGNED → ... → COMPLETED)
├── JobInfoCard (duration, location, city)
├── AssignmentSection
│   ├── ReporterSection (show reporter or "Assign" button)
│   └── EditorSection (show editor or "Assign" button)
├── PaymentSection (per-job payment summary)
└── StatusLogTimeline (audit trail of status changes)
```

---

## 5. Environment Variables

### Backend (`apps/api/.env`)

```env
# App
NODE_ENV=development
PORT=3001
API_PREFIX=api/v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=court_workflow
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# CORS
CORS_ORIGIN=http://localhost:5173

# Payment rates
REPORTER_RATE_PER_MINUTE=2000
EDITOR_FLAT_RATE=150000
```

### Frontend (`apps/web/.env`)

```env
VITE_API_URL=http://localhost:3001/api/v1
```

---

## 6. Package Setup

### Root `package.json`

```json
{
  "name": "court-workflow",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "db:migrate": "turbo run db:migrate --filter=api",
    "db:seed": "turbo run db:seed --filter=api"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

### Backend `apps/api/package.json` — Key Dependencies

```json
{
  "dependencies": {
    "@nestjs/common": "^10",
    "@nestjs/core": "^10",
    "@nestjs/platform-express": "^10",
    "@nestjs/jwt": "^10",
    "@nestjs/passport": "^10",
    "@nestjs/typeorm": "^10",
    "@nestjs/config": "^3",
    "typeorm": "^0.3",
    "pg": "^8",
    "bcrypt": "^5",
    "passport": "^0.7",
    "passport-jwt": "^4",
    "passport-local": "^1",
    "class-validator": "^0.14",
    "class-transformer": "^0.5",
    "reflect-metadata": "^0.2",
    "rxjs": "^7",
    "@court-workflow/shared": "workspace:*"
  }
}
```

### Frontend `apps/web/package.json` — Key Dependencies

```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "@tanstack/react-router": "^1",
    "@tanstack/react-query": "^5",
    "axios": "^1",
    "zustand": "^4",
    "@court-workflow/shared": "workspace:*"
  }
}
```

---

## 7. Docker Compose

```yaml
# docker-compose.yml
version: "3.9"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: court_workflow
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  pgadmin:
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@admin.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

---

## 8. Implementation Order (for AI agents)

```
Phase 1 — Foundation
  [x] Setup monorepo (turbo, workspaces)
  [x] packages/shared — enums, types, ApiResponse
  [x] Docker Compose — Postgres up
  [x] NestJS app scaffold (main.ts, app.module.ts)
  [x] TypeORM config + migration runner

Phase 2 — RBAC Core
  [x] Migration: 001_create_rbac_tables
  [x] Seed: roles + permissions
  [x] Entities: User, Role, Permission, RefreshToken
  [x] Auth module — login, refresh, logout, /me
  [x] JWT strategy + Guards (JwtAuthGuard, RolesGuard)
  [x] Users module — CRUD + role assignment

Phase 3 — Business Logic
  [x] Jobs module — CRUD
  [x] Jobs — assign reporter (with city preference logic)
  [x] Jobs — assign editor
  [x] Jobs — status transitions + validation + logging
  [x] Payments module — auto-create on assignment
  [x] Payments — calculate on COMPLETED
  [x] Payments — mark as paid

Phase 4 — Frontend
  [x] Vite + React + TanStack Router setup
  [x] Zustand auth store
  [x] Axios interceptors (attach token + refresh on 401)
  [x] Login page
  [x] Protected route layout + sidebar
  [x] Dashboard page (stats + job list)
  [x] Jobs list + create job
  [x] Job detail + assign modals + status stepper
  [x] Users management (ADMIN)
  [x] Payments list + my-payments view
```

---

## 9. Key Business Rules Summary

```yaml
Job Assignment:
  - Reporter must have REPORTER role and is_available = true
  - Physical jobs: reporter.city must match job.location_city
    (MANAGER can force-override)
  - Editor assigned after job is TRANSCRIBED
  - Editor must have EDITOR role and is_available = true

Status Machine:
  NEW → ASSIGNED:      assign-reporter action (ADMIN/MANAGER)
  ASSIGNED → TRANSCRIBED: reporter self-reports completion
  TRANSCRIBED → REVIEWED: editor self-reports completion
  REVIEWED → COMPLETED:   ADMIN/MANAGER finalizes

Payment:
  - Records created automatically on assignment
  - Amount calculated when job reaches COMPLETED
  - Reporter: duration × 2000 IDR
  - Editor: flat 150,000 IDR
  - ADMIN/MANAGER manually marks payments as PAID

RBAC:
  - ADMIN: full access
  - MANAGER: manage jobs, assignments, view payments
  - REPORTER: view own jobs, mark own job as TRANSCRIBED, view own payments
  - EDITOR: view own jobs, mark own job as REVIEWED, view own payments
```

---

## 10. Notes for AI Agent

```
CRITICAL — do exactly as specified:
1. Never put logic in controllers. Controllers = input validation + service call only.
2. Always use DTOs with class-validator decorators for request bodies.
3. Always use @UseGuards(JwtAuthGuard, RolesGuard) at controller class level.
4. Use @Roles() OR @RequirePermissions() at method level (not both, pick the right one).
5. Payments are created as PENDING when reporter/editor is assigned — NOT when job completes.
   Amount is calculated and saved when job transitions to COMPLETED.
6. job_status_logs must be written on every status change — including assignment.
7. refreshToken must be hashed (SHA-256) before storing in DB — never store raw.
8. accessToken payload must include roles[] and permissions[] arrays for zero-DB-hit auth checks.
9. Use ClassSerializerInterceptor globally to honor @Exclude() on entities.
10. All list endpoints must support pagination: ?page=1&limit=10
```
