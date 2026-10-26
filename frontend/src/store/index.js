import { create } from 'zustand'

// True when a real Supabase project is wired up (so we use real auth, not demo).
export const isAuthConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL
  return !!url && url !== 'https://placeholder.supabase.co'
}

const profileFromSession = (session) => {
  const u = session?.user
  if (!u) return null
  return {
    id: u.id,
    email: u.email,
    name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'User',
    role: u.user_metadata?.role || 'recruiter',
    avatar: u.user_metadata?.avatar_url || null,
    title: u.user_metadata?.title || 'Recruiter',
  }
}

// Auth store — manages user session, company, and roles
export const useAuthStore = create((set, get) => ({
  user: null,
  company: null,
  isAuthenticated: false,
  isLoading: true,

  login: (user, company) => set({ user, company, isAuthenticated: true, isLoading: false }),

  logout: async () => {
    try {
      if (isAuthConfigured()) {
        const { authService } = await import('../services/api')
        await authService.signOut()
      }
    } catch (err) {
      console.warn('Sign out failed:', err?.message || err)
    }
    set({ user: null, company: null, isAuthenticated: false, isLoading: false })
  },

  // Real email/password auth (used when Supabase is configured).
  signIn: async (email, password) => {
    const { authService } = await import('../services/api')
    const data = await authService.signIn(email, password)
    set({ user: profileFromSession(data), isAuthenticated: true, isLoading: false })
    return data
  },

  signUp: async (email, password, fullName) => {
    const { authService } = await import('../services/api')
    const data = await authService.signUp(email, password, fullName)
    // If email confirmation is OFF, a session is returned and we're signed in.
    if (data?.session) set({ user: profileFromSession(data), isAuthenticated: true, isLoading: false })
    return data
  },

  // Google OAuth — kicks off the redirect. The session lands back on
  // /auth/callback; initializeAuth()'s onAuthStateChange listener then signs us in.
  signInWithGoogle: async () => {
    const { authService } = await import('../services/api')
    return authService.signInWithGoogle()
  },

  setLoading: (isLoading) => set({ isLoading }),
  
  updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),
  
  updateCompany: (updates) => set((state) => ({ company: { ...state.company, ...updates } })),
  
  // Demo login for Phase 1 (no Supabase yet)
  demoLogin: () => {
    const demoUser = {
      id: 'demo-001',
      email: 'sarah@techcorp.io',
      name: 'Sarah Chen',
      role: 'super_admin',
      avatar: null,
      title: 'Head of Talent Acquisition',
    }
    const demoCompany = {
      id: 'comp-001',
      name: 'TechCorp Industries',
      logo: null,
      industry: 'Technology',
      size: '200-500',
      plan: 'professional',
    }
    set({ user: demoUser, company: demoCompany, isAuthenticated: true, isLoading: false })
  },
  
  initializeAuth: async () => {
    // No real backend → land on the login page (demo login available there).
    if (!isAuthConfigured()) {
      set({ isAuthenticated: false, isLoading: false })
      return
    }
    try {
      const { authService } = await import('../services/api')
      const session = await authService.getSession()
      set({ user: profileFromSession(session), isAuthenticated: !!session, isLoading: false })

      // Keep the store in sync with Supabase auth events.
      authService.onAuthStateChange((event, newSession) => {
        if (event === 'SIGNED_IN' && newSession) {
          set({ user: profileFromSession(newSession), isAuthenticated: true, isLoading: false })
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, company: null, isAuthenticated: false, isLoading: false })
        }
      })
    } catch (error) {
      console.warn('Supabase auth init failed:', error?.message || error)
      set({ isAuthenticated: false, isLoading: false })
    }
  },
}))

// UI store — manages sidebar, modals, global UI state
export const useUIStore = create((set) => ({
  sidebarCollapsed: false,
  sidebarMobileOpen: false,
  commandPaletteOpen: false,
  activeModal: null,
  modalData: null,
  theme: localStorage.getItem('hireos_theme') || 'dark',
  
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  openModal: (name, data = null) => set({ activeModal: name, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
  toggleTheme: () => set((s) => {
    const next = s.theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('hireos_theme', next)
    document.documentElement.setAttribute('data-theme', next)
    return { theme: next }
  }),
  initTheme: () => {
    const saved = localStorage.getItem('hireos_theme') || 'dark'
    document.documentElement.setAttribute('data-theme', saved)
    set({ theme: saved })
  },
}))

// Notifications store
export const useNotificationStore = create((set) => ({
  notifications: [
    { id: 1, type: 'application', title: 'New Application', message: 'Arjun Patel applied for Senior React Developer', time: '2m ago', read: false },
    { id: 2, type: 'interview', title: 'AI Interview Complete', message: 'Priya Sharma completed AI interview for Product Designer', time: '15m ago', read: false },
    { id: 3, type: 'offer', title: 'Offer Signed!', message: 'Rahul Verma signed the offer for Backend Engineer', time: '1h ago', read: false },
    { id: 4, type: 'report', title: 'AI Report Ready', message: 'Analysis report ready for Neha Gupta — Data Scientist role', time: '2h ago', read: true },
    { id: 5, type: 'pipeline', title: 'Stage SLA Alert', message: '3 candidates in HR Review for >3 days', time: '4h ago', read: true },
  ],
  
  unreadCount: () => {
    const state = useNotificationStore.getState()
    return state.notifications.filter(n => !n.read).length
  },
  
  markAsRead: (id) => set((s) => ({
    notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
  })),
  
  markAllAsRead: () => set((s) => ({
    notifications: s.notifications.map(n => ({ ...n, read: true })),
  })),
  
  addNotification: (notification) => set((s) => ({
    notifications: [{ ...notification, id: Date.now(), read: false }, ...s.notifications],
  })),
}))
