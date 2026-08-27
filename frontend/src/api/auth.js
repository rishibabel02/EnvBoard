import { post } from './client'

export const login = (email, password) =>
  post('/auth/login', { email, password })
