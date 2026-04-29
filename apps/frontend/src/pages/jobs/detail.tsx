import React, { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useJobStore } from '@/stores/job.store'
import { useUserStore } from '@/stores/user.store'
import { useAuthStore } from '@/stores/auth.store'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Label } from '@workspace/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  Loader2,
  ArrowLeftIcon,
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  UserIcon,
  AlertCircle,
} from 'lucide-react'

export function JobDetailPage() {
  const router = useRouter()
  const jobId = window.location.pathname.split('/').pop() || ''

  const currentUser = useAuthStore((s) => s.user)
  const hasPermission = useAuthStore((s) => s.hasPermission)

  const {
    selectedJob: job,
    detailLoading: isLoading,
    detailError: error,
    jobPayments: payments,
    jobLogs: logs,
    fetchJobById,
    fetchJobPayments,
    fetchJobLogs,
    assignReporter,
    assignEditor,
    updateJobStatus,
    clearSelectedJob,
  } = useJobStore()
  const {
    reporters: availableReporters,
    editors: availableEditors,
    fetchReporters,
    fetchEditors,
  } = useUserStore()

  React.useEffect(() => {
    fetchJobById(jobId)
    fetchJobPayments(jobId)
    fetchJobLogs(jobId)
    fetchReporters()
    fetchEditors()
    return () => clearSelectedJob()
  }, [
    jobId,
    fetchJobById,
    fetchJobPayments,
    fetchJobLogs,
    fetchReporters,
    fetchEditors,
    clearSelectedJob,
  ])

  // Reporter Modal
  const [isReporterModalOpen, setReporterModalOpen] = useState(false)
  const [selectedReporterId, setSelectedReporterId] = useState('')
  const [forceReporter, setForceReporter] = useState(false)
  const [assigningReporter, setAssigningReporter] = useState(false)
  const [reporterError, setReporterError] = useState('')

  // Editor Modal
  const [isEditorModalOpen, setEditorModalOpen] = useState(false)
  const [selectedEditorId, setSelectedEditorId] = useState('')
  const [assigningEditor, setAssigningEditor] = useState(false)
  const [editorError, setEditorError] = useState('')

  // Status Transitions
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const refreshAll = () => {
    fetchJobById(jobId)
    fetchJobPayments(jobId)
    fetchJobLogs(jobId)
  }

  const handleAssignReporter = async () => {
    setAssigningReporter(true)
    setReporterError('')
    try {
      await assignReporter(jobId, selectedReporterId, forceReporter)
      setReporterModalOpen(false)
      setForceReporter(false)
      refreshAll()
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err.message
      setReporterError(msg)
      if (msg.includes('Use force=true')) {
        // We can show the checkbox now
      }
    } finally {
      setAssigningReporter(false)
    }
  }

  const handleAssignEditor = async () => {
    setAssigningEditor(true)
    setEditorError('')
    try {
      await assignEditor(jobId, selectedEditorId)
      setEditorModalOpen(false)
      refreshAll()
    } catch (err: any) {
      setEditorError(err?.response?.data?.message ?? err.message)
    } finally {
      setAssigningEditor(false)
    }
  }

  const handleUpdateStatus = async (newStatus: string) => {
    setUpdatingStatus(true)
    try {
      await updateJobStatus(jobId, newStatus)
      refreshAll()
    } catch (err: any) {
      alert(err?.response?.data?.message ?? err.message)
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-destructive">{error ?? 'Job not found'}</p>
        <Button onClick={() => router.history.back()} variant="outline">
          Go Back
        </Button>
      </div>
    )
  }

  const isAdminOrManager = currentUser?.roles?.some(
    (r) => r.name === 'ADMIN' || r.name === 'MANAGER'
  )
  const isAssignedReporter = job.reporter?.id === currentUser?.id
  const isAssignedEditor = job.editor?.id === currentUser?.id

  const canAssignReporter = hasPermission('job:assign-reporter')
  const canAssignEditor = hasPermission('job:assign-editor')
  const canMarkTranscribed = hasPermission('job:mark-transcribed')
  const canMarkReviewed = hasPermission('job:mark-reviewed')
  const canCompleteJob = hasPermission('job:complete')

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.history.back()}>
          <ArrowLeftIcon className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{job.caseName}</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
            <span className="font-mono">{job.id}</span>
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {job.status === 'NEW' && (
            <Badge variant="secondary" className="text-md py-1 px-4">
              New
            </Badge>
          )}
          {job.status === 'ASSIGNED' && (
            <Badge variant="default" className="bg-blue-500 text-md py-1 px-4">
              Assigned
            </Badge>
          )}
          {job.status === 'TRANSCRIBED' && (
            <Badge variant="default" className="bg-purple-500 text-md py-1 px-4">
              Transcribed
            </Badge>
          )}
          {job.status === 'REVIEWED' && (
            <Badge variant="default" className="bg-orange-500 text-md py-1 px-4">
              Reviewed
            </Badge>
          )}
          {job.status === 'COMPLETED' && (
            <Badge variant="default" className="bg-green-500 text-md py-1 px-4">
              Completed
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Job Info & Assignments */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <ClockIcon className="h-4 w-4" /> Duration
                  </span>
                  <span className="font-medium">{job.duration} minutes</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPinIcon className="h-4 w-4" /> Location
                  </span>
                  <span className="font-medium">
                    {job.locationType === 'PHYSICAL' ? `Physical (${job.locationCity})` : 'Remote'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" /> Created At
                  </span>
                  <span className="font-medium">{new Date(job.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Assignments</CardTitle>
                <CardDescription>Personnel assigned to this job.</CardDescription>
              </div>
              <div>
                {job.status === 'NEW' && canAssignReporter && (
                  <Button size="sm" onClick={() => setReporterModalOpen(true)}>
                    Assign Reporter
                  </Button>
                )}
                {job.status === 'TRANSCRIBED' && canAssignEditor && (
                  <Button size="sm" onClick={() => setEditorModalOpen(true)}>
                    Assign Editor
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <UserIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Court Reporter</p>
                    {job.reporter ? (
                      <p className="text-muted-foreground text-sm">
                        {job.reporter.fullName} {job.reporter.city ? `(${job.reporter.city})` : ''}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-sm italic">Unassigned</p>
                    )}
                  </div>
                </div>
                {job.status === 'ASSIGNED' &&
                  canMarkTranscribed &&
                  (isAssignedReporter || isAdminOrManager) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-purple-600 border-purple-200 hover:bg-purple-50"
                      onClick={() => handleUpdateStatus('TRANSCRIBED')}
                      disabled={updatingStatus}
                    >
                      Mark as Transcribed
                    </Button>
                  )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <UserIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Editor</p>
                    {job.editor ? (
                      <p className="text-muted-foreground text-sm">{job.editor.fullName}</p>
                    ) : (
                      <p className="text-muted-foreground text-sm italic">Unassigned</p>
                    )}
                  </div>
                </div>
                {job.status === 'TRANSCRIBED' &&
                  job.editor &&
                  canMarkReviewed &&
                  (isAssignedEditor || isAdminOrManager) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-orange-600 border-orange-200 hover:bg-orange-50"
                      onClick={() => handleUpdateStatus('REVIEWED')}
                      disabled={updatingStatus}
                    >
                      Mark as Reviewed
                    </Button>
                  )}
                {job.status === 'REVIEWED' && canCompleteJob && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 border-green-200 hover:bg-green-50"
                    onClick={() => handleUpdateStatus('COMPLETED')}
                    disabled={updatingStatus}
                  >
                    Complete Job
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {payments && payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">
                          {p.assignmentType === 'REPORTER' ? 'Reporter Payout' : 'Editor Payout'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {p.user.fullName} • Rate: Rp {p.rate.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">Rp {p.amount.toLocaleString()}</p>
                        <Badge
                          variant={p.status === 'PAID' ? 'default' : 'outline'}
                          className={p.status === 'PAID' ? 'bg-green-500' : ''}
                        >
                          {p.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Timeline / Logs */}
        <div className="space-y-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              {logs && logs.length > 0 ? (
                <div className="relative border-l border-muted ml-3 space-y-6 pb-4">
                  {logs.map((log) => (
                    <div key={log.id} className="relative pl-6">
                      <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                        <p className="text-sm font-medium">
                          {log.fromStatus
                            ? `${log.fromStatus} → ${log.toStatus}`
                            : `Created as ${log.toStatus}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          By: {log.changedByUser.fullName}
                        </p>
                        {log.note && (
                          <p className="text-sm italic mt-1 bg-muted p-2 rounded-md">{log.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No logs available.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reporter Modal */}
      <Dialog open={isReporterModalOpen} onOpenChange={setReporterModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Court Reporter</DialogTitle>
            <DialogDescription>
              Select an available reporter for this job.
              {job.locationType === 'PHYSICAL' && ` The job is in ${job.locationCity}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {reporterError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md flex flex-col gap-2">
                {reporterError}
                {reporterError.includes('force=true') && (
                  <label className="flex items-center gap-2 cursor-pointer mt-2 text-foreground font-medium">
                    <input
                      type="checkbox"
                      checked={forceReporter}
                      onChange={(e) => setForceReporter(e.target.checked)}
                      className="rounded"
                    />
                    Force Assignment (Ignore City Warning)
                  </label>
                )}
              </div>
            )}
            <div className="grid gap-2">
              <Label>Select Reporter</Label>
              <Select value={selectedReporterId} onValueChange={setSelectedReporterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a reporter..." />
                </SelectTrigger>
                <SelectContent>
                  {availableReporters?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.fullName} {r.city ? `(${r.city})` : ''}{' '}
                      {!r.isAvailable ? '- Unavailable' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReporterModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignReporter}
              disabled={assigningReporter || !selectedReporterId}
            >
              {assigningReporter && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editor Modal */}
      <Dialog open={isEditorModalOpen} onOpenChange={setEditorModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Editor</DialogTitle>
            <DialogDescription>Select an editor to review the transcript.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {editorError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {editorError}
              </div>
            )}
            <div className="grid gap-2">
              <Label>Select Editor</Label>
              <Select value={selectedEditorId} onValueChange={setSelectedEditorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an editor..." />
                </SelectTrigger>
                <SelectContent>
                  {availableEditors?.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.fullName} {!e.isAvailable ? '- Unavailable' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignEditor} disabled={assigningEditor || !selectedEditorId}>
              {assigningEditor && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
