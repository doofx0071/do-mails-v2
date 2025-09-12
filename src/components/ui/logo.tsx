"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import Image from "next/image"
import { getThemeLogo } from "@/lib/logos"

interface LogoProps {
  withText?: boolean
  className?: string
  width?: number
  height?: number
  alt?: string
}

export function Logo({ 
  withText = false, 
  className = "", 
  width = 32, 
  height = 32,
  alt = "do-Mails"
}: LogoProps) {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return a placeholder during SSR to avoid hydration mismatch
    return (
      <div 
        className={`bg-gray-200 dark:bg-gray-700 rounded ${className}`}
        style={{ width, height }}
      />
    )
  }

  // Determine the current theme (fallback to light if system)
  const currentTheme = resolvedTheme === 'dark' ? 'dark' : 'light'
  const logoUrl = getThemeLogo(currentTheme, withText)

  return (
    <Image
      src={logoUrl}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority
    />
  )
}
