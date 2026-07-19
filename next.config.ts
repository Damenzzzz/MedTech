import type {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
const nextConfig: NextConfig = {images: {formats: ['image/avif', 'image/webp']}, poweredByHeader: false, allowedDevOrigins:['127.0.0.1']};
export default createNextIntlPlugin()(nextConfig);
