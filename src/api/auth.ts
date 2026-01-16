import { apiFetch } from '@/lib/api-client'

export type LoginRequest = {
  username?: string
  password?: string
}

export type UserResponse = {
  username?: string
  token?: string
}

export function register(body: LoginRequest): Promise<UserResponse> {
  return apiFetch<UserResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}

export function login(body: LoginRequest): Promise<UserResponse> {
  return apiFetch<UserResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  })
}
