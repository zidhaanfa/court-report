import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { usePaginatedApi } from '@/hooks/use-paginated-api'
import { api } from '@/lib/axios'
import { DataTablePagination } from "@workspace/ui/components/data-table-pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select'
import { Loader2, PlusIcon, AlertCircle } from 'lucide-react'

interface JobData {
  id: string
  caseName: string
  duration: number
  locationType: 'PHYSICAL' | 'REMOTE'
  locationCity?: string
  status: 'NEW' | 'ASSIGNED' | 'TRANSCRIBED' | 'REVIEWED' | 'COMPLETED'
  reporter?: { id: string; fullName: string }
  editor?: { id: string; fullName: string }
  createdAt: string
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'NEW':
      return <Badge variant="secondary">New</Badge>
    case 'ASSIGNED':
      return <Badge variant="default" className="bg-blue-500">Assigned</Badge>
    case 'TRANSCRIBED':
      return <Badge variant="default" className="bg-purple-500">Transcribed</Badge>
    case 'REVIEWED':
      return <Badge variant="default" className="bg-orange-500">Reviewed</Badge>
    case 'COMPLETED':
      return <Badge variant="default" className="bg-green-500">Completed</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function JobsPage() {
  const [page, setPage] = useState(1)
  const { data: jobs, meta, isLoading, error, refetch } = usePaginatedApi<JobData>('/jobs', page)
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  
  const [formData, setFormData] = useState({
    caseName: '',
    duration: 0,
    locationType: 'REMOTE',
    locationCity: '',
  })

  const handleCreate = async () => {
    setCreating(true)
    setCreateError('')
    try {
      await api.post('/jobs', {
        caseName: formData.caseName,
        duration: Number(formData.duration),
        locationType: formData.locationType,
        locationCity: formData.locationType === 'PHYSICAL' ? formData.locationCity : undefined,
      })
      setIsDialogOpen(false)
      setFormData({ caseName: '', duration: 0, locationType: 'REMOTE', locationCity: '' })
      refetch()
    } catch (err: any) {
      setCreateError(err?.response?.data?.message ?? err.message ?? 'Failed to create job')
    } finally {
      setCreating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-destructive">
        <AlertCircle className="h-8 w-8" />
        <p>{error}</p>
        <Button variant="outline" onClick={refetch}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">Manage transcription and editing workflows.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Job
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Job</DialogTitle>
              <DialogDescription>
                Fill out the details for the new recording/transcription job.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {createError && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {createError}
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="caseName">Case Name</Label>
                <Input
                  id="caseName"
                  placeholder="e.g. State v. Smith"
                  value={formData.caseName}
                  onChange={(e) => setFormData({ ...formData, caseName: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="locationType">Location Type</Label>
                <Select
                  value={formData.locationType}
                  onValueChange={(val) => setFormData({ ...formData, locationType: val })}
                >
                  <SelectTrigger id="locationType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REMOTE">Remote</SelectItem>
                    <SelectItem value="PHYSICAL">Physical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.locationType === 'PHYSICAL' && (
                <div className="grid gap-2">
                  <Label htmlFor="locationCity">City</Label>
                  <Input
                    id="locationCity"
                    placeholder="e.g. New York"
                    value={formData.locationCity}
                    onChange={(e) => setFormData({ ...formData, locationCity: e.target.value })}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating || !formData.caseName || formData.duration <= 0}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Job
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Assignments</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs && jobs.length > 0 ? (
              jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.caseName}</TableCell>
                  <TableCell>
                    <StatusBadge status={job.status} />
                  </TableCell>
                  <TableCell>
                    {job.locationType === 'PHYSICAL' ? (
                      <span>Physical ({job.locationCity})</span>
                    ) : (
                      <span>Remote</span>
                    )}
                  </TableCell>
                  <TableCell>{job.duration} min</TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm text-muted-foreground">
                      <span>Reporter: {job.reporter ? job.reporter.fullName : 'Unassigned'}</span>
                      <span>Editor: {job.editor ? job.editor.fullName : 'Unassigned'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to="/app/jobs/$id" params={{ id: job.id }}>
                      <Button variant="ghost" size="sm">
                        View Detail
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No jobs found.
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
