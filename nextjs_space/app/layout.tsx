
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({ subsets: ['latin'] })

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: {
    default: 'POS System - Point of Sale Management',
    template: '%s | POS System'
  },
  description: 'Complete point of sale system for retail businesses. Manage inventory, process sales, track customers, and analyze performance across multiple locations.',
  keywords: ['POS', 'point of sale', 'retail management', 'inventory', 'sales tracking', 'business management'],
  authors: [{ name: 'POS System Team' }],
  creator: 'POS System',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'POS System',
    title: 'POS System - Complete Point of Sale Management',
    description: 'Streamline your retail operations with our comprehensive POS solution. Manage inventory, process sales, and track performance across multiple locations.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'POS System - Point of Sale Management',
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'POS System - Point of Sale Management',
    description: 'Complete point of sale system for retail businesses. Manage inventory, process sales, and track performance.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
      }
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
