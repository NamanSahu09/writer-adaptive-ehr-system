'use server'

import { db } from '@/lib/db'
import {
  opdCards,
  patients,
  doctors,
  extractedData,
  correctionLogs,
  verificationRecords,
  ehrRecords,
} from '@/lib/db/schema'
import { requireUser } from '@/lib/session'
import { desc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function getCards() {
  await requireUser()
  return db
    .select({
      id: opdCards.id,
      status: opdCards.status,
      originalFilename: opdCards.originalFilename,
      visitDate: opdCards.visitDate,
      createdAt: opdCards.createdAt,
      patientName: patients.fullName,
      doctorName: doctors.fullName,
    })
    .from(opdCards)
    .leftJoin(patients, eq(opdCards.patientId, patients.id))
    .leftJoin(doctors, eq(opdCards.doctorId, doctors.id))
    .orderBy(desc(opdCards.createdAt))
}

export async function getCard(id: number) {
  await requireUser()
  const [card] = await db
    .select({
      id: opdCards.id,
      patientId: opdCards.patientId,
      doctorId: opdCards.doctorId,
      uploadedBy: opdCards.uploadedBy,
      imagePathname: opdCards.imagePathname,
      originalFilename: opdCards.originalFilename,
      status: opdCards.status,
      visitDate: opdCards.visitDate,
      notes: opdCards.notes,
      createdAt: opdCards.createdAt,
      patientName: patients.fullName,
      doctorName: doctors.fullName,
      doctorSpecialty: doctors.specialty,
    })
    .from(opdCards)
    .leftJoin(patients, eq(opdCards.patientId, patients.id))
    .leftJoin(doctors, eq(opdCards.doctorId, doctors.id))
    .where(eq(opdCards.id, id))
    .limit(1)

  if (!card) return null

  const [extraction] = await db
    .select()
    .from(extractedData)
    .where(eq(extractedData.opdCardId, id))
    .orderBy(desc(extractedData.createdAt))
    .limit(1)

  return { card, extraction: extraction ?? null }
}

export async function deleteCard(id: number) {
  const user = await requireUser()

  const [card] = await db
    .select()
    .from(opdCards)
    .where(eq(opdCards.id, id))
    .limit(1)
  if (!card) throw new Error('Card not found')

  const extractions = await db
    .select({ id: extractedData.id })
    .from(extractedData)
    .where(eq(extractedData.opdCardId, id))

  const extractionIds = extractions.map((e) => e.id)

  if (extractionIds.length > 0) {
    const { inArray } = await import('drizzle-orm')
    await db
      .delete(correctionLogs)
      .where(inArray(correctionLogs.extractedDataId, extractionIds))
    await db.delete(extractedData).where(eq(extractedData.opdCardId, id))
  }

  await db
    .delete(verificationRecords)
    .where(eq(verificationRecords.opdCardId, id))
  await db.delete(ehrRecords).where(eq(ehrRecords.opdCardId, id))
  await db.delete(opdCards).where(eq(opdCards.id, id))

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { del } = await import('@vercel/blob')
      await del(card.imagePathname)
    } else {
      const fs = await import('fs')
      const path = await import('path')
      const filepath = path.join(process.cwd(), '.local-blob', card.imagePathname)
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath)
      }
    }
  } catch (err) {
    console.error('Failed to delete file from storage:', err)
  }

  const { logAudit } = await import('@/lib/audit')
  await logAudit({
    userId: user.id,
    action: 'delete',
    entityType: 'opd_card',
    entityId: id,
    details: { filename: card.originalFilename },
  })

  revalidatePath('/cards')
  return { success: true }
}
