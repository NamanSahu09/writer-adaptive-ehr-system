'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition, useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export function PatientSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const searchVal = searchParams.get('search') ?? ''
  const [value, setValue] = useState(searchVal)

  useEffect(() => {
    setValue(searchVal)
  }, [searchVal])

  function handleSearch(term: string) {
    setValue(term)
    const params = new URLSearchParams(searchParams.toString())
    if (term) {
      params.set('search', term)
    } else {
      params.delete('search')
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        placeholder="Search by name, phone, or MRN..."
        className="pl-8 h-9"
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
      />
    </div>
  )
}
