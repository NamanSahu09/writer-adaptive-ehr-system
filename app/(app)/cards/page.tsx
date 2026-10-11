import Link from 'next/link'
import { getCards } from '@/app/actions/opd-cards'
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
import { Button } from '@/components/ui/button'
import { Files, Upload } from 'lucide-react'

export const dynamic = 'force-dynamic'

function formatDate(value: Date | string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function CardsPage() {
  const rows = await getCards()

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">OPD Cards</h1>
          <p className="text-sm text-muted-foreground">
            Uploaded cards moving through extraction, verification, and EHR
            creation.
          </p>
        </div>
        <Button asChild>
          <Link href="/upload">
            <Upload className="size-4" aria-hidden="true" />
            Upload Card
          </Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <Files className="size-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium">No OPD cards yet</p>
              <p className="text-sm text-muted-foreground">
                Upload a handwritten card to start the digitization pipeline.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Card</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Visit date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/cards/${c.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      #{c.id}{' '}
                      <span className="text-muted-foreground font-normal text-xs">
                        {c.originalFilename ?? ''}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>{c.patientName ?? '—'}</TableCell>
                  <TableCell>{c.doctorName ?? '—'}</TableCell>
                  <TableCell>{formatDate(c.visitDate)}</TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(c.createdAt)}
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
