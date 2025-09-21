'use client'

import * as React from 'react'
import { ChevronsUpDown, Plus } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { cn } from '@/lib/utils'
import { Account } from './mail'

interface AccountSwitcherProps {
  isCollapsed: boolean
  accounts: Account[]
  selectedAccount?: string | null
  onAccountChange?: (accountEmail: string) => void
}

export function AccountSwitcher({
  isCollapsed,
  accounts,
  selectedAccount,
  onAccountChange,
}: AccountSwitcherProps) {
  const currentAccount = React.useMemo(() => {
    return accounts.find(acc => acc.email === selectedAccount) || accounts[0]
  }, [accounts, selectedAccount])

  if (isCollapsed) {
    return (
      <div className="flex h-[52px] items-center justify-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          {currentAccount?.icon}
        </div>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border/40 bg-background/50 p-3 transition-colors hover:bg-accent hover:border-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {currentAccount?.icon}
          </div>
          <div className="flex flex-1 flex-col text-left min-w-0">
            <span className="truncate font-medium text-sm leading-tight">
              {currentAccount?.label}
            </span>
            <span className="truncate text-xs text-muted-foreground leading-tight">
              {currentAccount?.email}
            </span>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[280px]" align="start" forceMount>
        <DropdownMenuLabel className="font-normal px-3 py-2">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              Switch Account
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              Select which forwarding account to view
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          {accounts.map((account) => (
            <DropdownMenuItem
              key={account.email}
              onSelect={() => onAccountChange?.(account.email)}
              className={cn(
                "flex items-center gap-3 px-3 py-3 cursor-pointer",
                account.email === selectedAccount && "bg-accent"
              )}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                {account.icon}
              </div>
              <div className="flex flex-1 flex-col min-w-0">
                <span className="text-sm font-medium truncate">{account.label}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {account.email}
                </span>
              </div>
              {account.email === selectedAccount && (
                <div className="flex h-4 w-4 items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
              )}
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-3 px-3 py-2 text-muted-foreground">
          <Plus className="h-4 w-4" />
          Add domain account
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
