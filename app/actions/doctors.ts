'use server'

import { db } from '@/lib/db'
import { doctors, doctorStyleProfiles } from '@/lib/db/schema'
import { requireUser } from '@/lib/session'
import { logAudit } from '@/lib/audit'
import { desc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function getDoctors() {
  await requireUser()
  return db.select().from(doctors).orderBy(desc(doctors.createdAt))
}

export async function getDoctorStyleProfile(doctorId: number) {
  await requireUser()
  const [profile] = await db
    .select()
    .from(doctorStyleProfiles)
    .where(eq(doctorStyleProfiles.doctorId, doctorId))
    .limit(1)
  return profile ?? null
}

export async function createDoctor(input: {
  fullName: string
  specialty?: string
  licenseNumber?: string
  phone?: string
  email?: string
}) {
  const user = await requireUser()
  const fullName = input.fullName?.trim()
  if (!fullName) throw new Error('Doctor name is required')

  const [row] = await db
    .insert(doctors)
    .values({
      userId: user.id,
      fullName,
      specialty: input.specialty?.trim() || null,
      licenseNumber: input.licenseNumber?.trim() || null,
      phone: input.phone || null,
      email: input.email || null,
    })
    .returning()

  // Every doctor gets an empty style profile that learns over time.
  await db.insert(doctorStyleProfiles).values({ doctorId: row.id })

  await logAudit({
    userId: user.id,
    action: 'create',
    entityType: 'doctor',
    entityId: row.id,
    details: { fullName },
  })

  revalidatePath('/doctors')
  return row
}
