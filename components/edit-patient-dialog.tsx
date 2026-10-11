'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updatePatient } from '@/app/actions/patients'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, Pencil } from 'lucide-react'

type Patient = {
  id: number
  fullName: string
  dateOfBirth: string | null
  gender: string | null
  phone: string | null
  address: string | null
  medicalRecordNumber: string | null
}

export function EditPatientDialog({ patient }: { patient: Patient }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [gender, setGender] = useState<string>(patient.gender || '')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSaving(true)
    try {
      await updatePatient(patient.id, {
        fullName: String(form.get('fullName') || ''),
        dateOfBirth: String(form.get('dateOfBirth') || '') || undefined,
        gender: gender || undefined,
        phone: String(form.get('phone') || '') || undefined,
        address: String(form.get('address') || '') || undefined,
        medicalRecordNumber:
          String(form.get('medicalRecordNumber') || '') || undefined,
      })
      toast.success('Patient details updated')
      setOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update patient')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <Pencil className="size-4" aria-hidden="true" />
          <span className="sr-only">Edit patient</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Patient Details</DialogTitle>
          <DialogDescription>
            Update registration information for this patient.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              name="fullName"
              required
              defaultValue={patient.fullName}
              placeholder="Jane Doe"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                defaultValue={patient.dateOfBirth || ''}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={gender} onValueChange={(v) => setGender(v ?? '')}>
                <SelectTrigger id="gender" className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={patient.phone || ''}
                placeholder="+1 555 000 1234"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="medicalRecordNumber">MRN</Label>
              <Input
                id="medicalRecordNumber"
                name="medicalRecordNumber"
                defaultValue={patient.medicalRecordNumber || ''}
                placeholder="MRN-0001"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              name="address"
              rows={2}
              defaultValue={patient.address || ''}
              placeholder="Street, city"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
