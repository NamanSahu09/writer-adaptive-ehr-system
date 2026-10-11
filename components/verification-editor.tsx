'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { verifyExtraction, type Correction } from '@/app/actions/verification'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Prescription = {
  medicine: string
  dosage: string
  frequency: string
  duration: string
}

type VitalSigns = {
  bloodPressure: string
  pulse: string
  temperature: string
  spo2: string
  weight: string
}

export type StructuredData = {
  patientName: string
  doctorName: string
  age: string
  gender: string
  visitDate: string
  chiefComplaint: string
  vitalSigns: VitalSigns
  diagnosis: string
  prescriptions: Prescription[]
  labOrders: string[]
  clinicalNotes: string
  followUpDate: string
}

const EMPTY_VITALS: VitalSigns = {
  bloodPressure: '',
  pulse: '',
  temperature: '',
  spo2: '',
  weight: '',
}

function normalize(data: Partial<StructuredData> | null | undefined): StructuredData {
  return {
    patientName: data?.patientName ?? '',
    doctorName: data?.doctorName ?? '',
    age: data?.age ?? '',
    gender: data?.gender ?? '',
    visitDate: data?.visitDate ?? '',
    chiefComplaint: data?.chiefComplaint ?? '',
    vitalSigns: { ...EMPTY_VITALS, ...(data?.vitalSigns ?? {}) },
    diagnosis: data?.diagnosis ?? '',
    prescriptions: (data?.prescriptions ?? []).map((p) => ({
      medicine: p?.medicine ?? '',
      dosage: p?.dosage ?? '',
      frequency: p?.frequency ?? '',
      duration: p?.duration ?? '',
    })),
    labOrders: data?.labOrders ?? [],
    clinicalNotes: data?.clinicalNotes ?? '',
    followUpDate: data?.followUpDate ?? '',
  }
}

function ConfidencePill({ value }: { value: number | undefined }) {
  if (value === undefined) return null
  const pct = Math.round(value * 100)
  const tone =
    value >= 0.85
      ? 'bg-success/15 text-success border-success/30'
      : value >= 0.6
        ? 'bg-warning/15 text-warning-foreground border-warning/40'
        : 'bg-destructive/10 text-destructive border-destructive/30'
  return (
    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', tone)}>
      {pct}%
    </Badge>
  )
}

