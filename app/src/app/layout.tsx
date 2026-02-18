import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Kid Expenses',
  description:
    'Co-parent expense tracking made simple. Split expenses, track payments, and stay balanced.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kid Expenses',
  },
  openGraph: {
    title: 'Kid Expenses',
    description:
      'Co-parent expense tracking made simple. Split expenses, track payments, and stay balanced.',
    images: [{ url: '/og-image.svg', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kid Expenses',
    description:
      'Co-parent expense tracking made simple. Split expenses, track payments, and stay balanced.',
    images: ['/og-image.svg'],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#4f46e5',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider
      localization={{
        userButton: {
          action__manageAccount: 'Settings',
        },
      }}
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#4f46e5',
          colorBackground: '#0f172a',
          colorInputBackground: '#1e293b',
          colorInputText: '#e2e8f0',
          colorText: '#f1f5f9',
          colorTextSecondary: '#94a3b8',
          colorNeutral: '#94a3b8',
          borderRadius: '0.5rem',
          fontFamily: 'var(--font-geist-sans), Arial, Helvetica, sans-serif',
        },
        elements: {
          card: 'shadow-none border border-ke-border rounded-lg bg-ke-surface',
          formButtonPrimary: 'bg-ke-accent hover:bg-ke-accent-hover text-ke-inverse rounded-lg',
          formFieldInput:
            'border-ke-border bg-ke-surface text-ke-primary rounded-lg focus:border-ke-focus focus:ring-1 focus:ring-ke-focus',
          formFieldLabel: 'text-ke-primary',
          footerActionLink: 'text-ke-accent hover:text-ke-accent-hover',
          headerTitle: 'text-ke-primary',
          headerSubtitle: 'text-ke-secondary',
          socialButtonsBlockButton: 'border-ke-border text-ke-primary hover:bg-ke-elevated',
          dividerLine: 'bg-ke-border',
          dividerText: 'text-ke-muted',
          userButtonPopoverCard: 'shadow-lg border border-ke-border rounded-lg bg-ke-surface',
          userButtonPopoverActionButton: 'hover:bg-ke-elevated',
          userButtonPopoverActionButtonText: 'text-ke-primary',
          userButtonPopoverFooter: 'hidden',
          modalBackdrop: 'bg-black/60 backdrop-blur-sm',
          modalContent: 'shadow-lg border border-ke-border rounded-lg',
        },
      }}
    >
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
