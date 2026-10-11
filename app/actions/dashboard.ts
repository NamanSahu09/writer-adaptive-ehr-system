'use server'

import { db } from '@/lib/db'
import {
  opdCards,
  ehrRecords,
  extractedData,
  patients,
  doctors,
  auditLogs,
} from '@/lib/db/schema'
import { requireUser, requireRole } from '@/lib/session'
import { sql, desc, eq } from 'drizzle-orm'

export async function getDashboardStats() {
  await requireUser()

  const [cardStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where ${opdCards.status} in ('uploaded', 'extracted'))::int`,
      verified: sql<number>`count(*) filter (where ${opdCards.status} in ('verified', 'ehr_created'))::int`,
    })
    .from(opdCards)

  const [ehrCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ehrRecords)

  const [confidence] = await db
    .select({
      avg: sql<string | null>`avg(${extractedData.overallConfidence})`,
    })
    .from(extractedData)

  const [patientCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(patients)

  return {
    totalCards: cardStats?.total ?? 0,
    pendingCards: cardStats?.pending ?? 0,
    verifiedCards: cardStats?.verified ?? 0,
    ehrRecords: ehrCount?.count ?? 0,
    avgConfidence: confidence?.avg ? Number(confidence.avg) : null,
    patients: patientCount?.count ?? 0,
  }
}

export async function getEhrRecords() {
  await requireUser()
  return db
    .select({
      id: ehrRecords.id,
      chiefComplaint: ehrRecords.chiefComplaint,
      diagnosis: ehrRecords.diagnosis,
      status: ehrRecords.status,
      followUpDate: ehrRecords.followUpDate,
      createdAt: ehrRecords.createdAt,
      patientName: patients.fullName,
      doctorName: doctors.fullName,
      opdCardId: ehrRecords.opdCardId,
    })
    .from(ehrRecords)
    .leftJoin(patients, eq(ehrRecords.patientId, patients.id))
    .leftJoin(doctors, eq(ehrRecords.doctorId, doctors.id))
    .orderBy(desc(ehrRecords.createdAt))
}

export async function getEhrRecord(id: number) {
  await requireUser()
  const [record] = await db
    .select({
      id: ehrRecords.id,
      opdCardId: ehrRecords.opdCardId,
      chiefComplaint: ehrRecords.chiefComplaint,
      diagnosis: ehrRecords.diagnosis,
      vitalSigns: ehrRecords.vitalSigns,
      prescriptions: ehrRecords.prescriptions,
      labOrders: ehrRecords.labOrders,
      clinicalNotes: ehrRecords.clinicalNotes,
      followUpDate: ehrRecords.followUpDate,
      status: ehrRecords.status,
      finalizedAt: ehrRecords.finalizedAt,
      createdAt: ehrRecords.createdAt,
      patientName: patients.fullName,
      doctorName: doctors.fullName,
    })
    .from(ehrRecords)
    .leftJoin(patients, eq(ehrRecords.patientId, patients.id))
    .leftJoin(doctors, eq(ehrRecords.doctorId, doctors.id))
    .where(eq(ehrRecords.id, id))
    .limit(1)
  return record ?? null
}

export async function getAuditLogs() {
  await requireRole('verifier')
  return db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(200)
}
