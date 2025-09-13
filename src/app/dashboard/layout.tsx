'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  Mail,
  Globe,
  AtSign,
  Settings,
  Menu,
  LogOut,
  User,
  LayoutDashboard,
  Inbox,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Logo } from '@/components/ui/logo'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Overview and quick actions',
  },
  {
    name: 'Mail',
    href: '/dashboard/mail',
    icon: Mail,
    description: 'Beautiful mail interface with resizable panels',
  },
  {
    name: 'Emails',
    href: '/dashboard/emails',
    icon: Inbox,
    description: 'View and manage your email conversations',
  },
  {
    name: 'Domains',
    href: '/dashboard/domains',
    icon: Globe,
    description: 'Manage your custom domains',
  },
  {
    name: 'Aliases',
    href: '/dashboard/aliases',
    icon: AtSign,
    description: 'Create and manage email aliases',
  },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const pathname = usePathname()

  const handleSignOut = async () => {
    try {
      const { AuthService } = await import('@/lib/supabase/auth')
      await AuthService.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
      // Fallback: clear local storage and redirect
      localStorage.removeItem('auth_token')
      window.location.href = '/auth/signin'
    }
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div
        className={`flex h-20 shrink-0 items-center justify-center transition-all duration-300 ${sidebarCollapsed ? 'px-3' : 'px-6'}`}
      >
        <Link href="/dashboard" className="flex items-center justify-center">
          <Logo
            withText={!sidebarCollapsed}
            width={sidebarCollapsed ? 40 : 160}
            height={sidebarCollapsed ? 40 : 48}
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav
        className={`flex flex-1 flex-col py-4 transition-all duration-300 ${sidebarCollapsed ? 'px-3' : 'px-6'}`}
      >
        <ul className="flex flex-1 flex-col gap-y-2">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`group flex rounded-md p-3 text-sm font-medium transition-colors ${
                    sidebarCollapsed ? 'justify-center' : 'gap-x-3'
                  } ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!sidebarCollapsed && (
                    <div>
                      <div>{item.name}</div>
                      <div className="text-xs opacity-75">
                        {item.description}
                      </div>
                    </div>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Collapse button */}
      <div
        className={`border-t py-4 transition-all duration-300 ${sidebarCollapsed ? 'px-3' : 'px-6'}`}
      >
        <Button
          variant="ghost"
          className="w-full justify-center p-3 transition-all duration-300"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <div className="flex items-center">
              <ChevronLeft className="mr-2 h-5 w-5" />
              <span className="text-sm font-medium">Collapse</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar */}
      <div
        className={`hidden transition-all duration-300 lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}`}
      >
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-card">
          <SidebarContent />
        </div>
      </div>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-card">
            <SidebarContent />
          </div>
        </SheetContent>

        {/* Main content */}
        <div
          className={`flex flex-1 flex-col transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}
        >
          {/* Top bar */}
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open sidebar</span>
              </Button>
            </SheetTrigger>

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
              <div className="flex flex-1"></div>

              {/* Desktop user menu */}
              <div className="hidden lg:flex lg:items-center lg:gap-x-6">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Page content */}
          <main
            className={`flex-1 ${pathname === '/dashboard/mail' ? 'overflow-hidden' : 'overflow-y-auto'}`}
          >
            {pathname === '/dashboard/mail' ? (
              <div className="h-full">{children}</div>
            ) : (
              <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
            )}
          </main>
        </div>
      </Sheet>
    </div>
  )
}
