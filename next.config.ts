import type { NextConfig } from 'next'

// Set server-side default timezone; does not affect Edge runtime
process.env.TZ ??= 'Asia/Jerusalem'

const nextConfig: NextConfig = {}

export default nextConfig
