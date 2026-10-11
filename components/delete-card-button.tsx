'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteCard } from '@/app/actions/opd-cards'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function DeleteCardButton({ cardId }: { cardId: number }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this OPD card? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const res = await deleteCard(cardId)
      if (res.success) {
        toast.success('OPD card deleted successfully')
        router.push('/cards')
        router.refresh()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete OPD card')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={deleting}
      onClick={handleDelete}
      className="gap-1.5"
    >
      {deleting ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Trash2 className="size-4" aria-hidden="true" />
      )}
      {deleting ? 'Deleting…' : 'Delete card'}
    </Button>
  )
}
