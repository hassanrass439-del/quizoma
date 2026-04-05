import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Epilogue, Manrope } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const epilogue = Epilogue({
  variable: '--font-epilogue',
  subsets: ['latin'],
  weight: ['400', '700', '800', '900'],
})

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Quizoma — Révise en bluffant',
  description: 'Jeu pédagogique multijoueur avec IA. Importe tes cours, génère des questions, et piège tes camarades.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Quizoma',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0D0D1A',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${epilogue.variable} ${manrope.variable}`}
    >
      <body className="bg-surface-1 text-game antialiased min-h-dvh">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1E1E3A',
              border: '1px solid #2A2A4A',
              color: '#E8E8F0',
            },
          }}
        />
      </body>
    </html>
  )
}
