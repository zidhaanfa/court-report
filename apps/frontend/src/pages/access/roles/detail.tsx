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
  PencilIcon,
} from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { api } from "@/lib/axios"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { Checkbox } from "@workspace/ui/components/checkbox"

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
  const { data: allPermissions } = useApi<Permission[]>('/roles/permissions')

  const [editOpen, setEditOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [editData, setEditData] = useState({
    name: "",
    description: "",
    permissionIds: [] as string[],
  })

  // Sync form state when role data is loaded and dialog opens
  useEffect(() => {
    if (role && editOpen) {
      setEditData({
        name: role.name,
        description: role.description ?? "",
        permissionIds: role.permissions.map((p) => p.id),
      })
    }
  }, [role, editOpen])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    try {
      await api.patch(`/roles/${id}`, {
        name: editData.name,
        description: editData.description || undefined,
        permissionIds: editData.permissionIds,
      })
      setEditOpen(false)
      refetch()
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Failed to update role')
    } finally {
      setUpdating(false)
    }
  }

  const togglePermission = (permId: string) => {
    setEditData((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permId)
        ? prev.permissionIds.filter((id) => id !== permId)
        : [...prev.permissionIds, permId],
    }))
  }

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
        <div className="flex items-center gap-2">
          {!role.isSystem && (
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <PencilIcon className="h-4 w-4 mr-1" />
                  Edit Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <form onSubmit={handleUpdate}>
                  <DialogHeader>
                    <DialogTitle>Edit Role</DialogTitle>
                    <DialogDescription>
                      Update role details and assign permissions.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-name">Role Name</Label>
                      <Input
                        id="edit-name"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        required
                        disabled={role.isSystem}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-desc">Description</Label>
                      <Textarea
                        id="edit-desc"
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    
                    <div className="space-y-3 border-t pt-4">
                      <h4 className="text-sm font-medium leading-none">Permissions</h4>
                      <p className="text-sm text-muted-foreground">Select the permissions for this role.</p>
                      
                      <div className="grid gap-4 sm:grid-cols-2 mt-4">
                        {(allPermissions ?? []).map((perm) => (
                          <div key={perm.id} className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                            <Checkbox
                              id={`perm-${perm.id}`}
                              checked={editData.permissionIds.includes(perm.id)}
                              onCheckedChange={() => togglePermission(perm.id)}
                            />
                            <div className="space-y-1 leading-none">
                              <Label htmlFor={`perm-${perm.id}`} className="font-mono">{perm.name}</Label>
                              <p className="text-xs text-muted-foreground">
                                {perm.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updating}>
                      {updating ? <Loader2Icon className="h-4 w-4 animate-spin mr-1" /> : null}
                      Save Changes
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {!role.isSystem && (
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <TrashIcon className="h-4 w-4 mr-1" />
              Delete Role
            </Button>
          )}
        </div>
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
