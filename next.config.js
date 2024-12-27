/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Static HTML export
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig