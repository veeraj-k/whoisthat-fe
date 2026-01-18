import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createPerson,
  createRelation,
  deletePersonById,
  deleteRelationById,
  getAllPersons,
  getRelationById,
  getSimplifiedRelationPath,
  type Gender,
  type PersonDto,
  type RelationDto,
  type RelationType,
  updateRelationType,
  updatePerson,
} from '@/api/core'
import FamilyChartView from '@/components/tree/FamilyChartView'

type PersonFormState = {
  name: string
  gender: Gender
}

type RelationFormState = {
  fromId: string
  toId: string
  relationType: RelationType
}

const genderOptions: Gender[] = ['MALE', 'FEMALE', 'UNKNOWN']
const relationTypeOptions: RelationType[] = ['PARENT', 'SIBLING', 'SPOUSE']

export default function TreePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [persons, setPersons] = useState<PersonDto[]>([])

  const [activePersonId, setActivePersonId] = useState<string | null>(null)
  const [selectedA, setSelectedA] = useState<string | null>(null)
  const [selectedB, setSelectedB] = useState<string | null>(null)

  const [decoderLang, setDecoderLang] = useState('tulu')
  const [decoderLoading, setDecoderLoading] = useState(false)
  const [decoderResult, setDecoderResult] = useState<string | null>(null)
  const [decoderError, setDecoderError] = useState<string | null>(null)

  const lastDecodedKeyRef = useRef<string | null>(null)

  const [personFormMode, setPersonFormMode] = useState<'create' | 'edit'>('create')
  const [personForm, setPersonForm] = useState<PersonFormState>({ name: '', gender: 'UNKNOWN' })
  const [personSaving, setPersonSaving] = useState(false)
  const [personSaveError, setPersonSaveError] = useState<string | null>(null)

  const [relationForm, setRelationForm] = useState<RelationFormState>({
    fromId: '',
    toId: '',
    relationType: 'SIBLING',
  })
  const [relationSaving, setRelationSaving] = useState(false)
  const [relationSaveError, setRelationSaveError] = useState<string | null>(null)

  const [relationManageId, setRelationManageId] = useState('')
  const [relationManageLoading, setRelationManageLoading] = useState(false)
  const [relationManageError, setRelationManageError] = useState<string | null>(null)
  const [relationManageData, setRelationManageData] = useState<RelationDto | null>(null)
  const [relationManageType, setRelationManageType] = useState<RelationType>('SIBLING')

  const activePerson = useMemo(() => {
    if (!activePersonId) return null
    return persons.find((p) => p.id != null && String(p.id) === activePersonId) ?? null
  }, [activePersonId, persons])

  async function load() {
    setError(null)
    setLoading(true)
    try {
      const p = await getAllPersons()
      setPersons(p)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    async function run() {
      if (!selectedA || !selectedB) return

      const key = `${selectedA}|${selectedB}|${decoderLang}`
      if (lastDecodedKeyRef.current === key) return
      lastDecodedKeyRef.current = key

      setDecoderError(null)
      setDecoderResult(null)
      setDecoderLoading(true)
      try {
        const result = await getSimplifiedRelationPath({
          from: Number(selectedA),
          to: Number(selectedB),
          lang: decoderLang,
        })
        setDecoderResult(result)
      } catch (err) {
        setDecoderError(err instanceof Error ? err.message : 'Failed to decode relation')
      } finally {
        setDecoderLoading(false)
      }
    }

    void run()
  }, [decoderLang, selectedA, selectedB])

  function onPersonPick(personId: string) {
    setActivePersonId(personId)

    if (!selectedA || selectedA === personId) {
      setSelectedA(personId)
      if (selectedA === personId) setSelectedA(null)
      setDecoderResult(null)
      setDecoderError(null)
      return
    }

    if (!selectedB || selectedB === personId) {
      setSelectedB(personId)
      if (selectedB === personId) setSelectedB(null)
      setDecoderResult(null)
      setDecoderError(null)
      return
    }

    setSelectedA(personId)
    setSelectedB(null)
    setDecoderResult(null)
    setDecoderError(null)
  }

  function startCreatePerson() {
    setPersonFormMode('create')
    setPersonForm({ name: '', gender: 'UNKNOWN' })
    setPersonSaveError(null)
    setActivePersonId(null)
  }

  function startEditPerson(p: PersonDto) {
    if (p.id == null) return
    setPersonFormMode('edit')
    setPersonForm({ name: p.name ?? '', gender: p.gender ?? 'UNKNOWN' })
    setPersonSaveError(null)
    setActivePersonId(String(p.id))
  }

  async function submitPerson() {
    setPersonSaveError(null)
    setPersonSaving(true)
    try {
      if (personFormMode === 'create') {
        await createPerson({ name: personForm.name, gender: personForm.gender })
        startCreatePerson()
      } else {
        if (!activePersonId) throw new Error('No person selected')
        await updatePerson(Number(activePersonId), {
          name: personForm.name,
          gender: personForm.gender,
        })
      }
      await load()
    } catch (err) {
      setPersonSaveError(err instanceof Error ? err.message : 'Failed to save person')
    } finally {
      setPersonSaving(false)
    }
  }

  async function removePerson() {
    if (!activePersonId) return
    setPersonSaveError(null)
    setPersonSaving(true)
    try {
      await deletePersonById(Number(activePersonId))
      setActivePersonId(null)
      if (selectedA === activePersonId) setSelectedA(null)
      if (selectedB === activePersonId) setSelectedB(null)
      await load()
    } catch (err) {
      setPersonSaveError(err instanceof Error ? err.message : 'Failed to delete person')
    } finally {
      setPersonSaving(false)
    }
  }

  async function submitRelation() {
    setRelationSaveError(null)
    setRelationSaving(true)
    try {
      if (!relationForm.fromId || !relationForm.toId) {
        throw new Error('Select both people')
      }
      await createRelation({
        fromId: Number(relationForm.fromId),
        toId: Number(relationForm.toId),
        relationType: relationForm.relationType,
      })
      await load()
    } catch (err) {
      setRelationSaveError(err instanceof Error ? err.message : 'Failed to create relation')
    } finally {
      setRelationSaving(false)
    }
  }

  async function fetchRelationById() {
    setRelationManageError(null)
    setRelationManageData(null)
    if (!relationManageId) {
      setRelationManageError('Enter a relation id')
      return
    }

    setRelationManageLoading(true)
    try {
      const res = await getRelationById(Number(relationManageId))
      setRelationManageData(res)
      if (res.relationType) {
        setRelationManageType(res.relationType)
      }
    } catch (err) {
      setRelationManageError(err instanceof Error ? err.message : 'Failed to fetch relation')
    } finally {
      setRelationManageLoading(false)
    }
  }

  async function updateRelation() {
    setRelationManageError(null)
    if (!relationManageId) {
      setRelationManageError('Enter a relation id')
      return
    }

    setRelationManageLoading(true)
    try {
      const res = await updateRelationType(Number(relationManageId), relationManageType)
      setRelationManageData(res)
      await load()
    } catch (err) {
      setRelationManageError(err instanceof Error ? err.message : 'Failed to update relation')
    } finally {
      setRelationManageLoading(false)
    }
  }

  async function removeRelation() {
    setRelationManageError(null)
    if (!relationManageId) {
      setRelationManageError('Enter a relation id')
      return
    }

    setRelationManageLoading(true)
    try {
      await deleteRelationById(Number(relationManageId))
      setRelationManageData(null)
      await load()
    } catch (err) {
      setRelationManageError(err instanceof Error ? err.message : 'Failed to delete relation')
    } finally {
      setRelationManageLoading(false)
    }
  }

  async function decode() {
    setDecoderError(null)
    setDecoderResult(null)
    if (!selectedA || !selectedB) {
      setDecoderError('Select two people in the tree')
      return
    }

    setDecoderLoading(true)
    try {
      const result = await getSimplifiedRelationPath({
        from: Number(selectedA),
        to: Number(selectedB),
        lang: decoderLang,
      })
      setDecoderResult(result)
    } catch (err) {
      setDecoderError(err instanceof Error ? err.message : 'Failed to decode relation')
    } finally {
      setDecoderLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100dvh-56px)] lg:h-[calc(100dvh-56px)] grid grid-cols-1 lg:grid-cols-[1fr_380px]">
      <div className="relative h-full min-h-[400px]">
        <div className="absolute top-3 left-3 z-10 rounded-md border bg-card/80 backdrop-blur px-2 py-1 text-xs text-muted-foreground">
          People: {persons.filter((p) => p.id != null).length}
        </div>
        {loading ? (
          <div className="h-full grid place-items-center text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="h-full grid place-items-center p-6">
            <div className="max-w-md w-full rounded-xl border bg-card p-6">
              <div className="text-sm text-destructive">{error}</div>
              <button
                className="mt-4 rounded-md border px-3 py-2 text-sm hover:bg-accent"
                onClick={() => void load()}
              >
                Retry
              </button>
            </div>
          </div>
        ) : persons.filter((p) => p.id != null).length === 0 ? (
          <div className="h-full grid place-items-center p-6">
            <div className="max-w-md w-full rounded-xl border bg-card p-6">
              <div className="text-sm text-muted-foreground">No people yet. Create your first person.</div>
              <button
                className="mt-4 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm"
                onClick={startCreatePerson}
              >
                Create person
              </button>
            </div>
          </div>
        ) : (
          <FamilyChartView
            persons={persons}
            selectedA={selectedA}
            selectedB={selectedB}
            onPersonClick={onPersonPick}
          />
        )}
      </div>

      <aside className="border-t lg:border-t-0 lg:border-l bg-card/30">
        <div className="h-full overflow-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Tools</div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                onClick={startCreatePerson}
              >
                New person
              </button>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="text-sm font-medium">Person</div>
            <div className="mt-3 space-y-3">
              <div className="grid gap-1">
                <label className="text-xs text-muted-foreground">Name</label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={personForm.name}
                  onChange={(e) => setPersonForm((s) => ({ ...s, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-1">
                <label className="text-xs text-muted-foreground">Gender</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={personForm.gender}
                  onChange={(e) => setPersonForm((s) => ({ ...s, gender: e.target.value as Gender }))}
                >
                  {genderOptions.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {personSaveError ? <div className="text-sm text-destructive">{personSaveError}</div> : null}

              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm disabled:opacity-50"
                  disabled={personSaving}
                  onClick={() => void submitPerson()}
                >
                  {personSaving ? 'Saving…' : personFormMode === 'create' ? 'Create' : 'Save'}
                </button>
                {personFormMode === 'edit' ? (
                  <button
                    className="rounded-md border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                    disabled={personSaving}
                    onClick={() => void removePerson()}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </div>

            {activePerson ? (
              <div className="mt-4 border-t pt-4">
                <div className="text-xs text-muted-foreground">Selected person</div>
                <div className="mt-1 text-sm font-medium">{activePerson.name ?? `Person ${activePersonId}`}</div>
                <div className="mt-1 text-xs text-muted-foreground">{activePerson.gender ?? 'UNKNOWN'}</div>

                <button
                  className="mt-3 w-full rounded-md border px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => startEditPerson(activePerson)}
                >
                  Edit this person
                </button>

                {Array.isArray(activePerson.relations) && activePerson.relations.length ? (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs text-muted-foreground">Relations (from person record)</div>
                    <div className="space-y-2">
                      {activePerson.relations.map((r, idx) => (
                        <div key={idx} className="rounded-md border bg-background px-3 py-2 text-xs">
                          <div className="font-medium">{r.person?.name ?? 'Unknown'}</div>
                          <div className="text-muted-foreground">{r.relationType ?? 'UNKNOWN'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-xs text-muted-foreground">No relations listed for this person.</div>
                )}
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="text-sm font-medium">Create relationship</div>
            <div className="mt-3 grid gap-3">
              <div className="grid gap-1">
                <label className="text-xs text-muted-foreground">From</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={relationForm.fromId}
                  onChange={(e) => setRelationForm((s) => ({ ...s, fromId: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {persons
                    .filter((p) => p.id != null)
                    .map((p) => (
                      <option key={String(p.id)} value={String(p.id)}>
                        {p.name ?? `Person ${p.id}`}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid gap-1">
                <label className="text-xs text-muted-foreground">To</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={relationForm.toId}
                  onChange={(e) => setRelationForm((s) => ({ ...s, toId: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {persons
                    .filter((p) => p.id != null)
                    .map((p) => (
                      <option key={String(p.id)} value={String(p.id)}>
                        {p.name ?? `Person ${p.id}`}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid gap-1">
                <label className="text-xs text-muted-foreground">Type</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={relationForm.relationType}
                  onChange={(e) =>
                    setRelationForm((s) => ({ ...s, relationType: e.target.value as RelationType }))
                  }
                >
                  {relationTypeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {relationSaveError ? <div className="text-sm text-destructive">{relationSaveError}</div> : null}

              <button
                className="w-full rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm disabled:opacity-50"
                disabled={relationSaving}
                onClick={() => void submitRelation()}
              >
                {relationSaving ? 'Creating…' : 'Create relationship'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="text-sm font-medium">Manage relationship (by ID)</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Swagger relation list doesn’t include an ID, so manage updates/deletes by providing the relation id.
            </div>

            <div className="mt-3 grid gap-3">
              <div className="grid gap-1">
                <label className="text-xs text-muted-foreground">Relation ID</label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={relationManageId}
                  onChange={(e) => setRelationManageId(e.target.value)}
                />
              </div>

              <button
                className="w-full rounded-md border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                disabled={relationManageLoading}
                onClick={() => void fetchRelationById()}
              >
                {relationManageLoading ? 'Loading…' : 'Fetch relation'}
              </button>

              {relationManageData ? (
                <div className="rounded-md border bg-background px-3 py-2 text-xs">
                  <div className="font-medium">
                    {relationManageData.fromPerson?.name ?? 'Unknown'} → {relationManageData.toPerson?.name ?? 'Unknown'}
                  </div>
                  <div className="text-muted-foreground">Current: {relationManageData.relationType ?? 'UNKNOWN'}</div>
                </div>
              ) : null}

              <div className="grid gap-1">
                <label className="text-xs text-muted-foreground">Update type</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={relationManageType}
                  onChange={(e) => setRelationManageType(e.target.value as RelationType)}
                >
                  {relationTypeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm disabled:opacity-50"
                  disabled={relationManageLoading}
                  onClick={() => void updateRelation()}
                >
                  Update
                </button>
                <button
                  className="rounded-md border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                  disabled={relationManageLoading}
                  onClick={() => void removeRelation()}
                >
                  Delete
                </button>
              </div>

              {relationManageError ? <div className="text-sm text-destructive">{relationManageError}</div> : null}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="text-sm font-medium">Relationship decoder</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Click two people in the tree to select A and B.
            </div>

            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border bg-background px-3 py-2">
                  <div className="text-[11px] text-muted-foreground">A</div>
                  <div className="text-sm font-medium truncate">{selectedA ?? '—'}</div>
                </div>
                <div className="rounded-md border bg-background px-3 py-2">
                  <div className="text-[11px] text-muted-foreground">B</div>
                  <div className="text-sm font-medium truncate">{selectedB ?? '—'}</div>
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-xs text-muted-foreground">Language</label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={decoderLang}
                  onChange={(e) => setDecoderLang(e.target.value)}
                />
              </div>

              <button
                className="w-full rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm disabled:opacity-50"
                disabled={decoderLoading}
                onClick={() => void decode()}
              >
                {decoderLoading ? 'Decoding…' : 'Decode'}
              </button>

              {decoderError ? <div className="text-sm text-destructive">{decoderError}</div> : null}
              {decoderResult ? (
                <div className="rounded-md border bg-background px-3 py-2 text-sm">{decoderResult}</div>
              ) : null}
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
