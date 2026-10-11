'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { ImageIcon, Loader2, UploadCloud, X } from 'lucide-react'

type Option = { id: number; fullName: string }

const NEW_PATIENT = '__new__'
const NONE = '__none__'

export function UploadForm({
  patients,
  doctors,
}: {
  patients: Option[]
  doctors: Option[]
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [patientChoice, setPatientChoice] = useState<string>(NONE)
  const [doctorChoice, setDoctorChoice] = useState<string>(NONE)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  function acceptFile(f: File | undefined | null) {
    if (!f) return
    if (!f.type.startsWith('image/')) {
      toast.error('Please choose an image file (JPEG, PNG, WEBP, or HEIC)')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('File must be smaller than 10 MB')
      return
    }
    setFile(f)
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old)
      return URL.createObjectURL(f)
    })
  }

  function clearFile() {
    setFile(null)
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old)
      return null
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!file) {
      toast.error('Choose an OPD card image first')
      return
    }
    const form = new FormData(e.currentTarget)
    const body = new FormData()
    body.set('file', file)
    if (patientChoice !== NONE && patientChoice !== NEW_PATIENT) {
      body.set('patientId', patientChoice)
    }
    if (patientChoice === NEW_PATIENT) {
      const name = String(form.get('newPatientName') || '').trim()
      if (!name) {
        toast.error('Enter the new patient name')
        return
      }
      body.set('newPatientName', name)
    }
    if (doctorChoice !== NONE) body.set('doctorId', doctorChoice)
    const visitDate = String(form.get('visitDate') || '')
    if (visitDate) body.set('visitDate', visitDate)
    const notes = String(form.get('notes') || '')
    if (notes) body.set('notes', notes)

    setUploading(true)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      toast.success('OPD card uploaded')
      router.push(`/cards/${data.cardId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Dropzone */}
      {previewUrl ? (
        <Card className="py-0 overflow-hidden">
          <CardContent className="p-0 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl || "/placeholder.svg"}
              alt="Selected OPD card preview"
              className="w-full max-h-96 object-contain bg-muted"
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2"
              onClick={clearFile}
              aria-label="Remove selected image"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
            <div className="px-4 py-2 text-xs text-muted-foreground border-t">
              {file?.name}
            </div>
          </CardContent>
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragActive(false)
            acceptFile(e.dataTransfer.files?.[0])
          }}
          className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
          }`}
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <ImageIcon className="size-6 text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="font-medium">Drop the OPD card image here</p>
            <p className="text-sm text-muted-foreground">
              or click to browse — JPEG, PNG, WEBP, HEIC up to 10 MB
            </p>
          </div>
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="sr-only"
        onChange={(e) => acceptFile(e.target.files?.[0])}
        aria-label="OPD card image"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="patient">Patient</Label>
          <Select value={patientChoice} onValueChange={(v) => setPatientChoice(v ?? NONE)}>
            <SelectTrigger id="patient" className="w-full">
              <SelectValue placeholder="Select patient" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Not linked yet</SelectItem>
              <SelectItem value={NEW_PATIENT}>+ New patient</SelectItem>
              {patients.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="doctor">Doctor</Label>
          <Select value={doctorChoice} onValueChange={(v) => setDoctorChoice(v ?? NONE)}>
            <SelectTrigger id="doctor" className="w-full">
              <SelectValue placeholder="Select doctor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Unknown</SelectItem>
              {doctors.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {patientChoice === NEW_PATIENT && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="newPatientName">New patient name</Label>
          <Input
            id="newPatientName"
            name="newPatientName"
            placeholder="Full name"
            required
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="visitDate">Visit date</Label>
          <Input id="visitDate" name="visitDate" type="date" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={1}
            placeholder="Context for the reviewer"
          />
        </div>
      </div>

      <div>
        <Button type="submit" disabled={uploading || !file}>
          {uploading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <UploadCloud className="size-4" aria-hidden="true" />
          )}
          {uploading ? 'Uploading…' : 'Upload OPD card'}
        </Button>
      </div>
    </form>
  )
}
