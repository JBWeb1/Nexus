/** @type {import('next').NextConfig} */
const nextConfig = {
  // These read data files from their own folders at run time, so they must not be bundled.
  serverExternalPackages: ['pdfkit', 'exceljs', '@prisma/client', '@prisma/adapter-pg', 'pg'],
  poweredByHeader: false,
};
export default nextConfig;
