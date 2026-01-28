import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import {
  getAllFamilies,
  createFamily,
  type FamilyDto,
  type CreateFamilyDto,
} from '@/api/core'

export default function FamiliesPage() {
  const navigate = useNavigate()
  const [families, setFamilies] = useState<FamilyDto[]>([])
  const [familyLoading, setFamilyLoading] = useState(false)
  const [familyError, setFamilyError] = useState<string | null>(null)
  const [familyForm, setFamilyForm] = useState<CreateFamilyDto>({ familyName: '' })
  const [familySaving, setFamilySaving] = useState(false)
  const [familySaveError, setFamilySaveError] = useState<string | null>(null)

  async function loadFamilies() {
    setFamilyError(null)
    setFamilyLoading(true)
    try {
      const f = await getAllFamilies()
      setFamilies(f)
    } catch (err) {
      setFamilyError(err instanceof Error ? err.message : 'Failed to load families')
    } finally {
      setFamilyLoading(false)
    }
  }

  async function submitFamily() {
    if (!familyForm.familyName.trim()) {
      setFamilySaveError('Family name is required')
      return
    }
    setFamilySaveError(null)
    setFamilySaving(true)
    try {
      await createFamily(familyForm)
      setFamilyForm({ familyName: '' })
      await loadFamilies()
      toast.success('Family created successfully')
    } catch (err) {
      setFamilySaveError(err instanceof Error ? err.message : 'Failed to create family')
    } finally {
      setFamilySaving(false)
    }
  }

  useEffect(() => {
    void loadFamilies()
  }, [])

  return (
    <div className="min-h-[calc(100dvh-56px)] p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Family Management</h1>
          <p className="text-muted-foreground">View and manage your family groups</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Family List */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Your Families</h2>
            
            {familyLoading ? (
              <div className="text-sm text-muted-foreground">Loading families...</div>
            ) : familyError ? (
              <div className="text-sm text-destructive">{familyError}</div>
            ) : families.length === 0 ? (
              <div className="text-sm text-muted-foreground">No families yet. Create your first family.</div>
            ) : (
              <div className="space-y-3">
                {families.map((family) => (
                  <div
                    key={family.id}
                    className="flex items-center justify-between rounded-lg border bg-background p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/tree/${family.id}`)}
                  >
                    <div>
                      <h3 className="font-medium">{family.name}</h3>
                      <p className="text-sm text-muted-foreground">Family ID: {family.id}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-1 text-xs font-medium">
                        View Tree →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create Family Form */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Create New Family</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Family Name</label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter family name..."
                  value={familyForm.familyName}
                  onChange={(e) => setFamilyForm((s) => ({ ...s, familyName: e.target.value }))}
                />
              </div>

              {familySaveError ? (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {familySaveError}
                </div>
              ) : null}

              <button
                className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={familySaving || !familyForm.familyName.trim()}
                onClick={() => void submitFamily()}
              >
                {familySaving ? 'Creating Family...' : 'Create Family'}
              </button>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-muted/50">
              <h3 className="font-medium text-sm mb-2">About Families</h3>
              <p className="text-xs text-muted-foreground">
                Families help you organize and group related people together. Create multiple families to manage different family branches or groups.
              </p>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-card p-4">
            <div className="text-2xl font-bold">{families.length}</div>
            <div className="text-sm text-muted-foreground">Total Families</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="text-2xl font-bold">{families.length > 0 ? 'Active' : 'None'}</div>
            <div className="text-sm text-muted-foreground">Status</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="text-2xl font-bold">∞</div>
            <div className="text-sm text-muted-foreground">Members per Family</div>
          </div>
        </div>
      </div>
    </div>
  )
}
