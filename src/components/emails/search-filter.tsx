'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Filter, 
  X, 
  Calendar as CalendarIcon,
  User,
  AtSign,
  FileText
} from 'lucide-react'
import { format } from 'date-fns'

interface Alias {
  id: string
  alias_name: string
  full_address?: string
}

interface SearchFilters {
  query?: string
  alias_id?: string
  sender?: string
  subject?: string
  date_from?: Date
  date_to?: Date
  archived?: boolean
}

interface SearchFilterProps {
  aliases: Alias[]
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  onClearFilters: () => void
}

export function SearchFilter({ 
  aliases, 
  filters, 
  onFiltersChange, 
  onClearFilters 
}: SearchFilterProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [dateFromOpen, setDateFromOpen] = useState(false)
  const [dateToOpen, setDateToOpen] = useState(false)

  const updateFilter = (key: keyof SearchFilters, value: string | Date | boolean | undefined | null) => {
    onFiltersChange({
      ...filters,
      [key]: value === null ? undefined : value || undefined
    })
  }

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== '' && value !== null
  )

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => 
      value !== undefined && value !== '' && value !== null
    ).length
  }

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails by content, sender, or subject..."
            value={filters.query || ''}
            onChange={(e) => updateFilter('query', e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <Badge 
                  variant="secondary" 
                  className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {getActiveFiltersCount()}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filter Options</h4>
                {hasActiveFilters && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onClearFilters}
                    className="h-auto p-1 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>

              {/* Alias Filter */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <AtSign className="h-3 w-3" />
                  Email Alias
                </Label>
                <Select 
                  value={filters.alias_id || ''} 
                  onValueChange={(value) => updateFilter('alias_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All aliases" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All aliases</SelectItem>
                    {aliases.map((alias) => (
                      <SelectItem key={alias.id} value={alias.id}>
                        {alias.full_address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sender Filter */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <User className="h-3 w-3" />
                  Sender
                </Label>
                <Input
                  placeholder="Filter by sender email..."
                  value={filters.sender || ''}
                  onChange={(e) => updateFilter('sender', e.target.value)}
                />
              </div>

              {/* Subject Filter */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  Subject Contains
                </Label>
                <Input
                  placeholder="Filter by subject..."
                  value={filters.subject || ''}
                  onChange={(e) => updateFilter('subject', e.target.value)}
                />
              </div>

              {/* Date Range Filters */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <CalendarIcon className="h-3 w-3" />
                  Date Range
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start text-left font-normal"
                        size="sm"
                      >
                        {filters.date_from ? (
                          format(filters.date_from, 'MMM dd')
                        ) : (
                          <span className="text-muted-foreground">From</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.date_from}
                        onSelect={(date: Date | undefined) => {
                          updateFilter('date_from', date)
                          setDateFromOpen(false)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start text-left font-normal"
                        size="sm"
                      >
                        {filters.date_to ? (
                          format(filters.date_to, 'MMM dd')
                        ) : (
                          <span className="text-muted-foreground">To</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.date_to}
                        onSelect={(date: Date | undefined) => {
                          updateFilter('date_to', date)
                          setDateToOpen(false)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Archive Filter */}
              <div className="space-y-2">
                <Label className="text-sm">Show</Label>
                <Select 
                  value={filters.archived === undefined ? 'all' : filters.archived ? 'archived' : 'active'} 
                  onValueChange={(value) => {
                    if (value === 'all') {
                      updateFilter('archived', undefined)
                    } else {
                      updateFilter('archived', value === 'archived')
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All threads</SelectItem>
                    <SelectItem value="active">Active threads</SelectItem>
                    <SelectItem value="archived">Archived threads</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.query && (
            <Badge variant="secondary" className="gap-1">
              Search: "{filters.query}"
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('query', '')}
              />
            </Badge>
          )}
          {filters.alias_id && (
            <Badge variant="secondary" className="gap-1">
              Alias: {aliases.find(a => a.id === filters.alias_id)?.full_address}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('alias_id', '')}
              />
            </Badge>
          )}
          {filters.sender && (
            <Badge variant="secondary" className="gap-1">
              From: {filters.sender}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('sender', '')}
              />
            </Badge>
          )}
          {filters.subject && (
            <Badge variant="secondary" className="gap-1">
              Subject: {filters.subject}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('subject', '')}
              />
            </Badge>
          )}
          {filters.date_from && (
            <Badge variant="secondary" className="gap-1">
              From: {format(filters.date_from, 'MMM dd, yyyy')}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('date_from', null)}
              />
            </Badge>
          )}
          {filters.date_to && (
            <Badge variant="secondary" className="gap-1">
              To: {format(filters.date_to, 'MMM dd, yyyy')}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('date_to', null)}
              />
            </Badge>
          )}
          {filters.archived !== undefined && (
            <Badge variant="secondary" className="gap-1">
              {filters.archived ? 'Archived' : 'Active'} threads
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('archived', undefined)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
