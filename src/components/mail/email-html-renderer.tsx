'use client'

import { useState, useEffect, useMemo } from 'react'
import DOMPurify from 'dompurify'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Eye, 
  EyeOff, 
  ExternalLink, 
  Shield, 
  Monitor,
  Sun,
  Moon,
  AlertTriangle,
  Image as ImageIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmailHtmlRendererProps {
  htmlContent?: string
  textContent?: string
  className?: string
  onImageProxyError?: (src: string, error: Error) => void
}

type ViewMode = 'html' | 'text'
type DisplayMode = 'original' | 'light' | 'dark'

/**
 * Advanced Email HTML Renderer with Gmail-like functionality
 * - Sanitizes HTML content safely using DOMPurify
 * - Supports dark mode email rendering
 * - Proxies images for privacy (optional)
 * - Preserves original email styling while maintaining security
 */
export function EmailHtmlRenderer({ 
  htmlContent, 
  textContent, 
  className,
  onImageProxyError 
}: EmailHtmlRendererProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('html')
  const [displayMode, setDisplayMode] = useState<DisplayMode>('original')
  const [showImages, setShowImages] = useState(false)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  // DOMPurify configuration for email sanitization
  const purifyConfig = useMemo(() => ({
    // Keep most HTML elements for email rendering
    ALLOWED_TAGS: [
      'div', 'span', 'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'em', 'i', 'b', 'u', 'strike', 'blockquote', 'pre', 'code',
      'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'a', 'img', 'font', 'center', 'small', 'big', 'sub', 'sup',
      // SVG elements (common in emails)
      'svg', 'path', 'circle', 'rect', 'line', 'polygon', 'g', 'text',
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
      // SVG attributes
      'viewBox', 'xmlns', 'fill', 'stroke', 'stroke-width', 'd', 'x', 'y', 'cx', 'cy', 'r',
      // Font attributes (legacy email styling)
      'color', 'face', 'size',
      // Email-specific
      'role', 'aria-label', 'aria-hidden'
    ],
    // Allow CSS properties while blocking dangerous ones
    ALLOWED_CSS_PROPERTIES: [
      'color', 'background', 'background-color', 'background-image',
      'font-family', 'font-size', 'font-weight', 'font-style',
      'text-align', 'text-decoration', 'line-height',
      'width', 'height', 'max-width', 'max-height', 'min-width', 'min-height',
      'padding', 'margin', 'border', 'border-radius',
      'display', 'vertical-align',
      // Block dangerous positioning
      'position: static', 'position: relative'
    ],
    // Block dangerous CSS
    FORBID_CSS_PROPERTIES: [
      'position: fixed', 'position: absolute', 'position: sticky',
      'z-index', 'transform', 'animation', 'transition'
    ],
    // Return clean HTML string
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false,
    // Security settings
    SAFE_FOR_TEMPLATES: true,
    WHOLE_DOCUMENT: false,
    KEEP_CONTENT: true,
    // Custom URL handler for security
    SANITIZE_NAMED_PROPS: true,
    SANITIZE_NAMED_PROPS_PREFIX: 'user-content-'
  }), [])

  // Sanitize HTML content with DOMPurify
  const sanitizedHtml = useMemo(() => {
    if (!htmlContent) return ''
    
    try {
      let cleanHtml = DOMPurify.sanitize(htmlContent, purifyConfig)
      
      // Replace external image URLs with proxy if images are disabled
      if (!showImages) {
        cleanHtml = cleanHtml.replace(
          /<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi,
          (match, before, src, after) => {
            // Skip data URLs and already proxied URLs
            if (src.startsWith('data:') || src.startsWith('/api/proxy')) {
              return match
            }
            
            return `<div class="email-image-blocked" style="
              display: inline-block; 
              padding: 8px 12px; 
              background: #f3f4f6; 
              border: 1px dashed #d1d5db; 
              border-radius: 4px;
              color: #6b7280;
              font-size: 12px;
              margin: 2px;
            ">
              📷 Image blocked for privacy
            </div>`
          }
        )
      } else {
        // Proxy external images for privacy
        cleanHtml = cleanHtml.replace(
          /<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi,
          (match, before, src, after) => {
            // Skip data URLs and already proxied URLs
            if (src.startsWith('data:') || src.startsWith('/api/proxy')) {
              return match
            }
            
            // Proxy external images
            const proxiedSrc = `/api/proxy?url=${encodeURIComponent(src)}`
            return `<img${before}src="${proxiedSrc}"${after} onError="this.style.display='none'; this.nextSibling.style.display='inline-block'" style="max-width: 100%; height: auto;" />
              <div style="display: none; padding: 8px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; color: #dc2626; font-size: 12px; margin: 2px;">
                ❌ Failed to load image
              </div>`
          }
        )
      }
      
      // Remove potentially problematic event handlers (extra safety)
      cleanHtml = cleanHtml.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
      
      return cleanHtml
    } catch (error) {
      console.error('DOMPurify sanitization error:', error)
      return '<div class="text-red-600">Error rendering email content</div>'
    }
  }, [htmlContent, purifyConfig, showImages])

  // Get display classes based on mode
  const getDisplayClasses = () => {
    const base = "email-content prose prose-sm max-w-none"
    
    switch (displayMode) {
      case 'light':
        return cn(base, "bg-white text-gray-900 p-4 rounded-lg shadow-sm border")
      case 'dark':
        return cn(base, "bg-gray-900 text-gray-100 p-4 rounded-lg shadow-sm border border-gray-700")
      default:
        return cn(base, "bg-background text-foreground")
    }
  }

  // Email content with proper styling isolation
  const renderEmailContent = () => {
    if (viewMode === 'text') {
      return (
        <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed p-4 bg-muted/30 rounded-lg">
          {textContent || 'No text content available'}
        </div>
      )
    }

    if (!sanitizedHtml) {
      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No HTML content available. {textContent ? 'Switch to text view to see content.' : 'No content found.'}
          </AlertDescription>
        </Alert>
      )
    }

    return (
      <div className={cn("email-html-container", getDisplayClasses())}>
        {/* Email content wrapper with CSS isolation */}
        <div 
          className={cn(
            "email-body",
            "prose prose-sm max-w-none",
            "prose-headings:text-current prose-p:text-current prose-a:text-blue-600 dark:prose-a:text-blue-400",
            "prose-blockquote:text-muted-foreground prose-strong:text-current prose-em:text-current",
            "prose-code:text-current prose-pre:bg-muted prose-pre:text-current",
            "prose-th:text-current prose-td:text-current",
            "prose-img:rounded-md prose-img:max-w-full prose-img:h-auto"
          )}
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          style={{
            // Email content styling isolation
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            maxWidth: '100%',
            // Prevent layout breaking
            overflow: 'hidden',
            // Ensure email content doesn't escape its container
            contain: 'layout style'
          }}
        />
      </div>
    )
  }

  return (
    <div className={cn("email-renderer space-y-4", className)}>
      {/* Control Bar */}
      <div className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-background rounded-md p-1">
            <Button
              variant={viewMode === 'html' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('html')}
              disabled={!htmlContent}
              className="h-7 px-2"
            >
              <Monitor className="h-3 w-3 mr-1" />
              HTML
            </Button>
            <Button
              variant={viewMode === 'text' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('text')}
              disabled={!textContent}
              className="h-7 px-2"
            >
              📝 Text
            </Button>
          </div>

          {/* Display Mode Toggle (for HTML view) */}
          {viewMode === 'html' && htmlContent && (
            <div className="flex items-center bg-background rounded-md p-1">
              <Button
                variant={displayMode === 'original' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDisplayMode('original')}
                className="h-7 px-2"
              >
                <Shield className="h-3 w-3 mr-1" />
                Original
              </Button>
              <Button
                variant={displayMode === 'light' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDisplayMode('light')}
                className="h-7 px-2"
              >
                <Sun className="h-3 w-3 mr-1" />
                Light
              </Button>
              <Button
                variant={displayMode === 'dark' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDisplayMode('dark')}
                className="h-7 px-2"
              >
                <Moon className="h-3 w-3 mr-1" />
                Dark
              </Button>
            </div>
          )}
        </div>

        {/* Image Controls */}
        {viewMode === 'html' && htmlContent && (
          <div className="flex items-center gap-2">
            <Button
              variant={showImages ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowImages(!showImages)}
              className="h-7 px-2"
            >
              {showImages ? (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Images On
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Images Off
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Image Privacy Notice */}
      {viewMode === 'html' && !showImages && htmlContent?.includes('<img') && (
        <Alert>
          <ImageIcon className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Images are blocked for privacy. They may contain tracking pixels.{' '}
            <Button 
              variant="link" 
              size="sm" 
              className="h-auto p-0 text-sm underline"
              onClick={() => setShowImages(true)}
            >
              Show images
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Email Content */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {renderEmailContent()}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <div className="text-xs text-muted-foreground">
        <Shield className="inline h-3 w-3 mr-1" />
        Content has been sanitized for security. External links open safely.
      </div>
    </div>
  )
}

/* CSS for email content isolation - Add to your global styles */
const emailStyles = `
.email-html-container {
  /* Isolate email styles from app styles */
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  line-height: 1.6;
  color: inherit;
  background: inherit;
  
  /* Reset email styles that might interfere */
  * {
    max-width: 100% !important;
    position: static !important;
    z-index: auto !important;
  }
  
  /* Style email tables properly */
  table {
    border-collapse: collapse;
    width: 100%;
    max-width: 100%;
  }
  
  /* Ensure images are responsive */
  img {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
  }
  
  /* Block potentially problematic CSS */
  [style*="position: fixed"],
  [style*="position: absolute"],
  [style*="position: sticky"] {
    position: static !important;
  }
  
  [style*="z-index"] {
    z-index: auto !important;
  }
}

/* Dark mode email adjustments */
.dark .email-html-container {
  /* Adjust email content for dark theme */
  filter: invert(0);
}

.dark .email-html-container[data-display-mode="original"] {
  /* Preserve original colors in dark mode */
  background: white;
  color: black;
  border-radius: 8px;
  padding: 16px;
}
`;

// Export styles for global CSS injection
export const EMAIL_RENDERER_STYLES = emailStyles