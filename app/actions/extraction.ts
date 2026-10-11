'use server'

import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'
import { get } from '@vercel/blob'
import { db } from '@/lib/db'
import {
  opdCards,
  extractedData,
  doctorStyleProfiles,
} from '@/lib/db/schema'
import { requireUser } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

const DEFAULT_MODEL = 'openai/gpt-4o'

const extractionSchema = z.object({
  patientName: z.string().describe('Patient full name as written on the card'),
  doctorName: z
    .string()
    .describe(
      'Doctor or consultant name as written on the card (e.g. Dr. Sachin Awasthi or other names prefixed by Dr.), empty string if absent',
    ),
  age: z.string().describe('Patient age if written, empty string if absent'),
  gender: z.string().describe('Patient gender if written, empty string if absent'),
  visitDate: z
    .string()
    .describe('Visit date in YYYY-MM-DD format if legible, empty string if absent'),
  chiefComplaint: z.string().describe('Chief complaint / presenting symptoms'),
  vitalSigns: z.object({
    bloodPressure: z.string(),
    pulse: z.string(),
    temperature: z.string(),
    spo2: z.string(),
    weight: z.string(),
  }),
  diagnosis: z.string().describe('Diagnosis, expanded from abbreviations when confident'),
  prescriptions: z.array(
    z.object({
      medicine: z.string(),
      dosage: z.string(),
      frequency: z.string(),
      duration: z.string(),
    }),
  ),
  labOrders: z.array(z.string()),
  clinicalNotes: z.string().describe('Other clinical notes and observations'),
  followUpDate: z.string().describe('Follow-up date if written, empty string if absent'),
  fieldConfidence: z
    .object({
      patientName: z.number().min(0).max(1),
      doctorName: z.number().min(0).max(1),
      chiefComplaint: z.number().min(0).max(1),
      vitalSigns: z.number().min(0).max(1),
      diagnosis: z.number().min(0).max(1),
      prescriptions: z.number().min(0).max(1),
      labOrders: z.number().min(0).max(1),
      clinicalNotes: z.number().min(0).max(1),
    })
    .describe('Per-field confidence from 0 to 1 reflecting handwriting legibility'),
  overallConfidence: z.number().min(0).max(1),
  rawText: z.string().describe('Full verbatim transcription of all legible handwriting'),
})

type StyleProfile = {
  abbreviations?: Record<string, string>
  frequentMedicines?: string[]
  specialtyTerminology?: string[]
}

function buildPrompt(doctor: {
  name?: string | null
  specialty?: string | null
  profile?: StyleProfile | null
}) {
  let prompt = `You are a medical records digitization assistant. Extract all information from this handwritten OPD (outpatient department) card into structured fields.

Rules:
- Transcribe exactly what is written; expand standard medical abbreviations (e.g. HTN -> Hypertension, T2DM -> Type 2 Diabetes Mellitus) only when confident.
- Use empty strings for fields that are absent or illegible; never invent data.
- Assign honest confidence scores: low scores for barely legible handwriting.
- Prescription lines often follow: medicine name, strength, frequency code (OD/BD/TDS/QID), duration.`

  if (doctor.name) {
    prompt += `\n\nThis card was written by Dr. ${doctor.name}${doctor.specialty ? `, specialty: ${doctor.specialty}` : ''}.`
  }

  const p = doctor.profile
  if (p) {
    const abbrs = Object.entries(p.abbreviations ?? {})
    if (abbrs.length > 0) {
      prompt += `\n\nThis doctor's known personal abbreviations (learned from past corrections):\n${abbrs
        .map(([k, v]) => `- "${k}" means "${v}"`)
        .join('\n')}`
    }
    if ((p.frequentMedicines ?? []).length > 0) {
      prompt += `\n\nMedicines this doctor frequently prescribes (prefer these readings when handwriting is ambiguous):\n${(p.frequentMedicines ?? []).join(', ')}`
    }
    if ((p.specialtyTerminology ?? []).length > 0) {
      prompt += `\n\nSpecialty terminology this doctor uses often:\n${(p.specialtyTerminology ?? []).join(', ')}`
    }
  }

  return prompt
}

