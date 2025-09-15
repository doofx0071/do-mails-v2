"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
// Use interface instead of importing from dist
interface ThemeProviderProps {
  children: React.ReactNode
  attribute?: 'class' | 'data-theme' | string
  defaultTheme?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  [key: string]: any
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...(props as any)}>{children}</NextThemesProvider>
}
