import 'server-only'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export type SessionUser = {
  id: string
  name: string
  email: string
  role: string
}

/** Returns the current session user or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const u = session.user as typeof session.user & { role?: string }
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role ?? 'doctor',
  }
}

/** Throws if there is no authenticated user. Use in server actions. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

/** Throws unless the user has one of the allowed roles. */
export async function requireRole(
  ...roles: string[]
): Promise<SessionUser> {
  const user = await requireUser()
  if (!roles.includes(user.role)) throw new Error('Forbidden')
  return user
}
