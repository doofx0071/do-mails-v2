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
    <div className="min-h-screen space-y-6 bg-gray-50 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Dashboard
        </h1>
        <p className="text-gray-600">
          Overview and quick actions for your email alias system
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-gray-900">Total Emails</h3>
            <Mail className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">0</div>
            <p className="text-xs text-gray-500">No emails yet</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-gray-900">
              Active Domains
            </h3>
            <Globe className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">0</div>
            <p className="text-xs text-gray-500">Add your first domain</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-gray-900">Email Aliases</h3>
            <AtSign className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">0</div>
            <p className="text-xs text-gray-500">Create your first alias</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-gray-900">Settings</h3>
            <Settings className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">Ready</div>
            <p className="text-xs text-gray-500">Configure your account</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          <p className="text-sm text-gray-500">
            Get started with your email alias system
          </p>
        </div>
        <div className="space-y-4">
          <div className="grid gap-2 md:grid-cols-3">
            <button
              onClick={handleAddDomain}
              className="flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              <Globe className="mr-2 h-4 w-4" />
              Add Domain
            </button>
            <button
              onClick={handleCreateAlias}
              className="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            >
              <AtSign className="mr-2 h-4 w-4" />
              Create Alias
            </button>
            <button
              onClick={handleSettings}
              className="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
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
