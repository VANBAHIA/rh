import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string
  senha: string
  tenantCnpj: string
}

export interface LoginResponse {
  data: {
    accessToken: string
    refreshToken: string
    usuario: {
      id: string
      nome: string
      email: string
      perfil: string
      tenant: {
        id: string
        nome: string
        cnpj: string
      }
    }
  }
}

export interface ApiError {
  message: string
  code?: string
  statusCode?: number
}

// ── Instância base ─────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  // Não define Content-Type globalmente para permitir multipart/form-data em uploads
  headers: {},
})

// ── Request interceptor — injeta Bearer token ──────────────────────────────

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ── Response interceptor — refresh automático 401 ──────────────────────────

let isRefreshing = false
let failedQueue: Array<{ resolve: (val: string) => void; reject: (err: unknown) => void }> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => (token ? p.resolve(token) : p.reject(error)))
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Não tenta refresh em rotas de auth
    const isAuthRoute = original?.url?.includes('/auth/')
    if (error.response?.status !== 401 || original?._retry || isAuthRoute) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
        .catch(Promise.reject)
    }

    original._retry = true
    isRefreshing = true

    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) throw new Error('Sem refresh token')

      const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken })
      const newToken = data.data.accessToken

      localStorage.setItem('accessToken', newToken)
      if (data.data.refreshToken) {
        localStorage.setItem('refreshToken', data.data.refreshToken)
      }

      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      original.headers.Authorization = `Bearer ${newToken}`
      processQueue(null, newToken)

      return api(original)
    } catch (err) {
      processQueue(err, null)
      // Limpa sessão e redireciona
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('usuario')
      window.location.href = '/login'
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  },
)

// ── Auth endpoints ──────────────────────────────────────────────────────────

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<LoginResponse>('/auth/login', payload),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  me: () => api.get('/auth/me'),

  logout: () => api.post('/auth/logout').catch(() => {}),
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function extractApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    // Garante que sempre retorna string — nunca objeto {code, message}
    if (typeof data?.message === 'string') return data.message
    if (Array.isArray(data?.message)) return data.message.join(', ')
    if (typeof data?.error === 'string') return data.error
    if (typeof data?.message === 'object' && data?.message !== null) {
      return data.message.message ?? JSON.stringify(data.message)
    }
    if (error.response?.status === 400) return 'Dados inválidos. Verifique as informações.'
    if (error.response?.status === 401) return 'Credenciais inválidas ou sessão expirada.'
    if (error.response?.status === 403) return 'Sem permissão para esta operação.'
    if (error.response?.status === 404) return 'Recurso não encontrado.'
    if (error.response?.status === 409) return 'Conflito: registro já existe.'
    if (error.response?.status === 429) return 'Muitas tentativas. Aguarde alguns minutos.'
    if (error.response?.status === 500) return 'Erro interno do servidor.'
    if (!error.response) return 'Sem conexão com o servidor.'
  }
  if (error instanceof Error) return error.message
  return 'Erro inesperado.'
}

export default api
