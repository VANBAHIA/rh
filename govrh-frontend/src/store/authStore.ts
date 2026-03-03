import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { authApi, extractApiError, LoginPayload } from '@/services/api'

export interface Usuario {
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

interface AuthState {
  usuario: Usuario | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
  clearError: () => void
  setTokens: (access: string, refresh: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      usuario: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (payload) => {
        set({ isLoading: true, error: null })
        try {
          const { data: res } = await authApi.login(payload)
          const { accessToken, refreshToken, usuario } = res.data

          // Persiste tokens no localStorage (também usado pelo interceptor)
          localStorage.setItem('accessToken', accessToken)
          localStorage.setItem('refreshToken', refreshToken)

          set({
            usuario,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (err) {
          set({
            isLoading: false,
            error: extractApiError(err),
            isAuthenticated: false,
          })
          throw err
        }
      },

      logout: () => {
        authApi.logout()
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        set({
          usuario: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        })
      },

      clearError: () => set({ error: null }),

      setTokens: (access, refresh) => {
        localStorage.setItem('accessToken', access)
        localStorage.setItem('refreshToken', refresh)
        set({ accessToken: access, refreshToken: refresh })
      },
    }),
    {
      name: 'govrh-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        usuario: state.usuario,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
