import Link from 'next/link'
import { getDashboardStats } from '@/app/actions/dashboard'
import { getCards } from '@/app/actions/opd-cards'
import { getSessionUser } from '@/lib/session'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Upload, Files, ClipboardList, Gauge } from 'lucide-react'

export default async function DashboardPage() {
  const [stats, cards, user] = await Promise.all([
    getDashboardStats(),
    getCards(),
    getSessionUser(),
  ])

  const recentCards = cards.slice(0, 6)

  const statCards = [
    {
      label: 'OPD Cards',
      value: stats.totalCards,
      sub: `${stats.pendingCards} awaiting review`,
      icon: Files,
    },
    {
      label: 'Verified',
      value: stats.verifiedCards,
      sub: 'human-checked extractions',
      icon: ClipboardList,
    },
    {
      label: 'EHR Records',
      value: stats.ehrRecords,
      sub: 'finalized digital records',
      icon: ClipboardList,
    },
    {
      label: 'Avg. Confidence',
      value:
        stats.avgConfidence != null
          ? `${Math.round(stats.avgConfidence * 100)}%`
          : '—',
      sub: 'AI extraction accuracy',
      icon: Gauge,
    },
  ]

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Welcome back, {user?.name?.split(' ')[0] ?? 'there'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Convert handwritten OPD cards into structured health records.
          </p>
        </div>
        <Button asChild>
          <Link href="/upload">
            <Upload className="size-4" aria-hidden="true" />
            Upload OPD Card
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label} className="p-4 gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <span className="text-2xl font-semibold tracking-tight">
                {s.value}
              </span>
              <span className="text-xs text-muted-foreground">{s.sub}</span>
            </Card>
          )
        })}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="font-medium">Recent OPD cards</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/cards">View all</Link>
          </Button>
        </div>
        {recentCards.length === 0 ? (
          <div className="px-4 pb-8 pt-4 text-center">
            <p className="text-sm text-muted-foreground">
              No cards yet. Upload your first handwritten OPD card to get
              started.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentCards.map((card) => (
                <TableRow key={card.id}>
                  <TableCell>
                    <Link
                      href={`/cards/${card.id}`}
                      className="font-medium hover:underline underline-offset-4"
                    >
                      {card.patientName ?? 'Unknown patient'}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {card.doctorName ?? '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={card.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {card.createdAt.toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
