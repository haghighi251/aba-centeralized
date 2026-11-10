/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        forceSwcTransforms: true,
    },
    compiler: {
        styledComponents: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
};

module.exports = nextConfig;
