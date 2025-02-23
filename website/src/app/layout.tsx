import '@/styles/tailwind.css'
import type { Metadata } from 'next'
import { Toaster } from "@/components/ui/sonner"
import Analytics from '@/components/analytics'

export const metadata: Metadata = {
  title: {
    template: '%s - cadetAI',
    default: 'cadetAI — AI-powered customer insights',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/css?f%5B%5D=switzer@400,500,600,700&amp;display=swap"
        />
        <Analytics />
      </head>
      <body className="text-gray-950 antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}