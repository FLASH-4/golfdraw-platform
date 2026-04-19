import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GolfDraw — Play. Give. Win.',
  description: 'Submit your golf scores, enter monthly prize draws, support charity.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}