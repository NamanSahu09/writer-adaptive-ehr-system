import { put } from '@vercel/blob'
import { type NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { opdCards, patients } from '@/lib/db/schema'
import { getSessionUser } from '@/lib/session'
import { logAudit } from '@/lib/audit'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

export async function POST(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const patientIdRaw = formData.get('patientId') as string | null
    const newPatientName = formData.get('newPatientName') as string | null
    const doctorIdRaw = formData.get('doctorId') as string | null
    const visitDate = formData.get('visitDate') as string | null
    const notes = formData.get('notes') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, WEBP, or HEIC images are allowed' },
        { status: 400 },
      )
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File must be smaller than 10 MB' },
        { status: 400 },
      )
    }

    // Resolve or create patient
    let patientId: number | null = null
    if (patientIdRaw && Number.isInteger(Number(patientIdRaw))) {
      patientId = Number(patientIdRaw)
    } else if (newPatientName?.trim()) {
      const [p] = await db
        .insert(patients)
        .values({ fullName: newPatientName.trim(), createdBy: user.id })
        .returning()
      patientId = p.id
    }

    const doctorId =
      doctorIdRaw && Number.isInteger(Number(doctorIdRaw))
        ? Number(doctorIdRaw)
        : null

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    let pathname = ''
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`opd-cards/${Date.now()}-${safeName}`, file, {
        access: 'private',
      })
      pathname = blob.pathname
    } else {
      const fs = await import('fs')
      const path = await import('path')
      const dir = path.join(process.cwd(), '.local-blob', 'opd-cards')
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      const filename = `${Date.now()}-${safeName}`
      const filepath = path.join(dir, filename)
      const arrayBuffer = await file.arrayBuffer()
      fs.writeFileSync(filepath, Buffer.from(arrayBuffer))
      pathname = `opd-cards/${filename}`
    }

    const [card] = await db
      .insert(opdCards)
      .values({
        patientId,
        doctorId,
        uploadedBy: user.id,
        imagePathname: pathname,
        originalFilename: file.name,
        status: 'uploaded',
        visitDate: visitDate || null,
        notes: notes?.trim() || null,
      })
      .returning()

    await logAudit({
      userId: user.id,
      action: 'upload',
      entityType: 'opd_card',
      entityId: card.id,
      details: { filename: file.name, size: file.size },
    })

    return NextResponse.json({ cardId: card.id })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
