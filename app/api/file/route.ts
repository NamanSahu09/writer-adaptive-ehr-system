import { type NextRequest, NextResponse } from 'next/server'
import { get } from '@vercel/blob'
import { getSessionUser } from '@/lib/session'

export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const pathname = request.nextUrl.searchParams.get('pathname')
    if (!pathname || !pathname.startsWith('opd-cards/')) {
      return NextResponse.json({ error: 'Invalid pathname' }, { status: 400 })
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      const fs = await import('fs')
      const path = await import('path')
      const filepath = path.join(process.cwd(), '.local-blob', pathname)
      if (!fs.existsSync(filepath)) {
        return new NextResponse('Not found', { status: 404 })
      }
      const buffer = fs.readFileSync(filepath)
      const ext = pathname.split('.').pop()?.toLowerCase()
      let contentType = 'image/jpeg'
      if (ext === 'png') contentType = 'image/png'
      else if (ext === 'webp') contentType = 'image/webp'
      else if (ext === 'heic') contentType = 'image/heic'

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'private, no-cache',
        },
      })
    }

    const result = await get(pathname, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
    })

    if (!result) {
      return new NextResponse('Not found', { status: 404 })
    }

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          'Cache-Control': 'private, no-cache',
        },
      })
    }

    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType,
        ETag: result.blob.etag,
        'Cache-Control': 'private, no-cache',
      },
    })
  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
  }
}
