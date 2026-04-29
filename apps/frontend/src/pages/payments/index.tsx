import { useEffect, useState } from 'react'
import { api } from '@/lib/axios'
import { useAuthStore } from '@/stores/auth.store'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Loader2, DollarSign, CheckCircle2, ExternalLink } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { usePaginatedApi } from '@/hooks/use-paginated-api'
import { DataTablePagination } from '@workspace/ui/components/data-table-pagination'

// Types
type PaymentStatus = 'PENDING' | 'PAID'

interface PaymentData {
  id: string
  jobId: string
  userId: string
  assignmentType: string
  rate: number
  amount: number
  durationUsed?: number
  status: PaymentStatus
  createdAt: string
  updatedAt: string
  job?: {
    id: string
    caseName: string
    duration: number
  }
  user?: {
    id: string
    fullName: string
    email: string
  }
}

export function PaymentsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')

  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canReadAllPayments = hasPermission('payment:read')
  const canMarkPaid = hasPermission('payment:mark-paid')

  // Build the endpoint based on permissions
  const endpoint = canReadAllPayments ? '/payments' : '/payments/my'

  // Build query params
  const queryParams = new URLSearchParams()
  if (statusFilter !== 'ALL') {
    queryParams.append('status', statusFilter)
  }
  // For MVP, we'll fetch up to 50 items. Real app should have pagination UI.
  queryParams.append('limit', '50')

  const url = `${endpoint}?${queryParams.toString()}`

  // Ensure page state resets when filter changes
  useEffect(() => {
    setPage(1)
  }, [statusFilter])

  const { data: payments, meta, isLoading, refetch } = usePaginatedApi<PaymentData>(url, page)

  const handleMarkPaid = async (paymentId: string) => {
    setProcessingId(paymentId)
    setErrorMsg('')
    try {
      await api.patch(`/payments/${paymentId}/mark-paid`)
      refetch()
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Failed to update payment status.')
    } finally {
      setProcessingId(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-2">
            {canReadAllPayments
              ? 'Manage and track all system payments.'
              : 'View your payment history and earnings.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
          {errorMsg}
        </div>
      )}

      <Card>
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Payment Records
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <DollarSign className="h-12 w-12 text-muted mb-4" />
              <p className="text-lg font-medium text-foreground">No payments found</p>
              <p className="text-sm">We couldn't find any payment records matching your filter.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    {canReadAllPayments && <TableHead>User</TableHead>}
                    <TableHead>Role</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Link
                            to="/app/jobs/$id"
                            params={{ id: payment.jobId }}
                            className="hover:underline flex items-center gap-1 text-primary"
                          >
                            {payment.job?.caseName || payment.jobId}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      {canReadAllPayments && (
                        <TableCell>
                          <div className="font-medium">{payment.user?.fullName}</div>
                          <div className="text-xs text-muted-foreground">{payment.user?.email}</div>
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-50 text-slate-700">
                          {payment.assignmentType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        {payment.status === 'PAID' ? (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            PAID
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200"
                          >
                            PENDING
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {canMarkPaid && payment.status === 'PENDING' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => handleMarkPaid(payment.id)}
                            disabled={processingId === payment.id}
                          >
                            {processingId === payment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Mark as Paid'
                            )}
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
