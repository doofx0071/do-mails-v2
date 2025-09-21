'use client'

import { EmailHtmlRenderer } from '@/components/mail/email-html-renderer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

// Sample HTML email content for testing
const sampleEmailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        .email-container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: white; }
        .button { background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
        .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
        .table th { background: #f9fafb; font-weight: bold; }
        .highlight { background: #fef3c7; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>🎉 Welcome to do-Mails!</h1>
            <p>Your privacy-focused email alias system</p>
        </div>
        
        <div class="content">
            <h2>Hello there! 👋</h2>
            <p>Thank you for joining <strong>do-Mails</strong>, the most advanced email alias management system. This email demonstrates our new Gmail-like HTML rendering capabilities.</p>
            
            <div class="highlight">
                <h3>🔒 Privacy First</h3>
                <p>All images are proxied for your privacy, and HTML content is safely sanitized using DOMPurify.</p>
            </div>
            
            <h3>📊 Your Account Summary</h3>
            <table class="table">
                <thead>
                    <tr>
                        <th>Feature</th>
                        <th>Status</th>
                        <th>Limit</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Email Aliases</td>
                        <td>✅ Active</td>
                        <td>Unlimited</td>
                    </tr>
                    <tr>
                        <td>Custom Domains</td>
                        <td>✅ Active</td>
                        <td>10 domains</td>
                    </tr>
                    <tr>
                        <td>Email Threading</td>
                        <td>✅ Active</td>
                        <td>Unlimited</td>
                    </tr>
                    <tr>
                        <td>Dark Mode Support</td>
                        <td>✅ Active</td>
                        <td>Auto-detection</td>
                    </tr>
                </tbody>
            </table>
            
            <h3>🎨 Rich Content Support</h3>
            <p>Our new email renderer supports:</p>
            <ul>
                <li><strong>Bold text</strong> and <em>italic formatting</em></li>
                <li>🌈 <span style="color: #10b981;">Colored text</span> and backgrounds</li>
                <li>📱 Responsive images and tables</li>
                <li>🔗 <a href="https://example.com" style="color: #3b82f6;">Safe external links</a></li>
                <li>💻 <code>Code snippets</code> and preformatted text</li>
            </ul>
            
            <blockquote style="border-left: 4px solid #d1d5db; padding-left: 16px; margin: 20px 0; font-style: italic; color: #6b7280;">
                "Privacy is not something that I'm merely entitled to, it's an absolute prerequisite." - Marlon Brando
            </blockquote>
            
            <a href="#" class="button">Get Started with do-Mails</a>
            
            <h3>🖼️ Image Handling</h3>
            <p>Images are blocked by default for privacy protection, but you can enable them safely:</p>
            <img src="https://via.placeholder.com/400x200/4f46e5/ffffff?text=Sample+Email+Image" alt="Sample image" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0;" />
            
            <p><small>📷 The above image demonstrates our privacy-first image proxy system.</small></p>
        </div>
        
        <div class="footer">
            <p>This email was sent with ❤️ by do-Mails</p>
            <p>Made with Next.js 14, TypeScript, Supabase, and Mailgun</p>
            <p>
                <a href="#" style="color: #6b7280;">Unsubscribe</a> | 
                <a href="#" style="color: #6b7280;">Privacy Policy</a> | 
                <a href="#" style="color: #6b7280;">Support</a>
            </p>
        </div>
    </div>
</body>
</html>
`

const sampleTextEmail = `Hello there! 👋

Thank you for joining do-Mails, the most advanced email alias management system. This is the plain text version of our welcome email.

🔒 PRIVACY FIRST
All images are proxied for your privacy, and HTML content is safely sanitized using DOMPurify.

📊 YOUR ACCOUNT SUMMARY
- Email Aliases: ✅ Active (Unlimited)
- Custom Domains: ✅ Active (10 domains)  
- Email Threading: ✅ Active (Unlimited)
- Dark Mode Support: ✅ Active (Auto-detection)

🎨 RICH CONTENT SUPPORT
Our new email renderer supports:
• Bold text and italic formatting
• 🌈 Colored text and backgrounds
• 📱 Responsive images and tables
• 🔗 Safe external links
• 💻 Code snippets and preformatted text

"Privacy is not something that I'm merely entitled to, it's an absolute prerequisite." - Marlon Brando

[Get Started with do-Mails]

🖼️ IMAGE HANDLING
Images are blocked by default for privacy protection, but you can enable them safely.

This email was sent with ❤️ by do-Mails
Made with Next.js 14, TypeScript, Supabase, and Mailgun

Unsubscribe | Privacy Policy | Support`

export default function EmailTestPage() {
  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">📧 Email HTML Renderer Test</h1>
        <p className="text-xl text-muted-foreground">
          Testing the new Gmail-like email rendering with DOMPurify sanitization
        </p>
      </div>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>🎉 Welcome Email - Rich HTML Content</CardTitle>
            <CardDescription>
              Demonstrates HTML email rendering with privacy protection, image proxying, 
              and dark mode support. All content is safely sanitized using DOMPurify.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmailHtmlRenderer 
              htmlContent={sampleEmailHtml}
              textContent={sampleTextEmail}
              className="border rounded-lg"
            />
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle>🔧 Features Overview</CardTitle>
            <CardDescription>
              What makes our email renderer special
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold">🛡️ Security Features</h3>
                <ul className="space-y-2 text-sm">
                  <li>✅ DOMPurify HTML sanitization</li>
                  <li>✅ XSS attack prevention</li>
                  <li>✅ Malicious script removal</li>
                  <li>✅ Safe CSS style isolation</li>
                  <li>✅ External link protection</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold">🎨 Display Features</h3>
                <ul className="space-y-2 text-sm">
                  <li>✅ HTML/Text view toggle</li>
                  <li>✅ Original/Light/Dark modes</li>
                  <li>✅ Image privacy protection</li>
                  <li>✅ Responsive design</li>
                  <li>✅ Gmail-like interface</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold">🔒 Privacy Features</h3>
                <ul className="space-y-2 text-sm">
                  <li>✅ Image proxy for tracking protection</li>
                  <li>✅ Blocked tracking pixels</li>
                  <li>✅ No external resource leaks</li>
                  <li>✅ Safe URL handling</li>
                  <li>✅ Content sanitization</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold">⚡ Performance Features</h3>
                <ul className="space-y-2 text-sm">
                  <li>✅ Efficient HTML processing</li>
                  <li>✅ Minimal re-renders</li>
                  <li>✅ CSS containment</li>
                  <li>✅ Lazy image loading</li>
                  <li>✅ Mobile-optimized</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🚀 Implementation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm space-y-3">
              <div>
                <h4 className="font-semibold mb-2">📝 What was implemented:</h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><code>EmailHtmlRenderer</code> component with advanced sanitization</li>
                  <li><code>/api/proxy</code> route for safe image proxying</li>
                  <li>Enhanced <code>email-sanitizer.ts</code> using DOMPurify</li>
                  <li>Updated <code>mail-display.tsx</code> to use new renderer</li>
                  <li>Added email-specific CSS for proper styling isolation</li>
                  <li>Dark mode support with proper theme detection</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">🔧 Technical stack:</h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>DOMPurify</strong> - HTML sanitization and XSS prevention</li>
                  <li><strong>shadcn/ui</strong> - UI components with accessibility</li>
                  <li><strong>Tailwind CSS</strong> - Responsive styling with dark mode</li>
                  <li><strong>Next.js API Routes</strong> - Image proxy server</li>
                  <li><strong>TypeScript</strong> - Type safety and better DX</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">🌟 Key benefits:</h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Gmail-like email rendering experience</li>
                  <li>Superior privacy protection vs basic sanitization</li>
                  <li>Automatic dark mode email adaptation</li>
                  <li>No layout breaking from email CSS</li>
                  <li>Professional email display for business use</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}