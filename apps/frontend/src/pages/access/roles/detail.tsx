import { useParams } from "@tanstack/react-router"
import { roles } from "@/lib/mock-data"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Link } from "@tanstack/react-router"
import { ChevronLeftIcon } from "lucide-react"

export function RoleDetailPage() {
  const { id } = useParams({ from: "/app/app/access/roles/$id" })
  const role = roles.find((r) => r.id === id)

  if (!role) return <div>Role not found</div>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app/access/roles">
            <ChevronLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Role Details</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-1 text-sm">
            <div className="text-muted-foreground">Role Name</div>
            <div className="font-medium">{role.name}</div>
            <div className="text-muted-foreground">System ID</div>
            <div className="text-mono font-medium">{role.id}</div>
          </div>
          <div className="flex flex-col gap-2 border-t pt-4">
            <div className="text-sm font-medium">Assigned Permissions</div>
            <div className="flex flex-wrap gap-2">
              {role.permissions.map((p) => (
                <Badge key={p} variant="secondary">
                  {p}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
