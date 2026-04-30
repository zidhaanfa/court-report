import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@workspace/ui/components/sidebar'
import { AppSidebar } from './components/app-sidebar'
import { useAuthStore } from './stores/auth.store'

// Import Access Pages
import { UsersPage } from './pages/access/users'
import { UserDetailPage } from './pages/access/users/detail'
import { RolesPage } from './pages/access/roles'
import { RoleDetailPage } from './pages/access/roles/detail'
import { PermissionsPage } from './pages/access/permissions'
import { PermissionDetailPage } from './pages/access/permissions/detail'
import { SettingsPage } from './pages/settings'
import { JobsPage } from './pages/jobs'
import { JobDetailPage } from './pages/jobs/detail'
import { PaymentsPage } from './pages/payments'
import { LoginForm } from './components/login-form'

// -- Layouts --

function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function AuthLayout() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </div>
  )
}

// -- Routes --

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

// App Group (with Sidebar)
const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app',
  component: AppLayout,
  beforeLoad: ({ location }) => {
    // Auth guard — redirect unauthenticated users to sign-in
    const { isAuthenticated } = useAuthStore.getState()
    if (!isAuthenticated) {
      throw redirect({
        to: '/signin',
        search: { redirect: location.href },
      })
    }
    if (location.pathname === '/app' || location.pathname === '/app/') {
      throw redirect({ to: '/app/dashboard' })
    }
  },
})

const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'dashboard',
  component: () => (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Welcome to the Dashboard.</p>
    </div>
  ),
})

// Users
const usersRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'access/users',
  component: UsersPage,
})

const userDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'access/users/$id',
  component: UserDetailPage,
})

// Roles
const rolesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'access/roles',
  component: RolesPage,
})

const roleDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'access/roles/$id',
  component: RoleDetailPage,
})

// Permissions
const permissionsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'access/permissions',
  component: PermissionsPage,
})

const permissionDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'access/permissions/$id',
  component: PermissionDetailPage,
})

// Settings
const settingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'settings',
  component: SettingsPage,
})

// Jobs
const jobsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'jobs',
  component: JobsPage,
})

const jobDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'jobs/$id',
  component: JobDetailPage,
})

// Payments
const paymentsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'payments',
  component: PaymentsPage,
})

// Auth Group (No Sidebar)
const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'auth',
  component: AuthLayout,
})

const signInRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: 'signin',
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState()
    if (isAuthenticated) {
      throw redirect({ to: '/app/dashboard' })
    }
  },
  component: () => <LoginForm />,
})

// Landing Page
function LandingPage() {
  return (
    <div className="min-h-svh flex flex-col">
      {/* Hero */}
      <header className="flex items-center justify-between px-8 py-4 border-b">
        <h1 className="text-xl font-bold">Court Report</h1>
        <nav className="flex gap-4">
          <a
            href="/signin"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign In
          </a>
          <a
            href="/app/dashboard"
            className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            Dashboard
          </a>
        </nav>
      </header>
      <main className="flex flex-1 items-center justify-center">
        <div className="text-center max-w-2xl px-6">
          <h2 className="text-4xl font-bold tracking-tight mb-4">
            Court Reporting Workflow Manager
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            A simplified workflow system for managing transcription jobs, assigning reporters &
            editors, and tracking payments.
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="/app/dashboard"
              className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors"
            >
              Get Started
            </a>
            <a
              href="/signin"
              className="border px-6 py-3 rounded-md font-medium hover:bg-accent transition-colors"
            >
              Sign In
            </a>
          </div>
        </div>
      </main>
      <footer className="border-t px-8 py-4 text-center text-sm text-muted-foreground">
        &copy; 2026 Court Report. All rights reserved.
      </footer>
    </div>
  )
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
})

// -- Tree --

const routeTree = rootRoute.addChildren([
  indexRoute,
  appLayoutRoute.addChildren([
    dashboardRoute,
    usersRoute,
    userDetailRoute,
    rolesRoute,
    roleDetailRoute,
    permissionsRoute,
    permissionDetailRoute,
    settingsRoute,
    jobsRoute,
    jobDetailRoute,
    paymentsRoute,
  ]),
  authLayoutRoute.addChildren([signInRoute]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
