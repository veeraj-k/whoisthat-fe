import { env } from '@/config/env'
import { clearAuthToken, getAuthToken } from '@/lib/auth-token'

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

function getBaseUrl(): string {
  if (!env.apiBaseUrl) {
    throw new Error('Missing VITE_API_BASE_URL')
  }
  return env.apiBaseUrl
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const url = `${getBaseUrl()}${path}`
  const token = getAuthToken()

  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (!init.skipAuth && token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(url, {
    ...init,
    headers,
  })

  const contentType = res.headers.get('content-type')
  const isJson = !!contentType && contentType.includes('application/json')

  const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => '')

  if (res.status === 401) {
    clearAuthToken()
    window.dispatchEvent(new CustomEvent('whoisthat:unauthorized'))
  }

  if (!res.ok) {
    throw new ApiError(`Request failed: ${res.status}`, res.status, body)
  }

  return body as T
}
