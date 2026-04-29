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
  ShieldIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { api } from "@/lib/axios"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

interface Permission {
  id: string
  name: string
  description: string
}

interface Role {
  id: string
  name: string
  description: string
  isSystem: boolean
  permissions: Permission[]
}

interface UserData {
  id: string
  email: string
  fullName: string
  phone: string | null
  city: string | null
  isAvailable: boolean
  status: string
  roles: Role[]
  createdAt: string
  updatedAt: string
}

export function UserDetailPage() {
  const { id } = useParams({ from: "/app/access/users/$id" })
  const { data: user, isLoading, error, refetch } = useApi<UserData>(`/users/${id}`)
  const { data: allRoles } = useApi<Role[]>('/roles')
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedRoleId, setSelectedRoleId] = useState("")
  const [assigning, setAssigning] = useState(false)

  const handleAssignRole = async () => {
    if (!selectedRoleId) return
    setAssigning(true)
    try {
      await api.post(`/users/${id}/roles`, { roleId: selectedRoleId })
      setAssignOpen(false)
      setSelectedRoleId("")
      refetch()
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Failed to assign role')
    } finally {
      setAssigning(false)
    }
  }

  const handleRemoveRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Remove role "${roleName}" from this user?`)) return
    try {
      await api.delete(`/users/${id}/roles/${roleId}`)
      refetch()
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Failed to remove role')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-destructive">
        <AlertCircleIcon className="h-6 w-6" />
        <p className="text-sm">{error ?? 'User not found'}</p>
        <Button variant="outline" size="sm" asChild>
          <Link to="/app/access/users">Back to Users</Link>
        </Button>
      </div>
    )
  }

  // Roles not yet assigned
  const availableRoles = (allRoles ?? []).filter(
    (r) => !user.roles.some((ur) => ur.id === r.id),
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app/access/users">
            <ChevronLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{user.fullName}</h1>
        <Badge variant={user.status === 'ACTIVE' ? 'default' : 'destructive'}>
          {user.status}
        </Badge>
      </div>

      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="text-muted-foreground">Email</div>
            <div className="font-medium">{user.email}</div>
            <div className="text-muted-foreground">Phone</div>
            <div className="font-medium">{user.phone ?? '—'}</div>
            <div className="text-muted-foreground">City</div>
            <div className="font-medium">{user.city ?? '—'}</div>
            <div className="text-muted-foreground">Available</div>
            <div>
              <Badge variant={user.isAvailable ? 'default' : 'outline'}>
                {user.isAvailable ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="text-muted-foreground">Created</div>
            <div className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</div>
          </div>
        </CardContent>
      </Card>

      {/* Roles Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShieldIcon className="h-4 w-4" />
              Roles
            </CardTitle>
            <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={availableRoles.length === 0}>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Assign Role
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Role</DialogTitle>
                  <DialogDescription>Select a role to assign to {user.fullName}.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button onClick={handleAssignRole} disabled={!selectedRoleId || assigning}>
                    {assigning ? <Loader2Icon className="h-4 w-4 animate-spin mr-1" /> : null}
                    Assign
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {user.roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No roles assigned</p>
          ) : (
            <div className="space-y-3">
              {user.roles.map((role) => (
                <div key={role.id} className="flex items-start justify-between rounded-md border p-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{role.name}</span>
                      {role.isSystem && <Badge variant="outline" className="text-xs">System</Badge>}
                    </div>
                    {role.description && (
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {role.permissions.map((p) => (
                        <Badge key={p.id} variant="secondary" className="text-xs font-mono">
                          {p.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveRole(role.id, role.name)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
