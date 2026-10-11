'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createDoctor } from '@/app/actions/doctors'
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
import { toast } from 'sonner'
import { Loader2, Plus } from 'lucide-react'

export function DoctorDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setSaving(true)
    try {
      await createDoctor({
        fullName: String(form.get('fullName') || ''),
        specialty: String(form.get('specialty') || '') || undefined,
        licenseNumber: String(form.get('licenseNumber') || '') || undefined,
        phone: String(form.get('phone') || '') || undefined,
        email: String(form.get('email') || '') || undefined,
      })
      toast.success('Doctor added with a new style profile')
      setOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add doctor')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" aria-hidden="true" />
          Add Doctor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Doctor</DialogTitle>
          <DialogDescription>
            Each doctor gets a handwriting style profile that the AI pipeline
            adapts to over time.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="doctor-fullName">Full name</Label>
            <Input
              id="doctor-fullName"
              name="fullName"
              required
              placeholder="Dr. John Smith"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="doctor-specialty">Specialty</Label>
              <Input
                id="doctor-specialty"
                name="specialty"
                placeholder="Cardiology"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="doctor-license">License number</Label>
              <Input
                id="doctor-license"
                name="licenseNumber"
                placeholder="MD-12345"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="doctor-phone">Phone</Label>
              <Input id="doctor-phone" name="phone" type="tel" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="doctor-email">Email</Label>
              <Input id="doctor-email" name="email" type="email" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              Save doctor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
