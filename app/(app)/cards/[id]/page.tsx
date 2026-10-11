import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCard } from '@/app/actions/opd-cards'
import { StatusBadge } from '@/components/status-badge'
import { ExtractButton } from '@/components/extract-button'
import { CreateEhrButton } from '@/components/create-ehr-button'
import { DeleteCardButton } from '@/components/delete-card-button'
import {
  VerificationEditor,
  type StructuredData,
} from '@/components/verification-editor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Bot, CircleAlert, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

function formatDate(value: Date | string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cardIdNum = Number(id)
  if (!Number.isInteger(cardIdNum)) notFound()

  const result = await getCard(cardIdNum)
  if (!result) notFound()
  const { card, extraction } = result

  const confidence = (extraction?.confidenceScores ?? {}) as Record<
    string,
    number
  >
  const overall = extraction?.overallConfidence
    ? Math.round(Number(extraction.overallConfidence) * 100)
    : null

  const canVerify = card.status === 'extracted' && extraction
  const isVerified = card.status === 'verified'
  const isEhrCreated = card.status === 'ehr_created'

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cards" aria-label="Back to OPD cards">
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight flex items-center gap-3">
              OPD Card #{card.id}
              <StatusBadge status={card.status} />
            </h1>
            <p className="text-sm text-muted-foreground">
              {card.patientName ?? 'Unlinked patient'}
              {card.doctorName ? ` · Dr. ${card.doctorName}` : ''}
              {card.visitDate ? ` · Visit ${formatDate(card.visitDate)}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(card.status === 'uploaded' || card.status === 'failed') && (
            <ExtractButton cardId={card.id} isRetry={card.status === 'failed'} />
          )}
          {isVerified && <CreateEhrButton cardId={card.id} />}
          <DeleteCardButton cardId={card.id} />
        </div>
      </div>

      {card.status === 'failed' && (
        <Alert variant="destructive">
          <CircleAlert className="size-4" aria-hidden="true" />
          <AlertTitle>Extraction failed</AlertTitle>
          <AlertDescription>
            The AI could not process this card. Retry the extraction, or
            re-upload a clearer photo.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {/* Original card image */}
        <Card className="lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle className="text-sm">Original handwritten card</CardTitle>
          </CardHeader>
          <CardContent>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/file?pathname=${encodeURIComponent(card.imagePathname)}`}
              alt={`Handwritten OPD card${card.patientName ? ` for ${card.patientName}` : ''}`}
              className="w-full rounded-md border object-contain max-h-[70vh] bg-muted"
            />
            {card.notes && (
              <p className="mt-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Notes:</span>{' '}
                {card.notes}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Extraction / verification side */}
        <div className="flex flex-col gap-4">
          {!extraction && card.status !== 'processing' && (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="size-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium">No extraction yet</p>
                  <p className="text-sm text-muted-foreground text-pretty">
                    Run AI extraction to transcribe this card into structured
                    fields with per-field confidence scores.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {card.status === 'processing' && (
            <Card>
              <CardContent className="flex items-center gap-3 py-8 justify-center">
                <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  Extraction in progress — refresh in a moment.
                </p>
              </CardContent>
            </Card>
          )}

          {extraction && (
            <>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                  {overall !== null && (
                    <div>
                      <span className="text-muted-foreground">
                        Overall confidence:{' '}
                      </span>
                      <span
                        className={
                          overall >= 85
                            ? 'font-semibold text-success'
                            : overall >= 60
                              ? 'font-semibold text-warning-foreground'
                              : 'font-semibold text-destructive'
                        }
                      >
                        {overall}%
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Model: </span>
                    <span className="font-mono text-xs">
                      {extraction.modelUsed}
                    </span>
                  </div>
                  {extraction.processingTimeMs != null && (
                    <div>
                      <span className="text-muted-foreground">Time: </span>
                      {(extraction.processingTimeMs / 1000).toFixed(1)}s
                    </div>
                  )}
                </CardContent>
              </Card>

              <VerificationEditor
                cardId={card.id}
                extractionId={extraction.id}
                initialData={
                  extraction.structuredData as Partial<StructuredData> | null
                }
                confidence={confidence}
                readOnly={!canVerify}
              />

              {(isVerified || isEhrCreated) && (
                <Alert>
                  <CircleAlert className="size-4" aria-hidden="true" />
                  <AlertTitle>
                    {isEhrCreated
                      ? 'EHR record created'
                      : 'Verified — ready for EHR'}
                  </AlertTitle>
                  <AlertDescription>
                    {isEhrCreated
                      ? 'This card has been finalized into an EHR record. Fields are read-only.'
                      : 'This card has been verified. Create the EHR record to finalize it.'}
                  </AlertDescription>
                </Alert>
              )}

              {extraction.rawText && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Raw transcription
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-mono leading-relaxed">
                      {extraction.rawText}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
