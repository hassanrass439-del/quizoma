import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  // Fix workspace root detection — force le bon répertoire racine
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Optimisations images
  images: {
    formats: ['image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
      },
    ],
  },

  // Headers de sécurité
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },

  // Réduire le bundle en externalisant les modules lourds côté serveur
  serverExternalPackages: ['pdf-parse', 'mammoth'],

  // Augmenter la limite body pour les uploads PDF
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

export default nextConfig
