import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  // Sidebar state
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  // Theme state
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void

  // Email interface state
  selectedThreadId: string | null
  setSelectedThreadId: (threadId: string | null) => void
  
  // Compose dialog state
  composeDialogOpen: boolean
  setComposeDialogOpen: (open: boolean) => void
  
  // Domain dialog states
  addDomainDialogOpen: boolean
  setAddDomainDialogOpen: (open: boolean) => void
  verifyDomainDialogOpen: boolean
  setVerifyDomainDialogOpen: (open: boolean) => void
  
  // Alias dialog state
  addAliasDialogOpen: boolean
  setAddAliasDialogOpen: (open: boolean) => void

  // Filters and search
  emailFilters: {
    archived: boolean | null
    aliasId: string | null
    search: string
  }
  setEmailFilters: (filters: Partial<UIState['emailFilters']>) => void
  resetEmailFilters: () => void

  domainFilters: {
    status: 'all' | 'pending' | 'verified' | 'failed'
    search: string
  }
  setDomainFilters: (filters: Partial<UIState['domainFilters']>) => void
  resetDomainFilters: () => void

  aliasFilters: {
    domainId: string | null
    enabled: boolean | null
    search: string
  }
  setAliasFilters: (filters: Partial<UIState['aliasFilters']>) => void
  resetAliasFilters: () => void

  // Notifications/Toast state
  notifications: Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message: string
    timestamp: number
  }>
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void

  // Loading states for global operations
  globalLoading: {
    domains: boolean
    aliases: boolean
    emails: boolean
  }
  setGlobalLoading: (key: keyof UIState['globalLoading'], loading: boolean) => void

  // Error states
  globalErrors: {
    domains: string | null
    aliases: string | null
    emails: string | null
  }
  setGlobalError: (key: keyof UIState['globalErrors'], error: string | null) => void
  clearGlobalErrors: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Sidebar state
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      // Theme state
      theme: 'system',
      setTheme: (theme) => set({ theme }),

      // Email interface state
      selectedThreadId: null,
      setSelectedThreadId: (threadId) => set({ selectedThreadId: threadId }),

      // Dialog states
      composeDialogOpen: false,
      setComposeDialogOpen: (open) => set({ composeDialogOpen: open }),
      
      addDomainDialogOpen: false,
      setAddDomainDialogOpen: (open) => set({ addDomainDialogOpen: open }),
      verifyDomainDialogOpen: false,
      setVerifyDomainDialogOpen: (open) => set({ verifyDomainDialogOpen: open }),
      
      addAliasDialogOpen: false,
      setAddAliasDialogOpen: (open) => set({ addAliasDialogOpen: open }),

      // Filters
      emailFilters: {
        archived: null,
        aliasId: null,
        search: ''
      },
      setEmailFilters: (filters) => 
        set((state) => ({
          emailFilters: { ...state.emailFilters, ...filters }
        })),
      resetEmailFilters: () => 
        set({
          emailFilters: {
            archived: null,
            aliasId: null,
            search: ''
          }
        }),

      domainFilters: {
        status: 'all',
        search: ''
      },
      setDomainFilters: (filters) =>
        set((state) => ({
          domainFilters: { ...state.domainFilters, ...filters }
        })),
      resetDomainFilters: () =>
        set({
          domainFilters: {
            status: 'all',
            search: ''
          }
        }),

      aliasFilters: {
        domainId: null,
        enabled: null,
        search: ''
      },
      setAliasFilters: (filters) =>
        set((state) => ({
          aliasFilters: { ...state.aliasFilters, ...filters }
        })),
      resetAliasFilters: () =>
        set({
          aliasFilters: {
            domainId: null,
            enabled: null,
            search: ''
          }
        }),

      // Notifications
      notifications: [],
      addNotification: (notification) => {
        const id = Math.random().toString(36).substr(2, 9)
        const timestamp = Date.now()
        set((state) => ({
          notifications: [
            ...state.notifications,
            { ...notification, id, timestamp }
          ]
        }))
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
          set((state) => ({
            notifications: state.notifications.filter(n => n.id !== id)
          }))
        }, 5000)
      },
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        })),
      clearNotifications: () => set({ notifications: [] }),

      // Loading states
      globalLoading: {
        domains: false,
        aliases: false,
        emails: false
      },
      setGlobalLoading: (key, loading) =>
        set((state) => ({
          globalLoading: { ...state.globalLoading, [key]: loading }
        })),

      // Error states
      globalErrors: {
        domains: null,
        aliases: null,
        emails: null
      },
      setGlobalError: (key, error) =>
        set((state) => ({
          globalErrors: { ...state.globalErrors, [key]: error }
        })),
      clearGlobalErrors: () =>
        set({
          globalErrors: {
            domains: null,
            aliases: null,
            emails: null
          }
        })
    }),
    {
      name: 'do-mails-ui-store',
      // Only persist certain UI preferences
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        emailFilters: state.emailFilters,
        domainFilters: state.domainFilters,
        aliasFilters: state.aliasFilters
      })
    }
  )
)
