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
            outDir: 'build',
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (id.includes('node_modules')) {
                            if (id.includes('recharts')) return 'vendor-charts';
                            if (id.includes('@mui')) return 'vendor-mui';
                            if (id.includes('react-admin') || id.includes('ra-core') || id.includes('ra-ui-materialui')) return 'vendor-admin';
                            if (id.includes('framer-motion')) return 'vendor-animation';
                            return 'vendor'; // rest of node_modules
                        }
                    }
                }
            }
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
