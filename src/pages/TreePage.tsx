import { useEffect, useRef, useState } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './TreePage.css'
import {
  getAllPersons,
  getSimplifiedRelationPath,
  type Gender,
  type PersonDto,
  updatePerson,
  deletePersonById,
  createPerson,
} from '@/api/core'
import FamilyChartView from '@/components/tree/FamilyChartView'

type PersonFormState = {
  name: string
  gender: Gender
}

const genderOptions: Gender[] = ['MALE', 'FEMALE', 'UNKNOWN']

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
    async function decodeRelation(a: string, b: string, lang: string) {
      const key = `${a}-${b}-${lang}`
      if (lastDecodedKeyRef.current === key) return
      lastDecodedKeyRef.current = key

      setDecoderLoading(true)
      setDecoderResult(null)
      setDecoderError(null)
      try {
        const res = await getSimplifiedRelationPath({ from: Number(a), to: Number(b), lang })
        setDecoderResult(res)
        toast.success(res)
      } catch (err) {
        const status = (err as any)?.status
        if (status === 502) {
          const msg = 'No connecting relation found.'
          setDecoderResult(msg)
          toast.error(msg)
        } else {
          const msg = err instanceof Error ? err.message : 'Failed to decode relation'
          setDecoderError(msg)
          toast.error(msg)
        }
      } finally {
        setDecoderLoading(false)
      }
    }

    async function run() {
      if (!selectedA || !selectedB) return

      await decodeRelation(selectedA, selectedB, decoderLang)
    }

    void run()
  }, [decoderLang, selectedA, selectedB])

  function onPersonPick(personId: string) {
    setActivePersonId(personId)

    if (!selectedA) {
      setSelectedA(personId)
      setSelectedB(null)
      setDecoderResult(null)
      setDecoderError(null)
    } else if (selectedA === personId) {
      // Deselect A
      setSelectedA(null)
      setSelectedB(null)
      setDecoderResult(null)
      setDecoderError(null)
    } else if (!selectedB) {
      setSelectedB(personId)
      setDecoderResult(null)
      setDecoderError(null)
    } else if (selectedB === personId) {
      // Deselect B, keep A
      setSelectedB(null)
      setDecoderResult(null)
      setDecoderError(null)
    } else {
      // New selection: replace A with this, clear B
      setSelectedA(personId)
      setSelectedB(null)
      setDecoderResult(null)
      setDecoderError(null)
    }
  }

  function startCreatePerson() {
    setPersonFormMode('create')
    setPersonForm({ name: '', gender: 'UNKNOWN' })
    setPersonSaveError(null)
    setActivePersonId(null)
  }

  async function submitPerson() {
    setPersonSaveError(null)
    setPersonSaving(true)
    try {
      if (personFormMode === 'create') {
        await createPerson({ name: personForm.name, gender: personForm.gender })
        setPersonForm({ name: '', gender: 'UNKNOWN' })
      } else {
        if (!activePersonId) return
        await updatePerson(Number(activePersonId), { name: personForm.name, gender: personForm.gender })
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
      await load()
      setPersonForm({ name: '', gender: 'UNKNOWN' })
      setActivePersonId(null)
    } catch (err) {
      setPersonSaveError(err instanceof Error ? err.message : 'Failed to delete person')
    } finally {
      setPersonSaving(false)
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
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        className="toast-container"
        toastClassName="toast-item"
      />
    </div>
  )
}
