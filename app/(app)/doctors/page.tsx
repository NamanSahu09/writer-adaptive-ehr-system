import { getDoctors } from '@/app/actions/doctors'
import { DoctorDialog } from '@/components/doctor-dialog'
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
import { Stethoscope } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DoctorsPage() {
  const rows = await getDoctors()

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Doctors</h1>
          <p className="text-sm text-muted-foreground">
            Each doctor has a handwriting style profile the AI adapts to.
          </p>
        </div>
        <DoctorDialog />
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <Stethoscope
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="font-medium">No doctors yet</p>
              <p className="text-sm text-muted-foreground">
                Add a doctor so uploaded OPD cards can use their style profile
                during extraction.
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
                <TableHead>Specialty</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Style profile</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.fullName}</TableCell>
                  <TableCell>{d.specialty ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {d.licenseNumber ?? '—'}
                  </TableCell>
                  <TableCell>{d.phone ?? '—'}</TableCell>
                  <TableCell>{d.email ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">Active</Badge>
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
