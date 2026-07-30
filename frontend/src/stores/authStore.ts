import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/services/api'

interface User {
  id: number
  name: string
  full_name?: string
  rank?: string
  email: string
  role: string
  status: string
  phone?: string
  office_id: number
  avatar?: string | null
  first_name?: string
  last_name?: string
  middle_name?: string
  item_no?: string
  accnt_no?: string
  unit_assignment?: string
  designation?: string
  notification_preferences?: Record<string, boolean>
  has_pincode?: boolean
  office?: {
    id: number
    name: string
  }
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  twoFaToken: string | null
  login: (accnt_no: string, password: string) => Promise<void>
  verify2fa: (code: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User) => void
  setAuth: (user: User, token: string) => void
  isSuperadmin: () => boolean
}

// Normalize the avatar URL to a root-relative path (/storage/avatars/...)
// so it works through the Vite dev proxy regardless of how it was stored.
// Handles three cases:
//   1. Raw relative path: "avatars/xxx.png"  → "/storage/avatars/xxx.png"
//   2. Already relative:  "/storage/..."     → unchanged
//   3. Absolute URL:      "http://host/storage/..." → "/storage/..."
function normalizeUser(user: User): User {
  if (!user.avatar) return user

  let avatar = user.avatar

  // Case 3: strip the origin from an absolute URL, keep the pathname
  if (/^https?:\/\//.test(avatar)) {
    try {
      avatar = new URL(avatar).pathname
    } catch {
      // leave as-is if URL is malformed
    }
  }

  // Case 1: prepend /storage/ if it's a raw relative path (no leading slash)
  if (!avatar.startsWith('/')) {
    avatar = `/storage/${avatar}`
  }

  return { ...user, avatar }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      twoFaToken: null,

      login: async (accnt_no: string, password: string) => {
        const response = await api.post('/auth/login', { accnt_no, password })
        const { user, token, requires_2fa, two_fa_token } = response.data

        if (requires_2fa) {
          set({ twoFaToken: two_fa_token, isAuthenticated: false })
          return
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        
        set({
          user: normalizeUser(user),
          token,
          isAuthenticated: true,
          twoFaToken: null,
        })
      },

      verify2fa: async (code: string) => {
        const twoFaToken = get().twoFaToken
        if (!twoFaToken) {
          throw new Error('2FA session expired. Please log in again.')
        }
        const response = await api.post('/auth/2fa/verify', { two_fa_token: twoFaToken, code })
        const { user, token } = response.data

        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        
        set({
          user: normalizeUser(user),
          token,
          isAuthenticated: true,
          twoFaToken: null,
        })
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch (error) {
          // Ignore logout errors
        }
        
        delete api.defaults.headers.common['Authorization']
        
        // Clear privacy acknowledgment so the notice re-shows on next load
        // until the user logs in again.
        localStorage.removeItem('dtms-privacy-ack')
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },

      setUser: (user: User) => set({ user: normalizeUser(user) }),

      setAuth: (user: User, token: string) => {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        set({
          user: normalizeUser(user),
          token,
          isAuthenticated: true,
          twoFaToken: null,
        })
      },

      isSuperadmin: () => get().user?.role === 'superadmin',
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        twoFaToken: state.twoFaToken,
      }),
      // Normalize avatar on rehydration so stale absolute URLs (e.g. http://localhost/storage/...)
      // stored in localStorage are converted to root-relative paths that work through the Vite proxy.
      onRehydrateStorage: () => (state) => {
        if (state?.user) {
          state.user = normalizeUser(state.user)
        }
      },
    }
  )
)
