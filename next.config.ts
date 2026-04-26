/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['*.dev.coze.site'],
  output: 'standalone', // Enable standalone output for Hostinger deployment
};

export default nextConfig;