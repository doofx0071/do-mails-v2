import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/lib/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'do-Mails - Email Alias Management',
  description: 'Privacy-focused email alias and inbox management system',
  icons: {
    icon: 'https://pgmjgxlulflknscyjxix.supabase.co/storage/v1/object/public/frontend/logos/do-mails-white.png',
    shortcut:
      'https://pgmjgxlulflknscyjxix.supabase.co/storage/v1/object/public/frontend/logos/do-mails-white.png',
    apple:
      'https://pgmjgxlulflknscyjxix.supabase.co/storage/v1/object/public/frontend/logos/do-mails-white.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
