import { post } from './client'
import type { AuthUser } from '../types'

interface LoginResponse {
  data: {
    token: string
    user: AuthUser
  }
}

export const login = (email: string, password: string) =>
  post<LoginResponse>('/auth/login', { email, password })
