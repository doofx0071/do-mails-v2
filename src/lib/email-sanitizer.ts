/**
 * Email HTML sanitizer to prevent style leakage and security issues
 * Now uses DOMPurify for better security and compatibility
 */

import DOMPurify from 'dompurify'

/**
 * Configuration for DOMPurify email sanitization
 */
const EMAIL_PURIFY_CONFIG = {
  // Allow most HTML elements for email rendering
  ALLOWED_TAGS: [
    'div', 'span', 'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'em', 'i', 'b', 'u', 'strike', 'blockquote', 'pre', 'code',
    'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'a', 'img', 'font', 'center', 'small', 'big', 'sub', 'sup',
    // Common email elements
    'article', 'section', 'header', 'footer', 'main', 'aside'
  ],
  ALLOWED_ATTR: [
    // Standard attributes
    'id', 'class', 'style', 'title', 'lang', 'dir',
    // Link attributes
    'href', 'target', 'rel',
    // Image attributes
    'src', 'alt', 'width', 'height', 'srcset', 'sizes',
    // Table attributes
    'colspan', 'rowspan', 'cellpadding', 'cellspacing', 'border',
    'align', 'valign', 'bgcolor',
    // Font attributes (legacy email styling)
    'color', 'face', 'size',
    // Email-specific
    'role', 'aria-label', 'aria-hidden'
  ],
  // Security settings
  SAFE_FOR_TEMPLATES: true,
  WHOLE_DOCUMENT: false,
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_TRUSTED_TYPE: false,
  // Custom hooks for additional security
  SANITIZE_DOM: true,
  // Add hooks to clean up dangerous CSS
  ADD_ATTR: [],
  FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover'],
  FORBID_TAGS: ['script', 'style', 'link', 'meta', 'object', 'embed', 'iframe', 'form', 'input', 'textarea', 'button', 'select']
}

/**
 * Sanitize HTML email content using DOMPurify for better security
 */
export function sanitizeEmailHtml(html: string): string {
  if (!html) return html

  try {
    // First pass: Use DOMPurify for comprehensive sanitization
    let sanitized = DOMPurify.sanitize(html, EMAIL_PURIFY_CONFIG)

    // Second pass: Additional custom cleaning for email-specific issues
    
    // Remove dangerous positioning and layout properties
    sanitized = sanitized.replace(
      /style\s*=\s*["'][^"']*position\s*:\s*(fixed|absolute|sticky)[^"']*["']/gi,
      (match) => match.replace(/(fixed|absolute|sticky)/, 'static')
    )
    
    // Remove z-index that could cause overlay issues
    sanitized = sanitized.replace(
      /style\s*=\s*["'][^"']*z-index\s*:[^"']*["']/gi,
      (match) => match.replace(/z-index\s*:[^;"']+/gi, '')
    )
    
    // Remove transform properties that could cause layout issues
    sanitized = sanitized.replace(
      /style\s*=\s*["'][^"']*transform\s*:[^"']*["']/gi,
      (match) => match.replace(/transform\s*:[^;"']+/gi, '')
    )
    
    // Limit image dimensions to prevent layout breaking
    sanitized = sanitized.replace(
      /<img([^>]*?)>/gi,
      (match, attrs) => {
        // Add max-width constraint if not present
        if (!attrs.includes('style=') || !attrs.includes('max-width')) {
          const style = attrs.includes('style=')
            ? attrs.replace(/style\s*=\s*["']([^"']*)["']/, 'style="$1; max-width: 100%; height: auto;"')
            : attrs + ' style="max-width: 100%; height: auto;"'
          return `<img${style}>`
        }
        return match
      }
    )
    
    // Remove any remaining dangerous event handlers (extra safety)
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    
    // Remove javascript: URLs
    sanitized = sanitized.replace(/javascript:/gi, '')
    
    // Remove data: URLs that could contain scripts
    sanitized = sanitized.replace(/data:text\/html/gi, 'data:text/plain')
    
    return sanitized
  } catch (error) {
    console.error('DOMPurify sanitization failed:', error)
    // Fallback to basic sanitization if DOMPurify fails
    return sanitizeEmailHtmlFallback(html)
  }
}

/**
 * Fallback sanitization if DOMPurify fails
 */
function sanitizeEmailHtmlFallback(html: string): string {
  if (!html) return html

  let sanitized = html

  // Remove dangerous tags
  sanitized = sanitized.replace(/<(script|style|link|meta|object|embed|iframe|form)[^>]*>[\s\S]*?<\/\1>/gi, '')
  sanitized = sanitized.replace(/<(script|style|link|meta|object|embed|iframe|form|input|textarea|button|select)[^>]*\/?>/gi, '')

  // Remove dangerous event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '')

  // Remove dangerous CSS properties
  sanitized = sanitized.replace(
    /style\s*=\s*["'][^"']*position\s*:\s*(fixed|absolute)[^"']*["']/gi,
    ''
  )
  sanitized = sanitized.replace(/style\s*=\s*["'][^"']*z-index[^"']*["']/gi, '')
  sanitized = sanitized.replace(
    /style\s*=\s*["'][^"']*transform[^"']*["']/gi,
    ''
  )

  return sanitized
}

/**
 * Extract plain text from HTML for preview purposes
 */
export function extractTextFromHtml(html: string): string {
  if (!html) return ''

  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'") // Replace &#39; with '
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Generate email preview text
 */
export function generateEmailPreview(
  bodyText?: string,
  bodyHtml?: string,
  maxLength: number = 150
): string {
  let text = bodyText

  if (!text && bodyHtml) {
    text = extractTextFromHtml(bodyHtml)
  }

  if (!text) {
    return 'No content'
  }

  if (text.length <= maxLength) {
    return text
  }

  return text.substring(0, maxLength - 3) + '...'
}
