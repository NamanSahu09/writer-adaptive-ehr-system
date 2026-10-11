'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createEhrRecord } from '@/app/actions/verification'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ClipboardCheck, Loader2 } from 'lucide-react'

export function CreateEhrButton({ cardId }: { cardId: number }) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  async function handleClick() {
    setCreating(true)
    try {
      const result = await createEhrRecord(cardId)
      toast.success('EHR record created')
      router.push(`/records/${result.recordId}`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create EHR record',
      )
      setCreating(false)
    }
  }

  return (
    <Button onClick={handleClick} disabled={creating}>
      {creating ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <ClipboardCheck className="size-4" aria-hidden="true" />
      )}
      {creating ? 'Creating…' : 'Create EHR record'}
    </Button>
  )
}
