import 'server-only'

import { db } from '@/lib/db'
import { auditLogs } from '@/lib/db/schema'

export async function logAudit(params: {
  userId: string
  action: string
  entityType: string
  entityId?: string | number
  details?: Record<string, unknown>
}) {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId != null ? String(params.entityId) : null,
      details: params.details ?? null,
    })
  } catch (error) {
    console.error('Audit log failed:', error)
  }
}
