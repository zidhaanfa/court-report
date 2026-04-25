import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { badgeVariants } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { permissions } from "@/lib/mock-data"
import { Link } from "@tanstack/react-router"

export function PermissionsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Permissions</h1>
        <Button>Add Permission</Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Permission Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((permission) => (
              <TableRow key={permission.id}>
                <TableCell className="font-medium">{permission.name}</TableCell>
                <TableCell className="max-w-md text-muted-foreground truncate">
                  {permission.description}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" asChild>
                    <Link to="/app/access/permissions/$id" params={{ id: permission.id }}>
                      View
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
