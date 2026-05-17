import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'RIVO - La plateforme qui transforme l\'apprentissage en opportunité',
  description: 'Plus de 200 formations disponibles. Apprenez à votre rythme, progressez et construisez un meilleur avenir grâce au savoir et à la technologie.',
  keywords: 'formation en ligne, e-learning, certification, RIVO, apprentissage',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1F2937',
              color: '#fff',
              borderRadius: '12px',
              padding: '12px 16px',
            },
            success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
          }}
        />
        {children}
      </body>
    </html>
  )
}
