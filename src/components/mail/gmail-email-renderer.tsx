'use client'

import { useState, useMemo } from 'react'
import DOMPurify from 'dompurify'
import { Button } from '@/components/ui/button'
import { 
  Eye, 
  EyeOff, 
  Shield, 
  Sun,
  Moon,
  Reply,
  Forward,
  MoreHorizontal
} from 'lucide-react'
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
  onReply?: () => void
  onForward?: () => void
}

type ViewMode = 'html' | 'text'
type DisplayMode = 'original' | 'light' | 'dark'

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
  onReply,
  onForward
}: GmailEmailRendererProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('html')
  const [displayMode, setDisplayMode] = useState<DisplayMode>('original')
  const [showImages, setShowImages] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // DOMPurify configuration optimized for Gmail-like rendering
  const purifyConfig = useMemo(() => ({
    // Allow comprehensive HTML elements for Gmail-like email rendering
    ALLOWED_TAGS: [
      'div', 'span', 'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'strong', 'em', 'i', 'b', 'u', 'strike', 'blockquote', 'pre', 'code',
      'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'a', 'img', 'font', 'center', 'small', 'big', 'sub', 'sup',
      'article', 'section', 'header', 'footer', 'main', 'aside'
    ],
    ALLOWED_ATTR: [
      'id', 'class', 'style', 'title', 'lang', 'dir',
      'href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'srcset', 'sizes',
      'colspan', 'rowspan', 'cellpadding', 'cellspacing', 'border',
      'align', 'valign', 'bgcolor', 'color', 'face', 'size',
      'role', 'aria-label', 'aria-hidden'
    ],
    RETURN_DOM: false,
    SAFE_FOR_TEMPLATES: true,
    WHOLE_DOCUMENT: false,
    KEEP_CONTENT: true,
  }), [])

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

  // Gmail-like display mode styling
  const getGmailDisplayClasses = () => {
    switch (displayMode) {
      case 'light':
        return 'bg-white text-gray-900 border border-gray-200'
      case 'dark':
        return 'bg-gray-900 text-gray-100 border border-gray-700'
      default:
        return 'bg-background text-foreground'
    }
  }

  // Render Gmail-style email content
  const renderGmailEmailContent = () => {
    if (viewMode === 'text') {
      return (
        <div className="gmail-text-content" style={{
          fontFamily: 'monospace',
          fontSize: '13px',
          lineHeight: '1.4',
          padding: '16px',
          background: '#f8f9fa',
          borderRadius: '8px',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word'
        }}>
          {textContent || 'No text content available'}
        </div>
      )
    }

    if (!sanitizedHtml) {
      return (
        <div className="gmail-empty-content" style={{
          padding: '32px',
          textAlign: 'center',
          color: '#5f6368',
          fontSize: '14px',
          fontFamily: 'arial,sans-serif'
        }}>
          {textContent ? (
            <>No HTML content available. <Button variant="link" size="sm" onClick={() => setViewMode('text')}>View text version</Button></>
          ) : (
            'No email content found'
          )}
        </div>
      )
    }

    return (
      <div className={cn('ii gt gmail-message-container', getGmailDisplayClasses())}>
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
            margin: '0'
          }}
        />
      </div>
    )
  }

  return (
    <div className={cn('gmail-email-renderer', className)}>
      {/* Gmail-style message header */}
      {messageData && (
        <div className="gmail-message-header" style={{
          fontFamily: 'arial,sans-serif',
          borderBottom: '1px solid #e8eaed',
          padding: '12px 0'
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Sender avatar placeholder */}
              <div className="gmail-avatar" style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#34a853',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {messageData.from.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="gmail-sender" style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#202124'
                }}>
                  {messageData.from}
                </div>
                <div className="gmail-recipients" style={{
                  fontSize: '13px',
                  color: '#5f6368'
                }}>
                  to {messageData.to.join(', ')}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="gmail-timestamp" style={{
                fontSize: '12px',
                color: '#5f6368'
              }}>
                {messageData.receivedAt && format(new Date(messageData.receivedAt), 'MMM d, yyyy, h:mm a')}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Gmail-style controls */}
      <div className="gmail-controls" style={{
        padding: '8px 0',
        borderBottom: '1px solid #e8eaed',
        background: '#f8f9fa'
      }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* View mode toggle */}
            <div className="flex bg-white rounded border">
              <Button
                variant={viewMode === 'html' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('html')}
                disabled={!htmlContent}
                className="h-8 px-3 text-xs rounded-r-none"
              >
                HTML
              </Button>
              <Button
                variant={viewMode === 'text' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('text')}
                disabled={!textContent}
                className="h-8 px-3 text-xs rounded-l-none border-l"
              >
                Text
              </Button>
            </div>

            {/* Display mode */}
            {viewMode === 'html' && htmlContent && (
              <div className="flex bg-white rounded border">
                <Button
                  variant={displayMode === 'original' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDisplayMode('original')}
                  className="h-8 px-2 text-xs rounded-r-none"
                >
                  <Shield className="h-3 w-3 mr-1" />
                  Original
                </Button>
                <Button
                  variant={displayMode === 'light' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDisplayMode('light')}
                  className="h-8 px-2 text-xs rounded-none border-l"
                >
                  <Sun className="h-3 w-3 mr-1" />
                  Light
                </Button>
                <Button
                  variant={displayMode === 'dark' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDisplayMode('dark')}
                  className="h-8 px-2 text-xs rounded-l-none border-l"
                >
                  <Moon className="h-3 w-3 mr-1" />
                  Dark
                </Button>
              </div>
            )}
          </div>

          {/* Image controls */}
          {viewMode === 'html' && htmlContent && htmlContent.includes('<img') && (
            <Button
              variant={showImages ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowImages(!showImages)}
              className="h-8 px-3 text-xs"
            >
              {showImages ? (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Images shown
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Images blocked
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Gmail-style email content area */}
      <div className="gmail-content-area" style={{
        background: 'white',
        minHeight: '200px'
      }}>
        {renderGmailEmailContent()}
      </div>

      {/* Gmail-style action buttons */}
      <div className="gmail-actions" style={{
        padding: '16px 0',
        borderTop: '1px solid #e8eaed',
        background: '#f8f9fa'
      }}>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onReply}
            className="h-8 px-4 text-sm"
          >
            <Reply className="h-4 w-4 mr-2" />
            Reply
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onForward}
            className="h-8 px-4 text-sm"
          >
            <Forward className="h-4 w-4 mr-2" />
            Forward
          </Button>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="gmail-privacy-notice" style={{
        fontSize: '11px',
        color: '#5f6368',
        padding: '8px 0',
        textAlign: 'center'
      }}>
        <Shield className="inline h-3 w-3 mr-1" />
        Content sanitized for security • Images proxied for privacy
      </div>
    </div>
  )
}

export default GmailEmailRenderer