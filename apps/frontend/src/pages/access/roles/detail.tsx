import { useParams } from "@tanstack/react-router"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Link } from "@tanstack/react-router"
import {
  ChevronLeftIcon,
  Loader2Icon,
  AlertCircleIcon,
  KeyIcon,
  TrashIcon,
} from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { api } from "@/lib/axios"

interface Permission {
  id: string
  name: string
  description: string
}

interface RoleData {
  id: string
  name: string
  description: string
  isSystem: boolean
  permissions: Permission[]
  createdAt: string
  updatedAt: string
}

export function RoleDetailPage() {
  const { id } = useParams({ from: "/app/access/roles/$id" })
  const { data: role, isLoading, error, refetch } = useApi<RoleData>(`/roles/${id}`)

  const handleDelete = async () => {
    if (!role) return
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/roles/${id}`)
      window.location.href = '/app/access/roles'
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Failed to delete role')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !role) {
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-destructive">
        <AlertCircleIcon className="h-6 w-6" />
        <p className="text-sm">{error ?? 'Role not found'}</p>
        <Button variant="outline" size="sm" asChild>
          <Link to="/app/access/roles">Back to Roles</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/app/access/roles">
              <ChevronLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{role.name}</h1>
          {role.isSystem ? (
            <Badge variant="secondary">System</Badge>
          ) : (
            <Badge variant="outline">Custom</Badge>
          )}
        </div>
        {!role.isSystem && (
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <TrashIcon className="h-4 w-4 mr-1" />
            Delete Role
          </Button>
        )}
      </div>

      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Role Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="text-muted-foreground">Name</div>
            <div className="font-medium">{role.name}</div>
            <div className="text-muted-foreground">Description</div>
            <div className="font-medium">{role.description ?? '—'}</div>
            <div className="text-muted-foreground">Type</div>
            <div className="font-medium">{role.isSystem ? 'System (cannot be deleted)' : 'Custom'}</div>
            <div className="text-muted-foreground">Created</div>
            <div className="font-medium">{new Date(role.createdAt).toLocaleDateString()}</div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyIcon className="h-4 w-4" />
            Permissions
            <Badge variant="outline" className="ml-1">{role.permissions.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {role.permissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No permissions assigned</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {role.permissions.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col rounded-md border p-3 gap-1"
                >
                  <span className="font-mono text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.description}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
