import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
        plugins: [
            react(),
            tailwindcss(),
        ],
        server: {
            port: parseInt(env.VITE_PORT || 3000),
            open: true
        },
        build: {
            outDir: 'build'
        },
        esbuild: {
            loader: 'tsx',
            include: /src\/.*\.[jt]sx?$/,
            exclude: [],
        },
        optimizeDeps: {
            esbuildOptions: {
                loader: {
                    '.js': 'jsx',
                },
            },
        },
    };
});
