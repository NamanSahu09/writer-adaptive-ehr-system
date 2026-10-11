import { getAuditLogs } from '@/app/actions/dashboard'
import { getSessionUser } from '@/lib/session'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollText, ShieldAlert } from 'lucide-react'

export const dynamic = 'force-dynamic'

function formatDateTime(value: Date | string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const actionTone: Record<string, string> = {
  create: 'bg-primary/10 text-primary border-primary/30',
  extract: 'bg-accent text-accent-foreground',
  verify: 'bg-success/15 text-success border-success/30',
  upload: 'bg-secondary text-secondary-foreground',
  delete: 'bg-destructive/10 text-destructive border-destructive/30',
}

export default async function AuditPage() {
  const user = await getSessionUser()

  if (user?.role !== 'verifier') {
    return (
      <div className="flex flex-col gap-6 max-w-3xl">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Audit Log</h1>
          <p className="text-sm text-muted-foreground">
            System activity trail for compliance.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert
                className="size-5 text-destructive"
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="font-medium">Verifier access required</p>
              <p className="text-sm text-muted-foreground text-pretty">
                Only accounts with the verifier role can view the audit log.
                Sign in with a verifier account to review system activity.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const rows = await getAuditLogs()

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Every upload, extraction, verification, and record creation — most
          recent first.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <ScrollText
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="font-medium">No activity yet</p>
              <p className="text-sm text-muted-foreground">
                Actions across the pipeline will appear here.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        actionTone[log.action] ??
                        'bg-secondary text-secondary-foreground'
                      }
                    >
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.entityType}
                    {log.entityId ? ` #${log.entityId}` : ''}
                  </TableCell>
                  <TableCell className="font-mono text-xs max-w-32 truncate">
                    {log.userId ?? 'system'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-64 truncate">
                    {log.details ? JSON.stringify(log.details) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
