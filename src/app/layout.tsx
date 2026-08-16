import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { Providers } from '@/components/providers'

const inter = Inter({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'Nexus CRM — B2B Sales Platform',
  description:
    'A modern B2B CRM for managing leads, customers, quotations, orders, and payments — built for sales teams that move fast.',
  keywords: ['CRM', 'B2B', 'Sales', 'Pipeline', 'Quotations', 'Orders'],
  authors: [{ name: 'Nexus CRM' }],
  icons: {
    icon: '/logo.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}>
        <Providers>
          {children}
          <Toaster />
          <SonnerToaster position="top-right" richColors closeButton />
        </Providers>
      </body>
    </html>
  )
}
