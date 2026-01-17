import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/providers/AuthProvider'
import Navigation from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AIRism - Reimbursement System',
  description: 'AI-powered reimbursement management system with automated receipt processing',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <Navigation />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
