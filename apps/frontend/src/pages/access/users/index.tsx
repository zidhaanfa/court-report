import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Link } from '@tanstack/react-router'
import { useUserStore } from '@/stores/user.store'
import { DataTablePagination } from '@workspace/ui/components/data-table-pagination'
import { Loader2Icon, AlertCircleIcon, UsersIcon, PlusIcon } from 'lucide-react'
import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'

export function UsersPage() {
  const [page, setPage] = useState(1)
  const { users, meta, isLoading, error, fetchUsers, createUser } = useUserStore()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  React.useEffect(() => {
    fetchUsers(page)
  }, [fetchUsers, page])

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCreating(true)
    const form = new FormData(e.currentTarget)
    try {
      await createUser({
        email: form.get('email'),
        password: form.get('password'),
        fullName: form.get('fullName'),
        phone: form.get('phone') || undefined,
        city: form.get('city') || undefined,
      })
      setOpen(false)
      fetchUsers(page)
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
        <Button variant="outline" size="sm" onClick={() => fetchUsers(page)}>
          Retry
        </Button>
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
          <Badge variant="secondary" className="ml-1">
            {userList.length}
          </Badge>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <PlusIcon className="h-4 w-4 mr-1" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create User</DialogTitle>
                <DialogDescription>
                  Fill in the details to create a new user account.
                </DialogDescription>
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
              <TableHead>Contact</TableHead>
              <TableHead>Availability</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (!users || users.length === 0) ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-[150px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[120px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-[80px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-[100px]" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-[60px] ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : users && users.length > 0 ? (
              users.map((user) => (
                <TableRow
                  key={user.id}
                  className={
                    isLoading
                      ? 'opacity-50 pointer-events-none transition-opacity'
                      : 'transition-opacity'
                  }
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{user.fullName}</span>
                      <span className="text-sm text-muted-foreground">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span>{user.phone || '-'}</span>
                      <span className="text-muted-foreground">{user.city || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.isAvailable ? (
                      <Badge variant="default" className="bg-green-500">
                        Available
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Busy</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.status === 'ACTIVE' ? (
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-600 border-red-200">
                        {user.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge key={role.id} variant="secondary" className="text-xs">
                          {role.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/app/access/users/$id" params={{ id: user.id }}>
                        Edit
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
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
