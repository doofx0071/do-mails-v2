'use client'

import { useRouter } from 'next/navigation'
import { Mail, Globe, AtSign, Settings } from 'lucide-react'

export default function DashboardPage() {
  console.log('Dashboard page rendering...')
  const router = useRouter()

  const handleAddDomain = () => {
    router.push('/dashboard/domains')
  }

  const handleCreateAlias = () => {
    router.push('/dashboard/aliases')
  }

  const handleSettings = () => {
    router.push('/dashboard/settings')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Overview and quick actions for your email alias system
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-card-foreground">
              Total Emails
            </h3>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold text-card-foreground">0</div>
            <p className="text-xs text-muted-foreground">No emails yet</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-card-foreground">
              Active Domains
            </h3>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold text-card-foreground">0</div>
            <p className="text-xs text-muted-foreground">
              Add your first domain
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-card-foreground">
              Email Aliases
            </h3>
            <AtSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold text-card-foreground">0</div>
            <p className="text-xs text-muted-foreground">
              Create your first alias
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-card-foreground">
              Settings
            </h3>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold text-card-foreground">Ready</div>
            <p className="text-xs text-muted-foreground">
              Configure your account
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-card-foreground">
            Quick Actions
          </h3>
          <p className="text-sm text-muted-foreground">
            Get started with your email alias system
          </p>
        </div>
        <div className="space-y-4">
          <div className="grid gap-2 md:grid-cols-3">
            <button
              onClick={handleAddDomain}
              className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Globe className="mr-2 h-4 w-4" />
              Add Domain
            </button>
            <button
              onClick={handleCreateAlias}
              className="flex w-full items-center justify-center rounded-md border bg-background px-4 py-2 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <AtSign className="mr-2 h-4 w-4" />
              Create Alias
            </button>
            <button
              onClick={handleSettings}
              className="flex w-full items-center justify-center rounded-md border bg-background px-4 py-2 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
