import { useParams } from "@tanstack/react-router"
import { users } from "@/lib/mock-data"
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

export function UserDetailPage() {
  const { id } = useParams({ from: "/app/app/access/users/$id" })
  const user = users.find((u) => u.id === id)

  if (!user) return <div>User not found</div>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app/access/users">
            <ChevronLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">User Details</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-1 text-sm">
            <div className="text-muted-foreground">Name</div>
            <div className="font-medium">{user.name}</div>
            <div className="text-muted-foreground">Email</div>
            <div className="font-medium">{user.email}</div>
            <div className="text-muted-foreground">Role</div>
            <div>
              <Badge variant="secondary">{user.role}</Badge>
            </div>
            <div className="text-muted-foreground">Status</div>
            <div>
              <Badge
                variant={user.status === "active" ? "default" : "destructive"}
              >
                {user.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
