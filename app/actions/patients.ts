'use server'

import { db } from '@/lib/db'
import { patients } from '@/lib/db/schema'
import { requireUser } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { desc, eq, or, ilike } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function getPatients(query?: string) {
  await requireUser()
  if (query?.trim()) {
    const term = `%${query.trim()}%`
    return db
      .select()
      .from(patients)
      .where(
        or(
          ilike(patients.fullName, term),
          ilike(patients.phone, term),
          ilike(patients.medicalRecordNumber, term)
        )
      )
      .orderBy(desc(patients.createdAt))
  }
  return db.select().from(patients).orderBy(desc(patients.createdAt))
}

export async function createPatient(input: {
  fullName: string
  dateOfBirth?: string
  gender?: string
  phone?: string
  address?: string
  medicalRecordNumber?: string
}) {
  const user = await requireUser()
  const fullName = input.fullName?.trim()
  if (!fullName) throw new Error('Patient name is required')

  const [row] = await db
    .insert(patients)
    .values({
      fullName,
      dateOfBirth: input.dateOfBirth || null,
      gender: input.gender || null,
      phone: input.phone || null,
      address: input.address || null,
      medicalRecordNumber: input.medicalRecordNumber?.trim() || null,
      createdBy: user.id,
    })
    .returning()

  await logAudit({
    userId: user.id,
    action: 'create',
    entityType: 'patient',
    entityId: row.id,
    details: { fullName },
  })

  revalidatePath('/patients')
  return row
}

export async function updatePatient(
  id: number,
  input: {
    fullName: string
    dateOfBirth?: string
    gender?: string
    phone?: string
    address?: string
    medicalRecordNumber?: string
  }
) {
  const user = await requireUser()
  const fullName = input.fullName?.trim()
  if (!fullName) throw new Error('Patient name is required')

  const [row] = await db
    .update(patients)
    .set({
      fullName,
      dateOfBirth: input.dateOfBirth || null,
      gender: input.gender || null,
      phone: input.phone || null,
      address: input.address || null,
      medicalRecordNumber: input.medicalRecordNumber?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(patients.id, id))
    .returning()

  if (!row) throw new Error('Patient not found')

  await logAudit({
    userId: user.id,
    action: 'modify',
    entityType: 'patient',
    entityId: id,
    details: { fullName },
  })

  revalidatePath('/patients')
  return row
}
