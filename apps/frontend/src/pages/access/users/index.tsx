import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Link } from "@tanstack/react-router"
import { usePaginatedApi } from "@/hooks/use-paginated-api"
import { DataTablePagination } from "@workspace/ui/components/data-table-pagination"
import { Loader2Icon, AlertCircleIcon, UsersIcon, PlusIcon } from "lucide-react"
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

interface UserData {
  id: string
  email: string
  fullName: string
  phone: string | null
  city: string | null
  isAvailable: boolean
  status: string
  roles: Array<{ id: string; name: string }>
  createdAt: string
}



export function UsersPage() {
  const [page, setPage] = useState(1)
  const { data: users, meta, isLoading, error, refetch } = usePaginatedApi<UserData>('/users', page)
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCreating(true)
    const form = new FormData(e.currentTarget)
    try {
      await api.post('/users', {
        email: form.get('email'),
        password: form.get('password'),
        fullName: form.get('fullName'),
        phone: form.get('phone') || undefined,
        city: form.get('city') || undefined,
      })
      setOpen(false)
      refetch()
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Failed to create user')
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

  const userList = users ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UsersIcon className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Users</h1>
          <Badge variant="secondary" className="ml-1">{userList.length}</Badge>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><PlusIcon className="h-4 w-4 mr-1" /> Add User</Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create User</DialogTitle>
                <DialogDescription>Fill in the details to create a new user account.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="cu-fullName">Full Name</Label>
                  <Input id="cu-fullName" name="fullName" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cu-email">Email</Label>
                  <Input id="cu-email" name="email" type="email" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cu-password">Password</Label>
                  <Input id="cu-password" name="password" type="password" required minLength={6} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cu-phone">Phone</Label>
                    <Input id="cu-phone" name="phone" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cu-city">City</Label>
                    <Input id="cu-city" name="city" />
                  </div>
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
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              userList.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((r) => (
                        <Badge key={r.id} variant="secondary" className="text-xs">{r.name}</Badge>
                      ))}
                      {user.roles.length === 0 && (
                        <span className="text-xs text-muted-foreground">No roles</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.city ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'ACTIVE' ? 'default' : 'destructive'}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/app/access/users/$id" params={{ id: user.id }}>
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {meta && (
          <DataTablePagination
            page={meta.page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  )
}
