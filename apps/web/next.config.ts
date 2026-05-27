import type { NextConfig } from 'next'

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'
// Garante que a URL sempre tem protocolo (Railway pode receber sem https://)
const apiUrl = rawApiUrl.startsWith('http') ? rawApiUrl : `https://${rawApiUrl}`

const nextConfig: NextConfig = {
  transpilePackages: ['@corretor/shared'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ]
  },
}

export default nextConfig
