import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Dev chunks are blocked unless the host you browse from is listed, which
  // silently breaks hydration when visiting via 127.0.0.1 instead of localhost.
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
}

export default nextConfig
