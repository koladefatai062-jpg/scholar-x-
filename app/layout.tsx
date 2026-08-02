import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ScholarX — Nigeria\'s Smartest Study Platform',
  description: 'Past questions, AI tutor, study groups and more for Nigerian secondary and university students.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0A0628' }}>
        {children}
      </body>
    </html>
  )
}