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
}

export function AccountSwitcher({
  isCollapsed,
  accounts,
}: AccountSwitcherProps) {
  const [selectedAccount, setSelectedAccount] = React.useState<Account>(
    accounts[0]
  )

  if (isCollapsed) {
    return (
      <div className="flex h-[52px] items-center justify-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          {selectedAccount.icon}
        </div>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex w-full cursor-pointer items-center gap-2 rounded-lg border p-2 hover:bg-accent">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
            {selectedAccount.icon}
          </div>
          <div className="flex flex-1 flex-col text-left text-sm">
            <span className="truncate font-medium">
              {selectedAccount.label}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {selectedAccount.email}
            </span>
          </div>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px]" align="start" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {selectedAccount.label}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {selectedAccount.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {accounts.map((account) => (
          <DropdownMenuItem
            key={account.email}
            onSelect={() => setSelectedAccount(account)}
            className="gap-2"
          >
            <div className="flex h-4 w-4 items-center justify-center">
              {account.icon}
            </div>
            <div className="flex flex-col">
              <span className="text-sm">{account.label}</span>
              <span className="text-xs text-muted-foreground">
                {account.email}
              </span>
            </div>
            {account.email === selectedAccount.email && (
              <DropdownMenuShortcut>✓</DropdownMenuShortcut>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2">
          <Plus className="h-4 w-4" />
          Add account
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
