import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ClientNav from '@/components/ClientNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Smart Civic Reporting',
  description: 'Multi-channel civic issue reporting platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900`}>
        <ClientNav />
        {children}
      </body>
    </html>
  )
}
