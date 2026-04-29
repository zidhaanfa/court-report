import { useState, useEffect } from 'react'
import { useApi } from '@/hooks/use-api'
import { api } from '@/lib/axios'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Button } from '@workspace/ui/components/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface SettingsData {
  id: string
  reporterRatePerMinute: number
  editorFlatRate: number
  defaultRoleName: string
  paymentDueDays: number
}

interface RoleData {
  id: string
  name: string
  isSystem: boolean
}

export function SettingsPage() {
  const { data: settings, isLoading, error, refetch } = useApi<SettingsData>('/settings')
  const { data: roles } = useApi<RoleData[]>('/roles?limit=50')

  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [formData, setFormData] = useState({
    reporterRatePerMinute: 0,
    editorFlatRate: 0,
    defaultRoleName: '',
    paymentDueDays: 30,
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        reporterRatePerMinute: settings.reporterRatePerMinute,
        editorFlatRate: settings.editorFlatRate,
        defaultRoleName: settings.defaultRoleName,
        paymentDueDays: settings.paymentDueDays,
      })
    }
  }, [settings])

  const handleSave = async () => {
    setSaving(true)
    setSuccessMsg('')
    setErrorMsg('')
    try {
      await api.patch('/settings', {
        reporterRatePerMinute: Number(formData.reporterRatePerMinute),
        editorFlatRate: Number(formData.editorFlatRate),
        defaultRoleName: formData.defaultRoleName,
        paymentDueDays: Number(formData.paymentDueDays),
      })
      setSuccessMsg('Settings updated successfully')
      await refetch()
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message ?? err.message ?? 'Failed to update settings')
    } finally {
      setSaving(false)
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
    <div className="mx-auto max-w-4xl w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage global configurations, rates, and defaults.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Rates & Payments</CardTitle>
            <CardDescription>
              Configure the default rates paid to reporters and editors for completed jobs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reporterRate">Reporter Rate per Minute (IDR)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">Rp</span>
                  <Input
                    id="reporterRate"
                    type="number"
                    className="pl-9"
                    value={formData.reporterRatePerMinute}
                    onChange={(e) => setFormData({ ...formData, reporterRatePerMinute: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editorRate">Editor Flat Rate (IDR)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">Rp</span>
                  <Input
                    id="editorRate"
                    type="number"
                    className="pl-9"
                    value={formData.editorFlatRate}
                    onChange={(e) => setFormData({ ...formData, editorFlatRate: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDueDays">Payment Due Days</Label>
                <Input
                  id="paymentDueDays"
                  type="number"
                  value={formData.paymentDueDays}
                  onChange={(e) => setFormData({ ...formData, paymentDueDays: Number(e.target.value) })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Defaults</CardTitle>
            <CardDescription>
              Configure defaults applied when new users are registered.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultRole">Default Role for New Users</Label>
              <Select
                value={formData.defaultRoleName}
                onValueChange={(val) => setFormData({ ...formData, defaultRoleName: val })}
              >
                <SelectTrigger id="defaultRole" className="w-[300px]">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((role) => (
                    <SelectItem key={role.id} value={role.name}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                This role will automatically be assigned to newly registered users.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4 justify-end">
          {errorMsg && (
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {errorMsg}
            </p>
          )}
          {successMsg && (
            <p className="text-sm text-green-600 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> {successMsg}
            </p>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
