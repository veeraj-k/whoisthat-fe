import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { register } from '@/api/auth'
import { useAuth } from '@/auth/useAuth'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setToken } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await register({ username, password })
      if (!res.token) {
        throw new Error('Missing token in response')
      }
      setToken(res.token)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-card text-card-foreground p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Create account</h1>
        <p className="text-sm text-muted-foreground mt-1">Register to start building your tree.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Username</label>
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Password</label>
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
            />
          </div>

          {error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : null}

          <button
            className="w-full rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium disabled:opacity-50"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Creating…' : 'Register'}
          </button>
        </form>

        <div className="mt-4 text-sm">
          <a className="underline text-muted-foreground hover:text-foreground" href="/login">
            Back to login
          </a>
        </div>
      </div>
    </div>
  )
}
