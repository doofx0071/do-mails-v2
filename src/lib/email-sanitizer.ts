/**
 * Email HTML sanitizer to prevent style leakage and security issues
 */

/**
 * Sanitize HTML email content by removing dangerous elements
 * that could affect the main application styling or security
 */
export function sanitizeEmailHtml(html: string): string {
  if (!html) return html

  let sanitized = html

  // Remove <style> tags and their content (prevents CSS leakage)
  sanitized = sanitized.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')

  // Remove <script> tags and their content (security)
  sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')

  // Remove <link> tags that could load external stylesheets
  sanitized = sanitized.replace(/<link[^>]*>/gi, '')

  // Remove dangerous event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '')

  // Remove data: URLs that could contain scripts
  sanitized = sanitized.replace(/data:text\/html/gi, 'data:text/plain')

  // Remove <meta> tags that could affect viewport or other settings
  sanitized = sanitized.replace(/<meta[^>]*>/gi, '')

  // Remove <base> tags that could affect relative URLs
  sanitized = sanitized.replace(/<base[^>]*>/gi, '')

  // Remove <object>, <embed>, <iframe> tags for security
  sanitized = sanitized.replace(
    /<(object|embed|iframe)[^>]*>[\s\S]*?<\/\1>/gi,
    ''
  )
  sanitized = sanitized.replace(/<(object|embed|iframe)[^>]*\/>/gi, '')

  // Remove <form> tags to prevent form submissions
  sanitized = sanitized.replace(/<\/?form[^>]*>/gi, '')

  // Remove dangerous CSS properties via style attributes
  sanitized = sanitized.replace(
    /style\s*=\s*["'][^"']*position\s*:\s*fixed[^"']*["']/gi,
    ''
  )
  sanitized = sanitized.replace(
    /style\s*=\s*["'][^"']*position\s*:\s*absolute[^"']*["']/gi,
    ''
  )
  sanitized = sanitized.replace(/style\s*=\s*["'][^"']*z-index[^"']*["']/gi, '')

  // Remove background colors that might cause visual issues
  sanitized = sanitized.replace(
    /style\s*=\s*["'][^"']*background[^"']*["']/gi,
    ''
  )
  sanitized = sanitized.replace(/style\s*=\s*["'][^"']*purple[^"']*["']/gi, '')
  sanitized = sanitized.replace(/style\s*=\s*["'][^"']*violet[^"']*["']/gi, '')

  // Remove transform and positioning that could cause overlays
  sanitized = sanitized.replace(
    /style\s*=\s*["'][^"']*transform[^"']*["']/gi,
    ''
  )
  sanitized = sanitized.replace(/style\s*=\s*["'][^"']*float[^"']*["']/gi, '')
  sanitized = sanitized.replace(
    /style\s*=\s*["'][^"']*overflow[^"']*["']/gi,
    ''
  )

  // As a final safety measure, remove ALL style attributes to prevent any CSS leakage
  // This is aggressive but ensures no styling issues
  sanitized = sanitized.replace(/\s*style\s*=\s*["'][^"']*["']/gi, '')

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
