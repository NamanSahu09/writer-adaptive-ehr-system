import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getEhrRecord } from '@/app/actions/dashboard'
import { StatusBadge } from '@/components/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, FileImage } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Prescription = {
  medicine?: string
  dosage?: string
  frequency?: string
  duration?: string
}

function formatDate(value: Date | string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const VITAL_LABELS: Record<string, string> = {
  bloodPressure: 'Blood pressure',
  pulse: 'Pulse',
  temperature: 'Temperature',
  spo2: 'SpO2',
  weight: 'Weight',
}

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const recordId = Number(id)
  if (!Number.isInteger(recordId)) notFound()

  const record = await getEhrRecord(recordId)
  if (!record) notFound()

  const vitals = (record.vitalSigns ?? {}) as Record<string, string>
  const prescriptions = (record.prescriptions ?? []) as Prescription[]
  const labOrders = (record.labOrders ?? []) as string[]
  const vitalEntries = Object.entries(vitals).filter(([, v]) => v)

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/records" aria-label="Back to EHR records">
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight flex items-center gap-3">
              EHR-{record.id}
              <StatusBadge status={record.status} />
            </h1>
            <p className="text-sm text-muted-foreground">
              {record.patientName ?? 'Unlinked patient'}
              {record.doctorName ? ` · Dr. ${record.doctorName}` : ''} ·
              Finalized {formatDate(record.finalizedAt)}
            </p>
          </div>
        </div>
        {record.opdCardId && (
          <Button variant="outline" asChild className="bg-transparent">
            <Link href={`/cards/${record.opdCardId}`}>
              <FileImage className="size-4" aria-hidden="true" />
              View source card
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Chief complaint</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">
              {record.chiefComplaint || '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Diagnosis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{record.diagnosis || '—'}</p>
          </CardContent>
        </Card>
      </div>

      {vitalEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Vital signs</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {vitalEntries.map(([key, value]) => (
                <div key={key} className="flex flex-col gap-1">
                  <dt className="text-xs text-muted-foreground">
                    {VITAL_LABELS[key] ?? key}
                  </dt>
                  <dd className="text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      <Card className="py-0 overflow-hidden gap-0">
        <CardHeader className="py-4">
          <CardTitle className="text-sm">Prescriptions</CardTitle>
        </CardHeader>
        {prescriptions.length === 0 ? (
          <CardContent className="pb-4">
            <p className="text-sm text-muted-foreground">No prescriptions.</p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead>Dosage</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prescriptions.map((rx, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">
                    {rx.medicine || '—'}
                  </TableCell>
                  <TableCell>{rx.dosage || '—'}</TableCell>
                  <TableCell>{rx.frequency || '—'}</TableCell>
                  <TableCell>{rx.duration || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lab orders</CardTitle>
          </CardHeader>
          <CardContent>
            {labOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No lab orders.</p>
            ) : (
              <ul className="list-disc pl-4 text-sm leading-relaxed">
                {labOrders.map((order, i) => (
                  <li key={i}>{order}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Follow-up</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {record.followUpDate
                ? formatDate(record.followUpDate)
                : 'No follow-up scheduled.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {record.clinicalNotes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Clinical notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {record.clinicalNotes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
