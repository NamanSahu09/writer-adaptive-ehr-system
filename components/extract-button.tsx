'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { runExtraction } from '@/app/actions/extraction'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, ScanText } from 'lucide-react'

export function ExtractButton({
  cardId,
  isRetry = false,
}: {
  cardId: number
  isRetry?: boolean
}) {
  const router = useRouter()
  const [running, setRunning] = useState(false)

  async function handleClick() {
    setRunning(true)
    try {
      const result = await runExtraction(cardId)
      if (result.success) {
        toast.success('Extraction complete')
      } else {
        toast.error(result.error)
      }
      router.refresh()
    } catch {
      toast.error('Extraction failed. Please try again.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <Button onClick={handleClick} disabled={running}>
      {running ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <ScanText className="size-4" aria-hidden="true" />
      )}
      {running
        ? 'Reading handwriting…'
        : isRetry
          ? 'Retry extraction'
          : 'Run AI extraction'}
    </Button>
  )
}
