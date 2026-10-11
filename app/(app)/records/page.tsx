import Link from 'next/link'
import { getEhrRecords } from '@/app/actions/dashboard'
import { StatusBadge } from '@/components/status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { ClipboardList } from 'lucide-react'

export const dynamic = 'force-dynamic'

function formatDate(value: Date | string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function RecordsPage() {
  const rows = await getEhrRecords()

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">EHR Records</h1>
        <p className="text-sm text-muted-foreground">
          Finalized electronic health records created from verified OPD cards.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <ClipboardList
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="font-medium">No EHR records yet</p>
              <p className="text-sm text-muted-foreground text-pretty">
                Verify an extracted OPD card, then create its EHR record to see
                it here.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Record</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Diagnosis</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      href={`/records/${r.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      EHR-{r.id}
                    </Link>
                  </TableCell>
                  <TableCell>{r.patientName ?? '—'}</TableCell>
                  <TableCell>{r.doctorName ?? '—'}</TableCell>
                  <TableCell className="max-w-48 truncate">
                    {r.diagnosis ?? '—'}
                  </TableCell>
                  <TableCell>{formatDate(r.followUpDate)}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(r.createdAt)}
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
