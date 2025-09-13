import { sanitizeEmailHtml, extractTextFromHtml, generateEmailPreview } from '../email-sanitizer'

describe('Email Sanitizer', () => {
  describe('sanitizeEmailHtml', () => {
    it('should remove style tags', () => {
      const html = '<div><style>body { color: red; }</style><p>Content</p></div>'
      const result = sanitizeEmailHtml(html)
      expect(result).not.toContain('<style>')
      expect(result).not.toContain('color: red')
      expect(result).toContain('<p>Content</p>')
    })

    it('should remove script tags', () => {
      const html = '<div><script>alert("xss")</script><p>Content</p></div>'
      const result = sanitizeEmailHtml(html)
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('alert')
      expect(result).toContain('<p>Content</p>')
    })

    it('should remove dangerous event handlers', () => {
      const html = '<p onclick="alert(\'xss\')" onload="hack()">Content</p>'
      const result = sanitizeEmailHtml(html)
      expect(result).not.toContain('onclick')
      expect(result).not.toContain('onload')
      expect(result).toContain('Content')
    })

    it('should remove javascript URLs', () => {
      const html = '<a href="javascript:alert(\'xss\')">Link</a>'
      const result = sanitizeEmailHtml(html)
      expect(result).not.toContain('javascript:')
      expect(result).toContain('Link')
    })

    it('should remove link tags', () => {
      const html = '<link rel="stylesheet" href="evil.css"><p>Content</p>'
      const result = sanitizeEmailHtml(html)
      expect(result).not.toContain('<link')
      expect(result).toContain('<p>Content</p>')
    })

    it('should remove meta tags', () => {
      const html = '<meta charset="utf-8"><p>Content</p>'
      const result = sanitizeEmailHtml(html)
      expect(result).not.toContain('<meta')
      expect(result).toContain('<p>Content</p>')
    })

    it('should remove form tags', () => {
      const html = '<form action="/hack"><input type="text"></form><p>Content</p>'
      const result = sanitizeEmailHtml(html)
      expect(result).not.toContain('<form')
      expect(result).not.toContain('</form>')
      expect(result).toContain('<p>Content</p>')
    })

    it('should preserve safe HTML elements', () => {
      const html = '<div><p><strong>Bold</strong> and <em>italic</em> text</p><img src="image.jpg" alt="Image"></div>'
      const result = sanitizeEmailHtml(html)
      expect(result).toContain('<div>')
      expect(result).toContain('<p>')
      expect(result).toContain('<strong>Bold</strong>')
      expect(result).toContain('<em>italic</em>')
      expect(result).toContain('<img')
    })

    it('should handle empty or null input', () => {
      expect(sanitizeEmailHtml('')).toBe('')
      expect(sanitizeEmailHtml(null as any)).toBe(null)
      expect(sanitizeEmailHtml(undefined as any)).toBe(undefined)
    })
  })

  describe('extractTextFromHtml', () => {
    it('should extract plain text from HTML', () => {
      const html = '<p>Hello <strong>world</strong>!</p>'
      const result = extractTextFromHtml(html)
      expect(result).toBe('Hello world!')
    })

    it('should decode HTML entities', () => {
      const html = '<p>Hello &amp; goodbye &lt;test&gt;</p>'
      const result = extractTextFromHtml(html)
      expect(result).toBe('Hello & goodbye <test>')
    })

    it('should normalize whitespace', () => {
      const html = '<p>Hello   \n\n  world</p>'
      const result = extractTextFromHtml(html)
      expect(result).toBe('Hello world')
    })
  })

  describe('generateEmailPreview', () => {
    it('should use body_text when available', () => {
      const result = generateEmailPreview('Plain text content', '<p>HTML content</p>')
      expect(result).toBe('Plain text content')
    })

    it('should extract from body_html when body_text is not available', () => {
      const result = generateEmailPreview(undefined, '<p>HTML content</p>')
      expect(result).toBe('HTML content')
    })

    it('should truncate long content', () => {
      const longText = 'a'.repeat(200)
      const result = generateEmailPreview(longText, undefined, 50)
      expect(result).toHaveLength(50)
      expect(result).toEndWith('...')
    })

    it('should return "No content" when both are empty', () => {
      const result = generateEmailPreview(undefined, undefined)
      expect(result).toBe('No content')
    })
  })
})
