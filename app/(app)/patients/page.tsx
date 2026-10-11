import { getPatients } from '@/app/actions/patients'
import { PatientDialog } from '@/components/patient-dialog'
import { EditPatientDialog } from '@/components/edit-patient-dialog'
import { PatientSearch } from '@/components/patient-search'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const search = (await searchParams).search
  const rows = await getPatients(search)

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Patients</h1>
          <p className="text-sm text-muted-foreground">
            Patient registry linked to OPD cards and EHR records.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PatientSearch />
          <PatientDialog />
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <Users className="size-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium">No patients found</p>
              <p className="text-sm text-muted-foreground">
                Try searching for another keyword, or register a new patient.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>MRN</TableHead>
                <TableHead>Date of birth</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.fullName}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {p.medicalRecordNumber ?? '—'}
                  </TableCell>
                  <TableCell>{formatDate(p.dateOfBirth)}</TableCell>
                  <TableCell className="capitalize">{p.gender ?? '—'}</TableCell>
                  <TableCell>{p.phone ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(p.createdAt?.toISOString?.() ?? String(p.createdAt))}
                  </TableCell>
                  <TableCell className="text-right">
                    <EditPatientDialog patient={p} />
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
