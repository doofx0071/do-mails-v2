'use client'

import { useState, useMemo } from 'react'
import DOMPurify from 'dompurify'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface GmailEmailRendererProps {
  htmlContent?: string
  textContent?: string
  className?: string
  _onImageProxyError?: (src: string, error: Error) => void
  messageData?: {
    from: string
    to: string[]
    subject: string
    receivedAt: string
    isRead?: boolean
  }
}

type ViewMode = 'html' | 'text'

/**
 * Gmail-Style Email Renderer
 * Mimics Gmail's exact structure and styling patterns based on inspect element analysis
 */
export function GmailEmailRenderer({
  htmlContent,
  textContent,
  className,
  _onImageProxyError,
  messageData,
}: GmailEmailRendererProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('html')
  const [showImages, setShowImages] = useState(false)

  // DOMPurify configuration optimized for Gmail-like rendering
  const purifyConfig = useMemo(
    () => ({
      // Allow comprehensive HTML elements for Gmail-like email rendering
      ALLOWED_TAGS: [
        'div',
        'span',
        'p',
        'br',
        'hr',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'strong',
        'em',
        'i',
        'b',
        'u',
        'strike',
        'blockquote',
        'pre',
        'code',
        'ul',
        'ol',
        'li',
        'table',
        'thead',
        'tbody',
        'tr',
        'td',
        'th',
        'a',
        'img',
        'font',
        'center',
        'small',
        'big',
        'sub',
        'sup',
        'article',
        'section',
        'header',
        'footer',
        'main',
        'aside',
      ],
      ALLOWED_ATTR: [
        'id',
        'class',
        'style',
        'title',
        'lang',
        'dir',
        'href',
        'target',
        'rel',
        'src',
        'alt',
        'width',
        'height',
        'srcset',
        'sizes',
        'colspan',
        'rowspan',
        'cellpadding',
        'cellspacing',
        'border',
        'align',
        'valign',
        'bgcolor',
        'color',
        'face',
        'size',
        'role',
        'aria-label',
        'aria-hidden',
      ],
      RETURN_DOM: false,
      SAFE_FOR_TEMPLATES: true,
      WHOLE_DOCUMENT: false,
      KEEP_CONTENT: true,
    }),
    []
  )

  // Sanitize HTML content with Gmail-like image proxying
  const sanitizedHtml = useMemo(() => {
    if (!htmlContent) return ''

    try {
      let cleanHtml = DOMPurify.sanitize(htmlContent, purifyConfig)

      // Gmail-style image handling
      if (!showImages) {
        cleanHtml = cleanHtml.replace(
          /<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi,
          `<div class="gmail-image-blocked" style="
            display: inline-block; 
            padding: 12px 16px; 
            background: #f8f9fa; 
            border: 1px solid #dadce0; 
            border-radius: 8px;
            color: #5f6368;
            font-size: 14px;
            font-family: arial,sans-serif;
            margin: 8px 0;
            text-align: center;
            min-width: 200px;
          ">
            📷 Images are not displayed. <span style="color: #1a73e8; cursor: pointer;">Display images below</span>
          </div>`
        )
      } else {
        // Proxy images through our API (Gmail-style)
        cleanHtml = cleanHtml.replace(
          /<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi,
          (match, before, src, after) => {
            if (src.startsWith('data:') || src.startsWith('/api/proxy')) {
              return match
            }

            const proxiedSrc = `/api/proxy?url=${encodeURIComponent(src)}`
            return `<img${before}src="${proxiedSrc}"${after} style="max-width: 100%; height: auto; display: block;" />`
          }
        )
      }

      return cleanHtml
    } catch (error) {
      console.error('Gmail email sanitization error:', error)
      return '<div style="color: #d93025; padding: 16px;">Error rendering email content</div>'
    }
  }, [htmlContent, purifyConfig, showImages])

  // Render Gmail-style email content
  const renderGmailEmailContent = () => {
    if (viewMode === 'text') {
      return (
        <div
          className="gmail-text-content"
          style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            lineHeight: '1.4',
            padding: '16px',
            background: '#f8f9fa',
            borderRadius: '8px',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
          }}
        >
          {textContent || 'No text content available'}
        </div>
      )
    }

    if (!sanitizedHtml) {
      return (
        <div
          className="gmail-empty-content"
          style={{
            padding: '32px',
            textAlign: 'center',
            color: '#5f6368',
            fontSize: '14px',
            fontFamily: 'arial,sans-serif',
          }}
        >
          {textContent ? (
            <>
              No HTML content available.{' '}
              <Button
                variant="link"
                size="sm"
                onClick={() => setViewMode('text')}
              >
                View text version
              </Button>
            </>
          ) : (
            'No email content found'
          )}
        </div>
      )
    }

    return (
      <div
        className={cn(
          'ii gt gmail-message-container bg-background text-foreground'
        )}
      >
        {/* Gmail-style email body content */}
        <div
          className="a3s aiL gmail-email-body"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          style={{
            // Gmail's email content styling
            fontFamily: 'arial,sans-serif',
            fontSize: '14px',
            lineHeight: '1.4',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            maxWidth: '100%',
            overflow: 'hidden',
            contain: 'layout style',
            // Gmail email content spacing
            padding: '0',
            margin: '0',
          }}
        />
      </div>
    )
  }

  return (
    <div className={cn('gmail-email-renderer', className)}>
      {/* Gmail-style controls */}
      <div className="border-b bg-muted/30">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center space-x-2">
            {/* View mode toggle */}
            <div className="flex rounded border bg-background">
              <Button
                variant={viewMode === 'html' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('html')}
                disabled={!htmlContent}
                className="h-8 rounded-r-none px-3 text-xs"
              >
                HTML
              </Button>
              <Button
                variant={viewMode === 'text' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('text')}
                disabled={!textContent}
                className="h-8 rounded-l-none border-l px-3 text-xs"
              >
                Text
              </Button>
            </div>
          </div>
          {messageData?.receivedAt && (
            <div className="text-xs text-muted-foreground">
              {format(new Date(messageData.receivedAt), 'MMM d, yyyy h:mm a')}
            </div>
          )}
        </div>
      </div>

      {/* Gmail-style email content area */}
      <div
        className="gmail-content-area"
        onClick={(e) => {
          const target = e.target as HTMLElement
          if (target && target.closest('.gmail-image-blocked')) {
            setShowImages(true)
          }
        }}
        style={{
          minHeight: '200px',
        }}
      >
        {renderGmailEmailContent()}
      </div>

      {/* Privacy notice */}
      <div
        className="gmail-privacy-notice"
        style={{
          fontSize: '11px',
          color: '#5f6368',
          padding: '8px 0',
          textAlign: 'center',
        }}
      >
        Content sanitized for security • Images proxied for privacy
      </div>
    </div>
  )
}

export default GmailEmailRenderer
