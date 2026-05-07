// web/src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'Proactive Scanner',
  description: 'AI-powered content scanner — automatically finds data quality issues, logic gaps, and consistency problems.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex flex-col min-h-full">
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  )
}
