'use server'

import { db } from '@/lib/db'
import {
  opdCards,
  extractedData,
  verificationRecords,
  correctionLogs,
  doctorStyleProfiles,
  ehrRecords,
} from '@/lib/db/schema'
import { requireUser } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { eq, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export type Correction = {
  fieldName: string
  originalValue: string
  correctedValue: string
}

/**
 * Saves corrected structured data, logs each correction, updates the
 * doctor's style profile (writer-adaptive learning), and marks the card
 * verified.
 */
export async function verifyExtraction(input: {
  cardId: number
  extractionId: number
  structuredData: Record<string, unknown>
  corrections: Correction[]
  reviewerNotes?: string
}) {
  const user = await requireUser()

  const [card] = await db
    .select()
    .from(opdCards)
    .where(eq(opdCards.id, input.cardId))
    .limit(1)
  if (!card) throw new Error('Card not found')

  // 1. Save the corrected structured data
  await db
    .update(extractedData)
    .set({ structuredData: input.structuredData, updatedAt: new Date() })
    .where(eq(extractedData.id, input.extractionId))

  // 2. Log each correction for the learning loop
  for (const c of input.corrections) {
    await db.insert(correctionLogs).values({
      extractedDataId: input.extractionId,
      doctorId: card.doctorId,
      correctedBy: user.id,
      fieldName: c.fieldName,
      originalValue: c.originalValue,
      correctedValue: c.correctedValue,
      correctionType: 'manual',
    })
  }

  // 3. Update the doctor's style profile with what was learned
  if (card.doctorId && input.corrections.length > 0) {
    const [profile] = await db
      .select()
      .from(doctorStyleProfiles)
      .where(eq(doctorStyleProfiles.doctorId, card.doctorId))
      .limit(1)

    if (profile) {
      const stats = (profile.correctionStats ?? {}) as Record<string, number>
      const abbreviations = (profile.abbreviations ?? {}) as Record<string, string>
      const frequentMedicines = new Set(
        (profile.frequentMedicines ?? []) as string[],
      )

      for (const c of input.corrections) {
        stats[c.fieldName] = (stats[c.fieldName] ?? 0) + 1
        // Short original -> longer corrected value looks like a personal
        // abbreviation; remember it for future extractions.
        const orig = c.originalValue.trim()
        const corr = c.correctedValue.trim()
        if (
          orig &&
          corr &&
          orig.length <= 8 &&
          corr.length > orig.length &&
          !orig.includes(' ')
        ) {
          abbreviations[orig] = corr
        }
        // Corrected medicine names become "frequent medicines"
        if (c.fieldName.startsWith('prescriptions') && corr) {
          frequentMedicines.add(corr)
        }
      }

      await db
        .update(doctorStyleProfiles)
        .set({
          correctionStats: stats,
          abbreviations,
          frequentMedicines: Array.from(frequentMedicines).slice(-50),
          updatedAt: new Date(),
        })
        .where(eq(doctorStyleProfiles.id, profile.id))
    }
  }

  // 4. Create the verification record
  await db.insert(verificationRecords).values({
    opdCardId: input.cardId,
    extractedDataId: input.extractionId,
    verifiedBy: user.id,
    status: 'verified',
    verifiedFields: input.structuredData,
    flaggedFields: input.corrections.map((c) => c.fieldName),
    reviewerNotes: input.reviewerNotes || null,
    verifiedAt: new Date(),
  })

  // 5. Advance the card status
  await db
    .update(opdCards)
    .set({ status: 'verified', updatedAt: new Date() })
    .where(eq(opdCards.id, input.cardId))

  // 6. Push verified pairwise ground-truth to ML adaptive training service
  if (process.env.ML_SERVICE_URL) {
    try {
      fetch(`${process.env.ML_SERVICE_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: input.cardId,
          doctorId: card.doctorId,
          originalData: input.structuredData,
          verifiedData: input.structuredData,
          corrections: input.corrections,
        }),
      }).catch((err) => console.warn('ML feedback service notification failed:', err))
    } catch (e) {
      // non-blocking
    }
  }

  await logAudit({
    userId: user.id,
    action: 'verify',
    entityType: 'opd_card',
    entityId: input.cardId,
    details: { corrections: input.corrections.length },
  })

  revalidatePath(`/cards/${input.cardId}`)
  revalidatePath('/cards')
  return { success: true as const }
}

/** Creates a final EHR record from a verified card's structured data. */
export async function createEhrRecord(cardId: number) {
  const user = await requireUser()

  const [card] = await db
    .select()
    .from(opdCards)
    .where(eq(opdCards.id, cardId))
    .limit(1)
  if (!card) throw new Error('Card not found')
  if (card.status !== 'verified') {
    throw new Error('Card must be verified before creating an EHR record')
  }

  const [extraction] = await db
    .select()
    .from(extractedData)
    .where(eq(extractedData.opdCardId, cardId))
    .orderBy(desc(extractedData.createdAt))
    .limit(1)
  if (!extraction) throw new Error('No extracted data found')

  const data = (extraction.structuredData ?? {}) as Record<string, unknown>

  const [record] = await db
    .insert(ehrRecords)
    .values({
      opdCardId: cardId,
      patientId: card.patientId,
      doctorId: card.doctorId,
      createdBy: user.id,
      chiefComplaint: (data.chiefComplaint as string) || null,
      diagnosis: (data.diagnosis as string) || null,
      vitalSigns: data.vitalSigns ?? {},
      prescriptions: data.prescriptions ?? [],
      labOrders: data.labOrders ?? [],
      clinicalNotes: (data.clinicalNotes as string) || null,
      followUpDate: (data.followUpDate as string) || null,
      status: 'finalized',
      finalizedAt: new Date(),
    })
    .returning()

  await db
    .update(opdCards)
    .set({ status: 'ehr_created', updatedAt: new Date() })
    .where(eq(opdCards.id, cardId))

  await logAudit({
    userId: user.id,
    action: 'create',
    entityType: 'ehr_record',
    entityId: record.id,
    details: { opdCardId: cardId },
  })

  revalidatePath(`/cards/${cardId}`)
  revalidatePath('/cards')
  revalidatePath('/records')
  return { success: true as const, recordId: record.id }
}