export function VerificationEditor({
  cardId,
  extractionId,
  initialData,
  confidence,
  readOnly = false,
}: {
  cardId: number
  extractionId: number
  initialData: Partial<StructuredData> | null
  confidence: Record<string, number>
  readOnly?: boolean
}) {
  const router = useRouter()
  const original = useMemo(() => normalize(initialData), [initialData])
  const [data, setData] = useState<StructuredData>(original)
  const [reviewerNotes, setReviewerNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const lowConfidence = (field: string) => (confidence[field] ?? 1) < 0.6

  function set<K extends keyof StructuredData>(key: K, value: StructuredData[K]) {
    setData((d) => ({ ...d, [key]: value }))
  }

  function setVital(key: keyof VitalSigns, value: string) {
    setData((d) => ({ ...d, vitalSigns: { ...d.vitalSigns, [key]: value } }))
  }

  function setRx(i: number, key: keyof Prescription, value: string) {
    setData((d) => ({
      ...d,
      prescriptions: d.prescriptions.map((p, idx) =>
        idx === i ? { ...p, [key]: value } : p,
      ),
    }))
  }

  function computeCorrections(): Correction[] {
    const corrections: Correction[] = []
    const scalarFields: (keyof StructuredData)[] = [
      'patientName',
      'doctorName',
      'age',
      'gender',
      'visitDate',
      'chiefComplaint',
      'diagnosis',
      'clinicalNotes',
      'followUpDate',
    ]
    for (const f of scalarFields) {
      const a = String(original[f] ?? '')
      const b = String(data[f] ?? '')
      if (a !== b) corrections.push({ fieldName: f, originalValue: a, correctedValue: b })
    }
    for (const k of Object.keys(EMPTY_VITALS) as (keyof VitalSigns)[]) {
      if (original.vitalSigns[k] !== data.vitalSigns[k]) {
        corrections.push({
          fieldName: `vitalSigns.${k}`,
          originalValue: original.vitalSigns[k],
          correctedValue: data.vitalSigns[k],
        })
      }
    }
    const maxRx = Math.max(original.prescriptions.length, data.prescriptions.length)
    for (let i = 0; i < maxRx; i++) {
      const o = original.prescriptions[i]
      const n = data.prescriptions[i]
      for (const k of ['medicine', 'dosage', 'frequency', 'duration'] as const) {
        const a = o?.[k] ?? ''
        const b = n?.[k] ?? ''
        if (a !== b) {
          corrections.push({
            fieldName: `prescriptions[${i}].${k}`,
            originalValue: a,
            correctedValue: b,
          })
        }
      }
    }
    if (original.labOrders.join('|') !== data.labOrders.join('|')) {
      corrections.push({
        fieldName: 'labOrders',
        originalValue: original.labOrders.join(', '),
        correctedValue: data.labOrders.join(', '),
      })
    }
    return corrections
  }

  async function handleVerify() {
    setSaving(true)
    try {
      const corrections = computeCorrections()
      await verifyExtraction({
        cardId,
        extractionId,
        structuredData: data as unknown as Record<string, unknown>,
        corrections,
        reviewerNotes: reviewerNotes || undefined,
      })
      toast.success(
        corrections.length > 0
          ? `Verified with ${corrections.length} correction${corrections.length === 1 ? '' : 's'} — the doctor's style profile was updated`
          : 'Verified with no corrections',
      )
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setSaving(false)
    }
  }

  const fieldClass = (field: string) =>
    cn(!readOnly && lowConfidence(field) && 'border-destructive/50 bg-destructive/5')

  return (
    <div className="flex flex-col gap-4">
      {/* Patient / visit basics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            Patient & Doctor details
            <ConfidencePill value={confidence.patientName} />
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-patientName">Patient name</Label>
            <Input
              id="v-patientName"
              value={data.patientName}
              onChange={(e) => set('patientName', e.target.value)}
              disabled={readOnly}
              className={fieldClass('patientName')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-doctorName" className="flex items-center gap-2">
              Doctor / Consultant Name
              <ConfidencePill value={confidence.doctorName} />
            </Label>
            <Input
              id="v-doctorName"
              value={data.doctorName}
              onChange={(e) => set('doctorName', e.target.value)}
              disabled={readOnly}
              className={fieldClass('doctorName')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="v-age">Age</Label>
              <Input
                id="v-age"
                value={data.age}
                onChange={(e) => set('age', e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="v-gender">Gender</Label>
              <Input
                id="v-gender"
                value={data.gender}
                onChange={(e) => set('gender', e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-visitDate">Visit date</Label>
            <Input
              id="v-visitDate"
              value={data.visitDate}
              onChange={(e) => set('visitDate', e.target.value)}
              disabled={readOnly}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-followUpDate">Follow-up date</Label>
            <Input
              id="v-followUpDate"
              value={data.followUpDate}
              onChange={(e) => set('followUpDate', e.target.value)}
              disabled={readOnly}
              placeholder="YYYY-MM-DD"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clinical */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            Clinical findings
            <ConfidencePill value={confidence.diagnosis} />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-chiefComplaint" className="flex items-center gap-2">
              Chief complaint
              <ConfidencePill value={confidence.chiefComplaint} />
            </Label>
            <Textarea
              id="v-chiefComplaint"
              rows={2}
              value={data.chiefComplaint}
              onChange={(e) => set('chiefComplaint', e.target.value)}
              disabled={readOnly}
              className={fieldClass('chiefComplaint')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-diagnosis">Diagnosis</Label>
            <Textarea
              id="v-diagnosis"
              rows={2}
              value={data.diagnosis}
              onChange={(e) => set('diagnosis', e.target.value)}
              disabled={readOnly}
              className={fieldClass('diagnosis')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="flex items-center gap-2">
              Vital signs
              <ConfidencePill value={confidence.vitalSigns} />
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(
                [
                  ['bloodPressure', 'BP'],
                  ['pulse', 'Pulse'],
                  ['temperature', 'Temp'],
                  ['spo2', 'SpO2'],
                  ['weight', 'Weight'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <Input
                    value={data.vitalSigns[key]}
                    onChange={(e) => setVital(key, e.target.value)}
                    disabled={readOnly}
                    aria-label={label}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-clinicalNotes" className="flex items-center gap-2">
              Clinical notes
              <ConfidencePill value={confidence.clinicalNotes} />
            </Label>
            <Textarea
              id="v-clinicalNotes"
              rows={3}
              value={data.clinicalNotes}
              onChange={(e) => set('clinicalNotes', e.target.value)}
              disabled={readOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Prescriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            Prescriptions
            <ConfidencePill value={confidence.prescriptions} />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {data.prescriptions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No prescriptions extracted.
            </p>
          )}
          {data.prescriptions.map((rx, i) => (
            <div
              key={i}
              className="grid grid-cols-2 sm:grid-cols-[1fr_100px_100px_100px_auto] gap-2 items-end"
            >
              <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                <span className="text-xs text-muted-foreground">Medicine</span>
                <Input
                  value={rx.medicine}
                  onChange={(e) => setRx(i, 'medicine', e.target.value)}
                  disabled={readOnly}
                  aria-label={`Medicine ${i + 1}`}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Dosage</span>
                <Input
                  value={rx.dosage}
                  onChange={(e) => setRx(i, 'dosage', e.target.value)}
                  disabled={readOnly}
                  aria-label={`Dosage ${i + 1}`}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Frequency</span>
                <Input
                  value={rx.frequency}
                  onChange={(e) => setRx(i, 'frequency', e.target.value)}
                  disabled={readOnly}
                  aria-label={`Frequency ${i + 1}`}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Duration</span>
                <Input
                  value={rx.duration}
                  onChange={(e) => setRx(i, 'duration', e.target.value)}
                  disabled={readOnly}
                  aria-label={`Duration ${i + 1}`}
                />
              </div>
              {!readOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    set(
                      'prescriptions',
                      data.prescriptions.filter((_, idx) => idx !== i),
                    )
                  }
                  aria-label={`Remove prescription ${i + 1}`}
                >
                  <Trash2 className="size-4 text-muted-foreground" aria-hidden="true" />
                </Button>
              )}
            </div>
          ))}
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start bg-transparent"
              onClick={() =>
                set('prescriptions', [
                  ...data.prescriptions,
                  { medicine: '', dosage: '', frequency: '', duration: '' },
                ])
              }
            >
              <Plus className="size-4" aria-hidden="true" />
              Add prescription
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Lab orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            Lab orders
            <ConfidencePill value={confidence.labOrders} />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Textarea
            rows={2}
            value={data.labOrders.join('\n')}
            onChange={(e) =>
              set(
                'labOrders',
                e.target.value.split('\n').filter((l) => l.trim() !== ''),
              )
            }
            disabled={readOnly}
            placeholder="One lab order per line"
            aria-label="Lab orders, one per line"
          />
        </CardContent>
      </Card>

      {!readOnly && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="v-reviewerNotes">Reviewer notes (optional)</Label>
              <Textarea
                id="v-reviewerNotes"
                rows={2}
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                placeholder="Anything worth flagging about this card"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleVerify} disabled={saving}>
                {saving ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                )}
                {saving ? 'Saving…' : 'Approve and verify'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Corrections you make are logged and improve future extractions
                for this doctor.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
