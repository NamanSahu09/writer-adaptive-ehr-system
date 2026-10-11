import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusConfig: Record<string, { label: string; className: string }> = {
  uploaded: {
    label: 'Uploaded',
    className: 'bg-secondary text-secondary-foreground',
  },
  processing: {
    label: 'Processing',
    className: 'bg-warning/15 text-warning-foreground border-warning/30',
  },
  extracted: {
    label: 'Extracted',
    className: 'bg-accent text-accent-foreground',
  },
  verified: {
    label: 'Verified',
    className: 'bg-success/15 text-success border-success/30',
  },
  ehr_created: {
    label: 'EHR Created',
    className: 'bg-primary/10 text-primary border-primary/30',
  },
  failed: {
    label: 'Failed',
    className: 'bg-destructive/10 text-destructive border-destructive/30',
  },
  draft: {
    label: 'Draft',
    className: 'bg-secondary text-secondary-foreground',
  },
  finalized: {
    label: 'Finalized',
    className: 'bg-success/15 text-success border-success/30',
  },
}

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? {
    label: status,
    className: 'bg-secondary text-secondary-foreground',
  }
  return (
    <Badge variant="outline" className={cn('capitalize', config.className)}>
      {config.label}
    </Badge>
  )
}
