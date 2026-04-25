import { useParams } from "@tanstack/react-router"
import { permissions } from "@/lib/mock-data"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Link } from "@tanstack/react-router"
import { ChevronLeftIcon } from "lucide-react"

export function PermissionDetailPage() {
  const { id } = useParams({ from: "/app/app/access/permissions/$id" })
  const permission = permissions.find((p) => p.id === id)

  if (!permission) return <div>Permission not found</div>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app/access/permissions">
            <ChevronLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Permission Details</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-1 text-sm">
            <div className="text-muted-foreground">Name</div>
            <div className="font-medium">{permission.name}</div>
            <div className="text-muted-foreground">ID</div>
            <div className="text-mono font-medium">{permission.id}</div>
          </div>
          <div className="flex flex-col gap-2 border-t pt-4">
            <div className="text-sm font-medium">Description</div>
            <div className="text-sm text-muted-foreground">
              {permission.description}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