export async function runExtraction(cardId: number) {
  const user = await requireUser()

  if (
    !process.env.GEMINI_API_KEY &&
    !process.env.GOOGLE_GENERATIVE_AI_API_KEY &&
    !process.env.OPENAI_API_KEY
  ) {
    return {
      success: false as const,
      error: 'AI processing is not configured',
    }
  }

  const [card] = await db
    .select()
    .from(opdCards)
    .where(eq(opdCards.id, cardId))
    .limit(1)
  if (!card) throw new Error('Card not found')

  await db
    .update(opdCards)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(eq(opdCards.id, cardId))

  try {
    let imageBuffer: Buffer
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const result = await get(card.imagePathname, { access: 'private' })
      if (!result) throw new Error('Card image not found in storage')
      imageBuffer = Buffer.from(await new Response(result.stream).arrayBuffer())
    } else {
      const fs = await import('fs')
      const path = await import('path')
      const filepath = path.join(process.cwd(), '.local-blob', card.imagePathname)
      if (!fs.existsSync(filepath)) {
        throw new Error('Card image not found in local storage')
      }
      imageBuffer = fs.readFileSync(filepath)
    }

    // Writer-adaptive context: doctor + learned style profile
    let doctorContext: {
      name?: string | null
      specialty?: string | null
      profile?: StyleProfile | null
    } = {}
    if (card.doctorId) {
      const doctorRows = await db.query.doctors.findMany({
        where: (d, { eq: eqOp }) => eqOp(d.id, card.doctorId!),
        limit: 1,
      })
      const doctor = doctorRows[0]
      if (doctor) {
        const [profile] = await db
          .select()
          .from(doctorStyleProfiles)
          .where(eq(doctorStyleProfiles.doctorId, doctor.id))
          .limit(1)
        doctorContext = {
          name: doctor.fullName,
          specialty: doctor.specialty,
          profile: profile
            ? {
                abbreviations: (profile.abbreviations ?? {}) as Record<string, string>,
                frequentMedicines: (profile.frequentMedicines ?? []) as string[],
                specialtyTerminology: (profile.specialtyTerminology ?? []) as string[],
              }
            : null,
        }
      }
    }

    let modelInstance: any = DEFAULT_MODEL
    let modelName = DEFAULT_MODEL
    if (process.env.GEMINI_API_KEY) {
      const customGoogle = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })
      modelInstance = customGoogle('gemini-3.6-flash')
      modelName = 'google/gemini-3.6-flash'
    } else if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      const customGoogle = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })
      modelInstance = customGoogle('gemini-3.6-flash')
      modelName = 'google/gemini-3.6-flash'
    } else if (process.env.OPENAI_API_KEY) {
      const customOpenAI = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
      modelInstance = customOpenAI('gpt-4o')
      modelName = 'openai/gpt-4o'
    }

    const start = Date.now()
    const { object } = await generateObject({
      model: modelInstance,
      schema: extractionSchema,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: buildPrompt(doctorContext) },
            { type: 'image', image: imageBuffer },
          ],
        },
      ],
    })
    const elapsed = Date.now() - start

    const { rawText, fieldConfidence, overallConfidence, ...structured } = object

    const [row] = await db
      .insert(extractedData)
      .values({
        opdCardId: cardId,
        rawText,
        structuredData: structured,
        confidenceScores: fieldConfidence,
        overallConfidence: String(overallConfidence),
        modelUsed: modelName,
        processingTimeMs: elapsed,
      })
      .returning()

    await db
      .update(opdCards)
      .set({ status: 'extracted', updatedAt: new Date() })
      .where(eq(opdCards.id, cardId))

    await logAudit({
      userId: user.id,
      action: 'extract',
      entityType: 'opd_card',
      entityId: cardId,
      details: { model: modelName, overallConfidence, processingTimeMs: elapsed },
    })

    revalidatePath(`/cards/${cardId}`)
    revalidatePath('/cards')
    return { success: true as const, extractionId: row.id }
  } catch (error) {
    console.error('Extraction failed:', error)
    await db
      .update(opdCards)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(opdCards.id, cardId))
    revalidatePath(`/cards/${cardId}`)
    revalidatePath('/cards')
    return { success: false as const, error: 'Extraction failed. Please try again.' }
  }
}
