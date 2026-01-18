import { useEffect, useMemo, useState } from 'react'
import { getAllRelations, type RelationDto, type RelationType } from '@/api/core'

type RelationRow = {
  fromName: string
  toName: string
  type: RelationType
}

function isRelationType(v: unknown): v is RelationType {
  return v === 'PARENT' || v === 'SIBLING' || v === 'SPOUSE'
}

export default function RelationsSummaryPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [relations, setRelations] = useState<RelationDto[]>([])

  async function load() {
    setError(null)
    setLoading(true)
    try {
      const r = await getAllRelations()
      setRelations(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load relations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const rows = useMemo<RelationRow[]>(() => {
    return relations
      .map((r) => {
        const fromName = r.fromPerson?.name
        const toName = r.toPerson?.name
        const type = r.relationType
        if (!fromName || !toName || !isRelationType(type)) return null
        return { fromName, toName, type }
      })
      .filter((x): x is RelationRow => x != null)
  }, [relations])

  const grouped = useMemo(() => {
    const map: Record<RelationType, RelationRow[]> = {
      PARENT: [],
      SIBLING: [],
      SPOUSE: [],
    }

    for (const r of rows) map[r.type].push(r)
    return map
  }, [rows])

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Relations Summary</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Simple UI-only summary from <code>GET /api/v1/core/relations</code>.
            </p>
          </div>
          <button className="rounded-md border px-3 py-2 text-sm hover:bg-accent" onClick={() => void load()}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="mt-6 rounded-xl border bg-card p-6 text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="mt-6 rounded-xl border bg-card p-6">
            <div className="text-sm text-destructive">{error}</div>
            <button
              className="mt-4 rounded-md border px-3 py-2 text-sm hover:bg-accent"
              onClick={() => void load()}
            >
              Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-6 rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            No relations found.
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {(['PARENT', 'SPOUSE', 'SIBLING'] as RelationType[]).map((t) => (
              <section key={t} className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{t}</div>
                  <div className="text-xs text-muted-foreground">{grouped[t].length}</div>
                </div>

                {grouped[t].length === 0 ? (
                  <div className="mt-3 text-sm text-muted-foreground">None</div>
                ) : (
                  <div className="mt-3 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground">
                        <tr>
                          <th className="text-left font-medium py-2 pr-3">From</th>
                          <th className="text-left font-medium py-2 pr-3">To</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grouped[t].map((r, idx) => (
                          <tr key={`${r.fromName}-${r.toName}-${r.type}-${idx}`} className="border-t">
                            <td className="py-2 pr-3">{r.fromName}</td>
                            <td className="py-2 pr-3">{r.toName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
