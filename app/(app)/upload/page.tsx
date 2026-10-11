import { getPatients } from '@/app/actions/patients'
import { getDoctors } from '@/app/actions/doctors'
import { UploadForm } from '@/components/upload-form'

export const dynamic = 'force-dynamic'

export default async function UploadPage() {
  const [patients, doctors] = await Promise.all([getPatients(), getDoctors()])

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Upload OPD Card
        </h1>
        <p className="text-sm text-muted-foreground">
          Upload a handwritten OPD card image. It is stored privately and
          queued for AI extraction.
        </p>
      </div>
      <UploadForm
        patients={patients.map((p) => ({ id: p.id, fullName: p.fullName }))}
        doctors={doctors.map((d) => ({ id: d.id, fullName: d.fullName }))}
      />
    </div>
  )
}
