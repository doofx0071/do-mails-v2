/**
 * Logo utilities for the Do-Mails application
 * Provides easy access to logo assets stored in Supabase Storage
 */

// Base URL for Supabase storage
const STORAGE_BASE_URL = 'https://pgmjgxlulflknscyjxix.supabase.co/storage/v1/object/public/frontend'

/**
 * Logo configuration object with all available logo variants
 */
export const LOGOS = {
  // Black logo for light backgrounds
  black: `${STORAGE_BASE_URL}/logos/do-mails-black.png`,
  
  // White logo for dark backgrounds  
  white: `${STORAGE_BASE_URL}/logos/do-mails-white.png`,
  
  // Logo with black text
  blackText: `${STORAGE_BASE_URL}/logos/do-mails-logo-with-black-text.png`,
  
  // Logo with white text
  whiteText: `${STORAGE_BASE_URL}/logos/do-mails-logo-with-white-text.png`,
} as const

/**
 * Logo types for TypeScript support
 */
export type LogoVariant = keyof typeof LOGOS

/**
 * Get logo URL by variant name
 * @param variant - The logo variant to retrieve
 * @returns The full URL to the logo asset
 */
export function getLogoUrl(variant: LogoVariant): string {
  return LOGOS[variant]
}

/**
 * Get the appropriate logo for the current theme
 * @param theme - 'light' or 'dark' theme
 * @param withText - Whether to include text in the logo
 * @returns The appropriate logo URL for the theme
 */
export function getThemeLogo(theme: 'light' | 'dark', withText: boolean = false): string {
  if (withText) {
    return theme === 'light' ? LOGOS.blackText : LOGOS.whiteText
  }
  return theme === 'light' ? LOGOS.black : LOGOS.white
}

/**
 * Logo metadata for each variant
 */
export const LOGO_METADATA = {
  black: {
    name: 'Do-Mails Black Logo',
    description: 'Black logo suitable for light backgrounds',
    size: '50KB',
    bestFor: 'light backgrounds, minimal design'
  },
  white: {
    name: 'Do-Mails White Logo', 
    description: 'White logo suitable for dark backgrounds',
    size: '47KB',
    bestFor: 'dark backgrounds, minimal design'
  },
  blackText: {
    name: 'Do-Mails Logo with Black Text',
    description: 'Logo with black text for light backgrounds',
    size: '26KB', 
    bestFor: 'light backgrounds, branding with text'
  },
  whiteText: {
    name: 'Do-Mails Logo with White Text',
    description: 'Logo with white text for dark backgrounds', 
    size: '32KB',
    bestFor: 'dark backgrounds, branding with text'
  }
} as const

/**
 * All available logo URLs as an array
 */
export const ALL_LOGO_URLS = Object.values(LOGOS)

/**
 * Default logo (black variant)
 */
export const DEFAULT_LOGO = LOGOS.black
