import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
    root: '.',
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: './index.html',
                dashboard: './dashboard.html'
            }
        }
    },
    plugins: [
        legacy({
            targets: ['defaults', 'not IE 11']
        })
    ],
    server: {
        port: 8080,
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true
            }
        }
    },
    resolve: {
        extensions: ['.ts', '.js', '.json']
    }
});
