/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',          // статический экспорт в out/
  images: { unoptimized: true },
  trailingSlash: true,       // чтобы nginx отдавал /app/ как /app/index.html
};

export default nextConfig;
