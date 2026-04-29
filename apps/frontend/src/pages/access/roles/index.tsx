import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Link } from "@tanstack/react-router"
import { useApi } from "@/hooks/use-api"
import { Loader2Icon, AlertCircleIcon, ShieldCheckIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { api } from "@/lib/axios"
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
}

export function RolesPage() {
  const { data: roles, isLoading, error, refetch } = useApi<RoleData[]>('/roles')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCreating(true)
    const form = new FormData(e.currentTarget)
    try {
      await api.post('/roles', {
        name: form.get('name'),
        description: form.get('description') || undefined,
      })
      setOpen(false)
      refetch()
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Failed to create role')
    } finally {
      setCreating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-destructive">
        <AlertCircleIcon className="h-6 w-6" />
        <p className="text-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={refetch}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Roles</h1>
          <Badge variant="secondary" className="ml-1">{roles?.length ?? 0}</Badge>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><PlusIcon className="h-4 w-4 mr-1" /> Add Role</Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create Role</DialogTitle>
                <DialogDescription>Create a new role and assign permissions later.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="cr-name">Role Name</Label>
                  <Input id="cr-name" name="name" placeholder="e.g. SUPERVISOR" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cr-desc">Description</Label>
                  <Textarea id="cr-desc" name="description" placeholder="What this role does..." rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={creating}>
                  {creating ? <Loader2Icon className="h-4 w-4 animate-spin mr-1" /> : null}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(roles ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No roles found
                </TableCell>
              </TableRow>
            ) : (
              (roles ?? []).map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {role.description ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{role.permissions.length} permissions</Badge>
                  </TableCell>
                  <TableCell>
                    {role.isSystem ? (
                      <Badge variant="secondary" className="text-xs">System</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Custom</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/app/access/roles/$id" params={{ id: role.id }}>
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
