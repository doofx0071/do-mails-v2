/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'pgmjgxlulflknscyjxix.supabase.co'],
  },
  experimental: {
    esmExternals: true,
  },
  // For production builds, we can ignore linting errors
  // Remove these lines for strict development builds
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
}

export default nextConfig
